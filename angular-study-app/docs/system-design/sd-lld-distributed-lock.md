# LLD: Distributed Lock - Redlock, Zookeeper & Fencing

Source: `src/modules/topics/sysdesign/sd-lld-distributed-lock.js`
Tag: `LLD`
Doc path: `docs/system-design/sd-lld-distributed-lock.md`

## Concept
**Why distributed locks?** Multiple nodes must not simultaneously perform a non-idempotent operation (e.g., deduct inventory, send email, run cron job once).

**Single Redis lock (SET NX PX):**
```
SET lock:resource uniqueToken NX PX 30000
```
- NX = set if not exists (atomic compare-and-set)
- PX 30000 = auto-expire after 30s (avoid deadlock on crash)
- Release: Lua script - only delete if value matches (you own the lock)
- Problem: single Redis node SPOF; clock skew on failover.

**Redlock (Multi-node Redis):**
Acquire lock on N Redis nodes (typically 5) quorum (N/2+1 = 3). Reject if total acquisition time > lock validity. Release from all nodes.
- More resilient than single node.
- Debated: Martin Kleppmann argues it's unsafe without fencing tokens.

**Fencing tokens:**
Monotonically increasing token issued with each lock acquisition. Storage layer rejects writes with token < max seen. Safe even if lock expires early due to GC pause.

**Zookeeper / etcd locks:**
- ZK ephemeral nodes: create ephemeral sequential node; watch lowest node -> you hold lock.
- etcd: optimistic concurrency via compare-and-swap on a key with lease TTL.
- Strong consistency (linearisable) - safer than Redis for critical sections.

**Leader election:** Same mechanism - first to acquire distributed lock becomes leader. Heartbeat to renew lease. Others watch for expiry.

## Production Architecture
Distributed locks are a classic LLD problem. The subtle failure modes (process pause, clock skew, network partition) demonstrate senior-level thinking.

## Architecture Checklist
- Caller / Caller: Sends operation with idempotency key, timeout, and retry policy.
- API / Public API: Validates request, enforces contract, and routes to algorithm core.
- Core / Algorithm Core: Owns data structure invariants and concurrency rules.
- State / State Store: Persists counters, locks, cache entries, tasks, or ownership metadata.
- Async / Sweeper / Worker: Expires stale state, retries delayed jobs, and records metrics.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Caller"]
    caller["Caller"]
  end
  subgraph lane_1["API"]
    api["Public API"]
  end
  subgraph lane_2["Core"]
    core["Algorithm Core"]
  end
  subgraph lane_3["State"]
    state["State Store"]
  end
  subgraph lane_4["Async"]
    worker["Sweeper / Worker"]
  end
  caller -->|"ingress"| api
  api -->|"sync request"| core
  core -.->|"async event"| state
  core -->|"state access"| worker
  worker -.->|"replay / repair"| state
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Caller
  participant a1 as API
  participant a2 as Algorithm Core
  participant a3 as State Store
  participant a4 as Worker
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Node A: SET lock NX PX 10000 - Node A acquires lock. Redis returns unique token + fencing token (monotonic counter).
2. Node B: SET lock NX -> fails - Node B tries to acquire. Key exists -> fails. Node B retries with backoff.
3. Node A writes with token=42 - Node A performs critical section work. Includes token=42 in write request.
4. Write accepted (token 42 > max 41) - Storage accepts because token 42 is the highest seen.
5. Node A GC pause - lock expires - Node A pauses for 15 seconds. Lock TTL expires after 10 seconds.
6. Node B acquires expired lock - Node B retries, finds lock expired. Acquires with token=43.
7. Node A resumes, tries write with token=42 - Node A comes back, still thinks it holds lock. Tries to write with old token=42.
8. Write REJECTED (token 42 < max 43) - Storage rejects - token 42 is stale. Node B's write (token 43) is safe.

## Interview Drills
1. What is a fencing token and why does it matter for distributed locks?
   The fundamental problem: a process can acquire a lock, then pause (GC, OS scheduling, network lag). The lock expires. Another process acquires it. The first process resumes and thinks it still holds the lock - two processes in the critical section simultaneously.
   
   **Fencing token solution:**
   1. Lock service issues a monotonically increasing token with each lock grant (e.g., etcd revision number, ZK sequence number)
   2. Lock holder includes token in every write to the storage layer
   3. Storage layer rejects any write with a token <= max seen
   
   Result: even if paused process resumes and tries to write, storage rejects it because new lock holder's token is higher.
   
   Redis SET NX doesn't issue fencing tokens - this is Martin Kleppmann's critique of Redlock. Use etcd or ZooKeeper for safety-critical distributed locks.
   Follow-ups: Explain the ZooKeeper ephemeral node approach to distributed locking.; How does etcd use compare-and-swap for leader election?

## Trade-offs
Pros:
- Prevents concurrent modification of shared resource
- Redis lock is simple and fast (~1ms)
- etcd/ZK: strongly consistent, fencing tokens possible

Cons:
- Redis lock: not safe under clock skew or network partition
- ZK/etcd: slower than Redis, more complex to operate
- Distributed locks are a code smell - prefer idempotent design

When to use:
Use distributed locks as last resort. First, try: idempotent operations, optimistic concurrency (version check in DB), CRDT-based design. When you do need a lock, use etcd/ZK for correctness; Redis for performance-critical non-critical-path operations.

## Gotchas
_No gotchas yet._

