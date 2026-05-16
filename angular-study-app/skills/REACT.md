# React Topics

**Topic file location:** `src/modules/topics/react/`
**Topic array:** `window.REACT_TOPICS`
**Area string:** `"react"`
**Viz engine:** `window.ReactViz` (src/shared/react-viz/)

---

## Topics Built

| File | Title | Tag | Animation Used |
|------|-------|-----|----------------|
| `react-hooks-state-effect.js` | useState & useEffect | Hooks | ComponentTree + HookTimeline |
| `react-hooks-memo-callback.js` | useMemo & useCallback | Performance | ComponentTree (re-render cascade) |
| `react-hooks-ref-context.js` | useRef & useContext | Hooks | FlowDiagram (ref/context flow) |
| `react-fiber-reconciler.js` | Fiber & Reconciler | Internals | FiberTree (work loop traversal) |
| `react-concurrent.js` | Concurrent Mode | Advanced | FlowDiagram (scheduler/time-slicing) |
| `react-server-components.js` | Server Components (RSC) | Architecture | FlowDiagram (server→stream→hydrate) |
| `react-custom-hooks.js` | Custom Hooks | Patterns | ComponentTree (hook extraction) |
| `react-context-redux.js` | Context vs Redux | State | FlowDiagram (Redux data flow) |
| `react-performance.js` | React Performance | Performance | ComponentTree (memo/key optimization) |
| `react-forms.js` | React Forms | Patterns | FlowDiagram (controlled vs uncontrolled) |
| `react-testing.js` | React Testing (RTL) | Testing | FlowDiagram (query → render → assert) |

---

## Step Count per Topic

| Topic | Steps | Key Learning per Step |
|-------|-------|-----------------------|
| useState & useEffect | 6 | render → commit → effect → update → cleanup → effect |
| useMemo & useCallback | 5 | unoptimized → memo → still broken → useCallback → fixed |
| useRef & useContext | 5 | ref create → DOM access → mutable storage → context tree → re-render problem |
| Fiber & Reconciler | 5 | JSX → fiber tree → beginWork → completeWork → commit |
| Concurrent Mode | 5 | blocking → startTransition → time slicing → Suspense → useDeferredValue |
| Server Components | 4 | CSR waterfall → RSC flow → streaming → selective hydration |
| Custom Hooks | 4 | duplicated logic → extracted → composed → tested |
| Context vs Redux | 4 | prop drilling → Context → re-render problem → Redux flow |
| React Performance | 5 | unoptimized → React.memo → useCallback → virtualization → keys |
| React Forms | 4 | controlled → uncontrolled → RHF → render comparison |
| React Testing (RTL) | 5 | render → queries → userEvent → async → msw |

---

## React Topics Still to Add

| Topic | Priority | Suggested Animation |
|-------|----------|-------------------|
| React Router v6 | HIGH | FlowDiagram: URL → Router → Route match → Component |
| Error Boundaries | HIGH | ComponentTree: error propagation, fallback |
| React.lazy + Suspense | HIGH | FlowDiagram: code split → lazy load → render |
| Portals | MEDIUM | ComponentTree: out-of-tree rendering |
| StrictMode internals | MEDIUM | ComponentTree: double-invoke render |
| React DevTools Profiler | LOW | HookTimeline: commit timing |
| Zustand deep dive | HIGH | FlowDiagram: store → subscribe → selector |
| React Query (TanStack) | HIGH | FlowDiagram: cache → stale → refetch |
| Vite vs Webpack (build) | MEDIUM | FlowDiagram: bundle pipeline |
| React Native bridge | LOW | FlowDiagram: JS thread → bridge → native |

---

## ReactViz Panel — Step Data Shape

Each step can have any custom fields. Recommended shape:

