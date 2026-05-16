(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-dijkstra",
    area: "dsa",
    title: "Dijkstra SSSP",
    tag: "Graph",
    tags: ["graph", "dijkstra", "shortest path", "weighted", "heap", "greedy"],
    concept: `Find shortest paths from one source in a graph with non-negative edge weights.

**Pattern:** Greedy shortest path with min-heap — O((V+E) log V)
**Hint:** Negative weights break the finalized-distance guarantee.
**Scenario:** Routing engine — repeatedly lock the closest unfinished node and relax outgoing roads.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'graph.dijkstra',
        time:  'O((V+E) log V)',
        space: 'O(V)',
        code: `function dijkstra(graph, start) {
  const dist = {};
  for (const node in graph) dist[node] = Infinity;
  dist[start] = 0;
  const visited = {};
  const nodes = Object.keys(graph);
  while (true) {
    let u = null;
    for (const n of nodes) {
      if (!visited[n] && (u === null || dist[n] < dist[u])) u = n;
    }
    if (u === null || dist[u] === Infinity) break;
    visited[u] = true;
    for (const [v, w] of graph[u]) {
      if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
    }
  }
  return dist;
}
const graph = {
  A: [['B', 4], ['C', 2]],
  B: [['D', 3], ['C', 1]],
  C: [['B', 1], ['D', 5]],
  D: []
};
const result = dijkstra(graph, 'A');`,
      });
    }
  }]);
})();
