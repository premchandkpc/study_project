# Study Lab — Visual Design System
*Reusable styles, animations, palettes, UML patterns, DSA components. Reference from CLAUDE.md.*

---

## DSA VIZ COMPONENTS
*Standalone reusable JS components. Load order: core → then any others.*
*Location: `src/shared/dsa-viz/`*

### Load Order (HTML script tags)
```html
<!-- 1. Core utilities (always first) -->
<script src="src/shared/dsa-viz/dsa-viz-core.js"></script>
<!-- 2. Load only what you need -->
<script src="src/shared/dsa-viz/dsa-viz-array.js"></script>
<script src="src/shared/dsa-viz/dsa-viz-tree.js"></script>
<script src="src/shared/dsa-viz/dsa-viz-graph.js"></script>
<script src="src/shared/dsa-viz/dsa-viz-matrix.js"></script>
<script src="src/shared/dsa-viz/dsa-viz-dp.js"></script>
<script src="src/shared/dsa-viz/dsa-viz-string.js"></script>
```

### Namespace: `window.DSAViz`
All components live on `window.DSAViz.*`. Never pollute global scope further.

---

### C1 · `DSAViz.array` — Arrays / Sliding Window / Two Pointers
**File:** `dsa-viz-array.js`

```js
// Static render
DSAViz.array.render(mountEl, {
  arr: [3, 1, 4, 1, 5, 9, 2, 6],
  title: 'Max Sum Subarray',
  highlights: { 2: 'active', 3: 'active', 4: 'active' },  // state per index
  pointers:   { L: 2, R: 4 },                              // labeled arrows above
  window:     { l: 2, r: 4 },                              // bracket underline
  narration:  'Window [4,1,5] — current sum = 10',
  barMode:    false,                                        // set true for histogram
});

// Animated step-through
const steps = [
  { arr, highlights: {0:'active'}, pointers:{L:0,R:0}, window:{l:0,r:0}, narration:'Start: L=R=0' },
  { arr, highlights: {0:'active',1:'active'}, pointers:{L:0,R:1}, window:{l:0,r:1}, narration:'Expand R' },
  // ...
];
const ctrl = DSAViz.array.animate(mountEl, steps);
// ctrl.play() / ctrl.step() / ctrl.reset()
```

**State colors:** `active` (blue) | `success` (green) | `error` (red) | `warn` (yellow) | `compare` (orange) | `swap` (green flash)

**When to use:**
- Sliding window problems (highlight window range)
- Two-pointer (L/R pointer labels)
- Sorting animation (swap/compare states)
- Prefix sum (annotate each cell with cumulative value)
- Stack/queue (show as 1D array, use `warn` for top)

---

### C2 · `DSAViz.tree` — Binary / N-ary Trees
**File:** `dsa-viz-tree.js`

```js
// TreeNode shape: { val, left?, right? }  OR  { val, children: [] }
const root = {
  val: 4,
  left:  { val: 2, left: { val: 1 }, right: { val: 3 } },
  right: { val: 6, left: { val: 5 }, right: { val: 7 } },
};

DSAViz.tree.render(mountEl, {
  root,
  highlights: { 4: 'active', 2: 'visited', 6: 'default' },
  path:  [4, 2, 1],        // highlight edge path by node values
  stack: [4, 2],           // DFS stack panel (shown beside tree)
  queue: [],               // BFS queue panel
  narration: 'Visiting node 2 — going left',
});

// Animated
const ctrl = DSAViz.tree.animate(mountEl, steps);
```

**States:** `active` (blue pulse) | `visited` (purple) | `success` (green) | `error` (red) | `current` (bright blue filled)

**When to use:**
- BST insert/search/delete
- DFS/BFS traversal (stack/queue panels)
- Recursion tree for DP (use `warn` for memo hits)
- Segment tree, Trie (N-ary mode with `children` array)
- Heap (complete binary tree, highlight swaps)

---

### C3 · `DSAViz.graph` — Directed / Undirected Graphs
**File:** `dsa-viz-graph.js`

