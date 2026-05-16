/**
 * react-fiber-reconciler.js
 * Topic: React Fiber & Reconciler — virtual DOM, diffing, work loop, commit
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-fiber-reconciler',
    area:  'react',
    title: 'Fiber & Reconciler',
    tag:   'Internals',
    tags:  ['react','fiber','reconciler','virtual-dom','diffing','work-loop','commit'],

    concept: `React Fiber is the reconciliation algorithm rewritten in React 16.
Each component is a "fiber" — a JS object with: type, props, state, effectTag, child, sibling, return (parent).
Work loop: React traverses fibers in two phases:
  1. Render phase (beginWork → completeWork): builds new fiber tree, computes what changed. INTERRUPTIBLE.
  2. Commit phase: applies changes to real DOM. NOT interruptible (must be atomic).
Diffing: same type at same position → update (reuse DOM). Different type → unmount old, mount new.
Keys help React identify list items across re-renders without full unmount/remount.`,

    why: `Before Fiber, React used recursive rendering — could not be interrupted.
Long renders blocked the main thread, causing jank. Fiber makes rendering interruptible/pausable.
Understanding Fiber explains: why concurrent mode exists, how Suspense works, why keys matter in lists.`,

    example: {
      language: 'javascript',
      code: `// JSX compiles to React.createElement
const element = (
  <div className="app">
    <h1>Hello</h1>
    <Child name="world" />
  </div>
);
// becomes:
React.createElement('div', { className: 'app' },
  React.createElement('h1', null, 'Hello'),
  React.createElement(Child, { name: 'world' })
);

// Fiber object (simplified):
{
  type: 'div',
  props: { className: 'app' },
  stateNode: <actual DOM div>,
  child: h1Fiber,        // first child
  sibling: null,
  return: parentFiber,   // parent
  effectTag: 'UPDATE',   // what to do in commit
  alternate: oldFiber,   // previous version
}

// Key algorithm: same type → reuse DOM
// <div> → <div>: UPDATE (change props only)
// <div> → <span>: UNMOUNT div, MOUNT span (expensive!)`,
    },

    interview: [
      'What is a fiber and what does it store?',
      'What is the difference between render phase and commit phase?',
      'Why is the commit phase not interruptible?',
      'How does React diffing work — same type vs different type?',
      'Why are keys important in lists?',
      'What is the alternate fiber?',
    ],

    tradeoffs: {
      pros: ['Interruptible rendering enables concurrent features', 'Keys make list reconciliation O(n)', 'Fiber enables Suspense and transitions'],
      cons: ['Two-fiber system doubles memory', 'Commit phase blocks main thread', 'Diffing is heuristic — can miss optimal solution'],
    },

    gotchas: [
      'Never use array index as key for dynamic lists — causes state/DOM mismatches.',
      'Different component type at same position = full unmount/remount (state lost!)',
      'Render phase can run multiple times — keep it pure, no side effects.',
      'useLayoutEffect runs synchronously in commit phase — avoid heavy work.',
      'Strict Mode renders components twice (development) to catch impure renders.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'begin',
          narration: 'Step 1 — JSX → React.createElement() → plain JS objects (not real DOM yet).',
          currentFiber: null,
          fiberTree: {
            tag: 'HostRoot', name: 'Root', state: 'idle',
            children: [
              {
                tag: 'FunctionComponent', name: 'App', state: 'idle',
                children: [
                  { tag: 'HostComponent', name: 'div.app', state: 'idle',
                    children: [
                      { tag: 'HostComponent', name: 'h1', state: 'idle' },
                      { tag: 'FunctionComponent', name: 'Child', state: 'idle' },
                    ]
                  }
                ]
              }
            ]
          },
          code: `// 1. JSX → createElement\n<App />\n// compiles to:\nReact.createElement(App, null)\n\n// 2. React creates fiber tree\n// Each element = one fiber object\n// Fiber = unit of work`,
        },
        {
          phase: 'begin',
          narration: 'Step 2 — Work loop: beginWork on Root → App → div → h1. Traverses depth-first.',
          currentFiber: 'App',
          fiberTree: {
            tag: 'HostRoot', name: 'Root', state: 'completeWork',
            children: [
              {
                tag: 'FunctionComponent', name: 'App', state: 'beginWork',
                children: [
                  { tag: 'HostComponent', name: 'div.app', state: 'idle',
                    children: [
                      { tag: 'HostComponent', name: 'h1', state: 'idle' },
                      { tag: 'FunctionComponent', name: 'Child', state: 'idle' },
                    ]
                  }
                ]
              }
            ]
          },
          code: `// beginWork: process this fiber\nfunction beginWork(fiber) {\n  // call function component\n  // reconcile children\n  // return first child\n  return fiber.child; // depth-first\n}\n\n// Work loop:\nroot → App (beginWork)\nApp → div (beginWork)\ndiv → h1 (beginWork)`,
        },
        {
          phase: 'complete',
          narration: 'Step 3 — h1 has no children → completeWork. Then sibling Child → beginWork → completeWork.',
          currentFiber: 'h1',
          fiberTree: {
            tag: 'HostRoot', name: 'Root', state: 'idle',
            children: [
              {
                tag: 'FunctionComponent', name: 'App', state: 'beginWork',
                children: [
                  { tag: 'HostComponent', name: 'div.app', state: 'beginWork',
                    children: [
                      { tag: 'HostComponent', name: 'h1', state: 'completeWork' },
                      { tag: 'FunctionComponent', name: 'Child', state: 'beginWork' },
                    ]
                  }
                ]
              }
            ]
          },
          code: `// completeWork: no more children\nfunction completeWork(fiber) {\n  // create DOM node (not attached yet)\n  // collect effects\n  // return sibling or parent\n}\n\n// h1: completeWork → go to sibling Child\n// Child: beginWork → completeWork\n// div: completeWork → back to App`,
        },
        {
          phase: 'complete',
          narration: 'Step 4 — All fibers processed. Full new fiber tree built. Render phase complete.',
          currentFiber: 'App',
          fiberTree: {
            tag: 'HostRoot', name: 'Root', state: 'completeWork',
            children: [
              {
                tag: 'FunctionComponent', name: 'App', state: 'completeWork',
                children: [
                  { tag: 'HostComponent', name: 'div.app', state: 'completeWork',
                    children: [
                      { tag: 'HostComponent', name: 'h1', state: 'completeWork' },
                      { tag: 'FunctionComponent', name: 'Child', state: 'completeWork' },
                    ]
                  }
                ]
              }
            ]
          },
          code: `// Render phase done — interruptible\n// React has computed: what changed?\n// effectList: which fibers have side effects?\n\n// No DOM changes yet!\n// Render phase is pure — can pause/restart\n// Commit phase is next — cannot interrupt`,
        },
        {
          phase: 'commit',
          narration: 'Step 5 — Commit phase: React applies effectList to real DOM. Three sub-passes: before-mutation, mutation, layout.',
          currentFiber: null,
          fiberTree: {
            tag: 'HostRoot', name: 'Root', state: 'commit',
            children: [
              {
                tag: 'FunctionComponent', name: 'App', state: 'commit',
                children: [
                  { tag: 'HostComponent', name: 'div.app', state: 'commit', effectTag: 'UPDATE',
                    children: [
                      { tag: 'HostComponent', name: 'h1', state: 'commit', effectTag: 'PLACEMENT' },
                      { tag: 'FunctionComponent', name: 'Child', state: 'commit' },
                    ]
                  }
                ]
              }
            ]
          },
          code: `// Commit phase (NOT interruptible!):\n\n// Pass 1: before-mutation\n//   getSnapshotBeforeUpdate\n\n// Pass 2: mutation\n//   INSERT/UPDATE/DELETE DOM nodes\n\n// Pass 3: layout\n//   useLayoutEffect\n//   componentDidMount/Update\n\n// Then: schedule useEffect (async)`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'Fiber & Reconciler Work Loop',
        time:  'O(n) render, O(e) commit',
        space: 'O(n) fiber tree × 2',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FiberTree.render(vizEl, step.fiberTree, step.phase, step.currentFiber);
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">WORK LOOP</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
