/**
 * hook-timeline.animation.js — Hook call order & phase visualizer
 * Exposes: window.ReactViz.HookTimeline
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  var HOOK_COLORS = {
    useState:        '#58a6ff',
    useEffect:       '#3fb950',
    useMemo:         '#d2a8ff',
    useCallback:     '#ffa657',
    useRef:          '#79c0ff',
    useContext:      '#f0883e',
    useReducer:      '#ff7b72',
    useLayoutEffect: '#f0883e',
    useId:           '#a8d8a8',
    custom:          '#768390',
  };

  window.ReactViz.HookTimeline = {
    render: function (el, hooks, renderPhase, renderNum) {
      renderPhase = renderPhase || 'render';
      renderNum   = renderNum   || 1;

      var PHASES = ['render', 'commit', 'effect', 'cleanup'];
      var self = this;

      var headerCells = PHASES.map(function (p) {
        var active = p === renderPhase;
        return '<div style="color:' + (active ? '#58a6ff' : '#768390') + ';padding:6px 4px;text-align:center;font-weight:' + (active ? '700' : '400') + ';font-size:11px;border-bottom:' + (active ? '2px solid #58a6ff' : '1px solid #30363d') + '">' + p + '</div>';
      }).join('');

      var rows = (hooks || []).map(function (hook) {
        var color  = HOOK_COLORS[hook.name] || HOOK_COLORS.custom;
        var isActive = !!hook.active;
        var bg     = isActive ? color + '18' : '#0d1117';
        var border = isActive ? '1px solid ' + color + '50' : '1px solid #21262d';
        var valueStr = hook.value !== undefined ? JSON.stringify(hook.value) : '';
        var labelStr = hook.label ? ('.' + hook.label) : '';

        var hookCell = '<div style="background:' + bg + ';border:' + border + ';border-radius:4px;padding:5px 8px;display:flex;align-items:center;gap:6px;font-family:monospace">' +
          '<span style="color:' + color + ';font-weight:700;font-size:12px">' + hook.name + '</span>' +
          (labelStr ? '<span style="color:#768390;font-size:11px">' + labelStr + '</span>' : '') +
          (valueStr ? '<span style="color:#a5d6ff;font-size:10px;margin-left:auto">' + valueStr + '</span>' : '') +
          '</div>';

        var phaseCells = PHASES.map(function (p) {
          var isPhaseActive  = isActive && hook.phase === p;
          var isCurrentPhase = p === renderPhase;
          var cellBg = isPhaseActive ? (color + '25') : (isCurrentPhase ? '#161b22' : '#0d1117');
          var cellBorder = '1px solid ' + (isPhaseActive ? color + '50' : '#21262d');
          return '<div style="background:' + cellBg + ';border:' + cellBorder + ';border-radius:4px;display:flex;align-items:center;justify-content:center;min-height:32px">' +
            (isPhaseActive
              ? '<span style="color:' + color + ';font-size:16px">●</span>'
              : '<span style="color:#2d333b;font-size:16px">○</span>') +
            '</div>';
        }).join('');

        return hookCell + phaseCells;
      }).join('');

      var depsHtml = '';
      if (hooks && hooks.some(function (h) { return h.deps; })) {
        depsHtml = '<div style="margin-top:10px;padding:8px 10px;background:#161b22;border-radius:6px;border:1px solid #30363d">' +
          '<div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600;letter-spacing:.5px">DEPENDENCY ARRAYS</div>' +
          hooks.filter(function (h) { return h.deps; }).map(function (h) {
            var c = HOOK_COLORS[h.name] || '#768390';
            return '<div style="font-family:monospace;font-size:11px;margin-bottom:4px">' +
              '<span style="color:' + c + ';font-weight:700">' + h.name + '</span>' +
              '<span style="color:#768390"> deps: </span>' +
              '<span style="color:#a5d6ff">[' + h.deps.map(function (d) { return JSON.stringify(d); }).join(', ') + ']</span>' +
              '</div>';
          }).join('') +
          '</div>';
      }

      el.innerHTML =
        '<div style="font-size:11px;color:#768390;margin-bottom:10px;font-family:monospace">' +
          'Render <span style="color:#ffa657;font-weight:700">#' + renderNum + '</span>' +
          ' &nbsp;·&nbsp; phase: <span style="color:#58a6ff;font-weight:700">' + renderPhase + '</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:150px repeat(4,1fr);gap:3px">' +
          '<div style="color:#768390;padding:6px 8px;font-size:11px;font-weight:600;border-bottom:1px solid #30363d">Hook</div>' +
          headerCells +
          rows +
        '</div>' +
        depsHtml;
    },
  };
})();
