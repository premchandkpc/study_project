(function() {
  var topic = {
  id:"sd-case-video-platform", area:"sysdesign",
  title:"Case Study: Video Platform (Netflix / YouTube)",
  tag:"Case Study", tags:["netflix","youtube","video streaming","hls","dash","adaptive bitrate","cdn","transcoding","chunked upload"],
  concept:`**Requirements:** 500M users, 1B hours watched/day, 500 hours of video uploaded/minute.

**Upload pipeline:**
1. **Chunked upload** — client splits video into 5-10MB chunks, uploads in parallel. Resumable on failure.
2. **Raw storage** — chunks assembled in S3 bucket (upload bucket).
3. **Transcoding** — distributed job: split video into 5s segments → transcode each segment to multiple resolutions (2160p/1080p/720p/480p/360p/240p) and codecs (H.264, H.265, AV1) in parallel.
4. **Adaptive Bitrate (ABR)** — generate HLS (HTTP Live Streaming) or MPEG-DASH manifest file listing all variants. Player selects bitrate based on network speed.
5. **CDN distribution** — transcoded segments pushed to 200+ CDN PoPs.

**Streaming:**
- Player requests manifest (\`.m3u8\` or \`.mpd\`).
- Downloads 2-10 second segments. Measures download speed.
- Switches bitrate every segment — seamless quality adaptation.
- No persistent connection — pure HTTP. Works through proxies, firewalls.

**Recommendation engine:**
Two-stage: candidate generation (ALS matrix factorisation — 1M videos → top 100) → ranking model (features: watch history, freshness, CTR, diversity) → top 10-20 shown.

**Storage:**
- Video segments: S3 / GCS (object storage)
- Metadata (title, uploader, description): PostgreSQL / Spanner
- View counts, likes: Redis (real-time) + Cassandra (batch aggregated)
- Search index: Elasticsearch
- CDN: Netflix uses their own Open Connect CDN; YouTube uses Google's CDN`,
  why:`Video streaming design is a common senior-level question. Transcoding pipeline, HLS/DASH, and CDN strategy are unique to this domain.`,
  example:{
    language:"yaml",
    code:`# Video transcoding pipeline — AWS MediaConvert or custom FFmpeg workers

# 1. Upload initiation
POST /uploads/initiate
Response: { uploadId: "abc123", chunks: [{chunkNum: 1, presignedUrl: "..."}, ...] }

# 2. Client uploads chunks in parallel (5 concurrent)
PUT <presignedUrl>  # each chunk uploaded directly to S3 (bypasses API server)

# 3. Upload completion trigger
POST /uploads/complete { uploadId: "abc123" }
  → SQS message → Transcoding workers

# 4. Transcoding worker (Python + FFmpeg)
# Split into 4-second segments, transcode each in parallel:
Resolutions:
  - 2160p (4K):  bitrate 15Mbps, codec H.265
  - 1080p (FHD): bitrate 4Mbps, codec H.264/H.265/AV1
  - 720p (HD):   bitrate 2Mbps, codec H.264
  - 480p:        bitrate 1Mbps, codec H.264
  - 360p:        bitrate 500Kbps, codec H.264
  - 240p:        bitrate 200Kbps, codec H.264 (mobile/slow networks)

# 5. HLS manifest generation (.m3u8)
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=4000000,RESOLUTION=1920x1080
https://cdn.example.com/videos/abc123/1080p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
https://cdn.example.com/videos/abc123/720p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=640x360
https://cdn.example.com/videos/abc123/360p/playlist.m3u8

# 6. CDN pre-warm for popular content
# On publish, push first 30s of all resolutions to all PoPs (popular content anticipation)
# Long-tail content: serve from S3 on cache miss`,
    notes:"Netflix's Open Connect appliances are deployed IN ISP datacenters — video bytes travel only from ISP's own rack to user. Eliminates internet transit cost."
  },
  interview:[
    {question:"How does adaptive bitrate streaming work?",
     answer:`ABR (HLS/DASH) works in 5 steps:\n1. Server transcodes video into multiple quality levels (2160p → 240p) and divides each into short segments (2-10 seconds).\n2. A manifest file lists all quality variants with bandwidth requirements.\n3. Player downloads the manifest, picks initial quality based on measured bandwidth.\n4. Player downloads segment, measures download time. If download took longer than segment duration → bandwidth too low → switch to lower quality next segment.\n5. If download is consistently fast → buffer ahead and switch to higher quality.\n\n**Key insight:** Switching happens at segment boundaries — seamless. Player maintains a 15-30 second buffer to absorb network jitter without pause.\n\nHLS uses \`.m3u8\` (Apple format, supported natively by iOS/Safari). DASH is ISO standard (Chrome, Android). Both achieve same result — adaptive quality.`,
     followUps:["Why does Netflix pre-transcode to AV1 codec?","How do you handle DRM (Digital Rights Management) for premium content?"]
    }
  ],
  tradeoffs:{
    pros:["HLS/DASH: works over plain HTTP, CDN-friendly, adaptive quality","Chunked upload: resumable, parallel — fast for large files","Distributed transcoding: elastic scale — 500h/minute is feasible"],
    cons:["Transcoding is compute-intensive and expensive ($0.50/min of video for 1080p)","Manifest + segment files multiply storage (6 resolutions × many segments)","ABR introduces complexity in player implementation"],
    when:"HLS for iOS/Safari. DASH for Android/Chrome. AV1 codec for bandwidth-constrained mobile markets. Always CDN for video — sending video from origin is economically infeasible at scale."
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

    var currentStep = 0;
    var raf = null;
    var uploadProg = 0;
    var workerProgs = [0,0,0,0];
    var animRunning = false;

    // Pipeline steps
    var steps = [
      {num:'①', label:'Client Upload', x:40,  y:80,  color:'#3fb950', detail:'Upload raw video\n(chunked parallel)'},
      {num:'②', label:'Upload Svc',   x:130, y:80,  color:'#58a6ff', detail:'Save to S3\n(upload bucket)'},
      {num:'③', label:'DB Meta',      x:220, y:80,  color:'#bc8cff', detail:'status=PROCESSING\nmetadata saved'},
      {num:'④', label:'Queue',        x:310, y:80,  color:'#ffa657', detail:'Job to Kafka/SQS\ntranscode queue'},
      {num:'⑤', label:'Workers',      x:310, y:185, color:'#58a6ff', detail:'4 parallel workers\n360p/720p/1080p/4K'},
      {num:'⑥', label:'CDN',          x:220, y:185, color:'#ffa657', detail:'Thumbnails + segments\nto CDN PoPs'},
      {num:'⑦', label:'DB Ready',     x:130, y:185, color:'#3fb950', detail:'status=READY\nSearch index update'}
    ];

    function box(x,y,w,h,fill,stroke,active) {
      ctx.fillStyle=active?'#1a2a1a':'#161b22';
      ctx.strokeStyle=active?fill:stroke||'#30363d';
      ctx.lineWidth=active?2:1;
      ctx.beginPath(); ctx.roundRect(x-w/2,y-h/2,w,h,6); ctx.fill(); ctx.stroke();
    }
    function lbl(x,y,text,color,size) {
      ctx.fillStyle=color||'#e6edf3'; ctx.font=(size||10)+'px monospace'; ctx.textAlign='center';
      ctx.fillText(text,x,y);
    }
    function arw(x1,y1,x2,y2,color) {
      var dx=x2-x1,dy=y2-y1,L=Math.sqrt(dx*dx+dy*dy); if(L<1)return;
      var ux=dx/L,uy=dy/L;
      ctx.strokeStyle=color; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.fillStyle=color;
      ctx.beginPath(); ctx.moveTo(x2,y2);
      ctx.lineTo(x2-ux*7-uy*3,y2-uy*7+ux*3);
      ctx.lineTo(x2-ux*7+uy*3,y2-uy*7-ux*3); ctx.fill();
    }
    function progressBar(x,y,w,h,frac,color) {
      ctx.fillStyle='#30363d'; ctx.beginPath(); ctx.roundRect(x,y,w,h,3); ctx.fill();
      ctx.fillStyle=color; ctx.beginPath(); ctx.roundRect(x,y,w*frac,h,3); ctx.fill();
    }

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0,0,W,H); ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);
      lbl(W/2, 18, 'VIDEO UPLOAD PIPELINE  ①→⑦', '#8b949e', 11);

      // Draw pipeline nodes
      var nodeW=68, nodeH=38;
      steps.forEach(function(s,i){
        var active = i < currentStep;
        var current = i === currentStep-1;
        box(s.x,s.y,nodeW,nodeH,s.color,'#30363d',active);
        lbl(s.x, s.y-7, s.num+' '+s.label, active?s.color:'#8b949e', 10);
        if (active) {
          ctx.fillStyle='#3fb950'; ctx.font='9px monospace'; ctx.textAlign='center';
          ctx.fillText('✓', s.x+nodeW/2-8, s.y+8);
        }
      });

      // Arrows top row
      if(currentStep>=2) arw(steps[0].x+34,steps[0].y,steps[1].x-34,steps[1].y,'#3fb950');
      if(currentStep>=3) arw(steps[1].x+34,steps[1].y,steps[2].x-34,steps[2].y,'#58a6ff');
      if(currentStep>=4) arw(steps[2].x+34,steps[2].y,steps[3].x-34,steps[3].y,'#bc8cff');
      // Down arrow from queue to workers
      if(currentStep>=5) arw(steps[3].x,steps[3].y+19,steps[4].x,steps[4].y-19,'#ffa657');
      // Bottom row right to left
      if(currentStep>=6) arw(steps[4].x-34,steps[4].y,steps[5].x+34,steps[5].y,'#58a6ff');
      if(currentStep>=7) arw(steps[5].x-34,steps[5].y,steps[6].x+34,steps[6].y,'#ffa657');

      // Upload progress bar
      if(currentStep>=1) {
        progressBar(14, 115, 60, 7, Math.min(1,uploadProg/100), '#3fb950');
        lbl(44, 130, Math.min(100,Math.round(uploadProg))+'%', '#3fb950', 9);
      }

      // Worker progress bars
      if(currentStep>=5) {
        var labels=['4K','1080p','720p','360p'];
        for(var i=0;i<4;i++){
          var wx=260+i*26, wy=210;
          progressBar(wx-10, wy, 20, 5, Math.min(1,workerProgs[i]/100), '#58a6ff');
          lbl(wx, wy+14, labels[i], '#8b949e', 8);
        }
        lbl(315, 243, 'Transcoding workers', '#58a6ff', 9);
      }

      // Video file packet (purple box moving through pipeline)
      if(animRunning && currentStep>=1 && currentStep<=7) {
        var si = Math.min(currentStep-1, steps.length-1);
        ctx.fillStyle='#2a1a3a'; ctx.strokeStyle='#bc8cff'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.roundRect(steps[si].x-18, steps[si].y-10, 36, 20, 4); ctx.fill(); ctx.stroke();
        lbl(steps[si].x, steps[si].y+4, 'VIDEO', '#bc8cff', 8);
      }

      // Status
      var msgs=['Click [Upload] to start','① Client uploads raw video (chunked)','② Saved to S3, metadata created','③ Job enqueued in Kafka/SQS','④ Workers transcoding: 4K/1080p/720p/360p','⑤ Segments pushed to CDN','⑥ status=READY, search indexed ✓','Pipeline complete!'];
      lbl(W/2, H-10, msgs[Math.min(currentStep, msgs.length-1)], '#58a6ff', 10);
    }

    function runUpload() {
      currentStep=0; uploadProg=0; workerProgs=[0,0,0,0]; animRunning=true;
      if(raf) cancelAnimationFrame(raf);
      var startT = null;
      var stepTimes = [0,800,1600,2400,3200,5200,6400,7200];

      function animFrame(ts) {
        if(!document.body.contains(canvas)) return;
        if(!startT) startT=ts;
        var elapsed = ts-startT;
        for(var i=stepTimes.length-1;i>=0;i--) {
          if(elapsed>=stepTimes[i]) { currentStep=i+1; break; }
        }
        // upload progress
        if(elapsed<800) uploadProg = (elapsed/800)*100;
        else uploadProg = 100;
        // worker progress
        if(elapsed>=3200 && elapsed<5200) {
          var wp=(elapsed-3200)/2000;
          workerProgs=[wp*100, wp*110, wp*95, wp*105].map(function(v){return Math.min(100,v);});
        }
        if(elapsed>=5200) workerProgs=[100,100,100,100];
        draw();
        if(elapsed<7500) raf=requestAnimationFrame(animFrame);
        else { animRunning=false; draw(); }
      }
      raf=requestAnimationFrame(animFrame);
    }

    draw();
    var b=document.createElement('button'); b.textContent='Upload'; b.style.cssText=btnStyle; b.onclick=runUpload; btnRow.appendChild(b);
    var b2=document.createElement('button'); b2.textContent='Reset'; b2.style.cssText=btnStyle;
    b2.onclick=function(){ currentStep=0; uploadProg=0; workerProgs=[0,0,0,0]; animRunning=false; if(raf) cancelAnimationFrame(raf); draw(); };
    btnRow.appendChild(b2);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
