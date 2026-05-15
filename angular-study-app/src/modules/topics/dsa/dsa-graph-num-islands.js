(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-num-islands",
    area: "dsa",
    title: "Number of Islands",
    tag: "Graph",
    tags: ["graph", "bfs", "dfs", "grid", "flood fill", "faang", "lc200"],
    concept: `Count the number of islands in a 2D grid of 1s (land) and 0s (water).

🧒 **Kid explanation:** Look at a treasure map from above. Every connected group of land squares (1s) is one island. Your job: count the islands! Walk across the map. When you find a land square no one has visited, it's a new island — start a fire and burn all connected land (BFS/DFS). Count how many fires you started!

**Pattern:** BFS/DFS grid flood-fill — O(rows × cols)
**Key insight:** For each unvisited land cell, do BFS to mark the entire connected component as visited. Each BFS start = one island.
**Scenario:** Map analysis — count distinct connected land regions. Used in: geography apps, game maps, image segmentation.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'graph', problem: 'numIslands' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
