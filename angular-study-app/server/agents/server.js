const express = require("express");
const cors    = require("cors");
const app     = express();
const PORT    = 3001;

app.use(cors());
app.use(express.json());

/* ── Specialist knowledge bases ─────────────────────────── */
const AGENTS = {
  java: {
    name: "Java Agent", emoji: "☕",
    kb: {
      jvm:          "☕ **JVM**: Heap = Eden + S0/S1 + Old Gen + Metaspace. GC algorithms: G1GC (Java 9+ default, region-based), ZGC (sub-ms pauses), Shenandoah. JIT: Tiered compilation C1→C2, inlining, escape analysis, loop unrolling.",
      concurrency:  "☕ **Java Concurrency**: `synchronized` (intrinsic lock) → `ReentrantLock` (tryLock, fair) → `StampedLock` (optimistic reads). Atomic* for lock-free ops. VirtualThreads (Java 21) for I/O-heavy workloads — 10M goroutine-style threads on JVM.",
      spring:       "☕ **Spring Boot**: Auto-configuration via @ConditionalOnClass. Constructor injection (immutable). @Transactional at service layer. Actuator /health for K8s probes. Micrometer for metrics. @Async + @Scheduled for background tasks.",
      stream:       "☕ **Streams**: Source → lazy intermediate ops → terminal op. flatMap flattens. parallel() for CPU-bound large collections only. Collectors.groupingBy for aggregation. Custom Collector via Collector.of().",
      hibernate:    "☕ **Hibernate**: Fix N+1 with JOIN FETCH or @EntityGraph. LAZY for collections, EAGER only for single-valued associations. @Version for optimistic locking. Second-level cache via @Cache + Redis/Ehcache.",
      webflux:      "☕ **WebFlux**: Mono<T> for 0-1, Flux<T> for 0-N. Non-blocking on Netty event loop. flatMap=concurrent unordered, concatMap=sequential ordered. onBackpressureBuffer/Drop for fast producers. Use Schedulers.boundedElastic() for I/O.",
      record:       "☕ **Records (Java 16+)**: Immutable data carriers. Auto-generates constructor, getters, equals/hashCode/toString. Compact constructor for validation. Pattern matching with records (Java 21): `if (shape instanceof Circle(double r)) {...}`",
      virtual:      "☕ **Virtual Threads (Java 21)**: Managed by JVM, not OS. 2KB stack vs 1MB for OS thread. Ideal for blocking I/O at scale. `Executors.newVirtualThreadPerTaskExecutor()`. Pinning: avoid synchronized in virtual thread body (use ReentrantLock).",
      default:      "☕ **Java Agent**: I specialise in JVM internals, Spring ecosystem, concurrency, and performance. Ask me about GC, threads, streams, Spring Boot, JPA, WebFlux, or Java 17-21 features."
    }
  },
  golang: {
    name: "Go Agent", emoji: "🐹",
    kb: {
      goroutine:    "🐹 **Goroutines**: 2KB initial stack (grows to 1GB). GMP scheduler: G=goroutine, M=OS thread, P=processor. GOMAXPROCS=CPU count. M:N threading. Fan-out: distribute work across worker goroutines reading from shared channel. Use errgroup for error propagation.",
      channel:      "🐹 **Channels**: Unbuffered=synchronous rendezvous. Buffered=async up to capacity. `range chan` reads until close(). `select` multiplexes with optional `default` (non-blocking). Use `done` channel for cancellation: `case <-done: return`.",
      interface:    "🐹 **Interfaces**: Satisfied implicitly (duck typing). Compose interfaces: `ReadWriter interface { Reader; Writer }`. Prefer small interfaces (1-2 methods). Empty interface `any` accepts everything. Type switch for runtime dispatch.",
      error:        "🐹 **Errors**: Always return `error` as last return value. Wrap with `fmt.Errorf('context: %w', err)`. Check with `errors.Is` (handles wrapping). Unwrap to type with `errors.As`. Sentinel errors: `var ErrNotFound = errors.New('not found')`.",
      context:      "🐹 **Context**: Always first param. Never store in struct. `context.WithCancel` for manual cancel. `context.WithTimeout` for deadline. `ctx.Done()` channel closes on cancel/timeout. `ctx.Value(key)` for request-scoped data (use sparingly).",
      generic:      "🐹 **Generics (Go 1.18+)**: Type parameters: `func Map[T, U any](s []T, f func(T) U) []U`. Type constraints: `type Number interface { int | int64 | float64 }`. Generic data structures: `type Stack[T any] struct{ items []T }`.",
      performance:  "🐹 **Performance**: Use `go test -bench -benchmem` for benchmarks. `pprof` for CPU/memory profiling. Pre-allocate slices: `make([]T, 0, cap)`. `sync.Pool` for reusable buffers. Escape analysis: `go build -gcflags='-m'`. Avoid interface boxing in hot loops.",
      default:      "🐹 **Go Agent**: I specialise in Go concurrency, interfaces, error handling, and high-performance service patterns. Ask me about goroutines, channels, context, generics, gRPC, or profiling."
    }
  },
  microservices: {
    name: "Microservices Agent", emoji: "🔧",
    kb: {
      kafka:        "🔧 **Kafka**: Distributed commit log. Partitions=parallelism ceiling per consumer group. ISR=in-sync replicas; acks=all waits for all ISR. Exactly-once: idempotent producer + transactional consumer. Compaction keeps latest value per key.",
      saga:         "🔧 **Saga**: Choreography (event-driven, decoupled, hard to track) vs Orchestration (central coordinator, visible, easier to reason). Each step must be idempotent. Compensating transactions undo previous steps. Persist saga state for crash recovery.",
      circuit:      "🔧 **Circuit Breaker**: CLOSED→OPEN (50% failure in 10s)→HALF_OPEN (probe 3 calls)→CLOSED. In OPEN: fail fast with fallback (<1ms). Bulkhead: isolate thread pools per downstream. Retry only idempotent ops, with exponential backoff + jitter.",
      gateway:      "🔧 **API Gateway**: Single entry point. Responsibilities: TLS termination, JWT validation, rate limiting (Redis token bucket), routing, request transformation, observability. BFF pattern: purpose-built gateway per client type.",
      grpc:         "🔧 **gRPC**: HTTP/2 + Protobuf. 5-10× smaller payload vs JSON. 4 modes: unary, server-stream, client-stream, bidirectional. Interceptors for auth/logging. Problem: single HTTP/2 connection per client → L4 LB won't distribute. Use Envoy or client-side LB.",
      cqrs:         "🔧 **CQRS**: Commands→Aggregates→Events→Event Store. Read side: Projections build denormalised read models from events. Write side: strongly consistent. Read side: eventually consistent. Snapshot: persist aggregate state every N events.",
      mesh:         "🔧 **Service Mesh**: Sidecar proxies (Envoy) handle: mTLS, distributed tracing, retries, timeouts, traffic shaping. Control plane (Istiod) pushes config via xDS. Zero-trust: every call authenticated. Use for 20+ services or strict compliance needs.",
      default:      "🔧 **Microservices Agent**: I specialise in distributed systems, event-driven architecture, and resilience patterns. Ask me about Kafka, Saga, circuit breaker, CQRS, service mesh, or API Gateway."
    }
  },
  sysdesign: {
    name: "System Design Agent", emoji: "⬡",
    kb: {
      url:          "⬡ **URL Shortener**: 100M creates/day, 10B redirects/day. Snowflake ID → base62 encode → 7 chars. DynamoDB (native TTL). Redis cache for redirects (80% HIT). CDN caches 302 responses. Analytics: async Kafka → ClickHouse. Anti-abuse: bloom filter + domain blocklist.",
      feed:         "⬡ **Social Feed**: Fanout-on-write (push, O(1) read, celebrity problem) vs fanout-on-read (pull, O(1) write, slow reads). Twitter hybrid: fanout-on-write for <1M followers; fanout-on-read for celebrities. Redis sorted set per user, score=timestamp+engagement.",
      rate:         "⬡ **Rate Limiter**: Token bucket (allows burst, smooth avg). Sliding window counter (accurate, Cloudflare: prev×overlap + current). Distributed: Redis Lua atomic script. Headers: X-RateLimit-Limit/Remaining/Reset. Fail open on Redis outage for availability.",
      hash:         "⬡ **Consistent Hashing**: Hash ring [0, 2^32). Key → clockwise to nearest server. On add: only K/N keys remap vs ~100% with mod-N. Virtual nodes (150/server): even distribution, weighted assignment. Used by: Cassandra, DynamoDB, Redis Cluster.",
      cap:          "⬡ **CAP**: Partitions happen → CP (consistency, may reject) or AP (availability, may be stale). PACELC: latency-consistency trade-off even without partitions. Strong→Linearisable (etcd, Spanner). Weak→Eventual (Cassandra, DynamoDB default).",
      sharding:     "⬡ **Sharding**: Range (hot spots), Hash-mod (resharding pain), Consistent hash (minimal remapping), Directory (flexible, SPOF lookup). Snowflake IDs avoid cross-shard ID collision. Cross-shard JOINs → denormalise. Vitess/Citus for online resharding.",
      video:        "⬡ **Video Platform**: Chunked upload → S3 → FFmpeg transcode (6 resolutions, 4s segments) → HLS/DASH manifest → CDN. ABR: player measures bandwidth, switches quality per segment. Netflix Open Connect: appliances in ISP racks, zero transit cost.",
      ride:         "⬡ **Ride Sharing**: Redis GEORADIUS for nearby driver search. Driver location → GEOADD every 4s. Matching: ZREM driver from pool (atomic), send offer, 10s timeout, next candidate on decline. Surge pricing: H3 hexagonal grid, demand/supply ratio per cell.",
      default:      "⬡ **System Design Agent**: I specialise in HLD/LLD, scalability patterns, and case studies. Ask me about URL shortener, social feed, video platform, ride sharing, rate limiter, consistent hashing, CAP theorem, or any system design problem."
    }
  },
  design: {
    name: "Design Agent", emoji: "🎨",
    kb: {
      default: `🎨 **Design Agent**: I generate topic templates, flow diagrams, architecture maps, and UML sequences.

**Commands:**
• "Generate flow for [concept]" → animated step-by-step flow data
• "Generate architecture for [concept]" → multi-lane architecture map data
• "Generate topic template for [concept]" → complete topic object
• "Generate UML for [concept]" → actor-message sequence data

All output is valid JS you can paste directly into a topics/*.js file!`
    }
  },
  orchestrator: {
    name: "Orchestrator", emoji: "🧠",
    kb: {
      default: "🧠 **Orchestrator**: I route your questions to the right specialist. Type any question and I'll dispatch it to Java ☕, Go 🐹, Microservices 🔧, System Design ⬡, or Design 🎨 agents automatically!"
    }
  }
};

