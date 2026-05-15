(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-fibonacci",
    area: "dsa",
    title: "Fibonacci (bottom-up)",
    tag: "Dynamic Programming",
    tags: ["dp", "fibonacci", "1d dp", "bottom-up", "recurrence"],
    concept: `Compute the nth Fibonacci number without exponential recursion.

**Pattern:** 1D bottom-up DP — O(n) time, O(1) space
**Hint:** Replace the recursion tree with a left-to-right table.
**Scenario:** Warm-up DP: each state depends on the previous two states.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'fibonacci' });
      }
    }
  }]);
})();
