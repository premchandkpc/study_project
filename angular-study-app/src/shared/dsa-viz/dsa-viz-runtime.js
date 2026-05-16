/**
 * DSAViz.runtime — CODER.md Runtime Simulation Engine
 * Load AFTER dsa-viz-core.js (and optionally after array/tree/graph/dp/matrix/string)
 *
 * Creates the 3-panel cinematic layout from CODER.md:
 *   ┌──────────────────┬─────────────────────────────┐
 *   │  CODE PANEL      │   VISUAL SIMULATION         │
 *   │  line highlight  │   arrays/trees/graphs/dp    │
 *   └──────────────────┴─────────────────────────────┘
 *   │ Timeline · Narration · Variables · Memory · Debug │
 *   └────────────────────────────────────────────────────┘
 *
 * API:
 *   const rt = DSAViz.runtime.create(mount, {
 *     code,            // string (source code) or string[]
 *     title?,          // string
 *     timeComplexity?, // 'O(n)'
 *     spaceComplexity? // 'O(n)'
 *   });
 *   rt.animate(steps);   // returns StepCtrl (play/pause/step/reset)
 *
 * Step snapshot format:
 * {
 *   line?          : number,            // 0-indexed line to highlight
 *   narration?     : string,
 *   variables?     : { [name]: any },   // variable state
 *   arrays?        : { [name]: arrayConfig },    // DSAViz.array config per array
 *   trees?         : { [name]: treeConfig },     // DSAViz.tree config per tree
 *   graphs?        : { [name]: graphConfig },    // DSAViz.graph config per graph
 *   dp?            : dpConfig & { type?: '1d'|'2d' },
 *   maps?          : { [name]: { [key]: value } }, // raw hashmap display
 *   callStack?     : string[],          // bottom → top
 *   heap?          : { [name]: string },
 *   timeLabel?     : string,            // 't=40ms'
 *   ops?           : number,
 *   recursionDepth?: number,
 * }
 */
