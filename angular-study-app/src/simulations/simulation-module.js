(function () {
  "use strict";

  // ── SimulationModule ──────────────────────────────────────────────────────
  // Base class for all simulation plugins.
  // Each simulation (kafka, jvm, k8s, golang, networking, ai-agents) extends
  // this and overrides lifecycle hooks. The engine calls the standard interface;
  // sims emit EVENTS.* through EventBus to drive renderers.
  //
  // Lifecycle:
  //   new KafkaSim(config)  →  initialize()  →  start()  →  [pause/resume/step]
  //   →  injectFailure()  →  reset()  →  destroy()

  function SimulationModule(config) {
    this.config   = config || {};
    this.id       = this.config.id || ("sim_" + Date.now());
    this.mount    = null;
    this.running  = false;
    this.paused   = false;
    this.speed    = 1.0;
    this._timer   = null;
    this._step    = 0;
    this._metrics = { steps: 0, failures: 0, startTime: null, elapsed: 0 };
    this._listeners = [];
  }

  SimulationModule.prototype = {

    // ── Lifecycle — override in subclass ──────────────────────────────────

    initialize: function (mount) {
      this.mount = mount;
      this._metrics.startTime = Date.now();
      this._emit(window.EVENTS.SIM_INIT, { id: this.id });
    },

    start: function () {
      this.running = true;
      this.paused  = false;
      this._emit(window.EVENTS.SIM_START, { id: this.id });
      this._schedule();
    },

    pause: function () {
      this.paused = true;
      this._clearTimer();
      this._emit(window.EVENTS.SIM_PAUSE, { id: this.id });
    },

    resume: function () {
      if (!this.running) return;
      this.paused = false;
      this._emit(window.EVENTS.SIM_RESUME, { id: this.id });
      this._schedule();
    },

    reset: function () {
      this._clearTimer();
      this.running = false;
      this.paused  = false;
      this._step   = 0;
      this._metrics = { steps: 0, failures: 0, startTime: null, elapsed: 0 };
      this._emit(window.EVENTS.SIM_RESET, { id: this.id });
      this.onReset();
    },

    destroy: function () {
      this._clearTimer();
      this._listeners.forEach(function (off) { off(); });
      this._listeners = [];
      this._emit(window.EVENTS.SIM_DESTROY, { id: this.id });
      this.onDestroy();
    },

    // ── Step — called on each tick. Override for sim logic ────────────────
    tick: function () {
      this._step++;
      this._metrics.steps++;
      this._emit(window.EVENTS.SIM_STEP, { id: this.id, step: this._step });
      this.onTick(this._step);
    },

    // ── Failure injection ─────────────────────────────────────────────────
    injectFailure: function (type, opts) {
      this._metrics.failures++;
      this._emit(window.EVENTS.FAILURE_INJECT, { id: this.id, type: type, opts: opts || {} });
      this.onFailure(type, opts || {});
    },

    // ── Metrics ───────────────────────────────────────────────────────────
    getMetrics: function () {
      if (this._metrics.startTime) {
        this._metrics.elapsed = Date.now() - this._metrics.startTime;
      }
      return Object.assign({}, this._metrics, this.extraMetrics());
    },

    exportTimeline: function () {
      return window.EventBus ? window.EventBus.getRecorded() : [];
    },

    setSpeed: function (s) {
      this.speed = Math.max(0.1, Math.min(10, s));
      if (this.running && !this.paused) {
        this._clearTimer();
        this._schedule();
      }
      this._emit(window.EVENTS.SIM_SPEED_CHANGE, { id: this.id, speed: this.speed });
    },

    // ── Hooks — override freely ───────────────────────────────────────────
    onTick:    function (step)       { /* override */ },
    onReset:   function ()           { /* override */ },
    onDestroy: function ()           { /* override */ },
    onFailure: function (type, opts) { /* override */ },
    extraMetrics: function ()        { return {}; },

    // ── Internals ─────────────────────────────────────────────────────────
    _schedule: function () {
      var self = this;
      var interval = Math.round(1000 / this.speed);
      this._timer = setInterval(function () {
        if (self.paused) return;
        self.tick();
      }, interval);
    },

    _clearTimer: function () {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    },

    _emit: function (event, payload) {
      if (window.EventBus) window.EventBus.emit(event, payload);
    },

    _on: function (event, fn) {
      if (window.EventBus) {
        this._listeners.push(window.EventBus.on(event, fn));
      }
    },
  };

  // ── Static factory ────────────────────────────────────────────────────────
  SimulationModule.extend = function (proto) {
    function Sub(config) { SimulationModule.call(this, config); }
    Sub.prototype = Object.create(SimulationModule.prototype);
    Sub.prototype.constructor = Sub;
    Object.assign(Sub.prototype, proto);
    return Sub;
  };

  window.SimulationModule = SimulationModule;

})();
