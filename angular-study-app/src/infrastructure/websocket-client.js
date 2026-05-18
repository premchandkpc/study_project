(function () {
  "use strict";

  // ── WSClient ──────────────────────────────────────────────────────────────
  // Reconnecting WebSocket with message routing.
  // Supports subscribe-by-type pattern matching EventBus.
  //
  // Usage:
  //   WSClient.connect("ws://localhost:8080/runtime")
  //   WSClient.on("kafka.produce", fn)
  //   WSClient.send({ type: "sim.start", payload: { id: "kafka" } })

  var _ws          = null;
  var _url         = null;
  var _connected   = false;
  var _handlers    = {};    // type → [fn]
  var _queue       = [];    // messages queued while disconnected
  var _retryDelay  = 1000;
  var _maxRetry    = 30000;
  var _retryTimer  = null;
  var _retries     = 0;
  var _maxRetries  = 10;

  function _emit(type, data) {
    var handlers = (_handlers[type] || []).concat(_handlers["*"] || []);
    handlers.forEach(function (fn) {
      try { fn(data, type); } catch (e) { console.error("[WSClient] handler error:", e); }
    });
    // also emit on EventBus
    if (window.EventBus) window.EventBus.emit("ws:" + type, data);
  }

  function _flush() {
    while (_queue.length && _connected) {
      WSClient.send(_queue.shift());
    }
  }

  function _reconnect() {
    if (_retries >= _maxRetries) {
      console.warn("[WSClient] max retries reached");
      return;
    }
    _retryTimer = setTimeout(function () {
      _retries++;
      WSClient.connect(_url);
    }, Math.min(_retryDelay * Math.pow(1.5, _retries), _maxRetry));
  }

  var WSClient = {

    connect: function (url) {
      _url = url;
      if (_ws) { try { _ws.close(); } catch (e) {} }

      try {
        _ws = new WebSocket(url);
      } catch (e) {
        console.error("[WSClient] connect failed:", e);
        _reconnect();
        return;
      }

      _ws.onopen = function () {
        _connected = true;
        _retries = 0;
        _emit("connected", { url: url });
        _flush();
      };

      _ws.onmessage = function (ev) {
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { msg = { type: "raw", payload: ev.data }; }
        _emit(msg.type || "message", msg.payload !== undefined ? msg.payload : msg);
      };

      _ws.onclose = function (ev) {
        _connected = false;
        _emit("disconnected", { code: ev.code, reason: ev.reason });
        if (ev.code !== 1000) _reconnect();
      };

      _ws.onerror = function (e) {
        _emit("error", { error: e });
      };
    },

    disconnect: function () {
      if (_retryTimer) { clearTimeout(_retryTimer); _retryTimer = null; }
      _retries = _maxRetries; // prevent reconnect
      if (_ws) { _ws.close(1000, "client disconnect"); _ws = null; }
      _connected = false;
    },

    send: function (message) {
      if (!_connected || !_ws || _ws.readyState !== WebSocket.OPEN) {
        _queue.push(message);
        return false;
      }
      try {
        _ws.send(typeof message === "string" ? message : JSON.stringify(message));
        return true;
      } catch (e) {
        console.error("[WSClient] send error:", e);
        return false;
      }
    },

    on: function (type, fn) {
      if (!_handlers[type]) _handlers[type] = [];
      _handlers[type].push(fn);
      return function () {
        _handlers[type] = (_handlers[type] || []).filter(function (h) { return h !== fn; });
      };
    },

    off: function (type, fn) {
      if (_handlers[type]) {
        _handlers[type] = _handlers[type].filter(function (h) { return h !== fn; });
      }
    },

    isConnected: function () { return _connected; },
    getUrl:      function () { return _url; },
    queueSize:   function () { return _queue.length; },
  };

  window.WSClient = WSClient;

})();
