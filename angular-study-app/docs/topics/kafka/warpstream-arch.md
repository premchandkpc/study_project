# WarpStream Architecture

## Quick Facts

- Area: Kafka and Messaging
- Tag: Cloud-Native
- Source: `src/modules/topics/kafka/warpstream-arch.js`
- Tags: `warpstream`, `s3`, `byoc`, `serverless`, `stateless`
- Visual coverage: live visual

## Concept

<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#38bdf8;margin-bottom:6px">WarpStream Architecture</h2>
  <p style="color:#768390;margin-bottom:18px">Kafka-compatible streaming built on <b style="color:#38bdf8">object storage (S3)</b>. No local disks, no ZooKeeper, no replication overhead. Stateless agents + S3 = infinite scale, zero ops.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #38bdf8;border-radius:8px;padding:14px">
      <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:8px">Stateless Agents</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        No local disk. All state in S3.<br>
        Agents are ephemeral containers.<br>
        Scale horizontally, kill/restart freely.<br>
        No leader election needed per broker.
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#f0883e;font-size:13px;font-weight:bold;margin-bottom:8px">S3 as WAL</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Messages buffered in agent memory.<br>
        Flushed to S3 every ~250ms.<br>
        No replication between brokers.<br>
        S3 is the single source of truth.
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#3fb950;font-size:13px;font-weight:bold;margin-bottom:8px">BYOC Model</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Bring Your Own Cloud.<br>
        Agents run in <b>your</b> VPC/account.<br>
        Data never leaves your cloud.<br>
        WarpStream control plane = metadata only.
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">Architecture at a glance</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0">

                    Your Cloud (BYOC)


Producers -> WarpStream Agent (stateless, K8s pod)

                  buffer ~250ms

              S3 / GCS / ABS  <- Source of Truth

                  read (fetch)

Consumers <- WarpStream Agent (any agent, stateless)

Metadata coordination -> WarpStream Control Plane (SaaS)
(partition assignments, offsets, schema)

</pre>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">
    <div style="color:#38bdf8;font-size:13px;font-weight:bold;margin-bottom:10px">Connect - Kafka-compatible</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0">// WarpStream is wire-compatible with Kafka 3.x client protocol
// Minimal config change to point Kafka clients at WarpStream

Properties props = new Properties();
props.put("bootstrap.servers", "serverless.warpstream.com:9092");
// Everything else identical to Kafka client config

// Existing Kafka Connect connectors work unchanged
// Schema Registry API compatible
// Consumer group protocol identical</pre>

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

1. How does WarpStream achieve Kafka wire compatibility?

2. What's the latency trade-off vs Kafka?

3. How does BYOC model protect data?

4. Why is scaling cheaper/faster than Kafka?

## Trade-offs

WarpStream pros: infinite scale, zero ops, 80% cheaper (claimed), BYOC compliance. Cons: higher latency (~250ms+), agent buffer risk, not OSS, Kafka Streams incompatible.

## Gotchas

- ~250ms latency (S3 flush interval). Not for sub-100ms requirements.
- Agent crash before flush = buffer lost. Design for producer retries.
- Not open-source. Kafka Streams not compatible.
- S3 egress costs can surprise at scale.
