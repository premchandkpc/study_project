(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bt-permutations",
    area: "dsa",
    title: "Permutations",
    tag: "Backtracking",
    tags: ["backtracking", "recursion", "permutation", "swap", "faang", "lc46"],
    concept: `Return all possible orderings (permutations) of a list of distinct integers.

🧒 **Kid explanation:** You have 3 friends sitting in a row: 1, 2, 3. How many ways can they sit? 3×2×1 = 6 ways! For the first seat, any of the 3 can sit. For the second, any of the remaining 2. And so on. We do this with a "swap and recurse" trick — swap each friend into the first seat, solve the rest, then swap back.

**Pattern:** Swap-based backtracking — O(n! × n)
**Key insight:** Fix position by position. For position i, try swapping each element from [i..n-1] into position i. Recurse on i+1. Undo the swap (backtrack).
**Scenario:** Password cracker — generate all orderings of a character set.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'backtrack.permutations',
        time:  'O(n!)',
        space: 'O(n)',
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
      });
    }
  }]);
})();
