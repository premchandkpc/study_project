(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-partition-equal",
    area: "dsa",
    title: "Partition Equal Subset Sum",
    tag: "Dynamic Programming",
    tags: ["dp", "partition", "subset sum", "boolean dp", "faang"],
    concept: `Can the array be split into two subsets with equal sum?

**Pattern:** 0/1 subset-sum DP — O(n × total/2)
**Hint:** Process numbers once; iterate target backward so each value is used at most once.
**Scenario:** FAANG subset-sum transformation: equal partition means target = total / 2.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'dp.partitionEqual',
        time:  'O(n·sum)',
        space: 'O(sum)',
        code: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const num of nums) {
    for (let j = target; j >= num; j--) {
      if (dp[j - num]) dp[j] = true;
    }
  }
  return dp[target];
}
const nums = [1, 5, 11, 5];
const result = canPartition(nums);`,
      });
    }
  }]);
})();
