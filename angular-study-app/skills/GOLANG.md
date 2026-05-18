# Go Topics

**Topic file location:** `src/modules/topics/golang/`
**Topic array:** `window.GOLANG_TOPICS`
**Area string:** `"golang"`

---

## Topics Built

| File                         | Title                                              | Tag         | Visual Status |
| ---------------------------- | -------------------------------------------------- | ----------- | ------------- |
| `go-goroutines-channels.js`  | Goroutines, Channels & the Go Scheduler            | Concurrency | Placeholder   |
| `go-context.js`              | Context: Cancellation, Deadlines & Values          | Context     | Placeholder   |
| `go-generics.js`             | Generics (Go 1.18+): Type Parameters & Constraints | Generics    | Placeholder   |
| `go-http-rest.js`            | HTTP Servers, Middleware & net/http                | HTTP        | Placeholder   |
| `go-error-handling.js`       | Error Handling, Wrapping & Sentinel Errors         | Errors      | Placeholder   |
| `go-memory-model-sync.js`    | Go Memory Model, sync & atomic                     | Sync        | Placeholder   |
| `go-interfaces-embedding.js` | Interfaces, Embedding & Composition                | Design      | Placeholder   |

> All 7 topics have stub placeholder visuals. All need real animations built.

---

## Visual Style References (inputs/)

| Image                                                                       | Apply to Go topics                                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs/image copy 11.png` — Kafka swimlane (5 colored rows, animated dots) | **Goroutines scheduler:** 3 rows — G (goroutines), P (logical processors), M (OS threads). Dots show G mounting on P, P on M, work-stealing |
| `inputs/image copy 7.png` — Blueprint colored section boxes + bullet lists  | **Go HTTP middleware:** each middleware = colored band (Logger→Auth→RateLimit→Handler→Response), request packet moves through               |
| `inputs/image copy 9.png` — YouTube numbered circular loop                  | **Context propagation:** circular flow ①Background→②WithTimeout→③WithCancel→④goroutine→⑤Done() signal back                                  |
| `inputs/image copy 3.png` — Architecture wheel, center hub + radial         | **Go interfaces:** center = concrete struct, radial branches = all interfaces it satisfies (io.Reader/Writer/Closer/Stringer)               |
| `inputs/image copy.png` — Green tree hierarchy                              | **Goroutine tree:** parent goroutine spawns children, context cancellation propagates down tree                                             |

## Animation Implementation Priority

All 7 topics currently placeholder. Build in this order:

### PRIORITY 1 — Highest interview + visual value

| Topic                       | Visual Type               | Style Ref               | Key Animation                                                                                                    |
| --------------------------- | ------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `go-goroutines-channels.js` | Swimlane (always-visible) | image copy 11           | 3 rows: G pool → P (GOMAXPROCS) → M (OS threads). Dots show scheduling, work-stealing arrow when P idle          |
| `go-context.js`             | Vertical FlowDiagram      | image copy 9 — numbered | Background→WithTimeout→WithCancel→WithValue→goroutines. Cancel signal propagates DOWN, goroutines check Done()   |
| `go-memory-model-sync.js`   | Swimlane                  | image copy 11           | 3 rows: No-sync (data race red flash), sync.Mutex (lock/unlock dots), atomic (CAS green), channel (handoff blue) |

### PRIORITY 2

| Topic                        | Visual Type               | Key Animation                                              | Key Concept                                                                                                                                          |
| ---------------------------- | ------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `go-interfaces-embedding.js` | ComponentTree             | Concrete struct → implicit interface satisfaction          | No "implements" keyword. Duck typing: method set match = implicit satisfaction. Embedding composes interfaces. io.ReadWriter = io.Reader + io.Writer |
| `go-error-handling.js`       | FlowDiagram               | error→fmt.Errorf wrap→errors.Is→errors.As→sentinel check   | fmt.Errorf("op: %w", err) wraps. errors.Is checks chain. errors.As extracts type. Sentinel: var ErrNotFound = errors.New("not found")                |
| `go-http-rest.js`            | Swimlane (always-visible) | Middleware chain: request flows outbound, response inbound | Row1: Request→Logger→Auth→RateLimit→Handler. Row2: Response←Logger←Auth←RateLimit←Handler                                                            |

#### go-interfaces-embedding visual spec

```
ComponentTree:
  root: { name: 'FileServer (concrete)', type: 'component' }
  children:
    - { name: 'io.Reader', sublabel: 'Read(p []byte)', type: 'store' }    // satisfied implicitly
    - { name: 'io.Writer', sublabel: 'Write(p []byte)', type: 'store' }   // satisfied implicitly
    - { name: 'io.Closer', sublabel: 'Close() error', type: 'store' }     // satisfied implicitly
    - { name: 'io.ReadWriteCloser', sublabel: 'embedded composition', type: 'selector' }  // composed

Steps:
  1. Define concrete type with methods → auto-satisfies any matching interface
  2. Embedding: type ReadWriteCloser interface { Reader; Writer; Closer }
  3. No "implements" — compiler checks method set at use site
  4. Interface as input param: func Process(r io.Reader) — accept any type
```

#### go-error-handling visual spec

```
5-step FlowDiagram:
  Step 1 (render):  err := db.Query() → nil check → if err != nil
  Step 2 (commit):  fmt.Errorf("fetch user: %w", err) — wraps with context
  Step 3 (effect):  errors.Is(err, sql.ErrNoRows) — unwraps chain, checks identity
  Step 4 (update):  errors.As(err, &pgErr) — extracts concrete type from chain
  Step 5 (cleanup): Sentinel errors: var ErrNotFound = errors.New("not found") — pkg-level, comparable
