/* ===== Java curriculum — mentor-grade, topic-wise ===== */
window.JAVA_TOPICS = [
  {
    id: "java-jvm-memory-gc",
    area: "java",
    title: "JVM Memory Model & Garbage Collection",
    tag: "JVM",
    tags: ["jvm", "gc", "g1", "zgc", "memory"],
    concept:
`The JVM splits memory into **Heap** (Young = Eden + S0/S1, Old/Tenured), **Metaspace** (class metadata, native), **Stack** (per-thread frames), **PC register**, and **Native method stack**. Allocations land in Eden; surviving objects age through survivor spaces, then promote to Old.
Modern collectors:
- **G1** — region-based, predictable pause-time goal, default since Java 9.
- **ZGC** — sub-millisecond pauses, colored pointers, scales to multi-TB heaps. Production-ready since Java 15.
- **Shenandoah** — concurrent compaction, Red Hat.
- **Generational ZGC** (Java 21) combines young/old generations with ZGC's concurrency.`,
    why:
`Heap layout and GC choice directly drive **p99 latency** and **throughput**. Misconfigured heaps cause stop-the-world pauses that break SLOs in trading, ads, and chat systems. At scale (\`> 32 GB heap\`), CompressedOops boundary and GC algorithm choice change throughput by 20–40%.`,
    example: {
      language: "java",
      code:
`// JVM flags worth memorising for an interview
// java -Xms4g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \\
//      -XX:+UnlockExperimentalVMOptions -XX:+UseZGC \\
//      -Xlog:gc*,gc+heap=debug:file=gc.log:time,uptime,level,tags

import java.lang.management.*;
import java.util.*;

public class HeapInspector {
    public static void main(String[] args) {
        MemoryMXBean mem = ManagementFactory.getMemoryMXBean();
        System.out.println("Heap     : " + mem.getHeapMemoryUsage());
        System.out.println("NonHeap  : " + mem.getNonHeapMemoryUsage());

        for (MemoryPoolMXBean p : ManagementFactory.getMemoryPoolMXBeans()) {
            System.out.printf("%-24s %-10s %s%n", p.getName(), p.getType(), p.getUsage());
        }
        // Force allocation to watch Eden fill
        List<byte[]> hold = new ArrayList<>();
        for (int i = 0; i < 50; i++) hold.add(new byte[1 << 20]); // 1 MB blocks
    }
}`,
      notes:
`Edge cases: humongous allocations (> 50% of G1 region) skip Eden and go straight to Old; large arrays cause fragmentation. Always pin \`-Xms = -Xmx\` in containers to avoid resize stalls.`
    },
    interview: [
      {
        question: "When would you pick ZGC over G1?",
        answer:
`Pick **ZGC** when p99/p999 latency matters more than peak throughput and the heap is large (> 16 GB). ZGC keeps pause times sub-ms even at 16 TB. **G1** is the safer default for typical 4–32 GB services where 100–200 ms pauses are acceptable and throughput matters.`,
        followUps: ["What are colored pointers?", "Cost of ZGC's load barriers?", "Why is generational ZGC faster?"]
      },
      {
        question: "How do you debug a memory leak in production?",
        answer:
`1. Capture a heap dump with \`jcmd <pid> GC.heap_dump\` or \`-XX:+HeapDumpOnOutOfMemoryError\`. 2. Open in **Eclipse MAT** or **VisualVM**; look at dominator tree. 3. Inspect retained-size sorted by class. 4. Common culprits: unbounded caches, \`ThreadLocal\` leaks in pooled threads, JDBC \`PreparedStatement\` not closed, listeners not unregistered.`,
        followUps: ["What is a leak suspect in MAT?", "Why do ThreadLocals leak in Tomcat?"]
      },
      {
        question: "What is a 'humongous' allocation?",
        answer:
`In G1, any object larger than half of a region (regions are 1–32 MB) is allocated directly in contiguous old-gen regions. Many humongous allocations fragment the heap and force full GC. Detect with \`-Xlog:gc+heap=debug\`.`,
        followUps: ["How to tune region size?", "G1 vs Parallel for batch jobs?"]
      }
    ],
    tradeoffs: {
      pros: [
        "GC tuning is observable — every collector emits structured logs.",
        "ZGC/Shenandoah remove pause as a tuning lever for low-latency systems.",
        "JIT + escape analysis often outperform hand-written C for hot paths."
      ],
      cons: [
        "Each collector adds CPU/throughput overhead (~10–15% for ZGC).",
        "Memory overhead: G1 keeps remembered sets; ZGC reserves 2.5× virtual address space.",
        "Tuning is heap-shape specific — copy-paste flags rarely transfer."
      ],
      when:
`**G1** for general services. **ZGC** for low-latency, large-heap workloads. **Parallel GC** for short batch jobs where throughput trumps pause. **Serial GC** only for tiny CLI tools.`
    },
    flow: {
      title: "JVM Execution Pipeline — Source to GC",
      caption: "Every major JVM phase from .java file to garbage collection cycle.",
      nodes: [
        { id: "src",      label: ".java Source",       hint: "Human-readable Java source code" },
        { id: "javac",    label: "javac Compiler",     hint: "Compiles to platform-neutral bytecode" },
        { id: "cls",      label: ".class Bytecode",    hint: "JVM stack-machine ISA, not native code" },
        { id: "loader",   label: "ClassLoader",        hint: "Bootstrap → Extension → App (delegation model)" },
        { id: "verify",   label: "Bytecode Verifier",  hint: "Type safety, stack depth, branch targets checked" },
        { id: "meta",     label: "Metaspace",          hint: "Class metadata, method bytecode, interned strings (off-heap)" },
        { id: "interp",   label: "Interpreter (T0)",   hint: "Executes bytecode line-by-line — fast start, slow peak" },
        { id: "jit",      label: "JIT C1→C2 (T1–T4)", hint: "HotSpot tiered: profiling → full optimize + inlining" },
        { id: "eden",     label: "Eden / Young Gen",   hint: "New objects land here via TLAB bump-pointer (≈5 ns)" },
        { id: "survivor", label: "Survivor S0 ↔ S1",  hint: "Live objects copied here after each Minor GC" },
        { id: "old",      label: "Old Gen (Tenured)",  hint: "Long-lived objects promoted after age threshold" },
        { id: "gc",       label: "G1 / ZGC",           hint: "Concurrent marking + region-based compaction" }
      ],
      steps: [
        { path: ["src","javac"],       label: "1 · Compile",                detail: "javac parses, type-checks, and emits .class bytecode. No native code yet — bytecode targets a portable stack-machine ISA." },
        { path: ["javac","cls"],       label: "2 · .class emitted",         detail: ".class contains constant pool, method bytecodes, and attribute tables. Inspect with javap -c to see raw instructions." },
        { path: ["cls","loader"],      label: "3 · Class Loading",          detail: "ClassLoader reads .class bytes. Bootstrap loads JDK; AppClassLoader loads your JARs. Parent-delegation prevents shadowing core classes." },
        { path: ["loader","verify"],   label: "4 · Bytecode Verification",  detail: "Verifier rejects malformed code: wrong operand types, stack overflow, illegal field access. Runs once at load — safe to skip trusted code with -Xverify:none." },
        { path: ["loader","meta"],     label: "5 · Link → Metaspace",       detail: "Prepare (allocate static fields), Resolve (symbolic refs → direct memory refs), Initialize (run static {}). Class metadata stored in native Metaspace — not on heap." },
        { path: ["verify","interp"],   label: "6 · Interpret (Tier 0)",     detail: "Methods start interpreted. JVM counts invocations + back-edges. Quick startup; peak throughput ~10–50× slower than compiled native code." },
        { path: ["interp","jit"],      label: "7 · JIT Tier 1–4",           detail: "≥1 000 calls → C1 compile (fast, profiled). ≥10 000 calls → C2 full optimize: method inlining, loop unrolling, escape analysis, lock elision." },
        { path: ["jit","eden"],        label: "8 · Allocate in Eden (TLAB)", detail: "new Obj() bumps a thread-local pointer — no CAS, no lock. Each thread owns a Thread-Local Allocation Buffer (TLAB). Cost ≈5 ns." },
        { path: ["eden","survivor"],   label: "9 · Minor GC — copy live",   detail: "Eden full → safepoint → GC roots traced. Live objects copied to Survivor (S0↔S1 swap). Dead objects freed in bulk. Pause: 1–10 ms." },
        { path: ["survivor","old"],    label: "10 · Promote to Old Gen",    detail: "Objects surviving 15 minor GCs promoted to Old Gen. Large (humongous) objects skip Young Gen and land directly in Old Gen regions." },
        { path: ["old","gc"],          label: "11 · Major / Mixed GC",      detail: "G1: concurrent mark → mixed collection of highest-garbage Old regions. ZGC: fully concurrent, pause < 1 ms even at 16 TB heap using colored pointers + load barriers." },
        { path: ["gc","eden"],         label: "12 · Heap reclaimed — cycle", detail: "Freed Eden ready for new allocations. Metaspace only collected when ClassLoaders are unloaded. Cycle repeats continuously for JVM lifetime." }
      ]
    },
    uml: {
      title: "Object Lifecycle — Thread to GC",
      scenario: "Creating, aging, and garbage-collecting a single object",
      actors: [
        { id: "thread",  label: "App Thread" },
        { id: "jit",     label: "JIT / Escape" },
        { id: "eden",    label: "Eden (TLAB)" },
        { id: "minor",   label: "Minor GC" },
        { id: "old",     label: "Old Gen" },
        { id: "major",   label: "Major GC (G1/ZGC)" }
      ],
      messages: [
        { from:"thread", to:"jit",   label:"new Obj() — escape analysis",    detail:"JIT checks if Obj escapes the current method. If not, stack-allocate: zero GC pressure. Escape analysis fires at C2 tier.", type:"sync" },
        { from:"jit",    to:"eden",  label:"Obj escapes → allocate in TLAB", detail:"TLAB bump-pointer: ptr += objSize. No CAS, no lock. Object header = mark word (hash/lock/age) + klass pointer. Cost ≈5 ns.", type:"sync" },
        { from:"eden",   to:"thread",label:"Reference returned",             detail:"Caller receives reference to heap object. Object is reachable via stack frame GC root.", type:"sync" },
        { from:"thread", to:"eden",  label:"Eden fills (many allocations)",  detail:"TLAB refills until Eden exhausted. JVM requests a safepoint — all threads stop at next safe point.", type:"async" },
        { from:"eden",   to:"minor", label:"Safepoint → Minor GC triggered", detail:"GC roots traced: stack frames, static refs, JNI handles. Reachable objects found via breadth-first mark.", type:"sync" },
        { from:"minor",  to:"eden",  label:"Dead objects reclaimed",         detail:"Unreachable objects simply abandoned. Eden reset in bulk — no per-object free(). Pause typically 1–5 ms.", type:"sync" },
        { from:"minor",  to:"old",   label:"Promote: age ≥ 15 (or oversized)",detail:"Surviving object copied to Old Gen region. Card table updated; Remembered Set tracks cross-generational references.", type:"sync" },
        { from:"old",    to:"major", label:"Old occupancy > IHOP threshold", detail:"G1 starts concurrent marking when Old Gen > 45% full (InitiatingHeapOccupancyPercent). ZGC marks continuously in background.", type:"async" },
        { from:"major",  to:"old",   label:"Concurrent mark + compact",      detail:"G1: identify garbage-heavy regions → mixed collection. ZGC: relocate objects concurrently using load barriers to remap stale pointers.", type:"sync" },
        { from:"major",  to:"thread",label:"GC complete — threads resume",   detail:"Safepoint released. Heap utilization drops. Metaspace freed only on ClassLoader unload. Application continues.", type:"sync" }
      ]
    }
  },

  {
    id: "java-concurrency",
    area: "java",
    title: "Concurrency: Threads, Executors, Virtual Threads",
    tag: "Concurrency",
    tags: ["threads", "executor", "loom", "virtual threads", "concurrency"],
    concept:
`Three layers:
1. **\`Thread\`** — OS thread, ~1 MB stack, expensive context-switch.
2. **\`ExecutorService\`** + pools — reuse OS threads. Backed by a queue. Variants: fixed, cached, scheduled, work-stealing (\`ForkJoinPool\`).
3. **Virtual threads (Project Loom, Java 21 GA)** — JVM-scheduled, mounted on carrier threads. Millions per JVM. Blocking I/O parks them cheaply.

Memory model: **JMM** defines happens-before via \`volatile\`, \`synchronized\`, \`Lock\`, \`final\`. \`VarHandle\` and \`StampedLock\` provide finer control. \`CompletableFuture\` composes async chains.`,
    why:
`Virtual threads collapse the **thread-per-request vs reactive** debate. You write straight-line blocking code; the JVM gives you reactive-grade scalability. For backend services, this changes pool sizing, connection limits, and observability assumptions.`,
    example: {
      language: "java",
      code:
`import java.net.http.*;
import java.util.concurrent.*;
import java.util.*;
import java.util.stream.*;

public class VirtualThreadsDemo {
    public static void main(String[] args) throws Exception {
        var client = HttpClient.newHttpClient();

        // Pre-Loom: thread-per-request, capped by pool
        // var executor = Executors.newFixedThreadPool(200);

        // Loom: each request gets its own virtual thread (millions cheap)
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<String>> futures = IntStream.range(0, 10_000)
                .mapToObj(i -> executor.submit(() -> {
                    var req = HttpRequest.newBuilder()
                        .uri(java.net.URI.create("https://httpbin.org/anything/" + i))
                        .build();
                    return client.send(req, HttpResponse.BodyHandlers.ofString()).body();
                }))
                .toList();

            for (var f : futures) f.get();   // blocking ok — vthreads unmount on park
        }
    }
}`,
      notes:
`Edge cases: pinned threads (\`synchronized\` blocks + blocking I/O) prevent unmount — refactor to \`ReentrantLock\`. Don't pool virtual threads; they're cheap to create.`
    },
    interview: [
      {
        question: "Difference between virtual threads and reactive (WebFlux)?",
        answer:
`Both achieve high concurrency with few OS threads. **Virtual threads** keep the **imperative blocking** programming model — easier debugging, stack traces are linear, \`ThreadLocal\` works. **Reactive** uses async non-blocking APIs everywhere; backpressure is first-class but cognitive load is higher. For most apps in 2025, **virtual threads** are the better default.`,
        followUps: ["What is thread pinning?", "Can I use ThreadLocal with virtual threads?", "How does backpressure work with vthreads?"]
      },
      {
        question: "How do you size a thread pool?",
        answer:
`Little's Law: \`N = QPS × Latency\`. Then **\`threads ≈ N / (1 - blocking_fraction)\`**. For CPU-bound: \`#cores + 1\`. For I/O-bound: much higher, often empirical. With **virtual threads**, sizing the pool becomes irrelevant; size the **downstream resource** (DB connections, HTTP semaphores) instead.`,
        followUps: ["What is the bulkhead pattern?", "How do you detect pool starvation?"]
      },
      {
        question: "Explain happens-before with a code example.",
        answer:
`\`volatile\` writes happen-before subsequent reads on **any thread**. Without it, the JIT can reorder or cache the value in a register. \`synchronized\` / \`Lock\` extends happens-before to all memory writes inside the block. \`final\` fields are safely published if the constructor doesn't leak \`this\`.`,
        followUps: ["What is false sharing?", "Why is double-checked locking broken without volatile?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Virtual threads remove the need for reactive complexity.",
        "ExecutorService gives clean lifecycle + backpressure via bounded queue.",
        "CompletableFuture composes async pipelines without callback hell."
      ],
      cons: [
        "ThreadLocal abuse leaks in pooled environments.",
        "Pinned virtual threads silently degrade to platform-thread cost.",
        "Lock-free code (VarHandle, Atomic) is hard to get right under JMM."
      ],
      when:
`**Default: virtual threads + structured concurrency.** Use \`ForkJoinPool\` only for CPU-bound recursive work. Avoid \`Thread\` directly outside frameworks.`
    }
  },

  {
    id: "java-streams",
    area: "java",
    title: "Streams API, Collectors & Lazy Evaluation",
    tag: "Streams",
    tags: ["streams", "collectors", "lambda", "functional"],
    concept:
`A **Stream** is a lazy, pull-based pipeline of operations over a Spliterator source.
- **Intermediate ops** (\`filter\`, \`map\`, \`flatMap\`) are lazy; nothing runs until a **terminal op** (\`collect\`, \`reduce\`, \`forEach\`).
- **Stateless** ops fuse and parallelise well; **stateful** ops (\`sorted\`, \`distinct\`) buffer.
- \`parallelStream()\` uses common \`ForkJoinPool\`; tune with \`-Djava.util.concurrent.ForkJoinPool.common.parallelism\`.`,
    why:
`Declarative pipelines reduce bug surface vs hand-written loops, but **\`parallelStream\`** is a footgun on shared pools (one slow task blocks every consumer). In data pipelines, \`Collectors.groupingBy\` + \`mapping\` replaces 30 lines of imperative aggregation.`,
    example: {
      language: "java",
      code:
`import java.util.*;
import java.util.stream.*;
import static java.util.stream.Collectors.*;

record Order(String userId, String product, int qty, double price) {}

public class StreamsDemo {
    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("u1", "A", 2, 10),
            new Order("u1", "B", 1, 50),
            new Order("u2", "A", 5, 10),
            new Order("u3", "C", 3, 20)
        );

        // Revenue per user, sorted desc
        Map<String, Double> revenue = orders.stream()
            .collect(groupingBy(Order::userId,
                summingDouble(o -> o.qty() * o.price())));

        revenue.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .forEach(e -> System.out.println(e.getKey() + " = $" + e.getValue()));

        // Top-K by spend using teeing (Java 12+)
        var stats = orders.stream().collect(teeing(
            summingDouble(o -> o.qty() * o.price()),
            counting(),
            (sum, count) -> Map.of("total", sum, "count", (double) count)
        ));
        System.out.println(stats);
    }
}`,
      notes: `Avoid \`parallelStream\` for short pipelines or when tasks share I/O. Use \`Collectors.toUnmodifiableMap\` for immutable results.`
    },
    interview: [
      {
        question: "When NOT to use parallel streams?",
        answer:
`Three red flags: (a) tasks share a downstream resource (DB, HTTP), causing pool starvation since the common FJP is global; (b) the pipeline is short (< 10k elements) — splitting overhead dominates; (c) ordering matters (\`findFirst\` semantics differ from \`findAny\`).`,
        followUps: ["What is split-on-Spliterator cost?", "Custom ForkJoinPool?"]
      },
      {
        question: "Difference between map and flatMap?",
        answer:
`\`map\` is 1→1, returns \`Stream<R>\`. \`flatMap\` is 1→N, returns \`Stream<R>\` by flattening \`Stream<Stream<R>>\`. Use \`flatMap\` to expand collections, parse multi-line input, or chain optional/empty results.`,
        followUps: ["flatMap with Optional?", "Lazy flatMap and short-circuit ops?"]
      }
    ],
    tradeoffs: {
      pros: ["Declarative, composable.", "Stream fusion avoids intermediate collections.", "Collectors framework covers 90% of aggregation needs."],
      cons: ["Debugging stack traces are opaque.", "Parallel streams share the global FJP.", "Stateful ops break lazy fusion."],
      when: `Default to **sequential streams**. Drop to **for-loops** when you need early-exit complex state. Use **parallelStream** only for CPU-bound, large, side-effect-free pipelines on dedicated pools.`
    }
  },

  {
    id: "java-spring-boot",
    area: "java",
    title: "Spring Boot: Auto-configuration, DI, Starters",
    tag: "Spring",
    tags: ["spring", "boot", "di", "ioc", "autoconfig"],
    concept:
`Spring Boot is **Spring + opinionated auto-configuration**. Core building blocks:
- **IoC container** — \`ApplicationContext\` manages bean lifecycle.
- **DI** — constructor injection (recommended), field/setter injection (legacy).
- **Auto-configuration** — \`@EnableAutoConfiguration\` walks \`META-INF/spring.factories\` (now \`AutoConfiguration.imports\`) and conditionally registers beans via \`@ConditionalOnClass\`, \`@ConditionalOnMissingBean\`.
- **Starters** — curated dependency POMs (\`spring-boot-starter-web\`, \`-data-jpa\`, \`-actuator\`).`,
    why:
`Auto-config is **decision compression** — sensible defaults that work in 80% of cases. But it hides what's running. In senior interviews, you must be able to trace a \`/actuator/conditions\` report and explain why a bean was picked. Bean scope (\`singleton\`, \`prototype\`, \`request\`) drives memory and thread-safety semantics.`,
    example: {
      language: "java",
      code:
`// Constructor injection — preferred, immutable, testable
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;

    OrderController(OrderService service) { this.service = service; }

    @GetMapping("/{id}")
    Order get(@PathVariable String id) { return service.find(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Order create(@Valid @RequestBody CreateOrder req) { return service.create(req); }
}

@Service
@Transactional
class OrderService {
    private final OrderRepository repo;
    private final MeterRegistry metrics;

    OrderService(OrderRepository repo, MeterRegistry metrics) {
        this.repo = repo;
        this.metrics = metrics;
    }

    Order create(CreateOrder req) {
        var saved = repo.save(new Order(req));
        metrics.counter("orders.created", "tenant", req.tenant()).increment();
        return saved;
    }

    Order find(String id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException(id));
    }
}

// Conditional bean — only activates when property is set
@Configuration
@ConditionalOnProperty(prefix = "feature.audit", name = "enabled", havingValue = "true")
class AuditConfig {
    @Bean AuditPublisher publisher(KafkaTemplate<String, Audit> kafka) {
        return new AuditPublisher(kafka, "orders.audit");
    }
}`
    },
    interview: [
      {
        question: "Constructor vs field injection?",
        answer:
`**Constructor injection** wins: dependencies are explicit, fields can be \`final\`, the bean is fully constructed before use, and unit tests need no Spring context. Field injection hides cycles and forces reflection in tests. Use setter injection only for optional dependencies.`,
        followUps: ["What is circular dependency? How does Spring resolve it?", "Why is field injection an antipattern?"]
      },
      {
        question: "How does auto-configuration know what to load?",
        answer:
`At startup, Spring reads \`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\` from every JAR. Each entry is conditionally evaluated via \`@ConditionalOnClass\`, \`@ConditionalOnMissingBean\`, etc. \`/actuator/conditions\` shows what matched and why.`,
        followUps: ["How do you write a custom starter?", "How does spring.factories migration work?"]
      },
      {
        question: "Bean scopes — what breaks with prototype inside singleton?",
        answer:
`A singleton holds the prototype instance forever — defeating the scope. Fix with \`@Lookup\` method injection, \`ObjectProvider<T>\`, or scoped proxies (\`@Scope(proxyMode = TARGET_CLASS)\`).`,
        followUps: ["Request vs session scope?", "Web async + scoped beans?"]
      }
    ],
    tradeoffs: {
      pros: ["Boilerplate gone.", "Strong ecosystem (Data, Security, Cloud).", "Production-ready actuators + observability."],
      cons: ["Magic by default — debugging hidden bean wiring is hard.", "Startup time grows with classpath.", "Reflection-heavy → bigger JIT warm-up + GraalVM friction."],
      when: `**Default for enterprise Java services.** For startup-sensitive workloads (lambdas, edge), evaluate **Quarkus** or **Micronaut** with build-time DI + GraalVM native image.`
    }
  },

  {
    id: "java-spring-data-jpa",
    area: "java",
    title: "Spring Data JPA & Hibernate Internals",
    tag: "JPA",
    tags: ["jpa", "hibernate", "n+1", "transactions"],
    concept:
`JPA = spec, Hibernate = implementation. Key abstractions:
- **\`EntityManager\`** — persistence context, first-level cache.
- **Entity states**: transient → managed → detached → removed.
- **Repositories** — \`JpaRepository<T, ID>\` provides CRUD + paging. Custom queries via method names, \`@Query\`, or Criteria API.
- **Fetching**: \`LAZY\` (default for \`@ToMany\`) vs \`EAGER\` (default for \`@ToOne\`).
- **Transactions**: \`@Transactional\` proxies via AOP; propagation modes (REQUIRED, REQUIRES_NEW, NESTED).`,
    why:
`**N+1 selects** is the single most common production performance bug. JPA's dirty-checking on commit is invisible in code review — you can save a bug just by reading an entity. Connection pool exhaustion and long-running transactions are the second-biggest outage class.`,
    example: {
      language: "java",
      code:
`@Entity @Table(name = "orders")
class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderLine> lines = new ArrayList<>();

    @Version int version;          // optimistic lock
    @CreationTimestamp Instant createdAt;
}

interface OrderRepository extends JpaRepository<Order, Long> {

    // BAD: triggers N+1 on lines
    List<Order> findByUserId(Long userId);

    // GOOD: JOIN FETCH avoids N+1
    @Query("""
        select distinct o from Order o
        left join fetch o.lines
        where o.user.id = :userId
    """)
    List<Order> findWithLinesByUserId(@Param("userId") Long userId);

    // BETTER for large result sets: entity graph + pagination
    @EntityGraph(attributePaths = {"lines"})
    Page<Order> findAllByUserId(Long userId, Pageable page);
}

@Service
class OrderQuery {
    @Transactional(readOnly = true)  // hibernate skips dirty-checking
    List<OrderDto> recent(Long userId) {
        return repo.findWithLinesByUserId(userId).stream()
            .map(OrderDto::from)
            .toList();
    }
}`,
      notes: `Always use **DTO projections** for read paths — entities pull the world. Mark read-only transactions explicitly.`
    },
    interview: [
      {
        question: "What is the N+1 select problem? How do you fix it?",
        answer:
`Iterating a lazy collection issues one query per parent. **Fix options**: (1) \`JOIN FETCH\` in JPQL, (2) \`@EntityGraph\` on the repository method, (3) batch fetching via \`@BatchSize\`/\`hibernate.default_batch_fetch_size\`, (4) DTO projection skipping entities entirely.`,
        followUps: ["Cartesian explosion with multiple fetches?", "MultipleBagFetchException — why?"]
      },
      {
        question: "Why is @Transactional sometimes ignored?",
        answer:
`AOP proxies wrap calls **from outside** the bean. A self-invocation (\`this.save()\`) bypasses the proxy → no transaction. Fix by injecting the bean into itself, calling via the application context, or using AspectJ weaving.`,
        followUps: ["What is propagation REQUIRES_NEW?", "Why does @Transactional + private method fail?"]
      },
      {
        question: "Optimistic vs pessimistic locking?",
        answer:
`**Optimistic** uses a \`@Version\` column; on commit, Hibernate adds \`WHERE version = ?\`. Cheap, fails fast under contention. **Pessimistic** uses \`SELECT ... FOR UPDATE\`. Use optimistic when conflicts are rare (web apps), pessimistic when contention is high (financial postings).`,
        followUps: ["What is the difference between PESSIMISTIC_READ and PESSIMISTIC_WRITE?"]
      }
    ],
    tradeoffs: {
      pros: ["Strong type safety.", "Repository abstraction is testable.", "Built-in caching + dirty tracking."],
      cons: ["N+1 and lazy-loading traps.", "Schema migrations live separately (Flyway/Liquibase).", "Heavy reflection — cold start slower."],
      when: `**JPA** when domain model has rich relationships and you control schema. **jOOQ/MyBatis** when SQL ownership matters (analytics, reporting). **JDBI/Spring JdbcClient** for thin services where Hibernate is overkill.`
    }
  },

  {
    id: "java-webflux",
    area: "java",
    title: "Reactive Spring (WebFlux) & Project Reactor",
    tag: "Reactive",
    tags: ["webflux", "reactor", "mono", "flux", "backpressure"],
    concept:
`Spring WebFlux is a non-blocking, reactive web stack built on **Project Reactor** (\`Mono<T>\` for 0/1 results, \`Flux<T>\` for 0..N). Backed by Netty (default), it uses a **small event-loop** to multiplex thousands of connections.
**Backpressure** is the contract: subscribers signal demand (\`request(n)\`); producers must not overrun. \`onBackpressureBuffer\`, \`onBackpressureDrop\`, \`limitRate\` shape behaviour.`,
    why:
`Two classic fits: **streaming** (Server-Sent Events, WebSockets, chunked downloads) and **service aggregators** that fan-out to many slow APIs. With **virtual threads** in Java 21+, the case for WebFlux shrinks for typical request/response services — but reactive remains best for streaming and high-fanout aggregation.`,
    example: {
      language: "java",
      code:
`@RestController
@RequiredArgsConstructor
class PriceController {
    private final WebClient client;     // reactive HTTP

    // Aggregate quotes from 3 vendors in parallel, return fastest 2
    @GetMapping(value = "/quote/{sku}", produces = APPLICATION_NDJSON_VALUE)
    Flux<Quote> quote(@PathVariable String sku) {
        Flux<Quote> a = call("https://vendor-a/quote/" + sku);
        Flux<Quote> b = call("https://vendor-b/quote/" + sku);
        Flux<Quote> c = call("https://vendor-c/quote/" + sku);

        return Flux.merge(a, b, c)
            .timeout(Duration.ofMillis(800))
            .onErrorResume(e -> Flux.empty())   // partial degradation
            .take(2)
            .doOnNext(q -> Metrics.counter("quote.served", "vendor", q.vendor()).increment());
    }

    private Flux<Quote> call(String url) {
        return client.get().uri(url).retrieve().bodyToFlux(Quote.class)
            .subscribeOn(Schedulers.parallel());
    }
}`
    },
    interview: [
      {
        question: "Mono vs Flux vs CompletableFuture?",
        answer:
`\`CompletableFuture\` is a single async result, no backpressure, eager. \`Mono\` is lazy single result with backpressure. \`Flux\` is 0..N stream with backpressure and rich operators (\`window\`, \`buffer\`, \`groupBy\`). Reactor pipelines compose cleaner for streaming.`,
        followUps: ["Hot vs cold publisher?", "When does subscribeOn vs publishOn matter?"]
      },
      {
        question: "How does backpressure actually flow?",
        answer:
`The subscriber calls \`request(n)\`; the publisher emits up to \`n\` items. Operators in the middle may transform demand (e.g., \`flatMap\` defaults to \`Queues.SMALL_BUFFER_SIZE\` = 256). Misconfiguring buffer sizes causes either OOM or starvation under load.`,
        followUps: ["onBackpressureBuffer strategies?", "How do you size flatMap concurrency?"]
      }
    ],
    tradeoffs: {
      pros: ["Few threads handle massive connection counts.", "First-class backpressure.", "Composable streaming operators."],
      cons: ["Steep learning curve.", "Stack traces are noisy.", "\`ThreadLocal\` requires context propagation."],
      when: `**Streaming, SSE, WebSocket, high-fanout aggregators.** For CRUD services in Java 21+, **virtual threads + MVC** is simpler and equally scalable.`
    }
  },

  {
    id: "java-records-sealed-patterns",
    area: "java",
    title: "Records, Sealed Classes & Pattern Matching",
    tag: "Modern Java",
    tags: ["records", "sealed", "pattern matching", "switch"],
    concept:
`Modern Java (16–21) introduced:
- **Records** — immutable data carriers. Auto \`equals\`, \`hashCode\`, \`toString\`, accessors.
- **Sealed classes/interfaces** — restrict who can extend/implement → exhaustive \`switch\`.
- **Pattern matching for \`instanceof\` and \`switch\`** — decompose ADTs cleanly.
- **Records with pattern deconstruction** (Java 21) — \`if (obj instanceof Point(int x, int y))\`.
Together they enable **algebraic data types** in Java.`,
    why:
`These features let you model **state machines** and **domain events** with exhaustiveness checks at compile-time. They replace big \`if/else\` ladders and visitor patterns. Reduce defect rate when shipping protocol/event evolutions.`,
    example: {
      language: "java",
      code:
`sealed interface PaymentEvent
    permits Initiated, Authorized, Captured, Failed {}

record Initiated(String id, BigDecimal amount, String currency) implements PaymentEvent {}
record Authorized(String id, String authCode) implements PaymentEvent {}
record Captured(String id, Instant at) implements PaymentEvent {}
record Failed(String id, String reason, int retryCount) implements PaymentEvent {}

class PaymentProjection {
    State apply(State state, PaymentEvent event) {
        return switch (event) {
            case Initiated(var id, var amt, var ccy)   -> state.withAmount(amt, ccy);
            case Authorized(var id, var code)          -> state.withAuth(code);
            case Captured(var id, var at)              -> state.captured(at);
            case Failed f when f.retryCount() >= 3     -> state.markDead();
            case Failed f                              -> state.scheduleRetry();
            // exhaustive — compiler enforces because PaymentEvent is sealed
        };
    }
}`
    },
    interview: [
      {
        question: "Why are records better than Lombok @Data?",
        answer:
`Records are a **language feature** — no annotation processor, no IDE plugin friction, no \`@Builder\` collisions. They're immutable by default, work with serialization, pattern matching, and the JIT optimises them aggressively. Lombok remains useful for mutable JPA entities where records cannot be used.`,
        followUps: ["Can a record extend a class?", "Compact constructor for validation?"]
      },
      {
        question: "What does 'sealed' buy you over abstract class?",
        answer:
`Exhaustiveness checks. The compiler knows the **closed** set of permitted subtypes, so a \`switch\` without a default is verified to cover every case. Add a new event type — and every consumer breaks at compile time. That's a feature.`,
        followUps: ["Non-sealed vs sealed vs final?", "Module visibility constraints?"]
      }
    ],
    tradeoffs: {
      pros: ["ADT modelling with compile-time exhaustiveness.", "Immutability by default for records.", "Cleaner DSLs and event sourcing code."],
      cons: ["Records can't extend classes.", "Pattern matching for switch was preview through Java 20 — older JDKs lack it.", "Migration of legacy Lombok-heavy code is non-trivial."],
      when: `**Domain events, value objects, state machines.** Use classes when you need inheritance or mutable state (e.g., JPA entities).`
    }
  },

  {
    id: "java-jit-performance",
    area: "java",
    title: "JIT, Escape Analysis & Java Performance",
    tag: "Perf",
    tags: ["jit", "c1", "c2", "graal", "perf"],
    concept:
`HotSpot uses **tiered compilation**: interpreter → C1 (fast, low-opt) → C2 (slow, high-opt). **GraalVM** is an alternative C2. JIT optimisations include:
- **Inlining** — bounded by \`MaxInlineLevel\`, hot methods inline aggressively.
- **Escape Analysis** — objects that don't escape a method can be allocated on the stack (scalar replacement).
- **Loop unrolling, vectorisation** (Vector API in Java 17+).
- **Tiered profiling** drives speculative optimisations that can deoptimise.`,
    why:
`Microbenchmarks lie unless you use **JMH** and account for warm-up, dead code elimination, and on-stack replacement. Production perf wins usually come from **reducing allocation** and **branch predictability**, not algorithmic changes.`,
    example: {
      language: "java",
      code:
`// JMH benchmark — the only correct way to microbenchmark Java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Thread) @Fork(2) @Warmup(iterations = 5) @Measurement(iterations = 10)
public class StringConcatBench {
    String a = "hello"; String b = "world"; int n = 42;

    @Benchmark public String plus()        { return a + " " + b + " " + n; }
    @Benchmark public String builder()     {
        return new StringBuilder().append(a).append(' ').append(b).append(' ').append(n).toString();
    }
    @Benchmark public String formatted()   { return String.format("%s %s %d", a, b, n); }

    public static void main(String[] args) throws Exception {
        org.openjdk.jmh.Main.main(args);
    }
}
// Outcome on JDK 21: 'plus' ≈ builder (invokedynamic indy + StringConcatFactory),
// 'formatted' is 8–10x slower due to parsing.`
    },
    interview: [
      {
        question: "What is escape analysis? How can you check if it fires?",
        answer:
`HotSpot proves an object doesn't escape the method/thread → stack-allocates or scalar-replaces it. Verify with \`-XX:+UnlockDiagnosticVMOptions -XX:+PrintEscapeAnalysis -XX:+PrintEliminateAllocations\`. Even better: profile allocation rate with \`async-profiler --alloc\`.`,
        followUps: ["Why do anonymous classes break EA?", "Lambda vs anonymous class capture?"]
      },
      {
        question: "Why are microbenchmarks usually wrong?",
        answer:
`Three classic mistakes: (1) no warm-up — measuring interpreter code; (2) dead-code elimination — JIT removes \`unused = compute()\`; (3) constant folding — inputs become compile-time constants. Use **JMH** with \`Blackhole.consume\`, \`@State\`, multiple forks, and report distributions.`,
        followUps: ["What is on-stack replacement (OSR)?", "Bias and bimodal distributions in benchmarks?"]
      }
    ],
    tradeoffs: {
      pros: ["JIT specialises to actual call sites — often beats AOT.", "Allocation cheap thanks to TLABs + bump pointer.", "Profilers (async-profiler, JFR) are best-in-class."],
      cons: ["Warm-up cost matters for short-lived processes.", "Deoptimisation cliffs from megamorphic call sites.", "C2 bugs are rare but real — pin JDK versions in prod."],
      when: `**HotSpot** for long-running services. **GraalVM native-image** for CLIs, lambdas, sidecars where startup time dominates.`
    }
  }
];
