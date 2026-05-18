(function() {
  var topic = {
    id:"sd-event-driven", area:"sysdesign",
    title:"Event-Driven Architecture — EDA, CQRS & Event Sourcing",
    tag:"Architecture", tags:["eda","cqrs","event sourcing","event store","projection","read model","axon","domain events"],
    concept:`**Event-Driven Architecture (EDA):** Services communicate by publishing and consuming events. No direct coupling — publisher doesn't know about consumers.

**Event types:**
- **Domain event** — something that happened (OrderPlaced, PaymentProcessed). Immutable fact.
- **Command** — intent to change state (PlaceOrder). Can be rejected.
- **Query** — read request. No side effects.

**CQRS (Command Query Responsibility Segregation):**
Separate write model (commands → aggregates → events) from read model (projections optimised for queries).
- Write side: normalised, event-sourced, strongly consistent
- Read side: denormalised, eventually consistent, optimised for specific views

**Event Sourcing:** Store state as a sequence of events rather than current state.
\`\`\`
Events: [OrderCreated, ItemAdded, ItemAdded, OrderConfirmed, PaymentFailed, Retried, PaymentSuccess]
Current state = apply(all events) = {status: PAID, items: [...], total: 99.99}
\`\`\`

**Benefits:** Complete audit trail, temporal queries ("what was the state on Tuesday?"), replay to fix bugs, event-driven integration is natural.

**Challenges:** Event schema evolution (upcasters), eventual consistency, projections can lag, complex debugging.

**Snapshot optimization:** After N events, store a snapshot of current state. Rebuild from snapshot + events since snapshot.`,
    why:"CQRS+ES appears in DDD-heavy organizations (banking, insurance, logistics). Understanding it separates architects from developers in senior interviews.",
    example:{
      language:"java",
      code:`// Event Sourcing with Axon Framework
@Aggregate
public class OrderAggregate {
    @AggregateIdentifier private String orderId;
    private OrderStatus status;
    private List<OrderItem> items = new ArrayList<>();

    // Command handler — validates and emits event
    @CommandHandler
    public OrderAggregate(CreateOrderCommand cmd) {
        AggregateLifecycle.apply(new OrderCreatedEvent(
            cmd.getOrderId(), cmd.getCustomerId()));
    }

    @CommandHandler
    public void handle(AddItemCommand cmd) {
        if (status != OrderStatus.DRAFT)
            throw new IllegalStateException("Cannot modify confirmed order");
        AggregateLifecycle.apply(new ItemAddedEvent(
            orderId, cmd.getProductId(), cmd.getQuantity(), cmd.getPrice()));
    }

    // Event sourcing handler — rebuilds state from events
    @EventSourcingHandler
    public void on(OrderCreatedEvent event) {
        this.orderId = event.getOrderId();
        this.status = OrderStatus.DRAFT;
    }

    @EventSourcingHandler
    public void on(ItemAddedEvent event) {
        this.items.add(new OrderItem(event.getProductId(),
                                     event.getQuantity(), event.getPrice()));
    }
}

// Projection — builds read model from events
@Component
@ProcessingGroup("order-summary-projection")
public class OrderSummaryProjection {

    @Autowired private OrderSummaryRepository repository;

    @EventHandler
    public void on(OrderCreatedEvent event) {
        repository.save(new OrderSummary(event.getOrderId(),
                                         event.getCustomerId(), OrderStatus.DRAFT));
    }

    @EventHandler
    public void on(ItemAddedEvent event) {
        OrderSummary summary = repository.findById(event.getOrderId()).orElseThrow();
        summary.addItem(event.getProductId(), event.getQuantity(), event.getPrice());
        repository.save(summary);
    }

    // Query handler — serves read model
    @QueryHandler
    public OrderSummary handle(GetOrderSummaryQuery query) {
        return repository.findById(query.getOrderId()).orElseThrow();
    }
}`,
      notes:"Axon stores events in its Event Store. Projections are rebuilt by replaying all events — allows fixing bugs in projections without touching source data."
    },
    interview:[
      {question:"What are the downsides of event sourcing?",
        answer:"1. **Eventual consistency** — projections (read models) lag behind the event store. Reads may return stale data.\n2. **Schema evolution** — once an event is stored, you can't change its structure without upcasters (migration functions that transform old events to new shape).\n3. **Query complexity** — you can't do ad-hoc SQL queries on event store; must build projections for every query pattern.\n4. **Performance** — rebuilding state from 10,000 events per aggregate is slow without snapshots.\n5. **Mental model shift** — team must think in events, not CRUD. High learning curve.\n6. **Debugging** — a bug manifests across many events; hard to reason about current state.",
        followUps:["What is an upcaster in event sourcing?","When would you NOT use event sourcing?"]
      }
    ],
    tradeoffs:{
      pros:["Complete audit trail (built-in compliance)","Replay events to fix bugs or build new projections","Natural fit for event-driven integration"],
      cons:["Eventual consistency complexity","Schema evolution requires upcasters","Overkill for simple CRUD applications"],
      when:"Use for: complex domains with audit requirements (finance, healthcare), workflows with many state transitions, systems where historical data replay has value. Avoid for: simple CRUD, small teams without DDD experience."
    },
    visual: {
      type: "flow",
      title: "Event-Driven Fan-out — Order Service",
      direction: "horizontal",
      nodes: [
        { id: "order",     label: "Order Service",    color: "#ffa657", icon: "🛒", sublabel: "publishes order.placed" },
        { id: "kafka",     label: "Kafka Topic",       color: "#ffa657", icon: "📨", sublabel: "order.placed event" },
        { id: "payment",   label: "Payment Svc",       color: "#58a6ff", icon: "💳", sublabel: "consumes & charges" },
        { id: "inventory", label: "Inventory Svc",     color: "#3fb950", icon: "📦", sublabel: "reserves stock" },
        { id: "notif",     label: "Notification Svc",  color: "#bc8cff", icon: "🔔", sublabel: "sends email/push" },
        { id: "dlq",       label: "Dead Letter Queue", color: "#f85149", icon: "💀", sublabel: "failed after 3 retries" }
      ],
      connections: [
        { from: "order",     to: "kafka",     label: "publish event",     protocol: "Kafka" },
        { from: "kafka",     to: "payment",   label: "fan-out",           protocol: "Kafka" },
        { from: "kafka",     to: "inventory", label: "fan-out",           protocol: "Kafka" },
        { from: "kafka",     to: "notif",     label: "fan-out",           protocol: "Kafka" },
        { from: "inventory", to: "dlq",       label: "on failure",        protocol: "DLQ",   dashed: true }
      ],
      scenarios: [
        { name: "Happy Path",       path: ["order","kafka","payment","inventory","notif"],     result: "All consumers handled ✓",    resultColor: "#3fb950" },
        { name: "Consumer Failure", path: ["order","kafka","inventory","dlq"],                 result: "Inventory failed → DLQ",      resultColor: "#f85149" }
      ]
    },
    flow:{
      title:"CQRS Write + Read Path",
      caption:"Commands mutate via aggregates; queries read from projections",
      nodes:[
        {id:"client",label:"Client",hint:"Sends commands and queries"},
        {id:"cmd-bus",label:"Command Bus",hint:"Routes command to handler"},
        {id:"aggregate",label:"Order Aggregate",hint:"Validates + emits events"},
        {id:"event-store",label:"Event Store",hint:"Immutable append-only log"},
        {id:"projection",label:"Projection",hint:"Builds read model from events"},
        {id:"read-db",label:"Read DB",hint:"Optimised read model (denormalised)"},
        {id:"query-handler",label:"Query Handler",hint:"Serves read model"}
      ],
      steps:[
        {path:["client","cmd-bus"],label:"Send command",detail:"Client sends PlaceOrderCommand. Command bus routes to OrderCommandHandler."},
        {path:["cmd-bus","aggregate"],label:"Command handled",detail:"Aggregate validates business rules. If valid, emits OrderPlacedEvent."},
        {path:["aggregate","event-store"],label:"Persist event",detail:"Event appended to event store. Immutable — never updated or deleted."},
        {path:["event-store","projection"],label:"Event triggers projection",detail:"Projection handler subscribes to event store. Rebuilds read model on each new event."},
        {path:["projection","read-db"],label:"Update read model",detail:"Denormalised view updated in read DB (e.g. Elasticsearch or PostgreSQL view)."},
        {path:["client","query-handler"],label:"Query read model",detail:"Client queries via query bus. Handler reads from fast, denormalised read DB."},
        {path:["query-handler","read-db"],label:"Return projection",detail:"Read model returned. No joining — pre-computed view."}
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
