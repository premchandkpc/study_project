(function() {
  var topic = {
    id: "java-jit-performance",
    area: "java",
    title: "JIT, Escape Analysis & Java Performance",
    tag: "Perf",
    tags: ["jit", "c1", "c2", "escape-analysis", "jmh", "profiling"],
    concept:
`**L1 (30s):** JVM starts slow, gets faster as JIT compiles hot code. Escape analysis eliminates heap allocations for short-lived objects.
**L2 (2min):** Tiered compilation: T0 (interpreter) → T1/T2 (C1 light) → T3 (C1 full profile) → T4 (C2 optimised). C2 does heavy optimisations: method inlining, loop unrolling, vectorisation. JVM deoptimises when assumptions break (megamorphic call sites).
**L3 (10min):** Escape analysis: if an object never escapes a method/thread, JIT allocates it on stack (scalar replacement). Eliminates GC pressure. Breaks: objects stored in fields, returned, passed to unresolved callees. Inline caches: monomorphic (fast) → bimorphic → megamorphic (slow — IC fails, virtual dispatch).
**L4 (30min):** C2 IR = sea-of-nodes graph. TLAB (Thread-Local Allocation Buffer) — object allocation is a pointer bump, ~5ns. Major GC pause = stop-the-world. JFR + async-profiler = production profiling without overhead. VarHandle replaces Unsafe for memory fence operations. Graal JIT (EE/CE) = alternative C2 written in Java — supports AOT for native-image.`,
    why:
`**Production win:** Checkout service's hot path allocating ~50 BigDecimal objects per request. 10K RPS = 500K objects/sec = constant Minor GC pressure, 5ms pauses every 200ms. Profiled with async-profiler: BigDecimal.multiply allocates heavily. Refactored to long arithmetic (scaled integers). GC pressure drops 80%, p99 latency 5ms → 0.8ms.`,
    flow: {
      title: "JIT Tiered Compilation: warm-up to full optimisation",
      caption: "Click each tier to see what happens",
      nodes: [
        { id:"t0", label:"T0: Interpreter",  hint:"Executes bytecode directly. ~100ns/op. Counts method calls + loop iterations." },
        { id:"t1", label:"T1: C1 Simple",    hint:"Fast compile, minimal opt. 2,000 invocations threshold." },
        { id:"t2", label:"T2: C1 Limited",   hint:"C1 with some profiling instrumentation." },
        { id:"t3", label:"T3: C1 Full",      hint:"Full profiling: type feedback, branch counts. Feeds C2." },
        { id:"t4", label:"T4: C2 Optimised", hint:"10,000 invocations threshold. Inlining, EA, loop opts, vectorisation." }
      ],
      steps: [
        { path:["t0"],     label:"Interpreter starts",        detail:"First run: bytecode interpreted, invocation counters incremented" },
        { path:["t0","t1"],label:"Quick C1 compile",          detail:"2000 invocations → C1 compiles with minimal profiling" },
        { path:["t1","t3"],label:"Profile accumulation",      detail:"C1 instruments: which types hit this call site, which branches taken" },
        { path:["t3","t4"],label:"C2 optimisation",           detail:"10K invocations + rich profile → C2 inlines, scalar replaces, vectorises" },
        { path:["t4","t0"],label:"Deoptimisation",            detail:"Assumption broken (new class loaded, megamorphic) → fall back to interpreter, re-profile" }
      ]
    },
    uml: {
      title: "Escape Analysis: stack vs heap allocation decision",
      scenario: "JIT decides where to allocate a Point object",
      actors: [
        { id:"code",  label:"Method\ndistance()",   hint:"creates new Point(x,y)" },
        { id:"ea",    label:"Escape\nAnalysis",       hint:"C2 analysis pass" },
        { id:"stack", label:"Stack\n(fast)",           hint:"auto-freed on return" },
        { id:"heap",  label:"Heap\n(GC managed)",      hint:"GC pressure" }
      ],
      messages: [
        { from:"code", to:"ea",    label:"new Point(3,4) created",       detail:"C2 EA analyses: does this object escape?" },
        { from:"ea",   to:"ea",    label:"check: stored in field?",       detail:"No — local var only" },
        { from:"ea",   to:"ea",    label:"check: returned?",              detail:"No — only used in distance calculation" },
        { from:"ea",   to:"ea",    label:"check: passed to opaque call?", detail:"No — all callees are inlined" },
        { from:"ea",   to:"stack", label:"scalar replace → stack alloc",  detail:"Point(x,y) decomposed to 2 int locals — ZERO allocation, zero GC" },
        { from:"code", to:"heap",  label:"ESCAPES: stored in list.add()", detail:"Object escapes method → heap allocated, subject to GC" }
      ]
    },
    architecture: {
      title: "Java performance toolchain",
      caption: "From hot code to profiling to tuning",
      lanes: [
        {
          label:"JIT Compiler", hint:"HotSpot optimisations",
          nodes:[
            {id:"inline",  label:"Method Inlining",     badge:"key opt",   hint:"Removes call overhead + enables further opts. Limited by MaxInlineSize."},
            {id:"escape",  label:"Escape Analysis",      badge:"stack alloc",hint:"Allocate short-lived objects on stack. Check: -XX:+PrintEliminateAllocations"},
            {id:"loop",    label:"Loop Unrolling/SIMD",  badge:"vector",    hint:"JDK 17+ Vector API enables explicit SIMD. C2 auto-vectorises simple loops."}
          ]
        },
        {
          label:"Memory / Allocation", hint:"Object lifecycle",
          nodes:[
            {id:"tlab",  label:"TLAB Bump-Pointer",      badge:"~5ns",      hint:"Thread-local allocation buffer — allocation = pointer bump, no lock"},
            {id:"gc",    label:"GC Tuning",               badge:"ZGC/G1",    hint:"ZGC: sub-1ms pauses. G1: throughput. Serial/Parallel: batch processing."}
          ]
        },
        {
          label:"Profiling Tools", hint:"Measure before tuning",
          nodes:[
            {id:"jfr",   label:"JFR / JMC",              badge:"built-in",  hint:"Java Flight Recorder — <2% overhead. CPU, alloc, lock contention."},
            {id:"async", label:"async-profiler",          badge:"native",    hint:"Async-signal-safe. CPU + allocation + lock profiles. Flamegraph output."},
            {id:"jmh",   label:"JMH Benchmarks",         badge:"correct",   hint:"Only correct way to microbenchmark. Warmup, Blackhole.consume, forks."}
          ]
        },
        {
          label:"Deoptimisation Triggers", hint:"When JIT gives up",
          nodes:[
            {id:"mega",  label:"Megamorphic call site",   badge:"slow",      hint:">2 concrete types at a call site → inline cache miss → virtual dispatch"},
            {id:"classload",label:"New class loaded",     badge:"rare",      hint:"Speculative inline becomes invalid — uncommon trap fires"},
            {id:"osr",   label:"On-Stack Replacement",    badge:"OSR",       hint:"Replaces running interpreter frame with compiled code mid-loop"}
          ]
        }
      ],
      links:[
        {from:"inline", to:"escape",    label:"inlining enables EA",        type:"sync"},
        {from:"tlab",   to:"gc",        label:"TLAB exhaustion → Minor GC", type:"async"},
        {from:"jfr",    to:"mega",      label:"detects megamorphic sites",  type:"sync"},
        {from:"async",  to:"inline",    label:"reveals missing inlines",    type:"sync"}
      ]
    },
    visual: function(mount) {
      var S = {tab:0, qi:0};
      var TRICKS = [
        {wrong:'Microbenchmark with a plain main() method gives accurate results',
         right:'No warmup = interpreter, not JIT. Dead-code elimination removes results. Use JMH with @Warmup(iterations=5), multiple @Fork, Blackhole.consume().'},
        {wrong:'"String + concat is slow, always use StringBuilder"',
         right:'JDK 9+ uses invokedynamic + StringConcatFactory. Simple string + is equivalent to StringBuilder. String.format() is still 8-10x slower due to parsing.'},
        {wrong:'Object allocation is expensive in Java',
         right:'TLAB bump-pointer allocation is ~5ns. Short-lived objects optimised by escape analysis (stack alloc). GC overhead comes from SURVIVING objects, not allocations.'},
        {wrong:'@Transactional readOnly=true has no performance impact',
         right:'readOnly=true disables dirty checking (Hibernate skips snapshotting all managed entities on flush). Big win under load. Also signals read-replica routing in some setups.'}
      ];
      var QS = [
        {q:'What is escape analysis? How do you verify it fired?',
         a:'C2 proves object doesn\'t escape method/thread → allocates on stack (scalar replacement). Verify: -XX:+UnlockDiagnosticVMOptions -XX:+PrintEliminateAllocations. Measure: async-profiler --alloc to see allocation rate before/after.'},
        {q:'Why are microbenchmarks usually wrong without JMH?',
         a:'Three problems: (1) no warmup — measuring interpreter code, (2) dead code elimination — JIT removes unused results, (3) constant folding — inputs become compile-time constants. JMH solves all three: Blackhole.consume, @State, multiple forks.'},
        {q:'What is a megamorphic call site and why is it slow?',
         a:'JIT inline cache supports 1-2 concrete types (mono/bimorphic). With 3+ types the IC becomes megamorphic — no inline possible, falls back to virtual dispatch. 3-5x slower than inlined call. Fix: use final classes, limit polymorphism in hot paths.'}
      ];
      var TIERS=[
        {tier:'T0',label:'Interpreter',    color:'#8b949e', speed:'~100ns', info:'Pure bytecode interpretation. No compilation. Fast startup, slow execution. Counts invocations.'},
        {tier:'T1',label:'C1 Simple',      color:'#58a6ff', speed:'~20ns',  info:'Quick C1 compile, minimal profiling. 2000 invocation threshold. 3-5x faster than interpreter.'},
        {tier:'T2',label:'C1 Limited',     color:'#1f6feb', speed:'~15ns',  info:'C1 with some type feedback collection. Prepares profile for C2.'},
        {tier:'T3',label:'C1 Full Profile',color:'#a371f7', speed:'~15ns',  info:'Full C1 profiling: type feedback, branch counters. Rich data for C2 speculative opts.'},
        {tier:'T4',label:'C2 Optimised',   color:'#3fb950', speed:'~3ns',   info:'Maximum optimisation. Inlining, escape analysis, loop unrolling, vectorisation. Can deoptimise if assumptions break.'}
      ];
      function css(){
        if(document.getElementById('jit-style'))return;
        var s=document.createElement('style');s.id='jit-style';
        s.textContent=`
.jit{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:10px;overflow:hidden}
.jit-tabs{display:flex;background:#161b22;border-bottom:1px solid #30363d}
.jit-tab{flex:1;padding:10px;border:none;background:none;color:#8b949e;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;border-bottom:2px solid transparent;transition:all .15s}
.jit-tab.on{color:#3fb950;border-bottom-color:#3fb950}
.jit-body{padding:18px;min-height:320px}
.jit-tier-row{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
.jit-tier-btn{padding:7px 12px;border-radius:5px;border:2px solid #30363d;background:#21262d;color:#8b949e;font-size:11px;cursor:pointer;font-family:inherit;font-weight:700}
.jit-bar-wrap{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.jit-bar-label{font-size:11px;color:#8b949e;width:80px}
.jit-bar-track{flex:1;height:14px;background:#21262d;border-radius:3px;overflow:hidden}
.jit-bar-fill{height:100%;border-radius:3px;transition:width .4s}
.jit-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;line-height:1.6}
.jit-trick{background:#161b22;border-radius:8px;padding:12px;margin-bottom:8px}
.jit-bad{background:#da363622;border:1px solid #f8514966;border-radius:6px;padding:8px;font-size:12px;color:#f85149;margin-bottom:5px}
.jit-bad::before{content:"⚠️ Wrong: ";font-weight:700}
.jit-good{background:#23863622;border:1px solid #3fb95066;border-radius:6px;padding:8px;font-size:12px;color:#3fb950}
.jit-good::before{content:"✓ Right: ";font-weight:700}
.jit-qbox{background:#1f6feb22;border:1px solid #58a6ff66;border-radius:8px;padding:14px;text-align:center}
.jit-qtext{font-size:13px;color:#58a6ff;font-weight:700;margin-bottom:12px}
.jit-ans{background:#161b22;border:1px solid #3fb95066;border-radius:8px;padding:12px;font-size:12px;color:#3fb950;margin-top:10px;display:none;text-align:left}
.jit-btn{background:#238636;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit}
.jit-btn2{background:#3fb950;color:#0d1117;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;margin-left:8px}
        `;
        document.head.appendChild(s);
      }
      var selT=0, selEA=0;
      var EA_CASES=[
        {label:'Stack alloc (escapes=false)', color:'#3fb950', info:'new Point(x,y) used only locally → C2 scalar replaces: x and y become int stack variables. Zero heap allocation, zero GC.'},
        {label:'Heap alloc (list.add)',        color:'#f85149', info:'list.add(new Point(x,y)) — object escapes via parameter. Must be heap-allocated. Subject to GC.'},
        {label:'Heap alloc (return)',          color:'#f1b150', info:'return new Point(x,y) — escapes via return value. Heap allocated. Caller decides lifetime.'},
        {label:'Thread escapes (volatile)',    color:'#a371f7', info:'volatile field = escapes to another thread → heap alloc. EA only scalar-replaces thread-local objects.'}
      ];
      function render(){
        css();
        mount.innerHTML=`<div class="jit"><div class="jit-tabs">`
          +`<button class="jit-tab ${S.tab===0?'on':''}" id="jtt0">🚀 JIT Tiers</button>`
          +`<button class="jit-tab ${S.tab===1?'on':''}" id="jtt1">📦 Escape Analysis</button>`
          +`<button class="jit-tab ${S.tab===2?'on':''}" id="jtt2">⚠️ Tricky + Interview</button>`
          +`</div><div class="jit-body" id="jit-body"></div></div>`;
        mount.querySelector('#jtt0').onclick=()=>{S.tab=0;render()};
        mount.querySelector('#jtt1').onclick=()=>{S.tab=1;render()};
        mount.querySelector('#jtt2').onclick=()=>{S.tab=2;render()};
        renderBody();
      }
      function renderBody(){
        var b=mount.querySelector('#jit-body');
        if(S.tab===0){
          var speeds=[100,20,15,15,3];
          b.innerHTML='<div style="font-size:11px;color:#8b949e;margin-bottom:10px">Click each tier — see relative speed and what JIT does</div>'
            +'<div class="jit-tier-row">'+TIERS.map((t,i)=>`<button class="jit-tier-btn" id="jtt${i}" style="border-color:${selT===i?t.color:'#30363d'};color:${selT===i?t.color:'#8b949e'};background:${selT===i?t.color+'22':'#21262d'}">${t.tier} ${t.label}</button>`).join('')+'</div>'
            +'<div style="margin-bottom:12px">'+TIERS.map((t,i)=>`<div class="jit-bar-wrap"><div class="jit-bar-label" style="color:${t.color}">${t.speed}</div><div class="jit-bar-track"><div class="jit-bar-fill" style="width:${(100/speeds[i])*2}%;background:${t.color}"></div></div><span style="font-size:10px;color:#8b949e">${t.tier}</span></div>`).join('')+'</div>'
            +`<div class="jit-info">${TIERS[selT].info}</div>`;
          TIERS.forEach((_,i)=>{mount.querySelector('#jtt'+i).onclick=()=>{selT=i;renderBody()}});
        } else if(S.tab===1){
          b.innerHTML='<div style="font-size:11px;color:#8b949e;margin-bottom:10px">Escape Analysis: does this object leave the method? → determines allocation site</div>'
            +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+EA_CASES.map((c,i)=>`<button style="padding:6px 10px;border-radius:5px;border:2px solid ${selEA===i?c.color:'#30363d'};background:${selEA===i?c.color+'22':'#21262d'};color:${selEA===i?c.color:'#8b949e'};font-size:11px;cursor:pointer;font-family:inherit;font-weight:600" id="eac${i}">${c.label}</button>`).join('')+'</div>'
            +`<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px"><div style="font-size:28px;font-weight:800;color:${EA_CASES[selEA].color}">${selEA===0?'Stack':'Heap'}</div><div style="font-size:12px;color:${EA_CASES[selEA].color};font-weight:700">${selEA===0?'✓ Zero allocation':'⚠️ GC pressure'}</div></div>`
            +`<div class="jit-info">${EA_CASES[selEA].info}</div>`;
          EA_CASES.forEach((_,i)=>{mount.querySelector('#eac'+i).onclick=()=>{selEA=i;renderBody()}});
        } else {
          b.innerHTML='<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin-bottom:10px">Common Mistakes</div>'
            +TRICKS.map((t,i)=>`<div class="jit-trick"><div style="font-size:10px;color:#8b949e;margin-bottom:5px">Trap ${i+1}</div><div class="jit-bad">${t.wrong}</div><div class="jit-good">${t.right}</div></div>`).join('')
            +'<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin:14px 0 10px">Interview Mode</div>'
            +`<div class="jit-qbox"><div class="jit-qtext" id="jit-qt">${QS[S.qi].q}</div><button class="jit-btn" id="jit-rev">Reveal Answer</button><button class="jit-btn2" id="jit-nxt">Next Q ▶</button><div class="jit-ans" id="jit-an">${QS[S.qi].a}</div></div>`;
          mount.querySelector('#jit-rev').onclick=()=>{mount.querySelector('#jit-an').style.display='block'};
          mount.querySelector('#jit-nxt').onclick=()=>{S.qi=(S.qi+1)%QS.length;renderBody()};
        }
      }
      render();
    },
    gotchas: [
      "Microbenchmarks without JMH lie — dead-code elimination, constant folding, no warmup",
      "String + concat is NOT slow in JDK 9+ (invokedynamic). String.format() IS 8-10x slower",
      "Escape analysis breaks if object passed to non-inlined method — inline cache miss disables EA",
      "GC overhead from SURVIVING objects, not allocations. Allocation itself is ~5ns (TLAB bump)",
      "Megamorphic call sites (3+ concrete types) disable inlining → 3-5x slowdown in hot paths",
      "Deoptimisation is silent — JVM falls back to interpreter, you need JFR to detect it"
    ],
    example: {
      language: "java",
      code:
`// JMH benchmark — the ONLY correct way to microbenchmark Java
@BenchmarkMode(Mode.AverageTime) @OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Thread) @Fork(2) @Warmup(iterations=5) @Measurement(iterations=10)
public class StringConcatBench {
    String a="hello"; String b="world"; int n=42;

    @Benchmark public String plus()    { return a + " " + b + " " + n; }
    @Benchmark public String builder() {
        return new StringBuilder().append(a).append(' ').append(b).append(' ').append(n).toString();
    }
    @Benchmark public String fmt() { return String.format("%s %s %d", a, b, n); }
    // Result on JDK 21: plus ≈ builder (~12ns). fmt = 120ns — 10x slower.
}

// Escape Analysis: this allocation is FREE — scalar replaced
double distance(int x1,int y1,int x2,int y2){
    // JIT: no Point object created on heap, x/y are stack ints
    return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));
}`
    },
    interview: [
      { question:"What is escape analysis and how do you verify it?",
        answer:"C2 proves object doesn't escape method/thread → scalar replacement (stack allocation). Zero GC pressure. Verify: -XX:+PrintEliminateAllocations. Measure: async-profiler --alloc event before/after.",
        followUps:["Why do anonymous classes break EA?","Lambda capture and EA?"] },
      { question:"Why are microbenchmarks usually wrong?",
        answer:"(1) No warmup = measuring interpreter, (2) Dead-code elimination = JIT removes unused results, (3) Constant folding = inputs become compile-time constants. Use JMH: @Warmup, Blackhole.consume(), @State, multiple @Fork.",
        followUps:["What is OSR (on-stack replacement)?","Bimodal distributions in benchmarks?"] },
      { question:"Megamorphic call site — what is it and how to fix?",
        answer:"Inline cache supports 2 types (bimorphic). With 3+ the IC becomes megamorphic — JIT can't inline → virtual dispatch → 3-5x slower. Fix: fewer concrete types at hot call sites, use final classes in hot paths, split polymorphic collections.",
        followUps:["What is the inline cache and how does it work?","Profile with JFR to detect?"] }
    ],
    tradeoffs: {
      pros:["JIT specialises to actual call sites — often beats AOT","TLAB allocation ~5ns — cheapest of any runtime","JFR + async-profiler are best-in-class profiling tools"],
      cons:["Warmup cost matters for short-lived processes (CLIs, lambdas)","Deoptimisation cliffs from megamorphic sites","C2 bugs rare but real — pin JDK versions in prod"],
      when:`**HotSpot** for long-running services where warmup time is acceptable. **GraalVM native-image** for CLIs, lambdas, sidecars where startup time dominates.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