```js
DSAViz.graph.render(mountEl, {
  nodes: [
    { id: 'A' }, { id: 'B' }, { id: 'C', x: 260, y: 160 },  // x/y optional
  ],
  edges: [
    { from: 'A', to: 'B', weight: 4 },
    { from: 'B', to: 'C', weight: 2 },
  ],
  directed: true,
  highlights: { A: 'active', B: 'frontier', C: 'default' },
  edgeHi:    { 'A-B': 'active', 'B-C': 'path' },
  distances:  { A: 0, B: 4, C: 6 },     // Dijkstra distance labels
  visited:    ['A'],
  queue:      ['B', 'C'],
  narration:  'Processing A — relaxing neighbors',
});
```

**Node states:** `active` (blue pulse) | `frontier` (yellow) | `visited` (green) | `path` (purple) | `error` (red)

**Edge states:** `active` (animated blink) | `path` (gold) | `rejected` (red dashed)

**When to use:**
- BFS/DFS with visited + queue/stack panels
- Dijkstra (distance labels below nodes)
- Topo sort (show in-degree, fade processed nodes)
- Union-Find (show components as clusters)
- Number of Islands (use DSAViz.matrix instead for grid)

---

### C4 · `DSAViz.matrix` — 2D Grid / Islands / Path Finding
**File:** `dsa-viz-matrix.js`

```js
DSAViz.matrix.render(mountEl, {
  grid: [
    [1, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  highlights: {
    '0,0': 'visited', '0,1': 'visited',
    '1,0': 'active',
  },
  pointer: { r: 1, c: 0 },      // shows ▼ cursor on cell
  rowLabels: ['r=0','r=1','r=2'],
  colLabels: ['c=0','c=1','c=2'],
  showCoords: true,              // tooltip shows [r,c]=val
  narration: 'BFS from (1,0) — checking neighbors',
});
```

**States:** `active` (blue pulse) | `visited` (purple) | `path` (gold) | `wall` (dark, blocked) | `success` (green) | `error` (red)

**When to use:**
- Number of Islands / Flood Fill (highlight visited cells)
- 2D DP table (use `DSAViz.dp.table2D` which wraps this)
- Shortest path in grid (BFS, highlight path)
- Sudoku / N-Queens (show board state)
- Rotting Oranges (time-step animation)

---

### C5 · `DSAViz.dp` — DP Tables + Recursion Trees
**File:** `dsa-viz-dp.js`

```js
// 1D DP (e.g. Fibonacci, Climb Stairs, Coin Change)
DSAViz.dp.table1D(mountEl, {
  dp: [0, 1, 1, 2, 3, 5, 8, 13],
  indices: ['0','1','2','3','4','5','6','7'],
  highlights: { 6: 'current', 4: 'source', 5: 'source' },
  pointer: 6,
  formula: 'dp[i] = dp[i-1] + dp[i-2]',
  narration: 'Computing dp[6] = dp[5] + dp[4] = 5 + 3 = 8',
});

// 2D DP (e.g. LCS, Edit Distance, Knapsack)
DSAViz.dp.table2D(mountEl, {
  dp: [
    [0,0,0,0],
    [0,1,1,1],
    [0,1,1,2],
  ],
  rowLabels: ['','A','B'],
  colLabels:  ['','C','B','A'],
  highlights: { '2,3': 'current', '1,2': 'source', '2,2': 'source' },
  narration: 'LCS("AB","CBA") cell [2,3]',
});

// Recursion tree with memo hits
DSAViz.dp.memoTree(mountEl, {
  root: { val:'fib(5)', left:{ val:'fib(4)', left:{val:'fib(3)'},right:{val:'fib(2)'} }, right:{ val:'fib(3)' } },
  highlights: { 'fib(3)': 'memo' },   // 'memo' = cache hit (gold star)
  narration: 'fib(3) already computed — skip (memo hit)',
});

// Animated sequence of any of the above
const ctrl = DSAViz.dp.animate(mountEl, [
  { _type: 'table1D', dp:[0,1], pointer:1, narration:'Base case' },
  { _type: 'table1D', dp:[0,1,1], pointer:2, narration:'dp[2]=1' },
]);
```

