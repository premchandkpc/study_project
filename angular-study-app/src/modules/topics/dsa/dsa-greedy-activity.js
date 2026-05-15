(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-greedy-activity",
    area: "dsa",
    title: "Activity Selection",
    tag: "Greedy",
    tags: ["greedy", "activity selection", "intervals", "scheduling"],
    concept: `Select the maximum number of non-overlapping activities from start/end times.

**Pattern:** Greedy by earliest finish time — O(n log n)
**Hint:** Sort by end time; an earlier finish leaves maximum room for future choices.
**Scenario:** Calendar optimizer — fit the most meetings into one room.`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'greedy', problem: 'activitySel' });
      }
    }
  }]);
})();
