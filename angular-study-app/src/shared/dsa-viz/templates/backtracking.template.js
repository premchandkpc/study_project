/**
 * backtracking.template.js — BacktrackingProblem class
 * Exposes: window.DSA.BacktrackingProblem
 *
 * Extends DSAProblem for backtracking / recursion-tree problems.
 * Examples: Subsets, Permutations, Combination Sum, N-Queens.
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class BacktrackingProblem extends window.DSA.Problem {
    getPatternLabel() { return "Backtracking"; }

    getTracerOpts() {
      return {
        arrays: {
          current:  true,
          result:   true,
          results:  true,
          path:     true,
          nums:     true,
          chosen:   true,
        },
        vars: [
          "start", "i", "j",
          "target", "remain",
          "depth", "level",
          "n", "k",
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || "").toLowerCase();
          if (nar.includes("backtrack") || nar.includes("pop"))       step.phase = "backtrack";
          else if (nar.includes("choose") || nar.includes("push"))    step.phase = "choose";
          else if (nar.includes("base") || nar.includes("result.push")) step.phase = "found";
          else if (nar.includes("recurse") || nar.includes("call"))   step.phase = "recurse";
          else                                                           step.phase = "explore";
        }

        return step;
      });
    }
  }

  window.DSA.BacktrackingProblem = BacktrackingProblem;
})();
