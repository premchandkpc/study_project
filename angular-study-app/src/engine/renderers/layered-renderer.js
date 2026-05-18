(/* global CanvasRenderer */
  function () {
    "use strict";

    /*
   * LayeredRenderer — horizontal layer-band architecture view
   *
   * Config shape:
   * {
   *   type: 'layered',
   *   title: 'string',
   *   layers: [
   *     {
   *       id, label, color,
   *       services: [ { id, label, icon, cloud } ],
   *       protocols: 'string',   // shown under layer label
   *     }
   *   ],
   *   flows: [   // optional — named paths for button scenarios
   *     { name, path: [serviceId,...], color }
   *   ]
   * }
   */

    // LayeredRenderer extends CanvasRenderer (defined in base-renderer.js)
    function LayeredRenderer() { CanvasRenderer.call(this); }
    LayeredRenderer.prototype = Object.create(CanvasRenderer.prototype);
    LayeredRenderer.prototype.constructor = LayeredRenderer;

    LayeredRenderer.prototype.render = function (mount, cfg) {
      var U = this._cvu(mount);
      if (!U) return;
      var self     = this;
      var mountWidth = Math.round(mount.clientWidth || mount.getBoundingClientRect().width || 460);
      var W        = Math.max(780, mountWidth);
      var layers   = cfg.layers || [];
      var lH       = 100;
      var padTop   = cfg.title ? 44 : 18;
      var H        = padTop + layers.length * (lH + 12) + 32;

      var canvas   = this._makeCanvas(mount, W, H);
      var ctrl     = this._makeCtrlRow(mount);
      if (!canvas) return;
      var ctx      = canvas.getContext("2d");

      var activeFlow     = null;
      var activeStepIdx  = -1;
      var running        = false, rafId = null;
      var dotPos         = null, dotT  = 0;

      var playBtn = this._makeBtn("▶ Play", U.C.blue);
      ctrl.appendChild(playBtn);

      // Flow buttons
      (cfg.flows || []).forEach(function (fl) {
        var b = self._makeBtn(fl.name, fl.color || U.C.orange);
        b.addEventListener("click", function () {
          stopAnimation();
          activeFlow = fl; activeStepIdx = -1; dotT = 0;
          running = true; playBtn.textContent = "⏸ Pause";
          raf();
        });
        ctrl.appendChild(b);
      });

      // Build service position index: serviceId → {x, y}
      var svcPos = {};

      function layerTop(i) { return padTop + i * (lH + 4); }

      function drawStatic() {
        U.clearBg(ctx, W, H);
        if (cfg.title) U.text(ctx, cfg.title, W/2, 28, U.C.blue, 18, "center", "bold");

        layers.forEach(function (layer, i) {
          var y   = layerTop(i);
          var col = layer.color || U.C.blue;
          var svcs = layer.services || [];

          // Layer band bg
          U.roundRect(ctx, 6, y, W - 12, lH, 8, col + "14", col + "44", 1.5);

          // Left accent
          ctx.fillStyle = col; ctx.fillRect(6, y + 3, 5, lH - 6);

          // Label
          U.wrapText(ctx, layer.label, 20, y + 30, 120, 15, col, 13, "left", "bold", 2);
          if (layer.protocols) U.wrapText(ctx, layer.protocols, 20, y + 62, 120, 13, U.C.gray, 11, "left", "normal", 2);

          // Services
          var svcW = Math.min(150, Math.max(104, Math.floor((W - 240) / Math.max(svcs.length, 4))));
          var svcH = 58;
          var startX = 155, endX = W - 26;
          var spacing = svcs.length > 1 ? (endX - startX - svcW) / (svcs.length - 1) : 0;
          svcs.forEach(function (svc, j) {
            var sx = startX + j * spacing;
            var sy = y + (lH - svcH) / 2;
            var inPath = activeFlow && activeFlow.path.indexOf(svc.id) !== -1 &&
                       activeFlow.path.indexOf(svc.id) <= activeStepIdx;
            U.roundRect(ctx, sx, sy, svcW, svcH, 7,
              inPath ? col + "44" : U.C.card,
              inPath ? col : U.C.border, inPath ? 2 : 1);
            if (svc.icon) U.text(ctx, svc.icon, sx + 12, sy + 24, null, 16, "left");
            U.wrapText(ctx, svc.label, sx + svcW/2 + (svc.icon ? 8 : 0), sy + svcH/2 + 4, svcW - 20, 14, inPath ? col : U.C.text, 12, "center", inPath ? "bold" : "600", 2);

            svcPos[svc.id] = { x: sx + svcW/2, y: sy + svcH/2 };
          });
        });
      }

      function stopAnimation() {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        running = false;
      }

      function raf() {
        if (!running || !self._alive(canvas)) return;
        if (!activeFlow || !activeFlow.path.length) return;

        rafId = requestAnimationFrame(function () {
          dotT += 0.02;
          var seg  = Math.floor(dotT);
          var frac = dotT - seg;

          if (seg >= activeFlow.path.length - 1) {
            activeStepIdx = activeFlow.path.length - 1;
            dotPos = null;
            drawStatic();
            stopAnimation();
            playBtn.textContent = "▶ Play";
            return;
          }

          activeStepIdx = seg;
          var fromId = activeFlow.path[seg], toId = activeFlow.path[seg + 1];
          var a = svcPos[fromId], b = svcPos[toId];
          if (a && b) dotPos = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };

          drawStatic();
          if (dotPos) {
            var col = activeFlow.color || U.C.text;
            U.dot(ctx, dotPos.x, dotPos.y, 6, col);
            ctx.beginPath(); ctx.arc(dotPos.x, dotPos.y, 10, 0, Math.PI*2);
            ctx.strokeStyle = col + "44"; ctx.lineWidth = 2; ctx.stroke();
          }
          raf();
        });
      }

      playBtn.addEventListener("click", function () {
        if (running) {
          stopAnimation();
          playBtn.textContent = "▶ Play";
          drawStatic();
        } else {
          if (!activeFlow && cfg.flows && cfg.flows.length) activeFlow = cfg.flows[0];
          if (!activeFlow || !activeFlow.path.length) return;
          stopAnimation();
          dotT = 0; activeStepIdx = -1; running = true; playBtn.textContent = "⏸ Pause";
          raf();
        }
      });

      drawStatic();
    };

    window.VizEngine && window.VizEngine.register("layered", new LayeredRenderer());
  })();
