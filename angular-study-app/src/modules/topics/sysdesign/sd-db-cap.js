(function() {
  var topic = {
    id:"sd-db-cap", area:"sysdesign",
    title:"CAP Theorem, Consistency Models & PACELC",
    tag:"Database", tags:["cap theorem","consistency","availability","partition tolerance","eventual consistency","strong consistency","pacelc"],
    concept:`**CAP Theorem** (Brewer 2000): A distributed system can guarantee at most **2 of 3**:
- **C**onsistency — every read returns the most recent write (linearisability)
- **A**vailability — every request receives a response (not necessarily latest data)
- **P**artition tolerance — system continues despite network partitions

**In practice:** Partitions happen (network failures are real). So you choose **CP or AP**:
- **CP** (Zookeeper, HBase, etcd, RDBMS with sync replication): sacrifice availability during partition — refuse requests rather than return stale data
- **AP** (Cassandra, CouchDB, DynamoDB default): sacrifice consistency — return potentially stale data, reconcile later

**Consistency spectrum (weakest → strongest):**
1. **Eventual** — given no new updates, all replicas converge eventually (DNS, shopping cart)
2. **Monotonic read** — once you read value X, you'll never read an older value
3. **Read-your-writes** — after you write, you always see your own write
4. **Session** — consistency guarantees within a session (read-your-writes + monotonic)
5. **Causal** — causally related operations are seen in order by all nodes
6. **Linearisable** — strongest; operations appear instantaneous to all observers (Spanner, etcd)

**PACELC extension:** Even without partition, there's a trade-off between **Latency** and **Consistency**. A quorum write to 3 replicas is consistent but slower than writing to 1.`,
    why:"CAP and consistency models appear in nearly every system design interview. Choosing wrong consistency model costs money (over-engineered) or correctness (data loss/anomalies).",
    example:{
      language:"java",
      code:`// Cassandra — tunable consistency per operation
@Repository
public class OrderRepository {

    @Autowired
    private CassandraTemplate template;

    // Strong consistency — quorum read+write (slower, safer)
    public Order findCritical(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.QUORUM) // majority of replicas
                .build());
    }

    // Eventual consistency — ONE replica (fastest, may be stale)
    public Order findEventual(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.ONE)
                .build());
    }

    // Write with LOCAL_QUORUM — quorum within same datacenter
    public void save(Order order) {
        template.insert(order,
            InsertOptions.builder()
                .consistencyLevel(ConsistencyLevel.LOCAL_QUORUM)
                .build());
    }
}`,
      notes:"Rule of thumb: W + R > N guarantees strong consistency. With N=3, W=2, R=2: 2+2=4 > 3 → every read sees the latest write."
    },
    interview:[
      {question:"Explain the CAP theorem with a real-world example.",
        answer:"During a network partition in a multi-datacenter setup (east ↔ west data centers lose connectivity):\n\n**CP choice (e.g., Zookeeper):** The isolated DC refuses writes/reads until the partition heals. Users see errors but data stays consistent. Safe for distributed locks, configuration, leader election.\n\n**AP choice (e.g., Cassandra):** Both DCs accept writes independently. A user writes an order in east; another reads in west — they might see stale data. After partition heals, conflict resolution runs (last-write-wins or CRDTs). Acceptable for shopping carts, user preferences.",
        followUps:["What are CRDTs and when do you use them?","How does DynamoDB handle conflicts in global tables?"]
      },
      {question:"What is linearisability and why is it expensive?",
        answer:"Linearisability means every operation appears to take effect instantaneously at a single point in time between its invocation and response. All observers see the same order of operations.\n\nIt's expensive because:\n1. Every read must contact a quorum of replicas to ensure it sees the latest write\n2. Adds cross-node network round trips\n3. During partition, must sacrifice availability\n\nAlternatives with weaker but often sufficient guarantees: sequential consistency, causal consistency, session consistency — each allows more concurrency with some trade-offs.",
        followUps:["How does Google Spanner achieve external consistency (linearisability) globally?"]
      }
    ],
    tradeoffs:{
      pros:["Framework clarifies trade-offs before choosing a DB","Consistency levels let you tune per-operation"],
      cons:["CAP oversimplifies — network partitions are not binary","PACELC is more practical for latency-conscious systems"],
      when:"Choose CP for: financial transactions, distributed locks, config management. Choose AP for: social feeds, shopping carts, notifications, analytics."
    },
    visual: {
      type: "swimlane",
      title: "🔺 CAP Theorem — Pick 2 of 3",
      lanes: [
        {
          id: "cp",
          label: "⚡ CP Systems",
          color: "#58a6ff",
          badge: "Consistent + Partition-Tolerant",
          description: "Refuse requests during partition — never return stale data",
          nodes: [
            { id: "cp1", label: "HBase", sublabel: "Hadoop ecosystem", icon: "🗄️" },
            { id: "cp2", label: "MongoDB", sublabel: "w/ majority write", icon: "🍃" },
            { id: "cp3", label: "etcd", sublabel: "Distributed config", icon: "⚙️" },
            { id: "cp4", label: "Zookeeper", sublabel: "Leader election", icon: "🐘" },
            { id: "cp5", label: "Redis (cluster)", sublabel: "WAIT command", icon: "⚡" }
          ]
        },
        {
          id: "ap",
          label: "🌍 AP Systems",
          color: "#3fb950",
          badge: "Available + Partition-Tolerant",
          description: "Serve potentially stale data during partition — reconcile later",
          nodes: [
            { id: "ap1", label: "Cassandra", sublabel: "Tunable consistency", icon: "💎" },
            { id: "ap2", label: "DynamoDB", sublabel: "Default eventual", icon: "🔶" },
            { id: "ap3", label: "CouchDB", sublabel: "MVCC + replication", icon: "🛋️" },
            { id: "ap4", label: "Riak", sublabel: "Vector clocks", icon: "🔁" },
            { id: "ap5", label: "DNS", sublabel: "Highly available", icon: "🌐" }
          ]
        },
        {
          id: "ca",
          label: "⚠️ CA Systems (No Partition)",
          color: "#ffa657",
          badge: "Consistent + Available",
          description: "Assumes no network partitions — only viable for single-node or LAN setups",
          nodes: [
            { id: "ca1", label: "PostgreSQL", sublabel: "Single primary", icon: "🐘" },
            { id: "ca2", label: "MySQL", sublabel: "Single node", icon: "🐬" },
            { id: "ca3", label: "SQL Server", sublabel: "Transactions", icon: "🪟" },
            { id: "ca4", label: "⚠️ Tradeoff", sublabel: "Partitions always happen", icon: "🚨" }
          ]
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
