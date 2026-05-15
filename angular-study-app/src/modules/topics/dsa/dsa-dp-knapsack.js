(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-knapsack",
    area: "dsa",
    title: "0/1 Knapsack",
    tag: "Dynamic Programming",
    tags: ["dp", "knapsack", "2d dp", "choose skip", "capacity"],
    concept: `Given item weights, values, and capacity, maximize total value when each item used at most once.

**Pattern:** 2D choose/skip DP — O(n × W)
**Hint:** If the item fits, compare skip vs take; otherwise copy the row above.
**Scenario:** Capacity planning — every item is a yes/no decision.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'knapsack' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
