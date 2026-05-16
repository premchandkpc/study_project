/**
 * animation.model.js — animation step shapes + factories
 * Angular equiv: animation.model.ts
 * Exposes: window.App.Models.AnimationStep, window.App.Models.createFlowStep, etc.
 *
 * In Angular this would be:
 *   export interface AnimationStep { index: number; label: string; ... }
 */
(function () {
  'use strict';
  window.App = window.App || {};
  window.App.Models = window.App.Models || {};

  // Generic animation step (used by flow lab, UML lab, arch lab)
  window.App.Models.createFlowStep = function createFlowStep(fields) {
    return Object.assign({
      label:  '',      // readout title shown to user
      detail: '',      // readout body
      path:   [],      // node ids to highlight for this step
      from:   null,    // shorthand single source node id
      to:     null,    // shorthand single target node id
    }, fields);
  };

  // UML message step
  window.App.Models.createUmlMessage = function createUmlMessage(fields) {
    return Object.assign({
      label:  '',
      from:   '',
      to:     '',
      type:   'sync',  // 'sync' | 'async'
      detail: '',
      async:  false,
    }, fields);
  };

  // DSA tracer step (mirrors dsa-viz-runtime step format)
  window.App.Models.createTracerStep = function createTracerStep(fields) {
    return Object.assign({
      line:           0,
      codeLine:       '',
      variables:      {},   // { name: value }
      arrays:         {},   // { name: number[] }
      maps:           {},   // { name: Map-like obj }
      sets:           {},   // { name: Set-like obj }
      stack:          [],   // call stack frames
      recursionDepth: 0,
      narration:      '',
      timeLabel:      '',
      ops:            0,
    }, fields);
  };

  // Complexity descriptor for a topic
  window.App.Models.createComplexity = function createComplexity(fields) {
    return Object.assign({
      time:   null,   // Complexity constant from window.App.Constants.Complexity
      space:  null,
      notes:  '',
    }, fields);
  };
})();
