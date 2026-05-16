/**
 * signal.js — Angular 17-style reactive signal primitive
 * Exposes: window.App.signal
 */
(function () {
  'use strict';
  window.App = window.App || {};

  window.App.signal = function signal(initial) {
    let value = initial;
    const subs = new Set();
    const s = () => value;
    s.set = (v) => { if (v !== value) { value = v; subs.forEach(fn => fn(value)); } };
    s.update = (fn) => s.set(fn(value));
    s.subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
    return s;
  };
})();