Nodes: error(action), wrappedErr(reducer), errors.Is(selector), errors.As(cache), sentinel(store)
```

#### go-http-rest visual spec

```
Swimlane (always-visible, 2 rows):
  Row 1 REQUEST (blue #58a6ff): Client → LoggingMiddleware → AuthMiddleware → RateLimitMiddleware → Handler
  Row 2 RESPONSE (green #3fb950): Handler → RateLimitMiddleware → AuthMiddleware → LoggingMiddleware → Client

Middleware code pattern:
  func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      log.Println(r.Method, r.URL.Path)   // before
      next.ServeHTTP(w, r)                 // chain
      log.Println("done")                  // after
    })
  }

Animated dots: request packet (blue) moves left→right outbound. Response packet (green) right→left inbound.
```

### PRIORITY 3

| Topic            | Visual Type | Key Animation                                            | Key Concept                                                                                                                                                               |
| ---------------- | ----------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `go-generics.js` | FlowDiagram | Type param → constraint → instantiation → specialized fn | `func Map[T, U any](s []T, f func(T) U) []U`. Constraints: `comparable`, `~int \| ~string`, custom interface constraints. No runtime cost (compile-time monomorphization) |

#### go-generics visual spec

```
4-step FlowDiagram:
  Step 1 (render):  func Map[T, U any](...) — type parameter declaration
  Step 2 (commit):  constraint check: T must satisfy comparable / ~int / custom interface
  Step 3 (effect):  instantiation: Map[string, int] → compiler generates specialized version
  Step 4 (update):  zero-cost abstraction: no interface boxing, no reflect — direct call
Nodes: typeParam(action), constraint(hook), instantiated(component), specialized(store)
```

---

## Go Topics Still to Add

### HIGH PRIORITY (interview-critical, no JS file yet)

| Topic                       | Suggested File      | Visual Type | Key Concepts                                                                                                                                                                    | Animation                                                                                                                                                        |
| --------------------------- | ------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| defer / panic / recover     | `go-defer-panic.js` | FlowDiagram | defer runs LIFO after fn returns. defer in loop = deferred until fn end (not loop iteration). panic unwinds stack. recover() in deferred fn catches panic                       | Step1: fn calls→defers stack (LIFO). Step2: panic→stack unwind. Step3: recover() in defer catches panic→return normal flow                                       |
| Select statement            | `go-select.js`      | FlowDiagram | select blocks until one case ready. Random tie-break when multiple ready. `default:` = non-blocking. Timeout with `time.After`. Fan-in with select                              | 3-node: ch1←data / ch2←data / time.After(1s). First ready wins. Default = fallthrough immediately                                                                |
| Go GC (tricolor mark-sweep) | `go-gc.js`          | Swimlane    | 3 phases: mark setup (STW<1ms), concurrent mark, mark termination (STW<1ms). Tricolor: white(unreachable)/gray(frontier)/black(reachable). Write barrier during concurrent mark | Row1: white objects→gray frontier→black reachable. Row2: GC goroutines running concurrent with app. STW pause indicators                                         |
| Go build system             | `go-build.js`       | FlowDiagram | `go build` pipeline: parse→typecheck→SSA→optimize→codegen→link. go.mod/go.sum. `go mod tidy`. Build tags. `//go:generate`. CGO                                                  | Step1: source→AST parse. Step2: type check. Step3: SSA IR. Step4: machine code. Step5: link→binary                                                               |
| gRPC in Go                  | `go-grpc.js`        | Swimlane    | protobuf IDL→generated stubs. 4 streaming types: unary/server-stream/client-stream/bidi. Interceptors (middleware for gRPC). Metadata propagation                               | Row1 Unary: client req→server handler→response. Row2 Server-stream: req→stream of responses. Row3 Client-stream: stream of reqs→response. Row4 Bidi: full duplex |

### MEDIUM PRIORITY

| Topic                        | Suggested File  | Visual Type | Key Concepts                                                                                                                                                                          |
| ---------------------------- | --------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Go testing                   | `go-testing.js` | FlowDiagram | `go test ./...`. Table-driven tests: `[]struct{in, want}`. `t.Run()` subtests. Benchmarks: `b.ResetTimer()`. `testify/assert`. `goleak.VerifyNone(t)` for goroutine leak detection    |
| pprof profiling              | `go-pprof.js`   | FlowDiagram | `runtime/pprof` or `net/http/pprof`. CPU profile: flame graph. Heap profile: alloc_objects vs inuse_objects. Goroutine profile: `go tool pprof`. `go tool trace` for scheduler events |
| Reflection (reflect package) | `go-reflect.js` | FlowDiagram | `reflect.TypeOf(x)` → Type. `reflect.ValueOf(x)` → Value. `.Kind()` enum. `.Field(i)` struct tags. Use cases: JSON encoder, ORM, dependency injection                                 |
| sync.Map internals           | `go-syncmap.js` | FlowDiagram | read-only shard (atomic load, lock-free reads). dirty map (mutex for writes). Promotion: dirty→read-only on read miss threshold. When to prefer over RWMutex map                      |

### LOW PRIORITY

| Topic               | Suggested File  | Key Concepts                                                                             |
| ------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| Go modules (go.mod) | `go-modules.js` | semantic versioning, replace directives, workspace mode (go.work), vendor/               |
| CGO                 | `go-cgo.js`     | calling C from Go, overhead (~100ns/call), when to avoid, alternative: pure Go or plugin |
| Go plugins          | `go-plugins.js` | `plugin.Open()`, symbol lookup, limitations (same Go version, POSIX only)                |

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
