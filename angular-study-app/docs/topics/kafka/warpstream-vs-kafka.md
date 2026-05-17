# WarpStream vs Kafka

## Quick Facts
- Area: Kafka and Messaging
- Tag: Comparison
- Source: `src/modules/topics/kafka/warpstream-vs-kafka.js`
- Tags: `warpstream`, `kafka`, `cost`, `latency`, `ops`, `s3`
- Visual coverage: live visual

## Concept
<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#38bdf8;margin-bottom:6px">WarpStream vs Apache Kafka</h2>
  <p style="color:#768390;margin-bottom:18px">Same protocol, radically different architecture. Kafka = stateful brokers + local disk. WarpStream = stateless agents + S3. Choose based on latency, cost, and ops maturity.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #e8741a;border-radius:8px;padding:16px">
      <div style="color:#e8741a;font-size:14px;font-weight:bold;margin-bottom:10px">Apache Kafka</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
         Stateful brokers (local NVMe disks)<br>
         ZooKeeper -> KRaft (newer)<br>
         Replication: broker-to-broker copy<br>
         p99 latency: ~5ms (acks=1)<br>
         Partition rebalance = slow (data move)<br>
         Self-managed: significant ops expertise<br>
         Confluent Cloud: expensive ($0.11+/GB)
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #38bdf8;border-radius:8px;padding:16px">
      <div style="color:#38bdf8;font-size:14px;font-weight:bold;margin-bottom:10px">WarpStream</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.8">
         Stateless agents (no local disk)<br>
         S3 as WAL + storage<br>
         No replication overhead<br>
         p99 latency: ~250ms-1s (S3 flush)<br>
         Scale: add/remove pods in seconds<br>
         Managed ops, BYOC model<br>
         Cost: S3 prices (~$0.023/GB)
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">When WarpStream wins vs when Kafka wins</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="color:#38bdf8;font-size:12px;font-weight:bold;margin-bottom:6px">WarpStream is better:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
          check Analytics / logging (latency OK 500ms+)<br>
          check Cost-sensitive (S3 &lt;&lt; broker disk)<br>
          check Compliance (BYOC, data in your cloud)<br>
          check Spiky workloads (scale pods instantly)<br>
          check Small ops team (no Kafka expertise)
        </div>
      </div>
      <div>
        <div style="color:#e8741a;font-size:12px;font-weight:bold;margin-bottom:6px">Kafka is better:</div>
        <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
          check Ultra-low latency (&lt;10ms required)<br>
          check Kafka Streams / ksqlDB (ecosystem)<br>
          check Mature OSS ecosystem<br>
          check High-frequency trading / gaming<br>
          check Complex stream processing topologies
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
- Time/space complexity depends on deployment, data size, and chosen implementation.
- Track p50/p95/p99 latency, throughput, memory, saturation, and error rate for production topics.

## Interview Drills
1. Is WarpStream truly Kafka-compatible?

2. What's the durability risk and how to mitigate?

3. When would you NOT use WarpStream?

4. How does BYOC model work for compliance?

## Trade-offs
WarpStream wins: cost, ops simplicity, BYOC compliance, instant scaling. Kafka wins: latency (<10ms), Streams ecosystem, mature OSS tooling. Both: event replay, consumer groups, Schema Registry.

## Gotchas
- WarpStream != Kafka ecosystem. Streams/ksqlDB not compatible.
- Agent crash before S3 flush = buffer loss. Use producer retries.
- S3 egress costs at cross-region scale can negate savings.
- Not open-source. Evaluate vendor lock-in risk.

