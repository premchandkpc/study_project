(function () {
  'use strict';

  window.CVU = {
    // Colors
    C: {
      bg:     '#0d1117',
      card:   '#161b22',
      border: '#30363d',
      text:   '#e6edf3',
      gray:   '#8b949e',
      green:  '#3fb950',
      blue:   '#58a6ff',
      orange: '#ffa657',
      red:    '#f85149',
      purple: '#bc8cff',
      yellow: '#e3b341',
    },

    // Protocol → color
    PROTO: {
      REST:      '#58a6ff',
      HTTP:      '#58a6ff',
      HTTPS:     '#58a6ff',
      gRPC:      '#bc8cff',
      GraphQL:   '#f78166',
      WebSocket: '#3fb950',
      Kafka:     '#ffa657',
      SQS:       '#ffa657',
      SNS:       '#e3b341',
      TCP:       '#8b949e',
      UDP:       '#8b949e',
    },

    roundRect: function (ctx, x, y, w, h, r, fill, stroke, lw) {
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(x, y, w, h, r);
      } else {
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
      if (fill)  { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
    },

    text: function (ctx, str, x, y, color, size, align, weight) {
      ctx.fillStyle  = color  || '#e6edf3';
      ctx.font       = (weight || 'normal') + ' ' + (size || 12) + 'px monospace';
      ctx.textAlign  = align  || 'center';
      ctx.fillText(str, x, y);
    },

    arrow: function (ctx, x1, y1, x2, y2, color, lw, dashed) {
      ctx.strokeStyle = color || '#8b949e';
      ctx.lineWidth   = lw    || 1.5;
      if (dashed) ctx.setLineDash([5, 3]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      // arrowhead
      var angle = Math.atan2(y2 - y1, x2 - x1);
      var hs = 8;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - hs * Math.cos(angle - Math.PI / 6), y2 - hs * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - hs * Math.cos(angle + Math.PI / 6), y2 - hs * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = color || '#8b949e';
      ctx.fill();
    },

    dot: function (ctx, x, y, r, color) {
      ctx.beginPath(); ctx.arc(x, y, r || 6, 0, Math.PI * 2);
      ctx.fillStyle = color || '#e6edf3'; ctx.fill();
    },

    clearBg: function (ctx, w, h) {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, w, h);
    },

    makeCanvas: function (mount, w, h) {
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.style.cssText = 'width:100%;max-width:' + w + 'px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
      mount.appendChild(c);
      return c;
    },

    makeBtn: function (label, color) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid ' +
        (color ? color + '55' : '#30363d') + ';background:#21262d;color:' +
        (color || '#e6edf3') + ';cursor:pointer;font-size:12px;font-family:monospace';
      return b;
    },

    makeCtrlRow: function (mount) {
      var d = document.createElement('div');
      d.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';
      mount.appendChild(d);
      return d;
    },

    makeStatus: function (mount) {
      var d = document.createElement('div');
      d.style.cssText = 'text-align:center;font-family:monospace;font-size:11px;color:#8b949e;margin-top:6px;min-height:16px';
      mount.appendChild(d);
      return d;
    },
  };
})();