```js
{
  phase: 'render',           // controls badge color (see ANIMATIONS.md)
  narration: 'Step 1 — ...', // shown in narration bar

  // for ComponentTree:
  tree: {
    name: 'App',
    type: 'component',       // component|dom|memo|context|provider|suspense
    state: { count: 0 },
    props: { onClick: 'fn' },
    rerender: false,         // orange glow
    skipped: false,          // dimmed + "skipped" badge
    children: [ ... ],
  },

  // for HookTimeline:
  hooks: [
    { name: 'useState', label: 'count', value: 0, active: true, phase: 'render', deps: null },
    { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
  ],
  renderPhase: 'render',     // 'render'|'commit'|'effect'|'cleanup'

  // for FiberTree:
  fiberTree: {
    tag: 'HostRoot', name: 'Root', state: 'idle',
    children: [
      { tag: 'FunctionComponent', name: 'App', state: 'beginWork',
        effectTag: 'UPDATE', alternate: false,
        children: [ ... ]
      }
    ]
  },
  currentFiber: 'App',       // which fiber is active (gets glow)

  // for FlowDiagram:
  nodes: [
    { id: 'a', label: 'Label', sublabel: 'sub', type: 'component', active: true, dim: false },
  ],
  edges: [
    { from: 'a', to: 'b', label: 'arrow label', active: true, color: '#3fb950' },
  ],

  // always:
  code: `// code shown in left panel`,
}
```

---

## React Topic File Pattern

```js
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-<topic>',
    area:  'react',
    title: '<Title>',
    tag:   '<Tag>',
    tags:  ['react', '<keyword1>', '<keyword2>'],

    concept: `<multiline concept>`,
    why:     `<production relevance>`,

    example: {
      language: 'javascript',
      code: `// React code`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Gotcha 1'],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — ...',
          // tree | hooks | fiberTree | nodes+edges
          code: '// code',
        },
      ];

      window.ReactViz.panel(mount, {
        title: '<title>',
        time:  'O(1)',
        space: 'O(n)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          // vizEl = right column
          // codeEl = left column
          if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          } else if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          } else if (step.fiberTree) {
            window.ReactViz.FiberTree.render(vizEl, step.fiberTree, step.phase, step.currentFiber);
          }
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'js');
        },
      });
    },
  }]);
})();
```

---

## Gotchas When Adding React Topics

1. **`window.ReactViz` must be loaded first** — it's at line 29 in index.html (right after DSAViz)
2. **Use `var` not `const/let` at IIFE level** — stays safe in strict mode across all browsers
3. **Steps are hand-crafted** — no tracer, no code execution — define state manually per step
4. **renderStep gets `vizEl` (right) and `codeEl` (left)** — not reversed
5. **`window.ReactViz.panel` returns `{ goTo, destroy }`** — call `destroy()` on navigate-away if storing reference


---

# React Mental Model — Ultimate Visualization Learning Path

## The Golden Rule

```text
STATE CHANGES
      ↓
REACT SCHEDULES WORK
      ↓
COMPONENT RE-EXECUTES
      ↓
NEW VIRTUAL DOM CREATED
      ↓
DIFFING HAPPENS
      ↓
MINIMAL DOM UPDATE
      ↓
BROWSER PAINTS
```

---

# React Rendering Pipeline

| Phase | What Happens | Browser Impact |
|---|---|---|
| Trigger | state/props/context change | none |
| Render Phase | React builds new virtual tree | JS CPU |
| Reconciliation | compares old vs new tree | JS CPU |
| Commit Phase | real DOM updated | layout/repaint |
| Browser Paint | pixels rendered | GPU/CPU |

---

# Add These Advanced React Topics

| Topic | Why Important | Suggested Visualization |
|---|---|---|
| React Rendering Internals | MOST asked interview topic | Fiber traversal animation |
| Hydration | SSR understanding | Server → HTML → hydrate flow |
| React Scheduler | Concurrent rendering | Priority queue animation |
| Batching Updates | render optimization | Multiple updates merge |
| Stale Closures | common bug | Hook timeline |
| useLayoutEffect | DOM sync timing | render vs paint timeline |
| Key Prop Internals | reconciliation behavior | list diff animation |
| Controlled Rendering | performance scaling | tree render glow |
| Suspense Internals | async UI orchestration | fallback switching |
| React Compiler future | upcoming ecosystem | compile optimization flow |

---

# React Rendering Story

## Restaurant Analogy

```text
Customer clicks order button
        ↓
Waiter writes new order
        ↓
Manager checks changed tables
        ↓
ONLY affected tables updated
        ↓
Kitchen untouched
```

That is React rendering.

---

# React Internals Flow

```text
setState()
   ↓
