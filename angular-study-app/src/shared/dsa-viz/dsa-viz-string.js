/**
 * DSAViz.string — reusable string/pointer/window visualizer
 *
 * API:
 *   DSAViz.string.render(mount, config)
 *   DSAViz.string.compare(mount, config)    — two strings side-by-side (LCS, edit dist)
 *   DSAViz.string.animate(mount, steps, opts)
 *
 * render config {
 *   str        : string
 *   title?     : string
 *   highlights?: { [i]: 'active'|'success'|'error'|'warn'|'match'|'mismatch'|'skip' }
 *   pointers?  : { [label]: index }        — labeled arrows above chars
 *   window?    : { l: number, r: number }  — sliding window bracket
 *   showIndex? : boolean                   — show index below each char (default true)
 *   narration? : string
 * }
 *
 * compare config {
 *   strA, strB : string
 *   matchMap?  : [ia, ib][]               — pairs of matched indices
 *   hiA?       : { [i]: state }
 *   hiB?       : { [i]: state }
 *   ptrA?      : number
 *   ptrB?      : number
 *   narration? : string
 *   title?     : string
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  const CHAR_STATES = {
    active:   { bg: "#1f3a5f", border: "#1f6feb", text: "#58a6ff", bold: true  },
    match:    { bg: "#0d2818", border: "#238636", text: "#56d364", bold: true  },
    mismatch: { bg: "#2d0f0f", border: "#da3633", text: "#f78166", bold: false },
    success:  { bg: "#0d2818", border: "#56d364", text: "#56d364", bold: false },
    error:    { bg: "#2d0f0f", border: "#f78166", text: "#f78166", bold: false },
    warn:     { bg: "#272012", border: "#d29922", text: "#e3b341", bold: false },
    skip:     { bg: "#161b22", border: "#30363d", text: "#484f58", bold: false },
    default:  { bg: "#21262d", border: "#30363d", text: "#cdd9e5", bold: false },
  };

  const CELL = 38;
  const GAP  = 3;

  function buildCharRow(str, hi, ptrs, win, showIndex = true) {
    const wrap = document.createElement("div");
    wrap.style.cssText = `display:flex;gap:${GAP}px;align-items:flex-end;
      flex-wrap:nowrap;overflow-x:auto;padding:16px 4px 20px;position:relative;`;

    str.split("").forEach((ch, i) => {
      const col = document.createElement("div");
      col.style.cssText = `display:flex;flex-direction:column;align-items:center;min-width:${CELL}px;position:relative;`;

      /* pointer labels above */
      const ptrLabels = Object.entries(ptrs || {}).filter(([, idx]) => idx === i).map(([l]) => l);
      if (ptrLabels.length) {
        const pDiv = document.createElement("div");
        pDiv.style.cssText = "font-size:10px;color:#e3b341;font-weight:700;margin-bottom:2px;letter-spacing:.03em;";
        pDiv.textContent = ptrLabels.join(",");
        col.appendChild(pDiv);
      }

      const s = CHAR_STATES[hi?.[i]] || CHAR_STATES.default;
      const inWin = win && i >= win.l && i <= win.r;

      const box = document.createElement("div");
      box.style.cssText = `width:${CELL}px;height:${CELL}px;display:flex;justify-content:center;
        align-items:center;background:${s.bg};border:2px solid ${s.border};border-radius:5px;
        font-size:16px;font-weight:${s.bold?700:400};color:${s.text};
        font-family:'JetBrains Mono',monospace;transition:all .2s;`;
      if (inWin) box.style.boxShadow = "0 0 0 2px #e3b341, 0 0 10px rgba(227,179,65,0.25)";
      box.textContent = ch === " " ? "·" : ch;
      col.appendChild(box);

      if (showIndex) {
        const idxLbl = document.createElement("div");
        idxLbl.style.cssText = "font-size:9px;color:#484f58;margin-top:3px;";
        idxLbl.textContent = i;
        col.appendChild(idxLbl);
      }

      if (ptrLabels.length) {
        const arrow = document.createElement("div");
        arrow.style.cssText = "font-size:9px;color:#e3b341;margin-top:1px;";
        arrow.textContent = "▲";
        col.appendChild(arrow);
      }

      wrap.appendChild(col);
    });

    /* window bracket */
    if (win) {
      const bracket = document.createElement("div");
      bracket.style.cssText = `position:absolute;bottom:6px;
        left:${win.l*(CELL+GAP)+4}px;
        width:${(win.r-win.l+1)*(CELL+GAP)-GAP}px;
        height:3px;background:linear-gradient(90deg,#e3b341,#f78166);
        border-radius:2px;opacity:.7;`;
      wrap.style.position = "relative";
      wrap.appendChild(bracket);
    }

    return wrap;
  }

  function render(mount, cfg) {
    const { DSAViz } = window;
    const str = cfg.str || "";
    const container = DSAViz.makeContainer(mount, cfg.title || "");
    const row = buildCharRow(str, cfg.highlights, cfg.pointers, cfg.window, cfg.showIndex !== false);
    container.appendChild(row);
    if (cfg.narration) container.appendChild(DSAViz.makeNarration(cfg.narration));
  }

  /* two strings with match lines (LCS / edit distance view) */
  function compare(mount, cfg) {
    const { DSAViz } = window;
    const container = DSAViz.makeContainer(mount, cfg.title || "");

    const hiA = { ...(cfg.hiA || {}) };
    const hiB = { ...(cfg.hiB || {}) };
    if (cfg.ptrA !== undefined) hiA[cfg.ptrA] = "active";
    if (cfg.ptrB !== undefined) hiB[cfg.ptrB] = "active";

    const rowA = buildCharRow(cfg.strA || "", hiA, cfg.ptrA !== undefined ? { "i":cfg.ptrA } : {}, null);
    const rowB = buildCharRow(cfg.strB || "", hiB, cfg.ptrB !== undefined ? { "j":cfg.ptrB } : {}, null);

    const labelA = document.createElement("div");
    labelA.style.cssText = "font-size:11px;color:#768390;margin-bottom:4px;";
    labelA.textContent = cfg.labelA || "String A";
    const labelB = document.createElement("div");
    labelB.style.cssText = "font-size:11px;color:#768390;margin-top:10px;margin-bottom:4px;";
    labelB.textContent = cfg.labelB || "String B";

    container.appendChild(labelA);
    container.appendChild(rowA);

    /* match lines via SVG overlay between rows */
    if (cfg.matchMap?.length) {
      const svgH = 30;
      const svg = DSAViz.makeSVG((cfg.strA?.length || 0) * (CELL + GAP) + 20, svgH);
      svg.style.display = "block";
      cfg.matchMap.forEach(([ia, ib]) => {
        if (ia !== ib) return; // simple visual: only show vertical when same index
        const x = ia * (CELL + GAP) + CELL / 2 + 4;
        const line = DSAViz.svgEl("line", { x1:x, y1:0, x2:x, y2:svgH,
          stroke:"#56d364", "stroke-width":1.5, "stroke-dasharray":"3 2", opacity:"0.6" });
        svg.appendChild(line);
      });
      container.appendChild(svg);
    }

    container.appendChild(labelB);
    container.appendChild(rowB);

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
      if (step._type === "compare") compare(vizDiv, step);
      else render(vizDiv, step);
      nar.update(step.narration || `Step ${idx+1}`);
      ctrl._updateCtr?.();
    });

    mount.appendChild(DSAViz.makeControlBar(ctrl));
    return ctrl;
  }

  window.DSAViz.string = { render, compare, animate };
})();
