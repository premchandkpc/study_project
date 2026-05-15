(function() {
  var topic = {
    id: "java-records-sealed-patterns",
    area: "java",
    title: "Records, Sealed Classes & Pattern Matching",
    tag: "Modern Java",
    tags: ["records", "sealed", "pattern matching", "switch"],
    concept:
`Modern Java (16–21) introduced:
- **Records** — immutable data carriers. Auto \`equals\`, \`hashCode\`, \`toString\`, accessors.
- **Sealed classes/interfaces** — restrict who can extend/implement → exhaustive \`switch\`.
- **Pattern matching for \`instanceof\` and \`switch\`** — decompose ADTs cleanly.
- **Records with pattern deconstruction** (Java 21) — \`if (obj instanceof Point(int x, int y))\`.
Together they enable **algebraic data types** in Java.`,
    why:
`These features let you model **state machines** and **domain events** with exhaustiveness checks at compile-time. They replace big \`if/else\` ladders and visitor patterns. Reduce defect rate when shipping protocol/event evolutions.`,
    example: {
      language: "java",
      code:
`sealed interface PaymentEvent
    permits Initiated, Authorized, Captured, Failed {}

record Initiated(String id, BigDecimal amount, String currency) implements PaymentEvent {}
record Authorized(String id, String authCode) implements PaymentEvent {}
record Captured(String id, Instant at) implements PaymentEvent {}
record Failed(String id, String reason, int retryCount) implements PaymentEvent {}

class PaymentProjection {
    State apply(State state, PaymentEvent event) {
        return switch (event) {
            case Initiated(var id, var amt, var ccy)   -> state.withAmount(amt, ccy);
            case Authorized(var id, var code)          -> state.withAuth(code);
            case Captured(var id, var at)              -> state.captured(at);
            case Failed f when f.retryCount() >= 3     -> state.markDead();
            case Failed f                              -> state.scheduleRetry();
            // exhaustive — compiler enforces because PaymentEvent is sealed
        };
    }
}`
    },
    interview: [
      {
        question: "Why are records better than Lombok @Data?",
        answer:
`Records are a **language feature** — no annotation processor, no IDE plugin friction, no \`@Builder\` collisions. They're immutable by default, work with serialization, pattern matching, and the JIT optimises them aggressively. Lombok remains useful for mutable JPA entities where records cannot be used.`,
        followUps: ["Can a record extend a class?", "Compact constructor for validation?"]
      },
      {
        question: "What does 'sealed' buy you over abstract class?",
        answer:
`Exhaustiveness checks. The compiler knows the **closed** set of permitted subtypes, so a \`switch\` without a default is verified to cover every case. Add a new event type — and every consumer breaks at compile time. That's a feature.`,
        followUps: ["Non-sealed vs sealed vs final?", "Module visibility constraints?"]
      }
    ],
    tradeoffs: {
      pros: ["ADT modelling with compile-time exhaustiveness.", "Immutability by default for records.", "Cleaner DSLs and event sourcing code."],
      cons: ["Records can't extend classes.", "Pattern matching for switch was preview through Java 20 — older JDKs lack it.", "Migration of legacy Lombok-heavy code is non-trivial."],
      when: `**Domain events, value objects, state machines.** Use classes when you need inheritance or mutable state (e.g., JPA entities).`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
