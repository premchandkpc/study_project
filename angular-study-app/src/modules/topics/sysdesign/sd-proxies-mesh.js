(function() {
  var topic = {
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
    why:"At 50+ microservices, implementing mTLS and observability per-service is untenable. Service mesh moves this to infrastructure, giving you a uniform security and observability baseline for free.",
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
        answer:"API Gateway handles **north-south** traffic (client → cluster). Service mesh handles **east-west** traffic (service → service).\n\nService mesh provides:\n- **mTLS everywhere** — all internal traffic encrypted and mutually authenticated without code changes\n- **Uniform observability** — traces/metrics for every internal call, not just edge\n- **Traffic policies** — retries, timeouts, circuit breaking at infra level\n- **Zero-trust networking** — services can only call what their policy allows\n\nYou typically need both: API Gateway for the edge, service mesh for internal communication.",
        followUps:["What is mTLS and how does it differ from regular TLS?","How does Istio inject sidecars automatically?"]
      }
    ],
    tradeoffs:{
      pros:["Uniform mTLS without app code changes","Traffic shaping (canary, A/B) without redeployments","Centralized observability for all service calls"],
      cons:["Sidecar adds ~10ms latency + ~50MB RAM per pod","Complex control plane (Istio is notorious for steep learning curve)","Debug difficulty — two network hops instead of one"],
      when:"Use service mesh at 20+ microservices or when compliance requires encrypted internal traffic. For simpler setups, use direct service calls with app-level circuit breaking (Resilience4j, go-resilience)."
    },
    visual: {
      type: "layered",
      title: "🔀 Reverse Proxy, Service Mesh & Sidecar Pattern",
      layers: [
        {
          id: "external",
          label: "External Layer",
          color: "#58a6ff",
          protocols: "HTTPS / DNS",
          services: [
            { id: "client-browser", label: "Browser", icon: "🌐", sublabel: "HTTP/2" },
            { id: "mobile-client", label: "Mobile App", icon: "📱", sublabel: "TLS 1.3" },
            { id: "cdn", label: "CDN Edge", icon: "☁️", sublabel: "CloudFront / Akamai" }
          ]
        },
        {
          id: "ingress",
          label: "Ingress / Reverse Proxy Layer",
          color: "#ffa657",
          protocols: "SSL Termination / L7 Routing",
          services: [
            { id: "nginx", label: "Nginx", icon: "⚡", sublabel: "Reverse Proxy" },
            { id: "traefik", label: "Traefik", icon: "🔀", sublabel: "Ingress Controller" },
            { id: "alb", label: "ALB", icon: "⚖️", sublabel: "AWS Load Balancer" }
          ]
        },
        {
          id: "mesh-layer",
          label: "Service Mesh Layer (Data Plane)",
          color: "#bc8cff",
          protocols: "mTLS / xDS / Envoy",
          services: [
            { id: "envoy-a", label: "Envoy Sidecar A", icon: "🛡️", sublabel: "Pod A" },
            { id: "envoy-b", label: "Envoy Sidecar B", icon: "🛡️", sublabel: "Pod B" },
            { id: "istiod", label: "Istiod", icon: "🧩", sublabel: "Control Plane" }
          ]
        },
        {
          id: "service-layer",
          label: "Microservice Layer",
          color: "#3fb950",
          protocols: "gRPC / REST / localhost",
          services: [
            { id: "svc-order", label: "Order Service", icon: "📋", sublabel: "Java / Spring" },
            { id: "svc-payment", label: "Payment Service", icon: "💳", sublabel: "Go" },
            { id: "svc-notif", label: "Notification Svc", icon: "🔔", sublabel: "Node.js" },
            { id: "svc-inventory", label: "Inventory Svc", icon: "📦", sublabel: "Python" }
          ]
        }
      ],
      flows: [
        {
          name: "Request Path",
          path: ["client-browser", "cdn", "nginx", "envoy-a", "svc-order"],
          color: "#58a6ff"
        },
        {
          name: "mTLS Service Call",
          path: ["svc-order", "envoy-a", "envoy-b", "svc-payment"],
          color: "#bc8cff"
        },
        {
          name: "Config Push",
          path: ["istiod", "envoy-a", "envoy-b"],
          color: "#ffa657"
        }
      ]
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
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
