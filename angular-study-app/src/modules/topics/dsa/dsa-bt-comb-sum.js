(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bt-comb-sum",
    area: "dsa",
    title: "Combination Sum",
    tag: "Backtracking",
    tags: ["backtracking", "recursion", "pruning", "combination", "faang", "lc39"],
    concept: `Find all unique combinations of numbers that sum to a target. Numbers can be reused.

🧒 **Kid explanation:** You have coins: [2, 3, 6, 7]. You want to make exactly $7. You can reuse coins! Try putting a coin in your wallet. Keep adding coins until you either hit the target (success!) or go over (fail → backtrack and try a different coin). This explores every possible combination without trying ones that are obviously wrong.

**Pattern:** Backtracking with early pruning — O(n^(target/min))
**Key insight:** Sort candidates. When a candidate exceeds remaining target, stop trying larger ones (they'll also fail). Allows reuse by recursing at same index.
**Scenario:** Exact-change problem — which coins (reusable) sum to the exact target?`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "backtrack.combSum",
        time:  "O(2^t)",
        space: "O(t)",
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
      });
    }
  }]);
})();
