(function() {
  var topic = {
    id: "rmq-acks-delivery",
    area: "kafka",
    title: "RabbitMQ Acks & Delivery",
    tag: "rabbitmq",
    tags: ["rabbitmq","acks","nacks","prefetch","consumer-ack","publisher-confirm","delivery"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.adw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.ad-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.adbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.adbtn.on{background:#f5913422;border-color:#f59134;color:#f59134;font-weight:600}
.adp{display:none}.adp.on{display:block}
.ad-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.ad-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.ad-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.ad-info b{color:#f59134}
.ad-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ad-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.ad-ctrls button:hover{border-color:#f59134;color:#f59134}
.ad-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.ad-msg{display:inline-flex;flex-direction:column;align-items:center;margin:4px;transition:all .3s}
.ad-msg-box{width:36px;height:36px;border-radius:6px;border:2px solid;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .3s}
.ad-msg-box.ready{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.ad-msg-box.unacked{border-color:#f5b944;color:#f5b944;background:#f5b94415;animation:pulse-warn .8s infinite alternate}
.ad-msg-box.acked{border-color:#3dd68c;color:#3dd68c;background:#3dd68c22;opacity:.4}
.ad-msg-box.nacked{border-color:#f47067;color:#f47067;background:#f4706715}
.ad-msg-box.requeued{border-color:#58a6ff;color:#58a6ff;background:#58a6ff15}
@keyframes pulse-warn{from{box-shadow:none}to{box-shadow:0 0 8px #f5b944}}
.ad-node{padding:8px 16px;border-radius:8px;border:2px solid;font-size:12px;font-weight:600;text-align:center;transition:all .3s}
.ad-node.producer{border-color:#58a6ff;background:#58a6ff15;color:#58a6ff}
.ad-node.broker{border-color:#f59134;background:#f5913415;color:#f59134}
.ad-node.consumer{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.ad-node.active{box-shadow:0 0 12px currentColor}
.ad-arrow{font-size:18px;color:#f59134;margin:0 6px}
.ad-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.ad-stab.on{background:#f5913422;border-color:#f59134;color:#f59134}
.ad-trick{background:#161b22;border-left:3px solid #f59134;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.ad-trick b{color:#f5b944}
.ad-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.ad-q-card .q{font-size:13px;font-weight:600}
.ad-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.ad-q-card.open .a{display:block}.ad-q-card.open{border-color:#f59134}
.ad-unacked-bar{background:#0d1117;border:1px solid #f5b944;border-radius:6px;padding:6px 10px;margin-top:6px;font-size:12px;color:#f5b944}
</style>
<div class="adw">
  <div class="ad-tabs">
    <button class="adbtn on" data-tab="consumer-ack">Consumer Acks</button>
    <button class="adbtn" data-tab="prefetch">Prefetch / QoS</button>
    <button class="adbtn" data-tab="publisher">Publisher Confirms</button>
    <button class="adbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- CONSUMER ACKS -->
  <div class="adp on" id="ad-consumer-ack">
    <div class="ad-info" id="ad-cainfo">Consumer ack tells broker "I processed this". Without ack, broker holds message as unacked. Crash → requeued to front.</div>
    <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <button class="ad-stab on" data-ackmode="manual">Manual Ack</button>
      <button class="ad-stab" data-ackmode="autoack">Auto Ack</button>
    </div>
    <div class="ad-box">
      <h4>Message Flow</h4>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
        <div class="ad-node broker">Broker Queue<br><div class="ad-msg-box ready" id="ad-qmsg" style="width:auto;height:auto;padding:3px 8px;display:inline-block">msg #1</div></div>
        <div class="ad-arrow">→</div>
        <div class="ad-node consumer" id="ad-consumer-node">Consumer</div>
        <div id="ad-ack-flow-status" style="font-size:12px;color:#8b949e;margin-left:10px"></div>
      </div>
      <div>
        <div class="ad-unacked-bar" id="ad-unacked-bar" style="display:none">⚠️ Message in UNACKED state. Held by consumer. Broker waiting for ack/nack.</div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button id="ad-fetch" class="ad-stab on" style="background:#f5913422;border-color:#f59134;color:#f59134">Fetch message</button>
        <button id="ad-ack" class="ad-stab" style="border-color:#3dd68c;color:#3dd68c">basicAck ✓</button>
        <button id="ad-nack-requeue" class="ad-stab" style="border-color:#58a6ff;color:#58a6ff">basicNack (requeue) ↩</button>
        <button id="ad-nack-drop" class="ad-stab" style="border-color:#f47067;color:#f47067">basicNack (drop) ✗</button>
        <button id="ad-crash" class="ad-stab" style="border-color:#f47067;color:#f47067">💥 Crash</button>
        <button id="ad-reset-ack" class="ad-stab">↺ Reset</button>
      </div>
    </div>
    <div id="ad-ack-mode-note"></div>
  </div>

  <!-- PREFETCH -->
  <div class="adp" id="ad-prefetch">
    <div class="ad-info">prefetch (basicQos) = max unacked messages a consumer holds. Limits work-in-progress. Critical for back-pressure.</div>
    <div class="ad-box">
      <h4>Prefetch Simulation</h4>
      <div style="margin-bottom:8px;display:flex;gap:8px;align-items:center">
        <span style="font-size:12px;color:#8b949e">Prefetch:</span>
        <button class="ad-stab on" data-pf="1">prefetch=1</button>
        <button class="ad-stab" data-pf="3">prefetch=3</button>
        <button class="ad-stab" data-pf="unlimited">unlimited</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <div style="font-size:11px;color:#8b949e;margin-bottom:6px">Queue (10 messages):</div>
          <div id="ad-pf-queue" style="display:flex;flex-wrap:wrap;gap:3px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:6px;min-height:40px"></div>
        </div>
        <div>
          <div style="font-size:11px;color:#8b949e;margin-bottom:6px">Consumer (unacked):</div>
          <div id="ad-pf-unacked" style="display:flex;flex-wrap:wrap;gap:3px;background:#0d1117;border:1px solid #f5b944;border-radius:6px;padding:6px;min-height:40px"></div>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button id="ad-pf-fetch" class="ad-stab on" style="background:#f5913422;border-color:#f59134;color:#f59134">Fetch (respect prefetch)</button>
        <button id="ad-pf-ackall" class="ad-stab" style="border-color:#3dd68c;color:#3dd68c">Ack All</button>
        <button id="ad-pf-reset" class="ad-stab">↺ Reset</button>
      </div>
      <div class="ad-info" id="ad-pf-status" style="margin-top:8px">Prefetch limits how many messages a consumer holds unacked.</div>
    </div>
    <div class="ad-box">
      <h4>Why Prefetch Matters</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#f47067;font-weight:600;margin-bottom:4px">prefetch=0 (unlimited)</div>
          <div style="color:#8b949e;line-height:1.5">All messages sent at once. One slow consumer holds everything. No back-pressure. Memory bloat.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#3dd68c;font-weight:600;margin-bottom:4px">prefetch=1</div>
          <div style="color:#8b949e;line-height:1.5">Max fairness. Consumer gets next only after acking current. Low throughput but safest for long-running tasks.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#f5b944;font-weight:600;margin-bottom:4px">prefetch=10-100</div>
          <div style="color:#8b949e;line-height:1.5">Balanced. Consumer batches work. Good throughput. Still bounded. Most production use.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PUBLISHER CONFIRMS -->
  <div class="adp" id="ad-publisher">
    <div class="ad-info">Publisher confirms = broker acks back to producer when message durably written. Fire-and-forget vs guaranteed delivery.</div>
    <div id="ad-pub-steps" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px"></div>
    <div class="ad-info" id="ad-pub-info">Play to see publisher confirm flow.</div>
    <div class="ad-ctrls">
      <button id="ad-pprev">◀ Prev</button>
      <button id="ad-pplay">▶ Play</button>
      <button id="ad-pnext">Next ▶</button>
      <button id="ad-preset">↺ Reset</button>
      <span class="ad-step-info" id="ad-pstep">Step 1/5</span>
    </div>
    <div class="ad-box" style="margin-top:10px">
      <h4>Confirm Modes</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#f47067;font-weight:600;margin-bottom:4px">No confirms</div>
          <div style="color:#8b949e">Fire-and-forget. Fastest. No delivery guarantee. Message silently lost if broker fails.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#f5b944;font-weight:600;margin-bottom:4px">Sync confirm (waitForConfirms)</div>
          <div style="color:#8b949e">Block until ack. Simple but low throughput. Use for critical single messages.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
          <div style="color:#3dd68c;font-weight:600;margin-bottom:4px">Async confirms (callback)</div>
          <div style="color:#8b949e">Non-blocking. addConfirmListener. Track pending confirms with delivery tags. Best throughput.</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TRICKS + INTERVIEW -->
  <div class="adp" id="ad-tricks">
    <h4 style="color:#f59134;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="ad-trick"><b>Auto-ack = at-most-once</b> — broker acks immediately on deliver. Consumer crash = message lost. Never use for critical data.</div>
    <div class="ad-trick"><b>Unacked messages held by consumer</b> — not returned to queue while consumer alive. Consumer crash = requeued. Connection close = all unacked requeued.</div>
    <div class="ad-trick"><b>basicNack with requeue=true vs requeue=false</b> — requeue=true: back to FRONT of queue (infinite retry loop risk). requeue=false: discarded or DLQ if configured. Always use DLQ + requeue=false for failure handling.</div>
    <div class="ad-trick"><b>Prefetch=0 (unlimited) causes memory bloat</b> — broker sends all messages immediately. One slow consumer holds all. Set prefetch per-consumer (not per-channel) for fairness.</div>
    <div class="ad-trick"><b>Publisher confirms not transactional</b> — confirms say "durably written to broker". Not "delivered to consumer". Message can still expire in DLQ or be nacked by consumer.</div>
    <div class="ad-trick"><b>Delivery tag is channel-scoped</b> — per-channel counter, not global. Don't use delivery tags across channels. multiple=true acks all outstanding tags up to that tag on the channel.</div>
    <h4 style="color:#f59134;margin:14px 0 10px">Interview Q&A</h4>
    <div class="ad-q-card"><div class="q">Q: What's the difference between basicAck, basicNack, and basicReject?</div><div class="a">basicAck: message successfully processed, remove from queue. basicNack: batch nack (multiple=true for multiple messages). requeue=true → back to queue, requeue=false → DLQ/discard. basicReject: single message nack. requeue=true or false. Use nack for poison message → DLQ (requeue=false), or retry (requeue=true, max retries via DLQ).</div></div>
    <div class="ad-q-card"><div class="q">Q: Why is prefetch=1 not always the best?</div><div class="a">prefetch=1: max fairness but low throughput. Consumer waits for broker round-trip between each message. For fast tasks: use prefetch=50-500 for batching. For slow/unpredictable tasks: prefetch=1 ensures no single consumer monopolizes. Tune based on message processing time.</div></div>
    <div class="ad-q-card"><div class="q">Q: Publisher confirms vs AMQP transactions?</div><div class="a">AMQP transactions (tx.select/tx.commit): synchronous, atomic. 200-300x slower than confirms. Use only if you need atomicity across multiple operations. Publisher confirms: async ack from broker per message. Much faster. Handles batch confirms with multiple=true. Use confirms for throughput, transactions only if truly needed.</div></div>
    <div class="ad-q-card"><div class="q">Q: basicNack with requeue=true — what's the risk?</div><div class="a">Poison message loop: consumer nacks → requeue=true → message to front of queue → same consumer fetches again → nacks again → infinite loop. Solution: use DLQ. On failure: nack with requeue=false → message goes to dead letter exchange → DLQ → manual inspection or delayed retry.</div></div>
  </div>
</div>`;

      // CONSUMER ACKS
      var ackState='idle';
      var ackMode='manual';
      function renderAckMode(){
        var el=mount.querySelector('#ad-ack-mode-note');
        if(ackMode==='manual'){
          el.innerHTML='<div style="background:#3dd68c15;border:1px solid #3dd68c;border-radius:6px;padding:8px 12px;font-size:12px;color:#3dd68c;margin-top:4px">Manual ack: consumer must call basicAck/basicNack. Message held as UNACKED until explicit ack. Crash → requeued. At-least-once.</div>';
        } else {
          el.innerHTML='<div style="background:#f4706715;border:1px solid #f47067;border-radius:6px;padding:8px 12px;font-size:12px;color:#f47067;margin-top:4px">Auto ack: broker removes message on delivery. No unacked state. Consumer crash = message LOST. At-most-once. Fast but dangerous for critical data.</div>';
        }
      }
      function setAckState(state,msg){
        ackState=state;
        var qmsg=mount.querySelector('#ad-qmsg');
        var unbar=mount.querySelector('#ad-unacked-bar');
        var status=mount.querySelector('#ad-ack-flow-status');
        if(state==='idle'){qmsg.className='ad-msg-box ready';qmsg.textContent='msg #1';unbar.style.display='none';status.textContent='';}
        else if(state==='fetched'){qmsg.className='ad-msg-box unacked';qmsg.textContent='msg #1';unbar.style.display='block';status.innerHTML='<span style="color:#f5b944">UNACKED</span>';}
        else if(state==='acked'){qmsg.className='ad-msg-box acked';qmsg.textContent='✓';unbar.style.display='none';status.innerHTML='<span style="color:#3dd68c">Acked ✓ — removed from queue</span>';}
        else if(state==='nacked-requeue'){qmsg.className='ad-msg-box requeued';qmsg.textContent='↩';unbar.style.display='none';status.innerHTML='<span style="color:#58a6ff">Nacked+requeued → back to queue front</span>';}
        else if(state==='nacked-drop'){qmsg.className='ad-msg-box nacked';qmsg.textContent='✗';unbar.style.display='none';status.innerHTML='<span style="color:#f47067">Nacked+dropped → DLQ (if configured)</span>';}
        else if(state==='crashed'){qmsg.className='ad-msg-box requeued';qmsg.textContent='↩';unbar.style.display='none';status.innerHTML='<span style="color:#58a6ff">Consumer crashed → unacked messages requeued to front</span>';}
        mount.querySelector('#ad-cainfo').innerHTML=msg||'Consumer ack tells broker message processed. Unacked = held by consumer until ack/nack/crash.';
      }
      mount.querySelector('#ad-fetch').addEventListener('click',function(){if(ackState!=='idle')return;setAckState('fetched','Message fetched. In <b>UNACKED</b> state. Broker holds slot. Consumer must ack/nack.');});
      mount.querySelector('#ad-ack').addEventListener('click',function(){if(ackState!=='fetched')return;setAckState('acked','<b>basicAck</b> sent. Broker removes message. Slot freed.');});
      mount.querySelector('#ad-nack-requeue').addEventListener('click',function(){if(ackState!=='fetched')return;setAckState('nacked-requeue','<b>basicNack(requeue=true)</b>. Message back to front. Risk: infinite retry loop if processing always fails. Use DLQ.');setTimeout(function(){setAckState('idle','');},2000);});
      mount.querySelector('#ad-nack-drop').addEventListener('click',function(){if(ackState!=='fetched')return;setAckState('nacked-drop','<b>basicNack(requeue=false)</b>. Message sent to dead letter exchange/queue (if configured) or discarded.');});
      mount.querySelector('#ad-crash').addEventListener('click',function(){if(ackState!=='fetched'){setAckState('idle','💥 Crashed with no unacked messages — no effect.');return;}setAckState('crashed','💥 <b>Consumer crashed!</b> All unacked messages requeued to front of queue.');setTimeout(function(){setAckState('idle','');},2000);});
      mount.querySelector('#ad-reset-ack').addEventListener('click',function(){setAckState('idle','');});
      mount.querySelectorAll('.ad-stab[data-ackmode]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.ad-stab[data-ackmode]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');ackMode=b.dataset.ackmode;renderAckMode();});
      });
      renderAckMode();
      setAckState('idle');

      // PREFETCH
      var pfMode=1, pfQueue=[], pfUnacked=[], pfCount=0;
      function initPfQueue(){pfQueue=[];pfCount=0;for(var i=1;i<=10;i++){pfQueue.push(i);}pfUnacked=[];}
      function renderPf(){
        mount.querySelector('#ad-pf-queue').innerHTML=pfQueue.map(function(n){return '<div class="ad-msg-box ready" style="width:24px;height:24px;font-size:9px">'+n+'</div>';}).join('')+(pfQueue.length===0?'<div style="color:#30363d;font-size:11px">empty</div>':'');
        mount.querySelector('#ad-pf-unacked').innerHTML=pfUnacked.map(function(n){return '<div class="ad-msg-box unacked" style="width:24px;height:24px;font-size:9px">'+n+'</div>';}).join('')+(pfUnacked.length===0?'<div style="color:#30363d;font-size:11px">none</div>':'');
      }
      initPfQueue();renderPf();
      mount.querySelectorAll('.ad-stab[data-pf]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.ad-stab[data-pf]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');pfMode=b.dataset.pf==='unlimited'?Infinity:parseInt(b.dataset.pf);mount.querySelector('#ad-pf-status').innerHTML='Prefetch set to '+(pfMode===Infinity?'unlimited':pfMode)+'. Try fetching messages.';});
      });
      mount.querySelector('#ad-pf-fetch').addEventListener('click',function(){
        if(!pfQueue.length){mount.querySelector('#ad-pf-status').innerHTML='Queue empty.';return;}
        if(pfUnacked.length>=pfMode){mount.querySelector('#ad-pf-status').innerHTML='⚠️ Prefetch limit reached ('+pfMode+'). Consumer blocked until messages acked.';return;}
        var n=pfQueue.shift();pfUnacked.push(n);renderPf();
        mount.querySelector('#ad-pf-status').innerHTML='Fetched msg '+n+'. Unacked: '+pfUnacked.length+'/'+(pfMode===Infinity?'∞':pfMode)+'. Queue: '+pfQueue.length+' remaining.';
      });
      mount.querySelector('#ad-pf-ackall').addEventListener('click',function(){var n=pfUnacked.length;pfUnacked=[];renderPf();mount.querySelector('#ad-pf-status').innerHTML='Acked '+n+' messages. Consumer ready to fetch more.';});
      mount.querySelector('#ad-pf-reset').addEventListener('click',function(){initPfQueue();renderPf();mount.querySelector('#ad-pf-status').innerHTML='Prefetch limits how many messages a consumer holds unacked.';});

      // PUBLISHER CONFIRMS
      var PSTEPS=[
        {title:"Channel Confirm",desc:"channel.confirmSelect(). Puts channel in confirm mode. Broker assigns delivery tags.",color:"#58a6ff"},
        {title:"Publish",desc:"channel.basicPublish(). Message sent to broker. Delivery tag incremented.",color:"#f59134"},
        {title:"Persist",desc:"Broker writes to queue + disk (if persistent). Waits for all mirrors/quorum members if HA.",color:"#f5b944"},
        {title:"Broker Ack",desc:"Broker sends basic.ack to producer. multiple=true acks all tags up to this one.",color:"#3dd68c"},
        {title:"Nack / Timeout",desc:"If broker fails: basic.nack returned. Producer must retry. Or: timeout → retry yourself.",color:"#f47067"},
      ];
      var pStep=0,pTimer=null;
      function renderPub(){
        mount.querySelector('#ad-pub-steps').innerHTML=PSTEPS.map(function(s,i){
          return '<div style="background:#161b22;border:1px solid '+(i===pStep?s.color:'#30363d')+';border-radius:8px;padding:8px;opacity:'+(i<=pStep?1:0.4)+';transition:all .3s">'+
            '<div style="font-size:11px;font-weight:700;color:'+s.color+';margin-bottom:4px">'+s.title+'</div>'+
            '<div style="font-size:10px;color:#8b949e">'+s.desc+'</div></div>';
        }).join('');
        mount.querySelector('#ad-pub-info').innerHTML='<b style="color:'+PSTEPS[pStep].color+'">'+PSTEPS[pStep].title+':</b> '+PSTEPS[pStep].desc;
        mount.querySelector('#ad-pstep').textContent='Step '+(pStep+1)+'/'+PSTEPS.length;
      }
      function pStop(){clearInterval(pTimer);pTimer=null;mount.querySelector('#ad-pplay').textContent='▶ Play';}
      mount.querySelector('#ad-pplay').addEventListener('click',function(){if(pTimer){pStop();}else{pTimer=setInterval(function(){pStep=Math.min(pStep+1,PSTEPS.length-1);renderPub();if(pStep===PSTEPS.length-1)pStop();},1700);mount.querySelector('#ad-pplay').textContent='⏸ Pause';}});
      mount.querySelector('#ad-pnext').addEventListener('click',function(){pStop();pStep=Math.min(pStep+1,PSTEPS.length-1);renderPub();});
      mount.querySelector('#ad-pprev').addEventListener('click',function(){pStop();pStep=Math.max(pStep-1,0);renderPub();});
      mount.querySelector('#ad-preset').addEventListener('click',function(){pStop();pStep=0;renderPub();});
      renderPub();

      // TABS
      mount.querySelectorAll('.adbtn[data-tab]').forEach(function(btn){
        btn.addEventListener('click',function(){
          mount.querySelectorAll('.adbtn[data-tab]').forEach(function(b){b.classList.remove('on');});
          mount.querySelectorAll('.adp').forEach(function(p){p.classList.remove('on');});
          btn.classList.add('on');
          mount.querySelector('#ad-'+btn.dataset.tab).classList.add('on');
        });
      });
      mount.querySelectorAll('.ad-q-card').forEach(function(c){c.addEventListener('click',function(){c.classList.toggle('open');});});
    },
    concept: `**L1 (30s ELI5):** Ack = "got it, done". Nack = "failed, put it back (or discard)". Prefetch = "give me max N at a time". Publisher confirm = broker says "I saved your message".

**L2 (2min core):** Consumer ack modes: auto (remove on deliver, at-most-once), manual (remove on basicAck, at-least-once). basicNack: requeue=true (retry) or false (DLQ). Prefetch (basicQos): limits unacked messages per consumer. Publisher confirms: broker acks when durably stored.

**L3 (10min edge cases):** Delivery tag = channel-scoped counter. multiple=true in ack/nack acks all messages up to that tag. Prefetch per-consumer vs per-channel (global). AMQP transactions: 200x slower than confirms, use only for atomic multi-operation.

**L4 (30min deep):** Unacked messages tracked in per-channel unacked set. On channel close: all unacked requeued. Memory: unacked messages held in memory (not written to disk until channel closed). Publisher confirms: broker writes to WAL, acks producer. With quorum queues: ack only after majority have written.`,
    why: "Ack semantics define delivery guarantee. Manual ack = at-least-once. Publisher confirms = producer delivery guarantee. Prefetch = backpressure. Together they enable robust, reliable messaging without overwhelming consumers.",
    example: {
      language: "java",
      code: `// Consumer: manual ack with prefetch
channel.basicQos(10); // prefetch = 10 unacked max
channel.basicConsume("orders", false, // autoAck=false
    (tag, delivery) -> {
        try {
            process(delivery.getBody());
            channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
        } catch (Exception e) {
            // nack + don't requeue → goes to DLQ
            channel.basicNack(
                delivery.getEnvelope().getDeliveryTag(),
                false,  // multiple=false
                false   // requeue=false → DLQ
            );
        }
    },
    tag -> {});

// Publisher confirms (async)
channel.confirmSelect();
channel.addConfirmListener(
    (deliveryTag, multiple) -> {
        // ack: message durably stored
        pendingConfirms.remove(deliveryTag);
    },
    (deliveryTag, multiple) -> {
        // nack: retry
        retry(pendingConfirms.get(deliveryTag));
    }
);
long tag = channel.getNextPublishSeqNo();
pendingConfirms.put(tag, message);
channel.basicPublish("orders", "payment",
    MessageProperties.PERSISTENT_TEXT_PLAIN, message);`
    },
    gotchas: [
      "autoAck=true = at-most-once. Message removed on delivery. Consumer crash = data lost",
      "basicNack(requeue=true) can create infinite retry loops for poison messages. Use DLQ instead",
      "Prefetch=0 (unlimited): all messages sent to consumer. Slow consumer → memory bloat in consumer",
      "Delivery tag is channel-scoped. Don't ack across channels or after channel reconnect",
      "Publisher confirms ≠ message delivered to consumer. Confirms only say broker durably stored",
      "AMQP transactions: 200x slower than confirms. Use only for truly atomic multi-message operations",
      "Connection close requeues ALL unacked messages — design for redelivery"
    ],
    interview: [
      { q: "basicAck vs basicNack vs basicReject?", a: "basicAck: processed, remove from queue. basicNack: batch nack (multiple=true for all up to tag). requeue=true → back to queue (retry risk), requeue=false → DLQ. basicReject: single message. Same as nack but no multiple. Use nack for poison message pattern." },
      { q: "Why prefetch=1 not always best?", a: "prefetch=1: max fairness, low throughput (round-trip per message). For fast tasks: use 50-500 for batching. For slow/unpredictable: prefetch=1 prevents monopolization. Match prefetch to processing time: slow tasks → low prefetch, fast tasks → high prefetch." },
      { q: "Publisher confirms vs AMQP transactions?", a: "Transactions: atomic multi-op, 200x slower. Confirms: per-message ack from broker, async, fast. Use confirms for throughput with guarantee. Use transactions only if you need atomic publish-of-multiple-messages (rare)." },
      { q: "What happens to unacked messages on consumer crash?", a: "Broker requeues ALL unacked messages from that channel to the front of the queue. Another consumer (or same after restart) gets them. This is the at-least-once guarantee — messages may be processed twice. Design consumers to be idempotent." }
    ],
    tradeoffs: "Manual ack: reliable but requires ack on every message. Auto ack: fast, risky. prefetch high: throughput, memory risk. prefetch low: safe, slow. Publisher confirms: guaranteed delivery at cost of round-trip per batch."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