**1D states:** `current` (cursor blue) | `source` (yellow, dependency) | `memo` (purple star) | `filled` (green done) | `empty` (dark, not yet)

**When to use:**
- Any 1D DP (coin change, house robber, jump game)
- Any 2D DP (edit distance, LCS, unique paths, knapsack)
- Recursion tree to show why naive is O(2ⁿ) vs memoized O(n)

---

### C6 · `DSAViz.string` — String / Pointer / Window
**File:** `dsa-viz-string.js`

```js
// Single string with pointer + window
DSAViz.string.render(mountEl, {
  str: 'abcabcbb',
  highlights: { 0:'match', 1:'match', 2:'match', 3:'mismatch' },
  pointers: { L: 0, R: 3 },
  window:   { l: 0, r: 2 },
  narration: 'Window "abc" — R hit duplicate "a", shrink left',
});

// Two strings compare (LCS / edit distance)
DSAViz.string.compare(mountEl, {
  strA: 'ABCBDAB',
  strB: 'BDCAB',
  ptrA: 2,          // current index in strA (shown as 'i' pointer)
  ptrB: 1,          // current index in strB (shown as 'j' pointer)
  hiA:  { 0:'match', 1:'match' },
  hiB:  { 3:'match', 4:'match' },
  matchMap: [[0,3],[1,4]],   // draw match lines
  narration: 'Match found: A[2]=C vs B[1]=D — mismatch, recurse',
  labelA: 'Text (A)',
  labelB: 'Pattern (B)',
});

// Animated
const ctrl = DSAViz.string.animate(mountEl, steps);
// steps with _type: 'compare' use the two-string view, else single string
```

**States:** `match` (green) | `mismatch` (red) | `active` (blue pointer) | `warn` (yellow) | `skip` (dim gray)

**When to use:**
- Sliding window on string (longest no-repeat, min window substring)
- Two pointer (valid palindrome, reverse words)
- Pattern matching (KMP, Rabin-Karp — highlight match/mismatch per char)
- LCS / edit distance (compare view with match lines)
- Anagram detection (show char frequency map alongside)

---

### C7 · `DSAViz.core` — Shared Utilities
**File:** `dsa-viz-core.js` (always load first)

```js
// Step controller
const ctrl = DSAViz.makeStepCtrl(steps, (step, idx, total) => {
  /* render step */ 
});
ctrl.play(); ctrl.stop(); ctrl.step(); ctrl.prev(); ctrl.reset(); ctrl.goto(3);

// Control bar (returns DOM element with buttons + speed selector)
const bar = DSAViz.makeControlBar(ctrl);
mount.appendChild(bar);

// Narration bar
const nar = DSAViz.makeNarration('Initial text');
nar.update('New message', '#56d364'); // second arg = border color
mount.appendChild(nar);

// Complexity badge
const badge = DSAViz.makeComplexityBadge('O(n)', 'O(1)');
mount.appendChild(badge);

// Flash a cell
DSAViz.flash(el, '#e3b341', 400);

// Typewriter effect on narration
DSAViz.typewrite(narEl, 'Now doing X because Y...', 25);

// SVG helpers
const svg = DSAViz.makeSVG(500, 300);
const circle = DSAViz.svgEl('circle', { cx: 50, cy: 50, r: 20, fill: '#1f6feb' });
DSAViz.svgArrow(svg, x1, y1, x2, y2, '#e3b341', 'label', false);
DSAViz.ensureArrowMarker(svg, '#e3b341');

// Container builder (clears mount, sets dark bg)
const container = DSAViz.makeContainer(mountEl, 'My Title');
```

**Color constants:** `DSAViz.C.active`, `.success`, `.error`, `.warn`, `.ptr`, `.compare`, `.swap`, etc.

---

### Component Quick-Select Table

