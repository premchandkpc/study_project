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

| Topic | Priority | Visualization |
|---|---|---|
| ~~Virtual Threads (Loom)~~ | ~~HIGH~~ | ✅ Built |
| ~~String Pool~~ | ~~HIGH~~ | ✅ Built |
| ~~CompletableFuture~~ | ~~HIGH~~ | ✅ Built |
| ~~Synchronized vs Lock~~ | ~~HIGH~~ | ✅ Built |
| ~~G1/ZGC/Shenandoah~~ | ~~HIGH~~ | ✅ Built |
| Java Memory Model | HIGH | Happens-before |
| ForkJoinPool | HIGH | Work stealing |
| Bytecode & JVM | HIGH | Java → Bytecode → JIT |
| Hibernate Internals | HIGH | Session/cache |
| Netty Internals | HIGH | EventLoop |
| Kafka Consumer | HIGH | Poll/rebalance |
| Java NIO | HIGH | Selector loop |
| Reflection/Proxy | MEDIUM | Dynamic invocation |
| ClassLoader Chain | MEDIUM | Delegation hierarchy |
| Spring Transactions | HIGH | Tx propagation |
| Unsafe/VarHandle | LOW | Direct memory |
| JNI | LOW | Java ↔ Native |
| CDS/AppCDS | LOW | Shared metadata |

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
