/* ===== DSA Visualizer — interactive step-through component ===== */

function initDSAVisualizer(root, _options) {
  // ── STATE ──────────────────────────────────────────────────
  let CUR_TOPIC = null, CUR_PROB = null;
  let STEPS = [], SI = 0, AUTO_T = null;

  // ── TOPICS ─────────────────────────────────────────────────
  const TOPICS = {
    sliding: {
      label: 'Sliding Window',
      problems: {
        maxSumFixed: {
          label: 'Max Sum Subarray (fixed k)',
          fn: solveMaxSumFixed,
          def: { arr:'2,1,5,1,3,2', k:'3' },
          q: 'Given an integer array and k, find the maximum sum of any contiguous subarray of size k.',
          scenario: 'Traffic dashboard: find the busiest exact k-minute interval.',
          pattern: 'Fixed sliding window',
          hint: 'Build the first window once, then add one new value and remove one old value per move.',
          examples: [
            { input:'arr=[2,1,5,1,3,2], k=3', output:'9', trace:'Windows: [2,1,5]=8 → [1,5,1]=7 → [5,1,3]=9✓ → [1,3,2]=6' },
            { input:'arr=[1,2,3,4,5], k=2', output:'9', trace:'Windows: 3,5,7,9✓' },
            { input:'arr=[-1,2,-3,4], k=2', output:'1', trace:'Windows: 1,-1,1✓' }
          ],
          wrongApproach: 'Nested loop: recalculate sum for each window from scratch → O(n·k). Tempting but slow.',
          aha: 'Slide by 1 each step: subtract arr[i-k] and add arr[i]. Sum updates in O(1), total O(n).'
        },
        longestUniq: {
          label: 'Longest Substr No Repeat',
          fn: solveLongestUniq,
          def: { str:'abcabcbb' },
          q: 'Return the length of the longest substring without repeating characters.',
          scenario: 'Session-token scan: keep the longest contiguous clean segment with no duplicate symbol.',
          pattern: 'Variable sliding window + frequency map',
          hint: 'Expand right; when duplicate appears, move left until the window is valid again.',
          examples: [
            { input:'s="abcabcbb"', output:'3', trace:'"abc"=3 → hit "a" again, shrink left → "bca"=3 → ... best=3' },
            { input:'s="bbbbb"', output:'1', trace:'Every char repeats → window always size 1' },
            { input:'s="pwwkew"', output:'3', trace:'"pw"→hit w→shrink→"wke"=3✓→"kew"=3' }
          ],
          wrongApproach: 'Trying all substrings with Set.has() → O(n²). You check too many windows.',
          aha: 'When you see a duplicate at right, jump left past the previous occurrence of that char. Freq map tells you exactly where.'
        },
        windowMax: {
          label: 'Sliding Window Maximum',
          fn: solveWindowMax,
          def: { arr:'1,3,-1,-3,5,3,6,7', k:'3' },
          q: 'For every contiguous window of size k, output the maximum value in that window.',
          scenario: 'Rolling leaderboard: each window needs the current peak without rescanning all k values.',
          pattern: 'Monotonic deque',
          hint: 'Deque stores candidate indices in decreasing value order; front is always the max.',
          examples: [
            { input:'arr=[1,3,-1,-3,5,3,6,7], k=3', output:'[3,3,5,5,6,7]', trace:'[1,3,-1]→3, [3,-1,-3]→3, [-1,-3,5]→5, [-3,5,3]→5, [5,3,6]→6, [3,6,7]→7' },
            { input:'arr=[1,2,3], k=1', output:'[1,2,3]', trace:'Each window is one element' },
            { input:'arr=[9,1,1,9], k=2', output:'[9,1,9]', trace:'[9,1]→9, [1,1]→1, [1,9]→9' }
          ],
          wrongApproach: 'Max scan inside each window → O(n·k). For k=1000 and n=10⁶ this TLEs.',
          aha: 'Monotonic deque: pop from back whenever new element ≥ back (those can never be max again). Pop front when it leaves window. Front = current max.'
        },
        minSubarraySum: {
          label: 'Min Size Subarray >= target',
          fn: solveMinSubarray,
          def: { arr:'2,3,1,2,4,3', k:'7' },
          q: 'Find the smallest length of a contiguous subarray whose sum is at least target.',
          scenario: 'Quota tracker: shortest run of events that reaches a required total.',
          pattern: 'Variable sliding window',
          hint: 'Grow until the target is reached, then shrink while the window stays valid.',
          examples: [
            { input:'arr=[2,3,1,2,4,3], target=7', output:'2', trace:'[4,3]=7 ✓ length 2' },
            { input:'arr=[2,1,6,5,4], target=9', output:'2', trace:'[6,5]=11≥9 ✓ then try shrink: [5]=5<9. Min=2' },
            { input:'arr=[1,1,1,1,7], target=7', output:'1', trace:'Just [7]=7 ✓ length 1' }
          ],
          wrongApproach: 'Prefix sum + binary search finds this too but it\'s O(n log n). Sliding window is cleaner O(n).',
          aha: 'Two pointers: right expands, left shrinks when sum≥target. Record length every time you can shrink.'
        },
      }
    },
    dp: {
      label: 'Dynamic Programming',
      problems: {
        fibonacci: {
          label: 'Fibonacci (bottom-up)',
          fn: solveFib,
          def: { n:'9' },
          q: 'Compute the nth Fibonacci number without exponential recursion.',
          scenario: 'Warm-up DP: each state depends on the previous two states.',
          pattern: '1D bottom-up DP',
          hint: 'Replace the recursion tree with a left-to-right table.',
          examples: [
            { input:'n=6', output:'8', trace:'dp=[0,1,1,2,3,5,8] — each cell = prev two' },
            { input:'n=9', output:'34', trace:'dp=[0,1,1,2,3,5,8,13,21,34]' },
            { input:'n=1', output:'1', trace:'Base case — dp[1]=1' }
          ],
          wrongApproach: 'Naive recursion fib(n)=fib(n-1)+fib(n-2) → O(2ⁿ). fib(50) calls fib(1) billions of times.',
          aha: 'Each fib(n) only needs the two previous values. Build left→right, O(n) time, O(1) space (just two vars).'
        },
        climbStairs: {
          label: 'Climbing Stairs',
          fn: solveClimbStairs,
          def: { n:'6' },
          q: 'You can climb 1 or 2 steps at a time. How many distinct ways can you reach step n?',
          scenario: 'Common FAANG-style recurrence question: ways(n) = ways(n-1) + ways(n-2).',
          pattern: '1D counting DP',
          hint: 'The last move into step i came from i-1 or i-2.'
        },
        houseRobber: {
          label: 'House Robber',
          fn: solveHouseRobber,
          def: { arr:'2,7,9,3,1' },
          q: 'Given money in houses in a line, maximize loot without robbing adjacent houses.',
          scenario: 'Common FAANG-style choose/skip question with adjacency constraint.',
          pattern: '1D decision DP',
          hint: 'At house i choose max(skip i, rob i + best through i-2).',
          examples: [
            { input:'[2,7,9,3,1]', output:'12', trace:'Rob 2+9+1=12 ✓ (skip 7 and 3)' },
            { input:'[1,2,3,1]', output:'4', trace:'Rob 1+3=4 ✓ vs 2+1=3' },
            { input:'[2,1,1,2]', output:'4', trace:'Rob 2+2=4 ✓ (skip adjacent 1s)' }
          ],
          wrongApproach: 'Always skip every other house: [2,3,2] → you\'d take 2+2=4 but optimal is 3 (only middle). Greedy fails.',
          aha: 'dp[i] = max(dp[i-1], dp[i-2]+nums[i]). Skip house i → take dp[i-1]. Rob house i → add to dp[i-2].'
        },
        coinChange: {
          label: 'Coin Change (min coins)',
          fn: solveCoin,
          def: { arr:'1,5,6,9', n:'11' },
          q: 'Given coin denominations and an amount, return the fewest coins needed to make that amount.',
          scenario: 'Payment engine: canonical greedy fails on many coin sets, so use DP.',
          pattern: 'Unbounded min-cost DP',
          hint: 'For each amount, try taking one last coin and reuse dp[amount - coin].',
          examples: [
            { input:'coins=[1,5,6,9], amount=11', output:'2', trace:'9+2·1=3 coins vs 6+5=2✓ coins' },
            { input:'coins=[1,2,5], amount=11', output:'3', trace:'5+5+1=3✓' },
            { input:'coins=[2], amount=3', output:'-1', trace:'Can\'t make odd with only coin=2' }
          ],
          wrongApproach: 'Greedy (always pick largest coin): coins=[1,3,4], amount=6 → greedy picks 4+1+1=3 but 3+3=2 is better.',
          aha: 'dp[a] = min coins to make amount a. For each coin c: dp[a]=min(dp[a], dp[a-c]+1). Bottom-up from 0→amount.'
        },
        uniquePaths: {
          label: 'Unique Paths Grid',
          fn: solveUniquePaths,
          def: { n:'3', k:'7' },
          q: 'In an m x n grid, moving only right or down, count how many unique paths reach the bottom-right cell.',
          scenario: 'Common FAANG-style grid DP where every cell aggregates from top and left.',
          pattern: '2D counting DP',
          hint: 'The first row and first column each have exactly one path.'
        },
        knapsack: {
          label: '0/1 Knapsack',
          fn: solveKnapsack,
          def: { arr:'2,3,4,5', k:'5,4,3,2', n:'5' },
          q: 'Given item weights, values, and capacity, maximize total value when each item can be used at most once.',
          scenario: 'Capacity planning: every item is a yes/no decision.',
          pattern: '2D choose/skip DP',
          hint: 'If the item fits, compare skip vs take; otherwise copy the row above.'
        },
        lcs: {
          label: 'Longest Common Subsequence',
          fn: solveLCS,
          def: { str:'AGGTAB', k:'GXTXAYB' },
          q: 'Find the length of the longest sequence that appears in both strings in the same relative order.',
          scenario: 'Diff engines and DNA matching: preserve order, but characters need not be contiguous.',
          pattern: '2D string DP',
          hint: 'Match uses diagonal + 1; mismatch takes max(top, left).'
        },
        editDistance: {
          label: 'Edit Distance',
          fn: solveEditDistance,
          def: { str:'horse', k:'ros' },
          q: 'Return the minimum insert, delete, or replace operations needed to convert word1 into word2.',
          scenario: 'Common FAANG-style string DP used in spell-check, search suggestions, and diff tools.',
          pattern: '2D min-cost string DP',
          hint: 'Mismatch chooses 1 + min(insert, delete, replace).'
        },
        lis: {
          label: 'Longest Increasing Subsequence',
          fn: solveLIS,
          def: { arr:'10,9,2,5,3,7,101,18' },
          q: 'Return the length of the longest strictly increasing subsequence.',
          scenario: 'Signal trend analysis: keep order, skip elements, find the longest rising chain.',
          pattern: '1D subsequence DP',
          hint: 'For every i, extend any previous j where arr[j] < arr[i].'
        },
        partitionEqual: {
          label: 'Partition Equal Subset Sum',
          fn: solvePartitionEqual,
          def: { arr:'1,5,11,5' },
          q: 'Can the array be split into two subsets with equal sum?',
          scenario: 'Common FAANG-style subset-sum transformation: equal partition means target = total / 2.',
          pattern: '0/1 subset-sum DP',
          hint: 'Process numbers once; iterate target backward so each value is used at most once.'
        },
      }
    },
    greedy: {
      label: 'Greedy',
      problems: {
        activitySel: {
          label: 'Activity Selection',
          fn: solveActivity,
          def: { arr:'1,3,0,5,3,5,5,7,3,9,5,9' },
          q: 'Select the maximum number of non-overlapping activities from start/end times.',
          scenario: 'Calendar optimizer: fit the most meetings into one room.',
          pattern: 'Greedy by earliest finish time',
          hint: 'Sort by end time; an earlier finish leaves maximum room for future choices.'
        },
        greedyCoin: {
          label: 'Coin Change (greedy)',
          fn: solveGCoin,
          def: { arr:'1,5,10,25', n:'41' },
          q: 'Make an amount by repeatedly choosing the largest coin that fits.',
          scenario: 'Works for canonical currencies, but compare with DP Coin Change for counterexamples.',
          pattern: 'Greedy choice',
          hint: 'Greedy is fast, but it needs a proof or a canonical coin system.'
        },
        jobSeq: {
          label: 'Job Sequencing',
          fn: solveJobSeq,
          def: { arr:'20,15,10,5,1', k:'2,1,2,1,3', n:'3' },
          q: 'Schedule jobs with deadlines and profits to maximize total profit before deadlines.',
          scenario: 'Batch scheduler: most profitable jobs compete for limited slots.',
          pattern: 'Greedy by profit + latest free slot',
          hint: 'Try each high-profit job as late as possible to keep earlier slots open.'
        },
      }
    },
    graph: {
      label: 'Graph',
      problems: {
        bfs: {
          label: 'BFS Traversal',
          fn: solveBFS,
          def: { arr:'0-1,0-2,1-3,1-4,2-5,2-6', n:'7', k:'0' },
          q: 'Traverse a graph level by level from a source node.',
          scenario: 'Shortest hops in an unweighted social graph.',
          pattern: 'Queue-based breadth-first search',
          hint: 'Visit neighbors in waves; first time you see a node is the shortest edge-count path.'
        },
        dfs: {
          label: 'DFS Traversal',
          fn: solveDFS,
          def: { arr:'0-1,0-2,1-3,1-4,2-5,2-6', n:'7', k:'0' },
          q: 'Traverse a graph by going deep before backtracking.',
          scenario: 'Dependency exploration: fully inspect one branch before moving to the next.',
          pattern: 'Stack-based depth-first search',
          hint: 'The stack models the recursion call stack.'
        },
        dijkstra: {
          label: "Dijkstra SSSP",
          fn: solveDijkstra,
          def: { arr:'0-1-4,0-2-1,2-1-2,1-3-1,2-3-5', n:'4', k:'0' },
          q: 'Find shortest paths from one source in a graph with non-negative edge weights.',
          scenario: 'Routing engine: repeatedly lock the closest unfinished node and relax outgoing roads.',
          pattern: 'Greedy shortest path',
          hint: 'Negative weights break the finalized-distance guarantee.'
        },
        numIslands: {
          label: 'Number of Islands',
          fn: solveNumIslands,
          def: { arr:'1,1,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0', n:'5', k:'5' },
          q: 'Given a 2D grid of 1s (land) and 0s (water), count the number of islands.',
          scenario: 'Map analysis: every connected blob of land is one island. Classic BFS/DFS flood-fill.',
          pattern: 'BFS/DFS grid flood-fill',
          hint: 'Each unvisited land cell starts a BFS that marks the whole island visited.'
        },
        topoSort: {
          label: 'Course Schedule (Topo Sort)',
          fn: solveTopoSort,
          def: { arr:'1-0,2-0,3-1,3-2', n:'4', k:'' },
          q: 'Given n courses and prerequisite pairs, can you finish all courses? Return a valid order.',
          scenario: 'Build system: must compile dependencies before the module that needs them.',
          pattern: "Kahn's BFS topological sort",
          hint: 'Start with nodes that have zero in-degree; remove them and reduce neighbors\' in-degree.'
        },
      }
    },
    sliding2: {
      label: 'Sliding Window II',
      problems: {
        minWindow: {
          label: 'Minimum Window Substring',
          fn: solveMinWindow,
          def: { str:'ADOBECODEBANC', k:'ABC' },
          q: 'Find the smallest substring of s that contains all characters of t.',
          scenario: 'Log search: find shortest log snippet containing all required keywords.',
          pattern: 'Variable sliding window + two frequency maps',
          hint: 'Expand right until all chars covered, then shrink left to minimize window.'
        },
        permInStr: {
          label: 'Permutation in String',
          fn: solvePermInStr,
          def: { str:'eidbaooo', k:'ab' },
          q: 'Return true if any permutation of pattern p exists as a substring of s.',
          scenario: 'Anagram detector: is any rearrangement of the keyword hiding in this text?',
          pattern: 'Fixed-size sliding window + char frequency',
          hint: 'Window size equals len(p); slide and compare frequency maps.'
        },
      }
    },
    twoptr: {
      label: 'Two Pointers',
      problems: {
        containerWater: {
          label: 'Container With Most Water',
          fn: solveContainerWater,
          def: { arr:'1,8,6,2,5,4,8,3,7' },
          q: 'Given heights of vertical lines, find two lines that together with the x-axis traps the most water.',
          scenario: 'Tank designer: pick two walls to maximize the water volume between them.',
          pattern: 'Two-pointer shrink from both ends',
          hint: 'Always move the pointer with the shorter height inward.'
        },
        trapRain: {
          label: 'Trapping Rain Water',
          fn: solveTrapRain,
          def: { arr:'0,1,0,2,1,0,1,3,2,1,2,1' },
          q: 'Given elevation heights, compute how much water is trapped after it rains.',
          scenario: 'Civil engineering: calculate water retention in a terrain profile.',
          pattern: 'Two-pointer with running max from each side',
          hint: 'Water at position i = min(maxLeft, maxRight) - height[i].'
        },
        threeSum: {
          label: '3Sum',
          fn: solveThreeSum,
          def: { arr:'-1,0,1,2,-1,-4' },
          q: 'Find all unique triplets in the array that sum to zero.',
          scenario: 'Financial reconciliation: find three transactions that exactly cancel each other out.',
          pattern: 'Sort + fix one + two-pointer for the rest',
          hint: 'Sort first; skip duplicates at each level to avoid repeated triplets.'
        },
      }
    },
    bsearch: {
      label: 'Binary Search',
      problems: {
        searchRotated: {
          label: 'Search Rotated Sorted Array',
          fn: solveSearchRotated,
          def: { arr:'4,5,6,7,0,1,2', n:'0' },
          q: 'Search a sorted array that has been rotated at an unknown pivot. Return the index or -1.',
          scenario: 'Circular buffer lookup: data was stored in a ring and wrapped around.',
          pattern: 'Binary search with half-sorted check',
          hint: 'One half is always sorted; decide which half to search based on target range.'
        },
        findMinRotated: {
          label: 'Find Min in Rotated Array',
          fn: solveFindMinRotated,
          def: { arr:'3,4,5,1,2' },
          q: 'Find the minimum element in a rotated sorted array in O(log n).',
          scenario: 'Find the rotation point in a circular log buffer.',
          pattern: 'Binary search on rotation pivot',
          hint: 'If mid > right, minimum is in the right half; otherwise in the left half.'
        },
        kokoEating: {
          label: 'Koko Eating Bananas',
          fn: solveKoko,
          def: { arr:'3,6,7,11', n:'8' },
          q: 'Koko can eat k bananas/hour from piles. Find the minimum k to finish all piles within h hours.',
          scenario: 'Rate throttling: find the slowest acceptable processing rate to finish within deadline.',
          pattern: 'Binary search on the answer',
          hint: 'Binary search on k from 1 to max(piles); check if that rate finishes in time.'
        },
      }
    },
    stack: {
      label: 'Stack',
      problems: {
        validParen: {
          label: 'Valid Parentheses',
          fn: solveValidParen,
          def: { str:'({[]})' },
          q: 'Given a string of brackets, determine if the brackets are properly opened and closed.',
          scenario: 'Code compiler: every opening bracket must be closed in the right order.',
          pattern: 'Stack push/pop matching',
          hint: 'Push open brackets; when you see a close bracket, the top of stack must match.'
        },
        dailyTemp: {
          label: 'Daily Temperatures',
          fn: solveDailyTemp,
          def: { arr:'73,74,75,71,69,72,76,73' },
          q: 'For each day, how many days until a warmer temperature? Return 0 if none exists.',
          scenario: 'Stock ticker: how many days until a stock price rises above today\'s price?',
          pattern: 'Monotonic decreasing stack (indices)',
          hint: 'Push index onto stack; when current temp > stack-top temp, pop and record the gap.'
        },
        largestRect: {
          label: 'Largest Rectangle in Histogram',
          fn: solveLargestRect,
          def: { arr:'2,1,5,6,2,3' },
          q: 'Find the area of the largest rectangle that can be formed in a histogram.',
          scenario: 'Billboard placement: find the widest+tallest rectangular space in a skyline.',
          pattern: 'Monotonic increasing stack',
          hint: 'When a shorter bar appears, pop taller bars and calculate the rectangle they bounded.'
        },
      }
    },
    backtrack: {
      label: 'Backtracking',
      problems: {
        subsets: {
          label: 'Subsets',
          fn: solveSubsets,
          def: { arr:'1,2,3' },
          q: 'Return all possible subsets (the power set) of a given array of distinct integers.',
          scenario: 'Feature toggle combinations: generate all possible ON/OFF combinations of features.',
          pattern: 'Include/exclude backtracking (or bitmask)',
          hint: 'At each element decide: include it or skip it. Both paths produce valid subsets.'
        },
        permutations: {
          label: 'Permutations',
          fn: solvePermutations,
          def: { arr:'1,2,3' },
          q: 'Return all possible permutations of a list of distinct integers.',
          scenario: 'Password cracker: generate all orderings of a set of characters.',
          pattern: 'Swap-based backtracking',
          hint: 'Fix each element at position i by swapping it with each remaining element.'
        },
        combSum: {
          label: 'Combination Sum',
          fn: solveCombSum,
          def: { arr:'2,3,6,7', n:'7' },
          q: 'Find all unique combinations of candidates that sum to target. Same number can be reused.',
          scenario: 'Exact-change problem: which coins (reusable) add up to the exact target?',
          pattern: 'Backtracking with pruning',
          hint: 'At each step, try adding a candidate; if sum exceeds target, stop that branch.'
        },
      }
    },
    dpx: {
      label: 'DP Extended',
      problems: {
        wordBreak: {
          label: 'Word Break',
          fn: solveWordBreak,
          def: { str:'leetcode', k:'leet,code,leetcode' },
          q: 'Can the string be segmented into a space-separated sequence of dictionary words?',
          scenario: 'NLP tokenizer: can you split a run-together string into valid dictionary words?',
          pattern: '1D reachability DP',
          hint: 'dp[i] = true if any split point j has dp[j]=true and s[j..i] is a word.'
        },
        jumpGame: {
          label: 'Jump Game',
          fn: solveJumpGame,
          def: { arr:'2,3,1,1,4' },
          q: 'Each element is the max jump from that position. Can you reach the last index?',
          scenario: 'Level skipping: can a character jump across platforms to reach the exit?',
          pattern: 'Greedy max-reach tracking',
          hint: 'Track the farthest reachable index; if you step beyond it, you\'re stuck.'
        },
        maxProduct: {
          label: 'Max Product Subarray',
          fn: solveMaxProduct,
          def: { arr:'2,3,-2,4' },
          q: 'Find the contiguous subarray with the largest product.',
          scenario: 'Signal processing: find the stretch of multiplied sensor values that peaks highest.',
          pattern: 'DP tracking both max and min (negatives flip sign)',
          hint: 'A negative × negative can become the new maximum, so track both extremes.'
        },
        decodeWays: {
          label: 'Decode Ways',
          fn: solveDecodeWays,
          def: { str:'226' },
          q: 'A message is encoded as digits (A=1...Z=26). How many ways can it be decoded?',
          scenario: 'SMS decoder: count how many English-word interpretations a digit string has.',
          pattern: '1D counting DP (like climbing stairs but with validity checks)',
          hint: 'dp[i] = ways using one digit + ways using two digits (if valid ≤ 26).'
        },
      }
    }
  };

  // ── SIDEBAR ────────────────────────────────────────────────
  function buildSidebar() {
    /* internal sidebar removed — navigation is in the main app left sidebar */
  }

  // ── INPUT BAR ──────────────────────────────────────────────
  const LABELS = {
    arr: { sliding:'Array (comma sep)', dp:'Values / Edges', greedy:'Values / Edges', graph:'Edges (a-b or a-b-w)' },
    str: { sliding:'String', dp:'String 1', greedy:'String', graph:'String' },
    k:   { sliding:'k (window size)', dp:'Weights / String 2', greedy:'Deadlines / String 2', graph:'Start node' },
    n:   { sliding:'Target', dp:'Target / n', greedy:'Slots / Amount', graph:'Node count' },
  };
  function lbl(field, tid) { return LABELS[field][tid] || field; }

  function buildTopBar(p, tid) {
    const d = p.def;
    let h = `<span class="dsa-prob-title">${p.label}</span>`;
    if (d.arr !== undefined)
      h += `<span class="dsa-inp-label">${lbl('arr',tid)}:</span><input class="dsa-inp-field dsa-inp-wide" id="dsa-i-arr" value="${d.arr}">`;
    if (d.str !== undefined)
      h += `<span class="dsa-inp-label">${lbl('str',tid)}:</span><input class="dsa-inp-field dsa-inp-mid" id="dsa-i-str" value="${d.str}">`;
    if (d.k  !== undefined)
      h += `<span class="dsa-inp-label">${lbl('k',tid)}:</span><input class="dsa-inp-field dsa-inp-mid" id="dsa-i-k" value="${d.k}">`;
    if (d.n  !== undefined)
      h += `<span class="dsa-inp-label">${lbl('n',tid)}:</span><input class="dsa-inp-field dsa-inp-sm" id="dsa-i-n" value="${d.n}">`;
    h += `<button class="dsa-btn dsa-btn-blue" id="dsa-run-btn">▶ Run</button>`;
    root.querySelector('#dsa-top-bar').innerHTML = h;
    root.querySelector('#dsa-run-btn').addEventListener('click', run);
  }

  function getI() {
    return {
      arr: root.querySelector('#dsa-i-arr')?.value || '',
      str: root.querySelector('#dsa-i-str')?.value || '',
      k:   root.querySelector('#dsa-i-k')?.value   || '',
      n:   root.querySelector('#dsa-i-n')?.value   || '',
    };
  }

  // ── PICK / RUN ─────────────────────────────────────────────
  function pick(tid, pid) {
    CUR_TOPIC = tid; CUR_PROB = pid;
    window._dsaActivePick = { tid, pid };
    buildSidebar();
    const p = TOPICS[tid].problems[pid];
    buildTopBar(p, tid);
    execute(p);
  }

  function run() {
    if (!CUR_PROB) return;
    execute(TOPICS[CUR_TOPIC].problems[CUR_PROB]);
  }

  function execute(p) {
    stopAuto();
    try {
      STEPS = p.fn(getI());
    } catch(e) { STEPS = [mkStep('Error: ' + e.message, '')]; }
    SI = 0;
    root.querySelector('#dsa-btn-prev').disabled = false;
    root.querySelector('#dsa-btn-next').disabled = false;
    root.querySelector('#dsa-btn-reset').disabled = false;
    root.querySelector('#dsa-btn-auto').disabled = false;
    buildQuestionPanel(p);
    paint();
  }

  // ── NAVIGATION ─────────────────────────────────────────────
  function nav(d) { SI = Math.max(0, Math.min(STEPS.length-1, SI+d)); paint(); }
  function doReset() { stopAuto(); SI = 0; paint(); }

  function toggleAuto() {
    if (AUTO_T) { stopAuto(); return; }
    const btn = root.querySelector('#dsa-btn-auto');
    btn.textContent = '⏸ Pause'; btn.style.background = '#6e7681';
    AUTO_T = setInterval(() => {
      if (SI >= STEPS.length-1) { stopAuto(); return; }
      SI++; paint();
    }, msSpeed());
  }

  function stopAuto() {
    if (AUTO_T) { clearInterval(AUTO_T); AUTO_T = null; }
    const btn = root.querySelector('#dsa-btn-auto');
    if (btn) { btn.textContent = '▶ Auto'; btn.style.background = '#238636'; }
  }

  function msSpeed() {
    return Math.round(1600 / (root.querySelector('#dsa-speed')?.value || 5));
  }

  // ── PAINT ──────────────────────────────────────────────────
  function paint() {
    if (!STEPS.length) return;
    const s = STEPS[SI];
    const va = root.querySelector('#dsa-viz-area');
    va.innerHTML = `
      <div class="dsa-expl-box">
        <div class="dsa-expl-step">Step ${SI+1} / ${STEPS.length}</div>
        <div class="dsa-expl-text">${s.expl}</div>
        ${s.code ? `<div class="dsa-expl-code">${s.code}</div>` : ''}
      </div>
      <div id="dsa-viz-body">${s.html || ''}</div>
    `;
    root.querySelector('#dsa-step-ctr').textContent = `${SI+1} / ${STEPS.length}`;
    root.querySelector('#dsa-btn-prev').disabled = SI === 0;
    root.querySelector('#dsa-btn-next').disabled = SI === STEPS.length-1;
  }

  // ── STEP BUILDER ───────────────────────────────────────────
  function mkStep(expl, html, code='') { return { expl, html, code }; }

  // ── QUESTION PANEL (Tab A: Understand Q) ───────────────────
  function buildQuestionPanel(p) {
    const qp = root.querySelector('#dsa-q-panel');
    if (!qp) return;
    let exHtml = '';
    if (p.examples && p.examples.length) {
      exHtml = `<div class="dsa-q-section"><div class="dsa-q-title">✏️ Worked Examples</div>` +
        p.examples.map((ex, i) => `
          <div class="dsa-q-example">
            <div class="dsa-q-ex-num">Example ${i + 1}</div>
            <div class="dsa-q-ex-io">
              <span class="dsa-q-label">Input:</span>&nbsp;<code>${ex.input}</code>
              <span class="dsa-q-arrow">→</span>
              <span class="dsa-q-label">Output:</span>&nbsp;<code>${ex.output}</code>
            </div>
            ${ex.trace ? `<div class="dsa-q-trace">${ex.trace}</div>` : ''}
          </div>`).join('') + `</div>`;
    }
    const wrongHtml = p.wrongApproach
      ? `<div class="dsa-q-section"><div class="dsa-q-wrong"><div class="dsa-q-wrong-title">⚠️ Common Wrong Approach</div><div class="dsa-q-wrong-body">${p.wrongApproach}</div></div></div>`
      : '';
    const ahaHtml = (p.aha || p.hint)
      ? `<div class="dsa-q-section"><div class="dsa-q-aha"><div class="dsa-q-aha-title">💡 Key Insight</div><div class="dsa-q-aha-body">${p.aha || p.hint}</div></div></div>`
      : '';
    qp.innerHTML = `
      <div class="dsa-q-section">
        <div class="dsa-q-title">📋 Problem Statement</div>
        <div class="dsa-q-statement">${p.q || p.label}</div>
      </div>
      <div class="dsa-q-section">
        <div class="dsa-q-title">🏭 Real-World Scenario</div>
        <div class="dsa-q-statement dsa-q-scenario">${p.scenario || 'Classic interview coding round.'}</div>
      </div>
      ${exHtml}${wrongHtml}${ahaHtml}
      <div class="dsa-q-section">
        <div class="dsa-q-title">🎯 Pattern to Apply</div>
        <div class="dsa-q-pattern">${p.pattern || 'Trace state changes step by step'}</div>
      </div>
      <div class="dsa-q-cta">
        <button class="dsa-btn dsa-btn-blue" id="dsa-goto-viz">▶ See Algorithm Flow →</button>
        <span class="dsa-q-hint">Think through your approach before clicking →</span>
      </div>
    `;
    const gotoBtn = root.querySelector('#dsa-goto-viz');
    if (gotoBtn) gotoBtn.addEventListener('click', () => { if (window._dsaSetTab) window._dsaSetTab('viz'); });
  }

  // ── RENDER HELPERS ─────────────────────────────────────────
  function rPromptCard(p) {
    return `<div class="dsa-prompt-grid">
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Problem</div>
        <div class="dsa-prompt-v">${p.label}</div>
      </div>
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Scenario</div>
        <div class="dsa-prompt-v">${p.scenario || 'Interview coding round'}</div>
      </div>
      <div class="dsa-prompt-card">
        <div class="dsa-prompt-k">Pattern</div>
        <div class="dsa-prompt-v">${p.pattern || 'Trace the invariant'}</div>
      </div>
    </div>`;
  }

  function rDecision(title, items) {
    let h = `<div class="dsa-decision-box"><div class="dsa-aux-title">${title}</div><div class="dsa-decision-row">`;
    for (const item of items) {
      const cls = item.win ? 'win' : item.bad ? 'bad' : '';
      h += `<div class="dsa-decision-chip ${cls}">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </div>`;
    }
    h += '</div></div>';
    return h;
  }

  function rArr(arr, states={}, ptrs={}, label='') {
    const above = {};
    for (const [lbl2, i] of Object.entries(ptrs)) {
      if (!above[i]) above[i] = [];
      above[i].push(lbl2);
    }
    let h = '';
    if (label) h += `<div class="dsa-arr-label">${label}</div>`;
    h += '<div class="dsa-arr-row">';
    for (let i = 0; i < arr.length; i++) {
      const cls = { act:'c-act', win:'c-win', vis:'c-vis', res:'c-res',
                    cmp:'c-cmp', exc:'c-exc', que:'c-que', cur:'c-cur', def:'c-def' }[states[i]||'def'] || 'c-def';
      const ptr = above[i] ? above[i].join('/') : '';
      h += `<div class="dsa-cell-wrap">
        <div class="dsa-cell-ptr">${ptr}</div>
        <div class="dsa-cell-box ${cls}">${arr[i]}</div>
        <div class="dsa-cell-idx">${i}</div>
      </div>`;
    }
    h += '</div>';
    return `<div class="dsa-arr-section">${h}</div>`;
  }

  function rStr(s, states={}, ptrs={}, label='') {
    return rArr(s.split(''), states, ptrs, label);
  }

  function rDP1(dp, active=-1, label='dp[]') {
    let h = `<div class="dsa-arr-label">${label}</div><div class="dsa-arr-row">`;
    for (let i = 0; i < dp.length; i++) {
      const isAct = i === active;
      const val = dp[i] === null ? '?' : dp[i] === Infinity ? '∞' : dp[i];
      const cls = isAct ? 'c-act' : (dp[i] === null ? 'c-def' : 'c-vis');
      h += `<div class="dsa-cell-wrap">
        <div class="dsa-cell-ptr"></div>
        <div class="dsa-cell-box ${cls}">${val}</div>
        <div class="dsa-cell-idx">${i}</div>
      </div>`;
    }
    h += '</div>';
    return `<div class="dsa-arr-section">${h}</div>`;
  }

  function rDP2(dp, ar, ac, deps=[], rowL=[], colL=[], label='') {
    let h = '';
    if (label) h += `<div class="dsa-arr-label">${label}</div>`;
    h += '<div class="dsa-dp-wrap"><table class="dsa-dp-tbl"><tr><th></th>';
    for (let j = 0; j < dp[0].length; j++) h += `<th>${colL[j]!==undefined?colL[j]:j}</th>`;
    h += '</tr>';
    for (let i = 0; i < dp.length; i++) {
      h += `<tr><th>${rowL[i]!==undefined?rowL[i]:i}</th>`;
      for (let j = 0; j < dp[i].length; j++) {
        const isAct = i===ar && j===ac;
        const isDep = deps.some(d=>d[0]===i&&d[1]===j);
        const v = dp[i][j];
        let cls = v===null?'dc-empty':'dc-fill';
        if (isDep) cls='dc-dep'; if (isAct) cls='dc-act';
        const disp = v===null?'':v===Infinity?'∞':v;
        h += `<td class="${cls}">${disp}</td>`;
      }
      h += '</tr>';
    }
    h += '</table></div>';
    return h;
  }

  function rAux(items, title, hiIdx=-1) {
    let h = `<div class="dsa-aux-box"><div class="dsa-aux-title">${title}</div><div class="dsa-aux-items">`;
    if (!items.length) h += '<span class="dsa-aux-empty">empty</span>';
    for (let i = 0; i < items.length; i++) {
      h += `<span class="dsa-aux-chip ${i===hiIdx?'hi':''}">${items[i]}</span>`;
    }
    h += '</div></div>';
    return h;
  }

  function rAuxRow(...boxes) {
    return `<div class="dsa-aux-row">${boxes.join('')}</div>`;
  }

  // ── GRAPH RENDER ───────────────────────────────────────────
  function rGraph(n, edgeMap, nodeStates={}, edgeStates={}) {
    const W=440, H=300, cx=220, cy=150, r=100;
    const pos = {};
    for (let i=0;i<n;i++) {
      const a = (2*Math.PI*i/n) - Math.PI/2;
      pos[i] = { x: cx+r*Math.cos(a), y: cy+r*Math.sin(a) };
    }
    const NC = { def:'#21262d', act:'#f0883e', vis:'#238636', que:'#1f6feb', cur:'#8957e5', res:'#b08800' };
    const NT = { def:'#e6edf3', act:'#fff', vis:'#fff', que:'#fff', cur:'#fff', res:'#f8e3a1' };

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block">`;
    for (const [key, e] of Object.entries(edgeMap)) {
      const parts = key.split('-').map(Number);
      const [a, b] = parts;
      if (!pos[a]||!pos[b]) continue;
      const st = edgeStates[key] || 'def';
      const col = st==='active'?'#f0883e': st==='visited'?'#3fb950':'#30363d';
      const lx=(pos[a].x+pos[b].x)/2, ly=(pos[a].y+pos[b].y)/2;
      svg += `<line x1="${pos[a].x}" y1="${pos[a].y}" x2="${pos[b].x}" y2="${pos[b].y}" stroke="${col}" stroke-width="2"/>`;
      if (e.w != null) svg += `<text x="${lx}" y="${ly-5}" fill="#8b949e" font-size="10" text-anchor="middle">${e.w}</text>`;
    }
    for (let i=0;i<n;i++) {
      if (!pos[i]) continue;
      const st = nodeStates[i] || 'def';
      const fill = NC[st]||NC.def, tcol = NT[st]||NT.def;
      svg += `<circle cx="${pos[i].x}" cy="${pos[i].y}" r="18" fill="${fill}" stroke="#30363d" stroke-width="1.5"/>`;
      svg += `<text x="${pos[i].x}" y="${pos[i].y+5}" fill="${tcol}" font-size="12" text-anchor="middle" font-weight="bold">${i}</text>`;
    }
    svg += '</svg>';
    return `<div class="dsa-graph-svg-box">${svg}</div>`;
  }

  function parseEdges(str, weighted=false) {
    const adj={}, edgeMap={};
    for (const part of str.split(',')) {
      const t = part.trim().split('-');
      if (t.length<2) continue;
      const a=+t[0], b=+t[1], w=t[2]!=null?+t[2]:1;
      if (!adj[a]) adj[a]=[]; if (!adj[b]) adj[b]=[];
      adj[a].push({to:b,w}); adj[b].push({to:a,w});
      const key = `${Math.min(a,b)}-${Math.max(a,b)}`;
      edgeMap[key] = weighted ? {w} : {};
    }
    return {adj, edgeMap};
  }

  function parseNums(str, fallback=[]) {
    const arr = String(str || '')
      .split(',')
      .map(x => Number(x.trim()))
      .filter(x => !Number.isNaN(x));
    return arr.length ? arr : fallback;
  }

  function tf(v) { return v ? 'T' : 'F'; }

  // ── SOLVERS ────────────────────────────────────────────────

  function solveMaxSumFixed(inp) {
    const arr = inp.arr.split(',').map(Number);
    const k = parseInt(inp.k) || 3;
    const steps = [];
    steps.push(mkStep(
      `Find maximum sum subarray of size <b>k=${k}</b> in [${arr}].<br>Compute first window, then slide: add rightmost, drop leftmost. O(n) vs O(nk) brute force.`,
      rArr(arr,{},'',`Input array (k=${k})`)
    ));
    let sum = 0;
    for (let i=0;i<k;i++) sum+=arr[i];
    let maxSum=sum, maxStart=0;
    const st0={};for(let i=0;i<k;i++)st0[i]='win';
    steps.push(mkStep(
      `Initial window [0..${k-1}] = [${arr.slice(0,k)}]. sum = ${sum} = maxSum.`,
      rArr(arr, st0, {L:0, R:k-1}, `Window sum: ${sum} | maxSum: ${maxSum}`),
      `sum=${sum}`
    ));
    for (let r=k;r<arr.length;r++) {
      const l=r-k+1;
      const prev=sum;
      sum = sum + arr[r] - arr[r-k];
      const better = sum>maxSum;
      if (better){maxSum=sum;maxStart=l;}
      const st={};
      for(let i=l;i<=r;i++) st[i]='win';
      st[r]='act'; st[r-k]='exc';
      steps.push(mkStep(
        `Slide: add arr[${r}]=${arr[r]}, remove arr[${r-k}]=${arr[r-k]}.<br>${prev} + ${arr[r]} - ${arr[r-k]} = <b>${sum}</b>. ${better?`✓ New maxSum = ${maxSum}`:`maxSum stays ${maxSum}`}`,
        rArr(arr, st, {L:l,R:r}, `Window sum: ${sum} | maxSum: ${maxSum}`),
        `sum = ${prev}+${arr[r]}-${arr[r-k]} = ${sum}`
      ));
    }
    const stF={};for(let i=maxStart;i<maxStart+k;i++)stF[i]='res';
    steps.push(mkStep(
      `Done! Max sum subarray of size ${k}: [${arr.slice(maxStart,maxStart+k)}] at index [${maxStart}..${maxStart+k-1}] → sum = <b>${maxSum}</b>`,
      rArr(arr,stF,{},`Result: max sum = ${maxSum}`)
    ));
    return steps;
  }

  function solveLongestUniq(inp) {
    const s = inp.str || 'abcabcbb';
    const steps = [];
    steps.push(mkStep(
      `Longest substring without repeating chars in "<b>${s}</b>".<br>Variable window: expand right, shrink left when duplicate detected. Track char frequencies in a map.`,
      rStr(s,{},'','Input string')
    ));
    let l=0, maxLen=0, maxStart=0;
    const freq={};
    for (let r=0;r<s.length;r++) {
      const c=s[r];
      freq[c]=(freq[c]||0)+1;
      while(freq[c]>1){freq[s[l]]--;l++;}
      const len=r-l+1;
      if(len>maxLen){maxLen=len;maxStart=l;}
      const st={};for(let i=l;i<=r;i++)st[i]='win';st[r]='act';
      const fm = Object.entries(freq).filter(([,v])=>v>0).map(([k2,v])=>`${k2}:${v}`).join(', ');
      steps.push(mkStep(
        `r=${r} ch='${c}'. Window [${l}..${r}]="${s.slice(l,r+1)}" len=${len}. maxLen=${maxLen}.<br>freq: {${fm}}`,
        rStr(s, st, {L:l,R:r}, `Window: "${s.slice(l,r+1)}" | maxLen: ${maxLen}`),
        `l=${l}, r=${r}, len=${len}`
      ));
    }
    const stF={};for(let i=maxStart;i<maxStart+maxLen;i++)stF[i]='res';
    steps.push(mkStep(
      `Done! Longest: "<b>${s.slice(maxStart,maxStart+maxLen)}</b>" (len=<b>${maxLen}</b>) at [${maxStart}..${maxStart+maxLen-1}]`,
      rStr(s, stF, {}, `Result: length = ${maxLen}`)
    ));
    return steps;
  }

  function solveWindowMax(inp) {
    const arr = inp.arr.split(',').map(Number);
    const k = parseInt(inp.k)||3;
    const steps=[], result=[], dq=[];
    steps.push(mkStep(
      `Max in every window of size k=${k}.<br>Monotonic deque: keep indices of decreasing elements. Front = current window max. Remove front if out of window. Remove back if smaller than new element.`,
      rArr(arr,{},'',`Array k=${k}`)
    ));
    for (let i=0;i<arr.length;i++) {
      while(dq.length && dq[0]<i-k+1) dq.shift();
      while(dq.length && arr[dq[dq.length-1]]<arr[i]) dq.pop();
      dq.push(i);
      const st={};
      for(let j=Math.max(0,i-k+1);j<=i;j++) st[j]='win';
      st[i]='act';
      if(dq[0]!==undefined) st[dq[0]]='res';
      let expl=`i=${i}, val=${arr[i]}. Deque indices: [${dq}] → vals: [${dq.map(x=>arr[x])}].`;
      if(i>=k-1){result.push(arr[dq[0]]); expl+=` Window complete → max=<b>${arr[dq[0]]}</b>`;}
      else expl+=` Window not full yet (${i+1}/${k}).`;
      steps.push(mkStep(expl,
        rArr(arr,st,{},`Window max tracking`) +
        '<br>' + rAuxRow(rAux(dq.map(x=>`${x}→${arr[x]}`), 'Deque (idx→val)', 0), result.length?rAux(result,'Result'):''),
        `dq=[${dq}]`
      ));
    }
    steps.push(mkStep(`Done! Window maxima: <b>[${result}]</b>`,
      rArr(result, result.map((_,i)=>({[i]:'res'})).reduce((a,b)=>({...a,...b}),{}), {}, 'Result array')
    ));
    return steps;
  }

  function solveMinSubarray(inp) {
    const arr = inp.arr.split(',').map(Number);
    const target = parseInt(inp.k)||7;
    const steps=[];
    let l=0, sum=0, minLen=Infinity;
    steps.push(mkStep(
      `Find minimum length subarray with sum ≥ <b>${target}</b>.<br>Expand right to reach target, then shrink left to minimize window. O(n).`,
      rArr(arr,{},'',`Array, target=${target}`)
    ));
    for(let r=0;r<arr.length;r++) {
      sum+=arr[r];
      while(sum>=target) {
        const len=r-l+1;
        if(len<minLen) minLen=len;
        const st={};for(let i=l;i<=r;i++)st[i]='win';st[l]='exc';
        steps.push(mkStep(
          `sum=${sum} ≥ ${target}. Window [${l}..${r}] len=${len}. ${len<minLen+1?`New minLen=<b>${minLen}</b>`:`minLen stays ${minLen}`}. Shrink left.`,
          rArr(arr,st,{L:l,R:r},`sum=${sum} | minLen=${minLen===Infinity?'∞':minLen}`),
          `l=${l}, r=${r}, len=${len}`
        ));
        sum-=arr[l]; l++;
      }
      const st2={};for(let i=l;i<=r;i++)st2[i]='win';st2[r]='act';
      steps.push(mkStep(
        `Expand: r=${r} arr[r]=${arr[r]}, sum=${sum} < ${target}. Keep expanding.`,
        rArr(arr,st2,{L:l,R:r},`sum=${sum} | minLen=${minLen===Infinity?'∞':minLen}`),
        `l=${l}, r=${r}, sum=${sum}`
      ));
    }
    steps.push(mkStep(
      minLen===Infinity?`No subarray found with sum ≥ ${target}.`:`Min length subarray with sum ≥ ${target}: <b>${minLen}</b>`,
      rArr(arr,{},'',`Result: minLen = ${minLen===Infinity?'∞':minLen}`)
    ));
    return steps;
  }

  function solveFib(inp) {
    const n=parseInt(inp.n)||9;
    const dp=new Array(n+1).fill(null);
    const steps=[];
    steps.push(mkStep(`Fibonacci(${n}) bottom-up DP.<br>dp[i] = dp[i-1]+dp[i-2]. Base: dp[0]=0, dp[1]=1. Fill left→right.`,
      rDP1([...dp],-1,`dp[] n=${n}`)));
    dp[0]=0;
    steps.push(mkStep('Base case: dp[0] = 0',rDP1([...dp],0,'dp[]'),'dp[0]=0'));
    if(n>=1){dp[1]=1;steps.push(mkStep('Base case: dp[1] = 1',rDP1([...dp],1,'dp[]'),'dp[1]=1'));}
    for(let i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      const snap=[...dp];
      steps.push(mkStep(
        `dp[${i}] = dp[${i-1}] + dp[${i-2}] = ${dp[i-1]} + ${dp[i-2]} = <b>${dp[i]}</b>`,
        rDP1(snap,i,'dp[] — Fibonacci'),
        `dp[${i}] = ${dp[i]}`
      ));
    }
    steps.push(mkStep(`F(${n}) = <b>${dp[n]}</b>`, rDP1([...dp],n,`Result: F(${n}) = ${dp[n]}`)));
    return steps;
  }

  function solveClimbStairs(inp) {
    const n=Math.max(0, parseInt(inp.n)||6);
    const dp=new Array(n+1).fill(null);
    const steps=[];
    steps.push(mkStep(
      `Climbing Stairs: count ways to reach step <b>${n}</b> using 1-step or 2-step moves.<br>dp[i] = ways to land exactly on step i. Last move into i came from i-1 or i-2.`,
      rDP1([...dp],-1,`ways[] n=${n}`)
    ));
    dp[0]=1;
    steps.push(mkStep('Base: dp[0] = 1. There is one way to stand at the ground before climbing.',
      rDP1([...dp],0,'ways[]'),'dp[0]=1'));
    if(n>=1){
      dp[1]=1;
      steps.push(mkStep('Base: dp[1] = 1. Only one single-step move reaches step 1.',
        rDP1([...dp],1,'ways[]'),'dp[1]=1'));
    }
    for(let i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      steps.push(mkStep(
        `Step ${i}: ways from step ${i-1} plus ways from step ${i-2}.<br>dp[${i}] = ${dp[i-1]} + ${dp[i-2]} = <b>${dp[i]}</b>`,
        rDP1([...dp],i,'ways[] — Climbing Stairs') + '<br>' +
        rDecision('Last move choices', [
          {label:`from ${i-1}`, value:dp[i-1]},
          {label:`from ${i-2}`, value:dp[i-2]},
          {label:'total', value:dp[i], win:true}
        ]),
        `dp[${i}] = dp[${i-1}] + dp[${i-2}]`
      ));
    }
    steps.push(mkStep(`Total distinct ways to climb ${n} stairs = <b>${dp[n]}</b>`,
      rDP1([...dp],n,`Result: ${dp[n]} ways`)));
    return steps;
  }

  function solveHouseRobber(inp) {
    const houses=parseNums(inp.arr,[2,7,9,3,1]);
    const n=houses.length;
    const dp=new Array(n).fill(null);
    const steps=[];
    if(!n) return [mkStep('No houses to rob. Result = 0', '')];
    steps.push(mkStep(
      `House Robber: maximize total money without taking adjacent houses.<br>dp[i] = best loot considering houses 0..i. Recurrence: max(skip current, rob current + dp[i-2]).`,
      rArr(houses,{},'','House values') + '<br>' + rDP1([...dp],-1,'dp[] best loot')
    ));
    dp[0]=houses[0];
    steps.push(mkStep(
      `Base: only house 0 exists, so dp[0] = ${houses[0]}.`,
      rArr(houses,{0:'res'},{i:0},'Houses') + '<br>' + rDP1([...dp],0,'dp[]'),
      `dp[0]=${dp[0]}`
    ));
    if(n>=2){
      dp[1]=Math.max(houses[0],houses[1]);
      steps.push(mkStep(
        `Base: choose max(house0=${houses[0]}, house1=${houses[1]}) = <b>${dp[1]}</b>.`,
        rArr(houses,{0:houses[0]>=houses[1]?'res':'cmp',1:houses[1]>houses[0]?'res':'cmp'},{i:1},'Houses') + '<br>' +
        rDP1([...dp],1,'dp[]') + '<br>' +
        rDecision('Base choice', [
          {label:'rob house 0', value:houses[0], win:houses[0]>=houses[1]},
          {label:'rob house 1', value:houses[1], win:houses[1]>houses[0]}
        ]),
        `dp[1]=max(${houses[0]},${houses[1]})`
      ));
    }
    for(let i=2;i<n;i++){
      const skip=dp[i-1];
      const take=houses[i]+dp[i-2];
      dp[i]=Math.max(skip,take);
      const states={ [i]:'act', [i-1]:'cmp', [i-2]:'win' };
      steps.push(mkStep(
        `House ${i} value=${houses[i]}.<br>Skip current → dp[${i-1}]=${skip}. Rob current → ${houses[i]} + dp[${i-2}]=${take}. Pick <b>${dp[i]}</b>.`,
        rArr(houses,states,{i},'Houses') + '<br>' +
        rDP1([...dp],i,'dp[] — max loot so far') + '<br>' +
        rDecision('Take / skip decision', [
          {label:'skip current', value:skip, win:skip>=take},
          {label:'rob current', value:take, win:take>skip}
        ]),
        `dp[${i}] = max(${skip}, ${take})`
      ));
    }
    steps.push(mkStep(`Max loot without adjacent houses = <b>${dp[n-1]}</b>`,
      rDP1([...dp],n-1,`Result: ${dp[n-1]}`)));
    return steps;
  }

  function solveCoin(inp) {
    const coins=inp.arr.split(',').map(Number);
    const T=parseInt(inp.n)||11;
    const dp=new Array(T+1).fill(Infinity);
    dp[0]=0;
    const steps=[];
    const disp=d=>d===Infinity?'∞':d;
    steps.push(mkStep(
      `Coin Change: min coins for amount <b>${T}</b> using [${coins}].<br>dp[i]=min coins for amount i. dp[0]=0, rest=∞. For each amount try every coin.`,
      rDP1(dp.map(disp),-1,`dp[] target=${T}`)
    ));
    steps.push(mkStep('Init: dp[0]=0, all others=∞',rDP1(dp.map(disp),0,'dp[]'),'dp[0]=0'));
    for(let a=1;a<=T;a++){
      const trials=[];
      for(const c of coins){
        if(c<=a && dp[a-c]+1<dp[a]){dp[a]=dp[a-c]+1;}
        trials.push(`c=${c}:${c<=a?`dp[${a-c}]+1=${disp(dp[a-c]+1)}`:'skip'}`);
      }
      const snap=[...dp];
      steps.push(mkStep(
        `dp[${a}]: ${trials.join(' | ')} → <b>${disp(dp[a])}</b>`,
        rDP1(snap.map(disp),a,'dp[] — Coin Change'),
        `dp[${a}] = ${disp(dp[a])}`
      ));
    }
    steps.push(mkStep(`Min coins for ${T} = <b>${disp(dp[T])}</b>`,
      rDP1(dp.map(disp),T,`Result: dp[${T}]=${disp(dp[T])}`)));
    return steps;
  }

  function solveUniquePaths(inp) {
    const rows=Math.max(1, parseInt(inp.n)||3);
    const cols=Math.max(1, parseInt(inp.k)||7);
    const dp=Array.from({length:rows},()=>new Array(cols).fill(null));
    const rowL=[...Array(rows).keys()].map(i=>`r${i}`);
    const colL=[...Array(cols).keys()].map(j=>`c${j}`);
    const steps=[];
    steps.push(mkStep(
      `Unique Paths in a <b>${rows} x ${cols}</b> grid.<br>dp[r][c] = paths to cell (r,c). First row and column are 1 because there is only one straight path.`,
      rDP2(dp,-1,-1,[],rowL,colL,'Grid paths')
    ));
    for(let r=0;r<rows;r++){
      dp[r][0]=1;
      steps.push(mkStep(
        `Base column: cell (${r},0) has exactly one path: keep moving down.`,
        rDP2(dp.map(x=>[...x]),r,0,[],rowL,colL,'Grid paths'),
        `dp[${r}][0]=1`
      ));
    }
    for(let c=1;c<cols;c++){
      dp[0][c]=1;
      steps.push(mkStep(
        `Base row: cell (0,${c}) has exactly one path: keep moving right.`,
        rDP2(dp.map(x=>[...x]),0,c,[],rowL,colL,'Grid paths'),
        `dp[0][${c}]=1`
      ));
    }
    for(let r=1;r<rows;r++){
      for(let c=1;c<cols;c++){
        const top=dp[r-1][c];
        const left=dp[r][c-1];
        dp[r][c]=top+left;
        steps.push(mkStep(
          `Cell (${r},${c}): every path arrives from top or left.<br>dp[${r}][${c}] = top ${top} + left ${left} = <b>${dp[r][c]}</b>`,
          rDP2(dp.map(x=>[...x]),r,c,[[r-1,c],[r,c-1]],rowL,colL,'Grid paths') + '<br>' +
          rDecision('Incoming paths', [
            {label:'from top', value:top},
            {label:'from left', value:left},
            {label:'total', value:dp[r][c], win:true}
          ]),
          `dp[${r}][${c}] = ${top} + ${left}`
        ));
      }
    }
    steps.push(mkStep(`Unique paths to bottom-right = <b>${dp[rows-1][cols-1]}</b>`,
      rDP2(dp,rows-1,cols-1,[],rowL,colL,`Result: ${dp[rows-1][cols-1]} paths`)));
    return steps;
  }

  function solveKnapsack(inp) {
    const wts=inp.arr.split(',').map(Number);
    const vals=inp.k.split(',').map(Number);
    const W=parseInt(inp.n)||5;
    const n=wts.length;
    const dp=Array.from({length:n+1},()=>new Array(W+1).fill(0));
    const steps=[];
    const rowL=['∅',...wts.map((w,i)=>`i${i+1}(w=${w},v=${vals[i]})`)];
    const colL=[...Array(W+1).keys()].map(j=>`w=${j}`);
    steps.push(mkStep(
      `0/1 Knapsack: ${n} items, capacity W=${W}.<br>dp[i][w]=max value using first i items, capacity w.<br>If item fits: max(skip, take). Else: skip.`,
      rDP2(dp,-1,-1,[],rowL,colL,`Knapsack DP`)
    ));
    for(let i=1;i<=n;i++){
      for(let w=0;w<=W;w++){
        const deps=[[i-1,w]];
        let take=0;
        let expl=`dp[${i}][${w}] item${i}(w=${wts[i-1]},v=${vals[i-1]}): `;
        if(wts[i-1]<=w){
          take=dp[i-1][w-wts[i-1]]+vals[i-1];
          deps.push([i-1,w-wts[i-1]]);
          expl+=`can fit. skip=${dp[i-1][w]}, take=dp[${i-1}][${w-wts[i-1]}]+${vals[i-1]}=${take}.`;
        } else {
          expl+=`too heavy (${wts[i-1]}>${w}), must skip.`;
        }
        dp[i][w]=Math.max(dp[i-1][w],take);
        expl+=` → <b>${dp[i][w]}</b>`;
        const snap=dp.map(r=>[...r]);
        steps.push(mkStep(expl, rDP2(snap,i,w,deps,rowL,colL,'Knapsack DP'), `dp[${i}][${w}]=${dp[i][w]}`));
      }
    }
    steps.push(mkStep(`Max value = <b>${dp[n][W]}</b>`, rDP2(dp,n,W,[],rowL,colL,`Result: dp[${n}][${W}]=${dp[n][W]}`)));
    return steps;
  }

  function solveLCS(inp) {
    const s1=inp.str||'AGGTAB', s2=inp.k||'GXTXAYB';
    const m=s1.length, n=s2.length;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(0));
    const rowL=['ε',...s1.split('')];
    const colL=['ε',...s2.split('')];
    const steps=[];
    steps.push(mkStep(
      `LCS of "<b>${s1}</b>" and "<b>${s2}</b>".<br>dp[i][j]=LCS(s1[0..i-1], s2[0..j-1]).<br>Match: dp[i-1][j-1]+1. No match: max(dp[i-1][j], dp[i][j-1]).`,
      rDP2(dp,-1,-1,[],rowL,colL,'LCS Table')
    ));
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const match=s1[i-1]===s2[j-1];
        const deps=match?[[i-1,j-1]]:[[i-1,j],[i,j-1]];
        dp[i][j]=match?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);
        const snap=dp.map(r=>[...r]);
        steps.push(mkStep(
          match
            ? `'${s1[i-1]}'=='${s2[j-1]}' ✓ → dp[${i}][${j}] = dp[${i-1}][${j-1}]+1 = <b>${dp[i][j]}</b>`
            : `'${s1[i-1]}'≠'${s2[j-1]}' → max(dp[${i-1}][${j}],dp[${i}][${j-1}])=max(${dp[i-1][j]},${dp[i][j-1]})=<b>${dp[i][j]}</b>`,
          rDP2(snap,i,j,deps,rowL,colL,`LCS "${s1}" vs "${s2}"`),
          `dp[${i}][${j}]=${dp[i][j]}`
        ));
      }
    }
    steps.push(mkStep(`LCS length = <b>${dp[m][n]}</b>`, rDP2(dp,m,n,[],rowL,colL,`Result: LCS=${dp[m][n]}`)));
    return steps;
  }

  function solveEditDistance(inp) {
    const a=inp.str||'horse', b=inp.k||'ros';
    const m=a.length, n=b.length;
    const dp=Array.from({length:m+1},()=>new Array(n+1).fill(null));
    const rowL=['ε',...a.split('')];
    const colL=['ε',...b.split('')];
    const steps=[];
    steps.push(mkStep(
      `Edit Distance: minimum operations to convert "<b>${a}</b>" into "<b>${b}</b>".<br>dp[i][j] = min edits to convert first i chars of word1 into first j chars of word2.`,
      rDP2(dp,-1,-1,[],rowL,colL,'Edit Distance Table')
    ));
    dp[0][0]=0;
    steps.push(mkStep('Base: empty string to empty string costs 0.',
      rDP2(dp.map(r=>[...r]),0,0,[],rowL,colL,'Edit Distance Table'),'dp[0][0]=0'));
    for(let i=1;i<=m;i++){
      dp[i][0]=i;
      steps.push(mkStep(
        `Base delete: convert "${a.slice(0,i)}" to empty string using ${i} deletes.`,
        rDP2(dp.map(r=>[...r]),i,0,[[i-1,0]],rowL,colL,'Edit Distance Table'),
        `dp[${i}][0]=${i}`
      ));
    }
    for(let j=1;j<=n;j++){
      dp[0][j]=j;
      steps.push(mkStep(
        `Base insert: convert empty string to "${b.slice(0,j)}" using ${j} inserts.`,
        rDP2(dp.map(r=>[...r]),0,j,[[0,j-1]],rowL,colL,'Edit Distance Table'),
        `dp[0][${j}]=${j}`
      ));
    }
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        if(a[i-1]===b[j-1]){
          dp[i][j]=dp[i-1][j-1];
          steps.push(mkStep(
            `Characters match: '${a[i-1]}' == '${b[j-1]}'. No new operation needed.<br>dp[${i}][${j}] = dp[${i-1}][${j-1}] = <b>${dp[i][j]}</b>`,
            rDP2(dp.map(r=>[...r]),i,j,[[i-1,j-1]],rowL,colL,'Edit Distance Table') + '<br>' +
            rDecision('Operation choice', [
              {label:'match / carry', value:dp[i][j], win:true}
            ]),
            `dp[${i}][${j}] = ${dp[i][j]}`
          ));
        } else {
          const del=dp[i-1][j]+1;
          const ins=dp[i][j-1]+1;
          const rep=dp[i-1][j-1]+1;
          dp[i][j]=Math.min(del,ins,rep);
          steps.push(mkStep(
            `Mismatch: '${a[i-1]}' vs '${b[j-1]}'. Try delete, insert, replace.<br>min(${del}, ${ins}, ${rep}) = <b>${dp[i][j]}</b>`,
            rDP2(dp.map(r=>[...r]),i,j,[[i-1,j],[i,j-1],[i-1,j-1]],rowL,colL,'Edit Distance Table') + '<br>' +
            rDecision('1 + best operation', [
              {label:'delete', value:del, win:del===dp[i][j]},
              {label:'insert', value:ins, win:ins===dp[i][j]},
              {label:'replace', value:rep, win:rep===dp[i][j]}
            ]),
            `dp[${i}][${j}] = 1 + min(${del-1}, ${ins-1}, ${rep-1})`
          ));
        }
      }
    }
    steps.push(mkStep(`Minimum edits from "${a}" to "${b}" = <b>${dp[m][n]}</b>`,
      rDP2(dp,m,n,[],rowL,colL,`Result: ${dp[m][n]} edits`)));
    return steps;
  }

  function solveLIS(inp) {
    const arr=parseNums(inp.arr,[10,9,2,5,3,7,101,18]);
    const n=arr.length;
    const dp=new Array(n).fill(null);
    const steps=[];
    if(!n) return [mkStep('Empty array has LIS length 0.', '')];
    steps.push(mkStep(
      `Longest Increasing Subsequence: keep order, skip any elements, and find the longest strictly increasing chain.<br>dp[i] = LIS length that <b>ends at i</b>.`,
      rArr(arr,{},'','Input array') + '<br>' + rDP1([...dp],-1,'dp[] LIS ending here')
    ));
    let best=1;
    for(let i=0;i<n;i++){
      dp[i]=1;
      steps.push(mkStep(
        `Start i=${i}, value=${arr[i]}. Every single element is an increasing subsequence of length 1.`,
        rArr(arr,{[i]:'act'},{i},'Input array') + '<br>' + rDP1([...dp],i,'dp[] LIS ending here'),
        `dp[${i}]=1`
      ));
      for(let j=0;j<i;j++){
        const canExtend=arr[j]<arr[i];
        const candidate=canExtend ? dp[j]+1 : 1;
        const before=dp[i];
        if(canExtend && candidate>dp[i]) dp[i]=candidate;
        best=Math.max(best,dp[i]);
        steps.push(mkStep(
          canExtend
            ? `Compare j=${j} (${arr[j]}) < i=${i} (${arr[i]}). Can extend: dp[${j}]+1 = ${candidate}. ${candidate>before?`Update dp[${i}] to <b>${dp[i]}</b>.`:`Keep dp[${i}]=${dp[i]}.`}`
            : `Compare j=${j} (${arr[j]}) with i=${i} (${arr[i]}). Cannot extend because ${arr[j]} is not smaller.`,
          rArr(arr,{[j]:canExtend?'win':'cmp',[i]:'act'},{j,i},'Input array') + '<br>' +
          rDP1([...dp],i,'dp[] LIS ending here') + '<br>' +
          rDecision('Extend decision', [
            {label:'current dp[i]', value:before},
            {label:canExtend?'dp[j]+1':'blocked', value:canExtend?candidate:'-'},
            {label:'best dp[i]', value:dp[i], win:true}
          ]),
          canExtend ? `dp[${i}] = max(${before}, ${candidate})` : 'skip'
        ));
      }
    }
    const maxIdx=dp.indexOf(Math.max(...dp));
    steps.push(mkStep(`LIS length = <b>${Math.max(...dp)}</b>. The highlighted dp cell marks one best ending position.`,
      rArr(arr,{[maxIdx]:'res'}, {}, 'Input array') + '<br>' + rDP1([...dp],maxIdx,`Result: LIS length ${Math.max(...dp)}`)));
    return steps;
  }

  function solvePartitionEqual(inp) {
    const arr=parseNums(inp.arr,[1,5,11,5]);
    const total=arr.reduce((a,b)=>a+b,0);
    const steps=[];
    steps.push(mkStep(
      `Partition Equal Subset Sum: total=${total}. Equal partition is possible only if one subset sums to total/2.`,
      rArr(arr,{},'','Input numbers')
    ));
    if(total%2!==0){
      steps.push(mkStep(
        `Total sum ${total} is odd, so it cannot be split into two equal integer sums. Result = <b>false</b>.`,
        rArr(arr,arr.map((_,i)=>({[i]:'exc'})).reduce((a,b)=>({...a,...b}),{}),'','Odd total')
      ));
      return steps;
    }
    const target=total/2;
    const dp=new Array(target+1).fill(false);
    dp[0]=true;
    steps.push(mkStep(
      `Target subset sum = ${target}. dp[s] means "can we form sum s using numbers processed so far?" Init dp[0]=true.`,
      rDP1(dp.map(tf),0,`subset dp[] target=${target}`),
      'dp[0]=true'
    ));
    for(let i=0;i<arr.length;i++){
      const num=arr[i];
      steps.push(mkStep(
        `Process number arr[${i}]=${num}. Iterate sums backward so this number is used at most once.`,
        rArr(arr,{[i]:'act'},{i},'Current number') + '<br>' + rDP1(dp.map(tf),-1,`subset dp[] target=${target}`)
      ));
      for(let s=target;s>=num;s--){
        const before=dp[s];
        const include=dp[s-num];
        dp[s]=dp[s] || include;
        steps.push(mkStep(
          `sum=${s}: keep existing dp[${s}]=${tf(before)} or include ${num} if dp[${s-num}]=${tf(include)}.<br>dp[${s}] becomes <b>${tf(dp[s])}</b>.`,
          rArr(arr,{[i]:'act'},{i},'Numbers') + '<br>' +
          rDP1(dp.map(tf),s,`subset dp[] target=${target}`) + '<br>' +
          rDecision('Subset choice', [
            {label:'without num', value:tf(before), win:before},
            {label:`with ${num}`, value:tf(include), win:include},
            {label:`dp[${s}]`, value:tf(dp[s]), win:dp[s]}
          ]),
          `dp[${s}] = dp[${s}] || dp[${s-num}]`
        ));
      }
    }
    steps.push(mkStep(
      dp[target]
        ? `dp[${target}] is true, so the array can be partitioned into two subsets of sum ${target}.`
        : `dp[${target}] is false, so no equal partition exists.`,
      rDP1(dp.map(tf),target,`Result: ${dp[target]}`)
    ));
    return steps;
  }

  function solveActivity(inp) {
    const nums=inp.arr.split(',').map(Number);
    const acts=[];
    for(let i=0;i<nums.length;i+=2) acts.push({s:nums[i],e:nums[i+1],id:acts.length});
    acts.sort((a,b)=>a.e-b.e);
    const steps=[], states={};
    let lastEnd=-1, selected=[];
    steps.push(mkStep(
      `Activity Selection: pick max non-overlapping activities.<br>Sorted by end time: ${acts.map(a=>`[${a.s},${a.e}]`).join(', ')}<br>Greedy: always choose earliest-ending activity that starts after last selected ends.`,
      rArr(acts.map(a=>`[${a.s},${a.e}]`),{},'','Activities (sorted by end time)')
    ));
    for(let i=0;i<acts.length;i++){
      const a=acts[i];
      const ok=a.s>=lastEnd;
      const curSt={...states,[i]:ok?'act':'cmp'};
      steps.push(mkStep(
        `Activity ${i}: [${a.s},${a.e}]. start=${a.s} ${ok?'≥':'<'} lastEnd=${lastEnd}. ${ok?`✓ Select! lastEnd → ${a.e}`:'✗ Overlaps — skip.'}`,
        rArr(acts.map(a=>`[${a.s},${a.e}]`),curSt,{check:i},'Activities'),
        `a.s(${a.s}) >= lastEnd(${lastEnd}) → ${ok}`
      ));
      states[i]=ok?'vis':'exc';
      if(ok){selected.push(a);lastEnd=a.e;}
    }
    steps.push(mkStep(
      `Done! Selected <b>${selected.length}</b>: ${selected.map(a=>`[${a.s},${a.e}]`).join(', ')}`,
      rArr(acts.map(a=>`[${a.s},${a.e}]`),states,'',`Result: ${selected.length} activities`)
    ));
    return steps;
  }

  function solveGCoin(inp) {
    const coins=inp.arr.split(',').map(Number).sort((a,b)=>b-a);
    const amount=parseInt(inp.n)||41;
    const steps=[], used=[];
    steps.push(mkStep(
      `Greedy Coin Change: make amount <b>${amount}</b> using fewest coins.<br>Coins sorted descending: [${coins}]. At each step use largest coin that fits.`,
      rArr(coins,{},'',`Coins (desc) | amount = ${amount}`)
    ));
    let rem=amount;
    for(const coin of coins){
      while(rem>=coin){
        used.push(coin); rem-=coin;
        const snap=[...used];
        steps.push(mkStep(
          `Use coin <b>${coin}</b>. Remaining: ${rem+coin} - ${coin} = <b>${rem}</b>. Coins used: [${snap}]`,
          rArr(coins,{[coins.indexOf(coin)]:'act'},'',`Using coin=${coin} | rem=${rem}`) +
          '<br>' + rAux(snap, 'Coins selected'),
          `remaining = ${rem}`
        ));
      }
    }
    steps.push(mkStep(
      rem===0?`Done! Used <b>${used.length}</b> coins: [${used}]`:`Cannot form ${amount}. Remaining: ${rem}`,
      rAux(used,'Final Selection')
    ));
    return steps;
  }

  function solveJobSeq(inp) {
    const profits=inp.arr.split(',').map(Number);
    const deadlines=inp.k.split(',').map(Number);
    const slots=parseInt(inp.n)||3;
    const jobs=profits.map((p,i)=>({id:`J${i+1}`,p,d:deadlines[i]}));
    jobs.sort((a,b)=>b.p-a.p);
    const schedule=new Array(slots).fill(null);
    const steps=[], states={};
    let total=0;
    steps.push(mkStep(
      `Job Sequencing: ${slots} slots, maximize profit.<br>Sorted by profit desc: ${jobs.map(j=>`${j.id}(p=${j.p},d=${j.d})`).join(', ')}<br>For each job try latest free slot before deadline.`,
      rArr(jobs.map(j=>j.id),{},'','Jobs (profit desc)')
    ));
    for(let ji=0;ji<jobs.length;ji++){
      const job=jobs[ji];
      let placed=false;
      for(let sl=Math.min(job.d,slots)-1;sl>=0;sl--){
        if(!schedule[sl]){
          schedule[sl]=job; total+=job.p; placed=true; states[ji]='vis';
          steps.push(mkStep(
            `Place ${job.id}(p=${job.p}) in slot ${sl+1} (d=${job.d}). Schedule: [${schedule.map(j=>j?j.id:'_')}]. Profit: ${total}`,
            rArr(jobs.map(j=>j.id),{...states,[ji]:'res'},'','Jobs') +
            '<br>' + rArr(schedule.map(j=>j?j.id:'_'),{},'',`Schedule (${slots} slots) | profit=${total}`),
            `slot ${sl+1} assigned`
          ));
          break;
        }
      }
      if(!placed){states[ji]='exc';steps.push(mkStep(`${job.id}(p=${job.p}) — no free slot before deadline ${job.d}. Skip.`,rArr(jobs.map(j=>j.id),{...states},'','Jobs')));}
    }
    steps.push(mkStep(
      `Done! Schedule: [${schedule.map(j=>j?j.id:'_')}]. Total profit = <b>${total}</b>`,
      rArr(schedule.map(j=>j?j.id:'_'),schedule.map((j,i)=>({[i]:j?'res':'exc'})).reduce((a,b)=>({...a,...b}),{}),{},`Final | profit = ${total}`)
    ));
    return steps;
  }

  function solveBFS(inp) {
    const n=parseInt(inp.n)||7, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const steps=[], ns={}, es={}, vis=new Array(n).fill(false), q=[], order=[];
    steps.push(mkStep(`BFS from node <b>${src}</b>. Queue (FIFO): enqueue → process → enqueue unvisited neighbors.`,
      rGraph(n,edgeMap,ns,es)));
    vis[src]=true; ns[src]='act'; q.push(src);
    steps.push(mkStep(`Enqueue start node ${src}. Mark visited.`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue',0),rAux([...order],'BFS Order')),
      `queue=[${q}]`
    ));
    while(q.length){
      const cur=q.shift(); order.push(cur); ns[cur]='vis';
      steps.push(mkStep(
        `Dequeue <b>${cur}</b>. BFS order: [${order.join('→')}]. Neighbors: [${adj[cur].map(e=>e.to)}]`,
        rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue'),rAux([...order],'Order')),
        `cur=${cur}`
      ));
      for(const {to} of adj[cur]){
        if(!vis[to]){
          vis[to]=true; ns[to]='que';
          const ek=`${Math.min(cur,to)}-${Math.max(cur,to)}`; es[ek]='visited';
          q.push(to);
          steps.push(mkStep(
            `Enqueue neighbor <b>${to}</b> (not visited). Mark queued.`,
            rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...q],'Queue'),rAux([...order],'Order')),
            `enqueue ${to}`
          ));
        }
      }
      ns[cur]='vis';
    }
    steps.push(mkStep(`BFS complete! Order: <b>${order.join(' → ')}</b>`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAux([...order],'BFS Traversal Order')));
    return steps;
  }

  function solveDFS(inp) {
    const n=parseInt(inp.n)||7, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const steps=[], ns={}, es={}, vis=new Array(n).fill(false), stk=[], order=[];
    steps.push(mkStep(`DFS from node <b>${src}</b>. Stack (LIFO): push → pop → push unvisited neighbors.`,
      rGraph(n,edgeMap,ns,es)));
    stk.push(src); ns[src]='que';
    steps.push(mkStep(`Push start node ${src}.`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)',0),rAux([...order],'DFS Order')),
      `stack=[${stk}]`
    ));
    while(stk.length){
      const cur=stk.pop();
      if(vis[cur]) continue;
      vis[cur]=true; order.push(cur); ns[cur]='vis';
      steps.push(mkStep(
        `Pop <b>${cur}</b>. Mark visited. DFS order: [${order.join('→')}]. Push unvisited neighbors.`,
        rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)'),rAux([...order],'Order')),
        `cur=${cur}`
      ));
      for(const {to} of [...adj[cur]].reverse()){
        if(!vis[to]){
          stk.push(to); if(!ns[to]) ns[to]='que';
          const ek=`${Math.min(cur,to)}-${Math.max(cur,to)}`; es[ek]='active';
          steps.push(mkStep(
            `Push neighbor <b>${to}</b>.`,
            rGraph(n,edgeMap,{...ns,[cur]:'cur'},{...es}) + '<br>' + rAuxRow(rAux([...stk].reverse(),'Stack (top→)'),rAux([...order],'Order')),
            `push ${to}`
          ));
        }
      }
    }
    steps.push(mkStep(`DFS complete! Order: <b>${order.join(' → ')}</b>`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rAux([...order],'DFS Traversal Order')));
    return steps;
  }

  function solveDijkstra(inp) {
    const n=parseInt(inp.n)||4, src=parseInt(inp.k)||0;
    const {adj,edgeMap}=parseEdges(inp.arr,true);
    for(let i=0;i<n;i++) if(!adj[i]) adj[i]=[];
    const INF=Infinity, dist=new Array(n).fill(INF), vis=new Array(n).fill(false);
    dist[src]=0;
    const steps=[], ns={}, es={};
    steps.push(mkStep(
      `Dijkstra SSSP from <b>${src}</b>. dist[src]=0, rest=∞.<br>Greedy: pick min-dist unvisited node, relax its edges. O((V+E)logV) with min-heap; here O(V²) linear scan for simplicity.`,
      rGraph(n,edgeMap,ns,es) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),{},'','dist[]')
    ));
    for(let iter=0;iter<n;iter++){
      let u=-1;
      for(let i=0;i<n;i++) if(!vis[i]&&(u===-1||dist[i]<dist[u])) u=i;
      if(u===-1||dist[u]===INF) break;
      vis[u]=true; ns[u]='vis';
      steps.push(mkStep(
        `Pick unvisited min-dist node: <b>${u}</b> (dist=${dist[u]}). Finalize. Relax neighbors.`,
        rGraph(n,edgeMap,{...ns,[u]:'cur'},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),dist.map((d,i)=>({[i]:vis[i]?'vis':i===u?'act':'def'})).reduce((a,b)=>({...a,...b}),{}),'','dist[]'),
        `u=${u}, dist[u]=${dist[u]}`
      ));
      for(const {to,w} of adj[u]){
        if(!vis[to] && dist[u]+w<dist[to]){
          const old=dist[to]; dist[to]=dist[u]+w;
          const ek=`${Math.min(u,to)}-${Math.max(u,to)}`; es[ek]='active';
          if(!ns[to]) ns[to]='que';
          steps.push(mkStep(
            `Relax edge ${u}→${to} (w=${w}): dist[${u}]+${w}=${dist[u]+w} < dist[${to}]=${old===INF?'∞':old} → dist[${to}]=<b>${dist[to]}</b>`,
            rGraph(n,edgeMap,{...ns,[u]:'cur'},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),{},'','dist[]'),
            `dist[${to}]=${dist[to]}`
          ));
        }
      }
    }
    steps.push(mkStep(
      `Dijkstra complete! Distances from ${src}: ${dist.map((d,i)=>`${i}:${d===INF?'∞':d}`).join(', ')}`,
      rGraph(n,edgeMap,{...ns},{...es}) + '<br>' + rArr(dist.map(d=>d===INF?'∞':d),dist.map((d,i)=>({[i]:d===INF?'exc':'res'})).reduce((a,b)=>({...a,...b}),{}),'',`Distances from ${src}`)
    ));
    return steps;
  }


  // ── NEW SOLVERS ────────────────────────────────────────────

  // Sliding Window II
  function solveMinWindow(inp) {
    const s = inp.str || 'ADOBECODEBANC';
    const t = inp.k || 'ABC';
    const steps = [];
    const need = {};
    for (const c of t) need[c] = (need[c]||0) + 1;
    const total = Object.keys(need).length;
    let have = 0, formed = 0;
    const window = {};
    let l = 0, best = '';
    let bestL = -1, bestR = -1;
    steps.push(mkStep(
      `Find shortest substring of <b>"${s}"</b> containing all chars of <b>"${t}"</b>.<br>🧒 Slide a magnifying glass — expand right until all letters found, shrink left for shortest fit.`,
      rStr(s,{},'',`s = "${s}"`) + '<br>' + rAux(Object.entries(need).map(([k,v])=>`${k}:${v}`),'Need'),
      `need = {${Object.entries(need).map(([k,v])=>k+':'+v).join(',')}}`
    ));
    for (let r = 0; r < s.length; r++) {
      const c = s[r];
      window[c] = (window[c]||0) + 1;
      if (need[c] !== undefined && window[c] === need[c]) formed++;
      const st = {};
      for (let i = l; i <= r; i++) st[i] = 'win';
      st[r] = 'act';
      while (formed === total) {
        if (best === '' || r - l + 1 < best.length) {
          best = s.slice(l, r+1); bestL = l; bestR = r;
        }
        const lc = s[l];
        window[lc]--;
        if (need[lc] !== undefined && window[lc] < need[lc]) formed--;
        l++;
        steps.push(mkStep(
          `r=${r}. Window valid! Shrink left: remove '${lc}'. Window now "${s.slice(l,r+1)}". Best: <b>"${best}"</b>`,
          rStr(s, {...st, [l-1]:'exc'}, {L:l, R:r}, `window "${s.slice(l,r+1)}"`) + '<br>' +
          rAuxRow(rAux(Object.entries(window).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}`),'Window'), rAux([best],'Best')),
          `l=${l}, r=${r}, best="${best}"`
        ));
      }
      if (formed < total) {
        steps.push(mkStep(
          `r=${r} add '${c}'. Window "${s.slice(l,r+1)}" — still missing chars (${formed}/${total}). Expand right.`,
          rStr(s, st, {L:l, R:r}, `expanding`) + '<br>' +
          rAux(Object.entries(window).filter(([,v])=>v>0).map(([k,v])=>`${k}:${v}`),'Window'),
          `formed=${formed}/${total}`
        ));
      }
    }
    const finalSt = {};
    if (bestL >= 0) for (let i = bestL; i <= bestR; i++) finalSt[i] = 'res';
    steps.push(mkStep(
      best ? `Min window = <b>"${best}"</b> (len ${best.length}).` : `No valid window found.`,
      rStr(s, finalSt, {}, `Result: "${best}"`)
    ));
    return steps;
  }

  function solvePermInStr(inp) {
    const s = inp.str || 'eidbaooo';
    const p = inp.k || 'ab';
    const steps = [];
    const pFreq = {};
    for (const c of p) pFreq[c] = (pFreq[c]||0)+1;
    const wFreq = {};
    let match = 0;
    const need = Object.keys(pFreq).length;
    const k = p.length;
    steps.push(mkStep(
      `Does any permutation of <b>"${p}"</b> appear in <b>"${s}"</b>?<br>🧒 Slide a window of size ${k}. Same letter counts = permutation match!`,
      rStr(s,{},'',`s = "${s}"`) + '<br>' + rAux(Object.entries(pFreq).map(([c,v])=>`${c}:${v}`),'Pattern freq'),
      `window size = ${k}`
    ));
    let found = false;
    for (let r = 0; r < s.length; r++) {
      const rc = s[r];
      wFreq[rc] = (wFreq[rc]||0)+1;
      if (pFreq[rc] !== undefined && wFreq[rc] === pFreq[rc]) match++;
      if (r >= k) {
        const lc = s[r-k];
        if (pFreq[lc] !== undefined && wFreq[lc] === pFreq[lc]) match--;
        wFreq[lc]--;
      }
      const st = {};
      const L = Math.max(0, r-k+1);
      for (let i = L; i <= r; i++) st[i] = match===need ? 'res':'win';
      st[r] = match===need ? 'res':'act';
      const isMatch = match === need;
      if (isMatch) found = true;
      steps.push(mkStep(
        `Window "${s.slice(L,r+1)}" — ${isMatch ? `MATCH! Permutation of "${p}" found!` : `no match (${match}/${need})`}`,
        rStr(s, st, {L, R:r}, `window size ${k}`) + '<br>' +
        rAux(Object.entries(wFreq).filter(([,v])=>v>0).map(([c,v])=>`${c}:${v}`),'Window freq'),
        `r=${r}, match=${match}/${need}`
      ));
      if (isMatch) break;
    }
    steps.push(mkStep(
      found ? `Permutation of <b>"${p}"</b> found! Result = <b>true</b>.` : `No permutation found. Result = <b>false</b>.`,
      rAux([found?'true':'false'],'Result')
    ));
    return steps;
  }

  // Two Pointers
  function solveContainerWater(inp) {
    const h = parseNums(inp.arr,[1,8,6,2,5,4,8,3,7]);
    const steps = [];
    steps.push(mkStep(
      `Find two lines trapping the most water. 🧒 Fence posts of different heights — water level is the shorter post. Area = shorter × distance. Start widest, move the shorter pointer inward.`,
      rArr(h,{},'','Heights'),
      `area = min(h[L],h[R]) x (R-L)`
    ));
    let l=0, r=h.length-1, best=0, bestL=0, bestR=h.length-1;
    while (l < r) {
      const area = Math.min(h[l],h[r]) * (r-l);
      const better = area > best;
      if (better) { best=area; bestL=l; bestR=r; }
      const st = {};
      for (let i=l; i<=r; i++) st[i]='win';
      st[l]='act'; st[r]='act';
      steps.push(mkStep(
        `L=${l}(h=${h[l]}), R=${r}(h=${h[r]}). Area=min(${h[l]},${h[r]})x${r-l}=<b>${area}</b>. ${better?`New best!`:`best=${best}`}<br>Move <b>${h[l]<=h[r]?'LEFT':'RIGHT'}</b> pointer inward.`,
        rArr(h, st, {L:l, R:r}, `area=${area}, best=${best}`),
        `area=${area}, best=${best}`
      ));
      if (h[l] <= h[r]) l++; else r--;
    }
    const fs = {};
    for (let i=bestL;i<=bestR;i++) fs[i]='res';
    steps.push(mkStep(`Max water = <b>${best}</b> between ${bestL} and ${bestR}.`, rArr(h,fs,{},`max area=${best}`)));
    return steps;
  }

  function solveTrapRain(inp) {
    const h = parseNums(inp.arr,[0,1,0,2,1,0,1,3,2,1,2,1]);
    const n = h.length;
    const steps = [];
    steps.push(mkStep(
      `Compute trapped rain water. 🧒 Water at each bar = min(tallest left, tallest right) minus bar height. Two pointers track running max from each side in O(n).`,
      rArr(h,{},'','Elevation'),
      `water[i] = min(maxL,maxR) - h[i]`
    ));
    let l=0, r=n-1, maxL=0, maxR=0, total=0;
    while (l <= r) {
      if (h[l] <= h[r]) {
        maxL = Math.max(maxL, h[l]);
        const w = maxL - h[l];
        const st = {};
        st[l]='act';
        for (let i=0;i<l;i++) st[i]='vis';
        steps.push(mkStep(
          `L=${l} h=${h[l]}, maxL=${maxL}. water=${maxL}-${h[l]}=<b>${w}</b>. Total=${total+w}.`,
          rArr(h,st,{L:l,R:r},`maxL=${maxL}`),
          `water[${l}]=${w}, total=${total+w}`
        ));
        total+=w; l++;
      } else {
        maxR = Math.max(maxR, h[r]);
        const w = maxR - h[r];
        const st = {};
        st[r]='act';
        for (let i=r+1;i<n;i++) st[i]='vis';
        steps.push(mkStep(
          `R=${r} h=${h[r]}, maxR=${maxR}. water=${maxR}-${h[r]}=<b>${w}</b>. Total=${total+w}.`,
          rArr(h,st,{L:l,R:r},`maxR=${maxR}`),
          `water[${r}]=${w}, total=${total+w}`
        ));
        total+=w; r--;
      }
    }
    steps.push(mkStep(`Total trapped water = <b>${total}</b> units.`, rArr(h,{},'',`Result: ${total} units`)));
    return steps;
  }

  function solveThreeSum(inp) {
    const arr = parseNums(inp.arr,[-1,0,1,2,-1,-4]);
    arr.sort((a,b)=>a-b);
    const steps = [];
    steps.push(mkStep(
      `Find all unique triplets summing to 0. 🧒 Sort first. Fix one number, then two-pointer on the rest — like squeezing from both sides to find the matching pair.`,
      rArr(arr,{},'',`Sorted: [${arr.join(',')}]`),
      `sort, fix i, two-pointer [i+1..n-1]`
    ));
    const result = [];
    for (let i = 0; i < arr.length-2; i++) {
      if (i > 0 && arr[i] === arr[i-1]) {
        steps.push(mkStep(`Skip i=${i} (${arr[i]}) — duplicate.`, rArr(arr,{[i]:'exc'},'',`skip dup`)));
        continue;
      }
      let l=i+1, r=arr.length-1;
      steps.push(mkStep(
        `Fix i=${i}(${arr[i]}). Two-pointer: need L+R=${-arr[i]}.`,
        rArr(arr,{[i]:'res',[l]:'act',[r]:'act'},{L:l,R:r},`fixed=${arr[i]}`),
        `fixed=${arr[i]}, target=${-arr[i]}`
      ));
      while (l < r) {
        const sum = arr[i]+arr[l]+arr[r];
        const st = {[i]:'res',[l]:'act',[r]:'act'};
        if (sum === 0) {
          result.push([arr[i],arr[l],arr[r]]);
          steps.push(mkStep(
            `Triplet [${arr[i]},${arr[l]},${arr[r]}] sums to 0!`,
            rArr(arr,st,{L:l,R:r},`Found triplet!`),
            `[${arr[i]},${arr[l]},${arr[r]}] added`
          ));
          while (l<r && arr[l]===arr[l+1]) l++;
          while (l<r && arr[r]===arr[r-1]) r--;
          l++; r--;
        } else if (sum < 0) {
          steps.push(mkStep(`Sum=${sum}<0, move L right.`, rArr(arr,st,{L:l,R:r},`too small`)));
          l++;
        } else {
          steps.push(mkStep(`Sum=${sum}>0, move R left.`, rArr(arr,st,{L:l,R:r},`too big`)));
          r--;
        }
      }
    }
    steps.push(mkStep(`Found <b>${result.length}</b> triplet(s): ${result.map(t=>`[${t}]`).join(', ')}.`, rAux(result.map(t=>`[${t}]`),'Triplets summing to 0')));
    return steps;
  }

  // Binary Search
  function solveSearchRotated(inp) {
    const arr = parseNums(inp.arr,[4,5,6,7,0,1,2]);
    const target = parseInt(inp.n)||0;
    const steps = [];
    steps.push(mkStep(
      `Search for <b>${target}</b> in rotated sorted array. 🧒 Like a circular conveyor belt — sorted list cut and rejoined. Binary search still works! One half is ALWAYS sorted.`,
      rArr(arr,{},'',`Rotated sorted — target=${target}`),
      `one half always sorted — use that to decide direction`
    ));
    let l=0, r=arr.length-1, found=-1;
    while (l <= r) {
      const mid = (l+r)>>1;
      const st = {[mid]:'act'};
      for (let i=l;i<mid;i++) st[i]='win';
      for (let i=mid+1;i<=r;i++) st[i]='win';
      if (arr[mid]===target) {
        found=mid;
        steps.push(mkStep(`mid=${mid}(${arr[mid]})=target! Found at index <b>${mid}</b>.`, rArr(arr,{...st,[mid]:'res'},{L:l,M:mid,R:r})));
        break;
      }
      const ls = arr[l] <= arr[mid];
      const goLeft = ls ? (target>=arr[l]&&target<arr[mid]) : !(target>arr[mid]&&target<=arr[r]);
      steps.push(mkStep(
        `mid=${mid}(${arr[mid]}). ${ls?'Left':'Right'} half sorted. Target ${target} → go <b>${goLeft?'LEFT':'RIGHT'}</b>.`,
        rArr(arr,st,{L:l,M:mid,R:r},`${ls?'left':'right'} sorted`),
        `leftSorted=${ls}, go${goLeft?'Left':'Right'}`
      ));
      if (goLeft) r=mid-1; else l=mid+1;
    }
    if (found<0) steps.push(mkStep(`Target ${target} not found. Return <b>-1</b>.`, rAux(['-1'],'Result')));
    return steps;
  }

  function solveFindMinRotated(inp) {
    const arr = parseNums(inp.arr,[3,4,5,1,2]);
    const steps = [];
    steps.push(mkStep(
      `Find minimum in rotated sorted array O(log n). 🧒 Sorted array spun like a wheel. Minimum is at the rotation seam. Binary search: go toward the unsorted (smaller) side.`,
      rArr(arr,{},'','Rotated sorted'),
      `if mid>right: min is in right half, else left`
    ));
    let l=0, r=arr.length-1;
    while (l < r) {
      const mid=(l+r)>>1;
      const st={[mid]:'act'};
      for(let i=l;i<=r;i++) if(i!==mid) st[i]='win';
      if (arr[mid]>arr[r]) {
        steps.push(mkStep(`mid=${mid}(${arr[mid]})>right(${arr[r]}). Min in RIGHT half. l=${mid+1}.`, rArr(arr,st,{L:l,M:mid,R:r},`min is right`), `l=mid+1`));
        l=mid+1;
      } else {
        steps.push(mkStep(`mid=${mid}(${arr[mid]})<=right(${arr[r]}). Min in LEFT (includes mid). r=${mid}.`, rArr(arr,st,{L:l,M:mid,R:r},`min is left/mid`), `r=mid`));
        r=mid;
      }
    }
    steps.push(mkStep(`Min = <b>${arr[l]}</b> at index ${l}.`, rArr(arr,{[l]:'res'},{},'Result')));
    return steps;
  }

  function solveKoko(inp) {
    const piles = parseNums(inp.arr,[3,6,7,11]);
    const h = parseInt(inp.n)||8;
    const maxPile = Math.max(...piles);
    const hoursAt = k => piles.reduce((s,p)=>s+Math.ceil(p/k),0);
    const steps = [];
    steps.push(mkStep(
      `Koko eats ${piles.length} piles in ${h} hours. Min bananas/hour? 🧒 Try binary search on speed! If speed k works, maybe k-1 works. If not, need higher speed.`,
      rArr(piles,{},'','Piles') + '<br>' + rAux([`h=${h}hrs`,`maxPile=${maxPile}`],'Constraints'),
      `binary search lo=1 hi=${maxPile}`
    ));
    let lo=1, hi=maxPile, best=maxPile;
    while (lo<=hi) {
      const mid=(lo+hi)>>1;
      const total=hoursAt(mid);
      const ok=total<=h;
      if(ok){best=mid;hi=mid-1;} else lo=mid+1;
      steps.push(mkStep(
        `Speed k=${mid}: hours=${piles.map(p=>`ceil(${p}/${mid})=${Math.ceil(p/mid)}`).join('+')}=${total}. ${ok?`Valid (${total}<=${h})! Try lower. best=${best}.`:`Too slow (${total}>${h}). Try higher.`}`,
        rArr(piles,piles.map((_,i)=>({[i]:ok?'vis':'exc'})).reduce((a,b)=>({...a,...b}),{}),{},`k=${mid} → ${total}hrs`),
        `k=${mid}, ok=${ok}, best=${best}`
      ));
    }
    steps.push(mkStep(`Min speed = <b>${best}</b> bananas/hr.`, rArr(piles,{},'',`Answer: k=${best}`) + '<br>' + rAux([`${best} bananas/hr`],'Answer')));
    return steps;
  }

  // Stack
  function solveValidParen(inp) {
    const s = inp.str || '({[]})';
    const steps = [];
    const pairs = {')':'(',']':'[','}':'{'};
    const opens = new Set(['(','[','{']);
    const stack = [];
    steps.push(mkStep(
      `Validate brackets in <b>"${s}"</b>. 🧒 Stack like a pile of plates. Open bracket = add plate. Close bracket = top plate must match!`,
      rStr(s,{},'',`"${s}"`) + '<br>' + rAux([],'Stack'),
      `open=push, close=pop+match`
    ));
    let valid=true;
    for (let i=0;i<s.length;i++) {
      const c=s[i];
      const st={};
      for(let j=0;j<i;j++) st[j]='vis';
      st[i]='act';
      if (opens.has(c)) {
        stack.push(c);
        steps.push(mkStep(
          `'${c}' is opening bracket. Push.`,
          rStr(s,st,'',`char='${c}'`) + '<br>' + rAux([...stack],'Stack',stack.length-1),
          `push '${c}'`
        ));
      } else {
        const top=stack[stack.length-1];
        const match=top===pairs[c];
        if(!match) valid=false;
        if(match) stack.pop();
        steps.push(mkStep(
          `'${c}' is closing. Top='${top||'empty'}'. ${match?`Match! Pop.`:`MISMATCH! Expected '${pairs[c]}' → INVALID.`}`,
          rStr(s,{...st,[i]:match?'vis':'exc'},'',`char='${c}'`) + '<br>' + rAux([...stack],'Stack after'),
          `match=${match}`
        ));
        if(!valid) break;
      }
    }
    if(valid&&stack.length>0) valid=false;
    steps.push(mkStep(
      valid?`All matched, stack empty. Result=<b>true</b> ✅`:`Result=<b>false</b> ❌`,
      rAux([valid?'true':'false'],'Valid?')
    ));
    return steps;
  }

  function solveDailyTemp(inp) {
    const temps = parseNums(inp.arr,[73,74,75,71,69,72,76,73]);
    const n = temps.length;
    const ans = new Array(n).fill(0);
    const stack = [];
    const steps = [];
    steps.push(mkStep(
      `Days until warmer temperature. 🧒 Keep a "waiting days" stack. When today is warmer than a waiting day, that day gets its answer: how long it waited!`,
      rArr(temps,{},'','Temperatures'),
      `monotonic decreasing stack of indices`
    ));
    for (let i=0;i<n;i++) {
      const st={};
      for(let j=0;j<i;j++) st[j]='vis';
      st[i]='act';
      steps.push(mkStep(
        `Day ${i}: temp=${temps[i]}. Stack top=${stack.length?`day ${stack[stack.length-1]}(${temps[stack[stack.length-1]]})`:'empty'}.`,
        rArr(temps,st,{},`Day ${i}=${temps[i]}`) + '<br>' + rAux(stack.map(idx=>`d${idx}:${temps[idx]}`),'Waiting stack'),
        `i=${i}`
      ));
      while (stack.length&&temps[stack[stack.length-1]]<temps[i]) {
        const j=stack.pop();
        ans[j]=i-j;
        const st2={...st,[j]:'res'};
        steps.push(mkStep(
          `Day ${i}(${temps[i]}°)>day ${j}(${temps[j]}°). Day ${j} waited <b>${ans[j]} days</b>!`,
          rArr(temps,st2,{},`ans[${j}]=${ans[j]}`) + '<br>' + rAux(stack.map(idx=>`d${idx}:${temps[idx]}`),'Stack after pop'),
          `ans[${j}]=${ans[j]}`
        ));
      }
      stack.push(i);
    }
    steps.push(mkStep(
      `Done! Remaining stack → 0 (no warmer day). Result: [${ans.join(',')}]`,
      rArr(ans,ans.map((v,i)=>({[i]:v>0?'res':'exc'})).reduce((a,b)=>({...a,...b}),{}),{},'Days to wait')
    ));
    return steps;
  }

  function solveLargestRect(inp) {
    const h = parseNums(inp.arr,[2,1,5,6,2,3]);
    const n = h.length;
    const stack = [];
    const steps = [];
    steps.push(mkStep(
      `Largest rectangle in histogram. 🧒 Each bar can be the SHORTEST bar in a rectangle. When a shorter bar appears, taller waiting bars know their span just ended — compute their area!`,
      rArr(h,{},'','Heights'),
      `monotonic increasing stack`
    ));
    let maxArea=0;
    const ext=[...h,0];
    for (let i=0;i<=n;i++) {
      const cur=ext[i];
      while (stack.length&&h[stack[stack.length-1]]>cur) {
        const hi=stack.pop();
        const width=stack.length?i-stack[stack.length-1]-1:i;
        const area=h[hi]*width;
        maxArea=Math.max(maxArea,area);
        const st={};
        for(let j=(stack.length?stack[stack.length-1]+1:0);j<i;j++) st[j]='res';
        st[hi]='act';
        steps.push(mkStep(
          `Pop bar ${hi}(h=${h[hi]}), width=${width}. Area=${h[hi]}x${width}=<b>${area}</b>. Max=${maxArea}.`,
          rArr(h,st,{},`h=${h[hi]} w=${width}`) + '<br>' + rAux(stack.map(s=>`${s}:h${h[s]}`),'Stack'),
          `area=${area}, max=${maxArea}`
        ));
      }
      if (i<n) {
        stack.push(i);
        const st={};
        for(let j=0;j<i;j++) st[j]='vis';
        st[i]='act';
        steps.push(mkStep(`i=${i} h=${h[i]}: push.`, rArr(h,st,{},`push ${i}`) + '<br>' + rAux(stack.map(s=>`${s}:h${h[s]}`),'Stack'), `push i=${i}`));
      }
    }
    steps.push(mkStep(`Largest rect area = <b>${maxArea}</b>.`, rArr(h,{},'',`Answer: ${maxArea}`)));
    return steps;
  }

  // Backtracking
  function solveSubsets(inp) {
    const nums = parseNums(inp.arr,[1,2,3]);
    const steps = [];
    const result = [];
    steps.push(mkStep(
      `All subsets of [${nums.join(',')}]. 🧒 For each number: put it in the bag or leave it out. That gives ${Math.pow(2,nums.length)} subsets!`,
      rArr(nums,{},'','Numbers'),
      `2^${nums.length}=${Math.pow(2,nums.length)} subsets`
    ));
    function bt(idx, cur) {
      result.push([...cur]);
      steps.push(mkStep(
        `Add subset [${cur.join(',')||'empty'}].`,
        rArr(nums,nums.map((_,i)=>({[i]:i<idx?'vis':i===idx?'act':'def'})).reduce((a,b)=>({...a,...b}),{}),{},`current=[${cur.join(',')||'empty'}]`) + '<br>' +
        rAux(result.map(r=>`[${r.join(',')||'e'}]`),'Subsets'),
        `[${cur.join(',')||'empty'}]`
      ));
      for (let i=idx;i<nums.length;i++) {
        cur.push(nums[i]);
        bt(i+1,cur);
        cur.pop();
      }
    }
    bt(0,[]);
    steps.push(mkStep(`Done! ${result.length} subsets.`, rAux(result.map(r=>`[${r.join(',')||'e'}]`),'Power set')));
    return steps;
  }

  function solvePermutations(inp) {
    const nums = parseNums(inp.arr,[1,2,3]);
    const steps = [];
    const result = [];
    const total = nums.reduce((a,_,i)=>a*(i+1),1);
    steps.push(mkStep(
      `All permutations of [${nums.join(',')}]. 🧒 Arrange toys on a shelf — try each toy in the first spot, arrange the rest. ${total} arrangements total!`,
      rArr(nums,{},'','Numbers'),
      `${nums.length}!=${total} permutations`
    ));
    const arr=[...nums];
    function bt(start) {
      if (start===arr.length) {
        result.push([...arr]);
        steps.push(mkStep(
          `Permutation: [${arr.join(',')}]`,
          rArr(arr,arr.map((_,i)=>({[i]:'res'})).reduce((a,b)=>({...a,...b}),{}),{},`[${arr.join(',')}]`) + '<br>' +
          rAux(result.map(r=>`[${r.join(',')}]`),'Found'),
          `perm [${arr.join(',')}]`
        ));
        return;
      }
      for (let i=start;i<arr.length;i++) {
        [arr[start],arr[i]]=[arr[i],arr[start]];
        const st=arr.map((_,j)=>({[j]:j<start?'vis':j===start?'act':'def'})).reduce((a,b)=>({...a,...b}),{});
        steps.push(mkStep(
          `Fix pos ${start}=<b>${arr[start]}</b> (swapped with ${i}).`,
          rArr(arr,st,{fix:start},`arr=[${arr.join(',')}]`),
          `swap(${start},${i})`
        ));
        bt(start+1);
        [arr[start],arr[i]]=[arr[i],arr[start]];
      }
    }
    bt(0);
    steps.push(mkStep(`Done! ${result.length} permutations.`, rAux(result.map(r=>`[${r.join(',')}]`),'All permutations')));
    return steps;
  }

  function solveCombSum(inp) {
    const cands = parseNums(inp.arr,[2,3,6,7]).sort((a,b)=>a-b);
    const target = parseInt(inp.n)||7;
    const steps = [];
    const result = [];
    steps.push(mkStep(
      `Combinations from [${cands.join(',')}] summing to <b>${target}</b> (reuse allowed). 🧒 Like making exact change with reusable coins. Try each coin, keep adding until you hit the target or overshoot!`,
      rArr(cands,{},'','Candidates (sorted)') + '<br>' + rAux([target],'Target'),
      `sort + backtrack + prune`
    ));
    function bt(start, cur, rem) {
      if (rem===0) {
        result.push([...cur]);
        steps.push(mkStep(
          `Found: [${cur.join('+')}]=${target}!`,
          rArr(cands,cands.map((_,i)=>({[i]:i<start?'vis':'def'})).reduce((a,b)=>({...a,...b}),{}),{},`sum=${target}`) + '<br>' +
          rAux(result.map(r=>`[${r.join('+')}]`),'Combinations'),
          `[${cur.join(',')}] added`
        ));
        return;
      }
      for (let i=start;i<cands.length;i++) {
        if (cands[i]>rem) {
          steps.push(mkStep(`${cands[i]}>${rem} → prune branch.`, rArr(cands,{...cands.map((_,j)=>({[j]:'exc'})).reduce((a,b)=>({...a,...b}),{})},{},'prune'), `prune`));
          break;
        }
        cur.push(cands[i]);
        steps.push(mkStep(
          `Pick ${cands[i]}. current=[${cur.join(',')}], rem=${rem-cands[i]}.`,
          rArr(cands,cands.map((_,j)=>({[j]:j<i?'vis':j===i?'act':'def'})).reduce((a,b)=>({...a,...b}),{}),{},`rem=${rem-cands[i]}`),
          `pick ${cands[i]}`
        ));
        bt(i,cur,rem-cands[i]);
        cur.pop();
      }
    }
    bt(0,[],target);
    steps.push(mkStep(`Done! ${result.length} combination(s).`, rAux(result.map(r=>`[${r.join('+')}]`),`Summing to ${target}`)));
    return steps;
  }

  // DP Extended
  function solveWordBreak(inp) {
    const s = inp.str || 'leetcode';
    const dict = new Set((inp.k||'leet,code').split(',').map(x=>x.trim()).filter(Boolean));
    const n = s.length;
    const dp = new Array(n+1).fill(false);
    dp[0]=true;
    const steps = [];
    steps.push(mkStep(
      `Can "<b>${s}</b>" be split into words from [${[...dict].join(', ')}]? 🧒 dp[i]=true means position i is a valid cut point. Try every possible word ending at i — if the word is in the dict AND dp before it is true, dp[i]=true!`,
      rStr(s,{},'',`"${s}"`) + '<br>' + rDP1(dp,0,`dp[] reachable positions`),
      `dp[0]=true`
    ));
    for (let i=1;i<=n;i++) {
      for (let j=0;j<i;j++) {
        const word=s.slice(j,i);
        const inDict=dict.has(word);
        if (dp[j]&&inDict) {
          dp[i]=true;
          steps.push(mkStep(
            `dp[${j}]=true + s[${j}..${i-1}]="<b>${word}</b>" in dict → dp[${i}]=<b>true</b>!`,
            rStr(s,Object.fromEntries([...s].map((_,k)=>[k,k>=j&&k<i?'res':'vis'])),{},`"${word}" in dict`) + '<br>' + rDP1(dp,i,'dp[]'),
            `dp[${i}]=true via "${word}"`
          ));
          break;
        }
      }
    }
    steps.push(mkStep(
      dp[n]?`dp[${n}]=true. "<b>${s}</b>" CAN be segmented! ✅`:`dp[${n}]=false. Cannot segment. ❌`,
      rDP1(dp,n,`Result: ${dp[n]}`)
    ));
    return steps;
  }

  function solveJumpGame(inp) {
    const arr = parseNums(inp.arr,[2,3,1,1,4]);
    const n = arr.length;
    const steps = [];
    steps.push(mkStep(
      `Each value = max jump. Can you reach the last index? 🧒 Jumping on lily pads. Each pad shows how far you can jump. Track the FARTHEST pad you could ever reach!`,
      rArr(arr,{},'','Jump lengths'),
      `maxReach = farthest reachable index`
    ));
    let maxReach=0, canReach=true;
    for (let i=0;i<n;i++) {
      if (i>maxReach) {
        canReach=false;
        steps.push(mkStep(
          `i=${i}>maxReach=${maxReach}. STUCK! Cannot reach the end. ❌`,
          rArr(arr,arr.map((_,j)=>({[j]:j<i?'vis':j===i?'exc':'def'})).reduce((a,b)=>({...a,...b}),{}),{i},`STUCK`),
          `FAIL`
        ));
        break;
      }
      const nm=Math.max(maxReach,i+arr[i]);
      const st=arr.map((_,j)=>({[j]:j<i?'vis':j===i?'act':j<=nm?'win':'def'})).reduce((a,b)=>({...a,...b}),{});
      steps.push(mkStep(
        `i=${i} jump=${arr[i]}. Reach up to ${i+arr[i]}. maxReach=max(${maxReach},${i+arr[i]})=<b>${nm}</b>.`,
        rArr(arr,st,{i},`maxReach=${nm}`),
        `maxReach=${nm}`
      ));
      maxReach=nm;
      if (maxReach>=n-1) break;
    }
    steps.push(mkStep(
      canReach?`maxReach=${maxReach}>=${n-1}. Result=<b>true</b> ✅`:`Stuck. Result=<b>false</b> ❌`,
      rAux([canReach?'true':'false'],'Can reach?')
    ));
    return steps;
  }

  function solveMaxProduct(inp) {
    const arr = parseNums(inp.arr,[2,3,-2,4]);
    const steps = [];
    let maxSoFar=arr[0], curMax=arr[0], curMin=arr[0];
    steps.push(mkStep(
      `Max product subarray. 🧒 Negative x negative = positive! Track BOTH running max AND running min. When you multiply by a negative, they FLIP!`,
      rArr(arr,{[0]:'act'},'','Array') + '<br>' + rAuxRow(rAux([curMax],'curMax'),rAux([curMin],'curMin'),rAux([maxSoFar],'globalMax')),
      `track both max and min`
    ));
    for (let i=1;i<arr.length;i++) {
      const v=arr[i];
      const c=[v,curMax*v,curMin*v];
      const nMax=Math.max(...c), nMin=Math.min(...c);
      maxSoFar=Math.max(maxSoFar,nMax);
      const st=arr.map((_,j)=>({[j]:j<i?'vis':j===i?'act':'def'})).reduce((a,b)=>({...a,...b}),{});
      steps.push(mkStep(
        `i=${i} val=${v}. candidates=[${v},${curMax*v},${curMin*v}]. newMax=<b>${nMax}</b>, newMin=<b>${nMin}</b>. global=<b>${maxSoFar}</b>.`,
        rArr(arr,st,{},`val=${v}`) + '<br>' +
        rAuxRow(rAux([nMax],'curMax'),rAux([nMin],'curMin'),rAux([maxSoFar],'globalMax')) + '<br>' +
        rDecision('Pick newMax',[{label:'v',value:v,win:v===nMax},{label:'max*v',value:curMax*v,win:curMax*v===nMax},{label:'min*v',value:curMin*v,win:curMin*v===nMax}]),
        `max=${nMax},global=${maxSoFar}`
      ));
      curMax=nMax; curMin=nMin;
    }
    steps.push(mkStep(`Max product = <b>${maxSoFar}</b>.`, rArr(arr,{},'',`Answer: ${maxSoFar}`)));
    return steps;
  }

  function solveDecodeWays(inp) {
    const s = inp.str || '226';
    const n = s.length;
    const dp = new Array(n+1).fill(0);
    dp[0]=1;
    dp[1]=s[0]==='0'?0:1;
    const steps = [];
    steps.push(mkStep(
      `Decode ways for "<b>${s}</b>" (A=1..Z=26). 🧒 Like climbing stairs with rules: step 1 digit (valid 1-9) OR 2 digits (valid 10-26). Count all valid paths!`,
      rStr(s,{[0]:'vis'},'',`"${s}"`) + '<br>' + rDP1(dp,1,'dp[] decode ways'),
      `dp[0]=1, dp[1]=${dp[1]}`
    ));
    for (let i=2;i<=n;i++) {
      const one=parseInt(s[i-1]);
      const two=parseInt(s.slice(i-2,i));
      const ok1=one>=1&&one<=9;
      const ok2=two>=10&&two<=26;
      if(ok1) dp[i]+=dp[i-1];
      if(ok2) dp[i]+=dp[i-2];
      steps.push(mkStep(
        `pos ${i}: digit="${s[i-1]}"(${ok1?'ok':'invalid'}), two="${s.slice(i-2,i)}"(${ok2?'ok':'invalid'}). dp[${i}]=${ok1?`dp[${i-1}]=${dp[i-1]}`:'0'}+${ok2?`dp[${i-2}]=${dp[i-2]}`:'0'}=<b>${dp[i]}</b>`,
        rStr(s,Object.fromEntries([...s].map((_,j)=>[j,j<i-1?'vis':j===i-1?'act':'def'])),{},'s') + '<br>' + rDP1([...dp],i,'dp[]'),
        `dp[${i}]=${dp[i]}`
      ));
    }
    steps.push(mkStep(`Decode ways = <b>${dp[n]}</b>.`, rDP1(dp,n,`Result: ${dp[n]}`)));
    return steps;
  }

  // Graph (new)
  function solveNumIslands(inp) {
    const flat = parseNums(inp.arr,[1,1,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,1,1,0,0,0,0,0]);
    const rows = parseInt(inp.n)||5, cols = parseInt(inp.k)||5;
    const grid = [];
    for (let i=0;i<rows;i++) grid.push(flat.slice(i*cols,(i+1)*cols).map(x=>x?'1':'0'));
    const vis = Array.from({length:rows},()=>new Array(cols).fill(false));
    const steps = [];
    const rGrid = (g,v,hiR,hiC,label) => {
      let h = label?`<div class="dsa-arr-label">${label}</div>`:'';
      h += '<div style="display:inline-block">';
      const COL = {'1':'#1f6feb','0':'#161b22',vi:'#238636',ac:'#f0883e'};
      for (let r=0;r<rows;r++) {
        h += '<div style="display:flex">';
        for (let c=0;c<cols;c++) {
          const isHi=r===hiR&&c===hiC, isVis=v[r][c];
          const bg=isHi?COL.ac:isVis?COL.vi:(g[r][c]==='1'?COL['1']:COL['0']);
          h += `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:1px solid #30363d;background:${bg};color:#e6edf3;font-size:13px;font-weight:bold;border-radius:3px;margin:1px">${g[r][c]}</div>`;
        }
        h += '</div>';
      }
      h += '</div>';
      return h;
    };
    steps.push(mkStep(
      `Count islands in ${rows}x${cols} grid. 🧒 Like a map — connected land tiles (1s) = one island. BFS flood-fill each island, count how many floods you start!`,
      rGrid(grid,vis,-1,-1,`${rows}x${cols} grid`),
      `BFS flood-fill each unvisited land cell`
    ));
    let islands=0;
    for (let r=0;r<rows;r++) {
      for (let c=0;c<cols;c++) {
        if (grid[r][c]==='1'&&!vis[r][c]) {
          islands++;
          const queue=[[r,c]];
          vis[r][c]=true;
          steps.push(mkStep(`New island #${islands} at (${r},${c})! BFS flood-fill.`, rGrid(grid,vis,r,c,`Island ${islands}`), `island #${islands}`));
          while (queue.length) {
            const [cr,cc]=queue.shift();
            for (const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
              const nr=cr+dr,nc=cc+dc;
              if (nr>=0&&nr<rows&&nc>=0&&nc<cols&&grid[nr][nc]==='1'&&!vis[nr][nc]) {
                vis[nr][nc]=true;
                queue.push([nr,nc]);
                steps.push(mkStep(`Visit (${nr},${nc}) — part of island #${islands}.`, rGrid(grid,vis,nr,nc,`Island ${islands} expanding`), `(${nr},${nc})`));
              }
            }
          }
        }
      }
    }
    steps.push(mkStep(`Total islands = <b>${islands}</b>.`, rGrid(grid,vis,-1,-1,`Done: ${islands} island(s)`) + '<br>' + rAux([islands],'Islands')));
    return steps;
  }

  function solveTopoSort(inp) {
    const n = parseInt(inp.n)||4;
    const edgeStr = inp.arr||'1-0,2-0,3-1,3-2';
    const adj = Array.from({length:n},()=>[]);
    const inDeg = new Array(n).fill(0);
    const edgeMap = {};
    for (const e of edgeStr.split(',')) {
      const parts=e.trim().split('-').map(Number);
      if (parts.length<2) continue;
      const [a,b]=parts;
      if (a>=n||b>=n) continue;
      adj[b].push(a);
      inDeg[a]++;
      const key=`${Math.min(a,b)}-${Math.max(a,b)}`;
      edgeMap[key]={};
    }
    const steps = [];
    steps.push(mkStep(
      `Finish ${n} courses with prerequisites. 🧒 Each course is a door — only opens when ALL its prerequisites are done. Start with courses that have 0 prerequisites. As you finish them, unlock more!`,
      rGraph(n,edgeMap,inDeg.reduce((o,_,i)=>({...o,[i]:'def'}),{}),{}) + '<br>' + rArr(inDeg,{},'','In-degree (# prereqs)'),
      `Kahn: start with in-degree=0`
    ));
    const queue=[];
    for (let i=0;i<n;i++) if(inDeg[i]===0) queue.push(i);
    const order=[], ns=new Array(n).fill('def');
    for (const i of queue) ns[i]='que';
    steps.push(mkStep(
      `In-degree 0 (no prereqs): [${queue.join(',')}]. Enqueue.`,
      rGraph(n,edgeMap,{...ns},{}) + '<br>' + rAux(queue.map(i=>`C${i}`),'Queue'),
      `queue=[${queue.join(',')}]`
    ));
    while (queue.length) {
      const cur=queue.shift();
      order.push(cur);
      ns[cur]='vis';
      steps.push(mkStep(
        `Complete C${cur}. Order: [${order.join('->')}].`,
        rGraph(n,edgeMap,{...ns},{}) + '<br>' + rAuxRow(rAux(queue.map(i=>`C${i}`),'Queue'),rAux(order.map(i=>`C${i}`),'Done')),
        `complete C${cur}`
      ));
      for (const nb of adj[cur]) {
        inDeg[nb]--;
        if (inDeg[nb]===0) { queue.push(nb); ns[nb]='que'; }
        steps.push(mkStep(
          `C${cur} unlocks C${nb}: inDeg[${nb}]->${inDeg[nb]}. ${inDeg[nb]===0?'Enqueued!':'Still has prereqs.'}`,
          rGraph(n,edgeMap,{...ns},{}) + '<br>' + rArr(inDeg,{[nb]:inDeg[nb]===0?'res':'act'},'','In-degrees'),
          `inDeg[${nb}]=${inDeg[nb]}`
        ));
      }
    }
    const ok=order.length===n;
    steps.push(mkStep(
      ok?`Order [${order.join('->')}] completes all ${n} courses! ✅`:`Only ${order.length}/${n} done — CYCLE detected! ❌`,
      rGraph(n,edgeMap,ns,{}) + '<br>' + rAux(order.map(i=>`C${i}`),ok?'Valid order':'Incomplete!')
    ));
    return steps;
  }

  // ── INIT ────────────────────────────────────────────────────
  root.querySelector('#dsa-btn-prev').addEventListener('click', () => nav(-1));
  root.querySelector('#dsa-btn-next').addEventListener('click', () => nav(1));
  root.querySelector('#dsa-btn-reset').addEventListener('click', () => doReset());
  root.querySelector('#dsa-btn-auto').addEventListener('click', () => toggleAuto());

  buildSidebar();

  // Tab A ↔ Tab B switching
  function setTab(tab) {
    const qPanel = root.querySelector('#dsa-q-panel');
    const vizArea = root.querySelector('#dsa-viz-area');
    const bottomBar = root.querySelector('#dsa-bottom-bar');
    const tabQ = root.querySelector('#dsa-tab-q');
    const tabViz = root.querySelector('#dsa-tab-viz');
    if (tab === 'q') {
      qPanel.style.display = 'flex';
      vizArea.style.display = 'none';
      bottomBar.style.display = 'none';
      tabQ.classList.add('active');
      tabViz.classList.remove('active');
    } else {
      qPanel.style.display = 'none';
      vizArea.style.display = 'flex';
      bottomBar.style.display = 'flex';
      tabQ.classList.remove('active');
      tabViz.classList.add('active');
    }
  }
  root.querySelector('#dsa-tab-q').addEventListener('click', () => setTab('q'));
  root.querySelector('#dsa-tab-viz').addEventListener('click', () => setTab('viz'));
  window._dsaSetTab = setTab;

  const _initTopic = (_options && _options.topic) || 'sliding';
  const _initProb  = (_options && _options.problem) || 'maxSumFixed';
  pick(_initTopic, _initProb);

  window._dsaPick = pick;
}

window._dsaRenderViz = function(mount, opts) {
  var styleId = 'dsa-viz-style';
  if (!document.getElementById(styleId)) {
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
.dsa-viz{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:8px;overflow:hidden}
.dsa-viz .dsa-app{display:flex;height:640px;overflow:hidden}
.dsa-viz .dsa-main{flex:1;display:flex;flex-direction:column;overflow:hidden;width:100%}
.dsa-viz .dsa-top-bar{background:#161b22;border-bottom:1px solid #30363d;padding:8px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:48px}
.dsa-viz .dsa-viz-area{flex:1;padding:14px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.dsa-viz .dsa-bottom-bar{background:#161b22;border-top:1px solid #30363d;padding:10px 14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dsa-viz h3{font-size:14px;color:#58a6ff;font-weight:bold;margin:0 0 12px;letter-spacing:1px}
.dsa-viz .dsa-topic-header{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;margin:10px 0 4px;padding-left:4px}
.dsa-viz .dsa-prob-btn{display:block;width:100%;text-align:left;padding:5px 10px;border-radius:4px;border:none;cursor:pointer;background:transparent;color:#8b949e;font-family:inherit;font-size:11px;transition:all .12s;line-height:1.4}
.dsa-viz .dsa-prob-btn:hover{background:#21262d;color:#e6edf3}
.dsa-viz .dsa-prob-btn.active{color:#f0883e;background:#f0883e11;border-left:2px solid #f0883e;padding-left:8px}
.dsa-viz .dsa-inp-label{font-size:11px;color:#8b949e;white-space:nowrap}
.dsa-viz .dsa-inp-field{background:#21262d;border:1px solid #30363d;color:#e6edf3;padding:4px 8px;border-radius:4px;font-family:inherit;font-size:11px}
.dsa-viz .dsa-inp-field:focus{outline:none;border-color:#58a6ff}
.dsa-viz .dsa-inp-wide{width:150px}
.dsa-viz .dsa-inp-mid{width:110px}
.dsa-viz .dsa-inp-sm{width:55px}
.dsa-viz .dsa-btn{padding:4px 12px;border-radius:5px;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;transition:all .12s;white-space:nowrap}
.dsa-viz .dsa-btn-blue{background:#1f6feb;color:white}
.dsa-viz .dsa-btn-blue:hover{background:#388bfd}
.dsa-viz .dsa-btn-gray{background:#21262d;color:#e6edf3;border:1px solid #30363d}
.dsa-viz .dsa-btn-gray:hover{background:#30363d}
.dsa-viz .dsa-btn-green{background:#238636;color:white}
.dsa-viz .dsa-btn-green:hover{background:#2ea043}
.dsa-viz .dsa-btn:disabled{opacity:.35;cursor:not-allowed}
.dsa-viz .dsa-prob-title{font-size:12px;font-weight:bold;color:#e6edf3;margin-right:4px}
.dsa-viz .dsa-step-counter{font-size:12px;color:#8b949e;margin-left:auto}
.dsa-viz .dsa-speed-row{display:flex;align-items:center;gap:6px}
.dsa-viz .dsa-speed-row label{font-size:11px;color:#8b949e}
.dsa-viz input[type=range]{width:70px;accent-color:#58a6ff;cursor:pointer}
.dsa-viz .dsa-expl-box{background:#161b22;border:1px solid #30363d;border-radius:7px;padding:12px 16px}
.dsa-viz .dsa-expl-step{font-size:11px;color:#58a6ff;font-weight:bold;margin-bottom:4px}
.dsa-viz .dsa-expl-text{font-size:13px;line-height:1.65;color:#e6edf3}
.dsa-viz .dsa-expl-code{font-size:11px;color:#f0883e;margin-top:6px;font-family:'Courier New';background:#0d1117;padding:4px 8px;border-radius:4px;display:inline-block}
.dsa-viz .dsa-prompt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dsa-viz .dsa-prompt-card{background:#161b22;border:1px solid #30363d;border-radius:7px;padding:10px 12px;min-height:72px}
.dsa-viz .dsa-prompt-k{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.dsa-viz .dsa-prompt-v{font-size:12px;line-height:1.45;color:#e6edf3}
.dsa-viz .dsa-arr-label{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.dsa-viz .dsa-arr-row{display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start}
.dsa-viz .dsa-cell-wrap{display:flex;flex-direction:column;align-items:center;gap:2px}
.dsa-viz .dsa-cell-ptr{font-size:9px;color:#f0883e;height:12px;text-align:center;width:42px}
.dsa-viz .dsa-cell-box{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:5px;font-size:13px;font-weight:bold;border:2px solid transparent;transition:background .18s,border-color .18s,color .18s}
.dsa-viz .dsa-cell-idx{font-size:9px;color:#555;text-align:center;width:42px}
.dsa-viz .c-def{background:#21262d;color:#e6edf3;border-color:#30363d}
.dsa-viz .c-act{background:#f0883e33;color:#f0883e;border-color:#f0883e}
.dsa-viz .c-win{background:#1f6feb22;color:#79c0ff;border-color:#58a6ff}
.dsa-viz .c-vis{background:#23863622;color:#3fb950;border-color:#3fb950}
.dsa-viz .c-res{background:#b08800;color:#f8e3a1;border-color:#f8e3a1}
.dsa-viz .c-cmp{background:#8957e533;color:#d2a8ff;border-color:#d2a8ff}
.dsa-viz .c-exc{background:#da363633;color:#f85149;border-color:#f85149}
.dsa-viz .c-que{background:#56d36433;color:#56d364;border-color:#56d364}
.dsa-viz .c-cur{background:#ff7b7233;color:#ff7b72;border-color:#ff7b72}
.dsa-viz .dsa-dp-wrap{overflow-x:auto}
.dsa-viz .dsa-dp-tbl{border-collapse:collapse}
.dsa-viz .dsa-dp-tbl td,.dsa-viz .dsa-dp-tbl th{width:44px;height:34px;text-align:center;border:1px solid #30363d;font-size:12px;transition:background .15s}
.dsa-viz .dsa-dp-tbl th{background:#161b22;color:#8b949e;font-size:10px;font-weight:normal;padding:2px}
.dsa-viz .dc-empty{background:#21262d;color:#444}
.dsa-viz .dc-fill{background:#21262d;color:#e6edf3}
.dsa-viz .dc-dep{background:#1f6feb22;color:#79c0ff}
.dsa-viz .dc-act{background:#f0883e44;color:#f0883e;font-weight:bold;border:2px solid #f0883e!important}
.dsa-viz .dc-res{background:#b08800;color:#f8e3a1;font-weight:bold}
.dsa-viz .dsa-aux-row{display:flex;gap:12px;flex-wrap:wrap}
.dsa-viz .dsa-aux-box{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px 12px}
.dsa-viz .dsa-aux-title{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px}
.dsa-viz .dsa-aux-items{display:flex;gap:4px;flex-wrap:wrap}
.dsa-viz .dsa-aux-chip{padding:2px 8px;border-radius:4px;font-size:11px;background:#21262d;border:1px solid #30363d;color:#e6edf3}
.dsa-viz .dsa-aux-chip.hi{background:#1f6feb33;border-color:#58a6ff;color:#79c0ff}
.dsa-viz .dsa-aux-empty{font-size:11px;color:#444;font-style:italic}
.dsa-viz .dsa-decision-box{background:#161b22;border:1px solid #30363d;border-radius:7px;padding:8px 12px;display:inline-block}
.dsa-viz .dsa-decision-row{display:flex;gap:8px;flex-wrap:wrap}
.dsa-viz .dsa-decision-chip{min-width:88px;background:#21262d;border:1px solid #30363d;border-radius:6px;padding:6px 8px;display:flex;flex-direction:column;gap:2px}
.dsa-viz .dsa-decision-chip span{font-size:10px;color:#8b949e}
.dsa-viz .dsa-decision-chip strong{font-size:14px;color:#e6edf3}
.dsa-viz .dsa-decision-chip.win{border-color:#3fb950;background:#23863622}
.dsa-viz .dsa-decision-chip.win strong{color:#3fb950}
.dsa-viz .dsa-decision-chip.bad{border-color:#f85149;background:#da363622}
.dsa-viz .dsa-decision-chip.bad strong{color:#f85149}
.dsa-viz .dsa-graph-svg-box{background:#161b22;border-radius:8px;border:1px solid #30363d;display:inline-block}
@media (max-width:760px){.dsa-viz .dsa-app{height:auto;flex-direction:column}.dsa-viz .dsa-prompt-grid{grid-template-columns:1fr}}
.dsa-viz .dsa-tab-strip{display:flex;background:#161b22;border-bottom:1px solid #30363d;padding:0 14px;gap:2px}
.dsa-viz .dsa-tab{background:none;border:none;border-bottom:2px solid transparent;color:#8b949e;font-family:inherit;font-size:12px;font-weight:600;padding:10px 18px;cursor:pointer;transition:all .15s;margin-bottom:-1px}
.dsa-viz .dsa-tab:hover{color:#e6edf3}
.dsa-viz .dsa-tab.active{color:#58a6ff;border-bottom-color:#58a6ff}
.dsa-viz .dsa-q-section{background:#161b22;border:1px solid #30363d;border-radius:7px;padding:14px 16px}
.dsa-viz .dsa-q-title{font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px;font-weight:600}
.dsa-viz .dsa-q-statement{font-size:13px;line-height:1.7;color:#e6edf3}
.dsa-viz .dsa-q-scenario{color:#cdd9e5;font-style:italic;font-size:12px}
.dsa-viz .dsa-q-example{background:#0d1117;border:1px solid #21262d;border-radius:6px;padding:10px 12px;margin-bottom:8px}
.dsa-viz .dsa-q-ex-num{font-size:10px;color:#58a6ff;font-weight:700;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
.dsa-viz .dsa-q-ex-io{font-size:12px;color:#e6edf3;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dsa-viz .dsa-q-label{color:#8b949e;font-size:11px}
.dsa-viz .dsa-q-ex-io code{background:#21262d;padding:2px 7px;border-radius:4px;color:#79c0ff;font-family:'Courier New';font-size:12px}
.dsa-viz .dsa-q-arrow{color:#f0883e;font-weight:bold;font-size:14px}
.dsa-viz .dsa-q-trace{margin-top:7px;font-size:11px;color:#8b949e;line-height:1.6;font-family:'Courier New';background:#0d1117;padding:6px 10px;border-radius:4px;border-left:2px solid #30363d}
.dsa-viz .dsa-q-wrong{background:#da363611;border:1px solid #f8514966;border-radius:7px;padding:12px 14px}
.dsa-viz .dsa-q-wrong-title{font-size:11px;color:#f85149;font-weight:700;margin-bottom:6px}
.dsa-viz .dsa-q-wrong-body{font-size:12px;color:#e6edf3;line-height:1.6}
.dsa-viz .dsa-q-aha{background:#23863611;border:1px solid #3fb95066;border-radius:7px;padding:12px 14px}
.dsa-viz .dsa-q-aha-title{font-size:11px;color:#3fb950;font-weight:700;margin-bottom:6px}
.dsa-viz .dsa-q-aha-body{font-size:12px;color:#e6edf3;line-height:1.6}
.dsa-viz .dsa-q-pattern{display:inline-block;background:#1f6feb22;border:1px solid #58a6ff66;border-radius:20px;padding:4px 14px;font-size:12px;color:#79c0ff;font-weight:600}
.dsa-viz .dsa-q-cta{padding-top:4px;display:flex;gap:10px;align-items:center}
.dsa-viz .dsa-q-cta .dsa-q-hint{font-size:11px;color:#8b949e;font-style:italic}
    `;
    document.head.appendChild(style);
  }
  mount.innerHTML = `
    <div class="dsa-viz">
      <div class="dsa-app">
        <div class="dsa-main">
          <div class="dsa-top-bar" id="dsa-top-bar">
            <span style="color:#8b949e;font-size:12px">← select a problem from the left sidebar</span>
          </div>
          <div class="dsa-tab-strip">
            <button class="dsa-tab active" id="dsa-tab-q">📖 Understand Q</button>
            <button class="dsa-tab" id="dsa-tab-viz">▶ Algorithm Flow</button>
          </div>
          <div class="dsa-viz-area" id="dsa-q-panel">
            <div class="dsa-expl-box">
              <div class="dsa-expl-step">Pick a Problem</div>
              <div class="dsa-expl-text">Select a topic + problem from the left sidebar.<br>This tab shows the question, examples, wrong approaches, and key insight before you visualize the algorithm.</div>
            </div>
          </div>
          <div class="dsa-viz-area" id="dsa-viz-area" style="display:none">
            <div class="dsa-expl-box">
              <div class="dsa-expl-step">Algorithm Flow</div>
              <div class="dsa-expl-text">Read the question first → then click "See Algorithm Flow →" to step through.</div>
            </div>
          </div>
          <div class="dsa-bottom-bar" id="dsa-bottom-bar" style="display:none">
            <button class="dsa-btn dsa-btn-gray" id="dsa-btn-prev" disabled>◀ Prev</button>
            <button class="dsa-btn dsa-btn-gray" id="dsa-btn-next" disabled>Next ▶</button>
            <button class="dsa-btn dsa-btn-gray" id="dsa-btn-reset" disabled>↺ Reset</button>
            <button class="dsa-btn dsa-btn-green" id="dsa-btn-auto" disabled>▶ Auto</button>
            <div class="dsa-speed-row">
              <label>Speed</label>
              <input type="range" id="dsa-speed" min="1" max="10" value="5">
            </div>
            <span class="dsa-step-counter" id="dsa-step-ctr">— / —</span>
          </div>
        </div>
      </div>
    </div>
  `;
  initDSAVisualizer(mount, opts);
};

window.DSA_TOPICS = window.DSA_TOPICS || [];
