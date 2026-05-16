/**
 * greedy-problem.template.js — GreedyProblem class
 * Exposes: window.DSA.GreedyProblem
 *
 * Extends DSAProblem for greedy algorithm problems.
 * Examples: Activity Selection, Coin Change (greedy), Job Sequencing.
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  class GreedyProblem extends window.DSA.Problem {
    getPatternLabel() { return 'Greedy'; }

    getTracerOpts() {
      return {
        arrays: {
          activities: true,
          jobs:       true,
          coins:      true,
          result:     true,
          selected:   true,
          sorted:     true,
        },
        vars: [
          'i', 'j', 'k', 'n',
          'count', 'total', 'profit',
          'lastEnd', 'end', 'start',
          'remaining', 'result', 'ans',
          'deadline', 'slot',
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || '').toLowerCase();
          if (nar.includes('sort'))                                     step.phase = 'sort';
          else if (nar.includes('select') || nar.includes('pick'))     step.phase = 'select';
          else if (nar.includes('skip') || nar.includes('reject'))     step.phase = 'skip';
          else if (nar.includes('result') || nar.includes('return'))   step.phase = 'done';
          else                                                           step.phase = 'scan';
        }
        return step;
      });
    }
  }

  window.DSA.GreedyProblem = GreedyProblem;
})();