/* ── Routing ──────────────────────────────────────────────── */
const ROUTING = [
  { agent: "java",         re: /java|jvm|spring|hibernate|jpa|stream|webflux|virtual.?thread|goroutine(?!.*(go|golang))|gc|garbage|tomcat|bytecode|graalvm|record|sealed/ },
  { agent: "golang",       re: /\bgo\b|golang|goroutine|channel|defer|panic|recover|gorm|gin\b|echo\b|fiber|pprof|errgroup/ },
  { agent: "microservices",re: /microservice|kafka|rabbitmq|saga|circuit.?breaker|service.?mesh|istio|envoy|consul|eureka|cqrs|event.?sourc|outbox|sidecar|api.?gateway|kong/ },
  { agent: "sysdesign",    re: /system.?design|cap.?theorem|consistent.?hash|rate.?limit|load.?balanc|sharding|replication|cdn|dns|caching|dynamo|cassandra|url.?short|social.?feed|video.?platform|ride.?shar|lld|hld|consistent|bloom/ },
  { agent: "design",       re: /generate|scaffold|template|flow.?diagram|arch.*diagram|uml/ }
];

function route(msg) {
  const lower = msg.toLowerCase();
  for (const r of ROUTING) if (r.re.test(lower)) return r.agent;
  return "orchestrator";
}

