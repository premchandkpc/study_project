(function () {
  var topic = {
    id: "warpstream-arch",
    area: "kafka",
    title: "WarpStream Architecture",
    tag: "Cloud-Native",
    tags: ["warpstream", "s3", "byoc", "serverless", "stateless"],
    concept: `
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#38bdf8;margin-bottom:6px">WarpStream Architecture</h2>
  <p style="color:#768390;margin-bottom:18px">Kafka-compatible streaming built on <b style="color:#38bdf8">object storage (S3)</b>. No local disks, no ZooKeeper, no replication overhead. Stateless agents + S3 = infinite scale, zero ops.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #38bdf8;border-radius:8px;padding:14px">
      <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:8px">Stateless Agents</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        No local disk. All state in S3.<br>
        Agents are ephemeral containers.<br>
        Scale horizontally, kill/restart freely.<br>
        No leader election needed per broker.
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#f0883e;font-size:13px;font-weight:bold;margin-bottom:8px">S3 as WAL</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Messages buffered in agent memory.<br>
        Flushed to S3 every ~250ms.<br>
        No replication between brokers.<br>
        S3 is the single source of truth.
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#3fb950;font-size:13px;font-weight:bold;margin-bottom:8px">BYOC Model</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Bring Your Own Cloud.<br>
        Agents run in <b>your</b> VPC/account.<br>
        Data never leaves your cloud.<br>
        WarpStream control plane = metadata only.
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">Architecture at a glance</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0">
┌─────────────────────────────────────────────────────────────┐
│                    Your Cloud (BYOC)                         │
│                                                              │
│  Producers ──→  WarpStream Agent (stateless, K8s pod)       │
│                 │                                            │
│                 │ buffer ~250ms                              │
│                 ↓                                            │
│              S3 / GCS / ABS  ←──── Source of Truth          │
│                 ↑                                            │
│                 │ read (fetch)                               │
│  Consumers ←── WarpStream Agent (any agent, stateless)      │
│                                                              │
│  Metadata coordination ────→ WarpStream Control Plane (SaaS) │
│  (partition assignments, offsets, schema)                    │
└─────────────────────────────────────────────────────────────┘</pre>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">Connect — Kafka-compatible</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0">// WarpStream is wire-compatible with Kafka 3.x client protocol
// Minimal config change to point Kafka clients at WarpStream

Properties props = new Properties();
props.put("bootstrap.servers", "serverless.warpstream.com:9092");
// Everything else identical to Kafka client config

// Existing Kafka Connect connectors work unchanged
// Schema Registry API compatible
// Consumer group protocol identical</pre>
  </div>
</div>`,

    visual: function (mount) {
      mount.innerHTML = `
<style>
.ws-wrap{font-family:monospace;background:#0d1117;color:#cdd9e5;padding:20px;border-radius:10px;min-height:500px}
.ws-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.ws-tab{padding:8px 16px;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#768390;cursor:pointer;font-size:12px;transition:all .2s}
.ws-tab.on{background:#38bdf8;color:#0d1117;border-color:#38bdf8;font-weight:bold}
.ws-panel{display:none}.ws-panel.on{display:block}
.ws-controls{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.ws-btn{padding:6px 14px;border-radius:5px;border:1px solid #30363d;background:#161b22;color:#cdd9e5;cursor:pointer;font-size:12px;transition:all .2s}
.ws-btn:hover{border-color:#38bdf8;color:#38bdf8}
.ws-btn.active{background:#38bdf8;color:#0d1117;border-color:#38bdf8}
.ws-stage{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:18px;min-height:300px}
.ws-info{background:#0d1117;border:1px solid #38bdf8;border-radius:6px;padding:12px;margin-top:12px;font-size:12px;color:#cdd9e5;min-height:44px}
.ws-node{border-radius:8px;padding:10px 16px;font-size:12px;font-weight:bold;text-align:center;border:2px solid;transition:all .4s;cursor:pointer}
.ws-arrow{color:#768390;text-align:center;margin:4px 0;transition:color .4s;font-size:16px}
.ws-arrow.lit{color:#38bdf8;animation:ws-pulse .8s infinite alternate}
@keyframes ws-pulse{from{opacity:1}to{opacity:0.4}}
.ws-tooltip{position:fixed;background:#161b22;border:1px solid #38bdf8;border-radius:6px;padding:10px 14px;font-size:11px;color:#cdd9e5;z-index:999;pointer-events:none;max-width:300px;display:none;line-height:1.6}
.ws-packet{display:inline-block;padding:3px 10px;border-radius:12px;font-size:10px;font-weight:bold;margin:2px}
</style>
<div class="ws-wrap" id="ws-root">
  <div class="ws-tooltip" id="ws-tip"></div>
  <div class="ws-tabs">
    <div class="ws-tab on" data-tab="ws-write">Write Path</div>
    <div class="ws-tab" data-tab="ws-read">Read Path</div>
    <div class="ws-tab" data-tab="ws-byoc">BYOC Model</div>
    <div class="ws-tab" data-tab="ws-scaling">Scaling</div>
    <div class="ws-tab" data-tab="ws-interview">Tricks+Interview</div>
  </div>

  <!-- TAB 1: Write Path -->
  <div class="ws-panel on" id="ws-write">
    <div class="ws-controls">
      <button class="ws-btn active" id="ws-w-play">▶ Play</button>
      <button class="ws-btn" id="ws-w-prev">⏮ Prev</button>
      <button class="ws-btn" id="ws-w-next">⏭ Next</button>
      <button class="ws-btn" id="ws-w-reset">↺ Reset</button>
    </div>
    <div class="ws-stage">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0">
        <div class="ws-node" id="ws-w-prod" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:140px">Producer<br><span style="font-size:10px;color:#768390">Kafka client API</span></div>
        <div class="ws-arrow" id="ws-wa0">↓ produce(topic, msg)</div>
        <div class="ws-node" id="ws-w-agent" style="border-color:#38bdf8;color:#38bdf8;background:#0d1117;width:200px">
          WarpStream Agent<br><span style="font-size:10px;color:#768390">stateless · in-memory buffer</span>
        </div>
        <div style="display:flex;gap:20px;align-items:center">
          <div class="ws-arrow" id="ws-wa1" style="transform:rotate(15deg)">↙ flush ~250ms</div>
          <div id="ws-w-buffer" style="background:#0d1117;border:1px dashed #38bdf8;border-radius:6px;padding:8px;min-width:100px;min-height:40px;font-size:10px;text-align:center;color:#38bdf8">buffer<br><span id="ws-buf-count">0 msgs</span></div>
        </div>
        <div class="ws-node" id="ws-w-s3" style="border-color:#f0883e;color:#f0883e;background:#0d1117;width:200px">
          S3 / Object Storage<br><span style="font-size:10px;color:#768390">Source of Truth · WAL</span>
        </div>
        <div class="ws-arrow" id="ws-wa2">↓ metadata update</div>
        <div class="ws-node" id="ws-w-ctrl" style="border-color:#a371f7;color:#a371f7;background:#0d1117;width:200px">
          Control Plane (SaaS)<br><span style="font-size:10px;color:#768390">partition map · offset commit</span>
        </div>
      </div>
      <div id="ws-w-packets" style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px;min-height:28px"></div>
    </div>
    <div class="ws-info" id="ws-write-info">Press Play — watch messages flow from producer through stateless agent into S3.</div>
  </div>

  <!-- TAB 2: Read Path -->
  <div class="ws-panel" id="ws-read">
    <div class="ws-controls">
      <button class="ws-btn active" id="ws-r-play">▶ Play</button>
      <button class="ws-btn" id="ws-r-prev">⏮ Prev</button>
      <button class="ws-btn" id="ws-r-next">⏭ Next</button>
      <button class="ws-btn" id="ws-r-reset">↺ Reset</button>
    </div>
    <div class="ws-stage">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px 0">
        <div class="ws-node" id="ws-r-cons" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:140px">Consumer<br><span style="font-size:10px;color:#768390">Kafka client API</span></div>
        <div class="ws-arrow" id="ws-ra0">↕ fetch(topic, offset)</div>
        <div class="ws-node" id="ws-r-agent" style="border-color:#38bdf8;color:#38bdf8;background:#0d1117;width:200px">
          WarpStream Agent<br><span style="font-size:10px;color:#768390">any agent · stateless</span>
        </div>
        <div class="ws-arrow" id="ws-ra1">↕ range GET object</div>
        <div class="ws-node" id="ws-r-s3" style="border-color:#f0883e;color:#f0883e;background:#0d1117;width:200px">
          S3 / Object Storage<br><span style="font-size:10px;color:#768390">byte range read · cached</span>
        </div>
        <div class="ws-arrow" id="ws-ra2">↕ offset lookup</div>
        <div class="ws-node" id="ws-r-ctrl" style="border-color:#a371f7;color:#a371f7;background:#0d1117;width:200px">
          Control Plane<br><span style="font-size:10px;color:#768390">consumer group · offset commit</span>
        </div>
      </div>
      <div style="margin-top:14px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px">
        <div style="color:#768390;font-size:11px;margin-bottom:6px">Key insight: ANY agent can serve reads (no sticky routing)</div>
        <div id="ws-r-agents" style="display:flex;gap:10px;flex-wrap:wrap">
          <div class="ws-packet" id="ws-r-a1" style="background:#38bdf8;color:#0d1117">Agent-1</div>
          <div class="ws-packet" id="ws-r-a2" style="background:#161b22;color:#768390;border:1px solid #30363d">Agent-2</div>
          <div class="ws-packet" id="ws-r-a3" style="background:#161b22;color:#768390;border:1px solid #30363d">Agent-3</div>
        </div>
      </div>
    </div>
    <div class="ws-info" id="ws-read-info">Consumer fetches from any agent. Agent reads S3 range. No sticky connection to specific broker needed.</div>
  </div>

  <!-- TAB 3: BYOC Model -->
  <div class="ws-panel" id="ws-byoc">
    <div class="ws-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="background:#0d1117;border:2px solid #3fb950;border-radius:8px;padding:14px">
          <div style="color:#3fb950;font-size:13px;font-weight:bold;margin-bottom:10px">Your Cloud (BYOC)</div>
          <div style="color:#cdd9e5;font-size:11px;line-height:1.8">
            • WarpStream Agents (K8s pods)<br>
            • Your S3 bucket / GCS / ABS<br>
            • Your VPC — data never exits<br>
            • Your IAM roles / service accounts<br>
            • Producers & Consumers in same VPC<br>
            • Low-latency (no internet hop)
          </div>
          <div style="margin-top:10px;background:#161b22;border-radius:6px;padding:8px;font-size:10px;color:#768390">
            Data path: Producer → Agent → S3 (all in your account)
          </div>
        </div>
        <div style="background:#0d1117;border:2px solid #a371f7;border-radius:8px;padding:14px">
          <div style="color:#a371f7;font-size:13px;font-weight:bold;margin-bottom:10px">WarpStream SaaS (control plane)</div>
          <div style="color:#cdd9e5;font-size:11px;line-height:1.8">
            • Partition metadata only<br>
            • Consumer group tracking<br>
            • Schema registry API<br>
            • Agent discovery / health<br>
            • NO access to message content<br>
            • Compliance-friendly (PII stays put)
          </div>
          <div style="margin-top:10px;background:#161b22;border-radius:6px;padding:8px;font-size:10px;color:#768390">
            Control path: metadata requests only (tiny traffic)
          </div>
        </div>
      </div>
      <div style="margin-top:16px;background:#161b22;border:1px solid #38bdf8;border-radius:8px;padding:14px">
        <div style="color:#38bdf8;font-size:12px;font-weight:bold;margin-bottom:8px">BYOC cost model</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="color:#3fb950;margin-bottom:4px">You pay:</div>
            <div style="color:#768390;line-height:1.6">• S3 storage + requests<br>• EC2/GKE for agents<br>• Egress if cross-region</div>
          </div>
          <div>
            <div style="color:#a371f7;margin-bottom:4px">WarpStream charges:</div>
            <div style="color:#768390;line-height:1.6">• Flat per-byte ingested<br>• No per-partition pricing<br>• No broker count billing</div>
          </div>
          <div>
            <div style="color:#f0883e;margin-bottom:4px">vs Confluent Cloud:</div>
            <div style="color:#768390;line-height:1.6">• ~80% cheaper claimed<br>• No partition tax<br>• No CKU/infrastructure charge</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ws-info" style="border-color:#3fb950">BYOC: data stays in your cloud, control metadata only goes to WarpStream SaaS. Compliance + cost control.</div>
  </div>

  <!-- TAB 4: Scaling -->
  <div class="ws-panel" id="ws-scaling">
    <div class="ws-controls">
      <button class="ws-btn active" id="ws-s-play">▶ Simulate Load Spike</button>
      <button class="ws-btn" id="ws-s-reset">↺ Reset</button>
    </div>
    <div class="ws-stage" id="ws-scaling-stage">
      <div style="margin-bottom:14px">
        <div style="color:#38bdf8;font-size:12px;font-weight:bold;margin-bottom:8px">Agent count (auto-scale)</div>
        <div id="ws-agent-grid" style="display:flex;flex-wrap:wrap;gap:8px;min-height:80px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px">
          <div style="color:#38bdf8;font-size:11px;font-weight:bold">Throughput</div>
          <div id="ws-tput-bar" style="background:#30363d;border-radius:4px;height:16px;margin-top:4px;overflow:hidden">
            <div id="ws-tput-fill" style="width:10%;height:100%;background:#38bdf8;transition:width 1s"></div>
          </div>
          <div id="ws-tput-label" style="color:#768390;font-size:10px;margin-top:2px">50K msg/s</div>
        </div>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px">
          <div style="color:#f0883e;font-size:11px;font-weight:bold">S3 write rate</div>
          <div id="ws-s3-bar" style="background:#30363d;border-radius:4px;height:16px;margin-top:4px;overflow:hidden">
            <div id="ws-s3-fill" style="width:5%;height:100%;background:#f0883e;transition:width 1s"></div>
          </div>
          <div id="ws-s3-label" style="color:#768390;font-size:10px;margin-top:2px">~20 objects/s</div>
        </div>
      </div>
      <div style="margin-top:14px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px">
        <div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:8px">Scaling properties vs Kafka</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:11px">
          <div>
            <div style="color:#38bdf8;margin-bottom:6px">WarpStream scale-out:</div>
            <div style="color:#cdd9e5;line-height:1.7">• Add pod → instant capacity<br>• No partition rebalance<br>• No data movement<br>• No leader re-election<br>• Scale-in: just kill pods</div>
          </div>
          <div>
            <div style="color:#e8741a;margin-bottom:6px">Kafka scale-out:</div>
            <div style="color:#cdd9e5;line-height:1.7">• Add broker → reassign partitions<br>• Reassign takes hours (data copy)<br>• Leader election required<br>• kafka-reassign-partitions tool<br>• Cruise Control for automation</div>
          </div>
        </div>
      </div>
    </div>
    <div class="ws-info" id="ws-scaling-info">WarpStream: add stateless agents in seconds. No data movement. Kafka: add brokers requires partition reassignment (slow, disk-heavy).</div>
  </div>

  <!-- TAB 5: Interview -->
  <div class="ws-panel" id="ws-interview">
    <div class="ws-stage" style="overflow:auto">
      <div id="ws-qa-list"></div>
      <div style="margin-top:16px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
        <div style="color:#da3633;font-size:12px;font-weight:bold;margin-bottom:8px">Limitations / Gotchas</div>
        <div id="ws-gotcha-list"></div>
      </div>
    </div>
  </div>
</div>`;

      var tip = document.getElementById('ws-tip');
      function showTip(el, html) {
        if (!el) return;
        el.addEventListener('mouseenter', function () { tip.innerHTML = html; tip.style.display = 'block'; });
        el.addEventListener('mousemove', function (e) { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; });
        el.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
      }

      // Tab switch
      document.querySelectorAll('#ws-root .ws-tab').forEach(function (t) {
        t.addEventListener('click', function () {
          document.querySelectorAll('#ws-root .ws-tab').forEach(function (x) { x.classList.remove('on'); });
          document.querySelectorAll('#ws-root .ws-panel').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          document.getElementById(t.dataset.tab).classList.add('on');
        });
      });

      // --- TAB 1: Write Path animation ---
      var writeSteps = [
        { prod: '#3fb950', a0: false, agent: '#38bdf8', buf: 0, a1: false, s3: '#30363d', a2: false, ctrl: '#30363d', info: 'Step 1 — Producer sends message via standard Kafka API. WarpStream is wire-compatible.' },
        { prod: '#3fb950', a0: true, agent: '#38bdf8', buf: 1, a1: false, s3: '#30363d', a2: false, ctrl: '#30363d', info: 'Step 2 — Agent receives message, holds in memory buffer. Very fast — no disk I/O.' },
        { prod: '#3fb950', a0: true, agent: '#38bdf8', buf: 5, a1: false, s3: '#30363d', a2: false, ctrl: '#30363d', info: 'Step 3 — Buffer grows. Agent accumulates ~250ms of messages before flushing. Batching = efficiency.' },
        { prod: '#3fb950', a0: true, agent: '#38bdf8', buf: 0, a1: true, s3: '#f0883e', a2: false, ctrl: '#30363d', info: 'Step 4 — Flush! Agent writes buffered batch to S3 as single object. Atomic PUT. Now durable.' },
        { prod: '#3fb950', a0: true, agent: '#38bdf8', buf: 0, a1: true, s3: '#f0883e', a2: true, ctrl: '#a371f7', info: 'Step 5 — Agent notifies Control Plane of new object location + offset range. Consumer discovery enabled.' }
      ];
      var wStep = 0, wTimer = null, wPlaying = false;

      function renderWrite() {
        var s = writeSteps[wStep];
        document.getElementById('ws-w-prod').style.borderColor = s.prod;
        document.getElementById('ws-w-prod').style.color = s.prod;
        document.getElementById('ws-wa0').classList.toggle('lit', s.a0);
        document.getElementById('ws-w-agent').style.borderColor = s.agent;
        document.getElementById('ws-w-agent').style.color = s.agent;
        document.getElementById('ws-buf-count').textContent = s.buf + ' msgs';
        document.getElementById('ws-w-buffer').style.borderColor = s.buf > 0 ? '#38bdf8' : '#30363d';
        document.getElementById('ws-wa1').classList.toggle('lit', s.a1);
        document.getElementById('ws-w-s3').style.borderColor = s.s3;
        document.getElementById('ws-w-s3').style.color = s.s3;
        document.getElementById('ws-wa2').classList.toggle('lit', s.a2);
        document.getElementById('ws-w-ctrl').style.borderColor = s.ctrl;
        document.getElementById('ws-w-ctrl').style.color = s.ctrl;
        // Add packet visualization
        if (s.a0) {
          document.getElementById('ws-w-packets').innerHTML = '<span class="ws-packet" style="background:#38bdf8;color:#0d1117">msg_' + (wStep * 3) + '</span>' +
            (s.buf > 1 ? '<span class="ws-packet" style="background:#38bdf8;color:#0d1117">msg_' + (wStep * 3 + 1) + '</span>' : '') +
            (s.buf > 3 ? '<span class="ws-packet" style="background:#38bdf8;color:#0d1117">msg_' + (wStep * 3 + 2) + '</span>' : '');
        } else {
          document.getElementById('ws-w-packets').innerHTML = '';
        }
        document.getElementById('ws-write-info').textContent = s.info;
      }

      document.getElementById('ws-w-play').addEventListener('click', function () {
        wPlaying = !wPlaying;
        this.textContent = wPlaying ? '⏸ Pause' : '▶ Play';
        if (wPlaying) { wTimer = setInterval(function () { wStep = (wStep + 1) % writeSteps.length; renderWrite(); }, 1500); }
        else clearInterval(wTimer);
      });
      document.getElementById('ws-w-next').addEventListener('click', function () { wStep = Math.min(wStep + 1, writeSteps.length - 1); renderWrite(); });
      document.getElementById('ws-w-prev').addEventListener('click', function () { wStep = Math.max(wStep - 1, 0); renderWrite(); });
      document.getElementById('ws-w-reset').addEventListener('click', function () {
        clearInterval(wTimer); wPlaying = false;
        document.getElementById('ws-w-play').textContent = '▶ Play';
        wStep = 0; renderWrite();
      });

      showTip(document.getElementById('ws-w-agent'), '<b>WarpStream Agent</b><br>Stateless Kafka-protocol server.<br>Buffers messages in RAM ~250ms.<br>Flushes to S3 as single PUT.<br>Can crash and restart — S3 has all data.');
      showTip(document.getElementById('ws-w-s3'), '<b>S3 / Object Storage</b><br>Source of truth. All messages here.<br>Objects: ~1-4MB batches.<br>Retention: S3 lifecycle rules.<br>Cost: ~$0.023/GB/month (AWS S3)');
      renderWrite();

      // --- TAB 2: Read Path animation ---
      var readSteps = [
        { cons: '#768390', ra0: false, agent: '#30363d', ra1: false, s3: '#30363d', ra2: false, ctrl: '#30363d', activeAgent: -1, info: 'Consumer idle. No fetch in progress.' },
        { cons: '#58a6ff', ra0: true, agent: '#38bdf8', ra1: false, s3: '#30363d', ra2: true, ctrl: '#a371f7', activeAgent: 0, info: 'Consumer fetches from any Agent. Agent checks Control Plane: which S3 object holds offset 42?' },
        { cons: '#58a6ff', ra0: true, agent: '#38bdf8', ra1: true, s3: '#f0883e', ra2: false, ctrl: '#30363d', activeAgent: 0, info: 'Agent issues S3 range GET for the specific object + byte offset. Efficient — no full object download.' },
        { cons: '#3fb950', ra0: false, agent: '#38bdf8', ra1: false, s3: '#30363d', ra2: true, ctrl: '#a371f7', activeAgent: 1, info: 'Agent returns messages. Consumer commits offset to Control Plane. Complete! Next fetch → any agent.' }
      ];
      var rStep = 0, rTimer = null, rPlaying = false;

      function renderRead() {
        var s = readSteps[rStep];
        document.getElementById('ws-r-cons').style.borderColor = s.cons;
        document.getElementById('ws-r-cons').style.color = s.cons;
        document.getElementById('ws-ra0').classList.toggle('lit', s.ra0);
        document.getElementById('ws-r-agent').style.borderColor = s.agent;
        document.getElementById('ws-r-agent').style.color = s.agent;
        document.getElementById('ws-ra1').classList.toggle('lit', s.ra1);
        document.getElementById('ws-r-s3').style.borderColor = s.s3;
        document.getElementById('ws-r-s3').style.color = s.s3;
        document.getElementById('ws-ra2').classList.toggle('lit', s.ra2);
        document.getElementById('ws-r-ctrl').style.borderColor = s.ctrl;
        document.getElementById('ws-r-ctrl').style.color = s.ctrl;
        ['ws-r-a1', 'ws-r-a2', 'ws-r-a3'].forEach(function (id, i) {
          var el = document.getElementById(id);
          el.style.background = s.activeAgent === i ? '#38bdf8' : '#161b22';
          el.style.color = s.activeAgent === i ? '#0d1117' : '#768390';
        });
        document.getElementById('ws-read-info').textContent = s.info;
      }

      document.getElementById('ws-r-play').addEventListener('click', function () {
        rPlaying = !rPlaying;
        this.textContent = rPlaying ? '⏸ Pause' : '▶ Play';
        if (rPlaying) { rTimer = setInterval(function () { rStep = (rStep + 1) % readSteps.length; renderRead(); }, 1500); }
        else clearInterval(rTimer);
      });
      document.getElementById('ws-r-next').addEventListener('click', function () { rStep = Math.min(rStep + 1, readSteps.length - 1); renderRead(); });
      document.getElementById('ws-r-prev').addEventListener('click', function () { rStep = Math.max(rStep - 1, 0); renderRead(); });
      document.getElementById('ws-r-reset').addEventListener('click', function () {
        clearInterval(rTimer); rPlaying = false;
        document.getElementById('ws-r-play').textContent = '▶ Play';
        rStep = 0; renderRead();
      });
      renderRead();

      // --- TAB 4: Scaling animation ---
      var agentCount = 2;
      function renderAgents() {
        var grid = document.getElementById('ws-agent-grid');
        grid.innerHTML = '';
        for (var i = 0; i < agentCount; i++) {
          var el = document.createElement('div');
          el.className = 'ws-node';
          el.style.cssText = 'border-color:#38bdf8;color:#38bdf8;background:#0d1117;width:80px;font-size:10px;padding:6px 8px';
          el.textContent = 'Agent-' + (i + 1);
          grid.appendChild(el);
        }
        var tput = Math.min(100, agentCount * 15);
        var s3rate = Math.min(100, agentCount * 8);
        document.getElementById('ws-tput-fill').style.width = tput + '%';
        document.getElementById('ws-s3-fill').style.width = s3rate + '%';
        document.getElementById('ws-tput-label').textContent = (agentCount * 150) + 'K msg/s';
        document.getElementById('ws-s3-label').textContent = '~' + (agentCount * 20) + ' objects/s';
        document.getElementById('ws-scaling-info').textContent = agentCount + ' agents running. ' + (agentCount * 150) + 'K msg/s throughput. Scale-out: just add pods — no partition rebalance needed.';
      }

      var sTimer = null, sPlaying = false;
      document.getElementById('ws-s-play').addEventListener('click', function () {
        sPlaying = !sPlaying;
        this.textContent = sPlaying ? '⏸ Stop' : '▶ Simulate Load Spike';
        if (sPlaying) {
          sTimer = setInterval(function () {
            agentCount = Math.min(agentCount + 1, 8);
            renderAgents();
            if (agentCount >= 8) { clearInterval(sTimer); sPlaying = false; document.getElementById('ws-s-play').textContent = '▶ Simulate Load Spike'; }
          }, 900);
        } else clearInterval(sTimer);
      });
      document.getElementById('ws-s-reset').addEventListener('click', function () {
        clearInterval(sTimer); sPlaying = false; agentCount = 2;
        document.getElementById('ws-s-play').textContent = '▶ Simulate Load Spike';
        renderAgents();
      });
      renderAgents();

      // --- TAB 5: Interview ---
      var qas = [
        { q: 'How does WarpStream achieve Kafka compatibility?', a: 'WarpStream implements the Kafka binary protocol (Produce/Fetch/Metadata/etc.). Existing Kafka clients connect unchanged — just point bootstrap.servers to WarpStream. Schema Registry API also compatible.' },
        { q: 'What is the latency trade-off vs Kafka?', a: 'WarpStream has higher latency (~250ms flush to S3 + S3 GET latency). Kafka with acks=1 achieves ~5ms. WarpStream is not suitable for ultra-low-latency use cases. Best for analytics/logging where 500ms-1s is OK.' },
        { q: 'How does BYOC protect data privacy?', a: 'Agents run in your VPC. Data written to your S3 bucket. WarpStream control plane only receives metadata (offsets, partition maps). Message content never leaves your account — HIPAA/PCI-friendly.' },
        { q: 'What happens if an agent crashes?', a: 'Buffer lost if not flushed. Data already in S3 is safe. Consumer simply reconnects to another agent. Control plane tracks which S3 objects are committed. Recovery is instant — add pod, no rebalance.' }
      ];
      document.getElementById('ws-qa-list').innerHTML = qas.map(function (qa, i) {
        return '<div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer" onclick="this.querySelector(\'.ws-ans\').style.display=this.querySelector(\'.ws-ans\').style.display===\'none\'?\'block\':\'none\'">' +
          '<div style="color:#38bdf8;font-size:12px;font-weight:bold">Q' + (i + 1) + ': ' + qa.q + '</div>' +
          '<div class="ws-ans" style="display:none;color:#cdd9e5;font-size:12px;margin-top:8px;line-height:1.6">' + qa.a + '</div></div>';
      }).join('');

      var gotchas = [
        '⚠️ Latency: ~250ms+ vs Kafka ~5ms. Not for real-time trading, gaming tick data.',
        '⚠️ Buffer in RAM: agent crash before flush = message loss. Use producer retries + idempotency.',
        '⚠️ S3 costs add up at high egress rates (cross-AZ/cross-region reads billed by AWS).',
        '⚠️ Not open-source (yet). Vendor lock-in risk vs self-hosted Kafka.',
        '⚠️ Kafka Streams / ksqlDB not compatible — WarpStream is protocol-compatible, not ecosystem-compatible.'
      ];
      document.getElementById('ws-gotcha-list').innerHTML = gotchas.map(function (g) {
        return '<div style="color:#cdd9e5;font-size:12px;padding:8px 0;border-bottom:1px solid #30363d;line-height:1.6">' + g + '</div>';
      }).join('');
    },

    gotchas: [
      "~250ms latency (S3 flush interval). Not for sub-100ms requirements.",
      "Agent crash before flush = buffer lost. Design for producer retries.",
      "Not open-source. Kafka Streams not compatible.",
      "S3 egress costs can surprise at scale."
    ],
    interview: [
      "How does WarpStream achieve Kafka wire compatibility?",
      "What's the latency trade-off vs Kafka?",
      "How does BYOC model protect data?",
      "Why is scaling cheaper/faster than Kafka?"
    ],
    tradeoffs: "WarpStream pros: infinite scale, zero ops, 80% cheaper (claimed), BYOC compliance. Cons: higher latency (~250ms+), agent buffer risk, not OSS, Kafka Streams incompatible."
  };

  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
