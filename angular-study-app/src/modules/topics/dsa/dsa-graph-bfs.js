/**
 * dsa-graph-bfs.js — Breadth-First Search
 * SELF-CONTAINED: metadata + code + visual all here.
 * Template: DSA.GraphProblem
 */
(function () {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id:   "dsa-graph-bfs",
    area: "dsa",
    title: "Graph BFS — Breadth-First Search",
    tag:  "Graph",
    tags: ["graph", "bfs", "queue", "shortest path", "level order"],
    concept: "Explore a graph layer by layer using a queue. Visits all nodes at depth d before any at depth d+1.\n\n🧒 Ripples in a pond. Drop a stone (start node). First ring = neighbors. BFS = ripple order.\n\n**Pattern:** Queue-based layer traversal — O(V+E)\n**Key insight:** FIFO queue guarantees shortest path in unweighted graphs.",
    why: "BFS finds shortest path in unweighted graphs. Used in: social network degrees, web crawlers, maze solving, level-order traversal, Bipartite check.",
    example: {
      language: "javascript",
      code: "function bfs(graph, start) {\n  const visited = new Set([start]);\n  const queue = [start];\n  const order = [];\n  while (queue.length) {\n    const node = queue.shift();\n    order.push(node);\n    for (const neighbor of (graph[node] || [])) {\n      if (!visited.has(neighbor)) {\n        visited.add(neighbor);\n        queue.push(neighbor);\n      }\n    }\n  }\n  return order;\n}",
      notes: "Mark visited when ENQUEUED — not dequeued — prevents duplicate entries in queue.",
    },
    interview: [
      { question: "Why does BFS guarantee shortest path in unweighted graphs?", answer: "BFS processes nodes level by level. First time a node is reached it is via shortest path.", followUps: ["Does this hold for weighted graphs?", "What handles weighted shortest path?"] },
      { question: "BFS vs DFS — when to use each?", answer: "BFS: shortest path, level-order. DFS: cycle detection, topological sort, backtracking. BFS uses more memory; DFS uses stack depth.", followUps: ["Space complexity of each?"] },
    ],
    tradeoffs: {
      pros: ["Shortest path in unweighted graph", "Level-order processing", "Finds all reachable nodes"],
      cons: ["O(V) space for queue", "Not for weighted shortest path"],
      when: "Use BFS when you need shortest path (unweighted) or level-by-level processing.",
    },
    gotchas: ["Mark visited when ENQUEUED not dequeued", "queue.shift() is O(n) — use deque for large inputs", "Handle disconnected graphs by looping all nodes"],
    visual: function (mount) {
      new window.DSA.GraphProblem(mount, {
        title: "graph.bfs",
        time:  "O(V+E)",
        space: "O(V)",
        code: "function bfs(graph, start) {\n  const visited = new Set([start]);\n  const queue = [start];\n  const order = [];\n  while (queue.length) {\n    const node = queue.shift();\n    order.push(node);\n    for (const neighbor of (graph[node] || [])) {\n      if (!visited.has(neighbor)) {\n        visited.add(neighbor);\n        queue.push(neighbor);\n      }\n    }\n  }\n  return order;\n}\nconst graph = { A:['B','C'], B:['D','E'], C:['F'], D:[], E:[], F:[] };\nconst result = bfs(graph, 'A');",
      }).render();
    },
  }]);
})();
