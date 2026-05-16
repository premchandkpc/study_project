(function () {
  var topic = {
    id: "warpstream-vs-kafka",
    area: "kafka",
    title: "WarpStream vs Kafka",
    tag: "Comparison",
    tags: ["warpstream", "kafka", "cost", "latency", "ops", "s3"],
    concept: `
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#38bdf8;margin-bottom:6px">WarpStream vs Apache Kafka</h2>
  <p style="color:#768390;margin-bottom:18px">Same protocol, radically different architecture. Kafka = stateful brokers + local disk. WarpStream = stateless agents + S3. Choose based on latency, cost, and ops maturity.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #e8741a;border-radius:8px;padding:16px">
      <div style="color:#e8741a;font-size:14px;font-weight:bold;margin-bottom:10px">Apache Kafka</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
        • Stateful brokers (local NVMe disks)<br>
        • ZooKeeper → KRaft (newer)<br>
        • Replication: broker-to-broker copy<br>
        • p99 latency: ~5ms (acks=1)<br>
        • Partition rebalance = slow (data move)<br>
        • Self-managed: significant ops expertise<br>
        • Confluent Cloud: expensive ($0.11+/GB)
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #38bdf8;border-radius:8px;padding:16px">
      <div style="color:#38bdf8;font-size:14px;font-weight:bold;margin-bottom:10px">WarpStream</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
        • Stateless agents (no local disk)<br>
        • S3 as WAL + storage<br>
        • No replication overhead<br>
        • p99 latency: ~250ms-1s (S3 flush)<br>
        • Scale: add/remove pods in seconds<br>
        • Managed ops, BYOC model<br>
        • Cost: S3 prices (~$0.023/GB)
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">When WarpStream wins vs when Kafka wins</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="color:#38bdf8;font-size:12px;font-weight:bold;margin-bottom:6px">WarpStream is better:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
          ✓ Analytics / logging (latency OK 500ms+)<br>
          ✓ Cost-sensitive (S3 &lt;&lt; broker disk)<br>
          ✓ Compliance (BYOC, data in your cloud)<br>
          ✓ Spiky workloads (scale pods instantly)<br>
          ✓ Small ops team (no Kafka expertise)
        </div>
      </div>
      <div>
        <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:6px">Kafka is better:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
          ✓ Ultra-low latency (&lt;10ms required)<br>
          ✓ Kafka Streams / ksqlDB (ecosystem)<br>
          ✓ Mature OSS ecosystem<br>
          ✓ High-frequency trading / gaming<br>
          ✓ Complex stream processing topologies
        </div>
      </div>
    </div>
  </div>
</div>`,

    visual: function (mount) {
      mount.innerHTML = `
<style>
.wk-wrap{font-family:monospace;background:#0d1117;color:#cdd9e5;padding:20px;border-radius:10px;min-height:500px}
.wk-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.wk-tab{padding:8px 16px;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#768390;cursor:pointer;font-size:12px;transition:all .2s}
.wk-tab.on{background:#38bdf8;color:#0d1117;border-color:#38bdf8;font-weight:bold}
.wk-panel{display:none}.wk-panel.on{display:block}
.wk-controls{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.wk-btn{padding:6px 14px;border-radius:5px;border:1px solid #30363d;background:#161b22;color:#cdd9e5;cursor:pointer;font-size:12px;transition:all .2s}
.wk-btn:hover{border-color:#38bdf8;color:#38bdf8}
.wk-btn.active{background:#38bdf8;color:#0d1117;border-color:#38bdf8}
.wk-stage{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:18px;min-height:300px}
.wk-info{background:#0d1117;border:1px solid #38bdf8;border-radius:6px;padding:12px;margin-top:12px;font-size:12px;color:#cdd9e5;min-height:44px}
.wk-node{border-radius:8px;padding:10px 14px;font-size:12px;font-weight:bold;text-align:center;border:2px solid;transition:all .4s;cursor:pointer}
.wk-tooltip{position:fixed;background:#161b22;border:1px solid #38bdf8;border-radius:6px;padding:10px 14px;font-size:11px;color:#cdd9e5;z-index:999;pointer-events:none;max-width:300px;display:none;line-height:1.6}
.wk-bar-wrap{background:#0d1117;border-radius:4px;height:20px;overflow:hidden;margin-top:4px}
.wk-bar{height:100%;border-radius:4px;transition:width 1.2s ease}
</style>
<div class="wk-wrap" id="wk-root">
  <div class="wk-tooltip" id="wk-tip"></div>
  <div class="wk-tabs">
    <div class="wk-tab on" data-tab="wk-arch">Architecture Side-by-Side</div>
    <div class="wk-tab" data-tab="wk-latency">Latency</div>
    <div class="wk-tab" data-tab="wk-cost">Cost Model</div>
    <div class="wk-tab" data-tab="wk-ops">Ops Complexity</div>
    <div class="wk-tab" data-tab="wk-interview">Tricks+Interview</div>
  </div>

  <!-- TAB 1: Architecture side by side -->
  <div class="wk-panel on" id="wk-arch">
    <div class="wk-controls">
      <button class="wk-btn active" id="wk-a-play">▶ Play</button>
      <button class="wk-btn" id="wk-a-prev">⏮ Prev</button>
      <button class="wk-btn" id="wk-a-next">⏭ Next</button>
      <button class="wk-btn" id="wk-a-reset">↺ Reset</button>
    </div>
    <div class="wk-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <!-- Kafka side -->
        <div>
          <div style="color:#e8741a;font-size:13px;font-weight:bold;margin-bottom:10px;text-align:center">Kafka (Stateful)</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div class="wk-node" id="wk-k-prod" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:120px">Producer</div>
            <div id="wk-ka0" style="color:#768390;transition:color .3s;text-align:center">↓</div>
            <div class="wk-node" id="wk-k-leader" style="border-color:#e8741a;color:#e8741a;background:#0d1117;width:160px">Leader Broker<br><span style="font-size:10px;color:#768390">NVMe disk · WAL</span></div>
            <div id="wk-ka1" style="color:#768390;transition:color .3s;text-align:center;font-size:11px">↓ replicate</div>
            <div style="display:flex;gap:8px">
              <div class="wk-node" id="wk-k-r1" style="border-color:#30363d;color:#768390;background:#0d1117;width:60px;font-size:10px;padding:6px">Replica-1</div>
              <div class="wk-node" id="wk-k-r2" style="border-color:#30363d;color:#768390;background:#0d1117;width:60px;font-size:10px;padding:6px">Replica-2</div>
            </div>
            <div id="wk-ka2" style="color:#768390;transition:color .3s;text-align:center">↓</div>
            <div class="wk-node" id="wk-k-cons" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:120px">Consumer</div>
          </div>
        </div>
        <!-- WarpStream side -->
        <div>
          <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px;text-align:center">WarpStream (Stateless)</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div class="wk-node" id="wk-w-prod" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:120px">Producer</div>
            <div id="wk-wa0" style="color:#768390;transition:color .3s;text-align:center">↓</div>
            <div class="wk-node" id="wk-w-agent" style="border-color:#38bdf8;color:#38bdf8;background:#0d1117;width:160px">Agent (RAM)<br><span style="font-size:10px;color:#768390">stateless · no disk</span></div>
            <div id="wk-wa1" style="color:#768390;transition:color .3s;text-align:center;font-size:11px">↓ flush ~250ms</div>
            <div class="wk-node" id="wk-w-s3" style="border-color:#f0883e;color:#f0883e;background:#0d1117;width:160px">S3<br><span style="font-size:10px;color:#768390">source of truth</span></div>
            <div id="wk-wa2" style="color:#768390;transition:color .3s;text-align:center">↓</div>
            <div class="wk-node" id="wk-w-cons" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:120px">Consumer</div>
          </div>
        </div>
      </div>
    </div>
    <div class="wk-info" id="wk-arch-info">Kafka: leader writes to local disk, replicates to followers. WarpStream: agent buffers in RAM, flushes to S3 — NO inter-broker replication.</div>
  </div>

  <!-- TAB 2: Latency -->
  <div class="wk-panel" id="wk-latency">
    <div class="wk-controls">
      <button class="wk-btn active" id="wk-lat-kafka">Select: Kafka acks=1</button>
      <button class="wk-btn" id="wk-lat-kafkaall">Select: Kafka acks=all</button>
      <button class="wk-btn" id="wk-lat-ws">Select: WarpStream</button>
    </div>
    <div class="wk-stage" id="wk-latency-stage">
      <div style="margin-bottom:20px">
        <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:14px">Latency breakdown (produce → consumer reads)</div>
        <div id="wk-lat-viz" style="display:flex;flex-direction:column;gap:12px"></div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:14px;margin-top:14px">
        <div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:8px">Latency components</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="color:#e8741a;margin-bottom:6px">Kafka acks=1:</div>
            <div style="color:#768390;line-height:1.7">network: ~1ms<br>leader disk write: ~1ms<br>consumer poll: ~3ms<br><b style="color:#3fb950">Total: ~5ms</b></div>
          </div>
          <div>
            <div style="color:#38bdf8;margin-bottom:6px">WarpStream:</div>
            <div style="color:#768390;line-height:1.7">agent buffer: ~250ms<br>S3 PUT: ~50ms<br>S3 GET: ~50ms<br><b style="color:#f0883e">Total: ~350ms</b></div>
          </div>
        </div>
      </div>
    </div>
    <div class="wk-info" id="wk-latency-info">Kafka dominates on latency. WarpStream trades latency for simplicity + cost.</div>
  </div>

  <!-- TAB 3: Cost Model -->
  <div class="wk-panel" id="wk-cost">
    <div class="wk-controls">
      <button class="wk-btn" id="wk-cost-low">Low traffic (1TB/mo)</button>
      <button class="wk-btn active" id="wk-cost-mid">Mid traffic (10TB/mo)</button>
      <button class="wk-btn" id="wk-cost-high">High traffic (100TB/mo)</button>
    </div>
    <div class="wk-stage" id="wk-cost-stage">
      <div style="margin-bottom:16px">
        <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:12px">Monthly cost estimate</div>
        <div id="wk-cost-bars" style="display:flex;flex-direction:column;gap:14px"></div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-top:14px;font-size:11px">
        <div style="color:#a371f7;font-weight:bold;margin-bottom:8px">Cost drivers</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
          <div>
            <div style="color:#e8741a;margin-bottom:4px">Self-hosted Kafka:</div>
            <div style="color:#768390;line-height:1.7">3× m5.2xlarge EC2<br>3× 2TB EBS gp3<br>Ops engineer time<br>~$800-2000/mo base</div>
          </div>
          <div>
            <div style="color:#da3633;margin-bottom:4px">Confluent Cloud:</div>
            <div style="color:#768390;line-height:1.7">CKU-based pricing<br>Per-partition cost<br>Egress charges<br>~$0.10-0.14/GB</div>
          </div>
          <div>
            <div style="color:#38bdf8;margin-bottom:4px">WarpStream BYOC:</div>
            <div style="color:#768390;line-height:1.7">S3: $0.023/GB<br>Agents: small pods<br>No partition cost<br>~$0.03-0.05/GB est.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="wk-info" id="wk-cost-info">WarpStream estimated 80% cheaper than Confluent Cloud (claimed). Self-hosted Kafka cheapest per-byte but ops costs add up.</div>
  </div>

  <!-- TAB 4: Ops Complexity -->
  <div class="wk-panel" id="wk-ops">
    <div class="wk-stage">
      <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:14px">Operations comparison</div>
      <div id="wk-ops-table" style="overflow:auto">
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="color:#768390">
              <th style="text-align:left;padding:8px;border-bottom:1px solid #30363d">Operation</th>
              <th style="text-align:center;padding:8px;border-bottom:1px solid #30363d;color:#e8741a">Kafka</th>
              <th style="text-align:center;padding:8px;border-bottom:1px solid #30363d;color:#38bdf8">WarpStream</th>
            </tr>
          </thead>
          <tbody id="wk-ops-tbody"></tbody>
        </table>
      </div>
      <div style="margin-top:16px;background:#0d1117;border:1px solid #3fb950;border-radius:6px;padding:12px">
        <div style="color:#3fb950;font-size:12px;font-weight:bold;margin-bottom:8px">Failure scenarios</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
          <div>
            <div style="color:#e8741a;margin-bottom:4px">Kafka broker fails:</div>
            <div style="color:#cdd9e5;line-height:1.7">Leader election (~10-30s)<br>Consumer group rebalance<br>Partition unavailable during election<br>ISR check, catch-up replication</div>
          </div>
          <div>
            <div style="color:#38bdf8;margin-bottom:4px">WarpStream agent fails:</div>
            <div style="color:#cdd9e5;line-height:1.7">Buffered (unflushed) msgs lost<br>K8s restarts pod instantly<br>New agent reads S3 (no sync)<br>Consumer reconnects to new agent</div>
          </div>
        </div>
      </div>
    </div>
    <div class="wk-info" style="border-color:#3fb950">WarpStream trades buffer-loss risk on agent crash for zero-ops scaling. Kafka has richer failure semantics but more complex recovery.</div>
  </div>

  <!-- TAB 5: Interview -->
  <div class="wk-panel" id="wk-interview">
    <div class="wk-stage" style="overflow:auto">
      <div id="wk-qa-list"></div>
      <div style="margin-top:16px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
        <div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:8px">Decision Guide</div>
        <div id="wk-decision"></div>
      </div>
    </div>
  </div>
</div>`;

      var tip = document.getElementById('wk-tip');
      function showTip(el, html) {
        if (!el) return;
        el.addEventListener('mouseenter', function () { tip.innerHTML = html; tip.style.display = 'block'; });
        el.addEventListener('mousemove', function (e) { tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY - 10) + 'px'; });
        el.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
      }

      // Tab switch
      document.querySelectorAll('#wk-root .wk-tab').forEach(function (t) {
        t.addEventListener('click', function () {
          document.querySelectorAll('#wk-root .wk-tab').forEach(function (x) { x.classList.remove('on'); });
          document.querySelectorAll('#wk-root .wk-panel').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          document.getElementById(t.dataset.tab).classList.add('on');
        });
      });

      // --- TAB 1: Arch animation ---
      var archSteps = [
        {
          kProd: '#3fb950', ka0: false, kLeader: '#30363d', ka1: false, kR: '#30363d', ka2: false, kCons: '#30363d',
          wProd: '#3fb950', wa0: false, wAgent: '#30363d', wa1: false, wS3: '#30363d', wa2: false, wCons: '#30363d',
          info: 'Both producers ready. Same Kafka API surface — compatible clients.'
        },
        {
          kProd: '#3fb950', ka0: true, kLeader: '#e8741a', ka1: false, kR: '#30363d', ka2: false, kCons: '#30363d',
          wProd: '#3fb950', wa0: true, wAgent: '#38bdf8', wa1: false, wS3: '#30363d', wa2: false, wCons: '#30363d',
          info: 'Kafka: message hits Leader Broker, written to local disk. WarpStream: message held in Agent RAM buffer.'
        },
        {
          kProd: '#3fb950', ka0: true, kLeader: '#e8741a', ka1: true, kR: '#e8741a', ka2: false, kCons: '#30363d',
          wProd: '#3fb950', wa0: true, wAgent: '#38bdf8', wa1: true, wS3: '#f0883e', wa2: false, wCons: '#30363d',
          info: 'Kafka: Leader replicates to 2 followers (network + disk on each). WarpStream: Agent flushes to S3 (~250ms). No inter-agent replication!'
        },
        {
          kProd: '#3fb950', ka0: true, kLeader: '#e8741a', ka1: true, kR: '#3fb950', ka2: true, kCons: '#58a6ff',
          wProd: '#3fb950', wa0: true, wAgent: '#38bdf8', wa1: true, wS3: '#f0883e', wa2: true, wCons: '#58a6ff',
          info: 'Both consumers read. Kafka: ~5ms total. WarpStream: ~350ms total. Kafka wins latency; WarpStream wins cost + ops.'
        }
      ];
      var aStep = 0, aTimer = null, aPlaying = false;

      function renderArch() {
        var s = archSteps[aStep];
        var set = function (id, color) {
          var el = document.getElementById(id);
          if (el) { el.style.borderColor = color; el.style.color = color; }
        };
        set('wk-k-prod', s.kProd); set('wk-k-leader', s.kLeader); set('wk-k-cons', s.kCons);
        set('wk-w-prod', s.wProd); set('wk-w-agent', s.wAgent); set('wk-w-s3', s.wS3); set('wk-w-cons', s.wCons);
        ['wk-k-r1', 'wk-k-r2'].forEach(function (id) { set(id, s.kR); });
        document.getElementById('wk-ka0').style.color = s.ka0 ? '#e8741a' : '#768390';
        document.getElementById('wk-ka1').style.color = s.ka1 ? '#e8741a' : '#768390';
        document.getElementById('wk-ka2').style.color = s.ka2 ? '#e8741a' : '#768390';
        document.getElementById('wk-wa0').style.color = s.wa0 ? '#38bdf8' : '#768390';
        document.getElementById('wk-wa1').style.color = s.wa1 ? '#38bdf8' : '#768390';
        document.getElementById('wk-wa2').style.color = s.wa2 ? '#38bdf8' : '#768390';
        document.getElementById('wk-arch-info').textContent = s.info;
      }

      document.getElementById('wk-a-play').addEventListener('click', function () {
        aPlaying = !aPlaying;
        this.textContent = aPlaying ? '⏸ Pause' : '▶ Play';
        if (aPlaying) { aTimer = setInterval(function () { aStep = (aStep + 1) % archSteps.length; renderArch(); }, 1600); }
        else clearInterval(aTimer);
      });
      document.getElementById('wk-a-next').addEventListener('click', function () { aStep = Math.min(aStep + 1, archSteps.length - 1); renderArch(); });
      document.getElementById('wk-a-prev').addEventListener('click', function () { aStep = Math.max(aStep - 1, 0); renderArch(); });
      document.getElementById('wk-a-reset').addEventListener('click', function () {
        clearInterval(aTimer); aPlaying = false;
        document.getElementById('wk-a-play').textContent = '▶ Play';
        aStep = 0; renderArch();
      });

      showTip(document.getElementById('wk-k-leader'), '<b>Kafka Leader Broker</b><br>Owns partition. Writes to local NVMe WAL.<br>Replicates to ISR followers.<br>HWM advances after all ISR acked.<br>Leader failure → ISR election (~10-30s).');
      showTip(document.getElementById('wk-w-agent'), '<b>WarpStream Agent</b><br>No disk. All state in S3.<br>Buffers ~250ms → PUT to S3.<br>Any agent serves any consumer.<br>Crash → restart instantly, read S3.');
      renderArch();

      // --- TAB 2: Latency ---
      var latencyData = {
        'kafka': {
          label: 'Kafka acks=1',
          color: '#e8741a',
          bars: [
            { label: 'Network to broker', ms: 1, max: 350 },
            { label: 'Leader disk write (WAL)', ms: 1, max: 350 },
            { label: 'Consumer poll interval', ms: 3, max: 350 },
            { label: 'Total end-to-end', ms: 5, max: 350, highlight: true }
          ]
        },
        'kafkaall': {
          label: 'Kafka acks=all',
          color: '#da3633',
          bars: [
            { label: 'Network to broker', ms: 1, max: 350 },
            { label: 'Leader disk write', ms: 1, max: 350 },
            { label: 'Replication to ISR (2 followers)', ms: 10, max: 350 },
            { label: 'Consumer poll', ms: 3, max: 350 },
            { label: 'Total end-to-end', ms: 15, max: 350, highlight: true }
          ]
        },
        'ws': {
          label: 'WarpStream',
          color: '#38bdf8',
          bars: [
            { label: 'Agent RAM buffer (flush interval)', ms: 250, max: 350 },
            { label: 'S3 PUT (atomic write)', ms: 50, max: 350 },
            { label: 'Consumer S3 GET + parse', ms: 50, max: 350 },
            { label: 'Total end-to-end', ms: 350, max: 350, highlight: true }
          ]
        }
      };

      function renderLatency(key) {
        var d = latencyData[key];
        document.getElementById('wk-lat-viz').innerHTML = d.bars.map(function (b) {
          var pct = Math.round((b.ms / b.max) * 100);
          return '<div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:3px">' +
            '<span style="font-size:11px;color:' + (b.highlight ? d.color : '#cdd9e5') + ';font-weight:' + (b.highlight ? 'bold' : 'normal') + '">' + b.label + '</span>' +
            '<span style="font-size:11px;color:' + d.color + ';font-weight:bold">' + b.ms + 'ms</span></div>' +
            '<div class="wk-bar-wrap"><div class="wk-bar" style="width:' + pct + '%;background:' + d.color + (b.highlight ? '' : '88') + '"></div></div></div>';
        }).join('');
        document.getElementById('wk-latency-info').textContent = d.label + ': ' + d.bars[d.bars.length - 1].ms + 'ms total. ' + (key === 'ws' ? 'Latency dominated by S3 flush interval. Not suitable for <100ms SLAs.' : 'Kafka wins latency. acks=all adds replication overhead.');
        ['wk-lat-kafka', 'wk-lat-kafkaall', 'wk-lat-ws'].forEach(function (id) {
          document.getElementById(id).classList.toggle('active', id === 'wk-lat-' + key);
        });
      }

      ['kafka', 'kafkaall', 'ws'].forEach(function (k) {
        document.getElementById('wk-lat-' + k).addEventListener('click', function () { renderLatency(k); });
      });
      renderLatency('kafka');

      // --- TAB 3: Cost ---
      var costData = {
        'low': {
          label: '1TB/month',
          bars: [
            { label: 'Self-hosted Kafka (3 brokers, EC2+EBS)', cost: 1200, max: 5000, color: '#e8741a' },
            { label: 'Confluent Cloud', cost: 110, max: 5000, color: '#da3633' },
            { label: 'WarpStream BYOC', cost: 35, max: 5000, color: '#38bdf8' }
          ],
          note: '1TB: Confluent charges ~$0.11/GB. WarpStream: S3 ($23) + agents ($12). Self-hosted: fixed cost dominates.'
        },
        'mid': {
          label: '10TB/month',
          bars: [
            { label: 'Self-hosted Kafka (3 brokers, EC2+EBS)', cost: 1800, max: 5000, color: '#e8741a' },
            { label: 'Confluent Cloud', cost: 1100, max: 5000, color: '#da3633' },
            { label: 'WarpStream BYOC', cost: 350, max: 5000, color: '#38bdf8' }
          ],
          note: '10TB: WarpStream 68% cheaper than Confluent. Self-hosted cheaper per-byte but ops costs not counted.'
        },
        'high': {
          label: '100TB/month',
          bars: [
            { label: 'Self-hosted Kafka (scaled cluster)', cost: 4500, max: 15000, color: '#e8741a' },
            { label: 'Confluent Cloud', cost: 11000, max: 15000, color: '#da3633' },
            { label: 'WarpStream BYOC', cost: 3500, max: 15000, color: '#38bdf8' }
          ],
          note: '100TB: Confluent very expensive. WarpStream and self-hosted competitive. S3 egress costs matter at this scale.'
        }
      };

      function renderCost(key) {
        var d = costData[key];
        document.getElementById('wk-cost-bars').innerHTML = d.bars.map(function (b) {
          var pct = Math.round((b.cost / b.max) * 100);
          return '<div>' +
            '<div style="display:flex;justify-content:space-between;margin-bottom:3px">' +
            '<span style="font-size:11px;color:#cdd9e5">' + b.label + '</span>' +
            '<span style="font-size:11px;color:' + b.color + ';font-weight:bold">$' + b.cost.toLocaleString() + '/mo</span></div>' +
            '<div class="wk-bar-wrap"><div class="wk-bar" style="width:' + pct + '%;background:' + b.color + '"></div></div></div>';
        }).join('');
        document.getElementById('wk-cost-info').textContent = d.label + ': ' + d.note;
        ['low', 'mid', 'high'].forEach(function (k) {
          document.getElementById('wk-cost-' + k).classList.toggle('active', k === key);
        });
      }

      ['low', 'mid', 'high'].forEach(function (k) {
        document.getElementById('wk-cost-' + k).addEventListener('click', function () { renderCost(k); });
      });
      renderCost('mid');

      // --- TAB 4: Ops ---
      var ops = [
        ['Scale out', '⚠️ Partition reassign (hours, data copy)', '✅ Add pod (seconds, no data move)'],
        ['Scale in', '⚠️ Remove broker, reassign first', '✅ Kill pod (no action needed)'],
        ['Broker failure', '⚠️ Leader election + catch-up', '🆗 Pod restart, S3 safe'],
        ['Disk failure', '⚠️ Replace + replicate from ISR', '✅ N/A — no local disk'],
        ['Consumer lag', '🆗 Monitor via kafka-consumer-groups', '🆗 Same — offset-based'],
        ['Schema Registry', '⚠️ Confluent SR (separate service)', '✅ Built-in compatible API'],
        ['Auth / ACLs', '✅ SASL/SCRAM + ACLs mature', '🆗 IAM-based, maturing'],
        ['Monitoring', '✅ JMX, Prometheus, rich metrics', '🆗 CloudWatch / custom metrics'],
        ['Multi-region', '⚠️ MirrorMaker2 / Cluster Linking', '🆗 S3 cross-region replication']
      ];

      document.getElementById('wk-ops-tbody').innerHTML = ops.map(function (r) {
        return '<tr style="border-bottom:1px solid #30363d">' +
          '<td style="padding:7px 8px;color:#cdd9e5;font-weight:bold">' + r[0] + '</td>' +
          '<td style="padding:7px 8px;color:#cdd9e5;text-align:center">' + r[1] + '</td>' +
          '<td style="padding:7px 8px;color:#cdd9e5;text-align:center">' + r[2] + '</td></tr>';
      }).join('');

      // --- TAB 5: Interview ---
      var qas = [
        { q: 'Is WarpStream really Kafka-compatible?', a: 'Wire protocol compatible (Produce/Fetch/Metadata/JoinGroup). Existing Kafka clients work. BUT: Kafka Streams, ksqlDB, MirrorMaker require Kafka internals not available via wire protocol. WarpStream ≠ Kafka ecosystem.' },
        { q: 'What is the durability risk in WarpStream?', a: 'Messages in agent RAM buffer not yet flushed to S3 are lost on crash. Mitigations: producer retries with idempotency, reduce flush interval, use multiple agents. Default flush ~250ms = risk window.' },
        { q: 'Why would a company choose WarpStream over Kafka?', a: '(1) Cost: S3 prices << Confluent Cloud. (2) Ops: stateless agents trivial to manage vs Kafka clusters. (3) Compliance: BYOC keeps data in own cloud. (4) Spiky traffic: scale pods in seconds.' },
        { q: 'When would WarpStream be a bad choice?', a: 'Ultra-low latency (<100ms) requirements. Applications using Kafka Streams / ksqlDB (not compatible). Teams needing mature OSS tooling (KafkaJS, Sarama etc. work but rich Kafka Admin tools may not). High S3 egress (cross-AZ reads billed).' }
      ];
      document.getElementById('wk-qa-list').innerHTML = qas.map(function (qa, i) {
        return '<div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer" onclick="this.querySelector(\'.wk-ans\').style.display=this.querySelector(\'.wk-ans\').style.display===\'none\'?\'block\':\'none\'">' +
          '<div style="color:#38bdf8;font-size:12px;font-weight:bold">Q' + (i + 1) + ': ' + qa.q + '</div>' +
          '<div class="wk-ans" style="display:none;color:#cdd9e5;font-size:12px;margin-top:8px;line-height:1.6">' + qa.a + '</div></div>';
      }).join('');

      var decisions = [
        { q: 'Need <50ms latency?', k: 'Use Kafka', w: 'Avoid WarpStream' },
        { q: 'Budget-sensitive (>10TB/mo)?', k: 'Self-hosted OK', w: 'WarpStream wins' },
        { q: 'Kafka Streams / ksqlDB needed?', k: 'Must use Kafka', w: 'Not compatible' },
        { q: 'Small team, no Kafka expertise?', k: 'Complex ops', w: 'WarpStream wins' },
        { q: 'Compliance (data must stay in your cloud)?', k: 'Self-hosted only', w: 'WarpStream BYOC' },
        { q: 'Event replay / audit log?', k: 'Both work', w: 'Both work' }
      ];
      document.getElementById('wk-decision').innerHTML = decisions.map(function (d) {
        return '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;padding:7px 0;border-bottom:1px solid #30363d;font-size:11px">' +
          '<div style="color:#cdd9e5">' + d.q + '</div>' +
          '<div style="color:#e8741a;text-align:center">' + d.k + '</div>' +
          '<div style="color:#38bdf8;text-align:center">' + d.w + '</div></div>';
      }).join('');
    },

    gotchas: [
      "WarpStream != Kafka ecosystem. Streams/ksqlDB not compatible.",
      "Agent crash before S3 flush = buffer loss. Use producer retries.",
      "S3 egress costs at cross-region scale can negate savings.",
      "Not open-source. Evaluate vendor lock-in risk."
    ],
    interview: [
      "Is WarpStream truly Kafka-compatible?",
      "What's the durability risk and how to mitigate?",
      "When would you NOT use WarpStream?",
      "How does BYOC model work for compliance?"
    ],
    tradeoffs: "WarpStream wins: cost, ops simplicity, BYOC compliance, instant scaling. Kafka wins: latency (<10ms), Streams ecosystem, mature OSS tooling. Both: event replay, consumer groups, Schema Registry."
  };

  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
