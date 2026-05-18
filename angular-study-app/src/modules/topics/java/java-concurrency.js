(function() {
  var topic = {
    id: "java-concurrency",
    area: "java",
    title: "Concurrency: Threads, Executors, Locks & Synchronizers",
    tag: "Concurrency",
    tags: ["threads", "executor", "loom", "virtual threads", "reentrantlock", "semaphore", "countdownlatch", "cyclic barrier", "concurrency"],

    flow: {
      title: "Thread Lifecycle — NEW → RUNNABLE → RUNNING → BLOCKED → TERMINATED",
      caption: "Click any stage or press Play to animate the full lifecycle",
      nodes: [
        { id: "new",        label: "NEW",              hint: "Thread object created, no OS thread yet" },
        { id: "runnable",   label: "RUNNABLE",          hint: "Ready in run queue, waiting for CPU" },
        { id: "running",    label: "RUNNING",           hint: "Executing on CPU (carrier thread)" },
        { id: "blocked",    label: "BLOCKED / WAITING", hint: "Waiting for lock, I/O, or sleep" },
        { id: "terminated", label: "TERMINATED",        hint: "run() returned or exception thrown" },
      ],
      steps: [
        { path: ["new"],           label: "new Thread(task) — object in heap, no OS thread", detail: "Platform thread: JVM creates a Thread object but NO OS thread yet. Virtual thread: same — just a cheap JVM object. 10,000 virtual thread objects cost ~1MB total. Same as 1 platform thread stack." },
        { path: ["new","runnable"],label: "thread.start() — enters run queue", detail: "Platform: OS allocates ~1MB stack, adds to OS scheduler queue. Virtual: JVM adds to ForkJoinPool work-stealing queue. No OS thread allocated until it actually runs." },
        { path: ["runnable","running"], label: "CPU time slice granted — RUNNING", detail: "Platform thread: OS picks it, context-switch happens. Virtual thread: JVM \"mounts\" it onto a carrier OS thread. Your code runs. Both look identical from inside run()." },
        { path: ["running","blocked"], label: "Blocking I/O or lock wait — KEY DIFFERENCE!", detail: "🔴 Platform thread: OS BLOCKS the entire OS thread. 200 blocked platform threads = 200 wasted OS threads. 🟢 Virtual thread: JVM detects blocking, PARKS the vthread, UNMOUNTS from carrier. Carrier INSTANTLY FREE to run other vthreads!" },
        { path: ["blocked","runnable"], label: "I/O complete / lock acquired — back to RUNNABLE", detail: "Platform: OS wakes the blocked OS thread. Virtual: JVM marks the parked vthread runnable again, remounts on any available carrier. Transparent to your code." },
        { path: ["running","terminated"], label: "run() returns → TERMINATED", detail: "Task complete. ExecutorService wraps result in Future/CompletableFuture. Platform thread destroyed or returned to pool. Virtual thread: JVM object collected. Cost: near zero." },
      ]
    },

    uml: {
      title: "Virtual Thread I/O — 10,000 Requests with 8 Carrier Threads",
      scenario: "A database call blocks for 50ms. With virtual threads, 8 OS threads serve thousands simultaneously.",
      actors: [
        { id: "client",  label: "Client",   hint: "10,000 HTTP requests" },
        { id: "exec",    label: "Executor", hint: "newVirtualThreadPerTaskExecutor()" },
        { id: "vt",      label: "VThread",  hint: "One per request, ~hundreds of bytes" },
        { id: "carrier", label: "Carrier",  hint: "OS thread (1 of N_CORES)" },
        { id: "db",      label: "Database", hint: "Blocking JDBC — 50ms latency" },
      ],
      messages: [
        { from:"client", to:"exec",   label:"executor.submit(handleRequest)", detail:"Client fires 10,000 requests. Each submit() call is O(1). Executor creates a new virtual thread per task — all 10,000 created instantly." },
        { from:"exec",   to:"vt",     label:"new VirtualThread(task) — microseconds", detail:"JVM creates virtual thread. Stack is heap-allocated, starts tiny (~hundreds of bytes). Compare: platform thread = ~1MB stack allocated upfront." },
        { from:"vt",     to:"carrier",label:"JVM mounts vthread on carrier", detail:"JVM ForkJoinPool scheduler picks an idle carrier OS thread and mounts the vthread. Execution begins." },
        { from:"carrier",to:"db",     label:"executeQuery() — blocking I/O starts", detail:"Code hits a blocking JDBC call. Now we wait 50ms. THIS is the critical moment.", type:"async" },
        { from:"vt",     to:"carrier",label:"⚡ PARK: vthread unmounts — carrier FREE", detail:"JVM intercepts blocking syscall. Saves vthread state to heap. UNMOUNTS it from carrier. Carrier OS thread is IMMEDIATELY available for other work!" },
        { from:"carrier",to:"vt",     label:"Carrier runs 999 other vthreads meanwhile", detail:"8 carriers serve thousands of blocked vthreads. Like async/reactive — but your code is plain blocking!", type:"async" },
        { from:"db",     to:"vt",     label:"DB response → vthread unparked", detail:"NIO selector detects response. JVM marks parked vthread RUNNABLE.", type:"async" },
        { from:"vt",     to:"carrier",label:"Remount on any free carrier — continues", detail:"JVM mounts vthread on available carrier. Execution resumes at exact bytecode. ThreadLocal intact. No callbacks." },
        { from:"vt",     to:"client", label:"Response returned → Future.complete()", detail:"handleRequest() returns. CompletableFuture completes. Virtual thread discarded." },
      ]
    },

    architecture: {
      title: "Java Concurrency — Executors, Locks & Synchronizers Map",
      caption: "Click any primitive to understand its guarantee, use case, and pitfalls",
      lanes: [
        {
          label: "① Executor Framework",
          hint: "Thread lifecycle management",
          nodes: [
            { id: "fixed-pool",   label: "newFixedThreadPool(n)",          badge: "bounded threads",   hint: "Fixed n OS threads. Tasks queued in unbounded LinkedBlockingQueue when busy. Use for CPU-bound work. Problem: queue grows unbounded under load → OOM. Add rejection policy." },
            { id: "cached-pool",  label: "newCachedThreadPool()",          badge: "dynamic threads",   hint: "Creates new threads on demand, reuses idle ones (60s TTL). Good for short bursts. Dangerous for sustained load — creates unlimited threads." },
            { id: "vt-exec",      label: "newVirtualThreadPerTaskExecutor",badge: "Java 21 default",   hint: "Creates a new virtual thread per task. Submit 10M tasks — fine. No thread pooling needed (virtual threads are too cheap to pool). For I/O-bound services: the answer." },
            { id: "fjp",          label: "ForkJoinPool (work-stealing)",   badge: "CPU-bound parallel", hint: "Recursively split tasks (fork), join results. Each thread has own deque; steals from others when idle. Used by parallelStream(), CompletableFuture.supplyAsync(). Only for CPU-bound recursive work." },
          ]
        },
        {
          label: "② Mutual Exclusion Locks",
          hint: "Ensure at most one thread in critical section",
          nodes: [
            { id: "sync",        label: "synchronized block",             badge: "JVM intrinsic",      hint: "Built-in monitor. Reentrant. JVM optimizes: biased locking → thin lock → fat lock. PROBLEM: pins virtual threads during blocking I/O — vthread cannot unmount. Use ReentrantLock instead for virtual threads." },
            { id: "rl",          label: "ReentrantLock",                  badge: "try/interrupt/timed", hint: "Same semantics as synchronized but: tryLock(timeout), lockInterruptibly(), lock() + Condition.await() (allows vthread to unmount). Must unlock() in finally. More verbose but more powerful." },
            { id: "rwl",         label: "ReadWriteLock",                  badge: "read-concurrent",    hint: "Multiple readers OR one writer. ReadLock: concurrent. WriteLock: exclusive. Writer starvation risk with many readers. Use for read-heavy shared state (caches, config). ReentrantReadWriteLock implementation." },
            { id: "stamped",     label: "StampedLock",                    badge: "optimistic reads",   hint: "Three modes: WriteLock, ReadLock, OPTIMISTIC READ (no lock!). Optimistic: read without lock, validate(stamp) to check if write happened. If validation fails, retry with real read lock. Fastest for read-dominant." },
          ]
        },
        {
          label: "③ Counting Synchronizers",
          hint: "Coordinate threads by count",
          nodes: [
            { id: "sem",  label: "Semaphore(n)",        badge: "rate limit / pool",   hint: "n permits. acquire() blocks when 0 permits. release() adds permit. Bounds concurrency: Semaphore(10) = max 10 threads in section. Perfect for connection pools, rate limiting. Not reentrant." },
            { id: "cdl",  label: "CountDownLatch(n)",   badge: "one-time gate",       hint: "Threads call await() to wait. n countDown() calls to open. ONE-SHOT: cannot reset. Pattern: start n workers, main thread latch.await() until all done. Or: main thread ready, fire n workers simultaneously." },
            { id: "cb",   label: "CyclicBarrier(n)",    badge: "reusable rendezvous", hint: "All n threads call await() — last one trips the barrier. All released together. REUSABLE (unlike CDL). Optional Runnable fires when barrier trips. Use for parallel phase synchronization (game loop, parallel matrix ops)." },
            { id: "phaser",label: "Phaser",             badge: "dynamic phases",      hint: "Like CyclicBarrier but: dynamic party count (register/deregister), multiple phases, hierarchical phasers. Most powerful but most complex. Use when party count changes between phases." },
          ]
        },
        {
          label: "④ Atomic & Lock-Free",
          hint: "CAS-based non-blocking primitives",
          nodes: [
            { id: "atomic", label: "AtomicInteger / Long / Ref",  badge: "CAS single var",    hint: "Compare-and-swap loop. incrementAndGet(), compareAndSet(expected, update). Lock-free but not wait-free. Spinning CAS under high contention degrades — use LongAdder for high-frequency counters." },
            { id: "longadd",label: "LongAdder / LongAccumulator", badge: "striped counters",  hint: "Multiple internal cells, one per CPU. Each thread increments its cell. sum() combines. Faster than AtomicLong under contention. Use for metrics/counters. LongAccumulator for custom combine functions." },
            { id: "varhan", label: "VarHandle",                   badge: "JMM fine control",  hint: "Java 9+. Access object fields with volatile/acquire/release/opaque/plain semantics. Replaces Unsafe for JMM-compliant lock-free code. Use for custom data structures requiring memory-order control." },
            { id: "vol",    label: "volatile",                    badge: "visibility only",   hint: "volatile ensures write happens-before subsequent reads. NO atomicity for compound ops (check-then-act). Read/write single variable atomically (refs, longs, doubles). Used for stop flags, double-checked locking." },
          ]
        }
      ],
      links: [
        { from: "vt-exec",   to: "rl",      label: "vthreads need ReentrantLock not synchronized", type: "sync" },
        { from: "fixed-pool",to: "sem",     label: "combine: pool + semaphore for resource limits", type: "async" },
        { from: "rwl",       to: "stamped", label: "StampedLock supersedes ReadWriteLock",           type: "sync" },
        { from: "cdl",       to: "cb",      label: "CDL one-shot vs CyclicBarrier reusable",        type: "sync" },
        { from: "atomic",    to: "longadd", label: "LongAdder faster under high contention",         type: "sync" },
        { from: "fjp",       to: "vt-exec", label: "vthread scheduler IS ForkJoinPool internally",  type: "async" },
      ]
    },

    visual: function(mount) {
      const CC_TRICKS = [
        { wrong: "synchronized(lock) { dbCall(); } in a virtual thread. Assumed vthread parks, carrier is freed.", right: "synchronized PINS vthread to carrier. Carrier OS thread blocks during I/O. Use ReentrantLock — vthread parks, carrier freed." },
        { wrong: "StampedLock sl = new StampedLock(); long s1 = sl.writeLock(); long s2 = sl.writeLock(); // nested re-entry", right: "StampedLock is NOT reentrant. Second writeLock() call deadlocks forever. Never call lock() while already holding a stamp." },
        { wrong: "volatile int counter; counter++; // assumed atomic increment", right: "volatile gives visibility not atomicity. counter++ = read + increment + write (3 ops, not atomic). Use AtomicInteger.incrementAndGet()." },
        { wrong: "ReentrantLock lock = new ReentrantLock(); lock.lock(); doWork(); lock.unlock(); // outside try-finally", right: "doWork() throws exception → unlock() skipped → permanent deadlock. ALWAYS: lock.lock(); try { ... } finally { lock.unlock(); }" },
      ];
      const CC_QS = [
        { q: "Difference between virtual threads and reactive (WebFlux)?", a: "Both achieve high concurrency with few OS threads. Virtual threads keep imperative blocking programming model — linear stack traces, ThreadLocal works, easy debugging. Reactive uses async non-blocking APIs — higher throughput ceiling but steep learning curve. For most 2025 services: virtual threads are the better default." },
        { q: "Why does synchronized pin virtual threads?", a: "synchronized uses JVM monitor (biased/thin/fat lock). When a virtual thread blocks inside synchronized (e.g. waiting for I/O or lock), the JVM cannot unmount it from the carrier — the carrier OS thread blocks too. JEP 444 is fixing this for Java 25. Until then, use ReentrantLock for I/O-bound virtual-thread code." },
        { q: "CountDownLatch vs CyclicBarrier — when to use which?", a: "CountDownLatch: ONE-SHOT gate, N countDown() calls open it. Perfect for: start N workers then wait for all (or fire N workers simultaneously). Cannot reset. CyclicBarrier: ALL N threads meet at barrier, then all released together. REUSABLE — resets automatically. Use for iterative parallel phases (game loop, matrix multiply phases)." },
      ];
      const CC_PATTERNS = [
        {
          id: "race", icon: "💥", title: "Race Condition",
          subtitle: "counter++ = read + add + write (3 ops). ANY context switch between them = lost update.",
          badCode: `// ❌ NOT thread-safe
int counter = 0;

// Thread-1 and Thread-2 concurrently:
void increment() {
  counter++; // read → add → write (3 ops!)
}
// Expected: counter=2  Actual: counter=1 💥`,
          goodCode: `// ✅ Atomic CAS (Compare-And-Swap)
AtomicInteger counter = new AtomicInteger(0);

// Thread-1 and Thread-2 concurrently:
void increment() {
  counter.incrementAndGet(); // single CAS op
}
// Expected: counter=2  Actual: counter=2 ✅`,
          steps: [
            { threads: [{label:"T1",st:"idle"},{label:"T2",st:"idle"}], counter: 0, note: "Initial: counter=0. T1 and T2 both want to increment." },
            { threads: [{label:"T1",st:"run",code:"read counter → 0"},{label:"T2",st:"run",code:"read counter → 0 ← RACE!"}], counter: 0, note: "⚠️ Context switch! Both threads read counter=0 simultaneously.", error: true },
            { threads: [{label:"T1",st:"run",code:"v = 0 + 1 = 1"},{label:"T2",st:"run",code:"v = 0 + 1 = 1 ← same!"}], counter: 0, note: "Both compute 0+1=1 in their local register. Unaware of each other." },
            { threads: [{label:"T1",st:"done",code:"write counter = 1 ✓"},{label:"T2",st:"done",code:"write counter = 1 ← OVERWRITES!"}], counter: 1, note: "💥 T1 writes 1. T2 also writes 1. Expected 2, got 1. LOST UPDATE!", error: true },
          ],
          fixSteps: [
            { threads: [{label:"T1",st:"idle"},{label:"T2",st:"idle"}], counter: 0, note: "AtomicInteger uses CAS hardware instruction — atomic read+compare+write in one CPU op." },
            { threads: [{label:"T1",st:"run",code:"CAS(0 → 1) wins ✓"},{label:"T2",st:"wait",code:"CAS spinning (retry)…"}], counter: 1, note: "T1 wins CAS: 0→1 atomically. T2 detects mismatch, retries." },
            { threads: [{label:"T1",st:"done",code:"done ✓"},{label:"T2",st:"run",code:"CAS(1 → 2) wins ✓"}], counter: 2, note: "✅ T2 wins CAS: 1→2. Final counter=2. No lost updates. Lock-free!" },
          ]
        },
        {
          id: "deadlock", icon: "🔒", title: "Deadlock",
          subtitle: "T1 holds LockA + waits for LockB. T2 holds LockB + waits for LockA. Both wait forever.",
          badCode: `// ❌ Inconsistent lock order
void transferAtoB() {
  synchronized(lockA) {         // T1 grabs A
    synchronized(lockB) { … }   // T1 wants B ← blocked!
  }
}
void transferBtoA() {
  synchronized(lockB) {         // T2 grabs B
    synchronized(lockA) { … }   // T2 wants A ← DEADLOCK
  }
}`,
          goodCode: `// ✅ Consistent lock ordering (always A → B)
void transfer(Lock from, Lock to) {
  Lock first  = id(from) < id(to) ? from : to;
  Lock second = id(from) < id(to) ? to   : from;
  synchronized(first) {
    synchronized(second) { … }  // safe, no cycle
  }
}`,
          steps: [
            { threads: [{label:"T1",st:"idle",holds:null,wants:null},{label:"T2",st:"idle",holds:null,wants:null}], locks: {A:"free",B:"free"}, note: "Two threads, two locks: LockA and LockB — both free." },
            { threads: [{label:"T1",st:"run",holds:"A",wants:null,code:"synchronized(lockA) ✓"},{label:"T2",st:"run",holds:"B",wants:null,code:"synchronized(lockB) ✓"}], locks: {A:"T1",B:"T2"}, note: "T1 grabs LockA. T2 grabs LockB. Both acquired, running fine so far." },
            { threads: [{label:"T1",st:"wait",holds:"A",wants:"B",code:"synchronized(lockB)… BLOCKED"},{label:"T2",st:"wait",holds:"B",wants:"A",code:"synchronized(lockA)… BLOCKED"}], locks: {A:"T1",B:"T2"}, note: "⚠️ T1 wants B (held by T2). T2 wants A (held by T1). Circular wait!", error: true },
            { threads: [{label:"T1",st:"dead",holds:"A",wants:"B",code:"// 💀 DEADLOCK"},{label:"T2",st:"dead",holds:"B",wants:"A",code:"// 💀 DEADLOCK"}], locks: {A:"T1",B:"T2"}, note: "💀 DEADLOCK. Neither thread can proceed. JVM thread dump shows WAITING. App hangs until restart.", error: true },
          ],
          fixSteps: [
            { threads: [{label:"T1",st:"idle",holds:null,wants:null},{label:"T2",st:"idle",holds:null,wants:null}], locks: {A:"free",B:"free"}, note: "Fix: all threads acquire locks in same global order (by lock ID). Eliminates circular wait." },
            { threads: [{label:"T1",st:"run",holds:"A",wants:null,code:"synchronized(lockA) ✓"},{label:"T2",st:"wait",holds:null,wants:"A",code:"synchronized(lockA)… wait"}], locks: {A:"T1",B:"free"}, note: "T1 grabs A. T2 also tries A FIRST (same order) — it waits. T2 does NOT hold LockB yet!" },
            { threads: [{label:"T1",st:"run",holds:"A+B",wants:null,code:"synchronized(lockB) ✓"},{label:"T2",st:"wait",holds:null,wants:"A",code:"still waiting for A…"}], locks: {A:"T1",B:"T1"}, note: "T1 grabs B too (no contest). T2 patiently waits. No circular dependency." },
            { threads: [{label:"T1",st:"done",holds:null,wants:null,code:"releases A+B ✓"},{label:"T2",st:"run",holds:"A+B",wants:null,code:"grabs A ✓ then B ✓"}], locks: {A:"T2",B:"T2"}, note: "✅ T1 finishes, releases both. T2 acquires A→B in order. No deadlock!" },
          ]
        },
        {
          id: "vthreads", icon: "🚀", title: "Virtual Threads I/O",
          subtitle: "Platform threads BLOCK their OS thread on I/O. Virtual threads PARK (unmount from carrier) — carrier stays free.",
          badCode: `// ❌ Platform thread pool (fixed 4 threads)
ExecutorService pool =
  Executors.newFixedThreadPool(4);

pool.submit(() -> {
  var result = db.query(sql); // BLOCKS OS thread!
  return result;
});
// 4 threads = max 4 concurrent I/O ops 😬`,
          goodCode: `// ✅ Virtual threads (JDK 21+)
ExecutorService exec =
  Executors.newVirtualThreadPerTaskExecutor();

exec.submit(() -> {
  var result = db.query(sql); // PARKS, frees carrier
  return result;
});
// Millions of vThreads, ~2 OS carrier threads 🚀`,
          steps: [
            { platform: [{id:"P1",st:"idle"},{id:"P2",st:"idle"},{id:"P3",st:"idle"},{id:"P4",st:"idle"}], queue: 0, note: "Fixed pool: 4 platform threads. 8 I/O requests arriving." },
            { platform: [{id:"P1",st:"blocked",label:"req1 DB…"},{id:"P2",st:"blocked",label:"req2 DB…"},{id:"P3",st:"blocked",label:"req3 DB…"},{id:"P4",st:"blocked",label:"req4 DB…"}], queue: 4, note: "⚠️ All 4 OS threads BLOCKED waiting for DB. Req 5–8 pile up in queue. Zero throughput!", error: true },
            { platform: [{id:"P1",st:"blocked",label:"req1 DB…"},{id:"P2",st:"done",label:"req2 done ✓"},{id:"P3",st:"blocked",label:"req3 DB…"},{id:"P4",st:"blocked",label:"req4 DB…"}], queue: 3, note: "req2 returns. P2 picks req5. But pool exhausted most of the time — latency spikes." },
            { platform: [{id:"P1",st:"done",label:"req1 ✓"},{id:"P2",st:"done",label:"req5 ✓"},{id:"P3",st:"done",label:"req3 ✓"},{id:"P4",st:"done",label:"req4 ✓"}], queue: 0, note: "Eventually all done. But under burst: req5–8 see high latency. Cannot scale beyond 4 concurrent I/O." },
          ],
          fixSteps: [
            { carriers: [{id:"C1",st:"idle"},{id:"C2",st:"idle"}], vts: [{id:"V1",st:"idle"},{id:"V2",st:"idle"},{id:"V3",st:"idle"},{id:"V4",st:"idle"}], note: "2 OS carrier threads manage N virtual threads. Virtual threads are heap objects (cheap!)." },
            { carriers: [{id:"C1",st:"run",label:"→ vt1"},{id:"C2",st:"run",label:"→ vt2"}], vts: [{id:"V1",st:"run",label:"vt1 → DB call"},{id:"V2",st:"run",label:"vt2 → DB call"},{id:"V3",st:"queue",label:"vt3 queued"},{id:"V4",st:"queue",label:"vt4 queued"}], note: "vt1 mounted on C1, vt2 on C2. vt3+4 queued briefly." },
            { carriers: [{id:"C1",st:"run",label:"→ vt3"},{id:"C2",st:"run",label:"→ vt4"}], vts: [{id:"V1",st:"parked",label:"vt1 PARKED ⟳"},{id:"V2",st:"parked",label:"vt2 PARKED ⟳"},{id:"V3",st:"run",label:"vt3 running ✓"},{id:"V4",st:"run",label:"vt4 running ✓"}], note: "✅ vt1+vt2 PARK on I/O (unmount from carrier). C1/C2 immediately run vt3+4. Zero OS blocking!" },
            { carriers: [{id:"C1",st:"run",label:"C1"},{id:"C2",st:"run",label:"C2"}], vts: [{id:"V1",st:"done",label:"vt1 resumed ✓"},{id:"V2",st:"done",label:"vt2 resumed ✓"},{id:"V3",st:"done",label:"vt3 ✓"},{id:"V4",st:"done",label:"vt4 ✓"}], note: "🚀 DB responds → vt1+vt2 remount on any free carrier. All 4 served with 2 OS threads!" },
          ]
        }
      ];

      mount.innerHTML = `
        <style>
          .cc-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .cc-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .cc-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
          .cc-tab { background: #21262d; border: 1px solid #30363d; color: #768390; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cc-tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .cc-panel { display: none; }
          .cc-panel.active { display: block; }

          /* Thread comparison */
          .cc-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
          .cc-col { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; }
          .cc-col-head { font-size: 11px; font-weight: bold; text-align: center; padding: 4px; border-radius: 4px; margin-bottom: 8px; }
          .cc-col-head.platform { background: #3d1f1f; color: #f47067; }
          .cc-col-head.pool { background: #1f2d3d; color: #6cb6ff; }
          .cc-col-head.vt { background: #1f3d2d; color: #57ab5a; }
          .cc-threads { display: flex; flex-wrap: wrap; gap: 3px; min-height: 60px; }
          .cc-thread { border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; transition: all 0.3s; }
          .cc-thread.pf { width: 44px; height: 26px; background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-thread.pf.run { background: #f47067; color: #1c2128; }
          .cc-thread.pf.blk { opacity: 0.45; }
          .cc-thread.vv { width: 12px; height: 12px; border-radius: 2px; background: #1f3d2d; border: 1px solid #57ab5a; }
          .cc-thread.vv.run { background: #57ab5a; }
          .cc-thread.vv.park { opacity: 0.5; }
          .cc-thread.vv.done { background: #21262d; border-color: #30363d; opacity: 0.25; }
          .cc-stat { font-size: 10px; color: #768390; margin-top: 4px; }

          /* Lock comparison */
          .cc-locks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
          .cc-lcard { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; cursor: pointer; transition: border-color 0.2s; }
          .cc-lcard:hover { border-color: #1f6feb; }
          .cc-lcard.active { border-color: #1f6feb; background: #0d1f3d; }
          .cc-lname { font-size: 11px; font-weight: bold; margin-bottom: 3px; }
          .cc-ltag { font-size: 9px; color: #768390; }
          .cc-lthreads { display: flex; gap: 3px; margin-top: 6px; }
          .cc-lt { width: 20px; height: 20px; border-radius: 3px; font-size: 8px; display: flex; align-items: center; justify-content: center; }
          .cc-lt.own { background: #57ab5a; color: #1c2128; font-weight: bold; }
          .cc-lt.wait { background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-lt.read { background: #1f2d3d; border: 1px solid #6cb6ff; color: #6cb6ff; }
          .cc-lt.optim { background: #1f3d2d; border: 1px solid #57ab5a; color: #57ab5a; font-size: 7px; }

          /* Synchronizer demo */
          .cc-sync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .cc-scard { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; }
          .cc-sname { font-size: 11px; font-weight: bold; margin-bottom: 6px; }
          .cc-sthreads { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
          .cc-st { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; transition: all 0.4s; }
          .cc-st.wait { background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-st.pass { background: #57ab5a; color: #1c2128; }
          .cc-st.done { background: #21262d; color: #444; }
          .cc-gate { width: 20px; height: 36px; background: #30363d; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #768390; transition: background 0.4s; }
          .cc-gate.open { background: #57ab5a; color: #1c2128; }
          .cc-permits { display: flex; gap: 2px; }
          .cc-permit { width: 12px; height: 12px; border-radius: 2px; background: #57ab5a; transition: all 0.3s; }
          .cc-permit.used { background: #3d1f1f; border: 1px solid #f47067; }

          .cc-controls { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .cc-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cc-btn:hover { background: #30363d; }
          .cc-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 32px; margin-top: 8px; }
          .cc-info strong { color: #cdd9e5; }
          .cc-info .kw { color: #e3b341; }
          .cc-info .ok { color: #57ab5a; }
          .cc-info .bad { color: #f47067; }
        </style>
        <div class="cc-wrap">
          <div class="cc-title">Concurrency — Visual Interactive Lab</div>
          <div class="cc-tabs">
            <button class="cc-tab active" data-tab="threads">Thread Types</button>
            <button class="cc-tab" data-tab="locks">Lock Types</button>
            <button class="cc-tab" data-tab="sync">Synchronizers</button>
            <button class="cc-tab" data-tab="tricks">⚠️ Tricks + Interview</button>
            <button class="cc-tab" data-tab="patterns">🔥 Patterns</button>
          </div>

          <!-- THREAD PANEL -->
          <div class="cc-panel active" id="cc-panel-threads">
            <div class="cc-controls">
              <button class="cc-btn" id="cc-sim">Simulate 20 I/O requests</button>
              <button class="cc-btn" id="cc-reset-t">Reset</button>
            </div>
            <div class="cc-grid3">
              <div class="cc-col">
                <div class="cc-col-head platform">Platform Threads (1:1 OS)</div>
                <div class="cc-threads" id="cc-pf"></div>
                <div class="cc-stat" id="cc-pf-s">Idle</div>
              </div>
              <div class="cc-col">
                <div class="cc-col-head pool">Fixed Pool (4 threads)</div>
                <div class="cc-threads" id="cc-pool"></div>
                <div class="cc-stat" id="cc-pool-s">Idle</div>
              </div>
              <div class="cc-col">
                <div class="cc-col-head vt">Virtual Threads (JVM)</div>
                <div class="cc-threads" id="cc-vt"></div>
                <div class="cc-stat" id="cc-vt-s">Idle</div>
              </div>
            </div>
            <div class="cc-info" id="cc-t-info">Click "Simulate" — watch platform threads block (red) while virtual threads park and free carriers (green).</div>
          </div>

          <!-- LOCKS PANEL -->
          <div class="cc-panel" id="cc-panel-locks">
            <div class="cc-locks">
              ${[
    { id:"sync-l",    name:"synchronized",       tag:"JVM intrinsic · pins vthreads!",
      threads: [{c:"own",l:"T1"},{c:"wait",l:"T2"},{c:"wait",l:"T3"}],
      detail: "<strong>synchronized(lock)</strong>: JVM monitor. Reentrant. Auto-unlock on exception. <span class=\"bad\">PINS virtual threads</span> — blocks carrier OS thread during I/O. Use for simple critical sections with platform threads." },
    { id:"rl-l",      name:"ReentrantLock",       tag:"try/timed/interruptible · vthread OK",
      threads: [{c:"own",l:"T1"},{c:"wait",l:"T2"}],
      detail: "<strong>ReentrantLock.lock()</strong>: Same as synchronized + tryLock(timeout), lockInterruptibly(). <span class=\"ok\">Virtual thread safe</span> — vthread parks and unmounts while waiting. Must call unlock() in finally block." },
    { id:"rwl-l",     name:"ReadWriteLock",        tag:"concurrent reads · one writer",
      threads: [{c:"read",l:"R1"},{c:"read",l:"R2"},{c:"read",l:"R3"},{c:"wait",l:"W1"}],
      detail: "<strong>ReadWriteLock</strong>: Multiple readers OR one writer (never concurrent). readLock() shared. writeLock() exclusive. Great for caches: many concurrent reads, rare writes. Writer starvation under high read load." },
    { id:"stamped-l", name:"StampedLock",          tag:"optimistic reads · fastest",
      threads: [{c:"optim",l:"opt"},{c:"optim",l:"opt"},{c:"own",l:"W"}],
      detail: "<strong>StampedLock.tryOptimisticRead()</strong>: Read without acquiring any lock! Returns stamp. After reading, validate(stamp) — if false (write happened), retry with readLock(). 3–10× faster than RWL for optimistic reads. NOT reentrant." },
  ].map(l => `
                <div class="cc-lcard" id="${l.id}" onclick="
                  this.closest('.cc-panel').querySelectorAll('.cc-lcard').forEach(c=>c.classList.remove('active'));
                  this.classList.add('active');
                  this.closest('.cc-panel').querySelector('.cc-info').innerHTML='${l.detail.replace(/'/g,"\\'")}';
                ">
                  <div class="cc-lname">${l.name}</div>
                  <div class="cc-ltag">${l.tag}</div>
                  <div class="cc-lthreads">${l.threads.map(t=>`<div class="cc-lt ${t.c}">${t.l}</div>`).join("")}</div>
                </div>`).join("")}
            </div>
            <div class="cc-info" id="cc-l-info">Click any lock type to see its guarantee, use case, and virtual thread compatibility.</div>
          </div>

          <!-- SYNCHRONIZERS PANEL -->
          <div class="cc-panel" id="cc-panel-sync">
            <div class="cc-sync-row">
              <div class="cc-scard">
                <div class="cc-sname" style="color:#6cb6ff">Semaphore(3) — 3 permits</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Permits available:</div>
                <div class="cc-permits" id="cc-sem-permits">
                  <div class="cc-permit"></div><div class="cc-permit"></div><div class="cc-permit"></div>
                </div>
                <div class="cc-sthreads" id="cc-sem-threads" style="margin-top:8px"></div>
                <div class="cc-controls" style="margin-top:6px;margin-bottom:0">
                  <button class="cc-btn" id="cc-sem-acq">acquire()</button>
                  <button class="cc-btn" id="cc-sem-rel">release()</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#e3b341">CountDownLatch(3)</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Count remaining: <strong id="cc-cdl-count" style="color:#cdd9e5">3</strong></div>
                <div class="cc-sthreads" id="cc-cdl-threads"></div>
                <div style="margin:6px 0;display:flex;align-items:center;gap:6px">
                  <div class="cc-gate" id="cc-cdl-gate">🔒</div>
                  <span style="font-size:10px;color:#768390">main await()</span>
                </div>
                <div class="cc-controls" style="margin-top:0;margin-bottom:0">
                  <button class="cc-btn" id="cc-cdl-cd">countDown()</button>
                  <button class="cc-btn" id="cc-cdl-reset">Reset</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#b392f0">CyclicBarrier(4)</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Waiting: <strong id="cc-cb-count" style="color:#cdd9e5">0</strong>/4</div>
                <div class="cc-sthreads" id="cc-cb-threads"></div>
                <div class="cc-controls" style="margin-top:6px;margin-bottom:0">
                  <button class="cc-btn" id="cc-cb-await">Thread arrives (await())</button>
                  <button class="cc-btn" id="cc-cb-reset">Reset</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#57ab5a">Executor Comparison</div>
                <div style="font-size:10px;color:#768390;margin-bottom:6px">Max concurrent tasks in 1s with 50ms I/O wait:</div>
                ${[
    {name:"Fixed(10)",val:10,col:"#f47067",max:10},
    {name:"Cached",val:200,col:"#e3b341",max:200},
    {name:"VirtualThread",val:1000,col:"#57ab5a",max:1000},
  ].map(e=>`
                  <div style="margin-bottom:4px">
                    <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px">
                      <span>${e.name}</span><span style="color:${e.col}">${e.val} tasks</span>
                    </div>
                    <div style="height:10px;background:#21262d;border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:${e.val/10}%;background:${e.col};border-radius:3px;transition:width 0.5s"></div>
                    </div>
                  </div>`).join("")}
              </div>
            </div>
            <div class="cc-info" id="cc-sync-info">Click buttons to see each synchronizer in action. Semaphore = pool of permits. CountDownLatch = one-time gate. CyclicBarrier = reusable rendezvous.</div>
          </div>

          <!-- TRICKS + INTERVIEW PANEL -->
          <div class="cc-panel" id="cc-panel-tricks">
            <div style="font-size:10px;color:#768390;margin-bottom:8px">⚠️ WRONG assumption vs ✓ CORRECT behavior — common concurrency gotchas</div>
            ${CC_TRICKS.map(t => `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div style="background:#3d1f1f;border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#f47067;font-weight:bold;margin-bottom:4px">⚠️ WRONG</div>${t.wrong}
                </div>
                <div style="background:#1f3d2d;border:1px solid #57ab5a;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#57ab5a;font-weight:bold;margin-bottom:4px">✓ CORRECT</div>${t.right}
                </div>
              </div>`).join("")}
            <div style="font-size:10px;color:#768390;margin:10px 0 6px">💬 Interview Flash Cards — click to reveal answer</div>
            ${CC_QS.map(q => `
              <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer" onclick="const a=this.querySelector('.cc-qa');a.style.display=a.style.display==='none'?'block':'none'">
                <div style="font-size:11px;color:#cdd9e5;font-weight:bold">Q: ${q.q}</div>
                <div class="cc-qa" style="display:none;font-size:10px;color:#768390;margin-top:6px;border-top:1px solid #30363d;padding-top:6px">${q.a}</div>
              </div>`).join("")}
          </div>

          <!-- PATTERNS PANEL -->
          <div class="cc-panel" id="cc-panel-patterns">
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
              ${CC_PATTERNS.map((sc, i) => `<button class="cc-btn pat-scene${i===0?" pat-active":""}" data-scene="${i}" style="${i===0?"background:#1f6feb;border-color:#1f6feb;color:#fff;":""}font-size:10.5px">${sc.icon} ${sc.title}</button>`).join("")}
            </div>
            <div id="pat-subtitle" style="font-size:11px;color:#9aaabb;margin-bottom:8px;line-height:1.5"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div>
                <div style="font-size:9px;font-weight:700;color:#f47067;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">❌ Problem</div>
                <pre id="pat-bad-code" style="background:#0d1117;border:1px solid #3d1f1f;border-radius:6px;padding:8px;font-size:9.5px;margin:0 0 6px;overflow-x:auto;line-height:1.45;min-height:80px;white-space:pre-wrap"></pre>
                <div id="pat-bad-state" style="min-height:70px"></div>
              </div>
              <div>
                <div id="pat-fix-head" style="font-size:9px;font-weight:700;color:#3dd68c;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">✅ Fix</div>
                <pre id="pat-good-code" style="background:#0d1117;border:1px solid #1f3d2d;border-radius:6px;padding:8px;font-size:9.5px;margin:0 0 6px;overflow-x:auto;line-height:1.45;min-height:80px;white-space:pre-wrap"></pre>
                <div id="pat-good-state" style="min-height:70px"></div>
              </div>
            </div>
            <div id="pat-note" style="background:rgba(0,0,0,.3);border-left:3px solid #58a6ff;border-radius:0 6px 6px 0;padding:7px 12px;font-size:11.5px;color:#cdd9e5;margin:8px 0 6px;min-height:36px;line-height:1.5"></div>
            <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
              <button class="cc-btn" id="pat-prev">◀ Prev</button>
              <button class="cc-btn" id="pat-play">▶ Play</button>
              <button class="cc-btn" id="pat-next">Next ▶</button>
              <button class="cc-btn" id="pat-reset">↺ Reset</button>
              <span id="pat-step-info" style="font-size:10px;color:#768390;margin-left:4px"></span>
            </div>
          </div>
        </div>`;

      // Tab switching
      mount.querySelectorAll(".cc-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          mount.querySelectorAll(".cc-tab").forEach(t => t.classList.remove("active"));
          mount.querySelectorAll(".cc-panel").forEach(p => p.classList.remove("active"));
          tab.classList.add("active");
          mount.querySelector("#cc-panel-" + tab.dataset.tab).classList.add("active");
        });
      });

      // Thread simulation
      let timers = [];
      function resetThreads() {
        timers.forEach(clearTimeout); timers = [];
        ["cc-pf","cc-pool","cc-vt"].forEach(id => { mount.querySelector("#" + id).innerHTML = ""; });
        mount.querySelector("#cc-pf-s").textContent = "Idle";
        mount.querySelector("#cc-pool-s").textContent = "Idle";
        mount.querySelector("#cc-vt-s").textContent = "Idle";
        mount.querySelector("#cc-t-info").textContent = "Click \"Simulate\" — watch platform threads block (red) while virtual threads park and free carriers (green).";
      }

      mount.querySelector("#cc-sim").addEventListener("click", () => {
        resetThreads();
        const N = 20;
        const pfEl = mount.querySelector("#cc-pf"), poolEl = mount.querySelector("#cc-pool"), vtEl = mount.querySelector("#cc-vt");
        const tInfo = mount.querySelector("#cc-t-info");

        // Platform threads
        for (let i = 0; i < N; i++) {
          const t = document.createElement("div");
          t.className = "cc-thread pf";
          t.textContent = "T" + (i+1);
          pfEl.appendChild(t);
          timers.push(setTimeout(() => { t.classList.add("run"); t.textContent = "RUN"; mount.querySelector("#cc-pf-s").textContent = (i+1) + " OS threads"; }, i * 70));
          timers.push(setTimeout(() => { t.classList.remove("run"); t.classList.add("blk"); t.textContent = "BLK"; mount.querySelector("#cc-pf-s").innerHTML = "<span style=\"color:#f47067\">" + N + " OS threads BLOCKED 🔴</span>"; }, i * 70 + 200));
        }
        // Fixed pool
        const poolSize = 4;
        for (let i = 0; i < poolSize; i++) {
          const t = document.createElement("div");
          t.className = "cc-thread pf";
          t.textContent = "W" + (i+1);
          poolEl.appendChild(t);
        }
        const poolTs = poolEl.querySelectorAll(".cc-thread");
        let q = 0;
        for (let i = 0; i < N; i++) {
          const delay = i * 70;
          timers.push(setTimeout(() => {
            if (i < poolSize) { poolTs[i].classList.add("run"); poolTs[i].textContent="RUN"; }
            else { q++; mount.querySelector("#cc-pool-s").textContent = q + " tasks queued!"; }
          }, delay));
          timers.push(setTimeout(() => {
            if (i < poolSize) { poolTs[i].classList.remove("run"); poolTs[i].classList.add("blk"); poolTs[i].textContent="I/O"; mount.querySelector("#cc-pool-s").innerHTML = "<span style=\"color:#f47067\">4 threads blocked + " + (N-poolSize) + " queued</span>"; }
          }, delay + 200));
        }
        // Virtual threads
        for (let i = 0; i < N; i++) {
          const t = document.createElement("div");
          t.className = "cc-thread vv";
          vtEl.appendChild(t);
          const d = i * 35;
          timers.push(setTimeout(() => { t.classList.add("run"); mount.querySelector("#cc-vt-s").textContent = (i+1) + " vthreads (4 carriers)"; }, d));
          timers.push(setTimeout(() => { t.classList.remove("run"); t.classList.add("park"); mount.querySelector("#cc-vt-s").innerHTML = "<span style=\"color:#57ab5a\">" + N + " parked 🟢 carriers FREE!</span>"; }, d + 120));
          timers.push(setTimeout(() => { t.classList.remove("park"); t.classList.add("run"); }, d + 900));
          timers.push(setTimeout(() => { t.classList.remove("run"); t.classList.add("done"); mount.querySelector("#cc-vt-s").innerHTML = "<span style=\"color:#57ab5a\">" + N + " requests done ✓</span>"; tInfo.innerHTML = "<strong>Virtual threads win!</strong> 20 vthreads parked during I/O — only 4 carriers used. Same throughput as async, but <em>plain blocking code</em>."; }, d + 1100));
        }
      });
      mount.querySelector("#cc-reset-t").addEventListener("click", resetThreads);

      // Semaphore
      let semPermits = 3, semWaiters = 0;
      const semInfo = mount.querySelector("#cc-sync-info");
      function renderSem() {
        const permits = mount.querySelectorAll(".cc-permit");
        permits.forEach((p,i) => p.classList.toggle("used", i >= semPermits));
        const tEl = mount.querySelector("#cc-sem-threads");
        tEl.innerHTML = "";
        for (let i = 0; i < 3 - semPermits + semWaiters; i++) {
          const t = document.createElement("div");
          t.className = "cc-st " + (i < 3 - semPermits ? "pass" : "wait");
          t.textContent = i < 3 - semPermits ? "IN" : "W";
          tEl.appendChild(t);
        }
      }
      mount.querySelector("#cc-sem-acq").addEventListener("click", () => {
        if (semPermits > 0) { semPermits--; renderSem(); semInfo.innerHTML = "<strong>acquire()</strong> — permit granted. Remaining: " + semPermits + ". Thread enters critical section."; }
        else { semWaiters++; renderSem(); semInfo.innerHTML = "<strong>acquire()</strong> — NO permits! Thread BLOCKS. Waiting: " + semWaiters + ". Use tryAcquire(timeout) to avoid blocking forever."; }
      });
      mount.querySelector("#cc-sem-rel").addEventListener("click", () => {
        if (semWaiters > 0) { semWaiters--; renderSem(); semInfo.innerHTML = "<strong>release()</strong> — permit returned, unblocks 1 waiting thread. Semaphore wakes it up."; }
        else if (semPermits < 3) { semPermits++; renderSem(); semInfo.innerHTML = "<strong>release()</strong> — permit returned. Available: " + semPermits + ". Critical section exited."; }
        else { semInfo.innerHTML = "<strong>release()</strong> — already at max permits. Nothing to do."; }
      });
      renderSem();

      // CountDownLatch
      let cdlCount = 3;
      function renderCDL() {
        mount.querySelector("#cc-cdl-count").textContent = cdlCount;
        const tEl = mount.querySelector("#cc-cdl-threads");
        tEl.innerHTML = "";
        for (let i = 0; i < 3; i++) {
          const t = document.createElement("div");
          t.className = "cc-st " + (i >= cdlCount ? "done" : "wait");
          t.textContent = i >= cdlCount ? "✓" : "W" + (i+1);
          tEl.appendChild(t);
        }
        const gate = mount.querySelector("#cc-cdl-gate");
        gate.classList.toggle("open", cdlCount === 0);
        gate.textContent = cdlCount === 0 ? "🔓" : "🔒";
      }
      mount.querySelector("#cc-cdl-cd").addEventListener("click", () => {
        if (cdlCount > 0) { cdlCount--; renderCDL(); semInfo.innerHTML = cdlCount > 0 ? "<strong>countDown()</strong> — count now " + cdlCount + ". Main thread still blocked at await().": "<strong>countDown() → 0!</strong> Latch open! Main thread UNBLOCKED. All await() callers released. <span class=\"ok\">ONE-SHOT — cannot reset!</span>"; }
      });
      mount.querySelector("#cc-cdl-reset").addEventListener("click", () => { cdlCount = 3; renderCDL(); semInfo.innerHTML = "CountDownLatch reset (for demo). In real code: it's one-shot — use CyclicBarrier if you need to reuse."; });
      renderCDL();

      // CyclicBarrier
      let cbCount = 0;
      function renderCB() {
        mount.querySelector("#cc-cb-count").textContent = cbCount;
        const tEl = mount.querySelector("#cc-cb-threads");
        tEl.innerHTML = "";
        for (let i = 0; i < Math.max(cbCount, 1); i++) {
          const t = document.createElement("div");
          t.className = "cc-st wait";
          t.textContent = "T" + (i+1);
          tEl.appendChild(t);
        }
        if (cbCount === 0 && tEl.innerHTML === "") {
          tEl.innerHTML = "<span style=\"font-size:10px;color:#768390\">No threads waiting</span>";
        }
      }
      mount.querySelector("#cc-cb-await").addEventListener("click", () => {
        cbCount++;
        if (cbCount < 4) { renderCB(); semInfo.innerHTML = "<strong>await()</strong> — T" + cbCount + " arrived. Waiting: " + cbCount + "/4. Barrier not yet tripped."; }
        else {
          semInfo.innerHTML = "<strong>BARRIER TRIPPED!</strong> All 4 threads arrived. Optional barrierAction() runs. All 4 released simultaneously. CyclicBarrier RESETS automatically — ready for next phase!";
          const tEl = mount.querySelector("#cc-cb-threads");
          tEl.querySelectorAll(".cc-st").forEach(t => t.className = "cc-st pass");
          setTimeout(() => { cbCount = 0; renderCB(); }, 1200);
        }
      });
      mount.querySelector("#cc-cb-reset").addEventListener("click", () => { cbCount = 0; renderCB(); semInfo.innerHTML = "CyclicBarrier reset. Reusable unlike CountDownLatch."; });
      renderCB();

      // ── Patterns tab ──────────────────────────────────────────────────
      let patScene = 0, patStep = 0, patTimer = null;

      function patThreadHtml(t) {
        const colors = { idle:"#768390", run:"#3dd68c", wait:"#f5b944", done:"#58a6ff", dead:"#f47067", parked:"#f5b944", queue:"#768390" };
        const bgs    = { idle:"#21262d", run:"rgba(61,214,140,.1)", wait:"rgba(245,185,68,.1)", done:"rgba(88,166,255,.1)", dead:"rgba(244,112,103,.12)", parked:"rgba(245,185,68,.1)", queue:"#21262d" };
        const c = colors[t.st] || "#768390", bg = bgs[t.st] || "#21262d";
        return `<div style="background:${bg};border:1px solid ${c}30;border-radius:5px;padding:5px 8px;margin-bottom:4px;font-size:10px;display:flex;gap:8px;align-items:flex-start">
          <span style="font-weight:700;color:${c};min-width:24px">${t.label}</span>
          <div style="flex:1">
            <div style="color:${c};font-size:8.5px;font-weight:700;text-transform:uppercase">${t.st}</div>
            ${t.code ? `<div style="color:#cdd9e5;font-size:9px;margin-top:2px;font-family:monospace">${t.code}</div>` : ""}
            ${t.holds ? `<span style="font-size:9px;color:#768390">holds: <span style="color:#f5b944">${t.holds}</span> </span>` : ""}
            ${t.wants ? `<span style="font-size:9px;color:#768390">wants: <span style="color:#f47067">${t.wants}</span></span>` : ""}
          </div>
        </div>`;
      }

      function patCounterHtml(val) {
        return `<div style="text-align:center;padding:6px;background:#21262d;border-radius:5px;border:1px solid #30363d;margin-top:4px">
          <div style="font-size:9px;color:#768390">counter</div>
          <div style="font-size:22px;font-weight:800;color:#fff;font-family:monospace">${val}</div>
        </div>`;
      }

      function patLockBarHtml(locks) {
        const c = l => l === "free" ? "#3dd68c" : "#f5b944";
        return `<div style="display:flex;gap:10px;margin-bottom:6px;font-size:9.5px">
          <span style="color:#768390">LockA: <strong style="color:${c(locks.A)}">${locks.A}</strong></span>
          <span style="color:#768390">LockB: <strong style="color:${c(locks.B)}">${locks.B}</strong></span>
        </div>`;
      }

      function patPlatformHtml(platform, queue) {
        const th = platform.map(p => {
          const c = p.st==="idle"?"#768390":p.st==="blocked"?"#f47067":p.st==="done"?"#3dd68c":"#58a6ff";
          const bg = p.st==="blocked"?"rgba(244,112,103,.1)":p.st==="done"?"rgba(61,214,140,.1)":"#21262d";
          return `<div style="background:${bg};border:1px solid ${c}30;border-radius:5px;padding:4px 6px;text-align:center;font-size:9px;color:${c}">
            <div style="font-weight:700">${p.id}</div><div>${p.label||p.st}</div>
          </div>`;
        }).join("");
        return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;margin-bottom:5px">${th}</div>
          ${queue>0?`<div style="background:rgba(245,185,68,.08);border:1px solid rgba(245,185,68,.3);border-radius:4px;padding:4px 8px;font-size:9.5px;color:#f5b944;text-align:center">⏳ ${queue} requests queued</div>`:""}`;
      }

      function patVtHtml(carriers, vts) {
        const cHtml = carriers.map(c => {
          const color = c.st==="idle"?"#768390":"#29b6cf";
          return `<div style="background:rgba(41,182,207,.08);border:1px solid ${color}30;border-radius:4px;padding:4px 8px;font-size:9px;color:${color};text-align:center">
            <div style="font-weight:700">OS ${c.id}</div><div>${c.label||c.st}</div>
          </div>`;
        }).join("");
        const vtHtml = vts.map(v => {
          const c = {idle:"#768390",run:"#3dd68c",parked:"#f5b944",done:"#58a6ff",queue:"#768390"}[v.st]||"#768390";
          const bg = {idle:"#21262d",run:"rgba(61,214,140,.08)",parked:"rgba(245,185,68,.08)",done:"rgba(88,166,255,.08)",queue:"#21262d"}[v.st]||"#21262d";
          return `<div style="background:${bg};border:1px solid ${c}25;border-radius:4px;padding:3px 6px;font-size:9px;color:${c}">${v.label||v.id}</div>`;
        }).join("");
        return `<div style="margin-bottom:5px">
          <div style="font-size:8.5px;color:#768390;margin-bottom:3px">OS CARRIERS</div>
          <div style="display:flex;gap:5px">${cHtml}</div>
        </div>
        <div>
          <div style="font-size:8.5px;color:#768390;margin-bottom:3px">VIRTUAL THREADS</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">${vtHtml}</div>
        </div>`;
      }

      function renderPatStep() {
        const sc = CC_PATTERNS[patScene];
        const stepCount = sc.steps.length;
        const fixCount  = sc.fixSteps.length;
        const badS  = sc.steps[Math.min(patStep, stepCount-1)];
        const fixS  = sc.fixSteps[Math.min(patStep, fixCount-1)];

        mount.querySelector("#pat-subtitle").textContent = sc.subtitle;
        mount.querySelector("#pat-bad-code").textContent = sc.badCode;
        mount.querySelector("#pat-good-code").textContent = sc.goodCode;

        const noteEl = mount.querySelector("#pat-note");
        noteEl.textContent = badS.note || "";
        noteEl.style.borderLeftColor = badS.error ? "#f47067" : "#58a6ff";
        noteEl.style.background = badS.error ? "rgba(244,112,103,.06)" : "rgba(0,0,0,.3)";

        mount.querySelector("#pat-step-info").textContent = `Step ${patStep+1} / ${stepCount}`;

        if (sc.id === "race") {
          mount.querySelector("#pat-bad-state").innerHTML  = badS.threads.map(patThreadHtml).join("") + patCounterHtml(badS.counter);
          mount.querySelector("#pat-good-state").innerHTML = fixS.threads.map(patThreadHtml).join("") + patCounterHtml(fixS.counter);
        } else if (sc.id === "deadlock") {
          mount.querySelector("#pat-bad-state").innerHTML  = patLockBarHtml(badS.locks)  + badS.threads.map(patThreadHtml).join("");
          mount.querySelector("#pat-good-state").innerHTML = patLockBarHtml(fixS.locks)  + fixS.threads.map(patThreadHtml).join("");
        } else if (sc.id === "vthreads") {
          mount.querySelector("#pat-bad-state").innerHTML  = patPlatformHtml(badS.platform, badS.queue||0);
          mount.querySelector("#pat-good-state").innerHTML = patVtHtml(fixS.carriers, fixS.vts);
          noteEl.textContent = (badS.note||"") + "\nFix: " + (fixS.note||"");
        }
      }

      function patStop() { if (patTimer) clearInterval(patTimer); patTimer=null; mount.querySelector("#pat-play").textContent="▶ Play"; }
      function patStart() {
        patStop();
        mount.querySelector("#pat-play").textContent="⏸ Pause";
        patTimer = setInterval(() => {
          const maxStep = CC_PATTERNS[patScene].steps.length - 1;
          if (patStep < maxStep) { patStep++; renderPatStep(); } else { patStop(); }
        }, 1700);
      }

      mount.querySelectorAll(".pat-scene").forEach((btn, i) => {
        btn.addEventListener("click", () => {
          patStop(); patScene = i; patStep = 0;
          mount.querySelectorAll(".pat-scene").forEach((b, j) => {
            b.style.background = j===i ? "#1f6feb" : "";
            b.style.borderColor = j===i ? "#1f6feb" : "";
            b.style.color = j===i ? "#fff" : "";
          });
          renderPatStep();
        });
      });
      mount.querySelector("#pat-prev").addEventListener("click", () => { patStop(); if (patStep>0) { patStep--; renderPatStep(); } });
      mount.querySelector("#pat-next").addEventListener("click", () => { patStop(); if (patStep < CC_PATTERNS[patScene].steps.length-1) { patStep++; renderPatStep(); } });
      mount.querySelector("#pat-play").addEventListener("click", () => patTimer ? patStop() : patStart());
      mount.querySelector("#pat-reset").addEventListener("click", () => { patStop(); patStep=0; renderPatStep(); });

      renderPatStep();
    },

    concept:
