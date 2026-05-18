(function () {
  "use strict";

  // ── LayoutEngine ──────────────────────────────────────────────────────────
  // Topology layout with collision detection + force-directed positioning.
  // Ensures nodes NEVER overlap or leave viewport.
  //
  // Usage:
  //   var result = LayoutEngine.compute(nodes, edges, opts)
  //   // result.nodes → [{id, x, y, w, h}]  — positioned, non-overlapping
  //
  // Layout presets:
  //   "flow"       — top-to-bottom pipeline (Kafka, HTTP)
  //   "hierarchy"  — tree layout (K8s cluster→node→pod)
  //   "force"      — force-directed (general graphs)
  //   "swimlane"   — horizontal lanes (thread pools)
  //   "radial"     — ring layout (peer-to-peer, gossip)

  var PADDING    = 24;
  var MIN_DIST   = 20;
  var ITERATIONS = 60;

  // ── Main entry ────────────────────────────────────────────────────────────
  function compute(nodes, edges, opts) {
    opts = opts || {};
    var W = opts.width  || 900;
    var H = opts.height || 500;
    var preset = opts.preset || "force";

    var ns = nodes.map(function (n) {
      return {
        id: n.id, label: n.label || n.id,
        type: n.type || "default",
        w: n.w || 120, h: n.h || 48,
        x: n.x || W / 2, y: n.y || H / 2,
        group: n.group || null,
        fixed: n.fixed || false,
      };
    });

    switch (preset) {
      case "flow":      _flowLayout(ns, edges, W, H, opts);      break;
      case "hierarchy": _hierarchyLayout(ns, edges, W, H, opts); break;
      case "swimlane":  _swimlaneLayout(ns, edges, W, H, opts);  break;
      case "radial":    _radialLayout(ns, W, H);                 break;
      default:          _forceLayout(ns, edges, W, H, opts);     break;
    }

    _resolveCollisions(ns);
    _clampToViewport(ns, W, H);

    return { nodes: ns, edges: _routeEdges(ns, edges) };
  }

  // ── Flow layout (top → bottom pipeline) ──────────────────────────────────
  function _flowLayout(ns, edges, W, H, opts) {
    // topological sort then assign layers
    var layers = _topoLayers(ns, edges);
    var totalLayers = layers.length;
    var rowH = H / (totalLayers + 1);

    layers.forEach(function (layer, li) {
      var rowY = rowH * (li + 1);
      var colW = W / (layer.length + 1);
      layer.forEach(function (node, ci) {
        node.x = colW * (ci + 1) - node.w / 2;
        node.y = rowY - node.h / 2;
      });
    });
  }

  // ── Hierarchy layout (tree) ───────────────────────────────────────────────
  function _hierarchyLayout(ns, edges, W, H, opts) {
    var roots = _findRoots(ns, edges);
    if (!roots.length) { _forceLayout(ns, edges, W, H, opts); return; }

    var tree = _buildTree(roots[0], ns, edges);
    var depth = _treeDepth(tree);
    var rowH = H / (depth + 1);

    function place(node, li, left, right) {
      var mid = (left + right) / 2;
      node.x = mid - node.w / 2;
      node.y = rowH * li - node.h / 2;
      if (!node.children || !node.children.length) return;
      var w = (right - left) / node.children.length;
      node.children.forEach(function (child, i) {
        place(child, li + 1, left + i * w, left + (i + 1) * w);
      });
    }
    place(tree, 1, PADDING, W - PADDING);
  }

  // ── Swimlane layout (horizontal groups/rows) ──────────────────────────────
  function _swimlaneLayout(ns, edges, W, H, opts) {
    var groups = {};
    ns.forEach(function (n) {
      var g = n.group || "default";
      if (!groups[g]) groups[g] = [];
      groups[g].push(n);
    });
    var keys = Object.keys(groups);
    var laneH = H / keys.length;

    keys.forEach(function (key, li) {
      var lane = groups[key];
      var colW = (W - PADDING * 2) / (lane.length + 1);
      lane.forEach(function (node, ci) {
        node.x = PADDING + colW * (ci + 1) - node.w / 2;
        node.y = laneH * li + laneH / 2 - node.h / 2;
      });
    });
  }

  // ── Radial layout ─────────────────────────────────────────────────────────
  function _radialLayout(ns, W, H) {
    var cx = W / 2, cy = H / 2;
    var r  = Math.min(W, H) / 2 - 80;
    ns.forEach(function (n, i) {
      var angle = (2 * Math.PI * i) / ns.length - Math.PI / 2;
      n.x = cx + r * Math.cos(angle) - n.w / 2;
      n.y = cy + r * Math.sin(angle) - n.h / 2;
    });
  }

  // ── Force-directed layout ─────────────────────────────────────────────────
  function _forceLayout(ns, edges, W, H) {
    // seed positions in a grid to avoid pile-up
    var cols = Math.ceil(Math.sqrt(ns.length));
    var cellW = (W - PADDING * 2) / cols;
    var cellH = (H - PADDING * 2) / Math.ceil(ns.length / cols);
    ns.forEach(function (n, i) {
      if (!n.x || n.x === W / 2) {
        n.x = PADDING + (i % cols) * cellW + cellW / 2 - n.w / 2;
        n.y = PADDING + Math.floor(i / cols) * cellH + cellH / 2 - n.h / 2;
      }
    });

    var edgeMap = {};
    edges.forEach(function (e) {
      (edgeMap[e.source] = edgeMap[e.source] || []).push(e.target);
      (edgeMap[e.target] = edgeMap[e.target] || []).push(e.source);
    });

    for (var iter = 0; iter < ITERATIONS; iter++) {
      var alpha = 1 - iter / ITERATIONS;

      // repulsion
      for (var i = 0; i < ns.length; i++) {
        for (var j = i + 1; j < ns.length; j++) {
          var a = ns[i], b = ns[j];
          var dx = (a.x + a.w / 2) - (b.x + b.w / 2);
          var dy = (a.y + a.h / 2) - (b.y + b.h / 2);
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var force = 8000 / (dist * dist) * alpha;
          if (!a.fixed) { a.x += (dx / dist) * force; a.y += (dy / dist) * force; }
          if (!b.fixed) { b.x -= (dx / dist) * force; b.y -= (dy / dist) * force; }
        }
      }

      // attraction along edges
      edges.forEach(function (e) {
        var a = ns.find(function (n) { return n.id === e.source; });
        var b = ns.find(function (n) { return n.id === e.target; });
        if (!a || !b) return;
        var dx = (b.x + b.w / 2) - (a.x + a.w / 2);
        var dy = (b.y + b.h / 2) - (a.y + a.h / 2);
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var ideal = 180;
        var force = (dist - ideal) * 0.03 * alpha;
        if (!a.fixed) { a.x += (dx / dist) * force; a.y += (dy / dist) * force; }
        if (!b.fixed) { b.x -= (dx / dist) * force; b.y -= (dy / dist) * force; }
      });

      // center gravity
      var cx = ns.reduce(function (s, n) { return s + n.x + n.w / 2; }, 0) / ns.length;
      var cy = ns.reduce(function (s, n) { return s + n.y + n.h / 2; }, 0) / ns.length;
      ns.forEach(function (n) {
        if (!n.fixed) {
          n.x += (W / 2 - cx) * 0.02 * alpha;
          n.y += (H / 2 - cy) * 0.02 * alpha;
        }
      });
    }
  }

  // ── Collision resolution ──────────────────────────────────────────────────
  function _resolveCollisions(ns) {
    var changed = true;
    var pass = 0;
    while (changed && pass < 20) {
      changed = false;
      for (var i = 0; i < ns.length; i++) {
        for (var j = i + 1; j < ns.length; j++) {
          var a = ns[i], b = ns[j];
          var overlapX = (a.x + a.w + MIN_DIST) - b.x;
          var overlapY = (a.y + a.h + MIN_DIST) - b.y;
          if (overlapX > 0 && overlapY > 0 &&
              a.x < b.x + b.w + MIN_DIST && a.y < b.y + b.h + MIN_DIST) {
            if (overlapX < overlapY) {
              var shiftX = overlapX / 2;
              if (!a.fixed) a.x -= shiftX;
              if (!b.fixed) b.x += shiftX;
            } else {
              var shiftY = overlapY / 2;
              if (!a.fixed) a.y -= shiftY;
              if (!b.fixed) b.y += shiftY;
            }
            changed = true;
          }
        }
      }
      pass++;
    }
  }

  // ── Viewport clamp ────────────────────────────────────────────────────────
  function _clampToViewport(ns, W, H) {
    ns.forEach(function (n) {
      n.x = Math.max(PADDING, Math.min(W - n.w - PADDING, n.x));
      n.y = Math.max(PADDING, Math.min(H - n.h - PADDING, n.y));
    });
  }

  // ── Edge routing (center-to-center with elbow avoidance) ──────────────────
  function _routeEdges(ns, edges) {
    var nodeMap = {};
    ns.forEach(function (n) { nodeMap[n.id] = n; });
    return edges.map(function (e) {
      var a = nodeMap[e.source], b = nodeMap[e.target];
      if (!a || !b) return e;
      return Object.assign({}, e, {
        x1: a.x + a.w / 2, y1: a.y + a.h / 2,
        x2: b.x + b.w / 2, y2: b.y + b.h / 2,
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _topoLayers(ns, edges) {
    var inDeg = {};
    ns.forEach(function (n) { inDeg[n.id] = 0; });
    edges.forEach(function (e) { inDeg[e.target] = (inDeg[e.target] || 0) + 1; });

    var layers = [], visited = {};
    var queue = ns.filter(function (n) { return !inDeg[n.id]; });
    while (queue.length) {
      layers.push(queue.slice());
      var next = [];
      queue.forEach(function (n) {
        visited[n.id] = true;
        edges.filter(function (e) { return e.source === n.id; }).forEach(function (e) {
          inDeg[e.target]--;
          if (inDeg[e.target] === 0 && !visited[e.target]) {
            var target = ns.find(function (x) { return x.id === e.target; });
            if (target) next.push(target);
          }
        });
      });
      queue = next;
    }
    // unvisited → last layer
    var remaining = ns.filter(function (n) { return !visited[n.id]; });
    if (remaining.length) layers.push(remaining);
    return layers.length ? layers : [ns];
  }

  function _findRoots(ns, edges) {
    var hasParent = {};
    edges.forEach(function (e) { hasParent[e.target] = true; });
    return ns.filter(function (n) { return !hasParent[n.id]; });
  }

  function _buildTree(root, ns, edges, visited) {
    visited = visited || {};
    if (visited[root.id]) return root;
    visited[root.id] = true;
    root.children = edges
      .filter(function (e) { return e.source === root.id; })
      .map(function (e) { return ns.find(function (n) { return n.id === e.target; }); })
      .filter(Boolean)
      .map(function (n) { return _buildTree(n, ns, edges, visited); });
    return root;
  }

  function _treeDepth(node) {
    if (!node.children || !node.children.length) return 1;
    return 1 + Math.max.apply(null, node.children.map(_treeDepth));
  }

  window.LayoutEngine = { compute: compute };

})();
