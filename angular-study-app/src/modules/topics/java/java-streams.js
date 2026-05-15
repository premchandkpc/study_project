(function() {
  var topic = {
    id: "java-streams",
    area: "java",
    title: "Streams API, Collectors & Lazy Evaluation",
    tag: "Streams",
    tags: ["streams", "collectors", "lambda", "functional"],
    concept:
`A **Stream** is a lazy, pull-based pipeline of operations over a Spliterator source.
- **Intermediate ops** (\`filter\`, \`map\`, \`flatMap\`) are lazy; nothing runs until a **terminal op** (\`collect\`, \`reduce\`, \`forEach\`).
- **Stateless** ops fuse and parallelise well; **stateful** ops (\`sorted\`, \`distinct\`) buffer.
- \`parallelStream()\` uses common \`ForkJoinPool\`; tune with \`-Djava.util.concurrent.ForkJoinPool.common.parallelism\`.`,
    why:
`Declarative pipelines reduce bug surface vs hand-written loops, but **\`parallelStream\`** is a footgun on shared pools (one slow task blocks every consumer). In data pipelines, \`Collectors.groupingBy\` + \`mapping\` replaces 30 lines of imperative aggregation.`,
    example: {
      language: "java",
      code:
`import java.util.*;
import java.util.stream.*;
import static java.util.stream.Collectors.*;

record Order(String userId, String product, int qty, double price) {}

public class StreamsDemo {
    public static void main(String[] args) {
        List<Order> orders = List.of(
            new Order("u1", "A", 2, 10),
            new Order("u1", "B", 1, 50),
            new Order("u2", "A", 5, 10),
            new Order("u3", "C", 3, 20)
        );

        // Revenue per user, sorted desc
        Map<String, Double> revenue = orders.stream()
            .collect(groupingBy(Order::userId,
                summingDouble(o -> o.qty() * o.price())));

        revenue.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .forEach(e -> System.out.println(e.getKey() + " = $" + e.getValue()));

        // Top-K by spend using teeing (Java 12+)
        var stats = orders.stream().collect(teeing(
            summingDouble(o -> o.qty() * o.price()),
            counting(),
            (sum, count) -> Map.of("total", sum, "count", (double) count)
        ));
        System.out.println(stats);
    }
}`,
      notes: `Avoid \`parallelStream\` for short pipelines or when tasks share I/O. Use \`Collectors.toUnmodifiableMap\` for immutable results.`
    },
    interview: [
      {
        question: "When NOT to use parallel streams?",
        answer:
`Three red flags: (a) tasks share a downstream resource (DB, HTTP), causing pool starvation since the common FJP is global; (b) the pipeline is short (< 10k elements) — splitting overhead dominates; (c) ordering matters (\`findFirst\` semantics differ from \`findAny\`).`,
        followUps: ["What is split-on-Spliterator cost?", "Custom ForkJoinPool?"]
      },
      {
        question: "Difference between map and flatMap?",
        answer:
`\`map\` is 1→1, returns \`Stream<R>\`. \`flatMap\` is 1→N, returns \`Stream<R>\` by flattening \`Stream<Stream<R>>\`. Use \`flatMap\` to expand collections, parse multi-line input, or chain optional/empty results.`,
        followUps: ["flatMap with Optional?", "Lazy flatMap and short-circuit ops?"]
      }
    ],
    tradeoffs: {
      pros: ["Declarative, composable.", "Stream fusion avoids intermediate collections.", "Collectors framework covers 90% of aggregation needs."],
      cons: ["Debugging stack traces are opaque.", "Parallel streams share the global FJP.", "Stateful ops break lazy fusion."],
      when: `Default to **sequential streams**. Drop to **for-loops** when you need early-exit complex state. Use **parallelStream** only for CPU-bound, large, side-effect-free pipelines on dedicated pools.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
