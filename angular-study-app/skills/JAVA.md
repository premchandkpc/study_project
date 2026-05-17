# Java Topics — Advanced Interactive Visualization System

**Topic file location:** `src/modules/topics/java/`  
**Topic array:** `window.JAVA_TOPICS`  
**Area string:** `"java"`  :contentReference[oaicite:0]{index=0}

---

# 🚀 Goal

```txt
Static concepts  →  Interactive JVM simulations
Reading threads  →  Watching concurrency alive
Studying GC      →  Seeing object movement visually
Understanding    →  Experiencing internals
```

Inspired by:
```txt
ByteByteGo
Excalidraw
Miro
IntelliJ Debugger
VisualVM
JProfiler
Grafana
Linear
Netflix Tech UI
```

---

# Existing Topics

| File | Title | Visual |
|---|---|---|
| `java-jvm-memory-gc.js` | JVM Memory & GC | Heap + GC flow |
| `java-concurrency.js` | Java Concurrency | Thread lifecycle |
| `java-streams.js` | Streams API | Stream pipeline |
| `java-collections.js` | Collections | HashMap internals |
| `java-spring-boot.js` | Spring Boot | Request lifecycle |
| `java-spring-data-jpa.js` | Spring Data JPA | ORM lifecycle |
| `java-webflux.js` | WebFlux/Reactor | Marble diagrams |
| `java-records-sealed-patterns.js` | Records/Sealed | Pattern matching |
| `java-jit-performance.js` | JIT Compilation | C1/C2 flow |
| `java-virtual-threads.js` | Virtual Threads (Project Loom) | FlowDiagram: VT mount/unmount on carrier threads |
| `java-string-pool.js` | String Pool Internals | FlowDiagram: pool lookup, heap vs pool objects |
| `java-locks.js` | synchronized vs ReentrantLock | FlowDiagram: monitor, deadlock, condition queues |
| `java-completablefuture.js` | CompletableFuture Pipeline | FlowDiagram: async stages, fan-out, error handling |
| `java-gc-collectors.js` | GC Collectors: G1, ZGC, Shenandoah | FlowDiagram: region layout, colored pointers, pause phases |
| `java-collection-types.js` | Java Collection Types Deep Dive | ComponentTree: hierarchy + FlowDiagram: ArrayList resize, Set buckets, PriorityQueue heap, Map comparison |
| `java-concurrent-collections.js` | Concurrent Collections | FlowDiagram: ConcurrentHashMap bucket CAS, CopyOnWrite snapshot, BlockingQueue producer/consumer, LongAdder stripes |

---

## Visual Style References (inputs/)

| Image | Apply to Java topics |
|---|---|
| `inputs/image copy 11.png` — Kafka swimlane (5 colored rows, animated dots) | **Java Concurrency:** rows = Thread states (NEW/RUNNABLE/BLOCKED/WAITING/TERMINATED). Dots show thread transitions. **Virtual Threads:** rows = Platform threads (limited) vs Virtual threads (millions). **Concurrent Collections:** rows = ConcurrentHashMap/CopyOnWrite/BlockingQueue/LongAdder |
| `inputs/image copy 7.png` — Blueprint colored section boxes, numbered callouts | **JVM Memory:** colored bands per memory region (Eden/S0/S1/OldGen/Metaspace/CodeCache/DirectBuffers). Numbered arrows show object lifecycle ①allocate→②minor GC→③promote→④major GC |
| `inputs/image copy 8.png` — DB Scaling Cheatsheet wheel (7 strategies pie) | **GC Collectors:** center = "GC Collectors", pie segments = G1/ZGC/Shenandoah/Serial/Parallel/CMS. Each segment → mini-diagram of pause/concurrent phases |
| `inputs/image copy 9.png` — YouTube numbered circular loop | **Spring Boot request:** circular numbered flow ①Client→②Filter Chain→③DispatcherServlet→④Controller→⑤Service→⑥Repository→⑦DB→⑧back |
| `inputs/image copy 3.png` — Architecture wheel, center hub + radial | **Java Collections hierarchy:** center = "Collection", radial branches = List/Set/Queue/Map/Deque with implementations |
| `inputs/image copy.png` — Green tree hierarchy | **ClassLoader chain:** Bootstrap→Extension→Application→Custom. Delegation model tree |
| `inputs/image copy 12.png` — SQL mind map (dark bg, radial color branches) | **Java Memory Model:** center = "JMM", branches = happens-before/volatile/synchronized/atomic/reordering |

## Always-Visible Swimlane Pattern for Java Topics

