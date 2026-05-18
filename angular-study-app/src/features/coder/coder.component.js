/**
 * CoderPage — AI Runtime Simulation Engine
 * Implements CODER.md vision: paste JS code → cinematic step-by-step simulation
 *
 * Requires: DSAViz.tracer (dsa-viz-tracer.js) + DSAViz.runtime (dsa-viz-runtime.js)
 */
(function () {
  "use strict";
  window.CoderPage = window.CoderPage || {};

  const DEFAULT_CODE = `function twoSum(nums, target) {
  const mp = {};
  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    const diff = target - n;
    if (mp[diff] !== undefined) {
      return [mp[diff], i];
    }
    mp[n] = i;
  }
  return [];
}
const nums = [2, 7, 11, 15];
const target = 9;
const result = twoSum(nums, target);`;

  /* ── PRESET SELECTOR ──────────────────────────────────────────────── */
  function buildPresetOptions() {
    const P = (window.DSAViz && window.DSAViz.tracer && window.DSAViz.tracer.PRESETS) || {};
    return Object.entries(P).map(([k, v]) =>
      `<option value="${k}">${v.title}</option>`
    ).join("");
  }

  /* ── LINE NUMBER OVERLAY ──────────────────────────────────────────── */
  function syncLineNumbers(textarea, lineNumEl) {
    const lines = textarea.value.split("\n").length;
    lineNumEl.innerHTML = Array.from({ length: lines }, (_, i) => `<span>${i + 1}</span>`).join("");
    lineNumEl.scrollTop = textarea.scrollTop;
  }

  /* ── RENDER ───────────────────────────────────────────────────────── */
  function mount(host) {
    host.innerHTML = `
      <div class="coder-root">
        <div class="coder-toolbar">
          <div class="coder-toolbar-left">
            <span class="coder-brand">⚡ Code Runner</span>
            <select class="coder-preset-select" id="coder-preset-select">
              <option value="">— Load example —</option>
              ${buildPresetOptions()}
            </select>
          </div>
          <div class="coder-toolbar-right">
            <label class="coder-speed-label">
              Speed
              <select class="coder-speed-select" id="coder-speed-select">
                <option value="800">0.5×</option>
                <option value="500" selected>1×</option>
                <option value="280">2×</option>
                <option value="120">4×</option>
              </select>
            </label>
            <button class="coder-run-btn" id="coder-run-btn">▶ Run</button>
          </div>
        </div>

        <div class="coder-split">
          <!-- LEFT: code editor -->
          <div class="coder-editor-panel">
            <div class="coder-editor-wrap">
              <div class="coder-line-numbers" id="coder-line-nums"></div>
              <textarea
                class="coder-textarea"
                id="coder-textarea"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                placeholder="Paste your JavaScript algorithm here…"
              >${DEFAULT_CODE}</textarea>
            </div>
            <div class="coder-editor-hint">
              JavaScript only · max 300 steps · arrays + hashmaps auto-visualized
            </div>
          </div>

          <!-- RIGHT: simulation output -->
          <div class="coder-output-panel" id="coder-output-panel">
            <div class="coder-output-placeholder" id="coder-output-placeholder">
              <div class="coder-placeholder-icon">▶</div>
              <p>Click <strong>Run</strong> to start the simulation</p>
              <p class="coder-placeholder-sub">Step through your algorithm and watch variables, arrays, and hashmaps update in real time</p>
            </div>
          </div>
        </div>
      </div>
    `;

    const textarea   = host.querySelector("#coder-textarea");
    const lineNums   = host.querySelector("#coder-line-nums");
    const runBtn     = host.querySelector("#coder-run-btn");
    const presetSel  = host.querySelector("#coder-preset-select");
    const speedSel   = host.querySelector("#coder-speed-select");
    const outputPanel = host.querySelector("#coder-output-panel");
    const placeholder = host.querySelector("#coder-output-placeholder");

    /* track active runtime ctrl so we can stop before re-run */
    let activeCtrl = null;

    /* initial line numbers */
    syncLineNumbers(textarea, lineNums);

    /* sync on input / scroll */
    textarea.addEventListener("input", () => syncLineNumbers(textarea, lineNums));
    textarea.addEventListener("scroll", () => { lineNums.scrollTop = textarea.scrollTop; });

    /* tab key inserts 2 spaces */
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end   = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        syncLineNumbers(textarea, lineNums);
      }
    });

    /* preset loader */
    presetSel.addEventListener("change", () => {
      const key = presetSel.value;
      if (!key) return;
      const P = window.DSAViz?.tracer?.PRESETS;
      if (!P || !P[key]) return;
      textarea.value = P[key].code;
      syncLineNumbers(textarea, lineNums);
      presetSel.value = "";
    });

    /* run button */
    runBtn.addEventListener("click", () => {
      const code = textarea.value.trim();
      if (!code) return;

      /* stop previous simulation */
      if (activeCtrl) { activeCtrl.stop(); activeCtrl = null; }

      /* guard: make sure DSAViz.tracer is loaded */
      if (!window.DSAViz?.tracer?.run) {
        showError(outputPanel, "DSAViz.tracer not loaded. Check script tags in index.html.");
        return;
      }
      if (!window.DSAViz?.runtime?.create) {
        showError(outputPanel, "DSAViz.runtime not loaded. Check script tags in index.html.");
        return;
      }

      runBtn.disabled = true;
      runBtn.textContent = "⏳ Tracing…";

      /* run async so UI can repaint */
      setTimeout(() => {
        try {
          const steps = window.DSAViz.tracer.run(code, { maxSteps: 300 });

          if (!steps || steps.length === 0) {
            showError(outputPanel, "No steps captured. Make sure the code runs without syntax errors.");
            runBtn.disabled = false;
            runBtn.textContent = "▶ Run";
            return;
          }

          /* detect title/complexity from preset if code matches */
          const P = window.DSAViz?.tracer?.PRESETS || {};
          let title = "Code Simulation";
          let timeComplexity = "";
          let spaceComplexity = "";
          for (const p of Object.values(P)) {
            if (p.code.trim() === code.trim()) {
              title = p.title;
              timeComplexity = p.timeComplexity || "";
              spaceComplexity = p.spaceComplexity || "";
              break;
            }
          }

          /* clear output, mount runtime */
          placeholder.style.display = "none";
          outputPanel.innerHTML = "";

          const speed = Number(speedSel.value) || 500;

          const rt = window.DSAViz.runtime.create(outputPanel, {
            code,
            title,
            timeComplexity,
            spaceComplexity,
          });

          activeCtrl = rt.animate(steps, { speed });
          speedSel.onchange = () => { if (activeCtrl) activeCtrl.setSpeed(Number(speedSel.value)); };

        } catch (err) {
          showError(outputPanel, `Tracer error: ${err.message}`);
        } finally {
          runBtn.disabled = false;
          runBtn.textContent = "▶ Run";
        }
      }, 0);
    });

    /* auto-run default code on first mount */
    runBtn.click();

    /* cleanup: stop any playing simulation when unmounted */
    return () => {
      if (activeCtrl) { activeCtrl.stop(); activeCtrl = null; }
    };
  }

  function showError(panel, msg) {
    panel.innerHTML = `
      <div style="padding:32px;color:#f85149;font-family:monospace;font-size:14px;">
        <strong>Error</strong><br>${msg}
      </div>`;
  }

  window.CoderPage = { mount };
})();
