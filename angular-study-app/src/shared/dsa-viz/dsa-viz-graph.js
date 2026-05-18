/**
 * DSAViz.graph — reusable graph visualizer (directed/undirected, weighted)
 *
 * API:
 *   DSAViz.graph.render(mount, config)
 *   DSAViz.graph.animate(mount, steps, opts)
 *
 * config {
 *   nodes      : { id: string|number, label?: string, x?: number, y?: number }[]
 *   edges      : { from, to, weight?: number, directed?: boolean }[]
 *   title?     : string
 *   highlights?: { [nodeId]: 'active'|'success'|'error'|'warn'|'visited'|'frontier' }
 *   edgeHi?    : { [from+'-'+to]: 'active'|'path'|'rejected' }
 *   distances? : { [nodeId]: number|'∞' }  — show dist labels (Dijkstra)
 *   stack?     : (string|number)[]
 *   queue?     : (string|number)[]
 *   visited?   : (string|number)[]
 *   narration? : string
 *   directed?  : boolean   — default false
 *   width?     : number
 *   height?    : number
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  const NODE_R = 24;

  const NODE_STATES = {
    active:   { fill: '#1f3a5f', stroke: '#58a6ff', text: '#58a6ff' },
    frontier: { fill: '#272012', stroke: '#e3b341', text: '#e3b341' },
    visited:  { fill: '#0d1f12', stroke: '#238636', text: '#56d364' },
    success:  { fill: '#0d2818', stroke: '#56d364', text: '#56d364' },
    error:    { fill: '#2d0f0f', stroke: '#f78166', text: '#f78166' },
    warn:     { fill: '#272012', stroke: '#d29922', text: '#e3b341' },
    path:     { fill: '#1a1040', stroke: '#8957e5', text: '#d2a8ff' },
    default:  { fill: '#21262d', stroke: '#30363d', text: '#cdd9e5' },
  };

  const EDGE_STATES = {
    active:   '#58a6ff',
    path:     '#e3b341',
    rejected: '#f85149',
    default:  '#30363d',
  };

  /* auto-layout nodes in circle if no x/y provided */
  function autoLayout(nodes, W, H) {
    const cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) * 0.75;
    nodes.forEach((n, i) => {
      if (n.x === undefined) {
        const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
        n._x = cx + r * Math.cos(angle);
        n._y = cy + r * Math.sin(angle);
      } else {
        n._x = n.x; n._y = n.y;
      }
    });
  }

  function edgeKey(e) { return `${e.from}-${e.to}`; }

  function render(mount, cfg) {
    const { DSAViz } = window;
    const nodes = (cfg.nodes || []).map(n => ({ ...n }));
    const edges = cfg.edges || [];
    const W = cfg.width || 520;
    const H = cfg.height || 320;
    const directed = cfg.directed ?? false;

    const container = DSAViz.makeContainer(mount, cfg.title || '');
    autoLayout(nodes, W, H);

    const nodeMap = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    const hi = cfg.highlights || {};
    const ehi = cfg.edgeHi || {};
    const distances = cfg.distances || {};

    DSAViz.ensureArrowMarker; // loaded in core
    const svg = DSAViz.makeSVG(W, H);

    /* edges */
    edges.forEach(e => {
      const fn = nodeMap[e.from], tn = nodeMap[e.to];
      if (!fn || !tn) return;
      const key = edgeKey(e);
      const rkey = `${e.to}-${e.from}`;
      const eColor = EDGE_STATES[ehi[key] || ehi[rkey]] || EDGE_STATES.default;

      /* offset for bidirectional */
      const dx = tn._x - fn._x, dy = tn._y - fn._y;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      const ox = -dy/len*4, oy = dx/len*4;

      const isActive = ehi[key] === 'active' || ehi[key] === 'path';
      const line = DSAViz.svgEl('line', {
        x1: fn._x + ox, y1: fn._y + oy,
        x2: tn._x + ox, y2: tn._y + oy,
        stroke: eColor, 'stroke-width': isActive ? 2.5 : 1.5,
        'stroke-dasharray': ehi[key] === 'rejected' ? '4 3' : 'none',
        'marker-end': directed ? `url(#arrowDefault)` : 'none',
      });
      svg.appendChild(line);

      if (e.weight !== undefined) {
        const mx = (fn._x + tn._x) / 2 + ox * 2;
        const my = (fn._y + tn._y) / 2 + oy * 2 - 8;
        const wt = DSAViz.svgEl('text', {
          x: mx, y: my, fill: eColor, 'font-size': '13',
          'text-anchor': 'middle', 'font-family': 'Inter,system-ui,sans-serif',
        });
        wt.textContent = e.weight;
        svg.appendChild(wt);
      }

      if (isActive) {
        const anim = DSAViz.svgEl('animate', { attributeName: 'stroke-opacity', from: '1', to: '0.4', dur: '0.8s', repeatCount: 'indefinite', direction: 'alternate' });
        line.appendChild(anim);
      }
    });

    /* directed marker */
    if (directed) {
      const defs = DSAViz.svgEl('defs');
      const marker = DSAViz.svgEl('marker', { id:'arrowDefault', markerWidth:'8', markerHeight:'8', refX:'28', refY:'3', orient:'auto' });
      const path = DSAViz.svgEl('path', { d:'M0,0 L6,3 L0,6 Z', fill:'#30363d' });
      marker.appendChild(path); defs.appendChild(marker);
      svg.prepend(defs);
    }

    /* nodes */
    nodes.forEach(n => {
      const s = NODE_STATES[hi[n.id]] || NODE_STATES.default;
      const g = DSAViz.svgEl('g');

      /* pulse ring for active */
      if (hi[n.id] === 'active') {
        const ring = DSAViz.svgEl('circle', { cx: n._x, cy: n._y, r: NODE_R + 5,
          fill: 'none', stroke: s.stroke, 'stroke-width': 1.5, opacity: '0.3' });
        const anim = DSAViz.svgEl('animate', { attributeName: 'r', from: NODE_R+2, to: NODE_R+12, dur:'1.2s', repeatCount:'indefinite' });
        const animOp = DSAViz.svgEl('animate', { attributeName: 'opacity', from:'0.4', to:'0', dur:'1.2s', repeatCount:'indefinite' });
        ring.appendChild(anim); ring.appendChild(animOp); g.appendChild(ring);
      }

      const circle = DSAViz.svgEl('circle', { cx: n._x, cy: n._y, r: NODE_R,
        fill: s.fill, stroke: s.stroke, 'stroke-width': 2 });
      const label = DSAViz.svgEl('text', { x: n._x, y: n._y,
        fill: s.text, 'font-size': '13', 'font-weight': '700',
        'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Inter,JetBrains Mono,system-ui' });
      label.textContent = n.label ?? n.id;
      g.appendChild(circle); g.appendChild(label);

      /* distance label below */
      if (distances[n.id] !== undefined) {
        const dist = DSAViz.svgEl('text', { x: n._x, y: n._y + NODE_R + 14,
          fill: '#e3b341', 'font-size': '13', 'text-anchor': 'middle', 'font-family': 'Inter,system-ui,sans-serif' });
        dist.textContent = `d:${distances[n.id]}`;
        g.appendChild(dist);
      }

      svg.appendChild(g);
    });

    container.appendChild(svg);

    /* visited / stack / queue panels */
    const panels = [];
    if (cfg.visited?.length) panels.push(makeChipPanel('Visited', cfg.visited, '#56d364'));
    if (cfg.queue?.length)   panels.push(makeChipPanel('Queue (BFS)', cfg.queue, '#e3b341'));
    if (cfg.stack?.length)   panels.push(makeChipPanel('Stack (DFS)', cfg.stack, '#8957e5'));
    if (panels.length) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;';
      panels.forEach(p => row.appendChild(p));
      container.appendChild(row);
    }

    if (cfg.narration) container.appendChild(DSAViz.makeNarration(cfg.narration));
  }

  function makeChipPanel(label, items, color) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:#21262d;border:1px solid #30363d;border-radius:8px;padding:8px 12px;`;
    const lbl = document.createElement('div');
    lbl.style.cssText = `font-size:13px;font-family:'Inter',system-ui,sans-serif;color:${color};font-weight:700;margin-bottom:6px;`;
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const chips = document.createElement('div');
    chips.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;';
    items.forEach((v, i) => {
      const c = document.createElement('span');
      c.style.cssText = `background:${i===0?color+'33':'transparent'};border:1px solid ${color}66;
        color:${color};font-size:13px;padding:2px 7px;border-radius:12px;font-family:'Inter',system-ui,sans-serif;`;
      c.textContent = v;
      chips.appendChild(c);
    });
    wrap.appendChild(chips);
    return wrap;
  }

  function animate(mount, steps, opts = {}) {
    const { DSAViz } = window;
    const nar = DSAViz.makeNarration('Press ▶▶ or Play to start');
    mount.innerHTML = '';
    mount.appendChild(nar);
    const vizDiv = document.createElement('div');
    mount.appendChild(vizDiv);

    const ctrl = DSAViz.makeStepCtrl(steps, (step, idx) => {
      if (!step) { vizDiv.innerHTML = ''; nar.update('Reset'); return; }
      render(vizDiv, step);
      nar.update(step.narration || `Step ${idx+1}`);
      ctrl._updateCtr?.();
    });

    mount.appendChild(DSAViz.makeControlBar(ctrl));
    return ctrl;
  }

  window.DSAViz.graph = { render, animate };
})();
