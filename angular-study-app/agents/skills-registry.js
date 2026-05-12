/* ============================================================
   SKILLS REGISTRY — Java · Go · Microservices · System Design
   Each skill: { id, area, icon, title, desc, prompt, response,
                 followUps[], topicId? }
   ============================================================ */

window.SKILLS_REGISTRY = {

  /* ─────────────────── JAVA SKILLS ─────────────────── */
  java: [
    {
      id:"java-jvm-internals",
      area:"java", icon:"☕",
      title:"JVM Internals",
      desc:"Heap, GC, JIT, class loading",
      topicId:"java-jvm-gc",
      response:`☕ **JVM Internals — Quick Reference**

**Memory Areas:**
• Heap (Young Gen + Old Gen + Metaspace)
• Stack — per-thread, method frames, local vars
• PC Register — current instruction per thread
• Native Method Stack — JNI calls

**GC Generations:**
\`\`\`
Eden → Survivor S0/S1 → Old Gen → Metaspace
Minor GC (Young) → Major GC (Old) → Full GC
\`\`\`

**GC Algorithms:**
• G1GC — default Java 9+. Region-based. Predictable pause targets.
• ZGC — Java 15+. Sub-millisecond pauses. Concurrent marking.
• Shenandoah — Red Hat. Also concurrent, low-latency.

**JIT Compilation:**
• Interpreter → C1 (client) → C2 (server) tiered compilation
• Hotspot threshold: 10,000 method invocations
• Inlining, loop unrolling, escape analysis

**Key tuning flags:**
\`\`\`bash
-Xms512m -Xmx4g          # heap bounds
-XX:+UseG1GC             # collector
-XX:MaxGCPauseMillis=200 # target pause
-XX:+PrintGCDetails      # GC logging
\`\`\``,
      followUps:["What causes OutOfMemoryError: Metaspace?","How does G1GC avoid full GC pauses?","Explain escape analysis in JIT"]
    },
    {
      id:"java-concurrency",
      area:"java", icon:"☕",
      title:"Concurrency Patterns",
      desc:"Threads, locks, CompletableFuture",
      topicId:"java-concurrency",
      response:`☕ **Java Concurrency — Quick Reference**

**Thread Lifecycle:** NEW → RUNNABLE → BLOCKED/WAITING/TIMED_WAITING → TERMINATED

**Synchronization primitives:**
• \`synchronized\` — intrinsic lock (monitor)
• \`ReentrantLock\` — tryLock, timeout, fair mode
• \`ReadWriteLock\` — multiple readers OR one writer
• \`StampedLock\` — optimistic reads (no blocking)
• \`volatile\` — visibility guarantee, no atomicity

**Atomic operations:**
\`\`\`java
AtomicInteger counter = new AtomicInteger(0);
counter.incrementAndGet();           // CAS-based, lock-free
counter.compareAndSet(expected, upd); // optimistic update
\`\`\`

**CompletableFuture chaining:**
\`\`\`java
CompletableFuture
  .supplyAsync(() -> fetchUser(id))       // async
  .thenApplyAsync(user -> enrich(user))   // transform
  .thenCombine(fetchOrders(id),           // merge two futures
               (user, orders) -> merge(user, orders))
  .exceptionally(e -> fallback())         // error handling
  .orTimeout(5, TimeUnit.SECONDS);        // timeout
\`\`\`

**ThreadPoolExecutor sizing:**
• CPU-bound: N_CPU + 1 threads
• I/O-bound: N_CPU × (1 + wait_time/cpu_time)
• Use VirtualThreads (Java 21) for I/O-heavy workloads`,
      followUps:["What is the happens-before relationship?","When would you use ForkJoinPool?","Explain virtual threads vs OS threads"]
    },
    {
      id:"java-streams",
      area:"java", icon:"☕",
      title:"Streams & Functional",
      desc:"Stream API, Optional, lambdas",
      topicId:"java-streams-functional",
      response:`☕ **Java Streams & Functional — Quick Reference**

**Stream pipeline:** Source → Intermediate ops (lazy) → Terminal op (triggers evaluation)

**Common patterns:**
\`\`\`java
// Group by + aggregate
Map<Status, Long> countByStatus = orders.stream()
  .collect(Collectors.groupingBy(Order::getStatus, Collectors.counting()));

// Flat map — flatten nested lists
List<Item> allItems = orders.stream()
  .flatMap(o -> o.getItems().stream())
  .collect(Collectors.toList());

// Parallel stream — use for CPU-bound, large collections
long sum = numbers.parallelStream()
  .filter(n -> n % 2 == 0)
  .mapToLong(Long::longValue)
  .sum();

// Optional chaining
Optional.ofNullable(user)
  .map(User::getAddress)
  .map(Address::getCity)
  .orElse("Unknown");
\`\`\`

**Custom collector:**
\`\`\`java
Collector<Order, ?, Map<String, DoubleSummaryStatistics>> statsPerRegion =
  Collectors.groupingBy(Order::getRegion,
    Collectors.summarizingDouble(Order::getTotal));
\`\`\`

**Gotcha:** Don't reuse streams. Don't use parallel for small collections or I/O operations.`,
      followUps:["When is parallel stream faster?","How do you implement a custom Collector?","Difference between map and flatMap?"]
    },
    {
      id:"java-spring-boot",
      area:"java", icon:"☕",
      title:"Spring Boot Patterns",
      desc:"DI, @Transactional, auto-config",
      topicId:"java-spring-boot",
      response:`☕ **Spring Boot — Key Patterns**

**Dependency Injection:**
\`\`\`java
// Prefer constructor injection — enables immutability + testing
@Service
@RequiredArgsConstructor  // Lombok
public class OrderService {
    private final OrderRepository repo;
    private final EventPublisher publisher;
}
\`\`\`

**Transaction management:**
\`\`\`java
@Transactional(
  propagation = Propagation.REQUIRED,  // join existing tx
  isolation = Isolation.READ_COMMITTED, // default for PG
  rollbackFor = OrderException.class,   // rollback on this
  timeout = 30                          // seconds
)
public Order createOrder(Request req) { ... }
\`\`\`

**Auto-configuration magic:**
\`\`\`
@SpringBootApplication
  → @EnableAutoConfiguration
    → spring.factories / AutoConfiguration.imports
      → @ConditionalOnClass / @ConditionalOnMissingBean
        → Only configures if classpath dependency present
\`\`\`

**Key actuator endpoints:**
• /actuator/health — liveness + readiness (K8s probes)
• /actuator/metrics — Micrometer metrics
• /actuator/info — app metadata
• /actuator/loggers — change log level at runtime`,
      followUps:["How does Spring resolve circular dependencies?","What is @Transactional self-invocation problem?","How does Spring Boot auto-configuration work?"]
    },
    {
      id:"java-design-patterns",
      area:"java", icon:"☕",
      title:"Design Patterns",
      desc:"GoF patterns with Java examples",
      topicId:"java-records-sealed",
      response:`☕ **Essential GoF Design Patterns in Java**

**Creational:**
\`\`\`java
// Builder — for objects with many optional params
Order order = Order.builder()
  .userId(1L).item("Book").quantity(2).build();

// Factory Method — decouple creation from use
NotificationSender sender = NotificationFactory.create(type); // SMS/Email/Push
sender.send(message);

// Singleton — thread-safe with double-checked locking
// Prefer enum singleton or Spring @Bean (framework-managed)
\`\`\`

**Structural:**
\`\`\`java
// Decorator — add behaviour without changing class
InputStream input = new BufferedInputStream(
                     new GZIPInputStream(
                      new FileInputStream("data.gz")));

// Adapter — bridge incompatible interfaces
class LegacyPaymentAdapter implements NewPaymentPort {
    private final LegacyPaymentSystem legacy;
    public void pay(Amount a) { legacy.charge(a.cents()); }
}
\`\`\`

**Behavioural:**
\`\`\`java
// Strategy — swap algorithm at runtime
interface PricingStrategy { BigDecimal calculate(Order o); }
class PremiumPricing implements PricingStrategy { ... }
class FreePricing implements PricingStrategy { ... }
orderService.setStrategy(new PremiumPricing());

// Observer — event-driven decoupling
applicationEventPublisher.publishEvent(new OrderCreated(order));
@EventListener void onOrderCreated(OrderCreated event) { ... }
\`\`\``,
      followUps:["When would you use Template Method over Strategy?","How does Spring use the Proxy pattern?","Explain the Composite pattern with an example"]
    },
    {
      id:"java-jpa",
      area:"java", icon:"☕",
      title:"JPA & Hibernate",
      desc:"N+1, fetching, caching, locking",
      topicId:"java-jpa-hibernate",
      response:`☕ **JPA & Hibernate — Critical Concepts**

**N+1 problem & fix:**
\`\`\`java
// BAD: N+1 — 1 query for orders + N queries for items
List<Order> orders = repo.findAll();
orders.forEach(o -> o.getItems().size()); // triggers N lazy loads

// FIX: JOIN FETCH in one query
@Query("SELECT o FROM Order o JOIN FETCH o.items WHERE o.userId = :id")
List<Order> findWithItems(@Param("id") Long id);
\`\`\`

**Fetch strategies:**
• LAZY (default for collections) — load on access
• EAGER — always join. Avoid for collections (causes N+1 on every query)
• @EntityGraph — ad-hoc eager fetch per query

**Optimistic vs Pessimistic locking:**
\`\`\`java
// Optimistic: @Version — detect concurrent modification
@Version private Long version; // auto-incremented on update
// Throws OptimisticLockException on conflict — caller retries

// Pessimistic: SELECT FOR UPDATE — holds DB lock
repo.findById(id, LockModeType.PESSIMISTIC_WRITE);
\`\`\`

**Second-level cache (Hibernate):**
\`\`\`java
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@Entity public class Product { ... }
// Stores in Ehcache/Redis — survives EntityManager lifecycle
\`\`\``,
      followUps:["What is the difference between EntityManager flush and commit?","When would you use native queries vs JPQL?","How does Hibernate handle batch inserts?"]
    },
    {
      id:"java-webflux",
      area:"java", icon:"☕",
      title:"Reactive / WebFlux",
      desc:"Mono, Flux, backpressure, R2DBC",
      topicId:"java-reactive-webflux",
      response:`☕ **Spring WebFlux & Project Reactor**

**Core types:**
• \`Mono<T>\` — 0 or 1 item (async equivalent of Optional/Future)
• \`Flux<T>\` — 0 to N items (async stream)

**Reactive operators:**
\`\`\`java
Flux.fromIterable(orders)
  .filter(o -> o.getTotal().compareTo(THRESHOLD) > 0)
  .flatMap(o -> enrichAsync(o))     // concurrent, unordered
  .concatMap(o -> processSeq(o))    // sequential, preserves order
  .buffer(100)                       // batch 100 items
  .delayElements(Duration.ofMillis(10)) // rate limiting
  .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)))
  .onErrorResume(e -> Flux.empty()); // fallback
\`\`\`

**Backpressure:**
\`\`\`java
Flux.interval(Duration.ofMillis(1)) // fast producer
  .onBackpressureDrop()   // drop if consumer slow
  // or .onBackpressureBuffer(1000)
  // or .onBackpressureLatest()
  .subscribe(item -> slowConsumer(item),
             Schedulers.boundedElastic()); // I/O scheduler
\`\`\`

**When to use WebFlux:** High-concurrency I/O-bound services (10K+ concurrent connections). Not for CPU-bound work or when team is unfamiliar with reactive programming.`,
      followUps:["What is the difference between flatMap and concatMap?","How does WebFlux handle errors differently from MVC?","When would you NOT use reactive programming?"]
    },
    {
      id:"java-interview-top",
      area:"java", icon:"☕",
      title:"Top Interview Questions",
      desc:"Most-asked Java SDE questions",
      response:`☕ **Top Java Interview Questions — Senior SDE Level**

**Q: What is the difference between HashMap and ConcurrentHashMap?**
A: HashMap is unsynchronized — not thread-safe. ConcurrentHashMap uses segment-level locking (Java 7) then CAS + synchronized on individual buckets (Java 8+). Allows concurrent reads. Writes lock only the affected bucket.

**Q: Explain the Java memory model and happens-before.**
A: JMM defines visibility rules. Happens-before: if A happens-before B, A's writes are visible to B. Established by: synchronization, volatile writes/reads, thread start/join, lock release/acquire.

**Q: What causes a deadlock and how do you prevent it?**
A: Two threads each hold a lock and wait for the other's lock. Prevention: lock ordering (always acquire locks in same order), timeout (tryLock with timeout), lock-free algorithms (CAS/atomics).

**Q: What is the difference between String, StringBuilder, StringBuffer?**
A: String is immutable (pool-interned). StringBuilder is mutable, not thread-safe, fast. StringBuffer is mutable, thread-safe (synchronized methods), slower. Use StringBuilder in single-threaded code.

**Q: How does Java garbage collection work with generational hypothesis?**
A: Most objects die young. Young gen (Eden + 2 Survivors) collected frequently (minor GC, fast). Old gen collected rarely (major GC, slower). G1GC: divides heap into equal regions, picks highest-garbage regions first (G1 = Garbage First).`,
      followUps:["Explain CAS (Compare-And-Swap) operation","What is the double-checked locking singleton pattern?","How does Java handle integer caching (-128 to 127)?"]
    }
  ],

  /* ─────────────────── GO SKILLS ─────────────────── */
  golang: [
    {
      id:"go-goroutines",
      area:"golang", icon:"🐹",
      title:"Goroutines & Channels",
      desc:"Concurrency model, select, WaitGroup",
      topicId:"go-goroutines-channels",
      response:`🐹 **Go Goroutines & Channels — Quick Reference**

**Goroutine basics:**
\`\`\`go
// Start goroutine — lightweight (2KB stack, grows dynamically)
go func() { doWork() }()

// WaitGroup — wait for goroutine group
var wg sync.WaitGroup
for _, url := range urls {
    wg.Add(1)
    go func(u string) {
        defer wg.Done()
        fetch(u)
    }(url)  // pass url as arg — avoid closure capture bug
}
wg.Wait()
\`\`\`

**Channel patterns:**
\`\`\`go
// Buffered channel — producer/consumer
jobs := make(chan Job, 100)  // buffer 100
results := make(chan Result, 100)

// Fan-out: distribute work to N workers
for i := 0; i < numWorkers; i++ {
    go func() {
        for job := range jobs { // range over channel
            results <- process(job)
        }
    }()
}

// Select — multiplex channels with timeout
select {
case res := <-results: handle(res)
case <-time.After(5 * time.Second): handleTimeout()
case <-ctx.Done(): return ctx.Err()
}
\`\`\`

**Go scheduler (GMP model):**
• G = Goroutine, M = OS thread, P = Processor (GOMAXPROCS)
• Go scheduler multiplexes N goroutines onto M OS threads
• M:N threading — far cheaper than OS threads (1 thread per goroutine)`,
      followUps:["What is the goroutine leak problem and how do you prevent it?","Explain the difference between buffered and unbuffered channels","What does GOMAXPROCS control?"]
    },
    {
      id:"go-interfaces",
      area:"golang", icon:"🐹",
      title:"Interfaces & Embedding",
      desc:"Duck typing, composition, type assertions",
      topicId:"go-interfaces-embedding",
      response:`🐹 **Go Interfaces & Embedding**

**Interface satisfaction (implicit):**
\`\`\`go
type Stringer interface { String() string }

type User struct { Name string }
func (u User) String() string { return u.Name } // satisfies Stringer implicitly
// No "implements" keyword — duck typing

// Accept interfaces, return structs
func Print(s Stringer) { fmt.Println(s.String()) }
\`\`\`

**Interface composition:**
\`\`\`go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type ReadWriter interface { Reader; Writer }  // compose interfaces
\`\`\`

**Struct embedding (composition over inheritance):**
\`\`\`go
type Animal struct{ Name string }
func (a Animal) Speak() string { return a.Name + " makes a sound" }

type Dog struct {
    Animal              // embedded — promotes methods
    Breed string
}
d := Dog{Animal: Animal{Name:"Rex"}, Breed:"Husky"}
d.Speak()  // promoted method — works directly
d.Name     // promoted field — works directly
\`\`\`

**Type assertion & type switch:**
\`\`\`go
var i interface{} = "hello"
s, ok := i.(string)  // safe assertion — ok=false if wrong type

switch v := i.(type) {
case string:  fmt.Println("string:", v)
case int:     fmt.Println("int:", v)
default:      fmt.Println("unknown type")
}
\`\`\``,
      followUps:["What is the empty interface{} (any)?","How do you mock interfaces in Go tests?","Explain interface{} vs generics (1.18+)"]
    },
    {
      id:"go-error-handling",
      area:"golang", icon:"🐹",
      title:"Error Handling",
      desc:"errors.Is, As, wrapping, sentinel errors",
      topicId:"go-error-handling",
      response:`🐹 **Go Error Handling — Idiomatic Patterns**

**Always check errors immediately:**
\`\`\`go
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething: %w", err) // wrap with %w for unwrapping
}
\`\`\`

**Sentinel errors:**
\`\`\`go
var ErrNotFound = errors.New("not found")
var ErrUnauthorized = errors.New("unauthorized")

// Check with errors.Is — handles wrapped errors
if errors.Is(err, ErrNotFound) { return 404 }
\`\`\`

**Custom error types:**
\`\`\`go
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed: %s — %s", e.Field, e.Message)
}

// Unwrap to custom type with errors.As
var valErr *ValidationError
if errors.As(err, &valErr) {
    fmt.Println("Field:", valErr.Field)
}
\`\`\`

**Error handling in concurrent code:**
\`\`\`go
// errgroup — first error cancels all goroutines
g, ctx := errgroup.WithContext(context.Background())
g.Go(func() error { return fetchA(ctx) })
g.Go(func() error { return fetchB(ctx) })
if err := g.Wait(); err != nil { log.Fatal(err) }
\`\`\``,
      followUps:["What is the difference between errors.Is and errors.As?","How do you handle panics in Go?","When should you use panic vs returning an error?"]
    },
    {
      id:"go-context",
      area:"golang", icon:"🐹",
      title:"Context Package",
      desc:"Cancellation, timeout, value propagation",
      topicId:"go-context-cancellation",
      response:`🐹 **Go Context — Cancellation & Timeout**

**Context hierarchy:**
\`\`\`go
ctx := context.Background()                      // root — never cancelled
ctx, cancel := context.WithCancel(ctx)           // manual cancel
defer cancel()                                   // ALWAYS defer cancel

ctx, cancel = context.WithTimeout(ctx, 5*time.Second)   // deadline
ctx, cancel = context.WithDeadline(ctx, time.Now().Add(5*time.Second))
\`\`\`

**Propagate context through call stack:**
\`\`\`go
func (s *Server) HandleOrder(ctx context.Context, req Request) error {
    user, err := s.userSvc.GetUser(ctx, req.UserID)  // pass ctx
    if err != nil { return err }

    // Check if cancelled mid-operation
    select {
    case <-ctx.Done(): return ctx.Err() // context.Canceled or DeadlineExceeded
    default:
    }

    return s.orderRepo.Save(ctx, newOrder(user, req))
}
\`\`\`

**Context values (use sparingly):**
\`\`\`go
type ctxKey string
const requestIDKey ctxKey = "requestID"

ctx = context.WithValue(ctx, requestIDKey, "req-42")
reqID := ctx.Value(requestIDKey).(string)
\`\`\`

**Rules:** Never store context in a struct. Always pass as first parameter. Cancel signals propagate to all derived contexts.`,
      followUps:["What happens when you cancel a context that has children?","How do you propagate trace IDs via context?","What is context.TODO() vs context.Background()?"]
    },
    {
      id:"go-performance",
      area:"golang", icon:"🐹",
      title:"Performance & Profiling",
      desc:"pprof, benchmarks, escape analysis",
      response:`🐹 **Go Performance & Profiling**

**Benchmarks:**
\`\`\`go
func BenchmarkSort(b *testing.B) {
    data := make([]int, 1000)
    for i := 0; i < b.N; i++ {
        // b.N auto-set by testing framework
        sort.Ints(data)
    }
}
// Run: go test -bench=BenchmarkSort -benchmem -count=5
\`\`\`

**pprof profiling:**
\`\`\`go
import _ "net/http/pprof"  // side-effect: registers /debug/pprof handlers
go http.ListenAndServe(":6060", nil)

// Collect: go tool pprof http://localhost:6060/debug/pprof/profile?seconds=30
// Visualise: go tool pprof -http=:8080 profile.pb.gz
\`\`\`

**Escape analysis:**
\`\`\`bash
go build -gcflags="-m" ./...
# "x escapes to heap" — means GC pressure
# Keep hot-path objects on stack: pass by value, avoid &local
\`\`\`

**Common optimisations:**
• Pre-allocate slices: \`make([]T, 0, expectedLen)\`
• Reuse buffers with \`sync.Pool\`
• Use \`strings.Builder\` instead of \`+\` concatenation
• Avoid interface conversions in hot loops (boxing overhead)
• Use \`[]byte\` instead of \`string\` for mutation`,
      followUps:["What is sync.Pool and when should you use it?","How do you diagnose goroutine leaks?","Explain the difference between value and pointer receivers for performance"]
    },
    {
      id:"go-http",
      area:"golang", icon:"🐹",
      title:"HTTP Servers & Middleware",
      desc:"net/http, middleware chain, graceful shutdown",
      topicId:"go-http-microservices",
      response:`🐹 **Go HTTP Servers — Production Patterns**

**Server with timeouts (required for production):**
\`\`\`go
srv := &http.Server{
    Addr:         ":8080",
    Handler:      mux,
    ReadTimeout:  5 * time.Second,   // header + body read time
    WriteTimeout: 10 * time.Second,  // response write time
    IdleTimeout:  120 * time.Second, // keep-alive idle
}
\`\`\`

**Middleware chain:**
\`\`\`go
type Middleware func(http.Handler) http.Handler

func Chain(h http.Handler, ms ...Middleware) http.Handler {
    for i := len(ms) - 1; i >= 0; i-- {
        h = ms[i](h)
    }
    return h
}

// Usage:
mux.Handle("/api/", Chain(apiHandler,
    LoggingMiddleware,
    AuthMiddleware,
    RateLimitMiddleware,
))
\`\`\`

**Graceful shutdown:**
\`\`\`go
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit  // block until signal

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()
if err := srv.Shutdown(ctx); err != nil {
    log.Fatal("forced shutdown:", err)
}
log.Println("Server stopped gracefully")
\`\`\``,
      followUps:["How do you handle streaming responses in Go?","What is the difference between Handle and HandleFunc?","How do you implement middleware for JWT validation in Go?"]
    }
  ],

  /* ─────────────────── MICROSERVICES SKILLS ─────────────────── */
  microservices: [
    {
      id:"ms-api-gateway-skill",
      area:"microservices", icon:"🔧",
      title:"API Gateway Patterns",
      desc:"Routing, auth, rate-limit, Kong/Envoy",
      topicId:"ms-api-gateway",
      response:`🔧 **API Gateway — Essential Patterns**

**What it does:**
Single entry point: TLS termination → Auth → Rate limit → Route → Transform → Log

**Rate limiting (token bucket in Redis):**
\`\`\`lua
-- Atomic Redis Lua script
local tokens = redis.call('GET', KEYS[1]) or ARGV[1]
if tonumber(tokens) >= 1 then
  redis.call('DECRBY', KEYS[1], 1)
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  return 1  -- allowed
end
return 0    -- 429 Too Many Requests
\`\`\`

**JWT validation at gateway (Kong plugin):**
\`\`\`yaml
plugins:
  - name: jwt
    config:
      claims_to_verify: [exp, nbf]
      key_claim_name: kid   # JWKS key ID
\`\`\`

**BFF (Backend for Frontend) pattern:**
Create a purpose-built gateway per client type:
• Mobile BFF — lighter responses, offline-first fields
• Web BFF — richer data, SSR-optimised
• Partner BFF — rate-limited, scoped OAuth

**Versioning strategies:**
• URL path: \`/api/v2/orders\` — explicit, cache-friendly
• Header: \`Accept: application/vnd.api+json;version=2\` — clean URLs, harder to test
• Query param: \`?version=2\` — easy to test, pollutes URL`,
      followUps:["How do you implement a circuit breaker at the gateway level?","What is the difference between API Gateway and Service Mesh?","How do you handle backward compatibility in versioned APIs?"]
    },
    {
      id:"ms-kafka-skill",
      area:"microservices", icon:"🔧",
      title:"Kafka & Event Streaming",
      desc:"Partitions, consumer groups, EOS",
      topicId:"ms-kafka-event-driven",
      response:`🔧 **Kafka Deep Dive — Production Patterns**

**Partition sizing rule:** Max consumers in a group = partition count. Under-partition = throughput ceiling. Over-partition = coordinator overhead.

**Producer config for durability:**
\`\`\`properties
acks=all                        # wait for all ISR
enable.idempotence=true         # deduplicate retries
retries=2147483647             # retry forever (bounded by delivery.timeout.ms)
delivery.timeout.ms=120000     # total delivery timeout
\`\`\`

**Consumer offset management:**
\`\`\`java
// Manual commit — at-least-once, commit after processing
consumer.poll(Duration.ofMillis(100)).forEach(record -> {
    process(record);
    consumer.commitSync(Collections.singletonMap(
        new TopicPartition(record.topic(), record.partition()),
        new OffsetAndMetadata(record.offset() + 1)));
});
\`\`\`

**Dead letter queue pattern:**
\`\`\`java
try {
    process(record);
} catch (NonRetryableException e) {
    dlqProducer.send(new ProducerRecord<>("orders-dlq", record.key(), record.value()));
    // Commit offset — skip poison message
    ack.acknowledge();
}
\`\`\`

**Lag monitoring (critical!):**
\`\`\`bash
kafka-consumer-groups.sh --describe --group fulfillment-service
# LAG > 100K → consumer behind, scale up or fix slow processing
\`\`\``,
      followUps:["How does Kafka guarantee exactly-once semantics?","What is log compaction and when would you use it?","How do you rebalance consumer groups without downtime?"]
    },
    {
      id:"ms-saga-skill",
      area:"microservices", icon:"🔧",
      title:"Saga Pattern",
      desc:"Distributed transactions, compensation",
      topicId:"ms-saga-distributed-tx",
      response:`🔧 **Saga Pattern — Distributed Transactions**

**Choreography saga (event-driven):**
\`\`\`
OrderCreated → InventoryService reserves → InventoryReserved
             → PaymentService charges → PaymentCharged
             → ShippingService books → ShipmentCreated ✓

On PaymentFailed:
PaymentFailed → InventoryService releases → InventoryReleased ✗
\`\`\`

**Orchestration saga (central coordinator):**
\`\`\`java
// Each step: action + compensating action
sagaManager.start("order-saga")
  .step("reserve-inventory", inventory::reserve, inventory::release)
  .step("charge-payment",    payment::charge,   payment::refund)
  .step("create-shipment",   shipping::create,  shipping::cancel)
  .execute(orderId);
\`\`\`

**Idempotency is mandatory:**
\`\`\`java
// Each saga step MUST be idempotent — retried on failure
public void reserveInventory(UUID sagaId, String orderId) {
    if (alreadyProcessed(sagaId)) return; // idempotency check
    // ... reserve stock
    markProcessed(sagaId);
}
\`\`\`

**Saga state persistence:**
Store saga state in DB — survive crashes and resume from last committed step.

**When to use:** Any operation spanning multiple services with different databases. Never use 2PC across microservices.`,
      followUps:["What is a compensating transaction?","How do you handle partial failures in a saga?","When would you choose orchestration over choreography?"]
    },
    {
      id:"ms-circuit-breaker-skill",
      area:"microservices", icon:"🔧",
      title:"Circuit Breaker & Resilience",
      desc:"Resilience4j, bulkhead, retry, timeout",
      topicId:"ms-circuit-breaker",
      response:`🔧 **Resilience Patterns — Production Setup**

**Circuit Breaker states:**
CLOSED (normal) → [50% failures in 10s] → OPEN (fail fast) → [30s cooldown] → HALF_OPEN (test 3 calls) → CLOSED or OPEN

**Resilience4j config (application.yml):**
\`\`\`yaml
resilience4j:
  circuitbreaker:
    instances:
      paymentService:
        slidingWindowSize: 10
        failureRateThreshold: 50
        waitDurationInOpenState: 30s
        permittedNumberOfCallsInHalfOpenState: 3
  retry:
    instances:
      paymentService:
        maxAttempts: 3
        waitDuration: 200ms
        exponentialBackoffMultiplier: 2
        retryExceptions:
          - java.net.ConnectException
  timelimiter:
    instances:
      paymentService:
        timeoutDuration: 5s
  bulkhead:
    instances:
      paymentService:
        maxConcurrentCalls: 10
\`\`\`

**Fallback strategy:**
\`\`\`java
@CircuitBreaker(name="paymentService", fallbackMethod="fallback")
public PaymentResult charge(ChargeRequest req) { ... }

private PaymentResult fallback(ChargeRequest req, Exception e) {
    // Queue for async retry, return pending status
    asyncQueue.add(req);
    return PaymentResult.pending("Circuit open — queued for retry");
}
\`\`\``,
      followUps:["Why add jitter to exponential backoff?","What is bulkhead isolation and when is it critical?","How do you test circuit breaker behaviour in integration tests?"]
    },
    {
      id:"ms-service-discovery-skill",
      area:"microservices", icon:"🔧",
      title:"Service Discovery",
      desc:"Consul, Eureka, K8s DNS, client-side LB",
      topicId:"ms-service-discovery",
      response:`🔧 **Service Discovery — Patterns & Implementation**

**Client-side discovery:**
Client queries registry (Eureka/Consul) → gets list of instances → client-side load balancing (Ribbon/Spring Cloud LoadBalancer).

**Server-side discovery:**
Client → Load Balancer → queries registry → routes to instance. Client knows nothing about instances.

**Kubernetes DNS (simplest for K8s):**
\`\`\`
order-service.production.svc.cluster.local:8080
# serviceName.namespace.svc.cluster.local
\`\`\`
K8s DNS auto-registers Services. No external registry needed.

**Consul health-check registration:**
\`\`\`json
{
  "Name": "order-service",
  "Address": "10.0.1.42",
  "Port": 8080,
  "Check": {
    "HTTP": "http://10.0.1.42:8080/health",
    "Interval": "10s",
    "Timeout": "2s",
    "DeregisterCriticalServiceAfter": "30s"
  }
}
\`\`\`

**Service mesh alternative:** Istio/Linkerd handle discovery + LB + health automatically via sidecar proxies. No registry needed.`,
      followUps:["What is the difference between service registry and service mesh?","How does Kubernetes implement service discovery without a registry?","What is the split-brain problem in service discovery?"]
    },
    {
      id:"ms-cqrs-skill",
      area:"microservices", icon:"🔧",
      title:"CQRS & Event Sourcing",
      desc:"Command/Query split, event store, projections",
      topicId:"ms-cqrs-event-sourcing",
      response:`🔧 **CQRS & Event Sourcing — Core Concepts**

**CQRS split:**
\`\`\`
Commands (writes) → Aggregate → Events → Event Store
                                    ↓
                               Projections → Read Models (queries)
\`\`\`

**Event store model:**
\`\`\`sql
CREATE TABLE events (
  event_id    UUID PRIMARY KEY,
  stream_id   VARCHAR(255) NOT NULL,  -- aggregateId
  version     BIGINT NOT NULL,        -- optimistic concurrency
  event_type  VARCHAR(255) NOT NULL,
  payload     JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stream_id, version)          -- prevents version conflicts
);
\`\`\`

**Rebuild state from events:**
\`\`\`java
public Order rebuild(String orderId) {
    List<Event> events = eventStore.loadStream(orderId);
    return events.stream()
        .reduce(Order.empty(), Order::apply, (a, b) -> b); // fold
}
\`\`\`

**Projection (read model builder):**
\`\`\`java
@EventHandler
public void on(OrderConfirmed event) {
    OrderSummary summary = summaryRepo.findById(event.getOrderId()).orElseThrow();
    summary.setStatus("CONFIRMED");
    summary.setTotal(event.getTotal());
    summaryRepo.save(summary);  // denormalized read model
}
\`\`\`

**Snapshot optimisation:** After 100+ events, save aggregate state snapshot. Rebuild from snapshot + events since.`,
      followUps:["How do you handle event schema evolution?","What is eventual consistency in the context of CQRS?","When would you NOT use event sourcing?"]
    }
  ],

  /* ─────────────────── SYSTEM DESIGN SKILLS ─────────────────── */
  sysdesign: [
    {
      id:"sd-design-framework",
      area:"sysdesign", icon:"⬡",
      title:"Design Interview Framework",
      desc:"5-step approach for any system design interview",
      response:`⬡ **System Design Interview — 5-Step Framework**

**Step 1: Clarify Requirements (5 min)**
Ask: Who are the users? Scale (DAU, RPS, data volume)? SLA requirements? Read/write ratio? Consistency requirements?

**Step 2: Capacity Estimation (5 min)**
\`\`\`
Example: Design Twitter Feed
• 500M DAU × 10 reads/day = 5B reads/day = 58K RPS
• 500M DAU × 0.1 writes/day = 50M writes/day = 580 WPS
• 1 tweet = 1KB → 50M × 1KB = 50GB/day storage
• With replicas (3×): 150GB/day
\`\`\`

**Step 3: High-Level Design (15 min)**
Draw: Client → CDN → LB → API → Cache → DB
Identify: Where is data stored? How do services communicate? What are the critical paths?

**Step 4: Deep Dive (15 min)**
Go deep on 2-3 components the interviewer focuses on:
• DB schema + indexes
• Caching strategy
• Scaling bottlenecks
• Failure scenarios

**Step 5: Discuss Trade-offs (5 min)**
• What would you do differently at 10× scale?
• What are the consistency trade-offs?
• What monitoring would you add?

**Golden rules:**
• Never design in silence — narrate your thinking
• Start simple, add complexity when asked
• Always justify choices with trade-offs`,
      followUps:["How do you estimate QPS from DAU?","What questions should you always ask the interviewer?","How do you handle 'design at scale' follow-ups?"]
    },
    {
      id:"sd-url-shortener-skill",
      area:"sysdesign", icon:"⬡",
      title:"Design: URL Shortener",
      desc:"TinyURL — encoding, caching, analytics",
      topicId:"sd-case-url-shortener",
      response:`⬡ **URL Shortener — Design Walkthrough**

**Scale:** 100M URLs/day created, 10B redirects/day

**Core algorithm:**
\`\`\`
1. Generate 64-bit Snowflake ID (time + machineId + seq)
2. Encode to base62: 62^7 = 3.5T codes → 7-char short code
3. Store: shortCode → originalUrl (DynamoDB, TTL support native)
\`\`\`

**Read path (10B redirects/day = 116K RPS):**
\`\`\`
Browser → CloudFront (301 cache 80%) → Redis Cluster → DynamoDB
• 80% served at CDN edge — zero origin cost
• 19% from Redis sub-millisecond
• 1% cold miss → DynamoDB (still <5ms)
\`\`\`

**301 vs 302 redirect:**
• 301 Permanent → browser caches, no tracking, CDN-friendly
• 302 Temporary → every click tracked, analytics possible
→ Use 302 with CDN cache for hybrid: analytics + edge caching

**Analytics (async, don't block redirect):**
\`\`\`
Redirect → publish ClickEvent to Kafka (async)
         → Flink aggregates → ClickHouse
         → Dashboard: clicks/URL, geo, device, referer
\`\`\`

**Anti-abuse:** Bloom filter for known malicious domains. Rate limit URL creation per API key. CAPTCHA for anonymous users.`,
      followUps:["How do you handle custom vanity URLs?","How would you scale to 1T redirects/day?","How do you detect phishing/spam URLs?"]
    },
    {
      id:"sd-social-feed-skill",
      area:"sysdesign", icon:"⬡",
      title:"Design: Social Feed",
      desc:"Twitter/Instagram — fanout, ranking",
      topicId:"sd-case-social-feed",
      response:`⬡ **Social Feed — Fanout Design**

**Two models:**

**Fanout-on-write (push):**
• On post: immediately write to each follower's feed cache
• Pro: O(1) read — pre-computed feed
• Con: celebrity with 50M followers = 50M Redis writes per tweet

**Fanout-on-read (pull):**
• On read: fetch posts from all followed users and merge
• Pro: O(1) write
• Con: O(followees) read — slow for users following 1000 accounts

**Twitter hybrid (the real solution):**
\`\`\`
if author.followers < 1_000_000:
    fanout-on-write via Kafka workers → Redis sorted set per user
else:  # celebrity
    no pre-fanout; at read time:
    feed = precomputed_feed + recent_celebrity_tweets (1 DB query)
\`\`\`

**Feed storage:**
\`\`\`redis
ZADD feed:{userId} {score} {tweetId}
# score = timestamp + engagement_signal
ZREVRANGE feed:{userId} 0 19  # top 20 tweets
ZREMRANGEBYRANK feed:{userId} 0 -801  # keep only 800
\`\`\`

**Ranking signals:** Freshness, engagement rate, author relationship, diversity, content type preference`,
      followUps:["How do you implement infinite scroll with cursor pagination?","How does Instagram rank stories vs feed posts?","How do you handle 'seen' state for notifications?"]
    },
    {
      id:"sd-lld-rate-limiter-skill",
      area:"sysdesign", icon:"⬡",
      title:"LLD: Rate Limiter",
      desc:"Token bucket, sliding window, Redis",
      topicId:"sd-lld-rate-limiter",
      response:`⬡ **LLD: Rate Limiter — Complete Design**

**Token Bucket Algorithm (most common):**
\`\`\`
Bucket capacity: C (max burst)
Refill rate: R tokens/second
On request: if tokens >= 1 → consume 1 token → allow
            else → 429 Too Many Requests
\`\`\`

**Distributed implementation (Redis Lua — atomic):**
\`\`\`lua
local tokens = tonumber(redis.call('GET', KEYS[1])) or ARGV[1]
local now = tonumber(ARGV[2])
local lastRefill = tonumber(redis.call('GET', KEYS[1]..':ts')) or now
local elapsed = (now - lastRefill) / 1000.0
tokens = math.min(ARGV[1], tokens + elapsed * ARGV[3])
if tokens >= 1 then
  redis.call('SET', KEYS[1], tokens - 1, 'EX', ARGV[4])
  redis.call('SET', KEYS[1]..':ts', now, 'EX', ARGV[4])
  return 1  -- allowed
end
return 0    -- rejected
\`\`\`

**Sliding window counter (Cloudflare approach):**
\`\`\`
estimate = prev_count × (1 - overlap_fraction) + curr_count
if estimate < limit → allow; else → 429
\`\`\`

**Response headers (standard):**
\`\`\`http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1701234620
Retry-After: 60
\`\`\``,
      followUps:["What is the difference between token bucket and leaky bucket?","How do you rate limit across multiple regions?","How do you handle rate limit for distributed API keys?"]
    },
    {
      id:"sd-consistent-hash-skill",
      area:"sysdesign", icon:"⬡",
      title:"LLD: Consistent Hashing",
      desc:"Hash ring, vnodes, minimal remapping",
      topicId:"sd-lld-consistent-hash",
      response:`⬡ **Consistent Hashing — Hash Ring**

**Problem with mod-N:** Adding/removing a server remaps ~N/(N+1) ≈ 90% of keys. Cache invalidation storm.

**Consistent hashing solution:**
\`\`\`
1. Hash space: circular ring [0, 2^32)
2. Hash each server → position on ring
3. Hash each key → position → walk clockwise → first server
4. Add server: only keys between new server and predecessor move
5. Remove server: only keys on that server move to next clockwise
Result: only K/N keys remap on topology change
\`\`\`

**Virtual nodes fix uneven distribution:**
\`\`\`java
// Each physical server gets V virtual positions
for (int i = 0; i < virtualNodes; i++) {
    long pos = hash(server.id + "#vnode-" + i);
    ring.put(pos, server);
}
// With 150 vnodes: ~10% load variance vs 200% with 1 vnode
\`\`\`

**Used by:** Cassandra (256 vnodes default), DynamoDB, Redis Cluster (16384 hash slots), Memcached client libraries, Chord DHT

**Weighted assignment:** More powerful server → more vnodes → proportionally more keys`,
      followUps:["How does Redis Cluster implement consistent hashing?","What is a hot spot in consistent hashing and how do you fix it?","How does Cassandra handle resharding with consistent hashing?"]
    },
    {
      id:"sd-cap-skill",
      area:"sysdesign", icon:"⬡",
      title:"CAP & Consistency Models",
      desc:"CP vs AP, strong/eventual, linearisability",
      topicId:"sd-db-cap",
      response:`⬡ **CAP Theorem & Consistency Models**

**CAP:** In a distributed system, choose 2 of 3:
• **C**onsistency — every read returns most recent write
• **A**vailability — every request gets a response
• **P**artition tolerance — works despite network splits

**In practice:** Partitions happen → choose CP or AP:

| System | Choice | Use case |
|---|---|---|
| Zookeeper, etcd | CP | Leader election, config |
| Cassandra default | AP | High-write IoT, logs |
| DynamoDB strong read | CP | Financial reads |
| DynamoDB eventual | AP | Shopping cart |
| PostgreSQL multi-AZ | CP | Transactions |

**Consistency spectrum:**
\`\`\`
Eventual → Monotonic Read → Read-Your-Writes → Session → Causal → Linearisable
(weakest, fastest)                                                (strongest, slowest)
\`\`\`

**PACELC (more practical):**
Even without partitions: trade-off between Latency and Consistency.
\`\`\`
Cassandra QUORUM read: consistent but slow (multi-node)
Cassandra ONE read: fast but potentially stale
\`\`\`

**Interview rule:** When asked "how do you ensure consistency?" — state the level (eventual vs strong) and justify with the use case.`,
      followUps:["When would you choose eventual consistency for a financial system?","Explain how Google Spanner achieves global linearisability","What are CRDTs and when do you use them?"]
    },
    {
      id:"sd-kafka-design-skill",
      area:"sysdesign", icon:"⬡",
      title:"Kafka Architecture",
      desc:"Partitions, ISR, consumer groups, EOS",
      topicId:"sd-kafka-arch",
      response:`⬡ **Kafka Architecture — Deep Dive**

**Core components:**
\`\`\`
Producer → [Broker (Leader)] → [Followers (ISR)]
                   ↓
           Consumer Group (each partition → 1 consumer)
\`\`\`

**Partition selection:**
\`\`\`java
// Key-based: same key → same partition → ordered delivery
producer.send(new ProducerRecord<>("orders", orderId, event));
// No key: round-robin distribution
\`\`\`

**ISR (In-Sync Replicas):**
• Replicas fully caught up with leader
• \`acks=all\` waits for all ISR before ACK
• If ISR count < \`min.insync.replicas\` → producer exception

**Consumer group rebalancing:**
• Triggered by: member join/leave, partition change, heartbeat timeout
• During rebalance: all consumption stops (stop-the-world)
• Fix: static membership (\`group.instance.id\`) → no rebalance on restart

**Throughput formula:**
\`\`\`
Max throughput = num_partitions × consumer_throughput_per_partition
LinkedIn: 1 topic with 1000 partitions × 10MB/s = 10GB/s
\`\`\`

**Retention strategies:**
• Time-based: \`retention.ms=604800000\` (7 days)
• Size-based: \`retention.bytes=10737418240\` (10GB)
• Log compaction: keep latest value per key (changelog topics)`,
      followUps:["How does Kafka handle leader election?","What is the difference between Kafka and RabbitMQ?","How do you implement exactly-once processing end-to-end?"]
    },
    {
      id:"sd-video-skill",
      area:"sysdesign", icon:"⬡",
      title:"Design: Video Platform",
      desc:"Netflix/YouTube — upload, transcode, CDN",
      topicId:"sd-case-video-platform",
      response:`⬡ **Video Platform — Design (Netflix/YouTube)**

**Upload pipeline:**
\`\`\`
1. Client: split into 5MB chunks, parallel upload to S3 (presigned URLs)
2. S3 trigger → SQS → Transcoding workers
3. FFmpeg: split video → 4s segments → transcode to 6 resolutions in parallel
4. Generate HLS manifest (.m3u8) + DASH manifest (.mpd)
5. Push segments to CDN PoPs (pre-warm popular content)
\`\`\`

**Adaptive bitrate (HLS):**
\`\`\`m3u8
#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
https://cdn/video/1080p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
https://cdn/video/360p/playlist.m3u8
\`\`\`
Player picks quality based on measured bandwidth. Switches every 4s segment.

**Storage math (YouTube scale):**
\`\`\`
500 hours/minute × 60 min × 6 resolutions × 1GB/hour = 180TB/day
S3 at $0.023/GB = $4,140/day storage (before lifecycle rules)
Lifecycle: → S3 IA after 30 days → Glacier after 1 year
\`\`\`

**Recommendation:** Two-stage:
1. Candidate generation: ALS matrix factorisation (1M videos → 100)
2. Ranking: neural network (watch history, freshness, CTR) → 20 videos`,
      followUps:["How does Netflix's Open Connect CDN work?","How do you implement video scrubbing (seek) efficiently?","How does DRM (Widevine/FairPlay) integrate into the streaming pipeline?"]
    }
  ]
};

/* ── Flat index by id ─── */
window.SKILLS_BY_ID = {};
Object.values(window.SKILLS_REGISTRY).forEach(skills =>
  skills.forEach(s => { window.SKILLS_BY_ID[s.id] = s; })
);
