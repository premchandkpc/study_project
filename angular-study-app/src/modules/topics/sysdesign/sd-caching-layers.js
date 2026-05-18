(function() {
  var topic = {
    id:"sd-caching-layers", area:"sysdesign",
    title:"Caching Layers — Browser to DB, Eviction & Strategies",
    tag:"Caching", tags:["cache","redis","memcached","cdn cache","browser cache","eviction","lru","write-through","write-back","cache aside"],
    concept:`**Caching hierarchy (closest to user → furthest):**

1. **Browser cache** — Cache-Control, ETag. Free; respects max-age/must-revalidate.
2. **CDN cache** — Shared across all users. Cloudflare/Akamai PoPs. HIT rate 80-95% for static assets.
3. **Reverse proxy cache** — nginx proxy_cache / Varnish. In-datacenter, shared by all app instances.
4. **Application-level (local)** — In-process; Caffeine (Java), bigcache (Go). Zero network latency. Not shared across instances.
5. **Distributed cache** — Redis / Memcached. Shared across all app instances. 1-3ms network latency.
6. **DB buffer pool** — PostgreSQL shared_buffers. Auto-managed. Hot pages kept in RAM.

**Cache strategies:**

| Strategy | Write | Read | Consistency | Use Case |
|---|---|---|---|---|
| Cache-aside (lazy) | App writes DB only | App checks cache, miss → DB + populate | Eventual | General read-heavy |
| Read-through | App writes DB | Cache fetches from DB on miss | Eventual | Library-managed (Spring Cache) |
| Write-through | App writes cache + DB | Cache always hit | Strong | Config, critical reads |
| Write-back (write-behind) | App writes cache; async flush to DB | Cache always hit | Eventual (risk of loss) | Write-heavy, tolerate small loss |
| Refresh-ahead | Pre-warm before expiry | Cache always hit | Strong | Predictable access patterns |

**Eviction policies:**
- **LRU** (Least Recently Used) — evict oldest accessed. Best general-purpose.
- **LFU** (Least Frequently Used) — evict least accessed. Better for scan-resistant hot items.
- **TTL** — time-based expiry regardless of access. Simple, prevents stale data.
- **FIFO** — evict oldest added. Rarely optimal.
- **Random** — fast but arbitrary.`,
    why:"A well-designed cache can reduce DB load by 90% and response latency from 50ms to <1ms. Cache design is asked in virtually every system design interview.",
    example:{
      language:"java",
      code:`// Spring Boot — multi-level caching with Caffeine (L1) + Redis (L2)
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory redis) {
        // L1: local Caffeine (in-process, 0ms)
        CaffeineCacheManager l1 = new CaffeineCacheManager("products");
        l1.setCaffeine(Caffeine.newBuilder()
            .maximumSize(1_000)
            .expireAfterWrite(30, TimeUnit.SECONDS)
            .recordStats());

        // L2: Redis (distributed, 1-3ms)
        RedisCacheManager l2 = RedisCacheManager.builder(redis)
            .cacheDefaults(RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .serializeValuesWith(RedisSerializationContext
                    .SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer())))
            .build();

        return new CompositeCacheManager(l1, l2);
    }
}

@Service
public class ProductService {

    @Cacheable(value = "products", key = "#id",
               unless = "#result == null")
    public Product getProduct(String id) {
        // Only called on cache miss (L1 + L2 both missed)
        return productRepository.findById(id).orElse(null);
    }

    @CacheEvict(value = "products", key = "#product.id")
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }

    // Evict all on bulk update
    @CacheEvict(value = "products", allEntries = true)
    public void clearAll() {}
}`,
      notes:"CompositeCacheManager checks L1 first (Caffeine); on miss, checks L2 (Redis); on miss, calls the actual method and populates both caches."
    },
    interview:[
      {question:"What is cache stampede and how do you prevent it?",
        answer:"Cache stampede (thundering herd): when a popular key expires, hundreds of concurrent requests all miss simultaneously, flood the DB, possibly causing cascade failure.\n\n**Prevention:**\n1. **Mutex/distributed lock** — first miss takes a Redis lock, fetches from DB, populates cache, releases lock. Others wait (risk: lock becomes bottleneck).\n2. **Probabilistic early expiration (XFetch)** — each request has a small random chance of refreshing the cache before it expires. No thundering herd.\n3. **Stale-while-revalidate** — serve stale data immediately; refresh in background.\n4. **Background refresh** — scheduled job refreshes popular keys before TTL, never letting them expire under load.",
        followUps:["Implement a thread-safe LRU cache in Java.","What is the XFetch algorithm?"]
      },
      {question:"When would you use write-back caching and what are the risks?",
        answer:"Write-back (write-behind): writes go to cache first; DB is updated asynchronously in batches.\n\n**When to use:** write-heavy workloads where DB can't keep up (IoT telemetry, counters, leaderboards). Dramatically reduces DB write pressure.\n\n**Risks:**\n- **Data loss** — if cache node crashes before flush, unflushed writes are lost. Mitigate with Redis AOF persistence + replicas.\n- **Stale DB reads** — direct DB queries bypass cache and see old data.\n- **Complex failure recovery** — need to track which writes are pending.\n\nAcceptable for: view counts, like counts, analytics. NOT acceptable for: financial transactions, inventory.",
        followUps:["How does Redis AOF persistence work?"]
      }
    ],
    tradeoffs:{
      pros:["10-100× latency reduction","Dramatic DB load reduction","Horizontal read scale via shared distributed cache"],
      cons:["Cache invalidation is hard","Memory cost","Cache-aside introduces inconsistency window"],
      when:"Cache-aside for most applications. Write-through for config/reference data. Write-back for high-volume counters. Always set TTL — never cache indefinitely without expiry."
    },
    visual: {
      type: "flow",
      title: "Caching Layers — Browser to DB",
      direction: "vertical",
      nodes: [
        { id: "client",   label: "Client",          color: "#58a6ff", icon: "💻", sublabel: "Initiates request" },
        { id: "browser",  label: "Browser Cache",   color: "#3fb950", icon: "🌐", sublabel: "0ms — Cache-Control / ETag" },
        { id: "cdn",      label: "CDN Edge",         color: "#58a6ff", icon: "⚡", sublabel: "5ms — Cloudflare / Akamai PoP" },
        { id: "redis",    label: "Redis / Memcached", color: "#ffa657", icon: "🗄️", sublabel: "1ms — distributed shared cache" },
        { id: "appcache", label: "App Cache (L1)",   color: "#bc8cff", icon: "⚙️", sublabel: "0ms — Caffeine / in-process" },
        { id: "db",       label: "Database",         color: "#8b949e", icon: "💾", sublabel: "20ms+ — source of truth" }
      ],
      connections: [
        { from: "client",   to: "browser",  label: "request",    protocol: "HTTP" },
        { from: "browser",  to: "cdn",      label: "cache miss", protocol: "HTTPS" },
        { from: "cdn",      to: "redis",    label: "cache miss", protocol: "HTTP" },
        { from: "redis",    to: "appcache", label: "cache miss", protocol: "HTTP" },
        { from: "appcache", to: "db",       label: "cache miss", protocol: "SQL" }
      ],
      scenarios: [
        { name: "Browser Cache Hit", path: ["client","browser"],              result: "HIT — 0ms (free)",               resultColor: "#3fb950" },
        { name: "CDN Cache Hit",     path: ["client","browser","cdn"],        result: "HIT — ~5ms (edge)",              resultColor: "#3fb950" },
        { name: "Redis Cache Hit",   path: ["client","browser","cdn","redis"], result: "HIT — ~6ms (distributed cache)", resultColor: "#ffa657" },
        { name: "DB Miss (cold)",    path: ["client","browser","cdn","redis","appcache","db"], result: "MISS — ~20ms+ (DB query)", resultColor: "#f85149" }
      ]
    },
    architecture:{
      title:"Caching Layers — Full Hierarchy",
      caption:"Each cache layer serves a subset of traffic; DB sees only cache misses",
      lanes:[
        {label:"Client Side",nodes:[
          {id:"browser-cache",label:"Browser Cache",hint:"Cache-Control, ETag",detail:"Free cache in user's browser. max-age controls TTL. ETag enables conditional requests (304 Not Modified). Zero network cost on hit."},
          {id:"sw-cache",label:"Service Worker Cache",hint:"PWA offline cache",detail:"Programmable cache for PWAs. Can cache API responses, enable offline mode."}
        ]},
        {label:"Network Edge",nodes:[
          {id:"cdn-cache",label:"CDN Cache",hint:"Cloudflare/Akamai PoP",detail:"Closest datacenter to user. Static assets cached for hours/days. HIT serves at ~5ms vs 150ms+ to origin."}
        ]},
        {label:"Origin Infrastructure",nodes:[
          {id:"reverse-proxy",label:"Reverse Proxy Cache",hint:"nginx proxy_cache / Varnish",detail:"In-datacenter shared cache. All app instances share one proxy cache. Good for pages with common structure."},
          {id:"local-cache",label:"Local App Cache",hint:"Caffeine / bigcache",detail:"In-process memory. Zero network latency. Not shared across instances — each pod has its own copy."},
          {id:"redis",label:"Redis Cluster",hint:"Distributed shared cache",detail:"All app instances share Redis. 1-3ms latency. Cluster mode with consistent hashing. 99.99% availability."}
        ]},
        {label:"Data Store",nodes:[
          {id:"db-buffer",label:"DB Buffer Pool",hint:"PostgreSQL shared_buffers",detail:"Hot pages kept in RAM by DB engine. Automatically managed. Set shared_buffers to 25% of RAM."},
          {id:"disk-db",label:"Disk Storage",hint:"Last resort — slowest",detail:"SSD reads at ~0.1ms, HDD at ~10ms. Cache hierarchy exists to avoid reaching here."}
        ]}
      ],
      links:[
        {from:"browser-cache",to:"cdn-cache",label:"Cache miss → CDN",detail:"Browser cache expiry sends request to CDN edge.",type:"sync"},
        {from:"cdn-cache",to:"reverse-proxy",label:"CDN miss → origin",detail:"CDN cache miss forwards to origin. CDN populates on response.",type:"sync"},
        {from:"reverse-proxy",to:"redis",label:"Proxy miss → Redis",detail:"nginx cache miss hits app server which checks Redis.",type:"sync"},
        {from:"redis",to:"db-buffer",label:"Redis miss → DB",detail:"Redis cache miss: app queries DB. DB checks buffer pool first.",type:"sync"},
        {from:"db-buffer",to:"disk-db",label:"Buffer miss → disk",detail:"Page fault: DB reads from disk into buffer pool.",type:"sync"}
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
