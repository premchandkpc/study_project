(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-unique-paths",
    area: "dsa",
    title: "Unique Paths Grid",
    tag: "Dynamic Programming",
    tags: ["dp", "grid", "2d dp", "counting", "faang"],
    concept: `In an m x n grid, moving only right or down, count unique paths to the bottom-right cell.

**Pattern:** 2D counting DP — O(mn)
**Hint:** The first row and first column each have exactly one path.
**Scenario:** FAANG grid DP — every cell aggregates from top and left.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'uniquePaths' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
