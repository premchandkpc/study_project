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
  visual: {
    type: 'swimlane',
    title: 'NoSQL Database Types — Comparison',
    lanes: [
      {
        id: 'document', label: 'Document Store', color: '#ffa657', badge: 'MongoDB · Firestore · CouchDB',
        description: 'JSON documents with flexible schema. Rich queries on any field.',
        nodes: [
          { id: 'doc-write',  label: 'Write Doc',     sublabel: '{ id, name, tags: [] }', icon: '📝' },
          { id: 'doc-index',  label: 'Index Fields',  sublabel: 'Any field indexable',    icon: '🔍' },
          { id: 'doc-query',  label: 'Rich Query',    sublabel: '$match, $group, $sort',  icon: '📊' },
          { id: 'doc-result', label: 'Flexible Doc',  sublabel: 'Nested arrays OK',       icon: '✅' }
        ]
      },
      {
        id: 'keyvalue', label: 'Key-Value Store', color: '#3fb950', badge: 'Redis · DynamoDB · etcd',
        description: 'O(1) get/put by key. No query language. Fastest lookup.',
        nodes: [
          { id: 'kv-set',    label: 'SET key val',   sublabel: 'O(1) write',         icon: '📥' },
          { id: 'kv-ttl',    label: 'TTL Expiry',    sublabel: 'Auto-expire keys',   icon: '⏱️' },
          { id: 'kv-get',    label: 'GET key',       sublabel: 'O(1) lookup',        icon: '⚡' },
          { id: 'kv-result', label: 'Return Value',  sublabel: 'Sub-ms latency',     icon: '✅' }
        ]
      },
      {
        id: 'widecolumn', label: 'Wide-Column Store', color: '#58a6ff', badge: 'Cassandra · HBase · BigTable',
        description: 'Rows indexed by partition key. Write-optimized LSM tree. No JOINs.',
        nodes: [
          { id: 'wc-partition', label: 'Partition Key', sublabel: 'hash → node',        icon: '🔑' },
          { id: 'wc-cluster',   label: 'Cluster Key',   sublabel: 'sort within row',     icon: '📋' },
          { id: 'wc-lsm',       label: 'LSM Write',     sublabel: 'Append-only fast',    icon: '✍️' },
          { id: 'wc-result',    label: 'Time-Series',   sublabel: '1M+ writes/sec',      icon: '✅' }
        ]
      },
      {
        id: 'graph', label: 'Graph Database', color: '#bc8cff', badge: 'Neo4j · Amazon Neptune',
        description: 'Nodes + edges with properties. Efficient multi-hop traversals.',
        nodes: [
          { id: 'g-node',   label: 'Create Node',   sublabel: '{ id, props }',       icon: '⭕' },
          { id: 'g-edge',   label: 'Add Edge',      sublabel: '(A)-[REL]->(B)',      icon: '🔗' },
          { id: 'g-query',  label: 'Traversal',     sublabel: 'MATCH path depth N',  icon: '🕸️' },
          { id: 'g-result', label: 'Relationship',  sublabel: 'Friends-of-friends',  icon: '✅' }
        ]
      }
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
