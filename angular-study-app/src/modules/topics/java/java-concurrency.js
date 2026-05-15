(function() {
  var topic = {
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
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
