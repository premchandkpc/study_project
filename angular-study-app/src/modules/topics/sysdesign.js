/* ============================================================
   SYSTEM DESIGN TOPICS — Part 1 of 4 (topics 1-9)
   ============================================================ */
window.SYSDESIGN_TOPICS = [

/* ── 1. Request Lifecycle ─────────────────────────────────── */
{
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
},

/* ── 2. DNS & CDN ─────────────────────────────────────────── */
{
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
  }
},

/* ── 3. HTTP Protocols ────────────────────────────────────── */
{
  id:"sd-protocols-http", area:"sysdesign",
  title:"HTTP 1.1 / 2 / 3, WebSocket & SSE",
  tag:"Protocols", tags:["http2","http3","quic","websocket","sse","long-polling","hol blocking"],
  concept:`**HTTP/1.1** (1997): text protocol, one request per connection (keep-alive allows reuse but still serial). Head-of-line (HOL) blocking at application layer.

**HTTP/2** (2015): binary framing, **multiplexing** (multiple streams on one TCP connection), header compression (HPACK), server push. Eliminates app-layer HOL but TCP-layer HOL remains.

**HTTP/3** (2022): runs on **QUIC** (UDP-based), eliminates TCP HOL blocking. Built-in TLS 1.3. Connection migration (IP change doesn't break session — great for mobile).

**Comparison table:**
| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Protocol | TCP | TCP | QUIC (UDP) |
| Multiplexing | No | Yes | Yes |
| HOL Blocking | App + TCP | TCP only | None |
| Header compression | None | HPACK | QPACK |
| TLS | Optional | Optional | Built-in |
| 0-RTT resumption | No | No | Yes |

**Real-time communication options:**
- **Short polling**: client polls every N seconds — simple, wastes bandwidth
- **Long polling**: client holds connection open until server has data — better but complex
- **SSE** (Server-Sent Events): unidirectional server→client stream over HTTP, built-in reconnect, text only
- **WebSocket**: full-duplex binary/text, single TCP upgrade, low overhead per message`,
  why:`Protocol choice affects throughput, latency, and infrastructure cost at scale. HTTP/2 multiplexing removes the need for domain sharding. WebSocket vs SSE is a common interview design question.`,
  example:{
    language:"go",
    code:`// SSE server in Go — push live updates to browser
package main

import (
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "SSE unsupported", http.StatusInternalServerError)
        return
    }

    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case t := <-ticker.C:
            fmt.Fprintf(w, "data: {\"time\":\"%s\"}\\n\\n", t.Format(time.RFC3339))
            flusher.Flush()
        case <-r.Context().Done():
            return // client disconnected
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":8080", nil)
}`,
    notes:"SSE auto-reconnects on disconnect; browser EventSource API handles this natively. Use WebSocket only when you need client→server messages."
  },
  interview:[
    {question:"When would you choose WebSocket over SSE?",
     answer:`**Use SSE when:** data flows only server → client (live dashboards, notifications, feeds). Simpler, works over HTTP/2, proxy-friendly, built-in reconnect.\n\n**Use WebSocket when:** you need bidirectional communication (chat, multiplayer games, collaborative editing, trading terminals). WebSocket is a TCP upgrade so it escapes HTTP semantics but also loses HTTP/2 multiplexing benefits.\n\n**At scale:** SSE is easier to load-balance (stateless HTTP); WebSocket requires sticky sessions or a pub-sub backplane (Redis pub-sub, Kafka) so any server can push to any client.`,
     followUps:["How do you scale WebSocket servers?","What is the WebSocket ping/pong mechanism?"]
    },
    {question:"What is HOL blocking and how does HTTP/3 solve it?",
     answer:`Head-of-line blocking: if packet N is lost on a TCP connection, all subsequent packets wait for retransmission even if they belong to independent streams. HTTP/2 multiplexes on one TCP connection — a single packet loss stalls all streams.\n\nHTTP/3 uses QUIC (UDP) which implements streams at the transport layer. A lost packet only blocks the single stream that owns it; other streams continue unaffected. Additionally QUIC has built-in TLS 1.3 and supports connection migration (changing IP mid-connection).`,
     followUps:["Why is HTTP/3 especially beneficial on mobile networks?"]
    }
  ],
  tradeoffs:{
    pros:["HTTP/2 multiplexing eliminates connection-count limits","HTTP/3 QUIC reduces latency on lossy networks","SSE is simplest for server-push use cases"],
    cons:["HTTP/3 not supported by all infrastructure/proxies yet","WebSocket breaks some CDN/proxy setups","SSE is text-only and unidirectional"],
    when:"Default to HTTP/2 for REST APIs. HTTP/3 for user-facing products. SSE for live feeds. WebSocket for true bidirectional needs."
  },
  architecture:{
    title:"Protocol Comparison — Architecture View",
    caption:"Choose the right transport for each use case",
    lanes:[
      {label:"Client",nodes:[
        {id:"browser-c",label:"Browser / App",hint:"Initiates all connections"},
        {id:"mobile-c",label:"Mobile Client",hint:"Benefits most from QUIC (lossy networks)"}
      ]},
      {label:"Transport",nodes:[
        {id:"http11",label:"HTTP/1.1",badge:"TCP",hint:"Serial, text-based",detail:"One request at a time per connection. Keep-alive reuses TCP but still serial. 6 parallel connections per origin in browsers."},
        {id:"http2",label:"HTTP/2",badge:"TCP",hint:"Multiplexed, binary",detail:"Multiple streams on one TCP. HPACK header compression. Server push. TCP HOL blocking still exists."},
        {id:"http3",label:"HTTP/3",badge:"QUIC",hint:"No HOL blocking",detail:"QUIC over UDP. Built-in TLS 1.3. Per-stream loss recovery. Connection migration for mobile."},
        {id:"ws",label:"WebSocket",badge:"TCP",hint:"Full-duplex upgrade",detail:"Single TCP connection upgraded from HTTP. Low per-message overhead. Needs sticky sessions or pub-sub backplane for scale."},
        {id:"sse",label:"SSE",badge:"HTTP",hint:"Server→client stream",detail:"Chunked HTTP response, text/event-stream. Browser EventSource auto-reconnects. Works through HTTP/2 proxies."}
      ]},
      {label:"Use Cases",nodes:[
        {id:"uc-rest",label:"REST APIs",hint:"HTTP/1.1 or HTTP/2"},
        {id:"uc-video",label:"Video Streaming",hint:"HTTP/3 / DASH / HLS"},
        {id:"uc-chat",label:"Chat / Games",hint:"WebSocket"},
        {id:"uc-feed",label:"Live Feeds / Alerts",hint:"SSE"}
      ]}
    ],
    links:[
      {from:"http2",to:"uc-rest",label:"Best for REST",detail:"Multiplexing eliminates domain sharding hacks."},
      {from:"http3",to:"uc-video",label:"Best for streaming",detail:"No HOL blocking crucial for video segment delivery."},
      {from:"ws",to:"uc-chat",label:"Bidirectional",detail:"Chat requires client→server messages; SSE is unidirectional."},
      {from:"sse",to:"uc-feed",label:"Server push only",detail:"Live dashboards, notifications — no client messages needed."}
    ]
  }
},

/* ── 4. gRPC ──────────────────────────────────────────────── */
{
  id:"sd-protocols-grpc", area:"sysdesign",
  title:"gRPC, Protobuf & Bidirectional Streaming",
  tag:"Protocols", tags:["grpc","protobuf","streaming","http2","rpc","service mesh"],
  concept:`**gRPC** is a high-performance RPC framework by Google. It uses **Protocol Buffers** (Protobuf) for serialisation and **HTTP/2** for transport.

**Why gRPC over REST+JSON?**
- Protobuf binary is **5-10× smaller** and **6× faster** to serialise than JSON
- HTTP/2 multiplexing — all streams share one connection
- **Strongly typed** contract via .proto files — compile-time checking
- Native **streaming** (4 modes: unary, server-stream, client-stream, bidirectional)
- First-class code generation for 12+ languages

**The 4 RPC modes:**
\`\`\`protobuf
service OrderService {
  // 1. Unary — one request, one response
  rpc GetOrder(OrderRequest) returns (Order);

  // 2. Server streaming — one request, stream of responses
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);

  // 3. Client streaming — stream of requests, one response
  rpc BatchCreate(stream CreateRequest) returns (BatchResult);

  // 4. Bidirectional — both sides stream
  rpc Chat(stream Message) returns (stream Message);
}
\`\`\`

**When to prefer REST:** public APIs (browser clients can't call gRPC natively without grpc-web proxy), simple CRUD, teams unfamiliar with Protobuf.`,
  why:`Microservice-to-microservice communication at scale (Google, Netflix, Uber internal) uses gRPC because the payload savings and streaming modes reduce bandwidth by 10× and latency by 2-3× vs JSON/REST.`,
  example:{
    language:"go",
    code:`// proto definition
// file: order.proto
syntax = "proto3";
service OrderService {
  rpc GetOrder(OrderRequest) returns (Order);
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);
}
message OrderRequest { string order_id = 1; }
message Order {
  string id = 1;
  string status = 2;
  double total = 3;
}
message OrderEvent { string order_id = 1; string event = 2; }

// ── Go server implementation ──
package main

import (
    "context"
    "time"
    pb "myapp/gen/order"
    "google.golang.org/grpc"
    "net"
)

type server struct{ pb.UnimplementedOrderServiceServer }

func (s *server) GetOrder(ctx context.Context, req *pb.OrderRequest) (*pb.Order, error) {
    return &pb.Order{Id: req.OrderId, Status: "DELIVERED", Total: 99.99}, nil
}

func (s *server) WatchOrder(req *pb.OrderRequest, stream pb.OrderService_WatchOrderServer) error {
    events := []string{"CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"}
    for _, ev := range events {
        if err := stream.Send(&pb.OrderEvent{OrderId: req.OrderId, Event: ev}); err != nil {
            return err
        }
        time.Sleep(500 * time.Millisecond)
    }
    return nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterOrderServiceServer(s, &server{})
    s.Serve(lis)
}`,
    notes:"Run `protoc --go_out=. --go-grpc_out=. order.proto` to generate type-safe client/server stubs."
  },
  interview:[
    {question:"How does Protobuf serialisation achieve smaller payload sizes than JSON?",
     answer:`Protobuf uses field **numbers** (varint-encoded) instead of string field names. Each field is encoded as a tag (field number + wire type) followed by the value — no quotes, no brackets, no whitespace.\n\nExample: \`{"status":"DELIVERED","total":99.99}\` is 34 bytes JSON vs ~10 bytes Protobuf.\n\nAdditionally: integers use variable-length encoding (small numbers = fewer bytes), repeated fields avoid repeated keys, default values are omitted entirely.`,
     followUps:["What happens when you add a new field to a Protobuf schema?","How do you handle Protobuf schema evolution without breaking clients?"]
    },
    {question:"How would you expose a gRPC service to a browser-based frontend?",
     answer:`Browsers can't call gRPC natively (no HTTP/2 trailer support). Options:\n\n1. **grpc-web** — Envoy/nginx proxy translates gRPC-web (HTTP/1.1) → gRPC. Supports unary and server streaming.\n2. **Transcoding** — gRPC-gateway generates a REST+JSON proxy from proto annotations. Same service, two interfaces.\n3. **Connect protocol** — modern alternative (Buf Connect); works natively in browsers without proxy, compatible with gRPC servers.`,
     followUps:["What is the Connect protocol?"]
    }
  ],
  tradeoffs:{
    pros:["5-10× smaller payload vs JSON","HTTP/2 multiplexing — no connection per call","Native streaming — bidirectional is unique to gRPC","Strong typing + codegen eliminates serialisation bugs"],
    cons:["Not human-readable — harder to debug without tooling","Browser support requires proxy (grpc-web)","Protobuf schema management adds overhead","Steeper learning curve than REST"],
    when:"Internal microservice communication, high-throughput data pipelines, streaming use cases. Use REST for public APIs or when browser clients call directly."
  },
  uml:{
    title:"gRPC Order Service — Sequence",
    scenario:"Client gets order then watches live status stream",
    actors:[
      {id:"client",label:"Go Client"},
      {id:"stub",label:"gRPC Stub"},
      {id:"server",label:"OrderService"},
      {id:"db",label:"Database"}
    ],
    messages:[
      {from:"client",to:"stub",label:"GetOrder(id=42)",detail:"Unary call — client blocks until response.",type:"sync"},
      {from:"stub",to:"server",label:"Protobuf frame over HTTP/2",detail:"Binary serialised OrderRequest sent on HTTP/2 stream.",type:"sync"},
      {from:"server",to:"db",label:"SELECT * FROM orders WHERE id=42",detail:"DB lookup for order details.",type:"sync"},
      {from:"db",to:"server",label:"Row result",detail:"Order data returned.",type:"sync"},
      {from:"server",to:"stub",label:"Order{status:DELIVERED}",detail:"Protobuf-serialised Order response.",type:"sync"},
      {from:"stub",to:"client",label:"Decoded Order struct",detail:"Client receives typed Go struct — no JSON parsing.",type:"sync"},
      {from:"client",to:"stub",label:"WatchOrder(id=42)",detail:"Opens server-streaming RPC on new HTTP/2 stream.",type:"async"},
      {from:"server",to:"client",label:"stream: CONFIRMED",detail:"First OrderEvent pushed to client.",type:"async"},
      {from:"server",to:"client",label:"stream: SHIPPED",detail:"Second event pushed asynchronously.",type:"async"},
      {from:"server",to:"client",label:"stream: DELIVERED + EOF",detail:"Final event; server closes stream with trailer.",type:"async"}
    ]
  }
},

/* ── 5. API Gateway ───────────────────────────────────────── */
{
  id:"sd-api-gateway", area:"sysdesign",
  title:"API Gateway — Routing, Auth & Rate Limiting",
  tag:"Gateway", tags:["api gateway","kong","envoy","rate limiting","auth","reverse proxy","nginx"],
  concept:`An **API Gateway** is the single entry point for all client requests. It handles cross-cutting concerns so individual services don't have to.

**Core responsibilities:**
1. **Request routing** — path/header/method matching → upstream service
2. **Auth/AuthZ** — JWT validation, OAuth2 token introspection, API key lookup
3. **Rate limiting** — per-user/per-IP/per-plan token buckets or sliding windows
4. **SSL termination** — decrypt TLS once at the edge; internal traffic plain HTTP or mTLS
5. **Request transformation** — header injection, payload rewriting, protocol translation (REST↔gRPC)
6. **Observability** — access logs, metrics (latency p99, error rate), distributed trace propagation
7. **Circuit breaking** — fail fast when upstream unhealthy

**Popular implementations:**
- **Kong** — Nginx-based, plugin ecosystem, declarative config
- **Envoy** — C++ proxy, xDS API, used as sidecar in Istio
- **AWS API Gateway** — managed, Lambda integration, usage plans
- **nginx** — manual config, high performance, battle-tested
- **Traefik** — cloud-native, auto-discovers K8s services`,
  why:`Without a gateway, every service must implement auth, rate-limiting, and logging independently — 10 services × 3 concerns = 30 implementations that drift. The gateway centralises this into one audited, consistent implementation.`,
  example:{
    language:"yaml",
    code:`# Kong declarative config (kong.yaml)
_format_version: "3.0"

services:
  - name: order-service
    url: http://order-svc:8080
    routes:
      - name: orders-route
        paths: ["/api/v1/orders"]
        methods: ["GET", "POST"]
    plugins:
      - name: jwt            # validates Bearer token
        config:
          claims_to_verify: [exp]
      - name: rate-limiting
        config:
          minute: 100        # 100 req/min per consumer
          policy: redis      # distributed counter via Redis
      - name: prometheus     # scrape /metrics
      - name: request-transformer
        config:
          add:
            headers: ["X-Service-Name:order-service"]

  - name: user-service
    url: http://user-svc:8080
    routes:
      - name: users-route
        paths: ["/api/v1/users"]
    plugins:
      - name: key-auth       # API key in X-Api-Key header`,
    notes:"Kong runs as a reverse proxy in front of all services. Plugin chain executes in order: auth → rate-limit → transform → log."
  },
  interview:[
    {question:"How would you implement rate limiting in an API gateway for distributed servers?",
     answer:`**Token bucket algorithm** per user/IP stored in **Redis** (atomic INCR + EXPIRE).\n\nSteps:\n1. On each request, INCR a Redis key like \`ratelimit:{userId}:{window}\`\n2. If count > limit, return 429 Too Many Requests with Retry-After header\n3. Key expires after window duration — no cleanup needed\n\n**Challenge:** race condition between check and increment. Solve with **Lua script** (atomic execution in Redis) or **Redis cell module** (token bucket native).\n\n**Sliding window** more accurate than fixed window (avoids burst at window boundary) — store timestamps in a Redis Sorted Set, expire old entries, count remaining.`,
     followUps:["What is the difference between token bucket and leaky bucket?","How do you handle rate limiting across multiple gateway instances?"]
    },
    {question:"What is the difference between an API Gateway and a load balancer?",
     answer:`**Load balancer (L4/L7):** distributes traffic across identical instances of the same service. L4 = TCP/UDP level (no HTTP awareness). L7 = HTTP-aware (can route by path/host).\n\n**API Gateway:** sits above the LB. Knows about your business services, auth schemes, and API contracts. Routes different paths to different services, enforces auth/rate-limit, transforms requests.\n\nTypical stack: Client → CDN → L4 LB → API Gateway → L7 LB per service → service instances.`,
     followUps:["When would you use an API Gateway vs a service mesh?"]
    }
  ],
  tradeoffs:{
    pros:["Single enforcement point for auth/rate-limit/logging","Decouples clients from service topology","Enables zero-downtime schema evolution via versioned routes"],
    cons:["Single point of failure if not HA deployed","Adds 1-5ms latency per hop","Complex plugin chains are hard to debug","Fat gateway can become a bottleneck"],
    when:"Always use for external-facing APIs. For pure internal service-to-service traffic consider service mesh (mTLS + observability) instead of gateway."
  },
  architecture:{
    title:"API Gateway — Request Flow",
    caption:"Gateway handles all cross-cutting concerns before reaching services",
    lanes:[
      {label:"Clients",nodes:[
        {id:"mobile",label:"Mobile App",hint:"iOS / Android"},
        {id:"web",label:"Web Browser",hint:"SPA / SSR"},
        {id:"partner",label:"Partner API",hint:"B2B integrations"}
      ]},
      {label:"Gateway Layer",nodes:[
        {id:"tls-term",label:"TLS Termination",hint:"Decrypt once at edge",detail:"All HTTPS traffic decrypted here. Internal traffic uses mTLS or plain HTTP depending on trust model."},
        {id:"auth-plugin",label:"Auth Plugin",hint:"JWT / API Key / OAuth2",detail:"Validates token signature, checks expiry, extracts claims (userId, roles). Rejects 401 before hitting any service."},
        {id:"rate-limit",label:"Rate Limiter",hint:"Token bucket in Redis",detail:"Per-consumer counters in Redis. 429 returned with Retry-After. Prevents abuse and cost overruns."},
        {id:"router",label:"Request Router",hint:"Path → upstream service",detail:"Route table maps path prefixes to upstream services. Supports canary (5% → new version) and A/B routing."}
      ]},
      {label:"Backend Services",nodes:[
        {id:"order-svc",label:"Order Service",badge:"v2",hint:"POST /orders, GET /orders/:id",detail:"Handles order creation, fulfillment, status updates."},
        {id:"user-svc",label:"User Service",badge:"v1",hint:"GET /users/:id",detail:"Profile, preferences, authentication data."},
        {id:"payment-svc",label:"Payment Service",hint:"POST /payments",detail:"PCI-DSS scoped service — minimal external surface."}
      ]}
    ],
    links:[
      {from:"mobile",to:"tls-term",label:"HTTPS request",detail:"All clients terminate TLS at gateway."},
      {from:"tls-term",to:"auth-plugin",label:"Decrypted request",detail:"Plain HTTP internally; auth plugin validates token."},
      {from:"auth-plugin",to:"rate-limit",label:"Authenticated request",detail:"Auth claims attached as headers (X-User-Id, X-Roles)."},
      {from:"rate-limit",to:"router",label:"Within quota",detail:"Counter checked/incremented in Redis atomically."},
      {from:"router",to:"order-svc",label:"/api/v1/orders",detail:"Routed based on path prefix; upstream load-balanced."},
      {from:"router",to:"user-svc",label:"/api/v1/users",detail:"Different upstream pool, independent scaling."},
      {from:"router",to:"payment-svc",label:"/api/v1/payments",detail:"Extra mTLS + audit logging enabled for payment routes."}
    ]
  }
},

/* ── 6. Load Balancing ────────────────────────────────────── */
{
  id:"sd-load-balancing", area:"sysdesign",
  title:"Load Balancing — L4/L7, Algorithms & Health Checks",
  tag:"Infrastructure", tags:["load balancer","round robin","least connections","consistent hashing","nlb","alb","nginx","ha proxy"],
  concept:`A **load balancer** distributes incoming traffic across multiple backend instances to maximise throughput, minimise latency, and avoid overloading any single server.

**L4 vs L7:**
- **L4 (Transport layer)** — routes by IP + TCP/UDP port. Doesn't inspect HTTP content. Very fast (< 0.1ms overhead). Example: AWS NLB.
- **L7 (Application layer)** — inspects HTTP headers, URL path, cookies. Can route by content, inject headers, terminate TLS. Example: AWS ALB, nginx.

**Algorithms:**
| Algorithm | Best for | Drawback |
|---|---|---|
| Round-robin | Homogeneous servers | Ignores server load |
| Weighted round-robin | Mixed capacity servers | Static weights |
| Least connections | Long-lived connections (WebSocket) | Needs connection tracking |
| Least response time | Latency-sensitive | Requires active probing |
| IP hash | Session affinity without cookies | Uneven if few IPs |
| Consistent hashing | Distributed caches | Rebalancing on change |
| Random | Simplest | No load awareness |

**Health checks:**
- **Passive** — detect failure from response codes/timeouts on real traffic
- **Active** — probe /health endpoint on interval (e.g., 5s); remove from pool after N failures; re-add after M successes
- **Graceful drain** — on scale-in, stop sending new requests but complete in-flight (connection draining, 30–60 s default in AWS)`,
  why:`Load balancing is what makes horizontal scaling possible. Without it, you have one server. With it, you have unlimited theoretical throughput. Algorithm choice directly impacts p99 latency.`,
  example:{
    language:"yaml",
    code:`# nginx L7 load balancer config
upstream order_service {
    least_conn;  # algorithm: least active connections

    server order-1.internal:8080 weight=3;  # more powerful server
    server order-2.internal:8080 weight=1;
    server order-3.internal:8080 weight=1;

    keepalive 32;  # pool of persistent connections to upstreams
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /certs/cert.pem;
    ssl_certificate_key /certs/key.pem;

    location /api/orders {
        proxy_pass http://order_service;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-ID $request_id;

        # Health check
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;

        # Circuit breaker
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }
}`,
    notes:"keepalive 32 maintains 32 idle connections per worker to each upstream — eliminates TCP handshake on each request."
  },
  interview:[
    {question:"Why use consistent hashing in a load balancer for a caching layer?",
     answer:`When load balancing to a distributed cache (e.g. Memcached cluster), you want the same key to always go to the same node for maximum cache utilisation. Round-robin would send \`user:42\` to any of 10 nodes — the key would need to be in all 10 nodes or you'd get misses.\n\nConsistent hashing places servers on a hash ring. A request key is hashed and routes clockwise to the nearest server. On adding/removing a node, only ~K/N keys need to remapped (K=keys, N=nodes) — vs hash-mod which remaps nearly all keys.\n\n**Virtual nodes (vnodes)** — each physical server gets 150 virtual positions on the ring for uniform distribution.`,
     followUps:["How do you handle hot spots in consistent hashing?","What is a bounded-load consistent hash?"]
    },
    {question:"What is connection draining and why is it important?",
     answer:`When a server is removed from the LB pool (scale-in, deployment), in-flight requests must complete. Connection draining (AWS calls it "deregistration delay") tells the LB to stop sending new requests to the deregistering target but keep the existing connections alive until they complete or a timeout (30-60s) elapses.\n\nWithout draining: mid-flight requests receive TCP RST → user sees errors. With draining: zero-downtime deployments and scale-in events.`,
     followUps:["How do you implement graceful shutdown in a Go/Java service?"]
    }
  ],
  tradeoffs:{
    pros:["Enables horizontal scaling","Eliminates single points of failure","Algorithms can optimize for latency or fairness"],
    cons:["L7 LB adds ~1-5ms per request","Sticky sessions complicate stateless design","Health check intervals introduce detection lag"],
    when:"Always. L4 for raw TCP throughput (gaming, DB). L7 for HTTP APIs with routing/auth needs. Least-conn for WebSocket. Consistent hash for cache clusters."
  },
  flow:{
    title:"L7 Load Balancing — Request Distribution",
    caption:"LB routes requests based on algorithm; health checks maintain pool",
    nodes:[
      {id:"client",label:"Client",hint:"Browser / mobile / service"},
      {id:"lb",label:"L7 Load Balancer",hint:"nginx / ALB — HTTP-aware"},
      {id:"hc",label:"Health Checker",hint:"Active probe every 5s"},
      {id:"s1",label:"App Server 1",hint:"weight=3, 3 connections"},
      {id:"s2",label:"App Server 2",hint:"weight=1, 1 connection"},
      {id:"s3",label:"App Server 3",hint:"UNHEALTHY — removed from pool"}
    ],
    steps:[
      {path:["hc","s1"],label:"Active health check",detail:"LB probes GET /health on each upstream every 5s. 2 consecutive failures → removed from pool. 3 successes → re-added."},
      {path:["hc","s3"],label:"Server 3 marked unhealthy",detail:"Server 3 returned 503 twice. Removed from upstream pool. No traffic sent until it recovers."},
      {path:["client","lb"],label:"Client sends request",detail:"Client connects to LB virtual IP. TLS terminated here. HTTP/2 stream opened."},
      {path:["lb","s1"],label:"Routed to Server 1 (least-conn)",detail:"Server 1 has fewest active connections. LB forwards request, increments connection counter."},
      {path:["s1","client"],label:"Response returned",detail:"Server 1 responds. LB decrements connection counter. Result flows back to client."}
    ]
  }
},