Use ByteByteGo swimlane (like `sd-kafka-arch.js`) for topics comparing multiple variants:

```
GC Collectors topic:      3 rows (G1 / ZGC / Shenandoah) — pause phases animated
Virtual Threads topic:    2 rows (Platform threads / Virtual threads) — scaling comparison  
Concurrent Collections:  4 rows (already built this way in java-concurrent-collections.js)
Lock types topic:         3 rows (synchronized / ReentrantLock / StampedLock)
```

Use `ReactViz.panel` step-by-step for single-lifecycle topics:
```
JVM Memory GC:   allocation→minor GC→promotion→major GC (sequential steps)
CompletableFuture: supplyAsync→thenApply→thenCombine→exceptionally (pipeline steps)
```

# High-Value Topics To Add

| Topic | Priority | Visualization | Status |
|---|---|---|---|
| ~~Virtual Threads (Loom)~~ | ~~HIGH~~ | FlowDiagram | ✅ Built |
| ~~String Pool~~ | ~~HIGH~~ | FlowDiagram | ✅ Built |
| ~~CompletableFuture~~ | ~~HIGH~~ | FlowDiagram | ✅ Built |
| ~~Synchronized vs Lock~~ | ~~HIGH~~ | FlowDiagram | ✅ Built |
| ~~G1/ZGC/Shenandoah~~ | ~~HIGH~~ | FlowDiagram | ✅ Built |
| Java Memory Model | HIGH | Swimlane — 4 rows | 🔲 Missing |
| ForkJoinPool & work-stealing | HIGH | Swimlane — 3 rows | 🔲 Missing |
| ClassLoader Chain | HIGH | FlowDiagram vertical | 🔲 Missing |
| Spring Transactions | HIGH | FlowDiagram — propagation table | 🔲 Missing |
| Hibernate / JPA Internals | HIGH | FlowDiagram 5-step | 🔲 Missing |
| Bytecode & JIT | MEDIUM | FlowDiagram pipeline | 🔲 Missing |
| Java NIO / Selector | MEDIUM | FlowDiagram selector loop | 🔲 Missing |
| Reflection / Dynamic Proxy | MEDIUM | ComponentTree | 🔲 Missing |
| Netty EventLoop | MEDIUM | Swimlane — 2 rows | 🔲 Missing |
| Kafka Consumer (Java) | MEDIUM | FlowDiagram poll loop | 🔲 Missing |
| Unsafe / VarHandle | LOW | FlowDiagram | 🔲 Missing |

---

## Detailed Visual Specs — Missing HIGH Priority Topics

### `java-memory-model.js` — Java Memory Model (JMM)

**Suggested visual:** Always-visible swimlane (4 rows) — ref: `inputs/image copy 12.png` (mind map, dark bg)

```
Rows:
  Row 1 NO-SYNC (red #f85149):
    Thread A writes flag=true → CPU cache A → NOT flushed → Thread B reads false (stale)
    Animated: write stays in cache, dotted "stale read" crosses to Thread B
  Row 2 VOLATILE (blue #58a6ff):
    volatile write → memory barrier → main memory → Thread B reads fresh value
    Animated: write crosses from cache → main mem → Thread B
  Row 3 SYNCHRONIZED (green #3fb950):
    Thread A: monitor enter → write → monitor exit (fence) → Thread B: monitor enter → read fresh
    Animated: lock icon, critical section highlight, release → acquire happens-before edge
  Row 4 ATOMIC (purple #d2a8ff):
    AtomicInteger.compareAndSet(0,1) → CAS instruction → hardware-level atomic
    Animated: CAS arrow, success/fail branch

Concepts to cover:
  - Happens-before rules (all 8 JMM rules)
  - Visibility vs atomicity vs ordering (3 separate problems)
  - volatile guarantees visibility + ordering, NOT atomicity
  - double-checked locking ONLY safe with volatile field
  - Reordering: compiler/CPU can reorder stores — memory fence prevents
```

### `java-forkjoin-workstealing.js` — ForkJoinPool & Work Stealing

**Suggested visual:** Always-visible swimlane (3 rows) — ref: `inputs/image copy 11.png` (Kafka swimlane)

