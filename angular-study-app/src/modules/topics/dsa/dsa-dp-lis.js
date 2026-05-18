(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-lis",
    area: "dsa",
    title: "Longest Increasing Subsequence",
    tag: "Dynamic Programming",
    tags: ["dp", "lis", "subsequence", "1d dp", "binary search"],
    concept: `Return the length of the longest strictly increasing subsequence.

**Pattern:** 1D subsequence DP — O(n²) DP or O(n log n) with binary search
**Hint:** For every i, extend any previous j where arr[j] < arr[i].
**Scenario:** Signal trend analysis — keep order, skip elements, find the longest rising chain.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dp.lis",
        time:  "O(n²)",
        space: "O(n)",
        code: `function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1);
  let maxLen = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
      }
    }
    if (dp[i] > maxLen) maxLen = dp[i];
  }
  return maxLen;
}
const nums = [10, 9, 2, 5, 3, 7, 101, 18];
const result = lengthOfLIS(nums);`,
      });
    }
  }]);
})();
