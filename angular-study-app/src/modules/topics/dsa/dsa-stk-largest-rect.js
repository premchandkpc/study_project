(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-stk-largest-rect",
    area: "dsa",
    title: "Largest Rectangle in Histogram",
    tag: "Stack",
    tags: ["stack", "monotonic stack", "array", "histogram", "hard", "faang", "lc84"],
    concept: `Find the area of the largest rectangle that fits inside a histogram.

🧒 **Kid explanation:** Imagine building a giant flat billboard using bars of a city skyline. You want the biggest rectangular billboard possible. Each bar can be the SHORTEST bar in its rectangle — so how wide can it extend? Use a stack to track bars waiting to find their right boundary. When a shorter bar appears, the waiting bars know their rectangle just ended!

**Pattern:** Monotonic increasing stack — O(n)
**Key insight:** When a shorter bar arrives, pop all taller bars and compute their max possible rectangle (height × span between remaining stack and current index).
**Scenario:** Billboard placement — largest rectangular space in a city skyline.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'stack', problem: 'largestRect' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
