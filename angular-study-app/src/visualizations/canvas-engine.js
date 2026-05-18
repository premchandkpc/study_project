(function () {
  "use strict";

  // ── CanvasEngine ──────────────────────────────────────────────────────────
  // Infinite pan/zoom canvas with:
  //   - smooth inertia pan
  //   - pinch/wheel zoom
  //   - minimap
  //   - camera focus animation (smooth zoom-to-node)
  //   - grid background
  //   - viewport culling helpers
  //
  // Usage:
  //   var eng = CanvasEngine.create(canvasEl, { onDraw: fn, onNodeClick: fn })
  //   eng.focusNode({ x, y, w, h })
  //   eng.zoomTo(0.5)
  //   eng.reset()
  //   eng.destroy()

  var MIN_ZOOM = 0.1;
  var MAX_ZOOM = 4.0;
  var GRID_SIZE = 40;

  function create(canvas, opts) {
    opts = opts || {};
    var ctx = canvas.getContext("2d");

    // ── Viewport state ────────────────────────────────────────────────
    var vp = { x: 0, y: 0, zoom: 1.0 };
    var _drag = null;
    var _vel  = { x: 0, y: 0 };
    var _raf  = null;
    var _animating = false;
    var _nodes = [];  // for hit-testing

    // ── Resize ────────────────────────────────────────────────────────
    function resize() {
      canvas.width  = canvas.offsetWidth  || 800;
      canvas.height = canvas.offsetHeight || 500;
      draw();
    }

    // ── Transform helpers ─────────────────────────────────────────────
    function screenToWorld(sx, sy) {
      return { x: (sx - vp.x) / vp.zoom, y: (sy - vp.y) / vp.zoom };
    }

    function worldToScreen(wx, wy) {
      return { x: wx * vp.zoom + vp.x, y: wy * vp.zoom + vp.y };
    }

    // ── Grid draw ─────────────────────────────────────────────────────
    function drawGrid() {
      var C = window.CS || {};
      ctx.save();
      ctx.fillStyle = (C.canvas && C.canvas.bg) || "#0B1020";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      var gs = GRID_SIZE * vp.zoom;
      var ox = vp.x % gs;
      var oy = vp.y % gs;

      ctx.strokeStyle = (C.canvas && C.canvas.gridLine) || "rgba(45,63,96,0.4)";
      ctx.lineWidth   = 0.5;
      ctx.beginPath();
      for (var x = ox; x < canvas.width; x += gs) {
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height);
      }
      for (var y = oy; y < canvas.height; y += gs) {
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── Main draw ─────────────────────────────────────────────────────
    function draw() {
      if (!ctx) return;
      drawGrid();
      ctx.save();
      ctx.translate(vp.x, vp.y);
      ctx.scale(vp.zoom, vp.zoom);
      if (opts.onDraw) opts.onDraw(ctx, vp, canvas);
      ctx.restore();
      if (opts.minimap) _drawMinimap();
    }

    // ── Minimap ───────────────────────────────────────────────────────
    function _drawMinimap() {
      var mw = 160, mh = 100;
      var mx = canvas.width - mw - 12;
      var my = canvas.height - mh - 12;

      ctx.save();
      ctx.fillStyle   = "rgba(18,26,42,0.85)";
      ctx.strokeStyle = "rgba(45,63,96,0.8)";
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, 6);
      ctx.fill(); ctx.stroke();

      // viewport rect on minimap
      var totalW = canvas.width  / vp.zoom;
      var totalH = canvas.height / vp.zoom;
      var scale  = Math.min(mw / totalW, mh / totalH) * 0.8;
      var vx = mx + 8 + (-vp.x / vp.zoom) * scale;
      var vy = my + 8 + (-vp.y / vp.zoom) * scale;
      var vw = (canvas.width  / vp.zoom) * scale;
      var vh = (canvas.height / vp.zoom) * scale;

      ctx.strokeStyle = "rgba(6,182,212,0.7)";
      ctx.lineWidth   = 1.5;
      ctx.strokeRect(vx, vy, vw, vh);

      // node dots
      if (opts.onDrawMinimap) opts.onDrawMinimap(ctx, mx + 8, my + 8, scale);

      ctx.restore();
    }

    // ── Zoom ──────────────────────────────────────────────────────────
    function zoom(factor, cx, cy) {
      cx = cx || canvas.width  / 2;
      cy = cy || canvas.height / 2;
      var newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, vp.zoom * factor));
      var ratio   = newZoom / vp.zoom;
      vp.x  = cx - ratio * (cx - vp.x);
      vp.y  = cy - ratio * (cy - vp.y);
      vp.zoom = newZoom;
      draw();
    }

    // ── Focus node (smooth animated zoom-to) ─────────────────────────
    function focusNode(node, targetZoom) {
      targetZoom = targetZoom || 1.4;
      var tx = canvas.width  / 2 - (node.x + node.w / 2) * targetZoom;
      var ty = canvas.height / 2 - (node.y + node.h / 2) * targetZoom;
      _animateTo(tx, ty, targetZoom, 400);
    }

    function _animateTo(tx, ty, tz, duration) {
      var startX = vp.x, startY = vp.y, startZ = vp.zoom;
      var t0 = performance.now();
      _animating = true;

      function step(t) {
        var elapsed = t - t0;
        var p = Math.min(1, elapsed / duration);
        var ease = 1 - Math.pow(1 - p, 3); // ease-out-cubic
        vp.x    = startX + (tx - startX) * ease;
        vp.y    = startY + (ty - startY) * ease;
        vp.zoom = startZ + (tz - startZ) * ease;
        draw();
        if (p < 1) requestAnimationFrame(step);
        else _animating = false;
      }
      requestAnimationFrame(step);
    }

    function zoomTo(z) {
      _animateTo(vp.x, vp.y, z, 300);
    }

    function fitAll(nodes, padding) {
      if (!nodes || !nodes.length) return;
      padding = padding || 60;
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(function (n) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + (n.w || 120));
        maxY = Math.max(maxY, n.y + (n.h || 48));
      });
      var bw = maxX - minX + padding * 2;
      var bh = maxY - minY + padding * 2;
      var z  = Math.min(canvas.width / bw, canvas.height / bh, MAX_ZOOM);
      var tx = canvas.width  / 2 - ((minX + maxX) / 2) * z;
      var ty = canvas.height / 2 - ((minY + maxY) / 2) * z;
      _animateTo(tx, ty, z, 500);
    }

    function reset() {
      _animateTo(0, 0, 1.0, 300);
    }

    // ── Inertia loop ──────────────────────────────────────────────────
    function _inertiaLoop() {
      if (Math.abs(_vel.x) < 0.3 && Math.abs(_vel.y) < 0.3) {
        _vel = { x: 0, y: 0 };
        return;
      }
      vp.x  += _vel.x;
      vp.y  += _vel.y;
      _vel.x *= 0.92;
      _vel.y *= 0.92;
      draw();
      requestAnimationFrame(_inertiaLoop);
    }

    // ── Events ────────────────────────────────────────────────────────
    function _onWheel(e) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        zoom(e.deltaY < 0 ? 1.1 : 0.9, e.offsetX, e.offsetY);
      } else {
        vp.x -= e.deltaX;
        vp.y -= e.deltaY;
        draw();
      }
    }

    function _onMouseDown(e) {
      _drag = { sx: e.clientX, sy: e.clientY, ox: vp.x, oy: vp.y, t: Date.now() };
      _vel = { x: 0, y: 0 };
    }

    function _onMouseMove(e) {
      if (!_drag) return;
      var dx = e.clientX - _drag.sx;
      var dy = e.clientY - _drag.sy;
      _vel.x = dx - (vp.x - _drag.ox);
      _vel.y = dy - (vp.y - _drag.oy);
      vp.x = _drag.ox + dx;
      vp.y = _drag.oy + dy;
      draw();
    }

    function _onMouseUp(e) {
      if (!_drag) return;
      var duration = Date.now() - _drag.t;
      if (duration < 200 && Math.abs(_vel.x) < 3 && Math.abs(_vel.y) < 3) {
        // click — hit-test world coords
        var wp = screenToWorld(e.offsetX, e.offsetY);
        if (opts.onNodeClick) {
          var hit = _nodes.find(function (n) {
            return wp.x >= n.x && wp.x <= n.x + n.w &&
                   wp.y >= n.y && wp.y <= n.y + n.h;
          });
          if (hit) opts.onNodeClick(hit);
        }
      } else {
        requestAnimationFrame(_inertiaLoop);
      }
      _drag = null;
    }

    function _onTouchStart(e) {
      if (e.touches.length === 1) {
        _drag = { sx: e.touches[0].clientX, sy: e.touches[0].clientY, ox: vp.x, oy: vp.y, t: Date.now() };
        _vel = { x: 0, y: 0 };
      }
    }

    function _onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && _drag) {
        var dx = e.touches[0].clientX - _drag.sx;
        var dy = e.touches[0].clientY - _drag.sy;
        vp.x = _drag.ox + dx;
        vp.y = _drag.oy + dy;
        draw();
      } else if (e.touches.length === 2) {
        // pinch zoom
        var d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (!_drag._lastPinch) { _drag._lastPinch = d; return; }
        zoom(d / _drag._lastPinch,
          (e.touches[0].clientX + e.touches[1].clientX) / 2,
          (e.touches[0].clientY + e.touches[1].clientY) / 2
        );
        _drag._lastPinch = d;
      }
    }

    function _onTouchEnd() { _drag = null; }

    canvas.addEventListener("wheel",      _onWheel,     { passive: false });
    canvas.addEventListener("mousedown",  _onMouseDown);
    canvas.addEventListener("mousemove",  _onMouseMove);
    canvas.addEventListener("mouseup",    _onMouseUp);
    canvas.addEventListener("mouseleave", function () { _drag = null; });
    canvas.addEventListener("touchstart", _onTouchStart, { passive: true });
    canvas.addEventListener("touchmove",  _onTouchMove,  { passive: false });
    canvas.addEventListener("touchend",   _onTouchEnd);

    var _resizeObs = new ResizeObserver(resize);
    _resizeObs.observe(canvas.parentElement || canvas);
    resize();

    return {
      draw:          draw,
      zoom:          zoom,
      zoomTo:        zoomTo,
      focusNode:     focusNode,
      fitAll:        fitAll,
      reset:         reset,
      getViewport:   function () { return Object.assign({}, vp); },
      screenToWorld: screenToWorld,
      worldToScreen: worldToScreen,
      setNodes:      function (nodes) { _nodes = nodes || []; },
      isInViewport:  function (wx, wy, ww, wh) {
        var s = worldToScreen(wx, wy);
        return s.x + ww * vp.zoom > 0 && s.x < canvas.width &&
               s.y + wh * vp.zoom > 0 && s.y < canvas.height;
      },
      destroy: function () {
        _resizeObs.disconnect();
        canvas.removeEventListener("wheel",      _onWheel);
        canvas.removeEventListener("mousedown",  _onMouseDown);
        canvas.removeEventListener("mousemove",  _onMouseMove);
        canvas.removeEventListener("mouseup",    _onMouseUp);
        canvas.removeEventListener("touchstart", _onTouchStart);
        canvas.removeEventListener("touchmove",  _onTouchMove);
        canvas.removeEventListener("touchend",   _onTouchEnd);
      },
    };
  }

  window.CanvasEngine = { create: create };

})();
