(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-lis",
    area: "dsa",
    title: "Longest Increasing Subsequence",
    tag: "Dynamic Programming",
    tags: ["dp", "lis", "subsequence", "1d dp", "binary search"],
    concept: `Return the length of the longest strictly increasing subsequence.

**Pattern:** 1D subsequence DP — O(n²) DP or O(n log n) with binary search
**Hint:** For every i, extend any previous j where arr[j] < arr[i].
**Scenario:** Signal trend analysis — keep order, skip elements, find the longest rising chain.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'lis' });
      }
    }
  }]);
})();
