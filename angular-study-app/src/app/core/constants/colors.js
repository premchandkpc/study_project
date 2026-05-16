/**
 * colors.js — design-token color constants
 * Angular equiv: environment.ts + theme tokens
 * Exposes: window.App.Constants.Colors
 */
(function () {
  'use strict';
  window.App = window.App || {};
  window.App.Constants = window.App.Constants || {};

  window.App.Constants.Colors = Object.freeze({
    // Area brand colors (mirror CSS vars in styles.css)
    JAVA:          '#f89820',
    GOLANG:        '#00acd7',
    PYTHON:        '#3776ab',
    MICRO:         '#a78bfa',
    SYSDESIGN:     '#34d399',
    DSA:           '#f0883e',
    KAFKA:         '#fc4f30',
    RUST:          '#ce422b',
    ANGULAR:       '#dd0031',
    REACT:         '#61dafb',
    DATABASES:     '#60a5fa',

    // Semantic UI
    ACCENT:        '#58a6ff',
    SUCCESS:       '#56d364',
    WARNING:       '#e3b341',
    DANGER:        '#f85149',
    INFO:          '#79c0ff',

    // Surface palette
    BG:            '#0d1117',
    SURFACE:       '#161b22',
    SURFACE_2:     '#21262d',
    BORDER:        '#30363d',
    BORDER_MUTED:  '#21262d',

    // Text
    TEXT_PRIMARY:  '#e6edf3',
    TEXT_SECONDARY:'#8b949e',
    TEXT_MUTED:    '#6e7681',

    // Area map (keyed by area string — used by components)
    AREA: {
      java:          '#f89820',
      golang:        '#00acd7',
      python:        '#3776ab',
      microservices: '#a78bfa',
      sysdesign:     '#34d399',
      dsa:           '#f0883e',
      kafka:         '#fc4f30',
      rust:          '#ce422b',
      angular:       '#dd0031',
      react:         '#61dafb',
      databases:     '#60a5fa',
    },
  });
})();
