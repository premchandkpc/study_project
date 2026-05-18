(function () {
  "use strict";

  // ── ReplayEngine ──────────────────────────────────────────────────────────
  // Event-sourced replay. Records all EventBus events with timestamps,
  // then replays them at any speed with scrubbing and pause/resume.
  // Integrates with StateStore.replay layer.
  //
  // Usage:
  //   ReplayEngine.startRecording()
  //   ... sim runs ...
  //   var timeline = ReplayEngine.stopRecording()
  //   ReplayEngine.play(timeline, { speed: 2, onEvent: fn, onTick: fn })
  //   ReplayEngine.seek(0.5)   // seek to 50%

  var _events      = [];       // [{ts, event, payload}]
  var _startTs     = 0;
  var _duration    = 0;
  var _playing     = false;
  var _paused      = false;
  var _speed       = 1.0;
  var _cursor      = 0;        // index into _events
  var _playStart   = 0;        // real Date.now() when play began
  var _playOffset  = 0;        // sim-time offset when play resumed
  var _timer       = null;
  var _onEvent     = null;
  var _onTick      = null;
  var _onComplete  = null;
  var _snapshot    = null;     // optional state snapshot at t=0

  function _emit(event, payload) {
    if (window.EventBus) window.EventBus.emit(event, payload);
  }

  function _simTimeNow() {
    return _playOffset + (Date.now() - _playStart) * _speed;
  }

  function _drainTick() {
    if (_paused || !_playing) return;
    var simNow = _simTimeNow();
    while (_cursor < _events.length) {
      var ev = _events[_cursor];
      var evSimTime = ev.ts - _startTs;
      if (evSimTime > simNow) break;
      _cursor++;
      if (_onEvent) _onEvent(ev, _cursor / _events.length);
      // re-emit on EventBus so renderers see replayed events
      _emit(ev.event, ev.payload);
    }
    if (_onTick) {
      var pos = _events.length ? _cursor / _events.length : 1;
      _onTick(pos, simNow);
      if (window.StateStore) {
        window.StateStore.replay.position.set(pos);
        window.StateStore.replay.currentTime.set(simNow);
      }
    }
    if (_cursor >= _events.length) {
      _stopPlayback();
      if (_onComplete) _onComplete();
      _emit(window.EVENTS && window.EVENTS.REPLAY_END, { duration: _duration });
    }
  }

  function _stopPlayback() {
    _playing = false;
    if (_timer) { clearInterval(_timer); _timer = null; }
    if (window.StateStore) window.StateStore.replay.playing.set(false);
  }

  var ReplayEngine = {

    // ── Recording ─────────────────────────────────────────────────────────
    startRecording: function () {
      if (window.EventBus) window.EventBus.startRecording();
      if (window.StateStore) window.StateStore.replay.recording.set(true);
      _emit(window.EVENTS && window.EVENTS.RECORD_START, {});
    },

    stopRecording: function () {
      var recorded = window.EventBus ? window.EventBus.stopRecording() : [];
      if (window.StateStore) {
        window.StateStore.replay.recording.set(false);
        window.StateStore.replay.events.set(recorded);
      }
      _emit(window.EVENTS && window.EVENTS.RECORD_STOP, { count: recorded.length });
      return recorded;
    },

    // ── Playback ──────────────────────────────────────────────────────────
    play: function (events, opts) {
      opts = opts || {};
      _events     = (events || []).slice();
      _speed      = opts.speed     || 1.0;
      _onEvent    = opts.onEvent   || null;
      _onTick     = opts.onTick    || null;
      _onComplete = opts.onComplete || null;
      _snapshot   = opts.snapshot  || null;
      _cursor     = 0;
      _paused     = false;
      _playing    = true;
      _startTs    = _events.length ? _events[0].ts : Date.now();
      _duration   = _events.length
        ? _events[_events.length - 1].ts - _startTs
        : 0;
      _playStart  = Date.now();
      _playOffset = 0;

      if (window.StateStore) {
        window.StateStore.replay.playing.set(true);
        window.StateStore.replay.position.set(0);
        window.StateStore.replay.totalDuration.set(_duration);
        window.StateStore.replay.speed.set(_speed);
      }
      _emit(window.EVENTS && window.EVENTS.REPLAY_START, { count: _events.length, duration: _duration });

      if (_timer) clearInterval(_timer);
      _timer = setInterval(_drainTick, 50);
    },

    pause: function () {
      if (!_playing) return;
      _paused = true;
      _playOffset = _simTimeNow();
      if (window.StateStore) window.StateStore.replay.playing.set(false);
      _emit(window.EVENTS && window.EVENTS.REPLAY_PAUSE, {});
    },

    resume: function () {
      if (!_playing) return;
      _paused = false;
      _playStart = Date.now();
      if (window.StateStore) window.StateStore.replay.playing.set(true);
      _emit(window.EVENTS && window.EVENTS.REPLAY_RESUME, {});
    },

    stop: function () {
      _stopPlayback();
      _cursor = 0;
    },

    // ── Scrubbing ─────────────────────────────────────────────────────────
    seek: function (position /* 0-1 */) {
      if (!_events.length) return;
      var targetSimTime = position * _duration;
      _cursor = 0;
      while (_cursor < _events.length &&
             (_events[_cursor].ts - _startTs) < targetSimTime) {
        _cursor++;
      }
      _playOffset = targetSimTime;
      _playStart  = Date.now();
      if (window.StateStore) {
        window.StateStore.replay.position.set(position);
        window.StateStore.replay.currentTime.set(targetSimTime);
      }
      _emit(window.EVENTS && window.EVENTS.REPLAY_SEEK, { position: position });
    },

    setSpeed: function (s) {
      _playOffset = _simTimeNow();
      _playStart  = Date.now();
      _speed = Math.max(0.1, Math.min(20, s));
      if (window.StateStore) window.StateStore.replay.speed.set(_speed);
      _emit(window.EVENTS && window.EVENTS.REPLAY_SPEED, { speed: _speed });
    },

    // ── Export / Import ───────────────────────────────────────────────────
    export: function () {
      return JSON.stringify({
        version: 1,
        startTs: _startTs,
        duration: _duration,
        events: _events,
        snapshot: _snapshot,
      });
    },

    import: function (json) {
      try {
        var data = JSON.parse(json);
        _events   = data.events || [];
        _startTs  = data.startTs || 0;
        _duration = data.duration || 0;
        _snapshot = data.snapshot || null;
        if (window.StateStore) {
          window.StateStore.replay.events.set(_events);
          window.StateStore.replay.totalDuration.set(_duration);
        }
        return true;
      } catch (e) {
        console.error("[ReplayEngine] import failed:", e);
        return false;
      }
    },

    // ── State ─────────────────────────────────────────────────────────────
    isPlaying:   function () { return _playing && !_paused; },
    isPaused:    function () { return _paused; },
    getPosition: function () { return _events.length ? _cursor / _events.length : 0; },
    getEvents:   function () { return _events.slice(); },
    getDuration: function () { return _duration; },
  };

  window.ReplayEngine = ReplayEngine;

})();
