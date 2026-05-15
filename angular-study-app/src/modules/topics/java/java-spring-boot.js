(function() {
  var topic = {
    id: "java-spring-boot",
    area: "java",
    title: "Spring Boot: Auto-configuration, DI, Starters",
    tag: "Spring",
    tags: ["spring", "boot", "di", "ioc", "autoconfig"],
    concept:
`Spring Boot is **Spring + opinionated auto-configuration**. Core building blocks:
- **IoC container** — \`ApplicationContext\` manages bean lifecycle.
- **DI** — constructor injection (recommended), field/setter injection (legacy).
- **Auto-configuration** — \`@EnableAutoConfiguration\` walks \`META-INF/spring.factories\` (now \`AutoConfiguration.imports\`) and conditionally registers beans via \`@ConditionalOnClass\`, \`@ConditionalOnMissingBean\`.
- **Starters** — curated dependency POMs (\`spring-boot-starter-web\`, \`-data-jpa\`, \`-actuator\`).`,
    why:
`Auto-config is **decision compression** — sensible defaults that work in 80% of cases. But it hides what's running. In senior interviews, you must be able to trace a \`/actuator/conditions\` report and explain why a bean was picked. Bean scope (\`singleton\`, \`prototype\`, \`request\`) drives memory and thread-safety semantics.`,
    example: {
      language: "java",
      code:
`// Constructor injection — preferred, immutable, testable
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;

    OrderController(OrderService service) { this.service = service; }

    @GetMapping("/{id}")
    Order get(@PathVariable String id) { return service.find(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    Order create(@Valid @RequestBody CreateOrder req) { return service.create(req); }
}

@Service
@Transactional
class OrderService {
    private final OrderRepository repo;
    private final MeterRegistry metrics;

    OrderService(OrderRepository repo, MeterRegistry metrics) {
        this.repo = repo;
        this.metrics = metrics;
    }

    Order create(CreateOrder req) {
        var saved = repo.save(new Order(req));
        metrics.counter("orders.created", "tenant", req.tenant()).increment();
        return saved;
    }

    Order find(String id) {
        return repo.findById(id).orElseThrow(() -> new NotFoundException(id));
    }
}

// Conditional bean — only activates when property is set
@Configuration
@ConditionalOnProperty(prefix = "feature.audit", name = "enabled", havingValue = "true")
class AuditConfig {
    @Bean AuditPublisher publisher(KafkaTemplate<String, Audit> kafka) {
        return new AuditPublisher(kafka, "orders.audit");
    }
}`
    },
    interview: [
      {
        question: "Constructor vs field injection?",
        answer:
`**Constructor injection** wins: dependencies are explicit, fields can be \`final\`, the bean is fully constructed before use, and unit tests need no Spring context. Field injection hides cycles and forces reflection in tests. Use setter injection only for optional dependencies.`,
        followUps: ["What is circular dependency? How does Spring resolve it?", "Why is field injection an antipattern?"]
      },
      {
        question: "How does auto-configuration know what to load?",
        answer:
`At startup, Spring reads \`META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports\` from every JAR. Each entry is conditionally evaluated via \`@ConditionalOnClass\`, \`@ConditionalOnMissingBean\`, etc. \`/actuator/conditions\` shows what matched and why.`,
        followUps: ["How do you write a custom starter?", "How does spring.factories migration work?"]
      },
      {
        question: "Bean scopes — what breaks with prototype inside singleton?",
        answer:
`A singleton holds the prototype instance forever — defeating the scope. Fix with \`@Lookup\` method injection, \`ObjectProvider<T>\`, or scoped proxies (\`@Scope(proxyMode = TARGET_CLASS)\`).`,
        followUps: ["Request vs session scope?", "Web async + scoped beans?"]
      }
    ],
    tradeoffs: {
      pros: ["Boilerplate gone.", "Strong ecosystem (Data, Security, Cloud).", "Production-ready actuators + observability."],
      cons: ["Magic by default — debugging hidden bean wiring is hard.", "Startup time grows with classpath.", "Reflection-heavy → bigger JIT warm-up + GraalVM friction."],
      when: `**Default for enterprise Java services.** For startup-sensitive workloads (lambdas, edge), evaluate **Quarkus** or **Micronaut** with build-time DI + GraalVM native image.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
