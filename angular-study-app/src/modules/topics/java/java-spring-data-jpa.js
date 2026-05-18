(function() {
  var topic = {
    id: "java-spring-data-jpa",
    area: "java",
    title: "Spring Data JPA & Hibernate Internals",
    tag: "JPA",
    tags: ["jpa", "hibernate", "n+1", "transactions", "entity-lifecycle"],
    concept:
`**L1 (30s):** JPA maps Java objects to SQL rows. Hibernate is the impl. N+1 is the #1 production bug. Always think about queries.
**L2 (2min):** EntityManager = persistence context (first-level cache). Entity states: transient → managed → detached → removed. Dirty checking on commit saves changes automatically. Repositories abstract CRUD + paging. Fetching: LAZY (default @ToMany) vs EAGER (default @ToOne).
**L3 (10min):** N+1: iterating a lazy collection issues 1 query per parent. Fix: JOIN FETCH, @EntityGraph, @BatchSize. @Transactional works via AOP proxy — self-invocation bypasses it. read-only transactions skip dirty checking (big perf win). @Version = optimistic lock.
**L4 (30min):** Hibernate 2nd-level cache (Ehcache/Redis) is per-entity keyed by PK. QueryCache caches result sets. First-level cache is per-session/transaction. Connection pool (HikariCP default): max-lifetime, connection-timeout, leak-detection. MultipleBagFetchException: can't JOIN FETCH 2+ bag collections — use Set or split queries.`,
    why:
"**Production incident:** Checkout service queries orders with 10 line items each. findByUserId returns 100 orders → Hibernate lazily loads lines for each = 101 queries. With 50 concurrent users = 5050 DB queries/second. DB CPU spikes, latency p99 = 8s. Fix: JOIN FETCH drops to 1 query. Response time: 80ms.",
    flow: {
      title: "Entity Lifecycle: transient → managed → detached → removed",
      caption: "Click each state to see what Hibernate does",
      nodes: [
        { id:"new",      label:"new Order()",      hint:"Transient — JPA knows nothing about it yet" },
        { id:"persist",  label:"persist(order)",   hint:"Managed — entity tracked in persistence context" },
        { id:"commit",   label:"tx.commit()",       hint:"Dirty checking fires — SQL INSERT/UPDATE auto-generated" },
        { id:"detach",   label:"detach() / close()",hint:"Detached — changes not tracked, lazy loads fail" },
        { id:"remove",   label:"remove(order)",     hint:"Removed — DELETE on commit" }
      ],
      steps: [
        { path:["new"],          label:"Transient: no ID, not tracked",    detail:"new Order() — just a Java object, JPA unaware" },
        { path:["new","persist"],label:"persist() → Managed",              detail:"em.persist(order) — entity enters persistence context, gets ID from sequence" },
        { path:["persist","commit"],label:"commit → SQL flush",            detail:"Hibernate compares entity snapshot to current state → generates INSERT/UPDATE" },
        { path:["commit","detach"],label:"detach/session close",           detail:"Entity leaves context. Future changes ignored. Lazy loads throw LazyInitializationException" },
        { path:["persist","remove"],label:"remove → Managed→Removed",      detail:"em.remove(order) — scheduled for DELETE on commit" }
      ]
    },
    uml: {
      title: "N+1 vs JOIN FETCH — query count comparison",
      scenario: "Loading 5 orders with their line items — bad vs good",
      actors: [
        { id:"code",  label:"Service\nCode",          hint:"@Transactional read method" },
        { id:"repo",  label:"OrderRepository",         hint:"Spring Data JPA proxy" },
        { id:"hib",   label:"Hibernate\nSession",      hint:"persistence context + dirty tracker" },
        { id:"pool",  label:"HikariCP\nPool",          hint:"connection pooling" },
        { id:"db",    label:"PostgreSQL",              hint:"actual DB" }
      ],
      messages: [
        { from:"code", to:"repo", label:"findByUserId(id)",                    detail:"BAD: lazy fetch — returns Order entities with unloaded lines" },
        { from:"repo", to:"hib",  label:"SELECT * FROM orders WHERE user=?",   detail:"1 query — loads 5 Order rows" },
        { from:"hib",  to:"pool", label:"borrow connection",                   detail:"Gets conn from HikariCP pool" },
        { from:"pool", to:"db",   label:"SELECT * FROM orders WHERE user=?",   detail:"Query 1" },
        { from:"db",   to:"hib",  label:"5 Order rows",                        detail:"5 Orders loaded, lines NOT loaded yet (LAZY)" },
        { from:"code", to:"hib",  label:"order.getLines() × 5",                detail:"BAD: each access triggers a new SELECT — 5 more queries" },
        { from:"hib",  to:"db",   label:"SELECT * FROM lines WHERE order_id=? × 5", detail:"N+1: 5 extra queries, one per order" },
        { from:"code", to:"repo", label:"findWithLinesByUserId(id) — JOIN FETCH", detail:"GOOD: JPQL JOIN FETCH loads everything in 1 query" }
      ]
    },
    architecture: {
      title: "Spring Data JPA stack",
      caption: "Layers from your code to the DB",
      lanes: [
        {
          label:"Repository Layer", hint:"Spring Data abstraction",
          nodes:[
            {id:"repo",  label:"JpaRepository<T,ID>",  badge:"Spring Data",  hint:"CRUD + paging + sorting — no boilerplate"},
            {id:"query", label:"@Query / @EntityGraph",  badge:"JPQL/HQL",    hint:"Custom JPQL, native SQL, EntityGraph for fetch tuning"}
          ]
        },
        {
          label:"EntityManager / Session", hint:"Hibernate core",
          nodes:[
            {id:"em",    label:"EntityManager",          badge:"JPA spec",    hint:"1st-level cache per transaction; dirty checking on flush"},
            {id:"proxy", label:"@Transactional AOP proxy",badge:"AOP",        hint:"Proxy wraps bean methods — self-call bypasses proxy!"}
          ]
        },
        {
          label:"Connection Pool", hint:"HikariCP",
          nodes:[
            {id:"hikari",label:"HikariCP",               badge:"pool",        hint:"default: max-pool-size=10. Long tx holds connection = pool starvation"},
            {id:"lock",  label:"Optimistic / Pessimistic",badge:"@Version",   hint:"@Version = optimistic; LOCK IN SHARE MODE = pessimistic"}
          ]
        },
        {
          label:"Database", hint:"SQL execution",
          nodes:[
            {id:"sql",   label:"SQL Query",              badge:"EXPLAIN",     hint:"Always EXPLAIN ANALYZE slow queries — missing index common culprit"},
            {id:"cache2",label:"2nd-Level Cache",        badge:"optional",    hint:"Ehcache/Redis per-entity — invalidation is hard, use with care"}
          ]
        }
      ],
      links:[
        {from:"repo",  to:"em",     label:"delegates to EntityManager", type:"sync"},
        {from:"proxy", to:"em",     label:"tx boundary",                type:"sync"},
        {from:"em",    to:"hikari", label:"borrow connection on flush",  type:"sync"},
        {from:"hikari",to:"sql",    label:"execute SQL",                 type:"sync"}
      ]
    },
    visual: function(mount) {
      var S = {tab:0, qi:0};
      var TRICKS = [
        {wrong:"@Transactional on private method works just fine",
          right:"AOP proxy only intercepts public methods called from OUTSIDE. Private methods and self-invocation (this.method()) bypass the proxy — no transaction."},
        {wrong:"Lazy loading is always safe inside @Transactional",
          right:"Only safe while session is open (within the transaction). After the method returns, session closes. Accessing lazy collection outside = LazyInitializationException."},
        {wrong:"EAGER fetch is safer than LAZY for performance",
          right:"EAGER on @ManyToMany means EVERY query loads all related entities — even when you don't need them. This is usually catastrophically slow. Always start LAZY."},
        {wrong:"findAll() then filter in Java is fine for small tables",
          right:"Small tables grow. \"Small\" means 100K rows at 3am after 6 months. Always filter in SQL. Database indexes are useless if you filter in Java."}
      ];
      var QS = [
        {q:"What is the N+1 problem and 3 ways to fix it?",
          a:"N+1: loading N parents then issuing 1 query per parent to load children = N+1 queries total. Fix: (1) JOIN FETCH in JPQL, (2) @EntityGraph on repository method, (3) @BatchSize(size=100) for batch loading."},
        {q:"Why is @Transactional sometimes silently ignored?",
          a:"Spring AOP wraps the bean in a proxy. Calls through the proxy get transaction management. Self-invocation (this.method()) bypasses the proxy → no transaction. Fix: inject self via @Autowired or use AspectJ weaving."},
        {q:"Optimistic vs pessimistic locking — when to use each?",
          a:"Optimistic: @Version column, checked on commit. Zero contention on read. Fails with OptimisticLockException on conflict — caller retries. Use when conflicts are rare. Pessimistic: SELECT FOR UPDATE, holds DB lock. Use when conflicts are frequent (financial ledgers)."}
      ];
      function css(){
        if(document.getElementById("jpa-style"))return;
        var s=document.createElement("style");s.id="jpa-style";
        s.textContent=`
.jpa{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:10px;overflow:hidden}
.jpa-tabs{display:flex;background:#161b22;border-bottom:1px solid #30363d}
.jpa-tab{flex:1;padding:10px;border:none;background:none;color:#8b949e;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;border-bottom:2px solid transparent;transition:all .15s}
.jpa-tab.on{color:#f1b150;border-bottom-color:#f1b150}
.jpa-body{padding:18px;min-height:320px}
.jpa-q-bar{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.jpa-q-btn{padding:6px 12px;border-radius:5px;border:2px solid #30363d;background:#21262d;color:#8b949e;font-size:11px;cursor:pointer;font-family:inherit;font-weight:600;transition:all .15s}
.jpa-q-btn.bad{border-color:#f85149;background:#da363622;color:#f85149}
.jpa-q-btn.good{border-color:#3fb950;background:#23863622;color:#3fb950}
.jpa-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;line-height:1.6;margin-top:10px}
.jpa-trick{background:#161b22;border-radius:8px;padding:12px;margin-bottom:8px}
.jpa-bad{background:#da363622;border:1px solid #f8514966;border-radius:6px;padding:8px;font-size:12px;color:#f85149;margin-bottom:5px}
.jpa-bad::before{content:"⚠️ Wrong: ";font-weight:700}
.jpa-good{background:#23863622;border:1px solid #3fb95066;border-radius:6px;padding:8px;font-size:12px;color:#3fb950}
.jpa-good::before{content:"✓ Right: ";font-weight:700}
.jpa-qbox{background:#1f6feb22;border:1px solid #58a6ff66;border-radius:8px;padding:14px;text-align:center}
.jpa-qtext{font-size:13px;color:#58a6ff;font-weight:700;margin-bottom:12px}
.jpa-ans{background:#161b22;border:1px solid #3fb95066;border-radius:8px;padding:12px;font-size:12px;color:#3fb950;margin-top:10px;display:none;text-align:left}
.jpa-btn{background:#238636;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit}
.jpa-btn2{background:#f1b150;color:#0d1117;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;margin-left:8px}
        `;
        document.head.appendChild(s);
      }
      var queries=[
        {label:"findByUserId()",     type:"bad",  count:6, detail:"1 query for orders + 5 lazy loads for lines = N+1 problem"},
        {label:"JOIN FETCH",         type:"good", count:1, detail:"1 query with JOIN FETCH orders.lines — everything in one round trip"},
        {label:"@EntityGraph",       type:"good", count:1, detail:"@EntityGraph(attributePaths={\"lines\"}) — same result, declared on method"},
        {label:"@BatchSize(100)",     type:"ok",   count:2, detail:"2 queries: 1 for orders, 1 batch for all lines WHERE order_id IN (1,2,3,4,5)"}
      ];
      var selQ=0;
      function render(){
        css();
        mount.innerHTML="<div class=\"jpa\"><div class=\"jpa-tabs\">"
          +`<button class="jpa-tab ${S.tab===0?"on":""}" id="jt0">💣 N+1 Demo</button>`
          +`<button class="jpa-tab ${S.tab===1?"on":""}" id="jt1">🔄 Entity Lifecycle</button>`
          +`<button class="jpa-tab ${S.tab===2?"on":""}" id="jt2">⚠️ Tricky + Interview</button>`
          +"</div><div class=\"jpa-body\" id=\"jpa-body\"></div></div>";
        mount.querySelector("#jt0").onclick=()=>{S.tab=0;render();};
        mount.querySelector("#jt1").onclick=()=>{S.tab=1;render();};
        mount.querySelector("#jt2").onclick=()=>{S.tab=2;render();};
        renderBody();
      }
      function renderBody(){
        var b=mount.querySelector("#jpa-body");
        if(S.tab===0){
          b.innerHTML="<div style=\"font-size:11px;color:#8b949e;margin-bottom:10px\">Loading 5 orders with line items — compare query counts</div>"
            +"<div class=\"jpa-q-bar\">"+queries.map((q,i)=>`<button class="jpa-q-btn ${selQ===i?q.type:""}" id="jqb${i}">${q.label}</button>`).join("")+"</div>"
            +"<div style=\"display:flex;gap:12px;align-items:center;margin-bottom:12px\">"
            +`<div style="font-size:32px;font-weight:800;color:${queries[selQ].type==="bad"?"#f85149":"#3fb950"}">${queries[selQ].count}</div>`
            +`<div><div style="font-size:11px;color:#8b949e;text-transform:uppercase">SQL queries</div><div style="font-size:13px;font-weight:700;color:${queries[selQ].type==="bad"?"#f85149":"#3fb950"}">${queries[selQ].type==="bad"?"N+1 Problem!":"Efficient"}</div></div>`
            +`<div style="flex:1;background:#21262d;border-radius:6px;height:12px;overflow:hidden"><div style="height:100%;width:${Math.min(100,queries[selQ].count*16)}%;background:${queries[selQ].type==="bad"?"#f85149":"#3fb950"};transition:width .3s"></div></div>`
            +`</div><div class="jpa-info">${queries[selQ].detail}</div>`;
          queries.forEach((_,i)=>{mount.querySelector("#jqb"+i).onclick=()=>{selQ=i;renderBody();};});
        } else if(S.tab===1){
          var states=[
            {label:"new Order()",     color:"#8b949e", info:"Transient: just a Java object. JPA knows nothing. No DB row, no ID."},
            {label:"em.persist()",    color:"#1f6feb", info:"Managed: tracked in persistence context. Gets ID from DB sequence on flush."},
            {label:"flush/commit",    color:"#3fb950", info:"SQL generated: Hibernate diffs entity vs snapshot → INSERT/UPDATE. @Version incremented."},
            {label:"em.detach()",     color:"#f1b150", info:"Detached: changes ignored. Lazy collections throw LazyInitializationException if accessed."},
            {label:"em.merge()",      color:"#a371f7", info:"Re-managed: detached entity reattached. Returns new managed instance — use the returned object!"},
            {label:"em.remove()",     color:"#f85149", info:"Removed: DELETE queued for next flush. entity transitions to transient after."}
          ];
          var si=0;
          var drawEL = function(){
            b.innerHTML="<div style=\"display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px\">"+states.map((st,i)=>`<div style="padding:6px 10px;border-radius:5px;background:${si===i?st.color+"33":"#21262d"};border:2px solid ${si===i?st.color:"#30363d"};color:${si===i?st.color:"#8b949e"};font-size:11px;cursor:pointer;font-family:inherit;font-weight:600" id="els${i}">${st.label}</div>`).join("")+"</div>"
              +`<div class="jpa-info">${states[si].info}</div>`
              +`<div style="margin-top:10px;display:flex;gap:8px"><button class="jpa-btn" id="elP">◀</button><button class="jpa-btn2" id="elN">Next ▶</button><span style="font-size:11px;color:#8b949e;margin-left:auto;align-self:center">${si+1}/${states.length}</span></div>`;
            states.forEach((_,i)=>{mount.querySelector("#els"+i).onclick=()=>{si=i;drawEL();};});
            mount.querySelector("#elP").onclick=()=>{si=Math.max(0,si-1);drawEL();};
            mount.querySelector("#elN").onclick=()=>{si=Math.min(states.length-1,si+1);drawEL();};
          };
          drawEL();
        } else {
          b.innerHTML="<div style=\"font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin-bottom:10px\">Common Mistakes</div>"
            +TRICKS.map((t,i)=>`<div class="jpa-trick"><div style="font-size:10px;color:#8b949e;margin-bottom:5px">Trap ${i+1}</div><div class="jpa-bad">${t.wrong}</div><div class="jpa-good">${t.right}</div></div>`).join("")
            +"<div style=\"font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin:14px 0 10px\">Interview Mode</div>"
            +`<div class="jpa-qbox"><div class="jpa-qtext" id="jpa-qt">${QS[S.qi].q}</div><button class="jpa-btn" id="jpa-rev">Reveal Answer</button><button class="jpa-btn2" id="jpa-nxt">Next Q ▶</button><div class="jpa-ans" id="jpa-an">${QS[S.qi].a}</div></div>`;
          mount.querySelector("#jpa-rev").onclick=()=>{mount.querySelector("#jpa-an").style.display="block";};
          mount.querySelector("#jpa-nxt").onclick=()=>{S.qi=(S.qi+1)%QS.length;renderBody();};
        }
      }
      render();
    },
    gotchas: [
      "@Transactional on private / self-invoked methods = silently ignored (proxy bypass)",
      "Lazy collections accessed outside transaction = LazyInitializationException at runtime",
      "EAGER @ManyToMany loads all related entities on EVERY query — catastrophic on large tables",
      "em.merge() returns a NEW managed instance — don't use the original detached object after",
      "MultipleBagFetchException: can't JOIN FETCH 2+ collections — use Set or split into 2 queries",
      "readOnly=true transaction skips dirty checking — always set on read methods for free perf gain",
      "@Version optimistic lock: OptimisticLockException thrown on commit, not on read"
    ],
    example: {
      language: "java",
      code:
`@Entity @Table(name="orders")
class Order {
    @Id @GeneratedValue Long id;
    @ManyToOne(fetch=FetchType.LAZY) User user;
    @OneToMany(mappedBy="order", cascade=CascadeType.ALL)
    List<OrderLine> lines = new ArrayList<>();
    @Version int version; // optimistic lock
}

interface OrderRepository extends JpaRepository<Order, Long> {
    // BAD: N+1 — lines loaded lazily one by one
    List<Order> findByUserId(Long userId);

    // GOOD: single JOIN FETCH query
    @Query("select distinct o from Order o left join fetch o.lines where o.user.id = :uid")
    List<Order> findWithLines(@Param("uid") Long uid);
}

@Service
class OrderService {
    @Transactional(readOnly = true) // skip dirty checking
    List<OrderDto> recent(Long uid) {
        return repo.findWithLines(uid).stream().map(OrderDto::from).toList();
    }
}`
    },
    interview: [
      { question:"N+1 select problem — what is it, 3 fixes?",
        answer:"N+1: loading N parents + 1 extra query per parent for children = N+1 total queries. Fix: (1) JOIN FETCH in JPQL, (2) @EntityGraph on repository, (3) @BatchSize(100) for batch loading. Bonus: DTO projection skips entity loading entirely.",
        followUps:["Cartesian explosion with multiple fetches?","MultipleBagFetchException — why?"] },
      { question:"Why is @Transactional sometimes ignored?",
        answer:"Spring AOP creates a proxy. Only external calls go through the proxy. `this.method()` bypasses it → no transaction. Fix: inject self (@Autowired), use ApplicationContext.getBean(), or AspectJ weaving.",
        followUps:["REQUIRES_NEW propagation use case?","Why does @Transactional + private fail?"] },
      { question:"Optimistic vs pessimistic locking?",
        answer:"Optimistic: @Version column, checked on commit via WHERE version=?. Zero overhead on reads. Fails with OptimisticLockException — caller retries. Pessimistic: SELECT FOR UPDATE — holds DB lock. Use optimistic when conflicts rare (web apps), pessimistic when high contention (financial).",
        followUps:["PESSIMISTIC_READ vs PESSIMISTIC_WRITE?","How to retry on OptimisticLockException?"] }
    ],
    tradeoffs: {
      pros:["Strong type safety","Repository abstraction is testable","Dirty tracking reduces boilerplate","readOnly transactions free performance gain"],
      cons:["N+1 and lazy loading traps","Schema migrations separate (Flyway/Liquibase)","Heavy reflection — cold start slower","MultipleBagFetchException surprises"],
      when:"**JPA** for rich domain models with relationships. **jOOQ/MyBatis** when SQL ownership matters. **JDBI/JdbcClient** for thin services."
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
