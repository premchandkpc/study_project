(function() {
  var topic = {
  id:"sd-db-nosql", area:"sysdesign",
  title:"NoSQL — Document, Key-Value & Wide-Column",
  tag:"Database", tags:["mongodb","dynamodb","cassandra","redis","nosql","document","wide column","key value"],
  concept:`**NoSQL** databases sacrifice some relational guarantees for horizontal scalability, flexible schemas, and specific access-pattern optimisation.

**Key-Value (Redis, DynamoDB, etcd):**
- Get/Put/Delete by key — O(1)
- No query language; you must know the key
- Perfect for sessions, caches, feature flags, leaderboards
- DynamoDB adds secondary indexes (GSI/LSI) for alternate access patterns

**Document (MongoDB, CouchDB, Firestore):**
- Store JSON-like documents, nested structures allowed
- Rich query language — filter, project, aggregate
- Schema-flexible — each document can have different fields
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
- Automatic retention policies, downsampling`,
  why:`Choosing the right NoSQL type is a critical design decision. The wrong choice (MongoDB for time-series, Cassandra for random writes without design) leads to catastrophic performance at scale.`,
  example:{
    language:"java",
    code:`// MongoDB with Spring Data — flexible document model
@Document(collection = "products")
public class Product {
    @Id
    private String id;

    @Indexed
    private String category;

    private String name;
    private Map<String, Object> attributes; // flexible schema
    private List<String> tags;

    @Indexed(expireAfterSeconds = 3600) // TTL index!
    private Date cacheExpiry;
}

// Repository with aggregation pipeline
public interface ProductRepository extends MongoRepository<Product, String> {

    // Uses category index
    List<Product> findByCategoryAndTagsContaining(String category, String tag);

    // Aggregation — group by category, count, avg price
    @Aggregation(pipeline = {
        "{ $match: { status: 'ACTIVE' } }",
        "{ $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } }",
        "{ $sort: { count: -1 } }"
    })
    List<CategoryStats> getCategoryStats();
}

// ─── Cassandra — wide-column for time-series events ───
// Table designed for query: "get events for user X in time range"
// PRIMARY KEY ((user_id), event_time) -- partition by user, cluster by time
@Table("user_events")
public class UserEvent {
    @PrimaryKeyColumn(type = PrimaryKeyType.PARTITIONED)
    private UUID userId;

    @PrimaryKeyColumn(type = PrimaryKeyType.CLUSTERED,
                      ordering = Ordering.DESCENDING)
    private Instant eventTime;

    private String eventType;
    private Map<String, String> metadata;
}`,
    notes:"In Cassandra, design tables around queries not entities. One query pattern = one table. Denormalization is expected."
  },
  interview:[
    {question:"How does DynamoDB achieve single-digit millisecond latency at any scale?",
     answer:`DynamoDB is a managed key-value/document store with several architectural decisions for consistent latency:\n\n1. **Partition key hashing** — data is spread across partitions by consistent hashing. Reads/writes go to a single partition.\n2. **SSD storage** — all data on NVMe SSDs.\n3. **Request routing** — each request routed to the correct partition without scanning.\n4. **Leaderless replication** — 3 replicas per partition using Paxos. A write is acknowledged after 2/3 replicas confirm (quorum write).\n5. **No complex queries** — DynamoDB rejects table scans; you must design with access patterns in mind.\n\n**Cost of this speed:** no JOINs, no aggregations, no arbitrary filters without GSI.`,
     followUps:["What is a hot partition in DynamoDB and how do you fix it?","When would you use a GSI vs LSI in DynamoDB?"]
    },
    {question:"Compare MongoDB and Cassandra. When would you choose each?",
     answer:`**MongoDB:**\n- Rich query language (aggregation pipeline, $lookup, text search)\n- Document model — nested arrays/objects natural for product catalogs, CMS\n- Mutable documents — updates, upserts\n- Choose for: catalogs, user profiles, CMS, geospatial queries\n\n**Cassandra:**\n- Write-optimized — append-only log-structured merge (LSM) tree\n- Masterless — any node accepts writes; tunable consistency\n- Designed for time-series and high-write IoT workloads\n- No UPDATE in the traditional sense — new tombstone + new write\n- Choose for: IoT event streams, audit logs, time-series metrics, chat message history\n\n**Key difference:** MongoDB optimises for flexible read queries. Cassandra optimises for write throughput and predictable high-volume time-series.`,
     followUps:["What is an LSM tree and how does it enable fast writes?"]
    }
  ],
  tradeoffs:{
    pros:["Horizontal write scaling (Cassandra/DynamoDB)","Flexible schema (MongoDB)","Specialised performance for specific access patterns"],
    cons:["Eventual consistency complexity","No cross-document transactions (until MongoDB 4+)","Schema design is harder — query-first design required for Cassandra"],
    when:"Key-value for caches/sessions. Document for catalogs/profiles. Wide-column for time-series/events. Relational first unless you have a specific scaling or schema-flexibility need."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var bPlay = document.createElement('button'); bPlay.textContent = '▶ Play'; bPlay.style.cssText = btnStyle;
    var bReset = document.createElement('button'); bReset.textContent = '↺ Reset'; bReset.style.cssText = btnStyle;
    btnRow.appendChild(bPlay); btnRow.appendChild(bReset);
    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var lanes = [
      {
        label: 'Document', db: 'MongoDB', color: '#ffa657',
        query: 'db.find({city:"NYC"})',
        docText: ['{ _id: "u1",', '  name: "Alice",', '  tags: ["nyc","dev"] }'],
        badge: 'Flexible schema · Rich queries'
      },
      {
        label: 'Wide-Column', db: 'Cassandra', color: '#58a6ff',
        query: 'SELECT * WHERE pk="u1"',
        docText: ['row_key | col1 | col2 | col3', '"u1"    | age  | city | ts  ', '"u2"    | age  | --   | ts  '],
        badge: 'Write-optimized · Partition key required'
      },
      {
        label: 'Key-Value', db: 'Redis', color: '#3fb950',
        query: 'GET session:u1',
        docText: ['SET session:u1 "{...}"', 'GET session:u1 → "{...}"', 'TTL: 3600s'],
        badge: 'O(1) lookup · In-memory · No queries'
      }
    ];

    var packets = []; // {lane, phase:'write'/'read', x, alpha}
    var animating = false;
    var raf;

    var laneH = 94, laneY0 = 10;
    var storeX = 160, storeW = 130;
    var arrowStartX = 30, arrowEndX = storeX - 2;
    var readStartX = storeX + storeW + 2, readEndX = 428;

    function drawRR(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function drawFrame() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      lanes.forEach(function(lane, li) {
        var y = laneY0 + li * laneH;
        // Lane background
        drawRR(4, y + 2, 452, laneH - 6, 6, '#161b22', lane.color + '55');

        // Label
        ctx.fillStyle = lane.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
        ctx.fillText(lane.label + ' — ' + lane.db, 10, y + 16);

        // Store box
        drawRR(storeX, y + 8, storeW, laneH - 18, 5, '#0d1117', lane.color);
        ctx.fillStyle = lane.color; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        lane.docText.forEach(function(t, ti) { ctx.fillText(t, storeX + 4, y + 24 + ti * 14); });

        // Badge
        ctx.fillStyle = lane.color + 'cc'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText(lane.badge, 230, y + laneH - 10);

        // Query label on right
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(lane.query, readStartX + 2, y + 28);

        // Write arrow label
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('WRITE', (arrowStartX + arrowEndX)/2, y + 60);
        ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(arrowStartX, y + 62); ctx.lineTo(arrowEndX, y + 62); ctx.stroke();
        ctx.fillStyle = '#30363d';
        ctx.beginPath(); ctx.moveTo(arrowEndX, y + 58); ctx.lineTo(arrowEndX + 8, y + 62); ctx.lineTo(arrowEndX, y + 66); ctx.fill();

        // Read arrow label
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('READ', (readStartX + readEndX)/2, y + 74);
        ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(readStartX, y + 75); ctx.lineTo(readEndX, y + 75); ctx.stroke();
        ctx.fillStyle = '#30363d';
        ctx.beginPath(); ctx.moveTo(readEndX - 8, y + 71); ctx.lineTo(readEndX, y + 75); ctx.lineTo(readEndX - 8, y + 79); ctx.fill();
      });

      // Draw packets
      packets.forEach(function(p) {
        var lane = lanes[p.lane];
        var y = laneY0 + p.lane * laneH;
        var cy = p.phase === 'write' ? y + 62 : y + 75;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath(); ctx.arc(p.x, cy, 6, 0, Math.PI*2);
        ctx.fillStyle = lane.color; ctx.fill();
        ctx.fillStyle = '#0d1117'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
        ctx.fillText(p.phase === 'write' ? 'W' : 'R', p.x, cy + 2);
        ctx.restore();
      });

      if (animating) raf = requestAnimationFrame(tick);
    }

    var tickCount = 0;
    function tick() {
      if (!document.body.contains(canvas)) { animating = false; return; }
      tickCount++;
      // Spawn write packets every 60 frames, staggered by lane
      lanes.forEach(function(_, li) {
        if (tickCount % 90 === li * 30) {
          packets.push({lane: li, phase: 'write', x: arrowStartX, alpha: 1});
        }
      });
      // Move packets
      packets = packets.filter(function(p) { return p.alpha > 0.05; });
      packets.forEach(function(p) {
        if (p.phase === 'write') {
          p.x += 2.5;
          if (p.x >= arrowEndX) { p.phase = 'stored'; p.alpha = 0.6; }
        } else if (p.phase === 'read') {
          p.x += 2.5;
          if (p.x >= readEndX) p.alpha -= 0.04;
        } else if (p.phase === 'stored') {
          // Spawn read packet
          packets.push({lane: p.lane, phase: 'read', x: readStartX, alpha: 1});
          p.alpha = 0;
        }
      });
      drawFrame();
    }

    bPlay.addEventListener('click', function() {
      if (!animating) { animating = true; tickCount = 0; packets = []; bPlay.textContent = '⏸ Pause'; tick(); }
      else { animating = false; bPlay.textContent = '▶ Play'; }
    });
    bReset.addEventListener('click', function() {
      animating = false; packets = []; tickCount = 0; bPlay.textContent = '▶ Play';
      if (raf) cancelAnimationFrame(raf);
      drawFrame();
    });
    drawFrame();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
