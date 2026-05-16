(function () {
  var topic = {
    id: "rmq-dlq",
    area: "kafka",
    title: "RabbitMQ Dead Letter Queues",
    tag: "Reliability",
    tags: ["rabbitmq", "dlq", "retry", "ttl", "x-death"],
    concept: `
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#f59134;margin-bottom:6px">Dead Letter Queues (DLQ)</h2>
  <p style="color:#768390;margin-bottom:18px">Messages that can't be delivered go to a <em style="color:#f59134">Dead Letter Exchange</em> → routed to a DLQ. Think of it as a morgue for failed messages.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #f59134;border-radius:8px;padding:14px">
      <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:8px">WHY messages die</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        • <b>rejected</b> — nack/reject, requeue=false<br>
        • <b>expired</b> — TTL elapsed in queue<br>
        • <b>maxlen</b> — queue overflow, x-overflow=drop-head
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#58a6ff;font-size:13px;font-weight:bold;margin-bottom:8px">FLOW</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Producer → Exchange → Work Queue<br>
        ↓ (fail / expire / overflow)<br>
        x-dead-letter-exchange → DLX<br>
        ↓<br>
        DLQ (inspect / retry / alert)
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#3fb950;font-size:13px;font-weight:bold;margin-bottom:8px">x-death header</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Each dead-letter hop appends entry to x-death array:<br>
        <code style="color:#f59134">{ queue, reason, time, count }</code><br>
        Enables retry counting & loop detection.
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:10px">Queue declaration with DLX</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0;overflow:auto">// Work queue — messages that fail go to dlx.payment
channel.assertQueue('payment.work', {
  arguments: {
    'x-dead-letter-exchange': 'dlx.payment',
    'x-dead-letter-routing-key': 'payment.dead',
    'x-message-ttl': 30000        // 30 s — expire → DLX
  }
});

// Dead letter exchange (direct)
channel.assertExchange('dlx.payment', 'direct', { durable: true });

// Dead letter queue — bound to DLX
channel.assertQueue('payment.dlq', { durable: true });
channel.bindQueue('payment.dlq', 'dlx.payment', 'payment.dead');</pre>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">
    <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:10px">Retry via TTL trampoline pattern</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0;overflow:auto">// Retry queue: wait N ms then dead-letter BACK to work exchange
channel.assertQueue('payment.retry', {
  arguments: {
    'x-dead-letter-exchange': 'payment.exchange',   // bounce back
    'x-dead-letter-routing-key': 'payment',
    'x-message-ttl': 5000                           // wait 5 s
  }
});

// On nack — send to retry queue
channel.nack(msg, false, false);                   // requeue=false → DLX
// DLX routes to retry queue, waits 5s, re-publishes to work queue</pre>
  </div>
</div>`,

    visual: function (mount) {
      mount.innerHTML = `
<style>
.dl-wrap{font-family:monospace;background:#0d1117;color:#cdd9e5;padding:20px;border-radius:10px;min-height:500px}
.dl-tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.dl-tab{padding:8px 16px;border-radius:6px;border:1px solid #30363d;background:#161b22;color:#768390;cursor:pointer;font-size:12px;transition:all .2s}
.dl-tab.on{background:#f59134;color:#0d1117;border-color:#f59134;font-weight:bold}
.dl-panel{display:none}.dl-panel.on{display:block}
.dl-controls{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
.dl-btn{padding:6px 14px;border-radius:5px;border:1px solid #30363d;background:#161b22;color:#cdd9e5;cursor:pointer;font-size:12px;transition:all .2s}
.dl-btn:hover{border-color:#f59134;color:#f59134}
.dl-btn.active{background:#f59134;color:#0d1117;border-color:#f59134}
.dl-stage{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:18px;min-height:320px}
.dl-info{background:#0d1117;border:1px solid #f59134;border-radius:6px;padding:12px;margin-top:12px;font-size:12px;color:#cdd9e5;min-height:48px}
.dl-msg{display:inline-block;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:bold;cursor:pointer;transition:all .3s;position:absolute}
.dl-node{border-radius:8px;padding:10px 16px;font-size:12px;font-weight:bold;text-align:center;border:2px solid;transition:all .3s}
.dl-arrow{color:#768390;font-size:20px;text-align:center;margin:4px 0;transition:color .4s}
.dl-arrow.lit{color:#f59134}
.dl-tooltip{position:fixed;background:#161b22;border:1px solid #f59134;border-radius:6px;padding:10px 14px;font-size:11px;color:#cdd9e5;z-index:999;pointer-events:none;max-width:280px;display:none;line-height:1.6}
</style>
<div class="dl-wrap" id="dl-root">
  <div class="dl-tooltip" id="dl-tip"></div>
  <div class="dl-tabs">
    <div class="dl-tab on" data-tab="dl-basics">DLQ Basics</div>
    <div class="dl-tab" data-tab="dl-retry">Retry Pattern</div>
    <div class="dl-tab" data-tab="dl-reasons">Dead-Letter Reasons</div>
    <div class="dl-tab" data-tab="dl-interview">Tricks+Interview</div>
  </div>

  <!-- TAB 1: DLQ Basics -->
  <div class="dl-panel on" id="dl-basics">
    <div class="dl-controls">
      <button class="dl-btn active" id="dl-b-play">▶ Play</button>
      <button class="dl-btn" id="dl-b-prev">⏮ Prev</button>
      <button class="dl-btn" id="dl-b-next">⏭ Next</button>
      <button class="dl-btn" id="dl-b-reset">↺ Reset</button>
      <span style="color:#768390;font-size:11px;align-self:center">Message lifecycle through DLX/DLQ</span>
    </div>
    <div class="dl-stage" id="dl-basics-stage" style="position:relative;overflow:hidden">
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0">
        <div class="dl-node" id="dl-n-producer" style="border-color:#3fb950;color:#3fb950;background:#0d1117;width:130px">Producer</div>
        <div class="dl-arrow" id="dl-a0">↓</div>
        <div class="dl-node" id="dl-n-exchange" style="border-color:#58a6ff;color:#58a6ff;background:#0d1117;width:160px">Exchange</div>
        <div class="dl-arrow" id="dl-a1">↓</div>
        <div class="dl-node" id="dl-n-wq" style="border-color:#cdd9e5;color:#cdd9e5;background:#0d1117;width:160px">Work Queue</div>
        <div class="dl-arrow" id="dl-a2">↓ (reject/expire/overflow)</div>
        <div style="display:flex;gap:20px;align-items:center">
          <div class="dl-node" id="dl-n-dlx" style="border-color:#f59134;color:#f59134;background:#0d1117;width:160px">Dead Letter Exchange</div>
          <div style="color:#768390;font-size:11px">↗ x-dead-letter-exchange header</div>
        </div>
        <div class="dl-arrow" id="dl-a3">↓</div>
        <div class="dl-node" id="dl-n-dlq" style="border-color:#da3633;color:#da3633;background:#0d1117;width:160px">Dead Letter Queue</div>
        <div style="color:#768390;font-size:11px;margin-top:6px">Inspect / Alert / Retry / Discard</div>
      </div>
    </div>
    <div class="dl-info" id="dl-basics-info">Press Play to animate message flow through DLX/DLQ pipeline.</div>
  </div>

  <!-- TAB 2: Retry Pattern -->
  <div class="dl-panel" id="dl-retry">
    <div class="dl-controls">
      <button class="dl-btn active" id="dl-r-play">▶ Play</button>
      <button class="dl-btn" id="dl-r-prev">⏮ Prev</button>
      <button class="dl-btn" id="dl-r-next">⏭ Next</button>
      <button class="dl-btn" id="dl-r-reset">↺ Reset</button>
    </div>
    <div class="dl-stage" id="dl-retry-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;align-items:start">
        <div>
          <div style="color:#3fb950;font-size:11px;margin-bottom:8px;font-weight:bold">WORK QUEUE</div>
          <div id="dl-rq-work" style="background:#0d1117;border:1px solid #3fb950;border-radius:6px;padding:12px;min-height:80px">
            <div id="dl-msg-work" style="display:none;background:#3fb950;color:#0d1117;border-radius:12px;padding:4px 10px;font-size:11px;font-weight:bold;display:inline-block">payment_123</div>
          </div>
          <pre style="color:#768390;font-size:10px;margin-top:8px">x-message-ttl: 30000
x-dead-letter-exchange: retry.dlx</pre>
        </div>
        <div>
          <div style="color:#f59134;font-size:11px;margin-bottom:8px;font-weight:bold">RETRY QUEUE (TTL trampoline)</div>
          <div id="dl-rq-retry" style="background:#0d1117;border:1px solid #f59134;border-radius:6px;padding:12px;min-height:80px"></div>
          <pre style="color:#768390;font-size:10px;margin-top:8px">x-message-ttl: 5000
x-dead-letter-exchange: work.exchange</pre>
        </div>
        <div>
          <div style="color:#da3633;font-size:11px;margin-bottom:8px;font-weight:bold">DLQ (max retries)</div>
          <div id="dl-rq-dlq" style="background:#0d1117;border:1px solid #da3633;border-radius:6px;padding:12px;min-height:80px"></div>
          <pre style="color:#768390;font-size:10px;margin-top:8px">x-death[count] >= 3
→ alert / discard</pre>
        </div>
      </div>
      <div style="margin-top:14px">
        <div style="color:#768390;font-size:11px;margin-bottom:6px">x-death header (appended each hop):</div>
        <div id="dl-xdeath" style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:10px;font-size:11px;color:#768390">Waiting...</div>
      </div>
    </div>
    <div class="dl-info" id="dl-retry-info">TTL trampoline: retry queue waits N ms then dead-letters BACK to work exchange.</div>
  </div>

  <!-- TAB 3: Dead-Letter Reasons -->
  <div class="dl-panel" id="dl-reasons">
    <div class="dl-controls">
      <button class="dl-btn active" id="dl-reason-rejected">rejected</button>
      <button class="dl-btn" id="dl-reason-expired">expired</button>
      <button class="dl-btn" id="dl-reason-maxlen">maxlen</button>
    </div>
    <div class="dl-stage" id="dl-reasons-stage">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div id="dl-reason-title" style="color:#f59134;font-size:15px;font-weight:bold;margin-bottom:10px">rejected</div>
          <div id="dl-reason-desc" style="color:#cdd9e5;font-size:12px;line-height:1.7;margin-bottom:14px"></div>
          <div id="dl-reason-code" style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;font-size:11px;color:#cdd9e5"></div>
        </div>
        <div>
          <div style="color:#768390;font-size:11px;margin-bottom:8px">Message path animation</div>
          <div id="dl-reason-anim" style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:16px;min-height:200px;position:relative"></div>
        </div>
      </div>
    </div>
    <div class="dl-info" id="dl-reasons-info">Select reason to see flow.</div>
  </div>

  <!-- TAB 4: Tricks+Interview -->
  <div class="dl-panel" id="dl-interview">
    <div class="dl-stage" style="overflow:auto">
      <div style="margin-bottom:16px">
        <div style="color:#f59134;font-size:14px;font-weight:bold;margin-bottom:10px">Common Interview Questions</div>
        <div id="dl-qa-list"></div>
      </div>
      <div style="margin-top:16px">
        <div style="color:#da3633;font-size:13px;font-weight:bold;margin-bottom:10px">Gotchas</div>
        <div id="dl-gotcha-list"></div>
      </div>
      <div style="margin-top:16px;background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
        <div style="color:#3fb950;font-size:12px;font-weight:bold;margin-bottom:8px">x-death structure (real example)</div>
        <pre style="color:#cdd9e5;font-size:11px;margin:0">{
  "x-death": [
    {
      "count": 2,
      "exchange": "payment.exchange",
      "queue": "payment.work",
      "reason": "rejected",
      "routing-keys": ["payment"],
      "time": "2024-01-15T10:30:00Z"
    }
  ]
}</pre>
      </div>
    </div>
  </div>
</div>`;

      var tip = document.getElementById('dl-tip');
      function showTip(el, html) {
        el.addEventListener('mouseenter', function (e) {
          tip.innerHTML = html;
          tip.style.display = 'block';
        });
        el.addEventListener('mousemove', function (e) {
          tip.style.left = (e.clientX + 14) + 'px';
          tip.style.top = (e.clientY - 10) + 'px';
        });
        el.addEventListener('mouseleave', function () { tip.style.display = 'none'; });
      }

      // Tab switching
      document.querySelectorAll('#dl-root .dl-tab').forEach(function (t) {
        t.addEventListener('click', function () {
          document.querySelectorAll('#dl-root .dl-tab').forEach(function (x) { x.classList.remove('on'); });
          document.querySelectorAll('#dl-root .dl-panel').forEach(function (x) { x.classList.remove('on'); });
          t.classList.add('on');
          document.getElementById(t.dataset.tab).classList.add('on');
        });
      });

      // --- TAB 1: DLQ Basics animation ---
      var basicsSteps = [
        {
          nodes: { producer: '#3fb950', exchange: '#30363d', wq: '#30363d', dlx: '#30363d', dlq: '#30363d' },
          arrows: [false, false, false, false],
          info: 'Step 1 — Producer publishes message to Exchange. Message contains payment data.'
        },
        {
          nodes: { producer: '#3fb950', exchange: '#58a6ff', wq: '#30363d', dlx: '#30363d', dlq: '#30363d' },
          arrows: [true, false, false, false],
          info: 'Step 2 — Exchange routes message to Work Queue via routing key binding.'
        },
        {
          nodes: { producer: '#3fb950', exchange: '#58a6ff', wq: '#cdd9e5', dlx: '#30363d', dlq: '#30363d' },
          arrows: [true, true, false, false],
          info: 'Step 3 — Message sits in Work Queue. Consumer processes... but FAILS. nack(requeue=false).'
        },
        {
          nodes: { producer: '#3fb950', exchange: '#58a6ff', wq: '#da3633', dlx: '#f59134', dlq: '#30363d' },
          arrows: [true, true, true, false],
          info: 'Step 4 — Rejection triggers x-dead-letter-exchange. Message routed to Dead Letter Exchange (DLX).'
        },
        {
          nodes: { producer: '#3fb950', exchange: '#58a6ff', wq: '#da3633', dlx: '#f59134', dlq: '#da3633' },
          arrows: [true, true, true, true],
          info: 'Step 5 — DLX routes to Dead Letter Queue. x-death header records: queue, reason=rejected, count=1, time. Ready for inspection.'
        }
      ];
      var bStep = 0, bTimer = null, bPlaying = false;

      function renderBasics() {
        var s = basicsSteps[bStep];
        var ids = ['producer', 'exchange', 'wq', 'dlx', 'dlq'];
        var colors = [s.nodes.producer, s.nodes.exchange, s.nodes.wq, s.nodes.dlx, s.nodes.dlq];
        ids.forEach(function (id, i) {
          var el = document.getElementById('dl-n-' + id);
          if (el) { el.style.borderColor = colors[i]; el.style.color = colors[i]; }
        });
        [0, 1, 2, 3].forEach(function (i) {
          var el = document.getElementById('dl-a' + i);
          if (el) el.classList.toggle('lit', s.arrows[i]);
        });
        document.getElementById('dl-basics-info').textContent = s.info;
      }

      document.getElementById('dl-b-play').addEventListener('click', function () {
        bPlaying = !bPlaying;
        this.textContent = bPlaying ? '⏸ Pause' : '▶ Play';
        if (bPlaying) {
          bTimer = setInterval(function () {
            bStep = (bStep + 1) % basicsSteps.length;
            renderBasics();
          }, 1400);
        } else { clearInterval(bTimer); }
      });
      document.getElementById('dl-b-next').addEventListener('click', function () { bStep = Math.min(bStep + 1, basicsSteps.length - 1); renderBasics(); });
      document.getElementById('dl-b-prev').addEventListener('click', function () { bStep = Math.max(bStep - 1, 0); renderBasics(); });
      document.getElementById('dl-b-reset').addEventListener('click', function () {
        clearInterval(bTimer); bPlaying = false;
        document.getElementById('dl-b-play').textContent = '▶ Play';
        bStep = 0; renderBasics();
      });

      // Tooltips on basics nodes
      showTip(document.getElementById('dl-n-producer'), '<b>Producer</b><br>Publishes messages with routing key.<br><code>channel.publish(exchange, routingKey, Buffer.from(data))</code>');
      showTip(document.getElementById('dl-n-exchange'), '<b>Exchange</b><br>Routes messages to queues via bindings.<br>Types: direct, fanout, topic, headers');
      showTip(document.getElementById('dl-n-wq'), '<b>Work Queue</b><br>Declared with x-dead-letter-exchange.<br>Failed messages auto-route to DLX.');
      showTip(document.getElementById('dl-n-dlx'), '<b>Dead Letter Exchange</b><br>Special exchange receiving dead messages.<br>Routes to DLQ via binding key.');
      showTip(document.getElementById('dl-n-dlq'), '<b>Dead Letter Queue</b><br>Holds all failed messages with x-death metadata.<br>Inspect: rabbitmqctl list_queues');
      renderBasics();

      // --- TAB 2: Retry Pattern animation ---
      var retrySteps = [
        { work: 'payment_123', retry: '', dlq: '', xdeath: 'No x-death yet — message just arrived in work queue.', info: 'Message enters Work Queue. Consumer picks it up...' },
        { work: '', retry: '', dlq: '', xdeath: 'Processing... FAILED. nack(requeue=false)', info: 'Consumer fails. nack with requeue=false → DLX routes to Retry Queue.' },
        { work: '', retry: 'payment_123 (waiting 5s)', dlq: '', xdeath: '[{"queue":"work","reason":"rejected","count":1,"time":"now"}]', info: 'Message enters Retry Queue. TTL starts (5 seconds). Message waits.' },
        { work: 'payment_123 (attempt 2)', retry: '', dlq: '', xdeath: '[{"queue":"work","reason":"rejected","count":1}] — TTL expired, back to work queue!', info: 'TTL expires! Retry Queue dead-letters BACK to work exchange. Attempt 2 begins.' },
        { work: '', retry: 'payment_123 (waiting 5s)', dlq: '', xdeath: '[{"queue":"work","reason":"rejected","count":2}]', info: 'Fails again. count=2 in x-death. Back to retry queue.' },
        { work: '', retry: '', dlq: 'payment_123 ⚰️', xdeath: '[{"queue":"work","reason":"rejected","count":3}] — count >= 3, send to DLQ!', info: 'count >= 3! Consumer detects max retries exceeded. Routes to DLQ. Alert engineers.' }
      ];
      var rStep = 0, rTimer = null, rPlaying = false;

      function renderRetry() {
        var s = retrySteps[rStep];
        var wEl = document.getElementById('dl-rq-work');
        var rEl = document.getElementById('dl-rq-retry');
        var dEl = document.getElementById('dl-rq-dlq');
        wEl.innerHTML = s.work ? '<div style="background:#3fb950;color:#0d1117;border-radius:12px;padding:5px 12px;font-size:11px;font-weight:bold;display:inline-block">' + s.work + '</div>' : '';
        rEl.innerHTML = s.retry ? '<div style="background:#f59134;color:#0d1117;border-radius:12px;padding:5px 12px;font-size:11px;font-weight:bold;display:inline-block">' + s.retry + '</div>' : '';
        dEl.innerHTML = s.dlq ? '<div style="background:#da3633;color:#fff;border-radius:12px;padding:5px 12px;font-size:11px;font-weight:bold;display:inline-block">' + s.dlq + '</div>' : '';
        document.getElementById('dl-xdeath').textContent = s.xdeath;
        document.getElementById('dl-retry-info').textContent = s.info;
      }

      document.getElementById('dl-r-play').addEventListener('click', function () {
        rPlaying = !rPlaying;
        this.textContent = rPlaying ? '⏸ Pause' : '▶ Play';
        if (rPlaying) {
          rTimer = setInterval(function () {
            rStep = (rStep + 1) % retrySteps.length;
            renderRetry();
          }, 1800);
        } else { clearInterval(rTimer); }
      });
      document.getElementById('dl-r-next').addEventListener('click', function () { rStep = Math.min(rStep + 1, retrySteps.length - 1); renderRetry(); });
      document.getElementById('dl-r-prev').addEventListener('click', function () { rStep = Math.max(rStep - 1, 0); renderRetry(); });
      document.getElementById('dl-r-reset').addEventListener('click', function () {
        clearInterval(rTimer); rPlaying = false;
        document.getElementById('dl-r-play').textContent = '▶ Play';
        rStep = 0; renderRetry();
      });
      renderRetry();

      // --- TAB 3: Reasons ---
      var reasons = {
        rejected: {
          title: 'rejected',
          desc: 'Consumer explicitly nacks or rejects message with requeue=false. Most common. Use when message is malformed or business logic fails permanently.',
          code: `// Consumer rejects bad message
channel.consume('work.queue', function(msg) {
  try {
    processPayment(JSON.parse(msg.content));
    channel.ack(msg);
  } catch(e) {
    // requeue=false → dead-letters to DLX
    channel.nack(msg, false, false);
  }
});`,
          color: '#da3633',
          flow: ['Consumer reads msg', '→ Processing FAILS', '→ nack(requeue=false)', '→ Broker dead-letters', '→ DLX → DLQ']
        },
        expired: {
          title: 'expired',
          desc: 'Message TTL elapsed before consumer read it. Set via x-message-ttl on queue or expiration property on message. Silent — no consumer involvement.',
          code: `// Queue-level TTL
channel.assertQueue('alerts', {
  arguments: { 'x-message-ttl': 60000 } // 1 min
});

// Per-message TTL (overrides queue TTL if lower)
channel.publish('ex', 'key', data, {
  expiration: '30000'  // 30 seconds
});`,
          color: '#f0883e',
          flow: ['Message published', '→ Sits in queue', '→ TTL expires (no consumer)', '→ Broker dead-letters', '→ DLX → DLQ']
        },
        maxlen: {
          title: 'maxlen',
          desc: 'Queue full (x-max-length exceeded) and x-overflow=drop-head. Oldest message(s) dropped and dead-lettered. Prevents memory exhaustion.',
          code: `// Bounded queue — drop oldest when full
channel.assertQueue('events', {
  arguments: {
    'x-max-length': 1000,
    'x-overflow': 'drop-head',           // oldest dropped
    'x-dead-letter-exchange': 'dlx.events'
  }
});
// Alternative: reject-publish (publisher gets error)
// 'x-overflow': 'reject-publish'`,
          color: '#a371f7',
          flow: ['Queue at max capacity', '→ New message arrives', '→ Oldest msg evicted', '→ Broker dead-letters', '→ DLX → DLQ']
        }
      };

      function renderReason(key) {
        var r = reasons[key];
        document.getElementById('dl-reason-title').textContent = r.title;
        document.getElementById('dl-reason-title').style.color = r.color;
        document.getElementById('dl-reason-desc').textContent = r.desc;
        document.getElementById('dl-reason-code').innerHTML = '<pre style="margin:0;font-size:11px">' + r.code + '</pre>';
        var anim = document.getElementById('dl-reason-anim');
        anim.innerHTML = r.flow.map(function (step, i) {
          return '<div style="padding:8px 12px;margin-bottom:6px;border-radius:5px;background:#161b22;border:1px solid ' + (i === r.flow.length - 1 ? r.color : '#30363d') + ';color:' + (i === r.flow.length - 1 ? r.color : '#cdd9e5') + ';font-size:12px;transition:all .3s">' + step + '</div>';
        }).join('');
        document.getElementById('dl-reasons-info').textContent = 'Reason: ' + r.title + ' — ' + r.desc.substring(0, 80) + '...';
        ['rejected', 'expired', 'maxlen'].forEach(function (k) {
          document.getElementById('dl-reason-' + k).classList.toggle('active', k === key);
        });
      }

      ['rejected', 'expired', 'maxlen'].forEach(function (k) {
        document.getElementById('dl-reason-' + k).addEventListener('click', function () { renderReason(k); });
      });
      renderReason('rejected');

      // --- TAB 4: Interview ---
      var qas = [
        { q: 'What happens if DLQ itself fills up?', a: 'Messages are dropped (if x-max-length set) or queue grows unbounded. Best practice: monitor DLQ length, alert at threshold. Never put DLX on a DLQ (infinite loop).' },
        { q: 'Difference between reject and nack?', a: 'reject = single message. nack = can reject multiple (multiple=true). Both accept requeue flag. Functionally identical for dead-lettering purposes.' },
        { q: 'How to prevent DLQ infinite loops?', a: 'Check x-death[count] before nacking. If count >= maxRetries, log and ack (discard) or route to a final-dead queue without DLX configured.' },
        { q: 'Can you set different TTL per message?', a: 'Yes — expiration property on publish (milliseconds as string). If both queue TTL and message TTL set, lower value wins.' },
        { q: 'How does quorum queue handle dead-lettering?', a: 'Quorum queues support at-least-once dead-lettering. Classic queues use at-most-once. Use x-dead-letter-strategy: at-least-once for safety.' }
      ];

      document.getElementById('dl-qa-list').innerHTML = qas.map(function (qa, i) {
        return '<div style="background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer" onclick="this.querySelector(\'.dl-ans\').style.display=this.querySelector(\'.dl-ans\').style.display===\'none\'?\'block\':\'none\'">' +
          '<div style="color:#f59134;font-size:12px;font-weight:bold">Q' + (i + 1) + ': ' + qa.q + '</div>' +
          '<div class="dl-ans" style="display:none;color:#cdd9e5;font-size:12px;margin-top:8px;line-height:1.6">' + qa.a + '</div></div>';
      }).join('');

      // WRONG vs CORRECT visual
      var wrongRight = [
        {
          wrong: 'nack(msg, false, true)\n// requeue=true → goes BACK\n// to same queue, NOT to DLX',
          right: 'nack(msg, false, false)\n// requeue=false → triggers\n// dead-lettering to DLX',
          label: 'nack requeue flag'
        },
        {
          wrong: '// DLQ with its OWN DLX\nchannel.assertQueue("dlq", {\n  arguments: {\n    "x-dead-letter-exchange": "dlx2"\n  }\n});\n// INFINITE LOOP!',
          right: '// DLQ has NO x-dead-letter-exchange\nchannel.assertQueue("payment.dlq", {\n  durable: true\n  // no DLX — messages stay here\n});',
          label: 'DLQ config'
        },
        {
          wrong: 'channel.publish(ex, key, data, {\n  expiration: 30000  // NUMBER\n});\n// Silently ignored — no TTL!',
          right: 'channel.publish(ex, key, data, {\n  expiration: "30000"  // STRING\n});\n// TTL works correctly',
          label: 'TTL type'
        }
      ];

      var wcHtml = '<div style="color:#a371f7;font-size:12px;font-weight:bold;margin-bottom:10px">⚠️ WRONG vs ✓ CORRECT</div>';
      wcHtml += wrongRight.map(function (item) {
        return '<div style="margin-bottom:12px"><div style="color:#768390;font-size:10px;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px">' + item.label + '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<div style="background:#0d1117;border:2px solid #da3633;border-radius:6px;padding:10px">' +
          '<div style="color:#da3633;font-size:10px;font-weight:bold;margin-bottom:6px">❌ WRONG</div>' +
          '<pre style="color:#cdd9e5;font-size:10px;margin:0;white-space:pre-wrap">' + item.wrong + '</pre></div>' +
          '<div style="background:#0d1117;border:2px solid #3fb950;border-radius:6px;padding:10px">' +
          '<div style="color:#3fb950;font-size:10px;font-weight:bold;margin-bottom:6px">✓ CORRECT</div>' +
          '<pre style="color:#cdd9e5;font-size:10px;margin:0;white-space:pre-wrap">' + item.right + '</pre></div>' +
          '</div></div>';
      }).join('');
      document.getElementById('dl-gotcha-list').innerHTML = wcHtml;

      // Production story card
      var prodStory = document.createElement('div');
      prodStory.style.cssText = 'background:#0d1117;border:1px solid #f59134;border-radius:8px;padding:14px;margin-bottom:14px';
      prodStory.innerHTML = '<div style="color:#f59134;font-size:12px;font-weight:bold;margin-bottom:6px">🏭 Production Story</div>' +
        '<div style="color:#cdd9e5;font-size:12px;line-height:1.7">Payment service at 50K RPM. 0.3% messages fail JSON parse (malformed upstream). Without DLQ → messages nacked+requeued → CPU spike, infinite loop, queue floods 500K+ msgs, OOM. Fix: DLQ + retry with x-death count. Now: bad msgs quarantined in 250ms, alerting fires, engineers inspect.</div>';
      document.getElementById('dl-qa-list').parentNode.insertBefore(prodStory, document.getElementById('dl-qa-list'));
    },

    gotchas: [
      "DLX on DLQ = infinite loop",
      "x-death count can reset on routing key change",
      "Per-message expiration must be string not number",
      "DLQ not monitored = silent message loss"
    ],
    interview: [
      "How to implement exponential backoff with RabbitMQ?",
      "What triggers dead-lettering — all three reasons?",
      "How to avoid infinite retry loops?",
      "Difference between classic and quorum queue dead-lettering guarantees?"
    ],
    tradeoffs: "DLQ pros: no message loss, retry visibility, debugging. Cons: operational overhead, DLQ must be monitored, retry pattern adds latency. Alternative: idempotent consumer + discard."
  };

  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
