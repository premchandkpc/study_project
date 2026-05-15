(function() {
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
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'backtrack', problem: 'subsets' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
