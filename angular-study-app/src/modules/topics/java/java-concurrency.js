(function() {
  var topic = {
    id: "java-concurrency",
    area: "java",
    title: "Concurrency: Threads, Executors, Locks & Synchronizers",
    tag: "Concurrency",
    tags: ["threads", "executor", "loom", "virtual threads", "reentrantlock", "semaphore", "countdownlatch", "cyclic barrier", "concurrency"],

    flow: {
      title: 'Thread Lifecycle — NEW → RUNNABLE → RUNNING → BLOCKED → TERMINATED',
      caption: 'Click any stage or press Play to animate the full lifecycle',
      nodes: [
        { id: 'new',        label: 'NEW',              hint: 'Thread object created, no OS thread yet' },
        { id: 'runnable',   label: 'RUNNABLE',          hint: 'Ready in run queue, waiting for CPU' },
        { id: 'running',    label: 'RUNNING',           hint: 'Executing on CPU (carrier thread)' },
        { id: 'blocked',    label: 'BLOCKED / WAITING', hint: 'Waiting for lock, I/O, or sleep' },
        { id: 'terminated', label: 'TERMINATED',        hint: 'run() returned or exception thrown' },
      ],
      steps: [
        { path: ['new'],           label: 'new Thread(task) — object in heap, no OS thread', detail: 'Platform thread: JVM creates a Thread object but NO OS thread yet. Virtual thread: same — just a cheap JVM object. 10,000 virtual thread objects cost ~1MB total. Same as 1 platform thread stack.' },
        { path: ['new','runnable'],label: 'thread.start() — enters run queue', detail: 'Platform: OS allocates ~1MB stack, adds to OS scheduler queue. Virtual: JVM adds to ForkJoinPool work-stealing queue. No OS thread allocated until it actually runs.' },
        { path: ['runnable','running'], label: 'CPU time slice granted — RUNNING', detail: 'Platform thread: OS picks it, context-switch happens. Virtual thread: JVM "mounts" it onto a carrier OS thread. Your code runs. Both look identical from inside run().' },
        { path: ['running','blocked'], label: 'Blocking I/O or lock wait — KEY DIFFERENCE!', detail: '🔴 Platform thread: OS BLOCKS the entire OS thread. 200 blocked platform threads = 200 wasted OS threads. 🟢 Virtual thread: JVM detects blocking, PARKS the vthread, UNMOUNTS from carrier. Carrier INSTANTLY FREE to run other vthreads!' },
        { path: ['blocked','runnable'], label: 'I/O complete / lock acquired — back to RUNNABLE', detail: 'Platform: OS wakes the blocked OS thread. Virtual: JVM marks the parked vthread runnable again, remounts on any available carrier. Transparent to your code.' },
        { path: ['running','terminated'], label: 'run() returns → TERMINATED', detail: 'Task complete. ExecutorService wraps result in Future/CompletableFuture. Platform thread destroyed or returned to pool. Virtual thread: JVM object collected. Cost: near zero.' },
      ]
    },

    uml: {
      title: 'Virtual Thread I/O — 10,000 Requests with 8 Carrier Threads',
      scenario: 'A database call blocks for 50ms. With virtual threads, 8 OS threads serve thousands simultaneously.',
      actors: [
        { id: 'client',  label: 'Client',   hint: '10,000 HTTP requests' },
        { id: 'exec',    label: 'Executor', hint: 'newVirtualThreadPerTaskExecutor()' },
        { id: 'vt',      label: 'VThread',  hint: 'One per request, ~hundreds of bytes' },
        { id: 'carrier', label: 'Carrier',  hint: 'OS thread (1 of N_CORES)' },
        { id: 'db',      label: 'Database', hint: 'Blocking JDBC — 50ms latency' },
      ],
      messages: [
        { from:'client', to:'exec',   label:'executor.submit(handleRequest)', detail:'Client fires 10,000 requests. Each submit() call is O(1). Executor creates a new virtual thread per task — all 10,000 created instantly.' },
        { from:'exec',   to:'vt',     label:'new VirtualThread(task) — microseconds', detail:'JVM creates virtual thread. Stack is heap-allocated, starts tiny (~hundreds of bytes). Compare: platform thread = ~1MB stack allocated upfront.' },
        { from:'vt',     to:'carrier',label:'JVM mounts vthread on carrier', detail:'JVM ForkJoinPool scheduler picks an idle carrier OS thread and mounts the vthread. Execution begins.' },
        { from:'carrier',to:'db',     label:'executeQuery() — blocking I/O starts', detail:'Code hits a blocking JDBC call. Now we wait 50ms. THIS is the critical moment.', type:'async' },
        { from:'vt',     to:'carrier',label:'⚡ PARK: vthread unmounts — carrier FREE', detail:'JVM intercepts blocking syscall. Saves vthread state to heap. UNMOUNTS it from carrier. Carrier OS thread is IMMEDIATELY available for other work!' },
        { from:'carrier',to:'vt',     label:'Carrier runs 999 other vthreads meanwhile', detail:'8 carriers serve thousands of blocked vthreads. Like async/reactive — but your code is plain blocking!', type:'async' },
        { from:'db',     to:'vt',     label:'DB response → vthread unparked', detail:'NIO selector detects response. JVM marks parked vthread RUNNABLE.', type:'async' },
        { from:'vt',     to:'carrier',label:'Remount on any free carrier — continues', detail:'JVM mounts vthread on available carrier. Execution resumes at exact bytecode. ThreadLocal intact. No callbacks.' },
        { from:'vt',     to:'client', label:'Response returned → Future.complete()', detail:'handleRequest() returns. CompletableFuture completes. Virtual thread discarded.' },
      ]
    },

    architecture: {
      title: 'Java Concurrency — Executors, Locks & Synchronizers Map',
      caption: 'Click any primitive to understand its guarantee, use case, and pitfalls',
      lanes: [
        {
          label: '① Executor Framework',
          hint: 'Thread lifecycle management',
          nodes: [
            { id: 'fixed-pool',   label: 'newFixedThreadPool(n)',          badge: 'bounded threads',   hint: 'Fixed n OS threads. Tasks queued in unbounded LinkedBlockingQueue when busy. Use for CPU-bound work. Problem: queue grows unbounded under load → OOM. Add rejection policy.' },
            { id: 'cached-pool',  label: 'newCachedThreadPool()',          badge: 'dynamic threads',   hint: 'Creates new threads on demand, reuses idle ones (60s TTL). Good for short bursts. Dangerous for sustained load — creates unlimited threads.' },
            { id: 'vt-exec',      label: 'newVirtualThreadPerTaskExecutor',badge: 'Java 21 default',   hint: 'Creates a new virtual thread per task. Submit 10M tasks — fine. No thread pooling needed (virtual threads are too cheap to pool). For I/O-bound services: the answer.' },
            { id: 'fjp',          label: 'ForkJoinPool (work-stealing)',   badge: 'CPU-bound parallel', hint: 'Recursively split tasks (fork), join results. Each thread has own deque; steals from others when idle. Used by parallelStream(), CompletableFuture.supplyAsync(). Only for CPU-bound recursive work.' },
          ]
        },
        {
          label: '② Mutual Exclusion Locks',
          hint: 'Ensure at most one thread in critical section',
          nodes: [
            { id: 'sync',        label: 'synchronized block',             badge: 'JVM intrinsic',      hint: 'Built-in monitor. Reentrant. JVM optimizes: biased locking → thin lock → fat lock. PROBLEM: pins virtual threads during blocking I/O — vthread cannot unmount. Use ReentrantLock instead for virtual threads.' },
            { id: 'rl',          label: 'ReentrantLock',                  badge: 'try/interrupt/timed', hint: 'Same semantics as synchronized but: tryLock(timeout), lockInterruptibly(), lock() + Condition.await() (allows vthread to unmount). Must unlock() in finally. More verbose but more powerful.' },
            { id: 'rwl',         label: 'ReadWriteLock',                  badge: 'read-concurrent',    hint: 'Multiple readers OR one writer. ReadLock: concurrent. WriteLock: exclusive. Writer starvation risk with many readers. Use for read-heavy shared state (caches, config). ReentrantReadWriteLock implementation.' },
            { id: 'stamped',     label: 'StampedLock',                    badge: 'optimistic reads',   hint: 'Three modes: WriteLock, ReadLock, OPTIMISTIC READ (no lock!). Optimistic: read without lock, validate(stamp) to check if write happened. If validation fails, retry with real read lock. Fastest for read-dominant.' },
          ]
        },
        {
          label: '③ Counting Synchronizers',
          hint: 'Coordinate threads by count',
          nodes: [
            { id: 'sem',  label: 'Semaphore(n)',        badge: 'rate limit / pool',   hint: 'n permits. acquire() blocks when 0 permits. release() adds permit. Bounds concurrency: Semaphore(10) = max 10 threads in section. Perfect for connection pools, rate limiting. Not reentrant.' },
            { id: 'cdl',  label: 'CountDownLatch(n)',   badge: 'one-time gate',       hint: 'Threads call await() to wait. n countDown() calls to open. ONE-SHOT: cannot reset. Pattern: start n workers, main thread latch.await() until all done. Or: main thread ready, fire n workers simultaneously.' },
            { id: 'cb',   label: 'CyclicBarrier(n)',    badge: 'reusable rendezvous', hint: 'All n threads call await() — last one trips the barrier. All released together. REUSABLE (unlike CDL). Optional Runnable fires when barrier trips. Use for parallel phase synchronization (game loop, parallel matrix ops).' },
            { id: 'phaser',label: 'Phaser',             badge: 'dynamic phases',      hint: 'Like CyclicBarrier but: dynamic party count (register/deregister), multiple phases, hierarchical phasers. Most powerful but most complex. Use when party count changes between phases.' },
          ]
        },
        {
          label: '④ Atomic & Lock-Free',
          hint: 'CAS-based non-blocking primitives',
          nodes: [
            { id: 'atomic', label: 'AtomicInteger / Long / Ref',  badge: 'CAS single var',    hint: 'Compare-and-swap loop. incrementAndGet(), compareAndSet(expected, update). Lock-free but not wait-free. Spinning CAS under high contention degrades — use LongAdder for high-frequency counters.' },
            { id: 'longadd',label: 'LongAdder / LongAccumulator', badge: 'striped counters',  hint: 'Multiple internal cells, one per CPU. Each thread increments its cell. sum() combines. Faster than AtomicLong under contention. Use for metrics/counters. LongAccumulator for custom combine functions.' },
            { id: 'varhan', label: 'VarHandle',                   badge: 'JMM fine control',  hint: 'Java 9+. Access object fields with volatile/acquire/release/opaque/plain semantics. Replaces Unsafe for JMM-compliant lock-free code. Use for custom data structures requiring memory-order control.' },
            { id: 'vol',    label: 'volatile',                    badge: 'visibility only',   hint: 'volatile ensures write happens-before subsequent reads. NO atomicity for compound ops (check-then-act). Read/write single variable atomically (refs, longs, doubles). Used for stop flags, double-checked locking.' },
          ]
        }
      ],
      links: [
        { from: 'vt-exec',   to: 'rl',      label: 'vthreads need ReentrantLock not synchronized', type: 'sync' },
        { from: 'fixed-pool',to: 'sem',     label: 'combine: pool + semaphore for resource limits', type: 'async' },
        { from: 'rwl',       to: 'stamped', label: 'StampedLock supersedes ReadWriteLock',           type: 'sync' },
        { from: 'cdl',       to: 'cb',      label: 'CDL one-shot vs CyclicBarrier reusable',        type: 'sync' },
        { from: 'atomic',    to: 'longadd', label: 'LongAdder faster under high contention',         type: 'sync' },
        { from: 'fjp',       to: 'vt-exec', label: 'vthread scheduler IS ForkJoinPool internally',  type: 'async' },
      ]
    },

    visual: function(mount) {
      mount.innerHTML = `
        <style>
          .cc-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .cc-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .cc-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
          .cc-tab { background: #21262d; border: 1px solid #30363d; color: #768390; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cc-tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .cc-panel { display: none; }
          .cc-panel.active { display: block; }

          /* Thread comparison */
          .cc-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; }
          .cc-col { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; }
          .cc-col-head { font-size: 11px; font-weight: bold; text-align: center; padding: 4px; border-radius: 4px; margin-bottom: 8px; }
          .cc-col-head.platform { background: #3d1f1f; color: #f47067; }
          .cc-col-head.pool { background: #1f2d3d; color: #6cb6ff; }
          .cc-col-head.vt { background: #1f3d2d; color: #57ab5a; }
          .cc-threads { display: flex; flex-wrap: wrap; gap: 3px; min-height: 60px; }
          .cc-thread { border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; transition: all 0.3s; }
          .cc-thread.pf { width: 44px; height: 26px; background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-thread.pf.run { background: #f47067; color: #1c2128; }
          .cc-thread.pf.blk { opacity: 0.45; }
          .cc-thread.vv { width: 12px; height: 12px; border-radius: 2px; background: #1f3d2d; border: 1px solid #57ab5a; }
          .cc-thread.vv.run { background: #57ab5a; }
          .cc-thread.vv.park { opacity: 0.5; }
          .cc-thread.vv.done { background: #21262d; border-color: #30363d; opacity: 0.25; }
          .cc-stat { font-size: 10px; color: #768390; margin-top: 4px; }

          /* Lock comparison */
          .cc-locks { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
          .cc-lcard { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; cursor: pointer; transition: border-color 0.2s; }
          .cc-lcard:hover { border-color: #1f6feb; }
          .cc-lcard.active { border-color: #1f6feb; background: #0d1f3d; }
          .cc-lname { font-size: 11px; font-weight: bold; margin-bottom: 3px; }
          .cc-ltag { font-size: 9px; color: #768390; }
          .cc-lthreads { display: flex; gap: 3px; margin-top: 6px; }
          .cc-lt { width: 20px; height: 20px; border-radius: 3px; font-size: 8px; display: flex; align-items: center; justify-content: center; }
          .cc-lt.own { background: #57ab5a; color: #1c2128; font-weight: bold; }
          .cc-lt.wait { background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-lt.read { background: #1f2d3d; border: 1px solid #6cb6ff; color: #6cb6ff; }
          .cc-lt.optim { background: #1f3d2d; border: 1px solid #57ab5a; color: #57ab5a; font-size: 7px; }

          /* Synchronizer demo */
          .cc-sync-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
          .cc-scard { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; }
          .cc-sname { font-size: 11px; font-weight: bold; margin-bottom: 6px; }
          .cc-sthreads { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
          .cc-st { width: 28px; height: 28px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; transition: all 0.4s; }
          .cc-st.wait { background: #3d1f1f; border: 1px solid #f47067; color: #f47067; }
          .cc-st.pass { background: #57ab5a; color: #1c2128; }
          .cc-st.done { background: #21262d; color: #444; }
          .cc-gate { width: 20px; height: 36px; background: #30363d; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #768390; transition: background 0.4s; }
          .cc-gate.open { background: #57ab5a; color: #1c2128; }
          .cc-permits { display: flex; gap: 2px; }
          .cc-permit { width: 12px; height: 12px; border-radius: 2px; background: #57ab5a; transition: all 0.3s; }
          .cc-permit.used { background: #3d1f1f; border: 1px solid #f47067; }

          .cc-controls { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .cc-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cc-btn:hover { background: #30363d; }
          .cc-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 32px; margin-top: 8px; }
          .cc-info strong { color: #cdd9e5; }
          .cc-info .kw { color: #e3b341; }
          .cc-info .ok { color: #57ab5a; }
          .cc-info .bad { color: #f47067; }
        </style>
        <div class="cc-wrap">
          <div class="cc-title">Concurrency — Visual Interactive Lab</div>
          <div class="cc-tabs">
            <button class="cc-tab active" data-tab="threads">Thread Types</button>
            <button class="cc-tab" data-tab="locks">Lock Types</button>
            <button class="cc-tab" data-tab="sync">Synchronizers</button>
          </div>

          <!-- THREAD PANEL -->
          <div class="cc-panel active" id="cc-panel-threads">
            <div class="cc-controls">
              <button class="cc-btn" id="cc-sim">Simulate 20 I/O requests</button>
              <button class="cc-btn" id="cc-reset-t">Reset</button>
            </div>
            <div class="cc-grid3">
              <div class="cc-col">
                <div class="cc-col-head platform">Platform Threads (1:1 OS)</div>
                <div class="cc-threads" id="cc-pf"></div>
                <div class="cc-stat" id="cc-pf-s">Idle</div>
              </div>
              <div class="cc-col">
                <div class="cc-col-head pool">Fixed Pool (4 threads)</div>
                <div class="cc-threads" id="cc-pool"></div>
                <div class="cc-stat" id="cc-pool-s">Idle</div>
              </div>
              <div class="cc-col">
                <div class="cc-col-head vt">Virtual Threads (JVM)</div>
                <div class="cc-threads" id="cc-vt"></div>
                <div class="cc-stat" id="cc-vt-s">Idle</div>
              </div>
            </div>
            <div class="cc-info" id="cc-t-info">Click "Simulate" — watch platform threads block (red) while virtual threads park and free carriers (green).</div>
          </div>

          <!-- LOCKS PANEL -->
          <div class="cc-panel" id="cc-panel-locks">
            <div class="cc-locks">
              ${[
                { id:'sync-l',    name:'synchronized',       tag:'JVM intrinsic · pins vthreads!',
                  threads: [{c:'own',l:'T1'},{c:'wait',l:'T2'},{c:'wait',l:'T3'}],
                  detail: '<strong>synchronized(lock)</strong>: JVM monitor. Reentrant. Auto-unlock on exception. <span class="bad">PINS virtual threads</span> — blocks carrier OS thread during I/O. Use for simple critical sections with platform threads.' },
                { id:'rl-l',      name:'ReentrantLock',       tag:'try/timed/interruptible · vthread OK',
                  threads: [{c:'own',l:'T1'},{c:'wait',l:'T2'}],
                  detail: '<strong>ReentrantLock.lock()</strong>: Same as synchronized + tryLock(timeout), lockInterruptibly(). <span class="ok">Virtual thread safe</span> — vthread parks and unmounts while waiting. Must call unlock() in finally block.' },
                { id:'rwl-l',     name:'ReadWriteLock',        tag:'concurrent reads · one writer',
                  threads: [{c:'read',l:'R1'},{c:'read',l:'R2'},{c:'read',l:'R3'},{c:'wait',l:'W1'}],
                  detail: '<strong>ReadWriteLock</strong>: Multiple readers OR one writer (never concurrent). readLock() shared. writeLock() exclusive. Great for caches: many concurrent reads, rare writes. Writer starvation under high read load.' },
                { id:'stamped-l', name:'StampedLock',          tag:'optimistic reads · fastest',
                  threads: [{c:'optim',l:'opt'},{c:'optim',l:'opt'},{c:'own',l:'W'}],
                  detail: '<strong>StampedLock.tryOptimisticRead()</strong>: Read without acquiring any lock! Returns stamp. After reading, validate(stamp) — if false (write happened), retry with readLock(). 3–10× faster than RWL for optimistic reads. NOT reentrant.' },
              ].map(l => `
                <div class="cc-lcard" id="${l.id}" onclick="
                  this.closest('.cc-panel').querySelectorAll('.cc-lcard').forEach(c=>c.classList.remove('active'));
                  this.classList.add('active');
                  this.closest('.cc-panel').querySelector('.cc-info').innerHTML='${l.detail.replace(/'/g,"\\'")}';
                ">
                  <div class="cc-lname">${l.name}</div>
                  <div class="cc-ltag">${l.tag}</div>
                  <div class="cc-lthreads">${l.threads.map(t=>`<div class="cc-lt ${t.c}">${t.l}</div>`).join('')}</div>
                </div>`).join('')}
            </div>
            <div class="cc-info" id="cc-l-info">Click any lock type to see its guarantee, use case, and virtual thread compatibility.</div>
          </div>

          <!-- SYNCHRONIZERS PANEL -->
          <div class="cc-panel" id="cc-panel-sync">
            <div class="cc-sync-row">
              <div class="cc-scard">
                <div class="cc-sname" style="color:#6cb6ff">Semaphore(3) — 3 permits</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Permits available:</div>
                <div class="cc-permits" id="cc-sem-permits">
                  <div class="cc-permit"></div><div class="cc-permit"></div><div class="cc-permit"></div>
                </div>
                <div class="cc-sthreads" id="cc-sem-threads" style="margin-top:8px"></div>
                <div class="cc-controls" style="margin-top:6px;margin-bottom:0">
                  <button class="cc-btn" id="cc-sem-acq">acquire()</button>
                  <button class="cc-btn" id="cc-sem-rel">release()</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#e3b341">CountDownLatch(3)</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Count remaining: <strong id="cc-cdl-count" style="color:#cdd9e5">3</strong></div>
                <div class="cc-sthreads" id="cc-cdl-threads"></div>
                <div style="margin:6px 0;display:flex;align-items:center;gap:6px">
                  <div class="cc-gate" id="cc-cdl-gate">🔒</div>
                  <span style="font-size:10px;color:#768390">main await()</span>
                </div>
                <div class="cc-controls" style="margin-top:0;margin-bottom:0">
                  <button class="cc-btn" id="cc-cdl-cd">countDown()</button>
                  <button class="cc-btn" id="cc-cdl-reset">Reset</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#b392f0">CyclicBarrier(4)</div>
                <div style="margin-bottom:6px;font-size:10px;color:#768390">Waiting: <strong id="cc-cb-count" style="color:#cdd9e5">0</strong>/4</div>
                <div class="cc-sthreads" id="cc-cb-threads"></div>
                <div class="cc-controls" style="margin-top:6px;margin-bottom:0">
                  <button class="cc-btn" id="cc-cb-await">Thread arrives (await())</button>
                  <button class="cc-btn" id="cc-cb-reset">Reset</button>
                </div>
              </div>
              <div class="cc-scard">
                <div class="cc-sname" style="color:#57ab5a">Executor Comparison</div>
                <div style="font-size:10px;color:#768390;margin-bottom:6px">Max concurrent tasks in 1s with 50ms I/O wait:</div>
                ${[
                  {name:'Fixed(10)',val:10,col:'#f47067',max:10},
                  {name:'Cached',val:200,col:'#e3b341',max:200},
                  {name:'VirtualThread',val:1000,col:'#57ab5a',max:1000},
                ].map(e=>`
                  <div style="margin-bottom:4px">
                    <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px">
                      <span>${e.name}</span><span style="color:${e.col}">${e.val} tasks</span>
                    </div>
                    <div style="height:10px;background:#21262d;border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:${e.val/10}%;background:${e.col};border-radius:3px;transition:width 0.5s"></div>
                    </div>
                  </div>`).join('')}
              </div>
            </div>
            <div class="cc-info" id="cc-sync-info">Click buttons to see each synchronizer in action. Semaphore = pool of permits. CountDownLatch = one-time gate. CyclicBarrier = reusable rendezvous.</div>
          </div>
        </div>`;

      // Tab switching
      mount.querySelectorAll('.cc-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          mount.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('active'));
          mount.querySelectorAll('.cc-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          mount.querySelector('#cc-panel-' + tab.dataset.tab).classList.add('active');
        });
      });

      // Thread simulation
      let timers = [];
      function resetThreads() {
        timers.forEach(clearTimeout); timers = [];
        ['cc-pf','cc-pool','cc-vt'].forEach(id => { mount.querySelector('#' + id).innerHTML = ''; });
        mount.querySelector('#cc-pf-s').textContent = 'Idle';
        mount.querySelector('#cc-pool-s').textContent = 'Idle';
        mount.querySelector('#cc-vt-s').textContent = 'Idle';
        mount.querySelector('#cc-t-info').textContent = 'Click "Simulate" — watch platform threads block (red) while virtual threads park and free carriers (green).';
      }

      mount.querySelector('#cc-sim').addEventListener('click', () => {
        resetThreads();
        const N = 20;
        const pfEl = mount.querySelector('#cc-pf'), poolEl = mount.querySelector('#cc-pool'), vtEl = mount.querySelector('#cc-vt');
        const tInfo = mount.querySelector('#cc-t-info');

        // Platform threads
        for (let i = 0; i < N; i++) {
          const t = document.createElement('div');
          t.className = 'cc-thread pf';
          t.textContent = 'T' + (i+1);
          pfEl.appendChild(t);
          timers.push(setTimeout(() => { t.classList.add('run'); t.textContent = 'RUN'; mount.querySelector('#cc-pf-s').textContent = (i+1) + ' OS threads'; }, i * 70));
          timers.push(setTimeout(() => { t.classList.remove('run'); t.classList.add('blk'); t.textContent = 'BLK'; mount.querySelector('#cc-pf-s').innerHTML = '<span style="color:#f47067">' + N + ' OS threads BLOCKED 🔴</span>'; }, i * 70 + 200));
        }
        // Fixed pool
        const poolSize = 4;
        for (let i = 0; i < poolSize; i++) {
          const t = document.createElement('div');
          t.className = 'cc-thread pf';
          t.textContent = 'W' + (i+1);
          poolEl.appendChild(t);
        }
        const poolTs = poolEl.querySelectorAll('.cc-thread');
        let q = 0;
        for (let i = 0; i < N; i++) {
          const delay = i * 70;
          timers.push(setTimeout(() => {
            if (i < poolSize) { poolTs[i].classList.add('run'); poolTs[i].textContent='RUN'; }
            else { q++; mount.querySelector('#cc-pool-s').textContent = q + ' tasks queued!'; }
          }, delay));
          timers.push(setTimeout(() => {
            if (i < poolSize) { poolTs[i].classList.remove('run'); poolTs[i].classList.add('blk'); poolTs[i].textContent='I/O'; mount.querySelector('#cc-pool-s').innerHTML = '<span style="color:#f47067">4 threads blocked + ' + (N-poolSize) + ' queued</span>'; }
          }, delay + 200));
        }
        // Virtual threads
        for (let i = 0; i < N; i++) {
          const t = document.createElement('div');
          t.className = 'cc-thread vv';
          vtEl.appendChild(t);
          const d = i * 35;
          timers.push(setTimeout(() => { t.classList.add('run'); mount.querySelector('#cc-vt-s').textContent = (i+1) + ' vthreads (4 carriers)'; }, d));
          timers.push(setTimeout(() => { t.classList.remove('run'); t.classList.add('park'); mount.querySelector('#cc-vt-s').innerHTML = '<span style="color:#57ab5a">' + N + ' parked 🟢 carriers FREE!</span>'; }, d + 120));
          timers.push(setTimeout(() => { t.classList.remove('park'); t.classList.add('run'); }, d + 900));
          timers.push(setTimeout(() => { t.classList.remove('run'); t.classList.add('done'); mount.querySelector('#cc-vt-s').innerHTML = '<span style="color:#57ab5a">' + N + ' requests done ✓</span>'; tInfo.innerHTML = '<strong>Virtual threads win!</strong> 20 vthreads parked during I/O — only 4 carriers used. Same throughput as async, but <em>plain blocking code</em>.'; }, d + 1100));
        }
      });
      mount.querySelector('#cc-reset-t').addEventListener('click', resetThreads);

      // Semaphore
      let semPermits = 3, semWaiters = 0;
      const semInfo = mount.querySelector('#cc-sync-info');
      function renderSem() {
        const permits = mount.querySelectorAll('.cc-permit');
        permits.forEach((p,i) => p.classList.toggle('used', i >= semPermits));
        const tEl = mount.querySelector('#cc-sem-threads');
        tEl.innerHTML = '';
        for (let i = 0; i < 3 - semPermits + semWaiters; i++) {
          const t = document.createElement('div');
          t.className = 'cc-st ' + (i < 3 - semPermits ? 'pass' : 'wait');
          t.textContent = i < 3 - semPermits ? 'IN' : 'W';
          tEl.appendChild(t);
        }
      }
      mount.querySelector('#cc-sem-acq').addEventListener('click', () => {
        if (semPermits > 0) { semPermits--; renderSem(); semInfo.innerHTML = '<strong>acquire()</strong> — permit granted. Remaining: ' + semPermits + '. Thread enters critical section.'; }
        else { semWaiters++; renderSem(); semInfo.innerHTML = '<strong>acquire()</strong> — NO permits! Thread BLOCKS. Waiting: ' + semWaiters + '. Use tryAcquire(timeout) to avoid blocking forever.'; }
      });
      mount.querySelector('#cc-sem-rel').addEventListener('click', () => {
        if (semWaiters > 0) { semWaiters--; renderSem(); semInfo.innerHTML = '<strong>release()</strong> — permit returned, unblocks 1 waiting thread. Semaphore wakes it up.'; }
        else if (semPermits < 3) { semPermits++; renderSem(); semInfo.innerHTML = '<strong>release()</strong> — permit returned. Available: ' + semPermits + '. Critical section exited.'; }
        else { semInfo.innerHTML = '<strong>release()</strong> — already at max permits. Nothing to do.'; }
      });
      renderSem();

      // CountDownLatch
      let cdlCount = 3;
      function renderCDL() {
        mount.querySelector('#cc-cdl-count').textContent = cdlCount;
        const tEl = mount.querySelector('#cc-cdl-threads');
        tEl.innerHTML = '';
        for (let i = 0; i < 3; i++) {
          const t = document.createElement('div');
          t.className = 'cc-st ' + (i >= cdlCount ? 'done' : 'wait');
          t.textContent = i >= cdlCount ? '✓' : 'W' + (i+1);
          tEl.appendChild(t);
        }
        const gate = mount.querySelector('#cc-cdl-gate');
        gate.classList.toggle('open', cdlCount === 0);
        gate.textContent = cdlCount === 0 ? '🔓' : '🔒';
      }
      mount.querySelector('#cc-cdl-cd').addEventListener('click', () => {
        if (cdlCount > 0) { cdlCount--; renderCDL(); semInfo.innerHTML = cdlCount > 0 ? '<strong>countDown()</strong> — count now ' + cdlCount + '. Main thread still blocked at await().': '<strong>countDown() → 0!</strong> Latch open! Main thread UNBLOCKED. All await() callers released. <span class="ok">ONE-SHOT — cannot reset!</span>'; }
      });
      mount.querySelector('#cc-cdl-reset').addEventListener('click', () => { cdlCount = 3; renderCDL(); semInfo.innerHTML = 'CountDownLatch reset (for demo). In real code: it\'s one-shot — use CyclicBarrier if you need to reuse.'; });
      renderCDL();

      // CyclicBarrier
      let cbCount = 0;
      function renderCB() {
        mount.querySelector('#cc-cb-count').textContent = cbCount;
        const tEl = mount.querySelector('#cc-cb-threads');
        tEl.innerHTML = '';
        for (let i = 0; i < Math.max(cbCount, 1); i++) {
          const t = document.createElement('div');
          t.className = 'cc-st wait';
          t.textContent = 'T' + (i+1);
          tEl.appendChild(t);
        }
        if (cbCount === 0 && tEl.innerHTML === '') {
          tEl.innerHTML = '<span style="font-size:10px;color:#768390">No threads waiting</span>';
        }
      }
      mount.querySelector('#cc-cb-await').addEventListener('click', () => {
        cbCount++;
        if (cbCount < 4) { renderCB(); semInfo.innerHTML = '<strong>await()</strong> — T' + cbCount + ' arrived. Waiting: ' + cbCount + '/4. Barrier not yet tripped.'; }
        else {
          semInfo.innerHTML = '<strong>BARRIER TRIPPED!</strong> All 4 threads arrived. Optional barrierAction() runs. All 4 released simultaneously. CyclicBarrier RESETS automatically — ready for next phase!';
          const tEl = mount.querySelector('#cc-cb-threads');
          tEl.querySelectorAll('.cc-st').forEach(t => t.className = 'cc-st pass');
          setTimeout(() => { cbCount = 0; renderCB(); }, 1200);
        }
      });
      mount.querySelector('#cc-cb-reset').addEventListener('click', () => { cbCount = 0; renderCB(); semInfo.innerHTML = 'CyclicBarrier reset. Reusable unlike CountDownLatch.'; });
      renderCB();
    },

    concept:
