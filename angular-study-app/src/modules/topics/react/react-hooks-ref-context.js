/**
 * react-hooks-ref-context.js
 * Topic: useRef & useContext — mutable refs, DOM access, context propagation
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-hooks-ref-context',
    area:  'react',
    title: 'useRef & useContext',
    tag:   'Hooks',
    tags:  ['react','useref','usecontext','context-api','dom','mutable-ref'],

    concept: `useRef returns a mutable object { current: value } that persists across renders WITHOUT causing re-renders.
Two uses: (1) DOM access — attach ref to element to call .focus()/.scrollIntoView()/.getBoundingClientRect()
           (2) Mutable storage — store previous values, timers, instance variables.
useContext subscribes a component to a Context. Any component in the provider tree can consume values without prop drilling.
Context re-renders ALL consumers when value changes — use memoization or split contexts to optimize.`,

    why: `useRef solves the "I need to talk to the DOM" problem without breaking React's declarative model.
Context solves prop drilling — passing data 5 levels deep through components that don't care about it.
Context is NOT a replacement for Redux — it has no middleware, no time-travel, no selective subscriptions.`,

    example: {
      language: 'javascript',
      code: `// useRef: DOM access
const inputRef = useRef(null);
useEffect(() => {
  inputRef.current.focus(); // access real DOM node
}, []);
<input ref={inputRef} />

// useRef: mutable value (no re-render)
const countRef = useRef(0);
const handleClick = () => {
  countRef.current += 1; // mutate! doesn't re-render
  console.log(countRef.current);
};

// useRef: previous value pattern
const prevCount = useRef(count);
useEffect(() => { prevCount.current = count; });
// prevCount.current is the value from last render

// useContext: consume context
const theme = useContext(ThemeContext);
// ThemeContext.Provider must be an ancestor

// Context setup
const ThemeContext = createContext('light');
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext.Provider value={theme}>
      <DeepChild /> {/* no prop drilling needed */}
    </ThemeContext.Provider>
  );
}`,
    },

    interview: [
      'Does changing ref.current cause a re-render?',
      'When would you use useRef instead of useState?',
      'How do you forward a ref to a child component?',
      'What is the performance problem with Context?',
      'How do you prevent unnecessary Context re-renders?',
      'Difference between Context and Redux?',
    ],

    tradeoffs: {
      pros: ['useRef: direct DOM access without state', 'Context: eliminates prop drilling', 'Context: built-in, no deps'],
      cons: ['Context: all consumers re-render on value change', 'useRef mutations are invisible to React', 'Context not selective — no per-field subscriptions'],
    },

    gotchas: [
      'ref.current changes do NOT cause re-render — reading stale ref in render is a bug.',
      'Context value should be memoized — {value, setValue} object literal = new ref every render.',
      'forwardRef needed to pass ref to function components.',
      'Avoid putting large objects in context — every consumer re-renders on change.',
      'createContext(defaultValue) — default only used when NO provider is found above in tree.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'useRef creates {current: null} box — persists across renders, never triggers re-renders.',
          nodes: [
            { id: 'comp',  label: 'SearchInput', sublabel: 'function component', type: 'component', active: true },
            { id: 'ref',   label: 'useRef(null)', sublabel: '{ current: null }', type: 'hook', active: true },
            { id: 'dom',   label: '<input>', sublabel: 'DOM element', type: 'client', active: false },
          ],
          edges: [
            { from: 'comp', to: 'ref', label: 'creates', active: true },
            { from: 'comp', to: 'dom', label: 'renders', active: false },
          ],
          code: `function SearchInput() {\n  const inputRef = useRef(null); // ← {current: null}\n  // ref persists across renders\n  // changing ref.current does NOT re-render\n  return <input ref={inputRef} />;\n}`,
        },
        {
          phase: 'mount',
          narration: 'After mount: React sets inputRef.current = the actual DOM <input> node.',
          nodes: [
            { id: 'comp',  label: 'SearchInput', sublabel: 'mounted', type: 'component' },
            { id: 'ref',   label: 'inputRef', sublabel: '{ current: <input> }', type: 'hook', active: true },
            { id: 'dom',   label: '<input>', sublabel: 'DOM node', type: 'client', active: true, highlight: true },
          ],
          edges: [
            { from: 'ref', to: 'dom', label: '.current →', active: true, color: '#58a6ff' },
          ],
          code: `useEffect(() => {\n  // After mount, ref.current = real DOM node\n  inputRef.current.focus(); // ← call DOM API directly\n  inputRef.current.getBoundingClientRect();\n  inputRef.current.scrollIntoView();\n}, []); // run once after mount`,
        },
        {
          phase: 'idle',
          narration: 'useRef as mutable storage: store previous count. Mutation is instant, no re-render, no async.',
          nodes: [
            { id: 'comp',  label: 'Counter', type: 'component', state: { count: 5 } },
            { id: 'ref',   label: 'prevRef', sublabel: '{ current: 4 }', type: 'hook', active: true },
            { id: 'state', label: 'useState', sublabel: 'count: 5', type: 'hook' },
          ],
          edges: [
            { from: 'state', to: 'comp', label: 'triggers render', active: true },
            { from: 'comp',  to: 'ref',  label: 'reads prev', active: true },
          ],
          code: `const [count, setCount] = useState(0);\nconst prevRef = useRef(count);\n\nuseEffect(() => {\n  prevRef.current = count; // update AFTER render\n});\n\n// During render:\nconsole.log(count);          // 5 (current)\nconsole.log(prevRef.current); // 4 (previous)`,
        },
        {
          phase: 'render',
          narration: 'Context: Provider wraps tree. Any descendant can consume the value — no prop drilling.',
          nodes: [
            { id: 'app',     label: 'App',     type: 'component', active: true },
            { id: 'prov',    label: 'ThemeContext.Provider', sublabel: 'value="dark"', type: 'context', active: true },
            { id: 'layout',  label: 'Layout',  type: 'component' },
            { id: 'sidebar', label: 'Sidebar', type: 'component' },
            { id: 'button',  label: 'ThemeButton', sublabel: 'useContext(ThemeContext)', type: 'component', active: true },
          ],
          edges: [
            { from: 'app',    to: 'prov',    active: true, label: 'creates' },
            { from: 'prov',   to: 'layout',  active: true, label: 'tree' },
            { from: 'layout', to: 'sidebar', active: true },
            { from: 'sidebar',to: 'button',  active: true },
            { from: 'prov',   to: 'button',  active: true, color: '#d2a8ff', label: 'context flow' },
          ],
          code: `const ThemeContext = createContext('light');\n\nfunction App() {\n  const [theme, setTheme] = useState('dark');\n  return (\n    <ThemeContext.Provider value={theme}>\n      <Layout> {/* doesn't use theme */}\n        <Sidebar> {/* doesn't use theme */}\n          <ThemeButton /> {/* useContext! */}\n        </Sidebar>\n      </Layout>\n    </ThemeContext.Provider>\n  );\n}`,
        },
        {
          phase: 'update',
          narration: 'Context value changes → ALL consumers re-render, even if they use a different part of the value!',
          nodes: [
            { id: 'app',     label: 'App',     type: 'component', rerender: true },
            { id: 'prov',    label: 'ThemeContext.Provider', sublabel: 'value="light"', type: 'context', active: true },
            { id: 'layout',  label: 'Layout',  type: 'component' },
            { id: 'sidebar', label: 'Sidebar', type: 'component' },
            { id: 'button1', label: 'ThemeButton', sublabel: '← re-renders', type: 'component', rerender: true },
            { id: 'button2', label: 'SizeButton',  sublabel: '← re-renders too!', type: 'component', rerender: true },
          ],
          edges: [
            { from: 'prov', to: 'button1', active: true, color: '#f0883e', label: 're-render!' },
            { from: 'prov', to: 'button2', active: true, color: '#f0883e', label: 're-render!' },
          ],
          code: `// PROBLEM: Context is one object\nconst ctx = { theme, setTheme, fontSize, setFontSize };\n// Changing theme → ALL consumers re-render\n// Even components that only use fontSize!\n\n// FIX: split into separate contexts\nconst ThemeContext  = createContext();\nconst FontContext   = createContext();\n// Now theme change only re-renders theme consumers`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'useRef & useContext',
        time:  'O(1) ref read',
        space: 'O(n) subscribers',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          } else if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          }
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">CODE</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
