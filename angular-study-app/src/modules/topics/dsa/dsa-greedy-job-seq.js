(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-greedy-job-seq",
    area: "dsa",
    title: "Job Sequencing",
    tag: "Greedy",
    tags: ["greedy", "job sequencing", "deadlines", "profit", "scheduling"],
    concept: `Schedule jobs with deadlines and profits to maximize total profit before deadlines.

**Pattern:** Greedy by profit + latest free slot — O(n²)
**Hint:** Try each high-profit job as late as possible to keep earlier slots open.
**Scenario:** Batch scheduler — most profitable jobs compete for limited slots.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'greedy', problem: 'jobSeq' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
