(function() {
  var topic = {
    id: "java-jvm-memory-gc",
    area: "java",
    title: "JVM Memory Model & Garbage Collection",
    tag: "JVM",
    tags: ["jvm", "gc", "g1", "zgc", "memory", "classloader", "jit"],

    flow: {
      title: "JVM Execution Pipeline — .java → bytecode → JIT → GC",
      caption: "Every major JVM phase from source file to garbage collection cycle",
      nodes: [
        { id: "src",      label: ".java Source",       hint: "Human-readable Java source code" },
        { id: "javac",    label: "javac Compiler",     hint: "Compiles to platform-neutral bytecode" },
        { id: "cls",      label: ".class Bytecode",    hint: "JVM stack-machine ISA, not native code" },
        { id: "loader",   label: "ClassLoader",        hint: "Bootstrap → Platform → App (delegation model)" },
        { id: "meta",     label: "Metaspace",          hint: "Class metadata off-heap, grows as classes load" },
        { id: "interp",   label: "Interpreter (T0)",   hint: "Executes bytecode — fast start, slow peak" },
        { id: "jit",      label: "JIT C1→C2 (T1–T4)", hint: "Tiered: profiling → full optimize + inlining" },
        { id: "eden",     label: "Eden / TLAB",        hint: "New objects — bump-pointer, no lock, ≈5 ns" },
        { id: "survivor", label: "Survivor S0 ↔ S1",  hint: "Live objects copied here after Minor GC" },
        { id: "old",      label: "Old Gen (Tenured)",  hint: "Long-lived objects promoted after age=15" },
        { id: "gc",       label: "G1 / ZGC",           hint: "Concurrent marking + compaction" },
      ],
      steps: [
        { path: ["src","javac"],      label: "1 · javac compiles to .class",         detail: "javac parses, type-checks, and emits .class bytecode. No native code — targets a portable stack-machine ISA. Inspect with javap -c." },
        { path: ["javac","cls"],      label: "2 · .class emitted",                   detail: ".class contains: constant pool, method bytecodes, attribute tables. One .class per top-level class. Inner classes get separate .class files." },
        { path: ["cls","loader"],     label: "3 · ClassLoader delegation chain",     detail: "Bootstrap → Platform (ext) → Application. Parent asked first — prevents shadowing java.lang.String. Custom loaders add hot-reload, isolation (OSGi, WAR isolation)." },
        { path: ["loader","meta"],    label: "4 · Link + Init → Metaspace",          detail: "Verify (type safety) → Prepare (static fields) → Resolve (symbolic refs → direct ptrs) → Initialize (run static {}). Class metadata goes to native Metaspace — not on heap. Grows until MaxMetaspaceSize." },
        { path: ["meta","interp"],    label: "5 · Interpret (Tier 0) — cold start",  detail: "Methods start interpreted. JVM counts invocations + back-edges. Cheap startup; throughput ~10–50× slower than C2 compiled. Most methods never leave this tier (dead code)." },
        { path: ["interp","jit"],     label: "6 · JIT: C1 (T1) → C2 (T4)",         detail: "≥200 calls → C1 (profiled, fast compile). ≥15000 calls → C2 full optimize: method inlining (main win!), loop unrolling, escape analysis, lock elision, SIMD auto-vectorization." },
        { path: ["jit","eden"],       label: "7 · Allocate in Eden TLAB (≈5 ns)",   detail: "new Obj() bumps a thread-local pointer — no CAS, no lock. Each thread owns a TLAB. Object header = mark word (hash/lock/age bits) + klass pointer. Cost ≈5 ns vs malloc ≈50 ns." },
        { path: ["eden","survivor"],  label: "8 · Minor GC — copy survivors",        detail: "Eden full → safepoint (all threads stop). GC roots traced (stacks, statics, JNI). Live objects COPIED to Survivor (S0↔S1 swap each GC). Dead Eden abandoned, reset in bulk. Pause 1–10 ms." },
        { path: ["survivor","old"],   label: "9 · Promote to Old Gen",              detail: "Age threshold (default 15) → promote. Humongous objects (> half region) skip Young entirely, go direct to Old. Card table updated for cross-gen references." },
        { path: ["old","gc"],         label: "10 · Major GC — G1 or ZGC",           detail: "G1: concurrent mark when Old > 45% → mixed collection of high-garbage regions. ZGC: fully concurrent, pause < 1ms at any heap size, using colored pointers + load barriers. Both compact without full STW." },
        { path: ["gc","eden"],        label: "11 · Heap reclaimed — cycle repeats",  detail: "Freed Eden ready for new TLABs. Metaspace freed only on ClassLoader unload (common leak: WAR redeployments). Application continues. Cycle never ends for long-lived services." },
      ]
    },

    uml: {
      title: "Object Lifecycle — Thread to GC",
      scenario: "Creating, aging, and garbage-collecting a single object through all JVM phases",
      actors: [
        { id: "thread",  label: "App Thread",   hint: "Your code running" },
        { id: "jit",     label: "JIT / Escape", hint: "Escape analysis may stack-allocate" },
        { id: "eden",    label: "Eden (TLAB)",  hint: "Bump-pointer heap allocation" },
        { id: "minor",   label: "Minor GC",     hint: "Young generation collector" },
        { id: "old",     label: "Old Gen",      hint: "Long-lived object storage" },
        { id: "major",   label: "G1 / ZGC",     hint: "Major / mixed GC collector" },
      ],
      messages: [
        { from:"thread", to:"jit",    label:"new Obj() → escape analysis",      detail:"JIT checks if Obj escapes the allocating method. If not: stack-allocate (zero GC pressure). If yes: heap-allocate. Escape analysis fires at C2 tier (~15k invocations).", type:"sync" },
        { from:"jit",    to:"eden",   label:"Obj escapes → TLAB bump-pointer",  detail:"TLAB ptr += objSize. Object header written: mark word (identity hash, age bits, lock state) + compressed klass pointer. No synchronization needed — per-thread TLAB.", type:"sync" },
        { from:"eden",   to:"thread", label:"Reference returned to caller",     detail:"Caller gets reference. Object reachable via stack frame — a GC root. As long as any root chain points here, object is live.", type:"sync" },
        { from:"thread", to:"eden",   label:"Many allocations fill Eden",       detail:"TLABs refilled until Eden exhausted. JVM polls safepoint at method boundaries and loop back-edges. At next poll, JVM forces a stop-the-world pause.", type:"async" },
        { from:"eden",   to:"minor",  label:"Safepoint → Minor GC triggered",  detail:"All threads reach a safepoint (safe for GC). Roots traced: thread stacks, static fields, JNI globals. BFS marks reachable objects.", type:"sync" },
        { from:"minor",  to:"eden",   label:"Dead objects reclaimed in bulk",   detail:"No per-object free(). Eden bitmap cleared. Dead objects simply abandoned. TLAB refill points reset. Sub-millisecond overhead per MB.", type:"sync" },
        { from:"minor",  to:"old",    label:"Promote: age ≥ 15 or humongous",  detail:"Surviving objects copied to S1, age incremented. At threshold, copied to Old Gen. Humongous objects (> ½ G1 region) skipped directly to Old. Remembered Set updated.", type:"sync" },
        { from:"old",    to:"major",  label:"Old occupancy > IHOP → mark",     detail:"G1: starts concurrent marking at InitiatingHeapOccupancyPercent (45% default). ZGC: continuous concurrent marking without a threshold trigger. No STW for this phase.", type:"async" },
        { from:"major",  to:"old",    label:"Concurrent mark + compact",        detail:"G1: identifies high-garbage regions → mixed collections (young+some old) → evacuate live, compact. ZGC: concurrent relocation; load barriers remap stale pointers transparently.", type:"sync" },
        { from:"major",  to:"thread", label:"GC cycle done — threads resume",   detail:"Safepoint released. Heap utilization drops. Application continues. Metaspace freed only when ClassLoader is GC'd (WAR reloads). Repeat.", type:"sync" },
      ]
    },

    architecture: {
      title: "JVM Internals — Four Subsystems",
      caption: "Click any component to understand its memory, cost, and tuning handles",
      lanes: [
        {
          label: "① ClassLoader Subsystem",
          hint: "Loads, links, and initializes classes",
          nodes: [
            { id: "cl-boot",  label: "Bootstrap ClassLoader", badge: "native C++",    hint: "Loads JDK core (java.lang, java.util). Written in C++, no Java class object. Cannot be replaced. Delegation root." },
            { id: "cl-plat",  label: "Platform ClassLoader",  badge: "ext/platform",  hint: "Java 9+: replaces Extension ClassLoader. Loads javax.*, jdk.* etc. Delegates to Bootstrap first." },
            { id: "cl-app",   label: "App ClassLoader",       badge: "classpath",     hint: "Loads your JARs, -classpath, module path. Can add URLs at runtime (legacy). Parent delegation prevents shadowing java.lang.*" },
            { id: "cl-cust",  label: "Custom ClassLoader",    badge: "hot-reload",    hint: "Override findClass(). Used by Tomcat (WAR isolation), OSGi, test frameworks. Each new loader creates a new class namespace. Leak risk: old loader kept alive by stale reference." },
          ]
        },
        {
          label: "② Runtime Data Areas",
          hint: "Memory regions per-JVM and per-thread",
          nodes: [
            { id: "mem-meta",  label: "Metaspace",    badge: "native off-heap",   hint: "Class metadata, method bytecodes, constant pools. Not on heap — not GC'd until ClassLoader is unloaded. Set -XX:MaxMetaspaceSize to cap. Default: unlimited (can OOM native)." },
            { id: "mem-eden",  label: "Eden + S0/S1", badge: "Young Gen",         hint: "New allocations via TLAB bump-pointer. Short-lived objects die here (most should). Minor GC clears Eden, copies survivors. Size: -XX:NewSize / -XX:NewRatio." },
            { id: "mem-old",   label: "Old Gen",      badge: "Tenured",           hint: "Long-lived objects. G1 manages as regions (1–32 MB each). High occupancy → Major GC. Fragmentation in non-compacting collectors causes Full GC." },
            { id: "mem-stack", label: "Thread Stacks", badge: "per-thread 512KB", hint: "-Xss controls stack size. Default 512KB–1MB per platform thread. Virtual threads: tiny heap-allocated stacks grow on demand. StackOverflowError = infinite recursion." },
          ]
        },
        {
          label: "③ Execution Engine",
          hint: "Runs your bytecode",
          nodes: [
            { id: "eng-interp", label: "Interpreter",      badge: "Tier 0",        hint: "Executes bytecode instruction by instruction. Fast startup. Counts method invocations and back-edges for JIT profiling trigger. 10–50× slower than C2-compiled code." },
            { id: "eng-c1",     label: "C1 Compiler",      badge: "Tier 1–3",      hint: "Client compiler. Lightly optimized, instruments for profiling (branch frequencies, type profiles). Fast compile, enables C2 to make better decisions." },
            { id: "eng-c2",     label: "C2 Compiler",      badge: "Tier 4 · hot",  hint: "Server compiler. Full optimization: inlining (biggest win), loop unrolling, escape analysis (stack alloc), lock elision, SIMD, intrinsics. Compiled code stored in Code Cache." },
            { id: "eng-gc",     label: "GC Engine",        badge: "G1 / ZGC",      hint: "G1 (default): region-based, pause-time goal. ZGC: colored pointers, load barriers, < 1ms pause at any heap size. Shenandoah: concurrent compaction. Choose based on latency vs throughput need." },
          ]
        },
        {
          label: "④ GC Algorithms",
          hint: "When and how to use each",
          nodes: [
            { id: "gc-serial",  label: "Serial GC",   badge: "-XX:+UseSerialGC",   hint: "Single-threaded mark-sweep-compact. Best for tiny heaps (< 100 MB) or CLI tools. Throughput = bad. Latency = worst. Use: scratch scripts, tests." },
            { id: "gc-parallel",label: "Parallel GC", badge: "-XX:+UseParallelGC", hint: "Multi-threaded STW. Maximizes throughput. Pauses can be long (seconds on large heaps). Best for batch jobs where latency doesn't matter." },
            { id: "gc-g1",      label: "G1 GC",       badge: "default Java 9+",    hint: "Region-based (1–32 MB regions). Aims for MaxGCPauseMillis target (default 200ms). Mixed collections: young + some old. Best for general services with 2–32 GB heap." },
            { id: "gc-zgc",     label: "ZGC",         badge: "-XX:+UseZGC",        hint: "Fully concurrent. Pause < 1ms independent of heap size. Colored pointers encode forwarding info. Load barriers fix stale refs on access. CPU overhead ~5–10%. Best for large heaps + low latency." },
          ]
        }
      ],
      links: [
        { from: "cl-boot",   to: "mem-meta",    label: "JDK classes → Metaspace",         type: "sync" },
        { from: "cl-app",    to: "mem-meta",    label: "App classes → Metaspace",          type: "sync" },
        { from: "eng-interp",to: "mem-eden",    label: "new Obj() → TLAB allocation",      type: "sync" },
        { from: "eng-c2",    to: "mem-eden",    label: "escape analysis → may stack-alloc",type: "async" },
        { from: "mem-eden",  to: "mem-old",     label: "age threshold → promote",          type: "sync" },
        { from: "mem-old",   to: "gc-g1",       label: "IHOP crossed → major GC",          type: "async" },
        { from: "eng-interp",to: "eng-c1",      label: "hot method → C1 compile",          type: "sync" },
        { from: "eng-c1",    to: "eng-c2",      label: "profile-guided → C2 optimize",     type: "sync" },
      ]
    },

    visual: function(mount) {
      const JV_TRICKS = [
        { wrong: "Set -Xms=512m -Xmx=4g in containers → JVM resizes heap under load → GC pause during resize + OS may not commit pages.", right: "Always -Xms = -Xmx in containers. Eliminates resize overhead. JVM commits all memory upfront." },
        { wrong: "new byte[50_000_000] expects Eden allocation → fast TLAB bump-pointer.", right: "Large arrays (> ½ G1 region) skip Eden entirely → Old Gen directly. Many humongous allocs fragment Old → Full GC." },
        { wrong: "synchronized(lock) { jdbcCall(); } in virtual thread → thought carrier is free during I/O wait.", right: "synchronized PINS virtual thread to carrier. Carrier OS thread BLOCKS. Use ReentrantLock — vthread unmounts, carrier freed." },
        { wrong: "ThreadLocal.set(user) in Tomcat thread. Request ends. Assume it is cleaned up.", right: "Tomcat reuses threads. Next request inherits stale ThreadLocal value. Always ThreadLocal.remove() in finally block." },
      ];
      const JV_QS = [
        { q: "When would you pick ZGC over G1?", a: "ZGC when p99 latency matters and heap > 16 GB. ZGC keeps pauses < 1ms regardless of heap size. G1 is the safer default for 4–32 GB where 100–200ms pauses are acceptable and throughput matters more." },
        { q: "What is a humongous allocation and why is it dangerous?", a: "Any object > ½ of a G1 region (1–32 MB). Skips Eden, allocated directly in Old Gen contiguous regions. Many humongous allocations fragment Old Gen → force Full GC. Fix: tune -XX:G1HeapRegionSize or avoid large array allocs in hot paths." },
        { q: "Why does Metaspace leak on WAR redeploy?", a: "Each WAR gets its own ClassLoader. The old ClassLoader is GC-eligible only when NO live reference points to it. If a static Map, thread, JDBC driver, or logging framework holds a Class or ClassLoader reference: old ClassLoader (and all its classes) stay in Metaspace forever." },
      ];
      mount.innerHTML = `
        <style>
          .jv-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .jv-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .jv-tabs { display: flex; gap: 4px; margin-bottom: 12px; }
          .jv-tab { background: #21262d; border: 1px solid #30363d; color: #768390; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .jv-tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .jv-panel { display: none; }
          .jv-panel.active { display: block; }

          /* Heap panel */
          .jv-heap { display: grid; grid-template-columns: 2fr 1fr 1fr 2fr 1fr; gap: 8px; margin-bottom: 12px; align-items: start; }
          .jv-region { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 8px; }
          .jv-region-head { font-size: 10px; font-weight: bold; text-align: center; padding: 3px 6px; border-radius: 4px; margin-bottom: 6px; }
          .jv-region-head.eden { background: #1f3d2d; color: #57ab5a; }
          .jv-region-head.s0 { background: #1f2d3d; color: #6cb6ff; }
          .jv-region-head.s1 { background: #1f2d3d; color: #6cb6ff; }
          .jv-region-head.old { background: #3d2f1f; color: #e3b341; }
          .jv-region-head.meta { background: #2d1f3d; color: #b392f0; }
          .jv-objects { display: flex; flex-wrap: wrap; gap: 2px; min-height: 50px; }
          .jv-obj { width: 14px; height: 14px; border-radius: 2px; background: #21262d; border: 1px solid #30363d; transition: all 0.3s; font-size: 8px; display: flex; align-items: center; justify-content: center; }
          .jv-obj.live { background: #57ab5a; border-color: #57ab5a; }
          .jv-obj.young { background: #6cb6ff; border-color: #6cb6ff; }
          .jv-obj.promoted { background: #e3b341; border-color: #e3b341; }
          .jv-obj.dead { background: #f47067; border-color: #f47067; opacity: 0.4; }
          .jv-obj.class { background: #b392f0; border-color: #b392f0; }
          .jv-region-stat { font-size: 9px; color: #768390; text-align: center; margin-top: 4px; }
          .jv-controls2 { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .jv-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .jv-btn:hover { background: #30363d; }

          /* GC comparison */
          .jv-gc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px; }
          .jv-gc-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; }
          .jv-gc-name { font-size: 11px; font-weight: bold; margin-bottom: 6px; }
          .jv-gc-name.g1 { color: #57ab5a; }
          .jv-gc-name.zgc { color: #6cb6ff; }
          .jv-gc-name.par { color: #e3b341; }
          .jv-gc-name.ser { color: #768390; }
          .jv-timeline { height: 24px; background: #0d1117; border-radius: 4px; position: relative; overflow: hidden; margin-bottom: 4px; }
          .jv-pause { position: absolute; top: 0; height: 100%; border-radius: 2px; opacity: 0.85; }
          .jv-pause.app { background: #57ab5a; }
          .jv-pause.stw { background: #f47067; }
          .jv-pause.conc { background: #1f6feb; opacity: 0.6; }
          .jv-gc-meta { font-size: 9px; color: #768390; }

          .jv-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 32px; margin-top: 8px; }
          .jv-info strong { color: #e3b341; }
          .jv-info .kw { color: #57ab5a; }
        </style>
        <div class="jv-wrap">
          <div class="jv-title">JVM Internals — Live Heap & GC Visualizer</div>
          <div class="jv-tabs">
            <button class="jv-tab active" data-tab="heap">Heap & GC Cycle</button>
            <button class="jv-tab" data-tab="gccomp">GC Algorithm Comparison</button>
            <button class="jv-tab" data-tab="jit">JIT Tiers</button>
            <button class="jv-tab" data-tab="tricks">⚠️ Tricks + Interview</button>
          </div>

          <!-- HEAP PANEL -->
          <div class="jv-panel active" id="jv-panel-heap">
            <div class="jv-controls2">
              <button class="jv-btn" id="jv-alloc">Allocate objects</button>
              <button class="jv-btn" id="jv-minor">Trigger Minor GC</button>
              <button class="jv-btn" id="jv-major">Trigger Major GC</button>
              <button class="jv-btn" id="jv-reset-heap">Reset</button>
            </div>
            <div class="jv-heap">
              <div class="jv-region">
                <div class="jv-region-head eden">Eden</div>
                <div class="jv-objects" id="jv-eden"></div>
                <div class="jv-region-stat" id="jv-eden-stat">0 objects</div>
              </div>
              <div class="jv-region">
                <div class="jv-region-head s0">S0</div>
                <div class="jv-objects" id="jv-s0"></div>
                <div class="jv-region-stat" id="jv-s0-stat">0</div>
              </div>
              <div class="jv-region">
                <div class="jv-region-head s1">S1</div>
                <div class="jv-objects" id="jv-s1"></div>
                <div class="jv-region-stat" id="jv-s1-stat">0</div>
              </div>
              <div class="jv-region">
                <div class="jv-region-head old">Old Gen</div>
                <div class="jv-objects" id="jv-old"></div>
                <div class="jv-region-stat" id="jv-old-stat">0 objects</div>
              </div>
              <div class="jv-region">
                <div class="jv-region-head meta">Metaspace</div>
                <div class="jv-objects" id="jv-meta"></div>
                <div class="jv-region-stat" id="jv-meta-stat">classes</div>
              </div>
            </div>
            <div class="jv-info" id="jv-heap-info">Press "Allocate objects" to add objects to Eden via TLAB. Most will be short-lived. Then trigger Minor GC to see survivors promoted.</div>
          </div>

          <!-- GC COMPARISON PANEL -->
          <div class="jv-panel" id="jv-panel-gccomp">
            <div class="jv-gc-grid">
              <div class="jv-gc-card">
                <div class="jv-gc-name ser">Serial GC (-XX:+UseSerialGC)</div>
                <div class="jv-timeline" id="jv-tl-serial"></div>
                <div class="jv-gc-meta">Single-threaded. Long STW. Tiny heaps only.</div>
              </div>
              <div class="jv-gc-card">
                <div class="jv-gc-name par">Parallel GC (-XX:+UseParallelGC)</div>
                <div class="jv-timeline" id="jv-tl-parallel"></div>
                <div class="jv-gc-meta">Multi-threaded STW. High throughput. Batch use.</div>
              </div>
              <div class="jv-gc-card">
                <div class="jv-gc-name g1">G1 GC (default Java 9+)</div>
                <div class="jv-timeline" id="jv-tl-g1"></div>
                <div class="jv-gc-meta">Region-based. Predictable pause target. General services.</div>
              </div>
              <div class="jv-gc-card">
                <div class="jv-gc-name zgc">ZGC (-XX:+UseZGC)</div>
                <div class="jv-timeline" id="jv-tl-zgc"></div>
                <div class="jv-gc-meta">Fully concurrent. Sub-ms pauses. Large heaps.</div>
              </div>
            </div>
            <div style="font-size:10px;color:#768390;display:flex;gap:12px;margin-bottom:8px">
              <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;background:#57ab5a;border-radius:2px"></span>App running</span>
              <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;background:#f47067;border-radius:2px"></span>STW pause</span>
              <span style="display:flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;background:#1f6feb;opacity:0.7;border-radius:2px"></span>Concurrent GC work</span>
            </div>
            <div class="jv-info">Each bar = 1 second of JVM time. Red = stop-the-world pause (app frozen). Blue = GC working concurrently (app still running). Green = full app throughput. ZGC has almost no red.</div>
          </div>

          <!-- JIT PANEL -->
          <div class="jv-panel" id="jv-panel-jit">
            <div style="margin-bottom:10px">
              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
                ${[
    {tier:"T0 · Interpreter",calls:"0",speed:"1×",col:"#768390",detail:"First invocation. Bytecode executed instruction by instruction. Counting starts."},
    {tier:"T1 · C1 simple",calls:"≥200",speed:"5×",col:"#6cb6ff",detail:"Simple C1 compile. No profiling instrumentation. Fast to compile."},
    {tier:"T3 · C1 profiled",calls:"≥2000",speed:"10×",col:"#e3b341",detail:"C1 with profiling: branch frequencies, call targets, type profiles recorded for C2."},
    {tier:"T4 · C2 full",calls:"≥15000",speed:"50×+",col:"#57ab5a",detail:"Full C2 optimize: inlining, loop unroll, escape analysis, lock elision, SIMD. Best performance."},
  ].map(t => `
                  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;cursor:pointer" onclick="this.closest('.jv-panel').querySelector('.jv-info').innerHTML='<strong>${t.tier}:</strong> ${t.detail} Invocation count: <span class=\\"kw\\">${t.calls}</span>. Speedup vs Tier0: <strong style=\\"color:#57ab5a\\">${t.speed}</strong>.'">
                    <div style="font-size:11px;font-weight:bold;color:${t.col};margin-bottom:4px">${t.tier}</div>
                    <div style="font-size:10px;color:#768390">Calls: ${t.calls}</div>
                    <div style="font-size:14px;font-weight:bold;color:${t.col};margin-top:4px">${t.speed}</div>
                  </div>`).join("")}
              </div>
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;margin-bottom:8px">
              <div style="font-size:10px;color:#768390;margin-bottom:6px">Key C2 Optimizations (click to learn)</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${[
    {n:"Method Inlining",d:"#1 win. Replaces call site with callee body. Eliminates call overhead AND enables further opts (constant folding, dead code elim) inside inlined body. -XX:MaxInlineSize controls threshold."},
    {n:"Escape Analysis",d:"If Obj never leaves the method, allocate on STACK — zero GC pressure. Common for small DTOs. Check with -XX:+PrintEscapeAnalysis."},
    {n:"Lock Elision",d:"If lock object cannot escape (local synchronized block), JIT removes the lock entirely. No contention possible. Free synchronization."},
    {n:"Loop Unrolling",d:"Replicate loop body N times to reduce branch overhead and enable SIMD. Common in array processing. Controlled by LoopUnrollLimit."},
    {n:"Dead Code Elim",d:"Code proven unreachable (e.g. constant-folded if(false)) is removed entirely. Common after inlining."},
    {n:"Intrinsics",d:"String.equals(), Arrays.sort(), Math.sqrt() replaced with hand-written assembly intrinsics. Huge speedup for common ops."},
  ].map(o => `<button style="background:#21262d;border:1px solid #30363d;color:#cdd9e5;padding:3px 8px;border-radius:4px;font-size:10px;font-family:monospace;cursor:pointer" onclick="this.closest('.jv-panel').querySelector('.jv-info').innerHTML='<strong>${o.n}:</strong> ${o.d}'">${o.n}</button>`).join("")}
              </div>
            </div>
            <div class="jv-info" id="jv-jit-info">Click a JIT tier or optimization above to learn about it.</div>
          </div>

          <!-- TRICKS + INTERVIEW PANEL -->
          <div class="jv-panel" id="jv-panel-tricks">
            <div style="font-size:10px;color:#768390;margin-bottom:8px">⚠️ WRONG assumption vs ✓ CORRECT behavior — common JVM gotchas</div>
            ${JV_TRICKS.map(t => `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div style="background:#3d1f1f;border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#f47067;font-weight:bold;margin-bottom:4px">⚠️ WRONG</div>${t.wrong}
                </div>
                <div style="background:#1f3d2d;border:1px solid #57ab5a;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#57ab5a;font-weight:bold;margin-bottom:4px">✓ CORRECT</div>${t.right}
                </div>
              </div>`).join("")}
            <div style="font-size:10px;color:#768390;margin:10px 0 6px">💬 Interview Flash Cards — click to reveal answer</div>
            ${JV_QS.map(q => `
              <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer" onclick="const a=this.querySelector('.jv-qa');a.style.display=a.style.display==='none'?'block':'none'">
                <div style="font-size:11px;color:#cdd9e5;font-weight:bold">Q: ${q.q}</div>
                <div class="jv-qa" style="display:none;font-size:10px;color:#768390;margin-top:6px;border-top:1px solid #30363d;padding-top:6px">${q.a}</div>
              </div>`).join("")}
          </div>
        </div>`;

      // Tab switching
      mount.querySelectorAll(".jv-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          mount.querySelectorAll(".jv-tab").forEach(t => t.classList.remove("active"));
          mount.querySelectorAll(".jv-panel").forEach(p => p.classList.remove("active"));
          tab.classList.add("active");
          mount.querySelector("#jv-panel-" + tab.dataset.tab).classList.add("active");
        });
      });

      // Heap simulation
      let heapState = { eden: [], s0: [], s1: [], old: [], age: new Map() };
      let objCount = 0;
      const heapInfo = mount.querySelector("#jv-heap-info");

      function renderHeap() {
        ["eden","s0","s1","old"].forEach(region => {
          const el = mount.querySelector("#jv-" + region);
          el.innerHTML = "";
          heapState[region].forEach(id => {
            const d = document.createElement("div");
            const age = heapState.age.get(id) || 0;
            d.className = "jv-obj " + (region === "old" ? "promoted" : region === "s0" || region === "s1" ? "young" : "live");
            d.title = "obj" + id + " age=" + age;
            el.appendChild(d);
          });
          mount.querySelector("#jv-" + region + "-stat").textContent = heapState[region].length + " obj";
        });
        // Metaspace: fixed
        const meta = mount.querySelector("#jv-meta");
        if (!meta.children.length) {
          for (let i = 0; i < 6; i++) {
            const d = document.createElement("div");
            d.className = "jv-obj class";
            d.title = "Class metadata";
            meta.appendChild(d);
          }
        }
      }

      mount.querySelector("#jv-alloc").addEventListener("click", () => {
        const n = 8 + Math.floor(Math.random() * 6);
        for (let i = 0; i < n; i++) heapState.eden.push(++objCount);
        renderHeap();
        heapInfo.innerHTML = "<strong>Allocated " + n + " objects in Eden via TLAB.</strong> Total Eden: " + heapState.eden.length + ". When Eden fills → Minor GC fires automatically.";
      });

      mount.querySelector("#jv-minor").addEventListener("click", () => {
        const edenCount = heapState.eden.length;
        if (!edenCount) { heapInfo.innerHTML = "Eden empty — nothing to collect."; return; }
        // 70% die, 30% survive to current survivor
        const survivors = heapState.eden.filter(() => Math.random() > 0.7);
        const died = edenCount - survivors.length;
        // Promote old survivors from S0/S1
        const oldS = heapState.s0.filter(id => (heapState.age.get(id) || 0) >= 2);
        const keepS0 = heapState.s0.filter(id => !oldS.includes(id));
        heapState.old.push(...oldS);
        // Move survivors to S1 (swap)
        heapState.s1 = [...keepS0, ...survivors];
        heapState.s0 = [];
        heapState.eden = [];
        survivors.forEach(id => heapState.age.set(id, (heapState.age.get(id) || 0) + 1));
        renderHeap();
        heapInfo.innerHTML = "<strong>Minor GC complete!</strong> Eden cleared. " + died + " objects died (freed in bulk). " + survivors.length + " survivors copied to S1. " + oldS.length + " objects promoted to Old Gen (age ≥ 2).";
      });

      mount.querySelector("#jv-major").addEventListener("click", () => {
        const before = heapState.old.length;
        heapState.old = heapState.old.filter(() => Math.random() > 0.5);
        const freed = before - heapState.old.length;
        renderHeap();
        heapInfo.innerHTML = "<strong>Major GC (G1 mixed collection)!</strong> Old Gen scanned. " + freed + " long-lived objects freed. " + heapState.old.length + " objects remain. Concurrent marking identified high-garbage regions first.";
      });

      mount.querySelector("#jv-reset-heap").addEventListener("click", () => {
        heapState = { eden: [], s0: [], s1: [], old: [], age: new Map() };
        objCount = 0;
        renderHeap();
        heapInfo.innerHTML = "Heap reset. Press \"Allocate objects\" to begin.";
        mount.querySelector("#jv-meta").innerHTML = "";
      });

      // GC timeline visualization
      function drawTimeline(id, segments) {
        const el = mount.querySelector("#" + id);
        el.innerHTML = "";
        let pos = 0;
        segments.forEach(seg => {
          const div = document.createElement("div");
          div.className = "jv-pause " + seg.type;
          div.style.left = pos + "%";
          div.style.width = seg.w + "%";
          div.title = seg.label;
          el.appendChild(div);
          pos += seg.w;
        });
      }
      drawTimeline("jv-tl-serial",   [{type:"app",w:15,label:"App"},{type:"stw",w:30,label:"Full STW 300ms"},{type:"app",w:10,label:"App"},{type:"stw",w:25,label:"Full STW 250ms"},{type:"app",w:20,label:"App"}]);
      drawTimeline("jv-tl-parallel", [{type:"app",w:30,label:"App"},{type:"stw",w:12,label:"STW 120ms"},{type:"app",w:35,label:"App"},{type:"stw",w:10,label:"STW 100ms"},{type:"app",w:13,label:"App"}]);
      drawTimeline("jv-tl-g1",       [{type:"app",w:40,label:"App"},{type:"conc",w:15,label:"Concurrent mark"},{type:"app",w:10,label:"App"},{type:"stw",w:3,label:"STW 20ms"},{type:"app",w:15,label:"App"},{type:"conc",w:12,label:"Concurrent cleanup"},{type:"app",w:5,label:"App"}]);
      drawTimeline("jv-tl-zgc",      [{type:"app",w:25,label:"App"},{type:"conc",w:20,label:"Concurrent mark"},{type:"app",w:5,label:"App"},{type:"stw",w:1,label:"STW <1ms"},{type:"conc",w:15,label:"Concurrent relocate"},{type:"app",w:34,label:"App"}]);
    },

    concept:
