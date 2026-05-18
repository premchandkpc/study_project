/**
 * router.service.js — hash-based router (mirrors Angular Router)
 * Exposes: window.App.Router
 * Load after: core/signal.js, core/injector.js
 */
(function () {
  "use strict";
  const { Injector, signal } = window.App;

  window.App.Router = Injector.provide("Router", () => {
    function parseHash() {
      const h = (location.hash || "#/").replace(/^#/, "");
      const [path, query] = h.split("?");
      return { path: path || "/", query: query || "" };
    }

    const current = signal(parseHash());
    window.addEventListener("hashchange", () => current.set(parseHash()));

    return {
      current,
      navigate: (path) => { location.hash = "#" + path; },
    };
  });
})();
