(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-bfs",
    area: "dsa",
    title: "BFS Traversal",
    tag: "Graph",
    tags: ["graph", "bfs", "breadth first", "queue", "shortest path"],
    concept: `Traverse a graph level by level from a source node.

**Pattern:** Queue-based breadth-first search — O(V+E)
**Hint:** Visit neighbors in waves; first time you see a node is the shortest edge-count path.
**Scenario:** Shortest hops in an unweighted social graph.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'graph', problem: 'bfs' });
      }
    }
  }]);
})();
