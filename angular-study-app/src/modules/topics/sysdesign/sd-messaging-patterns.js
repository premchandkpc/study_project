(function() {
  var topic = {
  id:"sd-messaging-patterns", area:"sysdesign",
  title:"Messaging Patterns — Queue, Pub/Sub, Outbox & Dead Letter",
  tag:"Messaging", tags:["message queue","pub sub","dead letter","outbox pattern","rabbitmq","sqs","fanout","at least once","idempotent"],
  concept:`**Point-to-point queue:** Message goes to exactly one consumer. Work queue pattern. RabbitMQ/SQS.
**Pub/sub:** Publisher sends to topic; all subscribers receive a copy. SNS, Kafka consumer groups, Redis pub/sub.

**Delivery guarantees:**
- **At-most-once** — fire and forget. No ack, no retry. May lose messages. Best throughput.
- **At-least-once** — ack required; on failure retry. May duplicate. Consumer must be idempotent.
- **Exactly-once** — idempotent producer + transactional consumer. Kafka EOS, SQS FIFO + deduplication ID.

**Outbox pattern** — solve dual-write problem (DB + message broker in one atomic operation):
1. Write event to \`outbox\` table in same DB transaction as business data
2. Background process (Debezium CDC or polling) reads outbox table and publishes to broker
3. On success, mark outbox row as processed

**Dead Letter Queue (DLQ):**
Messages that fail after N retries are moved to a DLQ. Allows inspection, replay, and alerting without blocking the main queue.

**Fan-out pattern (SNS + SQS):**
SNS topic → multiple SQS queues. Each queue serves a different downstream service. Fully decoupled.

**Competing consumers:** Multiple workers read from one queue. Throughput scales horizontally. Auto-scaling based on queue depth (SQS + Lambda / ECS).`,
  why:`Messaging is the glue of distributed systems. Understanding delivery guarantees and the outbox pattern is critical for building correct async services.`,
  example:{
    language:"java",
    code:`// Outbox pattern with Spring + Debezium CDC
// Step 1: Write order + outbox entry in one transaction
@Service
@Transactional
public class OrderService {

    @Autowired private OrderRepository orderRepo;
    @Autowired private OutboxRepository outboxRepo;

    public Order createOrder(CreateOrderRequest req) {
        Order order = orderRepo.save(new Order(req));

        // Same DB transaction — atomically consistent
        outboxRepo.save(OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderCreated")
            .payload(toJson(order))
            .status(OutboxStatus.PENDING)
            .build());

        return order; // Kafka publish happens via Debezium CDC, not here
    }
}

// Step 2: Debezium CDC config (listens to outbox table changes)
// application.yml
// debezium:
//   connector.class: io.debezium.connector.postgresql.PostgresConnector
//   database.server.name: myapp
//   table.include.list: public.outbox_events
//   transforms: outbox
//   transforms.outbox.type: io.debezium.transforms.outbox.EventRouter

// Step 3: Consumer — idempotent processing
@KafkaListener(topics = "order.OrderCreated")
public class OrderCreatedConsumer {

    @Autowired private ProcessedEventRepository processed;
    @Autowired private InventoryService inventory;

    public void handle(OrderCreatedEvent event) {
        // Idempotency check — skip if already processed
        if (processed.existsByEventId(event.getId())) return;

        inventory.reserve(event.getItems());
        processed.save(new ProcessedEvent(event.getId()));
    }
}`,
    notes:"Debezium uses PostgreSQL logical replication to capture outbox table changes — no polling overhead, sub-second latency."
  },
  interview:[
    {question:"How would you design a notification system for 100M users?",
     answer:`1. **Event bus:** User actions publish events to Kafka topic \`user.events\`\n2. **Notification service:** Kafka consumer group reads events, applies notification rules (preferences, quiet hours, dedup)\n3. **Fan-out to channels:** SNS topic per channel type → SQS queues for push (FCM/APNs), email (SES), SMS (Twilio)\n4. **Workers per channel:** ECS/Lambda workers drain queues, call third-party APIs with retry + DLQ\n5. **Rate limiting:** Per-user rate limits to avoid notification spam (Redis sorted set sliding window)\n6. **Deduplication:** Notification ID stored in Redis/DB; skip if already sent within dedup window\n\n**Scale:** Kafka can handle 10M events/s. Each SQS queue auto-scales workers. At 100M users, push notifications batch via FCM's batch API (1000/request).`,
     followUps:["How do you handle FCM/APNs delivery failures?","How would you implement quiet hours per timezone?"]
    }
  ],
  tradeoffs:{
    pros:["Decouples services — producer and consumer evolve independently","Async processing improves throughput","DLQ prevents poisoned messages from blocking processing"],
    cons:["Eventual consistency — consumer may lag","At-least-once requires idempotent consumers","Debugging async flows is harder than synchronous"],
    when:"Use async messaging for: notifications, email, audit logs, inter-service events, workflow orchestration. Keep synchronous for: payment confirmation, inventory reservation (need immediate response)."
  },
  flow:{
    title:"Outbox → Kafka → Consumer Flow",
    caption:"Outbox pattern solves dual-write; DLQ handles poison messages",
    nodes:[
      {id:"app",label:"Order Service",hint:"Business logic + DB write"},
      {id:"db",label:"PostgreSQL",hint:"orders + outbox tables"},
      {id:"debezium",label:"Debezium CDC",hint:"Captures outbox table changes"},
      {id:"kafka",label:"Kafka Topic",hint:"order.OrderCreated"},
      {id:"consumer",label:"Inventory Consumer",hint:"Idempotent processor"},
      {id:"dlq",label:"Dead Letter Queue",hint:"Failed messages after N retries"}
    ],
    steps:[
      {path:["app","db"],label:"Atomic DB write",detail:"Order + OutboxEvent written in one DB transaction. No dual-write risk."},
      {path:["db","debezium"],label:"CDC captures change",detail:"Debezium reads PostgreSQL WAL (logical replication). Detects new outbox row."},
      {path:["debezium","kafka"],label:"Publish to Kafka",detail:"Debezium publishes event to Kafka topic. Reliable — Kafka is durable."},
      {path:["kafka","consumer"],label:"Consumer reads event",detail:"Inventory consumer reads OrderCreated. Checks idempotency key. Reserves stock."},
      {path:["consumer","dlq"],label:"On failure → DLQ",detail:"If consumer fails after 3 retries, message moved to DLQ for inspection and manual replay."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
