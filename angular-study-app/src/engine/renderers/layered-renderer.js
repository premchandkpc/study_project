(function () {
  'use strict';

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

  var U = window.CVU;

  function LayeredRenderer() {}

  LayeredRenderer.prototype.render = function (mount, cfg) {
    var W        = 460;
    var layers   = cfg.layers || [];
    var lH       = 58;
    var padTop   = cfg.title ? 28 : 8;
    var H        = padTop + layers.length * (lH + 4) + 20;

    var canvas   = U.makeCanvas(mount, W, H);
    var ctrl     = U.makeCtrlRow(mount);
    var ctx      = canvas.getContext('2d');

    var activeFlow     = null;
    var activeStepIdx  = -1;
    var running        = false, rafId = null;
    var dotPos         = null, dotT  = 0;

    var playBtn = U.makeBtn('▶ Play', U.C.blue);
    ctrl.appendChild(playBtn);

    // Flow buttons
    (cfg.flows || []).forEach(function (fl) {
      var b = U.makeBtn(fl.name, fl.color || U.C.orange);
      b.addEventListener('click', function () {
        activeFlow = fl; activeStepIdx = -1; dotT = 0;
        running = true; playBtn.textContent = '⏸ Pause';
        raf();
      });
      ctrl.appendChild(b);
    });

    // Build service position index: serviceId → {x, y}
    var svcPos = {};

    function layerTop(i) { return padTop + i * (lH + 4); }

    function drawStatic() {
      U.clearBg(ctx, W, H);
      if (cfg.title) U.text(ctx, cfg.title, W/2, 18, U.C.blue, 12, 'center', 'bold');

      layers.forEach(function (layer, i) {
        var y   = layerTop(i);
        var col = layer.color || U.C.blue;
        var svcs = layer.services || [];

        // Layer band bg
        U.roundRect(ctx, 4, y, W - 8, lH, 5, col + '14', col + '44', 1.5);

        // Left accent
        ctx.fillStyle = col; ctx.fillRect(4, y + 2, 3, lH - 4);

        // Label
        U.text(ctx, layer.label, 14, y + 16, col, 10, 'left', 'bold');
        if (layer.protocols) U.text(ctx, layer.protocols, 14, y + 28, U.C.gray, 8, 'left');

        // Services
        var svcW = 62, svcH = 28;
        var startX = 110, endX = W - 8;
        var spacing = svcs.length > 1 ? (endX - startX - svcW) / (svcs.length - 1) : 0;
        svcs.forEach(function (svc, j) {
          var sx = startX + j * spacing;
          var sy = y + (lH - svcH) / 2;
          var inPath = activeFlow && activeFlow.path.indexOf(svc.id) !== -1 &&
                       activeFlow.path.indexOf(svc.id) <= activeStepIdx;
          U.roundRect(ctx, sx, sy, svcW, svcH, 4,
            inPath ? col + '44' : U.C.card,
            inPath ? col : U.C.border, inPath ? 2 : 1);
          if (svc.icon) U.text(ctx, svc.icon, sx + 6, sy + 18, null, 10, 'left');
          U.text(ctx, svc.label, sx + svcW/2, sy + 18, inPath ? col : U.C.text, 8, 'center', inPath ? 'bold' : 'normal');

          svcPos[svc.id] = { x: sx + svcW/2, y: sy + svcH/2 };
        });
      });
    }

    function raf() {
      if (!running || !document.body.contains(canvas)) return;
      if (!activeFlow || !activeFlow.path.length) return;

      rafId = requestAnimationFrame(function () {
        dotT += 0.02;
        var seg  = Math.floor(dotT);
        var frac = dotT - seg;

        if (seg >= activeFlow.path.length - 1) {
          activeStepIdx = activeFlow.path.length - 1;
          dotPos = null;
          drawStatic();
          running = false; playBtn.textContent = '▶ Play';
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
          ctx.strokeStyle = col + '44'; ctx.lineWidth = 2; ctx.stroke();
        }
        raf();
      });
    }

    playBtn.addEventListener('click', function () {
      if (running) {
        running = false; cancelAnimationFrame(rafId); playBtn.textContent = '▶ Play'; drawStatic();
      } else {
        if (!activeFlow && cfg.flows && cfg.flows.length) activeFlow = cfg.flows[0];
        dotT = 0; activeStepIdx = -1; running = true; playBtn.textContent = '⏸ Pause';
        raf();
      }
    });

    drawStatic();
  };

  window.VizEngine && window.VizEngine.register('layered', new LayeredRenderer());
})();
