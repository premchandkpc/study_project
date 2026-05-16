(function() {
  var topic = {
    id: "kafka-schema-registry",
    area: "kafka",
    title: "Schema Registry",
    tag: "schema",
    tags: ["kafka","schema-registry","avro","protobuf","json-schema","compatibility","evolution"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.srw{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.sr-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.srbtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.srbtn.on{background:#e8741a22;border-color:#e8741a;color:#e8741a;font-weight:600}
.srp{display:none}.srp.on{display:block}
.sr-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.sr-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.sr-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.sr-info b{color:#e8741a}
.sr-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sr-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.sr-ctrls button:hover{border-color:#e8741a;color:#e8741a}
.sr-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.sr-block{padding:8px 14px;border-radius:8px;border:2px solid;font-size:12px;font-weight:600;text-align:center;transition:all .3s}
.sr-block.producer{border-color:#58a6ff;background:#58a6ff15;color:#58a6ff}
.sr-block.registry{border-color:#e8741a;background:#e8741a15;color:#e8741a}
.sr-block.kafka{border-color:#f5b944;background:#f5b94415;color:#f5b944}
.sr-block.consumer{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c}
.sr-block.active{box-shadow:0 0 12px currentColor;transform:scale(1.05)}
.sr-arrow{font-size:20px;color:#e8741a;margin:0 6px}
.sr-flow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:10px 0}
.sr-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.sr-stab.on{background:#e8741a22;border-color:#e8741a;color:#e8741a}
.sr-trick{background:#161b22;border-left:3px solid #e8741a;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.sr-trick b{color:#f5b944}
.sr-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.sr-q-card .q{font-size:13px;font-weight:600}
.sr-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.sr-q-card.open .a{display:block}.sr-q-card.open{border-color:#e8741a}
.sr-compat-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
.sr-compat-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px}
.sr-compat-card.ok{border-color:#3dd68c}
.sr-compat-card.warn{border-color:#f5b944}
.sr-compat-card.bad{border-color:#f47067}
.sr-byte-row{display:flex;gap:2px;align-items:center;margin:8px 0;font-size:11px}
.sr-byte{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:4px;font-size:10px;font-weight:700;border:1px solid}
.sr-byte.magic{border-color:#e8741a;background:#e8741a22;color:#e8741a}
.sr-byte.id{border-color:#58a6ff;background:#58a6ff22;color:#58a6ff}
.sr-byte.data{border-color:#3dd68c;background:#3dd68c22;color:#3dd68c}
</style>
<div class="srw">
  <div class="sr-tabs">
    <button class="srbtn on" data-tab="flow">Producer/Consumer Flow</button>
    <button class="srbtn" data-tab="wire">Wire Format</button>
    <button class="srbtn" data-tab="compat">Schema Compatibility</button>
    <button class="srbtn" data-tab="formats">Avro vs Protobuf vs JSON</button>
    <button class="srbtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- PRODUCER/CONSUMER FLOW -->
  <div class="srp on" id="sr-flow">
    <div class="sr-info" id="sr-finfo">Schema Registry stores schemas centrally. Producer registers schema → gets ID. Sends ID + data. Consumer fetches schema by ID to deserialize.</div>
    <div class="sr-box">
      <h4>Serialize/Deserialize Flow</h4>
      <div class="sr-flow" id="sr-flow-nodes"></div>
    </div>
    <div class="sr-box">
      <h4>What happens at each step</h4>
      <div id="sr-flow-detail" style="font-size:12px;color:#8b949e;line-height:1.8"></div>
    </div>
    <div class="sr-ctrls">
      <button id="sr-fprev">◀ Prev</button>
      <button id="sr-fplay">▶ Play</button>
      <button id="sr-fnext">Next ▶</button>
      <button id="sr-freset">↺ Reset</button>
      <span class="sr-step-info" id="sr-fstep">Step 1/6</span>
    </div>
  </div>

  <!-- WIRE FORMAT -->
  <div class="srp" id="sr-wire">
    <div class="sr-info">Confluent wire format: 1 magic byte (0x00) + 4-byte schema ID + serialized data. Consumer reads ID → fetches schema → deserializes payload.</div>
    <div class="sr-box">
      <h4>Kafka Record Value — Byte Layout</h4>
      <div class="sr-byte-row">
        <div class="sr-byte magic">0x00</div>
        <div style="color:#8b949e;margin:0 4px">Magic byte (always 0)</div>
      </div>
      <div class="sr-byte-row">
        <div class="sr-byte id">00</div><div class="sr-byte id">00</div><div class="sr-byte id">00</div><div class="sr-byte id">42</div>
        <div style="color:#8b949e;margin:0 4px">Schema ID (4 bytes big-endian) = ID 66</div>
      </div>
      <div class="sr-byte-row">
        <div class="sr-byte data">A</div><div class="sr-byte data">v</div><div class="sr-byte data">r</div><div class="sr-byte data">o</div><div class="sr-byte data">...</div>
        <div style="color:#8b949e;margin:0 4px">Serialized payload (Avro/Protobuf/JSON)</div>
      </div>
      <div style="margin-top:12px;font-size:12px;color:#8b949e;line-height:1.8">
        <div>• Consumer reads magic byte → validates Confluent format</div>
        <div>• Reads 4-byte schema ID → looks up schema from registry (cached locally)</div>
        <div>• Uses schema to deserialize remaining bytes</div>
        <div>• Schema cached in consumer → only fetches once per schema ID</div>
      </div>
    </div>
    <div class="sr-box">
      <h4>Size Comparison</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div style="background:#0d1117;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:12px;font-weight:700;color:#e8741a;margin-bottom:4px">Avro</div>
          <div style="font-size:20px;font-weight:700;color:#3dd68c">~30 bytes</div>
          <div style="font-size:10px;color:#8b949e">Binary, no field names in wire</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:12px;font-weight:700;color:#58a6ff;margin-bottom:4px">Protobuf</div>
          <div style="font-size:20px;font-weight:700;color:#3dd68c">~35 bytes</div>
          <div style="font-size:10px;color:#8b949e">Field numbers, not names</div>
        </div>
        <div style="background:#0d1117;border-radius:6px;padding:8px;text-align:center">
          <div style="font-size:12px;font-weight:700;color:#f47067;margin-bottom:4px">JSON Schema</div>
          <div style="font-size:20px;font-weight:700;color:#f47067">~150 bytes</div>
          <div style="font-size:10px;color:#8b949e">Full field names in wire</div>
        </div>
      </div>
    </div>
  </div>

  <!-- COMPATIBILITY -->
  <div class="srp" id="sr-compat">
    <div class="sr-info">Compatibility = which schema versions can read each other's data. Controls what schema changes are allowed when registering new version.</div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="sr-stab on" data-compat="backward">BACKWARD</button>
      <button class="sr-stab" data-compat="forward">FORWARD</button>
      <button class="sr-stab" data-compat="full">FULL</button>
      <button class="sr-stab" data-compat="none">NONE</button>
    </div>
    <div id="sr-compat-content"></div>
    <div class="sr-box" style="margin-top:10px">
      <h4>Safe vs Unsafe Changes</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div>
          <div style="font-size:11px;color:#3dd68c;font-weight:600;margin-bottom:6px">✓ Safe (backward + forward)</div>
          <div style="font-size:11px;color:#3dd68c;margin-bottom:3px">• Add optional field with default value</div>
          <div style="font-size:11px;color:#3dd68c;margin-bottom:3px">• Remove optional field</div>
          <div style="font-size:11px;color:#3dd68c;margin-bottom:3px">• Widen numeric type (int→long)</div>
        </div>
        <div>
          <div style="font-size:11px;color:#f47067;font-weight:600;margin-bottom:6px">✗ Breaking</div>
          <div style="font-size:11px;color:#f47067;margin-bottom:3px">• Remove required field</div>
          <div style="font-size:11px;color:#f47067;margin-bottom:3px">• Rename field</div>
          <div style="font-size:11px;color:#f47067;margin-bottom:3px">• Change field type (string→int)</div>
          <div style="font-size:11px;color:#f47067;margin-bottom:3px">• Add required field without default</div>
        </div>
      </div>
    </div>
  </div>

  <!-- FORMATS -->
  <div class="srp" id="sr-formats">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
      <div class="sr-box" style="border-color:#e8741a44">
        <h4 style="color:#e8741a">Apache Avro</h4>
        <div style="font-size:11px;color:#8b949e;line-height:1.6;margin-bottom:8px">Schema in JSON. Data in binary. Schema required to read. Schema stored separately (Registry). Dynamic typing.</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Most compact</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Native Kafka/Hadoop ecosystem</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Schema evolution built-in</div>
        <div style="font-size:11px;color:#f47067;margin-top:4px">✗ No code generation</div>
        <div style="font-size:11px;color:#f47067">✗ Dynamic schema harder to debug</div>
      </div>
      <div class="sr-box" style="border-color:#58a6ff44">
        <h4 style="color:#58a6ff">Protobuf</h4>
        <div style="font-size:11px;color:#8b949e;line-height:1.6;margin-bottom:8px">Schema in .proto files. Code-generated classes. Field numbers not names in wire. Google standard.</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Strong typing + code gen</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Excellent backward compat</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Multi-language (Go, Python, Java)</div>
        <div style="font-size:11px;color:#f47067;margin-top:4px">✗ .proto file management</div>
        <div style="font-size:11px;color:#f47067">✗ Build pipeline complexity</div>
      </div>
      <div class="sr-box" style="border-color:#3dd68c44">
        <h4 style="color:#3dd68c">JSON Schema</h4>
        <div style="font-size:11px;color:#8b949e;line-height:1.6;margin-bottom:8px">JSON with schema validation. Largest on wire (field names included). Human readable. No deserialization step.</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Human readable</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ No schema to deserialize</div>
        <div style="font-size:11px;color:#3dd68c;margin-bottom:2px">✓ Easy debugging</div>
        <div style="font-size:11px;color:#f47067;margin-top:4px">✗ 3-5x larger than Avro</div>
        <div style="font-size:11px;color:#f47067">✗ No compact binary encoding</div>
      </div>
    </div>
    <div class="sr-box">
      <h4>Avro Schema Example</h4>
      <pre style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:11px;color:#cdd9e5;overflow-x:auto;margin:0">{
  "type": "record",
  "name": "Order",
  "namespace": "com.example",
  "fields": [
    {"name": "id",       "type": "long"},
    {"name": "userId",   "type": "string"},
    {"name": "amount",   "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "metadata", "type": ["null","string"], "default": null}
  ]
}</pre>
    </div>
  </div>

  <!-- TRICKS -->
  <div class="srp" id="sr-tricks">
    <h4 style="color:#e8741a;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="sr-trick"><b>Backward = old consumer reads new data</b> — add field with default. Forward = new consumer reads old data — remove field with default. Full = both. Default compatibility = BACKWARD.</div>
    <div class="sr-trick"><b>Schema ID in every record</b> — 5-byte overhead per record (1 magic + 4 ID). ID looked up from registry on first use, cached locally. Registry is single point of failure if not HA.</div>
    <div class="sr-trick"><b>Subject naming</b> — default strategy: "topic-value" and "topic-key". TopicRecordNameStrategy: one subject per schema type (useful for union topics). RecordNameStrategy: by fully qualified type name.</div>
    <div class="sr-trick"><b>Avro "null" union</b> — optional field = ["null","string"] union. Order matters: default is FIRST type. ["null","string"] default=null ✓. ["string","null"] default=null ✗ (first type is string, default must be string).</div>
    <div class="sr-trick"><b>Renaming a field breaks compatibility</b> — Avro uses field name for matching. Rename = remove old + add new. Add alias to old name for backward compat.</div>
    <div class="sr-trick"><b>Schema Registry is NOT Kafka</b> — separate HTTP service. Stores schemas in _schemas internal topic (compacted). Can be Confluent or open-source Apicurio. Needs HA setup in production.</div>
    <h4 style="color:#e8741a;margin:14px 0 10px">Interview Q&A</h4>
    <div class="sr-q-card"><div class="q">Q: Why use Schema Registry instead of just sending JSON?</div><div class="a">Schema enforcement: producers can't send invalid records. Schema evolution: controlled changes via compatibility rules. Size: Avro binary is 5-10x smaller than JSON. Schema ID (4 bytes) + binary payload vs full JSON with field names. Also enables consumers to deserialize without knowing schema at compile time.</div></div>
    <div class="sr-q-card"><div class="q">Q: BACKWARD vs FORWARD compatibility?</div><div class="a">BACKWARD: new schema can read old data (old consumers reading new producer output). Safe change: add optional field with default. FORWARD: old schema can read new data (old consumers reading new data). Safe: remove optional field. FULL: both. Default is BACKWARD — ensures old consumers always work.</div></div>
    <div class="sr-q-card"><div class="q">Q: What happens if Schema Registry goes down?</div><div class="a">Producers: can't register new schemas. Existing schemas are cached locally → producers with cached schemas can still produce. Consumers: can read messages with cached schema IDs. New schema IDs → consumer fails to deserialize. Need HA Registry (multiple instances, _schemas topic is source of truth).</div></div>
    <div class="sr-q-card"><div class="q">Q: How do you safely rename a field in Avro?</div><div class="a">Avro uses field name for matching — rename = breaking change. Safe approach: 1. Add new field with desired name (with default). 2. Add alias=["old_name"] so old data maps to new field. 3. Deprecate old field. 4. Eventually remove old field. Alternatively: use field aliases in schema to support multiple names.</div></div>
  </div>
</div>`;

      // FLOW ANIMATION
      var FSTEPS=[
        {active:"producer",detail:"<b>Producer</b> has a schema (Avro/Protobuf). Before sending, calls KafkaAvroSerializer.",info:"Producer has schema. Serializer checks if schema registered in Schema Registry."},
        {active:"registry",detail:"<b>Schema Registry</b>: serializer checks if schema already registered (by hash). If new, registers and gets back schema ID (integer). If existing, gets cached ID.",info:"Registry assigns schema ID (e.g., 42). First registration runs compatibility check against existing versions."},
        {active:"kafka",detail:"<b>Kafka record</b>: value = [magic byte 0x00] + [4-byte schema ID] + [binary payload]. Key can also be Avro-serialized.",info:"Record stored in Kafka with 5-byte prefix: magic byte + schema ID. Actual data is compact binary."},
        {active:"consumer",detail:"<b>Consumer</b>: receives bytes. KafkaAvroDeserializer reads magic byte → reads schema ID (4 bytes) → looks up schema in registry (or local cache) → deserializes payload.",info:"Consumer fetches schema by ID from Registry (cached after first use). Deserializes binary payload using schema."},
        {active:null,detail:"<b>Schema evolution</b>: producer upgrades to v2 schema (adds optional field). Registry checks backward compatibility → allows. v2 gets new ID (43). Old consumers (reading ID 43) can still read — new field has default.",info:"Schema v2 registered. Old consumers: KafkaAvroDeserializer reads ID 43, fetches v2 schema, falls back to default for new optional field. Zero downtime evolution."},
      ];
      var FNODES=[
        {id:"producer",label:"Producer",sub:"KafkaAvroSerializer",type:"producer"},
        {id:"registry",label:"Schema Registry",sub:"REST service",type:"registry"},
        {id:"kafka",label:"Kafka",sub:"binary record",type:"kafka"},
        {id:"consumer",label:"Consumer",sub:"KafkaAvroDeserializer",type:"consumer"},
      ];
      var fStep=0,fTimer=null;
      function renderFlow(){
        var s=FSTEPS[fStep];
        mount.querySelector('#sr-flow-nodes').innerHTML=FNODES.map(function(n,i){
          return '<div class="sr-block '+n.type+(s.active===n.id?' active':'')+'">'+n.label+'<div style="font-size:10px;opacity:.7;font-weight:400">'+n.sub+'</div></div>'+(i<FNODES.length-1?'<div class="sr-arrow">→</div>':'');
        }).join('');
        mount.querySelector('#sr-flow-detail').innerHTML=s.detail;
        mount.querySelector('#sr-finfo').innerHTML=s.info;
        mount.querySelector('#sr-fstep').textContent='Step '+(fStep+1)+'/'+FSTEPS.length;
      }
      function fStop(){clearInterval(fTimer);fTimer=null;mount.querySelector('#sr-fplay').textContent='▶ Play';}
      mount.querySelector('#sr-fplay').addEventListener('click',function(){if(fTimer){fStop();}else{fTimer=setInterval(function(){fStep=Math.min(fStep+1,FSTEPS.length-1);renderFlow();if(fStep===FSTEPS.length-1)fStop();},1800);mount.querySelector('#sr-fplay').textContent='⏸ Pause';}});
      mount.querySelector('#sr-fnext').addEventListener('click',function(){fStop();fStep=Math.min(fStep+1,FSTEPS.length-1);renderFlow();});
      mount.querySelector('#sr-fprev').addEventListener('click',function(){fStop();fStep=Math.max(fStep-1,0);renderFlow();});
      mount.querySelector('#sr-freset').addEventListener('click',function(){fStop();fStep=0;renderFlow();});
      renderFlow();

      // COMPATIBILITY
      var compatMode='backward';
      var COMPAT_DATA={
        backward:{
          label:"BACKWARD (default)",color:"#3dd68c",
          desc:"New schema can read data written with OLD schema. Old consumers can read new producer output. Add optional fields with defaults.",
          allowed:["Add optional field with default value","Remove optional field (readers ignore unknown fields)","Widen numeric type (int→long)"],
          forbidden:["Add required field without default","Remove required field","Rename field (use alias)","Change field type incompatibly"],
          deploy:"Deploy consumers FIRST (can read old + new schema), then deploy producers with new schema."
        },
        forward:{
          label:"FORWARD",color:"#58a6ff",
          desc:"Old schema can read data written with NEW schema. New producers can write fields that old consumers won't read.",
          allowed:["Remove optional field","Add optional field (old readers ignore it)","Narrow numeric type (long→int with care)"],
          forbidden:["Add required field without default","Remove required field","Incompatible type change"],
          deploy:"Deploy producers FIRST (write new schema), then deploy consumers."
        },
        full:{
          label:"FULL",color:"#d2a8ff",
          desc:"Both BACKWARD and FORWARD. New + old schemas are mutually readable. Most restrictive — only add/remove optional fields with defaults.",
          allowed:["Add optional field with default","Remove optional field (must have had default)"],
          forbidden:["Anything that breaks either direction","Required field changes","Type changes"],
          deploy:"Deploy in any order — all versions mutually compatible."
        },
        none:{
          label:"NONE",color:"#f47067",
          desc:"No compatibility checking. Any schema accepted. Useful during development. DANGEROUS in production.",
          allowed:["Any change — rename, retype, add required"],
          forbidden:["Nothing blocked"],
          deploy:"No deployment guidance — compatibility your problem."
        }
      };
      function renderCompat(){
        var s=COMPAT_DATA[compatMode];
        mount.querySelector('#sr-compat-content').innerHTML='<div class="sr-box" style="border-color:'+s.color+'44">'+
          '<div style="font-size:13px;font-weight:700;color:'+s.color+';margin-bottom:6px">'+s.label+'</div>'+
          '<div style="font-size:12px;color:#8b949e;margin-bottom:10px;line-height:1.5">'+s.desc+'</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'+
          '<div><div style="font-size:11px;font-weight:600;color:#3dd68c;margin-bottom:4px">✓ Allowed</div>'+s.allowed.map(function(a){return '<div style="font-size:11px;color:#3dd68c;margin-bottom:2px">• '+a+'</div>';}).join('')+'</div>'+
          '<div><div style="font-size:11px;font-weight:600;color:#f47067;margin-bottom:4px">✗ Rejected by Registry</div>'+s.forbidden.map(function(f){return '<div style="font-size:11px;color:#f47067;margin-bottom:2px">• '+f+'</div>';}).join('')+'</div></div>'+
          '<div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px;color:#f5b944">📦 Deploy strategy: '+s.deploy+'</div></div>';
      }
      mount.querySelectorAll('.sr-stab[data-compat]').forEach(function(b){
        b.addEventListener('click',function(){mount.querySelectorAll('.sr-stab[data-compat]').forEach(function(x){x.classList.remove('on');});b.classList.add('on');compatMode=b.dataset.compat;renderCompat();});
      });
      renderCompat();

      // TABS
      mount.querySelectorAll('.srbtn[data-tab]').forEach(function(btn){
        btn.addEventListener('click',function(){
          mount.querySelectorAll('.srbtn[data-tab]').forEach(function(b){b.classList.remove('on');});
          mount.querySelectorAll('.srp').forEach(function(p){p.classList.remove('on');});
          btn.classList.add('on');
          mount.querySelector('#sr-'+btn.dataset.tab).classList.add('on');
        });
      });
      mount.querySelectorAll('.sr-q-card').forEach(function(c){c.addEventListener('click',function(){c.classList.toggle('open');});});
    },
    concept: `**L1 (30s ELI5):** Schema Registry = central contract for message shapes. Producers say "my data looks like this" (schema). Consumers use same schema to decode. Evolve schema without breaking consumers.

**L2 (2min core):** Producer serializer registers schema → gets integer ID. Sends [magic byte][4-byte ID][binary payload]. Consumer deserializer reads ID → fetches schema from registry (cached) → deserializes. Compatibility modes (BACKWARD/FORWARD/FULL) control what schema changes are allowed.

**L3 (10min edge cases):** Subject naming strategies: TopicNameStrategy (default, one schema per topic), RecordNameStrategy (by type), TopicRecordNameStrategy (topic + type). Avro optional fields: ["null","type"] union, null must be first for default=null. Registry HA: multiple instances, _schemas compacted topic as source of truth.

**L4 (30min deep):** Registry REST API: POST /subjects/{subject}/versions → returns schema ID. GET /schemas/ids/{id} → returns schema. Compatibility check: new schema compared against latest version (or all versions for BACKWARD_TRANSITIVE). Schema IDs are global, content-addressed (hash). Caching: SchemaRegistryClient caches ID↔schema in memory. TTL configurable. Subject aliases for topic renames.`,
    why: "Without Schema Registry: JSON breaks when field names change. Avro without registry: schema must be embedded in every record (huge overhead). Registry: 5-byte overhead, central governance, evolutionary schema, type safety across polyglot producers/consumers.",
    example: {
      language: "java",
      code: `// Producer with Avro + Schema Registry
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "broker:9092");
props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
props.put("schema.registry.url", "http://schema-registry:8081");

// Schema auto-registered on first use
KafkaProducer<String, Order> producer = new KafkaProducer<>(props);
Order order = Order.newBuilder()
    .setId(123L).setUserId("user-1").setAmount(99.99).build();
producer.send(new ProducerRecord<>("orders", "user-1", order));

// Consumer
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class);
props.put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, true);
KafkaConsumer<String, Order> consumer = new KafkaConsumer<>(props);
consumer.subscribe(List.of("orders"));

// Check/set compatibility via REST
// curl -X PUT http://schema-registry:8081/config/orders-value \\
//   -H "Content-Type: application/json" \\
//   -d '{"compatibility": "FULL"}'

// Register schema via REST
// curl -X POST http://schema-registry:8081/subjects/orders-value/versions \\
//   -H "Content-Type: application/vnd.schemaregistry.v1+json" \\
//   -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",...}"}'`
    },
    gotchas: [
      "BACKWARD compatibility (default) means old consumers can read NEW data — deploy consumers before producers",
      "Avro optional field union must put 'null' first: [\"null\",\"string\"] not [\"string\",\"null\"] for default=null",
      "Renaming an Avro field is BREAKING — use field aliases ('aliases':['oldName']) for backward compat during migration",
      "Schema Registry is a single point of failure — run multiple instances backed by Kafka _schemas topic",
      "Producer caches schema ID locally — Registry downtime doesn't immediately break production if schemas already cached",
      "TopicNameStrategy: all producers to same topic must use same schema. Use RecordNameStrategy for union topics",
      "Schema deletion is soft-delete by default — hard-delete requires 'permanent=true' param"
    ],
    interview: [
      { q: "Why Schema Registry over plain JSON?", a: "Schema enforcement (invalid records rejected), schema evolution control (compatibility modes), compact binary (Avro 5-10x smaller than JSON), consumer decoupling (schema fetched by ID, not embedded). JSON breaks silently; Avro fails loudly at schema registration." },
      { q: "BACKWARD vs FORWARD compatibility?", a: "BACKWARD: new schema reads old data → add optional field with default. Deploy consumers first. FORWARD: old schema reads new data → remove optional field. Deploy producers first. FULL: both → only add/remove optional with defaults. Deploy any order." },
      { q: "Schema Registry goes down — what breaks?", a: "New schema registrations fail. Producers with cached IDs keep working. Consumers with cached schema IDs keep deserializing. Only fails when encountering NEW schema ID not in local cache. Need HA (multiple Registry instances, same _schemas Kafka topic)." },
      { q: "How to safely rename an Avro field?", a: "1. Add alias to old name: {'name':'newName','aliases':['oldName']}. 2. Deploy new schema (backward compat via alias). 3. Old consumers map 'oldName' field to 'newName'. 4. After all consumers updated, remove alias. Alternatively: add new field, deprecate old, remove old in future version." }
    ],
    tradeoffs: "Avro: smallest, best Kafka integration, dynamic. Protobuf: strongest typing, best multi-language. JSON Schema: readable, debuggable, largest. Registry adds operational complexity but pays off at scale with multiple teams/services sharing topics."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
