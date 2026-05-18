(function() {
  var topic = {
    id: "kafka-topics-partitions",
    area: "kafka",
    title: "Kafka Topics, Partitions & Log Storage",
    tag: "Core",
    tags: ["kafka","topics","partitions","ordering","segment","index","log","storage"],

    visual: function(mount) {
      var TRICKS = [
        { wrong:"Adding more partitions to an existing topic is safe — same keys go to same partitions.", right:"Adding partitions remaps keys: murmur2(key) % OLD_N ≠ murmur2(key) % NEW_N. Keys route to DIFFERENT partitions. Ordering broken. Plan partition count upfront — default 6-12 for most topics." },
        { wrong:"More partitions always = better throughput.", right:"Each partition = file handle + leader replication. Too many partitions per broker: slow leader election, high RAM for index, file descriptor exhaustion. Balance: 10-100 partitions/broker recommended." },
        { wrong:"Null key with round-robin guarantees even distribution.", right:"Kafka 2.4+ sticky partition: null key fills one batch for one partition, then rotates. Batch boundary = partition switch. Short-lived producers may send all to one partition." },
        { wrong:"Kafka guarantees message ordering across partitions.", right:"Ordering ONLY within a single partition. Cross-partition ordering: none. For global ordering: single partition (throughput limited to 1 consumer). For per-entity ordering: key=entityId → all events for same entity go to same partition." }
      ];
      var QS = [
        { q:"How does Kafka decide which partition a message goes to?", a:"Key present: murmur2(key.bytes) % numPartitions → deterministic. Same key always same partition = ordering guarantee for that key. Null key (Kafka 2.4+): sticky partition — fills a batch for one partition, then rotates. Custom partitioner: implement Partitioner interface, override partition() method." },
        { q:"What is a Kafka log segment?", a:"Partition log = series of segments. Each segment: (1) .log file (actual records, append-only), (2) .index (sparse offset→byte-position mapping for O(log n) seek), (3) .timeindex (timestamp→offset). Active segment receives writes. Segment rolls when: segment.bytes (1GB default) OR segment.ms (7 days). Closed segments = read-only, eligible for compaction/deletion." },
        { q:"Why is increasing partition count risky for existing topics?", a:"Partition assignment = murmur2(key) % numPartitions. Changing numPartitions changes the modulo → same key routes to DIFFERENT partition. Consumers that assumed key X is in partition Y are now wrong. Breaks: per-partition ordering, downstream consumer logic, Kafka Streams KTables. Solution: plan partitions upfront (estimate 3-5x expected parallelism)." },
        { q:"What is the relationship between partition count and consumer group parallelism?", a:"Max parallelism = min(partition_count, consumer_count). 6 partitions: max 6 consumers in a group process in parallel. 7th consumer = idle (no partition to assign). To increase throughput → add partitions (carefully!) + add consumers. Kafka Streams parallelism also bounded by partition count." }
      ];

      mount.innerHTML = "<style>" +
        ".tp{font-family:\"JetBrains Mono\",monospace;color:#cdd9e5;padding:12px;font-size:12px}" +
        ".tptabs{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}" +
        ".tpbtn{background:#21262d;border:1px solid #30363d;color:#768390;padding:5px 11px;border-radius:6px;cursor:pointer;font-size:11px}" +
        ".tpbtn:hover{border-color:#e8741a}.tpbtn.on{background:#e8741a;border-color:#e8741a;color:#fff;font-weight:700}" +
        ".tpp{display:none}.tpp.on{display:block}" +
        ".tpinfo{background:rgba(232,116,26,.08);border-left:3px solid #e8741a;border-radius:0 6px 6px 0;padding:8px 12px;font-size:11.5px;color:#cdd9e5;margin:8px 0;min-height:36px;line-height:1.6}" +
        ".tpbox{border-radius:6px;padding:6px 10px;font-size:10.5px;text-align:center;margin:2px 0}" +
        ".tparr{text-align:center;font-size:10px;color:#30363d;line-height:1}" +
        ".tprow{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}" +
        ".tpwrong{background:#3d1f1f;border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10.5px}" +
        ".tpright{background:#1f3d2d;border:1px solid #57ab5a;border-radius:6px;padding:8px;font-size:10.5px}" +
        ".tpflash{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer}" +
        ".tpflash:hover{border-color:#e8741a}" +
        ".seg{border-radius:4px;padding:4px 8px;font-size:10px;text-align:center;margin:2px}" +
        "</style>" +
        "<div class=\"tp\">" +
        "<div style=\"font-size:10px;color:#768390;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px\">☁ Kafka — Topics, Partitions & Log Storage</div>" +
        "<div class=\"tptabs\">" +
        "<button class=\"tpbtn on\" data-tab=\"part\">Partition Assignment</button>" +
        "<button class=\"tpbtn\" data-tab=\"log\">Log Structure</button>" +
        "<button class=\"tpbtn\" data-tab=\"ord\">Ordering Guarantees</button>" +
        "<button class=\"tpbtn\" data-tab=\"tricks\">⚠️ Tricks + Interview</button>" +
        "</div>" +

        // PARTITION ASSIGNMENT TAB
        "<div class=\"tpp on\" id=\"tp-part\">" +
        "<div style=\"display:grid;grid-template-columns:1fr 220px;gap:10px\">" +
        "<div>" +
        "<div style=\"display:flex;gap:6px;margin-bottom:8px\">" +
        "<button class=\"tpbtn tpkb\" data-key=\"withkey\" style=\"border-color:#58a6ff;color:#58a6ff\">Key Present</button>" +
        "<button class=\"tpbtn tpkb\" data-key=\"nokey\">Null Key</button>" +
        "<button class=\"tpbtn tpkb\" data-key=\"custom\">Custom</button>" +
        "</div>" +
        "<div id=\"tp-part-vis\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"tpinfo\" id=\"tp-part-info\"></div>" +
        "</div>" +
        "<div style=\"background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;font-size:10px\">" +
        "<div style=\"color:#e8741a;font-weight:700;margin-bottom:8px\">Partition = Unit of</div>" +
        "<div style=\"margin-bottom:6px\">📦 <strong style=\"color:#cdd9e5\">Parallelism</strong><br><span style=\"color:#768390\">Max consumers = partition count</span></div>" +
        "<div style=\"margin-bottom:6px\">📋 <strong style=\"color:#cdd9e5\">Ordering</strong><br><span style=\"color:#768390\">Ordered within partition only</span></div>" +
        "<div style=\"margin-bottom:6px\">🔄 <strong style=\"color:#cdd9e5\">Replication</strong><br><span style=\"color:#768390\">Each partition: 1 leader + N-1 followers</span></div>" +
        "<div>📂 <strong style=\"color:#cdd9e5\">Storage</strong><br><span style=\"color:#768390\">Directory on disk: topic-partitionN/</span></div>" +
        "</div></div></div>" +

        // LOG STRUCTURE TAB
        "<div class=\"tpp\" id=\"tp-log\">" +
        "<div id=\"tp-log-vis\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"tpinfo\" id=\"tp-log-info\">Click Play to explore Kafka log segment internals.</div>" +
        "<div style=\"display:flex;gap:5px;margin-top:6px\">" +
        "<button class=\"tpbtn\" id=\"tp-lp\">◀</button><button class=\"tpbtn\" id=\"tp-lplay\">▶ Play</button><button class=\"tpbtn\" id=\"tp-ln\">▶|</button><button class=\"tpbtn\" id=\"tp-lr\">↺</button>" +
        "<span id=\"tp-ls\" style=\"font-size:10px;color:#768390;margin-left:4px\"></span>" +
        "</div></div>" +

        // ORDERING TAB
        "<div class=\"tpp\" id=\"tp-ord\">" +
        "<div id=\"tp-ord-vis\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"tpinfo\" id=\"tp-ord-info\">Select a scenario to see ordering behavior.</div>" +
        "<div style=\"display:flex;gap:5px;margin-bottom:8px\">" +
        "<button class=\"tpbtn tpordb\" data-ord=\"keyed\">Key-based (ordered)</button>" +
        "<button class=\"tpbtn tpordb\" data-ord=\"null\">Null key (no order)</button>" +
        "<button class=\"tpbtn tpordb\" data-ord=\"global\">Global order (1 partition)</button>" +
        "</div></div>" +

        // TRICKS TAB
        "<div class=\"tpp\" id=\"tp-tricks\">" +
        "<div style=\"font-size:10px;color:#768390;margin-bottom:8px\">⚠️ Wrong → ✓ Correct</div>" +
        TRICKS.map(function(t){ return "<div class=\"tprow\"><div class=\"tpwrong\"><div style=\"color:#f47067;font-weight:700;margin-bottom:3px\">⚠️</div>"+t.wrong+"</div><div class=\"tpright\"><div style=\"color:#57ab5a;font-weight:700;margin-bottom:3px\">✓</div>"+t.right+"</div></div>"; }).join("") +
        "<div style=\"font-size:10px;color:#768390;margin:10px 0 6px\">💬 Flash Cards</div>" +
        QS.map(function(q){ return "<div class=\"tpflash\" onclick=\"var a=this.querySelector('.tpa');a.style.display=a.style.display==='none'?'block':'none'\"><div style=\"font-size:11px;color:#cdd9e5;font-weight:700\">Q: "+q.q+"</div><div class=\"tpa\" style=\"display:none;font-size:10.5px;color:#9aaabb;margin-top:6px;border-top:1px solid #30363d;padding-top:6px\">"+q.a+"</div></div>"; }).join("") +
        "</div></div>";

      // Tab switching
      mount.querySelectorAll(".tpbtn[data-tab]").forEach(function(tab){
        tab.addEventListener("click", function(){
          mount.querySelectorAll(".tpbtn[data-tab]").forEach(function(t){ t.classList.remove("on"); });
          mount.querySelectorAll(".tpp").forEach(function(p){ p.classList.remove("on"); });
          tab.classList.add("on");
          mount.querySelector("#tp-" + tab.dataset.tab).classList.add("on");
        });
      });

      // Partition assignment
      var partData = {
        withkey: {
          vis: "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px\">" +
            "<div style=\"background:rgba(88,166,255,.1);border:1px solid #58a6ff;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#58a6ff;font-weight:700\">Producer</div><div>key=\"order-123\"</div></div>" +
            "<div style=\"background:rgba(232,116,26,.1);border:1px solid #e8741a;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700\">Partitioner</div><div>murmur2(\"order-123\") % 6 = 2</div></div>" +
            "<div style=\"background:rgba(61,214,140,.1);border:1px solid #3dd68c;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#3dd68c;font-weight:700\">→ Partition 2</div><div>ALWAYS for \"order-123\"</div></div>" +
            "</div>" +
            "<div style=\"display:grid;grid-template-columns:repeat(6,1fr);gap:4px\">" +
            "<div class=\"seg\" style=\"background:#21262d;border:1px solid #30363d;color:#768390\">P0</div>" +
            "<div class=\"seg\" style=\"background:#21262d;border:1px solid #30363d;color:#768390\">P1</div>" +
            "<div class=\"seg\" style=\"background:rgba(61,214,140,.12);border:1px solid #3dd68c;color:#3dd68c\">P2 ←</div>" +
            "<div class=\"seg\" style=\"background:#21262d;border:1px solid #30363d;color:#768390\">P3</div>" +
            "<div class=\"seg\" style=\"background:#21262d;border:1px solid #30363d;color:#768390\">P4</div>" +
            "<div class=\"seg\" style=\"background:#21262d;border:1px solid #30363d;color:#768390\">P5</div>" +
            "</div>",
          info: "Key present: murmur2(key.bytes) % numPartitions = deterministic partition. \"order-123\" ALWAYS goes to P2. All events for same order ID ordered within P2. Ordering guarantee per key."
        },
        nokey: {
          vis: "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px\">" +
            "<div style=\"background:rgba(88,166,255,.1);border:1px solid #58a6ff;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#58a6ff;font-weight:700\">Producer</div><div>key=null</div></div>" +
            "<div style=\"background:rgba(232,116,26,.1);border:1px solid #e8741a;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700\">Sticky Partition</div><div>Fill batch for P0, then rotate</div></div>" +
            "<div style=\"background:rgba(245,185,68,.1);border:1px solid #f5b944;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#f5b944;font-weight:700\">⚠️ No ordering</div><div>Records spread across partitions</div></div>" +
            "</div>" +
            "<div style=\"display:grid;grid-template-columns:repeat(6,1fr);gap:4px\">" +
            ["P0 (batch 1)","P1 (batch 2)","P2 (batch 3)","P3","P4","P5"].map(function(l,i){ return "<div class=\"seg\" style=\"background:rgba(232,116,26,."+Math.max(5,12-i*2)+"0);border:1px solid #e8741a"+(i>2?"40":"")+ ";color:"+(i>2?"#768390":"#e8741a")+"\">"+l+"</div>"; }).join("") +
            "</div>",
          info: "Null key: Kafka 2.4+ sticky partition — fills a full batch for one partition, then rotates. Not pure round-robin. Records in different batches may be on different partitions. NO ordering guarantee."
        },
        custom: {
          vis: "<div style=\"background:#161b22;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:10px;margin-bottom:8px\">" +
            "<div style=\"color:#e8741a;font-weight:700;margin-bottom:6px\">Custom Partitioner: RegionPartitioner</div>" +
            "<pre style=\"margin:0;color:#cdd9e5\">public int partition(String topic, Object key, ...) {\n  String region = extractRegion((String) key);\n  return switch(region) {\n    case \"US\" -> 0;\n    case \"EU\" -> 1; \n    case \"APAC\" -> 2;\n    default -> hash(key) % numPartitions;\n  };\n}</pre>" +
            "</div>" +
            "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:4px\">" +
            "<div class=\"seg\" style=\"background:rgba(88,166,255,.12);border:1px solid #58a6ff;color:#58a6ff\">P0 — US region</div>" +
            "<div class=\"seg\" style=\"background:rgba(61,214,140,.12);border:1px solid #3dd68c;color:#3dd68c\">P1 — EU region</div>" +
            "<div class=\"seg\" style=\"background:rgba(232,116,26,.12);border:1px solid #e8741a;color:#e8741a\">P2 — APAC region</div>" +
            "</div>",
          info: "Custom partitioner: implement Partitioner interface. Route US traffic to P0 (near US consumers), EU to P1, etc. Common for: geographic routing, priority tiers, hot key avoidance."
        }
      };
      function renderPart(key){ mount.querySelector("#tp-part-vis").innerHTML=partData[key].vis; mount.querySelector("#tp-part-info").textContent=partData[key].info; }
      mount.querySelectorAll(".tpkb").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".tpkb").forEach(function(b){b.style.borderColor="";b.style.color="";});
          btn.style.borderColor="#e8741a";btn.style.color="#e8741a";
          renderPart(btn.dataset.key);
        });
      });
      renderPart("withkey");

      // Log structure steps
      var LS = [
        { info:"Kafka partition = directory on broker disk. Example: /data/kafka/orders-2/. Contains: .log files (actual data), .index files (offset index), .timeindex files (timestamp index)." },
        { info:"Active segment = current .log file receiving writes. Append-only — immutable once written. Records stored: offset(8) + timestamp(8) + key-length(4) + key + value-length(4) + value + headers." },
        { info:".index file: sparse index — NOT every offset, just every ~4KB. Entry: (relative offset, byte position). Consumer seeking to offset 10042: binary search .index → find nearest entry → scan .log from that position." },
        { info:".timeindex file: timestamp→offset mapping. Consumer.offsetsForTimes() or --from-offset uses this. Enables time-based consumer reset: \"start from 2h ago\" without scanning entire log." },
        { info:"Segment rolls when: segment.bytes (1GB default) OR segment.ms (7 days default). Old segment becomes immutable → eligible for: (1) time/size retention deletion, (2) log compaction. Active segment never deleted." },
        { info:"High Watermark (HW): highest committed offset (replicated to all ISR). Consumers only see records up to HW. Log End Offset (LEO): latest written offset (may not be replicated yet). HW ≤ LEO always." }
      ];
      var lStep=0,lTimer=null;
      function renderLog(){
        var files=["00000000000010000.log","00000000000010000.index","00000000000010000.timeindex","00000000000020000.log","00000000000020000.index","ACTIVE: 00000000000025000.log"];
        var colors=["#58a6ff","#f5b944","#b07fff","#58a6ff","#f5b944","#3dd68c"];
        var active=lStep;
        mount.querySelector("#tp-log-vis").innerHTML=
          "<div style=\"background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;font-size:10px;margin-bottom:8px\">" +
          "<div style=\"color:#e8741a;font-weight:700;margin-bottom:6px\">📂 /data/kafka/orders-2/</div>" +
          files.map(function(f,i){ return "<div style=\"padding:4px 8px;border-radius:4px;margin-bottom:3px;background:"+(i===active?"rgba(232,116,26,.12)":"rgba(255,255,255,.02)")+";border:1px solid "+(i===active?colors[i]:"#30363d")+";color:"+(i===active?colors[i]:"#768390")+"\">"+f+(i===active?" ← ":"")+" </div>"; }).join("") +
          "</div>";
        mount.querySelector("#tp-log-info").textContent=LS[lStep].info;
        mount.querySelector("#tp-ls").textContent="Step "+(lStep+1)+"/"+LS.length;
      }
      function lStop(){ if(lTimer){clearInterval(lTimer);lTimer=null;} mount.querySelector("#tp-lplay").textContent="▶ Play"; }
      mount.querySelector("#tp-lp").onclick=function(){lStop();if(lStep>0){lStep--;renderLog();}};
      mount.querySelector("#tp-ln").onclick=function(){lStop();if(lStep<LS.length-1){lStep++;renderLog();}};
      mount.querySelector("#tp-lplay").onclick=function(){if(lTimer){lStop();}else{mount.querySelector("#tp-lplay").textContent="⏸";lTimer=setInterval(function(){if(lStep<LS.length-1){lStep++;renderLog();}else{lStop();}},2000);}};
      mount.querySelector("#tp-lr").onclick=function(){lStop();lStep=0;renderLog();};
      renderLog();

      // Ordering scenarios
      var ordData={
        keyed:{
          vis:"<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:6px\">"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P0 — customer-A</div><div style=\"color:#3dd68c\">order-1 offset:0</div><div style=\"color:#3dd68c\">order-2 offset:1</div><div style=\"color:#3dd68c\">order-3 offset:2</div></div>"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P1 — customer-B</div><div style=\"color:#3dd68c\">order-4 offset:0</div><div style=\"color:#3dd68c\">order-5 offset:1</div></div>"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P2 — customer-C</div><div style=\"color:#3dd68c\">order-6 offset:0</div></div>"+
            "</div>",
          info:"Key = customerId. All events for customer-A always in P0 (ordering ✓ per customer). Consumer for P0 sees A's orders in exact sequence. Consumer for P1 sees B's orders. No guarantee about A vs B ordering (different partitions)."
        },
        null:{
          vis:"<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:6px\">"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P0</div><div style=\"color:#f47067\">event-1</div><div style=\"color:#f47067\">event-5</div></div>"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P1</div><div style=\"color:#f47067\">event-2</div><div style=\"color:#f47067\">event-4</div></div>"+
            "<div style=\"background:#1b2238;border:1px solid #30363d;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#e8741a;font-weight:700;margin-bottom:4px\">P2</div><div style=\"color:#f47067\">event-3</div><div style=\"color:#f47067\">event-6</div></div>"+
            "</div>"+
            "<div style=\"background:rgba(244,112,103,.08);border:1px solid rgba(244,112,103,.3);border-radius:5px;padding:6px;margin-top:6px;font-size:10px;color:#f47067\">⚠️ Events 1-6 sent in order but arrive in different partitions. Consumer sees events out of order.</div>",
          info:"Null key → sticky partition routing. Events distributed across partitions. Consumer sees events in partition order, NOT send order. No global ordering. Use for: high-throughput scenarios where ordering doesn't matter (metrics, logs)."
        },
        global:{
          vis:"<div style=\"display:grid;gap:6px\">"+
            "<div style=\"background:rgba(61,214,140,.08);border:1px solid #3dd68c;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#3dd68c;font-weight:700;margin-bottom:4px\">P0 — SINGLE PARTITION (global order)</div><div style=\"color:#cdd9e5\">event-1, event-2, event-3, event-4, event-5, event-6 ← all in order ✓</div></div>"+
            "<div style=\"background:rgba(244,112,103,.08);border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10px\"><div style=\"color:#f47067;font-weight:700;margin-bottom:4px\">⚠️ Throughput Bottleneck</div><div style=\"color:#cdd9e5\">Max 1 consumer in group (1 partition). Max throughput = 1 consumer's write speed. Not scalable.</div></div>"+
            "</div>",
          info:"Single partition = global ordering. Every consumer in group reads the same ordered stream. Tradeoff: max parallelism = 1 consumer. Bottleneck under high load. Only use when strict global order is required (rare)."
        }
      };
      function renderOrd(key){ mount.querySelector("#tp-ord-vis").innerHTML=ordData[key].vis; mount.querySelector("#tp-ord-info").textContent=ordData[key].info; }
      mount.querySelectorAll(".tpordb").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".tpordb").forEach(function(b){b.style.borderColor="";b.style.color="";});
          btn.style.borderColor="#e8741a";btn.style.color="#e8741a";
          renderOrd(btn.dataset.ord);
        });
      });
    },

    concept:
