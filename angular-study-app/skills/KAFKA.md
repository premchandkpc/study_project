# Kafka / RabbitMQ / WarpStream Topics

**Topic file location:** `src/modules/topics/kafka/`
**Topic array:** `window.KAFKA_TOPICS`
**Area string:** `"kafka"`

---

## Topics Built

| File                         | Title                         | Tag            | Visual Status |
| ---------------------------- | ----------------------------- | -------------- | ------------- |
| `kafka-producer-consumer.js` | Kafka Producer & Consumer     | Core           | ✅ Built      |
| `kafka-topics-partitions.js` | Topics, Partitions & Offsets  | Architecture   | ✅ Built      |
| `kafka-replication-isr.js`   | Replication & ISR             | Durability     | ✅ Built      |
| `kafka-consumer-groups.js`   | Consumer Groups & Rebalancing | Scaling        | ✅ Built      |
| `kafka-offsets-commits.js`   | Offset Management & Commits   | Delivery       | ✅ Built      |
| `kafka-compaction.js`        | Log Compaction                | Retention      | ✅ Built      |
| `kafka-streams.js`           | Kafka Streams                 | Processing     | ✅ Built      |
| `kafka-connect.js`           | Kafka Connect                 | Integration    | ✅ Built      |
| `kafka-schema-registry.js`   | Schema Registry & Avro        | Schema         | ✅ Built      |
| `rmq-exchanges.js`           | RabbitMQ Exchanges            | Routing        | ✅ Built      |
| `rmq-queues-bindings.js`     | Queues & Bindings             | Core           | ✅ Built      |
| `rmq-acks-delivery.js`       | Acknowledgements & Delivery   | Reliability    | ✅ Built      |
| `rmq-dlq.js`                 | Dead Letter Queues            | Error Handling | ✅ Built      |
| `rmq-vs-kafka.js`            | RabbitMQ vs Kafka             | Comparison     | ✅ Built      |
| `warpstream-arch.js`         | WarpStream Architecture       | Cloud          | ✅ Built      |
| `warpstream-vs-kafka.js`     | WarpStream vs Kafka           | Comparison     | ✅ Built      |

> All 16 Kafka/RMQ/WarpStream topics have full content. Visuals need audit — some may be placeholders.

---

## Visual Style References (inputs/)

