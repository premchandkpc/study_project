/**
 * DSAViz.array — reusable array visualizer
 * Load AFTER dsa-viz-core.js
 *
 * API:
 *   DSAViz.array.render(mount, config)       → ArrayVisualizer instance
 *   DSAViz.array.animate(mount, steps, opts) → StepCtrl
 *
 * config {
 *   arr          : any[]
 *   highlights?  : { [index]: 'active'|'success'|'error'|'warn'|'compare'|'swap'|'window' }
 *   pointers?    : { [label]: index }
 *   window?      : [left, right]   — sliding window range (inclusive)
 *   title?       : string
 *   narration?   : string
 *   showIndex?   : boolean
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  /* color aliases from core palette */
  const _STATE_STYLE = {
    active:  { bg: "#1f3a5f", border: "#58a6ff", text: "#58a6ff" },
    success: { bg: "#0d2818", border: "#56d364", text: "#56d364" },
    error:   { bg: "#2d0f0f", border: "#f78166", text: "#f78166" },
    warn:    { bg: "#272012", border: "#e3b341", text: "#e3b341" },
    compare: { bg: "#2d1b0e", border: "#f78166", text: "#f78166" },
    swap:    { bg: "#0d2818", border: "#56d364", text: "#56d364" },
    window:  { bg: "#1a1040", border: "#8957e5", text: "#d2a8ff" },
    default: { bg: "#21262d", border: "#30363d", text: "#cdd9e5" },
  };

  /* ── STYLE INJECTION ──────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("dsa-array-styles")) return;
    const s = document.createElement("style");
    s.id = "dsa-array-styles";
    s.textContent = `
      .dsa-arr-root {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 14px;
        padding: 18px 20px;
        overflow-x: auto;
        font-family: 'Inter', 'JetBrains Mono', system-ui, sans-serif;
        box-shadow: 0 4px 16px rgba(0,0,0,.2);
      }
      .dsa-arr-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
        flex-wrap: nowrap;
        min-height: 110px;
        padding: 20px 0 10px;
      }
      .dsa-arr-cell-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
      }
      .dsa-arr-ptr {
        font-size: 12px;
        font-weight: 700;
        color: #e3b341;
        animation: dsa-bounce 1s ease-in-out infinite;
        white-space: nowrap;
        font-family: 'Inter', system-ui, sans-serif;
      }
      .dsa-arr-cell {
        width: 58px;
        height: 58px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #21262d;
        border: 2px solid #30363d;
        border-radius: 12px;
        color: #e6edf3;
        font-weight: 700;
        font-size: 17px;
        font-family: 'Inter', 'JetBrains Mono', monospace;
        transition: background 200ms ease, border-color 200ms ease,
                    box-shadow 200ms ease, transform 200ms ease;
        will-change: transform;
        position: relative;
      }
      .dsa-arr-cell:hover {
        transform: translateY(-5px) scale(1.06);
      }
      .dsa-arr-cell.active {
        background: #1f3a5f;
        border-color: #58a6ff;
        box-shadow: 0 0 14px rgba(31,111,235,0.45);
        color: #58a6ff;
      }
      .dsa-arr-cell.success {
        background: #0d2818;
        border-color: #56d364;
        box-shadow: 0 0 14px rgba(46,160,67,0.45);
        color: #56d364;
      }
      .dsa-arr-cell.error {
        background: #2d0f0f;
        border-color: #f78166;
        box-shadow: 0 0 14px rgba(218,54,51,0.4);
        color: #f78166;
      }
      .dsa-arr-cell.warn, .dsa-arr-cell.compare {
        background: #272012;
        border-color: #e3b341;
        box-shadow: 0 0 12px rgba(210,153,34,0.4);
        color: #e3b341;
      }
      .dsa-arr-cell.swap {
        background: #0d2818;
        border-color: #56d364;
        color: #56d364;
        animation: dsa-swap-flash 0.3s ease;
      }
      .dsa-arr-cell.window {
        background: #1a1040;
        border-color: #8957e5;
        box-shadow: 0 0 14px rgba(137,87,229,0.4);
        color: #d2a8ff;
      }
      .dsa-arr-idx {
        font-size: 11px;
        color: #8b949e;
        margin-top: 3px;
        font-family: 'Inter', system-ui, sans-serif;
        font-weight: 500;
      }
      .dsa-win-bracket {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        color: #8957e5;
        opacity: 0.7;
        user-select: none;
      }
      @keyframes dsa-bounce {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-5px); }
      }
      @keyframes dsa-swap-flash {
        0%   { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(s);
  }

  /* ── ARRAY VISUALIZER CLASS ───────────────────────────────────── */
  class ArrayVisualizer {
    constructor(mount, config) {
      injectStyles();
      this.mount = mount;
      this.state = config;
      this._build();
    }

    _build() {
      this.mount.innerHTML = "";
      const root = document.createElement("div");
      root.className = "dsa-arr-root";

      /* optional title */
      if (this.state.title) {
        const t = document.createElement("div");
        t.style.cssText = "font-size:15px;font-weight:700;color:#58a6ff;margin-bottom:10px;font-family:\"Inter\",system-ui,sans-serif;";
        t.textContent = this.state.title;
        root.appendChild(t);
      }

      this._row = document.createElement("div");
      this._row.className = "dsa-arr-row";
      root.appendChild(this._row);
      this.mount.appendChild(root);
      this._renderCells();
    }

    _renderCells() {
      const { arr = [], highlights = {}, pointers = {}, window: win, showIndex = true } = this.state;
      this._row.innerHTML = "";

      const revPtrs = {};
      Object.entries(pointers).forEach(([label, pos]) => {
        revPtrs[pos] = revPtrs[pos] ? revPtrs[pos] + " " + label : label;
      });

      arr.forEach((val, idx) => {
        const wrap = document.createElement("div");
        wrap.className = "dsa-arr-cell-wrap";

        /* pointer label above cell */
        const ptrLabel = revPtrs[idx];
        if (ptrLabel) {
          const ptr = document.createElement("div");
          ptr.className = "dsa-arr-ptr";
          ptr.textContent = ptrLabel;
          wrap.appendChild(ptr);
        } else {
          /* spacer so cells align when some have pointers */
          const sp = document.createElement("div");
          sp.style.height = "18px";
          wrap.appendChild(sp);
        }

        /* cell */
        const cell = document.createElement("div");
        cell.className = "dsa-arr-cell";

        let stateKey = highlights[idx] || "default";
        /* window range supersedes default */
        if (!highlights[idx] && win && idx >= win[0] && idx <= win[1]) stateKey = "window";
        if (stateKey !== "default") cell.classList.add(stateKey);

        cell.textContent = val ?? "·";

        wrap.appendChild(cell);

        if (showIndex) {
          const ix = document.createElement("div");
          ix.className = "dsa-arr-idx";
          ix.textContent = idx;
          wrap.appendChild(ix);
        }

        this._row.appendChild(wrap);
      });
    }

    update(nextState) {
      this.state = nextState;
      this._renderCells();
    }
  }

  /* ── PUBLIC API ───────────────────────────────────────────────── */
  window.DSAViz.array = {
    render(mount, config) {
      return new ArrayVisualizer(mount, config);
    },

    animate(mount, steps, opts = {}) {
      const { DSAViz } = window;
      mount.innerHTML = "";

      const nar = DSAViz.makeNarration("Press ▶▶ or Play to start");
      mount.appendChild(nar);

      if (steps[0]?.title) {
        const t = document.createElement("div");
        t.style.cssText = "font-size:16px;font-weight:700;color:#58a6ff;margin:8px 0 4px;font-family:\"Inter\",system-ui,sans-serif;letter-spacing:.01em;";
        t.textContent = steps[0].title;
        mount.insertBefore(t, nar);
      }

      const vizDiv = document.createElement("div");
      mount.appendChild(vizDiv);

      if (opts.timeComplexity || opts.spaceComplexity) {
        mount.appendChild(DSAViz.makeComplexityBadge(opts.timeComplexity || "—", opts.spaceComplexity || "—"));
      }

      let viz = null;
      const ctrl = DSAViz.makeStepCtrl(steps, (step, idx) => {
        if (!step) {
          vizDiv.innerHTML = "";
          viz = null;
          nar.update("Reset");
          return;
        }
        if (!viz) {
          viz = new ArrayVisualizer(vizDiv, step);
        } else {
          viz.update(step);
        }
        const narColor = step.highlights
          ? (Object.values(step.highlights).includes("error") ? "#f78166"
            : Object.values(step.highlights).includes("success") ? "#56d364"
              : "#1f6feb")
          : "#1f6feb";
        nar.update(step.narration || `Step ${idx + 1}`, narColor);
        ctrl._updateCtr?.();
      });

      mount.appendChild(DSAViz.makeControlBar(ctrl));
      return ctrl;
    },
  };
})();
