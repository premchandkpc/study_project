(function() {
  var topic = {
    id: "java-webflux",
    area: "java",
    title: "Reactive Spring (WebFlux) & Project Reactor",
    tag: "Reactive",
    tags: ["webflux", "reactor", "mono", "flux", "backpressure"],
    concept:
`Spring WebFlux is a non-blocking, reactive web stack built on **Project Reactor** (\`Mono<T>\` for 0/1 results, \`Flux<T>\` for 0..N). Backed by Netty (default), it uses a **small event-loop** to multiplex thousands of connections.
**Backpressure** is the contract: subscribers signal demand (\`request(n)\`); producers must not overrun. \`onBackpressureBuffer\`, \`onBackpressureDrop\`, \`limitRate\` shape behaviour.`,
    why:
`Two classic fits: **streaming** (Server-Sent Events, WebSockets, chunked downloads) and **service aggregators** that fan-out to many slow APIs. With **virtual threads** in Java 21+, the case for WebFlux shrinks for typical request/response services — but reactive remains best for streaming and high-fanout aggregation.`,
    example: {
      language: "java",
      code:
`@RestController
@RequiredArgsConstructor
class PriceController {
    private final WebClient client;     // reactive HTTP

    // Aggregate quotes from 3 vendors in parallel, return fastest 2
    @GetMapping(value = "/quote/{sku}", produces = APPLICATION_NDJSON_VALUE)
    Flux<Quote> quote(@PathVariable String sku) {
        Flux<Quote> a = call("https://vendor-a/quote/" + sku);
        Flux<Quote> b = call("https://vendor-b/quote/" + sku);
        Flux<Quote> c = call("https://vendor-c/quote/" + sku);

        return Flux.merge(a, b, c)
            .timeout(Duration.ofMillis(800))
            .onErrorResume(e -> Flux.empty())   // partial degradation
            .take(2)
            .doOnNext(q -> Metrics.counter("quote.served", "vendor", q.vendor()).increment());
    }

    private Flux<Quote> call(String url) {
        return client.get().uri(url).retrieve().bodyToFlux(Quote.class)
            .subscribeOn(Schedulers.parallel());
    }
}`
    },
    interview: [
      {
        question: "Mono vs Flux vs CompletableFuture?",
        answer:
`\`CompletableFuture\` is a single async result, no backpressure, eager. \`Mono\` is lazy single result with backpressure. \`Flux\` is 0..N stream with backpressure and rich operators (\`window\`, \`buffer\`, \`groupBy\`). Reactor pipelines compose cleaner for streaming.`,
        followUps: ["Hot vs cold publisher?", "When does subscribeOn vs publishOn matter?"]
      },
      {
        question: "How does backpressure actually flow?",
        answer:
`The subscriber calls \`request(n)\`; the publisher emits up to \`n\` items. Operators in the middle may transform demand (e.g., \`flatMap\` defaults to \`Queues.SMALL_BUFFER_SIZE\` = 256). Misconfiguring buffer sizes causes either OOM or starvation under load.`,
        followUps: ["onBackpressureBuffer strategies?", "How do you size flatMap concurrency?"]
      }
    ],
    tradeoffs: {
      pros: ["Few threads handle massive connection counts.", "First-class backpressure.", "Composable streaming operators."],
      cons: ["Steep learning curve.", "Stack traces are noisy.", "\`ThreadLocal\` requires context propagation."],
      when: `**Streaming, SSE, WebSocket, high-fanout aggregators.** For CRUD services in Java 21+, **virtual threads + MVC** is simpler and equally scalable.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
