(function() {
  'use strict';
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
      window.DSAViz.topic.render(mount, {
        title: 'dpx.jumpGame',
        time:  'O(n)',
        space: 'O(1)',
        code: `function canJump(nums) {
  let maxReach = 0;
  for (let i = 0; i < nums.length; i++) {
    if (i > maxReach) return false;
    if (i + nums[i] > maxReach) maxReach = i + nums[i];
  }
  return true;
}
const nums = [2, 3, 1, 1, 4];
const result = canJump(nums);`,
      });
    }
  }]);
})();
