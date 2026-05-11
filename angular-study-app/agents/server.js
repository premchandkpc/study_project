const express = require("express");
const cors    = require("cors");
const app     = express();
const PORT    = 3001;

app.use(cors());
app.use(express.json());

/* ── Knowledge base for local agent replies ─────────────────────── */
const KB = {
  java: "☕ **Java**: Strongly typed, JVM-based. Great for enterprise apps. Use streams for collection processing, Optional to avoid NPEs, and records for immutable data models.",
  go: "🐹 **Go (Golang)**: Compiled, concurrent by design. Goroutines are lightweight threads. Channels provide safe communication. Perfect for high-throughput microservices.",
  golang: "🐹 **Go (Golang)**: Use `sync.WaitGroup` to coordinate goroutines. Prefer `context.Context` for cancellation/timeout propagation across service calls.",
  python: "🐍 **Python**: Versatile scripting and data language. FastAPI + Pydantic for typed REST APIs. `asyncio` for async I/O. Great for ML pipelines and automation.",
  microservice: "🔧 **Microservices**: Decompose by bounded context. Each service owns its data store. Use API Gateway for edge routing, service mesh (Istio/Linkerd) for observability.",
  microservices: "🔧 **Microservices**: Patterns include Saga (distributed transactions), CQRS (separate read/write models), Circuit Breaker (resilience), and Sidecar (cross-cutting concerns).",
  agent: "🤖 **Agents**: Autonomous AI systems that perceive, reason, and act. Use a ReAct loop: Reason → Act → Observe. Tools are functions the agent can call (search, code execution, APIs).",
  spring: "🌱 **Spring Boot**: Auto-configuration + dependency injection. Use `@RestController` for APIs, `@Service` for business logic, `@Repository` for data. Actuator for metrics/health.",
  kafka: "📨 **Kafka**: Distributed event log. Producers append events, consumers poll partitions. Use consumer groups for parallel processing. Offsets enable replay and fault tolerance.",
  rest: "🌐 **REST**: Resource-oriented HTTP API design. Use nouns for URLs (`/users/42`), HTTP verbs for actions (GET/POST/PUT/DELETE). Version via headers or URL prefix (`/v1/`).",
  docker: "🐳 **Docker**: Package apps as containers. Use multi-stage builds to shrink image size. Never run as root in production. Use health checks + restart policies.",
  kubernetes: "⚙️ **Kubernetes**: Orchestrates containers across nodes. Key objects: Pod, Deployment, Service, Ingress, ConfigMap, Secret. Use HPA for auto-scaling.",
  grpc: "⚡ **gRPC**: High-performance RPC using Protocol Buffers. Strongly typed contracts. Supports streaming (client, server, bidirectional). Great for inter-service comms.",
  sql: "🗄️ **SQL**: Use indexes wisely — on columns in WHERE/JOIN/ORDER BY. Avoid N+1 queries. Use EXPLAIN to analyse query plans. Transactions ensure ACID guarantees.",
  redis: "⚡ **Redis**: In-memory key-value store. Use for caching, session storage, pub/sub, rate limiting. TTL keys expire automatically. Cluster mode for horizontal scale.",
  default: "📚 Great question! Here are some quick tips:\n\n- **Java**: Use design patterns (Factory, Strategy, Observer).\n- **Go**: Goroutines + channels for concurrency.\n- **Python**: FastAPI for typed async APIs.\n- **Microservices**: Design around bounded contexts.\n- **Agents**: ReAct loop — Reason, Act, Observe.\n\nPick a topic in the sidebar for a deep dive!"
};

function getReply(msg) {
  if (!msg) return KB.default;
  const lower = msg.toLowerCase();
  for (const [key, answer] of Object.entries(KB)) {
    if (key !== "default" && lower.includes(key)) return answer;
  }
  return KB.default;
}

/* ── Routes ─────────────────────────────────────────────────────── */
app.get("/api/agent", (req, res) => {
  const msg = (req.query.msg || "").trim();
  res.json({ reply: getReply(msg), timestamp: new Date().toISOString() });
});

app.post("/api/agent", (req, res) => {
  const msg = (req.body.msg || req.body.message || "").trim();
  res.json({ reply: getReply(msg), timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`🤖 Study Agent server running at http://localhost:${PORT}`);
  console.log(`   GET  /api/agent?msg=java`);
  console.log(`   POST /api/agent  { "msg": "tell me about kafka" }`);
  console.log(`   GET  /health`);
});
