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
  why:`Redis is the most commonly used cache and real-time data structure in backend systems. Every platform (Airbnb, Twitter, GitHub) uses it for rate limiting, sessions, and pub/sub.`,
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
     answer:`Redis offers two persistence mechanisms:\n\n**RDB (snapshot):** Fork the process, write a point-in-time snapshot to disk. Zero overhead on main thread. Fork takes ~10ms for 10GB dataset. Data loss up to last snapshot interval (every 60s-900s).\n\n**AOF (Append-Only File):** Log every write command. Replayable on restart. \`fsync\` policy options:\n- \`always\` — fsync every write (safe, ~1ms overhead)\n- \`everysec\` — fsync every second (common choice — max 1s data loss)\n- \`no\` — OS decides (fastest, most data loss)\n\n**In production:** Enable both — RDB for fast restart, AOF for durability. Use \`appendfsync everysec\`.`,
     followUps:["What is Redis replication and how is it different from persistence?","Explain Redis Sentinel vs Redis Cluster."]
    }
  ],
  tradeoffs:{
    pros:["Sub-millisecond latency for all data structures","Rich atomic operations via Lua","Versatile — cache, queue, pub-sub, rate-limiter in one"],
    cons:["Data must fit in RAM (cluster helps but adds complexity)","Eventual consistency across replicas","Single-threaded command processing (I/O threaded since Redis 6)"],
    when:"Use Redis for: session store, rate limiting, leaderboards, pub-sub, distributed locks, job queues. Don't use as primary DB — use as cache/complement."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var tabs = ['Cache-Aside','Pub/Sub','Sorted Set'];
    var tabBtns = tabs.map(function(t) {
      var b = document.createElement('button'); b.textContent = t; b.style.cssText = btnStyle; return b;
    });
    tabBtns.forEach(function(b) { btnRow.appendChild(b); });
    wrap.appendChild(btnRow);

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var activeTab = 0;
    var animFrame = 0;
    var raf;

    // Tab highlight
    function setActiveTab(i) {
      activeTab = i;
      tabBtns.forEach(function(b, bi) {
        b.style.background = bi === i ? '#388bfd33' : '#21262d';
        b.style.borderColor = bi === i ? '#58a6ff' : '#30363d';
        b.style.color = bi === i ? '#58a6ff' : '#e6edf3';
      });
    }
    setActiveTab(0);

    function drawRR(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function drawBox(x, y, w, h, label, color) {
      drawRR(x, y, w, h, 5, '#161b22', color);
      ctx.fillStyle = color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText(label, x + w/2, y + h/2 + 4);
    }

    function arrow(x1, y1, x2, y2, color, label) {
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      var ang = Math.atan2(y2-y1, x2-x1);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x2,y2);
      ctx.lineTo(x2-10*Math.cos(ang-0.4), y2-10*Math.sin(ang-0.4));
      ctx.lineTo(x2-10*Math.cos(ang+0.4), y2-10*Math.sin(ang+0.4));
      ctx.closePath(); ctx.fill();
      if (label) {
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        var mx = (x1+x2)/2, my = (y1+y2)/2;
        ctx.fillText(label, mx + 4, my - 4);
      }
    }

    // Tab 0: Cache-Aside
    var cacheWarm = false;
    function drawCacheAside() {
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Cache-Aside (Lazy Loading)', 230, 22);

      // Boxes
      drawBox(10, 50, 80, 36, 'App', '#58a6ff');
      drawBox(180, 50, 80, 36, 'Redis', '#ffa657');
      drawBox(360, 50, 80, 36, 'DB', '#8b949e');

      var phase = Math.floor(animFrame / 30) % 6;

      // Phase animation
      var steps = [
        {from:[50,68], to:[220,68], col:'#58a6ff', label:'GET key'},
        {from:[220,68], to:[50,68], col: cacheWarm ? '#3fb950' : '#f85149', label: cacheWarm ? 'HIT ✓' : 'MISS ✗'},
        {from:[50,68], to:[400,68], col:'#58a6ff', label:'query DB'},
        {from:[400,68], to:[50,68], col:'#3fb950', label:'result'},
        {from:[50,68], to:[220,68], col:'#3fb950', label:'SET key'},
        {from:[220,68], to:[50,68], col:'#3fb950', label:'cached ✓'}
      ];

      var progress = (animFrame % 30) / 30;
      var cur = steps[phase];
      var px = cur.from[0] + (cur.to[0]-cur.from[0]) * progress;
      var py = cur.from[1] + (cur.to[1]-cur.from[1]) * progress;

      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI*2);
      ctx.fillStyle = cur.col; ctx.fill();
      ctx.fillStyle = '#0d1117'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('PKT', px, py+3);

      // Step labels
      ctx.fillStyle = cur.col; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Step ' + (phase+1) + ': ' + cur.label, 230, 115);

      // All steps as breadcrumbs
      var allSteps = ['1.GET', '2.' + (cacheWarm?'HIT':'MISS'), '3.queryDB', '4.result', '5.SET', '6.cached'];
      allSteps.forEach(function(s, i) {
        ctx.fillStyle = i <= phase ? '#3fb950' : '#30363d';
        ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(s, 10 + i * 74, 140);
      });

      // Flow description
      var desc = [
        '1. App checks Redis for key',
        '2. Cache ' + (cacheWarm ? 'HIT → return immediately (fast)' : 'MISS → must query DB (slow)'),
        '3. App queries database for data',
        '4. DB returns result to App',
        '5. App writes result to Redis cache',
        '6. Future reads hit Redis (warm cache)'
      ];
      desc.forEach(function(d, i) {
        ctx.fillStyle = i <= phase ? '#e6edf3' : '#30363d';
        ctx.font = '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(d, 10, 165 + i*15);
      });

      if (phase === 5 && progress > 0.8) cacheWarm = true;
      animFrame++;
      raf = requestAnimationFrame(drawCacheAside);
    }

    // Tab 1: Pub/Sub
    var pubSubDots = [];
    var pubSubFrame = 0;
    function drawPubSub() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Pub/Sub — Fan-out to Subscribers', 230, 22);

      // Publisher
      drawBox(10, 80, 80, 36, 'Publisher', '#ffa657');
      // Redis topic
      drawBox(180, 80, 100, 36, 'Redis Topic', '#58a6ff');
      // 3 Subscribers
      var subY = [50, 100, 150];
      subY.forEach(function(sy, i) {
        drawBox(360, sy, 80, 32, 'Sub ' + (i+1), '#3fb950');
      });

      // Arrow pub→topic
      arrow(90, 98, 180, 98, '#ffa657', 'PUBLISH');
      // Arrows topic→subs
      subY.forEach(function(sy) {
        arrow(280, 98, 360, sy+16, '#58a6ff', '');
      });

      // Animate dots from topic to subs
      pubSubFrame++;
      if (pubSubFrame % 60 === 0) {
        subY.forEach(function(sy, i) {
          pubSubDots.push({fromX:280, fromY:98, toX:360, toY:sy+16, progress:0, delay:i*8});
        });
        // Also add dot from pub to topic
        pubSubDots.push({fromX:90, fromY:98, toX:180, toY:98, progress:0, delay:0, isPub:true});
      }

      pubSubDots.forEach(function(d) {
        if (d.delay > 0) { d.delay--; return; }
        d.progress = Math.min(1, d.progress + 0.04);
        var px = d.fromX + (d.toX-d.fromX)*d.progress;
        var py = d.fromY + (d.toY-d.fromY)*d.progress;
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = d.isPub ? '#ffa657' : '#3fb950'; ctx.fill();
      });
      pubSubDots = pubSubDots.filter(function(d) { return d.progress < 1; });

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      var lines = [
        'PUBLISH channel "msg" → Redis broadcasts to ALL subscribers',
        'Fan-out: 1 publish → N simultaneous deliveries',
        'Use for: chat, notifications, live feeds, cache invalidation',
        'No persistence: messages lost if subscriber offline (use Streams for durability)'
      ];
      lines.forEach(function(l, i) { ctx.fillText(l, 10, 220 + i*18); });

      raf = requestAnimationFrame(drawPubSub);
    }

    // Tab 2: Sorted Set Leaderboard
    var users = [
      {name:'alice', score:9800},
      {name:'bob', score:8750},
      {name:'carol', score:7200},
      {name:'dave', score:6100},
      {name:'eve', score:5500}
    ];
    var insertAnim = 0; // 0=idle, >0 = animating
    var newUser = {name:'frank', score:7900};
    var sortedUsers = users.slice().sort(function(a,b){return b.score-a.score;});
    var animPositions = null;

    function drawSortedSet() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Sorted Set Leaderboard — ZADD', 230, 22);

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
      ctx.fillText('ZADD leaderboard ' + newUser.score + ' ' + newUser.name + '   →   ZRANGE (top 3)', 10, 42);

      var rowH = 36, startY = 55, leftX = 10, rightX = 240;

      // Left: before insert
      ctx.fillStyle = '#8b949e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Before', leftX + 100, startY);

      // Right: after insert
      ctx.fillText('After ZADD', rightX + 100, startY);

      var before = users.slice().sort(function(a,b){return b.score-a.score;});
      var after = users.concat([newUser]).sort(function(a,b){return b.score-a.score;});

      // Colors for ranks
      var rankColors = ['#ffa657','#e6edf3','#8b949e','#8b949e','#8b949e','#8b949e'];

      before.forEach(function(u, i) {
        var y = startY + 14 + i * rowH;
        drawRR(leftX, y, 200, rowH-4, 4, '#161b22', i===0?'#ffa657':'#30363d');
        ctx.fillStyle = rankColors[i]; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
        ctx.fillText('#' + (i+1) + ' ' + u.name, leftX+8, y+rowH/2+4);
        ctx.textAlign = 'right';
        ctx.fillText(u.score.toLocaleString(), leftX+190, y+rowH/2+4);
      });

      after.forEach(function(u, i) {
        var y = startY + 14 + i * rowH;
        var isNew = u.name === newUser.name;
        var borderCol = isNew ? '#3fb950' : (i===0?'#ffa657':'#30363d');
        drawRR(rightX, y, 200, rowH-4, 4, isNew ? '#3fb95022' : '#161b22', borderCol);
        ctx.fillStyle = isNew ? '#3fb950' : rankColors[i]; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
        ctx.fillText('#' + (i+1) + ' ' + u.name + (isNew?' ← NEW':''), rightX+8, y+rowH/2+4);
        ctx.textAlign = 'right';
        ctx.fillText(u.score.toLocaleString(), rightX+190, y+rowH/2+4);
      });

      // ZRANGE top 3 result
      ctx.fillStyle = '#bc8cff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText('ZRANGE leaderboard 0 2 WITHSCORES →', 10, 268);
      after.slice(0,3).forEach(function(u, i) {
        ctx.fillStyle = rankColors[i]; ctx.font = '10px monospace';
        ctx.fillText('#'+(i+1)+' '+u.name+' ('+u.score+')', 10 + i*148, 284);
      });

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace';
      ctx.fillText('O(log N) insert · O(log N + k) range query', 10, 306);
    }

    var currentDraw = null;
    function stopAnim() { if (raf) cancelAnimationFrame(raf); raf = null; }

    tabBtns.forEach(function(b, i) {
      b.addEventListener('click', function() {
        stopAnim();
        setActiveTab(i);
        activeTab = i;
        animFrame = 0; pubSubFrame = 0; pubSubDots = []; cacheWarm = false;
        if (i === 0) drawCacheAside();
        else if (i === 1) drawPubSub();
        else drawSortedSet();
      });
    });

    drawCacheAside();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
