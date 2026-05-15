(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw2-perm-in-str",
    area: "dsa",
    title: "Permutation in String",
    tag: "Sliding Window II",
    tags: ["sliding window", "fixed window", "anagram", "string", "faang", "premium", "lc567"],
    concept: `Return true if any permutation (rearrangement) of pattern p exists as a substring of s.

🧒 **Kid explanation:** You have the letters "ab". Does "eidbaooo" secretly hide "ba" or "ab" anywhere? Slide a window the same size as your pattern across the string. If the window has the exact same letter counts as your pattern, that's a match!

**Pattern:** Fixed-size sliding window + character frequency comparison — O(n)
**Hint:** Window size = len(p). Slide and compare frequency maps instead of sorting.
**Scenario:** Anagram detector — is any rearrangement of a keyword hiding in this text?`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'sliding2', problem: 'permInStr' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
