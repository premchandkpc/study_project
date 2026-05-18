(/* global CanvasRenderer */
  function () {
    "use strict";

    /*
   * SwimlaneRenderer — always-visible horizontal lane comparison
   *
   * Config shape:
   * {
   *   type: 'swimlane',
   *   title: 'string',
   *   lanes: [
   *     {
   *       id, label, color,
   *       nodes: [ { id, label, sublabel, icon } ],
   *       badge: 'string',       // right-side badge
   *       description: 'string'  // shown under label
   *     }
   *   ]
   * }
   */

    // SwimlaneRenderer extends CanvasRenderer (defined in base-renderer.js)
    function SwimlaneRenderer() { CanvasRenderer.call(this); }
    SwimlaneRenderer.prototype = Object.create(CanvasRenderer.prototype);
    SwimlaneRenderer.prototype.constructor = SwimlaneRenderer;

    SwimlaneRenderer.prototype.render = function (mount, cfg) {
      var U = this._cvu(mount);
      if (!U) return;
      var self    = this;
      var lanes   = cfg.lanes || [];
      var laneH   = 108;
      var padTop  = cfg.title ? 48 : 18;
      var mountWidth = Math.round(mount.clientWidth || mount.getBoundingClientRect().width || 460);
      var W       = Math.max(820, mountWidth);
      var H       = padTop + lanes.length * (laneH + 14) + 32;

      var canvas  = this._makeCanvas(mount, W, H);
      var ctrl    = this._makeCtrlRow(mount);
      if (!canvas) return;
      var ctx     = canvas.getContext("2d");

      var dots    = []; // animated packets per lane
      var running = false, rafId = null;

      var playBtn = this._makeBtn("▶ Play", U.C.blue);
      ctrl.appendChild(playBtn);

      function laneTop(i) { return padTop + i * (laneH + 8); }

      function drawLanes() {
        U.clearBg(ctx, W, H);

        if (cfg.title) {
          U.text(ctx, cfg.title, W/2, 30, U.C.blue, 18, "center", "bold");
        }

        lanes.forEach(function (lane, i) {
          var y     = laneTop(i);
          var col   = lane.color || U.C.blue;
          var nodes = lane.nodes || [];

          // Lane bg
          U.roundRect(ctx, 8, y, W - 16, laneH, 10, col + "18", col + "55", 1.5);

          // Left accent bar
          ctx.fillStyle = col;
          ctx.fillRect(8, y + 3, 5, laneH - 6);

          // Label
          U.wrapText(ctx, lane.label, 22, y + 28, 128, 15, col, 13, "left", "bold", 2);
          if (lane.description) U.wrapText(ctx, lane.description, 22, y + 64, 128, 13, U.C.gray, 11, "left", "normal", 2);

          // Nodes
          if (nodes.length) {
            var startX = 170, endX = W - 96;
            var nodeW = Math.min(140, Math.max(100, Math.floor((endX - startX) / Math.max(nodes.length, 5))));
            var spacing = nodes.length > 1 ? (endX - startX - nodeW) / (nodes.length - 1) : 0;
            nodes.forEach(function (n, j) {
              var nx = startX + j * spacing + nodeW / 2, ny = y + laneH / 2;
              var nCol = n.color || col;
              U.roundRect(ctx, nx - nodeW / 2, ny - 24, nodeW, 48, 8, nCol + "22", nCol, 1);
              if (n.icon) U.text(ctx, n.icon, nx - nodeW / 2 + 12, ny - 3, null, 15, "left");
              U.wrapText(ctx, n.label, nx + (n.icon ? 8 : 0), ny + 2, nodeW - 18, 13, U.C.text, 12, "center", "700", 2);
              if (n.sublabel) U.wrapText(ctx, n.sublabel, nx, ny + 34, nodeW + 8, 12, U.C.gray, 10, "center", "normal", 2);

              // Arrow to next node
              if (j < nodes.length - 1) {
                var nx2 = startX + (j + 1) * spacing + nodeW / 2;
                U.arrow(ctx, nx + nodeW / 2, ny, nx2 - nodeW / 2, ny, col + "aa", 1, false);
              }
            });
          }

          // Badge
          if (lane.badge) {
            var bw = lane.badge.length * 7 + 20;
            U.roundRect(ctx, W - 10 - bw, y + laneH/2 - 13, bw, 26, 6, col + "33", col, 1);
            U.text(ctx, lane.badge, W - 10 - bw/2, y + laneH/2 + 5, col, 11, "center", "bold");
          }
        });
      }

      function spawnDots() {
        lanes.forEach(function (lane, i) {
          var nodes = lane.nodes || [];
          if (nodes.length < 2) return;
          dots.push({
            laneIdx: i,
            col:     lane.color || U.C.blue,
            t:       0,          // 0..nodes.length-1 fractional
            nodes:   nodes,
            startX:  170,
            endX:    W - 96,
          });
        });
      }

      function raf() {
        if (!running || !self._alive(canvas)) return;
        rafId = requestAnimationFrame(function () {
          drawLanes();
          dots.forEach(function (d) {
            d.t += 0.018;
            var seg  = Math.floor(d.t);
            var frac = d.t - seg;
            var spacing = (d.endX - d.startX) / Math.max(d.nodes.length - 1, 1);
            var ly  = laneTop(d.laneIdx);

            if (seg >= d.nodes.length - 1) {
            // Reset
              d.t = 0;
            } else {
              var x = d.startX + (seg + frac) * spacing;
              var y = ly + laneH / 2;
              U.dot(ctx, x, y, 6, d.col);
            }
          });
          raf();
        });
      }

      playBtn.addEventListener("click", function () {
        if (running) {
          running = false; cancelAnimationFrame(rafId); playBtn.textContent = "▶ Play";
          drawLanes();
        } else {
          running = true; playBtn.textContent = "⏸ Pause";
          if (!dots.length) spawnDots();
          raf();
        }
      });

      drawLanes();
    };

    window.VizEngine && window.VizEngine.register("swimlane", new SwimlaneRenderer());
  })();
