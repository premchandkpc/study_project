/**
 * sidebar.component.js — navigation sidebar with area groups + fuzzy search
 * Exposes: window.App.SidebarComponent(host)
 * Load after: services/*.service.js, utils/renderer.utils.js
 */
(function () {
  "use strict";

  window.App.SidebarComponent = function SidebarComponent(host) {
    const { TopicsService, ProgressService, Router, Utils } = window.App;
    const { esc, fuzzyScore } = Utils;

    const collapsed = {
      java: true, golang: true, python: true, microservices: true,
      sysdesign: true, dsa: true, kafka: true, rust: true,
      angular: true, react: true, databases: true,
    };
    let debounceT = null;
    let currentQ = "";

    const AREAS = [
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
      { key: "databases",     label: "🗄 Databases & Internals" },
    ];

    function buildBlocks(q) {
      const active = Router.current().path.replace(/^\//, "");
      const activeTopic = TopicsService.byId(active);
      if (activeTopic) collapsed[activeTopic.area] = false;

      return AREAS.map(a => {
        const areaTopics = TopicsService.byArea(a.key);
        const scored = areaTopics
          .map(t => { const s = fuzzyScore(t, q); return s.match ? { t, titleHl: s.titleHl } : null; })
          .filter(Boolean);
        if (q && scored.length === 0) return "";

        const list = q ? scored : areaTopics.map(t => ({ t, titleHl: esc(t.title) }));
        const ratio = ProgressService.ratio(areaTopics.map(t => t.id));
        const isOpen = q ? list.length > 0 : !collapsed[a.key];

        const items = list.map(({ t, titleHl }) => `
          <li class="topic-item ${active === t.id ? "active" : ""}" data-nav="${esc(t.id)}">
            <span class="check ${ProgressService.isDone(t.id) ? "done" : ""}" data-check="${esc(t.id)}" title="Mark complete"></span>
            <span class="label">${titleHl}</span>
            ${t.tag ? `<span class="pill">${esc(t.tag)}</span>` : ""}
          </li>`).join("");

        return `
          <div class="area-group">
            <div class="area-title" data-toggle-area="${esc(a.key)}">
              <span class="dot ${a.key}"></span>
              <span>${esc(a.label)}</span>
              <span class="count">${q ? list.length + "/" : ""}${areaTopics.length} · ${Math.round(ratio * 100)}%</span>
              <span class="area-caret">${isOpen ? "▾" : "▸"}</span>
            </div>
            ${isOpen ? `<ul class="topic-list">${items}</ul>` : ""}
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
          collapsed[el.dataset.toggleArea] = !collapsed[el.dataset.toggleArea];
          renderBlocks();
        });
      });
      host.querySelectorAll("[data-nav]").forEach(el => {
        el.addEventListener("click", (e) => {
          if (e.target.matches("[data-check]")) return;
          Router.navigate("/" + el.dataset.nav);
        });
      });
      host.querySelectorAll("[data-check]").forEach(el => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          ProgressService.toggle(el.dataset.check);
        });
      });
    }

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

    ProgressService.state.subscribe(renderBlocks);
    Router.current.subscribe(renderBlocks);
    renderBlocks();
  };
})();
