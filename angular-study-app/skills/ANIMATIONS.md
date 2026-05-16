# Animation Engines Reference

All animation engines in this project. Use these before building anything new.

---

## 1. DSAViz Engine (`src/shared/dsa-viz/`)

Core tracer-based system for algorithm visualization.

### Files

| File | Exposes | Purpose |
|------|---------|---------|
| `dsa-viz-core.js` | `window.DSAViz` namespace | Base namespace |
| `dsa-viz-tracer.js` | `DSAViz.tracer.run(code, opts)` | Executes JS code, captures variable/array snapshots |
| `dsa-viz-runtime.js` | `DSAViz.runtime.create(mount, opts)` | 3-panel layout: code \| viz \| controls |
| `dsa-viz-array.js` | `DSAViz.array.*` | Array cell rendering, pointers, windows |
| `dsa-viz-graph.js` | `DSAViz.graph.*` | Graph node/edge SVG rendering |
| `dsa-viz-tree.js` | `DSAViz.tree.*` | Binary tree rendering |
| `dsa-viz-dp.js` | `DSAViz.dp.*` | DP table (1D/2D) rendering |
| `dsa-viz-matrix.js` | `DSAViz.matrix.*` | Grid/matrix rendering |
| `dsa-viz-string.js` | `DSAViz.string.*` | String character visualization |
| `dsa-viz-topic-render.js` | `DSAViz.topic.render(mount, opts)` | Simple helper: render without OOP |

### DSAViz.tracer.run(code, opts)

```js
const steps = DSAViz.tracer.run(code, {
  arrays: {
    arr:    true,   // capture this array name
    nums:   true,
    result: true,
  },
  vars: ['i', 'j', 'left', 'right', 'sum', 'result'],
});
// returns: [{ line, variables, arrays, codeLine, ... }, ...]
```

### DSAViz.runtime.create(mount, opts)

```js
const rt = DSAViz.runtime.create(mount, {
  title:           'sliding.maxSumFixed',
  code:            `function maxSum(arr, k) { ... }`,  // populates code panel
  timeComplexity:  'O(n)',
  spaceComplexity: 'O(1)',
});
rt.animate(steps);
```

**Layout:** left column = code panel (top) + narration + tabs / right column = viz panel (full height)

### DSAViz.topic.render(mount, opts)

```js
DSAViz.topic.render(mount, {
  title: 'myAlgo',
  time:  'O(n)',
  space: 'O(1)',
  code:  `function myAlgo(arr) { ... }\nconst result = myAlgo([1,2,3]);`,
  tracer: { arrays: { arr: true }, vars: ['i', 'sum'] },
});
```

Use when you don't need the OOP template pattern.

---

## 2. DSA OOP Layer (`src/shared/dsa-viz/models/` + `templates/`)

OOP base classes that use DSAViz tracer internally.

### DSAProblem (base class)

**File:** `src/shared/dsa-viz/models/dsa-problem.model.js`
**Exposes:** `window.DSA.Problem`

```js
class MyProblem extends window.DSA.Problem {
  getPatternLabel() { return 'My Pattern'; }
  getTracerOpts()   { return { arrays: {arr: true}, vars: ['i','sum'] }; }
  postProcess(steps) {
    return steps.map(step => {
      if (!step.phase) step.phase = 'scan';
      return step;
    });
  }
}
```

Usage in `visual(mount)`:
```js
new MyProblem(mount, {
  title: 'myAlgo',
  time:  'O(n)',
  space: 'O(1)',
  code:  `...algorithm code...\nconst result = myAlgo(arr);`,
}).render();
```

### DSAStep

**File:** `src/shared/dsa-viz/models/dsa-step.model.js`
**Exposes:** `window.DSA.Step`

Fields: `line, variables, arrays, highlight, pointers, windowRange, phase, codeLine, narration, timeLabel, ops`

```js
DSA.Step.fromTracer(rawStep)   // convert tracer output
step.with({ phase: 'found' })  // immutable update
```

### Template Subclasses

| Class | File | Pattern | Default vars watched |
|-------|------|---------|---------------------|
| `DSA.SlidingWindowProblem` | `sliding-window.template.js` | Sliding Window | left, right, windowSum, maxLen, k, i |
| `DSA.TwoPointerProblem` | `two-pointer.template.js` | Two Pointer | left, right, slow, fast, lo, hi |
| `DSA.BinarySearchProblem` | `binary-search.template.js` | Binary Search | lo, hi, mid |
| `DSA.DPProblem` | `dp-problem.template.js` | Dynamic Programming | dp[], memo, coins, nums |
| `DSA.GraphProblem` | `graph-problem.template.js` | Graph BFS/DFS | queue, visited, path, dist |
| `DSA.StackProblem` | `stack-problem.template.js` | Monotonic Stack | stack, heights, temps |
| `DSA.BacktrackingProblem` | `backtracking.template.js` | Backtracking | current, path, results |
| `DSA.GreedyProblem` | `greedy-problem.template.js` | Greedy | activities, jobs, selected |

