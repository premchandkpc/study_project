/* ===== Go (Golang) curriculum — mentor-grade, topic-wise ===== */
window.GO_TOPICS = [
  {
    id: "go-goroutines-channels",
    area: "golang",
    title: "Goroutines, Channels & the Go Scheduler",
    tag: "Concurrency",
    tags: ["goroutines", "channels", "scheduler", "gmp", "select"],
    concept:
`Go concurrency is built on **goroutines** (cheap green threads, ~2 KB initial stack) scheduled by the **GMP model**:
- **G** (goroutine) — unit of work with its own stack.
- **M** (OS thread) — executes goroutines.
- **P** (processor) — logical CPU, holds a run queue; \`GOMAXPROCS\` controls how many Ps exist.

**Channels** are typed, goroutine-safe conduits. Unbuffered channels rendezvous synchronously; buffered channels decouple sender from receiver up to cap.
**\`select\`** multiplexes channel ops — first ready case wins (random tie-break).`,
    why:
`Go's scheduler performs **work-stealing** (idle Ps steal from busy Ps) and **goroutine preemption** (safe points since Go 1.14). This means a CPU-bound goroutine won't starve others. Channel-based communication favors **"share memory by communicating"** — reducing lock contention bugs common in Java/C++ codebases.`,
    example: {
      language: "go",
      code:
`package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// Fan-out / fan-in pipeline
func generate(ctx context.Context, nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, n := range nums {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

func square(ctx context.Context, in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for n := range in {
            select {
            case out <- n * n:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}

// Merge multiple channels into one (fan-in)
func merge(ctx context.Context, cs ...<-chan int) <-chan int {
    var wg sync.WaitGroup
    out := make(chan int)
    output := func(c <-chan int) {
        defer wg.Done()
        for n := range c {
            select {
            case out <- n:
            case <-ctx.Done():
                return
            }
        }
    }
    wg.Add(len(cs))
    for _, c := range cs {
        go output(c)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}

func main() {
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    gen := generate(ctx, 2, 3, 4, 5)
    sq1 := square(ctx, gen)
    sq2 := square(ctx, gen) // demonstrates fan-out would need separate channels

    for n := range merge(ctx, sq1, sq2) {
        fmt.Println(n)
    }
}`,
      notes:
`Always propagate **context** for cancellation. Never leak goroutines — ensure every goroutine has an exit path. Buffered channels for fire-and-forget; unbuffered when synchronisation is the goal.`
    },
    interview: [
      {
        question: "What happens when you send on a closed channel?",
        answer:
`**Panic.** Receiving from a closed channel returns the zero value immediately (second return is \`false\`). Rule: only the sender should close; consumers use \`range\` or test the comma-ok idiom. Use a \`sync.Once\` or dedicated done channel to coordinate closure across multiple senders.`,
        followUps: ["How do you safely close a channel with multiple producers?", "What is the difference between nil channel and closed channel?"]
      },
      {
        question: "Explain GOMAXPROCS and when you'd change it.",
        answer:
`\`GOMAXPROCS\` sets the number of OS threads (Ps) that execute Go code in parallel — defaults to \`runtime.NumCPU()\`. Lower it when running CPU-bound Go alongside a latency-sensitive C library on the same core. Raise it (rarely needed) isn't useful beyond \`NumCPU\`. In containers, read \`runtime/debug.SetMaxProcs\` or use \`automaxprocs\` which reads cgroup CPU quota.`,
        followUps: ["How does Go detect CPU quota in containers?", "What is the scheduler's work-stealing algorithm?"]
      },
      {
        question: "Goroutine leak — how do you detect and fix it?",
        answer:
`Use \`runtime.NumGoroutine()\` in tests, or **goleak** package. Common causes: (1) goroutine blocked on unbuffered channel nobody reads; (2) goroutine looping without a context exit; (3) \`http.Client\` response body not closed. Fix: always pass \`ctx\` and \`select\` on \`ctx.Done()\`. In tests, \`defer goleak.VerifyNone(t)\`.`,
        followUps: ["How do you test for goroutine leaks in unit tests?", "What does pprof goroutine profile show?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Goroutines are ~1000× cheaper than OS threads — millions in a single process.",
        "CSP model eliminates most shared-state bugs.",
        "Built-in race detector (`go test -race`) finds data races at test time."
      ],
      cons: [
        "No goroutine identity — no ThreadLocal equivalent; use context.Value carefully.",
        "Goroutine leaks are silent and hard to trace without tooling.",
        "Buffered channel sizing requires capacity analysis (back-pressure is manual)."
      ],
      when:
`**Goroutines** for any concurrent work. **Channels** for ownership transfer or signalling. **sync.Mutex** when shared state mutation is truly local and brief. Avoid channels when a simple mutex+condition-variable would be clearer.`
    }
  },

  {
    id: "go-memory-model-sync",
    area: "golang",
    title: "Go Memory Model, sync & atomic",
    tag: "Sync",
    tags: ["memory model", "sync", "mutex", "rwmutex", "atomic", "once"],
    concept:
`The **Go Memory Model** defines happens-before: a send on a channel happens-before the corresponding receive; \`sync.Mutex\` unlock happens-before a subsequent lock. Without synchronisation, the compiler and CPU can reorder reads/writes.

Key primitives:
- **\`sync.Mutex\` / \`sync.RWMutex\`** — exclusive / reader-writer lock.
- **\`sync.WaitGroup\`** — count-down latch.
- **\`sync.Once\`** — exactly-once initialization.
- **\`sync.Map\`** — concurrent map, optimised for read-heavy workloads.
- **\`sync/atomic\`** — lock-free load/store/CAS on int32/64, pointers, \`atomic.Value\`.`,
    why:
`Go does **not** prevent data races by language design (unlike Rust). The race detector (\`-race\`) catches them at runtime but incurs 5–10× overhead. Production incidents commonly trace back to maps accessed concurrently without locks. \`sync.Once\` is the idiomatic singleton pattern; double-checked locking with \`atomic\` is fragile without it.`,
    example: {
      language: "go",
      code:
`package main

import (
    "fmt"
    "sync"
    "sync/atomic"
)

// Thread-safe counter using atomic
type Counter struct{ n int64 }
func (c *Counter) Inc()       { atomic.AddInt64(&c.n, 1) }
func (c *Counter) Value() int64 { return atomic.LoadInt64(&c.n) }

// Lazy singleton with Once
type DB struct{ dsn string }
var (
    dbInstance *DB
    dbOnce     sync.Once
)
func GetDB(dsn string) *DB {
    dbOnce.Do(func() { dbInstance = &DB{dsn: dsn} })
    return dbInstance
}

// Read-heavy cache with RWMutex
type Cache struct {
    mu    sync.RWMutex
    items map[string]string
}
func (c *Cache) Get(k string) (string, bool) {
    c.mu.RLock()
    defer c.mu.RUnlock()
    v, ok := c.items[k]
    return v, ok
}
func (c *Cache) Set(k, v string) {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.items[k] = v
}

func main() {
    var wg sync.WaitGroup
    ctr := &Counter{}
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() { defer wg.Done(); ctr.Inc() }()
    }
    wg.Wait()
    fmt.Println("count:", ctr.Value()) // always 1000
}`,
      notes: `Never copy a \`sync.Mutex\` after first use (vet catches this). Prefer \`defer mu.Unlock()\` immediately after \`Lock()\` to avoid forgetting under panics/returns.`
    },
    interview: [
      {
        question: "When would you use sync.Map over a mutex-protected map?",
        answer:
`\`sync.Map\` is optimised for two patterns: (1) many goroutines reading the same keys (read-mostly), or (2) disjoint keys written by different goroutines. It uses an internal read-only shard for reads (lock-free) and a dirty map for writes. For high-write or iteration-heavy workloads, a \`RWMutex\` map is faster and easier to reason about.`,
        followUps: ["How does sync.Map avoid starvation on promotion?", "What is the cost of sync.Map.Range?"]
      },
      {
        question: "What is a data race vs a race condition?",
        answer:
`A **data race** is a specific memory safety violation: two goroutines access the same memory location concurrently, at least one writes, with no synchronisation. It causes undefined behaviour. A **race condition** is a logical bug where the outcome depends on interleaving — it can exist even with no data race (e.g., TOCTOU). The race detector finds data races; logical races require testing and analysis.`,
        followUps: ["Can -race miss races?", "What is the cost of -race in production?"]
      }
    ],
    tradeoffs: {
      pros: [
        "atomic ops are lock-free and composable for simple counters/flags.",
        "sync.Once elegantly solves lazy init without error-prone double-checked locking.",
        "Race detector is off-by-default — production binaries pay no overhead."
      ],
      cons: [
        "sync.Mutex is not reentrant (unlike Java's synchronized) — deadlock on self-lock.",
        "sync.Map has no typed API, returns interface{}.",
        "Atomics alone cannot express multi-field transactions — still need locks."
      ],
      when: `**Mutex** for general shared state. **RWMutex** when reads dominate. **atomic** for single-value counters/flags. **sync.Once** for singletons. **channels** when you're transferring ownership, not sharing state.`
    }
  },

  {
    id: "go-interfaces-embedding",
    area: "golang",
    title: "Interfaces, Embedding & Composition",
    tag: "Design",
    tags: ["interfaces", "embedding", "composition", "duck typing", "polymorphism"],
    concept:
`Go interfaces are **implicitly satisfied** — no \`implements\` keyword. A type satisfies an interface by having the right method set.
- **Small interfaces** are idiomatic: \`io.Reader\`, \`io.Writer\`, \`error\` (one method each).
- **Embedding** composes interfaces and structs: an embedded field's methods are promoted.
- **Interface vs concrete type**: accept interfaces, return concrete types (Postel's law for Go).
- **\`interface{}\` / \`any\`**: escape hatch; prefer generics (Go 1.18+) for typed collections.`,
    why:
`Go's implicit interfaces eliminate the coupling between package A (defines the interface) and package B (implements it). Libraries define small interfaces consumers implement without depending on the library. This is the key to testability — swap real implementations with test doubles without a mocking framework.`,
    example: {
      language: "go",
      code:
`package main

import (
    "fmt"
    "strings"
)

// Small interfaces — testable by design
type Storer interface {
    Save(id string, data []byte) error
    Load(id string) ([]byte, error)
}

type Notifier interface {
    Notify(msg string) error
}

// Compose via embedding
type StorerNotifier interface {
    Storer
    Notifier
}

// Concrete implementation
type MemStore struct{ m map[string][]byte }
func (s *MemStore) Save(id string, data []byte) error { s.m[id] = data; return nil }
func (s *MemStore) Load(id string) ([]byte, error) {
    d, ok := s.m[id]
    if !ok { return nil, fmt.Errorf("not found: %s", id) }
    return d, nil
}

// Struct embedding — promotes fields and methods
type LoggingStore struct {
    Storer                   // promoted: LoggingStore.Save delegates here
    log []string
}
func (l *LoggingStore) Save(id string, data []byte) error {
    l.log = append(l.log, "save:"+id)
    return l.Storer.Save(id, data) // explicit call to embedded
}

// Accept interface, return concrete
func NewLogging(s Storer) *LoggingStore {
    return &LoggingStore{Storer: s}
}

func main() {
    base := &MemStore{m: make(map[string][]byte)}
    ls := NewLogging(base)
    _ = ls.Save("k1", []byte("hello"))
    fmt.Println(strings.Join(ls.log, ", ")) // save:k1
}`,
      notes: `Interface satisfaction is checked at compile time when you assign a concrete type to an interface variable. Use \`var _ Storer = (*MemStore)(nil)\` as a compile-time assertion.`
    },
    interview: [
      {
        question: "What is an interface nil trap?",
        answer:
`An interface value is nil only if both its **type** and **value** are nil. A \`(*MyErr)(nil)\` assigned to \`error\` is non-nil (type is set). Classic bug: returning a typed nil pointer as \`error\`. Fix: return \`nil\` directly, or use a helper \`if err != nil { return err }\` discipline.`,
        followUps: ["How do you introspect an interface's dynamic type?", "When would you use reflect vs type switch?"]
      },
      {
        question: "How do you test code that depends on external services in Go without a mock framework?",
        answer:
`Define a small interface for the external dependency in the package that uses it, then provide a test double (fake struct) in the test file that satisfies the interface. No Mockery or gomock required for simple cases. For complex interaction verification, \`gomock\` generates mocks from interfaces; for HTTP, \`httptest.Server\` spins up a real server.`,
        followUps: ["Fake vs mock vs stub?", "When does gomock add value over a hand-written fake?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Implicit satisfaction decouples packages — no circular import to share interfaces.",
        "Small interfaces are easy to satisfy → highly composable test doubles.",
        "Embedding avoids boilerplate delegation code."
      ],
      cons: [
        "No compile-time 'I want to implement X' declaration — typos in method names fail silently.",
        "Embedding can expose internal methods unintentionally.",
        "Large interfaces (many methods) are hard to satisfy and violate ISP."
      ],
      when: `Define interfaces **at the consumer site**, not the implementation site. Keep them to 1–3 methods. Use embedding to compose behavior, not to reuse code (Go favors composition over inheritance).`
    }
  },

  {
    id: "go-error-handling",
    area: "golang",
    title: "Error Handling, Wrapping & Sentinel Errors",
    tag: "Errors",
    tags: ["errors", "wrapping", "sentinel", "Is", "As", "panic", "recover"],
    concept:
`Go errors are values — \`error\` is an interface with one method: \`Error() string\`.
Patterns:
- **Sentinel errors**: \`var ErrNotFound = errors.New("not found")\` — compare with \`==\` or \`errors.Is\`.
- **Custom error types**: structs implementing \`error\` — unwrap with \`errors.As\`.
- **Wrapping**: \`fmt.Errorf("open config: %w", err)\` — preserves cause chain; \`errors.Is\` / \`errors.As\` traverse the chain.
- **\`panic\` / \`recover\`**: for truly unrecoverable programmer errors; recover only in boundary code (HTTP handler, main goroutine).`,
    why:
`Explicit error propagation means every call site decides how to handle the error — no invisible exception stack unwinding. Go 1.13 wrapping allows libraries to add context without hiding the cause. Sentinel errors let callers make branching decisions (\`if errors.Is(err, sql.ErrNoRows)\`) without depending on internal error types.`,
    example: {
      language: "go",
      code:
`package main

import (
    "errors"
    "fmt"
)

// Sentinel error
var ErrNotFound = errors.New("not found")

// Custom typed error
type ValidationError struct {
    Field   string
    Message string
}
func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed on %s: %s", e.Field, e.Message)
}

// Wrapping for context — callers can still inspect cause
func loadUser(id string) error {
    if id == "" {
        return fmt.Errorf("loadUser: %w", &ValidationError{Field: "id", Message: "must not be empty"})
    }
    if id == "ghost" {
        return fmt.Errorf("loadUser %q: %w", id, ErrNotFound)
    }
    return nil
}

func main() {
    err := loadUser("ghost")

    // errors.Is traverses the chain
    if errors.Is(err, ErrNotFound) {
        fmt.Println("handle 404:", err)
    }

    err2 := loadUser("")
    var ve *ValidationError
    // errors.As finds the first matching type in the chain
    if errors.As(err2, &ve) {
        fmt.Printf("bad field=%s msg=%s\n", ve.Field, ve.Message)
    }

    // panic/recover at boundary
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("recovered:", r)
        }
    }()
    panic("unexpected state") // recovered above
}`,
      notes: `Use \`%w\` (not \`%v\`) when you want callers to be able to inspect the wrapped error. Don't wrap errors that shouldn't be inspected by callers — it couples them to internal types.`
    },
    interview: [
      {
        question: "What is the difference between errors.Is and errors.As?",
        answer:
`\`errors.Is(err, target)\` checks if **any error in the chain** equals \`target\` (using \`==\` or a custom \`Is\` method). \`errors.As(err, &target)\` finds the **first error in the chain** that can be assigned to the target type. Use \`Is\` for sentinel values; \`As\` when you need to access fields on a typed error.`,
        followUps: ["How do you make a custom Is method?", "What if a library wraps errors with %v instead of %w?"]
      },
      {
        question: "When is it appropriate to panic?",
        answer:
`Panic for **programmer errors**: nil dereference, out-of-bounds that indicate a bug (not user input), or a package-level invariant that's impossible to violate with correct usage. Library code almost never panics — it returns errors. At HTTP handler or main boundaries, \`recover\` turns panics into 500 responses and alert signals. Never panic for user input issues.`,
        followUps: ["How does recover interact with defer ordering?", "What happens if recover is not in a direct defer?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Explicit errors at every call site — reviewers see all failure paths.",
        "Error wrapping gives rich context without try/catch nesting.",
        "No checked exceptions friction — no forced catch blocks for every callee."
      ],
      cons: [
        "Verbose: if err != nil boilerplate at every call.",
        "Easy to silently ignore: _ = doThing().",
        "No stack trace by default — add with golang.org/x/xerrors or pkg/errors."
      ],
      when: `Return \`error\` for expected failure modes. Panic only for invariant violations. Use structured custom error types when callers need to branch on error fields. Add \`%w\` context at each layer boundary.`
    }
  },

  {
    id: "go-context",
    area: "golang",
    title: "Context: Cancellation, Deadlines & Values",
    tag: "Context",
    tags: ["context", "cancellation", "deadline", "timeout", "propagation"],
    concept:
`\`context.Context\` is Go's standard mechanism for:
- **Cancellation**: \`context.WithCancel\` — cancel when parent operation completes.
- **Deadlines / timeouts**: \`context.WithDeadline\`, \`context.WithTimeout\`.
- **Request-scoped values**: \`context.WithValue\` — carry trace IDs, auth tokens (use unexported key types to avoid collisions).

A Context is **immutable** and forms a tree — cancelling a parent cancels all children. The zero value (\`context.Background()\`) never cancels; \`context.TODO()\` signals placeholder intent.`,
    why:
`Without context, you can't cleanly cancel in-flight requests when a client disconnects or a timeout fires. In microservices, context propagates **distributed traces** (OpenTelemetry injects span IDs via \`context.WithValue\`). Goroutines that ignore context leak resources until the process dies.`,
    example: {
      language: "go",
      code:
`package main

import (
    "context"
    "database/sql"
    "fmt"
    "net/http"
    "time"
)

type contextKey string
const traceIDKey contextKey = "traceID"

// Middleware: inject trace ID
func withTraceID(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tid := r.Header.Get("X-Trace-Id")
        ctx := context.WithValue(r.Context(), traceIDKey, tid)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// Handler: 500ms budget for the whole operation
func handler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 500*time.Millisecond)
    defer cancel()

    tid, _ := ctx.Value(traceIDKey).(string)
    fmt.Fprintf(w, "trace=%s result=%s", tid, fetchData(ctx))
}

func fetchData(ctx context.Context) string {
    // Pass ctx to all blocking calls
    db, _ := sql.Open("postgres", "")
    row := db.QueryRowContext(ctx, "SELECT 1")
    var n int
    if err := row.Scan(&n); err != nil {
        if ctx.Err() != nil {
            return "timeout"
        }
        return "error"
    }
    return fmt.Sprint(n)
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", handler)
    http.ListenAndServe(":8080", withTraceID(mux))
}`,
      notes: `Never store contexts in structs — pass them as the first function argument. Use typed unexported keys for context values to prevent key collisions across packages.`
    },
    interview: [
      {
        question: "What's the difference between context.Background() and context.TODO()?",
        answer:
`Semantically equivalent at runtime — both return a non-nil, empty context. **\`Background()\`** is the root of any context tree (used in main, init, tests). **\`TODO()\`** signals "I know this should carry a context but I haven't plumbed one yet" — it's a code search anchor for future refactoring. Linters can flag \`TODO\` to track tech debt.`,
        followUps: ["When should context.WithValue be avoided?", "How does OpenTelemetry use context?"]
      },
      {
        question: "How do you propagate context across goroutine boundaries?",
        answer:
`Pass the context explicitly as the first argument to the goroutine's function. Never copy a context into a closure that outlives the cancellation scope without checking \`ctx.Done()\`. Pattern: \`go func(ctx context.Context) { select { case <-ctx.Done(): return; case result <- compute(): } }(ctx)\`.`,
        followUps: ["What happens to child goroutines if the parent context is cancelled?", "goroutine leak + context?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Uniform cancellation and deadline propagation across stdlib (http, sql, grpc).",
        "No global state — context carries request-scoped metadata cleanly.",
        "Context.Err() distinguishes cancellation from deadline exceeded."
      ],
      cons: [
        "context.WithValue is untyped — runtime panics on bad casts, not compile errors.",
        "Verbose to plumb through every function signature in large codebases.",
        "Cannot add context to callback-style or event-driven APIs retro-actively."
      ],
      when: `Pass context to every function that does I/O, sleeps, or spawns goroutines. Use context values only for request-scoped metadata (trace IDs, auth), never for optional function arguments.`
    }
  },

  {
    id: "go-generics",
    area: "golang",
    title: "Generics (Go 1.18+): Type Parameters & Constraints",
    tag: "Generics",
    tags: ["generics", "type parameters", "constraints", "comparable", "any"],
    concept:
`Go 1.18 introduced **type parameters**. Syntax: \`func Map[T, R any](s []T, fn func(T) R) []R\`.
- **Constraints** restrict what types a type param can be. \`any\` = \`interface{}\`, \`comparable\` = types that support \`==\`.
- **Union constraints**: \`type Number interface { int | int64 | float64 }\`.
- **Type inference**: compiler infers type args at call sites in most cases.
- Generic functions can be used with concrete types at compile time — no runtime reflection.`,
    why:
`Before generics, Go developers used \`interface{}\` with runtime type assertions (losing type safety) or code generation (\`go generate\`) for typed collections. Generics eliminate both: \`slices.Sort\`, \`maps.Keys\`, and custom data structures are now type-safe without codegen.`,
    example: {
      language: "go",
      code:
`package main

import (
    "cmp"
    "fmt"
)

// Generic Map — transforms a slice
func Map[T, R any](s []T, fn func(T) R) []R {
    out := make([]R, len(s))
    for i, v := range s {
        out[i] = fn(v)
    }
    return out
}

// Generic Filter
func Filter[T any](s []T, pred func(T) bool) []T {
    var out []T
    for _, v := range s {
        if pred(v) {
            out = append(out, v)
        }
    }
    return out
}

// Ordered constraint from cmp package (Go 1.21)
func Min[T cmp.Ordered](a, b T) T {
    if a < b { return a }
    return b
}

// Generic Stack
type Stack[T any] struct{ items []T }
func (s *Stack[T]) Push(v T)        { s.items = append(s.items, v) }
func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T
        return zero, false
    }
    n := len(s.items) - 1
    v := s.items[n]
    s.items = s.items[:n]
    return v, true
}

func main() {
    nums := []int{1, 2, 3, 4, 5}
    doubled := Map(nums, func(n int) int { return n * 2 })
    evens   := Filter(nums, func(n int) bool { return n%2 == 0 })
    fmt.Println(doubled, evens)          // [2 4 6 8 10] [2 4]
    fmt.Println(Min(3.14, 2.71))         // 2.71

    var s Stack[string]
    s.Push("a"); s.Push("b")
    v, _ := s.Pop()
    fmt.Println(v)                       // b
}`,
      notes: `Prefer standard library \`slices\` and \`maps\` packages (Go 1.21) over reimplementing generic utilities. Generic code compiles to dictionaries/GC shapes — not C++ templates; one instantiation per GC shape, not per type.`
    },
    interview: [
      {
        question: "When would you NOT use generics?",
        answer:
`Three cases: (1) **Simple functions** where \`interface{}\` and a type switch is clearer. (2) **Runtime polymorphism** where you need dynamic dispatch — interfaces are the right tool. (3) **Readability cost** exceeds benefit — complex constraint expressions hurt newcomers. Generics shine for **collections, algorithms, and container types** where you lose type safety otherwise.`,
        followUps: ["What is a GC shape?", "What are the performance implications of generics vs interfaces?"]
      },
      {
        question: "How are Go generics different from Java generics?",
        answer:
`Java uses **type erasure** — generic type info is lost at runtime, and \`List<int>\` is boxed to \`List<Integer>\`. Go uses **GC shapes** — one code path per memory layout, no boxing for value types. Go generics can constrain with union types (\`int | float64\`); Java uses bounded wildcards. Go has no raw types.`,
        followUps: ["What is monomorphisation?", "Can you use generics with methods?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Type-safe generic collections without codegen or interface{}.",
        "Single implementation, multiple types — DRY without losing safety.",
        "Integrates with stdlib: slices.SortFunc, maps.Keys, etc."
      ],
      cons: [
        "Complex constraints hurt readability.",
        "Cannot parameterize methods (only functions and types).",
        "Compile times increase with many instantiations."
      ],
      when: `Use generics for **data structures, algorithms, and utility functions** where type matters but logic is identical. Keep business logic in concrete types — generics for infrastructure code.`
    }
  },

  {
    id: "go-http-rest",
    area: "golang",
    title: "HTTP Servers, Middleware & net/http",
    tag: "HTTP",
    tags: ["http", "net/http", "middleware", "handler", "mux", "chi", "gin"],
    concept:
`Go's \`net/http\` is production-grade and used directly without a framework for many services. Key types:
- **\`http.Handler\`** — interface: \`ServeHTTP(ResponseWriter, *Request)\`.
- **\`http.ServeMux\`** — built-in path router (Go 1.22+ supports method+wildcard patterns).
- **Middleware** — a function that wraps a \`Handler\` returning another \`Handler\`.
- **\`http.Client\`** — default client has no timeout — always configure one.
Third-party: **Chi** (composable middleware, stdlib-compatible), **Gin** (performance, familiar API).`,
    why:
`Go's HTTP server is one of the fastest in any GC language. Understanding \`net/http\` internals — connection lifecycle, \`http.Transport\` keep-alives, body draining — is essential for high-throughput services. Incorrectly not reading a response body causes connection pool exhaustion.`,
    example: {
      language: "go",
      code:
`package main

import (
    "encoding/json"
    "log/slog"
    "net/http"
    "time"
)

// Middleware: logging + recovery
func logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        lw := &statusWriter{ResponseWriter: w, status: http.StatusOK}
        next.ServeHTTP(lw, r)
        slog.Info("request",
            "method", r.Method,
            "path", r.URL.Path,
            "status", lw.status,
            "dur", time.Since(start).String(),
        )
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}
func (sw *statusWriter) WriteHeader(code int) {
    sw.status = code
    sw.ResponseWriter.WriteHeader(code)
}

// Handler
func orderHandler(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")  // Go 1.22 wildcard
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"id": id, "status": "ok"})
}

// Client with proper timeout
var httpClient = &http.Client{
    Timeout: 5 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:    100,
        IdleConnTimeout: 90 * time.Second,
    },
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("GET /orders/{id}", orderHandler)  // Go 1.22 method+wildcard

    srv := &http.Server{
        Addr:         ":8080",
        Handler:      logging(mux),
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    slog.Info("listening", "addr", srv.Addr)
    if err := srv.ListenAndServe(); err != nil {
        slog.Error("server", "err", err)
    }
}`,
      notes: `Always set \`ReadTimeout\`, \`WriteTimeout\`, and \`IdleTimeout\` on \`http.Server\`. Always \`io.Copy(io.Discard, resp.Body); resp.Body.Close()\` on client responses to enable connection reuse.`
    },
    interview: [
      {
        question: "Why should you never use the default http.Client in production?",
        answer:
`The default \`http.Client\` has **no timeout** — a slow server holds the goroutine (and potentially a connection) forever. Also, the default \`Transport\` has a limited idle connection pool. Always configure \`Timeout\`, \`MaxIdleConns\`, and \`IdleConnTimeout\` for production clients.`,
        followUps: ["What is connection draining?", "How does http.Transport handle keep-alive?"]
      },
      {
        question: "How do you implement graceful shutdown?",
        answer:
`Listen for \`SIGINT\`/\`SIGTERM\`, then call \`srv.Shutdown(ctx)\` with a deadline context. \`Shutdown\` stops accepting new connections, waits for in-flight requests to complete, then returns. Combine with a \`WaitGroup\` if you have background workers that also need draining.`,
        followUps: ["What is the difference between Shutdown and Close?", "How do you drain Kafka consumers before shutdown?"]
      }
    ],
    tradeoffs: {
      pros: [
        "net/http is production-grade with zero dependencies.",
        "Go 1.22 mux handles method+wildcard — frameworks less necessary.",
        "http.Server is trivially embeddable in tests via httptest."
      ],
      cons: [
        "Built-in mux lacks middleware chaining — use Chi/Gin for large apps.",
        "No built-in request validation, rate limiting, or auth — compose manually.",
        "HTTP/2 push and HTTP/3 require extra setup."
      ],
      when: `**net/http** for small services and CLIs. **Chi** when middleware composition is needed. **Gin** for maximum ecosystem and familiar API. Avoid frameworks with invasive code generation.`
    }
  }
];
