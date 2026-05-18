(function() {
  var topic = {
    id: "kafka-producer-consumer",
    area: "kafka",
    title: "Kafka Producer & Consumer — Full End-to-End Flow",
    tag: "Core",
    tags: ["kafka","producer","consumer","batching","acks","poll","serializer","partitioner","linger.ms"],

    visual: function(mount) {
      var TRICKS = [
        { wrong:"producer.send() is synchronous — exception thrown immediately on failure.", right:"send() is ASYNC. Returns Future<RecordMetadata>. Without callback: exceptions silently swallowed. ALWAYS: producer.send(rec, (meta,ex) -> { if(ex!=null) handle(ex); })." },
        { wrong:"enable.auto.commit=true (default) is safe — commits after processing.", right:"Auto-commit fires on poll() timer interval regardless of processing status. Crash mid-batch = committed offset, unprocessed records = DATA LOST. Set false, call commitSync() after processing." },
        { wrong:"acks=1 means leader confirmed — message is safe.", right:"Leader acks then dies before replication → follower elected → record missing → DATA LOST. Use acks=all + min.insync.replicas=2 for durability." },
        { wrong:"Large batch.size=10MB always speeds up throughput.", right:"Large batch requires linger.ms time to fill → increased latency. Also memory pressure. Tune: batch.size=64KB + linger.ms=5-10ms for balanced latency/throughput." }
      ];
      var QS = [
        { q:"Walk through what happens inside producer.send().", a:"1) serialize(key,value)→byte[]. 2) partitioner picks partition. 3) RecordAccumulator.append() queues in ProducerBatch per (topic,partition). 4) Sender thread fires when batch.size full OR linger.ms elapsed. 5) PRODUCE request to leader via NetworkClient (NIO). 6) Leader appends to .log, ISR replicates. 7) Callback fires with RecordMetadata(offset, partition) or exception." },
        { q:"Exactly-once semantics — how does Kafka achieve it?", a:"Three components: (1) Idempotent producer: enable.idempotence=true gives each producer a PID + per-partition sequence number. Broker deduplicates retries. (2) Transactional: transactional.id + beginTransaction() + sendOffsetsToTransaction() + commitTransaction() — atomic multi-partition write. (3) Consumer: isolation.level=read_committed — skips in-flight/aborted transaction records." },
        { q:"Why is consumer.poll() critical beyond just fetching records?", a:"poll() drives the entire consumer engine: (1) sends heartbeat to GroupCoordinator, (2) handles rebalance protocol (calls onPartitionsRevoked/Assigned), (3) fetches records. Skip poll() for >max.poll.interval.ms → GroupCoordinator considers consumer dead → kicks from group → rebalance. Infinite rebalance loop if processing is too slow." },
        { q:"What happens when producer buffer.memory is full?", a:"Producer blocks for max.block.ms (default 60s) waiting for RecordAccumulator space. If buffer still full after timeout → TimeoutException. Causes: slow broker (backpressure), network issues, too many partitions. Fix: tune buffer.memory up, reduce batch.size, fix broker bottleneck, add producer instances." }
      ];

      mount.innerHTML = "<style>" +
        ".kw{font-family:\"JetBrains Mono\",monospace;color:#cdd9e5;padding:12px;font-size:12px}" +
        ".kt{display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap}" +
        ".kb{background:#21262d;border:1px solid #30363d;color:#768390;padding:5px 11px;border-radius:6px;cursor:pointer;font-size:11px;transition:all .15s}" +
        ".kb:hover{border-color:#e8741a;color:#cdd9e5}" +
        ".kb.on{background:#e8741a;border-color:#e8741a;color:#fff;font-weight:700}" +
        ".kp{display:none}.kp.on{display:block}" +
        ".kinfo{background:rgba(232,116,26,.08);border-left:3px solid #e8741a;border-radius:0 6px 6px 0;padding:8px 12px;font-size:11.5px;color:#cdd9e5;margin:8px 0;min-height:36px;line-height:1.6}" +
        ".knode{border-radius:6px;padding:6px 10px;font-size:10.5px;text-align:center;transition:all .3s;margin:2px 0}" +
        ".karr{text-align:center;font-size:10px;color:#30363d;line-height:1}" +
        ".kwrong{background:#3d1f1f;border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10.5px;margin-bottom:4px}" +
        ".kright{background:#1f3d2d;border:1px solid #57ab5a;border-radius:6px;padding:8px;font-size:10.5px;margin-bottom:4px}" +
        ".kflash{background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer}" +
        ".kflash:hover{border-color:#e8741a}" +
        ".krow{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px}" +
        "</style>" +
        "<div class=\"kw\">" +
        "<div style=\"font-size:10px;color:#768390;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px\">☁ Kafka — Producer & Consumer Pipeline</div>" +
        "<div class=\"kt\">" +
        "<button class=\"kb on\" data-tab=\"prod\">Producer Pipeline</button>" +
        "<button class=\"kb\" data-tab=\"cons\">Consumer Poll Loop</button>" +
        "<button class=\"kb\" data-tab=\"acks\">Acks & Durability</button>" +
        "<button class=\"kb\" data-tab=\"tricks\">⚠️ Tricks + Interview</button>" +
        "</div>" +

        // PRODUCER TAB
        "<div class=\"kp on\" id=\"kp-prod\">" +
        "<div style=\"display:grid;grid-template-columns:1fr 240px;gap:10px\">" +
        "<div><div id=\"kprod-pipe\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"kinfo\" id=\"kprod-info\">Click Play to walk through producer pipeline.</div>" +
        "<div style=\"display:flex;gap:5px;margin-top:6px;align-items:center\">" +
        "<button class=\"kb\" id=\"kp-pp\">◀</button><button class=\"kb\" id=\"kp-play\">▶ Play</button><button class=\"kb\" id=\"kp-pn\">▶|</button><button class=\"kb\" id=\"kp-pr\">↺</button>" +
        "<span id=\"kp-ps\" style=\"font-size:10px;color:#768390;margin-left:4px\"></span></div></div>" +
        "<div style=\"background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;font-size:10px\">" +
        "<div style=\"color:#e8741a;font-weight:700;margin-bottom:8px\">Key Configs</div>" +
        "<div style=\"color:#768390\">acks</div><div style=\"margin-bottom:6px\"><code style=\"color:#79c0ff\">0</code> fire-forget &nbsp;<code style=\"color:#f5b944\">1</code> leader &nbsp;<code style=\"color:#3dd68c\">all</code> ISR</div>" +
        "<div style=\"color:#768390\">batch.size</div><div style=\"margin-bottom:6px;color:#cdd9e5\">16384 bytes (16KB default)</div>" +
        "<div style=\"color:#768390\">linger.ms</div><div style=\"margin-bottom:6px;color:#cdd9e5\">0 default. Set 5ms for batching.</div>" +
        "<div style=\"color:#768390\">compression</div><div style=\"margin-bottom:6px;color:#cdd9e5\">snappy/lz4/zstd — 3-5x smaller</div>" +
        "<div style=\"color:#768390\">buffer.memory</div><div style=\"color:#cdd9e5\">32MB — backpressure pool</div>" +
        "</div></div></div>" +

        // CONSUMER TAB
        "<div class=\"kp\" id=\"kp-cons\">" +
        "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:10px\">" +
        "<div><div id=\"kcons-loop\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"kinfo\" id=\"kcons-info\">poll() drives heartbeat + rebalance + data fetch.</div>" +
        "<div style=\"display:flex;gap:5px;margin-top:6px\">" +
        "<button class=\"kb\" id=\"kc-pp\">◀</button><button class=\"kb\" id=\"kc-play\">▶ Play</button><button class=\"kb\" id=\"kc-pn\">▶|</button><button class=\"kb\" id=\"kc-pr\">↺</button>" +
        "<span id=\"kc-ps\" style=\"font-size:10px;color:#768390\"></span></div></div>" +
        "<div style=\"display:grid;gap:6px\">" +
        "<div style=\"background:rgba(244,112,103,.08);border:1px solid rgba(244,112,103,.3);border-radius:6px;padding:8px;font-size:10px\">" +
        "<div style=\"color:#f47067;font-weight:700\">At-most-once ✗</div>" +
        "<div style=\"color:#cdd9e5;margin-top:3px\">auto.commit=true. Commits before processing done. Crash = lost records.</div></div>" +
        "<div style=\"background:rgba(245,185,68,.06);border:1px solid rgba(245,185,68,.3);border-radius:6px;padding:8px;font-size:10px\">" +
        "<div style=\"color:#f5b944;font-weight:700\">At-least-once ✓ (default target)</div>" +
        "<div style=\"color:#cdd9e5;margin-top:3px\">commitSync() AFTER processing. Crash = replay. Idempotent consumers needed.</div></div>" +
        "<div style=\"background:rgba(61,214,140,.06);border:1px solid rgba(61,214,140,.3);border-radius:6px;padding:8px;font-size:10px\">" +
        "<div style=\"color:#3dd68c;font-weight:700\">Exactly-once</div>" +
        "<div style=\"color:#cdd9e5;margin-top:3px\">Transactional producer + read_committed consumer + sendOffsetsToTransaction().</div></div>" +
        "</div></div></div>" +

        // ACKS TAB
        "<div class=\"kp\" id=\"kp-acks\">" +
        "<div style=\"display:flex;gap:6px;margin-bottom:10px\">" +
        "<button class=\"kb kack\" data-ack=\"0\" style=\"border-color:#f47067;color:#f47067\">acks=0 fire-forget</button>" +
        "<button class=\"kb kack\" data-ack=\"1\">acks=1 leader</button>" +
        "<button class=\"kb kack\" data-ack=\"all\">acks=all ISR</button>" +
        "</div>" +
        "<div id=\"kack-vis\" style=\"margin-bottom:8px\"></div>" +
        "<div class=\"kinfo\" id=\"kack-info\"></div>" +
        "</div>" +

        // TRICKS TAB
        "<div class=\"kp\" id=\"kp-tricks\">" +
        "<div style=\"font-size:10px;color:#768390;margin-bottom:8px\">⚠️ Wrong assumption → ✓ Real behavior</div>" +
        TRICKS.map(function(t){ return "<div class=\"krow\"><div class=\"kwrong\"><div style=\"color:#f47067;font-weight:700;margin-bottom:3px\">⚠️ WRONG</div>" + t.wrong + "</div><div class=\"kright\"><div style=\"color:#57ab5a;font-weight:700;margin-bottom:3px\">✓ CORRECT</div>" + t.right + "</div></div>"; }).join("") +
        "<div style=\"font-size:10px;color:#768390;margin:10px 0 6px\">💬 Flash Cards — click to reveal</div>" +
        QS.map(function(q){ return "<div class=\"kflash\" onclick=\"var a=this.querySelector('.ka');a.style.display=a.style.display==='none'?'block':'none'\"><div style=\"font-size:11px;color:#cdd9e5;font-weight:700\">Q: " + q.q + "</div><div class=\"ka\" style=\"display:none;font-size:10.5px;color:#9aaabb;margin-top:6px;border-top:1px solid #30363d;padding-top:6px\">" + q.a + "</div></div>"; }).join("") +
        "</div></div>";

      // Tab switching
      mount.querySelectorAll(".kb[data-tab]").forEach(function(tab){
        tab.addEventListener("click", function(){
          mount.querySelectorAll(".kb[data-tab]").forEach(function(t){ t.classList.remove("on"); });
          mount.querySelectorAll(".kp").forEach(function(p){ p.classList.remove("on"); });
          tab.classList.add("on");
          mount.querySelector("#kp-" + tab.dataset.tab).classList.add("on");
        });
      });

      // Producer steps
      var PS = [
        { active:0, info:"App calls producer.send(new ProducerRecord(\"orders\", key, value), callback). NON-BLOCKING — returns Future<RecordMetadata>. Callback fires async on success/failure." },
        { active:1, info:"StringSerializer / AvroSerializer converts key+value to byte[]. Key bytes used by partitioner. Failed serialization → immediate SerializationException (non-retriable)." },
        { active:2, info:"Partitioner: murmur2(key) % numPartitions. Same key ALWAYS same partition = ordering guarantee per key. Null key → sticky partition (fills one batch, then rotates). Custom partitioner for region-based routing." },
        { active:3, info:"RecordAccumulator batches records per (topic, partition). Uses BufferPool (avoids GC). Fires when: batch.size (16KB default) full OR linger.ms (5ms) elapsed. Fewer network round trips = higher throughput." },
        { active:4, info:"Background Sender thread fires compressed batch to leader. max.in.flight.requests=5 (5 concurrent in-flight per connection). With idempotence=true: auto-set to 1 per partition for strict ordering." },
        { active:5, info:"Leader broker receives ProduceRequest. Appends to .log segment file. Assigns monotonically increasing offset. Updates .index (offset→byte position) for O(log n) seeks." },
        { active:6, info:"Followers send FETCH requests. Leader streams uncommitted records. Follower acks when caught up. With acks=all: leader waits for ALL ISR members before committing. High watermark advances." },
        { active:7, info:"Callback fires with RecordMetadata(partition=2, offset=10432, timestamp). For errors: retriable (network timeout → auto-retry with retries=MAX_INT). Non-retriable (bad data) → immediate fail to callback." }
      ];
      var PNODES = ["① App: producer.send(record, callback)","② Serialize: key+value → byte[]","③ Partitioner: murmur2(key) % N → partition","④ RecordAccumulator: batch per partition","⑤ Sender thread: PRODUCE request to leader","⑥ Leader: append to .log segment","⑦ ISR replicas: fetch + replicate","⑧ Callback: RecordMetadata(partition, offset)"];

      var pStep=0, pTimer=null;
      function renderP(){
        var s = PS[pStep];
        mount.querySelector("#kprod-pipe").innerHTML = PNODES.map(function(n,i){
          var active = i===s.active, done = i<s.active;
          var c = active?"#e8741a":done?"#3dd68c":"#768390";
          var bg = active?"rgba(232,116,26,.12)":done?"rgba(61,214,140,.06)":"rgba(255,255,255,.02)";
          return "<div class=\"knode\" style=\"background:"+bg+";border:1px solid "+c+"40;color:"+c+"\">"+(active?"▶ ":done?"✓ ":"")+n+"</div>"+(i<PNODES.length-1?"<div class=\"karr\">↓</div>":"");
        }).join("");
        mount.querySelector("#kprod-info").textContent = s.info;
        mount.querySelector("#kp-ps").textContent = "Step "+(pStep+1)+"/"+PS.length;
      }
      function pStop(){ if(pTimer){clearInterval(pTimer);pTimer=null;} mount.querySelector("#kp-play").textContent="▶ Play"; }
      mount.querySelector("#kp-pp").onclick=function(){pStop();if(pStep>0){pStep--;renderP();}};
      mount.querySelector("#kp-pn").onclick=function(){pStop();if(pStep<PS.length-1){pStep++;renderP();}};
      mount.querySelector("#kp-play").onclick=function(){if(pTimer){pStop();}else{mount.querySelector("#kp-play").textContent="⏸ Pause";pTimer=setInterval(function(){if(pStep<PS.length-1){pStep++;renderP();}else{pStop();}},1800);}};
      mount.querySelector("#kp-pr").onclick=function(){pStop();pStep=0;renderP();};
      renderP();

      // Consumer steps
      var CS = [
        { active:0, info:"consumer.poll(Duration.ofMillis(100)) — single call does everything: heartbeat + rebalance + fetch. Must call within max.poll.interval.ms (default 5min) or broker kicks consumer." },
        { active:1, info:"Heartbeat sent to GroupCoordinator. session.timeout.ms=30s: if no heartbeat in 30s → broker detects failure. heartbeat.interval.ms=3s: send heartbeat every 3s. Set heartbeat < session/3." },
        { active:2, info:"Rebalance check: coordinator sends JOIN_GROUP / SYNC_GROUP if needed. onPartitionsRevoked() called before revoke, onPartitionsAssigned() after assignment. Stop-the-world with eager rebalance." },
        { active:3, info:"FETCH request to leader broker: {topic, partition, offset, max.bytes=50MB}. max.poll.records=500 (default). fetch.min.bytes=1 (default, return immediately). Tune for batched reads." },
        { active:4, info:"ConsumerRecords<K,V> returned. Iterate and process each record. Keep processing fast — if loop exceeds max.poll.interval.ms without calling poll() again → kicked from group." },
        { active:5, info:"commitSync() after ALL records processed — at-least-once delivery. Crash before commit → replay on restart. Commit per-batch with commitSync(Map<TopicPartition,OffsetAndMetadata>) for finer control." }
      ];
      var CNODES = ["① consumer.poll(100ms)","② Heartbeat to GroupCoordinator","③ Rebalance check (if triggered)","④ FETCH request to leader","⑤ Process ConsumerRecords","⑥ commitSync() — offset committed"];
      var cStep=0,cTimer=null;
      function renderC(){
        var s=CS[cStep];
        mount.querySelector("#kcons-loop").innerHTML=CNODES.map(function(n,i){
          var active=i===s.active,done=i<s.active;
          var c=active?"#e8741a":done?"#3dd68c":"#768390";
          var bg=active?"rgba(232,116,26,.12)":done?"rgba(61,214,140,.06)":"rgba(255,255,255,.02)";
          return "<div class=\"knode\" style=\"background:"+bg+";border:1px solid "+c+"40;color:"+c+"\">"+(active?"▶ ":done?"✓ ":"")+n+"</div>"+(i<CNODES.length-1?"<div class=\"karr\">↓</div>":"");
        }).join("");
        mount.querySelector("#kcons-info").textContent=s.info;
        mount.querySelector("#kc-ps").textContent="Step "+(cStep+1)+"/"+CS.length;
      }
      function cStop(){ if(cTimer){clearInterval(cTimer);cTimer=null;} mount.querySelector("#kc-play").textContent="▶ Play"; }
      mount.querySelector("#kc-pp").onclick=function(){cStop();if(cStep>0){cStep--;renderC();}};
      mount.querySelector("#kc-pn").onclick=function(){cStop();if(cStep<CS.length-1){cStep++;renderC();}};
      mount.querySelector("#kc-play").onclick=function(){if(cTimer){cStop();}else{mount.querySelector("#kc-play").textContent="⏸";cTimer=setInterval(function(){if(cStep<CS.length-1){cStep++;renderC();}else{cStop();}},1800);}};
      mount.querySelector("#kc-pr").onclick=function(){cStop();cStep=0;renderC();};
      renderC();

      // Acks
      var AD = {
        "0":{ label:"acks=0 — Fire & Forget", color:"#f47067", rows:[
          {n:"Producer",c:"#58a6ff"},{n:"✉ send (no wait)",c:"#768390"},{n:"Leader Broker",c:"#768390"},{n:"⚠️ NO ack — unknown if received",c:"#f47067"},{n:"Replica (maybe synced, maybe not)",c:"#768390"}
        ], info:"Highest throughput, zero durability. Producer does not wait for any acknowledgment. Message lost if broker restarts mid-write. Use for: clickstream metrics, access logs where occasional loss is acceptable." },
        "1":{ label:"acks=1 — Leader Ack", color:"#f5b944", rows:[
          {n:"Producer",c:"#58a6ff"},{n:"✉ send",c:"#768390"},{n:"Leader: writes + acks ✓",c:"#f5b944"},{n:"⚠️ Replication async — not guaranteed",c:"#f47067"},{n:"Replica (may miss write if leader dies NOW)",c:"#768390"}
        ], info:"Leader writes + acks immediately. Risk: leader dies before replication → new leader (follower) never got the record → DATA LOSS. Common in older Kafka configs. Avoid for financial/critical data." },
        "all":{ label:"acks=all — Full ISR Ack", color:"#3dd68c", rows:[
          {n:"Producer",c:"#58a6ff"},{n:"✉ send",c:"#768390"},{n:"Leader: writes",c:"#3dd68c"},{n:"Replica 1: fetched + in ISR ✓",c:"#3dd68c"},{n:"Replica 2: fetched + in ISR ✓ → COMMITTED",c:"#3dd68c"}
        ], info:"Leader waits for ALL ISR members to fetch record before committing. Safe even if leader dies — follower has the copy. Combine with min.insync.replicas=2 (fail if ISR shrinks to 1). Pair with enable.idempotence=true." }
      };
      function renderAck(key){
        var d=AD[key];
        mount.querySelector("#kack-vis").innerHTML=d.rows.map(function(r,i){return "<div class=\"knode\" style=\"background:rgba(255,255,255,.02);border:1px solid "+r.c+"40;color:"+r.c+"\">"+r.n+"</div>"+(i<d.rows.length-1?"<div class=\"karr\">↓</div>":"");}).join("");
        mount.querySelector("#kack-info").innerHTML=d.info+"<br><strong style=\"color:"+d.color+"\">"+d.label+"</strong>";
      }
      mount.querySelectorAll(".kack").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".kack").forEach(function(b){b.style.borderColor="";b.style.color="";});
          var c=AD[btn.dataset.ack].color;
          btn.style.borderColor=c;btn.style.color=c;
          renderAck(btn.dataset.ack);
        });
      });
      renderAck("0");
    },

    concept:
