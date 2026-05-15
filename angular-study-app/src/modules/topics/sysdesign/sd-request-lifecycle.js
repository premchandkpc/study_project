(function() {
  var topic = {
  id:"sd-request-lifecycle", area:"sysdesign",
  title:"Full Request Lifecycle: Browser → Server → DB",
  tag:"Networking", tags:["dns","tcp","tls","http","request lifecycle","networking"],
  concept:`When a user types a URL and hits Enter, at least **12 distinct steps** happen before pixels appear.

**Layer breakdown:**
- **DNS resolution** — recursive lookup: browser cache → OS cache → resolver → root → TLD → authoritative
- **TCP 3-way handshake** — SYN → SYN-ACK → ACK (adds ~1 RTT)
- **TLS 1.3 handshake** — 1 RTT (vs TLS 1.2's 2 RTT); negotiates cipher suite, exchanges certs
- **HTTP request** — verb + path + headers + optional body sent over the established connection
- **CDN/proxy interception** — edge PoP may serve cached response before reaching origin
- **Load balancer** — L7 terminates TLS, routes to healthy upstream by algorithm
- **App server** — framework parses request, runs middleware chain, hits service layer
- **Cache check** — Redis/Memcached checked before DB
- **DB query** — index scan → row fetch → result set
- **Response path** — JSON serialized → compressed (gzip/br) → chunked transfer → rendered

**Key latency contributors:** DNS (~20-120ms first time), TCP+TLS (~60-150ms), TTFB, DB query time.`,
  why:`Every senior interview starts here. Knowing the full path lets you pinpoint bottlenecks at any layer and propose targeted optimisations (pre-connect, HTTP/2 push, connection pooling, read replicas, CDN caching).`,
  example:{
    language:"go",
    code:`// Minimal Go HTTP server — shows what happens on the server side
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
)

type Response struct {
    Message   string    \`json:"message"\`
    Timestamp time.Time \`json:"ts"\`
}

func handler(w http.ResponseWriter, r *http.Request) {
    // middleware: auth, rate-limit, tracing would wrap here
    w.Header().Set("Content-Type", "application/json")
    w.Header().Set("Cache-Control", "public, max-age=30")
    json.NewEncoder(w).Encode(Response{
        Message:   "ok",
        Timestamp: time.Now(),
    })
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/data", handler)
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      mux,
        ReadTimeout:  5 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
    }
    log.Fatal(srv.ListenAndServe())
}`,
    notes:"Timeouts on every server are non-negotiable — missing them causes Goroutine/thread leaks under slow-client attacks."
  },
  interview:[
    {question:"Walk me through what happens when a user types https://example.com in a browser.",
     answer:`1. Browser checks DNS cache (TTL-based). If miss → OS resolver → recursive DNS → root → TLD → authoritative. Returns IP.\n2. TCP SYN to IP:443. Server SYN-ACK. Client ACK.\n3. TLS 1.3 handshake — 1 RTT. Certificate verified, session keys derived.\n4. HTTP/2 GET / sent multiplexed on single connection.\n5. CDN edge may respond from cache (HIT) — no origin contact.\n6. On MISS: LB receives, TLS terminates, picks upstream (round-robin / least-conn).\n7. App server runs middleware (auth JWT, rate-limit), controller, service, cache-aside check.\n8. Cache miss → DB query → result cached → response serialised → gzip compressed.\n9. HTTP 200 with headers (ETag, Cache-Control, Content-Encoding).\n10. Browser renders — parse HTML, fetch sub-resources (CSS/JS/images), execute JS.`,
     followUps:["What is TTFB and how do you reduce it?","How does HTTP/2 multiplexing reduce latency vs HTTP/1.1?","What happens during a TLS resumption?"]
    },
    {question:"How would you reduce page load time from 3 s to under 1 s?",
     answer:`- **CDN** closer edge PoPs → reduces DNS + TCP RTT\n- **HTTP/2 or HTTP/3** → multiplexing, header compression, 0-RTT (QUIC)\n- **Pre-connect / DNS prefetch** link hints in HTML head\n- **Cache-Control** headers → browser & CDN cache static assets\n- **DB read replicas + Redis** → cut TTFB by removing DB hot-path\n- **Gzip/Brotli** compression → smaller payloads\n- **Lazy-load** below-fold images, code-split JS bundles`,
     followUps:["What is the critical rendering path?","When would you use server-sent events vs WebSockets?"]
    }
  ],
  tradeoffs:{
    pros:["Full understanding enables precise bottleneck identification","Layered model — each layer independently optimisable"],
    cons:["Each added layer (LB, CDN, cache) adds operational complexity","Distributed caching introduces consistency challenges"],
    when:"Use this mental model in every system-design session as the starting framework."
  },
  flow:{
    title:"Request Lifecycle — Step by Step",
    caption:"Each arrow is a network hop; every hop adds latency.",
    nodes:[
      {id:"browser",label:"Browser",hint:"Initiates DNS + TCP + TLS"},
      {id:"dns",label:"DNS Resolver",hint:"Returns IP for hostname"},
      {id:"cdn",label:"CDN Edge",hint:"May serve cached response"},
      {id:"lb",label:"Load Balancer",hint:"L7 TLS termination + routing"},
      {id:"app",label:"App Server",hint:"Business logic + middleware"},
      {id:"cache",label:"Redis Cache",hint:"Cache-aside read"},
      {id:"db",label:"Database",hint:"Source of truth"}
    ],
    steps:[
      {path:["browser","dns"],label:"DNS Resolution",detail:"Browser resolves hostname → IP via recursive DNS. Cached for TTL (often 60–300 s)."},
      {path:["browser","cdn"],label:"TCP + TLS to CDN",detail:"Browser opens TCP connection to CDN edge IP; TLS 1.3 handshake completes in 1 RTT."},
      {path:["cdn","lb"],label:"CDN Cache Miss → Origin",detail:"If CDN has no cached response it forwards to origin load balancer."},
      {path:["lb","app"],label:"LB routes to App Server",detail:"L7 LB picks upstream by algorithm (least-conn / round-robin), forwards HTTP/2."},
      {path:["app","cache"],label:"Cache-aside read",detail:"App checks Redis for cached result. HIT returns immediately (< 1 ms)."},
      {path:["cache","db"],label:"Cache miss → DB query",detail:"On cache miss, app queries primary DB. Result is written back to cache."},
      {path:["db","browser"],label:"Response flows back",detail:"DB → App → LB → CDN (cached for next caller) → Browser. Compressed JSON rendered."}
    ]
  },
  uml:{
    title:"Request Sequence — Browser to DB",
    scenario:"Full round-trip on first uncached load",
    actors:[
      {id:"br",label:"Browser"},
      {id:"cdn",label:"CDN"},
      {id:"lb",label:"Load Balancer"},
      {id:"app",label:"App Server"},
      {id:"redis",label:"Redis"},
      {id:"db",label:"DB"}
    ],
    messages:[
      {from:"br",to:"cdn",label:"GET /page (HTTPS)",detail:"TLS handshake included; HTTP/2 stream opened.",type:"sync"},
      {from:"cdn",to:"lb",label:"Cache MISS — forward",detail:"CDN has no valid cached entry; proxies to origin.",type:"sync"},
      {from:"lb",to:"app",label:"Route to upstream",detail:"Least-connections picks idle app pod.",type:"sync"},
      {from:"app",to:"redis",label:"GET cache:key",detail:"O(1) lookup in Redis hash.",type:"sync"},
      {from:"redis",to:"app",label:"(nil) cache miss",detail:"Key expired or never set.",type:"sync"},
      {from:"app",to:"db",label:"SELECT query",detail:"Parameterised prepared statement; index scan.",type:"sync"},
      {from:"db",to:"app",label:"Result rows",detail:"Result set serialised to JSON.",type:"sync"},
      {from:"app",to:"redis",label:"SET cache:key TTL 60",detail:"Write-back to cache for next 60 s.",type:"async"},
      {from:"app",to:"lb",label:"HTTP 200 + body",detail:"Gzip-compressed JSON response.",type:"sync"},
      {from:"lb",to:"cdn",label:"Response",detail:"CDN caches per Cache-Control header.",type:"sync"},
      {from:"cdn",to:"br",label:"HTTP 200 (cached)",detail:"Browser renders; subsequent requests served from CDN.",type:"sync"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
