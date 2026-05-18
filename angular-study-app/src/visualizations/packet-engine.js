(function () {
  "use strict";

  // ── PacketEngine ──────────────────────────────────────────────────────────
  // Animates packets flowing between topology nodes over a canvas context.
  // Emits PACKET_SENT / ACK / DROP / RETRY events through EventBus.
  //
  // Usage:
  //   PacketEngine.init(ctx, opts)
  //   PacketEngine.send({ from:{x,y}, to:{x,y}, type:"data", label:"PUT /api" })
  //   PacketEngine.tick()  // call in your rAF loop
  //   PacketEngine.clear()

  var _packets = [];      // active packets
  var _ctx     = null;
  var _opts    = {};
  var _pool    = [];      // object pool for GC-friendliness

  var PACKET_TYPES = {
    data:      { color: "#06B6D4", radius: 7,  trail: true  },
    ack:       { color: "#10B981", radius: 5,  trail: false },
    retry:     { color: "#F97316", radius: 7,  trail: true, pulse: true },
    drop:      { color: "#EF4444", radius: 6,  trail: false },
    dlq:       { color: "#DC2626", radius: 8,  trail: true  },
    heartbeat: { color: "#A855F7", radius: 4,  trail: false },
    kafka:     { color: "#F97316", radius: 7,  trail: true  },
    k8s:       { color: "#06B6D4", radius: 6,  trail: true  },
    jvm:       { color: "#10B981", radius: 6,  trail: true  },
    go:        { color: "#14B8A6", radius: 6,  trail: true  },
  };

  // bezier control point for curved paths
  function _ctrl(from, to, curvature) {
    curvature = curvature || 0.25;
    var mx = (from.x + to.x) / 2;
    var my = (from.y + to.y) / 2;
    var dx = to.x - from.x;
    var dy = to.y - from.y;
    return {
      x: mx - dy * curvature,
      y: my + dx * curvature,
    };
  }

  // quadratic bezier point at t
  function _bezier(from, ctrl, to, t) {
    var mt = 1 - t;
    return {
      x: mt * mt * from.x + 2 * mt * t * ctrl.x + t * t * to.x,
      y: mt * mt * from.y + 2 * mt * t * ctrl.y + t * t * to.y,
    };
  }

  function _acquire(config) {
    var p = _pool.pop() || {};
    Object.assign(p, {
      from:    config.from,
      to:      config.to,
      ctrl:    _ctrl(config.from, config.to, config.curvature),
      type:    config.type     || "data",
      label:   config.label    || "",
      speed:   config.speed    || 0.012,
      t:       0,
      done:    false,
      trail:   [],
      onDone:  config.onDone   || null,
      id:      config.id       || ("pkt_" + Date.now() + Math.random()),
    });
    return p;
  }

  function _release(p) {
    p.trail = [];
    _pool.push(p);
  }

  function _drawPacket(p, cfg) {
    if (!_ctx) return;
    var pos = _bezier(p.from, p.ctrl, p.to, p.t);

    // trail
    if (cfg.trail && p.trail.length > 1) {
      _ctx.save();
      for (var i = 1; i < p.trail.length; i++) {
        var alpha = i / p.trail.length * 0.5;
        _ctx.beginPath();
        _ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        _ctx.lineTo(p.trail[i].x, p.trail[i].y);
        _ctx.strokeStyle = cfg.color.replace(")", "," + alpha + ")").replace("rgb(", "rgba(") || cfg.color;
        _ctx.lineWidth = 2;
        _ctx.stroke();
      }
      _ctx.restore();
    }

    // glow
    _ctx.save();
    _ctx.shadowColor = cfg.color;
    _ctx.shadowBlur  = cfg.pulse ? 12 + 6 * Math.sin(Date.now() / 150) : 8;

    // dot
    _ctx.beginPath();
    _ctx.arc(pos.x, pos.y, cfg.radius, 0, Math.PI * 2);
    _ctx.fillStyle = cfg.color;
    _ctx.fill();
    _ctx.restore();

    // label
    if (p.label && _opts.showLabels !== false) {
      _ctx.save();
      _ctx.font = "10px JetBrains Mono, monospace";
      _ctx.fillStyle = "#E2E8F0";
      _ctx.fillText(p.label, pos.x + cfg.radius + 3, pos.y - cfg.radius - 2);
      _ctx.restore();
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  var PacketEngine = {

    init: function (ctx, opts) {
      _ctx  = ctx;
      _opts = opts || {};
    },

    send: function (config) {
      var p = _acquire(config);
      _packets.push(p);
      if (window.EventBus && window.EVENTS) {
        window.EventBus.emit(window.EVENTS.PACKET_SENT, { id: p.id, type: p.type, label: p.label });
      }
      return p.id;
    },

    // batch-send for throughput simulation
    burst: function (count, config, stagger) {
      stagger = stagger || 60;
      for (var i = 0; i < count; i++) {
        (function (delay) {
          setTimeout(function () { PacketEngine.send(config); }, delay);
        })(i * stagger);
      }
    },

    tick: function (speedMultiplier) {
      speedMultiplier = speedMultiplier || 1;
      var alive = [];
      for (var i = 0; i < _packets.length; i++) {
        var p = _packets[i];
        var cfg = PACKET_TYPES[p.type] || PACKET_TYPES.data;

        // advance
        p.t += p.speed * speedMultiplier;
        var pos = _bezier(p.from, p.ctrl, p.to, Math.min(p.t, 1));

        // trail
        if (cfg.trail) {
          p.trail.push({ x: pos.x, y: pos.y });
          if (p.trail.length > 12) p.trail.shift();
        }

        _drawPacket(p, cfg);

        if (p.t >= 1) {
          // arrived
          if (window.EventBus && window.EVENTS) {
            var evType = p.type === "drop" ? window.EVENTS.PACKET_DROPPED
                       : p.type === "retry" ? window.EVENTS.PACKET_RETRY
                       : window.EVENTS.PACKET_ACK;
            window.EventBus.emit(evType, { id: p.id, type: p.type });
          }
          if (p.onDone) p.onDone(p);
          _release(p);
        } else {
          alive.push(p);
        }
      }
      _packets = alive;
    },

    injectDrop: function (config) {
      config = Object.assign({}, config, { type: "drop" });
      return PacketEngine.send(config);
    },

    injectRetry: function (config) {
      config = Object.assign({}, config, { type: "retry" });
      return PacketEngine.send(config);
    },

    clear: function () {
      _packets.forEach(function (p) { _release(p); });
      _packets = [];
    },

    count: function () { return _packets.length; },

    // draw the bezier path (edge) between two nodes
    drawEdge: function (from, to, opts) {
      if (!_ctx) return;
      opts = opts || {};
      var ctrl = _ctrl(from, to, opts.curvature || 0.2);
      _ctx.save();
      _ctx.beginPath();
      _ctx.moveTo(from.x, from.y);
      _ctx.quadraticCurveTo(ctrl.x, ctrl.y, to.x, to.y);
      _ctx.strokeStyle = opts.color || "rgba(45,63,96,0.8)";
      _ctx.lineWidth   = opts.width || 1.5;
      if (opts.dashed) _ctx.setLineDash([6, 4]);
      _ctx.stroke();
      _ctx.setLineDash([]);
      _ctx.restore();

      // arrowhead
      if (opts.arrow !== false) {
        var angle = Math.atan2(to.y - ctrl.y, to.x - ctrl.x);
        var r = 7;
        _ctx.save();
        _ctx.beginPath();
        _ctx.moveTo(to.x, to.y);
        _ctx.lineTo(to.x - r * Math.cos(angle - 0.4), to.y - r * Math.sin(angle - 0.4));
        _ctx.lineTo(to.x - r * Math.cos(angle + 0.4), to.y - r * Math.sin(angle + 0.4));
        _ctx.closePath();
        _ctx.fillStyle = opts.color || "rgba(45,63,96,0.8)";
        _ctx.fill();
        _ctx.restore();
      }
    },
  };

  window.PacketEngine = PacketEngine;

})();