`**L1 (30s ELI5):** JVM is a fake computer inside your computer. Objects live in "heap." Old objects get their own room. GC throws away objects nobody needs anymore.

**L2 (2min core):** Heap = Young Gen (Eden + S0/S1) + Old Gen. New objects → Eden via TLAB (bump-pointer, ≈5 ns). Minor GC copies survivors; age ≥ 15 → promote Old. Metaspace (off-heap): class metadata. Collectors: **G1** (region-based, 200ms pause goal, Java 9 default), **ZGC** (<1ms pause, colored pointers, Java 15+), **Shenandoah** (concurrent compact, Red Hat).

**L3 (10min edge cases):** Humongous allocs (> ½ G1 region) skip Eden → fragment Old Gen → Full GC. Metaspace OOM on redeployment: ClassLoader not GC'd if stale static/thread ref held. \`-Xms ≠ -Xmx\` in containers: heap resize under load → GC pause. ZGC reserves 2.5× virtual address space — inflates docker memory stats.

**L4 (30min deep):** TLAB = per-thread bump-pointer in Eden; refilled via CAS on exhaustion. GC roots: thread stacks, static fields, JNI globals. G1 RSets: card table tracks cross-region dirty refs. ZGC colored pointers: 42-bit address + 4 metadata bits (marked0/1, remapped, finalizable); load barriers fix stale refs on access. Escape analysis at C2: stack-allocates non-escaping objects → zero GC pressure.`,
    why:
