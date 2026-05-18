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
    why:"CDN is typically the highest-leverage single change in web performance. Moving content physically closer to users reduces RTT from 150ms to 5ms. DNS TTL strategy directly affects failover time during incidents.",
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
        answer:"DNS LB returns multiple A records (round-robin) or geo-targeted IPs. Easy to implement — just configure multiple records.\n\n**Limitations:**\n- Clients cache the IP per TTL — you can't instantly re-route traffic\n- No health-checking at DNS level (requires smart DNS like Route 53 health checks)\n- Doesn't account for server load — a heavy server gets same traffic as light one\n- Low TTL increases DNS query volume and costs",
        followUps:["How does Route 53 latency-based routing differ from simple round-robin?","What is GeoDNS and when would you use it?"]
      },
      {question:"What is cache stampede and how do you prevent it?",
        answer:"Cache stampede (thundering herd) occurs when a popular key expires and hundreds of concurrent requests all miss cache simultaneously, flooding the DB.\n\n**Prevention strategies:**\n1. **Mutex/Lock** — first miss acquires lock, sets cache, releases; others wait\n2. **Probabilistic early recomputation** — randomly re-compute before expiry (XFetch algorithm)\n3. **Stale-while-revalidate** — serve stale while background refresh runs\n4. **Cache warming** — pre-populate before expiry using a cron job",
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
    visual: {
      type: "flow",
      title: "DNS Resolution Chain",
      direction: "vertical",
      nodes: [
        { id: "browser",  label: "Browser Cache",       color: "#58a6ff", icon: "🌐", sublabel: "0ms — TTL-based local cache" },
        { id: "os",       label: "OS Cache",             color: "#58a6ff", icon: "💻", sublabel: "0ms — /etc/hosts + OS cache" },
        { id: "resolver", label: "Recursive Resolver",   color: "#ffa657", icon: "📡", sublabel: "~20ms — ISP or 1.1.1.1" },
        { id: "root",     label: "Root Nameserver",      color: "#f85149", icon: "🌍", sublabel: "~40ms — 13 root clusters (anycast)" },
        { id: "tld",      label: "TLD Nameserver",       color: "#f85149", icon: "📂", sublabel: "~80ms — .com / .io / .net zone" },
        { id: "auth",     label: "Authoritative NS",     color: "#3fb950", icon: "✅", sublabel: "~100ms — Route53 / Cloudflare zone" },
        { id: "cdn",      label: "CDN PoP",              color: "#ffa657", icon: "⚡", sublabel: "Anycast → nearest edge node" }
      ],
      connections: [
        { from: "browser",  to: "os",       label: "cache miss",      protocol: "DNS" },
        { from: "os",       to: "resolver", label: "ask resolver",     protocol: "DNS" },
        { from: "resolver", to: "root",     label: "ask root",         protocol: "DNS" },
        { from: "root",     to: "tld",      label: "delegate to TLD",  protocol: "DNS" },
        { from: "tld",      to: "auth",     label: "delegate to auth", protocol: "DNS" },
        { from: "auth",     to: "resolver", label: "IP + TTL",         protocol: "DNS", dashed: true },
        { from: "browser",  to: "cdn",      label: "TCP connect",      protocol: "TCP" }
      ],
      scenarios: [
        { name: "Full DNS Lookup", path: ["browser","os","resolver","root","tld","auth","cdn"], result: "IP resolved — ~100ms",    resultColor: "#3fb950" },
        { name: "Cache Hit",       path: ["browser","cdn"],                                     result: "Served from browser cache", resultColor: "#58a6ff" }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
