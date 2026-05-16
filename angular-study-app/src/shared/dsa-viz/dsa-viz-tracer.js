/**
 * DSAViz.tracer — JS Code Execution Tracer
 * Load AFTER dsa-viz-core.js
 * Requires: acorn (CDN) for AST parsing
 *
 * API:
 *   DSAViz.tracer.run(code, opts)  → step[]  (feeds into DSAViz.runtime)
 *
 * opts {
 *   maxSteps? : number   (default 300)
 *   input?    : object   (pre-defined variables injected into scope)
 * }
 *
 * Step format matches DSAViz.runtime snapshot format.
 */
(function () {
  'use strict';
  window.DSAViz = window.DSAViz || {};

  /* ── NARRATION TEMPLATES ──────────────────────────────────────── */
  function narrate(lineText, vars, prevVars) {
    const t = (lineText || '').trim();
    if (!t || t.startsWith('//')) return null;

    const changed = Object.keys(vars).filter(k =>
      JSON.stringify(vars[k]) !== JSON.stringify(prevVars[k])
    );

    if (/^\breturn\b/.test(t)) {
      const val = t.replace(/^return\s*/, '').replace(/;$/, '');
      return `Returning ${val}`;
    }
    if (/^(let|const|var)\s/.test(t)) {
      const name = t.match(/(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/)?.[1] || '';
      const val = vars[name];
      return `Declare ${name} = ${JSON.stringify(val)}`;
    }
    if (/^for\s*\(/.test(t)) return `Loop: ${t.replace(/[{].*$/, '').trim()}`;
    if (/^while\s*\(/.test(t)) return `While loop check`;
    if (/^if\s*\(/.test(t)) {
      const cond = t.match(/^if\s*\((.+)\)/)?.[1] || '';
      return `Check: if (${cond})`;
    }
    if (/^else/.test(t)) return `else branch`;
    if (changed.length) {
      return changed.map(k => `${k} = ${JSON.stringify(vars[k])}`).join(', ');
    }
    return t.length > 60 ? t.substring(0, 57) + '…' : t;
  }

  /* ── DATA STRUCTURE DETECTION ─────────────────────────────────── */
  function detectStructures(vars, highlights) {
    const arrays = {};
    const maps = {};

    Object.entries(vars).forEach(([name, val]) => {
      if (Array.isArray(val)) {
        const cfg = { arr: val.slice() };
        if (highlights?.arrays?.[name]) cfg.highlights = highlights.arrays[name];
        arrays[name] = cfg;
      } else if (
        val !== null &&
        typeof val === 'object' &&
        !(val instanceof Map) &&
        !(val instanceof Set)
      ) {
        const flat = {};
        Object.entries(val).forEach(([k, v]) => { flat[k] = v; });
        if (Object.keys(flat).length > 0) maps[name] = flat;
      }
    });

    return { arrays, maps };
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

    /* known function param names — scan for function declarations */
    const paramRe = /function\s*\w*\s*\(([^)]*)\)/g;
    let pm;
    while ((pm = paramRe.exec(code)) !== null) {
      pm[1].split(',').map(s => s.trim()).filter(Boolean).forEach(p => scopeVars.add(p));
    }
    /* arrow params */
    const arrowRe = /(?:const|let|var)\s+\w+\s*=\s*\(([^)]*)\)\s*=>/g;
    let am;
    while ((am = arrowRe.exec(code)) !== null) {
      am[1].split(',').map(s => s.trim()).filter(Boolean).forEach(p => scopeVars.add(p));
    }

    const declRe = /\b(?:let|const|var)\s+([a-zA-Z_$][\w$]*)/g;
    const assignRe = /^([a-zA-Z_$][\w$]*)\s*(?:[+\-*/%&|^]?=(?!=))/;

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

      output.push(line);

      /* skip lines that shouldn't get a trace injection */
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
        /* safe capture — each var wrapped in try/catch so undefined ones don't throw */
        const captures = vars
          .map(v => `(function(){try{return ${v};}catch(_){return undefined;}})()`)
          .join(',');
        output.push(
          `try{__t(${i},[${namesJson}],[${captures}]);}catch(__te){}`
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
    const lines = code.split('\n');
    let prevVars = {};

    function __t(lineNum, names, vals) {
      if (stepCount++ >= maxSteps) return;

      const vars = {};
      names.forEach((name, idx) => {
        if (vals[idx] !== undefined) vars[name] = safeClone(vals[idx]);
      });
      /* merge input vars that aren't overridden */
      Object.entries(inputVars).forEach(([k, v]) => {
        if (!(k in vars)) vars[k] = v;
      });

      const { arrays, maps } = detectStructures(vars);
      const lineText = lines[lineNum] || '';
      const narr = narrate(lineText, vars, prevVars);

      const step = {
        line: lineNum,
        variables: vars,
        narration: narr || `Line ${lineNum + 1}`,
        timeLabel: `step ${stepCount}`,
        ops: stepCount,
      };

      if (Object.keys(arrays).length) step.arrays = arrays;
      if (Object.keys(maps).length) step.maps = maps;

      snapshots.push(step);
      prevVars = { ...vars };
    }

    /* build the sandboxed function */
    const instrumented = instrument(code);

    /* inject input variables as pre-declared lets */
    const inputPreamble = Object.entries(inputVars)
      .map(([k, v]) => `let ${k} = ${JSON.stringify(v)};`)
      .join('\n');

    const fullCode = inputPreamble + '\n' + instrumented;

    try {
      /* eslint-disable no-new-func */
      const fn = new Function('__t', fullCode);
      fn(__t);
    } catch (err) {
      /* execution may throw (e.g. intentional early return) — that's fine */
      if (snapshots.length === 0) {
        snapshots.push({
          line: 0,
          narration: `Error: ${err.message}`,
          variables: {},
          ops: 0,
        });
      } else {
        /* annotate last step with error */
        snapshots[snapshots.length - 1].narration += ` ← Error: ${err.message}`;
        snapshots[snapshots.length - 1].error = true;
      }
    }

    /* dedupe consecutive identical snapshots */
    const deduped = snapshots.filter((s, i) => {
      if (i === 0) return true;
      return JSON.stringify(s.variables) !== JSON.stringify(snapshots[i - 1].variables) ||
             s.line !== snapshots[i - 1].line;
    });

    return deduped;
  }

  /* ── PATTERN PRESETS (demo examples shown in Coder page) ───────── */
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
  };

  window.DSAViz.tracer = { run, PRESETS };
})();