function getReply(agentId, msg) {
  const lower = msg.toLowerCase();
  const agent = AGENTS[agentId] || AGENTS.orchestrator;
  const kb = agent.kb;

  // Find best matching key in KB
  for (const [key, answer] of Object.entries(kb)) {
    if (key !== "default" && lower.includes(key)) return answer;
  }

  // Secondary keyword scan
  const secondaryMap = {
    java: { virtual:/virtual.?thread|loom/, record:/\brecord\b/, stream:/stream|lambda|functional/, concurrency:/concurren|thread|synchronized|atomic/, hibernate:/hibernate|jpa|n\+1/, webflux:/webflux|reactor|mono|flux/, spring:/spring/ },
    golang: { goroutine:/goroutine|concurren/, channel:/channel|select/, generic:/generic|type.?param/, context:/context/, performance:/pprof|bench|optimi/, interface:/interface/, error:/error/ },
    microservices: { kafka:/kafka/, saga:/saga|distributed.?tx/, circuit:/circuit|resilience/, gateway:/gateway/, grpc:/grpc/, cqrs:/cqrs|event.?sourc/, mesh:/mesh|istio|sidecar/ },
    sysdesign: { url:/url.?short|tinyurl/, feed:/social.?feed|twitter|fanout/, rate:/rate.?limit/, hash:/consistent.?hash|hash.?ring/, cap:/cap.?theorem|consistency/, sharding:/shard|partition/, video:/video|netflix|youtube/, ride:/ride.?shar|uber/ }
  };
  const secondary = secondaryMap[agentId] || {};
  for (const [key, pattern] of Object.entries(secondary)) {
    if (pattern.test(lower) && kb[key]) return kb[key];
  }

  return kb.default;
}

