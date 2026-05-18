(function() {
  var topic = {
  id:"sd-lld-rate-limiter", area:"sysdesign",
  title:"LLD: Rate Limiter — Token Bucket & Sliding Window",
  tag:"LLD", tags:["rate limiter","token bucket","sliding window","redis","lua","leaky bucket","fixed window","algorithm"],
  concept:`**Rate limiter** controls the rate of requests to protect services from overload and abuse.

**Algorithm comparison:**

**Fixed Window Counter:**
\`\`\`
Window: [0s - 60s] → counter=100 → reset at 60s
Problem: 100 requests at :59, 100 more at :61 → 200 in 2 seconds
\`\`\`

**Sliding Window Log:**
Store timestamp of each request in sorted set. Count entries in [now-window, now].
Accurate but O(N) memory per user.

**Sliding Window Counter (hybrid):**
Two fixed windows. current_count + previous_count × (1 - overlap).
~1% error, O(1) memory. Used by Cloudflare.

**Token Bucket (most common):**
- Bucket holds capacity C tokens. Refilled at rate R tokens/second.
- Each request consumes 1 token. If empty → reject (429).
- Allows bursts up to C. Smooth average of R.

**Leaky Bucket:**
- Requests queued. Processed at fixed rate (leaks). Smooths bursts.
- Output always at constant rate (good for downstream protection).

**Distributed rate limiting with Redis:**
- Store counters/timestamps in Redis (shared across all app instances)
- Use Lua script for atomic check-and-increment
- Key: \`ratelimit:{userId}:{window}\`

**Token bucket in Redis:**
\`INCR\` + \`EXPIRE\` for fixed window. For token bucket: store {tokens, last_refill} in Redis hash, Lua script calculates tokens since last refill.`,
  why:`Rate limiter is the single most common LLD problem. Interviewers expect algorithm knowledge, distributed implementation, and Redis usage.`,
  example:{
    language:"java",
    code:`// Token Bucket — distributed implementation with Redis Lua
@Component
public class TokenBucketRateLimiter {

    @Autowired private RedisTemplate<String, String> redis;

    // Lua: atomic token bucket check
    private static final String TOKEN_BUCKET_LUA = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refillRate = tonumber(ARGV[2])   -- tokens per second
        local now = tonumber(ARGV[3])           -- current time in ms
        local requested = tonumber(ARGV[4])

        local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
        local tokens = tonumber(bucket[1]) or capacity
        local lastRefill = tonumber(bucket[2]) or now

        -- Calculate tokens to add since last refill
        local elapsed = (now - lastRefill) / 1000.0
        tokens = math.min(capacity, tokens + elapsed * refillRate)

        if tokens >= requested then
            tokens = tokens - requested
            redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
            redis.call('EXPIRE', key, 3600)
            return 1  -- allowed
        else
            redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
            redis.call('EXPIRE', key, 3600)
            return 0  -- rejected
        end
        """;

    public boolean isAllowed(String userId, int capacity, int refillRate) {
        String key = "ratelimit:tokenbucket:" + userId;
        Long result = redis.execute(
            new DefaultRedisScript<>(TOKEN_BUCKET_LUA, Long.class),
            List.of(key),
            String.valueOf(capacity),
            String.valueOf(refillRate),
            String.valueOf(System.currentTimeMillis()),
            "1"
        );
        return Long.valueOf(1L).equals(result);
    }
}

// Sliding window counter (hybrid — Cloudflare approach)
public boolean slidingWindowAllowed(String userId, int limit, int windowSeconds) {
    long now = System.currentTimeMillis() / 1000;
    long currentWindow = now / windowSeconds;
    long previousWindow = currentWindow - 1;
    double overlap = 1.0 - (double)(now % windowSeconds) / windowSeconds;

    String currentKey = "ratelimit:sw:" + userId + ":" + currentWindow;
    String previousKey = "ratelimit:sw:" + userId + ":" + previousWindow;

    long currentCount = Optional.ofNullable(
        (String) redis.opsForValue().get(currentKey))
        .map(Long::parseLong).orElse(0L);
    long previousCount = Optional.ofNullable(
        (String) redis.opsForValue().get(previousKey))
        .map(Long::parseLong).orElse(0L);

    double estimate = previousCount * overlap + currentCount;

    if (estimate < limit) {
        redis.opsForValue().increment(currentKey);
        redis.expire(currentKey, Duration.ofSeconds(windowSeconds * 2));
        return true;
    }
    return false;
}`,
    notes:"Lua scripts execute atomically in Redis — no race conditions between check and increment. Essential for correctness in distributed rate limiting."
  },
  interview:[
    {question:"Design a rate limiter for an API that allows 100 requests per minute per user.",
     answer:`**Requirements clarification:**\n- Per user (not global)\n- Distributed (multiple API servers)\n- Algorithm: Token bucket (allows burst up to 100, refills 100/min = 1.67/sec)\n\n**Design:**\n1. **Storage:** Redis hash per user: \`{tokens: 95.2, lastRefill: 1701234567890}\`\n2. **Algorithm:** On each request, Lua script: calculate elapsed since lastRefill → add tokens at rate 1.67/s → if tokens >= 1 → decrement → allow; else → 429\n3. **Headers:** Return \`X-RateLimit-Limit: 100\`, \`X-RateLimit-Remaining: 45\`, \`X-RateLimit-Reset: 1701234620\`\n4. **Scale:** Redis Cluster handles millions of users. Each key is tiny (~50 bytes).\n5. **Edge cases:** Clock skew across servers → use Redis server time (TIME command). Redis unavailable → fail open (allow) or fail closed (reject).\n\n**Capacity:** 10M users × 50 bytes/user = 500MB Redis memory. Single Redis node handles 100K ops/s.`,
     followUps:["How do you handle rate limiting across multiple regions?","What are the trade-offs between token bucket and leaky bucket?"]
    }
  ],
  tradeoffs:{
    pros:["Token bucket: allows bursts, smooth average","Sliding window: accurate, prevents boundary burst","Redis Lua: atomic, no race conditions"],
    cons:["Distributed clocks add complexity","Redis becomes a dependency — must be HA","Too strict limits frustrate legitimate users"],
    when:"Rate limit at: API gateway (global), per user, per IP. Use token bucket for API rate limiting. Leaky bucket for queue-based downstream protection."
  },
  visual: {
    type: 'flow',
    title: 'Rate Limiter — Token Bucket Flow',
    direction: 'horizontal',
    autoPlay: false,
    nodes: [
      { id: 'request',  label: 'Incoming Request', icon: '📡', color: '#58a6ff',  sublabel: 'API call / HTTP req' },
      { id: 'rl',       label: 'Rate Limiter',      icon: '🚦', color: '#ffa657',  sublabel: 'Middleware / Gateway' },
      { id: 'redis',    label: 'Redis Counter',     icon: '⚡', color: '#e3b341',  sublabel: 'Lua: check + increment' },
      { id: 'allow',    label: 'Allow',             icon: '✅', color: '#3fb950',  sublabel: '200 OK — tokens left' },
      { id: 'reject',   label: 'Reject',            icon: '❌', color: '#f85149',  sublabel: '429 Too Many Requests' },
      { id: 'service',  label: 'Upstream Service',  icon: '🖥️', color: '#58a6ff',  sublabel: 'Protected endpoint' },
    ],
    connections: [
      { from: 'request', to: 'rl',      label: 'every request',            protocol: 'HTTP'  },
      { from: 'rl',      to: 'redis',   label: 'HINCRBY / token check',    protocol: 'Redis' },
      { from: 'redis',   to: 'allow',   label: 'tokens > 0 → decrement',   protocol: 'Redis' },
      { from: 'redis',   to: 'reject',  label: 'tokens = 0 → deny',        protocol: 'Redis' },
      { from: 'allow',   to: 'service', label: 'forward request',           protocol: 'HTTP'  },
    ],
    scenarios: [
      { name: 'Allowed (Token Bucket)',   path: ['request','rl','redis','allow','service'], result: '✓ 200 OK — token consumed',    resultColor: '#3fb950' },
      { name: 'Rejected (Bucket Empty)',  path: ['request','rl','redis','reject'],          result: '✗ 429 — retry after 1s',       resultColor: '#f85149' },
      { name: 'Sliding Window Counter',   path: ['request','rl','redis','allow','service'], result: '✓ count < limit → forward',    resultColor: '#58a6ff' },
    ],
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
