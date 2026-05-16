/**
 * progress.service.js — localStorage-backed topic completion tracking
 * Exposes: window.App.ProgressService
 * Load after: core/signal.js, core/injector.js
 */
(function () {
  'use strict';
  const { Injector, signal } = window.App;

  window.App.ProgressService = Injector.provide('ProgressService', () => {
    const STORAGE_KEY = 'study-lab:done';

    function load() {
      try {
        return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
      } catch {
        return new Set();
      }
    }

    const state = signal(load());
    const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify([...state()]));

    return {
      state,
      toggle(id) {
        state.update(s => {
          const next = new Set(s);
          next.has(id) ? next.delete(id) : next.add(id);
          persist();
          return next;
        });
      },
      isDone: (id) => state().has(id),
      ratio(ids) {
        if (!ids.length) return 0;
        return ids.filter(id => state().has(id)).length / ids.length;
      },
    };
  });
})();
