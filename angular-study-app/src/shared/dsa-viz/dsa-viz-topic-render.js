/**
 * dsa-viz-topic-render.js — shared topic render helper
 * Exposes: DSAViz.topic.render(mount, opts)
 * Each DSA topic file calls this directly — no global _dsaRenderViz needed.
 */
(function () {
  "use strict";
  window.DSAViz = window.DSAViz || {};
  window.DSAViz.topic = window.DSAViz.topic || {};

  /**
   * Self-contained topic renderer.
   * @param {HTMLElement} mount
   * @param {object} opts
   * @param {string} opts.title   — display title e.g. 'sliding.maxSumFixed'
   * @param {string} opts.time    — complexity e.g. 'O(n)'
   * @param {string} opts.space   — space e.g. 'O(1)'
   * @param {string} opts.code    — the algorithm JS code to trace
   * @param {object} [opts.tracer] — optional tracer options passed to DSAViz.tracer.run
   */
  window.DSAViz.topic.render = function renderTopic(mount, opts) {
    if (!mount) return;

    try {
      const steps = window.DSAViz.tracer.run(opts.code, opts.tracer || {});
      window.DSAViz.runtime.create(mount, {
        title:           opts.title || "",
        code:            opts.code  || "",   // ← populates code panel
        timeComplexity:  opts.time  || "",   // ← correct key name
        spaceComplexity: opts.space || "",   // ← correct key name
      }).animate(steps);
    } catch (e) {
      mount.innerHTML = `<div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace">Render error: ${e.message}</div>`;
      console.error("[DSAViz.topic.render]", e);
    }
  };
})();
