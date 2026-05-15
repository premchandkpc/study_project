(function() {
  var topic = {
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
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
