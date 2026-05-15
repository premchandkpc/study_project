(function() {
  var topic = {
    id: "java-spring-data-jpa",
    area: "java",
    title: "Spring Data JPA & Hibernate Internals",
    tag: "JPA",
    tags: ["jpa", "hibernate", "n+1", "transactions"],
    concept:
`JPA = spec, Hibernate = implementation. Key abstractions:
- **\`EntityManager\`** — persistence context, first-level cache.
- **Entity states**: transient → managed → detached → removed.
- **Repositories** — \`JpaRepository<T, ID>\` provides CRUD + paging. Custom queries via method names, \`@Query\`, or Criteria API.
- **Fetching**: \`LAZY\` (default for \`@ToMany\`) vs \`EAGER\` (default for \`@ToOne\`).
- **Transactions**: \`@Transactional\` proxies via AOP; propagation modes (REQUIRED, REQUIRES_NEW, NESTED).`,
    why:
`**N+1 selects** is the single most common production performance bug. JPA's dirty-checking on commit is invisible in code review — you can save a bug just by reading an entity. Connection pool exhaustion and long-running transactions are the second-biggest outage class.`,
    example: {
      language: "java",
      code:
`@Entity @Table(name = "orders")
class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id") User user;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    List<OrderLine> lines = new ArrayList<>();

    @Version int version;          // optimistic lock
    @CreationTimestamp Instant createdAt;
}

interface OrderRepository extends JpaRepository<Order, Long> {

    // BAD: triggers N+1 on lines
    List<Order> findByUserId(Long userId);

    // GOOD: JOIN FETCH avoids N+1
    @Query("""
        select distinct o from Order o
        left join fetch o.lines
        where o.user.id = :userId
    """)
    List<Order> findWithLinesByUserId(@Param("userId") Long userId);

    // BETTER for large result sets: entity graph + pagination
    @EntityGraph(attributePaths = {"lines"})
    Page<Order> findAllByUserId(Long userId, Pageable page);
}

@Service
class OrderQuery {
    @Transactional(readOnly = true)  // hibernate skips dirty-checking
    List<OrderDto> recent(Long userId) {
        return repo.findWithLinesByUserId(userId).stream()
            .map(OrderDto::from)
            .toList();
    }
}`,
      notes: `Always use **DTO projections** for read paths — entities pull the world. Mark read-only transactions explicitly.`
    },
    interview: [
      {
        question: "What is the N+1 select problem? How do you fix it?",
        answer:
`Iterating a lazy collection issues one query per parent. **Fix options**: (1) \`JOIN FETCH\` in JPQL, (2) \`@EntityGraph\` on the repository method, (3) batch fetching via \`@BatchSize\`/\`hibernate.default_batch_fetch_size\`, (4) DTO projection skipping entities entirely.`,
        followUps: ["Cartesian explosion with multiple fetches?", "MultipleBagFetchException — why?"]
      },
      {
        question: "Why is @Transactional sometimes ignored?",
        answer:
`AOP proxies wrap calls **from outside** the bean. A self-invocation (\`this.save()\`) bypasses the proxy → no transaction. Fix by injecting the bean into itself, calling via the application context, or using AspectJ weaving.`,
        followUps: ["What is propagation REQUIRES_NEW?", "Why does @Transactional + private method fail?"]
      },
      {
        question: "Optimistic vs pessimistic locking?",
        answer:
`**Optimistic** uses a \`@Version\` column; on commit, Hibernate adds \`WHERE version = ?\`. Cheap, fails fast under contention. **Pessimistic** uses \`SELECT ... FOR UPDATE\`. Use optimistic when conflicts are rare (web apps), pessimistic when contention is high (financial postings).`,
        followUps: ["What is the difference between PESSIMISTIC_READ and PESSIMISTIC_WRITE?"]
      }
    ],
    tradeoffs: {
      pros: ["Strong type safety.", "Repository abstraction is testable.", "Built-in caching + dirty tracking."],
      cons: ["N+1 and lazy-loading traps.", "Schema migrations live separately (Flyway/Liquibase).", "Heavy reflection — cold start slower."],
      when: `**JPA** when domain model has rich relationships and you control schema. **jOOQ/MyBatis** when SQL ownership matters (analytics, reporting). **JDBI/Spring JdbcClient** for thin services where Hibernate is overkill.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
