(function() {
  "use strict";
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
      window.DSAViz.topic.render(mount, {
        title: "sliding2.permInStr",
        time:  "O(n)",
        space: "O(1)",
        code: `function checkInclusion(s1, s2) {
  if (s1.length > s2.length) return false;
  const count = new Array(26).fill(0);
  for (let i = 0; i < s1.length; i++) {
    count[s1.charCodeAt(i) - 97]++;
    count[s2.charCodeAt(i) - 97]--;
  }
  if (count.every(c => c === 0)) return true;
  for (let i = s1.length; i < s2.length; i++) {
    count[s2.charCodeAt(i) - 97]--;
    count[s2.charCodeAt(i - s1.length) - 97]++;
    if (count.every(c => c === 0)) return true;
  }
  return false;
}
const s1 = "ab";
const s2 = "eidbaooo";
const result = checkInclusion(s1, s2);`,
      });
    }
  }]);
})();
