/**
 * DSAViz.dp — DP-specific visualizer: 1D table, 2D table, memo tree, recurrence trace
 *
 * API:
 *   DSAViz.dp.table1D(mount, config)     — 1D DP array with formula overlay
 *   DSAViz.dp.table2D(mount, config)     — 2D DP grid with dependency arrows
 *   DSAViz.dp.memoTree(mount, config)    — recursive call tree with memo hits
 *   DSAViz.dp.animate(mount, steps, opts)
 *
 * table1D config {
 *   dp         : (number|string)[]
 *   indices?   : string[]           — label for each index (e.g. coin values)
 *   highlights?: { [i]: state }
 *   formula?   : string             — shown above e.g. "dp[i] = dp[i-1] + dp[i-2]"
 *   pointer?   : number             — current computation index
 *   narration? : string
 *   title?     : string
 * }
 *
 * table2D config {
 *   dp         : (number|string)[][]
 *   rowLabels? : string[]
 *   colLabels? : string[]
 *   highlights?: { [r+','+c]: state }
 *   arrows?    : { from:[r,c], to:[r,c], color? }[]
 *   narration? : string
 *   title?     : string
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  const STATE_STYLES = {
    active:  { bg: "#1f3a5f", border: "#58a6ff", text: "#58a6ff" },
    current: { bg: "#1f3a5f", border: "#1f6feb", text: "#ffffff" },
    memo:    { bg: "#1a0f30", border: "#8957e5", text: "#d2a8ff" }, /* cache hit */
    filled:  { bg: "#0d2818", border: "#238636", text: "#56d364" }, /* completed cell */
    source:  { bg: "#272012", border: "#e3b341", text: "#e3b341" }, /* dependency source */
    default: { bg: "#21262d", border: "#30363d", text: "#cdd9e5" },
    empty:   { bg: "#161b22", border: "#21262d", text: "#484f58" },
  };

  /* ── 1D TABLE ───────────────────────────────────────────────── */
  function table1D(mount, cfg) {
    const { DSAViz } = window;
    const dp = cfg.dp || [];
    const hi = cfg.highlights || {};
    const ptr = cfg.pointer ?? -1;
    const indices = cfg.indices || dp.map((_, i) => String(i));

    const CELL = Math.max(40, Math.min(60, Math.floor(560 / Math.max(dp.length, 1))));

    const container = DSAViz.makeContainer(mount, cfg.title || "");

    /* formula bar */
    if (cfg.formula) {
      const fBar = document.createElement("div");
      fBar.style.cssText = `background:#0d1117;border:1px solid #21262d;border-radius:6px;
        padding:7px 12px;font-size:13px;color:#e3b341;font-family:monospace;margin-bottom:10px;`;
      fBar.textContent = cfg.formula;
      container.appendChild(fBar);
    }

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:3px;align-items:flex-end;flex-wrap:nowrap;overflow-x:auto;padding:10px 4px 24px;";

    dp.forEach((val, i) => {
      const col = document.createElement("div");
      col.style.cssText = `display:flex;flex-direction:column;align-items:center;position:relative;min-width:${CELL}px;`;

      const isCurrent = i === ptr;
      const s = STATE_STYLES[isCurrent ? "current" : (hi[i] || (val === "" || val === undefined ? "empty" : "default"))];

      /* pointer caret */
      if (isCurrent) {
        const caret = document.createElement("div");
        caret.style.cssText = "font-size:11px;color:#58a6ff;margin-bottom:2px;";
        caret.textContent = "▼";
        col.appendChild(caret);
      }

      const box = document.createElement("div");
      box.style.cssText = `width:${CELL}px;height:${CELL}px;display:flex;justify-content:center;
        align-items:center;background:${s.bg};border:2px solid ${s.border};border-radius:6px;
        font-size:${String(val).length > 4 ? 10 : 14}px;font-weight:700;color:${s.text};
        transition:all .25s;position:relative;`;
      if (isCurrent) box.style.boxShadow = "0 0 12px #1f6feb88";
      box.textContent = val === Infinity ? "∞" : (val === "" ? "?" : val);

      /* memo hit indicator */
      if (hi[i] === "memo") {
        const star = document.createElement("div");
        star.style.cssText = "position:absolute;top:-6px;right:-6px;font-size:9px;color:#8957e5;";
        star.textContent = "★";
        box.appendChild(star);
      }

      col.appendChild(box);

      const idxLbl = document.createElement("div");
      idxLbl.style.cssText = "font-size:10px;color:#768390;margin-top:4px;text-align:center;";
      idxLbl.textContent = indices[i] !== undefined ? indices[i] : `[${i}]`;
      col.appendChild(idxLbl);

      wrap.appendChild(col);
    });

    container.appendChild(wrap);
    if (cfg.narration) container.appendChild(DSAViz.makeNarration(cfg.narration));
  }

  /* ── 2D TABLE ───────────────────────────────────────────────── */
  function table2D(mount, cfg) {
    const { DSAViz } = window;
    /* delegate to matrix renderer with arrows */
    const matCfg = {
      grid: cfg.dp,
      highlights: cfg.highlights,
      rowLabels: cfg.rowLabels,
      colLabels: cfg.colLabels,
      narration: cfg.narration,
      title: cfg.title,
      showCoords: true,
    };
    DSAViz.matrix.render(mount, matCfg);

    /* overlay arrows for dp[i][j] ← dp[?][?] dependencies */
    if (cfg.arrows?.length) {
      const container = mount;
      const table = container.querySelector("table");
      if (!table) return;
      const svgOverlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svgOverlay.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;width:100%;height:100%;z-index:5;overflow:visible;";
      const tableWrap = table.parentElement;
      tableWrap.style.position = "relative";
      tableWrap.appendChild(svgOverlay);

      const tds = [...table.querySelectorAll("td")];
      const cols = (cfg.dp[0] || []).length;

      cfg.arrows.forEach(({ from: [fr, fc], to: [tr2, tc], color = "#e3b341" }) => {
        const fTd = tds[fr * cols + fc];
        const tTd = tds[tr2 * cols + tc];
        if (!fTd || !tTd) return;
        const fr2 = fTd.getBoundingClientRect();
        const tr22 = tTd.getBoundingClientRect();
        const tableR = tableWrap.getBoundingClientRect();
        DSAViz.ensureArrowMarker(svgOverlay, color);
        DSAViz.svgArrow(svgOverlay,
          fr2.left + fr2.width/2 - tableR.left,
          fr2.top + fr2.height/2 - tableR.top,
          tr22.left + tr22.width/2 - tableR.left,
          tr22.top + tr22.height/2 - tableR.top,
          color, "", false
        );
      });
    }
  }

  /* ── MEMO TREE ──────────────────────────────────────────────── */
  function memoTree(mount, cfg) {
    /* Reuse DSAViz.tree with memoized nodes marked */
    const { DSAViz } = window;
    if (!cfg.root) return;
    const treeCfg = {
      root: cfg.root,
      highlights: cfg.highlights || {},
      narration: cfg.narration,
      title: cfg.title || "Recursion Tree",
    };
    /* memo hits show as 'memo' state — map to 'warn' in tree */
    Object.entries(treeCfg.highlights).forEach(([k, v]) => {
      if (v === "memo") treeCfg.highlights[k] = "warn";
    });
    DSAViz.tree.render(mount, treeCfg);
    /* legend */
    const leg = document.createElement("div");
    leg.style.cssText = "display:flex;gap:10px;margin-top:8px;font-size:11px;flex-wrap:wrap;";
    [
      { color:"#56d364", label:"✓ solved (new call)" },
      { color:"#e3b341", label:"★ memo hit (reused)" },
      { color:"#58a6ff", label:"◉ currently computing" },
    ].forEach(({ color, label }) => {
      const it = document.createElement("span");
      it.style.color = color;
      it.textContent = label;
      leg.appendChild(it);
    });
    mount.appendChild(leg);
  }

  /* ── ANIMATE ────────────────────────────────────────────────── */
  function animate(mount, steps, opts = {}) {
    const { DSAViz } = window;
    const nar = DSAViz.makeNarration("Press ▶▶ or Play to start");
    mount.innerHTML = "";
    mount.appendChild(nar);
    const vizDiv = document.createElement("div");
    mount.appendChild(vizDiv);

    const ctrl = DSAViz.makeStepCtrl(steps, (step, idx) => {
      if (!step) { vizDiv.innerHTML = ""; nar.update("Reset"); return; }
      const type = step._type || "table1D";
      if (type === "table1D") table1D(vizDiv, step);
      else if (type === "table2D") table2D(vizDiv, step);
      else if (type === "memoTree") memoTree(vizDiv, step);
      nar.update(step.narration || `Step ${idx+1}`);
      ctrl._updateCtr?.();
    });

    mount.appendChild(DSAViz.makeControlBar(ctrl));
    return ctrl;
  }

  window.DSAViz.dp = { table1D, table2D, memoTree, animate };
})();
