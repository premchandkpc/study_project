/**
 * react-hooks-state-effect.js
 * Topic: useState & useEffect — hook lifecycle, stale closures, cleanup
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-hooks-state-effect',
    area:  'react',
    title: 'useState & useEffect',
    tag:   'Hooks',
    tags:  ['react','hooks','usestate','useeffect','stale-closure','cleanup'],

    concept: `useState stores reactive state inside a function component.
React re-renders the component every time setState is called with a new value.
useEffect runs after paint — not during render. It replaces componentDidMount/DidUpdate/WillUnmount.
The dependency array controls WHEN the effect re-runs: [] = once, [x] = when x changes, omitted = every render.
Cleanup function (returned from useEffect) runs before the next effect and on unmount.
Stale closure: effect captures variables at the time it was created — if deps are missing, you read stale values.`,

    why: `useState + useEffect are the backbone of React function components.
95% of production React code uses them. Understanding their execution order prevents the most common React bugs:
missing deps → stale data, no cleanup → memory leaks, wrong deps → infinite loops.`,

    example: {
      language: 'javascript',
      code: `// useState: local reactive state
const [count, setCount] = useState(0);
const [data, setData]   = useState(null);

// useEffect: side effects after render
useEffect(() => {
  // runs after every render where count changed
  document.title = \`Count: \${count}\`;

  // cleanup runs before next effect / unmount
  return () => { document.title = 'App'; };
}, [count]); // dependency array

// Fetch on mount ([] = run once)
useEffect(() => {
  let cancelled = false;
  fetch('/api/data')
    .then(r => r.json())
    .then(d => { if (!cancelled) setData(d); });
  return () => { cancelled = true; }; // cleanup = cancel
}, []);

// STALE CLOSURE BUG:
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1); // BUG: count is always 0!
  }, 1000);
  return () => clearInterval(id);
}, []); // missing [count]

// FIX: use functional update
setCount(prev => prev + 1); // always fresh`,
    },

    interview: [
      'What is the order of execution: render → paint → effect?',
      'When does useEffect cleanup run?',
      'What causes an infinite useEffect loop?',
      'How do you fix a stale closure in useEffect?',
      'Difference between useEffect and useLayoutEffect?',
      'Can you call hooks conditionally? Why not?',
    ],

    tradeoffs: {
      pros: ['Simple state model', 'Declarative side effects', 'Automatic cleanup'],
      cons: ['Stale closures hard to debug', 'Dependency array must be complete', 'Effects run async (not sync)'],
    },

    gotchas: [
      'Object/array in deps — new ref every render → infinite loop. Use useMemo.',
      'setState in useEffect without deps → infinite loop.',
      'Missing cleanup → memory leak in subscriptions/timers.',
      'useEffect runs AFTER paint — not during render.',
      'React batches setState calls in event handlers (React 18: batches everywhere).',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'Step 1 — Initial render. useState initializes count=0, data=null. Component renders to virtual DOM.',
          tree: {
            name: 'App', type: 'component', state: { count: 0, data: null },
            children: [
              { name: 'button', type: 'dom', props: { onClick: 'setCount' } },
              { name: 'DataDisplay', type: 'component', props: { data: null } },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 0, active: true, phase: 'render' },
            { name: 'useState', label: 'data',  value: null, active: true, phase: 'render' },
            { name: 'useEffect', label: 'title', active: false, phase: 'idle', deps: ['count'] },
            { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
          ],
          renderPhase: 'render',
          code: `function App() {\n  const [count, setCount] = useState(0); // ← HERE\n  const [data, setData]   = useState(null); // ← HERE\n  // render...\n}`,
        },
        {
          phase: 'commit',
          narration: 'Step 2 — Commit phase. React writes virtual DOM changes to the real DOM. Paint happens.',
          tree: {
            name: 'App', type: 'component', state: { count: 0, data: null },
            children: [
              { name: 'button', type: 'dom', props: { onClick: 'setCount' } },
              { name: 'DataDisplay', type: 'component', props: { data: null } },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 0, active: false, phase: 'idle' },
            { name: 'useState', label: 'data',  value: null, active: false, phase: 'idle' },
            { name: 'useEffect', label: 'title', active: false, phase: 'idle', deps: ['count'] },
            { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
          ],
          renderPhase: 'commit',
          code: `// React commits to DOM\n// Paints to screen\n// Then schedules effects...`,
        },
        {
          phase: 'effect',
          narration: 'Step 3 — Effects run after paint. Both effects fire on first render (no deps to compare yet).',
          tree: {
            name: 'App', type: 'component', state: { count: 0, data: null },
            children: [
              { name: 'button', type: 'dom' },
              { name: 'DataDisplay', type: 'component', props: { data: null } },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 0, active: false, phase: 'idle' },
            { name: 'useState', label: 'data',  value: null, active: false, phase: 'idle' },
            { name: 'useEffect', label: 'title', active: true, phase: 'effect', deps: ['count'] },
            { name: 'useEffect', label: 'fetch', active: true, phase: 'effect', deps: [] },
          ],
          renderPhase: 'effect',
          code: `useEffect(() => {\n  document.title = \`Count: \${count}\`; // ← runs now\n  return () => { document.title = 'App'; };\n}, [count]);\n\nuseEffect(() => {\n  fetch('/api/data').then(...); // ← runs now\n  return () => { cancelled = true; };\n}, []);`,
        },
        {
          phase: 'update',
          narration: 'Step 4 — User clicks button → setCount(1). React schedules re-render.',
          tree: {
            name: 'App', type: 'component', state: { count: 1, data: null }, rerender: true,
            children: [
              { name: 'button', type: 'dom', rerender: true },
              { name: 'DataDisplay', type: 'component', props: { data: null } },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 1, active: true, phase: 'render' },
            { name: 'useState', label: 'data',  value: null, active: false, phase: 'idle' },
            { name: 'useEffect', label: 'title', active: false, phase: 'idle', deps: [1] },
            { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
          ],
          renderPhase: 'render',
          code: `// onClick fires\nsetCount(prev => prev + 1);\n// React re-renders App with count=1`,
        },
        {
          phase: 'cleanup',
          narration: 'Step 5 — Before running the title effect again, React calls the PREVIOUS cleanup function.',
          tree: {
            name: 'App', type: 'component', state: { count: 1, data: null },
            children: [
              { name: 'button', type: 'dom' },
              { name: 'DataDisplay', type: 'component' },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 1, active: false, phase: 'idle' },
            { name: 'useState', label: 'data',  value: null, active: false, phase: 'idle' },
            { name: 'useEffect', label: 'title', active: true, phase: 'cleanup', deps: [0] },
            { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
          ],
          renderPhase: 'cleanup',
          code: `// cleanup from previous effect runs\n() => { document.title = 'App'; } // ← cleanup\n\n// Then new effect runs with count=1\ndocument.title = \`Count: 1\`;`,
        },
        {
          phase: 'effect',
          narration: 'Step 6 — fetch effect does NOT re-run (deps=[] means once only). Only title effect re-runs.',
          tree: {
            name: 'App', type: 'component', state: { count: 1, data: 'loaded' },
            children: [
              { name: 'button', type: 'dom' },
              { name: 'DataDisplay', type: 'component', props: { data: 'loaded' } },
            ],
          },
          hooks: [
            { name: 'useState', label: 'count', value: 1, active: false, phase: 'idle' },
            { name: 'useState', label: 'data',  value: 'loaded', active: true, phase: 'effect' },
            { name: 'useEffect', label: 'title', active: true, phase: 'effect', deps: [1] },
            { name: 'useEffect', label: 'fetch', active: false, phase: 'idle', deps: [] },
          ],
          renderPhase: 'effect',
          code: `// title effect: re-runs (count changed 0→1)\ndocument.title = 'Count: 1';\n\n// fetch effect: SKIPPED (deps=[] never changes)\n// but fetch resolved → setData('loaded') → re-render`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'useState & useEffect Lifecycle',
        time:  'O(1) render',
        space: 'O(h) hook list',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.ComponentTree.render(vizEl, step.tree);

          codeEl.innerHTML = '';
          const codeDiv = document.createElement('div');
          codeDiv.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">HOOK CALL ORDER</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
          codeEl.appendChild(codeDiv);

          const timelineEl = document.createElement('div');
          timelineEl.style.cssText = 'margin-top:8px';
          window.ReactViz.HookTimeline.render(timelineEl, step.hooks, step.renderPhase, 1);
          codeEl.appendChild(timelineEl);
        },
      });
    },
  }]);
})();