| Problem Type | Component | Key Config |
|---|---|---|
| Array traversal | `array.render` | `highlights`, `pointers` |
| Sliding window | `array.render` | `window:{l,r}`, `pointers:{L,R}` |
| Two pointers | `array.render` | `pointers:{L,R}`, `compare` state |
| Sorting (swap) | `array.animate` | `swap`/`compare` states per step |
| Binary search | `array.animate` | `pointers:{lo,mid,hi}` |
| BST / heap | `tree.render` | `highlights`, `path` |
| DFS tree | `tree.animate` | `stack:[]`, `visited` state |
| BFS tree | `tree.animate` | `queue:[]`, `frontier` state |
| Recursion memo | `dp.memoTree` | `highlights:{val:'memo'}` |
| Graph BFS/DFS | `graph.animate` | `visited`, `queue`/`stack` panels |
| Dijkstra | `graph.animate` | `distances`, `edgeHi:{:'path'}` |
| Islands/grid | `matrix.animate` | `highlights:{r,c:'visited'}` |
| 2D path | `matrix.animate` | `pointer:{r,c}`, `path` state |
| 1D DP | `dp.table1D` | `pointer`, `formula`, `source` state |
| 2D DP | `dp.table2D` | `highlights`, `arrows` |
| String window | `string.render` | `window`, `pointers:{L,R}` |
| LCS / edit dist | `string.compare` | `matchMap`, `ptrA`, `ptrB` |

---

## COLOR PALETTES

### P1 · Dark GitHub (default)
```css
--bg:       #161b22;
--surface:  #21262d;
--border:   #30363d;
--text:     #cdd9e5;
--muted:    #768390;
--active:   #1f6feb;
--success:  #238636;
--error:    #da3633;
--warning:  #d29922;
--accent:   #8957e5;
```

### P2 · ByteByteGo Dark (diagrams + flows)
```css
--bg:       #0d1117;
--surface:  #161b22;
--border:   #21262d;
--node-a:   #58a6ff;   /* primary node */
--node-b:   #f78166;   /* secondary node */
--node-c:   #56d364;   /* success node */
--arrow:    #e3b341;   /* flow arrow */
--label:    #ffffff;
--inactive: #484f58;
```

### P3 · Miro Canvas (whiteboard art)
```css
--bg:       #f2f3f5;
--card:     #ffffff;
--border:   #d5d9e0;
--text:     #1a1a2e;
--sticky-y: #fff9c4;
--sticky-b: #bbdefb;
--sticky-g: #c8e6c9;
--sticky-r: #ffcdd2;
--arrow:    #4a4e69;
--active:   #0c7ff2;
```

### P4 · Brilliant.org (education interactive)
```css
--bg:       #1b1f3b;
--surface:  #252a4a;
--border:   #3d4468;
--text:     #e8eaf6;
--primary:  #7c4dff;
--secondary:#00bcd4;
--success:  #69f0ae;
--error:    #ff5252;
--highlight:#ffd740;
```

### P5 · Terminal / Matrix
```css
--bg:       #0a0a0a;
--surface:  #111111;
--text:     #00ff41;
--dim:      #003b00;
--cursor:   #00ff41;
--error:    #ff0000;
--warn:     #ffff00;
--border:   #1a1a1a;
```

---

## TYPOGRAPHY

### Fonts (load via Google Fonts or system)
```css
/* Code + visuals */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* Labels + narration */
font-family: 'Inter', 'DM Sans', 'Nunito', system-ui, sans-serif;

/* Headers + titles */
font-family: 'Space Grotesk', 'Outfit', 'Sora', sans-serif;

/* 8th-grade friendly (rounder, approachable) */
font-family: 'Nunito', 'Quicksand', 'Baloo 2', sans-serif;
```

### Font Scale
```css
--text-xs:   11px;   /* tooltip fine print */
--text-sm:   13px;   /* code inside nodes */
--text-base: 15px;   /* body / narration */
--text-lg:   17px;   /* section labels */
--text-xl:   20px;   /* tab titles */
--text-2xl:  24px;   /* topic headers */
--line-height: 1.6;
--letter-spacing-label: 0.04em;
```

---

