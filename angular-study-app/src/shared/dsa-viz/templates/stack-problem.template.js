/**
 * stack-problem.template.js — StackProblem class
 * Exposes: window.DSA.StackProblem
 *
 * Extends DSAProblem for monotonic stack / bracket matching problems.
 * Examples: Valid Parentheses, Daily Temperatures, Largest Rectangle in Histogram.
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class StackProblem extends window.DSA.Problem {
    getPatternLabel() { return "Monotonic Stack"; }

    getTracerOpts() {
      return {
        arrays: {
          stack:    true,
          heights:  true,
          temps:    true,
          result:   true,
          answer:   true,
        },
        vars: [
          "i", "j",
          "top", "curr", "prev",
          "area", "maxArea",
          "width", "height", "h",
          "count", "result",
          "ch", "char",
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || "").toLowerCase();
          if (nar.includes("push"))                                    step.phase = "push";
          else if (nar.includes("pop"))                                step.phase = "pop";
          else if (nar.includes("area") || nar.includes("max"))       step.phase = "compute";
          else if (nar.includes("match") || nar.includes("valid"))    step.phase = "match";
          else if (nar.includes("return") || nar.includes("result"))  step.phase = "done";
          else                                                          step.phase = "scan";
        }

        return step;
      });
    }
  }

  window.DSA.StackProblem = StackProblem;
})();