### Phase Labels (used in postProcess)

- Sliding Window: `expand`, `shrink`, `found`, `scan`
- Two Pointer: `move-left`, `move-right`, `found`, `scan`
- Binary Search: `go-left`, `go-right`, `found`, `midpoint`
- DP: `base`, `fill`, `compute`, `done`
- Graph: `enqueue`, `dequeue`, `visit`, `relax`, `found`
- Stack: `push`, `pop`, `compute`, `match`
- Backtracking: `choose`, `backtrack`, `found`, `recurse`
- Greedy: `sort`, `select`, `skip`, `done`

---

## 3. DSA Animation Utilities (`src/shared/dsa-viz/animations/`)

Lower-level renderers called inside `renderStep` or template `postProcess`.

### DSA.ArrayAnimation

**File:** `src/shared/dsa-viz/animations/array.animation.js`

```js
// Render colored array cells
DSA.ArrayAnimation.render(el, arr, opts);

// Opts helpers:
DSA.ArrayAnimation.windowOpts(left, right, '#58a6ff')   // highlight window
DSA.ArrayAnimation.twoPointerOpts(leftIdx, rightIdx)     // L=yellow, R=orange
DSA.ArrayAnimation.binarySearchOpts(lo, mid, hi)         // lo/mid/hi
DSA.ArrayAnimation.visitedOpts(visitedIndices)            // dim visited
DSA.ArrayAnimation.renderStack(el, stack)                 // vertical stack viz
```

### DSA.GraphAnimation

**File:** `src/shared/dsa-viz/animations/graph.animation.js`

```js
// Render SVG graph with node-edge diagram
DSA.GraphAnimation.render(el, graph, state);
// graph = { nodes: [{id, label}], edges: [{from, to, weight}] }
// state = { visited: Set, visiting: Set, path: [], queue: [] }

// Extract state from tracer step
DSA.GraphAnimation.stateFromStep(step);
```

Node colors: unvisited=gray, visiting=blue, visited=green, path=orange, queue=purple

### DSA.DPAnimation

**File:** `src/shared/dsa-viz/animations/dp.animation.js`

```js
// 1D dp array
DSA.DPAnimation.render1D(el, dp, { current, sources, result });

// 2D dp table (LCS, edit distance)
DSA.DPAnimation.render2D(el, dp, { currentCell, rowLabels, colLabels });

// Memoization cache chips
DSA.DPAnimation.renderMemo(el, memo, currentKey);
```

---

## 4. ReactViz Engine (`src/shared/react-viz/`)

Pre-defined step animation system for React concept visualizations.
No code tracer — steps are hand-defined in each topic file.

### Files

| File | Exposes | Purpose |
|------|---------|---------|
| `react-viz-core.js` | `window.ReactViz` | Panel engine, play/pause, CSS |
| `animations/component-tree.animation.js` | `ReactViz.ComponentTree` | React component hierarchy |
| `animations/hook-timeline.animation.js` | `ReactViz.HookTimeline` | Hook call order grid |
| `animations/fiber.animation.js` | `ReactViz.FiberTree` | Fiber work loop tree |
| `animations/flow-diagram.animation.js` | `ReactViz.FlowDiagram` | Architecture flow (Redux, RSC, etc.) |

### ReactViz.panel(mount, opts)

```js
ReactViz.panel(mount, {
  title: 'useState & useEffect Lifecycle',
  time:  'O(1) render',
  space: 'O(h) hook list',
  steps: [
    {
      phase: 'render',              // controls color of phase badge
      narration: 'Step 1 — ...',   // shown in narration bar
      // any custom fields your renderStep needs:
      tree: { ... },
      code: `...`,
      hooks: [ ... ],
    },
    // more steps...
  ],
  renderStep: function(vizEl, codeEl, step, stepIndex) {
    // vizEl = right column (visualization)
    // codeEl = left column (code/details)
    ReactViz.ComponentTree.render(vizEl, step.tree);
    codeEl.innerHTML = ReactViz.label('CODE') + ReactViz.codeBlock(step.code);
  },
});
```

**Phase colors:**
| Phase | Color |
|-------|-------|
| render | #58a6ff (blue) |
| commit | #ffa657 (orange) |
| effect | #3fb950 (green) |
| cleanup | #d2a8ff (purple) |
| update | #f0883e (orange-red) |
| unmount | #f85149 (red) |
| suspend | #d2a8ff (purple) |
| resolve | #3fb950 (green) |
| idle | #768390 (gray) |

### ReactViz.ComponentTree.render(el, tree)

```js
ReactViz.ComponentTree.render(el, {
  name: 'App',
  type: 'component',         // 'component'|'dom'|'memo'|'context'|'provider'|'suspense'
  state: { count: 0, data: null },
  props: { onClick: 'fn' },
  rerender: true,            // shows orange "re-render" badge + glow
  skipped: true,             // dims to 55% + shows "skipped" badge
  children: [
    { name: 'Header', type: 'memo', skipped: true },
    { name: 'UserList', type: 'component', rerender: true,
      props: { items: '[...]' } },
  ],
});
```

