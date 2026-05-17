# Event-Driven Architecture - EDA, CQRS & Event Sourcing

Source: `src/modules/topics/sysdesign/sd-event-driven.js`
Tag: `Architecture`
Doc path: `docs/system-design/sd-event-driven.md`

## Concept
**Event-Driven Architecture (EDA):** Services communicate by publishing and consuming events. No direct coupling - publisher doesn't know about consumers.

**Event types:**
- **Domain event** - something that happened (OrderPlaced, PaymentProcessed). Immutable fact.
- **Command** - intent to change state (PlaceOrder). Can be rejected.
- **Query** - read request. No side effects.

**CQRS (Command Query Responsibility Segregation):**
Separate write model (commands -> aggregates -> events) from read model (projections optimised for queries).
- Write side: normalised, event-sourced, strongly consistent
- Read side: denormalised, eventually consistent, optimised for specific views

**Event Sourcing:** Store state as a sequence of events rather than current state.
```
Events: [OrderCreated, ItemAdded, ItemAdded, OrderConfirmed, PaymentFailed, Retried, PaymentSuccess]
Current state = apply(all events) = {status: PAID, items: [...], total: 99.99}
```

**Benefits:** Complete audit trail, temporal queries ("what was the state on Tuesday?"), replay to fix bugs, event-driven integration is natural.

**Challenges:** Event schema evolution (upcasters), eventual consistency, projections can lag, complex debugging.

**Snapshot optimization:** After N events, store a snapshot of current state. Rebuild from snapshot + events since snapshot.

## Production Architecture
CQRS+ES appears in DDD-heavy organizations (banking, insurance, logistics). Understanding it separates architects from developers in senior interviews.

## Architecture Checklist
- Sources / Producer Services: Publish domain events with idempotency keys and schema versions.
- Broker / Broker / Log: Stores ordered partitions, applies retention, and isolates producer from consumers.
- Consumers / Consumer Group: Scales by partition or queue concurrency and commits progress after processing.
- Processing / Projector / Worker: Updates read models, calls downstream services, and retries transient failures.
- Failure / DLQ / Replay Store: Captures failed messages with reason, payload, and replay controls.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Sources"]
    producer["Producer Services"]
  end
  subgraph lane_1["Broker"]
    broker["Broker / Log"]
  end
  subgraph lane_2["Consumers"]
    consumer["Consumer Group"]
  end
  subgraph lane_3["Processing"]
    processor["Projector / Worker"]
  end
  subgraph lane_4["Failure"]
    dlq["DLQ / Replay Store"]
  end
  producer -->|"ingress"| broker
  broker -->|"sync request"| consumer
  consumer -.->|"async event"| processor
  consumer -->|"state access"| dlq
  dlq -.->|"replay / repair"| processor
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Producer
  participant a1 as Broker
  participant a2 as Consumer Group
  participant a3 as Processor
  participant a4 as DLQ / Store
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

1. Send command - Client sends PlaceOrderCommand. Command bus routes to OrderCommandHandler.
2. Command handled - Aggregate validates business rules. If valid, emits OrderPlacedEvent.
3. Persist event - Event appended to event store. Immutable - never updated or deleted.
4. Event triggers projection - Projection handler subscribes to event store. Rebuilds read model on each new event.
5. Update read model - Denormalised view updated in read DB (e.g. Elasticsearch or PostgreSQL view).
6. Query read model - Client queries via query bus. Handler reads from fast, denormalised read DB.
7. Return projection - Read model returned. No joining - pre-computed view.

## Interview Drills
1. What are the downsides of event sourcing?
   1. **Eventual consistency** - projections (read models) lag behind the event store. Reads may return stale data.
   2. **Schema evolution** - once an event is stored, you can't change its structure without upcasters (migration functions that transform old events to new shape).
   3. **Query complexity** - you can't do ad-hoc SQL queries on event store; must build projections for every query pattern.
   4. **Performance** - rebuilding state from 10,000 events per aggregate is slow without snapshots.
   5. **Mental model shift** - team must think in events, not CRUD. High learning curve.
   6. **Debugging** - a bug manifests across many events; hard to reason about current state.
   Follow-ups: What is an upcaster in event sourcing?; When would you NOT use event sourcing?

## Trade-offs
Pros:
- Complete audit trail (built-in compliance)
- Replay events to fix bugs or build new projections
- Natural fit for event-driven integration

Cons:
- Eventual consistency complexity
- Schema evolution requires upcasters
- Overkill for simple CRUD applications

When to use:
Use for: complex domains with audit requirements (finance, healthcare), workflows with many state transitions, systems where historical data replay has value. Avoid for: simple CRUD, small teams without DDD experience.

## Gotchas
_No gotchas yet._

