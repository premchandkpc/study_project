/**
 * app.actions.js — action type constants
 * Angular equiv: NgRx createAction() / action creators
 * Exposes: window.App.Store.Actions
 *
 * In Angular/NgRx:
 *   export const markDone = createAction('[Progress] Mark Done', props<{id:string}>());
 */
(function () {
  "use strict";
  window.App = window.App || {};
  window.App.Store = window.App.Store || {};

  window.App.Store.Actions = Object.freeze({
    // Progress actions
    PROGRESS_TOGGLE:    "[Progress] Toggle",
    PROGRESS_RESET_ALL: "[Progress] Reset All",

    // Router actions
    ROUTER_NAVIGATE:    "[Router] Navigate",

    // Topic actions
    TOPIC_SELECT:       "[Topic] Select",
    TOPIC_CLEAR:        "[Topic] Clear",

    // UI actions
    UI_SIDEBAR_TOGGLE:  "[UI] Sidebar Toggle",
    UI_SEARCH_SET:      "[UI] Search Set",
    UI_SEARCH_CLEAR:    "[UI] Search Clear",
    UI_AREA_TOGGLE:     "[UI] Area Toggle",

    // Creator helper — mirrors NgRx createAction pattern
    create(type, payload) {
      return Object.freeze({ type, payload: payload || null, timestamp: Date.now() });
    },
  });
})();
