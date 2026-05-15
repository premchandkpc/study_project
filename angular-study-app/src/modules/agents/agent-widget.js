(function () {
  /* ── Inject widget HTML into the page ─────────────────────────── */
  const WIDGET_HTML = `
    <button id="agentToggle" class="agent-fab" title="Open Study Agent">🤖</button>
    <div id="agentPanel" class="agent-panel hidden">
      <div class="agent-panel-header">
        <div class="agent-panel-title">
          <span class="agent-status-dot"></span>
          <span>Study Agent</span>
          <span class="agent-badge">AI</span>
        </div>
        <button class="agent-close-btn" id="agentClose">✕</button>
      </div>
      <div class="agent-panel-body" id="agentMessages">
        <div class="agent-msg bot">
          <span class="agent-avatar">🤖</span>
          <div class="agent-bubble">Hey! I'm your Study Agent. Ask me anything about Java, Go, Python, Microservices, or Agents!</div>
        </div>
      </div>
      <div class="agent-panel-footer">
        <input id="agentInput" class="agent-input" placeholder="Ask a question…" autocomplete="off" />
        <button id="agentSend" class="agent-send-btn">➤</button>
      </div>
    </div>
  `;

  function mount() {
    const container = document.createElement("div");
    container.id = "agentRoot";
    container.innerHTML = WIDGET_HTML;
    document.body.appendChild(container);
    bindEvents();
  }

  function bindEvents() {
    const toggle = document.getElementById("agentToggle");
    const close  = document.getElementById("agentClose");
    const send   = document.getElementById("agentSend");
    const input  = document.getElementById("agentInput");
    const panel  = document.getElementById("agentPanel");

    toggle.addEventListener("click", () => {
      panel.classList.toggle("hidden");
      toggle.classList.toggle("active");
    });
    close.addEventListener("click", () => {
      panel.classList.add("hidden");
      toggle.classList.remove("active");
    });
    send.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
  }

  function addMessage(text, role) {
    const box  = document.getElementById("agentMessages");
    const wrap = document.createElement("div");
    wrap.className = "agent-msg " + role;
    wrap.innerHTML = role === "user"
      ? `<div class="agent-bubble user-bubble">${escHtml(text)}</div><span class="agent-avatar">👤</span>`
      : `<span class="agent-avatar">🤖</span><div class="agent-bubble">${escHtml(text)}</div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
    return wrap;
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);
  }

  function sendMessage() {
    const input = document.getElementById("agentInput");
    const msg   = input.value.trim();
    if (!msg) return;
    input.value = "";
    addMessage(msg, "user");

    // Show typing indicator
    const typing = addMessage("…", "bot");

    // Try the mock server first; fall back to a local stub
    fetch("http://localhost:3001/api/agent?msg=" + encodeURIComponent(msg))
      .then(r => r.json())
      .then(data => {
        typing.remove();
        addMessage(data.reply || data.message || JSON.stringify(data), "bot");
      })
      .catch(() => {
        typing.remove();
        addMessage(localReply(msg), "bot");
      });
  }

  /* ── Local fallback responses (no server needed) ─────────────── */
  const LOCAL_TIPS = {
    java:          "☕ Java tip: prefer composition over inheritance. Use interfaces for behaviour, abstract classes for shared state.",
    go:            "🐹 Go tip: error handling is explicit — always check `err != nil`. Use goroutines for concurrency with channels for sync.",
    golang:        "🐹 Go tip: keep goroutines short-lived; use `context.Context` to cancel them cleanly.",
    python:        "🐍 Python tip: use dataclasses or Pydantic for typed models. `asyncio` + `httpx` for async HTTP calls.",
    microservice:  "🔧 Microservices tip: design around bounded contexts. Use async messaging (Kafka/RabbitMQ) to decouple services.",
    agent:         "🤖 Agent tip: agents combine a reasoning loop (LLM) with tools (functions/APIs). Think ReAct: Reason → Act → Observe.",
    spring:        "🌱 Spring tip: prefer constructor injection. Use `@Transactional` at the service layer, not the repository.",
    rest:          "🌐 REST tip: use HTTP semantics correctly — GET is idempotent, POST creates, PUT/PATCH updates, DELETE removes.",
    kafka:         "📨 Kafka tip: choose partition count based on expected consumer parallelism. Don't over-partition early.",
    docker:        "🐳 Docker tip: keep images small with multi-stage builds. Always use non-root users in production images.",
  };

  function localReply(msg) {
    const lower = msg.toLowerCase();
    for (const [key, tip] of Object.entries(LOCAL_TIPS)) {
      if (lower.includes(key)) return tip;
    }
    return `📚 Great question! To get a live AI answer, start the mock server:\n\ncd agents && npm install && npm run dev\n\nMeanwhile, pick a topic in the sidebar to deep-dive into it!`;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
