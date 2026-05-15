(function() {
  var topic = {
    id: "java-concurrency",
    area: "java",
    title: "Concurrency: Threads, Executors, Virtual Threads",
    tag: "Concurrency",
    tags: ["threads", "executor", "loom", "virtual threads", "concurrency"],

    flow: {
      title: 'Thread Lifecycle — NEW → RUNNABLE → RUNNING → BLOCKED → DONE',
      caption: 'Click any stage or press Play to animate the full lifecycle',
      nodes: [
        { id: 'new',        label: 'NEW',             hint: 'Thread object created, no OS thread yet' },
        { id: 'runnable',   label: 'RUNNABLE',         hint: 'Ready in run queue, waiting for CPU' },
        { id: 'running',    label: 'RUNNING',          hint: 'Executing on CPU (carrier thread)' },
        { id: 'blocked',    label: 'BLOCKED / WAITING',hint: 'Waiting for lock, I/O, or sleep' },
        { id: 'terminated', label: 'TERMINATED',       hint: 'run() returned or exception thrown' },
      ],
      steps: [
        {
          path: ['new'],
          label: 'new Thread(task) — object in heap, no OS thread',
          detail: 'Platform thread: JVM creates a Thread object but NO OS thread yet. Virtual thread: same — just a cheap JVM object. 10,000 virtual thread objects cost ~1MB total. Same as 1 platform thread stack.'
        },
        {
          path: ['new','runnable'],
          label: 'thread.start() — enters run queue',
          detail: 'Platform: OS allocates ~1MB stack, adds to OS scheduler queue. Virtual: JVM adds to ForkJoinPool work-stealing queue. No OS thread allocated until it actually runs.'
        },
        {
          path: ['runnable','running'],
          label: 'CPU time slice granted — RUNNING',
          detail: 'Platform thread: OS picks it, context-switch happens. Virtual thread: JVM "mounts" it onto a carrier OS thread. Your code runs. Both look identical from inside run().'
        },
        {
          path: ['running','blocked'],
          label: 'Blocking I/O or lock wait — KEY DIFFERENCE!',
          detail: '🔴 Platform thread: OS BLOCKS the entire OS thread. 200 blocked platform threads = 200 wasted OS threads. 🟢 Virtual thread: JVM detects blocking, PARKS the vthread, UNMOUNTS from carrier. Carrier is INSTANTLY FREE to run other vthreads!'
        },
        {
          path: ['blocked','runnable'],
          label: 'I/O complete / lock acquired — back to RUNNABLE',
          detail: 'Platform: OS wakes the blocked OS thread, re-queues it. Virtual: JVM marks the parked vthread runnable again. It will REMOUNT on any available carrier — possibly a different core than before. All transparent to your code.'
        },
        {
          path: ['running','terminated'],
          label: 'run() returns → TERMINATED',
          detail: 'Task complete. ExecutorService wraps result in Future/CompletableFuture. Thread object eligible for GC. Platform thread: OS thread destroyed or returned to pool. Virtual thread: JVM object collected. Cost: near zero.'
        },
      ]
    },

    uml: {
      title: 'Virtual Thread I/O — 10,000 Requests with 8 Carrier Threads',
      scenario: 'A database call blocks for 50ms. With virtual threads, 8 OS threads serve thousands simultaneously.',
      actors: [
        { id: 'client',   label: 'Client',    hint: '10,000 HTTP requests' },
        { id: 'exec',     label: 'Executor',  hint: 'newVirtualThreadPerTaskExecutor()' },
        { id: 'vt',       label: 'VThread',   hint: 'One per request, ~hundreds of bytes' },
        { id: 'carrier',  label: 'Carrier',   hint: 'OS thread (1 of N_CORES)' },
        { id: 'db',       label: 'Database',  hint: 'Blocking JDBC — 50ms latency' },
      ],
      messages: [
        {
          from: 'client', to: 'exec',
          label: 'executor.submit(handleRequest)',
          detail: 'Client fires 10,000 requests. Each submit() call is O(1). Executor creates a new virtual thread per task — all 10,000 created instantly.'
        },
        {
          from: 'exec', to: 'vt',
          label: 'new VirtualThread(task) — microseconds, ~200 bytes',
          detail: 'JVM creates a virtual thread. Stack is heap-allocated, starts tiny (~hundreds of bytes). Compare: platform thread = ~1MB stack allocated upfront.'
        },
        {
          from: 'vt', to: 'carrier',
          label: 'JVM mounts vthread on carrier',
          detail: 'JVM ForkJoinPool scheduler picks an idle carrier OS thread and mounts the vthread. The vthread\'s stack is "transplanted" onto the carrier. Execution begins.'
        },
        {
          from: 'carrier', to: 'db',
          label: 'connection.executeQuery() — blocking I/O starts',
          detail: 'Code hits a blocking JDBC call. Network packet sent to DB. Now we wait 50ms. THIS is the critical moment.', type: 'async'
        },
        {
          from: 'vt', to: 'carrier',
          label: '⚡ PARK: vthread unmounts — carrier immediately FREE',
          detail: 'JVM intercepts the blocking syscall. Saves vthread state (stack + locals) to heap. UNMOUNTS it from the carrier. The carrier OS thread is IMMEDIATELY available for other work. No wasted OS thread sitting idle!'
        },
        {
          from: 'carrier', to: 'vt',
          label: 'Carrier picks up 999 other vthreads while waiting',
          detail: 'The same carrier now mounts other vthreads from the queue. 8 carriers serve thousands of blocked vthreads multiplexed. Like async/reactive — but your code is plain blocking!', type: 'async'
        },
        {
          from: 'db', to: 'vt',
          label: 'DB response arrives → vthread unparked',
          detail: 'NIO selector detects DB response. JVM marks the parked vthread RUNNABLE again. Adds to ForkJoinPool work queue.', type: 'async'
        },
        {
          from: 'vt', to: 'carrier',
          label: 'Remount on any free carrier — continues from exact point',
          detail: 'JVM picks any available carrier, mounts the vthread. Execution resumes at the exact bytecode after the blocking call. ThreadLocal still intact. No callbacks. No async/await. Just normal code.'
        },
        {
          from: 'vt', to: 'client',
          label: 'Response returned → Future.complete()',
          detail: 'handleRequest() returns normally. CompletableFuture completes. HTTP response sent. Virtual thread discarded — no pool needed, they\'re too cheap to reuse.'
        },
      ]
    },

    architecture: {
      title: 'Java Concurrency — Three Layers',
      caption: 'Click any component to understand its production responsibility',
      lanes: [
        {
          label: '① OS Layer',
          hint: 'Hardware + kernel scheduled',
          nodes: [
            {
              id: 'os-thread',
              label: 'OS Thread',
              badge: '~1MB stack',
              hint: 'Expensive. ~microsecond context-switch. Limited to few thousands per JVM. Platform threads map 1:1 here. Virtual threads do NOT — they share a tiny pool of carrier OS threads.'
            },
            {
              id: 'cpu-core',
              label: 'CPU Core(s)',
              badge: 'N=cores',
              hint: 'Virtual thread carriers = typically N_CORES. This tiny pool serves millions of virtual threads via multiplexing — exactly like how async I/O works, but invisible to your code.'
            },
          ]
        },
        {
          label: '② JVM Layer',
          hint: 'JVM scheduler + memory model',
          nodes: [
            {
              id: 'vt-scheduler',
              label: 'VThread Scheduler',
              badge: 'ForkJoinPool',
              hint: 'Work-stealing ForkJoinPool. Mounts/parks/unmounts virtual threads. Configured via -Djava.util.concurrent.ForkJoinPool.common.parallelism. Do NOT size this for I/O — size your downstream resources instead.'
            },
            {
              id: 'jmm',
              label: 'Java Memory Model',
              badge: 'JMM',
              hint: 'Defines happens-before. volatile write → happens-before → subsequent volatile read on any thread. synchronized exit → happens-before → monitor entry. final fields safely published after constructor if this not leaked.'
            },
            {
              id: 'carrier-pool',
              label: 'Carrier Thread Pool',
              badge: 'N=cores fixed',
              hint: 'Fixed-size OS thread pool. Each carrier multiplexes thousands of virtual threads. NEVER pool virtual threads on top of this — they\'re designed to be created per task.'
            },
          ]
        },
        {
          label: '③ App Layer',
          hint: 'APIs your code uses',
          nodes: [
            {
              id: 'executor',
              label: 'ExecutorService',
              badge: 'newVirtualThreadPerTaskExecutor',
              hint: 'Use Executors.newVirtualThreadPerTaskExecutor() for Java 21+. Lifecycle management, task queue, Future/CompletableFuture. submit() returns immediately, task runs on a virtual thread.'
            },
            {
              id: 'cf',
              label: 'CompletableFuture',
              badge: 'async chains',
              hint: 'thenApply/thenCompose/handle/whenComplete. Composes async pipelines. With virtual threads: often unnecessary — just write blocking code sequentially. CF still useful for fan-out (allOf/anyOf).'
            },
            {
              id: 'structured',
              label: 'StructuredConcurrency',
              badge: 'Java 21 preview',
              hint: 'StructuredTaskScope: subtasks bound to parent lifetime. Auto-cancel all on first failure. ShutdownOnFailure / ShutdownOnSuccess policies. Prevents thread leaks in fork-join patterns.'
            },
            {
              id: 'lock-api',
              label: 'ReentrantLock / StampedLock',
              badge: 'use over synchronized',
              hint: 'IMPORTANT: synchronized blocks PINS virtual threads (prevents unmounting during blocking). Use ReentrantLock.lock() instead — virtual thread can park and unmount while waiting. StampedLock for read-heavy: tryOptimisticRead() avoids lock entirely.'
            },
          ]
        }
      ],
      links: [
        { from: 'executor',    to: 'vt-scheduler', label: 'submit(task) creates + schedules vthread',    type: 'sync' },
        { from: 'vt-scheduler', to: 'carrier-pool', label: 'mount vthread onto carrier',                  type: 'sync' },
        { from: 'carrier-pool', to: 'os-thread',    label: 'carrier IS an OS thread',                    type: 'sync' },
        { from: 'jmm',         to: 'lock-api',      label: 'happens-before via lock acquire/release',    type: 'sync' },
        { from: 'cf',          to: 'executor',      label: 'thenApply runs on executor',                 type: 'async' },
        { from: 'structured',  to: 'executor',      label: 'fork() uses virtual threads',                type: 'sync' },
      ]
    },

    visual: function(mount) {
      mount.innerHTML = `
        <style>
          .ct-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .ct-title { font-size: 11px; color: #768390; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
          .ct-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .ct-col { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 12px; }
          .ct-col-head { font-size: 11px; font-weight: bold; margin-bottom: 8px; text-align: center; padding: 4px; border-radius: 4px; }
          .ct-col-head.platform { background: #3d1f1f; color: #f47067; }
          .ct-col-head.pool { background: #1f2d3d; color: #6cb6ff; }
          .ct-col-head.vthread { background: #1f3d2d; color: #57ab5a; }
          .ct-threads { display: flex; flex-wrap: wrap; gap: 4px; min-height: 80px; align-content: flex-start; }
          .ct-thread { border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; transition: all 0.3s; }
          .ct-thread.platform { width: 48px; height: 28px; background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .ct-thread.platform.busy { background: #f47067; color: #1c2128; }
          .ct-thread.platform.blocked { background: #5a1f1f; border-color: #f47067; color: #f47067; opacity: 0.5; }
          .ct-thread.vt { width: 14px; height: 14px; border-radius: 3px; background: #1f3d2d; border: 1px solid #57ab5a; }
          .ct-thread.vt.running { background: #57ab5a; }
          .ct-thread.vt.parked { background: #1f3d2d; border-color: #347d39; opacity: 0.6; }
          .ct-thread.vt.done { background: #2f363d; border-color: #444; opacity: 0.3; }
          .ct-stat { font-size: 10px; color: #768390; margin-top: 6px; text-align: center; }
          .ct-stat strong { color: #cdd9e5; }
          .ct-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 10px; color: #768390; margin-bottom: 10px; }
          .ct-legend-item { display: flex; align-items: center; gap: 4px; }
          .ct-dot { width: 10px; height: 10px; border-radius: 2px; }
          .ct-controls { display: flex; gap: 8px; margin-bottom: 12px; }
          .ct-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .ct-btn:hover { background: #30363d; }
          .ct-btn.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .ct-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; margin-top: 8px; min-height: 36px; }
          .ct-info strong { color: #e3b341; }
        </style>
        <div class="ct-wrap">
          <div class="ct-title">Live Comparison — Platform Threads vs Virtual Threads under I/O Load</div>
          <div class="ct-controls">
            <button class="ct-btn" id="ct-sim-io">Simulate 20 I/O requests</button>
            <button class="ct-btn" id="ct-reset">Reset</button>
          </div>
          <div class="ct-legend">
            <div class="ct-legend-item"><div class="ct-dot" style="background:#f47067"></div> Running</div>
            <div class="ct-legend-item"><div class="ct-dot" style="background:#5a1f1f;border:1px solid #f47067"></div> Blocked (wasted OS thread)</div>
            <div class="ct-legend-item"><div class="ct-dot" style="background:#57ab5a"></div> VThread running</div>
            <div class="ct-legend-item"><div class="ct-dot" style="background:#1f3d2d;border:1px solid #57ab5a"></div> VThread parked (free carrier!)</div>
          </div>
          <div class="ct-grid">
            <div class="ct-col">
              <div class="ct-col-head platform">Platform Threads (1:1 OS)</div>
              <div class="ct-threads" id="ct-platform"></div>
              <div class="ct-stat" id="ct-p-stat">Idle</div>
            </div>
            <div class="ct-col">
              <div class="ct-col-head pool">ExecutorService (fixed pool)</div>
              <div class="ct-threads" id="ct-pool"></div>
              <div class="ct-stat" id="ct-pool-stat">Idle</div>
            </div>
            <div class="ct-col">
              <div class="ct-col-head vthread">Virtual Threads (JVM)</div>
              <div class="ct-threads" id="ct-vthread"></div>
              <div class="ct-stat" id="ct-vt-stat">Idle</div>
            </div>
          </div>
          <div class="ct-info" id="ct-info">Click "Simulate 20 I/O requests" to see the difference. Watch how platform threads get stuck while virtual threads park and free up carriers.</div>
        </div>`;

      const pEl = mount.querySelector('#ct-platform');
      const poolEl = mount.querySelector('#ct-pool');
      const vtEl = mount.querySelector('#ct-vthread');
      const pStat = mount.querySelector('#ct-p-stat');
      const poolStat = mount.querySelector('#ct-pool-stat');
      const vtStat = mount.querySelector('#ct-vt-stat');
      const info = mount.querySelector('#ct-info');
      const N = 20;
      let timers = [];

      function reset() {
        timers.forEach(clearTimeout);
        timers = [];
        pEl.innerHTML = '';
        poolEl.innerHTML = '';
        vtEl.innerHTML = '';
        pStat.innerHTML = 'Idle';
        poolStat.innerHTML = 'Idle';
        vtStat.innerHTML = 'Idle';
        info.innerHTML = 'Click "Simulate 20 I/O requests" to see the difference.';
      }

      function simulate() {
        reset();
        // Platform: 1 OS thread per request, all block
        for (let i = 0; i < N; i++) {
          const t = document.createElement('div');
          t.className = 'ct-thread platform';
          t.textContent = 'T' + (i+1);
          pEl.appendChild(t);
          const delay = i * 80;
          timers.push(setTimeout(() => {
            t.classList.add('busy');
            t.textContent = 'RUN';
            pStat.innerHTML = '<strong>' + (i+1) + '</strong> OS threads allocated';
          }, delay));
          timers.push(setTimeout(() => {
            t.classList.remove('busy');
            t.classList.add('blocked');
            t.textContent = 'I/O';
            pStat.innerHTML = '<strong>' + N + '</strong> OS threads BLOCKED on I/O 🔴';
          }, delay + 200));
        }
        timers.push(setTimeout(() => {
          info.innerHTML = '<strong>Platform threads:</strong> 20 requests = 20 OS threads, all blocked. 20 MB stack memory wasted. No new requests can be served without more threads!';
        }, N * 80 + 400));

        // Pool: fixed 4 threads, queue builds up
        const poolSize = 4;
        for (let i = 0; i < poolSize; i++) {
          const t = document.createElement('div');
          t.className = 'ct-thread platform';
          t.textContent = 'W' + (i+1);
          poolEl.appendChild(t);
        }
        const poolThreads = poolEl.querySelectorAll('.ct-thread');
        let queued = 0;
        for (let i = 0; i < N; i++) {
          const ti = i % poolSize;
          const delay = i * 80;
          timers.push(setTimeout(() => {
            if (i < poolSize) {
              poolThreads[ti].classList.add('busy');
              poolThreads[ti].textContent = 'RUN';
            } else {
              queued++;
              poolStat.innerHTML = '<strong>' + queued + '</strong> tasks queued (pool full)';
            }
          }, delay));
          timers.push(setTimeout(() => {
            if (i < poolSize) {
              poolThreads[ti].classList.remove('busy');
              poolThreads[ti].classList.add('blocked');
              poolThreads[ti].textContent = 'I/O';
              poolStat.innerHTML = '<strong>' + poolSize + '</strong> pool threads BLOCKED, <strong>' + (N - poolSize) + '</strong> queued 🔴';
            }
          }, delay + 200));
        }

        // Virtual threads: N vthreads, carriers free during I/O
        for (let i = 0; i < N; i++) {
          const t = document.createElement('div');
          t.className = 'ct-thread vt';
          vtEl.appendChild(t);
          const delay = i * 40;
          timers.push(setTimeout(() => {
            t.classList.add('running');
            vtStat.innerHTML = '<strong>' + (i+1) + '</strong> vthreads running (carriers: 4)';
          }, delay));
          timers.push(setTimeout(() => {
            t.classList.remove('running');
            t.classList.add('parked');
            vtStat.innerHTML = '<strong>' + N + '</strong> vthreads parked 🟢 carriers FREE!';
          }, delay + 150));
          timers.push(setTimeout(() => {
            t.classList.remove('parked');
            t.classList.add('running');
            vtStat.innerHTML = '<strong>' + N + '</strong> I/O done — all remount';
          }, delay + 1200));
          timers.push(setTimeout(() => {
            t.classList.remove('running');
            t.classList.add('done');
            vtStat.innerHTML = '<strong>' + N + '</strong> requests complete ✓';
          }, delay + 1500));
        }
        timers.push(setTimeout(() => {
          info.innerHTML = '<strong>Virtual threads:</strong> 20 vthreads park during I/O — only 4 carrier OS threads needed. Carriers immediately free to run other work. Same throughput as reactive, but <em>plain blocking code</em>!';
        }, N * 40 + 1600));
      }

      mount.querySelector('#ct-sim-io').addEventListener('click', simulate);
      mount.querySelector('#ct-reset').addEventListener('click', reset);
    },

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
