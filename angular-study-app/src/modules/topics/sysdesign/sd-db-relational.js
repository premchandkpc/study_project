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
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var bTree = document.createElement('button'); bTree.textContent = 'Animate Insert'; bTree.style.cssText = btnStyle;
    var bAcid = document.createElement('button'); bAcid.textContent = 'Show ACID'; bAcid.style.cssText = btnStyle;
    btns.appendChild(bTree); btns.appendChild(bAcid);
    wrap.appendChild(btns);

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var mode = 'btree';
    var step = 0; // 0=initial, 1=insert highlight, 2=full split
    var acidStep = 0; // 0-3
    var raf;

    function drawRoundRect(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function drawNode(x, y, keys, highlight) {
      var w = keys.length * 52 + 8;
      drawRoundRect(x - w/2, y, w, 34, 5, '#161b22', highlight || '#30363d');
      keys.forEach(function(k, i) {
        var kx = x - w/2 + 8 + i * 52;
        ctx.fillStyle = k === '25' ? '#ffa657' : '#58a6ff';
        ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText(k, kx + 18, y + 22);
        if (i < keys.length - 1) {
          ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(kx + 44, y + 4); ctx.lineTo(kx + 44, y + 30); ctx.stroke();
        }
      });
    }

    function drawBtree() {
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      ctx.fillStyle = '#8b949e'; ctx.font = '12px monospace'; ctx.textAlign = 'center';

      if (step === 0) {
        // Initial node [10, 20, 30]
        ctx.fillText('B-Tree Node (max 3 keys) — INSERT 25', 230, 24);
        drawNode(230, 60, ['10','20','30'], '#30363d');
        ctx.fillStyle = '#ffa657'; ctx.font = '12px monospace';
        ctx.fillText('← Insert key 25: node is FULL → split needed', 230, 120);
        ctx.fillStyle = '#8b949e'; ctx.font = '11px monospace';
        ctx.fillText('Click "Animate Insert" to see B-tree split', 230, 145);
      } else if (step === 1) {
        ctx.fillStyle = '#ffa657';
        ctx.fillText('Node FULL! Splitting: middle key 20 rises to parent', 230, 24);
        drawNode(230, 55, ['10','20','25','30'], '#ffa657');
        ctx.font = '11px monospace'; ctx.fillStyle = '#8b949e';
        ctx.fillText('← All 4 keys temporarily in node before split →', 230, 112);
      } else if (step === 2) {
        ctx.fillStyle = '#3fb950';
        ctx.fillText('Split complete! 20 → parent, [10] left, [25,30] right', 230, 24);
        // Parent node
        drawNode(230, 50, ['20'], '#3fb950');
        // Left child
        drawNode(120, 130, ['10'], '#58a6ff');
        // Right child
        drawNode(340, 130, ['25','30'], '#58a6ff');
        // Lines from parent to children
        ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(210, 84); ctx.lineTo(140, 130); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(252, 84); ctx.lineTo(320, 130); ctx.stroke();
        // Labels
        ctx.fillStyle = '#58a6ff'; ctx.font = '11px monospace';
        ctx.fillText('Left child', 120, 180);
        ctx.fillText('Right child', 340, 180);
        ctx.fillStyle = '#3fb950';
        ctx.fillText('Parent', 230, 45);
      }
    }

    var acidLabels = [
      {name:'ATOMICITY', icon:'⚛', color:'#58a6ff', desc:'All ops commit or all rollback'},
      {name:'CONSISTENCY', icon:'✓', color:'#3fb950', desc:'Valid state → valid state'},
      {name:'ISOLATION', icon:'🔒', color:'#ffa657', desc:'Concurrent txns appear sequential'},
      {name:'DURABILITY', icon:'💾', color:'#bc8cff', desc:'Committed data survives crash'}
    ];

    var acidAnimFrame = 0;

    function drawAcid() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('INSERT Transaction — ACID Checks', 230, 22);

      var boxW = 90, boxH = 70, startX = 20, gapX = 10, y = 50;
      acidLabels.forEach(function(a, i) {
        var x = startX + i * (boxW + gapX);
        var active = i <= acidStep;
        drawRoundRect(x, y, boxW, boxH, 6, active ? '#161b22' : '#0d1117', active ? a.color : '#30363d');
        ctx.fillStyle = active ? a.color : '#30363d';
        ctx.font = '20px monospace'; ctx.textAlign = 'center';
        ctx.fillText(a.icon, x + boxW/2, y + 28);
        ctx.font = 'bold 9px monospace';
        ctx.fillText(a.name, x + boxW/2, y + 44);
        if (i < acidLabels.length - 1) {
          ctx.strokeStyle = active && i < acidStep ? '#3fb950' : '#30363d';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + boxW + 1, y + boxH/2); ctx.lineTo(x + boxW + gapX - 1, y + boxH/2); ctx.stroke();
          ctx.fillStyle = active && i < acidStep ? '#3fb950' : '#30363d';
          ctx.font = '12px monospace';
          ctx.fillText('→', x + boxW + gapX/2, y + boxH/2 + 5);
        }
        if (active) {
          ctx.fillStyle = '#3fb950'; ctx.font = 'bold 16px monospace';
          ctx.fillText('✓', x + boxW - 14, y + 14);
        }
      });

      // Description of current step
      if (acidStep < acidLabels.length) {
        var cur = acidLabels[acidStep];
        drawRoundRect(20, 138, 420, 44, 6, '#161b22', cur.color);
        ctx.fillStyle = cur.color; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
        ctx.fillText(cur.name + ':', 32, 158);
        ctx.fillStyle = '#e6edf3'; ctx.font = '11px monospace';
        ctx.fillText(cur.desc, 32, 174);
      } else {
        drawRoundRect(20, 138, 420, 44, 6, '#161b22', '#3fb950');
        ctx.fillStyle = '#3fb950'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('All ACID checks passed — Transaction COMMITTED ✓', 230, 165);
      }

      // Animated INSERT packet travelling through boxes
      acidAnimFrame++;
      var progress = (acidAnimFrame % 90) / 90;
      var totalW = 4 * (boxW + gapX) - gapX;
      var px = startX + progress * totalW;
      var activeBox = Math.min(3, Math.floor(progress * 4));
      ctx.beginPath();
      ctx.arc(px, y + boxH + 16, 7, 0, Math.PI*2);
      ctx.fillStyle = acidLabels[activeBox].color; ctx.fill();
      ctx.fillStyle = '#0d1117'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('TX', px, y + boxH + 19);

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('INSERT transaction packet flowing through ACID checks', 230, y + boxH + 40);

      // Detailed descriptions
      var details = [
        'ATOMICITY: If any step fails, entire INSERT rolls back — no partial writes',
        'CONSISTENCY: Foreign key constraints & NOT NULL checks enforced on commit',
        'ISOLATION: Concurrent INSERTs cannot see each other (READ COMMITTED default)',
        'DURABILITY: WAL flushed to disk (fsync) before commit ACK returned to app'
      ];
      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      details.forEach(function(d, i) {
        ctx.fillStyle = i <= acidStep ? '#e6edf3' : '#30363d';
        ctx.fillText(d, 20, 210 + i * 16);
      });

      raf = requestAnimationFrame(drawAcid);
    }

    bTree.addEventListener('click', function() {
      mode = 'btree';
      if (raf) cancelAnimationFrame(raf);
      step = (step + 1) % 3;
      drawBtree();
    });
    bAcid.addEventListener('click', function() {
      if (mode !== 'acid') { mode = 'acid'; acidStep = 0; acidAnimFrame = 0; drawAcid(); }
      else { acidStep = (acidStep + 1) % (acidLabels.length + 1); }
    });

    drawBtree();
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
