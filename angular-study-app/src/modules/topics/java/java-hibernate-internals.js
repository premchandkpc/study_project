(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([
    {
      id: "java-hibernate-internals",
      area: "java",
      title: "Hibernate / JPA Internals",
      tag: "Persistence",
      tags: ["hibernate", "jpa", "persistence-context", "dirty-check", "lazy-loading", "n+1", "entity-lifecycle", "2nd-level-cache", "fetch"],

      concept:
`**L1 (30s ELI5):** Hibernate is like a smart notebook. When you read a page, it remembers exactly what it looked like. When you return the notebook, it compares and only writes back the pages you changed.

**L2 (2min core):** **Persistence Context** (1st level cache): identity map of managed entities per session. Maps entity id → entity object. Prevents duplicate queries for same id. **Dirty Checking**: on flush, Hibernate compares current entity state to snapshot taken at load → auto-generates UPDATE SQL only for changed fields. **Lazy Loading**: @OneToMany default = LAZY. Hibernate returns a proxy. First field access triggers a SELECT. If session is closed: LazyInitializationException.

**L3 (10min edge):** N+1 problem: load 100 orders, loop calls .getCustomer() on each → 100 SELECT queries. Fix: JOIN FETCH, @EntityGraph, batch size (IN clause). flush() modes: COMMIT (default), ALWAYS (flush before each query), MANUAL. open-session-in-view: Spring keeps session open during HTTP rendering — hides LazyInitException but holds connection across full request lifecycle.

**L4 (deep):** Entity lifecycle: transient (not associated) → managed (in PC) → detached (PC closed) → removed (delete pending). Dirty checking uses a state snapshot per entity (bytecode instrumentation or reflective diff at flush time). 2nd level cache: shared across sessions, process-scoped. Needs explicit @Cache annotation. Invalidated on any write to that entity. L2 cache + @Transactional(readOnly=true) → fastest read path.`,

      why:
"N+1 queries are the most common Hibernate production performance bug — a 100-row list page can fire 101 SQL queries silently. Understanding the persistence context lifecycle prevents LazyInitializationException, stale data, and memory leaks in long-running sessions.",

      example: {
        language: "java",
        code:
`// ─── Entity lifecycle states ──────────────────────────────────────────────────
Order order = new Order("PENDING");             // TRANSIENT — not in any PC
em.persist(order);                              // MANAGED — in current PC, INSERT pending
em.flush();                                     // SQL: INSERT INTO orders ...
Order detached = em.detach(order) or em.close();// DETACHED — snapshot lost
em.merge(detached);                             // MANAGED again — re-associated
em.remove(order);                               // REMOVED — DELETE pending on flush

// ─── N+1 problem (BAD) ───────────────────────────────────────────────────────
List<Order> orders = em.createQuery("FROM Order", Order.class).getResultList();
for (Order o : orders) {
    String name = o.getCustomer().getName();   // 💥 N SELECT for N orders
}

// ─── Fix 1: JOIN FETCH ───────────────────────────────────────────────────────
List<Order> orders = em.createQuery(
    "FROM Order o JOIN FETCH o.customer", Order.class
).getResultList();                             // ✅ 1 query with JOIN

// ─── Fix 2: @EntityGraph ─────────────────────────────────────────────────────
@EntityGraph(attributePaths = {"customer", "items"})
List<Order> findAll();                         // Spring Data: eager-load customer+items

// ─── Fix 3: Batch size ───────────────────────────────────────────────────────
@BatchSize(size = 50)                          // hibernate.default_batch_fetch_size=50
@OneToMany(mappedBy = "order")
private List<OrderItem> items;
// Hibernate fires: SELECT ... WHERE order_id IN (1,2,...,50)  ← 2 queries not 101

// ─── Dirty checking ──────────────────────────────────────────────────────────
@Transactional
public void updateStatus(Long id) {
    Order order = repo.findById(id).get();     // 1. load + snapshot
    order.setStatus("SHIPPED");                // 2. modify entity
    // NO save() needed!
    // 3. tx commit → dirty check → generates: UPDATE orders SET status=? WHERE id=?
}`,
        notes: "Hibernate's dirty checking eliminates the need to call save() on loaded entities. Side effect: accidentally modifying an entity inside a tx generates unintended UPDATEs."
      },

      interview: [
        {
          question: "Explain the N+1 problem and three ways to fix it.",
          answer:
"**Problem**: Loading N entities, then accessing a lazy association on each fires N additional SELECT queries (1 for the list + N for the association = N+1). **Fix 1: JOIN FETCH** — JPQL `JOIN FETCH o.customer` produces one query with a JOIN. **Fix 2: @EntityGraph** — Spring Data/JPA annotation to load specific associations eagerly per query. **Fix 3: Batch size** — `@BatchSize(size=50)` or `hibernate.default_batch_fetch_size=50` makes Hibernate fire `WHERE id IN (1..50)` instead of 50 individual SELECTs. Fix 1 is for simple cases; Fix 3 scales well for deep graphs.",
          followUps: ["What is the Cartesian product problem with multiple JOIN FETCHes?", "When would you use subselect fetching?"]
        },
        {
          question: "How does Hibernate dirty checking work?",
          answer:
"On entity load (findById, query), Hibernate takes a **snapshot** of the entity's field values. At flush time (before commit or explicit flush()), Hibernate compares current field values against the snapshot. Changed fields → generates UPDATE SQL. This means: (1) no need to call save() on loaded entities, (2) accidentally modifying an entity inside a tx generates an UPDATE, (3) snapshot comparison is per-field — O(N fields × N entities).",
          followUps: ["What is bytecode instrumentation in Hibernate?", "How to prevent accidental dirty writes?"]
        },
        {
          question: "What causes LazyInitializationException and how to fix it properly?",
          answer:
"Lazy-loaded proxy accessed after the session is closed. E.g.: load Order, close session, then call order.getCustomer().getName() — proxy can't execute a SELECT without an open session. **Fixes**: (1) Load within transaction boundary. (2) Use JOIN FETCH / @EntityGraph — eager load needed associations. (3) DTO projection — never return entities to web layer. (4) Hibernate.initialize(entity.getAssoc()) inside tx. **Anti-fix**: Open Session in View (OSIV) — keeps session open during HTTP rendering. Hides the problem, holds DB connections across full request.",
          followUps: ["Why is OSIV an antipattern?", "How does DTO projection avoid this?"]
        }
      ],

      gotchas: [
        "N+1: invisible in dev (small data), catastrophic in prod (1000 orders = 1001 queries). Always check Hibernate SQL logging in dev.",
        "Accidental dirty write: loading entity and modifying it (even in a helper method) inside @Transactional generates UPDATE on commit. Use @Transactional(readOnly=true) for read-only operations.",
        "Detached entity merge: em.merge() does a SELECT to load the current state, then merges changes. Multiple merges in a loop = multiple SELECTs.",
        "LazyInitializationException in @Async: async method runs in new thread with no session. Pass DTOs, not entities, to async methods.",
        "Open Session in View (OSIV): holds DB connection for entire HTTP request (including JSON serialization). Under load: connection pool exhaustion.",
        "2nd level cache stale data: if DB modified outside Hibernate (native SQL, another service), 2nd level cache is NOT invalidated. Cache serves stale data."
      ],

      tradeoffs: {
        pros: [
          "Dirty checking: no boilerplate save() calls, automatic change detection.",
          "1st level cache: identity map prevents duplicate SELECTs for same entity in same session.",
          "2nd level cache + @Cacheable: eliminates DB hits for read-heavy, rarely-changing entities."
        ],
        cons: [
          "N+1 is invisible — requires SQL logging in dev and query analysis in prod.",
          "Dirty checking overhead: O(N fields × N entities) at flush time. Disable for read-only sessions.",
          "2nd level cache invalidation on write: any UPDATE to Order invalidates all cached Orders — can negate cache benefit for write-heavy entities."
        ],
        when: "Use JPA/Hibernate for: CRUD-heavy services with complex object graphs. Use plain JDBC/jOOQ for: bulk operations, reporting queries, performance-critical paths. Use @Query with projections for read-heavy list views."
      },

      visual: function (mount) {
        var CVU = window.CVU;
        if (!CVU) { mount.textContent = "CVU not loaded"; return; }
        var C = CVU.C;

        var ctrl = CVU.makeCtrlRow(mount);
        var btns = [
          CVU.makeBtn("1 · Persistence Context", C.blue),
          CVU.makeBtn("2 · Dirty Check",          C.orange),
          CVU.makeBtn("3 · Lazy Loading",          C.purple),
          CVU.makeBtn("4 · N+1 Problem",           C.red),
          CVU.makeBtn("5 · 2nd Level Cache",       C.green),
        ];
        btns.forEach(function (b) { ctrl.appendChild(b); });

        var W = 700, H = 420;
        var canvas = CVU.makeCanvas(mount, W, H);
        var ctx = canvas.getContext("2d");
        var LW = canvas._logicalWidth;
        var LH = canvas._logicalHeight;
        var status = CVU.makeStatus(mount);

        var scene = 0;

        var SCENES = [
          {
            title: "Persistence Context — 1st Level Cache (Identity Map)",
            color: C.blue,
            desc: "Session binds entities by ID. findById(1) twice → returns SAME Java object. No duplicate SELECT.",
            draw: function () {
              /* Session box */
              CVU.roundRect(ctx, 20, 50, 280, LH - 80, 8, "#0f1820", C.blue, 2);
              CVU.text(ctx, "Session / EntityManager", 160, 70, C.blue, 11, "center", "700");
              CVU.text(ctx, "Persistence Context (1st Level Cache)", 160, 88, C.gray, 9, "center");

              /* identity map entries */
              var entries = [
                { id:"Order#1", state:"MANAGED", color:C.blue },
                { id:"Order#2", state:"MANAGED", color:C.blue },
                { id:"User#42", state:"MANAGED", color:C.purple },
              ];
              entries.forEach(function (e, i) {
                var ey = 106 + i * 52;
                CVU.roundRect(ctx, 32, ey, 256, 42, 5, e.color + "22", e.color, 1.5);
                CVU.text(ctx, e.id, 90, ey + 16, e.color, 10, "center", "700");
                CVU.roundRect(ctx, 160, ey + 6, 80, 18, 3, e.color + "33", e.color + "99", 1);
                CVU.text(ctx, e.state, 200, ey + 18, e.color, 8.5, "center", "700");
                CVU.text(ctx, "snapshot ✓", 90, ey + 32, C.gray, 8, "center");
              });

              /* DB box */
              CVU.roundRect(ctx, LW - 190, 50, 170, LH - 80, 8, "#0f1820", C.yellow, 1.5);
              CVU.text(ctx, "Database", LW - 105, 70, C.yellow, 11, "center", "700");
              ["orders table", "users table"].forEach(function (t, i) {
                CVU.roundRect(ctx, LW - 178, 96 + i * 54, 146, 40, 4, C.card, C.yellow + "66", 1);
                CVU.text(ctx, t, LW - 105, 120 + i * 54, C.text, 9, "center");
              });

              /* cache hit arrow */
              CVU.arrow(ctx, 310, 130, 360, 90, C.blue, 2, true);
              CVU.text(ctx, "findById(1) →", 310, 120, C.blue, 8, "center");
              CVU.arrow(ctx, 310, 132, 270, 132, C.green, 2);
              CVU.text(ctx, "← cache hit!", 290, 125, C.green, 8, "center");

              CVU.arrow(ctx, 306, 190, LW - 192, 120, C.yellow, 1.5, true);
              CVU.text(ctx, "SELECT (first time only)", LW / 2, 170, C.yellow, 8, "center");
            }
          },
          {
            title: "Dirty Checking — Auto-Generated UPDATE",
            color: C.orange,
            desc: "Hibernate snapshots entity at load. On flush: diff snapshot vs current → generates UPDATE for changed fields only.",
            draw: function () {
              var cols = [
                { x:20,  label:"Load Snapshot", color:C.blue },
                { x:230, label:"After Modification", color:C.orange },
                { x:440, label:"Generated SQL", color:C.green },
              ];
              var fields = ["id", "status", "amount", "customer"];
              var before = ["1", "PENDING", "99.00", "User#42"];
              var after  = ["1", "SHIPPED",  "99.00", "User#42"];

              cols.forEach(function (col) {
                CVU.roundRect(ctx, col.x, 46, 190, LH - 60, 7, "#0f1820", col.color, 1.8);
                CVU.text(ctx, col.label, col.x + 95, 64, col.color, 10, "center", "700");
              });

              fields.forEach(function (f, i) {
                var fy = 82 + i * 52;
                var changed = before[i] !== after[i];

                /* snapshot col */
                CVU.roundRect(ctx, 28, fy, 174, 38, 4, changed ? C.orange + "11" : C.card, C.border, 1);
                CVU.text(ctx, f + ":", 70, fy + 22, C.gray, 9, "right");
                CVU.text(ctx, before[i], 140, fy + 22, changed ? C.orange : C.text, 9, "center", changed ? "700" : "normal");

                /* modified col */
                CVU.roundRect(ctx, 238, fy, 174, 38, 4, changed ? C.orange + "22" : C.card, changed ? C.orange : C.border, changed ? 2 : 1);
                CVU.text(ctx, f + ":", 280, fy + 22, C.gray, 9, "right");
                CVU.text(ctx, after[i], 350, fy + 22, changed ? C.orange : C.text, 9, "center", changed ? "700" : "normal");
                if (changed) CVU.text(ctx, "← changed!", 412, fy + 22, C.orange, 7.5, "left");

                /* SQL col */
                if (changed) {
                  CVU.roundRect(ctx, 448, fy, 230, 38, 4, C.green + "22", C.green, 1.8);
                  CVU.text(ctx, "SET " + f + " = '" + after[i] + "'", 563, fy + 22, C.green, 9, "center", "700");
                }
              });

              CVU.roundRect(ctx, 448, LH - 64, 230, 38, 4, C.green + "33", C.green, 2);
              CVU.text(ctx, "UPDATE orders SET status=?", 563, LH - 49, C.green, 9, "center", "700");
              CVU.text(ctx, "WHERE id=1   (auto-generated!)", 563, LH - 37, C.green, 8, "center");
            }
          },
          {
            title: "Lazy Loading — Proxy & LazyInitializationException",
            color: C.purple,
            desc: "LAZY proxy: first access triggers SELECT. Session must be open. Closed session → LazyInitializationException.",
            draw: function () {
              /* order entity */
              CVU.roundRect(ctx, 20, 50, 200, 100, 7, "#1a1820", C.purple, 2);
              CVU.text(ctx, "Order#1", 120, 70, C.purple, 11, "center", "700");
              CVU.text(ctx, "status: PENDING", 120, 92, C.text, 9, "center");
              CVU.roundRect(ctx, 30, 106, 180, 32, 4, C.orange + "22", C.orange, 1.5);
              CVU.text(ctx, "customer: CustomerProxy$", 120, 126, C.orange, 9, "center", "600");

              /* proxy */
              CVU.roundRect(ctx, 250, 50, 200, 100, 7, "#1a1020", C.orange, 2);
              CVU.text(ctx, "CustomerProxy$", 350, 70, C.orange, 10, "center", "700");
              CVU.text(ctx, "id: 42  — UNINITIALIZED", 350, 90, C.gray, 8.5, "center");
              CVU.roundRect(ctx, 260, 106, 180, 32, 4, C.orange + "22", C.orange, 1);
              CVU.text(ctx, "Hibernate-generated subclass", 350, 126, C.gray, 8, "center");

              /* DB */
              CVU.roundRect(ctx, 500, 50, 170, 100, 7, "#1a1820", C.yellow, 1.5);
              CVU.text(ctx, "Database", 585, 72, C.yellow, 10, "center", "700");
              CVU.text(ctx, "customers table", 585, 96, C.gray, 9, "center");

              /* trigger arrow */
              CVU.arrow(ctx, 450, 126, 498, 96, C.orange, 2, true);
              CVU.text(ctx, "getName() — triggers SELECT", LW / 2, 165, C.orange, 9, "center", "600");
              CVU.arrow(ctx, 498, 110, 450, 130, C.yellow, 2);
              CVU.text(ctx, "SELECT * FROM customers WHERE id=42", LW / 2, 185, C.yellow, 9, "center");

              /* session open/closed */
              CVU.roundRect(ctx, 20, 200, 660, 60, 6, C.green + "22", C.green, 1.5);
              CVU.text(ctx, "✅ Session OPEN — lazy access works, SELECT fires on first access", LW / 2, 235, C.green, 10, "center", "700");

              CVU.roundRect(ctx, 20, 278, 660, 60, 6, C.red + "22", C.red, 1.5);
              CVU.text(ctx, "❌ Session CLOSED — LazyInitializationException: no session!", LW / 2, 305, C.red, 10, "center", "700");
              CVU.text(ctx, "Fix: JOIN FETCH, @EntityGraph, or DTO projection", LW / 2, 325, C.gray, 9, "center");

              CVU.roundRect(ctx, 20, 356, 320, 48, 5, "#1a1020", C.orange + "88", 1);
              CVU.text(ctx, "⚠️ OSIV antipattern: keeps session open during", 180, 376, C.orange, 9, "center");
              CVU.text(ctx, "HTTP rendering. Hides bug, holds connection.", 180, 392, C.orange, 9, "center");
              CVU.roundRect(ctx, 360, 356, 320, 48, 5, "#1a2810", C.green + "88", 1);
              CVU.text(ctx, "✅ Fix: fetch in @Transactional boundary,", 520, 376, C.green, 9, "center");
              CVU.text(ctx, "return DTO to controller.", 520, 392, C.green, 9, "center");
            }
          },
          {
            title: "N+1 Query Problem",
            color: C.red,
            desc: "Load 5 orders → loop calls getCustomer() on each → 5 extra SELECTs. 100 orders → 101 queries.",
            draw: function () {
              /* BAD side */
              CVU.roundRect(ctx, 12, 40, LW / 2 - 20, LH - 55, 6, "#200f0f", C.red, 1.8);
              CVU.text(ctx, "❌ N+1 — 6 queries for 5 orders", LW / 4, 58, C.red, 10, "center", "700");

              var sqls = [
                "SELECT * FROM orders LIMIT 5",
                "SELECT * FROM customers WHERE id=1",
                "SELECT * FROM customers WHERE id=2",
                "SELECT * FROM customers WHERE id=3",
                "SELECT * FROM customers WHERE id=4",
                "SELECT * FROM customers WHERE id=5",
              ];
              sqls.forEach(function (s, i) {
                var col = i === 0 ? C.orange : C.red;
                CVU.roundRect(ctx, 20, 72 + i * 48, LW / 2 - 36, 38, 4, col + "22", col, i === 0 ? 1.8 : 1);
                CVU.text(ctx, s, LW / 4, 97 + i * 48, col, 8.5, "center");
              });

              /* GOOD side */
              CVU.roundRect(ctx, LW / 2 + 8, 40, LW / 2 - 20, LH - 55, 6, "#0f200f", C.green, 1.8);
              CVU.text(ctx, "✅ JOIN FETCH — 1 query", LW * 3 / 4, 58, C.green, 10, "center", "700");

              CVU.roundRect(ctx, LW / 2 + 16, 72, LW / 2 - 36, 80, 5, C.green + "22", C.green, 2);
              CVU.text(ctx, "FROM Order o", LW * 3 / 4, 94, C.green, 9, "center", "700");
              CVU.text(ctx, "JOIN FETCH o.customer", LW * 3 / 4, 112, C.green, 9, "center", "700");
              CVU.text(ctx, "→ 1 SQL with JOIN", LW * 3 / 4, 130, C.green, 8.5, "center");

              CVU.roundRect(ctx, LW / 2 + 16, 168, LW / 2 - 36, 60, 5, C.blue + "22", C.blue, 1.5);
              CVU.text(ctx, "@EntityGraph(", LW * 3 / 4, 190, C.blue, 9, "center");
              CVU.text(ctx, "  attributePaths={\"customer\"})", LW * 3 / 4, 208, C.blue, 9, "center");

              CVU.roundRect(ctx, LW / 2 + 16, 244, LW / 2 - 36, 60, 5, C.purple + "22", C.purple, 1.5);
              CVU.text(ctx, "@BatchSize(size=50)", LW * 3 / 4, 266, C.purple, 9, "center");
              CVU.text(ctx, "→ WHERE id IN (1..50)", LW * 3 / 4, 284, C.purple, 9, "center");

              CVU.text(ctx, "2 queries max (1 + 1 batch)", LW * 3 / 4, 320, C.green, 9, "center", "700");
            }
          },
          {
            title: "2nd Level Cache — Process-Scoped Shared Cache",
            color: C.green,
            desc: "2nd level cache shared across sessions. Eliminates repeated SELECTs for @Cacheable entities. Invalidated on any write.",
            draw: function () {
              /* Sessions */
              ["Session A", "Session B", "Session C"].forEach(function (s, i) {
                var sy = 48 + i * 80;
                CVU.roundRect(ctx, 14, sy, 160, 58, 5, "#0f1820", C.blue + "88", 1.5);
                CVU.text(ctx, s, 94, sy + 18, C.blue, 10, "center", "700");
                CVU.text(ctx, "1st level cache", 94, sy + 34, C.gray, 8, "center");
                CVU.text(ctx, "(session-scoped)", 94, sy + 48, C.gray, 7.5, "center");
              });

              /* L2 Cache box */
              CVU.roundRect(ctx, 220, 48, 200, 288, 7, "#0f2010", C.green, 2.5);
              CVU.text(ctx, "2nd Level Cache", 320, 68, C.green, 11, "center", "700");
              CVU.text(ctx, "(process-scoped, shared)", 320, 86, C.gray, 8.5, "center");
              var cached = [
                { label:"Order#1 ✓", color:C.green },
                { label:"Order#2 ✓", color:C.green },
                { label:"User#42 ✓", color:C.blue },
                { label:"Product#5 ✗", color:C.red },
              ];
              cached.forEach(function (e, i) {
                CVU.roundRect(ctx, 228, 100 + i * 54, 184, 38, 4, e.color + "22", e.color, 1.5);
                CVU.text(ctx, e.label, 320, 124 + i * 54, e.color, 9.5, "center", "700");
              });
              CVU.text(ctx, "EHCache / Infinispan / Redis", 320, 350, C.gray, 8, "center");

              /* DB */
              CVU.roundRect(ctx, 470, 100, 200, 200, 7, "#1a1820", C.yellow, 1.5);
              CVU.text(ctx, "Database", 570, 124, C.yellow, 11, "center", "700");
              CVU.text(ctx, "Single source of truth", 570, 144, C.gray, 9, "center");

              /* arrows */
              CVU.arrow(ctx, 178, 78,  218, 108, C.green, 2, true);
              CVU.text(ctx, "L2 hit →", 192, 90, C.green, 8, "center");
              CVU.arrow(ctx, 178, 160, 218, 170, C.green, 2, true);
              CVU.arrow(ctx, 178, 240, 218, 230, C.green, 2, true);

              CVU.arrow(ctx, 422, 190, 468, 200, C.yellow, 1.5, true);
              CVU.text(ctx, "L2 miss → SELECT", 440, 184, C.yellow, 8, "center");

              /* write invalidation */
              CVU.roundRect(ctx, 220, 370, 450, 42, 5, C.red + "22", C.red, 1.8);
              CVU.text(ctx, "⚠️ Write invalidates L2 cache: any UPDATE/DELETE removes entry.", 445, 386, C.red, 9, "center", "700");
              CVU.text(ctx, "External SQL (not via Hibernate) → cache goes STALE silently.", 445, 402, C.red, 8.5, "center");
            }
          }
        ];

        function draw() {
          CVU.clearBg(ctx, LW, LH);
          var sc = SCENES[scene];
          CVU.roundRect(ctx, 12, 0, LW - 24, 32, 6, sc.color + "33", sc.color, 1.5);
          CVU.text(ctx, sc.title, LW / 2, 20, sc.color, 11, "center", "700");
          sc.draw();
          status.textContent = sc.desc;
        }

        var raf = null;
        function tick() { draw(); raf = requestAnimationFrame(tick); }
        tick();

        btns.forEach(function (b, i) {
          b.addEventListener("click", function () {
            scene = i;
            btns.forEach(function (btn, j) {
              btn.style.background = j === i ? "#1f2937" : "";
              btn.style.borderColor = j === i ? SCENES[j].color + "88" : "";
            });
          });
        });

        status.textContent = SCENES[0].desc;
      },

      flow: {
        title: "Hibernate Entity Lifecycle",
        caption: "Entity states: transient → managed → detached → removed",
        nodes: [
          { id: "transient",  label: "TRANSIENT",  hint: "new Entity() — not associated with any PC, no ID in DB" },
          { id: "managed",    label: "MANAGED",    hint: "In Persistence Context — dirty checked on flush" },
          { id: "detached",   label: "DETACHED",   hint: "Session closed or explicit detach — snapshot lost, lazy load fails" },
          { id: "removed",    label: "REMOVED",    hint: "em.remove() called — DELETE pending on flush" },
          { id: "db",         label: "Database",   hint: "Persisted state" },
        ],
        steps: [
          { path: ["transient"],              label: "1 · new Entity()",     detail: "No ID, no persistence context association. JPA knows nothing about it." },
          { path: ["transient","managed"],    label: "2 · em.persist()",     detail: "Entity added to PC. INSERT pending. Gets ID after flush (or immediately if @GeneratedValue with IDENTITY)." },
          { path: ["managed","db"],           label: "3 · flush() / commit()", detail: "Dirty check runs: snapshots compared to current state. Changed fields generate SQL. SQL sent to DB." },
          { path: ["db","managed"],           label: "4 · em.find() / query",  detail: "Entity loaded from DB into PC. Snapshot taken. Identity map: same ID = same Java object." },
          { path: ["managed","detached"],     label: "5 · session close",     detail: "PC closed → all managed entities become DETACHED. Lazy loading now throws LazyInitializationException." },
          { path: ["detached","managed"],     label: "6 · em.merge()",        detail: "Detached entity re-associated: Hibernate loads current DB state, merges changed fields. Returns new managed instance." },
          { path: ["managed","removed"],      label: "7 · em.remove()",       detail: "Entity marked for removal. DELETE SQL generated on next flush. Entity no longer in identity map after flush." },
        ]
      },

      architecture: {
        title: "Hibernate / JPA Architecture",
        caption: "Persistence Context, caches, flush, and session lifecycle",
        lanes: [
          {
            label: "Session / EntityManager",
            hint: "Unit of work per request",
            nodes: [
              { id: "em",       label: "EntityManager",          badge: "thin wrapper",      hint: "JPA API. Each request gets its own EM via @PersistenceContext or @Transactional. Backed by Hibernate Session." },
              { id: "pc",       label: "Persistence Context",    badge: "identity map",      hint: "Maps entity class+id → managed entity object. 1st level cache. All JDBC ops within a session share this PC." },
              { id: "snapshot", label: "Entity Snapshot",        badge: "dirty check source",hint: "Deep copy of entity state at load time. Compared at flush to detect changes. Per-entity, per-session." },
            ]
          },
          {
            label: "Fetching Strategies",
            hint: "Controlling SQL generation",
            nodes: [
              { id: "eager",  label: "EAGER fetch",    badge: "always JOIN",    hint: "@ManyToOne default=EAGER. Always loads in same SELECT as parent. Can cause Cartesian product with multiple EAGER collections." },
              { id: "lazy",   label: "LAZY fetch",     badge: "proxy + SELECT", hint: "@OneToMany default=LAZY. Returns proxy — SELECT fires on first access. Session must be open." },
              { id: "join-fetch", label: "JOIN FETCH",  badge: "JPQL override",  hint: "Override default fetch: SELECT o FROM Order o JOIN FETCH o.customer. Eager for this query only. No N+1." },
            ]
          },
          {
            label: "Caching Layers",
            hint: "1st and 2nd level caches",
            nodes: [
              { id: "l1", label: "1st Level Cache",   badge: "session-scoped",  hint: "Built-in, always on. Identity map within session. Same ID = same object. Cleared on session close or evict()." },
              { id: "l2", label: "2nd Level Cache",   badge: "process-scoped",  hint: "Optional (EHCache, Infinispan, Redis). Shared across sessions. Requires @Cache(usage=READ_WRITE) annotation. Invalidated on write." },
              { id: "qc", label: "Query Cache",       badge: "result-set cache", hint: "Caches query result ID lists (not entities). Invalidated when ANY entity in result set changes. Rarely beneficial." },
            ]
          },
          {
            label: "Flush Modes",
            hint: "When SQL is sent to DB",
            nodes: [
              { id: "flush-commit", label: "FlushMode.COMMIT", badge: "default",    hint: "SQL flushed only at transaction commit. Most efficient. Reads within tx may see stale data if not flushed first." },
              { id: "flush-always", label: "FlushMode.ALWAYS", badge: "safe reads",  hint: "Flush before every query. Guarantees queries see latest in-tx changes. Higher overhead." },
              { id: "flush-manual", label: "FlushMode.MANUAL", badge: "explicit",   hint: "No automatic flush. em.flush() must be called explicitly. Used in batch processing for performance control." },
            ]
          }
        ],
        links: [
          { from: "em",     to: "pc",            label: "owns PC",             type: "sync" },
          { from: "pc",     to: "snapshot",      label: "snapshot on load",    type: "sync" },
          { from: "lazy",   to: "l1",            label: "proxy triggers load",  type: "async" },
          { from: "l1",     to: "l2",            label: "L1 miss → L2",        type: "sync" },
          { from: "l2",     to: "flush-commit",  label: "write invalidates L2", type: "async" },
          { from: "join-fetch", to: "eager",     label: "overrides lazy",       type: "sync" },
        ]
      }
    }
  ]);
})();
