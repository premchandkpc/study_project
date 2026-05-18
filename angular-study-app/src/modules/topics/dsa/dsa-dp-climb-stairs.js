(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-climb-stairs",
    area: "dsa",
    title: "Climbing Stairs",
    tag: "Dynamic Programming",
    tags: ["dp", "climbing stairs", "counting", "recurrence", "faang"],
    concept: `You can climb 1 or 2 steps at a time. How many distinct ways can you reach step n?

**Pattern:** 1D counting DP — O(n)
**Hint:** The last move into step i came from i-1 or i-2.
**Scenario:** FAANG recurrence: ways(n) = ways(n-1) + ways(n-2).`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dp.climbStairs",
        time:  "O(n)",
        space: "O(n)",
        code: `function climbStairs(n) {
  if (n <= 2) return n;
  const dp = [0, 1, 2];
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
const n = 6;
const result = climbStairs(n);`,
      });
    }
  }]);
})();
