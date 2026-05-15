(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bs-find-min-rotated",
    area: "dsa",
    title: "Find Min in Rotated Array",
    tag: "Binary Search",
    tags: ["binary search", "array", "rotated", "pivot", "faang", "premium", "lc153"],
    concept: `Find the minimum element in a rotated sorted array in O(log n).

🧒 **Kid explanation:** A sorted array was spun like a clock. The smallest number is at the "seam" where it wrapped. Each step of binary search: if the middle value is bigger than the rightmost value, the seam (and minimum) is in the RIGHT half. Otherwise it's in the LEFT half (including middle). Zoom in until you find it!

**Pattern:** Binary search on rotation pivot — O(log n)
**Key insight:** Compare mid to the rightmost element. If mid > right, minimum is right of mid. Else minimum is left of or at mid.
**Scenario:** Find the rotation point in a circular log ring buffer.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'bsearch', problem: 'findMinRotated' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
