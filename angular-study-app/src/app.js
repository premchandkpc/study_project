/* =========================================================================
 * Senior SDE Study Lab — Angular-style mini framework + components
 * No build step. Opens directly in a browser.
 * Architecture mirrors Angular concepts: Services, DI, Signals, Router.
 * ========================================================================= */
(function () {
  "use strict";

  /* ---------- Signal (Angular 17 signal API, minimal) -------------------- */
  function signal(initial) {
    let value = initial;
    const subs = new Set();
    const s = () => value;
    s.set = (v) => { if (v !== value) { value = v; subs.forEach(fn => fn(value)); } };
    s.update = (fn) => s.set(fn(value));
    s.subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
    return s;
  }

  /* ---------- Tiny DI container (mirrors Angular providers) -------------- */
  const Injector = {
    _: new Map(),
    provide(token, factory) { this._.set(token, factory()); return this._.get(token); },
    inject(token) {
      if (!this._.has(token)) throw new Error("No provider for " + token);
      return this._.get(token);
    }
  };

  /* ---------- TopicsService — aggregates topic data ---------------------- */
  const TopicsService = Injector.provide("TopicsService", () => {
    const all = []
      .concat(window.JAVA_TOPICS || [])
      .concat(window.GO_TOPICS || [])
      .concat(window.PYTHON_TOPICS || [])
      .concat(window.MICRO_TOPICS || [])
      .concat(window.SYSDESIGN_TOPICS || [])
      .concat(window.DSA_TOPICS || [])
      .concat(window.KAFKA_TOPICS || [])
      .concat(window.RUST_TOPICS || [])
      .concat(window.ANGULAR_TOPICS || [])
      .concat(window.REACT_TOPICS || [])
      .concat(window.DB_TOPICS || []);
    return {
      all,
      byId: (id) => all.find(t => t.id === id),
      byArea: (area) => all.filter(t => t.area === area),
      search: (q) => {
        if (!q) return all;
        const s = q.toLowerCase();
        return all.filter(t =>
          t.title.toLowerCase().includes(s) ||
          (t.concept || "").toLowerCase().includes(s) ||
          (t.tags || []).join(" ").toLowerCase().includes(s)
        );
      }
    };
  });

  /* ---------- ProgressService — localStorage-backed completion ---------- */
  const ProgressService = Injector.provide("ProgressService", () => {
    const key = "study-lab:done";
    const load = () => { try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); } };
    const state = signal(load());
    const persist = () => localStorage.setItem(key, JSON.stringify([...state()]));
    return {
      state,
      toggle: (id) => state.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); persist(); return n; }),
      isDone: (id) => state().has(id),
      ratio: (ids) => {
        if (!ids.length) return 0;
        const done = ids.filter(id => state().has(id)).length;
        return done / ids.length;
      }
    };
  });

  /* ---------- Router — hash-based, mirrors Angular Router ---------------- */
  const Router = Injector.provide("Router", () => {
    const current = signal(parseHash());
    function parseHash() {
      const h = (location.hash || "#/").replace(/^#/, "");
      const [path, query] = h.split("?");
      return { path: path || "/", query: query || "" };
    }
    window.addEventListener("hashchange", () => current.set(parseHash()));
    return {
      current,
      navigate: (path) => { location.hash = "#" + path; }
    };
  });

  /* ---------- Renderer helpers — escape, markdown-lite ------------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);
  }

  /* ---------- Fuzzy search helpers --------------------------------------- */
  function fuzzyMatch(text, query) {
    if (!query) return { match: true, score: 0, indices: [] };
    const t = text.toLowerCase(), q = query.toLowerCase();
    let ti = 0, qi = 0;
    const indices = [];
    while (ti < t.length && qi < q.length) {
      if (t[ti] === q[qi]) { indices.push(ti); qi++; }
      ti++;
    }
    if (qi < q.length) return { match: false };
    const consecutiveBonus = indices.reduce((acc, idx, i) => acc + (i > 0 && idx === indices[i-1]+1 ? 2 : 0), 0);
    return { match: true, score: qi + consecutiveBonus, indices };
  }

  function fuzzyHL(text, indices) {
    if (!indices || !indices.length) return esc(text);
    let r = '', inM = false;
    for (let i = 0; i < text.length; i++) {
      const hit = indices.includes(i);
      if (hit && !inM) { r += '<mark class="fz-hl">'; inM = true; }
      if (!hit && inM) { r += '</mark>'; inM = false; }
      r += esc(text[i]);
    }
    return inM ? r + '</mark>' : r;
  }

  function fuzzyScore(topic, q) {
    if (!q) return { match: true, score: 0, titleHl: esc(topic.title) };
    const titleM = fuzzyMatch(topic.title, q);
    if (titleM.match) return { match: true, score: titleM.score + 20, titleHl: fuzzyHL(topic.title, titleM.indices) };
    const tagM = fuzzyMatch(topic.tag || '', q);
    if (tagM.match && q.length >= 2) return { match: true, score: tagM.score + 10, titleHl: esc(topic.title) };
    const tagsHit = (topic.tags || []).some(tg => fuzzyMatch(tg, q).match);
    if (tagsHit && q.length >= 2) return { match: true, score: 5, titleHl: esc(topic.title) };
    const areaM = fuzzyMatch(topic.area, q);
    if (areaM.match && q.length >= 2) return { match: true, score: 1, titleHl: esc(topic.title) };
    return { match: false };
  }
  // Tiny markdown subset: **bold**, `code`, lists, paragraphs
  function md(text) {
    if (!text) return "";
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    let html = "", inList = false;
    const inlineFmt = (s) => esc(s)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");
    for (let raw of lines) {
      const line = raw.trim();
      if (/^[-*]\s+/.test(line)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + inlineFmt(line.replace(/^[-*]\s+/, "")) + "</li>";
      } else if (!line) {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<p>" + inlineFmt(line) + "</p>";
      }
    }
    if (inList) html += "</ul>";
    return html;
  }

  function codeBlock(lang, code) {
    const langClass = "language-" + (lang || "none");
    return (
      `<div class="code-head">
         <span class="lang">${esc(lang || "code")}</span>
         <button class="copy" data-copy>Copy</button>
       </div>
       <pre class="${langClass}"><code class="${langClass}">${esc(code)}</code></pre>`
    );
  }

  function renderFlowLab(topic) {
    const flow = topic.flow;
    if (!flow || !flow.nodes || !flow.nodes.length || !flow.steps || !flow.steps.length) return "";

    const firstStep = flow.steps[0];
    const nodes = flow.nodes.map((node, index) => `
      <button type="button" class="flow-node" data-node="${esc(node.id)}" style="--i:${index}">
        <span class="node-index">${index + 1}</span>
        <span class="node-label">${esc(node.label)}</span>
        ${node.hint ? `<span class="node-hint">${esc(node.hint)}</span>` : ""}
      </button>
      ${index < flow.nodes.length - 1
        ? `<div class="flow-edge" data-edge="${esc(node.id)}-${esc(flow.nodes[index + 1].id)}" style="--i:${index}"><span></span></div>`
        : ""}`
    ).join("");

    return `
      <div class="section flow-section">
        <h2>0 · Interactive flow</h2>
        <div class="flow-lab" data-flow-lab>
          <div class="flow-title">
            <strong>${esc(flow.title || topic.title)}</strong>
            ${flow.caption ? `<span>${esc(flow.caption)}</span>` : ""}
          </div>
          <div class="flow-stage" role="group" aria-label="${esc(flow.title || topic.title)}">
            ${nodes}
          </div>
          <div class="flow-controls">
            <button class="flow-btn" type="button" data-flow-prev>Prev</button>
            <button class="flow-btn primary" type="button" data-flow-play>Play</button>
            <button class="flow-btn" type="button" data-flow-next>Next</button>
            <div class="flow-progress" aria-hidden="true"><div data-flow-progress></div></div>
          </div>
          <div class="flow-readout">
            <strong data-flow-step-label>${esc(firstStep.label || "Step 1")}</strong>
            <span data-flow-step-detail>${esc(firstStep.detail || "")}</span>
          </div>
        </div>
      </div>`;
  }

  function renderUmlLab(topic) {
    const uml = topic.uml;
    if (!uml || !uml.actors || !uml.actors.length || !uml.messages || !uml.messages.length) return "";

    const actorIndex = new Map(uml.actors.map((actor, index) => [actor.id, index]));
    const firstMessage = uml.messages[0];
    const actors = uml.actors.map(actor => `
      <button type="button" class="uml-actor" data-uml-actor="${esc(actor.id)}">
        <span>${esc(actor.label)}</span>
        ${actor.hint ? `<small>${esc(actor.hint)}</small>` : ""}
      </button>`
    ).join("");
    const rows = uml.messages.map((message, index) => {
      const from = actorIndex.has(message.from) ? actorIndex.get(message.from) : 0;
      const to = actorIndex.has(message.to) ? actorIndex.get(message.to) : from;
      const start = Math.min(from, to) + 1;
      const end = Math.max(from, to) + 2;
      const reverse = from > to ? " reverse" : "";
      const async = message.type === "async" ? " async" : "";
      return `
        <div class="uml-row" data-uml-row="${index}">
          ${uml.actors.map(actor => `<span class="uml-lifeline" data-uml-life="${esc(actor.id)}"></span>`).join("")}
          <button
            type="button"
            class="uml-message${reverse}${async}"
            data-uml-message="${index}"
            style="grid-column:${start} / ${end}">
            <span>${index + 1}. ${esc(message.label)}</span>
          </button>
        </div>`;
    }).join("");

    return `
      <div class="section uml-section">
        <h2>0.1 · UML sequence simulation</h2>
        <div class="uml-lab" data-uml-lab>
          <div class="uml-title">
            <strong>${esc(uml.title || topic.title)}</strong>
            ${uml.scenario ? `<span>${esc(uml.scenario)}</span>` : ""}
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
              <strong data-uml-label style="font-size:14px;">${esc(firstMessage.label || "Message 1")}</strong>
              <span class="uml-type-badge ${firstMessage.async ? 'async' : 'sync'}" data-uml-type-badge>${firstMessage.async ? 'async' : 'sync'}</span>
            </div>
            <span data-uml-detail style="font-size:13px;color:#d3dcea;line-height:1.6;">${esc(firstMessage.detail || "")}</span>
          </div>
        </div>
      </div>`;
  }

  function renderArchitectureLab(topic) {
    const arch = topic.architecture;
    if (!arch || !arch.lanes || !arch.lanes.length) return "";

    const links = arch.links || [];
    const firstNode = arch.lanes.flatMap(lane => lane.nodes || [])[0] || {};
    const lanes = arch.lanes.map((lane, laneIndex) => `
      <div class="arch-lane" style="--lane:${laneIndex}">
        <div class="arch-lane-title">
          <span>${esc(lane.label || `Lane ${laneIndex + 1}`)}</span>
          ${lane.hint ? `<small>${esc(lane.hint)}</small>` : ""}
        </div>
        <div class="arch-node-stack">
          ${(lane.nodes || []).map(node => `
            <button type="button" class="arch-node" data-arch-node="${esc(node.id)}">
              <span class="arch-node-label">${esc(node.label)}</span>
              ${node.badge ? `<span class="arch-badge">${esc(node.badge)}</span>` : ""}
              ${node.hint ? `<small>${esc(node.hint)}</small>` : ""}
            </button>`).join("")}
        </div>
      </div>`).join("");

    const linkItems = links.map((link, index) => `
      <button
        type="button"
        class="arch-link ${link.type === "async" ? "async" : "sync"}"
        data-arch-link="${index}"
        data-arch-from="${esc(link.from)}"
        data-arch-to="${esc(link.to)}">
        <span>${esc(link.label || `${link.from} to ${link.to}`)}</span>
        <small>${esc(link.type === "async" ? "event/async" : "request/sync")}</small>
      </button>`).join("");

    return `
      <div class="section arch-section">
        <h2>0.2 · Architecture map</h2>
        <div class="arch-lab" data-arch-lab>
          <div class="arch-title">
            <strong>${esc(arch.title || topic.title)}</strong>
            ${arch.caption ? `<span>${esc(arch.caption)}</span>` : ""}
          </div>
          <div class="arch-board">
            <div class="arch-lanes" role="group" aria-label="${esc(arch.title || topic.title)}">
              ${lanes}
            </div>
            <div class="arch-links">
              <strong>Paths</strong>
              ${linkItems || `<span class="arch-empty">No paths configured.</span>`}
            </div>
          </div>
          <div class="arch-readout">
            <strong data-arch-label>${esc(firstNode.label || "Architecture node")}</strong>
            <span data-arch-detail>${esc(firstNode.detail || firstNode.hint || "Click a node or path to inspect the production responsibility.")}</span>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Components ------------------------------------------------- */

  // SidebarComponent
  function SidebarComponent(host) {
    const topics = TopicsService;
    const progress = ProgressService;
    const router = Router;
    const collapsed = { java:true, golang:true, python:true, microservices:true, sysdesign:true, dsa:true, kafka:true, rust:true, angular:true, react:true, databases:true };
    let debounceT = null;
    let currentQ = "";

    const areas = [
      { key: "java",          label: "Java" },
      { key: "golang",        label: "Golang" },
      { key: "python",        label: "Python" },
      { key: "microservices", label: "Microservices · System Design" },
      { key: "sysdesign",     label: "⬡ System Design · Architecture" },
      { key: "dsa",           label: "⚡ DSA · Algorithms" },
      { key: "kafka",         label: "☁ Kafka · RabbitMQ · WarpStream" },
      { key: "rust",          label: "⚙ Rust" },
      { key: "angular",       label: "▲ Angular" },
      { key: "react",         label: "⚛ React" },
      { key: "databases",     label: "🗄 Databases & Internals" }
    ];

    function buildBlocks(q) {
      const active = router.current().path.replace(/^\//, "");
      // auto-expand area of currently active topic
      const activeTopic = topics.byId(active);
      if (activeTopic) collapsed[activeTopic.area] = false;
      return areas.map(a => {
        const areaTopics = topics.byArea(a.key);
        const scored = areaTopics.map(t => {
          const s = fuzzyScore(t, q);
          return s.match ? { t, titleHl: s.titleHl } : null;
        }).filter(Boolean);
        if (q && scored.length === 0) return '';
        const fullList = q ? scored : areaTopics.map(t => ({ t, titleHl: esc(t.title) }));
        const ratio = progress.ratio(areaTopics.map(t => t.id));
        const isOpen = q ? fullList.length > 0 : !collapsed[a.key];
        const topicItems = fullList.map(({ t, titleHl }) => `
          <li class="topic-item ${active === t.id ? "active" : ""}" data-nav="${esc(t.id)}">
            <span class="check ${progress.isDone(t.id) ? "done" : ""}" data-check="${esc(t.id)}" title="Mark complete"></span>
            <span class="label">${titleHl}</span>
            ${t.tag ? `<span class="pill">${esc(t.tag)}</span>` : ""}
          </li>`).join("");
        return `
          <div class="area-group">
            <div class="area-title" data-toggle-area="${esc(a.key)}">
              <span class="dot ${a.key}"></span>
              <span>${esc(a.label)}</span>
              <span class="count">${q ? fullList.length + '/' : ''}${areaTopics.length} · ${Math.round(ratio*100)}%</span>
              <span class="area-caret">${isOpen ? '▾' : '▸'}</span>
            </div>
            ${isOpen ? `<ul class="topic-list">${topicItems}</ul>` : ''}
          </div>`;
      }).join("");
    }

    function renderBlocks() {
      const blocksEl = host.querySelector("#sidebar-blocks");
      if (blocksEl) blocksEl.innerHTML = buildBlocks(currentQ);
      bindBlocks();
    }

    function bindBlocks() {
      host.querySelectorAll("[data-toggle-area]").forEach(el => {
        el.addEventListener("click", () => {
          const key = el.dataset.toggleArea;
          collapsed[key] = !collapsed[key];
          renderBlocks();
        });
      });
      host.querySelectorAll("[data-nav]").forEach(el => {
        el.addEventListener("click", (e) => {
          if (e.target.matches("[data-check]")) return;
          router.navigate("/" + el.dataset.nav);
        });
      });
      host.querySelectorAll("[data-check]").forEach(el => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          progress.toggle(el.dataset.check);
        });
      });
    }

    // Build shell once — input is NEVER replaced again
    host.innerHTML = `
      <div class="sidebar-inner">
        <div class="brand">
          <div class="logo">SDE</div>
          <div>
            <h1>Senior SDE Study Lab</h1>
            <small>Java · Go · Python · Microservices</small>
          </div>
        </div>
        <input class="search" id="sidebar-search" placeholder="Search… (Ctrl+K)" autocomplete="off" spellcheck="false" />
        <div id="sidebar-blocks"></div>
      </div>
    `;

    const inp = host.querySelector("#sidebar-search");
    inp.addEventListener("input", (e) => {
      clearTimeout(debounceT);
      const val = e.target.value;
      debounceT = setTimeout(() => { currentQ = val; renderBlocks(); }, 100);
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { currentQ = ""; inp.value = ""; renderBlocks(); }
    });

    progress.state.subscribe(renderBlocks);
    router.current.subscribe(renderBlocks);
    renderBlocks();
  }

  // TopicDetailComponent
  function TopicDetailComponent(host) {
    const topics = TopicsService;
    const progress = ProgressService;
    const router = Router;
    let flowTimer = null;
    let umlTimer = null;
    let lastTopicId = null;

    function setupFlowLab(topic) {
      const lab = host.querySelector("[data-flow-lab]");
      if (!lab || !topic.flow || !topic.flow.steps || !topic.flow.steps.length) return;

      const steps = topic.flow.steps;
      const nodes = Array.from(lab.querySelectorAll("[data-node]"));
      const edges = Array.from(lab.querySelectorAll("[data-edge]"));
      const label = lab.querySelector("[data-flow-step-label]");
      const detail = lab.querySelector("[data-flow-step-detail]");
      const progressEl = lab.querySelector("[data-flow-progress]");
      const playBtn = lab.querySelector("[data-flow-play]");
      let index = 0;
      let playing = false;

      function activateStep(nextIndex) {
        index = (nextIndex + steps.length) % steps.length;
        const step = steps[index];
        const path = step.path && step.path.length
          ? step.path
          : [step.from, step.to].filter(Boolean);

        nodes.forEach(node => {
          const nodeId = node.dataset.node;
          node.classList.toggle("active-path", path.includes(nodeId));
          node.classList.toggle("active-source", nodeId === path[0]);
          node.classList.toggle("active-target", nodeId === path[path.length - 1]);
        });

        edges.forEach(edge => {
          const active = path.some((nodeId, pathIndex) => {
            const nextNodeId = path[pathIndex + 1];
            return nextNodeId && (
              edge.dataset.edge === nodeId + "-" + nextNodeId ||
              edge.dataset.edge === nextNodeId + "-" + nodeId
            );
          });
          edge.classList.toggle("active", active);
        });

        label.textContent = step.label || `Step ${index + 1}`;
        detail.textContent = step.detail || "";
        progressEl.style.width = `${((index + 1) / steps.length) * 100}%`;
      }

      function stopFlow() {
        playing = false;
        playBtn.textContent = "Play";
        if (flowTimer) clearInterval(flowTimer);
        flowTimer = null;
      }

      function startFlow() {
        playing = true;
        playBtn.textContent = "Pause";
        if (flowTimer) clearInterval(flowTimer);
        flowTimer = setInterval(() => activateStep(index + 1), 1800);
      }

      lab.querySelector("[data-flow-prev]").addEventListener("click", () => {
        stopFlow();
        activateStep(index - 1);
      });
      lab.querySelector("[data-flow-next]").addEventListener("click", () => {
        stopFlow();
        activateStep(index + 1);
      });
      playBtn.addEventListener("click", () => playing ? stopFlow() : startFlow());
      nodes.forEach(node => {
        node.addEventListener("click", () => {
          const nextIndex = steps.findIndex(step => {
            const path = step.path && step.path.length
              ? step.path
              : [step.from, step.to].filter(Boolean);
            return path.includes(node.dataset.node);
          });
          stopFlow();
          activateStep(nextIndex >= 0 ? nextIndex : 0);
        });
      });

      activateStep(0);
    }

    function setupUmlLab(topic) {
      const lab = host.querySelector("[data-uml-lab]");
      if (!lab || !topic.uml || !topic.uml.messages || !topic.uml.messages.length) return;

      const messages = topic.uml.messages;
      const actors = Array.from(lab.querySelectorAll("[data-uml-actor]"));
      const lives = Array.from(lab.querySelectorAll("[data-uml-life]"));
      const rows = Array.from(lab.querySelectorAll("[data-uml-row]"));
      const messageEls = Array.from(lab.querySelectorAll("[data-uml-message]"));
      const label = lab.querySelector("[data-uml-label]");
      const detail = lab.querySelector("[data-uml-detail]");
      const typeBadge = lab.querySelector("[data-uml-type-badge]");
      const progressEl = lab.querySelector("[data-uml-progress]");
      const playBtn = lab.querySelector("[data-uml-play]");
      let index = 0;
      let playing = false;

      function fmtDetail(text) {
        return esc(text).replace(/`([^`\n]+)`/g, '<code style="background:#0d1320;border:1px solid #2a374f;padding:1px 5px;border-radius:3px;font-size:11px;color:#d6e0ff;font-family:JetBrains Mono,monospace;">$1</code>');
      }

      function activateMessage(nextIndex) {
        index = (nextIndex + messages.length) % messages.length;
        const message = messages[index];
        const activeActors = new Set([message.from, message.to]);

        actors.forEach(actor => {
          actor.classList.toggle("active", activeActors.has(actor.dataset.umlActor));
          actor.classList.toggle("source", actor.dataset.umlActor === message.from);
          actor.classList.toggle("target", actor.dataset.umlActor === message.to);
        });
        lives.forEach(life => life.classList.toggle("active", activeActors.has(life.dataset.umlLife)));
        rows.forEach(row => row.classList.toggle("active", Number(row.dataset.umlRow) === index));
        messageEls.forEach(el => el.classList.toggle("active", Number(el.dataset.umlMessage) === index));

        label.textContent = message.label || `Message ${index + 1}`;
        detail.innerHTML = fmtDetail(message.detail || "");
        if (typeBadge) {
          typeBadge.textContent = message.async ? "async" : "sync";
          typeBadge.className = "uml-type-badge " + (message.async ? "async" : "sync");
        }
        progressEl.style.width = `${((index + 1) / messages.length) * 100}%`;
      }

      function stopUml() {
        playing = false;
        playBtn.textContent = "Play";
        if (umlTimer) clearInterval(umlTimer);
        umlTimer = null;
      }

      function startUml() {
        playing = true;
        playBtn.textContent = "Pause";
        if (umlTimer) clearInterval(umlTimer);
        umlTimer = setInterval(() => activateMessage(index + 1), 2300);
      }

      lab.querySelector("[data-uml-prev]").addEventListener("click", () => {
        stopUml();
        activateMessage(index - 1);
      });
      lab.querySelector("[data-uml-next]").addEventListener("click", () => {
        stopUml();
        activateMessage(index + 1);
      });
      playBtn.addEventListener("click", () => playing ? stopUml() : startUml());
      let tip = document.getElementById("_uml_tip");
      if (!tip) {
        tip = document.createElement("div");
        tip.id = "_uml_tip";
        tip.className = "uml-tip";
        tip.style.display = "none";
        document.body.appendChild(tip);
      }

      messageEls.forEach(el => {
        el.addEventListener("click", () => {
          stopUml();
          activateMessage(Number(el.dataset.umlMessage));
        });
        el.addEventListener("mouseenter", () => {
          const msg = messages[Number(el.dataset.umlMessage)];
          if (!msg) return;
          const isAsync = !!msg.async;
          tip.innerHTML = `
            <div class="uml-tip-label">${esc(msg.label || "")}</div>
            <span class="uml-tip-badge ${isAsync ? 'async' : 'sync'}">${isAsync ? '⟳ async' : '→ sync'}</span>
            <div class="uml-tip-detail">${fmtDetail(msg.detail || "")}</div>`;
          tip.style.display = "block";
          tip.style.animation = "none";
          requestAnimationFrame(() => { tip.style.animation = ""; });
          const rect = el.getBoundingClientRect();
          const tipW = 320;
          let left = rect.left + rect.width / 2 - tipW / 2;
          left = Math.max(8, Math.min(left, window.innerWidth - tipW - 8));
          let top = rect.top - 12;
          if (top < 60) top = rect.bottom + 8;
          tip.style.left = left + "px";
          tip.style.top = top + "px";
          tip.style.width = tipW + "px";
          tip.style.transform = "translateY(-100%)";
        });
        el.addEventListener("mouseleave", () => { tip.style.display = "none"; });
      });
      actors.forEach(actor => {
        actor.addEventListener("click", () => {
          const nextIndex = messages.findIndex(message =>
            message.from === actor.dataset.umlActor || message.to === actor.dataset.umlActor
          );
          stopUml();
          activateMessage(nextIndex >= 0 ? nextIndex : 0);
        });
      });

      activateMessage(0);
    }

    function setupArchitectureLab(topic) {
      const lab = host.querySelector("[data-arch-lab]");
      if (!lab || !topic.architecture || !topic.architecture.lanes) return;

      const nodes = Array.from(lab.querySelectorAll("[data-arch-node]"));
      const links = Array.from(lab.querySelectorAll("[data-arch-link]"));
      const label = lab.querySelector("[data-arch-label]");
      const detail = lab.querySelector("[data-arch-detail]");
      const nodeData = new Map();
      topic.architecture.lanes.forEach(lane => {
        (lane.nodes || []).forEach(node => nodeData.set(node.id, node));
      });

      function setReadout(title, body) {
        label.textContent = title || "Architecture detail";
        detail.textContent = body || "";
      }

      function activateNode(nodeId) {
        const node = nodeData.get(nodeId) || {};
        nodes.forEach(el => el.classList.toggle("active", el.dataset.archNode === nodeId));
        links.forEach(el => {
          const active = el.dataset.archFrom === nodeId || el.dataset.archTo === nodeId;
          el.classList.toggle("active", active);
          el.classList.toggle("connected", active);
        });
        setReadout(node.label, node.detail || node.hint || "This component participates in the selected production flow.");
      }

      function activateLink(index) {
        const link = (topic.architecture.links || [])[index] || {};
        nodes.forEach(el => el.classList.toggle(
          "active",
          el.dataset.archNode === link.from || el.dataset.archNode === link.to
        ));
        links.forEach(el => {
          const active = Number(el.dataset.archLink) === index;
          el.classList.toggle("active", active);
          el.classList.toggle("connected", false);
        });
        setReadout(link.label, link.detail || "This path shows how data or control moves between components.");
      }

      nodes.forEach(node => node.addEventListener("click", () => activateNode(node.dataset.archNode)));
      links.forEach(link => link.addEventListener("click", () => activateLink(Number(link.dataset.archLink))));
      if (nodes[0]) activateNode(nodes[0].dataset.archNode);
    }

    function render() {
      if (flowTimer) {
        clearInterval(flowTimer);
        flowTimer = null;
      }
      if (umlTimer) {
        clearInterval(umlTimer);
        umlTimer = null;
      }

      const id = router.current().path.replace(/^\//, "");

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

        /* hide header breadcrumb, add coder-mode to shell */
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

      /* leaving coder — remove coder-mode */
      if (host._coderActive) {
        host._coderActive = false;
        const shell = document.querySelector('app-root');
        if (shell) shell.classList.remove('coder-mode');
        if (host._coderCleanup) { host._coderCleanup(); host._coderCleanup = null; }
      }

      const topic = topics.byId(id);
      if (!topic) {
        // Home already mounted — don't re-mount; HomeComponent manages its own progress subscription
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

      const AREA_LABEL = { java:"Java", golang:"Go", python:"Python", microservices:"Microservices", sysdesign:"System Design", dsa:"DSA · Algorithms", kafka:"Kafka / Messaging", rust:"Rust", angular:"Angular", react:"React", databases:"Databases" };
      const AREA_COLOR = { java:"var(--java)", golang:"var(--golang)", python:"var(--python)", microservices:"var(--micro)", sysdesign:"var(--sysdesign)", dsa:"#f0883e", kafka:"var(--kafka)", rust:"var(--rust)", angular:"var(--angular)", react:"var(--react-color)", databases:"var(--databases)" };
      const areaLabel = AREA_LABEL[topic.area] || topic.area;
      const areaColor = AREA_COLOR[topic.area] || 'var(--accent)';

      // Update header bar
      const dotEl = document.getElementById('hdr-dot');
      const areaEl = document.getElementById('hdr-area');
      const topicEl = document.getElementById('hdr-topic');
      const sepEl = document.getElementById('hdr-sep');
      if (dotEl) dotEl.style.background = areaColor;
      if (areaEl) { areaEl.textContent = areaLabel; areaEl.style.color = areaColor; }
      if (topicEl) topicEl.textContent = topic.title;
      if (sepEl) sepEl.style.display = '';

      const done = progress.isDone(topic.id);
      const isTopicChange = topic.id !== lastTopicId;

      const interviewHtml = (topic.interview || []).map(qa => `
        <div class="qa">
          <div class="q">Q. ${esc(qa.question)}</div>
          <div class="a">${md(qa.answer)}</div>
          ${qa.followUps && qa.followUps.length
            ? `<div class="followups"><strong>Follow-ups:</strong> ${qa.followUps.map(esc).join(" · ")}</div>`
            : ""}
        </div>`).join("");

      const tradeHtml = topic.tradeoffs && typeof topic.tradeoffs === "object"
        ? `<div class="tradeoff-grid">
             <div class="trade-card pro"><h4>Pros</h4>${md((topic.tradeoffs.pros || []).map(x => "- " + x).join("\n"))}</div>
             <div class="trade-card con"><h4>Cons</h4>${md((topic.tradeoffs.cons || []).map(x => "- " + x).join("\n"))}</div>
             ${topic.tradeoffs.when ? `<div class="trade-card" style="grid-column: 1 / -1"><h4>When to use</h4>${md(topic.tradeoffs.when)}</div>` : ""}
           </div>`
        : md(topic.tradeoffs || "");

      host.innerHTML = `
        <div class="crumbs">${esc(areaLabel)} <span class="sep">›</span> ${esc(topic.tag || "Topic")}</div>
        <div class="title-row">
          <h1 class="topic-title">${esc(topic.title)}</h1>
          <span class="tag area-${topic.area}">${esc(areaLabel)}</span>
        </div>
        <div class="toolbar">
          <button class="btn primary" data-mark>${done ? "✓ Completed" : "Mark as completed"}</button>
          <span class="meta">${esc(topic.id)}</span>
        </div>

        ${renderFlowLab(topic)}
        ${renderUmlLab(topic)}
        ${renderArchitectureLab(topic)}
        ${topic.visual ? `<div class="section visual-section"><h2>0.3 · Live Canvas Diagram</h2><div class="viz-mount"></div></div>` : ""}

        <div class="section concept">
          <h2>1 · Concept</h2>
          <div class="prose">${md(topic.concept || "")}</div>
        </div>

        <div class="section why">
          <h2>2 · Why it matters (production)</h2>
          <div class="prose">${md(topic.why || "")}</div>
        </div>

        ${topic.example ? `
          <div class="section code">
            <h2>3 · Example — ${esc(topic.example.language || "code")}</h2>
            ${codeBlock(topic.example.language, topic.example.code)}
            ${topic.example.notes ? `<div class="prose" style="margin-top:8px">${md(topic.example.notes)}</div>` : ""}
          </div>` : ""}

        ${interviewHtml ? `
          <div class="section interview">
            <h2>4 · Interview drills</h2>
            ${interviewHtml}
          </div>` : ""}

        ${topic.tradeoffs ? `
          <div class="section tradeoffs">
            <h2>5 · Trade-offs</h2>
            ${tradeHtml}
          </div>` : ""}
        ${topic.gotchas && topic.gotchas.length ? `
          <div class="section gotchas">
            <h2>6 · Gotchas</h2>
            ${topic.gotchas.map(g => `<div class="gotcha-item">⚠️ ${esc(g)}</div>`).join("")}
          </div>` : ""}
      `;

      host.querySelectorAll("[data-copy]").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const pre = btn.parentElement.nextElementSibling;
          navigator.clipboard.writeText(pre.innerText).then(() => {
            btn.textContent = "Copied";
            setTimeout(() => btn.textContent = "Copy", 1200);
          });
        });
      });
      const markBtn = host.querySelector("[data-mark]");
      if (markBtn) markBtn.addEventListener("click", () => progress.toggle(topic.id));
      setupFlowLab(topic);
      setupUmlLab(topic);
      setupArchitectureLab(topic);
      if (topic.visual) {
        const mount = host.querySelector(".viz-mount");
        if (mount) {
          try {
            topic.visual(mount);
          } catch(e) {
            console.error("viz error", e);
            mount.innerHTML = `<div style="color:#f85149;padding:16px;font-family:monospace;font-size:12px">Visualizer error: ${e.message}</div>`;
          }
        }
      }

      // Trigger Prism highlight after content is in the DOM
      if (window.Prism) Prism.highlightAllUnder(host);
      // Smooth scroll to top on topic switch
      if (isTopicChange) window.scrollTo({ top: 0, behavior: "smooth" });
      lastTopicId = topic.id;
    }

    router.current.subscribe(render);
    progress.state.subscribe(render);
    render();
  }

  // HomeComponent — area card grid landing page
  function HomeComponent(host) {
    const progress = ProgressService;
    const router = Router;

    const areaConfig = [
      { key: "java",          label: "Java",             color: "var(--java)" },
      { key: "golang",        label: "Go",               color: "var(--golang)" },
      { key: "python",        label: "Python",           color: "var(--python)" },
      { key: "microservices", label: "Microservices",    color: "var(--micro)" },
      { key: "sysdesign",     label: "System Design",    color: "var(--sysdesign)" },
      { key: "dsa",           label: "DSA · Algorithms",          color: "#f0883e" },
      { key: "kafka",         label: "Kafka / Messaging",          color: "var(--kafka)" },
      { key: "rust",          label: "Rust",                       color: "var(--rust)" },
      { key: "angular",       label: "Angular",                    color: "var(--angular)" },
      { key: "react",         label: "React",                      color: "var(--react-color)" },
      { key: "databases",     label: "Databases & Internals",      color: "var(--databases)" }
    ];

    function renderAreaCards() {
      const gridEl = host.querySelector('#home-area-grid');
      if (!gridEl) return;
      gridEl.innerHTML = areaConfig.map(a => {
        const areaTopics = TopicsService.byArea(a.key);
        const done = areaTopics.filter(t => progress.isDone(t.id)).length;
        const ratio = areaTopics.length ? done / areaTopics.length : 0;
        return `
          <div class="area-card" data-area-nav="${esc(a.key)}" style="--area-color:${a.color}">
            <div class="area-card-head">
              <span class="area-card-dot" style="background:${a.color}"></span>
              <span class="area-card-name">${esc(a.label)}</span>
            </div>
            <div class="area-card-count">${areaTopics.length} topics</div>
            ${done > 0 ? `<div class="area-card-done">${done} completed</div>` : ''}
            <div class="area-card-bar">
              <div style="width:${Math.round(ratio * 100)}%;background:${a.color}"></div>
            </div>
          </div>`;
      }).join('');
      gridEl.querySelectorAll('[data-area-nav]').forEach(el => {
        el.addEventListener('click', () => {
          const key = el.dataset.areaNav;
          const first = TopicsService.byArea(key)[0];
          if (first) router.navigate('/' + first.id);
        });
      });
    }

    function initShell() {
      const total = TopicsService.all.length;
      const done = TopicsService.all.filter(t => progress.isDone(t.id)).length;
      host.innerHTML = `
        <div class="home-landing">
          <div class="home-landing-hero">
            <h1 class="home-landing-title">Senior SDE Study Lab</h1>
            <p class="home-landing-sub">Pick a subject to start learning</p>
            <div class="home-landing-total">${total} topics · ${done} completed</div>
          </div>
          <div class="home-area-grid" id="home-area-grid"></div>
        </div>
      `;
      renderAreaCards();
    }

    // Re-render area cards on progress changes (updates done counts)
    const unsubProgress = progress.state.subscribe(renderAreaCards);

    initShell();

    return () => {
      unsubProgress();
    };
  }

  // AppRootComponent — composes the shell
  function bootstrap() {
    const root = document.querySelector("app-root");
    root.classList.add("app-shell", "home-mode");
    root.innerHTML = `
      <header class="app-header" id="app-header">
        <button class="hdr-back" id="hdr-back">← Study Lab</button>
        <span class="hdr-div">|</span>
        <span class="hdr-area-dot" id="hdr-dot"></span>
        <span class="hdr-area" id="hdr-area"></span>
        <span class="hdr-sep" id="hdr-sep" style="display:none">›</span>
        <span class="hdr-topic" id="hdr-topic"></span>
        <span style="flex:1"></span>
        <button class="hdr-coder-btn" id="hdr-coder-btn">⚡ Code Runner</button>
      </header>
      <aside class="sidebar"></aside>
      <main class="main"></main>
    `;

    // toggle home-mode / coder-mode based on route
    Router.current.subscribe(({ path }) => {
      const isHome = path === '/' || path === '';
      const isCoder = path === '/coder';
      root.classList.toggle('home-mode', isHome);
      /* coder-mode toggled by TopicDetailComponent render() */
      if (!isCoder) root.classList.remove('coder-mode');
    });

    // header back button → home
    root.querySelector('#hdr-back').addEventListener('click', () => Router.navigate('/'));

    // Code Runner button → /coder
    root.querySelector('#hdr-coder-btn').addEventListener('click', () => Router.navigate('/coder'));

    SidebarComponent(root.querySelector(".sidebar"));
    TopicDetailComponent(root.querySelector(".main"));

    // Ctrl+K — focus search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const homeSearch = document.querySelector('#home-search-input');
        const sideSearch = root.querySelector('#sidebar-search');
        if (homeSearch) { e.preventDefault(); homeSearch.focus(); homeSearch.select(); }
        else if (sideSearch) { e.preventDefault(); sideSearch.focus(); sideSearch.select(); }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
