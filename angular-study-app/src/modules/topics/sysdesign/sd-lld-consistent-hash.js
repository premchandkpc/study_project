(function() {
  var topic = {
  id:"sd-lld-consistent-hash", area:"sysdesign",
  title:"LLD: Consistent Hashing — Hash Ring & Virtual Nodes",
  tag:"LLD", tags:["consistent hashing","hash ring","virtual nodes","vnodes","distributed cache","memcached","chord"],
  concept:`**Problem with mod-N hashing:** \`shard = hash(key) % N\`. When N changes (add/remove a node), nearly all keys remap → massive cache miss storm.

**Consistent hashing solution:**
1. Hash space is a circular ring [0, 2^32). 
2. Place servers on the ring by hashing their ID: \`hash("server-1") → position P\`.
3. For a key, hash it → find the next server clockwise on the ring.
4. When a server is added/removed, only keys between it and its predecessor move.
5. On average, only K/N keys remap (K = total keys, N = node count).

**Virtual nodes (vnodes):**
Real problem: few servers → uneven distribution (load imbalance).
Solution: each physical server gets V virtual node positions on the ring (V=100-300).
- Uniform distribution across the ring.
- More powerful servers get more vnodes → weighted assignment.
- On failure: keys spread across all remaining servers (no single successor overwhelmed).

**Used by:** Apache Cassandra (256 vnodes default), Amazon DynamoDB, Redis Cluster (16384 hash slots ≈ consistent hashing), Memcached client libraries.

**Hash slots (Redis Cluster):** 16384 fixed slots instead of continuous ring. Each master owns a range. Gossip protocol tracks slot assignments.`,
  why:`Consistent hashing is foundational to distributed systems. It appears in every database, cache, and CDN design. Interviewers expect you to draw the ring and explain vnodes.`,
  example:{
    language:"java",
    code:`// Consistent Hash Ring implementation
public class ConsistentHashRing<T> {
    private final TreeMap<Long, T> ring = new TreeMap<>();
    private final int virtualNodes;
    private final MessageDigest md5;

    public ConsistentHashRing(int virtualNodes) throws NoSuchAlgorithmException {
        this.virtualNodes = virtualNodes;
        this.md5 = MessageDigest.getInstance("MD5");
    }

    public void addServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.put(hash, server);
        }
    }

    public void removeServer(T server) {
        for (int i = 0; i < virtualNodes; i++) {
            long hash = hash(server.toString() + "#vnode-" + i);
            ring.remove(hash);
        }
    }

    public T getServer(String key) {
        if (ring.isEmpty()) return null;
        long hash = hash(key);
        // Find first server clockwise from key's position
        Map.Entry<Long, T> entry = ring.ceilingEntry(hash);
        if (entry == null) entry = ring.firstEntry(); // wrap around ring
        return entry.getValue();
    }

    private long hash(String key) {
        byte[] digest = md5.digest(key.getBytes(StandardCharsets.UTF_8));
        // Use first 4 bytes as unsigned int
        return ((long)(digest[3] & 0xFF) << 24)
             | ((long)(digest[2] & 0xFF) << 16)
             | ((long)(digest[1] & 0xFF) << 8)
             | ((long)(digest[0] & 0xFF));
    }
}

// Usage — Memcached-style key routing
ConsistentHashRing<String> ring = new ConsistentHashRing<>(150);
ring.addServer("cache-1:11211");
ring.addServer("cache-2:11211");
ring.addServer("cache-3:11211");

String server = ring.getServer("user:42:profile"); // always routes to same server
// → "cache-2:11211"

ring.addServer("cache-4:11211");  // only ~25% of keys remap (vs 75% with mod-4)
ring.getServer("user:42:profile"); // may now route to "cache-4:11211" or still "cache-2"`,
    notes:"With 150 vnodes per server, standard deviation of load across servers is <10%. With 1 vnode it can be 200%+."
  },
  interview:[
    {question:"How does consistent hashing minimise key remapping when a node is added?",
     answer:`With mod-N hashing and N → N+1: key K remaps if \`hash(K) % (N+1) ≠ hash(K) % N\`. This is true for ~N/(N+1) of all keys → nearly everything remaps.\n\nWith consistent hashing: the new node takes the position between two existing nodes on the ring. It only claims keys that would have gone to the next clockwise node — approximately K/N keys. All other keys are unaffected.\n\nMath: if we add 1 server to a 10-server ring, only 10% of keys move (1/11). With mod-N: 91% move.\n\nVnodes amplify this: the new server's 150 vnodes are spread across the ring, claiming small slices from many existing servers — very uniform redistribution.`,
     followUps:["How does Redis Cluster implement consistent hashing with hash slots?","What happens to in-flight requests when a node is added to a Cassandra cluster?"]
    }
  ],
  tradeoffs:{
    pros:["Only K/N keys remap on topology change","Vnodes give near-uniform distribution","Weighted assignment via vnode count"],
    cons:["More complex than mod-N","Vnodes add memory overhead (ring size = servers × vnodes entries)","Hot spots still possible if many popular keys hash to same region"],
    when:"Use consistent hashing for any distributed cache or storage system where nodes join/leave dynamically. Essential for Cassandra, DynamoDB, Redis Cluster, and CDN routing."
  },
  visual: function(mount) {
    var W = 380, H = 300;

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:8px;justify-content:center';

    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:13px';

    ctrl.appendChild(playBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:380px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var cx = W/2, cy = H/2 - 10, R = 110;
    var servers = [
      {name:'S1', angle: 0,        color:'#3fb950'},
      {name:'S2', angle: 2.1,      color:'#58a6ff'},
      {name:'S3', angle: 4.0,      color:'#f0883e'},
      {name:'S4', angle: 5.3,      color:'#bc8cff', vnode: true}
    ];
    var dotAngle = 0;
    var running = false, rafId = null;

    function serverAt(angle) {
      var best = servers[0], bestDiff = Infinity;
      servers.forEach(function(s) {
        var diff = (s.angle - angle + Math.PI*2) % (Math.PI*2);
        if (diff < bestDiff) { bestDiff = diff; best = s; }
      });
      return best;
    }

    function drawScene(movingDot) {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0,0,W,H);

      ctx.fillStyle = '#00e5ff'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Consistent Hash Ring', cx, 20);

      ctx.fillStyle = '#8b949e'; ctx.font = '10px monospace';
      ctx.fillText('dot = request key · circles = servers', cx, 36);

      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 2; ctx.stroke();

      servers.forEach(function(s) {
        var x = cx + R * Math.cos(s.angle), y = cy + R * Math.sin(s.angle);
        ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI*2);
        ctx.fillStyle = s.vnode ? '#21262d' : s.color + '33'; ctx.fill();
        ctx.strokeStyle = s.color; ctx.lineWidth = s.vnode ? 1.5 : 2.5; ctx.stroke();
        ctx.fillStyle = s.color; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(s.name, x, y + 4);
      });

      if (movingDot) {
        var dx = cx + R * Math.cos(dotAngle), dy = cy + R * Math.sin(dotAngle);
        ctx.beginPath(); ctx.arc(dx, dy, 7, 0, Math.PI*2);
        ctx.fillStyle = '#e6edf3'; ctx.fill();

        var target = serverAt(dotAngle);
        var tx = cx + R * Math.cos(target.angle), ty = cy + R * Math.sin(target.angle);
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(tx, ty);
        ctx.strokeStyle = target.color + 'aa'; ctx.lineWidth = 1.5;
        ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

        ctx.fillStyle = '#e6edf3'; ctx.font = '12px monospace'; ctx.textAlign = 'center';
        ctx.fillText('→ routes to ' + target.name, cx, H - 18);
      } else {
        ctx.fillStyle = '#8b949e'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Press ▶ Play to animate request routing', cx, H - 18);
      }
    }

    function frame() {
      if (!running || !document.body.contains(canvas)) return;
      dotAngle = (dotAngle + 0.018) % (Math.PI * 2);
      drawScene(true);
      rafId = requestAnimationFrame(frame);
    }

    function start() {
      running = true; playBtn.textContent = '⏸ Pause';
      rafId = requestAnimationFrame(frame);
    }

    function pause() {
      running = false; playBtn.textContent = '▶ Play';
      cancelAnimationFrame(rafId);
      drawScene(true);
    }

    playBtn.addEventListener('click', function() { running ? pause() : start(); });

    drawScene(false);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
