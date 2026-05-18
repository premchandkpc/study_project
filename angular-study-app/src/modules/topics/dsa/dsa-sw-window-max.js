(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-sw-window-max",
    area: "dsa",
    title: "Sliding Window Maximum",
    tag: "Sliding Window",
    tags: ["sliding window", "monotonic deque", "array", "maximum"],
    concept: `For every contiguous window of size k, output the maximum value in that window.

**Pattern:** Monotonic deque — O(n)
**Hint:** Deque stores candidate indices in decreasing value order; front is always the max.
**Scenario:** Rolling leaderboard — each window needs the current peak without rescanning all k values.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "sliding.windowMax",
        time:  "O(n)",
        space: "O(k)",
        code: `function maxSlidingWindow(nums, k) {
  const deque = [];
  const result = [];
  for (let i = 0; i < nums.length; i++) {
    while (deque.length && deque[0] < i - k + 1) deque.shift();
    while (deque.length && nums[deque[deque.length - 1]] < nums[i]) deque.pop();
    deque.push(i);
    if (i >= k - 1) result.push(nums[deque[0]]);
  }
  return result;
}
const nums = [1, 3, -1, -3, 5, 3, 6, 7];
const k = 3;
const result = maxSlidingWindow(nums, k);`,
      });
    }
  }]);
})();
