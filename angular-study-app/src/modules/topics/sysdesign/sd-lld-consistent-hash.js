(function() {
  var topic = {
  id:"sd-lld-consistent-hash", area:"sysdesign",
  title:"LLD: Consistent Hashing — Hash Ring & Virtual Nodes",
  tag:"LLD", tags:["consistent hashing","hash ring","virtual nodes","vnodes","distributed cache","memcached","chord"],
  concept:`**Problem with mod-N hashing:** \`shard = hash(key) % N\`. When N changes (add/remove a node), nearly all keys remap → massive cache miss storm.

**Consistent hashing solution:**
1. Hash space is a circular ring [0, 2^32). 
2. Place servers on the ring by hashing their ID: \`hash("server-1") → position P\`.
3. For a key, hash it → find the next server clockwise on the ring.
4. When a server is added/removed, only keys between it and its predecessor move.
5. On average, only K/N keys remap (K = total keys, N = node count).

**Virtual nodes (vnodes):**
Real problem: few servers → uneven distribution (load imbalance).
Solution: each physical server gets V virtual node positions on the ring (V=100-300).
- Uniform distribution across the ring.
- More powerful servers get more vnodes → weighted assignment.
- On failure: keys spread across all remaining servers (no single successor overwhelmed).

**Used by:** Apache Cassandra (256 vnodes default), Amazon DynamoDB, Redis Cluster (16384 hash slots ≈ consistent hashing), Memcached client libraries.

**Hash slots (Redis Cluster):** 16384 fixed slots instead of continuous ring. Each master owns a range. Gossip protocol tracks slot assignments.`,
  why:`Consistent hashing is foundational to distributed systems. It appears in every database, cache, and CDN design. Interviewers expect you to draw the ring and explain vnodes.`,
  example:{
    language:"java",
    code:`// Consistent Hash Ring implementation
public class ConsistentHashRing<T> {
    private final TreeMap<Long, T> ring = new TreeMap<>();
    private final int virtualNodes;
    private final MessageDigest md5;

    public ConsistentHashRing(int virtualNodes) throws NoSuchAlgorithmException {
        this.virtualNodes = virtualNodes;
        this.md5 = MessageDigest.getInstance("MD5");
    }

    public void addServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.put(hash, server);
        }
    }

    public void removeServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.remove(hash);
        }
    }

    public T getServer(String key) {
        if (ring.isEmpty()) return null;
        long hash = hash(key);
        // Find first server clockwise from key's position
        Map.Entry<Long, T> entry = ring.ceilingEntry(hash);
        if (entry == null) entry = ring.firstEntry(); // wrap around ring
        return entry.getValue();
    }

    private long hash(String key) {
        byte[] digest = md5.digest(key.getBytes(StandardCharsets.UTF_8));
        // Use first 4 bytes as unsigned int
        return ((long)(digest[3] & 0xFF) << 24)
             | ((long)(digest[2] & 0xFF) << 16)
             | ((long)(digest[1] & 0xFF) << 8)
             | ((long)(digest[0] & 0xFF));
    }
}

// Usage — Memcached-style key routing
ConsistentHashRing<String> ring = new ConsistentHashRing<>(150);
ring.addServer("cache-1:11211");
ring.addServer("cache-2:11211");
ring.addServer("cache-3:11211");

String server = ring.getServer("user:42:profile"); // always routes to same server
// → "cache-2:11211"

ring.addServer("cache-4:11211");  // only ~25% of keys remap (vs 75% with mod-4)
ring.getServer("user:42:profile"); // may now route to "cache-4:11211" or still "cache-2"`,
    notes:"With 150 vnodes per server, standard deviation of load across servers is <10%. With 1 vnode it can be 200%+."
  },
  interview:[
    {question:"How does consistent hashing minimise key remapping when a node is added?",
     answer:`With mod-N hashing and N → N+1: key K remaps if \`hash(K) % (N+1) ≠ hash(K) % N\`. This is true for ~N/(N+1) of all keys → nearly everything remaps.\n\nWith consistent hashing: the new node takes the position between two existing nodes on the ring. It only claims keys that would have gone to the next clockwise node — approximately K/N keys. All other keys are unaffected.\n\nMath: if we add 1 server to a 10-server ring, only 10% of keys move (1/11). With mod-N: 91% move.\n\nVnodes amplify this: the new server's 150 vnodes are spread across the ring, claiming small slices from many existing servers — very uniform redistribution.`,
     followUps:["How does Redis Cluster implement consistent hashing with hash slots?","What happens to in-flight requests when a node is added to a Cassandra cluster?"]
    }
  ],
  tradeoffs:{
    pros:["Only K/N keys remap on topology change","Vnodes give near-uniform distribution","Weighted assignment via vnode count"],
    cons:["More complex than mod-N","Vnodes add memory overhead (ring size = servers × vnodes entries)","Hot spots still possible if many popular keys hash to same region"],
    when:"Use consistent hashing for any distributed cache or storage system where nodes join/leave dynamically. Essential for Cassandra, DynamoDB, Redis Cluster, and CDN routing."
  },
  visual: {
    type: 'flow',
    title: 'Consistent Hashing — Request Routing Flow',
    direction: 'horizontal',
    nodes: [
      { id: 'request',   label: 'Client Request',   icon: '💻', color: '#e6edf3', sublabel: 'GET user:42:profile' },
      { id: 'hashfn',    label: 'Hash Function',    icon: '🔢', color: '#e3b341', sublabel: 'MD5 / xxHash → uint32' },
      { id: 'ring',      label: 'Ring Lookup',      icon: '⭕', color: '#58a6ff', sublabel: 'TreeMap.ceilingEntry()' },
      { id: 'vnodes',    label: 'Virtual Nodes',    icon: '🔵', color: '#bc8cff', sublabel: '150 vnodes / server' },
      { id: 'nodeA',     label: 'Cache Node A',     icon: '🟢', color: '#3fb950', sublabel: 'Serves ~25% of keys' },
      { id: 'replica',   label: 'Replica Node',     icon: '📋', color: '#ffa657', sublabel: 'N replicas clockwise' }
    ],
    connections: [
      { from: 'request', to: 'hashfn',  label: 'key string',    protocol: 'hash(key)' },
      { from: 'hashfn',  to: 'ring',    label: 'uint32 pos',    protocol: 'position' },
      { from: 'ring',    to: 'vnodes',  label: 'vnode check',   protocol: 'lookup' },
      { from: 'vnodes',  to: 'nodeA',   label: 'next CW node',  protocol: 'route' },
      { from: 'nodeA',   to: 'replica', label: 'replicate',     protocol: 'async copy' }
    ],
    scenarios: [
      { name: 'Normal Lookup',  path: ['request','hashfn','ring','nodeA'],                     result: '✓ O(log N) route',        resultColor: '#3fb950' },
      { name: 'With Vnodes',    path: ['request','hashfn','ring','vnodes','nodeA'],             result: '✓ Uniform distribution',  resultColor: '#3fb950' },
      { name: 'With Replication', path: ['request','hashfn','ring','nodeA','replica'],         result: '✓ N-way redundancy',      resultColor: '#58a6ff' },
      { name: 'Node Removed',   path: ['request','hashfn','ring','vnodes','nodeA'],             result: '⚡ Only K/N keys remap',   resultColor: '#e3b341' }
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