/* ── 7. Proxies & Service Mesh ────────────────────────────── */
{
  id:"sd-proxies-mesh", area:"sysdesign",
  title:"Reverse Proxy, Service Mesh & Sidecar Pattern",
  tag:"Infrastructure", tags:["reverse proxy","service mesh","istio","linkerd","envoy","sidecar","mtls","xds"],
  concept:`**Reverse proxy:** sits between clients and servers; clients talk to the proxy, not directly to servers. Provides: load balancing, SSL termination, caching, compression, DDoS mitigation.

**Forward proxy:** sits between client and internet; client explicitly uses it (VPN, corporate firewall). Clients know they're going through a proxy.

**Service mesh:** a dedicated infrastructure layer for service-to-service communication. Implemented as **sidecar proxies** co-located with every service instance.

**Sidecar pattern:**
\`\`\`
[Service Pod]
  ├── App container (your code)
  └── Envoy sidecar (auto-injected by Istio)
         ├── mTLS between all services
         ├── Distributed tracing (Jaeger headers)
         ├── Circuit breaking
         ├── Retries + timeouts
         ├── Traffic shaping (canary, A/B)
         └── Telemetry (metrics to Prometheus)
\`\`\`

**Control plane vs data plane:**
- **Data plane** — Envoy sidecars; handle actual traffic
- **Control plane** — Istiod; pushes config to sidecars via xDS API (no restart needed)

**Popular service meshes:** Istio (Envoy), Linkerd (micro-proxy, Rust), Consul Connect, AWS App Mesh.`,
  why:`At 50+ microservices, implementing mTLS and observability per-service is untenable. Service mesh moves this to infrastructure, giving you a uniform security and observability baseline for free.`,
  example:{
    language:"yaml",
    code:`# Istio VirtualService — traffic splitting for canary deploy
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts: ["order-service"]
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: order-service
            subset: v2          # canary: 100% of x-canary traffic
    - route:
        - destination:
            host: order-service
            subset: v1
          weight: 95            # stable: 95%
        - destination:
            host: order-service
            subset: v2
          weight: 5             # canary: 5% of baseline traffic

---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s    # circuit breaker at mesh level
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }`,
    notes:"DestinationRule outlierDetection is a mesh-level circuit breaker — automatically ejects hosts returning 5xx errors."
  },
  interview:[
    {question:"What problems does a service mesh solve that an API gateway doesn't?",
     answer:`API Gateway handles **north-south** traffic (client → cluster). Service mesh handles **east-west** traffic (service → service).\n\nService mesh provides:\n- **mTLS everywhere** — all internal traffic encrypted and mutually authenticated without code changes\n- **Uniform observability** — traces/metrics for every internal call, not just edge\n- **Traffic policies** — retries, timeouts, circuit breaking at infra level\n- **Zero-trust networking** — services can only call what their policy allows\n\nYou typically need both: API Gateway for the edge, service mesh for internal communication.`,
     followUps:["What is mTLS and how does it differ from regular TLS?","How does Istio inject sidecars automatically?"]
    }
  ],
  tradeoffs:{
    pros:["Uniform mTLS without app code changes","Traffic shaping (canary, A/B) without redeployments","Centralized observability for all service calls"],
    cons:["Sidecar adds ~10ms latency + ~50MB RAM per pod","Complex control plane (Istio is notorious for steep learning curve)","Debug difficulty — two network hops instead of one"],
    when:"Use service mesh at 20+ microservices or when compliance requires encrypted internal traffic. For simpler setups, use direct service calls with app-level circuit breaking (Resilience4j, go-resilience)."
  },
  architecture:{
    title:"Service Mesh — Sidecar Architecture",
    caption:"Envoy sidecars intercept all traffic; Istiod pushes config via xDS",
    lanes:[
      {label:"Control Plane",nodes:[
        {id:"istiod",label:"Istiod",badge:"Istio",hint:"xDS config server",detail:"Istiod is the Istio control plane. It pushes Envoy configuration (routes, clusters, listeners) to all sidecars via xDS API. No traffic flows through it."},
        {id:"kube-api",label:"Kubernetes API",hint:"Service/Endpoint discovery",detail:"Istiod watches K8s Service and Endpoint resources to build its service registry."}
      ]},
      {label:"Service A Pod",nodes:[
        {id:"app-a",label:"App A",hint:"Your service code",detail:"Makes an outbound call to Service B. Doesn't know about mTLS or retries — Envoy handles it transparently."},
        {id:"envoy-a",label:"Envoy Sidecar A",hint:"Intercepts all traffic",detail:"Envoy iptables rules redirect all traffic through sidecar. Adds mTLS, traces, retries before forwarding."}
      ]},
      {label:"Service B Pod",nodes:[
        {id:"envoy-b",label:"Envoy Sidecar B",hint:"Terminates mTLS",detail:"Receives mTLS connection from Envoy A. Verifies certificate, decrypts, forwards to App B on localhost."},
        {id:"app-b",label:"App B",hint:"Receives plain HTTP",detail:"App B sees plain HTTP on localhost — no TLS handling required in application code."}
      ]},
      {label:"Observability",nodes:[
        {id:"prometheus",label:"Prometheus",hint:"Metrics scrape",detail:"Each Envoy sidecar exposes /metrics. Prometheus scrapes all sidecars for RED metrics (Rate, Errors, Duration)."},
        {id:"jaeger",label:"Jaeger",hint:"Distributed traces",detail:"Envoy propagates trace headers (B3/W3C). Jaeger collects and visualizes end-to-end request traces."}
      ]}
    ],
    links:[
      {from:"istiod",to:"envoy-a",label:"xDS config push",detail:"Routes, cluster endpoints, TLS certs pushed to Envoy A without restart.",type:"async"},
      {from:"app-a",to:"envoy-a",label:"HTTP (iptables redirect)",detail:"iptables rules transparently redirect app traffic to Envoy sidecar.",type:"sync"},
      {from:"envoy-a",to:"envoy-b",label:"mTLS over TCP",detail:"Envoy A wraps request in mTLS using cert from Istiod. Mutual authentication.",type:"sync"},
      {from:"envoy-b",to:"app-b",label:"Plain HTTP (localhost)",detail:"Envoy B decrypts and forwards to app on 127.0.0.1.",type:"sync"},
      {from:"envoy-a",to:"prometheus",label:"Metrics",detail:"REQUEST_TOTAL, REQUEST_DURATION histograms per route.",type:"async"},
      {from:"envoy-b",to:"jaeger",label:"Trace spans",detail:"Each request creates a span with upstream/downstream timing.",type:"async"}
    ]
  }
},

/* ── 8. Relational DBs ────────────────────────────────────── */
{
  id:"sd-db-relational", area:"sysdesign",
  title:"Relational DBs — ACID, Indexing & Query Planning",
  tag:"Database", tags:["sql","postgres","mysql","acid","btree","index","query planner","normalization"],
  concept:`**ACID properties:**
- **Atomicity** — all statements in a transaction commit or all roll back
- **Consistency** — transaction brings DB from one valid state to another (constraints, foreign keys enforced)
- **Isolation** — concurrent transactions appear sequential. Isolation levels: READ UNCOMMITTED < READ COMMITTED < REPEATABLE READ < SERIALIZABLE
- **Durability** — committed data survives crashes (WAL — Write-Ahead Log flushed to disk before commit ACK)

**Isolation level trade-offs:**
| Level | Dirty Read | Non-repeatable Read | Phantom Read | Performance |
|---|---|---|---|---|
| Read Uncommitted | ✓ | ✓ | ✓ | Fastest |
| Read Committed | ✗ | ✓ | ✓ | Good (PG default) |
| Repeatable Read | ✗ | ✗ | ✓ | Moderate (MySQL default) |
| Serializable | ✗ | ✗ | ✗ | Slowest |

**B-Tree index:** default index type. O(log N) lookup, range scans efficient, good for equality + ORDER BY.
**Hash index:** O(1) point lookup, no range scans (PostgreSQL heap AM only).
**GIN index:** inverted index for JSONB, arrays, full-text search.
**BRIN index:** block range index, tiny footprint, good for append-only time-series tables.
**Partial index:** \`CREATE INDEX ON orders(user_id) WHERE status='PENDING'\` — tiny, fast for filtered queries.

**Query planner:** EXPLAIN ANALYZE shows plan (seq scan, index scan, bitmap heap scan, nested loop, hash join, merge join). The planner uses table statistics (ANALYZE) to estimate row counts.`,
  why:`70% of backend performance issues trace to missing or wrong indexes. Understanding the planner is essential for debugging slow queries in production.`,
  example:{
    language:"java",
    code:`// Spring Data JPA — indexing and query optimization
@Entity
@Table(name = "orders",
    indexes = {
        @Index(name = "idx_orders_user_status",
               columnList = "user_id, status"),   // composite index
        @Index(name = "idx_orders_created_at",
               columnList = "created_at DESC")     // for ORDER BY created_at DESC
    }
)
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(precision = 12, scale = 2)
    private BigDecimal total;
}

// Repository — use projections to avoid SELECT *
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Uses idx_orders_user_status
    List<OrderSummary> findByUserIdAndStatus(Long userId, OrderStatus status);

    // Pagination to avoid full table scan
    @Query("SELECT o FROM Order o WHERE o.userId = :uid ORDER BY o.createdAt DESC")
    Page<Order> findRecentByUser(@Param("uid") Long userId, Pageable pageable);

    // COUNT using index only (covering index)
    long countByUserIdAndStatus(Long userId, OrderStatus status);
}

// Projection interface — SELECT only needed columns
interface OrderSummary {
    Long getId();
    OrderStatus getStatus();
    BigDecimal getTotal();
}`,
    notes:"Always run EXPLAIN ANALYZE in staging before deploying queries that touch large tables. Composite index column order matters: put the most selective column first for range queries."
  },
  interview:[
    {question:"When would you denormalize a database schema?",
     answer:`Normalisation (3NF) eliminates redundancy and ensures consistency. Denormalization intentionally adds redundancy for read performance.\n\n**Denormalize when:**\n- JOIN cost is too high at scale (millions of rows × multiple tables)\n- Read-to-write ratio is very high (reporting, analytics)\n- Aggregates are pre-computed (daily order counts cached in user table)\n\n**Techniques:**\n- Duplicate column to avoid JOIN (\`user_email\` on orders table)\n- Pre-compute aggregates (\`order_count\` on users table, updated by trigger)\n- Materialized views (auto-maintained in PostgreSQL)\n\n**Risk:** update anomalies — duplicated data must be kept in sync.`,
     followUps:["What is a covering index?","How does MVCC (Multi-Version Concurrency Control) work in PostgreSQL?"]
    },
    {question:"What causes a sequential scan when an index exists?",
     answer:`The query planner chooses seq scan when it estimates that reading the index + heap fetches costs MORE than a full table scan. This happens when:\n1. **Low selectivity** — query matches >10-20% of rows; seq scan amortises better\n2. **Stale statistics** — ANALYZE not run after large data change; planner underestimates row count\n3. **Function on indexed column** — \`WHERE LOWER(email) = ...\` can't use index on \`email\`; use functional index instead\n4. **Type mismatch** — comparing \`VARCHAR\` column to \`INTEGER\` literal forces cast, skips index`,
     followUps:["How do you force PostgreSQL to use an index?","What is the difference between index scan and bitmap heap scan?"]
    }
  ],
  tradeoffs:{
    pros:["ACID guarantees for financial/transactional data","Rich query language — complex aggregations, JOINs","Mature ecosystem — replication, backup, monitoring"],
    cons:["Vertical scaling has ceiling","Schema migrations on large tables require downtime (use pg_repack / online DDL)","Joins across shards are expensive or impossible"],
    when:"Default choice for transactional data (orders, users, payments). Move to NoSQL only when you need horizontal write scaling, flexible schema, or specific access patterns (time-series, document, graph)."
  },
  architecture:{
    title:"Relational DB — Read/Write Architecture",
    caption:"Primary handles writes; replicas scale reads; connection pool manages connections",
    lanes:[
      {label:"Application",nodes:[
        {id:"app",label:"App Server",hint:"Business logic"},
        {id:"pool",label:"Connection Pool",badge:"HikariCP",hint:"Max 10-20 connections per instance",detail:"HikariCP pools DB connections. Creating a DB connection is expensive (~50ms). Pool reuses connections, bounding max concurrent queries."}
      ]},
      {label:"Database",nodes:[
        {id:"primary",label:"Primary (Write)",hint:"All writes go here",detail:"Receives all INSERT/UPDATE/DELETE. Writes WAL to disk before ACK. Streams WAL to replicas."},
        {id:"replica1",label:"Read Replica 1",hint:"Async replication ~10ms lag",detail:"Streams WAL from primary. Lag is typically <100ms. Use for read-heavy queries, reports, analytics."},
        {id:"replica2",label:"Read Replica 2",hint:"Cross-AZ for HA",detail:"Second replica in different availability zone. Automatic failover promoted to primary on primary failure."}
      ]},
      {label:"Storage",nodes:[
        {id:"wal",label:"WAL",badge:"fsync",hint:"Write-Ahead Log",detail:"Every transaction writes to WAL first. Enables crash recovery and replication. fsync ensures durability."},
        {id:"heap",label:"Heap Files",hint:"Actual table data (pages of 8KB)",detail:"Tables stored as 8KB pages. Indexes stored separately. VACUUM reclaims dead tuples from MVCC."}
      ]}
    ],
    links:[
      {from:"app",to:"pool",label:"getConnection()",detail:"App requests connection from pool; pool returns idle or blocks up to timeout.",type:"sync"},
      {from:"pool",to:"primary",label:"Writes",detail:"INSERT/UPDATE/DELETE routed to primary.",type:"sync"},
      {from:"pool",to:"replica1",label:"Reads",detail:"SELECT queries routed to replicas via read routing (Spring @Transactional(readOnly=true)).",type:"sync"},
      {from:"primary",to:"wal",label:"WAL write (fsync)",detail:"Transaction data written to WAL. Commit ACK only after WAL fsync.",type:"sync"},
      {from:"primary",to:"replica1",label:"WAL streaming",detail:"Replicas connect to primary WAL sender; replays changes async.",type:"async"},
      {from:"primary",to:"replica2",label:"WAL streaming",detail:"Cross-AZ replica for failover.",type:"async"}
    ]
  }
},

/* ── 9. NoSQL Databases ───────────────────────────────────── */
{
  id:"sd-db-nosql", area:"sysdesign",
  title:"NoSQL — Document, Key-Value & Wide-Column",
  tag:"Database", tags:["mongodb","dynamodb","cassandra","redis","nosql","document","wide column","key value"],
  concept:`**NoSQL** databases sacrifice some relational guarantees for horizontal scalability, flexible schemas, and specific access-pattern optimisation.

**Key-Value (Redis, DynamoDB, etcd):**
- Get/Put/Delete by key — O(1)
- No query language; you must know the key
- Perfect for sessions, caches, feature flags, leaderboards
- DynamoDB adds secondary indexes (GSI/LSI) for alternate access patterns

**Document (MongoDB, CouchDB, Firestore):**
- Store JSON-like documents, nested structures allowed
- Rich query language — filter, project, aggregate
- Schema-flexible — each document can have different fields
- Indexes on any field; text search built-in
- Best for catalogs, content management, user profiles

**Wide-Column (Cassandra, HBase, BigTable):**
- Rows indexed by partition key; columns per row can vary
- Partition key determines which node holds the data (consistent hash)
- Optimised for **time-series** and **write-heavy** workloads (append-only)
- No JOINs; denormalize for each query pattern
- Cassandra: masterless, tunable consistency (quorum)

**Graph (Neo4j, Amazon Neptune):**
- Nodes + edges with properties
- Efficient multi-hop traversals (friends-of-friends, fraud rings)
- Poor for non-graph queries

**Time-Series (InfluxDB, TimescaleDB, Prometheus):**
- Optimised for append-only timestamped metrics
- Automatic retention policies, downsampling`,
  why:`Choosing the right NoSQL type is a critical design decision. The wrong choice (MongoDB for time-series, Cassandra for random writes without design) leads to catastrophic performance at scale.`,
  example:{
    language:"java",
    code:`// MongoDB with Spring Data — flexible document model
@Document(collection = "products")
public class Product {
    @Id
    private String id;

    @Indexed
    private String category;

    private String name;
    private Map<String, Object> attributes; // flexible schema
    private List<String> tags;

    @Indexed(expireAfterSeconds = 3600) // TTL index!
    private Date cacheExpiry;
}

// Repository with aggregation pipeline
public interface ProductRepository extends MongoRepository<Product, String> {

    // Uses category index
    List<Product> findByCategoryAndTagsContaining(String category, String tag);

    // Aggregation — group by category, count, avg price
    @Aggregation(pipeline = {
        "{ $match: { status: 'ACTIVE' } }",
        "{ $group: { _id: '$category', count: { $sum: 1 }, avgPrice: { $avg: '$price' } } }",
        "{ $sort: { count: -1 } }"
    })
    List<CategoryStats> getCategoryStats();
}

// ─── Cassandra — wide-column for time-series events ───
// Table designed for query: "get events for user X in time range"
// PRIMARY KEY ((user_id), event_time) -- partition by user, cluster by time
@Table("user_events")
public class UserEvent {
    @PrimaryKeyColumn(type = PrimaryKeyType.PARTITIONED)
    private UUID userId;

    @PrimaryKeyColumn(type = PrimaryKeyType.CLUSTERED,
                      ordering = Ordering.DESCENDING)
    private Instant eventTime;

    private String eventType;
    private Map<String, String> metadata;
}`,
    notes:"In Cassandra, design tables around queries not entities. One query pattern = one table. Denormalization is expected."
  },
  interview:[
    {question:"How does DynamoDB achieve single-digit millisecond latency at any scale?",
     answer:`DynamoDB is a managed key-value/document store with several architectural decisions for consistent latency:\n\n1. **Partition key hashing** — data is spread across partitions by consistent hashing. Reads/writes go to a single partition.\n2. **SSD storage** — all data on NVMe SSDs.\n3. **Request routing** — each request routed to the correct partition without scanning.\n4. **Leaderless replication** — 3 replicas per partition using Paxos. A write is acknowledged after 2/3 replicas confirm (quorum write).\n5. **No complex queries** — DynamoDB rejects table scans; you must design with access patterns in mind.\n\n**Cost of this speed:** no JOINs, no aggregations, no arbitrary filters without GSI.`,
     followUps:["What is a hot partition in DynamoDB and how do you fix it?","When would you use a GSI vs LSI in DynamoDB?"]
    },
    {question:"Compare MongoDB and Cassandra. When would you choose each?",
     answer:`**MongoDB:**\n- Rich query language (aggregation pipeline, $lookup, text search)\n- Document model — nested arrays/objects natural for product catalogs, CMS\n- Mutable documents — updates, upserts\n- Choose for: catalogs, user profiles, CMS, geospatial queries\n\n**Cassandra:**\n- Write-optimized — append-only log-structured merge (LSM) tree\n- Masterless — any node accepts writes; tunable consistency\n- Designed for time-series and high-write IoT workloads\n- No UPDATE in the traditional sense — new tombstone + new write\n- Choose for: IoT event streams, audit logs, time-series metrics, chat message history\n\n**Key difference:** MongoDB optimises for flexible read queries. Cassandra optimises for write throughput and predictable high-volume time-series.`,
     followUps:["What is an LSM tree and how does it enable fast writes?"]
    }
  ],
  tradeoffs:{
    pros:["Horizontal write scaling (Cassandra/DynamoDB)","Flexible schema (MongoDB)","Specialised performance for specific access patterns"],
    cons:["Eventual consistency complexity","No cross-document transactions (until MongoDB 4+)","Schema design is harder — query-first design required for Cassandra"],
    when:"Key-value for caches/sessions. Document for catalogs/profiles. Wide-column for time-series/events. Relational first unless you have a specific scaling or schema-flexibility need."
  }
}

]; // end of Part 1

/* ============================================================
   Part 2 — topics 10-18 appended
   ============================================================ */
