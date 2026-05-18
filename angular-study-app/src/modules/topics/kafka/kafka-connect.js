(function() {
  var topic = {
    id: "kafka-connect",
    area: "kafka",
    title: "Kafka Connect",
    tag: "connect",
    tags: ["kafka","connect","source-connector","sink-connector","SMT","CDC","Debezium"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.knw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.kn-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.knbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.knbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.knp{display:none}.knp.on{display:block}
.kn-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.kn-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.kn-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.kn-info b{color:#e8741a}
.kn-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.kn-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.kn-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.kn-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.kn-block{padding:10px 16px;border-radius:8px;border:2px solid;font-size:12px;font-weight:600;text-align:center;min-width:100px;transition:all .3s}
.kn-block.source-sys{border-color:#58a6ff;background:#58a6ff15;color:#58a6ff}
.kn-block.connector{border-color:#e8741a;background:#e8741a15;color:#e8741a}
.kn-block.kafka{border-color:#f5b944;background:#f5b94415;color:#f5b944}
.kn-block.sink-sys{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.kn-block.smt{border-color:#d2a8ff;background:#d2a8ff15;color:#d2a8ff}
.kn-block.active{box-shadow:0 0 12px currentColor;transform:scale(1.05)}
.kn-arrow{font-size:20px;color:#e8741a;margin:0 6px}
.kn-flow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0}
.kn-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.kn-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.kn-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.kn-trick b{color:#f5b944}
.kn-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.kn-q-card .q{font-size:13px;font-weight:600}
.kn-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.kn-q-card.open .a{display:block}.kn-q-card.open{border-color:#e8741a}
.kn-connector-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;margin-bottom:8px}
.kn-connector-card h5{margin:0 0 4px;font-size:13px;font-weight:700}
.kn-task-row{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
.kn-task{padding:5px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid;transition:all .3s}
.kn-task.running{border-color:#3dd68c;color:#3dd68c;background:#3dd68c15}
.kn-task.failed{border-color:#f47067;color:#f47067;background:#f4706715}
.kn-task.paused{border-color:#8b949e;color:#8b949e;background:#8b949e15}
</style>
<div class="knw">
  <div class="kn-tabs">
    <button class="knbtn on" data-tab="arch">Architecture</button>
    <button class="knbtn" data-tab="source">Source Connectors</button>
    <button class="knbtn" data-tab="sink">Sink Connectors</button>
    <button class="knbtn" data-tab="smt">SMT Transforms</button>
    <button class="knbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- ARCHITECTURE -->
  <div class="knp on" id="kn-arch">
    <div class="kn-info" id="kn-ainfo">Kafka Connect = framework for scalable, fault-tolerant data pipelines. Source: system→Kafka. Sink: Kafka→system.</div>
    <div class="kn-box">
      <h4>Connect Worker Cluster</h4>
      <div class="kn-flow" id="kn-arch-flow"></div>
    </div>
    <div class="kn-box">
      <h4>Key Components</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px">
          <div style="font-size:12px;font-weight:600;color:#e8741a;margin-bottom:4px">Connector</div>
          <div style="font-size:11px;color:#8b949e">Plugin/config that defines what to connect. Not the actual worker — spawns Tasks.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px">
          <div style="font-size:12px;font-weight:600;color:#58a6ff;margin-bottom:4px">Task</div>
          <div style="font-size:11px;color:#8b949e">Unit of parallelism. Each task handles a subset of data (e.g., one table shard). Run on workers.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px">
          <div style="font-size:12px;font-weight:600;color:#3dd68c;margin-bottom:4px">Worker</div>
          <div style="font-size:11px;color:#8b949e">JVM process. Hosts connectors + tasks. Distributed mode: multiple workers share load.</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px">
          <div style="font-size:12px;font-weight:600;color:#d2a8ff;margin-bottom:4px">SMT</div>
          <div style="font-size:11px;color:#8b949e">Single Message Transform. Lightweight per-record transformation (mask fields, rename, route).</div>
        </div>
      </div>
    </div>
    <div class="kn-ctrls">
      <button id="kn-aprev">◀ Prev</button>
      <button id="kn-aplay">▶ Play</button>
      <button id="kn-anext">Next ▶</button>
      <button id="kn-areset">↺ Reset</button>
      <span class="kn-step-info" id="kn-astep">Step 1/5</span>
    </div>
  </div>

  <!-- SOURCE -->
  <div class="knp" id="kn-source">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="kn-stab on" data-src="jdbc">JDBC Source</button>
      <button class="kn-stab" data-src="debezium">Debezium CDC</button>
      <button class="kn-stab" data-src="s3">S3 Source</button>
    </div>
    <div id="kn-src-content"></div>
  </div>

  <!-- SINK -->
  <div class="knp" id="kn-sink">
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="kn-stab on" data-snk="es">Elasticsearch Sink</button>
      <button class="kn-stab" data-snk="jdbc-sink">JDBC Sink</button>
      <button class="kn-stab" data-snk="s3-sink">S3 Sink</button>
    </div>
    <div id="kn-snk-content"></div>
  </div>

  <!-- SMT -->
  <div class="knp" id="kn-smt">
    <div class="kn-info">SMT = lightweight per-record transformation applied inline. Chain multiple SMTs. No code needed for common transforms.</div>
    <div id="kn-smt-list"></div>
    <div class="kn-box" style="margin-top:8px">
      <h4>SMT Chain Example</h4>
      <div id="kn-smt-flow"></div>
    </div>
  </div>

  <!-- TRICKS -->
  <div class="knp" id="kn-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="kn-trick"><b>Standalone vs Distributed mode</b> — Standalone: single worker, offsets stored locally. Distributed: multiple workers, offsets in Kafka internal topics (connect-offsets, connect-configs, connect-status).</div>
    <div class="kn-trick"><b>Tasks ≠ Connectors</b> — Connector is config/plugin. Tasks are the actual workers. tasks.max controls parallelism. Connector spawns tasks = min(tasks.max, natural parallelism of source).</div>
    <div class="kn-trick"><b>JDBC connector uses polling</b> — not push. Adds column or timestamp query for new rows. Not real-time. Debezium uses WAL (Write-Ahead Log) for true CDC — sub-second latency.</div>
    <div class="kn-trick"><b>Dead letter queue (DLQ)</b> — errors.tolerance=all + errors.deadletterqueue.topic.name. Bad records sent to DLQ instead of failing connector. Can inspect and reprocess.</div>
    <div class="kn-trick"><b>SMTs are not for heavy transforms</b> — for complex logic, use Kafka Streams or ksqlDB downstream. SMTs: field masking, routing, timestamp conversion, flattening only.</div>
    <div class="kn-trick"><b>Exactly-once with Sink connectors</b> — most sink connectors are at-least-once. Exactly-once requires idempotent sink or 2-phase commit. JDBC sink: use upsert mode (PK-based) for idempotency.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="kn-q-card"><div class="q">Q: Difference between JDBC Source connector and Debezium?</div><div class="a">JDBC: polls database every interval, queries for new/changed rows via timestamp or incrementing ID. Not real-time, misses hard deletes. Debezium: reads database WAL (binary log) — captures every INSERT/UPDATE/DELETE in real-time. True CDC. Supports MySQL, PostgreSQL, MongoDB. Sub-second latency.</div></div>
    <div class="kn-q-card"><div class="q">Q: How does Kafka Connect handle failures?</div><div class="a">Tasks are automatically restarted by worker on failure. In distributed mode, if a worker dies, its tasks are redistributed to remaining workers (via consumer group rebalance). errors.tolerance=all + DLQ: bad records don't kill connector — routed to dead letter topic.</div></div>
    <div class="kn-q-card"><div class="q">Q: What are Single Message Transforms (SMTs)?</div><div class="a">Lightweight per-record transformations applied inline in the connector pipeline. Chain multiple SMTs. Common: ReplaceField (rename/mask), ExtractField (unnest), TimestampConverter, ValueToKey (move field to key), Router (change topic name). Not for heavy logic — use Streams for that.</div></div>
    <div class="kn-q-card"><div class="q">Q: How do you achieve exactly-once with Kafka Connect sink?</div><div class="a">Most sinks are at-least-once. For idempotency: use upsert mode with primary key in JDBC sink (re-inserts = same row). Or use a sink that supports transactions (some Elasticsearch versions). True EOS requires the sink system to support transactional writes.</div></div>
  </div>
</div>`;

      // ARCHITECTURE ANIMATION
      var ASTEPS=[
        {active:null,info:"Kafka Connect runs as a cluster of workers. Config submitted via REST API. Internal topics store state."},
        {active:"source-db",info:"<b>Source system</b> (PostgreSQL/MySQL/S3). Source connector reads from here."},
        {active:"connector",info:"<b>Connector plugin</b> spawns tasks. Each task handles a partition/table shard. Tasks run on available workers."},
        {active:"kafka",info:"<b>Kafka topic</b>: source records written here. Schema Registry used for Avro serialization."},
        {active:"sink",info:"<b>Sink system</b> (Elasticsearch/S3/DB). Sink connector reads from Kafka, writes to target. SMTs applied inline."},
      ];
      var AFLOW=[
        {id:"source-db",label:"Source DB",sub:"PostgreSQL",type:"source-sys"},
        {id:"connector",label:"Source Connector",sub:"Debezium",type:"connector"},
        {id:"kafka",label:"Kafka Topic",sub:"orders.cdc",type:"kafka"},
        {id:"connector2",label:"Sink Connector",sub:"ES Sink",type:"connector"},
        {id:"sink",label:"Elasticsearch",sub:"search index",type:"sink-sys"},
      ];
      var aStep=0,aTimer=null;
      function renderArch(){
        var s=ASTEPS[aStep];
        mount.querySelector("#kn-arch-flow").innerHTML=AFLOW.map(function(n,i){
          var active=s.active&&(s.active===n.id||(s.active==="connector"&&n.id==="connector")||(s.active==="sink"&&n.id==="connector2")||(s.active==="sink"&&n.id==="sink"));
          return "<div class=\"kn-block "+n.type+(active?" active":"")+"\">"+n.label+"<div style=\"font-size:10px;opacity:.7;font-weight:400\">"+n.sub+"</div></div>"+(i<AFLOW.length-1?"<div class=\"kn-arrow\">→</div>":"");
        }).join("");
        mount.querySelector("#kn-ainfo").innerHTML=s.info;
        mount.querySelector("#kn-astep").textContent="Step "+(aStep+1)+"/"+ASTEPS.length;
      }
      function aStop(){clearInterval(aTimer);aTimer=null;mount.querySelector("#kn-aplay").textContent="▶ Play";}
      mount.querySelector("#kn-aplay").addEventListener("click",function(){if(aTimer){aStop();}else{aTimer=setInterval(function(){aStep=Math.min(aStep+1,ASTEPS.length-1);renderArch();if(aStep===ASTEPS.length-1)aStop();},1700);mount.querySelector("#kn-aplay").textContent="⏸ Pause";}});
      mount.querySelector("#kn-anext").addEventListener("click",function(){aStop();aStep=Math.min(aStep+1,ASTEPS.length-1);renderArch();});
      mount.querySelector("#kn-aprev").addEventListener("click",function(){aStop();aStep=Math.max(aStep-1,0);renderArch();});
      mount.querySelector("#kn-areset").addEventListener("click",function(){aStop();aStep=0;renderArch();});
      renderArch();

      // SOURCE CONNECTORS
      var srcMode="jdbc";
      var SRC_DATA={
        jdbc:{name:"JDBC Source Connector",color:"#58a6ff",how:"Polls DB on interval. Uses incrementing column (ID) or timestamp column to find new rows. No real CDC — misses hard deletes.",
          pros:["Simple setup","Works with any SQL DB","No DB-side setup needed"],
          cons:["Polling latency (seconds-minutes)","Cannot capture DELETEs","High DB load at scale","Misses partial updates without timestamp"],
          config:{connector_class:"io.confluent.connect.jdbc.JdbcSourceConnector",tasks_max:4,connection_url:"jdbc:postgresql://...",mode:"timestamp+incrementing",timestamp_column_name:"updated_at",incrementing_column_name:"id",topic_prefix:"db.",poll_interval_ms:5000}},
        debezium:{name:"Debezium CDC Connector",color:"#e8741a",how:"Reads DB WAL (Write-Ahead Log / binary log). True change data capture. Captures INSERT, UPDATE, DELETE in real-time. Sub-second latency.",
          pros:["Sub-second latency","Captures all change types including DELETE","Low DB overhead (WAL reading)","Before + after image for UPDATEs"],
          cons:["Requires DB replication slot (PostgreSQL) or binlog (MySQL)","WAL can grow if connector lags","Snapshot on first run reads entire table"],
          config:{connector_class:"io.debezium.connector.postgresql.PostgresConnector",tasks_max:1,database_hostname:"postgres",database_port:5432,database_dbname:"orders",database_server_name:"orders-db",plugin_name:"pgoutput",slot_name:"debezium_slot"}},
        s3:{name:"S3 Source Connector",color:"#3dd68c",how:"Reads files from S3 bucket. Tracks file position. Formats: JSON, Avro, CSV. Good for batch ingestion from data lakes.",
          pros:["Process S3 files at scale","Configurable partitioning","Handles large files"],
          cons:["Not real-time — file-based batch","Requires file naming conventions","No CDC semantics"],
          config:{connector_class:"io.confluent.connect.s3.source.S3SourceConnector",tasks_max:4,s3_bucket_name:"my-data-lake",s3_region:"us-east-1",format_class:"io.confluent.connect.s3.format.json.JsonFormat",topics_dir:"connect-s3-source"}},
      };
      function renderSrc(){
        var s=SRC_DATA[srcMode];
        var el=mount.querySelector("#kn-src-content");
        el.innerHTML="<div class=\"kn-box\" style=\"border-color:"+s.color+"44\">"+
          "<div style=\"font-size:13px;font-weight:700;color:"+s.color+";margin-bottom:6px\">"+s.name+"</div>"+
          "<div style=\"font-size:12px;color:#8b949e;margin-bottom:10px\">"+s.how+"</div>"+
          "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px\">"+
          "<div><div style=\"font-size:11px;color:#3dd68c;font-weight:600;margin-bottom:4px\">Pros</div>"+s.pros.map(function(p){return "<div style=\"font-size:11px;color:#3dd68c;margin-bottom:2px\">✓ "+p+"</div>";}).join("")+"</div>"+
          "<div><div style=\"font-size:11px;color:#f47067;font-weight:600;margin-bottom:4px\">Cons</div>"+s.cons.map(function(c){return "<div style=\"font-size:11px;color:#f47067;margin-bottom:2px\">✗ "+c+"</div>";}).join("")+"</div></div>"+
          "<details style=\"font-size:11px\"><summary style=\"cursor:pointer;color:#8b949e\">Config example</summary><pre style=\"background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:8px;margin-top:6px;overflow-x:auto;color:#cdd9e5;font-size:10px\">"+JSON.stringify(s.config,null,2)+"</pre></details></div>";
      }
      mount.querySelectorAll(".kn-stab[data-src]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".kn-stab[data-src]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");srcMode=b.dataset.src;renderSrc();});
      });
      renderSrc();

      // SINK CONNECTORS
      var snkMode="es";
      var SNK_DATA={
        es:{name:"Elasticsearch Sink",color:"#58a6ff",how:"Reads from Kafka, indexes records into Elasticsearch. Key = document ID. Delivery: at-least-once (idempotent via ES document ID).",
          features:["Auto-creates index if not exists","Schema evolution via dynamic mapping","Bulk indexing for throughput","Supports SMTs for field mapping"]},
        "jdbc-sink":{name:"JDBC Sink",color:"#3dd68c",how:"Writes records to relational DB tables. Supports INSERT, UPSERT, UPDATE modes. Use upsert for idempotency (PK-based).",
          features:["Auto-creates table from schema","Upsert mode for at-least-once safety","Configurable insert.mode","Handles schema changes with auto.evolve"]},
        "s3-sink":{name:"S3 Sink",color:"#f5b944",how:"Batches records from Kafka into S3 files. Partitioned by time or field. Formats: Avro, JSON, Parquet.",
          features:["Configurable file size/rotation","Time-based or field-based partitioning","Compresses files (gzip, lz4)","Ideal for data lake + Athena queries"]},
      };
      function renderSnk(){
        var s=SNK_DATA[snkMode];
        var el=mount.querySelector("#kn-snk-content");
        el.innerHTML="<div class=\"kn-box\" style=\"border-color:"+s.color+"44\">"+
          "<div style=\"font-size:13px;font-weight:700;color:"+s.color+";margin-bottom:6px\">"+s.name+"</div>"+
          "<div style=\"font-size:12px;color:#8b949e;margin-bottom:10px\">"+s.how+"</div>"+
          s.features.map(function(f){return "<div style=\"display:flex;gap:8px;margin-bottom:5px;font-size:12px\"><span style=\"color:"+s.color+"\">✓</span><span>"+f+"</span></div>";}).join("")+"</div>";
      }
      mount.querySelectorAll(".kn-stab[data-snk]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".kn-stab[data-snk]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");snkMode=b.dataset.snk;renderSnk();});
      });
      renderSnk();

      // SMT
      var SMTS=[
        {name:"ReplaceField",color:"#58a6ff",desc:"Rename or remove fields. Use to mask PII or align field names.",example:"transforms.mask.type=ReplaceField\ntransforms.mask.blacklist=credit_card,ssn"},
        {name:"ValueToKey",color:"#e8741a",desc:"Copy a field from value to record key. Essential for keyed topics.",example:"transforms.setKey.type=ValueToKey\ntransforms.setKey.fields=user_id"},
        {name:"TimestampConverter",color:"#3dd68c",desc:"Convert timestamp format (unix ms ↔ ISO 8601 ↔ Date type).",example:"transforms.ts.type=TimestampConverter\ntransforms.ts.field=created_at\ntransforms.ts.target.type=string\ntransforms.ts.format=yyyy-MM-dd"},
        {name:"HoistField",color:"#d2a8ff",desc:"Wrap the entire record value in a struct field. Good for nested JSON.",example:"transforms.hoist.type=HoistField$Value\ntransforms.hoist.field=payload"},
        {name:"ExtractField",color:"#f5b944",desc:"Extract a single field from a struct/map. Opposite of HoistField.",example:"transforms.extract.type=ExtractField$Value\ntransforms.extract.field=after"},
        {name:"RegexRouter",color:"#f47067",desc:"Route records to different topics based on regex on current topic name.",example:"transforms.route.type=RegexRouter\ntransforms.route.regex=orders-(.*)\ntransforms.route.replacement=processed-orders-$1"},
      ];
      mount.querySelector("#kn-smt-list").innerHTML="<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">"+
        SMTS.map(function(s){return "<div style=\"background:#161b22;border:1px solid "+s.color+"44;border-radius:8px;padding:10px\">"+
          "<div style=\"font-size:12px;font-weight:700;color:"+s.color+";margin-bottom:4px\">"+s.name+"</div>"+
          "<div style=\"font-size:11px;color:#8b949e;margin-bottom:6px\">"+s.desc+"</div>"+
          "<pre style=\"font-size:9px;color:#cdd9e5;margin:0;overflow-x:auto\">"+s.example+"</pre></div>";}).join("")+"</div>";
      mount.querySelector("#kn-smt-flow").innerHTML="<div style=\"display:flex;align-items:center;gap:4px;flex-wrap:wrap\">"+
        [{l:"Raw Record",c:"#30363d"},{l:"ReplaceField",c:"#58a6ff"},{l:"ValueToKey",c:"#e8741a"},{l:"TimestampConverter",c:"#3dd68c"},{l:"Output Record",c:"#d2a8ff"}].map(function(n,i,arr){
          return "<div style=\"background:"+n.c+"22;border:1px solid "+n.c+";border-radius:6px;padding:6px 10px;font-size:11px;color:"+n.c+"\">"+n.l+"</div>"+(i<arr.length-1?"<div style=\"color:#e8741a;font-size:16px\">→</div>":"");
        }).join("")+"</div>";

      // TABS
      mount.querySelectorAll(".knbtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".knbtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".knp").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#kn-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".kn-q-card").forEach(function(c){c.addEventListener("click",function(){c.classList.toggle("open");});});
    },
    concept: `**L1 (30s ELI5):** Kafka Connect = plug-and-play data pipelines. Source connector pulls from DB/S3 into Kafka. Sink connector pushes from Kafka to DB/S3/ES. Zero custom code for common systems.

**L2 (2min core):** Connectors spawn Tasks (parallelism units). Workers host tasks. Distributed mode: offset/config/status stored in Kafka internal topics. REST API to deploy/manage connectors. SMTs for lightweight transforms.

**L3 (10min edge cases):** JDBC vs Debezium: polling vs WAL-based CDC. DLQ for bad records. errors.tolerance=all avoids connector failure on single bad record. JDBC sink: upsert mode for idempotency. S3 sink: file rotation by time/size.

**L4 (30min deep):** Distributed mode uses consumer group protocol for task assignment. connect-offsets (compacted): source offsets per partition. connect-configs (compacted): connector/task configs. connect-status (compacted): connector states. SMT chain: transforms applied in order, each sees result of previous. Custom SMTs: implement Transformation interface.`,
    why: "Connect handles the operational burden of data pipelines: offset tracking, parallelism, failure recovery, schema evolution. 200+ open-source connectors (Confluent Hub). Alternative to custom Kafka consumers/producers for integration use cases.",
    example: {
      language: "bash",
      code: `# Deploy Debezium PostgreSQL source connector via REST API
curl -X POST http://connect:8083/connectors \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "orders-cdc",
    "config": {
      "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
      "tasks.max": "1",
      "database.hostname": "postgres",
      "database.port": "5432",
      "database.user": "debezium",
      "database.password": "secret",
      "database.dbname": "orders",
      "database.server.name": "orders-db",
      "table.include.list": "public.orders",
      "plugin.name": "pgoutput",
      "slot.name": "debezium_slot",
      "errors.tolerance": "all",
      "errors.deadletterqueue.topic.name": "dlq.orders-cdc",
      "transforms": "route,mask",
      "transforms.route.type": "RegexRouter",
      "transforms.route.regex": "orders-db.public.(.*)",
      "transforms.route.replacement": "cdc.$1",
      "transforms.mask.type": "ReplaceField",
      "transforms.mask.blacklist": "credit_card"
    }
  }'

# Check connector status
curl http://connect:8083/connectors/orders-cdc/status`
    },
    gotchas: [
      "JDBC Source misses hard DELETEs — only detects rows with updated timestamp or new ID. Use Debezium for full CDC",
      "Debezium requires DB replication slot (PostgreSQL) or binlog (MySQL) — coordinate with DBA",
      "tasks.max is an upper bound — actual tasks = min(tasks.max, source parallelism e.g., table count)",
      "errors.tolerance=all silently drops bad records unless DLQ configured — configure DLQ!",
      "SMTs are not for heavy logic — for complex transforms use Kafka Streams downstream of the connector",
      "Distributed mode stores state in Kafka topics — don't change connect-offsets topic config or you lose offset tracking",
      "Schema changes: JDBC sink auto.evolve=true adds columns but can't remove them without manual intervention"
    ],
    interview: [
      { q: "JDBC Source vs Debezium?", a: "JDBC: polls DB on interval, uses timestamp/incrementing ID to find new rows. Misses DELETEs, has polling latency, high DB load. Debezium: reads WAL (Write-Ahead Log / binlog), captures INSERT/UPDATE/DELETE in real-time, sub-second latency, low DB overhead. Use Debezium for true CDC." },
      { q: "How does Kafka Connect handle failures?", a: "Tasks auto-restart on failure. Distributed: if worker dies, tasks redistributed via consumer group rebalance. errors.tolerance=all + DLQ: bad records routed to dead letter topic instead of failing connector. Connector offsets stored in Kafka — survive restarts." },
      { q: "What are SMTs and when NOT to use them?", a: "Single Message Transforms: lightweight per-record transforms (field rename, mask, route, timestamp convert). Chain multiple. NOT for: complex aggregations, joins, enrichment from external sources, heavy computation — use Kafka Streams or ksqlDB for those." },
      { q: "How to achieve idempotency in JDBC Sink connector?", a: "Use insert.mode=upsert with pk.mode=record_key (or record_value). Sink uses primary key for upsert — duplicate records from at-least-once delivery overwrite same row. Requires PK field in Kafka record key or value." }
    ],
    tradeoffs: "Connect: zero-code for standard integrations, but limited transform logic. Custom consumer/producer: full control but you own offset management, parallelism, failure handling. Debezium: powerful CDC but operationally complex (replication slots, snapshot management)."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