Update queued
   ↓
Scheduler assigns priority
   ↓
Fiber work loop starts
   ↓
beginWork()
   ↓
completeWork()
   ↓
commitRoot()
   ↓
DOM mutations
   ↓
Paint
```

---

# React Fiber Deep Dive

## Old React Problem

Before Fiber:

```text
Huge render blocked browser completely
```

Bad UX ❌

Typing lagged.

Animations froze.

---

# Fiber Solution

Fiber splits rendering into chunks.

```text
Render Small Unit
      ↓
Pause
      ↓
Continue Later
```

Like cooperative multitasking.

---

# Fiber Concepts

| Fiber Concept | Meaning |
|---|---|
| Fiber Node | unit of work |
| Alternate | previous version |
| Effect Tag | what changed |
| Lane | priority bucket |
| Scheduler | controls execution |
| Work Loop | traversal engine |

---

# Fiber Traversal Visualization

```text
Root
 └── App
      ├── Navbar
      ├── Feed
      │     ├── Post1
      │     ├── Post2
      └── Sidebar
```

Traversal:

```text
beginWork(App)
beginWork(Navbar)
completeWork(Navbar)
beginWork(Feed)
beginWork(Post1)
completeWork(Post1)
```

Depth-first traversal.

---

# Reconciliation Rules

## Rule 1 — Different Type

```jsx
<div />
<span />
```

Destroy old.
Create new.

---

## Rule 2 — Same Type

```jsx
<div class="a" />
<div class="b" />
```

Reuse node.
Update props only.

---

## Rule 3 — Keys Matter

```jsx
items.map(item => (
  <Item key={item.id} />
))
```

Keys help React identify stable elements.

---

# Bad Key Example

```jsx
key={index}
```

Causes:

- remounting
- input bugs
- animation glitches
- incorrect reuse

---

# Good Key Example

```jsx
key={user.id}
```

Stable identity.

---

# React Lifecycle Timeline

```text
MOUNT
 ↓
RENDER
 ↓
COMMIT
 ↓
EFFECT
 ↓
UPDATE
 ↓
CLEANUP
 ↓
UNMOUNT
```

---

# useEffect Timing

## Important

`useEffect` runs AFTER paint.

```text
Render
 ↓
DOM Commit
 ↓
Paint
 ↓
useEffect
```

---

# useLayoutEffect Timing

Runs BEFORE paint.

```text
Render
 ↓
DOM Commit
 ↓
useLayoutEffect
 ↓
Paint
```

Used for:

- measurements
- animations
- scroll sync

---

# React Scheduler Priorities

| Priority | Example |
|---|---|
| Immediate | typing |
| User Blocking | button click |
| Normal | API data |
| Low | analytics |
| Idle | prefetch |

---

# Concurrent Rendering Story

## Without Concurrent Mode

```text
Huge render starts
Browser blocked
Typing freezes
```

---

## With Concurrent Mode

```text
Render starts
 ↓
Pause
 ↓
Handle typing
 ↓
Resume rendering
```

Smooth UX ⚡

---

# startTransition

```jsx
startTransition(() => {
  setBigList(data)
})
```

Marks update as low priority.

User interactions stay responsive.

---

# Suspense Mental Model

```text
UI needs data
    ↓
Data not ready
    ↓
Fallback shown
    ↓
Data arrives
    ↓
Real UI swaps in
```

---

# Suspense Visualization

```text
<App>
   └── <Suspense fallback="Loading">
            └── <Profile />
```

---

# Hydration Explained

## Server Side

```text
Server sends HTML
```

Browser sees content immediately.

---

## Client Side

React attaches events.

```text
HTML
 ↓
React loads JS
 ↓
Hydration
 ↓
Interactive app
```

---

# SSR vs CSR vs RSC

| Type | Rendering Place |
|---|---|
| CSR | Browser |
| SSR | Server |
| RSC | Split server/client |

---

# React Server Components

Server executes component.

Only serialized result sent.

Benefits:

- less JS bundle
- faster load
- backend access
- streaming

---

# Rendering Performance Rules

## Expensive Things

| Expensive Operation | Why |
|---|---|
| DOM updates | layout/repaint |
| huge renders | CPU |
| unnecessary rerenders | wasted work |
| large lists | memory/render cost |

---

# Optimization Toolkit

| Tool | Use |
|---|---|
| React.memo | skip rerenders |
| useMemo | cache values |
| useCallback | stable functions |
| virtualization | huge lists |
| lazy loading | smaller bundles |
| Suspense | async UI |

---

# React.memo Story

Without memo:

```text
Parent rerenders
 ALL children rerender
