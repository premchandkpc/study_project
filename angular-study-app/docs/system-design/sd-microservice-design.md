# Microservice Design - DDD, Boundaries & Strangler Fig

Source: `src/modules/topics/sysdesign/sd-microservice-design.js`
Tag: `Architecture`
Doc path: `docs/system-design/sd-microservice-design.md`

## Concept
**Domain-Driven Design (DDD)** provides the vocabulary for designing microservice boundaries.

**Key DDD concepts:**
- **Domain** - the problem space your business operates in
- **Bounded Context** - an explicit boundary within which a domain model applies. Different BCs can use the same word with different meanings (Order in Shipping BC vs Order in Billing BC).
- **Aggregate** - cluster of entities treated as a single unit for data changes. All changes go through the aggregate root. Example: Order aggregate (root) + OrderItems + DeliveryAddress.
- **Domain Events** - facts that happened in the domain (OrderPlaced, PaymentFailed). First-class citizens for integration between BCs.
- **Anti-Corruption Layer (ACL)** - translation layer between two BCs to prevent one's model from leaking into the other.

**Service boundary heuristics:**
1. Each service owns one bounded context
2. Services communicate via domain events (async) or well-defined APIs (sync)
3. No shared database - each service has its own DB (polyglot persistence)
4. Services can be deployed independently
5. A service can be rewritten without changing other services

**Strangler Fig pattern** - migrate monolith to microservices incrementally:
1. Route new feature traffic to new microservice (via API gateway)
2. Gradually migrate existing features to microservices
3. Decommission monolith code path once all traffic migrated
4. Monolith "strangled" over months/years without big-bang rewrite

## Production Architecture
Getting service boundaries wrong is the #1 failure mode in microservices migrations. Too fine-grained = distributed monolith (services chatty, tightly coupled). Too coarse = monolith with deployment overhead.

## Architecture Checklist
- Users / Clients: Browsers, apps, jobs, or services send requests with latency budgets.
- Edge / Edge / Gateway: Terminates TLS, applies routing, rate limits, and health-aware forwarding.
- Compute / Service Pool: Runs stateless instances, containers, pods, or functions across zones.
- Data Plane / Data / Messaging: Persists state, caches hot keys, and buffers async work.
- Control / Control Plane: Runs discovery, autoscaling, config rollout, telemetry, and failover.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Users"]
    client["Clients"]
  end
  subgraph lane_1["Edge"]
    edge["Edge / Gateway"]
  end
  subgraph lane_2["Compute"]
    service["Service Pool"]
  end
  subgraph lane_3["Data Plane"]
    data["Data / Messaging"]
  end
  subgraph lane_4["Control"]
    control["Control Plane"]
  end
  client -->|"ingress"| edge
  edge -->|"sync request"| service
  service -.->|"async event"| data
  service -->|"state access"| control
  control -.->|"replay / repair"| data
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Client
  participant a1 as Edge / Gateway
  participant a2 as Service Pool
  participant a3 as Data Plane
  participant a4 as Control Plane
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
1. How do you decide the right size for a microservice?
   **Too small (nano-services):**
   - Excessive network calls between services (chattiness)
   - Distributed transactions for what should be local operations
   - Operational overhead disproportionate to value
   
   **Too large:**
   - Independent deployability compromised (change in one area requires full deployment)
   - Teams stepping on each other's code
   
   **Right size heuristics:**
   1. **Single bounded context** - one team, one service, one deployment
   2. **Two-pizza rule** - if it takes more than 2 pizzas to feed the team, split the service
   3. **Change frequency** - frequently changed together = together in one service
   4. **Data ownership** - each service owns its data; if two services share a table, merge them
   5. **The 3R test:** Can you Rewrite it in 2 weeks, Release independently, and Run it autonomously?
   Follow-ups: What is the Strangler Fig pattern and when would you use it?; How do you handle distributed transactions when each service has its own database?

## Trade-offs
Pros:
- Independent deployability and scaling
- Technology heterogeneity - right tool per service
- Fault isolation - one service down doesn't take all others

Cons:
- Distributed system complexity - network failures, latency, consistency
- Operational overhead - monitoring 50 services vs 1 monolith
- Data consistency across services requires eventual consistency patterns

When to use:
Start with a modular monolith. Extract microservices when: team size > 8, deployment bottlenecks, need to scale one component independently, different technology requirements per component.

## Gotchas
_No gotchas yet._

