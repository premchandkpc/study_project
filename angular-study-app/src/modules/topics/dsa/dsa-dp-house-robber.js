(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-house-robber",
    area: "dsa",
    title: "House Robber",
    tag: "Dynamic Programming",
    tags: ["dp", "house robber", "decision", "adjacency", "faang"],
    concept: `Given money in houses in a line, maximize loot without robbing adjacent houses.

**Pattern:** 1D decision DP — O(n)
**Hint:** At house i choose max(skip i, rob i + best through i-2).
**Scenario:** FAANG choose/skip question with adjacency constraint.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dp.houseRobber",
        time:  "O(n)",
        space: "O(1)",
        code: `function rob(nums) {
  let prev2 = 0;
  let prev1 = 0;
  for (const n of nums) {
    const curr = Math.max(prev1, prev2 + n);
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
const nums = [2, 7, 9, 3, 1];
const result = rob(nums);`,
      });
    }
  }]);
})();
