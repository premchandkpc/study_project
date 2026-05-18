(function() {
  var topic = {
    id: "kafka-consumer-groups",
    area: "kafka",
    title: "Kafka Consumer Groups",
    tag: "consumer",
    tags: ["kafka","consumer-groups","rebalance","partition-assignment","offsets"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.cgw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.cg-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.cgbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.cgbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.cgp{display:none}.cgp.on{display:block}
.cg-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.cg-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px}
.cg-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.cg-node{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;margin-bottom:6px;border:1px solid #30363d;background:#0d1117;font-size:13px;transition:all .3s}
.cg-node.active{border-color:#e8741a;background:#e8741a15}
.cg-node.joining{border-color:#f5b944;background:#f5b94415}
.cg-node.syncing{border-color:#58a6ff;background:#58a6ff15}
.cg-node.stable{border-color:#3dd68c;background:#3dd68c15}
.cg-node.revoking{border-color:#f47067;background:#f4706715}
.cg-dot{width:10px;height:10px;border-radius:50%;background:#30363d;flex-shrink:0}
.cg-dot.active{background:#e8741a}.cg-dot.joining{background:#f5b944}
.cg-dot.syncing{background:#58a6ff}.cg-dot.stable{background:#3dd68c}.cg-dot.revoking{background:#f47067}
.cg-leader{font-size:10px;background:#e8741a33;color:#e8741a;border-radius:4px;padding:1px 5px;margin-left:auto}
.cg-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;color:#cdd9e5;margin-bottom:10px;min-height:36px;line-height:1.5}
.cg-info b{color:#e8741a}
.cg-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.cg-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.cg-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.cg-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.cg-part-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}
.cg-part{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;border:2px solid;transition:all .3s}
.cg-part.p0{color:#58a6ff;border-color:#58a6ff;background:#58a6ff15}
.cg-part.p1{color:#e8741a;border-color:#e8741a;background:#e8741a15}
.cg-part.p2{color:#3dd68c;border-color:#3dd68c;background:#3dd68c15}
.cg-part.p3{color:#f5b944;border-color:#f5b944;background:#f5b94415}
.cg-part.p4{color:#d2a8ff;border-color:#d2a8ff;background:#d2a8ff15}
.cg-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.cg-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.cg-consumer-label{width:90px;color:#8b949e;font-size:12px}
.cg-timeout-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.cg-to-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;text-align:center}
.cg-to-card h5{margin:0 0 4px;font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.6px}
.cg-to-card .val{font-size:20px;font-weight:700;color:#e8741a}
.cg-to-card .note{font-size:10px;color:#8b949e;margin-top:4px;line-height:1.4}
.cg-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.cg-trick b{color:#f5b944}
.cg-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.cg-q-card .q{font-size:13px;color:#cdd9e5;font-weight:600}
.cg-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.cg-q-card.open .a{display:block}
.cg-q-card.open{border-color:#e8741a}
.cg-phase{padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #30363d;background:#0d1117;color:#8b949e;transition:all .3s}
.cg-phase.active{border-color:#e8741a;background:#e8741a22;color:#e8741a}
.cg-phase.done{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.cg-eager-note{background:#f4706715;border:1px solid #f47067;border-radius:6px;padding:8px 12px;font-size:12px;color:#f47067;margin-bottom:8px}
.cg-coop-note{background:#3dd68c15;border:1px solid #3dd68c;border-radius:6px;padding:8px 12px;font-size:12px;color:#3dd68c;margin-bottom:8px}
.cg-hb-label{font-size:12px;color:#8b949e;width:180px}
.cg-hb-val{font-size:12px;color:#e8741a;font-weight:600}
</style>
<div class="cgw">
  <div class="cg-tabs">
    <button class="cgbtn on" data-tab="group">Group Formation</button>
    <button class="cgbtn" data-tab="rebalance">Rebalance Protocol</button>
    <button class="cgbtn" data-tab="strategies">Partition Strategies</button>
    <button class="cgbtn" data-tab="timeouts">Timeouts & Heartbeats</button>
    <button class="cgbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <div class="cgp on" id="cg-group">
    <div class="cg-info" id="cg-ginfo">Group coordinator handles membership. Consumers send FindCoordinator → JoinGroup → SyncGroup.</div>
    <div class="cg-grid">
      <div>
        <div class="cg-box">
          <h4>Consumers</h4>
          <div id="cg-consumers"></div>
        </div>
        <div class="cg-box" style="margin-top:10px">
          <h4>Coordinator Broker State</h4>
          <div id="cg-broker-state" style="font-size:13px;color:#8b949e">Waiting for members...</div>
        </div>
      </div>
      <div>
        <div class="cg-box">
          <h4>Protocol Phases</h4>
          <div id="cg-phases" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>
          <h4 style="font-size:11px;color:#8b949e;margin:0 0 6px">Partitions Assigned</h4>
          <div id="cg-assignments" class="cg-part-row"></div>
        </div>
      </div>
    </div>
    <div class="cg-ctrls">
      <button id="cg-gprev">◀ Prev</button>
      <button id="cg-gplay">▶ Play</button>
      <button id="cg-gnext">Next ▶</button>
      <button id="cg-greset">↺ Reset</button>
      <span class="cg-step-info" id="cg-gstep">Step 1 / 7</span>
    </div>
  </div>

  <div class="cgp" id="cg-rebalance">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="cg-stab on" data-rb="eager">Eager (Stop-the-World)</button>
      <button class="cg-stab" data-rb="cooperative">Cooperative (Incremental)</button>
    </div>
    <div id="cg-rb-content"></div>
  </div>

  <div class="cgp" id="cg-strategies">
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <button class="cg-stab on" data-strat="range">Range</button>
      <button class="cg-stab" data-strat="roundrobin">RoundRobin</button>
      <button class="cg-stab" data-strat="sticky">Sticky</button>
    </div>
    <div id="cg-strat-content"></div>
  </div>

  <div class="cgp" id="cg-timeouts">
    <div class="cg-timeout-grid">
      <div class="cg-to-card">
        <h5>session.timeout.ms</h5>
        <div class="val">10s</div>
        <div class="note">Broker declares consumer dead if no heartbeat in this window. Default 45s. Too low → false rebalances from GC pauses.</div>
      </div>
      <div class="cg-to-card">
        <h5>heartbeat.interval.ms</h5>
        <div class="val">3s</div>
        <div class="note">Background thread frequency. Must be &lt; session/3. Separate from poll thread. Alive ≠ processing.</div>
      </div>
      <div class="cg-to-card">
        <h5>max.poll.interval.ms</h5>
        <div class="val">300s</div>
        <div class="note">Max time between poll() calls. Exceeded = kicked from group. Most common production gotcha.</div>
      </div>
    </div>
    <div class="cg-box">
      <h4>Heartbeat Simulation</h4>
      <div id="cg-hb-bars"></div>
      <div style="margin-top:10px;display:flex;gap:8px">
        <button id="cg-hb-slowpoll" style="background:#f4706715;border:1px solid #f47067;color:#f47067;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px">Simulate Slow poll()</button>
        <button id="cg-hb-reset2" style="background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px">↺ Reset</button>
      </div>
      <div id="cg-hb-result" style="margin-top:8px;font-size:12px"></div>
    </div>
  </div>

  <div class="cgp" id="cg-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="cg-trick"><b>heartbeat alive ≠ consumer processing</b> — heartbeat thread is separate. Consumer can send heartbeats but be stuck processing. max.poll.interval.ms catches this.</div>
    <div class="cg-trick"><b>max.poll.interval.ms exceeded</b> — consumer kicked even though heartbeats healthy. Set based on processing time, not session timeout.</div>
    <div class="cg-trick"><b>Eager rebalance stops ALL consumers</b> — ALL partitions revoked, then reassigned. Use CooperativeStickyAssignor to avoid full stop.</div>
    <div class="cg-trick"><b>Range assignor hotspot</b> — consumer-0 gets P0 from every subscribed topic. Hot partition → overloaded consumer.</div>
    <div class="cg-trick"><b>One eager member forces all eager</b> — cooperative requires ALL members to use same strategy. Mixed group falls back to eager.</div>
    <div class="cg-trick"><b>__consumer_offsets</b> — 50 partitions, compacted. Group coordinator = broker owning hash(group.id) % 50 partition.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="cg-q-card"><div class="q">Q: Walk through JoinGroup → SyncGroup protocol.</div><div class="a">1. All consumers send JoinGroup to coordinator. 2. Coordinator waits group.initial.rebalance.delay.ms. 3. Leader elected (first joiner) receives all member metadata. 4. Leader runs assignment algo, sends SyncGroup with plan. 5. Coordinator distributes assignments. 6. Consumers begin fetching.</div></div>
    <div class="cg-q-card"><div class="q">Q: session.timeout.ms vs max.poll.interval.ms — which catches a processing hang?</div><div class="a">max.poll.interval.ms. Heartbeat thread is separate from poll thread. Consumer can send healthy heartbeats while stuck in processing. Broker tracks time between poll() calls separately. Exceeded → consumer removed from group.</div></div>
    <div class="cg-q-card"><div class="q">Q: Why prefer CooperativeStickyAssignor?</div><div class="a">Default eager rebalance revokes ALL partitions before reassignment → stop-the-world pause. CooperativeStickyAssignor: 2-round incremental, only revokes partitions that need to move. Existing partitions keep fetching. Also sticky: minimizes partition moves across rebalances.</div></div>
    <div class="cg-q-card"><div class="q">Q: How does Kafka pick the group coordinator?</div><div class="a">hash(group.id) % 50 (default partitions in __consumer_offsets). Broker that leads that partition becomes group coordinator. All heartbeats, offset commits, group management flow through that broker.</div></div>
  </div>
</div>`;

      var GSTEPS = [
        { consumers:[{id:"C-1",state:"joining"}], broker:"FindCoordinator request received", phases:[], assignments:[], info:"C-1 sends <b>FindCoordinator</b> to any broker. Broker responds with coordinator address." },
        { consumers:[{id:"C-1",state:"joining"},{id:"C-2",state:"joining"}], broker:"JoinGroup: collecting members...", phases:["JoinGroup"], assignments:[], info:"C-1, C-2 send <b>JoinGroup</b>. Coordinator waits <code>group.initial.rebalance.delay.ms</code>." },
        { consumers:[{id:"C-1",state:"joining",leader:true},{id:"C-2",state:"joining"},{id:"C-3",state:"joining"}], broker:"All joined. Leader: C-1", phases:["JoinGroup"], assignments:[], info:"All 3 joined. <b>C-1 elected leader</b> (first joiner). Gets full member list + metadata." },
        { consumers:[{id:"C-1",state:"syncing",leader:true},{id:"C-2",state:"syncing"},{id:"C-3",state:"syncing"}], broker:"SyncGroup: distributing assignments", phases:["JoinGroup","SyncGroup"], assignments:[], info:"C-1 runs RangeAssignor, sends <b>SyncGroup</b> with assignments. Others send empty SyncGroup." },
        { consumers:[{id:"C-1",state:"stable",leader:true},{id:"C-2",state:"stable"},{id:"C-3",state:"stable"}], broker:"STABLE — all assigned", phases:["JoinGroup","SyncGroup","Stable"], assignments:["P0","P1","P2","P3","P4","P5"], info:"Group <b>STABLE</b>. C-1→P0,P1 | C-2→P2,P3 | C-3→P4,P5. Consumers begin polling." },
        { consumers:[{id:"C-1",state:"stable",leader:true},{id:"C-2",state:"stable"},{id:"C-3",state:"stable"}], broker:"Offsets committed to __consumer_offsets", phases:["JoinGroup","SyncGroup","Stable","Commit"], assignments:["P0","P1","P2","P3","P4","P5"], info:"Consumers commit offsets to <b>__consumer_offsets</b> internal compacted topic (50 partitions)." },
        { consumers:[{id:"C-1",state:"stable",leader:true},{id:"C-2",state:"revoking"},{id:"C-3",state:"stable"}], broker:"LeaveGroup → rebalance triggered", phases:["JoinGroup","SyncGroup","Stable","Commit","Rebalance"], assignments:["P0","P1","P2","P3","P4","P5"], info:"C-2 leaves → <b>rebalance triggered</b>. Eager: ALL partitions revoked first. P2,P3 redistributed to C-1, C-3." },
      ];
      var gStep=0, gTimer=null;
      var PCOLS=["p0","p1","p2","p3","p4","p5"];
      function renderGroup() {
        var s=GSTEPS[gStep];
        mount.querySelector("#cg-consumers").innerHTML=s.consumers.map(function(c){
          return "<div class=\"cg-node "+c.state+"\"><span class=\"cg-dot "+c.state+"\"></span>"+c.id+(c.leader?"<span class=\"cg-leader\">LEADER</span>":"")+"<span style=\"margin-left:auto;font-size:11px;color:#8b949e\">"+c.state+"</span></div>";
        }).join("");
        mount.querySelector("#cg-broker-state").innerHTML=s.broker;
        var phAll=["FindCoord","JoinGroup","SyncGroup","Stable","Commit","Rebalance"];
        mount.querySelector("#cg-phases").innerHTML=phAll.map(function(ph){
          var done=s.phases.indexOf(ph)>=0;
          var act=done&&s.phases[s.phases.length-1]===ph;
          return "<div class=\"cg-phase "+(act?"active":done?"done":"")+"\">"+ph+"</div>";
        }).join("");
        mount.querySelector("#cg-assignments").innerHTML=s.assignments.map(function(p,i){
          return "<div class=\"cg-part "+PCOLS[i]+"\">"+p+"</div>";
        }).join("");
        mount.querySelector("#cg-ginfo").innerHTML=s.info;
        mount.querySelector("#cg-gstep").textContent="Step "+(gStep+1)+" / "+GSTEPS.length;
      }
      function gStop(){clearInterval(gTimer);gTimer=null;mount.querySelector("#cg-gplay").textContent="▶ Play";}
      function gStart(){gTimer=setInterval(function(){gStep=Math.min(gStep+1,GSTEPS.length-1);renderGroup();if(gStep===GSTEPS.length-1)gStop();},1800);mount.querySelector("#cg-gplay").textContent="⏸ Pause";}
      mount.querySelector("#cg-gplay").addEventListener("click",function(){gTimer?gStop():gStart();});
      mount.querySelector("#cg-gnext").addEventListener("click",function(){gStop();gStep=Math.min(gStep+1,GSTEPS.length-1);renderGroup();});
      mount.querySelector("#cg-gprev").addEventListener("click",function(){gStop();gStep=Math.max(gStep-1,0);renderGroup();});
      mount.querySelector("#cg-greset").addEventListener("click",function(){gStop();gStep=0;renderGroup();});
      renderGroup();

      // REBALANCE
      var rbMode="eager";
      function renderRebalance() {
        var el=mount.querySelector("#cg-rb-content");
        if(rbMode==="eager") {
          el.innerHTML="<div class=\"cg-eager-note\">⚠️ Eager: ALL partitions revoked from ALL consumers before reassignment. Full stop-the-world pause.</div><div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px\" id=\"cg-esteps\"></div><div class=\"cg-info\" id=\"cg-einfo\">Play to simulate eager rebalance when C-3 joins.</div><div class=\"cg-ctrls\"><button id=\"cg-eprev\">◀ Prev</button><button id=\"cg-eplay\">▶ Play</button><button id=\"cg-enext\">Next ▶</button><button id=\"cg-ereset\">↺ Reset</button><span class=\"cg-step-info\" id=\"cg-estep\">Step 1/4</span></div>";
          var ES=[
            {title:"Before",consumers:[{l:"C-1",p:["P0","P1"]},{l:"C-2",p:["P2","P3"]}],info:"C-1→P0,P1. C-2→P2,P3. C-3 about to join.",color:"#3dd68c"},
            {title:"Revoke ALL",consumers:[{l:"C-1",p:[]},{l:"C-2",p:[]},{l:"C-3",p:[]}],info:"<b>ALL partitions revoked.</b> Zero fetching. Stop-the-world begins.",color:"#f47067"},
            {title:"JoinGroup",consumers:[{l:"C-1",p:[]},{l:"C-2",p:[]},{l:"C-3",p:[]}],info:"All 3 send JoinGroup. ~1-2s pause. Leader re-runs assignment.",color:"#f5b944"},
            {title:"Reassign",consumers:[{l:"C-1",p:["P0","P1"]},{l:"C-2",p:["P2","P3"]},{l:"C-3",p:["P4","P5"]}],info:"New assign. C-3 gets P4,P5. <b>P0-P3 unchanged but were revoked unnecessarily.</b>",color:"#3dd68c"},
          ];
          var eS=0,eT=null;
          var rE = function(){
            var eEl=mount.querySelector("#cg-esteps");if(!eEl)return;
            eEl.innerHTML=ES.map(function(s,i){return "<div style=\"background:#161b22;border:1px solid "+(i===eS?s.color:"#30363d")+";border-radius:8px;padding:8px;opacity:"+(i<=eS?1:0.4)+"\"><div style=\"font-size:11px;font-weight:600;color:"+s.color+";margin-bottom:4px\">"+s.title+"</div>"+s.consumers.map(function(c){return "<div style=\"font-size:11px;color:#cdd9e5\">"+c.l+": "+(c.p.length?c.p.join(","):"<span style=\"color:#f47067\">idle</span>")+"</div>";}).join("")+"</div>";}).join("");
            mount.querySelector("#cg-einfo").innerHTML=ES[eS].info;
            mount.querySelector("#cg-estep").textContent="Step "+(eS+1)+"/"+ES.length;
          };
          var eStop = function(){clearInterval(eT);eT=null;var b=mount.querySelector("#cg-eplay");if(b)b.textContent="▶ Play";};
          mount.querySelector("#cg-eplay").addEventListener("click",function(){if(eT){eStop();}else{eT=setInterval(function(){eS=Math.min(eS+1,ES.length-1);rE();if(eS===ES.length-1)eStop();},1600);mount.querySelector("#cg-eplay").textContent="⏸ Pause";}});
          mount.querySelector("#cg-enext").addEventListener("click",function(){eStop();eS=Math.min(eS+1,ES.length-1);rE();});
          mount.querySelector("#cg-eprev").addEventListener("click",function(){eStop();eS=Math.max(eS-1,0);rE();});
          mount.querySelector("#cg-ereset").addEventListener("click",function(){eStop();eS=0;rE();});
          rE();
        } else {
          el.innerHTML="<div class=\"cg-coop-note\">✓ Cooperative: only partitions that MOVE are revoked. Others keep fetching. 2-round protocol.</div><div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px\" id=\"cg-csteps\"></div><div class=\"cg-info\" id=\"cg-cinfo\">CooperativeStickyAssignor: round 1 revokes movers, round 2 assigns to new owner.</div><div class=\"cg-ctrls\"><button id=\"cg-cprev\">◀ Prev</button><button id=\"cg-cplay\">▶ Play</button><button id=\"cg-cnext\">Next ▶</button><button id=\"cg-creset\">↺ Reset</button><span class=\"cg-step-info\" id=\"cg-cstep\">Step 1/5</span></div>";
          var CS=[
            {title:"Before",consumers:[{l:"C-1",p:["P0","P1"],s:"stable"},{l:"C-2",p:["P2","P3"],s:"stable"}],info:"2 consumers stable. C-3 joining. P4,P5 unassigned (new topic partitions).",color:"#3dd68c"},
            {title:"Round 1 Join",consumers:[{l:"C-1",p:["P0","P1"],s:"stable"},{l:"C-2",p:["P2","P3"],s:"stable"},{l:"C-3",p:[],s:"joining"}],info:"<b>Round 1:</b> C-3 sends JoinGroup. Only new P4,P5 need assignment. C-1,C-2 keep fetching.",color:"#58a6ff"},
            {title:"No Revoke",consumers:[{l:"C-1",p:["P0","P1"],s:"stable"},{l:"C-2",p:["P2","P3"],s:"stable"},{l:"C-3",p:[],s:"syncing"}],info:"<b>No revocation.</b> C-1,C-2 continue. Only C-3 waits for assignment.",color:"#f5b944"},
            {title:"Assign New",consumers:[{l:"C-1",p:["P0","P1"],s:"stable"},{l:"C-2",p:["P2","P3"],s:"stable"},{l:"C-3",p:["P4","P5"],s:"stable"}],info:"<b>Round 2:</b> C-3 gets P4,P5. Zero downtime for C-1,C-2.",color:"#3dd68c"},
            {title:"Stable",consumers:[{l:"C-1",p:["P0","P1"],s:"stable"},{l:"C-2",p:["P2","P3"],s:"stable"},{l:"C-3",p:["P4","P5"],s:"stable"}],info:"All stable. Sticky: same partitions stay with same consumer unless forced to move.",color:"#3dd68c"},
          ];
          var cS=0,cT=null;
          var rC = function(){
            var cEl=mount.querySelector("#cg-csteps");if(!cEl)return;
            cEl.innerHTML=CS.map(function(s,i){return "<div style=\"background:#161b22;border:1px solid "+(i===cS?s.color:"#30363d")+";border-radius:8px;padding:8px;opacity:"+(i<=cS?1:0.4)+"\"><div style=\"font-size:11px;font-weight:600;color:"+s.color+";margin-bottom:4px\">"+s.title+"</div>"+s.consumers.map(function(c){return "<div style=\"font-size:11px;color:"+(c.s==="stable"?"#3dd68c":c.s==="joining"?"#f5b944":"#58a6ff")+"\">"+c.l+": "+(c.p.length?c.p.join(","):"waiting")+"</div>";}).join("")+"</div>";}).join("");
            mount.querySelector("#cg-cinfo").innerHTML=CS[cS].info;
            mount.querySelector("#cg-cstep").textContent="Step "+(cS+1)+"/"+CS.length;
          };
          var cStop = function(){clearInterval(cT);cT=null;var b=mount.querySelector("#cg-cplay");if(b)b.textContent="▶ Play";};
          mount.querySelector("#cg-cplay").addEventListener("click",function(){if(cT){cStop();}else{cT=setInterval(function(){cS=Math.min(cS+1,CS.length-1);rC();if(cS===CS.length-1)cStop();},1600);mount.querySelector("#cg-cplay").textContent="⏸ Pause";}});
          mount.querySelector("#cg-cnext").addEventListener("click",function(){cStop();cS=Math.min(cS+1,CS.length-1);rC();});
          mount.querySelector("#cg-cprev").addEventListener("click",function(){cStop();cS=Math.max(cS-1,0);rC();});
          mount.querySelector("#cg-creset").addEventListener("click",function(){cStop();cS=0;rC();});
          rC();
        }
      }
      mount.querySelectorAll(".cg-stab[data-rb]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".cg-stab[data-rb]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");rbMode=b.dataset.rb;renderRebalance();});
      });
      renderRebalance();

      // STRATEGIES
      var stratMode="range";
      var STRATS={
        range:{desc:"Per-topic consecutive ranges. Consumer-0 always gets P0 from every topic.",assignments:[{c:"C-0",p:["A:P0","A:P1","B:P0","B:P1"]},{c:"C-1",p:["A:P2","A:P3","B:P2","B:P3"]},{c:"C-2",p:["A:P4","A:P5","B:P4","B:P5"]}],warn:"C-0 gets P0 from every topic. Hot partition → C-0 overloaded.",after:null},
        roundrobin:{desc:"Flatten all topic-partitions, assign round-robin. Most even distribution.",assignments:[{c:"C-0",p:["A:P0","A:P3","B:P0","B:P3"]},{c:"C-1",p:["A:P1","A:P4","B:P1","B:P4"]},{c:"C-2",p:["A:P2","A:P5","B:P2","B:P5"]}],warn:"Requires all consumers subscribe to same topics. Imbalanced with different subscriptions.",after:null},
        sticky:{desc:"Like RoundRobin but preserves prior assignment on rebalance. Minimizes moves.",assignments:[{c:"C-0",p:["A:P0","A:P3","B:P0","B:P3"]},{c:"C-1",p:["A:P1","A:P4","B:P1","B:P4"]},{c:"C-2",p:["A:P2","A:P5","B:P2","B:P5"]}],warn:"Best for stateful consumers. Existing partitions stay assigned unless forced to move.",after:{note:"After C-1 leaves → C-1 partitions go to C-0 only. C-2 unchanged.",rows:[{c:"C-0",p:["A:P0","A:P3","B:P0","B:P3","A:P1","B:P1"]},{c:"C-2",p:["A:P2","A:P5","B:P2","B:P5"]}]}},
      };
      var COLS=["p0","p1","p2","p3","p4","p5"];
      function renderStrat(){
        var s=STRATS[stratMode];
        var el=mount.querySelector("#cg-strat-content");
        el.innerHTML="<div class=\"cg-box\"><div style=\"font-size:12px;color:#8b949e;margin-bottom:10px\">"+s.desc+"</div>"+
          s.assignments.map(function(a,i){return "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\"><span class=\"cg-consumer-label\">"+a.c+"</span><div style=\"display:flex;gap:4px;flex-wrap:wrap\">"+a.p.map(function(p,j){return "<div class=\"cg-part "+COLS[(i*2+j)%6]+"\" style=\"padding:3px 8px;font-size:11px\">"+p+"</div>";}).join("")+"</div></div>";}).join("")+
          (s.after?"<div style=\"margin-top:10px;border-top:1px solid #30363d;padding-top:10px\"><div style=\"font-size:11px;color:#f5b944;margin-bottom:6px\">After C-1 leaves:</div>"+s.after.rows.map(function(a){return "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\"><span class=\"cg-consumer-label\">"+a.c+"</span><div style=\"display:flex;gap:4px;flex-wrap:wrap\">"+a.p.map(function(p,j){return "<div class=\"cg-part "+COLS[j%6]+"\" style=\"padding:3px 8px;font-size:11px\">"+p+"</div>";}).join("")+"</div></div>";}).join("")+"<div style=\"font-size:11px;color:#3dd68c\">"+s.after.note+"</div></div>":"")+"</div>"+
          "<div style=\"margin-top:8px;background:#f5b94415;border:1px solid #f5b944;border-radius:6px;padding:8px 12px;font-size:12px;color:#f5b944\">⚠️ "+s.warn+"</div>";
      }
      mount.querySelectorAll(".cg-stab[data-strat]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".cg-stab[data-strat]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");stratMode=b.dataset.strat;renderStrat();});
      });
      renderStrat();

      // HEARTBEAT SIMULATION
      var hbState={lastPoll:Date.now(),hbCount:0,pollCount:0,kicked:false,slowPoll:false};
      var hbTimer=null;
      var MAX_POLL=8000;
      function renderHbBars(){
        var now=Date.now(),since=hbState.kicked?MAX_POLL+1:Math.min(now-hbState.lastPoll,MAX_POLL+1);
        var pct=Math.min(since/MAX_POLL*100,100);
        var color=since>MAX_POLL?"#f47067":since>MAX_POLL*0.7?"#f5b944":"#3dd68c";
        mount.querySelector("#cg-hb-bars").innerHTML=
          "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\"><span class=\"cg-hb-label\">Heartbeats sent</span><span class=\"cg-hb-val\">"+hbState.hbCount+"</span></div>"+
          "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\"><span class=\"cg-hb-label\">poll() calls</span><span class=\"cg-hb-val\">"+hbState.pollCount+"</span></div>"+
          "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:6px\"><span class=\"cg-hb-label\">Time since poll()</span><div style=\"flex:1;background:#0d1117;border-radius:4px;height:8px;overflow:hidden;margin:0 8px\"><div style=\"height:8px;border-radius:4px;background:"+color+";width:"+pct+"%;transition:width .3s\"></div></div><span style=\"font-size:12px;color:"+color+"\">"+Math.round(since/1000)+"s / "+(MAX_POLL/1000)+"s</span></div>";
        var res=mount.querySelector("#cg-hb-result");
        if(hbState.kicked){res.innerHTML="<div style=\"background:#f4706715;border:1px solid #f47067;border-radius:6px;padding:8px 12px;color:#f47067;font-size:12px\">⚠️ max.poll.interval.ms exceeded! Consumer kicked from group despite healthy heartbeats. Rebalance triggered.</div>";}
        else if(since>MAX_POLL*0.7){res.innerHTML="<div style=\"background:#f5b94415;border:1px solid #f5b944;border-radius:6px;padding:8px 12px;color:#f5b944;font-size:12px\">⚠️ Approaching limit. Call poll() soon or increase max.poll.interval.ms.</div>";}
        else{res.innerHTML="<div style=\"color:#3dd68c;font-size:12px\">✓ Consumer healthy. Heartbeats flowing, poll() called regularly.</div>";}
      }
      function startHb(){
        hbState={lastPoll:Date.now(),hbCount:0,pollCount:0,kicked:false,slowPoll:false};
        mount.querySelector("#cg-hb-slowpoll").textContent="Simulate Slow poll()";
        mount.querySelector("#cg-hb-slowpoll").style.opacity="1";
        hbTimer=setInterval(function(){
          if(hbState.kicked)return;
          hbState.hbCount++;
          if(!hbState.slowPoll){hbState.pollCount++;hbState.lastPoll=Date.now();}
          if(Date.now()-hbState.lastPoll>MAX_POLL)hbState.kicked=true;
          renderHbBars();
        },500);
      }
      mount.querySelector("#cg-hb-slowpoll").addEventListener("click",function(){
        hbState.slowPoll=true;
        mount.querySelector("#cg-hb-slowpoll").textContent="⚠️ Slow poll() active...";
        mount.querySelector("#cg-hb-slowpoll").style.opacity="0.5";
      });
      mount.querySelector("#cg-hb-reset2").addEventListener("click",function(){clearInterval(hbTimer);startHb();});
      startHb();

      // TAB SWITCHING
      mount.querySelectorAll(".cgbtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".cgbtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".cgp").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#cg-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".cg-q-card").forEach(function(card){
        card.addEventListener("click",function(){card.classList.toggle("open");});
      });
    },
    concept: `**L1 (30s ELI5):** Consumer group = team sharing a partition queue. Each partition → exactly one consumer. Add consumers → Kafka redistributes work (rebalance).

**L2 (2min core):** Group coordinator (broker) manages membership via JoinGroup/SyncGroup protocol. One consumer elected leader, runs assignment algo, sends plan to coordinator. Coordinator distributes to all members. Offsets committed to __consumer_offsets (50 partitions, compacted).

**L3 (10min edge cases):** Three timeouts: session.timeout.ms (heartbeat deadline), heartbeat.interval.ms (send freq, must be < session/3), max.poll.interval.ms (time between poll() calls — catches processing hangs, not heartbeat hangs). Rebalance strategies: Range (per-topic consecutive, hotspots), RoundRobin (even across all partitions), Sticky (preserves prev assignment). Eager vs Cooperative: eager revokes ALL partitions, cooperative only revokes moving partitions.

**L4 (30min deep):** __consumer_offsets has 50 partitions. Coordinator = broker leading hash(group.id)%50 partition. SyncGroup: leader sends full assignment, followers send empty. Protocol negotiation: all members must agree — one eager member forces group to eager. Static membership (group.instance.id) skips rebalance on restart within session.timeout. Incremental cooperative uses 2 rounds: round 1 find movers, round 2 assign.`,
    why: "Horizontal scale: add consumers = linear throughput up to partition count. Fault tolerance: consumer dies → auto-reassign. Exactly-once = consumer groups + transactional offset commits.",
    example: {
      language: "java",
      code: `Properties props = new Properties();
props.put(ConsumerConfig.GROUP_ID_CONFIG, "my-group");
// Cooperative: no stop-the-world rebalance
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
    CooperativeStickyAssignor.class.getName());
// Heartbeat must be < session/3
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000);
// Set based on max processing time for a batch
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);

KafkaConsumer<String, String> consumer = new KafkaConsumer<>(props);
Map<TopicPartition, OffsetAndMetadata> currentOffsets = new HashMap<>();

consumer.subscribe(List.of("orders"), new ConsumerRebalanceListener() {
    public void onPartitionsRevoked(Collection<TopicPartition> parts) {
        consumer.commitSync(currentOffsets); // commit before revoke
    }
    public void onPartitionsAssigned(Collection<TopicPartition> parts) {
        parts.forEach(p -> loadState(p)); // init state for new partitions
    }
});

while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    for (ConsumerRecord<String, String> r : records) {
        process(r);
        currentOffsets.put(
            new TopicPartition(r.topic(), r.partition()),
            new OffsetAndMetadata(r.offset() + 1));
    }
    consumer.commitAsync(currentOffsets, null);
}`
    },
    gotchas: [
      "max.poll.interval.ms exceeded kicks consumer even if heartbeats healthy — heartbeat thread ≠ poll thread",
      "heartbeat.interval.ms must be < session.timeout.ms / 3 or broker won't wait 3 missed beats",
      "Eager rebalance: ALL partitions revoked first → all consumers pause. 50ms becomes 2s in large clusters",
      "Range assignor: consumer-0 gets P0 from every subscribed topic → hotspot if P0 is high-traffic",
      "Mixed assignor strategies in a group → entire group falls back to eager",
      "Static membership (group.instance.id): consumer can restart without triggering rebalance if back within session.timeout.ms",
      "__consumer_offsets coordinator = broker for hash(group.id) % 50 — that broker is your performance bottleneck"
    ],
    interview: [
      { q: "Walk through JoinGroup → SyncGroup protocol.", a: "1. All consumers send JoinGroup. 2. Coordinator waits group.initial.rebalance.delay.ms. 3. Leader elected (first joiner), gets full member list. 4. Leader runs assignment algo, sends SyncGroup with plan. 5. Coordinator distributes. 6. Consumers fetch." },
      { q: "session.timeout.ms vs max.poll.interval.ms — which catches processing hang?", a: "max.poll.interval.ms. Heartbeat thread separate from poll thread. Consumer can heartbeat fine while stuck in processing loop. Broker tracks time between poll() independently." },
      { q: "Why prefer CooperativeStickyAssignor?", a: "Default eager revokes ALL before reassigning → stop-the-world. Cooperative: 2-round, only revokes moving partitions, others keep fetching. Sticky minimizes moves across rebalances — good for stateful consumers (cache locality)." },
      { q: "How does Kafka pick group coordinator?", a: "hash(group.id) % 50 (default __consumer_offsets partitions). Broker leading that partition = coordinator. All heartbeats, commits, membership flow through it." }
    ],
    tradeoffs: "More consumers = more rebalances. Cooperative: faster rebalances, requires all members to opt in. Sticky: min moves, slightly more complex assignment. Large groups: increase group.initial.rebalance.delay.ms to let all members join before first assignment."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
