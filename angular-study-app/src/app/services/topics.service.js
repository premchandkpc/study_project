/**
 * topics.service.js — aggregates all topic data from topic modules
 * Exposes: window.App.TopicsService
 * Load after: core/injector.js, all topic data files (window.JAVA_TOPICS etc.)
 */
(function () {
  'use strict';
  const { Injector } = window.App;

  window.App.TopicsService = Injector.provide('TopicsService', () => {
    const all = []
      .concat(window.JAVA_TOPICS || [])
      .concat(window.GO_TOPICS || [])
      .concat(window.PYTHON_TOPICS || [])
      .concat(window.MICRO_TOPICS || [])
      .concat(window.SYSDESIGN_TOPICS || [])
      .concat(window.DSA_TOPICS || [])
      .concat(window.KAFKA_TOPICS || [])
      .concat(window.RUST_TOPICS || [])
      .concat(window.ANGULAR_TOPICS || [])
      .concat(window.REACT_TOPICS || [])
      .concat(window.DB_TOPICS || []);

    return {
      all,
      byId: (id) => all.find(t => t.id === id),
      byArea: (area) => all.filter(t => t.area === area),
      search: (q) => {
        if (!q) return all;
        const s = q.toLowerCase();
        return all.filter(t =>
          t.title.toLowerCase().includes(s) ||
          (t.concept || '').toLowerCase().includes(s) ||
          (t.tags || []).join(' ').toLowerCase().includes(s)
        );
      },
    };
  });
})();
