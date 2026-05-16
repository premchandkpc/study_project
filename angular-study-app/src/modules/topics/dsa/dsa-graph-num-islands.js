(function() {
  'use strict';
  window.DSA_TOPICS = (window.DSA_TOPICS || []).concat([{
    id: "dsa-graph-num-islands",
    area: "dsa",
    title: "Number of Islands",
    tag: "Graph",
    tags: ["graph", "bfs", "dfs", "grid", "flood fill", "faang", "lc200"],
    concept: `Count the number of islands in a 2D grid of 1s (land) and 0s (water).

🧒 **Kid explanation:** Look at a treasure map from above. Every connected group of land squares (1s) is one island. Your job: count the islands! Walk across the map. When you find a land square no one has visited, it's a new island — start a fire and burn all connected land (BFS/DFS). Count how many fires you started!

**Pattern:** BFS/DFS grid flood-fill — O(rows × cols)
**Key insight:** For each unvisited land cell, do BFS to mark the entire connected component as visited. Each BFS start = one island.
**Scenario:** Map analysis — count distinct connected land regions. Used in: geography apps, game maps, image segmentation.`,
    visual: function(mount) {
      window.DSAViz.topic.render(mount, {
        title: 'graph.numIslands',
        time:  'O(mn)',
        space: 'O(mn)',
        code: `function numIslands(grid) {
  let count = 0;
  function dfs(r, c) {
    if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return;
    if (grid[r][c] !== '1') return;
    grid[r][c] = '0';
    dfs(r + 1, c);
    dfs(r - 1, c);
    dfs(r, c + 1);
    dfs(r, c - 1);
  }
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') { count++; dfs(r, c); }
    }
  }
  return count;
}
const grid = [
  ['1','1','0','0','0'],
  ['1','1','0','0','0'],
  ['0','0','1','0','0'],
  ['0','0','0','1','1']
];
const result = numIslands(grid);`,
      });
    }
  }]);
})();
