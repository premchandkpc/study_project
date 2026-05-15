(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw2-min-window",
    area: "dsa",
    title: "Minimum Window Substring",
    tag: "Sliding Window II",
    tags: ["sliding window", "two pointers", "hash map", "string", "faang", "premium", "lc76"],
    concept: `Find the smallest substring of s that contains ALL characters of t.

🧒 **Kid explanation:** Imagine you're reading a book and you need to find all letters of the word "ABC". Slide a magnifying glass across — expand it right until you see all the letters, then shrink it from the left to get the shortest possible view. That shortest view is your answer!

**Pattern:** Variable sliding window + two frequency maps — O(n+m)
**Hint:** Expand right until all chars covered, shrink left to minimize, track global minimum.
**Scenario:** Log search — find the shortest log excerpt that contains all required keywords.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding2', problem: 'minWindow' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