| Image                                                                     | Apply to Kafka topics                                                                                                                                                                               |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs/image copy 11.png` — 5-row swimlane (Top 5 Kafka Use Cases)       | **`kafka-producer-consumer.js`**: Producer row → Broker row → Consumer Group row. Animated dots = message packets. **`warpstream-arch.js`**: 3 rows — Producer / WarpStream (S3 backend) / Consumer |
| `inputs/image copy 7.png` — Blueprint numbered callouts, colored sections | **`kafka-topics-partitions.js`**: broker boxes with partitions colored per topic. Leader partition highlighted. ISR replicas below                                                                  |
| `inputs/image copy 9.png` — YouTube numbered circular loop                | **`kafka-consumer-groups.js`**: circular rebalance flow ①group.coordinator→②JoinGroup→③SyncGroup→④assignments→⑤heartbeat→⑥rebalance                                                                 |
| `inputs/image copy 10.png` — Microservice domain boxes                    | **`kafka-streams.js`**: topology boxes — Source→Processor(filter/map/join)→Sink. State stores as side panels                                                                                        |

---

## Animation Implementation Priority

### PRIORITY 1 — Core Kafka flow (highest interview value)

| Topic                        | Visual Type       | Style Ref               | Key Animation                                                                                                                                    |
| ---------------------------- | ----------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `kafka-producer-consumer.js` | Swimlane (3 rows) | image copy 11           | Row1: Producer batch → linger.ms → send. Row2: Broker partition write → leader+ISR. Row3: Consumer poll() → process → commit offset              |
| `kafka-topics-partitions.js` | FlowDiagram       | image copy 7            | Topic→N partitions. Each partition = ordered log. Message key→hash→partition assignment. Offset advances on write                                |
| `kafka-replication-isr.js`   | FlowDiagram       | image copy 7            | Leader partition → sync to ISR followers. ISR vs OSR. acks=all: leader waits for ISR ack. Leader failure → controller elects new leader from ISR |
| `kafka-consumer-groups.js`   | FlowDiagram       | image copy 9 (circular) | Rebalance cycle: JoinGroup→SyncGroup→assignments. partition-per-consumer ceiling (max consumers = num partitions)                                |

### PRIORITY 2

| Topic                      | Visual Type | Key Animation                                                                                                 |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `kafka-offsets-commits.js` | FlowDiagram | at-most-once vs at-least-once vs exactly-once. Auto-commit risk: process fails after commit before processing |
| `kafka-compaction.js`      | FlowDiagram | Log before compaction: all versions of key. After: only latest value per key. Tombstone (null value) = delete |
| `kafka-streams.js`         | FlowDiagram | KStream(stateless) vs KTable(stateful). Topology: Source→Filter→GroupBy→Aggregate→Sink. RocksDB state store   |
| `rmq-exchanges.js`         | FlowDiagram | 4 exchange types: direct(routing key exact)→fanout(all queues)→topic(wildcard)→headers(attribute match)       |

### PRIORITY 3

| Topic                      | Visual Type | Key Animation                                                                                                                              |
| -------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `kafka-connect.js`         | FlowDiagram | Source connector→Kafka. Sink connector←Kafka. Workers + tasks. Offset tracking in \_\_consumer_offsets topic                               |
| `kafka-schema-registry.js` | FlowDiagram | Producer serializes → POST schema → registry returns ID → embed ID in message header. Consumer deserializes → fetch schema by ID           |
| `rmq-acks-delivery.js`     | FlowDiagram | Publisher confirms: channel.waitForConfirms(). Consumer ack: basic.ack / basic.nack / basic.reject                                         |
| `rmq-dlq.js`               | FlowDiagram | Message rejected/TTL expired/queue overflow → x-dead-letter-exchange → DLQ → monitoring/retry                                              |
| `warpstream-arch.js`       | Swimlane    | Row1: Producer→WarpStream agent. Row2: WarpStream→S3 (object store, no local disk). Row3: Consumer←WarpStream agent. Cost comparison panel |

---

## Detailed Visual Specs — Core Topics

### `kafka-producer-consumer.js` swimlane spec

```
Always-visible swimlane (3 rows) — ByteByteGo style:

