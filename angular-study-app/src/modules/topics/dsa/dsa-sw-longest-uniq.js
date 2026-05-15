(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-longest-uniq",
    area: "dsa",
    title: "Longest Substr No Repeat",
    tag: "Sliding Window",
    tags: ["sliding window", "variable window", "string", "hashmap", "frequency"],
    concept: `Return the length of the longest substring without repeating characters.

**Pattern:** Variable sliding window + frequency map — O(n)
**Hint:** Expand right; when duplicate appears, move left until the window is valid again.
**Scenario:** Session-token scan — keep the longest contiguous clean segment.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding', problem: 'longestUniq' });
      }
    }
  }]);
})();
