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
  },

  visual: function(mount) {
    var lanes = [
      {
        label: 'Log Analysis',
        color: '#58a6ff',
        bg: 'rgba(88,166,255,0.06)',
        delay: 0,
        nodes: [
          { icon: '🛒', label: 'Shopping Cart' },
          { icon: '📦', label: 'Order Service' },
          { icon: '💳', label: 'Payment Svc' },
          { icon: '🟠', label: 'Kafka', kafka: true },
          { icon: '🔍', label: 'Elastic' },
          { icon: '📊', label: 'Kibana' },
        ],
        desc: 'Aggregate service logs via Kafka → index in Elasticsearch → visualize in Kibana'
      },
      {
        label: 'Data Streaming\n& Recommendations',
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.06)',
        delay: 0.4,
        nodes: [
          { icon: '👆', label: 'User Clickstream' },
          { icon: '🟠', label: 'Kafka', kafka: true },
          { icon: '⚡', label: 'Flink' },
          { icon: '🗄️', label: 'Data Lake' },
          { icon: '🤖', label: 'ML Models' },
        ],
        desc: 'Real-time click events → Kafka → Flink aggregation → Data Lake → ML recommendations'
      },
      {
        label: 'System Monitoring\n& Alerting',
        color: '#f85149',
        bg: 'rgba(248,81,73,0.06)',
        delay: 0.8,
        nodes: [
          { icon: '🔧', label: 'Services+Agents' },
          { icon: '🟠', label: 'Kafka', kafka: true },
          { icon: '⚡', label: 'Flink' },
          { icon: '🚨', label: 'Alerting' },
        ],
        desc: 'Service metrics via agents → Kafka → Flink stream processing → real-time alerts'
      },
      {
        label: 'Change Data\nCapture (CDC)',
        color: '#ffa657',
        bg: 'rgba(255,166,87,0.06)',
        delay: 1.2,
        nodes: [
          { icon: '🗃️', label: 'Source DB' },
          { icon: '📜', label: 'Txn Log' },
          { icon: '🟠', label: 'Kafka', kafka: true },
          { icon: '🔌', label: 'Connectors' },
          { icon: '🔍', label: 'Elastic' },
          { icon: '🔴', label: 'Redis' },
        ],
        desc: 'DB transaction log (Debezium) → Kafka → connectors fan-out to Elastic/Redis/replica DBs'
      },
      {
        label: 'System Migration\n(Shadow Write)',
        color: '#3fb950',
        bg: 'rgba(63,185,80,0.06)',
        delay: 1.6,
        nodes: [
          { icon: '🔵', label: 'v1 Services' },
          { icon: '🟠', label: 'Kafka', kafka: true },
          { icon: '🟢', label: 'v2 Services' },
          { icon: '✅', label: 'Reconcile' },
        ],
        desc: 'v1 writes to Kafka → v2 consumes in parallel → compare outputs → migrate safely with zero downtime'
      },
    ];

    mount.innerHTML = '<style>' +
      '#kfu-wrap{font-family:"JetBrains Mono",monospace;padding:12px;background:#0d1117;border-radius:10px;overflow:hidden}' +
      '#kfu-wrap h3{color:#e6edf3;font-size:13px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;opacity:.6}' +
      '.kfu-lane{display:flex;align-items:center;margin-bottom:10px;border-radius:8px;padding:10px 14px;position:relative;overflow:hidden}' +
      '.kfu-label{min-width:110px;font-size:10px;font-weight:700;line-height:1.3;text-transform:uppercase;letter-spacing:.5px;white-space:pre-line;padding-right:12px}' +
      '.kfu-flow{display:flex;align-items:center;flex:1;gap:0;position:relative}' +
      '.kfu-node{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:58px;cursor:pointer;transition:transform .2s}' +
      '.kfu-node:hover{transform:translateY(-3px)}' +
      '.kfu-icon{font-size:20px;line-height:1;filter:drop-shadow(0 0 6px currentColor)}' +
      '.kfu-node-label{font-size:9px;color:#8b949e;text-align:center;white-space:nowrap;max-width:62px;overflow:hidden;text-overflow:ellipsis}' +
      '.kfu-kafka .kfu-icon{animation:kafkaPulse 1.5s ease-in-out infinite}' +
      '@keyframes kafkaPulse{0%,100%{filter:drop-shadow(0 0 4px #ffa657);transform:scale(1)}50%{filter:drop-shadow(0 0 12px #ffa657);transform:scale(1.12)}}' +
      '.kfu-arrow{flex:1;position:relative;height:20px;min-width:28px;display:flex;align-items:center}' +
      '.kfu-arrow-line{flex:1;height:2px;background:linear-gradient(90deg,transparent,currentColor,transparent);opacity:.4}' +
      '.kfu-dot{position:absolute;width:8px;height:8px;border-radius:50%;top:50%;transform:translateY(-50%);animation:kfuDot 1.8s linear infinite}' +
      '@keyframes kfuDot{0%{left:0;opacity:0}20%{opacity:1}80%{opacity:1}100%{left:calc(100% - 8px);opacity:0}}' +
      '.kfu-desc{font-size:9.5px;color:#6e7681;line-height:1.4;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.05)}' +
      '.kfu-left-bar{position:absolute;left:0;top:0;bottom:0;width:4px;border-radius:4px 0 0 4px}' +
      '.kfu-tooltip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#1c2128;border:1px solid #30363d;padding:6px 8px;border-radius:6px;font-size:10px;color:#e6edf3;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;z-index:10}' +
      '.kfu-node:hover .kfu-tooltip{opacity:1}' +
      '</style>' +
      '<div id="kfu-wrap">' +
      '<h3>Top 5 Kafka Use Cases</h3>' +
      lanes.map(function(lane) {
        var nodesHtml = lane.nodes.map(function(n, i) {
          var nodeClass = 'kfu-node' + (n.kafka ? ' kfu-kafka' : '');
          var nodeHtml = '<div class="' + nodeClass + '" style="color:' + lane.color + '">' +
            '<div class="kfu-icon">' + n.icon + '</div>' +
            '<div class="kfu-node-label">' + n.label + '</div>' +
            '</div>';
          var arrowHtml = '';
          if (i < lane.nodes.length - 1) {
            arrowHtml = '<div class="kfu-arrow" style="color:' + lane.color + '">' +
              '<div class="kfu-arrow-line" style="background:' + lane.color + ';opacity:.3"></div>' +
              '<div class="kfu-dot" style="background:' + lane.color + ';animation-delay:' + (i * 0.3 + lane.delay) + 's"></div>' +
              '</div>';
          }
          return nodeHtml + arrowHtml;
        }).join('');

        return '<div class="kfu-lane" style="background:' + lane.bg + '">' +
          '<div class="kfu-left-bar" style="background:' + lane.color + '"></div>' +
          '<div class="kfu-label" style="color:' + lane.color + '">' + lane.label + '</div>' +
          '<div style="flex:1">' +
            '<div class="kfu-flow">' + nodesHtml + '</div>' +
            '<div class="kfu-desc">' + lane.desc + '</div>' +
          '</div>' +
          '</div>';
      }).join('') +
      '</div>';
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
