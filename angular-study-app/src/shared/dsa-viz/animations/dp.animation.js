/**
 * dp.animation.js — reusable DP animation primitives
 * Exposes: window.DSA.DPAnimation
 *
 * Used by: DPProblem template (fibonacci, climb stairs, coin change, knapsack, LCS, etc.)
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  const DPColors = {
    EMPTY:    "#21262d",
    FILLING:  "#e3b341",   // yellow — currently computing this cell
    FILLED:   "#1f6feb22", // blue tint — computed
    SOURCE:   "#56d364",   // green — base case
    OPTIMAL:  "#a78bfa",   // purple — optimal subproblem used
    RESULT:   "#238636",   // dark green — final answer cell
    TEXT:     "#e6edf3",
    DIM:      "#484f58",
  };

  const DPAnimation = {
    Colors: DPColors,

    /**
     * Render a 1D DP array (e.g. dp[i] for fibonacci, climb stairs, house robber).
     * @param {HTMLElement} el
     * @param {any[]}       dp       — dp array values (undefined = not computed yet)
     * @param {object}      opts
     * @param {number}      [opts.current]  — index currently being computed
     * @param {number[]}    [opts.sources]  — base case indices
     * @param {number}      [opts.result]   — result index (highlight green)
     * @param {string[]}    [opts.labels]   — custom labels for each index
     */
    render1D(el, dp, opts = {}) {
      const { current, sources = [], result } = opts;
      el.innerHTML = "";
      el.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;padding:6px 2px;";

      dp.forEach((val, i) => {
        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:3px;";

        const cell = document.createElement("div");
        let bg = DPColors.EMPTY, border = "#30363d", color = DPColors.TEXT;
        if (i === result)          { bg = DPColors.RESULT;  border = "#56d364"; }
        else if (i === current)    { bg = DPColors.FILLING + "44"; border = DPColors.FILLING; }
        else if (sources.includes(i)) { bg = DPColors.SOURCE + "22"; border = DPColors.SOURCE; }
        else if (val !== undefined && val !== null) { bg = DPColors.FILLED; border = "#1f6feb"; }
        else                       { color = DPColors.DIM; }

        cell.style.cssText = `
          width:40px;height:40px;display:flex;align-items:center;justify-content:center;
          background:${bg};border:2px solid ${border};border-radius:6px;
          font-size:13px;font-weight:700;color:${color};font-family:JetBrains Mono,monospace;
          transition:all .2s;
        `;
        cell.textContent = val !== undefined && val !== null ? String(val) : "·";
        wrap.appendChild(cell);

        const idx = document.createElement("div");
        idx.style.cssText = "font-size:10px;color:#484f58;font-family:JetBrains Mono,monospace;";
        idx.textContent = opts.labels?.[i] ?? String(i);
        wrap.appendChild(idx);

        el.appendChild(wrap);
      });
    },

    /**
     * Render a 2D DP table (e.g. LCS, edit distance, knapsack).
     * @param {HTMLElement} el
     * @param {any[][]}     dp       — 2D dp array
     * @param {object}      opts
     * @param {number[]}    [opts.current]  — [row, col] currently computing
     * @param {number[]}    [opts.result]   — [row, col] final answer
     * @param {string[]}    [opts.rowLabels]
     * @param {string[]}    [opts.colLabels]
     */
    render2D(el, dp, opts = {}) {
      const { current, result, rowLabels = [], colLabels = [] } = opts;
      if (!dp || !dp.length) return;
      el.innerHTML = "";
      el.style.cssText = "overflow-x:auto;padding:4px;";

      const table = document.createElement("table");
      table.style.cssText = "border-collapse:collapse;font-size:11px;font-family:JetBrains Mono,monospace;";

      // Column headers
      if (colLabels.length) {
        const head = document.createElement("tr");
        head.appendChild(document.createElement("th")); // corner
        colLabels.forEach(lbl => {
          const th = document.createElement("th");
          th.style.cssText = "padding:2px 6px;color:#484f58;font-weight:400;";
          th.textContent = lbl;
          head.appendChild(th);
        });
        table.appendChild(head);
      }

      dp.forEach((row, ri) => {
        const tr = document.createElement("tr");
        if (rowLabels[ri] !== undefined) {
          const th = document.createElement("th");
          th.style.cssText = "padding:2px 6px;color:#484f58;font-weight:400;text-align:right;";
          th.textContent = rowLabels[ri];
          tr.appendChild(th);
        }
        row.forEach((val, ci) => {
          const td = document.createElement("td");
          const isCurrent = current && current[0] === ri && current[1] === ci;
          const isResult  = result  && result[0]  === ri && result[1]  === ci;
          const isDefined = val !== undefined && val !== null;

          let bg = "transparent", border = "#30363d44", color = "#e6edf3";
          if (isResult)       { bg = DPColors.RESULT;        border = "#56d364"; }
          else if (isCurrent) { bg = DPColors.FILLING + "55"; border = DPColors.FILLING; }
          else if (isDefined) { bg = DPColors.FILLED;         border = "#1f6feb44"; }
          else                { color = DPColors.DIM; }

          td.style.cssText = `
            width:28px;height:28px;text-align:center;vertical-align:middle;
            background:${bg};border:1px solid ${border};color:${color};
            font-weight:${isCurrent || isResult ? "700" : "400"};
            transition:all .15s;
          `;
          td.textContent = isDefined ? String(val) : "·";
          tr.appendChild(td);
        });
        table.appendChild(tr);
      });

      el.appendChild(table);
    },

    /**
     * Render a memoization map (top-down DP cache display).
     * @param {HTMLElement} el
     * @param {object}      memo  — { key: value }
     * @param {string}      [currentKey]
     */
    renderMemo(el, memo, currentKey) {
      el.innerHTML = "";
      el.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;padding:4px;";
      Object.entries(memo).forEach(([key, val]) => {
        const chip = document.createElement("div");
        const isCurrent = String(key) === String(currentKey);
        chip.style.cssText = `
          padding:4px 10px;border-radius:6px;font-size:12px;font-family:JetBrains Mono,monospace;
          background:${isCurrent ? DPColors.FILLING + "33" : DPColors.FILLED};
          border:1px solid ${isCurrent ? DPColors.FILLING : "#1f6feb55"};
          color:#e6edf3;display:flex;gap:6px;
        `;
        chip.innerHTML = `<span style="color:#58a6ff">${key}</span><span style="color:#484f58">→</span><span style="color:#56d364">${val}</span>`;
        el.appendChild(chip);
      });
    },
  };

  window.DSA.DPAnimation = DPAnimation;
})();
