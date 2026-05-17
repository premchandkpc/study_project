(function() {
  var topic = {
    id: "sd-case-search-autocomplete",
    area: "sysdesign",
    title: "Case Study: Search Autocomplete (Google Typeahead)",
    tag: "Case Study",
    tags: ["trie","prefix-search","redis","cdn","typeahead","autocomplete","kafka","hadoop","personalization","top-k"],
    concept: `**Requirements:** Sub-100ms suggestions for every keystroke, 100K QPS, top-10 globally trending completions, personalization, multilingual support.

**Core challenges:**
1. **Latency** — each keystroke triggers a query. Must return in <100ms including network.
2. **Scale** — 100K QPS peak. A naive DB LIKE query cannot handle this.
3. **Freshness** — trending searches ("breaking news") should appear quickly.
4. **Personalization** — blend your search history with global trends.
5. **Multilingual** — Unicode prefix matching, RTL languages, CJK character handling.

**Architecture:**

**Data collection pipeline:**
- Every search query is logged → Kafka topic \`search-queries\`.
- Hadoop MapReduce/Spark batch job (runs hourly): aggregate query counts per prefix → top-10 per prefix.
- Results written to Redis: key = prefix (e.g. "app"), value = JSON array of top-10 suggestions with scores.
- Real-time stream (Flink/Kafka Streams): updates scores for fast-trending queries within minutes.

**Trie structure (offline):**
- Build full Trie from top-N queries. Each node stores: char, children map, top-K list (precomputed by DFS).
- Trie is serialized and distributed to serving nodes.
- Trie serves as fallback; Redis serves hot prefixes from memory.

**Serving layer:**
- **CDN caching** — cache responses for common 1–3 char prefixes (high hit rate, low personalization needed).
- **Redis** — stores top-10 per prefix. Key format: \`autocomplete:{lang}:{prefix}\`. O(1) lookup.
- **Application tier** — on Redis miss: traverse in-memory Trie. Merge with user history from profile service.
- **Personalization** — \`score = 0.7 × global_score + 0.3 × user_history_score\`.

**Prefix size optimization:**
- Only store prefixes from length 1 to 20 chars.
- For length > 5: results barely change — extend last stored prefix's results.
- Total keys in Redis: avg 200K unique prefixes × 10 results × 50 bytes ≈ 100MB (fits in RAM easily).

**Multilingual:**
- Index queries by \`{lang}:{prefix}\` key. Tokenize CJK by character (not word boundary).
- Use Unicode normalization (NFC) before indexing.
- RTL (Arabic/Hebrew): reverse prefix direction for Trie traversal.`,
    why: `Typeahead is asked in every FAANG interview. It cleanly demonstrates: Trie data structures, Redis for in-memory key-value, CDN caching strategy, batch vs stream processing pipelines, and personalization blending — all in one compact problem.`,
    example: {
      language: "python",
      code: `# Autocomplete service — FastAPI + Redis
from fastapi import FastAPI
from redis.asyncio import Redis
import json

app = FastAPI()
redis = Redis(host='redis-autocomplete', decode_responses=True)

# In-memory Trie (loaded from snapshot on startup)
class TrieNode:
    def __init__(self):
        self.children: dict[str, 'TrieNode'] = {}
        self.top_k: list[dict] = []  # precomputed top-10

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str, score: float):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            # Keep top-10 sorted by score at each node
            node.top_k = sorted(
                node.top_k + [{"query": word, "score": score}],
                key=lambda x: -x["score"]
            )[:10]

    def search(self, prefix: str) -> list[dict]:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        return node.top_k

trie = Trie()  # loaded from snapshot

@app.get("/autocomplete")
async def autocomplete(q: str, lang: str = "en", user_id: str = None):
    q = q.lower().strip()
    if not q:
        return {"suggestions": []}

    # 1. Try Redis first (O(1), precomputed top-10)
    redis_key = f"autocomplete:{lang}:{q}"
    cached = await redis.get(redis_key)
    if cached:
        global_results = json.loads(cached)
    else:
        # 2. Fallback: traverse in-memory Trie
        global_results = trie.search(q)

    # 3. Personalization: blend with user history
    if user_id:
        user_key = f"user:history:{user_id}:{q}"
        user_suggestions = await redis.zrevrangebyscore(
            user_key, "+inf", "-inf", withscores=True, start=0, num=5
        )
        user_results = [{"query": s, "score": sc * 0.3}
                        for s, sc in user_suggestions]
        # Merge: 70% global + 30% personal
        merged = {r["query"]: r["score"] * 0.7 for r in global_results}
        for r in user_results:
            merged[r["query"]] = merged.get(r["query"], 0) + r["score"]
        global_results = sorted(
            [{"query": q, "score": s} for q, s in merged.items()],
            key=lambda x: -x["score"]
        )[:10]

    return {"suggestions": [r["query"] for r in global_results[:10]]}

# Batch job output (Spark) writes to Redis
# spark_job.py (pseudocode):
# prefix_counts = queries.groupBy('prefix').agg(count)
# for prefix, top10 in prefix_counts.top_k(10):
#     redis.set(f"autocomplete:en:{prefix}", json.dumps(top10), ex=3600)`
    },
    interview: [
      {
        question: "How would you design autocomplete for Google Search?",
        answer: `Two-layer architecture: (1) Offline pipeline — Spark job aggregates query logs hourly, computes top-10 per prefix, stores in Redis keyed by prefix. (2) Serving — on each keystroke, check CDN cache (for short common prefixes), then Redis O(1) lookup. On miss, traverse in-memory Trie. Personalization layer blends user history (Redis sorted set) with global results at 70/30 ratio. Cache-Control headers allow CDN to cache non-personalized responses for 1 char prefix like "a" = millions of QPS absorbed by CDN.`,
        followUps: [
          "How would you handle real-time trending queries (Taylor Swift going viral)?",
          "How does your design handle 50 different languages?",
          "Should you index every prefix or just prefixes of top-N queries?"
        ]
      },
      {
        question: "How do you handle 100K QPS on prefix search?",
        answer: `CDN handles the first line — short 1–2 char prefixes like "a", "th" are queried millions of times. Cache with TTL=60s absorbs >80% of traffic. Remaining traffic hits Redis: O(1) GET on precomputed key. Redis can handle 100K ops/sec per node; shard by first char of prefix (26 shards for English). In-memory Trie on app servers handles cache misses. With Redis cluster + CDN, 100K QPS is comfortably handled with <5ms p99 at serving layer.`,
        followUps: [
          "How do you keep CDN caches fresh when trending queries change?",
          "How do you handle the thundering herd when CDN cache expires for 'th'?",
          "What's the memory footprint of storing top-10 for all prefixes?"
        ]
      },
      {
        question: "How often do you update the trie / Redis data?",
        answer: `Two update frequencies: (1) Batch (hourly) — Spark job processes last hour of query logs, recomputes top-10 per prefix for stable queries. Updates Redis with new data. (2) Real-time stream (Flink, lag ~5 minutes) — detects sudden spikes in query frequency (viral events, breaking news) and injects those into Redis immediately with a short TTL=10 minutes so they expire if the trend dies. The Trie is rebuilt nightly from the full dataset and hot-reloaded on serving nodes without downtime (atomic pointer swap).`,
        followUps: [
          "How do you detect a 'trending' query vs a one-off spike?",
          "How do you hot-reload the Trie without downtime?",
          "How do you handle malicious query injection to manipulate suggestions?"
        ]
      },
      {
        question: "How do you handle multilingual support?",
        answer: `Namespace Redis keys by language: \`autocomplete:{lang}:{prefix}\`. Tokenization differs: Latin languages — lowercase + strip diacritics. CJK (Chinese/Japanese/Korean) — each character is a unit (no spaces), prefix = first N characters. Arabic/Hebrew (RTL) — store and match on visual order; normalize using Unicode BiDi algorithm. Apply Unicode NFC normalization before indexing. Separate Trie per language (memory is cheap). For languages with very small corpora, fall back to English cross-lingual suggestions.`,
        followUps: [
          "How do you handle typos and fuzzy matching in autocomplete?",
          "How would you support voice search (speech-to-text prefix)?",
          "How do you filter offensive suggestions?"
        ]
      }
    ],
    tradeoffs: {
      pros: [
        "Redis O(1) prefix lookup — predictable sub-millisecond latency regardless of Trie depth",
        "CDN absorbs massive traffic for short common prefixes (huge cost saving)",
        "Precomputing top-K at index time shifts complexity to offline pipeline (Spark), not serving",
        "Batch + stream dual pipeline balances freshness vs stability"
      ],
      cons: [
        "Precomputed top-K means personalization requires a merge step at serve time",
        "Redis memory grows with vocabulary — need prefix pruning for long-tail queries",
        "Batch hourly updates mean truly real-time trending (within seconds) is harder",
        "Cache invalidation: CDN cached 'a' prefix with 10 results — invalidating efficiently across PoPs is non-trivial"
      ],
      when: "Any product with a search box and >10K QPS needs this pattern. For <1K QPS, a simple DB LIKE query with an index works fine."
    },
    gotchas: [
      "Don't store every prefix — limit to top-10M queries. Store prefixes only up to length 20. Beyond that, results are identical to the trimmed prefix.",
      "CDN caching breaks personalization — serve non-personalized results from CDN, inject personalization client-side from a separate lightweight API call",
      "Trie memory can be huge — 10M unique queries × avg 8 chars = 80M nodes. Use DAWG (Directed Acyclic Word Graph) to share suffixes and reduce memory 5–10×",
      "Ranking matters more than completeness — a wrong top-3 frustrates users. Weight recency + click-through rate + query volume, not just raw count",
      "Filter offensive/illegal suggestions via a blocklist applied at Redis write time (not serve time — don't waste latency on filtering)"
    ],
    visual: function(mount) {
      mount.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <button id="btnType" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;">Type "app"</button>
        </div>
        <canvas id="acCanvas" width="460" height="320" style="width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;"></canvas>
      `;

      var canvas = mount.querySelector('#acCanvas');
      var ctx = canvas.getContext('2d');
      var W = 460, H = 320;

      var GREEN = '#3fb950', BLUE = '#58a6ff', ORANGE = '#ffa657';
      var RED = '#f85149', GRAY = '#8b949e', TEXT = '#e6edf3';
      var CARD = '#161b22', BORDER = '#30363d', PURPLE = '#bc8cff';

      var typed = '';
      var animating = false;
      var suggestions = [];
      var highlightNode = '';
      var statusLabel = 'Click "Type app" to see prefix search in action';

      // Trie nodes for visualization: a-p-p-l-e / a-p-p (branch)
      var trieNodes = [
        { id: 'root', label: '*', x: 230, y: 30 },
        { id: 'a', label: 'a', x: 230, y: 80 },
        { id: 'ap', label: 'p', x: 230, y: 130 },
        { id: 'app', label: 'p', x: 190, y: 180, topK: ['app', 'apple', 'application'] },
        { id: 'appl', label: 'l', x: 150, y: 230 },
        { id: 'apple', label: 'e', x: 150, y: 280 },
        { id: 'appli', label: 'i', x: 270, y: 230 },
        { id: 'applic', label: 'c', x: 310, y: 260 },
      ];
      var trieEdges = [
        ['root','a'], ['a','ap'], ['ap','app'], ['app','appl'],
        ['appl','apple'], ['app','appli'], ['appli','applic']
      ];

      var suggestions_map = {
        'a': ['amazon','apple','airbnb','amazon aws','adobe'],
        'ap': ['apple','apple store','application','app store','api'],
        'app': ['app store','apple','application','appstore','app design']
      };

      function getNode(id) {
        return trieNodes.find(function(n) { return n.id === id; });
      }

      function draw() {
        if (!document.body.contains(canvas)) return;
        ctx.clearRect(0, 0, W, H);

        // Title / typed prefix
        ctx.fillStyle = GRAY;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Trie Traversal', 10, 14);

        ctx.fillStyle = TEXT;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Typing: "' + typed + '"', 10, 32);

        // Draw trie edges
        trieEdges.forEach(function(e) {
          var n1 = getNode(e[0]), n2 = getNode(e[1]);
          if (!n1 || !n2) return;
          ctx.strokeStyle = BORDER;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        });

        // Draw trie nodes
        trieNodes.forEach(function(n) {
          var isHighlighted = (highlightNode && (n.id === highlightNode || highlightNode.startsWith(n.id) && n.id !== 'root'));
          var isActive = (typed && n.id !== 'root' && typed.endsWith(n.id.replace('root','')));
          var color = isHighlighted ? GREEN : (isActive ? BLUE : GRAY);
          var radius = n.id === typed ? 14 : 10;

          ctx.beginPath();
          ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = isHighlighted ? '#0d2818' : CARD;
          ctx.fill();
          ctx.strokeStyle = color;
          ctx.lineWidth = isHighlighted ? 2 : 1;
          ctx.stroke();
          ctx.fillStyle = color;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + 4);

          // Show topK badge
          if (n.topK && n.id === typed) {
            ctx.fillStyle = ORANGE;
            ctx.font = '8px monospace';
            ctx.textAlign = 'left';
            n.topK.forEach(function(s, i) {
              ctx.fillText('→ ' + s, n.x + 20, n.y - 10 + i * 14);
            });
          }
        });

        // Suggestions panel (right side)
        ctx.fillStyle = CARD;
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(340, 20, 112, 180, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = GRAY;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Redis top-10', 396, 36);
        ctx.fillText('prefix: "' + (typed || '...') + '"', 396, 50);

        ctx.fillStyle = TEXT;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        (suggestions || []).slice(0, 7).forEach(function(s, i) {
          ctx.fillStyle = i === 0 ? GREEN : TEXT;
          ctx.fillText(s, 348, 66 + i * 18);
        });

        // Cache status
        ctx.fillStyle = CARD;
        ctx.strokeStyle = typed ? GREEN : BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(10, 240, 110, 36, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = typed ? GREEN : GRAY;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(typed ? 'Redis HIT' : 'Redis MISS', 65, 255);
        ctx.fillText(typed ? 'O(1) lookup' : 'cache empty', 65, 268);

        // CDN box
        ctx.fillStyle = CARD;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(130, 240, 100, 36, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ORANGE;
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CDN Cache', 180, 255);
        ctx.fillText(typed.length <= 2 ? 'HIT (short pfx)' : 'MISS (>2 chars)', 180, 268);

        // Status
        if (statusLabel) {
          ctx.fillStyle = GRAY;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(statusLabel, W / 2, 308);
        }
      }

      var typeSequence = ['a', 'ap', 'app'];
      var typeIdx = 0;

      function typeNext() {
        if (!document.body.contains(canvas) || animating) return;
        if (typeIdx >= typeSequence.length) {
          typeIdx = 0;
          typed = '';
          highlightNode = '';
          suggestions = [];
          statusLabel = 'Reset — click again to replay';
          draw();
          return;
        }
        animating = true;
        var prefix = typeSequence[typeIdx++];
        typed = prefix;
        highlightNode = prefix;
        suggestions = suggestions_map[prefix] || [];
        statusLabel = 'Prefix "' + prefix + '" → Redis lookup → ' + suggestions.length + ' suggestions';

        // Animate highlight traveling down trie
        var path = ['root'];
        for (var i = 0; i < prefix.length; i++) path.push(prefix.slice(0, i + 1));
        var pathIdx = 0;
        function animPath() {
          if (!document.body.contains(canvas)) return;
          if (pathIdx < path.length) {
            highlightNode = path[pathIdx++];
            draw();
            setTimeout(animPath, 180);
          } else {
            highlightNode = prefix;
            animating = false;
            draw();
            if (typeIdx < typeSequence.length) setTimeout(typeNext, 700);
          }
        }
        animPath();
      }

      mount.querySelector('#btnType').addEventListener('click', function() {
        if (animating) return;
        typeIdx = 0; typed = ''; highlightNode = ''; suggestions = [];
        statusLabel = 'Starting...';
        draw();
        setTimeout(typeNext, 300);
      });

      draw();
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
