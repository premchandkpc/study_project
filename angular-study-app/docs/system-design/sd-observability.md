# Observability - Metrics, Logs, Traces & Alerting

Source: `src/modules/topics/sysdesign/sd-observability.js`
Tag: `Operations`
Doc path: `docs/system-design/sd-observability.md`

## Concept
**The three pillars of observability:**

**1. Metrics** - aggregated numerical measurements over time.
- **RED method** (for services): Rate (requests/s), Errors (error rate %), Duration (latency p50/p95/p99)
- **USE method** (for resources): Utilisation, Saturation, Errors
- Stack: **Prometheus** (scrape + store) + **Grafana** (visualise) + **AlertManager** (alert)
- Pull model: Prometheus scrapes `/metrics` endpoint every 15s
- Cardinality warning: labels on metrics multiply storage. Never use userId as a label.

**2. Logs** - timestamped, structured records of events.
- **Structured logging** (JSON) enables filtering and aggregation: `{"level":"ERROR","orderId":"42","service":"payment","latencyMs":234}`
- Stack: **Fluentd/Fluent Bit** (collect) -> **Elasticsearch** (index) -> **Kibana** (search)
- Log levels: TRACE > DEBUG > INFO > WARN > ERROR. Production: INFO minimum.
- Correlation ID: propagate `X-Request-ID` header through all services; log it on every line.

**3. Distributed Traces** - end-to-end request journey across services.
- **OpenTelemetry** (OTel): vendor-neutral instrumentation standard. One SDK for metrics + logs + traces.
- Each request gets a **TraceId**. Each service creates a **Span** (start time, duration, tags).
- Stack: **OTel SDK** -> **Jaeger / Zipkin / Tempo** (collect + visualise)
- Find which service in a 20-hop chain caused 500ms tail latency.

**SLO/SLI/SLA:**
- **SLI** (Service Level Indicator) - actual metric (error rate, p99 latency)
- **SLO** (Service Level Objective) - target (error rate < 0.1%, p99 < 200ms)
- **SLA** (Service Level Agreement) - contractual commitment with penalty
- **Error budget** = 100% - SLO availability. If consumed, freeze risky changes.

## Production Architecture
You can't fix what you can't see. Observability is the difference between resolving incidents in 5 minutes and 5 hours. SLO/error budgets are used at Google, Netflix, Spotify to balance reliability vs velocity.

## Architecture Checklist
- Application / App + OTel SDK: OpenTelemetry SDK auto-instruments HTTP, DB, gRPC. Emits metrics, logs, and traces via OTLP protocol.
- Collection / OTel Collector: Receives OTLP from apps. Routes metrics to Prometheus, logs to Elasticsearch, traces to Jaeger. One agent per node.
- Collection / Fluent Bit: Lightweight log shipper. Reads stdout/file logs, enriches with pod metadata, forwards to Elasticsearch.
- Storage / Prometheus: Scrapes /metrics endpoints. Stores TSDB with 15-day retention. Fires alerts via AlertManager.
- Storage / Elasticsearch: Full-text log indexing. Kibana for ad-hoc query. 30-day hot retention -> S3 for cold.
- Storage / Jaeger: Stores spans. 7-day retention (traces are large). Cassandra or Elasticsearch backend.
- Visualization / Grafana: Unified dashboard for all data sources (Prometheus, Elasticsearch, Jaeger, Loki). SLO dashboards, RED method panels.
- Visualization / AlertManager: Deduplicates and routes Prometheus alerts to on-call engineer. Silence during maintenance windows.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Application"]
    app_otel["App + OTel SDK"]
  end
  subgraph lane_1["Collection"]
    otel_collector["OTel Collector"]
    fluent_bit["Fluent Bit"]
  end
  subgraph lane_2["Storage"]
    prometheus["Prometheus"]
    elasticsearch["Elasticsearch"]
    jaeger["Jaeger"]
  end
  subgraph lane_3["Visualization"]
    grafana["Grafana"]
    alertmanager["AlertManager"]
  end
  app_otel -.->|"OTLP (gRPC)"| otel_collector
  fluent_bit -.->|"Logs (HTTP)"| elasticsearch
  otel_collector -.->|"Metrics"| prometheus
  otel_collector -.->|"Traces"| jaeger
  prometheus -->|"Alert rules"| alertmanager
  alertmanager -.->|"Alert state"| grafana
  grafana -->|"PromQL queries"| prometheus
  grafana -->|"Trace link"| jaeger
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Client
  participant a1 as Gateway
  participant a2 as Core Service
  participant a3 as Async Processor
  participant a4 as Storage
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Interview Drills
1. How do you find the root cause of a latency spike in a microservices system?
   Systematic approach:
   1. **Start with metrics (RED dashboard)** - which service has elevated p99 latency or error rate? Grafana alert fires.
   2. **Check SLO burn rate** - is error budget being consumed? How fast?
   3. **Find the service** - Grafana service map / dependency graph shows which service in the call chain is slow.
   4. **Drill into traces (Jaeger)** - filter traces for the time window. Find traces with p99 latency. Click the slowest trace - spans show exactly where time was spent.
   5. **Cross-reference logs** - use TraceId from Jaeger to find correlated logs in Kibana. Structured logs reveal the exact DB query, cache miss, or timeout.
   6. **Infrastructure metrics** - check CPU, memory, IO, network for the pod (Kubernetes dashboard, AWS CloudWatch).
   
   Total time: 5-10 minutes with good observability vs hours without.
   Follow-ups: What is an error budget and how do you use it to make decisions?; What is the difference between monitoring and observability?

## Trade-offs
Pros:
- Fast incident resolution - MTTR from hours to minutes
- Data-driven capacity planning
- SLO-based alerting reduces alert fatigue vs threshold alerting

Cons:
- Cardinality explosion in metrics if labels not controlled
- Trace sampling needed at high volume (100% tracing = 10% overhead)
- Storage costs for logs + traces at scale

When to use:
Instrument from day one. Retrofitting observability into production is painful. Use OpenTelemetry standard - avoids vendor lock-in. Set SLOs before you set alerts.

## Gotchas
_No gotchas yet._

