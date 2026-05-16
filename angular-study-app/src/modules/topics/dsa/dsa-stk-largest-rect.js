(function() {
  'use strict';
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
      window.DSAViz.topic.render(mount, {
        title: 'stack.largestRect',
        time:  'O(n)',
        space: 'O(n)',
        code: `function largestRectangleArea(heights) {
  const stack = [];
  let maxArea = 0;
  const h = [...heights, 0];
  for (let i = 0; i < h.length; i++) {
    let start = i;
    while (stack.length && stack[stack.length - 1][1] > h[i]) {
      const [idx, ht] = stack.pop();
      const area = ht * (i - idx);
      if (area > maxArea) maxArea = area;
      start = idx;
    }
    stack.push([start, h[i]]);
  }
  return maxArea;
}
const heights = [2, 1, 5, 6, 2, 3];
const result = largestRectangleArea(heights);`,
      });
    }
  }]);
})();
