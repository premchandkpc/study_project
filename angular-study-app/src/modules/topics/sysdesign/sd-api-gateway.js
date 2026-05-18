(function() {
  var topic = {
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
    why:"Without a gateway, every service must implement auth, rate-limiting, and logging independently — 10 services × 3 concerns = 30 implementations that drift. The gateway centralises this into one audited, consistent implementation.",
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
        answer:"**Token bucket algorithm** per user/IP stored in **Redis** (atomic INCR + EXPIRE).\n\nSteps:\n1. On each request, INCR a Redis key like `ratelimit:{userId}:{window}`\n2. If count > limit, return 429 Too Many Requests with Retry-After header\n3. Key expires after window duration — no cleanup needed\n\n**Challenge:** race condition between check and increment. Solve with **Lua script** (atomic execution in Redis) or **Redis cell module** (token bucket native).\n\n**Sliding window** more accurate than fixed window (avoids burst at window boundary) — store timestamps in a Redis Sorted Set, expire old entries, count remaining.",
        followUps:["What is the difference between token bucket and leaky bucket?","How do you handle rate limiting across multiple gateway instances?"]
      },
      {question:"What is the difference between an API Gateway and a load balancer?",
        answer:"**Load balancer (L4/L7):** distributes traffic across identical instances of the same service. L4 = TCP/UDP level (no HTTP awareness). L7 = HTTP-aware (can route by path/host).\n\n**API Gateway:** sits above the LB. Knows about your business services, auth schemes, and API contracts. Routes different paths to different services, enforces auth/rate-limit, transforms requests.\n\nTypical stack: Client → CDN → L4 LB → API Gateway → L7 LB per service → service instances.",
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
    },
    visual: {
      type: "flow",
      title: "API Gateway Pipeline",
      direction: "horizontal",
      nodes: [
        { id: "client",      label: "Client",       color: "#58a6ff", icon: "💻", sublabel: "Web / Mobile / Partner" },
        { id: "ratelimit",   label: "Rate Limiter",  color: "#ffa657", icon: "⚡", sublabel: "Token bucket / Redis" },
        { id: "auth",        label: "Auth",          color: "#bc8cff", icon: "🔒", sublabel: "JWT / API Key / OAuth2" },
        { id: "router",      label: "Router",        color: "#58a6ff", icon: "🔀", sublabel: "Path → upstream service" },
        { id: "serviceA",    label: "Service A",     color: "#3fb950", icon: "⚙️", sublabel: "/api/v1/orders" },
        { id: "serviceB",    label: "Service B",     color: "#3fb950", icon: "⚙️", sublabel: "/api/v1/users" }
      ],
      connections: [
        { from: "client",    to: "ratelimit", label: "REST/HTTPS",    protocol: "REST" },
        { from: "ratelimit", to: "auth",      label: "within quota",  protocol: "HTTP" },
        { from: "auth",      to: "router",    label: "authenticated", protocol: "HTTP" },
        { from: "router",    to: "serviceA",  label: "/orders",       protocol: "HTTP" },
        { from: "router",    to: "serviceB",  label: "/users",        protocol: "HTTP" }
      ],
      scenarios: [
        { name: "Happy Path",    path: ["client","ratelimit","auth","router","serviceA"], result: "200 OK",                  resultColor: "#3fb950" },
        { name: "Rate Limited",  path: ["client","ratelimit"],                            result: "429 Too Many Requests",   resultColor: "#ffa657" },
        { name: "Unauthorized",  path: ["client","ratelimit","auth"],                     result: "401 Unauthorized",        resultColor: "#f85149" }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
