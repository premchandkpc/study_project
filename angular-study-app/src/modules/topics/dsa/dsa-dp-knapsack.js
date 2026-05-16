(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-knapsack",
    area: "dsa",
    title: "0/1 Knapsack",
    tag: "Dynamic Programming",
    tags: ["dp", "knapsack", "2d dp", "choose skip", "capacity"],
    concept: `Given item weights, values, and capacity, maximize total value when each item used at most once.

**Pattern:** 2D choose/skip DP — O(n × W)
**Hint:** If the item fits, compare skip vs take; otherwise copy the row above.
**Scenario:** Capacity planning — every item is a yes/no decision.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'dp.knapsack',
        time:  'O(nW)',
        space: 'O(nW)',
        code: `function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], values[i - 1] + dp[i - 1][w - weights[i - 1]]);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }
  return dp[n][capacity];
}
const weights = [2, 3, 4, 5];
const values = [3, 4, 5, 6];
const capacity = 5;
const result = knapsack(weights, values, capacity);`,
      });
    }
  }]);
})();
