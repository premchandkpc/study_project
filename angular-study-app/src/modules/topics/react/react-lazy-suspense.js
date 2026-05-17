(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-lazy-suspense',
    area:  'react',
    title: 'React.lazy + Suspense',
    tag:   'Performance',
    tags:  ['react', 'lazy', 'suspense', 'code-splitting', 'dynamic-import'],

    concept: `React.lazy() wraps a dynamic import() to create a lazily-loaded component. Suspense catches the thrown Promise (React's internal mechanism) and renders a fallback while the chunk loads. On first render, the lazy component suspends → Suspense shows fallback → chunk loads → Promise resolves → component renders. Code splitting reduces initial bundle size.`,

    why: `Large apps ship one giant bundle by default. React.lazy + dynamic import() split code at route or feature boundaries. Users load only code they need — critical for performance on mobile/slow connections. Works with Vite, webpack, and Parcel.`,

    example: {
      language: 'javascript',
      code: `import { lazy, Suspense } from 'react';

// Chunk only loaded when AdminPanel is first rendered
const AdminPanel = lazy(() => import('./AdminPanel'));
const UserDashboard = lazy(() => import('./UserDashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/dashboard" element={<UserDashboard />} />
      </Routes>
    </Suspense>
  );
}

// Fine-grained Suspense boundaries:
function Layout() {
  return (
    <>
      <Navbar />                     {/* always fast */}
      <Suspense fallback={<Skeleton />}>
        <LazyFeature />               {/* suspends independently */}
      </Suspense>
    </>
  );
}`,
    },

    interview: [
      'How does React.lazy work internally (what does it throw)?',
      'Where must Suspense be placed relative to lazy components?',
      'Can you use React.lazy with named exports?',
      'How do you combine lazy loading with React Router v6?',
      'What is the difference between Suspense for data fetching vs code splitting?',
    ],

    tradeoffs: {
      pros: [
        'Reduces initial bundle — users only load code they visit',
        'Zero runtime overhead — pure build-time split',
        'Works with any bundler supporting dynamic import()',
        'Nested Suspense boundaries give granular loading states',
      ],
      cons: [
        'First visit to a lazy route has loading delay (waterfall)',
        'React.lazy only works with default exports',
        'SSR requires additional setup (dynamic() in Next.js)',
        'Chunk waterfall: lazy loads another lazy → two round trips',
      ],
    },

    gotchas: [
      'React.lazy() must be called at module level — not inside components or conditionals',
      'Only default exports supported — wrap named exports: () => import("./X").then(m => ({default: m.Foo}))',
      'Suspense fallback renders for ALL suspended children — nest boundaries for granularity',
      'Error during chunk load not caught by Suspense — needs ErrorBoundary wrapping it',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — Initial load. App bundle arrives (main.js). AdminPanel is NOT in this bundle — it\'s a separate chunk.',
          nodes: [
            { id: 'browser',  label: 'Browser',           type: 'client',    active: true },
            { id: 'mainjs',   label: 'main.js loaded\n(App + Routes)',    type: 'component', active: true },
            { id: 'admin',    label: 'AdminPanel chunk\n(NOT loaded yet)', type: 'cache',     active: false, dim: true },
            { id: 'lazy',     label: 'lazy(() => import("./AdminPanel"))', type: 'hook',      active: true },
          ],
          edges: [
            { from: 'browser', to: 'mainjs', label: 'GET main.js', active: true },
            { from: 'mainjs',  to: 'lazy',   label: 'defines', active: true },
          ],
          code: `// Bundler (Vite/webpack) sees dynamic import()
// Splits AdminPanel into separate chunk: admin.chunk.js
const AdminPanel = lazy(() => import('./AdminPanel'));

// main.js: ~50KB  (App, Router, Navbar...)
// admin.chunk.js: ~120KB (AdminPanel, its deps)
// admin.chunk.js NOT downloaded until AdminPanel renders`,
        },
        {
          phase: 'suspend',
          narration: 'Step 2 — User navigates to /admin. React renders AdminPanel → lazy component throws a Promise → Suspense catches it → shows fallback.',
          nodes: [
            { id: 'route',    label: 'Route: /admin',        type: 'client',    active: true },
            { id: 'react',    label: 'React renders\n<AdminPanel>',  type: 'component', active: true },
            { id: 'lazy2',    label: 'lazy throws Promise!',  type: 'reducer',   active: true },
            { id: 'suspense', label: '<Suspense>',            type: 'provider',  active: true },
            { id: 'fallback', label: '<Spinner /> shown',     type: 'component', active: true },
          ],
          edges: [
            { from: 'route',    to: 'react',    label: 'render', active: true },
            { from: 'react',    to: 'lazy2',    label: 'first render', active: true },
            { from: 'lazy2',    to: 'suspense', label: 'throw Promise', active: true, color: '#d2a8ff' },
            { from: 'suspense', to: 'fallback', label: 'show fallback', active: true, color: '#ffa657' },
          ],
          code: `// Internally, React.lazy works like:
function lazy(factory) {
  let status = 'pending';
  let result;
  const promise = factory().then(mod => {
    status = 'fulfilled';
    result = mod.default;
  });

  return function LazyComponent() {
    if (status === 'pending') throw promise;  // Suspense catches this!
    if (status === 'rejected') throw result;
    return React.createElement(result, ...);
  };
}

// Suspense: "I see a thrown Promise — show fallback"
<Suspense fallback={<Spinner />}>
  <AdminPanel />   {/* throws on first render */}
</Suspense>`,
        },
        {
          phase: 'effect',
          narration: 'Step 3 — Browser downloads admin.chunk.js while Spinner shows. Network request happens in background.',
          nodes: [
            { id: 'spinner',  label: '<Spinner /> visible',  type: 'component', active: true },
            { id: 'network',  label: 'GET admin.chunk.js',   type: 'network',   active: true },
            { id: 'chunk',    label: 'admin.chunk.js',       type: 'cache',     active: true },
            { id: 'parse',    label: 'Parse + eval JS',      type: 'component', active: false },
          ],
          edges: [
            { from: 'spinner',  to: 'network', label: 'background', active: true },
            { from: 'network',  to: 'chunk',   label: '~120KB', active: true, color: '#ffa657' },
            { from: 'chunk',    to: 'parse',   label: 'module eval', active: false },
          ],
          code: `// Network waterfall:
// 1. main.js loads  → app renders → /admin navigated
// 2. admin.chunk.js fetched → parsed → AdminPanel available

// Preload hint (avoid waterfall):
// Vite/webpack magic comments:
const AdminPanel = lazy(() =>
  import(/* webpackPrefetch: true */ './AdminPanel')
);
// Browser prefetches chunk during idle time`,
        },
        {
          phase: 'resolve',
          narration: 'Step 4 — Chunk loaded. Promise resolves. React re-renders. Suspense swaps fallback for real AdminPanel.',
          nodes: [
            { id: 'promise',  label: 'Promise resolves',     type: 'action',    active: true },
            { id: 'react2',   label: 'React scheduled\nre-render',    type: 'component', active: true },
            { id: 'suspense2',label: '<Suspense>',            type: 'provider',  active: true },
            { id: 'admin2',   label: '<AdminPanel /> renders', type: 'component', active: true },
            { id: 'spinner2', label: '<Spinner /> unmounted',  type: 'component', dim: true },
          ],
          edges: [
            { from: 'promise',  to: 'react2',    label: 'wakeup', active: true, color: '#3fb950' },
            { from: 'react2',   to: 'suspense2', label: 're-render', active: true },
            { from: 'suspense2',to: 'admin2',    label: 'show', active: true, color: '#3fb950' },
            { from: 'suspense2',to: 'spinner2',  label: 'unmount', active: true, color: '#f85149' },
          ],
          code: `// After chunk loads:
// status = 'fulfilled', result = AdminPanel component
// React retries render of lazy component
// This time: if (status === 'fulfilled') return AdminPanel(props)
// Suspense sees no thrown Promise → removes fallback → shows AdminPanel

// Second visit to /admin: chunk already cached
// No network request, no Suspense, immediate render`,
        },
        {
          phase: 'render',
          narration: 'Step 5 — Nested Suspense boundaries. Each lazy section suspends independently — partial loading, not full-page spinner.',
          nodes: [
            { id: 'app',      label: 'App',                 type: 'component', active: true },
            { id: 'nav',      label: 'Navbar (always fast)', type: 'component', active: true },
            { id: 'sb1',      label: '<Suspense> boundary 1', type: 'provider', active: true },
            { id: 'feat1',    label: 'LazyFeature ✓ loaded', type: 'component', active: true },
            { id: 'sb2',      label: '<Suspense> boundary 2', type: 'provider', active: true },
            { id: 'feat2',    label: 'LazyChart loading...', type: 'cache',     active: true },
          ],
          edges: [
            { from: 'app',  to: 'nav',   label: '', active: true },
            { from: 'app',  to: 'sb1',   label: '', active: true },
            { from: 'sb1',  to: 'feat1', label: 'renders', active: true, color: '#3fb950' },
            { from: 'app',  to: 'sb2',   label: '', active: true },
            { from: 'sb2',  to: 'feat2', label: 'fallback', active: true, color: '#ffa657' },
          ],
          code: `// Nested boundaries: partial loading states
function Dashboard() {
  return (
    <>
      <Navbar />           {/* never suspends */}
      <Suspense fallback={<Skeleton />}>
        <LazyFeature />    {/* suspends independently */}
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <LazyChart />      {/* suspends independently */}
      </Suspense>
    </>
  );
}
// LazyFeature can show while LazyChart still loads`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'React.lazy + Suspense',
        time:  'O(1) after cache',
        space: 'O(chunks)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'js');
        },
      });
    },
  }]);
})();
