/**
 * react-viz-core.js — ReactViz panel engine
 * Exposes: window.ReactViz
 */
(function () {
  "use strict";
  window.ReactViz = window.ReactViz || {};

  var PHASE_COLORS = {
    mount:    "#58a6ff",
    update:   "#f0883e",
    unmount:  "#f85149",
    effect:   "#3fb950",
    cleanup:  "#d2a8ff",
    render:   "#58a6ff",
    commit:   "#ffa657",
    suspend:  "#d2a8ff",
    resolve:  "#3fb950",
    begin:    "#58a6ff",
    complete: "#3fb950",
    idle:     "#768390",
  };

  var CSS = [
    ".rviz-wrap{background:#0d1117;border:1px solid #30363d;border-radius:10px;overflow:hidden;font-family:'Inter','Segoe UI',system-ui,sans-serif;color:#e6edf3;display:flex;flex-direction:column;height:540px}",
    ".rviz-header{display:flex;align-items:center;gap:10px;padding:12px 18px;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}",
    ".rviz-title{font-size:14px;font-weight:700;color:#e6edf3;flex:1;letter-spacing:-.2px}",
    ".rviz-badge{font-size:11px;padding:3px 10px;border-radius:12px;font-weight:600;letter-spacing:.3px}",
    ".rviz-badge.time{background:#1a2d1a;color:#3fb950;border:1px solid #3fb95050}",
    ".rviz-badge.space{background:#1a1a2d;color:#58a6ff;border:1px solid #58a6ff50}",
    ".rviz-phase{font-size:10px;padding:3px 10px;border-radius:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;transition:all .25s}",
    ".rviz-nar{padding:10px 18px;font-size:13px;color:#c9d1d9;background:#161b22;border-bottom:1px solid #30363d;min-height:38px;flex-shrink:0;line-height:1.6;transition:color .2s}",
    ".rviz-body{display:flex;flex:1;overflow:hidden;min-height:0}",
    ".rviz-left{width:44%;border-right:1px solid #30363d;overflow-y:auto;padding:14px;background:#0d1117;display:flex;flex-direction:column;gap:10px}",
    ".rviz-right{flex:1;overflow-y:auto;padding:14px;background:#0d1117;display:flex;flex-direction:column;gap:10px}",
    ".rviz-controls{display:flex;align-items:center;gap:8px;padding:10px 18px;background:#161b22;border-top:1px solid #30363d;flex-shrink:0}",
    ".rviz-btn{background:#21262d;border:1px solid #30363d;color:#e6edf3;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;transition:background .15s;font-family:inherit;font-weight:500}",
    ".rviz-btn:hover{background:#30363d}",
    ".rviz-btn.play{background:#1a2d1a;color:#3fb950;border-color:#3fb95050}",
    ".rviz-btn.play:hover{background:#1e361e}",
    ".rviz-progress{flex:1;height:3px;background:#21262d;border-radius:2px;overflow:hidden}",
    ".rviz-progress-bar{height:100%;background:linear-gradient(90deg,#58a6ff,#79c0ff);border-radius:2px;transition:width .3s ease}",
    ".rviz-step-label{font-size:11px;color:#768390;min-width:55px;text-align:right;font-variant-numeric:tabular-nums}",
    ".rviz-section-label{font-size:10px;color:#768390;font-weight:600;letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}",
  ].join("\n");

  function injectCSS() {
    if (document.getElementById("rviz-css")) return;
    var s = document.createElement("style");
    s.id = "rviz-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  window.ReactViz.panel = function createPanel(mount, opts) {
    if (!mount) return;
    injectCSS();

    var steps = opts.steps || [];
    var current = 0;
    var timer = null;
    var playing = false;
    var uid = Math.random().toString(36).slice(2);

    var timeBadge  = opts.time  ? "<span class=\"rviz-badge time\">" + opts.time + "</span>" : "";
    var spaceBadge = opts.space ? "<span class=\"rviz-badge space\">" + opts.space + "</span>" : "";

    mount.innerHTML =
      "<div class=\"rviz-wrap\">" +
        "<div class=\"rviz-header\">" +
          "<span class=\"rviz-title\">" + (opts.title || "") + "</span>" +
          timeBadge + spaceBadge +
          "<span class=\"rviz-phase\" id=\"rviz-ph-" + uid + "\"></span>" +
        "</div>" +
        "<div class=\"rviz-nar\" id=\"rviz-nr-" + uid + "\"></div>" +
        "<div class=\"rviz-body\">" +
          "<div class=\"rviz-left\" id=\"rviz-lf-" + uid + "\"></div>" +
          "<div class=\"rviz-right\" id=\"rviz-rt-" + uid + "\"></div>" +
        "</div>" +
        "<div class=\"rviz-controls\">" +
          "<button class=\"rviz-btn\" id=\"rviz-pv-" + uid + "\">&#9664; Prev</button>" +
          "<button class=\"rviz-btn play\" id=\"rviz-pl-" + uid + "\">&#9654; Play</button>" +
          "<button class=\"rviz-btn\" id=\"rviz-nx-" + uid + "\">Next &#9654;</button>" +
          "<div class=\"rviz-progress\"><div class=\"rviz-progress-bar\" id=\"rviz-br-" + uid + "\"></div></div>" +
          "<span class=\"rviz-step-label\" id=\"rviz-lb-" + uid + "\"></span>" +
        "</div>" +
      "</div>";

    var narEl  = document.getElementById("rviz-nr-" + uid);
    var phEl   = document.getElementById("rviz-ph-" + uid);
    var leftEl = document.getElementById("rviz-lf-" + uid);
    var rightEl= document.getElementById("rviz-rt-" + uid);
    var barEl  = document.getElementById("rviz-br-" + uid);
    var lblEl  = document.getElementById("rviz-lb-" + uid);
    var playBtn= document.getElementById("rviz-pl-" + uid);
    var prevBtn= document.getElementById("rviz-pv-" + uid);
    var nextBtn= document.getElementById("rviz-nx-" + uid);

    function paint(idx) {
      current = Math.max(0, Math.min(idx, steps.length - 1));
      var step = steps[current];
      if (!step) return;

      narEl.textContent = step.narration || "";

      var phase = step.phase || "idle";
      var color = PHASE_COLORS[phase] || "#58a6ff";
      phEl.textContent = phase.toUpperCase();
      phEl.style.background = color + "20";
      phEl.style.color = color;
      phEl.style.border = "1px solid " + color + "50";

      var pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 100;
      barEl.style.width = pct + "%";
      lblEl.textContent = (current + 1) + " / " + steps.length;

      try {
        opts.renderStep(rightEl, leftEl, step, current);
      } catch (e) {
        rightEl.innerHTML = "<div style=\"color:#f85149;font-size:12px;font-family:monospace;padding:12px\">Render error: " + e.message + "</div>";
        console.error("[ReactViz.panel renderStep]", e);
      }
    }

    function stopPlay() {
      if (timer) { clearInterval(timer); timer = null; }
      playing = false;
      playBtn.innerHTML = "&#9654; Play";
      playBtn.classList.add("play");
    }

    function startPlay() {
      playing = true;
      playBtn.innerHTML = "&#9646;&#9646; Pause";
      playBtn.classList.remove("play");
      timer = setInterval(function () {
        if (current >= steps.length - 1) { stopPlay(); return; }
        paint(current + 1);
      }, 1500);
    }

    prevBtn.addEventListener("click", function () { stopPlay(); paint(current - 1); });
    nextBtn.addEventListener("click", function () { stopPlay(); paint(current + 1); });
    playBtn.addEventListener("click", function () { playing ? stopPlay() : startPlay(); });

    paint(0);

    return {
      goTo: function (i) { stopPlay(); paint(i); },
      destroy: function () { stopPlay(); },
    };
  };

  window.ReactViz.esc = function (s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  window.ReactViz.codeBlock = function (code, lang) {
    return "<pre style=\"background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px 14px;font-size:12px;font-family:'JetBrains Mono','Fira Code',monospace;color:#e6edf3;overflow-x:auto;margin:0;line-height:1.7;tab-size:2\">" +
      window.ReactViz.esc(code) +
      "</pre>";
  };

  window.ReactViz.label = function (text) {
    return "<div class=\"rviz-section-label\">" + text + "</div>";
  };

  window.ReactViz.pill = function (label, color) {
    color = color || "#58a6ff";
    return "<span style=\"background:" + color + "20;color:" + color + ";border:1px solid " + color + "40;border-radius:12px;padding:3px 10px;font-size:11px;font-weight:600\">" + label + "</span>";
  };

})();
