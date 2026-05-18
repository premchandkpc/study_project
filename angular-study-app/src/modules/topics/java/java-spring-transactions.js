(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([
    {
      id: "java-spring-transactions",
      area: "java",
      title: "Spring Transactions & Propagation",
      tag: "Spring",
      tags: ["transactions", "spring", "propagation", "rollback", "transactional", "jpa", "aop", "proxy", "savepoint"],

      concept:
`**L1 (30s ELI5):** @Transactional is like wrapping your code in "do all of this OR undo all of it." If anything goes wrong, the whole thing is rolled back like it never happened.

**L2 (2min core):** Spring's @Transactional works via AOP proxy. When a Spring bean method with @Transactional is called, Spring's proxy intercepts it: (1) begin transaction, (2) invoke method, (3) commit or rollback on exit. Propagation controls what happens when one @Transactional method calls another. Default: REQUIRED (join existing or create new). Isolation: READ_COMMITTED by default (DB-specific).

**L3 (10min edge):** Self-invocation bypass: calling @Transactional method from within the same bean does NOT go through proxy → no transaction. RuntimeException → auto rollback. Checked exceptions → commit by default (Java legacy). REQUIRES_NEW suspends outer tx and uses a NEW connection — can deadlock if outer holds a row lock that inner needs. NESTED uses SQL savepoint (only JPA/JDBC, not all DBs).

**L4 (deep):** Transaction synchronization: Spring binds connection/session to thread via TransactionSynchronizationManager (ThreadLocal). REQUIRED propagation: Spring checks thread-local for existing tx — if found, joins it (same connection). PlatformTransactionManager implementations: JpaTransactionManager, DataSourceTransactionManager, JtaTransactionManager (XA, two-phase commit). @TransactionalEventListener: publish events that fire AFTER tx commit (not on rollback).`,

      why:
"Incorrect transaction propagation causes data corruption in production — a REQUIRED calling REQUIRES_NEW can deadlock; a missing @Transactional causes LazyInitializationException in JPA; checked exceptions silently committing on error violate business rules.",

      example: {
        language: "java",
        code:
`// ─── Basic @Transactional usage ──────────────────────────────────────────────
@Service
public class OrderService {

    @Transactional                             // default REQUIRED propagation
    public void placeOrder(Order order) {
        orderRepo.save(order);                 // inside tx
        inventoryService.reserve(order);       // same tx (REQUIRED joins)
        paymentService.charge(order);          // same tx — ALL or NOTHING
    }
}

// ─── Propagation examples ─────────────────────────────────────────────────────
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void auditLog(String event) {
    // Runs in SEPARATE tx, even if caller has tx.
    // Committed immediately — even if caller rolls back.
    // ⚠️ Uses separate DB connection — can deadlock with caller's row locks!
    auditRepo.save(new AuditEntry(event));
}

@Transactional(propagation = Propagation.NESTED)
public void saveChild(Child child) {
    // Creates SQL SAVEPOINT inside parent tx.
    // If this throws: rollback to savepoint only (not full tx).
    // ⚠️ Requires JdbcTransactionManager — not all databases support savepoints.
}

// ─── Rollback rules — checked exceptions DON'T rollback by default! ──────────
@Transactional(rollbackFor = Exception.class)  // ✅ explicit: rollback ALL
public void process() throws BusinessException {
    // Without rollbackFor: BusinessException (checked) → COMMITS! 😱
}

// ─── Self-invocation: @Transactional IGNORED ─────────────────────────────────
@Service
public class PaymentService {

    @Transactional
    public void process() {
        this.audit();  // ❌ WRONG: same bean, bypasses proxy → no transaction!
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void audit() { ... }

    // Fix: inject self, or use ApplicationContext.getBean(PaymentService.class)
}`,
        notes: "@Transactional only works on public methods of Spring-managed beans. On private, package-private, or self-invocation: proxy is bypassed."
      },

      interview: [
        {
          question: "What is the difference between REQUIRED and REQUIRES_NEW?",
          answer:
"**REQUIRED** (default): If a transaction already exists, JOIN it. If not, CREATE a new one. Both operations run in the same transaction — either both commit or both roll back. **REQUIRES_NEW**: Always CREATE a new, completely SEPARATE transaction. The existing transaction is SUSPENDED. The new tx commits or rolls back independently. Use for audit logs, outbox patterns — you want them committed even if the outer tx rolls back. **Warning**: REQUIRES_NEW opens a new DB connection; if the outer tx holds row locks the inner tx needs, you get a deadlock.",
          followUps: ["When would REQUIRES_NEW deadlock?", "How to implement outbox pattern safely?"]
        },
        {
          question: "Why do checked exceptions not trigger rollback by default?",
          answer:
"Java heritage: checked exceptions were designed as 'expected business errors' (e.g., InsufficientFundsException) that you CATCH and handle — not necessarily rollback-worthy. Spring followed EJB convention: RuntimeException (unchecked) → rollback; checked Exception → commit. Fix: `@Transactional(rollbackFor = Exception.class)` or `rollbackFor = {MyCheckedException.class}`.",
          followUps: ["What does noRollbackFor do?", "How does Spring detect checked exceptions?"]
        },
        {
          question: "Explain self-invocation and how to fix it.",
          answer:
"Spring @Transactional works via AOP proxy. External callers go through proxy → Spring intercepts and begins tx. When method A calls method B **on the same bean** (this.B()), it bypasses the proxy — Spring's interceptor never fires. Result: B runs without any transaction. Fix: (1) inject the bean into itself (`@Autowired PaymentService self`), (2) use `ApplicationContext.getBean()`, (3) split into two beans, (4) use AspectJ weaving instead of proxy.",
          followUps: ["Does Spring Boot support AspectJ weaving?", "What is the difference between JDK proxy and CGLIB?"]
        }
      ],

      gotchas: [
        "Self-invocation: @Transactional on this.method() skips proxy. No exception thrown — it just runs without a transaction.",
        "Checked exceptions commit by default. @Transactional(rollbackFor=Exception.class) is needed to rollback all exception types.",
        "REQUIRES_NEW uses a second DB connection from the pool. With small pools: pool exhaustion deadlock (outer tx holds connection 1, inner tx waits for connection 2 — but pool is empty).",
        "@Transactional on private methods: Spring CGLIB proxies cannot intercept private methods — @Transactional is silently ignored.",
        "LazyInitializationException: accessing lazy association outside of session/transaction. Open-Session-In-View (OSIV) antipattern 'fixes' this by keeping session open during HTTP rendering — hides the real problem.",
        "@TransactionalEventListener: by default fires AFTER commit (AFTER_COMMIT phase). If you want it to fire even on rollback use phase=TransactionPhase.AFTER_COMPLETION."
      ],

      tradeoffs: {
        pros: [
          "Declarative: @Transactional hides begin/commit/rollback boilerplate.",
          "Propagation: fine-grained control over transaction boundaries across method calls.",
          "@TransactionalEventListener: safe event publishing — event only fires after tx commits."
        ],
        cons: [
          "Proxy-based: self-invocation, private methods, final classes break it silently.",
          "REQUIRES_NEW: extra connection from pool — starvation risk with small pool sizes.",
          "Checked exception gotcha: uncommitted data corruption silently happens if rollbackFor is omitted."
        ],
        when: "**Single service operation**: REQUIRED. **Audit log that must persist regardless**: REQUIRES_NEW. **Partial subtask rollback**: NESTED with savepoints. **Long transaction risk**: SUPPORTS or NOT_SUPPORTED for read-only operations."
      },

      visual: function (mount) {
        var CVU = window.CVU;
        if (!CVU) { mount.textContent = "CVU not loaded"; return; }
        var C = CVU.C;

        var ctrl = CVU.makeCtrlRow(mount);
        var btnPlay  = CVU.makeBtn("▶ Play Flow", C.green);
        var btnReset = CVU.makeBtn("↺ Reset",     C.gray);
        var btnProp  = CVU.makeBtn("⚡ Propagation Grid", C.orange);
        ctrl.appendChild(btnPlay);
        ctrl.appendChild(btnReset);
        ctrl.appendChild(btnProp);

        var W = 700, H = 480;
        var canvas = CVU.makeCanvas(mount, W, H);
        var ctx = canvas.getContext("2d");
        var LW = canvas._logicalWidth;
        var LH = canvas._logicalHeight;
        var status = CVU.makeStatus(mount);

        var mode = "flow"; // "flow" | "grid"
        var step = 0;

        /* ── Flow: 5 steps ──────────────────────────────────────── */
        var FLOW_STEPS = [
          {
            label: "1 · Proxy Intercepts Call",
            color: C.blue,
            desc: "@Transactional method called. Spring AOP CGLIB/JDK proxy intercepts before reaching your bean.",
            boxes: [
              { x:50,  y:60,  w:140, h:46, label:"Caller", badge:"HTTP / another bean", color:C.gray },
              { x:280, y:60,  w:140, h:46, label:"Spring Proxy", badge:"@Transactional AOP", color:C.blue },
              { x:510, y:60,  w:140, h:46, label:"Your Bean",    badge:"ServiceImpl",    color:C.gray },
            ],
            arrow: { x1:194, y1:83, x2:278, y2:83, color:C.blue }
          },
          {
            label: "2 · Begin Transaction",
            color: C.green,
            desc: "PlatformTransactionManager.getTransaction(): check for existing tx (ThreadLocal). REQUIRED: join if exists, create if not.",
            boxes: [
              { x:280, y:60,  w:140, h:46, label:"Spring Proxy",    badge:"before advice",     color:C.blue },
              { x:50,  y:160, w:140, h:46, label:"TxManager",       badge:"DataSource/JPA",    color:C.green },
              { x:280, y:160, w:140, h:46, label:"Connection",       badge:"autoCommit=false",  color:C.green },
              { x:510, y:160, w:140, h:46, label:"ThreadLocal Sync", badge:"tx bound to thread",color:C.orange },
            ],
            arrows: [
              { x1:350, y1:108, x2:350, y2:158, color:C.green },
              { x1:278, y1:183, x2:194, y2:183, color:C.green },
              { x1:424, y1:183, x2:508, y2:183, color:C.orange },
            ]
          },
          {
            label: "3 · Execute Business Logic",
            color: C.purple,
            desc: "Proxy calls your bean method. All JPA/JDBC operations use the same connection (from ThreadLocal). REQUIRED nested calls join this tx.",
            boxes: [
              { x:280, y:60,  w:140, h:46, label:"Spring Proxy",    badge:"invoke target",  color:C.blue },
              { x:510, y:60,  w:140, h:46, label:"Your Bean",       badge:"method runs",    color:C.purple },
              { x:510, y:160, w:140, h:46, label:"Repository",      badge:"JPA/JDBC ops",   color:C.purple },
              { x:510, y:260, w:140, h:46, label:"Database",        badge:"SQL executed",   color:C.yellow },
            ],
            arrows: [
              { x1:424, y1:83,  x2:508, y2:83,  color:C.purple },
              { x1:580, y1:108, x2:580, y2:158, color:C.purple },
              { x1:580, y1:208, x2:580, y2:258, color:C.yellow },
            ]
          },
          {
            label: "4 · Commit or Rollback",
            color: C.orange,
            desc: "Method returns normally → commit(). RuntimeException thrown → rollback(). Checked exception → commit (unless rollbackFor specified).",
            boxes: [
              { x:50,  y:60,  w:140, h:46, label:"RuntimeException",badge:"→ rollback()",    color:C.red },
              { x:280, y:60,  w:140, h:46, label:"Spring Proxy",    badge:"after advice",    color:C.blue },
              { x:510, y:60,  w:140, h:46, label:"Normal return",   badge:"→ commit()",      color:C.green },
              { x:280, y:160, w:140, h:46, label:"TxManager",       badge:"commit / rollback",color:C.orange },
            ],
            arrows: [
              { x1:278, y1:83,  x2:194, y2:83,  color:C.red },
              { x1:508, y1:83,  x2:424, y2:83,  color:C.green },
              { x1:350, y1:108, x2:350, y2:158, color:C.orange },
            ]
          },
          {
            label: "5 · Connection Released",
            color: C.gray,
            desc: "Connection returned to pool. ThreadLocal cleared. Transaction synchronization cleaned up.",
            boxes: [
              { x:280, y:160, w:140, h:46, label:"TxManager",      badge:"cleanup",          color:C.gray },
              { x:50,  y:160, w:140, h:46, label:"Connection Pool", badge:"conn returned",   color:C.gray },
              { x:510, y:160, w:140, h:46, label:"ThreadLocal",    badge:"cleared",          color:C.gray },
            ],
            arrows: [
              { x1:278, y1:183, x2:194, y2:183, color:C.gray },
              { x1:424, y1:183, x2:508, y2:183, color:C.gray },
            ]
          }
        ];

        /* ── Propagation grid data ──────────────────────────────── */
        var PROP = [
          { name:"REQUIRED",      outer:"exists",     result:"JOIN outer tx",            color:C.blue,   riskColor:C.green, risk:"safe" },
          { name:"REQUIRED",      outer:"none",       result:"CREATE new tx",            color:C.blue,   riskColor:C.green, risk:"safe" },
          { name:"REQUIRES_NEW",  outer:"exists",     result:"SUSPEND outer, NEW tx",    color:C.orange, riskColor:C.red,   risk:"deadlock risk" },
          { name:"REQUIRES_NEW",  outer:"none",       result:"CREATE new tx",            color:C.orange, riskColor:C.green, risk:"safe" },
          { name:"SUPPORTS",      outer:"exists",     result:"JOIN outer tx",            color:C.purple, riskColor:C.green, risk:"safe" },
          { name:"SUPPORTS",      outer:"none",       result:"run NON-tx",               color:C.purple, riskColor:C.yellow,risk:"no tx" },
          { name:"NOT_SUPPORTED", outer:"any",        result:"SUSPEND outer, run NON-tx",color:C.gray,   riskColor:C.yellow,risk:"no tx" },
          { name:"MANDATORY",     outer:"exists",     result:"JOIN outer tx",            color:C.green,  riskColor:C.green, risk:"safe" },
          { name:"MANDATORY",     outer:"none",       result:"IllegalTxStateException",  color:C.green,  riskColor:C.red,   risk:"exception" },
          { name:"NEVER",         outer:"exists",     result:"IllegalTxStateException",  color:C.red,    riskColor:C.red,   risk:"exception" },
          { name:"NESTED",        outer:"exists",     result:"SAVEPOINT in outer tx",    color:C.lightBlue,riskColor:C.yellow,risk:"savepoint" },
          { name:"NESTED",        outer:"none",       result:"CREATE new tx",            color:C.lightBlue,riskColor:C.green,risk:"safe" },
        ];

        function drawFlow() {
          CVU.clearBg(ctx, LW, LH);
          var cur = FLOW_STEPS[Math.min(step, FLOW_STEPS.length - 1)];

          CVU.roundRect(ctx, 12, 0, LW - 24, 30, 6, C.card, C.border, 1);
          CVU.text(ctx, "Spring @Transactional — AOP Proxy Lifecycle", LW / 2, 19, C.text, 11, "center", "600");

          /* step boxes */
          (cur.boxes || []).forEach(function (b) {
            CVU.roundRect(ctx, b.x, b.y + 30, b.w, b.h, 6, b.color + "22", b.color, 1.8);
            CVU.text(ctx, b.label, b.x + b.w / 2, b.y + 30 + 17, b.color, 10, "center", "700");
            CVU.text(ctx, b.badge, b.x + b.w / 2, b.y + 30 + 33, C.gray, 8, "center");
          });

          /* step arrows */
          (cur.arrows || []).forEach(function (a) {
            CVU.arrow(ctx, a.x1, a.y1 + 30, a.x2, a.y2 + 30, a.color, 2);
          });
          if (cur.arrow) {
            CVU.arrow(ctx, cur.arrow.x1, cur.arrow.y1 + 30, cur.arrow.x2, cur.arrow.y2 + 30, cur.arrow.color, 2);
          }

          /* step label */
          CVU.roundRect(ctx, 12, LH - 110, LW - 24, 64, 6, cur.color + "22", cur.color, 1.5);
          CVU.text(ctx, cur.label, LW / 2, LH - 88, cur.color, 12, "center", "700");
          CVU.wrapText(ctx, cur.desc, LW / 2, LH - 68, LW - 48, 15, C.text, 9.5, "center", "normal", 3);

          /* step dots */
          FLOW_STEPS.forEach(function (s, i) {
            var px = 20 + i * (LW - 40) / FLOW_STEPS.length + 8;
            var active = i === Math.min(step, FLOW_STEPS.length - 1);
            CVU.dot(ctx, px, LH - 20, active ? 6 : 4, active ? s.color : C.border);
            CVU.text(ctx, (i + 1) + "", px, LH - 8, active ? s.color : C.gray, 8, "center");
          });
        }

        function drawGrid() {
          CVU.clearBg(ctx, LW, LH);
          CVU.roundRect(ctx, 12, 0, LW - 24, 30, 6, C.card, C.border, 1);
          CVU.text(ctx, "Spring Transaction Propagation — Behavior Grid", LW / 2, 19, C.text, 11, "center", "600");

          var cols = ["Propagation", "Outer Tx?", "Behavior", "Risk"];
          var colW = [150, 80, 240, 110];
          var startX = 16, startY = 38, rowH = 30;

          /* header */
          var cx = startX;
          cols.forEach(function (h, i) {
            CVU.roundRect(ctx, cx, startY, colW[i], rowH, 4, C.card, C.border, 1);
            CVU.text(ctx, h, cx + colW[i] / 2, startY + 19, C.blue, 10, "center", "700");
            cx += colW[i] + 2;
          });

          PROP.forEach(function (p, ri) {
            var rowY = startY + (ri + 1) * (rowH + 1);
            var cx2 = startX;
            var vals = [p.name, p.outer, p.result, p.risk];
            var colors = [p.color, C.gray, C.text, p.riskColor];
            var bgs = [p.color + "22", C.card, C.card, p.riskColor + "22"];
            vals.forEach(function (v, ci) {
              CVU.roundRect(ctx, cx2, rowY, colW[ci], rowH, 3, bgs[ci], colors[ci] + "55", 1);
              CVU.text(ctx, v, cx2 + colW[ci] / 2, rowY + 19, colors[ci], 9, "center");
              cx2 += colW[ci] + 2;
            });
          });

          CVU.text(ctx, "Click '▶ Play Flow' to see the 5-step transaction lifecycle.", LW / 2, LH - 10, C.gray, 9, "center");
        }

        function draw() { if (mode === "flow") drawFlow(); else drawGrid(); }

        var raf = null;
        function tick() { draw(); raf = requestAnimationFrame(tick); }
        tick();

        status.textContent = "Step through the @Transactional AOP proxy lifecycle, or view the Propagation Grid.";

        var playing = false, playInterval = null;

        btnPlay.addEventListener("click", function () {
          mode = "flow";
          if (playing) {
            clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play Flow";
          } else {
            playing = true; btnPlay.textContent = "⏸ Pause";
            playInterval = setInterval(function () {
              step++;
              if (step >= FLOW_STEPS.length) {
                step = FLOW_STEPS.length - 1; clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play Flow"; return;
              }
              status.textContent = FLOW_STEPS[step].desc;
            }, 1800);
          }
        });

        btnProp.addEventListener("click", function () {
          clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play Flow";
          mode = mode === "grid" ? "flow" : "grid";
          btnProp.textContent = mode === "grid" ? "◀ Back to Flow" : "⚡ Propagation Grid";
          status.textContent = mode === "grid" ? "Propagation behavior for every combination of outer tx state." : FLOW_STEPS[step].desc;
        });

        btnReset.addEventListener("click", function () {
          clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play Flow";
          step = 0; mode = "flow"; btnProp.textContent = "⚡ Propagation Grid";
          status.textContent = "Step through the @Transactional AOP proxy lifecycle, or view the Propagation Grid.";
        });

        canvas.addEventListener("click", function () {
          if (mode === "flow") {
            step = Math.min(step + 1, FLOW_STEPS.length - 1);
            status.textContent = FLOW_STEPS[step].desc;
          }
        });
      },

      flow: {
        title: "Spring @Transactional — Proxy Intercept & Propagation",
        caption: "AOP proxy wraps every @Transactional call: begin → business logic → commit/rollback",
        nodes: [
          { id: "caller",  label: "Caller / Controller",  hint: "Calls @Transactional service method" },
          { id: "proxy",   label: "Spring AOP Proxy",     hint: "CGLIB/JDK proxy intercepts the call" },
          { id: "txmgr",   label: "PlatformTransactionManager", hint: "Begins, suspends, commits, or rolls back tx" },
          { id: "bean",    label: "Service Bean (target)", hint: "Actual business logic runs here" },
          { id: "repo",    label: "Repository / DAO",     hint: "JPA/JDBC uses ThreadLocal connection" },
          { id: "db",      label: "Database",             hint: "SQL executes on bound connection" },
          { id: "commit",  label: "commit() / rollback()", hint: "Determined by exception type and propagation" },
        ],
        steps: [
          { path: ["caller", "proxy"], label: "1 · Caller hits proxy",     detail: "Caller calls serviceBean.doWork(). CGLIB proxy intercepts — actual bean not called yet." },
          { path: ["proxy", "txmgr"],  label: "2 · TxManager consulted",   detail: "PlatformTransactionManager.getTransaction(txAttr): checks ThreadLocal for existing tx. REQUIRED: join if exists, create if not." },
          { path: ["proxy", "bean"],   label: "3 · Proxy invokes target",   detail: "Proxy calls actual service bean method. ThreadLocal now holds active connection." },
          { path: ["bean", "repo"],    label: "4 · Repo uses tx connection", detail: "JPA/JDBC EntityManager/Connection obtained from ThreadLocal binding. Same connection for entire tx." },
          { path: ["repo", "db"],      label: "5 · SQL executes",           detail: "All DML (INSERT/UPDATE/DELETE) buffered or sent to DB. Not committed yet." },
          { path: ["bean", "proxy"],   label: "6 · Method returns to proxy", detail: "Bean method returns. Proxy's after-advice checks: RuntimeException? → rollback. Normal return? → commit." },
          { path: ["proxy", "commit"], label: "7 · commit() or rollback()", detail: "PlatformTransactionManager.commit() or rollback(). Connection returned to pool. ThreadLocal cleared." },
        ]
      },

      architecture: {
        title: "Spring Transaction Infrastructure",
        caption: "PlatformTransactionManager, propagation, isolation, and synchronization",
        lanes: [
          {
            label: "Transaction Managers",
            hint: "Concrete TxManager implementations",
            nodes: [
              { id: "jpa-tm",  label: "JpaTransactionManager",        badge: "Spring Data JPA",   hint: "Binds JPA EntityManager to current transaction. Wraps JPA tx lifecycle. Used when spring-data-jpa on classpath." },
              { id: "jdbc-tm", label: "DataSourceTransactionManager",  badge: "plain JDBC",        hint: "Binds JDBC Connection from DataSource. No JPA — works with JdbcTemplate, MyBatis." },
              { id: "jta-tm",  label: "JtaTransactionManager",         badge: "XA two-phase",      hint: "For distributed transactions across multiple DBs or Kafka + DB. Uses JTA / UserTransaction. Managed by App Server (WildFly, WebLogic) or Atomikos." },
            ]
          },
          {
            label: "Propagation Behaviors",
            hint: "7 propagation levels",
            nodes: [
              { id: "required",      label: "REQUIRED (default)", badge: "join or create",  hint: "Most common. If tx exists: join it. If not: create new. All callers share same tx — all-or-nothing." },
              { id: "requires_new",  label: "REQUIRES_NEW",        badge: "suspend + new",  hint: "Always create new independent tx. Outer tx suspended. Inner commits independently. Use for audit logs. DANGER: deadlock if inner needs locks held by outer." },
              { id: "nested",        label: "NESTED",              badge: "savepoint",      hint: "SQL SAVEPOINT inside outer tx. If inner rolls back: only rollback to savepoint. Outer continues. Only with DataSourceTxManager (not JPA)." },
            ]
          },
          {
            label: "Rollback Rules",
            hint: "What triggers rollback",
            nodes: [
              { id: "runtime-ex",  label: "RuntimeException / Error", badge: "rollback by default", hint: "Any unchecked exception causes automatic rollback. Default EJB/Spring convention." },
              { id: "checked-ex",  label: "Checked Exception",         badge: "COMMIT by default!",  hint: "Spring inherited EJB behavior: checked exceptions are 'business errors' expected to be caught. They COMMIT unless rollbackFor is specified." },
              { id: "rollback-for",label: "@Transactional(rollbackFor=Exception.class)", badge: "safe default", hint: "Best practice: always specify rollbackFor=Exception.class to roll back on ANY exception, checked or unchecked." },
            ]
          },
          {
            label: "Common Pitfalls",
            hint: "Silent failures in production",
            nodes: [
              { id: "self-invoke",  label: "Self-Invocation",       badge: "proxy bypassed",       hint: "this.transactionalMethod() skips proxy. No exception. @Transactional silently ignored. Fix: inject self or split beans." },
              { id: "private",      label: "private @Transactional", badge: "ignored by proxy",    hint: "CGLIB proxies cannot override private methods. @Transactional on private method = no transaction." },
              { id: "lazy-ex",      label: "LazyInitializationException", badge: "tx closed too early", hint: "Accessing JPA lazy collection after transaction closes. Symptom of wrong tx boundaries, not a JPA bug. Fix: fetch during tx, use DTO projection, or @EntityGraph." },
            ]
          }
        ],
        links: [
          { from: "required", to: "jpa-tm",   label: "joined via TxManager",      type: "sync" },
          { from: "requires_new", to: "jdbc-tm", label: "new connection from pool", type: "sync" },
          { from: "runtime-ex", to: "required",  label: "triggers rollback",        type: "sync" },
          { from: "checked-ex", to: "rollback-for", label: "fix: rollbackFor",      type: "async" },
          { from: "self-invoke", to: "private", label: "same root cause: proxy",    type: "async" },
          { from: "jta-tm", to: "nested",       label: "XA vs savepoint tradeoff",  type: "async" },
        ]
      }
    }
  ]);
})();
