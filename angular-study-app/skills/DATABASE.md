# Database Topics

**Topic file location:** `src/modules/topics/databases/`
**Topic array:** `window.DB_TOPICS`
**Area string:** `"databases"`

---

## Topics Built

| File                       | Title                                    | Tag          | Visual Status |
| -------------------------- | ---------------------------------------- | ------------ | ------------- |
| `db-transactions-acid.js`  | Transactions & ACID                      | Transactions | ✅ Built      |
| `db-isolation-levels.js`   | Isolation Levels                         | Concurrency  | ✅ Built      |
| `db-mvcc.js`               | MVCC (Multi-Version Concurrency Control) | Concurrency  | ✅ Built      |
| `db-indexes.js`            | Indexes & Index Types                    | Performance  | ✅ Built      |
| `db-btree-lsm.js`          | B-Tree vs LSM-Tree Storage               | Storage      | ✅ Built      |
| `db-wal.js`                | Write-Ahead Log (WAL)                    | Durability   | ✅ Built      |
| `db-buffer-pool.js`        | Buffer Pool & Page Cache                 | Memory       | ✅ Built      |
| `db-query-execution.js`    | Query Execution & Planning               | Query        | ✅ Built      |
| `db-replication.js`        | Replication: Leader/Follower             | Scaling      | ✅ Built      |
| `db-sharding.js`           | Sharding Strategies                      | Scaling      | ✅ Built      |
| `db-connection-pooling.js` | Connection Pooling                       | Performance  | ✅ Built      |
| `db-postgres-internals.js` | PostgreSQL Internals                     | Internals    | ✅ Built      |
| `db-mongodb-internals.js`  | MongoDB Internals                        | NoSQL        | ✅ Built      |
| `db-redis-internals.js`    | Redis Internals                          | In-Memory    | ✅ Built      |
| `db-nosql-comparison.js`   | NoSQL DB Comparison                      | NoSQL        | ✅ Built      |

> All 15 DB topics have full content. Visuals need audit — some may be placeholders.

---

## Visual Style References (inputs/)

