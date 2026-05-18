/**
 * fiber.animation.js — React Fiber work loop visualizer
 * Exposes: window.ReactViz.FiberTree
 *
 * Renders a fiber tree with work loop traversal:
 * - beginWork (blue) → children
 * - completeWork (green) → return
 * - commit (orange) → DOM update
 */
(function () {
  "use strict";
  window.ReactViz = window.ReactViz || {};

  const FIBER_COLORS = {
    idle:         { bg: "#161b22", border: "#30363d", text: "#768390" },
    beginWork:    { bg: "#1a2438", border: "#58a6ff", text: "#58a6ff" },
    completeWork: { bg: "#1a2d1a", border: "#3fb950", text: "#3fb950" },
    commit:       { bg: "#2d1e0f", border: "#ffa657", text: "#ffa657" },
    skip:         { bg: "#0d1117", border: "#21262d", text: "#484f58" },
    error:        { bg: "#2d1117", border: "#f85149", text: "#f85149" },
  };

  /**
   * fibers = {
   *   tag: 'HostRoot'|'FunctionComponent'|'ClassComponent'|'HostComponent'|string,
   *   name: string,
   *   state: 'idle'|'beginWork'|'completeWork'|'commit'|'skip'|'error',
   *   stateNode?: any,
   *   alternate?: boolean,
   *   effectTag?: string,
   *   children?: fibers[]
   * }
   * phase = 'beginWork'|'completeWork'|'commit'|'idle'
   */
  window.ReactViz.FiberTree = {
    render(el, fiberTree, phase, currentFiberName) {
      el.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.cssText = "overflow:auto;height:100%";

      // Phase legend
      const legend = document.createElement("div");
      legend.style.cssText = "display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap";
      [["beginWork","#58a6ff"],["completeWork","#3fb950"],["commit","#ffa657"],["skip","#484f58"]].forEach(([p,c])=>{
        legend.innerHTML += `<span style="background:${c}22;color:${c};border:1px solid ${c}44;border-radius:10px;padding:2px 8px;font-size:9px;font-weight:700">${p}</span>`;
      });
      wrap.appendChild(legend);

      if (phase) {
        const phaseBar = document.createElement("div");
        phaseBar.style.cssText = "font-size:10px;color:#768390;margin-bottom:8px;font-family:monospace";
        phaseBar.textContent = "Work loop phase: ";
        const phaseSpan = document.createElement("span");
        phaseSpan.style.cssText = `color:${FIBER_COLORS[phase]?.text||"#58a6ff"};font-weight:700`;
        phaseSpan.textContent = phase;
        phaseBar.appendChild(phaseSpan);
        wrap.appendChild(phaseBar);
      }

      wrap.appendChild(this._renderNode(fiberTree, 0, currentFiberName));
      el.appendChild(wrap);
    },

    _renderNode(fiber, depth, currentFiberName) {
      const wrap = document.createElement("div");
      wrap.style.cssText = `margin-left:${depth*20}px;margin-bottom:6px`;

      const s = fiber.state || "idle";
      const c = FIBER_COLORS[s] || FIBER_COLORS.idle;
      const isCurrent = fiber.name === currentFiberName;

      const TAG_MAP = {
        FunctionComponent: "FC",
        ClassComponent:    "CC",
        HostRoot:          "Root",
        HostComponent:     "DOM",
        Fragment:          "Frag",
      };
      const tagLabel = TAG_MAP[fiber.tag] || fiber.tag || "Node";

      wrap.innerHTML = `
        <div style="background:${c.bg};border:${isCurrent?"2px":"1px"} solid ${c.border};border-radius:6px;padding:6px 10px;transition:all .3s${isCurrent?";box-shadow:0 0 8px "+c.border+"60":""}}">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="background:${c.border}22;color:${c.text};font-size:9px;padding:1px 5px;border-radius:4px;font-weight:700">${tagLabel}</span>
            <span style="color:${c.text};font-weight:700;font-size:12px;font-family:monospace">${fiber.name}</span>
            ${fiber.effectTag ? `<span style="background:#f0883e22;color:#f0883e;font-size:9px;padding:1px 5px;border-radius:4px">${fiber.effectTag}</span>` : ""}
            ${fiber.alternate ? "<span style=\"background:#d2a8ff22;color:#d2a8ff;font-size:9px;padding:1px 5px;border-radius:4px\">alt</span>" : ""}
          </div>
          ${s !== "idle" && s !== "skip" ? `<div style="font-size:9px;color:${c.text};margin-top:2px;opacity:0.8">${s}</div>` : ""}
        </div>`;

      if (fiber.children && fiber.children.length) {
        const childWrap = document.createElement("div");
        childWrap.style.cssText = "border-left:1px dashed #30363d;margin-left:10px;padding-left:10px;margin-top:4px";
        fiber.children.forEach(child => childWrap.appendChild(this._renderNode(child, 0, currentFiberName)));
        wrap.appendChild(childWrap);
      }

      return wrap;
    },
  };
})();
