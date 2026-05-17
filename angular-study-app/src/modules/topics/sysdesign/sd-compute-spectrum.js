(function() {
  var topic = {
  id:"sd-compute-spectrum", area:"sysdesign",
  title:"Compute Spectrum — VMs, Containers & Serverless",
  tag:"Compute", tags:["vm","container","serverless","lambda","docker","kubernetes","fargate","cold start","ec2"],
  concept:`**Spectrum from most to least control:**

**1. Bare Metal → EC2 (Virtual Machines)**
- Full OS control. Predictable performance. No noisy-neighbour.
- Best for: databases, high-performance compute, compliance requiring isolation.
- Cost: highest. Startup: minutes. Management: full.

**2. Containers (Docker + Kubernetes / ECS)**
- Share host OS kernel. Lightweight (~10MB vs GB for VM). Start in seconds.
- Portable — same image runs locally, CI, and production.
- Kubernetes: orchestration, auto-healing, rolling deploys, HPA.
- Best for: long-running web services, background workers, scheduled jobs.

**3. Serverless (Lambda, Cloud Functions, Fargate)**
- No servers to manage. Pay per invocation. Auto-scales to zero.
- **Cold start:** container initialisation latency (100ms–3s for Java; <50ms for Go/Node).
- Concurrency model: each invocation is isolated. No shared state in process.
- Best for: event-driven processing, infrequent workloads, ETL, webhooks.

**Comparison:**
| | VM (EC2) | Container (K8s) | Serverless (Lambda) |
|---|---|---|---|
| Startup | Minutes | Seconds | 100ms–3s |
| Cost model | Per hour | Per hour | Per invocation |
| Scale to zero | No | Possible (KEDA) | Yes |
| State | Persistent disk | Ephemeral pod | No persistent state |
| Cold start | N/A | Seconds | Yes (critical issue) |
| Max duration | Unlimited | Unlimited | 15 min (Lambda) |`,
  why:`Choosing the wrong compute model costs money or creates operational burden. Lambda for 24/7 high-traffic = 10× more expensive than EC2. EC2 for sporadic events = paying for idle.`,
  example:{
    language:"yaml",
    code:`# AWS Lambda — event-driven, scales to zero
# serverless.yml (Serverless Framework)
service: order-processor
provider:
  name: aws
  runtime: java17
  memorySize: 512
  timeout: 30
  environment:
    DB_URL: !Sub "jdbc:postgresql://\${DbHost}/orders"

functions:
  processOrder:
    handler: com.example.OrderHandler::handleRequest
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10           # Process 10 SQS messages per invocation
          maximumBatchingWindow: 5 # Wait up to 5s to fill batch

  # HTTP API (API Gateway → Lambda)
  getOrder:
    handler: com.example.OrderQueryHandler::handleRequest
    events:
      - httpApi:
          path: /orders/{id}
          method: GET
    # Provisioned concurrency to eliminate cold starts for hot path
    provisionedConcurrency: 5

---
# SnapStart (Java Lambda) — pre-initialise JVM snapshot
# Add to Lambda config:
# SnapStart:
#   ApplyOn: PublishedVersions
# Reduces Java cold start from 3s → 200ms`,
    notes:"Lambda SnapStart (Java) takes a snapshot of the initialised JVM. Restores from snapshot instead of cold-starting — reduces latency by 10×."
  },
  interview:[
    {question:"How do you reduce Lambda cold start latency for a Java service?",
     answer:`**Cold start causes:** JVM startup (~500ms) + class loading + Spring context initialization (500ms-2s).\n\n**Mitigation strategies:**\n1. **Lambda SnapStart** — JVM snapshot taken after init; restored on cold start. Java 17+.\n2. **Provisioned concurrency** — keep N Lambda instances warm. Eliminates cold starts but costs per hour.\n3. **Smaller deployment package** — fewer classes to load. Use tree-shaking, avoid fat jars.\n4. **GraalVM native image** — compile Java to native binary. Start in <50ms. But: longer build, limited reflection.\n5. **Switch runtime** — Node.js/Go/Python have 50-100ms cold starts vs Java's 1-3s.\n6. **Keep warm ping** — EventBridge rule pings Lambda every 5 minutes. Dirty solution, not reliable.`,
     followUps:["What is GraalVM native compilation and what are its limitations?","How does Lambda handle 10,000 concurrent invocations?"]
    }
  ],
  tradeoffs:{
    pros:["Serverless: zero ops, auto-scale, pay-per-use","Containers: portability + K8s orchestration","VMs: maximum performance predictability"],
    cons:["Serverless: cold starts, 15-min max, stateless","Containers: K8s complexity","VMs: slow provisioning, manual scaling"],
    when:"Serverless for event-driven, infrequent, or unpredictable loads. Containers for steady web services. VMs for databases and performance-critical compute."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;background:#0d1117;border-radius:8px;padding:12px;color:#e6edf3;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    var ctx = canvas.getContext('2d');

    var tiers = [
      { id:'metal', label:'Bare Metal', sub:'Your rack', boot:'~5 min', cost:'$$$$', control:5, color:'#8b949e', x:0 },
      { id:'vm',    label:'VM / EC2',   sub:'Hypervisor', boot:'~60s',  cost:'$$$',  control:4, color:'#58a6ff', x:1 },
      { id:'cont',  label:'Container',  sub:'Docker',     boot:'~1s',   cost:'$$',   control:3, color:'#ffa657', x:2 },
      { id:'k8s',   label:'K8s Pod',    sub:'Orchestrated', boot:'~2s', cost:'$$',   control:2, color:'#bc8cff', x:3 },
      { id:'sless', label:'Serverless', sub:'Lambda',     boot:'~100ms',cost:'$',    control:1, color:'#3fb950', x:4 },
      { id:'edge',  label:'Edge Fn',    sub:'Regional',   boot:'~10ms', cost:'$',    control:0, color:'#e3b341', x:5 }
    ];

    var modes = {
      low:    { label:'Low Traffic',  active:[0,0,0,0,1,1], note:'Light load → Serverless + Edge handle it cheaply' },
      high:   { label:'High Traffic', active:[1,1,1,1,1,0], note:'Heavy sustained load → VMs + Containers dominate' },
      bursty: { label:'Bursty',       active:[0,0,1,1,1,1], note:'Spiky traffic → Containers + Serverless auto-scale' }
    };
    var currentMode = 'low';
    var dotX = 0, dotY = 0, dotTarget = 0, dotAnim = 0, animId = null;
    var reqDots = [];

    function colW() { return Math.min(canvas.width, 460) / tiers.length; }

    function draw() {
      if (!document.body.contains(canvas)) { if (animId) cancelAnimationFrame(animId); return; }
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, W, H);

      var cw = W / tiers.length;
      var mode = modes[currentMode];

      // Spectrum bar (top gradient)
      var grad = ctx.createLinearGradient(0, 18, W, 18);
      grad.addColorStop(0, '#8b949e');
      grad.addColorStop(0.2, '#58a6ff');
      grad.addColorStop(0.4, '#ffa657');
      grad.addColorStop(0.6, '#bc8cff');
      grad.addColorStop(0.8, '#3fb950');
      grad.addColorStop(1,   '#e3b341');
      ctx.fillStyle = grad;
      ctx.fillRect(8, 16, W - 16, 5);

      // Labels above spectrum
      ctx.font = '9px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
      ctx.fillText('← Max Control', 50, 12);
      ctx.fillText('Max Abstraction →', W - 50, 12);

      // Columns
      tiers.forEach(function(t, i) {
        var cx = i * cw + cw / 2;
        var active = mode.active[i] === 1;
        var colH = 180;
        var colY = 34;

        // Column box
        ctx.fillStyle = active ? t.color + '22' : '#161b22';
        ctx.strokeStyle = active ? t.color : '#30363d';
        ctx.lineWidth = active ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(i * cw + 4, colY, cw - 8, colH, 6);
        ctx.fill(); ctx.stroke();

        // Active glow
        if (active) {
          ctx.shadowColor = t.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = t.color; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(i * cw + 4, colY, cw - 8, colH, 6);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Icon circle
        ctx.beginPath();
        ctx.arc(cx, colY + 18, 10, 0, Math.PI * 2);
        ctx.fillStyle = active ? t.color : '#30363d';
        ctx.fill();
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#0d1117';
        ctx.textAlign = 'center';
        ctx.fillText(i, cx, colY + 22);

        // Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = active ? t.color : '#8b949e';
        ctx.textAlign = 'center';
        var words = t.label.split(' / ');
        ctx.fillText(words[0], cx, colY + 38);
        if (words[1]) ctx.fillText('/' + words[1], cx, colY + 48);

        ctx.font = '8px monospace';
        ctx.fillStyle = '#8b949e';
        ctx.fillText(t.sub, cx, colY + 59);

        // Boot time
        ctx.font = '8px monospace';
        ctx.fillStyle = active ? '#e3b341' : '#8b949e';
        ctx.fillText(t.boot, cx, colY + 74);

        // Cost dots
        ctx.font = '9px monospace';
        ctx.fillStyle = active ? '#3fb950' : '#30363d';
        ctx.fillText(t.cost, cx, colY + 89);

        // Control bar
        ctx.fillStyle = '#30363d';
        ctx.fillRect(cx - 18, colY + 97, 36, 5);
        ctx.fillStyle = active ? t.color : '#8b949e';
        var barW = t.control > 0 ? (t.control / 5) * 36 : 4;
        ctx.fillRect(cx - 18, colY + 97, barW, 5);

        ctx.font = '7px monospace';
        ctx.fillStyle = '#8b949e';
        ctx.fillText('ctrl', cx, colY + 110);

        // "Active" badge
        if (active) {
          ctx.fillStyle = t.color;
          ctx.font = 'bold 8px monospace';
          ctx.fillText('● ACTIVE', cx, colY + colH - 8);
        }
      });

      // Animated request dots
      reqDots.forEach(function(d) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = tiers[d.tier].color;
        ctx.shadowColor = tiers[d.tier].color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Note bar
      ctx.fillStyle = '#161b22';
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(8, 224, W - 16, 24, 4);
      ctx.fill(); ctx.stroke();
      ctx.font = '9px monospace';
      ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'center';
      ctx.fillText(mode.note, W / 2, 240);

      // Axis labels
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'left';
      ctx.fillText('Boot time ▼  Cost ▼  Control →', 10, 258);

      animId = requestAnimationFrame(animate);
    }

    function animate() {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(animId); return; }
      var mode = modes[currentMode];
      // Spawn new request dot occasionally
      if (Math.random() < 0.06) {
        var active = [];
        mode.active.forEach(function(a, i) { if (a) active.push(i); });
        if (active.length) {
          var tier = active[Math.floor(Math.random() * active.length)];
          var cw = canvas.width / tiers.length;
          reqDots.push({ x: tier * cw + cw / 2, y: 34, tier: tier, vy: 1.5 + Math.random() });
        }
      }
      reqDots.forEach(function(d) { d.y += d.vy; });
      reqDots = reqDots.filter(function(d) { return d.y < 220; });
      draw();
    }

    // Buttons
    Object.keys(modes).forEach(function(key) {
      var btn = document.createElement('button');
      btn.textContent = '[' + modes[key].label + ']';
      btn.style.cssText = btnStyle;
      btn.addEventListener('click', function() {
        currentMode = key;
        reqDots = [];
      });
      btnRow.appendChild(btn);
    });

    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);
    animate();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
