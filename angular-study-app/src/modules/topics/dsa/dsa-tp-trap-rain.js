(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-tp-trap-rain",
    area: "dsa",
    title: "Trapping Rain Water",
    tag: "Two Pointers",
    tags: ["two pointers", "stack", "array", "hard", "faang", "premium", "lc42"],
    concept: `Given elevation heights, compute how much rain water gets trapped between the bars.

🧒 **Kid explanation:** Imagine a row of cups of different sizes. After rain, water pools in the low spots between tall cups. At any spot, water depth = (tallest cup on the left, tallest cup on the right — whichever is shorter) minus the cup at that spot. Two pointers track the running max from each side!

**Pattern:** Two-pointer running max from each side — O(n) time O(1) space
**Key insight:** water[i] = min(maxLeft, maxRight) − height[i]. Process from whichever side has the smaller max.
**Scenario:** Civil engineering — calculate water retention in a terrain cross-section.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'twoptr', problem: 'trapRain' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
