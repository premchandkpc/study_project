(function() {
  var topic = {
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
  };
  window.GO_TOPICS = (window.GO_TOPICS || []).concat([topic]);
})();