`Three layers:
1. **\`Thread\`** — OS thread, ~1 MB stack, expensive context-switch.
2. **\`ExecutorService\`** + pools — reuse OS threads. Backed by a queue. Variants: fixed, cached, scheduled, work-stealing (\`ForkJoinPool\`).
3. **Virtual threads (Project Loom, Java 21 GA)** — JVM-scheduled, mounted on carrier threads. Millions per JVM. Blocking I/O parks them cheaply.

Locks: \`synchronized\` → \`ReentrantLock\` → \`ReadWriteLock\` → \`StampedLock\` (optimistic).
Synchronizers: \`Semaphore\` (permits), \`CountDownLatch\` (one-shot), \`CyclicBarrier\` (reusable), \`Phaser\` (dynamic).`,
    why:
`Virtual threads collapse the **thread-per-request vs reactive** debate. You write straight-line blocking code; the JVM gives you reactive-grade scalability. Lock choice determines virtual thread friendliness and contention patterns.`,
    example: {
      language: "java",
      code:
`import java.util.concurrent.*;
import java.util.concurrent.locks.*;

// 1. ReentrantLock — virtual thread safe, timed try
ReentrantLock lock = new ReentrantLock();
if (lock.tryLock(100, TimeUnit.MILLISECONDS)) {
    try { /* critical section */ }
    finally { lock.unlock(); }  // ALWAYS unlock in finally
}

// 2. ReadWriteLock — concurrent reads
ReadWriteLock rwl = new ReentrantReadWriteLock();
// reads: concurrent
rwl.readLock().lock(); try { return cache.get(key); } finally { rwl.readLock().unlock(); }
// writes: exclusive
rwl.writeLock().lock(); try { cache.put(key, val); } finally { rwl.writeLock().unlock(); }

// 3. StampedLock — optimistic read (no lock!)
StampedLock sl = new StampedLock();
long stamp = sl.tryOptimisticRead();
double x = this.x, y = this.y;  // read without lock
if (!sl.validate(stamp)) {       // check: did a write happen?
    stamp = sl.readLock();       // fall back to real read lock
    try { x = this.x; y = this.y; } finally { sl.unlockRead(stamp); }
}

// 4. Semaphore — connection pool limit
Semaphore pool = new Semaphore(10);  // max 10 concurrent DB connections
pool.acquire();
try { useDatabase(); } finally { pool.release(); }

// 5. CountDownLatch — wait for N workers
CountDownLatch ready = new CountDownLatch(3);
for (int i = 0; i < 3; i++) {
    executor.submit(() -> { doWork(); ready.countDown(); });
}
ready.await();  // main thread blocks until all 3 finish

// 6. CyclicBarrier — parallel phases
CyclicBarrier barrier = new CyclicBarrier(4, () -> System.out.println("Phase done!"));
// Each of 4 threads does:
doPhaseWork();
barrier.await();  // all 4 must arrive before any proceeds`,
      notes: `Never call \`lock()\` without a matching \`unlock()\` in \`finally\`. \`synchronized\` blocks pin virtual threads during I/O — prefer \`ReentrantLock\` in virtual-thread-heavy code.`
    },
    interview: [
      {
        question: "Difference between virtual threads and reactive (WebFlux)?",
        answer:
`Both achieve high concurrency with few OS threads. **Virtual threads** keep the **imperative blocking** programming model — easier debugging, linear stack traces, \`ThreadLocal\` works. **Reactive** uses async non-blocking APIs; backpressure is first-class but cognitive load is high. For most apps in 2025, **virtual threads** are the better default.`,
        followUps: ["What is thread pinning?", "Can I use ThreadLocal with virtual threads?"]
      },
      {
        question: "When to use Semaphore vs ReadWriteLock vs StampedLock?",
        answer:
`**Semaphore**: limit concurrency (N permits for N connections). Not about mutual exclusion of a resource — about throughput control. **ReadWriteLock**: shared resource with concurrent reads, exclusive writes. Writer starvation risk under high read load. **StampedLock**: same as RWL but adds optimistic reads with no lock acquisition — 3–10× faster for read-dominant loads. Not reentrant.`,
        followUps: ["What is writer starvation?", "Why is StampedLock not reentrant?"]
      },
      {
        question: "CountDownLatch vs CyclicBarrier — which one?",
        answer:
`**CountDownLatch**: one-way, one-shot. Either many threads wait for 1 signal, or 1 thread waits for N completions. Cannot reuse. **CyclicBarrier**: N threads all wait for each other at a rendezvous point. Resets automatically after all arrive. Optional barrierAction fires when all arrive. Use CyclicBarrier for iterative parallel algorithms (game loops, parallel matrix ops, phases).`,
        followUps: ["Can CountDownLatch deadlock?", "Phaser vs CyclicBarrier?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Virtual threads remove the need for reactive complexity.",
        "StampedLock gives near-zero overhead optimistic reads.",
        "Structured concurrency (Java 21) prevents thread leaks in fork-join patterns."
      ],
      cons: [
        "synchronized blocks pin virtual threads — subtle performance cliff.",
        "StampedLock is NOT reentrant — easy to deadlock.",
        "CyclicBarrier deadlocks if any thread dies before arriving."
      ],
      when: `**I/O-bound**: virtual threads + ReentrantLock. **CPU-bound parallel**: ForkJoinPool. **Shared cache**: StampedLock. **Connection pool**: Semaphore. **Phase sync**: CyclicBarrier.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
