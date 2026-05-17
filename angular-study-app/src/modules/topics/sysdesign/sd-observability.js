(function() {
  var topic = {
  id:"sd-observability", area:"sysdesign",
  title:"Observability — Metrics, Logs, Traces & Alerting",
  tag:"Operations", tags:["observability","prometheus","grafana","jaeger","opentelemetry","structured logging","sre","slo","sla","red method"],
  concept:`**The three pillars of observability:**

**1. Metrics** — aggregated numerical measurements over time.
- **RED method** (for services): Rate (requests/s), Errors (error rate %), Duration (latency p50/p95/p99)
- **USE method** (for resources): Utilisation, Saturation, Errors
- Stack: **Prometheus** (scrape + store) + **Grafana** (visualise) + **AlertManager** (alert)
- Pull model: Prometheus scrapes \`/metrics\` endpoint every 15s
- Cardinality warning: labels on metrics multiply storage. Never use userId as a label.

**2. Logs** — timestamped, structured records of events.
- **Structured logging** (JSON) enables filtering and aggregation: \`{"level":"ERROR","orderId":"42","service":"payment","latencyMs":234}\`
- Stack: **Fluentd/Fluent Bit** (collect) → **Elasticsearch** (index) → **Kibana** (search)
- Log levels: TRACE > DEBUG > INFO > WARN > ERROR. Production: INFO minimum.
- Correlation ID: propagate \`X-Request-ID\` header through all services; log it on every line.

**3. Distributed Traces** — end-to-end request journey across services.
- **OpenTelemetry** (OTel): vendor-neutral instrumentation standard. One SDK for metrics + logs + traces.
- Each request gets a **TraceId**. Each service creates a **Span** (start time, duration, tags).
- Stack: **OTel SDK** → **Jaeger / Zipkin / Tempo** (collect + visualise)
- Find which service in a 20-hop chain caused 500ms tail latency.

**SLO/SLI/SLA:**
- **SLI** (Service Level Indicator) — actual metric (error rate, p99 latency)
- **SLO** (Service Level Objective) — target (error rate < 0.1%, p99 < 200ms)
- **SLA** (Service Level Agreement) — contractual commitment with penalty
- **Error budget** = 100% - SLO availability. If consumed, freeze risky changes.`,
  why:`You can't fix what you can't see. Observability is the difference between resolving incidents in 5 minutes and 5 hours. SLO/error budgets are used at Google, Netflix, Spotify to balance reliability vs velocity.`,
  example:{
    language:"java",
    code:`// Spring Boot — Micrometer + OpenTelemetry + structured logging
@RestController
public class OrderController {

    private final Counter orderCounter;
    private final Timer orderLatency;
    private final Tracer tracer;

    public OrderController(MeterRegistry registry, Tracer tracer) {
        this.orderCounter = Counter.builder("orders.created")
            .tag("service", "order-service")
            .register(registry);
        this.orderLatency = Timer.builder("orders.latency")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
        this.tracer = tracer;
    }

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest req) {
        Span span = tracer.spanBuilder("createOrder").startSpan();
        try (var scope = span.makeCurrent()) {
            span.setAttribute("order.customerId", req.getCustomerId());

            Timer.Sample sample = Timer.start();
            Order order = orderService.create(req);
            sample.stop(orderLatency);

            orderCounter.increment();

            // Structured log — JSON with trace correlation
            log.info("Order created orderId={} customerId={} total={} traceId={}",
                order.getId(), req.getCustomerId(), order.getTotal(),
                span.getSpanContext().getTraceId());

            return ResponseEntity.ok(order);
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR);
            throw e;
        } finally {
            span.end();
        }
    }
}

// Prometheus alert rule
// groups:
//   - name: order-service
//     rules:
//       - alert: HighErrorRate
//         expr: rate(http_requests_total{status=~"5.."}[5m])
//               / rate(http_requests_total[5m]) > 0.01
//         for: 2m
//         labels: { severity: critical }
//         annotations:
//           summary: "Error rate {{ $value | humanizePercentage }}"`,
    notes:"OpenTelemetry auto-instrumentation (Java agent: -javaagent:opentelemetry-javaagent.jar) adds traces to Spring, JDBC, Kafka without code changes."
  },
  interview:[
    {question:"How do you find the root cause of a latency spike in a microservices system?",
     answer:`Systematic approach:\n1. **Start with metrics (RED dashboard)** — which service has elevated p99 latency or error rate? Grafana alert fires.\n2. **Check SLO burn rate** — is error budget being consumed? How fast?\n3. **Find the service** — Grafana service map / dependency graph shows which service in the call chain is slow.\n4. **Drill into traces (Jaeger)** — filter traces for the time window. Find traces with p99 latency. Click the slowest trace — spans show exactly where time was spent.\n5. **Cross-reference logs** — use TraceId from Jaeger to find correlated logs in Kibana. Structured logs reveal the exact DB query, cache miss, or timeout.\n6. **Infrastructure metrics** — check CPU, memory, IO, network for the pod (Kubernetes dashboard, AWS CloudWatch).\n\nTotal time: 5-10 minutes with good observability vs hours without.`,
     followUps:["What is an error budget and how do you use it to make decisions?","What is the difference between monitoring and observability?"]
    }
  ],
  tradeoffs:{
    pros:["Fast incident resolution — MTTR from hours to minutes","Data-driven capacity planning","SLO-based alerting reduces alert fatigue vs threshold alerting"],
    cons:["Cardinality explosion in metrics if labels not controlled","Trace sampling needed at high volume (100% tracing = 10% overhead)","Storage costs for logs + traces at scale"],
    when:"Instrument from day one. Retrofitting observability into production is painful. Use OpenTelemetry standard — avoids vendor lock-in. Set SLOs before you set alerts."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;background:#0d1117;border-radius:8px;padding:12px;color:#e6edf3;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    var ctx = canvas.getContext('2d');

    var currentTab = 'traces';
    var animFrame = 0;
    var animId = null;

    // Trace spans: [name, startMs, durationMs, depth, color]
    var spans = [
      { name:'Client Request',  start:0,   dur:250, depth:0, color:'#58a6ff' },
      { name:'API Gateway',     start:0,   dur:10,  depth:1, color:'#3fb950' },
      { name:'Auth Service',    start:10,  dur:20,  depth:1, color:'#ffa657' },
      { name:'Order Service',   start:30,  dur:170, depth:1, color:'#58a6ff' },
      { name:'DB Query',        start:80,  dur:50,  depth:2, color:'#bc8cff' },
      { name:'Redis GET',       start:50,  dur:10,  depth:2, color:'#3fb950' },
      { name:'Response',        start:240, dur:10,  depth:1, color:'#3fb950' }
    ];
    var totalMs = 250;

    function drawTraces() {
      var W = canvas.width, H = canvas.height;
      var leftPad = 115, rightPad = 12;
      var chartW = W - leftPad - rightPad;
      var rowH = 28, startY = 30;

      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'left';
      ctx.fillText('Span', 8, startY - 6);
      ctx.textAlign = 'right';
      ctx.fillText('0ms', leftPad, startY - 6);
      ctx.fillText('250ms', W - rightPad, startY - 6);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
      ctx.setLineDash([2,4]);
      [0.25, 0.5, 0.75].forEach(function(t) {
        var x = leftPad + chartW * t;
        ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, startY + spans.length * rowH); ctx.stroke();
        ctx.font = '7px monospace'; ctx.fillStyle = '#30363d'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(t * totalMs) + 'ms', x, startY + spans.length * rowH + 10);
      });
      ctx.setLineDash([]);

      spans.forEach(function(s, i) {
        var y = startY + i * rowH;
        var appear = animFrame > i * 12;

        // Row bg
        ctx.fillStyle = i % 2 === 0 ? '#ffffff08' : '#00000000';
        ctx.fillRect(0, y, W, rowH - 2);

        // Indent + label
        var indent = s.depth * 10;
        ctx.font = '9px monospace';
        ctx.fillStyle = appear ? s.color : '#30363d';
        ctx.textAlign = 'left';
        ctx.fillText((s.depth > 0 ? '└ ' : '') + s.name, 8 + indent, y + 16);

        if (!appear) return;

        // Bar
        var bx = leftPad + (s.start / totalMs) * chartW;
        var bw = Math.max(4, (s.dur / totalMs) * chartW);
        var progress = Math.min(1, (animFrame - i * 12) / 18);
        bw = bw * progress;

        ctx.fillStyle = s.color + '44';
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(bx, y + 4, bw, 14, 3); ctx.fill(); ctx.stroke();

        // Duration label
        if (progress >= 1) {
          ctx.font = '8px monospace'; ctx.fillStyle = s.color; ctx.textAlign = 'left';
          ctx.fillText(s.dur + 'ms', bx + bw + 2, y + 14);
        }
      });

      // TraceId
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'left';
      ctx.fillText('TraceId: 4a7f2c…9d31  |  Total: 250ms', 8, H - 8);
    }

    // Metrics: Prometheus scrape flow
    function drawMetrics() {
      var W = canvas.width, H = canvas.height;
      var nodes = [
        { label:'Service\n/metrics', x:80,  y:100, color:'#58a6ff' },
        { label:'Prometheus\nscrape', x:230, y:100, color:'#ffa657' },
        { label:'AlertManager', x:380, y:60,  color:'#f85149', small:true },
        { label:'Grafana\nDashboard',x:380, y:140, color:'#3fb950', small:true }
      ];
      var arrows = [
        { from:0, to:1, label:'pull /metrics\nevery 15s', color:'#ffa657' },
        { from:1, to:2, label:'alert rules', color:'#f85149' },
        { from:1, to:3, label:'PromQL queries', color:'#3fb950' }
      ];

      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffa657'; ctx.textAlign = 'center';
      ctx.fillText('Prometheus Metrics Pipeline', W/2, 22);

      // RED method box
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#ffa65766'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(10, 36, 170, 40, 4); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#ffa657'; ctx.textAlign = 'center';
      ctx.fillText('RED Method', 95, 52);
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.fillText('Rate · Errors · Duration', 95, 68);

      arrows.forEach(function(a, ai) {
        var fn = nodes[a.from], tn = nodes[a.to];
        if (animFrame < ai * 25) return;
        var progress = Math.min(1, (animFrame - ai * 25) / 20);
        var mx = fn.x + (tn.x - fn.x) * progress;
        var my = fn.y + (tn.y - fn.y) * progress;

        ctx.strokeStyle = a.color + '88'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(fn.x + 30, fn.y); ctx.lineTo(tn.x - 30, tn.y); ctx.stroke();
        ctx.setLineDash([]);

        // Moving dot
        ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI*2);
        ctx.fillStyle = a.color; ctx.shadowColor = a.color; ctx.shadowBlur = 8;
        ctx.fill(); ctx.shadowBlur = 0;

        ctx.font = '8px monospace'; ctx.fillStyle = a.color; ctx.textAlign = 'center';
        var lx = (fn.x + tn.x)/2, ly = (fn.y + tn.y)/2 - 10;
        a.label.split('\n').forEach(function(l, li) { ctx.fillText(l, lx, ly + li*11); });
      });

      nodes.forEach(function(n) {
        var nw = n.small ? 80 : 90, nh = n.small ? 30 : 44;
        ctx.fillStyle = n.color + '22'; ctx.strokeStyle = n.color + 'aa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(n.x - nw/2, n.y - nh/2, nw, nh, 6); ctx.fill(); ctx.stroke();
        ctx.font = '9px monospace'; ctx.fillStyle = n.color; ctx.textAlign = 'center';
        n.label.split('\n').forEach(function(l, li) {
          ctx.fillText(l, n.x, n.y - 4 + li * 14);
        });
      });

      // Cardinality warning
      ctx.fillStyle = '#f8514922'; ctx.strokeStyle = '#f8514966'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(8, 210, W - 16, 50, 4); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#f85149'; ctx.textAlign = 'left';
      ctx.fillText('⚠ Cardinality Warning', 16, 228);
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.fillText('Never use userId as a metric label.', 16, 242);
      ctx.fillText('1M users × 10 metrics = 10M time series = OOM', 16, 255);
    }

    // Logs: pipeline flow
    function drawLogs() {
      var W = canvas.width, H = canvas.height;
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#bc8cff'; ctx.textAlign = 'center';
      ctx.fillText('Structured Log Pipeline', W/2, 22);

      // Log example box
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#bc8cff44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(8, 34, W - 16, 52, 4); ctx.fill(); ctx.stroke();
      ctx.font = '8px monospace'; ctx.textAlign = 'left';
      var logLine = '{"level":"ERROR","service":"payment","orderId":"42","latencyMs":234,"traceId":"4a7f2c"}';
      var parts = [
        { t:'"level":', c:'#e3b341' }, { t:'"ERROR"', c:'#f85149' },
        { t:'  "service":', c:'#e3b341' }, { t:'"payment"', c:'#3fb950' },
        { t:'  "orderId":', c:'#e3b341' }, { t:'"42"', c:'#58a6ff' },
        { t:'  "latencyMs":', c:'#e3b341' }, { t:'234', c:'#ffa657' },
        { t:'  "traceId":', c:'#e3b341' }, { t:'"4a7f2c…"', c:'#bc8cff' }
      ];
      var lx = 14, ly = 52;
      ctx.fillStyle = '#8b949e'; ctx.fillText('{', lx, ly); lx += 8;
      parts.forEach(function(p) {
        ctx.fillStyle = p.c; ctx.fillText(p.t, lx, ly);
        lx += ctx.measureText(p.t).width + 2;
        if (lx > W - 20) { lx = 22; ly += 13; }
      });

      // Pipeline nodes
      var pnodes = [
        { label:'App\n(stdout)', x:70,  y:148, color:'#58a6ff' },
        { label:'Fluent\nBit', x:185, y:148, color:'#bc8cff' },
        { label:'Elastic\nsearch', x:300, y:148, color:'#ffa657' },
        { label:'Kibana', x:400, y:148, color:'#3fb950', small:true }
      ];

      for (var i = 0; i < pnodes.length - 1; i++) {
        var fn = pnodes[i], tn = pnodes[i+1];
        if (animFrame < i * 22) continue;
        var pr = Math.min(1, (animFrame - i * 22) / 18);
        var dx = fn.x + (tn.x - fn.x) * pr, dy = fn.y;
        ctx.strokeStyle = fn.color + '66'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(fn.x + 28, fn.y); ctx.lineTo(tn.x - 28, tn.y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI*2);
        ctx.fillStyle = fn.color; ctx.shadowColor = fn.color; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      }

      pnodes.forEach(function(n) {
        var nw = n.small ? 60 : 72, nh = 38;
        ctx.fillStyle = n.color + '22'; ctx.strokeStyle = n.color + 'aa'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect(n.x - nw/2, n.y - nh/2, nw, nh, 6); ctx.fill(); ctx.stroke();
        ctx.font = '9px monospace'; ctx.fillStyle = n.color; ctx.textAlign = 'center';
        n.label.split('\n').forEach(function(l, li) { ctx.fillText(l, n.x, n.y - 4 + li*14); });
      });

      // Correlation ID tip
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#58a6ff44'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(8, 186, W - 16, 36, 4); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#58a6ff'; ctx.textAlign = 'left';
      ctx.fillText('Correlation ID: X-Request-ID', 14, 204);
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.fillText('Propagate through ALL services → log on every line → find in Kibana', 14, 216);

      // Log levels
      var levels = [
        { l:'TRACE', c:'#8b949e' }, { l:'DEBUG', c:'#58a6ff' }, { l:'INFO', c:'#3fb950' },
        { l:'WARN', c:'#e3b341' }, { l:'ERROR', c:'#f85149' }
      ];
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      var lstart = 14;
      levels.forEach(function(lv) {
        ctx.fillStyle = lv.c + '33'; ctx.strokeStyle = lv.c; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(lstart, 232, 76, 16, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = lv.c;
        ctx.fillText(lv.l, lstart + 38, 244);
        lstart += 82;
      });
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
      ctx.fillText('Production: INFO minimum →', W/2, 263);

      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'center';
      ctx.fillText('30-day hot retention → S3/Glacier cold archive', W/2, H - 6);
    }

    function draw() {
      if (!document.body.contains(canvas)) { if (animId) cancelAnimationFrame(animId); return; }
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      if (currentTab === 'traces') drawTraces();
      else if (currentTab === 'metrics') drawMetrics();
      else drawLogs();

      animId = requestAnimationFrame(tick);
    }

    function tick() {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(animId); return; }
      animFrame++;
      if (currentTab === 'metrics' && animFrame > 120) animFrame = 0;
      if (currentTab === 'logs' && animFrame > 110) animFrame = 0;
      if (currentTab === 'traces' && animFrame > spans.length * 12 + 30) animFrame = spans.length * 12 + 30;
      draw();
    }

    var tabs = [
      { key:'traces',  label:'[Traces]' },
      { key:'metrics', label:'[Metrics]' },
      { key:'logs',    label:'[Logs]' }
    ];
    tabs.forEach(function(t) {
      var btn = document.createElement('button');
      btn.textContent = t.label;
      btn.style.cssText = btnStyle;
      btn.addEventListener('click', function() { currentTab = t.key; animFrame = 0; });
      btnRow.appendChild(btn);
    });

    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);
    tick();
  },
  architecture:{
    title:"Observability Stack",
    caption:"Three pillars: metrics (Prometheus), logs (ELK), traces (Jaeger) unified by OpenTelemetry",
    lanes:[
      {label:"Application",nodes:[
        {id:"app-otel",label:"App + OTel SDK",hint:"Auto-instrumented Java/Go/Python",detail:"OpenTelemetry SDK auto-instruments HTTP, DB, gRPC. Emits metrics, logs, and traces via OTLP protocol."}
      ]},
      {label:"Collection",nodes:[
        {id:"otel-collector",label:"OTel Collector",hint:"Fan-out to multiple backends",detail:"Receives OTLP from apps. Routes metrics to Prometheus, logs to Elasticsearch, traces to Jaeger. One agent per node."},
        {id:"fluent-bit",label:"Fluent Bit",hint:"Log collection from files",detail:"Lightweight log shipper. Reads stdout/file logs, enriches with pod metadata, forwards to Elasticsearch."}
      ]},
      {label:"Storage",nodes:[
        {id:"prometheus",label:"Prometheus",hint:"Time-series metrics",detail:"Scrapes /metrics endpoints. Stores TSDB with 15-day retention. Fires alerts via AlertManager."},
        {id:"elasticsearch",label:"Elasticsearch",hint:"Log indexing + search",detail:"Full-text log indexing. Kibana for ad-hoc query. 30-day hot retention → S3 for cold."},
        {id:"jaeger",label:"Jaeger",hint:"Distributed traces",detail:"Stores spans. 7-day retention (traces are large). Cassandra or Elasticsearch backend."}
      ]},
      {label:"Visualization",nodes:[
        {id:"grafana",label:"Grafana",hint:"Dashboards + alerts",detail:"Unified dashboard for all data sources (Prometheus, Elasticsearch, Jaeger, Loki). SLO dashboards, RED method panels."},
        {id:"alertmanager",label:"AlertManager",hint:"Route alerts → PagerDuty / Slack",detail:"Deduplicates and routes Prometheus alerts to on-call engineer. Silence during maintenance windows."}
      ]}
    ],
    links:[
      {from:"app-otel",to:"otel-collector",label:"OTLP (gRPC)",detail:"App sends metrics + traces to local OTel Collector via gRPC port 4317.",type:"async"},
      {from:"fluent-bit",to:"elasticsearch",label:"Logs (HTTP)",detail:"Fluent Bit ships JSON logs to Elasticsearch index.",type:"async"},
      {from:"otel-collector",to:"prometheus",label:"Metrics",detail:"Collector exposes Prometheus scrape endpoint or remote_write.",type:"async"},
      {from:"otel-collector",to:"jaeger",label:"Traces",detail:"OTLP trace spans forwarded to Jaeger collector.",type:"async"},
      {from:"prometheus",to:"alertmanager",label:"Alert rules",detail:"PromQL alerting rules evaluated every 15s.",type:"sync"},
      {from:"alertmanager",to:"grafana",label:"Alert state",detail:"Alert states displayed on Grafana dashboards.",type:"async"},
      {from:"grafana",to:"prometheus",label:"PromQL queries",detail:"Grafana panels execute PromQL to render graphs.",type:"sync"},
      {from:"grafana",to:"jaeger",label:"Trace link",detail:"Grafana links from metric anomaly to correlated trace in Jaeger.",type:"sync"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