`**L1 (30s ELI5):** Topic = named channel. Partition = ordered lane within channel. Key determines lane. Same key = same lane = ordering. More lanes = more readers in parallel.

**L2 (2min core):** Topic splits into N partitions distributed across brokers. Each partition = append-only log of segments (.log + .index + .timeindex). Partitioner assigns: murmur2(key) % N (key present) or sticky-round-robin (null key). Consumer group: each partition assigned to exactly one consumer. Max parallelism = partition count.

**L3 (10min edge cases):** Adding partitions remaps key→partition (breaks ordering). Too many partitions: slow failover, high file handles. Null key (Kafka 2.4+): sticky partition, not pure round-robin. HWM vs LEO: consumers only read up to HWM. Segment roll: 1GB or 7 days → old segment eligible for deletion/compaction.

**L4 (30min deep):** .index: sparse (every ~4KB), stores (relativeOffset, filePosition) pairs. Seek algorithm: binary search .index → find lower bound → scan .log from that byte. .timeindex: (timestamp, relativeOffset) pairs. HWM tracked per leader; advanced when all ISR members fetch up to that offset. ReplicaFetcherThread: pull model (follower fetches from leader), not push. LogSegment loaded into page cache — OS handles caching, Kafka avoids heap allocation for reads.`,

    why: "Partition design determines throughput ceiling, ordering guarantees, and consumer parallelism. Wrong partition count or key strategy causes: out-of-order events, hot partitions, inability to scale consumers.",

    example: {
      language: "bash",
      code:
`# Create topic: 12 partitions, RF=3, 7-day retention
kafka-topics.sh --create --topic orders \\
  --bootstrap-server broker1:9092 \\
  --partitions 12 \\
  --replication-factor 3 \\
  --config retention.ms=604800000 \\
  --config segment.bytes=1073741824 \\
  --config min.insync.replicas=2

# Describe topic (shows partition leaders, ISR)
kafka-topics.sh --describe --topic orders
# Topic: orders  Partition: 0  Leader: 1  Replicas: 1,2,3  Isr: 1,2,3
# Topic: orders  Partition: 1  Leader: 2  Replicas: 2,3,1  Isr: 2,3,1

# Check consumer group lag per partition
kafka-consumer-groups.sh --describe --group order-processor-v2 \\
  --bootstrap-server broker1:9092
# GROUP               TOPIC  PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
# order-processor-v2  orders 0          10432           10432           0
# order-processor-v2  orders 1          9821            10000           179

# Custom partitioner in Java
public class RegionPartitioner implements Partitioner {
    public int partition(String topic, Object key, byte[] keyBytes,
                        Object value, byte[] valueBytes, Cluster cluster) {
        int n = cluster.partitionCountForTopic(topic);
        String region = ((String)key).split(":")[0];  // "US:order-123" → "US"
        return switch(region) {
            case "US"   -> 0 % n;
            case "EU"   -> 1 % n;
            case "APAC" -> 2 % n;
            default     -> (Utils.murmur2(keyBytes) & Integer.MAX_VALUE) % n;
        };
    }
    public void close() {}
    public void configure(Map<String,?> configs) {}
}`
    },

    gotchas: [
      "Adding partitions to existing topic remaps keys: murmur2(key) % OLD_N ≠ % NEW_N. Keys route to different partitions. Breaks ordering. Plan upfront.",
      "Max consumer group parallelism = partition count. 7th consumer on 6-partition topic = idle. No benefit.",
      "Too many partitions per broker: slow leader election on failure, high file descriptor usage, RAM for index. Target 10-100 partitions/broker.",
      "Null key (Kafka 2.4+): sticky partition, NOT pure round-robin. Short-lived producers may send entire batch to one partition.",
      "Consumer can only see records up to High Watermark (HWM). Records between HWM and LEO are uncommitted — not yet delivered to consumers.",
      "Segment roll: new segment = new file handles. segment.ms too low = too many small files, slow compaction. Default 7 days is safe."
    ],

    interview: [
      { q:"How does Kafka achieve per-key ordering?", a:"Key present: partitioner computes murmur2(key.bytes) % numPartitions = deterministic partition. Same key always same partition. Within a partition, records are ordered by append sequence. Consumer reads partition sequentially. Multiple keys in same partition share the partition's sequential order but different keys' relative order is undefined." },
      { q:"What is the difference between High Watermark and Log End Offset?", a:"LEO: index of next record to be written (latest offset + 1). HWM: highest offset that has been replicated to ALL ISR members. Consumers can only fetch records up to HWM — records between HWM and LEO are in-flight (not yet replicated). After all ISR members fetch up to LEO, HWM advances to LEO." },
      { q:"A topic has 6 partitions and a consumer group has 8 consumers. What happens?", a:"Kafka assigns each partition to exactly one consumer in the group. 6 partitions → 6 active consumers. 2 consumers get no partition assigned → they're idle. Adding consumers beyond partition count provides no throughput benefit. To use all 8: increase partition count to 8 (carefully — check ordering implications)." },
      { q:"How does Kafka's .index file enable fast offset seeks?", a:"Sparse index: one entry per ~4KB of .log data. Entry: (relativeOffset, byte-position). To seek to offset O: binary search .index for largest relativeOffset ≤ O → get byte position → open .log at that position → linear scan until O found. O(log n) over index entries + O(small constant) scan. Without index: O(n) full scan of entire .log file." }
    ],

    tradeoffs: "More partitions: higher throughput ceiling, more parallelism. Cost: slower failover, more file handles, more RAM. Fewer partitions: simpler management, faster failover. Cost: lower max throughput. Key-based partitioning: ordering guarantee. Cost: hot partitions if keys skewed. Null key: even distribution. Cost: no ordering."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
