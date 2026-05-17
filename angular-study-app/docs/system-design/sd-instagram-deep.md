# Case Study: Instagram - Photo/Reel Upload, Feed, Stories & Scale

Source: `src/modules/topics/sysdesign/sd-instagram-deep.js`
Tag: `Case Study`
Doc path: `docs/system-design/sd-instagram-deep.md`

## Concept
**Scale:** 2B+ MAU - 100M+ photos/day - 4M likes/second - 500M Stories/day

**Four core flows to master:**

** Photo / Reel Upload**
```
Client -> API Gateway -> Upload Service
  -> Object Store (S3 raw)
  -> Kafka: media.uploaded
    -> Transcoder (multiple resolutions: 360/720/1080p, WebP)
    -> CDN Pre-warm (push to edge PoPs)
  -> Metadata DB (Postgres: postId, userId, caption, hashtags)
  -> Search Indexer (Elasticsearch: hashtag/caption)
  -> Fanout Worker (Kafka: feed.fanout)
```

** Feed Generation (Hybrid Fanout)**
- **Regular users (<10K followers):** Fanout-on-write -> push postId to each follower's feed in Redis sorted set (score = timestamp)
- **Celebrities (>10K followers):** No precomputed push. At read time, fetch recent posts, merge into feed
- **Feed read:** Merge Redis precomputed + celebrity real-time -> Ranking ML model -> paginated response

** Stories (Time-bounded, ring architecture)**
- 24h TTL stored in Cassandra (time-series)
- Viewer ring updated via Redis ZADD storyViews:{storyId} timestamp userId
- Stories CDN pre-warmed for author's top followers (predicted-access pre-push)

** Explore / Search**
- Elasticsearch indexes caption + hashtags at upload time
- Trending scored by: view rate x engagement rate x freshness (decaying exponential)
- Personalized Explore: collaborative filtering (users who liked similar posts)

**Storage Architecture:**
| Data | Store | Why |
|------|-------|-----|
| Media files | S3 + CloudFront | Blob, durable, CDN-native |
| Feed cache | Redis sorted set | O(log N) write, O(1) range read |
| Post metadata | Postgres (sharded) | Relational, ACID |
| Stories timeline | Cassandra | Time-series, TTL native |
| Follow graph | adjacency in Postgres + Redis cache | Fast follower lookup |
| Search | Elasticsearch | Full-text + hashtag |

## Production Architecture
Instagram pioneered at-scale media pipelines. Photo upload -> multi-resolution transcode -> CDN pre-warm is the canonical pattern for any media platform. Feed fanout + celebrity hybrid is the textbook answer for all social feed questions. Stories added ephemeral-content pattern (Cassandra TTL, ring viewer tracking).

