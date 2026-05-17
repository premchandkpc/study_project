(function() {
  var topic = {
  id:"sd-lld-distributed-lock", area:"sysdesign",
  title:"LLD: Distributed Lock — Redlock, Zookeeper & Fencing",
  tag:"LLD", tags:["distributed lock","redlock","zookeeper","fencing token","mutex","lease","etcd","leader election"],
  concept:`**Why distributed locks?** Multiple nodes must not simultaneously perform a non-idempotent operation (e.g., deduct inventory, send email, run cron job once).

**Single Redis lock (SET NX PX):**
\`\`\`
SET lock:resource uniqueToken NX PX 30000
\`\`\`
- NX = set if not exists (atomic compare-and-set)
- PX 30000 = auto-expire after 30s (avoid deadlock on crash)
- Release: Lua script — only delete if value matches (you own the lock)
- Problem: single Redis node SPOF; clock skew on failover.

**Redlock (Multi-node Redis):**
Acquire lock on N Redis nodes (typically 5) quorum (N/2+1 = 3). Reject if total acquisition time > lock validity. Release from all nodes.
- More resilient than single node.
- Debated: Martin Kleppmann argues it's unsafe without fencing tokens.

**Fencing tokens:**
Monotonically increasing token issued with each lock acquisition. Storage layer rejects writes with token < max seen. Safe even if lock expires early due to GC pause.

**Zookeeper / etcd locks:**
- ZK ephemeral nodes: create ephemeral sequential node; watch lowest node → you hold lock.
- etcd: optimistic concurrency via compare-and-swap on a key with lease TTL.
- Strong consistency (linearisable) — safer than Redis for critical sections.

**Leader election:** Same mechanism — first to acquire distributed lock becomes leader. Heartbeat to renew lease. Others watch for expiry.`,
  why:`Distributed locks are a classic LLD problem. The subtle failure modes (process pause, clock skew, network partition) demonstrate senior-level thinking.`,
  example:{
    language:"java",
    code:`// Redis distributed lock with fencing token simulation
@Component
public class RedisDistributedLock {

    @Autowired private StringRedisTemplate redis;

    private static final String RELEASE_SCRIPT =
        "if redis.call('GET', KEYS[1]) == ARGV[1] then " +
        "  return redis.call('DEL', KEYS[1]) " +
        "else return 0 end";

    public Optional<String> tryAcquire(String resource, Duration ttl) {
        String token = UUID.randomUUID().toString(); // unique owner ID
        Boolean acquired = redis.opsForValue()
            .setIfAbsent("lock:" + resource, token, ttl);
        return Boolean.TRUE.equals(acquired) ? Optional.of(token) : Optional.empty();
    }

    public boolean release(String resource, String token) {
        Long result = redis.execute(
            new DefaultRedisScript<>(RELEASE_SCRIPT, Long.class),
            List.of("lock:" + resource), token);
        return Long.valueOf(1L).equals(result);
    }

    // Acquire with retry
    public String acquireWithRetry(String resource, Duration ttl,
                                    int maxRetries, Duration retryDelay)
            throws InterruptedException {
        for (int i = 0; i < maxRetries; i++) {
            Optional<String> token = tryAcquire(resource, ttl);
            if (token.isPresent()) return token.get();
            Thread.sleep(retryDelay.toMillis() + ThreadLocalRandom.current().nextInt(50));
        }
        throw new LockAcquisitionException("Failed to acquire lock for: " + resource);
    }
}

// Usage pattern — always use try-finally to release
@Service
public class InventoryService {
    @Autowired private RedisDistributedLock lock;

    public void deductInventory(String productId, int quantity) throws Exception {
        String token = lock.acquireWithRetry("inventory:" + productId,
                                              Duration.ofSeconds(10), 3,
                                              Duration.ofMillis(100));
        try {
            // Critical section — only one node executes this at a time
            int current = inventoryRepo.getQuantity(productId);
            if (current < quantity) throw new InsufficientInventoryException();
            inventoryRepo.setQuantity(productId, current - quantity);
        } finally {
            lock.release("inventory:" + productId, token); // always release
        }
    }
}`,
    notes:"TTL is a safety net — not the normal release path. Always release explicitly in finally block. TTL prevents deadlock if the holder crashes before releasing."
  },
  interview:[
    {question:"What is a fencing token and why does it matter for distributed locks?",
     answer:`The fundamental problem: a process can acquire a lock, then pause (GC, OS scheduling, network lag). The lock expires. Another process acquires it. The first process resumes and thinks it still holds the lock — two processes in the critical section simultaneously.\n\n**Fencing token solution:**\n1. Lock service issues a monotonically increasing token with each lock grant (e.g., etcd revision number, ZK sequence number)\n2. Lock holder includes token in every write to the storage layer\n3. Storage layer rejects any write with a token ≤ max seen\n\nResult: even if paused process resumes and tries to write, storage rejects it because new lock holder's token is higher.\n\nRedis SET NX doesn't issue fencing tokens — this is Martin Kleppmann's critique of Redlock. Use etcd or ZooKeeper for safety-critical distributed locks.`,
     followUps:["Explain the ZooKeeper ephemeral node approach to distributed locking.","How does etcd use compare-and-swap for leader election?"]
    }
  ],
  tradeoffs:{
    pros:["Prevents concurrent modification of shared resource","Redis lock is simple and fast (~1ms)","etcd/ZK: strongly consistent, fencing tokens possible"],
    cons:["Redis lock: not safe under clock skew or network partition","ZK/etcd: slower than Redis, more complex to operate","Distributed locks are a code smell — prefer idempotent design"],
    when:"Use distributed locks as last resort. First, try: idempotent operations, optimistic concurrency (version check in DB), CRDT-based design. When you do need a lock, use etcd/ZK for correctness; Redis for performance-critical non-critical-path operations."
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

    var phase = 'idle';
    var phaseT = 0;
    var msg = 'Click [Race for Lock] to simulate';
    var msgColor = '#8b949e';
    var ttlBar = 80, ttlMax = 80;
    var packetA = null, packetB = null;
    var raf = null;

    var CX = W / 2, CY = 148;
    var AX = 60, AY = 148;
    var BX = W - 60, BY = 148;

    function box(x, y, w, h, fill, stroke) {
      ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, 6);
      ctx.fill(); ctx.stroke();
    }
    function lbl(x, y, text, color, size) {
      ctx.fillStyle = color || '#e6edf3';
      ctx.font = (size || 11) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text, x, y);
    }
    function arw(x1, y1, x2, y2, color) {
      var dx = x2-x1, dy = y2-y1, L = Math.sqrt(dx*dx+dy*dy);
      var ux = dx/L, uy = dy/L;
      ctx.strokeStyle = color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2-ux*8-uy*4, y2-uy*8+ux*4);
      ctx.lineTo(x2-ux*8+uy*4, y2-uy*8-ux*4);
      ctx.fill();
    }

    function drawScene() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // Client A
      var aHolds = phase==='a_holds'||phase==='a_releases';
      box(AX, AY, 80, 52, aHolds?'#1a3a1a':'#161b22', aHolds?'#3fb950':'#30363d');
      lbl(AX, AY-12, 'Client A', '#3fb950', 11);
      lbl(AX, AY+4, aHolds?'WORKING':'READY', '#8b949e', 9);
      lbl(AX, AY+18, phase==='a_releases'?'releasing...':'', '#ffa657', 9);

      // Client B
      var bHolds = phase==='b_acquires'||phase==='b_after_ttl';
      var bWaits = phase==='b_waits';
      box(BX, BY, 80, 52, bHolds?'#1a2a3a':bWaits?'#2a1a0a':'#161b22', bHolds?'#58a6ff':bWaits?'#ffa657':'#30363d');
      lbl(BX, BY-12, 'Client B', '#58a6ff', 11);
      lbl(BX, BY+4, bHolds?'WORKING':bWaits?'WAITING':'READY', '#8b949e', 9);
      if (bWaits) { lbl(BX, BY+18, 'retrying...', '#ffa657', 9); }

      // Redis
      var lockA = phase==='a_holds'||phase==='a_releases'||phase==='b_waits'||phase==='deadlock_countdown';
      var lockB = phase==='b_acquires'||phase==='b_after_ttl';
      box(CX, CY, 104, 60, '#161b22', lockA?'#3fb950':lockB?'#58a6ff':'#30363d');
      lbl(CX, CY-16, 'Redis', '#e6edf3', 12);
      lbl(CX, CY, lockA?'lock:key=A_token':lockB?'lock:key=B_token':'lock:key=(empty)', lockA?'#3fb950':lockB?'#58a6ff':'#8b949e', 9);

      // TTL bar
      if (phase==='deadlock_countdown'||phase==='a_holds') {
        var bw=88, bx=CX-bw/2, by=CY+16;
        ctx.fillStyle='#30363d'; ctx.beginPath(); ctx.roundRect(bx,by,bw,7,3); ctx.fill();
        var frac = phase==='deadlock_countdown' ? ttlBar/ttlMax : 1;
        ctx.fillStyle = frac>0.5?'#3fb950':frac>0.25?'#ffa657':'#f85149';
        ctx.beginPath(); ctx.roundRect(bx,by,bw*frac,7,3); ctx.fill();
        lbl(CX, by+18, phase==='deadlock_countdown'?'TTL: '+Math.round(frac*30)+'s (expiring!)':'TTL: 30s', phase==='deadlock_countdown'?'#ffa657':'#3fb950', 9);
      }

      // Packets
      if (packetA) {
        var t = Math.min(1, packetA.t);
        var px = packetA.x+(packetA.tx-packetA.x)*t, py = packetA.y+(packetA.ty-packetA.y)*t;
        ctx.fillStyle='#3fb950'; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();
        lbl(px, py-10, 'SETNX', '#3fb950', 9);
      }
      if (packetB) {
        var t2 = Math.min(1, packetB.t);
        var px2 = packetB.x+(packetB.tx-packetB.x)*t2, py2 = packetB.y+(packetB.ty-packetB.y)*t2;
        ctx.fillStyle='#58a6ff'; ctx.beginPath(); ctx.arc(px2,py2,5,0,Math.PI*2); ctx.fill();
        lbl(px2, py2+14, 'SETNX', '#58a6ff', 9);
      }

      // Response arrows
      if (phase==='b_waits') {
        arw(CX+52, CY-6, BX-40, BY-6, '#f85149');
        lbl((CX+BX)/2, CY-20, 'returns 0 (Lock Busy)', '#f85149', 9);
      }
      if (phase==='a_releases') {
        arw(AX+40, AY+6, CX-52, CY+6, '#ffa657');
        lbl((AX+CX)/2, AY+22, 'DEL lock:key', '#ffa657', 9);
      }

      // Status
      ctx.fillStyle = msgColor; ctx.font='11px monospace'; ctx.textAlign='center';
      ctx.fillText(msg, W/2, H-10);
    }

    function startTick() { if(raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }

    function tick() {
      if (!document.body.contains(canvas)) return;
      phaseT++;
      if (packetA) { packetA.t+=0.045; if(packetA.t>=1) packetA=null; }
      if (packetB) { packetB.t+=0.045; if(packetB.t>=1) packetB=null; }

      if (phase==='race' && phaseT>=40) {
        packetA=null; packetB=null;
        phase='a_holds'; phaseT=0;
        msg='A acquired lock (SETNX=1). B rejected (SETNX=0, Lock Busy)'; msgColor='#3fb950';
      } else if (phase==='a_holds' && phaseT>=60) {
        phase='b_waits'; phaseT=0; msg='B: Lock Busy → retrying with exponential backoff'; msgColor='#ffa657';
      } else if (phase==='b_waits' && phaseT>=50) {
        phase='a_releases'; phaseT=0; msg='A finishes work → DEL lock:key'; msgColor='#ffa657';
      } else if (phase==='a_releases' && phaseT>=40) {
        phase='b_acquires'; phaseT=0; msg='B acquires lock ✓ (A released it)'; msgColor='#58a6ff';
      } else if (phase==='b_acquires' && phaseT>=60) {
        phase='idle'; phaseT=0; msg='Done. B released lock. System idle.'; msgColor='#8b949e';
      } else if (phase==='deadlock_countdown') {
        ttlBar--;
        if (ttlBar<=0) { phase='b_after_ttl'; phaseT=0; msg='TTL expired! B acquires lock (no deadlock ✓)'; msgColor='#3fb950'; }
      } else if (phase==='b_after_ttl' && phaseT>=60) {
        phase='idle'; phaseT=0; msg='TTL saved from deadlock. B completed work.'; msgColor='#8b949e';
      }

      drawScene();
      if (phase!=='idle' || packetA || packetB) raf=requestAnimationFrame(tick);
    }

    function runRace() {
      phase='race'; phaseT=0;
      packetA={x:AX+40,y:AY-10,tx:CX-52,ty:CY-10,t:0};
      packetB={x:BX-40,y:BY+10,tx:CX+52,ty:CY+10,t:0};
      msg='Both race: SETNX lock:key 1 EX 30...'; msgColor='#ffa657';
      startTick();
    }
    function runDeadlock() {
      ttlBar=ttlMax; phase='deadlock_countdown'; phaseT=0;
      msg='Client A crashed! TTL countdown...'; msgColor='#f85149';
      startTick();
    }

    drawScene();
    [{label:'Race for Lock',fn:runRace},{label:'Simulate Deadlock (TTL)',fn:runDeadlock}].forEach(function(op){
      var b=document.createElement('button'); b.textContent=op.label; b.style.cssText=btnStyle; b.onclick=op.fn; btnRow.appendChild(b);
    });
  },
  flow:{
    title:"Distributed Lock — Acquire → Use → Release",
    caption:"Fencing token prevents stale lock holders from corrupting state",
    nodes:[
      {id:"node1",label:"Node A",hint:"Acquires lock first"},
      {id:"redis",label:"Redis / etcd",hint:"Lock store + fencing token issuer"},
      {id:"node2",label:"Node B",hint:"Waits or retries"},
      {id:"storage",label:"Storage Layer",hint:"Validates fencing token on writes"},
      {id:"dlq-n",label:"Lock Expired",hint:"Node A paused — GC or slow network"}
    ],
    steps:[
      {path:["node1","redis"],label:"Node A: SET lock NX PX 10000",detail:"Node A acquires lock. Redis returns unique token + fencing token (monotonic counter)."},
      {path:["node2","redis"],label:"Node B: SET lock NX → fails",detail:"Node B tries to acquire. Key exists → fails. Node B retries with backoff."},
      {path:["node1","storage"],label:"Node A writes with token=42",detail:"Node A performs critical section work. Includes token=42 in write request."},
      {path:["storage","node1"],label:"Write accepted (token 42 > max 41)",detail:"Storage accepts because token 42 is the highest seen."},
      {path:["node1","dlq-n"],label:"Node A GC pause — lock expires",detail:"Node A pauses for 15 seconds. Lock TTL expires after 10 seconds."},
      {path:["node2","redis"],label:"Node B acquires expired lock",detail:"Node B retries, finds lock expired. Acquires with token=43."},
      {path:["node1","storage"],label:"Node A resumes, tries write with token=42",detail:"Node A comes back, still thinks it holds lock. Tries to write with old token=42."},
      {path:["storage","node1"],label:"Write REJECTED (token 42 < max 43)",detail:"Storage rejects — token 42 is stale. Node B's write (token 43) is safe."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
