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

  why:`Instagram pioneered at-scale media pipelines. Photo upload → multi-resolution transcode → CDN pre-warm is the canonical pattern for any media platform. Feed fanout + celebrity hybrid is the textbook answer for all social feed questions. Stories added ephemeral-content pattern (Cassandra TTL, ring viewer tracking).`,

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

  visual: function(mount) {
    var W = 520, H = 300;
    var DARK = '#0a0a0f', CARD = '#12121a', BORDER = '#1e1e2e';
    var PINK = '#e1306c', PURPLE = '#833ab4', ORANGE = '#fd5000';
    var GREEN = '#3fb950', BLUE = '#58a6ff', GRAY = '#8b949e';
    var GOLD = '#e3a008';

    var modeBar = document.createElement('div');
    modeBar.style.cssText = 'display:flex;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';
    var modes = [
      {key:'fanout',  label:'Fanout Flow',     color: PINK},
      {key:'upload',  label:'Upload Pipeline', color: BLUE},
      {key:'stories', label:'Stories Ring',    color: PURPLE}
    ];
    var activeMode = 'fanout';
    var particles = [];
    var storyAngle = 0;
    var pipeStep = 0;
    var pipeParticle = null;
    var selectedStory = null;
    var storyTimer = 0;
    var running = false;
    var rafId = null;
    var intervalId = null;
    var speed = 1;

    var modeBtns = modes.map(function(m) {
      var b = document.createElement('button');
      b.textContent = (m.key === 'fanout' ? '📢 ' : m.key === 'upload' ? '📸 ' : '⭕ ') + m.label;
      b.style.cssText = 'padding:4px 12px;border-radius:20px;border:1px solid ' + m.color + '55;background:' +
        (m.key === activeMode ? m.color + '22' : 'transparent') +
        ';color:' + m.color + ';cursor:pointer;font-size:12px;font-family:monospace;transition:all 0.2s';
      b.addEventListener('click', function() {
        if (running) { running = false; if (rafId) cancelAnimationFrame(rafId); if (intervalId) clearInterval(intervalId); }
        activeMode = m.key;
        modeBtns.forEach(function(btn, i) {
          btn.style.background = modes[i].key === activeMode ? modes[i].color + '22' : 'transparent';
        });
        particles = []; storyAngle = 0; pipeStep = 0; pipeParticle = null; selectedStory = null;
        playBtn.textContent = '► Play'; playBtn.style.color = PINK;
        statusEl.textContent = '';
        draw();
      });
      modeBar.appendChild(b);
      return b;
    });
    mount.appendChild(modeBar);

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center';
    var playBtn = document.createElement('button');
    playBtn.textContent = '► Play';
    playBtn.style.cssText = 'padding:4px 14px;border-radius:6px;border:1px solid ' + PINK + '55;background:' + PINK + '18;color:' + PINK + ';cursor:pointer;font-size:12px;font-family:monospace';
    var postBtn = document.createElement('button');
    postBtn.textContent = '✦ Post Now';
    postBtn.style.cssText = 'padding:4px 14px;border-radius:6px;border:1px solid ' + GREEN + '55;background:' + GREEN + '18;color:' + GREEN + ';cursor:pointer;font-size:12px;font-family:monospace';
    var speedSel = document.createElement('select');
    speedSel.style.cssText = 'padding:3px 8px;border-radius:6px;border:1px solid ' + BORDER + ';background:' + CARD + ';color:' + GRAY + ';font-size:11px;font-family:monospace';
    ['1x','2x','0.5x'].forEach(function(s) { var o = document.createElement('option'); o.textContent = s; speedSel.appendChild(o); });
    ctrl.appendChild(playBtn); ctrl.appendChild(postBtn); ctrl.appendChild(speedSel);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:' + W + 'px;border-radius:10px;background:' + DARK + ';display:block;margin:0 auto;border:1px solid ' + BORDER;
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var statusEl = document.createElement('div');
    statusEl.style.cssText = 'text-align:center;font-size:11px;font-family:monospace;color:' + GRAY + ';margin-top:6px;min-height:18px';
    mount.appendChild(statusEl);

    speedSel.addEventListener('change', function() {
      speed = speedSel.selectedIndex === 0 ? 1 : speedSel.selectedIndex === 1 ? 2 : 0.5;
    });

    // Followers in circle
    var FOLLOWER_COUNT = 12;
    var followers = [];
    for (var fi = 0; fi < FOLLOWER_COUNT; fi++) {
      var fa = (fi / FOLLOWER_COUNT) * Math.PI * 2 - Math.PI / 2;
      followers.push({ x: W/2 + Math.cos(fa)*105, y: H/2 + Math.sin(fa)*82, lit: 0 });
    }

    var pipeStages = [
      {label:'Client',    sub:'📱 compress', x:45,  color:BLUE},
      {label:'API GW',    sub:'⚡ auth+limit',x:130, color:BLUE},
      {label:'S3 Raw',    sub:'☁ store',     x:215, color:GOLD},
      {label:'Kafka',     sub:'⚙ event bus', x:300, color:ORANGE},
      {label:'Transcode', sub:'🎬 FFmpeg',    x:385, color:PURPLE},
      {label:'CDN',       sub:'🌐 pre-warm',  x:470, color:GREEN}
    ];

    var storyUsers = [
      {name:'You',   color:PINK,   hasStory:true,  viewed:false},
      {name:'Alice', color:PURPLE, hasStory:true,  viewed:true},
      {name:'Bob',   color:'#fd1d1d', hasStory:true,  viewed:false},
      {name:'Carol', color:GOLD,   hasStory:false, viewed:false},
      {name:'Dave',  color:BLUE,   hasStory:true,  viewed:true},
      {name:'Eve',   color:GREEN,  hasStory:true,  viewed:false},
      {name:'Frank', color:'#e3a008', hasStory:false, viewed:false},
      {name:'Grace', color:'#f78166', hasStory:true,  viewed:false}
    ];

    function roundRect(x, y, w, h, r, fill, stroke) {
      ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, w, h, r);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
    }
    function txt(t, x, y, col, sz, align) {
      ctx.fillStyle = col || '#e6edf3'; ctx.font = (sz||11)+'px monospace';
      ctx.textAlign = align||'center'; ctx.textBaseline = 'middle'; ctx.fillText(t,x,y);
    }

    function drawFanout() {
      ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H);
      var cx = W/2, cy = H/2;

      // Kafka dashed ring
      ctx.save(); ctx.strokeStyle = ORANGE+'44'; ctx.lineWidth=1; ctx.setLineDash([3,5]);
      ctx.beginPath(); ctx.arc(cx,cy,62,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
      txt('Kafka fanout', cx+60, cy-18, ORANGE+'99', 9);

      // Connection lines
      followers.forEach(function(f) {
        ctx.save(); ctx.globalAlpha=0.1; ctx.strokeStyle=GRAY; ctx.lineWidth=0.8;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(f.x,f.y); ctx.stroke(); ctx.restore();
      });

      // Author center
      var g = ctx.createRadialGradient(cx,cy,0,cx,cy,36);
      g.addColorStop(0,PINK+'dd'); g.addColorStop(1,PURPLE+'33');
      ctx.beginPath(); ctx.arc(cx,cy,32,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      ctx.strokeStyle=PINK; ctx.lineWidth=2; ctx.stroke();
      txt('📸',cx,cy-5,null,15); txt('Author',cx,cy+14,'#e6edf3',9);

      // Followers
      followers.forEach(function(f) {
        if (f.lit > 0) {
          var g2 = ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,20);
          g2.addColorStop(0,GREEN+Math.round(f.lit*180).toString(16).padStart(2,'0'));
          g2.addColorStop(1,'transparent');
          ctx.beginPath(); ctx.arc(f.x,f.y,20,0,Math.PI*2); ctx.fillStyle=g2; ctx.fill();
        }
        roundRect(f.x,f.y,36,20,5,CARD,f.lit>0.3?GREEN:BORDER);
        txt(f.lit>0.5?'✅':'👤',f.x,f.y,null,10);
      });

      // Particles
      particles.forEach(function(p) {
        ctx.globalAlpha = Math.max(0,p.alpha);
        var gr = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
        gr.addColorStop(0,p.color); gr.addColorStop(1,'transparent');
        ctx.fillStyle=gr; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      });

      var lit = followers.filter(function(f){return f.lit>0.1;}).length;
      roundRect(52,18,96,22,5,CARD,BORDER);
      txt('Reached: '+lit+'/'+FOLLOWER_COUNT, 52, 18, lit>0?GREEN:GRAY, 10);
      txt('Redis ZADD feed:{userId} score postId', W/2, H-12, BLUE+'66', 9);
      if (!running) txt('Press Play · Post Now to animate', W/2, H-26, GRAY+'88', 9);
    }

    function spawnPost() {
      var cx=W/2, cy=H/2;
      followers.forEach(function(f,i) {
        setTimeout(function() {
          if (!document.body.contains(canvas)) return;
          particles.push({x:cx,y:cy,tx:f.x,ty:f.y,t:0,follower:i,color:PINK,r:7,alpha:1,done:false});
          statusEl.textContent = '⚡ Kafka fanout → Redis ZADD feed:{follower'+i+'} score postId';
        }, i*75);
      });
    }

    function updateFanout() {
      particles = particles.filter(function(p){
        if (p.done) return p.alpha>0;
        p.t = Math.min(1, p.t + 0.032*speed);
        var e = 1-Math.pow(1-p.t,3);
        p.x = W/2+(followers[p.follower].x-W/2)*e;
        p.y = H/2+(followers[p.follower].y-H/2)*e;
        p.r = 7-p.t*3.5;
        if (p.t>=1){p.done=true;followers[p.follower].lit=1;}
        return true;
      });
      followers.forEach(function(f){if(f.lit>0)f.lit=Math.max(0,f.lit-0.004*speed);});
    }

    function drawUpload() {
      ctx.fillStyle=DARK; ctx.fillRect(0,0,W,H);
      txt('Photo Upload Pipeline', W/2, 20, '#e6edf3', 12);
      txt('Step '+Math.min(pipeStep+1,pipeStages.length)+' of '+pipeStages.length, W/2, 36, GRAY, 10);
      var sy = H/2 - 10;
      pipeStages.forEach(function(s,i) {
        var active = pipeStep===i, done = i<pipeStep;
        var bgCol = done ? GREEN+'18' : (active ? s.color+'22' : CARD);
        var bdCol = done ? GREEN : (active ? s.color : BORDER);
        roundRect(s.x, sy, 66, 44, 8, bgCol, bdCol);
        txt(s.label, s.x, sy-8, active?s.color:done?GREEN:GRAY, 10);
        txt(s.sub, s.x, sy+8, active?s.color+'cc':GRAY, 9);
        if (done) { ctx.fillStyle=GREEN; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('✓',s.x+29,sy-14); }
        if (i<pipeStages.length-1) {
          var x1=s.x+33, x2=pipeStages[i+1].x-33;
          ctx.strokeStyle = done?GREEN+'88':BORDER; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.moveTo(x1,sy); ctx.lineTo(x2,sy); ctx.stroke();
          ctx.fillStyle = done?GREEN+'88':BORDER;
          ctx.beginPath(); ctx.moveTo(x2,sy); ctx.lineTo(x2-6,sy-4); ctx.lineTo(x2-6,sy+4); ctx.closePath(); ctx.fill();
        }
      });
      if (pipeParticle) {
        var pp=pipeParticle;
        ctx.globalAlpha=pp.alpha;
        var gr2=ctx.createRadialGradient(pp.x,sy,0,pp.x,sy,10);
        gr2.addColorStop(0,BLUE); gr2.addColorStop(1,'transparent');
        ctx.fillStyle=gr2; ctx.beginPath(); ctx.arc(pp.x,sy,10,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
      var stepDescs = [
        'Client compresses JPEG 85% quality · attaches caption + hashtags',
        'API Gateway validates auth token · rate-limit check passes (token bucket)',
        'Raw media written to S3 ig-raw bucket · 202 Accepted returned to client',
        'Kafka media.uploaded event published · transcoder + fanout workers notified',
        'FFmpeg generates 360/720/1080p WebP variants in parallel Kubernetes jobs',
        'CDN pre-warmed at 300+ PoPs · global first byte time < 50ms ✓'
      ];
      roundRect(W/2, H-26, W-20, 26, 6, CARD, BORDER);
      txt(stepDescs[Math.min(pipeStep,stepDescs.length-1)], W/2, H-26, BLUE+'dd', 10);
      txt('Press ✦ Post Now to advance each stage', W/2, H+10, GRAY+'66', 9);
    }

    function advancePipeline() {
      if (pipeStep >= pipeStages.length-1) {
        pipeStep=0; pipeParticle=null; statusEl.textContent='Pipeline complete — photo live on CDN ✓'; draw(); return;
      }
      var from=pipeStages[pipeStep], to=pipeStages[pipeStep+1];
      pipeParticle={x:from.x,alpha:1};
      var dx=to.x-from.x, t0=Date.now(), dur=500/speed;
      function ap(){
        if(!document.body.contains(canvas))return;
        var t=Math.min(1,(Date.now()-t0)/dur), e=1-Math.pow(1-t,2);
        pipeParticle.x=from.x+dx*e; pipeParticle.alpha=t<0.8?1:(1-t)/0.2;
        draw();
        if(t<1) requestAnimationFrame(ap);
        else { pipeStep++; pipeParticle=null; statusEl.textContent='→ '+pipeStages[Math.min(pipeStep,pipeStages.length-1)].label+' stage'; draw(); }
      }
      ap();
    }

    function drawStories() {
      ctx.fillStyle=DARK; ctx.fillRect(0,0,W,H);
      txt('Instagram Stories Ring', W/2, 20, '#e6edf3', 13);
      txt('Cassandra TTL:86400s · Redis viewer ring · CDN signed URLs', W/2, 36, GRAY, 10);
      var n=storyUsers.length, sx=48, gap=(W-96)/(n-1);
      storyUsers.forEach(function(u,i) {
        var x=sx+i*gap, y=H/2;
        if (!u.hasStory) {
          ctx.beginPath(); ctx.arc(x,y,20,0,Math.PI*2); ctx.fillStyle=CARD; ctx.fill();
          ctx.strokeStyle=BORDER; ctx.lineWidth=1.5; ctx.stroke();
          txt('👤',x,y,null,14); txt(u.name,x,y+30,GRAY,9); return;
        }
        ctx.save();
        if (u.viewed) { ctx.strokeStyle=GRAY+'55'; ctx.lineWidth=2.5; }
        else {
          var rg=ctx.createLinearGradient(x-24,y-24,x+24,y+24);
          rg.addColorStop(0,PINK); rg.addColorStop(0.5,PURPLE); rg.addColorStop(1,ORANGE);
          ctx.strokeStyle=rg; ctx.lineWidth=3;
        }
        ctx.beginPath(); ctx.arc(x,y,24,-Math.PI/2+storyAngle,Math.PI*1.5+storyAngle); ctx.stroke();
        ctx.restore();
        ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2);
        ctx.fillStyle=u.color+'33'; ctx.fill();
        txt('👤',x,y,null,13);
        txt(u.name,x,y+30,u.viewed?GRAY:'#e6edf3',9);
        if (u===selectedStory) {
          ctx.fillStyle=CARD; ctx.fillRect(x-18,y+38,36,4);
          ctx.fillStyle=u.color; ctx.fillRect(x-18,y+38,36*(1-storyTimer),4);
        }
      });
      roundRect(W/2,H-16,W-20,20,5,CARD,BORDER);
      if (selectedStory) txt('Viewing '+selectedStory.name+' · ZADD storyViews:'+selectedStory.name+' ts userId · TTL countdown active',W/2,H-16,selectedStory.color+'cc',9);
      else txt('Click a gradient ring to view story · Colored ring = unviewed · Gray = seen',W/2,H-16,GRAY,9);
    }

    canvas.addEventListener('click', function(e) {
      if (activeMode!=='stories') return;
      var rect=canvas.getBoundingClientRect(), scaleX=W/rect.width, scaleY=H/rect.height;
      var mx=(e.clientX-rect.left)*scaleX, my=(e.clientY-rect.top)*scaleY;
      var n=storyUsers.length, sx=48, gap=(W-96)/(n-1);
      storyUsers.forEach(function(u,i){
        var x=sx+i*gap, y=H/2, dx=mx-x, dy=my-y;
        if (dx*dx+dy*dy<28*28 && u.hasStory){ selectedStory=u; storyTimer=0; u.viewed=true; statusEl.textContent='Viewing '+u.name+' story · ZADD storyViews:'+u.name+' '+Date.now()+' userId → Cassandra viewer count++'; draw(); }
      });
    });

    function draw() {
      if (activeMode==='fanout') drawFanout();
      else if (activeMode==='upload') drawUpload();
      else drawStories();
    }

    function frame() {
      if (!running || !document.body.contains(canvas)) return;
      rafId=requestAnimationFrame(frame);
      if (activeMode==='fanout'){ updateFanout(); drawFanout(); }
      else if (activeMode==='stories'){ storyAngle+=0.018*speed; if(selectedStory){storyTimer=Math.min(1,storyTimer+0.004*speed);if(storyTimer>=1){selectedStory=null;storyTimer=0;}} drawStories(); }
      else drawUpload();
    }

    function startLoop() {
      running=true; playBtn.textContent='⏸ Pause'; playBtn.style.color=ORANGE;
      if (activeMode==='fanout') intervalId=setInterval(function(){if(!document.body.contains(canvas)||!running){clearInterval(intervalId);return;}spawnPost();},3200/speed);
      frame();
    }
    function pauseLoop() {
      running=false; playBtn.textContent='► Play'; playBtn.style.color=PINK;
      if(rafId)cancelAnimationFrame(rafId); if(intervalId)clearInterval(intervalId);
    }

    playBtn.addEventListener('click',function(){if(running)pauseLoop();else startLoop();});
    postBtn.addEventListener('click',function(){
      if(activeMode==='fanout'){spawnPost();statusEl.textContent='✦ Post published → Kafka fanout.workers consuming...';}
      else if(activeMode==='upload') advancePipeline();
      else statusEl.textContent='Click a story ring to view it';
    });

    draw();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
