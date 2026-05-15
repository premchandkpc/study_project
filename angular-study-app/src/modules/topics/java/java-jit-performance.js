(function() {
  var topic = {
    id: "java-jit-performance",
    area: "java",
    title: "JIT, Escape Analysis & Java Performance",
    tag: "Perf",
    tags: ["jit", "c1", "c2", "graal", "perf"],
    concept:
`HotSpot uses **tiered compilation**: interpreter → C1 (fast, low-opt) → C2 (slow, high-opt). **GraalVM** is an alternative C2. JIT optimisations include:
- **Inlining** — bounded by \`MaxInlineLevel\`, hot methods inline aggressively.
- **Escape Analysis** — objects that don't escape a method can be allocated on the stack (scalar replacement).
- **Loop unrolling, vectorisation** (Vector API in Java 17+).
- **Tiered profiling** drives speculative optimisations that can deoptimise.`,
    why:
`Microbenchmarks lie unless you use **JMH** and account for warm-up, dead code elimination, and on-stack replacement. Production perf wins usually come from **reducing allocation** and **branch predictability**, not algorithmic changes.`,
    example: {
      language: "java",
      code:
`// JMH benchmark — the only correct way to microbenchmark Java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Thread) @Fork(2) @Warmup(iterations = 5) @Measurement(iterations = 10)
public class StringConcatBench {
    String a = "hello"; String b = "world"; int n = 42;

    @Benchmark public String plus()        { return a + " " + b + " " + n; }
    @Benchmark public String builder()     {
        return new StringBuilder().append(a).append(' ').append(b).append(' ').append(n).toString();
    }
    @Benchmark public String formatted()   { return String.format("%s %s %d", a, b, n); }

    public static void main(String[] args) throws Exception {
        org.openjdk.jmh.Main.main(args);
    }
}
// Outcome on JDK 21: 'plus' ≈ builder (invokedynamic indy + StringConcatFactory),
// 'formatted' is 8–10x slower due to parsing.`
    },
    interview: [
      {
        question: "What is escape analysis? How can you check if it fires?",
        answer:
`HotSpot proves an object doesn't escape the method/thread → stack-allocates or scalar-replaces it. Verify with \`-XX:+UnlockDiagnosticVMOptions -XX:+PrintEscapeAnalysis -XX:+PrintEliminateAllocations\`. Even better: profile allocation rate with \`async-profiler --alloc\`.`,
        followUps: ["Why do anonymous classes break EA?", "Lambda vs anonymous class capture?"]
      },
      {
        question: "Why are microbenchmarks usually wrong?",
        answer:
`Three classic mistakes: (1) no warm-up — measuring interpreter code; (2) dead-code elimination — JIT removes \`unused = compute()\`; (3) constant folding — inputs become compile-time constants. Use **JMH** with \`Blackhole.consume\`, \`@State\`, multiple forks, and report distributions.`,
        followUps: ["What is on-stack replacement (OSR)?", "Bias and bimodal distributions in benchmarks?"]
      }
    ],
    tradeoffs: {
      pros: ["JIT specialises to actual call sites — often beats AOT.", "Allocation cheap thanks to TLABs + bump pointer.", "Profilers (async-profiler, JFR) are best-in-class."],
      cons: ["Warm-up cost matters for short-lived processes.", "Deoptimisation cliffs from megamorphic call sites.", "C2 bugs are rare but real — pin JDK versions in prod."],
      when: `**HotSpot** for long-running services. **GraalVM native-image** for CLIs, lambdas, sidecars where startup time dominates.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
