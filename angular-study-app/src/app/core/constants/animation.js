/**
 * animation.js — timing + easing constants
 * Angular equiv: animation.constants.ts used with AnimationBuilder
 * Exposes: window.App.Constants.Animation
 */
(function () {
  'use strict';
  window.App = window.App || {};
  window.App.Constants = window.App.Constants || {};

  window.App.Constants.Animation = Object.freeze({
    // Durations (ms)
    INSTANT:       0,
    FAST:          150,
    NORMAL:        300,
    SLOW:          600,
    VERY_SLOW:     1000,

    // Auto-play intervals (ms)
    FLOW_STEP:     1800,   // flow lab step interval
    UML_STEP:      2300,   // UML lab step interval
    DSA_STEP:      800,    // DSA tracer step interval

    // Easing
    EASE_OUT:      'cubic-bezier(0.16, 1, 0.3, 1)',
    EASE_IN_OUT:   'cubic-bezier(0.4, 0, 0.2, 1)',
    SPRING:        'cubic-bezier(0.34, 1.56, 0.64, 1)',

    // Step playback states
    STATE: Object.freeze({
      IDLE:    'idle',
      PLAYING: 'playing',
      PAUSED:  'paused',
      DONE:    'done',
    }),
  });
})();
