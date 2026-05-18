(function() {
  var topic = {
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
"In a 10-service call chain, if each service has 99.9% uptime, the composite uptime is 99% — a 10× amplification. Without circuit breakers, a slow database causes request threads to pile up behind the slow DB call, exhausting the thread pool and making the entire service unresponsive. The circuit breaker is the first line of defense.",
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
      notes: "Apply resilience decorators in the right order (outer to inner): TimeLimiter → CircuitBreaker → Retry → Bulkhead. Retry inside CircuitBreaker would reset the timeout. Add jitter to retry delays to prevent thundering herd: `Duration.ofMillis(200 + random.nextInt(100))`."
    },
    interview: [
      {
        question: "What is the difference between a circuit breaker and a retry?",
        answer:
"**Retry** recovers from transient failures (brief network glitch) by re-attempting. **Circuit breaker** detects sustained failure and stops calling the service entirely, giving it time to recover. Retry without a circuit breaker can overwhelm a failing service with retried requests. Together: retry handles transient errors; circuit breaker handles sustained outages. The circuit breaker also gives callers fast failures instead of timeouts.",
        followUps: ["What is the half-open state for?", "How do you tune circuit breaker thresholds?"]
      },
      {
        question: "What is a bulkhead and why does it matter?",
        answer:
"A **bulkhead** isolates thread pools or semaphores per dependency (named after ship watertight compartments). Without it, a slow dependency fills your single thread pool, blocking all requests — even to healthy services. With bulkheads, the slow service gets at most N threads; healthy services are unaffected. In Java, use a separate `ExecutorService` per dependency or Resilience4j's `Bulkhead`.",
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
      when: "Apply **timeout** everywhere. Apply **retry** for idempotent calls with transient errors. Apply **circuit breaker** for any synchronous call to external services. Apply **bulkhead** for shared thread pools serving multiple dependencies."
    }
  };
  window.MICRO_TOPICS = (window.MICRO_TOPICS || []).concat([topic]);
})();