(function(){
var part2 = [

/* ── 10. CAP Theorem ──────────────────────────────────────── */
{
  id:"sd-db-cap", area:"sysdesign",
  title:"CAP Theorem, Consistency Models & PACELC",
  tag:"Database", tags:["cap theorem","consistency","availability","partition tolerance","eventual consistency","strong consistency","pacelc"],
  concept:`**CAP Theorem** (Brewer 2000): A distributed system can guarantee at most **2 of 3**:
- **C**onsistency — every read returns the most recent write (linearisability)
- **A**vailability — every request receives a response (not necessarily latest data)
- **P**artition tolerance — system continues despite network partitions

**In practice:** Partitions happen (network failures are real). So you choose **CP or AP**:
- **CP** (Zookeeper, HBase, etcd, RDBMS with sync replication): sacrifice availability during partition — refuse requests rather than return stale data
- **AP** (Cassandra, CouchDB, DynamoDB default): sacrifice consistency — return potentially stale data, reconcile later

**Consistency spectrum (weakest → strongest):**
1. **Eventual** — given no new updates, all replicas converge eventually (DNS, shopping cart)
2. **Monotonic read** — once you read value X, you'll never read an older value
3. **Read-your-writes** — after you write, you always see your own write
4. **Session** — consistency guarantees within a session (read-your-writes + monotonic)
5. **Causal** — causally related operations are seen in order by all nodes
6. **Linearisable** — strongest; operations appear instantaneous to all observers (Spanner, etcd)

**PACELC extension:** Even without partition, there's a trade-off between **Latency** and **Consistency**. A quorum write to 3 replicas is consistent but slower than writing to 1.`,
  why:`CAP and consistency models appear in nearly every system design interview. Choosing wrong consistency model costs money (over-engineered) or correctness (data loss/anomalies).`,
  example:{
    language:"java",
    code:`// Cassandra — tunable consistency per operation
@Repository
public class OrderRepository {

    @Autowired
    private CassandraTemplate template;

    // Strong consistency — quorum read+write (slower, safer)
    public Order findCritical(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.QUORUM) // majority of replicas
                .build());
    }

    // Eventual consistency — ONE replica (fastest, may be stale)
    public Order findEventual(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.ONE)
                .build());
    }

    // Write with LOCAL_QUORUM — quorum within same datacenter
    public void save(Order order) {
        template.insert(order,
            InsertOptions.builder()
                .consistencyLevel(ConsistencyLevel.LOCAL_QUORUM)
                .build());
    }
}`,
    notes:"Rule of thumb: W + R > N guarantees strong consistency. With N=3, W=2, R=2: 2+2=4 > 3 → every read sees the latest write."
  },
  interview:[
    {question:"Explain the CAP theorem with a real-world example.",
     answer:`During a network partition in a multi-datacenter setup (east ↔ west data centers lose connectivity):\n\n**CP choice (e.g., Zookeeper):** The isolated DC refuses writes/reads until the partition heals. Users see errors but data stays consistent. Safe for distributed locks, configuration, leader election.\n\n**AP choice (e.g., Cassandra):** Both DCs accept writes independently. A user writes an order in east; another reads in west — they might see stale data. After partition heals, conflict resolution runs (last-write-wins or CRDTs). Acceptable for shopping carts, user preferences.`,
     followUps:["What are CRDTs and when do you use them?","How does DynamoDB handle conflicts in global tables?"]
    },
    {question:"What is linearisability and why is it expensive?",
     answer:`Linearisability means every operation appears to take effect instantaneously at a single point in time between its invocation and response. All observers see the same order of operations.\n\nIt's expensive because:\n1. Every read must contact a quorum of replicas to ensure it sees the latest write\n2. Adds cross-node network round trips\n3. During partition, must sacrifice availability\n\nAlternatives with weaker but often sufficient guarantees: sequential consistency, causal consistency, session consistency — each allows more concurrency with some trade-offs.`,
     followUps:["How does Google Spanner achieve external consistency (linearisability) globally?"]
    }
  ],
  tradeoffs:{
    pros:["Framework clarifies trade-offs before choosing a DB","Consistency levels let you tune per-operation"],
    cons:["CAP oversimplifies — network partitions are not binary","PACELC is more practical for latency-conscious systems"],
    when:"Choose CP for: financial transactions, distributed locks, config management. Choose AP for: social feeds, shopping carts, notifications, analytics."
  }
},

/* ── 11. Sharding & Replication ───────────────────────────── */
{
  id:"sd-db-sharding", area:"sysdesign",
  title:"Database Sharding, Replication & Resharding",
  tag:"Database", tags:["sharding","replication","horizontal scaling","consistent hashing","resharding","vitess","citus"],
  concept:`**Replication** — copy data to multiple nodes for availability and read scale. One primary, N replicas.
- **Sync replication** — primary waits for replica ACK before committing. Zero data loss, higher latency.
- **Async replication** — primary commits immediately, replica catches up later. Low latency, potential data loss on failover (~seconds of lag).
- **Semi-sync** — at least one replica must ACK. Balance between above.

**Sharding (horizontal partitioning)** — split data across multiple nodes so each node owns a subset.

**Sharding strategies:**
1. **Range-based** — shard by value range (users 0-1M → shard 1, 1M-2M → shard 2). Simple but creates hot spots.
2. **Hash-based** — \`shard = hash(key) % N\`. Even distribution but resharding is expensive (N changes).
3. **Consistent hashing** — place shards on hash ring; adding a node migrates only K/N keys. Used by Cassandra, DynamoDB, Redis Cluster.
4. **Directory-based** — lookup table maps key → shard. Flexible but lookup is a bottleneck.
5. **Geo-sharding** — route by geography (EU users → EU shard). Compliance + latency.

**Cross-shard challenges:**
- **JOINs** — cross-shard JOINs require scatter-gather; avoid by denormalising
- **Distributed transactions** — 2PC or Saga; expensive
- **Auto-increment IDs** — use UUID or Snowflake IDs to avoid collision
- **Resharding** — Vitess (MySQL) and Citus (PostgreSQL) automate online resharding`,
  why:`Sharding is the only way to scale writes horizontally beyond a single primary DB. Getting the shard key wrong requires a full data migration to fix.`,
  example:{
    language:"java",
    code:`// Snowflake ID generation — unique across shards without coordination
public class SnowflakeIdGenerator {
    // 41 bits timestamp | 10 bits machineId | 12 bits sequence
    private static final long EPOCH = 1609459200000L; // 2021-01-01
    private static final long MACHINE_BITS = 10L;
    private static final long SEQUENCE_BITS = 12L;
    private static final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1; // 4095

    private final long machineId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(long machineId) {
        this.machineId = machineId & ((1L << MACHINE_BITS) - 1);
    }

    public synchronized long nextId() {
        long now = System.currentTimeMillis() - EPOCH;
        if (now == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) now = waitNextMs(lastTimestamp); // busy wait 1ms
        } else {
            sequence = 0L;
        }
        lastTimestamp = now;
        return (now << (MACHINE_BITS + SEQUENCE_BITS))
             | (machineId << SEQUENCE_BITS)
             | sequence;
    }

    private long waitNextMs(long lastTs) {
        long ts;
        do { ts = System.currentTimeMillis() - EPOCH; } while (ts <= lastTs);
        return ts;
    }
}
// Usage: 4096 IDs/ms per machine, globally unique, time-sortable`,
    notes:"Twitter's Snowflake: 41-bit timestamp + 10-bit worker + 12-bit sequence = 64-bit ID. Time-sortable, no coordination needed."
  },
  interview:[
    {question:"How would you shard a users table for a social network with 500M users?",
     answer:`1. **Shard key choice:** \`user_id\` (UUID/Snowflake). Avoid sharding by name/email — skewed distributions. Avoid by geography unless you need data residency.\n\n2. **Strategy:** Consistent hashing with virtual nodes (128 vnodes per shard). Start with 8 physical shards, each shard is a Postgres primary + 2 replicas.\n\n3. **Co-locate relationships:** Store user's posts, followers, sessions on the same shard as the user (derived shard ID: \`followee_shard = hash(user_id) % N\`).\n\n4. **Cross-shard problem:** "Show followers of user A" — follower list stored on user A's shard (precomputed). Cross-shard friend-of-friend queries use async graph processing (Spark/Presto).\n\n5. **Resharding:** Vitess (MySQL) or pg_partman; online migration with zero downtime.`,
     followUps:["What is a hotspot shard and how do you fix it?","Explain Vitess's VSchema and how it enables transparent sharding."]
    }
  ],
  tradeoffs:{
    pros:["Linear write scale-out","Data isolation per shard (smaller blast radius)"],
    cons:["Application must be shard-aware (or use middleware like Vitess)","Cross-shard transactions are expensive","Resharding requires careful planning"],
    when:"Shard when a single primary can't handle write throughput (typically >10K TPS sustained) or data size exceeds manageable single-node size (>5TB)."
  },
  flow:{
    title:"Sharded Write Path",
    caption:"Shard key determines which shard; consistent hash ring minimises resharding",
    nodes:[
      {id:"app",label:"App Server",hint:"Compute shard from key"},
      {id:"router",label:"Shard Router",hint:"Consistent hash or directory"},
      {id:"sh1",label:"Shard 1",hint:"user_id hash 0-33%"},
      {id:"sh2",label:"Shard 2",hint:"user_id hash 33-66%"},
      {id:"sh3",label:"Shard 3",hint:"user_id hash 66-100%"},
      {id:"rep",label:"Replica",hint:"Async replication for reads"}
    ],
    steps:[
      {path:["app","router"],label:"Route by shard key",detail:"App computes shard = consistentHash(user_id). Shard router maps to physical node address."},
      {path:["router","sh1"],label:"Write to Shard 1",detail:"User with hash in 0-33% range lands on Shard 1's primary."},
      {path:["sh1","rep"],label:"Async replication",detail:"Primary streams WAL to replica. Replica serves read queries with <100ms lag."},
      {path:["router","sh2"],label:"Different user → Shard 2",detail:"Different user_id hash routes to Shard 2 independently."},
      {path:["app","sh3"],label:"Direct shard access (optimised)",detail:"App caches shard mapping locally; skip router for known shard-key queries."}
    ]
  }
},

/* ── 12. Caching Layers ───────────────────────────────────── */
{
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
},

/* ── 13. Redis Deep Dive ──────────────────────────────────── */
{
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
  }
},

/* ── 14. Kafka Architecture ───────────────────────────────── */
{
  id:"sd-kafka-arch", area:"sysdesign",
  title:"Apache Kafka — Internals, Partitions & Consumer Groups",
  tag:"Messaging", tags:["kafka","partitions","consumer group","offset","replication","ISR","compaction","streams","producer"],
  concept:`**Kafka** is a distributed commit log optimised for high-throughput, durable, ordered event streaming.

**Core concepts:**
- **Topic** — logical stream name. Partitioned for parallelism.
- **Partition** — ordered, immutable log. Each message gets an offset. Stored on disk (not memory).
- **Broker** — Kafka server. A cluster has N brokers; each partition has one leader + (replication-factor - 1) followers.
- **Producer** — writes to a partition leader. Partitioning by key ensures ordered delivery for a key.
- **Consumer Group** — logical subscriber. Each partition assigned to exactly one consumer in the group. Multiple groups → each gets all messages (pub-sub behaviour).
- **Offset** — consumer tracks position per partition. Committed to \`__consumer_offsets\` topic.

**ISR (In-Sync Replicas):** The set of replicas fully caught up with the leader. \`acks=all\` waits for all ISR before producer gets ACK — strongest guarantee.

**Exactly-once semantics (EOS):**
1. Producer idempotence (\`enable.idempotence=true\`) — deduplicates retries via sequence numbers
2. Transactions — atomic write across multiple partitions + commit offset

**Log compaction:** Kafka retains only the latest value per key (useful for change-data-capture CDC).

**Throughput numbers:** Single Kafka cluster handles 10M+ messages/second at LinkedIn, 7M at Twitter.`,
  why:`Kafka is the backbone of event-driven architectures. Understanding partitioning and consumer groups is critical for designing scalable async systems.`,
  example:{
    language:"java",
    code:`// Kafka producer with exactly-once semantics
@Configuration
public class KafkaConfig {

    @Bean
    public ProducerFactory<String, OrderEvent> producerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        // Exactly-once: idempotent + transactions
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE);
        props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-producer-1");
        return new DefaultKafkaProducerFactory<>(props);
    }
}

@Service
public class OrderEventPublisher {

    @Autowired private KafkaTemplate<String, OrderEvent> kafka;
    @Autowired private OrderRepository repo;

    // Transactional outbox pattern
    @Transactional  // DB + Kafka in one transaction scope
    public void placeOrder(Order order) {
        repo.save(order);  // DB write

        kafka.executeInTransaction(ops -> {
            ops.send("orders", order.getId(), new OrderEvent(order));
            return null;
        }); // Kafka commit only if DB commit succeeds
    }
}

// Consumer with manual offset commit
@KafkaListener(topics = "orders", groupId = "fulfillment-service",
               concurrency = "3")  // 3 threads = 3 partitions
public class OrderConsumer {

    @KafkaHandler
    public void handle(OrderEvent event, Acknowledgment ack) {
        try {
            fulfillmentService.process(event);
            ack.acknowledge(); // commit offset only on success
        } catch (RetryableException e) {
            // Don't ack — message will be redelivered
            throw e;
        }
    }
}`,
    notes:"concurrency=3 means 3 consumer threads per instance. With 12 partitions and 4 instances: 12/4=3 threads each — saturates all partitions."
  },
  interview:[
    {question:"How do you ensure ordering of messages in Kafka?",
     answer:`Kafka guarantees ordering **within a partition**. Cross-partition ordering is not guaranteed.\n\n**To ensure ordered processing for a logical entity:**\n1. **Partition by entity key** — all events for orderId=42 go to the same partition (hash of key mod partitions). Same partition → single consumer → ordered.\n2. **Single partition** — extreme: 1 partition = total order, but 1 consumer max throughput.\n3. **Application-side ordering** — use sequence numbers in events; consumer buffers and reorders.\n\n**Gotcha:** If a consumer fails and rebalance occurs, a new consumer picks up mid-stream. With at-least-once delivery, ensure idempotent processing.`,
     followUps:["What happens when a Kafka consumer is slow and lags behind?","Explain the differences between at-most-once, at-least-once, and exactly-once delivery."]
    }
  ],
  tradeoffs:{
    pros:["10M+ msg/s throughput","Durable — disk-backed, replicated","Replay — consumers can re-read old events","Fan-out — multiple consumer groups each see all messages"],
    cons:["Operational complexity (ZooKeeper/KRaft, schema registry)","No built-in message filtering — consumers must filter","Rebalancing pauses all consumers in a group (improvement: static membership)"],
    when:"Use Kafka for: event sourcing, audit logs, cross-service async communication, stream processing (Kafka Streams / Flink). For simple task queues, consider RabbitMQ or SQS."
  },
  architecture:{
    title:"Kafka Cluster — Producer to Consumer",
    caption:"Partitions distribute load; consumer groups enable parallel processing",
    lanes:[
      {label:"Producers",nodes:[
        {id:"order-svc",label:"Order Service",hint:"Produces OrderCreated events"},
        {id:"payment-svc",label:"Payment Service",hint:"Produces PaymentCompleted events"}
      ]},
      {label:"Kafka Cluster",nodes:[
        {id:"broker1",label:"Broker 1 (Leader P0,P1)",hint:"Partitions 0 and 1 leaders",detail:"Broker 1 is leader for partitions 0 and 1. Producers write to leader. Followers (Broker 2,3) replicate."},
        {id:"broker2",label:"Broker 2 (Leader P2)",hint:"Partition 2 leader",detail:"Broker 2 is leader for partition 2. Also follower for P0 and P1."},
        {id:"broker3",label:"Broker 3 (Follower)",hint:"All partitions follower",detail:"Broker 3 is follower for all partitions. Elected leader if Broker 1 or 2 fail."}
      ]},
      {label:"Consumer Groups",nodes:[
        {id:"fulfillment",label:"Fulfillment Group",badge:"3 consumers",hint:"Parallel consumers = partitions",detail:"3 consumer instances, each handling 1 partition. Max parallelism = partition count (3)."},
        {id:"analytics",label:"Analytics Group",badge:"1 consumer",hint:"Independent group — sees all events",detail:"Analytics consumer group reads all events independently. Kafka fan-out: multiple groups each get full stream."}
      ]}
    ],
    links:[
      {from:"order-svc",to:"broker1",label:"Produce to P0 (key hash)",detail:"Producer hashes orderId key → partition 0 on Broker 1.",type:"async"},
      {from:"payment-svc",to:"broker2",label:"Produce to P2",detail:"PaymentService events route to partition 2.",type:"async"},
      {from:"broker1",to:"broker2",label:"Replication (ISR)",detail:"Broker 1 streams P0 WAL to followers for durability.",type:"async"},
      {from:"broker1",to:"fulfillment",label:"Consume P0",detail:"Consumer 1 in fulfillment group reads partition 0.",type:"async"},
      {from:"broker2",to:"fulfillment",label:"Consume P2",detail:"Consumer 3 reads partition 2 in parallel.",type:"async"},
      {from:"broker1",to:"analytics",label:"Consume all (offset 0)",detail:"Analytics group independently reads from beginning if needed (replay).",type:"async"}
    ]
  }
},

/* ── 15. Messaging Patterns ───────────────────────────────── */
{
  id:"sd-messaging-patterns", area:"sysdesign",
  title:"Messaging Patterns — Queue, Pub/Sub, Outbox & Dead Letter",
  tag:"Messaging", tags:["message queue","pub sub","dead letter","outbox pattern","rabbitmq","sqs","fanout","at least once","idempotent"],
  concept:`**Point-to-point queue:** Message goes to exactly one consumer. Work queue pattern. RabbitMQ/SQS.
**Pub/sub:** Publisher sends to topic; all subscribers receive a copy. SNS, Kafka consumer groups, Redis pub/sub.

**Delivery guarantees:**
- **At-most-once** — fire and forget. No ack, no retry. May lose messages. Best throughput.
- **At-least-once** — ack required; on failure retry. May duplicate. Consumer must be idempotent.
- **Exactly-once** — idempotent producer + transactional consumer. Kafka EOS, SQS FIFO + deduplication ID.

**Outbox pattern** — solve dual-write problem (DB + message broker in one atomic operation):
1. Write event to \`outbox\` table in same DB transaction as business data
2. Background process (Debezium CDC or polling) reads outbox table and publishes to broker
3. On success, mark outbox row as processed

**Dead Letter Queue (DLQ):**
Messages that fail after N retries are moved to a DLQ. Allows inspection, replay, and alerting without blocking the main queue.

**Fan-out pattern (SNS + SQS):**
SNS topic → multiple SQS queues. Each queue serves a different downstream service. Fully decoupled.

**Competing consumers:** Multiple workers read from one queue. Throughput scales horizontally. Auto-scaling based on queue depth (SQS + Lambda / ECS).`,
  why:`Messaging is the glue of distributed systems. Understanding delivery guarantees and the outbox pattern is critical for building correct async services.`,
  example:{
    language:"java",
    code:`// Outbox pattern with Spring + Debezium CDC
// Step 1: Write order + outbox entry in one transaction
@Service
@Transactional
public class OrderService {

    @Autowired private OrderRepository orderRepo;
    @Autowired private OutboxRepository outboxRepo;

    public Order createOrder(CreateOrderRequest req) {
        Order order = orderRepo.save(new Order(req));

        // Same DB transaction — atomically consistent
        outboxRepo.save(OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderCreated")
            .payload(toJson(order))
            .status(OutboxStatus.PENDING)
            .build());

        return order; // Kafka publish happens via Debezium CDC, not here
    }
}

// Step 2: Debezium CDC config (listens to outbox table changes)
// application.yml
// debezium:
//   connector.class: io.debezium.connector.postgresql.PostgresConnector
//   database.server.name: myapp
//   table.include.list: public.outbox_events
//   transforms: outbox
//   transforms.outbox.type: io.debezium.transforms.outbox.EventRouter

// Step 3: Consumer — idempotent processing
@KafkaListener(topics = "order.OrderCreated")
public class OrderCreatedConsumer {

    @Autowired private ProcessedEventRepository processed;
    @Autowired private InventoryService inventory;

    public void handle(OrderCreatedEvent event) {
        // Idempotency check — skip if already processed
        if (processed.existsByEventId(event.getId())) return;

        inventory.reserve(event.getItems());
        processed.save(new ProcessedEvent(event.getId()));
    }
}`,
    notes:"Debezium uses PostgreSQL logical replication to capture outbox table changes — no polling overhead, sub-second latency."
  },
  interview:[
    {question:"How would you design a notification system for 100M users?",
     answer:`1. **Event bus:** User actions publish events to Kafka topic \`user.events\`\n2. **Notification service:** Kafka consumer group reads events, applies notification rules (preferences, quiet hours, dedup)\n3. **Fan-out to channels:** SNS topic per channel type → SQS queues for push (FCM/APNs), email (SES), SMS (Twilio)\n4. **Workers per channel:** ECS/Lambda workers drain queues, call third-party APIs with retry + DLQ\n5. **Rate limiting:** Per-user rate limits to avoid notification spam (Redis sorted set sliding window)\n6. **Deduplication:** Notification ID stored in Redis/DB; skip if already sent within dedup window\n\n**Scale:** Kafka can handle 10M events/s. Each SQS queue auto-scales workers. At 100M users, push notifications batch via FCM's batch API (1000/request).`,
     followUps:["How do you handle FCM/APNs delivery failures?","How would you implement quiet hours per timezone?"]
    }
  ],
  tradeoffs:{
    pros:["Decouples services — producer and consumer evolve independently","Async processing improves throughput","DLQ prevents poisoned messages from blocking processing"],
    cons:["Eventual consistency — consumer may lag","At-least-once requires idempotent consumers","Debugging async flows is harder than synchronous"],
    when:"Use async messaging for: notifications, email, audit logs, inter-service events, workflow orchestration. Keep synchronous for: payment confirmation, inventory reservation (need immediate response)."
  },
  flow:{
    title:"Outbox → Kafka → Consumer Flow",
    caption:"Outbox pattern solves dual-write; DLQ handles poison messages",
    nodes:[
      {id:"app",label:"Order Service",hint:"Business logic + DB write"},
      {id:"db",label:"PostgreSQL",hint:"orders + outbox tables"},
      {id:"debezium",label:"Debezium CDC",hint:"Captures outbox table changes"},
      {id:"kafka",label:"Kafka Topic",hint:"order.OrderCreated"},
      {id:"consumer",label:"Inventory Consumer",hint:"Idempotent processor"},
      {id:"dlq",label:"Dead Letter Queue",hint:"Failed messages after N retries"}
    ],
    steps:[
      {path:["app","db"],label:"Atomic DB write",detail:"Order + OutboxEvent written in one DB transaction. No dual-write risk."},
      {path:["db","debezium"],label:"CDC captures change",detail:"Debezium reads PostgreSQL WAL (logical replication). Detects new outbox row."},
      {path:["debezium","kafka"],label:"Publish to Kafka",detail:"Debezium publishes event to Kafka topic. Reliable — Kafka is durable."},
      {path:["kafka","consumer"],label:"Consumer reads event",detail:"Inventory consumer reads OrderCreated. Checks idempotency key. Reserves stock."},
      {path:["consumer","dlq"],label:"On failure → DLQ",detail:"If consumer fails after 3 retries, message moved to DLQ for inspection and manual replay."}
    ]
  }
},

/* ── 16. Compute Spectrum ─────────────────────────────────── */
{
  id:"sd-compute-spectrum", area:"sysdesign",
  title:"Compute Spectrum — VMs, Containers & Serverless",
  tag:"Compute", tags:["vm","container","serverless","lambda","docker","kubernetes","fargate","cold start","ec2"],
  concept:`**Spectrum from most to least control:**

**1. Bare Metal → EC2 (Virtual Machines)**
- Full OS control. Predictable performance. No noisy-neighbour.
- Best for: databases, high-performance compute, compliance requiring isolation.
- Cost: highest. Startup: minutes. Management: full.

**2. Containers (Docker + Kubernetes / ECS)**
- Share host OS kernel. Lightweight (~10MB vs GB for VM). Start in seconds.
- Portable — same image runs locally, CI, and production.
- Kubernetes: orchestration, auto-healing, rolling deploys, HPA.
- Best for: long-running web services, background workers, scheduled jobs.

**3. Serverless (Lambda, Cloud Functions, Fargate)**
- No servers to manage. Pay per invocation. Auto-scales to zero.
- **Cold start:** container initialisation latency (100ms–3s for Java; <50ms for Go/Node).
- Concurrency model: each invocation is isolated. No shared state in process.
- Best for: event-driven processing, infrequent workloads, ETL, webhooks.

**Comparison:**
| | VM (EC2) | Container (K8s) | Serverless (Lambda) |
|---|---|---|---|
| Startup | Minutes | Seconds | 100ms–3s |
| Cost model | Per hour | Per hour | Per invocation |
| Scale to zero | No | Possible (KEDA) | Yes |
| State | Persistent disk | Ephemeral pod | No persistent state |
| Cold start | N/A | Seconds | Yes (critical issue) |
| Max duration | Unlimited | Unlimited | 15 min (Lambda) |`,
  why:`Choosing the wrong compute model costs money or creates operational burden. Lambda for 24/7 high-traffic = 10× more expensive than EC2. EC2 for sporadic events = paying for idle.`,
  example:{
    language:"yaml",
    code:`# AWS Lambda — event-driven, scales to zero
# serverless.yml (Serverless Framework)
service: order-processor
provider:
  name: aws
  runtime: java17
  memorySize: 512
  timeout: 30
  environment:
    DB_URL: !Sub "jdbc:postgresql://${DbHost}/orders"

functions:
  processOrder:
    handler: com.example.OrderHandler::handleRequest
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10           # Process 10 SQS messages per invocation
          maximumBatchingWindow: 5 # Wait up to 5s to fill batch

  # HTTP API (API Gateway → Lambda)
  getOrder:
    handler: com.example.OrderQueryHandler::handleRequest
    events:
      - httpApi:
          path: /orders/{id}
          method: GET
    # Provisioned concurrency to eliminate cold starts for hot path
    provisionedConcurrency: 5

---
# SnapStart (Java Lambda) — pre-initialise JVM snapshot
# Add to Lambda config:
# SnapStart:
#   ApplyOn: PublishedVersions
# Reduces Java cold start from 3s → 200ms`,
    notes:"Lambda SnapStart (Java) takes a snapshot of the initialised JVM. Restores from snapshot instead of cold-starting — reduces latency by 10×."
  },
  interview:[
    {question:"How do you reduce Lambda cold start latency for a Java service?",
     answer:`**Cold start causes:** JVM startup (~500ms) + class loading + Spring context initialization (500ms-2s).\n\n**Mitigation strategies:**\n1. **Lambda SnapStart** — JVM snapshot taken after init; restored on cold start. Java 17+.\n2. **Provisioned concurrency** — keep N Lambda instances warm. Eliminates cold starts but costs per hour.\n3. **Smaller deployment package** — fewer classes to load. Use tree-shaking, avoid fat jars.\n4. **GraalVM native image** — compile Java to native binary. Start in <50ms. But: longer build, limited reflection.\n5. **Switch runtime** — Node.js/Go/Python have 50-100ms cold starts vs Java's 1-3s.\n6. **Keep warm ping** — EventBridge rule pings Lambda every 5 minutes. Dirty solution, not reliable.`,
     followUps:["What is GraalVM native compilation and what are its limitations?","How does Lambda handle 10,000 concurrent invocations?"]
    }
  ],
  tradeoffs:{
    pros:["Serverless: zero ops, auto-scale, pay-per-use","Containers: portability + K8s orchestration","VMs: maximum performance predictability"],
    cons:["Serverless: cold starts, 15-min max, stateless","Containers: K8s complexity","VMs: slow provisioning, manual scaling"],
    when:"Serverless for event-driven, infrequent, or unpredictable loads. Containers for steady web services. VMs for databases and performance-critical compute."
  }
},

/* ── 17. Kubernetes Production ────────────────────────────── */
{
  id:"sd-kubernetes-prod", area:"sysdesign",
  title:"Kubernetes in Production — Pods, HPA & Rolling Deploys",
  tag:"Compute", tags:["kubernetes","k8s","pod","deployment","hpa","service","ingress","rolling deploy","liveness probe","readiness probe"],
  concept:`**Core Kubernetes objects:**

**Pod** — smallest deployable unit. One or more containers sharing network namespace and volumes. Ephemeral — never SSH into a pod.

**Deployment** — manages a ReplicaSet (N pod replicas). Handles rolling updates and rollbacks.

**Service** — stable virtual IP + DNS name for a set of pods. Types: ClusterIP (internal), NodePort, LoadBalancer (cloud LB), ExternalName.

**Ingress** — L7 HTTP routing rule (path/host → Service). Implemented by ingress controllers (nginx, Traefik, ALB Ingress).

**ConfigMap + Secret** — externalise configuration. Secrets base64-encoded (not encrypted by default — use Sealed Secrets or External Secrets Operator with AWS Secrets Manager).

**HPA (Horizontal Pod Autoscaler)** — scales Deployment replica count based on CPU/memory/custom metrics (via KEDA for queue depth).

**Rolling deploy strategy:**
\`\`\`
maxSurge: 1      # Allow 1 extra pod during update
maxUnavailable: 0 # Keep all pods available (zero downtime)
\`\`\`
New pods start → pass readiness probe → added to service endpoints → old pods terminated.

**Probes:**
- **Liveness** — is pod alive? Failure → container restart.
- **Readiness** — is pod ready to receive traffic? Failure → removed from service endpoints (but not restarted).
- **Startup** — for slow-starting apps. Disables liveness until started.`,
  why:`K8s is the industry standard for container orchestration. Interview questions cover deployments, scaling, networking, and troubleshooting. Understanding probes alone can save hours of incident debugging.`,
  example:{
    language:"yaml",
    code:`# Production-grade Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime deploy
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v2.1.0
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:v2.1.0
          ports: [{containerPort: 8080}]
          resources:
            requests: {cpu: "100m", memory: "256Mi"}
            limits:   {cpu: "500m", memory: "512Mi"}
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          readinessProbe:
            httpGet: {path: /actuator/health/readiness, port: 8080}
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: {path: /actuator/health/liveness, port: 8080}
            initialDelaySeconds: 30
            periodSeconds: 10
---
# HPA — scale on CPU + custom metric (queue depth)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External             # KEDA custom metric
      external:
        metric:
          name: sqs_messages_visible
          selector:
            matchLabels:
              queue: order-queue
        target:
          type: AverageValue
          averageValue: "30"     # Scale up if >30 msgs/pod`,
    notes:"Always set resource requests+limits. Without them, pods can starve other pods (requests) or be OOMKilled (limits). requests=what scheduler uses; limits=hard cap."
  },
  interview:[
    {question:"What happens when a pod fails its liveness probe?",
     answer:`The kubelet on the node restarts the container (not the pod). The pod itself stays — it retains its IP, volumes, and resource reservation. The container's process is killed and restarted according to the pod's \`restartPolicy\` (default: Always).\n\n**Key distinction from readiness:** A failed readiness probe removes the pod from Service endpoints (no traffic) but doesn't restart it. A failed liveness probe restarts the container.\n\n**Common pitfall:** Setting liveness probe path same as a heavyweight health endpoint. If liveness probe itself causes load → cascade. Use a simple fast endpoint for liveness (\`/live\`) separate from deep health check.`,
     followUps:["What is pod disruption budget and why is it important?","How does K8s handle node failure?"]
    }
  ],
  tradeoffs:{
    pros:["Self-healing (pod restart, node replacement)","Declarative — desired state reconciled automatically","Rich ecosystem: Helm, Kustomize, ArgoCD, KEDA"],
    cons:["Steep learning curve","etcd is a critical single point — must be HA","Networking complexity (CNI, service mesh)"],
    when:"K8s for anything running more than a handful of microservices in production. Use managed K8s (EKS, GKE, AKS) — running your own control plane is expensive."
  }
},

/* ── 18. Microservice Design ──────────────────────────────── */
{
  id:"sd-microservice-design", area:"sysdesign",
  title:"Microservice Design — DDD, Boundaries & Strangler Fig",
  tag:"Architecture", tags:["microservices","ddd","bounded context","strangler fig","service mesh","domain driven design","aggregate","anti-corruption layer"],
  concept:`**Domain-Driven Design (DDD)** provides the vocabulary for designing microservice boundaries.

**Key DDD concepts:**
- **Domain** — the problem space your business operates in
- **Bounded Context** — an explicit boundary within which a domain model applies. Different BCs can use the same word with different meanings (Order in Shipping BC vs Order in Billing BC).
- **Aggregate** — cluster of entities treated as a single unit for data changes. All changes go through the aggregate root. Example: Order aggregate (root) + OrderItems + DeliveryAddress.
- **Domain Events** — facts that happened in the domain (OrderPlaced, PaymentFailed). First-class citizens for integration between BCs.
- **Anti-Corruption Layer (ACL)** — translation layer between two BCs to prevent one's model from leaking into the other.

**Service boundary heuristics:**
1. Each service owns one bounded context
2. Services communicate via domain events (async) or well-defined APIs (sync)
3. No shared database — each service has its own DB (polyglot persistence)
4. Services can be deployed independently
5. A service can be rewritten without changing other services

**Strangler Fig pattern** — migrate monolith to microservices incrementally:
1. Route new feature traffic to new microservice (via API gateway)
2. Gradually migrate existing features to microservices
3. Decommission monolith code path once all traffic migrated
4. Monolith "strangled" over months/years without big-bang rewrite`,
  why:`Getting service boundaries wrong is the #1 failure mode in microservices migrations. Too fine-grained = distributed monolith (services chatty, tightly coupled). Too coarse = monolith with deployment overhead.`,
  example:{
    language:"java",
    code:`// DDD Aggregate Root — Order with invariant enforcement
@Entity
public class Order {  // Aggregate Root
    @Id private OrderId id;
    private CustomerId customerId;
    private OrderStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();  // Entities within aggregate

    private Money total;

    // All mutations go through the aggregate root — enforces invariants
    public void addItem(ProductId productId, int quantity, Money price) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify a confirmed order");
        }
        items.add(new OrderItem(productId, quantity, price));
        this.total = calculateTotal();
    }

    public void confirm() {
        if (items.isEmpty()) throw new IllegalStateException("Cannot confirm empty order");
        if (status != OrderStatus.DRAFT) throw new IllegalStateException("Order already confirmed");
        this.status = OrderStatus.CONFIRMED;
        // Register domain event — don't publish directly from aggregate
        DomainEvents.raise(new OrderConfirmed(this.id, this.customerId, this.total));
    }

    // Factory method — always creates valid aggregate
    public static Order create(CustomerId customerId) {
        return new Order(OrderId.generate(), customerId, OrderStatus.DRAFT);
    }
}

// Anti-Corruption Layer — translate between Billing BC and Shipping BC
@Service
public class ShippingAdapter {
    // Billing domain uses "Order"; Shipping domain uses "Shipment"
    public Shipment toShipment(com.billing.Order billingOrder) {
        return Shipment.builder()
            .referenceId(billingOrder.getId().toString())
            .destination(mapAddress(billingOrder.getDeliveryAddress()))
            .items(billingOrder.getItems().stream()
                .map(this::toShipmentItem).collect(toList()))
            .build();
    }
}`,
    notes:"Aggregate boundaries = transaction boundaries. Never hold a transaction across aggregate roots — use eventual consistency via domain events instead."
  },
  interview:[
    {question:"How do you decide the right size for a microservice?",
     answer:`**Too small (nano-services):**\n- Excessive network calls between services (chattiness)\n- Distributed transactions for what should be local operations\n- Operational overhead disproportionate to value\n\n**Too large:**\n- Independent deployability compromised (change in one area requires full deployment)\n- Teams stepping on each other's code\n\n**Right size heuristics:**\n1. **Single bounded context** — one team, one service, one deployment\n2. **Two-pizza rule** — if it takes more than 2 pizzas to feed the team, split the service\n3. **Change frequency** — frequently changed together = together in one service\n4. **Data ownership** — each service owns its data; if two services share a table, merge them\n5. **The 3R test:** Can you Rewrite it in 2 weeks, Release independently, and Run it autonomously?`,
     followUps:["What is the Strangler Fig pattern and when would you use it?","How do you handle distributed transactions when each service has its own database?"]
    }
  ],
  tradeoffs:{
    pros:["Independent deployability and scaling","Technology heterogeneity — right tool per service","Fault isolation — one service down doesn't take all others"],
    cons:["Distributed system complexity — network failures, latency, consistency","Operational overhead — monitoring 50 services vs 1 monolith","Data consistency across services requires eventual consistency patterns"],
    when:"Start with a modular monolith. Extract microservices when: team size > 8, deployment bottlenecks, need to scale one component independently, different technology requirements per component."
  }
}

];

// Append Part 2 topics to the global array
if (window.SYSDESIGN_TOPICS) {
  window.SYSDESIGN_TOPICS = window.SYSDESIGN_TOPICS.concat(part2);
} else {
  window.SYSDESIGN_TOPICS = part2;
}
})();

