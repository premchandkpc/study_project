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
            { id: "ios-app", label: "iOS App", icon: "📱", sublabel: "Swift / UIKit" },
            { id: "android-app", label: "Android App", icon: "🤖", sublabel: "Kotlin / Compose" },
            { id: "web-app", label: "Web App", icon: "🌐", sublabel: "React / PWA" }
          ]
        },
        {
          id: "api-layer",
          label: "API Layer",
          color: "#58a6ff",
          protocols: "REST / GraphQL / Auth JWT",
          services: [
            { id: "api-gateway", label: "API Gateway", icon: "🔀", sublabel: "Nginx+ / Rate limit" },
            { id: "graphql-api", label: "GraphQL API", icon: "⚡", sublabel: "Feed & Stories" },
            { id: "upload-svc", label: "Upload Service", icon: "⬆️", sublabel: "Java / Spring" },
            { id: "auth-svc", label: "Auth Service", icon: "🔒", sublabel: "JWT / OAuth2" }
          ]
        },
        {
          id: "processing-layer",
          label: "Processing Layer",
          color: "#ffa657",
          protocols: "Kafka Topics / Async",
          services: [
            { id: "kafka-bus", label: "Kafka", icon: "⚙️", sublabel: "Event backbone" },
            { id: "transcoder", label: "Transcoder", icon: "🎬", sublabel: "FFmpeg / K8s jobs" },
            { id: "feed-svc", label: "Feed Service", icon: "📢", sublabel: "Hybrid fanout" },
            { id: "notif-svc", label: "Notification Svc", icon: "🔔", sublabel: "APNs / FCM" },
            { id: "ranker", label: "Ranking Service", icon: "🧠", sublabel: "ML / TensorFlow" }
          ]
        },
        {
          id: "storage-layer",
          label: "Storage Layer",
          color: "#3fb950",
          protocols: "S3 / Redis / Cassandra / PG",
          services: [
            { id: "s3-cdn", label: "S3 + CDN", icon: "☁️", sublabel: "300+ PoPs" },
            { id: "redis-feed", label: "Redis Cluster", icon: "⚡", sublabel: "Feed sorted sets" },
            { id: "cassandra", label: "Cassandra", icon: "🗃️", sublabel: "Stories TTL 24h" },
            { id: "postgres", label: "Postgres", icon: "🐘", sublabel: "Sharded metadata" },
            { id: "elastic", label: "Elasticsearch", icon: "🔍", sublabel: "Hashtag search" }
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
