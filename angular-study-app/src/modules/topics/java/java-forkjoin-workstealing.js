(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([
    {
      id: "java-forkjoin-workstealing",
      area: "java",
      title: "ForkJoinPool & Work Stealing",
      tag: "Concurrency",
      tags: ["forkjoin", "work-stealing", "parallel", "recursion", "mergesort", "commonpool", "recursiveTask", "cpu-bound"],

      concept:
`**L1 (30s ELI5):** Imagine 4 workers assembling furniture. One worker finishes their pile and steals from the back of a busy worker's pile. Nobody sits idle. That's work-stealing.

**L2 (2min core):** ForkJoinPool gives each worker thread its own **deque** (double-ended queue). Workers push/pop their own tasks from the **head** (LIFO — cache-friendly). Idle workers steal from the **tail** of other workers' deques (FIFO steal). This gives good cache locality for the worker doing most of the work AND load balancing via stealing.

**RecursiveTask<V>** returns a value; **RecursiveAction** is void. Pattern: if small enough, compute directly; else fork(left) + compute(right) + join(left).

**L3 (10min edge cases):** ForkJoinPool.commonPool() is used by parallelStream(), Arrays.parallelSort(), CompletableFuture.supplyAsync() by default. Blocking tasks in commonPool → starvation: commonPool has N_CORES threads; one blocking task consumes a thread while others wait. Fix: use ManagedBlocker or a custom pool. Nested forks: task can fork subtasks, which can fork further — pool size stays N_CORES but queues grow.

**L4 (deep):** Work-stealing protocol: worker A has task queue [T1,T2,T3,T4] (T1 is HEAD). A pops T1 from head (LIFO). Idle worker B steals T4 from A's TAIL (FIFO). Lock-free: uses CAS on the tail pointer — stealer contends only on the tail while owner contends only on the head — minimal contention. Deque is typically a fixed circular array.`,

      why:
"ForkJoinPool is the backbone of parallelStream() and CompletableFuture — knowing when NOT to use commonPool (blocking I/O, long-running tasks) prevents thread starvation in production. Work-stealing is the algorithm that makes parallel divide-and-conquer practical.",

      example: {
        language: "java",
        code:
`import java.util.concurrent.*;

// ─── RecursiveTask: parallel sum ─────────────────────────────────────────────
class SumTask extends RecursiveTask<Long> {
    private final int[] arr;
    private final int lo, hi;
    private static final int THRESHOLD = 1_000;

    SumTask(int[] arr, int lo, int hi) { this.arr=arr; this.lo=lo; this.hi=hi; }

    @Override
    protected Long compute() {
        if (hi - lo <= THRESHOLD) {
            long sum = 0;
            for (int i = lo; i < hi; i++) sum += arr[i];
            return sum;                           // base case: sequential
        }
        int mid = (lo + hi) >>> 1;
        SumTask left  = new SumTask(arr, lo, mid);
        SumTask right = new SumTask(arr, mid, hi);
        left.fork();                              // push left to THIS thread's deque
        long rightResult = right.compute();       // compute right inline (stays cache-warm)
        long leftResult  = left.join();           // steal or complete left
        return leftResult + rightResult;
    }
}

// ─── Usage: custom pool vs commonPool ────────────────────────────────────────
ForkJoinPool pool = new ForkJoinPool(4);          // custom pool: 4 worker threads
long total = pool.invoke(new SumTask(data, 0, data.length));

// commonPool (default for parallelStream):
long total2 = Arrays.stream(data).parallel().sum();   // uses commonPool internally

// ─── ManagedBlocker: blocking inside FJP without starvation ─────────────────
ForkJoinPool.ManagedBlocker blocker = new ForkJoinPool.ManagedBlocker() {
    volatile boolean done = false;
    public boolean block() throws InterruptedException {
        if (!done) { Thread.sleep(50); done = true; }   // blocking op
        return true;
    }
    public boolean isReleasable() { return done; }
};
ForkJoinPool.managedBlock(blocker);  // FJP may add a compensating thread during block`,
        notes: "Always fork the LEFT subproblem and compute the RIGHT inline — the right half uses the current thread's cache, reducing L1 misses."
      },

      interview: [
        {
          question: "How does work-stealing minimize contention?",
          answer:
"Each worker has its own deque. The **owner** pushes/pops from the **head** (LIFO). **Stealers** take from the **tail** (FIFO). Owner and stealers operate on opposite ends — no contention 99% of the time. Only when a stealer races another stealer on the tail is a CAS needed. This is far cheaper than a shared central queue with locks.",
          followUps: ["Why LIFO for local, FIFO for steal?", "What happens if a worker's deque is empty?"]
        },
        {
          question: "When should you NOT use ForkJoinPool.commonPool()?",
          answer:
"For **blocking I/O** or long-running tasks. commonPool has Runtime.getRuntime().availableProcessors() - 1 threads. If one thread blocks (JDBC, HTTP), it consumes a thread permanently — other tasks starve. Use a **dedicated ForkJoinPool** or wrap in **ForkJoinPool.ManagedBlocker** to let FJP add a compensating thread. Spring's @Async usually uses a separate thread pool for this reason.",
          followUps: ["What is ManagedBlocker?", "How does CompletableFuture.supplyAsync differ from submit?"]
        },
        {
          question: "RecursiveTask vs RecursiveAction — when to use which?",
          answer:
"**RecursiveTask<V>**: produces a value — use for parallel computations (sum, search, merge sort). Override `compute()` to return V. **RecursiveAction**: void — use for parallel side-effecting operations (filling an array, parallel sort in-place). Both support fork/join mechanics identically.",
          followUps: ["Can RecursiveTask throw checked exceptions?", "How do you handle exceptions in fork/join?"]
        }
      ],

      gotchas: [
        "Calling join() before forking both subproblems: fork(left); join(left); fork(right) — sequential! fork both THEN join.",
        "Using commonPool for blocking I/O: threads exhaust → deadlock. FJP tries to add compensation threads up to MAX_CAP but may still starve.",
        "Threshold too small: recursive overhead dominates. Threshold too large: no parallelism. Rule of thumb: threshold = N / (10 × parallelism).",
        "ForkJoinTask.get() (Future interface) is inefficient in FJP — uses a heavyweight blocking mechanism. Prefer .join() inside FJP tasks.",
        "Thread-local state breaks inside FJP: tasks may run on different threads than parent. ThreadLocal in parent is NOT visible to forked child tasks.",
        "ManagedBlocker.block() is called under a lock — keep it simple. Complex logic inside block() can deadlock."
      ],

      tradeoffs: {
        pros: [
          "Near-linear speedup for CPU-bound divide-and-conquer on multi-core machines.",
          "Work-stealing: near-zero overhead when work is balanced (no stealing needed).",
          "commonPool: no setup — ideal for one-off parallelStream() operations."
        ],
        cons: [
          "Blocking inside commonPool starves other parallel operations globally.",
          "Overhead of forking: only worth it for tasks > ~1µs of work.",
          "Debugging: random thread assignment makes stack traces confusing."
        ],
        when: "**CPU-bound recursive algorithms**: ForkJoinPool. **I/O-bound**: virtual threads or async HTTP client. **One-off parallel collection ops**: parallelStream() with default commonPool."
      },

      visual: function (mount) {
        var CVU = window.CVU;
        if (!CVU) { mount.textContent = "CVU not loaded"; return; }
        var C = CVU.C;

        /* ── Controls ─────────────────────────────────────────── */
        var ctrl = CVU.makeCtrlRow(mount);
        var btnPlay   = CVU.makeBtn("▶ Play",     C.green);
        var btnStep   = CVU.makeBtn("⏭ Step",     C.blue);
        var btnReset  = CVU.makeBtn("↺ Reset",    C.gray);
        ctrl.appendChild(btnPlay);
        ctrl.appendChild(btnStep);
        ctrl.appendChild(btnReset);

        var W = 720, H = 490;
        var canvas = CVU.makeCanvas(mount, W, H);
        var ctx = canvas.getContext("2d");
        var LW = canvas._logicalWidth;
        var LH = canvas._logicalHeight;

        var status = CVU.makeStatus(mount);

        /* ── Layout ─────────────────────────────────────────────── */
        var HEADER_H = 34;
        var ROWS = [
          { label: "DEQUES & WORK STEALING",    color: C.orange, desc: "Owner: pop from HEAD (LIFO). Stealer: steal from TAIL (FIFO). Opposite ends → no contention." },
          { label: "FORK / JOIN TREE",          color: C.blue,   desc: "fork() splits task to own deque. join() waits or helps run it. Divide-and-conquer becomes parallel." },
          { label: "COMMONPOOL / STREAMS",      color: C.green,  desc: "parallelStream() uses ForkJoinPool.commonPool(). Avoid blocking I/O — use ManagedBlocker or custom pool." },
        ];
        var ROW_H  = (LH - HEADER_H) / ROWS.length;
        var ML     = 12;

        /* ── Animation state ─────────────────────────────────────── */
        var step = 0;
        var STEPS = 5;
        var animDots  = []; // { x, y, tx, ty, t, color, r }

        var NOTES = [
          "Each worker thread has its own deque. Tasks pushed/popped from HEAD (LIFO = cache-friendly local work).",
          "Worker 0 has tasks T1–T4. Worker 1 is idle → steals T4 from Worker 0's TAIL (FIFO steal, no contention).",
          "Fork/Join tree: compute() forks left subtask, computes right inline, then joins left to combine results.",
          "parallelStream().map() → ForkJoinPool.commonPool() splits work across N_CORES-1 threads automatically.",
          "Complete: all tasks done. Work-stealing kept all workers busy with minimal contention."
        ];

        /* task boxes for row 0 */
        var TW = 36, TH = 28;
        function taskX(idx) { return ML + 40 + idx * (TW + 5); }
        function rowY(r) { return HEADER_H + r * ROW_H; }

        /* worker slots row 0 */
        var W0_X = ML + 18, W1_X = LW / 2 + 10;
        var tasks0 = ["T1","T2","T3","T4"];
        var tasks1 = [];
        var stolen = false;

        /* fork/join tree row 1 */
        var treeNodes = [
          { label:"sum(0,N)",    x:LW/2,      y:rowY(1)+22,  fork:false, done:false },
          { label:"sum(0,N/2)",  x:LW/2-100,  y:rowY(1)+56,  fork:false, done:false },
          { label:"sum(N/2,N)",  x:LW/2+100,  y:rowY(1)+56,  fork:false, done:false },
          { label:"sum(0,N/4)", x:LW/2-150,  y:rowY(1)+92,  fork:false, done:false },
          { label:"sum(N/4,N/2)",x:LW/2-50,  y:rowY(1)+92,  fork:false, done:false },
          { label:"sum(N/2,3N/4)",x:LW/2+50, y:rowY(1)+92,  fork:false, done:false },
          { label:"sum(3N/4,N)", x:LW/2+150, y:rowY(1)+92,  fork:false, done:false },
        ];
        var treeEdges = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6]];
        var treeStep = 0; // 0=root 1=level1 2=level2 3=join 4=done

        /* commonpool row 2 */
        var streamTasks = ["T0","T1","T2","T3","T4","T5","T6","T7"];
        var streamWorkers = [
          { label:"Worker 0", tasks:[], done:[] },
          { label:"Worker 1", tasks:[], done:[] },
          { label:"Worker 2", tasks:[], done:[] },
          { label:"Worker 3", tasks:[], done:[] },
        ];
        var streamStep = 0;

        /* ── Draw ───────────────────────────────────────────────── */
        function draw() {
          CVU.clearBg(ctx, LW, LH);

          /* header */
          CVU.roundRect(ctx, ML, 0, LW - ML * 2, HEADER_H, 6, C.card, C.border, 1);
          CVU.text(ctx, "ForkJoinPool — Work Stealing, Fork/Join Tree, CommonPool", LW / 2, 21, C.text, 11, "center", "600");

          ROWS.forEach(function (row, r) {
            var ry = rowY(r);
            var rh = ROW_H - 4;
            CVU.roundRect(ctx, ML, ry + 2, LW - ML * 2, rh, 6, C.card, row.color + "44", 1.5);
            CVU.roundRect(ctx, ML + 4, ry + 6, 160, 18, 4, row.color + "33", row.color, 1);
            CVU.text(ctx, row.label, ML + 84, ry + 17, row.color, 9, "center", "700");
            CVU.text(ctx, row.desc, LW / 2, ry + rh - 5, C.gray, 7.5, "center");
          });

          /* ── ROW 0: Deques & Work Stealing ─────────────────────── */
          var r0y = rowY(0);
          var workerY = r0y + ROW_H / 2 - 14;

          /* Worker 0 */
          CVU.roundRect(ctx, W0_X, workerY - 4, 38, 22, 4, "#1e2820", C.orange, 1);
          CVU.text(ctx, "W0", W0_X + 19, workerY + 10, C.orange, 9, "center", "700");

          tasks0.forEach(function (t, i) {
            var tx = W0_X + 46 + i * (TW + 4);
            var isHead = i === 0, isTail = i === tasks0.length - 1;
            var col = isHead ? C.blue : isTail ? C.red : C.text;
            CVU.roundRect(ctx, tx, workerY - 2, TW, TH, 4, isHead ? "#1a2030" : isTail ? "#301a1a" : C.card, col, 1.5);
            CVU.text(ctx, t, tx + TW / 2, workerY + TH / 2 + 4, col, 9, "center", "700");
          });
          if (tasks0.length > 0) {
            CVU.text(ctx, "HEAD →", W0_X + 44, workerY - 10, C.blue, 8, "left");
            CVU.text(ctx, "← TAIL", W0_X + 44 + (tasks0.length - 1) * (TW + 4), workerY - 10, C.red, 8, "left");
          }

          /* Worker 1 */
          var w1x = W1_X;
          CVU.roundRect(ctx, w1x, workerY - 4, 38, 22, 4, "#1e2820", C.orange, 1);
          CVU.text(ctx, "W1", w1x + 19, workerY + 10, C.orange, 9, "center", "700");

          if (stolen && tasks1.length > 0) {
            tasks1.forEach(function (t, i) {
              CVU.roundRect(ctx, w1x + 46 + i * (TW + 4), workerY - 2, TW, TH, 4, "#2a2010", C.orange, 1.5);
              CVU.text(ctx, t, w1x + 46 + i * (TW + 4) + TW / 2, workerY + TH / 2 + 4, C.orange, 9, "center", "700");
            });
          } else if (!stolen) {
            CVU.text(ctx, "IDLE — looking for work...", w1x + 50, workerY + 12, C.gray, 8.5, "left");
          }

          /* steal arrow */
          if (step >= 2 && tasks0.length > 1) {
            var tailX = W0_X + 46 + (tasks0.length) * (TW + 4) - TW / 2;
            CVU.arrow(ctx, tailX + 10, workerY + TH / 2, w1x + 40, workerY + TH / 2, C.orange, 2, true);
            CVU.text(ctx, "STEAL (tail)", (tailX + w1x) / 2 + 20, workerY + TH / 2 - 8, C.orange, 8, "center");
          }

          /* animated dots row 0 */
          animDots.filter(function (d) { return d.row === 0; }).forEach(function (d) {
            d.t = Math.min(d.t + 0.04, 1);
            var ease = 1 - Math.pow(1 - d.t, 3);
            d.x = d.sx + (d.tx - d.sx) * ease;
            d.y = d.sy + (d.ty - d.sy) * ease;
            CVU.dot(ctx, d.x, d.y, 5, d.color);
          });

          /* ── ROW 1: Fork/Join Tree ──────────────────────────────── */
          var r1y = rowY(1);
          treeEdges.forEach(function (e) {
            var from = treeNodes[e[0]], to = treeNodes[e[1]];
            var visible = (e[0] === 0 && treeStep >= 1) || (e[0] === 1 && treeStep >= 2) || (e[0] === 2 && treeStep >= 2);
            if (visible) {
              var col = treeStep >= 3 ? C.green : C.blue;
              ctx.strokeStyle = col + "88";
              ctx.lineWidth = 1.5;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(from.x, from.y + 10);
              ctx.lineTo(to.x, to.y - 10);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          });

          treeNodes.forEach(function (n, i) {
            var show = (i === 0) || (i <= 2 && treeStep >= 1) || (i >= 3 && treeStep >= 2);
            if (!show) return;
            var done = treeStep >= 3 && i > 0 || treeStep >= 4;
            var col = done ? C.green : C.blue;
            var bg  = done ? "#1a2e1a" : "#1a1e2e";
            CVU.roundRect(ctx, n.x - 48, n.y - 12, 96, 22, 4, bg, col, done ? 2 : 1.2);
            CVU.text(ctx, n.label, n.x, n.y + 5, col, 8.5, "center", done ? "700" : "normal");
          });

          if (treeStep >= 3) {
            CVU.text(ctx, "join() ← combine results", LW / 2, rowY(1) + 80, C.green, 9, "center", "700");
          }

          /* ── ROW 2: CommonPool / Streams ───────────────────────── */
          var r2y = rowY(2);
          var wSlotW = (LW - ML * 2 - 24) / streamWorkers.length;
          streamWorkers.forEach(function (w, wi) {
            var wx = ML + 12 + wi * wSlotW;
            var wy = r2y + 30;
            CVU.roundRect(ctx, wx, wy, wSlotW - 8, ROW_H - 44, 5, C.card, C.green + "66", 1);
            CVU.text(ctx, w.label, wx + (wSlotW - 8) / 2, wy + 14, C.green, 9, "center", "700");
            w.done.forEach(function (t, ti) {
              CVU.roundRect(ctx, wx + 6 + ti * 22, wy + 22, 18, 18, 3, "#1a2e1a", C.green, 1.5);
              CVU.text(ctx, t, wx + 6 + ti * 22 + 9, wy + 34, C.green, 7, "center", "700");
            });
            w.tasks.forEach(function (t, ti) {
              CVU.roundRect(ctx, wx + 6 + ti * 22, wy + 44, 18, 18, 3, "#1a1e2e", C.blue, 1);
              CVU.text(ctx, t, wx + 6 + ti * 22 + 9, wy + 56, C.blue, 7, "center");
            });
          });

          if (streamStep === 0) {
            CVU.text(ctx, "parallelStream() not started yet", LW / 2, r2y + ROW_H / 2, C.gray, 9, "center");
          }

          /* step indicator bottom */
          var stepLabels = ["Idle","W0 tasks","W1 steals","Tree fork","Tree join","All done"];
          stepLabels.forEach(function (s, i) {
            var px = ML + 50 + i * 95;
            var active = i === step;
            CVU.roundRect(ctx, px, LH - 22, 86, 16, 4, active ? C.blue + "44" : C.card, active ? C.blue : C.border, 1);
            CVU.text(ctx, s, px + 43, LH - 10, active ? C.text : C.gray, 8, "center");
          });
        }

        function applyStep(s) {
          switch (s) {
            case 0:
              tasks0 = ["T1","T2","T3","T4"]; tasks1 = []; stolen = false;
              treeStep = 0; streamStep = 0;
              streamWorkers.forEach(function (w) { w.tasks = []; w.done = []; });
              status.textContent = NOTES[0]; break;
            case 1:
              status.textContent = NOTES[0]; break;
            case 2:
              stolen = true; tasks1 = ["T4"]; tasks0 = ["T1","T2","T3"];
              status.textContent = NOTES[1]; break;
            case 3:
              treeStep = 1;
              status.textContent = NOTES[2]; break;
            case 4:
              treeStep = 2;
              streamStep = 1;
              streamWorkers[0].tasks = ["T0","T4"];
              streamWorkers[1].tasks = ["T1","T5"];
              streamWorkers[2].tasks = ["T2","T6"];
              streamWorkers[3].tasks = ["T3","T7"];
              status.textContent = NOTES[3]; break;
            case 5:
              treeStep = 4;
              streamWorkers.forEach(function (w) { w.done = w.tasks.slice(); w.tasks = []; });
              status.textContent = NOTES[4]; break;
          }
        }

        var raf = null;
        function tick() { draw(); raf = requestAnimationFrame(tick); }
        tick();

        applyStep(0);

        var playing = false, playInterval = null;

        btnStep.addEventListener("click", function () {
          step = Math.min(step + 1, STEPS);
          applyStep(step);
        });

        btnPlay.addEventListener("click", function () {
          if (playing) {
            clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          } else {
            playing = true; btnPlay.textContent = "⏸ Pause";
            playInterval = setInterval(function () {
              step++;
              if (step > STEPS) { step = STEPS; clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play"; return; }
              applyStep(step);
            }, 1600);
          }
        });

        btnReset.addEventListener("click", function () {
          clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          step = 0; animDots = [];
          applyStep(0);
        });
      },

      flow: {
        title: "ForkJoinPool — Task Splitting & Work Stealing",
        caption: "Divide-and-conquer: fork splits, join combines. Idle workers steal from tail of busy workers.",
        nodes: [
          { id: "submit",  label: "ForkJoinPool.invoke(task)", hint: "Submit root task to the pool" },
          { id: "check",   label: "Problem size > threshold?",  hint: "Base case check — sequential if small enough" },
          { id: "fork",    label: "left.fork() — push to deque HEAD", hint: "Left subtask added to own deque — may be stolen" },
          { id: "compute", label: "right.compute() — inline", hint: "Right half runs in current thread — stays cache-warm" },
          { id: "steal",   label: "Idle worker steals from TAIL", hint: "Work-stealing: FIFO from tail — no head contention" },
          { id: "join",    label: "left.join() — wait or help", hint: "If left not done, current thread helps execute it" },
          { id: "combine", label: "combine(left, right) → return", hint: "Merge results up the recursion tree" },
        ],
        steps: [
          { path: ["submit"], label: "1 · Root task submitted", detail: "ForkJoinPool.invoke() or submit() queues root task." },
          { path: ["submit", "check"], label: "2 · Size check — base case?", detail: "If hi-lo <= THRESHOLD: compute sequentially and return. Avoids fork overhead for tiny tasks." },
          { path: ["check", "fork"], label: "3 · Fork left to own deque", detail: "left.fork() pushes left subtask onto THIS thread's deque HEAD. Any idle thread may steal it from the TAIL." },
          { path: ["fork", "compute"], label: "4 · Compute right inline", detail: "Right half runs in current thread — no fork overhead. Best practice: always compute one half inline." },
          { path: ["fork", "steal"], label: "5 · Idle worker steals left task", detail: "Worker B checks own deque — empty. Picks victim worker A. CAS on A's TAIL pointer. Steals left task." },
          { path: ["compute", "join"], label: "6 · join() — wait or help-run", detail: "left.join() checks if left is done. If not: current thread helps by running OTHER pending tasks until left completes. Never just blocks." },
          { path: ["join", "combine"], label: "7 · Combine and return up tree", detail: "Both halves complete. Combine results. Return to parent's join()." },
        ]
      },

      architecture: {
        title: "ForkJoinPool Internal Architecture",
        caption: "Work queues, stealing protocol, and ManagedBlocker for blocking ops",
        lanes: [
          {
            label: "Work Queues (per thread)",
            hint: "Each thread has its own double-ended deque",
            nodes: [
              { id: "q0", label: "Worker 0 Deque [T1,T2,T3,T4]", badge: "HEAD←own  TAIL→steal", hint: "Worker 0 pushes/pops from HEAD (LIFO). Stealer takes from TAIL (FIFO). Separate ends = no contention." },
              { id: "q1", label: "Worker 1 Deque [T5,T6]",         badge: "idle → steals",       hint: "Worker 1 runs own tasks first. When idle: scans other workers' deques, steals from tail with CAS." },
              { id: "cas-steal", label: "CAS on tail pointer",      badge: "lock-free",           hint: "ForkJoinTask uses AtomicReference on the tail. Stealer CAS: if tail hasn't changed, take it. Racing stealers retry." },
            ]
          },
          {
            label: "Scheduling Modes",
            hint: "FIFO vs LIFO affects cache efficiency",
            nodes: [
              { id: "lifo",   label: "LIFO pop (owner)",          badge: "cache-warm",   hint: "Owner runs most recently pushed task — still hot in L1/L2 cache. Ideal for recursive tree work." },
              { id: "fifo",   label: "FIFO steal (idle worker)",  badge: "load balance", hint: "Stealer takes oldest task (root of subtree) — biggest chunk of work. Avoids stealing many tiny leaf tasks." },
              { id: "async",  label: "asyncMode=true (FIFO own)", badge: "event loops",  hint: "For producer-consumer style (not fork/join): workers process in FIFO order. Useful for async pipelines." },
            ]
          },
          {
            label: "CommonPool & Blocking",
            hint: "Shared pool risks and ManagedBlocker",
            nodes: [
              { id: "common",  label: "ForkJoinPool.commonPool()",  badge: "N_CORES-1 threads", hint: "Shared globally. parallelStream(), Arrays.parallelSort(), CompletableFuture.supplyAsync() use it by default. Max parallelism = availableProcessors() - 1." },
              { id: "blocking",label: "Blocking inside commonPool", badge: "DANGER: starvation", hint: "A blocking task pins an OS thread. commonPool cannot exceed max parallelism (no compensation). All other tasks wait." },
              { id: "managed", label: "ManagedBlocker",             badge: "safe blocking",     hint: "ForkJoinPool.managedBlock(blocker): if thread is about to block and pool is full, FJP adds a COMPENSATION thread. Prevents starvation." },
            ]
          },
          {
            label: "When to Use ForkJoinPool",
            hint: "Right tool for right job",
            nodes: [
              { id: "cpu-bound",    label: "CPU-bound recursive work",    badge: "GOOD", hint: "Parallel merge sort, parallel sum, parallel tree traversal — all benefit from recursive splitting." },
              { id: "io-bound",     label: "I/O-bound tasks",              badge: "BAD",  hint: "Use virtual threads (Java 21) or reactive WebFlux. FJP threads block = wasted OS thread during I/O wait." },
              { id: "small-tasks",  label: "Very small tasks (< 1µs)",    badge: "BAD",  hint: "Fork overhead (~1µs) dominates actual work. Set threshold high enough for base case to be sequential." },
            ]
          }
        ],
        links: [
          { from: "q0", to: "cas-steal", label: "stealer CAS on tail", type: "async" },
          { from: "lifo", to: "q0", label: "owner pops HEAD", type: "sync" },
          { from: "fifo", to: "cas-steal", label: "stealer takes TAIL", type: "sync" },
          { from: "common", to: "blocking", label: "blocking risks starvation", type: "sync" },
          { from: "blocking", to: "managed", label: "ManagedBlocker prevents it", type: "sync" },
          { from: "cpu-bound", to: "common", label: "parallelStream default", type: "async" },
        ]
      }
    }
  ]);
})();
