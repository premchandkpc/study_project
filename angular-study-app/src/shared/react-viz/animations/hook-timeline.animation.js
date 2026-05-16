/**
 * hook-timeline.animation.js — Hook call order & phase visualizer
 * Exposes: window.ReactViz.HookTimeline
 *
 * Renders hook execution timeline:
 * - Each row = one hook
 * - Columns = lifecycle phases
 * - Active hooks glow
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  const HOOK_COLORS = {
    useState:       '#58a6ff',
    useEffect:      '#3fb950',
    useMemo:        '#d2a8ff',
    useCallback:    '#ffa657',
    useRef:         '#79c0ff',
    useContext:     '#f0883e',
    useReducer:     '#ff7b72',
    useLayoutEffect:'#f0883e',
    useId:          '#a8d8a8',
    custom:         '#768390',
  };

  /**
   * hooks = [{
   *   name: 'useState',
   *   label?: 'count',         — optional label e.g. variable name
   *   value?: any,             — current value
   *   active?: boolean,        — is this hook being "called" now?
   *   phase?: 'render'|'commit'|'effect'|'cleanup'|'idle',
   *   deps?: any[]             — dependency array
   * }]
   * renderPhase = 'render'|'commit'|'effect'|'cleanup'
   */
  window.ReactViz.HookTimeline = {
    render(el, hooks, renderPhase, renderNum) {
      renderPhase = renderPhase || 'render';
      renderNum   = renderNum   || 1;

      const PHASES = ['render', 'commit', 'effect', 'cleanup'];

      el.innerHTML = `
        <div style="font-size:10px;color:#768390;margin-bottom:8px;font-family:monospace">
          Render #${renderNum} — phase: <span style="color:#58a6ff;font-weight:700">${renderPhase}</span>
        </div>
        <div style="display:grid;grid-template-columns:130px repeat(4,1fr);gap:2px;font-size:10px">
          <div style="color:#768390;padding:4px 6px;font-weight:600">Hook</div>
          ${PHASES.map(p => `<div style="color:${p===renderPhase?'#58a6ff':'#768390'};padding:4px 6px;text-align:center;font-weight:${p===renderPhase?'700':'400'};border-bottom:${p===renderPhase?'2px solid #58a6ff':'1px solid #30363d'}">${p}</div>`).join('')}
          ${(hooks || []).map(hook => {
            const color = HOOK_COLORS[hook.name] || HOOK_COLORS.custom;
            const isActive = hook.active;
            const bg = isActive ? color + '20' : '#0d1117';
            const border = isActive ? `1px solid ${color}60` : '1px solid #21262d';

            const valueStr = hook.value !== undefined ? JSON.stringify(hook.value) : '';
            const labelStr = hook.label ? `.${hook.label}` : '';

            return `
              <div style="background:${bg};border:${border};border-radius:4px;padding:4px 6px;display:flex;align-items:center;gap:4px;font-family:monospace">
                <span style="color:${color};font-weight:700">${hook.name}</span>
                ${labelStr ? `<span style="color:#768390">${labelStr}</span>` : ''}
                ${valueStr ? `<span style="color:#a5d6ff;font-size:9px">${valueStr}</span>` : ''}
              </div>
              ${PHASES.map(p => {
                const isPhaseActive = hook.active && hook.phase === p;
                const isCurrentPhase = p === renderPhase;
                return `<div style="background:${isPhaseActive?color+'25':'isCurrentPhase?\'#161b22\':\'#0d1117\''};border:1px solid ${isPhaseActive?color+'60':'#21262d'};border-radius:4px;display:flex;align-items:center;justify-content:center">
                  ${isPhaseActive ? `<span style="color:${color};font-size:14px">●</span>` : `<span style="color:#30363d;font-size:14px">○</span>`}
                </div>`;
              }).join('')}`;
          }).join('')}
        </div>
        ${hooks && hooks.some(h=>h.deps) ? `
          <div style="margin-top:8px;font-size:10px;color:#768390">
            ${hooks.filter(h=>h.deps).map(h=>`
              <div style="margin-top:4px;font-family:monospace">
                <span style="color:${HOOK_COLORS[h.name]||'#768390'}">${h.name}</span> deps:
                <span style="color:#a5d6ff">[${h.deps.map(d=>JSON.stringify(d)).join(', ')}]</span>
              </div>`).join('')}
          </div>` : ''}`;
    },
  };
})();