/* ============================================================
   Part 3 — topics 19-26 appended
   ============================================================ */
(function(){
var part3 = [

/* ── 19. Event-Driven Architecture ───────────────────────── */
{
  id:"sd-event-driven", area:"sysdesign",
  title:"Event-Driven Architecture — EDA, CQRS & Event Sourcing",
  tag:"Architecture", tags:["eda","cqrs","event sourcing","event store","projection","read model","axon","domain events"],
  concept:`**Event-Driven Architecture (EDA):** Services communicate by publishing and consuming events. No direct coupling — publisher doesn't know about consumers.

**Event types:**
- **Domain event** — something that happened (OrderPlaced, PaymentProcessed). Immutable fact.
- **Command** — intent to change state (PlaceOrder). Can be rejected.
- **Query** — read request. No side effects.

**CQRS (Command Query Responsibility Segregation):**
Separate write model (commands → aggregates → events) from read model (projections optimised for queries).
- Write side: normalised, event-sourced, strongly consistent
- Read side: denormalised, eventually consistent, optimised for specific views

**Event Sourcing:** Store state as a sequence of events rather than current state.
\`\`\`
Events: [OrderCreated, ItemAdded, ItemAdded, OrderConfirmed, PaymentFailed, Retried, PaymentSuccess]
Current state = apply(all events) = {status: PAID, items: [...], total: 99.99}
\`\`\`

**Benefits:** Complete audit trail, temporal queries ("what was the state on Tuesday?"), replay to fix bugs, event-driven integration is natural.

**Challenges:** Event schema evolution (upcasters), eventual consistency, projections can lag, complex debugging.

**Snapshot optimization:** After N events, store a snapshot of current state. Rebuild from snapshot + events since snapshot.`,
  why:`CQRS+ES appears in DDD-heavy organizations (banking, insurance, logistics). Understanding it separates architects from developers in senior interviews.`,
  example:{
    language:"java",
    code:`// Event Sourcing with Axon Framework
@Aggregate
public class OrderAggregate {
    @AggregateIdentifier private String orderId;
    private OrderStatus status;
    private List<OrderItem> items = new ArrayList<>();

    // Command handler — validates and emits event
    @CommandHandler
    public OrderAggregate(CreateOrderCommand cmd) {
        AggregateLifecycle.apply(new OrderCreatedEvent(
            cmd.getOrderId(), cmd.getCustomerId()));
    }

    @CommandHandler
    public void handle(AddItemCommand cmd) {
        if (status != OrderStatus.DRAFT)
            throw new IllegalStateException("Cannot modify confirmed order");
        AggregateLifecycle.apply(new ItemAddedEvent(
            orderId, cmd.getProductId(), cmd.getQuantity(), cmd.getPrice()));
    }

    // Event sourcing handler — rebuilds state from events
    @EventSourcingHandler
    public void on(OrderCreatedEvent event) {
        this.orderId = event.getOrderId();
        this.status = OrderStatus.DRAFT;
    }

    @EventSourcingHandler
    public void on(ItemAddedEvent event) {
        this.items.add(new OrderItem(event.getProductId(),
                                     event.getQuantity(), event.getPrice()));
    }
}

// Projection — builds read model from events
@Component
@ProcessingGroup("order-summary-projection")
public class OrderSummaryProjection {

    @Autowired private OrderSummaryRepository repository;

    @EventHandler
    public void on(OrderCreatedEvent event) {
        repository.save(new OrderSummary(event.getOrderId(),
                                         event.getCustomerId(), OrderStatus.DRAFT));
    }

    @EventHandler
    public void on(ItemAddedEvent event) {
        OrderSummary summary = repository.findById(event.getOrderId()).orElseThrow();
        summary.addItem(event.getProductId(), event.getQuantity(), event.getPrice());
        repository.save(summary);
    }

    // Query handler — serves read model
    @QueryHandler
    public OrderSummary handle(GetOrderSummaryQuery query) {
        return repository.findById(query.getOrderId()).orElseThrow();
    }
}`,
    notes:"Axon stores events in its Event Store. Projections are rebuilt by replaying all events — allows fixing bugs in projections without touching source data."
  },
  interview:[
    {question:"What are the downsides of event sourcing?",
     answer:`1. **Eventual consistency** — projections (read models) lag behind the event store. Reads may return stale data.\n2. **Schema evolution** — once an event is stored, you can't change its structure without upcasters (migration functions that transform old events to new shape).\n3. **Query complexity** — you can't do ad-hoc SQL queries on event store; must build projections for every query pattern.\n4. **Performance** — rebuilding state from 10,000 events per aggregate is slow without snapshots.\n5. **Mental model shift** — team must think in events, not CRUD. High learning curve.\n6. **Debugging** — a bug manifests across many events; hard to reason about current state.`,
     followUps:["What is an upcaster in event sourcing?","When would you NOT use event sourcing?"]
    }
  ],
  tradeoffs:{
    pros:["Complete audit trail (built-in compliance)","Replay events to fix bugs or build new projections","Natural fit for event-driven integration"],
    cons:["Eventual consistency complexity","Schema evolution requires upcasters","Overkill for simple CRUD applications"],
    when:"Use for: complex domains with audit requirements (finance, healthcare), workflows with many state transitions, systems where historical data replay has value. Avoid for: simple CRUD, small teams without DDD experience."
  },
  flow:{
    title:"CQRS Write + Read Path",
    caption:"Commands mutate via aggregates; queries read from projections",
    nodes:[
      {id:"client",label:"Client",hint:"Sends commands and queries"},
      {id:"cmd-bus",label:"Command Bus",hint:"Routes command to handler"},
      {id:"aggregate",label:"Order Aggregate",hint:"Validates + emits events"},
      {id:"event-store",label:"Event Store",hint:"Immutable append-only log"},
      {id:"projection",label:"Projection",hint:"Builds read model from events"},
      {id:"read-db",label:"Read DB",hint:"Optimised read model (denormalised)"},
      {id:"query-handler",label:"Query Handler",hint:"Serves read model"}
    ],
    steps:[
      {path:["client","cmd-bus"],label:"Send command",detail:"Client sends PlaceOrderCommand. Command bus routes to OrderCommandHandler."},
      {path:["cmd-bus","aggregate"],label:"Command handled",detail:"Aggregate validates business rules. If valid, emits OrderPlacedEvent."},
      {path:["aggregate","event-store"],label:"Persist event",detail:"Event appended to event store. Immutable — never updated or deleted."},
      {path:["event-store","projection"],label:"Event triggers projection",detail:"Projection handler subscribes to event store. Rebuilds read model on each new event."},
      {path:["projection","read-db"],label:"Update read model",detail:"Denormalised view updated in read DB (e.g. Elasticsearch or PostgreSQL view)."},
      {path:["client","query-handler"],label:"Query read model",detail:"Client queries via query bus. Handler reads from fast, denormalised read DB."},
      {path:["query-handler","read-db"],label:"Return projection",detail:"Read model returned. No joining — pre-computed view."}
    ]
  }
},

/* ── 20. Saga Patterns ────────────────────────────────────── */
{
  id:"sd-saga-patterns", area:"sysdesign",
  title:"Saga Pattern — Distributed Transactions Without 2PC",
  tag:"Architecture", tags:["saga","orchestration","choreography","distributed transaction","compensation","2pc","long running transaction"],
  concept:`**The problem:** When an operation spans multiple microservices (order placement = create order + reserve inventory + charge payment), you need atomicity — but each service has its own DB, so traditional 2PC is impractical.

**2PC problems:** Coordinator is a single point of failure; all participants must be synchronously available; holds locks during prepare phase (deadly for performance).

**Saga pattern:** Break the distributed transaction into a sequence of local transactions. Each step publishes an event. If a step fails, execute **compensating transactions** to undo previous steps.

**Choreography saga:** Services react to events from each other. No central coordinator.
- Pros: simple, no SPOF, loose coupling
- Cons: hard to track workflow state, circular dependencies, hard to debug

**Orchestration saga:** A central **Saga Orchestrator** coordinates the sequence, calls each service, and manages compensation on failure.
- Pros: workflow visible in one place, easier to add steps, centralized error handling
- Cons: orchestrator can become a bottleneck, extra service to deploy

**Compensation example (order cancellation):**
\`\`\`
Forward:      CreateOrder → ReserveInventory → ChargePayment → ShipOrder
Compensation: CancelOrder ← ReleaseInventory ← RefundPayment ← CancelShipment
\`\`\`

**Idempotency:** Each step must be idempotent — retrying a compensating transaction must be safe.`,
  why:`Saga is the go-to pattern for distributed transactions in microservices. Every e-commerce, fintech, and logistics system uses it. Understanding choreography vs orchestration trade-offs is a senior-level expectation.`,
  example:{
    language:"java",
    code:`// Orchestration Saga with Spring State Machine
@Service
public class OrderSagaOrchestrator {

    @Autowired private InventoryServiceClient inventory;
    @Autowired private PaymentServiceClient payment;
    @Autowired private ShippingServiceClient shipping;
    @Autowired private SagaStateRepository sagaRepo;

    @Transactional
    public SagaResult placeOrder(PlaceOrderRequest req) {
        SagaState saga = sagaRepo.save(SagaState.start(req.getOrderId()));

        try {
            // Step 1: Reserve inventory
            saga.transition(SagaStep.RESERVING_INVENTORY);
            inventory.reserve(req.getOrderId(), req.getItems()); // idempotent
            saga.transition(SagaStep.INVENTORY_RESERVED);

            // Step 2: Charge payment
            saga.transition(SagaStep.CHARGING_PAYMENT);
            payment.charge(req.getOrderId(), req.getAmount()); // idempotent
            saga.transition(SagaStep.PAYMENT_CHARGED);

            // Step 3: Create shipment
            saga.transition(SagaStep.CREATING_SHIPMENT);
            shipping.createShipment(req.getOrderId(), req.getAddress());
            saga.transition(SagaStep.COMPLETED);

            sagaRepo.save(saga);
            return SagaResult.success();

        } catch (InventoryException e) {
            // No compensation needed — inventory was never reserved
            saga.fail(e.getMessage());
            sagaRepo.save(saga);
            return SagaResult.failure("Insufficient inventory");

        } catch (PaymentException e) {
            // Compensate: release inventory
            saga.transition(SagaStep.COMPENSATING);
            inventory.release(req.getOrderId()); // compensation — idempotent
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Payment failed — inventory released");

        } catch (ShippingException e) {
            // Compensate: refund payment + release inventory
            saga.transition(SagaStep.COMPENSATING);
            payment.refund(req.getOrderId());    // compensation
            inventory.release(req.getOrderId()); // compensation
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Shipping failed — payment refunded");
        }
    }
}`,
    notes:"Always persist saga state before and after each step. On crash, restart mechanism can resume from last known state and retry or compensate."
  },
  interview:[
    {question:"When would you choose choreography saga over orchestration saga?",
     answer:`**Choreography:** Each service listens for events and decides what to do next.\n- Choose when: few steps (2-3), loose coupling priority, team autonomy important, simple linear flow\n- Problem: as steps grow, workflow becomes a distributed state machine spread across services — hard to understand and debug. "What is the current state of order 42?" requires querying all services.\n\n**Orchestration:** Central orchestrator controls the flow.\n- Choose when: complex workflows (5+ steps), need centralized monitoring and visibility, conditional logic needed, team wants explicit failure handling\n- Problem: orchestrator knows about all services — creates coupling. Must be deployed and operated.\n\n**Hybrid:** Use orchestration for complex workflows but keep services autonomous (they don't know they're in a saga — just respond to commands).`,
     followUps:["How do you handle retries in a saga when a step fails intermittently?","What is the difference between a saga and a workflow engine (Temporal)?"]
    }
  ],
  tradeoffs:{
    pros:["Achieves distributed atomicity without distributed locks","Each service owns its local transaction","Compensations are business-meaningful operations (not technical rollbacks)"],
    cons:["Eventual consistency — order may be visible as partially created during saga","Compensation logic must be carefully designed for every failure scenario","Debugging failures across services is hard"],
    when:"Use when you need atomicity across services that own different databases. For read-heavy flows, prefer eventual consistency with idempotent consumers instead."
  },
  uml:{
    title:"Orchestration Saga — Order Placement",
    scenario:"Happy path and payment failure compensation",
    actors:[
      {id:"client",label:"Client"},
      {id:"orchestrator",label:"Saga Orchestrator"},
      {id:"inventory",label:"Inventory Svc"},
      {id:"payment",label:"Payment Svc"},
      {id:"shipping",label:"Shipping Svc"}
    ],
    messages:[
      {from:"client",to:"orchestrator",label:"PlaceOrder(orderId, items, amount)",detail:"Client initiates saga. Orchestrator coordinates all steps.",type:"sync"},
      {from:"orchestrator",to:"inventory",label:"ReserveInventory(orderId, items)",detail:"Step 1: Reserve stock. Idempotent — safe to retry.",type:"sync"},
      {from:"inventory",to:"orchestrator",label:"InventoryReserved",detail:"Success response — saga continues to step 2.",type:"sync"},
      {from:"orchestrator",to:"payment",label:"ChargePayment(orderId, amount)",detail:"Step 2: Charge payment. If this fails, must release inventory.",type:"sync"},
      {from:"payment",to:"orchestrator",label:"PaymentFailed (insufficient funds)",detail:"Payment rejected. Orchestrator must compensate step 1.",type:"sync"},
      {from:"orchestrator",to:"inventory",label:"ReleaseInventory(orderId) [COMPENSATION]",detail:"Compensating transaction: undo step 1 by releasing the reserved stock.",type:"async"},
      {from:"inventory",to:"orchestrator",label:"InventoryReleased",detail:"Compensation confirmed. Saga moves to COMPENSATED state.",type:"sync"},
      {from:"orchestrator",to:"client",label:"SagaFailed: Payment declined",detail:"Client receives failure response. Inventory never depleted from customer's perspective.",type:"sync"}
    ]
  }
},

/* ── 21. Resilience Patterns ──────────────────────────────── */
{
  id:"sd-resilience-all", area:"sysdesign",
  title:"Resilience — Circuit Breaker, Bulkhead, Retry & Backpressure",
  tag:"Resilience", tags:["circuit breaker","bulkhead","retry","timeout","backpressure","resilience4j","hystrix","rate limiting","fallback"],
  concept:`**Why resilience?** In a system of 20 services, if each has 99.9% availability, end-to-end availability is 0.999^20 = 98%. Cascading failures can make it much worse.

**Circuit Breaker (Fowler pattern):**
Three states: **CLOSED** (normal) → **OPEN** (fail fast) → **HALF_OPEN** (probe recovery).
- CLOSED: requests pass through. Track failure rate (e.g., >50% failures in 10s window).
- OPEN: reject immediately with fallback. Wait cooldown (e.g., 30s).
- HALF_OPEN: allow N test requests. If pass → CLOSED. If fail → OPEN again.

**Bulkhead (ship compartment analogy):**
Isolate resources per downstream. Thread pool or semaphore per dependency. If one dependency is slow, it exhausts only its own pool — doesn't starve other calls.

**Retry with exponential backoff + jitter:**
\`\`\`
Attempt 1: immediate
Attempt 2: wait 2^1 * 100ms = 200ms
Attempt 3: wait 2^2 * 100ms = 400ms + random jitter (0-100ms)
Max retries: 3
\`\`\`
Jitter prevents thundering herd on retry storms.

**Timeout:** Every network call MUST have a timeout. Without it, threads block forever on dead services → thread pool exhaustion → service death.

**Backpressure:** Producer slows down when consumer is overwhelmed. In Reactive (Project Reactor/RxJava), subscriber signals demand upstream. In Kafka, consumer lag serves as natural backpressure signal.

**Fallback strategies:**
- Return cached/stale data
- Return default/empty response
- Degrade gracefully (hide the feature)
- Queue for later processing`,
  why:`A service that doesn't protect itself will fail when its dependencies fail. Circuit breaker + timeout + bulkhead is the minimum viable resilience stack.`,
  example:{
    language:"java",
    code:`// Resilience4j — full stack: circuit breaker + retry + bulkhead + timeout
@Service
public class PaymentClient {

    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final Bulkhead bulkhead;
    private final TimeLimiter timeLimiter;

    public PaymentClient(Resilience4jConfig config) {
        // Circuit breaker: open after 50% failure rate in 10 call sliding window
        circuitBreaker = CircuitBreaker.of("payment",
            CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .slidingWindowSize(10)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .build());

        // Retry: 3 attempts, exponential backoff + jitter
        retry = Retry.of("payment",
            RetryConfig.custom()
                .maxAttempts(3)
                .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
                    Duration.ofMillis(200), 2.0, Duration.ofSeconds(2)))
                .retryOnException(e -> e instanceof RetryableException)
                .build());

        // Bulkhead: max 10 concurrent calls to payment service
        bulkhead = Bulkhead.of("payment",
            BulkheadConfig.custom()
                .maxConcurrentCalls(10)
                .maxWaitDuration(Duration.ofMillis(100))
                .build());

        timeLimiter = TimeLimiter.of("payment",
            TimeLimiterConfig.custom()
                .timeoutDuration(Duration.ofSeconds(5))
                .build());
    }

    public PaymentResult charge(ChargeRequest req) {
        Supplier<PaymentResult> call = () -> paymentApi.charge(req);

        // Compose: bulkhead → circuitBreaker → retry → timeLimiter
        return Decorators.ofSupplier(call)
            .withBulkhead(bulkhead)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .withFallback(List.of(CallNotPermittedException.class,
                                   BulkheadFullException.class),
                          e -> PaymentResult.degraded("Payment service unavailable"))
            .get();
    }
}`,
    notes:"Order of decorators matters: bulkhead → circuit breaker → retry. Retry inside circuit breaker means retries count toward failure rate."
  },
  interview:[
    {question:"Why add jitter to retry backoff?",
     answer:`Without jitter, all retrying clients wait exactly the same duration and fire simultaneously — creating a thundering herd that overloads the recovering service.\n\nWith jitter, each client waits \`backoff + random(0, backoff)\` — spreading requests over time and avoiding the synchronized burst.\n\n**Full-jitter formula (AWS recommendation):** \`sleep = random(0, min(cap, base * 2^attempt))\`\n\nThis ensures no two clients retry at the same instant, giving the recovering service time to stabilise.`,
     followUps:["When should you NOT retry?","What is circuit breaker half-open state and why is it needed?"]
    }
  ],
  tradeoffs:{
    pros:["Circuit breaker prevents cascade failures","Bulkhead limits blast radius of slow dependencies","Retry handles transient failures transparently"],
    cons:["Retry can amplify load on struggling service (without circuit breaker)","Circuit breaker adds configuration surface area","Timeout tuning is hard — too short = false positives, too long = thread starvation"],
    when:"Apply to every synchronous external call. Minimum: timeout + circuit breaker. Add retry only for idempotent operations. Add bulkhead for critical dependency isolation."
  },
  flow:{
    title:"Circuit Breaker State Machine",
    caption:"Fail fast in OPEN state; probe recovery with HALF_OPEN",
    nodes:[
      {id:"client",label:"Client",hint:"Makes calls to downstream"},
      {id:"cb-closed",label:"CLOSED",hint:"Normal operation — calls pass through"},
      {id:"cb-open",label:"OPEN",hint:"Fail fast — no calls to downstream"},
      {id:"cb-half",label:"HALF_OPEN",hint:"Probe — let few calls through"},
      {id:"downstream",label:"Downstream Service",hint:"Payment / Inventory / etc"},
      {id:"fallback",label:"Fallback",hint:"Cache / default / error"}
    ],
    steps:[
      {path:["client","cb-closed"],label:"Normal: CLOSED state",detail:"All requests pass through. Failure rate tracked in sliding window (50% threshold, 10 calls)."},
      {path:["cb-closed","downstream"],label:"Call forwarded",detail:"Request reaches downstream service normally. Latency and errors recorded."},
      {path:["cb-closed","cb-open"],label:"Threshold exceeded → OPEN",detail:"Failure rate >50% in window. Circuit opens immediately. Cooldown timer starts (30s)."},
      {path:["client","cb-open"],label:"Fail fast in OPEN",detail:"No calls reach downstream. Circuit breaker returns fallback immediately (<1ms)."},
      {path:["cb-open","fallback"],label:"Return fallback response",detail:"Cached data, default response, or error returned to caller."},
      {path:["cb-open","cb-half"],label:"Cooldown elapsed → HALF_OPEN",detail:"After 30s, circuit allows 3 test requests through."},
      {path:["cb-half","cb-closed"],label:"Tests pass → CLOSED",detail:"If test requests succeed → circuit closes. Normal operation resumes."},
      {path:["cb-half","cb-open"],label:"Tests fail → OPEN again",detail:"If test requests fail → circuit reopens. Cooldown resets."}
    ]
  }
},

/* ── 22. Observability ────────────────────────────────────── */
{
  id:"sd-observability", area:"sysdesign",
  title:"Observability — Metrics, Logs, Traces & Alerting",
  tag:"Operations", tags:["observability","prometheus","grafana","jaeger","opentelemetry","structured logging","sre","slo","sla","red method"],
  concept:`**The three pillars of observability:**

**1. Metrics** — aggregated numerical measurements over time.
- **RED method** (for services): Rate (requests/s), Errors (error rate %), Duration (latency p50/p95/p99)
- **USE method** (for resources): Utilisation, Saturation, Errors
- Stack: **Prometheus** (scrape + store) + **Grafana** (visualise) + **AlertManager** (alert)
- Pull model: Prometheus scrapes \`/metrics\` endpoint every 15s
- Cardinality warning: labels on metrics multiply storage. Never use userId as a label.

**2. Logs** — timestamped, structured records of events.
- **Structured logging** (JSON) enables filtering and aggregation: \`{"level":"ERROR","orderId":"42","service":"payment","latencyMs":234}\`
- Stack: **Fluentd/Fluent Bit** (collect) → **Elasticsearch** (index) → **Kibana** (search)
- Log levels: TRACE > DEBUG > INFO > WARN > ERROR. Production: INFO minimum.
- Correlation ID: propagate \`X-Request-ID\` header through all services; log it on every line.

**3. Distributed Traces** — end-to-end request journey across services.
- **OpenTelemetry** (OTel): vendor-neutral instrumentation standard. One SDK for metrics + logs + traces.
- Each request gets a **TraceId**. Each service creates a **Span** (start time, duration, tags).
- Stack: **OTel SDK** → **Jaeger / Zipkin / Tempo** (collect + visualise)
- Find which service in a 20-hop chain caused 500ms tail latency.

**SLO/SLI/SLA:**
- **SLI** (Service Level Indicator) — actual metric (error rate, p99 latency)
- **SLO** (Service Level Objective) — target (error rate < 0.1%, p99 < 200ms)
- **SLA** (Service Level Agreement) — contractual commitment with penalty
- **Error budget** = 100% - SLO availability. If consumed, freeze risky changes.`,
  why:`You can't fix what you can't see. Observability is the difference between resolving incidents in 5 minutes and 5 hours. SLO/error budgets are used at Google, Netflix, Spotify to balance reliability vs velocity.`,
  example:{
    language:"java",
    code:`// Spring Boot — Micrometer + OpenTelemetry + structured logging
@RestController
public class OrderController {

    private final Counter orderCounter;
    private final Timer orderLatency;
    private final Tracer tracer;

    public OrderController(MeterRegistry registry, Tracer tracer) {
        this.orderCounter = Counter.builder("orders.created")
            .tag("service", "order-service")
            .register(registry);
        this.orderLatency = Timer.builder("orders.latency")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(registry);
        this.tracer = tracer;
    }

    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest req) {
        Span span = tracer.spanBuilder("createOrder").startSpan();
        try (var scope = span.makeCurrent()) {
            span.setAttribute("order.customerId", req.getCustomerId());

            Timer.Sample sample = Timer.start();
            Order order = orderService.create(req);
            sample.stop(orderLatency);

            orderCounter.increment();

            // Structured log — JSON with trace correlation
            log.info("Order created orderId={} customerId={} total={} traceId={}",
                order.getId(), req.getCustomerId(), order.getTotal(),
                span.getSpanContext().getTraceId());

            return ResponseEntity.ok(order);
        } catch (Exception e) {
            span.recordException(e);
            span.setStatus(StatusCode.ERROR);
            throw e;
        } finally {
            span.end();
        }
    }
}

// Prometheus alert rule
// groups:
//   - name: order-service
//     rules:
//       - alert: HighErrorRate
//         expr: rate(http_requests_total{status=~"5.."}[5m])
//               / rate(http_requests_total[5m]) > 0.01
//         for: 2m
//         labels: { severity: critical }
//         annotations:
//           summary: "Error rate {{ $value | humanizePercentage }}"`,
    notes:"OpenTelemetry auto-instrumentation (Java agent: -javaagent:opentelemetry-javaagent.jar) adds traces to Spring, JDBC, Kafka without code changes."
  },
  interview:[
    {question:"How do you find the root cause of a latency spike in a microservices system?",
     answer:`Systematic approach:\n1. **Start with metrics (RED dashboard)** — which service has elevated p99 latency or error rate? Grafana alert fires.\n2. **Check SLO burn rate** — is error budget being consumed? How fast?\n3. **Find the service** — Grafana service map / dependency graph shows which service in the call chain is slow.\n4. **Drill into traces (Jaeger)** — filter traces for the time window. Find traces with p99 latency. Click the slowest trace — spans show exactly where time was spent.\n5. **Cross-reference logs** — use TraceId from Jaeger to find correlated logs in Kibana. Structured logs reveal the exact DB query, cache miss, or timeout.\n6. **Infrastructure metrics** — check CPU, memory, IO, network for the pod (Kubernetes dashboard, AWS CloudWatch).\n\nTotal time: 5-10 minutes with good observability vs hours without.`,
     followUps:["What is an error budget and how do you use it to make decisions?","What is the difference between monitoring and observability?"]
    }
  ],
  tradeoffs:{
    pros:["Fast incident resolution — MTTR from hours to minutes","Data-driven capacity planning","SLO-based alerting reduces alert fatigue vs threshold alerting"],
    cons:["Cardinality explosion in metrics if labels not controlled","Trace sampling needed at high volume (100% tracing = 10% overhead)","Storage costs for logs + traces at scale"],
    when:"Instrument from day one. Retrofitting observability into production is painful. Use OpenTelemetry standard — avoids vendor lock-in. Set SLOs before you set alerts."
  },
  architecture:{
    title:"Observability Stack",
    caption:"Three pillars: metrics (Prometheus), logs (ELK), traces (Jaeger) unified by OpenTelemetry",
    lanes:[
      {label:"Application",nodes:[
        {id:"app-otel",label:"App + OTel SDK",hint:"Auto-instrumented Java/Go/Python",detail:"OpenTelemetry SDK auto-instruments HTTP, DB, gRPC. Emits metrics, logs, and traces via OTLP protocol."}
      ]},
      {label:"Collection",nodes:[
        {id:"otel-collector",label:"OTel Collector",hint:"Fan-out to multiple backends",detail:"Receives OTLP from apps. Routes metrics to Prometheus, logs to Elasticsearch, traces to Jaeger. One agent per node."},
        {id:"fluent-bit",label:"Fluent Bit",hint:"Log collection from files",detail:"Lightweight log shipper. Reads stdout/file logs, enriches with pod metadata, forwards to Elasticsearch."}
      ]},
      {label:"Storage",nodes:[
        {id:"prometheus",label:"Prometheus",hint:"Time-series metrics",detail:"Scrapes /metrics endpoints. Stores TSDB with 15-day retention. Fires alerts via AlertManager."},
        {id:"elasticsearch",label:"Elasticsearch",hint:"Log indexing + search",detail:"Full-text log indexing. Kibana for ad-hoc query. 30-day hot retention → S3 for cold."},
        {id:"jaeger",label:"Jaeger",hint:"Distributed traces",detail:"Stores spans. 7-day retention (traces are large). Cassandra or Elasticsearch backend."}
      ]},
      {label:"Visualization",nodes:[
        {id:"grafana",label:"Grafana",hint:"Dashboards + alerts",detail:"Unified dashboard for all data sources (Prometheus, Elasticsearch, Jaeger, Loki). SLO dashboards, RED method panels."},
        {id:"alertmanager",label:"AlertManager",hint:"Route alerts → PagerDuty / Slack",detail:"Deduplicates and routes Prometheus alerts to on-call engineer. Silence during maintenance windows."}
      ]}
    ],
    links:[
      {from:"app-otel",to:"otel-collector",label:"OTLP (gRPC)",detail:"App sends metrics + traces to local OTel Collector via gRPC port 4317.",type:"async"},
      {from:"fluent-bit",to:"elasticsearch",label:"Logs (HTTP)",detail:"Fluent Bit ships JSON logs to Elasticsearch index.",type:"async"},
      {from:"otel-collector",to:"prometheus",label:"Metrics",detail:"Collector exposes Prometheus scrape endpoint or remote_write.",type:"async"},
      {from:"otel-collector",to:"jaeger",label:"Traces",detail:"OTLP trace spans forwarded to Jaeger collector.",type:"async"},
      {from:"prometheus",to:"alertmanager",label:"Alert rules",detail:"PromQL alerting rules evaluated every 15s.",type:"sync"},
      {from:"alertmanager",to:"grafana",label:"Alert state",detail:"Alert states displayed on Grafana dashboards.",type:"async"},
      {from:"grafana",to:"prometheus",label:"PromQL queries",detail:"Grafana panels execute PromQL to render graphs.",type:"sync"},
      {from:"grafana",to:"jaeger",label:"Trace link",detail:"Grafana links from metric anomaly to correlated trace in Jaeger.",type:"sync"}
    ]
  }
},

/* ── 23. Security & Auth ──────────────────────────────────── */
{
  id:"sd-security-auth", area:"sysdesign",
  title:"Security — OAuth2, JWT, mTLS & RBAC",
  tag:"Security", tags:["oauth2","jwt","rbac","mtls","api key","zero trust","oidc","pkce","refresh token"],
  concept:`**Authentication (AuthN):** Who are you? (identity)
**Authorization (AuthZ):** What can you do? (permissions)

**OAuth2 flows:**
- **Authorization Code + PKCE** — web/mobile apps. Client redirects user to IdP, gets code, exchanges for tokens. PKCE prevents code interception.
- **Client Credentials** — machine-to-machine. Service presents client_id + client_secret → gets access_token.
- **Device Flow** — smart TVs, CLIs. User enters code on separate device.

**JWT (JSON Web Token):**
\`header.payload.signature\` — base64url encoded. Stateless — no DB lookup needed.
- **Access token** — short-lived (15 min). Verified locally by services.
- **Refresh token** — long-lived (7-30 days). Stored in HttpOnly cookie. Used to get new access token.
- **Signature** — RS256 (asymmetric): IdP signs with private key; services verify with public key (fetched from JWKS endpoint).

**RBAC (Role-Based Access Control):**
Roles assigned to users. Permissions assigned to roles. Services check: \`user.roles.contains("admin") && resource.ownerId == userId\`.

**mTLS (Mutual TLS):**
Both client and server present certificates. Used for service-to-service in zero-trust networks.
- Istio / service mesh automates certificate issuance (SPIFFE/SPIRE).
- No password — proof of identity via certificate.

**Zero Trust:** Never trust, always verify. Even internal traffic is authenticated.
- Traditional: trust everything inside the firewall.
- Zero Trust: every request authenticated + authorised regardless of network location.`,
  why:`Auth is asked in every security-related design question. JWT revocation and token refresh patterns are common deep-dive topics.`,
  example:{
    language:"java",
    code:`// Spring Security 6 — JWT validation + RBAC
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)  // stateless API
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))  // validate JWT signature
            )
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Verify with IdP's public key (fetched from JWKS endpoint)
        return NimbusJwtDecoder
            .withJwkSetUri("https://auth.example.com/.well-known/jwks.json")
            .build();
    }

    // Fine-grained RBAC on methods
    @Service
    public class OrderService {
        @PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
        public Order getOrder(String orderId, String userId) {
            return orderRepository.findById(orderId).orElseThrow();
        }

        @PreAuthorize("hasRole('ADMIN')")
        public void deleteOrder(String orderId) {
            orderRepository.deleteById(orderId);
        }
    }
}

// JWT refresh token rotation — HttpOnly cookie
@RestController
public class AuthController {

    @PostMapping("/auth/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue("refresh_token") String refreshToken) {
        // Validate refresh token from DB (check not revoked)
        RefreshToken stored = refreshTokenRepo.findByToken(hash(refreshToken))
            .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.isExpired()) throw new UnauthorizedException("Refresh token expired");

        // Rotate: revoke old, issue new
        stored.revoke();
        refreshTokenRepo.save(stored);

        String newAccessToken = jwtService.generateAccessToken(stored.getUserId());
        String newRefreshToken = jwtService.generateRefreshToken(stored.getUserId());
        refreshTokenRepo.save(new RefreshToken(stored.getUserId(), hash(newRefreshToken)));

        ResponseCookie cookie = ResponseCookie.from("refresh_token", newRefreshToken)
            .httpOnly(true).secure(true).sameSite("Strict")
            .maxAge(Duration.ofDays(30)).path("/auth/refresh").build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(new TokenResponse(newAccessToken));
    }
}`,
    notes:"Never store refresh tokens in localStorage — XSS can steal them. HttpOnly cookie prevents JS access. Refresh token rotation detects theft: if old token used after rotation, revoke all sessions."
  },
  interview:[
    {question:"How do you revoke a JWT before it expires?",
     answer:`JWTs are stateless — the server doesn't track them. To revoke:\n\n1. **Short expiry** — 15-minute access token. Only 15 minutes of exposure. Mitigates most cases without revocation.\n2. **Token blocklist** — store revoked JTI (JWT ID) in Redis with TTL = remaining token lifetime. Check blocklist on every request. Fast (Redis ~1ms) but adds state.\n3. **Refresh token revocation** — the access token is short-lived; revoke the refresh token in DB. User is logged out at next refresh.\n4. **Version number in token** — store \`tokenVersion\` per user in DB. JWT includes version. On logout, increment version. Any token with old version rejected.\n5. **Opaque tokens** — use reference tokens (random string), validate by calling IdP introspection endpoint. Fully revocable but adds network hop per request.`,
     followUps:["What is the difference between OAuth2 and OpenID Connect?","Explain PKCE and why it's needed for SPAs."]
    }
  ],
  tradeoffs:{
    pros:["JWT: stateless — no DB lookup per request","OAuth2: standardised delegation — users don't share passwords with third-party apps","RBAC: simple to reason about and audit"],
    cons:["JWT: revocation complexity","OAuth2: complex flow — many tokens, scopes, endpoints","mTLS: certificate rotation operational overhead"],
    when:"JWT access token + refresh token rotation for APIs. OAuth2 Authorization Code + PKCE for user-facing apps. Client credentials for M2M. mTLS for internal service auth in zero-trust environments."
  },
  flow:{
    title:"OAuth2 Authorization Code + PKCE Flow",
    caption:"Secure browser-based login without exposing client secret",
    nodes:[
      {id:"browser",label:"Browser (SPA)",hint:"PKCE code_verifier generated"},
      {id:"app",label:"App Server",hint:"Resource server"},
      {id:"idp",label:"Identity Provider",hint:"Keycloak / Auth0 / Cognito"},
      {id:"db",label:"User DB",hint:"Credentials + roles"}
    ],
    steps:[
      {path:["browser","idp"],label:"Redirect to IdP with code_challenge",detail:"Browser generates random code_verifier, hashes to code_challenge (SHA256). Redirects to IdP authorization endpoint."},
      {path:["idp","db"],label:"IdP authenticates user",detail:"User enters credentials. IdP validates against user store, checks MFA if enabled."},
      {path:["idp","browser"],label:"Authorization code returned",detail:"IdP redirects to callback URL with short-lived authorization code (10 seconds TTL)."},
      {path:["browser","idp"],label:"Exchange code + code_verifier",detail:"Browser sends code + code_verifier. IdP verifies hash matches. Prevents code interception attacks."},
      {path:["idp","browser"],label:"Access token + refresh token",detail:"IdP returns JWT access token (15min) + refresh token (30 days in HttpOnly cookie)."},
      {path:["browser","app"],label:"API call with Bearer token",detail:"All API calls include Authorization: Bearer <JWT>. App validates signature locally via JWKS."},
      {path:["browser","idp"],label:"Silent refresh via refresh token",detail:"Before access token expires, browser sends refresh token to get new access token without re-login."}
    ]
  }
},

/* ── 24. Cloud / AWS ──────────────────────────────────────── */
{
  id:"sd-cloud-aws", area:"sysdesign",
  title:"AWS Cloud — Services by Layer & When to Use Each",
  tag:"Cloud", tags:["aws","ec2","s3","rds","dynamodb","sqs","sns","lambda","cloudfront","route53","eks","elasticache","kinesis"],
  concept:`**AWS services organised by system layer:**

**Compute:**
- **EC2** — virtual machines. Full control. Use for: DB servers, batch compute, custom OS requirements.
- **ECS** (Fargate) — managed containers, no cluster management. Use for: containerised services without K8s complexity.
- **EKS** — managed Kubernetes. Use for: complex microservice orchestration.
- **Lambda** — serverless functions. Use for: event-driven, infrequent, short-duration tasks (<15 min).

**Storage:**
- **S3** — object storage. Unlimited, 11 nines durability. Use for: file uploads, static assets, data lake, backups. Cost: ~$0.023/GB.
- **EBS** — block storage for EC2 instances. SSD (gp3) or provisioned IOPS. 
- **EFS** — managed NFS. Shared across multiple EC2 instances.

**Database:**
- **RDS** (Aurora) — managed relational. Aurora is MySQL/Postgres-compatible with 3-6× throughput. Multi-AZ HA.
- **DynamoDB** — managed NoSQL. Single-digit ms at any scale. Global tables for multi-region.
- **ElastiCache** (Redis/Memcached) — managed cache. Use for: session, rate limiting, pub-sub.
- **Redshift** — data warehouse. Petabyte-scale analytics. Columnar storage.
- **Neptune** — managed graph DB.

**Networking:**
- **VPC** — isolated virtual network. Subnets (public/private), security groups (stateful firewall), NACLs.
- **Route 53** — DNS + health checks + routing policies (latency, geo, weighted, failover).
- **CloudFront** — CDN. 400+ PoPs. Lambda@Edge for edge compute.
- **ALB/NLB** — managed load balancers. ALB=L7 (HTTP routing), NLB=L4 (TCP, ultra-low latency).

**Messaging:**
- **SQS** — managed queue. At-least-once delivery. FIFO option for exactly-once.
- **SNS** — managed pub-sub. Fan-out to SQS, Lambda, email, SMS.
- **Kinesis** (Data Streams) — managed Kafka alternative. Real-time streaming, 7-day retention.
- **EventBridge** — event bus with routing rules. SaaS integration, scheduled events.

**DevOps:**
- **IAM** — identity + access management. Roles, policies, least privilege.
- **CloudWatch** — metrics, logs, alarms, dashboards.
- **CodePipeline + CodeBuild + CodeDeploy** — CI/CD.
- **CDK / CloudFormation / Terraform** — infrastructure as code.`,
  why:`AWS is asked in nearly every infrastructure design interview. Knowing which managed service to choose (and why) vs building yourself is a core senior architect skill.`,
  example:{
    language:"yaml",
    code:`# AWS CDK (TypeScript concept in YAML pseudocode)
# Typical 3-tier web app stack

# Networking
VPC:
  cidr: 10.0.0.0/16
  subnets:
    public:  [10.0.1.0/24, 10.0.2.0/24]   # ALB, NAT Gateway
    private: [10.0.3.0/24, 10.0.4.0/24]   # ECS tasks, Lambda
    data:    [10.0.5.0/24, 10.0.6.0/24]   # RDS, ElastiCache

# CDN + DNS
CloudFront:
  origins:
    - S3 (static assets) - cache 1 year
    - ALB (API) - cache 0s (dynamic)
Route53:
  A record: api.example.com -> CloudFront distribution

# Compute
ALB:
  listeners: [HTTPS:443 -> ECS TargetGroup]
  rules:
    - /api/* -> order-service TG
    - /admin/* -> admin-service TG (auth required)

ECS Fargate:
  services:
    order-service:
      image: 123456789.dkr.ecr.us-east-1.amazonaws.com/order:v2
      cpu: 512, memory: 1024
      desiredCount: 3
      autoScaling: cpu>70% -> scale out, cpu<30% -> scale in
      minHealthyPercent: 100, maxPercent: 200  # zero-downtime rolling deploy

# Database
Aurora PostgreSQL:
  instanceClass: db.r6g.large
  multiAZ: true             # automatic failover <30s
  enablePerformanceInsights: true
  backupRetentionDays: 7

ElastiCache Redis:
  nodeType: cache.r6g.large
  clusterMode: true         # Redis Cluster — sharded
  replicasPerShard: 2

# Messaging
SQS:
  order-queue:
    visibilityTimeout: 300s
    messageRetentionPeriod: 14d
    deadLetterQueue: order-dlq (maxReceiveCount: 3)

SNS:
  order-events-topic: -> [fulfillment-queue, analytics-queue, notification-queue]

# Storage
S3:
  bucket: myapp-assets
  versioning: enabled
  lifecycleRules:
    - transition to Glacier after 90 days
  blockPublicAccess: true   # CloudFront OAC access only`,
    notes:"Always use IAM roles (not access keys) for service-to-service auth in AWS. Least-privilege: each Lambda/ECS task gets only the permissions it needs."
  },
  interview:[
    {question:"How would you design a highly available, multi-region AWS architecture?",
     answer:`1. **Two regions** (us-east-1, eu-west-1) with Route 53 latency-based or failover routing.\n2. **Route 53 health checks** monitor ALB in each region. On failure, traffic automatically shifts to healthy region.\n3. **Aurora Global Database** — primary in us-east-1, read replica in eu-west-1. Replication lag < 1s. On failure, promote secondary in <1 minute.\n4. **DynamoDB Global Tables** — multi-active, automatic conflict resolution (last-write-wins).\n5. **S3 Cross-Region Replication** — static assets replicated to both regions. CloudFront serves from nearest PoP.\n6. **ElastiCache** — separate cluster per region. Cache warms up from DB after region failover.\n7. **Chaos testing** — periodic failover drills to validate RTO/RPO targets.\n\nRTO (Recovery Time Objective): < 5 minutes. RPO (Recovery Point Objective): < 1 second (Aurora Global).`,
     followUps:["What is the difference between RTO and RPO?","How would you handle data residency requirements (EU data must stay in EU)?"]
    }
  ],
  tradeoffs:{
    pros:["Managed services reduce operational burden","Pay-as-you-go — no upfront hardware costs","Global infrastructure with 30+ regions"],
    cons:["Vendor lock-in (especially DynamoDB, Aurora, EventBridge)","Cost can exceed on-prem at very large scale","Managed service limitations (DynamoDB 400KB item limit, Lambda 15min)"],
    when:"Use managed services by default — the operational savings outweigh the lock-in risk. Only consider self-managed (e.g. self-hosted Kafka) at massive scale (>$1M/month cloud spend) where savings justify operational cost."
  },
  architecture:{
    title:"AWS 3-Tier Web Architecture",
    caption:"CloudFront → ALB → ECS Fargate → Aurora + ElastiCache",
    lanes:[
      {label:"Edge",nodes:[
        {id:"route53",label:"Route 53",hint:"DNS + health checks",detail:"Latency-based routing to nearest region. Health checks monitor ALB. Automatic failover if region unhealthy."},
        {id:"cloudfront",label:"CloudFront",hint:"CDN — 400+ PoPs",detail:"Serves S3 static assets at edge. API requests forwarded to ALB. Lambda@Edge for auth at edge."}
      ]},
      {label:"Load Balancing",nodes:[
        {id:"alb",label:"ALB",hint:"L7 load balancer",detail:"HTTPS termination. Path-based routing (/api → ECS, / → S3). Sticky sessions if needed. WAF integration."},
        {id:"waf",label:"AWS WAF",hint:"SQL injection, XSS protection",detail:"Web Application Firewall. Block OWASP top 10, rate limit per IP, geo-block."}
      ]},
      {label:"Compute",nodes:[
        {id:"ecs",label:"ECS Fargate",hint:"Auto-scaling containers",detail:"Serverless containers. Auto-scales on CPU/memory. Rolling deploys with zero downtime. Service Connect for service discovery."},
        {id:"lambda",label:"Lambda",hint:"Event-driven functions",detail:"Triggered by SQS, SNS, EventBridge, S3. Scales to 0 when idle. 15min max."}
      ]},
      {label:"Data",nodes:[
        {id:"aurora",label:"Aurora PostgreSQL",hint:"Multi-AZ relational DB",detail:"MySQL/Postgres-compatible. 3-6× standard RDS throughput. Multi-AZ automatic failover <30s. Performance Insights."},
        {id:"elasticache",label:"ElastiCache Redis",hint:"Distributed cache",detail:"Redis Cluster mode. Session store, rate limiting, hot data cache. Sub-millisecond latency."},
        {id:"s3",label:"S3",hint:"Object storage",detail:"11 nines durability. Static assets, user uploads, backups, data lake. Lifecycle rules to Glacier."},
        {id:"sqs",label:"SQS + SNS",hint:"Async messaging",detail:"SQS for work queues (at-least-once). SNS for fan-out to multiple queues. DLQ for failed messages."}
      ]}
    ],
    links:[
      {from:"route53",to:"cloudfront",label:"DNS → CDN",detail:"All traffic enters via CloudFront for DDoS absorption and caching.",type:"sync"},
      {from:"cloudfront",to:"alb",label:"Dynamic requests",detail:"Non-cacheable API requests forwarded to origin ALB.",type:"sync"},
      {from:"cloudfront",to:"s3",label:"Static assets",detail:"JS/CSS/images served directly from S3 via CloudFront.",type:"sync"},
      {from:"alb",to:"ecs",label:"HTTP/2 to containers",detail:"ALB distributes across healthy ECS tasks. Health check: /actuator/health.",type:"sync"},
      {from:"ecs",to:"aurora",label:"Reads + writes",detail:"App connects via RDS Proxy (connection pooling). Read replicas for SELECT queries.",type:"sync"},
      {from:"ecs",to:"elasticache",label:"Cache operations",detail:"Redis for session, rate limiting, hot data. Redis Cluster with read replicas.",type:"sync"},
      {from:"ecs",to:"sqs",label:"Publish events",detail:"Async work published to SQS. Lambda or ECS worker drains queue.",type:"async"},
      {from:"lambda",to:"aurora",label:"Event processing",detail:"Lambda processes SQS messages, writes results to DB.",type:"sync"}
    ]
  }
},

/* ── 25. LLD: Rate Limiter ────────────────────────────────── */
{
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
}

];

window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat(part3);
})();

