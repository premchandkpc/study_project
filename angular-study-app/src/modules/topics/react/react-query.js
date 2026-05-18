(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-query",
    area:  "react",
    title: "React Query (TanStack)",
    tag:   "Data Fetching",
    tags:  ["react", "react-query", "tanstack", "cache", "server-state", "data-fetching"],

    concept: "TanStack Query (React Query) manages server state: fetching, caching, synchronizing, and updating async data. useQuery() fetches + caches data keyed by a query key. Data goes stale after staleTime, triggers background refetch on window focus or remount. useMutation() handles writes with optimistic updates. QueryClient holds the cache.",

    why: "Most React apps manually implement loading/error state, caching, and refetching in useEffect — duplicated everywhere and error-prone. React Query replaces all of this with declarative data subscriptions, automatic background sync, and cache deduplication. Server state (fetched data) is fundamentally different from client state (UI state) — it belongs in a different tool.",

    example: {
      language: "javascript",
      code: `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch + cache users
function UserList() {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
    staleTime: 5 * 60 * 1000,   // 5 minutes fresh
    gcTime: 10 * 60 * 1000,     // 10 min in cache after unmount
  });

  if (isLoading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  return (
    <>
      {isFetching && <div>Refreshing...</div>}
      <ul>{data.map(u => <li key={u.id}>{u.name}</li>)}</ul>
    </>
  );
}

// Mutation with cache invalidation
function AddUserForm() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (user) => fetch('/api/users', { method: 'POST', body: JSON.stringify(user) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  return <button onClick={() => mutation.mutate({ name: 'Alice' })}>Add</button>;
}`,
    },

    interview: [
      "What problem does React Query solve vs useEffect for data fetching?",
      "Explain staleTime vs gcTime (cacheTime)",
      "What is query key and how does it drive caching?",
      "How do optimistic updates work in useMutation?",
      "What is background refetching and when does it trigger?",
    ],

    tradeoffs: {
      pros: [
        "Eliminates boilerplate: no manual loading/error/cache state",
        "Automatic background refetch on window focus, reconnect, component mount",
        "Request deduplication: same queryKey = one request, shared cache",
        "Pagination, infinite scroll, prefetching built-in",
        "Offline support via gcTime",
      ],
      cons: [
        "Adds ~12KB to bundle",
        "QueryClientProvider required at app root",
        "staleTime=0 default means constant refetching — must configure for your app",
        "Not a client state manager — still need Zustand/Context for UI state",
      ],
    },

    gotchas: [
      "queryKey must include all variables the queryFn depends on — else stale data on param change",
      "staleTime=0 (default) means data is immediately stale — refetches on every mount",
      "gcTime (formerly cacheTime): how long unused query stays in cache — defaults to 5 min",
      "invalidateQueries triggers background refetch only if query has active subscribers",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — Component mounts. useQuery checks QueryClient cache for key [\"users\"]. Cache miss → fires queryFn.",
          nodes: [
            { id: "comp",    label: "UserList mounts",              type: "component", active: true },
            { id: "hook",    label: "useQuery([\"users\"], fetchFn)",  type: "hook",      active: true },
            { id: "client",  label: "QueryClient cache",            type: "store",     active: true },
            { id: "miss",    label: "Cache MISS\n[\"users\"] not found", type: "reducer", active: true },
            { id: "api",     label: "GET /api/users",               type: "network",   active: true },
          ],
          edges: [
            { from: "comp",   to: "hook",   label: "useQuery()", active: true },
            { from: "hook",   to: "client", label: "lookup key", active: true },
            { from: "client", to: "miss",   label: "not found",  active: true, color: "#f85149" },
            { from: "miss",   to: "api",    label: "fetch!", active: true, color: "#ffa657" },
          ],
          code: `const { data, isLoading } = useQuery({
  queryKey: ['users'],   // cache key — array form
  queryFn: () => fetch('/api/users').then(r => r.json()),
});

// First render: isLoading=true, data=undefined
// queryFn fires immediately (cache miss)

// Query key shapes:
// ['users']               — all users
// ['users', userId]       — specific user
// ['users', { filter }]   — filtered users
// If key changes, re-fetches automatically`,
        },
        {
          phase: "effect",
          narration: "Step 2 — queryFn fires, API responds. Data stored in QueryClient cache under [\"users\"]. Status becomes fresh.",
          nodes: [
            { id: "api2",    label: "GET /api/users → 200",          type: "network",   active: true },
            { id: "cache",   label: "QueryClient\n[\"users\"] = data\nstatus: fresh",  type: "store", active: true },
            { id: "comp2",   label: "UserList\ndata=[...], isLoading=false", type: "component", active: true },
            { id: "comp3",   label: "UserDetail (same key)\ngets cached data instantly", type: "component", active: true },
          ],
          edges: [
            { from: "api2",  to: "cache", label: "store response", active: true, color: "#3fb950" },
            { from: "cache", to: "comp2", label: "notify subscriber", active: true, color: "#58a6ff" },
            { from: "cache", to: "comp3", label: "deduped — no extra fetch", active: true, color: "#3fb950" },
          ],
          code: `// After fetch resolves:
// status: 'success', isLoading: false, data: [...]

// Cache deduplication:
// If UserDetail also calls useQuery({ queryKey: ['users'] })
// while UserList is fetching → they SHARE one request
// Second mount gets cached data instantly — 0 network requests

// After staleTime passes (default: 0ms immediately):
// status → 'stale'
// Still serves cached data, but will refetch in background`,
        },
        {
          phase: "idle",
          narration: "Step 3 — staleTime passes. Data marked stale. Background refetch triggers on window focus or component remount.",
          nodes: [
            { id: "stale",   label: "staleTime expires\nstatus: stale",  type: "cache",     active: true },
            { id: "focus",   label: "Window focus event",                 type: "client",    active: true },
            { id: "bg",      label: "Background refetch\n(isFetching=true)", type: "network", active: true },
            { id: "ui",      label: "UI shows old data\n(no loading flash)", type: "component", active: true },
            { id: "new",     label: "New data arrives\nUI updates",        type: "component", active: true },
          ],
          edges: [
            { from: "stale", to: "focus", label: "", active: true },
            { from: "focus", to: "bg",    label: "refetchOnWindowFocus", active: true, color: "#ffa657" },
            { from: "bg",    to: "ui",    label: "old data still shown", active: true },
            { from: "bg",    to: "new",   label: "fresh data → update",  active: true, color: "#3fb950" },
          ],
          code: `useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  staleTime: 5 * 60 * 1000,     // fresh for 5 min — no background refetch
  refetchOnWindowFocus: true,    // default: true
  refetchOnMount: true,          // default: true — if stale
  refetchInterval: 30_000,       // polling every 30s
});

// isFetching: query is in-flight (including background)
// isLoading: FIRST fetch only (no cached data yet)
// isFetching && !isLoading → background refresh happening`,
        },
        {
          phase: "update",
          narration: "Step 4 — useMutation. POST /api/users succeeds. onSuccess calls invalidateQueries → cache marked stale → triggers refetch.",
          nodes: [
            { id: "form",    label: "AddUserForm\nmutation.mutate({name:\"Alice\"})", type: "component", active: true },
            { id: "mutfn",   label: "mutationFn\nPOST /api/users",                  type: "action",    active: true },
            { id: "success", label: "onSuccess callback",                            type: "action",    active: true },
            { id: "inval",   label: "invalidateQueries\n([\"users\"])",                type: "reducer",   active: true },
            { id: "cache2",  label: "Cache: [\"users\"]\nstatus: stale → refetch",    type: "store",     active: true },
          ],
          edges: [
            { from: "form",    to: "mutfn",   label: "mutate()", active: true },
            { from: "mutfn",   to: "success", label: "200 OK", active: true, color: "#3fb950" },
            { from: "success", to: "inval",   label: "invalidateQueries", active: true, color: "#ffa657" },
            { from: "inval",   to: "cache2",  label: "mark stale → refetch", active: true, color: "#f85149" },
          ],
          code: `const mutation = useMutation({
  mutationFn: (user) =>
    fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),

  // Optimistic update (optional):
  onMutate: async (newUser) => {
    await queryClient.cancelQueries({ queryKey: ['users'] });
    const prev = queryClient.getQueryData(['users']);
    queryClient.setQueryData(['users'], (old) => [...old, newUser]);
    return { prev };  // rollback context
  },
  onError: (err, newUser, context) => {
    queryClient.setQueryData(['users'], context.prev);  // rollback
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});`,
        },
        {
          phase: "cleanup",
          narration: "Step 5 — Component unmounts. Query becomes inactive. After gcTime, cache entry garbage collected.",
          nodes: [
            { id: "unmount", label: "UserList unmounts",                         type: "component", dim: true },
            { id: "gc",      label: "gcTime timer starts\n(default: 5 min)",     type: "cache",     active: true },
            { id: "remount", label: "Remount before gcTime\nInstant data! ✓",   type: "component", active: true },
            { id: "evict",   label: "After gcTime:\ncache evicted",              type: "reducer",   active: true },
          ],
          edges: [
            { from: "unmount", to: "gc",      label: "start timer", active: true },
            { from: "gc",      to: "remount", label: "before expiry → serve cache", active: true, color: "#3fb950" },
            { from: "gc",      to: "evict",   label: "after gcTime → delete", active: true, color: "#f85149" },
          ],
          code: `// gcTime (formerly cacheTime) — after component unmounts,
// how long to keep query in cache before garbage collecting
useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  gcTime: 10 * 60 * 1000,  // 10 minutes in cache after unmount
});

// Pattern: gcTime > staleTime
// staleTime: how long data is "fresh" (no background refetch)
// gcTime: how long data stays in cache when unused

// Without gcTime data: navigating away + back = spinner every time
// With gcTime data: navigating away + back = instant data (background refresh)`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "React Query (TanStack)",
        time:  "O(1) cache hit",
        space: "O(queries)",
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
