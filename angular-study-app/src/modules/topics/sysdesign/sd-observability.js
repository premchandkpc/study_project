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
