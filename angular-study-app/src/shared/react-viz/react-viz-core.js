/**
 * react-viz-core.js — ReactViz panel engine
 * Exposes: window.ReactViz
 *
 * Self-contained animated panel for React concept visualizations.
 * No tracer — steps are pre-defined by each topic.
 *
 * Usage:
 *   ReactViz.panel(mount, {
 *     title, time, space,
 *     steps: [{ narration, phase, data }],
 *     renderStep: function(vizEl, codeEl, step) { ... }
 *   });
 */
(function () {
  'use strict';
  window.ReactViz = window.ReactViz || {};

  const PHASE_COLORS = {
    mount:     '#58a6ff',
    update:    '#f0883e',
    unmount:   '#f85149',
    effect:    '#3fb950',
    cleanup:   '#d2a8ff',
    render:    '#58a6ff',
    commit:    '#ffa657',
    suspend:   '#d2a8ff',
    resolve:   '#3fb950',
    begin:     '#58a6ff',
    complete:  '#3fb950',
    idle:      '#768390',
    default:   '#58a6ff',
  };

  const CSS = `
.rviz-wrap{background:#0d1117;border:1px solid #30363d;border-radius:10px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;color:#e6edf3;display:flex;flex-direction:column;height:520px}
.rviz-header{display:flex;align-items:center;gap:12px;padding:10px 16px;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}
.rviz-title{font-size:13px;font-weight:600;color:#e6edf3;flex:1}
.rviz-badge{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;letter-spacing:.4px}
.rviz-badge.time{background:#1a2d1a;color:#3fb950;border:1px solid #3fb95040}
.rviz-badge.space{background:#1a1a2d;color:#58a6ff;border:1px solid #58a6ff40}
.rviz-phase{font-size:10px;padding:2px 8px;border-radius:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;transition:all .3s}
.rviz-nar{padding:8px 16px;font-size:12px;color:#c9d1d9;background:#161b22;border-bottom:1px solid #30363d;min-height:34px;flex-shrink:0;line-height:1.5;transition:all .3s}
.rviz-body{display:flex;flex:1;overflow:hidden}
.rviz-left{width:44%;border-right:1px solid #30363d;overflow:auto;padding:12px;background:#0d1117;display:flex;flex-direction:column;gap:8px}
.rviz-right{flex:1;overflow:auto;padding:12px;background:#0d1117;display:flex;flex-direction:column;gap:8px}
.rviz-controls{display:flex;align-items:center;gap:8px;padding:8px 16px;background:#161b22;border-top:1px solid #30363d;flex-shrink:0}
.rviz-btn{background:#21262d;border:1px solid #30363d;color:#e6edf3;border-radius:6px;padding:5px 12px;font-size:11px;cursor:pointer;transition:background .15s;font-family:inherit}
.rviz-btn:hover{background:#30363d}
.rviz-btn.play{background:#1a2d1a;color:#3fb950;border-color:#3fb95060}
.rviz-btn.play:hover{background:#203d20}
.rviz-progress{flex:1;height:3px;background:#21262d;border-radius:2px;overflow:hidden}
.rviz-progress-bar{height:100%;background:#58a6ff;transition:width .3s}
.rviz-step-label{font-size:10px;color:#768390;min-width:50px;text-align:right}
`;

  function injectCSS() {
    if (document.getElementById('rviz-css')) return;
    const s = document.createElement('style');
    s.id = 'rviz-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /**
   * Create a self-contained React concept panel.
   * @param {HTMLElement} mount
   * @param {object} opts
   * @param {string}   opts.title
   * @param {string}   [opts.time]
   * @param {string}   [opts.space]
   * @param {Array}    opts.steps     — [{narration, phase, data, code}]
   * @param {Function} opts.renderStep — (vizEl, codeEl, step, stepIndex) => void
   */
  window.ReactViz.panel = function createPanel(mount, opts) {
    if (!mount) return;
    injectCSS();

    const steps = opts.steps || [];
    let current = 0;
    let timer = null;
    let playing = false;

    mount.innerHTML = `
      <div class="rviz-wrap">
        <div class="rviz-header">
          <span class="rviz-title">${opts.title || ''}</span>
          ${opts.time  ? `<span class="rviz-badge time">⏱ ${opts.time}</span>` : ''}
          ${opts.space ? `<span class="rviz-badge space">🗂 ${opts.space}</span>` : ''}
          <span class="rviz-phase" id="rviz-phase-${mount._rvizId = Math.random().toString(36).slice(2)}"></span>
        </div>
        <div class="rviz-nar" id="rviz-nar"></div>
        <div class="rviz-body">
          <div class="rviz-left" id="rviz-left"></div>
          <div class="rviz-right" id="rviz-right"></div>
        </div>
        <div class="rviz-controls">
          <button class="rviz-btn" id="rviz-prev">◀ Prev</button>
          <button class="rviz-btn play" id="rviz-play">▶ Play</button>
          <button class="rviz-btn" id="rviz-next">Next ▶</button>
          <div class="rviz-progress"><div class="rviz-progress-bar" id="rviz-bar"></div></div>
          <span class="rviz-step-label" id="rviz-label"></span>
        </div>
      </div>`;

    const wrap  = mount.querySelector('.rviz-wrap');
    const narEl = mount.querySelector('#rviz-nar');
    const phaseEl = mount.querySelector(`#rviz-phase-${mount._rvizId}`);
    const leftEl  = mount.querySelector('#rviz-left');
    const rightEl = mount.querySelector('#rviz-right');
    const barEl   = mount.querySelector('#rviz-bar');
    const lblEl   = mount.querySelector('#rviz-label');
    const playBtn = mount.querySelector('#rviz-play');
    const prevBtn = mount.querySelector('#rviz-prev');
    const nextBtn = mount.querySelector('#rviz-next');

    function paint(idx) {
      current = Math.max(0, Math.min(idx, steps.length - 1));
      const step = steps[current];
      if (!step) return;

      narEl.textContent = step.narration || '';

      const phase = step.phase || 'default';
      const color = PHASE_COLORS[phase] || PHASE_COLORS.default;
      phaseEl.textContent = phase.toUpperCase();
      phaseEl.style.background = color + '22';
      phaseEl.style.color = color;
      phaseEl.style.border = `1px solid ${color}44`;

      const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
      barEl.style.width = pct + '%';
      lblEl.textContent = `${current + 1} / ${steps.length}`;

      try {
        opts.renderStep(rightEl, leftEl, step, current);
      } catch(e) {
        rightEl.innerHTML = `<div style="color:#f85149;font-size:11px;font-family:monospace">Render error: ${e.message}</div>`;
        console.error('[ReactViz.panel]', e);
      }
    }

    function stopPlay() {
      if (timer) { clearInterval(timer); timer = null; }
      playing = false;
      playBtn.textContent = '▶ Play';
      playBtn.classList.add('play');
    }

    function startPlay() {
      playing = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.classList.remove('play');
      timer = setInterval(() => {
        if (current >= steps.length - 1) { stopPlay(); return; }
        paint(current + 1);
      }, 1400);
    }

    prevBtn.addEventListener('click', () => { stopPlay(); paint(current - 1); });
    nextBtn.addEventListener('click', () => { stopPlay(); paint(current + 1); });
    playBtn.addEventListener('click', () => { playing ? stopPlay() : startPlay(); });

    paint(0);

    return {
      goTo: (i) => { stopPlay(); paint(i); },
      destroy: () => stopPlay(),
    };
  };

  /** Utility: escape HTML */
  window.ReactViz.esc = function(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };

  /** Utility: render a code snippet block */
  window.ReactViz.codeBlock = function(code, lang) {
    return `<pre style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:11px;font-family:'Fira Code',monospace;color:#e6edf3;overflow-x:auto;margin:0;line-height:1.6">${window.ReactViz.esc(code)}</pre>`;
  };

  /** Utility: pill badge */
  window.ReactViz.pill = function(label, color) {
    color = color || '#58a6ff';
    return `<span style="background:${color}22;color:${color};border:1px solid ${color}44;border-radius:10px;padding:2px 8px;font-size:10px;font-weight:700">${label}</span>`;
  };

})();
