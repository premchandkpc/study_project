(function () {
  'use strict';

  /*
   * FlowRenderer — sequential node-to-node animated flow
   *
   * Config shape:
   * {
   *   type: 'flow',
   *   title: 'string',
   *   direction: 'horizontal' | 'vertical'  (default: horizontal)
   *   nodes: [ { id, label, color, icon, sublabel } ],
   *   connections: [ { from, to, label, protocol, dashed } ],
   *   scenarios: [               // optional — buttons trigger different paths
   *     { name, path: [id,...], result, resultColor }
   *   ],
   *   autoPlay: false
   * }
   */

  var U = window.CVU;

  function FlowRenderer() {}

  FlowRenderer.prototype.render = function (mount, cfg) {
    var mountWidth = Math.round(mount.clientWidth || mount.getBoundingClientRect().width || 460);
    var nodes = cfg.nodes || [];
    var conns = cfg.connections || [];
    var scenarios = cfg.scenarios || [];
    var dir = cfg.direction || 'horizontal';
    var W = Math.max(760, mountWidth, nodes.length * 160);
    var H = dir === 'vertical' ? Math.max(520, 150 + nodes.length * 116) : 440;

    var ctrl   = U.makeCtrlRow(mount);
    var canvas = U.makeCanvas(mount, W, H);
    var status = U.makeStatus(mount);
    var ctx    = canvas.getContext('2d');

    // Layout nodes
    var layout = {};
    if (dir === 'horizontal') {
      var pad = 90, spacing = (W - pad * 2) / Math.max(nodes.length - 1, 1);
      nodes.forEach(function (n, i) {
        layout[n.id] = { x: pad + i * spacing, y: H / 2 };
      });
    } else {
      var padV = 64, spacingV = (H - padV * 2) / Math.max(nodes.length - 1, 1);
      nodes.forEach(function (n, i) {
        layout[n.id] = { x: W / 2, y: padV + i * spacingV };
      });
    }

    var activeNodeIdx = -1;
    var dotPos = null;
    var running = false, rafId = null;
    var activePath = scenarios.length ? scenarios[0].path : nodes.map(function(n){return n.id;});
    var activeScenario = scenarios[0] || null;
    var dotT = 0; // 0..activePath.length-1, fractional

    // Play/Pause
    var playBtn = U.makeBtn('▶ Play', U.C.blue);
    ctrl.appendChild(playBtn);

    // Scenario buttons
    scenarios.forEach(function (sc) {
      var b = U.makeBtn(sc.name, sc.resultColor || U.C.green);
      b.addEventListener('click', function () {
        activePath = sc.path;
        activeScenario = sc;
        dotT = 0; activeNodeIdx = -1;
        if (!running) { running = true; playBtn.textContent = '⏸ Pause'; raf(); }
        draw(false);
      });
      ctrl.appendChild(b);
    });

    // Step button
    var stepBtn = U.makeBtn('Step ›', U.C.gray);
    ctrl.appendChild(stepBtn);

    function nodeById(id) { return nodes.find(function(n){return n.id===id;}); }

    function draw(hasDot) {
      U.clearBg(ctx, W, H);

      // Title
      if (cfg.title) {
        U.text(ctx, cfg.title, W/2, 26, U.C.blue, 18, 'center', 'bold');
      }

      // Draw connections
      conns.forEach(function (c) {
        var a = layout[c.from], b = layout[c.to];
        if (!a || !b) return;
        var col = c.protocol ? (U.PROTO[c.protocol] || U.C.gray) : U.C.border;
        U.arrow(ctx, a.x, a.y, b.x, b.y, col, 1.5, c.dashed);
        if (c.label) {
          var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          U.text(ctx, c.label, mx, my - 12, col, 12, 'center', 'bold');
        }
      });

      // Draw nodes
      nodes.forEach(function (n) {
        var p = layout[n.id];
        var isActive = activePath.indexOf(n.id) <= activeNodeIdx && activeNodeIdx >= 0;
        var col = n.color || U.C.blue;
        var boxW = 132, boxH = 68;
        U.roundRect(ctx, p.x - boxW/2, p.y - boxH/2, boxW, boxH, 6,
          isActive ? col + '33' : U.C.card,
          isActive ? col : U.C.border, isActive ? 2 : 1.5);

        if (n.icon) U.text(ctx, n.icon, p.x - boxW/2 + 12, p.y - 12, null, 17, 'left');
        U.wrapText(ctx, n.label, p.x + (n.icon ? 8 : 0), p.y - 2, boxW - 24, 15, isActive ? col : U.C.text, 13, 'center', isActive ? 'bold' : '600', 2);
        if (n.sublabel) U.wrapText(ctx, n.sublabel, p.x, p.y + boxH/2 + 18, boxW + 20, 13, U.C.gray, 11, 'center', 'normal', 2);
      });

      // Moving dot
      if (hasDot && dotPos) {
        U.dot(ctx, dotPos.x, dotPos.y, 7, U.C.text);
        // glow
        ctx.beginPath(); ctx.arc(dotPos.x, dotPos.y, 11, 0, Math.PI*2);
        ctx.strokeStyle = U.C.text + '44'; ctx.lineWidth = 2; ctx.stroke();
      }

      // Result
      if (activeNodeIdx >= activePath.length - 1 && activeScenario && activeScenario.result) {
        U.text(ctx, activeScenario.result, W/2, H - 14, activeScenario.resultColor || U.C.green, 12, 'center', 'bold');
      }
    }

    function raf() {
      if (!running || !document.body.contains(canvas)) return;
      rafId = requestAnimationFrame(function () {
        dotT += 0.02;
        var seg = Math.floor(dotT);
        var frac = dotT - seg;

        if (seg >= activePath.length - 1) {
          activeNodeIdx = activePath.length - 1;
          dotPos = null;
          draw(false);
          running = false; playBtn.textContent = '▶ Play';
          if (activeScenario) status.textContent = activeScenario.result || 'Done';
          return;
        }
        activeNodeIdx = seg;
        var fromId = activePath[seg], toId = activePath[seg + 1];
        var a = layout[fromId], b = layout[toId];
        if (a && b) {
          dotPos = { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
        }
        draw(true);
        raf();
      });
    }

    playBtn.addEventListener('click', function () {
      if (running) {
        running = false; cancelAnimationFrame(rafId); playBtn.textContent = '▶ Play';
      } else {
        dotT = 0; activeNodeIdx = -1; running = true; playBtn.textContent = '⏸ Pause';
        raf();
      }
    });

    stepBtn.addEventListener('click', function () {
      running = false; cancelAnimationFrame(rafId); playBtn.textContent = '▶ Play';
      activeNodeIdx = Math.min(activeNodeIdx + 1, activePath.length - 1);
      dotPos = null;
      draw(false);
      if (activeScenario && activeNodeIdx >= activePath.length - 1) {
        status.textContent = activeScenario.result || '';
      }
    });

    draw(false);
    if (cfg.autoPlay) { running = true; playBtn.textContent = '⏸ Pause'; raf(); }
  };

  window.VizEngine && window.VizEngine.register('flow', new FlowRenderer());
})();
