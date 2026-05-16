(function() {
  'use strict';
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
      window.DSAViz.topic.render(mount, {
        title: 'twoptr.trapRain',
        time:  'O(n)',
        space: 'O(1)',
        code: `function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }
  return water;
}
const height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
const result = trap(height);`,
      });
    }
  }]);
})();