### ReactViz.HookTimeline.render(el, hooks, renderPhase, renderNum)

```js
ReactViz.HookTimeline.render(el, [
  { name: 'useState', label: 'count', value: 0, active: true, phase: 'render' },
  { name: 'useEffect', label: 'title', active: false, phase: 'idle', deps: ['count'] },
  { name: 'useMemo', label: 'sorted', active: false, phase: 'idle', deps: ['items'] },
], 'render', 1);
// renderPhase: 'render'|'commit'|'effect'|'cleanup'
// renderNum: which render cycle (1, 2, 3...)
```

Hook name colors: useState=#58a6ff, useEffect=#3fb950, useMemo=#d2a8ff, useCallback=#ffa657, useRef=#79c0ff, useContext=#f0883e

### ReactViz.FiberTree.render(el, fiberTree, phase, currentFiberName)

```js
ReactViz.FiberTree.render(el, {
  tag: 'HostRoot', name: 'Root', state: 'idle',
  children: [
    {
      tag: 'FunctionComponent', name: 'App', state: 'beginWork',
      children: [
        { tag: 'HostComponent', name: 'div', state: 'idle',
          effectTag: 'UPDATE',
          children: [
            { tag: 'HostComponent', name: 'h1', state: 'completeWork' },
          ]
        }
      ]
    }
  ]
}, 'beginWork', 'App');
// Fiber states: 'idle'|'beginWork'|'completeWork'|'commit'|'skip'|'error'
// currentFiberName: highlights this fiber with glow border
```

State colors: idle=gray, beginWork=blue, completeWork=green, commit=orange, skip=dimmed, error=red

### ReactViz.FlowDiagram.render(el, nodes, edges, opts)

```js
ReactViz.FlowDiagram.render(el, [
  { id: 'store', label: 'Redux Store', sublabel: '{ count: 5 }', type: 'store', active: true },
  { id: 'comp',  label: 'Counter', sublabel: 'useSelector', type: 'component', active: true },
  { id: 'dim',   label: 'UserList', type: 'component', dim: true },
], [
  { from: 'store', to: 'comp', label: 'value', active: true, color: '#3fb950' },
], { layout: 'vertical' }); // 'vertical'|'horizontal'|'grid'
```

Node type colors:
| Type | Color |
|------|-------|
| component | #58a6ff (blue) |
| store | #ffa657 (orange) |
| action | #3fb950 (green) |
| reducer | #f85149 (red) |
| selector | #d2a8ff (purple) |
| server | #3fb950 (green) |
| client | #58a6ff (blue) |
| network | #768390 (gray) |
| cache | #ffa657 (orange) |
| context | #d2a8ff (purple) |
| hook | #79c0ff (light blue) |

### ReactViz Utility Functions

```js
ReactViz.esc(str)             // HTML escape
ReactViz.codeBlock(code)      // styled <pre> block, JetBrains Mono, 12px
ReactViz.label(text)          // section header label (10px, uppercase, gray)
ReactViz.pill(label, color)   // colored badge pill
```

---

## 5. Legacy Simple Animations (in topic files)

Some older topic files (sysdesign, kafka, microservices) use inline HTML/CSS animations.
These are self-contained inside the `visual(mount)` function — no shared engine.

Patterns used:
- **Flow diagrams** — CSS flexbox boxes + arrow `::after` pseudo-elements
- **Timeline animations** — CSS `@keyframes` with `animation-delay` stagger
- **State machines** — CSS grid with color transitions on JS interval
- **Packet animations** — `requestAnimationFrame` moving elements
- **Comparison tables** — pure HTML table with color coding

When adding new sysdesign/kafka visuals, prefer `ReactViz.FlowDiagram` or inline CSS animations.

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| DSA topic file | `dsa-<pattern>-<problem>.js` | `dsa-sw-max-sum-fixed.js` |
| React topic file | `react-<concept>.js` | `react-hooks-state-effect.js` |
| Java topic file | `java-<topic>.js` | `java-jvm-memory-gc.js` |
| Window global | `window.DSA.*`, `window.ReactViz.*` | — |
| Topic array | `window.<AREA>_TOPICS` | `window.REACT_TOPICS`, `window.JAVA_TOPICS` |

---

## Load Order (index.html)

```
1. dsa-viz engine (core → array → graph → tree → dp → matrix → string → runtime → tracer)
2. react-viz engine (core → component-tree → hook-timeline → fiber → flow-diagram)
3. DSA OOP (dsa-step.model → dsa-problem.model → array.animation → graph.animation → dp.animation)
4. DSA templates (sliding-window → two-pointer → binary-search → dp → graph → stack → backtracking → greedy)
5. Angular core (signal → injector → constants → models → utils)
6. All topic data files (java, golang, python, microservices, sysdesign, kafka, rust, angular, react, databases, agents, dsa)
7. Angular services → store → shared/components → layouts → components → app.component.js
8. Prism syntax highlighting
```

**Critical:** engines (steps 1-4) MUST load before topic files (step 6).
