/**
 * dsa-sw-max-sum-fixed.js — Max Sum Subarray (Fixed Window)
 * SELF-CONTAINED: metadata + code + visual all here.
 * Template: DSA.SlidingWindowProblem
 */
(function () {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id:   "dsa-sw-max-sum-fixed",
    area: "dsa",
    title: "Max Sum Subarray (fixed k)",
    tag:  "Sliding Window",
    tags: ["sliding window", "fixed window", "array", "subarray", "sum"],
    concept: "Given an integer array and k, find the maximum sum of any contiguous subarray of size k.\n\n**Pattern:** Fixed sliding window — O(n)\n**Hint:** Build first window once, then slide right: add new element, remove old element.\n**Scenario:** Traffic dashboard — find busiest exact k-minute interval.",
    why: "Classic first sliding window problem. Instead of recomputing sum from scratch for each window O(n·k), maintain a running sum and update in O(1) per slide.",
    example: {
      language: "javascript",
      code: "function maxSumSubarray(arr, k) {\n  let windowSum = 0;\n  for (let i = 0; i < k; i++) windowSum += arr[i];\n  let maxSum = windowSum;\n  for (let i = k; i < arr.length; i++) {\n    windowSum = windowSum + arr[i] - arr[i - k];\n    if (windowSum > maxSum) maxSum = windowSum;\n  }\n  return maxSum;\n}\n// arr=[2,1,5,1,3,2], k=3 → 9  (window [5,1,3])",
      notes: "Add arr[i], subtract arr[i-k]. Window slides in O(1) per step.",
    },
    interview: [
      { question: "Why is sliding window faster than brute force here?", answer: "Brute force recomputes each window sum from scratch → O(n·k). Sliding window maintains running sum, updating in O(1) per step → O(n) total.", followUps: ["What if k > arr.length?", "Handle negative numbers?"] },
      { question: "What changes for a variable-size window?", answer: "Fixed window: move both ends together. Variable window: expand right until condition breaks, shrink left to restore it.", followUps: ["Give example of variable window problem"] },
    ],
    tradeoffs: {
      pros: ["O(n) time — single pass", "O(1) space", "Easy to implement"],
      cons: ["Only works for fixed k", "Does not handle all constraint types"],
      when: "Use when window size is fixed and you need aggregate (sum/max/avg) over it.",
    },
    gotchas: ["k must be <= arr.length — check before running", "Do not re-initialize windowSum inside the second loop"],
    visual: function (mount) {
      new window.DSA.SlidingWindowProblem(mount, {
        title: "sliding.maxSumFixed",
        time:  "O(n)",
        space: "O(1)",
        code: "function maxSumSubarray(arr, k) {\n  let windowSum = 0;\n  for (let i = 0; i < k; i++) windowSum += arr[i];\n  let maxSum = windowSum;\n  for (let i = k; i < arr.length; i++) {\n    windowSum = windowSum + arr[i] - arr[i - k];\n    if (windowSum > maxSum) maxSum = windowSum;\n  }\n  return maxSum;\n}\nconst arr = [2, 1, 5, 1, 3, 2];\nconst k = 3;\nconst result = maxSumSubarray(arr, k);",
      }).render();
    },
  }]);
})();
