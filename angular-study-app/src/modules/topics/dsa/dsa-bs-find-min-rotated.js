(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bs-find-min-rotated",
    area: "dsa",
    title: "Find Min in Rotated Array",
    tag: "Binary Search",
    tags: ["binary search", "array", "rotated", "pivot", "faang", "premium", "lc153"],
    concept: `Find the minimum element in a rotated sorted array in O(log n).

🧒 **Kid explanation:** A sorted array was spun like a clock. The smallest number is at the "seam" where it wrapped. Each step of binary search: if the middle value is bigger than the rightmost value, the seam (and minimum) is in the RIGHT half. Otherwise it's in the LEFT half (including middle). Zoom in until you find it!

**Pattern:** Binary search on rotation pivot — O(log n)
**Key insight:** Compare mid to the rightmost element. If mid > right, minimum is right of mid. Else minimum is left of or at mid.
**Scenario:** Find the rotation point in a circular log ring buffer.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'bsearch.findMinRotated',
        time:  'O(log n)',
        space: 'O(1)',
        code: `function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] > nums[right]) left = mid + 1;
    else right = mid;
  }
  return nums[left];
}
const nums = [3, 4, 5, 1, 2];
const result = findMin(nums);`,
      });
    }
  }]);
})();
