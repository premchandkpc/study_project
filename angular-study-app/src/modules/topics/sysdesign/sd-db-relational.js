(function() {
  var topic = {
  id:"sd-db-relational", area:"sysdesign",
  title:"Relational DBs — ACID, Indexing & Query Planning",
  tag:"Database", tags:["sql","postgres","mysql","acid","btree","index","query planner","normalization"],
  concept:`**ACID properties:**
- **Atomicity** — all statements in a transaction commit or all roll back
- **Consistency** — transaction brings DB from one valid state to another (constraints, foreign keys enforced)
- **Isolation** — concurrent transactions appear sequential. Isolation levels: READ UNCOMMITTED < READ COMMITTED < REPEATABLE READ < SERIALIZABLE
- **Durability** — committed data survives crashes (WAL — Write-Ahead Log flushed to disk before commit ACK)

**Isolation level trade-offs:**
| Level | Dirty Read | Non-repeatable Read | Phantom Read | Performance |
|---|---|---|---|---|
| Read Uncommitted | ✓ | ✓ | ✓ | Fastest |
| Read Committed | ✗ | ✓ | ✓ | Good (PG default) |
| Repeatable Read | ✗ | ✗ | ✓ | Moderate (MySQL default) |
| Serializable | ✗ | ✗ | ✗ | Slowest |

**B-Tree index:** default index type. O(log N) lookup, range scans efficient, good for equality + ORDER BY.
**Hash index:** O(1) point lookup, no range scans (PostgreSQL heap AM only).
**GIN index:** inverted index for JSONB, arrays, full-text search.
**BRIN index:** block range index, tiny footprint, good for append-only time-series tables.
**Partial index:** \`CREATE INDEX ON orders(user_id) WHERE status='PENDING'\` — tiny, fast for filtered queries.

**Query planner:** EXPLAIN ANALYZE shows plan (seq scan, index scan, bitmap heap scan, nested loop, hash join, merge join). The planner uses table statistics (ANALYZE) to estimate row counts.`,
  why:`70% of backend performance issues trace to missing or wrong indexes. Understanding the planner is essential for debugging slow queries in production.`,
  example:{
    language:"java",
    code:`// Spring Data JPA — indexing and query optimization
@Entity
@Table(name = "orders",
    indexes = {
        @Index(name = "idx_orders_user_status",
               columnList = "user_id, status"),   // composite index
        @Index(name = "idx_orders_created_at",
               columnList = "created_at DESC")     // for ORDER BY created_at DESC
    }
)
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(precision = 12, scale = 2)
    private BigDecimal total;
}

// Repository — use projections to avoid SELECT *
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Uses idx_orders_user_status
    List<OrderSummary> findByUserIdAndStatus(Long userId, OrderStatus status);

    // Pagination to avoid full table scan
    @Query("SELECT o FROM Order o WHERE o.userId = :uid ORDER BY o.createdAt DESC")
    Page<Order> findRecentByUser(@Param("uid") Long userId, Pageable pageable);

    // COUNT using index only (covering index)
    long countByUserIdAndStatus(Long userId, OrderStatus status);
}

// Projection interface — SELECT only needed columns
interface OrderSummary {
    Long getId();
    OrderStatus getStatus();
    BigDecimal getTotal();
}`,
    notes:"Always run EXPLAIN ANALYZE in staging before deploying queries that touch large tables. Composite index column order matters: put the most selective column first for range queries."
  },
  interview:[
    {question:"When would you denormalize a database schema?",
     answer:`Normalisation (3NF) eliminates redundancy and ensures consistency. Denormalization intentionally adds redundancy for read performance.\n\n**Denormalize when:**\n- JOIN cost is too high at scale (millions of rows × multiple tables)\n- Read-to-write ratio is very high (reporting, analytics)\n- Aggregates are pre-computed (daily order counts cached in user table)\n\n**Techniques:**\n- Duplicate column to avoid JOIN (\`user_email\` on orders table)\n- Pre-compute aggregates (\`order_count\` on users table, updated by trigger)\n- Materialized views (auto-maintained in PostgreSQL)\n\n**Risk:** update anomalies — duplicated data must be kept in sync.`,
     followUps:["What is a covering index?","How does MVCC (Multi-Version Concurrency Control) work in PostgreSQL?"]
    },
    {question:"What causes a sequential scan when an index exists?",
     answer:`The query planner chooses seq scan when it estimates that reading the index + heap fetches costs MORE than a full table scan. This happens when:\n1. **Low selectivity** — query matches >10-20% of rows; seq scan amortises better\n2. **Stale statistics** — ANALYZE not run after large data change; planner underestimates row count\n3. **Function on indexed column** — \`WHERE LOWER(email) = ...\` can't use index on \`email\`; use functional index instead\n4. **Type mismatch** — comparing \`VARCHAR\` column to \`INTEGER\` literal forces cast, skips index`,
     followUps:["How do you force PostgreSQL to use an index?","What is the difference between index scan and bitmap heap scan?"]
    }
  ],
  tradeoffs:{
    pros:["ACID guarantees for financial/transactional data","Rich query language — complex aggregations, JOINs","Mature ecosystem — replication, backup, monitoring"],
    cons:["Vertical scaling has ceiling","Schema migrations on large tables require downtime (use pg_repack / online DDL)","Joins across shards are expensive or impossible"],
    when:"Default choice for transactional data (orders, users, payments). Move to NoSQL only when you need horizontal write scaling, flexible schema, or specific access patterns (time-series, document, graph)."
  },
  visual: {
    type: 'layered',
    title: '🗄️ Relational DB Internals — Query to Disk',
    layers: [
      {
        id: 'client',
        label: '👤 Client Layer',
        color: '#58a6ff',
        protocols: 'JDBC / psql / HTTP',
        services: [
          { id: 'app',    label: 'Application',   icon: '💻', hint: 'Spring Boot / JDBC' },
          { id: 'pool',   label: 'Conn Pool',      icon: '🔗', hint: 'HikariCP — max 20 conns' }
        ]
      },
      {
        id: 'query',
        label: '🧠 Query Layer',
        color: '#ffa657',
        protocols: 'SQL → Logical Plan',
        services: [
          { id: 'parser',    label: 'Parser',     icon: '📝', hint: 'Tokenize & validate SQL' },
          { id: 'rewriter',  label: 'Rewriter',   icon: '🔄', hint: 'Expand views, apply rules' },
          { id: 'planner',   label: 'Optimizer',  icon: '⚡', hint: 'Cost-based: seq vs index scan' },
          { id: 'executor',  label: 'Executor',   icon: '▶️',  hint: 'Execute chosen plan' }
        ]
      },
      {
        id: 'storage',
        label: '📦 Storage Layer',
        color: '#3fb950',
        protocols: 'Page I/O (8KB)',
        services: [
          { id: 'bufpool',  label: 'Buffer Pool',  icon: '🏎️',  hint: 'LRU cache of 8KB pages in RAM' },
          { id: 'btree',    label: 'B-Tree Index', icon: '🌳', hint: 'O(log N) lookup, range scan' },
          { id: 'heap',     label: 'Heap Files',   icon: '📋', hint: 'Actual table rows (8KB pages)' },
          { id: 'mvcc',     label: 'MVCC',         icon: '👁️',  hint: 'Snapshot isolation per txn' }
        ]
      },
      {
        id: 'durability',
        label: '💾 Durability Layer',
        color: '#bc8cff',
        protocols: 'WAL streaming / fsync',
        services: [
          { id: 'wal',      label: 'WAL',          icon: '📜', hint: 'Write-Ahead Log — crash recovery' },
          { id: 'primary',  label: 'Primary DB',   icon: '🗄️', hint: 'All writes land here' },
          { id: 'replica',  label: 'Read Replica', icon: '📡', hint: 'Async WAL streaming ~10ms lag' },
          { id: 'vacuum',   label: 'VACUUM',       icon: '🧹', hint: 'Reclaim dead MVCC tuples' }
        ]
      }
    ],
    flows: [
      {
        name: '📖 Read Query',
        path: ['app', 'pool', 'parser', 'planner', 'executor', 'bufpool', 'btree'],
        color: '#58a6ff'
      },
      {
        name: '✏️ Write Transaction',
        path: ['app', 'pool', 'parser', 'executor', 'bufpool', 'wal', 'primary', 'replica'],
        color: '#3fb950'
      },
      {
        name: '🐢 Slow Query (seq scan)',
        path: ['app', 'pool', 'parser', 'planner', 'executor', 'heap'],
        color: '#f85149'
      }
    ]
  },
  architecture:{
    title:"Relational DB — Read/Write Architecture",
    caption:"Primary handles writes; replicas scale reads; connection pool manages connections",
    lanes:[
      {label:"Application",nodes:[
        {id:"app",label:"App Server",hint:"Business logic"},
        {id:"pool",label:"Connection Pool",badge:"HikariCP",hint:"Max 10-20 connections per instance",detail:"HikariCP pools DB connections. Creating a DB connection is expensive (~50ms). Pool reuses connections, bounding max concurrent queries."}
      ]},
      {label:"Database",nodes:[
        {id:"primary",label:"Primary (Write)",hint:"All writes go here",detail:"Receives all INSERT/UPDATE/DELETE. Writes WAL to disk before ACK. Streams WAL to replicas."},
        {id:"replica1",label:"Read Replica 1",hint:"Async replication ~10ms lag",detail:"Streams WAL from primary. Lag is typically <100ms. Use for read-heavy queries, reports, analytics."},
        {id:"replica2",label:"Read Replica 2",hint:"Cross-AZ for HA",detail:"Second replica in different availability zone. Automatic failover promoted to primary on primary failure."}
      ]},
      {label:"Storage",nodes:[
        {id:"wal",label:"WAL",badge:"fsync",hint:"Write-Ahead Log",detail:"Every transaction writes to WAL first. Enables crash recovery and replication. fsync ensures durability."},
        {id:"heap",label:"Heap Files",hint:"Actual table data (pages of 8KB)",detail:"Tables stored as 8KB pages. Indexes stored separately. VACUUM reclaims dead tuples from MVCC."}
      ]}
    ],
    links:[
      {from:"app",to:"pool",label:"getConnection()",detail:"App requests connection from pool; pool returns idle or blocks up to timeout.",type:"sync"},
      {from:"pool",to:"primary",label:"Writes",detail:"INSERT/UPDATE/DELETE routed to primary.",type:"sync"},
      {from:"pool",to:"replica1",label:"Reads",detail:"SELECT queries routed to replicas via read routing (Spring @Transactional(readOnly=true)).",type:"sync"},
      {from:"primary",to:"wal",label:"WAL write (fsync)",detail:"Transaction data written to WAL. Commit ACK only after WAL fsync.",type:"sync"},
      {from:"primary",to:"replica1",label:"WAL streaming",detail:"Replicas connect to primary WAL sender; replays changes async.",type:"async"},
      {from:"primary",to:"replica2",label:"WAL streaming",detail:"Cross-AZ replica for failover.",type:"async"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
