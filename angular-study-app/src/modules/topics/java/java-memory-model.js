(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([
    {
      id: "java-memory-model",
      area: "java",
      title: "Java Memory Model (JMM)",
      tag: "Concurrency",
      tags: ["jmm", "volatile", "synchronized", "happens-before", "visibility", "atomicity", "ordering", "cas"],

      concept:
`**L1 (30s ELI5):** Two workers sharing a whiteboard, but each has a sticky note (CPU cache). If they write to sticky note only, other worker sees old whiteboard value. \`volatile\` says: always update whiteboard. \`synchronized\` says: only one worker at whiteboard at a time.

**L2 (2min core):** JMM defines when writes by one thread become visible to another. Three problems: **visibility** (stale cached values), **atomicity** (compound read-modify-write races), **ordering** (CPU/compiler reorders instructions). \`volatile\` fixes visibility + ordering (not atomicity). \`synchronized\` fixes all three. \`AtomicInteger\` fixes atomicity via CAS. Happens-before: volatile write HB volatile read; monitor release HB monitor acquire.

**L3 (10min):** Happens-before (HB) rules: (1) program order, (2) monitor unlock → lock, (3) volatile write → read, (4) Thread.start() → first action, (5) last action → Thread.join(), (6) Object construction → finalizer. Without HB, JVM may cache stale values in registers or reorder stores. \`double-checked locking\` ONLY safe with volatile field (Java 5+).

**L4 (30min deep):** Memory barriers: StoreStore / LoadLoad / StoreLoad / LoadStore fence instructions. volatile write → StoreStore + StoreLoad barrier. volatile read → LoadLoad + LoadStore. JIT C2 may hoist loads out of loops (loop-invariant hoisting) — volatile prevents this. CPU write buffers: TSO (Total Store Order) on x86 means StoreLoad is the only barrier needed in practice. ARM is weaker — needs more fences. \`VarHandle\` exposes acquire/release/opaque/plain memory order semantics for lock-free data structures.`,

      why:
"JMM bugs are among the hardest to reproduce — they appear only on multi-core systems under load, disappear with debuggers, and differ across JVM versions and CPU architectures. Every senior Java engineer must be able to reason about visibility and happens-before.",

      example: {
        language: "java",
        code:
`// ─── 1. Visibility bug: stale flag ───────────────────────────────────────────
class StopTask implements Runnable {
    private boolean stop = false;                  // ❌ no volatile!

    public void stopIt() { stop = true; }

    public void run() {
        while (!stop) { doWork(); }                // may loop forever — CPU caches stop=false
    }
}

// Fix: volatile ensures write is visible immediately across threads
private volatile boolean stop = false;             // ✅

// ─── 2. Double-checked locking (ONLY safe with volatile) ─────────────────────
class Singleton {
    private static volatile Singleton instance;    // volatile = required!

    public static Singleton get() {
        if (instance == null) {                    // 1st check (no lock)
            synchronized (Singleton.class) {
                if (instance == null) {            // 2nd check (with lock)
                    instance = new Singleton();    // volatile prevents partial-init visibility
                }
            }
        }
        return instance;
    }
}

// ─── 3. Atomicity: volatile does NOT help compound ops ────────────────────────
volatile int count = 0;
count++;              // ❌ still a race! read-increment-write = 3 ops

AtomicInteger count2 = new AtomicInteger(0);
count2.incrementAndGet(); // ✅ single CAS instruction

// ─── 4. VarHandle — fine-grained memory order (Java 9+) ──────────────────────
import java.lang.invoke.*;
VarHandle VH = MethodHandles.lookup().findVarHandle(MyClass.class, "field", int.class);
VH.setVolatile(obj, 42);         // full volatile semantics
VH.setRelease(obj, 42);          // release fence only (cheaper)
int v = (int) VH.getAcquire(obj);// acquire fence only`,
        notes: "volatile write happens-before volatile read — but only the most recent write. For accumulation (counter++) use AtomicInteger or LongAdder."
      },

      interview: [
        {
          question: "What does volatile guarantee and NOT guarantee?",
          answer:
"**Guarantees:** (1) Visibility — write to volatile field is immediately visible to all threads (bypasses CPU caches). (2) Ordering — volatile write + read inserts memory barriers, preventing reordering across the volatile access. **Does NOT guarantee:** Atomicity for compound operations. `volatile int x; x++` is still read-modify-write (3 steps) and can race. Use `AtomicInteger.incrementAndGet()` for atomic compound ops.",
          followUps: ["What is the memory barrier inserted by volatile?", "Is double-checked locking safe with volatile?"]
        },
        {
          question: "Explain happens-before in JMM.",
          answer:
"If action A happens-before action B, then all effects of A are visible to B. Key HB rules: (1) **Program order** — statements in the same thread are ordered. (2) **Monitor** — unlock HB any subsequent lock on the same monitor. (3) **volatile** — write HB any subsequent read of that variable. (4) **Thread.start()** HB first action in started thread. (5) Last action in thread HB Thread.join() return. HB is transitive: A HB B and B HB C → A HB C.",
          followUps: ["Can there be visibility without happens-before?", "What is a data race in JMM?"]
        },
        {
          question: "When is double-checked locking safe?",
          answer:
"Only when the instance field is declared `volatile`. Without volatile, the JVM may reorder: (1) allocate memory, (2) publish reference, (3) initialize fields. A second thread can see a non-null but uninitialized object. `volatile` adds a StoreStore barrier before the store and a StoreLoad barrier after — prevents the publish from being seen before initialization. Safe in Java 5+ with volatile.",
          followUps: ["What alternative avoids locking entirely?", "Enum-based singleton vs volatile DCL?"]
        }
      ],

      gotchas: [
        "volatile on long/double: reads/writes are NOT atomic on 32-bit JVMs without volatile. volatile makes 64-bit reads/writes atomic.",
        "volatile does NOT prevent StoreLoad reordering on ARM. JMM requires StoreLoad fence after every volatile write — x86 does this automatically (TSO), ARM needs an explicit dmb instruction.",
        "Double-checked locking without volatile: JIT/CPU may publish reference before object fully initialized — second thread sees non-null garbage object.",
        "Piggybacking happens-before: if Thread A writes x, then writes to volatile flag, and Thread B reads volatile flag, then reads x — x visibility is guaranteed even though x is non-volatile.",
        "ThreadLocal does NOT provide happens-before between threads. Each thread's ThreadLocal is private — no synchronization across threads.",
        "AtomicReference.set() has volatile semantics. AtomicReference.lazySet() has only release semantics (cheaper — avoids StoreLoad fence)."
      ],

      tradeoffs: {
        pros: [
          "volatile: zero-overhead read in x86 TSO (no extra fence). Write costs a StoreLoad fence (~40 cycles).",
          "synchronized: straightforward, JVM handles all JMM rules automatically.",
          "VarHandle: fine-grained memory order control — e.g., setRelease + getAcquire avoids expensive StoreLoad fences."
        ],
        cons: [
          "volatile: no atomicity for compound ops — easy to misuse.",
          "synchronized: coarse — blocks even reads. Use StampedLock or ReadWriteLock for read-heavy scenarios.",
          "CAS loops under high contention: spinloop wastes CPU. LongAdder uses striping to reduce contention."
        ],
        when: "**Stop flag / single publish**: volatile. **Counter**: AtomicLong or LongAdder. **Critical section**: synchronized or ReentrantLock. **Lock-free data structure**: VarHandle with acquire/release."
      },

      visual: function (mount) {
        var CVU = window.CVU;
        if (!CVU) { mount.textContent = "CVU not loaded"; return; }
        var C = CVU.C;

        /* ── Controls ─────────────────────────────────────────── */
        var ctrl = CVU.makeCtrlRow(mount);
        var btnPlay  = CVU.makeBtn("▶ Play",  C.green);
        var btnStep  = CVU.makeBtn("⏭ Step",  C.blue);
        var btnReset = CVU.makeBtn("↺ Reset", C.gray);
        ctrl.appendChild(btnPlay);
        ctrl.appendChild(btnStep);
        ctrl.appendChild(btnReset);

        /* ── Canvas ────────────────────────────────────────────── */
        var W = 700, H = 500;
        var canvas = CVU.makeCanvas(mount, W, H);
        var ctx = canvas.getContext("2d");
        var LW = canvas._logicalWidth;
        var LH = canvas._logicalHeight;

        var status = CVU.makeStatus(mount);

        /* ── Layout constants ──────────────────────────────────── */
        var ROWS = [
          { label: "NO-SYNC",      color: C.red,      desc: "Thread A writes flag=true → CPU cache → Thread B reads stale false" },
          { label: "VOLATILE",     color: C.blue,     desc: "volatile write → StoreLoad fence → main memory → Thread B reads fresh true" },
          { label: "SYNCHRONIZED", color: C.green,    desc: "monitor exit (fence) → Thread B monitor enter → reads fresh true" },
          { label: "ATOMIC CAS",   color: C.purple,   desc: "compareAndSet(0,1) → single CPU CAS instruction → Thread B reads 1 atomically" },
        ];

        var MARGIN_LEFT = 14;
        var HEADER_H    = 36;
        var ROW_H       = (LH - HEADER_H) / ROWS.length;
        var BOX_W       = 110, BOX_H = 52;
        var COL_A       = MARGIN_LEFT + 8;
        var COL_MEM     = LW / 2 - BOX_W / 2;
        var COL_B       = LW - MARGIN_LEFT - 8 - BOX_W;

        /* ── Dot animation state ─────────────────────────────────
           Each row has up to 3 dots: A→mem, mem→B, optional stale cross
        */
        var STEPS = 6; // 0=idle 1=T_A_write 2=cache_only 3=barrier 4=mem_update 5=T_B_read
        var step  = 0;
        var dots  = [];  // {x, y, tx, ty, color, row, phase, t}
        var raf   = null;

        /* ── Build dot targets per step ─────────────────────────── */
        function rowY(r) { return HEADER_H + r * ROW_H; }
        function boxCx(col)   { return col + BOX_W / 2; }
        function boxCy(r)     { return rowY(r) + ROW_H / 2; }

        var PHASES = {
          0: { // idle
            dots: [],
            notes: ["NO-SYNC: Thread A and Thread B have own CPU caches. Main memory in centre.",
                    "VOLATILE: volatile field read/written directly through to main memory.",
                    "SYNCHRONIZED: monitor lock/unlock acts as full memory fence.",
                    "ATOMIC CAS: compareAndSet is a single atomic CPU instruction."]
          },
          1: { // Thread A writes
            dots: [
              { row:0, sx:COL_A+BOX_W/2, sy:boxCy(0), tx:COL_A+BOX_W+12,       ty:boxCy(0), color:C.red },
              { row:1, sx:COL_A+BOX_W/2, sy:boxCy(1), tx:COL_A+BOX_W+12,       ty:boxCy(1), color:C.blue },
              { row:2, sx:COL_A+BOX_W/2, sy:boxCy(2), tx:COL_A+BOX_W+12,       ty:boxCy(2), color:C.green },
              { row:3, sx:COL_A+BOX_W/2, sy:boxCy(3), tx:COL_A+BOX_W+12,       ty:boxCy(3), color:C.purple },
            ],
            notes: ["Thread A writes flag=true (stays in CPU cache — no fence).",
                    "Thread A writes volatile flag=true → StoreLoad fence forces flush to memory.",
                    "Thread A enters synchronized block → JMM: write happens before monitor exit.",
                    "Thread A calls compareAndSet(0, 1) → CAS instruction issued."]
          },
          2: { // NO-SYNC: write stays in cache; others propagate to memory
            dots: [
              // NO-SYNC: dot stuck near A — stale
              { row:0, sx:COL_A+BOX_W+16, sy:boxCy(0), tx:COL_A+BOX_W+16, ty:boxCy(0)-22, color:C.red, stuck:true },
              // VOLATILE: dot moves to main memory
              { row:1, sx:COL_A+BOX_W+12, sy:boxCy(1), tx:boxCx(COL_MEM), ty:boxCy(1), color:C.blue },
              // SYNC: dot moves to main memory
              { row:2, sx:COL_A+BOX_W+12, sy:boxCy(2), tx:boxCx(COL_MEM), ty:boxCy(2), color:C.green },
              // ATOMIC: CAS succeeds → value in memory
              { row:3, sx:COL_A+BOX_W+12, sy:boxCy(3), tx:boxCx(COL_MEM), ty:boxCy(3), color:C.purple },
            ],
            notes: ["❌ NO-SYNC: write stays in Thread A CPU cache. Main memory still has old value!",
                    "✅ VOLATILE: StoreLoad barrier flushes write to main memory immediately.",
                    "✅ SYNCHRONIZED: monitor exit = full fence → write visible in main memory.",
                    "✅ CAS: hardware atomic — value written to main memory as one instruction."]
          },
          3: { // Thread B reads
            dots: [
              // NO-SYNC: Thread B reads from STALE main memory
              { row:0, sx:boxCx(COL_MEM), sy:boxCy(0), tx:COL_B+BOX_W/2, ty:boxCy(0), color:C.red, stale:true },
              // Others: Thread B reads fresh
              { row:1, sx:boxCx(COL_MEM), sy:boxCy(1), tx:COL_B+BOX_W/2, ty:boxCy(1), color:C.blue },
              { row:2, sx:boxCx(COL_MEM), sy:boxCy(2), tx:COL_B+BOX_W/2, ty:boxCy(2), color:C.green },
              { row:3, sx:boxCx(COL_MEM), sy:boxCy(3), tx:COL_B+BOX_W/2, ty:boxCy(3), color:C.purple },
            ],
            notes: ["❌ Thread B reads main memory → gets OLD value (false). Stale read!",
                    "✅ Thread B reads volatile → sees fresh true. Happens-before guaranteed.",
                    "✅ Thread B acquires monitor → sees all writes before Thread A released.",
                    "✅ Thread B reads → atomic value 1 visible (no intermediate state possible)."]
          },
        };

        /* ── Active animated dots ──────────────────────────────── */
        var activeDots = [];
        var stepNotes  = PHASES[0].notes;

        function launchStep(s) {
          var ph = PHASES[s] || PHASES[0];
          activeDots = (ph.dots || []).map(function (d) {
            return { sx:d.sx, sy:d.sy, tx:d.tx, ty:d.ty, x:d.sx, y:d.sy, t:0, color:d.color, row:d.row, stuck:!!d.stuck, stale:!!d.stale };
          });
          stepNotes = ph.notes || PHASES[0].notes;
          status.textContent = stepNotes[0] || "";
        }

        /* ── Draw ───────────────────────────────────────────────── */
        function draw() {
          CVU.clearBg(ctx, LW, LH);

          /* header */
          CVU.roundRect(ctx, MARGIN_LEFT, 0, LW - MARGIN_LEFT * 2, HEADER_H, 6, C.card, C.border, 1);
          CVU.text(ctx, "Java Memory Model — Visibility & Happens-Before", LW / 2, 22, C.text, 12, "center", "600");

          /* rows */
          ROWS.forEach(function (row, r) {
            var ry = rowY(r);
            var rh = ROW_H - 4;

            /* row bg */
            CVU.roundRect(ctx, MARGIN_LEFT, ry + 2, LW - MARGIN_LEFT * 2, rh, 6, C.card, row.color + "44", 1.5);

            /* row label */
            CVU.roundRect(ctx, MARGIN_LEFT + 4, ry + 6, 90, 20, 4, row.color + "33", row.color, 1);
            CVU.text(ctx, row.label, MARGIN_LEFT + 49, ry + 19, row.color, 10, "center", "700");

            /* Thread A box */
            var ayc = ry + ROW_H / 2;
            CVU.roundRect(ctx, COL_A, ayc - BOX_H / 2, BOX_W, BOX_H, 6, "#1e2a1e", C.green, 1.2);
            CVU.text(ctx, "Thread A", COL_A + BOX_W / 2, ayc - 8, C.green, 10, "center", "700");
            CVU.text(ctx, r === 0 ? "flag = true" : r === 3 ? "CAS(0→1)" : "write flag", COL_A + BOX_W / 2, ayc + 8, C.text, 9, "center");

            /* Main memory box */
            var mx = COL_MEM, myc = ry + ROW_H / 2;
            CVU.roundRect(ctx, mx, myc - BOX_H / 2, BOX_W, BOX_H, 6, "#1e1e2e", C.blue, 1.2);
            CVU.text(ctx, "Main Memory", mx + BOX_W / 2, myc - 8, C.blue, 10, "center", "700");
            CVU.text(ctx, r === 0 && step >= 2 ? "flag=false (stale!)" : "flag = ?", mx + BOX_W / 2, myc + 8, r === 0 && step >= 2 ? C.red : C.gray, 9, "center");

            /* Thread B box */
            var byc = ry + ROW_H / 2;
            var bLabel = (r === 0 && step >= 3) ? "reads FALSE ❌" : step >= 3 ? "reads TRUE ✅" : "reads flag";
            var bColor = (r === 0 && step >= 3) ? C.red : step >= 3 ? C.green : C.gray;
            CVU.roundRect(ctx, COL_B, byc - BOX_H / 2, BOX_W, BOX_H, 6, "#1e2a2e", C.blue, 1.2);
            CVU.text(ctx, "Thread B", COL_B + BOX_W / 2, byc - 8, C.blue, 10, "center", "700");
            CVU.text(ctx, bLabel, COL_B + BOX_W / 2, byc + 8, bColor, 9, "center");

            /* CPU cache label (NO-SYNC) */
            if (r === 0) {
              var cacheX = COL_A + BOX_W + 4;
              CVU.roundRect(ctx, cacheX, ayc - 24, 72, 20, 4, C.red + "22", C.red + "88", 1);
              CVU.text(ctx, "CPU Cache", cacheX + 36, ayc - 10, C.red, 8, "center");
            }

            /* row description */
            CVU.text(ctx, row.desc, LW / 2, ry + rh - 6, C.gray, 8, "center");
          });

          /* animated dots */
          activeDots.forEach(function (d) {
            if (d.t < 1) d.t = Math.min(d.t + 0.035, 1);
            var ease = 1 - Math.pow(1 - d.t, 3);
            d.x = d.sx + (d.tx - d.sx) * ease;
            d.y = d.sy + (d.ty - d.sy) * ease;
            CVU.dot(ctx, d.x, d.y, 6, d.stale ? C.red : d.color);
            if (d.stale) {
              /* red cross */
              ctx.strokeStyle = C.red;
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(d.x - 5, d.y - 5); ctx.lineTo(d.x + 5, d.y + 5);
              ctx.moveTo(d.x + 5, d.y - 5); ctx.lineTo(d.x - 5, d.y + 5);
              ctx.stroke();
            }
          });

          /* step indicator */
          var steps = ["Idle", "A writes", "Cache/Memory", "B reads"];
          steps.forEach(function (s, i) {
            var px = MARGIN_LEFT + 100 + i * 90;
            var active = (i === step || (step > 3 && i === 3));
            CVU.roundRect(ctx, px, LH - 26, 80, 18, 4, active ? steps[i] === "A writes" ? C.green + "55" : C.blue + "44" : C.card, active ? C.blue : C.border, 1);
            CVU.text(ctx, s, px + 40, LH - 13, active ? C.text : C.gray, 9, "center");
          });
        }

        function tick() {
          draw();
          raf = requestAnimationFrame(tick);
        }
        tick();

        /* ── Controls ───────────────────────────────────────────── */
        var playing = false, playInterval = null;

        function doStep() {
          step = (step + 1) % 4;
          launchStep(step);
          status.textContent = stepNotes[0] || "";
        }

        btnStep.addEventListener("click", doStep);

        btnPlay.addEventListener("click", function () {
          if (playing) {
            clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          } else {
            playing = true; btnPlay.textContent = "⏸ Pause";
            playInterval = setInterval(function () {
              doStep();
              if (step === 0) { clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play"; }
            }, 1800);
          }
        });

        btnReset.addEventListener("click", function () {
          clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          step = 0; activeDots = []; stepNotes = PHASES[0].notes;
          status.textContent = "Step through or press Play to see JMM visibility in action.";
        });

        status.textContent = "Step through or press Play to see JMM visibility in action.";
      },

      flow: {
        title: "JMM — Happens-Before Chain",
        caption: "Every HB edge guarantees visibility. Missing edges = potential data race.",
        nodes: [
          { id: "write",  label: "Thread A: write x=1", hint: "Action on Thread A" },
          { id: "vwrite", label: "volatile write / unlock / start()", hint: "Establishes happens-before edge" },
          { id: "vread",  label: "volatile read / lock / join()", hint: "Thread B synchronizes here" },
          { id: "read",   label: "Thread B: read x", hint: "Sees x=1 due to HB chain" },
        ],
        steps: [
          { path: ["write"], label: "1 · Thread A writes x = 1", detail: "This action is in Thread A's program order. Other threads may not see it yet without a synchronization action." },
          { path: ["write", "vwrite"], label: "2 · Thread A: volatile write / unlock / Thread.start()", detail: "These actions create a happens-before edge. volatile write → any subsequent volatile read. unlock(m) → any subsequent lock(m)." },
          { path: ["vwrite", "vread"], label: "3 · Cross-thread HB edge established", detail: "If Thread B observes the result of the synchronization action (reads the volatile, acquires the lock, calls join()), the HB edge crosses threads." },
          { path: ["vread", "read"], label: "4 · Thread B: read x — sees x = 1", detail: "Because HB is transitive: write HB vwrite HB vread HB read. Thread B is guaranteed to see x=1. Without HB chain: stale cached value possible." },
        ]
      },

      architecture: {
        title: "JMM — Visibility Mechanisms",
        caption: "How each synchronization mechanism creates happens-before edges",
        lanes: [
          {
            label: "Visibility Problem",
            hint: "Why threads see stale values",
            nodes: [
              { id: "cpu-cache", label: "CPU Cache / Store Buffer", badge: "L1/L2/L3", hint: "Modern CPUs buffer writes in store buffers before committing to main memory. Other CPUs may not see these writes immediately." },
              { id: "reorder",   label: "Compiler/CPU Reordering", badge: "optimization", hint: "JIT and CPU may reorder independent instructions. load(a); store(b) may execute as store(b); load(a) if they appear independent." },
              { id: "visibility",label: "Stale Value Problem",     badge: "no sync", hint: "Thread B reads cached value from its own L1 — may be old. No JMM guarantee without synchronization action." },
            ]
          },
          {
            label: "volatile Solution",
            hint: "Cheapest fix for visibility",
            nodes: [
              { id: "vol-write", label: "volatile write", badge: "StoreLoad fence", hint: "JMM requires: StoreStore + StoreLoad barrier before/after. All preceding stores visible to subsequent volatile reads. ~40 CPU cycles on x86." },
              { id: "vol-read",  label: "volatile read",  badge: "LoadLoad fence",  hint: "JMM requires: LoadLoad + LoadStore barrier. Cannot read a stale cached value — forces reload from memory subsystem." },
              { id: "vol-limit", label: "No atomicity",   badge: "WARNING",         hint: "volatile int x; x++ = read-increment-write (3 ops). STILL a race condition! Use AtomicInteger for compound ops." },
            ]
          },
          {
            label: "synchronized / ReentrantLock",
            hint: "Full JMM guarantees",
            nodes: [
              { id: "mon-enter", label: "monitorenter / lock()", badge: "LoadLoad fence",  hint: "Acquiring a monitor: all loads after this see all stores before the corresponding monitorexit." },
              { id: "mon-exit",  label: "monitorexit / unlock()", badge: "StoreLoad fence", hint: "Releasing a monitor: all stores before exit are visible to any thread that subsequently acquires this monitor." },
              { id: "mon-all3",  label: "Fixes all 3 JMM problems", badge: "visibility+atomicity+ordering", hint: "synchronized fixes visibility (HB), atomicity (only one thread in block), and ordering (no reordering across acquire/release)." },
            ]
          },
          {
            label: "AtomicXxx / VarHandle",
            hint: "Lock-free with JMM control",
            nodes: [
              { id: "cas",       label: "compareAndSet (CAS)",    badge: "x86: LOCK CMPXCHG", hint: "Single atomic instruction. Both read and write happen atomically at hardware level. Used by all java.util.concurrent classes internally." },
              { id: "longadd",   label: "LongAdder (striped)",    badge: "low contention",    hint: "Multiple cells, one per CPU. Threads increment own cell. sum() combines. Better than AtomicLong under high contention." },
              { id: "varhandle", label: "VarHandle acquire/release", badge: "Java 9+",        hint: "setRelease: cheaper than volatile write (no StoreLoad). getAcquire: cheaper than volatile read. Used for lock-free queue heads/tails." },
            ]
          }
        ],
        links: [
          { from: "cpu-cache", to: "vol-write",  label: "volatile flushes store buffer",   type: "sync" },
          { from: "cpu-cache", to: "mon-exit",   label: "monitorexit flushes all stores",   type: "sync" },
          { from: "vol-limit", to: "cas",        label: "compound ops need CAS",            type: "sync" },
          { from: "cas",       to: "varhandle",  label: "VarHandle exposes CAS directly",   type: "async" },
          { from: "mon-all3",  to: "vol-write",  label: "volatile is lighter alternative",  type: "async" },
        ]
      }
    }
  ]);
})();
