(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-dfs",
    area: "dsa",
    title: "DFS Traversal",
    tag: "Graph",
    tags: ["graph", "dfs", "depth first", "stack", "recursion"],
    concept: `Traverse a graph by going deep before backtracking.

**Pattern:** Stack-based depth-first search — O(V+E)
**Hint:** The stack models the recursion call stack.
**Scenario:** Dependency exploration — fully inspect one branch before moving to the next.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'graph.dfs',
        time:  'O(V+E)',
        space: 'O(V)',
        code: `const visited = {};
const order = [];
function dfs(graph, node) {
  visited[node] = true;
  order.push(node);
  for (const neighbor of graph[node]) {
    if (!visited[neighbor]) dfs(graph, neighbor);
  }
}
const graph = { 0: [1,2], 1: [0,3,4], 2: [0,5], 3: [1], 4: [1], 5: [2] };
dfs(graph, 0);
const result = order;`,
      });
    }
  }]);
})();
