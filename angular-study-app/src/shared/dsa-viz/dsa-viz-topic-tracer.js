/**
 * dsa-viz-topic-tracer.js
 * Wraps window._dsaRenderViz to inject [Visual] [Live Trace] tabs on every DSA topic.
 * Load AFTER dsa.js (which defines _dsaRenderViz) and AFTER dsa-viz-tracer.js / dsa-viz-runtime.js.
 *
 * Zero changes required to individual DSA problem files.
 */
(function () {
  'use strict';

  /* ── CANONICAL CODE MAP ─────────────────────────────────────────
     Key: "topic.problem" matches _dsaRenderViz(mount, { topic, problem }) calls.
     Each entry: { code, time, space }
  ──────────────────────────────────────────────────────────────── */
  const CODE_MAP = {

    /* ── SLIDING WINDOW ─────────────────────────── */
    'sliding.maxSumFixed': {
      time: 'O(n)', space: 'O(1)',
      code: `function maxSumSubarray(arr, k) {
  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += arr[i];
  let maxSum = windowSum;
  for (let i = k; i < arr.length; i++) {
    windowSum = windowSum + arr[i] - arr[i - k];
    if (windowSum > maxSum) maxSum = windowSum;
  }
  return maxSum;
}
const arr = [2, 1, 5, 1, 3, 2];
const k = 3;
const result = maxSumSubarray(arr, k);`,
    },

    'sliding.longestUniq': {
      time: 'O(n)', space: 'O(k)',
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
    },

    'sliding.minSubarraySum': {
      time: 'O(n)', space: 'O(1)',
      code: `function minSubArrayLen(target, nums) {
  let left = 0;
  let sum = 0;
  let minLen = Infinity;
  for (let right = 0; right < nums.length; right++) {
    sum += nums[right];
    while (sum >= target) {
      const len = right - left + 1;
      if (len < minLen) minLen = len;
      sum -= nums[left];
      left++;
    }
  }
  return minLen === Infinity ? 0 : minLen;
}
const target = 7;
const nums = [2, 3, 1, 2, 4, 3];
const result = minSubArrayLen(target, nums);`,
    },

    'sliding.windowMax': {
      time: 'O(n)', space: 'O(k)',
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
    },

    'sliding2.minWindow': {
      time: 'O(n+m)', space: 'O(m)',
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
    },

    'sliding2.permInStr': {
      time: 'O(n)', space: 'O(1)',
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
    },

    /* ── TWO POINTER ─────────────────────────────── */
    'twoptr.containerWater': {
      time: 'O(n)', space: 'O(1)',
      code: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let maxWater = 0;
  while (left < right) {
    const h = Math.min(height[left], height[right]);
    const w = right - left;
    const water = h * w;
    if (water > maxWater) maxWater = water;
    if (height[left] < height[right]) left++;
    else right--;
  }
  return maxWater;
}
const height = [1, 8, 6, 2, 5, 4, 8, 3, 7];
const result = maxArea(height);`,
    },

    'twoptr.threeSum': {
      time: 'O(n²)', space: 'O(1)',
      code: `function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue;
    let left = i + 1;
    let right = nums.length - 1;
    while (left < right) {
      const sum = nums[i] + nums[left] + nums[right];
      if (sum === 0) {
        result.push([nums[i], nums[left], nums[right]]);
        while (left < right && nums[left] === nums[left + 1]) left++;
        while (left < right && nums[right] === nums[right - 1]) right--;
        left++;
        right--;
      } else if (sum < 0) {
        left++;
      } else {
        right--;
      }
    }
  }
  return result;
}
const nums = [-1, 0, 1, 2, -1, -4];
const result = threeSum(nums);`,
    },

    'twoptr.trapRain': {
      time: 'O(n)', space: 'O(1)',
      code: `function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) {
        leftMax = height[left];
      } else {
        water += leftMax - height[left];
      }
      left++;
    } else {
      if (height[right] >= rightMax) {
        rightMax = height[right];
      } else {
        water += rightMax - height[right];
      }
      right--;
    }
  }
  return water;
}
const height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1];
const result = trap(height);`,
    },

    /* ── STACK ───────────────────────────────────── */
    'stack.validParen': {
      time: 'O(n)', space: 'O(n)',
      code: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack[stack.length - 1] !== map[ch]) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}
const s = "({[]})";
const result = isValid(s);`,
    },

    'stack.dailyTemp': {
      time: 'O(n)', space: 'O(n)',
      code: `function dailyTemperatures(temps) {
  const result = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const idx = stack.pop();
      result[idx] = i - idx;
    }
    stack.push(i);
  }
  return result;
}
const temps = [73, 74, 75, 71, 69, 72, 76, 73];
const result = dailyTemperatures(temps);`,
    },

    'stack.largestRect': {
      time: 'O(n)', space: 'O(n)',
      code: `function largestRectangleArea(heights) {
  const stack = [];
  let maxArea = 0;
  const h = [...heights, 0];
  for (let i = 0; i < h.length; i++) {
    let start = i;
    while (stack.length && stack[stack.length - 1][1] > h[i]) {
      const [idx, ht] = stack.pop();
      const area = ht * (i - idx);
      if (area > maxArea) maxArea = area;
      start = idx;
    }
    stack.push([start, h[i]]);
  }
  return maxArea;
}
const heights = [2, 1, 5, 6, 2, 3];
const result = largestRectangleArea(heights);`,
    },

    /* ── BINARY SEARCH ───────────────────────────── */
    'bsearch.searchRotated': {
      time: 'O(log n)', space: 'O(1)',
      code: `function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (target >= nums[left] && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (target > nums[mid] && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}
const nums = [4, 5, 6, 7, 0, 1, 2];
const target = 0;
const result = search(nums, target);`,
    },

    'bsearch.findMinRotated': {
      time: 'O(log n)', space: 'O(1)',
      code: `function findMin(nums) {
  let left = 0;
  let right = nums.length - 1;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] > nums[right]) left = mid + 1;
    else right = mid;
  }
  return nums[left];
}
const nums = [3, 4, 5, 1, 2];
const result = findMin(nums);`,
    },

    'bsearch.kokoEating': {
      time: 'O(n log m)', space: 'O(1)',
      code: `function minEatingSpeed(piles, h) {
  let left = 1;
  let right = Math.max(...piles);
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    let hours = 0;
    for (const pile of piles) hours += Math.ceil(pile / mid);
    if (hours <= h) right = mid;
    else left = mid + 1;
  }
  return left;
}
const piles = [3, 6, 7, 11];
const h = 8;
const result = minEatingSpeed(piles, h);`,
    },

    /* ── BACKTRACKING ────────────────────────────── */
    'backtrack.subsets': {
      time: 'O(2^n)', space: 'O(n)',
      code: `function subsets(nums) {
  const result = [];
  function backtrack(start, current) {
    result.push([...current]);
    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}
const nums = [1, 2, 3];
const result = subsets(nums);`,
    },

    'backtrack.combSum': {
      time: 'O(2^t)', space: 'O(t)',
      code: `function combinationSum(candidates, target) {
  const result = [];
  function backtrack(start, current, remaining) {
    if (remaining === 0) { result.push([...current]); return; }
    if (remaining < 0) return;
    for (let i = start; i < candidates.length; i++) {
      current.push(candidates[i]);
      backtrack(i, current, remaining - candidates[i]);
      current.pop();
    }
  }
  backtrack(0, [], target);
  return result;
}
const candidates = [2, 3, 6, 7];
const target = 7;
const result = combinationSum(candidates, target);`,
    },

    'backtrack.permutations': {
      time: 'O(n!)', space: 'O(n)',
      code: `function permute(nums) {
  const result = [];
  function backtrack(current, remaining) {
    if (remaining.length === 0) { result.push([...current]); return; }
    for (let i = 0; i < remaining.length; i++) {
      current.push(remaining[i]);
      backtrack(current, [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
      current.pop();
    }
  }
  backtrack([], nums);
  return result;
}
const nums = [1, 2, 3];
const result = permute(nums);`,
    },

    /* ── DP ──────────────────────────────────────── */
    'dp.fibonacci': {
      time: 'O(n)', space: 'O(n)',
      code: `function fib(n) {
  const dp = [0, 1];
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
const n = 8;
const result = fib(n);`,
    },

    'dp.climbStairs': {
      time: 'O(n)', space: 'O(n)',
      code: `function climbStairs(n) {
  if (n <= 2) return n;
  const dp = [0, 1, 2];
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
const n = 6;
const result = climbStairs(n);`,
    },

    'dp.houseRobber': {
      time: 'O(n)', space: 'O(1)',
      code: `function rob(nums) {
  let prev2 = 0;
  let prev1 = 0;
  for (const n of nums) {
    const curr = Math.max(prev1, prev2 + n);
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}
const nums = [2, 7, 9, 3, 1];
const result = rob(nums);`,
    },

    'dp.coinChange': {
      time: 'O(n·m)', space: 'O(n)',
      code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let i = 1; i <= amount; i++) {
    for (const coin of coins) {
      if (coin <= i && dp[i - coin] + 1 < dp[i]) {
        dp[i] = dp[i - coin] + 1;
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}
const coins = [1, 5, 11];
const amount = 15;
const result = coinChange(coins, amount);`,
    },

    'dp.lcs': {
      time: 'O(mn)', space: 'O(mn)',
      code: `function lcs(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}
const s1 = "ABCBDAB";
const s2 = "BDCAB";
const result = lcs(s1, s2);`,
    },

    'dp.lis': {
      time: 'O(n²)', space: 'O(n)',
      code: `function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1);
  let maxLen = 1;
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i] && dp[j] + 1 > dp[i]) {
        dp[i] = dp[j] + 1;
      }
    }
    if (dp[i] > maxLen) maxLen = dp[i];
  }
  return maxLen;
}
const nums = [10, 9, 2, 5, 3, 7, 101, 18];
const result = lengthOfLIS(nums);`,
    },

    'dp.editDistance': {
      time: 'O(mn)', space: 'O(mn)',
      code: `function minDistance(word1, word2) {
  const m = word1.length;
  const n = word2.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (word1[i - 1] === word2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}
const word1 = "horse";
const word2 = "ros";
const result = minDistance(word1, word2);`,
    },

    'dp.knapsack': {
      time: 'O(nW)', space: 'O(nW)',
      code: `function knapsack(weights, values, capacity) {
  const n = weights.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(capacity + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let w = 0; w <= capacity; w++) {
      if (weights[i - 1] <= w) {
        dp[i][w] = Math.max(dp[i - 1][w], values[i - 1] + dp[i - 1][w - weights[i - 1]]);
      } else {
        dp[i][w] = dp[i - 1][w];
      }
    }
  }
  return dp[n][capacity];
}
const weights = [2, 3, 4, 5];
const values = [3, 4, 5, 6];
const capacity = 5;
const result = knapsack(weights, values, capacity);`,
    },

    'dp.uniquePaths': {
      time: 'O(mn)', space: 'O(mn)',
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
    },

    'dp.partitionEqual': {
      time: 'O(n·sum)', space: 'O(sum)',
      code: `function canPartition(nums) {
  const total = nums.reduce((a, b) => a + b, 0);
  if (total % 2 !== 0) return false;
  const target = total / 2;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const num of nums) {
    for (let j = target; j >= num; j--) {
      if (dp[j - num]) dp[j] = true;
    }
  }
  return dp[target];
}
const nums = [1, 5, 11, 5];
const result = canPartition(nums);`,
    },

    /* ── DPX ─────────────────────────────────────── */
    'dpx.jumpGame': {
      time: 'O(n)', space: 'O(1)',
      code: `function canJump(nums) {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false;
    if (i + nums[i] > maxReach) maxReach = i + nums[i];
  }
  return true;
}
const nums = [2, 3, 1, 1, 4];
const result = canJump(nums);`,
    },

    'dpx.maxProduct': {
      time: 'O(n)', space: 'O(1)',
      code: `function maxProduct(nums) {
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    const tempMax = Math.max(n, maxProd * n, minProd * n);
    minProd = Math.min(n, maxProd * n, minProd * n);
    maxProd = tempMax;
    if (maxProd > result) result = maxProd;
  }
  return result;
}
const nums = [2, 3, -2, 4];
const result = maxProduct(nums);`,
    },

    'dpx.decodeWays': {
      time: 'O(n)', space: 'O(n)',
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
    },

    'dpx.wordBreak': {
      time: 'O(n²)', space: 'O(n)',
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
    },

    /* ── GRAPH ───────────────────────────────────── */
    'graph.bfs': {
      time: 'O(V+E)', space: 'O(V)',
      code: `function bfs(graph, start) {
  const visited = {};
  const queue = [start];
  const order = [];
  visited[start] = true;
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const neighbor of graph[node]) {
      if (!visited[neighbor]) {
        visited[neighbor] = true;
        queue.push(neighbor);
      }
    }
  }
  return order;
}
const graph = { 0: [1,2], 1: [0,3,4], 2: [0,5], 3: [1], 4: [1], 5: [2] };
const result = bfs(graph, 0);`,
    },

    'graph.dfs': {
      time: 'O(V+E)', space: 'O(V)',
      code: `const visited = {};
