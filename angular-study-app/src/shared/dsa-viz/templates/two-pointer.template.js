/**
 * two-pointer.template.js — TwoPointerProblem class
 * Exposes: window.DSA.TwoPointerProblem
 *
 * Extends DSAProblem for problems using left/right or slow/fast pointer pairs.
 * Examples: Container with Most Water, Trapping Rain Water, 3Sum.
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  class TwoPointerProblem extends window.DSA.Problem {
    getPatternLabel() { return 'Two Pointers'; }

    getTracerOpts() {
      return {
        arrays: {
          arr:    true,
          nums:   true,
          height: true,
          result: true,
        },
        vars: [
          'left', 'right', 'slow', 'fast',
          'i', 'j', 'k',
          'area', 'maxArea', 'water', 'trapped',
          'sum', 'target', 'result',
          'lo', 'hi',
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};

        // Inject pointer positions for visual highlight
        if (!step.pointers) {
          const ptrs = {};
          if ('left'  in vars) ptrs.L = vars.left;
          if ('right' in vars) ptrs.R = vars.right;
          if ('slow'  in vars) ptrs.S = vars.slow;
          if ('fast'  in vars) ptrs.F = vars.fast;
          if ('lo'    in vars) ptrs.lo = vars.lo;
          if ('hi'    in vars) ptrs.hi = vars.hi;
          if (Object.keys(ptrs).length) step.pointers = { nums: ptrs };
        }

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || '').toLowerCase();
          if (nar.includes('left++') || nar.includes('move left'))   step.phase = 'move-left';
          else if (nar.includes('right--') || nar.includes('move right')) step.phase = 'move-right';
          else if (nar.includes('found') || nar.includes('result'))  step.phase = 'found';
          else                                                         step.phase = 'compare';
        }

        return step;
      });
    }
  }

  window.DSA.TwoPointerProblem = TwoPointerProblem;
})();
