# Isolation Levels

## Quick Facts

- Area: Databases
- Tag: Transactions
- Source: `src/modules/topics/databases/db-isolation-levels.js`
- Tags: `database`, `isolation`, `read-committed`, `serializable`, `anomalies`
- Visual coverage: live visual

## Concept

// TODO - coming soon

## Why It Matters

_No notes yet._

## Architecture / Mental Model

```mermaid
flowchart LR
  n0["Client query"]
  n1["Parser/planner"]
  n2["Execution engine"]
  n3["Storage/cache/log"]
  n4["Result/replica"]
  n0 --> n1
  n1 --> n2
  n2 --> n3
  n3 --> n4
```

## Runtime / Sequence

```mermaid
sequenceDiagram
  participant a0 as Client query
  participant a1 as Parser/planner
  participant a2 as Execution engine
  participant a3 as Storage/cache/log
  participant a4 as Result/replica
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

1. Client query
2. Parser/planner
3. Execution engine
4. Storage/cache/log
5. Result/replica

## Example

_No code example configured._

## Complexity And Performance

- Time/space complexity depends on input size, data volume, and implementation choices.
- Track latency, throughput, memory, saturation, error rate, and correctness invariants.

## Interview Drills

_No interview drills configured._

## Trade-offs

// TODO

## Gotchas

_No gotchas configured._
