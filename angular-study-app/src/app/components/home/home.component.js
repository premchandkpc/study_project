/**
 * home.component.js — landing page with area card grid
 * Exposes: window.App.HomeComponent(host) → cleanup fn
 * Load after: services/*.service.js, utils/renderer.utils.js
 */
(function () {
  "use strict";

  window.App.HomeComponent = function HomeComponent(host) {
    const { TopicsService, ProgressService, Router, Utils } = window.App;
    const { esc } = Utils;

    const AREA_CONFIG = [
      { key: "java",          label: "Java",                     color: "var(--java)" },
      { key: "golang",        label: "Go",                       color: "var(--golang)" },
      { key: "python",        label: "Python",                   color: "var(--python)" },
      { key: "microservices", label: "Microservices",            color: "var(--micro)" },
      { key: "sysdesign",     label: "System Design",            color: "var(--sysdesign)" },
      { key: "dsa",           label: "DSA · Algorithms",         color: "#f0883e" },
      { key: "kafka",         label: "Kafka / Messaging",         color: "var(--kafka)" },
      { key: "rust",          label: "Rust",                     color: "var(--rust)" },
      { key: "angular",       label: "Angular",                  color: "var(--angular)" },
      { key: "react",         label: "React",                    color: "var(--react-color)" },
      { key: "databases",     label: "Databases & Internals",    color: "var(--databases)" },
    ];

    function renderAreaCards() {
      const gridEl = host.querySelector("#home-area-grid");
      if (!gridEl) return;
      gridEl.innerHTML = AREA_CONFIG.map(a => {
        const topics = TopicsService.byArea(a.key);
        const done = topics.filter(t => ProgressService.isDone(t.id)).length;
        const ratio = topics.length ? done / topics.length : 0;
        return `
          <div class="area-card" data-area-nav="${esc(a.key)}" style="--area-color:${a.color}">
            <div class="area-card-head">
              <span class="area-card-dot" style="background:${a.color}"></span>
              <span class="area-card-name">${esc(a.label)}</span>
            </div>
            <div class="area-card-count">${topics.length} topics</div>
            ${done > 0 ? `<div class="area-card-done">${done} completed</div>` : ""}
            <div class="area-card-bar">
              <div style="width:${Math.round(ratio * 100)}%;background:${a.color}"></div>
            </div>
          </div>`;
      }).join("");

      gridEl.querySelectorAll("[data-area-nav]").forEach(el => {
        el.addEventListener("click", () => {
          const first = TopicsService.byArea(el.dataset.areaNav)[0];
          if (first) Router.navigate("/" + first.id);
        });
      });
    }

    const total = TopicsService.all.length;
    const done = TopicsService.all.filter(t => ProgressService.isDone(t.id)).length;

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
    const unsubProgress = ProgressService.state.subscribe(renderAreaCards);

    return () => unsubProgress();
  };
})();
