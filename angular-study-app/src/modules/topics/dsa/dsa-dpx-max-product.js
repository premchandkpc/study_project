(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dpx-max-product",
    area: "dsa",
    title: "Maximum Product Subarray",
    tag: "DP Extended",
    tags: ["dp", "array", "product", "negative numbers", "faang", "lc152"],
    concept: `Find the contiguous subarray with the largest product.

🧒 **Kid explanation:** Multiplying numbers sounds easy — but watch out for NEGATIVE numbers! Two negatives make a positive, so the minimum product can suddenly become the maximum when you multiply by another negative. Track BOTH the running maximum AND the running minimum at every step. When you see a new number, they might SWAP!

**Pattern:** DP tracking both max and min products — O(n)
**Key insight:** curMax = max(num, curMax*num, curMin*num). curMin = min(same three). When num is negative, max and min flip roles.
**Scenario:** Signal processing — find the stretch of multiplied sensor values that peaks highest.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dpx', problem: 'maxProduct' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
