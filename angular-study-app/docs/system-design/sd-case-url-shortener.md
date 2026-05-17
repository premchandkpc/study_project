# Case Study: URL Shortener (TinyURL / Bit.ly)

Source: `src/modules/topics/sysdesign/sd-case-url-shortener.js`
Tag: `Case Study`
Doc path: `docs/system-design/sd-case-url-shortener.md`

## Concept
**Requirements:**
- Shorten a long URL to a 7-character code (base62: a-z, A-Z, 0-9)
- Redirect short URL -> original URL
- Optional: expiry, custom aliases, click analytics
- Scale: 100M URLs created/day, 10B redirects/day (read-heavy 100:1)

**Core algorithm - ID generation:**
1. Generate unique 64-bit ID (Snowflake or auto-increment DB)
2. Encode to base62: `62^7 = 3.5 trillion` unique codes - sufficient for decades

**Architecture decisions:**

**Storage:** DynamoDB or Redis (hash) - key: shortCode -> { originalUrl, createdAt, expiresAt, userId }.
Cache in Redis (TTL 24h) - 99% of redirects served from cache.

**Redirect flow:**
`short.ly/abc123` -> DNS -> CDN edge (cache HIT ~80%) -> API server -> Redis lookup -> 301/302 redirect.

**301 vs 302:**
- 301 (Permanent): browser caches redirect -> no server hit on repeat. Reduces load but no analytics.
- 302 (Temporary): browser always checks server -> full analytics but more load.
- Solution: serve 302 for analytics; 301 only for CDN-cached redirects.

**Analytics:** Async - on redirect, publish event to Kafka. Analytics consumers aggregate: clicks/hour, geo, device, referer. Write to ClickHouse / Redshift.

**Collision handling:** Bloom filter checks if generated code exists before DB insert. If collision (rare), regenerate.

**Custom aliases:** Check availability in DB. Rate-limit custom alias creation to prevent squatting.

## Production Architecture
URL shortener is the entry-level system design question. Expected to cover: encoding, storage choice, caching, redirect semantics, scale calculation.

## Architecture Checklist
- Client / Browser: Follows short URL
- Edge / CloudFront CDN: CDN caches redirect responses. 301 cached by browser (no CDN hit next time). 302 cached at CDN edge per Cache-Control.
- Edge / WAF: Rate limit per IP. Block known phishing/spam domains. CAPTCHA for abuse patterns.
- Application / API Server (ECS): Stateless. Handles redirect: cache lookup -> DB lookup -> 302. Handles create: ID gen -> base62 encode -> DB write.
- Application / Redis Cluster: Hot URL cache. 99% of redirects served here after first DB lookup. Sub-millisecond response.
- Storage / DynamoDB: Primary store. Partition key: shortCode. TTL attribute for expiry. Pay-per-request pricing at 100M writes/day.
- Storage / Kafka: Every redirect publishes ClickEvent. Async - doesn't block redirect response.
- Storage / ClickHouse: Columnar OLAP DB. Stores click events. Queries: clicks/URL/hour, geo distribution, top referrers.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Client"]
    browser["Browser"]
  end
  subgraph lane_1["Edge"]
    cdn["CloudFront CDN"]
    waf["WAF"]
  end
  subgraph lane_2["Application"]
    api["API Server (ECS)"]
    redis["Redis Cluster"]
  end
  subgraph lane_3["Storage"]
    dynamo["DynamoDB"]
    kafka["Kafka"]
    clickhouse["ClickHouse"]
  end
  browser -->|"GET /abc123"| cdn
  cdn -->|"Cache miss -> origin"| api
  api -->|"HGET url:abc123"| redis
  api -->|"Cache miss -> DB"| dynamo
  api -->|"302 Location: https://..."| browser
  api -.->|"Async click event"| kafka
  kafka -.->|"Stream processing"| clickhouse
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Client
  participant a1 as API Gateway
  participant a2 as Domain Service
  participant a3 as Async Worker
  participant a4 as Data Store
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Interview Drills
1. How would you scale the URL shortener to 10 billion redirects per day?
   10B/day = ~116K req/s. Peak ~3x = 350K req/s.
   
   **Read path (redirects):**
   1. **CloudFront/Fastly CDN** - cache redirects at edge (301 cached by browser, 302 cached by CDN with Cache-Control). 80% hit rate = 70K req/s to origin.
   2. **Redis Cluster** - remaining 30% (21K req/s) served from Redis (~sub-ms). 3-node cluster handles 500K ops/s easily.
   3. **DB** - only cold misses (<1% of traffic) hit the DB. DynamoDB or PostgreSQL with read replicas.
   
   **Write path (create):**
   100M/day = 1,160 creates/s. Single DynamoDB table with Snowflake IDs handles this easily.
   
   **Storage:** 100M URLs/day x 365 days x 5 years = 182B URLs. At 500 bytes/URL = 91TB. S3 for cold archive, DynamoDB for active.
   
   **Analytics:** Kafka at 350K events/s -> Flink aggregations -> ClickHouse for query.
   Follow-ups: How do you handle custom vanity URLs?; How would you detect and prevent abuse (spam/phishing)?

## Trade-offs
Pros:
- Simple read path - DynamoDB + Redis handles any scale
- Base62 encoding is trivial to implement
- CDN makes 80% of traffic free to serve

Cons:
- Analytics adds complexity (Kafka + stream processing)
- Custom alias creates need for availability check + rate limiting
- URL expiry requires cleanup job (DynamoDB TTL handles this natively)

When to use:
This design pattern (hash/encode -> cache -> redirect) applies to: QR codes, invite links, payment links, affiliate tracking.

## Gotchas
_No gotchas yet._

