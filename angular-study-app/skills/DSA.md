# DSA Topics & Problems

**Topic file location:** `src/modules/topics/dsa/`
**Topic array:** `window.DSA_TOPICS`
**Area string:** `"dsa"`

All DSA problems use the tracer-based OOP system. See [ANIMATIONS.md](ANIMATIONS.md) for the engine.

## Visual Style References (inputs/)

| Image                                                                        | Apply to DSA topics                                                                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `inputs/image copy.png` — Green tree hierarchy (Main→Controller→Application) | **Tree problems:** BST/AVL/Trie node layout, BFS level order tree, recursion tree for DP. Use green box style for tree nodes               |
| `inputs/image copy 7.png` — Blueprint numbered callouts, colored sections    | **Algorithm steps:** each phase = colored band (initialize/scan/compute/return). Numbered ① ② ③ on array cells showing active index        |
| `inputs/image copy 3.png` — Wheel: center hub + radial categories            | **Pattern overview page:** center = "DSA Patterns", branches = Sliding Window/Two Pointer/Binary Search/DP/Graph/Stack/Backtracking/Greedy |
| `inputs/image copy 12.png` — SQL mind map (dark bg, colored radial branches) | **Complexity overview:** center = "Big-O", branches = O(1)/O(logn)/O(n)/O(nlogn)/O(n²)/O(2ⁿ) with examples per branch                      |
| `inputs/image copy 5.png` — Obsidian organic mind map                        | **Problem relationship map:** problems grouped by pattern, edges = "same technique", click → problem opens                                 |

## Visualization Style for DSA Problems

Every DSA visual already uses DSAViz tracer. Apply ByteByteGo style to the **narration and phase labels**:

```
Phase labels (colored badges):         Numbered step callouts in array:
  scan   → gray                          arr[i] shows ① badge when active
  found  → green                         arr[j] shows ② badge
  expand → blue                          window shows colored highlight band
  shrink → orange
  base   → purple (DP)
  fill   → teal (DP)
```

Always-visible summary panel (add to each problem below the 3-panel viz):

```
┌─ PATTERN ──────────────────────────────────────┐
│  Sliding Window — Fixed Size                   │
│  When: contiguous subarray, fixed/variable k   │
│  Key: expand right, shrink left, track max/min │
│  Template: while(right < n) { ... right++; }   │
└────────────────────────────────────────────────┘
```

---

## Problems Built

### Sliding Window (Pattern: `DSA.SlidingWindowProblem`)

| File                      | Problem                             | Time | Space |
| ------------------------- | ----------------------------------- | ---- | ----- |
| `dsa-sw-max-sum-fixed.js` | Max Sum Subarray (fixed k)          | O(n) | O(1)  |
| `dsa-sw-longest-uniq.js`  | Longest Substring Without Repeating | O(n) | O(k)  |
| `dsa-sw-window-max.js`    | Sliding Window Maximum (deque)      | O(n) | O(k)  |
| `dsa-sw-min-subarray.js`  | Minimum Size Subarray Sum           | O(n) | O(1)  |

### Sliding Window II — Variable (Pattern: `DSA.SlidingWindowProblem`)

| File                     | Problem                  | Time | Space |
| ------------------------ | ------------------------ | ---- | ----- |
| `dsa-sw2-min-window.js`  | Minimum Window Substring | O(n) | O(k)  |
| `dsa-sw2-perm-in-str.js` | Permutation in String    | O(n) | O(k)  |

### Two Pointer (Pattern: `DSA.TwoPointerProblem`)

| File                        | Problem                   | Time  | Space |
| --------------------------- | ------------------------- | ----- | ----- |
| `dsa-tp-three-sum.js`       | 3Sum                      | O(n²) | O(1)  |
| `dsa-tp-container-water.js` | Container With Most Water | O(n)  | O(1)  |
| `dsa-tp-trap-rain.js`       | Trapping Rain Water       | O(n)  | O(1)  |

