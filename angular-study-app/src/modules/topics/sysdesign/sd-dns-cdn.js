(function() {
  var topic = {
  id:"sd-dns-cdn", area:"sysdesign",
  title:"DNS Resolution & CDN Edge Caching",
  tag:"Networking", tags:["dns","cdn","anycast","ttl","edge","cloudflare","akamai"],
  concept:`**DNS (Domain Name System)** is the internet's phone book. It translates human-readable hostnames into IP addresses through a hierarchical lookup chain.

**Resolution chain:**
\`\`\`
Browser cache → OS /etc/hosts → OS resolver cache
  → Recursive resolver (ISP or 1.1.1.1)
    → Root nameserver (13 clusters, anycast)
      → TLD nameserver (.com, .io, etc.)
        → Authoritative nameserver (your zone)
\`\`\`

**Record types:** A (IPv4), AAAA (IPv6), CNAME (alias), MX (mail), TXT (verification/SPF), SRV (service discovery), NS (nameserver delegation).

**TTL trade-off:** Low TTL (60 s) → fast failover but more queries. High TTL (3600 s) → cached longer, faster but slow propagation on change.

**CDN Architecture:**
- Global network of **Points of Presence (PoPs)** — 200+ locations for Cloudflare/Akamai
- **Anycast routing** — same IP announced from multiple locations; BGP routes client to nearest PoP
- **Edge caching** — static assets (JS/CSS/images) served from PoP; **cache HIT** skips origin entirely
- **Origin shield** — single PoP acts as origin-facing cache, collapsing cache misses from 200 PoPs to 1
- **Dynamic content** — CDN can accelerate even uncacheable content via TCP connection pooling to origin`,
  why:`CDN is typically the highest-leverage single change in web performance. Moving content physically closer to users reduces RTT from 150ms to 5ms. DNS TTL strategy directly affects failover time during incidents.`,
  example:{
    language:"javascript",
    code:`// Cloudflare Worker — edge function that adds caching logic
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Bypass cache for API calls
  if (url.pathname.startsWith('/api/')) {
    return fetch(request);
  }

  const cache = caches.default;
  let response = await cache.match(request);

  if (!response) {
    response = await fetch(request);
    // Cache HTML for 60s, static assets for 1 year
    const ttl = url.pathname.match(/\\.(js|css|png|woff2)$/) ? 31536000 : 60;
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', \`public, max-age=\${ttl}\`);
    response = new Response(response.body, { ...response, headers });
    event.waitUntil(cache.put(request, response.clone()));
  }
  return response;
}`,
    notes:"Cloudflare Workers run at edge PoPs in V8 isolates — ~0ms cold start vs Lambda's 100ms+"
  },
  interview:[
    {question:"How does DNS-based load balancing work? What are its limitations?",
     answer:`DNS LB returns multiple A records (round-robin) or geo-targeted IPs. Easy to implement — just configure multiple records.\n\n**Limitations:**\n- Clients cache the IP per TTL — you can't instantly re-route traffic\n- No health-checking at DNS level (requires smart DNS like Route 53 health checks)\n- Doesn't account for server load — a heavy server gets same traffic as light one\n- Low TTL increases DNS query volume and costs`,
     followUps:["How does Route 53 latency-based routing differ from simple round-robin?","What is GeoDNS and when would you use it?"]
    },
    {question:"What is cache stampede and how do you prevent it?",
     answer:`Cache stampede (thundering herd) occurs when a popular key expires and hundreds of concurrent requests all miss cache simultaneously, flooding the DB.\n\n**Prevention strategies:**\n1. **Mutex/Lock** — first miss acquires lock, sets cache, releases; others wait\n2. **Probabilistic early recomputation** — randomly re-compute before expiry (XFetch algorithm)\n3. **Stale-while-revalidate** — serve stale while background refresh runs\n4. **Cache warming** — pre-populate before expiry using a cron job`,
     followUps:["Explain stale-while-revalidate Cache-Control directive."]
    }
  ],
  tradeoffs:{
    pros:["CDN dramatically reduces latency for global users","Absorbs DDoS traffic at edge before it hits origin","Reduces origin server load and bandwidth costs"],
    cons:["Cache invalidation is hard — purge APIs exist but propagation takes seconds","Dynamic/personalised content can't be cached","Additional cost per GB transferred"],
    when:"Always use a CDN for public-facing web apps. DNS health checks + low TTL for zero-downtime deployments."
  },
  flow:{
    title:"DNS Resolution Chain",
    caption:"Uncached first-time lookup — subsequent requests use cached IP",
    nodes:[
      {id:"browser",label:"Browser",hint:"Checks own DNS cache first"},
      {id:"os",label:"OS Resolver",hint:"/etc/hosts + OS cache"},
      {id:"isp",label:"Recursive Resolver",hint:"ISP or 1.1.1.1 / 8.8.8.8"},
      {id:"root",label:"Root Nameserver",hint:"13 root server clusters (anycast)"},
      {id:"tld",label:"TLD Nameserver",hint:".com / .io / .net zone"},
      {id:"auth",label:"Authoritative NS",hint:"Your DNS provider (Route53, Cloudflare)"},
      {id:"cdn",label:"CDN PoP",hint:"Nearest edge node (anycast IP)"}
    ],
    steps:[
      {path:["browser","os"],label:"Browser checks OS cache",detail:"Browser first checks its own TTL cache, then asks OS resolver. /etc/hosts checked before network."},
      {path:["os","isp"],label:"OS asks recursive resolver",detail:"OS forwards to configured DNS server (DHCP-assigned or manual: 1.1.1.1, 8.8.8.8)."},
      {path:["isp","root"],label:"Recursive resolver asks root",detail:"Root responds with TLD nameserver addresses — doesn't know the final IP."},
      {path:["root","tld"],label:"Root delegates to TLD",detail:"TLD nameserver (.com zone) responds with authoritative NS records for the domain."},
      {path:["tld","auth"],label:"TLD delegates to authoritative",detail:"Authoritative nameserver returns A/AAAA record — the actual IP. TTL attached."},
      {path:["auth","isp"],label:"IP returned and cached",detail:"Recursive resolver caches the result for TTL seconds, returns to OS."},
      {path:["browser","cdn"],label:"Browser connects to CDN IP",detail:"Anycast routes TCP connection to nearest PoP. CDN serves cached asset or forwards to origin."}
    ]
  },
  visual: function(mount) {
    var W = 460, H = 320;

    // DNS tree nodes (left side): x,y positions in the tree
    var dnsNodes = [
      { id: 'browser',  label: 'Browser Cache',      latency: '0ms',   color: '#58a6ff', x: 115, y: 28  },
      { id: 'os',       label: 'OS Cache',            latency: '0ms',   color: '#58a6ff', x: 115, y: 68  },
      { id: 'resolver', label: 'Recursive Resolver',  latency: '20ms',  color: '#ffa657', x: 115, y: 108 },
      { id: 'root',     label: 'Root NS',             latency: '40ms',  color: '#f85149', x: 115, y: 148 },
      { id: 'tld',      label: 'TLD NS (.com)',       latency: '80ms',  color: '#f85149', x: 115, y: 188 },
      { id: 'auth',     label: 'Authoritative NS',    latency: '100ms', color: '#3fb950', x: 115, y: 228 }
    ];

    // CDN nodes (right side)
    var cdnNodes = [
      { id: 'client',  label: 'Client',       color: '#58a6ff', x: 330, y: 68  },
      { id: 'pop',     label: 'CDN PoP',      color: '#ffa657', x: 330, y: 148 },
      { id: 'origin',  label: 'Origin Server',color: '#f85149', x: 330, y: 228 }
    ];

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';

    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:13px';

    var hitBtn = document.createElement('button');
    hitBtn.textContent = '⚡ Cache Hit';
    hitBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#3fb950;cursor:pointer;font-size:13px';

    var missBtn = document.createElement('button');
    missBtn.textContent = '🔄 Cache Miss';
    missBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#f85149;cursor:pointer;font-size:13px';

    ctrl.appendChild(playBtn); ctrl.appendChild(hitBtn); ctrl.appendChild(missBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // animation state
    var mode = 'miss'; // 'hit' or 'miss'
    var activeNode = -1; // which dnsNode is active (0..5)
    var cdnActive = -1;  // which cdn segment active
    var running = false, rafId = null, lastTime = 0;

    // dot interpolation
    var dotFromY = dnsNodes[0].y;
    var dotToY = dnsNodes[0].y;
    var dotT = 1;
    var dotSide = 'dns'; // 'dns' or 'cdn'

    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function drawScene() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // ---- titles ----
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#58a6ff'; ctx.fillText('DNS Resolution Tree', 115, 14);
      ctx.fillStyle = '#ffa657'; ctx.fillText('CDN Cache', 330, 14);

      // divider
      ctx.beginPath(); ctx.moveTo(230, 20); ctx.lineTo(230, 260);
      ctx.strokeStyle = '#21262d'; ctx.lineWidth = 1; ctx.stroke();

      // ---- DNS tree boxes ----
      var BOX_W = 168, BOX_H = 22;
      dnsNodes.forEach(function(n, i) {
        var isActive = i === activeNode;
        var isDone = i < activeNode && dotSide === 'dns';
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(n.x - BOX_W/2, n.y - BOX_H/2, BOX_W, BOX_H, 3)
                      : ctx.rect(n.x - BOX_W/2, n.y - BOX_H/2, BOX_W, BOX_H);
        ctx.fillStyle = isActive ? n.color + '33' : '#161b22';
        ctx.fill();
        ctx.strokeStyle = isActive ? n.color : isDone ? n.color + '55' : '#30363d';
        ctx.lineWidth = isActive ? 2 : 1; ctx.stroke();

        ctx.fillStyle = isActive ? n.color : isDone ? '#8b949e' : '#8b949e';
        ctx.font = (isActive ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'left';
        ctx.fillText(n.label, n.x - BOX_W/2 + 5, n.y + 4);

        // latency badge
        ctx.fillStyle = isActive ? n.color : '#30363d';
        ctx.font = '9px monospace'; ctx.textAlign = 'right';
        ctx.fillText(n.latency, n.x + BOX_W/2 - 4, n.y + 4);

        // connector line to next
        if (i < dnsNodes.length - 1) {
          ctx.beginPath();
          ctx.moveTo(n.x, n.y + BOX_H/2);
          ctx.lineTo(dnsNodes[i+1].x, dnsNodes[i+1].y - BOX_H/2);
          ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
        }
      });

      // DNS moving dot
      if (activeNode >= 0 && dotSide === 'dns') {
        var et = ease(Math.min(1, dotT));
        var dy = lerp(dotFromY, dotToY, et);
        ctx.beginPath(); ctx.arc(dnsNodes[0].x + BOX_W/2 + 10, dy, 5, 0, Math.PI*2);
        ctx.fillStyle = dnsNodes[Math.min(activeNode, dnsNodes.length-1)].color;
        ctx.fill();
      }

      // ---- CDN side ----
      var cdnBW = 120, cdnBH = 28;
      cdnNodes.forEach(function(n, i) {
        var isActive = i === cdnActive;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(n.x - cdnBW/2, n.y - cdnBH/2, cdnBW, cdnBH, 4)
                      : ctx.rect(n.x - cdnBW/2, n.y - cdnBH/2, cdnBW, cdnBH);
        ctx.fillStyle = isActive ? n.color + '33' : '#161b22';
        ctx.fill();
        ctx.strokeStyle = isActive ? n.color : '#30363d';
        ctx.lineWidth = isActive ? 2 : 1; ctx.stroke();
        ctx.fillStyle = isActive ? n.color : '#8b949e';
        ctx.font = (isActive ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + 4);

        if (i < cdnNodes.length - 1) {
          var showMiss = (mode === 'miss' && i === 1) || i === 0;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y + cdnBH/2);
          ctx.lineTo(cdnNodes[i+1].x, cdnNodes[i+1].y - cdnBH/2);
          ctx.strokeStyle = showMiss ? '#ffa65788' : '#30363d';
          ctx.lineWidth = showMiss ? 1.5 : 1;
          ctx.setLineDash(mode === 'hit' && i === 1 ? [2,4] : []); ctx.stroke(); ctx.setLineDash([]);
        }
      });

      // CDN label
      var hitLabel = mode === 'hit' ? '⚡ Cache HIT — served from edge' : '🔄 Cache MISS — forward to origin';
      ctx.fillStyle = mode === 'hit' ? '#3fb950' : '#f85149';
      ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(hitLabel, 330, 258);

      // narration
      var narY = H - 32;
      ctx.fillStyle = '#161b22'; ctx.fillRect(10, narY, W - 20, 24);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.strokeRect(10, narY, W - 20, 24);
      var narText = activeNode >= 0 ? 'Hop ' + (activeNode+1) + ': ' + dnsNodes[Math.min(activeNode, dnsNodes.length-1)].label + ' — ' + dnsNodes[Math.min(activeNode, dnsNodes.length-1)].latency
                                    : 'Press ▶ Play to animate DNS resolution, or pick Cache Hit / Miss';
      ctx.fillStyle = '#e6edf3'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(narText, W/2, narY + 15);
    }

    function nextDNSHop() {
      if (activeNode < dnsNodes.length - 1) {
        dotFromY = dnsNodes[Math.max(0, activeNode)].y;
        activeNode++;
        dotToY = dnsNodes[activeNode].y;
        dotT = 0;
        cdnActive = activeNode < 2 ? 0 : activeNode < 4 ? 0 : 1;
        if (mode === 'miss' && activeNode === dnsNodes.length - 1) { cdnActive = 2; }
      } else {
        running = false; playBtn.textContent = '▶ Play';
      }
    }

    function frame(ts) {
      if (!document.body.contains(canvas)) return;
      dotT = Math.min(1, dotT + 0.06);
      drawScene();
      if (running) {
        if (ts - lastTime > 700) { lastTime = ts; nextDNSHop(); }
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    }

    playBtn.addEventListener('click', function() {
      if (running) { running = false; playBtn.textContent = '▶ Play'; }
      else {
        activeNode = -1; dotFromY = dnsNodes[0].y; dotToY = dnsNodes[0].y; dotT = 1; cdnActive = -1;
        running = true; playBtn.textContent = '⏸ Pause';
        if (!rafId) rafId = requestAnimationFrame(function(ts) { lastTime = ts; frame(ts); });
      }
    });

    hitBtn.addEventListener('click', function() {
      mode = 'hit'; running = false; playBtn.textContent = '▶ Play';
      activeNode = 1; cdnActive = 0; dotT = 1; dotFromY = dnsNodes[1].y; dotToY = dnsNodes[1].y;
      drawScene();
    });

    missBtn.addEventListener('click', function() {
      mode = 'miss'; running = false; playBtn.textContent = '▶ Play';
      activeNode = dnsNodes.length - 1; cdnActive = 2; dotT = 1;
      dotFromY = dnsNodes[dnsNodes.length-1].y; dotToY = dnsNodes[dnsNodes.length-1].y;
      drawScene();
    });

    drawScene();
    rafId = requestAnimationFrame(frame);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
