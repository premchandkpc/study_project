(function() {
  var topic = {
    id:"sd-instagram-deep",
    area:"sysdesign",
    title:"Case Study: Instagram — Photo/Reel Upload, Feed, Stories & Scale",
    tag:"Case Study",
    tags:["instagram","photo upload","reels","stories","fanout","cdn","media processing","feed ranking","search","explore"],

    concept:`**Scale:** 2B+ MAU · 100M+ photos/day · 4M likes/second · 500M Stories/day

**Four core flows to master:**

**① Photo / Reel Upload**
\`\`\`
Client → API Gateway → Upload Service
  → Object Store (S3 raw)
  → Kafka: media.uploaded
    → Transcoder (multiple resolutions: 360/720/1080p, WebP)
    → CDN Pre-warm (push to edge PoPs)
  → Metadata DB (Postgres: postId, userId, caption, hashtags)
  → Search Indexer (Elasticsearch: hashtag/caption)
  → Fanout Worker (Kafka: feed.fanout)
\`\`\`

**② Feed Generation (Hybrid Fanout)**
- **Regular users (<10K followers):** Fanout-on-write → push postId to each follower's feed in Redis sorted set (score = timestamp)
- **Celebrities (>10K followers):** No precomputed push. At read time, fetch recent posts, merge into feed
- **Feed read:** Merge Redis precomputed + celebrity real-time → Ranking ML model → paginated response

**③ Stories (Time-bounded, ring architecture)**
- 24h TTL stored in Cassandra (time-series)
- Viewer ring updated via Redis ZADD storyViews:{storyId} timestamp userId
- Stories CDN pre-warmed for author's top followers (predicted-access pre-push)

**④ Explore / Search**
- Elasticsearch indexes caption + hashtags at upload time
- Trending scored by: view rate × engagement rate × freshness (decaying exponential)
- Personalized Explore: collaborative filtering (users who liked similar posts)

**Storage Architecture:**
| Data | Store | Why |
|------|-------|-----|
| Media files | S3 + CloudFront | Blob, durable, CDN-native |
| Feed cache | Redis sorted set | O(log N) write, O(1) range read |
| Post metadata | Postgres (sharded) | Relational, ACID |
| Stories timeline | Cassandra | Time-series, TTL native |
| Follow graph | adjacency in Postgres + Redis cache | Fast follower lookup |
| Search | Elasticsearch | Full-text + hashtag |`,

    why:"Instagram pioneered at-scale media pipelines. Photo upload → multi-resolution transcode → CDN pre-warm is the canonical pattern for any media platform. Feed fanout + celebrity hybrid is the textbook answer for all social feed questions. Stories added ephemeral-content pattern (Cassandra TTL, ring viewer tracking).",

    example:{
      language:"java",
      code:`// Instagram-style Upload + Fanout pipeline
@RestController
public class UploadController {

    @Autowired private S3Client s3;
    @Autowired private KafkaTemplate<String,MediaEvent> kafka;
    @Autowired private PostRepository postRepo;

    @PostMapping("/api/v1/posts")
    public ResponseEntity<Post> upload(
            @RequestParam MultipartFile file,
            @RequestParam String caption,
            @AuthenticationPrincipal User user) {

        // 1. Upload raw to S3 (presigned URL flow for large files)
        String rawKey = "raw/" + UUID.randomUUID() + ".jpg";
        s3.putObject(PutObjectRequest.builder().bucket("ig-media").key(rawKey).build(),
                     RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        // 2. Persist metadata
        Post post = postRepo.save(new Post(user.getId(), rawKey, caption));

        // 3. Trigger async processing pipeline
        kafka.send("media.uploaded", new MediaEvent(post.getId(), rawKey, user.getId(),
                   user.getFollowerCount()));
        return ResponseEntity.accepted().body(post);
    }
}

// ── Transcoder Consumer ──────────────────────────────────────────
@KafkaListener(topics = "media.uploaded", groupId = "transcoder")
public void transcode(MediaEvent evt) {
    List<Integer> resolutions = List.of(360, 720, 1080);
    resolutions.parallelStream().forEach(res -> {
        byte[] transcoded = ffmpegTranscode(evt.getRawKey(), res);
        String cdnKey = "media/" + evt.getPostId() + "/" + res + "p.webp";
        s3.putObject(/* ... */ cdnKey, transcoded);
        cdn.preWarm(cdnKey); // push to edge PoPs
    });
    // Signal fanout worker
    kafka.send("feed.fanout", new FanoutEvent(evt.getPostId(), evt.getUserId(),
               evt.getFollowerCount(), System.currentTimeMillis()));
}

// ── Fanout Worker ────────────────────────────────────────────────
@KafkaListener(topics = "feed.fanout", groupId = "fanout", concurrency = "32")
public void fanout(FanoutEvent evt) {
    if (evt.getFollowerCount() > 10_000) return; // celebrities skip — read-time merge

    // Paginate followers (sharded adjacency table)
    followerRepo.streamFollowerIds(evt.getUserId(), 500).forEach(followerId -> {
        double score = evt.getTimestamp();
        redis.opsForZSet().add("feed:" + followerId, evt.getPostId(), score);
        redis.opsForZSet().removeRange("feed:" + followerId, 0, -801); // cap at 800
    });
}

// ── Feed Read (Hybrid merge) ─────────────────────────────────────
public FeedPage getFeed(String userId, String cursor) {
    // 1. Pre-computed feed from Redis
    long offset = cursor == null ? 0 : Long.parseLong(cursor);
    Set<Long> precomputed = redis.opsForZSet()
        .reverseRange("feed:" + userId, offset, offset + 19);

    // 2. Celebrity followees — fanout-on-read
    List<String> celebrities = followerRepo.getCelebrityFollowees(userId, 10_000);
    List<Post> celebPosts = postRepo.getRecentByAuthors(celebrities, 20);

    // 3. Merge, rank, paginate
    List<Post> all = new ArrayList<>(postRepo.findAllById(precomputed));
    all.addAll(celebPosts);
    rankingService.rank(all, userId); // ML: freshness x engagement x relationship
    return new FeedPage(all.subList(0, Math.min(20, all.size())), String.valueOf(offset+20));
}`,
      notes:"Presigned S3 URL flow: client uploads directly to S3, skipping app servers for large files. Concurrency=32 on fanout consumer handles celebrity bottleneck without blocking regular fanout."
    },

    interview:[
      {
        question:"How does Instagram handle a celebrity (500M followers) posting a photo?",
        answer:`**Problem:** Fanout-on-write for 500M followers = 500M Redis writes cluster saturated for minutes.

**Instagram hybrid solution:**
1. **Threshold check** (>10K followers = celebrity) skip precomputed fanout
2. **At read time:** for each celebrity the user follows, fetch their last 20 posts from post DB
3. **Merge** celebrity posts with pre-computed regular feed in real time (typically fewer than 10 celebrity followees per user)
4. **Rank** merged list, return top 20

**Cost:** ~10 extra DB lookups per feed request vs 500M Redis writes per celebrity post.
**Result:** Feed latency adds ~5ms. Celebrity post visible to all followers instantly.

**Additional trick:** For mega-celebs, Instagram pre-fetches and caches celebrity post IDs at a per-region layer so even the read-time lookup is cached.`,
        followUps:["How would you handle a viral post from a non-celebrity that suddenly gets 10M reposts?","What happens to the Redis feed cache when a user unfollows someone?"]
      },
      {
        question:"How do Instagram Stories expire after 24 hours?",
        answer:`**Cassandra TTL:** Each story row written with TTL 86400 (24h). Cassandra automatically tombstones and compacts expired rows.

**Feed visibility:** Story ring stored in Redis sorted set stories:{userId} with score = expiry_timestamp. Serve only stories where score > now().

**CDN purge:** Short CDN TTL (1h) + signed URLs with expiry matching story TTL. Expired URL returns 403 from CDN.

**Edge case:** Users expect stories to show until 24h after post time, not midnight. TTL is relative (created_at + 86400), not wall-clock midnight.`,
        followUps:["How would you implement 'Close Friends' stories (restricted visibility)?","How does Instagram track story views without creating a bottleneck at scale?"]
      },
      {
        question:"Design Instagram's Explore tab at scale.",
        answer:`**Goal:** Surface content the user has not seen but will engage with.

**Two-stage pipeline:**
1. **Candidate generation:** collaborative filtering — "users who liked posts you liked also liked X". Run offline (Spark) nightly, store top-1000 candidates per user in Cassandra.
2. **Real-time ranking:** At request time, score candidates by predicted engagement (ML model), content freshness, diversity (avoid N posts from same author).

**Trending hashtags:** Redis sorted set trending:global scored by views in last 1h x engagement rate x decay factor. Updated every 30s by a Flink stream job.

**Content safety:** Each uploaded post runs async through CV classifier (nudity/violence). Flagged posts excluded from Explore.`,
        followUps:["How would you personalize Explore for a brand-new user with no history?","How does hashtag search differ from Explore ranking?"]
      }
    ],

    tradeoffs:{
      pros:[
        "Hybrid fanout: O(1) reads for regular users, instant visibility for celebrity posts",
        "Cassandra TTL for Stories: zero application-level cleanup logic",
        "CDN pre-warm on upload: first byte to global users in <50ms",
        "Multi-resolution transcode: adaptive bitrate for bandwidth-constrained devices"
      ],
      cons:[
        "Read-time celebrity merge adds latency (acceptable: <10ms with caching)",
        "Redis feed cache invalidation on unlike/delete requires fan-out of deletions",
        "Elasticsearch lag: newly uploaded posts searchable after ~2s (eventual consistency)",
        "Transcode pipeline (Kafka workers) adds 10-30s before HD version available"
      ],
      when:"Apply this architecture to any media-first social platform. Fanout threshold tuned per platform (Instagram: ~10K, Twitter: ~1M). Always pre-warm CDN for expected viral content (live events, scheduled drops)."
    },

    flow:{
      title:"Instagram Photo Upload & Fanout Pipeline",
      caption:"Tap any node · Press Play to step through the pipeline",
      nodes:[
        {id:"client",   label:"📱 Client",        hint:"iOS/Android app. Compresses image client-side before upload"},
        {id:"api",      label:"⚡ API Gateway",    hint:"Auth, rate-limit, routes to Upload Service"},
        {id:"s3",       label:"☁ S3 Raw",         hint:"Raw upload stored. Triggers Kafka event"},
        {id:"kafka",    label:"⚙ Kafka",           hint:"media.uploaded topic — decouples upload from processing"},
        {id:"transcode",label:"🎬 Transcoder",     hint:"Generates 360/720/1080p WebP variants in parallel"},
        {id:"cdn",      label:"🌐 CDN Edge",       hint:"Pre-warmed at 300+ PoPs — global first byte <50ms"},
        {id:"fanout",   label:"📢 Fanout Worker",  hint:"Writes postId to each follower's Redis feed sorted set"},
        {id:"feed",     label:"🗃 Redis Feed",      hint:"Sorted set per user. Score = timestamp. Cap 800 entries"}
      ],
      steps:[
        {path:["client","api"],     label:"Upload request",          detail:"Client compresses to JPEG (85% quality), attaches caption + hashtags. Auth token validated at gateway."},
        {path:["api","s3"],         label:"Store raw media",         detail:"API writes raw file to S3 bucket (ig-raw). Returns 202 Accepted immediately — rest is async."},
        {path:["s3","kafka"],       label:"Publish media.uploaded",  detail:"S3 event triggers Lambda which publishes MediaEvent{postId, rawKey, userId, followerCount} to Kafka."},
        {path:["kafka","transcode"],label:"Transcode to resolutions", detail:"Transcoder consumes event. FFmpeg generates 360p/720p/1080p WebP variants in parallel workers."},
        {path:["transcode","cdn"],  label:"Pre-warm CDN edge",       detail:"Each variant pushed to CDN with Cache-Control: public, max-age=31536000. Global distribution in <3s."},
        {path:["kafka","fanout"],   label:"Trigger feed fanout",     detail:"After transcode complete, FanoutEvent published. Workers skip authors with >10K followers (celebrity path)."},
        {path:["fanout","feed"],    label:"Write to follower feeds",  detail:"ZADD feed:{followerId} timestamp postId for each follower. ZREMRANGEBYRANK trims to 800."}
      ]
    },

    uml:{
      title:"Feed Load — Hybrid Fanout Read Sequence",
      scenario:"User opens Instagram app — first feed request",
      actors:[
        {id:"app",   label:"📱 App"},
        {id:"api",   label:"API GW"},
        {id:"feed",  label:"Feed Svc"},
        {id:"redis", label:"Redis"},
        {id:"celeb", label:"Celeb DB"},
        {id:"rank",  label:"Ranker"}
      ],
      messages:[
        {from:"app",  to:"api",   label:"GET /feed?cursor=0",           detail:"App requests first page of feed. Includes auth token, device locale.",type:"sync"},
        {from:"api",  to:"feed",  label:"getFeed(userId, cursor=0)",     detail:"API gateway routes to Feed Service after auth validation.",type:"sync"},
        {from:"feed", to:"redis", label:"ZREVRANGE feed:{userId} 0 49",  detail:"Fetch top 50 post IDs from pre-computed feed sorted set.",type:"sync"},
        {from:"redis",to:"feed",  label:"[postId1, postId2, ...48 more]",detail:"Pre-computed IDs returned in score-desc order (newest first).",type:"sync"},
        {from:"feed", to:"celeb", label:"getRecentCelebPosts(celebIds)", detail:"Fetch last 20 posts from each celebrity the user follows (typically 0-5 celebrities).",type:"sync"},
        {from:"celeb",to:"feed",  label:"[celebPost1, celebPost2, ...]", detail:"Celebrity posts fetched directly from post DB shard. Not pre-fanned.",type:"sync"},
        {from:"feed", to:"rank",  label:"rank(merged, userId)",          detail:"ML ranking model scores all candidates: freshness x engagement x relationship strength.",type:"sync"},
        {from:"rank", to:"feed",  label:"Top 20 ranked post IDs",        detail:"Ranked list with diversity constraints (max 3 posts from same author per page).",type:"sync"},
        {from:"feed", to:"api",   label:"FeedPage{posts, nextCursor}",   detail:"Hydrated post objects + cursor for next page.",type:"sync"},
        {from:"api",  to:"app",   label:"HTTP 200 + feed JSON",          detail:"App renders feed. Pre-fetches next 20 posts in background for infinite scroll.",type:"sync"}
      ]
    },

    architecture:{
      title:"Instagram System Architecture",
      caption:"Click a component to inspect its production role",
      lanes:[
        {
          label:"Client", hint:"Mobile / Web",
          nodes:[
            {id:"ios",    label:"iOS App",   badge:"Swift",  hint:"UIKit/SwiftUI",     detail:"Performs client-side JPEG compression (85% quality), progressive upload with resumability. Prefetches next feed page after current loads."},
            {id:"android",label:"Android",   badge:"Kotlin", hint:"Jetpack Compose",   detail:"Adaptive bitrate selection based on network type (WiFi=1080p, 4G=720p, 3G=360p). Offline queue for failed uploads."},
            {id:"web",    label:"Web",       badge:"React",  hint:"PWA",               detail:"Instagram Web uses React with lazy-loaded route chunks. Stories use Intersection Observer for auto-play trigger."}
          ]
        },
        {
          label:"Edge / Gateway", hint:"Global entry points",
          nodes:[
            {id:"cdn",   label:"CDN PoPs",    badge:"CloudFront", hint:"300+ edge locations", detail:"All media served from CDN. Cache-Control: public, max-age=31536000 for media. Short TTL (60s) for feed API responses. Geo-routing sends users to nearest PoP."},
            {id:"apigw", label:"API Gateway", badge:"Nginx+",     hint:"Auth · Rate-limit",   detail:"L7 gateway handles TLS termination, JWT validation, per-user rate limiting (token bucket in Redis), and request routing to internal services."}
          ]
        },
        {
          label:"Core Services", hint:"Business logic layer",
          nodes:[
            {id:"uploadsvc", label:"Upload Svc",   badge:"Java",   hint:"Handles media intake",   detail:"Validates content type, size (max 100MB video), generates presigned S3 URL for direct client upload. Publishes to Kafka on S3 event."},
            {id:"feedsvc",   label:"Feed Svc",     badge:"Python", hint:"Hybrid fanout read",     detail:"Merges pre-computed Redis feed with celebrity real-time posts. Calls Ranking Service. Returns paginated cursor-based response."},
            {id:"storysvc",  label:"Story Svc",    badge:"Go",     hint:"24h ephemeral content",  detail:"Writes story with Cassandra TTL 86400. Manages story ring ordering. Tracks viewer set with Redis ZADD."},
            {id:"searchsvc", label:"Search Svc",   badge:"Java",   hint:"Hashtag + caption",      detail:"Indexes hashtags and captions into Elasticsearch on post creation. Powers Explore trending tab via Redis sorted set updated by Flink."},
            {id:"notif",     label:"Notif Svc",    badge:"Go",     hint:"Push + in-app",          detail:"APNs/FCM push for likes, comments, new followers. In-app via WebSocket long-poll. Rate-limited to prevent notification fatigue."}
          ]
        },
        {
          label:"Processing", hint:"Async pipeline",
          nodes:[
            {id:"kafka",     label:"Kafka",           badge:"Event Bus",    hint:"Backbone of async flows", detail:"Topics: media.uploaded, feed.fanout, notif.send, search.index. Partitioned by userId for ordering. 7-day retention for replay."},
            {id:"transcode", label:"Transcoder Fleet", badge:"FFmpeg",      hint:"Multi-res + WebP",         detail:"Kubernetes jobs per media item. Generates 360/720/1080p WebP and MP4 (H.265). Thumbnails for Explore grid. P99 transcode time: <30s."},
            {id:"fanout",    label:"Fanout Workers",   badge:"32 consumers", hint:"Feed write amplification", detail:"32 parallel Kafka consumers per partition. Each batch-writes postId to 500 followers Redis sorted sets. Skips authors with >10K followers."},
            {id:"ranker",    label:"Ranking Service",  badge:"ML / TF",     hint:"Personalized feed order", detail:"TensorFlow Serving. Features: author affinity, post freshness, predicted engagement (CTR model), content type preference. P99 latency: <20ms."}
          ]
        },
        {
          label:"Storage", hint:"Data persistence layer",
          nodes:[
            {id:"s3",       label:"S3 + CDN",      badge:"Object Store", hint:"All media blobs",             detail:"Raw uploads in ig-raw bucket. Processed variants in ig-media. Lifecycle rule: raw deleted after 24h. CDN origin for all media serving."},
            {id:"postgres",  label:"Postgres",      badge:"Sharded",     hint:"Post metadata + follow graph", detail:"Sharded by userId. Post table: postId, userId, s3Key, caption, hashtags, createdAt. Follow table: adjacency list. Read replicas for feed hydration."},
            {id:"redis",     label:"Redis Cluster", badge:"Feed cache",  hint:"Pre-computed feeds",           detail:"Sorted set per user: ZADD feed:{userId} score postId. Score = unix timestamp. ZREMRANGEBYRANK trims to 800 entries. 64GB cluster, no persistence (rebuilds from DB on restart)."},
            {id:"cassandra", label:"Cassandra",     badge:"Time-series", hint:"Stories + analytics",          detail:"Stories table: (userId, storyId, createdAt) WITH TTL 86400. Partition key = userId ensures stories for same user co-located. Used for view counts (counter columns)."},
            {id:"elastic",   label:"Elasticsearch", badge:"Search",      hint:"Hashtag + caption index",      detail:"Index: posts. Mapping: caption (text), hashtags (keyword), location (geo_point), createdAt (date). Refresh interval 2s — 2s lag for new post searchability."}
          ]
        }
      ],
      links:[
        {from:"apigw",    to:"uploadsvc", label:"POST /posts",            type:"sync"},
        {from:"apigw",    to:"feedsvc",   label:"GET /feed",              type:"sync"},
        {from:"apigw",    to:"storysvc",  label:"GET/POST /stories",      type:"sync"},
        {from:"apigw",    to:"searchsvc", label:"GET /search",            type:"sync"},
        {from:"uploadsvc",to:"s3",        label:"PutObject raw",          type:"async"},
        {from:"uploadsvc",to:"kafka",     label:"media.uploaded event",   type:"async"},
        {from:"kafka",    to:"transcode", label:"consume media.uploaded", type:"async"},
        {from:"transcode",to:"s3",        label:"PutObject variants",     type:"async"},
        {from:"transcode",to:"cdn",       label:"preWarm(cdnKey)",        type:"async"},
        {from:"kafka",    to:"fanout",    label:"consume feed.fanout",    type:"async"},
        {from:"fanout",   to:"redis",     label:"ZADD feed:{userId}",     type:"sync"},
        {from:"feedsvc",  to:"redis",     label:"ZREVRANGE feed",         type:"sync"},
        {from:"feedsvc",  to:"postgres",  label:"getRecentCelebPosts",    type:"sync"},
        {from:"feedsvc",  to:"ranker",    label:"rank(candidates)",       type:"sync"},
        {from:"storysvc", to:"cassandra", label:"INSERT story TTL 86400", type:"sync"},
        {from:"kafka",    to:"elastic",   label:"consume search.index",   type:"async"},
        {from:"kafka",    to:"notif",     label:"consume notif.send",     type:"async"}
      ]
    },

    visual: {
      type: "layered",
      title: "📸 Instagram System Architecture",
      layers: [
        {
          id: "client-layer",
          label: "Client Layer",
          color: "#e1306c",
          protocols: "HTTPS / GraphQL / REST",
          services: [
            { id: "ios-app",      label: "iOS App",      icon: "📱", sublabel: "Swift / UIKit",
              what: "Native iOS client — primary revenue driver (80% of DAU).",
              when: "User opens app, scrolls feed, uploads photo/reel.",
              how:  "UIKit + SwiftUI hybrid. GraphQL for feed, REST for uploads. Background upload via NSURLSession.",
              patterns: "MVVM + Coordinator, Optimistic UI, Offline-first caching",
              from: "User interaction, push notifications (APNs)",
              to:   "API Gateway (HTTPS/2, JWT auth header)",
              language: "Swift 5.9, UIKit, Combine",
              concurrency: "MainActor for UI, async/await + structured concurrency for network",
              latency: "Feed render < 100ms from cache; upload 1–30s depending on media size",
              owner: "iOS Team",
              failure: "Network error → local retry queue; server 5xx → cached feed shown",
              retry: "Exponential backoff, max 3 retries on 5xx, dead-letter to local DB" },
            { id: "android-app",  label: "Android App",  icon: "🤖", sublabel: "Kotlin / Compose",
              what: "Android client — second-largest platform, key market in emerging economies.",
              when: "User opens app, Reels playback, photo upload.",
              how:  "Jetpack Compose for UI. Retrofit + OkHttp for network. WorkManager for background uploads.",
              patterns: "MVI + UDF, StateFlow, ViewModel, Hilt DI",
              from: "User input, FCM push notifications",
              to:   "API Gateway (HTTP/2 + Protobuf for Reels metadata)",
              language: "Kotlin, Jetpack Compose, Coroutines",
              concurrency: "Coroutines + Dispatchers.IO, ViewModel coroutineScope",
              latency: "Cold start < 800ms; feed load < 200ms on cache hit",
              owner: "Android Team",
              failure: "WorkManager retries uploads on connectivity restore",
              retry: "WorkManager exponential backoff, max 10 attempts" },
            { id: "web-app",      label: "Web App",       icon: "🌐", sublabel: "React / PWA",
              what: "Progressive Web App — smaller % of traffic but high session depth on desktop.",
              when: "Desktop browse, direct link clicks from Google/Twitter.",
              how:  "React + Next.js for SSR. React Query for cache. Service Worker for offline.",
              patterns: "Islands architecture, SSR + hydration, stale-while-revalidate",
              from: "Browser navigation, OAuth redirect",
              to:   "API Gateway (REST + GraphQL)",
              language: "TypeScript, React 18, Next.js, Tailwind",
              concurrency: "React concurrent mode, suspense boundaries",
              latency: "First contentful paint < 1.2s (CDN cached); TTI < 2s",
              owner: "Web Team",
              failure: "Service Worker serves stale on offline; error boundary shows fallback",
              retry: "React Query retry: 3× with exponential delay" }
          ]
        },
        {
          id: "api-layer",
          label: "API Layer",
          color: "#58a6ff",
          protocols: "REST / GraphQL / Auth JWT",
          services: [
            { id: "api-gateway",  label: "API Gateway",  icon: "🔀", sublabel: "Nginx+ / Rate limit",
              what: "Edge entry point — TLS termination, routing, rate limiting, DDoS protection.",
              when: "Every inbound request from any client.",
              how:  "Nginx Plus with Lua scripts for JWT validation. 10Gbps ingress. Layer 7 routing by path prefix.",
              patterns: "API Gateway pattern, Sidecar proxy, Token bucket rate limiting",
              from: "iOS/Android/Web clients, 3rd party apps via public API",
              to:   "GraphQL API, Upload Service, Auth Service (JWT verification)",
              language: "Nginx + OpenResty (Lua), Envoy for newer services",
              concurrency: "Nginx event-driven non-blocking I/O, 100K+ concurrent connections",
              latency: "< 2ms added overhead at p99",
              owner: "Platform / Infra Team",
              failure: "Circuit breaker to upstream; 503 on overload; health-check auto-removes dead pods",
              retry: "No retry at gateway — prevents thundering herd; client-side retry only" },
            { id: "graphql-api",  label: "GraphQL API",  icon: "⚡", sublabel: "Feed & Stories",
              what: "Unified data query layer — clients fetch exactly what they need in one request.",
              when: "Feed loads, story ring expansion, profile page, Explore tab.",
              how:  "Relay-compatible schema. DataLoader for N+1 prevention. Persisted queries for mobile.",
              patterns: "DataLoader, Persisted Queries, Schema Federation",
              from: "API Gateway (authenticated request)",
              to:   "Feed Service, Story Service, User Service, Redis (field-level caching)",
              language: "Python (Graphene) or Node.js (Apollo Server)",
              concurrency: "Async resolvers, DataLoader batching per request",
              latency: "p50 < 30ms, p99 < 120ms (with DataLoader + Redis field cache)",
              owner: "API Platform Team",
              failure: "Partial results returned on resolver error; null-safe schema fields",
              retry: "Idempotent queries — client retries safe" },
            { id: "upload-svc",   label: "Upload Service", icon: "⬆️", sublabel: "Java / Spring",
              what: "Handles multipart photo/video upload — generates pre-signed S3 URL and publishes upload event.",
              when: "User posts photo or Reel.",
              how:  "Multipart upload to S3 via AWS SDK (chunked). Publishes to Kafka topic upload.created. Returns upload ID.",
              patterns: "Event Sourcing (upload.created event), Pre-signed URL pattern, Idempotency key",
              from: "API Gateway (multipart POST)",
              to:   "S3 (raw media), Kafka upload.created, Postgres (media metadata)",
              language: "Java 21, Spring Boot 3, Spring Kafka, AWS SDK v2",
              concurrency: "Virtual threads (Project Loom) for S3 streaming; Reactor for backpressure",
              latency: "Pre-signed URL generation < 10ms; actual upload time = network bound",
              owner: "Media Ingestion Team",
              failure: "Duplicate idempotency key → 200 (not re-processed); S3 error → 503 + client retry",
              retry: "Client retries with same idempotency key; server deduplicates" },
            { id: "auth-svc",     label: "Auth Service",  icon: "🔒", sublabel: "JWT / OAuth2",
              what: "Issues and validates JWT access tokens + refresh tokens. Handles OAuth2 for 3rd party login.",
              when: "Login, token refresh, OAuth2 callback, session validation.",
              how:  "RS256 JWT (asymmetric). Access token TTL 1h, refresh 30d. JWKS endpoint for gateway validation.",
              patterns: "OAuth2 Authorization Code + PKCE, Token rotation, JWKS public key distribution",
              from: "Login form, OAuth2 callback (Google/Facebook), API Gateway (token introspect)",
              to:   "Postgres (user credentials, refresh tokens), Redis (blacklisted tokens)",
              language: "Go, JWT-Go, Redis client",
              concurrency: "Goroutines per request; Redis pipelining for token ops",
              latency: "Token issue < 5ms; validation < 1ms (JWKS cached at gateway)",
              owner: "Identity Team",
              failure: "Token blacklist checked on revocation; refresh rotation prevents replay",
              retry: "Login idempotent; token refresh uses rotation — old token single-use" }
          ]
        },
        {
          id: "processing-layer",
          label: "Processing Layer",
          color: "#ffa657",
          protocols: "Kafka Topics / Async",
          services: [
            { id: "kafka-bus",   label: "Kafka",          icon: "⚙️", sublabel: "Event backbone",
              what: "Central event bus — decouples producers from consumers. All async side-effects go through Kafka.",
              when: "Photo upload, follow action, like, comment, story expiry, Reel post.",
              how:  "3 brokers, RF=3, min.insync.replicas=2. Key topics: upload.created, notif.send, feed.fanout, search.index.",
              patterns: "Event-driven architecture, Fan-out, Log compaction for user events, Dead Letter Queue",
              from: "Upload Service, API services, Story Service",
              to:   "Transcoder, Feed Service, Notification Service, Elasticsearch (search indexer)",
              language: "Apache Kafka 3.x (Kraft mode — no ZooKeeper)",
              concurrency: "Partitioned parallelism — partition count = consumer parallelism ceiling",
              latency: "Produce p99 < 5ms; end-to-end notification < 500ms",
              owner: "Data Platform / Streaming Team",
              failure: "Dead Letter Topic on 3 consumer failures; replay from offset on bug fix",
              retry: "Consumer retry with back-off; poison pill → DLT after max.poll.retries" },
            { id: "transcoder",  label: "Transcoder",     icon: "🎬", sublabel: "FFmpeg / K8s jobs",
              what: "Converts uploaded raw video to multiple resolutions and codecs (HLS + DASH).",
              when: "Kafka upload.created event for video/Reel media type.",
              how:  "Kubernetes Job per video. FFmpeg for H.264/AV1 encoding. Outputs 360p/720p/1080p HLS manifests to S3.",
              patterns: "Worker pattern, Kubernetes Jobs, Fan-out-on-write (multiple renditions)",
              from: "Kafka upload.created, S3 raw media bucket",
              to:   "S3 processed media bucket, Kafka transcode.complete",
              language: "Python, FFmpeg, Kubernetes Jobs, boto3",
              concurrency: "Horizontal scaling via K8s Job parallelism; one pod per video segment",
              latency: "30s video → ~2min transcode at 720p; async, user unblocked",
              owner: "Media Processing Team",
              failure: "K8s Job restartPolicy=OnFailure; 3 retries then Kafka DLT",
              retry: "K8s backoffLimit=3; idempotent — S3 object overwrite safe" },
            { id: "feed-svc",    label: "Feed Service",   icon: "📢", sublabel: "Hybrid fanout",
              what: "Generates and serves personalized feeds using hybrid fanout strategy.",
              when: "New post published (fanout-on-write for normal users); feed read (fanout-on-read for celebrities).",
              how:  "Fan-out-on-write: pushes postId into follower Redis sorted sets (ZADD by timestamp). Celebrities (>10K followers) use fan-out-on-read at query time.",
              patterns: "CQRS, Hybrid fanout (push+pull), Read-through cache",
              from: "Kafka feed.fanout, GraphQL API (read path)",
              to:   "Redis (ZADD follower feed), Postgres (cold storage), Ranking Service",
              language: "Go, Redis client (Radix), Kafka consumer",
              concurrency: "Worker pool; 1M fanouts/s via Redis pipeline batching",
              latency: "Feed write p99 < 10ms per follower; read p50 < 20ms from Redis",
              owner: "Feed Team",
              failure: "Fanout failure → Kafka retry; stale feed acceptable (eventual consistency)",
              retry: "At-least-once Kafka consumption; Redis ZADD idempotent by score" },
            { id: "notif-svc",   label: "Notification Svc", icon: "🔔", sublabel: "APNs / FCM",
              what: "Delivers push notifications to mobile devices for likes, follows, comments, mentions.",
              when: "Kafka notif.send event consumed.",
              how:  "Reads user device token from Postgres. Batches sends to APNs (iOS) and FCM (Android). Handles token refresh on failure.",
              patterns: "Event-driven, Batch sending, Fan-out, Token rotation",
              from: "Kafka notif.send",
              to:   "APNs (iOS), FCM (Android), Postgres (token storage)",
              language: "Node.js, apn library, Firebase Admin SDK",
              concurrency: "Async I/O; 50K notifications/s via connection pooling to APNs",
              latency: "End-to-end notification delivery < 500ms (p90)",
              owner: "Growth / Notifications Team",
              failure: "APNs invalid token → delete from Postgres; FCM quota → queue + retry",
              retry: "Kafka retry topic with 1s/5s/30s delay tiers" },
            { id: "ranker",      label: "Ranking Service", icon: "🧠", sublabel: "ML / TensorFlow",
              what: "Scores and re-ranks candidate feed posts using engagement prediction model.",
              when: "Feed read path — called by Feed Service on cache miss or personalization request.",
              how:  "Feature extraction (user affinity, post recency, engagement rate). TF Serving model inference. Returns scored list.",
              patterns: "Two-tower retrieval model, Candidate generation + re-ranking pipeline",
              from: "Feed Service (candidate list), Redis (user features), Kafka (engagement events)",
              to:   "Feed Service (ranked post IDs)",
              language: "Python, TensorFlow Serving, gRPC",
              concurrency: "TF Serving model server handles batched inference; async gRPC",
              latency: "p50 < 15ms, p99 < 60ms for 100-candidate re-ranking",
              owner: "ML / Ranking Team",
              failure: "Model error → fallback to recency sort; stale model alert via Prometheus",
              retry: "Idempotent — re-ranking is read-only" }
          ]
        },
        {
          id: "storage-layer",
          label: "Storage Layer",
          color: "#3fb950",
          protocols: "S3 / Redis / Cassandra / PG",
          services: [
            { id: "s3-cdn",      label: "S3 + CDN",       icon: "☁️", sublabel: "300+ PoPs",
              what: "Immutable media storage + global delivery via CDN edge network.",
              when: "Media upload write; media view/download read.",
              how:  "S3 for durable storage. CloudFront CDN with 300+ PoPs caches media at edge. Cache-Control: max-age=31536000 (1yr) for immutable media.",
              patterns: "Write-once immutable objects, CDN cache-aside, Origin shielding",
              from: "Upload Service (raw), Transcoder (processed HLS)",
              to:   "CDN → Client (media delivery)",
              language: "AWS S3 SDK, CloudFront, Lambda@Edge for auth",
              concurrency: "S3 multipart upload (parallel parts); CDN handles 1M+ req/s per PoP",
              latency: "CDN HIT < 5ms; S3 origin miss < 50ms; first-byte to client < 10ms (edge)",
              owner: "Infra / CDN Team",
              failure: "S3 99.999999999% durability; CDN PoP failover automatic; origin shield absorbs burst",
              retry: "Multipart upload: resume from last successful part" },
            { id: "redis-feed",  label: "Redis Cluster",  icon: "⚡", sublabel: "Feed sorted sets",
              what: "In-memory store for user feed (sorted sets keyed by userId), hot profile data, session tokens.",
              when: "Feed fanout writes (ZADD), feed reads (ZREVRANGE), session validation.",
              how:  "Redis Cluster (16 shards, RF=2). ZADD postId score=timestamp. ZREVRANGE 0 99 for top-100 feed. LRU eviction.",
              patterns: "Cache-aside, Sorted set for timeline, Cluster sharding by userId hash",
              from: "Feed Service (fanout writes), Auth Service (session write)",
              to:   "Feed Service (read), API Gateway (session validate)",
              language: "Redis 7.x, Cluster mode, AOF + RDB persistence",
              concurrency: "Single-threaded I/O per node; pipeline batching for high throughput",
              latency: "ZADD/ZREVRANGE < 1ms p99 in-cluster",
              owner: "Data Platform / Cache Team",
              failure: "AOF for durability; Redis Sentinel for auto-failover; feed degraded to DB on Redis down",
              retry: "Redis command idempotent (ZADD NX for dedup)" },
            { id: "cassandra",   label: "Cassandra",      icon: "🗃️", sublabel: "Stories TTL 24h",
              what: "Wide-column store for Stories (TTL-based auto-expiry) and activity time-series data.",
              when: "Story post, story view, story expiry (24h TTL automatic).",
              how:  "Partition key = userId, clustering key = storyId. TTL=86400s on INSERT — no manual cleanup. RF=3, eventual consistency.",
              patterns: "TTL-based expiry, Write-heavy LSM tree, Partition per user, Denormalized reads",
              from: "Story Service (writes), GraphQL API (reads)",
              to:   "Client via GraphQL (story list), Kafka (story.expired event)",
              language: "Apache Cassandra 4.x, Java driver",
              concurrency: "Masterless — any node accepts writes; tunable consistency (LOCAL_QUORUM)",
              latency: "Write p99 < 5ms; read p99 < 15ms (LOCAL_QUORUM)",
              owner: "Storage Team",
              failure: "Hinted handoff on node down; repair for long partitions; tombstone accumulation risk on heavy delete",
              retry: "Write idempotent with LWT (lightweight transaction) where needed" },
            { id: "postgres",    label: "Postgres",       icon: "🐘", sublabel: "Sharded metadata",
              what: "Primary relational store for users, follows, post metadata, comments — sharded by userId.",
              when: "User registration, follow/unfollow, post create, comment, like (write); profile/post queries (read).",
              how:  "Horizontal sharding by userId (Citus or application-level). Read replicas per shard for read scaling. Connection pooling via PgBouncer.",
              patterns: "Read replica fan-out, Connection pooling, Shard by userId, CQRS",
              from: "Auth Service, API services",
              to:   "Application services (read via replicas), Redis (cache miss backfill)",
              language: "PostgreSQL 16, PgBouncer, Citus extension",
              concurrency: "PgBouncer pools: 20 server connections per pool; read replicas for fan-out",
              latency: "Point query p50 < 5ms; complex query p99 < 50ms (index-covered)",
              owner: "Database Team",
              failure: "Synchronous streaming replication; failover via Patroni (< 30s); PgBouncer reconnects automatically",
              retry: "Idempotent upserts with ON CONFLICT DO NOTHING" },
            { id: "elastic",     label: "Elasticsearch",  icon: "🔍", sublabel: "Hashtag search",
              what: "Full-text search engine for hashtags, captions, user search, and Explore trending content.",
              when: "Post created (index), user types in search bar (query), Explore tab load.",
              how:  "Consumed from Kafka search.index topic. Inverted index on caption, hashtags, username. BM25 + custom boosting for Explore trending.",
              patterns: "CQRS (write to Kafka → consume into ES), Inverted index, Near-real-time indexing",
              from: "Kafka search.index (consume), API Gateway (search queries)",
              to:   "GraphQL API (search results)",
              language: "Elasticsearch 8.x, Java client",
              concurrency: "Bulk indexing via Kafka consumer; search via async HTTP client",
              latency: "Indexing lag < 2s from post; search query p50 < 30ms",
              owner: "Search Team",
              failure: "ES node failure → shard replica promotes; index lag acceptable (eventual)",
              retry: "Kafka consumer retry with DLT on persistent ES errors" }
          ]
        }
      ],
      flows: [
        {
          name: "Photo Upload",
          path: ["ios-app", "api-gateway", "upload-svc", "kafka-bus", "transcoder", "s3-cdn"],
          color: "#e1306c"
        },
        {
          name: "Feed Read",
          path: ["android-app", "api-gateway", "graphql-api", "feed-svc", "redis-feed", "ranker"],
          color: "#58a6ff"
        },
        {
          name: "Fanout Write",
          path: ["kafka-bus", "feed-svc", "redis-feed"],
          color: "#ffa657"
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
