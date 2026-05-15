(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-coin-change",
    area: "dsa",
    title: "Coin Change (min coins)",
    tag: "Dynamic Programming",
    tags: ["dp", "coin change", "unbounded", "min cost", "faang"],
    concept: `Given coin denominations and an amount, return the fewest coins needed to make that amount.

**Pattern:** Unbounded min-cost DP — O(amount × coins)
**Hint:** For each amount, try taking one last coin and reuse dp[amount - coin].
**Scenario:** Payment engine — canonical greedy fails on many coin sets, so use DP.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'coinChange' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