## ANIMATION STYLES

### A1 · Pulse Highlight (node attention)
```css
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(88,166,255,0.6); }
  70%  { box-shadow: 0 0 0 10px rgba(88,166,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(88,166,255,0); }
}
.pulse { animation: pulse-ring 1.2s ease-out infinite; }
```

### A2 · Flow Arrow (message passing)
```css
@keyframes flow-dash {
  to { stroke-dashoffset: -20; }
}
.flow-line {
  stroke-dasharray: 8 4;
  animation: flow-dash 0.6s linear infinite;
}
```

### A3 · Packet Travel (ByteByteGo style — JS)
```js
function animatePacket(svgEl, fromEl, toEl, color = '#e3b341', duration = 800) {
  const f = fromEl.getBoundingClientRect();
  const t = toEl.getBoundingClientRect();
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', 6); dot.setAttribute('fill', color);
  svgEl.appendChild(dot);
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    dot.setAttribute('cx', f.x + (t.x - f.x) * p);
    dot.setAttribute('cy', f.y + (t.y - f.y) * p);
    if (p < 1) requestAnimationFrame(step);
    else dot.remove();
  }
  requestAnimationFrame(step);
}
```

### A4 · Typewriter (narration bar)
```js
function typewriter(el, text, speed = 30) {
  el.textContent = '';
  let i = 0;
  const t = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(t);
  }, speed);
}
```

### A5 · Fade + Slide In (step reveal)
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.step-reveal { animation: slide-up 0.35s ease forwards; }
```

### A6 · State Flash (color change on event)
```js
function flashState(el, color = '#e3b341', duration = 600) {
  const orig = el.style.background;
  el.style.transition = 'background 0.15s';
  el.style.background = color;
  setTimeout(() => { el.style.background = orig; }, duration);
}
```

### A7 · Shake (error state)
```css
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
.error-shake { animation: shake 0.4s ease; }
```

### A8 · Progress Bar (step counter)
```css
.progress-bar {
  height: 3px; background: #30363d; border-radius: 2px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: #1f6feb;
  transition: width 0.3s ease;
}
```

### A9 · Confetti Burst (success moment — JS)
```js
function confettiBurst(x, y, colors = ['#58a6ff','#56d364','#e3b341','#f78166']) {
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;width:8px;height:8px;border-radius:50%;
      background:${colors[i%colors.length]};left:${x}px;top:${y}px;
      pointer-events:none;z-index:9999;transition:all 0.8s ease;`;
    document.body.appendChild(el);
    const angle = (i / 20) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    setTimeout(() => {
      el.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
      el.style.opacity = '0';
    }, 10);
    setTimeout(() => el.remove(), 900);
  }
}
```

### A10 · Connection Line Draw (SVG path animate)
```css
.draw-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw 0.8s ease forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

### A11 · Floating Label (tooltip on hover)
```css
.tooltip-wrap { position: relative; }
.tooltip-wrap:hover .tooltip { opacity: 1; transform: translateY(-4px); }
.tooltip {
  position: absolute; bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%) translateY(0);
  background: #21262d; border: 1px solid #30363d;
  color: #cdd9e5; font-size: 12px; padding: 6px 10px;
  border-radius: 6px; white-space: nowrap; opacity: 0;
  transition: all 0.2s; pointer-events: none; z-index: 100;
}
```

### A12 · Breathing Glow (idle node / loading)
```css
@keyframes breathe {
  0%,100% { box-shadow: 0 0 4px 1px rgba(88,166,255,0.3); }
  50%      { box-shadow: 0 0 16px 4px rgba(88,166,255,0.7); }
}
.breathing { animation: breathe 2s ease-in-out infinite; }
```

---

## UML DIAGRAM STYLES

### U1 · Class Diagram (HTML/CSS)
```
┌─────────────────────┐
│  «class»            │  ← stereotype chip
│  ClassName          │  ← bold, centered
├─────────────────────┤
│ - field: Type       │  ← private=red dot
│ + field: Type       │  ← public=green dot
│ # field: Type       │  ← protected=yellow dot
├─────────────────────┤
│ + method(): Type    │  ← methods section
│ - helper(): void    │
└─────────────────────┘
```
**Arrows (SVG):**
- Inheritance: solid line + hollow triangle (↑ unfilled)
- Implementation: dashed line + hollow triangle
- Association: solid line + open arrowhead →
- Composition: solid line + filled diamond ◆
- Aggregation: solid line + hollow diamond ◇
- Dependency: dashed line + open arrowhead

### U2 · Sequence Diagram Layout
```
Actor   :ServiceA   :ServiceB   :DB
  |         |           |         |
  |──req──▶ |           |         |
  |         |──call───▶ |         |
  |         |           |──query─▶|
  |         |           |◀─result─|
  |         |◀──resp────|         |
  |◀──res── |           |         |
