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
  visual: function(mount) {
    var W = 480, H = 220;

    // Controls
    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;justify-content:center';
    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:5px 16px;border-radius:6px;border:1px solid #4f8cff55;background:rgba(79,140,255,0.12);color:#4f8cff;cursor:pointer;font-size:13px;font-family:monospace';
    var sendBtn = document.createElement('button');
    sendBtn.textContent = '⊕ Send Request';
    sendBtn.style.cssText = 'padding:5px 16px;border-radius:6px;border:1px solid #3fb95055;background:rgba(63,185,80,0.1);color:#3fb950;cursor:pointer;font-size:13px;font-family:monospace';
    ctrl.appendChild(playBtn); ctrl.appendChild(sendBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:480px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var CAPACITY = 10, tokens = 10, REFILL_RATE = 0.03;
    var requests = [], lastReject = 0;
    var running = false, rafId = null, intervalId = null;

    function drawStatic() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
      // Bucket outline
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 2;
      ctx.fillStyle = '#161b22';
      ctx.beginPath(); ctx.roundRect(40, 40, 100, 140, 8); ctx.fill(); ctx.stroke();
      // Fill
      var fillH = (tokens / CAPACITY) * 128;
      var grad = ctx.createLinearGradient(40, 180 - fillH, 40, 180);
      grad.addColorStop(0, '#00e5ff88'); grad.addColorStop(1, '#00b8d4cc');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(44, 180 - fillH, 92, fillH, [0,0,6,6]); ctx.fill();
      // Count
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
      ctx.fillText(tokens.toFixed(1), 90, 115);
      ctx.font = '11px monospace'; ctx.fillStyle = '#8b949e';
      ctx.fillText('tokens', 90, 130);
      ctx.font = 'bold 12px monospace'; ctx.fillStyle = '#00e5ff';
      ctx.fillText('Token Bucket', 90, 30);
      ctx.fillStyle = '#3fb950'; ctx.font = '11px monospace'; ctx.textAlign = 'left';
      ctx.fillText('↑ refill: ' + (REFILL_RATE * 60).toFixed(1) + '/s', 155, 50);
      ctx.fillStyle = '#8b949e';
      ctx.fillText('capacity: ' + CAPACITY, 155, 68);
      // Legend
      ctx.fillStyle = '#3fb950';
      ctx.beginPath(); ctx.arc(155, 100, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e6edf3'; ctx.fillText('allowed', 165, 104);
      ctx.fillStyle = '#f85149';
      ctx.beginPath(); ctx.arc(155, 118, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e6edf3'; ctx.fillText('rejected', 165, 122);
      // Hint when paused
      if (!running) {
        ctx.fillStyle = '#8b949e'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Press ▶ Play to animate · ⊕ Send Request to test', W/2, H - 10);
      }
    }

    function addRequest() {
      if (tokens >= 1) {
        tokens -= 1;
        requests.push({x: 420, y: 60, status: 'ok', alpha: 1.0});
      } else {
        lastReject = Date.now();
        requests.push({x: 420, y: 60, status: 'reject', alpha: 1.0});
      }
    }

    function frame() {
      if (!running || !document.body.contains(canvas)) return;
      rafId = requestAnimationFrame(frame);
      tokens = Math.min(CAPACITY, tokens + REFILL_RATE);
      drawStatic();
      // Requests
      requests = requests.filter(function(r) { return r.alpha > 0; });
      requests.forEach(function(r) {
        r.x -= 4; r.alpha -= 0.018;
        var col = r.status === 'ok' ? '#3fb950' : '#f85149';
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(r.x, r.y, 7, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      if (Date.now() - lastReject < 400) {
        ctx.fillStyle = '#f8514933'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#f85149'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
        ctx.fillText('429 Too Many Requests', W/2, H - 20);
      }
    }

    function start() {
      running = true;
      playBtn.textContent = '⏸ Pause';
      playBtn.style.color = '#f0883e';
      playBtn.style.borderColor = '#f0883e55';
      intervalId = setInterval(function() {
        if (document.body.contains(canvas) && running) addRequest();
        else clearInterval(intervalId);
      }, 900);
      frame();
    }

    function pause() {
      running = false;
      playBtn.textContent = '▶ Play';
      playBtn.style.color = '#4f8cff';
      playBtn.style.borderColor = '#4f8cff55';
      if (rafId) cancelAnimationFrame(rafId);
      if (intervalId) clearInterval(intervalId);
      drawStatic();
    }

    playBtn.addEventListener('click', function() {
      running ? pause() : start();
    });
    sendBtn.addEventListener('click', function() {
      addRequest();
      if (!running) drawStatic();
    });

    // Draw initial static frame
    drawStatic();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