Row 1 PRODUCER (orange #ffa657):
  App → [batch records, linger.ms=5] → [compress: snappy] → [Partitioner: key hash] → Broker

Row 2 BROKER (blue #58a6ff):
  Leader partition append → [ISR sync: acks=all] → [fsync to disk] → [offset committed]
  Animated: kafkaPulse glow on broker node

Row 3 CONSUMER (green #3fb950):
  poll(500ms) → [deserialize] → [process business logic] → [commitSync()] → next poll

Code companion shows producer config (batch.size, linger.ms, acks, compression.type)
and consumer config (enable.auto.commit=false, max.poll.records, isolation.level)
```

### `kafka-replication-isr.js` FlowDiagram spec

```
5-step ReactViz.panel:
  Step 1: Topic has 3 partitions. Each partition = 1 leader + 2 followers (ISR)
  Step 2: Producer acks=all → sends to leader → leader appends → waits for ISR replicate
  Step 3: ISR follower fetches from leader offset → appends locally → ACK to leader
  Step 4: leader reports all ISR acked → producer gets ack
  Step 5: Leader fails → controller watches Zookeeper/KRaft → promotes ISR follower → updates metadata

Nodes: leader(store), follower-ISR(cache), follower-OSR(server dim), controller(component),
       producer(action), ZK/KRaft(network)
```

### `kafka-consumer-groups.js` FlowDiagram spec

```
4-step ReactViz.panel:
  Step 1: 1 topic, 4 partitions. 2 consumers in group → each gets 2 partitions
  Step 2: 3rd consumer joins → REBALANCE: JoinGroup → SyncGroup → re-assign
  Step 3: Consumer fails (missed heartbeat) → group coordinator detects → rebalance
  Step 4: 5th consumer joins 4-partition topic → one consumer IDLE (partitions < consumers)

Key gotcha node: "Max parallelism = num partitions. Extra consumers = idle."
Cooperative rebalance (incremental) vs eager rebalance (stop-the-world).
```

### `rmq-exchanges.js` FlowDiagram spec

```
4-node FlowDiagram (one per exchange type):
  Step 1 DIRECT: Producer → exchange (routing_key="error") → only Queue A bound with key "error"
  Step 2 FANOUT: Producer → exchange → ALL bound queues (broadcast, routing key ignored)
  Step 3 TOPIC:  Producer → exchange (key="user.created.us") → Queue A pattern="user.#", Queue B="*.created.*"
  Step 4 HEADERS: Producer → exchange (headers: {format:"pdf",type:"report"}) → Queue matching both headers

Use case summary per type (always-visible caption below each diagram):
  direct = load balancing workers, fanout = pub/sub notifications,
  topic = event routing by category, headers = metadata-based routing
```

---

## Kafka Topics Still to Add

### HIGH PRIORITY

| Topic                        | Suggested File         | Visual Type | Key Concepts                                                                                                                                                     |
| ---------------------------- | ---------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kafka exactly-once semantics | `kafka-eos.js`         | FlowDiagram | idempotent producer (enable.idempotence=true). Transactional API: beginTransaction/commitTransaction. Read-process-write atomic. EOS = idempotent + transactions |
| Kafka lag monitoring         | `kafka-lag.js`         | FlowDiagram | consumer group lag = latest offset − committed offset. kafka-consumer-groups.sh --describe. Burrow / Confluent metrics. Lag → alert → scale consumers            |
| KRaft (Zookeeper removal)    | `kafka-kraft.js`       | FlowDiagram | Kafka 3.3+: KRaft replaces Zookeeper. Raft consensus within Kafka. Controller quorum. Faster startup, simpler ops                                                |
| Kafka MirrorMaker 2          | `kafka-mirrormaker.js` | FlowDiagram | Cross-cluster replication. Active-active vs active-passive. Topic renaming convention. Offset sync                                                               |

### MEDIUM PRIORITY

| Topic                    | Suggested File      | Key Concepts                                                                                                             |
| ------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| RabbitMQ streams         | `rmq-streams.js`    | Like Kafka log — append-only, consumer offset tracking. Persistent, replayable. Use when RMQ needs Kafka-like replay     |
| Kafka security           | `kafka-security.js` | SSL/TLS transport, SASL authentication (PLAIN/SCRAM/Kerberos), ACLs, mTLS                                                |
| Kafka performance tuning | `kafka-perf.js`     | Producer: batch.size/linger.ms/compression. Consumer: fetch.min.bytes/max.poll.records. Broker: num.io.threads/log.flush |

---

## Kafka Topic File Pattern

```js
(function () {
  "use strict";

  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([
    {
      id: "kafka-<topic>",
      area: "kafka",
      title: "<Title>",
      tag: "<Tag>",
      tags: ["kafka", "<keyword1>", "<keyword2>"],

      concept: `<explanation>`,
      why: `<production relevance>`,

      example: {
        language: "java", // or 'yaml' or 'bash'
        code: `// Kafka code`,
      },

      interview: ["Question 1?", "Question 2?"],
      tradeoffs: { pros: ["..."], cons: ["..."] },
      gotchas: ["Gotcha 1"],

      visual: function (mount) {
        // Use swimlane (always-visible) for multi-variant comparisons
        // Use ReactViz.panel for sequential lifecycle flows
      },
    },
  ]);
})();
```

---

## Key Kafka Interview Questions (cross-topic)

```
Producers:
  - What is acks=0 / acks=1 / acks=all tradeoff?
  - How does idempotent producer prevent duplicates?
  - When does linger.ms help vs hurt latency?

Brokers:
  - What is ISR and why does min.insync.replicas matter?
  - How does Kafka handle leader election on broker failure?
  - What is log compaction and when would you use it?

Consumers:
  - What is consumer lag and how do you alert on it?
  - at-most-once vs at-least-once vs exactly-once — how each achieved?
  - Why can max consumer parallelism never exceed partition count?
  - What triggers a rebalance? What is cooperative rebalance?

Kafka vs RabbitMQ:
  - Kafka: pull-based, log, replay, high throughput
  - RMQ: push-based, flexible routing, per-message ack, easier for task queues
  - Choose Kafka: event streaming, audit log, replay, >100k msg/s
  - Choose RMQ: complex routing, task queues, per-message TTL/DLQ
```

# Kafka / RabbitMQ / WarpStream — Missing Production Topics Extension

Add below sections into existing Kafka architecture/topic markdown file.

---

# Missing Critical Production Topics

## EXTREME HIGH PRIORITY

| Topic                              | File                            | Core Concepts                                     |
| ---------------------------------- | ------------------------------- | ------------------------------------------------- |
| Backpressure Handling              | `kafka-backpressure.js`         | Lag growth, throttling, autoscaling, pause/resume |
| Idempotency & Duplicate Prevention | `kafka-idempotency.js`          | Duplicate prevention, retry safety                |
| Retry Patterns                     | `kafka-retries.js`              | Retry topics, exponential backoff                 |
| Poison Messages                    | `kafka-poison-messages.js`      | Infinite retry prevention                         |
| DLQ & Parking Lot Queues           | `kafka-dlq-patterns.js`         | Failure isolation                                 |
| Kafka Transactions                 | `kafka-transactions.js`         | EOS internals                                     |
| Outbox Pattern                     | `kafka-outbox-pattern.js`       | Dual-write problem                                |
| Saga Pattern                       | `kafka-saga.js`                 | Distributed transactions                          |
| Ordering Guarantees                | `kafka-ordering.js`             | Partition ordering only                           |
| Retry Storms                       | `kafka-retry-storms.js`         | Cascading failure prevention                      |
| Slow Consumer Handling             | `kafka-slow-consumers.js`       | Consumer lag management                           |
| Hot Partitions                     | `kafka-hot-partitions.js`       | Uneven partition traffic                          |
| Event Versioning                   | `kafka-event-versioning.js`     | Compatibility handling                            |
| Multi-region Kafka                 | `kafka-multi-region.js`         | DR + HA                                           |
| Kafka Failure Scenarios            | `kafka-failures.js`             | Production outage flows                           |
| Consumer Poll Loop Failures        | `kafka-poll-failures.js`        | max.poll.interval.ms                              |
| Kafka Reprocessing                 | `kafka-reprocessing.js`         | Replay architecture                               |
| Eventual Consistency               | `kafka-eventual-consistency.js` | Async consistency                                 |
| Kafka Rate Limiting                | `kafka-rate-limiting.js`        | Producer throttling                               |
| Circuit Breaker with Kafka         | `kafka-circuit-breaker.js`      | Downstream protection                             |

---

# `kafka-failures.js`

## Production Failure Scenarios

```text
Scenario 1:
Producer sent message
Broker ACK lost
Producer retries
DUPLICATE produced

Scenario 2:
Consumer processed payment
Offset NOT committed
Consumer restarted
Payment processed AGAIN

Scenario 3:
Broker leader dies before ISR sync
Unreplicated message LOST

Scenario 4:
Consumer lag grows
Broker retention expires old messages
DATA LOSS

Scenario 5:
Poison message causes infinite retry loop
CPU spikes
Lag explodes
Entire partition blocked
```

## Interview Questions

```text
- What happens if producer retries after ACK timeout?
- Can Kafka guarantee no duplicates?
- What happens if consumer crashes after DB commit but before offset commit?
- Why does min.insync.replicas matter?
- What happens when lag exceeds retention?
```

---

# `kafka-idempotency.js`

## Real Production Scenario

```text
User clicks PAY button twice
Producer retries due timeout
Consumer restart replays event

Without idempotency:
  payment charged 3 times

With idempotency:
  duplicate ignored safely
```

## FlowDiagram

```text
Producer
  -> payment-event(id=txn123)

Consumer:
  Check Redis/DB idempotency key
    if exists -> ignore
    else:
       process payment
       store key
```

## Java Config

```java
props.put("enable.idempotence", "true");
props.put("acks", "all");
props.put("retries", Integer.MAX_VALUE);
```

## Must Explain

```text
Idempotent Producer ONLY prevents duplicates caused by producer retries.

It DOES NOT prevent:
- consumer duplicates
- replay duplicates
- app-level duplicate processing

Application-level idempotency still required.
```

## Tricky Interview

```text
Q: Does enable.idempotence=true give exactly-once?

Answer:
NO.

EOS requires:
- idempotent producer
- transactions
- transactional offset commits
```

---

# `kafka-backpressure.js`

## Backpressure Flow

```text
Traffic spike:
  50k msg/sec incoming

Consumers can process:
  only 5k/sec

Lag increases:
  10k -> 100k -> 5 million

Effects:
  memory pressure
  retention risk
  rebalance storms
  downstream DB overload
```

## Animation

```text
Producer rate >>> Consumer rate

Partition fills
Lag meter turns red
Consumers throttle
Autoscaler adds consumers
Still bottleneck due partition count
```

## Solutions

```text
1. Increase partitions
2. Scale consumers
3. Batch processing
4. Async processing
5. Backpressure to producer
6. Pause consumers
7. Retry topics
8. Drop low-priority traffic
9. Rate limit producers
10. Increase retention
```

## Interview Trap

```text
Q: Can adding consumers always fix lag?

NO.
Max parallelism = partition count.
```

---

# `kafka-hot-partitions.js`

## Scenario

```text
Partition key:
  customerId

One customer:
  amazon

Receives:
  90% traffic

Result:
  single partition overloaded
```

## Visual

```text
Partition-0 -> 2 messages
Partition-1 -> 3 messages
Partition-2 -> 5 MILLION messages 🔥
```

## Solutions

```text
- composite keys
- key bucketing
- random suffix
- partition sharding
- adaptive routing
```

---

# `kafka-retries.js`

## Enterprise Retry Architecture

```text
Main Topic
   ↓ failure
Retry-5s Topic
   ↓ failure
Retry-1m Topic
   ↓ failure
Retry-10m Topic
   ↓ failure
DLQ
```

## Explain

```text
Avoid retry storms.
Avoid blocking main consumers.
Never retry poison messages forever.
```

---

# `kafka-poison-messages.js`

## Scenario

```json
{
  "amount": "INVALID_STRING"
}
```

```text
Deserializer crashes forever.
Consumer stuck on same offset forever.
Entire partition blocked.
```

## Solutions

```text
- DLQ
- skip policy
- retry limits
- schema validation
- schema registry
```

---

# `kafka-outbox-pattern.js`

## Problem

```text
DB updated
Kafka publish failed

OR

Kafka published
DB rollback happened

Data inconsistency.
```

## Solution Flow

```text
Business transaction:
  1. update orders table
  2. insert event into OUTBOX table
  3. commit DB transaction

CDC/Debezium:
  reads outbox
  publishes to Kafka
```

## Key Point

```text
Outbox pattern avoids dual-write problem.
```

---

# `kafka-saga.js`

## Flow

```text
Order Service
  -> OrderCreated

Payment Service
  -> PaymentCompleted

Inventory Service
  -> InventoryReserved

Shipping Service
  -> ShipmentCreated
```

## Compensation Flow

```text
Inventory reservation fails

Compensation events:
  -> RefundPayment
  -> CancelOrder
```

## Must Cover

```text
- choreography saga
- orchestration saga
- compensating transactions
- eventual consistency
```

---

# `kafka-event-versioning.js`

## Problem

```text
Producer v2 deployed first.
Consumer still expects v1.
Crash happens.
```

## Compatibility

```text
- BACKWARD
- FORWARD
- FULL
- NONE
```

---

# `kafka-poll-failures.js`

## Scenario

```text
Consumer processing takes 20 mins.
max.poll.interval.ms = 5 mins.

Broker thinks consumer dead.
Rebalance triggered.
Another consumer processes SAME messages.
```

## Must Explain

```text
Difference:
- session.timeout.ms
- heartbeat.interval.ms
- max.poll.interval.ms
```

---

# `kafka-ordering.js`

## Core Rule

```text
Kafka ordering is ONLY guaranteed WITHIN a partition.
```

## Visual

```text
Partition-0:
A1 A2 A3

Partition-1:
B1 B2 B3

Global ordering impossible.
```

---

# `kafka-retention-failures.js`

## Scenario

```text
Consumers down for 7 days.
Retention = 3 days.

Messages deleted before consumer reads them.
```

---

# `kafka-reprocessing.js`

## Use Cases

```text
- Bug fix replay
- ML model retraining
- Audit rebuild
- Analytics recompute
- New feature backfill
```

## Flow

```text
Reset offsets
Replay historical events
```

## Must Explain

```text
Replay can create duplicates.
Idempotency mandatory.
```

---

# `kafka-multi-region.js`

## Must Cover

```text
- active-active
- active-passive
- geo replication
- MirrorMaker2
- cluster linking
- DR failover
- split brain risks
```

---

# Kafka Tricky Interview Questions

```text
1. Why can Kafka still create duplicates even with idempotent producer?
2. Why are extra consumers idle?
3. What happens if offsets commit before DB commit?
4. Why is exactly-once expensive?
5. Why can rebalances cause outages?
6. Throughput vs latency tradeoff?
7. Why can small partitions hurt throughput?
8. What happens when ISR shrinks below min.insync.replicas?
9. Why can retry topics cause message reordering?
10. Why should consumers be idempotent even in EOS?
```

---

# `kafka-observability.js`

## Metrics

```text
Producer:
- request latency
- retry rate
- batch size
- compression ratio

Broker:
- under replicated partitions
- ISR shrink
- disk usage
- request queue size

Consumer:
- lag
- rebalance count
- poll latency
- processing latency
```

## Tools

```text
- Burrow
- Prometheus
- Grafana
- Cruise Control
- Conduktor
- Datadog
```

---

# Real Architecture Use Cases

## E-commerce

```text
OrderCreated
 -> PaymentService
 -> InventoryService
 -> NotificationService
 -> ShippingService
```

## Uber-like

```text
DriverLocationUpdates
 -> Matching Engine
 -> ETA Service
 -> Pricing Service
 -> Analytics
```

## Banking

```text
TransactionEvent
 -> Fraud Detection
 -> Ledger
 -> Notifications
 -> Audit Pipeline
```

## IoT

```text
Millions of sensors
 -> Kafka ingestion
 -> Stream processing
 -> Alerting
 -> Time-series DB
```

---

# Important Comparisons

| Comparison                | Why Important                           |
| ------------------------- | --------------------------------------- |
| Kafka vs Pulsar           | Modern distributed streaming interviews |
| Kafka vs Kinesis          | AWS interviews                          |
| Kafka vs Redis Streams    | Startup interviews                      |
| Kafka vs NATS             | Cloud-native systems                    |
| Kafka vs SQS/SNS          | AWS architecture                        |
| RabbitMQ Streams vs Kafka | Emerging architecture topic             |

---

# `kafka-internals.js`

## Must Cover

```text
- page cache
- zero-copy sendfile
- sequential disk writes
- pull model
- batching
- compression
- network threading
- IO threading
- request queue
- fetch requests
- segment files
- index files
- leader epochs
- high watermark
- log end offset
```

---

# `kafka-kubernetes.js`

## Kubernetes + Kafka

```text
- StatefulSets
- Headless Services
- Persistent Volumes
- Broker identity
- Rack awareness
- Pod disruption budgets
- Rolling upgrades
- Strimzi Operator
- Cruise Control
```

---

# Production Horror Stories

## Incident 1

```text
Consumer lag grew unnoticed.
Retention deleted messages.
Permanent data loss.
```

## Incident 2

```text
Poison message blocked partition for 18 hours.
Entire payment pipeline halted.
```

## Incident 3

```text
Aggressive retries caused DB collapse.
Retry storm amplified outage.
```

## Incident 4

```text
Hot partition overloaded one broker.
Cluster looked healthy overall.
Single broker died repeatedly.
```

## Incident 5

```text
Massive rebalance caused 5-minute outage during deployment.
```

---

# Production Checklist

```text
✅ replication.factor >= 3
✅ min.insync.replicas configured
✅ idempotent producer enabled
✅ DLQ implemented
✅ retry policy designed
✅ lag monitoring configured
✅ partition count sized properly
✅ retention policy validated
✅ schema compatibility enforced
✅ consumers idempotent
✅ autoscaling tested
✅ replay tested
✅ disaster recovery tested
✅ rebalance impact
```
