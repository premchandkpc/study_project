/**
 * graph.animation.js — reusable graph animation primitives
 * Exposes: window.DSA.GraphAnimation
 *
 * Used by: GraphBFSProblem, GraphDFSProblem, GraphDijkstraProblem, TopoSortProblem
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  const GraphColors = {
    UNVISITED:  '#21262d',
    VISITING:   '#e3b341',   // yellow — currently processing
    VISITED:    '#1f6feb',   // blue — fully explored
    PATH:       '#56d364',   // green — shortest path / result
    SOURCE:     '#a78bfa',   // purple — source node
    TARGET:     '#f85149',   // red — target node
    QUEUE:      '#f0883e',   // orange — in queue / frontier
    EDGE_ACTIVE:'#e3b341',
    EDGE_TREE:  '#1f6feb',
    EDGE_DONE:  '#30363d',
    WEIGHT:     '#8b949e',
  };

  const GraphAnimation = {
    Colors: GraphColors,

    /**
     * Render a graph as SVG node-edge diagram.
     * @param {HTMLElement} el
     * @param {object}      graph  — { nodes: [{id, label, x?, y?}], edges: [{from, to, weight?}] }
     * @param {object}      state  — { visited: Set, queue: [], current, path: [] }
     */
    render(el, graph, state = {}) {
      const { nodes = [], edges = [] } = graph;
      const { visited = new Set(), current = null, inQueue = new Set(), path = new Set() } = state;
      const W = el.clientWidth || 400;
      const H = 200;

      // Auto-layout in circle if no coords provided
      const positioned = nodes.map((n, i) => {
        if (n.x !== undefined) return n;
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
        const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.36;
        return { ...n, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
      });
      const nodeMap = new Map(positioned.map(n => [n.id, n]));

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.style.cssText = `width:100%;height:${H}px;overflow:visible;`;

      // Edges
      edges.forEach(e => {
        const from = nodeMap.get(e.from);
        const to   = nodeMap.get(e.to);
        if (!from || !to) return;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const isPath = path.has(e.from + '->' + e.to) || path.has(e.to + '->' + e.from);
        line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
        line.setAttribute('x2', to.x);   line.setAttribute('y2', to.y);
        line.setAttribute('stroke', isPath ? GraphColors.PATH : GraphColors.EDGE_DONE);
        line.setAttribute('stroke-width', isPath ? '3' : '1.5');
        svg.appendChild(line);

        // Weight label
        if (e.weight !== undefined) {
          const mx = (from.x + to.x) / 2;
          const my = (from.y + to.y) / 2;
          const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          txt.setAttribute('x', mx); txt.setAttribute('y', my - 4);
          txt.setAttribute('fill', GraphColors.WEIGHT);
          txt.setAttribute('font-size', '10');
          txt.setAttribute('text-anchor', 'middle');
          txt.setAttribute('font-family', 'JetBrains Mono, monospace');
          txt.textContent = String(e.weight);
          svg.appendChild(txt);
        }
      });

      // Nodes
      positioned.forEach(n => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y); circle.setAttribute('r', '16');

        let fill = GraphColors.UNVISITED;
        if (path.has(n.id))      fill = GraphColors.PATH;
        else if (n.id === current) fill = GraphColors.VISITING;
        else if (inQueue.has(n.id)) fill = GraphColors.QUEUE;
        else if (visited.has(n.id)) fill = GraphColors.VISITED;

        circle.setAttribute('fill', fill + (fill.length === 7 ? '33' : ''));
        circle.setAttribute('stroke', fill === GraphColors.UNVISITED ? '#30363d' : fill);
        circle.setAttribute('stroke-width', n.id === current ? '3' : '1.5');
        g.appendChild(circle);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', n.x); label.setAttribute('y', n.y + 4);
        label.setAttribute('fill', '#e6edf3');
        label.setAttribute('font-size', '12'); label.setAttribute('font-weight', '700');
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-family', 'JetBrains Mono, monospace');
        label.textContent = n.label || n.id;
        g.appendChild(label);

        svg.appendChild(g);
      });

      el.innerHTML = '';
      el.appendChild(svg);
    },

    /**
     * Build graph state from a tracer step's variables.
     * Looks for common variable names used in BFS/DFS/Dijkstra.
     */
    stateFromStep(step) {
      const vars = step.variables || {};
      return {
        current:  vars.node ?? vars.curr ?? vars.u ?? vars.v ?? null,
        visited:  new Set(vars.visited ? Object.keys(vars.visited) : []),
        inQueue:  new Set(vars.queue ? (Array.isArray(vars.queue) ? vars.queue : []) : []),
        path:     new Set(vars.path   ? (Array.isArray(vars.path)  ? vars.path  : []) : []),
      };
    },
  };

  window.DSA.GraphAnimation = GraphAnimation;
})();
