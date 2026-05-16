(function() {
  var topic = {
    id: "kafka-replication-isr",
    area: "kafka",
    title: "Kafka Replication & ISR",
    tag: "replication",
    tags: ["kafka","replication","ISR","leader","follower","acks","HWM","LEO"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.irw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.ir-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.irbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.irbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.irp{display:none}.irp.on{display:block}
.ir-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.ir-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.ir-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.ir-info b{color:#e8741a}
.ir-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ir-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.ir-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.ir-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.ir-broker{background:#0d1117;border:2px solid #30363d;border-radius:10px;padding:12px;text-align:center;transition:all .3s;position:relative}
.ir-broker.leader{border-color:#e8741a;background:#e8741a08}
.ir-broker.follower{border-color:#58a6ff;background:#58a6ff08}
.ir-broker.out-isr{border-color:#f47067;background:#f4706708;opacity:.7}
.ir-broker.dead{border-color:#f47067;background:#f4706715;opacity:.5}
.ir-broker-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px}
.ir-broker-label.leader{color:#e8741a}
.ir-broker-label.follower{color:#58a6ff}
.ir-broker-label.out-isr{color:#f47067}
.ir-log-entry{display:inline-block;width:28px;height:28px;border-radius:4px;border:1px solid;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin:2px;transition:all .3s}
.ir-log-entry.committed{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.ir-log-entry.uncommitted{border-color:#f5b944;color:#f5b944;background:#f5b94415}
.ir-log-entry.missing{border-color:#30363d;color:#30363d;background:transparent}
.ir-hwm{font-size:10px;background:#3dd68c22;color:#3dd68c;border-radius:4px;padding:1px 6px;margin-top:4px;display:inline-block}
.ir-leo{font-size:10px;background:#f5b94422;color:#f5b944;border-radius:4px;padding:1px 6px;margin-top:2px;display:inline-block}
.ir-badge{font-size:10px;padding:2px 8px;border-radius:10px;display:inline-block;margin:2px}
.ir-badge.isr{background:#3dd68c22;color:#3dd68c;border:1px solid #3dd68c}
.ir-badge.out{background:#f4706722;color:#f47067;border:1px solid #f47067}
.ir-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.ir-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.ir-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.ir-trick b{color:#f5b944}
.ir-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.ir-q-card .q{font-size:13px;font-weight:600}
.ir-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.ir-q-card.open .a{display:block}.ir-q-card.open{border-color:#e8741a}
.ir-ack-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px}
.ir-ack-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px}
.ir-ack-card h5{margin:0 0 4px;font-size:13px;font-weight:700}
.ir-ack-card .pros{color:#3dd68c;font-size:11px;line-height:1.6}
.ir-ack-card .cons{color:#f47067;font-size:11px;line-height:1.6}
.ir-arrow{text-align:center;font-size:20px;color:#e8741a}
.ir-flow-row{display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px}
</style>
<div class="irw">
  <div class="ir-tabs">
    <button class="irbtn on" data-tab="replication">Replication Flow</button>
    <button class="irbtn" data-tab="isr">ISR & HWM</button>
    <button class="irbtn" data-tab="failure">Leader Failure</button>
    <button class="irbtn" data-tab="acks">Acks & Durability</button>
    <button class="irbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- REPLICATION FLOW -->
  <div class="irp on" id="ir-replication">
    <div class="ir-info" id="ir-rinfo">Leader receives writes. Followers fetch from leader. All in ISR. HWM = highest offset all ISR have.</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px" id="ir-brokers"></div>
    <div class="ir-box">
      <h4>ISR Set</h4>
      <div id="ir-isr-badges"></div>
    </div>
    <div class="ir-ctrls">
      <button id="ir-rprev">◀ Prev</button>
      <button id="ir-rplay">▶ Play</button>
      <button id="ir-rnext">Next ▶</button>
      <button id="ir-rreset">↺ Reset</button>
      <span class="ir-step-info" id="ir-rstep">Step 1/6</span>
    </div>
  </div>

  <!-- ISR & HWM -->
  <div class="irp" id="ir-isr">
    <div class="ir-box">
      <h4>Key Concepts</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:#0d1117;border-radius:6px;padding:10px">
          <div style="font-size:12px;font-weight:700;color:#3dd68c;margin-bottom:4px">HWM — High Watermark</div>
          <div style="font-size:12px;color:#8b949e;line-height:1.6">Highest offset all ISR replicas have copied. Consumers can only read up to HWM. Producer sees "committed" once HWM advances past their record.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:10px">
          <div style="font-size:12px;font-weight:700;color:#f5b944;margin-bottom:4px">LEO — Log End Offset</div>
          <div style="font-size:12px;color:#8b949e;line-height:1.6">Next offset to be written on each replica. May differ between leader and followers. Leader LEO > follower LEO until replication catches up.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:10px">
          <div style="font-size:12px;font-weight:700;color:#58a6ff;margin-bottom:4px">ISR — In-Sync Replicas</div>
          <div style="font-size:12px;color:#8b949e;line-height:1.6">Set of replicas within replica.lag.time.max.ms of leader LEO. Leader tracks ISR. Replica dropped from ISR if it falls behind for &gt;10s (default).</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:10px">
          <div style="font-size:12px;font-weight:700;color:#e8741a;margin-bottom:4px">min.insync.replicas</div>
          <div style="font-size:12px;color:#8b949e;line-height:1.6">Minimum ISR size for acks=all to succeed. Default 1. Set to 2 for durability. If ISR drops below this, producer gets NotEnoughReplicasException.</div>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="ir-stab on" data-isr="normal">Normal</button>
      <button class="ir-stab" data-isr="lag">Follower Lag</button>
      <button class="ir-stab" data-isr="shrink">ISR Shrink</button>
    </div>
    <div id="ir-isr-content"></div>
  </div>

  <!-- LEADER FAILURE -->
  <div class="irp" id="ir-failure">
    <div class="ir-info" id="ir-finfo">ZooKeeper/KRaft detects leader failure. Controller elects new leader from ISR.</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:10px" id="ir-fbrokers"></div>
    <div class="ir-ctrls">
      <button id="ir-fprev">◀ Prev</button>
      <button id="ir-fplay">▶ Play</button>
      <button id="ir-fnext">Next ▶</button>
      <button id="ir-freset">↺ Reset</button>
      <span class="ir-step-info" id="ir-fstep">Step 1/5</span>
    </div>
  </div>

  <!-- ACKS -->
  <div class="irp" id="ir-acks">
    <div class="ir-ack-grid">
      <div class="ir-ack-card">
        <h5 style="color:#f47067">acks=0</h5>
        <div style="font-size:11px;color:#8b949e;margin-bottom:8px">Fire and forget. No broker response.</div>
        <div class="pros">✓ Lowest latency<br>✓ Highest throughput</div>
        <div class="cons">✗ Data loss guaranteed<br>✗ No delivery confirmation</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">Use: metrics, logs where loss is acceptable</div>
      </div>
      <div class="ir-ack-card">
        <h5 style="color:#f5b944">acks=1</h5>
        <div style="font-size:11px;color:#8b949e;margin-bottom:8px">Leader acks after writing. Followers async.</div>
        <div class="pros">✓ Good balance<br>✓ Default setting</div>
        <div class="cons">✗ Loss if leader fails before replication<br>✗ Followers may not have data</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">Use: general purpose, can tolerate rare loss</div>
      </div>
      <div class="ir-ack-card">
        <h5 style="color:#3dd68c">acks=all (-1)</h5>
        <div style="font-size:11px;color:#8b949e;margin-bottom:8px">Leader acks only after ALL ISR confirm.</div>
        <div class="pros">✓ No data loss (with min.insync.replicas≥2)<br>✓ Strongest durability</div>
        <div class="cons">✗ Higher latency<br>✗ NotEnoughReplicas if ISR shrinks</div>
        <div style="font-size:10px;color:#8b949e;margin-top:6px">Use: financial, critical data</div>
      </div>
    </div>
    <div id="ir-acks-sim">
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <button class="ir-stab on" data-ack="0">acks=0</button>
        <button class="ir-stab" data-ack="1">acks=1</button>
        <button class="ir-stab" data-ack="all">acks=all</button>
      </div>
      <div id="ir-ack-flow"></div>
    </div>
  </div>

  <!-- TRICKS -->
  <div class="irp" id="ir-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="ir-trick"><b>acks=all alone doesn't prevent data loss</b> — need min.insync.replicas≥2. acks=all with ISR of 1 = same as acks=1.</div>
    <div class="ir-trick"><b>Unclean leader election</b> — unclean.leader.election.enable=true allows out-of-ISR replica to become leader. Prevents unavailability but risks data loss. Default: false.</div>
    <div class="ir-trick"><b>Consumers only read up to HWM</b> — records between HWM and LEO not yet visible to consumers. Safety: all ISR have data before consumer sees it.</div>
    <div class="ir-trick"><b>ISR shrink ≠ data loss</b> — ISR shrinks when follower lags. Data on leader still safe. But acks=all blocks until ISR meets min.insync.replicas.</div>
    <div class="ir-trick"><b>replica.lag.time.max.ms</b> — how long follower can be behind before kicked from ISR. Default 30s. Too tight → frequent ISR fluctuation under load.</div>
    <div class="ir-trick"><b>Preferred leader election</b> — Kafka tries to keep original leader (preferred replica). kafka-preferred-replica-election tool triggers manual rebalance.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="ir-q-card"><div class="q">Q: Explain HWM vs LEO and why consumers can't read beyond HWM.</div><div class="a">LEO = Log End Offset, next offset to write on each replica. HWM = highest offset ALL ISR replicas have. Consumers only read up to HWM. Safety: if leader fails, new leader elected from ISR will have all data up to HWM. Data beyond HWM on old leader is truncated to avoid inconsistency.</div></div>
    <div class="ir-q-card"><div class="q">Q: acks=all with replication-factor=3 — is data safe if one broker dies?</div><div class="a">Only if min.insync.replicas≥2. acks=all waits for all current ISR members to ack. If ISR is {leader,F1,F2} and F2 dies → ISR={leader,F1}. acks=all still succeeds with ISR of 2. But if min.insync.replicas=3 and ISR drops to 2 → NotEnoughReplicasException.</div></div>
    <div class="ir-q-card"><div class="q">Q: What happens when leader fails and the new leader is behind?</div><div class="a">New leader elected from ISR — so it's guaranteed to have all data up to HWM. Followers truncate any data beyond new leader's LEO on reconnect. Unclean leader election (disabled by default) would allow an out-of-ISR replica, risking data loss.</div></div>
    <div class="ir-q-card"><div class="q">Q: How does Kafka decide what's in the ISR?</div><div class="a">Leader tracks each follower's fetch offset. If follower's fetch offset falls behind leader LEO by more than replica.lag.time.max.ms (default 30s), it's removed from ISR. On catching up, it's re-added. Leader updates ISR list in ZooKeeper/KRaft metadata.</div></div>
  </div>
</div>`;

      // REPLICATION FLOW
      var RSTEPS=[
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,0,0],leo:4,hwm:3},{id:"B1",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3},{id:"B2",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3}],
          isr:["B0","B1","B2"],
          info:"All 3 brokers in ISR. Leader B0 LEO=4. HWM=3 (all ISR have offset 0-2)."
        },
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,1,0],leo:5,hwm:3},{id:"B1",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3},{id:"B2",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3}],
          isr:["B0","B1","B2"],
          info:"<b>Producer writes offset 3</b> to leader. Leader LEO→5. Followers not yet fetched. HWM stays 3."
        },
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,1,0],leo:5,hwm:3},{id:"B1",role:"follower",log:[1,1,1,1,0],leo:5,hwm:3},{id:"B2",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3}],
          isr:["B0","B1","B2"],
          info:"B1 fetched offset 3. B1 LEO→5. B2 still at LEO=3. HWM still 3 (B2 lags)."
        },
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,1,0],leo:5,hwm:4},{id:"B1",role:"follower",log:[1,1,1,1,0],leo:5,hwm:4},{id:"B2",role:"follower",log:[1,1,1,1,0],leo:5,hwm:4}],
          isr:["B0","B1","B2"],
          info:"B2 fetched offset 3. All ISR at LEO=5. <b>HWM advances to 4</b>. Consumers can now read offset 3."
        },
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,1,1],leo:6,hwm:4},{id:"B1",role:"follower",log:[1,1,1,1,0],leo:5,hwm:4},{id:"B2",role:"out-isr",log:[1,1,0,0,0],leo:2,hwm:2}],
          isr:["B0","B1"],
          info:"B2 falls behind (replica.lag.time.max.ms exceeded). <b>B2 removed from ISR.</b> ISR={B0,B1}. acks=all now only needs B0+B1."
        },
        {
          brokers:[{id:"B0",role:"leader",log:[1,1,1,1,1],leo:6,hwm:6},{id:"B1",role:"follower",log:[1,1,1,1,1],leo:6,hwm:6},{id:"B2",role:"follower",log:[1,1,1,1,1],leo:6,hwm:6}],
          isr:["B0","B1","B2"],
          info:"B2 catches up. Re-added to ISR. HWM=6. All brokers in sync."
        },
      ];
      var rStep=0,rTimer=null;
      function renderReplication(){
        var s=RSTEPS[rStep];
        mount.querySelector('#ir-brokers').innerHTML=s.brokers.map(function(b){
          var entries=b.log.map(function(v,i){return '<div class="ir-log-entry '+(v?'committed':'missing')+'" title="offset '+i+'">'+i+'</div>';}).join('');
          return '<div class="ir-broker '+b.role+'"><div class="ir-broker-label '+b.role+'">'+b.id+' — '+b.role.replace('-',' ')+'</div>'+entries+'<div style="margin-top:6px"><span class="ir-hwm">HWM='+b.hwm+'</span> <span class="ir-leo">LEO='+b.leo+'</span></div></div>';
        }).join('');
        mount.querySelector('#ir-isr-badges').innerHTML=s.isr.map(function(id){return '<span class="ir-badge isr">'+id+'</span>';}).join('')+
          s.brokers.filter(function(b){return s.isr.indexOf(b.id)<0;}).map(function(b){return '<span class="ir-badge out">'+b.id+' out</span>';}).join('');
        mount.querySelector('#ir-rinfo').innerHTML=s.info;
        mount.querySelector('#ir-rstep').textContent='Step '+(rStep+1)+'/'+RSTEPS.length;
      }
      function rStop(){clearInterval(rTimer);rTimer=null;mount.querySelector('#ir-rplay').textContent='▶ Play';}
      mount.querySelector('#ir-rplay').addEventListener('click',function(){if(rTimer){rStop();}else{rTimer=setInterval(function(){rStep=Math.min(rStep+1,RSTEPS.length-1);renderReplication();if(rStep===RSTEPS.length-1)rStop();},1800);mount.querySelector('#ir-rplay').textContent='⏸ Pause';}});
      mount.querySelector('#ir-rnext').addEventListener('click',function(){rStop();rStep=Math.min(rStep+1,RSTEPS.length-1);renderReplication();});
      mount.querySelector('#ir-rprev').addEventListener('click',function(){rStop();rStep=Math.max(rStep-1,0);renderReplication();});
      mount.querySelector('#ir-rreset').addEventListener('click',function(){rStop();rStep=0;renderReplication();});
      renderReplication();

      // ISR
      var isrMode='normal';
      var ISR_SCENARIOS={
        normal:{desc:"All replicas in sync. HWM == min(all LEOs). Consumers see all committed data.",brokers:[{id:"B0",role:"leader",log:[1,1,1,1],leo:4,hwm:4,isr:true},{id:"B1",role:"follower",log:[1,1,1,1],leo:4,hwm:4,isr:true},{id:"B2",role:"follower",log:[1,1,1,1],leo:4,hwm:4,isr:true}]},
        lag:{desc:"B2 falling behind. Still in ISR. HWM bounded by B2's LEO. Producer acks wait for B2.",brokers:[{id:"B0",role:"leader",log:[1,1,1,1,1],leo:5,hwm:3,isr:true},{id:"B1",role:"follower",log:[1,1,1,1,0],leo:4,hwm:3,isr:true},{id:"B2",role:"follower",log:[1,1,1,0,0],leo:3,hwm:3,isr:true}]},
        shrink:{desc:"B2 removed from ISR (lagged > replica.lag.time.max.ms). ISR={B0,B1}. HWM can now advance without B2.",brokers:[{id:"B0",role:"leader",log:[1,1,1,1,1],leo:5,hwm:5,isr:true},{id:"B1",role:"follower",log:[1,1,1,1,1],leo:5,hwm:5,isr:true},{id:"B2",role:"out-isr",log:[1,1,0,0,0],leo:2,hwm:2,isr:false}]},
      };
      function renderIsrSim(){
        var s=ISR_SCENARIOS[isrMode];
        var el=mount.querySelector('#ir-isr-content');
        el.innerHTML='<div class="ir-box"><div style="font-size:12px;color:#8b949e;margin-bottom:10px">'+s.desc+'</div>'+
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+
          s.brokers.map(function(b){
            return '<div class="ir-broker '+b.role+'"><div class="ir-broker-label '+b.role+'">'+b.id+'<span class="ir-badge '+(b.isr?'isr':'out')+'" style="margin-left:6px;font-size:9px">'+(b.isr?'ISR':'OUT')+'</span></div>'+
              b.log.map(function(v,i){return '<div class="ir-log-entry '+(v?'committed':'missing')+'" style="width:22px;height:22px;font-size:10px">'+i+'</div>';}).join('')+
              '<div style="margin-top:6px"><span class="ir-hwm">HWM='+b.hwm+'</span> <span class="ir-leo">LEO='+b.leo+'</span></div></div>';
          }).join('')+'</div></div>';
      }
      mount.querySelectorAll('.ir-stab[data-isr]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.ir-stab[data-isr]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');isrMode=b.dataset.isr;renderIsrSim();});
      });
      renderIsrSim();

      // LEADER FAILURE
      var FSTEPS=[
        {brokers:[{id:"B0",role:"leader",state:"alive"},{id:"B1",role:"follower",state:"alive"},{id:"B2",role:"follower",state:"alive"}],info:"Healthy cluster. B0 is leader. B1,B2 followers in ISR."},
        {brokers:[{id:"B0",role:"dead",state:"dead"},{id:"B1",role:"follower",state:"alive"},{id:"B2",role:"follower",state:"alive"}],info:"<b>B0 fails!</b> No heartbeat. ZooKeeper/KRaft controller detects failure after zookeeper.session.timeout.ms."},
        {brokers:[{id:"B0",role:"dead",state:"dead"},{id:"B1",role:"leader",state:"electing"},{id:"B2",role:"follower",state:"alive"}],info:"Controller picks B1 from ISR as new leader. B1 has all data up to HWM. Election ~2-10s."},
        {brokers:[{id:"B0",role:"dead",state:"dead"},{id:"B1",role:"leader",state:"alive"},{id:"B2",role:"follower",state:"alive"}],info:"B1 is new leader. B2 follows B1. ISR={B1,B2}. Consumers reconnect to B1."},
        {brokers:[{id:"B0",role:"follower",state:"recovering"},{id:"B1",role:"leader",state:"alive"},{id:"B2",role:"follower",state:"alive"}],info:"B0 recovers. Truncates log to HWM. Becomes follower of B1. Re-joins ISR after catching up."},
      ];
      var fStep=0,fTimer=null;
      function renderFailure(){
        var s=FSTEPS[fStep];
        mount.querySelector('#ir-fbrokers').innerHTML=s.brokers.map(function(b){
          var roleColor={'leader':'#e8741a','follower':'#58a6ff','dead':'#f47067'}[b.role]||'#8b949e';
          return '<div class="ir-broker '+(b.state==="dead"?'dead':b.role)+'" style="'+(b.state==="electing"?"border-color:#f5b944;":"")+'">'+
            '<div class="ir-broker-label" style="color:'+roleColor+'">'+b.id+'</div>'+
            '<div style="font-size:12px;color:'+roleColor+'">'+b.role+(b.state==="dead"?' ☠️':b.state==="recovering"?' (recovering)':b.state==="electing"?' ⚡':' ✓')+'</div></div>';
        }).join('');
        mount.querySelector('#ir-finfo').innerHTML=s.info;
        mount.querySelector('#ir-fstep').textContent='Step '+(fStep+1)+'/'+FSTEPS.length;
      }
      function fStop(){clearInterval(fTimer);fTimer=null;mount.querySelector('#ir-fplay').textContent='▶ Play';}
      mount.querySelector('#ir-fplay').addEventListener('click',function(){if(fTimer){fStop();}else{fTimer=setInterval(function(){fStep=Math.min(fStep+1,FSTEPS.length-1);renderFailure();if(fStep===FSTEPS.length-1)fStop();},1800);mount.querySelector('#ir-fplay').textContent='⏸ Pause';}});
      mount.querySelector('#ir-fnext').addEventListener('click',function(){fStop();fStep=Math.min(fStep+1,FSTEPS.length-1);renderFailure();});
      mount.querySelector('#ir-fprev').addEventListener('click',function(){fStop();fStep=Math.max(fStep-1,0);renderFailure();});
      mount.querySelector('#ir-freset').addEventListener('click',function(){fStop();fStep=0;renderFailure();});
      renderFailure();

      // ACKS
      var ackMode='0';
      var ACK_FLOWS={
        '0':{color:"#f47067",steps:["Producer sends","No ack wait","Producer continues"]},
        '1':{color:"#f5b944",steps:["Producer sends","Leader writes","Leader acks producer","Followers fetch async"]},
        'all':{color:"#3dd68c",steps:["Producer sends","Leader writes","B1 fetches → acks","B2 fetches → acks","Leader acks producer (all ISR confirmed)"]},
      };
      function renderAckFlow(){
        var s=ACK_FLOWS[ackMode];
        mount.querySelector('#ir-ack-flow').innerHTML='<div class="ir-box"><div style="display:flex;gap:4px;flex-wrap:wrap;align-items:center">'+
          s.steps.map(function(step,i){return '<div style="background:#0d1117;border:1px solid '+s.color+'44;border-radius:6px;padding:6px 10px;font-size:12px;color:'+s.color+'">'+step+'</div>'+(i<s.steps.length-1?'<div style="color:#8b949e;font-size:16px">→</div>':'');}).join('')+'</div></div>';
      }
      mount.querySelectorAll('.ir-stab[data-ack]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.ir-stab[data-ack]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');ackMode=b.dataset.ack;renderAckFlow();});
      });
      renderAckFlow();

      // TABS
      mount.querySelectorAll('.irbtn[data-tab]').forEach(function(btn){
        btn.addEventListener('click',function(){
          mount.querySelectorAll('.irbtn[data-tab]').forEach(function(b){b.classList.remove('on');});
          mount.querySelectorAll('.irp').forEach(function(p){p.classList.remove('on');});
          btn.classList.add('on');
          mount.querySelector('#ir-'+btn.dataset.tab).classList.add('on');
        });
      });
      mount.querySelectorAll('.ir-q-card').forEach(function(c){c.addEventListener('click',function(){c.classList.toggle('open');});});
    },
    concept: `**L1 (30s ELI5):** Kafka replicates each partition to N brokers. One is leader (takes writes), others are followers (copy). If leader dies, a follower takes over. No data loss if all ISR have the data.

**L2 (2min core):** ISR = In-Sync Replicas — replicas within replica.lag.time.max.ms of leader. HWM = High Watermark = min(all ISR LEOs) = what consumers can read. LEO = Log End Offset = what's written on each replica. acks=all waits for all ISR to confirm.

**L3 (10min edge cases):** acks=all alone not enough — need min.insync.replicas≥2. ISR shrink allows acks=all to proceed with fewer replicas. unclean.leader.election.enable=true: allows out-of-ISR leader (data loss risk). Preferred replica election: Kafka prefers original leader for balance.

**L4 (30min deep):** Leader tracks follower fetch offsets via FetchRequest/FetchResponse. Follower sends FetchRequest with its LEO → leader knows if follower is caught up. Leader's ISR update propagated via ZooKeeper/KRaft. On leader failure: controller reads ISR from metadata, picks highest LEO follower. Follower truncates log to HWM before starting. Epoch-based leader tracking prevents split-brain.`,
    why: "Replication provides durability and availability. Kafka's ISR model trades strict synchrony for performance — followers fetch asynchronously but are tracked. HWM ensures consumers always see consistent state.",
    example: {
      language: "java",
      code: `// Producer config for strong durability
Properties props = new Properties();
// All ISR must acknowledge
props.put(ProducerConfig.ACKS_CONFIG, "all");
// Enable idempotent producer (exactly-once per partition)
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
// Retry on transient failures
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
// Prevent out-of-order retries
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);

// Topic config (at creation)
// replication.factor=3: 3 copies of each partition
// min.insync.replicas=2: at least 2 must ack (with acks=all)
// If ISR drops to 1 → NotEnoughReplicasException

// Broker config
// unclean.leader.election.enable=false (default, prevents data loss)
// replica.lag.time.max.ms=30000 (follower lag threshold for ISR)
// auto.leader.rebalance.enable=true (restore preferred leaders after failover)`
    },
    gotchas: [
      "acks=all without min.insync.replicas≥2 = same as acks=1 if ISR has only leader",
      "Consumers can only read up to HWM — records between HWM and leader LEO are invisible",
      "ISR shrink ≠ data loss: data on leader is safe, but ISR shrink allows acks=all with fewer replicas",
      "unclean.leader.election=true prevents unavailability but risks data loss — disabled by default",
      "Follower truncates to HWM on leader rejoin — data written beyond HWM on old leader is discarded",
      "replica.lag.time.max.ms too short → ISR fluctuates under GC pauses or load spikes"
    ],
    interview: [
      { q: "HWM vs LEO — why consumers limited to HWM?", a: "LEO = next offset to write per replica. HWM = min(all ISR LEOs) = committed. Consumer limited to HWM: if leader fails, new leader (from ISR) has all data up to HWM. Data beyond HWM on old leader is truncated. Without this, consumer could read uncommitted data that disappears." },
      { q: "acks=all, replication-factor=3 — is data safe if 1 broker dies?", a: "Depends on min.insync.replicas. With min.insync.replicas=2: ISR={B0,B1,B2} → B2 dies → ISR={B0,B1} → acks=all succeeds with 2. Data safe. With min.insync.replicas=3: ISR drops to 2 → NotEnoughReplicasException. Producer fails." },
      { q: "What happens when leader fails?", a: "Controller (ZooKeeper or KRaft) detects via session timeout. Picks highest-LEO follower from ISR as new leader. New leader has all data up to HWM. Other followers truncate to HWM and re-replicate from new leader. Old leader recovers as follower, re-joins ISR after catching up." },
      { q: "How does Kafka know a follower is in-sync?", a: "Leader tracks last fetch time per follower. If follower's fetch falls behind leader LEO for >replica.lag.time.max.ms (default 30s), it's removed from ISR. On catching up (fetch offset ≥ leader HWM), re-added. ISR changes persisted to ZooKeeper/KRaft." }
    ],
    tradeoffs: "Higher replication factor = more durability, more disk/network. acks=all + min.insync.replicas=2 = strong guarantee with ~2x write latency. Unclean election: availability vs consistency trade-off. ISR-based model: better throughput than synchronous replication."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
