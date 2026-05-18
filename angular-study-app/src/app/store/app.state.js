/**
 * app.state.js — global state shape + initial state
 * Angular equiv: app.state.ts (NgRx State interface)
 * Exposes: window.App.Store.initialState, window.App.Store.State (signal)
 *
 * In Angular/NgRx:
 *   export interface AppState { progress: ProgressState; ui: UiState; router: RouterState; }
 */
(function () {
  "use strict";
  const { signal, Injector } = window.App;

  window.App.Store = window.App.Store || {};

  // State shape — what the whole app knows at any moment
  const initialState = Object.freeze({
    // Which topics are done (Set of ids)
    progress: new Set(),

    // Current route
    router: { path: "/", query: "" },

    // UI transient state
    ui: {
      sidebarOpen:    true,
      searchQuery:    "",
      collapsedAreas: {
        java: true, golang: true, python: true, microservices: true,
        sysdesign: true, dsa: true, kafka: true, rust: true,
        angular: true, react: true, databases: true,
      },
    },

    // Currently selected topic id (null = home)
    selectedTopicId: null,
  });

  // Central state signal — single source of truth
  const State = signal(structuredClone
    ? structuredClone({ ...initialState, progress: new Set(initialState.progress) })
    : { ...initialState, progress: new Set(initialState.progress) }
  );

  window.App.Store.initialState = initialState;
  window.App.Store.State = State;

  // Register as DI service for components that prefer inject() pattern
  Injector.provide("AppState", () => State);
})();
