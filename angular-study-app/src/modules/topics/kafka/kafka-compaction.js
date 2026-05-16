(function() {
  var topic = {
    id: "kafka-compaction",
    area: "kafka",
    title: "Kafka Log Compaction",
    tag: "storage",
    tags: ["kafka","log-compaction","cleanup","tombstone","changelog","ktable"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.lcw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.lc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.lcbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.lcbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.lcp{display:none}.lcp.on{display:block}
.lc-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.lc-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.lc-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.lc-info b{color:#e8741a}
.lc-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.lc-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.lc-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.lc-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.lc-record{display:inline-flex;flex-direction:column;align-items:center;margin:4px;transition:all .4s}
.lc-record-box{width:52px;height:52px;border-radius:6px;border:2px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:10px;font-weight:700;transition:all .4s;position:relative}
.lc-record-box.active{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.lc-record-box.old{border-color:#30363d;background:#0d1117;color:#8b949e;text-decoration:line-through;opacity:.4}
.lc-record-box.tombstone{border-color:#f47067;background:#f4706715;color:#f47067}
.lc-record-box.deleted{opacity:.1;transform:scale(.7)}
.lc-record-key{font-size:10px;color:#8b949e;margin-top:3px}
.lc-record-offset{font-size:9px;color:#30363d;margin-top:1px}
.lc-log-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.lc-log-label{font-size:11px;color:#8b949e;width:90px;padding-top:14px;flex-shrink:0}
.lc-records-area{display:flex;flex-wrap:wrap;gap:2px}
.lc-arrow-down{text-align:center;color:#e8741a;font-size:20px;margin:4px 0}
.lc-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.lc-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.lc-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.lc-trick b{color:#f5b944}
.lc-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.lc-q-card .q{font-size:13px;font-weight:600}
.lc-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.lc-q-card.open .a{display:block}.lc-q-card.open{border-color:#e8741a}
.lc-stat{display:inline-block;background:#161b22;border:1px solid #30363d;border-radius:6px;padding:6px 12px;font-size:12px;margin:4px}
.lc-stat b{color:#e8741a}
.lc-config-row{display:flex;align-items:baseline;gap:8px;margin-bottom:6px;font-size:12px}
.lc-config-key{color:#58a6ff;font-family:monospace}
.lc-config-val{color:#e8741a;font-family:monospace}
</style>
<div class="lcw">
  <div class="lc-tabs">
    <button class="lcbtn on" data-tab="how">How Compaction Works</button>
    <button class="lcbtn" data-tab="tombstone">Tombstones & Delete</button>
    <button class="lcbtn" data-tab="usecases">Use Cases</button>
    <button class="lcbtn" data-tab="config">Config & Tuning</button>
    <button class="lcbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- HOW COMPACTION WORKS -->
  <div class="lcp on" id="lc-how">
    <div class="lc-info" id="lc-hinfo">Log compaction keeps the LATEST value per key. Older versions removed. Tail (recent data) never compacted. Head (older) is compacted.</div>
    <div class="lc-box">
      <h4>Partition Log — Before & After Compaction</h4>
      <div id="lc-before-row" class="lc-log-row">
        <span class="lc-log-label">Before</span>
        <div class="lc-records-area" id="lc-before"></div>
      </div>
      <div style="text-align:center;color:#e8741a;font-size:18px;margin:6px 0" id="lc-compact-arrow">▼ Compaction runs...</div>
      <div class="lc-log-row" id="lc-after-row">
        <span class="lc-log-label">After</span>
        <div class="lc-records-area" id="lc-after"></div>
      </div>
      <div style="margin-top:8px">
        <span class="lc-stat">Before: <b>10</b> records</span>
        <span class="lc-stat" id="lc-after-stat">After: <b>?</b> records</span>
        <span class="lc-stat" id="lc-space-stat">Space saved: <b>?</b></span>
      </div>
    </div>
    <div class="lc-ctrls">
      <button id="lc-hprev">◀ Prev</button>
      <button id="lc-hplay">▶ Play</button>
      <button id="lc-hnext">Next ▶</button>
      <button id="lc-hreset">↺ Reset</button>
      <span class="lc-step-info" id="lc-hstep">Step 1/5</span>
    </div>
  </div>

  <!-- TOMBSTONES -->
  <div class="lcp" id="lc-tombstone">
    <div class="lc-info" style="background:#f4706715;border-color:#f47067">Tombstone = record with <b style="color:#f47067">null value</b>. Signals "delete this key". Compaction eventually removes BOTH the tombstone AND prior versions.</div>
    <div id="lc-tomb-steps" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:10px"></div>
    <div class="lc-info" id="lc-tomb-info">Click Play to see tombstone lifecycle.</div>
    <div class="lc-ctrls">
      <button id="lc-tprev">◀ Prev</button>
      <button id="lc-tplay">▶ Play</button>
      <button id="lc-tnext">Next ▶</button>
      <button id="lc-treset">↺ Reset</button>
      <span class="lc-step-info" id="lc-tstep">Step 1/5</span>
    </div>
    <div class="lc-box" style="margin-top:10px">
      <h4>delete.retention.ms</h4>
      <div style="font-size:12px;color:#8b949e;line-height:1.6">Tombstone retained for <code style="color:#e8741a">delete.retention.ms</code> (default 86400000 = 24h) before final removal. Consumers that are offline during this window won't see the delete. They MUST read the tombstone before it's purged.</div>
    </div>
  </div>

  <!-- USE CASES -->
  <div class="lcp" id="lc-usecases">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="lc-stab on" data-uc="ktable">KTable / Changelog</button>
      <button class="lc-stab" data-uc="snapshot">DB Snapshot</button>
      <button class="lc-stab" data-uc="eventlog">Event Log vs Delete</button>
    </div>
    <div id="lc-uc-content"></div>
  </div>

  <!-- CONFIG -->
  <div class="lcp" id="lc-config">
    <div class="lc-box">
      <h4>Topic-Level Config</h4>
      <div class="lc-config-row"><span class="lc-config-key">cleanup.policy</span><span class="lc-config-val">compact</span><span style="color:#8b949e;font-size:11px">— enable compaction</span></div>
      <div class="lc-config-row"><span class="lc-config-key">cleanup.policy</span><span class="lc-config-val">compact,delete</span><span style="color:#8b949e;font-size:11px">— compact + time-based delete</span></div>
      <div class="lc-config-row"><span class="lc-config-key">min.cleanable.dirty.ratio</span><span class="lc-config-val">0.5</span><span style="color:#8b949e;font-size:11px">— compact when 50% of log is dirty (has duplicates). Lower = more frequent compaction</span></div>
      <div class="lc-config-row"><span class="lc-config-key">segment.ms</span><span class="lc-config-val">86400000</span><span style="color:#8b949e;font-size:11px">— roll new segment every 24h (tail becomes compactable)</span></div>
      <div class="lc-config-row"><span class="lc-config-key">delete.retention.ms</span><span class="lc-config-val">86400000</span><span style="color:#8b949e;font-size:11px">— tombstone retained for 24h before final removal</span></div>
      <div class="lc-config-row"><span class="lc-config-key">min.compaction.lag.ms</span><span class="lc-config-val">0</span><span style="color:#8b949e;font-size:11px">— min time before record can be compacted. Prevents too-fresh data from being compacted</span></div>
    </div>
    <div class="lc-box">
      <h4>Broker-Level Config</h4>
      <div class="lc-config-row"><span class="lc-config-key">log.cleaner.threads</span><span class="lc-config-val">1</span><span style="color:#8b949e;font-size:11px">— background cleaner threads. Increase for high-compaction workloads</span></div>
      <div class="lc-config-row"><span class="lc-config-key">log.cleaner.io.max.bytes.per.second</span><span class="lc-config-val">unbounded</span><span style="color:#8b949e;font-size:11px">— throttle compaction I/O to avoid impacting producers</span></div>
      <div class="lc-config-row"><span class="lc-config-key">log.cleaner.dedupe.buffer.size</span><span class="lc-config-val">134217728</span><span style="color:#8b949e;font-size:11px">— 128MB in-memory hash of latest offsets per key. Too small → multiple passes</span></div>
    </div>
    <div class="lc-box">
      <h4>How Cleaner Picks What to Compact</h4>
      <div style="font-size:12px;color:#8b949e;line-height:1.8">
        1. Builds in-memory map: key → latest offset<br>
        2. Scans log head, replaces old entries with empty (holes)<br>
        3. Writes clean segment (no holes)<br>
        4. Active segment (tail) is never compacted — only sealed segments<br>
        5. dirty ratio = (dirty bytes) / (total bytes). Triggers compaction when > min.cleanable.dirty.ratio
      </div>
    </div>
  </div>

  <!-- TRICKS -->
  <div class="lcp" id="lc-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="lc-trick"><b>Compaction ≠ immediate</b> — runs in background (log.cleaner.threads). Duplicates exist until compaction runs. Consumers may see old values if they restart before compaction.</div>
    <div class="lc-trick"><b>Active segment never compacted</b> — tail (current write segment) is always kept. Only sealed older segments are compacted. You always see the latest record, but compaction takes time.</div>
    <div class="lc-trick"><b>Tombstone deletion window</b> — offline consumers MUST read tombstone before delete.retention.ms. If they miss it, they won't know the key was deleted → stale cache.</div>
    <div class="lc-trick"><b>compact + delete = time-bounded compacted topic</b> — cleanup.policy=compact,delete removes old records after retention.ms AND compacts. Good for time-limited snapshots.</div>
    <div class="lc-trick"><b>Offsets are not re-used</b> — after compaction, gaps appear in offset sequence (e.g., 0,3,7). Consumer can seek but must handle gaps. LEO and HWM still advance normally.</div>
    <div class="lc-trick"><b>KTable semantics require compacted topic</b> — Kafka Streams KTable uses compacted changelog topics. On restart, stream reads full topic to rebuild state — compaction keeps this fast.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="lc-q-card"><div class="q">Q: What does log compaction guarantee?</div><div class="a">For any key that was ever written, consumers reading from offset 0 will see at least the latest value for that key. Older versions are removed. Compacted topics act as a changelog: full history not needed, just latest state. Does NOT guarantee no duplicates during compaction window.</div></div>
    <div class="lc-q-card"><div class="q">Q: How do you delete a key from a compacted topic?</div><div class="a">Write a tombstone: record with the key and null value. Compaction eventually removes both the tombstone and all prior records for that key. Tombstone is retained for delete.retention.ms (default 24h) so offline consumers can see the delete signal.</div></div>
    <div class="lc-q-card"><div class="q">Q: When would you use cleanup.policy=compact,delete?</div><div class="a">When you want compaction (latest-per-key) AND time-based expiry. E.g., user session state: compact to keep latest session, delete to expire sessions older than 7 days. Prevents infinite growth while keeping current state.</div></div>
    <div class="lc-q-card"><div class="q">Q: Why do KTables use compacted topics as changelogs?</div><div class="a">KTable = materialized view of latest state per key. On Kafka Streams app restart, it must rebuild in-memory state. Without compaction, it must replay ALL history. With compaction, only latest values remain → fast rebuild. Compacted changelog = the source of truth for KTable state stores.</div></div>
  </div>
</div>`;

      // HOW COMPACTION WORKS
      var BEFORE_DATA=[
        {key:"user:1",val:"Alice",offset:0},{key:"user:2",val:"Bob",offset:1},
        {key:"user:1",val:"AliceV2",offset:2},{key:"user:3",val:"Carol",offset:3},
        {key:"user:2",val:"BobV2",offset:4},{key:"user:1",val:"AliceV3",offset:5},
        {key:"user:4",val:"Dave",offset:6},{key:"user:2",val:"BobV3",offset:7},
        {key:"user:3",val:"CarolV2",offset:8},{key:"user:5",val:"Eve",offset:9},
      ];
      var KEEP_OFFSETS=[5,9,8,6,7]; // latest for each key
      var HSTEPS=[
        {state:'before',info:"Before compaction: 10 records. Keys user:1,2,3 have multiple versions."},
        {state:'scanning',info:"<b>Cleaner scans log:</b> builds map of key → latest offset. user:1→5, user:2→7, user:3→8, user:4→6, user:5→9."},
        {state:'marking',info:"<b>Old versions marked for removal:</b> offsets 0,1,2,3,4 are older versions. Will be replaced with holes."},
        {state:'compacting',info:"<b>Compaction in progress:</b> old versions removed. New clean segment written without holes."},
        {state:'after',info:"<b>After compaction:</b> 5 records remain (one per key). 50% space saved. Offsets are kept but have gaps."},
      ];
      var hStep=0,hTimer=null;
      function recClass(r,state){
        var isLatest=KEEP_OFFSETS.indexOf(r.offset)>=0;
        if(state==='before'||state==='scanning') return 'active';
        if(state==='marking') return isLatest?'active':'old';
        if(state==='compacting') return isLatest?'active':'deleted';
        return 'active';
      }
      function renderCompaction(){
        var s=HSTEPS[hStep];
        var st=s.state;
        mount.querySelector('#lc-before').innerHTML=BEFORE_DATA.map(function(r){
          return '<div class="lc-record"><div class="lc-record-box '+recClass(r,st)+'"><div>'+r.key.replace('user:','U')+'</div><div>'+r.val.substring(0,6)+'</div></div><div class="lc-record-key">off:'+r.offset+'</div></div>';
        }).join('');
        var afterEl=mount.querySelector('#lc-after');
        var arrowEl=mount.querySelector('#lc-compact-arrow');
        if(st==='after'){
          var kept=BEFORE_DATA.filter(function(r){return KEEP_OFFSETS.indexOf(r.offset)>=0;}).sort(function(a,b){return a.offset-b.offset;});
          afterEl.innerHTML=kept.map(function(r){return '<div class="lc-record"><div class="lc-record-box active"><div>'+r.key.replace('user:','U')+'</div><div>'+r.val.substring(0,6)+'</div></div><div class="lc-record-key">off:'+r.offset+'</div></div>';}).join('');
          mount.querySelector('#lc-after-stat').innerHTML='After: <b>'+kept.length+'</b> records';
          mount.querySelector('#lc-space-stat').innerHTML='Space saved: <b>50%</b>';
          arrowEl.style.color='#3dd68c';
          arrowEl.textContent='✓ Compaction complete';
        } else {
          afterEl.innerHTML='<div style="color:#8b949e;font-size:12px;padding:14px">...</div>';
          mount.querySelector('#lc-after-stat').innerHTML='After: <b>?</b> records';
          mount.querySelector('#lc-space-stat').innerHTML='Space saved: <b>?</b>';
          arrowEl.style.color='#e8741a';
          arrowEl.textContent='▼ Compaction runs...';
        }
        mount.querySelector('#lc-hinfo').innerHTML=s.info;
        mount.querySelector('#lc-hstep').textContent='Step '+(hStep+1)+'/'+HSTEPS.length;
      }
      function hStop(){clearInterval(hTimer);hTimer=null;mount.querySelector('#lc-hplay').textContent='▶ Play';}
      mount.querySelector('#lc-hplay').addEventListener('click',function(){if(hTimer){hStop();}else{hTimer=setInterval(function(){hStep=Math.min(hStep+1,HSTEPS.length-1);renderCompaction();if(hStep===HSTEPS.length-1)hStop();},1700);mount.querySelector('#lc-hplay').textContent='⏸ Pause';}});
      mount.querySelector('#lc-hnext').addEventListener('click',function(){hStop();hStep=Math.min(hStep+1,HSTEPS.length-1);renderCompaction();});
      mount.querySelector('#lc-hprev').addEventListener('click',function(){hStop();hStep=Math.max(hStep-1,0);renderCompaction();});
      mount.querySelector('#lc-hreset').addEventListener('click',function(){hStop();hStep=0;renderCompaction();});
      renderCompaction();

      // TOMBSTONES
      var TSTEPS=[
        {title:"Write",desc:"Producer writes key=user:42 with value 'Dave'. Stored at offset 3.",color:"#3dd68c",records:[{k:"U:42",v:"Dave",off:3,cls:"active"}]},
        {title:"Update",desc:"Producer writes key=user:42 again with 'DaveV2'. Old value at offset 3 now stale.",color:"#f5b944",records:[{k:"U:42",v:"Dave",off:3,cls:"old"},{k:"U:42",v:"DaveV2",off:7,cls:"active"}]},
        {title:"Tombstone",desc:"Producer sends key=user:42 with value=null. This is a TOMBSTONE — signals deletion.",color:"#f47067",records:[{k:"U:42",v:"Dave",off:3,cls:"old"},{k:"U:42",v:"DaveV2",off:7,cls:"old"},{k:"U:42",v:"null",off:12,cls:"tombstone"}]},
        {title:"Compaction",desc:"Compaction removes all prior values for user:42. Only tombstone remains (for delete.retention.ms).",color:"#f47067",records:[{k:"U:42",v:"null",off:12,cls:"tombstone"}]},
        {title:"Final Purge",desc:"After delete.retention.ms (default 24h), tombstone itself removed. Key fully deleted from log.",color:"#8b949e",records:[]},
      ];
      var tStep=0,tTimer=null;
      function renderTomb(){
        mount.querySelector('#lc-tomb-steps').innerHTML=TSTEPS.map(function(s,i){
          return '<div style="background:#161b22;border:1px solid '+(i===tStep?s.color:'#30363d')+';border-radius:8px;padding:8px;opacity:'+(i<=tStep?1:0.4)+';transition:all .3s">'+
            '<div style="font-size:11px;font-weight:700;color:'+s.color+';margin-bottom:4px">'+s.title+'</div>'+
            '<div style="display:flex;flex-wrap:wrap;gap:3px;min-height:30px">'+
            s.records.map(function(r){return '<div class="lc-record-box '+r.cls+'" style="width:40px;height:40px;font-size:9px"><div>'+r.k+'</div><div>'+r.v+'</div><div style="font-size:8px;opacity:.7">@'+r.off+'</div></div>';}).join('')+
            (s.records.length===0?'<div style="color:#30363d;font-size:11px;padding:6px">key erased</div>':'')+'</div></div>';
        }).join('');
        mount.querySelector('#lc-tomb-info').innerHTML=TSTEPS[tStep].desc;
        mount.querySelector('#lc-tstep').textContent='Step '+(tStep+1)+'/'+TSTEPS.length;
      }
      function tStop(){clearInterval(tTimer);tTimer=null;mount.querySelector('#lc-tplay').textContent='▶ Play';}
      mount.querySelector('#lc-tplay').addEventListener('click',function(){if(tTimer){tStop();}else{tTimer=setInterval(function(){tStep=Math.min(tStep+1,TSTEPS.length-1);renderTomb();if(tStep===TSTEPS.length-1)tStop();},1700);mount.querySelector('#lc-tplay').textContent='⏸ Pause';}});
      mount.querySelector('#lc-tnext').addEventListener('click',function(){tStop();tStep=Math.min(tStep+1,TSTEPS.length-1);renderTomb();});
      mount.querySelector('#lc-tprev').addEventListener('click',function(){tStop();tStep=Math.max(tStep-1,0);renderTomb();});
      mount.querySelector('#lc-treset').addEventListener('click',function(){tStop();tStep=0;renderTomb();});
      renderTomb();

      // USE CASES
      var ucMode='ktable';
      var UC_DATA={
        ktable:{
          title:"KTable / Changelog Topic",color:"#3dd68c",
          desc:"Kafka Streams KTable persists state to a compacted changelog topic. On restart, stream rebuilds state by reading all latest values.",
          points:["cleanup.policy=compact","One record per key = current state","Restart reads entire topic → in-memory state rebuilt","Compaction keeps topic small = fast restart","Example: user preferences, inventory counts, session state"]
        },
        snapshot:{
          title:"Database Snapshot",color:"#58a6ff",
          desc:"Compacted topic acts as a database changelog. External systems can bootstrap from Kafka instead of a snapshot file.",
          points:["New service reads from offset 0 → gets full current state","No need for separate snapshot mechanism","Only keeps latest value per key","Kafka as source of truth for current state","Example: Debezium CDC → compacted topics for DB mirror"]
        },
        eventlog:{
          title:"Event Log vs Compacted Topic",color:"#e8741a",
          desc:"When to use event log (delete policy) vs compacted topic.",
          points:["Delete: retain ALL events for audit/replay (e.g., order history)","Compact: retain ONLY latest state (e.g., order status)","Delete: retention.ms determines how long events live","Compact: eternal — never expires unless tombstoned","Both: cleanup.policy=compact,delete — time-bounded latest state"]
        }
      };
      function renderUc(){
        var s=UC_DATA[ucMode];
        var el=mount.querySelector('#lc-uc-content');
        el.innerHTML='<div class="lc-box" style="border-color:'+s.color+'44"><div style="font-size:13px;font-weight:700;color:'+s.color+';margin-bottom:8px">'+s.title+'</div><div style="font-size:12px;color:#8b949e;margin-bottom:10px;line-height:1.5">'+s.desc+'</div>'+
          s.points.map(function(p){return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:5px;font-size:12px"><span style="color:'+s.color+'">✓</span><span>'+p+'</span></div>';}).join('')+'</div>';
      }
      mount.querySelectorAll('.lc-stab[data-uc]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.lc-stab[data-uc]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');ucMode=b.dataset.uc;renderUc();});
      });
      renderUc();

      // TABS
      mount.querySelectorAll('.lcbtn[data-tab]').forEach(function(btn){
        btn.addEventListener('click',function(){
          mount.querySelectorAll('.lcbtn[data-tab]').forEach(function(b){b.classList.remove('on');});
          mount.querySelectorAll('.lcp').forEach(function(p){p.classList.remove('on');});
          btn.classList.add('on');
          mount.querySelector('#lc-'+btn.dataset.tab).classList.add('on');
        });
      });
      mount.querySelectorAll('.lc-q-card').forEach(function(c){c.addEventListener('click',function(){c.classList.toggle('open');});});
    },
    concept: `**L1 (30s ELI5):** Log compaction = keep only the latest version of each key. Like a dictionary — old definitions overwritten by new ones. Delete a key by writing null (tombstone).

**L2 (2min core):** Background cleaner thread scans old segments, builds key→latest-offset map, removes older versions. Active segment (tail) never compacted. Tombstone (null value) marks deletion, retained for delete.retention.ms before final removal.

**L3 (10min edge cases):** min.cleanable.dirty.ratio controls when compaction triggers. Compacted topics have offset gaps. Consumers reading compacted topic see latest values but may see duplicates during compaction window. cleanup.policy=compact,delete combines time-based expiry with compaction.

**L4 (30min deep):** Cleaner uses log.cleaner.dedupe.buffer.size (128MB) in-memory hash for offset map. If buffer too small, multiple passes needed. log.cleaner.io.max.bytes.per.second throttles I/O. min.compaction.lag.ms prevents too-fresh data from compaction. Compaction is per-partition, parallel across partitions. Kafka Streams changelog topics: compaction + barrier offsets enable state store recovery without full topic scan.`,
    why: "Compaction enables Kafka as a state store, not just a stream. KTables, Debezium CDC sinks, and microservice event-sourcing all rely on compacted topics to maintain current state without unbounded log growth.",
    example: {
      language: "bash",
      code: `# Create compacted topic
kafka-topics.sh --create \\
  --topic user-profiles \\
  --partitions 6 \\
  --replication-factor 3 \\
  --config cleanup.policy=compact \\
  --config min.cleanable.dirty.ratio=0.1 \\
  --config segment.ms=3600000 \\
  --config delete.retention.ms=86400000

# Produce: key=user-1, value={"name":"Alice"}
echo '{"name":"Alice"}' | kafka-console-producer.sh \\
  --topic user-profiles \\
  --property parse.key=true \\
  --property key.separator=: \\
  --broker-list localhost:9092 \\
  <<< "user-1:{\"name\":\"Alice\"}"

# Tombstone: delete user-1
echo "user-1:" | kafka-console-producer.sh \\
  --topic user-profiles \\
  --property parse.key=true \\
  --property key.separator=: \\
  --property null.marker= \\
  --broker-list localhost:9092

# Java: write tombstone programmatically
producer.send(new ProducerRecord<>("user-profiles", "user-1", null));`
    },
    gotchas: [
      "Compaction is async — consumers may still see old values until background cleaner runs",
      "Active (tail) segment never compacted — must roll to new segment before it's eligible",
      "Tombstones only retained for delete.retention.ms — offline consumers that miss this window won't see the delete",
      "Offset gaps after compaction — don't assume consecutive offsets in compacted topics",
      "min.cleanable.dirty.ratio=0 means compact aggressively but causes constant I/O pressure",
      "cleanup.policy=compact prevents retention.ms-based deletion — data lives forever unless tombstoned",
      "KTable changelog compaction: essential for fast restarts — without it, full topic replay from offset 0"
    ],
    interview: [
      { q: "What does log compaction guarantee?", a: "For any key ever written: reading from offset 0 gives at least the latest value. Older versions removed. Acts as changelog: latest state preserved, history not. Does NOT guarantee real-time compaction — duplicates may exist until cleaner runs." },
      { q: "How do you delete a key from a compacted topic?", a: "Write tombstone: record with key and null value. Compaction removes prior values + tombstone is retained for delete.retention.ms (default 24h) so offline consumers can observe the delete. After that window, tombstone itself purged." },
      { q: "cleanup.policy=compact vs compact,delete?", a: "compact alone: records live forever, only latest per key. compact,delete: adds time-based expiry via retention.ms. Records older than retention.ms removed even if latest for their key. Good for time-bounded state (e.g., active sessions only)." },
      { q: "Why do Kafka Streams KTables use compacted changelogs?", a: "KTable = materialized latest state per key. On restart, Streams reads changelog topic from 0 to rebuild in-memory state. Without compaction: O(all writes) reads. With compaction: O(unique keys) reads → fast restart. Compacted changelog is the source of truth for KTable state stores." }
    ],
    tradeoffs: "Compaction trades storage space for operational complexity. Log gaps break naive offset-sequential iteration. Background cleaner uses I/O and memory (throttle with log.cleaner.io.max.bytes.per.second). Compacted + delete provides bounded storage with current-state guarantee."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
