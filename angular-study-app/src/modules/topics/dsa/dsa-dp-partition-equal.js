(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dp-partition-equal",
    area: "dsa",
    title: "Partition Equal Subset Sum",
    tag: "Dynamic Programming",
    tags: ["dp", "partition", "subset sum", "boolean dp", "faang"],
    concept: `Can the array be split into two subsets with equal sum?

**Pattern:** 0/1 subset-sum DP — O(n × total/2)
**Hint:** Process numbers once; iterate target backward so each value is used at most once.
**Scenario:** FAANG subset-sum transformation: equal partition means target = total / 2.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dp', problem: 'partitionEqual' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
