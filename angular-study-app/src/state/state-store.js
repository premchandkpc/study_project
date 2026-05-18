(function () {
  "use strict";

  // ── StateStore ────────────────────────────────────────────────────────────
  // Layered signal store. Each layer is isolated — UI changes don't bleed
  // into simulation runtime state. All layers are reactive via App.signal.
  //
  //  ui         → theme, sidebar, active panel, modals, topology selection
  //  runtime    → active simulations, running state, speed per sim
  //  replay     → recording, playback position, events buffer
  //  metrics    → per-sim metric snapshots for observability panel
  //  simulation → typed domain state per sim (kafka, jvm, k8s, go, etc.)

  function makeSignal(init) {
    if (window.App && window.App.signal) return window.App.signal(init);
    // fallback lightweight signal
    var v = init;
    var subs = [];
    return {
      get: function () { return v; },
      set: function (nv) {
        v = nv;
        subs.forEach(function (fn) { fn(v); });
      },
      update: function (fn) { this.set(fn(v)); },
      subscribe: function (fn) {
        subs.push(fn);
        return function () { subs = subs.filter(function (s) { return s !== fn; }); };
      },
    };
  }

  // ── UI Layer ──────────────────────────────────────────────────────────────
  var ui = {
    theme:           makeSignal("dark"),
    sidebarOpen:     makeSignal(true),
    activePanel:     makeSignal("simulation"),  // simulation | replay | metrics | logs
    activeTopic:     makeSignal(null),
    modal:           makeSignal(null),          // null | { type, props }
    selectedNode:    makeSignal(null),          // topology node selection
    panelSizes:      makeSignal({ left: 280, right: 340, bottom: 220 }),
    notifications:   makeSignal([]),
  };

  // ── Runtime Layer ─────────────────────────────────────────────────────────
  var runtime = {
    activeSims:      makeSignal({}),            // id → SimulationModule instance
    globalSpeed:     makeSignal(1.0),
    paused:          makeSignal(false),
    tickCount:       makeSignal(0),
    errors:          makeSignal([]),            // runtime errors list
    lastEvent:       makeSignal(null),          // last EventBus event for debug
  };

  // ── Replay Layer ──────────────────────────────────────────────────────────
  var replay = {
    recording:       makeSignal(false),
    playing:         makeSignal(false),
    events:          makeSignal([]),            // recorded event log
    position:        makeSignal(0),            // playback cursor (0-1)
    speed:           makeSignal(1.0),
    totalDuration:   makeSignal(0),
    currentTime:     makeSignal(0),
    snapshot:        makeSignal(null),         // state snapshot at t=0
  };

  // ── Metrics Layer ─────────────────────────────────────────────────────────
  var metrics = {
    bySimId:         makeSignal({}),           // simId → latest getMetrics() result
    throughput:      makeSignal([]),           // [{ts, value}] ring buffer
    latencyP99:      makeSignal(0),
    errorRate:       makeSignal(0),
    gcPauses:        makeSignal([]),
    threadCount:     makeSignal(0),
    heapUsed:        makeSignal(0),
    goroutineCount:  makeSignal(0),
    kafkaLag:        makeSignal({}),           // topic → lag
    podCount:        makeSignal(0),
  };

  // ── Simulation Domain Layer ───────────────────────────────────────────────
  var simulation = {
    kafka: makeSignal({
      topics: [], producers: [], consumers: [], brokers: [],
      rebalancing: false, lag: {}, dlqCount: 0,
    }),
    jvm: makeSignal({
      threads: [], locks: [], heapRegions: [], gcPhase: "idle",
      classLoaders: [], stackFrames: [],
    }),
    k8s: makeSignal({
      nodes: [], pods: [], services: [], deployments: [],
      events: [], hpaStatus: {},
    }),
    golang: makeSignal({
      goroutines: [], channels: [], processors: [],
      gcPhase: "idle", steals: 0,
    }),
    networking: makeSignal({
      packets: [], connections: [], nodes: [], latencies: {},
    }),
    aiAgent: makeSignal({
      agents: [], workflows: [], memory: [], toolCalls: [],
      ragChunks: [], embeddings: [],
    }),
  };

  // ── Public API ────────────────────────────────────────────────────────────
  var StateStore = {
    ui: ui,
    runtime: runtime,
    replay: replay,
    metrics: metrics,
    simulation: simulation,

    // Convenience: reset all layers to initial
    resetAll: function () {
      ui.activePanel.set("simulation");
      ui.selectedNode.set(null);
      ui.modal.set(null);
      runtime.activeSims.set({});
      runtime.tickCount.set(0);
      runtime.errors.set([]);
      replay.recording.set(false);
      replay.playing.set(false);
      replay.events.set([]);
      replay.position.set(0);
      metrics.bySimId.set({});
    },

    // Upsert simulation domain state
    patchSimulation: function (domain, patch) {
      if (!simulation[domain]) return;
      var current = simulation[domain].get();
      simulation[domain].set(Object.assign({}, current, patch));
    },

    // Append to metric ring buffer (max 200 entries)
    pushThroughput: function (value) {
      var buf = metrics.throughput.get().slice();
      buf.push({ ts: Date.now(), value: value });
      if (buf.length > 200) buf.shift();
      metrics.throughput.set(buf);
    },

    // Add runtime error
    addError: function (err) {
      var errs = runtime.errors.get().slice();
      errs.unshift({ ts: Date.now(), message: String(err) });
      if (errs.length > 50) errs.pop();
      runtime.errors.set(errs);
    },
  };

  // ── Wire EventBus → metrics auto-update ──────────────────────────────────
  function wireEventBus() {
    var EB = window.EventBus;
    var EV = window.EVENTS;
    if (!EB || !EV) return;

    EB.on(EV.SIM_STEP, function (p) {
      runtime.tickCount.update(function (n) { return n + 1; });
      runtime.lastEvent.set({ event: EV.SIM_STEP, payload: p });
    });

    EB.on(EV.METRIC_UPDATE, function (p) {
      if (p && p.simId) {
        var m = metrics.bySimId.get();
        m = Object.assign({}, m);
        m[p.simId] = p;
        metrics.bySimId.set(m);
      }
    });

    EB.on(EV.HEAP_UPDATE, function (p) {
      if (p && p.used != null) metrics.heapUsed.set(p.used);
    });

    EB.on(EV.GC_PAUSE, function (p) {
      var pauses = metrics.gcPauses.get().slice();
      pauses.push({ ts: Date.now(), duration: p && p.duration || 0 });
      if (pauses.length > 100) pauses.shift();
      metrics.gcPauses.set(pauses);
    });

    EB.on(EV.KAFKA_LAG_UPDATE, function (p) {
      if (p && p.topic) {
        var lag = Object.assign({}, metrics.kafkaLag.get());
        lag[p.topic] = p.lag;
        metrics.kafkaLag.set(lag);
      }
    });

    EB.on(EV.K8S_POD_RUNNING, function () {
      metrics.podCount.update(function (n) { return n + 1; });
    });
    EB.on(EV.K8S_POD_FAILED, function () {
      metrics.podCount.update(function (n) { return Math.max(0, n - 1); });
    });
  }

  // Wire after DOM ready (EventBus and EVENTS must load first)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireEventBus);
  } else {
    wireEventBus();
  }

  window.StateStore = StateStore;

})();
