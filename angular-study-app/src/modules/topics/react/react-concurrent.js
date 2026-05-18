/**
 * react-concurrent.js
 * Topic: Concurrent Mode — time slicing, Suspense, transitions, useDeferredValue
 */
(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-concurrent",
    area:  "react",
    title: "Concurrent Mode",
    tag:   "Advanced",
    tags:  ["react","concurrent","suspense","transitions","use-deferred-value","time-slicing","scheduler"],

    concept: `Concurrent Mode lets React pause, resume, and abandon renders to keep the UI responsive.
Without Concurrent: renders block the main thread — long trees = janky scrolling, frozen inputs.
Time slicing: React splits rendering into 5ms chunks, yielding to browser between chunks.
Transitions (startTransition/useTransition): mark state updates as "non-urgent". React renders urgent updates first.
Suspense: let components "wait" for async data. Show fallback until data resolves.
useDeferredValue: delay updating a value until urgent work is done — like a debounce built into React.`,

    why: `Without concurrent features, a 1000-item list re-render blocks input for 200ms.
With startTransition, the user can keep typing while React renders the filtered list in the background.
Suspense eliminates loading state management boilerplate — declare "what to show while loading" declaratively.`,

    example: {
      language: "javascript",
      code: `// Enable concurrent mode (React 18+)
const root = createRoot(document.getElementById('root'));
root.render(<App />);

// startTransition: mark update as non-urgent
import { startTransition, useTransition } from 'react';

const [isPending, startTransition] = useTransition();

// Typing in search box (urgent):
setQuery(e.target.value); // ← always urgent (immediate)

// Filtering 10k items (non-urgent):
startTransition(() => {
  setFilteredResults(items.filter(...)); // ← can be interrupted
});

// isPending = true while transition is in progress
{isPending && <Spinner />}

// Suspense: wait for async data
function Profile() {
  const user = use(fetchUser(id)); // throws Promise if not ready
  return <h1>{user.name}</h1>;
}

<Suspense fallback={<Skeleton />}>
  <Profile />      // suspended until fetchUser resolves
</Suspense>

// useDeferredValue: show stale results while computing new
const deferredQuery = useDeferredValue(query);
const results = useMemo(() =>
  filter(items, deferredQuery), [deferredQuery]
);`,
    },

    interview: [
      "What is time slicing and how does React implement it?",
      "Difference between startTransition and debounce?",
      "How does Suspense know when to show the fallback?",
      "What is useDeferredValue and when to use it over startTransition?",
      "What is the React Scheduler and how does it prioritize work?",
      "Can Suspense be used for code-splitting? How?",
    ],

    tradeoffs: {
      pros: ["Keeps UI responsive during heavy renders", "Declarative loading states with Suspense", "No manual debouncing needed"],
      cons: ["React 18+ only", "startTransition cannot wrap async code", "Suspense requires library support (React Query, Relay)"],
    },

    gotchas: [
      "startTransition cannot be used with async/await — the function must be synchronous.",
      "Transitions do NOT delay urgent updates — only the marked update is deferred.",
      "Suspense boundaries must be placed intentionally — too high = full page flash.",
      "useDeferredValue shows STALE data while new data loads — indicate staleness to user.",
      "createRoot() is required for concurrent features — legacy render() opts out.",
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: "render",
          narration: "Legacy mode: 10k-item filter blocks main thread for 180ms. Input freezes — terrible UX.",
          nodes: [
            { id: "input",   label: "Input", sublabel: "user types \"re\"", type: "component", active: true },
            { id: "render",  label: "Render 10k items", sublabel: "⛔ blocks 180ms", type: "reducer", active: true },
            { id: "paint",   label: "Browser Paint", sublabel: "waiting...", type: "network", dim: true },
            { id: "input2",  label: "Next Keystroke", sublabel: "⛔ delayed 180ms", type: "component", dim: true },
          ],
          edges: [
            { from: "input",  to: "render", label: "setState", active: true, color: "#f85149" },
            { from: "render", to: "paint",  label: "after render", active: false },
            { from: "paint",  to: "input2", label: "", active: false },
          ],
          code: "// Legacy React:\nsetFilteredItems(items.filter(...)); // synchronous\n// React renders ALL 10k items before anything else\n// Input event queue backed up\n// User types \"rea\" but sees \"r\" for 540ms",
        },
        {
          phase: "render",
          narration: "Concurrent mode: startTransition marks filter as non-urgent. Input updates immediately.",
          nodes: [
            { id: "input",   label: "Input", sublabel: "user types \"re\"", type: "component", active: true },
            { id: "urgent",  label: "setQuery(\"re\")", sublabel: "✓ renders instantly", type: "action", active: true },
            { id: "trans",   label: "startTransition", sublabel: "filter = non-urgent", type: "selector", active: true },
            { id: "paint",   label: "Browser Paint", sublabel: "input shows \"re\"", type: "network", active: true },
            { id: "filter",  label: "Filter 10k items", sublabel: "runs in background", type: "component" },
          ],
          edges: [
            { from: "input",  to: "urgent",  label: "urgent", active: true, color: "#3fb950" },
            { from: "input",  to: "trans",   label: "non-urgent", active: true, color: "#d2a8ff" },
            { from: "urgent", to: "paint",   label: "", active: true, color: "#3fb950" },
            { from: "trans",  to: "filter",  label: "deferred", active: true, color: "#d2a8ff" },
          ],
          code: "// React 18 concurrent:\nfunction handleChange(e) {\n  setQuery(e.target.value); // urgent — immediate\n\n  startTransition(() => {\n    setFiltered(items.filter(x => // non-urgent\n      x.name.includes(e.target.value)\n    ));\n  });\n}",
        },
        {
          phase: "suspend",
          narration: "Time slicing: React splits 10k render into 5ms chunks, yielding to browser between each.",
          nodes: [
            { id: "chunk1", label: "Chunk 1", sublabel: "items 0–200 (5ms)", type: "component", active: true },
            { id: "yield1", label: "Yield to Browser", sublabel: "check input events", type: "network", active: true },
            { id: "chunk2", label: "Chunk 2", sublabel: "items 200–400 (5ms)", type: "component", active: true },
            { id: "yield2", label: "Yield Again", sublabel: "new keystroke?", type: "network", active: true },
            { id: "abandon",label: "Abandon!", sublabel: "new input → restart", type: "reducer", active: true },
          ],
          edges: [
            { from: "chunk1", to: "yield1", active: true, color: "#58a6ff" },
            { from: "yield1", to: "chunk2", active: true, color: "#58a6ff" },
            { from: "chunk2", to: "yield2", active: true, color: "#58a6ff" },
            { from: "yield2", to: "abandon",active: true, color: "#f85149", label: "interrupted!" },
          ],
          code: "// React Scheduler (simplified):\nwhile (hasWork) {\n  performUnitOfWork(fiber); // 1 fiber = 1 unit\n  if (shouldYield()) {\n    // time slice > 5ms — pause!\n    yield; // give browser control\n    // check: is there higher priority work?\n  }\n}\n// If new urgent update arrives → abandon transition",
        },
        {
          phase: "resolve",
          narration: "Suspense: Profile component \"suspends\" by throwing a Promise. Suspense catches it, shows fallback.",
          nodes: [
            { id: "suspense", label: "Suspense", sublabel: "catches thrown Promise", type: "context", active: true },
            { id: "profile",  label: "Profile", sublabel: "throws Promise!", type: "component", active: true },
            { id: "fallback", label: "Fallback", sublabel: "<Skeleton />", type: "component", active: true },
            { id: "resolve",  label: "Data Resolves", sublabel: "Promise fulfilled", type: "server", active: false },
            { id: "content",  label: "Profile renders", sublabel: "with real data", type: "component", dim: true },
          ],
          edges: [
            { from: "profile",  to: "suspense", label: "throws Promise", active: true, color: "#f0883e" },
            { from: "suspense", to: "fallback",  label: "shows", active: true, color: "#d2a8ff" },
            { from: "resolve",  to: "suspense",  label: "notifies", active: false },
            { from: "suspense", to: "content",   label: "retry render", active: false },
          ],
          code: "// Suspense-compatible data fetching:\nfunction Profile({ id }) {\n  const user = use(fetchUser(id));\n  // If data not ready: throws Promise\n  // React catches it, shows fallback\n  return <h1>{user.name}</h1>;\n}\n\n<Suspense fallback={<Skeleton />}>\n  <Profile id={userId} />\n</Suspense>",
        },
        {
          phase: "idle",
          narration: "useDeferredValue: shows stale results while computing fresh ones. User sees previous results, not spinner.",
          nodes: [
            { id: "query",    label: "query", sublabel: "\"react hooks\"", type: "component", active: true },
            { id: "deferred", label: "deferredQuery", sublabel: "\"react\" (stale)", type: "hook", active: true },
            { id: "results",  label: "Results", sublabel: "based on deferredQuery", type: "component", active: true },
            { id: "pending",  label: "Computing", sublabel: "new results for \"react hooks\"", type: "network", dim: true },
          ],
          edges: [
            { from: "query",   to: "deferred", label: "useDeferredValue", active: true, color: "#d2a8ff" },
            { from: "deferred",to: "results",  label: "stale render", active: true, color: "#768390" },
            { from: "query",   to: "pending",  label: "computing", active: false },
          ],
          code: "const deferredQuery = useDeferredValue(query);\nconst isStale = query !== deferredQuery;\n\nconst results = useMemo(() =>\n  items.filter(x => x.includes(deferredQuery)),\n  [deferredQuery]\n);\n\n// Indicate stale state to user:\n<ResultList\n  style={{ opacity: isStale ? 0.5 : 1 }}\n  results={results}\n/>",
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Concurrent Mode & Suspense",
        time:  "O(n) chunks of 5ms",
        space: "O(n) work queue",
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">CONCURRENT REACT</div>
            ${window.ReactViz.codeBlock(step.code, "js")}`;
        },
      });
    },
  }]);
})();
