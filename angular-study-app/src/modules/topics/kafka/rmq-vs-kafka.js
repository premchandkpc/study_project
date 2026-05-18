(function () {
  var topic = {
    id: "rmq-vs-kafka",
    area: "kafka",
    title: "RabbitMQ vs Kafka",
    tag: "Comparison",
    tags: ["rabbitmq", "kafka", "push", "pull", "tradeoffs", "architecture"],
    concept: `
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#a371f7;margin-bottom:6px">RabbitMQ vs Apache Kafka</h2>
  <p style="color:#768390;margin-bottom:18px">Two radically different messaging philosophies. Wrong choice = years of pain. Right choice = superpowers.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #f59134;border-radius:8px;padding:16px">
      <div style="color:#f59134;font-size:14px;font-weight:bold;margin-bottom:10px">RabbitMQ — Smart Broker</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
        • AMQP protocol (binary, efficient)<br>
        • Push-based — broker pushes to consumer<br>
        • Exchanges + bindings route intelligently<br>
        • Message deleted after ack<br>
        • Per-queue QoS / prefetch<br>
        • Built for task queues, RPC, routing<br>
        • Max ~50K msg/s per node<br>
        • 10K+ queues per node OK
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #e8741a;border-radius:8px;padding:16px">
      <div style="color:#e8741a;font-size:14px;font-weight:bold;margin-bottom:10px">Kafka — Dumb Broker, Smart Consumers</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
        • Custom binary protocol<br>
        • Pull-based — consumers poll offsets<br>
        • Topics + partitions, no routing logic<br>
        • Messages retained by time/size<br>
        • Consumer groups track offsets<br>
        • Built for event streaming, replay, audit<br>
        • 1M+ msg/s per cluster normal<br>
        • Replay = rewind consumer offset
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#a371f7;font-size:13px;font-weight:bold;margin-bottom:10px">When to use which</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="color:#f59134;font-size:12px;font-weight:bold;margin-bottom:6px">Choose RabbitMQ when:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
          ✓ Task queues (background jobs)<br>
          ✓ Complex routing (topic/header exchanges)<br>
          ✓ RPC request/reply patterns<br>
          ✓ Per-message TTL, priority needed<br>
          ✓ Message must be deleted after processing<br>
          ✓ Polyglot clients (AMQP + STOMP + MQTT)
        </div>
      </div>
      <div>
        <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:6px">Choose Kafka when:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
          ✓ Event sourcing / event log<br>
          ✓ Multiple consumers of same data<br>
          ✓ Replay / audit trail needed<br>
          ✓ Very high throughput (10M+ events/day)<br>
          ✓ Stream processing (Kafka Streams)<br>
          ✓ Microservice decoupling at scale
        </div>
      </div>
    </div>
  </div>
</div>`,

    visual: function (mount) {
      mount.innerHTML = `
<style>
.rv-wrap{font-family:monospace;background:#0d1117;color:#cdd9e5;padding:20px;border-radius:10px;min-height:500px}
.rv-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.rv-tab{padding:8px 16px;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#768390;cursor:pointer;font-size:12px;transition:all .2s}
.rv-tab.on{background:#a371f7;color:#0d1117;border-color:#a371f7;font-weight:bold}
.rv-panel{display:none}.rv-panel.on{display:block}
.rv-controls{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.rv-btn{padding:6px 14px;border-radius:5px;border:1px solid #30363d;background:#161b22;color:#cdd9e5;cursor:pointer;font-size:12px;transition:all .2s}
.rv-btn:hover{border-color:#a371f7;color:#a371f7}
.rv-btn.active{background:#a371f7;color:#0d1117;border-color:#a371f7}
.rv-stage{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:18px;min-height:300px}
.rv-info{background:#0d1117;border:1px solid #a371f7;border-radius:6px;padding:12px;margin-top:12px;font-size:12px;color:#cdd9e5;min-height:44px}
.rv-card{border-radius:8px;padding:12px 16px;font-size:12px;border:2px solid;transition:all .4s}
.rv-tooltip{position:fixed;background:#161b22;border:1px solid #a371f7;border-radius:6px;padding:10px 14px;font-size:11px;color:#cdd9e5;z-index:999;pointer-events:none;max-width:280px;display:none;line-height:1.6}
.rv-highlight{animation:rv-flash .6s ease}
@keyframes rv-flash{0%{opacity:1}50%{opacity:0.3}100%{opacity:1}}
</style>
<div class="rv-wrap" id="rv-root">
  <div class="rv-tooltip" id="rv-tip"></div>
  <div class="rv-tabs">
    <div class="rv-tab on" data-tab="rv-flow">Push vs Pull</div>
    <div class="rv-tab" data-tab="rv-retention">Retention Model</div>
    <div class="rv-tab" data-tab="rv-throughput">Throughput</div>
    <div class="rv-tab" data-tab="rv-usecases">Use Cases</div>
    <div class="rv-tab" data-tab="rv-interview">Tricks+Interview</div>
  </div>

  <!-- TAB 1: Push vs Pull -->
  <div class="rv-panel on" id="rv-flow">
    <div class="rv-controls">
      <button class="rv-btn active" id="rv-f-play">▶ Play</button>
      <button class="rv-btn" id="rv-f-prev">⏮ Prev</button>
      <button class="rv-btn" id="rv-f-next">⏭ Next</button>
      <button class="rv-btn" id="rv-f-reset">↺ Reset</button>
      <button class="rv-btn active" id="rv-f-show-rmq">Show RabbitMQ</button>
      <button class="rv-btn" id="rv-f-show-kafka">Show Kafka</button>
    </div>
    <div class="rv-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div id="rv-rmq-side">
          <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:12px;text-align:center">RabbitMQ — PUSH</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div id="rv-rmq-prod" class="rv-card" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:120px;text-align:center">Producer</div>
            <div id="rv-rmq-a0" style="color:#768390;transition:color .3s">↓ publish</div>
            <div id="rv-rmq-broker" class="rv-card" style="border-color:#f59134;color:#f59134;background:#0d1117;width:160px;text-align:center">
              Broker<br><span style="font-size:10px;color:#768390">Exchange→Queue→Consumer</span>
            </div>
            <div id="rv-rmq-a1" style="color:#768390;transition:color .3s">↓ PUSH (prefetch)</div>
            <div id="rv-rmq-cons" class="rv-card" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:120px;text-align:center">Consumer</div>
            <div id="rv-rmq-ack" style="color:#768390;font-size:11px;margin-top:4px">→ ack → message deleted</div>
          </div>
        </div>
        <div id="rv-kafka-side">
          <div style="color:#e8741a;font-size:13px;font-weight:bold;margin-bottom:12px;text-align:center">Kafka — PULL</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
            <div id="rv-k-prod" class="rv-card" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:120px;text-align:center">Producer</div>
            <div id="rv-k-a0" style="color:#768390;transition:color .3s">↓ append to log</div>
            <div id="rv-k-broker" class="rv-card" style="border-color:#e8741a;color:#e8741a;background:#0d1117;width:160px;text-align:center">
              Broker (Log)<br><span style="font-size:10px;color:#768390">Partition offset 0…N</span>
            </div>
            <div id="rv-k-a1" style="color:#768390;transition:color .3s">↑ POLL (offset)</div>
            <div id="rv-k-cons" class="rv-card" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:120px;text-align:center">Consumer</div>
            <div id="rv-k-ack" style="color:#768390;font-size:11px;margin-top:4px">→ commit offset → message stays</div>
          </div>
        </div>
      </div>
    </div>
    <div class="rv-info" id="rv-flow-info">RabbitMQ pushes messages to consumers (broker controls rate). Kafka consumers pull at their own pace (consumer controls rate).</div>
  </div>

  <!-- TAB 2: Retention Model -->
  <div class="rv-panel" id="rv-retention">
    <div class="rv-controls">
      <button class="rv-btn active" id="rv-ret-play">▶ Play</button>
      <button class="rv-btn" id="rv-ret-prev">⏮ Prev</button>
      <button class="rv-btn" id="rv-ret-next">⏭ Next</button>
      <button class="rv-btn" id="rv-ret-reset">↺ Reset</button>
    </div>
    <div class="rv-stage" id="rv-retention-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <!-- RMQ retention -->
        <div>
          <div style="color:#f59134;font-size:12px;font-weight:bold;margin-bottom:10px">RabbitMQ — Transient</div>
          <div id="rv-rmq-msgs" style="display:flex;flex-wrap:wrap;gap:6px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;min-height:60px"></div>
          <div style="color:#768390;font-size:11px;margin-top:6px">Msg acked → GONE. Cannot replay.</div>
        </div>
        <!-- Kafka retention -->
        <div>
          <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:10px">Kafka — Persistent Log</div>
          <div id="rv-k-log" style="display:flex;flex-wrap:wrap;gap:6px;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;min-height:60px"></div>
          <div style="display:flex;gap:10px;margin-top:6px">
            <div id="rv-k-ptr-a" style="font-size:10px;color:#58a6ff">Consumer A ↑</div>
            <div id="rv-k-ptr-b" style="font-size:10px;color:#3fb950">Consumer B ↑</div>
          </div>
          <div style="color:#768390;font-size:11px;margin-top:4px">Multiple consumers, different offsets. Replay = rewind.</div>
        </div>
      </div>
      <div id="rv-ret-stats" style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:11px">
          <div style="color:#f59134;font-weight:bold">RMQ queue depth: <span id="rv-rmq-depth">0</span></div>
          <div style="color:#768390">Processed: <span id="rv-rmq-proc">0</span></div>
        </div>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:11px">
          <div style="color:#e8741a;font-weight:bold">Kafka log size: <span id="rv-k-size">0</span></div>
          <div style="color:#768390">A offset: <span id="rv-k-off-a">0</span> | B offset: <span id="rv-k-off-b">0</span></div>
        </div>
      </div>
    </div>
    <div class="rv-info" id="rv-retention-info">RabbitMQ: message dies after ack. Kafka: message retained by policy (days/GB). Multiple consumers read independently.</div>
  </div>

  <!-- TAB 3: Throughput -->
  <div class="rv-panel" id="rv-throughput">
    <div class="rv-stage">
      <div style="margin-bottom:16px">
        <div style="color:#a371f7;font-size:13px;font-weight:bold;margin-bottom:12px">Throughput Comparison</div>
        <div style="display:grid;grid-template-columns:1fr;gap:10px">
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:#f59134">RabbitMQ (single node)</span>
              <span style="font-size:12px;color:#768390">~50K msg/s</span>
            </div>
            <div style="background:#0d1117;border-radius:4px;height:20px;overflow:hidden">
              <div style="width:8%;height:100%;background:#f59134;border-radius:4px;transition:width 1s"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:#f59134">RabbitMQ (cluster)</span>
              <span style="font-size:12px;color:#768390">~200K msg/s</span>
            </div>
            <div style="background:#0d1117;border-radius:4px;height:20px;overflow:hidden">
              <div style="width:20%;height:100%;background:#f59134;border-radius:4px;transition:width 1s"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:#e8741a">Kafka (single broker)</span>
              <span style="font-size:12px;color:#768390">~500K msg/s</span>
            </div>
            <div style="background:#0d1117;border-radius:4px;height:20px;overflow:hidden">
              <div style="width:50%;height:100%;background:#e8741a;border-radius:4px;transition:width 1s"></div>
            </div>
          </div>
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:12px;color:#e8741a">Kafka (cluster, 3 brokers)</span>
              <span style="font-size:12px;color:#768390">~1M+ msg/s</span>
            </div>
            <div style="background:#0d1117;border-radius:4px;height:20px;overflow:hidden">
              <div style="width:100%;height:100%;background:#e8741a;border-radius:4px;transition:width 1s"></div>
            </div>
          </div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px">
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px">
          <div style="color:#f59134;font-size:12px;font-weight:bold;margin-bottom:8px">RabbitMQ throughput tips</div>
          <div style="color:#cdd9e5;font-size:11px;line-height:1.7">
            • publisher_confirms=false (fire & forget)<br>
            • Large prefetch count (1000+)<br>
            • Multiple channels per connection<br>
            • Lazy queues for large backlogs<br>
            • Quorum queues for HA (not classic mirror)
          </div>
        </div>
        <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px">
          <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:8px">Kafka throughput tips</div>
          <div style="color:#cdd9e5;font-size:11px;line-height:1.7">
            • linger.ms + batch.size (batch writes)<br>
            • compression.type=snappy or lz4<br>
            • More partitions = more parallelism<br>
            • acks=1 or acks=0 for max speed<br>
            • Sequential disk I/O (zero-copy sendfile)
          </div>
        </div>
      </div>
      <div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-top:14px">
        <div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:8px">Latency comparison</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
          RabbitMQ: <b>~1ms</b> p99 latency (small payloads, no confirm)<br>
          Kafka: <b>~5-10ms</b> typical, ~1ms with linger.ms=0 (but batching hurts throughput)<br>
          → RabbitMQ wins on latency. Kafka wins on throughput. Choose accordingly.
        </div>
      </div>
    </div>
  </div>

  <!-- TAB 4: Use Cases -->
  <div class="rv-panel" id="rv-usecases">
    <div class="rv-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div>
          <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:10px">RabbitMQ sweet spots</div>
          <div id="rv-rmq-cases"></div>
        </div>
        <div>
          <div style="color:#e8741a;font-size:13px;font-weight:bold;margin-bottom:10px">Kafka sweet spots</div>
          <div id="rv-k-cases"></div>
        </div>
      </div>
      <div style="background:#0d1117;border:1px solid #a371f7;border-radius:8px;padding:14px">
        <div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:10px">Decision matrix</div>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead>
            <tr style="color:#768390">
              <th style="text-align:left;padding:6px;border-bottom:1px solid #30363d">Criterion</th>
              <th style="text-align:center;padding:6px;border-bottom:1px solid #30363d;color:#f59134">RabbitMQ</th>
              <th style="text-align:center;padding:6px;border-bottom:1px solid #30363d;color:#e8741a">Kafka</th>
            </tr>
          </thead>
          <tbody id="rv-matrix"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- TAB 5: Interview -->
  <div class="rv-panel" id="rv-interview">
    <div class="rv-stage" style="overflow:auto">
      <div id="rv-qa-list"></div>
      <div style="margin-top:16px;background:#0d1117;border:1px solid #da3633;border-radius:6px;padding:12px">
        <div style="color:#da3633;font-size:12px;font-weight:bold;margin-bottom:8px">Common wrong answers</div>
        <div id="rv-wrong-list"></div>
      </div>
    </div>
  </div>
</div>`;

      var tip = document.getElementById("rv-tip");
      function showTip(el, html) {
        if (!el) return;
        el.addEventListener("mouseenter", function () { tip.innerHTML = html; tip.style.display = "block"; });
        el.addEventListener("mousemove", function (e) { tip.style.left = (e.clientX + 14) + "px"; tip.style.top = (e.clientY - 10) + "px"; });
        el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
      }

      // Tab switch
      document.querySelectorAll("#rv-root .rv-tab").forEach(function (t) {
        t.addEventListener("click", function () {
          document.querySelectorAll("#rv-root .rv-tab").forEach(function (x) { x.classList.remove("on"); });
          document.querySelectorAll("#rv-root .rv-panel").forEach(function (x) { x.classList.remove("on"); });
          t.classList.add("on");
          document.getElementById(t.dataset.tab).classList.add("on");
        });
      });

      // --- TAB 1: Flow animation ---
      var flowSteps = [
        { rmqA0: "#768390", rmqA1: "#768390", kA0: "#768390", kA1: "#768390", info: "Both systems idle. No messages in flight." },
        { rmqA0: "#3fb950", rmqA1: "#768390", kA0: "#3fb950", kA1: "#768390", info: "Producers publish: RabbitMQ sends to Exchange. Kafka appends to partition log." },
        { rmqA0: "#3fb950", rmqA1: "#f59134", kA0: "#3fb950", kA1: "#768390", info: "RabbitMQ broker PUSHES to consumer. Kafka broker waits — consumer must poll." },
        { rmqA0: "#3fb950", rmqA1: "#f59134", kA0: "#3fb950", kA1: "#58a6ff", info: "Kafka consumer POLLs at own pace. Can be slow — broker does not care. RMQ: prefetch controls back-pressure." },
        { rmqA0: "#3fb950", rmqA1: "#3fb950", kA0: "#3fb950", kA1: "#3fb950", info: "Complete. RMQ: msg acked → deleted. Kafka: msg committed → still in log (retention policy applies)." }
      ];
      var fStep = 0, fTimer = null, fPlaying = false;

      function renderFlow() {
        var s = flowSteps[fStep];
        document.getElementById("rv-rmq-a0").style.color = s.rmqA0;
        document.getElementById("rv-rmq-a1").style.color = s.rmqA1;
        document.getElementById("rv-k-a0").style.color = s.kA0;
        document.getElementById("rv-k-a1").style.color = s.kA1;
        document.getElementById("rv-flow-info").textContent = s.info;
      }

      document.getElementById("rv-f-play").addEventListener("click", function () {
        fPlaying = !fPlaying;
        this.textContent = fPlaying ? "⏸ Pause" : "▶ Play";
        if (fPlaying) { fTimer = setInterval(function () { fStep = (fStep + 1) % flowSteps.length; renderFlow(); }, 1500); }
        else clearInterval(fTimer);
      });
      document.getElementById("rv-f-next").addEventListener("click", function () { fStep = Math.min(fStep + 1, flowSteps.length - 1); renderFlow(); });
      document.getElementById("rv-f-prev").addEventListener("click", function () { fStep = Math.max(fStep - 1, 0); renderFlow(); });
      document.getElementById("rv-f-reset").addEventListener("click", function () {
        clearInterval(fTimer); fPlaying = false;
        document.getElementById("rv-f-play").textContent = "▶ Play";
        fStep = 0; renderFlow();
      });

      // Tooltips on flow nodes
      showTip(document.getElementById("rv-rmq-broker"), "<b>RabbitMQ Broker</b><br>Exchange routes via bindings. Queue stores msgs. Broker pushes to consumer respecting prefetch limit.<br><br><b>x-max-length, TTL, DLX</b> all managed here.");
      showTip(document.getElementById("rv-k-broker"), "<b>Kafka Broker</b><br>Append-only log. No routing logic. Consumer stores offset. Broker just serves fetch requests.<br><br><b>Retention:</b> log.retention.hours=168 (7 days default)");
      renderFlow();

      // --- TAB 2: Retention animation ---
      var retStep = 0, retTimer = null, retPlaying = false;
      var rmqMsgs = [], kLog = [], kOffA = 0, kOffB = 0, rmqProc = 0;

      function renderRetention() {
        // Add message each step
        var msgId = "M" + retStep;
        rmqMsgs.push({ id: msgId, alive: true });
        kLog.push({ id: msgId });
        // Simulate RMQ consuming oldest
        if (rmqMsgs.length > 3) { rmqMsgs.shift(); rmqProc++; }
        // Advance kafka consumers independently
        if (retStep % 2 === 0 && kOffA < kLog.length) kOffA++;
        if (retStep % 3 === 0 && kOffB < kLog.length) kOffB++;

        var rmqEl = document.getElementById("rv-rmq-msgs");
        rmqEl.innerHTML = rmqMsgs.map(function (m) {
          return "<div style=\"background:#f59134;color:#0d1117;border-radius:10px;padding:3px 9px;font-size:10px;font-weight:bold\">" + m.id + "</div>";
        }).join("");

        var kEl = document.getElementById("rv-k-log");
        kEl.innerHTML = kLog.map(function (m, i) {
          var bgA = i < kOffA ? "#58a6ff33" : "transparent";
          var bgB = i < kOffB ? "#3fb95033" : "transparent";
          return "<div style=\"background:#e8741a;color:#0d1117;border-radius:10px;padding:3px 9px;font-size:10px;font-weight:bold;border:2px solid " + (i < kOffA ? "#58a6ff" : i < kOffB ? "#3fb950" : "#e8741a") + "\">" + i + ":" + m.id + "</div>";
        }).join("");

        document.getElementById("rv-rmq-depth").textContent = rmqMsgs.length;
        document.getElementById("rv-rmq-proc").textContent = rmqProc;
        document.getElementById("rv-k-size").textContent = kLog.length;
        document.getElementById("rv-k-off-a").textContent = kOffA;
        document.getElementById("rv-k-off-b").textContent = kOffB;
        document.getElementById("rv-k-ptr-a").textContent = "Consumer A offset=" + kOffA;
        document.getElementById("rv-k-ptr-b").textContent = "Consumer B offset=" + kOffB;
        document.getElementById("rv-retention-info").textContent = "Step " + retStep + ": RMQ has " + rmqMsgs.length + " msgs (deleted after ack). Kafka log grows to " + kLog.length + " (retained). Consumer A at " + kOffA + ", B at " + kOffB + ".";
        retStep++;
      }

      document.getElementById("rv-ret-play").addEventListener("click", function () {
        retPlaying = !retPlaying;
        this.textContent = retPlaying ? "⏸ Pause" : "▶ Play";
        if (retPlaying) { retTimer = setInterval(renderRetention, 1200); }
        else clearInterval(retTimer);
      });
      document.getElementById("rv-ret-next").addEventListener("click", renderRetention);
      document.getElementById("rv-ret-prev").addEventListener("click", function () {
        // retention model doesn't support going back; just show info
        document.getElementById("rv-retention-info").textContent = "Retention model is append-only — prev not applicable. Reset to restart.";
      });
      document.getElementById("rv-ret-reset").addEventListener("click", function () {
        clearInterval(retTimer); retPlaying = false; retStep = 0; rmqMsgs = []; kLog = []; kOffA = 0; kOffB = 0; rmqProc = 0;
        document.getElementById("rv-ret-play").textContent = "▶ Play";
        document.getElementById("rv-rmq-msgs").innerHTML = "";
        document.getElementById("rv-k-log").innerHTML = "";
        document.getElementById("rv-rmq-depth").textContent = "0";
        document.getElementById("rv-rmq-proc").textContent = "0";
        document.getElementById("rv-k-size").textContent = "0";
        document.getElementById("rv-k-off-a").textContent = "0";
        document.getElementById("rv-k-off-b").textContent = "0";
        document.getElementById("rv-retention-info").textContent = "Press Play to simulate message retention differences.";
      });

      // --- TAB 4: Use Cases ---
      var rmqCases = [
        { title: "Email / notification worker", detail: "Background job queue. Worker picks task, processes, acks. DLQ for failures." },
        { title: "RPC request/reply", detail: "reply-to queue + correlation-id. Synchronous-like over async. Low latency." },
        { title: "Priority queue (e.g. SLA tiers)", detail: "x-max-priority=10. VIP messages jump queue. Kafka has no priority." },
        { title: "IoT command dispatch", detail: "MQTT + RabbitMQ bridge. Per-device queue, TTL cleanup." },
        { title: "Microservice task handoff", detail: "Service A → queue → Service B. Decoupled, simple, proven." }
      ];
      var kCases = [
        { title: "CDC / audit log", detail: "Debezium → Kafka. Every DB change captured. Replay history at will." },
        { title: "Real-time analytics pipeline", detail: "Kafka Streams or Flink. Aggregate events, join streams, window calculations." },
        { title: "Event sourcing", detail: "Order created → payment → shipped → delivered. Full replay for new services." },
        { title: "Metrics ingestion (Prometheus/InfluxDB)", detail: "10M+ data points/s. Kafka handles spikes, downstream consumer can lag." },
        { title: "ML feature pipeline", detail: "Feature store ingestion. Multiple ML models consume same event stream." }
      ];

      document.getElementById("rv-rmq-cases").innerHTML = rmqCases.map(function (c) {
        return "<div style=\"background:#0d1117;border:1px solid #f59134;border-radius:6px;padding:10px;margin-bottom:8px;cursor:pointer\" onclick=\"this.querySelector('.rv-det').style.display=this.querySelector('.rv-det').style.display==='none'?'block':'none'\">" +
          "<div style=\"color:#f59134;font-size:12px;font-weight:bold\">→ " + c.title + "</div>" +
          "<div class=\"rv-det\" style=\"display:none;color:#768390;font-size:11px;margin-top:6px\">" + c.detail + "</div></div>";
      }).join("");

      document.getElementById("rv-k-cases").innerHTML = kCases.map(function (c) {
        return "<div style=\"background:#0d1117;border:1px solid #e8741a;border-radius:6px;padding:10px;margin-bottom:8px;cursor:pointer\" onclick=\"this.querySelector('.rv-det').style.display=this.querySelector('.rv-det').style.display==='none'?'block':'none'\">" +
          "<div style=\"color:#e8741a;font-size:12px;font-weight:bold\">→ " + c.title + "</div>" +
          "<div class=\"rv-det\" style=\"display:none;color:#768390;font-size:11px;margin-top:6px\">" + c.detail + "</div></div>";
      }).join("");

      var matrix = [
        ["Throughput", "~200K/s", "1M+/s"],
        ["Latency", "~1ms", "~5-10ms"],
        ["Message replay", "✗ deleted on ack", "✓ retain & replay"],
        ["Complex routing", "✓ exchanges/bindings", "✗ topics only"],
        ["Per-message TTL", "✓ native", "✗ partition TTL only"],
        ["Multiple consumers", "✗ competing", "✓ independent offsets"],
        ["Stream processing", "✗", "✓ Kafka Streams / KSQL"],
        ["Ordering", "Per-queue", "Per-partition"],
        ["Ops complexity", "Low", "Higher (ZK/KRaft + disk)"]
      ];
      document.getElementById("rv-matrix").innerHTML = matrix.map(function (r) {
        var rmqWin = r[1].startsWith("✓") || r[0] === "Latency" || r[0] === "Ops complexity";
        var kafkaWin = r[2].startsWith("✓") || r[0] === "Throughput" || r[0] === "Multiple consumers";
        return "<tr><td style=\"padding:5px 6px;border-bottom:1px solid #30363d;color:#cdd9e5\">" + r[0] + "</td>" +
          "<td style=\"padding:5px 6px;border-bottom:1px solid #30363d;text-align:center;color:" + (rmqWin ? "#3fb950" : "#cdd9e5") + "\">" + r[1] + "</td>" +
          "<td style=\"padding:5px 6px;border-bottom:1px solid #30363d;text-align:center;color:" + (kafkaWin ? "#3fb950" : "#cdd9e5") + "\">" + r[2] + "</td></tr>";
      }).join("");

      // --- TAB 5: Interview ---
      var qas = [
        { q: "Can Kafka replace RabbitMQ for task queues?", a: "Technically yes, but it's awkward. Kafka has no priority, TTL per message, or complex routing. Task queues need \"one consumer handles one job\" — Kafka consumer groups do this but with partition-level granularity. RabbitMQ is simpler and more natural for task queues." },
        { q: "Why does Kafka outperform RabbitMQ in throughput?", a: "Sequential disk I/O (append-only log), zero-copy sendfile to consumers, batching by default, no per-message routing logic. RabbitMQ must maintain queue state in memory + disk per message." },
        { q: "When would you use both in the same system?", a: "Use Kafka as event backbone (CDC, event log, analytics). Use RabbitMQ for service-to-service task dispatch, RPC, or where messages must expire. Example: Kafka captures events → triggers RabbitMQ task for email sending." },
        { q: "How does RabbitMQ handle back-pressure vs Kafka?", a: "RabbitMQ: prefetch count limits unacked msgs per consumer. Queue depth is visible. Publishers can use flow control (connection blocked). Kafka: consumer simply lags — broker does not care. Monitor consumer lag separately." }
      ];
      document.getElementById("rv-qa-list").innerHTML = qas.map(function (qa, i) {
        return "<div style=\"background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer\" onclick=\"this.querySelector('.rv-ans').style.display=this.querySelector('.rv-ans').style.display==='none'?'block':'none'\">" +
          "<div style=\"color:#a371f7;font-size:12px;font-weight:bold\">Q" + (i + 1) + ": " + qa.q + "</div>" +
          "<div class=\"rv-ans\" style=\"display:none;color:#cdd9e5;font-size:12px;margin-top:8px;line-height:1.6\">" + qa.a + "</div></div>";
      }).join("");

      // WRONG vs CORRECT visual side-by-side
      var wrongRight = [
        {
          wrong: "// \"Kafka for everything\"\nproducer.send(\"email.task\", payload);\n// Consumer must track if email sent\n// No TTL, no priority, no routing\n// Ops burden for simple use-case",
          right: "// RabbitMQ for task queues\nchannel.sendToQueue(\"email.work\",\n  payload, { persistent: true });\n// TTL, priority, DLQ built-in\n// Consumer acks = message gone",
          label: "Task queue: Kafka vs RabbitMQ"
        },
        {
          wrong: "// \"RabbitMQ can replay\"\nchannel.ack(msg); // GONE\n// 2nd consumer joins next day\n// Cannot read old messages",
          right: "// Kafka retains for replay\nconsumer.seek(partition, 0);\n// Rewind to offset 0, read all\n// 2nd consumer reads full history",
          label: "Message replay"
        }
      ];

      var wcHtml = "<div style=\"color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:10px\">⚠️ WRONG vs ✓ CORRECT</div>";
      wcHtml += wrongRight.map(function (item) {
        return "<div style=\"margin-bottom:12px\"><div style=\"color:#768390;font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px\">" + item.label + "</div>" +
          "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">" +
          "<div style=\"background:#0d1117;border:2px solid #da3633;border-radius:6px;padding:10px\"><div style=\"color:#da3633;font-size:10px;font-weight:bold;margin-bottom:6px\">❌ WRONG</div><pre style=\"color:#cdd9e5;font-size:10px;margin:0;white-space:pre-wrap\">" + item.wrong + "</pre></div>" +
          "<div style=\"background:#0d1117;border:2px solid #3fb950;border-radius:6px;padding:10px\"><div style=\"color:#3fb950;font-size:10px;font-weight:bold;margin-bottom:6px\">✓ CORRECT</div><pre style=\"color:#cdd9e5;font-size:10px;margin:0;white-space:pre-wrap\">" + item.right + "</pre></div>" +
          "</div></div>";
      }).join("");
      document.getElementById("rv-wrong-list").innerHTML = wcHtml;

      // Production story
      var prodCard = document.createElement("div");
      prodCard.style.cssText = "background:#0d1117;border:1px solid #a371f7;border-radius:8px;padding:14px;margin-bottom:14px";
      prodCard.innerHTML = "<div style=\"color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:6px\">🏭 Production Story: Choosing Wrong</div>" +
        "<div style=\"color:#cdd9e5;font-size:12px;line-height:1.7\">Fintech startup chose Kafka for background job processing (10K jobs/day). 6 months in: partition rebalance freezes consumers for 30s during deployments. Payment jobs timeout. Root cause: Kafka consumer group rebalance during rolling deploy. RabbitMQ would have handled this with zero config. Right tool matters.</div>";
      document.getElementById("rv-qa-list").parentNode.insertBefore(prodCard, document.getElementById("rv-qa-list"));
    },

    gotchas: [
      "RabbitMQ: message acked = gone forever. No replay.",
      "Kafka: consumer lag is invisible to broker — monitor externally.",
      "Kafka has no per-message TTL or priority.",
      "RabbitMQ push-based: slow consumer backs up queue in broker memory."
    ],
    interview: [
      "Why Kafka for event sourcing but not RabbitMQ?",
      "How does RabbitMQ back-pressure work vs Kafka?",
      "Can one system replace the other?",
      "Latency: which is faster and why?"
    ],
    tradeoffs: "RabbitMQ: low latency, complex routing, task-oriented. Cons: no replay, memory pressure. Kafka: high throughput, replay, multi-consumer. Cons: higher ops, no routing, latency higher."
  };

  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
