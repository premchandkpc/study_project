(function() {
  var topic = {
    id: "kafka-offsets-commits",
    area: "kafka",
    title: "Kafka Offsets & Delivery Semantics",
    tag: "offsets",
    tags: ["kafka","offsets","at-least-once","exactly-once","delivery-semantics","auto-commit"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.ocw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.oc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.ocbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.ocbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.ocp{display:none}.ocp.on{display:block}
.oc-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.oc-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.oc-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.oc-info b{color:#e8741a}
.oc-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.oc-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.oc-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.oc-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.oc-msg{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:6px;font-size:12px;font-weight:700;border:2px solid;transition:all .3s;cursor:default;position:relative}
.oc-msg.unread{border-color:#30363d;color:#8b949e;background:#0d1117}
.oc-msg.processing{border-color:#f5b944;color:#f5b944;background:#f5b94415;box-shadow:0 0 8px #f5b94444}
.oc-msg.done{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.oc-msg.skip{border-color:#f47067;color:#f47067;background:#f4706715}
.oc-offset-marker{display:flex;align-items:center;gap:6px;font-size:12px;margin-bottom:6px}
.oc-offset-val{background:#e8741a22;border:1px solid #e8741a;border-radius:4px;padding:2px 8px;color:#e8741a;font-weight:700;font-size:13px;min-width:30px;text-align:center;transition:all .3s}
.oc-sem-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.oc-sem-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px}
.oc-sem-card h5{margin:0 0 6px;font-size:12px;font-weight:700}
.oc-sem-card .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;margin-bottom:6px}
.oc-sem-card .pros{color:#3dd68c;font-size:11px;line-height:1.6}
.oc-sem-card .cons{color:#f47067;font-size:11px;line-height:1.6;margin-top:4px}
.oc-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.oc-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.oc-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.oc-trick b{color:#f5b944}
.oc-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.oc-q-card .q{font-size:13px;font-weight:600}
.oc-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.oc-q-card.open .a{display:block}.oc-q-card.open{border-color:#e8741a}
.oc-timeline{display:flex;align-items:center;gap:4px;margin:10px 0;overflow-x:auto;padding-bottom:4px}
.oc-commit-arrow{font-size:18px;color:#e8741a;margin:0 2px}
.oc-partition-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:10px}
.oc-plabel{font-size:11px;color:#8b949e;width:80px;padding-top:8px}
.oc-msgs-row{display:flex;gap:4px;flex-wrap:wrap}
.oc-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:#8b949e;margin-bottom:8px}
.oc-leg-item{display:flex;align-items:center;gap:4px}
.oc-leg-dot{width:10px;height:10px;border-radius:3px}
.oc-crash-sim{background:#f4706715;border:1px solid #f47067;border-radius:6px;padding:8px 12px;font-size:12px;color:#f47067;margin:8px 0;display:none}
.oc-crash-sim.show{display:block}
</style>
<div class="ocw">
  <div class="oc-tabs">
    <button class="ocbtn on" data-tab="offsets">Offset Mechanics</button>
    <button class="ocbtn" data-tab="semantics">Delivery Semantics</button>
    <button class="ocbtn" data-tab="commits">Commit Strategies</button>
    <button class="ocbtn" data-tab="eos">Exactly-Once (EOS)</button>
    <button class="ocbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- OFFSET MECHANICS -->
  <div class="ocp on" id="oc-offsets">
    <div class="oc-legend">
      <div class="oc-leg-item"><div class="oc-leg-dot" style="background:#30363d"></div>unread</div>
      <div class="oc-leg-item"><div class="oc-leg-dot" style="background:#f5b944"></div>processing</div>
      <div class="oc-leg-item"><div class="oc-leg-dot" style="background:#3dd68c"></div>committed</div>
      <div class="oc-leg-item"><div class="oc-leg-dot" style="background:#f47067"></div>skipped/lost</div>
    </div>
    <div class="oc-box">
      <h4>Partition P0 — Messages</h4>
      <div class="oc-partition-row"><span class="oc-plabel">P0</span><div class="oc-msgs-row" id="oc-msgs"></div></div>
      <div style="margin-top:8px">
        <div class="oc-offset-marker">Committed Offset: <span class="oc-offset-val" id="oc-committed">0</span></div>
        <div class="oc-offset-marker">Fetch Position (LEO): <span class="oc-offset-val" id="oc-fetch">0</span></div>
        <div class="oc-offset-marker" id="oc-lag-row">Lag: <span class="oc-offset-val" id="oc-lag" style="color:#f5b944;border-color:#f5b944">0</span></div>
      </div>
    </div>
    <div class="oc-info" id="oc-oinfo">Offset = position in partition log. Consumer fetches from fetch-position, commits after processing to mark progress.</div>
    <div class="oc-ctrls">
      <button id="oc-oprev">◀ Prev</button>
      <button id="oc-oplay">▶ Play</button>
      <button id="oc-onext">Next ▶</button>
      <button id="oc-oreset">↺ Reset</button>
      <button id="oc-ocrash" style="background:#f4706715;border:1px solid #f47067;color:#f47067">💥 Crash!</button>
      <span class="oc-step-info" id="oc-ostep">Step 1/8</span>
    </div>
    <div class="oc-crash-sim" id="oc-crash-msg"></div>
  </div>

  <!-- DELIVERY SEMANTICS -->
  <div class="ocp" id="oc-semantics">
    <div class="oc-sem-grid">
      <div class="oc-sem-card">
        <h5 style="color:#58a6ff">At-Most-Once</h5>
        <span class="badge" style="background:#58a6ff22;color:#58a6ff">Commit → Process</span>
        <div class="pros">✓ No duplicates<br>✓ Simple<br>✓ Fast</div>
        <div class="cons">✗ Messages lost on crash<br>✗ No retry</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">enable.auto.commit=true with short interval, or commitSync before processing</div>
      </div>
      <div class="oc-sem-card">
        <h5 style="color:#e8741a">At-Least-Once</h5>
        <span class="badge" style="background:#e8741a22;color:#e8741a">Process → Commit</span>
        <div class="pros">✓ No message loss<br>✓ Default behavior<br>✓ Easy to implement</div>
        <div class="cons">✗ Duplicates on crash<br>✗ Consumer must be idempotent</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">commitSync/commitAsync after processing. Most common pattern.</div>
      </div>
      <div class="oc-sem-card">
        <h5 style="color:#3dd68c">Exactly-Once</h5>
        <span class="badge" style="background:#3dd68c22;color:#3dd68c">Atomic Tx</span>
        <div class="pros">✓ No loss, no duplicates<br>✓ Kafka Streams native<br>✓ Transactional API</div>
        <div class="cons">✗ Complex setup<br>✗ Lower throughput<br>✗ Only Kafka→Kafka</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">transactional.id + enable.idempotence=true. Atomic offset commit + produce.</div>
      </div>
    </div>
    <div id="oc-sem-sim">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="oc-stab on" data-sem="alo">At-Least-Once</button>
        <button class="oc-stab" data-sem="amo">At-Most-Once</button>
        <button class="oc-stab" data-sem="eos">Exactly-Once</button>
      </div>
      <div id="oc-sem-content"></div>
    </div>
  </div>

  <!-- COMMIT STRATEGIES -->
  <div class="ocp" id="oc-commits">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="oc-stab on" data-commit="auto">Auto Commit</button>
      <button class="oc-stab" data-commit="sync">commitSync</button>
      <button class="oc-stab" data-commit="async">commitAsync</button>
      <button class="oc-stab" data-commit="manual">Manual Batch</button>
    </div>
    <div id="oc-commit-content"></div>
  </div>

  <!-- EOS -->
  <div class="ocp" id="oc-eos">
    <div class="oc-info" style="background:#3dd68c15;border-color:#3dd68c"><b style="color:#3dd68c">Exactly-Once Semantics (EOS)</b> = idempotent producer + transactional API + atomic offset commits. Kafka → Kafka only.</div>
    <div id="oc-eos-steps" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px"></div>
    <div class="oc-info" id="oc-eos-info">Play to see EOS transaction flow.</div>
    <div class="oc-ctrls">
      <button id="oc-esprev">◀ Prev</button>
      <button id="oc-esplay">▶ Play</button>
      <button id="oc-esnext">Next ▶</button>
      <button id="oc-esreset">↺ Reset</button>
      <span class="oc-step-info" id="oc-esstep">Step 1/5</span>
    </div>
    <div class="oc-box" style="margin-top:10px">
      <h4>Key Config</h4>
      <div style="font-size:12px;color:#cdd9e5;line-height:2">
        <code style="color:#e8741a">transactional.id</code> = unique per producer instance (survives restart)<br>
        <code style="color:#e8741a">enable.idempotence</code> = true (auto-set with transactional.id)<br>
        <code style="color:#e8741a">isolation.level</code> = read_committed (consumer reads only committed tx)<br>
        <code style="color:#e8741a">acks</code> = all (required for EOS)
      </div>
    </div>
  </div>

  <!-- TRICKS + INTERVIEW -->
  <div class="ocp" id="oc-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="oc-trick"><b>auto.commit commits unprocessed offsets</b> — default auto.commit.interval.ms=5000 commits highest fetched offset, not highest processed. Crash → messages lost.</div>
    <div class="oc-trick"><b>commitAsync on last poll</b> — callback fires asynchronously. Shutdown: always call commitSync() last to flush pending commits.</div>
    <div class="oc-trick"><b>Committed offset = next to fetch</b> — commit offset N means "I've processed up to N-1, next fetch from N". Off-by-one: commit record.offset()+1.</div>
    <div class="oc-trick"><b>EOS only Kafka→Kafka</b> — transactional API atomic within Kafka. External systems (DB, HTTP) still need idempotent consumers.</div>
    <div class="oc-trick"><b>read_committed blocks until tx committed</b> — consumers with isolation.level=read_committed won't see messages until producer commits. Latency trade-off.</div>
    <div class="oc-trick"><b>seek() resets position, not committed offset</b> — consumer.seek() changes fetch position. Doesn't change what's committed. On rejoin, consumer starts from last committed.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="oc-q-card"><div class="q">Q: Difference between at-least-once and exactly-once in Kafka?</div><div class="a">At-least-once: process then commit. Crash after process but before commit → replay on restart → duplicate. At-exactly-once: transactional API — produce + offset commit in atomic transaction. Consumer reads only committed tx (read_committed). Requires transactional.id + enable.idempotence=true. Only works Kafka→Kafka natively.</div></div>
    <div class="oc-q-card"><div class="q">Q: Why is enable.auto.commit dangerous?</div><div class="a">Auto-commit fires on a timer (default 5s), committing the highest fetched offset — not the highest processed. If consumer crashes between fetch and processing, auto-commit may have already committed those offsets. On restart, those messages are skipped → lost. Pattern: disable auto-commit, commit manually after processing.</div></div>
    <div class="oc-q-card"><div class="q">Q: What's the right offset to commit after processing record at offset N?</div><div class="a">Commit N+1 (record.offset() + 1). Committed offset = position of NEXT message to fetch. Committing N would re-fetch the same record on restart.</div></div>
    <div class="oc-q-card"><div class="q">Q: commitSync vs commitAsync — when to use each?</div><div class="a">commitAsync: non-blocking, doesn't retry on failure (retrying with stale offset could override newer commit). commitSync: blocking, retries until success, used in shutdown hooks and rebalance listeners. Common pattern: commitAsync in loop, commitSync in finally block and onPartitionsRevoked.</div></div>
  </div>
</div>`;

      // OFFSET MECHANICS
      var OSTEPS = [
        { msgs:[0,0,0,0,0,0,0,0], committed:0, fetch:0, info:"Partition P0 has 8 messages (offsets 0-7). Committed=0, Fetch=0. Consumer about to poll.", crash:null },
        { msgs:[1,0,0,0,0,0,0,0], committed:0, fetch:1, info:"Consumer fetched msg #0 (offset 0). Processing... Fetch position advanced to 1. Not yet committed.", crash:null },
        { msgs:[2,1,0,0,0,0,0,0], committed:0, fetch:2, info:"Processing msg #0 done. Fetched msg #1. <b>Committed offset still 0</b> — no commit yet. Lag = 2.", crash:null },
        { msgs:[2,2,2,0,0,0,0,0], committed:0, fetch:3, info:"Batch: msgs 0,1,2 processed. Fetch at 3. <b>commitAsync(offset=3)</b> sent asynchronously.", crash:null },
        { msgs:[2,2,2,0,0,0,0,0], committed:3, fetch:3, info:"Commit confirmed. Committed=3. Lag=5. Next fetch from offset 3. Safe restart point = 3.", crash:null },
        { msgs:[2,2,2,1,1,0,0,0], committed:3, fetch:5, info:"Fetched and processing msgs 3,4. Committed still 3. If crash here → restart from 3 (at-least-once).", crash:null },
        { msgs:[2,2,2,2,2,2,0,0], committed:6, fetch:6, info:"Msgs 3-5 processed and committed. Committed=6. Only msgs 6,7 remain.", crash:null },
        { msgs:[2,2,2,2,2,2,2,2], committed:8, fetch:8, info:"All 8 messages processed and committed. Lag=0. Consumer caught up.", crash:null },
      ];
      var oStep=0, oTimer=null;
      function msgClass(v) { return v===0?"unread":v===1?"processing":v===2?"done":"skip"; }
      function renderOffsets(crashed) {
        var s = OSTEPS[oStep];
        mount.querySelector("#oc-msgs").innerHTML = s.msgs.map(function(m,i){
          return "<div class=\"oc-msg "+msgClass(m)+"\" title=\"offset "+i+"\">"+i+"</div>";
        }).join("");
        mount.querySelector("#oc-committed").textContent = crashed != null ? crashed : s.committed;
        mount.querySelector("#oc-fetch").textContent = s.fetch;
        var lag = s.fetch - (crashed != null ? crashed : s.committed);
        mount.querySelector("#oc-lag").textContent = lag;
        mount.querySelector("#oc-oinfo").innerHTML = s.info;
        mount.querySelector("#oc-ostep").textContent = "Step "+(oStep+1)+"/"+OSTEPS.length;
      }
      function oStop(){clearInterval(oTimer);oTimer=null;mount.querySelector("#oc-oplay").textContent="▶ Play";}
      function oStart(){oTimer=setInterval(function(){oStep=Math.min(oStep+1,OSTEPS.length-1);renderOffsets();if(oStep===OSTEPS.length-1)oStop();},1700);mount.querySelector("#oc-oplay").textContent="⏸ Pause";}
      mount.querySelector("#oc-oplay").addEventListener("click",function(){oTimer?oStop():oStart();});
      mount.querySelector("#oc-onext").addEventListener("click",function(){oStop();oStep=Math.min(oStep+1,OSTEPS.length-1);renderOffsets();});
      mount.querySelector("#oc-oprev").addEventListener("click",function(){oStop();oStep=Math.max(oStep-1,0);renderOffsets();});
      mount.querySelector("#oc-oreset").addEventListener("click",function(){oStop();oStep=0;renderOffsets();mount.querySelector("#oc-crash-msg").classList.remove("show");});
      mount.querySelector("#oc-ocrash").addEventListener("click",function(){
        oStop();
        var committed = parseInt(mount.querySelector("#oc-committed").textContent);
        var fetch = OSTEPS[oStep].fetch;
        mount.querySelector("#oc-crash-msg").innerHTML = "💥 <b>Consumer crashed at fetch="+fetch+"</b>. Last committed="+committed+". On restart, will re-fetch from <b>"+committed+"</b>. Messages "+committed+"-"+(fetch-1)+" will be reprocessed → <b>at-least-once duplicates</b>.";
        mount.querySelector("#oc-crash-msg").classList.add("show");
      });
      renderOffsets();

      // DELIVERY SEMANTICS SIM
      var semMode="alo";
      var SEM_FLOWS = {
        alo: {
          title:"At-Least-Once",color:"#e8741a",
          steps:[
            {label:"Fetch",desc:"Consumer fetches msgs 0-4"},
            {label:"Process",desc:"Application processes each message"},
            {label:"💥 Crash",desc:"Consumer crashes during processing",bad:true},
            {label:"Restart",desc:"Restart from last committed offset"},
            {label:"Re-fetch",desc:"Re-fetches msgs 0-4 → DUPLICATE processing",bad:true},
            {label:"Commit",desc:"Processes and commits offset 5"},
          ]
        },
        amo: {
          title:"At-Most-Once",color:"#58a6ff",
          steps:[
            {label:"Fetch",desc:"Consumer fetches msgs 0-4"},
            {label:"Commit",desc:"commitSync offset 5 BEFORE processing"},
            {label:"💥 Crash",desc:"Consumer crashes after commit, before processing",bad:true},
            {label:"Restart",desc:"Restart from committed offset 5"},
            {label:"LOST",desc:"Msgs 0-4 never processed → DATA LOSS",bad:true},
            {label:"Fetch 5+",desc:"Continues from offset 5"},
          ]
        },
        eos: {
          title:"Exactly-Once",color:"#3dd68c",
          steps:[
            {label:"Begin Tx",desc:"producer.beginTransaction()"},
            {label:"Produce",desc:"Send output records within transaction"},
            {label:"Commit Tx",desc:"Atomically commit offsets + output records"},
            {label:"💥 Crash",desc:"Crash after commit → tx persisted",bad:false},
            {label:"Restart",desc:"Restart from committed offset"},
            {label:"No Dup",desc:"Input already consumed → not reprocessed"},
          ]
        }
      };
      function renderSem(){
        var s=SEM_FLOWS[semMode];
        var el=mount.querySelector("#oc-sem-content");
        el.innerHTML="<div class=\"oc-box\"><div style=\"font-size:12px;font-weight:600;color:"+s.color+";margin-bottom:10px\">"+s.title+" Flow</div><div style=\"display:flex;gap:4px;flex-wrap:wrap;align-items:center\">"+
          s.steps.map(function(step,i){
            return "<div style=\"background:"+(step.bad?"#f4706715":"#0d1117")+";border:1px solid "+(step.bad?"#f47067":s.color+"44")+";border-radius:6px;padding:6px 10px;text-align:center\">"+
              "<div style=\"font-size:11px;font-weight:600;color:"+(step.bad?"#f47067":s.color)+"\">"+step.label+"</div>"+
              "<div style=\"font-size:10px;color:#8b949e;margin-top:3px;max-width:90px\">"+step.desc+"</div>"+
            "</div>"+
            (i<s.steps.length-1?"<div style=\"color:#8b949e;font-size:16px\">→</div>":"");
          }).join("")+"</div></div>";
      }
      mount.querySelectorAll(".oc-stab[data-sem]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".oc-stab[data-sem]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");semMode=b.dataset.sem;renderSem();});
      });
      renderSem();

      // COMMIT STRATEGIES
      var commitMode="auto";
      var COMMIT_DATA = {
        auto: {
          color:"#f47067",
          desc:"enable.auto.commit=true (default). Commits on a timer (auto.commit.interval.ms=5s). Commits highest fetched offset, NOT highest processed.",
          risk:"HIGH: crash between fetch and processing → messages lost (committed before processed)",
          code:`// ⚠️ DANGEROUS default
props.put("enable.auto.commit", "true");
props.put("auto.commit.interval.ms", "5000");
// Auto-commits every 5s regardless of whether
// messages have been fully processed`
        },
        sync: {
          color:"#3dd68c",
          desc:"commitSync() blocks until broker acks the commit. Retries on failure. Use in shutdown and rebalance listeners.",
          risk:"SAFE: blocks, retries. Throughput impact if called per record.",
          code:`// Safe: blocks until commit confirmed
consumer.commitSync(); // all pending

// Or per-partition:
consumer.commitSync(Map.of(
    new TopicPartition("orders", 0),
    new OffsetAndMetadata(record.offset() + 1)
));`
        },
        async: {
          color:"#58a6ff",
          desc:"commitAsync() non-blocking. Callback on completion. Does NOT retry (would override newer commits). Use in the polling loop.",
          risk:"MEDIUM: no retry. Combine with commitSync on shutdown.",
          code:`consumer.commitAsync((offsets, ex) -> {
    if (ex != null) {
        log.error("Commit failed: {}", offsets, ex);
        // Don't retry here — could override newer commit
    }
});
// In finally block:
consumer.commitSync(); // flush last batch`
        },
        manual: {
          color:"#d2a8ff",
          desc:"Manual per-partition offset tracking. Commit exactly offset+1 after processing. Best control.",
          risk:"LOW: full control. Must track offsets per partition carefully.",
          code:`Map<TopicPartition, OffsetAndMetadata> offsets = new HashMap<>();

while (true) {
    var records = consumer.poll(Duration.ofMillis(100));
    for (var r : records) {
        process(r);
        // Commit N+1 = next offset to fetch
        offsets.put(
            new TopicPartition(r.topic(), r.partition()),
            new OffsetAndMetadata(r.offset() + 1)
        );
    }
    consumer.commitAsync(offsets, null);
    offsets.clear();
}`
        }
      };
      function renderCommit(){
        var s=COMMIT_DATA[commitMode];
        var el=mount.querySelector("#oc-commit-content");
        el.innerHTML="<div class=\"oc-box\"><div style=\"font-size:12px;color:#cdd9e5;margin-bottom:8px\">"+s.desc+"</div>"+
          "<div style=\"background:"+(commitMode==="auto"?"#f4706715":commitMode==="manual"?"#3dd68c15":"#161b22")+";border:1px solid "+s.color+";border-radius:6px;padding:8px 12px;font-size:12px;color:"+s.color+";margin-bottom:10px\">Risk: "+s.risk+"</div>"+
          "<pre style=\"background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:12px;color:#cdd9e5;overflow-x:auto;font-family:JetBrains Mono,monospace\">"+s.code+"</pre></div>";
      }
      mount.querySelectorAll(".oc-stab[data-commit]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".oc-stab[data-commit]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");commitMode=b.dataset.commit;renderCommit();});
      });
      renderCommit();

      // EOS
      var EOS_STEPS=[
        {title:"InitTx",desc:"Producer calls initTransactions(). Broker assigns PID (producer ID) + epoch. Old zombie producers fenced.",color:"#58a6ff"},
        {title:"Begin",desc:"beginTransaction(). All subsequent sends belong to this tx. TransactionCoordinator logs tx start.",color:"#e8741a"},
        {title:"Produce",desc:"Send output records to output topic. Records marked with transactional.id. Consumers with read_committed won't see them yet.",color:"#f5b944"},
        {title:"Commit Offsets",desc:"sendOffsetsToTransaction(offsets, consumerGroupMetadata). Atomically links input offsets + output records.",color:"#d2a8ff"},
        {title:"Commit Tx",desc:"commitTransaction(). Broker marks all records visible. Offset commit happens atomically. Exactly-once delivered.",color:"#3dd68c"},
      ];
      var esStep=0,esTimer=null;
      function renderEos(){
        mount.querySelector("#oc-eos-steps").innerHTML=EOS_STEPS.map(function(s,i){
          return "<div style=\"background:#161b22;border:1px solid "+(i===esStep?s.color:"#30363d")+";border-radius:8px;padding:10px;opacity:"+(i<=esStep?1:0.4)+";transition:all .3s\">"+
            "<div style=\"font-size:12px;font-weight:700;color:"+s.color+";margin-bottom:4px\">"+s.title+"</div>"+
            "<div style=\"font-size:11px;color:#8b949e\">"+s.desc+"</div></div>";
        }).join("");
        mount.querySelector("#oc-eos-info").innerHTML=EOS_STEPS[esStep].desc;
        mount.querySelector("#oc-esstep").textContent="Step "+(esStep+1)+"/"+EOS_STEPS.length;
      }
      function esStop(){clearInterval(esTimer);esTimer=null;mount.querySelector("#oc-esplay").textContent="▶ Play";}
      mount.querySelector("#oc-esplay").addEventListener("click",function(){if(esTimer){esStop();}else{esTimer=setInterval(function(){esStep=Math.min(esStep+1,EOS_STEPS.length-1);renderEos();if(esStep===EOS_STEPS.length-1)esStop();},1800);mount.querySelector("#oc-esplay").textContent="⏸ Pause";}});
      mount.querySelector("#oc-esnext").addEventListener("click",function(){esStop();esStep=Math.min(esStep+1,EOS_STEPS.length-1);renderEos();});
      mount.querySelector("#oc-esprev").addEventListener("click",function(){esStop();esStep=Math.max(esStep-1,0);renderEos();});
      mount.querySelector("#oc-esreset").addEventListener("click",function(){esStop();esStep=0;renderEos();});
      renderEos();

      // TABS
      mount.querySelectorAll(".ocbtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".ocbtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".ocp").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#oc-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".oc-q-card").forEach(function(c){c.addEventListener("click",function(){c.classList.toggle("open");});});
    },
    concept: `**L1 (30s ELI5):** Offset = bookmark in a partition. Commit = save bookmark. At-least-once = save after reading (may re-read). At-most-once = save before reading (may lose). Exactly-once = atomic save + publish.

**L2 (2min core):** Each partition has an independent offset sequence. Consumer commits to __consumer_offsets. Committed offset = next offset to fetch. Consumer lag = fetch position - committed offset. Auto-commit commits highest fetched, not processed.

**L3 (10min edge cases):** commitAsync: no retry (would override newer commit with stale one). commitSync: blocking, retries. Pattern: commitAsync in loop + commitSync in shutdown/rebalance. EOS: transactional.id + initTransactions() + sendOffsetsToTransaction(). Consumer needs isolation.level=read_committed.

**L4 (30min deep):** PID (producer ID) assigned per transactional.id. Epoch bumped on restart → fences zombie producers. TransactionCoordinator = dedicated broker per tx. Two-phase commit within Kafka: prepare → commit markers written to all involved partitions. Consumer sees commit marker → reads records as visible. Abort marker → records skipped. Idempotent producer: sequence numbers per PID+partition → deduplicates retries.`,
    why: "Kafka is stateless — offset tracking is 100% consumer-side. This enables replay (seek to beginning), parallel consumers, and flexible delivery semantics per use case.",
    example: {
      language: "java",
      code: `// At-least-once (recommended default)
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
KafkaConsumer<String,String> consumer = new KafkaConsumer<>(props);
Map<TopicPartition,OffsetAndMetadata> offsets = new HashMap<>();

try {
    while (running) {
        var records = consumer.poll(Duration.ofMillis(100));
        for (var r : records) {
            process(r); // idempotent
            offsets.put(new TopicPartition(r.topic(), r.partition()),
                        new OffsetAndMetadata(r.offset() + 1)); // N+1!
        }
        consumer.commitAsync(offsets, null);
    }
} finally {
    consumer.commitSync(offsets); // flush on shutdown
}

// Exactly-once (Kafka→Kafka)
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "my-tx-id");
KafkaProducer<String,String> producer = new KafkaProducer<>(props);
producer.initTransactions();
producer.beginTransaction();
try {
    producer.send(new ProducerRecord<>("output", key, value));
    producer.sendOffsetsToTransaction(offsets, consumer.groupMetadata());
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}`
    },
    gotchas: [
      "auto-commit commits highest FETCHED offset, not processed. Default 5s interval → data loss on crash",
      "Committed offset = NEXT to fetch. commit(record.offset()) re-fetches same record. Must commit record.offset()+1",
      "commitAsync does NOT retry — retrying with stale offset could override a newer commit and cause reprocessing",
      "EOS only works Kafka→Kafka. Kafka→DB requires idempotent consumer logic even with transactions",
      "isolation.level=read_committed: consumer won't see records until transaction committed. Adds latency",
      "seek() changes fetch position but NOT committed offset. After rebalance, consumer restarts from last commit",
      "Zombie producer fencing: if producer restarts with same transactional.id, old epoch is invalidated"
    ],
    interview: [
      { q: "Difference between at-least-once and exactly-once?", a: "At-least-once: process then commit. Crash before commit → replay → duplicate. EOS: transactional API — produce + commit offsets atomically. Consumer with read_committed only sees committed tx. No replay after commit. Only Kafka→Kafka." },
      { q: "Why is enable.auto.commit dangerous?", a: "Commits highest fetched offset on a timer, not highest processed. Crash between fetch and processing → auto-commit may have saved that offset → messages silently lost on restart." },
      { q: "What offset to commit after processing offset N?", a: "N+1. Committed offset = position of NEXT message to fetch. Committing N re-fetches same record on restart." },
      { q: "commitSync vs commitAsync?", a: "commitAsync: non-blocking, no retry (stale retry would override newer commit). commitSync: blocking, retries. Pattern: commitAsync in hot loop, commitSync in shutdown + rebalance listener." }
    ],
    tradeoffs: "Auto-commit: simple but dangerous. Manual commitSync: safe but slow. commitAsync + commitSync in finally: best of both. EOS: strong guarantee, ~40% throughput reduction, Kafka-only."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
