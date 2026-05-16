(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-bs-search-rotated",
    area: "dsa",
    title: "Search in Rotated Sorted Array",
    tag: "Binary Search",
    tags: ["binary search", "array", "rotated", "faang", "premium", "lc33"],
    concept: `Search a sorted array that was rotated at an unknown pivot. Return the index or -1.

🧒 **Kid explanation:** Imagine a sorted row of lockers: 1,2,3,4,5,6,7. Someone spun it like a wheel and now it reads: 4,5,6,7,1,2,3. You still have a secret weapon — binary search! Even though it's rotated, ONE HALF is always in perfect sorted order. Figure out which half, check if your target is in it, then search only that half!

**Pattern:** Binary search with half-sorted check — O(log n)
**Key insight:** At any midpoint, either the left half or right half is perfectly sorted. Use that to decide which side to search.
**Scenario:** Circular buffer lookup — data wrapped around a ring buffer.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'bsearch.searchRotated',
        time:  'O(log n)',
        space: 'O(1)',
        code: `function search(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[left] <= nums[mid]) {
      if (target >= nums[left] && target < nums[mid]) right = mid - 1;
      else left = mid + 1;
    } else {
      if (target > nums[mid] && target <= nums[right]) left = mid + 1;
      else right = mid - 1;
    }
  }
  return -1;
}
const nums = [4, 5, 6, 7, 0, 1, 2];
const target = 0;
const result = search(nums, target);`,
      });
    }
  }]);
})();
