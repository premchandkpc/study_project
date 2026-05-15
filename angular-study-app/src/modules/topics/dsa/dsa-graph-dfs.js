(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-dfs",
    area: "dsa",
    title: "DFS Traversal",
    tag: "Graph",
    tags: ["graph", "dfs", "depth first", "stack", "recursion"],
    concept: `Traverse a graph by going deep before backtracking.

**Pattern:** Stack-based depth-first search — O(V+E)
**Hint:** The stack models the recursion call stack.
**Scenario:** Dependency exploration — fully inspect one branch before moving to the next.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'graph', problem: 'dfs' });
      }
    }
  }]);
})();
