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
      ctx.font       = (weight || 'normal') + ' ' + (size || 13) + 'px "Inter", "JetBrains Mono", monospace';
      ctx.textAlign  = align  || 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(str, x, y);
    },

    wrapText: function (ctx, str, x, y, maxWidth, lineHeight, color, size, align, weight, maxLines) {
      var text = String(str || '');
      var words = text.split(/\s+/);
      var lines = [];
      var line = '';
      ctx.fillStyle = color || '#e6edf3';
      ctx.font = (weight || 'normal') + ' ' + (size || 13) + 'px "Inter", "JetBrains Mono", monospace';
      ctx.textAlign = align || 'center';
      for (var i = 0; i < words.length; i++) {
        var test = line ? line + ' ' + words[i] : words[i];
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = words[i];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/, '') + '...';
      }
      var startY = y - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach(function (l, idx) { ctx.fillText(l, x, startY + idx * lineHeight); });
      return lines.length * lineHeight;
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
      var rect = mount.getBoundingClientRect();
      var cssWidth = Math.round(rect.width || mount.clientWidth || w);
      if (cssWidth < w) cssWidth = w;
      var dpr = window.devicePixelRatio || 1;
      var c = document.createElement('canvas');
      c.width  = Math.round(cssWidth * dpr);
      c.height = Math.round(h * dpr);
      c.style.cssText = 'width:100%;height:' + h + 'px;max-width:none;border-radius:14px;background:#0d1117;display:block;margin:0 auto;box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 18px 50px rgba(0,0,0,.28);';
      // store logical dimensions for renderers
      c._logicalWidth  = cssWidth;
      c._logicalHeight = h;
      c._dpr           = dpr;
      var ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      mount.appendChild(c);
      return c;
    },

    makeBtn: function (label, color) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'padding:7px 14px;border-radius:8px;border:1px solid ' +
        (color ? color + '66' : '#30363d') + ';background:#1f2937;color:' +
        (color || '#e6edf3') + ';cursor:pointer;font-size:13px;font-weight:700;font-family:"Inter",system-ui,sans-serif';
      return b;
    },

    makeCtrlRow: function (mount) {
      var d = document.createElement('div');
      d.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:12px;justify-content:center;flex-wrap:wrap';
      mount.appendChild(d);
      return d;
    },

    makeStatus: function (mount) {
      var d = document.createElement('div');
      d.style.cssText = 'text-align:center;font-family:"Inter",system-ui,sans-serif;font-size:13px;color:#9aaabb;margin-top:10px;min-height:18px';
      mount.appendChild(d);
      return d;
    },
  };
})();
