(function() {
  var topic = {
  id:"sd-case-social-feed", area:"sysdesign",
  title:"Case Study: Social Media Feed (Twitter / Instagram)",
  tag:"Case Study", tags:["social feed","fanout","fanout on write","fanout on read","twitter","instagram","timeline","celebrity problem"],
  concept:`**Requirements:** Generate a ranked feed of posts from followed users. 500M DAU, 500M tweets/day, 500B feed reads/day.

**Two approaches:**

**Fanout-on-write (push model):**
When user A posts, immediately push to every follower's feed cache.
- Read: O(1) — pre-computed feed in Redis sorted set
- Write: O(followers) — slow for celebrities (Lady Gaga = 50M followers → 50M Redis writes per tweet)
- Celebrity problem: async fan-out with Kafka; celeb writes go to separate queue

**Fanout-on-read (pull model):**
On feed load, fetch posts from all followed users, merge, rank.
- Write: O(1) — just save the tweet
- Read: O(N accounts followed × posts/account) — slow; requires many DB lookups
- Scales poorly for users following many accounts

**Twitter's hybrid approach:**
- Fanout-on-write for regular users (< 1M followers)
- Fanout-on-read for celebrities (> 1M followers)
- At read time: merge pre-computed feed + real-time fetch of celebrity tweets

**Feed storage:**
Redis sorted set per user: \`ZADD feed:{userId} score tweetId\`
Score = publish timestamp (or ranking signal: engagement + freshness + relevance).
Keep only last 800 tweets in feed cache; older tweets fetched from DB.

**Ranking:** ML model. Features: author relationship strength, tweet freshness, engagement rate, user interests. Served by a ranking service per request.

**Storage:** Tweets in Cassandra (write-heavy, time-series). User → followers mapping in graph DB or adjacency list in Cassandra. Media in S3 + CDN.`,
  why:`Feed design is asked at Twitter, Instagram, Facebook. Fanout-on-write vs read trade-off demonstrates understanding of the space-time trade-off at scale.`,
  example:{
    language:"java",
    code:`// Feed service — hybrid fanout
@Service
public class FeedService {

    @Autowired private TweetRepository tweetRepo;         // Cassandra
    @Autowired private FollowerRepository followerRepo;
    @Autowired private RedisTemplate<String,Long> redis;
    @Autowired private KafkaTemplate<String,FanoutTask> kafka;

    // Called when user posts a tweet
    @Async
    public void onTweetCreated(Tweet tweet) {
        long followersCount = followerRepo.countFollowers(tweet.getAuthorId());

        if (followersCount <= 1_000_000) {
            // Regular user: fanout-on-write via Kafka
            kafka.send("fanout.tasks", new FanoutTask(tweet.getId(),
                tweet.getAuthorId(), tweet.getScore()));
        }
        // Celebrities: no fanout — handled at read time
    }

    // Fanout worker — processes FanoutTask from Kafka
    @KafkaListener(topics = "fanout.tasks", concurrency = "20")
    public void fanoutWorker(FanoutTask task) {
        // Get all follower IDs (paginated — may be 100K)
        followerRepo.getFollowerIdsBatch(task.getAuthorId()).forEach(followerId -> {
            // Add tweet to follower's feed sorted set
            redis.opsForZSet().add(
                "feed:" + followerId,
                task.getTweetId(),
                task.getScore()
            );
            // Trim to 800 items
            redis.opsForZSet().removeRange("feed:" + followerId, 0, -801);
        });
    }

    // Get feed for a user
    public List<Tweet> getFeed(String userId, int page, int size) {
        // 1. Get pre-computed feed from Redis
        Set<Long> feedTweetIds = redis.opsForZSet()
            .reverseRange("feed:" + userId, (long)page*size, (long)page*size+size-1);

        // 2. Fetch celebrity tweets user follows (fanout-on-read)
        List<String> celebIds = followerRepo.getCelebrityFollowees(userId);
        List<Tweet> celebTweets = tweetRepo.getRecentTweets(celebIds, 20);

        // 3. Merge + rank
        List<Tweet> allTweets = new ArrayList<>();
        allTweets.addAll(tweetRepo.findAllById(feedTweetIds));
        allTweets.addAll(celebTweets);
        allTweets.sort(Comparator.comparingDouble(Tweet::getScore).reversed());

        return allTweets.subList(0, Math.min(size, allTweets.size()));
    }
}`,
    notes:"Score = timestamp + engagement signal. Freshness ensures new posts appear; engagement signal keeps viral content visible."
  },
  interview:[
    {question:"How do you handle the celebrity problem in a social feed?",
     answer:`**Problem:** A celebrity with 50M followers posts a tweet. Fanout-on-write = 50M Redis writes in seconds. Redis cluster saturated. Regular fan-outs of normal users starved.\n\n**Solutions:**\n1. **Async batching:** Don't fan-out immediately. Kafka consumer groups process fan-outs over minutes in priority queues. But feed is stale for minutes — unacceptable for real-time.\n2. **Hybrid (Twitter's approach):** Set threshold (1M followers). Regular users → fanout-on-write. Celebrities → no precomputed fan-out. At read time, check which celebrities user follows (usually <10), fetch their last 20 tweets, merge with pre-computed feed in real time. Only 10 DB lookups per feed request.\n3. **Sharded fan-out:** Shard celebrity followers into 1000-user batches. Kafka partitions. 50K parallel workers each handle 1000 followers → complete fan-out in 5 seconds vs 50 seconds sequentially.`,
     followUps:["How does Instagram rank posts in its feed?","How would you implement infinite scroll pagination for a feed?"]
    }
  ],
  tradeoffs:{
    pros:["Fanout-on-write: O(1) reads — excellent user experience","Redis sorted set for feed: sorted by score, O(log N) insert, O(1) read"],
    cons:["Fanout-on-write: write amplification for high-follower accounts","Feed cache must be invalidated on unlike/delete (complex)"],
    when:"Always hybrid for social feeds at scale. Fan-out threshold tuned based on follower count. Start with fanout-on-read for simplicity; migrate to write when read latency becomes unacceptable."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var W = 460, H = 320;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    mount.appendChild(canvas);
    mount.appendChild(btnRow);
    var ctx = canvas.getContext('2d');

    var mode = null; // 'write' | 'read' | 'hybrid'
    var dots = []; // {x, y, tx, ty, t, done, color}
    var phase = 0;
    var phaseT = 0;
    var msg = 'Select a fanout strategy to visualize';
    var msgColor = '#8b949e';
    var raf = null;
    var NFOLLOWERS = 24;

    // Follower dot positions in a fan pattern
    function followerPos(i, total, cx, cy, r) {
      var angle = (i / total) * Math.PI * 1.5 - Math.PI * 0.25;
      return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }

    var posterX = 80, posterY = 160;
    var kafkaX = 200, kafkaY = 120;
    var mergeX = 200, mergeY = 200;
    var feedX = 380, feedY = 130;
    var dotsDone = 0;

    function box(x, y, w, h, fill, stroke, r) {
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x-w/2, y-h/2, w, h, r||5); ctx.fill(); ctx.stroke();
    }
    function lbl(x, y, text, color, size) {
      ctx.fillStyle=color||'#e6edf3'; ctx.font=(size||10)+'px monospace'; ctx.textAlign='center';
      ctx.fillText(text, x, y);
    }
    function arw(x1,y1,x2,y2,color) {
      var dx=x2-x1,dy=y2-y1,L=Math.sqrt(dx*dx+dy*dy); if(L<1)return;
      var ux=dx/L,uy=dy/L;
      ctx.strokeStyle=color; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-ux*7-uy*3,y2-uy*7+ux*3);
      ctx.lineTo(x2-ux*7+uy*3,y2-uy*7-ux*3);
      ctx.fill();
    }

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);

      var modeLabel = mode==='write'?'FAN-OUT ON WRITE':mode==='read'?'FAN-OUT ON READ':mode==='hybrid'?'HYBRID (TWITTER)':'SELECT MODE';
      lbl(W/2, 18, modeLabel, '#8b949e', 11);

      if (!mode) {
        lbl(W/2, H/2, 'Click a button below to start', '#30363d', 12);
        ctx.fillStyle=msgColor; ctx.font='11px monospace'; ctx.textAlign='center';
        ctx.fillText(msg, W/2, H-10);
        return;
      }

      // Poster
      box(posterX, posterY, 72, 40, phase>=1?'#1a3a1a':'#161b22', phase>=1?'#3fb950':'#30363d');
      lbl(posterX, posterY-7, 'User', '#3fb950', 10);
      lbl(posterX, posterY+7, 'Posts', '#8b949e', 9);

      if (mode==='write' || mode==='hybrid') {
        // Kafka
        box(kafkaX, kafkaY, 72, 36, phase>=2?'#1a1a2a':'#161b22', phase>=2?'#58a6ff':'#30363d');
        lbl(kafkaX, kafkaY, 'Kafka', '#58a6ff', 10);
        if (phase>=1) arw(posterX+36,posterY-5,kafkaX-36,kafkaY+5,'#3fb950');

        // Feed workers → followers
        var workerX = 310, workerY = 80;
        if (phase>=2) {
          arw(kafkaX+36,kafkaY,workerX-30,workerY+5,'#58a6ff');
          box(workerX, workerY, 72, 28, '#161b22', '#58a6ff');
          lbl(workerX, workerY, 'Feed Workers', '#58a6ff', 9);
        }

        // Follower feed dots
        var nShow = mode==='hybrid'?8:NFOLLOWERS;
        for (var i=0; i<nShow; i++) {
          var fp = followerPos(i, nShow, 380, 190, 90);
          if (phase>=3 && dots[i] && dots[i].done) {
            ctx.fillStyle='#3fb950'; ctx.beginPath(); ctx.arc(fp.x, fp.y, 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle='#1a3a1a'; ctx.strokeStyle='#3fb950'; ctx.lineWidth=0.8;
            ctx.beginPath(); ctx.arc(fp.x, fp.y, 8, 0, Math.PI*2); ctx.stroke();
          } else {
            ctx.fillStyle='#30363d'; ctx.beginPath(); ctx.arc(fp.x, fp.y, 5, 0, Math.PI*2); ctx.fill();
          }
        }
        lbl(380, 290, nShow + ' followers\' feeds updated', '#8b949e', 9);

        // Celebrity warning
        if (mode==='write' && phase>=2) {
          ctx.fillStyle='#2a0a0a'; ctx.strokeStyle='#f85149'; ctx.lineWidth=1.5;
          ctx.beginPath(); ctx.roundRect(8, 240, 180, 30, 5); ctx.fill(); ctx.stroke();
          lbl(98, 252, 'CELEBRITY PROBLEM:', '#f85149', 9);
          lbl(98, 266, '10M followers = 10M writes!', '#f85149', 9);
        }
        if (mode==='hybrid' && phase>=2) {
          ctx.fillStyle='#1a1a0a'; ctx.strokeStyle='#ffa657'; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.roundRect(8, 240, 200, 30, 5); ctx.fill(); ctx.stroke();
          lbl(108, 252, 'Normal users: fan-out-write', '#ffa657', 9);
          lbl(108, 266, 'Celebrities: fan-out-read', '#3fb950', 9);
        }
      }

      if (mode==='read') {
        // Merge service
        box(mergeX, mergeY, 80, 36, phase>=2?'#1a1a2a':'#161b22', phase>=2?'#58a6ff':'#30363d');
        lbl(mergeX, mergeY, 'Merge Service', '#58a6ff', 10);
        if (phase>=1) arw(posterX+36,posterY+8,mergeX-40,mergeY+5,'#3fb950');

        // Followed accounts (dots on left)
        var accs = [{x:100,y:80,label:'User1'},{x:100,y:120,label:'User2'},{x:100,y:160,label:'User3'},{x:100,y:200,label:'User4'}];
        accs.forEach(function(a){
          ctx.fillStyle='#161b22'; ctx.strokeStyle=phase>=2?'#bc8cff':'#30363d'; ctx.lineWidth=1;
          ctx.beginPath(); ctx.roundRect(a.x-28,a.y-12,56,24,4); ctx.fill(); ctx.stroke();
          lbl(a.x, a.y+4, a.label, phase>=2?'#bc8cff':'#8b949e', 9);
          if (phase>=2) arw(a.x+28, a.y, mergeX-40, mergeY, '#bc8cff');
        });

        // Feed output
        if (phase>=3) {
          box(360, mergeY, 80, 36, '#1a3a1a', '#3fb950');
          lbl(360, mergeY, 'Feed', '#3fb950', 10);
          arw(mergeX+40, mergeY, 320, mergeY, '#3fb950');
        }

        if (phase>=2) {
          ctx.fillStyle='#2a1a0a'; ctx.strokeStyle='#ffa657'; ctx.lineWidth=1.2;
          ctx.beginPath(); ctx.roundRect(8, 240, 200, 30, 5); ctx.fill(); ctx.stroke();
          lbl(108, 252, 'READ SLOW: N DB lookups', '#ffa657', 9);
          lbl(108, 266, 'per feed refresh', '#ffa657', 9);
        }
      }

      // Moving dots animation
      for (var d=0; d<dots.length; d++) {
        if (!dots[d].done) {
          dots[d].t += 0.05;
          var t = Math.min(1, dots[d].t);
          var px = dots[d].x + (dots[d].tx - dots[d].x)*t;
          var py = dots[d].y + (dots[d].ty - dots[d].y)*t;
          ctx.fillStyle = dots[d].color;
          ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI*2); ctx.fill();
          if (dots[d].t>=1) dots[d].done=true;
        }
      }

      ctx.fillStyle=msgColor; ctx.font='11px monospace'; ctx.textAlign='center';
      ctx.fillText(msg, W/2, H-10);
    }

    function startMode(m) {
      mode=m; phase=0; dots=[]; dotsDone=0;
      if(raf) cancelAnimationFrame(raf);
      msg='User posts...'; msgColor='#3fb950';
      var steps = [
        function(){ phase=1; msg='Post created by user'; msgColor='#3fb950'; },
        function(){ phase=2;
          if(m==='write'||m==='hybrid') { msg='Kafka receives event → Fan-out workers start'; msgColor='#58a6ff'; }
          else { msg='Merge service fetches posts from all followees'; msgColor='#58a6ff'; }
        },
        function(){ phase=3;
          var nShow = m==='hybrid'?8:NFOLLOWERS;
          if(m==='write'||m==='hybrid') {
            for(var i=0;i<nShow;i++){
              var fp=followerPos(i,nShow,380,190,90);
              (function(fp2,delay){
                setTimeout(function(){
                  if(!document.body.contains(canvas)) return;
                  dots.push({x:310,y:80,tx:fp2.x,ty:fp2.y,t:0,done:false,color:'#3fb950'});
                }, delay);
              })(fp, i*50);
            }
            msg = (m==='hybrid'?'8 normal-user':'24') + ' follower feeds updated via workers'; msgColor='#3fb950';
          } else {
            msg='Merge-sort results → feed ready (slow!)'; msgColor='#ffa657';
          }
        }
      ];
      var si = 0;
      var iv = setInterval(function(){
        if(!document.body.contains(canvas)) { clearInterval(iv); return; }
        if(si < steps.length) { steps[si](); si++; }
        else { clearInterval(iv); }
      }, 800);
      function animLoop(){
        if(!document.body.contains(canvas)) return;
        draw();
        raf=requestAnimationFrame(animLoop);
      }
      animLoop();
    }

    draw();

    [{label:'Fan-out Write',fn:function(){startMode('write');}},{label:'Fan-out Read',fn:function(){startMode('read');}},{label:'Show Hybrid',fn:function(){startMode('hybrid');}}]
    .forEach(function(op){
      var b=document.createElement('button'); b.textContent=op.label; b.style.cssText=btnStyle; b.onclick=op.fn; btnRow.appendChild(b);
    });
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