/* ============================================================
   Part 4 — topics 26-33 (final batch)
   ============================================================ */
(function(){
var part4 = [

/* ── 26. LLD: Consistent Hashing ─────────────────────────── */
{
  id:"sd-lld-consistent-hash", area:"sysdesign",
  title:"LLD: Consistent Hashing — Hash Ring & Virtual Nodes",
  tag:"LLD", tags:["consistent hashing","hash ring","virtual nodes","vnodes","distributed cache","memcached","chord"],
  concept:`**Problem with mod-N hashing:** \`shard = hash(key) % N\`. When N changes (add/remove a node), nearly all keys remap → massive cache miss storm.

**Consistent hashing solution:**
1. Hash space is a circular ring [0, 2^32). 
2. Place servers on the ring by hashing their ID: \`hash("server-1") → position P\`.
3. For a key, hash it → find the next server clockwise on the ring.
4. When a server is added/removed, only keys between it and its predecessor move.
5. On average, only K/N keys remap (K = total keys, N = node count).

**Virtual nodes (vnodes):**
Real problem: few servers → uneven distribution (load imbalance).
Solution: each physical server gets V virtual node positions on the ring (V=100-300).
- Uniform distribution across the ring.
- More powerful servers get more vnodes → weighted assignment.
- On failure: keys spread across all remaining servers (no single successor overwhelmed).

**Used by:** Apache Cassandra (256 vnodes default), Amazon DynamoDB, Redis Cluster (16384 hash slots ≈ consistent hashing), Memcached client libraries.

**Hash slots (Redis Cluster):** 16384 fixed slots instead of continuous ring. Each master owns a range. Gossip protocol tracks slot assignments.`,
  why:`Consistent hashing is foundational to distributed systems. It appears in every database, cache, and CDN design. Interviewers expect you to draw the ring and explain vnodes.`,
  example:{
    language:"java",
    code:`// Consistent Hash Ring implementation
public class ConsistentHashRing<T> {
    private final TreeMap<Long, T> ring = new TreeMap<>();
    private final int virtualNodes;
    private final MessageDigest md5;

    public ConsistentHashRing(int virtualNodes) throws NoSuchAlgorithmException {
        this.virtualNodes = virtualNodes;
        this.md5 = MessageDigest.getInstance("MD5");
    }

    public void addServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.put(hash, server);
        }
    }

    public void removeServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.remove(hash);
        }
    }

    public T getServer(String key) {
        if (ring.isEmpty()) return null;
        long hash = hash(key);
        // Find first server clockwise from key's position
        Map.Entry<Long, T> entry = ring.ceilingEntry(hash);
        if (entry == null) entry = ring.firstEntry(); // wrap around ring
        return entry.getValue();
    }

    private long hash(String key) {
        byte[] digest = md5.digest(key.getBytes(StandardCharsets.UTF_8));
        // Use first 4 bytes as unsigned int
        return ((long)(digest[3] & 0xFF) << 24)
             | ((long)(digest[2] & 0xFF) << 16)
             | ((long)(digest[1] & 0xFF) << 8)
             | ((long)(digest[0] & 0xFF));
    }
}

// Usage — Memcached-style key routing
ConsistentHashRing<String> ring = new ConsistentHashRing<>(150);
ring.addServer("cache-1:11211");
ring.addServer("cache-2:11211");
ring.addServer("cache-3:11211");

String server = ring.getServer("user:42:profile"); // always routes to same server
// → "cache-2:11211"

ring.addServer("cache-4:11211");  // only ~25% of keys remap (vs 75% with mod-4)
ring.getServer("user:42:profile"); // may now route to "cache-4:11211" or still "cache-2"`,
    notes:"With 150 vnodes per server, standard deviation of load across servers is <10%. With 1 vnode it can be 200%+."
  },
  interview:[
    {question:"How does consistent hashing minimise key remapping when a node is added?",
     answer:`With mod-N hashing and N → N+1: key K remaps if \`hash(K) % (N+1) ≠ hash(K) % N\`. This is true for ~N/(N+1) of all keys → nearly everything remaps.\n\nWith consistent hashing: the new node takes the position between two existing nodes on the ring. It only claims keys that would have gone to the next clockwise node — approximately K/N keys. All other keys are unaffected.\n\nMath: if we add 1 server to a 10-server ring, only 10% of keys move (1/11). With mod-N: 91% move.\n\nVnodes amplify this: the new server's 150 vnodes are spread across the ring, claiming small slices from many existing servers — very uniform redistribution.`,
     followUps:["How does Redis Cluster implement consistent hashing with hash slots?","What happens to in-flight requests when a node is added to a Cassandra cluster?"]
    }
  ],
  tradeoffs:{
    pros:["Only K/N keys remap on topology change","Vnodes give near-uniform distribution","Weighted assignment via vnode count"],
    cons:["More complex than mod-N","Vnodes add memory overhead (ring size = servers × vnodes entries)","Hot spots still possible if many popular keys hash to same region"],
    when:"Use consistent hashing for any distributed cache or storage system where nodes join/leave dynamically. Essential for Cassandra, DynamoDB, Redis Cluster, and CDN routing."
  },
  visual: function(mount) {
    var W = 380, H = 300;

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;justify-content:center';

    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:13px';

    ctrl.appendChild(playBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:380px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var cx = W/2, cy = H/2 - 10, R = 110;
    var servers = [
      {name:'S1', angle: 0,        color:'#3fb950'},
      {name:'S2', angle: 2.1,      color:'#58a6ff'},
      {name:'S3', angle: 4.0,      color:'#f0883e'},
      {name:'S4', angle: 5.3,      color:'#bc8cff', vnode: true}
    ];
    var dotAngle = 0;
    var running = false, rafId = null;

    function serverAt(angle) {
      var best = servers[0], bestDiff = Infinity;
      servers.forEach(function(s) {
        var diff = (s.angle - angle + Math.PI*2) % (Math.PI*2);
        if (diff < bestDiff) { bestDiff = diff; best = s; }
      });
      return best;
    }

    function drawScene(movingDot) {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0,0,W,H);

      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Consistent Hash Ring', cx, 20);

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace';
      ctx.fillText('dot = request key · circles = servers', cx, 36);

      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 2; ctx.stroke();

      servers.forEach(function(s) {
        var x = cx + R * Math.cos(s.angle), y = cy + R * Math.sin(s.angle);
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI*2);
        ctx.fillStyle = s.vnode ? '#21262d' : s.color + '33'; ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = s.vnode ? 1.5 : 2.5; ctx.stroke();
        ctx.fillStyle = s.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(s.name, x, y + 4);
      });

      if (movingDot) {
        var dx = cx + R * Math.cos(dotAngle), dy = cy + R * Math.sin(dotAngle);
        ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI*2);
        ctx.fillStyle = '#e6edf3'; ctx.fill();

        var target = serverAt(dotAngle);
        var tx = cx + R * Math.cos(target.angle), ty = cy + R * Math.sin(target.angle);
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(tx, ty);
        ctx.strokeStyle = target.color + 'aa'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

        ctx.fillStyle = '#e6edf3'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('→ routes to ' + target.name, cx, H - 18);
      } else {
        ctx.fillStyle = '#8b949e'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Press ▶ Play to animate request routing', cx, H - 18);
      }
    }

    function frame() {
      if (!running || !document.body.contains(canvas)) return;
      dotAngle = (dotAngle + 0.018) % (Math.PI * 2);
      drawScene(true);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      running = true; playBtn.textContent = '⏸ Pause';
      rafId = requestAnimationFrame(frame);
    }

    function pause() {
      running = false; playBtn.textContent = '▶ Play';
      cancelAnimationFrame(rafId);
      drawScene(true);
    }

    playBtn.addEventListener('click', function() { running ? pause() : start(); });

    drawScene(false);
  }
},

/* ── 27. LLD: LRU Cache ───────────────────────────────────── */
{
  id:"sd-lld-cache", area:"sysdesign",
  title:"LLD: LRU & LFU Cache — O(1) Get and Put",
  tag:"LLD", tags:["lru","lfu","cache","hashmap","doubly linked list","linked hashmap","o(1)"],
  concept:`**LRU (Least Recently Used):** Evict the item that was accessed longest ago.

**O(1) LRU implementation:** HashMap + Doubly Linked List.
- HashMap: key → node (O(1) lookup)
- DLL: nodes in access-time order (head = most recent, tail = least recent)
- Get: O(1) — lookup in map, move node to head
- Put: O(1) — add to head; if capacity exceeded, remove tail and map entry

**Java:** LinkedHashMap with accessOrder=true is a built-in LRU cache.

**LFU (Least Frequently Used):** Evict the item accessed fewest times. On tie, evict LRU among those.

**O(1) LFU implementation:** Three maps:
1. \`keyToVal\` — key → value
2. \`keyToFreq\` — key → frequency count
3. \`freqToKeys\` — frequency → LinkedHashSet of keys (LRU order within same freq)
Track \`minFreq\`. On evict: remove oldest key from \`freqToKeys[minFreq]\`.

**When to use LRU vs LFU:**
- LRU: general web cache. Recent access = likely to be accessed again.
- LFU: media libraries, CDN content. Popular items (high freq) should stay regardless of recent access.
- LRU simpler to implement; LFU resists scan pollution better.`,
  why:`LRU cache implementation is one of the most common coding interview questions. Every caching layer internally uses one of these algorithms.`,
  example:{
    language:"java",
    code:`// LRU Cache — O(1) get and put
public class LRUCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> cache;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        // accessOrder=true: get() moves entry to end (most recent)
        this.cache = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > capacity;  // auto-evict LRU entry
            }
        };
    }

    public synchronized V get(K key) {
        return cache.getOrDefault(key, null);
    }

    public synchronized void put(K key, V value) {
        cache.put(key, value);
    }
}

// Custom DLL implementation (for interview — shows understanding)
public class LRUCacheManual {
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0); // dummy
    private final Node tail = new Node(0, 0); // dummy

    public LRUCacheManual(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        moveToHead(n);  // mark as recently used
        return n.val;
    }

    public void put(int key, int val) {
        Node n = map.get(key);
        if (n != null) { n.val = val; moveToHead(n); return; }
        Node newNode = new Node(key, val);
        map.put(key, newNode);
        addToHead(newNode);
        if (map.size() > capacity) {
            Node lru = removeTail();
            map.remove(lru.key);
        }
    }

    private void addToHead(Node n) {
        n.prev = head; n.next = head.next;
        head.next.prev = n; head.next = n;
    }
    private void removeNode(Node n) {
        n.prev.next = n.next; n.next.prev = n.prev;
    }
    private void moveToHead(Node n) { removeNode(n); addToHead(n); }
    private Node removeTail() { Node n = tail.prev; removeNode(n); return n; }

    static class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key=k; val=v; }
    }
}

// LFU Cache — O(1) all operations
public class LFUCache {
    private final int capacity;
    private int minFreq = 0;
    private final Map<Integer, Integer> keyToVal = new HashMap<>();
    private final Map<Integer, Integer> keyToFreq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> freqToKeys = new HashMap<>();

    public LFUCache(int capacity) { this.capacity = capacity; }

    public int get(int key) {
        if (!keyToVal.containsKey(key)) return -1;
        increaseFreq(key);
        return keyToVal.get(key);
    }

    public void put(int key, int val) {
        if (capacity <= 0) return;
        if (keyToVal.containsKey(key)) {
            keyToVal.put(key, val); increaseFreq(key); return;
        }
        if (keyToVal.size() >= capacity) removeMinFreq();
        keyToVal.put(key, val); keyToFreq.put(key, 1);
        freqToKeys.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }

    private void increaseFreq(int key) {
        int freq = keyToFreq.get(key);
        keyToFreq.put(key, freq + 1);
        freqToKeys.get(freq).remove(key);
        if (freqToKeys.get(freq).isEmpty()) {
            freqToKeys.remove(freq);
            if (minFreq == freq) minFreq++;
        }
        freqToKeys.computeIfAbsent(freq+1, k -> new LinkedHashSet<>()).add(key);
    }

    private void removeMinFreq() {
        LinkedHashSet<Integer> keys = freqToKeys.get(minFreq);
        int lfu = keys.iterator().next(); // LRU among min-freq (LinkedHashSet preserves insertion order)
        keys.remove(lfu); if (keys.isEmpty()) freqToKeys.remove(minFreq);
        keyToVal.remove(lfu); keyToFreq.remove(lfu);
    }
}`,
    notes:"LinkedHashSet preserves insertion order — so iteration gives LRU order among keys with the same frequency. This makes LFU O(1) for all operations."
  },
  interview:[
    {question:"Implement a thread-safe LRU cache in Java.",
     answer:`Wrap LinkedHashMap with synchronized methods (as shown above) for simplicity. For production:\n- Use \`Collections.synchronizedMap\` around LinkedHashMap — coarse-grained lock\n- For better concurrency: use ConcurrentHashMap + ConcurrentLinkedDeque (approximate LRU with lower contention)\n- For high-performance: Caffeine library uses a window TinyLFU algorithm — lock-free, SLRU, ~10× faster than synchronizedLinkedHashMap\n\nCaffeine is what Spring Boot uses internally when you add \`@Cacheable\` with Caffeine configuration.`,
     followUps:["What is the Window TinyLFU algorithm used by Caffeine?","When is LFU strictly better than LRU?"]
    }
  ],
  tradeoffs:{
    pros:["LRU: simple, O(1), handles temporal locality","LFU: resists cache pollution from one-time scans","Both: bounded memory, automatic eviction"],
    cons:["LRU: scan can evict popular items","LFU: frequency counts inflate for old items (frequency aging needed)","Both: no awareness of item size — small and large items treated equally"],
    when:"LRU for general application caches (HTTP responses, DB query results). LFU for content libraries (videos, images) where popularity matters more than recency."
  }
},

/* ── 28. LLD: Distributed Lock ───────────────────────────── */
{
  id:"sd-lld-distributed-lock", area:"sysdesign",
  title:"LLD: Distributed Lock — Redlock, Zookeeper & Fencing",
  tag:"LLD", tags:["distributed lock","redlock","zookeeper","fencing token","mutex","lease","etcd","leader election"],
  concept:`**Why distributed locks?** Multiple nodes must not simultaneously perform a non-idempotent operation (e.g., deduct inventory, send email, run cron job once).

**Single Redis lock (SET NX PX):**
\`\`\`
SET lock:resource uniqueToken NX PX 30000
\`\`\`
- NX = set if not exists (atomic compare-and-set)
- PX 30000 = auto-expire after 30s (avoid deadlock on crash)
- Release: Lua script — only delete if value matches (you own the lock)
- Problem: single Redis node SPOF; clock skew on failover.

**Redlock (Multi-node Redis):**
Acquire lock on N Redis nodes (typically 5) quorum (N/2+1 = 3). Reject if total acquisition time > lock validity. Release from all nodes.
- More resilient than single node.
- Debated: Martin Kleppmann argues it's unsafe without fencing tokens.

**Fencing tokens:**
Monotonically increasing token issued with each lock acquisition. Storage layer rejects writes with token < max seen. Safe even if lock expires early due to GC pause.

**Zookeeper / etcd locks:**
- ZK ephemeral nodes: create ephemeral sequential node; watch lowest node → you hold lock.
- etcd: optimistic concurrency via compare-and-swap on a key with lease TTL.
- Strong consistency (linearisable) — safer than Redis for critical sections.

**Leader election:** Same mechanism — first to acquire distributed lock becomes leader. Heartbeat to renew lease. Others watch for expiry.`,
  why:`Distributed locks are a classic LLD problem. The subtle failure modes (process pause, clock skew, network partition) demonstrate senior-level thinking.`,
  example:{
    language:"java",
    code:`// Redis distributed lock with fencing token simulation
@Component
public class RedisDistributedLock {

    @Autowired private StringRedisTemplate redis;

    private static final String RELEASE_SCRIPT =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('DEL', KEYS[1]) " +
        "else return 0 end";

    public Optional<String> tryAcquire(String resource, Duration ttl) {
        String token = UUID.randomUUID().toString(); // unique owner ID
        Boolean acquired = redis.opsForValue()
            .setIfAbsent("lock:" + resource, token, ttl);
        return Boolean.TRUE.equals(acquired) ? Optional.of(token) : Optional.empty();
    }

    public boolean release(String resource, String token) {
        Long result = redis.execute(
            new DefaultRedisScript<>(RELEASE_SCRIPT, Long.class),
            List.of("lock:" + resource), token);
        return Long.valueOf(1L).equals(result);
    }

    // Acquire with retry
    public String acquireWithRetry(String resource, Duration ttl,
                                    int maxRetries, Duration retryDelay)
            throws InterruptedException {
        for (int i = 0; i < maxRetries; i++) {
            Optional<String> token = tryAcquire(resource, ttl);
            if (token.isPresent()) return token.get();
            Thread.sleep(retryDelay.toMillis() + ThreadLocalRandom.current().nextInt(50));
        }
        throw new LockAcquisitionException("Failed to acquire lock for: " + resource);
    }
}

// Usage pattern — always use try-finally to release
@Service
public class InventoryService {
    @Autowired private RedisDistributedLock lock;

    public void deductInventory(String productId, int quantity) throws Exception {
        String token = lock.acquireWithRetry("inventory:" + productId,
                                              Duration.ofSeconds(10), 3,
                                              Duration.ofMillis(100));
        try {
            // Critical section — only one node executes this at a time
            int current = inventoryRepo.getQuantity(productId);
            if (current < quantity) throw new InsufficientInventoryException();
            inventoryRepo.setQuantity(productId, current - quantity);
        } finally {
            lock.release("inventory:" + productId, token); // always release
        }
    }
}`,
    notes:"TTL is a safety net — not the normal release path. Always release explicitly in finally block. TTL prevents deadlock if the holder crashes before releasing."
  },
  interview:[
    {question:"What is a fencing token and why does it matter for distributed locks?",
     answer:`The fundamental problem: a process can acquire a lock, then pause (GC, OS scheduling, network lag). The lock expires. Another process acquires it. The first process resumes and thinks it still holds the lock — two processes in the critical section simultaneously.\n\n**Fencing token solution:**\n1. Lock service issues a monotonically increasing token with each lock grant (e.g., etcd revision number, ZK sequence number)\n2. Lock holder includes token in every write to the storage layer\n3. Storage layer rejects any write with a token ≤ max seen\n\nResult: even if paused process resumes and tries to write, storage rejects it because new lock holder's token is higher.\n\nRedis SET NX doesn't issue fencing tokens — this is Martin Kleppmann's critique of Redlock. Use etcd or ZooKeeper for safety-critical distributed locks.`,
     followUps:["Explain the ZooKeeper ephemeral node approach to distributed locking.","How does etcd use compare-and-swap for leader election?"]
    }
  ],
  tradeoffs:{
    pros:["Prevents concurrent modification of shared resource","Redis lock is simple and fast (~1ms)","etcd/ZK: strongly consistent, fencing tokens possible"],
    cons:["Redis lock: not safe under clock skew or network partition","ZK/etcd: slower than Redis, more complex to operate","Distributed locks are a code smell — prefer idempotent design"],
    when:"Use distributed locks as last resort. First, try: idempotent operations, optimistic concurrency (version check in DB), CRDT-based design. When you do need a lock, use etcd/ZK for correctness; Redis for performance-critical non-critical-path operations."
  },
  flow:{
    title:"Distributed Lock — Acquire → Use → Release",
    caption:"Fencing token prevents stale lock holders from corrupting state",
    nodes:[
      {id:"node1",label:"Node A",hint:"Acquires lock first"},
      {id:"redis",label:"Redis / etcd",hint:"Lock store + fencing token issuer"},
      {id:"node2",label:"Node B",hint:"Waits or retries"},
      {id:"storage",label:"Storage Layer",hint:"Validates fencing token on writes"},
      {id:"dlq-n",label:"Lock Expired",hint:"Node A paused — GC or slow network"}
    ],
    steps:[
      {path:["node1","redis"],label:"Node A: SET lock NX PX 10000",detail:"Node A acquires lock. Redis returns unique token + fencing token (monotonic counter)."},
      {path:["node2","redis"],label:"Node B: SET lock NX → fails",detail:"Node B tries to acquire. Key exists → fails. Node B retries with backoff."},
      {path:["node1","storage"],label:"Node A writes with token=42",detail:"Node A performs critical section work. Includes token=42 in write request."},
      {path:["storage","node1"],label:"Write accepted (token 42 > max 41)",detail:"Storage accepts because token 42 is the highest seen."},
      {path:["node1","dlq-n"],label:"Node A GC pause — lock expires",detail:"Node A pauses for 15 seconds. Lock TTL expires after 10 seconds."},
      {path:["node2","redis"],label:"Node B acquires expired lock",detail:"Node B retries, finds lock expired. Acquires with token=43."},
      {path:["node1","storage"],label:"Node A resumes, tries write with token=42",detail:"Node A comes back, still thinks it holds lock. Tries to write with old token=42."},
      {path:["storage","node1"],label:"Write REJECTED (token 42 < max 43)",detail:"Storage rejects — token 42 is stale. Node B's write (token 43) is safe."}
    ]
  }
},

/* ── 29. Case: URL Shortener ──────────────────────────────── */
{
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
},

/* ── 30. Case: Social Feed ────────────────────────────────── */
{
  id:"sd-case-social-feed", area:"sysdesign",
  title:"Case Study: Social Media Feed (Twitter / Instagram)",
  tag:"Case Study", tags:["social feed","fanout","fanout on write","fanout on read","twitter","instagram","timeline","celebrity problem"],
  concept:`**Requirements:** Generate a ranked feed of posts from followed users. 500M DAU, 500M tweets/day, 500B feed reads/day.

**Two approaches:**

**Fanout-on-write (push model):**
When user A posts, immediately push to every follower's feed cache.
- Read: O(1) — pre-computed feed in Redis sorted set
- Write: O(followers) — slow for celebrities (Lady Gaga = 50M followers → 50M Redis writes per tweet)
- Celebrity problem: async fan-out with Kafka; celeb writes go to separate queue

**Fanout-on-read (pull model):**
On feed load, fetch posts from all followed users, merge, rank.
- Write: O(1) — just save the tweet
- Read: O(N accounts followed × posts/account) — slow; requires many DB lookups
- Scales poorly for users following many accounts

**Twitter's hybrid approach:**
- Fanout-on-write for regular users (< 1M followers)
- Fanout-on-read for celebrities (> 1M followers)
- At read time: merge pre-computed feed + real-time fetch of celebrity tweets

**Feed storage:**
Redis sorted set per user: \`ZADD feed:{userId} score tweetId\`
Score = publish timestamp (or ranking signal: engagement + freshness + relevance).
Keep only last 800 tweets in feed cache; older tweets fetched from DB.

**Ranking:** ML model. Features: author relationship strength, tweet freshness, engagement rate, user interests. Served by a ranking service per request.

**Storage:** Tweets in Cassandra (write-heavy, time-series). User → followers mapping in graph DB or adjacency list in Cassandra. Media in S3 + CDN.`,
  why:`Feed design is asked at Twitter, Instagram, Facebook. Fanout-on-write vs read trade-off demonstrates understanding of the space-time trade-off at scale.`,
  example:{
    language:"java",
    code:`// Feed service — hybrid fanout
@Service
public class FeedService {

    @Autowired private TweetRepository tweetRepo;         // Cassandra
    @Autowired private FollowerRepository followerRepo;
    @Autowired private RedisTemplate<String,Long> redis;
    @Autowired private KafkaTemplate<String,FanoutTask> kafka;

    // Called when user posts a tweet
    @Async
    public void onTweetCreated(Tweet tweet) {
        long followersCount = followerRepo.countFollowers(tweet.getAuthorId());

        if (followersCount <= 1_000_000) {
            // Regular user: fanout-on-write via Kafka
            kafka.send("fanout.tasks", new FanoutTask(tweet.getId(),
                tweet.getAuthorId(), tweet.getScore()));
        }
        // Celebrities: no fanout — handled at read time
    }

    // Fanout worker — processes FanoutTask from Kafka
    @KafkaListener(topics = "fanout.tasks", concurrency = "20")
    public void fanoutWorker(FanoutTask task) {
        // Get all follower IDs (paginated — may be 100K)
        followerRepo.getFollowerIdsBatch(task.getAuthorId()).forEach(followerId -> {
            // Add tweet to follower's feed sorted set
            redis.opsForZSet().add(
                "feed:" + followerId,
                task.getTweetId(),
                task.getScore()
            );
            // Trim to 800 items
            redis.opsForZSet().removeRange("feed:" + followerId, 0, -801);
        });
    }

    // Get feed for a user
    public List<Tweet> getFeed(String userId, int page, int size) {
        // 1. Get pre-computed feed from Redis
        Set<Long> feedTweetIds = redis.opsForZSet()
            .reverseRange("feed:" + userId, (long)page*size, (long)page*size+size-1);

        // 2. Fetch celebrity tweets user follows (fanout-on-read)
        List<String> celebIds = followerRepo.getCelebrityFollowees(userId);
        List<Tweet> celebTweets = tweetRepo.getRecentTweets(celebIds, 20);

        // 3. Merge + rank
        List<Tweet> allTweets = new ArrayList<>();
        allTweets.addAll(tweetRepo.findAllById(feedTweetIds));
        allTweets.addAll(celebTweets);
        allTweets.sort(Comparator.comparingDouble(Tweet::getScore).reversed());

        return allTweets.subList(0, Math.min(size, allTweets.size()));
    }
}`,
    notes:"Score = timestamp + engagement signal. Freshness ensures new posts appear; engagement signal keeps viral content visible."
  },
  interview:[
    {question:"How do you handle the celebrity problem in a social feed?",
     answer:`**Problem:** A celebrity with 50M followers posts a tweet. Fanout-on-write = 50M Redis writes in seconds. Redis cluster saturated. Regular fan-outs of normal users starved.\n\n**Solutions:**\n1. **Async batching:** Don't fan-out immediately. Kafka consumer groups process fan-outs over minutes in priority queues. But feed is stale for minutes — unacceptable for real-time.\n2. **Hybrid (Twitter's approach):** Set threshold (1M followers). Regular users → fanout-on-write. Celebrities → no precomputed fan-out. At read time, check which celebrities user follows (usually <10), fetch their last 20 tweets, merge with pre-computed feed in real time. Only 10 DB lookups per feed request.\n3. **Sharded fan-out:** Shard celebrity followers into 1000-user batches. Kafka partitions. 50K parallel workers each handle 1000 followers → complete fan-out in 5 seconds vs 50 seconds sequentially.`,
     followUps:["How does Instagram rank posts in its feed?","How would you implement infinite scroll pagination for a feed?"]
    }
  ],
  tradeoffs:{
    pros:["Fanout-on-write: O(1) reads — excellent user experience","Redis sorted set for feed: sorted by score, O(log N) insert, O(1) read"],
    cons:["Fanout-on-write: write amplification for high-follower accounts","Feed cache must be invalidated on unlike/delete (complex)"],
    when:"Always hybrid for social feeds at scale. Fan-out threshold tuned based on follower count. Start with fanout-on-read for simplicity; migrate to write when read latency becomes unacceptable."
  }
},

/* ── 31. Case: Video Platform ────────────────────────────── */
{
  id:"sd-case-video-platform", area:"sysdesign",
  title:"Case Study: Video Platform (Netflix / YouTube)",
  tag:"Case Study", tags:["netflix","youtube","video streaming","hls","dash","adaptive bitrate","cdn","transcoding","chunked upload"],
  concept:`**Requirements:** 500M users, 1B hours watched/day, 500 hours of video uploaded/minute.

**Upload pipeline:**
1. **Chunked upload** — client splits video into 5-10MB chunks, uploads in parallel. Resumable on failure.
2. **Raw storage** — chunks assembled in S3 bucket (upload bucket).
3. **Transcoding** — distributed job: split video into 5s segments → transcode each segment to multiple resolutions (2160p/1080p/720p/480p/360p/240p) and codecs (H.264, H.265, AV1) in parallel.
4. **Adaptive Bitrate (ABR)** — generate HLS (HTTP Live Streaming) or MPEG-DASH manifest file listing all variants. Player selects bitrate based on network speed.
5. **CDN distribution** — transcoded segments pushed to 200+ CDN PoPs.

**Streaming:**
- Player requests manifest (`.m3u8` or `.mpd`).
- Downloads 2-10 second segments. Measures download speed.
- Switches bitrate every segment — seamless quality adaptation.
- No persistent connection — pure HTTP. Works through proxies, firewalls.

**Recommendation engine:**
Two-stage: candidate generation (ALS matrix factorisation — 1M videos → top 100) → ranking model (features: watch history, freshness, CTR, diversity) → top 10-20 shown.

**Storage:**
- Video segments: S3 / GCS (object storage)
- Metadata (title, uploader, description): PostgreSQL / Spanner
- View counts, likes: Redis (real-time) + Cassandra (batch aggregated)
- Search index: Elasticsearch
- CDN: Netflix uses their own Open Connect CDN; YouTube uses Google's CDN`,
  why:`Video streaming design is a common senior-level question. Transcoding pipeline, HLS/DASH, and CDN strategy are unique to this domain.`,
  example:{
    language:"yaml",
    code:`# Video transcoding pipeline — AWS MediaConvert or custom FFmpeg workers

# 1. Upload initiation
POST /uploads/initiate
Response: { uploadId: "abc123", chunks: [{chunkNum: 1, presignedUrl: "..."}, ...] }

# 2. Client uploads chunks in parallel (5 concurrent)
PUT <presignedUrl>  # each chunk uploaded directly to S3 (bypasses API server)

# 3. Upload completion trigger
POST /uploads/complete { uploadId: "abc123" }
  → SQS message → Transcoding workers

# 4. Transcoding worker (Python + FFmpeg)
# Split into 4-second segments, transcode each in parallel:
Resolutions:
  - 2160p (4K):  bitrate 15Mbps, codec H.265
  - 1080p (FHD): bitrate 4Mbps, codec H.264/H.265/AV1
  - 720p (HD):   bitrate 2Mbps, codec H.264
  - 480p:        bitrate 1Mbps, codec H.264
  - 360p:        bitrate 500Kbps, codec H.264
  - 240p:        bitrate 200Kbps, codec H.264 (mobile/slow networks)

# 5. HLS manifest generation (.m3u8)
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
https://cdn.example.com/videos/abc123/1080p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
https://cdn.example.com/videos/abc123/720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
https://cdn.example.com/videos/abc123/360p/playlist.m3u8

# 6. CDN pre-warm for popular content
# On publish, push first 30s of all resolutions to all PoPs (popular content anticipation)
# Long-tail content: serve from S3 on cache miss`,
    notes:"Netflix's Open Connect appliances are deployed IN ISP datacenters — video bytes travel only from ISP's own rack to user. Eliminates internet transit cost."
  },
  interview:[
    {question:"How does adaptive bitrate streaming work?",
     answer:`ABR (HLS/DASH) works in 5 steps:\n1. Server transcodes video into multiple quality levels (2160p → 240p) and divides each into short segments (2-10 seconds).\n2. A manifest file lists all quality variants with bandwidth requirements.\n3. Player downloads the manifest, picks initial quality based on measured bandwidth.\n4. Player downloads segment, measures download time. If download took longer than segment duration → bandwidth too low → switch to lower quality next segment.\n5. If download is consistently fast → buffer ahead and switch to higher quality.\n\n**Key insight:** Switching happens at segment boundaries — seamless. Player maintains a 15-30 second buffer to absorb network jitter without pause.\n\nHLS uses `.m3u8` (Apple format, supported natively by iOS/Safari). DASH is ISO standard (Chrome, Android). Both achieve same result — adaptive quality.`,
     followUps:["Why does Netflix pre-transcode to AV1 codec?","How do you handle DRM (Digital Rights Management) for premium content?"]
    }
  ],
  tradeoffs:{
    pros:["HLS/DASH: works over plain HTTP, CDN-friendly, adaptive quality","Chunked upload: resumable, parallel — fast for large files","Distributed transcoding: elastic scale — 500h/minute is feasible"],
    cons:["Transcoding is compute-intensive and expensive ($0.50/min of video for 1080p)","Manifest + segment files multiply storage (6 resolutions × many segments)","ABR introduces complexity in player implementation"],
    when:"HLS for iOS/Safari. DASH for Android/Chrome. AV1 codec for bandwidth-constrained mobile markets. Always CDN for video — sending video from origin is economically infeasible at scale."
  }
},

/* ── 32. Case: Ride Sharing ───────────────────────────────── */
{
  id:"sd-case-ride-sharing", area:"sysdesign",
  title:"Case Study: Ride Sharing (Uber / Lyft)",
  tag:"Case Study", tags:["uber","lyft","geospatial","geohash","h3","matching","dispatch","websocket","surge pricing","location tracking"],
  concept:`**Requirements:** 5M trips/day, real-time driver location updates (every 4s), sub-5s match time, surge pricing.

**Core challenges:**
1. **Location tracking** — drivers send GPS coordinates every 4 seconds. ~500K active drivers = 125K updates/second.
2. **Nearby driver search** — given rider location, find available drivers within 5km in <100ms.
3. **Matching** — assign the best driver (ETA + rating + car type) to rider.
4. **Real-time communication** — push trip status updates to both rider and driver.

**Geospatial indexing:**
- **Geohash** — encode lat/lng into a base32 string. Nearby locations share a prefix. 7-char geohash ≈ 150m × 150m cell. Query: find drivers in same geohash + 8 neighbors.
- **H3 (Uber's hexagonal grid)** — hexagonal cells at multiple resolutions. Hexagons tile uniformly — no distortion at cell boundaries. Used for surge pricing regions.
- **S2 (Google)** — spherical geometry, quadtree-based. Used by Google Maps.
- **PostGIS / Redis GEOADD** — store points, radius search with GEORADIUS command.

**Architecture:**
- **Location service** — receives WebSocket/HTTP stream of driver positions. Updates Redis GEOADD (lng,lat per driver). Each driver position = 1 Redis geo write/4s.
- **Supply service** — GEORADIUS search on Redis. Returns drivers within 5km. Filter: available, correct car type, not in trip.
- **Dispatch/matching** — ranks candidates by ETA (computed by routing engine). Sends offer to best driver. Driver accepts/declines in 10s. On decline, next candidate offered.
- **Trip service** — manages trip state machine (REQUESTED → ACCEPTED → PICKUP → IN_PROGRESS → COMPLETED).
- **Surge pricing** — H3 hexagon aggregation. If demand/supply ratio > threshold in a hex → surge multiplier applied.

**Communication:** WebSocket for real-time push (driver location on map). SSE as fallback.`,
  why:`Uber's architecture covers geospatial, real-time matching, state machines, and event-driven design — touching nearly every system design concept in one problem.`,
  example:{
    language:"python",
    code:`# Location service — FastAPI + Redis Geo
from fastapi import FastAPI, WebSocket
from redis.asyncio import Redis
import asyncio, json

app = FastAPI()
redis = Redis(host='redis-cluster', decode_responses=True)

@app.websocket("/driver/location")
async def driver_location_ws(ws: WebSocket, driver_id: str):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()
            lat, lng, status = data['lat'], data['lng'], data['status']

            if status == 'AVAILABLE':
                # GEOADD: store driver position in Redis geo index
                await redis.geoadd('drivers:available', {driver_id: (lng, lat)})
                # Also store metadata
                await redis.hset(f'driver:{driver_id}',
                    mapping={'lat': lat, 'lng': lng,
                             'updated': data['timestamp'],
                             'rating': data.get('rating', 4.5)})
            else:
                # Remove from available pool
                await redis.zrem('drivers:available', driver_id)

    except Exception:
        await redis.zrem('drivers:available', driver_id)

# Supply service — find nearby drivers
@app.get("/supply/nearby")
async def nearby_drivers(lat: float, lng: float, radius_km: float = 5.0):
    # GEORADIUS: find all drivers within radius
    drivers = await redis.georadius(
        'drivers:available', lng, lat,
        radius_km, unit='km',
        withcoord=True, withdist=True,
        sort='ASC', count=20)

    results = []
    for driver_id, dist, coords in drivers:
        meta = await redis.hgetall(f'driver:{driver_id}')
        results.append({
            'driverId': driver_id,
            'distanceKm': dist,
            'lat': coords[1], 'lng': coords[0],
            'rating': float(meta.get('rating', 4.5))
        })
    return results

# Dispatch — Saga-like matching
@app.post("/trips/match")
async def match_trip(rider_lat: float, rider_lng: float, trip_id: str):
    candidates = await nearby_drivers(rider_lat, rider_lng, radius_km=5.0)

    for candidate in candidates[:5]:  # try top 5
        driver_id = candidate['driverId']

        # Atomic: claim driver (remove from available + mark as pending)
        removed = await redis.zrem('drivers:available', driver_id)
        if removed == 0: continue  # already taken by another request

        # Send offer to driver via WebSocket/push notification
        await redis.publish(f'driver:{driver_id}:offers',
                           json.dumps({'tripId': trip_id, 'ttl': 10}))

        # Wait for acceptance (10s timeout)
        response = await wait_for_driver_response(driver_id, trip_id, timeout=10)
        if response == 'ACCEPTED':
            return {'tripId': trip_id, 'driverId': driver_id, 'status': 'MATCHED'}

        # Declined — put driver back in available pool
        meta = await redis.hgetall(f'driver:{driver_id}')
        await redis.geoadd('drivers:available',
                          {driver_id: (float(meta['lng']), float(meta['lat']))})

    raise HTTPException(503, "No drivers available")`,
    notes:"GEORADIUS is O(N+log M) where N is elements within radius. For 500K drivers in city, narrow radius (5km) returns ~200 drivers — fast enough for real-time matching."
  },
  interview:[
    {question:"How would you design the surge pricing system?",
     answer:`**Goal:** Dynamically increase prices in areas where demand > supply to incentivise drivers.\n\n**Design:**\n1. **H3 hexagonal grid** — divide city into ~1km hexagonal cells (resolution 8). Hexagons tile uniformly — no distortion.\n2. **Demand signal** — count trip requests per cell in last 5 minutes (Redis ZADD with sliding window).\n3. **Supply signal** — count available drivers per cell (Redis GEORADIUS count per cell centroid).\n4. **Surge multiplier** — if demand/supply ratio > 2 → 1.5× surge. > 5 → 2× surge. Capped at 3× (brand protection).\n5. **Cache + refresh** — surge multipliers computed every 60s by a cron job. Cached in Redis per H3 cell ID.\n6. **Display** — rider app fetches surge multiplier for their H3 cell before booking. Shows surge warning.\n7. **Feedback loop** — higher prices → more drivers enter area → supply increases → surge decreases (Uber intentionally shows driver earnings in surge zones).`,
     followUps:["How do you prevent drivers from colluding to artificially create surge?","How would you handle the matching algorithm when multiple riders request simultaneously?"]
    }
  ],
  tradeoffs:{
    pros:["Redis GEORADIUS: sub-millisecond nearby driver search","Geohash/H3: efficient spatial partitioning","WebSocket: real-time location updates without polling overhead"],
    cons:["Redis is in-memory: 500K driver positions × 64 bytes = 32MB — easily fits but requires HA","WebSocket: sticky sessions or pub-sub backplane required","Matching race conditions: need atomic claim (ZREM) to prevent double-assignment"],
    when:"This pattern (Redis geo + WebSocket + event-driven matching) applies to any real-time location-aware service: food delivery, logistics tracking, peer-to-peer marketplace."
  },
  uml:{
    title:"Ride Request — Matching Flow",
    scenario:"Rider requests trip; system finds and dispatches driver",
    actors:[
      {id:"rider",label:"Rider App"},
      {id:"api",label:"Trip API"},
      {id:"supply",label:"Supply Service"},
      {id:"redis",label:"Redis Geo"},
      {id:"dispatch",label:"Dispatch Service"},
      {id:"driver",label:"Driver App"}
    ],
    messages:[
      {from:"rider",to:"api",label:"POST /trips (lat, lng, carType)",detail:"Rider requests trip with pickup location and car type preference.",type:"sync"},
      {from:"api",to:"supply",label:"findNearbyDrivers(lat, lng, 5km)",detail:"Supply service queried for available drivers within 5km radius.",type:"sync"},
      {from:"supply",to:"redis",label:"GEORADIUS drivers:available",detail:"Redis returns list of driver IDs sorted by distance.",type:"sync"},
      {from:"redis",to:"supply",label:"[driver-1: 0.8km, driver-2: 1.2km, ...]",detail:"Top 20 nearby available drivers returned.",type:"sync"},
      {from:"supply",to:"api",label:"Ranked candidates",detail:"Candidates ranked by ETA (distance × traffic factor) and rating.",type:"sync"},
      {from:"api",to:"dispatch",label:"matchTrip(tripId, candidates)",detail:"Dispatch service tries candidates in order. Sends offer to best match.",type:"async"},
      {from:"dispatch",to:"redis",label:"ZREM drivers:available driver-1",detail:"Atomically remove driver-1 from pool. Prevents double-matching.",type:"sync"},
      {from:"dispatch",to:"driver",label:"Push: TripOffer(tripId, pickup, fare)",detail:"Push notification + WebSocket message sent to driver-1.",type:"async"},
      {from:"driver",to:"dispatch",label:"ACCEPTED (within 10s)",detail:"Driver accepts offer.",type:"sync"},
      {from:"dispatch",to:"rider",label:"Push: DriverMatched(driverInfo, ETA)",detail:"Rider sees driver name, car, rating, and live ETA on map.",type:"async"},
      {from:"driver",to:"api",label:"WebSocket: location updates every 4s",detail:"Driver location streamed to rider's map in real-time.",type:"async"}
    ]
  }
}

];

