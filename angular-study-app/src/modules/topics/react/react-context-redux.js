/**
 * react-context-redux.js
 * Topic: Context API vs Redux — state management patterns, data flow
 */
(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-context-redux",
    area:  "react",
    title: "Context vs Redux",
    tag:   "State",
    tags:  ["react","context","redux","state-management","zustand","prop-drilling"],

    concept: `Context API: built-in React. Provider → Consumer. Any ancestor can pass data to any descendant.
Problem: every consumer re-renders when ANY part of the context value changes. Not selective.
Redux: external state container. Single store. State changed only via dispatched actions through a reducer.
Selectors: components subscribe to slices — only re-render when their slice changes.
Redux Toolkit (RTK) modernizes Redux: createSlice, createAsyncThunk, Immer for mutations.
Zustand: minimal store with hooks — simpler than Redux, more selective than Context.`,

    why: `Context is best for: theme, locale, auth user — low-frequency, global-ish data.
Redux/Zustand for: complex state with many actions, cross-feature data, optimistic updates, devtools.
Choosing wrong: Context for high-frequency state = re-render cascade; Redux for simple state = overengineering.`,

    example: {
      language: "javascript",
      code: `// Context (simple, but all consumers re-render)
const UserContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <Router />
    </UserContext.Provider>
  );
}

// Redux Toolkit (selective, scalable)
const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0, status: 'idle' },
  reducers: {
    increment: state => { state.value += 1; }, // Immer!
    decrement: state => { state.value -= 1; },
    reset:     state => { state.value = 0; },
  },
});

export const { increment, decrement, reset } = counterSlice.actions;

// Selector: only re-renders when value changes
const count = useSelector(state => state.counter.value);
const dispatch = useDispatch();

// Zustand (simplest)
const useStore = create((set) => ({
  count: 0,
  inc: () => set(state => ({ count: state.count + 1 })),
  dec: () => set(state => ({ count: state.count - 1 })),
}));
const { count, inc } = useStore(state => ({ count: state.count, inc: state.inc }));`,
    },

    interview: [
      "Why does Context cause unnecessary re-renders?",
      "What problem does Redux solve that Context does not?",
      "Explain the Redux data flow: action → reducer → store → component.",
      "What is Immer and how does Redux Toolkit use it?",
      "When would you choose Zustand over Redux?",
      "How do you optimize Context to prevent re-renders?",
    ],

    tradeoffs: {
      pros: {
        Context: ["Built-in, no deps", "Simple API", "Good for infrequent global state"],
        Redux: ["Selective subscriptions", "DevTools + time travel", "Middleware (thunk, saga)", "Predictable"],
        Zustand: ["Minimal boilerplate", "Selective by default", "Works outside React"],
      },
      cons: {
        Context: ["All consumers re-render on change", "No middleware", "No devtools"],
        Redux: ["Boilerplate (even with RTK)", "Learning curve", "Overkill for simple apps"],
        Zustand: ["Less ecosystem than Redux", "No time-travel devtools"],
      },
    },

    gotchas: [
      "Context: passing object as value = new ref every render = all consumers re-render. Memoize value.",
      "Redux: never mutate state directly — use RTK (Immer) or spread operator.",
      "useSelector re-runs on every dispatch — selector must return same ref if nothing changed.",
      "Redux middleware (thunk) runs between dispatch and reducer — async goes here.",
      "Split contexts by update frequency: AuthContext changes rarely, CartContext changes often.",
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: "render",
          narration: "Prop drilling: theme passed 4 levels deep through components that don't use it.",
          nodes: [
            { id: "app",     label: "App", sublabel: "theme=\"dark\"", type: "component", active: true },
            { id: "layout",  label: "Layout", sublabel: "theme=\"dark\" (pass-through)", type: "component", dim: true },
            { id: "sidebar", label: "Sidebar", sublabel: "theme=\"dark\" (pass-through)", type: "component", dim: true },
            { id: "button",  label: "ThemeButton", sublabel: "uses theme ✓", type: "component", active: true },
          ],
          edges: [
            { from: "app",     to: "layout",  label: "theme prop", active: true, color: "#f85149" },
            { from: "layout",  to: "sidebar", label: "theme prop", active: true, color: "#f85149" },
            { from: "sidebar", to: "button",  label: "theme prop", active: true, color: "#f85149" },
          ],
          code: "// Prop drilling — every intermediate component\n// must accept and pass theme even if unused:\n<App theme=\"dark\">\n  <Layout theme=\"dark\">       {/* just passing */}\n    <Sidebar theme=\"dark\">   {/* just passing */}\n      <ThemeButton theme=\"dark\" /> {/* finally uses it */}\n    </Sidebar>\n  </Layout>\n</App>",
        },
        {
          phase: "render",
          narration: "Context solution: Provider at top, useContext anywhere in tree. No prop drilling.",
          nodes: [
            { id: "prov",    label: "ThemeContext.Provider", sublabel: "value=\"dark\"", type: "context", active: true },
            { id: "layout",  label: "Layout", sublabel: "no theme prop", type: "component" },
            { id: "sidebar", label: "Sidebar", sublabel: "no theme prop", type: "component" },
            { id: "button",  label: "ThemeButton", sublabel: "useContext ✓", type: "component", active: true },
          ],
          edges: [
            { from: "prov",   to: "layout",  active: false },
            { from: "layout", to: "sidebar", active: false },
            { from: "prov",   to: "button",  label: "context", active: true, color: "#d2a8ff" },
          ],
          code: "const ThemeContext = createContext('light');\n\n// Provider at top:\n<ThemeContext.Provider value={theme}>\n  <Layout>    {/* no theme prop needed */}\n    <Sidebar> {/* no theme prop needed */}\n      <ThemeButton /> {/* reads from context */}\n    </Sidebar>\n  </Layout>\n</ThemeContext.Provider>\n\nfunction ThemeButton() {\n  const theme = useContext(ThemeContext); // ✓\n  return <button className={theme}>...</button>;\n}",
        },
        {
          phase: "update",
          narration: "Context problem: theme changes → ALL consumers re-render, even unrelated ones.",
          nodes: [
            { id: "prov",    label: "ThemeContext.Provider", sublabel: "value changed!", type: "context", active: true },
            { id: "button",  label: "ThemeButton", sublabel: "🔄 re-renders (correct)", type: "component", rerender: true },
            { id: "counter", label: "Counter", sublabel: "🔄 re-renders (wrong!)", type: "component", rerender: true },
            { id: "form",    label: "SearchForm", sublabel: "🔄 re-renders (wrong!)", type: "component", rerender: true },
          ],
          edges: [
            { from: "prov", to: "button",  active: true, color: "#f0883e", label: "re-render" },
            { from: "prov", to: "counter", active: true, color: "#f85149", label: "unnecessary" },
            { from: "prov", to: "form",    active: true, color: "#f85149", label: "unnecessary" },
          ],
          code: "// Context value = one object:\nconst value = { theme, setTheme, count, setCount };\n\n// Changing theme → ALL consumers re-render\n// Even Counter (only uses count)!\n\n// Fix: split by update frequency:\nconst ThemeCtx = createContext(); // changes rarely\nconst CountCtx = createContext(); // changes often\n\n// Now theme change only re-renders theme consumers",
        },
        {
          phase: "render",
          narration: "Redux flow: Action dispatched → Reducer computes new state → Store notifies selectors → Only relevant components re-render.",
          nodes: [
            { id: "comp",    label: "Component", sublabel: "dispatch(increment())", type: "component", active: true },
            { id: "action",  label: "Action", sublabel: "{ type: \"counter/increment\" }", type: "action", active: true },
            { id: "reducer", label: "Reducer", sublabel: "state.value += 1", type: "reducer", active: true },
            { id: "store",   label: "Store", sublabel: "{ counter: { value: 1 } }", type: "store", active: true },
            { id: "sel1",    label: "Counter component", sublabel: "useSelector → value changed", type: "selector", active: true },
            { id: "sel2",    label: "UserList component", sublabel: "selector unchanged → skip", type: "selector", dim: true },
          ],
          edges: [
            { from: "comp",    to: "action",  label: "dispatch", active: true, color: "#3fb950" },
            { from: "action",  to: "reducer", label: "",         active: true, color: "#3fb950" },
            { from: "reducer", to: "store",   label: "new state",active: true, color: "#ffa657" },
            { from: "store",   to: "sel1",    label: "changed",  active: true, color: "#58a6ff" },
            { from: "store",   to: "sel2",    label: "same ref", active: false },
          ],
          code: "// RTK slice:\nconst counterSlice = createSlice({\n  name: 'counter',\n  initialState: { value: 0 },\n  reducers: {\n    increment: state => { state.value += 1; },\n  },\n});\n\n// Component:\nconst value = useSelector(s => s.counter.value);\ndispatch(increment()); // triggers reducer\n\n// Only components whose selector result changed re-render",
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Context vs Redux Data Flow",
        time:  "O(1) dispatch",
        space: "O(n) subscribers",
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">STATE MANAGEMENT</div>
            ${window.ReactViz.codeBlock(step.code, "js")}`;
        },
      });
    },
  }]);
})();
