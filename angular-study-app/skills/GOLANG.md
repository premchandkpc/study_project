# Go Topics

**Topic file location:** `src/modules/topics/golang/`
**Topic array:** `window.GOLANG_TOPICS`
**Area string:** `"golang"`

---

## Topics Built

| File | Title | Tag | Visual Status |
|------|-------|-----|---------------|
| `go-goroutines-channels.js` | Goroutines, Channels & the Go Scheduler | Concurrency | Placeholder |
| `go-context.js` | Context: Cancellation, Deadlines & Values | Context | Placeholder |
| `go-generics.js` | Generics (Go 1.18+): Type Parameters & Constraints | Generics | Placeholder |
| `go-http-rest.js` | HTTP Servers, Middleware & net/http | HTTP | Placeholder |
| `go-error-handling.js` | Error Handling, Wrapping & Sentinel Errors | Errors | Placeholder |
| `go-memory-model-sync.js` | Go Memory Model, sync & atomic | Sync | Placeholder |
| `go-interfaces-embedding.js` | Interfaces, Embedding & Composition | Design | Placeholder |

> All 7 topics have stub placeholder visuals. All need real animations built.

---

## Visual Style References (inputs/)

| Image | Apply to Go topics |
|---|---|
| `inputs/image copy 11.png` — Kafka swimlane (5 colored rows, animated dots) | **Goroutines scheduler:** 3 rows — G (goroutines), P (logical processors), M (OS threads). Dots show G mounting on P, P on M, work-stealing |
| `inputs/image copy 7.png` — Blueprint colored section boxes + bullet lists | **Go HTTP middleware:** each middleware = colored band (Logger→Auth→RateLimit→Handler→Response), request packet moves through |
| `inputs/image copy 9.png` — YouTube numbered circular loop | **Context propagation:** circular flow ①Background→②WithTimeout→③WithCancel→④goroutine→⑤Done() signal back |
| `inputs/image copy 3.png` — Architecture wheel, center hub + radial | **Go interfaces:** center = concrete struct, radial branches = all interfaces it satisfies (io.Reader/Writer/Closer/Stringer) |
| `inputs/image copy.png` — Green tree hierarchy | **Goroutine tree:** parent goroutine spawns children, context cancellation propagates down tree |

## Animation Implementation Priority

All 7 topics currently placeholder. Build in this order:

### PRIORITY 1 — Highest interview + visual value

| Topic | Visual Type | Style Ref | Key Animation |
|---|---|---|---|
| `go-goroutines-channels.js` | Swimlane (always-visible) | image copy 11 | 3 rows: G pool → P (GOMAXPROCS) → M (OS threads). Dots show scheduling, work-stealing arrow when P idle |
| `go-context.js` | Vertical FlowDiagram | image copy 9 — numbered | Background→WithTimeout→WithCancel→WithValue→goroutines. Cancel signal propagates DOWN, goroutines check Done() |
| `go-memory-model-sync.js` | Swimlane | image copy 11 | 3 rows: No-sync (data race red flash), sync.Mutex (lock/unlock dots), atomic (CAS green), channel (handoff blue) |

### PRIORITY 2

| Topic | Visual Type | Key Animation |
|---|---|---|
| `go-interfaces-embedding.js` | ComponentTree | Concrete struct → implicit interface satisfaction. No "implements". Duck typing: if it has the method, it satisfies |
| `go-error-handling.js` | FlowDiagram | error→fmt.Errorf wrap→errors.Is→errors.As→sentinel check chain |
| `go-http-rest.js` | FlowDiagram | Request→middleware chain (Logger→Auth→RateLimit→Handler)→Response |

### PRIORITY 3

| Topic | Visual Type | Key Animation |
|---|---|---|
| `go-generics.js` | FlowDiagram | Type param → constraint check → monomorphization → specialized fn |

## Go Topics Still to Add

| Topic | Priority | Suggested Animation |
|-------|----------|-------------------|
| Go GC (tricolor mark-sweep) | HIGH | FlowDiagram: white/gray/black sets → concurrent GC phases |
| Select statement | HIGH | FlowDiagram: multiple channel cases, default branch |
| sync.Mutex vs RWMutex | HIGH | FlowDiagram: goroutine contention → lock/unlock |
| defer, panic, recover | HIGH | FlowDiagram: stack unwind → deferred calls → recover |
| go tool / build system | MEDIUM | FlowDiagram: go build → compile → link |
| Reflection (reflect package) | MEDIUM | FlowDiagram: interface → reflect.Type → Value |
| Testing (table-driven, benchmarks) | MEDIUM | FlowDiagram: test cases → t.Run() → benchmark loop |
| gRPC streaming | HIGH | FlowDiagram: unary → server-stream → client-stream → bidi |
| pprof profiling | MEDIUM | FlowDiagram: CPU/heap profile → flame graph |

---

## Animation Plan for Existing Topics

### go-goroutines-channels — Suggested: FlowDiagram
```
M:N scheduler: goroutines (G) → logical processors (P) → OS threads (M)
Steps:
  1. go func() → G created, placed in local run queue
  2. P picks G, executes on M
  3. G blocks on channel → P work-steals from other P
  4. Channel send/receive → handoff
  5. GOMAXPROCS = num P
Nodes: G(component), P(store), M(network), RunQueue(cache)
```

### go-context.js — Suggested: FlowDiagram (vertical)
```
context.Background()
  → context.WithTimeout(ctx, 5s)
    → context.WithCancel(ctx)
      → context.WithValue(ctx, key, val)
        → passed to goroutines
Steps: deadline hit → cancel signal propagates down tree → goroutines check ctx.Done()
```

### go-memory-model-sync.js — Suggested: FlowDiagram
```
Goroutine A writes → memory barrier → Goroutine B reads
Show: without sync (data race), with sync.Mutex (ordered), with atomic.Store/Load
Steps: race → mutex lock → critical section → unlock → atomic (no lock needed)
```

### go-interfaces-embedding.js — Suggested: ComponentTree
```
tree: {
  name: 'io.ReadWriter', type: 'context',
  children: [
    { name: 'io.Reader', type: 'component' },
    { name: 'io.Writer', type: 'component' },
  ]
}
Show: concrete type → implicit interface satisfaction (no "implements" keyword)
```

---

## Go Topic File Pattern

```js
(function () {
  'use strict';

  window.GOLANG_TOPICS = (window.GOLANG_TOPICS || []).concat([{
    id:    'go-<topic>',
    area:  'golang',
    title: '<Title>',
    tag:   '<Tag>',
    tags:  ['golang', '<keyword1>', '<keyword2>'],

    concept: `<explanation>`,
    why:     `<production relevance>`,

    example: {
      language: 'go',
      code: `// Go code`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Gotcha 1'],

    visual: function (mount) {
      var steps = [ ... ];
      window.ReactViz.panel(mount, {
        title: '<title>',
        time:  'O(1)',
        space: 'O(n)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          } else if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          }
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'go');
        },
      });
    },
  }]);
})();
```
