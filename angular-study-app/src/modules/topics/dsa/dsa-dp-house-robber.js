(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-house-robber",
    area: "dsa",
    title: "House Robber",
    tag: "Dynamic Programming",
    tags: ["dp", "house robber", "decision", "adjacency", "faang"],
    concept: `Given money in houses in a line, maximize loot without robbing adjacent houses.

**Pattern:** 1D decision DP — O(n)
**Hint:** At house i choose max(skip i, rob i + best through i-2).
**Scenario:** FAANG choose/skip question with adjacency constraint.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'houseRobber' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
