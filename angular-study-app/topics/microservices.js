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
    }
  };

  window.MICRO_TOPICS.forEach(topic => {
    if (flows[topic.id]) topic.flow = flows[topic.id];
  });
})();
