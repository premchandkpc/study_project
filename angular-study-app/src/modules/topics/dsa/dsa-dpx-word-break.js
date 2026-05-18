(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dpx-word-break",
    area: "dsa",
    title: "Word Break",
    tag: "DP Extended",
    tags: ["dp", "string", "hash set", "reachability", "faang", "lc139"],
    concept: `Can the string be segmented into words from a dictionary?

🧒 **Kid explanation:** Imagine "leetcode" has no spaces. Can you cut it into dictionary words? "leet" + "code" = YES! Use a DP array where dp[i] means "I can make a valid cut at position i". Start from position 0 (always reachable). For every position, check if any dictionary word ends exactly there AND the position before it was also reachable.

**Pattern:** 1D reachability DP — O(n² × m) where m = avg word length
**Key insight:** dp[i] = true if there exists j < i where dp[j]=true AND s[j..i-1] is a dictionary word.
**Scenario:** NLP tokenizer — can a run-together string be split into valid dictionary words?`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dpx.wordBreak",
        time:  "O(n²)",
        space: "O(n)",
        code: `function wordBreak(s, wordDict) {
  const set = {};
  for (const w of wordDict) set[w] = true;
  const dp = new Array(s.length + 1).fill(false);
  dp[0] = true;
  for (let i = 1; i <= s.length; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && set[s.substring(j, i)]) {
        dp[i] = true;
        break;
      }
    }
  }
  return dp[s.length];
}
const s = "leetcode";
const wordDict = ["leet", "code"];
const result = wordBreak(s, wordDict);`,
      });
    }
  }]);
})();
