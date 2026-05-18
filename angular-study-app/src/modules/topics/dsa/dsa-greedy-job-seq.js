(function() {
  "use strict";
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
      window.DSAViz.topic.render(mount, {
        title: "greedy.jobSeq",
        time:  "O(n²)",
        space: "O(n)",
        code: `function jobSequencing(jobs) {
  jobs.sort((a, b) => b.profit - a.profit);
  const maxDeadline = Math.max(...jobs.map(j => j.deadline));
  const slots = new Array(maxDeadline + 1).fill(false);
  let totalProfit = 0;
  let count = 0;
  for (const job of jobs) {
    for (let t = job.deadline; t >= 1; t--) {
      if (!slots[t]) {
        slots[t] = true;
        totalProfit += job.profit;
        count++;
        break;
      }
    }
  }
  return { count, totalProfit };
}
const jobs = [
  { id: 'a', deadline: 2, profit: 100 },
  { id: 'b', deadline: 1, profit: 19 },
  { id: 'c', deadline: 2, profit: 27 },
  { id: 'd', deadline: 1, profit: 25 },
  { id: 'e', deadline: 3, profit: 15 }
];
const result = jobSequencing(jobs);`,
      });
    }
  }]);
})();
