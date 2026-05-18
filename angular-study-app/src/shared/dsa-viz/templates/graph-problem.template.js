/**
 * graph-problem.template.js — GraphProblem class
 * Exposes: window.DSA.GraphProblem
 *
 * Extends DSAProblem for graph traversal and pathfinding.
 * Examples: BFS, DFS, Dijkstra, Number of Islands, Topological Sort.
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class GraphProblem extends window.DSA.Problem {
    getPatternLabel() { return "Graph Traversal"; }

    getTracerOpts() {
      return {
        arrays: {
          queue:   true,
          stack:   true,
          visited: false,
          path:    true,
          result:  true,
          order:   true,
          dist:    true,
        },
        vars: [
          "node", "curr", "u", "v",
          "start", "end", "target",
          "level", "depth",
          "count", "components",
          "rows", "cols", "r", "c",
          "dist", "cost",
        ],
      };
    }

    postProcess(steps) {
      return steps.map(step => {
        const vars = step.variables || {};

        // Phase detection
        if (!step.phase) {
          const nar = (step.narration || step.codeLine || "").toLowerCase();
          if (nar.includes("queue") || nar.includes("enqueue"))        step.phase = "enqueue";
          else if (nar.includes("dequeue") || nar.includes("shift"))   step.phase = "dequeue";
          else if (nar.includes("visit") || nar.includes("mark"))      step.phase = "visit";
          else if (nar.includes("push") || nar.includes("stack"))      step.phase = "push";
          else if (nar.includes("pop"))                                 step.phase = "pop";
          else if (nar.includes("relax") || nar.includes("dist"))      step.phase = "relax";
          else if (nar.includes("found") || nar.includes("result"))    step.phase = "found";
          else if (nar.includes("neighbor") || nar.includes("adj"))    step.phase = "explore";
          else                                                           step.phase = "scan";
        }

        return step;
      });
    }
  }

  window.DSA.GraphProblem = GraphProblem;
})();
