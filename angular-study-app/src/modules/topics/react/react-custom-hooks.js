/**
 * react-custom-hooks.js
 * Topic: Custom Hooks — composition, abstraction, reusable logic
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-custom-hooks',
    area:  'react',
    title: 'Custom Hooks',
    tag:   'Patterns',
    tags:  ['react','custom-hooks','composition','reuse','abstraction'],

    concept: `Custom hooks are plain JavaScript functions that start with "use" and call other hooks.
They let you extract stateful logic from components into reusable functions.
A custom hook can call useState, useEffect, useContext — anything a component can call.
Each call to a custom hook gets its own isolated state — hooks are not shared between components.
Custom hooks follow all hook rules: no conditionals, no loops, called at top level.`,

    why: `Without custom hooks, stateful logic is duplicated across components or forced into HOCs/render props (messy).
Custom hooks make logic portable, testable, and composable — the same pattern as Angular services or mixins.
React Query, SWR, Zustand — all expose their API as custom hooks.`,

    example: {
      language: 'javascript',
      code: `// Extract fetch logic into useFetch
function useFetch(url) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false); }})
      .catch(e => { if (!cancelled) { setError(e); setLoading(false); }});
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}

// Usage: any component, own isolated state
function UserList() {
  const { data, loading } = useFetch('/api/users');
  if (loading) return <Spinner />;
  return <ul>{data.map(u => <li>{u.name}</li>)}</ul>;
}

// Compose hooks — hooks calling hooks
function useUserSearch(query) {
  const debouncedQuery = useDebounce(query, 300);
  const { data, loading } = useFetch(\`/api/users?q=\${debouncedQuery}\`);
  const filtered = useMemo(() =>
    data?.filter(u => u.active), [data]);
  return { users: filtered, loading };
}`,
    },

    interview: [
      'What makes a function a "custom hook"?',
      'Do two components sharing a custom hook share state?',
      'How do you test a custom hook?',
      'Custom hook vs HOC vs render props — when to use each?',
      'How do you make a custom hook that returns a ref?',
      'Can a custom hook return JSX?',
    ],

    tradeoffs: {
      pros: ['Logic reuse without component nesting', 'Testable in isolation', 'Composable (hooks call hooks)', 'Clear contract: inputs → outputs'],
      cons: ['Debugging chain of hooks can be hard', 'Overextraction: too many hooks = fragmented logic', 'Rules of hooks apply inside custom hooks'],
    },

    gotchas: [
      'Custom hook must start with "use" — React lint rules enforce this.',
      'Each component call gets ISOLATED state — not shared between components.',
      'To share state between components, lift to Context or external store.',
      'A custom hook returning JSX is legal but confusing — prefer components.',
      'Infinite loop: custom hook that takes object/array as param — new ref every render → effect re-runs.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'Problem: UserCard and UserList both have identical fetch logic duplicated.',
          tree: {
            name: 'App', type: 'component',
            children: [
              { name: 'UserCard', type: 'component', rerender: false,
                state: { data: null, loading: true, error: null },
                props: { note: 'useState×3 + useEffect (fetch)' } },
              { name: 'UserList', type: 'component', rerender: false,
                state: { data: null, loading: true, error: null },
                props: { note: 'useState×3 + useEffect (fetch) — DUPLICATED' } },
            ],
          },
          code: `// DUPLICATED in UserCard:\nconst [data, setData]       = useState(null);\nconst [loading, setLoading] = useState(true);\nconst [error, setError]     = useState(null);\nuseEffect(() => {\n  fetch('/api/user/1').then(...);\n}, []);\n\n// DUPLICATED in UserList:\nconst [data, setData]       = useState(null);\n// ... same thing again`,
        },
        {
          phase: 'render',
          narration: 'Extract into useFetch. Both components call the same hook — each gets ISOLATED state.',
          tree: {
            name: 'App', type: 'component',
            children: [
              { name: 'UserCard', type: 'component',
                props: { hook: 'useFetch("/api/user/1")' },
                state: { data: '{user}', loading: false } },
              { name: 'UserList', type: 'component',
                props: { hook: 'useFetch("/api/users")' },
                state: { data: '[...]', loading: false } },
            ],
          },
          code: `function useFetch(url) {\n  const [data, setData]     = useState(null);\n  const [loading, setLoading] = useState(true);\n  const [error, setError]   = useState(null);\n  useEffect(() => { /* fetch logic */ }, [url]);\n  return { data, loading, error };\n}\n\n// UserCard: own isolated {data, loading, error}\nconst { data } = useFetch('/api/user/1');\n// UserList: completely separate state instance\nconst { data } = useFetch('/api/users');`,
        },
        {
          phase: 'render',
          narration: 'Hooks compose — useFetch + useDebounce + useMemo combined into useUserSearch.',
          tree: {
            name: 'SearchPage', type: 'component',
            children: [
              { name: 'useUserSearch', type: 'context',
                props: { 'calls →': 'useDebounce + useFetch + useMemo' },
                state: { users: '[filtered]', loading: false } },
              { name: 'UserList', type: 'component',
                props: { users: '[filtered]', loading: false } },
            ],
          },
          code: `// Composition: hooks calling hooks\nfunction useUserSearch(query) {\n  // hook 1\n  const debounced = useDebounce(query, 300);\n  // hook 2 (calls hook 1 internally)\n  const { data, loading } = useFetch(\`/api/users?q=\${debounced}\`);\n  // hook 3\n  const users = useMemo(() =>\n    data?.filter(u => u.active), [data]);\n  return { users, loading };\n}\n\n// SearchPage: clean and focused\nconst { users, loading } = useUserSearch(query);`,
        },
        {
          phase: 'mount',
          narration: 'Testing: custom hooks are testable with renderHook() — no component wrapper needed.',
          tree: {
            name: 'Test: useFetch', type: 'context',
            children: [
              { name: 'renderHook()', type: 'component', props: { from: '@testing-library/react' } },
              { name: 'mock fetch', type: 'component', props: { returns: '{ name: "Alice" }' } },
              { name: 'act() → assert', type: 'component', state: { result: '{ data, loading, error }' } },
            ],
          },
          code: `import { renderHook, act } from '@testing-library/react';\n\ntest('useFetch returns data', async () => {\n  global.fetch = jest.fn().mockResolvedValue({\n    json: () => Promise.resolve({ name: 'Alice' })\n  });\n\n  const { result } = renderHook(() =>\n    useFetch('/api/user')\n  );\n\n  expect(result.current.loading).toBe(true);\n  await act(async () => {}); // wait for effect\n  expect(result.current.data).toEqual({ name: 'Alice' });\n  expect(result.current.loading).toBe(false);\n});`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'Custom Hooks — Composition',
        time:  'O(1) hook call',
        space: 'O(1) per instance',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.ComponentTree.render(vizEl, step.tree);
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">HOOK EXTRACTION</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
