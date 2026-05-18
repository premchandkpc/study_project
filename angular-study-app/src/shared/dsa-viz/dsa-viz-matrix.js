/**
 * DSAViz.matrix — reusable 2D grid / DP table / islands visualizer
 *
 * API:
 *   DSAViz.matrix.render(mount, config)
 *   DSAViz.matrix.animate(mount, steps, opts)
 *
 * config {
 *   grid       : (number|string)[][]   — 2D array of values
 *   title?     : string
 *   highlights?: { [r+','+c]: 'active'|'success'|'error'|'warn'|'visited'|'path'|'wall' }
 *   pointer?   : { r: number, c: number }    — current cell cursor
 *   rowLabels? : string[]                    — left-side row headers (DP index)
 *   colLabels? : string[]                    — top column headers
 *   cellSize?  : number                      — px per cell (default auto)
 *   showCoords?: boolean                     — show r,c in tooltip
 *   narration? : string
 *   onHover?   : (r, c, val) => string
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  const STATE_STYLES = {
    active:  { bg: "#1f3a5f", border: "#58a6ff", text: "#58a6ff", bold: true },
    success: { bg: "#0d2818", border: "#56d364", text: "#56d364", bold: false },
    error:   { bg: "#2d0f0f", border: "#f78166", text: "#f78166", bold: false },
    warn:    { bg: "#272012", border: "#e3b341", text: "#e3b341", bold: false },
    visited: { bg: "#1a0f30", border: "#8957e5", text: "#d2a8ff", bold: false },
    path:    { bg: "#1c1000", border: "#e3b341", text: "#e3b341", bold: true  },
    wall:    { bg: "#0d1117", border: "#21262d", text: "#484f58", bold: false },
    current: { bg: "#1f3a5f", border: "#1f6feb", text: "#ffffff", bold: true  },
    default: { bg: "#21262d", border: "#30363d", text: "#cdd9e5", bold: false },
  };

  function cellKey(r, c) { return `${r},${c}`; }

  function render(mount, cfg) {
    const { DSAViz } = window;
    const grid = cfg.grid || [[]];
    const rows = grid.length;
    const cols = grid[0]?.length || 0;
    const hi = cfg.highlights || {};
    const ptr = cfg.pointer;
    const rowLabels = cfg.rowLabels || [];
    const colLabels = cfg.colLabels || [];
    const hasRowLabels = rowLabels.length > 0;
    const hasColLabels = colLabels.length > 0;

    const CELL = cfg.cellSize || Math.max(28, Math.min(52, Math.floor(500 / Math.max(cols, 1))));
    const FONT = Math.max(10, Math.min(14, CELL - 10));

    const container = DSAViz.makeContainer(mount, cfg.title || "");

    const tableWrap = document.createElement("div");
    tableWrap.style.cssText = "overflow:auto;margin:8px 0;";

    const table = document.createElement("table");
    table.style.cssText = "border-collapse:separate;border-spacing:3px;font-family:monospace;";

    /* col header row */
    if (hasColLabels) {
      const hrow = document.createElement("tr");
      if (hasRowLabels) hrow.appendChild(document.createElement("td")); // corner
      colLabels.forEach((lbl, c) => {
        const th = document.createElement("th");
        th.style.cssText = `font-size:${FONT-1}px;color:#768390;text-align:center;
          padding:0 2px 4px;font-weight:400;min-width:${CELL}px;`;
        th.textContent = lbl;
        hrow.appendChild(th);
      });
      table.appendChild(hrow);
    }

    grid.forEach((row, r) => {
      const tr = document.createElement("tr");

      if (hasRowLabels) {
        const th = document.createElement("th");
        th.style.cssText = `font-size:${FONT-1}px;color:#768390;text-align:right;
          padding:0 6px 0 0;font-weight:400;white-space:nowrap;`;
        th.textContent = rowLabels[r] ?? r;
        tr.appendChild(th);
      }

      row.forEach((val, c) => {
        const key = cellKey(r, c);
        const isPtr = ptr && ptr.r === r && ptr.c === c;
        const s = STATE_STYLES[isPtr ? "current" : (hi[key] || "default")];

        const td = document.createElement("td");
        td.style.cssText = `width:${CELL}px;height:${CELL}px;text-align:center;vertical-align:middle;
          background:${s.bg};border:2px solid ${s.border};border-radius:5px;
          font-size:${FONT}px;color:${s.text};font-weight:${s.bold?700:400};
          transition:all .2s;cursor:default;position:relative;`;

        const dispVal = val === Infinity ? "∞" : val === -Infinity ? "-∞" : val;
        td.textContent = dispVal;

        /* pointer cursor */
        if (isPtr) {
          const cursor = document.createElement("div");
          cursor.style.cssText = `position:absolute;top:-8px;left:50%;transform:translateX(-50%);
            font-size:9px;color:#58a6ff;line-height:1;`;
          cursor.textContent = "▼";
          td.appendChild(cursor);
        }

        /* tooltip */
        if (cfg.onHover || cfg.showCoords) {
          const tip = document.createElement("div");
          tip.style.cssText = `position:absolute;bottom:calc(100%+4px);left:50%;
            transform:translateX(-50%);background:#0d1117;border:1px solid #30363d;
            color:#cdd9e5;font-size:10px;padding:3px 6px;border-radius:4px;
            white-space:nowrap;opacity:0;pointer-events:none;z-index:10;transition:opacity .15s;`;
          tip.textContent = cfg.onHover ? cfg.onHover(r, c, val) : `[${r},${c}] = ${val}`;
          td.style.overflow = "visible";
          td.appendChild(tip);
          td.onmouseenter = () => tip.style.opacity = "1";
          td.onmouseleave = () => tip.style.opacity = "0";
        }

        /* pulse animation on active/current */
        if (isPtr || hi[key] === "active") {
          td.style.boxShadow = `0 0 12px ${s.border}66`;
          const pulse = document.createElement("style");
          pulse.textContent = `@keyframes cellPulse{0%,100%{box-shadow:0 0 6px ${s.border}66}50%{box-shadow:0 0 14px ${s.border}}}`;
          document.head.appendChild(pulse);
          td.style.animation = "cellPulse 1.2s ease-in-out infinite";
        }

        tr.appendChild(td);
      });

      table.appendChild(tr);
    });

    tableWrap.appendChild(table);
    container.appendChild(tableWrap);

    /* legend */
    const legendKeys = [...new Set(Object.values(hi))].filter(v => STATE_STYLES[v]);
    if (legendKeys.length) {
      const leg = document.createElement("div");
      leg.style.cssText = "display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;";
      legendKeys.forEach(k => {
        const s = STATE_STYLES[k];
        const item = document.createElement("div");
        item.style.cssText = `display:flex;align-items:center;gap:4px;font-size:11px;color:${s.text};`;
        const dot = document.createElement("span");
        dot.style.cssText = `display:inline-block;width:10px;height:10px;background:${s.bg};
          border:1px solid ${s.border};border-radius:2px;`;
        item.appendChild(dot);
        item.appendChild(document.createTextNode(k));
        leg.appendChild(item);
      });
      container.appendChild(leg);
    }

    if (cfg.narration) container.appendChild(DSAViz.makeNarration(cfg.narration));
  }

  function animate(mount, steps, opts = {}) {
    const { DSAViz } = window;
    const nar = DSAViz.makeNarration("Press ▶▶ or Play to start");
    mount.innerHTML = "";
    mount.appendChild(nar);
    const vizDiv = document.createElement("div");
    mount.appendChild(vizDiv);

    const ctrl = DSAViz.makeStepCtrl(steps, (step, idx) => {
      if (!step) { vizDiv.innerHTML = ""; nar.update("Reset"); return; }
      render(vizDiv, step);
      nar.update(step.narration || `Step ${idx+1}`);
      ctrl._updateCtr?.();
    });

    mount.appendChild(DSAViz.makeControlBar(ctrl));
    return ctrl;
  }

  window.DSAViz.matrix = { render, animate };
})();
