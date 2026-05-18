(function() {
  var topic = {
    id:"sd-lld-distributed-lock", area:"sysdesign",
    title:"LLD: Distributed Lock — Redlock, Zookeeper & Fencing",
    tag:"LLD", tags:["distributed lock","redlock","zookeeper","fencing token","mutex","lease","etcd","leader election"],
    concept:`**Why distributed locks?** Multiple nodes must not simultaneously perform a non-idempotent operation (e.g., deduct inventory, send email, run cron job once).

**Single Redis lock (SET NX PX):**
\`\`\`
SET lock:resource uniqueToken NX PX 30000
\`\`\`
- NX = set if not exists (atomic compare-and-set)
- PX 30000 = auto-expire after 30s (avoid deadlock on crash)
- Release: Lua script — only delete if value matches (you own the lock)
- Problem: single Redis node SPOF; clock skew on failover.

**Redlock (Multi-node Redis):**
Acquire lock on N Redis nodes (typically 5) quorum (N/2+1 = 3). Reject if total acquisition time > lock validity. Release from all nodes.
- More resilient than single node.
- Debated: Martin Kleppmann argues it's unsafe without fencing tokens.

**Fencing tokens:**
Monotonically increasing token issued with each lock acquisition. Storage layer rejects writes with token < max seen. Safe even if lock expires early due to GC pause.

**Zookeeper / etcd locks:**
- ZK ephemeral nodes: create ephemeral sequential node; watch lowest node → you hold lock.
- etcd: optimistic concurrency via compare-and-swap on a key with lease TTL.
- Strong consistency (linearisable) — safer than Redis for critical sections.

**Leader election:** Same mechanism — first to acquire distributed lock becomes leader. Heartbeat to renew lease. Others watch for expiry.`,
    why:"Distributed locks are a classic LLD problem. The subtle failure modes (process pause, clock skew, network partition) demonstrate senior-level thinking.",
    example:{
      language:"java",
      code:`// Redis distributed lock with fencing token simulation
@Component
public class RedisDistributedLock {

    @Autowired private StringRedisTemplate redis;

    private static final String RELEASE_SCRIPT =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('DEL', KEYS[1]) " +
        "else return 0 end";

    public Optional<String> tryAcquire(String resource, Duration ttl) {
        String token = UUID.randomUUID().toString(); // unique owner ID
        Boolean acquired = redis.opsForValue()
            .setIfAbsent("lock:" + resource, token, ttl);
        return Boolean.TRUE.equals(acquired) ? Optional.of(token) : Optional.empty();
    }

    public boolean release(String resource, String token) {
        Long result = redis.execute(
            new DefaultRedisScript<>(RELEASE_SCRIPT, Long.class),
            List.of("lock:" + resource), token);
        return Long.valueOf(1L).equals(result);
    }

    // Acquire with retry
    public String acquireWithRetry(String resource, Duration ttl,
                                    int maxRetries, Duration retryDelay)
            throws InterruptedException {
        for (int i = 0; i < maxRetries; i++) {
            Optional<String> token = tryAcquire(resource, ttl);
            if (token.isPresent()) return token.get();
            Thread.sleep(retryDelay.toMillis() + ThreadLocalRandom.current().nextInt(50));
        }
        throw new LockAcquisitionException("Failed to acquire lock for: " + resource);
    }
}

// Usage pattern — always use try-finally to release
@Service
public class InventoryService {
    @Autowired private RedisDistributedLock lock;

    public void deductInventory(String productId, int quantity) throws Exception {
        String token = lock.acquireWithRetry("inventory:" + productId,
                                              Duration.ofSeconds(10), 3,
                                              Duration.ofMillis(100));
        try {
            // Critical section — only one node executes this at a time
            int current = inventoryRepo.getQuantity(productId);
            if (current < quantity) throw new InsufficientInventoryException();
            inventoryRepo.setQuantity(productId, current - quantity);
        } finally {
            lock.release("inventory:" + productId, token); // always release
        }
    }
}`,
      notes:"TTL is a safety net — not the normal release path. Always release explicitly in finally block. TTL prevents deadlock if the holder crashes before releasing."
    },
    interview:[
      {question:"What is a fencing token and why does it matter for distributed locks?",
        answer:"The fundamental problem: a process can acquire a lock, then pause (GC, OS scheduling, network lag). The lock expires. Another process acquires it. The first process resumes and thinks it still holds the lock — two processes in the critical section simultaneously.\n\n**Fencing token solution:**\n1. Lock service issues a monotonically increasing token with each lock grant (e.g., etcd revision number, ZK sequence number)\n2. Lock holder includes token in every write to the storage layer\n3. Storage layer rejects any write with a token ≤ max seen\n\nResult: even if paused process resumes and tries to write, storage rejects it because new lock holder's token is higher.\n\nRedis SET NX doesn't issue fencing tokens — this is Martin Kleppmann's critique of Redlock. Use etcd or ZooKeeper for safety-critical distributed locks.",
        followUps:["Explain the ZooKeeper ephemeral node approach to distributed locking.","How does etcd use compare-and-swap for leader election?"]
      }
    ],
    tradeoffs:{
      pros:["Prevents concurrent modification of shared resource","Redis lock is simple and fast (~1ms)","etcd/ZK: strongly consistent, fencing tokens possible"],
      cons:["Redis lock: not safe under clock skew or network partition","ZK/etcd: slower than Redis, more complex to operate","Distributed locks are a code smell — prefer idempotent design"],
      when:"Use distributed locks as last resort. First, try: idempotent operations, optimistic concurrency (version check in DB), CRDT-based design. When you do need a lock, use etcd/ZK for correctness; Redis for performance-critical non-critical-path operations."
    },
    visual: {
      type: "flow",
      title: "Distributed Lock — Acquire, Use, Release",
      direction: "horizontal",
      autoPlay: false,
      nodes: [
        { id: "client",    label: "Client Node",       icon: "💻", color: "#3fb950",  sublabel: "Service instance" },
        { id: "setnx",     label: "Redis SETNX",        icon: "🔐", color: "#ffa657",  sublabel: "SET lock NX PX 30000" },
        { id: "decision",  label: "Lock Result",        icon: "⚖️", color: "#e3b341",  sublabel: "Acquired / Denied" },
        { id: "critical",  label: "Critical Section",   icon: "🔒", color: "#58a6ff",  sublabel: "Exclusive work" },
        { id: "release",   label: "Release Lock",       icon: "🔓", color: "#3fb950",  sublabel: "Lua: DEL if token matches" },
      ],
      connections: [
        { from: "client",   to: "setnx",    label: "SET lock NX PX 30000",     protocol: "Redis" },
        { from: "setnx",    to: "decision", label: "1 = acquired / 0 = denied", protocol: "Redis" },
        { from: "decision", to: "critical", label: "lock held → proceed",       protocol: "RPC"   },
        { from: "critical", to: "release",  label: "work done → release",       protocol: "Redis" },
        { from: "release",  to: "client",   label: "lock freed",                protocol: "Redis" },
      ],
      scenarios: [
        { name: "Lock Acquired",    path: ["client","setnx","decision","critical","release"], result: "✓ Lock held, work done, released", resultColor: "#3fb950" },
        { name: "Lock Denied",      path: ["client","setnx","decision"],                     result: "✗ 429 — retry with backoff",        resultColor: "#ffa657" },
        { name: "TTL Expiry Guard", path: ["client","setnx","critical","release"],            result: "✓ Auto-expired, no deadlock",       resultColor: "#58a6ff" },
      ],
    },
    flow:{
      title:"Distributed Lock — Acquire → Use → Release",
      caption:"Fencing token prevents stale lock holders from corrupting state",
      nodes:[
        {id:"node1",label:"Node A",hint:"Acquires lock first"},
        {id:"redis",label:"Redis / etcd",hint:"Lock store + fencing token issuer"},
        {id:"node2",label:"Node B",hint:"Waits or retries"},
        {id:"storage",label:"Storage Layer",hint:"Validates fencing token on writes"},
        {id:"dlq-n",label:"Lock Expired",hint:"Node A paused — GC or slow network"}
      ],
      steps:[
        {path:["node1","redis"],label:"Node A: SET lock NX PX 10000",detail:"Node A acquires lock. Redis returns unique token + fencing token (monotonic counter)."},
        {path:["node2","redis"],label:"Node B: SET lock NX → fails",detail:"Node B tries to acquire. Key exists → fails. Node B retries with backoff."},
        {path:["node1","storage"],label:"Node A writes with token=42",detail:"Node A performs critical section work. Includes token=42 in write request."},
        {path:["storage","node1"],label:"Write accepted (token 42 > max 41)",detail:"Storage accepts because token 42 is the highest seen."},
        {path:["node1","dlq-n"],label:"Node A GC pause — lock expires",detail:"Node A pauses for 15 seconds. Lock TTL expires after 10 seconds."},
        {path:["node2","redis"],label:"Node B acquires expired lock",detail:"Node B retries, finds lock expired. Acquires with token=43."},
        {path:["node1","storage"],label:"Node A resumes, tries write with token=42",detail:"Node A comes back, still thinks it holds lock. Tries to write with old token=42."},
        {path:["storage","node1"],label:"Write REJECTED (token 42 < max 43)",detail:"Storage rejects — token 42 is stale. Node B's write (token 43) is safe."}
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
