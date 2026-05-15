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
      .concat(window.DSA_TOPICS || []);
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
            <strong data-uml-label>${esc(firstMessage.label || "Message 1")}</strong>
            <span data-uml-detail>${esc(firstMessage.detail || "")}</span>
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
    const filter = signal("");
    const collapsed = { java:true, golang:true, python:true, microservices:true, sysdesign:true, dsa:true };
    let debounceT = null;

    const areas = [
      { key: "java",          label: "Java" },
      { key: "golang",        label: "Golang" },
      { key: "python",        label: "Python" },
      { key: "microservices", label: "Microservices · System Design" },
      { key: "sysdesign",     label: "⬡ System Design · Architecture" },
      { key: "dsa",           label: "⚡ DSA · Algorithms" }
    ];

    function render() {
      const q = filter();
      const active = router.current().path.replace(/^\//, "");

      const blocks = areas.map(a => {
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

      host.innerHTML = `
        <div class="sidebar-inner">
          <div class="brand">
            <div class="logo">SDE</div>
            <div>
              <h1>Senior SDE Study Lab</h1>
              <small>Java · Go · Python · Microservices</small>
            </div>
          </div>
          <input class="search" id="sidebar-search" placeholder="Search topics, code, tags… (Ctrl+K)" value="${esc(q)}" autocomplete="off" />
          ${blocks}
        </div>
      `;

      const inp = host.querySelector("#sidebar-search");
      inp.addEventListener("input", (e) => {
        clearTimeout(debounceT);
        debounceT = setTimeout(() => filter.set(e.target.value), 120);
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { filter.set(""); inp.value = ""; }
      });

      host.querySelectorAll("[data-toggle-area]").forEach(el => {
        el.addEventListener("click", () => {
          const key = el.dataset.toggleArea;
          collapsed[key] = !collapsed[key];
          render();
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

    filter.subscribe(render);
    progress.state.subscribe(render);
    router.current.subscribe(render);
    render();
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
      const progressEl = lab.querySelector("[data-uml-progress]");
      const playBtn = lab.querySelector("[data-uml-play]");
      let index = 0;
      let playing = false;

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
        detail.textContent = message.detail || "";
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
      messageEls.forEach(el => {
        el.addEventListener("click", () => {
          stopUml();
          activateMessage(Number(el.dataset.umlMessage));
        });
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
      const topic = topics.byId(id);
      if (!topic) {
        lastTopicId = null;
        host.innerHTML = '';
        host.style.padding = '0';
        host.style.maxWidth = '100%';
        if (host._homeCleanup) { host._homeCleanup(); host._homeCleanup = null; }
        host._homeCleanup = HomeComponent(host);
        return;
      }
      host.style.padding = '';
      host.style.maxWidth = '';

      const areaLabel = ({ java:"Java", golang:"Go", python:"Python", microservices:"Microservices", sysdesign:"System Design", dsa:"DSA · Algorithms" })[topic.area] || topic.area;
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

  // HomeComponent — central entry page with 3-col grid + fuzzy search
  function HomeComponent(host) {
    const progress = ProgressService;
    const router = Router;
    const filter = signal("");
    let debounceT = null;
    let kHandler = null;

    const areaConfig = [
      { key: "java",          label: "Java",                   color: "var(--java)" },
      { key: "golang",        label: "Go",                     color: "var(--golang)" },
      { key: "python",        label: "Python",                 color: "var(--python)" },
      { key: "microservices", label: "Microservices",          color: "var(--micro)" },
      { key: "sysdesign",     label: "System Design",          color: "var(--sysdesign)" },
      { key: "dsa",           label: "DSA · Algorithms",       color: "#f0883e" }
    ];

    function render() {
      const q = filter();
      const allTopics = TopicsService.all;

      const byArea = {};
      areaConfig.forEach(a => { byArea[a.key] = []; });

      allTopics.forEach(t => {
        const s = fuzzyScore(t, q);
        if (s.match && byArea[t.area]) byArea[t.area].push({ t, titleHl: s.titleHl });
      });

      const total = allTopics.length;
      const done = allTopics.filter(t => progress.isDone(t.id)).length;

      const sections = areaConfig.map(a => {
        const items = byArea[a.key] || [];
        if (q && !items.length) return '';
        const areaTopics = TopicsService.byArea(a.key);
        const ratio = progress.ratio(areaTopics.map(t => t.id));
        const doneCount = areaTopics.filter(t => progress.isDone(t.id)).length;
        const displayItems = items.length ? items : areaTopics.map(t => ({ t, titleHl: esc(t.title) }));
        const cards = displayItems.map(({ t, titleHl }) => `
          <div class="home-card" data-home-nav="${esc(t.id)}">
            <div class="home-card-bar" style="background:${a.color}"></div>
            <div class="home-card-body">
              <div class="home-card-title">${titleHl}</div>
              <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:2px">
                ${t.tag ? `<span class="home-card-tag">${esc(t.tag)}</span>` : ''}
                ${(t.tags || []).slice(0,2).map(tg => `<span class="home-card-kw">${esc(tg)}</span>`).join('')}
              </div>
            </div>
            <div class="home-card-check ${progress.isDone(t.id) ? 'done' : ''}"></div>
          </div>`).join('');
        return `
          <div class="home-section">
            <div class="home-section-header">
              <span class="home-section-dot" style="background:${a.color}"></span>
              <span class="home-section-label">${a.label}</span>
              <span class="home-section-progress">${q ? items.length + '/' : ''}${areaTopics.length} topics · ${doneCount} done · ${Math.round(ratio*100)}%</span>
            </div>
            <div class="home-grid">${cards}</div>
          </div>`;
      }).join('');

      host.innerHTML = `
        <div class="home-root">
          <div class="home-hero">
            <div class="home-hero-text">
              <h1 class="home-title">Senior SDE Study Lab</h1>
              <p class="home-sub">${total} topics · ${done} completed · Java · Go · Python · Microservices · DSA</p>
            </div>
            <div class="home-search-wrap">
              <span class="home-search-icon">⌕</span>
              <input class="home-search" id="home-search-input"
                placeholder="Search topics, patterns, tags… (Ctrl+K)"
                value="${esc(q)}" autocomplete="off" />
              ${q ? `<button class="home-search-clear" id="home-clear-btn">✕</button>` : ''}
            </div>
            <div class="home-stats">
              ${areaConfig.map(a => {
                const at = TopicsService.byArea(a.key);
                const dc = at.filter(t => progress.isDone(t.id)).length;
                return `<div class="home-stat">
                  <span class="home-stat-dot" style="background:${a.color}"></span>
                  <span>${a.label}</span>
                  <strong>${dc}/${at.length}</strong>
                </div>`;
              }).join('')}
            </div>
          </div>
          <div class="home-content">
            ${sections || `<div class="home-empty">No topics match "<strong>${esc(q)}</strong>" — try a shorter query or different keyword.</div>`}
          </div>
        </div>
      `;

      const inp = host.querySelector('#home-search-input');
      if (inp) {
        inp.focus();
        inp.addEventListener('input', e => {
          clearTimeout(debounceT);
          debounceT = setTimeout(() => filter.set(e.target.value), 120);
        });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Escape') { filter.set(''); inp.value = ''; }
        });
      }
      const clearBtn = host.querySelector('#home-clear-btn');
      if (clearBtn) clearBtn.addEventListener('click', () => { filter.set(''); });
      host.querySelectorAll('[data-home-nav]').forEach(el => {
        el.addEventListener('click', () => router.navigate('/' + el.dataset.homeNav));
      });
    }

    filter.subscribe(render);
    progress.state.subscribe(render);
    render();

    kHandler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const inp = host.querySelector('#home-search-input');
        if (inp) { inp.focus(); inp.select(); }
      }
    };
    document.addEventListener('keydown', kHandler);
    return () => { if (kHandler) document.removeEventListener('keydown', kHandler); };
  }

  // AppRootComponent — composes the shell
  function bootstrap() {
    const root = document.querySelector("app-root");
    root.classList.add("app-shell");
    root.innerHTML = `
      <aside class="sidebar"></aside>
      <main class="main"></main>
    `;
    SidebarComponent(root.querySelector(".sidebar"));
    TopicDetailComponent(root.querySelector(".main"));

    // Ctrl+K — focus sidebar search (when on topic page, home handles its own)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        const sideSearch = root.querySelector('#sidebar-search');
        const homeSearch = document.querySelector('#home-search-input');
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
