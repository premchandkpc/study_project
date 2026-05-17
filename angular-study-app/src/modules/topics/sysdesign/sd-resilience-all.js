(function() {
  var topic = {
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
  visual: {
    type: 'flow',
    title: 'Circuit Breaker State Machine',
    direction: 'horizontal',
    nodes: [
      { id: 'client',   label: 'Client',          color: '#58a6ff', icon: '💻', sublabel: 'Makes calls' },
      { id: 'cb-closed', label: 'CB: CLOSED',      color: '#3fb950', icon: '✅', sublabel: 'Normal — pass through' },
      { id: 'cb-open',   label: 'CB: OPEN',        color: '#f85149', icon: '🔴', sublabel: 'Fail fast 30s cooldown' },
      { id: 'cb-half',   label: 'CB: HALF-OPEN',   color: '#ffa657', icon: '🟡', sublabel: 'Probe 3 requests' },
      { id: 'service',  label: 'Downstream',       color: '#3fb950', icon: '🖥',  sublabel: 'Payment / Inventory' },
      { id: 'fallback', label: 'Fallback',         color: '#bc8cff', icon: '🔁', sublabel: 'Cache / default resp' }
    ],
    connections: [
      { from: 'client',    to: 'cb-closed', label: 'request' },
      { from: 'cb-closed', to: 'service',   label: 'forward' },
      { from: 'cb-closed', to: 'cb-open',   label: 'failure > threshold', dashed: true },
      { from: 'client',    to: 'cb-open',   label: 'request' },
      { from: 'cb-open',   to: 'fallback',  label: '503 fail fast' },
      { from: 'cb-open',   to: 'cb-half',   label: 'cooldown elapsed', dashed: true },
      { from: 'cb-half',   to: 'cb-closed', label: 'probe ok', dashed: true },
      { from: 'cb-half',   to: 'cb-open',   label: 'probe fail', dashed: true }
    ],
    scenarios: [
      { name: 'Normal Flow',      path: ['client', 'cb-closed', 'service'],                        result: 'CLOSED: requests pass through — failure rate tracked in 10-call window', resultColor: '#3fb950' },
      { name: 'Failure → OPEN',  path: ['client', 'cb-closed', 'cb-open', 'fallback'],             result: 'Threshold exceeded (>50%) → circuit OPENS — fail fast with fallback <1ms', resultColor: '#f85149' },
      { name: 'Recovery → HALF', path: ['cb-open', 'cb-half', 'cb-closed'],                        result: 'Cooldown 30s → HALF-OPEN: 3 probe requests. Pass → CLOSED; fail → OPEN again', resultColor: '#ffa657' }
    ]
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
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
