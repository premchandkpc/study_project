(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-router-v6",
    area:  "react",
    title: "React Router v6",
    tag:   "Routing",
    tags:  ["react", "router", "navigation", "spa"],

    concept: "React Router v6 uses a declarative, nested route tree. The <Routes> component matches the current URL against route definitions and renders the deepest matching <Route>. Layouts wrap child routes via <Outlet>. Navigation happens with useNavigate() hook or <Link>. Loaders (React Router 6.4+) fetch data before a route renders.",

    why: "Every SPA needs client-side routing. Router v6 eliminates Switch, makes nested layouts trivial via Outlet, and the 6.4 data APIs (loader/action) co-locate fetching with route definitions — removing waterfall fetching.",

    example: {
      language: "javascript",
      code: `import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,   // renders <Outlet/>
    children: [
      { index: true, element: <Home /> },
      {
        path: 'users',
        element: <UsersLayout />,
        loader: async () => fetch('/api/users'),
        children: [
          { path: ':id', element: <UserDetail />, loader: ({ params }) => fetchUser(params.id) },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}`,
    },

    interview: [
      "How does React Router v6 differ from v5? (no Switch, nested routes, Outlet)",
      "What is the purpose of <Outlet>?",
      "How do loaders work and what problem do they solve?",
      "Difference between useNavigate and <Link>?",
      "How do you protect a route with authentication in v6?",
    ],

    tradeoffs: {
      pros: [
        "Nested routes + Outlet eliminate complex conditional rendering",
        "Relative paths by default — cleaner child route definitions",
        "loaders/actions (6.4+) co-locate data fetching with routes",
        "useMatches for breadcrumb-style composition",
      ],
      cons: [
        "Loaders (6.4+) couple data fetching to routing layer",
        "Memory router needed for SSR/testing",
        "Migration from v5 requires rewriting Switch → Routes",
      ],
    },

    gotchas: [
      "Outlet must be in the parent route element or children never render",
      "index routes (index: true) match \"/\" exactly — no path property",
      "useNavigate() only works inside RouterProvider tree",
      "Loader errors need errorElement on route or they silently fail",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — URL /users/42 enters the browser. RouterProvider intercepts navigation.",
          nodes: [
            { id: "url",      label: "URL: /users/42",       type: "client",    active: true },
            { id: "router",   label: "RouterProvider",        type: "component", active: false },
            { id: "routes",   label: "<Routes>",              type: "component", active: false },
            { id: "layout",   label: "Layout /  → <Outlet>", type: "component", active: false },
            { id: "users",    label: "/users → UsersLayout",  type: "component", active: false },
            { id: "user",     label: "/users/:id → UserDetail", type: "component", active: false },
          ],
          edges: [
            { from: "url", to: "router", label: "history event", active: true },
          ],
          code: `// Browser navigates to /users/42
// RouterProvider listens on history stack
// Begins route matching`,
        },
        {
          phase: "render",
          narration: "Step 2 — Route matching. Router walks route tree depth-first. \"/\" matches. \"/users\" matches. \"/users/:id\" matches with id=\"42\".",
          nodes: [
            { id: "url",      label: "URL: /users/42",       type: "client",    active: false, dim: true },
            { id: "router",   label: "RouterProvider",        type: "component", active: true },
            { id: "routes",   label: "<Routes>",              type: "component", active: true },
            { id: "layout",   label: "/ → Layout ✓",         type: "component", active: true },
            { id: "users",    label: "/users → UsersLayout ✓", type: "component", active: true },
            { id: "user",     label: "/users/:id → UserDetail ✓ id=42", type: "action", active: true },
          ],
          edges: [
            { from: "router", to: "routes",  label: "match", active: true },
            { from: "routes", to: "layout",  label: "/", active: true, color: "#3fb950" },
            { from: "layout", to: "users",   label: "/users", active: true, color: "#3fb950" },
            { from: "users",  to: "user",    label: ":id=42", active: true, color: "#3fb950" },
          ],
          code: `// Route tree:
[
  { path: '/',       element: <Layout> },      // ✓ matches
  { path: 'users',   element: <UsersLayout> }, // ✓ matches
  { path: ':id',     element: <UserDetail> },  // ✓ matches, params={id:'42'}
]`,
        },
        {
          phase: "effect",
          narration: "Step 3 — Loader runs BEFORE render. /users/:id loader calls fetchUser(42). Data resolves, then component renders.",
          nodes: [
            { id: "match",    label: "Route Matched: :id=42", type: "component", active: false, dim: true },
            { id: "loader",   label: "loader({ params })",    type: "action",    active: true },
            { id: "api",      label: "GET /api/users/42",     type: "network",   active: true },
            { id: "data",     label: "User data resolved",    type: "store",     active: true },
            { id: "render",   label: "UserDetail renders",    type: "component", active: false },
          ],
          edges: [
            { from: "loader", to: "api",    label: "fetch", active: true },
            { from: "api",    to: "data",   label: "response", active: true, color: "#3fb950" },
            { from: "data",   to: "render", label: "useLoaderData()", active: true, color: "#ffa657" },
          ],
          code: `// loader runs before render
{
  path: ':id',
  loader: async ({ params }) => {
    const res = await fetch('/api/users/' + params.id);
    return res.json(); // available via useLoaderData()
  },
  element: <UserDetail />,
}

// In component:
function UserDetail() {
  const user = useLoaderData();
  return <h1>{user.name}</h1>;
}`,
        },
        {
          phase: "render",
          narration: "Step 4 — Outlet chain renders. Layout renders <Outlet> → UsersLayout renders <Outlet> → UserDetail fills in.",
          nodes: [
            { id: "layout",  label: "Layout\n<nav/> <Outlet/>",   type: "component", active: true },
            { id: "usersl",  label: "UsersLayout\n<Outlet/>",      type: "component", active: true },
            { id: "detail",  label: "UserDetail\n{ name: \"Dave\" }", type: "component", active: true },
          ],
          edges: [
            { from: "layout",  to: "usersl", label: "<Outlet>", active: true, color: "#58a6ff" },
            { from: "usersl",  to: "detail", label: "<Outlet>", active: true, color: "#58a6ff" },
          ],
          code: `// Layout.jsx
function Layout() {
  return (
    <>
      <nav>...</nav>
      <Outlet />  {/* renders UsersLayout here */}
    </>
  );
}

// UsersLayout.jsx
function UsersLayout() {
  return (
    <div>
      <Outlet />  {/* renders UserDetail here */}
    </div>
  );
}`,
        },
        {
          phase: "update",
          narration: "Step 5 — Navigation with useNavigate(). Programmatic navigation pushes new history entry. Router re-matches.",
          nodes: [
            { id: "btn",    label: "Button onClick",   type: "component", active: true },
            { id: "nav",    label: "useNavigate()",     type: "hook",      active: true },
            { id: "hist",   label: "history.push()",    type: "network",   active: true },
            { id: "router", label: "RouterProvider",    type: "component", active: true },
            { id: "next",   label: "/users/43",         type: "action",    active: true },
          ],
          edges: [
            { from: "btn",    to: "nav",    label: "navigate(\"/users/43\")", active: true },
            { from: "nav",    to: "hist",   label: "push", active: true },
            { from: "hist",   to: "router", label: "popstate", active: true, color: "#ffa657" },
            { from: "router", to: "next",   label: "rematch + loader", active: true, color: "#3fb950" },
          ],
          code: `import { useNavigate } from 'react-router-dom';

function UserCard({ id }) {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate('/users/' + id)}>
      View User
    </button>
  );
}

// Or declarative:
<Link to="/users/43">View User</Link>`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "React Router v6",
        time:  "O(routes) match",
        space: "O(depth)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML =
            window.ReactViz.label("CODE") +
            window.ReactViz.codeBlock(step.code, "js");
        },
      });
    },
  }]);
})();
