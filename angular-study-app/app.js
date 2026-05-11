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
      .concat(window.MICRO_TOPICS || []);
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
            <button class="flow-btn primary" type="button" data-flow-play>Pause</button>
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

  /* ---------- Components ------------------------------------------------- */

  // SidebarComponent
  function SidebarComponent(host) {
    const topics = TopicsService;
    const progress = ProgressService;
    const router = Router;
    const filter = signal("");

    const areas = [
      { key: "java",          label: "Java" },
      { key: "golang",        label: "Golang" },
      { key: "python",        label: "Python" },
      { key: "microservices", label: "Microservices · System Design" }
    ];

    function render() {
      const q = filter();
      const matches = q ? topics.search(q).map(t => t.id) : null;
      const active = router.current().path.replace(/^\//, "");
      const blocks = areas.map(a => {
        const list = topics.byArea(a.key).filter(t => !matches || matches.includes(t.id));
        const ratio = progress.ratio(topics.byArea(a.key).map(t => t.id));
        return `
          <div class="area-group">
            <div class="area-title">
              <span class="dot ${a.key}"></span>
              <span>${esc(a.label)}</span>
              <span class="count">${list.length}/${topics.byArea(a.key).length} · ${Math.round(ratio*100)}%</span>
            </div>
            <ul class="topic-list">
              ${list.map(t => `
                <li class="topic-item ${active === t.id ? "active" : ""}" data-nav="${esc(t.id)}">
                  <span class="check ${progress.isDone(t.id) ? "done" : ""}" data-toggle="${esc(t.id)}" title="Mark complete"></span>
                  <span class="label">${esc(t.title)}</span>
                  ${t.tag ? `<span class="pill">${esc(t.tag)}</span>` : ""}
                </li>`).join("")}
            </ul>
          </div>`;
      }).join("");

      host.innerHTML = `
        <div class="brand">
          <div class="logo">SDE</div>
          <div>
            <h1>Senior SDE Study Lab</h1>
            <small>Java · Go · Python · Microservices</small>
          </div>
        </div>
        <input class="search" placeholder="Search topics, code, tags…" value="${esc(q)}" />
        ${blocks}
      `;

      host.querySelector(".search").addEventListener("input", (e) => filter.set(e.target.value));
      host.querySelectorAll("[data-nav]").forEach(el => {
        el.addEventListener("click", (e) => {
          if (e.target.matches("[data-toggle]")) return;
          router.navigate("/" + el.dataset.nav);
        });
      });
      host.querySelectorAll("[data-toggle]").forEach(el => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          progress.toggle(el.dataset.toggle);
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
      let playing = true;

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
      startFlow();
    }

    function render() {
      if (flowTimer) {
        clearInterval(flowTimer);
        flowTimer = null;
      }

      const id = router.current().path.replace(/^\//, "");
      const topic = topics.byId(id);
      if (!topic) {
        lastTopicId = null;
        host.innerHTML = `
          <div class="empty">
            <div>
              <h2>Pick a topic on the left</h2>
              <p>Each topic follows the mentor framework: <strong>Concept → Why → Example → Interview → Trade-offs</strong>. Use the check on the left to mark mastery; progress persists locally.</p>
            </div>
          </div>`;
        return;
      }

      const areaLabel = ({ java:"Java", golang:"Go", python:"Python", microservices:"Microservices" })[topic.area];
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