```

With memo:

```text
Parent rerenders
 unchanged child skipped
```

---

# useMemo Story

Expensive calculation:

```jsx
const value = expensiveFunction()
```

Runs every render ❌

---

# With useMemo

```jsx
const value = useMemo(() => expensiveFunction(), [data])
```

Cached.

---

# useCallback Story

Functions recreated every render.

Bad for memoized children.

---

# Solution

```jsx
const onClick = useCallback(() => {}, [])
```

Stable reference.

---

# Common React Bugs

| Bug | Cause |
|---|---|
| Infinite re-render | state update during render |
| Stale closure | old state captured |
| Missing dependency | incorrect effect deps |
| Memory leak | cleanup missing |
| Unstable keys | wrong reconciliation |
| Over-rendering | bad state placement |

---

# Stale Closure Example

```jsx
useEffect(() => {
  setInterval(() => {
    console.log(count)
  }, 1000)
}, [])
```

Always prints old count.

---

# Fix

```jsx
useEffect(() => {
}, [count])
```

or refs.

---

# React Architecture Best Practices

| Best Practice | Reason |
|---|---|
| Keep state local | avoid rerenders |
| Split large components | maintainability |
| Memoize carefully | avoid wasted CPU |
| Use stable keys | correct reconciliation |
| Avoid prop drilling | scalability |
| Prefer composition | flexibility |
| Co-locate logic | readability |

---

# Folder Structure Best Practice

```text
src/
 ├── components/
 ├── hooks/
 ├── pages/
 ├── services/
 ├── store/
 ├── utils/
 ├── layouts/
 ├── routes/
 └── features/
```

---

# Feature-Based Structure

Better for scaling.

```text
features/
   ├── auth/
   ├── profile/
   ├── feed/
```

Each contains:

```text
components/
hooks/
api/
store/
tests/
```

---

# Production React Stack

| Area | Common Tool |
|---|---|
| Build Tool | Vite |
| Routing | React Router |
| State | Redux/Zustand |
| Async Cache | React Query |
| Forms | React Hook Form |
| Validation | Zod |
| Styling | Tailwind |
| Testing | RTL + Vitest |
| SSR | Next.js |

---

# React Interview Questions

## Beginner

- Why Virtual DOM?
- Props vs State?
- Why keys?
- useEffect lifecycle?
- Controlled vs uncontrolled?

---

## Intermediate

- Reconciliation algorithm?
- React.memo vs useMemo?
- useRef internals?
- Context rerender problem?
- Hydration process?

---

## Advanced

- Fiber architecture?
- Concurrent rendering?
- Lanes?
- Scheduler priorities?
- Suspense internals?
- Server Components?
- Render phase vs commit phase?

---

# Visualization Ideas to Add

## 1. Render Heatmap

```text
Rerendered components glow orange
Skipped components dimmed
```

---

## 2. Hook Timeline Animation

```text
render → commit → effect → cleanup
```

---

## 3. Fiber Work Loop Animation

```text
beginWork → child → sibling → parent
```

---

## 4. Scheduler Priority Animation

```text
typing = high priority
list render = low priority
```

---

# Ultimate React Mental Model

React is NOT:

```text
HTML generator
```

React IS:

# A scheduling + reconciliation engine for UI state synchronization.

---

# Core Philosophy

```text
UI is a function of state
```

:contentReference[oaicite:1]{index=1}

Everything in React comes from this principle.

---

# Final Architecture Flow

```text
USER EVENT
    ↓
STATE UPDATE
    ↓
SCHEDULER
    ↓
FIBER RENDER
    ↓
RECONCILIATION
    ↓
COMMIT PHASE
    ↓
DOM UPDATE
    ↓
BROWSER PAINT
    ↓
SCREEN UPDATED
```
