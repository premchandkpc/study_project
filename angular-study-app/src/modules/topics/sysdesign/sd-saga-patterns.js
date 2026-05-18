(function() {
  var topic = {
    id:"sd-saga-patterns", area:"sysdesign",
    title:"Saga Pattern — Distributed Transactions Without 2PC",
    tag:"Architecture", tags:["saga","orchestration","choreography","distributed transaction","compensation","2pc","long running transaction"],
    concept:`**The problem:** When an operation spans multiple microservices (order placement = create order + reserve inventory + charge payment), you need atomicity — but each service has its own DB, so traditional 2PC is impractical.

**2PC problems:** Coordinator is a single point of failure; all participants must be synchronously available; holds locks during prepare phase (deadly for performance).

**Saga pattern:** Break the distributed transaction into a sequence of local transactions. Each step publishes an event. If a step fails, execute **compensating transactions** to undo previous steps.

**Choreography saga:** Services react to events from each other. No central coordinator.
- Pros: simple, no SPOF, loose coupling
- Cons: hard to track workflow state, circular dependencies, hard to debug

**Orchestration saga:** A central **Saga Orchestrator** coordinates the sequence, calls each service, and manages compensation on failure.
- Pros: workflow visible in one place, easier to add steps, centralized error handling
- Cons: orchestrator can become a bottleneck, extra service to deploy

**Compensation example (order cancellation):**
\`\`\`
Forward:      CreateOrder → ReserveInventory → ChargePayment → ShipOrder
Compensation: CancelOrder ← ReleaseInventory ← RefundPayment ← CancelShipment
\`\`\`

**Idempotency:** Each step must be idempotent — retrying a compensating transaction must be safe.`,
    why:"Saga is the go-to pattern for distributed transactions in microservices. Every e-commerce, fintech, and logistics system uses it. Understanding choreography vs orchestration trade-offs is a senior-level expectation.",
    example:{
      language:"java",
      code:`// Orchestration Saga with Spring State Machine
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
            // No compensation needed — inventory was never reserved
            saga.fail(e.getMessage());
            sagaRepo.save(saga);
            return SagaResult.failure("Insufficient inventory");

        } catch (PaymentException e) {
            // Compensate: release inventory
            saga.transition(SagaStep.COMPENSATING);
            inventory.release(req.getOrderId()); // compensation — idempotent
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Payment failed — inventory released");

        } catch (ShippingException e) {
            // Compensate: refund payment + release inventory
            saga.transition(SagaStep.COMPENSATING);
            payment.refund(req.getOrderId());    // compensation
            inventory.release(req.getOrderId()); // compensation
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Shipping failed — payment refunded");
        }
    }
}`,
      notes:"Always persist saga state before and after each step. On crash, restart mechanism can resume from last known state and retry or compensate."
    },
    interview:[
      {question:"When would you choose choreography saga over orchestration saga?",
        answer:"**Choreography:** Each service listens for events and decides what to do next.\n- Choose when: few steps (2-3), loose coupling priority, team autonomy important, simple linear flow\n- Problem: as steps grow, workflow becomes a distributed state machine spread across services — hard to understand and debug. \"What is the current state of order 42?\" requires querying all services.\n\n**Orchestration:** Central orchestrator controls the flow.\n- Choose when: complex workflows (5+ steps), need centralized monitoring and visibility, conditional logic needed, team wants explicit failure handling\n- Problem: orchestrator knows about all services — creates coupling. Must be deployed and operated.\n\n**Hybrid:** Use orchestration for complex workflows but keep services autonomous (they don't know they're in a saga — just respond to commands).",
        followUps:["How do you handle retries in a saga when a step fails intermittently?","What is the difference between a saga and a workflow engine (Temporal)?"]
      }
    ],
    tradeoffs:{
      pros:["Achieves distributed atomicity without distributed locks","Each service owns its local transaction","Compensations are business-meaningful operations (not technical rollbacks)"],
      cons:["Eventual consistency — order may be visible as partially created during saga","Compensation logic must be carefully designed for every failure scenario","Debugging failures across services is hard"],
      when:"Use when you need atomicity across services that own different databases. For read-heavy flows, prefer eventual consistency with idempotent consumers instead."
    },
    visual: {
      type: "flow",
      title: "Orchestration Saga — Order Placement",
      direction: "horizontal",
      nodes: [
        { id: "client",      label: "Client",          color: "#58a6ff", icon: "💻", sublabel: "PlaceOrder request" },
        { id: "orchestrator",label: "Orchestrator",    color: "#ffa657", icon: "🎯", sublabel: "Coordinates all steps" },
        { id: "order",       label: "Order Svc",        color: "#3fb950", icon: "🛒", sublabel: "1. CreateOrder" },
        { id: "payment",     label: "Payment Svc",      color: "#58a6ff", icon: "💳", sublabel: "2. ChargePayment" },
        { id: "inventory",   label: "Inventory Svc",    color: "#bc8cff", icon: "📦", sublabel: "3. ReserveInventory" },
        { id: "dlq",         label: "DLQ / Rollback",   color: "#f85149", icon: "↩", sublabel: "Compensation on fail" }
      ],
      connections: [
        { from: "client",       to: "orchestrator", label: "PlaceOrder",          protocol: "REST" },
        { from: "orchestrator", to: "order",         label: "1. CreateOrder",      protocol: "RPC" },
        { from: "orchestrator", to: "payment",       label: "2. ChargePayment",    protocol: "RPC" },
        { from: "orchestrator", to: "inventory",     label: "3. ReserveInventory", protocol: "RPC" },
        { from: "inventory",    to: "dlq",           label: "fail → compensate",   protocol: "RPC", dashed: true }
      ],
      scenarios: [
        { name: "Happy Path",         path: ["client","orchestrator","order","payment","inventory"],        result: "Saga COMPLETED ✓",              resultColor: "#3fb950" },
        { name: "Inventory Fail",     path: ["client","orchestrator","order","payment","inventory","dlq"],  result: "Inventory failed → rollback ↩",  resultColor: "#f85149" },
        { name: "Payment Fail",       path: ["client","orchestrator","order","payment","dlq"],              result: "Payment failed → cancel order ↩", resultColor: "#f85149" }
      ]
    },
    uml:{
      title:"Orchestration Saga — Order Placement",
      scenario:"Happy path and payment failure compensation",
      actors:[
        {id:"client",label:"Client"},
        {id:"orchestrator",label:"Saga Orchestrator"},
        {id:"inventory",label:"Inventory Svc"},
        {id:"payment",label:"Payment Svc"},
        {id:"shipping",label:"Shipping Svc"}
      ],
      messages:[
        {from:"client",to:"orchestrator",label:"PlaceOrder(orderId, items, amount)",detail:"Client initiates saga. Orchestrator coordinates all steps.",type:"sync"},
        {from:"orchestrator",to:"inventory",label:"ReserveInventory(orderId, items)",detail:"Step 1: Reserve stock. Idempotent — safe to retry.",type:"sync"},
        {from:"inventory",to:"orchestrator",label:"InventoryReserved",detail:"Success response — saga continues to step 2.",type:"sync"},
        {from:"orchestrator",to:"payment",label:"ChargePayment(orderId, amount)",detail:"Step 2: Charge payment. If this fails, must release inventory.",type:"sync"},
        {from:"payment",to:"orchestrator",label:"PaymentFailed (insufficient funds)",detail:"Payment rejected. Orchestrator must compensate step 1.",type:"sync"},
        {from:"orchestrator",to:"inventory",label:"ReleaseInventory(orderId) [COMPENSATION]",detail:"Compensating transaction: undo step 1 by releasing the reserved stock.",type:"async"},
        {from:"inventory",to:"orchestrator",label:"InventoryReleased",detail:"Compensation confirmed. Saga moves to COMPENSATED state.",type:"sync"},
        {from:"orchestrator",to:"client",label:"SagaFailed: Payment declined",detail:"Client receives failure response. Inventory never depleted from customer's perspective.",type:"sync"}
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
