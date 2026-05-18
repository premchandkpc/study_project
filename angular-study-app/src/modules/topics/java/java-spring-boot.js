(function() {
  var topic = {
    id: "java-spring-boot",
    area: "java",
    title: "Spring Boot: Startup, DI, Request Lifecycle & AOP",
    tag: "Spring",
    tags: ["spring", "boot", "di", "ioc", "autoconfig", "aop", "transactions", "request lifecycle"],

    flow: {
      title: "Spring Boot Startup — SpringApplication.run() to Ready",
      caption: "Full boot sequence from main() to serving first request",
      nodes: [
        { id: "main",      label: "main()",               hint: "SpringApplication.run(App.class, args)" },
        { id: "listeners", label: "RunListeners.starting", hint: "ApplicationStartingEvent fired" },
        { id: "env",       label: "Environment",           hint: "Load properties, profiles, command-line args" },
        { id: "ctx",       label: "ApplicationContext",    hint: "AnnotationConfigServletWebServerApplicationContext" },
        { id: "bfpp",      label: "BeanFactory PostProc", hint: "ConfigurationClassPostProcessor scans @Component" },
        { id: "autoconf",  label: "Auto-configuration",   hint: "@Conditional beans registered from JARs" },
        { id: "beans",     label: "Singleton Beans Init", hint: "Constructor DI, @PostConstruct, SmartLifecycle" },
        { id: "server",    label: "Embedded Server",      hint: "Tomcat/Netty started, port bound" },
        { id: "ready",     label: "ApplicationReady",     hint: "Traffic accepted, runners called" },
      ],
      steps: [
        { path: ["main","listeners"],  label: "SpringApplication.run() — bootstrap starts", detail: "SpringApplication constructed. Detects application type (SERVLET/REACTIVE/NONE). SpringApplicationRunListeners notified. ApplicationStartingEvent published. Logging initialized." },
        { path: ["listeners","env"],   label: "Environment prepared", detail: "StandardEnvironment created. Properties loaded in order: command-line args > OS env vars > application.yml > application.properties > @PropertySource. Spring profiles activated (spring.profiles.active). ApplicationEnvironmentPreparedEvent fired." },
        { path: ["env","ctx"],         label: "ApplicationContext created", detail: "For web: AnnotationConfigServletWebServerApplicationContext. For reactive: AnnotationConfigReactiveWebServerApplicationContext. Empty container — no beans yet. BeanFactory initialized." },
        { path: ["ctx","bfpp"],        label: "BeanFactory PostProcessors — @ComponentScan", detail: "ConfigurationClassPostProcessor runs. Processes @Configuration, @ComponentScan, @Bean, @Import. Finds all @Component/@Service/@Repository/@Controller/@RestController. Registers BeanDefinitions (metadata, not instances yet)." },
        { path: ["bfpp","autoconf"],   label: "Auto-configuration evaluated", detail: "@EnableAutoConfiguration reads META-INF/spring/AutoConfiguration.imports from ALL JARs. Each @AutoConfiguration evaluated: @ConditionalOnClass (classpath?), @ConditionalOnMissingBean (user override?), @ConditionalOnProperty (flag set?). Only matching beans registered." },
        { path: ["autoconf","beans"],  label: "Singleton beans instantiated", detail: "All singleton BeanDefinitions instantiated in dependency order. Constructor injection: Spring resolves dependency graph, detects cycles. @PostConstruct called after DI. ApplicationContextAware, InitializingBean callbacks. @EventListener registered." },
        { path: ["beans","server"],    label: "Embedded server starts", detail: "WebServerFactory bean creates Tomcat/Netty/Undertow. DispatcherServlet registered. Filter chain configured (Security, CORS, compression). Port bound. ApplicationStartedEvent fired. CommandLineRunner / ApplicationRunner beans called." },
        { path: ["server","ready"],    label: "ApplicationReadyEvent — serving traffic", detail: "First HTTP request can now be handled. Actuator health shows UP. /actuator/beans shows all registered beans. /actuator/conditions shows auto-config decisions. Startup complete — may take 1–10s depending on classpath size." },
      ]
    },

    uml: {
      title: "HTTP Request Lifecycle — DispatcherServlet to Response",
      scenario: "POST /orders → OrderController.create() → Service → Repository → DB → JSON response",
      actors: [
        { id: "http",    label: "HTTP",         hint: "Incoming HTTP request" },
        { id: "filter",  label: "Filter Chain", hint: "Security, CORS, logging, compression" },
        { id: "disp",    label: "DispatcherServlet", hint: "Spring MVC front controller" },
        { id: "handler", label: "HandlerMapping", hint: "Finds @RequestMapping method" },
        { id: "ctrl",    label: "Controller",   hint: "@RestController method" },
        { id: "svc",     label: "Service",      hint: "@Service + @Transactional proxy" },
        { id: "repo",    label: "Repository",   hint: "Spring Data JPA" },
        { id: "db",      label: "Database",     hint: "JDBC → connection pool" },
      ],
      messages: [
        { from:"http",   to:"filter",  label:"HTTP POST /orders arrives", detail:"Tomcat receives request. Filter chain executes in order: SecurityFilter (auth/authz), CorsFilter (origin check), LoggingFilter, CompressionFilter. Each can short-circuit and return response." },
        { from:"filter", to:"disp",   label:"Filters pass → DispatcherServlet.service()", detail:"DispatcherServlet is THE single entry point for all MVC requests. Gets HandlerExecutionChain (handler + interceptors) from HandlerMapping." },
        { from:"disp",   to:"handler",label:"getHandler(request) — find @RequestMapping", detail:"RequestMappingHandlerMapping matches HTTP method + path + consumes/produces. Returns the method handle. If no match: 404 MethodNotAllowedException. If wrong method: 405." },
        { from:"handler",to:"disp",   label:"HandlerInterceptor.preHandle() — pre-processing", detail:"Registered interceptors fire preHandle(). Can reject (return false = response sent, chain stopped). Common: AuthenticationInterceptor, MDC logging, performance tracing." },
        { from:"disp",   to:"ctrl",   label:"HandlerAdapter invokes Controller method", detail:"RequestMappingHandlerAdapter: resolves @PathVariable, @RequestParam, @RequestBody (via HttpMessageConverter → Jackson JSON). Validates @Valid bean (@Validated). Then invokes the @RequestMapping method." },
        { from:"ctrl",   to:"svc",    label:"service.create(req) — calls @Service", detail:"Controller calls service via interface. Hits AOP proxy (generated by Spring). Proxy checks: @Transactional? @Cacheable? @Async? Custom aspects?" },
        { from:"svc",    to:"repo",   label:"@Transactional proxy: BEGIN TX — calls repo", detail:"TransactionInterceptor: checks propagation (REQUIRED = join or new). Gets connection from pool (HikariCP). Begins DB transaction. Sets autoCommit=false. Calls repository." },
        { from:"repo",   to:"db",     label:"JPA findById / save → JDBC → DB query", detail:"Spring Data proxy calls EntityManager. Hibernate generates SQL. Sends via JDBC PreparedStatement to DB. HikariCP manages connection pool (default 10 connections)." },
        { from:"db",     to:"repo",   label:"ResultSet → Entity → back to service", detail:"JDBC returns ResultSet. Hibernate maps to @Entity. Returns to service. If @Cacheable: result stored in cache (Redis/Caffeine)." },
        { from:"repo",   to:"svc",    label:"TX commit — connection returned to pool", detail:"No exception: TransactionInterceptor commits. Connection returned to HikariCP pool. @TransactionalEventListener fires after commit." },
        { from:"svc",    to:"ctrl",   label:"Order object returned to controller", detail:"Service returns DTO/entity to controller. @AfterReturning AOP advice fires. Metrics recorded (Micrometer)." },
        { from:"ctrl",   to:"disp",   label:"@ResponseBody → HttpMessageConverter → JSON", detail:"HandlerAdapter sees @ResponseBody. MappingJackson2HttpMessageConverter serializes Order to JSON. Content-Type: application/json." },
        { from:"disp",   to:"filter", label:"HandlerInterceptor.postHandle() → response", detail:"postHandle() fires (response not yet committed). afterCompletion() fires after response committed. Exception resolvers handle any uncaught exception (@ExceptionHandler, @ControllerAdvice)." },
        { from:"filter", to:"http",   label:"HTTP 201 Created — response sent", detail:"Response flushed through filter chain (in reverse order). Tomcat writes HTTP response to socket. RequestContextHolder cleared. MDC cleared. Thread returned to Tomcat pool." },
      ]
    },

    architecture: {
      title: "Spring Boot Application Architecture",
      caption: "Click any component to understand its role, scope, and production impact",
      lanes: [
        {
          label: "① Web Layer",
          hint: "HTTP entry — request handling",
          nodes: [
            { id: "tomcat",  label: "Embedded Tomcat/Netty", badge: "server",      hint: "Tomcat (default, blocking NIO) or Netty (reactive, non-blocking). Configurable via server.port, server.tomcat.max-threads (200 default), server.tomcat.accept-count. For virtual threads: add spring.threads.virtual.enabled=true (Boot 3.2+)." },
            { id: "filter",  label: "Filter Chain",          badge: "Servlet API", hint: "Servlet Filters: SecurityFilter, CorsFilter, ForwardedHeaderFilter. Ordered by @Order or FilterRegistrationBean.setOrder(). Fire BEFORE DispatcherServlet — can reject without touching Spring MVC." },
            { id: "disp",    label: "DispatcherServlet",     badge: "front ctrl",  hint: "Single @Singleton servlet. Delegates to HandlerMapping, HandlerAdapter, ViewResolver, HandlerExceptionResolver. The heart of Spring MVC. Registered by DispatcherServletAutoConfiguration." },
            { id: "ctrl",    label: "@RestController",       badge: "@RequestMapping", hint: "Singleton bean. @RequestMapping methods resolve @PathVariable, @RequestParam, @RequestBody. Return value handled by HttpMessageConverter (Jackson for JSON). @ResponseStatus, ResponseEntity for headers/status." },
          ]
        },
        {
          label: "② Service Layer (AOP Proxies)",
          hint: "Business logic + cross-cutting concerns",
          nodes: [
            { id: "svc",   label: "@Service",       badge: "singleton",     hint: "Business logic. Singleton scope — MUST be stateless (no instance fields holding request state). Injected via constructor into controllers." },
            { id: "aop",   label: "AOP Proxy",      badge: "@Aspect",       hint: "Spring wraps @Transactional/@Cacheable/@Async beans with CGLIB subclass proxy (or JDK dynamic proxy for interfaces). Proxy intercepts method calls and applies advice. @Transactional on private methods DOES NOT WORK — proxy can't intercept them." },
            { id: "tx",    label: "@Transactional", badge: "REQUIRED default",hint: "TransactionInterceptor: begins TX on method entry, commits on normal return, rolls back on RuntimeException (unchecked). CHECKED exceptions do NOT roll back by default. Propagation: REQUIRED (default, join or new), REQUIRES_NEW (always new, suspends current), SUPPORTS, NOT_SUPPORTED, MANDATORY, NEVER." },
            { id: "cache", label: "@Cacheable",     badge: "Caffeine/Redis", hint: "@Cacheable(key=\"#id\"): first call hits DB, result cached. Subsequent calls return cached value. @CacheEvict: invalidate on mutation. @CachePut: always update cache. Backed by CaffeineCache (local) or RedisCacheManager (distributed)." },
          ]
        },
        {
          label: "③ Data Layer",
          hint: "Persistence and connection management",
          nodes: [
            { id: "repo",  label: "Spring Data Repository", badge: "JPA/JDBC/Mongo", hint: "@Repository proxy. Extends JpaRepository: findById, save, delete, findAll. Method name queries: findByEmailAndStatus(). @Query for JPQL/native SQL. Pagination: findAll(Pageable). Specifications for dynamic queries." },
            { id: "em",    label: "EntityManager / JPA",    badge: "Hibernate",       hint: "Hibernate EntityManager. Manages first-level cache (per-request/session). @Entity, @Id, @Column, @OneToMany, @ManyToOne. LazyLoadingException (N+1): use JOIN FETCH or @EntityGraph. @Transactional keeps EntityManager open." },
            { id: "pool",  label: "HikariCP (connection pool)", badge: "max=10 default", hint: "Fastest JDBC pool. spring.datasource.hikari.maximum-pool-size (10 default). Pool exhaustion = thread starvation if all connections held by long transactions. Monitor with /actuator/metrics/hikaricp.connections.active." },
            { id: "ds",    label: "DataSource / JDBC",      badge: "connection mgmt",  hint: "HikariDataSource wraps physical DB connections. Spring Boot auto-configures from spring.datasource.url/username/password. @Transactional takes connection from pool, holds until TX completes — size pool carefully." },
          ]
        },
        {
          label: "④ Infrastructure",
          hint: "Cross-cutting: config, health, security, observability",
          nodes: [
            { id: "autoconfig", label: "Auto-Configuration",   badge: "@Conditional",   hint: "@EnableAutoConfiguration reads META-INF/spring/AutoConfiguration.imports. Each class: @ConditionalOnClass (JPA on classpath?), @ConditionalOnMissingBean (user already defined one?). /actuator/conditions shows all decisions." },
            { id: "security",   label: "Spring Security",      badge: "filter chain",   hint: "SecurityFilterChain: UsernamePasswordAuthenticationFilter, JwtAuthFilter, BasicAuthFilter etc. antMatchers/requestMatchers. @PreAuthorize, @Secured for method security. Sessions vs stateless JWT." },
            { id: "actuator",   label: "Actuator",             badge: "observability",  hint: "/health, /metrics (Micrometer), /info, /conditions, /beans, /mappings, /env, /loggers. Prometheus scrape via /actuator/prometheus. Health indicators: DB, Redis, Kafka, disk. management.endpoints.web.exposure.include=*." },
            { id: "config",     label: "ConfigurationProperties", badge: "@ConfigurationProperties", hint: "@ConfigurationProperties(prefix=\"app.db\") with record/class. Type-safe, validated (@Validated), IDE-autocompleted config. Bound from application.yml, env vars (APP_DB_URL), Spring Cloud Config. Prefer over @Value." },
          ]
        }
      ],
      links: [
        { from: "tomcat",     to: "filter",     label: "HTTP request through filter chain",      type: "sync" },
        { from: "filter",     to: "disp",       label: "DispatcherServlet.service()",            type: "sync" },
        { from: "disp",       to: "ctrl",       label: "HandlerAdapter invokes controller",      type: "sync" },
        { from: "ctrl",       to: "aop",        label: "call hits AOP proxy first",              type: "sync" },
        { from: "aop",        to: "tx",         label: "@Transactional interceptor",             type: "sync" },
        { from: "aop",        to: "cache",      label: "@Cacheable interceptor",                 type: "sync" },
        { from: "tx",         to: "repo",       label: "transaction open → call repository",    type: "sync" },
        { from: "repo",       to: "em",         label: "EntityManager executes query",           type: "sync" },
        { from: "em",         to: "pool",       label: "acquire JDBC connection from pool",     type: "sync" },
        { from: "autoconfig", to: "pool",       label: "HikariCP auto-configured if JDBC present", type: "async" },
        { from: "security",   to: "filter",     label: "SecurityFilterChain IS a Servlet Filter", type: "sync" },
      ]
    },

    visual: function(mount) {
      const SP_TRICKS = [
        { wrong: "@Service class MyService { @Transactional private void save() { repo.save(x); } } // expected transaction", right: "@Transactional on private: CGLIB proxy can't override private → no transaction started, no exception. Make method public." },
        { wrong: "@Service class OrderSvc { Order create() { validate(); save(); } @Transactional void save() {} } // self-call", right: "this.save() bypasses proxy → no transaction. @Cacheable/@Async same issue. Extract to separate bean or use AspectJ weaving." },
        { wrong: "@Autowired MyPrototype proto; // in singleton. Expected new instance per use.", right: "Prototype injected into singleton = same instance forever. Use: @Autowired ObjectProvider<MyPrototype> proto; proto.getObject()." },
        { wrong: "@Async void process() { throw new RuntimeException(); } // assumed exception logged/thrown", right: "@Async void: exceptions silently swallowed. Use @Async Future<Void> or configure AsyncUncaughtExceptionHandler in @EnableAsync." },
      ];
      const SP_QS = [
        { q: "Why does @Transactional not work on private methods?", a: "Spring wraps beans in a CGLIB subclass proxy. The proxy can only override public/protected methods. Private methods are invisible to subclass — call goes directly to original bean, bypassing the proxy. No proxy interception = no TransactionInterceptor = no transaction. Fix: make method public, or extract to a separate Spring bean." },
        { q: "How does auto-configuration know what to load?", a: "At startup, Spring reads META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports from every JAR on classpath. Each entry is evaluated with @Conditional annotations. @ConditionalOnClass: is the class on classpath? @ConditionalOnMissingBean: has user already defined one? Only matching beans are registered. /actuator/conditions endpoint shows all decisions and reasons." },
        { q: "What happens if you inject a prototype into a singleton?", a: "The prototype is injected ONCE when the singleton is created and held forever. The singleton effectively becomes a singleton-scoped wrapper around one prototype instance — defeating the prototype scope. Fixes: inject ObjectProvider<T> and call .getObject() each time, or use @Scope(proxyMode=ScopedProxyMode.TARGET_CLASS) which creates a new prototype on each method call through the proxy." },
      ];
      mount.innerHTML = `
        <style>
          .sp-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .sp-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .sp-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
          .sp-tab { background: #21262d; border: 1px solid #30363d; color: #768390; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .sp-tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .sp-panel { display: none; }
          .sp-panel.active { display: block; }

          /* Startup animation */
          .sp-phases { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
          .sp-phase { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: #161b22; border: 1px solid #30363d; border-radius: 6px; transition: all 0.3s; }
          .sp-phase.active { border-color: #1f6feb; background: #0d1f3d; }
          .sp-phase.done { border-color: #347d39; background: #1f3d2d; }
          .sp-phase-icon { width: 20px; height: 20px; border-radius: 50%; background: #21262d; border: 1px solid #30363d; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; transition: all 0.3s; }
          .sp-phase.active .sp-phase-icon { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .sp-phase.done .sp-phase-icon { background: #57ab5a; border-color: #57ab5a; color: #fff; }
          .sp-phase-name { font-size: 11px; font-weight: bold; flex: 1; }
          .sp-phase-time { font-size: 9px; color: #768390; }
          .sp-phase.done .sp-phase-time { color: #57ab5a; }
          .sp-phase-detail { font-size: 9px; color: #768390; display: none; }
          .sp-phase.active .sp-phase-detail { display: block; color: #6cb6ff; }
          .sp-progress { height: 4px; background: #21262d; border-radius: 2px; margin-bottom: 10px; overflow: hidden; }
          .sp-progress-bar { height: 100%; background: #1f6feb; border-radius: 2px; transition: width 0.4s; width: 0; }

          /* Request flow */
          .sp-req-flow { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
          .sp-req-stage { display: flex; align-items: center; gap: 6px; padding: 5px 10px; background: #161b22; border: 1px solid #21262d; border-radius: 6px; font-size: 10px; cursor: pointer; transition: all 0.2s; }
          .sp-req-stage:hover { border-color: #30363d; background: #0d1117; }
          .sp-req-stage.lit { border-color: #e3b341; background: #3d2f1f; }
          .sp-req-dot { width: 8px; height: 8px; border-radius: 50%; background: #30363d; flex-shrink: 0; transition: background 0.3s; }
          .sp-req-stage.lit .sp-req-dot { background: #e3b341; }
          .sp-req-label { flex: 1; }
          .sp-req-ms { font-size: 9px; color: #768390; }

          /* Bean scope */
          .sp-scope-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
          .sp-scope-card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 10px; cursor: pointer; transition: border-color 0.2s; }
          .sp-scope-card:hover { border-color: #1f6feb; }
          .sp-scope-name { font-size: 12px; font-weight: bold; margin-bottom: 4px; }
          .sp-scope-tag { font-size: 9px; color: #768390; margin-bottom: 6px; }
          .sp-scope-vis { display: flex; gap: 4px; align-items: center; }
          .sp-scope-inst { width: 20px; height: 20px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; border: 1px solid; transition: all 0.3s; }

          .sp-controls { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .sp-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .sp-btn:hover { background: #30363d; }
          .sp-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 32px; margin-top: 8px; }
          .sp-info strong { color: #cdd9e5; }
          .sp-info .kw { color: #e3b341; }
          .sp-info .ok { color: #57ab5a; }
          .sp-info .warn { color: #f47067; }
        </style>
        <div class="sp-wrap">
          <div class="sp-title">Spring Boot — Interactive Lifecycle Lab</div>
          <div class="sp-tabs">
            <button class="sp-tab active" data-tab="startup">Startup Sequence</button>
            <button class="sp-tab" data-tab="request">Request Flow</button>
            <button class="sp-tab" data-tab="beans">Bean Scopes & DI</button>
            <button class="sp-tab" data-tab="tricks">⚠️ Tricks + Interview</button>
          </div>

          <!-- STARTUP PANEL -->
          <div class="sp-panel active" id="sp-panel-startup">
            <div class="sp-controls">
              <button class="sp-btn" id="sp-boot">▶ Boot Application</button>
              <button class="sp-btn" id="sp-step-boot">Step →</button>
              <button class="sp-btn" id="sp-reset-boot">↺ Reset</button>
            </div>
            <div class="sp-progress"><div class="sp-progress-bar" id="sp-prog"></div></div>
            <div class="sp-phases" id="sp-phases">
              ${[
    {icon:"🚀",name:"SpringApplication.run()",     time:"0ms",  detail:"Application type detected. Run listeners notified. Logging initialized."},
    {icon:"⚙️",name:"Environment prepared",        time:"~50ms",detail:"Properties loaded: application.yml → env vars → command-line. Profiles activated."},
    {icon:"📦",name:"ApplicationContext created",  time:"~80ms",detail:"Empty container. BeanFactory initialized. No beans yet."},
    {icon:"🔍",name:"@ComponentScan + BeanDefs",   time:"~200ms",detail:"All @Component/@Service/@Controller scanned. BeanDefinitions registered (metadata only)."},
    {icon:"🔮",name:"Auto-configuration evaluated", time:"~350ms",detail:"@Conditional evaluated. DataSourceAutoConfig, SecurityAutoConfig, JpaAutoConfig... matched beans registered."},
    {icon:"🏗️",name:"Singleton beans created",     time:"~500ms",detail:"DI graph resolved. Constructors called. @PostConstruct fired. AOP proxies created."},
    {icon:"🌐",name:"Embedded Tomcat started",     time:"~800ms",detail:"Port 8080 bound. DispatcherServlet registered. Filters configured."},
    {icon:"✅",name:"ApplicationReady — serving!", time:"~1000ms",detail:"ApplicationReadyEvent. CommandLineRunner called. /actuator/health → UP."},
  ].map((p,i) => `
                <div class="sp-phase" id="sp-phase-${i}">
                  <div class="sp-phase-icon">${p.icon}</div>
                  <div style="flex:1">
                    <div class="sp-phase-name">${p.name}</div>
                    <div class="sp-phase-detail">${p.detail}</div>
                  </div>
                  <div class="sp-phase-time">${p.time}</div>
                </div>`).join("")}
            </div>
            <div class="sp-info" id="sp-startup-info">Click "Boot Application" to animate the full Spring Boot startup sequence.</div>
          </div>

          <!-- REQUEST PANEL -->
          <div class="sp-panel" id="sp-panel-request">
            <div class="sp-controls">
              <button class="sp-btn" id="sp-send-req">Send POST /orders</button>
              <button class="sp-btn" id="sp-reset-req">↺ Reset</button>
            </div>
            <div class="sp-req-flow" id="sp-req-flow">
              ${[
    {label:"HTTP POST /orders (Tomcat thread pool)",  ms:"0ms",   detail:"Tomcat NIO connector receives HTTP/1.1 request. Thread from pool (max-threads=200) handles it."},
    {label:"SecurityFilter → JWT validated",          ms:"+2ms",  detail:"JwtAuthenticationFilter extracts Bearer token. Validates signature + expiry. Sets SecurityContext. If invalid: 401 immediately."},
    {label:"CorsFilter → origin allowed",             ms:"+1ms",  detail:"Checks Origin header against allowed origins. Adds CORS response headers. OPTIONS preflight returns 200."},
    {label:"DispatcherServlet — route lookup",        ms:"+1ms",  detail:"RequestMappingHandlerMapping finds @PostMapping(\"/orders\") in OrderController. HandlerExecutionChain built."},
    {label:"HandlerInterceptor.preHandle()",           ms:"+1ms",  detail:"Interceptors run: MDCLoggingInterceptor sets requestId, PerformanceInterceptor starts timer."},
    {label:"@RequestBody deserialized → @Valid",       ms:"+3ms",  detail:"Jackson reads JSON body. Maps to CreateOrderRequest record. @Valid triggers Bean Validation (@NotNull, @Size). 400 on constraint violation."},
    {label:"Controller → AOP proxy → @Transactional", ms:"+1ms",  detail:"orderService.create() call hits CGLIB proxy. TransactionInterceptor: REQUIRED propagation, get connection from HikariCP, BEGIN TX."},
    {label:"Service logic → Repository → JPA query",  ms:"+8ms",  detail:"Business rules validated. repo.save(entity) called. Hibernate generates INSERT SQL. PreparedStatement executed."},
    {label:"DB → ResultSet → Entity → TX commit",     ms:"+15ms", detail:"DB returns generated ID. Hibernate maps to @Entity. TransactionInterceptor commits. Connection returned to pool."},
    {label:"@ResponseBody → Jackson JSON → HTTP 201", ms:"+2ms",  detail:"Return value → MappingJackson2HttpMessageConverter → JSON bytes. Content-Type: application/json. Status 201."},
    {label:"Interceptor.afterCompletion() + MDC clear",ms:"+1ms", detail:"afterCompletion() logs request duration. MDC cleared. SecurityContext cleared. Thread returned to Tomcat pool."},
  ].map((s,i) => `
                <div class="sp-req-stage" id="sp-rs-${i}" onclick="
                  this.closest('.sp-panel').querySelectorAll('.sp-req-stage').forEach(e=>e.classList.remove('lit'));
                  this.classList.add('lit');
                  this.closest('.sp-panel').querySelector('.sp-info').innerHTML='<strong>${s.label}:</strong> ${s.detail.replace(/'/g, "\\'")}';
                ">
                  <div class="sp-req-dot"></div>
                  <div class="sp-req-label">${s.label}</div>
                  <div class="sp-req-ms">${s.ms}</div>
                </div>`).join("")}
            </div>
            <div class="sp-info" id="sp-req-info">Click "Send POST /orders" to animate the request through each layer. Or click any stage to inspect it.</div>
          </div>

          <!-- BEANS PANEL -->
          <div class="sp-panel" id="sp-panel-beans">
            <div class="sp-scope-grid">
              ${[
    { name:"singleton", tag:"default · one instance per ApplicationContext", col:"#57ab5a",
      vis:[{l:"A"},{l:"A"},{l:"A"}], shared:true,
      detail:"<strong>singleton</strong>: ONE instance shared across ALL requests and threads. Default Spring scope. MUST be stateless — no mutable instance fields. Controllers, Services, Repositories are all singleton. Created at startup (eager). Thread-safe only if stateless." },
    { name:"prototype", tag:"new instance per injection point", col:"#6cb6ff",
      vis:[{l:"A"},{l:"B"},{l:"C"}], shared:false,
      detail:"<strong>prototype</strong>: NEW instance every time requested (getBean() or @Autowired). Spring creates but does NOT manage lifecycle — @PreDestroy NOT called. Use for stateful non-thread-safe objects. WARNING: injecting prototype into singleton gives SAME prototype forever — use ObjectProvider<T>." },
    { name:"request", tag:"one per HTTP request (web only)", col:"#e3b341",
      vis:[{l:"R1"},{l:"R2"},{l:"R3"}], shared:false,
      detail:"<strong>request</strong>: New instance per HTTP request. Destroyed when response committed. Access via scoped proxy in singleton beans (@Scope(proxyMode=TARGET_CLASS)). Perfect for request-specific context: current user, correlation ID. Thread-safe — one request per thread." },
    { name:"session", tag:"one per HTTP session (web only)", col:"#b392f0",
      vis:[{l:"S1"},{l:"S1"},{l:"S2"}], shared:false,
      detail:"<strong>session</strong>: One instance per HttpSession. Lives as long as session (30min default). Use for user preferences, shopping cart. Must be Serializable for session replication. Avoid with stateless JWT auth — no server-side session needed." },
  ].map(s => `
                <div class="sp-scope-card" onclick="
                  this.closest('.sp-panel').querySelectorAll('.sp-scope-card').forEach(c=>c.style.borderColor='#30363d');
                  this.style.borderColor='${s.col}';
                  this.closest('.sp-panel').querySelector('.sp-info').innerHTML='${s.detail.replace(/'/g, "\\'")}';
                ">
                  <div class="sp-scope-name" style="color:${s.col}">@Scope("${s.name}")</div>
                  <div class="sp-scope-tag">${s.tag}</div>
                  <div class="sp-scope-vis">
                    <span style="font-size:9px;color:#768390">Req1→</span>
                    <div class="sp-scope-inst" style="color:${s.col};border-color:${s.col};background:${s.col}22">${s.vis[0].l}</div>
                    <span style="font-size:9px;color:#768390">Req2→</span>
                    <div class="sp-scope-inst" style="color:${s.col};border-color:${s.col};background:${s.col}22">${s.vis[1].l}</div>
                    <span style="font-size:9px;color:#768390">Req3→</span>
                    <div class="sp-scope-inst" style="color:${s.col};border-color:${s.col};background:${s.col}22">${s.vis[2].l}</div>
                    ${s.shared ? "<span style=\"font-size:9px;color:#57ab5a;margin-left:4px\">← same instance!</span>" : ""}
                  </div>
                </div>`).join("")}
            </div>
            <div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px;margin-bottom:8px">
              <div style="font-size:10px;font-weight:bold;color:#cdd9e5;margin-bottom:8px">DI Injection Styles — click to compare</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${[
    {name:"Constructor ✓",col:"#57ab5a",d:"<strong>Constructor injection</strong> — PREFERRED. Fields can be final (immutable). No Spring context needed for unit tests — just new Service(mockRepo). Cycles detected at startup. Explicit dependencies."},
    {name:"Setter",col:"#e3b341",d:"<strong>Setter injection</strong> — for OPTIONAL dependencies. setXxx() called after construction. Fields cannot be final. Use @Autowired(required=false) to make optional. Testable without Spring."},
    {name:"Field @Autowired",col:"#f47067",d:"<strong>Field injection</strong> — AVOID. Hidden dependencies. Requires Spring reflection to inject — cannot test without Spring context. Fields cannot be final. Hides circular dependencies."},
  ].map(s=>`<button style="background:#21262d;border:1px solid ${s.col};color:${s.col};padding:4px 10px;border-radius:4px;font-size:10px;cursor:pointer;font-family:monospace" onclick="this.closest('.sp-panel').querySelector('.sp-info').innerHTML='${s.d.replace(/'/g, "\\'")}'">${s.name}</button>`).join("")}
              </div>
            </div>
            <div class="sp-info" id="sp-bean-info">Click any scope card to understand its lifecycle, or click a DI style to compare them.</div>
          </div>

          <!-- TRICKS + INTERVIEW PANEL -->
          <div class="sp-panel" id="sp-panel-tricks">
            <div style="font-size:10px;color:#768390;margin-bottom:8px">⚠️ WRONG assumption vs ✓ CORRECT behavior — common Spring Boot gotchas</div>
            ${SP_TRICKS.map(t => `
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                <div style="background:#3d1f1f;border:1px solid #f47067;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#f47067;font-weight:bold;margin-bottom:4px">⚠️ WRONG</div>${t.wrong}
                </div>
                <div style="background:#1f3d2d;border:1px solid #57ab5a;border-radius:6px;padding:8px;font-size:10px;color:#cdd9e5">
                  <div style="color:#57ab5a;font-weight:bold;margin-bottom:4px">✓ CORRECT</div>${t.right}
                </div>
              </div>`).join("")}
            <div style="font-size:10px;color:#768390;margin:10px 0 6px">💬 Interview Flash Cards — click to reveal answer</div>
            ${SP_QS.map(q => `
              <div style="background:#161b22;border:1px solid #30363d;border-radius:6px;padding:8px;margin-bottom:6px;cursor:pointer" onclick="const a=this.querySelector('.sp-qa');a.style.display=a.style.display==='none'?'block':'none'">
                <div style="font-size:11px;color:#cdd9e5;font-weight:bold">Q: ${q.q}</div>
                <div class="sp-qa" style="display:none;font-size:10px;color:#768390;margin-top:6px;border-top:1px solid #30363d;padding-top:6px">${q.a}</div>
              </div>`).join("")}
          </div>
        </div>`;

      // Tab switching
      mount.querySelectorAll(".sp-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          mount.querySelectorAll(".sp-tab").forEach(t => t.classList.remove("active"));
          mount.querySelectorAll(".sp-panel").forEach(p => p.classList.remove("active"));
          tab.classList.add("active");
          mount.querySelector("#sp-panel-" + tab.dataset.tab).classList.add("active");
        });
      });

      // Startup animation
      let bootStep = 0, bootTimers = [];
      const phases = mount.querySelectorAll(".sp-phase");
      const prog = mount.querySelector("#sp-prog");
      const bootInfo = mount.querySelector("#sp-startup-info");

      function resetBoot() {
        bootTimers.forEach(clearTimeout); bootTimers = [];
        bootStep = 0;
        phases.forEach(p => { p.classList.remove("active","done"); });
        prog.style.width = "0";
        bootInfo.textContent = "Click \"Boot Application\" to animate the full Spring Boot startup sequence.";
      }

      function doBootStep() {
        if (bootStep >= phases.length) return;
        if (bootStep > 0) phases[bootStep-1].classList.replace("active","done");
        phases[bootStep].classList.add("active");
        prog.style.width = ((bootStep+1)/phases.length*100) + "%";
        bootInfo.innerHTML = "<strong>Phase " + (bootStep+1) + ":</strong> " + phases[bootStep].querySelector(".sp-phase-detail").textContent;
        bootStep++;
        if (bootStep === phases.length) {
          setTimeout(() => { phases[phases.length-1].classList.replace("active","done"); bootInfo.innerHTML = "<span class=\"ok\">✓ Spring Boot started!</span> All " + phases.length + " phases complete. ApplicationReadyEvent fired. Serving traffic."; }, 600);
        }
      }

      mount.querySelector("#sp-step-boot").addEventListener("click", doBootStep);
      mount.querySelector("#sp-boot").addEventListener("click", () => {
        resetBoot();
        for (let i = 0; i < phases.length; i++) {
          bootTimers.push(setTimeout(doBootStep, i * 400));
        }
      });
      mount.querySelector("#sp-reset-boot").addEventListener("click", resetBoot);

      // Request animation
      const reqStages = mount.querySelectorAll(".sp-req-stage");
      let reqTimers = [];
      mount.querySelector("#sp-send-req").addEventListener("click", () => {
        reqTimers.forEach(clearTimeout); reqTimers = [];
        reqStages.forEach(s => s.classList.remove("lit"));
        reqStages.forEach((s, i) => {
          reqTimers.push(setTimeout(() => {
            reqStages.forEach(x => x.classList.remove("lit"));
            s.classList.add("lit");
            mount.querySelector("#sp-req-info").innerHTML = "<strong>Step " + (i+1) + ":</strong> " + s.onclick.toString().match(/innerHTML='([^']+)'/)?.[1]?.replace(/\\'/g,"'") || s.querySelector(".sp-req-label").textContent;
          }, i * 350));
        });
      });
      mount.querySelector("#sp-reset-req").addEventListener("click", () => {
        reqTimers.forEach(clearTimeout); reqTimers = [];
        reqStages.forEach(s => s.classList.remove("lit"));
        mount.querySelector("#sp-req-info").textContent = "Click \"Send POST /orders\" to animate the request through each layer.";
      });
    },

    concept:
`**L1 (30s ELI5):** Spring Boot is a machine that builds your app automatically. You add JARs, it figures out what you need (database? auto-adds HikariCP). You write business code; Spring wires everything together.

