(function() {
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dpx-jump-game",
    area: "dsa",
    title: "Jump Game",
    tag: "DP Extended",
    tags: ["dp", "greedy", "array", "reachability", "faang", "lc55"],
    concept: `Each element is the max jump from that position. Can you reach the last index?

🧒 **Kid explanation:** You're on lily pads in a pond. Each pad shows how far you can jump from it. [2,3,1,1,4] means pad 0 can jump up to 2 pads ahead. Track the FARTHEST pad you can possibly reach. If you ever step on a pad that's BEYOND your farthest reach, you're stuck in the water!

**Pattern:** Greedy max-reach tracking — O(n)
**Key insight:** Maintain maxReach = farthest index reachable so far. At each index i, if i > maxReach, you're stranded. Otherwise extend maxReach = max(maxReach, i + nums[i]).
**Scenario:** Level progression — can a player reach the final level given jump distances?`,
    visual: function(mount) {
      if (typeof window._dsaRenderViz === 'function') {
        window._dsaRenderViz(mount, { topic: 'dpx', problem: 'jumpGame' });
      } else {
        mount.innerHTML = '<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Visualizer core not loaded. Hard-refresh (Ctrl+Shift+R).</div>';
      }
    }
  }]);
})();
