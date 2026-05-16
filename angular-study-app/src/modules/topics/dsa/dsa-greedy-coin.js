(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-greedy-coin",
    area: "dsa",
    title: "Coin Change (greedy)",
    tag: "Greedy",
    tags: ["greedy", "coin change", "canonical", "comparison"],
    concept: `Make an amount by repeatedly choosing the largest coin that fits.

**Pattern:** Greedy choice — O(n)
**Hint:** Greedy is fast but needs a canonical coin system. Compare with DP Coin Change for counterexamples.
**Scenario:** Works for standard currencies; fails on non-canonical coin sets.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'greedy.greedyCoin',
        time:  'O(n)',
        space: 'O(1)',
        code: `function greedyCoinChange(coins, amount) {
  coins.sort((a, b) => b - a);
  let count = 0;
  let remaining = amount;
  for (const coin of coins) {
    while (remaining >= coin) {
      remaining -= coin;
      count++;
    }
  }
  return remaining === 0 ? count : -1;
}
const coins = [25, 10, 5, 1];
const amount = 41;
const result = greedyCoinChange(coins, amount);`,
      });
    }
  }]);
})();
