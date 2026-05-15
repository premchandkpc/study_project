(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bs-search-rotated",
    area: "dsa",
    title: "Search in Rotated Sorted Array",
    tag: "Binary Search",
    tags: ["binary search", "array", "rotated", "faang", "premium", "lc33"],
    concept: `Search a sorted array that was rotated at an unknown pivot. Return the index or -1.

🧒 **Kid explanation:** Imagine a sorted row of lockers: 1,2,3,4,5,6,7. Someone spun it like a wheel and now it reads: 4,5,6,7,1,2,3. You still have a secret weapon — binary search! Even though it's rotated, ONE HALF is always in perfect sorted order. Figure out which half, check if your target is in it, then search only that half!

**Pattern:** Binary search with half-sorted check — O(log n)
**Key insight:** At any midpoint, either the left half or right half is perfectly sorted. Use that to decide which side to search.
**Scenario:** Circular buffer lookup — data wrapped around a ring buffer.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'bsearch', problem: 'searchRotated' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
