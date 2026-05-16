(function() {
  'use strict';
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
      window.DSAViz.topic.render(mount, {
        title: 'greedy.activitySel',
        time:  'O(n log n)',
        space: 'O(1)',
        code: `function activitySelection(activities) {
  activities.sort((a, b) => a[1] - b[1]);
  let count = 1;
  let lastEnd = activities[0][1];
  for (let i = 1; i < activities.length; i++) {
    if (activities[i][0] >= lastEnd) {
      count++;
      lastEnd = activities[i][1];
    }
  }
  return count;
}
const activities = [[1,3],[2,5],[3,9],[6,8],[5,7]];
const result = activitySelection(activities);`,
      });
    }
  }]);
})();
