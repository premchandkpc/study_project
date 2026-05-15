(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-min-subarray",
    area: "dsa",
    title: "Min Size Subarray >= target",
    tag: "Sliding Window",
    tags: ["sliding window", "variable window", "array", "sum", "target"],
    concept: `Find the smallest length of a contiguous subarray whose sum is at least target.

**Pattern:** Variable sliding window — O(n)
**Hint:** Grow until the target is reached, then shrink while the window stays valid.
**Scenario:** Quota tracker — shortest run of events that reaches a required total.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding', problem: 'minSubarraySum' });
      }
    }
  }]);
})();