## Architecture Checklist
- Client / iOS App: Performs client-side JPEG compression (85% quality), progressive upload with resumability. Prefetches next feed page after current loads.
- Client / Android: Adaptive bitrate selection based on network type (WiFi=1080p, 4G=720p, 3G=360p). Offline queue for failed uploads.
- Client / Web: Instagram Web uses React with lazy-loaded route chunks. Stories use Intersection Observer for auto-play trigger.
- Edge / Gateway / CDN PoPs: All media served from CDN. Cache-Control: public, max-age=31536000 for media. Short TTL (60s) for feed API responses. Geo-routing sends users to nearest PoP.
- Edge / Gateway / API Gateway: L7 gateway handles TLS termination, JWT validation, per-user rate limiting (token bucket in Redis), and request routing to internal services.
- Core Services / Upload Svc: Validates content type, size (max 100MB video), generates presigned S3 URL for direct client upload. Publishes to Kafka on S3 event.
- Core Services / Feed Svc: Merges pre-computed Redis feed with celebrity real-time posts. Calls Ranking Service. Returns paginated cursor-based response.
- Core Services / Story Svc: Writes story with Cassandra TTL 86400. Manages story ring ordering. Tracks viewer set with Redis ZADD.
- Core Services / Search Svc: Indexes hashtags and captions into Elasticsearch on post creation. Powers Explore trending tab via Redis sorted set updated by Flink.
- Core Services / Notif Svc: APNs/FCM push for likes, comments, new followers. In-app via WebSocket long-poll. Rate-limited to prevent notification fatigue.
- Processing / Kafka: Topics: media.uploaded, feed.fanout, notif.send, search.index. Partitioned by userId for ordering. 7-day retention for replay.
- Processing / Transcoder Fleet: Kubernetes jobs per media item. Generates 360/720/1080p WebP and MP4 (H.265). Thumbnails for Explore grid. P99 transcode time: <30s.
- Processing / Fanout Workers: 32 parallel Kafka consumers per partition. Each batch-writes postId to 500 followers Redis sorted sets. Skips authors with >10K followers.
- Processing / Ranking Service: TensorFlow Serving. Features: author affinity, post freshness, predicted engagement (CTR model), content type preference. P99 latency: <20ms.
- Storage / S3 + CDN: Raw uploads in ig-raw bucket. Processed variants in ig-media. Lifecycle rule: raw deleted after 24h. CDN origin for all media serving.
- Storage / Postgres: Sharded by userId. Post table: postId, userId, s3Key, caption, hashtags, createdAt. Follow table: adjacency list. Read replicas for feed hydration.
- Storage / Redis Cluster: Sorted set per user: ZADD feed:{userId} score postId. Score = unix timestamp. ZREMRANGEBYRANK trims to 800 entries. 64GB cluster, no persistence (rebuilds from DB on restart).
- Storage / Cassandra: Stories table: (userId, storyId, createdAt) WITH TTL 86400. Partition key = userId ensures stories for same user co-located. Used for view counts (counter columns).
- Storage / Elasticsearch: Index: posts. Mapping: caption (text), hashtags (keyword), location (geo_point), createdAt (date). Refresh interval 2s - 2s lag for new post searchability.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Client"]
    ios["iOS App"]
    android["Android"]
    web["Web"]
  end
  subgraph lane_1["Edge / Gateway"]
    cdn["CDN PoPs"]
    apigw["API Gateway"]
  end
  subgraph lane_2["Core Services"]
    uploadsvc["Upload Svc"]
    feedsvc["Feed Svc"]
    storysvc["Story Svc"]
    searchsvc["Search Svc"]
    notif["Notif Svc"]
  end
  subgraph lane_3["Processing"]
    kafka["Kafka"]
    transcode["Transcoder Fleet"]
    fanout["Fanout Workers"]
    ranker["Ranking Service"]
  end
  subgraph lane_4["Storage"]
    s3["S3 + CDN"]
    postgres["Postgres"]
    redis["Redis Cluster"]
    cassandra["Cassandra"]
    elastic["Elasticsearch"]
  end
  apigw -->|"POST /posts"| uploadsvc
  apigw -->|"GET /feed"| feedsvc
  apigw -->|"GET/POST /stories"| storysvc
  apigw -->|"GET /search"| searchsvc
  uploadsvc -.->|"PutObject raw"| s3
  uploadsvc -.->|"media.uploaded event"| kafka
  kafka -.->|"consume media.uploaded"| transcode
  transcode -.->|"PutObject variants"| s3
  transcode -.->|"preWarm(cdnKey)"| cdn
  kafka -.->|"consume feed.fanout"| fanout
  fanout -->|"ZADD feed:{userId}"| redis
  feedsvc -->|"ZREVRANGE feed"| redis
  feedsvc -->|"getRecentCelebPosts"| postgres
  feedsvc -->|"rank(candidates)"| ranker
  storysvc -->|"INSERT story TTL 86400"| cassandra
  kafka -.->|"consume search.index"| elastic
  kafka -.->|"consume notif.send"| notif
```

## UML Sequence
```mermaid
sequenceDiagram
  participant app as App
  participant api as API GW
  participant feed as Feed Svc
  participant redis as Redis
  participant celeb as Celeb DB
  participant rank as Ranker
  app->>api: GET /feed?cursor=0
  api->>feed: getFeed(userId, cursor=0)
  feed->>redis: ZREVRANGE feed:{userId} 0 49
  redis->>feed: [postId1, postId2, ...48 more]
  feed->>celeb: getRecentCelebPosts(celebIds)
  celeb->>feed: [celebPost1, celebPost2, ...]
  feed->>rank: rank(merged, userId)
  rank->>feed: Top 20 ranked post IDs
  feed->>api: FeedPage{posts, nextCursor}
  api->>app: HTTP 200 + feed JSON
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Upload request - Client compresses to JPEG (85% quality), attaches caption + hashtags. Auth token validated at gateway.
2. Store raw media - API writes raw file to S3 bucket (ig-raw). Returns 202 Accepted immediately - rest is async.
3. Publish media.uploaded - S3 event triggers Lambda which publishes MediaEvent{postId, rawKey, userId, followerCount} to Kafka.
4. Transcode to resolutions - Transcoder consumes event. FFmpeg generates 360p/720p/1080p WebP variants in parallel workers.
5. Pre-warm CDN edge - Each variant pushed to CDN with Cache-Control: public, max-age=31536000. Global distribution in <3s.
6. Trigger feed fanout - After transcode complete, FanoutEvent published. Workers skip authors with >10K followers (celebrity path).
7. Write to follower feeds - ZADD feed:{followerId} timestamp postId for each follower. ZREMRANGEBYRANK trims to 800.

