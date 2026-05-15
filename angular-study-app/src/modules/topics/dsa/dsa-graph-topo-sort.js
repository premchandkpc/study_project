(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-topo-sort",
    area: "dsa",
    title: "Course Schedule (Topo Sort)",
    tag: "Graph",
    tags: ["graph", "topological sort", "BFS", "Kahn's algorithm", "DAG", "faang", "lc207"],
    concept: `Given n courses and prerequisite pairs, can you finish all courses? Return a valid order.

🧒 **Kid explanation:** Some courses need you to take other courses first. Math before Calculus, Reading before Literature. Imagine each course as a person at a door — they'll only enter once ALL their prerequisites have gone first. Count how many people are blocking each door (in-degree). Start with doors that have zero blockers. As people enter, they unblock more doors!

**Pattern:** Kahn's BFS topological sort — O(V + E)
**Key insight:** in-degree = number of prerequisites. Process nodes with in-degree 0 first. Each time you process a node, reduce in-degree of its dependents. If any node never reaches 0, there's a cycle.
**Scenario:** Build system — compile dependencies before the module that needs them. Package manager dependency resolution.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'graph', problem: 'topoSort' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
