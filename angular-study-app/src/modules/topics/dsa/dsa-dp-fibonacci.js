/**
 * dsa-dp-fibonacci.js — Fibonacci (DP tabulation)
 * SELF-CONTAINED: metadata + code + visual all here.
 * Template: DSA.DPProblem
 */
(function () {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id:   'dsa-dp-fibonacci',
    area: 'dsa',
    title: 'Fibonacci — DP Intro',
    tag:  'Dynamic Programming',
    tags: ['dp', 'fibonacci', 'tabulation', 'memoization', 'recursion'],
    concept: `Compute the nth Fibonacci number. F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2).\n\n🧒 Kid explanation: Staircase tiles. Each tile value = sum of previous two tiles. Build from tile 0 upward — never recompute.\n\n**Pattern:** DP tabulation — O(n) time, O(n) space. Optimizable to O(1) space with two vars.\n**Key insight:** Naive recursion recomputes F(k) exponentially many times. Tabulation computes each subproblem exactly once.`,
    why: `Gateway to DP thinking. Every DP problem: identify subproblem → write recurrence → fill table bottom-up → read answer.`,
    example: {
      language: 'javascript',
      code: `function fib(n) {\n  const dp = [0, 1];\n  for (let i = 2; i <= n; i++) dp[i] = dp[i-1] + dp[i-2];\n  return dp[n];\n}\n// O(1) space variant\nfunction fibOpt(n) {\n  let prev = 0, curr = 1;\n  for (let i = 2; i <= n; i++) [prev, curr] = [curr, prev + curr];\n  return curr;\n}`,
      notes: 'Space optimization: only keep last two values since dp[i] depends only on dp[i-1] and dp[i-2].',
    },
    interview: [
      { question: 'Time complexity of naive recursive Fibonacci?', answer: 'O(2^n) — each call branches into two, creating exponential recursion tree with repeated subproblems.', followUps: ['How does memoization fix this?'] },
      { question: 'How to reduce space from O(n) to O(1)?', answer: 'Since dp[i] depends only on dp[i-1] and dp[i-2], maintain two variables (prev, curr) and update each iteration.', followUps: ['Does this change time complexity?'] },
    ],
    tradeoffs: {
      pros: ['O(n) time vs O(2^n) naive', 'Simple recurrence', 'O(1) space variant exists'],
      cons: ['Integer overflow for large n — need BigInt', 'Teaching example — not a hard problem'],
      when: 'Use DP tabulation when subproblems overlap and optimal substructure holds.',
    },
    gotchas: ['dp[0]=0, dp[1]=1 — initialize both base cases', 'Loop starts at i=2 not i=1', 'For n>70 use BigInt'],
    visual: function (mount) {
      new window.DSA.DPProblem(mount, {
        title: 'dp.fibonacci',
        time:  'O(n)',
        space: 'O(n)',
        code: `function fib(n) {\n  const dp = [0, 1];\n  for (let i = 2; i <= n; i++) {\n    dp[i] = dp[i - 1] + dp[i - 2];\n  }\n  return dp[n];\n}\nconst result = fib(8);`,
      }).render();
    },
  }]);
})();
