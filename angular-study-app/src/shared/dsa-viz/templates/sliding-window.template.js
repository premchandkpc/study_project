/**
 * sliding-window.template.js — SlidingWindowProblem class
 * Exposes: window.DSA.SlidingWindowProblem
 *
 * Extends DSAProblem with:
 * - Default tracer options for sliding window vars
 * - Step post-processing: adds phase labels, window narration
 *
 * Usage in topic visual():
 *   new DSA.SlidingWindowProblem(mount, { title, time, space, code }).render();
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class SlidingWindowProblem extends window.DSA.Problem {
    getPatternLabel() { return "Sliding Window"; }

    getTracerOpts() {
      return {
        // Auto-capture any of these array names if they appear in the code
        arrays: {
          arr:    true,
          nums:   true,
          s:      false,   // string — captured as chars if present
          deque:  true,
          result: true,
        },
        // Auto-capture these scalar vars
        vars: [
          "i", "j", "k", "left", "right",
          "windowSum", "maxSum", "minLen", "maxLen",
          "sum", "count", "result",
          "start", "end",
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};
        const hasLeft  = "left"  in vars;
        const hasRight = "right" in vars;
        const hasI     = "i"     in vars;
        const hasK     = "k"     in vars;

        // Auto-inject window range for visual panel
        if (!step.windowRange) {
          if (hasLeft && hasRight) {
            step.windowRange = { left: vars.left, right: vars.right };
          } else if (hasI && hasK) {
            const right = vars.i;
            const left  = Math.max(0, vars.i - vars.k + 1);
            step.windowRange = { left, right };
          }
        }

        // Auto-detect phase from narration or variables
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || "").toLowerCase();
          if (nar.includes("shrink") || nar.includes("left++"))    step.phase = "shrink";
          else if (nar.includes("expand") || nar.includes("push")) step.phase = "expand";
          else if (nar.includes("max") || nar.includes("result"))  step.phase = "found";
          else                                                       step.phase = "scan";
        }

        return step;
      });
    }
  }

  window.DSA.SlidingWindowProblem = SlidingWindowProblem;
})();
