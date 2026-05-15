(function() {
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
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'stack', problem: 'dailyTemp' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
