/**
 * dp-problem.template.js — DPProblem class
 * Exposes: window.DSA.DPProblem
 *
 * Extends DSAProblem for dynamic programming (tabulation).
 * Examples: Fibonacci, Climb Stairs, House Robber, Coin Change, Knapsack, LCS, Edit Distance.
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class DPProblem extends window.DSA.Problem {
    getPatternLabel() { return "Dynamic Programming"; }

    getTracerOpts() {
      return {
        arrays: {
          dp:     true,
          memo:   true,
          coins:  true,
          nums:   true,
          prices: true,
          s1:     false,
          s2:     false,
          word1:  false,
          word2:  false,
        },
        vars: [
          "i", "j", "n", "k", "m",
          "result", "ans",
          "sum", "target", "amount",
          "profit", "maxProfit",
          "rob", "skip",
          "prev", "curr", "next",
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const _vars = step.variables || {};

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || "").toLowerCase();
          if (nar.includes("base case") || nar.includes("dp[0]"))    step.phase = "base";
          else if (nar.includes("return") || nar.includes("result")) step.phase = "done";
          else if (nar.includes("dp["))                              step.phase = "fill";
          else                                                        step.phase = "compute";
        }

        return step;
      });
    }
  }

  window.DSA.DPProblem = DPProblem;
})();
