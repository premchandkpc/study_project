/* ============================================================
  MULTI-AGENT SYSTEM
  Orchestrator → Java | Go | Microservices | SystemDesign | Design
  ============================================================ */
/* global Prism */
(function () {

  /* ── Agent definitions ─────────────────────────────────────── */
  const AGENTS = {
    orchestrator: {
      id: "orchestrator", name: "Orchestrator", emoji: "🧠",
      color: "#4f8cff", desc: "Routes to the right specialist automatically"
    },
    java: {
      id: "java", name: "Java Agent", emoji: "☕",
      color: "#f0883e", desc: "JVM, Spring, concurrency, JPA deep dives"
    },
    golang: {
      id: "golang", name: "Go Agent", emoji: "🐹",
      color: "#00acd7", desc: "Goroutines, channels, interfaces, performance"
    },
    microservices: {
      id: "microservices", name: "Microservices Agent", emoji: "🔧",
      color: "#3fb950", desc: "Distributed systems, Kafka, Saga, service mesh"
    },
    sysdesign: {
      id: "sysdesign", name: "System Design Agent", emoji: "⬡",
      color: "#00e5ff", desc: "HLD/LLD, case studies, scalability, trade-offs"
    },
    design: {
      id: "design", name: "Design Agent", emoji: "🎨",
      color: "#bc8cff", desc: "Generates HTML, flow diagrams, architecture data"
    }
  };

  /* ── Routing keywords ──────────────────────────────────────── */
  const ROUTING_RULES = [
    { agent: "java",         patterns: /\b(java|jvm|spring|hibernate|jpa|maven|gradle|gc|garbage|stream|lambda|completablefuture|webflux|reactor|servlet|tomcat|jetty|bytecode|hotspot|graalvm|record|sealed|generics|optional)\b/ },
    { agent: "golang",       patterns: /\b(go|golang|goroutine|channel|interface|struct|defer|panic|recover|context|waitgroup|mutex|sync|grpc|protobuf|gorm|gin|echo|fiber|pprof)\b/ },
    { agent: "microservices",patterns: /\b(microservice|kafka|rabbitmq|saga|circuit.?breaker|service.?mesh|istio|envoy|consul|eureka|cqrs|event.?sourc|outbox|sidecar|grpc|api.?gateway|kong)\b/ },
    { agent: "sysdesign",    patterns: /\b(system.?design|design|scale|cap.?theorem|consistent.?hash|rate.?limit|load.?balanc|sharding|replication|cdn|dns|caching|redis|dynamo|cassandra|url.?short|social.?feed|video|uber|twitter|netflix|lld|hld)\b/ },
    { agent: "design",       patterns: /\b(generate|create|build|html|angular|component|template|flow|diagram|architecture|uml|draw|code.?template|topic.?template|scaffold)\b/ }
  ];

  function routeMessage(msg) {
    const lower = msg.toLowerCase();
    for (const rule of ROUTING_RULES) {
      if (rule.patterns.test(lower)) return rule.agent;
    }
    return "orchestrator";
  }

  /* ── Knowledge bases per agent ─────────────────────────────── */
  const KB = {
    orchestrator: {
      default: `🧠 **I'm the Orchestrator!** I'll route your question to the right specialist.

**Available specialists:**
☕ **Java Agent** — JVM, Spring Boot, concurrency, JPA, streams
🐹 **Go Agent** — goroutines, channels, interfaces, HTTP servers
🔧 **Microservices Agent** — Kafka, Saga, circuit breaker, service mesh
⬡ **System Design Agent** — HLD/LLD, scalability, case studies
🎨 **Design Agent** — generate topic templates, flow diagrams, architecture data

**Try asking:**
• "Explain Java virtual threads"
• "How does Kafka consumer group work?"
• "Design a rate limiter"
• "Generate a flow diagram for circuit breaker"

Or click a **Skill** in the Skills tab for instant deep-dive answers!`
    },

    java: {
      default: `☕ **Java Agent** ready! I specialise in JVM internals, Spring ecosystem, and concurrency patterns.

Ask me about: JVM GC · ThreadPools · CompletableFuture · Spring Boot · JPA · WebFlux · Design patterns · Java 17-21 features`,
      virtual: `☕ **Virtual Threads (Java 21 — Project Loom)**

Virtual threads are lightweight threads managed by the JVM, not OS threads. They allow you to write blocking code that scales like async.

**Before (OS threads):**
\`\`\`java
// 10K connections = 10K OS threads = ~10GB RAM
ExecutorService pool = Executors.newFixedThreadPool(200); // limited!
\`\`\`

**After (virtual threads):**
\`\`\`java
// 10K connections = 10K virtual threads = ~100MB RAM
ExecutorService pool = Executors.newVirtualThreadPerTaskExecutor();
try (var executor = pool) {
    IntStream.range(0, 10_000).forEach(i ->
        executor.submit(() -> {
            Thread.sleep(1000); // blocking — JVM schedules around it
            return i;
        }));
}
\`\`\`

**Key:** Virtual threads are parked (not blocking OS thread) when doing I/O. JVM scheduler mounts them on carrier threads as needed.

**When to use:** I/O-bound workloads (HTTP, DB, file). NOT for CPU-bound (no benefit, use platform threads).`,
      record: `☕ **Java Records (Java 16+)**

Records are transparent, immutable data carriers — Java's answer to Kotlin data classes.

\`\`\`java
// Concise record declaration
public record Point(double x, double y) {
    // Compact constructor for validation
    public Point {
        if (x < 0 || y < 0) throw new IllegalArgumentException("Negative coords");
    }

    // Custom method (records can have methods)
    public double distanceTo(Point other) {
        return Math.hypot(other.x - x, other.y - y);
    }
}

// Auto-generated: constructor, getters (x(), y()), equals, hashCode, toString
Point p = new Point(3.0, 4.0);
p.x();           // 3.0
p.distanceTo(new Point(0, 0)); // 5.0

// Pattern matching with records (Java 21)
if (shape instanceof Circle(double radius)) {
    System.out.println("Circle radius: " + radius);
}
\`\`\`

**Sealed classes + records = discriminated union:**
\`\`\`java
sealed interface Shape permits Circle, Rectangle, Triangle {}
record Circle(double radius) implements Shape {}
record Rectangle(double w, double h) implements Shape {}
\`\`\``,
      concurrency: `☕ See the Concurrency Patterns skill for a complete reference! Key summary:

• Prefer VirtualThreads (Java 21) for I/O-bound concurrency
• Use CompletableFuture for async composition
• ReentrantLock for advanced locking (tryLock, fairness)
• Atomic* classes for lock-free counters
• ConcurrentHashMap for concurrent maps (never synchronize on HashMap)`,
    },

    golang: {
      default: `🐹 **Go Agent** ready! I specialise in Go concurrency, idiomatic patterns, and high-performance services.

Ask me about: goroutines · channels · interfaces · error handling · context · testing · gRPC · pprof`,
      goroutine: `🐹 **Goroutines — The Go Concurrency Model**

Goroutines are multiplexed onto OS threads by the Go scheduler (GMP model):
• G = Goroutine (2KB stack, grows to 1GB)
• M = OS thread (managed by runtime)
• P = Processor (GOMAXPROCS, default = CPU count)

**Common patterns:**

Pipeline:
\`\`\`go
func generate(nums ...int) <-chan int {
    out := make(chan int)
    go func() { for _, n := range nums { out <- n }; close(out) }()
    return out
}
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() { for n := range in { out <- n*n }; close(out) }()
    return out
}
// Usage: for n := range square(generate(2, 3, 4)) { fmt.Println(n) }
\`\`\`

Fan-out to N workers:
\`\`\`go
func fanOut(in <-chan Job, workers int) []<-chan Result {
    channels := make([]<-chan Result, workers)
    for i := 0; i < workers; i++ {
        channels[i] = worker(in)
    }
    return channels
}
\`\`\``,
      generic: `🐹 **Go Generics (1.18+)**

\`\`\`go
// Generic function with type constraint
func Map[T, U any](s []T, f func(T) U) []U {
    result := make([]U, len(s))
    for i, v := range s { result[i] = f(v) }
    return result
}

// Type constraint with interface
type Number interface { int | int64 | float64 }
func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums { total += n }
    return total
}

// Generic data structure
type Stack[T any] struct { items []T }
func (s *Stack[T]) Push(v T) { s.items = append(s.items, v) }
func (s *Stack[T]) Pop() (T, bool) {
    var zero T
    if len(s.items) == 0 { return zero, false }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return last, true
}
\`\`\``,
    },

    microservices: {
      default: `🔧 **Microservices Agent** ready! I specialise in distributed systems, event-driven architecture, and service patterns.

Ask me about: Kafka · Saga · Circuit Breaker · Service Mesh · CQRS · Event Sourcing · gRPC · API Gateway`,
      grpc: `🔧 **gRPC in Microservices**

gRPC uses HTTP/2 + Protobuf. Key advantages: 5-10× smaller payload, streaming, strong contracts.

\`\`\`protobuf
syntax = "proto3";
service OrderService {
  rpc GetOrder(OrderRequest) returns (Order);
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);
}
\`\`\`

**Interceptors (like middleware):**
\`\`\`go
func authInterceptor(ctx context.Context, req interface{},
  info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
    token := metadata.ValueFromIncomingContext(ctx, "authorization")
    if !validateToken(token) { return nil, status.Errorf(codes.Unauthenticated, "invalid token") }
    return handler(ctx, req)
}
\`\`\`

**Load balancing for gRPC:** gRPC uses HTTP/2 — a single TCP connection. Standard L4 LB won't distribute across backend instances. Use: client-side LB (grpc.Dial with round-robin resolver) or L7-aware LB (Envoy, nginx).`,
      event: `🔧 **Event-Driven Architecture — Key Patterns**

**Outbox pattern (solve dual write):**
\`\`\`
DB Transaction: {
  INSERT INTO orders(...)
  INSERT INTO outbox(event_type, payload, status=PENDING)
}
CDC (Debezium) reads outbox → publishes to Kafka
On success: UPDATE outbox SET status=PUBLISHED
\`\`\`

**Idempotent consumer pattern:**
\`\`\`java
public void process(Event event) {
    if (idempotencyStore.exists(event.getId())) return; // skip duplicate
    // ... process
    idempotencyStore.mark(event.getId()); // TTL = message retention period
}
\`\`\`

**Event versioning:**
Use schema registry (Confluent Schema Registry) + Avro/Protobuf. Backward-compatible changes: add optional fields. Breaking changes: new topic + dual publishing during migration.`
    },

    sysdesign: {
      default: `⬡ **System Design Agent** ready! I specialise in HLD/LLD, scalability patterns, and case studies.

Ask me about: URL shortener · social feed · video platform · ride sharing · rate limiter · consistent hashing · caching · CAP theorem`,
      rate: "⬡ **Rate Limiter — Full Design**\n\nSee the Rate Limiter skill for the complete algorithm reference! Quick summary:\n\n• Token bucket: allows burst, smooth average, best for APIs\n• Sliding window: accurate, prevents boundary burst\n• Redis Lua script: atomic check+decrement, no race condition\n• Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset",
      cache: `⬡ **Caching Strategy — Quick Reference**

Cache hierarchy: Browser → CDN → Reverse Proxy → App Cache (Caffeine) → Redis → DB Buffer

Cache-aside (most common):
\`\`\`
1. Check Redis → HIT → return
2. MISS → query DB → store in Redis with TTL → return
\`\`\`

Eviction: LRU (general), LFU (content libraries), TTL (time-sensitive)

Cache stampede prevention: Redis lock on miss (first caller loads, others wait) OR stale-while-revalidate OR probabilistic early expiry (XFetch)`,
      db: `⬡ **Database Selection Guide**

| Need | Choose |
|------|--------|
| ACID transactions | PostgreSQL / Aurora |
| Horizontal write scale | Cassandra / DynamoDB |
| Flexible schema | MongoDB |
| Sub-ms reads by key | Redis / DynamoDB |
| Time-series metrics | InfluxDB / TimescaleDB |
| Full-text search | Elasticsearch |
| Graph traversal | Neo4j / Neptune |
| Analytics / OLAP | Redshift / ClickHouse / BigQuery |

**Rule:** Start with PostgreSQL. Add caching (Redis) for reads. Shard only when single primary can't handle writes (>10K TPS).`
    },

    design: {
      default: `🎨 **Design Agent** ready! I can generate:

• **Topic templates** — complete topic object for any concept
• **Flow diagrams** — step-by-step animated flows
• **Architecture diagrams** — multi-lane architecture maps
• **UML sequence diagrams** — actor-message sequences

**Try asking:**
• "Generate a topic template for WebSockets"
• "Generate a flow diagram for circuit breaker state machine"
• "Generate an architecture diagram for CQRS"
• "Create a UML sequence for OAuth2 flow"`,
      flow: (concept) => `🎨 **Generated Flow for: ${concept}**

\`\`\`javascript
// Add this flow property to your topic object:
flow: {
  title: "${concept} Flow",
  caption: "Step-by-step animated walkthrough",
  nodes: [
    { id: "start",   label: "Client",      hint: "Initiates request" },
    { id: "step1",   label: "Step 1",      hint: "First processing step" },
    { id: "step2",   label: "Step 2",      hint: "Second processing step" },
    { id: "end",     label: "Response",    hint: "Final result" }
  ],
  steps: [
    { path: ["start","step1"], label: "Initiate",  detail: "Client sends request to Step 1." },
    { path: ["step1","step2"], label: "Process",   detail: "Step 1 processes and forwards." },
    { path: ["step2","end"],   label: "Complete",  detail: "Step 2 generates final response." }
  ]
}
\`\`\`
Customise node labels and step details for your specific concept!`,
      arch: (concept) => `🎨 **Generated Architecture for: ${concept}**

\`\`\`javascript
// Add this architecture property to your topic object:
architecture: {
  title: "${concept} Architecture",
  caption: "Click any node to see details",
  lanes: [
    { label: "Client Layer", nodes: [
      { id: "client", label: "Client", hint: "Initiates requests", detail: "Browser, mobile app, or service." }
    ]},
    { label: "Application Layer", nodes: [
      { id: "api",   label: "API Server",  badge: "v1", hint: "Core logic", detail: "Handles business logic." },
      { id: "cache", label: "Redis Cache", hint: "Fast reads", detail: "Sub-ms cached responses." }
    ]},
    { label: "Data Layer", nodes: [
      { id: "db", label: "Database", hint: "Persistent storage", detail: "Source of truth." }
    ]}
  ],
  links: [
    { from: "client", to: "api",   label: "HTTP request", detail: "REST/gRPC call.",  type: "sync" },
    { from: "api",    to: "cache", label: "Cache lookup",  detail: "Redis GET.",       type: "sync" },
    { from: "api",    to: "db",    label: "Cache miss",    detail: "DB query on miss.", type: "sync" }
  ]
}
\`\`\``,
      topic: (concept) => `🎨 **Generated Topic Template for: ${concept}**

\`\`\`javascript
{
  id: "${concept.toLowerCase().replace(/\s+/g,"-")}",
  area: "sysdesign", // or java/golang/microservices
  title: "${concept}",
  tag: "Architecture",
  tags: ["${concept.toLowerCase()}", "distributed", "backend"],
  concept: \`
**${concept}** is a pattern/system where...

**Key components:**
- Component A — does X
- Component B — does Y

**How it works:**
Step 1 → Step 2 → Step 3
\`,
  why: \`${concept} matters because at scale...\`,
  example: {
    language: "java",
    code: \`// ${concept} implementation
public class Example {
    // TODO: implement
}\`,
    notes: "Key implementation notes..."
  },
  interview: [
    {
      question: "How does ${concept} work?",
      answer: "Detailed answer...",
      followUps: ["Follow-up 1?", "Follow-up 2?"]
    }
  ],
  tradeoffs: {
    pros: ["Benefit 1", "Benefit 2"],
    cons: ["Trade-off 1", "Trade-off 2"],
    when: "Use when..."
  }
}
\`\`\``,
    }
  };

  /* ── Response generator ────────────────────────────────────── */
  function generateResponse(agentId, msg) {
    const lower = msg.toLowerCase();
    const kb = KB[agentId];

    // Check skills registry first
    const skills = (window.SKILLS_REGISTRY || {})[agentId] || [];
    for (const skill of skills) {
      const terms = (skill.title + " " + skill.desc).toLowerCase();
      if (lower.split(/\s+/).some(w => w.length > 3 && terms.includes(w))) {
        return { text: skill.response, skill, agentId };
      }
    }

    // Agent-specific pattern matching
    if (agentId === "java") {
      if (/virtual.?thread|loom/.test(lower)) return { text: kb.virtual, agentId };
      if (/record|sealed/.test(lower)) return { text: kb.record, agentId };
      if (/concurren|thread|synchronized/.test(lower)) return { text: kb.concurrency, agentId };
    }
    if (agentId === "golang") {
      if (/goroutine|pipeline|fan.?out/.test(lower)) return { text: kb.goroutine, agentId };
      if (/generic|type.?param/.test(lower)) return { text: kb.generic, agentId };
    }
    if (agentId === "microservices") {
      if (/grpc|protobuf/.test(lower)) return { text: kb.grpc, agentId };
      if (/event.?driven|outbox|cdc/.test(lower)) return { text: kb.event, agentId };
    }
    if (agentId === "sysdesign") {
      if (/rate.?limit/.test(lower)) return { text: kb.rate, agentId };
      if (/cache|caching|redis|lru/.test(lower)) return { text: kb.cache, agentId };
      if (/database|db|sql|nosql/.test(lower)) return { text: kb.db, agentId };
    }
    if (agentId === "design") {
      const concept = msg.replace(/generate|create|build|flow|diagram|architecture|uml|topic|for|a|an|the/gi,"").trim() || "MyComponent";
      if (/flow/.test(lower)) return { text: kb.flow(concept), agentId };
      if (/arch/.test(lower)) return { text: kb.arch(concept), agentId };
      if (/topic|template|scaffold/.test(lower)) return { text: kb.topic(concept), agentId };
      return { text: kb.default, agentId };
    }

    return { text: kb.default || AGENTS[agentId].desc, agentId };
  }

  /* ── Try server, fall back to local ──────────────────────────  */
  async function fetchReply(agentId, msg) {
    for (const port of [3001, 3002, 3003]) {
      try {
        const res = await fetch(
          `http://localhost:${port}/api/agent?msg=${encodeURIComponent(msg)}&agent=${agentId}`,
          { signal: AbortSignal.timeout(1500) }
        );
        if (res.ok) {
          const data = await res.json();
          return { text: data.reply || data.message, agentId };
        }
      } catch (e) { /* ignore */ }
    }
    return generateResponse(agentId, msg);
  }

  /* ── Widget HTML ────────────────────────────────────────────── */
  const WIDGET_HTML = `
<button id="agentToggle" class="agent-fab" title="Open Study Agents">🧠</button>
<div id="agentPanel" class="agent-panel hidden">
  <div class="agent-panel-header">
    <div class="agent-panel-title">
      <span class="agent-status-dot"></span>
      <span id="agentHeaderName">Study Agents</span>
      <span class="agent-badge" id="agentHeaderBadge">ORCHESTRATOR</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <button class="ma-tab-btn active" data-tab="chat" title="Chat">💬</button>
      <button class="ma-tab-btn" data-tab="skills" title="Skills">⚡</button>
      <button class="agent-close-btn" id="agentClose">✕</button>
    </div>
  </div>

  <!-- Agent Selector -->
  <div class="ma-agent-bar">
    <button class="ma-agent-btn active" data-agent="orchestrator" title="Auto-route">🧠</button>
    <button class="ma-agent-btn" data-agent="java"          title="Java Agent">☕</button>
    <button class="ma-agent-btn" data-agent="golang"        title="Go Agent">🐹</button>
    <button class="ma-agent-btn" data-agent="microservices" title="Microservices Agent">🔧</button>
    <button class="ma-agent-btn" data-agent="sysdesign"     title="System Design Agent">⬡</button>
    <button class="ma-agent-btn" data-agent="design"        title="Design Agent">🎨</button>
  </div>

  <!-- Chat Tab -->
  <div id="ma-chat-tab" class="ma-tab-content">
    <div class="agent-panel-body" id="agentMessages"></div>
    <div class="agent-panel-footer">
      <input id="agentInput" class="agent-input" placeholder="Ask anything…" autocomplete="off" />
      <button id="agentSend" class="agent-send-btn">➤</button>
    </div>
  </div>

  <!-- Skills Tab -->
  <div id="ma-skills-tab" class="ma-tab-content hidden">
    <div class="ma-skills-filter">
      <button class="ma-filter-btn active" data-area="all">All</button>
      <button class="ma-filter-btn" data-area="java">☕ Java</button>
      <button class="ma-filter-btn" data-area="golang">🐹 Go</button>
      <button class="ma-filter-btn" data-area="microservices">🔧 Micro</button>
      <button class="ma-filter-btn" data-area="sysdesign">⬡ SysDes</button>
    </div>
    <div class="ma-skills-grid" id="skillsGrid"></div>
  </div>
</div>
`;

  /* ── State ──────────────────────────────────────────────────── */
  let currentAgent = "orchestrator";

  /* ── Render skills grid ─────────────────────────────────────── */
  function renderSkills(filterArea) {
    const grid = document.getElementById("skillsGrid");
    if (!grid || !window.SKILLS_REGISTRY) return;
    grid.innerHTML = "";
    const allSkills = Object.values(window.SKILLS_REGISTRY).flat();
    allSkills
      .filter(s => filterArea === "all" || s.area === filterArea)
      .forEach(skill => {
        const card = document.createElement("div");
        card.className = "ma-skill-card";
        card.innerHTML = `
        <div class="ma-skill-icon">${skill.icon}</div>
        <div class="ma-skill-title">${skill.title}</div>
        <div class="ma-skill-desc">${skill.desc}</div>
        ${skill.topicId ? `<div class="ma-skill-link" data-topic="${skill.topicId}">→ View Topic</div>` : ""}
      `;
        card.addEventListener("click", () => {
          switchTab("chat");
          addMessage(`Tell me about: ${skill.title}`, "user");
          showReply(skill.agentId || skill.area, skill.title, { text: skill.response, agentId: skill.area });
        });
        const topicLink = card.querySelector(".ma-skill-link");
        if (topicLink) {
          topicLink.addEventListener("click", (e) => {
            e.stopPropagation();
            navigateToTopic(topicLink.dataset.topic);
          });
        }
        grid.appendChild(card);
      });
  }

  function navigateToTopic(topicId) {
  // Trigger the hash router in app.js
    window.location.hash = `#topic/${topicId}`;
    // Close panel
    document.getElementById("agentPanel").classList.add("hidden");
    document.getElementById("agentToggle").classList.remove("active");
  }

  /* ── Switch tab ─────────────────────────────────────────────── */
  function switchTab(tab) {
    document.querySelectorAll(".ma-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    document.getElementById("ma-chat-tab").classList.toggle("hidden", tab !== "chat");
    document.getElementById("ma-skills-tab").classList.toggle("hidden", tab !== "skills");
    if (tab === "skills") renderSkills("all");
  }

  /* ── Render markdown-ish text ──────────────────────────────── */
  function renderMd(text) {
    return text
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="ma-code"><code class="language-${lang}">${code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</code></pre>`)
      .replace(/\n/g, "<br>");
  }

  /* ── Add message to chat ────────────────────────────────────── */
  function addMessage(text, role, meta) {
    const box = document.getElementById("agentMessages");
    const wrap = document.createElement("div");
    wrap.className = "agent-msg " + role;

    const agent = meta?.agentId ? AGENTS[meta.agentId] : null;
    const emoji = agent ? agent.emoji : (role === "user" ? "👤" : "🧠");
    const color = agent ? agent.color : "#4f8cff";

    if (role === "user") {
      wrap.innerHTML = `<div class="agent-bubble user-bubble">${renderMd(text)}</div><span class="agent-avatar">${emoji}</span>`;
    } else {
      const badge = agent ? `<span class="ma-agent-badge" style="background:${color}20;color:${color};border-color:${color}40">${emoji} ${agent.name}</span>` : "";
      const followUps = meta?.skill?.followUps?.length
        ? `<div class="ma-followups">${meta.skill.followUps.map(f => `<button class="ma-followup-btn">${f}</button>`).join("")}</div>`
        : "";
      const topicLink = meta?.skill?.topicId
        ? `<div class="ma-topic-link" data-topic="${meta.skill.topicId}">→ Open full topic in sidebar</div>`
        : "";
      wrap.innerHTML = `<span class="agent-avatar">${emoji}</span>
      <div class="agent-bubble">
        ${badge}
        <div class="ma-response-body">${renderMd(text)}</div>
        ${followUps}
        ${topicLink}
      </div>`;
      wrap.querySelectorAll(".ma-followup-btn").forEach(btn => {
        btn.addEventListener("click", () => sendMessage(btn.textContent));
      });
      wrap.querySelectorAll(".ma-topic-link").forEach(link => {
        link.addEventListener("click", () => navigateToTopic(link.dataset.topic));
      });
    }
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;

    // Trigger Prism if available
    setTimeout(() => {
      if (window.Prism) Prism.highlightAllUnder(wrap);
    }, 50);
    return wrap;
  }

  /* ── Show reply (with typing indicator) ────────────────────── */
  async function showReply(agentId, msg, precomputed) {
    const typing = addMessage("Thinking…", "bot");
    const result = precomputed || await fetchReply(agentId, msg);
    typing.remove();
    addMessage(result.text, "bot", result);
    return result;
  }

  /* ── Send message ───────────────────────────────────────────── */
  async function sendMessage(text) {
    const input = document.getElementById("agentInput");
    const msg = text || input.value.trim();
    if (!msg) return;
    if (input) input.value = "";

    addMessage(msg, "user");

    // Route: if orchestrator mode → auto-detect; else use selected agent
    const agentId = currentAgent === "orchestrator" ? routeMessage(msg) : currentAgent;

    // Update header to show which agent is responding
    const agent = AGENTS[agentId];
    document.getElementById("agentHeaderName").textContent = agent.name;
    document.getElementById("agentHeaderBadge").textContent = agentId.toUpperCase();
    document.getElementById("agentHeaderBadge").style.background =
    `linear-gradient(90deg, ${agent.color}88, ${agent.color}44)`;

    await showReply(agentId, msg);
  }

  /* ── Bind events ────────────────────────────────────────────── */
  function bindEvents() {
    const toggle = document.getElementById("agentToggle");
    const close  = document.getElementById("agentClose");
    const send   = document.getElementById("agentSend");
    const input  = document.getElementById("agentInput");
    const panel  = document.getElementById("agentPanel");

    toggle.addEventListener("click", () => {
      const isHidden = panel.classList.contains("hidden");
      panel.classList.toggle("hidden");
      toggle.classList.toggle("active");
      if (isHidden && !document.getElementById("agentMessages").children.length) {
        addMessage(KB.orchestrator.default, "bot", { agentId: "orchestrator" });
      }
    });
    close.addEventListener("click", () => {
      panel.classList.add("hidden");
      toggle.classList.remove("active");
    });
    send.addEventListener("click", () => sendMessage());
    input.addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });

    // Tab switching
    document.querySelectorAll(".ma-tab-btn").forEach(btn =>
      btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

    // Agent selector
    document.querySelectorAll(".ma-agent-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".ma-agent-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentAgent = btn.dataset.agent;
        const agent = AGENTS[currentAgent];
        document.getElementById("agentHeaderName").textContent = agent.name;
        document.getElementById("agentHeaderBadge").textContent = currentAgent.toUpperCase();
        document.getElementById("agentHeaderBadge").style.background =
        `linear-gradient(90deg, ${agent.color}88, ${agent.color}44)`;
      });
    });

    // Skills filter
    document.addEventListener("click", e => {
      if (e.target.classList.contains("ma-filter-btn")) {
        document.querySelectorAll(".ma-filter-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        renderSkills(e.target.dataset.area);
      }
    });
  }

  /* ── Mount ──────────────────────────────────────────────────── */
  function mount() {
    const container = document.createElement("div");
    container.id = "agentRoot";
    container.innerHTML = WIDGET_HTML;
    document.body.appendChild(container);
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

})();
