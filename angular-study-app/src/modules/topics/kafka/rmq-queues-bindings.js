(function() {
  var topic = {
    id: "rmq-queues-bindings",
    area: "kafka",
    title: "RabbitMQ Queues & Bindings",
    tag: "rabbitmq",
    tags: ["rabbitmq","queues","bindings","durable","exclusive","ttl","priority","quorum"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.qbw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.qb-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.qbbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.qbbtn.on{background:#f5913422;border-color:#f59134;color:#f59134;font-weight:600}
.qbp{display:none}.qbp.on{display:block}
.qb-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.qb-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.qb-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.qb-info b{color:#f59134}
.qb-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.qb-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.qb-ctrls button:hover{border-color:#f59134;color:#f59134}
.qb-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.qb-queue-vis{background:#0d1117;border:2px solid #30363d;border-radius:8px;padding:10px;margin-bottom:8px;min-height:60px;transition:all .3s}
.qb-queue-vis.durable{border-color:#3dd68c}
.qb-queue-vis.transient{border-color:#f59134}
.qb-queue-vis.quorum{border-color:#58a6ff}
.qb-queue-vis h5{margin:0 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:.7px}
.qb-msg-queue{display:flex;gap:3px;flex-wrap:wrap;min-height:30px;align-items:center}
.qb-msg{width:28px;height:28px;border-radius:4px;border:1px solid;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;transition:all .3s}
.qb-msg.ready{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.qb-msg.prio-hi{border-color:#f47067;color:#f47067;background:#f4706715}
.qb-msg.prio-lo{border-color:#8b949e;color:#8b949e;background:#8b949e15}
.qb-msg.expired{opacity:.2;text-decoration:line-through}
.qb-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.qb-stab.on{background:#f5913422;border-color:#f59134;color:#f59134}
.qb-trick{background:#161b22;border-left:3px solid #f59134;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.qb-trick b{color:#f5b944}
.qb-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.qb-q-card .q{font-size:13px;font-weight:600}
.qb-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.qb-q-card.open .a{display:block}.qb-q-card.open{border-color:#f59134}
.qb-prop-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.qb-prop{background:#0d1117;border-radius:6px;padding:8px;font-size:11px}
.qb-prop-name{color:#f59134;font-weight:600;font-family:monospace;margin-bottom:3px}
.qb-prop-val{color:#cdd9e5;margin-bottom:3px}
.qb-prop-note{color:#8b949e}
</style>
<div class="qbw">
  <div class="qb-tabs">
    <button class="qbbtn on" data-tab="types">Queue Types</button>
    <button class="qbbtn" data-tab="ttl">TTL & Expiry</button>
    <button class="qbbtn" data-tab="priority">Priority Queues</button>
    <button class="qbbtn" data-tab="quorum">Quorum Queues</button>
    <button class="qbbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- QUEUE TYPES -->
  <div class="qbp on" id="qb-types">
    <div class="qb-info">Queue type = persistence + replication behavior. Choose based on durability, performance, and HA requirements.</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="qb-stab on" data-qtype="classic-durable">Classic Durable</button>
      <button class="qb-stab" data-qtype="classic-transient">Classic Transient</button>
      <button class="qb-stab" data-qtype="quorum">Quorum Queue</button>
      <button class="qb-stab" data-qtype="stream">Stream Queue</button>
    </div>
    <div id="qb-qtype-content"></div>
  </div>

  <!-- TTL -->
  <div class="qbp" id="qb-ttl">
    <div class="qb-info">TTL = Time To Live. Messages expire if not consumed within TTL. Queue-level or per-message TTL. Expired messages → DLQ or discarded.</div>
    <div class="qb-box">
      <h4>Message TTL Simulation</h4>
      <div style="margin-bottom:10px;font-size:12px;color:#8b949e">
        x-message-ttl = <span style="color:#f59134;font-weight:700" id="qb-ttl-val">5000</span>ms. Messages expire after 5s if not consumed.
      </div>
      <div class="qb-queue-vis durable">
        <h5 style="color:#3dd68c">orders-queue (x-message-ttl: 5000)</h5>
        <div class="qb-msg-queue" id="qb-ttl-msgs"></div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button id="qb-ttl-add" class="qb-stab on" style="background:#f5913422;border-color:#f59134;color:#f59134">+ Publish message</button>
        <button id="qb-ttl-consume" class="qb-stab">Consume next</button>
        <button id="qb-ttl-reset2" class="qb-stab">↺ Reset</button>
      </div>
      <div class="qb-info" id="qb-ttl-status" style="margin-top:8px">Messages expire after 5 seconds. Watch them disappear!</div>
    </div>
    <div class="qb-box">
      <h4>Queue-Level vs Per-Message TTL</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="font-weight:600;color:#f59134;margin-bottom:4px">x-message-ttl (queue-level)</div>
          <div style="color:#8b949e;line-height:1.6">Set at queue declaration. All messages share same TTL. Expired messages removed from head (when queue needs to deliver next). Cannot set lower TTL per-message on this queue.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="font-weight:600;color:#58a6ff;margin-bottom:4px">expiration (per-message)</div>
          <div style="color:#8b949e;line-height:1.6">Set as message property on publish. Can differ per message. Checked when message reaches head of queue — NOT immediately on expire. Expired messages NOT dead-lettered (just dropped) unless DLQ configured.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PRIORITY -->
  <div class="qbp" id="qb-priority">
    <div class="qb-info">Priority queue delivers highest-priority messages first. Declare with x-max-priority=N (1-255). Priority 0 = lowest, N = highest.</div>
    <div class="qb-box">
      <h4>Priority Queue Simulation</h4>
      <div style="margin-bottom:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="qb-stab on" data-prio="10" style="border-color:#f47067;color:#f47067">Publish URGENT (p=10)</button>
        <button class="qb-stab" data-prio="5" style="border-color:#f5b944;color:#f5b944">Publish NORMAL (p=5)</button>
        <button class="qb-stab" data-prio="1" style="border-color:#8b949e;color:#8b949e">Publish LOW (p=1)</button>
        <button id="qb-prio-consume" class="qb-stab" style="border-color:#3dd68c;color:#3dd68c">Consume next (highest prio)</button>
        <button id="qb-prio-reset" class="qb-stab">↺ Reset</button>
      </div>
      <div class="qb-queue-vis durable">
        <h5 style="color:#3dd68c">priority-queue (x-max-priority: 10)</h5>
        <div style="font-size:10px;color:#8b949e;margin-bottom:4px">Queue order (head→tail, sorted by priority):</div>
        <div class="qb-msg-queue" id="qb-prio-msgs"></div>
      </div>
      <div class="qb-info" id="qb-prio-status" style="margin-top:8px">Publish messages, then consume — highest priority always delivered first.</div>
    </div>
  </div>

  <!-- QUORUM QUEUES -->
  <div class="qbp" id="qb-quorum">
    <div class="qb-info">Quorum queue = replicated queue across N brokers. Leader-follower via Raft. Majority must confirm before message acked. Default in RabbitMQ 3.8+ for HA.</div>
    <div id="qb-quorum-steps" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px"></div>
    <div class="qb-info" id="qb-qinfo">Play to see quorum queue write flow.</div>
    <div class="qb-ctrls">
      <button id="qb-qprev">◀ Prev</button>
      <button id="qb-qplay">▶ Play</button>
      <button id="qb-qnext">Next ▶</button>
      <button id="qb-qreset">↺ Reset</button>
      <span class="qb-step-info" id="qb-qstep">Step 1/5</span>
    </div>
    <div class="qb-box" style="margin-top:10px">
      <h4>Quorum vs Classic Mirrored (HA)</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="font-weight:600;color:#58a6ff;margin-bottom:4px">Quorum Queue (Raft)</div>
          <div style="color:#3dd68c;margin-bottom:2px">✓ Leader election automatic</div>
          <div style="color:#3dd68c;margin-bottom:2px">✓ Majority-based consistency</div>
          <div style="color:#3dd68c;margin-bottom:2px">✓ No split-brain</div>
          <div style="color:#f47067;margin-top:4px">✗ Higher write latency</div>
          <div style="color:#f47067">✗ No per-message TTL</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="font-weight:600;color:#8b949e;margin-bottom:4px;text-decoration:line-through">Classic Mirrored (deprecated)</div>
          <div style="color:#f47067;margin-bottom:2px">✗ Complex synchronization</div>
          <div style="color:#f47067;margin-bottom:2px">✗ Split-brain risk</div>
          <div style="color:#f47067;margin-bottom:2px">✗ Slow mirror sync on join</div>
          <div style="color:#3dd68c;margin-top:4px">✓ Removed in RMQ 4.x</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TRICKS -->
  <div class="qbp" id="qb-tricks">
    <h4 style="color:#f59134;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="qb-trick"><b>Durable queue ≠ persistent messages</b> — durable queue survives restart but non-persistent messages (delivery_mode=1) are lost on restart. Need BOTH durable queue + persistent message.</div>
    <div class="qb-trick"><b>Exclusive queue</b> — bound to one connection. Auto-deleted when connection closes. Use for temporary reply queues (RPC pattern) or single-consumer streams.</div>
    <div class="qb-trick"><b>x-expires (queue TTL)</b> — auto-deletes ENTIRE queue after inactivity. Different from x-message-ttl (individual message TTL). Easy to confuse.</div>
    <div class="qb-trick"><b>Priority queue memory</b> — each priority level = separate internal queue. x-max-priority=255 creates 255 sub-queues per queue. Use 1-10 in practice.</div>
    <div class="qb-trick"><b>Lazy queues</b> — x-queue-mode=lazy. Messages written to disk immediately (not RAM). Lower memory, higher throughput for large backlogs. Default in RMQ 3.12+.</div>
    <div class="qb-trick"><b>Quorum queue consumer ack</b> — message not removed from leader until majority of quorum members ack. basicConsume without ack = message stays until acked. Must ack to free quorum storage.</div>
    <h4 style="color:#f59134;margin:14px 0 10px">Interview Q&A</h4>
    <div class="qb-q-card"><div class="q">Q: Durable vs persistent in RabbitMQ?</div><div class="a">Durable: queue metadata survives broker restart (declared with durable=true). Persistent: message payload written to disk (delivery_mode=2). Need BOTH for full durability. Durable queue + transient message = queue survives restart but messages lost. Non-durable queue + persistent message = message safe during uptime but queue (and messages) gone on restart.</div></div>
    <div class="qb-q-card"><div class="q">Q: Quorum queues vs classic mirrored queues?</div><div class="a">Classic mirrored (deprecated): synchronous replication to all mirrors, complex failure handling, split-brain risk. Quorum queues (Raft-based): majority quorum for writes, automatic leader election, no split-brain, stronger consistency. Use quorum queues for HA in RMQ 3.8+. Classic mirrored removed in RMQ 4.x.</div></div>
    <div class="qb-q-card"><div class="q">Q: How does TTL work in RabbitMQ queues?</div><div class="a">x-message-ttl: queue-level, all messages. Expired messages removed when they reach head of queue (not immediately — lazy expiry). expiration property: per-message TTL, set by publisher. Queue-level x-expires: auto-deletes entire queue after period of inactivity (no consumers, no publishing).</div></div>
    <div class="qb-q-card"><div class="q">Q: What is an exclusive queue and when to use it?</div><div class="a">Exclusive queue: only one connection can use it, auto-deleted when connection closes. Use cases: RPC reply queues (each client gets own exclusive queue for replies), temporary stream consumers, single-consumer patterns. Cannot be accessed by other connections while owner connected.</div></div>
  </div>
</div>`;

      // QUEUE TYPES
      var QTYPE_DATA={
        "classic-durable":{name:"Classic Durable Queue",color:"#3dd68c",icon:"💾",
          desc:"Survives broker restart. Messages with delivery_mode=2 also persisted to disk. Standard choice for production.",
          props:[{k:"durable",v:"true",n:"Survives restart"},{k:"auto-delete",v:"false",n:"Manual deletion only"},{k:"exclusive",v:"false",n:"Multiple connections"},{k:"x-queue-type",v:"classic",n:"Default type"}],
          note:"Need persistent messages (delivery_mode=2) too — durable queue alone doesn't persist message payloads."},
        "classic-transient":{name:"Classic Transient Queue",color:"#f59134",icon:"⚡",
          desc:"Lost on broker restart. Fast (no disk I/O for durability). Use for temporary, ephemeral work.",
          props:[{k:"durable",v:"false",n:"Lost on restart"},{k:"auto-delete",v:"true (optional)",n:"Delete when no consumers"},{k:"exclusive",v:"true (optional)",n:"Single connection"},{k:"x-queue-type",v:"classic",n:"Default type"}],
          note:"Use for RPC reply queues, temp streams. Never for critical data."},
        quorum:{name:"Quorum Queue",color:"#58a6ff",icon:"🗳",
          desc:"Replicated across N brokers via Raft. Majority must confirm write. Recommended for HA in RMQ 3.8+.",
          props:[{k:"x-queue-type",v:"quorum",n:"Required for quorum"},{k:"x-quorum-initial-group-size",v:"3",n:"Replication factor"},{k:"durable",v:"true",n:"Always durable (auto)"},{k:"delivery-limit",v:"20",n:"Max delivery attempts"}],
          note:"Higher write latency (majority ack). No per-message TTL. Deprecated classic mirrored queues replaced by this."},
        stream:{name:"Stream Queue",color:"#d2a8ff",icon:"📺",
          desc:"Kafka-like append-only log. Multiple consumers replay from offset. Persistent. Added in RMQ 3.9+.",
          props:[{k:"x-queue-type",v:"stream",n:"Stream type"},{k:"x-max-length-bytes",v:"5GB (default)",n:"Max log size"},{k:"x-max-age",v:"7D (optional)",n:"Log retention"},{k:"x-stream-offset",v:"first/last/offset/timestamp",n:"Consumer start position"}],
          note:"Use when multiple consumers need to read same messages independently (Kafka-like fan-out without consumer groups)."},
      };
      var qtMode="classic-durable";
      function renderQtype(){
        var s=QTYPE_DATA[qtMode];
        var el=mount.querySelector("#qb-qtype-content");
        el.innerHTML="<div class=\"qb-box\" style=\"border-color:"+s.color+"44\">"+
          "<div style=\"font-size:16px;margin-bottom:6px\">"+s.icon+" <span style=\"font-weight:700;color:"+s.color+"\">"+s.name+"</span></div>"+
          "<div style=\"font-size:12px;color:#8b949e;margin-bottom:10px;line-height:1.5\">"+s.desc+"</div>"+
          "<div class=\"qb-prop-grid\">"+s.props.map(function(p){return "<div class=\"qb-prop\"><div class=\"qb-prop-name\">"+p.k+"</div><div class=\"qb-prop-val\">"+p.v+"</div><div class=\"qb-prop-note\">"+p.n+"</div></div>";}).join("")+"</div>"+
          "<div style=\"background:#f5b94415;border:1px solid #f5b944;border-radius:6px;padding:8px 12px;font-size:12px;color:#f5b944\">⚠️ "+s.note+"</div></div>";
      }
      mount.querySelectorAll(".qb-stab[data-qtype]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".qb-stab[data-qtype]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");qtMode=b.dataset.qtype;renderQtype();});
      });
      renderQtype();

      // TTL SIMULATION
      var ttlMsgs=[], ttlCount=0, ttlTimer=null;
      var TTL_MS=5000;
      function renderTtlMsgs(){
        var now=Date.now();
        var el=mount.querySelector("#qb-ttl-msgs");
        el.innerHTML=ttlMsgs.map(function(m,i){
          var age=now-m.born;
          var pct=Math.min(age/TTL_MS,1);
          var expired=pct>=1;
          return "<div class=\"qb-msg "+(expired?"expired":"ready")+"\" title=\"age:"+(age/1000).toFixed(1)+"s\">"+m.id+"</div>";
        }).join("")+(ttlMsgs.length===0?"<div style=\"color:#30363d;font-size:12px\">queue empty</div>":"");
      }
      function startTtlTimer(){
        if(ttlTimer)clearInterval(ttlTimer);
        ttlTimer=setInterval(function(){
          var now=Date.now();
          var before=ttlMsgs.length;
          ttlMsgs=ttlMsgs.filter(function(m){return now-m.born<TTL_MS;});
          renderTtlMsgs();
          if(ttlMsgs.length<before)mount.querySelector("#qb-ttl-status").innerHTML="⏰ Message(s) expired after <b>5s TTL</b>. Discarded (or sent to DLQ if configured).";
        },200);
      }
      mount.querySelector("#qb-ttl-add").addEventListener("click",function(){
        ttlCount++;
        ttlMsgs.push({id:"m"+ttlCount,born:Date.now()});
        renderTtlMsgs();
        mount.querySelector("#qb-ttl-status").innerHTML="Published <b>m"+ttlCount+"</b>. Will expire in 5 seconds if not consumed.";
        startTtlTimer();
      });
      mount.querySelector("#qb-ttl-consume").addEventListener("click",function(){
        if(!ttlMsgs.length){mount.querySelector("#qb-ttl-status").innerHTML="Queue empty.";return;}
        var m=ttlMsgs.shift();
        renderTtlMsgs();
        mount.querySelector("#qb-ttl-status").innerHTML="✓ Consumed <b>"+m.id+"</b>. "+ttlMsgs.length+" remaining.";
      });
      mount.querySelector("#qb-ttl-reset2").addEventListener("click",function(){
        clearInterval(ttlTimer);ttlTimer=null;ttlMsgs=[];ttlCount=0;renderTtlMsgs();
        mount.querySelector("#qb-ttl-status").innerHTML="Messages expire after 5 seconds. Watch them disappear!";
      });

      // PRIORITY
      var prioMsgs=[], prioCount=0;
      function renderPrioMsgs(){
        var el=mount.querySelector("#qb-prio-msgs");
        var sorted=prioMsgs.slice().sort(function(a,b){return b.prio-a.prio;});
        el.innerHTML=sorted.map(function(m){
          var cls=m.prio>=8?"prio-hi":m.prio>=4?"ready":"prio-lo";
          return "<div class=\"qb-msg "+cls+"\" title=\"priority:"+m.prio+"\">"+m.prio+"</div>";
        }).join("")+(sorted.length===0?"<div style=\"color:#30363d;font-size:12px\">queue empty</div>":"");
      }
      mount.querySelectorAll(".qb-stab[data-prio]").forEach(function(b){
        b.addEventListener("click",function(){
          prioCount++;
          var prio=parseInt(b.dataset.prio);
          prioMsgs.push({id:"m"+prioCount,prio:prio});
          renderPrioMsgs();
          mount.querySelector("#qb-prio-status").innerHTML="Published m"+prioCount+" with priority <b>"+prio+"</b>. Queue sorted by priority.";
        });
      });
      mount.querySelector("#qb-prio-consume").addEventListener("click",function(){
        if(!prioMsgs.length){mount.querySelector("#qb-prio-status").innerHTML="Queue empty.";return;}
        var sorted=prioMsgs.slice().sort(function(a,b){return b.prio-a.prio;});
        var top=sorted[0];
        prioMsgs.splice(prioMsgs.indexOf(top),1);
        renderPrioMsgs();
        mount.querySelector("#qb-prio-status").innerHTML="✓ Consumed <b>"+top.id+"</b> (priority=<b>"+top.prio+"</b>). Highest priority delivered first.";
      });
      mount.querySelector("#qb-prio-reset").addEventListener("click",function(){prioMsgs=[];prioCount=0;renderPrioMsgs();mount.querySelector("#qb-prio-status").innerHTML="Publish messages, then consume — highest priority always delivered first.";});
      renderPrioMsgs();

      // QUORUM
      var QSTEPS=[
        {title:"Publish",desc:"Producer publishes to quorum queue. Leader receives message.",color:"#58a6ff",state:{leader:"receiving",f1:"idle",f2:"idle"}},
        {title:"Replicate",desc:"Leader replicates to followers (Raft log append). Each follower appends and sends ack.",color:"#f5b944",state:{leader:"replicating",f1:"acking",f2:"acking"}},
        {title:"Quorum Ack",desc:"Majority (2/3) have confirmed. Quorum achieved. Leader marks message durable.",color:"#e8741a",state:{leader:"committed",f1:"committed",f2:"acking"}},
        {title:"Producer Ack",desc:"Leader sends ack to producer. Message is now durably committed to quorum.",color:"#3dd68c",state:{leader:"committed",f1:"committed",f2:"committed"}},
        {title:"Consumer Deliver",desc:"Leader delivers to consumer. Consumer acks → message removed from quorum.",color:"#3dd68c",state:{leader:"consumed",f1:"consumed",f2:"consumed"}},
      ];
      var qqStep=0,qqTimer=null;
      function renderQuorum(){
        var s=QSTEPS[qqStep];
        var stateColor={idle:"#30363d",receiving:"#f5b944",replicating:"#58a6ff",acking:"#f59134",committed:"#3dd68c",consumed:"#d2a8ff"};
        mount.querySelector("#qb-quorum-steps").innerHTML=QSTEPS.map(function(st,i){
          return "<div style=\"background:#161b22;border:1px solid "+(i===qqStep?st.color:"#30363d")+";border-radius:8px;padding:8px;opacity:"+(i<=qqStep?1:0.4)+";transition:all .3s\">"+
            "<div style=\"font-size:11px;font-weight:700;color:"+st.color+";margin-bottom:4px\">"+st.title+"</div>"+
            "<div style=\"font-size:10px;color:#8b949e\">"+st.desc.substring(0,50)+"...</div></div>";
        }).join("");
        mount.querySelector("#qb-qinfo").innerHTML="<b style=\"color:"+s.color+"\">"+s.title+":</b> "+s.desc;
        mount.querySelector("#qb-qstep").textContent="Step "+(qqqStep=qqStep+1)+"/"+QSTEPS.length;
        var qqqStep=qqStep;
        mount.querySelector("#qb-qstep").textContent="Step "+(qqqStep+1)+"/"+QSTEPS.length;
      }
      function qqStop(){clearInterval(qqTimer);qqTimer=null;mount.querySelector("#qb-qplay").textContent="▶ Play";}
      mount.querySelector("#qb-qplay").addEventListener("click",function(){if(qqTimer){qqStop();}else{qqTimer=setInterval(function(){qqStep=Math.min(qqStep+1,QSTEPS.length-1);renderQuorum();if(qqStep===QSTEPS.length-1)qqStop();},1700);mount.querySelector("#qb-qplay").textContent="⏸ Pause";}});
      mount.querySelector("#qb-qnext").addEventListener("click",function(){qqStop();qqStep=Math.min(qqStep+1,QSTEPS.length-1);renderQuorum();});
      mount.querySelector("#qb-qprev").addEventListener("click",function(){qqStop();qqStep=Math.max(qqStep-1,0);renderQuorum();});
      mount.querySelector("#qb-qreset").addEventListener("click",function(){qqStop();qqStep=0;renderQuorum();});
      renderQuorum();

      // TABS
      mount.querySelectorAll(".qbbtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".qbbtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".qbp").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#qb-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".qb-q-card").forEach(function(c){c.addEventListener("click",function(){c.classList.toggle("open");});});
    },
    concept: `**L1 (30s ELI5):** Queue = mailbox. Durable = survives restart. TTL = message auto-expires. Priority = high-priority delivered first. Quorum = replicated across multiple brokers for HA.

**L2 (2min core):** Queue properties: durable (metadata persistence), exclusive (single-connection), auto-delete (delete when no consumers). Message persistence = delivery_mode=2. TTL: x-message-ttl (queue) or expiration (per-message). Priority: x-max-priority=N.

**L3 (10min edge cases):** Lazy queues: write to disk immediately to reduce RAM. x-expires: queue-level auto-delete on inactivity. Priority queues: N priority levels = N sub-queues internally. Quorum queues: Raft-based, majority ack, no split-brain.

**L4 (30min deep):** Quorum queues use Raft for leader election and log replication. Delivery-limit prevents poison messages. Stream queues (RMQ 3.9+): append-only log with consumer offsets — Kafka semantics in RabbitMQ. Messages not removed on consume. Per-consumer offset tracking.`,
    why: "Right queue type = significant ops difference. Classic durable: simplest. Quorum: HA. Stream: replay/fan-out. Priority: QoS. Matching queue type to use case prevents data loss and performance degradation.",
    example: {
      language: "java",
      code: `// Declare quorum queue (Spring AMQP)
@Bean
Queue ordersQueue() {
    return QueueBuilder.durable("orders")
        .quorum()                          // x-queue-type=quorum
        .withArgument("x-quorum-initial-group-size", 3)
        .withArgument("x-delivery-limit", 5) // max retries before DLQ
        .build();
}

// Priority queue
@Bean Queue priorityQueue() {
    return QueueBuilder.durable("alerts")
        .withArgument("x-max-priority", 10)
        .build();
}

// TTL queue
@Bean Queue ttlQueue() {
    return QueueBuilder.durable("sessions")
        .withArgument("x-message-ttl", 1800000) // 30 min TTL
        .withArgument("x-dead-letter-exchange", "dlx")
        .build();
}

// Publish with priority
Message msg = MessageBuilder
    .withBody(payload.getBytes())
    .setDeliveryMode(MessageDeliveryMode.PERSISTENT) // persistent!
    .setPriority(9) // high priority
    .build();
rabbitTemplate.send("orders", "payment", msg);`
    },
    gotchas: [
      "Durable queue + transient message (delivery_mode=1) = queue survives restart but messages lost",
      "Per-message TTL (expiration property): checked at delivery time (head of queue), not when message arrives",
      "x-expires deletes the ENTIRE QUEUE on inactivity — not individual messages (that's x-message-ttl)",
      "Priority queue: x-max-priority=255 creates 255 internal sub-queues. Use 1-10 max in practice",
      "Quorum queues: no per-message TTL support. Use stream queues or classic with TTL instead",
      "Lazy queues: lower RAM, higher latency (disk I/O). Default in RMQ 3.12+ for classic queues",
      "Stream queue consumers must specify offset — they don't auto-start from last position"
    ],
    interview: [
      { q: "Durable vs persistent in RabbitMQ?", a: "Durable: queue metadata survives restart (declared with durable=true). Persistent: message payload written to disk (delivery_mode=2). Need BOTH for full durability. Durable queue + transient message = queue lives but messages lost on restart." },
      { q: "Quorum vs classic mirrored queues?", a: "Classic mirrored (deprecated, removed RMQ 4.x): async replication, split-brain risk. Quorum (Raft): majority quorum for writes, automatic leader election, strong consistency. Use quorum for HA. Higher write latency (majority ack) but no split-brain." },
      { q: "How does priority queue work internally?", a: "x-max-priority=N creates N separate internal sub-queues. Consumer always served from highest non-empty priority level. In-memory priority heap. Caveat: N=255 creates 255 sub-queues per queue — use 1-10 in practice to limit overhead." },
      { q: "Stream queue vs classic queue?", a: "Classic: message consumed = removed. One consumer per message. Stream (RMQ 3.9+): append-only log. Multiple consumers with independent offsets. Messages retained until x-max-age/x-max-length-bytes. Like Kafka within RabbitMQ." }
    ],
    tradeoffs: "Durability costs disk I/O. Priority queues cost memory (N sub-queues). Quorum queues cost write latency (majority ack). Stream queues trade simplicity for replay capability. Choose based on: durability requirements, throughput needs, HA requirements."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
