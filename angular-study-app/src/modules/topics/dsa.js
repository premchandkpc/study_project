/* ===== DSA Visualizer — interactive step-through component ===== */

function initDSAVisualizer(root) {
  // ── STATE ──────────────────────────────────────────────────
  let CUR_TOPIC = null, CUR_PROB = null;
  let STEPS = [], SI = 0, AUTO_T = null;

  // ── TOPICS ─────────────────────────────────────────────────
  const TOPICS = {
    sliding: {
      label: 'Sliding Window',
      problems: {
        maxSumFixed: {
          label: 'Max Sum Subarray (fixed k)',
          fn: solveMaxSumFixed,
          def: { arr:'2,1,5,1,3,2', k:'3' },
          q: 'Given an integer array and k, find the maximum sum of any contiguous subarray of size k.',
          scenario: 'Traffic dashboard: find the busiest exact k-minute interval.',
          pattern: 'Fixed sliding window',
          hint: 'Build the first window once, then add one new value and remove one old value per move.'
        },
        longestUniq: {
          label: 'Longest Substr No Repeat',
          fn: solveLongestUniq,
          def: { str:'abcabcbb' },
          q: 'Return the length of the longest substring without repeating characters.',
          scenario: 'Session-token scan: keep the longest contiguous clean segment with no duplicate symbol.',
          pattern: 'Variable sliding window + frequency map',
          hint: 'Expand right; when duplicate appears, move left until the window is valid again.'
        },
        windowMax: {
          label: 'Sliding Window Maximum',
          fn: solveWindowMax,
          def: { arr:'1,3,-1,-3,5,3,6,7', k:'3' },
          q: 'For every contiguous window of size k, output the maximum value in that window.',
          scenario: 'Rolling leaderboard: each window needs the current peak without rescanning all k values.',
          pattern: 'Monotonic deque',
          hint: 'Deque stores candidate indices in decreasing value order; front is always the max.'
        },
        minSubarraySum: {
          label: 'Min Size Subarray >= target',
          fn: solveMinSubarray,
          def: { arr:'2,3,1,2,4,3', k:'7' },
          q: 'Find the smallest length of a contiguous subarray whose sum is at least target.',
          scenario: 'Quota tracker: shortest run of events that reaches a required total.',
          pattern: 'Variable sliding window',
          hint: 'Grow until the target is reached, then shrink while the window stays valid.'
        },
      }
    },
    dp: {
      label: 'Dynamic Programming',
      problems: {
        fibonacci: {
          label: 'Fibonacci (bottom-up)',
          fn: solveFib,
          def: { n:'9' },
          q: 'Compute the nth Fibonacci number without exponential recursion.',
          scenario: 'Warm-up DP: each state depends on the previous two states.',
          pattern: '1D bottom-up DP',
          hint: 'Replace the recursion tree with a left-to-right table.'
        },
        climbStairs: {
          label: 'Climbing Stairs',
          fn: solveClimbStairs,
          def: { n:'6' },
          q: 'You can climb 1 or 2 steps at a time. How many distinct ways can you reach step n?',
          scenario: 'Common FAANG-style recurrence question: ways(n) = ways(n-1) + ways(n-2).',
          pattern: '1D counting DP',
          hint: 'The last move into step i came from i-1 or i-2.'
        },
        houseRobber: {
          label: 'House Robber',
          fn: solveHouseRobber,
          def: { arr:'2,7,9,3,1' },
          q: 'Given money in houses in a line, maximize loot without robbing adjacent houses.',
          scenario: 'Common FAANG-style choose/skip question with adjacency constraint.',
          pattern: '1D decision DP',
          hint: 'At house i choose max(skip i, rob i + best through i-2).'
        },
        coinChange: {
          label: 'Coin Change (min coins)',
          fn: solveCoin,
          def: { arr:'1,5,6,9', n:'11' },
          q: 'Given coin denominations and an amount, return the fewest coins needed to make that amount.',
          scenario: 'Payment engine: canonical greedy fails on many coin sets, so use DP.',
          pattern: 'Unbounded min-cost DP',
          hint: 'For each amount, try taking one last coin and reuse dp[amount - coin].'
        },
        uniquePaths: {
          label: 'Unique Paths Grid',
          fn: solveUniquePaths,
          def: { n:'3', k:'7' },
          q: 'In an m x n grid, moving only right or down, count how many unique paths reach the bottom-right cell.',
          scenario: 'Common FAANG-style grid DP where every cell aggregates from top and left.',
          pattern: '2D counting DP',
          hint: 'The first row and first column each have exactly one path.'
        },
        knapsack: {
          label: '0/1 Knapsack',
          fn: solveKnapsack,
          def: { arr:'2,3,4,5', k:'5,4,3,2', n:'5' },
          q: 'Given item weights, values, and capacity, maximize total value when each item can be used at most once.',
          scenario: 'Capacity planning: every item is a yes/no decision.',
          pattern: '2D choose/skip DP',
          hint: 'If the item fits, compare skip vs take; otherwise copy the row above.'
        },
        lcs: {
          label: 'Longest Common Subsequence',
          fn: solveLCS,
          def: { str:'AGGTAB', k:'GXTXAYB' },
          q: 'Find the length of the longest sequence that appears in both strings in the same relative order.',
          scenario: 'Diff engines and DNA matching: preserve order, but characters need not be contiguous.',
          pattern: '2D string DP',
          hint: 'Match uses diagonal + 1; mismatch takes max(top, left).'
        },
        editDistance: {
          label: 'Edit Distance',
          fn: solveEditDistance,
          def: { str:'horse', k:'ros' },
          q: 'Return the minimum insert, delete, or replace operations needed to convert word1 into word2.',
          scenario: 'Common FAANG-style string DP used in spell-check, search suggestions, and diff tools.',
          pattern: '2D min-cost string DP',
          hint: 'Mismatch chooses 1 + min(insert, delete, replace).'
        },
        lis: {
          label: 'Longest Increasing Subsequence',
          fn: solveLIS,
          def: { arr:'10,9,2,5,3,7,101,18' },
          q: 'Return the length of the longest strictly increasing subsequence.',
          scenario: 'Signal trend analysis: keep order, skip elements, find the longest rising chain.',
          pattern: '1D subsequence DP',
          hint: 'For every i, extend any previous j where arr[j] < arr[i].'
        },
        partitionEqual: {
          label: 'Partition Equal Subset Sum',
          fn: solvePartitionEqual,
          def: { arr:'1,5,11,5' },
          q: 'Can the array be split into two subsets with equal sum?',
          scenario: 'Common FAANG-style subset-sum transformation: equal partition means target = total / 2.',
          pattern: '0/1 subset-sum DP',
          hint: 'Process numbers once; iterate target backward so each value is used at most once.'
        },
      }
    },
    greedy: {
      label: 'Greedy',
      problems: {
        activitySel: {
          label: 'Activity Selection',
          fn: solveActivity,
          def: { arr:'1,3,0,5,3,5,5,7,3,9,5,9' },
          q: 'Select the maximum number of non-overlapping activities from start/end times.',
          scenario: 'Calendar optimizer: fit the most meetings into one room.',
          pattern: 'Greedy by earliest finish time',
          hint: 'Sort by end time; an earlier finish leaves maximum room for future choices.'
        },
        greedyCoin: {
          label: 'Coin Change (greedy)',
          fn: solveGCoin,
          def: { arr:'1,5,10,25', n:'41' },
          q: 'Make an amount by repeatedly choosing the largest coin that fits.',
          scenario: 'Works for canonical currencies, but compare with DP Coin Change for counterexamples.',
          pattern: 'Greedy choice',
          hint: 'Greedy is fast, but it needs a proof or a canonical coin system.'
        },
        jobSeq: {
          label: 'Job Sequencing',
          fn: solveJobSeq,
          def: { arr:'20,15,10,5,1', k:'2,1,2,1,3', n:'3' },
          q: 'Schedule jobs with deadlines and profits to maximize total profit before deadlines.',
          scenario: 'Batch scheduler: most profitable jobs compete for limited slots.',
          pattern: 'Greedy by profit + latest free slot',
          hint: 'Try each high-profit job as late as possible to keep earlier slots open.'
        },
      }
    },
    graph: {
      label: 'Graph',
      problems: {
        bfs: {
          label: 'BFS Traversal',
          fn: solveBFS,
          def: { arr:'0-1,0-2,1-3,1-4,2-5,2-6', n:'7', k:'0' },
          q: 'Traverse a graph level by level from a source node.',
          scenario: 'Shortest hops in an unweighted social graph.',
          pattern: 'Queue-based breadth-first search',
          hint: 'Visit neighbors in waves; first time you see a node is the shortest edge-count path.'
        },
        dfs: {
          label: 'DFS Traversal',
          fn: solveDFS,
          def: { arr:'0-1,0-2,1-3,1-4,2-5,2-6', n:'7', k:'0' },
          q: 'Traverse a graph by going deep before backtracking.',
          scenario: 'Dependency exploration: fully inspect one branch before moving to the next.',
          pattern: 'Stack-based depth-first search',
          hint: 'The stack models the recursion call stack.'
        },
        dijkstra: {
          label: "Dijkstra SSSP",
          fn: solveDijkstra,
          def: { arr:'0-1-4,0-2-1,2-1-2,1-3-1,2-3-5', n:'4', k:'0' },
          q: 'Find shortest paths from one source in a graph with non-negative edge weights.',
          scenario: 'Routing engine: repeatedly lock the closest unfinished node and relax outgoing roads.',
          pattern: 'Greedy shortest path',
          hint: 'Negative weights break the finalized-distance guarantee.'
        },
      }
    }
  };

  // ── SIDEBAR ────────────────────────────────────────────────
  function buildSidebar() {
    let h = '';
    for (const [tid, t] of Object.entries(TOPICS)) {
      h += `<div class="dsa-topic-header">${t.label}</div>`;
      for (const [pid, p] of Object.entries(t.problems)) {
        const a = (CUR_PROB === pid) ? 'active' : '';
        h += `<button class="dsa-prob-btn ${a}" data-tid="${tid}" data-pid="${pid}">${p.label}</button>`;
      }
    }
    root.querySelector('#dsa-sidebar').innerHTML = h;
    root.querySelectorAll('.dsa-prob-btn').forEach(btn => {
      btn.addEventListener('click', () => pick(btn.dataset.tid, btn.dataset.pid));
    });
  }

  // ── INPUT BAR ──────────────────────────────────────────────
  const LABELS = {
    arr: { sliding:'Array (comma sep)', dp:'Values / Edges', greedy:'Values / Edges', graph:'Edges (a-b or a-b-w)' },
    str: { sliding:'String', dp:'String 1', greedy:'String', graph:'String' },
    k:   { sliding:'k (window size)', dp:'Weights / String 2', greedy:'Deadlines / String 2', graph:'Start node' },
    n:   { sliding:'Target', dp:'Target / n', greedy:'Slots / Amount', graph:'Node count' },
  };
  function lbl(field, tid) { return LABELS[field][tid] || field; }

  function buildTopBar(p, tid) {
    const d = p.def;
    let h = `<span class="dsa-prob-title">${p.label}</span>`;
    if (d.arr !== undefined)
      h += `<span class="dsa-inp-label">${lbl('arr',tid)}:</span><input class="dsa-inp-field dsa-inp-wide" id="dsa-i-arr" value="${d.arr}">`;
    if (d.str !== undefined)
      h += `<span class="dsa-inp-label">${lbl('str',tid)}:</span><input class="dsa-inp-field dsa-inp-mid" id="dsa-i-str" value="${d.str}">`;
    if (d.k  !== undefined)
      h += `<span class="dsa-inp-label">${lbl('k',tid)}:</span><input class="dsa-inp-field dsa-inp-mid" id="dsa-i-k" value="${d.k}">`;
    if (d.n  !== undefined)
      h += `<span class="dsa-inp-label">${lbl('n',tid)}:</span><input class="dsa-inp-field dsa-inp-sm" id="dsa-i-n" value="${d.n}">`;
    h += `<button class="dsa-btn dsa-btn-blue" id="dsa-run-btn">▶ Run</button>`;
    root.querySelector('#dsa-top-bar').innerHTML = h;
    root.querySelector('#dsa-run-btn').addEventListener('click', run);
  }

  function getI() {
    return {
      arr: root.querySelector('#dsa-i-arr')?.value || '',
      str: root.querySelector('#dsa-i-str')?.value || '',
      k:   root.querySelector('#dsa-i-k')?.value   || '',
      n:   root.querySelector('#dsa-i-n')?.value   || '',
    };
  }

  // ── PICK / RUN ─────────────────────────────────────────────
  function pick(tid, pid) {
    CUR_TOPIC = tid; CUR_PROB = pid;
    buildSidebar();
    const p = TOPICS[tid].problems[pid];
    buildTopBar(p, tid);
    execute(p);
  }

  function run() {
    if (!CUR_PROB) return;
    execute(TOPICS[CUR_TOPIC].problems[CUR_PROB]);
  }

  function execute(p) {
    stopAuto();
    try {
      STEPS = p.fn(getI());
      if (p.q) {
        STEPS.unshift(mkStep(
          `<b>Q.</b> ${p.q}<br><b>Scenario.</b> ${p.scenario || p.label}<br><b>Approach.</b> ${p.hint || p.pattern || 'Trace the state change step by step.'}`,
          rPromptCard(p),
          p.pattern ? `pattern = ${p.pattern}` : ''
        ));
      }
    } catch(e) { STEPS = [mkStep('Error: ' + e.message, '')]; }
    SI = 0;
    root.querySelector('#dsa-btn-prev').disabled = false;
    root.querySelector('#dsa-btn-next').disabled = false;
    root.querySelector('#dsa-btn-reset').disabled = false;
    root.querySelector('#dsa-btn-auto').disabled = false;
    paint();
  }

  // ── NAVIGATION ─────────────────────────────────────────────
  function nav(d) { SI = Math.max(0, Math.min(STEPS.length-1, SI+d)); paint(); }
  function doReset() { stopAuto(); SI = 0; paint(); }

  function toggleAuto() {
    if (AUTO_T) { stopAuto(); return; }
    const btn = root.querySelector('#dsa-btn-auto');
    btn.textContent = '⏸ Pause'; btn.style.background = '#6e7681';
    AUTO_T = setInterval(() => {
      if (SI >= STEPS.length-1) { stopAuto(); return; }
      SI++; paint();
    }, msSpeed());
  }

  function stopAuto() {
    if (AUTO_T) { clearInterval(AUTO_T); AUTO_T = null; }
    const btn = root.querySelector('#dsa-btn-auto');
    if (btn) { btn.textContent = '▶ Auto'; btn.style.background = '#238636'; }
  }

  function msSpeed() {
    return Math.round(1600 / (root.querySelector('#dsa-speed')?.value || 5));
  }

  // ── PAINT ──────────────────────────────────────────────────
  function paint() {
    if (!STEPS.length) return;
    const s = STEPS[SI];
    const va = root.querySelector('#dsa-viz-area');
    va.innerHTML = `
      <div class="dsa-expl-box">
        <div class="dsa-expl-step">Step ${SI+1} / ${STEPS.length}</div>
        <div class="dsa-expl-text">${s.expl}</div>
        ${s.code ? `<div class="dsa-expl-code">${s.code}</div>` : ''}
      </div>
      <div id="dsa-viz-body">${s.html || ''}</div>
    `;
    root.querySelector('#dsa-step-ctr').textContent = `${SI+1} / ${STEPS.length}`;
    root.querySelector('#dsa-btn-prev').disabled = SI === 0;
    root.querySelector('#dsa-btn-next').disabled = SI === STEPS.length-1;
  }

  // ── STEP BUILDER ───────────────────────────────────────────
  function mkStep(expl, html, code='') { return { expl, html, code }; }

  // ── RENDER HELPERS ─────────────────────────────────────────
  function rPromptCard(p) {
    return `<div class="dsa-prompt-grid">
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Problem</div>
        <div class="dsa-prompt-v">${p.label}</div>
      </div>
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Scenario</div>
        <div class="dsa-prompt-v">${p.scenario || 'Interview coding round'}</div>
      </div>
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Pattern</div>
        <div class="dsa-prompt-v">${p.pattern || 'Trace the invariant'}</div>
      </div>
    </div>`;
  }

  function rDecision(title, items) {
    let h = `<div class="dsa-decision-box"><div class="dsa-aux-title">${title}</div><div class="dsa-decision-row">`;
    for (const item of items) {
      const cls = item.win ? 'win' : item.bad ? 'bad' : '';
      h += `<div class="dsa-decision-chip ${cls}">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>`;
    }
    h += '</div></div>';
    return h;
  }

  function rArr(arr, states={}, ptrs={}, label='') {
    const above = {};
    for (const [lbl2, i] of Object.entries(ptrs)) {
      if (!above[i]) above[i] = [];
      above[i].push(lbl2);
    }
    let h = '';
    if (label) h += `<div class="dsa-arr-label">${label}</div>`;
    h += '<div class="dsa-arr-row">';
    for (let i = 0; i < arr.length; i++) {
      const cls = { act:'c-act', win:'c-win', vis:'c-vis', res:'c-res',
                    cmp:'c-cmp', exc:'c-exc', que:'c-que', cur:'c-cur', def:'c-def' }[states[i]||'def'] || 'c-def';
      const ptr = above[i] ? above[i].join('/') : '';
      h += `<div class="dsa-cell-wrap">
        <div class="dsa-cell-ptr">${ptr}</div>
        <div class="dsa-cell-box ${cls}">${arr[i]}</div>
        <div class="dsa-cell-idx">${i}</div>
      </div>`;
    }
    h += '</div>';
    return `<div class="dsa-arr-section">${h}</div>`;
  }

  function rStr(s, states={}, ptrs={}, label='') {
    return rArr(s.split(''), states, ptrs, label);
  }

  function rDP1(dp, active=-1, label='dp[]') {
    let h = `<div class="dsa-arr-label">${label}</div><div class="dsa-arr-row">`;
    for (let i = 0; i < dp.length; i++) {
      const isAct = i === active;
      const val = dp[i] === null ? '?' : dp[i] === Infinity ? '∞' : dp[i];
      const cls = isAct ? 'c-act' : (dp[i] === null ? 'c-def' : 'c-vis');
      h += `<div class="dsa-cell-wrap">
        <div class="dsa-cell-ptr"></div>
        <div class="dsa-cell-box ${cls}">${val}</div>
        <div class="dsa-cell-idx">${i}</div>
      </div>`;
    }
    h += '</div>';
    return `<div class="dsa-arr-section">${h}</div>`;
  }

  function rDP2(dp, ar, ac, deps=[], rowL=[], colL=[], label='') {
    let h = '';
    if (label) h += `<div class="dsa-arr-label">${label}</div>`;
    h += '<div class="dsa-dp-wrap"><table class="dsa-dp-tbl"><tr><th></th>';
    for (let j = 0; j < dp[0].length; j++) h += `<th>${colL[j]!==undefined?colL[j]:j}</th>`;
    h += '</tr>';
    for (let i = 0; i < dp.length; i++) {
      h += `<tr><th>${rowL[i]!==undefined?rowL[i]:i}</th>`;
      for (let j = 0; j < dp[i].length; j++) {
        const isAct = i===ar && j===ac;
        const isDep = deps.some(d=>d[0]===i&&d[1]===j);
        const v = dp[i][j];
        let cls = v===null?'dc-empty':'dc-fill';
        if (isDep) cls='dc-dep'; if (isAct) cls='dc-act';
        const disp = v===null?'':v===Infinity?'∞':v;
        h += `<td class="${cls}">${disp}</td>`;
      }
      h += '</tr>';
    }
    h += '</table></div>';
    return h;
  }

  function rAux(items, title, hiIdx=-1) {
    let h = `<div class="dsa-aux-box"><div class="dsa-aux-title">${title}</div><div class="dsa-aux-items">`;
    if (!items.length) h += '<span class="dsa-aux-empty">empty</span>';
    for (let i = 0; i < items.length; i++) {
      h += `<span class="dsa-aux-chip ${i===hiIdx?'hi':''}">${items[i]}</span>`;
    }
    h += '</div></div>';
    return h;
  }

  function rAuxRow(...boxes) {
    return `<div class="dsa-aux-row">${boxes.join('')}</div>`;
  }

  // ── GRAPH RENDER ───────────────────────────────────────────
  function rGraph(n, edgeMap, nodeStates={}, edgeStates={}) {
    const W=440, H=300, cx=220, cy=150, r=100;
    const pos = {};
    for (let i=0;i<n;i++) {
      const a = (2*Math.PI*i/n) - Math.PI/2;
      pos[i] = { x: cx+r*Math.cos(a), y: cy+r*Math.sin(a) };
    }
    const NC = { def:'#21262d', act:'#f0883e', vis:'#238636', que:'#1f6feb', cur:'#8957e5', res:'#b08800' };
    const NT = { def:'#e6edf3', act:'#fff', vis:'#fff', que:'#fff', cur:'#fff', res:'#f8e3a1' };

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block">`;
    for (const [key, e] of Object.entries(edgeMap)) {
      const parts = key.split('-').map(Number);
      const [a, b] = parts;
      if (!pos[a]||!pos[b]) continue;
      const st = edgeStates[key] || 'def';
      const col = st==='active'?'#f0883e': st==='visited'?'#3fb950':'#30363d';
      const lx=(pos[a].x+pos[b].x)/2, ly=(pos[a].y+pos[b].y)/2;
      svg += `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="${col}" stroke-width="2"/>`;
      if (e.w != null) svg += `<text x="${lx}" y="${ly-5}" fill="#8b949e" font-size="10" text-anchor="middle">${e.w}</text>`;
    }
    for (let i=0;i<n;i++) {
      if (!pos[i]) continue;
      const st = nodeStates[i] || 'def';
      const fill = NC[st]||NC.def, tcol = NT[st]||NT.def;
      svg += `<circle cx="${pos[i].x}" cy="${pos[i].y}" r="18" fill="${fill}" stroke="#30363d" stroke-width="1.5"/>`;
      svg += `<text x="${pos[i].x}" y="${pos[i].y+5}" fill="${tcol}" font-size="12" text-anchor="middle" font-weight="bold">${i}</text>`;
    }
    svg += '</svg>';
    return `<div class="dsa-graph-svg-box">${svg}</div>`;
  }

  function parseEdges(str, weighted=false) {
    const adj={}, edgeMap={};
    for (const part of str.split(',')) {
      const t = part.trim().split('-');
      if (t.length<2) continue;
      const a=+t[0], b=+t[1], w=t[2]!=null?+t[2]:1;
      if (!adj[a]) adj[a]=[]; if (!adj[b]) adj[b]=[];
      adj[a].push({to:b,w}); adj[b].push({to:a,w});
      const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
      edgeMap[key] = weighted ? {w} : {};
    }
    return {adj, edgeMap};
  }

  function parseNums(str, fallback=[]) {
    const arr = String(str || '')
      .split(',')
      .map(x => Number(x.trim()))
      .filter(x => !Number.isNaN(x));
    return arr.length ? arr : fallback;
  }

  function tf(v) { return v ? 'T' : 'F'; }

  // ── SOLVERS ────────────────────────────────────────────────

  function solveMaxSumFixed(inp) {
    const arr = inp.arr.split(',').map(Number);
    const k = parseInt(inp.k) || 3;
    const steps = [];
    steps.push(mkStep(
      `Find maximum sum subarray of size <b>k=${k}</b> in [${arr}].<br>Compute first window, then slide: add rightmost, drop leftmost. O(n) vs O(nk) brute force.`,
      rArr(arr,{},'',`Input array (k=${k})`)
    ));
    let sum = 0;
    for (let i=0;i<k;i++) sum+=arr[i];
    let maxSum=sum, maxStart=0;
    const st0={};for(let i=0;i<k;i++)st0[i]='win';
    steps.push(mkStep(
      `Initial window [0..${k-1}] = [${arr.slice(0,k)}]. sum = ${sum} = maxSum.`,
      rArr(arr, st0, {L:0, R:k-1}, `Window sum: ${sum} | maxSum: ${maxSum}`),
      `sum=${sum}`
    ));
    for (let r=k;r<arr.length;r++) {
      const l=r-k+1;
      const prev=sum;
      sum = sum + arr[r] - arr[r-k];
      const better = sum>maxSum;
      if (better){maxSum=sum;maxStart=l;}
      const st={};
      for(let i=l;i<=r;i++) st[i]='win';
      st[r]='act'; st[r-k]='exc';
      steps.push(mkStep(
        `Slide: add arr[${r}]=${arr[r]}, remove arr[${r-k}]=${arr[r-k]}.<br>${prev} + ${arr[r]} - ${arr[r-k]} = <b>${sum}</b>. ${better?`✓ New maxSum = ${maxSum}`:`maxSum stays ${maxSum}`}`,
        rArr(arr, st, {L:l,R:r}, `Window sum: ${sum} | maxSum: ${maxSum}`),
        `sum = ${prev}+${arr[r]}-${arr[r-k]} = ${sum}`
      ));
    }
    const stF={};for(let i=maxStart;i<maxStart+k;i++)stF[i]='res';
    steps.push(mkStep(
      `Done! Max sum subarray of size ${k}: [${arr.slice(maxStart,maxStart+k)}] at index [${maxStart}..${maxStart+k-1}] → sum = <b>${maxSum}</b>`,
      rArr(arr,stF,{},`Result: max sum = ${maxSum}`)
    ));
    return steps;
  }

  function solveLongestUniq(inp) {
    const s = inp.str || 'abcabcbb';
    const steps = [];
    steps.push(mkStep(
      `Longest substring without repeating chars in "<b>${s}</b>".<br>Variable window: expand right, shrink left when duplicate detected. Track char frequencies in a map.`,
      rStr(s,{},'','Input string')
    ));
    let l=0, maxLen=0, maxStart=0;
    const freq={};
    for (let r=0;r<s.length;r++) {
      const c=s[r];
      freq[c]=(freq[c]||0)+1;
      while(freq[c]>1){freq[s[l]]--;l++;}
      const len=r-l+1;
      if(len>maxLen){maxLen=len;maxStart=l;}
      const st={};for(let i=l;i<=r;i++)st[i]='win';st[r]='act';
      const fm = Object.entries(freq).filter(([,v])=>v>0).map(([k2,v])=>`${k2}:${v}`).join(', ');
      steps.push(mkStep(
        `r=${r} ch='${c}'. Window [${l}..${r}]="${s.slice(l,r+1)}" len=${len}. maxLen=${maxLen}.<br>freq: {${fm}}`,
        rStr(s, st, {L:l,R:r}, `Window: "${s.slice(l,r+1)}" | maxLen: ${maxLen}`),
        `l=${l}, r=${r}, len=${len}`
      ));
    }
    const stF={};for(let i=maxStart;i<maxStart+maxLen;i++)stF[i]='res';
    steps.push(mkStep(
      `Done! Longest: "<b>${s.slice(maxStart,maxStart+maxLen)}</b>" (len=<b>${maxLen}</b>) at [${maxStart}..${maxStart+maxLen-1}]`,
      rStr(s, stF, {}, `Result: length = ${maxLen}`)
    ));
    return steps;
  }

  function solveWindowMax(inp) {
    const arr = inp.arr.split(',').map(Number);
    const k = parseInt(inp.k)||3;
    const steps=[], result=[], dq=[];
    steps.push(mkStep(
      `Max in every window of size k=${k}.<br>Monotonic deque: keep indices of decreasing elements. Front = current window max. Remove front if out of window. Remove back if smaller than new element.`,
      rArr(arr,{},'',`Array k=${k}`)
    ));
    for (let i=0;i<arr.length;i++) {
      while(dq.length && dq[0]<i-k+1) dq.shift();
      while(dq.length && arr[dq[dq.length-1]]<arr[i]) dq.pop();
      dq.push(i);
      const st={};
      for(let j=Math.max(0,i-k+1);j<=i;j++) st[j]='win';
      st[i]='act';
      if(dq[0]!==undefined) st[dq[0]]='res';
      let expl=`i=${i}, val=${arr[i]}. Deque indices: [${dq}] → vals: [${dq.map(x=>arr[x])}].`;
      if(i>=k-1){result.push(arr[dq[0]]); expl+=` Window complete → max=<b>${arr[dq[0]]}</b>`;}
      else expl+=` Window not full yet (${i+1}/${k}).`;
      steps.push(mkStep(expl,
        rArr(arr,st,{},`Window max tracking`) +
        '<br>' + rAuxRow(rAux(dq.map(x=>`${x}→${arr[x]}`), 'Deque (idx→val)', 0), result.length?rAux(result,'Result'):''),
        `dq=[${dq}]`
      ));
    }
    steps.push(mkStep(`Done! Window maxima: <b>[${result}]</b>`,
      rArr(result, result.map((_,i)=>({[i]:'res'})).reduce((a,b)=>({...a,...b}),{}), {}, 'Result array')
    ));
    return steps;
  }

  function solveMinSubarray(inp) {
    const arr = inp.arr.split(',').map(Number);
    const target = parseInt(inp.k)||7;
    const steps=[];
    let l=0, sum=0, minLen=Infinity;
    steps.push(mkStep(
      `Find minimum length subarray with sum ≥ <b>${target}</b>.<br>Expand right to reach target, then shrink left to minimize window. O(n).`,
      rArr(arr,{},'',`Array, target=${target}`)
    ));
    for(let r=0;r<arr.length;r++) {
      sum+=arr[r];
      while(sum>=target) {
        const len=r-l+1;
        if(len<minLen) minLen=len;
        const st={};for(let i=l;i<=r;i++)st[i]='win';st[l]='exc';
        steps.push(mkStep(
          `sum=${sum} ≥ ${target}. Window [${l}..${r}] len=${len}. ${len<minLen+1?`New minLen=<b>${minLen}</b>`:`minLen stays ${minLen}`}. Shrink left.`,
          rArr(arr,st,{L:l,R:r},`sum=${sum} | minLen=${minLen===Infinity?'∞':minLen}`),
          `l=${l}, r=${r}, len=${len}`
        ));
        sum-=arr[l]; l++;
      }
      const st2={};for(let i=l;i<=r;i++)st2[i]='win';st2[r]='act';
      steps.push(mkStep(
        `Expand: r=${r} arr[r]=${arr[r]}, sum=${sum} < ${target}. Keep expanding.`,
        rArr(arr,st2,{L:l,R:r},`sum=${sum} | minLen=${minLen===Infinity?'∞':minLen}`),
        `l=${l}, r=${r}, sum=${sum}`
      ));
    }
    steps.push(mkStep(
      minLen===Infinity?`No subarray found with sum ≥ ${target}.`:`Min length subarray with sum ≥ ${target}: <b>${minLen}</b>`,
      rArr(arr,{},'',`Result: minLen = ${minLen===Infinity?'∞':minLen}`)
    ));
    return steps;
  }

  function solveFib(inp) {
    const n=parseInt(inp.n)||9;
    const dp=new Array(n+1).fill(null);
    const steps=[];
    steps.push(mkStep(`Fibonacci(${n}) bottom-up DP.<br>dp[i] = dp[i-1]+dp[i-2]. Base: dp[0]=0, dp[1]=1. Fill left→right.`,
      rDP1([...dp],-1,`dp[] n=${n}`)));
    dp[0]=0;
    steps.push(mkStep('Base case: dp[0] = 0',rDP1([...dp],0,'dp[]'),'dp[0]=0'));
    if(n>=1){dp[1]=1;steps.push(mkStep('Base case: dp[1] = 1',rDP1([...dp],1,'dp[]'),'dp[1]=1'));}
    for(let i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      const snap=[...dp];
      steps.push(mkStep(
        `dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${dp[i-1]} + ${dp[i-2]} = <b>${dp[i]}</b>`,
        rDP1(snap,i,'dp[] — Fibonacci'),
        `dp[${i}] = ${dp[i]}`
      ));
    }
    steps.push(mkStep(`F(${n}) = <b>${dp[n]}</b>`, rDP1([...dp],n,`Result: F(${n}) = ${dp[n]}`)));
    return steps;
  }

  function solveClimbStairs(inp) {
    const n=Math.max(0, parseInt(inp.n)||6);
    const dp=new Array(n+1).fill(null);
    const steps=[];
    steps.push(mkStep(
      `Climbing Stairs: count ways to reach step <b>${n}</b> using 1-step or 2-step moves.<br>dp[i] = ways to land exactly on step i. Last move into i came from i-1 or i-2.`,
      rDP1([...dp],-1,`ways[] n=${n}`)
    ));
    dp[0]=1;
    steps.push(mkStep('Base: dp[0] = 1. There is one way to stand at the ground before climbing.',
      rDP1([...dp],0,'ways[]'),'dp[0]=1'));
    if(n>=1){
      dp[1]=1;
      steps.push(mkStep('Base: dp[1] = 1. Only one single-step move reaches step 1.',
        rDP1([...dp],1,'ways[]'),'dp[1]=1'));
    }
    for(let i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      steps.push(mkStep(
        `Step ${i}: ways from step ${i-1} plus ways from step ${i-2}.<br>dp[${i}] = ${dp[i-1]} + ${dp[i-2]} = <b>${dp[i]}</b>`,
        rDP1([...dp],i,'ways[] — Climbing Stairs') + '<br>' +
        rDecision('Last move choices', [
          {label:`from ${i-1}`, value:dp[i-1]},
          {label:`from ${i-2}`, value:dp[i-2]},
          {label:'total', value:dp[i], win:true}
        ]),
        `dp[${i}] = dp[${i-1}] + dp[${i-2}]`
      ));
    }
    steps.push(mkStep(`Total distinct ways to climb ${n} stairs = <b>${dp[n]}</b>`,
      rDP1([...dp],n,`Result: ${dp[n]} ways`)));
    return steps;
  }

  function solveHouseRobber(inp) {
    const houses=parseNums(inp.arr,[2,7,9,3,1]);
    const n=houses.length;
    const dp=new Array(n).fill(null);
    const steps=[];
    if(!n) return [mkStep('No houses to rob. Result = 0', '')];
    steps.push(mkStep(
      `House Robber: maximize total money without taking adjacent houses.<br>dp[i] = best loot considering houses 0..i. Recurrence: max(skip current, rob current + dp[i-2]).`,
      rArr(houses,{},'','House values') + '<br>' + rDP1([...dp],-1,'dp[] best loot')
    ));
    dp[0]=houses[0];
    steps.push(mkStep(
      `Base: only house 0 exists, so dp[0] = ${houses[0]}.`,
      rArr(houses,{0:'res'},{i:0},'Houses') + '<br>' + rDP1([...dp],0,'dp[]'),
      `dp[0]=${dp[0]}`
    ));
    if(n>=2){
      dp[1]=Math.max(houses[0],houses[1]);
      steps.push(mkStep(
        `Base: choose max(house0=${houses[0]}, house1=${houses[1]}) = <b>${dp[1]}</b>.`,
        rArr(houses,{0:houses[0]>=houses[1]?'res':'cmp',1:houses[1]>houses[0]?'res':'cmp'},{i:1},'Houses') + '<br>' +
        rDP1([...dp],1,'dp[]') + '<br>' +
        rDecision('Base choice', [
          {label:'rob house 0', value:houses[0], win:houses[0]>=houses[1]},
          {label:'rob house 1', value:houses[1], win:houses[1]>houses[0]}
        ]),
        `dp[1]=max(${houses[0]},${houses[1]})`
      ));
    }
    for(let i=2;i<n;i++){
      const skip=dp[i-1];
      const take=houses[i]+dp[i-2];
      dp[i]=Math.max(skip,take);
      const states={ [i]:'act', [i-1]:'cmp', [i-2]:'win' };
      steps.push(mkStep(
        `House ${i} value=${houses[i]}.<br>Skip current → dp[${i-1}]=${skip}. Rob current → ${houses[i]} + dp[${i-2}]=${take}. Pick <b>${dp[i]}</b>.`,
        rArr(houses,states,{i},'Houses') + '<br>' +
        rDP1([...dp],i,'dp[] — max loot so far') + '<br>' +
        rDecision('Take / skip decision', [
          {label:'skip current', value:skip, win:skip>=take},
          {label:'rob current', value:take, win:take>skip}
        ]),
        `dp[${i}] = max(${skip}, ${take})`
      ));
    }
    steps.push(mkStep(`Max loot without adjacent houses = <b>${dp[n-1]}</b>`,
      rDP1([...dp],n-1,`Result: ${dp[n-1]}`)));
    return steps;
  }

  function solveCoin(inp) {
    const coins=inp.arr.split(',').map(Number);
    const T=parseInt(inp.n)||11;
    const dp=new Array(T+1).fill(Infinity);
    dp[0]=0;
    const steps=[];
    const disp=d=>d===Infinity?'∞':d;
    steps.push(mkStep(
      `Coin Change: min coins for amount <b>${T}</b> using [${coins}].<br>dp[i]=min coins for amount i. dp[0]=0, rest=∞. For each amount try every coin.`,
      rDP1(dp.map(disp),-1,`dp[] target=${T}`)
    ));
    steps.push(mkStep('Init: dp[0]=0, all others=∞',rDP1(dp.map(disp),0,'dp[]'),'dp[0]=0'));
    for(let a=1;a<=T;a++){
      const trials=[];
      for(const c of coins){
        if(c<=a && dp[a-c]+1<dp[a]){dp[a]=dp[a-c]+1;}
        trials.push(`c=${c}:${c<=a?`dp[${a-c}]+1=${disp(dp[a-c]+1)}`:'skip'}`);
      }
      const snap=[...dp];
      steps.push(mkStep(
        `dp[${a}]: ${trials.join(' | ')} → <b>${disp(dp[a])}</b>`,
        rDP1(snap.map(disp),a,'dp[] — Coin Change'),
        `dp[${a}] = ${disp(dp[a])}`
      ));
    }
    steps.push(mkStep(`Min coins for ${T} = <b>${disp(dp[T])}</b>`,
      rDP1(dp.map(disp),T,`Result: dp[${T}]=${disp(dp[T])}`)));
    return steps;
  }

  function solveUniquePaths(inp) {
    const rows=Math.max(1, parseInt(inp.n)||3);
    const cols=Math.max(1, parseInt(inp.k)||7);
    const dp=Array.from({length:rows},()=>new Array(cols).fill(null));
    const rowL=[...Array(rows).keys()].map(i=>`r${i}`);
    const colL=[...Array(cols).keys()].map(j=>`c${j}`);
    const steps=[];
    steps.push(mkStep(
      `Unique Paths in a <b>${rows} x ${cols}</b> grid.<br>dp[r][c] = paths to cell (r,c). First row and column are 1 because there is only one straight path.`,
      rDP2(dp,-1,-1,[],rowL,colL,'Grid paths')
    ));
    for(let r=0;r<rows;r++){
      dp[r][0]=1;
      steps.push(mkStep(
        `Base column: cell (${r},0) has exactly one path: keep moving down.`,
        rDP2(dp.map(x=>[...x]),r,0,[],rowL,colL,'Grid paths'),
        `dp[${r}][0]=1`
      ));
    }
    for(let c=1;c<cols;c++){
      dp[0][c]=1;
      steps.push(mkStep(
        `Base row: cell (0,${c}) has exactly one path: keep moving right.`,
        rDP2(dp.map(x=>[...x]),0,c,[],rowL,colL,'Grid paths'),
        `dp[0][${c}]=1`
      ));
    }
    for(let r=1;r<rows;r++){
      for(let c=1;c<cols;c++){
        const top=dp[r-1][c];
        const left=dp[r][c-1];
        dp[r][c]=top+left;
        steps.push(mkStep(
          `Cell (${r},${c}): every path arrives from top or left.<br>dp[${r}][${c}] = top ${top} + left ${left} = <b>${dp[r][c]}</b>`,
          rDP2(dp.map(x=>[...x]),r,c,[[r-1,c],[r,c-1]],rowL,colL,'Grid paths') + '<br>' +
          rDecision('Incoming paths', [
            {label:'from top', value:top},
            {label:'from left', value:left},
            {label:'total', value:dp[r][c], win:true}
          ]),
          `dp[${r}][${c}] = ${top} + ${left}`
        ));
      }
    }
    steps.push(mkStep(`Unique paths to bottom-right = <b>${dp[rows-1][cols-1]}</b>`,
      rDP2(dp,rows-1,cols-1,[],rowL,colL,`Result: ${dp[rows-1][cols-1]} paths`)));
    return steps;
  }

  function solveKnapsack(inp) {
    const wts=inp.arr.split(',').map(Number);
    const vals=inp.k.split(',').map(Number);
    const W=parseInt(inp.n)||5;
    const n=wts.length;
    const dp=Array.from({length:n+1},()=>new Array(W+1).fill(0));
    const steps=[];
    const rowL=['∅',...wts.map((w,i)=>`i${i+1}(w=${w},v=${vals[i]})`)];
    const colL=[...Array(W+1).keys()].map(j=>`w=${j}`);
    steps.push(mkStep(
      `0/1 Knapsack: ${n} items, capacity W=${W}.<br>dp[i][w]=max value using first i items, capacity w.<br>If item fits: max(skip, take). Else: skip.`,
      rDP2(dp,-1,-1,[],rowL,colL,`Knapsack DP`)
    ));
    for(let i=1;i<=n;i++){
      for(let w=0;w<=W;w++){
        const deps=[[i-1,w]];
        let take=0;
        let expl=`dp[${i}][${w}] item${i}(w=${wts[i-1]},v=${vals[i-1]}): `;
        if(wts[i-1]<=w){
          take=dp[i-1][w-wts[i-1]]+vals[i-1];
          deps.push([i-1,w-wts[i-1]]);
          expl+=`can fit. skip=${dp[i-1][w]}, take=dp[${i-1}][${w-wts[i-1]}]+${vals[i-1]}=${take}.`;
        } else {
          expl+=`too heavy (${wts[i-1]}>${w}), must skip.`;
        }
        dp[i][w]=Math.max(dp[i-1][w],take);
        expl+=` → <b>${dp[i][w]}</b>`;
        const snap=dp.map(r=>[...r]);
        steps.push(mkStep(expl, rDP2(snap,i,w,deps,rowL,colL,'Knapsack DP'), `dp[${i}][${w}]=${dp[i][w]}`));
      }
    }
    steps.push(mkStep(`Max value = <b>${dp[n][W]}</b>`, rDP2(dp,n,W,[],rowL,colL,`Result: dp[${n}][${W}]=${dp[n][W]}`)));
    return steps;
  }

  function solveLCS(inp) {
    const s1=inp.str||'AGGTAB', s2=inp.k||'GXTXAYB';
    const m=s1.length, n=s2.length;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
    const rowL=['ε',...s1.split('')];
    const colL=['ε',...s2.split('')];
    const steps=[];
    steps.push(mkStep(
      `LCS of "<b>${s1}</b>" and "<b>${s2}</b>".<br>dp[i][j]=LCS(s1[0..i-1], s2[0..j-1]).<br>Match: dp[i-1][j-1]+1. No match: max(dp[i-1][j], dp[i][j-1]).`,
      rDP2(dp,-1,-1,[],rowL,colL,'LCS Table')
    ));
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const match=s1[i-1]===s2[j-1];
        const deps=match?[[i-1,j-1]]:[[i-1,j],[i,j-1]];
        dp[i][j]=match?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
        const snap=dp.map(r=>[...r]);
        steps.push(mkStep(
          match
            ? `'${s1[i-1]}'=='${s2[j-1]}' ✓ → dp[${i}][${j}] = dp[${i-1}][${j-1}]+1 = <b>${dp[i][j]}</b>`
            : `'${s1[i-1]}'≠'${s2[j-1]}' → max(dp[${i-1}][${j}],dp[${i}][${j-1}])=max(${dp[i-1][j]},${dp[i][j-1]})=<b>${dp[i][j]}</b>`,
          rDP2(snap,i,j,deps,rowL,colL,`LCS "${s1}" vs "${s2}"`),
          `dp[${i}][${j}]=${dp[i][j]}`
        ));
      }
    }
    steps.push(mkStep(`LCS length = <b>${dp[m][n]}</b>`, rDP2(dp,m,n,[],rowL,colL,`Result: LCS=${dp[m][n]}`)));
    return steps;
  }

  function solveEditDistance(inp) {
    const a=inp.str||'horse', b=inp.k||'ros';
    const m=a.length, n=b.length;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(null));
    const rowL=['ε',...a.split('')];
    const colL=['ε',...b.split('')];
    const steps=[];
    steps.push(mkStep(
      `Edit Distance: minimum operations to convert "<b>${a}</b>" into "<b>${b}</b>".<br>dp[i][j] = min edits to convert first i chars of word1 into first j chars of word2.`,
      rDP2(dp,-1,-1,[],rowL,colL,'Edit Distance Table')
    ));
    dp[0][0]=0;
    steps.push(mkStep('Base: empty string to empty string costs 0.',
      rDP2(dp.map(r=>[...r]),0,0,[],rowL,colL,'Edit Distance Table'),'dp[0][0]=0'));
    for(let i=1;i<=m;i++){
      dp[i][0]=i;
      steps.push(mkStep(
        `Base delete: convert "${a.slice(0,i)}" to empty string using ${i} deletes.`,
        rDP2(dp.map(r=>[...r]),i,0,[[i-1,0]],rowL,colL,'Edit Distance Table'),
        `dp[${i}][0]=${i}`
      ));
    }
    for(let j=1;j<=n;j++){
      dp[0][j]=j;
      steps.push(mkStep(
        `Base insert: convert empty string to "${b.slice(0,j)}" using ${j} inserts.`,
        rDP2(dp.map(r=>[...r]),0,j,[[0,j-1]],rowL,colL,'Edit Distance Table'),
        `dp[0][${j}]=${j}`
      ));
    }
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        if(a[i-1]===b[j-1]){
          dp[i][j]=dp[i-1][j-1];
          steps.push(mkStep(
            `Characters match: '${a[i-1]}' == '${b[j-1]}'. No new operation needed.<br>dp[${i}][${j}] = dp[${i-1}][${j-1}] = <b>${dp[i][j]}</b>`,
            rDP2(dp.map(r=>[...r]),i,j,[[i-1,j-1]],rowL,colL,'Edit Distance Table') + '<br>' +
            rDecision('Operation choice', [
              {label:'match / carry', value:dp[i][j], win:true}
            ]),
            `dp[${i}][${j}] = ${dp[i][j]}`
          ));
        } else {
          const del=dp[i-1][j]+1;
          const ins=dp[i][j-1]+1;
          const rep=dp[i-1][j-1]+1;
          dp[i][j]=Math.min(del,ins,rep);
          steps.push(mkStep(
            `Mismatch: '${a[i-1]}' vs '${b[j-1]}'. Try delete, insert, replace.<br>min(${del}, ${ins}, ${rep}) = <b>${dp[i][j]}</b>`,
            rDP2(dp.map(r=>[...r]),i,j,[[i-1,j],[i,j-1],[i-1,j-1]],rowL,colL,'Edit Distance Table') + '<br>' +
            rDecision('1 + best operation', [
              {label:'delete', value:del, win:del===dp[i][j]},
              {label:'insert', value:ins, win:ins===dp[i][j]},
              {label:'replace', value:rep, win:rep===dp[i][j]}
            ]),
            `dp[${i}][${j}] = 1 + min(${del-1}, ${ins-1}, ${rep-1})`
          ));
        }
      }
    }
    steps.push(mkStep(`Minimum edits from "${a}" to "${b}" = <b>${dp[m][n]}</b>`,
      rDP2(dp,m,n,[],rowL,colL,`Result: ${dp[m][n]} edits`)));
    return steps;
  }

  function solveLIS(inp) {
    const arr=parseNums(inp.arr,[10,9,2,5,3,7,101,18]);
    const n=arr.length;
    const dp=new Array(n).fill(null);
    const steps=[];
    if(!n) return [mkStep('Empty array has LIS length 0.', '')];
    steps.push(mkStep(
      `Longest Increasing Subsequence: keep order, skip any elements, and find the longest strictly increasing chain.<br>dp[i] = LIS length that <b>ends at i</b>.`,
      rArr(arr,{},'','Input array') + '<br>' + rDP1([...dp],-1,'dp[] LIS ending here')
    ));
    let best=1;
    for(let i=0;i<n;i++){
      dp[i]=1;
      steps.push(mkStep(
        `Start i=${i}, value=${arr[i]}. Every single element is an increasing subsequence of length 1.`,
        rArr(arr,{[i]:'act'},{i},'Input array') + '<br>' + rDP1([...dp],i,'dp[] LIS ending here'),
        `dp[${i}]=1`
      ));
      for(let j=0;j<i;j++){
        const canExtend=arr[j]<arr[i];
        const candidate=canExtend ? dp[j]+1 : 1;
        const before=dp[i];
        if(canExtend && candidate>dp[i]) dp[i]=candidate;
        best=Math.max(best,dp[i]);
        steps.push(mkStep(
          canExtend
            ? `Compare j=${j} (${arr[j]}) < i=${i} (${arr[i]}). Can extend: dp[${j}]+1 = ${candidate}. ${candidate>before?`Update dp[${i}] to <b>${dp[i]}</b>.`:`Keep dp[${i}]=${dp[i]}.`}`
            : `Compare j=${j} (${arr[j]}) with i=${i} (${arr[i]}). Cannot extend because ${arr[j]} is not smaller.`,
          rArr(arr,{[j]:canExtend?'win':'cmp',[i]:'act'},{j,i},'Input array') + '<br>' +
          rDP1([...dp],i,'dp[] LIS ending here') + '<br>' +
          rDecision('Extend decision', [
            {label:'current dp[i]', value:before},
            {label:canExtend?'dp[j]+1':'blocked', value:canExtend?candidate:'-'},
            {label:'best dp[i]', value:dp[i], win:true}
          ]),
          canExtend ? `dp[${i}] = max(${before}, ${candidate})` : 'skip'
        ));
      }
    }
    const maxIdx=dp.indexOf(Math.max(...dp));
    steps.push(mkStep(`LIS length = <b>${Math.max(...dp)}</b>. The highlighted dp cell marks one best ending position.`,
      rArr(arr,{[maxIdx]:'res'}, {}, 'Input array') + '<br>' + rDP1([...dp],maxIdx,`Result: LIS length ${Math.max(...dp)}`)));
    return steps;
  }

  function solvePartitionEqual(inp) {
    const arr=parseNums(inp.arr,[1,5,11,5]);
    const total=arr.reduce((a,b)=>a+b,0);
    const steps=[];
    steps.push(mkStep(
      `Partition Equal Subset Sum: total=${total}. Equal partition is possible only if one subset sums to total/2.`,
      rArr(arr,{},'','Input numbers')
    ));
    if(total%2!==0){
      steps.push(mkStep(
        `Total sum ${total} is odd, so it cannot be split into two equal integer sums. Result = <b>false</b>.`,
        rArr(arr,arr.map((_,i)=>({[i]:'exc'})).reduce((a,b)=>({...a,...b}),{}),'','Odd total')
      ));
      return steps;
    }
    const target=total/2;
    const dp=new Array(target+1).fill(false);
    dp[0]=true;
    steps.push(mkStep(
      `Target subset sum = ${target}. dp[s] means "can we form sum s using numbers processed so far?" Init dp[0]=true.`,
      rDP1(dp.map(tf),0,`subset dp[] target=${target}`),
      'dp[0]=true'
    ));
    for(let i=0;i<arr.length;i++){
      const num=arr[i];
      steps.push(mkStep(
        `Process number arr[${i}]=${num}. Iterate sums backward so this number is used at most once.`,
        rArr(arr,{[i]:'act'},{i},'Current number') + '<br>' + rDP1(dp.map(tf),-1,`subset dp[] target=${target}`)
      ));
      for(let s=target;s>=num;s--){
        const before=dp[s];
        const include=dp[s-num];
        dp[s]=dp[s] || include;
        steps.push(mkStep(
          `sum=${s}: keep existing dp[${s}]=${tf(before)} or include ${num} if dp[${s-num}]=${tf(include)}.<br>dp[${s}] becomes <b>${tf(dp[s])}</b>.`,
          rArr(arr,{[i]:'act'},{i},'Numbers') + '<br>' +
          rDP1(dp.map(tf),s,`subset dp[] target=${target}`) + '<br>' +
          rDecision('Subset choice', [
            {label:'without num', value:tf(before), win:before},
            {label:`with ${num}`, value:tf(include), win:include},
            {label:`dp[${s}]`, value:tf(dp[s]), win:dp[s]}
          ]),
          `dp[${s}] = dp[${s}] || dp[${s-num}]`
        ));
      }
    }
    steps.push(mkStep(
      dp[target]
        ? `dp[${target}] is true, so the array can be partitioned into two subsets of sum ${target}.`
        : `dp[${target}] is false, so no equal partition exists.`,
      rDP1(dp.map(tf),target,`Result: ${dp[target]}`)
    ));
    return steps;
  }

  function solveActivity(inp) {
    const nums=inp.arr.split(',').map(Number);
    const acts=[];
    for(let i=0;i<nums.length;i+=2) acts.push({s:nums[i],e:nums[i+1],id:acts.length});
    acts.sort((a,b)=>a.e-b.e);
    const steps=[], states={};
    let lastEnd=-1, selected=[];
    steps.push(mkStep(
      `Activity Selection: pick max non-overlapping activities.<br>Sorted by end time: ${acts.map(a=>`[${a.s},${a.e}]`).join(', ')}<br>Greedy: always choose earliest-ending activity that starts after last selected ends.`,
      rArr(acts.map(a=>`[${a.s},${a.e}]`),{},'','Activities (sorted by end time)')
    ));
    for(let i=0;i<acts.length;i++){
      const a=acts[i];
      const ok=a.s>=lastEnd;
      const curSt={...states,[i]:ok?'act':'cmp'};
      steps.push(mkStep(
        `Activity ${i}: [${a.s},${a.e}]. start=${a.s} ${ok?'≥':'<'} lastEnd=${lastEnd}. ${ok?`✓ Select! lastEnd → ${a.e}`:'✗ Overlaps — skip.'}`,
        rArr(acts.map(a=>`[${a.s},${a.e}]`),curSt,{check:i},'Activities'),
        `a.s(${a.s}) >= lastEnd(${lastEnd}) → ${ok}`
      ));
      states[i]=ok?'vis':'exc';
      if(ok){selected.push(a);lastEnd=a.e;}
    }
    steps.push(mkStep(
      `Done! Selected <b>${selected.length}</b>: ${selected.map(a=>`[${a.s},${a.e}]`).join(', ')}`,
      rArr(acts.map(a=>`[${a.s},${a.e}]`),states,'',`Result: ${selected.length} activities`)
    ));
    return steps;
  }

  function solveGCoin(inp) {
    const coins=inp.arr.split(',').map(Number).sort((a,b)=>b-a);
    const amount=parseInt(inp.n)||41;
    const steps=[], used=[];
    steps.push(mkStep(
      `Greedy Coin Change: make amount <b>${amount}</b> using fewest coins.<br>Coins sorted descending: [${coins}]. At each step use largest coin that fits.`,
      rArr(coins,{},'',`Coins (desc) | amount = ${amount}`)
    ));
    let rem=amount;
    for(const coin of coins){
      while(rem>=coin){
        used.push(coin); rem-=coin;
        const snap=[...used];
        steps.push(mkStep(
          `Use coin <b>${coin}</b>. Remaining: ${rem+coin} - ${coin} = <b>${rem}</b>. Coins used: [${snap}]`,
          rArr(coins,{[coins.indexOf(coin)]:'act'},'',`Using coin=${coin} | rem=${rem}`) +
          '<br>' + rAux(snap, 'Coins selected'),
          `remaining = ${rem}`
        ));
      }
    }
    steps.push(mkStep(
      rem===0?`Done! Used <b>${used.length}</b> coins: [${used}]`:`Cannot form ${amount}. Remaining: ${rem}`,
      rAux(used,'Final Selection')
    ));
    return steps;
  }

  function solveJobSeq(inp) {
    const profits=inp.arr.split(',').map(Number);
    const deadlines=inp.k.split(',').map(Number);
    const slots=parseInt(inp.n)||3;
    const jobs=profits.map((p,i)=>({id:`J${i+1}`,p,d:deadlines[i]}));
    jobs.sort((a,b)=>b.p-a.p);
    const schedule=new Array(slots).fill(null);
    const steps=[], states={};
    let total=0;
    steps.push(mkStep(
      `Job Sequencing: ${slots} slots, maximize profit.<br>Sorted by profit desc: ${jobs.map(j=>`${j.id}(p=${j.p},d=${j.d})`).join(', ')}<br>For each job try latest free slot before deadline.`,
      rArr(jobs.map(j=>j.id),{},'','Jobs (profit desc)')
    ));
    for(let ji=0;ji<jobs.length;ji++){
      const job=jobs[ji];
      let placed=false;
      for(let sl=Math.min(job.d,slots)-1;sl>=0;sl--){
        if(!schedule[sl]){
          schedule[sl]=job; total+=job.p; placed=true; states[ji]='vis';
          steps.push(mkStep(
            `Place ${job.id}(p=${job.p}) in slot ${sl+1} (d=${job.d}). Schedule: [${schedule.map(j=>j?j.id:'_')}]. Profit: ${total}`,
            rArr(jobs.map(j=>j.id),{...states,[ji]:'res'},'','Jobs') +
            '<br>' + rArr(schedule.map(j=>j?j.id:'_'),{},'',`Schedule (${slots} slots) | profit=${total}`),
            `slot ${sl+1} assigned`
          ));
          break;
        }
      }
      if(!placed){states[ji]='exc';steps.push(mkStep(`${job.id}(p=${job.p}) — no free slot before deadline ${job.d}. Skip.`,rArr(jobs.map(j=>j.id),{...states},'','Jobs')));}
    }
    steps.push(mkStep(
      `Done! Schedule: [${schedule.map(j=>j?j.id:'_')}]. Total profit = <b>${total}</b>`,
      rArr(schedule.map(j=>j?j.id:'_'),schedule.map((j,i)=>({[i]:j?'res':'exc'})).reduce((a,b)=>({...a,...b}),{}),{},`Final | profit = ${total}`)
    ));
    return steps;
  }

  function solveBFS(inp) {
    const n=parseInt(inp.n)||7, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const steps=[], ns={}, es={}, vis=new Array(n).fill(false), q=[], order=[];
    steps.push(mkStep(`BFS from node <b>${src}</b>. Queue (FIFO): enqueue → process → enqueue unvisited neighbors.`,
      rGraph(n,edgeMap,ns,es)));
    vis[src]=true; ns[src]='act'; q.push(src);
    steps.push(mkStep(`Enqueue start node ${src}. Mark visited.`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue',0),rAux([...order],'BFS Order')),
      `queue=[${q}]`
    ));
    while(q.length){
      const cur=q.shift(); order.push(cur); ns[cur]='vis';
      steps.push(mkStep(
        `Dequeue <b>${cur}</b>. BFS order: [${order.join('→')}]. Neighbors: [${adj[cur].map(e=>e.to)}]`,
        rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue'),rAux([...order],'Order')),
        `cur=${cur}`
      ));
      for(const {to} of adj[cur]){
        if(!vis[to]){
          vis[to]=true; ns[to]='que';
          const ek=`${Math.min(cur,to)}-${Math.max(cur,to)}`; es[ek]='visited';
          q.push(to);
          steps.push(mkStep(
            `Enqueue neighbor <b>${to}</b> (not visited). Mark queued.`,
            rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue'),rAux([...order],'Order')),
            `enqueue ${to}`
          ));
        }
      }
      ns[cur]='vis';
    }
    steps.push(mkStep(`BFS complete! Order: <b>${order.join(' → ')}</b>`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAux([...order],'BFS Traversal Order')));
    return steps;
  }

  function solveDFS(inp) {
    const n=parseInt(inp.n)||7, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const steps=[], ns={}, es={}, vis=new Array(n).fill(false), stk=[], order=[];
    steps.push(mkStep(`DFS from node <b>${src}</b>. Stack (LIFO): push → pop → push unvisited neighbors.`,
      rGraph(n,edgeMap,ns,es)));
    stk.push(src); ns[src]='que';
    steps.push(mkStep(`Push start node ${src}.`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)',0),rAux([...order],'DFS Order')),
      `stack=[${stk}]`
    ));
    while(stk.length){
      const cur=stk.pop();
      if(vis[cur]) continue;
      vis[cur]=true; order.push(cur); ns[cur]='vis';
      steps.push(mkStep(
        `Pop <b>${cur}</b>. Mark visited. DFS order: [${order.join('→')}]. Push unvisited neighbors.`,
        rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)'),rAux([...order],'Order')),
        `cur=${cur}`
      ));
      for(const {to} of [...adj[cur]].reverse()){
        if(!vis[to]){
          stk.push(to); if(!ns[to]) ns[to]='que';
          const ek=`${Math.min(cur,to)}-${Math.max(cur,to)}`; es[ek]='active';
          steps.push(mkStep(
            `Push neighbor <b>${to}</b>.`,
            rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)'),rAux([...order],'Order')),
            `push ${to}`
          ));
        }
      }
    }
    steps.push(mkStep(`DFS complete! Order: <b>${order.join(' → ')}</b>`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAux([...order],'DFS Traversal Order')));
    return steps;
  }

  function solveDijkstra(inp) {
    const n=parseInt(inp.n)||4, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr,true);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const INF=Infinity, dist=new Array(n).fill(INF), vis=new Array(n).fill(false);
    dist[src]=0;
    const steps=[], ns={}, es={};
    steps.push(mkStep(
      `Dijkstra SSSP from <b>${src}</b>. dist[src]=0, rest=∞.<br>Greedy: pick min-dist unvisited node, relax its edges. O((V+E)logV) with min-heap; here O(V²) linear scan for simplicity.`,
      rGraph(n,edgeMap,ns,es) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),{},'','dist[]')
    ));
    for(let iter=0;iter<n;iter++){
      let u=-1;
      for(let i=0;i<n;i++) if(!vis[i]&&(u===-1||dist[i]<dist[u])) u=i;
      if(u===-1||dist[u]===INF) break;
      vis[u]=true; ns[u]='vis';
      steps.push(mkStep(
        `Pick unvisited min-dist node: <b>${u}</b> (dist=${dist[u]}). Finalize. Relax neighbors.`,
        rGraph(n,edgeMap,{...ns,[u]:'cur'},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),dist.map((d,i)=>({[i]:vis[i]?'vis':i===u?'act':'def'})).reduce((a,b)=>({...a,...b}),{}),'','dist[]'),
        `u=${u}, dist[u]=${dist[u]}`
      ));
      for(const {to,w} of adj[u]){
        if(!vis[to] && dist[u]+w<dist[to]){
          const old=dist[to]; dist[to]=dist[u]+w;
          const ek=`${Math.min(u,to)}-${Math.max(u,to)}`; es[ek]='active';
          if(!ns[to]) ns[to]='que';
          steps.push(mkStep(
            `Relax edge ${u}→${to} (w=${w}): dist[${u}]+${w}=${dist[u]+w} < dist[${to}]=${old===INF?'∞':old} → dist[${to}]=<b>${dist[to]}</b>`,
            rGraph(n,edgeMap,{...ns,[u]:'cur'},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),{},'','dist[]'),
            `dist[${to}]=${dist[to]}`
          ));
        }
      }
    }
    steps.push(mkStep(
      `Dijkstra complete! Distances from ${src}: ${dist.map((d,i)=>`${i}:${d===INF?'∞':d}`).join(', ')}`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),dist.map((d,i)=>({[i]:d===INF?'exc':'res'})).reduce((a,b)=>({...a,...b}),{}),'',`Distances from ${src}`)
    ));
    return steps;
  }

  // ── INIT ────────────────────────────────────────────────────
  // Wire up bottom bar buttons
  root.querySelector('#dsa-btn-prev').addEventListener('click', () => nav(-1));
  root.querySelector('#dsa-btn-next').addEventListener('click', () => nav(1));
  root.querySelector('#dsa-btn-reset').addEventListener('click', () => doReset());
  root.querySelector('#dsa-btn-auto').addEventListener('click', () => toggleAuto());

  buildSidebar();
  pick('sliding', 'maxSumFixed');
}