## Interview Drills
1. How does Instagram handle a celebrity (500M followers) posting a photo?
   **Problem:** Fanout-on-write for 500M followers = 500M Redis writes cluster saturated for minutes.
   
   **Instagram hybrid solution:**
   1. **Threshold check** (>10K followers = celebrity) skip precomputed fanout
   2. **At read time:** for each celebrity the user follows, fetch their last 20 posts from post DB
   3. **Merge** celebrity posts with pre-computed regular feed in real time (typically fewer than 10 celebrity followees per user)
   4. **Rank** merged list, return top 20
   
   **Cost:** ~10 extra DB lookups per feed request vs 500M Redis writes per celebrity post.
   **Result:** Feed latency adds ~5ms. Celebrity post visible to all followers instantly.
   
   **Additional trick:** For mega-celebs, Instagram pre-fetches and caches celebrity post IDs at a per-region layer so even the read-time lookup is cached.
   Follow-ups: How would you handle a viral post from a non-celebrity that suddenly gets 10M reposts?; What happens to the Redis feed cache when a user unfollows someone?

2. How do Instagram Stories expire after 24 hours?
   **Cassandra TTL:** Each story row written with TTL 86400 (24h). Cassandra automatically tombstones and compacts expired rows.
   
   **Feed visibility:** Story ring stored in Redis sorted set stories:{userId} with score = expiry_timestamp. Serve only stories where score > now().
   
   **CDN purge:** Short CDN TTL (1h) + signed URLs with expiry matching story TTL. Expired URL returns 403 from CDN.
   
   **Edge case:** Users expect stories to show until 24h after post time, not midnight. TTL is relative (created_at + 86400), not wall-clock midnight.
   Follow-ups: How would you implement 'Close Friends' stories (restricted visibility)?; How does Instagram track story views without creating a bottleneck at scale?

3. Design Instagram's Explore tab at scale.
   **Goal:** Surface content the user has not seen but will engage with.
   
   **Two-stage pipeline:**
   1. **Candidate generation:** collaborative filtering - "users who liked posts you liked also liked X". Run offline (Spark) nightly, store top-1000 candidates per user in Cassandra.
   2. **Real-time ranking:** At request time, score candidates by predicted engagement (ML model), content freshness, diversity (avoid N posts from same author).
   
   **Trending hashtags:** Redis sorted set trending:global scored by views in last 1h x engagement rate x decay factor. Updated every 30s by a Flink stream job.
   
   **Content safety:** Each uploaded post runs async through CV classifier (nudity/violence). Flagged posts excluded from Explore.
   Follow-ups: How would you personalize Explore for a brand-new user with no history?; How does hashtag search differ from Explore ranking?

## Trade-offs
Pros:
- Hybrid fanout: O(1) reads for regular users, instant visibility for celebrity posts
- Cassandra TTL for Stories: zero application-level cleanup logic
- CDN pre-warm on upload: first byte to global users in <50ms
- Multi-resolution transcode: adaptive bitrate for bandwidth-constrained devices

Cons:
- Read-time celebrity merge adds latency (acceptable: <10ms with caching)
- Redis feed cache invalidation on unlike/delete requires fan-out of deletions
- Elasticsearch lag: newly uploaded posts searchable after ~2s (eventual consistency)
- Transcode pipeline (Kafka workers) adds 10-30s before HD version available

When to use:
Apply this architecture to any media-first social platform. Fanout threshold tuned per platform (Instagram: ~10K, Twitter: ~1M). Always pre-warm CDN for expected viral content (live events, scheduled drops).

## Gotchas
_No gotchas yet._

