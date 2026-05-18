(function() {
  var topic = {
    id: "db-replication",
    area: "databases",
    title: "Database Replication",
    tag: "Scalability",
    tags: ["replication","leader-follower","multi-leader","leaderless","wal","cdc","lag","failover"],
    concept: `## Database Replication

Replication means keeping a copy of the same data on multiple machines connected via a network. Reasons: keep data geographically close to users (reduce latency), allow the system to continue working even if some nodes fail (increase availability), scale out the number of machines that can serve read queries (increase read throughput).

---

### 1. Leader-Follower (Single-Leader) Replication

One replica is designated the **leader** (also called master or primary). All writes go to the leader. The leader sends a **replication stream** to **followers** (replicas, standbys). Reads can go to any replica.

#### Synchronous vs Asynchronous Replication

| Mode | Behavior | Trade-off |
|------|----------|-----------|
| **Synchronous** | Leader waits for follower ACK before confirming write to client | No data loss on failover; follower outage blocks all writes |
| **Asynchronous** | Leader confirms write immediately, ships log in background | Low latency; data loss possible if leader dies before log shipped |
| **Semi-synchronous** | One follower is sync, rest async | Practical middle ground (PostgreSQL default) |

**Example 1 — Read-your-writes consistency problem:** User submits a profile update (write goes to leader). They immediately refresh and their read hits a follower that hasn't caught up yet. They see stale data. Fix: route reads of data the user just modified to the leader for a short window.

**Example 2 — Monotonic reads:** User reads from replica A (sees value X), then reads from replica B which is further behind (sees old value). Fix: route a given user's reads to the same replica, or use read-after-write tokens (LSN watermarks).

**Example 3 — Consistent prefix reads:** In a distributed system, causal writes may arrive out of order at a replica. User sees "answer" before seeing "question". Fix: ensure causally related writes go to the same partition.

#### WAL Shipping (Physical Replication)

PostgreSQL streaming replication ships **WAL segments** (binary byte-for-byte page changes) from primary to standby. The standby continuously applies these records via its **recovery process**. The standby can never run a different Postgres version — it replays raw page mutations.

\`\`\`
Primary → WAL sender → network → WAL receiver → standby recovery process
\`\`\`

**Example 4 — Postgres streaming replication setup:**
\`\`\`sql
-- postgresql.conf on primary
wal_level = replica
max_wal_senders = 5
wal_keep_size = 1GB

-- pg_hba.conf on primary
host replication replicator 10.0.0.0/8 md5

-- On standby: pg_basebackup + recovery.conf / standby.signal
primary_conninfo = 'host=primary port=5432 user=replicator'
\`\`\`

#### Logical Replication

Ships **logical changes** (INSERT/UPDATE/DELETE at row level) rather than physical pages. Allows cross-version replication and selective table replication. PostgreSQL uses **publication/subscription** model. MySQL uses **binlog** (row-based format preferred).

**Example 5 — MySQL binlog replication:** MySQL primary writes row-based binary log. Replica has two threads: **I/O thread** pulls binlog events into a **relay log**, **SQL thread** replays them. \`SHOW SLAVE STATUS\` reports \`Seconds_Behind_Master\`.

**Example 6 — CDC for event streaming:** Debezium reads MySQL binlog / Postgres WAL as a change stream and publishes events to Kafka. Downstream consumers get a reliable ordered stream of database changes without polling. Used for search index sync, cache invalidation, analytics pipelines.

---

### 2. Multi-Leader Replication

Multiple nodes each accept writes. Each leader acts as a follower to the other leaders. Used when: multiple datacenters, offline clients (CouchDB), collaborative editing.

#### Conflict Resolution

**Example 7 — Cross-datacenter replication with conflict:** User in US datacenter updates their username to "alice". Simultaneously, user (or network glitch replay) in EU datacenter updates same row to "alice2". Both writes succeed locally. When they replicate to each other, conflict arises.

Resolution strategies:
- **Last-Write-Wins (LWW):** Each write tagged with a timestamp (or UUID). On conflict, higher timestamp wins. Simple but lossy — concurrent writes silently dropped. Cassandra default.
- **CRDTs (Conflict-free Replicated Data Types):** Data structures that can be merged deterministically. G-Counter, PN-Counter, LWW-Register, OR-Set. No conflicts by design but limited to specific semantics.
- **Application-level merge:** Application receives both conflicting versions and decides (e.g., Google Docs operational transforms, shopping cart union). Most flexible, most complex.
- **Causal versioning (vector clocks):** Track causal dependencies. If one write causally dominates, use it. If truly concurrent, surface conflict to application.

---

### 3. Leaderless / Quorum Replication (Dynamo-style)

No single leader. Client (or a coordinator) sends writes to **N** replicas in parallel. A write is considered successful when **W** replicas acknowledge. Reads are sent to **R** replicas; client uses latest value (highest version).

#### Quorum Math

If **W + R > N**, at least one node in every read set overlaps with every write set → reads always see up-to-date data (under no failures).

**Example 8 — Quorum math with N=5, W=3, R=3:**
- W + R = 6 > N = 5 → overlap guaranteed ✓
- Tolerate W-1 = 2 unavailable write nodes
- Tolerate R-1 = 2 unavailable read nodes
- For high read availability: W=5, R=1 (all writes must succeed, reads from any one)
- For high write availability: W=1, R=5 (any one write, all must agree on read)

#### Sloppy Quorum

During network partition, if fewer than W healthy nodes are reachable in the "home" node set, writes can be accepted by other nodes (outside the normal N). These are called **hinted handoff** writes. When the original node recovers, hints are delivered. Improves write availability at the cost of R+W>N guarantee not holding during partition.

#### Read Repair and Anti-Entropy

- **Read repair:** On a read, client sends write to any replica returning stale data (detected by version comparison). Lazy; only fixes data that is read.
- **Anti-entropy process:** Background process continuously compares replicas using **Merkle trees** (hash trees over key ranges) and syncs missing updates. Proactive; fixes cold data.

**Example 9 — Replication lag in analytics:** OLAP query runs against replica. Replica is 30 seconds behind. Report shows yesterday's numbers as if today. Fix: use read timestamp + lag threshold; reject or warn if replica lag > acceptable window.

**Example 10 — Failover scenarios and split-brain:**
- **Automatic failover:** On leader failure, election (Raft, Paxos, or simple timeout) promotes a follower. Risk: if async replication, new leader may be missing writes the old leader acknowledged → data loss or inconsistency with clients that cached old data.
- **Split-brain:** Network partition causes two nodes to both believe they are leader. Both accept writes. When partition heals, conflicting writes must be resolved. STONITH (Shoot The Other Node In The Head) fencing prevents split-brain at cost of availability.
- **Detection:** Use epoch numbers / generation counters (fencing tokens). Any node with a lower epoch must reject write requests — even if it thinks it is leader.

---

### Replication Lag and Consequences

Replication lag = time between a write being applied on leader and being visible on follower.

Causes: follower is slow, network is slow, follower is replaying large transactions, follower is under read load.

Consequences:
- Read-your-writes violations
- Stale cache hits after invalidation
- Incorrect monitoring dashboards
- Analytics on stale data
- Event sourcing replay from stale replica missing recent events

Measurement: \`pg_stat_replication\` view on Postgres primary shows \`sent_lsn\`, \`write_lsn\`, \`flush_lsn\`, \`replay_lsn\` per standby. Lag = \`pg_wal_lsn_diff(sent_lsn, replay_lsn)\` bytes, or \`write_lag\` / \`flush_lag\` / \`replay_lag\` time columns (Postgres 10+).
`,

    why: `## Why Database Replication Matters in Production

1. **High Availability / Failover:** Primary goes down → promote replica in seconds. Without replication, any primary failure = downtime. Instagram, Stripe, GitHub all use primary-replica setups with automatic failover (Patroni, PgBouncer, ProxySQL).

2. **Read Scalability:** A single Postgres primary can handle ~10k QPS on reads. Add 3 replicas, distribute reads → effectively 4x read throughput. Twitter routes timeline reads to replicas; writes only touch primary.

3. **Geographic Distribution (Low Latency):** Replicate data to datacenters in US, EU, APAC. Users in Tokyo read from a Tokyo replica (2ms) instead of hitting US primary (150ms). Multi-leader or async follower per region.

4. **Disaster Recovery (DR):** Cross-region replica in cold standby. If entire AWS us-east-1 region goes down, promote replica in us-west-2. RPO (Recovery Point Objective) determined by replication lag at time of failure.

5. **Analytics / Reporting Isolation:** Run heavy OLAP queries on a dedicated replica to avoid impacting production OLTP workload. Netflix runs ETL jobs against read replicas; primary never sees analytical query load.

6. **Change Data Capture (CDC) / Event Streaming:** Debezium captures MySQL binlog / Postgres WAL to publish domain events to Kafka. Downstream microservices subscribe without any application-level change to the writer. LinkedIn's Databus pioneered this pattern.

7. **Zero-Downtime Schema Migrations:** Apply schema change on replica first. Verify. Promote. Old primary becomes replica. Reverse the process. GitHub's gh-ost tool uses replica lag-aware binlog tailing to safely migrate production tables.

8. **Backup Without Impacting Primary:** Take consistent base backup (\`pg_basebackup\`) from a replica. No performance hit on primary. Continuous WAL archiving to S3 from replica for point-in-time recovery (PITR).

9. **Blue/Green and Canary Deployments:** New application version reads from promoted replica while old version still on primary. Validate data access patterns before full cutover.

10. **Regulatory / Compliance Data Residency:** EU GDPR requires EU user data to stay in EU. Replicate only EU-partitioned data to EU datacenter replica. Global primary in US; EU replica holds EU subset with strict network boundaries.
`,

    example: {
      language: "go",
      code: `package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// DBCluster routes writes to primary, reads to replica with lag detection.
type DBCluster struct {
	primary     *sql.DB
	replica     *sql.DB
	maxLagBytes int64 // bytes of replication lag considered acceptable
}

func NewDBCluster(primaryDSN, replicaDSN string, maxLagBytes int64) (*DBCluster, error) {
	primary, err := sql.Open("postgres", primaryDSN)
	if err != nil {
		return nil, fmt.Errorf("primary open: %w", err)
	}
	primary.SetMaxOpenConns(25)
	primary.SetConnMaxLifetime(5 * time.Minute)

	replica, err := sql.Open("postgres", replicaDSN)
	if err != nil {
		return nil, fmt.Errorf("replica open: %w", err)
	}
	replica.SetMaxOpenConns(50) // replicas handle more read traffic
	replica.SetConnMaxLifetime(5 * time.Minute)

	return &DBCluster{primary: primary, replica: replica, maxLagBytes: maxLagBytes}, nil
}

// replicaLagBytes queries pg_stat_replication on primary to measure replica lag.
// Returns lag in bytes; -1 if replica not found (failover scenario).
func (c *DBCluster) replicaLagBytes(ctx context.Context) (int64, error) {
	var lag sql.NullInt64
	err := c.primary.QueryRowContext(ctx, `
		SELECT pg_wal_lsn_diff(sent_lsn, replay_lsn)
		FROM pg_stat_replication
		ORDER BY replay_lsn ASC
		LIMIT 1
	`).Scan(&lag)
	if err == sql.ErrNoRows {
		return -1, nil // no replicas connected
	}
	if err != nil {
		return 0, err
	}
	if !lag.Valid {
		return 0, nil
	}
	return lag.Int64, nil
}

// ReadDB returns the appropriate DB for read queries.
// Falls back to primary if replica lag exceeds threshold or replica is unreachable.
func (c *DBCluster) ReadDB(ctx context.Context) *sql.DB {
	lag, err := c.replicaLagBytes(ctx)
	if err != nil {
		log.Printf("lag check error, falling back to primary: %v", err)
		return c.primary
	}
	if lag < 0 {
		log.Println("no replica connected, using primary for reads")
		return c.primary
	}
	if lag > c.maxLagBytes {
		log.Printf("replica lag %d bytes exceeds max %d, routing read to primary", lag, c.maxLagBytes)
		return c.primary
	}
	return c.replica
}

// WriteDB always returns the primary.
func (c *DBCluster) WriteDB() *sql.DB {
	return c.primary
}

// Example: write a user record, then read it back with lag-aware routing.
func run(cluster *DBCluster) {
	ctx := context.Background()

	// WRITE — always goes to primary
	_, err := cluster.WriteDB().ExecContext(ctx,
		"INSERT INTO users (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name=$2, email=$3",
		42, "Alice", "alice@example.com",
	)
	if err != nil {
		log.Fatalf("write failed: %v", err)
	}
	log.Println("write committed to primary")

	// READ — routes to replica if lag acceptable, else primary
	db := cluster.ReadDB(ctx)
	var name, email string
	err = db.QueryRowContext(ctx, "SELECT name, email FROM users WHERE id=$1", 42).Scan(&name, &email)
	if err != nil {
		log.Fatalf("read failed: %v", err)
	}
	log.Printf("read result: name=%s email=%s", name, email)
}

func main() {
	cluster, err := NewDBCluster(
		"postgres://app:secret@primary-host:5432/mydb?sslmode=require",
		"postgres://app:secret@replica-host:5432/mydb?sslmode=require",
		1024*1024, // 1 MB max acceptable lag
	)
	if err != nil {
		log.Fatal(err)
	}
	run(cluster)
}`,
      notes: "WriteDB() always returns the primary connection pool. ReadDB() checks live replication lag via pg_stat_replication; if lag exceeds threshold or replica is disconnected, falls back to primary. Connection pools are sized separately — replica pool is larger because it handles read-heavy traffic. In production, wrap replicaLagBytes with a short cache (e.g., 1s TTL) to avoid one lag-check query per application read query."
    },

    interview: [
      {
        q: "What is the difference between synchronous and asynchronous replication? When would you choose each?",
        a: "In synchronous replication, the primary waits for at least one follower to confirm it has written the data to durable storage before acknowledging the write to the client. This guarantees zero data loss on failover — the promoted follower has every committed write. The cost: if the synchronous follower is slow or unreachable, every write blocks. In asynchronous replication, the primary acknowledges the client immediately after local write, then ships the log in the background. Latency is low and availability is high, but if the primary crashes before the follower catches up, acknowledged writes are lost. Choose synchronous when data loss is unacceptable (financial transactions, user-facing records). Choose async when you need high throughput and low latency and can tolerate a small RPO (e.g., analytics, caches). PostgreSQL's semi-synchronous mode (synchronous_standby_names) is a common middle ground: one standby is sync, others are async."
      },
      {
        q: "Explain the read-your-writes consistency problem in replication and how to solve it.",
        a: "After a user submits a write (e.g., updates their profile), their next read hits an async replica that hasn't yet replayed that write. The user sees stale data and thinks their update was lost. This is a read-your-writes (also called read-after-write) consistency violation. Solutions: (1) Route reads of data the current user recently modified to the primary for a short time window (e.g., 1 minute after last write). (2) Track the LSN (Log Sequence Number) of the user's last write; include it in the read request; only route to a replica if its replay_lsn ≥ that value, else go to primary. (3) Record write timestamps client-side; compare to replica lag estimate. (4) For simplicity, always route authenticated users' own-data reads to the primary. The key insight is: this guarantee only needs to hold for the writing user — other users reading the same data can still get eventual consistency from replicas."
      },
      {
        q: "What is replication lag and what are its consequences in production?",
        a: "Replication lag is the time delay between a write being committed on the primary and that write becoming visible on a replica. Causes: replica CPU/IO overloaded applying writes, large transactions holding up the apply queue (Postgres applies WAL serially on standby by default), network latency. Consequences: (1) Read-your-writes violations. (2) Stale cache reads — you invalidate a cache entry after writing, but the cache-warming read hits a lagging replica, caching stale data again. (3) Incorrect dashboards — analytics replica shows yesterday's aggregates. (4) Event sourcing — events replayed from lagging replica miss recent commands. (5) CDC pipelines see delayed events. Measurement in Postgres: pg_stat_replication.replay_lag column (Postgres 10+) gives wall-clock lag. Mitigation: monitor lag metrics, set alerting thresholds, use LSN-aware routing, tune max_wal_senders, enable logical replication parallelism, or use synchronous replication for critical paths."
      },
      {
        q: "What is CDC (Change Data Capture) and how does it use replication?",
        a: "CDC is a technique to capture every row-level change (INSERT, UPDATE, DELETE) in a database and stream those changes to downstream systems in real time. It piggybacks on the replication log rather than polling or application-level hooks. In MySQL, Debezium connects as a replica and reads the binlog (must be row-based format). In Postgres, it uses the logical replication protocol via a replication slot, which causes the primary to retain WAL until the consumer acknowledges it. The output is a stream of change events (before/after image of each row) published to Kafka. Consumers: Elasticsearch index sync, downstream microservices (outbox pattern), data warehouse ingestion, cache invalidation. Key risk: replication slots that fall behind cause WAL accumulation on the primary — disk can fill up. Always monitor slot lag and set max_slot_wal_keep_size. Debezium handles slot management and offset checkpointing."
      },
      {
        q: "Describe the failover and promotion process for a primary-replica Postgres setup. What can go wrong?",
        a: "Normal failover flow: (1) Detect primary failure (health check timeout, loss of heartbeat). (2) Verify it is truly dead — not just a network blip — to avoid split-brain. (3) Elect the most up-to-date replica (highest replay_lsn). (4) Promote it: pg_promote() or touch trigger file. (5) Update connection strings (via HAProxy, PgBouncer, DNS, or Patroni). (6) Other replicas repoint to new primary (pg_rewind if needed). What can go wrong: (a) Data loss — async replica promoted with unflushed writes; clients think data was committed but it is gone. (b) Split-brain — old primary restarts, now two nodes accept writes; use STONITH fencing or epoch/fencing tokens to prevent this. (c) Too-fast failover — flapping on transient network issues; add a confirmation delay. (d) Application connection storms — all apps reconnect simultaneously on new primary. (e) Replica can't find its new upstream position — pg_rewind rewrites diverged timeline. Tools: Patroni (etcd-based leader election), repmgr, AWS RDS Multi-AZ (automatic managed failover)."
      },
      {
        q: "What is split-brain in replication and how do you prevent it?",
        a: "Split-brain occurs when a network partition causes two nodes to simultaneously believe they are the primary/leader, both accepting writes independently. When the partition heals, conflicting writes from both sides must be reconciled — and often one side's writes are silently discarded. Prevention strategies: (1) STONITH (Shoot The Other Node In The Head) — when a node suspects split-brain, it fences (powers off or network-isolates) the other node via out-of-band management (IPMI, cloud API) before promoting. (2) Fencing tokens (epoch numbers) — every new primary increments a monotonically increasing epoch. Storage layer and downstream clients reject any request from a node with an older epoch, even if it thinks it is primary. (3) Quorum-based leader election (Raft, Paxos, etcd) — leader can only be elected if a majority of nodes agree. A minority partition cannot elect a leader at all, sacrificing availability for safety. (4) DCS (Distributed Configuration Store) — Patroni uses etcd/ZooKeeper/Consul as the arbiter; leader must hold a DCS lock to accept writes; if it loses the lock, it immediately demotes itself."
      },
      {
        q: "Explain quorum reads and writes in leaderless replication. With N=5, W=3, R=3, what guarantees do you get?",
        a: "In leaderless replication (Dynamo-style: Cassandra, Riak, DynamoDB), there is no single leader. Writes are sent to all N replicas in parallel; a write succeeds when W replicas acknowledge. Reads are sent to R replicas; the client takes the value with the highest version. Guarantee: if W + R > N, at least one replica is in both the write set and read set, so the read will always see the most recent write (under no failures or concurrent operations). With N=5, W=3, R=3: W+R=6 > 5 ✓. The system tolerates 2 unavailable nodes on writes and 2 on reads. For strong consistency you want W+R > N. Setting W=1, R=5 maximizes write availability. Setting W=5, R=1 maximizes read performance after all writes confirmed. Trade-offs: even with W+R>N, concurrent writes (last-write-wins) and sloppy quorums break the guarantee. Cassandra's QUORUM consistency level implements N=replication_factor, W=R=majority."
      },
      {
        q: "How does PostgreSQL WAL-based streaming replication work internally?",
        a: "WAL (Write-Ahead Log) is a sequential log of every change made to database pages, written before the change is applied. For replication: (1) Primary's WAL sender process opens a replication connection. (2) Standby's WAL receiver process connects and requests WAL from a given LSN. (3) Primary streams WAL records continuously; standby writes them to its own WAL. (4) Standby's startup process (recovery mode) continuously replays WAL records, applying page modifications. The standby is in hot-standby mode: readable but not writable. Physical streaming replication ships raw page-level changes (wal_level=replica). Logical replication (wal_level=logical) ships row-level change events via a replication slot + output plugin (pgoutput). Key parameters: wal_level, max_wal_senders, wal_keep_size (retain WAL if replica disconnects briefly), synchronous_standby_names (for sync replication), recovery_min_apply_delay (deliberately delay apply for protection against data corruption). LSN (Log Sequence Number) is the byte offset in the WAL stream — used to track progress."
      },
      {
        q: "What is eventual consistency and how does it relate to replication lag?",
        a: "Eventual consistency is a weak consistency guarantee: if no new writes are made to a data item, eventually all reads will return the same value. It does not specify how long 'eventually' takes. In async replication, after the primary writes a value, replicas will have inconsistent views until they catch up — this gap is replication lag. During that window, reads from different replicas may return different values (monotonic reads violation), and a user may not see their own write (read-your-writes violation). Eventual consistency is acceptable for many use cases: social media counts, DNS propagation, product catalog reads. It is not acceptable for: bank balances, inventory counts, anything with lost-update risks. The CAP theorem formalizes this: in the presence of a network Partition, you choose Consistency (always see latest write) or Availability (always get a response). Systems like Cassandra choose AP (available, eventually consistent). Systems like Postgres synchronous replication choose CP (consistent, may block on partition). PACELC extends CAP to capture latency vs consistency trade-off even when there is no partition."
      },
      {
        q: "How do multi-leader replication systems handle write conflicts? Compare LWW, CRDTs, and application-level resolution.",
        a: "Multi-leader write conflicts occur when two leaders accept concurrent writes to the same record. (1) Last-Write-Wins (LWW): Tag every write with a timestamp (wall clock or hybrid logical clock). On conflict, higher timestamp wins, lower is discarded. Simple, always converges, but silently drops data — concurrent writes are lossy. Cassandra uses LWW by default. Problem: NTP clock skew can cause newer writes to lose. (2) CRDTs (Conflict-free Replicated Data Types): Data structures with a mathematically defined merge function. G-Counter (grow-only counter): merge = max per node; PN-Counter (increment/decrement) = pair of G-Counters; OR-Set: add-wins set. Merges are commutative, associative, idempotent — any order of merging gives the same result. No conflicts by design, but limited semantics — you can't do arbitrary data structures. (3) Application-level resolution: System exposes both conflicting versions to the application code. Application implements domain-specific merge logic (e.g., shopping cart = union of items; document = operational transform; calendar = both events shown, user resolves). Most flexible, but requires application complexity. CouchDB uses this model. (4) Causal versioning with vector clocks: Track causality; if one write is causally dominated by another, use the dominator. Only truly concurrent writes surface as conflicts."
      }
    ],

    tradeoffs: {
      pros: [
        "High availability: replica promotion on primary failure reduces downtime to seconds (with sync replication, zero data loss).",
        "Read scalability: distribute read traffic across multiple replicas; each replica handles full read QPS independently.",
        "Geographic distribution: place replicas close to users in different regions for low-latency local reads.",
        "Disaster recovery: cross-region replica provides RPO measured in seconds (async) or zero (sync), far better than backup-restore.",
        "Analytics isolation: dedicated read replica absorbs heavy OLAP queries without impacting OLTP latency on primary.",
        "CDC and event streaming: WAL/binlog tailing enables reliable change streams to Kafka without application-level changes.",
        "Non-disruptive backups: take pg_basebackup from replica; primary is unaffected.",
        "Schema migration safety: test migration on replica first; promote when verified; minimizes migration-induced downtime.",
        "Leaderless replication (Dynamo): no single point of failure; tunable consistency vs availability per operation.",
        "Multi-leader replication: writes accepted in multiple datacenters without cross-DC round-trip; critical for latency in global apps."
      ],
      cons: [
        "Replication lag: async followers may be seconds to minutes behind primary; stale reads without careful routing.",
        "Read-your-writes violations: users see stale data after their own writes unless you implement LSN-aware routing or primary fallback.",
        "Failover complexity: automatic promotion risks data loss (async), split-brain, or incorrect cluster state without robust tooling (Patroni, STONITH).",
        "Multi-leader conflicts: concurrent writes to same record require conflict resolution strategy; LWW silently drops data.",
        "Replication slot risk (Postgres logical replication): if consumer falls behind, primary retains WAL indefinitely — disk exhaustion possible.",
        "Increased write amplification: every write must be replicated N times; network bandwidth and follower I/O costs scale with replica count.",
        "Leaderless quorum latency: waiting for W out of N replicas on write increases tail latency; slow replicas delay responses.",
        "Operational complexity: monitoring lag, managing failover, maintaining replication topology requires dedicated tooling and on-call runbooks.",
        "Sloppy quorum weakens guarantees: during partition, reads may not see the latest write even with W+R>N configured.",
        "Cross-datacenter async replication: network partitions between DCs can cause divergence; reconciliation after healing is complex."
      ],
      when: "Use leader-follower async replication for most production OLTP systems where read scale and DR are needed and small RPO is acceptable. Add synchronous standby when zero data loss is required (financial, medical). Use multi-leader only when multiple datacenter write availability without cross-DC latency is a hard requirement and you accept conflict complexity. Use leaderless Dynamo-style (Cassandra) for globally distributed, high-write-throughput workloads where you tune consistency per operation. Never replicate without lag monitoring — unmonitored lag is invisible until it causes an incident."
    },

    gotchas: [
      "Replication slot bloat: A Postgres logical replication slot retains WAL from the slot's confirmed_flush_lsn. If the consumer (Debezium, logical subscriber) stops or falls behind, WAL accumulates indefinitely. Primary disk fills up and crashes — taking down production. Always set max_slot_wal_keep_size and monitor pg_replication_slots.wal_status = 'lost'.",
      "Clock skew breaks LWW: Multi-leader and Cassandra LWW rely on timestamps to resolve conflicts. NTP drift between nodes (even a few milliseconds) causes newer writes to lose. Use Hybrid Logical Clocks (HLC) or client-side monotonic sequences instead of wall clocks for LWW.",
      "Promoted replica diverges timeline: In Postgres, if the old primary restarts after a failover, it has a diverged WAL timeline from the new primary. Any replica that was replicating from the old primary must use pg_rewind to rebase before joining the new primary — otherwise it is stuck on an orphaned timeline and can never catch up.",
      "Asynchronous failover data loss is invisible to clients: Client received a 200 OK for a write. Primary crashed before replicating that write. Replica is promoted. The write is gone. Client has no way to know — the application must implement idempotent retries with server-side deduplication (idempotency keys) if zero data loss is required but sync replication is too slow.",
      "Replica reads break REPEATABLE READ transactions: A long-running read transaction on a replica holds a snapshot. Postgres must retain old row versions (HOT chains) for that snapshot — even after vacuum runs on the primary — because the standby's oldest active xmin pins the snapshot. Heavy read transactions on standbys cause table bloat on the primary via the standby's feedback mechanism (hot_standby_feedback = on).",
      "Sloppy quorum silently breaks R+W>N guarantee: In Cassandra during a node failure or ring topology change, writes can go to hint nodes outside the normal replica set. Those hints are not counted in the quorum calculation for subsequent reads. A read with QUORUM may miss a recent write that only exists as a hint on a non-replica node. Always monitor hint handoff queues and set hinted_handoff_enabled = false for strict consistency requirements."
    ]
  };
  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
