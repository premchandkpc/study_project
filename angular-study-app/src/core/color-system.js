(function () {
  "use strict";

  // ── RuntimeColorSystem ────────────────────────────────────────────────────
  // Semantic runtime color system for the entire platform.
  // All canvas, SVG, topology, and metric renderers pull from here.
  // Never use raw hex strings in renderers — use CS.* constants.

  var CS = {

    // ── Background Layers ─────────────────────────────────────────────────
    bg: {
      primary:   "#0B1020",   // deepest background
      secondary: "#121A2A",   // panels, sidebars
      elevated:  "#1A2338",   // cards, modals
      card:      "#1F2B45",   // node cards
      hover:     "#253352",   // hover state
      border:    "#2D3F60",   // borders
      divider:   "#1E2D46",   // dividers
    },

    // ── Runtime Semantic ──────────────────────────────────────────────────
    status: {
      healthy:    "#10B981",  // emerald — running, connected, ok
      warning:    "#F59E0B",  // amber — degraded, slow, high lag
      failed:     "#EF4444",  // red — down, error, exception
      retrying:   "#F97316",  // orange — retry in flight
      processing: "#06B6D4",  // cyan — active processing
      async:      "#A855F7",  // purple — async / futures / reactive
      networking: "#3B82F6",  // blue — network calls, HTTP
      idle:       "#4B5563",  // gray — waiting
      unknown:    "#6B7280",
    },

    // ── Domain Colors ─────────────────────────────────────────────────────
    domain: {
      kafka:      "#F97316",  // orange
      rabbitmq:   "#FF6600",
      kubernetes: "#06B6D4",  // cyan
      jvm:        "#10B981",  // green
      golang:     "#14B8A6",  // teal
      python:     "#F59E0B",  // yellow-amber
      rust:       "#F97316",
      ai:         "#8B5CF6",  // violet
      networking: "#3B82F6",  // blue
      database:   "#6366F1",  // indigo
      redis:      "#EF4444",
      aws:        "#FF9900",
      grpc:       "#A855F7",
    },

    // ── Text ──────────────────────────────────────────────────────────────
    text: {
      primary:   "#E2E8F0",
      secondary: "#94A3B8",
      muted:     "#64748B",
      code:      "#93C5FD",
      highlight: "#FFFFFF",
      link:      "#60A5FA",
    },

    // ── ByteByteGo palette (legacy canvas compat) ─────────────────────────
    bbg: {
      blue:      "#58a6ff",
      green:     "#3fb950",
      orange:    "#ffa657",
      red:       "#f85149",
      purple:    "#d2a8ff",
      yellow:    "#e3b341",
      gray:      "#8b949e",
      lightBlue: "#79c0ff",
      teal:      "#39d353",
    },

    // ── Canvas bg (dark) ──────────────────────────────────────────────────
    canvas: {
      bg:        "#0B1020",
      grid:      "#1A2338",
      gridLine:  "rgba(45,63,96,0.4)",
      selection: "rgba(59,130,246,0.15)",
      focus:     "rgba(6,182,212,0.2)",
    },

    // ── Packet / animation ────────────────────────────────────────────────
    packet: {
      data:      "#06B6D4",
      ack:       "#10B981",
      retry:     "#F97316",
      drop:      "#EF4444",
      dlq:       "#DC2626",
      heartbeat: "#A855F7",
    },

    // ── Alert ─────────────────────────────────────────────────────────────
    alert: {
      critical:  "#EF4444",
      high:      "#F97316",
      medium:    "#F59E0B",
      low:       "#10B981",
      info:      "#3B82F6",
    },

    // ── Node type → color lookup ──────────────────────────────────────────
    nodeColor: function (type) {
      var map = {
        producer:     CS.domain.kafka,
        consumer:     CS.bbg.blue,
        broker:       CS.domain.kafka,
        topic:        "#FCD34D",
        partition:    "#FDBA74",
        pod:          CS.domain.kubernetes,
        node:         "#0EA5E9",
        service:      "#6366F1",
        deployment:   "#8B5CF6",
        thread:       CS.domain.jvm,
        lock:         CS.status.retrying,
        heap:         "#34D399",
        gc:           "#A3E635",
        goroutine:    CS.domain.golang,
        channel:      "#2DD4BF",
        processor:    "#0D9488",
        agent:        CS.domain.ai,
        memory:       "#C084FC",
        tool:         "#F472B6",
        packet:       CS.packet.data,
        default:      CS.text.secondary,
      };
      return map[type] || map.default;
    },

    // ── Status → glow color ───────────────────────────────────────────────
    glow: function (status) {
      var map = {
        healthy:    "rgba(16,185,129,0.4)",
        warning:    "rgba(245,158,11,0.4)",
        failed:     "rgba(239,68,68,0.5)",
        retrying:   "rgba(249,115,22,0.4)",
        processing: "rgba(6,182,212,0.4)",
        async:      "rgba(168,85,247,0.4)",
      };
      return map[status] || "rgba(100,116,139,0.3)";
    },

    // ── CSS variable injection ────────────────────────────────────────────
    injectCSSVars: function () {
      var root = document.documentElement;
      root.style.setProperty("--bg-primary",    CS.bg.primary);
      root.style.setProperty("--bg-secondary",  CS.bg.secondary);
      root.style.setProperty("--bg-elevated",   CS.bg.elevated);
      root.style.setProperty("--bg-card",       CS.bg.card);
      root.style.setProperty("--bg-border",     CS.bg.border);
      root.style.setProperty("--status-ok",     CS.status.healthy);
      root.style.setProperty("--status-warn",   CS.status.warning);
      root.style.setProperty("--status-fail",   CS.status.failed);
      root.style.setProperty("--text-primary",  CS.text.primary);
      root.style.setProperty("--text-secondary",CS.text.secondary);
      root.style.setProperty("--text-muted",    CS.text.muted);
      root.style.setProperty("--domain-kafka",  CS.domain.kafka);
      root.style.setProperty("--domain-k8s",    CS.domain.kubernetes);
      root.style.setProperty("--domain-jvm",    CS.domain.jvm);
      root.style.setProperty("--domain-golang", CS.domain.golang);
      root.style.setProperty("--domain-ai",     CS.domain.ai);
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", CS.injectCSSVars.bind(CS));
  } else {
    CS.injectCSSVars();
  }

  window.CS = CS;
  // also expose as RuntimeColorSystem for semantic clarity
  window.RuntimeColorSystem = CS;

})();
