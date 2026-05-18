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
    why: "Typeahead is asked in every FAANG interview. It cleanly demonstrates: Trie data structures, Redis for in-memory key-value, CDN caching strategy, batch vs stream processing pipelines, and personalization blending — all in one compact problem.",
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
        answer: "Two-layer architecture: (1) Offline pipeline — Spark job aggregates query logs hourly, computes top-10 per prefix, stores in Redis keyed by prefix. (2) Serving — on each keystroke, check CDN cache (for short common prefixes), then Redis O(1) lookup. On miss, traverse in-memory Trie. Personalization layer blends user history (Redis sorted set) with global results at 70/30 ratio. Cache-Control headers allow CDN to cache non-personalized responses for 1 char prefix like \"a\" = millions of QPS absorbed by CDN.",
        followUps: [
          "How would you handle real-time trending queries (Taylor Swift going viral)?",
          "How does your design handle 50 different languages?",
          "Should you index every prefix or just prefixes of top-N queries?"
        ]
      },
      {
        question: "How do you handle 100K QPS on prefix search?",
        answer: "CDN handles the first line — short 1–2 char prefixes like \"a\", \"th\" are queried millions of times. Cache with TTL=60s absorbs >80% of traffic. Remaining traffic hits Redis: O(1) GET on precomputed key. Redis can handle 100K ops/sec per node; shard by first char of prefix (26 shards for English). In-memory Trie on app servers handles cache misses. With Redis cluster + CDN, 100K QPS is comfortably handled with <5ms p99 at serving layer.",
        followUps: [
          "How do you keep CDN caches fresh when trending queries change?",
          "How do you handle the thundering herd when CDN cache expires for 'th'?",
          "What's the memory footprint of storing top-10 for all prefixes?"
        ]
      },
      {
        question: "How often do you update the trie / Redis data?",
        answer: "Two update frequencies: (1) Batch (hourly) — Spark job processes last hour of query logs, recomputes top-10 per prefix for stable queries. Updates Redis with new data. (2) Real-time stream (Flink, lag ~5 minutes) — detects sudden spikes in query frequency (viral events, breaking news) and injects those into Redis immediately with a short TTL=10 minutes so they expire if the trend dies. The Trie is rebuilt nightly from the full dataset and hot-reloaded on serving nodes without downtime (atomic pointer swap).",
        followUps: [
          "How do you detect a 'trending' query vs a one-off spike?",
          "How do you hot-reload the Trie without downtime?",
          "How do you handle malicious query injection to manipulate suggestions?"
        ]
      },
      {
        question: "How do you handle multilingual support?",
        answer: "Namespace Redis keys by language: `autocomplete:{lang}:{prefix}`. Tokenization differs: Latin languages — lowercase + strip diacritics. CJK (Chinese/Japanese/Korean) — each character is a unit (no spaces), prefix = first N characters. Arabic/Hebrew (RTL) — store and match on visual order; normalize using Unicode BiDi algorithm. Apply Unicode NFC normalization before indexing. Separate Trie per language (memory is cheap). For languages with very small corpora, fall back to English cross-lingual suggestions.",
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
    visual: {
      type: "layered",
      title: "🔍 Search Autocomplete Architecture (Google Typeahead)",
      layers: [
        {
          id: "l1",
          label: "Client Layer",
          color: "#58a6ff",
          protocols: "HTTPS — keystroke triggers query per 150ms debounce",
          services: [
            { id: "s1", label: "Browser",     icon: "🌐", sublabel: "Debounce 150ms" },
            { id: "s2", label: "Mobile App",  icon: "📱", sublabel: "Native typeahead" }
          ]
        },
        {
          id: "l2",
          label: "Edge Layer",
          color: "#3fb950",
          protocols: "CDN cached for 1–3 char prefixes · Rate limiter: 10 req/s per IP",
          services: [
            { id: "s3", label: "CDN Cache",     icon: "🌍", sublabel: "Short prefix HIT" },
            { id: "s4", label: "Rate Limiter",  icon: "🚦", sublabel: "10 req/s per IP" },
            { id: "s5", label: "API Gateway",   icon: "🔀", sublabel: "Auth + routing" }
          ]
        },
        {
          id: "l3",
          label: "Search Layer",
          color: "#ffa657",
          protocols: "In-memory Trie · Redis O(1) prefix lookup · Personalization blend 70/30",
          services: [
            { id: "s6", label: "Trie Server",       icon: "🌳", sublabel: "In-memory Trie" },
            { id: "s7", label: "Suggestion Ranker", icon: "🏆", sublabel: "70% global + 30% personal" },
            { id: "s8", label: "Profile Service",   icon: "👤", sublabel: "User history" }
          ]
        },
        {
          id: "l4",
          label: "Data Layer",
          color: "#bc8cff",
          protocols: "Redis key: autocomplete:{lang}:{prefix} · ElasticSearch for fallback fuzzy",
          services: [
            { id: "s9",  label: "Redis Cache",    icon: "⚡", sublabel: "O(1) prefix lookup" },
            { id: "s10", label: "ElasticSearch",  icon: "🔎", sublabel: "Fuzzy + multilingual" },
            { id: "s11", label: "Spark / Hadoop", icon: "🔥", sublabel: "Hourly batch top-K" }
          ]
        }
      ],
      flows: [
        {
          name: "⚡ Cache Hit (1–2 chars)",
          path: ["s1", "s3", "s7", "s9"],
          color: "#3fb950"
        },
        {
          name: "🌳 Trie Fallback",
          path: ["s1", "s4", "s5", "s6", "s7", "s9"],
          color: "#ffa657"
        },
        {
          name: "👤 Personalized Query",
          path: ["s1", "s5", "s7", "s8", "s9"],
          color: "#bc8cff"
        },
        {
          name: "🔄 Batch Index Update",
          path: ["s11", "s9", "s6"],
          color: "#58a6ff"
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
