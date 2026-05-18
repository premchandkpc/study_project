(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-tp-three-sum",
    area: "dsa",
    title: "3Sum",
    tag: "Two Pointers",
    tags: ["two pointers", "sorting", "array", "deduplication", "faang", "premium", "lc15"],
    concept: `Find all unique triplets in the array that sum to zero.

🧒 **Kid explanation:** Sort the numbers in order. Pick one number and pretend it's fixed. Now use two friends (left pointer and right pointer) to find two other numbers that cancel it out. If the three numbers are too big, move the right friend left. Too small, move the left friend right. Skip duplicates to avoid repeats!

**Pattern:** Sort + fix one element + two-pointer on remaining — O(n²)
**Key insight:** Sorting enables skipping duplicates and the two-pointer technique.
**Scenario:** Financial reconciliation — find three transactions that exactly cancel each other out.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "twoptr.threeSum",
        time:  "O(n²)",
        space: "O(1)",
        code: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }
  return result;
}
const nums = [-1, 0, 1, 2, -1, -4];
const result = threeSum(nums);`,
      });
    }
  }]);
})();
