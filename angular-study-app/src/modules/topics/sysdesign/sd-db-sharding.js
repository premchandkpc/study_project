(function() {
  var topic = {
  id:"sd-db-sharding", area:"sysdesign",
  title:"Database Sharding, Replication & Resharding",
  tag:"Database", tags:["sharding","replication","horizontal scaling","consistent hashing","resharding","vitess","citus"],
  concept:`**Replication** — copy data to multiple nodes for availability and read scale. One primary, N replicas.
- **Sync replication** — primary waits for replica ACK before committing. Zero data loss, higher latency.
- **Async replication** — primary commits immediately, replica catches up later. Low latency, potential data loss on failover (~seconds of lag).
- **Semi-sync** — at least one replica must ACK. Balance between above.

**Sharding (horizontal partitioning)** — split data across multiple nodes so each node owns a subset.

**Sharding strategies:**
1. **Range-based** — shard by value range (users 0-1M → shard 1, 1M-2M → shard 2). Simple but creates hot spots.
2. **Hash-based** — \`shard = hash(key) % N\`. Even distribution but resharding is expensive (N changes).
3. **Consistent hashing** — place shards on hash ring; adding a node migrates only K/N keys. Used by Cassandra, DynamoDB, Redis Cluster.
4. **Directory-based** — lookup table maps key → shard. Flexible but lookup is a bottleneck.
5. **Geo-sharding** — route by geography (EU users → EU shard). Compliance + latency.

**Cross-shard challenges:**
- **JOINs** — cross-shard JOINs require scatter-gather; avoid by denormalising
- **Distributed transactions** — 2PC or Saga; expensive
- **Auto-increment IDs** — use UUID or Snowflake IDs to avoid collision
- **Resharding** — Vitess (MySQL) and Citus (PostgreSQL) automate online resharding`,
  why:`Sharding is the only way to scale writes horizontally beyond a single primary DB. Getting the shard key wrong requires a full data migration to fix.`,
  example:{
    language:"java",
    code:`// Snowflake ID generation — unique across shards without coordination
public class SnowflakeIdGenerator {
    // 41 bits timestamp | 10 bits machineId | 12 bits sequence
    private static final long EPOCH = 1609459200000L; // 2021-01-01
    private static final long MACHINE_BITS = 10L;
    private static final long SEQUENCE_BITS = 12L;
    private static final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1; // 4095

    private final long machineId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(long machineId) {
        this.machineId = machineId & ((1L << MACHINE_BITS) - 1);
    }

    public synchronized long nextId() {
        long now = System.currentTimeMillis() - EPOCH;
        if (now == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) now = waitNextMs(lastTimestamp); // busy wait 1ms
        } else {
            sequence = 0L;
        }
        lastTimestamp = now;
        return (now << (MACHINE_BITS + SEQUENCE_BITS))
             | (machineId << SEQUENCE_BITS)
             | sequence;
    }

    private long waitNextMs(long lastTs) {
        long ts;
        do { ts = System.currentTimeMillis() - EPOCH; } while (ts <= lastTs);
        return ts;
    }
}
// Usage: 4096 IDs/ms per machine, globally unique, time-sortable`,
    notes:"Twitter's Snowflake: 41-bit timestamp + 10-bit worker + 12-bit sequence = 64-bit ID. Time-sortable, no coordination needed."
  },
  interview:[
    {question:"How would you shard a users table for a social network with 500M users?",
     answer:`1. **Shard key choice:** \`user_id\` (UUID/Snowflake). Avoid sharding by name/email — skewed distributions. Avoid by geography unless you need data residency.\n\n2. **Strategy:** Consistent hashing with virtual nodes (128 vnodes per shard). Start with 8 physical shards, each shard is a Postgres primary + 2 replicas.\n\n3. **Co-locate relationships:** Store user's posts, followers, sessions on the same shard as the user (derived shard ID: \`followee_shard = hash(user_id) % N\`).\n\n4. **Cross-shard problem:** "Show followers of user A" — follower list stored on user A's shard (precomputed). Cross-shard friend-of-friend queries use async graph processing (Spark/Presto).\n\n5. **Resharding:** Vitess (MySQL) or pg_partman; online migration with zero downtime.`,
     followUps:["What is a hotspot shard and how do you fix it?","Explain Vitess's VSchema and how it enables transparent sharding."]
    }
  ],
  tradeoffs:{
    pros:["Linear write scale-out","Data isolation per shard (smaller blast radius)"],
    cons:["Application must be shard-aware (or use middleware like Vitess)","Cross-shard transactions are expensive","Resharding requires careful planning"],
    when:"Shard when a single primary can't handle write throughput (typically >10K TPS sustained) or data size exceeds manageable single-node size (>5TB)."
  },
  flow:{
    title:"Sharded Write Path",
    caption:"Shard key determines which shard; consistent hash ring minimises resharding",
    nodes:[
      {id:"app",label:"App Server",hint:"Compute shard from key"},
      {id:"router",label:"Shard Router",hint:"Consistent hash or directory"},
      {id:"sh1",label:"Shard 1",hint:"user_id hash 0-33%"},
      {id:"sh2",label:"Shard 2",hint:"user_id hash 33-66%"},
      {id:"sh3",label:"Shard 3",hint:"user_id hash 66-100%"},
      {id:"rep",label:"Replica",hint:"Async replication for reads"}
    ],
    steps:[
      {path:["app","router"],label:"Route by shard key",detail:"App computes shard = consistentHash(user_id). Shard router maps to physical node address."},
      {path:["router","sh1"],label:"Write to Shard 1",detail:"User with hash in 0-33% range lands on Shard 1's primary."},
      {path:["sh1","rep"],label:"Async replication",detail:"Primary streams WAL to replica. Replica serves read queries with <100ms lag."},
      {path:["router","sh2"],label:"Different user → Shard 2",detail:"Different user_id hash routes to Shard 2 independently."},
      {path:["app","sh3"],label:"Direct shard access (optimised)",detail:"App caches shard mapping locally; skip router for known shard-key queries."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
