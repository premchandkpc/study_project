(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-tp-three-sum",
    area: "dsa",
    title: "3Sum",
    tag: "Two Pointers",
    tags: ["two pointers", "sorting", "array", "deduplication", "faang", "premium", "lc15"],
    concept: `Find all unique triplets in the array that sum to zero.

🧒 **Kid explanation:** Sort the numbers in order. Pick one number and pretend it's fixed. Now use two friends (left pointer and right pointer) to find two other numbers that cancel it out. If the three numbers are too big, move the right friend left. Too small, move the left friend right. Skip duplicates to avoid repeats!

**Pattern:** Sort + fix one element + two-pointer on remaining — O(n²)
**Key insight:** Sorting enables skipping duplicates and the two-pointer technique.
**Scenario:** Financial reconciliation — find three transactions that exactly cancel each other out.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'twoptr', problem: 'threeSum' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
