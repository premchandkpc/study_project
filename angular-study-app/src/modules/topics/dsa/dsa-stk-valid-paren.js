(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-stk-valid-paren",
    area: "dsa",
    title: "Valid Parentheses",
    tag: "Stack",
    tags: ["stack", "string", "brackets", "matching", "faang", "lc20"],
    concept: `Check if a string of brackets is properly opened and closed.

🧒 **Kid explanation:** Imagine stacking plates. Every time you see an opening bracket — (, [, { — put a plate on the pile. When you see a closing bracket — ), ], } — take the top plate off. It MUST match! If you reach the end with an empty pile and no mismatches, it's valid. Like making sure every door you open, you also close!

**Pattern:** Stack push/pop matching — O(n)
**Key insight:** Closing bracket must match the most recently opened (top of stack) bracket.
**Scenario:** Code compiler — every opening bracket must be closed in the correct order.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'stack.validParen',
        time:  'O(n)',
        space: 'O(n)',
        code: `function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if ('([{'.includes(ch)) {
      stack.push(ch);
    } else {
      if (stack[stack.length - 1] !== map[ch]) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}
const s = "({[]})";
const result = isValid(s);`,
      });
    }
  }]);
})();
