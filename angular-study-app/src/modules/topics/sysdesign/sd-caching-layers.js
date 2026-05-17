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
  why:`A well-designed cache can reduce DB load by 90% and response latency from 50ms to <1ms. Cache design is asked in virtually every system design interview.`,
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
     answer:`Cache stampede (thundering herd): when a popular key expires, hundreds of concurrent requests all miss simultaneously, flood the DB, possibly causing cascade failure.\n\n**Prevention:**\n1. **Mutex/distributed lock** — first miss takes a Redis lock, fetches from DB, populates cache, releases lock. Others wait (risk: lock becomes bottleneck).\n2. **Probabilistic early expiration (XFetch)** — each request has a small random chance of refreshing the cache before it expires. No thundering herd.\n3. **Stale-while-revalidate** — serve stale data immediately; refresh in background.\n4. **Background refresh** — scheduled job refreshes popular keys before TTL, never letting them expire under load.`,
     followUps:["Implement a thread-safe LRU cache in Java.","What is the XFetch algorithm?"]
    },
    {question:"When would you use write-back caching and what are the risks?",
     answer:`Write-back (write-behind): writes go to cache first; DB is updated asynchronously in batches.\n\n**When to use:** write-heavy workloads where DB can't keep up (IoT telemetry, counters, leaderboards). Dramatically reduces DB write pressure.\n\n**Risks:**\n- **Data loss** — if cache node crashes before flush, unflushed writes are lost. Mitigate with Redis AOF persistence + replicas.\n- **Stale DB reads** — direct DB queries bypass cache and see old data.\n- **Complex failure recovery** — need to track which writes are pending.\n\nAcceptable for: view counts, like counts, analytics. NOT acceptable for: financial transactions, inventory.`,
     followUps:["How does Redis AOF persistence work?"]
    }
  ],
  tradeoffs:{
    pros:["10-100× latency reduction","Dramatic DB load reduction","Horizontal read scale via shared distributed cache"],
    cons:["Cache invalidation is hard","Memory cost","Cache-aside introduces inconsistency window"],
    when:"Cache-aside for most applications. Write-through for config/reference data. Write-back for high-volume counters. Always set TTL — never cache indefinitely without expiry."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var bHit = document.createElement('button'); bHit.textContent = 'Cache Hit (Redis)'; bHit.style.cssText = btnStyle;
    var bMiss = document.createElement('button'); bMiss.textContent = 'Cache Miss (DB)'; bMiss.style.cssText = btnStyle;
    var bReset = document.createElement('button'); bReset.textContent = '↺ Reset'; bReset.style.cssText = btnStyle;
    btnRow.appendChild(bHit); btnRow.appendChild(bMiss); btnRow.appendChild(bReset);
    wrap.appendChild(btnRow);

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');

    var layers = [
      {label:'Browser Cache', latency:'0 ms', color:'#3fb950', y:20},
      {label:'CDN Edge', latency:'5 ms', color:'#58a6ff', y:76},
      {label:'Redis/Memcached', latency:'1 ms', color:'#ffa657', y:132},
      {label:'App Cache (L1)', latency:'2 ms', color:'#bc8cff', y:188},
      {label:'Database', latency:'20 ms', color:'#8b949e', y:244}
    ];
    var layerH = 48, layerX = 50, layerW = 320;

    // Packet animation state
    var packet = null; // {y, dir:'down'/'up', hitLayer, phase, alpha, label}
    var hitCount = 0, totalCount = 0;
    var raf;

    function drawRR(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 320);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 320);

      // Layers
      layers.forEach(function(l, i) {
        var isHit = packet && packet.hitLayer === i && packet.phase === 'hit';
        var borderColor = isHit ? (packet.dir === 'up' ? l.color : l.color) : '#30363d';
        var bgColor = isHit ? l.color + '33' : '#161b22';
        drawRR(layerX, l.y, layerW, layerH - 4, 6, bgColor, borderColor);
        ctx.fillStyle = l.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
        ctx.fillText(l.label, layerX + 10, l.y + 16);
        ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace';
        ctx.fillText('latency: ' + l.latency, layerX + 10, l.y + 30);

        // Arrow from this layer to next (down)
        if (i < layers.length - 1) {
          ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(layerX + layerW/2, l.y + layerH - 4); ctx.lineTo(layerX + layerW/2, layers[i+1].y); ctx.stroke();
          ctx.fillStyle = '#30363d'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
          ctx.fillText('miss →', layerX + layerW/2 + 20, l.y + layerH + 4);
        }
      });

      // Latency bar on right
      ctx.fillStyle = '#8b949e'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
      ctx.fillText('Latency', 385, 30);
      layers.forEach(function(l, i) {
        var barW = [2, 10, 3, 4, 40][i];
        ctx.fillStyle = l.color;
        ctx.fillRect(385, l.y + 14, barW, 10);
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace';
        ctx.fillText(l.latency, 385, l.y + 36);
      });

      // Packet
      if (packet) {
        var py = packet.y;
        var pcol = packet.phase === 'hit' ? '#3fb950' : (packet.phase === 'return' ? '#3fb950' : layers[Math.min(4, Math.floor((py - 20)/56))].color);
        ctx.beginPath(); ctx.arc(layerX + layerW/2, py, 9, 0, Math.PI*2);
        ctx.fillStyle = pcol; ctx.fill();
        ctx.fillStyle = '#0d1117'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(packet.label, layerX + layerW/2, py + 3);
      }

      // Hit rate counter
      var rate = totalCount > 0 ? Math.round(hitCount/totalCount*100) : 0;
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
      ctx.fillText('Cache Hit Rate: ' + rate + '%', 50, 306);
      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace';
      ctx.fillText('hits:' + hitCount + '  reqs:' + totalCount, 220, 306);
    }

    function animateHit(stopLayerIdx) {
      totalCount++;
      if (stopLayerIdx < 4) hitCount++;
      var targetY = layers[stopLayerIdx].y + (layerH-4)/2;
      packet = {y: layers[0].y + (layerH-4)/2, dir:'down', hitLayer: stopLayerIdx, phase:'falling', label:'REQ'};
      var raf2;
      function step() {
        if (!document.body.contains(canvas)) return;
        if (packet.phase === 'falling') {
          packet.y += 3;
          if (packet.y >= targetY) {
            packet.y = targetY; packet.phase = 'hit';
            packet.label = stopLayerIdx < 4 ? 'HIT' : 'DB';
            setTimeout(function() {
              if (!packet) return;
              packet.phase = 'return'; packet.label = 'RES';
            }, 400);
          }
        } else if (packet.phase === 'return') {
          packet.y -= 4;
          if (packet.y <= layers[0].y) { packet = null; draw(); return; }
        }
        draw();
        raf2 = requestAnimationFrame(step);
      }
      step();
    }

    bHit.addEventListener('click', function() { if (!packet) animateHit(2); }); // Redis = index 2
    bMiss.addEventListener('click', function() { if (!packet) animateHit(4); }); // DB = index 4
    bReset.addEventListener('click', function() { packet = null; hitCount = 0; totalCount = 0; draw(); });

    draw();
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
