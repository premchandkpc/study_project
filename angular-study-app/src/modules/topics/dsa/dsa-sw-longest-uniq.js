(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-longest-uniq",
    area: "dsa",
    title: "Longest Substr No Repeat",
    tag: "Sliding Window",
    tags: ["sliding window", "variable window", "string", "hashmap", "frequency"],
    concept: `Return the length of the longest substring without repeating characters.

**Pattern:** Variable sliding window + frequency map — O(n)
**Hint:** Expand right; when duplicate appears, move left until the window is valid again.
**Scenario:** Session-token scan — keep the longest contiguous clean segment.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'sliding.longestUniq',
        time:  'O(n)',
        space: 'O(k)',
        code: `function lengthOfLongestSubstring(s) {
  const map = {};
  let left = 0;
  let maxLen = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (map[ch] !== undefined && map[ch] >= left) {
      left = map[ch] + 1;
    }
    map[ch] = right;
    if (right - left + 1 > maxLen) maxLen = right - left + 1;
  }
  return maxLen;
}
const s = "abcabcbb";
const result = lengthOfLongestSubstring(s);`,
      });
    }
  }]);
})();
