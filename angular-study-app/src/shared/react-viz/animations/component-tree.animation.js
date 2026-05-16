/**
 * component-tree.animation.js — React component tree renderer
 * Exposes: window.ReactViz.ComponentTree
 *
 * Renders an animated React component hierarchy with:
 * - Re-render highlights (orange flash)
 * - Props/state display
 * - Memo boundary markers
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  /**
   * tree = {
   *   name: string,
   *   type?: 'component'|'dom'|'memo'|'context'|'provider'|'suspense',
   *   state?: { [key]: value },
   *   props?: { [key]: value },
   *   rerender?: boolean,
   *   memoized?: boolean,
   *   skipped?: boolean,
   *   children?: tree[]
   * }
   * opts = { highlight?: string[], dim?: string[] }
   */
  window.ReactViz.ComponentTree = {
    render(el, tree, opts) {
      opts = opts || {};
      el.innerHTML = '';
      const root = document.createElement('div');
      root.style.cssText = 'padding:4px;overflow:auto;height:100%';
      root.appendChild(this._node(tree, 0, opts));
      el.appendChild(root);
    },

    _node(node, depth, opts) {
      const wrap = document.createElement('div');
      wrap.style.cssText = `margin-left:${depth * 16}px;margin-bottom:4px`;

      const isRerender = node.rerender;
      const isSkipped  = node.skipped || node.memoized && !isRerender;
      const type = node.type || 'component';

      const TYPE_COLORS = {
        component: '#58a6ff',
        dom:       '#768390',
        memo:      '#d2a8ff',
        context:   '#3fb950',
        provider:  '#3fb950',
        suspense:  '#f0883e',
      };

      const baseColor = TYPE_COLORS[type] || '#58a6ff';
      const bgColor   = isRerender ? '#3d1a00' : isSkipped ? '#161b22' : '#1c2128';
      const border    = isRerender ? '#f0883e' : isSkipped ? '#30363d' : baseColor + '55';
      const opacity   = isSkipped ? '0.5' : '1';

      let badge = '';
      if (type === 'memo')     badge = `<span style="background:#d2a8ff22;color:#d2a8ff;border:1px solid #d2a8ff44;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">memo</span>`;
      if (type === 'context')  badge = `<span style="background:#3fb95022;color:#3fb950;border:1px solid #3fb95044;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">ctx</span>`;
      if (type === 'provider') badge = `<span style="background:#3fb95022;color:#3fb950;border:1px solid #3fb95044;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">provider</span>`;
      if (type === 'suspense') badge = `<span style="background:#f0883e22;color:#f0883e;border:1px solid #f0883e44;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">Suspense</span>`;
      if (isRerender)          badge += `<span style="background:#f0883e22;color:#f0883e;border:1px solid #f0883e44;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">🔄 re-render</span>`;
      if (isSkipped)           badge += `<span style="background:#3fb95022;color:#3fb950;border:1px solid #3fb95044;border-radius:4px;font-size:9px;padding:1px 5px;margin-left:4px">✓ skipped</span>`;

      let stateHtml = '';
      if (node.state && Object.keys(node.state).length) {
        const pairs = Object.entries(node.state).map(([k,v]) =>
          `<span style="color:#79c0ff">${k}</span><span style="color:#768390">:</span> <span style="color:#a5d6ff">${JSON.stringify(v)}</span>`
        ).join('<br>');
        stateHtml = `<div style="margin-top:4px;padding:4px 6px;background:#0d1117;border-radius:4px;font-size:10px;font-family:monospace;border-left:2px solid #f0883e">${pairs}</div>`;
      }

      let propsHtml = '';
      if (node.props && Object.keys(node.props).length) {
        const pairs = Object.entries(node.props).map(([k,v]) =>
          `<span style="color:#79c0ff">${k}</span><span style="color:#768390">=</span><span style="color:#a8d8a8">${JSON.stringify(v)}</span>`
        ).join('  ');
        propsHtml = `<div style="margin-top:2px;font-size:9px;font-family:monospace;color:#768390">${pairs}</div>`;
      }

      wrap.innerHTML = `
        <div style="background:${bgColor};border:1px solid ${border};border-radius:6px;padding:6px 10px;opacity:${opacity};transition:all .3s">
          <div style="display:flex;align-items:center;gap:4px">
            <span style="color:${baseColor};font-weight:700;font-size:12px;font-family:monospace">&lt;${node.name}&gt;</span>
            ${badge}
          </div>
          ${propsHtml}
          ${stateHtml}
        </div>`;

      if (node.children && node.children.length) {
        const childWrap = document.createElement('div');
        childWrap.style.cssText = `border-left:1px solid #30363d;margin-left:8px;padding-left:8px;margin-top:4px`;
        node.children.forEach(child => {
          childWrap.appendChild(this._node(child, 0, opts));
        });
        wrap.appendChild(childWrap);
      }

      return wrap;
    },
  };
})();
