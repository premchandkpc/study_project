(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-edit-distance",
    area: "dsa",
    title: "Edit Distance",
    tag: "Dynamic Programming",
    tags: ["dp", "edit distance", "string", "levenshtein", "faang"],
    concept: `Return the minimum insert, delete, or replace operations needed to convert word1 into word2.

**Pattern:** 2D min-cost string DP — O(mn)
**Hint:** Mismatch chooses 1 + min(insert, delete, replace).
**Scenario:** Spell-check, search suggestions, diff tools.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'editDistance' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
