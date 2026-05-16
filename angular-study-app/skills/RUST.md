# Rust Topics

**Topic file location:** `src/modules/topics/rust/`
**Topic array:** `window.RUST_TOPICS`
**Area string:** `"rust"`

---

## Topics Built

| File | Title | Tag | Visual Status |
|------|-------|-----|---------------|
| `rust-ownership-borrowing.js` | Rust Ownership & Borrowing | Memory | Placeholder |
| `rust-lifetimes.js` | Rust Lifetimes | Memory | Placeholder |
| `rust-enums-structs.js` | Rust Enums & Structs | Type System | Placeholder |
| `rust-traits-generics.js` | Rust Traits & Generics | Type System | Placeholder |
| `rust-pattern-matching.js` | Rust Pattern Matching | Type System | Placeholder |
| `rust-error-handling.js` | Rust Error Handling | Reliability | Placeholder |
| `rust-closures-iterators.js` | Rust Closures & Iterators | Functional | Placeholder |
| `rust-concurrency.js` | Rust Concurrency | Concurrency | Placeholder |
| `rust-async-tokio.js` | Rust Async & Tokio | Async | Placeholder |
| `rust-smart-pointers.js` | Rust Smart Pointers | Memory | Placeholder |
| `rust-memory-model.js` | Rust Memory Model | Memory | Placeholder |
| `rust-unsafe.js` | Rust Unsafe | Low-Level | Placeholder |

> All 12 topics have stub placeholder visuals. All need real animations built.

---

## Rust Topics Still to Add

| Topic | Priority | Suggested Animation |
|-------|----------|-------------------|
| Rust compiler internals (MIR/HIR/LLVM) | LOW | FlowDiagram: source → HIR → MIR → LLVM IR → binary |
| Macro system (macro_rules! + proc macros) | MEDIUM | FlowDiagram: token stream → expansion → AST |
| Wasm with Rust | MEDIUM | FlowDiagram: Rust → wasm32 target → WASM module → JS bridge |
| Rust FFI (calling C) | LOW | FlowDiagram: extern "C" → link → unsafe call |
| Cargo workspace & features | LOW | FlowDiagram: workspace → crates → feature flags |
| Pin & Unpin (async internals) | HIGH | FlowDiagram: self-referential struct → Pin → heap vs stack |
| RAII pattern | HIGH | ComponentTree: Drop trait → scope exit → cleanup |

---

## Animation Plan for Existing Topics

### rust-ownership-borrowing — Suggested: FlowDiagram
```
Nodes: owner variable, borrowed reference, function call, heap value
Steps:
  1. let s = String::from("hi") → s owns heap allocation
  2. let r = &s → immutable borrow (multiple allowed)
  3. let r2 = &mut s → mutable borrow (exclusive)
  4. drop(s) → heap freed, r now dangling (compiler rejects)
  5. Move into function → owner transferred, original invalid
Phase colors: own=blue, borrow=green, move=orange, error=red
```

### rust-lifetimes — Suggested: FlowDiagram
```
Nodes: reference r, data x, function scope, return value
Steps:
  1. fn longest<'a>(x: &'a str, y: &'a str) → lifetime annotation
  2. 'a = min(lifetime_x, lifetime_y)
  3. returned ref valid as long as shortest input lives
  4. caller tries to use after owner drops → compile error
```

### rust-async-tokio — Suggested: FlowDiagram
```
async fn → Future created (lazy)
.await → polls Future
Tokio runtime → thread pool → work-stealing executor
Steps: spawn → pending → waker registered → event ready → woken → polled again → ready
Nodes: Future(component), Tokio Runtime(store), Thread(network), Waker(hook)
```

### rust-smart-pointers — Suggested: ComponentTree
```
Box<T> → heap allocation, single owner
Rc<T> → reference counted, shared ownership, single thread
Arc<T> → atomic ref count, multi-thread safe
RefCell<T> → interior mutability, runtime borrow check
Mutex<T> → interior mutability + thread safety
tree: { name: 'Smart Pointers', children: [Box, Rc, Arc, RefCell, Mutex] }
```

### rust-concurrency — Suggested: FlowDiagram
```
Fearless concurrency: Send + Sync traits enforced at compile time
Steps:
  1. thread::spawn(|| { ... }) → new OS thread
  2. move closure → ownership transferred to thread
  3. Arc::clone() → shared ownership across threads
  4. Mutex::lock() → exclusive access
  5. join() → wait for thread completion
```

### rust-error-handling — Suggested: FlowDiagram
```
Result<T, E> → Ok(val) or Err(e)
? operator → propagate error up call stack
Steps:
  1. fn parse() → Result<i32, ParseError>
  2. let n = parse()? → on Err, return Err from caller
  3. .map_err() → convert error type
  4. thiserror derive → implement Error trait
  5. anyhow::Context → add context to errors
```

---

## Rust Topic File Pattern

```js
(function () {
  'use strict';

  window.RUST_TOPICS = (window.RUST_TOPICS || []).concat([{
    id:    'rust-<topic>',
    area:  'rust',
    title: '<Title>',
    tag:   '<Tag>',
    tags:  ['rust', '<keyword1>', '<keyword2>'],

    concept: `<explanation>`,
    why:     `<production relevance>`,

    example: {
      language: 'rust',
      code: `// Rust code`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Gotcha 1'],

    visual: function (mount) {
      var steps = [ ... ];
      window.ReactViz.panel(mount, {
        title: '<title>',
        time:  'O(1)',
        space: 'O(1)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          } else if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          }
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'rust');
        },
      });
    },
  }]);
})();
```
