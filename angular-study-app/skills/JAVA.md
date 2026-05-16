# Java Topics

**Topic file location:** `src/modules/topics/java/`
**Topic array:** `window.JAVA_TOPICS`
**Area string:** `"java"`

---

## Topics Built

| File | Title | Tag | Visual Type |
|------|-------|-----|-------------|
| `java-jvm-memory-gc.js` | JVM Memory & GC | Internals | Flow diagram: heap/stack/metaspace + GC phases |
| `java-concurrency.js` | Java Concurrency | Threads | Thread lifecycle state machine animation |
| `java-streams.js` | Java Streams API | Functional | Pipeline flow: source → filter → map → collect |
| `java-collections.js` | Java Collections | Data Structures | HashMap bucket/treeify, ArrayList resize |
| `java-spring-boot.js` | Spring Boot | Framework | Request lifecycle: Dispatcher → Controller → Service → Repo |
| `java-spring-data-jpa.js` | Spring Data JPA | ORM | Entity lifecycle, N+1 problem, fetch strategies |
| `java-webflux.js` | WebFlux / Reactor | Reactive | Marble diagrams: Mono/Flux, backpressure |
| `java-records-sealed-patterns.js` | Records & Sealed Classes | Java 17+ | Pattern matching switch expressions |
| `java-jit-performance.js` | JIT Compilation | Performance | Interpretation → C1 → C2 pipeline |

---

## Java Concepts Still to Add

These are high-value topics not yet built:

| Topic | Priority | Suggested Visual |
|-------|----------|-----------------|
| Virtual Threads (Project Loom) | HIGH | Thread mounting/unmounting on carrier threads |
| String Pool internals | HIGH | Heap layout: intern table vs heap strings |
| ClassLoader chain | MEDIUM | Bootstrap → Platform → App → custom |
| Synchronized vs ReentrantLock | HIGH | Thread contention / monitor animation |
| CompletableFuture pipeline | HIGH | DAG of async stages |
| Java Memory Model (happens-before) | MEDIUM | volatile, synchronized, ordering rules |
| Garbage Collectors (G1, ZGC, Shenandoah) | HIGH | Region-based collection animation |
| Reflection & Proxy | LOW | Dynamic invocation chain |
| Java Agent / Instrumentation | LOW | Bytecode transform pipeline |

---

## Java Topic File Pattern

```js
(function () {
  'use strict';

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    'java-<topic>',
    area:  'java',
    title: '<Title>',
    tag:   '<Tag>',
    tags:  ['java', '<keyword1>', '<keyword2>'],

    concept: `<multiline explanation>`,

    why: `<production relevance>`,

    example: {
      language: 'java',
      code: `// Java code example`,
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
      'Gotcha 1',
      'Gotcha 2',
    ],

    visual: function (mount) {
      // Use ReactViz.FlowDiagram for architecture flows
      // Use inline CSS animation for state machines
      // Use DSAViz.topic.render for algorithm traces
    },
  }]);
})();
```

---

## Suggested Animations for Java

### JVM GC Animation
Use `ReactViz.FlowDiagram` with nodes:
- Eden Space → Survivor S0 → Survivor S1 → Old Gen → Metaspace
- Edges show object promotion on GC cycles
- Red "collect" phase highlights active regions

### Thread Lifecycle State Machine
CSS-based with JS `setInterval`:
- States: NEW → RUNNABLE → BLOCKED → WAITING → TIMED_WAITING → TERMINATED
- Boxes change background color as thread moves through states
- Show `synchronized`, `wait()`, `notify()` trigger points

### HashMap Bucket Visualization
Use `DSA.ArrayAnimation.render` for bucket array + `DSA.GraphAnimation` for linked lists in each bucket.
Show: insert → hash → bucket → linked list → treeify at 8 nodes

### Spring Request Lifecycle
Use `ReactViz.FlowDiagram` vertical layout:
- DispatcherServlet → HandlerMapping → HandlerAdapter → Controller → Service → Repository → DB
- Highlight active node per step
- Show filter chain wrapping the flow
