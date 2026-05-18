# Load Balancing - L4/L7, Algorithms & Health Checks

## Quick Facts
- Area: System Design
- Tag: Infrastructure
- Source: `src/modules/topics/sysdesign/sd-load-balancing.js`
- Tags: `load balancer`, `round robin`, `least connections`, `consistent hashing`, `nlb`, `alb`, `nginx`, `ha proxy`
- Visual coverage: live visual, flow lab, UML lab, architecture map

## Concept
A **load balancer** distributes incoming traffic across multiple backend instances to maximise throughput, minimise latency, and avoid overloading any single server.

**L4 vs L7:**
- **L4 (Transport layer)** - routes by IP + TCP/UDP port. Doesn't inspect HTTP content. Very fast (< 0.1ms overhead). Example: AWS NLB.
- **L7 (Application layer)** - inspects HTTP headers, URL path, cookies. Can route by content, inject headers, terminate TLS. Example: AWS ALB, nginx.

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
- **Passive** - detect failure from response codes/timeouts on real traffic
- **Active** - probe /health endpoint on interval (e.g., 5s); remove from pool after N failures; re-add after M successes
- **Graceful drain** - on scale-in, stop sending new requests but complete in-flight (connection draining, 30-60 s default in AWS)

## Why It Matters
Load balancing is what makes horizontal scaling possible. Without it, you have one server. With it, you have unlimited theoretical throughput. Algorithm choice directly impacts p99 latency.

## Architecture / Mental Model
```mermaid
flowchart LR
  subgraph lane_0["Caller"]
    caller["Caller"]
  end
  subgraph lane_1["API"]
    api["Public API"]
  end
  subgraph lane_2["Core"]
    core["Algorithm Core"]
  end
  subgraph lane_3["State"]
    state["State Store"]
  end
  subgraph lane_4["Async"]
    worker["Sweeper / Worker"]
  end
  caller -->|"ingress"| api
  api -->|"sync request"| core
  core -.->|"async event"| state
  core -->|"state access"| worker
  worker -.->|"replay / repair"| state
```

## Runtime / Sequence
```mermaid
sequenceDiagram
  participant a0 as Caller
  participant a1 as API
  participant a2 as Algorithm Core
  participant a3 as State Store
  participant a4 as Worker
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
- Flow lab available: step-by-step path highlighting.
- UML sequence simulation available: actor messages animate in order.
- Architecture map available: clickable nodes and sync/async links.
- Live visual exists in app: topic-specific canvas/ReactViz animation.

Flow steps:

1. Active health check - LB probes GET /health on each upstream every 5s. 2 consecutive failures -> removed from pool. 3 successes -> re-added.
2. Server 3 marked unhealthy - Server 3 returned 503 twice. Removed from upstream pool. No traffic sent until it recovers.
3. Client sends request - Client connects to LB virtual IP. TLS terminated here. HTTP/2 stream opened.
4. Routed to Server 1 (least-conn) - Server 1 has fewest active connections. LB forwards request, increments connection counter.
5. Response returned - Server 1 responds. LB decrements connection counter. Result flows back to client.

## Example
```yaml
# nginx L7 load balancer config
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
}
```

Notes:
keepalive 32 maintains 32 idle connections per worker to each upstream - eliminates TCP handshake on each request.

## Complexity And Performance
- Time/space complexity depends on input size, data volume, and implementation choices.
- Track latency, throughput, memory, saturation, error rate, and correctness invariants.

## Interview Drills
1. Why use consistent hashing in a load balancer for a caching layer?
   Answer: When load balancing to a distributed cache (e.g. Memcached cluster), you want the same key to always go to the same node for maximum cache utilisation. Round-robin would send `user:42` to any of 10 nodes - the key would need to be in all 10 nodes or you'd get misses.
   
   Consistent hashing places servers on a hash ring. A request key is hashed and routes clockwise to the nearest server. On adding/removing a node, only ~K/N keys need to remapped (K=keys, N=nodes) - vs hash-mod which remaps nearly all keys.
   
   **Virtual nodes (vnodes)** - each physical server gets 150 virtual positions on the ring for uniform distribution.
   Follow-ups: How do you handle hot spots in consistent hashing?; What is a bounded-load consistent hash?

2. What is connection draining and why is it important?
   Answer: When a server is removed from the LB pool (scale-in, deployment), in-flight requests must complete. Connection draining (AWS calls it "deregistration delay") tells the LB to stop sending new requests to the deregistering target but keep the existing connections alive until they complete or a timeout (30-60s) elapses.
   
   Without draining: mid-flight requests receive TCP RST -> user sees errors. With draining: zero-downtime deployments and scale-in events.
   Follow-ups: How do you implement graceful shutdown in a Go/Java service?

## Trade-offs
Pros:
- Enables horizontal scaling
- Eliminates single points of failure
- Algorithms can optimize for latency or fairness

Cons:
- L7 LB adds ~1-5ms per request
- Sticky sessions complicate stateless design
- Health check intervals introduce detection lag

When to use:
Always. L4 for raw TCP throughput (gaming, DB). L7 for HTTP APIs with routing/auth needs. Least-conn for WebSocket. Consistent hash for cache clusters.

## Gotchas
_No gotchas configured._

