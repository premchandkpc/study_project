/**
 * dsa-step.model.js — DSAStep data model
 * Exposes: window.DSA.Step
 *
 * OOP model for a single animation step in any DSA problem.
 * Every template produces an array of DSAStep objects.
 *
 * Angular equiv: interface + class with factory method
 */
(function () {
  "use strict";
  window.DSA = window.DSA || {};

  class DSAStep {
    constructor(fields = {}) {
      this.line           = fields.line           ?? 0;
      this.codeLine       = fields.codeLine       ?? "";
      this.variables      = fields.variables      ?? {};   // { name: primitiveValue }
      this.arrays         = fields.arrays         ?? {};   // { name: number[] }
      this.maps           = fields.maps           ?? {};   // { name: { key: val } }
      this.sets           = fields.sets           ?? {};   // { name: val[] }
      this.stack          = fields.stack          ?? [];   // call stack frames
      this.recursionDepth = fields.recursionDepth ?? 0;
      this.narration      = fields.narration      ?? "";
      this.timeLabel      = fields.timeLabel      ?? "";
      this.ops            = fields.ops            ?? 0;
      // Visual hints — used by animations layer
      this.highlight      = fields.highlight      ?? {};   // { arrayName: { indices: [], color } }
      this.pointers       = fields.pointers       ?? {};   // { arrayName: { ptrName: idx } }
      this.windowRange    = fields.windowRange    ?? null; // { arrayName, left, right }
      this.phase          = fields.phase          ?? null; // 'init'|'expand'|'shrink'|'found'|'done'
    }

    // Factory — create from raw tracer output
    static fromTracer(raw) {
      return new DSAStep(raw);
    }

    // Clone with overrides — immutable update pattern
    with(overrides) {
      return new DSAStep({ ...this, ...overrides });
    }
  }

  window.DSA.Step = DSAStep;
})();