`**L1 (30s ELI5):** Threads are mini-programs running simultaneously. Like workers sharing a factory — need locks so they don't break things. Java 21 virtual threads: 10 million lightweight threads instead of 10,000 real ones.

**L2 (2min core):** Platform threads = 1:1 OS threads (~1MB stack). Virtual threads (Java 21): heap-stack, mounts on carrier OS thread. Blocking I/O parks vthread → unmounts from carrier → carrier FREE for others. Lock ladder: \`synchronized\` → \`ReentrantLock\` → \`ReadWriteLock\` → \`StampedLock\` (optimistic reads). Synchronizers: Semaphore (permits), CountDownLatch (one-shot gate), CyclicBarrier (reusable rendezvous).

**L3 (10min edge cases):** \`synchronized\` PINS virtual thread to carrier (blocks carrier OS thread — defeats purpose). StampedLock NOT reentrant: calling \`lock()\` inside \`lock()\` = deadlock. CyclicBarrier: one thread dies = all waiters get BrokenBarrierException. ThreadLocal leaks in pooled threads — always \`remove()\` in finally. volatile does NOT provide atomicity for compound ops (check-then-act).

**L4 (30min deep):** JMM happens-before: lock release → lock acquire, volatile write → volatile read, Thread.start() → first action in started thread. Without happens-before: stale cached values, reordered writes visible. VarHandle: acquire/release/opaque memory order semantics for lock-free structures. ForkJoinPool work-stealing: each worker has a deque; idle workers steal from tail of others. Virtual thread continuation: stack stored as heap object, mounted/unmounted via JVM internal \`Continuation.yield()/run()\`.`,
    why:
