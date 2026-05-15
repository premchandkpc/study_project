(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bs-koko-bananas",
    area: "dsa",
    title: "Koko Eating Bananas",
    tag: "Binary Search",
    tags: ["binary search", "search on answer", "array", "faang", "premium", "lc875"],
    concept: `Find the minimum eating speed k so Koko finishes all banana piles within h hours.

🧒 **Kid explanation:** Koko can eat k bananas per hour from each pile (one pile at a time). We need to find the SLOWEST speed she can eat and still finish in time. Instead of trying every speed 1,2,3..., do binary search on the speed! If speed k works, maybe k-1 also works. If k doesn't work, we need faster.

**Pattern:** Binary search on the answer — O(n log m) where m = max pile size
**Key insight:** The answer space (1 to max pile) is sorted. Valid speeds form a suffix. Find the first valid speed using binary search.
**Scenario:** Rate throttling — find the slowest acceptable processing rate to finish within a deadline.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'bsearch', problem: 'kokoEating' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