```
Rows:
  Row 1 DEQUES (orange #ffa657):
    Worker 0: [T1,T2,T3,T4] → pushes to head, pops from head (LIFO = cache-friendly)
    Worker 1: [T5,T6] → idle → steals T4 from Worker 0's TAIL (FIFO steal)
    Animated: steal arrow from tail of busy worker to idle worker
  Row 2 FORK/JOIN TREE (blue #58a6ff):
    fork(left) + fork(right) → parallel subtasks → join() waits → combine results
    Animated: recursion tree expanding left+right, then merging up
  Row 3 COMMONPOOL (green #3fb950):
    parallelStream().map() uses ForkJoinPool.commonPool()
    Async tasks with ManagedBlocker for blocking IO

Concepts:
  - RecursiveTask<V> (returns value) vs RecursiveAction (void)
  - Work-stealing: idle workers steal from TAIL of other workers' deques
  - LIFO local / FIFO steal = cache-friendly + good load balancing
  - commonPool vs custom pool (custom for blocking IO to avoid starvation)
  - ForkJoinPool.ManagedBlocker for blocking operations in commonPool
```

### `java-classloader.js` — ClassLoader Chain & Delegation

**Suggested visual:** Vertical FlowDiagram (5-step) — ref: `inputs/image copy.png` (green tree hierarchy)

```
5-step FlowDiagram:
  Step 1 (render):  Bootstrap ClassLoader — loads rt.jar / java.base. Written in C. Null parent.
  Step 2 (commit):  Extension/Platform ClassLoader — loads $JAVA_HOME/lib/ext (Java 8) / java.se module (9+)
  Step 3 (effect):  Application ClassLoader — loads classpath. Default CL for your code.
  Step 4 (update):  Custom ClassLoader — plugin systems, hot-reload, isolation (Tomcat, OSGi)
  Step 5 (cleanup): Delegation model: child CL asks parent FIRST. Parent returns class or delegates down.

Delegation algorithm code:
  protected Class<?> loadClass(String name, boolean resolve) {
    Class<?> c = findLoadedClass(name);        // 1. cache check
    if (c == null) {
      c = parent.loadClass(name, resolve);     // 2. delegate up
      if (c == null) c = findClass(name);      // 3. find locally
    }
    return c;
  }

FlowDiagram nodes:
  requestingClass(component) → AppClassLoader(store) → ExtClassLoader(cache)
  → BootstrapCL(server) → not found → findClass(action) → Class loaded(store)

Gotchas to include:
  - ClassCastException from different CLs loading same class
  - Memory leak: Class → ClassLoader → all loaded classes (common in web apps)
  - TCCL (Thread Context ClassLoader) — Spring uses this for plugin isolation
```

### `java-spring-transactions.js` — Spring Transactions & Propagation

**Suggested visual:** FlowDiagram + propagation grid table

```
5-step FlowDiagram:
  Step 1 (render):  @Transactional on Service method → Spring proxy intercepts
  Step 2 (commit):  PlatformTransactionManager: begin tx → connection.setAutoCommit(false)
  Step 3 (effect):  Propagation: REQUIRED (join existing), REQUIRES_NEW (suspend + new), NESTED (savepoint)
  Step 4 (update):  Exception: @Transactional(rollbackFor=Exception.class). RuntimeException → auto rollback. Checked → commit by default!
  Step 5 (cleanup): commit → connection.commit() → autoCommit restore → connection returned to pool

Propagation behavior grid (must include):
  REQUIRED:     outer exists? JOIN it. No outer? CREATE new.
  REQUIRES_NEW: always CREATE new, SUSPEND outer (separate connection!)
  SUPPORTS:     outer exists? JOIN it. No outer? non-tx.
  NOT_SUPPORTED: always run non-tx, suspend outer.
  MANDATORY:    outer MUST exist, else IllegalTransactionStateException.
  NEVER:        outer must NOT exist, else exception.
  NESTED:       savepoint in existing tx. Rollback only rolls back nested.

Gotchas nodes to highlight:
  - self-invocation bypass: @Transactional on private method = no proxy = no tx
  - checked exceptions don't rollback by default (Java legacy reason)
  - REQUIRES_NEW gets new connection = can deadlock if outer holds a row lock
  - @Transactional only works on Spring-managed beans (not new MyService())
```

### `java-hibernate-internals.js` — Hibernate / JPA Internals

**Suggested visual:** 5-step FlowDiagram