(function () {
  window.DSAViz = window.DSAViz || {};

  /* ── STYLE INJECTION ──────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('dsa-runtime-styles')) return;
    const s = document.createElement('style');
    s.id = 'dsa-runtime-styles';
    s.textContent = `
      /* ── layout ── */
      .rt-root {
        font-family: 'JetBrains Mono', monospace;
        background: #161b22;
        border-radius: 12px;
        overflow: hidden;
        border: 1px solid #30363d;
      }
      .rt-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        background: #21262d;
        border-bottom: 1px solid #30363d;
        gap: 12px;
      }
      .rt-title {
        font-size: 14px;
        font-weight: 700;
        color: #58a6ff;
        letter-spacing: .02em;
        white-space: nowrap;
      }
      .rt-main {
        display: flex;
        height: 340px;
        border-bottom: 1px solid #30363d;
      }
      /* ── code panel ── */
      .rt-code-panel {
        width: 40%;
        min-width: 200px;
        max-width: 420px;
        border-right: 1px solid #30363d;
        overflow-y: auto;
        background: #0d1117;
        flex-shrink: 0;
      }
      .rt-code {
        padding: 8px 0;
        font-size: 12px;
        line-height: 1.65;
        counter-reset: line;
      }
      .rt-code-row {
        display: flex;
        align-items: stretch;
        padding: 0;
        border-left: 3px solid transparent;
        transition: background .12s, border-color .12s;
        cursor: default;
      }
      .rt-code-row:hover { background: rgba(255,255,255,0.03); }
      .rt-code-row.rt-active {
        background: rgba(31,111,235,0.16);
        border-left-color: #1f6feb;
      }
      .rt-line-num {
        color: #484f58;
        font-size: 11px;
        min-width: 36px;
        text-align: right;
        padding: 0 10px 0 0;
        user-select: none;
        line-height: 1.65;
      }
      .rt-line-text {
        color: #cdd9e5;
        white-space: pre;
        padding-right: 12px;
        flex: 1;
        line-height: 1.65;
      }
      .rt-code-row.rt-active .rt-line-text { color: #ffffff; }
      /* ── visual panel ── */
      .rt-viz-panel {
        flex: 1;
        padding: 12px;
        overflow-y: auto;
        background: #161b22;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-content: flex-start;
      }
      .rt-viz-block {
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 8px;
        padding: 10px 12px;
        flex: 0 0 auto;
        max-width: 100%;
      }
      .rt-viz-label {
        font-size: 10px;
        font-weight: 700;
        color: #768390;
        text-transform: uppercase;
        letter-spacing: .05em;
        margin-bottom: 6px;
      }
      .rt-map-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .rt-map-chip {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 6px;
        padding: 3px 10px;
        font-size: 12px;
        display: flex;
        gap: 4px;
        align-items: center;
      }
      /* ── narration ── */
      .rt-nar-wrap { border-bottom: 1px solid #30363d; }
      /* ── bottom tabs ── */
      .rt-bottom { background: #21262d; }
      .rt-tab-bar {
        display: flex;
        border-bottom: 1px solid #30363d;
        padding: 0 8px;
        overflow-x: auto;
      }
      .rt-tab {
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #768390;
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        padding: 7px 14px;
        cursor: pointer;
        white-space: nowrap;
        transition: color .12s, border-color .12s;
      }
      .rt-tab:hover { color: #cdd9e5; }
      .rt-tab.rt-tab-active {
        color: #58a6ff;
        border-bottom-color: #1f6feb;
      }
      .rt-tab-pane {
        padding: 10px 14px;
        height: 130px;
        overflow-y: auto;
        font-size: 12px;
      }
      /* ── variables tab ── */
      .rt-var-grid { display: flex; flex-wrap: wrap; gap: 7px; }
      .rt-var-chip {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 6px;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: border-color .2s, box-shadow .2s;
      }
      .rt-var-chip.rt-changed {
        border-color: #e3b341;
        box-shadow: 0 0 8px rgba(227,179,65,.3);
        animation: rt-var-pop .3s ease;
      }
      @keyframes rt-var-pop {
        0%  { transform: scale(1.1); }
        100%{ transform: scale(1); }
      }
      .rt-var-name { color: #58a6ff; font-weight: 700; }
      .rt-var-eq   { color: #768390; }
      .rt-var-val  { color: #56d364; }
      /* ── memory tab ── */
      .rt-mem-section-label {
        font-size: 10px;
        font-weight: 700;
        color: #768390;
        text-transform: uppercase;
        letter-spacing: .05em;
        margin: 0 0 5px;
      }
      .rt-stack-frames {
        display: flex;
        flex-direction: column;
        gap: 3px;
        margin-bottom: 10px;
      }
      .rt-stack-frame {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 4px;
        padding: 4px 10px;
        color: #cdd9e5;
        font-size: 12px;
      }
      .rt-stack-frame.rt-top { border-color: #1f6feb; color: #58a6ff; }
      .rt-heap-rows { display: flex; flex-direction: column; gap: 3px; }
      .rt-heap-row {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 12px;
        display: flex; gap: 6px;
      }
      /* ── timeline tab ── */
      .rt-timeline { display: flex; flex-direction: column; gap: 3px; }
      .rt-tl-row {
        display: flex;
        gap: 12px;
        padding-left: 10px;
        border-left: 2px solid #30363d;
        align-items: flex-start;
      }
      .rt-tl-row:last-child { border-left-color: #1f6feb; }
      .rt-tl-t   { color: #e3b341; font-weight: 700; min-width: 70px; font-size: 11px; }
      .rt-tl-msg { color: #cdd9e5; }
      /* ── debug tab ── */
      .rt-debug-grid { display: flex; flex-direction: column; gap: 3px; }
      .rt-debug-row  { display: flex; gap: 10px; font-size: 12px; }
      .rt-debug-key  { color: #768390; min-width: 110px; flex-shrink: 0; }
      .rt-debug-val  { color: #cdd9e5; }
      /* ── control slot ── */
      .rt-ctrl-slot {
        padding: 8px 12px;
        background: #21262d;
        border-top: 1px solid #30363d;
      }
    `;
    document.head.appendChild(s);
  }

  /* ── DOM HELPER ───────────────────────────────────────────────── */
  function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }

  /* ── CREATE RUNTIME LAYOUT ────────────────────────────────────── */
  function create(mount, opts = {}) {
    injectStyles();

    const {
      code = '',
      title = '',
      timeComplexity = '',
      spaceComplexity = '',
    } = opts;

    const codeLines = typeof code === 'string' ? code.split('\n') : (code || []);

    mount.innerHTML = '';
    const root = el('div', 'rt-root');
    mount.appendChild(root);

    /* ── header ── */
    const header = el('div', 'rt-header');
    if (title) {
      const t = el('div', 'rt-title');
      t.textContent = title;
      header.appendChild(t);
    }
    if (timeComplexity || spaceComplexity) {
      header.appendChild(
        window.DSAViz.makeComplexityBadge(timeComplexity || '—', spaceComplexity || '—')
      );
    }
    root.appendChild(header);

    /* ── main split ── */
    const main = el('div', 'rt-main');

    /* code panel */
    const codePanel = el('div', 'rt-code-panel');
    const codeEl = el('div', 'rt-code');
    const lineEls = [];
    codeLines.forEach((line, i) => {
      const row = el('div', 'rt-code-row');
      const num = el('span', 'rt-line-num');
      num.textContent = String(i + 1);
      const text = el('span', 'rt-line-text');
      text.textContent = line || ' ';
      row.appendChild(num);
      row.appendChild(text);
      codeEl.appendChild(row);
      lineEls.push(row);
    });
    codePanel.appendChild(codeEl);
    main.appendChild(codePanel);

    /* visual panel */
    const vizPanel = el('div', 'rt-viz-panel');
    main.appendChild(vizPanel);
    root.appendChild(main);

    /* ── narration ── */
    const narWrap = el('div', 'rt-nar-wrap');
    const nar = window.DSAViz.makeNarration('Press ▶▶ or Play to start');
    narWrap.appendChild(nar);
    root.appendChild(narWrap);

    /* ── bottom tabs ── */
    const TAB_NAMES = ['Variables', 'Memory', 'Timeline', 'Debug'];
    const bottom = el('div', 'rt-bottom');
    const tabBar = el('div', 'rt-tab-bar');
    const tabPanes = {};
    let activeTab = 'Variables';

    TAB_NAMES.forEach(name => {
      const btn = el('button', 'rt-tab');
      btn.textContent = name;
      if (name === activeTab) btn.classList.add('rt-tab-active');
      btn.onclick = () => {
        activeTab = name;
        tabBar.querySelectorAll('.rt-tab').forEach(b => b.classList.remove('rt-tab-active'));
        btn.classList.add('rt-tab-active');
        Object.entries(tabPanes).forEach(([k, p]) => {
          p.style.display = k === name ? '' : 'none';
        });
      };
      tabBar.appendChild(btn);
    });
    bottom.appendChild(tabBar);

    TAB_NAMES.forEach(name => {
      const pane = el('div', 'rt-tab-pane');
      pane.style.display = name === activeTab ? '' : 'none';
      bottom.appendChild(pane);
      tabPanes[name] = pane;
    });
    root.appendChild(bottom);

    /* control bar slot */
    const ctrlSlot = el('div', 'rt-ctrl-slot');
    root.appendChild(ctrlSlot);

    /* timeline state */
    const timelineEvents = [];
    let prevVars = {};

    /* ── RENDER STEP ── */
    function renderStep(step, idx) {
      if (!step) {
        lineEls.forEach(r => r.classList.remove('rt-active'));
        vizPanel.innerHTML = '';
        Object.values(tabPanes).forEach(p => p.innerHTML = '');
        timelineEvents.length = 0;
        prevVars = {};
        nar.update('Reset');
        return;
      }

      /* code highlight */
      lineEls.forEach(r => r.classList.remove('rt-active'));
      if (step.line !== undefined && lineEls[step.line]) {
        lineEls[step.line].classList.add('rt-active');
        lineEls[step.line].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      /* narration */
      const narColor = step.error ? '#f78166' : step.success ? '#56d364' : '#1f6feb';
      nar.update(step.narration || `Step ${idx + 1}`, narColor);

      /* visualizations */
      renderVisuals(vizPanel, step);

      /* tab panes */
      renderVariables(tabPanes['Variables'], step.variables || {}, prevVars);
      prevVars = { ...(step.variables || {}) };
      renderMemory(tabPanes['Memory'], step.stack || step.callStack || [], step.heap || {});
      if (step.timeLabel || step.narration) {
        timelineEvents.push({ t: step.timeLabel || `step ${idx + 1}`, msg: step.narration || '' });
      }
      renderTimeline(tabPanes['Timeline'], timelineEvents);
      renderDebug(tabPanes['Debug'], step, idx);
    }

    return {
      animate(steps, opts = {}) {
        const ctrl = window.DSAViz.makeStepCtrl(steps, (step, idx) => {
          renderStep(step, idx);
          ctrl._updateCtr?.();
        });
        if (opts.speed) ctrl.setSpeed(opts.speed);
        ctrlSlot.innerHTML = '';
        ctrlSlot.appendChild(window.DSAViz.makeControlBar(ctrl));
        return ctrl;
      },
    };
  }

  /* ── VISUALIZATION RENDERER ───────────────────────────────────── */
  const PTR_NAMES = new Set(['i','j','k','l','left','right','mid','ptr','start','end','lo','hi','p','q','slow','fast','top','bot','head','tail']);

  function renderVisuals(panel, step) {
    panel.innerHTML = '';
    const { DSAViz } = window;

    /* collect integer vars that could be array pointers */
    const indexVars = {};
    if (step.variables) {
      Object.entries(step.variables).forEach(([name, val]) => {
        if (Number.isInteger(val) && val >= 0 && PTR_NAMES.has(name)) indexVars[name] = val;
      });
    }

    /* arrays */
    if (step.arrays) {
      Object.entries(step.arrays).forEach(([name, cfg]) => {
        const block = vizBlock(name);
        panel.appendChild(block.wrap);
        if (DSAViz.array) {
          const enriched = Object.assign({}, cfg);
          if (!enriched.pointers) {
            const ptrs = {};
            const len = (enriched.arr || []).length;
            Object.entries(indexVars).forEach(([pName, idx]) => {
              if (idx < len) ptrs[pName] = idx;
            });
            if (Object.keys(ptrs).length) enriched.pointers = ptrs;
          }
          DSAViz.array.render(block.inner, enriched);
        }
      });
    }

    /* graphs */
    if (step.graphs) {
      Object.entries(step.graphs).forEach(([name, cfg]) => {
        const block = vizBlock(name);
        panel.appendChild(block.wrap);
        if (DSAViz.graph) DSAViz.graph.render(block.inner, cfg);
      });
    }

    /* trees */
    if (step.trees) {
      Object.entries(step.trees).forEach(([name, cfg]) => {
        const block = vizBlock(name);
        panel.appendChild(block.wrap);
        if (DSAViz.tree) DSAViz.tree.render(block.inner, cfg);
      });
    }

    /* dp */
    if (step.dp) {
      const block = vizBlock(step.dp.title || 'DP Table');
      panel.appendChild(block.wrap);
      if (DSAViz.dp) {
        if (step.dp.type === '2d') DSAViz.dp.table2D(block.inner, step.dp);
        else DSAViz.dp.table1D(block.inner, step.dp);
      }
    }

    /* matrix */
    if (step.matrix) {
      const block = vizBlock(step.matrix.title || 'Matrix');
      panel.appendChild(block.wrap);
      if (DSAViz.matrix) DSAViz.matrix.render(block.inner, step.matrix);
    }

    /* hashmaps — rendered as key→value chips */
    if (step.maps) {
      Object.entries(step.maps).forEach(([name, mapData]) => {
        const block = vizBlock(`${name} (map)`);
        const chips = el('div', 'rt-map-chips');
        Object.entries(mapData).forEach(([k, v]) => {
          const chip = el('div', 'rt-map-chip');
          chip.innerHTML = `<span style="color:#e3b341">${k}</span><span style="color:#768390">→</span><span style="color:#56d364">${v}</span>`;
          chips.appendChild(chip);
        });
        block.inner.appendChild(chips);
        panel.appendChild(block.wrap);
      });
    }

    /* sets — rendered as pill list */
    if (step.sets) {
      Object.entries(step.sets).forEach(([name, items]) => {
        const block = vizBlock(`${name} (set)`);
        const pills = el('div', 'rt-map-chips');
        if (!items.length) {
          const empty = el('span');
          empty.style.cssText = 'color:#484f58;font-size:11px';
          empty.textContent = '∅ empty';
          pills.appendChild(empty);
        }
        items.forEach(v => {
          const pill = el('div', 'rt-map-chip');
          pill.style.borderColor = '#7c4dff';
          pill.innerHTML = `<span style="color:#c9b1ff">${JSON.stringify(v)}</span>`;
          pills.appendChild(pill);
        });
        block.inner.appendChild(pills);
        panel.appendChild(block.wrap);
      });
    }

    /* scalar variables — show primitives (numbers/booleans/strings) as chips */
    if (step.variables) {
      const scalars = {};
      Object.entries(step.variables).forEach(([name, val]) => {
        if (val !== null && val !== undefined && typeof val !== 'object' && typeof val !== 'function') {
          scalars[name] = val;
        }
      });
      if (Object.keys(scalars).length) {
        const block = vizBlock('Variables');
        const chips = el('div', 'rt-map-chips');
        Object.entries(scalars).forEach(([name, val]) => {
          const isIdx = PTR_NAMES.has(name) && Number.isInteger(val);
          const chip = el('div', 'rt-map-chip');
          chip.style.borderColor = isIdx ? '#e3b341' : '#30363d';
          chip.innerHTML =
            `<span style="color:${isIdx ? '#e3b341' : '#58a6ff'};font-weight:700">${name}</span>` +
            `<span style="color:#768390">=</span>` +
            `<span style="color:#56d364">${JSON.stringify(val)}</span>`;
          chips.appendChild(chip);
        });
        block.inner.appendChild(chips);
        panel.appendChild(block.wrap);
      }
    }

    /* recursion call stack as mini stack visual */
    const stackData = step.stack || step.callStack;
    if (stackData?.length) {
      const block = vizBlock('Call Stack');
      const frames = el('div', 'rt-stack-frames');
      [...stackData].reverse().forEach((fn, i) => {
        const frame = el('div', i === 0 ? 'rt-stack-frame rt-top' : 'rt-stack-frame');
        frame.textContent = fn;
        frames.appendChild(frame);
      });
      if (step.recursionDepth !== undefined) {
        const depth = el('div');
        depth.style.cssText = 'font-size:10px;color:#768390;margin-top:4px';
        depth.textContent = `depth: ${step.recursionDepth}`;
        block.inner.appendChild(depth);
      }
      block.inner.prepend(frames);
      panel.appendChild(block.wrap);
    }
  }

  function vizBlock(name) {
    const wrap = el('div', 'rt-viz-block');
    if (name) {
      const lbl = el('div', 'rt-viz-label');
      lbl.textContent = name;
      wrap.appendChild(lbl);
    }
    const inner = el('div');
    wrap.appendChild(inner);
    return { wrap, inner };
  }

  /* ── TAB RENDERERS ────────────────────────────────────────────── */
  function renderVariables(pane, vars, prev) {
    pane.innerHTML = '';
    const keys = Object.keys(vars);
    if (!keys.length) {
      pane.innerHTML = '<span style="color:#768390;font-size:12px">No variables tracked</span>';
      return;
    }
    const grid = el('div', 'rt-var-grid');
    keys.forEach(name => {
      const val = vars[name];
      const changed = JSON.stringify(prev[name]) !== JSON.stringify(val);
      const chip = el('div', changed ? 'rt-var-chip rt-changed' : 'rt-var-chip');
      chip.innerHTML = `<span class="rt-var-name">${name}</span><span class="rt-var-eq">=</span><span class="rt-var-val">${JSON.stringify(val)}</span>`;
      grid.appendChild(chip);
    });
    pane.appendChild(grid);
  }

  function renderMemory(pane, callStack, heap) {
    pane.innerHTML = '';
    if (callStack.length) {
      const lbl = el('div', 'rt-mem-section-label');
      lbl.textContent = 'Call Stack';
      pane.appendChild(lbl);
      const frames = el('div', 'rt-stack-frames');
      [...callStack].reverse().forEach((fn, i) => {
        const frame = el('div', i === 0 ? 'rt-stack-frame rt-top' : 'rt-stack-frame');
        frame.textContent = fn;
        frames.appendChild(frame);
      });
      pane.appendChild(frames);
    }
    if (Object.keys(heap).length) {
      const lbl = el('div', 'rt-mem-section-label');
      lbl.textContent = 'Heap';
      pane.appendChild(lbl);
      const rows = el('div', 'rt-heap-rows');
      Object.entries(heap).forEach(([k, v]) => {
        const row = el('div', 'rt-heap-row');
        row.innerHTML = `<span style="color:#58a6ff">${k}</span><span style="color:#768390">→</span><span style="color:#cdd9e5">${v}</span>`;
        rows.appendChild(row);
      });
      pane.appendChild(rows);
    }
    if (!callStack.length && !Object.keys(heap).length) {
      pane.innerHTML = '<span style="color:#768390;font-size:12px">No memory data</span>';
    }
  }

  function renderTimeline(pane, events) {
    pane.innerHTML = '';
    if (!events.length) return;
    const list = el('div', 'rt-timeline');
    events.forEach(ev => {
      const row = el('div', 'rt-tl-row');
      const t = el('span', 'rt-tl-t');
      t.textContent = ev.t;
      const msg = el('span', 'rt-tl-msg');
      msg.textContent = ev.msg;
      row.appendChild(t);
      row.appendChild(msg);
      list.appendChild(row);
    });
    pane.appendChild(list);
    pane.scrollTop = pane.scrollHeight;
  }

  function renderDebug(pane, step, idx) {
    pane.innerHTML = '';
    const items = [];
    if (step.line !== undefined) items.push(['Line', step.line + 1]);
    if (step.ops !== undefined) items.push(['Operations', step.ops]);
    if (step.recursionDepth !== undefined) items.push(['Recursion Depth', step.recursionDepth]);
    if (step.variables) {
      Object.entries(step.variables).forEach(([k, v]) => items.push([k, JSON.stringify(v)]));
    }
    if (!items.length) {
      pane.innerHTML = '<span style="color:#768390;font-size:12px">No debug info</span>';
      return;
    }
    const grid = el('div', 'rt-debug-grid');
    items.forEach(([k, v]) => {
      const row = el('div', 'rt-debug-row');
      row.innerHTML = `<span class="rt-debug-key">${k}</span><span class="rt-debug-val">${v}</span>`;
      grid.appendChild(row);
    });
    pane.appendChild(grid);
  }

  window.DSAViz.runtime = { create };
})();
