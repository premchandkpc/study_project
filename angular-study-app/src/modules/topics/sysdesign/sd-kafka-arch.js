(function() {
  var topic = {
  id:"sd-kafka-arch", area:"sysdesign",
  title:"Apache Kafka — Internals, Partitions & Consumer Groups",
  tag:"Messaging", tags:["kafka","partitions","consumer group","offset","replication","ISR","compaction","streams","producer"],
  concept:`**Kafka** is a distributed commit log optimised for high-throughput, durable, ordered event streaming.

**Core concepts:**
- **Topic** — logical stream name. Partitioned for parallelism.
- **Partition** — ordered, immutable log. Each message gets an offset. Stored on disk (not memory).
- **Broker** — Kafka server. A cluster has N brokers; each partition has one leader + (replication-factor - 1) followers.
- **Producer** — writes to a partition leader. Partitioning by key ensures ordered delivery for a key.
- **Consumer Group** — logical subscriber. Each partition assigned to exactly one consumer in the group. Multiple groups → each gets all messages (pub-sub behaviour).
- **Offset** — consumer tracks position per partition. Committed to \`__consumer_offsets\` topic.

**ISR (In-Sync Replicas):** The set of replicas fully caught up with the leader. \`acks=all\` waits for all ISR before producer gets ACK — strongest guarantee.

**Exactly-once semantics (EOS):**
1. Producer idempotence (\`enable.idempotence=true\`) — deduplicates retries via sequence numbers
2. Transactions — atomic write across multiple partitions + commit offset

**Log compaction:** Kafka retains only the latest value per key (useful for change-data-capture CDC).

**Throughput numbers:** Single Kafka cluster handles 10M+ messages/second at LinkedIn, 7M at Twitter.`,
  why:`Kafka is the backbone of event-driven architectures. Understanding partitioning and consumer groups is critical for designing scalable async systems.`,
  example:{
    language:"java",
    code:`// Kafka producer with exactly-once semantics
@Configuration
public class KafkaConfig {

    @Bean
    public ProducerFactory<String, OrderEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        // Exactly-once: idempotent + transactions
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-producer-1");
        return new DefaultKafkaProducerFactory<>(props);
    }
}

@Service
public class OrderEventPublisher {

    @Autowired private KafkaTemplate<String, OrderEvent> kafka;
    @Autowired private OrderRepository repo;

    // Transactional outbox pattern
    @Transactional  // DB + Kafka in one transaction scope
    public void placeOrder(Order order) {
        repo.save(order);  // DB write

        kafka.executeInTransaction(ops -> {
            ops.send("orders", order.getId(), new OrderEvent(order));
            return null;
        }); // Kafka commit only if DB commit succeeds
    }
}

// Consumer with manual offset commit
@KafkaListener(topics = "orders", groupId = "fulfillment-service",
               concurrency = "3")  // 3 threads = 3 partitions
public class OrderConsumer {

    @KafkaHandler
    public void handle(OrderEvent event, Acknowledgment ack) {
        try {
            fulfillmentService.process(event);
            ack.acknowledge(); // commit offset only on success
        } catch (RetryableException e) {
            // Don't ack — message will be redelivered
            throw e;
        }
    }
}`,
    notes:"concurrency=3 means 3 consumer threads per instance. With 12 partitions and 4 instances: 12/4=3 threads each — saturates all partitions."
  },
  interview:[
    {question:"How do you ensure ordering of messages in Kafka?",
     answer:`Kafka guarantees ordering **within a partition**. Cross-partition ordering is not guaranteed.\n\n**To ensure ordered processing for a logical entity:**\n1. **Partition by entity key** — all events for orderId=42 go to the same partition (hash of key mod partitions). Same partition → single consumer → ordered.\n2. **Single partition** — extreme: 1 partition = total order, but 1 consumer max throughput.\n3. **Application-side ordering** — use sequence numbers in events; consumer buffers and reorders.\n\n**Gotcha:** If a consumer fails and rebalance occurs, a new consumer picks up mid-stream. With at-least-once delivery, ensure idempotent processing.`,
     followUps:["What happens when a Kafka consumer is slow and lags behind?","Explain the differences between at-most-once, at-least-once, and exactly-once delivery."]
    }
  ],
  tradeoffs:{
    pros:["10M+ msg/s throughput","Durable — disk-backed, replicated","Replay — consumers can re-read old events","Fan-out — multiple consumer groups each see all messages"],
    cons:["Operational complexity (ZooKeeper/KRaft, schema registry)","No built-in message filtering — consumers must filter","Rebalancing pauses all consumers in a group (improvement: static membership)"],
    when:"Use Kafka for: event sourcing, audit logs, cross-service async communication, stream processing (Kafka Streams / Flink). For simple task queues, consider RabbitMQ or SQS."
  },
  architecture:{
    title:"Kafka Cluster — Producer to Consumer",
    caption:"Partitions distribute load; consumer groups enable parallel processing",
    lanes:[
      {label:"Producers",nodes:[
        {id:"order-svc",label:"Order Service",hint:"Produces OrderCreated events"},
        {id:"payment-svc",label:"Payment Service",hint:"Produces PaymentCompleted events"}
      ]},
      {label:"Kafka Cluster",nodes:[
        {id:"broker1",label:"Broker 1 (Leader P0,P1)",hint:"Partitions 0 and 1 leaders",detail:"Broker 1 is leader for partitions 0 and 1. Producers write to leader. Followers (Broker 2,3) replicate."},
        {id:"broker2",label:"Broker 2 (Leader P2)",hint:"Partition 2 leader",detail:"Broker 2 is leader for partition 2. Also follower for P0 and P1."},
        {id:"broker3",label:"Broker 3 (Follower)",hint:"All partitions follower",detail:"Broker 3 is follower for all partitions. Elected leader if Broker 1 or 2 fail."}
      ]},
      {label:"Consumer Groups",nodes:[
        {id:"fulfillment",label:"Fulfillment Group",badge:"3 consumers",hint:"Parallel consumers = partitions",detail:"3 consumer instances, each handling 1 partition. Max parallelism = partition count (3)."},
        {id:"analytics",label:"Analytics Group",badge:"1 consumer",hint:"Independent group — sees all events",detail:"Analytics consumer group reads all events independently. Kafka fan-out: multiple groups each get full stream."}
      ]}
    ],
    links:[
      {from:"order-svc",to:"broker1",label:"Produce to P0 (key hash)",detail:"Producer hashes orderId key → partition 0 on Broker 1.",type:"async"},
      {from:"payment-svc",to:"broker2",label:"Produce to P2",detail:"PaymentService events route to partition 2.",type:"async"},
      {from:"broker1",to:"broker2",label:"Replication (ISR)",detail:"Broker 1 streams P0 WAL to followers for durability.",type:"async"},
      {from:"broker1",to:"fulfillment",label:"Consume P0",detail:"Consumer 1 in fulfillment group reads partition 0.",type:"async"},
      {from:"broker2",to:"fulfillment",label:"Consume P2",detail:"Consumer 3 reads partition 2 in parallel.",type:"async"},
      {from:"broker1",to:"analytics",label:"Consume all (offset 0)",detail:"Analytics group independently reads from beginning if needed (replay).",type:"async"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
