(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-dpx-max-product",
    area: "dsa",
    title: "Maximum Product Subarray",
    tag: "DP Extended",
    tags: ["dp", "array", "product", "negative numbers", "faang", "lc152"],
    concept: `Find the contiguous subarray with the largest product.

🧒 **Kid explanation:** Multiplying numbers sounds easy — but watch out for NEGATIVE numbers! Two negatives make a positive, so the minimum product can suddenly become the maximum when you multiply by another negative. Track BOTH the running maximum AND the running minimum at every step. When you see a new number, they might SWAP!

**Pattern:** DP tracking both max and min products — O(n)
**Key insight:** curMax = max(num, curMax*num, curMin*num). curMin = min(same three). When num is negative, max and min flip roles.
**Scenario:** Signal processing — find the stretch of multiplied sensor values that peaks highest.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "dpx.maxProduct",
        time:  "O(n)",
        space: "O(1)",
        code: `function maxProduct(nums) {
  let maxProd = nums[0];
  let minProd = nums[0];
  let result = nums[0];
  for (let i = 1; i < nums.length; i++) {
    const n = nums[i];
    const tempMax = Math.max(n, maxProd * n, minProd * n);
    minProd = Math.min(n, maxProd * n, minProd * n);
    maxProd = tempMax;
    if (maxProd > result) result = maxProd;
  }
  return result;
}
const nums = [2, 3, -2, 4];
const result = maxProduct(nums);`,
      });
    }
  }]);
})();
