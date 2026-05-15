(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bt-comb-sum",
    area: "dsa",
    title: "Combination Sum",
    tag: "Backtracking",
    tags: ["backtracking", "recursion", "pruning", "combination", "faang", "lc39"],
    concept: `Find all unique combinations of numbers that sum to a target. Numbers can be reused.

🧒 **Kid explanation:** You have coins: [2, 3, 6, 7]. You want to make exactly $7. You can reuse coins! Try putting a coin in your wallet. Keep adding coins until you either hit the target (success!) or go over (fail → backtrack and try a different coin). This explores every possible combination without trying ones that are obviously wrong.

**Pattern:** Backtracking with early pruning — O(n^(target/min))
**Key insight:** Sort candidates. When a candidate exceeds remaining target, stop trying larger ones (they'll also fail). Allows reuse by recursing at same index.
**Scenario:** Exact-change problem — which coins (reusable) sum to the exact target?`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'backtrack', problem: 'combSum' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
