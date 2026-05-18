(function() {
  "use strict";
  var topic = {
    id: "db-indexes",
    area: "databases",
    title: "Database Indexes",
    tag: "Performance",
    tags: ["index", "btree", "hash", "covering", "composite", "partial", "full-text", "gin", "gist", "performance"],

    concept: `## Database Indexes — Deep Internals

An index is a separate data structure that stores a sorted copy of one or more columns alongside pointers back to the heap (the actual table storage). The database can then traverse the index to find matching rows without scanning every page in the table.

---

### B-Tree Index Structure

PostgreSQL, MySQL, and most RDBMS use **B+ Trees** for their default index type. The tree is made of fixed-size **pages** (8 KB in PostgreSQL, 16 KB in MySQL InnoDB).

**Structure:**
- **Root page** → holds high/low key ranges and pointers to branch pages
- **Branch pages (internal nodes)** → hold N keys and N+1 child pointers
- **Leaf pages** → hold the actual indexed key values + heap pointers (TIDs in Postgres: block number + offset)
- **Leaf pages are doubly-linked** → enabling fast range scans without going back to root
- **Fanout** = number of child pointers per page. With 8 KB pages and 8-byte integer keys, fanout ≈ 400. A 3-level tree covers 400³ = 64 million rows with only 3 I/Os.

**Point lookup:** Root → Branch → Leaf → Heap fetch. O(log N) page reads.

**Range scan:** Descend to start leaf, then follow sibling pointers left-to-right — no need to re-traverse from root. This is why B+ Trees dominate over B-Trees (which store data in internal nodes).

\`\`\`sql
-- Default B-Tree index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- PostgreSQL confirms type in pg_indexes
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'orders';
-- idx_orders_user_id | CREATE INDEX idx_orders_user_id ON orders USING btree (user_id)
\`\`\`

---

### Hash Indexes

Hash indexes store a hash of the indexed column and a pointer to the row. They support only **equality lookups** (=), not range queries or ORDER BY. PostgreSQL WAL-logs hash indexes since v10 (previously not crash-safe).

\`\`\`sql
-- Hash index: fast equality, useless for range scans
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- This will USE the hash index (equality)
SELECT * FROM sessions WHERE token = 'abc123xyz';

-- This will NOT use the hash index (range)
SELECT * FROM sessions WHERE token > 'abc';
\`\`\`

**When to use:** UUID primary key lookups, session token lookups, any pure equality workload where key distribution is uniform. Hash indexes are smaller and faster for equality than B-Trees.

---

### Composite Indexes (Multi-Column)

A composite index on (A, B, C) is sorted first by A, then by B within each A group, then by C within each (A, B) group.

**The leftmost prefix rule:** A query can use the index only if it references a **leftmost prefix** of the index columns. An index on (last_name, first_name, dob) can serve:
- WHERE last_name = 'Smith'
- WHERE last_name = 'Smith' AND first_name = 'John'
- WHERE last_name = 'Smith' AND first_name = 'John' AND dob = '1990-01-01'

But NOT: WHERE first_name = 'John' (skips the leading column).

\`\`\`sql
-- Composite index: column order is critical
CREATE INDEX idx_orders_status_created ON orders(status, created_at);

-- USES the index (leftmost prefix: status)
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at;

-- USES the index (both columns)
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';

-- Does NOT use the index efficiently (skips leading column)
EXPLAIN ANALYZE SELECT * FROM orders WHERE created_at > NOW() - INTERVAL '7 days';
-- ^ Results in sequential scan or index scan with high filtering cost
\`\`\`

**Column order rule:** Put the **most selective** (highest cardinality) column first for point lookups. Put the **equality column** before the **range column** — range stops the index scan from using subsequent columns efficiently.

---

### Covering Indexes (Index-Only Scans)

A covering index includes all columns needed by a query — the database never touches the heap (table) at all. This is called an **index-only scan** and is the fastest possible read path.

\`\`\`sql
-- Without covering index: index scan + heap fetch for every row
CREATE INDEX idx_orders_user ON orders(user_id);
-- Query fetches user_id from index, then heap-fetches status and total for each row
SELECT user_id, status, total FROM orders WHERE user_id = 42;

-- WITH covering index: index-only scan — heap never touched
CREATE INDEX idx_orders_user_covering ON orders(user_id) INCLUDE (status, total);
SELECT user_id, status, total FROM orders WHERE user_id = 42;
-- EXPLAIN shows: Index Only Scan using idx_orders_user_covering
-- Heap Fetches: 0

-- PostgreSQL INCLUDE clause (pg 11+) adds columns without sorting by them
-- MySQL: list all columns in the index definition
CREATE INDEX idx_mysql_covering ON orders(user_id, status, total);
\`\`\`

**Caveat:** PostgreSQL index-only scans still check the **visibility map**. If a page has recent dead tuples (not yet vacuumed), it falls back to heap fetch. Run VACUUM to keep visibility map current.

---

### Partial Indexes

A partial index indexes only a **subset of rows** matching a WHERE predicate. Smaller, faster, and cheaper to maintain.

\`\`\`sql
-- Full index on 10M rows: huge, slow to build
CREATE INDEX idx_orders_status ON orders(status);

-- Partial index: only indexes the 50K 'pending' rows out of 10M
CREATE INDEX idx_orders_pending ON orders(created_at) WHERE status = 'pending';

-- This query uses the partial index (predicate matches)
SELECT * FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour';

-- Partial unique index: enforce uniqueness only for active users
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
-- Allows multiple soft-deleted rows with the same email, but only one active row
\`\`\`

---

### Full-Text Indexes

Full-text search indexes tokenize text, normalize it (stemming, stop words), and build an inverted index mapping each token to the rows containing it.

\`\`\`sql
-- PostgreSQL full-text: tsvector stores preprocessed tokens, tsquery is the search
ALTER TABLE articles ADD COLUMN search_vector tsvector;
UPDATE articles SET search_vector = to_tsvector('english', title || ' ' || body);

-- GIN index on tsvector (fast for full-text, @> operators)
CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);

-- Query
SELECT title FROM articles
WHERE search_vector @@ to_tsquery('english', 'database & index');

-- Auto-update with generated column (pg 12+)
ALTER TABLE articles
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body,''))) STORED;
CREATE INDEX idx_articles_fts ON articles USING GIN (search_vector);
\`\`\`

---

### GIN and GiST Indexes (PostgreSQL)

**GIN (Generalized Inverted Index):** Best for multi-valued columns — arrays, JSONB, tsvector. Stores a mapping from each element value to the set of rows containing it.

\`\`\`sql
-- GIN on JSONB: fast for @>, ?, ?| operators
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
SELECT * FROM events WHERE metadata @> '{"type": "click", "button": "CTA"}';

-- GIN on array column
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'performance'];
\`\`\`

**GiST (Generalized Search Tree):** Best for geometric data, ranges, nearest-neighbor. Lossy (may produce false positives, recheck needed) but supports more operator classes.

\`\`\`sql
-- GiST for range overlap queries
CREATE INDEX idx_bookings_period ON bookings USING GIST (daterange(start_date, end_date));
SELECT * FROM bookings WHERE daterange(start_date, end_date) && daterange('2024-01-01', '2024-01-31');

-- GiST for PostGIS geometry (spatial queries)
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
SELECT * FROM locations WHERE ST_DWithin(geom, ST_MakePoint(-73.9857, 40.7484), 1000);
\`\`\`

---

### Index Scans vs Heap Fetches vs Sequential Scans

| Access Method | When Used | Cost |
|---|---|---|
| Sequential Scan | No index, or >5–10% of rows match | Low per-page, high total |
| Index Scan | Selective query, fetches heap per row | Log N + heap I/O per row |
| Index Only Scan | Covering index + visibility map clean | Log N only, no heap I/O |
| Bitmap Index Scan | Medium selectivity, multiple indexes ORed | Builds bitmap, batch heap fetch |

The planner chooses based on **selectivity** (fraction of rows matched) and **cost estimates**. A query matching 20% of a 10M row table often prefers a sequential scan over an index scan because random heap fetches are costlier than sequential reads.

---

### Clustered vs Non-Clustered Indexes

**Clustered index:** The table's physical row order matches the index order. InnoDB (MySQL) always clusters data by primary key — the primary key IS the table. PostgreSQL has no automatic clustering but supports \`CLUSTER\` command (one-time operation).

\`\`\`sql
-- PostgreSQL: manually cluster table by index (one-time, not maintained)
CLUSTER orders USING idx_orders_user_id;
-- Rows are now physically sorted by user_id on disk
-- Subsequent inserts do NOT maintain this order

-- Check if table is clustered
SELECT relname, relhasoids FROM pg_class WHERE relname = 'orders';
\`\`\`

**Non-clustered (heap) index:** The index is a separate structure with pointers into the heap. PostgreSQL's default. Multiple non-clustered indexes per table are fine. Heap fetches involve random I/O for unclustered data.

**InnoDB (MySQL) implication:** Secondary indexes store the primary key value, not the heap pointer. A secondary index lookup does: secondary index leaf → primary key value → clustered index lookup. Two B-Tree traversals. This is why InnoDB primary keys should be small integers, not UUIDs (UUIDs cause random insertion into the clustered index → page splits → fragmentation).`,

    why: `## 10 Production Reasons to Understand Indexes

**1. Full table scans destroy performance at scale.**
A 1-million-row table with 8 KB pages = ~8 GB. A sequential scan reads every byte. With an index on a high-cardinality column, you touch 3–4 pages instead of 1 million. A query that takes 0.3 ms with an index takes 4–8 seconds without it at 1M rows, and 40+ seconds at 10M rows.

**2. Index-only scans eliminate the most expensive operation.**
The heap fetch (random I/O to the actual table row) is the bottleneck in most index scans. A covering index eliminates it entirely. Queries that previously did 50K heap fetches now touch zero heap pages. This is a 10–50× speedup for read-heavy endpoints.

**3. Foreign key columns without indexes cause lock storms.**
When you delete a parent row, PostgreSQL scans the child table to check for dependent rows. Without an index on the foreign key column, this is a full table scan — while holding a lock. A missing FK index on a high-traffic table causes timeouts and cascading failures. Always index foreign key columns.

**4. Sort operations spill to disk without indexes.**
ORDER BY, GROUP BY, and window functions need sorted data. Without an index matching the sort order, PostgreSQL builds an in-memory sort (or spills to a temp file on disk). An index already maintains sorted order — the planner can use it for "free" ORDER BY.

**5. JOIN performance depends entirely on index availability.**
A hash join or nested loop join on an unindexed column degrades to O(N×M). A nested loop join with an index on the inner table degrades to O(N log M). On a 100K × 1M join, that's the difference between 100 billion operations and 1.7 million.

**6. Write amplification: every index has a write cost.**
Each INSERT, UPDATE, or DELETE must update every index on the table. A table with 10 indexes pays 10× the write cost. Bulk load scenarios (data pipelines, migrations) should DROP indexes, load data, then recreate — or use COPY with maintenance_work_mem tuned high.

**7. Index bloat silently degrades performance.**
Dead index entries (from updated/deleted rows) accumulate until VACUUM cleans them. A bloated index can be 3–5× its logical size, wasting buffer pool space and slowing scans. Monitor \`pg_stat_user_indexes\` for idx_scan vs idx_tup_read ratios to detect bloat or unused indexes.

**8. Partial indexes slash maintenance cost for skewed distributions.**
If 99% of queries filter on \`status = 'active'\` but only 1% of rows are active, a full index wastes 99% of its size. A partial index covering only active rows is 100× smaller, fits entirely in buffer pool, and has near-zero update overhead.

**9. Composite index column order determines whether the index is used.**
A composite index on (tenant_id, created_at) is useless for queries filtering only on created_at. Wrong column order means the query planner falls back to a sequential scan — silently, without any error. Analyze your query patterns and build indexes that match actual WHERE clause structures.

**10. Maintenance windows: index rebuilds lock tables.**
\`CREATE INDEX\` without \`CONCURRENTLY\` takes an \`AccessShareLock\` — blocking all writes for the duration. On a 500M row table, that's 30+ minutes of downtime. \`CREATE INDEX CONCURRENTLY\` avoids the lock but takes ~2× longer and can fail (leaving an invalid index). Always use CONCURRENTLY in production and verify with \`pg_indexes\`.`,

    example: {
      language: "sql",
      code: `-- ============================================================
-- DATABASE INDEXES: SQL EXAMPLES (PostgreSQL)
-- ============================================================

-- 1. Basic B-Tree index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- 2. Composite index — equality column FIRST, range column SECOND
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- 3. Covering index using INCLUDE (pg 11+)
--    Allows index-only scan for the SELECT columns listed
CREATE INDEX idx_orders_covering
  ON orders(user_id)
  INCLUDE (status, total, created_at);

-- 4. Partial index — only index 'pending' rows
CREATE INDEX idx_orders_pending_created
  ON orders(created_at)
  WHERE status = 'pending';

-- 5. Partial unique index — unique email for non-deleted users only
CREATE UNIQUE INDEX idx_users_email_active
  ON users(email)
  WHERE deleted_at IS NULL;

-- 6. Hash index for pure equality lookups
CREATE INDEX idx_sessions_token
  ON sessions USING HASH (token);

-- 7. GIN index for JSONB column
CREATE INDEX idx_events_payload
  ON events USING GIN (payload);

-- ============================================================
-- SLOW QUERY (before index)
-- ============================================================

-- 8 seconds on 10M rows — sequential scan
EXPLAIN ANALYZE
  SELECT order_id, total
  FROM orders
  WHERE user_id = 12345
    AND status = 'completed';

-- Output (no index):
-- Seq Scan on orders  (cost=0.00..312450.00 rows=3 width=20)
--                     (actual time=2341.123..8012.456 rows=3 loops=1)
--   Filter: ((user_id = 12345) AND (status = 'completed'::text))
--   Rows Removed by Filter: 9999997
-- Planning Time: 0.3 ms
-- Execution Time: 8013.2 ms

-- ============================================================
-- FAST QUERY (after composite + covering index)
-- ============================================================

-- 0.08 ms on 10M rows — index-only scan
EXPLAIN ANALYZE
  SELECT order_id, total
  FROM orders
  WHERE user_id = 12345
    AND status = 'completed';

-- Output (with index):
-- Index Only Scan using idx_orders_covering on orders
--   (cost=0.56..8.58 rows=3 width=20)
--   (actual time=0.041..0.062 rows=3 loops=1)
--   Index Cond: (user_id = 12345)
--   Filter: (status = 'completed'::text)
--   Heap Fetches: 0
-- Planning Time: 0.4 ms
-- Execution Time: 0.08 ms

-- ============================================================
-- INDEX-ONLY SCAN VERIFICATION
-- ============================================================

-- Check how many heap fetches are happening (0 = pure index-only)
SELECT
  indexrelname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch   -- heap fetches; 0 means index-only scan working
FROM pg_stat_user_indexes
WHERE relname = 'orders'
ORDER BY idx_scan DESC;

-- ============================================================
-- FOREIGN KEY INDEX (prevent lock scans on DELETE)
-- ============================================================

-- Without this index, DELETE FROM users WHERE id=X
-- causes a full scan of order_items to find dependent rows
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ============================================================
-- REBUILD BLOATED INDEX WITHOUT DOWNTIME
-- ============================================================

-- Safe concurrent rebuild (no write lock)
REINDEX INDEX CONCURRENTLY idx_orders_user_id;

-- Check index bloat
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 10;`,
      notes: "All examples are PostgreSQL 14+. The slow→fast transformation shows an 8013 ms sequential scan reduced to 0.08 ms via a composite covering index — 100,000× speedup. Heap Fetches: 0 confirms the index-only scan is serving the query entirely from the index structure without touching table pages."
    },

    interview: [
      {
        question: "Explain the internal structure of a B-Tree index. How does PostgreSQL find a row using it?",
        answer: "A PostgreSQL B-Tree index is actually a B+ Tree. It consists of fixed-size pages (8 KB by default). The root page holds key ranges and pointers to branch pages. Branch (internal) pages hold N keys and N+1 child pointers — this is the 'fanout'. Leaf pages hold the actual indexed key values alongside TIDs (tuple identifiers = block number + offset) pointing into the heap. Leaf pages are doubly linked, enabling efficient range scans by following sibling pointers without returning to root.\n\nTo find a row: the planner descends from root → branches → leaf using binary search at each level. With typical fanout ~400 and 8-byte integer keys, a 3-level tree covers 64 million rows with only 3 page reads. Once the leaf is found, PostgreSQL fetches the heap page using the TID, verifies the tuple is visible to the current transaction (MVCC), and returns the row. Total: O(log N) + 1 heap fetch.",
        followUps: [
          "Why does PostgreSQL use B+ Trees instead of B-Trees?",
          "What is the significance of fanout in index performance?",
          "How does MVCC affect index scans?"
        ]
      },
      {
        question: "When should you NOT add an index?",
        answer: "Several situations argue against adding an index:\n\n1. **Low cardinality columns** — a boolean 'is_active' column has only 2 values. An index scan returning 50% of rows is slower than a sequential scan due to random heap fetches.\n2. **Write-heavy tables** — every INSERT/UPDATE/DELETE must update all indexes. A table with 10 indexes pays 10× the write cost. High-throughput event or log tables should minimize indexes.\n3. **Small tables** — for tables under ~10K rows, a sequential scan fits in a few pages in the buffer pool. The planner will correctly ignore your index.\n4. **Columns never used in WHERE/JOIN/ORDER BY** — an unused index wastes storage and write overhead with zero query benefit. Check pg_stat_user_indexes: if idx_scan is 0 after weeks of production traffic, drop it.\n5. **Duplicate/overlapping indexes** — an index on (A) is redundant if you already have an index on (A, B). The composite covers all queries the single-column one does.",
        followUps: [
          "How do you detect unused indexes in production?",
          "What is the impact of indexes on bulk INSERT performance?"
        ]
      },
      {
        question: "What is index selectivity and why does it matter for query planning?",
        answer: "Selectivity is the fraction of rows an index condition matches — a highly selective condition matches very few rows (close to 0%), a low-selectivity condition matches most rows (close to 100%). The PostgreSQL query planner uses selectivity estimates (from pg_statistic, populated by ANALYZE) to decide whether an index scan or sequential scan is cheaper.\n\nFor an index scan on N rows returning K results: cost ≈ K × (index page reads + heap page random I/Os). For a sequential scan: cost ≈ total_pages × seq_page_cost. The planner switches to sequential scan when K is large enough that random I/Os exceed the sequential scan cost. This threshold is roughly 5–15% of the table depending on the random_page_cost vs seq_page_cost ratio.\n\nPractical implication: an index on 'country' in a US-only app (all rows = 'US') has selectivity ~1.0 — useless. An index on 'user_id' in a 10M row orders table where avg user has 5 orders has selectivity 0.000005 — extremely valuable.",
        followUps: [
          "How does ANALYZE collect statistics?",
          "What is the statistics target and when would you increase it?",
          "How does the planner estimate row counts for inequality conditions?"
        ]
      },
      {
        question: "Explain the composite index column order rule with a concrete example.",
        answer: "A composite index on (A, B, C) stores rows sorted by A first, then B within each A group, then C within each (A, B) group. This sorting determines which query predicates can use the index.\n\n**Leftmost prefix rule:** The index can only be used if the query references a contiguous leftmost subset of the columns. For index (status, created_at):\n- WHERE status = 'X' → uses index (prefix match)\n- WHERE status = 'X' AND created_at > '2024-01-01' → uses both columns\n- WHERE created_at > '2024-01-01' → cannot use index (first column missing)\n\n**Equality before range:** If your query is WHERE status = 'pending' AND created_at > NOW() - 7 days, put status first (equality) and created_at second (range). Reversing this (created_at, status) means the planner uses the index for the range scan on created_at but cannot narrow further by status within that range — it reads more index pages unnecessarily.\n\n**High cardinality first for point lookups:** For SELECT * WHERE tenant_id = X AND user_id = Y, if user_id has higher cardinality (more unique values), put it first to reduce the number of leaf pages touched.",
        followUps: [
          "What happens to composite index usage when an intermediate column is skipped?",
          "Can index skip scans help with missing leading column queries in some databases?"
        ]
      },
      {
        question: "What is a covering index and how does an index-only scan work?",
        answer: "A covering index includes all columns referenced by a query — both the filter columns (WHERE) and the projection columns (SELECT). When the planner can satisfy the entire query from the index without touching the heap, it executes an index-only scan.\n\nIn PostgreSQL, index-only scans work as follows:\n1. Descend the B-Tree to the matching leaf pages.\n2. For each leaf entry, check the **visibility map** — a per-page bitmap indicating whether all tuples on that heap page are visible to all transactions.\n3. If the page is marked all-visible: return the data directly from the index leaf. No heap I/O.\n4. If the page is NOT all-visible (has recent dead tuples): fall back to a heap fetch to verify visibility.\n\nThis is why VACUUM is critical for index-only scan efficiency. After heavy DELETE/UPDATE workloads, the visibility map becomes stale and index-only scans degrade to regular index scans.\n\nPostgreSQL pg 11+ added the INCLUDE clause — columns in INCLUDE are stored in leaf pages but not part of the sort key, keeping the index smaller while still allowing index-only scans:\n`CREATE INDEX idx ON orders(user_id) INCLUDE (status, total);`",
        followUps: [
          "How does the visibility map relate to VACUUM?",
          "What is the difference between INCLUDE columns and regular index columns?",
          "When would an index-only scan fall back to a heap fetch?"
        ]
      },
      {
        question: "What is index bloat and how do you detect and fix it?",
        answer: "Index bloat occurs when an index accumulates dead entries (from deleted or updated rows) that have not been reclaimed by VACUUM. In PostgreSQL, an UPDATE is actually a DELETE + INSERT (MVCC append). The old index entry is marked dead but stays in the index pages until VACUUM removes it. If VACUUM falls behind (due to long transactions, autovacuum tuning, or high write rate), the index can grow to 3–5× its logical size.\n\n**Effects:** Index pages hold fewer live entries → more pages to scan → worse cache efficiency → slower queries.\n\n**Detection:**\n```sql\nSELECT schemaname, tablename, indexname,\n  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,\n  idx_scan, idx_tup_read, idx_tup_fetch\nFROM pg_stat_user_indexes\nORDER BY pg_relation_size(indexrelid) DESC;\n```\nAlso use pgstattuple extension: `SELECT * FROM pgstattuple('idx_orders_user_id');` — shows dead_tuple_count and free_space.\n\n**Fix:** Run VACUUM (or VACUUM ANALYZE) on the table. For severe bloat, use `REINDEX INDEX CONCURRENTLY idx_name` to rebuild the index from scratch without locking writes. Tune autovacuum settings: lower autovacuum_vacuum_scale_factor for high-write tables.",
        followUps: [
          "How does autovacuum decide when to vacuum a table?",
          "What is VACUUM FULL and why is it dangerous?",
          "How do long-running transactions prevent VACUUM from cleaning up dead tuples?"
        ]
      },
      {
        question: "What are HOT updates and how do they interact with indexes?",
        answer: "HOT (Heap-Only Tuple) updates are a PostgreSQL optimization that avoids updating indexes when an UPDATE changes only non-indexed columns. Normally, every UPDATE creates a new heap tuple version AND updates every index pointing to the old version. HOT eliminates the index update when:\n1. The update does NOT change any indexed column values.\n2. The new tuple version fits on the SAME heap page as the old version (no cross-page migration).\n\nInstead of updating the index, PostgreSQL creates a chain: the index entry points to the old heap tuple, which has a pointer to the new heap tuple. Index scans follow this HOT chain transparently. VACUUM cleans up the chain, redirecting the index entry directly to the current live tuple.\n\n**Practical implication:** If you frequently update non-indexed columns (e.g., a 'last_seen_at' timestamp on a users table that has indexes only on email and status), HOT updates keep index overhead near zero. If you index every column, HOT updates become rare, and write amplification increases.\n\n**Monitor HOT effectiveness:**\n```sql\nSELECT n_tup_upd, n_tup_hot_upd,\n  round(n_tup_hot_upd::numeric / nullif(n_tup_upd,0) * 100, 1) AS hot_pct\nFROM pg_stat_user_tables\nWHERE relname = 'users';\n```\nA high HOT percentage (>80%) means your index design aligns well with your update patterns.",
        followUps: [
          "What prevents a HOT update from succeeding even on a non-indexed column?",
          "How does fillfactor affect HOT update success rates?"
        ]
      },
      {
        question: "When and why would you use a partial index? Give a production example.",
        answer: "A partial index indexes only the rows matching a specified WHERE predicate. Use it when:\n- A small subset of rows is the target of most queries (skewed distribution)\n- You want to enforce conditional uniqueness\n- You want to dramatically reduce index size and write overhead\n\n**Production example 1 — Queue processing:**\nAn orders table has 50M rows but only 10K have status='pending'. Worker processes poll for pending orders constantly. A full index on status is mostly useless (low cardinality). A partial index:\n```sql\nCREATE INDEX idx_orders_pending ON orders(created_at)\nWHERE status = 'pending';\n```\nThis 10K-row index fits entirely in buffer pool, makes worker queries sub-millisecond, and has near-zero write overhead (only INSERT/UPDATE that touch 'pending' rows touch this index).\n\n**Production example 2 — Soft deletes:**\nMost queries filter WHERE deleted_at IS NULL. Index only the active rows:\n```sql\nCREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;\nCREATE UNIQUE INDEX idx_users_email_unique ON users(email) WHERE deleted_at IS NULL;\n```\nThe unique partial index prevents duplicate active emails while allowing multiple soft-deleted rows with the same email — impossible with a full unique constraint.\n\nFor the planner to use a partial index, the query's WHERE clause must **imply** the index predicate — not necessarily be identical to it.",
        followUps: [
          "How does the planner decide whether a query's WHERE clause implies the partial index predicate?",
          "Can you combine partial and composite indexes?"
        ]
      },
      {
        question: "Why must foreign key columns always be indexed? What happens without them?",
        answer: "When you execute DELETE FROM parent_table WHERE id = X, PostgreSQL must verify no child rows exist in the referencing table (to enforce the foreign key constraint). Without an index on the child table's FK column, this verification requires a **full sequential scan** of the child table — while holding a lock on the parent row.\n\n**Concrete failure scenario:** A users table (1M rows) and an orders table (10M rows) with a FK from orders.user_id → users.id. If you delete a user, PostgreSQL scans all 10M order rows. At 50K deletes/minute (account deletion batch), this creates 50K × ~8 seconds = cascading lock timeouts and connection pool exhaustion.\n\n**The fix is trivial:**\n```sql\nCREATE INDEX idx_orders_user_id_fk ON orders(user_id);\n```\nNow the FK check is a 3-page index scan instead of a 10M-row sequential scan.\n\n**PostgreSQL behavior:** Unlike MySQL (InnoDB auto-creates FK indexes), PostgreSQL does NOT automatically create indexes for foreign keys. You must create them manually. `pg_dump` does not warn about missing FK indexes. This is a well-known silent performance trap.\n\n**Detection:**\n```sql\n-- Find FK columns without indexes\nSELECT conname, conrelid::regclass AS table,\n  a.attname AS column\nFROM pg_constraint c\nJOIN pg_attribute a ON a.attrelid = c.conrelid\n  AND a.attnum = ANY(c.conkey)\nWHERE c.contype = 'f'\n  AND NOT EXISTS (\n    SELECT 1 FROM pg_index i\n    WHERE i.indrelid = c.conrelid\n      AND a.attnum = ANY(i.indkey)\n  );\n```",
        followUps: [
          "Does MySQL InnoDB automatically create FK indexes?",
          "What lock level does PostgreSQL acquire during FK violation checks on DELETE?"
        ]
      },
      {
        question: "How do you use EXPLAIN ANALYZE to diagnose index usage? What are the key output fields to look at?",
        answer: "EXPLAIN ANALYZE executes the query and returns the actual execution plan with real timings and row counts alongside the planner's estimates.\n\n**Key fields:**\n- **Node type:** `Seq Scan` (bad for large tables), `Index Scan`, `Index Only Scan` (best), `Bitmap Index Scan` (batched access)\n- **cost=X..Y:** Planner's estimate. X = startup cost (first row), Y = total cost. Units are arbitrary but comparable.\n- **rows=N:** Planner's estimated row count. `actual rows=M` is the real count. Large divergence (10×+) means stale statistics — run ANALYZE.\n- **actual time=X..Y:** Real wall-clock time in milliseconds per loop. X = time to first row, Y = time to last row.\n- **loops=N:** How many times this node executed (for nested loop joins). Actual total time = actual_time × loops.\n- **Heap Fetches:** For Index Only Scans — shows how many times it had to fall back to the heap. Should be 0 after VACUUM.\n- **Filter vs Index Cond:** `Index Cond` means the B-Tree narrowed by this predicate. `Filter` means the predicate was applied AFTER fetching rows — rows removed by filter show as `Rows Removed by Filter: N`.\n- **Buffers:** With `EXPLAIN (ANALYZE, BUFFERS)`, shows `shared hit=N` (buffer pool hits) vs `shared read=N` (disk reads). High read count = cold cache or missing index.\n\n**Workflow:** Run EXPLAIN ANALYZE in a non-production replica. Check node types first (look for Seq Scan on large tables). Then check rows estimate accuracy. Then check actual time. Then check Buffers.",
        followUps: [
          "What does EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) add over plain EXPLAIN ANALYZE?",
          "How do you interpret a Bitmap Heap Scan + Bitmap Index Scan combination?",
          "When would the planner choose a Seq Scan even when an index exists?"
        ]
      }
    ],

    tradeoffs: {
      pros: [
        "B-Tree indexes reduce point lookup from O(N) to O(log N) — 3–4 page reads for 64M rows",
        "Index-only scans eliminate heap I/O entirely — 10–100× speedup for covered queries",
        "Composite indexes satisfy multiple predicates and ORDER BY with a single structure",
        "Partial indexes are dramatically smaller than full indexes for skewed distributions",
        "Hash indexes are faster and smaller than B-Trees for pure equality lookups",
        "GIN indexes enable fast containment queries on JSONB, arrays, and full-text vectors",
        "Indexes allow the planner to use merge joins (requires sorted input) instead of hash joins",
        "Partial unique indexes enforce conditional uniqueness impossible with table constraints",
        "Covering indexes allow zero-heap-fetch query execution for read-critical paths",
        "Indexes on ORDER BY columns eliminate expensive in-memory sort operations"
      ],
      cons: [
        "Every index adds write amplification — each INSERT/UPDATE/DELETE must update all indexes on the table",
        "Index bloat accumulates from dead tuples and requires periodic VACUUM or REINDEX",
        "Index storage overhead: a B-Tree index is typically 20–40% of the indexed column's data size",
        "CREATE INDEX without CONCURRENTLY locks all writes for the build duration",
        "The query planner can choose the wrong index or ignore indexes due to stale statistics",
        "Composite index column order mistakes silently result in sequential scans",
        "Too many indexes on write-heavy tables can make INSERT throughput collapse",
        "Hash indexes in PostgreSQL are larger than B-Trees for high-cardinality columns",
        "GIN indexes have high build cost and larger size than B-Tree; write updates are slower",
        "Index-only scans degrade silently after heavy DML due to stale visibility map"
      ],
      when: "Add indexes when queries filter, sort, or join on a column and the table has more than ~10K rows. Prioritize high-cardinality columns in WHERE clauses, foreign key columns, columns used in ORDER BY on large result sets, and any column referenced by a frequent slow query. Avoid adding indexes to write-only tables, low-cardinality columns used alone, or columns that already have a covering composite index. Always verify index usage post-deployment with pg_stat_user_indexes."
    },

    gotchas: [
      "**Missing foreign key indexes:** PostgreSQL does NOT auto-create FK indexes. Every unindexed FK column causes a full table scan on DELETE/UPDATE of the parent — a silent production time bomb at scale. Always manually index FK columns.",
      "**Composite index column order reversed:** Putting the range column before the equality column in a composite index (e.g., (created_at, status) instead of (status, created_at)) causes the planner to scan far more index pages for the most common query patterns. The correct rule: equality predicates first, range predicates last.",
      "**Index-only scan silently degrades after bulk DML:** After heavy DELETE or UPDATE operations, the visibility map becomes stale. Index-only scans fall back to heap fetches (Heap Fetches > 0 in EXPLAIN). Run VACUUM ANALYZE after bulk operations to restore index-only scan efficiency.",
      "**Low cardinality index wastes space and confuses the planner:** An index on a boolean or status column with 2–5 distinct values can actually slow queries down. The planner may use the index, do thousands of random heap fetches, and take longer than a sequential scan would. Check selectivity before indexing.",
      "**CREATE INDEX without CONCURRENTLY in production:** Running CREATE INDEX (without CONCURRENTLY) on a large table acquires an AccessExclusiveLock blocking all reads AND writes for 10–60+ minutes. Always use CREATE INDEX CONCURRENTLY in production — it takes longer but never blocks. Monitor for invalid indexes after CONCURRENTLY in case it fails mid-build.",
      "**Stale statistics causing wrong plan:** The planner's index decision is only as good as its statistics. If ANALYZE hasn't run since a major data distribution change (bulk import, purge), the planner may estimate 10 rows when the actual result is 10 million, choosing an index scan that's far slower than a sequential scan. Run ANALYZE after bulk operations and increase the statistics target for columns with complex distributions."
    ]
  };

  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
