/**
 * DSAViz.array — reusable array/sliding-window/two-pointer visualizer
 *
 * API:
 *   DSAViz.array.render(mount, config)
 *
 * config {
 *   arr        : number[]            — data array
 *   title?     : string
 *   highlights?: { [idx]: 'active'|'success'|'error'|'warn'|'compare'|'swap' }
 *   pointers?  : { [label]: idx }   — e.g. { L:0, R:3 }
 *   window?    : { l: number, r: number }  — highlight window range
 *   labels?    : string[]           — custom per-cell label (shown below index)
 *   barMode?   : boolean            — show bars instead of boxes (histogram)
 *   narration? : string
 *   onHover?   : (idx, val) => string   — tooltip text
 * }
 *
 *   DSAViz.array.animate(mount, steps, options)
 *   — steps: Array<config>  (each step is a render config)
 *   — options: { delay?, onDone? }
 */
(function () {
  window.DSAViz = window.DSAViz || {};
  const C = () => window.DSAViz.C;

  const STATE_COLORS = {
    active:  { bg: '#1f3a5f', border: '#1f6feb', text: '#58a6ff' },
    success: { bg: '#0d2818', border: '#238636', text: '#56d364' },
    error:   { bg: '#2d0f0f', border: '#da3633', text: '#f78166' },
    warn:    { bg: '#272012', border: '#d29922', text: '#e3b341' },
    compare: { bg: '#2d1a00', border: '#f78166', text: '#f78166' },
    swap:    { bg: '#0d2818', border: '#56d364', text: '#56d364' },
    default: { bg: '#21262d', border: '#30363d', text: '#cdd9e5' },
  };

  function cellState(highlights, idx) {
    return STATE_COLORS[highlights?.[idx]] || STATE_COLORS.default;
  }

  function render(mount, cfg) {
    const { DSAViz } = window;
    const arr = cfg.arr || [];
    const hi = cfg.highlights || {};
    const ptrs = cfg.pointers || {};
    const win = cfg.window || null;
    const labels = cfg.labels || [];
    const barMode = !!cfg.barMode;

    const container = DSAViz.makeContainer(mount, cfg.title || '');

    /* narration */
    if (cfg.narration) {
      const nar = DSAViz.makeNarration(cfg.narration);
      container.appendChild(nar);
    }

    const MAX_VAL = Math.max(...arr.map(Math.abs), 1);
    const CELL_W = Math.max(44, Math.min(64, Math.floor(560 / Math.max(arr.length, 1))));
    const CELL_H = barMode ? 120 : 52;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;align-items:flex-end;gap:3px;flex-wrap:nowrap;
      overflow-x:auto;padding:12px 4px 28px;position:relative;`;

    arr.forEach((val, idx) => {
      const col = document.createElement('div');
      col.style.cssText = `display:flex;flex-direction:column;align-items:center;position:relative;min-width:${CELL_W}px;`;

      /* pointer labels above */
      const ptrLabels = Object.entries(ptrs).filter(([, i]) => i === idx).map(([l]) => l);
      if (ptrLabels.length) {
        const pDiv = document.createElement('div');
        pDiv.style.cssText = `font-size:11px;color:#e3b341;font-weight:700;margin-bottom:3px;letter-spacing:.04em;`;
        pDiv.textContent = ptrLabels.join(' ');
        col.appendChild(pDiv);
      }

      const s = cellState(hi, idx);
      const inWin = win && idx >= win.l && idx <= win.r;

      if (barMode) {
        /* bar chart cell */
        const barH = Math.max(6, Math.round((Math.abs(val) / MAX_VAL) * 100));
        const bar = document.createElement('div');
        bar.style.cssText = `width:${CELL_W-6}px;height:${barH}px;background:${s.border};
          border-radius:3px 3px 0 0;transition:all .3s;position:relative;
          box-shadow: 0 0 0 1px ${s.border};`;
        if (inWin) bar.style.boxShadow = `0 0 0 2px #e3b341, 0 0 10px rgba(227,179,65,0.3)`;
        const valLbl = document.createElement('div');
        valLbl.style.cssText = `position:absolute;top:-18px;left:50%;transform:translateX(-50%);
          font-size:11px;color:${s.text};white-space:nowrap;`;
        valLbl.textContent = val;
        bar.appendChild(valLbl);
        col.appendChild(bar);
      } else {
        /* box cell */
        const box = document.createElement('div');
        box.style.cssText = `width:${CELL_W}px;height:${CELL_H}px;display:flex;flex-direction:column;
          justify-content:center;align-items:center;background:${s.bg};border:2px solid ${s.border};
          border-radius:6px;font-size:${val.toString().length > 3 ? 11 : 15}px;font-weight:700;
          color:${s.text};transition:all .25s;cursor:default;position:relative;user-select:none;`;
        if (inWin) box.style.boxShadow = `0 0 0 2px #e3b341, 0 0 12px rgba(227,179,65,0.25)`;
        box.textContent = val;

        /* tooltip */
        if (cfg.onHover) {
          const tip = document.createElement('div');
          tip.style.cssText = `position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
            background:#0d1117;border:1px solid #30363d;color:#cdd9e5;font-size:11px;padding:5px 8px;
            border-radius:5px;white-space:nowrap;opacity:0;pointer-events:none;z-index:10;transition:opacity .15s;`;
          tip.textContent = cfg.onHover(idx, val);
          box.appendChild(tip);
          box.onmouseenter = () => tip.style.opacity = '1';
          box.onmouseleave = () => tip.style.opacity = '0';
        }

        col.appendChild(box);
      }

      /* index label */
      const idxLbl = document.createElement('div');
      idxLbl.style.cssText = `font-size:10px;color:#768390;margin-top:4px;`;
      idxLbl.textContent = labels[idx] !== undefined ? labels[idx] : `[${idx}]`;
      col.appendChild(idxLbl);

      /* pointer arrow below */
      if (ptrLabels.length && !barMode) {
        const arrow = document.createElement('div');
        arrow.style.cssText = `font-size:10px;color:#e3b341;margin-top:2px;`;
        arrow.textContent = '▲';
        col.appendChild(arrow);
      }

      wrapper.appendChild(col);
    });

    /* window bracket overlay */
    if (win) {
      const bracket = document.createElement('div');
      bracket.style.cssText = `position:absolute;bottom:4px;left:${win.l*(CELL_W+3)+4}px;
        width:${(win.r-win.l+1)*(CELL_W+3)-3}px;height:4px;
        background:linear-gradient(90deg,#e3b341,#f78166);border-radius:2px;opacity:0.7;`;
      wrapper.style.position = 'relative';
      wrapper.appendChild(bracket);
    }

    container.appendChild(wrapper);
  }

  function animate(mount, steps, opts = {}) {
    const { DSAViz } = window;
    const delay = opts.delay || 1000;
    let si = -1;
    const nar = DSAViz.makeNarration('Press ▶▶ or Play to start');
    mount.innerHTML = '';
    mount.appendChild(nar);
    const vizDiv = document.createElement('div');
    mount.appendChild(vizDiv);

    const ctrl = DSAViz.makeStepCtrl(steps, (step, idx) => {
      if (!step) { vizDiv.innerHTML = ''; nar.update('Reset — press ▶▶ to start'); return; }
      render(vizDiv, step);
      nar.update(step.narration || `Step ${idx+1} / ${steps.length}`);
      ctrl._updateCtr?.();
    });

    const bar = DSAViz.makeControlBar(ctrl);
    mount.appendChild(bar);
    return ctrl;
  }

  window.DSAViz.array = { render, animate };
})();