```
Lifelines = vertical dashed lines. Activation = narrow filled rect on lifeline. Messages = horizontal arrows with label.

### U3 · State Machine (colored boxes)
```
[IDLE] ──event──▶ [RUNNING] ──done──▶ [COMPLETED]
                      │
                  error│
                      ▼
                  [FAILED] ──retry──▶ [RUNNING]
```
State boxes: rounded rect, color = state type. Transitions = labeled arrows. Current state = pulse animation (A1).

### U4 · ER Diagram
```
┌──────────┐         ┌──────────┐
│  User    │──1:N──▶│  Order   │
│──────────│         │──────────│
│ id PK    │         │ id PK    │
│ name     │         │ userId FK│
│ email    │         │ total    │
└──────────┘         └──────────┘
```

### U5 · Component / Deployment
```
┌─────────────────────────────┐
│  <<component>> Frontend     │
│  ┌──────┐    ┌──────────┐  │
│  │ UI   │───▶│ API Svc  │  │
│  └──────┘    └──────────┘  │
└──────────────────┬──────────┘
                   │ HTTP
                   ▼
         ┌──────────────────┐
         │  <<component>>   │
         │  Backend Service │
         └──────────────────┘
```

---

## INTERACTION PATTERNS

### I1 · Step Controller (standard)
```js
const ctrl = {
  steps: [], current: -1, timer: null,
  step() { if (this.current < this.steps.length-1) this.render(++this.current); },
  prev() { if (this.current > 0) this.render(--this.current); },
  play(delay=1200) { this.timer = setInterval(() => { if(this.current >= this.steps.length-1) this.stop(); else this.step(); }, delay); },
  stop() { clearInterval(this.timer); this.timer = null; },
  reset() { this.stop(); this.current = -1; this.render(0); },
  render(i) { /* implement per topic */ }
};
```

### I2 · Drag to Connect (graph building)
- mousedown on node → start drag
- mousemove → draw temporary arrow from source
- mouseup on target → create edge
- Store edges as `[{from, to, label}]` array

### I3 · Click to Reveal (interview mode)
```js
function makeRevealCard(question, answer) {
  const card = document.createElement('div');
  card.className = 'reveal-card';
  card.innerHTML = `<div class="q">${question}</div><div class="a hidden">${answer}</div>`;
  card.querySelector('.q').onclick = () => card.querySelector('.a').classList.toggle('hidden');
  return card;
}
```

### I4 · Slider (input→visual sync)
```html
<input type="range" min="1" max="100" id="nSlider">
<span id="nVal">50</span>
```
```js
document.getElementById('nSlider').addEventListener('input', e => {
  document.getElementById('nVal').textContent = e.target.value;
  redrawVisual(+e.target.value);
});
```

### I5 · Comparison Toggle (A vs B)
```js
function makeToggle(labelA, labelB, renderFn) {
  let mode = 'A';
  const btn = document.createElement('button');
  btn.textContent = `Showing: ${labelA}`;
  btn.onclick = () => { mode = mode === 'A' ? 'B' : 'A'; btn.textContent = `Showing: ${mode === 'A' ? labelA : labelB}`; renderFn(mode); };
  return btn;
}
```

### I6 · Speed Control (playback rate)
```html
<select id="speed">
  <option value="2000">Slow</option>
  <option value="1200" selected>Normal</option>
  <option value="600">Fast</option>
  <option value="200">Turbo</option>
