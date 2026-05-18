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

  // ── FlowDiagram ─────────────────────────────────────────────────────────────
  // ReactViz.FlowDiagram.render(el, nodes, edges, opts)
  // nodes: [{ id, label, type, icon }]
  // edges: [{ from, to, label, dashed }]
  // opts:  { layout: 'vertical'|'horizontal'|'grid', title }
  // Node type colors: component=blue, store=orange, action=green, reducer=red,
  //                   selector=purple, cache=orange, network=gray, context=purple, hook=lightBlue
  window.ReactViz.FlowDiagram = {
    _NODE_COLORS: {
      component: "#58a6ff",
      store:     "#ffa657",
      action:    "#3fb950",
      reducer:   "#f85149",
      selector:  "#d2a8ff",
      cache:     "#ffa657",
      network:   "#768390",
      context:   "#d2a8ff",
      hook:      "#79c0ff",
      service:   "#58a6ff",
      broker:    "#ffa657",
      pod:       "#3fb950",
      database:  "#e3b341",
      default:   "#58a6ff",
    },

    render: function (el, nodes, edges, opts) {
      if (!el) return;
      opts = opts || {};
      var layout = opts.layout || "vertical";
      var nodeMap = {};
      nodes.forEach(function (n) { nodeMap[n.id] = n; });

      var nodeW = 140, nodeH = 54, gapX = 180, gapY = 90;
      var cols = layout === "grid" ? Math.ceil(Math.sqrt(nodes.length)) : 1;

      // Compute positions
      var positions = {};
      if (layout === "horizontal") {
        nodes.forEach(function (n, i) {
          positions[n.id] = { x: 60 + i * gapX, y: 80 };
        });
      } else if (layout === "grid") {
        nodes.forEach(function (n, i) {
          positions[n.id] = {
            x: 60 + (i % cols) * gapX,
            y: 60 + Math.floor(i / cols) * gapY,
          };
        });
      } else {
        // vertical
        nodes.forEach(function (n, i) {
          positions[n.id] = { x: 160, y: 50 + i * gapY };
        });
      }

      var totalW = layout === "horizontal"
        ? 60 + nodes.length * gapX + 60
        : layout === "grid"
          ? 60 + cols * gapX + 60
          : 360;
      var totalH = layout === "horizontal"
        ? 160
        : layout === "grid"
          ? 60 + Math.ceil(nodes.length / cols) * gapY + 60
          : 50 + nodes.length * gapY + 40;

      var self = this;
      var html = "<div style=\"position:relative;width:" + totalW + "px;min-height:" + totalH + "px;\">";

      if (opts.title) {
        html += "<div style=\"text-align:center;font-size:13px;font-weight:700;color:#58a6ff;margin-bottom:8px;\">" + opts.title + "</div>";
      }

      // SVG for edges
      html += "<svg style=\"position:absolute;top:0;left:0;width:" + totalW + "px;height:" + totalH + "px;overflow:visible;pointer-events:none\">";
      edges.forEach(function (e) {
        var a = positions[e.from], b = positions[e.to];
        if (!a || !b) return;
        var ax = a.x + nodeW / 2, ay = a.y + nodeH;
        var bx = b.x + nodeW / 2, by = b.y;
        var col = "#30363d";
        var dash = e.dashed ? "stroke-dasharray=\"6,3\"" : "";
        html += "<line x1=\"" + ax + "\" y1=\"" + ay + "\" x2=\"" + bx + "\" y2=\"" + by +
          "\" stroke=\"" + col + "\" stroke-width=\"1.5\" " + dash + " marker-end=\"url(#rvfd-arrow)\"/>";
        if (e.label) {
          html += "<text x=\"" + ((ax + bx) / 2 + 6) + "\" y=\"" + ((ay + by) / 2) + "\" fill=\"#768390\" font-size=\"10\" font-family=\"Inter,system-ui,sans-serif\">" + e.label + "</text>";
        }
      });
      html += "<defs><marker id=\"rvfd-arrow\" markerWidth=\"8\" markerHeight=\"8\" refX=\"6\" refY=\"3\" orient=\"auto\"><path d=\"M0,0 L0,6 L8,3 z\" fill=\"#30363d\"/></marker></defs>";
      html += "</svg>";

      // Nodes
      nodes.forEach(function (n) {
        var p = positions[n.id];
        if (!p) return;
        var col = self._NODE_COLORS[n.type] || self._NODE_COLORS.default;
        html += "<div style=\"position:absolute;left:" + p.x + "px;top:" + p.y + "px;width:" + nodeW + "px;height:" + nodeH + "px;" +
          "background:" + col + "18;border:1.5px solid " + col + "66;border-radius:8px;" +
          "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px\">";
        if (n.icon) {
          html += "<span style=\"font-size:14px\">" + n.icon + "</span>";
        }
        html += "<span style=\"font-size:11px;font-weight:700;color:" + col + ";text-align:center;padding:0 4px;line-height:1.3\">" + n.label + "</span>";
        if (n.type) {
          html += "<span style=\"font-size:9px;color:#768390;letter-spacing:.4px;text-transform:uppercase\">" + n.type + "</span>";
        }
        html += "</div>";
      });

      html += "</div>";
      el.innerHTML = html;
    },
  };

  // ── ComponentTree ────────────────────────────────────────────────────────────
  // ReactViz.ComponentTree.render(el, tree)
  // tree: { label, color, children: [...] }
  window.ReactViz.ComponentTree = {
    _renderNode: function (node, depth) {
      var col = node.color || "#58a6ff";
      var indent = depth * 20;
      var html = "<div style=\"display:flex;align-items:center;gap:6px;margin:3px 0;padding-left:" + indent + "px\">";
      if (depth > 0) {
        html += "<span style=\"color:#30363d;font-size:11px\">└─</span>";
      }
      html += "<span style=\"background:" + col + "20;border:1px solid " + col + "55;border-radius:6px;" +
        "padding:3px 10px;font-size:12px;font-weight:700;color:" + col + "\">" + node.label + "</span>";
      if (node.badge) {
        html += "<span style=\"font-size:10px;color:#768390;background:#21262d;border-radius:4px;padding:1px 6px\">" + node.badge + "</span>";
      }
      html += "</div>";
      if (node.children && node.children.length) {
        var self = this;
        node.children.forEach(function (child) {
          html += self._renderNode(child, depth + 1);
        });
      }
      return html;
    },

    render: function (el, tree) {
      if (!el || !tree) return;
      el.innerHTML = "<div style=\"font-family:'Inter',system-ui,sans-serif;padding:8px;\">" +
        this._renderNode(tree, 0) +
        "</div>";
    },
  };

  // ── HookTimeline ─────────────────────────────────────────────────────────────
  // ReactViz.HookTimeline.render(el, hooks, phase, renderNum)
  // hooks: [{ name, phase, value, fired }]
  // phase: string  renderNum: number
  window.ReactViz.HookTimeline = {
    _PHASE_COLORS: {
      mount:   "#58a6ff",
      update:  "#f0883e",
      effect:  "#3fb950",
      cleanup: "#d2a8ff",
      render:  "#58a6ff",
      commit:  "#ffa657",
    },

    render: function (el, hooks, phase, renderNum) {
      if (!el) return;
      var phaseCol = this._PHASE_COLORS[phase] || "#58a6ff";
      var html = "<div style=\"font-family:'Inter',system-ui,sans-serif;\">";
      html += "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:10px\">";
      html += "<span style=\"font-size:11px;font-weight:700;color:" + phaseCol + ";background:" + phaseCol + "20;" +
        "border:1px solid " + phaseCol + "40;border-radius:8px;padding:3px 10px;letter-spacing:.4px;text-transform:uppercase\">" + (phase || "render") + "</span>";
      if (renderNum !== undefined) {
        html += "<span style=\"font-size:11px;color:#768390\">Render #" + renderNum + "</span>";
      }
      html += "</div>";

      hooks.forEach(function (h) {
        var hcol = this._PHASE_COLORS[h.phase] || "#58a6ff";
        var fired = h.fired !== false;
        html += "<div style=\"display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #21262d\">";
        html += "<span style=\"width:8px;height:8px;border-radius:50%;background:" + (fired ? hcol : "#30363d") + ";flex-shrink:0\"></span>";
        html += "<span style=\"font-size:12px;font-weight:600;color:" + (fired ? hcol : "#768390") + ";min-width:120px\">" + h.name + "</span>";
        if (h.value !== undefined) {
          html += "<span style=\"font-size:11px;color:#c9d1d9;font-family:'JetBrains Mono',monospace;background:#21262d;padding:1px 6px;border-radius:4px\">" + h.value + "</span>";
        }
        html += "</div>";
      }, this);

      html += "</div>";
      el.innerHTML = html;
    },
  };

  // ── FiberTree ─────────────────────────────────────────────────────────────────
  // ReactViz.FiberTree.render(el, tree, phase, currentFiberName)
  // tree: { name, type, children: [...] }
  window.ReactViz.FiberTree = {
    _PHASE_COLORS: {
      beginWork:    "#58a6ff",
      completeWork: "#3fb950",
      commitWork:   "#ffa657",
      render:       "#58a6ff",
    },

    _renderFiber: function (node, phase, currentName, depth) {
      var isCurrent = node.name === currentName;
      var phCol = this._PHASE_COLORS[phase] || "#58a6ff";
      var col = isCurrent ? phCol : "#768390";
      var indent = depth * 18;
      var html = "<div style=\"display:flex;align-items:center;gap:6px;margin:2px 0;padding-left:" + indent + "px\">";
      if (depth > 0) html += "<span style=\"color:#21262d;font-size:10px\">├─</span>";
      html += "<span style=\"font-size:11px;font-weight:" + (isCurrent ? "700" : "500") + ";" +
        "color:" + col + ";background:" + (isCurrent ? phCol + "20" : "transparent") + ";" +
        "border:" + (isCurrent ? "1px solid " + phCol + "55" : "1px solid transparent") + ";" +
        "border-radius:5px;padding:2px 8px\">" + node.name + "</span>";
      if (node.type) {
        html += "<span style=\"font-size:9px;color:#30363d\">" + node.type + "</span>";
      }
      html += "</div>";
      if (node.children && node.children.length) {
        var self = this;
        node.children.forEach(function (child) {
          html += self._renderFiber(child, phase, currentName, depth + 1);
        });
      }
      return html;
    },

    render: function (el, tree, phase, currentFiberName) {
      if (!el || !tree) return;
      var phCol = this._PHASE_COLORS[phase] || "#58a6ff";
      var html = "<div style=\"font-family:'Inter',system-ui,sans-serif;\">";
      if (phase) {
        html += "<div style=\"font-size:10px;font-weight:700;color:" + phCol + ";letter-spacing:.5px;" +
          "text-transform:uppercase;margin-bottom:8px\">" + phase + "</div>";
      }
      html += this._renderFiber(tree, phase, currentFiberName, 0);
      html += "</div>";
      el.innerHTML = html;
    },
  };

})();
