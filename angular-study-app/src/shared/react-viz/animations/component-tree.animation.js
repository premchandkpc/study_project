/**
 * component-tree.animation.js — React component tree renderer
 * Exposes: window.ReactViz.ComponentTree
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  var TYPE_COLORS = {
    component: '#58a6ff',
    dom:       '#768390',
    memo:      '#d2a8ff',
    context:   '#3fb950',
    provider:  '#3fb950',
    suspense:  '#f0883e',
  };

  function buildNode(node) {
    var type      = node.type || 'component';
    var color     = TYPE_COLORS[type] || '#58a6ff';
    var isRerender = !!node.rerender;
    var isSkipped  = !!(node.skipped || (type === 'memo' && !isRerender));

    var bgColor   = isRerender ? '#2d1500' : (isSkipped ? '#161b22' : '#1c2128');
    var border    = isRerender ? '#f0883e' : (isSkipped ? '#30363d' : color + '60');
    var opacity   = isSkipped ? '0.55' : '1';
    var glow      = isRerender ? ';box-shadow:0 0 10px #f0883e30' : '';

    var badges = '';
    if (type === 'memo')     badges += ' <span style="background:#d2a8ff18;color:#d2a8ff;border:1px solid #d2a8ff40;border-radius:4px;font-size:10px;padding:2px 7px">memo</span>';
    if (type === 'context')  badges += ' <span style="background:#3fb95018;color:#3fb950;border:1px solid #3fb95040;border-radius:4px;font-size:10px;padding:2px 7px">ctx</span>';
    if (type === 'provider') badges += ' <span style="background:#3fb95018;color:#3fb950;border:1px solid #3fb95040;border-radius:4px;font-size:10px;padding:2px 7px">provider</span>';
    if (type === 'suspense') badges += ' <span style="background:#f0883e18;color:#f0883e;border:1px solid #f0883e40;border-radius:4px;font-size:10px;padding:2px 7px">Suspense</span>';
    if (isRerender)          badges += ' <span style="background:#f0883e18;color:#f0883e;border:1px solid #f0883e40;border-radius:4px;font-size:10px;padding:2px 7px">re-render</span>';
    if (isSkipped)           badges += ' <span style="background:#3fb95018;color:#3fb950;border:1px solid #3fb95040;border-radius:4px;font-size:10px;padding:2px 7px">skipped</span>';

    var stateHtml = '';
    if (node.state && Object.keys(node.state).length) {
      var sPairs = Object.keys(node.state).map(function (k) {
        return '<span style="color:#79c0ff;font-size:11px">' + k + '</span>' +
               '<span style="color:#484f58">: </span>' +
               '<span style="color:#a5d6ff;font-size:11px">' + JSON.stringify(node.state[k]) + '</span>';
      }).join('&nbsp;&nbsp;&nbsp;');
      stateHtml = '<div style="margin-top:6px;padding:5px 8px;background:#0d1117;border-radius:5px;font-family:monospace;border-left:2px solid #f0883e">' + sPairs + '</div>';
    }

    var propsHtml = '';
    if (node.props && Object.keys(node.props).length) {
      var pPairs = Object.keys(node.props).map(function (k) {
        var v = node.props[k];
        return '<span style="color:#79c0ff;font-size:10px">' + k + '</span>' +
               '<span style="color:#484f58">=</span>' +
               '<span style="color:#a8d8a8;font-size:10px">' + (typeof v === 'string' ? v : JSON.stringify(v)) + '</span>';
      }).join('&nbsp;&nbsp;');
      propsHtml = '<div style="margin-top:4px;font-family:monospace;color:#768390;word-break:break-all">' + pPairs + '</div>';
    }

    var inner =
      '<div style="background:' + bgColor + ';border:1px solid ' + border + ';border-radius:7px;padding:9px 13px;opacity:' + opacity + ';transition:all .3s' + glow + '">' +
        '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:3px">' +
          '<span style="color:' + color + ';font-weight:700;font-size:13px;font-family:monospace">&lt;' + node.name + '&gt;</span>' +
          badges +
        '</div>' +
        propsHtml +
        stateHtml +
      '</div>';

    var childrenHtml = '';
    if (node.children && node.children.length) {
      childrenHtml =
        '<div style="border-left:1px solid #21262d;margin-left:10px;padding-left:10px;margin-top:5px">' +
        node.children.map(function (c) { return buildNode(c); }).join('') +
        '</div>';
    }

    return '<div style="margin-bottom:5px">' + inner + childrenHtml + '</div>';
  }

  window.ReactViz.ComponentTree = {
    render: function (el, tree) {
      if (!tree) { el.innerHTML = ''; return; }
      el.innerHTML = '<div style="overflow:auto">' + buildNode(tree) + '</div>';
    },
  };
})();
