/**
 * array.animation.js — reusable array animation primitives
 * Exposes: window.DSA.ArrayAnimation
 *
 * Used by: SlidingWindowProblem, TwoPointerProblem, BinarySearchProblem, StackProblem
 *
 * Each method returns CSS class/style strings or DOM mutations — pure visual,
 * no state. Templates call these when rendering step visuals.
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  const Colors = {
    WINDOW:      '#1f6feb',   // blue — active window
    POINTER_L:   '#e3b341',   // yellow — left pointer / i
    POINTER_R:   '#f0883e',   // orange — right pointer / j
    POINTER_MID: '#a78bfa',   // purple — mid pointer
    ACTIVE:      '#56d364',   // green — current element
    MATCH:       '#56d364',   // green — found / match
    MISMATCH:    '#f85149',   // red — mismatch
    VISITED:     '#30363d',   // dim — already processed
    DEFAULT:     '#21262d',   // base cell bg
    RESULT:      '#238636',   // dark green — result set
    SHRINK:      '#bc4c00',   // dark orange — shrink signal
    EXPAND:      '#1f6feb44', // transparent blue — expand
  };

  const ArrayAnimation = {
    Colors,

    /**
     * Render an array as colored cells into a container element.
     * @param {HTMLElement} el    — mount point
     * @param {any[]}       arr   — array values
     * @param {object}      opts
     * @param {object}      [opts.highlights]  — { index: color }
     * @param {object}      [opts.labels]      — { index: labelStr } shown below cell
     * @param {object}      [opts.pointers]    — { ptrName: index } shown above
     * @param {number[]}    [opts.window]      — [left, right] range to highlight as window
     * @param {string}      [opts.windowColor] — window highlight color
     */
    render(el, arr, opts = {}) {
      const { highlights = {}, labels = {}, pointers = {}, window: win, windowColor } = opts;

      // Build pointer map: index → [name, ...]
      const ptrMap = {};
      Object.entries(pointers).forEach(([name, idx]) => {
        if (!ptrMap[idx]) ptrMap[idx] = [];
        ptrMap[idx].push(name);
      });

      el.innerHTML = '';
      el.style.cssText = 'display:flex;gap:4px;align-items:flex-end;padding:8px 4px;flex-wrap:wrap;';

      arr.forEach((val, i) => {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px;';

        // Pointer label above cell
        const ptrEl = document.createElement('div');
        ptrEl.style.cssText = 'font-size:10px;font-weight:700;height:14px;color:#e3b341;font-family:JetBrains Mono,monospace;';
        if (ptrMap[i]) ptrEl.textContent = ptrMap[i].join(',');
        wrap.appendChild(ptrEl);

        // Cell
        const cell = document.createElement('div');
        const inWindow = win && i >= win[0] && i <= win[1];
        let bg = inWindow ? (windowColor || Colors.WINDOW) + '33' : Colors.DEFAULT;
        let border = inWindow ? (windowColor || Colors.WINDOW) : '#30363d';
        if (highlights[i]) { bg = highlights[i] + '33'; border = highlights[i]; }

        cell.style.cssText = `
          width:36px;height:36px;display:flex;align-items:center;justify-content:center;
          background:${bg};border:2px solid ${border};border-radius:6px;
          font-size:13px;font-weight:700;color:#e6edf3;font-family:JetBrains Mono,monospace;
          transition:background .2s,border-color .2s;
        `;
        cell.textContent = val !== undefined && val !== null ? String(val) : '?';
        wrap.appendChild(cell);

        // Index label below
        const idxEl = document.createElement('div');
        idxEl.style.cssText = 'font-size:10px;color:#484f58;font-family:JetBrains Mono,monospace;';
        idxEl.textContent = labels[i] !== undefined ? labels[i] : String(i);
        wrap.appendChild(idxEl);

        el.appendChild(wrap);
      });
    },

    /**
     * Highlight a range as a sliding window (left..right inclusive).
     * Returns opts to pass into render().
     */
    windowOpts(left, right, color) {
      return { window: [left, right], windowColor: color || Colors.WINDOW };
    },

    /**
     * Two-pointer opts — left=yellow, right=orange.
     */
    twoPointerOpts(leftIdx, rightIdx) {
      return {
        pointers: { L: leftIdx, R: rightIdx },
        highlights: {
          [leftIdx]: Colors.POINTER_L,
          [rightIdx]: Colors.POINTER_R,
        },
      };
    },

    /**
     * Binary search opts — lo/mid/hi highlights.
     */
    binarySearchOpts(lo, mid, hi) {
      const highlights = {};
      if (lo !== undefined)  highlights[lo]  = Colors.POINTER_L;
      if (mid !== undefined) highlights[mid] = Colors.POINTER_MID;
      if (hi !== undefined)  highlights[hi]  = Colors.POINTER_R;
      return {
        pointers: { lo, mid, hi },
        highlights,
      };
    },

    /**
     * Visited/unvisited styling — dims processed cells.
     */
    visitedOpts(visitedIndices) {
      const highlights = {};
      visitedIndices.forEach(i => { highlights[i] = Colors.VISITED; });
      return { highlights };
    },

    /**
     * Animate a stack — renders stack as vertical cells (top at top).
     * @param {HTMLElement} el
     * @param {any[]}       stack — array where last element = top
     * @param {number}      [topHighlight] — index to highlight as current top
     */
    renderStack(el, stack, topHighlight) {
      el.innerHTML = '';
      el.style.cssText = 'display:flex;flex-direction:column-reverse;gap:4px;';
      stack.forEach((val, i) => {
        const cell = document.createElement('div');
        const isTop = i === stack.length - 1;
        cell.style.cssText = `
          padding:6px 14px;min-width:60px;text-align:center;
          background:${isTop ? Colors.ACTIVE + '22' : Colors.DEFAULT};
          border:2px solid ${isTop ? Colors.ACTIVE : '#30363d'};
          border-radius:6px;font-size:12px;font-weight:700;color:#e6edf3;
          font-family:JetBrains Mono,monospace;
        `;
        cell.textContent = String(val);
        el.appendChild(cell);
      });
      if (stack.length === 0) {
        el.innerHTML = '<div style="color:#484f58;font-size:11px;padding:4px">empty</div>';
      }
    },
  };

  window.DSA.ArrayAnimation = ArrayAnimation;
})();
