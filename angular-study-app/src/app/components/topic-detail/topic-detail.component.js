/**
 * topic-detail.component.js — renders topic content + interactive labs
 * Exposes: window.App.TopicDetailComponent(host)
 * Load after: services/*.service.js, utils/renderer.utils.js, home.component.js
 */
(function () {
  'use strict';

  /* ── Flow Lab renderer ──────────────────────────────────────── */
  function renderFlowLab(topic, esc) {
    const flow = topic.flow;
    if (!flow || !flow.nodes || !flow.nodes.length || !flow.steps || !flow.steps.length) return '';
    const first = flow.steps[0];
    const nodes = flow.nodes.map((node, i) => `
      <button type="button" class="flow-node" data-node="${esc(node.id)}" style="--i:${i}">
        <span class="node-index">${i + 1}</span>
        <span class="node-label">${esc(node.label)}</span>
        ${node.hint ? `<span class="node-hint">${esc(node.hint)}</span>` : ''}
      </button>
      ${i < flow.nodes.length - 1
        ? `<div class="flow-edge" data-edge="${esc(node.id)}-${esc(flow.nodes[i + 1].id)}" style="--i:${i}"><span></span></div>`
        : ''}`
    ).join('');
    return `
      <div class="section flow-section">
        <h2>0 · Interactive flow</h2>
        <div class="flow-lab" data-flow-lab>
          <div class="flow-title">
            <strong>${esc(flow.title || topic.title)}</strong>
            ${flow.caption ? `<span>${esc(flow.caption)}</span>` : ''}
          </div>
          <div class="flow-stage" role="group" aria-label="${esc(flow.title || topic.title)}">${nodes}</div>
          <div class="flow-controls">
            <button class="flow-btn" type="button" data-flow-prev>Prev</button>
            <button class="flow-btn primary" type="button" data-flow-play>Play</button>
            <button class="flow-btn" type="button" data-flow-next>Next</button>
            <div class="flow-progress" aria-hidden="true"><div data-flow-progress></div></div>
          </div>
          <div class="flow-readout">
            <strong data-flow-step-label>${esc(first.label || 'Step 1')}</strong>
            <span data-flow-step-detail>${esc(first.detail || '')}</span>
          </div>
        </div>
      </div>`;
  }

  /* ── UML Lab renderer ───────────────────────────────────────── */
  function renderUmlLab(topic, esc) {
    const uml = topic.uml;
    if (!uml || !uml.actors || !uml.actors.length || !uml.messages || !uml.messages.length) return '';
    const actorIndex = new Map(uml.actors.map((a, i) => [a.id, i]));
    const first = uml.messages[0];
    const actors = uml.actors.map(a => `
      <button type="button" class="uml-actor" data-uml-actor="${esc(a.id)}">
        <span>${esc(a.label)}</span>
        ${a.hint ? `<small>${esc(a.hint)}</small>` : ''}
      </button>`).join('');
    const rows = uml.messages.map((msg, idx) => {
      const from = actorIndex.has(msg.from) ? actorIndex.get(msg.from) : 0;
      const to = actorIndex.has(msg.to) ? actorIndex.get(msg.to) : from;
      const start = Math.min(from, to) + 1;
      const end = Math.max(from, to) + 2;
      const rev = from > to ? ' reverse' : '';
      const async = msg.type === 'async' ? ' async' : '';
      return `
        <div class="uml-row" data-uml-row="${idx}">
          ${uml.actors.map(a => `<span class="uml-lifeline" data-uml-life="${esc(a.id)}"></span>`).join('')}
          <button type="button" class="uml-message${rev}${async}"
            data-uml-message="${idx}" style="grid-column:${start} / ${end}">
            <span>${idx + 1}. ${esc(msg.label)}</span>
          </button>
        </div>`;
    }).join('');
    return `
      <div class="section uml-section">
        <h2>0.1 · UML sequence simulation</h2>
        <div class="uml-lab" data-uml-lab>
          <div class="uml-title">
            <strong>${esc(uml.title || topic.title)}</strong>
            ${uml.scenario ? `<span>${esc(uml.scenario)}</span>` : ''}
          </div>
          <div class="uml-board" style="--uml-cols:${uml.actors.length}">
            <div class="uml-actors">${actors}</div>
            <div class="uml-timeline">${rows}</div>
          </div>
          <div class="flow-controls">
            <button class="flow-btn" type="button" data-uml-prev>Prev</button>
            <button class="flow-btn primary" type="button" data-uml-play>Play</button>
            <button class="flow-btn" type="button" data-uml-next>Next</button>
            <div class="flow-progress" aria-hidden="true"><div data-uml-progress></div></div>
          </div>
          <div class="uml-readout">
            <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
              <strong data-uml-label style="font-size:14px;">${esc(first.label || 'Message 1')}</strong>
              <span class="uml-type-badge ${first.async ? 'async' : 'sync'}" data-uml-type-badge>${first.async ? 'async' : 'sync'}</span>
            </div>
            <span data-uml-detail style="font-size:13px;color:#d3dcea;line-height:1.6;">${esc(first.detail || '')}</span>
          </div>
        </div>
      </div>`;
  }

  /* ── Architecture Lab renderer ──────────────────────────────── */
  function renderArchitectureLab(topic, esc) {
    const arch = topic.architecture;
    if (!arch || !arch.lanes || !arch.lanes.length) return '';
    const firstNode = arch.lanes.flatMap(l => l.nodes || [])[0] || {};
    const lanes = arch.lanes.map((lane, li) => `
      <div class="arch-lane" style="--lane:${li}">
        <div class="arch-lane-title">
          <span>${esc(lane.label || `Lane ${li + 1}`)}</span>
          ${lane.hint ? `<small>${esc(lane.hint)}</small>` : ''}
        </div>
        <div class="arch-node-stack">
          ${(lane.nodes || []).map(n => `
            <button type="button" class="arch-node" data-arch-node="${esc(n.id)}">
              <span class="arch-node-label">${esc(n.label)}</span>
              ${n.badge ? `<span class="arch-badge">${esc(n.badge)}</span>` : ''}
              ${n.hint ? `<small>${esc(n.hint)}</small>` : ''}
            </button>`).join('')}
        </div>
      </div>`).join('');
    const linkItems = (arch.links || []).map((link, idx) => `
      <button type="button" class="arch-link ${link.type === 'async' ? 'async' : 'sync'}"
        data-arch-link="${idx}" data-arch-from="${esc(link.from)}" data-arch-to="${esc(link.to)}">
        <span>${esc(link.label || `${link.from} to ${link.to}`)}</span>
        <small>${esc(link.type === 'async' ? 'event/async' : 'request/sync')}</small>
      </button>`).join('');
    return `
      <div class="section arch-section">
        <h2>0.2 · Architecture map</h2>
        <div class="arch-lab" data-arch-lab>
          <div class="arch-title">
            <strong>${esc(arch.title || topic.title)}</strong>
            ${arch.caption ? `<span>${esc(arch.caption)}</span>` : ''}
          </div>
          <div class="arch-board">
            <div class="arch-lanes" role="group" aria-label="${esc(arch.title || topic.title)}">${lanes}</div>
            <div class="arch-links">
              <strong>Paths</strong>
              ${linkItems || `<span class="arch-empty">No paths configured.</span>`}
            </div>
          </div>
          <div class="arch-readout">
            <strong data-arch-label>${esc(firstNode.label || 'Architecture node')}</strong>
            <span data-arch-detail>${esc(firstNode.detail || firstNode.hint || 'Click a node or path to inspect.')}</span>
          </div>
        </div>
      </div>`;
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

  /* ── TopicDetailComponent ───────────────────────────────────── */
  window.App.TopicDetailComponent = function TopicDetailComponent(host) {
    const { TopicsService, ProgressService, Router, HomeComponent, Utils } = window.App;
    const { esc, md, codeBlock } = Utils;

    const AREA_LABEL = { java: 'Java', golang: 'Go', python: 'Python', microservices: 'Microservices', sysdesign: 'System Design', dsa: 'DSA · Algorithms', kafka: 'Kafka / Messaging', rust: 'Rust', angular: 'Angular', react: 'React', databases: 'Databases' };
    const AREA_COLOR = { java: 'var(--java)', golang: 'var(--golang)', python: 'var(--python)', microservices: 'var(--micro)', sysdesign: 'var(--sysdesign)', dsa: '#f0883e', kafka: 'var(--kafka)', rust: 'var(--rust)', angular: 'var(--angular)', react: 'var(--react-color)', databases: 'var(--databases)' };

    let stopFlow = null, stopUml = null, lastTopicId = null;

    function render() {
      if (stopFlow) { stopFlow(); stopFlow = null; }
      if (stopUml) { stopUml(); stopUml = null; }

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
        if (shell) shell.classList.add('coder-mode');
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
      if (dotEl) dotEl.style.background = areaColor;
      if (areaEl) { areaEl.textContent = areaLabel; areaEl.style.color = areaColor; }
      if (topicEl) topicEl.textContent = topic.title;
      if (sepEl) sepEl.style.display = '';

      const done = ProgressService.isDone(topic.id);
      const isTopicChange = topic.id !== lastTopicId;

      const interviewHtml = (topic.interview || []).map(qa => `
        <div class="qa">
          <div class="q">Q. ${esc(qa.question)}</div>
          <div class="a">${md(qa.answer)}</div>
          ${qa.followUps?.length ? `<div class="followups"><strong>Follow-ups:</strong> ${qa.followUps.map(esc).join(' · ')}</div>` : ''}
        </div>`).join('');

      const tradeHtml = topic.tradeoffs && typeof topic.tradeoffs === 'object'
        ? `<div class="tradeoff-grid">
             <div class="trade-card pro"><h4>Pros</h4>${md((topic.tradeoffs.pros || []).map(x => '- ' + x).join('\n'))}</div>
             <div class="trade-card con"><h4>Cons</h4>${md((topic.tradeoffs.cons || []).map(x => '- ' + x).join('\n'))}</div>
             ${topic.tradeoffs.when ? `<div class="trade-card" style="grid-column:1/-1"><h4>When to use</h4>${md(topic.tradeoffs.when)}</div>` : ''}
           </div>`
        : md(topic.tradeoffs || '');

      host.innerHTML = `
        <div class="crumbs">${esc(areaLabel)} <span class="sep">›</span> ${esc(topic.tag || 'Topic')}</div>
        <div class="title-row">
          <h1 class="topic-title">${esc(topic.title)}</h1>
          <span class="tag area-${topic.area}">${esc(areaLabel)}</span>
        </div>
        <div class="toolbar">
          <button class="btn primary" data-mark>${done ? '✓ Completed' : 'Mark as completed'}</button>
          <span class="meta">${esc(topic.id)}</span>
        </div>
        ${renderFlowLab(topic, esc)}
        ${renderUmlLab(topic, esc)}
        ${renderArchitectureLab(topic, esc)}
        ${topic.visual ? `<div class="section visual-section"><h2>0.3 · Live Canvas Diagram</h2><div class="viz-mount"></div></div>` : ''}
        <div class="section concept"><h2>1 · Concept</h2><div class="prose">${md(topic.concept || '')}</div></div>
        <div class="section why"><h2>2 · Why it matters (production)</h2><div class="prose">${md(topic.why || '')}</div></div>
        ${topic.example ? `
          <div class="section code">
            <h2>3 · Example — ${esc(topic.example.language || 'code')}</h2>
            ${codeBlock(topic.example.language, topic.example.code)}
            ${topic.example.notes ? `<div class="prose" style="margin-top:8px">${md(topic.example.notes)}</div>` : ''}
          </div>` : ''}
        ${interviewHtml ? `<div class="section interview"><h2>4 · Interview drills</h2>${interviewHtml}</div>` : ''}
        ${topic.tradeoffs ? `<div class="section tradeoffs"><h2>5 · Trade-offs</h2>${tradeHtml}</div>` : ''}
        ${topic.gotchas?.length ? `
          <div class="section gotchas"><h2>6 · Gotchas</h2>
            ${topic.gotchas.map(g => `<div class="gotcha-item">⚠️ ${esc(g)}</div>`).join('')}
          </div>` : ''}
      `;

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
          try { topic.visual(mount); }
          catch (e) { mount.innerHTML = `<div style="color:#f85149;padding:16px;font-family:monospace;font-size:12px">Visualizer error: ${e.message}</div>`; }
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
