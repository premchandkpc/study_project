(function() {
  "use strict";
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
      window.DSAViz.topic.render(mount, {
        title: "twoptr.containerWater",
        time:  "O(n)",
        space: "O(1)",
        code: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;
  while (left < right) {
    const h = Math.min(height[left], height[right]);
    const w = right - left;
    const water = h * w;
    if (water > maxWater) maxWater = water;
    if (height[left] < height[right]) left++;
    else right--;
  }
  return maxWater;
}
const height = [1, 8, 6, 2, 5, 4, 8, 3, 7];
const result = maxArea(height);`,
      });
    }
  }]);
})();
