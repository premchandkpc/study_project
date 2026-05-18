# System Design Topics

**Topic file location:** `src/modules/topics/sysdesign/`
**Topic array:** `window.SYSDESIGN_TOPICS`
**Area string:** `"sysdesign"`
**Viz engine:** `window.ReactViz` + inline CSS animations

---

## Visual References (inputs/ folder)

All architecture visualizations MUST draw from these reference images:

| File                                             | What it shows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Use for                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs/image.png`                               | ByteByteGo: 6 patterns as pastel colored cards (Layered, Microservice, Event-Driven, Client-Server, Plugin-Based, Hexagonal)                                                                                                                                                                                                                                                                                                                                                                                                                | Architecture pattern card grid style — colored bg per pattern, icon top-left, flow diagram inside card                                                                    |
| `inputs/image copy 2.png`                        | 8 architecture patterns as connected mind-map with arrows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Multi-pattern overview page — connecting lines showing how patterns relate                                                                                                |
| `inputs/image copy 3.png`                        | ByteByteGo: Architecture Styles Wheel — central hub "Software Architecture Styles" with all styles radiating outward, outer ring has mini-diagrams per style                                                                                                                                                                                                                                                                                                                                                                                | Mental Map center node + radial first level — exact style reference                                                                                                       |
| `inputs/image copy 4.png`                        | Taxonomy grid: By Connections (REST/BFF/P2P/SOA/RPC) · By Events (PubSub/CQRS/EventSource/Reactive) · By Purpose (API Platform/DI Hub/Dev Portal) · By Composition (Microservices/Monolith/Nanoservices/Microkernel/Plugin/Layers) · By Data (Fabric/Mesh/Warehouse) · By Stream (Fast Data/Pipe&Filter/Brokers) · By Knowledge (Blackboard/Rule-Based/AutoML)                                                                                                                                                                              | Mental Map node grouping — 7 dimension clusters replace flat node soup                                                                                                    |
| `inputs/image copy 5.png`                        | Obsidian-style organic mind map — branches radiate with color gradient per branch, text at leaf nodes, no rigid structure                                                                                                                                                                                                                                                                                                                                                                                                                   | Mental Map Type 2 EXACT style reference — force-directed branches, color per cluster                                                                                      |
| `inputs/image copy 6.png`                        | Circle-node mind map — dark bg, overlapping circles with icons, connection lines                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Mental Map node visual style — use for node circle design + overlap physics                                                                                               |
| `inputs/image copy.png`                          | Green tree hierarchy — Main Program → Controller → Application layers                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Fallback for hierarchy views (classloader chain, DNS delegation, etc.)                                                                                                    |
| `inputs/Screenshot 2026-05-16 at 7.41.55 AM.png` | App UI — current topic page showing placeholder TODOs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Reminder of current state — all TODOs need real visuals                                                                                                                   |
| `inputs/image copy 7.png`                        | ByteByteGo: System Design Blueprint Ultimate Guide — full mega-architecture: DNS resolution flow (root→TLD→authoritative), Load Balancing (API GW + LB + Frontend + CDN/Edge), Distributed ID generator, Resource Locking, Message Dispatcher (pub/sub), Object Storage, Processing Workers, Upload Media pipeline, Distributed Cache (in-memory), Fan-out Services (Notification/Search/Analytics/Payment)                                                                                                                                 | **Master reference for full system design topics** — panel layout per layer, colored section boxes, numbered callouts, icon-per-service style                             |
| `inputs/image copy 8.png`                        | ByteByteGo: Database Scaling Cheatsheet — central pie/wheel with 7 DB scaling strategies radiating outward: Indexing (orange), Materialized Views (green), Vertical Scaling (pink), Sharding (blue), Replication (red), Caching (yellow), Denormalization (purple). Each section has mini-diagram + description                                                                                                                                                                                                                             | **DB scaling topic visual reference** — use wheel layout for `sd-db-*` topics. Replicate color-per-strategy approach                                                      |
| `inputs/image copy 9.png`                        | ByteByteGo: How to Design YouTube — numbered circular flow (①Upload Request → LB → ②Raw to Object Store → ③API Server saves Metadata → ④Video to Transcoding Server → ⑤Transcoded to Object Store → ⑥Notification → ⑦Metadata updated → ⑧Streaming Request via CDN → ⑨CDN fetches from Object Store). Light background, color-coded nodes (green=storage, red=cache, blue=api)                                                                                                                                                              | **Case study visual reference for video platform** — numbered arrows on circular/loop flow, reuse for `sd-case-video-platform.js`                                         |
| `inputs/image copy 10.png`                       | ByteByteGo: Microservice Architecture — Client (Web/Mobile/PC) → CDN → API Gateway → Domain A (Services A1/A2/A3 + DB A) + Domain B (Services B1/B2 + DB B). Side: Identity Provider ↔ API GW, Service Registry & Discovery ↔ services. Light green background sections per domain                                                                                                                                                                                                                                                          | **Microservice architecture reference** — grouped domain boxes, service registry side panel, identity provider callout. Use for `sd-microservice-design.js`               |
| `inputs/image copy 11.png`                       | ByteByteGo: Top 5 Kafka Use Cases — 5 horizontal swimlane rows: (1) Log Analysis: services→Kafka→Elastic→Kibana, (2) Data Streaming Recommendations: clickstream→Kafka→Flink→Data Lake→ML, (3) System Monitoring: services+agents→Kafka→Flink→Alerting, (4) CDC: source DB→transaction log→Kafka→Connectors (ES/Redis/DB)→Sinks, (5) System Migration: v1 services→Kafka→v2 services (shadow write)                                                                                                                                         | **Kafka use cases reference** — horizontal swimlane per use case, color-coded rows (blue/orange/red/yellow/purple). Use for `sd-kafka-arch.js` and any Kafka topic visual |
| `inputs/image copy 12.png`                       | ByteByteGo: How to Learn SQL — radial mind map on dark bg: SQL center → 6 branches: DDL (Database/Table/Constraints/View/Index + Create/Delete/Update/Rename), DQL (SELECT + FROM with all JOIN types + WHERE/GROUP BY/HAVING/ORDER BY/LIMIT), DML (INSERT/UPDATE/DELETE), DCL (GRANT/REVOKE), TCL (START/COMMIT/ROLLBACK), Operators (logical AND/OR/NOT + Update + Rename), Functions (Numeric/String/Datetime/Null), Data Types (Numeric/String/Datetime/Boolean/JSON). Color coded: DDL=brown, DQL=gold, DML=teal, DCL=blue, TCL=orange | **SQL/Database learning topic reference** — radial mind map with color-coded branches. Use for database topics visual style                                               |

---

## System Design Blueprint Layout (image copy 7.png)

Master reference for full-system topics. Key design decisions to copy:

```
Section boxes:        colored rounded-rect with label top-left (LOAD BALANCING, DATABASES, etc.)
Service nodes:        icon + label + bullet-list of responsibilities inside the node
Numbered callouts:    ① ② ③ circles on connection arrows showing request order
Connection arrows:    bidirectional where applicable, labeled with protocol/data type
Sub-sections:         nested boxes (e.g. "Microservices" box containing Domain A + B)
Side callouts:        floating boxes listing features/considerations per component
Color scheme:
  DNS/Networking:     pink (#ff9a9a) section bg
  Load Balancing:     light blue (#e8f4fd) section bg
  Databases:          light purple (#f0e8fd) section bg
  Messaging:          light yellow (#fdf8e8) section bg
  Storage:            light green (#e8fdf0) section bg
  Fan-out Services:   light orange (#fdf0e8) section bg
```

Apply this layout to: `sd-request-lifecycle.js`, `sd-load-balancing.js`, `sd-api-gateway.js`, all case study topics.

## Database Scaling Wheel Layout (image copy 8.png)

Use for all DB scaling topics. Wheel structure:

```
Center circle:  "DB Scaling Strategies" label
7 pie segments: each segment = one strategy, different color
Outer sections: mini-diagram + explanation paragraph per strategy
Layout:         2-column (wheel center-left, explanations surround)
Colors:         orange/green/pink/blue/red/yellow/purple (one per strategy)
```

Implement as: SVG pie chart with clickable segments → expands to show mini-diagram + explanation.

## YouTube-style Numbered Flow (image copy 9.png)

Use for all case study topics with circular/pipeline flows:

```
Node shapes:    rounded rectangles, colored by type (green=storage, red=cache, blue=api, yellow=processing)
Numbered steps: ① ② ③ circles on arrows in sequence order
Arrow style:    curved arrows following circular path
Background:     light gray (#f8f9fa)
Flow direction: clockwise circle with some cross-connections
```

Apply to: `sd-case-video-platform.js`, `sd-case-url-shortener.js`, upload/transcode pipelines.

## Kafka Use Cases Swimlane Layout (image copy 11.png)

Use for Kafka and messaging topics:

```
Layout:         horizontal swimlanes, one per use case
Row colors:     alternating colored left-border (blue/orange/red/yellow/purple)
Row label:      left side, vertical text or bold label
Flow direction: left → right within each row
Node icons:     service icons (Kafka logo, Elastic logo, etc.)
Arrow style:    thick connector arrows with protocol/data label
```

Apply to: `sd-kafka-arch.js`, `sd-messaging-patterns.js`, `sd-event-driven.js`.

## Microservice Domain Box Layout (image copy 10.png)

Use for microservice architecture topics:

```
Domain boxes:   grouped services inside rounded colored border (green tint per domain)
Side panels:    Identity Provider + Service Registry as floating side boxes with dotted connections
DB per service: each domain has its own DB directly below
Color coding:   Domain A = teal tint, Domain B = purple tint
Client tier:    Web/Mobile/PC icons top row
Gateway:        single API GW box between client tier and service domains
```

Apply to: `sd-microservice-design.js`, `sd-proxies-mesh.js`, `sd-security-auth.js`.

## SQL Mind Map Layout (image copy 12.png)

Use for database internal topics:

```
Center node:    large colored circle with subject label
Branches:       6-8 main branches radiating, each different color
Sub-branches:   2-3 levels deep, leaf nodes = smallest pills
Dark bg:        #1a1a2e or #0d1117
Connector lines: dashed colored lines matching branch color
Node shapes:    rounded rect pills, colored bg per branch
```

Apply to: `sd-db-relational.js`, `sd-db-nosql.js`, database internals topics.

---

## Architecture Pattern Card Grid (ByteByteGo Style)

Inspired by `inputs/image.png` — 6 colored cards layout.

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🟠 Layered      │  │ 🟢 Microservice │  │ 🟣 Event-Driven │
│                 │  │                 │  │                 │
│ Presentation    │  │ [MS] [MS] [MS] │  │ Producer        │
│ Business        │  │   ↕   ↕   ↕   │  │   → Topic       │
│ Persistence     │  │ [DB][DB][DB]   │  │       → Consumer│
│ Database        │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 🔵 Client-Server│  │ 🟡 Plugin-Based │  │ 🔴 Hexagonal    │
│                 │  │                 │  │                 │
│ Client ─────── │  │ Plugin  Plugin  │  │ Adapter  Adapt. │
│        Network │  │    ↓ Core ↓    │  │  Port Core Port │
│ ─────── Server │  │ Plugin  Plugin  │  │ Adapter  Adapt. │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

Card colors (match ByteByteGo palette):

- Layered: `#ff9a3c` orange header
- Microservice: `#4ecdc4` teal header
- Event-Driven: `#a855f7` purple header
- Client-Server: `#3b82f6` blue header
- Plugin-Based: `#f59e0b` amber header
- Hexagonal: `#ef4444` red header

Each card: hover → expands to show what/why/when. Click → opens full layered viz.

---

## Architecture Taxonomy Grid (mia-platform Style)

Inspired by `inputs/image copy 4.png` — group by dimension, not by name.

```
BY CONNECTIONS          BY EVENTS              BY PURPOSE
────────────────        ──────────────         ──────────────────
REST                    Pub/Sub                API Platform
Backend-for-Frontend    CQRS                   Digital Integration Hub
Peer-to-Peer            Event Source           Dev Portal
SOA                     Reactive Arch.         Internal Dev Platform
Client-Server/RPC                              Enterprise Platform

BY COMPOSITION          BY DATA                BY STREAM
────────────────        ──────────────         ──────────────
Microservices           Data Fabric            Fast Data
Monolith                Data Mesh              Pipe & Filters
Nanoservices            Data Warehouse         Brokers
Microkernel             Data-Centric (in DB)
Plug-ins
Components
Layers
```

Use this as Mental Map's 7-cluster grouping — each dimension = one color cluster.

---

## Topics Built

### Fundamentals

| File                      | Title                        | Tag          |
| ------------------------- | ---------------------------- | ------------ |
| `sd-request-lifecycle.js` | Request Lifecycle            | Networking   |
| `sd-dns-cdn.js`           | DNS & CDN                    | Networking   |
| `sd-protocols-http.js`    | HTTP/1 → HTTP/2 → HTTP/3     | Protocols    |
| `sd-protocols-grpc.js`    | gRPC & Protobuf              | Protocols    |
| `sd-api-gateway.js`       | API Gateway                  | Architecture |
| `sd-load-balancing.js`    | Load Balancing               | Scalability  |
| `sd-proxies-mesh.js`      | Reverse Proxy & Service Mesh | Networking   |

### Data Storage

| File                   | Title                | Tag         |
| ---------------------- | -------------------- | ----------- |
| `sd-db-relational.js`  | Relational Databases | Databases   |
| `sd-db-nosql.js`       | NoSQL Databases      | Databases   |
| `sd-db-cap.js`         | CAP Theorem          | Theory      |
| `sd-db-sharding.js`    | Database Sharding    | Scalability |
| `sd-caching-layers.js` | Caching Layers       | Performance |
| `sd-redis-patterns.js` | Redis Patterns       | Caching     |

### Messaging & Events

| File                       | Title                     | Tag          |
| -------------------------- | ------------------------- | ------------ |
| `sd-kafka-arch.js`         | Kafka Architecture        | Messaging    |
| `sd-messaging-patterns.js` | Messaging Patterns        | Architecture |
| `sd-event-driven.js`       | Event-Driven Architecture | Architecture |
| `sd-saga-patterns.js`      | Saga Patterns             | Distributed  |

### Infrastructure

| File                     | Title                  | Tag         |
| ------------------------ | ---------------------- | ----------- |
| `sd-compute-spectrum.js` | Compute Spectrum       | Cloud       |
| `sd-kubernetes-prod.js`  | Kubernetes Production  | K8s         |
| `sd-cloud-aws.js`        | AWS Cloud Architecture | Cloud       |
| `sd-observability.js`    | Observability Stack    | DevOps      |
| `sd-security-auth.js`    | Security & Auth        | Security    |
| `sd-resilience-all.js`   | Resilience Patterns    | Reliability |

### Microservices & LLD

| File                         | Title                | Tag          |
| ---------------------------- | -------------------- | ------------ |
| `sd-microservice-design.js`  | Microservice Design  | Architecture |
| `sd-lld-rate-limiter.js`     | Rate Limiter LLD     | LLD          |
| `sd-lld-consistent-hash.js`  | Consistent Hashing   | LLD          |
| `sd-lld-cache.js`            | LRU/LFU Cache LLD    | LLD          |
| `sd-lld-distributed-lock.js` | Distributed Lock LLD | LLD          |

### Case Studies

| File                        | Title                           | Tag        |
| --------------------------- | ------------------------------- | ---------- |
| `sd-case-url-shortener.js`  | URL Shortener                   | Case Study |
| `sd-case-social-feed.js`    | Social Feed (Twitter/Instagram) | Case Study |
| `sd-case-video-platform.js` | Video Platform (YouTube)        | Case Study |
| `sd-case-ride-sharing.js`   | Ride Sharing (Uber)             | Case Study |
| `sd-instagram-deep.js`      | Instagram Deep Dive             | Deep Dive  |

---

## System Design Still to Add

| Topic                        | Priority |
| ---------------------------- | -------- |
| WhatsApp / Chat System       | HIGH     |
| Search Autocomplete          | HIGH     |
| Distributed Task Queue       | HIGH     |
| Payment System               | HIGH     |
| Ticket Booking (concurrency) | HIGH     |
| Notification Service         | MEDIUM   |
| File Storage (Dropbox/S3)    | MEDIUM   |
| Stock Exchange               | MEDIUM   |
| Game Leaderboard             | LOW      |

---

---

# NEW ARCHITECTURE VISUALIZATION SYSTEM

Two completely new visualization modes to build. Replaces basic FlowDiagram approach for system design.

---

## ARCHITECTURE TYPE 1 — Layered Architecture View

### Visual Style Reference

**Primary reference:** `inputs/image.png` — ByteByteGo 6-pattern colored cards

- Each architecture type = distinct pastel card color (orange/teal/purple/blue/amber/red)
- Icon top-left of card, mini flow diagram inside card body
- Clean white box lines, no shadows, flat design
- Apply same card style to each LAYER BAND (not pattern card — use horizontal bands)

**Secondary reference:** `inputs/image copy 2.png` — Multi-pattern connected overview

- Shows how patterns relate with arrows between them
- Use arrow-connection style for the protocol lines between layers

### Concept

Full top-to-bottom architectural cross-section. Every layer rendered as horizontal band. Each layer contains its real tools, protocols, async systems, and cloud equivalents. Boxes are clickable. Hover shows deep context. Side panel shows all details of selected node.

### Layer Band Color Scheme (adapted from ByteByteGo card palette)

```js
const LAYER_COLORS = {
  client: { bg: "#1c2333", accent: "#58a6ff", label: "CLIENT LAYER" },
  gateway: { bg: "#1a2035", accent: "#3fb950", label: "GATEWAY LAYER" },
  service: { bg: "#1c1f2e", accent: "#a855f7", label: "SERVICE LAYER" },
  domain: { bg: "#1f1c2e", accent: "#ffa657", label: "DOMAIN LAYER" },
  data: { bg: "#2a1a1a", accent: "#f78166", label: "DATA LAYER" },
  infra: { bg: "#1a2a1a", accent: "#e3b341", label: "INFRA LAYER" },
  security: { bg: "#2a1a1a", accent: "#ff7b72", label: "SECURITY (cross-cutting)" },
};
```

### Layer Stack (top to bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT LAYER                                                   │
│  Web App │ Mobile App │ CLI │ IoT │ Third-party                 │
│  Protocols: HTTPS, WebSocket, HTTP/2, HTTP/3                    │
├─────────────────────────────────────────────────────────────────┤
│  GATEWAY LAYER                                                  │
│  API Gateway │ Load Balancer │ CDN │ WAF │ Auth Proxy           │
│  Protocols: REST, GraphQL, gRPC, WebSocket                      │
│  Async: Not applicable (sync entry point)                       │
├─────────────────────────────────────────────────────────────────┤
│  SERVICE LAYER                                                  │
│  User Svc │ Order Svc │ Payment Svc │ Notification Svc │ etc.  │
│  Protocols: gRPC (inter-service), REST (external)               │
│  Async: Kafka, SQS, SNS, RabbitMQ                               │
├─────────────────────────────────────────────────────────────────┤
│  DOMAIN / BUSINESS LOGIC LAYER                                  │
│  Saga Orchestrators │ Event Handlers │ CQRS Command/Query Bus   │
│  Protocols: Internal event bus (no network)                     │
│  Async: Event sourcing, CQRS, Outbox pattern                    │
├─────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                     │
│  PostgreSQL │ MongoDB │ Redis │ Cassandra │ Elasticsearch       │
│  Protocols: TCP (JDBC, Redis RESP, MongoDB wire)                │
│  Async: CDC (Debezium), WAL tailing → Kafka                     │
├─────────────────────────────────────────────────────────────────┤
│  INFRASTRUCTURE / PLATFORM LAYER                                │
│  Kubernetes │ Docker │ Istio │ Prometheus │ Jaeger │ Grafana    │
│  Protocols: gRPC (k8s api-server), etcd (raft), OTLP           │
│  Cloud: AWS EKS / GCP GKE / Azure AKS                          │
├─────────────────────────────────────────────────────────────────┤
│  SECURITY LAYER  (cross-cutting — wraps all layers)             │
│  mTLS │ JWT/OAuth2 │ API Keys │ WAF │ VPC │ Secrets Manager    │
│  Protocols: TLS 1.3, OIDC, SAML                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Protocol Color Scheme

| Protocol      | Color            | Badge style   |
| ------------- | ---------------- | ------------- |
| REST / HTTP   | `#58a6ff` blue   | solid border  |
| gRPC          | `#d2a8ff` purple | dashed border |
| GraphQL       | `#f78166` coral  | dotted border |
| WebSocket     | `#3fb950` green  | double border |
| TCP (raw)     | `#8b949e` gray   | thin border   |
| Kafka / async | `#ffa657` orange | animated dash |
| SQS           | `#ffa657` orange | pill badge    |
| SNS           | `#e3b341` yellow | pill badge    |

### Per-Node Hover Box (what/why/when/where)

Every clickable box shows hover card:

```
┌──────────────────────────────────────┐
│  API Gateway                         │
│  ──────────────────────────────────  │
│  WHAT:    Routes, rate-limits, auth  │
│  WHY:     Single entry, consistent   │
│  WHEN:    Multi-service backend      │
│  WHERE:   Before service layer       │
│  FROM:    Client / CDN               │
│  TO:      Service mesh / services    │
│  PATTERN: BFF, strangler, gateway    │
│  PROTO:   REST, GraphQL, gRPC        │
│  LANG:    Go, Node, Envoy, Kong      │
│  AWS:     API GW, ALB                │
│  GCP:     Cloud Endpoints, Apigee    │
│  AZURE:   API Management             │
└──────────────────────────────────────┘
```

### Side Panel (on click)

Right-side drawer slides in with:

- Full concept explanation
- Protocol deep dive
- AWS / GCP / Azure equivalents
- Async alternatives (on hover chips: Kafka → SQS → SNS → RabbitMQ → NATS)
- Failure modes + resilience patterns
- Interview questions
- Code snippet (config/pseudocode)

### Async Hover Chips

Each async connector shows pill chips on hover:

```
[ Kafka ]  → hover shows:
  Alternatives: [ SQS ] [ SNS ] [ RabbitMQ ] [ NATS ] [ Pulsar ]
  Pattern: Fan-out, event sourcing, CDC
  When: High throughput, replayable, ordered
```

### Clickable Route Lines

Lines between layers are colored by protocol. On click:

- Line animates packet flow (moving dot)
- Side panel shows: protocol spec, latency typical, retry strategy, failure behavior

### Implementation Plan

```
File: sd-layered-architecture.js
Visual engine: custom inline HTML/CSS + JS (NOT ReactViz — too limited)

Structure:
  LayeredArchViz.render(mount, config)
    config.layers[]     — layer definitions
    config.connections[] — protocol lines between layers
    config.sidePanel    — right drawer component

Each layer = horizontal band, full width
Each service = clickable box inside the band
Each connection = animated SVG line with protocol badge

Templates needed:
  LayerBand.template.js     — horizontal layer container
  ServiceBox.template.js    — clickable node in a layer
  HoverCard.template.js     — what/why/when/where hover
  SideDrawer.template.js    — detail side panel
  ProtocolLine.template.js  — animated SVG connection
  AsyncChip.template.js     — Kafka/SQS/SNS hover chips
  CloudBadge.template.js    — AWS/GCP/Azure equivalents
```

---

## ARCHITECTURE TYPE 2 — Mental Map (Obsidian-style Dynamic Graph)

### Visual Style Reference

**Primary reference:** `inputs/image copy 5.png` — Obsidian organic mind map

- Color-coded branches radiate from center (one color per cluster)
- Branches are curved organic paths, NOT straight lines
- Leaf nodes: text labels with colored dot markers
- No rigid grid — force physics lets nodes breathe naturally

**Secondary reference:** `inputs/image copy 6.png` — Circle-node mind map

- Dark background (`#0d1117`)
- Nodes = overlapping colored circles (not just dots)
- Each node has: icon inside circle + text label below
- Circles vary in size by importance (hub nodes = bigger)
- Connection lines: thin, semi-transparent, no arrows for "related" edges

**Wheel reference:** `inputs/image copy 3.png` — ByteByteGo Architecture Styles Wheel

- Center node = "Software Architecture Styles" hub
- First ring = category names (By Events, By Purpose, etc.)
- Second ring = specific patterns
- Outer ring = mini-diagram preview per style
- Adapt this as the initial Mental Map layout before user interacts

**Taxonomy reference:** `inputs/image copy 4.png` — 7-dimension grid

- 7 clusters: Connections · Events · Purpose · Composition · Data · Stream · Knowledge
- Each cluster = one branch color in the Mental Map
- Cluster colors match the grid background colors from the image

### Concept

Interactive knowledge graph. All system design concepts as nodes. Edges = relationships (uses, depends-on, scales-with, alternative-to, fails-when). Click a node = all connected edges highlight + flow animates. Like Obsidian graph view but for distributed systems.

### Node Visual Design

```
Default node:
  circle, r=24px, fill=cluster color (20% opacity), stroke=cluster color
  label: below circle, 11px, #c9d1d9

Hub node (3+ connections):
  r=36px, glow effect (box-shadow 0 0 12px cluster-color)
  label: bold, 12px

Active node (clicked):
  stroke: white, stroke-width: 3px
  inner glow: white 0 0 20px 4px
  scale: 1.2x (CSS transform)

Dimmed node:
  opacity: 0.15
```

### Cluster Color Scheme (from image copy 4.png dimensions)

```js
const CLUSTER_COLORS = {
  connections: "#58a6ff", // blue  — REST, BFF, P2P, SOA, RPC
  events: "#a855f7", // purple — PubSub, CQRS, EventSource, Reactive
  purpose: "#3fb950", // green  — API Platform, DI Hub, Dev Portal
  composition: "#ffa657", // orange — Microservices, Monolith, Layers, Hexagonal
  data: "#f78166", // coral  — Data Fabric, Mesh, Warehouse
  stream: "#e3b341", // yellow — Fast Data, Pipe&Filter, Brokers
  knowledge: "#79c0ff", // light blue — Blackboard, Rule-Based, AutoML
};
```

### Graph Node Types

```
[Concept]   — core idea (API Gateway, Kafka, Redis)         cluster: composition
[Pattern]   — design pattern (Saga, CQRS, Circuit Breaker)  cluster: events
[Protocol]  — REST, gRPC, WebSocket                         cluster: connections
[Tool]      — specific technology (Nginx, Kong, Envoy)      cluster: composition
[Failure]   — failure mode (split brain, thundering herd)   cluster: stream
[Case]      — case study (Instagram, Uber, Netflix)         cluster: purpose
```

### Edge Types (relationship lines)

```
uses          → solid line,   1px, cluster color
alternative   → dashed line,  1px, gray #484f58
causes        → dotted line,  1px, red #f78166  (X → Y failure)
scales-with   → solid line,   2px, green #3fb950
replaces      → dashed line + strikethrough label
implements    → arrow line,   1px, blue #58a6ff
```

### Layout: Wheel-then-Force

Initial render (before interaction): Wheel layout (like image copy 3.png)

- Center hub: "System Design" label
- Inner ring: 7 cluster labels (Connections, Events, Purpose, ...)
- Outer nodes: force-attracted to their cluster center

After user pans/drags: switches to free force-directed physics

### On Node Click

- Node glows (white/gold border)
- All connected edges animate (traveling dot along edge)
- Connected nodes highlight (dim everything else to opacity 0.15)
- Business flow story appears in right panel with:
  - How this node fits in a real system
  - Step-by-step story (like "Instagram uses Redis for feed cache because...")
  - Animated flow diagram for that specific path
  - Interview angle for this node

### Business Flow Storytelling

Each node click triggers a story mode:

```
Click: [Kafka]
  Story: "At Uber, every GPS ping from 1M drivers
          → Kafka topic 'driver-locations'
          → Consumer: matching service (real-time)
          → Consumer: analytics (batch)
          → Consumer: surge pricing calculator
  Flow animation: producer → broker → 3 consumers in parallel
  Failure: broker down → producers buffer locally → lag spike
```

### Implementation Plan

```
File: sd-mental-map.js
Engine: D3.js force-directed graph OR custom SVG + physics simulation

Initial layout: Wheel (image copy 3.png style) → transitions to force on drag
Nodes: colored circles (image copy 6.png style), size by connection count
Edges: SVG curved paths (organic, NOT straight — match image copy 5.png)
       animated stroke-dashoffset (traveling dot on active edges)
Branch colors: 7 clusters from CLUSTER_COLORS (image copy 4.png taxonomy)
Background: #0d1117 dark with subtle radial gradient glow at center
Camera: pan + zoom (transform: translate + scale), minimap bottom-right
Sidebar: StoryPanel slides in from right (600px wide) on node click

Templates needed:
  MentalMapNode.template.js    — circle + label + cluster color + size-by-degree
  MentalMapEdge.template.js    — SVG curved path + edge type style + animated dot
  StoryPanel.template.js       — story + mini flow + failure + interview
  GraphControls.template.js    — filter by cluster, search box, reset view, toggle labels
  FlowOverlay.template.js      — animated sub-flow on node click (reuses FlowRoute)
  WheelLayout.template.js      — initial radial layout engine (before force kicks in)
```

---

## ANIMATION COMPONENT SYSTEM (Angular/TS-style templates)

All reusable. Each topic uses the right template combination.

### Template 1 — Service Box

```js
// ServiceBox.template.js
// Clickable box with: icon, label, protocol badge, cloud badge
// States: default, hover, active, error, dim
// Outputs: onClick, onHover
{
  id: 'api-gateway',
  label: 'API Gateway',
  icon: '🌐',
  protocol: 'REST',           // badge color from PROTOCOL_COLORS
  cloud: { aws: 'API GW', gcp: 'Apigee', azure: 'APIM' },
  hover: {
    what: '...',
    why: '...',
    when: '...',
    where: '...',
    from: 'Client, CDN',
    to: 'Services',
    patterns: ['BFF', 'Gateway Aggregation'],
    protocols: ['REST', 'GraphQL', 'gRPC'],
    langs: ['Go', 'Node', 'Envoy'],
  }
}
```

### Template 2 — Flow Background

```css
/* FlowBackground.template.css */
/* Animated grid / circuit board pattern */
/* Dark background with subtle moving particles */
/* Different themes per layer:
   Client layer:  #0d1117 + blue particle drift
   Service layer: #0d1117 + green particle drift
   Data layer:    #0d1117 + orange particle drift
   Security:      #0d1117 + red pulse border
*/
```

### Template 3 — Flow Route (animated connector)

```js
// FlowRoute.template.js
// SVG path between two boxes
// Animated: moving dot along path (stroke-dashoffset)
// States: idle, active (packet flowing), error (red pulse)
// Labels: protocol badge on midpoint of line
// On click: show protocol detail modal
{
  from: 'client',
  to: 'gateway',
  protocol: 'HTTPS',
  color: '#58a6ff',
  animated: true,
  bidirectional: false,
  label: 'HTTPS/REST',
  latency: '~10ms',
}
```

### Template 4 — Async Connector

```js
// AsyncConnector.template.js
// Dashed animated line for async (Kafka/SQS/SNS)
// Shows: queue depth indicator, lag indicator
// Hover: alternatives chip list
{
  type: 'kafka',
  color: '#ffa657',
  alternatives: ['SQS', 'SNS', 'RabbitMQ', 'NATS', 'Pulsar'],
  animated: 'dashed-flow',  // different from sync solid-dot
  metrics: { lag: '12ms', throughput: '1M/s' },
}
```

### Template 5 — Hover Card Component

```js
// HoverCard.template.js
// Positioned card appearing on node hover
// Sections: WHAT, WHY, WHEN, WHERE, FROM, TO, PROTOCOLS, CLOUD, PATTERNS
// Dismiss on mouseout with 300ms delay
// Dark glass morphism style
```

### Template 6 — Side Drawer

```js
// SideDrawer.template.js
// Slides in from right on node click
// Sections:
//   Header: name + type badge
//   Concept: full explanation
//   Protocols: with color badges
//   Cloud: AWS / GCP / Azure tabs
//   Async: Kafka/SQS/SNS comparison table
//   Failure modes: red callout boxes
//   Code: config/pseudocode snippet
//   Interview: 3-5 questions
// Close button + ESC to dismiss
```

### Template 7 — Layer Band

```js
// LayerBand.template.js
// Full-width horizontal section
// Background: subtle gradient, layer label on left
// Contains: ServiceBox nodes in flex row
// Collapsible: click header to collapse/expand
// Security layer: pulsing red border around ALL other layers
```

### Template 8 — Mental Map Node

```js
// MentalMapNode.template.js
// SVG circle with label
// Radius: proportional to importance/connections
// Color: by node type (concept/pattern/tool/failure/case)
// States: default, focused (glow), dimmed (others during focus)
// On hover: show mini tooltip
// On click: trigger story mode + edge highlight
```

### Template 9 — Story Panel

```js
// StoryPanel.template.js
// Right panel for Mental Map story mode
// Sections:
//   Title: "How [Node] works at scale"
//   Story: 3-5 sentence narrative with company example
//   Flow: mini animated FlowDiagram showing this node's role
//   Failure: "What breaks when this fails"
//   Interview: 2-3 quick questions
//   Next: related nodes to explore
```

### Template 10 — Business Flow Overlay

```js
// BusinessFlow.template.js
// Full business scenario animation
// E.g. "User places order on Amazon" →
//   Client → CDN → API GW → Order Service
//   → Kafka → Payment Service → Inventory
//   → Notification Service → User
// Each step highlights in sequence with 1s delay
// Narration bar at bottom: "Step 3: Order Service publishes to Kafka..."
// Play/pause/reset controls
```

---

## Protocol Color Coding (global standard)

Apply across ALL architecture diagrams, every topic.

```js
const PROTOCOL_COLORS = {
  REST: { color: "#58a6ff", bg: "#58a6ff15", border: "solid" },
  HTTP: { color: "#58a6ff", bg: "#58a6ff15", border: "solid" },
  HTTPS: { color: "#58a6ff", bg: "#58a6ff15", border: "solid" },
  gRPC: { color: "#d2a8ff", bg: "#d2a8ff15", border: "dashed" },
  Protobuf: { color: "#d2a8ff", bg: "#d2a8ff15", border: "dashed" },
  GraphQL: { color: "#f78166", bg: "#f7816615", border: "dotted" },
  WebSocket: { color: "#3fb950", bg: "#3fb95015", border: "double" },
  TCP: { color: "#8b949e", bg: "#8b949e15", border: "solid" },
  UDP: { color: "#8b949e", bg: "#8b949e15", border: "dashed" },
  Kafka: { color: "#ffa657", bg: "#ffa65715", border: "dashed", animated: true },
  SQS: { color: "#ffa657", bg: "#ffa65715", border: "dashed", animated: true },
  SNS: { color: "#e3b341", bg: "#e3b34115", border: "dashed", animated: true },
  RabbitMQ: { color: "#ffa657", bg: "#ffa65715", border: "dashed", animated: true },
  SSE: { color: "#3fb950", bg: "#3fb95015", border: "solid" },
  MQTT: { color: "#79c0ff", bg: "#79c0ff15", border: "dotted" },
};
```

---

## Cloud Equivalent Mapping (per service)

```js
const CLOUD_MAP = {
  "API Gateway": {
    aws: "API Gateway / ALB",
    gcp: "Apigee / Cloud Endpoints",
    azure: "API Management",
  },
  "Load Balancer": { aws: "ALB / NLB", gcp: "Cloud Load Balancing", azure: "Azure LB / App GW" },
  CDN: { aws: "CloudFront", gcp: "Cloud CDN", azure: "Azure CDN / Front Door" },
  "Message Queue": { aws: "SQS", gcp: "Cloud Pub/Sub", azure: "Service Bus" },
  "Event Stream": { aws: "Kinesis / MSK", gcp: "Pub/Sub / Dataflow", azure: "Event Hubs" },
  "Object Storage": { aws: "S3", gcp: "Cloud Storage", azure: "Blob Storage" },
  Cache: { aws: "ElastiCache (Redis)", gcp: "Memorystore", azure: "Azure Cache for Redis" },
  "SQL DB": { aws: "RDS / Aurora", gcp: "Cloud SQL / Spanner", azure: "Azure SQL / Cosmos" },
  "NoSQL DB": { aws: "DynamoDB", gcp: "Firestore / Bigtable", azure: "Cosmos DB" },
  Search: { aws: "OpenSearch", gcp: "Vertex AI Search", azure: "Azure AI Search" },
  "Container Orchestr": { aws: "EKS", gcp: "GKE", azure: "AKS" },
  Serverless: { aws: "Lambda", gcp: "Cloud Functions / Run", azure: "Azure Functions" },
  "Service Mesh": { aws: "App Mesh / ECS", gcp: "Anthos Service Mesh", azure: "Open Service Mesh" },
  "Secret Manager": { aws: "Secrets Manager / SSM", gcp: "Secret Manager", azure: "Key Vault" },
  Observability: {
    aws: "CloudWatch / X-Ray",
    gcp: "Cloud Monitoring / Trace",
    azure: "Azure Monitor / App Insights",
  },
  Auth: { aws: "Cognito / IAM", gcp: "Identity Platform / IAP", azure: "Azure AD / B2C" },
};
```

---

## Layer-by-Layer Services Reference

### Client Layer

```
Services:     Web (React/Angular/Vue), Mobile (iOS/Android/RN/Flutter),
              CLI tools, IoT devices, Partner APIs, Browser extensions
Protocols:    HTTPS (REST/GraphQL), WebSocket, HTTP/2, HTTP/3 (QUIC)
Auth:         Cookie, JWT Bearer, API Key, OAuth2 PKCE
CDN to here:  CloudFront, Fastly, Akamai, Cloudflare
```

### Gateway Layer

```
Services:     API Gateway, Load Balancer, CDN edge, WAF, Rate Limiter,
              Auth Proxy (OAuth2 sidecar), Bot protection
Protocols IN: HTTPS REST, GraphQL, WebSocket, gRPC-web
Protocols OUT:gRPC (to services), REST (legacy services)
Tools:        Kong, NGINX, Envoy, AWS API GW, Apigee, Traefik
Patterns:     BFF (Backend for Frontend), Strangler Fig, Aggregator GW
```

### Service Layer

```
Services:     User Svc, Order Svc, Payment Svc, Inventory Svc,
              Notification Svc, Search Svc, Recommendation Svc,
              Auth Svc, File Svc, Analytics Svc
Protocols:    gRPC (inter-service), REST (external-facing), Kafka (async)
Async:        Kafka, SQS, SNS, RabbitMQ, NATS
Patterns:     Sidecar, Strangler, Saga, Circuit Breaker, Retry
Languages:    Go, Java, Python, Node.js, Rust
Frameworks:   Spring Boot, Gin, FastAPI, NestJS
```

### Domain / Business Logic Layer

```
Services:     Saga Orchestrators, Event Handlers, CQRS Command Bus,
              CQRS Query Bus, Domain Event Publishers, Outbox Workers
Protocols:    In-process (no network hops)
Async:        Event sourcing store, Outbox pattern → Kafka/DB
Patterns:     DDD Aggregates, CQRS, Event Sourcing, Outbox/Inbox
```

### Data Layer

```
SQL:          PostgreSQL, MySQL, CockroachDB, Aurora (OLTP)
              Redshift, BigQuery, Snowflake (OLAP)
NoSQL:        MongoDB, DynamoDB, Cassandra, Firestore
Cache:        Redis, Memcached, Hazelcast
Search:       Elasticsearch, OpenSearch, Meilisearch
Time-series:  InfluxDB, TimescaleDB, Prometheus
Vector:       Pinecone, Weaviate, pgvector
Object:       S3, GCS, Azure Blob
Protocols:    TCP (JDBC, Redis RESP, Mongo Wire, Cassandra CQL)
Async:        CDC (Debezium), WAL tailing → Kafka → consumers
```

### Infrastructure / Platform Layer

```
Orchestration: Kubernetes, Docker Swarm, Nomad
Service Mesh:  Istio, Linkerd, Consul Connect
Observability: Prometheus, Grafana, Jaeger, Zipkin, OpenTelemetry,
               ELK Stack, Loki, Tempo
CI/CD:         ArgoCD, Flux, Tekton, GitHub Actions, Jenkins
Secrets:       Vault, AWS Secrets Manager, GCP Secret Manager
Config:        etcd, Consul, AWS Parameter Store
Protocols:     gRPC (k8s api-server), Raft (etcd), OTLP traces
```

### Security Layer (cross-cutting — spans all layers)

```
Network:      VPC, Private subnets, Security Groups, NACLs
Transport:    TLS 1.3, mTLS (service mesh)
Identity:     JWT, OAuth2, OIDC, SAML, LDAP/AD
API:          API Keys, HMAC signing, OAuth2 scopes
Secrets:      Vault, cloud secret managers, sealed secrets
WAF:          Cloudflare, AWS WAF, ModSecurity
Scanning:     SAST (SonarQube), DAST (OWASP ZAP), SCA (Snyk)
Protocols:    TLS 1.3, OIDC, SAML 2.0
```

---

## Business Flows to Animate (Type 2 — Mental Map Stories)

| Flow         | Story                             | Services traversed                                          |
| ------------ | --------------------------------- | ----------------------------------------------------------- |
| User Login   | OAuth2 PKCE + JWT issuance        | Client → GW → Auth → Redis → DB                             |
| Place Order  | Saga: order → payment → inventory | API GW → Order → Kafka → Payment → Inventory → Notification |
| Video Upload | Upload → encode → distribute      | Client → API GW → Upload Svc → S3 → Kafka → Encoder → CDN   |
| Feed Refresh | Fanout-on-write vs read           | App → API GW → Feed Svc → Redis → Cassandra / Kafka fanout  |
| Search Query | Query → rank → serve              | Client → API GW → Search Svc → Elasticsearch → ML Ranker    |
| Payment      | Idempotent charge + rollback      | API GW → Payment Svc → Stripe → Kafka → Notification        |
| Driver Match | Geo query + real-time             | Mobile → API GW → Match Svc → GeoIndex → WebSocket push     |
| Cache Miss   | Thundering herd recovery          | Client → Redis (miss) → DB (stampede) → Redis warm          |
| Service Down | Circuit breaker trip              | Caller → Circuit Breaker → Fallback → DLQ                   |
| Auto-Scale   | HPA triggered by CPU              | Prometheus → HPA → k8s Scheduler → new Pod                  |

---

## Sysdesign File Template

```js
(function () {
  "use strict";

  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([
    {
      id: "sd-<topic>",
      area: "sysdesign",
      title: "<Title>",
      tag: "<Tag>", // 'Architecture'|'Scalability'|'LLD'|'Case Study'|etc.
      tags: ["system-design", "<keyword>"],

      concept: `<explanation>`,
      why: `<production relevance>`,

      example: {
        language: "text", // or 'yaml', 'java', 'go', etc.
        code: `<code or config>`,
      },

      interview: ["Question 1?", "Question 2?"],
      tradeoffs: { pros: ["..."], cons: ["..."] },
      gotchas: ["Gotcha 1"],

      visual: function (mount) {
        // Option A: ReactViz.FlowDiagram (step-by-step)
        // Option B: Layered Architecture (sd-layered-architecture engine)
        // Option C: Mental Map (sd-mental-map engine)
        // Option D: Inline HTML/CSS (always-visible diagram)
        // Option E: Business Flow (animated storytelling)
      },
    },
  ]);
})();
```

---

## Visual Patterns Already Used

### Vertical Flow (most common)

```js
window.ReactViz.FlowDiagram.render(vizEl, nodes, edges, { layout: "vertical" });
```

### Inline CSS Architecture (always-visible, no steps)

```js
mount.innerHTML = `<div style="display:flex;flex-direction:column;...">...</div>`;
```

### Animated Packet Flow

```js
mount.innerHTML = `<style>
  @keyframes flow { 0%{left:0} 100%{left:calc(100% - 20px)} }
  .packet { position:absolute; animation: flow 2s infinite; }
</style>...`;
```

---

# DECOUPLED VISUALIZATION ENGINE ARCHITECTURE

## Problem

Current architecture mixes rendering, animation, state, protocol styling, business flows, hover handling, and side panels inside topic implementations. Impossible to scale once 100+ topics exist, multiple visualization modes exist, plugins/themes appear, reusable animations needed.

## Full Engine Architecture

```txt
┌────────────────────────────────────────────┐
│              Topic Definition              │
│  (pure config only — NO rendering logic)  │
└────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│            Visualization Engine            │
│                                            │
│  Reads topic config                        │
│  Resolves templates                        │
│  Resolves animations                       │
│  Resolves protocols                        │
│  Resolves themes                           │
│  Resolves interactions                     │
└────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│             Rendering Layer                │
│                                            │
│  Layered renderer                          │
│  Mental map renderer                       │
│  Flow renderer                             │
│  Timeline renderer                         │
│  Sequence renderer                         │
└────────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│             Runtime Systems                │
│                                            │
│  Animation engine                          │
│  Event bus                                 │
│  State manager                             │
│  Overlay manager                           │
│  Tooltip manager                           │
│  Story orchestrator                        │
└────────────────────────────────────────────┘
```

## Full Decoupled Module Structure

```txt
src/engine/
├── core/
│   ├── VizEngine.js
│   ├── EventBus.js
│   ├── StateStore.js
│   ├── RendererRegistry.js
│   ├── ThemeRegistry.js
│   ├── ProtocolRegistry.js
│   ├── AnimationRegistry.js
│   └── PluginManager.js
│
├── renderers/
│   ├── LayeredRenderer.js
│   ├── MentalMapRenderer.js
│   ├── FlowRenderer.js
│   ├── TimelineRenderer.js
│   ├── SequenceRenderer.js
│   └── ClusterRenderer.js
│
├── animations/
│   ├── packet-flow.js
│   ├── async-dash.js
│   ├── pulse-alert.js
│   ├── traffic-wave.js
│   ├── retry-bounce.js
│   ├── kafka-stream.js
│   ├── shard-rebalance.js
│   └── autoscale-grow.js
│
├── protocols/
│   ├── rest.protocol.js
│   ├── grpc.protocol.js
│   ├── websocket.protocol.js
│   ├── kafka.protocol.js
│   └── mqtt.protocol.js
│
├── themes/
│   ├── github-dark.js
│   ├── cyberpunk.js
│   ├── kubernetes-blue.js
│   ├── aws-cloud.js
│   └── observability-neon.js
│
├── overlays/
│   ├── MetricsOverlay.js
│   ├── FailureOverlay.js
│   ├── TrafficOverlay.js
│   ├── LatencyOverlay.js
│   └── SecurityOverlay.js
│
└── templates/
    ├── ServiceBox.template.js
    ├── HoverCard.template.js
    ├── ProtocolLine.template.js
    ├── AsyncConnector.template.js
    ├── StoryPanel.template.js
    └── LayerBand.template.js
```

## Golden Rule: Topics = Pure Config

**BAD** — topic file contains rendering logic:

```js
visual: function(mount) {
  mount.innerHTML = `<div>...`;
}
```

**GOOD** — topic file is pure declarative config:

```js
visual: {
  type: 'layered-architecture',
  layers: [...],
  connections: [...],
  overlays: ['metrics', 'security'],
  animations: ['packet-flow', 'traffic-wave'],
  interactions: {
    hover: true,
    zoom: true,
    pan: true,
    protocolInspector: true,
  }
}
```

Engine decides HOW to render. Topics only describe WHAT.

---

# ADDITIONAL VISUALIZATION MODES

| Visualization               | Purpose                        |
| --------------------------- | ------------------------------ |
| Sequence Diagram            | Request lifecycle, OAuth, Saga |
| Timeline View               | Kafka/event replay, Raft, GC   |
| Cluster Topology            | Kubernetes nodes/pods          |
| Network Topology            | VPC/subnets/security groups    |
| Failure Simulation          | Chaos engineering              |
| Replication View            | DB replication lag             |
| Partition Map               | Kafka/Cassandra partitions     |
| Autoscaling Simulation      | HPA trigger → pod spawn        |
| Memory Layout               | Redis/JVM heap regions         |
| Thread Visualization        | Concurrency, deadlocks         |
| Consensus Visualization     | Raft/Paxos leader election     |
| Query Planner Visualization | DB internals, EXPLAIN plan     |
| CPU Scheduling              | OS scheduler, CFS              |
| TCP Packet Flow             | Networking internals           |
| Retry Timeline              | Circuit breaker states         |

## Sequence Diagram Engine

Needed for: OAuth, Payment flows, Saga, WebSocket lifecycle, Kafka rebalance, gRPC calls.

```txt
Client → API GW → Auth → Redis → DB

Each arrow animated sequentially.
Responses animate backward.
Timeouts pulse red.
Retries bounce.
Circuit breaker opens visually.
```

```txt
renderers/SequenceRenderer.js
templates/SequenceArrow.template.js
templates/Lifeline.template.js
```

---

# FAILURE SIMULATION MODE

Every failure scenario needs animation. System design understanding improves most when failures are visualized.

## Failure Scenarios to Animate

```txt
Redis down
Kafka broker failure
Network partition
Pod crash + CrashLoopBackOff
DB failover (primary → replica)
Region outage (multi-region failover)
Cache stampede / thundering herd
Split brain
Dead letter queue overflow
Slow consumer lag spike
Circuit breaker open
Retry storm cascade
```

## Kafka Broker Failure Animation

```txt
1. Broker node flashes red
2. Producer retries animate (bounce back)
3. Consumer lag bar increases (red fill)
4. Partition leader election animation
5. ISR shrink visualization
6. New leader highlighted green
7. Recovery animation — lag drains
```

---

# REAL-TIME METRICS OVERLAY SYSTEM

Every diagram supports live metric overlays:

```txt
┌───────────────┐
│ Order Service │
│ CPU:  73%     │
│ RPS:  12k     │
│ P95:  44ms    │
│ Err:  0.2%    │
└───────────────┘
```

Metrics to overlay:

- TPS / RPS
- P50 / P95 / P99 latency
- Error rate
- Queue lag
- Throughput MB/s
- CPU %
- Memory %
- Partition count
- Replica lag

## Observability Visualization Topics

| Topic         | Visualization                      |
| ------------- | ---------------------------------- |
| OpenTelemetry | trace span flow                    |
| Jaeger        | distributed trace waterfall        |
| Prometheus    | scrape → metric → alert flow       |
| Loki          | log aggregation pipeline           |
| ELK           | ingestion pipeline                 |
| Grafana       | metrics dashboard with live values |

---

# DISTRIBUTED SYSTEMS INTERNALS

## Raft Visualization

```txt
Leader election animation
Heartbeat packets (green dots, 150ms cadence)
Term changes (badge increment)
Log replication (entries move leader→follower)
Commit index movement (blue line advances)
Follower lag (gray bars fall behind)
Split vote visualization (red flash, no majority)
```

## Kafka Internals Visualization

```txt
Producer batching (messages group → batch)
Compression (batch shrinks visually)
Partition routing (hash → bucket selection)
ISR sync (leader → replica flow)
Leader election (red → new green leader)
Consumer group rebalance (partitions reassign with animation)
Offset commit flow (consumer → broker → ack)
```

---

# INTERACTIVE DEBUGGING MODE

Click "Debug Production Incident" → simulates:

- Traffic spike (RPS graph climbs)
- Pod failures (red crash animation)
- Retry storms (bouncing arrows multiply)
- Thundering herd (all clients hit DB simultaneously)
- DB saturation (connection pool maxes, new req queued)

User traces:

```txt
Where latency increased (P99 timeline)
Where retries exploded (retry counter on service)
Which dependency failed (dependency graph highlight)
How cascading failure spread (failure propagation animation)
```

---

# ACCESSIBILITY SYSTEM

```txt
Keyboard navigation     — tab through nodes, Enter to select
Screen reader labels    — aria-label on all SVG nodes/edges
Reduced motion mode     — respects prefers-reduced-motion
Colorblind-safe palette — deuteranopia / protanopia variants
Zoom accessibility      — browser zoom must not break layout
Mobile responsiveness   — touch gestures for pan/zoom
High contrast mode      — toggle in toolbar
```

---

# PERFORMANCE OPTIMIZATION

## Virtual Rendering

Render only visible nodes:

```txt
1000 nodes in graph
Only 80 rendered in viewport
Lazy-load as camera pans
```

## Animation Scheduler

Prevent 500 simultaneous animations:

```js
requestAnimationFrame batching
frame throttling (60fps cap)
offscreen pause (IntersectionObserver)
priority queues (foreground > background animations)
```

## Incremental Graph Rendering

Mental map progressively renders:

```txt
Initial:    20 nearby nodes + immediate neighbors
Zoom out:   load 100 more at reduced detail
Pan:        lazy-load neighbors as they enter viewport
```

---

# PLUGIN SYSTEM

Allows cloud packs, kafka packs, kubernetes packs, ai/ml packs without touching engine core.

```js
window.VizPlugins.register({
  id: 'kafka-deep-plugin',
  nodes: [...],
  overlays: [...],
  animations: [...],
  stories: [...],
  interviewQuestions: [...],
});
```

---

# STORY ORCHESTRATOR SYSTEM

Story engine with scene-by-scene orchestration:

```txt
Scene 1 → client request (zoom to client node)
Scene 2 → gateway auth (packet flow client → GW → Auth)
Scene 3 → kafka publish (order svc → kafka topic)
Scene 4 → consumer lag (lag meter fills)
Scene 5 → retry storm (multiple bouncing arrows)
Scene 6 → DLQ recovery (failed msgs → DLQ → alert)
```

Each scene:

- Camera movement (pan + zoom to focus area)
- Narration text (bottom bar)
- Node highlight (glow on active nodes)
- Animation trigger (packet flow, pulse, etc.)
- Sound hook (future: subtle click/beep)

---

# CAMERA SYSTEM (Mental Map)

```txt
Pan         — click+drag or two-finger swipe
Zoom        — scroll wheel or pinch
Auto-focus  — animates camera to selected node (300ms ease)
Node tracking — camera follows active story node
Cinematic transitions — smooth cubic-bezier camera moves
Mini-map    — bottom-right corner overview
```

---

# ADVANCED KUBERNETES VISUALIZATION

| Topic        | Visualization                                     |
| ------------ | ------------------------------------------------- |
| Scheduler    | pod placement animation (node scoring + binding)  |
| HPA          | autoscaling timeline (metric → threshold → scale) |
| Service Mesh | sidecar packet flow (envoy intercept)             |
| Ingress      | request routing (host/path rules)                 |
| DNS          | CoreDNS lookup flow (service → ClusterIP)         |
| CNI          | pod networking (veth pairs, overlay)              |
| etcd         | raft consensus (leader heartbeat + log)           |
| StatefulSets | persistent identity (pod-0 → pod-1 → pod-2)       |
| DaemonSets   | node-wide deployment (one pod per node)           |
| Operators    | reconciliation loop (desired vs actual)           |

---

# AI/ML SYSTEM DESIGN TOPICS TO ADD

| File                        | Topic                  |
| --------------------------- | ---------------------- |
| `sd-rag-system.js`          | RAG Architecture       |
| `sd-vector-db.js`           | Vector Databases       |
| `sd-embedding-flow.js`      | Embedding Pipeline     |
| `sd-model-serving.js`       | LLM Serving            |
| `sd-gpu-scheduling.js`      | GPU Scheduling         |
| `sd-feature-store.js`       | Feature Store          |
| `sd-stream-inference.js`    | Real-time ML inference |
| `sd-agent-orchestration.js` | AI Agents              |
| `sd-finetuning-pipeline.js` | Fine-tuning pipeline   |

## Vector DB Visualization Flow

```txt
Document chunking → Embedding generation → ANN indexing
→ Vector similarity search → Reranking
→ Context assembly → LLM response
```

---

# MISSING CRITICAL SYSTEM DESIGN TOPICS

## Networking

- TCP Internals (3-way handshake, congestion control, BBR)
- QUIC (0-RTT, multiplexed streams, no HOL blocking)
- NAT (connection tracking, SNAT/DNAT)
- VPN (tunnel types, overlay)
- BGP (AS path, route propagation)
- TLS Handshake (1.2 vs 1.3, 0-RTT)
- WebRTC (ICE, STUN, TURN, DTLS)
- Service Discovery (DNS-based, Consul, etcd)

## Distributed Systems

- Raft (leader election, log replication, split vote)
- Paxos (prepare/promise/accept/commit)
- Gossip Protocol (epidemic spread, convergence)
- Leader Election (ZooKeeper ZAB, bully algorithm)
- Vector Clocks (causality, happens-before)
- CRDTs (conflict-free merge, op-based vs state-based)
- Distributed Transactions (2PC, 3PC, saga vs XA)

## Database Internals

- MVCC (snapshot isolation, version chains)
- WAL (write-ahead log, crash recovery)
- Replication (semi-sync, async, group replication)
- Query Planner (EXPLAIN, index selection, join order)
- B+ Trees (insert/split, range scan)
- LSM Trees (MemTable → SSTable → compaction)
- Bloom Filters (false positive rate, space tradeoff)

## Kubernetes Deep Dive

- kube-proxy (iptables vs IPVS)
- CNI (Flannel/Calico/Cilium packet path)
- CSI (volume provisioning lifecycle)
- CRI (containerd shim, OCI spec)
- etcd internals (raft + BoltDB)
- Scheduler internals (filter + score + bind)

## Messaging

- Kafka internals (log segments, index files, zero-copy)
- RabbitMQ exchanges (direct/topic/fanout/headers)
- Pulsar architecture (BookKeeper ledgers, cursor)
- CDC pipelines (Debezium → Kafka → consumers)

## Scalability Patterns

- Backpressure (token bucket, leaky bucket, windowed)
- Bulkheads (thread pool isolation, semaphore)
- Retry storms (exponential backoff, jitter, max attempts)
- Token bucket algorithm (refill rate, burst)
- Leaky bucket algorithm (output rate, overflow)

## Security

- mTLS (mutual cert exchange, SPIFFE SVID)
- OAuth2 internals (authorization code + PKCE flow)
- JWT attack vectors (alg:none, weak secrets, expiry)
- Zero Trust (never trust, always verify, microsegmentation)
- SPIFFE/SPIRE (workload identity, attestation)

## Cloud

- Multi-region failover (active-active vs active-passive)
- Active-active (global load balancing, conflict resolution)
- DR architecture (RTO/RPO, runbooks, gamedays)
- Edge computing (edge functions, latency reduction)

---

# EVENT BUS & STATE MANAGEMENT

## Event Bus (all interactions use central bus)

```js
EventBus.emit("NODE_SELECTED", node);
EventBus.emit("PROTOCOL_HOVER", protocol);
EventBus.emit("FAILURE_TRIGGERED", failure);
EventBus.emit("STORY_NEXT_SCENE");
EventBus.emit("OVERLAY_TOGGLE", "metrics");
EventBus.emit("CAMERA_FOCUS", nodeId);
```

Prevents tight coupling between renderer ↔ overlay ↔ story ↔ controls.

## State Store (centralized reactive)

```js
const store = {
  selectedNode: null,
  hoveredProtocol: null,
  activeOverlay: "metrics",
  storyScene: 0,
  focusedPath: [],
  animationState: "playing", // 'playing'|'paused'|'stopped'
  cameraTransform: { x: 0, y: 0, scale: 1 },
  filterClusters: new Set(["all"]),
};
```

---

# MOBILE/TABLET RESPONSIVE MODE

- Collapsible layer bands (tap header to collapse)
- Touch gestures (pinch zoom, two-finger pan)
- Simplified node rendering (icon only, no sublabels)
- Compact overlays (metric badge only, no full card)
- Mini-map navigation (bottom-right corner)
- Hamburger controls (floating toolbar collapses to icon)

---

# FUTURE ADVANCED FEATURES

| Feature                        | Purpose                                  |
| ------------------------------ | ---------------------------------------- |
| Time-travel replay             | Replay production incidents step by step |
| Multiplayer collaborative mode | Shared learning sessions                 |
| Voice narration                | Guided architecture tour with TTS        |
| AI explainer                   | Dynamic node explanation via LLM         |
| Production metrics import      | Real Grafana/Prometheus data             |
| Kubernetes live cluster sync   | Real cluster topology via kubeconfig     |
| AWS infra import               | Visualize deployed infra from AWS API    |
| GitHub architecture generation | Auto diagrams from repo structure        |
| OpenAPI import                 | Generate service graph from spec         |
| Terraform visualization        | Infra map from .tf files                 |
| Kafka topic explorer           | Stream topology from broker              |
| JVM memory animation           | Live GC visualization                    |
| Redis eviction simulator       | LFU/LRU animation with real data         |

---

# GAME ENGINE RENDER LOOP

Needed for large graphs (1000+ nodes):

```js
function gameLoop() {
  updatePhysics(); // force-directed positions
  updateAnimations(); // packet flows, pulses
  processEvents(); // click, hover, keyboard
  render(); // only dirty nodes
  requestAnimationFrame(gameLoop);
}
```

Massively smoother than scattered DOM timers. Prevents jank under load.

---

# FINAL GOLDEN PRINCIPLE

```txt
TOPICS SHOULD DESCRIBE.
ENGINE SHOULD RENDER.

Never mix rendering, animation, DOM, business logic,
or topic data inside topic files.

Pure declarative configs only.

This is the key scalability architecture principle.
```



# SYSTEM_DESIGN.md

# 🏗️ System Design Architecture

> System design principles, scalability models, distributed architecture patterns, and infrastructure planning for the Interactive Engineering Learning Platform.

---

# 🌟 Vision

Build a platform capable of supporting:

- interactive engineering learning
- realtime simulations
- AI-assisted tutoring
- distributed visualizations
- semantic knowledge search
- collaborative learning
- large-scale topic rendering

with production-grade scalability.

---

# 🎯 Primary Goals

The platform architecture should support:

```text
Scalability
Realtime Interaction
Low Latency
High Availability
Distributed Processing
AI Workloads
Visualization Rendering
```

---

# 🧠 System Design Philosophy

The platform is designed as:

```text
Knowledge Infrastructure
+
Visualization Platform
+
Simulation Engine
+
AI Learning System
```

rather than a traditional static website.

---

# 🔥 High-Level System Architecture

```text
                           ┌──────────────────┐
                           │      Users       │
                           └────────┬─────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │        CDN          │
                         └────────┬────────────┘
                                  │
                                  ▼
                      ┌──────────────────────────┐
                      │     Frontend Client      │
                      └──────────┬───────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │        API Gateway         │
                    └──────────┬─────────────────┘
                               │
       ┌───────────────────────┼────────────────────────┐
       ▼                       ▼                        ▼
┌──────────────┐      ┌────────────────┐      ┌────────────────┐
│ Topic Service│      │ Visualization  │      │   AI Service   │
└──────────────┘      └────────────────┘      └────────────────┘
       │                       │                        │
       ▼                       ▼                        ▼
┌──────────────┐      ┌────────────────┐      ┌────────────────┐
│ PostgreSQL   │      │ Redis Cache   │      │ Vector Database │
└──────────────┘      └────────────────┘      └────────────────┘
```

---

# 🧩 Core Services

# 1. API Gateway

# Responsibilities

- request routing
- authentication
- rate limiting
- API aggregation
- request logging
- security filtering

---

# Recommended Technologies

| Area | Technology |
|---|---|
| Gateway | Kong |
| Alternative | Envoy |
| Auth | JWT/OAuth2 |

---

# Example Request Flow

```text
Client Request
   ↓
API Gateway
   ↓
Authentication
   ↓
Rate Limiting
   ↓
Service Routing
```

---

# 2. Topic Service

# Responsibilities

- topic management
- markdown parsing
- topic metadata
- dependency graph
- topic search
- content rendering

---

# Topic Service Architecture

```text
Topic Request
   ↓
Topic Loader
   ↓
Schema Parser
   ↓
Renderer
   ↓
Frontend Response
```

---

# Database Design

## Tables

### topics

```sql
CREATE TABLE topics (
  id UUID PRIMARY KEY,
  title TEXT,
  category TEXT,
  difficulty TEXT
);
```

---

### topic_relations

```sql
CREATE TABLE topic_relations (
  source_topic UUID,
  target_topic UUID
);
```

---

# 3. Visualization Service

# Responsibilities

- animation orchestration
- graph rendering
- runtime simulations
- packet movement
- execution replay

---

# Visualization Flow

```text
Simulation Event
   ↓
Event Engine
   ↓
Animation Timeline
   ↓
Frontend Rendering
```

---

# Planned Features

- replay system
- realtime simulation
- event injection
- speed controls
- failure simulation

---

# 4. AI Service

# Responsibilities

- semantic search
- AI tutoring
- interview simulation
- debugging assistance
- architecture review

---

# AI Service Architecture

```text
User Query
   ↓
Embedding Generation
   ↓
Vector Search
   ↓
Context Retrieval
   ↓
LLM
   ↓
AI Response
```

---

# AI Databases

| Database | Purpose |
|---|---|
| Qdrant | Vector embeddings |
| PostgreSQL | Metadata |
| Redis | AI caching |
| ElasticSearch | Search |

---

# 5. Search Service

# Responsibilities

- full-text search
- semantic search
- topic recommendations
- autocomplete
- ranking

---

# Search Flow

```text
Query
   ↓
ElasticSearch
   ↓
Semantic Ranking
   ↓
Results
```

---

# 6. Analytics Service

# Responsibilities

- learning analytics
- topic engagement
- simulation metrics
- AI interaction tracking

---

# Metrics Examples

- topic completion
- learning progression
- simulation usage
- AI usage
- replay frequency

---

# ⚡ Event-Driven Architecture

# Goal

Use asynchronous systems for scalability.

---

# Event Flow

```text
User Action
   ↓
Kafka Event
   ↓
Analytics Consumer
   ↓
Metrics Storage
```

---

# Planned Kafka Usage

| Use Case | Purpose |
|---|---|
| analytics | learning metrics |
| AI workflows | async AI tasks |
| notifications | realtime alerts |
| collaboration | shared sessions |
| simulation events | distributed runtime events |

---

# 🗄️ Database Architecture

# PostgreSQL

Used for:

- user data
- topic metadata
- relationships
- configurations

---

# Redis

Used for:

- caching
- sessions
- realtime state
- rate limiting

---

# ElasticSearch

Used for:

- search
- indexing
- autocomplete

---

# Qdrant

Used for:

- embeddings
- semantic search
- AI retrieval

---

# S3 Storage

Used for:

- diagrams
- assets
- animation files
- uploaded content

---

# ☁️ Infrastructure Design

# Planned Cloud Architecture

```text
CloudFront CDN
        ↓
Frontend App
        ↓
Kubernetes Cluster
        ↓
Microservices
        ↓
Databases
```

---

# Kubernetes Deployment

```text
Ingress
   ↓
API Gateway
   ↓
Services
   ↓
Pods
```

---

# Planned Kubernetes Components

| Component | Purpose |
|---|---|
| Ingress | routing |
| HPA | autoscaling |
| ConfigMaps | configuration |
| Secrets | credentials |
| StatefulSets | databases |

---

# 🚀 Scalability Strategy

# Horizontal Scaling

Services should scale independently.

Example:

```text
AI Service → High CPU scaling
Visualization → GPU scaling
Search → Query scaling
```

---

# Caching Strategy

# Redis Layers

| Layer | Purpose |
|---|---|
| topic cache | fast rendering |
| AI response cache | reduce costs |
| visualization cache | replay optimization |

---

# CDN Strategy

Use CDN for:

- static assets
- diagrams
- animation bundles
- topic media

---

# 🔒 Security Architecture

# Authentication

- JWT
- OAuth2
- role-based access

---

# API Security

- rate limiting
- request validation
- CORS protection
- bot protection

---

# Data Security

- encrypted storage
- secrets management
- secure AI APIs

---

# 📊 Observability Architecture

# Logging

| Tool | Purpose |
|---|---|
| Loki | logs |
| FluentBit | log shipping |

---

# Metrics

| Tool | Purpose |
|---|---|
| Prometheus | metrics |
| Grafana | dashboards |

---

# Tracing

| Tool | Purpose |
|---|---|
| OpenTelemetry | tracing |
| Jaeger | distributed tracing |

---

# Example Trace

```text
Frontend
 ↓
Gateway
 ↓
AI Service
 ↓
Vector Search
 ↓
LLM
```

---

# 🧠 Knowledge Graph Architecture

# Goal

Connect engineering concepts.

---

# Example Graph

```text
Threads
   ↓
Executors
   ↓
CompletableFuture
   ↓
Reactive Systems
```

---

# Topic Dependency Engine

Used for:

- learning paths
- recommendations
- prerequisite validation

---

# 🎬 Realtime Collaboration Design

# Future Features

- shared whiteboards
- collaborative simulations
- pair debugging
- architecture review rooms

---

# Collaboration Flow

```text
User Action
   ↓
WebSocket Event
   ↓
Collaboration Service
   ↓
Realtime Broadcast
```

---

# 🤖 AI System Scaling

# Challenges

- embedding generation
- LLM latency
- vector search
- context assembly

---

# Optimization Strategies

- response caching
- semantic chunking
- reranking
- prompt compression

---

# 🔥 Failure Handling

# Planned Resilience Features

- retries
- circuit breakers
- fallback responses
- DLQ
- graceful degradation

---

# Example Failure Flow

```text
AI Service Failure
   ↓
Fallback Cache
   ↓
Static Explanation
```

---

# 🧪 Future Advanced Systems

# Planned Features

- distributed simulation engine
- multiplayer engineering sandbox
- AI-generated visualizations
- execution replay engine
- architecture validation engine

---

# 🚀 Long-Term System Vision

Build:

```text
Interactive Engineering Knowledge Infrastructure
```

capable of supporting:

- millions of learning interactions
- realtime engineering simulations
- AI-assisted education
- collaborative architecture learning

---

# 💡 Core System Design Principle

```text
Every engineering concept
should be explorable
as a living interactive system.
```