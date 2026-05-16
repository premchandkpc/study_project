/**
 * DSAViz.tracer — JS Code Execution Tracer
 * Load AFTER dsa-viz-core.js
 *
 * API:
 *   DSAViz.tracer.run(code, opts)  → step[]  (feeds into DSAViz.runtime)
 *
 * opts {
 *   maxSteps?      : number   (default 300)
 *   input?         : object   (pre-defined variables injected into scope)
 * }
 *
 * Step format:
 * {
 *   line, codeLine, variables, arrays, maps, sets,
 *   stack, recursionDepth, narration, timeLabel, ops, error?
 * }
 */
(function () {
  'use strict';
  window.DSAViz = window.DSAViz || {};

  /* ── NARRATION TEMPLATES ──────────────────────────────────────── */
  function narrate(lineText, vars, prevVars) {
    const t = (lineText || '').trim();
    if (!t || t.startsWith('//')) return null;

    const changed = Object.keys(vars).filter(
      k => JSON.stringify(vars[k]) !== JSON.stringify(prevVars[k])
    );

    if (/^\breturn\b/.test(t)) {
      const val = t.replace(/^return\s*/, '').replace(/;$/, '');
      return `Return ${val}`;
    }
    if (/^(let|const|var)\s/.test(t)) {
      const name = t.match(/(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/)?.[1] || '';
      const val = vars[name];
      return `Declare ${name} = ${JSON.stringify(val)}`;
    }
    if (/\.push\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.push\s*\((.+)\)/);
      return m ? `Push ${m[2]} onto ${m[1]}` : 'Push onto stack';
    }
    if (/\.pop\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.pop\s*\(/);
      return m ? `Pop from ${m[1]}` : 'Pop from stack';
    }
    if (/\.shift\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.shift\s*\(/);
      return m ? `Dequeue from ${m[1]}` : 'Dequeue front';
    }
    if (/\.unshift\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.unshift\s*\((.+)\)/);
      return m ? `Enqueue ${m[2]} to front of ${m[1]}` : 'Enqueue front';
    }
    if (/\.set\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.set\s*\((.+),\s*(.+)\)/);
      return m ? `Map ${m[1]}: set ${m[2]} → ${m[3]}` : 'Map set';
    }
    if (/\.get\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.get\s*\((.+)\)/);
      return m ? `Map ${m[1]}: get(${m[2]})` : 'Map get';
    }
    if (/\.has\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.has\s*\((.+)\)/);
      return m ? `Check if ${m[1]} has ${m[2]}` : 'Has check';
    }
    if (/\.add\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.add\s*\((.+)\)/);
      return m ? `Add ${m[2]} to Set ${m[1]}` : 'Set add';
    }
    if (/\.delete\s*\(/.test(t)) {
      const m = t.match(/(\w+)\.delete\s*\((.+)\)/);
      return m ? `Delete ${m[2]} from ${m[1]}` : 'Delete';
    }
    if (/^for\s*\(/.test(t)) {
      if (/\bof\b/.test(t)) {
        const m = t.match(/for\s*\(.*?(\w+)\s+of\s+(\w+)/);
        return m ? `Iterate ${m[1]} over ${m[2]}` : `Loop: ${t.replace(/[{].*$/, '').trim()}`;
      }
      if (/\bin\b/.test(t)) {
        const m = t.match(/for\s*\(.*?(\w+)\s+in\s+(\w+)/);
        return m ? `Iterate key ${m[1]} in ${m[2]}` : `Loop: ${t.replace(/[{].*$/, '').trim()}`;
      }
      return `Loop: ${t.replace(/[{].*$/, '').trim()}`;
    }
    if (/^while\s*\(/.test(t)) return 'While loop check';
    if (/^if\s*\(/.test(t)) {
      const cond = t.match(/^if\s*\((.+)\)/)?.[1] || '';
      return `Check: if (${cond})`;
    }
    if (/^else/.test(t)) return 'else branch';
    if (changed.length) {
      return changed.map(k => `${k} = ${JSON.stringify(vars[k])}`).join(', ');
    }
    return t.length > 60 ? t.substring(0, 57) + '…' : t;
  }

  /* ── DATA STRUCTURE DETECTION ─────────────────────────────────── */
  function detectStructures(vars, highlights) {
    const arrays = {};
    const maps = {};
    const sets = {};

    Object.entries(vars).forEach(([name, val]) => {
      if (Array.isArray(val)) {
        const cfg = { arr: val.slice() };
        if (highlights?.arrays?.[name]) cfg.highlights = highlights.arrays[name];
        arrays[name] = cfg;
      } else if (val instanceof Set || (val && val.__type === 'Set')) {
        sets[name] = [...val];
      } else if (val instanceof Map || (val && val.__type === 'Map')) {
        const flat = {};
        val.forEach((v, k) => { flat[String(k)] = v; });
        if (Object.keys(flat).length > 0) maps[name] = flat;
      } else if (
        val !== null &&
        typeof val === 'object' &&
        !Array.isArray(val)
      ) {
        const flat = {};
        Object.entries(val).forEach(([k, v]) => { flat[k] = v; });
        if (Object.keys(flat).length > 0) maps[name] = flat;
      }
    });

    return { arrays, maps, sets };
  }

  /* ── SAFE VALUE CLONE ─────────────────────────────────────────── */
  function safeClone(val, depth = 0) {
    if (depth > 4) return '…';
    if (val === null || val === undefined) return val;
    if (typeof val === 'function') return '[function]';
    if (Array.isArray(val)) return val.map(v => safeClone(v, depth + 1));
    if (val instanceof Map) {
      const o = {};
      val.forEach((v, k) => { o[String(k)] = safeClone(v, depth + 1); });
      return o;
    }
    if (val instanceof Set) return [...val].map(v => safeClone(v, depth + 1));
    if (typeof val === 'object') {
      try {
        const o = {};
        Object.keys(val).slice(0, 20).forEach(k => { o[k] = safeClone(val[k], depth + 1); });
        return o;
      } catch { return String(val); }
    }
    return val;
  }

  /* ── CODE INSTRUMENTATION ─────────────────────────────────────── */
  function instrument(code) {
    const lines = code.split('\n');
    const output = [];
    const scopeVars = new Set();

    /* named function params */
    const paramRe = /function\s*\w*\s*\(([^)]*)\)/g;
    let pm;
    while ((pm = paramRe.exec(code)) !== null) {
      pm[1].split(',').map(s => s.trim().replace(/=.*$/, '').trim()).filter(Boolean)
        .forEach(p => scopeVars.add(p));
    }

    /* arrow function params */
    const arrowRe = /(?:const|let|var)\s+\w+\s*=\s*(?:\(([^)]*)\)|(\w+))\s*=>/g;
    let am;
    while ((am = arrowRe.exec(code)) !== null) {
      const paramStr = am[1] || am[2] || '';
      paramStr.split(',').map(s => s.trim().replace(/=.*$/, '').trim()).filter(Boolean)
        .forEach(p => scopeVars.add(p));
    }

    const declRe = /\b(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/g;
    const assignRe = /^([a-zA-Z_$][\w$]*)\s*(?:[+\-*/%&|^]?=(?!=))/;
    /* for...of / for...in loop variable e.g. "for (const x of arr)" */
    const forOfRe = /for\s*\((?:let|const|var)?\s*([a-zA-Z_$][\w$]*)\s+(?:of|in)\s/;

    lines.forEach((line, i) => {
      const t = line.trim();

      /* track declared vars */
      let dm;
      declRe.lastIndex = 0;
      while ((dm = declRe.exec(line)) !== null) scopeVars.add(dm[1]);

      const am2 = t.match(assignRe);
      if (am2 && !['if', 'while', 'for', 'return', 'else'].includes(am2[1])) {
        scopeVars.add(am2[1]);
      }

      /* for...of / for...in loop var */
      const forOfM = t.match(forOfRe);
      if (forOfM) scopeVars.add(forOfM[1]);

      output.push(line);

      const skip =
        !t ||
        t.startsWith('//') ||
        t.startsWith('/*') ||
        t.startsWith('*') ||
        t === '{' ||
        t === '}' ||
        t === '};' ||
        t.endsWith('{') ||
        /^\s*$/.test(t);

      if (!skip) {
        const vars = [...scopeVars];
        const namesJson = JSON.stringify(vars);
        const captures = vars
          .map(v => `(function(){try{return ${v};}catch(_){return undefined;}})()`)
          .join(',');
        output.push(
          `try{__t(${i},${namesJson},[${captures}]);}catch(__te){}`
        );
      }
    });

    return output.join('\n');
  }

  /* ── MAIN TRACER ──────────────────────────────────────────────── */
  function run(code, opts = {}) {
    const maxSteps = opts.maxSteps || 300;
    const inputVars = opts.input || {};
    const snapshots = [];
    let stepCount = 0;
    let recursionDepth = 0;
    const callStack = [];
    const lines = code.split('\n');
    let prevVars = {};

    /* detect function entry/exit for call stack tracking */
    const fnNameRe = /function\s+(\w+)\s*\(/g;
    const fnNames = [];
    let fnm;
    while ((fnm = fnNameRe.exec(code)) !== null) fnNames.push(fnm[1]);

    function __t(lineNum, names, vals) {
      if (stepCount++ >= maxSteps) return;

      const vars = {};
      names.forEach((name, idx) => {
        if (vals[idx] !== undefined) vars[name] = safeClone(vals[idx]);
      });
      Object.entries(inputVars).forEach(([k, v]) => {
        if (!(k in vars)) vars[k] = v;
      });

      const { arrays, maps, sets } = detectStructures(vars);
      const lineText = lines[lineNum] || '';
      const narr = narrate(lineText, vars, prevVars);

      /* heuristic: function call on this line → push frame */
      const calledFn = fnNames.find(n => new RegExp(`\\b${n}\\s*\\(`).test(lineText));
      if (calledFn && lineText.trim().includes(calledFn + '(') && !lineText.trim().startsWith('function')) {
        if (callStack[callStack.length - 1] !== calledFn) {
          callStack.push(calledFn);
          recursionDepth = callStack.length;
        }
      }
      /* heuristic: return on this line → pop frame */
      if (/^\s*return\b/.test(lineText) && callStack.length > 0) {
        callStack.pop();
        recursionDepth = callStack.length;
      }

      const step = {
        line: lineNum,
        codeLine: lineNum,
        variables: vars,
        stack: [...callStack],
        recursionDepth,
        narration: narr || `Line ${lineNum + 1}`,
        timeLabel: `step ${stepCount}`,
        ops: stepCount,
      };

      if (Object.keys(arrays).length) step.arrays = arrays;
      if (Object.keys(maps).length) step.maps = maps;
      if (Object.keys(sets).length) step.sets = sets;

      snapshots.push(step);
      prevVars = { ...vars };
    }

    const instrumented = instrument(code);

    const inputPreamble = Object.entries(inputVars)
      .map(([k, v]) => `let ${k} = ${JSON.stringify(v)};`)
      .join('\n');

    const fullCode = inputPreamble + '\n' + instrumented;

    try {
      /* eslint-disable no-new-func */
      const fn = new Function('__t', fullCode);
      fn(__t);
    } catch (err) {
      if (snapshots.length === 0) {
        snapshots.push({
          line: 0,
          codeLine: 0,
          narration: `Error: ${err.message}`,
          variables: {},
          stack: [],
          recursionDepth: 0,
          ops: 0,
          error: true,
        });
      } else {
        snapshots[snapshots.length - 1].narration += ` ← Error: ${err.message}`;
        snapshots[snapshots.length - 1].error = true;
      }
    }

    /* dedupe consecutive identical snapshots */
    const deduped = snapshots.filter((s, i) => {
      if (i === 0) return true;
      return (
        JSON.stringify(s.variables) !== JSON.stringify(snapshots[i - 1].variables) ||
        s.line !== snapshots[i - 1].line
      );
    });

    return deduped;
  }

  /* ── PATTERN PRESETS ──────────────────────────────────────────── */
  const PRESETS = {
    twoSum: {
      title: 'Two Sum — HashMap O(n)',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      code: `function twoSum(nums, target) {
  const mp = {};
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const diff = target - n;
    if (mp[diff] !== undefined) {
      return [mp[diff], i];
    }
    mp[n] = i;
  }
  return [];
}
const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);`,
    },

    binarySearch: {
      title: 'Binary Search — O(log n)',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      code: `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
const arr = [1, 3, 5, 7, 9, 11, 13];
const target = 7;
const result = binarySearch(arr, target);`,
    },

    slidingWindow: {
      title: 'Max Sum Subarray of size K — O(n)',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
      code: `function maxSumSubarray(arr, k) {
  let maxSum = 0;
  let windowSum = 0;
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }
  maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum = windowSum + arr[i] - arr[i - k];
    if (windowSum > maxSum) maxSum = windowSum;
  }
  return maxSum;
}
const arr = [2, 1, 5, 1, 3, 2];
const k = 3;
const result = maxSumSubarray(arr, k);`,
    },

    fibonacci: {
      title: 'Fibonacci — DP Tabulation O(n)',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      code: `function fib(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
const n = 8;
const result = fib(n);`,
    },

    validParentheses: {
      title: 'Valid Parentheses — Stack O(n)',
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(n)',
      code: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack[stack.length - 1] !== map[ch]) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}
const s = "({[]})";
const result = isValid(s);`,
    },

    bubbleSort: {
      title: 'Bubble Sort — O(n²)',
      timeComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      code: `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}
const arr = [64, 34, 25, 12, 22, 11, 90];
const result = bubbleSort(arr);`,
    },

    mergeSort: {
      title: 'Merge Sort — O(n log n)',
      timeComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      code: `function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}
function merge(left, right) {
  const result = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }
  while (i < left.length) { result.push(left[i]); i++; }
  while (j < right.length) { result.push(right[j]); j++; }
  return result;
}
const arr = [38, 27, 43, 3, 9, 82, 10];
const result = mergeSort(arr);`,
    },

    bfs: {
      title: 'BFS — Level Order Traversal O(V+E)',
      timeComplexity: 'O(V+E)',
      spaceComplexity: 'O(V)',
      code: `function bfs(graph, start) {
  const visited = new Set();
  const queue = [start];
  const order = [];
  visited.add(start);
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return order;
}
const graph = {
  0: [1, 2],
  1: [0, 3, 4],
  2: [0, 5],
  3: [1],
  4: [1],
  5: [2]
};
const result = bfs(graph, 0);`,
    },

    dfs: {
      title: 'DFS — Recursive O(V+E)',
      timeComplexity: 'O(V+E)',
      spaceComplexity: 'O(V)',
      code: `const visited = new Set();
const order = [];
function dfs(graph, node) {
  visited.add(node);
  order.push(node);
  for (const neighbor of graph[node]) {
    if (!visited.has(neighbor)) {
      dfs(graph, neighbor);
    }
  }
}
const graph = {
  0: [1, 2],
  1: [0, 3, 4],
  2: [0, 5],
  3: [1],
  4: [1],
  5: [2]
};
dfs(graph, 0);
const result = order;`,
    },

    lcs: {
      title: 'Longest Common Subsequence — DP O(mn)',
      timeComplexity: 'O(mn)',
      spaceComplexity: 'O(mn)',
      code: `function lcs(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}
const s1 = "ABCBDAB";
const s2 = "BDCAB";
const result = lcs(s1, s2);`,
    },
  };

  window.DSAViz.tracer = { run, PRESETS };
})();