window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat(part4);

/* ═══════════════════════════════════════════════════════════════════
   Part 5 — Instagram Deep Dive
   ═══════════════════════════════════════════════════════════════════ */
var part5 = [

/* ── Instagram System Design ──────────────────────────────────── */
{
  id:"sd-instagram-deep",
  area:"sysdesign",
  title:"Case Study: Instagram — Photo/Reel Upload, Feed, Stories & Scale",
  tag:"Case Study",
  tags:["instagram","photo upload","reels","stories","fanout","cdn","media processing","feed ranking","search","explore"],

  concept:`**Scale:** 2B+ MAU · 100M+ photos/day · 4M likes/second · 500M Stories/day

**Four core flows to master:**

**① Photo / Reel Upload**
\`\`\`
Client → API Gateway → Upload Service
  → Object Store (S3 raw)
  → Kafka: media.uploaded
    → Transcoder (multiple resolutions: 360/720/1080p, WebP)
    → CDN Pre-warm (push to edge PoPs)
  → Metadata DB (Postgres: postId, userId, caption, hashtags)
  → Search Indexer (Elasticsearch: hashtag/caption)
  → Fanout Worker (Kafka: feed.fanout)
\`\`\`

**② Feed Generation (Hybrid Fanout)**
- **Regular users (<10K followers):** Fanout-on-write → push postId to each follower's feed in Redis sorted set (score = timestamp)
- **Celebrities (>10K followers):** No precomputed push. At read time, fetch recent posts, merge into feed
- **Feed read:** Merge Redis precomputed + celebrity real-time → Ranking ML model → paginated response

**③ Stories (Time-bounded, ring architecture)**
- 24h TTL stored in Cassandra (time-series)
- Viewer ring updated via Redis ZADD storyViews:{storyId} timestamp userId
- Stories CDN pre-warmed for author's top followers (predicted-access pre-push)

**④ Explore / Search**
- Elasticsearch indexes caption + hashtags at upload time
- Trending scored by: view rate × engagement rate × freshness (decaying exponential)
- Personalized Explore: collaborative filtering (users who liked similar posts)

**Storage Architecture:**
| Data | Store | Why |
|------|-------|-----|
| Media files | S3 + CloudFront | Blob, durable, CDN-native |
| Feed cache | Redis sorted set | O(log N) write, O(1) range read |
| Post metadata | Postgres (sharded) | Relational, ACID |
| Stories timeline | Cassandra | Time-series, TTL native |
| Follow graph | adjacency in Postgres + Redis cache | Fast follower lookup |
| Search | Elasticsearch | Full-text + hashtag |`,

  why:`Instagram pioneered at-scale media pipelines. Photo upload → multi-resolution transcode → CDN pre-warm is the canonical pattern for any media platform. Feed fanout + celebrity hybrid is the textbook answer for all social feed questions. Stories added ephemeral-content pattern (Cassandra TTL, ring viewer tracking).`,

  example:{
    language:"java",
    code:`// Instagram-style Upload + Fanout pipeline
@RestController
public class UploadController {

    @Autowired private S3Client s3;
    @Autowired private KafkaTemplate<String,MediaEvent> kafka;
    @Autowired private PostRepository postRepo;

    @PostMapping("/api/v1/posts")
    public ResponseEntity<Post> upload(
            @RequestParam MultipartFile file,
            @RequestParam String caption,
            @AuthenticationPrincipal User user) {

        // 1. Upload raw to S3 (presigned URL flow for large files)
        String rawKey = "raw/" + UUID.randomUUID() + ".jpg";
        s3.putObject(PutObjectRequest.builder().bucket("ig-media").key(rawKey).build(),
                     RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        // 2. Persist metadata
        Post post = postRepo.save(new Post(user.getId(), rawKey, caption));

        // 3. Trigger async processing pipeline
        kafka.send("media.uploaded", new MediaEvent(post.getId(), rawKey, user.getId(),
                   user.getFollowerCount()));
        return ResponseEntity.accepted().body(post);
    }
}

// ── Transcoder Consumer ──────────────────────────────────────────
@KafkaListener(topics = "media.uploaded", groupId = "transcoder")
public void transcode(MediaEvent evt) {
    List<Integer> resolutions = List.of(360, 720, 1080);
    resolutions.parallelStream().forEach(res -> {
        byte[] transcoded = ffmpegTranscode(evt.getRawKey(), res);
        String cdnKey = "media/" + evt.getPostId() + "/" + res + "p.webp";
        s3.putObject(/* ... */ cdnKey, transcoded);
        cdn.preWarm(cdnKey); // push to edge PoPs
    });
    // Signal fanout worker
    kafka.send("feed.fanout", new FanoutEvent(evt.getPostId(), evt.getUserId(),
               evt.getFollowerCount(), System.currentTimeMillis()));
}

// ── Fanout Worker ────────────────────────────────────────────────
@KafkaListener(topics = "feed.fanout", groupId = "fanout", concurrency = "32")
public void fanout(FanoutEvent evt) {
    if (evt.getFollowerCount() > 10_000) return; // celebrities skip — read-time merge

    // Paginate followers (sharded adjacency table)
    followerRepo.streamFollowerIds(evt.getUserId(), 500).forEach(followerId -> {
        double score = evt.getTimestamp();
        redis.opsForZSet().add("feed:" + followerId, evt.getPostId(), score);
        redis.opsForZSet().removeRange("feed:" + followerId, 0, -801); // cap at 800
    });
}

// ── Feed Read (Hybrid merge) ─────────────────────────────────────
public FeedPage getFeed(String userId, String cursor) {
    // 1. Pre-computed feed from Redis
    long offset = cursor == null ? 0 : Long.parseLong(cursor);
    Set<Long> precomputed = redis.opsForZSet()
        .reverseRange("feed:" + userId, offset, offset + 19);

    // 2. Celebrity followees — fanout-on-read
    List<String> celebrities = followerRepo.getCelebrityFollowees(userId, 10_000);
    List<Post> celebPosts = postRepo.getRecentByAuthors(celebrities, 20);

    // 3. Merge, rank, paginate
    List<Post> all = new ArrayList<>(postRepo.findAllById(precomputed));
    all.addAll(celebPosts);
    rankingService.rank(all, userId); // ML: freshness x engagement x relationship
    return new FeedPage(all.subList(0, Math.min(20, all.size())), String.valueOf(offset+20));
}`,
    notes:"Presigned S3 URL flow: client uploads directly to S3, skipping app servers for large files. Concurrency=32 on fanout consumer handles celebrity bottleneck without blocking regular fanout."
  },

  interview:[
    {
      question:"How does Instagram handle a celebrity (500M followers) posting a photo?",
      answer:`**Problem:** Fanout-on-write for 500M followers = 500M Redis writes cluster saturated for minutes.

**Instagram hybrid solution:**
1. **Threshold check** (>10K followers = celebrity) skip precomputed fanout
2. **At read time:** for each celebrity the user follows, fetch their last 20 posts from post DB
3. **Merge** celebrity posts with pre-computed regular feed in real time (typically fewer than 10 celebrity followees per user)
4. **Rank** merged list, return top 20

**Cost:** ~10 extra DB lookups per feed request vs 500M Redis writes per celebrity post.
**Result:** Feed latency adds ~5ms. Celebrity post visible to all followers instantly.

**Additional trick:** For mega-celebs, Instagram pre-fetches and caches celebrity post IDs at a per-region layer so even the read-time lookup is cached.`,
      followUps:["How would you handle a viral post from a non-celebrity that suddenly gets 10M reposts?","What happens to the Redis feed cache when a user unfollows someone?"]
    },
    {
      question:"How do Instagram Stories expire after 24 hours?",
      answer:`**Cassandra TTL:** Each story row written with TTL 86400 (24h). Cassandra automatically tombstones and compacts expired rows.

**Feed visibility:** Story ring stored in Redis sorted set stories:{userId} with score = expiry_timestamp. Serve only stories where score > now().

**CDN purge:** Short CDN TTL (1h) + signed URLs with expiry matching story TTL. Expired URL returns 403 from CDN.

**Edge case:** Users expect stories to show until 24h after post time, not midnight. TTL is relative (created_at + 86400), not wall-clock midnight.`,
      followUps:["How would you implement 'Close Friends' stories (restricted visibility)?","How does Instagram track story views without creating a bottleneck at scale?"]
    },
    {
      question:"Design Instagram's Explore tab at scale.",
      answer:`**Goal:** Surface content the user has not seen but will engage with.

**Two-stage pipeline:**
1. **Candidate generation:** collaborative filtering — "users who liked posts you liked also liked X". Run offline (Spark) nightly, store top-1000 candidates per user in Cassandra.
2. **Real-time ranking:** At request time, score candidates by predicted engagement (ML model), content freshness, diversity (avoid N posts from same author).

**Trending hashtags:** Redis sorted set trending:global scored by views in last 1h x engagement rate x decay factor. Updated every 30s by a Flink stream job.

**Content safety:** Each uploaded post runs async through CV classifier (nudity/violence). Flagged posts excluded from Explore.`,
      followUps:["How would you personalize Explore for a brand-new user with no history?","How does hashtag search differ from Explore ranking?"]
    }
  ],

  tradeoffs:{
    pros:[
      "Hybrid fanout: O(1) reads for regular users, instant visibility for celebrity posts",
      "Cassandra TTL for Stories: zero application-level cleanup logic",
      "CDN pre-warm on upload: first byte to global users in <50ms",
      "Multi-resolution transcode: adaptive bitrate for bandwidth-constrained devices"
    ],
    cons:[
      "Read-time celebrity merge adds latency (acceptable: <10ms with caching)",
      "Redis feed cache invalidation on unlike/delete requires fan-out of deletions",
      "Elasticsearch lag: newly uploaded posts searchable after ~2s (eventual consistency)",
      "Transcode pipeline (Kafka workers) adds 10-30s before HD version available"
    ],
    when:"Apply this architecture to any media-first social platform. Fanout threshold tuned per platform (Instagram: ~10K, Twitter: ~1M). Always pre-warm CDN for expected viral content (live events, scheduled drops)."
  },

  flow:{
    title:"Instagram Photo Upload & Fanout Pipeline",
    caption:"Tap any node · Press Play to step through the pipeline",
    nodes:[
      {id:"client",   label:"📱 Client",        hint:"iOS/Android app. Compresses image client-side before upload"},
      {id:"api",      label:"⚡ API Gateway",    hint:"Auth, rate-limit, routes to Upload Service"},
      {id:"s3",       label:"☁ S3 Raw",         hint:"Raw upload stored. Triggers Kafka event"},
      {id:"kafka",    label:"⚙ Kafka",           hint:"media.uploaded topic — decouples upload from processing"},
      {id:"transcode",label:"🎬 Transcoder",     hint:"Generates 360/720/1080p WebP variants in parallel"},
      {id:"cdn",      label:"🌐 CDN Edge",       hint:"Pre-warmed at 300+ PoPs — global first byte <50ms"},
      {id:"fanout",   label:"📢 Fanout Worker",  hint:"Writes postId to each follower's Redis feed sorted set"},
      {id:"feed",     label:"🗃 Redis Feed",      hint:"Sorted set per user. Score = timestamp. Cap 800 entries"}
    ],
    steps:[
      {path:["client","api"],     label:"Upload request",          detail:"Client compresses to JPEG (85% quality), attaches caption + hashtags. Auth token validated at gateway."},
      {path:["api","s3"],         label:"Store raw media",         detail:"API writes raw file to S3 bucket (ig-raw). Returns 202 Accepted immediately — rest is async."},
      {path:["s3","kafka"],       label:"Publish media.uploaded",  detail:"S3 event triggers Lambda which publishes MediaEvent{postId, rawKey, userId, followerCount} to Kafka."},
      {path:["kafka","transcode"],label:"Transcode to resolutions", detail:"Transcoder consumes event. FFmpeg generates 360p/720p/1080p WebP variants in parallel workers."},
      {path:["transcode","cdn"],  label:"Pre-warm CDN edge",       detail:"Each variant pushed to CDN with Cache-Control: public, max-age=31536000. Global distribution in <3s."},
      {path:["kafka","fanout"],   label:"Trigger feed fanout",     detail:"After transcode complete, FanoutEvent published. Workers skip authors with >10K followers (celebrity path)."},
      {path:["fanout","feed"],    label:"Write to follower feeds",  detail:"ZADD feed:{followerId} timestamp postId for each follower. ZREMRANGEBYRANK trims to 800."}
    ]
  },

  uml:{
    title:"Feed Load — Hybrid Fanout Read Sequence",
    scenario:"User opens Instagram app — first feed request",
    actors:[
      {id:"app",   label:"📱 App"},
      {id:"api",   label:"API GW"},
      {id:"feed",  label:"Feed Svc"},
      {id:"redis", label:"Redis"},
      {id:"celeb", label:"Celeb DB"},
      {id:"rank",  label:"Ranker"}
    ],
    messages:[
      {from:"app",  to:"api",   label:"GET /feed?cursor=0",           detail:"App requests first page of feed. Includes auth token, device locale.",type:"sync"},
      {from:"api",  to:"feed",  label:"getFeed(userId, cursor=0)",     detail:"API gateway routes to Feed Service after auth validation.",type:"sync"},
      {from:"feed", to:"redis", label:"ZREVRANGE feed:{userId} 0 49",  detail:"Fetch top 50 post IDs from pre-computed feed sorted set.",type:"sync"},
      {from:"redis",to:"feed",  label:"[postId1, postId2, ...48 more]",detail:"Pre-computed IDs returned in score-desc order (newest first).",type:"sync"},
      {from:"feed", to:"celeb", label:"getRecentCelebPosts(celebIds)", detail:"Fetch last 20 posts from each celebrity the user follows (typically 0-5 celebrities).",type:"sync"},
      {from:"celeb",to:"feed",  label:"[celebPost1, celebPost2, ...]", detail:"Celebrity posts fetched directly from post DB shard. Not pre-fanned.",type:"sync"},
      {from:"feed", to:"rank",  label:"rank(merged, userId)",          detail:"ML ranking model scores all candidates: freshness x engagement x relationship strength.",type:"sync"},
      {from:"rank", to:"feed",  label:"Top 20 ranked post IDs",        detail:"Ranked list with diversity constraints (max 3 posts from same author per page).",type:"sync"},
      {from:"feed", to:"api",   label:"FeedPage{posts, nextCursor}",   detail:"Hydrated post objects + cursor for next page.",type:"sync"},
      {from:"api",  to:"app",   label:"HTTP 200 + feed JSON",          detail:"App renders feed. Pre-fetches next 20 posts in background for infinite scroll.",type:"sync"}
    ]
  },

  architecture:{
    title:"Instagram System Architecture",
    caption:"Click a component to inspect its production role",
    lanes:[
      {
        label:"Client", hint:"Mobile / Web",
        nodes:[
          {id:"ios",    label:"iOS App",   badge:"Swift",  hint:"UIKit/SwiftUI",     detail:"Performs client-side JPEG compression (85% quality), progressive upload with resumability. Prefetches next feed page after current loads."},
          {id:"android",label:"Android",   badge:"Kotlin", hint:"Jetpack Compose",   detail:"Adaptive bitrate selection based on network type (WiFi=1080p, 4G=720p, 3G=360p). Offline queue for failed uploads."},
          {id:"web",    label:"Web",       badge:"React",  hint:"PWA",               detail:"Instagram Web uses React with lazy-loaded route chunks. Stories use Intersection Observer for auto-play trigger."}
        ]
      },
      {
        label:"Edge / Gateway", hint:"Global entry points",
        nodes:[
          {id:"cdn",   label:"CDN PoPs",    badge:"CloudFront", hint:"300+ edge locations", detail:"All media served from CDN. Cache-Control: public, max-age=31536000 for media. Short TTL (60s) for feed API responses. Geo-routing sends users to nearest PoP."},
          {id:"apigw", label:"API Gateway", badge:"Nginx+",     hint:"Auth · Rate-limit",   detail:"L7 gateway handles TLS termination, JWT validation, per-user rate limiting (token bucket in Redis), and request routing to internal services."}
        ]
      },
      {
        label:"Core Services", hint:"Business logic layer",
        nodes:[
          {id:"uploadsvc", label:"Upload Svc",   badge:"Java",   hint:"Handles media intake",   detail:"Validates content type, size (max 100MB video), generates presigned S3 URL for direct client upload. Publishes to Kafka on S3 event."},
          {id:"feedsvc",   label:"Feed Svc",     badge:"Python", hint:"Hybrid fanout read",     detail:"Merges pre-computed Redis feed with celebrity real-time posts. Calls Ranking Service. Returns paginated cursor-based response."},
          {id:"storysvc",  label:"Story Svc",    badge:"Go",     hint:"24h ephemeral content",  detail:"Writes story with Cassandra TTL 86400. Manages story ring ordering. Tracks viewer set with Redis ZADD."},
          {id:"searchsvc", label:"Search Svc",   badge:"Java",   hint:"Hashtag + caption",      detail:"Indexes hashtags and captions into Elasticsearch on post creation. Powers Explore trending tab via Redis sorted set updated by Flink."},
          {id:"notif",     label:"Notif Svc",    badge:"Go",     hint:"Push + in-app",          detail:"APNs/FCM push for likes, comments, new followers. In-app via WebSocket long-poll. Rate-limited to prevent notification fatigue."}
        ]
      },
      {
        label:"Processing", hint:"Async pipeline",
        nodes:[
          {id:"kafka",     label:"Kafka",           badge:"Event Bus",    hint:"Backbone of async flows", detail:"Topics: media.uploaded, feed.fanout, notif.send, search.index. Partitioned by userId for ordering. 7-day retention for replay."},
          {id:"transcode", label:"Transcoder Fleet", badge:"FFmpeg",      hint:"Multi-res + WebP",         detail:"Kubernetes jobs per media item. Generates 360/720/1080p WebP and MP4 (H.265). Thumbnails for Explore grid. P99 transcode time: <30s."},
          {id:"fanout",    label:"Fanout Workers",   badge:"32 consumers", hint:"Feed write amplification", detail:"32 parallel Kafka consumers per partition. Each batch-writes postId to 500 followers Redis sorted sets. Skips authors with >10K followers."},
          {id:"ranker",    label:"Ranking Service",  badge:"ML / TF",     hint:"Personalized feed order", detail:"TensorFlow Serving. Features: author affinity, post freshness, predicted engagement (CTR model), content type preference. P99 latency: <20ms."}
        ]
      },
      {
        label:"Storage", hint:"Data persistence layer",
        nodes:[
          {id:"s3",       label:"S3 + CDN",      badge:"Object Store", hint:"All media blobs",             detail:"Raw uploads in ig-raw bucket. Processed variants in ig-media. Lifecycle rule: raw deleted after 24h. CDN origin for all media serving."},
          {id:"postgres",  label:"Postgres",      badge:"Sharded",     hint:"Post metadata + follow graph", detail:"Sharded by userId. Post table: postId, userId, s3Key, caption, hashtags, createdAt. Follow table: adjacency list. Read replicas for feed hydration."},
          {id:"redis",     label:"Redis Cluster", badge:"Feed cache",  hint:"Pre-computed feeds",           detail:"Sorted set per user: ZADD feed:{userId} score postId. Score = unix timestamp. ZREMRANGEBYRANK trims to 800 entries. 64GB cluster, no persistence (rebuilds from DB on restart)."},
          {id:"cassandra", label:"Cassandra",     badge:"Time-series", hint:"Stories + analytics",          detail:"Stories table: (userId, storyId, createdAt) WITH TTL 86400. Partition key = userId ensures stories for same user co-located. Used for view counts (counter columns)."},
          {id:"elastic",   label:"Elasticsearch", badge:"Search",      hint:"Hashtag + caption index",      detail:"Index: posts. Mapping: caption (text), hashtags (keyword), location (geo_point), createdAt (date). Refresh interval 2s — 2s lag for new post searchability."}
        ]
      }
    ],
    links:[
      {from:"apigw",    to:"uploadsvc", label:"POST /posts",            type:"sync"},
      {from:"apigw",    to:"feedsvc",   label:"GET /feed",              type:"sync"},
      {from:"apigw",    to:"storysvc",  label:"GET/POST /stories",      type:"sync"},
      {from:"apigw",    to:"searchsvc", label:"GET /search",            type:"sync"},
      {from:"uploadsvc",to:"s3",        label:"PutObject raw",          type:"async"},
      {from:"uploadsvc",to:"kafka",     label:"media.uploaded event",   type:"async"},
      {from:"kafka",    to:"transcode", label:"consume media.uploaded", type:"async"},
      {from:"transcode",to:"s3",        label:"PutObject variants",     type:"async"},
      {from:"transcode",to:"cdn",       label:"preWarm(cdnKey)",        type:"async"},
      {from:"kafka",    to:"fanout",    label:"consume feed.fanout",    type:"async"},
      {from:"fanout",   to:"redis",     label:"ZADD feed:{userId}",     type:"sync"},
      {from:"feedsvc",  to:"redis",     label:"ZREVRANGE feed",         type:"sync"},
      {from:"feedsvc",  to:"postgres",  label:"getRecentCelebPosts",    type:"sync"},
      {from:"feedsvc",  to:"ranker",    label:"rank(candidates)",       type:"sync"},
      {from:"storysvc", to:"cassandra", label:"INSERT story TTL 86400", type:"sync"},
      {from:"kafka",    to:"elastic",   label:"consume search.index",   type:"async"},
      {from:"kafka",    to:"notif",     label:"consume notif.send",     type:"async"}
    ]
  },

  visual: function(mount) {
    var W = 520, H = 300;
    var DARK = '#0a0a0f', CARD = '#12121a', BORDER = '#1e1e2e';
    var PINK = '#e1306c', PURPLE = '#833ab4', ORANGE = '#fd5000';
    var GREEN = '#3fb950', BLUE = '#58a6ff', GRAY = '#8b949e';
    var GOLD = '#e3a008';

    var modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';
    var modes = [
      {key:'fanout',  label:'Fanout Flow',     color: PINK},
      {key:'upload',  label:'Upload Pipeline', color: BLUE},
      {key:'stories', label:'Stories Ring',    color: PURPLE}
    ];
    var activeMode = 'fanout';
    var particles = [];
    var storyAngle = 0;
    var pipeStep = 0;
    var pipeParticle = null;
    var selectedStory = null;
    var storyTimer = 0;
    var running = false;
    var rafId = null;
    var intervalId = null;
    var speed = 1;

    var modeBtns = modes.map(function(m) {
      var b = document.createElement('button');
      b.textContent = (m.key === 'fanout' ? '📢 ' : m.key === 'upload' ? '📸 ' : '⭕ ') + m.label;
      b.style.cssText = 'padding:4px 12px;border-radius:20px;border:1px solid ' + m.color + '55;background:' +
        (m.key === activeMode ? m.color + '22' : 'transparent') +
        ';color:' + m.color + ';cursor:pointer;font-size:12px;font-family:monospace;transition:all 0.2s';
      b.addEventListener('click', function() {
        if (running) { running = false; if (rafId) cancelAnimationFrame(rafId); if (intervalId) clearInterval(intervalId); }
        activeMode = m.key;
        modeBtns.forEach(function(btn, i) {
          btn.style.background = modes[i].key === activeMode ? modes[i].color + '22' : 'transparent';
        });
        particles = []; storyAngle = 0; pipeStep = 0; pipeParticle = null; selectedStory = null;
        playBtn.textContent = '► Play'; playBtn.style.color = PINK;
        statusEl.textContent = '';
        draw();
      });
      modeBar.appendChild(b);
      return b;
    });
    mount.appendChild(modeBar);

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center';
    var playBtn = document.createElement('button');
    playBtn.textContent = '► Play';
    playBtn.style.cssText = 'padding:4px 14px;border-radius:6px;border:1px solid ' + PINK + '55;background:' + PINK + '18;color:' + PINK + ';cursor:pointer;font-size:12px;font-family:monospace';
    var postBtn = document.createElement('button');
    postBtn.textContent = '✦ Post Now';
    postBtn.style.cssText = 'padding:4px 14px;border-radius:6px;border:1px solid ' + GREEN + '55;background:' + GREEN + '18;color:' + GREEN + ';cursor:pointer;font-size:12px;font-family:monospace';
    var speedSel = document.createElement('select');
    speedSel.style.cssText = 'padding:3px 8px;border-radius:6px;border:1px solid ' + BORDER + ';background:' + CARD + ';color:' + GRAY + ';font-size:11px;font-family:monospace';
    ['1x','2x','0.5x'].forEach(function(s) { var o = document.createElement('option'); o.textContent = s; speedSel.appendChild(o); });
    ctrl.appendChild(playBtn); ctrl.appendChild(postBtn); ctrl.appendChild(speedSel);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:' + W + 'px;border-radius:10px;background:' + DARK + ';display:block;margin:0 auto;border:1px solid ' + BORDER;
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'text-align:center;font-size:11px;font-family:monospace;color:' + GRAY + ';margin-top:6px;min-height:18px';
    mount.appendChild(statusEl);

    speedSel.addEventListener('change', function() {
      speed = speedSel.selectedIndex === 0 ? 1 : speedSel.selectedIndex === 1 ? 2 : 0.5;
    });

    // Followers in circle
    var FOLLOWER_COUNT = 12;
    var followers = [];
    for (var fi = 0; fi < FOLLOWER_COUNT; fi++) {
      var fa = (fi / FOLLOWER_COUNT) * Math.PI * 2 - Math.PI / 2;
      followers.push({ x: W/2 + Math.cos(fa)*105, y: H/2 + Math.sin(fa)*82, lit: 0 });
    }

    var pipeStages = [
      {label:'Client',    sub:'📱 compress', x:45,  color:BLUE},
      {label:'API GW',    sub:'⚡ auth+limit',x:130, color:BLUE},
      {label:'S3 Raw',    sub:'☁ store',     x:215, color:GOLD},
      {label:'Kafka',     sub:'⚙ event bus', x:300, color:ORANGE},
      {label:'Transcode', sub:'🎬 FFmpeg',    x:385, color:PURPLE},
      {label:'CDN',       sub:'🌐 pre-warm',  x:470, color:GREEN}
    ];

    var storyUsers = [
      {name:'You',   color:PINK,   hasStory:true,  viewed:false},
      {name:'Alice', color:PURPLE, hasStory:true,  viewed:true},
      {name:'Bob',   color:'#fd1d1d', hasStory:true,  viewed:false},
      {name:'Carol', color:GOLD,   hasStory:false, viewed:false},
      {name:'Dave',  color:BLUE,   hasStory:true,  viewed:true},
      {name:'Eve',   color:GREEN,  hasStory:true,  viewed:false},
      {name:'Frank', color:'#e3a008', hasStory:false, viewed:false},
      {name:'Grace', color:'#f78166', hasStory:true,  viewed:false}
    ];

    function roundRect(x, y, w, h, r, fill, stroke) {
      ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, w, h, r);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    function txt(t, x, y, col, sz, align) {
      ctx.fillStyle = col || '#e6edf3'; ctx.font = (sz||11)+'px monospace';
      ctx.textAlign = align||'center'; ctx.textBaseline = 'middle'; ctx.fillText(t,x,y);
    }

    function drawFanout() {
      ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H);
      var cx = W/2, cy = H/2;

      // Kafka dashed ring
      ctx.save(); ctx.strokeStyle = ORANGE+'44'; ctx.lineWidth=1; ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.arc(cx,cy,62,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      txt('Kafka fanout', cx+60, cy-18, ORANGE+'99', 9);

      // Connection lines
      followers.forEach(function(f) {
        ctx.save(); ctx.globalAlpha=0.1; ctx.strokeStyle=GRAY; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(f.x,f.y); ctx.stroke(); ctx.restore();
      });

      // Author center
      var g = ctx.createRadialGradient(cx,cy,0,cx,cy,36);
      g.addColorStop(0,PINK+'dd'); g.addColorStop(1,PURPLE+'33');
      ctx.beginPath(); ctx.arc(cx,cy,32,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=PINK; ctx.lineWidth=2; ctx.stroke();
      txt('📸',cx,cy-5,null,15); txt('Author',cx,cy+14,'#e6edf3',9);

      // Followers
      followers.forEach(function(f) {
        if (f.lit > 0) {
          var g2 = ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,20);
          g2.addColorStop(0,GREEN+Math.round(f.lit*180).toString(16).padStart(2,'0'));
          g2.addColorStop(1,'transparent');
          ctx.beginPath(); ctx.arc(f.x,f.y,20,0,Math.PI*2); ctx.fillStyle=g2; ctx.fill();
        }
        roundRect(f.x,f.y,36,20,5,CARD,f.lit>0.3?GREEN:BORDER);
        txt(f.lit>0.5?'✅':'👤',f.x,f.y,null,10);
      });

      // Particles
      particles.forEach(function(p) {
        ctx.globalAlpha = Math.max(0,p.alpha);
        var gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
        gr.addColorStop(0,p.color); gr.addColorStop(1,'transparent');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      });

      var lit = followers.filter(function(f){return f.lit>0.1;}).length;
      roundRect(52,18,96,22,5,CARD,BORDER);
      txt('Reached: '+lit+'/'+FOLLOWER_COUNT, 52, 18, lit>0?GREEN:GRAY, 10);
      txt('Redis ZADD feed:{userId} score postId', W/2, H-12, BLUE+'66', 9);
      if (!running) txt('Press Play · Post Now to animate', W/2, H-26, GRAY+'88', 9);
    }

    function spawnPost() {
      var cx=W/2, cy=H/2;
      followers.forEach(function(f,i) {
        setTimeout(function() {
          if (!document.body.contains(canvas)) return;
          particles.push({x:cx,y:cy,tx:f.x,ty:f.y,t:0,follower:i,color:PINK,r:7,alpha:1,done:false});
          statusEl.textContent = '⚡ Kafka fanout → Redis ZADD feed:{follower'+i+'} score postId';
        }, i*75);
      });
    }

    function updateFanout() {
      particles = particles.filter(function(p){
        if (p.done) return p.alpha>0;
        p.t = Math.min(1, p.t + 0.032*speed);
        var e = 1-Math.pow(1-p.t,3);
        p.x = W/2+(followers[p.follower].x-W/2)*e;
        p.y = H/2+(followers[p.follower].y-H/2)*e;
        p.r = 7-p.t*3.5;
        if (p.t>=1){p.done=true;followers[p.follower].lit=1;}
        return true;
      });
      followers.forEach(function(f){if(f.lit>0)f.lit=Math.max(0,f.lit-0.004*speed);});
    }

    function drawUpload() {
      ctx.fillStyle=DARK; ctx.fillRect(0,0,W,H);
      txt('Photo Upload Pipeline', W/2, 20, '#e6edf3', 12);
      txt('Step '+Math.min(pipeStep+1,pipeStages.length)+' of '+pipeStages.length, W/2, 36, GRAY, 10);
      var sy = H/2 - 10;
      pipeStages.forEach(function(s,i) {
        var active = pipeStep===i, done = i<pipeStep;
        var bgCol = done ? GREEN+'18' : (active ? s.color+'22' : CARD);
        var bdCol = done ? GREEN : (active ? s.color : BORDER);
        roundRect(s.x, sy, 66, 44, 8, bgCol, bdCol);
        txt(s.label, s.x, sy-8, active?s.color:done?GREEN:GRAY, 10);
        txt(s.sub, s.x, sy+8, active?s.color+'cc':GRAY, 9);
        if (done) { ctx.fillStyle=GREEN; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✓',s.x+29,sy-14); }
        if (i<pipeStages.length-1) {
          var x1=s.x+33, x2=pipeStages[i+1].x-33;
          ctx.strokeStyle = done?GREEN+'88':BORDER; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(x1,sy); ctx.lineTo(x2,sy); ctx.stroke();
          ctx.fillStyle = done?GREEN+'88':BORDER;
          ctx.beginPath(); ctx.moveTo(x2,sy); ctx.lineTo(x2-6,sy-4); ctx.lineTo(x2-6,sy+4); ctx.closePath(); ctx.fill();
        }
      });
      if (pipeParticle) {
        var pp=pipeParticle;
        ctx.globalAlpha=pp.alpha;
        var gr2=ctx.createRadialGradient(pp.x,sy,0,pp.x,sy,10);
        gr2.addColorStop(0,BLUE); gr2.addColorStop(1,'transparent');
        ctx.fillStyle=gr2; ctx.beginPath(); ctx.arc(pp.x,sy,10,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
      var stepDescs = [
        'Client compresses JPEG 85% quality · attaches caption + hashtags',
        'API Gateway validates auth token · rate-limit check passes (token bucket)',
        'Raw media written to S3 ig-raw bucket · 202 Accepted returned to client',
        'Kafka media.uploaded event published · transcoder + fanout workers notified',
        'FFmpeg generates 360/720/1080p WebP variants in parallel Kubernetes jobs',
        'CDN pre-warmed at 300+ PoPs · global first byte time < 50ms ✓'
      ];
      roundRect(W/2, H-26, W-20, 26, 6, CARD, BORDER);
      txt(stepDescs[Math.min(pipeStep,stepDescs.length-1)], W/2, H-26, BLUE+'dd', 10);
      txt('Press ✦ Post Now to advance each stage', W/2, H+10, GRAY+'66', 9);
    }

    function advancePipeline() {
      if (pipeStep >= pipeStages.length-1) {
        pipeStep=0; pipeParticle=null; statusEl.textContent='Pipeline complete — photo live on CDN ✓'; draw(); return;
      }
      var from=pipeStages[pipeStep], to=pipeStages[pipeStep+1];
      pipeParticle={x:from.x,alpha:1};
      var dx=to.x-from.x, t0=Date.now(), dur=500/speed;
      function ap(){
        if(!document.body.contains(canvas))return;
        var t=Math.min(1,(Date.now()-t0)/dur), e=1-Math.pow(1-t,2);
        pipeParticle.x=from.x+dx*e; pipeParticle.alpha=t<0.8?1:(1-t)/0.2;
        draw();
        if(t<1) requestAnimationFrame(ap);
        else { pipeStep++; pipeParticle=null; statusEl.textContent='→ '+pipeStages[Math.min(pipeStep,pipeStages.length-1)].label+' stage'; draw(); }
      }
      ap();
    }

    function drawStories() {
      ctx.fillStyle=DARK; ctx.fillRect(0,0,W,H);
      txt('Instagram Stories Ring', W/2, 20, '#e6edf3', 13);
      txt('Cassandra TTL:86400s · Redis viewer ring · CDN signed URLs', W/2, 36, GRAY, 10);
      var n=storyUsers.length, sx=48, gap=(W-96)/(n-1);
      storyUsers.forEach(function(u,i) {
        var x=sx+i*gap, y=H/2;
        if (!u.hasStory) {
          ctx.beginPath(); ctx.arc(x,y,20,0,Math.PI*2); ctx.fillStyle=CARD; ctx.fill();
          ctx.strokeStyle=BORDER; ctx.lineWidth=1.5; ctx.stroke();
          txt('👤',x,y,null,14); txt(u.name,x,y+30,GRAY,9); return;
        }
        ctx.save();
        if (u.viewed) { ctx.strokeStyle=GRAY+'55'; ctx.lineWidth=2.5; }
        else {
          var rg=ctx.createLinearGradient(x-24,y-24,x+24,y+24);
          rg.addColorStop(0,PINK); rg.addColorStop(0.5,PURPLE); rg.addColorStop(1,ORANGE);
          ctx.strokeStyle=rg; ctx.lineWidth=3;
        }
        ctx.beginPath(); ctx.arc(x,y,24,-Math.PI/2+storyAngle,Math.PI*1.5+storyAngle); ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2);
        ctx.fillStyle=u.color+'33'; ctx.fill();
        txt('👤',x,y,null,13);
        txt(u.name,x,y+30,u.viewed?GRAY:'#e6edf3',9);
        if (u===selectedStory) {
          ctx.fillStyle=CARD; ctx.fillRect(x-18,y+38,36,4);
          ctx.fillStyle=u.color; ctx.fillRect(x-18,y+38,36*(1-storyTimer),4);
        }
      });
      roundRect(W/2,H-16,W-20,20,5,CARD,BORDER);
      if (selectedStory) txt('Viewing '+selectedStory.name+' · ZADD storyViews:'+selectedStory.name+' ts userId · TTL countdown active',W/2,H-16,selectedStory.color+'cc',9);
      else txt('Click a gradient ring to view story · Colored ring = unviewed · Gray = seen',W/2,H-16,GRAY,9);
    }

    canvas.addEventListener('click', function(e) {
      if (activeMode!=='stories') return;
      var rect=canvas.getBoundingClientRect(), scaleX=W/rect.width, scaleY=H/rect.height;
      var mx=(e.clientX-rect.left)*scaleX, my=(e.clientY-rect.top)*scaleY;
      var n=storyUsers.length, sx=48, gap=(W-96)/(n-1);
      storyUsers.forEach(function(u,i){
        var x=sx+i*gap, y=H/2, dx=mx-x, dy=my-y;
        if (dx*dx+dy*dy<28*28 && u.hasStory){ selectedStory=u; storyTimer=0; u.viewed=true; statusEl.textContent='Viewing '+u.name+' story · ZADD storyViews:'+u.name+' '+Date.now()+' userId → Cassandra viewer count++'; draw(); }
      });
    });

    function draw() {
      if (activeMode==='fanout') drawFanout();
      else if (activeMode==='upload') drawUpload();
      else drawStories();
    }

    function frame() {
      if (!running || !document.body.contains(canvas)) return;
      rafId=requestAnimationFrame(frame);
      if (activeMode==='fanout'){ updateFanout(); drawFanout(); }
      else if (activeMode==='stories'){ storyAngle+=0.018*speed; if(selectedStory){storyTimer=Math.min(1,storyTimer+0.004*speed);if(storyTimer>=1){selectedStory=null;storyTimer=0;}} drawStories(); }
      else drawUpload();
    }

    function startLoop() {
      running=true; playBtn.textContent='⏸ Pause'; playBtn.style.color=ORANGE;
      if (activeMode==='fanout') intervalId=setInterval(function(){if(!document.body.contains(canvas)||!running){clearInterval(intervalId);return;}spawnPost();},3200/speed);
      frame();
    }
    function pauseLoop() {
      running=false; playBtn.textContent='► Play'; playBtn.style.color=PINK;
      if(rafId)cancelAnimationFrame(rafId); if(intervalId)clearInterval(intervalId);
    }

    playBtn.addEventListener('click',function(){if(running)pauseLoop();else startLoop();});
    postBtn.addEventListener('click',function(){
      if(activeMode==='fanout'){spawnPost();statusEl.textContent='✦ Post published → Kafka fanout.workers consuming...';}
      else if(activeMode==='upload') advancePipeline();
      else statusEl.textContent='Click a story ring to view it';
    });

    draw();
  }
}

]; // end part5

window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat(part5);
})();
