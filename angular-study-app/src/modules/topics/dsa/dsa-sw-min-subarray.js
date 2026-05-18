(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-min-subarray",
    area: "dsa",
    title: "Min Size Subarray >= target",
    tag: "Sliding Window",
    tags: ["sliding window", "variable window", "array", "sum", "target"],
    concept: `Find the smallest length of a contiguous subarray whose sum is at least target.

**Pattern:** Variable sliding window — O(n)
**Hint:** Grow until the target is reached, then shrink while the window stays valid.
**Scenario:** Quota tracker — shortest run of events that reaches a required total.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "sliding.minSubarraySum",
        time:  "O(n)",
        space: "O(1)",
        code: `function minSubArrayLen(target, nums) {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      const len = right - left + 1;
      if (len < minLen) minLen = len;
      sum -= nums[left];
      left++;
    }
  }
  return minLen === Infinity ? 0 : minLen;
}
const target = 7;
const nums = [2, 3, 1, 2, 4, 3];
const result = minSubArrayLen(target, nums);`,
      });
    }
  }]);
})();
