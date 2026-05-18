(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    "java-locks",
    area:  "java",
    title: "synchronized vs ReentrantLock",
    tag:   "Concurrency",
    tags:  ["java", "synchronized", "reentrantlock", "monitor", "deadlock", "concurrency"],

    concept: "synchronized is a JVM-level intrinsic lock on any object's monitor. Simple and automatic — acquired on block entry, released on exit (even on exception). ReentrantLock (java.util.concurrent.locks) is explicit: lock()/unlock() in try/finally. ReentrantLock adds tryLock(), lockInterruptibly(), timed lock, multiple Condition objects, and fairness mode. Both are reentrant — same thread can re-acquire without deadlock.",

    why: "synchronized works for simple mutual exclusion. ReentrantLock is needed when you require: timeout on lock attempt, interruptible waiting, multiple condition queues (producer-consumer), fair scheduling, or when synchronized would pin a virtual thread (Loom). Understanding monitor internals explains spurious wakeups and wait/notify semantics.",

    example: {
      language: "java",
      code: `// synchronized — simple
class Counter {
    private int count = 0;
    synchronized void increment() { count++; }
    synchronized int get() { return count; }
}

// ReentrantLock — explicit
class BoundedQueue<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull  = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();
    private final Queue<T> queue = new ArrayDeque<>();
    private final int capacity;

    void put(T item) throws InterruptedException {
        lock.lock();
        try {
            while (queue.size() == capacity) notFull.await();
            queue.offer(item);
            notEmpty.signal();
        } finally {
            lock.unlock();  // ALWAYS in finally
        }
    }

    T take() throws InterruptedException {
        lock.lock();
        try {
            while (queue.isEmpty()) notEmpty.await();
            T item = queue.poll();
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
}

// tryLock — non-blocking acquisition attempt
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try { /* critical section */ }
    finally { lock.unlock(); }
} else {
    // failed to acquire — handle gracefully
}`,
    },

    interview: [
      "What is the difference between synchronized and ReentrantLock?",
      "What is a monitor and how does wait/notify work?",
      "Why must lock.unlock() always be in a finally block?",
      "What is a spurious wakeup and how do you handle it?",
      "How does tryLock() help avoid deadlock?",
    ],

    tradeoffs: {
      pros: [
        "synchronized: automatic release, no forget-unlock bug, simpler code",
        "ReentrantLock: tryLock/timed/interruptible — prevents indefinite blocking",
        "ReentrantLock: multiple Condition objects — finer-grained wait/notify",
        "ReentrantLock(true): fair mode — FIFO thread ordering (avoids starvation)",
      ],
      cons: [
        "synchronized: no timeout, no interruption, one condition queue (wait/notify)",
        "synchronized: pins virtual threads in Loom scenarios",
        "ReentrantLock: must call unlock() in finally — easy to forget → deadlock",
        "ReentrantLock: verbose code vs clean synchronized block syntax",
      ],
    },

    gotchas: [
      "Always use while loop (not if) for condition check — spurious wakeups occur",
      "ReentrantLock.unlock() in finally is mandatory — exception without unlock = permanent deadlock",
      "notifyAll() vs notify(): notify() wakes one random thread — use notifyAll() for safety with multiple conditions",
      "synchronized on different objects = no mutual exclusion — must lock SAME object",
      "Deadlock: T1 holds lockA wants lockB; T2 holds lockB wants lockA — detect with jstack",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — Object Monitor (synchronized). Every Java object has a monitor with 3 areas: entry set (waiting for lock), owner (current lock holder), wait set (threads in wait()).",
          nodes: [
            { id: "obj",    label: "Object Monitor",         type: "store",     active: true },
            { id: "entry",  label: "Entry Set\n[ T2, T3 ]\n(waiting for lock)", type: "cache", active: true },
            { id: "owner",  label: "Owner: T1\n(holds lock)",  type: "action",  active: true },
            { id: "wait",   label: "Wait Set\n[ T4 ]\n(called wait())",  type: "network", active: true },
          ],
          edges: [
            { from: "obj",   to: "entry",  label: "", active: true },
            { from: "obj",   to: "owner",  label: "", active: true },
            { from: "obj",   to: "wait",   label: "", active: true },
            { from: "entry", to: "owner",  label: "when T1 exits", active: true, color: "#3fb950" },
            { from: "wait",  to: "entry",  label: "notify() → moves here", active: true, color: "#ffa657" },
          ],
          code: `// Every Java object is a potential monitor
synchronized (sharedObject) {
    // T1 owns monitor
    // T2, T3 block in entry set

    while (!condition) {
        sharedObject.wait();  // T1 → wait set, releases monitor
        // spurious wakeup possible → use while, not if
    }
    // do work
    sharedObject.notify();    // move one thread from wait set to entry set
    sharedObject.notifyAll(); // move ALL threads from wait set to entry set
} // monitor released → entry set thread competes`,
        },
        {
          phase: "update",
          narration: "Step 2 — synchronized deadlock. T1 holds LockA, wants LockB. T2 holds LockB, wants LockA. Both wait forever — circular dependency.",
          nodes: [
            { id: "t1",    label: "Thread 1\nholds: LockA\nwants: LockB", type: "reducer", active: true },
            { id: "t2",    label: "Thread 2\nholds: LockB\nwants: LockA", type: "reducer", active: true },
            { id: "la",    label: "LockA\nowner: T1",  type: "store",     active: true },
            { id: "lb",    label: "LockB\nowner: T2",  type: "store",     active: true },
          ],
          edges: [
            { from: "t1", to: "la", label: "holds", active: true, color: "#3fb950" },
            { from: "t1", to: "lb", label: "wants → BLOCKED", active: true, color: "#f85149" },
            { from: "t2", to: "lb", label: "holds", active: true, color: "#3fb950" },
            { from: "t2", to: "la", label: "wants → BLOCKED", active: true, color: "#f85149" },
          ],
          code: `// Deadlock — both threads stuck forever
// Thread 1:
synchronized (lockA) {
    synchronized (lockB) { /* never reached */ }
}

// Thread 2:
synchronized (lockB) {
    synchronized (lockA) { /* never reached */ }
}

// Prevention:
// 1. Always acquire locks in same ORDER: lockA then lockB everywhere
// 2. Use tryLock() with timeout (ReentrantLock)
// 3. jstack <pid> to detect deadlock in prod`,
        },
        {
          phase: "effect",
          narration: "Step 3 — ReentrantLock with tryLock. T2 tries lock with 100ms timeout. Fails → falls back gracefully instead of waiting forever.",
          nodes: [
            { id: "rl",      label: "ReentrantLock\nowner: T1",       type: "store",     active: true },
            { id: "t1b",     label: "Thread 1\n(holds lock)",          type: "component", active: true },
            { id: "t2b",     label: "Thread 2\ntryLock(100ms)",        type: "component", active: true },
            { id: "timeout", label: "Timeout!\nfallback logic runs",   type: "action",    active: true },
          ],
          edges: [
            { from: "t1b",    to: "rl",      label: "lock()", active: true, color: "#3fb950" },
            { from: "t2b",    to: "rl",      label: "tryLock(100ms)", active: true },
            { from: "t2b",    to: "timeout", label: "false → handle", active: true, color: "#ffa657" },
          ],
          code: `ReentrantLock lock = new ReentrantLock();

// Thread 2 — non-blocking with timeout
boolean acquired = lock.tryLock(100, TimeUnit.MILLISECONDS);
if (acquired) {
    try {
        // critical section
    } finally {
        lock.unlock();  // MANDATORY in finally
    }
} else {
    // graceful fallback — return cached data, retry, etc.
    log.warn("Could not acquire lock, using fallback");
}

// lockInterruptibly() — can be cancelled via Thread.interrupt()
lock.lockInterruptibly(); // throws InterruptedException if interrupted
// Useful for cooperative task cancellation`,
        },
        {
          phase: "commit",
          narration: "Step 4 — ReentrantLock Condition: two separate condition queues for producer-consumer. notFull for producers, notEmpty for consumers.",
          nodes: [
            { id: "rl2",      label: "ReentrantLock",          type: "store",     active: true },
            { id: "notfull",  label: "Condition: notFull\n[ producers waiting ]", type: "cache", active: true },
            { id: "notempty", label: "Condition: notEmpty\n[ consumers waiting ]", type: "network", active: true },
            { id: "prod",     label: "Producer\nawait notFull",  type: "component", active: true },
            { id: "cons",     label: "Consumer\nawait notEmpty", type: "component", active: true },
          ],
          edges: [
            { from: "rl2",     to: "notfull",  label: "newCondition()", active: true },
            { from: "rl2",     to: "notempty", label: "newCondition()", active: true },
            { from: "prod",    to: "notfull",  label: "await() when full", active: true, color: "#ffa657" },
            { from: "cons",    to: "notempty", label: "await() when empty", active: true, color: "#ffa657" },
            { from: "cons",    to: "notfull",  label: "signal() after take", active: true, color: "#3fb950" },
            { from: "prod",    to: "notempty", label: "signal() after put", active: true, color: "#3fb950" },
          ],
          code: `// synchronized only has ONE wait set → notifyAll() wakes ALL threads
// ReentrantLock has MULTIPLE Conditions → precise signaling

final ReentrantLock lock = new ReentrantLock();
final Condition notFull  = lock.newCondition(); // producers wait here
final Condition notEmpty = lock.newCondition(); // consumers wait here

// Producer
lock.lock();
try {
    while (isFull()) notFull.await();    // only producers sleep here
    add(item);
    notEmpty.signal();  // wake ONE consumer — not producers
} finally { lock.unlock(); }

// Consumer
lock.lock();
try {
    while (isEmpty()) notEmpty.await();  // only consumers sleep here
    T item = remove();
    notFull.signal();   // wake ONE producer — not consumers
} finally { lock.unlock(); }`,
        },
        {
          phase: "render",
          narration: "Step 5 — synchronized vs ReentrantLock decision guide. Choose based on needs.",
          nodes: [
            { id: "q1",   label: "Need timeout\nor interruption?",     type: "component", active: true },
            { id: "q2",   label: "Need multiple\ncondition queues?",   type: "component", active: true },
            { id: "q3",   label: "Using Virtual\nThreads (Loom)?",    type: "component", active: true },
            { id: "rl3",  label: "→ ReentrantLock",                    type: "action",    active: true },
            { id: "sync", label: "→ synchronized\n(simpler)",          type: "store",     active: true },
          ],
          edges: [
            { from: "q1",  to: "rl3",  label: "YES", active: true, color: "#3fb950" },
            { from: "q2",  to: "rl3",  label: "YES", active: true, color: "#3fb950" },
            { from: "q3",  to: "rl3",  label: "YES (avoids pinning)", active: true, color: "#3fb950" },
            { from: "q1",  to: "sync", label: "NO", active: true, color: "#768390" },
          ],
          code: `// Decision guide:
// synchronized                    ReentrantLock
// ─────────────────────────────────────────────
// Simple mutual exclusion     │  Timeout/tryLock needed
// Auto-release (no finally)   │  Interruptible waiting
// Single condition (wait/     │  Multiple Condition queues
//   notify/notifyAll)         │  Fair scheduling (FIFO)
// Readable, less code         │  Virtual thread friendly
//                             │  Lock monitoring (isLocked, etc.)

// Java 21 recommendation:
// - New code: prefer ReentrantLock (virtual-thread safe)
// - Simple cases: synchronized still fine for platform threads
// - Producer-consumer: always ReentrantLock + Conditions
// - Or use: java.util.concurrent.BlockingQueue (handles it all)`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "synchronized vs ReentrantLock",
        time:  "O(1) lock/unlock",
        space: "O(threads)",
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
