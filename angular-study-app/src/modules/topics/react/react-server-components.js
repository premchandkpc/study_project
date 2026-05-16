/**
 * react-server-components.js
 * Topic: React Server Components — RSC architecture, streaming, hydration
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-server-components',
    area:  'react',
    title: 'Server Components (RSC)',
    tag:   'Architecture',
    tags:  ['react','rsc','server-components','streaming','hydration','next.js'],

    concept: `React Server Components (RSC) run on the server — never sent to the browser.
They can: directly query databases, read files, use server-only secrets.
They CANNOT: use hooks, handle events, use browser APIs.
Client Components ('use client') run in browser — same as traditional React. Use for interactivity.
Streaming: RSC can stream HTML chunks to the browser progressively — no waiting for full page.
Selective hydration: React only hydrates Client Components — server components are pure HTML, zero JS bundle.`,

    why: `RSC eliminates the "waterfall" problem: browser fetches JS → JS fetches data → renders.
With RSC: server fetches data → streams HTML → browser renders immediately, no round-trip.
Bundle size: server-only code (DB clients, heavy libs) never ships to browser — smaller JS bundle.`,

    example: {
      language: 'javascript',
      code: `// Server Component (default in Next.js 13+)
// No 'use client' — runs on server only
async function BlogPost({ id }) {
  // ✓ Direct DB access — no API needed!
  const post = await db.posts.findById(id);
  // ✓ fs, secrets, server-only packages
  return (
    <article>
      <h1>{post.title}</h1>
      <Content mdx={post.content} />
      {/* Client Component for interactivity */}
      <LikeButton postId={id} />
    </article>
  );
}

