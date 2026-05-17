(function () {
  'use strict';

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

  var U = window.CVU;

  function SwimlaneRenderer() {}

  SwimlaneRenderer.prototype.render = function (mount, cfg) {
    var lanes   = cfg.lanes || [];
    var laneH   = 80;
    var padTop  = cfg.title ? 36 : 14;
    var mountWidth = Math.round(mount.clientWidth || mount.getBoundingClientRect().width || 460);
    var W       = Math.max(520, mountWidth);
    var H       = padTop + lanes.length * (laneH + 10) + 24;

    var canvas  = U.makeCanvas(mount, W, H);
    var ctrl    = U.makeCtrlRow(mount);
    var ctx     = canvas.getContext('2d');

    var dots    = []; // animated packets per lane
    var running = false, rafId = null;

    var playBtn = U.makeBtn('▶ Play', U.C.blue);
    ctrl.appendChild(playBtn);

    function laneTop(i) { return padTop + i * (laneH + 8); }

    function drawLanes() {
      U.clearBg(ctx, W, H);

      if (cfg.title) {
        U.text(ctx, cfg.title, W/2, 18, U.C.blue, 12, 'center', 'bold');
      }

      lanes.forEach(function (lane, i) {
        var y     = laneTop(i);
        var col   = lane.color || U.C.blue;
        var nodes = lane.nodes || [];

        // Lane bg
        U.roundRect(ctx, 6, y, W - 12, laneH, 6, col + '18', col + '55', 1.5);

        // Left accent bar
        ctx.fillStyle = col;
        ctx.fillRect(6, y + 2, 4, laneH - 4);

        // Label
        U.text(ctx, lane.label, 18, y + 16, col, 11, 'left', 'bold');
        if (lane.description) U.text(ctx, lane.description, 18, y + 30, U.C.gray, 9, 'left');

        // Nodes
        if (nodes.length) {
          var startX = 120, endX = W - 80;
          var nodeW = Math.min(96, Math.max(64, Math.floor((endX - startX) / Math.max(nodes.length, 5))));
          var spacing = nodes.length > 1 ? (endX - startX - nodeW) / (nodes.length - 1) : 0;
          nodes.forEach(function (n, j) {
            var nx = startX + j * spacing + nodeW / 2, ny = y + laneH / 2;
            var nCol = n.color || col;
            U.roundRect(ctx, nx - nodeW / 2, ny - 14, nodeW, 28, 6, nCol + '22', nCol, 1);
            if (n.icon) U.text(ctx, n.icon, nx - nodeW / 2 + 10, ny + 4, null, 10, 'left');
            U.text(ctx, n.label, nx, ny + 4, U.C.text, 10, 'center');
            if (n.sublabel) U.text(ctx, n.sublabel, nx, ny + 22, U.C.gray, 8);

            // Arrow to next node
            if (j < nodes.length - 1) {
              var nx2 = startX + (j + 1) * spacing + nodeW / 2;
              U.arrow(ctx, nx + nodeW / 2, ny, nx2 - nodeW / 2, ny, col + 'aa', 1, false);
            }
          });
        }

        // Badge
        if (lane.badge) {
          var bw = lane.badge.length * 6 + 16;
          U.roundRect(ctx, W - 6 - bw, y + laneH/2 - 10, bw, 20, 4, col + '33', col, 1);
          U.text(ctx, lane.badge, W - 6 - bw/2, y + laneH/2 + 4, col, 9, 'center');
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
          startX:  110,
          endX:    W - 80,
        });
      });
    }

    function raf() {
      if (!running || !document.body.contains(canvas)) return;
      rafId = requestAnimationFrame(function () {
        drawLanes();
        var allDone = true;
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
            allDone = false;
            var x = d.startX + (seg + frac) * spacing;
            var y = ly + 36;
            U.dot(ctx, x, y, 5, d.col);
          }
        });
        raf();
      });
    }

    playBtn.addEventListener('click', function () {
      if (running) {
        running = false; cancelAnimationFrame(rafId); playBtn.textContent = '▶ Play';
        drawLanes();
      } else {
        running = true; playBtn.textContent = '⏸ Pause';
        if (!dots.length) spawnDots();
        raf();
      }
    });

    drawLanes();
  };

  window.VizEngine && window.VizEngine.register('swimlane', new SwimlaneRenderer());
})();
