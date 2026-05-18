(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-unique-paths",
    area: "dsa",
    title: "Unique Paths Grid",
    tag: "Dynamic Programming",
    tags: ["dp", "grid", "2d dp", "counting", "faang"],
    concept: `In an m x n grid, moving only right or down, count unique paths to the bottom-right cell.

**Pattern:** 2D counting DP — O(mn)
**Hint:** The first row and first column each have exactly one path.
**Scenario:** FAANG grid DP — every cell aggregates from top and left.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dp.uniquePaths",
        time:  "O(mn)",
        space: "O(mn)",
        code: `function uniquePaths(m, n) {
  const dp = Array.from({ length: m }, () => new Array(n).fill(1));
  for (let i = 1; i < m; i++) {
    for (let j = 1; j < n; j++) {
      dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
  }
  return dp[m - 1][n - 1];
}
const m = 3;
const n = 7;
const result = uniquePaths(m, n);`,
      });
    }
  }]);
})();
