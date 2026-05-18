# RabbitMQ Dead Letter Queues

## Quick Facts

- Area: Kafka and Messaging
- Tag: Reliability
- Source: `src/modules/topics/kafka/rmq-dlq.js`
- Tags: `rabbitmq`, `dlq`, `retry`, `ttl`, `x-death`
- Visual coverage: live visual

## Concept

<div style="font-family:monospace;color:#cdd9e5;max-width:860px">
  <h2 style="color:#f59134;margin-bottom:6px">Dead Letter Queues (DLQ)</h2>
  <p style="color:#768390;margin-bottom:18px">Messages that can't be delivered go to a <em style="color:#f59134">Dead Letter Exchange</em> -> routed to a DLQ. Think of it as a morgue for failed messages.</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #f59134;border-radius:8px;padding:14px">
      <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:8px">WHY messages die</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
         <b>rejected</b> - nack/reject, requeue=false<br>
         <b>expired</b> - TTL elapsed in queue<br>
         <b>maxlen</b> - queue overflow, x-overflow=drop-head
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#58a6ff;font-size:13px;font-weight:bold;margin-bottom:8px">FLOW</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Producer -> Exchange -> Work Queue<br>
         (fail / expire / overflow)<br>
        x-dead-letter-exchange -> DLX<br>
        <br>
        DLQ (inspect / retry / alert)
      </div>
    </div>
    <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:14px">
      <div style="color:#3fb950;font-size:13px;font-weight:bold;margin-bottom:8px">x-death header</div>
      <div style="color:#cdd9e5;font-size:12px;line-height:1.7">
        Each dead-letter hop appends entry to x-death array:<br>
        <code style="color:#f59134">{ queue, reason, time, count }</code><br>
        Enables retry counting & loop detection.
      </div>
    </div>
  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px">
    <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:10px">Queue declaration with DLX</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0;overflow:auto">// Work queue - messages that fail go to dlx.payment
channel.assertQueue('payment.work', {
  arguments: {
    'x-dead-letter-exchange': 'dlx.payment',
    'x-dead-letter-routing-key': 'payment.dead',
    'x-message-ttl': 30000        // 30 s - expire -> DLX
  }
});

// Dead letter exchange (direct)
channel.assertExchange('dlx.payment', 'direct', { durable: true });

// Dead letter queue - bound to DLX
channel.assertQueue('payment.dlq', { durable: true });
channel.bindQueue('payment.dlq', 'dlx.payment', 'payment.dead');</pre>

  </div>

  <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:16px">
    <div style="color:#f59134;font-size:13px;font-weight:bold;margin-bottom:10px">Retry via TTL trampoline pattern</div>
    <pre style="color:#cdd9e5;font-size:12px;margin:0;overflow:auto">// Retry queue: wait N ms then dead-letter BACK to work exchange
channel.assertQueue('payment.retry', {
  arguments: {
    'x-dead-letter-exchange': 'payment.exchange',   // bounce back
    'x-dead-letter-routing-key': 'payment',
    'x-message-ttl': 5000                           // wait 5 s
  }
});

// On nack - send to retry queue
channel.nack(msg, false, false); // requeue=false -> DLX
// DLX routes to retry queue, waits 5s, re-publishes to work queue</pre>

  </div>
</div>

## Why It Matters

Understanding this topic helps you build more efficient, reliable, and maintainable systems. It explains the practical impact of the design or algorithm in production.
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

Example code, configuration, or architecture depends on the concrete problem. Use the implementation in the linked source file as a starting point.
## Complexity And Performance

- Time/space complexity depends on input size, data volume, and implementation choices.
- Track latency, throughput, memory, saturation, error rate, and correctness invariants.

## Interview Drills

1. How to implement exponential backoff with RabbitMQ?

2. What triggers dead-lettering - all three reasons?

3. How to avoid infinite retry loops?

4. Difference between classic and quorum queue dead-lettering guarantees?

## Trade-offs

DLQ pros: no message loss, retry visibility, debugging. Cons: operational overhead, DLQ must be monitored, retry pattern adds latency. Alternative: idempotent consumer + discard.

## Gotchas

- DLX on DLQ = infinite loop
- x-death count can reset on routing key change
- Per-message expiration must be string not number
- DLQ not monitored = silent message loss
