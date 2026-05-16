(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-edit-distance",
    area: "dsa",
    title: "Edit Distance",
    tag: "Dynamic Programming",
    tags: ["dp", "edit distance", "string", "levenshtein", "faang"],
    concept: `Return the minimum insert, delete, or replace operations needed to convert word1 into word2.

**Pattern:** 2D min-cost string DP — O(mn)
**Hint:** Mismatch chooses 1 + min(insert, delete, replace).
**Scenario:** Spell-check, search suggestions, diff tools.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'dp.editDistance',
        time:  'O(mn)',
        space: 'O(mn)',
        code: `function minDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}
const word1 = "horse";
const word2 = "ros";
const result = minDistance(word1, word2);`,
      });
    }
  }]);
})();
