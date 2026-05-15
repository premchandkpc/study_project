(function() {
  var topic = {
    id: "java-webflux",
    area: "java",
    title: "Reactive Spring (WebFlux) & Project Reactor",
    tag: "Reactive",
    tags: ["webflux", "reactor", "mono", "flux", "backpressure"],
    concept:
`**L1 (30s):** Reactive = event-loop + backpressure. One thread handles thousands of connections. No blocking allowed.
**L2 (2min):** \`Mono<T>\` = 0 or 1 item (like CompletableFuture but lazy + backpressure). \`Flux<T>\` = 0..N stream. Both are *cold* — nothing runs until subscribed. Reactor's event loop (Netty) demultiplexes I/O; your code runs in non-blocking operator chains. **Backpressure**: subscriber calls \`request(n)\`; producer emits ≤ n items.
**L3 (10min):** Schedulers: \`boundedElastic\` for blocking calls (JDBC, files), \`parallel\` for CPU work. \`subscribeOn\` switches where the subscription runs; \`publishOn\` switches where downstream runs. Hot publishers (Sinks, SSE) share items regardless of subscribers. Cold publishers re-run for each subscriber.
**L4 (30min):** Reactor backpressure internals use Reactive Streams spec — \`Publisher/Subscriber/Subscription/Processor\`. \`flatMap\` maintains an internal \`FluxFlatMap\` with configurable concurrency (default 256). Over-concurrency causes \`OutOfMemoryError\`. Context propagation replaces ThreadLocal for MDC trace IDs.`,
    why:
`**Production case:** Ecommerce checkout aggregates 5 external APIs (shipping, inventory, pricing, fraud, loyalty). With MVC + virtual threads all 5 block a thread each. With WebFlux + WebClient, all 5 fly in parallel on 1 thread. Real perf: 1200 RPS on 2 cores, vs 180 RPS blocking equivalent.`,
    flow: {
      title: "Reactive Pipeline: request → operator chain → subscriber",
      caption: "Click each stage to see what executes and when",
      nodes: [
        { id: "src",    label: "Source Publisher",  hint: "Cold — nothing runs until subscribe()" },
        { id: "map",    label: "map/flatMap",        hint: "Transforms items; flatMap concurrency = 256 default" },
        { id: "filter", label: "filter/take",        hint: "Drops items; take(n) cancels upstream automatically" },
        { id: "sched",  label: "publishOn(scheduler)", hint: "Switches thread pool for downstream operators" },
        { id: "sub",    label: "subscribe()",         hint: "Kicks off demand — pulls request(Long.MAX) from source" }
      ],
      steps: [
        { path:["src"],          label:"Subscribe triggers demand",     detail:"subscribe() calls onSubscribe() → Subscription created" },
        { path:["src","map"],    label:"Items flow downstream",          detail:"Source emits → map transforms each item" },
        { path:["map","filter"], label:"Filtering & limiting",           detail:"filter drops items not matching predicate" },
        { path:["filter","sched"],label:"Scheduler handoff",            detail:"publishOn moves execution to boundedElastic pool" },
        { path:["sched","sub"],  label:"Subscriber receives item",       detail:"onNext(item) fires — your business logic runs" }
      ]
    },
    uml: {
      title: "Backpressure protocol: Subscriber controls the flow",
      scenario: "Slow consumer, fast producer — how Reactor prevents OOM",
      actors: [
        { id: "prod",  label: "Producer\n(Flux source)",    hint: "emits items" },
        { id: "op",    label: "Operator\n(flatMap)",         hint: "transforms demand" },
        { id: "sched", label: "Scheduler\n(boundedElastic)", hint: "thread handoff" },
        { id: "cons",  label: "Consumer\n(Subscriber)",      hint: "controls demand" }
      ],
      messages: [
        { from:"cons", to:"op",   label:"request(32)",          detail:"Subscriber signals it wants 32 items" },
        { from:"op",   to:"prod", label:"request(32)",          detail:"Operator propagates demand upstream" },
        { from:"prod", to:"op",   label:"onNext × 32",          detail:"Producer emits exactly 32 items" },
        { from:"op",   to:"sched",label:"transform + enqueue",  detail:"flatMap transforms, schedules on pool" },
        { from:"sched",to:"cons", label:"onNext × 32",          detail:"Processed items delivered to consumer" },
        { from:"cons", to:"op",   label:"request(32) again",    detail:"Consumer ready for more — pulls next batch" },
        { from:"prod", to:"op",   label:"onComplete()",         detail:"Source exhausted — signals completion" },
        { from:"op",   to:"cons", label:"onComplete()",         detail:"Pipeline complete" }
      ]
    },
    architecture: {
      title: "WebFlux stack layers",
      caption: "Each lane = one responsibility",
      lanes: [
        {
          label: "HTTP Layer", hint: "Netty event loop",
          nodes: [
            { id:"netty",  label:"Netty EventLoop",    badge:"non-blocking", hint:"1 thread handles 10k+ connections via selector" },
            { id:"codec",  label:"HttpCodec",           badge:"reactive",    hint:"Streams request/response bytes as Flux<DataBuffer>" }
          ]
        },
        {
          label: "Router / Handler", hint: "Request dispatch",
          nodes: [
            { id:"dispatch",label:"DispatcherHandler", badge:"Mono<Void>",  hint:"WebFlux equivalent of DispatcherServlet" },
            { id:"handler", label:"@RestController",   badge:"Mono/Flux",   hint:"Return Mono<T> or Flux<T> — never block here" }
          ]
        },
        {
          label: "Operators / Schedulers", hint: "Async composition",
          nodes: [
            { id:"flatmap",  label:"flatMap/zip/merge",   badge:"compose",  hint:"flatMap = fan-out; zip = wait for all; merge = race" },
            { id:"elastic",  label:"boundedElastic pool", badge:"blocking", hint:"Only scheduler safe for blocking I/O — wrap with Mono.fromCallable" }
          ]
        },
        {
          label: "Reactive Clients", hint: "Non-blocking I/O",
          nodes: [
            { id:"webclient",label:"WebClient",          badge:"HTTP",     hint:"Non-blocking HTTP — always use instead of RestTemplate in WebFlux" },
            { id:"r2dbc",    label:"R2DBC / ReactiveRedis", badge:"DB",   hint:"Reactive DB drivers — JPA/JDBC block, use Spring Data R2DBC instead" }
          ]
        }
      ],
      links: [
        { from:"netty",   to:"dispatch", label:"HTTP request as Mono",     type:"sync" },
        { from:"dispatch",to:"handler",  label:"Route to controller",       type:"sync" },
        { from:"handler", to:"flatmap",  label:"Compose async operators",   type:"async" },
        { from:"flatmap", to:"webclient",label:"Fan-out HTTP calls",        type:"async" },
        { from:"elastic", to:"handler",  label:"Blocking I/O result",       type:"async" }
      ]
    },
    visual: function(mount) {
      var S = {tab:0};
      var TRICKS = [
        { wrong:"Block inside a Mono chain: .map(x -> blockingService.call(x))",
          right:"Wrap in Mono.fromCallable(() -> blocking()).subscribeOn(Schedulers.boundedElastic())" },
        { wrong:"Use ThreadLocal for MDC/trace — it's lost when thread switches",
          right:"Use Reactor Context: .contextWrite(ctx -> ctx.put(\"traceId\", id))" },
        { wrong:"Attach subscribers inside flatMap with .subscribe() — fire and forget, errors lost",
          right:"Return the inner Mono/Flux from flatMap so the outer chain manages it" },
        { wrong:"EAGER fetch in WebFlux R2DBC relationship — blocks event loop",
          right:"Always LAZY; use @OneToMany + separate query or join in R2DBC query" }
      ];
      var QS = [
        { q:"What's the difference between subscribeOn() and publishOn()?",
          a:"subscribeOn: changes where the SUBSCRIPTION (source emission) runs — usually one per chain. publishOn: changes where DOWNSTREAM operators run — can appear multiple times." },
        { q:"Hot vs Cold publisher?",
          a:"Cold: each subscriber gets its own stream from scratch (HTTP request, file read). Hot: all subscribers share the same stream (SSE, Kafka topic). Flux.share() converts cold to hot." },
        { q:"How to call blocking code in WebFlux?",
          a:"Mono.fromCallable(() -> blockingOp()).subscribeOn(Schedulers.boundedElastic()). Never call blocking code on the event loop thread — it kills throughput for all connections." }
      ];
      var qi = 0, revealed = false;
      function css(){
        if(document.getElementById('wfx-style'))return;
        var s=document.createElement('style');s.id='wfx-style';
        s.textContent=`
.wfx{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:10px;overflow:hidden}
.wfx-tabs{display:flex;background:#161b22;border-bottom:1px solid #30363d}
.wfx-tab{flex:1;padding:10px;border:none;background:none;color:#8b949e;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;border-bottom:2px solid transparent;transition:all .15s}
.wfx-tab.on{color:#58a6ff;border-bottom-color:#58a6ff}
.wfx-body{padding:18px;min-height:320px}
.wfx-pipe{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:16px}
.wfx-node{padding:8px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:2px solid transparent;transition:all .2s}
.wfx-arrow{color:#30363d;font-size:16px;font-weight:700}
.wfx-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;line-height:1.6;min-height:60px;margin-top:10px}
.wfx-trick-card{background:#161b22;border-radius:8px;padding:14px;margin-bottom:10px}
.wfx-bad{background:#da363622;border:1px solid #f8514966;border-radius:6px;padding:8px 12px;margin-bottom:6px;font-size:12px;color:#f85149}
.wfx-good{background:#23863622;border:1px solid #3fb95066;border-radius:6px;padding:8px 12px;font-size:12px;color:#3fb950}
.wfx-bad::before{content:"⚠️ Wrong: ";font-weight:700}
.wfx-good::before{content:"✓ Right: ";font-weight:700}
.wfx-q{background:#1f6feb22;border:1px solid #58a6ff66;border-radius:8px;padding:14px;text-align:center}
.wfx-q-text{font-size:14px;color:#58a6ff;font-weight:700;margin-bottom:12px}
.wfx-a{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;line-height:1.6;color:#3fb950;margin-top:10px;display:none}
.wfx-btn{background:#238636;color:#fff;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit}
.wfx-btn2{background:#1f6feb;color:#fff;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;margin-left:8px}
        `;
        document.head.appendChild(s);
      }
      var NODES=[
        {id:'src',label:'Mono.fromCallable',color:'#1f6feb',info:'Cold publisher — nothing runs until subscribe(). Wraps blocking code safely with .subscribeOn(Schedulers.boundedElastic())'},
        {id:'map',label:'.flatMap()',        color:'#f0883e',info:'Fan-out: each item spawns a new Mono/Flux. Concurrency limit default=256. Use .flatMap(fn, maxConcurrency) to throttle.'},
        {id:'zip',label:'.zip() / .merge()',  color:'#a371f7',info:'zip: wait for ALL streams to emit one item each. merge: take from whichever fires first. Use zip for aggregation, merge for racing.'},
        {id:'pub',label:'.publishOn(pool)',   color:'#3fb950',info:'Thread handoff. publishOn(boundedElastic) for blocking I/O. publishOn(parallel) for CPU. subscribeOn affects source only.'},
        {id:'sub',label:'.subscribe()',       color:'#f1b150',info:'Activates the chain. subscribe() is fire-and-forget — use block() in tests only, never in production reactive code.'}
      ];
      var active=0;
      function render(){
        css();
        mount.innerHTML=`
<div class="wfx">
  <div class="wfx-tabs">
    <button class="wfx-tab ${S.tab===0?'on':''}" id="wfx-t0">🔄 Pipeline Flow</button>
    <button class="wfx-tab ${S.tab===1?'on':''}" id="wfx-t1">⚡ Backpressure</button>
    <button class="wfx-tab ${S.tab===2?'on':''}" id="wfx-t2">⚠️ Tricky + Interview</button>
  </div>
  <div class="wfx-body" id="wfx-body"></div>
</div>`;
        mount.querySelector('#wfx-t0').onclick=()=>{S.tab=0;render()};
        mount.querySelector('#wfx-t1').onclick=()=>{S.tab=1;render()};
        mount.querySelector('#wfx-t2').onclick=()=>{S.tab=2;render()};
        renderBody();
      }
      function renderBody(){
        var b=mount.querySelector('#wfx-body');
        if(S.tab===0){
          b.innerHTML='<div style="font-size:11px;color:#8b949e;margin-bottom:12px">Click each operator to see its production gotcha</div>'
            +'<div class="wfx-pipe">'+NODES.map((n,i)=>`<span class="wfx-node" id="wn${i}" style="background:${n.color}22;border-color:${active===i?n.color:'#30363d'};color:${n.color}">${n.label}</span>${i<NODES.length-1?'<span class="wfx-arrow">→</span>':''}`).join('')+'</div>'
            +`<div class="wfx-info" id="wfx-info">${NODES[active].info}</div>`;
          NODES.forEach((_,i)=>{
            mount.querySelector('#wn'+i).onclick=()=>{active=i;renderBody()};
          });
        } else if(S.tab===1){
          var stages=[
            {label:'subscribe()',bg:'#1f6feb',info:'Consumer calls request(32) — pulls demand from source'},
            {label:'request(32)',bg:'#f0883e',info:'Demand propagates UP the chain to producer'},
            {label:'emit × 32',  bg:'#3fb950',info:'Producer emits EXACTLY 32 items, no more'},
            {label:'buffer',      bg:'#a371f7',info:'Operator buffers pending transforms in bounded queue'},
            {label:'onNext × 32',bg:'#f1b150',info:'32 processed items land at subscriber'},
            {label:'request(32)',bg:'#1f6feb',info:'Consumer signals ready for next batch — pull-based!'}
          ];
          var si=0;
          function drawBP(){
            b.innerHTML='<div style="font-size:12px;color:#8b949e;margin-bottom:12px">Backpressure = pull model. Subscriber controls rate — producer never overruns.</div>'
              +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+stages.map((st,i)=>`<div style="padding:8px 12px;border-radius:8px;background:${si===i?st.bg+'33':'#21262d'};border:2px solid ${si===i?st.bg:'#30363d'};color:${si===i?st.bg:'#8b949e'};font-size:11px;font-weight:700;cursor:pointer" id="bps${i}">${st.label}</div>`).join('')+'</div>'
              +`<div class="wfx-info">${stages[si].info}</div>`
              +`<div style="margin-top:10px;display:flex;gap:8px"><button class="wfx-btn" id="bpPrev">◀ Prev</button><button class="wfx-btn2" id="bpNext">Next ▶</button><span style="font-size:11px;color:#8b949e;margin-left:auto;align-self:center">${si+1}/${stages.length}</span></div>`;
            stages.forEach((_,i)=>{mount.querySelector('#bps'+i).onclick=()=>{si=i;drawBP()};});
            mount.querySelector('#bpPrev').onclick=()=>{si=Math.max(0,si-1);drawBP()};
            mount.querySelector('#bpNext').onclick=()=>{si=Math.min(stages.length-1,si+1);drawBP()};
          }
          drawBP();
        } else {
          var trickHtml=TRICKS.map((t,i)=>`<div class="wfx-trick-card"><div style="font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Trap ${i+1}</div><div class="wfx-bad">${t.wrong}</div><div class="wfx-good">${t.right}</div></div>`).join('');
          b.innerHTML=`<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Common Mistakes</div>${trickHtml}`
            +`<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin:14px 0 10px">Interview Mode</div>`
            +`<div class="wfx-q"><div class="wfx-q-text" id="wfx-qtext">${QS[qi].q}</div><button class="wfx-btn" id="wfx-reveal">Reveal Answer</button><button class="wfx-btn2" id="wfx-next">Next Q ▶</button><div class="wfx-a" id="wfx-ans">${QS[qi].a}</div></div>`;
          mount.querySelector('#wfx-reveal').onclick=()=>{revealed=true;mount.querySelector('#wfx-ans').style.display='block'};
          mount.querySelector('#wfx-next').onclick=()=>{qi=(qi+1)%QS.length;revealed=false;renderBody()};
        }
      }
      render();
    },
    gotchas: [
      "Never call `.block()` inside a reactive chain — deadlock on the event loop",
      "ThreadLocal (MDC, security context) is lost on thread switches — use Reactor Context",
      "`.subscribe()` inside `.flatMap()` = fire-and-forget, errors silently swallowed",
      "WebClient without `.timeout()` will wait forever — always set a deadline",
      "Hot publisher (Sinks) drops items if no subscriber yet — buffer or replay sink needed",
      "boundedElastic pool is bounded (default 10×CPU) — too much blocking I/O = queue buildup"
    ],
    example: {
      language: "java",
      code:
`@RestController @RequiredArgsConstructor
class QuoteController {
    private final WebClient client;

    @GetMapping(value="/quote/{sku}", produces=APPLICATION_NDJSON_VALUE)
    Flux<Quote> quote(@PathVariable String sku) {
        Flux<Quote> a = vendor("https://vendor-a/quote/" + sku);
        Flux<Quote> b = vendor("https://vendor-b/quote/" + sku);
        Flux<Quote> c = vendor("https://vendor-c/quote/" + sku);
        return Flux.merge(a, b, c)
            .timeout(Duration.ofMillis(800))
            .onErrorResume(e -> Flux.empty())
            .take(2);
    }

    private Flux<Quote> vendor(String url) {
        return client.get().uri(url).retrieve()
            .bodyToFlux(Quote.class)
            .subscribeOn(Schedulers.parallel());
    }
}`
    },
    interview: [
      { question:"Mono vs Flux vs CompletableFuture — key differences?",
        answer:"`CompletableFuture` is eager (starts immediately), single result, no backpressure. `Mono` is lazy, 0/1 item, backpressure aware. `Flux` is lazy, 0..N, full reactive streams. Reactor pipelines compose streaming + error handling cleanly.",
        followUps:["Hot vs cold publisher?","When does subscribeOn vs publishOn matter?"] },
      { question:"How does backpressure flow through flatMap?",
        answer:"Subscriber calls `request(n)`. flatMap maintains an inner subscriber with its own demand. Default maxConcurrency=256. If inner Monos complete faster than outer demand, extras queue. Set flatMap(fn, concurrency) to throttle.",
        followUps:["What is onBackpressureBuffer?","How do you size flatMap concurrency?"] },
      { question:"WebFlux vs virtual threads — when to choose each?",
        answer:"WebFlux: streaming (SSE, WebSocket), high-fanout aggregation, existing reactive codebase. Virtual threads + MVC: simpler code, same scalability for CRUD, easier debugging, no operator chains.",
        followUps:["Can you mix both in one app?","R2DBC vs JDBC with virtual threads?"] }
    ],
    tradeoffs: {
      pros:["Few threads handle massive connection counts","First-class backpressure","Composable streaming operators","WebClient supports connection pooling + timeouts"],
      cons:["Steep learning curve, noisy stack traces","ThreadLocal requires Context propagation","R2DBC ecosystem thinner than JPA","Debugging async chains is hard"],
      when:`**Streaming, SSE, WebSocket, high-fanout aggregators.** For CRUD in Java 21+, virtual threads + MVC is simpler and equally scalable.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
