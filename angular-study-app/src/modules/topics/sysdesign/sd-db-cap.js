(function() {
  var topic = {
  id:"sd-db-cap", area:"sysdesign",
  title:"CAP Theorem, Consistency Models & PACELC",
  tag:"Database", tags:["cap theorem","consistency","availability","partition tolerance","eventual consistency","strong consistency","pacelc"],
  concept:`**CAP Theorem** (Brewer 2000): A distributed system can guarantee at most **2 of 3**:
- **C**onsistency — every read returns the most recent write (linearisability)
- **A**vailability — every request receives a response (not necessarily latest data)
- **P**artition tolerance — system continues despite network partitions

**In practice:** Partitions happen (network failures are real). So you choose **CP or AP**:
- **CP** (Zookeeper, HBase, etcd, RDBMS with sync replication): sacrifice availability during partition — refuse requests rather than return stale data
- **AP** (Cassandra, CouchDB, DynamoDB default): sacrifice consistency — return potentially stale data, reconcile later

**Consistency spectrum (weakest → strongest):**
1. **Eventual** — given no new updates, all replicas converge eventually (DNS, shopping cart)
2. **Monotonic read** — once you read value X, you'll never read an older value
3. **Read-your-writes** — after you write, you always see your own write
4. **Session** — consistency guarantees within a session (read-your-writes + monotonic)
5. **Causal** — causally related operations are seen in order by all nodes
6. **Linearisable** — strongest; operations appear instantaneous to all observers (Spanner, etcd)

**PACELC extension:** Even without partition, there's a trade-off between **Latency** and **Consistency**. A quorum write to 3 replicas is consistent but slower than writing to 1.`,
  why:`CAP and consistency models appear in nearly every system design interview. Choosing wrong consistency model costs money (over-engineered) or correctness (data loss/anomalies).`,
  example:{
    language:"java",
    code:`// Cassandra — tunable consistency per operation
@Repository
public class OrderRepository {

    @Autowired
    private CassandraTemplate template;

    // Strong consistency — quorum read+write (slower, safer)
    public Order findCritical(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.QUORUM) // majority of replicas
                .build());
    }

    // Eventual consistency — ONE replica (fastest, may be stale)
    public Order findEventual(UUID orderId) {
        return template.selectOneById(orderId, Order.class,
            QueryOptions.builder()
                .consistencyLevel(ConsistencyLevel.ONE)
                .build());
    }

    // Write with LOCAL_QUORUM — quorum within same datacenter
    public void save(Order order) {
        template.insert(order,
            InsertOptions.builder()
                .consistencyLevel(ConsistencyLevel.LOCAL_QUORUM)
                .build());
    }
}`,
    notes:"Rule of thumb: W + R > N guarantees strong consistency. With N=3, W=2, R=2: 2+2=4 > 3 → every read sees the latest write."
  },
  interview:[
    {question:"Explain the CAP theorem with a real-world example.",
     answer:`During a network partition in a multi-datacenter setup (east ↔ west data centers lose connectivity):\n\n**CP choice (e.g., Zookeeper):** The isolated DC refuses writes/reads until the partition heals. Users see errors but data stays consistent. Safe for distributed locks, configuration, leader election.\n\n**AP choice (e.g., Cassandra):** Both DCs accept writes independently. A user writes an order in east; another reads in west — they might see stale data. After partition heals, conflict resolution runs (last-write-wins or CRDTs). Acceptable for shopping carts, user preferences.`,
     followUps:["What are CRDTs and when do you use them?","How does DynamoDB handle conflicts in global tables?"]
    },
    {question:"What is linearisability and why is it expensive?",
     answer:`Linearisability means every operation appears to take effect instantaneously at a single point in time between its invocation and response. All observers see the same order of operations.\n\nIt's expensive because:\n1. Every read must contact a quorum of replicas to ensure it sees the latest write\n2. Adds cross-node network round trips\n3. During partition, must sacrifice availability\n\nAlternatives with weaker but often sufficient guarantees: sequential consistency, causal consistency, session consistency — each allows more concurrency with some trade-offs.`,
     followUps:["How does Google Spanner achieve external consistency (linearisability) globally?"]
    }
  ],
  tradeoffs:{
    pros:["Framework clarifies trade-offs before choosing a DB","Consistency levels let you tune per-operation"],
    cons:["CAP oversimplifies — network partitions are not binary","PACELC is more practical for latency-conscious systems"],
    when:"Choose CP for: financial transactions, distributed locks, config management. Choose AP for: social feeds, shopping carts, notifications, analytics."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;padding:10px;background:#0d1117;border-radius:8px;';

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';
    var bCP = document.createElement('button'); bCP.textContent = 'Show CP'; bCP.style.cssText = btnStyle;
    var bAP = document.createElement('button'); bAP.textContent = 'Show AP'; bAP.style.cssText = btnStyle;
    var bPart = document.createElement('button'); bPart.textContent = 'Network Partition'; bPart.style.cssText = btnStyle;
    btns.appendChild(bCP); btns.appendChild(bAP); btns.appendChild(bPart);
    wrap.appendChild(btns);

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 340;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    wrap.appendChild(canvas);
    mount.appendChild(wrap);

    var ctx = canvas.getContext('2d');
    var mode = 'none'; // 'cp','ap','partition'
    var boltAnim = 0;
    var raf;

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, 460, 340);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, 460, 340);

      var cx = 230, top = 30, bL = 60, bR = 400, bY = 290;
      // Triangle vertices: top=Partition, bottomLeft=Consistency, bottomRight=Availability
      var vP = {x: cx, y: top};
      var vC = {x: bL, y: bY};
      var vA = {x: bR, y: bY};

      // Zone overlays
      if (mode === 'cp') {
        ctx.beginPath();
        ctx.moveTo(vP.x, vP.y); ctx.lineTo(vC.x, vC.y); ctx.lineTo(cx, bY); ctx.closePath();
        ctx.fillStyle = 'rgba(88,166,255,0.18)'; ctx.fill();
      }
      if (mode === 'ap') {
        ctx.beginPath();
        ctx.moveTo(vP.x, vP.y); ctx.lineTo(vA.x, vA.y); ctx.lineTo(cx, bY); ctx.closePath();
        ctx.fillStyle = 'rgba(63,185,80,0.18)'; ctx.fill();
      }

      // Impossible center zone (CA — no partition tolerance)
      ctx.beginPath();
      ctx.arc(cx, 190, 28, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(248,81,73,0.18)'; ctx.fill();
      ctx.strokeStyle = '#f85149'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#f85149'; ctx.font = '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Impossible', cx, 187);
      ctx.fillText('Zone', cx, 200);

      // Main triangle
      ctx.beginPath();
      ctx.moveTo(vP.x, vP.y); ctx.lineTo(vC.x, vC.y); ctx.lineTo(vA.x, vA.y); ctx.closePath();
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 2; ctx.stroke();

      // Corner labels
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffa657';
      ctx.fillText('Partition', vP.x, vP.y - 16);
      ctx.fillText('Tolerance', vP.x, vP.y - 3);
      ctx.fillStyle = '#58a6ff';
      ctx.textAlign = 'right';
      ctx.fillText('Consistency', vC.x - 2, vC.y + 16);
      ctx.fillStyle = '#3fb950';
      ctx.textAlign = 'left';
      ctx.fillText('Availability', vA.x + 2, vA.y + 16);

      // DB labels
      ctx.font = '11px monospace'; ctx.fillStyle = '#e6edf3';
      // CP zone (left side near C+P)
      var cpDBs = ['MongoDB','HBase','Redis','etcd','Zookeeper'];
      ctx.textAlign = 'left';
      ctx.fillStyle = mode === 'cp' ? '#58a6ff' : '#8b949e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('CP Systems:', 68, 140);
      ctx.font = '11px monospace';
      cpDBs.forEach(function(d, i) { ctx.fillText('• ' + d, 72, 156 + i*14); });

      // AP zone (right side near A+P)
      var apDBs = ['Cassandra','CouchDB','DynamoDB'];
      ctx.textAlign = 'right';
      ctx.fillStyle = mode === 'ap' ? '#3fb950' : '#8b949e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('AP Systems:', 392, 140);
      ctx.font = '11px monospace';
      apDBs.forEach(function(d, i) { ctx.fillText('• ' + d, 392, 156 + i*14); });

      // CA zone (bottom, near C+A)
      var caDBs = ['PostgreSQL (single)','MySQL'];
      ctx.textAlign = 'center';
      ctx.fillStyle = '#8b949e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('CA (No Partition):', cx, 248);
      ctx.font = '11px monospace';
      caDBs.forEach(function(d, i) { ctx.fillText(d, cx, 262 + i*14); });

      // Network partition lightning bolt animation
      if (mode === 'partition') {
        boltAnim = (boltAnim + 0.07) % 1;
        var alpha = 0.6 + 0.4 * Math.sin(boltAnim * Math.PI * 2);
        // Draw split line across middle of triangle
        var midY = (vP.y + vC.y) / 2;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#f85149'; ctx.lineWidth = 3;
        ctx.setLineDash([6, 4]);
        ctx.beginPath(); ctx.moveTo(bL + 20, midY); ctx.lineTo(bR - 20, midY); ctx.stroke();
        ctx.setLineDash([]);
        // Bolt icon
        ctx.fillStyle = '#f85149'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center';
        ctx.fillText('⚡', cx, midY - 6);
        ctx.font = '11px monospace';
        ctx.fillText('Network Split! CP refuses requests, AP serves stale', cx, midY + 18);
        ctx.restore();
        raf = requestAnimationFrame(draw);
      }
    }

    bCP.addEventListener('click', function() { mode = mode === 'cp' ? 'none' : 'cp'; boltAnim = 0; draw(); });
    bAP.addEventListener('click', function() { mode = mode === 'ap' ? 'none' : 'ap'; boltAnim = 0; draw(); });
    bPart.addEventListener('click', function() {
      if (mode === 'partition') { mode = 'none'; draw(); }
      else { mode = 'partition'; draw(); }
    });
    draw();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
