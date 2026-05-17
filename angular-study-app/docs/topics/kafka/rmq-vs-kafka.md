# RabbitMQ vs Kafka

## Quick Facts
- Area: Kafka and Messaging
- Tag: Comparison
- Source: `src/modules/topics/kafka/rmq-vs-kafka.js`
- Tags: `rabbitmq`, `kafka`, `push`, `pull`, `tradeoffs`, `architecture`
- Visual coverage: live visual

## Concept
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#a371f7;margin-bottom:6px">RabbitMQ vs Apache Kafka</h2>
  <p style="color:#768390;margin-bottom:18px">Two radically different messaging philosophies. Wrong choice = years of pain. Right choice = superpowers.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #f59134;border-radius:8px;padding:16px">
      <div style="color:#f59134;font-size:14px;font-weight:bold;margin-bottom:10px">RabbitMQ - Smart Broker</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
         AMQP protocol (binary, efficient)<br>
         Push-based - broker pushes to consumer<br>
         Exchanges + bindings route intelligently<br>
         Message deleted after ack<br>
         Per-queue QoS / prefetch<br>
         Built for task queues, RPC, routing<br>
         Max ~50K msg/s per node<br>
         10K+ queues per node OK
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #e8741a;border-radius:8px;padding:16px">
      <div style="color:#e8741a;font-size:14px;font-weight:bold;margin-bottom:10px">Kafka - Dumb Broker, Smart Consumers</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
         Custom binary protocol<br>
         Pull-based - consumers poll offsets<br>
         Topics + partitions, no routing logic<br>
         Messages retained by time/size<br>
         Consumer groups track offsets<br>
         Built for event streaming, replay, audit<br>
         1M+ msg/s per cluster normal<br>
         Replay = rewind consumer offset
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#a371f7;font-size:13px;font-weight:bold;margin-bottom:10px">When to use which</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="color:#f59134;font-size:12px;font-weight:bold;margin-bottom:6px">Choose RabbitMQ when:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
          check Task queues (background jobs)<br>
          check Complex routing (topic/header exchanges)<br>
          check RPC request/reply patterns<br>
          check Per-message TTL, priority needed<br>
          check Message must be deleted after processing<br>
          check Polyglot clients (AMQP + STOMP + MQTT)
        </div>
      </div>
      <div>
        <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:6px">Choose Kafka when:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
          check Event sourcing / event log<br>
          check Multiple consumers of same data<br>
          check Replay / audit trail needed<br>
          check Very high throughput (10M+ events/day)<br>
          check Stream processing (Kafka Streams)<br>
          check Microservice decoupling at scale
        </div>
      </div>
    </div>
  </div>
</div>

## Why It Matters
_No notes yet._

## Architecture / Mental Model
```mermaid
flowchart LR
  n0["Producer"]
  n1["Broker/topic"]
  n2["Partition/offset"]
  n3["Consumer group"]
  n4["Sink/DLQ"]
  n0 --> n1
  n1 --> n2
  n2 --> n3
  n3 --> n4
```

## Runtime / Sequence
```mermaid
sequenceDiagram
  participant a0 as Producer
  participant a1 as Broker/topic
  participant a2 as Partition/offset
  participant a3 as Consumer group
  participant a4 as Sink/DLQ
  a0->>a1: start
  a1->>a2: process
  a2->>a3: process
  a3->>a4: process
  a4-->>a3: result
  a3-->>a2: return
  a2-->>a1: return
  a1-->>a0: return
```

## Animation Plan
- Flow lab can use generated mental model steps above.
- UML sequence can use generated sequence diagram above.
- Architecture map can use generated area mental model above.
- Live visual exists in app: topic-specific canvas/ReactViz animation.

Flow steps:

1. Producer
2. Broker/topic
3. Partition/offset
4. Consumer group
5. Sink/DLQ

## Example
_No code example configured._

## Complexity And Performance
- Time/space complexity depends on input size, data volume, and implementation choices.
- Track latency, throughput, memory, saturation, error rate, and correctness invariants.

## Interview Drills
1. Why Kafka for event sourcing but not RabbitMQ?

2. How does RabbitMQ back-pressure work vs Kafka?

3. Can one system replace the other?

4. Latency: which is faster and why?

## Trade-offs
RabbitMQ: low latency, complex routing, task-oriented. Cons: no replay, memory pressure. Kafka: high throughput, replay, multi-consumer. Cons: higher ops, no routing, latency higher.

## Gotchas
- RabbitMQ: message acked = gone forever. No replay.
- Kafka: consumer lag is invisible to broker - monitor externally.
- Kafka has no per-message TTL or priority.
- RabbitMQ push-based: slow consumer backs up queue in broker memory.

