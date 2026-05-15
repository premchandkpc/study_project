(function() {
  var topic = {
    id: "ms-service-mesh-observability",
    area: "microservices",
    title: "Service Mesh, mTLS & Observability",
    tag: "Mesh",
    tags: ["service mesh", "istio", "envoy", "mtls", "opentelemetry", "tracing", "prometheus"],
    concept:
`A **service mesh** moves east-west networking concerns into infrastructure proxies such as Envoy. The app still owns business logic, while the mesh can enforce:
- **mTLS**: workload identity and encrypted service-to-service traffic.
- **Traffic policy**: retries, timeouts, outlier detection, canaries, mirrors, and fault injection.
- **Authorization policy**: service A can call service B only on approved paths or ports.
- **Telemetry**: RED metrics (rate, errors, duration), traces, access logs, and service graphs.
- **Zero-trust networking**: identity is based on workload certificates, not just network location.

Modern meshes may use sidecars, node proxies, or ambient modes, but the conceptual goal is the same: make cross-service traffic visible, secure, and controllable.`,
    why:
`When a system grows from 5 services to 50, every team reimplementing TLS, retries, tracing headers, authz, and traffic shifting becomes inconsistent. A mesh gives platform teams one control plane for shared policies. The danger is overusing mesh retries or hiding complexity: if every layer retries blindly, a partial outage becomes a retry storm. Mesh policy should complement application-level timeouts and idempotency, not replace them.`,
    example: {
      language: "yaml",
      code:
`# Istio-style production policies for an order/payment path
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default-strict-mtls
  namespace: shop
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: payment-only-from-order-service
  namespace: shop
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/shop/sa/order-service
    to:
    - operation:
        methods: ["POST"]
        paths: ["/v1/charges"]
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: shop
spec:
  host: payment-service.shop.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 128
        maxRequestsPerConnection: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
    tls:
      mode: ISTIO_MUTUAL
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: payment-service
  namespace: shop
spec:
  hosts:
  - payment-service.shop.svc.cluster.local
  http:
  - timeout: 700ms
    retries:
      attempts: 2
      perTryTimeout: 250ms
      retryOn: connect-failure,refused-stream,5xx
    route:
    - destination:
        host: payment-service.shop.svc.cluster.local
        subset: stable
      weight: 90
    - destination:
        host: payment-service.shop.svc.cluster.local
        subset: canary
      weight: 10
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: order-payment-telemetry
  namespace: shop
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10
  accessLogging:
  - providers:
    - name: envoy`,
      notes: `Keep total retry budget smaller than the caller's deadline. If the application timeout is 800 ms, a mesh policy with 3 attempts at 500 ms each is a bug. Use trace IDs to prove the retry behavior you configured is the behavior actually happening.`
    },
    interview: [
      {
        question: "What belongs in the mesh vs in application code?",
        answer:
`Put transport concerns in the mesh: mTLS, L7 routing, traffic splitting, coarse retries, outlier detection, access logs, and baseline telemetry. Keep business authorization, idempotency, compensation, domain fallbacks, and user-facing error semantics in application code. The mesh can say "order-service may call payment-service"; the app must still decide whether this user may charge this card.`,
        followUps: ["How do mesh retries interact with idempotency?", "What is the sidecar resource overhead?"]
      },
      {
        question: "How do traces, metrics, and logs work together during an incident?",
        answer:
`Metrics tell you that something is wrong, traces show where time or errors are happening across services, and logs explain local details at a specific span or request. A practical incident loop is: alert on RED/SLO metrics, open traces for slow/error exemplars, then jump to correlated logs using trace_id and span_id.`,
        followUps: ["What is trace sampling?", "What are high-cardinality metric labels?"]
      }
    ],
    tradeoffs: {
      pros: [
        "mTLS and workload identity become platform defaults instead of per-team projects.",
        "Canaries, mirrors, and fault injection can happen without changing application code.",
        "Standard telemetry gives a service graph and consistent RED metrics."
      ],
      cons: [
        "Sidecars add CPU, memory, connection, and operational overhead.",
        "Misconfigured retries or timeouts can amplify incidents.",
        "Debugging now includes app code, proxy config, and control-plane state."
      ],
      when: `Use a mesh when you have many services, zero-trust requirements, cross-team platform standards, or complex rollout policies. For a tiny system, start with gateway + good app instrumentation before adding mesh complexity.`
    }
  };
  window.MICRO_TOPICS = (window.MICRO_TOPICS || []).concat([topic]);
})();
