(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bt-subsets",
    area: "dsa",
    title: "Subsets (Power Set)",
    tag: "Backtracking",
    tags: ["backtracking", "recursion", "power set", "bit manipulation", "faang", "lc78"],
    concept: `Return all possible subsets (the power set) of a set of distinct integers.

🧒 **Kid explanation:** You have 3 toys: [1, 2, 3]. The power set is ALL possible bags you could pack — including the empty bag! For each toy, you decide: pack it or leave it. That gives you 2×2×2 = 8 bags. We explore both choices (include/exclude) for every toy using recursion.

**Pattern:** Include/exclude backtracking — O(2^n × n)
**Key insight:** At each element, branch into two paths: include it in current subset, or skip it. Both paths recurse on the remaining elements.
**Scenario:** Feature toggle combinations — generate all ON/OFF combinations of feature flags.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'backtrack.subsets',
        time:  'O(2^n)',
        space: 'O(n)',
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
      });
    }
  }]);
})();