</select>
```

---

## LAYOUT PATTERNS

### L1 · Code + Visual + Info (DSA Trinity)
```
┌──────────────────┬──────────────────┬─────────────┐
│  CODE            │  VISUAL STATE    │  COMPLEXITY │
│  14px mono       │  SVG / canvas    │  ops count  │
│  current line ▶  │  colored nodes   │  O(n) live  │
└──────────────────┴──────────────────┴─────────────┘
│  NARRATION BAR — full sentence, plain English      │
└────────────────────────────────────────────────────┘
```

### L2 · Split Compare (wrong vs correct)
```
┌────────────────────┬────────────────────┐
│  ❌ WRONG          │  ✅ CORRECT         │
│  red border        │  green border       │
│  code + output     │  code + output      │
│  "why wrong" text  │  "why right" text   │
└────────────────────┴────────────────────┘
```

### L3 · Miro Board (sticky note cluster)
```
 [sticky A]    [sticky B]    [sticky C]
      \              |             /
       └─────── [central concept] ─────
                     |
              [detail sticky D]
```
Stickies = colored div cards with slight rotation + drop-shadow.

### L4 · Timeline Flow (sequence of events)
```
●────────●────────●────────●────────●
t=0     t=1      t=2      t=3      t=4
START   ACTION   RESULT   EDGE     END
```
Active step = filled circle, bigger. Past = muted. Future = empty circle.

### L5 · Card Grid (concepts overview)
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  icon    │ │  icon    │ │  icon    │
│  title   │ │  title   │ │  title   │
│  1-line  │ │  1-line  │ │  1-line  │
└──────────┘ └──────────┘ └──────────┘
```
Click card → expand to full visual. 3-column grid, responsive.

---

## DYNAMIC SIMULATION STYLES

### S1 · Particle Flow (network traffic)
Dots travel along paths (SVG). Count = throughput. Dot color = packet type. Stack at bottleneck = congestion visual.

### S2 · Queue Fill Animation
Bar grows left→right as items enqueue. Items pop from left with bounce. Overflow = red flash (A7 shake).

### S3 · Thread Pool Simulation
N worker boxes. Jobs = colored tickets arriving from top. Worker grabs ticket → turns orange → completes → green → idle. Queue visible. Rejection when full = red bounce.

### S4 · Memory Grid (heap/stack)
Grid of cells. Allocated = colored + label. Freed = gray fade. GC sweep = scanner line moves across, dead cells fade to black.

### S5 · Hash Table Animation
Show array of buckets. Insert key → compute hash → highlight bucket → add entry. Collision → chain grows. Load factor meter fills. At 0.75 → resize animation (new bigger array, rehash all).

### S6 · Tree Traversal
Node circles + edge lines. DFS: stack on side, nodes highlight in order, backtrack dims. BFS: queue on side, level-by-level color wave.

### S7 · Lock / Monitor
Shared resource box in center. Threads = circles approaching. One grabs lock (box border turns orange, 🔒 appears). Others stack in waiting room. Release = next thread enters. Deadlock = two threads each holding one, arrows circling.

### S8 · Kafka/Queue Broker
Producer → broker box with partition lanes → consumers pulling. Messages = dots. Offset pointer moves per consumer. Lag = gap between producer front and consumer position.

---

## DESIGN PATTERNS (Visual Metaphors)

| Pattern | Kid Analogy | Visual |
|---------|------------|--------|
| Singleton | One school principal | Single box, arrows from all pointing to it |
| Factory | Cookie cutter → different cookies | Cutter box → colored cookie shapes |
| Observer | Group chat notification | Central circle → arrows out to subscribers |
| Strategy | Choose game controller | Swap plugin block at runtime |
| Decorator | Wrap gift with bows | Nested boxes each adding layer |
| Command | TV remote button | Button → command object → receiver |
| Builder | Subway sandwich step-by-step | Sequential ingredient add animation |
| Adapter | Power plug converter | Incompatible shapes joined by middle block |
| Proxy | School secretary as gatekeeper | Request hits proxy box first → decides |

