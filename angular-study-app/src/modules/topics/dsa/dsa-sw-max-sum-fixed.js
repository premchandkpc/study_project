(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-max-sum-fixed",
    area: "dsa",
    title: "Max Sum Subarray (fixed k)",
    tag: "Sliding Window",
    tags: ["sliding window", "fixed window", "array", "subarray", "sum"],
    concept: `Given an integer array and k, find the maximum sum of any contiguous subarray of size k.

**Pattern:** Fixed sliding window — O(n)
**Hint:** Build the first window once, then add one new value and remove one old value per move.
**Scenario:** Traffic dashboard — find the busiest exact k-minute interval.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding', problem: 'maxSumFixed' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