const order = [];
function dfs(graph, node) {
  visited[node] = true;
  order.push(node);
  for (const neighbor of graph[node]) {
    if (!visited[neighbor]) dfs(graph, neighbor);
  }
}
const graph = { 0: [1,2], 1: [0,3,4], 2: [0,5], 3: [1], 4: [1], 5: [2] };
dfs(graph, 0);
const result = order;`,
    },

    'graph.dijkstra': {
      time: 'O((V+E) log V)', space: 'O(V)',
      code: `function dijkstra(graph, start) {
  const dist = {};
  for (const node in graph) dist[node] = Infinity;
  dist[start] = 0;
  const visited = {};
  const nodes = Object.keys(graph);
  while (true) {
    let u = null;
    for (const n of nodes) {
      if (!visited[n] && (u === null || dist[n] < dist[u])) u = n;
    }
    if (u === null || dist[u] === Infinity) break;
    visited[u] = true;
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}
const graph = {
  A: [['B', 4], ['C', 2]],
  B: [['D', 3], ['C', 1]],
  C: [['B', 1], ['D', 5]],
  D: []
};
const result = dijkstra(graph, 'A');`,
    },

    'graph.numIslands': {
      time: 'O(mn)', space: 'O(mn)',
      code: `function numIslands(grid) {
  let count = 0;
  function dfs(r, c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
    if (grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') { count++; dfs(r, c); }
    }
  }
  return count;
}
const grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
];
const result = numIslands(grid);`,
    },

    'graph.topoSort': {
      time: 'O(V+E)', space: 'O(V)',
      code: `function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [a, b] of prerequisites) adj[b].push(a);
  const visited = new Array(numCourses).fill(0);
  function dfs(node) {
    if (visited[node] === 1) return false;
    if (visited[node] === 2) return true;
    visited[node] = 1;
    for (const nei of adj[node]) {
      if (!dfs(nei)) return false;
    }
    visited[node] = 2;
    return true;
  }
  for (let i = 0; i < numCourses; i++) {
    if (!dfs(i)) return false;
  }
  return true;
}
const numCourses = 4;
const prerequisites = [[1,0],[2,0],[3,1],[3,2]];
const result = canFinish(numCourses, prerequisites);`,
    },

    /* ── GREEDY ──────────────────────────────────── */
    'greedy.activitySel': {
      time: 'O(n log n)', space: 'O(1)',
      code: `function activitySelection(activities) {
  activities.sort((a, b) => a[1] - b[1]);
  let count = 1;
  let lastEnd = activities[0][1];
  for (let i = 1; i < activities.length; i++) {
    if (activities[i][0] >= lastEnd) {
      count++;
      lastEnd = activities[i][1];
    }
  }
  return count;
}
const activities = [[1,3],[2,5],[3,9],[6,8],[5,7]];
const result = activitySelection(activities);`,
    },

    'greedy.greedyCoin': {
      time: 'O(n)', space: 'O(1)',
      code: `function greedyCoinChange(coins, amount) {
  coins.sort((a, b) => b - a);
  let count = 0;
  let remaining = amount;
  for (const coin of coins) {
    while (remaining >= coin) {
      remaining -= coin;
      count++;
    }
  }
  return remaining === 0 ? count : -1;
}
const coins = [25, 10, 5, 1];
const amount = 41;
const result = greedyCoinChange(coins, amount);`,
    },

    'greedy.jobSeq': {
      time: 'O(n²)', space: 'O(n)',
      code: `function jobSequencing(jobs) {
  jobs.sort((a, b) => b.profit - a.profit);
  const maxDeadline = Math.max(...jobs.map(j => j.deadline));
  const slots = new Array(maxDeadline + 1).fill(false);
  let totalProfit = 0;
  let count = 0;
  for (const job of jobs) {
    for (let t = job.deadline; t >= 1; t--) {
      if (!slots[t]) {
        slots[t] = true;
        totalProfit += job.profit;
        count++;
        break;
      }
    }
  }
  return { count, totalProfit };
}
const jobs = [
  { id: 'a', deadline: 2, profit: 100 },
  { id: 'b', deadline: 1, profit: 19 },
  { id: 'c', deadline: 2, profit: 27 },
  { id: 'd', deadline: 1, profit: 25 },
  { id: 'e', deadline: 3, profit: 15 }
];
const result = jobSequencing(jobs);`,
    },
  };

  /* ── STYLES ─────────────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('dsa-topic-tracer-styles')) return;
    const s = document.createElement('style');
    s.id = 'dsa-topic-tracer-styles';
    s.textContent = `
      .dtt-root { width: 100%; font-family: 'JetBrains Mono', monospace; }

      /* tab bar */
      .dtt-tab-bar {
        display: flex;
        border-bottom: 2px solid #30363d;
        margin-bottom: 0;
        background: #161b22;
      }
      .dtt-tab {
        background: transparent;
        border: none;
        border-bottom: 3px solid transparent;
        color: #768390;
        font-family: inherit;
        font-size: 12px;
        font-weight: 600;
        padding: 9px 18px;
        cursor: pointer;
        letter-spacing: .04em;
        text-transform: uppercase;
        transition: color .15s, border-color .15s;
        margin-bottom: -2px;
      }
      .dtt-tab:hover { color: #cdd9e5; }
      .dtt-tab.active {
        color: #58a6ff;
        border-bottom-color: #58a6ff;
      }
      .dtt-pane { display: none; }
      .dtt-pane.active { display: block; }

      /* live trace pane */
      .dtt-trace-pane {
        background: #0d1117;
        border-radius: 0 0 10px 10px;
        padding: 12px;
      }
      .dtt-trace-toolbar {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 10px;
        flex-wrap: wrap;
      }
      .dtt-complexity-badge {
        font-size: 11px;
        padding: 3px 10px;
        border-radius: 6px;
        border: 1px solid #30363d;
        color: #768390;
        background: #161b22;
      }
      .dtt-badge-time { color: #3fb950; border-color: #238636; }
      .dtt-badge-space { color: #58a6ff; border-color: #1f6feb; }

      .dtt-run-btn {
        background: #238636;
        border: none;
        border-radius: 6px;
        color: #fff;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        padding: 6px 16px;
        cursor: pointer;
        transition: background .15s;
        margin-left: auto;
      }
      .dtt-run-btn:hover { background: #2ea043; }
      .dtt-run-btn:disabled { background: #21262d; color: #768390; cursor: default; }

      .dtt-speed-select {
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #cdd9e5;
        font-family: inherit;
        font-size: 11px;
        padding: 4px 8px;
        cursor: pointer;
      }

      /* custom code textarea */
      .dtt-custom-wrap {
        border: 1px solid #30363d;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 10px;
        background: #161b22;
      }
      .dtt-custom-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .06em;
        color: #768390;
        padding: 6px 12px;
        background: #21262d;
        border-bottom: 1px solid #30363d;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .dtt-custom-label span { color: #58a6ff; }
      .dtt-custom-textarea {
        width: 100%;
        box-sizing: border-box;
        background: transparent;
        border: none;
        color: #cdd9e5;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        line-height: 1.6;
        padding: 10px 12px;
        resize: vertical;
        min-height: 120px;
        max-height: 260px;
        outline: none;
      }
      .dtt-custom-textarea::placeholder { color: #484f58; }

      /* output */
      .dtt-output { min-height: 80px; }
    `;
    document.head.appendChild(s);
  }

  /* ── WRAP _dsaRenderViz ──────────────────────────────────────── */
  function patchRenderViz() {
    const original = window._dsaRenderViz;
    if (!original || original.__dttPatched) return;

    window._dsaRenderViz = function (mount, opts) {
      injectStyles();
      const key = `${opts.topic}.${opts.problem}`;
      const entry = CODE_MAP[key];

      /* no canonical code for this problem → fall through to original */
      if (!entry) {
        return original.call(this, mount, opts);
      }

      mount.innerHTML = '';
      const root = document.createElement('div');
      root.className = 'dtt-root';
      mount.appendChild(root);

      /* ── tab bar ── */
      const tabBar = document.createElement('div');
      tabBar.className = 'dtt-tab-bar';

      const panes = {};
      const tabs = {};

      function makeTab(name, label) {
        const btn = document.createElement('button');
        btn.className = 'dtt-tab';
        btn.textContent = label;
        btn.dataset.tab = name;
        tabBar.appendChild(btn);
        tabs[name] = btn;

        const pane = document.createElement('div');
        pane.className = 'dtt-pane';
        pane.dataset.tab = name;
        panes[name] = pane;
      }

      makeTab('visual', '▶ Visual');
      makeTab('trace', '⚡ Live Trace');
      root.appendChild(tabBar);

      Object.values(panes).forEach(p => root.appendChild(p));

      /* activate tab */
      let activeTab = 'visual';
      function activate(name) {
        activeTab = name;
        Object.entries(tabs).forEach(([k, btn]) => {
          btn.classList.toggle('active', k === name);
        });
        Object.entries(panes).forEach(([k, pane]) => {
          pane.classList.toggle('active', k === name);
        });
        if (name === 'visual' && !panes.visual._rendered) {
          panes.visual._rendered = true;
          original.call(window, panes.visual, opts);
        }
        if (name === 'trace' && !panes.trace._built) {
          panes.trace._built = true;
          buildTracePane(panes.trace, entry, key);
        }
      }

      tabBar.addEventListener('click', e => {
        const btn = e.target.closest('.dtt-tab');
        if (btn) activate(btn.dataset.tab);
      });

      activate('visual');
    };

    window._dsaRenderViz.__dttPatched = true;
  }

  /* ── BUILD TRACE PANE ────────────────────────────────────────── */
  function buildTracePane(pane, entry, key) {
    pane.className = 'dtt-pane active dtt-trace-pane';

    /* toolbar */
    const toolbar = document.createElement('div');
    toolbar.className = 'dtt-trace-toolbar';

    const tBadge = document.createElement('span');
    tBadge.className = 'dtt-complexity-badge dtt-badge-time';
    tBadge.textContent = `Time: ${entry.time}`;

    const sBadge = document.createElement('span');
    sBadge.className = 'dtt-complexity-badge dtt-badge-space';
    sBadge.textContent = `Space: ${entry.space}`;

    const speedSel = document.createElement('select');
    speedSel.className = 'dtt-speed-select';
    [['800','0.5×'],['500','1×'],['280','2×'],['120','4×']].forEach(([v, l]) => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = l;
      if (v === '500') opt.selected = true;
      speedSel.appendChild(opt);
    });

    const runBtn = document.createElement('button');
    runBtn.className = 'dtt-run-btn';
    runBtn.textContent = '▶ Run';

    toolbar.appendChild(tBadge);
    toolbar.appendChild(sBadge);
    toolbar.appendChild(speedSel);
    toolbar.appendChild(runBtn);
    pane.appendChild(toolbar);

    /* custom code textarea */
    const customWrap = document.createElement('div');
    customWrap.className = 'dtt-custom-wrap';

    const customLabel = document.createElement('div');
    customLabel.className = 'dtt-custom-label';
    customLabel.innerHTML = '<span>Code</span> — edit or paste your own JS';
    customWrap.appendChild(customLabel);

    const textarea = document.createElement('textarea');
    textarea.className = 'dtt-custom-textarea';
    textarea.value = entry.code;
    textarea.spellcheck = false;
    textarea.rows = 10;
    customWrap.appendChild(textarea);
    pane.appendChild(customWrap);

    /* tab key → 2 spaces */
    textarea.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, s) + '  ' + textarea.value.substring(textarea.selectionEnd);
        textarea.selectionStart = textarea.selectionEnd = s + 2;
      }
    });

    /* output */
    const output = document.createElement('div');
    output.className = 'dtt-output';
    pane.appendChild(output);

    /* track active ctrl */
    let activeCtrl = null;

    /* run handler */
    function doRun() {
      if (!window.DSAViz?.tracer?.run) {
        output.innerHTML = '<div style="color:#f85149;padding:12px;font-size:12px">DSAViz.tracer not loaded.</div>';
        return;
      }
      if (!window.DSAViz?.runtime?.create) {
        output.innerHTML = '<div style="color:#f85149;padding:12px;font-size:12px">DSAViz.runtime not loaded.</div>';
        return;
      }

      const code = textarea.value.trim();
      if (!code) return;

      if (activeCtrl) { activeCtrl.stop(); activeCtrl = null; }

      runBtn.disabled = true;
      runBtn.textContent = '⏳';

      setTimeout(() => {
        try {
          const steps = window.DSAViz.tracer.run(code, { maxSteps: 400 });
          if (!steps || !steps.length) {
            output.innerHTML = '<div style="color:#e3b341;padding:12px;font-size:12px">No steps captured. Check for syntax errors.</div>';
            return;
          }

          const speed = Number(speedSel.value) || 500;
          const rt = window.DSAViz.runtime.create(output, {
            code,
            title: key,
            timeComplexity: entry.time,
            spaceComplexity: entry.space,
          });
          activeCtrl = rt.animate(steps, { speed });
        } catch (err) {
          output.innerHTML = `<div style="color:#f85149;padding:12px;font-size:12px">Error: ${err.message}</div>`;
        } finally {
          runBtn.disabled = false;
          runBtn.textContent = '▶ Run';
        }
      }, 0);
    }

    runBtn.addEventListener('click', doRun);

    /* auto-run on first open */
    doRun();
  }

  /* ── INIT ──────────────────────────────────────────────────────
     Wait for dsa.js to define _dsaRenderViz, then patch.
  ──────────────────────────────────────────────────────────────── */
  function init() {
    if (typeof window._dsaRenderViz === 'function') {
      patchRenderViz();
    } else {
      /* dsa.js loads async — poll briefly */
      let tries = 0;
      const t = setInterval(() => {
        if (typeof window._dsaRenderViz === 'function') {
          clearInterval(t);
          patchRenderViz();
        }
        if (++tries > 50) clearInterval(t);
      }, 100);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
