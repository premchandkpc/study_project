/* ===== Microservices & System Design curriculum — mentor-grade, topic-wise ===== */
window.MICRO_TOPICS = [
  {
    id: "ms-api-gateway",
    area: "microservices",
    title: "API Gateway: Routing, Auth & Rate Limiting",
    tag: "Gateway",
    tags: ["api gateway", "rate limiting", "auth", "reverse proxy", "kong", "envoy"],
    concept:
`An **API Gateway** is the single entry point to a microservice mesh. Responsibilities:
- **Routing**: path/host-based to upstream services.
- **Authentication**: JWT validation, OAuth2 token introspection — offloaded from services.
- **Rate limiting**: token bucket / sliding window per client or IP.
- **TLS termination, request transformation, logging, tracing injection**.
Popular implementations: **Kong** (nginx-based, plugin ecosystem), **AWS API Gateway**, **Envoy Proxy** (xDS config, used by Istio), **Traefik**.
**Backend-for-Frontend (BFF)** is a gateway variant per client type (mobile, web).`,
    why:
`Without a gateway, every service reinvents auth and rate limiting — inconsistently. The gateway enables **cross-cutting concerns at the edge** without coupling services. Rate limiting at the gateway prevents cascading overload. TLS termination at the gateway removes per-service certificate management.`,
    example: {
      language: "go",
      code:
`// Simplified Gateway middleware in Go
package gateway

import (
    "context"
    "fmt"
    "net/http"
    "net/http/httputil"
    "net/url"
    "sync"
    "time"
)

// Token bucket rate limiter per client key
type Bucket struct {
    tokens   float64
    capacity float64
    rate     float64  // tokens per second
    last     time.Time
    mu       sync.Mutex
}

func (b *Bucket) Allow() bool {
    b.mu.Lock()
    defer b.mu.Unlock()
    now := time.Now()
    elapsed := now.Sub(b.last).Seconds()
    b.last = now
    b.tokens = min(b.capacity, b.tokens+elapsed*b.rate)
    if b.tokens < 1 {
        return false
    }
    b.tokens--
    return true
}

type Gateway struct {
    buckets sync.Map
    upstream *url.URL
}

func (g *Gateway) bucket(key string) *Bucket {
    v, _ := g.buckets.LoadOrStore(key, &Bucket{tokens: 100, capacity: 100, rate: 10, last: time.Now()})
    return v.(*Bucket)
}

func (g *Gateway) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 1. Auth — validate JWT (simplified)
    tok := r.Header.Get("Authorization")
    if tok == "" {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }
    clientID := parseClientID(tok)   // validate & extract

    // 2. Rate limit per client
    if !g.bucket(clientID).Allow() {
        w.Header().Set("Retry-After", "1")
        http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
        return
    }

    // 3. Inject trace header, proxy upstream
    r.Header.Set("X-Client-Id", clientID)
    proxy := httputil.NewSingleHostReverseProxy(g.upstream)
    proxy.ServeHTTP(w, r)
}

func parseClientID(tok string) string {
    return fmt.Sprintf("client-%d", len(tok)%100) // stub
}

func min(a, b float64) float64 { if a < b { return a }; return b }`,
      notes: `In production, share rate limit state via **Redis** (sliding window with Lua scripts) for multi-instance gateways. Use a dedicated JWT library with signature verification and expiry checks.`
    },
    interview: [
      {
        question: "What is the difference between a gateway and a service mesh?",
        answer:
`A **gateway** handles **north-south traffic** (client → cluster). A **service mesh** (Istio, Linkerd) handles **east-west traffic** (service → service) via sidecar proxies. The mesh gives you mTLS between services, circuit breaking, retries, and distributed tracing without changing application code. Gateways and meshes are complementary — deploy both in large orgs.`,
        followUps: ["What is mTLS and why does it matter?", "How does xDS configuration work in Envoy?"]
      },
      {
        question: "How do you implement rate limiting without Redis?",
        answer:
`In-memory token bucket (per replica) for low-traffic services — simple, zero latency, but allows per-replica × N requests total. For distributed rate limiting: Redis INCR with TTL (imprecise), Redis + Lua sliding window, or a dedicated service (Envoy's external rate limit gRPC API). Accept the tradeoff: strict distributed rate limiting adds latency; approximate is often good enough.`,
        followUps: ["What is the sliding window vs fixed window difference?", "How does Cloudflare rate limit at edge?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Centralizes auth, rate limiting, TLS — services stay thin.",
        "Single place to add observability headers (trace IDs) for all traffic.",
        "Enables canary routing and A/B testing without deploying new services."
      ],
      cons: [
        "Single point of failure — must be HA with multiple replicas.",
        "Gateway latency adds to every request.",
        "Over-centralizing business logic in the gateway creates a bottleneck."
      ],
      when: `**Always** use a gateway for public APIs. Use a **service mesh** when east-west mTLS and observability are required. Avoid putting business logic in the gateway — keep it infrastructure only.`
    }
  },

  {
    id: "ms-kafka-event-driven",
    area: "microservices",
    title: "Kafka: Event-Driven Architecture & Exactly-Once",
    tag: "Kafka",
    tags: ["kafka", "event driven", "consumer group", "exactly once", "partitions", "offsets"],
    concept:
`**Apache Kafka** is a distributed commit log. Key concepts:
- **Topic → Partitions**: ordered, immutable log per partition.
- **Consumer Groups**: each partition consumed by exactly one consumer in a group — horizontal scale.
- **Offsets**: consumer tracks position; Kafka doesn't push.
- **Delivery semantics**: at-most-once (auto-commit), at-least-once (commit after process), exactly-once (idempotent producer + transactional consumer).
- **Compacted topics**: retain only the latest value per key — used for event sourcing read models.
- **Schema Registry**: Avro/Protobuf schemas with versioning and compatibility checks.`,
    why:
`Kafka decouples producers from consumers in time and space — no direct RPC. This enables **event sourcing**, **CQRS**, **audit logs**, and **async workflows**. Consumer groups allow independent replay at different rates. The durable log is the ground truth; services can replay from offset 0 to rebuild state after a bug. Exactly-once is the hardest part — understand the two-phase commit involved.`,
    example: {
      language: "java",
      code:
`// Kafka exactly-once producer + Spring Kafka consumer
import org.apache.kafka.clients.producer.*;
import org.springframework.kafka.annotation.*;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.transaction.annotation.Transactional;

// ── Idempotent + transactional producer ───────────────────────────────────
class OrderEventProducer {
    private final KafkaTemplate<String, OrderEvent> kafka;
    private final OrderRepository repo;

    // @Transactional spans both DB write and Kafka send — outbox pattern alternative
    @Transactional("kafkaTransactionManager")
    public void publishOrderCreated(Order order) {
        repo.save(order);  // DB write inside Kafka transaction scope
        kafka.executeInTransaction(ops ->
            ops.send("orders.events",
                     order.getId(),
                     new OrderEvent("ORDER_CREATED", order))
        );
    }
}

// ── Consumer with manual ack (at-least-once) ──────────────────────────────
@KafkaListener(
    topics = "orders.events",
    groupId = "inventory-service",
    containerFactory = "batchFactory"     // batch processing for throughput
)
public void onOrderEvent(
    List<ConsumerRecord<String, OrderEvent>> records,
    Acknowledgment ack
) {
    for (var r : records) {
        try {
            process(r.value());
        } catch (RetryableException e) {
            // send to retry topic, don't ack → reprocessed
            retryProducer.send("orders.events.retry", r);
        } catch (FatalException e) {
            // send to DLQ, ack to skip
            dlqProducer.send("orders.events.dlq", r);
        }
    }
    ack.acknowledge();  // commits offset after all records processed
}

// ── Consumer group lag monitoring ─────────────────────────────────────────
// kafka-consumer-groups.sh --bootstrap-server localhost:9092 \\
//   --describe --group inventory-service`,
      notes: `The **outbox pattern** is the safe alternative to \`@Transactional\` across DB + Kafka: write the event to an \`outbox\` table in the same DB transaction, then a separate relay polls and publishes to Kafka. Eliminates dual-write failure modes.`
    },
    interview: [
      {
        question: "How does Kafka achieve exactly-once delivery?",
        answer:
`Three components: (1) **Idempotent producer** — each message gets a sequence number; the broker deduplicates retries per producer epoch. (2) **Transactional producer** — \`beginTransaction\`, \`send\`, \`commitTransaction\` atomically. (3) **Transactional consumer** — reads only committed messages (\`isolation.level=read_committed\`). Together, a consume-transform-produce pipeline is exactly-once. Note: exactly-once is producer-broker-consumer — your downstream DB still needs idempotency on the consumer side.`,
        followUps: ["What is a producer epoch?", "How does the outbox pattern compare?", "What is a zombie producer?"]
      },
      {
        question: "How do you handle a slow consumer without losing messages?",
        answer:
`Kafka retains messages for the configured retention period regardless of consumption speed. Options: (1) **Scale consumers** up to the number of partitions. (2) **Repartition** the topic with more partitions to allow more parallelism. (3) **Batch consumption** — process N records per poll. (4) **Back-pressure**: pause the consumer with \`consumer.pause()\` until the downstream drains. Monitor lag via \`consumer group describe\` or Kafka exporter + Prometheus.`,
        followUps: ["What is consumer group rebalancing and how do you minimize it?", "What are sticky partition assignments?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Durable log enables replay — rebuild consumers from zero offset after bugs.",
        "Consumer groups scale consumption horizontally up to partition count.",
        "Decouples producers and consumers in time — producers don't wait for consumers."
      ],
      cons: [
        "Ordering is per-partition only — cross-partition ordering requires application logic.",
        "Exactly-once is complex and adds latency.",
        "Small message overhead — better for batched events than RPC-style calls."
      ],
      when: `**Kafka** for async workflows, event sourcing, audit logs, and high-throughput pipelines. **RabbitMQ** for task queues with complex routing. **SQS/SNS** for AWS-native workloads. Avoid Kafka for synchronous request/response — use gRPC.`
    }
  },

  {
    id: "ms-saga-distributed-tx",
    area: "microservices",
    title: "Saga Pattern & Distributed Transactions",
    tag: "Saga",
    tags: ["saga", "2pc", "distributed transaction", "choreography", "orchestration", "compensating"],
    concept:
`Distributed transactions across microservices cannot use ACID — services have separate DBs. The **Saga** pattern breaks a transaction into a sequence of local transactions, each publishing an event or command.
Two flavors:
- **Choreography**: services react to events. Decentralized, but hard to observe.
- **Orchestration**: a saga orchestrator issues commands and handles outcomes. Centralized logic, easier to trace (e.g., Temporal, Netflix Conductor, Camunda).
**Compensating transactions** undo completed steps on failure — they must be idempotent and retryable.`,
    why:
`2PC (two-phase commit) requires all participants to be available simultaneously — kills availability in distributed systems (CAP theorem). Sagas trade **isolation** (intermediate states are visible) for availability. This is the correct model for microservice workflows like order → payment → inventory → shipping. Understanding the ACD properties (Atomic, Consistent, Durable; not Isolated) is essential for senior system design.`,
    example: {
      language: "java",
      code:
`// Orchestration Saga using Spring State Machine / Temporal (simplified)
// Order saga: Reserve inventory → Charge payment → Confirm order

import io.temporal.workflow.*;
import io.temporal.activity.*;
import java.time.Duration;

// ── Workflow interface ─────────────────────────────────────────────────────
@WorkflowInterface
public interface OrderSaga {
    @WorkflowMethod
    OrderResult execute(CreateOrderCommand cmd);
}

// ── Activities (each is a local transaction) ──────────────────────────────
@ActivityInterface
public interface InventoryActivity {
    String reserve(String productId, int qty);          // returns reservationId
    void cancel(String reservationId);                  // compensating action
}

@ActivityInterface
public interface PaymentActivity {
    String charge(String userId, Money amount);         // returns chargeId
    void refund(String chargeId);                       // compensating action
}

// ── Saga implementation ────────────────────────────────────────────────────
public class OrderSagaImpl implements OrderSaga {
    private final InventoryActivity inventory = Workflow.newActivityStub(
        InventoryActivity.class,
        ActivityOptions.newBuilder().setStartToCloseTimeout(Duration.ofSeconds(10)).build()
    );
    private final PaymentActivity payment = Workflow.newActivityStub(
        PaymentActivity.class,
        ActivityOptions.newBuilder().setStartToCloseTimeout(Duration.ofSeconds(30)).build()
    );

    @Override
    public OrderResult execute(CreateOrderCommand cmd) {
        String reservationId = null;
        String chargeId = null;
        try {
            // Step 1: reserve inventory
            reservationId = inventory.reserve(cmd.productId(), cmd.quantity());

            // Step 2: charge payment
            chargeId = payment.charge(cmd.userId(), cmd.amount());

            // Step 3: confirm (all good)
            return OrderResult.success(reservationId, chargeId);

        } catch (Exception e) {
            // Compensate in reverse order
            if (chargeId != null)      payment.refund(chargeId);
            if (reservationId != null) inventory.cancel(reservationId);
            return OrderResult.failed(e.getMessage());
        }
    }
}`,
      notes: `Temporal persists workflow state in its DB — the workflow survives crashes and resumes mid-execution. Compensating transactions must be **idempotent**: calling \`refund(chargeId)\` twice should be safe. Use unique idempotency keys derived from the saga ID.`
    },
    interview: [
      {
        question: "What problems does the Saga pattern NOT solve?",
        answer:
`Sagas don't provide **isolation** — other transactions can see intermediate states (e.g., inventory reserved but payment not yet charged). They also don't guarantee **atomicity in the traditional sense** — compensations are eventual. Solutions: (1) **Semantic lock**: mark order as PENDING until saga completes. (2) **Commutative updates**: design operations to be order-independent. (3) Pivot transaction pattern — make steps idempotent across ordering.`,
        followUps: ["What is the ACD vs ACID distinction?", "When would you use 2PC over Saga?"]
      },
      {
        question: "How do you handle a compensation failure in a Saga?",
        answer:
`Compensations must be **retried with exponential backoff** until they succeed — they cannot fail permanently (that's an unrecoverable inconsistency). Design compensations to be idempotent (check if already reversed before acting). For truly irrecoverable compensation failures, raise an alert for **manual intervention** — the system is in a dirty state. Temporal handles retries automatically; custom sagas need a compensation retry queue.`,
        followUps: ["What is a pivot transaction?", "How do you test Saga rollback paths?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Availability: no cross-service lock required — each service commits locally.",
        "Temporal / Conductor give durable, observable, retryable workflow state.",
        "Choreography scales well — services are fully decoupled."
      ],
      cons: [
        "No isolation — dirty reads between saga steps are possible.",
        "Compensating transactions add implementation complexity.",
        "Debugging choreography sagas requires distributed tracing — event chain is implicit."
      ],
      when: `**Orchestration Saga** (Temporal) for complex multi-step workflows where observability matters. **Choreography** for simple 2-3 step flows with clear event contracts. **2PC** only within a single database that supports it.`
    }
  },

  {
    id: "ms-circuit-breaker-resilience",
    area: "microservices",
    title: "Circuit Breaker, Retry & Bulkhead Patterns",
    tag: "Resilience",
    tags: ["circuit breaker", "retry", "bulkhead", "timeout", "resilience4j", "failover"],
    concept:
`Resilience patterns prevent a failing dependency from cascading into a total outage:
- **Timeout**: never wait forever. Fail fast.
- **Retry with exponential backoff + jitter**: recover from transient failures without thundering herd.
- **Circuit Breaker**: half-open → open (stop calls) → closed (calls allowed). States tracked by failure rate / count. Prevents hammering a sick service.
- **Bulkhead**: isolate thread pools or semaphores per dependency — one slow service can't exhaust all connections.
- **Fallback**: cached result, degraded response, or queue for later.
Libraries: **Resilience4j** (Java), **Polly** (.NET), **go-circuit** (Go).`,
    why:
`In a 10-service call chain, if each service has 99.9% uptime, the composite uptime is 99% — a 10× amplification. Without circuit breakers, a slow database causes request threads to pile up behind the slow DB call, exhausting the thread pool and making the entire service unresponsive. The circuit breaker is the first line of defense.`,
    example: {
      language: "java",
      code:
`// Resilience4j: circuit breaker + retry + bulkhead + timeout
import io.github.resilience4j.circuitbreaker.*;
import io.github.resilience4j.retry.*;
import io.github.resilience4j.bulkhead.*;
import io.github.resilience4j.timelimiter.*;
import java.time.Duration;
import java.util.concurrent.*;
import java.util.function.Supplier;

public class PaymentClient {
    private final CircuitBreaker cb;
    private final Retry retry;
    private final Bulkhead bulkhead;
    private final TimeLimiter timeLimiter;
    private final ScheduledExecutorService scheduler;

    public PaymentClient() {
        cb = CircuitBreaker.of("payment", CircuitBreakerConfig.custom()
            .failureRateThreshold(50)           // open at 50% failure rate
            .waitDurationInOpenState(Duration.ofSeconds(10))
            .slidingWindowSize(10)
            .permittedNumberOfCallsInHalfOpenState(3)
            .build());

        retry = Retry.of("payment", RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(200))
            .exponentialBackoff(2, Duration.ofSeconds(1))
            .retryOnException(e -> e instanceof TransientException)
            .build());

        bulkhead = Bulkhead.of("payment", BulkheadConfig.custom()
            .maxConcurrentCalls(20)             // max parallel calls
            .maxWaitDuration(Duration.ofMillis(100))
            .build());

        timeLimiter = TimeLimiter.of(TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofMillis(500))
            .build());

        scheduler = Executors.newScheduledThreadPool(4);
    }

    public String charge(String userId, String amount) {
        Supplier<CompletableFuture<String>> futureSupplier = () ->
            CompletableFuture.supplyAsync(() -> callPaymentService(userId, amount));

        Supplier<CompletableFuture<String>> decorated =
            Bulkhead.decorateSupplier(bulkhead,
                CircuitBreaker.decorateSupplier(cb,
                    Retry.decorateSupplier(retry, futureSupplier)));

        try {
            return timeLimiter.executeFutureSupplier(decorated);
        } catch (CallNotPermittedException e) {
            return fallback(userId, amount);  // circuit open
        } catch (Exception e) {
            return fallback(userId, amount);
        }
    }

    private String callPaymentService(String userId, String amount) {
        // actual HTTP call
        return "charge-id-123";
    }

    private String fallback(String userId, String amount) {
        // queue for async retry or return cached approval
        return "PENDING";
    }
}`,
      notes: `Apply resilience decorators in the right order (outer to inner): TimeLimiter → CircuitBreaker → Retry → Bulkhead. Retry inside CircuitBreaker would reset the timeout. Add jitter to retry delays to prevent thundering herd: \`Duration.ofMillis(200 + random.nextInt(100))\`.`
    },
    interview: [
      {
        question: "What is the difference between a circuit breaker and a retry?",
        answer:
`**Retry** recovers from transient failures (brief network glitch) by re-attempting. **Circuit breaker** detects sustained failure and stops calling the service entirely, giving it time to recover. Retry without a circuit breaker can overwhelm a failing service with retried requests. Together: retry handles transient errors; circuit breaker handles sustained outages. The circuit breaker also gives callers fast failures instead of timeouts.`,
        followUps: ["What is the half-open state for?", "How do you tune circuit breaker thresholds?"]
      },
      {
        question: "What is a bulkhead and why does it matter?",
        answer:
`A **bulkhead** isolates thread pools or semaphores per dependency (named after ship watertight compartments). Without it, a slow dependency fills your single thread pool, blocking all requests — even to healthy services. With bulkheads, the slow service gets at most N threads; healthy services are unaffected. In Java, use a separate \`ExecutorService\` per dependency or Resilience4j's \`Bulkhead\`.`,
        followUps: ["Semaphore bulkhead vs thread pool bulkhead?", "How does Hystrix implement bulkheads?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Circuit breaker gives fast failure instead of connection timeout pile-up.",
        "Bulkheads limit blast radius — one bad service can't kill all traffic.",
        "Fallback enables graceful degradation — partial service beats total outage."
      ],
      cons: [
        "Misconfigured thresholds cause false positives (circuit opens on healthy service).",
        "Retry amplifies load under real failure — must limit retries and add backoff.",
        "Distributed circuit breaker state (Envoy, Redis) adds complexity."
      ],
      when: `Apply **timeout** everywhere. Apply **retry** for idempotent calls with transient errors. Apply **circuit breaker** for any synchronous call to external services. Apply **bulkhead** for shared thread pools serving multiple dependencies.`
    }
  },

  {
    id: "ms-grpc-protobuf",
    area: "microservices",
    title: "gRPC, Protocol Buffers & Service Contracts",
    tag: "gRPC",
    tags: ["grpc", "protobuf", "protocol buffers", "streaming", "http2", "idl"],
    concept:
`**gRPC** is an RPC framework using HTTP/2 transport and **Protocol Buffers** (protobuf) for serialization. Types:
- **Unary**: one request → one response (traditional RPC).
- **Server streaming**: one request → stream of responses.
- **Client streaming**: stream of requests → one response.
- **Bidirectional streaming**: both sides stream (real-time).
Protobuf is binary, schema-versioned, 3–10× smaller than JSON, and generates typed client/server code for 12+ languages. **Reflection** and **gRPC-Gateway** expose JSON/REST.`,
    why:
`For service-to-service internal APIs, gRPC gives **typed contracts** (no guessing field names), **binary efficiency** (smaller payloads), **bidirectional streaming** (real-time use cases), and **built-in load balancing** with Envoy. Schema evolution is backward-compatible by design — adding optional fields doesn't break old clients.`,
    example: {
      language: "go",
      code:
`// proto definition → generated Go code (shown as if hand-written for clarity)
// proto file:
// service OrderService {
//   rpc CreateOrder (CreateOrderRequest) returns (OrderResponse);
//   rpc WatchOrders (WatchRequest) returns (stream OrderEvent);
// }

package main

import (
    "context"
    "io"
    "log"
    "net"
    "time"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "google.golang.org/grpc/keepalive"
    pb "example.com/orders/proto"
)

// ── Server implementation ──────────────────────────────────────────────────
type orderServer struct {
    pb.UnimplementedOrderServiceServer
}

func (s *orderServer) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.OrderResponse, error) {
    if req.Quantity <= 0 {
        return nil, status.Errorf(codes.InvalidArgument, "quantity must be positive, got %d", req.Quantity)
    }
    // business logic ...
    return &pb.OrderResponse{Id: "ord-123", Status: "created"}, nil
}

// Server streaming: push order events to subscriber
func (s *orderServer) WatchOrders(req *pb.WatchRequest, stream pb.OrderService_WatchOrdersServer) error {
    ticker := time.NewTicker(time.Second)
    defer ticker.Stop()
    for {
        select {
        case <-stream.Context().Done():
            return stream.Context().Err()
        case t := <-ticker.C:
            if err := stream.Send(&pb.OrderEvent{
                OrderId: req.UserId + "-event",
                At:      t.UnixMilli(),
            }); err != nil {
                return err
            }
        }
    }
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    srv := grpc.NewServer(
        grpc.KeepaliveParams(keepalive.ServerParameters{
            MaxConnectionIdle: 15 * time.Second,
        }),
        grpc.ChainUnaryInterceptor(authInterceptor, loggingInterceptor),
    )
    pb.RegisterOrderServiceServer(srv, &orderServer{})
    log.Fatal(srv.Serve(lis))
}

func authInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
    // validate token from metadata ...
    return handler(ctx, req)
}

func loggingInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
    start := time.Now()
    resp, err := handler(ctx, req)
    log.Printf("method=%s dur=%s err=%v", info.FullMethod, time.Since(start), err)
    return resp, err
}`,
      notes: `Always use \`status.Errorf(codes.X, ...)\` to return typed gRPC errors — clients can branch on status codes. Use **interceptors** (middleware) for auth, logging, and tracing — same concept as HTTP middleware.`
    },
    interview: [
      {
        question: "How does protobuf handle schema evolution?",
        answer:
`Protobuf fields are identified by **field numbers**, not names. Rules: (1) Never reuse a field number — old clients will misinterpret new data. (2) New fields are optional by default — old clients ignore unknown fields, old servers return zero values for new fields. (3) Removing fields: mark as \`reserved\` to prevent reuse. (4) Never change a field's type. This gives backward and forward compatibility without versioning the entire API.`,
        followUps: ["What is reserved in proto3?", "How does proto3 differ from proto2?"]
      },
      {
        question: "When would you choose REST over gRPC for service-to-service calls?",
        answer:
`**REST** when: clients are browsers (gRPC-Web requires a proxy), the API is public (REST is universally toolable), you need simple cache-ability (HTTP caching on GET), or teams don't want the proto toolchain. **gRPC** when: performance matters (binary, HTTP/2 multiplexing), you need streaming, or strong typed contracts across many language teams. Internally in a microservice cluster, gRPC is almost always the better choice.`,
        followUps: ["What is gRPC-Gateway?", "How do you document gRPC APIs?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Binary protobuf: 3–10× smaller than JSON, schema-enforced.",
        "HTTP/2 multiplexing: many calls over one connection.",
        "Generated typed clients in 12+ languages from one .proto file."
      ],
      cons: [
        "Not human-readable — debugging requires grpcurl or Postman.",
        "gRPC-Web requires a proxy for browser clients.",
        "Proto toolchain adds build complexity."
      ],
      when: `**gRPC** for internal service-to-service APIs. **REST/JSON** for public APIs and browser clients. **GraphQL** for flexible client-driven queries with a single backend endpoint.`
    }
  },

  {
    id: "ms-service-discovery-lb",
    area: "microservices",
    title: "Service Discovery, Load Balancing & Health Checks",
    tag: "Discovery",
    tags: ["service discovery", "consul", "kubernetes", "load balancing", "health check", "dns"],
    concept:
`Services must find each other without hardcoded IPs. Two models:
- **Client-side discovery**: client queries a registry (Consul, Eureka) and picks an instance. Client owns load balancing logic.
- **Server-side discovery**: client calls a load balancer (ELB, Envoy, kube-proxy); LB queries registry and routes.

**Kubernetes**: services are DNS entries (\`svc.namespace.svc.cluster.local\`) backed by kube-proxy or Envoy. Pod readiness and liveness probes drive endpoint registration.
**Health checks**: liveness (should restart?), readiness (should receive traffic?), startup (still booting?).`,
    why:
`In cloud environments, pod IPs change constantly. DNS-based discovery with TTL and health checks ensures traffic only reaches healthy instances. Readiness probes are critical for zero-downtime deployments — new pods must pass readiness before old ones are terminated. Missing liveness probes cause zombie pods to silently absorb traffic.`,
    example: {
      language: "go",
      code:
`// Kubernetes-style health endpoint + graceful shutdown
package main

import (
    "context"
    "fmt"
    "net/http"
    "os/signal"
    "sync/atomic"
    "syscall"
    "time"
)

type App struct {
    ready    atomic.Bool  // true once startup is complete
    healthy  atomic.Bool  // true while DB is reachable
    db       DB
}

func (a *App) livenessHandler(w http.ResponseWriter, _ *http.Request) {
    if !a.healthy.Load() {
        w.WriteHeader(http.StatusServiceUnavailable)
        fmt.Fprintln(w, "unhealthy")
        return
    }
    fmt.Fprintln(w, "ok")
}

func (a *App) readinessHandler(w http.ResponseWriter, _ *http.Request) {
    if !a.ready.Load() {
        w.WriteHeader(http.StatusServiceUnavailable)
        fmt.Fprintln(w, "not ready")
        return
    }
    fmt.Fprintln(w, "ok")
}

func (a *App) Run() {
    mux := http.NewServeMux()
    mux.HandleFunc("/healthz", a.livenessHandler)    // liveness
    mux.HandleFunc("/readyz",  a.readinessHandler)   // readiness

    srv := &http.Server{Addr: ":8080", Handler: mux,
        ReadTimeout: 5*time.Second, WriteTimeout: 5*time.Second}

    // Background DB health check
    go func() {
        for range time.Tick(5 * time.Second) {
            a.healthy.Store(a.db.Ping() == nil)
        }
    }()

    // Startup: warm up caches, then signal ready
    a.warmup()
    a.ready.Store(true)

    // Graceful shutdown on SIGTERM (sent by k8s)
    ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM)
    defer stop()

    go srv.ListenAndServe()
    <-ctx.Done()

    a.ready.Store(false)          // stop receiving new traffic immediately
    time.Sleep(5 * time.Second)   // drain in-flight requests (k8s iptables lag)

    shutCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    srv.Shutdown(shutCtx)
}

func (a *App) warmup()  {}
type DB struct{}
func (d DB) Ping() error { return nil }`,
      notes: `In Kubernetes: set \`terminationGracePeriodSeconds\` to accommodate the drain sleep. Separate liveness and readiness — a temporarily overloaded pod should fail readiness (stops traffic) but not liveness (avoids unnecessary restart).`
    },
    interview: [
      {
        question: "What is the difference between liveness and readiness probes?",
        answer:
`**Liveness**: "is this container broken beyond self-repair?" — if it fails, Kubernetes **restarts** the pod. Use for deadlocks or unrecoverable errors. **Readiness**: "is this container ready to serve traffic?" — if it fails, the pod is **removed from the Service endpoint** (no traffic) but not restarted. Use for temporary unavailability (DB connection pool exhausted, cache warming). **Never** make readiness depend on an external service — cascading failures will bring down healthy pods.`,
        followUps: ["What is a startup probe and when is it needed?", "How does Kubernetes drain a node?"]
      },
      {
        question: "How does client-side load balancing work in gRPC with Kubernetes?",
        answer:
`Kubernetes \`Service\` round-robins at the TCP level — bad for gRPC which uses persistent HTTP/2 connections. All traffic goes to the first connected pod. Fix: use **headless service** (\`clusterIP: None\`) — DNS returns all pod IPs. gRPC client library (with service config) or Envoy sidecar does round-robin across the pod list, creating per-pod gRPC connections. Istio automates this via the sidecar proxy.`,
        followUps: ["What is connection-level vs request-level load balancing?", "How does Envoy handle gRPC health checking?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Kubernetes DNS + Service abstraction is zero-config for most use cases.",
        "Readiness probes give zero-downtime rolling deployments automatically.",
        "Health checks remove bad pods from rotation without human intervention."
      ],
      cons: [
        "DNS TTL caching can delay registration/deregistration — tune client DNS TTL.",
        "Kubernetes Service is L4 — no gRPC-level load balancing without a mesh.",
        "Flapping probes cause thundering herd of restarts under transient failures."
      ],
      when: `**Kubernetes Service + DNS** for most cases. **Headless Service + client-side LB** for gRPC. **Istio/Envoy** when you need sophisticated traffic shaping, retries, or mTLS.`
    }
  },

  {
    id: "ms-cqrs-event-sourcing",
    area: "microservices",
    title: "CQRS & Event Sourcing",
    tag: "CQRS",
    tags: ["cqrs", "event sourcing", "event store", "read model", "projection", "axon"],
    concept:
`**CQRS (Command Query Responsibility Segregation)** splits the write model (commands) from the read model (queries). Benefits: each side scales and evolves independently.
**Event Sourcing** persists domain **events** as the source of truth instead of current state. The current state is derived by replaying events. Key concepts:
- **Event Store**: append-only log of domain events (EventStoreDB, Kafka, PostgreSQL table).
- **Projection/Read Model**: materialized view rebuilt by replaying events.
- **Snapshot**: periodic state snapshot to avoid full replay on every load.
- **Command handler**: validates command → produces events → appends to store.`,
    why:
`Event sourcing gives a built-in **audit log** and **time travel** — replay events to any point in time. It enables debugging production issues by replaying events locally. Combined with CQRS, read models can be rebuilt (after bugs) or added (new features) without touching the event store. Used by trading platforms, banks, and event-heavy domains.`,
    example: {
      language: "java",
      code:
`// Event Sourcing: aggregate root pattern
import java.util.*;
import java.time.Instant;

// Events — immutable facts
sealed interface OrderEvent permits OrderPlaced, ItemAdded, OrderConfirmed, OrderCancelled {}
record OrderPlaced(String orderId, String userId, Instant at) implements OrderEvent {}
record ItemAdded(String orderId, String productId, int qty, Instant at) implements OrderEvent {}
record OrderConfirmed(String orderId, Instant at) implements OrderEvent {}
record OrderCancelled(String orderId, String reason, Instant at) implements OrderEvent {}

// Aggregate: state derived from events
class OrderAggregate {
    private String id;
    private String userId;
    private List<String> items = new ArrayList<>();
    private String status = "DRAFT";

    // Rebuild from event log
    public static OrderAggregate reconstitute(List<OrderEvent> events) {
        var agg = new OrderAggregate();
        events.forEach(agg::apply);
        return agg;
    }

    // Command handler: validate → produce events
    public List<OrderEvent> handle(ConfirmOrderCommand cmd) {
        if (!"DRAFT".equals(status))
            throw new IllegalStateException("can only confirm DRAFT orders, current: " + status);
        if (items.isEmpty())
            throw new IllegalStateException("cannot confirm empty order");
        return List.of(new OrderConfirmed(id, Instant.now()));
    }

    // Event applier: pure state mutation — no side effects
    private void apply(OrderEvent event) {
        switch (event) {
            case OrderPlaced(var oid, var uid, var at) -> { id = oid; userId = uid; status = "DRAFT"; }
            case ItemAdded(_, var pid, var qty, _)     -> items.add(pid + "x" + qty);
            case OrderConfirmed(_, _)                  -> status = "CONFIRMED";
            case OrderCancelled(_, _, _)               -> status = "CANCELLED";
        }
    }

    public String getStatus() { return status; }
}

// Read model projection — rebuilt by consuming the event stream
class OrderSummaryProjection {
    private final Map<String, OrderSummary> store = new HashMap<>();

    public void on(OrderPlaced e) { store.put(e.orderId(), new OrderSummary(e.orderId(), e.userId(), "DRAFT", 0)); }
    public void on(OrderConfirmed e) { store.get(e.orderId()).status = "CONFIRMED"; }
    public OrderSummary get(String id) { return store.get(id); }
}

record OrderSummary(String id, String userId, String status, int itemCount) {
    String status; { } // mutable for projection
    OrderSummary(String id, String userId, String status, int itemCount) {
        this.id = id; this.userId = userId; this.status = status; this.itemCount = itemCount;
    }
}

record ConfirmOrderCommand(String orderId) {}`,
      notes: `The **apply** method must be a pure function — no side effects, no I/O. Side effects (emails, external calls) happen in event handlers *after* the events are persisted. This is critical for correct replay behaviour.`
    },
    interview: [
      {
        question: "What are the downsides of event sourcing?",
        answer:
`(1) **Query complexity**: you can't query "all orders over $100" directly — needs a read model. (2) **Schema evolution**: changing past event structures requires migration or versioning strategy (upcasters). (3) **Eventual consistency** between event store and read models. (4) **Learning curve**: most teams and frameworks are built around current-state CRUD. Use event sourcing only when the audit log, time travel, or event-driven integration benefits outweigh the complexity.`,
        followUps: ["What is an upcaster in event sourcing?", "How do you handle event versioning?"]
      },
      {
        question: "How do you handle aggregate growth in event sourcing?",
        answer:
`Long-lived aggregates accumulate thousands of events — replaying all is slow. Solution: **snapshots** — persist the aggregate state at event N, store the snapshot, then replay only events after N on next load. Snapshot frequency is a tunable (every 100 events, or daily). The snapshot is a cache — the event log remains authoritative.`,
        followUps: ["How do you invalidate a snapshot?", "Snapshot storage format?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Full audit log built in — zero extra work for compliance.",
        "Rebuild any read model from scratch by replaying events.",
        "Time travel: load aggregate state at any past point."
      ],
      cons: [
        "Eventual consistency between write and read sides.",
        "Queries require read models — no ad-hoc SQL on entity state.",
        "Event schema evolution (upcasters) adds maintenance burden."
      ],
      when: `**Event Sourcing** for audit-heavy domains (finance, healthcare, e-commerce order management). **CQRS** without event sourcing when read/write scalability differs but audit trail isn't needed. Traditional CRUD for most CRUD services.`
    }
  },

  {
    id: "ms-kubernetes-deployment",
    area: "microservices",
    title: "Kubernetes: Deployments, Resources & Scaling",
    tag: "Kubernetes",
    tags: ["kubernetes", "deployment", "hpa", "resources", "pod", "rolling update"],
    concept:
`Key Kubernetes primitives for production services:
- **Deployment**: declarative pod spec + replica count + rolling update strategy.
- **Resources**: \`requests\` (scheduler uses for placement) and \`limits\` (enforced — OOMKill if memory exceeded, CPU throttled).
- **HPA (Horizontal Pod Autoscaler)**: scales replicas based on CPU, memory, or custom metrics (KEDA for Kafka lag).
- **PodDisruptionBudget (PDB)**: minimum available pods during node drain.
- **ConfigMap / Secret**: externalize config from image.
- **Topology spread constraints**: spread pods across zones for HA.`,
    why:
`Mis-set resource requests cause the scheduler to over-pack nodes → OOMKills cascade. Under-set CPU limits cause noisy neighbor throttling. No PDB means rolling node drains take down too many pods simultaneously. Zero-downtime deployments require correct readiness probes AND correct \`terminationGracePeriodSeconds\`.`,
    example: {
      language: "go",
      code:
`# Kubernetes Deployment — production-grade (YAML shown in Go comment for syntax highlighting)
# apiVersion: apps/v1
# kind: Deployment
# metadata:
#   name: order-service
# spec:
#   replicas: 3
#   strategy:
#     type: RollingUpdate
#     rollingUpdate:
#       maxSurge: 1          # one extra pod during rollout
#       maxUnavailable: 0    # never reduce below desired
#   selector:
#     matchLabels:
#       app: order-service
#   template:
#     spec:
#       topologySpreadConstraints:
#       - maxSkew: 1
#         topologyKey: topology.kubernetes.io/zone
#         whenUnsatisfiable: DoNotSchedule
#       containers:
#       - name: app
#         image: order-service:v2.1.0
#         ports:
#         - containerPort: 8080
#         resources:
#           requests:
#             cpu: "250m"
#             memory: "256Mi"
#           limits:
#             cpu: "1"
#             memory: "512Mi"
#         readinessProbe:
#           httpGet:
#             path: /readyz
#             port: 8080
#           initialDelaySeconds: 5
#           periodSeconds: 5
#           failureThreshold: 3
#         livenessProbe:
#           httpGet:
#             path: /healthz
#             port: 8080
#           initialDelaySeconds: 15
#           periodSeconds: 10
#         env:
#         - name: DB_PASSWORD
#           valueFrom:
#             secretKeyRef:
#               name: order-db-secret
#               key: password
# ---
# kind: HorizontalPodAutoscaler
# spec:
#   minReplicas: 3
#   maxReplicas: 20
#   metrics:
#   - type: Resource
#     resource:
#       name: cpu
#       target:
#         type: Utilization
#         averageUtilization: 60
# ---
# kind: PodDisruptionBudget
# spec:
#   minAvailable: 2
#   selector:
#     matchLabels:
#       app: order-service

// Go app: read config from env (12-factor)
package main

import (
    "fmt"
    "os"
)

func main() {
    dbPassword := os.Getenv("DB_PASSWORD")   // injected via Secret
    fmt.Println("connecting with password len:", len(dbPassword))
}`,
      notes: `Set **requests = expected steady-state usage** and **limits = peak burst**. Never set CPU limit too low — JVM and GC need burst CPU at startup. Use \`kubectl top pods\` and VPA (Vertical Pod Autoscaler) recommendations to right-size.`
    },
    interview: [
      {
        question: "What happens when a pod exceeds its memory limit?",
        answer:
`The Linux kernel OOMKills the container — the pod is restarted (RestartPolicy). This is different from CPU: CPU throttling just slows the process, memory over-limit causes a hard kill. Symptoms: repeated \`OOMKilled\` in \`kubectl describe pod\`. Fix: increase the memory limit, find the memory leak, or use a streaming approach instead of loading data in memory.`,
        followUps: ["What is eviction vs OOMKill?", "How does the kubelet eviction manager work?"]
      },
      {
        question: "How do you achieve zero-downtime deployments in Kubernetes?",
        answer:
`Five requirements: (1) Readiness probe configured correctly — new pods only get traffic when ready. (2) \`maxUnavailable: 0\` in rolling update strategy. (3) Graceful shutdown in the app — handle SIGTERM, drain in-flight requests. (4) \`terminationGracePeriodSeconds\` > drain time. (5) PDB \`minAvailable\` ensures minimum running during node drains. All five must be in place — missing any one causes downtime.`,
        followUps: ["What is preStop hook and when do you need it?", "How does Kubernetes handle SIGTERM → SIGKILL?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Declarative desired state — Kubernetes reconciles continuously.",
        "HPA scales automatically on real load metrics.",
        "Topology spread + PDB gives multi-zone HA with minimal config."
      ],
      cons: [
        "Resource right-sizing requires profiling — wrong values cause OOMKills or wasted cost.",
        "Rolling updates with stateful services (DBs) require extra care.",
        "HPA reacts slowly to sudden traffic spikes — pre-scale or use KEDA."
      ],
      when: `**Kubernetes Deployment** for all stateless services. **StatefulSet** for stateful workloads (Kafka, Redis). **DaemonSet** for node-level agents (log shippers, metrics collectors). Use **KEDA** for event-driven autoscaling (Kafka consumer lag, queue depth).`
    }
  },

  {
    id: "ms-idempotency-outbox-inbox",
    area: "microservices",
    title: "Idempotency Keys, Outbox & Inbox Patterns",
    tag: "Reliability",
    tags: ["idempotency", "outbox", "inbox", "dedupe", "at least once", "fastapi", "postgres"],
    concept:
`Distributed systems retry constantly: browsers retry, gateways retry, clients retry on timeouts, Kafka redelivers after crashes, and jobs rerun after deploys. **Idempotency** makes repeated attempts produce the same business result.

Core patterns:
- **Idempotency key**: client supplies a unique key per intent, such as checkout-123. The server stores the final response for that key and returns it on retries.
- **Transactional outbox**: write the business row and the event row in one database transaction; a relay publishes later.
- **Inbox / processed message table**: consumers record event IDs before side effects so redelivery does not duplicate work.
- **Natural unique constraints**: enforce business uniqueness at the database boundary, not only in application memory.
- **TTL and replay policy**: keys cannot live forever; choose retention based on retry windows, refunds, and audit needs.`,
    why:
`"Exactly once" is usually an interface promise built from **at-least-once delivery plus idempotent handlers**. Without idempotency, a timeout after a successful payment can lead the client to retry and charge twice. Without outbox, an order can commit but its event can be lost. Without inbox, one Kafka redelivery can reserve stock twice. These are the production bugs that make microservices painful during incidents.`,
    example: {
      language: "python",
      code:
`# FastAPI + PostgreSQL pattern: idempotent command + transactional outbox
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

class CreateOrder(BaseModel):
    user_id: str
    sku: str
    quantity: int

async def get_session() -> AsyncSession:
    ...

@app.post("/orders", status_code=201)
async def create_order(
    cmd: CreateOrder,
    idempotency_key: str = Header(alias="Idempotency-Key")
):
    if not idempotency_key or len(idempotency_key) < 12:
        raise HTTPException(400, "missing or weak Idempotency-Key")

    session = await get_session()
    async with session.begin():
        # Try to reserve the key. Unique(client_key) prevents duplicate work.
        inserted = await session.execute(text("""
            insert into idempotency_keys(client_key, status, expires_at)
            values (:key, 'PROCESSING', :expires_at)
            on conflict (client_key) do nothing
            returning client_key
        """), {
            "key": idempotency_key,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        })

        if inserted.first() is None:
            # Lock existing key so concurrent retries serialize behind the winner.
            existing = await session.execute(text("""
                select status, status_code, response_json
                from idempotency_keys
                where client_key = :key
                for update
            """), {"key": idempotency_key})
            row = existing.mappings().one()
            if row["status"] == "SUCCEEDED":
                return row["response_json"]
            raise HTTPException(409, "request with this key is still processing")

        order_id = str(uuid4())
        await session.execute(text("""
            insert into orders(id, user_id, sku, quantity, status)
            values (:id, :user_id, :sku, :quantity, 'CREATED')
        """), {**cmd.model_dump(), "id": order_id})

        event_id = str(uuid4())
        await session.execute(text("""
            insert into outbox_events(id, aggregate_id, type, payload_json)
            values (:event_id, :order_id, 'ORDER_CREATED', jsonb_build_object(
                'event_id', :event_id,
                'order_id', :order_id,
                'sku', :sku,
                'quantity', :quantity
            ))
        """), {
            "event_id": event_id,
            "order_id": order_id,
            "sku": cmd.sku,
            "quantity": cmd.quantity,
        })

        response = {"order_id": order_id, "status": "CREATED"}
        await session.execute(text("""
            update idempotency_keys
            set status = 'SUCCEEDED', status_code = 201, response_json = :response
            where client_key = :key
        """), {"key": idempotency_key, "response": response})
        return response

async def relay_outbox_once(session: AsyncSession, producer):
    # skip locked lets multiple relay workers share work without double publishing.
    rows = await session.execute(text("""
        select id, aggregate_id, type, payload_json
        from outbox_events
        where published_at is null
        order by created_at
        limit 100
        for update skip locked
    """))
    for event in rows.mappings():
        await producer.send("orders.events", key=event["aggregate_id"], value=event["payload_json"])
        await session.execute(text("""
            update outbox_events set published_at = now() where id = :id
        """), {"id": event["id"]})

async def consume_inventory_event(session: AsyncSession, event):
    async with session.begin():
        inserted = await session.execute(text("""
            insert into inbox_messages(event_id, consumer_name)
            values (:event_id, 'inventory-service')
            on conflict do nothing
            returning event_id
        """), {"event_id": event["event_id"]})
        if inserted.first() is None:
            return  # already processed this delivery

        await session.execute(text("""
            update stock
            set reserved = reserved + :quantity
            where sku = :sku and available - reserved >= :quantity
        """), event)`,
      notes: `Create these constraints: \`unique(idempotency_keys.client_key)\`, \`unique(outbox_events.id)\`, and \`unique(inbox_messages.event_id, inbox_messages.consumer_name)\`. For payments, the idempotency key must also be sent to the payment provider so your boundary and the external provider share the same retry identity.`
    },
    interview: [
      {
        question: "Is idempotency the same as exactly-once processing?",
        answer:
`No. Idempotency means repeated execution has the same externally visible result. Exactly-once is a stronger end-to-end claim and is rarely available across HTTP, databases, message brokers, and third-party APIs together. In practice, production systems use at-least-once delivery, durable dedupe records, unique constraints, and idempotent side effects to make retries safe.`,
        followUps: ["Where should the idempotency key be generated?", "How long should keys be retained?"]
      },
      {
        question: "What happens if the outbox relay publishes to Kafka but crashes before marking the row sent?",
        answer:
`The relay will publish the same event again after restart. That is expected. The event must have a stable event ID, and every consumer must dedupe through an inbox table or idempotent upsert. Outbox gives no-lost-events; inbox/idempotent consumers handle duplicate-events.`,
        followUps: ["How do you monitor stuck outbox rows?", "When is Debezium better than polling?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Turns retry-heavy HTTP and message flows into safe repeated operations.",
        "Outbox removes the dual-write gap between database commits and broker publishes.",
        "Inbox tables make at-least-once brokers practical for business side effects."
      ],
      cons: [
        "Adds tables, cleanup jobs, and careful transaction boundaries.",
        "Long idempotency retention increases storage and privacy obligations.",
        "Returning cached responses can hide changed downstream state if keys are reused incorrectly."
      ],
      when: `Use for **payments, checkout, provisioning, inventory, email sends, external API calls, and Kafka consumers**. Skip only for naturally read-only operations or commands that are already protected by a strong unique business key.`
    }
  },

  {
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
  }
];

(function attachMicroserviceFlows() {
  const flows = {
    "ms-api-gateway": {
      title: "Gateway request path",
      caption: "Edge concerns are handled before domain service code runs.",
      nodes: [
        { id: "client", label: "Client", hint: "web/mobile" },
        { id: "gateway", label: "API Gateway", hint: "TLS + entry" },
        { id: "auth", label: "Auth", hint: "JWT/OAuth2" },
        { id: "limit", label: "Rate Limit", hint: "token bucket" },
        { id: "router", label: "Router", hint: "path/host rules" },
        { id: "service", label: "Service", hint: "business API" },
        { id: "trace", label: "Telemetry", hint: "logs/traces" }
      ],
      steps: [
        { path: ["client", "gateway"], label: "Request enters the edge", detail: "The client sends HTTPS traffic to one public entry point instead of discovering every service." },
        { path: ["gateway", "auth"], label: "Token is validated once", detail: "The gateway verifies signature, expiry, scopes, tenant, and forwards identity as trusted headers." },
        { path: ["auth", "limit"], label: "Abuse is stopped early", detail: "A rate limiter rejects noisy clients before they consume downstream threads or database connections." },
        { path: ["limit", "router"], label: "Route is selected", detail: "Host, path, method, headers, or canary weights choose the right upstream service instance." },
        { path: ["router", "service"], label: "Service receives a clean request", detail: "The service focuses on domain logic while the edge owns cross-cutting concerns." },
        { path: ["service", "trace"], label: "Telemetry is stitched", detail: "Trace IDs, access logs, and latency metrics make the north-south request observable end to end." }
      ]
    },
    "ms-kafka-event-driven": {
      title: "Event-driven write path",
      caption: "The durable log decouples producers from every downstream consumer.",
      nodes: [
        { id: "producer", label: "Producer", hint: "order API" },
        { id: "outbox", label: "Outbox", hint: "same DB tx" },
        { id: "broker", label: "Kafka Broker", hint: "commit log" },
        { id: "partition", label: "Partition", hint: "ordered key" },
        { id: "consumer", label: "Consumer Group", hint: "parallel readers" },
        { id: "handler", label: "Handler", hint: "idempotent" },
        { id: "store", label: "State Store", hint: "read model" },
        { id: "dlq", label: "DLQ", hint: "fatal events" }
      ],
      steps: [
        { path: ["producer", "outbox"], label: "Write event with the business row", detail: "The outbox removes the dual-write gap between the database commit and Kafka publish." },
        { path: ["outbox", "broker"], label: "Relay publishes safely", detail: "A relay reads pending rows, publishes to Kafka, and marks them sent with retryable semantics." },
        { path: ["broker", "partition"], label: "Key chooses ordering lane", detail: "All events for one aggregate use the same key, so Kafka preserves their order inside one partition." },
        { path: ["partition", "consumer"], label: "Group scales work", detail: "Kafka assigns each partition to one consumer in the group; adding consumers increases throughput up to partition count." },
        { path: ["consumer", "handler"], label: "Handler processes idempotently", detail: "The consumer commits offsets only after side effects succeed, so retries do not corrupt state." },
        { path: ["handler", "store"], label: "Projection is updated", detail: "Read models, caches, search indexes, or analytics tables catch up asynchronously." },
        { path: ["handler", "store", "dlq"], label: "Bad events are isolated", detail: "Fatal messages go to a dead-letter topic with enough context for replay after a fix." }
      ]
    },
    "ms-saga-distributed-tx": {
      title: "Saga orchestration path",
      caption: "Local transactions move forward; compensations repair completed steps on failure.",
      nodes: [
        { id: "api", label: "Order API", hint: "create request" },
        { id: "saga", label: "Orchestrator", hint: "durable state" },
        { id: "inventory", label: "Inventory", hint: "reserve" },
        { id: "payment", label: "Payment", hint: "charge" },
        { id: "shipping", label: "Shipping", hint: "fulfill" },
        { id: "compensation", label: "Compensation", hint: "undo safely" }
      ],
      steps: [
        { path: ["api", "saga"], label: "Workflow starts", detail: "The API records intent and hands control to a durable saga instead of holding a distributed lock." },
        { path: ["saga", "inventory"], label: "Inventory reserves locally", detail: "Inventory commits its own database transaction and returns a reservation ID for possible cancellation." },
        { path: ["inventory", "payment"], label: "Payment charges after reserve", detail: "The next local transaction runs only after the previous one has a retryable, durable result." },
        { path: ["payment", "shipping"], label: "Success path continues", detail: "When payment succeeds, the saga can confirm the order and create the shipping task." },
        { path: ["payment", "compensation"], label: "Failure path compensates", detail: "If payment or shipping fails, completed steps are undone in reverse order with idempotent commands." },
        { path: ["saga", "compensation"], label: "Retries stay visible", detail: "The orchestrator persists retries, backoff, and manual-intervention state instead of losing the workflow on crash." }
      ]
    },
    "ms-circuit-breaker-resilience": {
      title: "Resilient synchronous call",
      caption: "Every outbound dependency call gets a timeout, isolation, retry policy, and fallback.",
      nodes: [
        { id: "caller", label: "Caller", hint: "request thread" },
        { id: "timeout", label: "Timeout", hint: "budget" },
        { id: "circuit", label: "Circuit", hint: "fail fast" },
        { id: "retry", label: "Retry", hint: "backoff+jitter" },
        { id: "bulkhead", label: "Bulkhead", hint: "isolation" },
        { id: "dependency", label: "Dependency", hint: "remote service" },
        { id: "fallback", label: "Fallback", hint: "degraded mode" }
      ],
      steps: [
        { path: ["caller", "timeout"], label: "Set a time budget", detail: "The caller decides how long the dependency is allowed to spend before the user-facing SLO is at risk." },
        { path: ["timeout", "circuit"], label: "Circuit checks health", detail: "If recent failures crossed the threshold, the call fails immediately instead of waiting for another timeout." },
        { path: ["circuit", "retry"], label: "Retry only transient failures", detail: "Backoff and jitter absorb short blips without creating a synchronized traffic spike." },
        { path: ["retry", "bulkhead"], label: "Bulkhead limits concurrency", detail: "The remote dependency gets a bounded pool or semaphore so it cannot exhaust the whole service." },
        { path: ["bulkhead", "dependency"], label: "Dependency call executes", detail: "Healthy calls pass through; failures feed metrics back into retry and circuit-breaker decisions." },
        { path: ["dependency", "fallback"], label: "Fallback protects the user journey", detail: "On sustained failure, return cached, partial, or queued work instead of taking the whole request down." }
      ]
    },
    "ms-grpc-protobuf": {
      title: "gRPC service contract flow",
      caption: "A typed proto contract drives generated clients, HTTP/2 calls, and status-aware errors.",
      nodes: [
        { id: "proto", label: ".proto Contract", hint: "IDL" },
        { id: "stub", label: "Client Stub", hint: "generated" },
        { id: "http2", label: "HTTP/2", hint: "multiplexed" },
        { id: "interceptor", label: "Interceptor", hint: "auth/trace" },
        { id: "service", label: "Service Impl", hint: "handler" },
        { id: "stream", label: "Stream", hint: "optional" },
        { id: "status", label: "Status Code", hint: "typed error" }
      ],
      steps: [
        { path: ["proto", "stub"], label: "Generate typed clients", detail: "The proto file creates language-native request and response types for every team." },
        { path: ["stub", "http2"], label: "Call travels over HTTP/2", detail: "Binary protobuf frames share one multiplexed connection with flow control and keepalive." },
        { path: ["http2", "interceptor"], label: "Cross-cutting logic runs", detail: "Interceptors attach auth, deadlines, trace context, metrics, and logging around the handler." },
        { path: ["interceptor", "service"], label: "Handler executes domain logic", detail: "The server receives a typed message and returns either a typed response or a typed status error." },
        { path: ["service", "stream"], label: "Streaming keeps the pipe open", detail: "For watch or realtime flows, either side can send multiple messages under the same RPC." },
        { path: ["service", "status"], label: "Errors stay machine-readable", detail: "Clients branch on codes like INVALID_ARGUMENT, UNAVAILABLE, or DEADLINE_EXCEEDED instead of parsing text." }
      ]
    },
    "ms-service-discovery-lb": {
      title: "Discovery and readiness flow",
      caption: "Traffic follows healthy endpoints; deployment lifecycle controls when pods join or leave.",
      nodes: [
        { id: "client", label: "Client", hint: "service caller" },
        { id: "dns", label: "DNS Name", hint: "stable address" },
        { id: "service", label: "Service/LB", hint: "virtual IP" },
        { id: "endpoints", label: "Endpoints", hint: "healthy pods" },
        { id: "pod", label: "Pod", hint: "instance" },
        { id: "readiness", label: "Readiness", hint: "traffic gate" },
        { id: "drain", label: "Graceful Drain", hint: "SIGTERM" }
      ],
      steps: [
        { path: ["client", "dns"], label: "Caller uses a stable name", detail: "The client never pins pod IPs; it resolves a service DNS name or calls a sidecar/load balancer." },
        { path: ["dns", "service"], label: "Service owns virtual routing", detail: "Kubernetes, Envoy, or an external load balancer maps the stable address to current endpoints." },
        { path: ["service", "endpoints"], label: "Only ready endpoints receive traffic", detail: "Endpoint lists are continuously updated from health and readiness state." },
        { path: ["endpoints", "pod"], label: "Request lands on one pod", detail: "The load balancer picks an instance according to its algorithm and connection state." },
        { path: ["pod", "readiness"], label: "Readiness changes membership", detail: "A pod fails readiness while starting, overloaded, or draining, so it stops receiving new traffic." },
        { path: ["readiness", "drain"], label: "Shutdown drains in-flight work", detail: "On SIGTERM the pod flips readiness, finishes active requests, then exits before the grace period ends." }
      ]
    },
    "ms-cqrs-event-sourcing": {
      title: "CQRS and event-sourcing loop",
      caption: "Commands append facts; projections build query-optimized views.",
      nodes: [
        { id: "command", label: "Command API", hint: "write model" },
        { id: "aggregate", label: "Aggregate", hint: "invariants" },
        { id: "eventstore", label: "Event Store", hint: "append only" },
        { id: "bus", label: "Event Bus", hint: "fan out" },
        { id: "projection", label: "Projection", hint: "consumer" },
        { id: "readmodel", label: "Read Model", hint: "query table" },
        { id: "query", label: "Query API", hint: "fast reads" }
      ],
      steps: [
        { path: ["command", "aggregate"], label: "Command checks invariants", detail: "The write model validates business rules and decides which domain events should exist." },
        { path: ["aggregate", "eventstore"], label: "Facts are appended", detail: "State changes are stored as immutable events, not overwritten rows." },
        { path: ["eventstore", "bus"], label: "Events fan out", detail: "Consumers subscribe independently without forcing the command path to wait for every read model." },
        { path: ["bus", "projection"], label: "Projection consumes in order", detail: "A projector applies events idempotently and tracks offsets so it can resume after failure." },
        { path: ["projection", "readmodel"], label: "Read model is shaped for queries", detail: "The read side denormalizes data for screens, search, analytics, or reporting." },
        { path: ["readmodel", "query"], label: "Queries stay simple and fast", detail: "The query API reads precomputed views while callers accept eventual consistency." }
      ]
    },
    "ms-kubernetes-deployment": {
      title: "Kubernetes rollout and scaling path",
      caption: "Declarative desired state becomes pods, traffic, autoscaling, and disruption protection.",
      nodes: [
        { id: "manifest", label: "Manifest", hint: "desired state" },
        { id: "deployment", label: "Deployment", hint: "rollout" },
        { id: "replicaset", label: "ReplicaSet", hint: "replicas" },
        { id: "pod", label: "Pod", hint: "container" },
        { id: "service", label: "Service", hint: "traffic" },
        { id: "hpa", label: "HPA", hint: "scale signal" },
        { id: "pdb", label: "PDB", hint: "availability" }
      ],
      steps: [
        { path: ["manifest", "deployment"], label: "Apply desired state", detail: "The API server stores the deployment spec and controllers reconcile actual cluster state toward it." },
        { path: ["deployment", "replicaset"], label: "Rollout creates ReplicaSets", detail: "New versions get new ReplicaSets while rolling-update settings control surge and unavailable pods." },
        { path: ["replicaset", "pod"], label: "Pods start with resources", detail: "Requests, limits, probes, config, and secrets shape how each container is scheduled and run." },
        { path: ["pod", "service"], label: "Ready pods receive traffic", detail: "The Service sends traffic only to endpoints that pass readiness." },
        { path: ["service", "hpa"], label: "Autoscaler watches demand", detail: "CPU, memory, queue depth, or custom metrics adjust replica count inside safe bounds." },
        { path: ["hpa", "pdb"], label: "Availability is protected", detail: "A PodDisruptionBudget keeps enough replicas running during voluntary node drains and maintenance." }
      ]
    },
    "ms-idempotency-outbox-inbox": {
      title: "Retry-safe command path",
      caption: "A command can be repeated without duplicate business side effects.",
      nodes: [
        { id: "client", label: "Client", hint: "retrying caller" },
        { id: "key", label: "Idempotency Key", hint: "intent identity" },
        { id: "command", label: "Command Handler", hint: "FastAPI/Spring" },
        { id: "db", label: "Database Tx", hint: "atomic write" },
        { id: "outbox", label: "Outbox", hint: "pending event" },
        { id: "relay", label: "Relay", hint: "publishes" },
        { id: "broker", label: "Broker", hint: "at least once" },
        { id: "inbox", label: "Inbox", hint: "consumer dedupe" }
      ],
      steps: [
        { path: ["client", "key"], label: "Caller names the intent", detail: "Every retry carries the same key, so the server can distinguish duplicate attempts from new business commands." },
        { path: ["key", "command"], label: "Handler reserves the key", detail: "A unique constraint lets one request become the winner while concurrent retries wait or receive the stored result." },
        { path: ["command", "db"], label: "Business row commits once", detail: "The order, payment request, or provisioning command is protected by database uniqueness." },
        { path: ["db", "outbox"], label: "Event is stored atomically", detail: "The event row commits in the same transaction as the business change, removing the dual-write gap." },
        { path: ["outbox", "relay"], label: "Relay publishes later", detail: "A background worker can crash and retry without losing the fact that the event must be published." },
        { path: ["relay", "broker"], label: "Broker may redeliver", detail: "At-least-once delivery is accepted; duplicates are part of the contract." },
        { path: ["broker", "inbox"], label: "Consumer dedupes before side effects", detail: "An inbox table or idempotent upsert prevents duplicate stock reservation, email, charge, or shipment work." }
      ]
    },
    "ms-service-mesh-observability": {
      title: "Mesh-controlled east-west traffic",
      caption: "Workload identity, policy, retries, and telemetry wrap service calls.",
      nodes: [
        { id: "caller", label: "Caller Service", hint: "business code" },
        { id: "sidecar-a", label: "Local Proxy", hint: "Envoy" },
        { id: "policy", label: "Control Plane", hint: "xDS/policy" },
        { id: "mtls", label: "mTLS", hint: "identity" },
        { id: "sidecar-b", label: "Remote Proxy", hint: "Envoy" },
        { id: "service", label: "Target Service", hint: "handler" },
        { id: "telemetry", label: "Telemetry", hint: "metrics/traces" }
      ],
      steps: [
        { path: ["caller", "sidecar-a"], label: "Application calls a service name", detail: "The app issues a normal HTTP/gRPC call while the proxy owns transport policy." },
        { path: ["sidecar-a", "policy"], label: "Proxy receives config", detail: "The control plane distributes routes, certificates, retry policy, and authorization rules." },
        { path: ["sidecar-a", "mtls"], label: "Identity is proven", detail: "mTLS uses workload certificates so services authenticate each other before application code runs." },
        { path: ["mtls", "sidecar-b"], label: "Traffic reaches the target proxy", detail: "The remote proxy enforces inbound policy and records request-level telemetry." },
        { path: ["sidecar-b", "service"], label: "Target handler executes", detail: "Business code stays focused on domain behavior, not connection security or rollout mechanics." },
        { path: ["service", "telemetry"], label: "Observability is emitted", detail: "Metrics, traces, and access logs connect the two services into an inspectable graph." }
      ]
    }
  };

  const umls = {
    "ms-api-gateway": {
      title: "UML: gateway protects an order lookup",
      scenario: "Example: a browser calls GET /orders/42 through one edge entry point.",
      actors: [
        { id: "browser", label: "Browser", hint: "web client" },
        { id: "gateway", label: "Gateway", hint: "edge proxy" },
        { id: "auth", label: "Auth", hint: "JWT/JWKS" },
        { id: "limit", label: "Rate Limit", hint: "Redis bucket" },
        { id: "orders", label: "Order Service", hint: "REST/gRPC" },
        { id: "db", label: "Orders DB", hint: "private" },
        { id: "otel", label: "Telemetry", hint: "trace/log" }
      ],
      messages: [
        { from: "browser", to: "gateway", label: "GET /orders/42", detail: "The public client only knows the gateway URL, not private service addresses." },
        { from: "gateway", to: "auth", label: "Validate bearer token", detail: "The gateway validates signature, expiry, scopes, and tenant before routing." },
        { from: "auth", to: "gateway", label: "Principal + scopes", detail: "Identity is returned as trusted claims; downstream services can still enforce domain authorization." },
        { from: "gateway", to: "limit", label: "Consume token", detail: "Rate limiting happens before the request burns service threads or database connections." },
        { from: "gateway", to: "orders", label: "Forward with trace id", detail: "The gateway injects client id, trace id, and normalized headers." },
        { from: "orders", to: "db", label: "Load order", detail: "The service owns business logic and persistence; gateway stays infrastructure-only." },
        { from: "orders", to: "otel", label: "Emit span + logs", type: "async", detail: "Trace and log correlation make the request visible across layers." },
        { from: "gateway", to: "browser", label: "200 order JSON", detail: "The gateway returns the response, often adding cache, security, and correlation headers." }
      ]
    },
    "ms-kafka-event-driven": {
      title: "UML: order-created event pipeline",
      scenario: "Example: checkout writes an order, publishes an event, and updates inventory asynchronously.",
      actors: [
        { id: "api", label: "Order API", hint: "producer" },
        { id: "ordersdb", label: "Orders DB", hint: "outbox row" },
        { id: "relay", label: "Outbox Relay", hint: "publisher" },
        { id: "kafka", label: "Kafka", hint: "orders.events" },
        { id: "inventory", label: "Inventory Consumer", hint: "group member" },
        { id: "invdb", label: "Inventory DB", hint: "projection" },
        { id: "dlq", label: "DLQ", hint: "poison event" },
        { id: "metrics", label: "Metrics", hint: "lag/offset" }
      ],
      messages: [
        { from: "api", to: "ordersdb", label: "TX: order + outbox", detail: "The order row and outbox event commit atomically in the same database transaction." },
        { from: "relay", to: "ordersdb", label: "Poll unsent events", detail: "The relay reads pending outbox rows and can safely retry after crashes." },
        { from: "relay", to: "kafka", label: "Publish ORDER_CREATED", type: "async", detail: "The event is keyed by order id or customer id so ordering is stable where it matters." },
        { from: "kafka", to: "inventory", label: "Deliver partition record", type: "async", detail: "A partition is assigned to one consumer in the group, giving parallelism without duplicate processing." },
        { from: "inventory", to: "invdb", label: "Reserve stock idempotently", detail: "The consumer stores processed event ids or uses natural keys so retries are harmless." },
        { from: "inventory", to: "kafka", label: "Commit offset", detail: "Offsets are committed after the side effect succeeds, giving at-least-once processing." },
        { from: "inventory", to: "dlq", label: "Send fatal message", type: "async", detail: "Validation or schema poison pills move to DLQ with context instead of blocking the partition forever." },
        { from: "inventory", to: "metrics", label: "Report lag", type: "async", detail: "Lag, retry count, and DLQ count tell you whether consumers are keeping up." }
      ]
    },
    "ms-saga-distributed-tx": {
      title: "UML: checkout saga with compensation",
      scenario: "Example: create order, reserve inventory, charge payment, then compensate on failure.",
      actors: [
        { id: "client", label: "Client", hint: "checkout" },
        { id: "orderapi", label: "Order API", hint: "command" },
        { id: "saga", label: "Saga Engine", hint: "Temporal" },
        { id: "inventory", label: "Inventory", hint: "reserve/cancel" },
        { id: "payment", label: "Payment", hint: "charge/refund" },
        { id: "shipping", label: "Shipping", hint: "fulfill" },
        { id: "notify", label: "Notify", hint: "email/event" }
      ],
      messages: [
        { from: "client", to: "orderapi", label: "POST /checkout", detail: "The client receives a fast accepted response while the durable workflow completes." },
        { from: "orderapi", to: "saga", label: "Start OrderSaga", detail: "The saga id becomes the idempotency key for every downstream command." },
        { from: "saga", to: "inventory", label: "Reserve items", detail: "Inventory commits a local transaction and returns a reservation id." },
        { from: "saga", to: "payment", label: "Charge card", detail: "Payment commits separately; this avoids distributed locks across databases." },
        { from: "saga", to: "shipping", label: "Create shipment", detail: "On the happy path, the saga advances once each local transaction succeeds." },
        { from: "shipping", to: "saga", label: "Shipment failed", detail: "A failed downstream step makes intermediate state visible until compensation finishes." },
        { from: "saga", to: "payment", label: "Refund charge", detail: "Compensation runs in reverse order and must be safe to retry." },
        { from: "saga", to: "inventory", label: "Cancel reservation", detail: "The reservation is released even if the saga worker crashes and resumes later." },
        { from: "saga", to: "notify", label: "Publish final state", type: "async", detail: "Users and support see ORDER_FAILED or ORDER_CONFIRMED as the workflow result." }
      ]
    },
    "ms-circuit-breaker-resilience": {
      title: "UML: protected payment dependency call",
      scenario: "Example: order service calls payment without letting payment latency take down checkout.",
      actors: [
        { id: "order", label: "Order Service", hint: "caller" },
        { id: "timeout", label: "TimeLimiter", hint: "500 ms" },
        { id: "circuit", label: "CircuitBreaker", hint: "failure rate" },
        { id: "retry", label: "Retry", hint: "jitter" },
        { id: "bulkhead", label: "Bulkhead", hint: "20 calls" },
        { id: "payment", label: "Payment API", hint: "remote" },
        { id: "fallback", label: "Fallback Queue", hint: "degraded" }
      ],
      messages: [
        { from: "order", to: "timeout", label: "charge(order)", detail: "The request gets a strict deadline so checkout p99 stays bounded." },
        { from: "timeout", to: "circuit", label: "Ask circuit state", detail: "Open circuit returns immediately and avoids hammering a dependency already known to be sick." },
        { from: "circuit", to: "retry", label: "Permit attempt", detail: "Only transient exceptions are retried; validation failures should fail fast." },
        { from: "retry", to: "bulkhead", label: "Acquire slot", detail: "Bulkhead isolation caps concurrent payment calls and preserves threads for healthy dependencies." },
        { from: "bulkhead", to: "payment", label: "HTTP POST /charge", detail: "The real network call happens only after policy checks pass." },
        { from: "payment", to: "retry", label: "Timeout/503", detail: "Retry backoff spreads repeat attempts and avoids synchronized load spikes." },
        { from: "circuit", to: "fallback", label: "Open -> queue payment", detail: "Sustained failure shifts to degraded behavior such as PENDING_PAYMENT." },
        { from: "fallback", to: "order", label: "Return pending state", detail: "The user journey continues with an honest, recoverable state instead of a total outage." }
      ]
    },
    "ms-grpc-protobuf": {
      title: "UML: gRPC create-order call",
      scenario: "Example: generated client sends a typed protobuf request through HTTP/2.",
      actors: [
        { id: "client", label: "Go Client", hint: "caller" },
        { id: "stub", label: "Generated Stub", hint: "proto" },
        { id: "envoy", label: "Envoy", hint: "LB/mTLS" },
        { id: "interceptor", label: "Interceptor", hint: "auth/trace" },
        { id: "service", label: "OrderService", hint: "server impl" },
        { id: "stream", label: "Stream", hint: "HTTP/2" },
        { id: "status", label: "Status", hint: "codes" }
      ],
      messages: [
        { from: "client", to: "stub", label: "CreateOrder(req)", detail: "The caller uses generated types instead of hand-built JSON dictionaries." },
        { from: "stub", to: "envoy", label: "Serialize protobuf", detail: "The request becomes compact binary frames over a reused HTTP/2 connection." },
        { from: "envoy", to: "interceptor", label: "Route + mTLS", detail: "Envoy handles load balancing, identity, retries, and connection health." },
        { from: "interceptor", to: "service", label: "Attach auth + trace", detail: "Server middleware validates metadata and records metrics before business logic runs." },
        { from: "service", to: "stream", label: "Send order events", type: "async", detail: "For server streaming, the handler can keep pushing updates under the same RPC." },
        { from: "service", to: "status", label: "Return OK or INVALID_ARGUMENT", detail: "Errors are typed status codes that clients can branch on." },
        { from: "status", to: "client", label: "Typed response/error", detail: "The client receives generated response fields or a machine-readable gRPC status." }
      ]
    },
    "ms-service-discovery-lb": {
      title: "UML: service discovery and pod readiness",
      scenario: "Example: a service caller reaches only ready pods while a deployment rolls forward.",
      actors: [
        { id: "caller", label: "Caller", hint: "service A" },
        { id: "dns", label: "Cluster DNS", hint: "stable name" },
        { id: "svc", label: "Service/LB", hint: "virtual IP" },
        { id: "slice", label: "EndpointSlice", hint: "ready pods" },
        { id: "poda", label: "Pod A", hint: "old" },
        { id: "podb", label: "Pod B", hint: "new" },
        { id: "probe", label: "Readiness", hint: "health gate" },
        { id: "drain", label: "Drain", hint: "SIGTERM" }
      ],
      messages: [
        { from: "caller", to: "dns", label: "Resolve orders.svc", detail: "Clients use DNS or sidecar discovery rather than changing pod IPs." },
        { from: "dns", to: "svc", label: "Return service address", detail: "The virtual service address stays stable across rollouts and reschedules." },
        { from: "svc", to: "slice", label: "Read ready endpoints", detail: "EndpointSlice data is continuously updated from pod readiness." },
        { from: "slice", to: "poda", label: "Route request", detail: "The load balancer sends traffic only to endpoints currently marked ready." },
        { from: "podb", to: "probe", label: "Readiness passes", detail: "A new pod joins traffic only after startup, dependencies, and warmup are complete." },
        { from: "probe", to: "slice", label: "Add Pod B endpoint", type: "async", detail: "Once ready, the new pod appears in endpoint lists." },
        { from: "drain", to: "poda", label: "SIGTERM old pod", detail: "The old pod flips readiness false and finishes in-flight requests before exit." },
        { from: "slice", to: "podb", label: "Shift new traffic", detail: "Traffic moves to ready replacements without callers changing configuration." }
      ]
    },
    "ms-cqrs-event-sourcing": {
      title: "UML: command to projection loop",
      scenario: "Example: place order command appends events and updates query models asynchronously.",
      actors: [
        { id: "user", label: "User", hint: "checkout" },
        { id: "command", label: "Command API", hint: "writes" },
        { id: "aggregate", label: "Aggregate", hint: "rules" },
        { id: "store", label: "Event Store", hint: "append log" },
        { id: "bus", label: "Event Bus", hint: "fan out" },
        { id: "projection", label: "Projection", hint: "consumer" },
        { id: "read", label: "Read DB", hint: "view" },
        { id: "query", label: "Query API", hint: "reads" }
      ],
      messages: [
        { from: "user", to: "command", label: "PlaceOrder command", detail: "Commands express intent and are routed to the write model." },
        { from: "command", to: "aggregate", label: "Load aggregate history", detail: "The aggregate rehydrates from prior events and checks invariants." },
        { from: "aggregate", to: "store", label: "Append OrderPlaced", detail: "The event store records immutable facts with optimistic concurrency." },
        { from: "store", to: "bus", label: "Publish new event", type: "async", detail: "Downstream models update without slowing the command response." },
        { from: "bus", to: "projection", label: "Consume in order", type: "async", detail: "Projection handlers are idempotent and track offsets or sequence numbers." },
        { from: "projection", to: "read", label: "Upsert order summary", detail: "The read model is denormalized for the screen or report it serves." },
        { from: "user", to: "query", label: "GET order summary", detail: "The user-facing query path is simple and fast, but eventually consistent." },
        { from: "query", to: "read", label: "Read precomputed view", detail: "No expensive joins or aggregate replay happen on the read path." }
      ]
    },
    "ms-kubernetes-deployment": {
      title: "UML: deployment rollout and autoscaling",
      scenario: "Example: applying a manifest creates pods, exposes them, and scales with traffic.",
      actors: [
        { id: "dev", label: "Developer", hint: "kubectl" },
        { id: "api", label: "API Server", hint: "desired state" },
        { id: "deploy", label: "Deployment Ctrl", hint: "rollout" },
        { id: "rs", label: "ReplicaSet", hint: "replicas" },
        { id: "sched", label: "Scheduler", hint: "placement" },
        { id: "node", label: "Kubelet", hint: "node" },
        { id: "svc", label: "Service", hint: "traffic" },
        { id: "scale", label: "HPA/PDB", hint: "scale/safety" }
      ],
      messages: [
        { from: "dev", to: "api", label: "kubectl apply -f deploy.yaml", detail: "The API server stores desired state; controllers do the real reconciliation." },
        { from: "api", to: "deploy", label: "Watch Deployment spec", type: "async", detail: "The deployment controller notices a new template or replica count." },
        { from: "deploy", to: "rs", label: "Create new ReplicaSet", detail: "Rolling-update settings control surge and unavailable pods during rollout." },
        { from: "rs", to: "sched", label: "Create Pod objects", detail: "Pending pods wait for the scheduler to pick nodes with enough resources." },
        { from: "sched", to: "node", label: "Bind pod to node", detail: "The kubelet pulls images, mounts config/secrets, and starts containers." },
        { from: "node", to: "svc", label: "Ready endpoint appears", type: "async", detail: "Readiness gates prevent cold pods from receiving traffic too early." },
        { from: "scale", to: "deploy", label: "Adjust replicas", detail: "HPA changes desired replicas from metrics; PDB constrains voluntary disruptions." },
        { from: "svc", to: "node", label: "Route live traffic", detail: "Only ready pods behind the service receive production requests." }
      ]
    },
    "ms-idempotency-outbox-inbox": {
      title: "UML: duplicate checkout request handled safely",
      scenario: "Example: the first request succeeds, the retry returns the same order, and the consumer ignores duplicate delivery.",
      actors: [
        { id: "client", label: "Client", hint: "timeout retry" },
        { id: "api", label: "Order API", hint: "FastAPI" },
        { id: "keys", label: "Idempotency Table", hint: "unique key" },
        { id: "orders", label: "Orders DB", hint: "business row" },
        { id: "outbox", label: "Outbox", hint: "event row" },
        { id: "relay", label: "Relay", hint: "publisher" },
        { id: "kafka", label: "Kafka", hint: "redelivery" },
        { id: "inventory", label: "Inventory", hint: "inbox" }
      ],
      messages: [
        { from: "client", to: "api", label: "POST /orders + key", detail: "The key identifies the business intent, not just one HTTP attempt." },
        { from: "api", to: "keys", label: "Insert PROCESSING", detail: "Unique(client_key) lets exactly one request claim the command." },
        { from: "api", to: "orders", label: "Insert order", detail: "The business state is written once inside the same transaction." },
        { from: "api", to: "outbox", label: "Insert ORDER_CREATED", detail: "The event is durable before the API returns." },
        { from: "api", to: "keys", label: "Store 201 response", detail: "Later retries can return the original response body without new side effects." },
        { from: "client", to: "api", label: "Retry same key", detail: "A timeout retry reads the stored response instead of creating a second order." },
        { from: "relay", to: "outbox", label: "Poll unsent", detail: "Workers use for update skip locked to divide relay work." },
        { from: "relay", to: "kafka", label: "Publish event", type: "async", detail: "If the relay crashes before marking sent, this publish may happen again." },
        { from: "kafka", to: "inventory", label: "Deliver event twice", type: "async", detail: "The consumer inbox records event_id and ignores the second delivery." }
      ]
    },
    "ms-service-mesh-observability": {
      title: "UML: mTLS request with mesh telemetry",
      scenario: "Example: order-service calls payment-service through Envoy proxies and mesh policy.",
      actors: [
        { id: "order", label: "Order Service", hint: "caller app" },
        { id: "envoya", label: "Envoy A", hint: "outbound" },
        { id: "control", label: "Control Plane", hint: "xDS/certs" },
        { id: "envoyb", label: "Envoy B", hint: "inbound" },
        { id: "payment", label: "Payment Service", hint: "target app" },
        { id: "otel", label: "OTel Collector", hint: "traces" },
        { id: "prom", label: "Prometheus", hint: "metrics" }
      ],
      messages: [
        { from: "control", to: "envoya", label: "Push route + cert", type: "async", detail: "The proxy receives destination subsets, retry rules, authz policy, and workload identity material." },
        { from: "control", to: "envoyb", label: "Push inbound policy", type: "async", detail: "The target proxy knows who may call which method or path." },
        { from: "order", to: "envoya", label: "POST /v1/charges", detail: "The application issues a normal service call with a deadline and trace context." },
        { from: "envoya", to: "envoyb", label: "mTLS + route", detail: "Envoy establishes encrypted workload identity and applies retry/timeout policy." },
        { from: "envoyb", to: "payment", label: "Forward if authorized", detail: "Inbound policy allows order-service service account to call payment charge only." },
        { from: "payment", to: "envoyb", label: "200 or 5xx", detail: "Response status feeds outlier detection, retry decisions, and SLO metrics." },
        { from: "envoya", to: "otel", label: "Export spans", type: "async", detail: "Trace spans connect caller proxy, target proxy, and application spans." },
        { from: "envoya", to: "prom", label: "Expose RED metrics", type: "async", detail: "Rate, errors, and duration become alertable service-level signals." }
      ]
    }
  };

  const architectures = {
    "ms-api-gateway": {
      title: "Production gateway topology",
      caption: "North-south traffic enters through a small edge stack before reaching private services.",
      lanes: [
        {
          label: "Clients",
          hint: "public callers",
          nodes: [
            { id: "web", label: "Web/Mobile", badge: "public", hint: "HTTPS clients", detail: "Clients know only the public gateway URL and receive a normalized API surface." },
            { id: "partner", label: "Partner API", hint: "external integrations", detail: "Partner clients usually need stronger quotas, audit logs, and scoped credentials." }
          ]
        },
        {
          label: "Edge",
          hint: "shared controls",
          nodes: [
            { id: "gateway", label: "API Gateway", badge: "entry", hint: "routing + TLS", detail: "Terminates TLS, normalizes headers, routes traffic, and injects trace context." },
            { id: "waf", label: "WAF / Rate Limit", hint: "abuse shield", detail: "Blocks obvious attack traffic and rejects noisy clients before they consume service capacity." }
          ]
        },
        {
          label: "Platform",
          hint: "identity and policy",
          nodes: [
            { id: "auth", label: "Auth Provider", hint: "JWT/JWKS", detail: "Validates token signature, expiry, tenant, scopes, and audience." },
            { id: "config", label: "Route Config", hint: "canary rules", detail: "Holds upstream routes, weights, transformations, and feature-specific policies." }
          ]
        },
        {
          label: "Private services",
          hint: "domain APIs",
          nodes: [
            { id: "orders", label: "Order Service", hint: "business logic", detail: "Owns domain rules and private persistence; it should not duplicate edge auth logic." },
            { id: "otel", label: "Telemetry", hint: "logs/traces", detail: "Receives access logs, spans, and RED metrics from edge and services." }
          ]
        }
      ],
      links: [
        { from: "web", to: "gateway", label: "HTTPS request", detail: "All public traffic enters through one controlled edge." },
        { from: "gateway", to: "auth", label: "Token validation", detail: "The gateway rejects bad credentials before service routing." },
        { from: "gateway", to: "waf", label: "Quota check", detail: "Rate limiting protects downstream thread pools and databases." },
        { from: "config", to: "gateway", label: "Route/canary policy", type: "async", detail: "Platform config changes routing behavior without redeploying services." },
        { from: "gateway", to: "orders", label: "Forward internal call", detail: "The service receives trusted identity and trace headers." },
        { from: "gateway", to: "otel", label: "Emit edge telemetry", type: "async", detail: "Gateway spans and access logs make edge behavior debuggable." }
      ]
    },
    "ms-kafka-event-driven": {
      title: "Kafka event pipeline topology",
      caption: "Producers append facts once; many independent consumers build their own views.",
      lanes: [
        {
          label: "Write side",
          hint: "domain transaction",
          nodes: [
            { id: "api", label: "Order API", hint: "producer", detail: "Creates business state and decides which domain event should exist." },
            { id: "outbox", label: "Outbox Table", badge: "atomic", hint: "same DB tx", detail: "Stores publish intent in the same transaction as the order write." }
          ]
        },
        {
          label: "Kafka",
          hint: "durable log",
          nodes: [
            { id: "topic", label: "orders.events", hint: "topic", detail: "A durable append-only log that can be replayed by new or recovering consumers." },
            { id: "partition", label: "Partitions", hint: "ordering lanes", detail: "Ordering is guaranteed only inside a partition, usually by aggregate key." }
          ]
        },
        {
          label: "Consumers",
          hint: "independent groups",
          nodes: [
            { id: "inventory", label: "Inventory Group", hint: "reserve stock", detail: "Consumes events at its own pace and commits offsets after side effects succeed." },
            { id: "email", label: "Email Group", hint: "notifications", detail: "A separate group can replay or lag without affecting inventory." }
          ]
        },
        {
          label: "Operations",
          hint: "safety rails",
          nodes: [
            { id: "dlq", label: "DLQ", hint: "poison events", detail: "Captures events that cannot be processed after retries so a partition is not blocked forever." },
            { id: "lag", label: "Lag Metrics", hint: "Prometheus", detail: "Consumer lag shows whether processing is keeping up with production rate." }
          ]
        }
      ],
      links: [
        { from: "api", to: "outbox", label: "Write event intent", detail: "The event cannot be lost after the business row commits." },
        { from: "outbox", to: "topic", label: "Relay publish", type: "async", detail: "A relay turns rows into Kafka records with retryable semantics." },
        { from: "topic", to: "partition", label: "Keyed ordering", detail: "Aggregate key chooses the partition and therefore the ordering lane." },
        { from: "partition", to: "inventory", label: "Consumer assignment", type: "async", detail: "Only one group member handles a partition at a time." },
        { from: "inventory", to: "dlq", label: "Fatal failure path", type: "async", detail: "Invalid events are isolated with replay context." },
        { from: "inventory", to: "lag", label: "Report offsets", type: "async", detail: "Lag and retry counts are first-class production signals." }
      ]
    },
    "ms-saga-distributed-tx": {
      title: "Saga workflow topology",
      caption: "A durable workflow coordinates local transactions and compensations.",
      lanes: [
        {
          label: "Entry",
          hint: "user intent",
          nodes: [
            { id: "client", label: "Checkout Client", hint: "command", detail: "Submits one business intent and receives an accepted or final order status." },
            { id: "orderapi", label: "Order API", hint: "starts saga", detail: "Creates an order in PENDING state and starts the workflow with an idempotency key." }
          ]
        },
        {
          label: "Workflow",
          hint: "durable control",
          nodes: [
            { id: "orchestrator", label: "Saga Engine", badge: "stateful", hint: "Temporal/Conductor", detail: "Persists step state, retries, timers, and compensation history." },
            { id: "history", label: "Workflow History", hint: "audit trail", detail: "Stores every command/result so a crashed worker can resume precisely." }
          ]
        },
        {
          label: "Participants",
          hint: "local tx only",
          nodes: [
            { id: "inventory", label: "Inventory", hint: "reserve/cancel", detail: "Commits a local reservation and exposes an idempotent cancellation command." },
            { id: "payment", label: "Payment", hint: "charge/refund", detail: "Commits a local charge and exposes an idempotent refund command." },
            { id: "shipping", label: "Shipping", hint: "create/cancel", detail: "Creates fulfillment only after prior steps have durable success." }
          ]
        },
        {
          label: "Visibility",
          hint: "operators",
          nodes: [
            { id: "status", label: "Order Status", hint: "PENDING/FAILED", detail: "Users and support see semantic workflow states instead of hidden partial commits." },
            { id: "alerts", label: "Manual Queue", hint: "dirty state", detail: "Escalates compensation failures that cannot be resolved automatically." }
          ]
        }
      ],
      links: [
        { from: "client", to: "orderapi", label: "Create order", detail: "The command is accepted without opening a distributed database transaction." },
        { from: "orderapi", to: "orchestrator", label: "Start workflow", detail: "The saga ID becomes the retry identity for all participant calls." },
        { from: "orchestrator", to: "inventory", label: "Reserve", detail: "A local transaction returns a reservation ID for compensation." },
        { from: "orchestrator", to: "payment", label: "Charge", detail: "Payment runs after inventory succeeds and is retried safely." },
        { from: "orchestrator", to: "shipping", label: "Ship", detail: "The happy path moves forward one committed local step at a time." },
        { from: "orchestrator", to: "alerts", label: "Compensation failure", type: "async", detail: "Failed undo actions retry and eventually alert humans with full context." }
      ]
    },
    "ms-circuit-breaker-resilience": {
      title: "Resilience policy topology",
      caption: "Synchronous calls are wrapped with budgets, isolation, state, and degraded behavior.",
      lanes: [
        {
          label: "Caller",
          hint: "request path",
          nodes: [
            { id: "order", label: "Order Service", hint: "checkout", detail: "Owns the user-facing deadline and decides what degraded state is acceptable." },
            { id: "budget", label: "Timeout Budget", badge: "SLO", hint: "500-800 ms", detail: "Prevents one dependency from consuming the entire request latency budget." }
          ]
        },
        {
          label: "Policies",
          hint: "resilience4j/envoy",
          nodes: [
            { id: "circuit", label: "Circuit Breaker", hint: "open/half-open", detail: "Stops calls when recent failures suggest the dependency is unhealthy." },
            { id: "retry", label: "Retry + Jitter", hint: "transient only", detail: "Retries short-lived failures without synchronizing traffic spikes." },
            { id: "bulkhead", label: "Bulkhead", hint: "bounded slots", detail: "Limits concurrent calls so one dependency cannot exhaust all caller resources." }
          ]
        },
        {
          label: "Dependency",
          hint: "remote system",
          nodes: [
            { id: "payment", label: "Payment API", hint: "external call", detail: "A slow or failing dependency that must not take down checkout." },
            { id: "fallback", label: "Fallback Queue", hint: "pending work", detail: "Stores recoverable work for later processing or returns a partial response." }
          ]
        },
        {
          label: "Signals",
          hint: "tuning inputs",
          nodes: [
            { id: "metrics", label: "Failure Metrics", hint: "rate + p99", detail: "Circuit thresholds and retry budgets should be tuned from real latency and error data." }
          ]
        }
      ],
      links: [
        { from: "order", to: "budget", label: "Set deadline", detail: "Every dependency call starts with a time budget." },
        { from: "budget", to: "circuit", label: "Check health", detail: "Open circuits fail fast without using network resources." },
        { from: "circuit", to: "retry", label: "Permit attempts", detail: "Retries happen only for errors that are likely transient and idempotent." },
        { from: "retry", to: "bulkhead", label: "Acquire capacity", detail: "Bulkhead slots protect the caller from resource exhaustion." },
        { from: "bulkhead", to: "payment", label: "Call dependency", detail: "The remote call is now bounded by policy." },
        { from: "circuit", to: "fallback", label: "Degraded mode", detail: "Open circuit or timeout returns a recoverable business state." },
        { from: "payment", to: "metrics", label: "Feed policy", type: "async", detail: "Error rate and latency update resilience decisions." }
      ]
    },
    "ms-grpc-protobuf": {
      title: "gRPC contract topology",
      caption: "A proto contract becomes typed clients, HTTP/2 traffic, and machine-readable errors.",
      lanes: [
        {
          label: "Contract",
          hint: "schema first",
          nodes: [
            { id: "proto", label: ".proto File", badge: "IDL", hint: "field numbers", detail: "Defines service methods, messages, and compatibility rules." },
            { id: "registry", label: "Schema Review", hint: "CI checks", detail: "Prevents unsafe field reuse or breaking changes before deployment." }
          ]
        },
        {
          label: "Client",
          hint: "generated code",
          nodes: [
            { id: "stub", label: "Generated Stub", hint: "Go/Java/Python", detail: "Gives callers typed request and response objects." },
            { id: "deadline", label: "Deadline Metadata", hint: "context", detail: "Carries timeout, auth, and trace metadata with the RPC." }
          ]
        },
        {
          label: "Transport",
          hint: "HTTP/2",
          nodes: [
            { id: "envoy", label: "Envoy / LB", hint: "mTLS + routing", detail: "Balances long-lived HTTP/2 connections and can enforce service policy." },
            { id: "stream", label: "Stream", hint: "multiplexed", detail: "Supports unary, server-streaming, client-streaming, and bidirectional calls." }
          ]
        },
        {
          label: "Server",
          hint: "handler",
          nodes: [
            { id: "interceptor", label: "Interceptors", hint: "auth/trace", detail: "Middleware for auth, logging, metrics, and tracing around service methods." },
            { id: "handler", label: "Service Impl", hint: "domain code", detail: "Executes business logic and returns typed responses or status errors." }
          ]
        }
      ],
      links: [
        { from: "proto", to: "registry", label: "Compatibility check", detail: "CI enforces safe protobuf evolution rules." },
        { from: "proto", to: "stub", label: "Generate client", type: "async", detail: "Teams consume the same contract in their language." },
        { from: "stub", to: "deadline", label: "Attach metadata", detail: "Deadlines and trace context move with the call." },
        { from: "deadline", to: "envoy", label: "HTTP/2 frames", detail: "Binary protobuf travels over multiplexed transport." },
        { from: "envoy", to: "interceptor", label: "Route to server", detail: "The server receives a typed RPC after transport policy." },
        { from: "interceptor", to: "handler", label: "Invoke method", detail: "Business code returns a response or a status code." }
      ]
    },
    "ms-service-discovery-lb": {
      title: "Discovery and endpoint topology",
      caption: "Stable names point to changing healthy instances.",
      lanes: [
        {
          label: "Caller",
          hint: "service A",
          nodes: [
            { id: "client", label: "Service Client", hint: "HTTP/gRPC", detail: "Calls a stable name and should honor timeouts, DNS refresh, and connection pooling." },
            { id: "dns", label: "Cluster DNS", hint: "stable name", detail: "Resolves service names without hardcoded pod IPs." }
          ]
        },
        {
          label: "Routing",
          hint: "load balancing",
          nodes: [
            { id: "service", label: "Service / LB", badge: "virtual", hint: "VIP or proxy", detail: "Maps stable service identity to live endpoints." },
            { id: "slice", label: "EndpointSlice", hint: "ready pods", detail: "Stores current pod IPs and readiness state for routing." }
          ]
        },
        {
          label: "Instances",
          hint: "pods",
          nodes: [
            { id: "pod-a", label: "Pod A", hint: "ready", detail: "Receives traffic while readiness remains true." },
            { id: "pod-b", label: "Pod B", hint: "starting", detail: "Joins routing only after probes pass." }
          ]
        },
        {
          label: "Lifecycle",
          hint: "probes + drain",
          nodes: [
            { id: "probe", label: "Readiness Probe", hint: "traffic gate", detail: "Controls whether an instance should receive new requests." },
            { id: "drain", label: "Graceful Drain", hint: "SIGTERM", detail: "Removes a pod from routing before shutdown to finish in-flight work." }
          ]
        }
      ],
      links: [
        { from: "client", to: "dns", label: "Resolve name", detail: "The caller starts with a stable service name." },
        { from: "dns", to: "service", label: "Return route target", detail: "DNS points to a virtual service or a list of pod IPs." },
        { from: "service", to: "slice", label: "Read endpoints", detail: "Routing uses only currently registered endpoints." },
        { from: "slice", to: "pod-a", label: "Send request", detail: "Ready pods receive traffic." },
        { from: "pod-b", to: "probe", label: "Pass readiness", type: "async", detail: "A new pod becomes eligible only after warmup succeeds." },
        { from: "drain", to: "slice", label: "Remove endpoint", type: "async", detail: "Draining pods stop receiving new traffic before exit." }
      ]
    },
    "ms-cqrs-event-sourcing": {
      title: "CQRS/event-sourcing topology",
      caption: "The write model protects invariants while read models optimize queries.",
      lanes: [
        {
          label: "Write path",
          hint: "commands",
          nodes: [
            { id: "command", label: "Command API", hint: "intent", detail: "Accepts commands and routes them to the correct aggregate." },
            { id: "aggregate", label: "Aggregate", badge: "rules", hint: "invariants", detail: "Rehydrates from history and decides which events are valid." }
          ]
        },
        {
          label: "Facts",
          hint: "source of truth",
          nodes: [
            { id: "eventstore", label: "Event Store", hint: "append-only", detail: "Stores immutable events with optimistic concurrency." },
            { id: "snapshot", label: "Snapshots", hint: "replay speed", detail: "Caches aggregate state to avoid replaying long histories every time." }
          ]
        },
        {
          label: "Read side",
          hint: "projections",
          nodes: [
            { id: "projector", label: "Projector", hint: "consumer", detail: "Applies events idempotently and tracks offsets or sequence numbers." },
            { id: "readmodel", label: "Read Model", hint: "denormalized", detail: "Stores query-shaped data for screens, reports, search, or analytics." }
          ]
        },
        {
          label: "Queries",
          hint: "fast reads",
          nodes: [
            { id: "query", label: "Query API", hint: "read only", detail: "Serves low-latency reads while accepting eventual consistency." },
            { id: "replay", label: "Replay Tooling", hint: "repair", detail: "Rebuilds projections after bugs, schema changes, or new feature needs." }
          ]
        }
      ],
      links: [
        { from: "command", to: "aggregate", label: "Validate command", detail: "The write model checks invariants before facts are created." },
        { from: "aggregate", to: "eventstore", label: "Append events", detail: "State changes are durable immutable facts." },
        { from: "eventstore", to: "projector", label: "Publish/consume", type: "async", detail: "Projections update after the command commits." },
        { from: "projector", to: "readmodel", label: "Update view", detail: "The read side is shaped for query ergonomics." },
        { from: "query", to: "readmodel", label: "Fetch precomputed data", detail: "Reads avoid aggregate replay and complex joins." },
        { from: "replay", to: "projector", label: "Rebuild projection", type: "async", detail: "Events can be replayed to repair or create views." }
      ]
    },
    "ms-kubernetes-deployment": {
      title: "Kubernetes service runtime topology",
      caption: "Controllers turn manifests into scheduled, healthy, scalable pods.",
      lanes: [
        {
          label: "Desired state",
          hint: "API objects",
          nodes: [
            { id: "manifest", label: "Manifest", hint: "YAML", detail: "Declares replicas, resources, probes, rollout strategy, and configuration." },
            { id: "api", label: "API Server", badge: "source", hint: "stored spec", detail: "Stores desired state and exposes watch streams to controllers." }
          ]
        },
        {
          label: "Controllers",
          hint: "reconciliation",
          nodes: [
            { id: "deploy", label: "Deployment", hint: "rollout", detail: "Creates and scales ReplicaSets according to rollout strategy." },
            { id: "hpa", label: "HPA", hint: "autoscale", detail: "Adjusts replica count from CPU, memory, queue depth, or custom metrics." },
            { id: "pdb", label: "PDB", hint: "availability", detail: "Limits voluntary disruptions so too many pods do not disappear at once." }
          ]
        },
        {
          label: "Runtime",
          hint: "pods",
          nodes: [
            { id: "rs", label: "ReplicaSet", hint: "pod owner", detail: "Ensures the desired number of pod replicas exist." },
            { id: "pod", label: "Pod", hint: "container", detail: "Runs the app with configured resources, probes, secrets, and config." }
          ]
        },
        {
          label: "Traffic",
          hint: "serving",
          nodes: [
            { id: "service", label: "Service", hint: "ready endpoints", detail: "Routes traffic only to pods that pass readiness." },
            { id: "metrics", label: "Metrics", hint: "top/scrape", detail: "Feeds autoscaling and operational tuning." }
          ]
        }
      ],
      links: [
        { from: "manifest", to: "api", label: "Apply spec", detail: "Desired state is persisted before controllers act." },
        { from: "api", to: "deploy", label: "Watch deployment", type: "async", detail: "The deployment controller reacts to spec changes." },
        { from: "deploy", to: "rs", label: "Create ReplicaSet", detail: "New pod templates produce new ReplicaSets during rollout." },
        { from: "rs", to: "pod", label: "Maintain replicas", detail: "Pods are recreated when they fail or during scaling." },
        { from: "pod", to: "service", label: "Ready endpoint", type: "async", detail: "Readiness gates traffic membership." },
        { from: "metrics", to: "hpa", label: "Scale signal", type: "async", detail: "Autoscaling reacts to observed demand." },
        { from: "pdb", to: "pod", label: "Disruption guard", detail: "Node drains respect minimum availability." }
      ]
    },
    "ms-idempotency-outbox-inbox": {
      title: "Idempotent messaging topology",
      caption: "A retry-safe command uses a durable key, atomic outbox, and deduping consumers.",
      lanes: [
        {
          label: "Command",
          hint: "HTTP boundary",
          nodes: [
            { id: "client", label: "Retrying Client", hint: "same key", detail: "Retries the same business intent with the same Idempotency-Key header." },
            { id: "api", label: "Order API", badge: "FastAPI", hint: "command handler", detail: "Serializes duplicate attempts and returns the stored result after success." }
          ]
        },
        {
          label: "Atomic state",
          hint: "one transaction",
          nodes: [
            { id: "keys", label: "Idempotency Keys", hint: "unique key", detail: "Stores PROCESSING/SUCCEEDED plus the response payload for safe replay." },
            { id: "orders", label: "Orders Table", hint: "business row", detail: "Holds the single committed business result protected by DB constraints." },
            { id: "outbox", label: "Outbox Events", hint: "publish intent", detail: "Records the event to publish in the same transaction." }
          ]
        },
        {
          label: "Delivery",
          hint: "at least once",
          nodes: [
            { id: "relay", label: "Outbox Relay", hint: "skip locked", detail: "Publishes pending events and may safely retry after crashes." },
            { id: "broker", label: "Kafka/SQS", hint: "redelivery", detail: "May deliver duplicates; consumers must treat that as normal." }
          ]
        },
        {
          label: "Consumer",
          hint: "dedupe",
          nodes: [
            { id: "inbox", label: "Inbox Table", badge: "dedupe", hint: "event IDs", detail: "Records processed event IDs before side effects." },
            { id: "stock", label: "Inventory Stock", hint: "side effect", detail: "Stock is reserved once even when a message is delivered multiple times." }
          ]
        }
      ],
      links: [
        { from: "client", to: "api", label: "POST with key", detail: "The key identifies intent across retries." },
        { from: "api", to: "keys", label: "Reserve or replay", detail: "The API either claims the key or returns the stored response." },
        { from: "api", to: "orders", label: "Create once", detail: "The order row is inserted only by the winning request." },
        { from: "orders", to: "outbox", label: "Store event intent", detail: "The event is atomic with the business state." },
        { from: "outbox", to: "relay", label: "Poll pending rows", type: "async", detail: "Multiple relays can divide work with skip locked." },
        { from: "relay", to: "broker", label: "Publish event", type: "async", detail: "Duplicate publishing is allowed and handled downstream." },
        { from: "broker", to: "inbox", label: "Dedupe delivery", type: "async", detail: "The consumer exits early when event_id was already processed." },
        { from: "inbox", to: "stock", label: "Reserve once", detail: "The side effect happens only after dedupe succeeds." }
      ]
    },
    "ms-service-mesh-observability": {
      title: "Service mesh observability topology",
      caption: "App-to-app calls are secured and measured by proxies coordinated from one control plane.",
      lanes: [
        {
          label: "Caller pod",
          hint: "source workload",
          nodes: [
            { id: "order", label: "Order App", hint: "business code", detail: "Owns domain behavior, deadlines, and user-facing error semantics." },
            { id: "envoy-a", label: "Outbound Proxy", badge: "Envoy", hint: "sidecar", detail: "Applies route, retry, timeout, and mTLS policy before traffic leaves the pod." }
          ]
        },
        {
          label: "Control plane",
          hint: "platform policy",
          nodes: [
            { id: "istiod", label: "Mesh Control Plane", hint: "xDS/certs", detail: "Distributes routes, certificates, authorization policy, and telemetry providers." },
            { id: "policy", label: "Authz + Traffic Policy", hint: "YAML", detail: "Defines who can call whom, canary weights, retries, timeouts, and outlier detection." }
          ]
        },
        {
          label: "Target pod",
          hint: "destination workload",
          nodes: [
            { id: "envoy-b", label: "Inbound Proxy", badge: "mTLS", hint: "identity check", detail: "Verifies caller identity and enforces inbound authorization." },
            { id: "payment", label: "Payment App", hint: "handler", detail: "Receives only authorized traffic and returns business success or failure." }
          ]
        },
        {
          label: "Telemetry",
          hint: "incident loop",
          nodes: [
            { id: "otel", label: "OTel Collector", hint: "traces/logs", detail: "Collects spans and correlated logs for request-level investigation." },
            { id: "prom", label: "Prometheus", hint: "RED metrics", detail: "Scrapes rate, error, and duration metrics used by alerts and dashboards." }
          ]
        }
      ],
      links: [
        { from: "istiod", to: "envoy-a", label: "Push outbound config", type: "async", detail: "The source proxy receives route, retry, mTLS, and telemetry config." },
        { from: "istiod", to: "envoy-b", label: "Push inbound policy", type: "async", detail: "The target proxy receives identity and authorization rules." },
        { from: "order", to: "envoy-a", label: "Call payment", detail: "The app makes a normal service call with a deadline and trace context." },
        { from: "envoy-a", to: "envoy-b", label: "mTLS tunnel", detail: "The mesh proves workload identity and encrypts east-west traffic." },
        { from: "envoy-b", to: "payment", label: "Forward if allowed", detail: "Inbound policy gates traffic before the target handler executes." },
        { from: "envoy-a", to: "otel", label: "Export spans", type: "async", detail: "Proxy and app spans combine into an end-to-end trace." },
        { from: "envoy-a", to: "prom", label: "Expose RED metrics", type: "async", detail: "Metrics reveal rate, errors, and latency for SLOs." }
      ]
    }
  };

  window.MICRO_TOPICS.forEach(topic => {
    if (flows[topic.id]) topic.flow = flows[topic.id];
    if (umls[topic.id]) topic.uml = umls[topic.id];
    if (architectures[topic.id]) topic.architecture = architectures[topic.id];
  });
})();
