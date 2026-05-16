(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw2-min-window",
    area: "dsa",
    title: "Minimum Window Substring",
    tag: "Sliding Window II",
    tags: ["sliding window", "two pointers", "hash map", "string", "faang", "premium", "lc76"],
    concept: `Find the smallest substring of s that contains ALL characters of t.

🧒 **Kid explanation:** Imagine you're reading a book and you need to find all letters of the word "ABC". Slide a magnifying glass across — expand it right until you see all the letters, then shrink it from the left to get the shortest possible view. That shortest view is your answer!

**Pattern:** Variable sliding window + two frequency maps — O(n+m)
**Hint:** Expand right until all chars covered, shrink left to minimize, track global minimum.
**Scenario:** Log search — find the shortest log excerpt that contains all required keywords.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'sliding2.minWindow',
        time:  'O(n+m)',
        space: 'O(m)',
        code: `function minWindow(s, t) {
  const need = {};
  for (const ch of t) need[ch] = (need[ch] || 0) + 1;
  let have = 0;
  const required = Object.keys(need).length;
  let left = 0;
  let minLen = Infinity;
  let minStart = 0;
  const window = {};
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    window[ch] = (window[ch] || 0) + 1;
    if (need[ch] && window[ch] === need[ch]) have++;
    while (have === required) {
      if (right - left + 1 < minLen) {
        minLen = right - left + 1;
        minStart = left;
      }
      const lch = s[left];
      window[lch]--;
      if (need[lch] && window[lch] < need[lch]) have--;
      left++;
    }
  }
  return minLen === Infinity ? "" : s.substring(minStart, minStart + minLen);
}
const s = "ADOBECODEBANC";
const t = "ABC";
const result = minWindow(s, t);`,
      });
    }
  }]);
})();