```
5-step FlowDiagram:
  Step 1 (render):  EntityManager / Session — persistence context = 1st level cache. Identity map: id→entity.
  Step 2 (commit):  Dirty checking: snapshot at load vs current state → auto-generates UPDATE on flush
  Step 3 (effect):  Lazy loading: proxy object (subclass). Trigger on field access → SELECT. LazyInitializationException outside session.
  Step 4 (update):  N+1 problem: @OneToMany default LAZY → loop calls .getOrders() → N selects. Fix: @EntityGraph / JOIN FETCH / batch size
  Step 5 (cleanup): 2nd level cache (EHCache/Infinispan). Shared across sessions. Invalidated on write.

Node types:
  EntityManager(store), PersistenceContext(cache), dirty-check(selector),
  proxy(component), N+1-query(action red), 2ndLevelCache(network)

Gotchas to include:
  - flush modes: COMMIT (default), ALWAYS, MANUAL
  - open-session-in-view antipattern: keeps connection open during rendering
  - @Transactional + @Query: queries auto-flush before executing (dirty state visible)
  - Entity lifecycle states: transient → managed → detached → removed
```

---

# Java Topic File Pattern

```js
(function () {
  'use strict';

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id: 'java-topic',
    area: 'java',
    title: 'Topic',
    tag: 'Internals',
    tags: ['java','jvm'],

    concept: `Explanation`,
    why: `Production relevance`,

    example: {
      language: 'java',
      code: `// Java code`,
    },

    interview: [
      'Question 1?',
      'Question 2?',
    ],

    tradeoffs: {
      pros: ['...'],
      cons: ['...'],
    },

    gotchas: [
      'Issue 1',
    ],

    visual: function (mount) {
      // ReactViz.FlowDiagram
      // DSA.ArrayAnimation
      // ReactViz.ComponentTree
    },
  }]);
})();
```

---

# 1. JVM Memory Cinematic Visualization

Visualize:
```txt
Stack
Heap
Eden
S0/S1
Old Gen
Metaspace
Direct Buffers
Code Cache
Native Memory
```

Animations:
```txt
Allocation
Promotion
Minor GC
Major GC
Compaction
Fragmentation
OOM
Memory leak
Stop-the-world
```

Example:
```js
ReactViz.FlowDiagram.render(el,
[
  { id:'eden', label:'Eden', type:'memory', active:true },
  { id:'s0', label:'S0', type:'memory' },
  { id:'old', label:'Old Gen', type:'memory' },
],
[
  { from:'eden', to:'s0', label:'Minor GC' },
  { from:'s0', to:'old', label:'Promotion' },
],
{ layout:'horizontal' });
```

---

# 2. Virtual Threads (Project Loom)

Visualize:
```txt
Virtual Threads
Carrier Threads
Parking
Continuation
Scheduler
Blocking IO
```

Animations:
```txt
Mount/unmount
Parking
Wakeup
Continuation restore
Massive scaling
```

Example:
```js
ThreadViz.render({
  carriers:4,
  virtualThreads:10000,
});
```

Interactive:
```txt
Pause scheduler
Increase load
Compare platform vs virtual threads
Trigger blocking calls
```

---

# 3. CompletableFuture DAG Visualization

Visualize:
```txt
supplyAsync
thenApply
thenCompose
allOf
anyOf
exceptionally
handle
```

Animations:
```txt
DAG execution
Failure propagation
Parallel completion
Thread switching
```

Example:
```js
AsyncGraph.render({
  nodes:[
    { id:'fetchUser', type:'async' },
    { id:'fetchOrders', type:'async' },
    { id:'combine', type:'combine' },
  ],
});
```

---

# 4. Java Memory Model

Visualize:
```txt
CPU cache
Main memory
volatile
synchronized
Reordering
Visibility
Atomicity
```

Animations:
```txt
Cache flush
Delayed visibility
Reordering bugs
Monitor enter/exit
```

Example:
```js
MemoryModelViz.render({
  threads:['T1','T2'],
  variables:['flag','counter'],
});
```

Interactive:
```txt
Toggle volatile
Enable synchronized
Simulate stale reads
Observe fixes
```

---

# 5. Synchronized vs ReentrantLock

Visualize:
```txt
Monitor
Lock queue
Deadlock
Fair locking
Starvation
```

Animations:
```txt
Lock acquisition
Blocked threads
wait()/notify()
Deadlock cycle glow
```

Example:
```js
LockViz.render({
  type:'reentrant-lock',
  fairness:true,
  threads:12,
});
```

---

# 6. Garbage Collector Deep Dive

## G1 GC
```txt
Heap Regions
Young GC
Mixed GC
Remembered Sets
Concurrent Marking
```

Animations:
```txt
Region movement
Object evacuation
Pause visualization
```

## ZGC/Shenandoah
```txt
Colored pointers
Concurrent relocation
Load barriers
Pause-less GC
```

Animations:
```txt
Pointer recoloring
Concurrent relocation
Near-zero pause
```

---

# 7. Java Streams Interactive Pipeline

Visualize:
```txt
Source → Filter → Map → FlatMap → Reduce → Collect
```

Animations:
```txt
Lazy evaluation
Parallel streams
ForkJoinPool workers
Backpressure
```

Interactive:
```txt
Pause pipeline
Inject exceptions
Enable parallel()
Observe worker stealing
```

---

# 8. HashMap Deep Visualization

Visualize:
```txt
Hashing
Buckets
Collisions
Linked lists
Treeify
Resize
Rehash
```

Animations:
```txt
Collision flashes
Bucket glow
Treeify transition
Resize migration
```

Example:
```js
DSA.ArrayAnimation.render(el, buckets, {
  highlight:[3,7],
});
```

---

# 9. Spring Boot Request Lifecycle

Pipeline:
```txt
Client
↓
Filter Chain
↓
DispatcherServlet
↓
HandlerMapping
↓
Interceptor
↓
Controller
↓
Service
↓
Repository
↓
DB
```

Animations:
```txt
Request packets
Security filters
Transaction boundaries
Exception handling
Serialization
```

---

# 10. Hibernate / JPA Internals

Visualize:
```txt
Persistence Context
Dirty Checking
Flush
Lazy Loading
N+1
1st/2nd Level Cache
```

Animations:
```txt
Proxy initialization
Entity lifecycle
Query execution
Session flushing
```

Interactive:
```txt
Toggle eager/lazy
Trigger N+1
Observe batching
```

---

# 11. Netty / Reactive EventLoop

Visualize:
```txt
Selector
Channel
Pipeline
Handlers
ByteBuf
EventLoop
```

Animations:
```txt
Non-blocking IO
Event dispatch
Buffer allocation
Channel registration
```

---

# 12. Java NIO Selector Model

Visualize:
```txt
Selector
SelectionKey
Channel
Poll Loop
```

Animations:
```txt
IO readiness
Wakeup
Single-thread multiplexing
```

---

# 13. Bytecode & JIT Visualization

Pipeline:
```txt
.java
↓
javac
↓
.bytecode
↓
ClassLoader
↓
Interpreter
↓
C1
↓
C2
↓
Machine Code
```

Animations:
```txt
Inlining
Hotspot detection
Escape analysis
Deoptimization
```

---

# 14. Thread Lifecycle State Machine

States:
```txt
NEW
RUNNABLE
BLOCKED
WAITING
TIMED_WAITING
TERMINATED
```

Animations:
```txt
Color transitions
sleep()
wait()/notify()
Deadlock highlight
Lock contention
```

---

# 15. Kafka Java Consumer Visualization

Visualize:
```txt
Poll loop
Partition assignment
Offset commit
Lag
Rebalance
```

Animations:
```txt
Partition movement
Lag spikes
Retry storms
Commit flow
```

---

# 16. Interactive Playground Features

```txt
Change heap size
Trigger GC
Create deadlocks
Spawn 100k virtual threads
Inject memory leaks
Trigger OOM
Toggle parallel streams
Simulate latency
```

---

# 17. Production Debugging Layer

```txt
Heap dump explorer
Thread dump viewer
GC pause chart
CPU flame graph
Allocation profiler
Lock contention graph
Async trace viewer
```

---

# 18. Advanced UX Enhancements

Add:
```txt
Infinite canvas
Mini-map
Timeline playback
Glow highlights
Smooth zoom/pan
Packet animations
Floating controls
Interactive overlays
```

---

# 19. Suggested Animation CSS

```css
.jvm-glow {
  box-shadow:
    0 0 10px rgba(88,166,255,.5),
    0 0 20px rgba(88,166,255,.3);
}

.gc-pulse {
  animation: gcPulse 1.5s infinite;
}

@keyframes gcPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

.thread-running {
  animation: threadGlow 1s infinite;
}

@keyframes threadGlow {
  0% { opacity:.5; }
  50% { opacity:1; }
  100% { opacity:.5; }
}

.packet-flow {
  offset-path: path("M0,0 C100,0 200,100 300,100");
  animation: packetMove 3s linear infinite;
}

@keyframes packetMove {
  100% { offset-distance:100%; }
}
```

---

# 🔥 Final Learning Upgrade

```txt
Not just teaching Java syntax.

Teach:
- JVM thinking
- Runtime behavior
- Memory movement
- Concurrency intuition
- Async execution
- Production debugging
- Performance reasoning
- Distributed system thinking
```

This creates senior-level Java systems intuition instead of memorization.
