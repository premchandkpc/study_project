(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-tp-container-water",
    area: "dsa",
    title: "Container With Most Water",
    tag: "Two Pointers",
    tags: ["two pointers", "array", "greedy", "faang", "premium", "lc11"],
    concept: `Given heights of vertical lines, find two lines that hold the most water.

🧒 **Kid explanation:** You have a row of fence posts of different heights. If you fill water between two posts, the water level is limited by the shorter post. Area = shorter post height × distance between posts. Start with the widest pair (leftmost + rightmost), then move the shorter one inward — you might find a taller pair!

**Pattern:** Two-pointer shrink from both ends — O(n)
**Key insight:** Always move the pointer with the shorter height inward. Moving the taller one can only make things worse.
**Scenario:** Tank designer — pick two walls to maximize water volume.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'twoptr', problem: 'containerWater' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
