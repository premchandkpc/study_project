(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-window-max",
    area: "dsa",
    title: "Sliding Window Maximum",
    tag: "Sliding Window",
    tags: ["sliding window", "monotonic deque", "array", "maximum"],
    concept: `For every contiguous window of size k, output the maximum value in that window.

**Pattern:** Monotonic deque — O(n)
**Hint:** Deque stores candidate indices in decreasing value order; front is always the max.
**Scenario:** Rolling leaderboard — each window needs the current peak without rescanning all k values.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding', problem: 'windowMax' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
