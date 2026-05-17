# Context: Cancellation, Deadlines & Values

## Quick Facts
- Area: Go
- Tag: Context
- Source: `src/modules/topics/golang/go-context.js`
- Tags: `context`, `cancellation`, `deadline`, `timeout`, `propagation`
- Visual coverage: generated diagrams only

## Concept
`context.Context` is Go's standard mechanism for:
- **Cancellation**: `context.WithCancel` - cancel when parent operation completes.
- **Deadlines / timeouts**: `context.WithDeadline`, `context.WithTimeout`.
- **Request-scoped values**: `context.WithValue` - carry trace IDs, auth tokens (use unexported key types to avoid collisions).

A Context is **immutable** and forms a tree - cancelling a parent cancels all children. The zero value (`context.Background()`) never cancels; `context.TODO()` signals placeholder intent.

## Why It Matters
Without context, you can't cleanly cancel in-flight requests when a client disconnects or a timeout fires. In microservices, context propagates **distributed traces** (OpenTelemetry injects span IDs via `context.WithValue`). Goroutines that ignore context leak resources until the process dies.

## Architecture / Mental Model
```mermaid
flowchart LR
  n0["Request"]
  n1["Goroutine"]
  n2["Channel/context"]
  n3["Shared state"]
  n4["Response/error"]
  n0 --> n1
  n1 --> n2
  n2 --> n3
  n3 --> n4
```

## Runtime / Sequence
```mermaid
sequenceDiagram
  participant a0 as Request
  participant a1 as Goroutine
  participant a2 as Channel/context
  participant a3 as Shared state
  participant a4 as Response/error
  a0->>a1: start
  a1->>a2: process
  a2->>a3: process
  a3->>a4: process
  a4-->>a3: result
  a3-->>a2: return
  a2-->>a1: return
  a1-->>a0: return
```

## Animation Plan
- Flow lab can use generated mental model steps above.
- UML sequence can use generated sequence diagram above.
- Architecture map can use generated area mental model above.

Flow steps:

1. Request
2. Goroutine
3. Channel/context
4. Shared state
5. Response/error

## Example
```go
package main

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
}
```

Notes:
Never store contexts in structs - pass them as the first function argument. Use typed unexported keys for context values to prevent key collisions across packages.

## Complexity And Performance
- Time/space complexity depends on deployment, data size, and chosen implementation.
- Track p50/p95/p99 latency, throughput, memory, saturation, and error rate for production topics.

## Interview Drills
1. What's the difference between context.Background() and context.TODO()?
   Answer: Semantically equivalent at runtime - both return a non-nil, empty context. **`Background()`** is the root of any context tree (used in main, init, tests). **`TODO()`** signals "I know this should carry a context but I haven't plumbed one yet" - it's a code search anchor for future refactoring. Linters can flag `TODO` to track tech debt.
   Follow-ups: When should context.WithValue be avoided?; How does OpenTelemetry use context?

2. How do you propagate context across goroutine boundaries?
   Answer: Pass the context explicitly as the first argument to the goroutine's function. Never copy a context into a closure that outlives the cancellation scope without checking `ctx.Done()`. Pattern: `go func(ctx context.Context) { select { case <-ctx.Done(): return; case result <- compute(): } }(ctx)`.
   Follow-ups: What happens to child goroutines if the parent context is cancelled?; goroutine leak + context?

## Trade-offs
Pros:
- Uniform cancellation and deadline propagation across stdlib (http, sql, grpc).
- No global state - context carries request-scoped metadata cleanly.
- Context.Err() distinguishes cancellation from deadline exceeded.

Cons:
- context.WithValue is untyped - runtime panics on bad casts, not compile errors.
- Verbose to plumb through every function signature in large codebases.
- Cannot add context to callback-style or event-driven APIs retro-actively.

When to use:
Pass context to every function that does I/O, sleeps, or spawns goroutines. Use context values only for request-scoped metadata (trace IDs, auth), never for optional function arguments.

## Gotchas
_No gotchas configured._