| Image                                                           | Apply to DB topics                                                                                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs/image copy 8.png` — DB Scaling Wheel (7 strategies pie) | **`db-sharding.js`**: wheel center = "Scale DB", segments = Sharding/Replication/Caching/Connection Pool/Read Replica/Partitioning/CDN. **`db-indexes.js`**: wheel of index types  |
| `inputs/image copy 11.png` — 5-row swimlane                     | **`db-isolation-levels.js`**: each row = isolation level (READ UNCOMMITTED→READ COMMITTED→REPEATABLE READ→SERIALIZABLE). Animated dots show dirty/phantom read scenarios per level |
| `inputs/image copy 7.png` — Blueprint numbered callouts         | **`db-wal.js`**: numbered steps ①client write→②WAL append→③buffer pool dirty→④checkpoint→⑤sync to disk. **`db-query-execution.js`**: numbered pipeline stages                      |
| `inputs/image copy 12.png` — SQL mind map (dark bg, radial)     | **`db-transactions-acid.js`**: center = "ACID", radial branches = Atomicity/Consistency/Isolation/Durability. Each branch → example scenario                                       |
| `inputs/image copy 9.png` — Numbered circular loop              | **`db-replication.js`**: circular flow ①client write→②leader WAL→③follower sync→④ack→⑤client read replica                                                                          |

---

## Animation Implementation Priority

### PRIORITY 1 — Core interview concepts

| Topic                     | Visual Type       | Style Ref              | Key Animation                                                                                                                            |
| ------------------------- | ----------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `db-isolation-levels.js`  | Swimlane (4 rows) | image copy 11          | Each row = isolation level. Concurrent Tx A and Tx B shown. Dirty read (red X) / Phantom read (orange X) / Non-repeatable read per level |
| `db-mvcc.js`              | FlowDiagram       | image copy 7 numbered  | Tx starts → snapshot (xmin/xmax). Writer creates new version. Reader sees old version. GC vacuums dead tuples                            |
| `db-transactions-acid.js` | FlowDiagram       | image copy 12 (radial) | ACID mind map: Atomicity→all-or-nothing. Consistency→constraints. Isolation→levels. Durability→WAL+fsync                                 |
| `db-indexes.js`           | FlowDiagram       | image copy 8 (wheel)   | B-tree (range/equality), Hash (equality only), GIN (full-text, arrays), BRIN (time-series). Sequential scan vs index scan cost           |

### PRIORITY 2

| Topic               | Visual Type       | Key Animation                                                                                                                                          |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `db-btree-lsm.js`   | Swimlane (2 rows) | Row1 B-Tree: in-place update, read O(logN), write amplification. Row2 LSM: MemTable→SSTable→compaction, write-optimized, read amplification            |
| `db-wal.js`         | FlowDiagram       | WAL append → buffer dirty page → checkpoint timer → fsync pages. Crash recovery: replay WAL from last checkpoint                                       |
| `db-replication.js` | FlowDiagram       | Leader receives write → WAL stream to follower → follower applies → ack. Sync (durability) vs async (performance) tradeoff. Failover: promote follower |
| `db-sharding.js`    | FlowDiagram       | Range sharding (hotspot risk) vs Hash sharding (even dist) vs Directory (lookup table). Resharding problem: consistent hashing                         |

### PRIORITY 3

| Topic                      | Visual Type       | Key Animation                                                                                                                                                       |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db-query-execution.js`    | FlowDiagram       | SQL→Parser→Planner(cost model)→Optimizer→Executor. EXPLAIN ANALYZE output. Seq Scan vs Index Scan vs Bitmap scan cost                                               |
| `db-buffer-pool.js`        | FlowDiagram       | LRU page eviction. Dirty page tracking. Write-back vs write-through. Clock sweep (Postgres). InnoDB adaptive hash index                                             |
| `db-connection-pooling.js` | Swimlane (2 rows) | Row1 No pool: each request→new connection (3-way handshake+auth overhead). Row2 With pool (PgBouncer/HikariCP): pre-established connections, queue waiting requests |
| `db-postgres-internals.js` | FlowDiagram       | Heap file → page (8KB) → tuple (xmin/xmax). VACUUM removes dead tuples. TOAST for large values. Shared buffer hit vs disk read                                      |

---

## Detailed Visual Specs — Core Topics

### `db-isolation-levels.js` swimlane spec

```
Always-visible swimlane (4 rows) — ByteByteGo style:

Row 1 READ UNCOMMITTED (red #f85149):
  Tx A writes dirty (uncommitted) → Tx B reads dirty value → Tx A rolls back → Tx B used garbage
  Badge: "Dirty Read ✗ allowed"

Row 2 READ COMMITTED (orange #ffa657):
  Tx B re-reads same row mid-transaction → Tx A committed update between reads → different values
  Badge: "Dirty Read ✓ prevented | Non-Repeatable ✗"

Row 3 REPEATABLE READ (blue #58a6ff):
  Tx B sees consistent snapshot for rows it READ. But Tx A inserts new row → Tx B sees phantom
  Badge: "Non-Repeatable ✓ | Phantom ✗ (MySQL blocks phantoms with gap locks)"

Row 4 SERIALIZABLE (green #3fb950):
  Full isolation. Transactions appear sequential. SSI (PostgreSQL) or two-phase locking (MySQL)
  Badge: "All anomalies ✓ prevented | Highest lock contention"

Code companion: SET TRANSACTION ISOLATION LEVEL <level>; BEGIN; ...
```

### `db-mvcc.js` FlowDiagram spec

```
5-step ReactViz.panel:
  Step 1 (render):  Row has xmin=100 (creating Tx), xmax=0 (still visible). Tx 200 reads: sees row (xmin<200, xmax=0)
  Step 2 (commit):  Tx 201 UPDATE: creates NEW row version (xmin=201), marks old row xmax=201
  Step 3 (effect):  Tx 200 (long tx) still reads OLD version — snapshot isolation, no lock needed
  Step 4 (update):  Tx 201 commits. New readers (Tx 202+) see new version.
  Step 5 (cleanup): VACUUM: scans heap, removes tuples where xmax < oldest active Tx. Reclaims space.

Nodes: tuple-v1(store, dim after step 4), tuple-v2(store, active), tx200(component),
       tx201(action), VACUUM(hook), xmin/xmax-badge(cache)

Gotcha highlights:
  - Long-running transactions prevent VACUUM → table bloat
  - MVCC = readers don't block writers, writers don't block readers
  - xid wraparound: Postgres uses 32-bit xid → wraparound every 4B txns (needs VACUUM FREEZE)
```