---

## JAVA UML QUICK REFERENCE

### Object Lifecycle (animate each arrow)
```
new ──▶ [heap alloc] ──▶ [constructor] ──▶ [ACTIVE]
                                               │
                                         null ref / out of scope
                                               │
                                               ▼
                                        [GC eligible] ──▶ [finalize?] ──▶ [collected]
```

### Thread State Machine
```
[NEW] ──start()──▶ [RUNNABLE] ──scheduled──▶ [RUNNING]
                       ▲                          │
                       │ notify/interrupt     sleep/wait/IO
                       │                          │
                  [BLOCKED] ◀──────────── [WAITING/TIMED_WAIT]
                                                  │
                                             [TERMINATED]
```

### JVM Memory Zones (animated boxes)
```
┌─ Metaspace ────────┐   ┌─ Heap ─────────────────────────┐
│ Class bytecode      │   │ Young Gen     │   Old Gen       │
│ Method metadata     │   │ Eden│S0│S1   │  Tenured        │
└────────────────────┘   └───────────────────────────────-─┘
┌─ Stack (per thread) ┐
│ Frame → Frame → ... │   ← each method call = new frame
└─────────────────────┘
```

### Exception Flow
```
try block ──throws──▶ matching catch? ──yes──▶ catch block ──▶ finally ──▶ continue
                           │
                           no
                           ▼
                    unwind call stack ──▶ next frame catch? ──▶ ... ──▶ JVM prints stacktrace
```

---

## COMPONENT TEMPLATES

### Narration Bar
```html
<div class="narration-bar" id="narration">
  <!-- filled by typewriter(el, text) per step -->
</div>
```
```css
.narration-bar {
  background: #21262d; border-left: 3px solid #1f6feb;
  padding: 10px 14px; font-size: 14px; color: #cdd9e5;
  font-family: 'Nunito', sans-serif; border-radius: 0 6px 6px 0;
  min-height: 40px; margin: 8px 0;
}
```

### State Badge
```html
<span class="badge badge-active">RUNNING</span>
<span class="badge badge-success">DONE</span>
<span class="badge badge-error">FAILED</span>
<span class="badge badge-wait">WAITING</span>
```
```css
.badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
.badge-active  { background: #1f3a5f; color: #58a6ff; border: 1px solid #1f6feb; }
.badge-success { background: #0d2818; color: #56d364; border: 1px solid #238636; }
.badge-error   { background: #2d0f0f; color: #f78166; border: 1px solid #da3633; }
.badge-wait    { background: #272012; color: #e3b341; border: 1px solid #d29922; }
```

### Code Highlight Block (step-synced)
```css
.code-block { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; overflow: auto; }
.code-line { padding: 1px 6px; border-radius: 3px; transition: background 0.2s; }
.code-line.active { background: #1f3a5f; border-left: 2px solid #58a6ff; }
.code-line.error  { background: #2d0f0f; border-left: 2px solid #da3633; }
```

### Control Bar
```html
<div class="ctrl-bar">
  <button onclick="ctrl.prev()">◀ Prev</button>
  <button onclick="ctrl.play()">▶ Play</button>
  <button onclick="ctrl.stop()">⏸ Pause</button>
  <button onclick="ctrl.reset()">↺ Reset</button>
  <select onchange="ctrl.setSpeed(+this.value)">
    <option value="2000">Slow</option>
    <option value="1200" selected>Normal</option>
    <option value="500">Fast</option>
  </select>
  <span class="step-counter" id="stepCtr">Step 0 / N</span>
</div>
```
```css
.ctrl-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 8px 0; }
.ctrl-bar button { background: #21262d; color: #cdd9e5; border: 1px solid #30363d; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.ctrl-bar button:hover { background: #30363d; }
.step-counter { margin-left: auto; font-size: 12px; color: #768390; font-family: monospace; }
```
