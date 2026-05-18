(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    "java-virtual-threads",
    area:  "java",
    title: "Virtual Threads (Project Loom)",
    tag:   "Concurrency",
    tags:  ["java", "virtual-threads", "project-loom", "concurrency", "java21"],

    concept: "Virtual threads (Java 21 GA) are lightweight JVM-managed threads. Unlike platform threads (1:1 OS thread mapping), many virtual threads multiplex onto a small pool of carrier (OS) threads. When a virtual thread blocks on I/O, the JVM unmounts it from the carrier thread — freeing the carrier to run another virtual thread. No thread pool sizing needed: create millions of virtual threads, one per task.",

    why: "Traditional thread-per-request servers bottleneck at ~10K OS threads. Reactive/async code (WebFlux, CompletableFuture) solves scale but sacrifices readability. Virtual threads give synchronous-looking code with reactive-level throughput. Spring Boot 3.2+ enables virtual threads by default with one config line.",

    example: {
      language: "java",
      code: `// Java 21 — Virtual threads
// Old way: thread pool limits concurrency
ExecutorService pool = Executors.newFixedThreadPool(200);

// New way: unbounded virtual threads
ExecutorService vThreads = Executors.newVirtualThreadPerTaskExecutor();

// One virtual thread per HTTP request — blocking I/O is fine
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<String>> futures = urls.stream()
        .map(url -> executor.submit(() -> {
            // Blocking HTTP call — carrier thread freed while waiting
            return HttpClient.newHttpClient()
                .send(HttpRequest.newBuilder(URI.create(url)).build(),
                      HttpResponse.BodyHandlers.ofString())
                .body();
        }))
        .toList();
}

// Spring Boot 3.2 — enable virtual threads
// application.properties:
// spring.threads.virtual.enabled=true

// Directly:
Thread vt = Thread.ofVirtual().name("my-vt").start(() -> {
    System.out.println("Running on: " + Thread.currentThread());
});`,
    },

    interview: [
      "What is the difference between platform threads and virtual threads?",
      "How does the JVM handle a virtual thread blocked on I/O?",
      "What is a carrier thread and how many exist by default?",
      "Why should you NOT use synchronized blocks in virtual threads?",
      "What is thread pinning and when does it occur?",
    ],

    tradeoffs: {
      pros: [
        "Millions of concurrent threads — scales with I/O bound work",
        "Synchronous code style, no callback hell or reactive chains",
        "Zero code change needed for most blocking I/O (JDBC, HTTP)",
        "JVM handles scheduling — no thread pool sizing",
      ],
      cons: [
        "CPU-bound tasks: no benefit — still need OS thread parallelism",
        "synchronized blocks pin virtual thread to carrier (cannot unmount)",
        "Thread-local variables bloat: millions of threads = millions of ThreadLocal copies",
        "Requires Java 21+ (LTS)",
      ],
    },

    gotchas: [
      "synchronized pins the virtual thread — use ReentrantLock instead in Loom-aware code",
      "Thread pools defeat the purpose — use newVirtualThreadPerTaskExecutor() not fixed pools",
      "ThreadLocal still works but memory usage explodes with millions of threads — prefer ScopedValue (Java 21)",
      "JDBC drivers may not yet support structured concurrency — check driver compatibility",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — Platform threads (old model). Each request binds an OS thread. 200-thread pool → 200 concurrent requests max. Thread blocked on DB = wasted OS thread.",
          nodes: [
            { id: "req1",  label: "Request 1",    type: "client",    active: true },
            { id: "req2",  label: "Request 2",    type: "client",    active: true },
            { id: "req3",  label: "Request 3",    type: "client",    active: true },
            { id: "pt1",   label: "OS Thread 1\n[BLOCKED on DB]", type: "reducer", active: true },
            { id: "pt2",   label: "OS Thread 2\n[BLOCKED on HTTP]", type: "reducer", active: true },
            { id: "pt3",   label: "OS Thread 3\n[BLOCKED on I/O]", type: "reducer", active: true },
          ],
          edges: [
            { from: "req1", to: "pt1", label: "1:1 binding", active: true, color: "#f85149" },
            { from: "req2", to: "pt2", label: "1:1 binding", active: true, color: "#f85149" },
            { from: "req3", to: "pt3", label: "1:1 binding", active: true, color: "#f85149" },
          ],
          code: `// Platform thread model — 1 request = 1 OS thread
ExecutorService pool = Executors.newFixedThreadPool(200);
// 201st request: QUEUED — waiting for a thread to free

// Each blocked thread wastes:
// - ~1MB stack memory
// - OS context-switch overhead
// - Thread pool slot

// Max throughput ≈ pool size × (1 / avg_wait_time)
// With 200ms avg DB wait: 200 threads → ~1000 req/s max`,
        },
        {
          phase: "render",
          narration: "Step 2 — Virtual thread model. Many virtual threads (VTs) multiplex onto few carrier (OS) threads. VT1 blocks → JVM unmounts from carrier → carrier runs VT2.",
          nodes: [
            { id: "vt1",  label: "VT-1 (waiting DB)",   type: "component", active: true, dim: true },
            { id: "vt2",  label: "VT-2 (running)",       type: "component", active: true },
            { id: "vt3",  label: "VT-3 (waiting HTTP)",  type: "component", active: true, dim: true },
            { id: "ct1",  label: "Carrier Thread 1\n(OS thread)",  type: "store", active: true },
            { id: "ct2",  label: "Carrier Thread 2\n(OS thread)",  type: "store", active: true },
          ],
          edges: [
            { from: "vt2", to: "ct1", label: "mounted (running)", active: true, color: "#3fb950" },
            { from: "vt1", to: "ct1", label: "unmounted (parked)", active: false },
            { from: "vt3", to: "ct2", label: "unmounted (parked)", active: false },
          ],
          code: `// Virtual thread model
// Carrier threads: typically #CPU cores (e.g., 8)
// Virtual threads: millions — one per task

Thread.ofVirtual().start(() -> {
    // This blocks the VIRTUAL thread, not the carrier
    String result = httpClient.send(request, handler).body();
    // While waiting: carrier thread runs other VTs
    // When response arrives: VT re-mounted on a carrier
});

// JVM stack: virtual thread stack stored on heap
// Carrier freed → zero wasted OS resources during I/O wait`,
        },
        {
          phase: "effect",
          narration: "Step 3 — VT blocking sequence. VT1 calls DB query → blocks → JVM saves VT1 stack to heap → carrier thread picks up VT2 → DB responds → VT1 re-scheduled.",
          nodes: [
            { id: "vt1b",  label: "VT-1",              type: "component", active: true },
            { id: "db",    label: "DB query\n(blocking)", type: "network", active: true },
            { id: "heap",  label: "VT-1 stack\nsaved to heap",  type: "cache",  active: true },
            { id: "ct",    label: "Carrier Thread\nnow runs VT-2", type: "store", active: true },
            { id: "vt2b",  label: "VT-2 runs",          type: "component", active: true },
            { id: "resched", label: "DB responds →\nVT-1 re-queued", type: "action", active: true },
          ],
          edges: [
            { from: "vt1b",    to: "db",      label: "JDBC query", active: true },
            { from: "db",      to: "heap",    label: "park VT-1", active: true, color: "#d2a8ff" },
            { from: "heap",    to: "ct",      label: "carrier freed", active: true, color: "#3fb950" },
            { from: "ct",      to: "vt2b",    label: "mount VT-2", active: true, color: "#3fb950" },
            { from: "db",      to: "resched", label: "response", active: true, color: "#ffa657" },
            { from: "resched", to: "ct",      label: "VT-1 back on queue", active: true },
          ],
          code: `// JVM intercepts blocking calls in java.io / java.net / JDBC
// Old blocking: Thread.sleep() / socket.read() / DB.query()
// With Loom: these become VT-aware park/unpark

// What happens at jdbc.executeQuery():
// 1. VT-1 calls query
// 2. JVM detects blocking I/O
// 3. VT-1 state serialized to heap (continuation)
// 4. Carrier thread unmounts VT-1
// 5. Carrier picks up next runnable VT
// 6. DB response arrives → VT-1 re-queued on scheduler
// 7. Next available carrier mounts VT-1, execution resumes`,
        },
        {
          phase: "commit",
          narration: "Step 4 — Thread pinning danger. synchronized block prevents unmounting. VT1 holds carrier hostage during I/O wait — back to platform thread behavior.",
          nodes: [
            { id: "vtp",   label: "VT-1\nsynchronized(lock)",  type: "component", active: true },
            { id: "iop",   label: "I/O inside sync block",     type: "network",   active: true },
            { id: "pin",   label: "PINNED!\nCarrier cannot run others", type: "reducer", active: true },
            { id: "fix",   label: "Fix: ReentrantLock\n(Loom-aware)", type: "action", active: true },
          ],
          edges: [
            { from: "vtp", to: "iop", label: "blocks", active: true, color: "#f85149" },
            { from: "iop", to: "pin", label: "pinned!", active: true, color: "#f85149" },
            { from: "fix", to: "vtp", label: "use instead", active: true, color: "#3fb950" },
          ],
          code: `// BAD — synchronized pins carrier thread during I/O
synchronized (lock) {
    String data = httpClient.send(req, handler).body(); // BLOCKS carrier
    // Carrier thread CANNOT unmount VT here — pinned!
}

// GOOD — ReentrantLock allows unmounting
ReentrantLock lock = new ReentrantLock();
lock.lock();
try {
    String data = httpClient.send(req, handler).body(); // VT can unmount
} finally {
    lock.unlock();
}

// Java 24 preview: synchronized will not pin (fix in progress)
// Until then: replace synchronized with ReentrantLock in hot paths`,
        },
        {
          phase: "effect",
          narration: "Step 5 — Structured Concurrency (Java 21). StructuredTaskScope fans out subtasks, waits for all, propagates cancellation as a unit.",
          nodes: [
            { id: "scope",  label: "StructuredTaskScope",    type: "provider",  active: true },
            { id: "fork1",  label: "fork: fetchUser()",      type: "component", active: true },
            { id: "fork2",  label: "fork: fetchOrders()",    type: "component", active: true },
            { id: "fork3",  label: "fork: fetchBalance()",   type: "component", active: true },
            { id: "join",   label: "scope.join() — await all", type: "action",  active: true },
            { id: "result", label: "all results combined",   type: "store",     active: true },
          ],
          edges: [
            { from: "scope",  to: "fork1", label: "virtual thread", active: true, color: "#3fb950" },
            { from: "scope",  to: "fork2", label: "virtual thread", active: true, color: "#3fb950" },
            { from: "scope",  to: "fork3", label: "virtual thread", active: true, color: "#3fb950" },
            { from: "fork1",  to: "join",  label: "done", active: true },
            { from: "fork2",  to: "join",  label: "done", active: true },
            { from: "fork3",  to: "join",  label: "done", active: true },
            { from: "join",   to: "result", label: "all complete", active: true, color: "#ffa657" },
          ],
          code: `// Structured Concurrency — Java 21 (preview → stable 22+)
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

    Subtask<User>    user    = scope.fork(() -> fetchUser(id));
    Subtask<Orders>  orders  = scope.fork(() -> fetchOrders(id));
    Subtask<Balance> balance = scope.fork(() -> fetchBalance(id));

    scope.join();           // wait for ALL forks
    scope.throwIfFailed();  // propagate any error

    return new Dashboard(
        user.get(),
        orders.get(),
        balance.get()
    );
}
// All 3 fetch in parallel on virtual threads
// If any fails → others cancelled automatically
// No CompletableFuture chain needed`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Virtual Threads (Project Loom)",
        time:  "O(1) scheduling",
        space: "O(VT count)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML =
            window.ReactViz.label("CODE") +
            window.ReactViz.codeBlock(step.code, "java");
        },
      });
    },
  }]);
})();