### `db-btree-lsm.js` swimlane spec

```
Always-visible swimlane (2 rows):

Row 1 B-TREE (blue #58a6ff) — used by PostgreSQL, MySQL, SQLite:
  INSERT → find leaf page → in-place insert → page split if full → propagate split up
  READ → O(log N) → 3-4 page reads for large tree
  UPDATE → find page → modify in-place → WAL entry
  Badge: "Write amplification: 1 page. Read: O(log N). Good for reads & random writes."

Row 2 LSM-TREE (orange #ffa657) — used by RocksDB, Cassandra, LevelDB:
  INSERT → MemTable (sorted in RAM) → WAL → when full: flush to SSTable (immutable, sorted)
  READ → check MemTable → check SSTables level by level (Bloom filter skips misses)
  COMPACTION → merge SSTables, remove tombstones → write amplification high
  Badge: "Write: O(1) append. Read amplification: multiple SSTables. Compaction I/O overhead."

Decision guide:
  B-Tree  → general-purpose OLTP, mixed read/write, SQL databases
  LSM     → write-heavy (logs, time-series, IoT), Cassandra/RocksDB workloads
```

### `db-sharding.js` FlowDiagram spec

```
4-step ReactViz.panel:
  Step 1 (render):  Range sharding: shard0=[A-M], shard1=[N-Z]. Hotspot: celebrity user "Z" → all traffic to shard1
  Step 2 (commit):  Hash sharding: shard = hash(userId) % numShards. Even distribution. No range queries.
  Step 3 (effect):  Consistent hashing: ring of vnodes. Add shard → only adjacent keys migrate (not full reshard)
  Step 4 (update):  Directory sharding: lookup table shard_id→server. Flexible. Lookup table = bottleneck.

Cross-shard problems (always show):
  - Joins across shards: application-level join (N queries)
  - Transactions across shards: 2PC or saga pattern
  - Hotspot shard: partial re-sharding or key padding

Nodes: shard(store), router(component), ring(cache), lookupTable(selector), hotspot(action red)
```

### `db-replication.js` FlowDiagram spec

```
4-step ReactViz.panel:
  Step 1 (render):  Leader-Follower (async): write→leader WAL→follower fetch WAL→apply. Leader returns ack before follower ack.
  Step 2 (commit):  Synchronous replication: leader waits for at least 1 follower ack before returning. Durability guaranteed, latency +10-50ms
  Step 3 (effect):  Read replicas: route read queries to followers. Replication lag → stale reads. Read-your-writes: route own reads to leader
  Step 4 (update):  Failover: leader dies → promotion. Semi-auto (manual confirm) vs fully auto (Patroni/MHA). Split-brain risk if network partition

Nodes: leader(store), follower1(cache), follower2(cache dim), client(component),
       WAL(action), replication-lag-badge(selector)
```

---

## Database Topics Still to Add

### HIGH PRIORITY (interview-critical, no JS file yet)

| Topic                                | Suggested File              | Visual Type | Key Concepts                                                                                                                                       |
| ------------------------------------ | --------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Distributed transactions (2PC, SAGA) | `db-distributed-tx.js`      | FlowDiagram | 2PC: prepare phase + commit phase. Coordinator failure leaves participants blocked. SAGA: compensating transactions, choreography vs orchestration |
| Database locking                     | `db-locking.js`             | Swimlane    | Row-level vs table-level vs page-level. Shared lock vs exclusive lock. Deadlock detection (wait-for graph). Deadlock vs livelock                   |
| Query optimization                   | `db-query-optimizer.js`     | FlowDiagram | Cost-based optimizer. Statistics (n_distinct, correlation). Join algorithms: nested loop / hash join / merge join. Index selectivity               |
| Full-text search                     | `db-fulltext-search.js`     | FlowDiagram | Inverted index. Tokenization → stemming → stop words. tsvector + tsquery in Postgres. GIN index for full-text. vs Elasticsearch                    |
| Time-series databases                | `db-timeseries.js`          | FlowDiagram | TimescaleDB (hypertables). InfluxDB. Chunk-based partitioning by time. Compression. Continuous aggregates. Retention policies                      |
| Database connection patterns         | `db-connection-patterns.js` | Swimlane    | PgBouncer (session/transaction/statement mode). HikariCP config (maxPoolSize=10 rule: cores × 2 + disk spindles). Connection storm on restart      |

