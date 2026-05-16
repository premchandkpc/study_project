(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-coin-change",
    area: "dsa",
    title: "Coin Change (min coins)",
    tag: "Dynamic Programming",
    tags: ["dp", "coin change", "unbounded", "min cost", "faang"],
    concept: `Given coin denominations and an amount, return the fewest coins needed to make that amount.

**Pattern:** Unbounded min-cost DP — O(amount × coins)
**Hint:** For each amount, try taking one last coin and reuse dp[amount - coin].
**Scenario:** Payment engine — canonical greedy fails on many coin sets, so use DP.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'dp.coinChange',
        time:  'O(n·m)',
        space: 'O(n)',
        code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
const coins = [1, 5, 11];
const amount = 15;
const result = coinChange(coins, amount);`,
      });
    }
  }]);
})();
