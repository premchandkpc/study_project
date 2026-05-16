/**
 * flow-diagram.animation.js — Generic architecture flow diagram
 * Exposes: window.ReactViz.FlowDiagram
 *
 * Renders nodes + directed edges for architecture diagrams.
 * Used by: Context, Redux, RSC, Concurrent, Server Components topics.
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  /**
   * nodes = [{
   *   id: string,
   *   label: string,
   *   sublabel?: string,
   *   type?: 'component'|'store'|'action'|'reducer'|'selector'|'server'|'client'|'network'|'cache',
   *   active?: boolean,
   *   highlight?: boolean,
   *   dim?: boolean,
   * }]
   * edges = [{
   *   from: string,
   *   to: string,
   *   label?: string,
   *   active?: boolean,
   *   color?: string,
   * }]
   * layout = 'vertical'|'horizontal'|'grid'
   */
  window.ReactViz.FlowDiagram = {
    NODE_COLORS: {
      component: { bg:'#1a2438', border:'#58a6ff', text:'#58a6ff' },
      store:     { bg:'#2d1e0f', border:'#ffa657', text:'#ffa657' },
      action:    { bg:'#1a2d1a', border:'#3fb950', text:'#3fb950' },
      reducer:   { bg:'#2d1117', border:'#f85149', text:'#f85149' },
      selector:  { bg:'#1f1f2d', border:'#d2a8ff', text:'#d2a8ff' },
      server:    { bg:'#1a2d1a', border:'#3fb950', text:'#3fb950' },
      client:    { bg:'#1a2438', border:'#58a6ff', text:'#58a6ff' },
      network:   { bg:'#21262d', border:'#768390', text:'#a0a7b0' },
      cache:     { bg:'#2d1e0f', border:'#ffa657', text:'#ffa657' },
      context:   { bg:'#1f1a2d', border:'#d2a8ff', text:'#d2a8ff' },
      hook:      { bg:'#1a2438', border:'#79c0ff', text:'#79c0ff' },
      default:   { bg:'#161b22', border:'#30363d', text:'#e6edf3' },
    },

    render(el, nodes, edges, opts) {
      opts = opts || {};
      const layout = opts.layout || 'vertical';

      el.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'height:100%;overflow:auto';

      // Build id→node map
      const nodeMap = {};
      (nodes||[]).forEach(n => nodeMap[n.id] = n);

      if (layout === 'vertical') {
        this._renderVertical(wrap, nodes, edges, nodeMap, opts);
      } else if (layout === 'horizontal') {
        this._renderHorizontal(wrap, nodes, edges, nodeMap, opts);
      } else {
        this._renderGrid(wrap, nodes, edges, nodeMap, opts);
      }

      el.appendChild(wrap);
    },

    _nodeEl(node) {
      const c = this.NODE_COLORS[node.type||'default'] || this.NODE_COLORS.default;
      const active = node.active;
      const dim    = node.dim;
      const bg     = active ? c.bg.replace('22','44') : c.bg;
      const opacity = dim ? '0.35' : '1';
      const shadow = active ? `box-shadow:0 0 10px ${c.border}50;` : '';

      const el = document.createElement('div');
      el.style.cssText = `background:${bg};border:${active?'2px':'1px'} solid ${active?c.border:c.border+'80'};border-radius:8px;padding:8px 14px;opacity:${opacity};transition:all .3s;${shadow}min-width:100px;text-align:center`;
      el.innerHTML = `
        <div style="color:${c.text};font-weight:700;font-size:12px;font-family:monospace">${node.label}</div>
        ${node.sublabel ? `<div style="color:${c.text};opacity:0.6;font-size:10px;margin-top:2px">${node.sublabel}</div>` : ''}
        ${node.type ? `<div style="margin-top:4px"><span style="background:${c.border}20;color:${c.text};font-size:9px;padding:1px 5px;border-radius:4px">${node.type}</span></div>` : ''}
      `;
      return el;
    },

    _arrowEl(edge, dir) {
      const color = edge.active ? (edge.color||'#58a6ff') : '#30363d';
      const wrap = document.createElement('div');
      if (dir === 'v') {
        wrap.style.cssText = `display:flex;flex-direction:column;align-items:center;padding:2px 0;gap:0`;
        wrap.innerHTML = `
          <div style="width:1px;height:14px;background:${color};transition:background .3s"></div>
          ${edge.label ? `<div style="color:${color};font-size:9px;font-family:monospace;padding:0 4px;white-space:nowrap">${edge.label}</div>` : ''}
          <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:6px solid ${color};transition:border-color .3s"></div>`;
      } else {
        wrap.style.cssText = `display:flex;align-items:center;padding:0 2px;gap:0`;
        wrap.innerHTML = `
          <div style="height:1px;width:14px;background:${color}"></div>
          ${edge.label ? `<div style="color:${color};font-size:9px;font-family:monospace;padding:0 4px">${edge.label}</div>` : ''}
          <div style="width:0;height:0;border-top:4px solid transparent;border-bottom:4px solid transparent;border-left:6px solid ${color}"></div>`;
      }
      return wrap;
    },

    _renderVertical(wrap, nodes, edges, nodeMap, opts) {
      wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:0;padding:8px';
      const edgeByFrom = {};
      (edges||[]).forEach(e => {
        edgeByFrom[e.from] = edgeByFrom[e.from] || [];
        edgeByFrom[e.from].push(e);
      });

      (nodes||[]).forEach((node, i) => {
        wrap.appendChild(this._nodeEl(node));
        const outEdges = edgeByFrom[node.id] || [];
        if (outEdges.length) {
          outEdges.forEach(edge => wrap.appendChild(this._arrowEl(edge, 'v')));
        } else if (i < nodes.length - 1) {
          const phantom = document.createElement('div');
          phantom.style.cssText = 'width:1px;height:14px;background:#21262d';
          wrap.appendChild(phantom);
        }
      });
    },

    _renderHorizontal(wrap, nodes, edges, nodeMap, opts) {
      wrap.style.cssText = 'display:flex;flex-direction:row;align-items:center;gap:0;padding:16px;overflow-x:auto';
      const edgeByFrom = {};
      (edges||[]).forEach(e => {
        edgeByFrom[e.from] = edgeByFrom[e.from] || [];
        edgeByFrom[e.from].push(e);
      });

      (nodes||[]).forEach((node, i) => {
        wrap.appendChild(this._nodeEl(node));
        const outEdges = edgeByFrom[node.id] || [];
        if (outEdges.length) {
          outEdges.forEach(edge => wrap.appendChild(this._arrowEl(edge, 'h')));
        }
      });
    },

    _renderGrid(wrap, nodes, edges, nodeMap, opts) {
      const cols = opts.cols || 3;
      wrap.style.cssText = `display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;padding:8px`;
      (nodes||[]).forEach(node => wrap.appendChild(this._nodeEl(node)));
    },
  };
})();
