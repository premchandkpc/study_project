/**
 * react-hooks-memo-callback.js
 * Topic: useMemo & useCallback — memoization, referential stability, React.memo
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-hooks-memo-callback',
    area:  'react',
    title: 'useMemo & useCallback',
    tag:   'Performance',
    tags:  ['react','usememo','usecallback','react.memo','memoization','referential-equality'],

    concept: `useMemo caches a computed value. Only recomputes when deps change.
useCallback caches a function reference. Without it, every render creates a NEW function object.
React.memo wraps a component — skips re-render if props are shallowly equal.
Key insight: object/function props break React.memo because new render = new reference = "changed" prop.
useCallback stabilizes function refs so memoized children don't re-render unnecessarily.`,

    why: `Without memoization, expensive computations run every render.
More critically, unstable function refs (onClick, onChange) force all child React.memo components to re-render even when nothing logically changed.
In large trees, this cascades — one parent re-render triggers hundreds of child re-renders.`,

    example: {
      language: 'javascript',
      code: `// Without memoization — runs every render
const sorted = items.sort((a,b) => a - b); // O(n log n) every time!

// useMemo — only recomputes when items changes
const sorted = useMemo(() => {
  return [...items].sort((a, b) => a - b);
}, [items]);

// Without useCallback — new function every render
const handleClick = () => dispatch({ type: 'INC' }); // new ref!

// useCallback — stable reference
const handleClick = useCallback(() => {
  dispatch({ type: 'INC' });
}, [dispatch]); // only changes if dispatch changes

// React.memo — skips render if props unchanged
const Child = React.memo(function Child({ value, onClick }) {
  return <button onClick={onClick}>{value}</button>;
}); // onClick must be stable (useCallback) or Child re-renders`,
    },

    interview: [
      'When does React.memo re-render despite memoization?',
      'useMemo vs useCallback — what is the difference?',
      'When is useMemo NOT worth using?',
      'How do you memoize a component with context?',
      'What is referential equality and why does it matter in React?',
      'Can useCallback cause bugs? When?',
    ],

    tradeoffs: {
      pros: ['Prevents expensive recomputation', 'Stabilizes function refs for memo boundaries', 'Critical for large lists'],
      cons: ['Memory cost to cache', 'Wrong deps = stale cache', 'Premature optimization overhead'],
    },

    gotchas: [
      'useMemo with [] deps = computed once — if the value depends on something else, it will be stale.',
      'useCallback does NOT prevent the callback from being called — it prevents creating a new function.',
      'React.memo only does shallow comparison — deep objects still break it.',
      'Overusing useMemo is worse than not using it — adds memory + complexity.',
      'useCallback(fn, [dep]) — if dep is unstable (object), still creates new callback every render.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'Without memoization: Parent re-renders → expensive sort runs → new handleClick ref → Child re-renders.',
          tree: {
            name: 'Parent', type: 'component', state: { count: 1 }, rerender: true,
            children: [
              { name: 'ExpensiveList', type: 'component', rerender: true, props: { items: '[...]', onClick: 'fn()' } },
              { name: 'Counter', type: 'component', rerender: true, props: { count: 1 } },
            ],
          },
          code: `// Every parent render:\nconst sorted = items.sort(); // O(n log n) ← runs!\nconst handleClick = () => {}; // new ref ← always!\n\n// Child re-renders even though its data didn't change\n// because onClick is a NEW function reference`,
        },
        {
          phase: 'render',
          narration: 'With useMemo: sort is cached. items hasn\'t changed → returns cached result immediately.',
          tree: {
            name: 'Parent', type: 'component', state: { count: 2 }, rerender: true,
            children: [
              { name: 'ExpensiveList', type: 'memo', skipped: true, props: { items: '[cached]', onClick: '?' } },
              { name: 'Counter', type: 'component', rerender: true, props: { count: 2 } },
            ],
          },
          code: `// With useMemo:\nconst sorted = useMemo(() => {\n  return [...items].sort((a,b) => a-b); // ← cached!\n}, [items]); // only runs when 'items' changes\n\n// sort NOT re-run — items ref same`,
        },
        {
          phase: 'render',
          narration: 'But: handleClick is still new each render → ExpensiveList still re-renders despite React.memo!',
          tree: {
            name: 'Parent', type: 'component', state: { count: 2 }, rerender: true,
            children: [
              { name: 'ExpensiveList', type: 'memo', rerender: true, props: { items: '[cached]', onClick: 'NEW fn()' } },
              { name: 'Counter', type: 'component', rerender: true, props: { count: 2 } },
            ],
          },
          code: `// STILL broken:\nconst handleClick = () => { // ← new ref every render!\n  doSomething();\n};\n\n// React.memo checks: props.onClick changed? YES (new ref)\n// → re-renders ExpensiveList ← defeats memoization`,
        },
        {
          phase: 'render',
          narration: 'useCallback stabilizes handleClick. Same ref → React.memo sees no change → ExpensiveList SKIPPED.',
          tree: {
            name: 'Parent', type: 'component', state: { count: 3 }, rerender: true,
            children: [
              { name: 'ExpensiveList', type: 'memo', skipped: true, props: { items: '[cached]', onClick: '[stable]' } },
              { name: 'Counter', type: 'component', rerender: true, props: { count: 3 } },
            ],
          },
          code: `// FIXED with useCallback:\nconst handleClick = useCallback(() => {\n  doSomething();\n}, []); // stable reference!\n\n// React.memo: props.onClick changed? NO (same ref)\n// → ExpensiveList SKIPPED ✓\n// → sort NOT re-run ✓`,
        },
        {
          phase: 'update',
          narration: 'items changes → useMemo recomputes sort. New sorted ref → ExpensiveList does re-render (correct!).',
          tree: {
            name: 'Parent', type: 'component', state: { count: 3 }, rerender: true,
            children: [
              { name: 'ExpensiveList', type: 'memo', rerender: true, props: { items: '[NEW arr]', onClick: '[stable]' } },
              { name: 'Counter', type: 'memo', skipped: true, props: { count: 3 } },
            ],
          },
          code: `// items array changes (user adds item)\n// useMemo deps [items] changed → recompute sort\nconst sorted = [...newItems].sort(); // ← runs again\n\n// ExpensiveList re-renders — this is CORRECT\n// Counter skipped — count didn't change`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'useMemo & useCallback',
        time:  'O(1) hook lookup',
        space: 'O(n) cache',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.ComponentTree.render(vizEl, step.tree);
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">MEMOIZATION CHAIN</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
