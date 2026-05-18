/**
 * topic-detail.component.js — renders topic content + interactive labs
 * Exposes: window.App.TopicDetailComponent(host)
 * Load after: services/*.service.js, utils/renderer.utils.js, home.component.js
 */
(function () {
  'use strict';


  function docsPath(topic) {
    if (!topic || !topic.id || !topic.area) return null;
    return topic.docs || `docs/topics/${topic.area}/${topic.id}.md`;
  }

  /* ── Interactive lab setup ──────────────────────────────────── */
  function setupFlowLab(host, topic) {
    const lab = host.querySelector('[data-flow-lab]');
    if (!lab || !topic.flow || !topic.flow.steps || !topic.flow.steps.length) return null;
    const steps = topic.flow.steps;
    const nodes = Array.from(lab.querySelectorAll('[data-node]'));
    const edges = Array.from(lab.querySelectorAll('[data-edge]'));
    const label = lab.querySelector('[data-flow-step-label]');
    const detail = lab.querySelector('[data-flow-step-detail]');
    const progressEl = lab.querySelector('[data-flow-progress]');
    const playBtn = lab.querySelector('[data-flow-play]');
    let index = 0, playing = false, timer = null;

    function activate(i) {
      index = (i + steps.length) % steps.length;
      const step = steps[index];
      const path = step.path?.length ? step.path : [step.from, step.to].filter(Boolean);
      nodes.forEach(n => {
        n.classList.toggle('active-path', path.includes(n.dataset.node));
        n.classList.toggle('active-source', n.dataset.node === path[0]);
        n.classList.toggle('active-target', n.dataset.node === path[path.length - 1]);
      });
      edges.forEach(e => {
        const active = path.some((id, pi) => {
          const next = path[pi + 1];
          return next && (e.dataset.edge === id + '-' + next || e.dataset.edge === next + '-' + id);
        });
        e.classList.toggle('active', active);
      });
      label.textContent = step.label || `Step ${index + 1}`;
      detail.textContent = step.detail || '';
      progressEl.style.width = `${((index + 1) / steps.length) * 100}%`;
    }

    function stop() { playing = false; playBtn.textContent = 'Play'; clearInterval(timer); timer = null; }
    function play() { playing = true; playBtn.textContent = 'Pause'; timer = setInterval(() => activate(index + 1), 1800); }

    lab.querySelector('[data-flow-prev]').addEventListener('click', () => { stop(); activate(index - 1); });
    lab.querySelector('[data-flow-next]').addEventListener('click', () => { stop(); activate(index + 1); });
    playBtn.addEventListener('click', () => playing ? stop() : play());
    nodes.forEach(n => n.addEventListener('click', () => {
      const ni = steps.findIndex(s => (s.path?.length ? s.path : [s.from, s.to].filter(Boolean)).includes(n.dataset.node));
      stop(); activate(ni >= 0 ? ni : 0);
    }));
    activate(0);
    return stop;
  }

  function setupUmlLab(host, topic) {
    const lab = host.querySelector('[data-uml-lab]');
    if (!lab || !topic.uml || !topic.uml.messages || !topic.uml.messages.length) return null;
    const messages = topic.uml.messages;
    const actors = Array.from(lab.querySelectorAll('[data-uml-actor]'));
    const lives = Array.from(lab.querySelectorAll('[data-uml-life]'));
    const rows = Array.from(lab.querySelectorAll('[data-uml-row]'));
    const msgEls = Array.from(lab.querySelectorAll('[data-uml-message]'));
    const label = lab.querySelector('[data-uml-label]');
    const detail = lab.querySelector('[data-uml-detail]');
    const badge = lab.querySelector('[data-uml-type-badge]');
    const progressEl = lab.querySelector('[data-uml-progress]');
    const playBtn = lab.querySelector('[data-uml-play]');
    let index = 0, playing = false, timer = null;

    function fmt(t) {
      const { esc } = window.App.Utils;
      return esc(t).replace(/`([^`\n]+)`/g, '<code style="background:#0d1320;border:1px solid #2a374f;padding:1px 5px;border-radius:3px;font-size:11px;color:#d6e0ff;font-family:JetBrains Mono,monospace;">$1</code>');
    }

    function activate(i) {
      index = (i + messages.length) % messages.length;
      const msg = messages[index];
      const active = new Set([msg.from, msg.to]);
      actors.forEach(a => { a.classList.toggle('active', active.has(a.dataset.umlActor)); a.classList.toggle('source', a.dataset.umlActor === msg.from); a.classList.toggle('target', a.dataset.umlActor === msg.to); });
      lives.forEach(l => l.classList.toggle('active', active.has(l.dataset.umlLife)));
      rows.forEach(r => r.classList.toggle('active', Number(r.dataset.umlRow) === index));
      msgEls.forEach(e => e.classList.toggle('active', Number(e.dataset.umlMessage) === index));
      label.textContent = msg.label || `Message ${index + 1}`;
      detail.innerHTML = fmt(msg.detail || '');
      if (badge) { badge.textContent = msg.async ? 'async' : 'sync'; badge.className = 'uml-type-badge ' + (msg.async ? 'async' : 'sync'); }
      progressEl.style.width = `${((index + 1) / messages.length) * 100}%`;
    }

    function stop() { playing = false; playBtn.textContent = 'Play'; clearInterval(timer); timer = null; }
    function play() { playing = true; playBtn.textContent = 'Pause'; timer = setInterval(() => activate(index + 1), 2300); }

    lab.querySelector('[data-uml-prev]').addEventListener('click', () => { stop(); activate(index - 1); });
    lab.querySelector('[data-uml-next]').addEventListener('click', () => { stop(); activate(index + 1); });
    playBtn.addEventListener('click', () => playing ? stop() : play());
    msgEls.forEach(el => {
      el.addEventListener('click', () => { stop(); activate(Number(el.dataset.umlMessage)); });
    });
    actors.forEach(a => {
      a.addEventListener('click', () => {
        const ni = messages.findIndex(m => m.from === a.dataset.umlActor || m.to === a.dataset.umlActor);
        stop(); activate(ni >= 0 ? ni : 0);
      });
    });
    activate(0);
    return stop;
  }

  function setupArchitectureLab(host, topic) {
    const lab = host.querySelector('[data-arch-lab]');
    if (!lab || !topic.architecture || !topic.architecture.lanes) return;
    const nodes = Array.from(lab.querySelectorAll('[data-arch-node]'));
    const links = Array.from(lab.querySelectorAll('[data-arch-link]'));
    const label = lab.querySelector('[data-arch-label]');
    const detail = lab.querySelector('[data-arch-detail]');
    const nodeData = new Map();
    topic.architecture.lanes.forEach(lane => (lane.nodes || []).forEach(n => nodeData.set(n.id, n)));

    function activateNode(id) {
      const n = nodeData.get(id) || {};
      nodes.forEach(el => el.classList.toggle('active', el.dataset.archNode === id));
      links.forEach(el => { const a = el.dataset.archFrom === id || el.dataset.archTo === id; el.classList.toggle('active', a); el.classList.toggle('connected', a); });
      label.textContent = n.label || 'Architecture detail';
      detail.textContent = n.detail || n.hint || 'Click a node or path.';
    }

    function activateLink(idx) {
      const link = (topic.architecture.links || [])[idx] || {};
      nodes.forEach(el => el.classList.toggle('active', el.dataset.archNode === link.from || el.dataset.archNode === link.to));
      links.forEach(el => { el.classList.toggle('active', Number(el.dataset.archLink) === idx); el.classList.toggle('connected', false); });
      label.textContent = link.label || '';
      detail.textContent = link.detail || 'Path between components.';
    }

    nodes.forEach(n => n.addEventListener('click', () => activateNode(n.dataset.archNode)));
    links.forEach(l => l.addEventListener('click', () => activateLink(Number(l.dataset.archLink))));
    if (nodes[0]) activateNode(nodes[0].dataset.archNode);
  }

  function setupSystemDesignCanvas(mount, topic) {
    const arch = topic.architecture;
    if (!mount || !arch?.lanes?.length) return null;

    mount.innerHTML = '<canvas class="sys-canvas" aria-label="System design architecture canvas"></canvas><div class="sys-canvas-readout"><strong></strong><span></span></div>';
    const canvas = mount.querySelector('canvas');
    const readout = mount.querySelector('.sys-canvas-readout');
    const readoutTitle = readout.querySelector('strong');
    const readoutBody = readout.querySelector('span');
    const ctx = canvas.getContext('2d');
    const palette = ['#26d9ff', '#3dd68c', '#f5b944', '#8b6fff', '#ff6b7a', '#00b4a2'];
    const nodeMap = new Map();
    const hit = [];
    let raf = null;
    let t = 0;
    let activeId = null;
    let hoverId = null;
    let rect = { width: 960, height: 620 };

    arch.lanes.forEach(lane => (lane.nodes || []).forEach(n => nodeMap.set(n.id, n)));

    function dpr() { return Math.max(1, Math.min(window.devicePixelRatio || 1, 2)); }
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
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
    function fillRound(x, y, w, h, r, fill, stroke, lw) {
      roundRect(x, y, w, h, r);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lw || 1;
        ctx.stroke();
      }
    }
    function text(str, x, y, opts) {
      opts = opts || {};
      ctx.fillStyle = opts.color || '#e8eef5';
      ctx.font = (opts.weight || 600) + ' ' + (opts.size || 14) + 'px "Inter", system-ui, sans-serif';
      ctx.textAlign = opts.align || 'center';
      ctx.textBaseline = opts.base || 'middle';
      ctx.fillText(str || '', x, y);
    }
    function wrap(str, x, y, max, lineH, opts) {
      const words = String(str || '').split(/\s+/);
      const lines = [];
      let line = '';
      opts = opts || {};
      ctx.font = (opts.weight || 500) + ' ' + (opts.size || 13) + 'px "Inter", system-ui, sans-serif';
      words.forEach(word => {
        const next = line ? line + ' ' + word : word;
        if (ctx.measureText(next).width > max && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      const maxLines = opts.maxLines || 3;
      const clipped = lines.slice(0, maxLines);
      if (lines.length > maxLines) clipped[maxLines - 1] = clipped[maxLines - 1].replace(/\s+\S*$/, '') + '...';
      const start = y - ((clipped.length - 1) * lineH) / 2;
      clipped.forEach((l, i) => text(l, x, start + i * lineH, opts));
      return clipped.length * lineH;
    }
    function arrow(a, b, color, dashed) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ang = Math.atan2(dy, dx);
      const start = { x: a.x + Math.cos(ang) * 62, y: a.y + Math.sin(ang) * 38 };
      const end = { x: b.x - Math.cos(ang) * 62, y: b.y - Math.sin(ang) * 38 };
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      if (dashed) ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2 - 22;
      ctx.quadraticCurveTo(cx, cy, end.x, end.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.translate(end.x, end.y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-11, -6);
      ctx.lineTo(-11, 6);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
      return { start, end, cx, cy };
    }
    function setReadout(item) {
      readoutTitle.textContent = item?.label || item?.title || arch.title || topic.title;
      readoutBody.textContent = item?.detail || item?.hint || arch.caption || 'Hover or click architecture nodes and paths.';
    }
    function resize() {
      const box = mount.getBoundingClientRect();
      const width = Math.max(900, Math.floor(box.width || 900));
      const lanes = arch.lanes.length;
      const maxNodes = Math.max(...arch.lanes.map(l => (l.nodes || []).length), 1);
      const height = Math.max(620, 170 + maxNodes * 128 + Math.max(0, lanes - 4) * 18);
      rect = { width, height };
      const ratio = dpr();
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.height = height + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function draw() {
      const W = rect.width;
      const H = rect.height;
      hit.length = 0;
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0b1220');
      bg.addColorStop(.5, '#0e1726');
      bg.addColorStop(1, '#0a0f19');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.globalAlpha = .18;
      ctx.fillStyle = '#26d9ff';
      ctx.beginPath(); ctx.arc(130, 70, 150, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3dd68c';
      ctx.beginPath(); ctx.arc(W - 160, 110, 190, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      text(arch.title || topic.title, 32, 34, { align: 'left', size: 22, weight: 800, color: '#ffffff' });
      wrap(arch.caption || 'Production architecture: ownership boundaries, sync calls, async events, and state paths.', 32, 66, W - 64, 18, { align: 'left', size: 13, weight: 500, color: '#9aaabb', maxLines: 2 });

      const left = 28;
      const right = W - 28;
      const top = 116;
      const laneGap = 14;
      const laneW = (right - left - laneGap * (arch.lanes.length - 1)) / arch.lanes.length;
      const nodeW = Math.min(190, Math.max(138, laneW - 24));
      const nodeH = 86;
      const pos = new Map();

      arch.lanes.forEach((lane, li) => {
        const color = palette[li % palette.length];
        const x = left + li * (laneW + laneGap);
        fillRound(x, top, laneW, H - top - 28, 18, 'rgba(255,255,255,.045)', color + '55', 1.2);
        ctx.fillStyle = color;
        ctx.fillRect(x, top, laneW, 4);
        text((lane.label || `Lane ${li + 1}`).toUpperCase(), x + 16, top + 28, { align: 'left', size: 12, weight: 800, color });
        wrap(lane.hint || '', x + 16, top + 52, laneW - 32, 14, { align: 'left', size: 11, weight: 500, color: '#9aaabb', maxLines: 2 });
        (lane.nodes || []).forEach((node, ni) => {
          const nx = x + laneW / 2;
          const ny = top + 104 + ni * 124;
          pos.set(node.id, { x: nx, y: ny, color, node, lane });
        });
      });

      (arch.links || []).forEach((link, idx) => {
        const a = pos.get(link.from);
        const b = pos.get(link.to);
        if (!a || !b) return;
        const isActive = activeId === 'link-' + idx || hoverId === 'link-' + idx || activeId === link.from || activeId === link.to;
        const color = isActive ? '#3dd68c' : (link.type === 'async' ? '#f5b94499' : '#26d9ff99');
        const curve = arrow(a, b, color, link.type === 'async');
        const dotT = ((t / 1400) + idx * .17) % 1;
        const px = (1 - dotT) * (1 - dotT) * curve.start.x + 2 * (1 - dotT) * dotT * curve.cx + dotT * dotT * curve.end.x;
        const py = (1 - dotT) * (1 - dotT) * curve.start.y + 2 * (1 - dotT) * dotT * curve.cy + dotT * dotT * curve.end.y;
        ctx.beginPath(); ctx.arc(px, py, isActive ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#ffffff' : color;
        ctx.fill();
        hit.push({ type: 'link', id: 'link-' + idx, x: Math.min(curve.start.x, curve.end.x), y: Math.min(curve.start.y, curve.end.y) - 34, w: Math.abs(curve.end.x - curve.start.x) || 80, h: Math.abs(curve.end.y - curve.start.y) + 68, data: link });
      });

      pos.forEach((p, id) => {
        const node = p.node;
        const active = activeId === id || hoverId === id;
        const x = p.x - nodeW / 2;
        const y = p.y - nodeH / 2;
        fillRound(x, y, nodeW, nodeH, 14, active ? p.color + '24' : '#141c2b', active ? p.color : '#31435f', active ? 2.5 : 1.3);
        if (node.badge) {
          fillRound(x + 12, y + 10, Math.min(72, node.badge.length * 8 + 18), 22, 11, p.color, null);
          text(node.badge, x + 22, y + 21, { align: 'left', size: 10, weight: 800, color: '#06111c' });
        }
        wrap(node.label, p.x, y + 43, nodeW - 26, 17, { size: 14, weight: 800, color: '#ffffff', maxLines: 2 });
        wrap(node.hint || '', p.x, y + 70, nodeW - 24, 13, { size: 11, weight: 500, color: '#aab7c7', maxLines: 2 });
        hit.push({ type: 'node', id, x, y, w: nodeW, h: nodeH, data: node });
      });

      text('sync', W - 150, H - 24, { size: 12, weight: 800, color: '#26d9ff' });
      text('async/event', W - 78, H - 24, { size: 12, weight: 800, color: '#f5b944' });
    }
    function tick(ts) {
      t = ts || 0;
      draw();
      raf = requestAnimationFrame(tick);
    }
    function pick(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      for (let i = hit.length - 1; i >= 0; i--) {
        const h = hit[i];
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
      }
      return null;
    }
    canvas.addEventListener('mousemove', e => {
      const h = pick(e);
      hoverId = h?.id || null;
      canvas.style.cursor = h ? 'pointer' : 'default';
      if (h) setReadout(h.data);
    });
    canvas.addEventListener('mouseleave', () => { hoverId = null; canvas.style.cursor = 'default'; setReadout(null); });
    canvas.addEventListener('click', e => {
      const h = pick(e);
      activeId = h?.id || null;
      setReadout(h?.data || null);
      draw();
    });
    window.addEventListener('resize', resize);
    setReadout(null);
    resize();
    raf = requestAnimationFrame(tick);
    return function cleanup() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }

  /* ── TopicDetailComponent ───────────────────────────────────── */
  window.App.TopicDetailComponent = function TopicDetailComponent(host) {
    const { TopicsService, ProgressService, Router, HomeComponent, Utils } = window.App;
    const { esc, md, codeBlock } = Utils;

    const AREA_LABEL = { java: 'Java', golang: 'Go', python: 'Python', microservices: 'Microservices', sysdesign: 'System Design', dsa: 'DSA · Algorithms', kafka: 'Kafka / Messaging', rust: 'Rust', angular: 'Angular', react: 'React', databases: 'Databases' };
    const AREA_COLOR = { java: 'var(--java)', golang: 'var(--golang)', python: 'var(--python)', microservices: 'var(--micro)', sysdesign: 'var(--sysdesign)', dsa: '#f0883e', kafka: 'var(--kafka)', rust: 'var(--rust)', angular: 'var(--angular)', react: 'var(--react-color)', databases: 'var(--databases)' };

    let stopFlow = null, stopUml = null, stopVisual = null, lastTopicId = null;

    function render() {
      if (stopFlow) { stopFlow(); stopFlow = null; }
      if (stopUml) { stopUml(); stopUml = null; }
      if (stopVisual) { stopVisual(); stopVisual = null; }

      const id = Router.current().path.replace(/^\//, '');

      /* ── /coder route ── */
      if (id === 'coder') {
        if (host._coderActive) return;
        host._coderActive = true;
        host._homeActive = false;
        lastTopicId = null;
        host.innerHTML = '';
        host.style.padding = '0';
        host.style.maxWidth = '100%';
        if (host._homeCleanup) { host._homeCleanup(); host._homeCleanup = null; }
        if (host._coderCleanup) { host._coderCleanup(); host._coderCleanup = null; }
        const shell = document.querySelector('app-root');
        if (shell) {
          const areas = ['java','golang','python','microservices','sysdesign','dsa','kafka','rust','angular','react','databases'];
          shell.classList.remove(...areas.map(a => `area-${a}`));
          shell.classList.add('coder-mode');
        }
        const sepEl = document.getElementById('hdr-sep');
        const topicEl = document.getElementById('hdr-topic');
        const dotEl = document.getElementById('hdr-dot');
        const areaEl = document.getElementById('hdr-area');
        if (dotEl) dotEl.style.background = 'var(--accent)';
        if (areaEl) { areaEl.textContent = 'Code Runner'; areaEl.style.color = 'var(--accent)'; }
        if (sepEl) sepEl.style.display = 'none';
        if (topicEl) topicEl.textContent = '';
        if (window.CoderPage?.mount) {
          host._coderCleanup = window.CoderPage.mount(host) || null;
        } else {
          host.innerHTML = '<div style="padding:32px;color:#f85149">CoderPage not loaded.</div>';
        }
        return;
      }

      if (host._coderActive) {
        host._coderActive = false;
        const shell = document.querySelector('app-root');
        if (shell) shell.classList.remove('coder-mode');
        if (host._coderCleanup) { host._coderCleanup(); host._coderCleanup = null; }
      }

      const topic = TopicsService.byId(id);
      if (!topic) {
        if (host._homeActive) return;
        const shell = document.querySelector('app-root');
        if (shell) {
          const areas = ['java','golang','python','microservices','sysdesign','dsa','kafka','rust','angular','react','databases'];
          shell.classList.remove(...areas.map(a => `area-${a}`));
        }
        host._homeActive = true;
        lastTopicId = null;
        host.innerHTML = '';
        host.style.padding = '0';
        host.style.maxWidth = '100%';
        if (host._homeCleanup) { host._homeCleanup(); host._homeCleanup = null; }
        host._homeCleanup = HomeComponent(host);
        return;
      }

      host._homeActive = false;
      host.style.padding = '';
      host.style.maxWidth = '';

      const areaLabel = AREA_LABEL[topic.area] || topic.area;
      const areaColor = AREA_COLOR[topic.area] || 'var(--accent)';
      const dotEl = document.getElementById('hdr-dot');
      const areaEl = document.getElementById('hdr-area');
      const topicEl = document.getElementById('hdr-topic');
      const sepEl = document.getElementById('hdr-sep');
      const shell = document.querySelector('app-root');
      if (shell) {
        const areas = ['java','golang','python','microservices','sysdesign','dsa','kafka','rust','angular','react','databases'];
        shell.classList.remove(...areas.map(a => `area-${a}`));
        shell.classList.add(`area-${topic.area}`);
      }
      if (dotEl) dotEl.style.background = areaColor;
      if (areaEl) { areaEl.textContent = areaLabel; areaEl.style.color = areaColor; }
      if (topicEl) topicEl.textContent = topic.title;
      if (sepEl) sepEl.style.display = '';

      const done = ProgressService.isDone(topic.id);
      const isTopicChange = topic.id !== lastTopicId;

      const docsHref = docsPath(topic);
      const utils = { esc, md, codeBlock };
      const sectionBody = window.TopicTemplates
        ? TopicTemplates.buildHTML(topic, utils)
        : '';

      host.innerHTML =
        '<div class="crumbs">' + esc(areaLabel) + ' <span class="sep">›</span> ' + esc(topic.tag || 'Topic') + '</div>' +
        '<div class="title-row">' +
          '<h1 class="topic-title">' + esc(topic.title) + '</h1>' +
          '<span class="tag area-' + topic.area + '">' + esc(areaLabel) + '</span>' +
        '</div>' +
        '<div class="toolbar">' +
          '<button class="btn primary" data-mark>' + (done ? '✓ Completed' : 'Mark as completed') + '</button>' +
          (docsHref ? '<a class="btn docs-btn" href="' + esc(docsHref) + '" target="_blank" rel="noreferrer">Open docs</a>' : '') +
          '<span class="meta">' + esc(topic.id) + '</span>' +
        '</div>' +
        sectionBody;

      host.querySelectorAll('[data-copy]').forEach(btn => {
        btn.addEventListener('click', () => {
          const pre = btn.parentElement.nextElementSibling;
          navigator.clipboard.writeText(pre.innerText).then(() => {
            btn.textContent = 'Copied';
            setTimeout(() => btn.textContent = 'Copy', 1200);
          });
        });
      });
      const markBtn = host.querySelector('[data-mark]');
      if (markBtn) markBtn.addEventListener('click', () => ProgressService.toggle(topic.id));

      stopFlow = setupFlowLab(host, topic);
      stopUml = setupUmlLab(host, topic);
      setupArchitectureLab(host, topic);

      if (topic.visual) {
        const mount = host.querySelector('.viz-mount');
        if (mount) {
          if (topic.area === 'sysdesign' && topic.architecture) {
            stopVisual = setupSystemDesignCanvas(mount, topic);
          } else if (typeof topic.visual === 'function') {
            // Legacy imperative Canvas
            try { topic.visual(mount); }
            catch (e) { mount.innerHTML = `<div style="color:#f85149;padding:16px;font-family:monospace;font-size:12px">Visualizer error: ${e.message}</div>`; }
          } else if (window.VizEngine) {
            // Declarative engine config
            VizEngine.render(mount, topic.visual);
          }
        }
      }

      if (window.Prism) Prism.highlightAllUnder(host);
      if (isTopicChange) window.scrollTo({ top: 0, behavior: 'smooth' });
      lastTopicId = topic.id;
    }

    Router.current.subscribe(render);
    ProgressService.state.subscribe(render);
    render();
  };
})();
