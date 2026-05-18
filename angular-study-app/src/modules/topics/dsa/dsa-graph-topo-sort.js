(function() {
  "use strict";
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-topo-sort",
    area: "dsa",
    title: "Course Schedule (Topo Sort)",
    tag: "Graph",
    tags: ["graph", "topological sort", "BFS", "Kahn's algorithm", "DAG", "faang", "lc207"],
    concept: `Given n courses and prerequisite pairs, can you finish all courses? Return a valid order.

🧒 **Kid explanation:** Some courses need you to take other courses first. Math before Calculus, Reading before Literature. Imagine each course as a person at a door — they'll only enter once ALL their prerequisites have gone first. Count how many people are blocking each door (in-degree). Start with doors that have zero blockers. As people enter, they unblock more doors!

**Pattern:** Kahn's BFS topological sort — O(V + E)
**Key insight:** in-degree = number of prerequisites. Process nodes with in-degree 0 first. Each time you process a node, reduce in-degree of its dependents. If any node never reaches 0, there's a cycle.
**Scenario:** Build system — compile dependencies before the module that needs them. Package manager dependency resolution.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: "graph.topoSort",
        time:  "O(V+E)",
        space: "O(V)",
        code: `function canFinish(numCourses, prerequisites) {
  const adj = Array.from({ length: numCourses }, () => []);
  for (const [a, b] of prerequisites) adj[b].push(a);
  const visited = new Array(numCourses).fill(0);
  function dfs(node) {
    if (visited[node] === 1) return false;
    if (visited[node] === 2) return true;
    visited[node] = 1;
    for (const nei of adj[node]) {
      if (!dfs(nei)) return false;
    }
    visited[node] = 2;
    return true;
  }
  for (let i = 0; i < numCourses; i++) {
    if (!dfs(i)) return false;
  }
  return true;
}
const numCourses = 4;
const prerequisites = [[1,0],[2,0],[3,1],[3,2]];
const result = canFinish(numCourses, prerequisites);`,
      });
    }
  }]);
})();
