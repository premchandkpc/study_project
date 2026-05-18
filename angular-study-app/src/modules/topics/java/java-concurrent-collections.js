(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    "java-concurrent-collections",
    area:  "java",
    title: "Concurrent Collections",
    tag:   "Concurrency",
    tags:  ["java", "concurrent", "concurrenthashmap", "copyonwrite", "blockingqueue", "thread-safe", "lock-free"],

    concept: "java.util.concurrent collections provide thread safety without global locking. ConcurrentHashMap (Java 8+): CAS on empty buckets + synchronized on bucket head — only same-bucket writes contend. CopyOnWriteArrayList: writes copy the entire array (snapshot semantics, no lock for readers). BlockingQueue: put/take block via Condition await — decouples producers from consumers. ConcurrentLinkedQueue: lock-free FIFO via CAS on tail pointer.",

    why: "Collections.synchronizedMap() wraps every operation in a single mutex — kills concurrency. ConcurrentHashMap gives ~16-128x better throughput under contention. CopyOnWriteArrayList eliminates reader locks for rarely-written lists (event listeners, plugin registries). BlockingQueue is the backbone of every thread pool (ThreadPoolExecutor uses LinkedBlockingQueue internally).",

    example: {
      language: "java",
      code: `import java.util.concurrent.*;

// ConcurrentHashMap — fine-grained locking
ConcurrentHashMap<String, AtomicLong> counts = new ConcurrentHashMap<>();

// computeIfAbsent — atomic, only one thread computes per key
counts.computeIfAbsent("page_views", k -> new AtomicLong(0))
      .incrementAndGet();

// merge — atomic read-modify-write
counts.merge("errors", new AtomicLong(1),
    (existing, val) -> { existing.addAndGet(val.get()); return existing; });

// CopyOnWriteArrayList — zero-lock reads
List<EventListener> listeners = new CopyOnWriteArrayList<>();
listeners.add(new MyListener());  // copies array, slow write

// Safe concurrent iteration (snapshot of array at iterator creation)
for (EventListener l : listeners) {  // no ConcurrentModificationException
    l.onEvent(event);
}

// BlockingQueue — producer/consumer
BlockingQueue<Task> queue = new LinkedBlockingQueue<>(100); // bounded

// Producer thread
queue.put(new Task());      // blocks if full
queue.offer(task, 1, SECONDS); // timeout

// Consumer thread
Task t = queue.take();      // blocks if empty
Task t2 = queue.poll(1, SECONDS); // timeout, returns null

// Atomic counter — lock-free
LongAdder counter = new LongAdder();  // better than AtomicLong under contention
counter.increment();
long total = counter.sum();`,
    },

    interview: [
      "How does ConcurrentHashMap avoid a global lock?",
      "Why does ConcurrentHashMap forbid null keys/values?",
      "When would you use CopyOnWriteArrayList vs ConcurrentHashMap?",
      "Difference between offer() and put() on BlockingQueue?",
      "How is LongAdder better than AtomicLong under high contention?",
      "What is weakly consistent iteration in concurrent collections?",
    ],

    tradeoffs: {
      pros: [
        "ConcurrentHashMap: high throughput — only same-bucket ops contend",
        "CopyOnWriteArrayList: zero-overhead reads, never throws ConcurrentModificationException",
        "BlockingQueue: clean producer-consumer decoupling, backpressure via bounded capacity",
        "LongAdder: stripe counters across cells — no CAS spinning under contention",
      ],
      cons: [
        "ConcurrentHashMap: size() is approximate, compute() can block entire bucket",
        "CopyOnWriteArrayList: O(n) write cost — unsuitable for frequent writes or large arrays",
        "BlockingQueue: blocking threads on put/take — virtual threads reduce this cost",
        "ConcurrentLinkedQueue: size() is O(n) — avoid calling it in a loop",
      ],
    },

    gotchas: [
      "ConcurrentHashMap: null key/value throws NullPointerException — cannot distinguish \"absent\" from \"null value\"",
      "CopyOnWriteArrayList iterator sees SNAPSHOT — concurrent adds NOT visible to ongoing iteration",
      "BlockingQueue.offer() returns false silently on full — use put() when blocking guarantee needed",
      "computeIfAbsent holds bucket lock during computation — never do I/O or slow ops inside",
      "ConcurrentHashMap.size() is NOT atomic across put() calls — use mappingCount() for long precision",
      "Iterating ConcurrentHashMap is weakly consistent — may or may not reflect concurrent puts",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — ConcurrentHashMap internal structure. 128 bucket array. Empty bucket = CAS insert (no lock). Non-empty = synchronized on bucket head only. Different buckets = zero contention.",
          nodes: [
            { id: "arr",    label: "Node[] table\n128 buckets (default)",     type: "store",     active: true },
            { id: "t1",     label: "Thread 1\nput(\"cat\", 1)\nbucket[3]",      type: "component", active: true },
            { id: "t2",     label: "Thread 2\nput(\"dog\", 2)\nbucket[7]",      type: "component", active: true },
            { id: "b3",     label: "Bucket[3] EMPTY\n→ CAS(null, node)\n(no lock needed!)", type: "action",    active: true },
            { id: "b7",     label: "Bucket[7] EMPTY\n→ CAS(null, node)\n(no lock needed!)", type: "action",    active: true },
          ],
          edges: [
            { from: "arr", to: "b3",  label: "", active: true },
            { from: "arr", to: "b7",  label: "", active: true },
            { from: "t1",  to: "b3",  label: "CAS insert — no lock", active: true, color: "#3fb950" },
            { from: "t2",  to: "b7",  label: "CAS insert — no lock", active: true, color: "#3fb950" },
          ],
          code: `// ConcurrentHashMap.putVal — simplified
final V putVal(K key, V value, boolean onlyIfAbsent) {
    int hash = spread(key.hashCode());
    for (Node<K,V>[] tab = table;;) {
        int i = (tab.length - 1) & hash;
        Node<K,V> f = tabAt(tab, i);        // volatile read

        if (f == null) {
            // EMPTY bucket — CAS, no lock
            if (casTabAt(tab, i, null, new Node<>(hash, key, value)))
                break;  // success
        } else {
            // NON-EMPTY — lock only THIS bucket's head node
            synchronized (f) {
                // insert or update chain/tree
            }
        }
    }
}
// Two threads on DIFFERENT buckets: zero contention — fully parallel
// Two threads on SAME bucket: only that bucket's lock → fine-grained`,
        },
        {
          phase: "update",
          narration: "Step 2 — ConcurrentHashMap compute operations. computeIfAbsent: atomic cache-load pattern. merge: atomic read-modify-write. Only ONE thread computes per key.",
          nodes: [
            { id: "ta",     label: "Thread A\ncomputeIfAbsent(\"userId\", loadFn)", type: "component", active: true },
            { id: "tb",     label: "Thread B\ncomputeIfAbsent(\"userId\", loadFn)", type: "component", active: true },
            { id: "lock",   label: "Bucket[\"userId\"] locked\nThread A computes",   type: "reducer",   active: true },
            { id: "wait",   label: "Thread B waits\n(same bucket lock)",           type: "cache",     active: true, dim: true },
            { id: "result", label: "User loaded once\nThread B gets cached result", type: "action",   active: true },
          ],
          edges: [
            { from: "ta",     to: "lock",   label: "wins lock", active: true, color: "#3fb950" },
            { from: "tb",     to: "wait",   label: "waits", active: true, color: "#f85149" },
            { from: "lock",   to: "result", label: "computes + stores", active: true, color: "#ffa657" },
            { from: "wait",   to: "result", label: "gets cached", active: true, color: "#3fb950" },
          ],
          code: `// computeIfAbsent — one DB load per key, no matter how many threads
ConcurrentHashMap<String, User> cache = new ConcurrentHashMap<>();

User user = cache.computeIfAbsent(userId, id -> {
    return db.loadUser(id);  // called ONCE even under high concurrency
    // WARNING: holds bucket lock during this call
    // Do NOT do slow I/O here — use async pre-loading pattern
});

// merge — thread-safe counter per key
Map<String, Long> wordCount = new ConcurrentHashMap<>();
wordCount.merge("hello", 1L, Long::sum);  // atomic increment

// putIfAbsent vs computeIfAbsent:
// putIfAbsent ALWAYS evaluates the value expression
cache.putIfAbsent(key, expensiveCompute()); // computes even if key exists!
// computeIfAbsent evaluates ONLY if key absent
cache.computeIfAbsent(key, k -> expensiveCompute()); // lazy — safe

// LongAdder — better than AtomicLong under high contention
LongAdder hits = new LongAdder();
hits.increment();   // stripes across CPU cells — no CAS spinning
hits.sum();         // sum all cells — O(cells) but rare`,
        },
        {
          phase: "effect",
          narration: "Step 3 — CopyOnWriteArrayList. Write = copy entire array. Read = no lock, reads stable snapshot. Iterator reflects array state at iterator creation time.",
          nodes: [
            { id: "arr2",   label: "volatile Object[] array\n→ [L1, L2, L3]",             type: "store",     active: true },
            { id: "reader", label: "Reader Thread\nfor(l : listeners)\n→ sees [L1,L2,L3]", type: "component", active: true },
            { id: "writer", label: "Writer Thread\nlisteners.add(L4)",                      type: "component", active: true },
            { id: "copy",   label: "synchronized: copy array\nnew Object[]{L1,L2,L3,L4}",  type: "action",    active: true },
            { id: "swap",   label: "volatile write:\narray = newArray",                     type: "cache",     active: true },
            { id: "reader2",label: "Next reader sees [L1,L2,L3,L4]\nOld reader still on snapshot", type: "component", active: true },
          ],
          edges: [
            { from: "arr2",   to: "reader", label: "read snapshot (no lock)", active: true, color: "#3fb950" },
            { from: "writer", to: "copy",   label: "acquire lock + copy", active: true, color: "#ffa657" },
            { from: "copy",   to: "swap",   label: "modify copy", active: true },
            { from: "swap",   to: "arr2",   label: "atomic ref swap", active: true, color: "#3fb950" },
            { from: "swap",   to: "reader2",label: "future readers", active: true, color: "#58a6ff" },
          ],
          code: `// CopyOnWriteArrayList — write path
public boolean add(E e) {
    synchronized (lock) {
        Object[] snapshot = getArray();
        int len = snapshot.length;
        Object[] newElements = Arrays.copyOf(snapshot, len + 1); // O(n) copy!
        newElements[len] = e;
        setArray(newElements);   // volatile write — atomic reference swap
        return true;
    }
}

// Read path — NO lock
public E get(int index) {
    return elementAt(getArray(), index);  // getArray() = volatile read
}

// Iterator = snapshot at creation time
List<EventListener> listeners = new CopyOnWriteArrayList<>();
listeners.add(new L1()); listeners.add(new L2());

Iterator<EventListener> it = listeners.iterator(); // snapshot: [L1, L2]
listeners.add(new L3()); // write: copies to [L1, L2, L3]
it.next(); // still sees L1 — iterator won't reflect L3

// Use when: reads >> writes (event bus, observer lists, config reload)
// Avoid: frequently mutated large lists — GC pressure from discarded arrays`,
        },
        {
          phase: "suspend",
          narration: "Step 4 — BlockingQueue: producer blocks when full, consumer blocks when empty. LinkedBlockingQueue uses TWO separate locks (putLock + takeLock) for max throughput.",
          nodes: [
            { id: "prod1",  label: "Producer Thread\nqueue.put(task)",           type: "component", active: true },
            { id: "prod2",  label: "Producer Thread 2\nqueue.put(task)",         type: "component", active: true },
            { id: "queue",  label: "LinkedBlockingQueue\ncapacity=100\n[T1][T2][T3]...full!", type: "store", active: true },
            { id: "block",  label: "Producer BLOCKED\nawait notFull condition",  type: "reducer",   active: true },
            { id: "cons",   label: "Consumer Thread\nqueue.take() → dequeues",  type: "component", active: true },
            { id: "wake",   label: "notFull.signal()\nblocked producer wakes",  type: "action",    active: true },
          ],
          edges: [
            { from: "prod1", to: "queue", label: "put() — enqueue", active: true, color: "#3fb950" },
            { from: "prod2", to: "block", label: "put() → full → block", active: true, color: "#f85149" },
            { from: "cons",  to: "queue", label: "take() — dequeue", active: true, color: "#ffa657" },
            { from: "cons",  to: "wake",  label: "signals notFull", active: true, color: "#3fb950" },
            { from: "wake",  to: "prod2", label: "wakes up", active: true, color: "#3fb950" },
          ],
          code: `// LinkedBlockingQueue — TWO locks for max throughput
// putLock: producers use this (head of queue)
// takeLock: consumers use this (tail of queue)
// Producer and consumer never contend unless queue is 0 or max capacity

// put() — blocks if full
public void put(E e) throws InterruptedException {
    putLock.lockInterruptibly();
    try {
        while (count.get() == capacity)
            notFull.await();    // block — releases putLock
        enqueue(node);
        if (count.getAndIncrement() + 1 < capacity)
            notFull.signal();   // signal another waiting producer
    } finally { putLock.unlock(); }
    if (count.get() > 0) signalNotEmpty(); // wake a consumer
}

// Variants:
ArrayBlockingQueue<Task>  q1 = new ArrayBlockingQueue<>(100);   // single lock
LinkedBlockingQueue<Task> q2 = new LinkedBlockingQueue<>(100);  // 2 locks (faster)
SynchronousQueue<Task>    q3 = new SynchronousQueue<>();         // no capacity, rendezvous
PriorityBlockingQueue<T>  q4 = new PriorityBlockingQueue<>();   // unbounded + priority`,
        },
        {
          phase: "resolve",
          narration: "Step 5 — Lock-free: ConcurrentLinkedQueue + LongAdder. No locks, just CAS. LongAdder stripes counter across CPU cells — collapses under contention.",
          nodes: [
            { id: "clq",    label: "ConcurrentLinkedQueue\nlock-free FIFO\nCAS on tail pointer",       type: "component", active: true },
            { id: "cas",    label: "offer(): CAS(tail.next, null, newNode)\nRetry loop if CAS fails",  type: "action",    active: true },
            { id: "ladder", label: "LongAdder\n[cell0][cell1][cell2][cell3]\nstripe per thread",        type: "store",     active: true },
            { id: "atomic", label: "AtomicLong\nsingle CAS → spinning under\nhigh contention (bad)",   type: "reducer",   active: true, dim: true },
            { id: "sum",    label: "LongAdder.sum()\nadd all cells → total\nrarely needed",            type: "cache",     active: true },
          ],
          edges: [
            { from: "clq",    to: "cas",    label: "non-blocking offer/poll", active: true, color: "#3fb950" },
            { from: "ladder", to: "sum",    label: "sum()", active: true, color: "#ffa657" },
            { from: "atomic", to: "ladder", label: "upgrade to under contention", active: true, color: "#58a6ff" },
          ],
          code: `// ConcurrentLinkedQueue — Michael-Scott queue algorithm
// Lock-free FIFO via CAS on tail
Queue<Task> q = new ConcurrentLinkedQueue<>();
q.offer(task);  // never blocks — CAS on tail.next
q.poll();       // never blocks — CAS on head
// WARNING: size() is O(n) — traverses entire list
//          use Deque<T> + ConcurrentLinkedDeque if size matters

// LongAdder vs AtomicLong
// AtomicLong: one cell, all threads CAS on it → spinning under load
AtomicLong al = new AtomicLong();
al.incrementAndGet();   // CAS — contended at high throughput

// LongAdder: stripes value across CPU cells
LongAdder la = new LongAdder();
la.increment();  // each thread uses its own cell — no CAS collision
la.sum();        // summing cells — O(cells), call rarely (monitoring only)

// Throughput comparison at 16 threads:
// AtomicLong:  ~80M ops/sec (CAS backoff)
// LongAdder:   ~900M ops/sec (no contention per thread)

// Use LongAdder for high-frequency counters (metrics, rate limiting)
// Use AtomicLong when you need exact value after each op`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Concurrent Collections",
        time:  "O(1) CAS / O(n) copy",
        space: "O(n)",
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