### MEDIUM PRIORITY

| Topic               | Suggested File     | Key Concepts                                                                                                                          |
| ------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cassandra internals | `db-cassandra.js`  | Consistent hashing ring, vnodes, replication factor, quorum reads/writes, compaction strategies, tombstones                           |
| DynamoDB internals  | `db-dynamodb.js`   | Partition key → consistent hash. Sort key. WCU/RCU. GSI/LSI. DynamoDB streams. Single-table design                                    |
| ClickHouse / OLAP   | `db-olap.js`       | Column store vs row store. Vectorized execution. Materialized views. Compression ratio. OLTP vs OLAP workloads                        |
| Database migrations | `db-migrations.js` | Schema migrations: expand-contract pattern. Non-blocking migrations (add nullable column, backfill, add constraint). Flyway/Liquibase |

### LOW PRIORITY

| Topic            | Suggested File         | Key Concepts                                                                                     |
| ---------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| Graph databases  | `db-graph.js`          | Neo4j, property graph model, Cypher query language, vs relational for relationship-heavy queries |
| Vector databases | `db-vector.js`         | Embeddings, HNSW index, ANN search, pgvector, Pinecone, Weaviate — used for RAG/semantic search  |
| Object storage   | `db-object-storage.js` | S3 consistency model, multipart upload, presigned URLs, lifecycle policies, S3 as data lake      |

---

## Key Database Interview Questions (cross-topic)

```
Transactions & Isolation:
  - What are the 4 ACID properties? Real-world example of each failing.
  - What is the difference between dirty read, non-repeatable read, phantom read?
  - How does MVCC prevent read-write conflicts without locking?
  - What isolation level does PostgreSQL default to? MySQL InnoDB?

Indexes:
  - When does an index NOT get used? (low cardinality, function on column, OR conditions)
  - What is a covering index? Partial index? Expression index?
  - B-Tree vs Hash index — when to use each?
  - How does an index affect INSERT/UPDATE/DELETE performance?

Storage:
  - What is WAL and how does it enable crash recovery?
  - Why does B-Tree cause write amplification?
  - When would you choose LSM over B-Tree? (write-heavy workloads)
  - What is a buffer pool and why is it important for performance?

Scaling:
  - Vertical vs horizontal scaling — when does vertical stop working?
  - What is replication lag and how do you handle stale reads?
  - Hash sharding vs consistent hashing — what problem does consistent hashing solve?
  - What is a connection pool and what happens without one?

PostgreSQL Specific:
  - What is VACUUM and why is it needed?
  - What is TOAST and when does it activate?
  - Explain the difference between EXPLAIN and EXPLAIN ANALYZE.
  - What causes table bloat in PostgreSQL?
```

---

## Database Topic File Pattern

```js
(function () {
  "use strict";

  window.DB_TOPICS = (window.DB_TOPICS || []).concat([
    {
      id: "db-<topic>",
      area: "databases",
      title: "<Title>",
      tag: "<Tag>",
      tags: ["database", "<keyword1>", "<keyword2>"],

      concept: `<explanation>`,
      why: `<production relevance>`,

      example: {
        language: "sql", // or 'java' or 'bash'
        code: `-- SQL example`,
      },

      interview: ["Question 1?", "Question 2?"],
      tradeoffs: { pros: ["..."], cons: ["..."] },
      gotchas: ["Gotcha 1"],

      visual: function (mount) {
        // Swimlane for multi-variant comparisons (isolation levels, storage engines)
        // ReactViz.panel FlowDiagram for single lifecycle (WAL, replication, MVCC)
      },
    },
  ]);
})();
```
