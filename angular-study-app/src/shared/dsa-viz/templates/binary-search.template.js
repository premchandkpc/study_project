/**
 * binary-search.template.js — BinarySearchProblem class
 * Exposes: window.DSA.BinarySearchProblem
 *
 * Extends DSAProblem for binary search on sorted / rotated arrays.
 * Examples: Search Rotated Array, Find Min Rotated, Koko Bananas.
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  class BinarySearchProblem extends window.DSA.Problem {
    getPatternLabel() { return 'Binary Search'; }

    getTracerOpts() {
      return {
        arrays: {
          nums:  true,
          arr:   true,
          piles: false,
        },
        vars: [
          'lo', 'hi', 'mid',
          'left', 'right',
          'low', 'high',
          'target', 'result',
          'ans', 'k', 'h',
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};

        // Inject pointer positions
        if (!step.pointers) {
          const ptrs = {};
          const lo  = vars.lo  ?? vars.left  ?? vars.low;
          const hi  = vars.hi  ?? vars.right ?? vars.high;
          const mid = vars.mid;
          if (lo  !== undefined) ptrs.lo  = lo;
          if (hi  !== undefined) ptrs.hi  = hi;
          if (mid !== undefined) ptrs.mid = mid;
          if (Object.keys(ptrs).length) step.pointers = { nums: ptrs };
        }

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || '').toLowerCase();
          if (nar.includes('found') || nar.includes('return mid'))   step.phase = 'found';
          else if (nar.includes('go left')  || nar.includes('hi =')) step.phase = 'go-left';
          else if (nar.includes('go right') || nar.includes('lo =')) step.phase = 'go-right';
          else if (nar.includes('mid'))                               step.phase = 'midpoint';
          else                                                         step.phase = 'scan';
        }

        return step;
      });
    }
  }

  window.DSA.BinarySearchProblem = BinarySearchProblem;
})();
