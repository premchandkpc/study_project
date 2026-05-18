# Saga Pattern - Distributed Transactions Without 2PC

## Quick Facts

- Area: System Design
- Tag: Architecture
- Source: `src/modules/topics/sysdesign/sd-saga-patterns.js`
- Tags: `saga`, `orchestration`, `choreography`, `distributed transaction`, `compensation`, `2pc`, `long running transaction`
- Visual coverage: live visual, flow lab, UML lab, architecture map

## Concept

**The problem:** When an operation spans multiple microservices (order placement = create order + reserve inventory + charge payment), you need atomicity - but each service has its own DB, so traditional 2PC is impractical.

**2PC problems:** Coordinator is a single point of failure; all participants must be synchronously available; holds locks during prepare phase (deadly for performance).

**Saga pattern:** Break the distributed transaction into a sequence of local transactions. Each step publishes an event. If a step fails, execute **compensating transactions** to undo previous steps.

**Choreography saga:** Services react to events from each other. No central coordinator.

- Pros: simple, no SPOF, loose coupling
- Cons: hard to track workflow state, circular dependencies, hard to debug

**Orchestration saga:** A central **Saga Orchestrator** coordinates the sequence, calls each service, and manages compensation on failure.

- Pros: workflow visible in one place, easier to add steps, centralized error handling
- Cons: orchestrator can become a bottleneck, extra service to deploy

**Compensation example (order cancellation):**

```
Forward:      CreateOrder -> ReserveInventory -> ChargePayment -> ShipOrder
Compensation: CancelOrder <- ReleaseInventory <- RefundPayment <- CancelShipment
```

**Idempotency:** Each step must be idempotent - retrying a compensating transaction must be safe.

## Why It Matters

Saga is the go-to pattern for distributed transactions in microservices. Every e-commerce, fintech, and logistics system uses it. Understanding choreography vs orchestration trade-offs is a senior-level expectation.

## Architecture / Mental Model

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

## Runtime / Sequence

```mermaid
sequenceDiagram
  participant client as Client
  participant orchestrator as Saga Orchestrator
  participant inventory as Inventory Svc
  participant payment as Payment Svc
  participant shipping as Shipping Svc
  client->>orchestrator: PlaceOrder(orderId, items, amount)
  orchestrator->>inventory: ReserveInventory(orderId, items)
  inventory->>orchestrator: InventoryReserved
  orchestrator->>payment: ChargePayment(orderId, amount)
  payment->>orchestrator: PaymentFailed (insufficient funds)
  orchestrator-->>inventory: ReleaseInventory(orderId) [COMPENSATION]
  inventory->>orchestrator: InventoryReleased
  orchestrator->>client: SagaFailed: Payment declined
```

## Animation Plan

- Flow lab available: step-by-step path highlighting.
- UML sequence simulation available: actor messages animate in order.
- Architecture map available: clickable nodes and sync/async links.
- Live visual exists in app: topic-specific canvas/ReactViz animation.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Example

```java
// Orchestration Saga with Spring State Machine
@Service
public class OrderSagaOrchestrator {

    @Autowired private InventoryServiceClient inventory;
    @Autowired private PaymentServiceClient payment;
    @Autowired private ShippingServiceClient shipping;
    @Autowired private SagaStateRepository sagaRepo;

    @Transactional
    public SagaResult placeOrder(PlaceOrderRequest req) {
        SagaState saga = sagaRepo.save(SagaState.start(req.getOrderId()));

        try {
            // Step 1: Reserve inventory
            saga.transition(SagaStep.RESERVING_INVENTORY);
            inventory.reserve(req.getOrderId(), req.getItems()); // idempotent
            saga.transition(SagaStep.INVENTORY_RESERVED);

            // Step 2: Charge payment
            saga.transition(SagaStep.CHARGING_PAYMENT);
            payment.charge(req.getOrderId(), req.getAmount()); // idempotent
            saga.transition(SagaStep.PAYMENT_CHARGED);

            // Step 3: Create shipment
            saga.transition(SagaStep.CREATING_SHIPMENT);
            shipping.createShipment(req.getOrderId(), req.getAddress());
            saga.transition(SagaStep.COMPLETED);

            sagaRepo.save(saga);
            return SagaResult.success();

        } catch (InventoryException e) {
            // No compensation needed - inventory was never reserved
            saga.fail(e.getMessage());
            sagaRepo.save(saga);
            return SagaResult.failure("Insufficient inventory");

        } catch (PaymentException e) {
            // Compensate: release inventory
            saga.transition(SagaStep.COMPENSATING);
            inventory.release(req.getOrderId()); // compensation - idempotent
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Payment failed - inventory released");

        } catch (ShippingException e) {
            // Compensate: refund payment + release inventory
            saga.transition(SagaStep.COMPENSATING);
            payment.refund(req.getOrderId());    // compensation
            inventory.release(req.getOrderId()); // compensation
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Shipping failed - payment refunded");
        }
    }
}
```

Notes:
Always persist saga state before and after each step. On crash, restart mechanism can resume from last known state and retry or compensate.

## Complexity And Performance

- Time/space complexity depends on input size, data volume, and implementation choices.
- Track latency, throughput, memory, saturation, error rate, and correctness invariants.

## Interview Drills

1. When would you choose choreography saga over orchestration saga?
   Answer: **Choreography:** Each service listens for events and decides what to do next.
   - Choose when: few steps (2-3), loose coupling priority, team autonomy important, simple linear flow
   - Problem: as steps grow, workflow becomes a distributed state machine spread across services - hard to understand and debug. "What is the current state of order 42?" requires querying all services.

   **Orchestration:** Central orchestrator controls the flow.
   - Choose when: complex workflows (5+ steps), need centralized monitoring and visibility, conditional logic needed, team wants explicit failure handling
   - Problem: orchestrator knows about all services - creates coupling. Must be deployed and operated.

   **Hybrid:** Use orchestration for complex workflows but keep services autonomous (they don't know they're in a saga - just respond to commands).
   Follow-ups: How do you handle retries in a saga when a step fails intermittently?; What is the difference between a saga and a workflow engine (Temporal)?

## Trade-offs

Pros:

- Achieves distributed atomicity without distributed locks
- Each service owns its local transaction
- Compensations are business-meaningful operations (not technical rollbacks)

Cons:

- Eventual consistency - order may be visible as partially created during saga
- Compensation logic must be carefully designed for every failure scenario
- Debugging failures across services is hard

When to use:
Use when you need atomicity across services that own different databases. For read-heavy flows, prefer eventual consistency with idempotent consumers instead.

## Gotchas

_No gotchas configured._