**L2 (2min core):** IoC container (ApplicationContext) manages bean lifecycle. Auto-config: reads \`META-INF/spring/AutoConfiguration.imports\` from every JAR, evaluates \`@ConditionalOnClass\`/\`@ConditionalOnMissingBean\`. DI: constructor injection (preferred, immutable, testable) > setter > field. AOP: CGLIB subclass proxy wraps \`@Transactional\`/\`@Cacheable\`/\`@Async\` beans — proxy intercepts external method calls.

**L3 (10min edge cases):** \`@Transactional\` on private methods: CGLIB proxy can't override private → no transaction (silently ignored). Self-invocation \`this.method()\`: bypasses proxy → \`@Cacheable\`/\`@Async\` silently ignored. Prototype into singleton: same instance forever — use \`ObjectProvider<T>\`. \`@Async void\`: exceptions silently swallowed unless \`AsyncUncaughtExceptionHandler\` configured. \`@Transactional\`: only unchecked \`RuntimeException\` triggers rollback — checked exceptions don't by default.

**L4 (30min deep):** Bean lifecycle: instantiate → populateProperties → Aware callbacks (BeanNameAware, ApplicationContextAware) → \`@PostConstruct\` (InitializingBean.afterPropertiesSet) → in-service → \`@PreDestroy\` (DisposableBean.destroy). BeanPostProcessor intercepts all beans before/after init — AOP proxy creation happens here (AbstractAutoProxyCreator). BeanFactoryPostProcessor: modifies bean definitions before instantiation (PropertySourcesPlaceholderConfigurer resolves \`\${}\`). DispatcherServlet strategy pattern: each of HandlerMapping, HandlerAdapter, ViewResolver, HandlerExceptionResolver is a Spring bean — fully replaceable.`,
    why:
