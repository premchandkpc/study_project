# LLD: Rate Limiter - Token Bucket & Sliding Window

## Quick Facts

- Area: System Design
- Tag: LLD
- Source: `src/modules/topics/sysdesign/sd-lld-rate-limiter.js`
- Tags: `rate limiter`, `token bucket`, `sliding window`, `redis`, `lua`, `leaky bucket`, `fixed window`, `algorithm`
- Visual coverage: live visual, flow lab, UML lab, architecture map

## Concept

**Rate limiter** controls the rate of requests to protect services from overload and abuse.

**Algorithm comparison:**

**Fixed Window Counter:**

```
Window: [0s - 60s] -> counter=100 -> reset at 60s
Problem: 100 requests at :59, 100 more at :61 -> 200 in 2 seconds
```

**Sliding Window Log:**
Store timestamp of each request in sorted set. Count entries in [now-window, now].
Accurate but O(N) memory per user.

**Sliding Window Counter (hybrid):**
Two fixed windows. current_count + previous_count x (1 - overlap).
~1% error, O(1) memory. Used by Cloudflare.

**Token Bucket (most common):**

- Bucket holds capacity C tokens. Refilled at rate R tokens/second.
- Each request consumes 1 token. If empty -> reject (429).
- Allows bursts up to C. Smooth average of R.

**Leaky Bucket:**

- Requests queued. Processed at fixed rate (leaks). Smooths bursts.
- Output always at constant rate (good for downstream protection).

**Distributed rate limiting with Redis:**

- Store counters/timestamps in Redis (shared across all app instances)
- Use Lua script for atomic check-and-increment
- Key: `ratelimit:{userId}:{window}`

**Token bucket in Redis:**
`INCR` + `EXPIRE` for fixed window. For token bucket: store {tokens, last_refill} in Redis hash, Lua script calculates tokens since last refill.

## Why It Matters

Rate limiter is the single most common LLD problem. Interviewers expect algorithm knowledge, distributed implementation, and Redis usage.

## Architecture / Mental Model

```mermaid
flowchart LR
  subgraph lane_0["Client"]
    app["Application"]
  end
  subgraph lane_1["Access"]
    pool["Pool / Router"]
  end
  subgraph lane_2["Write Path"]
    primary["Primary Store"]
  end
  subgraph lane_3["Read Path"]
    read["Replica / Cache"]
  end
  subgraph lane_4["Ops"]
    ops["Backup / Monitor"]
  end
  app -->|"ingress"| pool
  pool -->|"sync request"| primary
  primary -.->|"async event"| read
  primary -->|"state access"| ops
  ops -.->|"replay / repair"| read
```

## Runtime / Sequence

```mermaid
sequenceDiagram
  participant a0 as App
  participant a1 as Connection Pool
  participant a2 as Storage Engine
  participant a3 as Replica / Cache
  participant a4 as Operator
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan

- Flow lab available: step-by-step path highlighting.
- UML sequence simulation available: actor messages animate in order.
- Architecture map available: clickable nodes and sync/async links.
- Live visual exists in app: topic-specific canvas/ReactViz animation.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Example

```java
// Token Bucket - distributed implementation with Redis Lua
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

// Sliding window counter (hybrid - Cloudflare approach)
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
}
```

Notes:
Lua scripts execute atomically in Redis - no race conditions between check and increment. Essential for correctness in distributed rate limiting.

## Complexity And Performance

- O(N)
- O(1)

## Interview Drills

1. Design a rate limiter for an API that allows 100 requests per minute per user.
   Answer: **Requirements clarification:**
   - Per user (not global)
   - Distributed (multiple API servers)
   - Algorithm: Token bucket (allows burst up to 100, refills 100/min = 1.67/sec)

   **Design:**
   1. **Storage:** Redis hash per user: `{tokens: 95.2, lastRefill: 1701234567890}`
   2. **Algorithm:** On each request, Lua script: calculate elapsed since lastRefill -> add tokens at rate 1.67/s -> if tokens >= 1 -> decrement -> allow; else -> 429
   3. **Headers:** Return `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining: 45`, `X-RateLimit-Reset: 1701234620`
   4. **Scale:** Redis Cluster handles millions of users. Each key is tiny (~50 bytes).
   5. **Edge cases:** Clock skew across servers -> use Redis server time (TIME command). Redis unavailable -> fail open (allow) or fail closed (reject).

   **Capacity:** 10M users x 50 bytes/user = 500MB Redis memory. Single Redis node handles 100K ops/s.
   Follow-ups: How do you handle rate limiting across multiple regions?; What are the trade-offs between token bucket and leaky bucket?

## Trade-offs

Pros:

- Token bucket: allows bursts, smooth average
- Sliding window: accurate, prevents boundary burst
- Redis Lua: atomic, no race conditions

Cons:

- Distributed clocks add complexity
- Redis becomes a dependency - must be HA
- Too strict limits frustrate legitimate users

When to use:
Rate limit at: API gateway (global), per user, per IP. Use token bucket for API rate limiting. Leaky bucket for queue-based downstream protection.

## Gotchas

_No gotchas configured._
