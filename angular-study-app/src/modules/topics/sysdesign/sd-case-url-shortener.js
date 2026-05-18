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
  visual: {
    type: 'flow',
    title: 'URL Shortener — Request Flow',
    direction: 'horizontal',
    autoPlay: false,
    nodes: [
      { id: 'user',    label: 'User',           icon: '💻', color: '#3fb950', sublabel: 'Browser / App' },
      { id: 'lb',      label: 'Load Balancer',  icon: '⚖️', color: '#58a6ff', sublabel: 'ALB / Nginx' },
      { id: 'api',     label: 'API Server',     icon: '🖥️', color: '#58a6ff', sublabel: 'Stateless ECS' },
      { id: 'hash',    label: 'Hash Service',   icon: '🔑', color: '#e3b341', sublabel: 'Snowflake + Base62' },
      { id: 'redis',   label: 'Redis Cache',    icon: '⚡', color: '#ffa657', sublabel: 'TTL 24h · sub-ms' },
      { id: 'db',      label: 'Cassandra DB',   icon: '🗄️', color: '#bc8cff', sublabel: 'shortCode → longUrl' },
    ],
    connections: [
      { from: 'user',  to: 'lb',    label: 'HTTPS',         protocol: 'REST' },
      { from: 'lb',    to: 'api',   label: 'HTTP',          protocol: 'REST' },
      { from: 'api',   to: 'hash',  label: 'encode(id)',    protocol: 'RPC'  },
      { from: 'api',   to: 'redis', label: 'HGET / HSET',  protocol: 'Redis' },
      { from: 'api',   to: 'db',    label: 'GET / PUT',     protocol: 'CQL'  },
      { from: 'redis', to: 'api',   label: 'longUrl',       protocol: 'Redis' },
    ],
    scenarios: [
      { name: 'Shorten URL',   path: ['user','lb','api','hash','redis','db'],    result: '✓ short.ly/abc123 created',     resultColor: '#3fb950' },
      { name: 'Redirect (Cache Hit)',  path: ['user','lb','api','redis'],        result: '✓ 302 → longUrl (0.5ms)',       resultColor: '#3fb950' },
      { name: 'Redirect (Cache Miss)', path: ['user','lb','api','redis','db'],   result: '✓ 302 → longUrl (DB fallback)', resultColor: '#ffa657' },
    ],
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
