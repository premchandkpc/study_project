(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-greedy-coin",
    area: "dsa",
    title: "Coin Change (greedy)",
    tag: "Greedy",
    tags: ["greedy", "coin change", "canonical", "comparison"],
    concept: `Make an amount by repeatedly choosing the largest coin that fits.

**Pattern:** Greedy choice — O(n)
**Hint:** Greedy is fast but needs a canonical coin system. Compare with DP Coin Change for counterexamples.
**Scenario:** Works for standard currencies; fails on non-canonical coin sets.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'greedy', problem: 'greedyCoin' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