// Client Component — has interactivity
'use client';
function LikeButton({ postId }) {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => {
      setLiked(true);
      fetch(\`/api/like/\${postId}\`, { method: 'POST' });
    }}>
      {liked ? '❤️' : '🤍'} Like
    </button>
  );
}

// Streaming with Suspense:
<Suspense fallback={<PostSkeleton />}>
  <BlogPost id={params.id} />  {/* streams when ready */}
</Suspense>`,
    },

    interview: [
      'What can a Server Component do that a Client Component cannot?',
      'How does RSC reduce bundle size?',
      'What is streaming and how does it improve TTFB?',
      'Can a Server Component import a Client Component? Vice versa?',
      'What is selective hydration?',
      'How does RSC differ from SSR (getServerSideProps)?',
    ],

    tradeoffs: {
      pros: ['Zero JS shipped for server components', 'Direct DB access without API layer', 'Progressive streaming HTML', 'Smaller client bundle'],
      cons: ['No hooks or event handlers in server components', 'Mental model complexity (two environments)', 'Framework-specific (Next.js App Router)', 'Debugging harder across server/client boundary'],
    },

    gotchas: [
      '"use client" marks a component AND all its imports as client — be careful.',
      'Server components cannot pass functions as props to client components (not serializable).',
      'Data fetched in server component is not reactive — page must refresh to update.',
      'Third-party libs without "use client" assume server by default in RSC — may break.',
      'Context providers must be client components — wrap at boundaries carefully.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'Traditional SSR: browser → JS → fetch API → data → render. Multiple round-trips, slow.',
          nodes: [
            { id: 'browser', label: 'Browser', type: 'client', active: true },
            { id: 'js',      label: 'Download JS', sublabel: '~500KB', type: 'network', active: true },
            { id: 'api',     label: 'Fetch API', sublabel: '/api/posts', type: 'network', active: true },
            { id: 'render',  label: 'React renders', sublabel: 'CSR', type: 'component', active: true },
          ],
          edges: [
            { from: 'browser', to: 'js',     label: '1. load', active: true },
            { from: 'js',      to: 'api',    label: '2. fetch', active: true },
            { from: 'api',     to: 'render', label: '3. data', active: true },
          ],
          code: `// Traditional CSR:\n// 1. Browser downloads React bundle\n// 2. React mounts, calls useEffect\n// 3. fetch('/api/posts') — network round-trip\n// 4. Data arrives, re-renders\n\n// Problem: 3 sequential steps before user sees content\n// TTFB: fast  FCP: slow  TTI: slow`,
        },
        {
          phase: 'render',
          narration: 'RSC architecture: Server runs components, streams HTML. Browser gets content immediately.',
          nodes: [
            { id: 'server',  label: 'Server', sublabel: 'Node.js / Edge', type: 'server', active: true },
            { id: 'db',      label: 'Database', sublabel: 'direct query', type: 'cache', active: true },
            { id: 'rsc',     label: 'RSC render', sublabel: 'async components', type: 'component', active: true },
            { id: 'stream',  label: 'Stream HTML', sublabel: 'progressive chunks', type: 'network', active: true },
            { id: 'browser', label: 'Browser', sublabel: 'renders HTML immediately', type: 'client', active: true },
          ],
          edges: [
            { from: 'server',  to: 'db',      label: 'direct', active: true, color: '#3fb950' },
            { from: 'db',      to: 'rsc',     label: 'data', active: true, color: '#3fb950' },
            { from: 'rsc',     to: 'stream',  label: 'HTML', active: true, color: '#58a6ff' },
            { from: 'stream',  to: 'browser', label: 'chunks', active: true, color: '#58a6ff' },
          ],
          code: `// RSC — runs on server:\nasync function BlogPost({ id }) {\n  const post = await db.posts.findById(id); // direct!\n  return <article>{post.title}</article>;\n}\n\n// Server streams HTML chunk by chunk\n// No API needed\n// DB client never ships to browser`,
        },
        {
          phase: 'suspend',
          narration: 'Streaming: fast components stream first, slow ones show fallback → swap when ready.',
          nodes: [
            { id: 'layout',   label: 'Layout', sublabel: '⚡ streams first (fast)', type: 'component', active: true },
            { id: 'susp',     label: 'Suspense', sublabel: 'wraps slow component', type: 'context', active: true },
            { id: 'skeleton', label: 'Skeleton', sublabel: 'shown immediately', type: 'component', active: true },
            { id: 'slow',     label: 'SlowFeed', sublabel: 'fetching... 800ms', type: 'network', dim: true },
            { id: 'final',    label: 'SlowFeed', sublabel: 'streams when ready', type: 'component', dim: true },
          ],
          edges: [
            { from: 'layout',   to: 'susp',     label: 'contains', active: true },
            { from: 'susp',     to: 'skeleton',  label: 'shows fallback', active: true, color: '#d2a8ff' },
            { from: 'slow',     to: 'final',     label: 'resolves', active: false },
            { from: 'susp',     to: 'final',     label: 'swaps in', active: false },
          ],
          code: `// Streaming with Suspense:\n<Layout> {/* streams immediately */}\n  <Header />\n  <Suspense fallback={<FeedSkeleton />}>\n    <SlowFeed /> {/* streams when DB query done */}\n  </Suspense>\n</Layout>\n\n// Browser renders layout + skeleton NOW\n// SlowFeed HTML streams in 800ms later\n// React swaps skeleton → content (no flash)`,
        },
        {
          phase: 'commit',
          narration: 'Selective hydration: only Client Components get JS hydration. Server components = static HTML, zero JS.',
          nodes: [
            { id: 'html',    label: 'HTML from Server', sublabel: 'full page HTML', type: 'server', active: true },
            { id: 'sc',      label: 'BlogPost (server)', sublabel: '✓ static HTML — no JS', type: 'component', active: true },
            { id: 'cc',      label: 'LikeButton (client)', sublabel: 'needs hydration', type: 'component', active: true },
            { id: 'js',      label: 'JS Bundle', sublabel: 'LikeButton only (~2KB)', type: 'network', active: true },
            { id: 'hydrate', label: 'Hydrate', sublabel: 'attach event handlers', type: 'action', active: true },
          ],
          edges: [
            { from: 'html',    to: 'sc',      label: 'no JS needed', active: true, color: '#3fb950' },
            { from: 'html',    to: 'cc',      label: 'needs JS', active: true, color: '#f0883e' },
            { from: 'js',      to: 'hydrate', label: 'downloads', active: true, color: '#f0883e' },
            { from: 'hydrate', to: 'cc',      label: 'activates', active: true, color: '#58a6ff' },
          ],
          code: `// Bundle comparison:\n// Traditional: App.js (500KB)\n//   BlogPost + LikeButton + db-client + marked\n\n// RSC bundle: (18KB)\n//   LikeButton only!\n//   db-client → stays on server\n//   marked (markdown) → stays on server\n\n// Selective hydration:\n// Server HTML → already visible\n// React only hydrates 'use client' subtree`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'React Server Components',
        time:  'O(1) client bundle',
        space: 'O(n) HTML stream',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">RSC ARCHITECTURE</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
