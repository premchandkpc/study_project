(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-lcs",
    area: "dsa",
    title: "Longest Common Subsequence",
    tag: "Dynamic Programming",
    tags: ["dp", "lcs", "string", "2d dp", "subsequence"],
    concept: `Find the length of the longest sequence that appears in both strings in the same relative order.

**Pattern:** 2D string DP — O(mn)
**Hint:** Match uses diagonal + 1; mismatch takes max(top, left).
**Scenario:** Diff engines and DNA matching.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'lcs' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
