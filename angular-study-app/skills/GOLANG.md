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
