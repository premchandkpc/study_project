(function() {
  var topic = {
    id: "dsa-visualizer",
    area: "dsa",
    title: "DSA Algorithm Visualizer",
    tag: "Interactive",
    tags: ["dsa", "algorithms", "sliding-window", "dp", "greedy", "graph", "bfs", "dfs", "dijkstra", "faang", "climbing-stairs", "house-robber", "edit-distance", "lis", "subset-sum"],
    concept:
`Step-through visual debugger for core DSA patterns.

**Sliding Window** — fixed/variable window with two pointers. O(n) for sum, frequency, and deque problems.

**Dynamic Programming** — table-filling with dependency arrows. Fibonacci, Climbing Stairs, House Robber, Coin Change, Unique Paths, 0/1 Knapsack, LCS, Edit Distance, LIS, Partition Equal Subset Sum.

**Greedy** — local-optimal decisions at each step. Activity Selection, Coin Change, Job Sequencing.

**Graph** — BFS (queue, shortest path in unweighted), DFS (stack/recursion, cycle detection), Dijkstra (min-heap / dist array, SSSP in weighted).`,
    why:
`These four patterns cover ~70% of Leetcode medium/hard problems. Recognising which pattern applies is the interview skill — not memorising solutions. Each visualizer step shows the exact decision the algorithm makes, building intuition for why it works.`,
    example: {
      language: "python",
      code:
`# Sliding Window — Longest Substring Without Repeat  O(n)
def length_of_longest_substring(s: str) -> int:
    freq: dict[str, int] = {}
    l, max_len = 0, 0
    for r, c in enumerate(s):
        freq[c] = freq.get(c, 0) + 1
        while freq[c] > 1:
            freq[s[l]] -= 1
            l += 1
        max_len = max(max_len, r - l + 1)
    return max_len

# DP — Coin Change  O(amount * len(coins))
def coin_change(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] != float('inf') else -1`,
      notes:
`Both run in a single forward pass. The visualizer now starts every scenario with an interview-style question card, then shows each window shift, queue move, or DP cell write. Use the extra DP tabs for common FAANG-style drills such as Climbing Stairs, House Robber, Unique Paths, Edit Distance, LIS, and Partition Equal Subset Sum.`
    },
    interview: [
      {
        question: "When do you use sliding window vs two pointers?",
        answer:
`**Sliding window** = subarray/substring with a constraint (sum ≥ k, no duplicates). Window expands right and contracts left while the constraint is violated. **Two pointers** = sorted array, meeting in the middle (pair sum, palindrome check). Rule of thumb: if you need a contiguous window, use sliding window; if you can sort and work from both ends, use two pointers.`,
        followUps: ["Monotonic deque for window maximum?", "Shrink condition for variable window?"]
      },
      {
        question: "FAANG-style: How do you solve Sliding Window Maximum in O(n)?",
        answer:
`Use a **monotonic deque of indices**. Before adding i, remove indices outside the window from the front. Then remove smaller values from the back because they can never become a future maximum while the new larger value remains. Push i. Once the first full window exists, arr[deque[0]] is the answer. Each index enters and exits once, so total time is O(n), space O(k).`,
        followUps: ["Why store indices instead of values?", "How does it handle duplicates?"]
      },
      {
        question: "How do you recognise a DP problem?",
        answer:
`Three signals: (1) **optimal substructure** — solution built from optimal sub-solutions; (2) **overlapping subproblems** — same sub-problem computed multiple times in naive recursion; (3) problem asks for min/max/count over choices. Draw the recurrence first, then decide top-down (memoisation) vs bottom-up (tabulation). Bottom-up is usually faster due to no call-stack overhead.`,
        followUps: ["Space optimisation for 1D DP?", "When is memoisation better than tabulation?", "What is the state definition?"]
      },
      {
        question: "FAANG-style: Climbing Stairs recurrence and complexity?",
        answer:
`State: dp[i] = number of ways to reach step i. Last move is either 1 step from i-1 or 2 steps from i-2, so dp[i] = dp[i-1] + dp[i-2]. Base dp[0]=1 and dp[1]=1. Tabulation is O(n) time and O(n) space; with two rolling variables it becomes O(1) space.`,
        followUps: ["How does this change if steps can be [1,3,5]?", "Why is dp[0]=1?"]
      },
      {
        question: "FAANG-style: House Robber choose/skip recurrence?",
        answer:
`State: dp[i] = max money from houses 0..i. At every house, either skip it and keep dp[i-1], or rob it and add nums[i] + dp[i-2]. Recurrence: dp[i] = max(dp[i-1], nums[i] + dp[i-2]). This is O(n) time and can be O(1) space because only the previous two states are needed.`,
        followUps: ["How does House Robber II change with a circular street?", "How would you reconstruct which houses were robbed?"]
      },
      {
        question: "FAANG-style: Coin Change min coins vs greedy?",
        answer:
`Greedy picks the largest coin first, but it fails on non-canonical sets such as coins=[1,3,4], amount=6. DP defines dp[a] = minimum coins for amount a. For each amount, try every coin as the last coin: dp[a] = min(dp[a], dp[a-c] + 1). Time O(amount * coin_count), space O(amount).`,
        followUps: ["How do you return the actual coins?", "How is Coin Change II different?"]
      },
      {
        question: "FAANG-style: Unique Paths grid recurrence?",
        answer:
`State: dp[r][c] = number of ways to reach cell (r,c). Since moves are only right or down, every interior cell is reached from top or left: dp[r][c] = dp[r-1][c] + dp[r][c-1]. First row and first column are all 1. Time O(mn), space O(mn), optimizable to O(n).`,
        followUps: ["How do obstacles change the recurrence?", "How do you optimize to one row?"]
      },
      {
        question: "When does greedy fail where DP succeeds?",
        answer:
`Greedy works when the problem has the **greedy-choice property**: a locally optimal choice leads to a globally optimal solution. Greedy Coin Change fails on non-canonical coin sets (e.g. coins=[1,3,4], amount=6 → greedy gives 4+1+1=3 coins, DP gives 3+3=2 coins). Whenever past choices constrain future choices in non-obvious ways, DP is safer.`,
        followUps: ["Prove Activity Selection greedy is optimal?", "Exchange argument?"]
      },
      {
        question: "FAANG-style: 0/1 Knapsack recurrence?",
        answer:
`State: dp[i][w] = max value using the first i items with capacity w. For item i, if weight > w, copy dp[i-1][w]. If it fits, choose max(skip = dp[i-1][w], take = value + dp[i-1][w-weight]). The "i-1" row is what prevents using the same item more than once.`,
        followUps: ["How do you compress to 1D?", "Why must 1D capacity iterate backward?"]
      },
      {
        question: "FAANG-style: LCS vs longest common substring?",
        answer:
`LCS allows gaps; substring must be contiguous. For LCS, dp[i][j] compares prefixes. If chars match, use diagonal + 1. If not, take max(top, left). For longest common substring, mismatch resets the cell to 0 because contiguity is broken.`,
        followUps: ["How do you reconstruct the sequence?", "What changes for shortest common supersequence?"]
      },
      {
        question: "FAANG-style: Edit Distance operation choices?",
        answer:
`State: dp[i][j] = min edits to convert word1[0..i) to word2[0..j). If chars match, carry dp[i-1][j-1]. Otherwise choose 1 + min(delete from word1 = dp[i-1][j], insert into word1 = dp[i][j-1], replace = dp[i-1][j-1]). Base row/column represent converting to/from the empty string.`,
        followUps: ["How would weighted operation costs change it?", "How do you recover the edit script?"]
      },
      {
        question: "FAANG-style: LIS O(n²) DP and O(n log n) upgrade?",
        answer:
`O(n²) DP: dp[i] = LIS length ending at i, and for every j<i with nums[j]<nums[i], update dp[i]=max(dp[i], dp[j]+1). The O(n log n) method keeps tails[len] = smallest possible tail value for an increasing subsequence of length len+1 and binary-searches where each number belongs. tails gives length, not the exact sequence unless extra parent pointers are kept.`,
        followUps: ["Why replace tails values?", "How do duplicates change lower_bound vs upper_bound?"]
      },
      {
        question: "FAANG-style: Partition Equal Subset Sum as subset sum?",
        answer:
`If total sum is odd, answer is false. Otherwise target = total/2 and the task becomes: can any subset sum to target? Use boolean dp[s]. Start dp[0]=true. For each number, iterate s backward and set dp[s] = dp[s] || dp[s-num]. Backward iteration enforces 0/1 usage.`,
        followUps: ["Why not iterate forward?", "How do you count number of subsets instead of boolean existence?"]
      },
      {
        question: "Graph scenario: BFS, DFS, or Dijkstra?",
        answer:
`Use **BFS** when all edges have equal weight and you need shortest hops or level traversal. Use **DFS** for connected components, cycle checks, topological-style exploration, or exhaustive branch traversal. Use **Dijkstra** for shortest paths with non-negative weighted edges. If negative weights appear, switch to Bellman-Ford or another suitable algorithm.`,
        followUps: ["Why does Dijkstra fail with negative edges?", "When do you need a priority queue?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Step-by-step execution with explanation + pseudocode line at each step",
        "Custom input — paste any array or string to test edge cases",
        "Auto-play with speed control for rapid pattern absorption",
        "Four canonical patterns plus expanded DP drills from common FAANG-style interviews"
      ],
      cons: [
        "Graph layout is circular — may overlap for dense graphs",
        "No backtracking / recursive call-stack visualisation yet",
        "No sorting algorithms (bubble, merge, quick) — separate concern"
      ],
      when: "Use before interviews to rebuild intuition on any pattern you haven't touched recently. Run a problem you've seen before — see if you can predict the next step before clicking Next."
    },
    visual(mount) {
      // Inject scoped styles
      const styleId = 'dsa-viz-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
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
              <div class="dsa-viz-area" id="dsa-viz-area">
                <div class="dsa-expl-box">
                  <div class="dsa-expl-step">Welcome</div>
                  <div class="dsa-expl-text">Pick any topic + problem from the left sidebar.<br>Customize input, then step through each iteration.</div>
                </div>
              </div>
              <div class="dsa-bottom-bar">
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

      initDSAVisualizer(mount);
    }
  };
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([topic]);
})();
