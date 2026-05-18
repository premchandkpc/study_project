(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    "java-completablefuture",
    area:  "java",
    title: "CompletableFuture Pipeline",
    tag:   "Async",
    tags:  ["java", "completablefuture", "async", "pipeline", "concurrency", "non-blocking"],

    concept: "CompletableFuture<T> is Java's promise/future for async composition. Unlike Future.get() (blocking), CompletableFuture chains non-blocking callbacks: thenApply (transform), thenCompose (flatMap), thenCombine (merge two futures), thenAccept (consume), exceptionally (error recovery). Stages run on ForkJoinPool.commonPool() by default or a custom Executor. allOf() fans out; anyOf() races.",

    why: "Blocking threads on Future.get() wastes thread pool capacity under load. CompletableFuture enables async pipelines: HTTP call → parse → DB write — each stage hands off to ForkJoinPool without blocking. Essential for high-throughput services without reactive frameworks. Java 8+ standard library, no additional dependency.",

    example: {
      language: "java",
      code: `// Sequential blocking (BAD for high throughput)
User user = userService.getUser(id);          // blocks
Orders orders = orderService.getOrders(id);   // blocks
return new Dashboard(user, orders);

// Async parallel with CompletableFuture
CompletableFuture<User> userFuture =
    CompletableFuture.supplyAsync(() -> userService.getUser(id), executor);

CompletableFuture<Orders> ordersFuture =
    CompletableFuture.supplyAsync(() -> orderService.getOrders(id), executor);

CompletableFuture<Dashboard> dashboard =
    userFuture.thenCombine(ordersFuture, Dashboard::new);

// Pipeline: fetch → parse → save → notify
CompletableFuture.supplyAsync(() -> httpClient.fetch(url))     // async fetch
    .thenApply(response -> JsonParser.parse(response))          // sync transform
    .thenCompose(data -> dbService.saveAsync(data))             // async save (flatMap)
    .thenAccept(saved -> notificationService.send(saved.id()))  // consume result
    .exceptionally(ex -> { log.error("Failed", ex); return null; }); // error recovery`,
    },

    interview: [
      "Difference between thenApply and thenCompose?",
      "What thread executes thenApply callbacks?",
      "How do you run two futures in parallel and combine results?",
      "What happens when a CompletableFuture stage throws an exception?",
      "Difference between exceptionally, handle, and whenComplete?",
    ],

    tradeoffs: {
      pros: [
        "Non-blocking pipeline — thread freed while I/O waits",
        "allOf/anyOf for fan-out parallelism",
        "Built into Java 8+ stdlib — no extra dependency",
        "Composable: chain arbitrary async operations",
      ],
      cons: [
        "Error handling verbose — exceptionally/handle on every stage",
        "Stack traces lose context across async boundaries",
        "Debugging hard — async callbacks across threads",
        "Replaced by virtual threads (Java 21) for simple I/O — only needed for fan-out",
      ],
    },

    gotchas: [
      "thenApply runs on completing thread (ForkJoinPool or caller) — use thenApplyAsync to specify executor",
      "thenCompose is flatMap — if fn returns CF<T>, thenApply wraps it: CF<CF<T>>",
      "allOf returns CF<Void> — call .get() on each individual future to extract results",
      "Unhandled exceptions silently complete exceptionally — always add exceptionally/handle",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — supplyAsync creates a CF stage running on ForkJoinPool. Calling thread is not blocked — it continues immediately.",
          nodes: [
            { id: "caller",  label: "Calling Thread\n(not blocked)",       type: "client",    active: true },
            { id: "cf",      label: "CompletableFuture\n<User> (pending)", type: "component", active: true },
            { id: "fjp",     label: "ForkJoinPool\ncommonPool",            type: "store",     active: true },
            { id: "task",    label: "() -> userService\n.getUser(id)",     type: "action",    active: true },
          ],
          edges: [
            { from: "caller", to: "cf",   label: "supplyAsync()", active: true },
            { from: "cf",     to: "fjp",  label: "submit task", active: true, color: "#ffa657" },
            { from: "fjp",    to: "task", label: "runs on pool thread", active: true },
            { from: "caller", to: "cf",   label: "returns immediately", active: false },
          ],
          code: `// supplyAsync — submit supplier, get CF back immediately
CompletableFuture<User> cf =
    CompletableFuture.supplyAsync(
        () -> userService.getUser(id),   // runs on ForkJoinPool
        customExecutor                   // optional: specify executor
    );

// Calling thread continues HERE — not blocked
doOtherWork();

// Later: get result (blocks if not yet done)
User user = cf.get();           // blocking
User user = cf.join();          // blocking, unchecked exception

// Or chain non-blocking:
cf.thenAccept(user -> render(user));`,
        },
        {
          phase: "effect",
          narration: "Step 2 — thenApply (map). Transforms result synchronously on the completing thread. thenApplyAsync runs on a new pool thread.",
          nodes: [
            { id: "cf1",    label: "CF<String>\n(raw JSON)",          type: "component", active: true },
            { id: "apply1", label: "thenApply\nJsonParser::parse",    type: "action",    active: true },
            { id: "cf2",    label: "CF<User>\n(parsed)",              type: "component", active: true },
            { id: "apply2", label: "thenApply\nUser::toDto",          type: "action",    active: true },
            { id: "cf3",    label: "CF<UserDto>\n(final)",            type: "component", active: true },
          ],
          edges: [
            { from: "cf1",    to: "apply1", label: "on complete", active: true },
            { from: "apply1", to: "cf2",    label: "transform", active: true, color: "#3fb950" },
            { from: "cf2",    to: "apply2", label: "on complete", active: true },
            { from: "apply2", to: "cf3",    label: "transform", active: true, color: "#3fb950" },
          ],
          code: `// thenApply = map: T → U (synchronous fn, runs on completing thread)
CompletableFuture<UserDto> pipeline =
    CompletableFuture.supplyAsync(() -> httpClient.get("/users/42"))
        .thenApply(json -> JsonParser.parse(json, User.class))   // String → User
        .thenApply(User::toDto);                                  // User → UserDto

// thenApplyAsync — run transform on different executor
    .thenApplyAsync(json -> heavyParse(json), cpuExecutor)  // CPU-bound parse

// Note: if completing thread is ForkJoinPool thread,
// thenApply callback runs on SAME thread (no context switch)
// thenApplyAsync always submits to executor`,
        },
        {
          phase: "update",
          narration: "Step 3 — thenCompose (flatMap). When the next stage is itself async (returns another CF), use thenCompose to avoid CF<CF<T>>.",
          nodes: [
            { id: "cfA",     label: "CF<String>\n(raw data)",           type: "component", active: true },
            { id: "compose", label: "thenCompose\ndata → dbSave(data)",  type: "action",    active: true },
            { id: "inner",   label: "CF<SaveResult>\n(inner async)",     type: "component", active: true },
            { id: "cfB",     label: "CF<SaveResult>\n(flattened)",       type: "component", active: true },
          ],
          edges: [
            { from: "cfA",     to: "compose", label: "on complete", active: true },
            { from: "compose", to: "inner",   label: "fn returns CF", active: true },
            { from: "inner",   to: "cfB",     label: "flatMap → unwrap", active: true, color: "#3fb950" },
          ],
          code: `// thenCompose = flatMap: T → CompletableFuture<U>
// Use when the next step is ALSO async

// WRONG — thenApply with async fn gives CF<CF<SaveResult>>
CompletableFuture<CompletableFuture<SaveResult>> wrong =
    fetchData().thenApply(data -> dbService.saveAsync(data));

// RIGHT — thenCompose flattens it
CompletableFuture<SaveResult> right =
    fetchData().thenCompose(data -> dbService.saveAsync(data));

// Full pipeline:
fetchData()
    .thenApply(raw -> parse(raw))           // sync transform
    .thenCompose(parsed -> save(parsed))    // async save (flatMap)
    .thenCompose(saved -> notify(saved.id())) // async notify (flatMap)
    .thenAccept(v -> log.info("Done"));     // consume, returns CF<Void>`,
        },
        {
          phase: "commit",
          narration: "Step 4 — thenCombine / allOf for parallel fan-out. Two independent futures run simultaneously, combined when both complete.",
          nodes: [
            { id: "cfUser",   label: "supplyAsync\nfetchUser()",    type: "component", active: true },
            { id: "cfOrder",  label: "supplyAsync\nfetchOrders()", type: "component", active: true },
            { id: "combine",  label: "thenCombine\n(User, Orders) → Dashboard", type: "action", active: true },
            { id: "result",   label: "CF<Dashboard>\n(parallel)", type: "store",     active: true },
          ],
          edges: [
            { from: "cfUser",  to: "combine", label: "when done", active: true, color: "#3fb950" },
            { from: "cfOrder", to: "combine", label: "when done", active: true, color: "#3fb950" },
            { from: "combine", to: "result",  label: "both ready → merge", active: true, color: "#ffa657" },
          ],
          code: `// thenCombine — merge 2 futures when BOTH complete
CompletableFuture<User> userCF =
    CompletableFuture.supplyAsync(() -> fetchUser(id));
CompletableFuture<Orders> ordersCF =
    CompletableFuture.supplyAsync(() -> fetchOrders(id));

CompletableFuture<Dashboard> dashboard =
    userCF.thenCombine(ordersCF, (user, orders) ->
        new Dashboard(user, orders));

// allOf — wait for N futures (returns CF<Void>)
CompletableFuture<Void> all = CompletableFuture.allOf(
    cf1, cf2, cf3, cf4);
all.thenRun(() -> {
    String r1 = cf1.join(); // now safe — already complete
    String r2 = cf2.join();
});

// anyOf — first to complete wins
CompletableFuture<Object> fastest = CompletableFuture.anyOf(cache, db, fallback);`,
        },
        {
          phase: "cleanup",
          narration: "Step 5 — Error handling. exceptionally recovers from one stage. handle processes both success and failure. whenComplete runs always (like finally).",
          nodes: [
            { id: "stage1",  label: "fetchData()\n→ NetworkException",  type: "reducer",   active: true },
            { id: "except",  label: "exceptionally\nreturn cached data", type: "action",    active: true },
            { id: "handle",  label: "handle\n(result, ex) → both",       type: "action",    active: true },
            { id: "when",    label: "whenComplete\n(always runs)",        type: "network",   active: true },
            { id: "recover", label: "CF<Data>\n(recovered)",             type: "component", active: true },
          ],
          edges: [
            { from: "stage1", to: "except", label: "exception", active: true, color: "#f85149" },
            { from: "except", to: "recover",label: "fallback value", active: true, color: "#3fb950" },
            { from: "stage1", to: "handle", label: "success OR failure", active: true, color: "#ffa657" },
            { from: "stage1", to: "when",   label: "always", active: true },
          ],
          code: `CompletableFuture.supplyAsync(() -> fetchData(url))

    // exceptionally: error → recovery value (one type only)
    .exceptionally(ex -> {
        log.warn("Fetch failed, using cache: {}", ex.getMessage());
        return cache.get(url);  // return fallback Data
    })

    // handle: processes BOTH success and failure
    .handle((data, ex) -> {
        if (ex != null) return defaultData;
        return transform(data);
    })

    // whenComplete: side effects only, ALWAYS runs
    .whenComplete((result, ex) -> {
        metrics.record(ex != null ? "fail" : "ok");
        // cannot change result
    })

    .thenAccept(data -> render(data));

// ALWAYS add error handling to prevent silent failures
// Unhandled exceptions complete CF exceptionally — never visible unless .get()`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "CompletableFuture Pipeline",
        time:  "O(1) per stage",
        space: "O(pipeline depth)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML =
            window.ReactViz.label("CODE") +
            window.ReactViz.codeBlock(step.code, "java");
        },
      });
    },
  }]);
})();