window.DSA_TOPICS = [
  {
    id: "dsa-visualizer",
    area: "dsa",
    title: "DSA Algorithm Visualizer",
    tag: "Interactive",
    tags: ["dsa", "algorithms", "sliding-window", "dp", "greedy", "graph", "bfs", "dfs", "dijkstra"],
    concept:
`Step-through visual debugger for core DSA patterns.

**Sliding Window** — fixed/variable window with two pointers. O(n) for sum, frequency, and deque problems.

**Dynamic Programming** — table-filling with dependency arrows. Fibonacci, Coin Change, 0/1 Knapsack, LCS.

**Greedy** — local-optimal decisions at each step. Activity Selection, Coin Change, Job Sequencing.

**Graph** — BFS (queue, shortest path in unweighted), DFS (stack/recursion, cycle detection), Dijkstra (min-heap / dist array, SSSP in weighted).`,
    why:
`These four patterns cover ~70% of Leetcode medium/hard problems. Recognising which pattern applies is the interview skill — not memorising solutions. Each visualizer step shows the exact decision the algorithm makes, building intuition for why it works.`,
    example: {
      language: "python",
      code:
`# Sliding Window — Longest Substring Without Repeat  O(n)
def length_of_longest_substring(s: str) -> int:
    freq: dict[str, int] = {}
    l, max_len = 0, 0
    for r, c in enumerate(s):
        freq[c] = freq.get(c, 0) + 1
        while freq[c] > 1:
            freq[s[l]] -= 1
            l += 1
        max_len = max(max_len, r - l + 1)
    return max_len

# DP — Coin Change  O(amount * len(coins))
def coin_change(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
      notes:
`Both run in a single forward pass. The visualizer shows every cell write so you can trace the recurrence by eye. For graph problems use the BFS/DFS/Dijkstra tabs — the deque and dist[] arrays are shown live at each node visit.`
    },
    interview: [
      {
        question: "When do you use sliding window vs two pointers?",
        answer:
`**Sliding window** = subarray/substring with a constraint (sum ≥ k, no duplicates). Window expands right and contracts left while the constraint is violated. **Two pointers** = sorted array, meeting in the middle (pair sum, palindrome check). Rule of thumb: if you need a contiguous window, use sliding window; if you can sort and work from both ends, use two pointers.`,
        followUps: ["Monotonic deque for window maximum?", "Shrink condition for variable window?"]
      },
      {
        question: "How do you recognise a DP problem?",
        answer:
`Three signals: (1) **optimal substructure** — solution built from optimal sub-solutions; (2) **overlapping subproblems** — same sub-problem computed multiple times in naive recursion; (3) problem asks for min/max/count over choices. Draw the recurrence first, then decide top-down (memoisation) vs bottom-up (tabulation). Bottom-up is usually faster due to no call-stack overhead.`,
        followUps: ["Space optimisation for 1D DP?", "When is memoisation better than tabulation?"]
      },
      {
        question: "When does greedy fail where DP succeeds?",
        answer:
`Greedy works when the problem has the **greedy-choice property**: a locally optimal choice leads to a globally optimal solution. Greedy Coin Change fails on non-canonical coin sets (e.g. coins=[1,3,4], amount=6 → greedy gives 4+1+1=3 coins, DP gives 3+3=2 coins). Whenever past choices constrain future choices in non-obvious ways, DP is safer.`,
        followUps: ["Prove Activity Selection greedy is optimal?", "Exchange argument?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Step-by-step execution with explanation + pseudocode line at each step",
        "Custom input — paste any array or string to test edge cases",
        "Auto-play with speed control for rapid pattern absorption",
        "Four canonical patterns covering most interview problems"
      ],
      cons: [
        "Graph layout is circular — may overlap for dense graphs",
        "No backtracking / recursive call-stack visualisation",
        "No sorting algorithms (bubble, merge, quick) — separate concern"
      ],
      when: "Use before interviews to rebuild intuition on any pattern you haven't touched recently. Run a problem you've seen before — see if you can predict the next step before clicking Next."
    },
    visual(mount) {
      // Inject scoped styles
      const styleId = 'dsa-viz-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
.dsa-viz{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:8px;overflow:hidden}
.dsa-viz .dsa-app{display:flex;height:640px;overflow:hidden}
.dsa-viz .dsa-sidebar{width:220px;background:#161b22;border-right:1px solid #30363d;padding:12px;overflow-y:auto;flex-shrink:0}
.dsa-viz .dsa-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
.dsa-viz .dsa-top-bar{background:#161b22;border-bottom:1px solid #30363d;padding:8px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:48px}
.dsa-viz .dsa-viz-area{flex:1;padding:14px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.dsa-viz .dsa-bottom-bar{background:#161b22;border-top:1px solid #30363d;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsa-viz h3{font-size:14px;color:#58a6ff;font-weight:bold;margin:0 0 12px;letter-spacing:1px}
.dsa-viz .dsa-topic-header{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px;padding-left:4px}
.dsa-viz .dsa-prob-btn{display:block;width:100%;text-align:left;padding:5px 10px;border-radius:4px;border:none;cursor:pointer;background:transparent;color:#8b949e;font-family:inherit;font-size:11px;transition:all .12s;line-height:1.4}
.dsa-viz .dsa-prob-btn:hover{background:#21262d;color:#e6edf3}
.dsa-viz .dsa-prob-btn.active{color:#f0883e;background:#f0883e11;border-left:2px solid #f0883e;padding-left:8px}
.dsa-viz .dsa-inp-label{font-size:11px;color:#8b949e;white-space:nowrap}
.dsa-viz .dsa-inp-field{background:#21262d;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:4px;font-family:inherit;font-size:11px}
.dsa-viz .dsa-inp-field:focus{outline:none;border-color:#58a6ff}
.dsa-viz .dsa-inp-wide{width:150px}
.dsa-viz .dsa-inp-mid{width:110px}
.dsa-viz .dsa-inp-sm{width:55px}
.dsa-viz .dsa-btn{padding:4px 12px;border-radius:5px;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .12s;white-space:nowrap}
.dsa-viz .dsa-btn-blue{background:#1f6feb;color:white}
.dsa-viz .dsa-btn-blue:hover{background:#388bfd}
.dsa-viz .dsa-btn-gray{background:#21262d;color:#e6edf3;border:1px solid #30363d}
.dsa-viz .dsa-btn-gray:hover{background:#30363d}
.dsa-viz .dsa-btn-green{background:#238636;color:white}
.dsa-viz .dsa-btn-green:hover{background:#2ea043}
.dsa-viz .dsa-btn:disabled{opacity:.35;cursor:not-allowed}
.dsa-viz .dsa-prob-title{font-size:12px;font-weight:bold;color:#e6edf3;margin-right:4px}
.dsa-viz .dsa-step-counter{font-size:12px;color:#8b949e;margin-left:auto}
.dsa-viz .dsa-speed-row{display:flex;align-items:center;gap:6px}
.dsa-viz .dsa-speed-row label{font-size:11px;color:#8b949e}
.dsa-viz input[type=range]{width:70px;accent-color:#58a6ff;cursor:pointer}
.dsa-viz .dsa-expl-box{background:#161b22;border:1px solid #30363d;border-radius:7px;padding:12px 16px}
.dsa-viz .dsa-expl-step{font-size:11px;color:#58a6ff;font-weight:bold;margin-bottom:4px}
.dsa-viz .dsa-expl-text{font-size:13px;line-height:1.65;color:#e6edf3}
.dsa-viz .dsa-expl-code{font-size:11px;color:#f0883e;margin-top:6px;font-family:'Courier New';background:#0d1117;padding:4px 8px;border-radius:4px;display:inline-block}
.dsa-viz .dsa-arr-label{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.dsa-viz .dsa-arr-row{display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start}
.dsa-viz .dsa-cell-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}
.dsa-viz .dsa-cell-ptr{font-size:9px;color:#f0883e;height:12px;text-align:center;width:42px}
.dsa-viz .dsa-cell-box{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-size:13px;font-weight:bold;border:2px solid transparent;transition:background .18s,border-color .18s,color .18s}
.dsa-viz .dsa-cell-idx{font-size:9px;color:#555;text-align:center;width:42px}
.dsa-viz .c-def{background:#21262d;color:#e6edf3;border-color:#30363d}
.dsa-viz .c-act{background:#f0883e33;color:#f0883e;border-color:#f0883e}
.dsa-viz .c-win{background:#1f6feb22;color:#79c0ff;border-color:#58a6ff}
.dsa-viz .c-vis{background:#23863622;color:#3fb950;border-color:#3fb950}
.dsa-viz .c-res{background:#b08800;color:#f8e3a1;border-color:#f8e3a1}
.dsa-viz .c-cmp{background:#8957e533;color:#d2a8ff;border-color:#d2a8ff}
.dsa-viz .c-exc{background:#da363633;color:#f85149;border-color:#f85149}
.dsa-viz .c-que{background:#56d36433;color:#56d364;border-color:#56d364}
.dsa-viz .c-cur{background:#ff7b7233;color:#ff7b72;border-color:#ff7b72}
.dsa-viz .dsa-dp-wrap{overflow-x:auto}
.dsa-viz .dsa-dp-tbl{border-collapse:collapse}
.dsa-viz .dsa-dp-tbl td,.dsa-viz .dsa-dp-tbl th{width:44px;height:34px;text-align:center;border:1px solid #30363d;font-size:12px;transition:background .15s}
.dsa-viz .dsa-dp-tbl th{background:#161b22;color:#8b949e;font-size:10px;font-weight:normal;padding:2px}
.dsa-viz .dc-empty{background:#21262d;color:#444}
.dsa-viz .dc-fill{background:#21262d;color:#e6edf3}
.dsa-viz .dc-dep{background:#1f6feb22;color:#79c0ff}
.dsa-viz .dc-act{background:#f0883e44;color:#f0883e;font-weight:bold;border:2px solid #f0883e!important}
.dsa-viz .dc-res{background:#b08800;color:#f8e3a1;font-weight:bold}
.dsa-viz .dsa-aux-row{display:flex;gap:12px;flex-wrap:wrap}
.dsa-viz .dsa-aux-box{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px 12px}
.dsa-viz .dsa-aux-title{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.dsa-viz .dsa-aux-items{display:flex;gap:4px;flex-wrap:wrap}
.dsa-viz .dsa-aux-chip{padding:2px 8px;border-radius:4px;font-size:11px;background:#21262d;border:1px solid #30363d;color:#e6edf3}
.dsa-viz .dsa-aux-chip.hi{background:#1f6feb33;border-color:#58a6ff;color:#79c0ff}
.dsa-viz .dsa-aux-empty{font-size:11px;color:#444;font-style:italic}
.dsa-viz .dsa-graph-svg-box{background:#161b22;border-radius:8px;border:1px solid #30363d;display:inline-block}
        `;
        document.head.appendChild(style);
      }

      mount.innerHTML = `
        <div class="dsa-viz">
          <div class="dsa-app">
            <div class="dsa-sidebar">
              <h3>⚡ DSA Visual</h3>
              <div id="dsa-sidebar"></div>
            </div>
            <div class="dsa-main">
              <div class="dsa-top-bar" id="dsa-top-bar">
                <span style="color:#8b949e;font-size:12px">← select a problem</span>
              </div>
              <div class="dsa-viz-area" id="dsa-viz-area">
                <div class="dsa-expl-box">
                  <div class="dsa-expl-step">Welcome</div>
                  <div class="dsa-expl-text">Pick any topic + problem from the left sidebar.<br>Customize input, then step through each iteration.</div>
                </div>
              </div>
              <div class="dsa-bottom-bar">
                <button class="dsa-btn dsa-btn-gray" id="dsa-btn-prev" disabled>◀ Prev</button>
                <button class="dsa-btn dsa-btn-gray" id="dsa-btn-next" disabled>Next ▶</button>
                <button class="dsa-btn dsa-btn-gray" id="dsa-btn-reset" disabled>↺ Reset</button>
                <button class="dsa-btn dsa-btn-green" id="dsa-btn-auto" disabled>▶ Auto</button>
                <div class="dsa-speed-row">
                  <label>Speed</label>
                  <input type="range" id="dsa-speed" min="1" max="10" value="5">
                </div>
                <span class="dsa-step-counter" id="dsa-step-ctr">— / —</span>
              </div>
            </div>
          </div>
        </div>
      `;

      initDSAVisualizer(mount);
    }
  }
];
