(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-lcs",
    area: "dsa",
    title: "Longest Common Subsequence",
    tag: "Dynamic Programming",
    tags: ["dp", "lcs", "string", "2d dp", "subsequence"],
    concept: `Find the length of the longest sequence that appears in both strings in the same relative order.

**Pattern:** 2D string DP — O(mn)
**Hint:** Match uses diagonal + 1; mismatch takes max(top, left).
**Scenario:** Diff engines and DNA matching.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dp.lcs",
        time:  "O(mn)",
        space: "O(mn)",
        code: `function lcs(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}
const s1 = "ABCBDAB";
const s2 = "BDCAB";
const result = lcs(s1, s2);`,
      });
    }
  }]);
})();
