(function () {
  "use strict";

  // ── EventBus ──────────────────────────────────────────────────────────────
  // Central nervous system. All simulation ↔ engine ↔ UI communication
  // goes through here. Supports wildcard listeners, one-time handlers,
  // and optional event recording for the replay engine.

  var _handlers = {};          // event → [{ fn, once }]
  var _recording = false;
  var _recorded  = [];         // [{ts, event, payload}] when recording
  var _middlewares = [];       // fn(event,payload) — run before dispatch

  function _get(event) {
    if (!_handlers[event]) _handlers[event] = [];
    return _handlers[event];
  }

  var EventBus = {

    // ── Subscribe ────────────────────────────────────────────────────────
    on: function (event, fn) {
      _get(event).push({ fn: fn, once: false });
      return function () { EventBus.off(event, fn); };
    },

    once: function (event, fn) {
      _get(event).push({ fn: fn, once: true });
    },

    off: function (event, fn) {
      if (!_handlers[event]) return;
      _handlers[event] = _handlers[event].filter(function (h) {
        return h.fn !== fn;
      });
    },

    offAll: function (event) {
      if (event) { _handlers[event] = []; }
      else { _handlers = {}; }
    },

    // ── Publish ──────────────────────────────────────────────────────────
    emit: function (event, payload) {
      // run middleware chain first
      for (var m = 0; m < _middlewares.length; m++) {
        var result = _middlewares[m](event, payload);
        if (result === false) return; // middleware can cancel
      }

      // record if active
      if (_recording) {
        _recorded.push({ ts: Date.now(), event: event, payload: payload });
      }

      var handlers = (_handlers[event] || []).slice();
      var remaining = [];
      for (var i = 0; i < handlers.length; i++) {
        try { handlers[i].fn(payload, event); } catch (e) { console.error("[EventBus] handler error:", event, e); }
        if (!handlers[i].once) remaining.push(handlers[i]);
      }
      if (_handlers[event]) _handlers[event] = remaining;

      // wildcard listeners
      var wildcards = (_handlers["*"] || []).slice();
      for (var j = 0; j < wildcards.length; j++) {
        try { wildcards[j].fn(payload, event); } catch (e) { console.error("[EventBus] wildcard error:", e); }
      }
    },

    // ── Middleware ───────────────────────────────────────────────────────
    use: function (fn) {
      _middlewares.push(fn);
      return function () {
        _middlewares = _middlewares.filter(function (m) { return m !== fn; });
      };
    },

    // ── Recording (for ReplayEngine) ─────────────────────────────────────
    startRecording: function () {
      _recording = true;
      _recorded = [];
    },

    stopRecording: function () {
      _recording = false;
      return _recorded.slice();
    },

    getRecorded: function () {
      return _recorded.slice();
    },

    isRecording: function () {
      return _recording;
    },

    // ── Debug ────────────────────────────────────────────────────────────
    listenerCount: function (event) {
      return event ? (_handlers[event] || []).length
                   : Object.keys(_handlers).reduce(function (n, k) {
                       return n + _handlers[k].length;
                     }, 0);
    },

    events: function () {
      return Object.keys(_handlers);
    },
  };

  window.EventBus = EventBus;

})();
