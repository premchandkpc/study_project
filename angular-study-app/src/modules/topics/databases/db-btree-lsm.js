(function() {
  'use strict';
  var topic = {
    id: "db-btree-lsm",
    area: "databases",
    title: "B-Tree vs LSM Tree",
    tag: "Storage",
    tags: ["database", "btree", "lsm", "storage", "rocksdb", "innodb", "write-amplification", "read-amplification"],

    analogy: `**Kid analogy (8th grade):** A B-Tree is like a library where every book is kept in sorted alphabetical order on shelves — finding any book is fast because you just binary-search the shelves, but putting a new book away means shuffling other books around to keep the order. An LSM Tree is like a sticky-note system: you always write new notes on a fresh top pad (super fast), then occasionally a librarian sorts and merges all the pads into the shelves at night. Reads are slower because you might need to check multiple pads, but writes are blazing fast.`,

    concept: `**B-Tree and LSM Tree are the two dominant storage engine data structures in modern databases.**

**B-Tree** (Balanced Tree, typically B+ Tree in databases) organizes data in a sorted tree of fixed-size pages (usually 4 KB or 16 KB). Each internal node holds N keys and N+1 child pointers. Leaf nodes contain the actual data rows and link to siblings for range scans. InnoDB (MySQL), PostgreSQL heap with btree indexes, and SQL Server all use B+ Trees. A lookup starts at the root, does O(log N) page reads descending to the leaf — typically 3–4 page reads for a table with millions of rows. Writes update pages in-place on disk, requiring a write to the page plus a WAL entry for crash safety. This produces **read-amplification ≈ 1** (one disk I/O per read after caching) but **write-amplification ≈ 2** (WAL + page write) and random I/O patterns that stress HDDs.

**LSM Tree** (Log-Structured Merge Tree) flips the tradeoff. Writes land first in an in-memory **MemTable** (typically a red-black tree or skip list, sorted). When MemTable hits its size limit (~64 MB in RocksDB), it's flushed as an immutable **SSTable** (Sorted String Table) to disk as Level 0. Background **compaction** threads merge and sort SSTables across levels (L0→L1→L2…). Each level is 10× larger. A point-read must check MemTable, then each SSTable from newest to oldest — mitigated by **Bloom filters** (99%+ miss detection with ~10 bits/key). LSM delivers **write-amplification ≈ 10–30** across compaction levels but **sequential I/O only** on writes, making it ideal for write-heavy SSD/NVMe workloads.

**Key metrics comparison:**

| Metric | B-Tree | LSM Tree |
|---|---|---|
| Write amplification | ~2–5× | ~10–30× |
| Read amplification | ~1–4× | ~1–8× (with Bloom) |
| Space amplification | ~2× | ~1.1× (after compaction) |
| Write pattern | Random I/O | Sequential I/O |
| Best workload | Read-heavy | Write-heavy |
| Databases | PostgreSQL, MySQL, SQLite | Cassandra, RocksDB, LevelDB, HBase |

**Compaction strategies in LSM:** Size-Tiered (Cassandra default, better write throughput), Leveled (RocksDB default, better read performance and space efficiency), and FIFO (time-series data, simple TTL expiry). RocksDB at Meta processes 40+ million writes/sec using leveled compaction on NVMe SSDs.`,

    why: `Engineers choose between B-Tree and LSM based on workload characteristics. B-Trees dominate OLTP read-heavy workloads where latency predictability matters — a point lookup is always O(log N) page fetches with no variance. B-Trees also handle updates well since they modify data in-place. PostgreSQL's B-Tree indexes deliver sub-millisecond reads for hot data entirely in buffer pool.

LSM Trees dominate write-intensive use cases: time-series ingestion (InfluxDB, Prometheus TSDB), event logs (Apache HBase), user activity feeds, and any scenario where you're inserting millions of rows per second. Cassandra's LSM engine handles 1M+ writes/sec on a single node. Meta's MyRocks (MySQL + RocksDB) replaced InnoDB for some workloads, cutting storage by 50% due to better compression on sorted SSTables.

The real-world choice depends on your read:write ratio. If you read 10× more than you write, use a B-Tree-backed engine. If you write 10× more than you read, use LSM. Hybrid engines like WiredTiger (MongoDB) blend both approaches.`,

    example: {
      language: 'sql',
      code: `-- B-Tree: Efficient for range scans and point lookups
-- PostgreSQL EXPLAIN shows B-Tree index scan
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 12345;
-- Index Scan using orders_user_id_idx on orders
-- Index Cond: (user_id = 12345)
-- Execution Time: 0.15 ms  (3-4 page reads from B-Tree)

-- LSM (Cassandra CQL): Optimized for append-heavy time-series
CREATE TABLE events (
  user_id  UUID,
  ts       TIMESTAMP,
  event    TEXT,
  PRIMARY KEY (user_id, ts)
) WITH CLUSTERING ORDER BY (ts DESC)
  AND compaction = {
    'class': 'LeveledCompactionStrategy',
    'sstable_size_in_mb': 160
  };

-- Insert is always sequential write to MemTable (microseconds)
INSERT INTO events (user_id, ts, event)
VALUES (uuid(), toTimestamp(now()), 'page_view');

-- RocksDB: Check Bloom filter stats (LSM internals)
-- rocksdb.bloom.filter.useful: 9823441   <- Bloom saved these reads
-- rocksdb.bloom.filter.full.positive: 12  <- actual SSTable reads needed`,
      notes: 'B-Tree index scans deliver consistent sub-ms reads; LSM inserts are always sequential appends to MemTable — Bloom filters prevent reads from scanning all SSTables.'
    },

    visual: {
      type: 'swimlane',
      title: 'B-Tree vs LSM Tree: Write & Read Paths',
      lanes: [
        {
          id: 'btree-lane',
          label: 'B-Tree (PostgreSQL / InnoDB)',
          color: '#58a6ff',
          description: 'In-place updates, sorted pages, random I/O',
          badge: 'Read-Optimized',
          nodes: [
            { id: 'bt-write', label: 'Write Request', icon: '✏️', sublabel: 'UPDATE row' },
            { id: 'bt-wal', label: 'WAL Entry', icon: '📝', sublabel: 'fsync on commit' },
            { id: 'bt-page', label: 'Find B-Tree Page', icon: '🔍', sublabel: 'O(log N) descent' },
            { id: 'bt-update', label: 'Update In-Place', icon: '📄', sublabel: 'dirty page in buffer' },
            { id: 'bt-flush', label: 'Checkpoint Flush', icon: '💾', sublabel: 'random I/O to disk' }
          ]
        },
        {
          id: 'lsm-lane',
          label: 'LSM Tree (RocksDB / Cassandra)',
          color: '#3fb950',
          description: 'Append-only writes, compaction merges SSTables',
          badge: 'Write-Optimized',
          nodes: [
            { id: 'lsm-write', label: 'Write Request', icon: '✏️', sublabel: 'INSERT row' },
            { id: 'lsm-wal', label: 'WAL Append', icon: '📝', sublabel: 'sequential I/O' },
            { id: 'lsm-mem', label: 'MemTable Insert', icon: '🧠', sublabel: 'in-memory skip list' },
            { id: 'lsm-flush', label: 'Flush to L0 SSTable', icon: '📦', sublabel: 'when MemTable full (64MB)' },
            { id: 'lsm-compact', label: 'Compaction', icon: '🔄', sublabel: 'L0→L1→L2 merge sort' }
          ]
        }
      ]
    },

    interview: [
      {
        question: "Why does LSM have higher write amplification than B-Tree yet is still preferred for write-heavy workloads?",
        answer: "LSM's write amplification (10–30×) happens entirely in sequential I/O via compaction — sequential writes on NVMe are 10–100× faster than random writes. B-Tree's lower write amplification (2–5×) involves random I/O to update in-place pages across the disk. At high write rates, random I/O saturates disk IOPS while sequential I/O scales linearly. So even though LSM writes more bytes, it writes them faster.",
        followUps: [
          "How does RocksDB's leveled compaction limit space amplification?",
          "What is write stalling in LSM and how do you avoid it?"
        ]
      },
      {
        question: "How do Bloom filters reduce LSM read amplification?",
        answer: "Each SSTable carries a Bloom filter — a probabilistic bit array that says 'key X is definitely NOT in this file' with zero false negatives. When reading, the engine checks Bloom filters from newest to oldest SSTable and skips any SSTable that says the key is absent. With 10 bits/key, false positive rate is ~1%, meaning 99% of unnecessary SSTable reads are skipped. Without Bloom filters, a point read on an LSM system could require reading O(number of SSTables) files.",
        followUps: [
          "What's the tradeoff of increasing bits per key in a Bloom filter?",
          "How do prefix Bloom filters work in RocksDB?"
        ]
      },
      {
        question: "When would you NOT use an LSM-backed database?",
        answer: "Avoid LSM when: (1) Workload is read-heavy (80%+ reads) — Bloom filter misses and SSTable merging cost more than B-Tree's predictable O(log N) reads. (2) You need low read latency with high consistency guarantees — compaction can cause read latency spikes. (3) You do many small random updates — space amplification during compaction wastes disk. PostgreSQL or MySQL with InnoDB is better for classic OLTP transaction processing.",
        followUps: [
          "How does TiKV (TiDB's storage engine) use RocksDB?",
          "What is the write cliff in Cassandra LSM?"
        ]
      },
      {
        question: "Explain compaction strategies and their tradeoffs.",
        answer: "Size-Tiered Compaction (Cassandra default): merges SSTables of similar size together. Lower write amplification but higher space amplification (2–4×) since old and new SSTables coexist. Leveled Compaction (RocksDB default): enforces level size ratios (L1=10MB, L2=100MB…) with only one SSTable per key range per level. Better read performance and space efficiency (1.1×) but higher write amplification. FIFO Compaction: simply deletes oldest SSTables, ideal for TTL-based time-series workloads.",
        followUps: [
          "What is Universal Compaction in RocksDB?",
          "How does Cassandra TWCS (Time Window Compaction Strategy) work?"
        ]
      },
      {
        question: "How does a B-Tree handle concurrent writes without corruption?",
        answer: "B-Trees use page-level latches (short-lived spinlocks or mutexes) during structural modifications (splits/merges). PostgreSQL uses a combination of buffer manager pins, LWLocks per buffer, and B-Tree-specific lock coupling (hold child latch before releasing parent latch during descent). For crash safety, all page modifications are first written to WAL — on crash recovery, WAL is replayed to restore consistent state. This is the 'WAL before page' invariant.",
        followUps: [
          "What is a B-Tree page split and when does it happen?",
          "How does InnoDB's gap locking work with B-Trees?"
        ]
      }
    ],

    tradeoffs: {
      pros: [
        "B-Tree: O(log N) predictable read latency, great for OLTP read-heavy workloads",
        "LSM: Sequential-only writes saturate NVMe bandwidth, 5–10× write throughput vs B-Tree",
        "LSM: Better compression ratios (sorted data compresses well) — MyRocks saved Meta 50% storage",
        "B-Tree: Simple in-place updates, no compaction overhead or latency spikes",
        "LSM: Near-zero write latency variance — all writes hit MemTable first"
      ],
      cons: [
        "LSM: Read amplification without Bloom filters — may scan many SSTables per point read",
        "LSM: Compaction I/O competes with user queries causing latency spikes ('write stalls')",
        "B-Tree: Random I/O on HDDs is 100× slower than sequential — poor for write-heavy HDD workloads",
        "LSM: Space amplification during compaction — need 2–4× disk headroom",
        "B-Tree: Page fragmentation over time requires VACUUM/REINDEX maintenance"
      ],
      when: "Use B-Tree (PostgreSQL, MySQL InnoDB) for OLTP: mixed read/write, transactions, < 50K writes/sec. Use LSM (Cassandra, RocksDB, HBase) for write-heavy append workloads: event logs, time-series, > 100K writes/sec, or when storage cost savings matter."
    },

    failures: [
      {
        name: "LSM Write Stall / Write Stop",
        cause: "L0 SSTable count exceeds soft limit (default 20 in RocksDB). Compaction cannot keep up with incoming write rate, triggering write throttling then full stall.",
        impact: "Write latency spikes from microseconds to seconds. Application timeouts. In production, this looked like 'Cassandra is down' when actually compaction was saturated.",
        fix: "Increase compaction threads (compaction_readahead_size, max_background_compactions). Reduce write rate via backpressure. Add more SSDs. Monitor L0 SSTable count and alert at 15."
      },
      {
        name: "B-Tree Index Bloat",
        cause: "High-churn tables with many deletes leave dead tuples in B-Tree pages. PostgreSQL's MVCC leaves old row versions in heap and index. Without regular VACUUM, dead entries accumulate.",
        impact: "Index size grows 3–5× its logical size. Index scans read many empty pages, degrading performance. One team had a 500GB index for a 100GB table.",
        fix: "Enable pg_autovacuum with aggressive settings for high-churn tables. Run REINDEX CONCURRENTLY periodically. Monitor pg_stat_user_tables for n_dead_tup."
      },
      {
        name: "LSM SSTable Read Amplification Spike",
        cause: "Bloom filters misconfigured (too few bits), or very high L0 SSTable accumulation causing reads to scan many files. Happens after a bulk load that skips compaction.",
        impact: "Read latency degrades from sub-ms to 50–100ms. CPU spikes from decompression. Looks like a 'slow query' problem but is a storage engine issue.",
        fix: "Force compaction after bulk loads (nodetool compact in Cassandra). Increase Bloom filter bits per key. Monitor bloom_filter_useful metric — if < 90% useful, something is wrong."
      },
      {
        name: "B-Tree Deadlock on Page Splits",
        cause: "Concurrent inserts on an auto-increment primary key hit the same rightmost leaf page simultaneously, causing excessive page splits and latch contention.",
        impact: "Throughput drops 10× on high-concurrency inserts. InnoDB shows high 'lock waits' in SHOW ENGINE INNODB STATUS.",
        fix: "Use UUID v4 primary keys to spread inserts across tree (though this increases fragmentation). Or use sequence-based but set innodb_autoinc_lock_mode=2 (interleaved) for better concurrency."
      }
    ],

    gotchas: [
      "LSM Bloom filters only help for point reads (key existence checks) — range scans still touch all SSTables covering the range.",
      "RocksDB's default column family uses leveled compaction, but the write-heavy compaction with tiered may suit log-append workloads better.",
      "PostgreSQL's B-Tree indexes are NOT clustered — the heap file is heap-ordered, requiring a separate index-to-heap lookup (TOAST for large values).",
      "In Cassandra, compaction removes tombstones only when ALL replicas agree — tombstones can accumulate if a replica is down during the tombstone's gc_grace_seconds window.",
      "B-Tree splits are not atomic — PostgreSQL uses 'incomplete split' detection on recovery to handle crash-during-split correctly."
    ]
  };
  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
