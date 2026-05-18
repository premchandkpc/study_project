(function() {
  var topic = {
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
"Explicit error propagation means every call site decides how to handle the error — no invisible exception stack unwinding. Go 1.13 wrapping allows libraries to add context without hiding the cause. Sentinel errors let callers make branching decisions (`if errors.Is(err, sql.ErrNoRows)`) without depending on internal error types.",
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
      notes: "Use `%w` (not `%v`) when you want callers to be able to inspect the wrapped error. Don't wrap errors that shouldn't be inspected by callers — it couples them to internal types."
    },
    interview: [
      {
        question: "What is the difference between errors.Is and errors.As?",
        answer:
"`errors.Is(err, target)` checks if **any error in the chain** equals `target` (using `==` or a custom `Is` method). `errors.As(err, &target)` finds the **first error in the chain** that can be assigned to the target type. Use `Is` for sentinel values; `As` when you need to access fields on a typed error.",
        followUps: ["How do you make a custom Is method?", "What if a library wraps errors with %v instead of %w?"]
      },
      {
        question: "When is it appropriate to panic?",
        answer:
"Panic for **programmer errors**: nil dereference, out-of-bounds that indicate a bug (not user input), or a package-level invariant that's impossible to violate with correct usage. Library code almost never panics — it returns errors. At HTTP handler or main boundaries, `recover` turns panics into 500 responses and alert signals. Never panic for user input issues.",
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
      when: "Return `error` for expected failure modes. Panic only for invariant violations. Use structured custom error types when callers need to branch on error fields. Add `%w` context at each layer boundary."
    }
  };
  window.GO_TOPICS = (window.GO_TOPICS || []).concat([topic]);
})();