`**L1 (30s ELI5):** Kafka producer is a newspaper publisher — serializes, partitions, batches, sends. Consumer is a subscriber — polls at own pace, commits which issue it read.

**L2 (2min core):** Producer: serialize → partition (murmur2 hash of key) → RecordAccumulator batch → Sender fires to leader → ISR replicates → ack. Consumer: poll() loop (heartbeat + fetch + rebalance handling) → process → commitSync(). Offset stored in __consumer_offsets internal topic.

**L3 (10min edge cases):** acks=1 + leader failure = data loss. Auto-commit + crash = loss. max.poll.interval.ms exceeded = rebalance loop. Large messages >1MB need both broker AND consumer config. buffer.memory full → blocks for max.block.ms → TimeoutException. enable.idempotence forces max.in.flight=1 per partition.

**L4 (30min deep):** RecordAccumulator uses per-partition Deque<ProducerBatch> with MemoryRecordsBuilder writing to ByteBuffer from a BufferPool (avoids GC). Sender uses NIO Selector + NetworkClient for async I/O across multiple brokers. ProduceRequest v8+ includes PID, epoch, sequence for idempotence. ISR tracked in ZooKeeper/KRaft — leader updates ISR when follower lag > replica.lag.time.max.ms. FetchRequest specifies fetch.min.bytes (reduce empty polls) and fetch.max.wait.ms.`,

    why: "Producer/consumer config determines throughput, durability, latency, and exactly-once behavior. Wrong defaults cause silent data loss in production. acks=all + idempotence + manual commit = production standard.",

    example: {
      language: "java",
      code:
`// Production producer
Properties p = new Properties();
p.put("bootstrap.servers", "b1:9092,b2:9092,b3:9092");
p.put("key.serializer",    "org.apache.kafka.common.serialization.StringSerializer");
p.put("value.serializer",  "org.apache.kafka.common.serialization.StringSerializer");
p.put("acks",              "all");
p.put("enable.idempotence","true");   // PID+seq dedup, retries=MAX_INT
p.put("batch.size",        "65536");  // 64KB
p.put("linger.ms",         "5");
p.put("compression.type",  "snappy");

KafkaProducer<String,String> prod = new KafkaProducer<>(p);
prod.send(new ProducerRecord<>("orders", orderId, json), (meta, ex) -> {
    if (ex != null) log.error("Failed: {}", orderId, ex);
    else            log.debug("offset={} partition={}", meta.offset(), meta.partition());
});

// Production consumer
Properties c = new Properties();
c.put("bootstrap.servers",     "b1:9092,b2:9092,b3:9092");
c.put("group.id",              "order-processor-v2");
c.put("key.deserializer",      "org.apache.kafka.common.serialization.StringDeserializer");
c.put("value.deserializer",    "org.apache.kafka.common.serialization.StringDeserializer");
c.put("auto.offset.reset",     "earliest");
c.put("enable.auto.commit",    "false");     // manual commit
c.put("max.poll.records",      "200");
c.put("max.poll.interval.ms",  "300000");

KafkaConsumer<String,String> consumer = new KafkaConsumer<>(c);
consumer.subscribe(List.of("orders"));
try {
    while (!shutdown.get()) {
        var records = consumer.poll(Duration.ofMillis(100));
        for (var r : records) processOrder(r.value());
        if (!records.isEmpty()) consumer.commitSync();
    }
} finally { consumer.close(); }`
    },

    gotchas: [
      "acks=1 + leader dies before replication = DATA LOST. Use acks=all + min.insync.replicas=2.",
      "enable.auto.commit=true + slow processing = at-most-once delivery. Always false in production.",
      "producer.send() is async — no callback = exceptions silently swallowed. ALWAYS add callback.",
      "max.poll.interval.ms exceeded during processing = consumer kicked from group = rebalance loop. Fix: reduce max.poll.records or increase max.poll.interval.ms.",
      "Tuning message.max.bytes (broker) without fetch.message.max.bytes (consumer) = MessageSizeTooLargeException on produce but fetch broken. Must tune BOTH.",
      "enable.idempotence=true forces max.in.flight.requests.per.connection=1 per partition and retries=MAX_INT. Don't override these manually."
    ],

    interview: [
      { q:"Exactly what happens inside producer.send()?", a:"serialize → partition → RecordAccumulator.append() (batch per topic+partition) → Sender thread fires when batch.size full or linger.ms elapsed → PRODUCE request → leader appends → ISR replicates → callback fires with RecordMetadata(offset,partition) or exception." },
      { q:"What is the data loss scenario with acks=1?", a:"Leader acknowledges write, then crashes before replication. New leader (promoted follower) never received the record. Record is permanently lost. Solution: acks=all waits for all ISR members before ack. Pair with min.insync.replicas=2 so ISR must have at least 2 replicas." },
      { q:"How does exactly-once work in Kafka?", a:"(1) Idempotent producer: enable.idempotence=true → PID+sequence per partition → broker deduplicates retries. (2) Transactions: beginTransaction() + produce + sendOffsetsToTransaction() + commitTransaction() = atomic. (3) Consumer: isolation.level=read_committed skips aborted/in-flight records." },
      { q:"Consumer processing is slow. What happens if poll() isn't called often enough?", a:"GroupCoordinator tracks time since last poll(). If > max.poll.interval.ms (default 5min) → coordinator considers consumer dead → triggers rebalance → consumer re-joins → starts over. Fix: reduce max.poll.records (process fewer per batch), increase max.poll.interval.ms, or offload processing to async thread pool." }
    ],

    tradeoffs: "High throughput: large batch.size + linger.ms=50ms + snappy compression. Tradeoff: higher latency. Low latency: linger.ms=0 + small batches. Tradeoff: more requests, lower throughput. Strong durability: acks=all + min.insync.replicas=2. Tradeoff: +5-10ms per produce. Exactly-once: transactions. Tradeoff: 10-20% overhead + complexity."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
