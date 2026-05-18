(function() {
  var topic = {
    id: "kafka-streams",
    area: "kafka",
    title: "Kafka Streams",
    tag: "streams",
    tags: ["kafka","streams","KStream","KTable","windowing","stateful","topology"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.ksw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.ks-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.ksbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.ksbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.ksp{display:none}.ksp.on{display:block}
.ks-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.ks-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.ks-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.ks-info b{color:#e8741a}
.ks-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ks-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.ks-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.ks-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.ks-node{display:flex;flex-direction:column;align-items:center;gap:4px}
.ks-node-box{padding:8px 14px;border-radius:8px;border:2px solid;font-size:12px;font-weight:600;text-align:center;min-width:100px;transition:all .3s}
.ks-node-box.source{border-color:#58a6ff;background:#58a6ff15;color:#58a6ff}
.ks-node-box.proc{border-color:#e8741a;background:#e8741a15;color:#e8741a}
.ks-node-box.sink{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.ks-node-box.store{border-color:#d2a8ff;background:#d2a8ff15;color:#d2a8ff}
.ks-node-box.active{box-shadow:0 0 12px currentColor;transform:scale(1.05)}
.ks-node-label{font-size:10px;color:#8b949e}
.ks-arrow{font-size:20px;color:#e8741a;margin:0 4px}
.ks-flow-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0}
.ks-record{display:inline-flex;flex-direction:column;align-items:center;margin:3px}
.ks-record-box{padding:5px 10px;border-radius:6px;border:1px solid;font-size:11px;font-weight:600;transition:all .3s}
.ks-record-box.stream{border-color:#58a6ff;color:#58a6ff;background:#58a6ff15}
.ks-record-box.filtered{border-color:#30363d;color:#30363d;background:#0d1117;opacity:.3;text-decoration:line-through}
.ks-record-box.mapped{border-color:#e8741a;color:#e8741a;background:#e8741a15}
.ks-record-box.agg{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.ks-record-box.joined{border-color:#d2a8ff;color:#d2a8ff;background:#d2a8ff15}
.ks-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.ks-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.ks-window-box{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;display:inline-block;margin:4px;font-size:11px;text-align:center;min-width:80px;transition:all .3s}
.ks-window-box.active{border-color:#e8741a;background:#e8741a15}
.ks-window-box.closed{border-color:#3dd68c;background:#3dd68c15}
.ks-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.ks-trick b{color:#f5b944}
.ks-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.ks-q-card .q{font-size:13px;font-weight:600}
.ks-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.ks-q-card.open .a{display:block}.ks-q-card.open{border-color:#e8741a}
</style>
<div class="ksw">
  <div class="ks-tabs">
    <button class="ksbtn on" data-tab="topology">Stream Topology</button>
    <button class="ksbtn" data-tab="kstream">KStream vs KTable</button>
    <button class="ksbtn" data-tab="windowing">Windowing</button>
    <button class="ksbtn" data-tab="joins">Joins</button>
    <button class="ksbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- TOPOLOGY -->
  <div class="ksp on" id="ks-topology">
    <div class="ks-info" id="ks-tinfo">Kafka Streams is a client library. Topology = DAG of Source → Processor → Sink nodes. Each task handles one partition.</div>
    <div class="ks-box">
      <h4>Processing Topology</h4>
      <div class="ks-flow-row" id="ks-topo-nodes"></div>
    </div>
    <div class="ks-box" style="margin-top:4px">
      <h4>Records in flight</h4>
      <div id="ks-topo-records" style="display:flex;flex-wrap:wrap;gap:4px;min-height:40px"></div>
    </div>
    <div class="ks-ctrls">
      <button id="ks-tprev">◀ Prev</button>
      <button id="ks-tplay">▶ Play</button>
      <button id="ks-tnext">Next ▶</button>
      <button id="ks-treset">↺ Reset</button>
      <span class="ks-step-info" id="ks-tstep">Step 1/6</span>
    </div>
  </div>

  <!-- KSTREAM vs KTABLE -->
  <div class="ksp" id="ks-kstream">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="ks-box" style="border-color:#58a6ff44">
        <h4 style="color:#58a6ff">KStream</h4>
        <div style="font-size:12px;color:#8b949e;line-height:1.6;margin-bottom:8px">Unbounded sequence of events. Each record is an independent event. All records kept. Like a stream of transactions.</div>
        <div style="font-size:11px">
          <div style="color:#3dd68c;margin-bottom:3px">✓ Append only</div>
          <div style="color:#3dd68c;margin-bottom:3px">✓ All history preserved</div>
          <div style="color:#3dd68c;margin-bottom:3px">✓ map, filter, flatMap</div>
          <div style="color:#f47067">✗ No latest-per-key semantics</div>
        </div>
      </div>
      <div class="ks-box" style="border-color:#e8741a44">
        <h4 style="color:#e8741a">KTable</h4>
        <div style="font-size:12px;color:#8b949e;line-height:1.6;margin-bottom:8px">Changelog stream. Latest value per key. Like a materialized view. New record = upsert. Backed by compacted topic.</div>
        <div style="font-size:11px">
          <div style="color:#3dd68c;margin-bottom:3px">✓ Latest state per key</div>
          <div style="color:#3dd68c;margin-bottom:3px">✓ Upsert semantics</div>
          <div style="color:#3dd68c;margin-bottom:3px">✓ Efficient joins with streams</div>
          <div style="color:#f47067">✗ State store needed</div>
        </div>
      </div>
    </div>
    <div id="ks-dual-sim">
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="ks-stab on" data-ks="stream-view">KStream View</button>
        <button class="ks-stab" data-ks="table-view">KTable View</button>
      </div>
      <div id="ks-ks-content"></div>
    </div>
  </div>

  <!-- WINDOWING -->
  <div class="ksp" id="ks-windowing">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="ks-stab on" data-win="tumbling">Tumbling</button>
      <button class="ks-stab" data-win="hopping">Hopping</button>
      <button class="ks-stab" data-win="sliding">Sliding</button>
      <button class="ks-stab" data-win="session">Session</button>
    </div>
    <div id="ks-win-content"></div>
  </div>

  <!-- JOINS -->
  <div class="ksp" id="ks-joins">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="ks-stab on" data-join="stream-table">Stream-Table</button>
      <button class="ks-stab" data-join="stream-stream">Stream-Stream</button>
      <button class="ks-stab" data-join="table-table">Table-Table</button>
    </div>
    <div id="ks-join-content"></div>
  </div>

  <!-- TRICKS -->
  <div class="ksp" id="ks-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="ks-trick"><b>No broker process</b> — Kafka Streams is a library, not a separate cluster. Runs inside your JVM app. State stored in RocksDB locally + backed up to changelog topic.</div>
    <div class="ks-trick"><b>Task = partition</b> — each partition gets one task. Tasks assigned to stream threads. Scaling = more threads OR more app instances. Tasks rebalance like consumer group partitions.</div>
    <div class="ks-trick"><b>KTable needs state store</b> — backed by RocksDB locally + compacted changelog topic. On restart, state store rebuilt from changelog. Can take time with large state.</div>
    <div class="ks-trick"><b>Reprocessing vs replay</b> — set auto.offset.reset=earliest to reprocess from beginning. But state store also needs reset (--reset-application tool) or you'll merge old and new state.</div>
    <div class="ks-trick"><b>Exactly-once in Streams</b> — processing.guarantee=exactly_once_v2. Uses producer transactions internally. ~40% throughput cost. exactly_once_v2 faster than v1 (one tx coordinator per task vs one per app).</div>
    <div class="ks-trick"><b>Stream-stream join window</b> — both sides must arrive within JoinWindows duration. Events outside window = not joined. Check for late arrivals with grace period.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="ks-q-card"><div class="q">Q: KStream vs KTable — when to use each?</div><div class="a">KStream: event log semantics. Every record matters (transactions, clicks, log lines). KTable: state/snapshot semantics. Only latest value per key (user profile, inventory count, feature flags). Rule: if each record is a fact → KStream. If records are updates to a single entity → KTable.</div></div>
    <div class="ks-q-card"><div class="q">Q: How does Kafka Streams scale?</div><div class="a">Partitions → tasks → threads → app instances. Each partition = 1 task. Task runs on a stream thread. Add more threads (num.stream.threads) or more app instances. Tasks rebalance via consumer group protocol. Max parallelism = partition count.</div></div>
    <div class="ks-q-card"><div class="q">Q: What's the difference between tumbling and hopping windows?</div><div class="a">Tumbling: non-overlapping, fixed size (e.g., 1h window every 1h). Hopping: fixed size, overlap (e.g., 1h window every 30min → events appear in 2 windows). Sliding: continuous window triggered per event. Session: variable size, defined by inactivity gap.</div></div>
    <div class="ks-q-card"><div class="q">Q: How does exactly-once work in Kafka Streams?</div><div class="a">processing.guarantee=exactly_once_v2. Each task wraps its read-process-write cycle in a Kafka transaction. Atomically commits: consumer offset + produced output records. On failure, transaction aborted → no partial results. Consumers with isolation.level=read_committed won't see partial output.</div></div>
  </div>
</div>`;

      // TOPOLOGY
      var TNODES=[
        {id:"source",label:"Source Node",type:"source",sub:"reads orders topic"},
        {id:"filter",label:"Filter",type:"proc",sub:"amount > 100"},
        {id:"map",label:"Map",type:"proc",sub:"extract userId"},
        {id:"agg",label:"Aggregate",type:"proc",sub:"count per user"},
        {id:"store",label:"State Store",type:"store",sub:"RocksDB"},
        {id:"sink",label:"Sink Node",type:"sink",sub:"writes alerts topic"},
      ];
      var TSTEPS=[
        {active:"source",records:[],info:"Source node reads from input Kafka topic. One task per partition."},
        {active:"filter",records:[{t:"stream",v:"order:$250"},{t:"filtered",v:"order:$50"}],info:"<b>Filter</b>: only pass orders > $100. Small orders dropped."},
        {active:"map",records:[{t:"mapped",v:"user:42 → cnt"},{t:"mapped",v:"user:7 → cnt"}],info:"<b>Map</b>: transform record — extract userId as key."},
        {active:"agg",records:[{t:"agg",v:"user:42 = 3"},{t:"agg",v:"user:7 = 1"}],info:"<b>Aggregate</b>: count orders per user. Reads/writes state store."},
        {active:"store",records:[{t:"agg",v:"user:42 = 3"}],info:"<b>State Store</b> (RocksDB): holds running count. Backed by changelog topic. Restored on restart."},
        {active:"sink",records:[{t:"agg",v:"user:42: 3 orders"},{t:"agg",v:"user:7: 1 order"}],info:"<b>Sink</b>: writes results to output Kafka topic. Downstream consumers or other topologies."},
      ];
      var tStep=0,tTimer=null;
      function renderTopo(){
        var s=TSTEPS[tStep];
        mount.querySelector("#ks-topo-nodes").innerHTML=TNODES.map(function(n,i){
          return "<div class=\"ks-node\"><div class=\"ks-node-box "+n.type+(s.active===n.id?" active":"")+"\">"+n.label+"</div><div class=\"ks-node-label\">"+n.sub+"</div></div>"+(i<TNODES.length-1?"<div class=\"ks-arrow\">→</div>":"");
        }).join("");
        mount.querySelector("#ks-topo-records").innerHTML=s.records.map(function(r){return "<div class=\"ks-record-box "+r.t+"\">"+r.v+"</div>";}).join("");
        mount.querySelector("#ks-tinfo").innerHTML=s.info;
        mount.querySelector("#ks-tstep").textContent="Step "+(tStep+1)+"/"+TSTEPS.length;
      }
      function tStop(){clearInterval(tTimer);tTimer=null;mount.querySelector("#ks-tplay").textContent="▶ Play";}
      mount.querySelector("#ks-tplay").addEventListener("click",function(){if(tTimer){tStop();}else{tTimer=setInterval(function(){tStep=Math.min(tStep+1,TSTEPS.length-1);renderTopo();if(tStep===TSTEPS.length-1)tStop();},1700);mount.querySelector("#ks-tplay").textContent="⏸ Pause";}});
      mount.querySelector("#ks-tnext").addEventListener("click",function(){tStop();tStep=Math.min(tStep+1,TSTEPS.length-1);renderTopo();});
      mount.querySelector("#ks-tprev").addEventListener("click",function(){tStop();tStep=Math.max(tStep-1,0);renderTopo();});
      mount.querySelector("#ks-treset").addEventListener("click",function(){tStop();tStep=0;renderTopo();});
      renderTopo();

      // KSTREAM vs KTABLE
      var ksViewMode="stream-view";
      var EVENTS=[
        {key:"user:1",val:"Alice",t:1},{key:"user:2",val:"Bob",t:2},
        {key:"user:1",val:"AliceNew",t:3},{key:"user:3",val:"Carol",t:4},
        {key:"user:2",val:"BobNew",t:5},
      ];
      function renderKsView(){
        var el=mount.querySelector("#ks-ks-content");
        if(ksViewMode==="stream-view"){
          el.innerHTML="<div class=\"ks-box\"><h4>KStream: ALL events kept</h4>"+
            EVENTS.map(function(e){return "<div style=\"display:flex;gap:8px;align-items:center;margin-bottom:5px;font-size:12px\"><div class=\"ks-record-box stream\" style=\"min-width:60px\">"+e.key+"</div><div style=\"color:#8b949e\">→</div><div class=\"ks-record-box stream\">"+e.val+"</div></div>";}).join("")+
            "<div style=\"font-size:11px;color:#8b949e;margin-top:8px\">5 records. Each event is an independent fact.</div></div>";
        } else {
          var latest={};
          EVENTS.forEach(function(e){latest[e.key]=e.val;});
          el.innerHTML="<div class=\"ks-box\"><h4>KTable: latest value per key</h4>"+
            Object.keys(latest).map(function(k){return "<div style=\"display:flex;gap:8px;align-items:center;margin-bottom:5px;font-size:12px\"><div class=\"ks-record-box mapped\" style=\"min-width:60px\">"+k+"</div><div style=\"color:#8b949e\">→</div><div class=\"ks-record-box mapped\">"+latest[k]+"</div></div>";}).join("")+
            "<div style=\"font-size:11px;color:#8b949e;margin-top:8px\">3 unique keys. Old values overwritten. user:1=AliceNew, user:2=BobNew.</div></div>";
        }
      }
      mount.querySelectorAll(".ks-stab[data-ks]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".ks-stab[data-ks]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");ksViewMode=b.dataset.ks;renderKsView();});
      });
      renderKsView();

      // WINDOWING
      var winMode="tumbling";
      var WIN_DATA={
        tumbling:{desc:"Fixed size, non-overlapping. Each event in exactly ONE window. TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)).",color:"#58a6ff",
          windows:[{label:"10:00-10:05",events:["e1","e2","e3"],active:true},{label:"10:05-10:10",events:["e4","e5"],active:false},{label:"10:10-10:15",events:["e6"],active:false}]},
        hopping:{desc:"Fixed size, overlapping. Each event may appear in MULTIPLE windows. TimeWindows.ofSizeAndGrace(10min).advanceBy(5min).",color:"#e8741a",
          windows:[{label:"10:00-10:10",events:["e1","e2","e3","e4","e5"],active:true},{label:"10:05-10:15",events:["e4","e5","e6"],active:false},{label:"10:10-10:20",events:["e6"],active:false}]},
        sliding:{desc:"Continuous window triggered by each event. Contains all events within window duration of that event. SlidingWindows.withTimeDifferenceAndGrace(5min).",color:"#d2a8ff",
          windows:[{label:"e1 window",events:["e1","e2"],active:true},{label:"e3 window",events:["e2","e3","e4"],active:false},{label:"e5 window",events:["e4","e5"],active:false}]},
        session:{desc:"Variable size, defined by inactivity gap. Activity within gap = same session. SessionWindows.ofInactivityGapAndGrace(5min).",color:"#3dd68c",
          windows:[{label:"Session 1",events:["e1","e2","e3"],active:true,note:"gap < 5min"},{label:"Session 2",events:["e5","e6"],active:false,note:"gap > 5min after e3"}]},
      };
      function renderWin(){
        var s=WIN_DATA[winMode];
        var el=mount.querySelector("#ks-win-content");
        el.innerHTML="<div class=\"ks-box\"><div style=\"font-size:12px;color:#8b949e;margin-bottom:10px\">"+s.desc+"</div>"+
          "<div style=\"display:flex;gap:8px;flex-wrap:wrap\">"+
          s.windows.map(function(w,i){
            return "<div class=\"ks-window-box "+(i===0?"active":"closed")+"\" style=\"border-color:"+s.color+";min-width:120px;max-width:160px\">"+
              "<div style=\"font-size:10px;color:"+s.color+";font-weight:600;margin-bottom:4px\">"+w.label+"</div>"+
              w.events.map(function(e){return "<span style=\"background:"+s.color+"22;color:"+s.color+";border-radius:4px;padding:1px 5px;font-size:10px;margin:1px;display:inline-block\">"+e+"</span>";}).join("")+
              (w.note?"<div style=\"font-size:9px;color:#8b949e;margin-top:4px\">"+w.note+"</div>":"")+"</div>";
          }).join("")+"</div></div>";
      }
      mount.querySelectorAll(".ks-stab[data-win]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".ks-stab[data-win]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");winMode=b.dataset.win;renderWin();});
      });
      renderWin();

      // JOINS
      var joinMode="stream-table";
      var JOIN_DATA={
        "stream-table":{
          title:"Stream-Table Join",color:"#58a6ff",
          desc:"KStream joins with KTable. For each stream record, look up latest matching KTable entry. No window needed — KTable is always current.",
          example:"orders.join(userProfiles, (order,profile) → enrich(order, profile.name))",
          notes:["Stream record arrives → lookup KTable by key","KTable must have same (or co-partitioned) partitions","If no KTable entry: result null (left join → keep, inner → drop)","KTable updates don't produce new joined output"]
        },
        "stream-stream":{
          title:"Stream-Stream Join",color:"#e8741a",
          desc:"Both sides are KStreams. Must define JoinWindows — events must arrive within window of each other.",
          example:"clicks.join(impressions, (click,imp)→merge, JoinWindows.of(Duration.ofSeconds(5)))",
          notes:["Both sides buffered in state store for window duration","Events matched by key within time window","Grace period for late arrivals","Produces output for every match within window"]
        },
        "table-table":{
          title:"Table-Table Join",color:"#3dd68c",
          desc:"Both sides are KTables. Re-computes join result when EITHER table updates. Result is also a KTable.",
          example:"userProfiles.join(userSettings, (profile,settings)→combine(profile,settings))",
          notes:["Every update to either table triggers re-evaluation","Result stored in output KTable","No time window needed — state is latest per key","More like SQL join than streaming join"]
        }
      };
      function renderJoin(){
        var s=JOIN_DATA[joinMode];
        var el=mount.querySelector("#ks-join-content");
        el.innerHTML="<div class=\"ks-box\" style=\"border-color:"+s.color+"44\">"+
          "<div style=\"font-size:13px;font-weight:700;color:"+s.color+";margin-bottom:8px\">"+s.title+"</div>"+
          "<div style=\"font-size:12px;color:#8b949e;margin-bottom:10px;line-height:1.5\">"+s.desc+"</div>"+
          "<div style=\"background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;font-family:monospace;font-size:12px;color:#cdd9e5;margin-bottom:10px\">"+s.example+"</div>"+
          s.notes.map(function(n){return "<div style=\"display:flex;gap:8px;margin-bottom:4px;font-size:12px\"><span style=\"color:"+s.color+"\">•</span><span>"+n+"</span></div>";}).join("")+"</div>";
      }
      mount.querySelectorAll(".ks-stab[data-join]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".ks-stab[data-join]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");joinMode=b.dataset.join;renderJoin();});
      });
      renderJoin();

      // TABS
      mount.querySelectorAll(".ksbtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".ksbtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".ksp").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#ks-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".ks-q-card").forEach(function(c){c.addEventListener("click",function(){c.classList.toggle("open");});});
    },
    concept: `**L1 (30s ELI5):** Kafka Streams = Java library to process records one-by-one as they arrive. Filter, transform, join, aggregate — all inside your app. No separate cluster needed.

**L2 (2min core):** Topology = DAG of source → processor → sink nodes. KStream = infinite event stream (all events). KTable = latest value per key (changelog). Stateful ops use RocksDB local store + compacted changelog topic backup.

**L3 (10min edge cases):** Task = partition = unit of parallelism. num.stream.threads controls threads per app instance. Windowing: tumbling (non-overlapping), hopping (overlapping), sliding (per-event), session (inactivity-bounded). exactly_once_v2: per-task tx coordinators (faster than v1).

**L4 (30min deep):** StreamTask lifecycle: poll → process → punctuate → commit. Standby replicas (num.standby.replicas) pre-warm state on other instances → faster failover. Processing time vs event time: use timestamps from record metadata. Punctuators: scheduled callbacks for periodic actions (window close, flush). Interactive queries: serve state store contents via REST without separate DB.`,
    why: "Zero-ops: no separate streaming cluster. Co-located with your app. Exactly-once out of the box. Deep Kafka integration: changelog topics, interactive queries. Better than Spark/Flink for Kafka-to-Kafka pipelines.",
    example: {
      language: "java",
      code: `StreamsBuilder builder = new StreamsBuilder();

// KStream: filter + transform
KStream<String, Order> orders = builder
    .stream("orders", Consumed.with(Serdes.String(), orderSerde))
    .filter((key, order) -> order.getAmount() > 100);

// KTable: latest user profile per userId
KTable<String, UserProfile> profiles = builder
    .table("user-profiles", Consumed.with(Serdes.String(), profileSerde));

// Stream-Table join: enrich order with user name
KStream<String, EnrichedOrder> enriched = orders
    .join(profiles,
        (order, profile) -> new EnrichedOrder(order, profile.getName()),
        Joined.with(Serdes.String(), orderSerde, profileSerde));

// Windowed aggregation: count orders per user per 5min
enriched
    .groupByKey()
    .windowedBy(TimeWindows.ofSizeWithNoGrace(Duration.ofMinutes(5)))
    .count()
    .toStream()
    .to("order-counts", Produced.with(WindowedSerdes.timeWindowedSerdeFrom(String.class), Serdes.Long()));

Properties props = new Properties();
props.put(StreamsConfig.APPLICATION_ID_CONFIG, "order-processor");
props.put(StreamsConfig.BOOTSTRAP_SERVERS_CONFIG, "broker:9092");
props.put(StreamsConfig.PROCESSING_GUARANTEE_CONFIG, StreamsConfig.EXACTLY_ONCE_V2);
props.put(StreamsConfig.NUM_STREAM_THREADS_CONFIG, 4);

KafkaStreams streams = new KafkaStreams(builder.build(), props);
streams.start();`
    },
    gotchas: [
      "State store rebuild on restart can be slow with large state — use num.standby.replicas for faster failover",
      "exactly_once_v2 requires Kafka 2.5+. Has ~40% throughput overhead. Use at_least_once for non-critical pipelines",
      "Repartition on groupBy/join creates internal topics — extra I/O. Ensure co-partitioning to avoid",
      "KTable backed by compacted topic — cold start reads entire topic to build state",
      "Stream-stream join: both events must arrive within JoinWindows. Late events outside window = no join output",
      "To reset application: kafka-streams-application-reset.sh — clears local state + resets offsets",
      "Interactive queries: state only queryable on instance that owns that partition's task"
    ],
    interview: [
      { q: "KStream vs KTable?", a: "KStream: every record is an independent event, all kept. KTable: only latest value per key, upsert semantics. Use KStream for events (transactions, clicks). Use KTable for state (profiles, inventory). KTable backed by compacted changelog topic." },
      { q: "How does Kafka Streams scale?", a: "Partition → task → thread → app instance. Add threads (num.stream.threads) or app instances. Tasks rebalance via consumer group. Max parallelism = input partition count. Tasks with state: standby replicas on other instances for fast failover." },
      { q: "Tumbling vs hopping vs session windows?", a: "Tumbling: fixed size, no overlap, each event in 1 window. Hopping: fixed size, overlapping (event in multiple windows). Sliding: window triggered per event, continuous. Session: variable size, bounded by inactivity gap — activity within gap extends session." },
      { q: "Exactly-once in Kafka Streams?", a: "processing.guarantee=exactly_once_v2. Each task wraps read-process-write in Kafka transaction. Consumer offset + produced output committed atomically. On failure → transaction aborted, no partial output. v2 is faster than v1: one tx coordinator per task vs one per app instance." }
    ],
    tradeoffs: "Kafka Streams: simple ops, no cluster, great for Kafka→Kafka. Flink/Spark: more complex joins, batch+streaming, multi-source. KSQL/ksqlDB: SQL on streams but limited expressiveness. Choose Streams for pure Kafka pipelines in Java/Scala."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
