(function() {
  var topic = {
    id: "java-streams",
    area: "java",
    title: "Streams API, Collectors & Lazy Evaluation",
    tag: "Streams",
    tags: ["streams", "collectors", "lambda", "functional", "lazy"],

    flow: {
      title: 'Stream Pipeline — Lazy Pull Model (nothing runs until terminal op)',
      caption: 'Watch how a pipeline is BUILT lazily, then PULLED by the terminal op',
      nodes: [
        { id: 'source',    label: 'Source',          hint: 'list.stream() — wraps in Spliterator, zero elements touched' },
        { id: 'filter',    label: 'filter(pred)',     hint: 'Lazy: stores predicate, returns new Stream wrapper' },
        { id: 'map',       label: 'map(fn)',          hint: 'Lazy: stores mapper, returns new Stream wrapper' },
        { id: 'terminal',  label: 'collect() ⚡',    hint: 'TERMINAL: triggers entire pipeline execution' },
        { id: 'pull',      label: 'tryAdvance()',     hint: 'Pull one element at a time through ALL stages' },
        { id: 'result',    label: 'Result',           hint: 'Collector accumulates final output' },
      ],
      steps: [
        {
          path: ['source'],
          label: 'list.stream() — SOURCE created, nothing runs',
          detail: 'list.stream() creates an ArraySpliterator wrapping the list. Zero elements touched. Zero predicates called. Just a pipeline descriptor object in heap. Think of it like defining a SQL query — execution hasn\'t started.'
        },
        {
          path: ['source','filter'],
          label: 'filter(pred) — LAZY: predicate stored, not called',
          detail: 'filter() returns a new StatelessOp stream wrapping the source. Predicate stored as a lambda. No elements touched. You can chain 100 filters without touching a single element. Like adding WHERE clauses to a SQL query.'
        },
        {
          path: ['filter','map'],
          label: 'map(fn) — LAZY: mapper stored, not called',
          detail: 'map() wraps the filtered stream. FUSION: for stateless ops (filter + map), JVM can fuse them into a single loop — element enters filter, if passes goes straight to map, no intermediate List created. Like SQL predicate pushdown.'
        },
        {
          path: ['map','terminal'],
          label: 'collect() ⚡ TERMINAL — THIS triggers everything!',
          detail: 'collect(Collectors.toList()) is the terminal op. It calls into the pipeline: "give me all elements". Now the pipeline EXECUTES. All lazy ops run. This is the ONLY time any element is touched. After this, the stream is CONSUMED — can\'t reuse it!'
        },
        {
          path: ['terminal','pull'],
          label: 'Spliterator.tryAdvance() — one element at a time',
          detail: 'Terminal op drives a loop: spliterator.tryAdvance(element -> pipeline(element)) until exhausted. Each call: fetch ONE raw element from source → run through filter → if passes → run through map → give to collector. Sequential, pull-based.'
        },
        {
          path: ['pull','result'],
          label: 'Collector accumulates → finisher() → final result',
          detail: 'For toList(): ArrayList grows element by element. For groupingBy(): Map populated. For teeing(): TWO collectors run simultaneously on same element — no double iteration! When source exhausted: collector.finisher() called, stream.close() triggered.'
        },
      ]
    },

    uml: {
      title: 'Stream Execution — Element Journey Through the Pipeline',
      scenario: 'orders.stream().filter(o -> o.qty() > 2).map(o -> o.price() * o.qty()).collect(toList())',
      actors: [
        { id: 'terminal',  label: 'collect()',    hint: 'Terminal op drives the whole thing' },
        { id: 'map-st',    label: 'map stage',    hint: 'Wraps filter, fn stored' },
        { id: 'filter-st', label: 'filter stage', hint: 'Wraps source, pred stored' },
        { id: 'spliter',   label: 'Spliterator',  hint: 'Raw element source' },
        { id: 'collector', label: 'Collector',    hint: 'Result accumulator' },
      ],
      messages: [
        {
          from: 'terminal', to: 'map-st',
          label: 'collect() calls upstream: give me elements',
          detail: 'Terminal op does NOT know about elements. It calls the map stage\'s forEach/reduce wrapper. Pull model: downstream asks upstream.'
        },
        {
          from: 'map-st', to: 'filter-st',
          label: 'map asks filter: next element please',
          detail: 'Map stage has no elements itself. It asks its upstream (filter stage) for each element to transform.'
        },
        {
          from: 'filter-st', to: 'spliter',
          label: 'filter calls spliterator.tryAdvance()',
          detail: 'Filter asks the raw source for the next element. This is where actual memory is read. Order{userId:u1, qty:3, price:10.0} fetched.'
        },
        {
          from: 'spliter', to: 'filter-st',
          label: 'Order{qty:3, price:10} delivered',
          detail: 'Raw element flows into the pipeline. Filter stage now evaluates its predicate on this element.'
        },
        {
          from: 'filter-st', to: 'filter-st',
          label: 'pred.test(o.qty() > 2) → true ✓ passes',
          detail: 'qty=3 > 2 is true. Element passes. If false: filter would immediately call spliterator.tryAdvance() AGAIN for the next element — the map stage and collector never see the rejected element. Short-circuit filtering!', type: 'async'
        },
        {
          from: 'filter-st', to: 'map-st',
          label: 'filtered element forwarded to map',
          detail: 'Filter is satisfied. It passes the element up to the map stage.'
        },
        {
          from: 'map-st', to: 'terminal',
          label: 'fn.apply(o) = 3 * 10.0 = 30.0 → downstream',
          detail: 'Map transforms Order to Double(30.0). Sends to terminal op\'s consumer.'
        },
        {
          from: 'terminal', to: 'collector',
          label: 'accumulator.accept(30.0)',
          detail: 'toList() collector: list.add(30.0). Then loop back: pull next element, repeat entire flow. Stateful: sorted() would buffer ALL elements here before forwarding any.'
        },
        {
          from: 'collector', to: 'terminal',
          label: 'source exhausted → finisher() → List[30.0, 50.0, ...]',
          detail: 'When spliterator returns false: source done. Collector finisher() called — for toList() this is identity(). For joining() it returns the StringBuilder.toString(). Stream.close() called — important for file streams!'
        },
      ]
    },

    architecture: {
      title: 'Streams API — Operations Map',
      caption: 'Click any operation to understand its characteristics and gotchas',
      lanes: [
        {
          label: '① Sources',
          hint: 'Creates a Spliterator — zero elements read',
          nodes: [
            {
              id: 'list-src',
              label: 'Collection.stream()',
              badge: 'List/Set/Map',
              hint: 'SIZED + ORDERED (List) or just SIZED (Set). ArraySpliterator wraps the backing array. Sequential by default. parallelStream() splits the spliterator for ForkJoinPool.'
            },
            {
              id: 'int-src',
              label: 'Arrays.stream(int[])',
              badge: 'IntStream — no boxing',
              hint: 'IntStream/LongStream/DoubleStream avoid boxing overhead. sum/average/summaryStatistics for free. Use mapToObj() to go back to Stream<T>.'
            },
            {
              id: 'gen-src',
              label: 'Stream.iterate / generate',
              badge: 'infinite — add limit()!',
              hint: 'Stream.iterate(0, n -> n+1): infinite sequence. Stream.generate(Math::random): infinite. MUST pair with limit(n) or takeWhile(pred) before terminal op or will run forever!'
            },
            {
              id: 'file-src',
              label: 'Files.lines(path)',
              badge: 'lazy I/O — must close!',
              hint: 'Returns Stream<String>. Reads lines lazily — good for large files. MUST close or you leak a file handle. Use try-with-resources: try (var lines = Files.lines(p)) { ... }'
            },
          ]
        },
        {
          label: '② Intermediate (Lazy)',
          hint: 'Build pipeline description, zero work done',
          nodes: [
            {
              id: 'filter-op',
              label: 'filter(pred)',
              badge: 'stateless ✓',
              hint: 'Stateless. Fuses with adjacent stateless ops (map, peek) in a single pass. Predicate must be: non-interfering (don\'t modify source), stateless (no shared mutable state). Thread-safe for parallel.'
            },
            {
              id: 'map-op',
              label: 'map / mapToInt / flatMap',
              badge: 'stateless ✓',
              hint: 'map: 1→1 transform. mapToInt/Long/Double: unbox to primitive stream. flatMap: 1→N, flattens Stream<Stream<T>> to Stream<T>. flatMap breaks lazy fusion — it must start a new inner pipeline per element.'
            },
            {
              id: 'sorted-op',
              label: 'sorted() / distinct()',
              badge: '⚠ stateful — buffers ALL',
              hint: 'STATEFUL: must buffer ALL elements before outputting any. sorted() = Arrays.sort on entire stream content. distinct() needs a HashSet of all seen elements. Completely breaks lazy fusion. Avoid in parallel streams on unsorted spliterators.'
            },
            {
              id: 'limit-op',
              label: 'limit(n) / skip(n) / takeWhile()',
              badge: 'short-circuit capable',
              hint: 'limit(n): stops after n — critical for infinite sources. skip(n): discards first n. takeWhile(pred, Java9+): stops when pred first returns false. dropWhile(pred): skips while pred true.'
            },
          ]
        },
        {
          label: '③ Terminal (Eager)',
          hint: 'Triggers execution — stream consumed after this',
          nodes: [
            {
              id: 'collect-op',
              label: 'collect(collector)',
              badge: 'most powerful',
              hint: 'Drives entire pipeline. Collector = supplier + accumulator + combiner + finisher. combiner used only for parallel. Thread-safe combiners allow safe parallel merge. collect() is the Swiss Army knife terminal op.'
            },
            {
              id: 'reduce-op',
              label: 'reduce(identity, BinaryOp)',
              badge: 'fold / aggregate',
              hint: 'Left-fold over stream. reduce(0, Integer::sum). For parallel: BinaryOp MUST be associative and identity MUST be neutral element. reduce(BinaryOp) without identity returns Optional<T>.'
            },
            {
              id: 'find-op',
              label: 'findFirst / anyMatch / noneMatch',
              badge: 'short-circuit ⚡',
              hint: 'findFirst(): stops at first match, returns Optional. findAny(): faster in parallel (no ordering requirement). anyMatch/allMatch/noneMatch: early exit the moment result is determined. Avoid terminal if you want short-circuit on filter — use findAny() + filter().'
            },
            {
              id: 'foreach-op',
              label: 'forEach / forEachOrdered',
              badge: 'side-effects only',
              hint: 'forEach for side effects (logging, publishing). forEachOrdered: preserves encounter order in parallel — but kills parallelism benefit. Prefer collect() and return values — functional style, easier to test.'
            },
          ]
        },
        {
          label: '④ Collectors',
          hint: 'Aggregation factories — pass to collect()',
          nodes: [
            {
              id: 'groupby',
              label: 'groupingBy(fn)',
              badge: 'Map<K, List<V>>',
              hint: 'groupingBy(key): Map<K,List<V>>. groupingBy(key, counting()): Map<K,Long>. groupingBy(key, mapping(fn, toSet())): transform the values. Downstream collector can be any collector — composable!'
            },
            {
              id: 'tomap',
              label: 'toMap(keyFn, valueFn)',
              badge: 'Map<K,V>',
              hint: 'Throws IllegalStateException on duplicate keys! Always provide merge fn: toMap(k, v, (a,b)->b). toUnmodifiableMap() for immutable result. Collectors.toMap != Map.copyOf.'
            },
            {
              id: 'teeing',
              label: 'teeing(c1, c2, merge)',
              badge: 'Java 12+ dual-fan',
              hint: 'Fans stream to TWO collectors simultaneously in ONE pass. Perfect for (sum,count) without iterating twice. merge fn combines both results. Example: teeing(summingDouble(price), counting(), (sum,n) -> Map.of("avg", sum/n))'
            },
            {
              id: 'joining',
              label: 'joining(delim, prefix, suffix)',
              badge: 'String concat',
              hint: 'Collectors.joining(", ", "[", "]") → "[a, b, c]". Uses StringBuilder internally — far faster than += in a forEach loop. Common gotcha: only works on Stream<String>, use map(Object::toString) first.'
            },
          ]
        }
      ],
      links: [
        { from: 'list-src',   to: 'filter-op',  label: 'stream() → lazy filter wraps source',     type: 'sync' },
        { from: 'filter-op',  to: 'map-op',      label: 'fused: single pass (stateless chain)',    type: 'sync' },
        { from: 'map-op',     to: 'collect-op',  label: 'terminal pulls through entire pipeline',  type: 'sync' },
        { from: 'sorted-op',  to: 'collect-op',  label: 'stateful: buffers ALL before forwarding', type: 'sync' },
        { from: 'collect-op', to: 'groupby',     label: 'groupingBy downstream',                   type: 'sync' },
        { from: 'collect-op', to: 'teeing',      label: 'teeing: dual-collector one pass',         type: 'async' },
        { from: 'gen-src',    to: 'limit-op',    label: 'infinite source MUST use limit/takeWhile',type: 'sync' },
        { from: 'file-src',   to: 'filter-op',   label: 'try-with-resources — close the stream!',  type: 'sync' },
      ]
    },

    visual: function(mount) {
      mount.innerHTML = `
        <style>
          .sv-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .sv-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .sv-pipeline { display: flex; align-items: center; gap: 0; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
          .sv-stage { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 8px 12px; min-width: 90px; text-align: center; position: relative; flex-shrink: 0; }
          .sv-stage.active { border-color: #1f6feb; box-shadow: 0 0 8px rgba(31,111,235,0.3); }
          .sv-stage.triggered { border-color: #e3b341; box-shadow: 0 0 8px rgba(227,179,65,0.3); }
          .sv-stage-name { font-size: 10px; font-weight: bold; color: #cdd9e5; }
          .sv-stage-type { font-size: 9px; color: #768390; margin-top: 2px; }
          .sv-stage-type.lazy { color: #57ab5a; }
          .sv-stage-type.terminal { color: #e3b341; }
          .sv-stage-type.source { color: #6cb6ff; }
          .sv-arrow { color: #30363d; font-size: 18px; flex-shrink: 0; margin: 0 2px; transition: color 0.3s; }
          .sv-arrow.lit { color: #1f6feb; }
          .sv-elements { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
          .sv-elem { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 6px; font-size: 10px; font-weight: bold; border: 1px solid #30363d; background: #161b22; color: #768390; transition: all 0.4s; }
          .sv-elem.in-source { border-color: #6cb6ff; color: #6cb6ff; background: #1c2b3d; }
          .sv-elem.filtered-out { border-color: #f47067; background: #3d1f1f; color: #f47067; text-decoration: line-through; opacity: 0.5; }
          .sv-elem.mapped { border-color: #57ab5a; background: #1f3d2d; color: #57ab5a; }
          .sv-elem.collected { border-color: #e3b341; background: #3d2f1f; color: #e3b341; }
          .sv-controls { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
          .sv-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .sv-btn:hover { background: #30363d; }
          .sv-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 36px; }
          .sv-info strong { color: #cdd9e5; }
          .sv-info .kw { color: #e3b341; }
          .sv-info .fn { color: #57ab5a; }
          .sv-info .val { color: #6cb6ff; }
          .sv-result { font-size: 10px; color: #57ab5a; margin-top: 8px; background: #0d1117; border: 1px solid #1f3d2d; border-radius: 4px; padding: 6px; font-family: monospace; min-height: 20px; }
          .sv-legend { display: flex; gap: 10px; flex-wrap: wrap; font-size: 10px; color: #768390; margin-bottom: 8px; }
          .sv-l { display: flex; align-items: center; gap: 4px; }
          .sv-dot { width: 10px; height: 10px; border-radius: 3px; }
        </style>
        <div class="sv-wrap">
          <div class="sv-title">Live Stream Pipeline — Watch Elements Flow Through Stages</div>

          <div class="sv-pipeline">
            <div class="sv-stage" id="sv-src">
              <div class="sv-stage-name">Source</div>
              <div class="sv-stage-type source">list.stream()</div>
            </div>
            <div class="sv-arrow" id="sv-a1">→</div>
            <div class="sv-stage" id="sv-filt">
              <div class="sv-stage-name">filter</div>
              <div class="sv-stage-type lazy">lazy · stateless</div>
            </div>
            <div class="sv-arrow" id="sv-a2">→</div>
            <div class="sv-stage" id="sv-map">
              <div class="sv-stage-name">map</div>
              <div class="sv-stage-type lazy">lazy · stateless</div>
            </div>
            <div class="sv-arrow" id="sv-a3">→</div>
            <div class="sv-stage" id="sv-term">
              <div class="sv-stage-name">collect() ⚡</div>
              <div class="sv-stage-type terminal">TERMINAL · eager</div>
            </div>
          </div>

          <div class="sv-legend">
            <div class="sv-l"><div class="sv-dot" style="background:#1c2b3d;border:1px solid #6cb6ff"></div>In source</div>
            <div class="sv-l"><div class="sv-dot" style="background:#3d1f1f;border:1px solid #f47067"></div>Filtered out</div>
            <div class="sv-l"><div class="sv-dot" style="background:#1f3d2d;border:1px solid #57ab5a"></div>Mapped</div>
            <div class="sv-l"><div class="sv-dot" style="background:#3d2f1f;border:1px solid #e3b341"></div>Collected</div>
          </div>

          <div class="sv-elements" id="sv-elems"></div>

          <div class="sv-controls">
            <button class="sv-btn" id="sv-play">▶ Run Pipeline</button>
            <button class="sv-btn" id="sv-step">Step →</button>
            <button class="sv-btn" id="sv-reset">↺ Reset</button>
          </div>

          <div class="sv-info" id="sv-info">Pipeline built lazily. Click "Run Pipeline" to trigger the terminal op and watch elements flow through.</div>
          <div class="sv-result" id="sv-result">// result will appear here</div>
        </div>`;

      const data = [
        { label: 'ord1', qty: 3, price: 10 },
        { label: 'ord2', qty: 1, price: 50 },
        { label: 'ord3', qty: 5, price: 8  },
        { label: 'ord4', qty: 2, price: 30 },
        { label: 'ord5', qty: 4, price: 15 },
        { label: 'ord6', qty: 1, price: 100},
      ];
      const filterFn = o => o.qty > 2;
      const mapFn = o => +(o.qty * o.price).toFixed(1);

      const elemsEl = mount.querySelector('#sv-elems');
      const infoEl = mount.querySelector('#sv-info');
      const resultEl = mount.querySelector('#sv-result');
      const stages = ['sv-src','sv-filt','sv-map','sv-term'].map(id => mount.querySelector('#' + id));
      const arrows = ['sv-a1','sv-a2','sv-a3'].map(id => mount.querySelector('#' + id));
      let step = 0;
      let elements = [];
      let timers = [];

      function reset() {
        timers.forEach(clearTimeout); timers = [];
        step = 0; elements = [];
        elemsEl.innerHTML = '';
        infoEl.innerHTML = 'Pipeline built lazily. Click "Run Pipeline" to trigger the terminal op and watch elements flow through.';
        resultEl.textContent = '// result will appear here';
        stages.forEach(s => s.classList.remove('active','triggered'));
        arrows.forEach(a => a.classList.remove('lit'));
      }

      function mkElem(o, i) {
        const d = document.createElement('div');
        d.className = 'sv-elem in-source';
        d.title = JSON.stringify(o);
        d.textContent = o.label;
        d.id = 'sv-e-' + i;
        elemsEl.appendChild(d);
        return d;
      }

      const steps = [
        () => {
          stages[0].classList.add('active');
          data.forEach((o, i) => { elements.push(mkElem(o, i)); });
          infoEl.innerHTML = '<span class="kw">list.stream()</span> — <strong>6 elements in source</strong>. Zero touched. Spliterator created. Pipeline is a description, not execution.';
        },
        () => {
          stages[0].classList.remove('active');
          stages[1].classList.add('active');
          arrows[0].classList.add('lit');
          infoEl.innerHTML = '<span class="fn">filter(o -> o.qty() &gt; 2)</span> — <strong>lazy</strong>. Predicate stored. Nothing called. No elements examined. Still just a pipeline object in memory.';
        },
        () => {
          stages[1].classList.remove('active');
          stages[2].classList.add('active');
          arrows[1].classList.add('lit');
          infoEl.innerHTML = '<span class="fn">map(o -> o.price() * o.qty())</span> — <strong>lazy</strong>. Mapper stored. Fuses with filter — single pass possible (no intermediate List). Still no work done.';
        },
        () => {
          stages[2].classList.remove('active');
          stages[3].classList.add('triggered');
          arrows[2].classList.add('lit');
          infoEl.innerHTML = '<span class="kw">collect(toList())</span> ⚡ — <strong>TERMINAL triggered!</strong> NOW the pipeline executes. Terminal op pulls elements one by one through ALL stages.';
        },
        () => {
          const result = [];
          let delay = 0;
          data.forEach((o, i) => {
            const e = elements[i];
            timers.push(setTimeout(() => {
              const passes = filterFn(o);
              if (!passes) {
                e.classList.remove('in-source');
                e.classList.add('filtered-out');
                infoEl.innerHTML = '<span class="fn">filter</span>: <span class="val">' + o.label + '</span> qty=' + o.qty + ' ≤ 2 → <strong style="color:#f47067">FILTERED OUT</strong>. Collector never sees this element.';
              } else {
                const mapped = mapFn(o);
                result.push(mapped);
                timers.push(setTimeout(() => {
                  e.classList.remove('in-source');
                  e.classList.add('mapped');
                  e.textContent = mapped;
                  infoEl.innerHTML = '<span class="fn">filter</span>: <span class="val">' + o.label + '</span> qty=' + o.qty + ' &gt; 2 ✓ → <span class="fn">map</span>: ' + o.qty + ' × ' + o.price + ' = <span class="val">' + mapped + '</span>';
                  timers.push(setTimeout(() => {
                    e.classList.remove('mapped');
                    e.classList.add('collected');
                    resultEl.textContent = '// collect result: [' + result.join(', ') + ']';
                    if (result.length === 4) {
                      infoEl.innerHTML = '✓ <strong>Pipeline complete!</strong> 6 elements → 2 filtered → 4 mapped → <span class="val">[' + result.join(', ') + ']</span>. Stream consumed — cannot reuse.';
                    }
                  }, 300));
                }, 200));
              }
            }, delay));
            delay += 400;
          });
        }
      ];

      let autoTimer = null;
      mount.querySelector('#sv-step').addEventListener('click', () => {
        if (step < steps.length) { steps[step](); step++; }
      });
      mount.querySelector('#sv-play').addEventListener('click', () => {
        reset();
        let i = 0;
        function next() { if (i < steps.length) { steps[i](); i++; if (i < steps.length) autoTimer = setTimeout(next, 800); } }
        next();
      });
      mount.querySelector('#sv-reset').addEventListener('click', reset);
    },

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
      },
      {
        question: "Why does collect(groupingBy(...)) with a stateful downstream break parallel streams?",
        answer:
`\`groupingBy\` uses a \`HashMap\` internally — not thread-safe. For parallel streams, the combiner must merge two partial Maps. The default downstream \`toList()\` produces an \`ArrayList\`, which is fine. But if you use a **stateful downstream** like \`sorting\` or a custom mutable accumulator, thread safety is your responsibility. Prefer \`toConcurrentMap\` or \`groupingByConcurrent\` for parallel.`,
        followUps: ["What is Collector.Characteristics.CONCURRENT?", "Why use toConcurrentMap over toMap for parallel?"]
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
