(function() {
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
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dpx', problem: 'wordBreak' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
