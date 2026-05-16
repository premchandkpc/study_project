(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dpx-decode-ways",
    area: "dsa",
    title: "Decode Ways",
    tag: "DP Extended",
    tags: ["dp", "string", "counting", "digits", "faang", "lc91"],
    concept: `Count the number of ways to decode a digit string where A=1...Z=26.

🧒 **Kid explanation:** "226" could mean: 2-2-6 = BBF, 22-6 = VF, or 2-26 = BZ. Three ways! At each position, you can decode ONE digit (if it's 1-9) or TWO digits (if the pair is 10-26). It's exactly like Climbing Stairs but with validity checks — some "steps" are forbidden (0, 00, 27, etc.)!

**Pattern:** 1D counting DP (Fibonacci-style with guards) — O(n)
**Key insight:** dp[i] = (1-digit decode of s[i-1] valid ? dp[i-1] : 0) + (2-digit decode of s[i-2..i-1] ∈ [10,26] ? dp[i-2] : 0).
**Scenario:** SMS decoder — count how many English-word interpretations a compressed digit string has.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'dpx.decodeWays',
        time:  'O(n)',
        space: 'O(n)',
        code: `function numDecodings(s) {
  if (!s || s[0] === '0') return 0;
  const n = s.length;
  const dp = new Array(n + 1).fill(0);
  dp[0] = 1;
  dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    const one = parseInt(s[i - 1]);
    const two = parseInt(s.substring(i - 2, i));
    if (one >= 1) dp[i] += dp[i - 1];
    if (two >= 10 && two <= 26) dp[i] += dp[i - 2];
  }
  return dp[n];
}
const s = "226";
const result = numDecodings(s);`,
      });
    }
  }]);
})();
