/**
 * DSAViz.tree — reusable binary/N-ary tree visualizer (SVG)
 *
 * API:
 *   DSAViz.tree.render(mount, config)
 *   DSAViz.tree.animate(mount, steps, opts)
 *
 * config {
 *   root       : TreeNode  { val, left?, right?, children?[] }
 *   title?     : string
 *   highlights?: { [val]: 'active'|'success'|'error'|'warn'|'visited' }
 *   path?      : number[]  — highlight edges along this value path
 *   stack?     : number[]  — show DFS stack panel
 *   queue?     : number[]  — show BFS queue panel
 *   narration? : string
 *   showValues?: boolean   — show null for missing children (default false)
 * }
 *
 * TreeNode: { val: any, left?: TreeNode, right?: TreeNode, children?: TreeNode[] }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  const NODE_R = 22;
  const H_GAP = 56;
  const V_GAP = 64;

  const STATE_FILL = {
    active:  { fill: '#1f3a5f', stroke: '#58a6ff', text: '#58a6ff' },
    success: { fill: '#0d2818', stroke: '#56d364', text: '#56d364' },
    error:   { fill: '#2d0f0f', stroke: '#f78166', text: '#f78166' },
    warn:    { fill: '#272012', stroke: '#e3b341', text: '#e3b341' },
    visited: { fill: '#21262d', stroke: '#8957e5', text: '#8957e5' },
    current: { fill: '#1f3a5f', stroke: '#1f6feb', text: '#ffffff' },
    default: { fill: '#21262d', stroke: '#30363d', text: '#cdd9e5' },
  };

  /* assign x/y coords via in-order traversal (binary) */
  function layoutBinary(node, depth = 0, counter = { x: 0 }) {
    if (!node) return;
    layoutBinary(node.left, depth + 1, counter);
    node._x = counter.x * (NODE_R * 2 + H_GAP);
    node._y = depth * V_GAP + NODE_R + 10;
    counter.x++;
    layoutBinary(node.right, depth + 1, counter);
  }

  /* assign x/y for N-ary tree */
  function layoutNary(node, depth = 0, counter = { x: 0 }) {
    if (!node) return;
    const children = node.children || [];
    if (!children.length) {
      node._x = counter.x * (NODE_R * 2 + H_GAP * 0.7);
      node._y = depth * V_GAP + NODE_R + 10;
      counter.x++;
    } else {
      const startX = counter.x;
      children.forEach(c => layoutNary(c, depth + 1, counter));
      const endX = counter.x - 1;
      node._x = ((startX + endX) / 2) * (NODE_R * 2 + H_GAP * 0.7);
      node._y = depth * V_GAP + NODE_R + 10;
    }
  }

  function collectNodes(node, arr = []) {
    if (!node) return arr;
    arr.push(node);
    if (node.left) collectNodes(node.left, arr);
    if (node.right) collectNodes(node.right, arr);
    (node.children || []).forEach(c => collectNodes(c, arr));
    return arr;
  }

  function render(mount, cfg) {
    const { DSAViz } = window;
    const root = cfg.root;
    if (!root) { mount.innerHTML = '<div style="color:#f85149;padding:12px">No tree data</div>'; return; }

    const container = DSAViz.makeContainer(mount, cfg.title || '');
    const isNary = !!(root.children);
    if (isNary) layoutNary(root); else layoutBinary(root);

    const nodes = collectNodes(root);
    const maxX = Math.max(...nodes.map(n => n._x)) + NODE_R + 20;
    const maxY = Math.max(...nodes.map(n => n._y)) + NODE_R + 20;

    const svg = DSAViz.makeSVG(Math.max(maxX, 300), Math.max(maxY, 120));
    svg.style.maxWidth = '100%';

    const hi = cfg.highlights || {};
    const pathSet = new Set(cfg.path || []);

    /* edges first (behind nodes) */
    nodes.forEach(node => {
      const drawEdge = (child) => {
        if (!child) return;
        const isPathEdge = pathSet.has(node.val) && pathSet.has(child.val);
        const line = DSAViz.svgEl('line', {
          x1: node._x, y1: node._y,
          x2: child._x, y2: child._y,
          stroke: isPathEdge ? '#e3b341' : '#30363d',
          'stroke-width': isPathEdge ? 2.5 : 1.5,
          'stroke-dasharray': isPathEdge ? 'none' : 'none',
        });
        svg.appendChild(line);
      };
      if (node.left) drawEdge(node.left);
      if (node.right) drawEdge(node.right);
      (node.children || []).forEach(drawEdge);
    });

    /* nodes */
    nodes.forEach(node => {
      const s = STATE_FILL[hi[node.val]] || STATE_FILL.default;
      const g = DSAViz.svgEl('g', { style: 'cursor:default' });

      const circle = DSAViz.svgEl('circle', {
        cx: node._x, cy: node._y, r: NODE_R,
        fill: s.fill, stroke: s.stroke, 'stroke-width': 2,
      });
      const label = DSAViz.svgEl('text', {
        x: node._x, y: node._y,
        fill: s.text, 'font-size': '13', 'font-weight': '700',
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-family': 'monospace',
      });
      label.textContent = node.val;

      /* pulse for active */
      if (hi[node.val] === 'active' || hi[node.val] === 'current') {
        const pulse = DSAViz.svgEl('circle', {
          cx: node._x, cy: node._y, r: NODE_R + 4,
          fill: 'none', stroke: s.stroke, 'stroke-width': 1.5, opacity: '0.4',
        });
        const anim = DSAViz.svgEl('animate', {
          attributeName: 'r', from: NODE_R + 2, to: NODE_R + 10,
          dur: '1.2s', repeatCount: 'indefinite',
        });
        const animOp = DSAViz.svgEl('animate', {
          attributeName: 'opacity', from: '0.4', to: '0',
          dur: '1.2s', repeatCount: 'indefinite',
        });
        pulse.appendChild(anim);
        pulse.appendChild(animOp);
        g.appendChild(pulse);
      }

      g.appendChild(circle);
      g.appendChild(label);
      svg.appendChild(g);
    });

    container.appendChild(svg);

    /* stack / queue side panel */
    if (cfg.stack || cfg.queue) {
      const panel = document.createElement('div');
      panel.style.cssText = `display:flex;gap:16px;margin-top:10px;flex-wrap:wrap;`;
      if (cfg.stack) panel.appendChild(makeListPanel('Stack (DFS)', cfg.stack, '#8957e5'));
      if (cfg.queue) panel.appendChild(makeListPanel('Queue (BFS)', cfg.queue, '#e3b341'));
      container.appendChild(panel);
    }

    if (cfg.narration) {
      const nar = DSAViz.makeNarration(cfg.narration);
      container.appendChild(nar);
    }
  }

  function makeListPanel(label, items, color) {
    const wrap = document.createElement('div');
    wrap.style.cssText = `background:#21262d;border:1px solid #30363d;border-radius:8px;padding:8px 12px;min-width:120px;`;
    const lbl = document.createElement('div');
    lbl.style.cssText = `font-size:11px;color:${color};font-weight:700;margin-bottom:6px;letter-spacing:.05em;`;
    lbl.textContent = label;
    wrap.appendChild(lbl);
    items.forEach((v, i) => {
      const it = document.createElement('div');
      it.style.cssText = `font-size:13px;color:#cdd9e5;padding:2px 6px;border-radius:4px;
        background:${i===0?color+'22':'transparent'};`;
      it.textContent = v;
      wrap.appendChild(it);
    });
    if (!items.length) {
      const empty = document.createElement('div');
      empty.style.cssText = `font-size:11px;color:#768390;`;
      empty.textContent = 'empty';
      wrap.appendChild(empty);
    }
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
      nar.update(step.narration || `Step ${idx+1} / ${steps.length}`);
      ctrl._updateCtr?.();
    });

    mount.appendChild(DSAViz.makeControlBar(ctrl));
    return ctrl;
  }

  window.DSAViz.tree = { render, animate };
})();
