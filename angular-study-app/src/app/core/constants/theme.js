/**
 * theme.js — application theme tokens + theme switching
 * Angular equiv: theme.constants.ts + ThemeService
 * Exposes: window.App.Constants.Theme
 */
(function () {
  'use strict';
  window.App = window.App || {};
  window.App.Constants = window.App.Constants || {};

  const DARK = Object.freeze({
    name:           'dark',
    BG:             '#0d1117',
    SURFACE:        '#161b22',
    SURFACE_2:      '#21262d',
    BORDER:         '#30363d',
    TEXT_PRIMARY:   '#e6edf3',
    TEXT_SECONDARY: '#8b949e',
    TEXT_MUTED:     '#6e7681',
    ACCENT:         '#58a6ff',
    CODE_BG:        '#0d1320',
  });

  const LIGHT = Object.freeze({
    name:           'light',
    BG:             '#ffffff',
    SURFACE:        '#f6f8fa',
    SURFACE_2:      '#eaeef2',
    BORDER:         '#d0d7de',
    TEXT_PRIMARY:   '#1f2328',
    TEXT_SECONDARY: '#656d76',
    TEXT_MUTED:     '#818b98',
    ACCENT:         '#0969da',
    CODE_BG:        '#f6f8fa',
  });

  window.App.Constants.Theme = Object.freeze({
    DARK,
    LIGHT,
    // Returns current active theme tokens
    current() {
      return document.documentElement.getAttribute('data-theme') === 'light' ? LIGHT : DARK;
    },
  });
})();