"Virtual threads collapse the **thread-per-request vs reactive** debate. You write straight-line blocking code; the JVM gives you reactive-grade scalability. Lock choice determines virtual thread friendliness and contention patterns.",
    example: {
      language: "java",
      code:
`import java.util.concurrent.*;
import java.util.concurrent.locks.*;

// 1. ReentrantLock — virtual thread safe, timed try
ReentrantLock lock = new ReentrantLock();
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try { /* critical section */ }
    finally { lock.unlock(); }  // ALWAYS unlock in finally
}

// 2. ReadWriteLock — concurrent reads
ReadWriteLock rwl = new ReentrantReadWriteLock();
// reads: concurrent
rwl.readLock().lock(); try { return cache.get(key); } finally { rwl.readLock().unlock(); }
// writes: exclusive
rwl.writeLock().lock(); try { cache.put(key, val); } finally { rwl.writeLock().unlock(); }

// 3. StampedLock — optimistic read (no lock!)
StampedLock sl = new StampedLock();
long stamp = sl.tryOptimisticRead();
double x = this.x, y = this.y;  // read without lock
if (!sl.validate(stamp)) {       // check: did a write happen?
    stamp = sl.readLock();       // fall back to real read lock
    try { x = this.x; y = this.y; } finally { sl.unlockRead(stamp); }
}

// 4. Semaphore — connection pool limit
Semaphore pool = new Semaphore(10);  // max 10 concurrent DB connections
pool.acquire();
try { useDatabase(); } finally { pool.release(); }

// 5. CountDownLatch — wait for N workers
CountDownLatch ready = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    executor.submit(() -> { doWork(); ready.countDown(); });
}
ready.await();  // main thread blocks until all 3 finish

// 6. CyclicBarrier — parallel phases
CyclicBarrier barrier = new CyclicBarrier(4, () -> System.out.println("Phase done!"));
// Each of 4 threads does:
doPhaseWork();
barrier.await();  // all 4 must arrive before any proceeds`,
      notes: "Never call `lock()` without a matching `unlock()` in `finally`. `synchronized` blocks pin virtual threads during I/O — prefer `ReentrantLock` in virtual-thread-heavy code."
    },
    interview: [
      {
        question: "Difference between virtual threads and reactive (WebFlux)?",
        answer:
"Both achieve high concurrency with few OS threads. **Virtual threads** keep the **imperative blocking** programming model — easier debugging, linear stack traces, `ThreadLocal` works. **Reactive** uses async non-blocking APIs; backpressure is first-class but cognitive load is high. For most apps in 2025, **virtual threads** are the better default.",
        followUps: ["What is thread pinning?", "Can I use ThreadLocal with virtual threads?"]
      },
      {
        question: "When to use Semaphore vs ReadWriteLock vs StampedLock?",
        answer:
"**Semaphore**: limit concurrency (N permits for N connections). Not about mutual exclusion of a resource — about throughput control. **ReadWriteLock**: shared resource with concurrent reads, exclusive writes. Writer starvation risk under high read load. **StampedLock**: same as RWL but adds optimistic reads with no lock acquisition — 3–10× faster for read-dominant loads. Not reentrant.",
        followUps: ["What is writer starvation?", "Why is StampedLock not reentrant?"]
      },
      {
        question: "CountDownLatch vs CyclicBarrier — which one?",
        answer:
"**CountDownLatch**: one-way, one-shot. Either many threads wait for 1 signal, or 1 thread waits for N completions. Cannot reuse. **CyclicBarrier**: N threads all wait for each other at a rendezvous point. Resets automatically after all arrive. Optional barrierAction fires when all arrive. Use CyclicBarrier for iterative parallel algorithms (game loops, parallel matrix ops, phases).",
        followUps: ["Can CountDownLatch deadlock?", "Phaser vs CyclicBarrier?"]
      }
    ],
    gotchas: [
      "synchronized pins virtual threads: carrier OS thread blocks during I/O — same as platform thread. Use ReentrantLock for virtual-thread code.",
      "StampedLock is NOT reentrant: calling lock() inside the same thread that holds a stamp = deadlock (no exception, just hangs).",
      "CyclicBarrier: if one thread throws exception before barrier.await(), all other waiters get BrokenBarrierException. Must handle.",
      "volatile gives VISIBILITY not ATOMICITY: volatile int x; x++ is still a race (read-increment-write = 3 ops). Use AtomicInteger.",
      "ReentrantLock: forgetting unlock() in finally = permanent deadlock for all threads waiting on that lock.",
      "ThreadLocal leak in virtual threads: child virtual threads inherit parent's ThreadLocal values — surprising shared state."
    ],
    tradeoffs: {
      pros: [
        "Virtual threads remove the need for reactive complexity.",
        "StampedLock gives near-zero overhead optimistic reads.",
        "Structured concurrency (Java 21) prevents thread leaks in fork-join patterns."
      ],
      cons: [
        "synchronized blocks pin virtual threads — subtle performance cliff.",
        "StampedLock is NOT reentrant — easy to deadlock.",
        "CyclicBarrier deadlocks if any thread dies before arriving."
      ],
      when: "**I/O-bound**: virtual threads + ReentrantLock. **CPU-bound parallel**: ForkJoinPool. **Shared cache**: StampedLock. **Connection pool**: Semaphore. **Phase sync**: CyclicBarrier."
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