### Binary Search (Pattern: `DSA.BinarySearchProblem`)

| File                         | Problem                        | Time       | Space |
| ---------------------------- | ------------------------------ | ---------- | ----- |
| `dsa-bs-search-rotated.js`   | Search in Rotated Sorted Array | O(log n)   | O(1)  |
| `dsa-bs-find-min-rotated.js` | Find Minimum in Rotated Array  | O(log n)   | O(1)  |
| `dsa-bs-koko-bananas.js`     | Koko Eating Bananas            | O(n log m) | O(1)  |

### Dynamic Programming (Pattern: `DSA.DPProblem`)

| File                        | Problem                        | Time     | Space  |
| --------------------------- | ------------------------------ | -------- | ------ |
| `dsa-dp-fibonacci.js`       | Fibonacci (memoized/tabulated) | O(n)     | O(n)   |
| `dsa-dp-climb-stairs.js`    | Climbing Stairs                | O(n)     | O(1)   |
| `dsa-dp-house-robber.js`    | House Robber                   | O(n)     | O(1)   |
| `dsa-dp-coin-change.js`     | Coin Change                    | O(n×m)   | O(n)   |
| `dsa-dp-knapsack.js`        | 0/1 Knapsack                   | O(n×W)   | O(n×W) |
| `dsa-dp-lcs.js`             | Longest Common Subsequence     | O(m×n)   | O(m×n) |
| `dsa-dp-lis.js`             | Longest Increasing Subsequence | O(n²)    | O(n)   |
| `dsa-dp-edit-distance.js`   | Edit Distance (Levenshtein)    | O(m×n)   | O(m×n) |
| `dsa-dp-unique-paths.js`    | Unique Paths                   | O(m×n)   | O(m×n) |
| `dsa-dp-partition-equal.js` | Partition Equal Subset Sum     | O(n×sum) | O(sum) |

### DP Extended (Pattern: `DSA.DPProblem`)

| File                     | Problem                  | Time  | Space |
| ------------------------ | ------------------------ | ----- | ----- |
| `dsa-dpx-word-break.js`  | Word Break               | O(n²) | O(n)  |
| `dsa-dpx-decode-ways.js` | Decode Ways              | O(n)  | O(n)  |
| `dsa-dpx-jump-game.js`   | Jump Game II             | O(n)  | O(1)  |
| `dsa-dpx-max-product.js` | Maximum Product Subarray | O(n)  | O(1)  |

### Graphs (Pattern: `DSA.GraphProblem`)

