(function() {
  var topic = {
  id:"sd-db-sharding", area:"sysdesign",
  title:"Database Sharding, Replication & Resharding",
  tag:"Database", tags:["sharding","replication","horizontal scaling","consistent hashing","resharding","vitess","citus"],
  concept:`**Replication** — copy data to multiple nodes for availability and read scale. One primary, N replicas.
- **Sync replication** — primary waits for replica ACK before committing. Zero data loss, higher latency.
- **Async replication** — primary commits immediately, replica catches up later. Low latency, potential data loss on failover (~seconds of lag).
- **Semi-sync** — at least one replica must ACK. Balance between above.

**Sharding (horizontal partitioning)** — split data across multiple nodes so each node owns a subset.

**Sharding strategies:**
1. **Range-based** — shard by value range (users 0-1M → shard 1, 1M-2M → shard 2). Simple but creates hot spots.
2. **Hash-based** — \`shard = hash(key) % N\`. Even distribution but resharding is expensive (N changes).
3. **Consistent hashing** — place shards on hash ring; adding a node migrates only K/N keys. Used by Cassandra, DynamoDB, Redis Cluster.
4. **Directory-based** — lookup table maps key → shard. Flexible but lookup is a bottleneck.
5. **Geo-sharding** — route by geography (EU users → EU shard). Compliance + latency.

**Cross-shard challenges:**
- **JOINs** — cross-shard JOINs require scatter-gather; avoid by denormalising
- **Distributed transactions** — 2PC or Saga; expensive
- **Auto-increment IDs** — use UUID or Snowflake IDs to avoid collision
- **Resharding** — Vitess (MySQL) and Citus (PostgreSQL) automate online resharding`,
  why:`Sharding is the only way to scale writes horizontally beyond a single primary DB. Getting the shard key wrong requires a full data migration to fix.`,
  example:{
    language:"java",
    code:`// Snowflake ID generation — unique across shards without coordination
public class SnowflakeIdGenerator {
    // 41 bits timestamp | 10 bits machineId | 12 bits sequence
    private static final long EPOCH = 1609459200000L; // 2021-01-01
    private static final long MACHINE_BITS = 10L;
    private static final long SEQUENCE_BITS = 12L;
    private static final long MAX_SEQUENCE = (1L << SEQUENCE_BITS) - 1; // 4095

    private final long machineId;
    private long lastTimestamp = -1L;
    private long sequence = 0L;

    public SnowflakeIdGenerator(long machineId) {
        this.machineId = machineId & ((1L << MACHINE_BITS) - 1);
    }

    public synchronized long nextId() {
        long now = System.currentTimeMillis() - EPOCH;
        if (now == lastTimestamp) {
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) now = waitNextMs(lastTimestamp); // busy wait 1ms
        } else {
            sequence = 0L;
        }
        lastTimestamp = now;
        return (now << (MACHINE_BITS + SEQUENCE_BITS))
             | (machineId << SEQUENCE_BITS)
             | sequence;
    }

    private long waitNextMs(long lastTs) {
        long ts;
        do { ts = System.currentTimeMillis() - EPOCH; } while (ts <= lastTs);
        return ts;
    }
}
// Usage: 4096 IDs/ms per machine, globally unique, time-sortable`,
    notes:"Twitter's Snowflake: 41-bit timestamp + 10-bit worker + 12-bit sequence = 64-bit ID. Time-sortable, no coordination needed."
  },
  interview:[
    {question:"How would you shard a users table for a social network with 500M users?",
     answer:`1. **Shard key choice:** \`user_id\` (UUID/Snowflake). Avoid sharding by name/email — skewed distributions. Avoid by geography unless you need data residency.\n\n2. **Strategy:** Consistent hashing with virtual nodes (128 vnodes per shard). Start with 8 physical shards, each shard is a Postgres primary + 2 replicas.\n\n3. **Co-locate relationships:** Store user's posts, followers, sessions on the same shard as the user (derived shard ID: \`followee_shard = hash(user_id) % N\`).\n\n4. **Cross-shard problem:** "Show followers of user A" — follower list stored on user A's shard (precomputed). Cross-shard friend-of-friend queries use async graph processing (Spark/Presto).\n\n5. **Resharding:** Vitess (MySQL) or pg_partman; online migration with zero downtime.`,
     followUps:["What is a hotspot shard and how do you fix it?","Explain Vitess's VSchema and how it enables transparent sharding."]
    }
  ],
  tradeoffs:{
    pros:["Linear write scale-out","Data isolation per shard (smaller blast radius)"],
    cons:["Application must be shard-aware (or use middleware like Vitess)","Cross-shard transactions are expensive","Resharding requires careful planning"],
    when:"Shard when a single primary can't handle write throughput (typically >10K TPS sustained) or data size exceeds manageable single-node size (>5TB)."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var bAdd = document.createElement('button'); bAdd.textContent = 'Add Node (Consistent)'; bAdd.style.cssText = btnStyle;
    btnRow.appendChild(bAdd);
    wrap.appendChild(btnRow);

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 340;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var hasNewNode = false;
    var newNodeAnim = 0; // 0→1 over ~60 frames
    var movingDots = []; // dots animating to new position
    var raf;

    function drawRR(x, y, w, h, r, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
      ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
      ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
      ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
    }

    function drawPanel(px, py, pw, ph, title, content) {
      drawRR(px, py, pw, ph, 6, '#161b22', '#30363d');
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(title, px + pw/2, py + 14);
      content(px, py);
    }

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 340);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, 460, 340);

      var panelW = 140, panelH = 240, gap = 10;
      var totalW = 3*panelW + 2*gap;
      var startX = (460 - totalW) / 2;

      // Panel 1: Range Sharding
      drawPanel(startX, 10, panelW, panelH, 'Range Sharding', function(px, py) {
        ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#8b949e';
        ctx.fillText('Keys A-M → Shard 1', px+panelW/2, py+30);
        ctx.fillText('Keys N-Z → Shard 2', px+panelW/2, py+44);

        // Shard 1 box
        drawRR(px+10, py+56, panelW-20, 30, 4, '#0d1117', '#58a6ff');
        ctx.fillStyle = '#58a6ff'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Shard 1: A–M', px+panelW/2, py+76);

        // Shard 2 box (hotspot)
        drawRR(px+10, py+96, panelW-20, 30, 4, '#0d1117', '#f85149');
        ctx.fillStyle = '#f85149';
        ctx.fillText('Shard 2: N–Z', px+panelW/2, py+116);

        // Hotspot indicator
        ctx.fillStyle = '#f85149'; ctx.font = 'bold 9px monospace';
        ctx.fillText('🔥 HOTSPOT', px+panelW/2, py+140);
        ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
        ctx.fillText('N-Z names dominate', px+panelW/2, py+154);
        ctx.fillText('traffic imbalanced', px+panelW/2, py+166);

        // Traffic arrows (3 go to shard 2, 1 to shard 1)
        [0,1,2].forEach(function(i) {
          ctx.strokeStyle = '#f85149'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(px+20+i*18, py+200); ctx.lineTo(px+panelW/2, py+128); ctx.stroke();
        });
        ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px+panelW/2+10, py+200); ctx.lineTo(px+panelW/2, py+88); ctx.stroke();
        ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace';
        ctx.fillText('3x traffic → S2', px+panelW/2, py+216);
      });

      // Panel 2: Hash Sharding
      drawPanel(startX + panelW + gap, 10, panelW, panelH, 'Hash Sharding', function(px, py) {
        ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#8b949e';
        ctx.fillText('hash(key) % 3', px+panelW/2, py+30);
        ctx.fillText('even distribution', px+panelW/2, py+42);

        var shards = ['S1','S2','S3'];
        var barH = [45, 42, 44]; // roughly equal
        shards.forEach(function(s, i) {
          var bx = px + 15 + i * 38, bw = 28;
          var by = py + 100 - barH[i];
          ctx.fillStyle = '#3fb950';
          ctx.fillRect(bx, by, bw, barH[i]);
          ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, bw, barH[i]);
          ctx.fillStyle = '#e6edf3'; ctx.font = '9px monospace';
          ctx.fillText(s, bx + bw/2, py + 114);
        });

        ctx.fillStyle = '#3fb950'; ctx.font = '9px monospace';
        ctx.fillText('~Equal load ✓', px+panelW/2, py+130);
        ctx.fillStyle = '#f85149'; ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
        ctx.fillText('But: add node →', px+panelW/2, py+154);
        ctx.fillText('rehash ALL keys', px+panelW/2, py+166);
        ctx.fillStyle = '#f85149'; ctx.font = '8px monospace';
        ctx.fillText('Keys moved: ~100%', px+panelW/2, py+180);
      });

      // Panel 3: Consistent Hashing
      var ringPx = startX + 2*(panelW + gap);
      drawPanel(ringPx, 10, panelW, panelH, 'Consistent Hash', function(px, py) {
        var cx2 = px + panelW/2, cy2 = py + 108, r = 42;
        ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx2, cy2, r, 0, Math.PI*2); ctx.stroke();

        // Base 3 servers
        var servers = [
          {angle: -Math.PI/2, label:'S1', color:'#58a6ff'},
          {angle: Math.PI/2 - 0.3, label:'S2', color:'#3fb950'},
          {angle: Math.PI + 0.3, label:'S3', color:'#ffa657'}
        ];

        // New node
        if (hasNewNode) {
          var alpha2 = Math.min(1, newNodeAnim);
          ctx.save(); ctx.globalAlpha = alpha2;
          servers.push({angle: 0.2, label:'S4', color:'#bc8cff', isNew: true});
          ctx.restore();
        }

        servers.forEach(function(s) {
          var sx = cx2 + r * Math.cos(s.angle);
          var sy = cy2 + r * Math.sin(s.angle);
          var alpha2 = (s.isNew ? Math.min(1, newNodeAnim) : 1);
          ctx.save(); ctx.globalAlpha = alpha2;
          ctx.beginPath(); ctx.arc(sx, sy, 10, 0, Math.PI*2);
          ctx.fillStyle = s.color; ctx.fill();
          ctx.fillStyle = '#0d1117'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
          ctx.fillText(s.label, sx, sy+3);
          ctx.restore();
        });

        // Moving dots
        movingDots.forEach(function(d) {
          var t = d.progress;
          var mx = d.fromX + (d.toX - d.fromX)*t;
          var my = d.fromY + (d.toY - d.fromY)*t;
          ctx.save(); ctx.globalAlpha = 1 - t*0.3;
          ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI*2);
          ctx.fillStyle = '#bc8cff'; ctx.fill();
          ctx.restore();
        });

        // Static key dots (80% stay)
        if (hasNewNode) {
          ctx.fillStyle = '#3fb950'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
          ctx.fillText('Keys moved: ~25%', cx2, cy2 + r + 22);
          ctx.fillStyle = '#8b949e';
          ctx.fillText('(vs 100% mod-N)', cx2, cy2 + r + 34);
        } else {
          ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
          ctx.fillText('3 servers on ring', cx2, cy2 + r + 22);
          ctx.fillText('Click Add Node →', cx2, cy2 + r + 34);
        }
      });

      // Animate moving dots
      if (hasNewNode && newNodeAnim < 1) {
        newNodeAnim += 0.03;
        raf = requestAnimationFrame(draw);
      }
      if (movingDots.length > 0) {
        movingDots.forEach(function(d) { d.progress = Math.min(1, d.progress + 0.025); });
        movingDots = movingDots.filter(function(d) { return d.progress < 1; });
        raf = requestAnimationFrame(draw);
      }
    }

    bAdd.addEventListener('click', function() {
      if (!hasNewNode) {
        hasNewNode = true; newNodeAnim = 0;
        // Create ~5 moving dots from S2/S3 arc to new S4 position
        var cx2 = (startX + 2*(panelW + gap)) + panelW/2;
        var cy2 = 10 + 108;
        var r = 42;
        var newAngle = 0.2;
        var toX = cx2 + r * Math.cos(newAngle);
        var toY = cy2 + r * Math.sin(newAngle);
        for (var i = 0; i < 5; i++) {
          var fromAngle = Math.PI/2 - 0.3 + (i - 2) * 0.15;
          movingDots.push({
            fromX: cx2 + r * Math.cos(fromAngle),
            fromY: cy2 + r * Math.sin(fromAngle),
            toX: toX, toY: toY, progress: 0
          });
        }
        raf = requestAnimationFrame(draw);
        bAdd.textContent = '↺ Reset Ring';
      } else {
        hasNewNode = false; newNodeAnim = 0; movingDots = [];
        bAdd.textContent = 'Add Node (Consistent)';
        draw();
      }
    });

    draw();
  },
  flow:{
    title:"Sharded Write Path",
    caption:"Shard key determines which shard; consistent hash ring minimises resharding",
    nodes:[
      {id:"app",label:"App Server",hint:"Compute shard from key"},
      {id:"router",label:"Shard Router",hint:"Consistent hash or directory"},
      {id:"sh1",label:"Shard 1",hint:"user_id hash 0-33%"},
      {id:"sh2",label:"Shard 2",hint:"user_id hash 33-66%"},
      {id:"sh3",label:"Shard 3",hint:"user_id hash 66-100%"},
      {id:"rep",label:"Replica",hint:"Async replication for reads"}
    ],
    steps:[
      {path:["app","router"],label:"Route by shard key",detail:"App computes shard = consistentHash(user_id). Shard router maps to physical node address."},
      {path:["router","sh1"],label:"Write to Shard 1",detail:"User with hash in 0-33% range lands on Shard 1's primary."},
      {path:["sh1","rep"],label:"Async replication",detail:"Primary streams WAL to replica. Replica serves read queries with <100ms lag."},
      {path:["router","sh2"],label:"Different user → Shard 2",detail:"Different user_id hash routes to Shard 2 independently."},
      {path:["app","sh3"],label:"Direct shard access (optimised)",detail:"App caches shard mapping locally; skip router for known shard-key queries."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
