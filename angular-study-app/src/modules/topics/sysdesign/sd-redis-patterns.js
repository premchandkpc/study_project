(function() {
  var topic = {
    id:"sd-redis-patterns", area:"sysdesign",
    title:"Redis — Data Structures, Patterns & Cluster",
    tag:"Caching", tags:["redis","sorted set","pub sub","lua","redis cluster","streams","sentinel","ttl","keyspace notification"],
    concept:`Redis is an in-memory data structure store — far more than a simple cache.

**Core data structures and use cases:**
| Structure | Commands | Use Case |
|---|---|---|
| String | GET/SET/INCR/INCRBY | Counters, sessions, locks |
| Hash | HGET/HSET/HMGET | User profiles, config |
| List | LPUSH/RPOP/LRANGE | Queues, activity feeds |
| Set | SADD/SMEMBERS/SINTER | Unique visitors, tags |
| Sorted Set | ZADD/ZRANGE/ZRANGEBYSCORE | Leaderboards, rate limiting, job priority |
| Stream | XADD/XREAD/XGROUP | Event streaming, message queues |
| Bitmap | SETBIT/BITCOUNT | Daily active users, feature flags |
| HyperLogLog | PFADD/PFCOUNT | Approximate unique counts (~1% error) |

**Key patterns:**

**Leaderboard:** ZADD leaderboard score userId + ZREVRANGE leaderboard 0 9 → top 10 in O(log N)

**Sliding window rate limit:**
\`\`\`lua
-- Atomic Lua script for sliding window
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count < limit then
    redis.call('ZADD', key, now, now)
    redis.call('EXPIRE', key, window)
    return 1
end
return 0
\`\`\`

**Distributed lock (Redlock):** SET key value NX PX 30000 (set-if-not-exists with 30s expiry)

**Redis Cluster:** 16384 hash slots distributed across nodes. Consistent hashing. Automatic failover via gossip protocol. Minimum 3 primary + 3 replica nodes.`,
    why:"Redis is the most commonly used cache and real-time data structure in backend systems. Every platform (Airbnb, Twitter, GitHub) uses it for rate limiting, sessions, and pub/sub.",
    example:{
      language:"java",
      code:`// Redis patterns with Spring Data Redis + Lettuce
@Component
public class RedisPatterns {

    @Autowired private RedisTemplate<String, String> redis;
    @Autowired private StringRedisTemplate str;

    // ── Leaderboard ──
    public void addScore(String userId, double score) {
        redis.opsForZSet().add("game:leaderboard", userId, score);
    }
    public Set<ZSetOperations.TypedTuple<String>> getTop10() {
        return redis.opsForZSet()
            .reverseRangeWithScores("game:leaderboard", 0, 9);
    }

    // ── Distributed Lock ──
    public boolean acquireLock(String resource, String token, long ttlMs) {
        Boolean result = redis.opsForValue()
            .setIfAbsent("lock:" + resource, token,
                         Duration.ofMillis(ttlMs));
        return Boolean.TRUE.equals(result);
    }
    public void releaseLock(String resource, String token) {
        // Lua: only delete if value matches (we own the lock)
        String script = "if redis.call('GET',KEYS[1])==ARGV[1] then " +
                        "return redis.call('DEL',KEYS[1]) else return 0 end";
        redis.execute(new DefaultRedisScript<>(script, Long.class),
            List.of("lock:" + resource), token);
    }

    // ── HyperLogLog — unique daily visitors ──
    public void trackVisit(String date, String userId) {
        redis.opsForHyperLogLog().add("visits:" + date, userId);
    }
    public long uniqueVisitors(String date) {
        return redis.opsForHyperLogLog().size("visits:" + date);
    }

    // ── Pub/Sub ──
    public void publish(String channel, String message) {
        redis.convertAndSend(channel, message);
    }
}`,
      notes:"Always use Lua scripts for multi-step atomic operations. MULTI/EXEC (transactions) don't support conditional logic — Lua does."
    },
    interview:[
      {question:"How does Redis achieve persistence without sacrificing speed?",
        answer:"Redis offers two persistence mechanisms:\n\n**RDB (snapshot):** Fork the process, write a point-in-time snapshot to disk. Zero overhead on main thread. Fork takes ~10ms for 10GB dataset. Data loss up to last snapshot interval (every 60s-900s).\n\n**AOF (Append-Only File):** Log every write command. Replayable on restart. `fsync` policy options:\n- `always` — fsync every write (safe, ~1ms overhead)\n- `everysec` — fsync every second (common choice — max 1s data loss)\n- `no` — OS decides (fastest, most data loss)\n\n**In production:** Enable both — RDB for fast restart, AOF for durability. Use `appendfsync everysec`.",
        followUps:["What is Redis replication and how is it different from persistence?","Explain Redis Sentinel vs Redis Cluster."]
      }
    ],
    tradeoffs:{
      pros:["Sub-millisecond latency for all data structures","Rich atomic operations via Lua","Versatile — cache, queue, pub-sub, rate-limiter in one"],
      cons:["Data must fit in RAM (cluster helps but adds complexity)","Eventual consistency across replicas","Single-threaded command processing (I/O threaded since Redis 6)"],
      when:"Use Redis for: session store, rate limiting, leaderboards, pub-sub, distributed locks, job queues. Don't use as primary DB — use as cache/complement."
    },
    visual: {
      type: "swimlane",
      title: "🔴 Redis Patterns — When to Use Each",
      lanes: [
        {
          id: "cache_aside",
          label: "📦 Cache Aside (Lazy)",
          color: "#58a6ff",
          badge: "Read-heavy",
          description: "App checks cache first; on miss, fetches DB then populates cache. Cache stays in sync via TTL.",
          nodes: [
            { id: "ca1", label: "1. GET key",       sublabel: "Check Redis first",         icon: "🔍" },
            { id: "ca2", label: "2. Cache Miss?",   sublabel: "Key not found / expired",   icon: "❌" },
            { id: "ca3", label: "3. Query DB",       sublabel: "Fetch source of truth",     icon: "🗄️" },
            { id: "ca4", label: "4. SET key TTL",   sublabel: "Populate cache",             icon: "📝" },
            { id: "ca5", label: "5. Return",         sublabel: "App returns to client",     icon: "↩️" }
          ]
        },
        {
          id: "write_through",
          label: "✏️ Write Through",
          color: "#3fb950",
          badge: "Write-heavy",
          description: "Every write goes to cache AND DB atomically. Cache always consistent — no stale reads.",
          nodes: [
            { id: "wt1", label: "1. Write Request", sublabel: "App receives PUT/POST",      icon: "📨" },
            { id: "wt2", label: "2. SET Redis",     sublabel: "Write to cache first",       icon: "⚡" },
            { id: "wt3", label: "3. Write DB",      sublabel: "Persist to database",        icon: "🗄️" },
            { id: "wt4", label: "4. ACK Client",    sublabel: "Both writes confirmed",      icon: "✅" }
          ]
        },
        {
          id: "pubsub",
          label: "📡 Pub/Sub Fan-out",
          color: "#ffa657",
          badge: "Real-time",
          description: "Publisher sends once to a channel; Redis delivers to ALL subscribers simultaneously.",
          nodes: [
            { id: "ps1", label: "Publisher",        sublabel: "PUBLISH channel msg",        icon: "📢" },
            { id: "ps2", label: "Redis Channel",    sublabel: "Fan-out broker",             icon: "🔴" },
            { id: "ps3", label: "Subscriber 1",     sublabel: "Chat / notification",        icon: "👤" },
            { id: "ps4", label: "Subscriber 2",     sublabel: "Cache invalidation",         icon: "🔄" },
            { id: "ps5", label: "Subscriber N",     sublabel: "Analytics / logging",        icon: "📊" }
          ]
        },
        {
          id: "rate_limit",
          label: "🚦 Rate Limiting (Sorted Set)",
          color: "#bc8cff",
          badge: "Per-user throttle",
          description: "Sliding window: ZADD timestamps per user, ZREMRANGEBYSCORE to evict old, ZCARD for count.",
          nodes: [
            { id: "rl1", label: "Request In",       sublabel: "User hits API endpoint",     icon: "📥" },
            { id: "rl2", label: "ZREMRANGE",        sublabel: "Evict timestamps > window",  icon: "🗑️" },
            { id: "rl3", label: "ZCARD check",      sublabel: "Count requests in window",   icon: "🔢" },
            { id: "rl4", label: "Under limit?",     sublabel: "ZADD current timestamp",     icon: "✅" },
            { id: "rl5", label: "Over limit?",      sublabel: "429 Too Many Requests",      icon: "🚫" }
          ]
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
