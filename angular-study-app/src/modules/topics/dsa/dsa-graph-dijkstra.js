(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-dijkstra",
    area: "dsa",
    title: "Dijkstra SSSP",
    tag: "Graph",
    tags: ["graph", "dijkstra", "shortest path", "weighted", "heap", "greedy"],
    concept: `Find shortest paths from one source in a graph with non-negative edge weights.

**Pattern:** Greedy shortest path with min-heap — O((V+E) log V)
**Hint:** Negative weights break the finalized-distance guarantee.
**Scenario:** Routing engine — repeatedly lock the closest unfinished node and relax outgoing roads.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'graph', problem: 'dijkstra' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
