/**
 * app.reducer.js — pure state transition function
 * Angular equiv: NgRx createReducer() + on()
 * Exposes: window.App.Store.dispatch, window.App.Store.reduce
 *
 * In Angular/NgRx:
 *   export const appReducer = createReducer(initialState,
 *     on(Actions.toggle, (state, { id }) => ({ ...state, progress: toggle(state.progress, id) }))
 *   );
 */
(function () {
  "use strict";
  const { Store } = window.App;
  const { Actions, State } = Store;

  // Pure reducer — (state, action) => nextState
  function reduce(state, action) {
    switch (action.type) {

    case Actions.PROGRESS_TOGGLE: {
      const next = new Set(state.progress);
      next.has(action.payload.id) ? next.delete(action.payload.id) : next.add(action.payload.id);
      // Sync to localStorage
      try { localStorage.setItem("study-lab:done", JSON.stringify([...next])); } catch (e) { /* ignore */ }
      return { ...state, progress: next };
    }

    case Actions.PROGRESS_RESET_ALL: {
      try { localStorage.removeItem("study-lab:done"); } catch (e) { /* ignore */ }
      return { ...state, progress: new Set() };
    }

    case Actions.ROUTER_NAVIGATE: {
      return { ...state, router: action.payload };
    }

    case Actions.TOPIC_SELECT: {
      return { ...state, selectedTopicId: action.payload.id };
    }

    case Actions.TOPIC_CLEAR: {
      return { ...state, selectedTopicId: null };
    }

    case Actions.UI_SEARCH_SET: {
      return { ...state, ui: { ...state.ui, searchQuery: action.payload.query } };
    }

    case Actions.UI_SEARCH_CLEAR: {
      return { ...state, ui: { ...state.ui, searchQuery: "" } };
    }

    case Actions.UI_AREA_TOGGLE: {
      const areas = { ...state.ui.collapsedAreas };
      areas[action.payload.key] = !areas[action.payload.key];
      return { ...state, ui: { ...state.ui, collapsedAreas: areas } };
    }

    case Actions.UI_SIDEBAR_TOGGLE: {
      return { ...state, ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } };
    }

    default:
      return state;
    }
  }

  // dispatch — applies reducer + updates signal (like NgRx Store.dispatch)
  function dispatch(action) {
    State.update(s => reduce(s, action));
  }

  Store.reduce   = reduce;
  Store.dispatch = dispatch;
})();