"Auto-config is **decision compression** — sensible defaults that work in 80% of cases. But it hides what's running. In senior interviews, you must be able to trace a `/actuator/conditions` report, explain AOP proxy limitations (@Transactional on private methods), and describe the full HTTP request lifecycle through DispatcherServlet.",
    example: {
      language: "java",
      code:
`// Constructor injection — preferred, immutable, testable
@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

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
        this.repo = repo; this.metrics = metrics;
    }

    Order create(CreateOrder req) {
        var saved = repo.save(new Order(req));
        metrics.counter("orders.created", "tenant", req.tenant()).increment();
        return saved;
    }
}

// Custom auto-configuration
@AutoConfiguration
@ConditionalOnClass(KafkaTemplate.class)
@ConditionalOnMissingBean(EventPublisher.class)
class KafkaEventAutoConfiguration {
    @Bean
    EventPublisher kafkaEventPublisher(KafkaTemplate<String, Object> kafka) {
        return new KafkaEventPublisher(kafka);
    }
}

// Type-safe config properties
@ConfigurationProperties(prefix = "app.order")
record OrderProperties(int maxRetries, Duration timeout, String topic) {}`,
      notes: "`@Transactional` only works on public methods via the AOP proxy. Private or package-private methods bypass the proxy — transaction never starts. Self-invocation (calling `this.method()`) also bypasses the proxy."
    },
    interview: [
      {
        question: "Why doesn't @Transactional work on private methods?",
        answer:
"Spring wraps beans in a **CGLIB subclass proxy**. The proxy intercepts method calls from OUTSIDE the bean. When you call a private method (or call `this.someMethod()` from within the class), the call goes directly to the original bean — the proxy is bypassed. No proxy = no transaction. Fix: extract to a separate bean, or use `@Transactional` via AspectJ compile-time weaving.",
        followUps: ["What is self-invocation?", "JDK proxy vs CGLIB proxy?", "How does Spring detect circular @Transactional?"]
      },
      {
        question: "How does auto-configuration know what to load?",
        answer:
"At startup, Spring reads `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` from every JAR. Each entry is a `@AutoConfiguration` class evaluated with `@Conditional` annotations: `@ConditionalOnClass` (is a class on classpath?), `@ConditionalOnMissingBean` (user already defined one?), `@ConditionalOnProperty` (feature flag). `/actuator/conditions` shows what matched and why.",
        followUps: ["How do you write a custom starter?", "What replaced spring.factories?"]
      },
      {
        question: "What happens if you inject a prototype bean into a singleton?",
        answer:
"The prototype bean is injected ONCE at singleton creation and held forever — defeating the prototype scope. The singleton holds the same prototype instance for its entire lifetime. Fix: inject `ObjectProvider<T>` and call `getObject()` each time you need a fresh instance, or use scoped proxies (`@Scope(proxyMode = TARGET_CLASS)`) which create a new prototype on each method call through the proxy.",
        followUps: ["What is a scoped proxy?", "ObjectProvider vs ApplicationContext.getBean()?"]
      }
    ],
    gotchas: [
      "@Transactional on private method: CGLIB proxy can't override private → no transaction started, no exception, silent failure.",
      "Self-invocation this.method(): bypasses the AOP proxy entirely → @Cacheable, @Async, @Transactional all silently ignored.",
      "Prototype bean injected into singleton: injected once at singleton creation time. Same instance forever — prototype scope defeated.",
      "@Async void method: exceptions are swallowed silently. Configure AsyncUncaughtExceptionHandler or return Future<T>.",
      "@Transactional checked exceptions: only RuntimeException (unchecked) rolls back by default. SQLException won't roll back unless rollbackFor=Exception.class.",
      "Lazy-loaded JPA entity outside @Transactional: LazyInitializationException. Session closed before collection accessed."
    ],
    tradeoffs: {
      pros: [
        "Boilerplate gone — a working web app in 10 lines.",
        "Strong ecosystem (Data, Security, Cloud, Actuator, Testcontainers).",
        "Production-ready: metrics, health, tracing out of the box."
      ],
      cons: [
        "Magic by default — debugging hidden bean wiring is hard.",
        "Startup time grows with classpath — investigate with --debug flag.",
        "@Transactional proxy limitations cause subtle bugs in self-invocation."
      ],
      when: "**Default for enterprise Java services.** For startup-sensitive workloads (lambdas, edge), evaluate **Quarkus** or **Micronaut** with build-time DI + GraalVM native image."
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
