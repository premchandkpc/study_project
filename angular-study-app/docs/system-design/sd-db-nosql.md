# NoSQL - Document, Key-Value & Wide-Column

Source: `src/modules/topics/sysdesign/sd-db-nosql.js`
Tag: `Database`
Doc path: `docs/system-design/sd-db-nosql.md`

## Concept
**NoSQL** databases sacrifice some relational guarantees for horizontal scalability, flexible schemas, and specific access-pattern optimisation.

**Key-Value (Redis, DynamoDB, etcd):**
- Get/Put/Delete by key - O(1)
- No query language; you must know the key
- Perfect for sessions, caches, feature flags, leaderboards
- DynamoDB adds secondary indexes (GSI/LSI) for alternate access patterns

**Document (MongoDB, CouchDB, Firestore):**
- Store JSON-like documents, nested structures allowed
- Rich query language - filter, project, aggregate
- Schema-flexible - each document can have different fields
- Indexes on any field; text search built-in
- Best for catalogs, content management, user profiles

**Wide-Column (Cassandra, HBase, BigTable):**
- Rows indexed by partition key; columns per row can vary
- Partition key determines which node holds the data (consistent hash)
- Optimised for **time-series** and **write-heavy** workloads (append-only)
- No JOINs; denormalize for each query pattern
- Cassandra: masterless, tunable consistency (quorum)

**Graph (Neo4j, Amazon Neptune):**
- Nodes + edges with properties
- Efficient multi-hop traversals (friends-of-friends, fraud rings)
- Poor for non-graph queries

**Time-Series (InfluxDB, TimescaleDB, Prometheus):**
- Optimised for append-only timestamped metrics
- Automatic retention policies, downsampling

## Production Architecture
Choosing the right NoSQL type is a critical design decision. The wrong choice (MongoDB for time-series, Cassandra for random writes without design) leads to catastrophic performance at scale.

## Architecture Checklist
- Client / Application: Builds request, sets timeout, and chooses read/write path.
- Access / Pool / Router: Bounds concurrency, selects shard or replica, and prevents connection storms.
- Write Path / Primary Store: Applies transactions, indexes data, and appends durable log before ack.
- Read Path / Replica / Cache: Absorbs read traffic with replicas, materialized views, or cache entries.
- Ops / Backup / Monitor: Tracks lag, lock waits, slow queries, saturation, and restore readiness.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Client"]
    app["Application"]
  end
  subgraph lane_1["Access"]
    pool["Pool / Router"]
  end
  subgraph lane_2["Write Path"]
    primary["Primary Store"]
  end
  subgraph lane_3["Read Path"]
    read["Replica / Cache"]
  end
  subgraph lane_4["Ops"]
    ops["Backup / Monitor"]
  end
  app -->|"ingress"| pool
  pool -->|"sync request"| primary
  primary -.->|"async event"| read
  primary -->|"state access"| ops
  ops -.->|"replay / repair"| read
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as App
  participant a1 as Connection Pool
  participant a2 as Storage Engine
  participant a3 as Replica / Cache
  participant a4 as Operator
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

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Interview Drills
1. How does DynamoDB achieve single-digit millisecond latency at any scale?
   DynamoDB is a managed key-value/document store with several architectural decisions for consistent latency:
   
   1. **Partition key hashing** - data is spread across partitions by consistent hashing. Reads/writes go to a single partition.
   2. **SSD storage** - all data on NVMe SSDs.
   3. **Request routing** - each request routed to the correct partition without scanning.
   4. **Leaderless replication** - 3 replicas per partition using Paxos. A write is acknowledged after 2/3 replicas confirm (quorum write).
   5. **No complex queries** - DynamoDB rejects table scans; you must design with access patterns in mind.
   
   **Cost of this speed:** no JOINs, no aggregations, no arbitrary filters without GSI.
   Follow-ups: What is a hot partition in DynamoDB and how do you fix it?; When would you use a GSI vs LSI in DynamoDB?

2. Compare MongoDB and Cassandra. When would you choose each?
   **MongoDB:**
   - Rich query language (aggregation pipeline, $lookup, text search)
   - Document model - nested arrays/objects natural for product catalogs, CMS
   - Mutable documents - updates, upserts
   - Choose for: catalogs, user profiles, CMS, geospatial queries
   
   **Cassandra:**
   - Write-optimized - append-only log-structured merge (LSM) tree
   - Masterless - any node accepts writes; tunable consistency
   - Designed for time-series and high-write IoT workloads
   - No UPDATE in the traditional sense - new tombstone + new write
   - Choose for: IoT event streams, audit logs, time-series metrics, chat message history
   
   **Key difference:** MongoDB optimises for flexible read queries. Cassandra optimises for write throughput and predictable high-volume time-series.
   Follow-ups: What is an LSM tree and how does it enable fast writes?

## Trade-offs
Pros:
- Horizontal write scaling (Cassandra/DynamoDB)
- Flexible schema (MongoDB)
- Specialised performance for specific access patterns

Cons:
- Eventual consistency complexity
- No cross-document transactions (until MongoDB 4+)
- Schema design is harder - query-first design required for Cassandra

When to use:
Key-value for caches/sessions. Document for catalogs/profiles. Wide-column for time-series/events. Relational first unless you have a specific scaling or schema-flexibility need.

## Gotchas
_No gotchas yet._