/* ── Routes ──────────────────────────────────────────────── */
app.get("/api/agent", (req, res) => {
  const msg = (req.query.msg || "").trim();
  const requestedAgent = req.query.agent || "auto";
  const agentId = requestedAgent === "auto" || requestedAgent === "orchestrator"
    ? route(msg) : requestedAgent;
  const agent = AGENTS[agentId] || AGENTS.orchestrator;
  res.json({
    reply: getReply(agentId, msg),
    agent: agentId,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/agent", (req, res) => {
  const msg = (req.body.msg || req.body.message || "").trim();
  const requestedAgent = req.body.agent || "auto";
  const agentId = requestedAgent === "auto" || requestedAgent === "orchestrator"
    ? route(msg) : requestedAgent;
  const agent = AGENTS[agentId] || AGENTS.orchestrator;
  res.json({
    reply: getReply(agentId, msg),
    agent: agentId,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    timestamp: new Date().toISOString()
  });
});

// Per-agent routes
Object.keys(AGENTS).forEach(agentId => {
  app.get(`/api/${agentId}`, (req, res) => {
    const msg = (req.query.msg || "").trim();
    res.json({ reply: getReply(agentId, msg), agent: agentId, timestamp: new Date().toISOString() });
  });
});

app.get("/api/skills", (req, res) => {
  res.json({ message: "Skills are served client-side from skills-registry.js", timestamp: new Date().toISOString() });
});

app.get("/health", (_req, res) => res.json({ status: "ok", agents: Object.keys(AGENTS) }));

function startServer(port) {
  const server = app.listen(port)
    .on('listening', () => {
      console.log(`\n🧠 Multi-Agent Study Server at http://localhost:${port}`);
      console.log(`   Agents: ${Object.keys(AGENTS).join(", ")}`);
      console.log(`   GET /api/agent?msg=kafka&agent=microservices`);
      console.log(`   GET /api/java?msg=concurrency`);
      console.log(`   GET /api/golang?msg=goroutines`);
      console.log(`   GET /api/sysdesign?msg=rate+limiter`);
      console.log(`   GET /health\n`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️  Port ${port} in use — trying ${port + 1}`);
        startServer(port + 1);
      } else {
        throw err;
      }
    });

  ['SIGTERM', 'SIGINT'].forEach(sig =>
    process.on(sig, () => { server.close(); process.exit(0); }));
}

startServer(PORT);
