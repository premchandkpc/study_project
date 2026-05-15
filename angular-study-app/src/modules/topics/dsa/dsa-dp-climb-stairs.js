(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-climb-stairs",
    area: "dsa",
    title: "Climbing Stairs",
    tag: "Dynamic Programming",
    tags: ["dp", "climbing stairs", "counting", "recurrence", "faang"],
    concept: `You can climb 1 or 2 steps at a time. How many distinct ways can you reach step n?

**Pattern:** 1D counting DP — O(n)
**Hint:** The last move into step i came from i-1 or i-2.
**Scenario:** FAANG recurrence: ways(n) = ways(n-1) + ways(n-2).`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'climbStairs' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