"Heap layout and GC choice directly drive **p99 latency** and **throughput**. Misconfigured heaps cause stop-the-world pauses that break SLOs in trading, ads, and chat systems. At scale (`> 32 GB heap`), CompressedOops boundary and GC algorithm choice change throughput by 20–40%.",
    example: {
      language: "java",
      code:
`// JVM flags worth memorising for an interview
// java -Xms4g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \\
//      -XX:+UnlockExperimentalVMOptions -XX:+UseZGC \\
//      -Xlog:gc*,gc+heap=debug:file=gc.log:time,uptime,level,tags

import java.lang.management.*;
import java.util.*;

public class HeapInspector {
    public static void main(String[] args) {
        MemoryMXBean mem = ManagementFactory.getMemoryMXBean();
        System.out.println("Heap     : " + mem.getHeapMemoryUsage());
        System.out.println("NonHeap  : " + mem.getNonHeapMemoryUsage());

        for (MemoryPoolMXBean p : ManagementFactory.getMemoryPoolMXBeans()) {
            System.out.printf("%-24s %-10s %s%n", p.getName(), p.getType(), p.getUsage());
        }
        // Force allocation to watch Eden fill
        List<byte[]> hold = new ArrayList<>();
        for (int i = 0; i < 50; i++) hold.add(new byte[1 << 20]); // 1 MB blocks
    }
}`,
      notes:
"Edge cases: humongous allocations (> 50% of G1 region) skip Eden and go straight to Old; large arrays cause fragmentation. Always pin `-Xms = -Xmx` in containers to avoid resize stalls."
    },
    interview: [
      {
        question: "When would you pick ZGC over G1?",
        answer:
"Pick **ZGC** when p99/p999 latency matters more than peak throughput and the heap is large (> 16 GB). ZGC keeps pause times sub-ms even at 16 TB. **G1** is the safer default for typical 4–32 GB services where 100–200 ms pauses are acceptable and throughput matters.",
        followUps: ["What are colored pointers?", "Cost of ZGC's load barriers?", "Why is generational ZGC faster?"]
      },
      {
        question: "How do you debug a memory leak in production?",
        answer:
"1. Capture a heap dump with `jcmd <pid> GC.heap_dump` or `-XX:+HeapDumpOnOutOfMemoryError`. 2. Open in **Eclipse MAT** or **VisualVM**; look at dominator tree. 3. Inspect retained-size sorted by class. 4. Common culprits: unbounded caches, `ThreadLocal` leaks in pooled threads, JDBC `PreparedStatement` not closed, listeners not unregistered.",
        followUps: ["What is a leak suspect in MAT?", "Why do ThreadLocals leak in Tomcat?"]
      },
      {
        question: "What is a 'humongous' allocation?",
        answer:
"In G1, any object larger than half of a region (regions are 1–32 MB) is allocated directly in contiguous old-gen regions. Many humongous allocations fragment the heap and force full GC. Detect with `-Xlog:gc+heap=debug`.",
        followUps: ["How to tune region size?", "G1 vs Parallel for batch jobs?"]
      }
    ],
    gotchas: [
      "Humongous allocation (> ½ G1 region): skips Eden → goes direct to Old Gen → fragments heap → Full GC. Detect with -Xlog:gc+heap=debug.",
      "-Xms ≠ -Xmx in containers: JVM resizes heap under load → GC pause during resize. Always set equal in prod.",
      "Metaspace OOM after WAR redeployment: old ClassLoader held alive by stale static field, thread, or JDBC driver classref.",
      "ZGC reserves 2.5× virtual address space: docker stats shows inflated 'memory'. It's mostly uncommitted pages — use RSS not VSZ.",
      "synchronized block PINS virtual thread to carrier OS thread. Carrier blocks too — defeats virtual thread benefit. Use ReentrantLock instead.",
      "ThreadLocal in Tomcat pooled thread: request ends, next request gets stale value. Always ThreadLocal.remove() in finally block."
    ],
    tradeoffs: {
      pros: [
        "GC tuning is observable — every collector emits structured logs.",
        "ZGC/Shenandoah remove pause as a tuning lever for low-latency systems.",
        "JIT + escape analysis often outperform hand-written C for hot paths."
      ],
      cons: [
        "Each collector adds CPU/throughput overhead (~10–15% for ZGC).",
        "Memory overhead: G1 keeps remembered sets; ZGC reserves 2.5× virtual address space.",
        "Tuning is heap-shape specific — copy-paste flags rarely transfer."
      ],
      when:
"**G1** for general services. **ZGC** for low-latency, large-heap workloads. **Parallel GC** for short batch jobs where throughput trumps pause. **Serial GC** only for tiny CLI tools."
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