| File                       | Problem                     | Time           | Space  |
| -------------------------- | --------------------------- | -------------- | ------ |
| `dsa-graph-bfs.js`         | BFS — Level Order Traversal | O(V+E)         | O(V)   |
| `dsa-graph-dfs.js`         | DFS — Connected Components  | O(V+E)         | O(V)   |
| `dsa-graph-dijkstra.js`    | Dijkstra Shortest Path      | O((V+E) log V) | O(V)   |
| `dsa-graph-num-islands.js` | Number of Islands           | O(m×n)         | O(m×n) |
| `dsa-graph-topo-sort.js`   | Topological Sort (Kahn's)   | O(V+E)         | O(V)   |

### Monotonic Stack (Pattern: `DSA.StackProblem`)

| File                      | Problem                        | Time | Space |
| ------------------------- | ------------------------------ | ---- | ----- |
| `dsa-stk-valid-paren.js`  | Valid Parentheses              | O(n) | O(n)  |
| `dsa-stk-daily-temps.js`  | Daily Temperatures             | O(n) | O(n)  |
| `dsa-stk-largest-rect.js` | Largest Rectangle in Histogram | O(n) | O(n)  |

### Backtracking (Pattern: `DSA.BacktrackingProblem`)

| File                     | Problem         | Time       | Space |
| ------------------------ | --------------- | ---------- | ----- |
| `dsa-bt-subsets.js`      | Subsets         | O(2^n)     | O(n)  |
| `dsa-bt-permutations.js` | Permutations    | O(n!)      | O(n)  |
| `dsa-bt-comb-sum.js`     | Combination Sum | O(k × 2^n) | O(n)  |

### Greedy (Pattern: `DSA.GreedyProblem`)

| File                     | Problem              | Time       | Space |
| ------------------------ | -------------------- | ---------- | ----- |
| `dsa-greedy-activity.js` | Activity Selection   | O(n log n) | O(1)  |
| `dsa-greedy-coin.js`     | Coin Change (greedy) | O(n)       | O(1)  |
| `dsa-greedy-job-seq.js`  | Job Sequencing       | O(n log n) | O(n)  |

---

## Problems Still to Add

### High Priority (FAANG)

| Problem                           | Pattern       | Difficulty |
| --------------------------------- | ------------- | ---------- |
| Median of Two Sorted Arrays       | Binary Search | Hard       |
| LRU Cache                         | HashMap + DLL | Medium     |
| Word Ladder                       | BFS           | Hard       |
| Alien Dictionary                  | Topo Sort     | Hard       |
| Course Schedule II                | Topo Sort     | Medium     |
| Pacific Atlantic Water Flow       | DFS/BFS       | Medium     |
| Merge k Sorted Lists              | Heap          | Hard       |
| Serialize/Deserialize Binary Tree | Tree DFS      | Hard       |
| Longest Palindromic Subsequence   | DP            | Medium     |
| Burst Balloons                    | DP            | Hard       |
| Regular Expression Matching       | DP            | Hard       |
| N-Queens                          | Backtracking  | Hard       |
| Sudoku Solver                     | Backtracking  | Hard       |

### Tree Problems (pattern not yet built)

| Problem                           | Notes                           |
| --------------------------------- | ------------------------------- |
| Binary Tree Level Order Traversal | Need `DSA.TreeProblem` template |
| Lowest Common Ancestor            | Need `DSA.TreeProblem` template |
| Binary Tree from Preorder/Inorder | Need `DSA.TreeProblem` template |
| Validate BST                      | Need `DSA.TreeProblem` template |

**TODO:** Create `tree-problem.template.js` extending `DSA.Problem` with tree-specific tracer opts.

---

## DSA Topic File Pattern

```js
(function () {
  'use strict';

  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id:    'dsa-<pattern>-<name>',
    area:  'dsa',
    title: '<Problem Name>',
    tag:   '<Pattern>',    // 'Sliding Window'|'Two Pointer'|'Binary Search'|'Dynamic Programming'|etc.
    tags:  ['dsa', '<pattern>', '<keyword>'],

    concept: `<explanation with complexity>`,
    why: `<when to recognize this pattern>`,

    example: {
      language: 'javascript',
      code: `// Clean algorithm code — will be shown in code panel`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Edge case 1', 'Edge case 2'],

    visual: function (mount) {
      new window.DSA.<PatternClass>(mount, {
        title: '<pattern>.<name>',
        time:  'O(n)',
        space: 'O(1)',
        code: `function solve(arr) {
  // full implementation
  // tracer captures vars at each line
}
const arr = [2, 1, 5, 1, 3, 2];
const result = solve(arr);`,
      }).render();
    },
  }]);
})();
```

---

## How Tracer Captures State

The tracer executes the code string line-by-line via eval with instrumentation.
It captures a snapshot at each line execution.

**Key rule:** The algorithm code in `code` must be a COMPLETE executable script.
It must define and CALL the function at the bottom:

```js
function myAlgo(arr, k) {
  // implementation
}
// MUST call at bottom — tracer stops here
const result = myAlgo([2, 1, 5, 1, 3, 2], 3);
```

Without the call, tracer captures 0 steps (function body never executes).
