(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-stk-daily-temps",
    area: "dsa",
    title: "Daily Temperatures",
    tag: "Stack",
    tags: ["stack", "monotonic stack", "array", "next greater element", "faang", "lc739"],
    concept: `For each day, return how many days you have to wait for a warmer temperature.

🧒 **Kid explanation:** Imagine you're waiting for a sunny day. You have a list of temperatures. For each day you're still waiting, keep it in a "waiting list" (stack). When a warm day arrives, EVERYONE who was waiting for a warmer day finally gets their answer — the number of days they waited. Cross them off the list!

**Pattern:** Monotonic decreasing stack storing indices — O(n)
**Key insight:** Store indices on stack. When current temp beats stack-top's temp, pop it and record gap = current_index − popped_index.
**Scenario:** Stock ticker — how many days until a stock price rises above today's closing price?`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'stack.dailyTemp',
        time:  'O(n)',
        space: 'O(n)',
        code: `function dailyTemperatures(temps) {
  const result = new Array(temps.length).fill(0);
  const stack = [];
  for (let i = 0; i < temps.length; i++) {
    while (stack.length && temps[i] > temps[stack[stack.length - 1]]) {
      const idx = stack.pop();
      result[idx] = i - idx;
    }
    stack.push(i);
  }
  return result;
}
const temps = [73, 74, 75, 71, 69, 72, 76, 73];
const result = dailyTemperatures(temps);`,
      });
    }
  }]);
})();
