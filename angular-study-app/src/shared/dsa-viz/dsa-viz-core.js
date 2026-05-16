/**
 * DSAViz.core — shared utilities for all DSA visual components
 * Usage: window.DSAViz.core.*
 * Load this FIRST before any other dsa-viz-*.js
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  /* ── COLORS ─────────────────────────────────────────────────── */
  const C = {
    bg:       '#161b22',
    surface:  '#21262d',
    border:   '#30363d',
    text:     '#cdd9e5',
    muted:    '#768390',
    active:   '#1f6feb',
    activeHi: '#58a6ff',
    success:  '#238636',
    successHi:'#56d364',
    error:    '#da3633',
    errorHi:  '#f78166',
    warn:     '#d29922',
    warnHi:   '#e3b341',
    accent:   '#8957e5',
    ptr:      '#e3b341',   /* pointer / highlight color */
    compare:  '#f78166',   /* comparison flash */
    swap:     '#56d364',   /* swap flash */
  };
  window.DSAViz.C = C;

  /* ── STEP CONTROLLER ────────────────────────────────────────── */
  function makeStepCtrl(steps, onRender) {
    let idx = -1, timer = null, speed = 1200;
    const ctrl = {
      steps,
      get current() { return idx; },
      total() { return steps.length; },
      step() {
        if (idx < steps.length - 1) { idx++; onRender(steps[idx], idx, steps.length); }
      },
      prev() {
        if (idx > 0) { idx--; onRender(steps[idx], idx, steps.length); }
      },
      goto(i) {
        idx = Math.max(0, Math.min(i, steps.length - 1));
        onRender(steps[idx], idx, steps.length);
      },
      play() {
        if (timer) return;
        timer = setInterval(() => {
          if (idx >= steps.length - 1) { ctrl.stop(); return; }
          ctrl.step();
        }, speed);
      },
      stop() { clearInterval(timer); timer = null; },
      reset() {
        ctrl.stop(); idx = -1;
        onRender(null, -1, steps.length);
      },
      setSpeed(ms) { speed = ms; if (timer) { ctrl.stop(); ctrl.play(); } },
    };
    return ctrl;
  }
  window.DSAViz.makeStepCtrl = makeStepCtrl;

  /* ── CONTROL BAR ────────────────────────────────────────────── */
  function makeControlBar(ctrl) {
    const bar = document.createElement('div');
    bar.style.cssText = `display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding:8px 0;margin-top:8px;`;

    const btn = (label, action, title='') => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.style.cssText = `background:#21262d;color:#cdd9e5;border:1px solid #30363d;
        padding:5px 12px;border-radius:6px;cursor:pointer;font-size:13px;
        font-family:'JetBrains Mono',monospace;transition:background .15s;`;
      b.onmouseenter = () => b.style.background = '#30363d';
      b.onmouseleave = () => b.style.background = '#21262d';
      b.onclick = action;
      return b;
    };

    const ctr = document.createElement('span');
    ctr.style.cssText = `margin-left:auto;font-size:12px;color:#768390;font-family:monospace;min-width:80px;text-align:right;`;
    ctr.textContent = `0 / ${ctrl.total()}`;

    const speedSel = document.createElement('select');
    speedSel.style.cssText = `background:#21262d;color:#cdd9e5;border:1px solid #30363d;border-radius:6px;padding:4px 6px;font-size:12px;cursor:pointer;`;
    [['Slow',2000],['Normal',1200],['Fast',500],['Turbo',150]].forEach(([l,v]) => {
      const o = document.createElement('option');
      o.value = v; o.textContent = l; if (v === 1200) o.selected = true;
      speedSel.appendChild(o);
    });
    speedSel.onchange = () => ctrl.setSpeed(+speedSel.value);

    bar.append(
      btn('↺ Reset', () => { ctrl.reset(); ctr.textContent = `0 / ${ctrl.total()}`; }),
      btn('◀', () => { ctrl.stop(); ctrl.prev(); ctr.textContent = `${ctrl.current+1} / ${ctrl.total()}`; }, 'Previous step'),
      btn('▶ Play', () => { ctrl.play(); }, 'Auto-play'),
      btn('⏸', () => ctrl.stop(), 'Pause'),
      btn('▶▶', () => { ctrl.stop(); ctrl.step(); ctr.textContent = `${ctrl.current+1} / ${ctrl.total()}`; }, 'Next step'),
      speedSel,
      ctr,
    );

    ctrl._updateCtr = () => { ctr.textContent = `${Math.max(0,ctrl.current+1)} / ${ctrl.total()}`; };
    return bar;
  }
  window.DSAViz.makeControlBar = makeControlBar;

  /* ── NARRATION BAR ──────────────────────────────────────────── */
  function makeNarration(text = '') {
    const el = document.createElement('div');
    el.style.cssText = `background:#21262d;border-left:3px solid #1f6feb;padding:10px 14px;
      font-size:14px;color:#cdd9e5;font-family:'Nunito',sans-serif;border-radius:0 6px 6px 0;
      min-height:42px;margin:8px 0;line-height:1.5;transition:opacity .2s;`;
    el.textContent = text;
    el.update = (msg, color = '#1f6feb') => {
      el.style.borderLeftColor = color;
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = msg; el.style.opacity = '1'; }, 120);
    };
    return el;
  }
  window.DSAViz.makeNarration = makeNarration;

  /* ── COMPLEXITY BADGE ───────────────────────────────────────── */
  function makeComplexityBadge(timeStr, spaceStr) {
    const el = document.createElement('div');
    el.style.cssText = `display:inline-flex;gap:10px;align-items:center;font-size:12px;
      font-family:'JetBrains Mono',monospace;padding:4px 10px;background:#21262d;
      border:1px solid #30363d;border-radius:6px;`;
    el.innerHTML = `<span style="color:#768390">Time:</span><span style="color:#e3b341">${timeStr}</span>
      <span style="color:#768390">Space:</span><span style="color:#56d364">${spaceStr}</span>`;
    el.update = (ops) => {
      const opEl = el.querySelector('.ops-live');
      if (opEl) opEl.textContent = `ops: ${ops}`;
    };
    return el;
  }
  window.DSAViz.makeComplexityBadge = makeComplexityBadge;

  /* ── FLASH UTIL ─────────────────────────────────────────────── */
  function flash(el, color = '#e3b341', ms = 400) {
    const orig = el.style.background;
    el.style.transition = 'background 0.1s';
    el.style.background = color;
    setTimeout(() => { el.style.background = orig; }, ms);
  }
  window.DSAViz.flash = flash;

  /* ── TYPEWRITER ─────────────────────────────────────────────── */
  function typewrite(el, text, speed = 25) {
    el.textContent = '';
    let i = 0;
    const t = setInterval(() => {
      el.textContent += text[i++];
      if (i >= text.length) clearInterval(t);
    }, speed);
  }
  window.DSAViz.typewrite = typewrite;

  /* ── SVG FACTORY ────────────────────────────────────────────── */
  function makeSVG(w, h) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.style.cssText = `display:block;max-width:100%;overflow:visible;`;
    return svg;
  }

  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function svgArrow(svg, x1, y1, x2, y2, color = '#e3b341', label = '', dashed = false) {
    const g = svgEl('g');
    const line = svgEl('line', { x1, y1, x2, y2, stroke: color, 'stroke-width': 2,
      'stroke-dasharray': dashed ? '5 3' : 'none',
      'marker-end': `url(#arr-${color.replace('#','')})` });
    g.appendChild(line);
    if (label) {
      const mid = { x: (x1+x2)/2, y: (y1+y2)/2 - 8 };
      const t = svgEl('text', { x: mid.x, y: mid.y, fill: color, 'font-size': '11',
        'text-anchor': 'middle', 'font-family': 'monospace' });
      t.textContent = label;
      g.appendChild(t);
    }
    svg.appendChild(g);
    return g;
  }

  function ensureArrowMarker(svg, color = '#e3b341') {
    const id = `arr-${color.replace('#','')}`;
    if (svg.querySelector(`#${id}`)) return;
    let defs = svg.querySelector('defs');
    if (!defs) { defs = svgEl('defs'); svg.prepend(defs); }
    const marker = svgEl('marker', { id, markerWidth:'8', markerHeight:'8',
      refX:'6', refY:'3', orient:'auto' });
    const path = svgEl('path', { d:'M0,0 L6,3 L0,6 Z', fill: color });
    marker.appendChild(path);
    defs.appendChild(marker);
  }

  window.DSAViz.makeSVG = makeSVG;
  window.DSAViz.svgEl = svgEl;
  window.DSAViz.svgArrow = svgArrow;
  window.DSAViz.ensureArrowMarker = ensureArrowMarker;

  /* ── CONTAINER BUILDER ──────────────────────────────────────── */
  function makeContainer(mount, title) {
    mount.innerHTML = '';
    mount.style.cssText = `background:#161b22;border-radius:10px;padding:16px;
      font-family:'JetBrains Mono',monospace;color:#cdd9e5;`;
    if (title) {
      const h = document.createElement('div');
      h.style.cssText = `font-size:15px;font-weight:700;color:#58a6ff;margin-bottom:12px;letter-spacing:.02em;`;
      h.textContent = title;
      mount.appendChild(h);
    }
    return mount;
  }
  window.DSAViz.makeContainer = makeContainer;

})();
