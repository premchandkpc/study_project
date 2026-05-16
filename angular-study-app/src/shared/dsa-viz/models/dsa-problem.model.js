/**
 * dsa-problem.model.js — DSAProblem base class
 * Exposes: window.DSA.Problem
 *
 * OOP base for all DSA problem templates.
 * Subclasses override: getTracerOpts(), postProcess(steps), getPatternLabel()
 *
 * Angular equiv: abstract base @Component class with lifecycle hooks
 *
 * Usage (in topic file visual function):
 *   new DSA.SlidingWindowProblem(mount, { title, time, space, code }).render();
 */
(function () {
  'use strict';
  window.DSA = window.DSA || {};

  class DSAProblem {
    /**
     * @param {HTMLElement} mount
     * @param {object}      opts
     * @param {string}      opts.title     — display title e.g. 'sliding.maxSumFixed'
     * @param {string}      opts.time      — time complexity e.g. 'O(n)'
     * @param {string}      opts.space     — space complexity e.g. 'O(1)'
     * @param {string}      opts.code      — algorithm JS code to trace
     * @param {string}      [opts.pattern] — pattern description shown in header
     * @param {object}      [opts.tracer]  — override tracer options
     */
    constructor(mount, opts = {}) {
      if (!mount) throw new Error('DSAProblem: mount element required');
      if (!opts.code) throw new Error('DSAProblem: code required');

      this.mount   = mount;
      this.title   = opts.title   || '';
      this.time    = opts.time    || '';
      this.space   = opts.space   || '';
      this.code    = opts.code;
      this.pattern = opts.pattern || this.getPatternLabel();
      this.tracer  = opts.tracer  || {};
      this._runtime = null;
    }

    // ── Override in subclasses ──────────────────────────────────

    /** Returns default label for this problem type */
    getPatternLabel() { return 'Algorithm'; }

    /**
     * Returns tracer options: which arrays/vars to watch.
     * Subclasses define opinionated defaults per pattern type.
     */
    getTracerOpts() {
      return {
        arrays: {},
        vars:   [],
      };
    }

    /**
     * Post-process tracer steps — add visual hints, narration overrides.
     * Subclasses override to enrich steps with pattern-specific annotations.
     * @param {DSAStep[]} steps
     * @returns {DSAStep[]}
     */
    postProcess(steps) { return steps; }

    // ── Core lifecycle ──────────────────────────────────────────

    /** Build steps: run tracer → convert to DSAStep → post-process */
    buildSteps() {
      const mergedOpts = Object.assign({}, this.getTracerOpts(), this.tracer);
      const raw = window.DSAViz.tracer.run(this.code, mergedOpts);
      const steps = raw.map(r => window.DSA.Step.fromTracer(r));
      return this.postProcess(steps);
    }

    /** Mount and animate — main entry point called from topic visual() */
    render() {
      try {
        const steps = this.buildSteps();
        this._runtime = window.DSAViz.runtime.create(this.mount, {
          title:           this.title,
          code:            this.code,        // ← populates left code panel
          timeComplexity:  this.time,        // ← runtime uses timeComplexity not time
          spaceComplexity: this.space,       // ← runtime uses spaceComplexity not space
        });
        this._runtime.animate(steps);
      } catch (e) {
        console.error('[DSAProblem.render]', this.title, e);
        this.mount.innerHTML = `
          <div style="color:#f85149;padding:16px;font-size:12px;font-family:monospace;background:#161b22;border-radius:8px;border:1px solid #30363d">
            <strong>${this.title}</strong><br/>${e.message}
          </div>`;
      }
    }

    /** Clean up — call when navigating away */
    destroy() {
      if (this._runtime && this._runtime.destroy) this._runtime.destroy();
    }
  }

  window.DSA.Problem = DSAProblem;
})();
