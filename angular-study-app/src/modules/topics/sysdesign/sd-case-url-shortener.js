(function() {
  var topic = {
  id:"sd-case-url-shortener", area:"sysdesign",
  title:"Case Study: URL Shortener (TinyURL / Bit.ly)",
  tag:"Case Study", tags:["url shortener","tinyurl","base62","bloom filter","analytics","redirect","case study"],
  concept:`**Requirements:**
- Shorten a long URL to a 7-character code (base62: a-z, A-Z, 0-9)
- Redirect short URL → original URL
- Optional: expiry, custom aliases, click analytics
- Scale: 100M URLs created/day, 10B redirects/day (read-heavy 100:1)

**Core algorithm — ID generation:**
1. Generate unique 64-bit ID (Snowflake or auto-increment DB)
2. Encode to base62: \`62^7 = 3.5 trillion\` unique codes — sufficient for decades

**Architecture decisions:**

**Storage:** DynamoDB or Redis (hash) — key: shortCode → { originalUrl, createdAt, expiresAt, userId }.
Cache in Redis (TTL 24h) — 99% of redirects served from cache.

**Redirect flow:**
\`short.ly/abc123\` → DNS → CDN edge (cache HIT ~80%) → API server → Redis lookup → 301/302 redirect.

**301 vs 302:**
- 301 (Permanent): browser caches redirect → no server hit on repeat. Reduces load but no analytics.
- 302 (Temporary): browser always checks server → full analytics but more load.
- Solution: serve 302 for analytics; 301 only for CDN-cached redirects.

**Analytics:** Async — on redirect, publish event to Kafka. Analytics consumers aggregate: clicks/hour, geo, device, referer. Write to ClickHouse / Redshift.

**Collision handling:** Bloom filter checks if generated code exists before DB insert. If collision (rare), regenerate.

**Custom aliases:** Check availability in DB. Rate-limit custom alias creation to prevent squatting.`,
  why:`URL shortener is the entry-level system design question. Expected to cover: encoding, storage choice, caching, redirect semantics, scale calculation.`,
  example:{
    language:"java",
    code:`// URL Shortener core logic
@Service
public class UrlShortenerService {

    @Autowired private UrlRepository urlRepo;          // DynamoDB / PostgreSQL
    @Autowired private RedisTemplate<String,String> redis;
    @Autowired private SnowflakeIdGenerator idGen;
    @Autowired private KafkaTemplate<String,ClickEvent> kafka;

    private static final String BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    public String shorten(String originalUrl, String userId) {
        // Dedup: check if this user already shortened this URL
        Optional<String> existing = urlRepo.findByOriginalAndUser(originalUrl, userId);
        if (existing.isPresent()) return "https://short.ly/" + existing.get();

        long id = idGen.nextId();
        String shortCode = toBase62(id);

        urlRepo.save(new UrlMapping(shortCode, originalUrl, userId,
                                    Instant.now().plus(365, ChronoUnit.DAYS)));
        return "https://short.ly/" + shortCode;
    }

    public String redirect(String shortCode, HttpServletRequest req) {
        // L1: Redis cache
        String cached = redis.opsForValue().get("url:" + shortCode);
        if (cached != null) {
            publishClick(shortCode, req, "cache");
            return cached;
        }

        // L2: DB lookup
        UrlMapping mapping = urlRepo.findByCode(shortCode)
            .orElseThrow(() -> new NotFoundException("Short code not found"));

        if (mapping.isExpired()) throw new GoneException("Link expired");

        // Populate cache (TTL 24h for popular links)
        redis.opsForValue().set("url:" + shortCode, mapping.getOriginalUrl(),
                                Duration.ofHours(24));

        publishClick(shortCode, req, "db");
        return mapping.getOriginalUrl();
    }

    private void publishClick(String code, HttpServletRequest req, String source) {
        kafka.send("url.clicks", new ClickEvent(code,
            req.getHeader("X-Forwarded-For"),
            req.getHeader("User-Agent"),
            req.getHeader("Referer"),
            Instant.now()));
    }

    private String toBase62(long num) {
        StringBuilder sb = new StringBuilder();
        while (num > 0) { sb.append(BASE62.charAt((int)(num % 62))); num /= 62; }
        return sb.reverse().toString();
    }
}`,
    notes:"Snowflake IDs are time-ordered — recent URLs get similar codes, which helps with cache locality (CDN prefix caching)."
  },
  interview:[
    {question:"How would you scale the URL shortener to 10 billion redirects per day?",
     answer:`10B/day = ~116K req/s. Peak ~3× = 350K req/s.\n\n**Read path (redirects):**\n1. **CloudFront/Fastly CDN** — cache redirects at edge (301 cached by browser, 302 cached by CDN with Cache-Control). 80% hit rate = 70K req/s to origin.\n2. **Redis Cluster** — remaining 30% (21K req/s) served from Redis (~sub-ms). 3-node cluster handles 500K ops/s easily.\n3. **DB** — only cold misses (<1% of traffic) hit the DB. DynamoDB or PostgreSQL with read replicas.\n\n**Write path (create):**\n100M/day = 1,160 creates/s. Single DynamoDB table with Snowflake IDs handles this easily.\n\n**Storage:** 100M URLs/day × 365 days × 5 years = 182B URLs. At 500 bytes/URL = 91TB. S3 for cold archive, DynamoDB for active.\n\n**Analytics:** Kafka at 350K events/s → Flink aggregations → ClickHouse for query.`,
     followUps:["How do you handle custom vanity URLs?","How would you detect and prevent abuse (spam/phishing)?"]
    }
  ],
  tradeoffs:{
    pros:["Simple read path — DynamoDB + Redis handles any scale","Base62 encoding is trivial to implement","CDN makes 80% of traffic free to serve"],
    cons:["Analytics adds complexity (Kafka + stream processing)","Custom alias creates need for availability check + rate limiting","URL expiry requires cleanup job (DynamoDB TTL handles this natively)"],
    when:"This design pattern (hash/encode → cache → redirect) applies to: QR codes, invite links, payment links, affiliate tracking."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var W = 460, H = 320;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    mount.appendChild(canvas);
    mount.appendChild(btnRow);
    var ctx = canvas.getContext('2d');

    var mode = 'shorten'; // 'shorten' | 'redirect'
    var step = 0;
    var maxSteps = { shorten: 5, redirect: 5 };
    var animT = 0, animDur = 30;
    var raf = null;
    var base62chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var shortCode = 'abc123';
    var charReveal = 0;
    var cacheHit = true;

    // Node positions for shorten flow
    var S = {
      client: {x:40, y:160, label:'Client', color:'#3fb950'},
      api:    {x:140, y:120, label:'API Server', color:'#58a6ff'},
      redis:  {x:280, y:80,  label:'Redis Cache', color:'#ffa657'},
      db:     {x:280, y:160, label:'DB (DynamoDB)', color:'#bc8cff'},
      lb:     {x:140, y:200, label:'Load Balancer', color:'#58a6ff'}
    };

    function box(x, y, w, h, fill, stroke, active) {
      ctx.fillStyle = active ? fill.replace(')', ',0.25)').replace('rgb','rgba') : '#161b22';
      ctx.strokeStyle = active ? fill : stroke || '#30363d';
      ctx.lineWidth = active ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, w, h, 6); ctx.fill(); ctx.stroke();
    }
    function lbl(x, y, text, color, size) {
      ctx.fillStyle = color||'#e6edf3'; ctx.font=(size||10)+'px monospace'; ctx.textAlign='center';
      ctx.fillText(text, x, y);
    }
    function arw(x1,y1,x2,y2,color,dashed) {
      ctx.strokeStyle=color||'#30363d'; ctx.lineWidth=1.5;
      if(dashed) ctx.setLineDash([4,3]); else ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.setLineDash([]);
      var dx=x2-x1,dy=y2-y1,L=Math.sqrt(dx*dx+dy*dy); if(L<1)return;
      var ux=dx/L,uy=dy/L;
      ctx.fillStyle=color||'#30363d';
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-ux*7-uy*3,y2-uy*7+ux*3);
      ctx.lineTo(x2-ux*7+uy*3,y2-uy*7-ux*3);
      ctx.fill();
    }

    function drawShorten() {
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);
      lbl(W/2, 18, 'URL SHORTEN FLOW', '#8b949e', 11);

      var nodes = [
        {id:'client', x:40,  y:160, w:62, h:36, label:'Client', color:'#3fb950'},
        {id:'api',    x:150, y:120, w:80, h:36, label:'API Server', color:'#58a6ff'},
        {id:'redis',  x:290, y:80,  w:88, h:36, label:'Redis Cache', color:'#ffa657'},
        {id:'db',     x:290, y:160, w:88, h:36, label:'DB (Dynamo)', color:'#bc8cff'},
        {id:'ret',    x:40,  y:240, w:80, h:36, label:'shortUrl', color:'#3fb950'}
      ];
      var active = [];
      if (step>=1) active.push('client','api');
      if (step>=2) active.push('api','redis');
      if (step>=3) active.push('api','db');
      if (step>=4) active.push('client','ret');

      nodes.forEach(function(n){
        var a = active.indexOf(n.id)!==-1;
        box(n.x,n.y,n.w,n.h,'#58a6ff','#30363d',a);
        lbl(n.x,n.y+1,n.label, a?n.color:'#8b949e',10);
      });

      // Arrows
      if (step>=1) { arw(40+31,160-5,150-40,130,'#3fb950'); lbl(85,135,'POST longUrl','#3fb950',9); }
      if (step>=2) { arw(150+40,110,290-44,88,'#ffa657',true); lbl(220,88,'cache store','#ffa657',9); }
      if (step>=3) { arw(150+40,130,290-44,155,'#bc8cff',true); lbl(220,162,'DB write','#bc8cff',9); }
      if (step>=4) { arw(150-40,138,40+40,235,'#3fb950'); lbl(88,185,'return shortUrl','#3fb950',9); }

      // Base62 animation
      if (step>=2) {
        var cx2 = 150, cy2 = 70;
        ctx.fillStyle='#161b22'; ctx.strokeStyle='#ffa657'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(cx2-60,cy2-14,120,26,4); ctx.fill(); ctx.stroke();
        var code = shortCode.substring(0, charReveal);
        lbl(cx2, cy2+5, 'base62: ' + code + (charReveal<shortCode.length?'|':''), '#ffa657', 10);
      }

      // Status
      var steps = ['Click [Shorten] to start','POST longUrl → API Server','Counter → base62 encoding: ' + shortCode,'Store in Redis + DB','Return https://short.ly/' + shortCode + ' ✓'];
      lbl(W/2, H-10, steps[Math.min(step, steps.length-1)], '#58a6ff', 10);
    }

    function drawRedirect() {
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);
      lbl(W/2, 18, 'URL REDIRECT FLOW  ' + (cacheHit?'[Redis HIT]':'[Redis MISS → DB]'), '#8b949e', 11);

      var nodes = [
        {id:'client', x:40,  y:160, w:62, h:36, label:'Client', color:'#3fb950'},
        {id:'lb',     x:150, y:120, w:80, h:36, label:'Load Bal', color:'#58a6ff'},
        {id:'redis',  x:290, y:80,  w:88, h:36, label:'Redis', color:'#ffa657'},
        {id:'db',     x:290, y:160, w:88, h:36, label:'DB', color:'#bc8cff'},
        {id:'dest',   x:40,  y:240, w:80, h:36, label:'Destination', color:'#3fb950'}
      ];

      nodes.forEach(function(n){
        var a = step>=1;
        box(n.x,n.y,n.w,n.h,'#58a6ff','#30363d',false);
        lbl(n.x,n.y+1,n.label,'#8b949e',10);
      });

      if (step>=1) {
        arw(40+31,155,150-40,128,'#3fb950'); lbl(87,132,'GET /abc123','#3fb950',9);
        box(nodes[1].x,nodes[1].y,nodes[1].w,nodes[1].h,'#58a6ff','#30363d',true);
        lbl(nodes[1].x,nodes[1].y+1,nodes[1].label,'#58a6ff',10);
      }
      if (step>=2) {
        arw(150+40,112,290-44,88,'#ffa657'); lbl(220,90,'HGET url:abc123','#ffa657',9);
        box(nodes[2].x,nodes[2].y,nodes[2].w,nodes[2].h,'#ffa657','#30363d',true);
        lbl(nodes[2].x,nodes[2].y+1,nodes[2].label,'#ffa657',10);
      }
      if (step>=3 && !cacheHit) {
        arw(150+40,130,290-44,155,'#bc8cff'); lbl(222,152,'DB lookup (miss)','#bc8cff',9);
        box(nodes[3].x,nodes[3].y,nodes[3].w,nodes[3].h,'#bc8cff','#30363d',true);
        lbl(nodes[3].x,nodes[3].y+1,nodes[3].label,'#bc8cff',10);
      }
      if (step>=4) {
        arw(150-40,138,40+40,235,'#3fb950'); lbl(83,185,'302 → longUrl','#3fb950',9);
        box(nodes[4].x,nodes[4].y,nodes[4].w,nodes[4].h,'#3fb950','#30363d',true);
        lbl(nodes[4].x,nodes[4].y+1,nodes[4].label,'#3fb950',10);
      }

      // hit/miss badge
      if (step>=2) {
        var badge = cacheHit ? 'HIT ✓' : 'MISS ✗';
        var bc = cacheHit ? '#3fb950' : '#f85149';
        ctx.fillStyle=bc; ctx.font='bold 11px monospace'; ctx.textAlign='center';
        ctx.fillText(badge, 290, 58);
      }

      var steps = ['Click [Redirect] to start','GET /abc123 → Load Balancer','Redis lookup...', cacheHit?'Cache HIT → 302':'Cache MISS → DB query','302 redirect to original URL ✓'];
      lbl(W/2, H-10, steps[Math.min(step, steps.length-1)], '#58a6ff', 10);
    }

    function draw() {
      if (!document.body.contains(canvas)) return;
      if (mode==='shorten') drawShorten(); else drawRedirect();
    }

    function startFlow(m) {
      mode = m; step=0; charReveal=0;
      if (raf) cancelAnimationFrame(raf);
      var interval = setInterval(function(){
        if (!document.body.contains(canvas)) { clearInterval(interval); return; }
        step++;
        if (mode==='shorten' && step>=2 && charReveal<shortCode.length) charReveal++;
        draw();
        if (step >= maxSteps[mode]) clearInterval(interval);
      }, 700);
    }

    draw();

    [{label:'Shorten URL',fn:function(){startFlow('shorten');}},{label:'Redirect',fn:function(){cacheHit=true;startFlow('redirect');}},{label:'Redirect (miss)',fn:function(){cacheHit=false;startFlow('redirect');}}]
    .forEach(function(op){
      var b=document.createElement('button'); b.textContent=op.label; b.style.cssText=btnStyle; b.onclick=op.fn; btnRow.appendChild(b);
    });
  },
  architecture:{
    title:"URL Shortener Architecture",
    caption:"Read-heavy: CDN → Redis → DB. Write: DB → Kafka → Analytics",
    lanes:[
      {label:"Client",nodes:[
        {id:"browser",label:"Browser",hint:"Follows short URL"}
      ]},
      {label:"Edge",nodes:[
        {id:"cdn",label:"CloudFront CDN",hint:"Caches 301/302 redirects",detail:"CDN caches redirect responses. 301 cached by browser (no CDN hit next time). 302 cached at CDN edge per Cache-Control."},
        {id:"waf",label:"WAF",hint:"Bot/abuse protection",detail:"Rate limit per IP. Block known phishing/spam domains. CAPTCHA for abuse patterns."}
      ]},
      {label:"Application",nodes:[
        {id:"api",label:"API Server (ECS)",hint:"Redirect + create endpoints",detail:"Stateless. Handles redirect: cache lookup → DB lookup → 302. Handles create: ID gen → base62 encode → DB write."},
        {id:"redis",label:"Redis Cluster",hint:"Redirect cache (24h TTL)",detail:"Hot URL cache. 99% of redirects served here after first DB lookup. Sub-millisecond response."}
      ]},
      {label:"Storage",nodes:[
        {id:"dynamo",label:"DynamoDB",hint:"Short code → URL mapping",detail:"Primary store. Partition key: shortCode. TTL attribute for expiry. Pay-per-request pricing at 100M writes/day."},
        {id:"kafka",label:"Kafka",hint:"Click events stream",detail:"Every redirect publishes ClickEvent. Async — doesn't block redirect response."},
        {id:"clickhouse",label:"ClickHouse",hint:"Analytics aggregations",detail:"Columnar OLAP DB. Stores click events. Queries: clicks/URL/hour, geo distribution, top referrers."}
      ]}
    ],
    links:[
      {from:"browser",to:"cdn",label:"GET /abc123",detail:"Browser follows short URL. CDN checks cache first.",type:"sync"},
      {from:"cdn",to:"api",label:"Cache miss → origin",detail:"CDN forwards uncached requests to ALB → API servers.",type:"sync"},
      {from:"api",to:"redis",label:"HGET url:abc123",detail:"Redis lookup — O(1), sub-millisecond.",type:"sync"},
      {from:"api",to:"dynamo",label:"Cache miss → DB",detail:"DynamoDB GetItem on shortCode key. Consistent read.",type:"sync"},
      {from:"api",to:"browser",label:"302 Location: https://...",detail:"Redirect response. Browser follows to original URL.",type:"sync"},
      {from:"api",to:"kafka",label:"Async click event",detail:"Click event published without blocking redirect.",type:"async"},
      {from:"kafka",to:"clickhouse",label:"Stream processing",detail:"Flink aggregates clicks → ClickHouse batch inserts.",type:"async"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
