(function () {
  "use strict";

  // ── MetricsCollector ──────────────────────────────────────────────────────
  // Frontend-side telemetry. Collects runtime events → aggregates metrics
  // → feeds StateStore + optional backend reporting.
  //
  // Supports: counters, gauges, histograms, distributed traces, log entries.

  var _counters   = {};   // name → number
  var _gauges     = {};   // name → number
  var _histograms = {};   // name → [number]  (ring buffer, max 500)
  var _traces     = {};   // traceId → { spans: [] }
  var _logs       = [];   // [{ts, level, msg, meta}]  max 1000
  var _MAX_HIST   = 500;
  var _MAX_LOGS   = 1000;

  // ── Core API ─────────────────────────────────────────────────────────────
  var MetricsCollector = {

    // ── Counters ────────────────────────────────────────────────────────
    inc: function (name, delta) {
      _counters[name] = (_counters[name] || 0) + (delta || 1);
      _pushMetric(name, "counter", _counters[name]);
    },

    counter: function (name) {
      return _counters[name] || 0;
    },

    // ── Gauges ──────────────────────────────────────────────────────────
    gauge: function (name, value) {
      _gauges[name] = value;
      _pushMetric(name, "gauge", value);
    },

    getGauge: function (name) {
      return _gauges[name] || 0;
    },

    // ── Histograms ──────────────────────────────────────────────────────
    record: function (name, value) {
      if (!_histograms[name]) _histograms[name] = [];
      _histograms[name].push(value);
      if (_histograms[name].length > _MAX_HIST) _histograms[name].shift();
      _pushMetric(name, "histogram", value);
    },

    percentile: function (name, p /* 0-100 */) {
      var arr = (_histograms[name] || []).slice().sort(function (a, b) { return a - b; });
      if (!arr.length) return 0;
      var idx = Math.floor((p / 100) * (arr.length - 1));
      return arr[idx];
    },

    avg: function (name) {
      var arr = _histograms[name] || [];
      if (!arr.length) return 0;
      return arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
    },

    // ── Distributed Traces ───────────────────────────────────────────────
    startSpan: function (traceId, spanId, name, tags) {
      if (!_traces[traceId]) _traces[traceId] = { spans: [] };
      var span = { spanId: spanId, name: name, tags: tags || {}, start: Date.now(), end: null, duration: null };
      _traces[traceId].spans.push(span);
      if (window.EventBus && window.EVENTS) {
        window.EventBus.emit(window.EVENTS.TRACE_SPAN_START, { traceId: traceId, spanId: spanId, name: name });
      }
      return span;
    },

    endSpan: function (traceId, spanId) {
      var trace = _traces[traceId];
      if (!trace) return;
      var span = trace.spans.find(function (s) { return s.spanId === spanId; });
      if (!span) return;
      span.end = Date.now();
      span.duration = span.end - span.start;
      MetricsCollector.record("span_duration_ms", span.duration);
      if (window.EventBus && window.EVENTS) {
        window.EventBus.emit(window.EVENTS.TRACE_SPAN_END, { traceId: traceId, spanId: spanId, duration: span.duration });
      }
    },

    getTrace: function (traceId) {
      return _traces[traceId] || null;
    },

    // ── Logs ─────────────────────────────────────────────────────────────
    log: function (level, msg, meta) {
      var entry = { ts: Date.now(), level: level, msg: msg, meta: meta || {} };
      _logs.unshift(entry);
      if (_logs.length > _MAX_LOGS) _logs.pop();
      if (window.EventBus && window.EVENTS) {
        window.EventBus.emit(window.EVENTS.LOG_ENTRY, entry);
      }
      return entry;
    },

    info:  function (msg, meta) { return MetricsCollector.log("info",  msg, meta); },
    warn:  function (msg, meta) { return MetricsCollector.log("warn",  msg, meta); },
    error: function (msg, meta) { return MetricsCollector.log("error", msg, meta); },
    debug: function (msg, meta) { return MetricsCollector.log("debug", msg, meta); },

    getLogs: function (level, limit) {
      var logs = level ? _logs.filter(function (l) { return l.level === level; }) : _logs;
      return limit ? logs.slice(0, limit) : logs;
    },

    // ── Snapshot ─────────────────────────────────────────────────────────
    snapshot: function () {
      return {
        ts: Date.now(),
        counters:   Object.assign({}, _counters),
        gauges:     Object.assign({}, _gauges),
        histograms: {
          throughput_p50: MetricsCollector.percentile("throughput", 50),
          throughput_p99: MetricsCollector.percentile("throughput", 99),
          span_p50:       MetricsCollector.percentile("span_duration_ms", 50),
          span_p99:       MetricsCollector.percentile("span_duration_ms", 99),
        },
      };
    },

    reset: function () {
      _counters   = {};
      _gauges     = {};
      _histograms = {};
      _traces     = {};
      _logs       = [];
    },
  };

  // ── Auto-wire EventBus → counters ─────────────────────────────────────────
  function wireAutoMetrics() {
    var EB = window.EventBus;
    var EV = window.EVENTS;
    if (!EB || !EV) return;

    EB.on(EV.PACKET_SENT,    function () { MetricsCollector.inc("packets_sent"); });
    EB.on(EV.PACKET_DROPPED, function () { MetricsCollector.inc("packets_dropped"); });
    EB.on(EV.PACKET_RETRY,   function () { MetricsCollector.inc("packets_retry"); });
    EB.on(EV.NODE_FAILED,    function () { MetricsCollector.inc("node_failures"); });
    EB.on(EV.GC_PAUSE,       function (p) {
      MetricsCollector.record("gc_pause_ms", p && p.duration || 0);
      MetricsCollector.inc("gc_count");
    });
    EB.on(EV.KAFKA_PRODUCE,  function () { MetricsCollector.inc("kafka_produce"); });
    EB.on(EV.KAFKA_CONSUME,  function () { MetricsCollector.inc("kafka_consume"); });
    EB.on(EV.K8S_SCALE_UP,   function () { MetricsCollector.inc("k8s_scale_up"); });
    EB.on(EV.K8S_POD_FAILED, function () { MetricsCollector.inc("k8s_pod_failed"); });
    EB.on(EV.SIM_STEP,       function () { MetricsCollector.inc("sim_ticks"); });
    EB.on(EV.FAILURE_INJECT, function (p) {
      MetricsCollector.inc("failures_injected");
      MetricsCollector.warn("Failure injected: " + (p && p.type), p);
    });
  }

  function _pushMetric(name, type, value) {
    if (window.EventBus && window.EVENTS) {
      window.EventBus.emit(window.EVENTS.METRIC_UPDATE, { name: name, type: type, value: value, ts: Date.now() });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireAutoMetrics);
  } else {
    wireAutoMetrics();
  }

  window.MetricsCollector = MetricsCollector;

})();
