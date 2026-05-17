(function() {
  var topic = {
  id:"sd-kubernetes-prod", area:"sysdesign",
  title:"Kubernetes in Production — Pods, HPA & Rolling Deploys",
  tag:"Compute", tags:["kubernetes","k8s","pod","deployment","hpa","service","ingress","rolling deploy","liveness probe","readiness probe"],
  concept:`**Core Kubernetes objects:**

**Pod** — smallest deployable unit. One or more containers sharing network namespace and volumes. Ephemeral — never SSH into a pod.

**Deployment** — manages a ReplicaSet (N pod replicas). Handles rolling updates and rollbacks.

**Service** — stable virtual IP + DNS name for a set of pods. Types: ClusterIP (internal), NodePort, LoadBalancer (cloud LB), ExternalName.

**Ingress** — L7 HTTP routing rule (path/host → Service). Implemented by ingress controllers (nginx, Traefik, ALB Ingress).

**ConfigMap + Secret** — externalise configuration. Secrets base64-encoded (not encrypted by default — use Sealed Secrets or External Secrets Operator with AWS Secrets Manager).

**HPA (Horizontal Pod Autoscaler)** — scales Deployment replica count based on CPU/memory/custom metrics (via KEDA for queue depth).

**Rolling deploy strategy:**
\`\`\`
maxSurge: 1      # Allow 1 extra pod during update
maxUnavailable: 0 # Keep all pods available (zero downtime)
\`\`\`
New pods start → pass readiness probe → added to service endpoints → old pods terminated.

**Probes:**
- **Liveness** — is pod alive? Failure → container restart.
- **Readiness** — is pod ready to receive traffic? Failure → removed from service endpoints (but not restarted).
- **Startup** — for slow-starting apps. Disables liveness until started.`,
  why:`K8s is the industry standard for container orchestration. Interview questions cover deployments, scaling, networking, and troubleshooting. Understanding probes alone can save hours of incident debugging.`,
  example:{
    language:"yaml",
    code:`# Production-grade Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime deploy
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v2.1.0
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:v2.1.0
          ports: [{containerPort: 8080}]
          resources:
            requests: {cpu: "100m", memory: "256Mi"}
            limits:   {cpu: "500m", memory: "512Mi"}
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          readinessProbe:
            httpGet: {path: /actuator/health/readiness, port: 8080}
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: {path: /actuator/health/liveness, port: 8080}
            initialDelaySeconds: 30
            periodSeconds: 10
---
# HPA — scale on CPU + custom metric (queue depth)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External             # KEDA custom metric
      external:
        metric:
          name: sqs_messages_visible
          selector:
            matchLabels:
              queue: order-queue
        target:
          type: AverageValue
          averageValue: "30"     # Scale up if >30 msgs/pod`,
    notes:"Always set resource requests+limits. Without them, pods can starve other pods (requests) or be OOMKilled (limits). requests=what scheduler uses; limits=hard cap."
  },
  interview:[
    {question:"What happens when a pod fails its liveness probe?",
     answer:`The kubelet on the node restarts the container (not the pod). The pod itself stays — it retains its IP, volumes, and resource reservation. The container's process is killed and restarted according to the pod's \`restartPolicy\` (default: Always).\n\n**Key distinction from readiness:** A failed readiness probe removes the pod from Service endpoints (no traffic) but doesn't restart it. A failed liveness probe restarts the container.\n\n**Common pitfall:** Setting liveness probe path same as a heavyweight health endpoint. If liveness probe itself causes load → cascade. Use a simple fast endpoint for liveness (\`/live\`) separate from deep health check.`,
     followUps:["What is pod disruption budget and why is it important?","How does K8s handle node failure?"]
    }
  ],
  tradeoffs:{
    pros:["Self-healing (pod restart, node replacement)","Declarative — desired state reconciled automatically","Rich ecosystem: Helm, Kustomize, ArgoCD, KEDA"],
    cons:["Steep learning curve","etcd is a critical single point — must be HA","Networking complexity (CNI, service mesh)"],
    when:"K8s for anything running more than a handful of microservices in production. Use managed K8s (EKS, GKE, AKS) — running your own control plane is expensive."
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

    var nodes = [
      { id:0, label:'Node-1', cpu:40, mem:55, pods:2, maxPods:4, x:60,  y:155 },
      { id:1, label:'Node-2', cpu:75, mem:80, pods:3, maxPods:4, x:220, y:155 },
      { id:2, label:'Node-3', cpu:20, mem:30, pods:1, maxPods:4, x:380, y:155 }
    ];

    var STATE_IDLE    = 0;
    var STATE_FILTER  = 1;
    var STATE_SCORE   = 2;
    var STATE_BIND    = 3;
    var STATE_PENDING = 4;
    var STATE_DONE    = 5;

    var state = STATE_IDLE;
    var animFrame = 0;
    var scores = [0, 0, 0];
    var winner = -1;
    var pendingMode = false;
    var podY = 40;
    var podTargetY = 0;
    var podAnimDone = false;
    var animId = null;

    function resetAnim(pending) {
      state = STATE_IDLE;
      animFrame = 0;
      scores = [0, 0, 0];
      winner = -1;
      pendingMode = !!pending;
      podY = 40;
      podTargetY = 0;
      podAnimDone = false;
    }

    function computeScores() {
      if (pendingMode) {
        // Node-1 and Node-2 are full, only Node-3 eligible but also mark filtered
        scores = [0, 0, 85];
        winner = -1; // pending: no winner since we want to show pending scenario
      } else {
        // Score = 100 - (cpu + mem)/2
        nodes.forEach(function(n, i) {
          scores[i] = Math.round(100 - (n.cpu + n.mem) / 2);
        });
        winner = scores.indexOf(Math.max.apply(null, scores));
      }
    }

    function drawBar(x, y, w, h, val, max, color) {
      ctx.fillStyle = '#30363d';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, Math.round(w * val / max), h);
    }

    function draw() {
      if (!document.body.contains(canvas)) { if (animId) cancelAnimationFrame(animId); return; }
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // Title
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#58a6ff'; ctx.textAlign = 'center';
      ctx.fillText('K8s Scheduler: Filtering → Scoring → Binding', W/2, 16);

      // Unscheduled Pod (top)
      var podColor = state === STATE_IDLE ? '#8b949e' :
                     state === STATE_PENDING ? '#ffa657' :
                     state === STATE_DONE ? '#3fb950' : '#58a6ff';
      ctx.strokeStyle = podColor; ctx.lineWidth = state === STATE_IDLE ? 1 : 2;
      ctx.setLineDash(state === STATE_DONE ? [] : [4, 3]);
      ctx.shadowColor = podColor; ctx.shadowBlur = state > STATE_IDLE ? 8 : 0;
      ctx.strokeRect(W/2 - 60, podY, 120, 36);
      ctx.shadowBlur = 0; ctx.setLineDash([]);
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = podColor; ctx.textAlign = 'center';
      ctx.fillText(state === STATE_PENDING ? 'Pod: PENDING ⏳' : state === STATE_DONE ? 'Pod: Scheduled ✓' : 'Pod (unscheduled)', W/2, podY + 14);
      ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e';
      ctx.fillText('CPU: 500m  RAM: 256Mi', W/2, podY + 28);

      // Scheduler box
      var schedY = 88;
      var schedActive = state >= STATE_FILTER && state < STATE_DONE;
      ctx.fillStyle = schedActive ? '#58a6ff22' : '#161b22';
      ctx.strokeStyle = schedActive ? '#58a6ff' : '#30363d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(W/2 - 72, schedY, 144, 28, 4); ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px monospace'; ctx.fillStyle = schedActive ? '#58a6ff' : '#8b949e'; ctx.textAlign = 'center';
      var schedLabel = state === STATE_FILTER ? 'Scheduler: Filtering...' :
                       state === STATE_SCORE  ? 'Scheduler: Scoring...' :
                       state === STATE_BIND   ? 'Scheduler: Binding...' :
                       state === STATE_DONE   ? 'Scheduler: Done ✓' :
                       state === STATE_PENDING? 'Scheduler: No fit → Pending' :
                       'Scheduler';
      ctx.fillText(schedLabel, W/2, schedY + 18);

      // Arrow pod → scheduler
      if (state >= STATE_FILTER) {
        ctx.strokeStyle = '#58a6ff44'; ctx.lineWidth = 1; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(W/2, podY + 36); ctx.lineTo(W/2, schedY); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Nodes
      nodes.forEach(function(n, i) {
        var nx = n.x, ny = n.y, nw = 100, nh = 110;
        var isWinner = state === STATE_DONE && winner === i;
        var isFull = pendingMode && (n.cpu > 60 || n.mem > 60);
        var nodeColor = isWinner ? '#3fb950' : isFull ? '#f85149' : '#30363d';

        ctx.fillStyle = isWinner ? '#3fb95011' : isFull ? '#f8514911' : '#161b22';
        ctx.strokeStyle = nodeColor; ctx.lineWidth = isWinner ? 2 : 1;
        ctx.shadowColor = isWinner ? '#3fb950' : 'transparent';
        ctx.shadowBlur = isWinner ? 12 : 0;
        ctx.beginPath(); ctx.roundRect(nx - nw/2, ny, nw, nh, 6); ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 9px monospace'; ctx.fillStyle = nodeColor; ctx.textAlign = 'center';
        ctx.fillText(n.label + (isFull ? ' ⚠' : ''), nx, ny + 14);

        // CPU bar
        ctx.font = '8px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'left';
        ctx.fillText('CPU', nx - 44, ny + 28);
        drawBar(nx - 44, ny + 30, 88, 6, n.cpu, 100, n.cpu > 70 ? '#f85149' : '#58a6ff');
        ctx.textAlign = 'right'; ctx.fillText(n.cpu + '%', nx + 44, ny + 28);

        // Mem bar
        ctx.textAlign = 'left';
        ctx.fillText('MEM', nx - 44, ny + 46);
        drawBar(nx - 44, ny + 48, 88, 6, n.mem, 100, n.mem > 70 ? '#f85149' : '#bc8cff');
        ctx.textAlign = 'right'; ctx.fillText(n.mem + '%', nx + 44, ny + 46);

        // Pods
        ctx.textAlign = 'left'; ctx.fillStyle = '#8b949e';
        ctx.fillText('Pods: ' + n.pods + '/' + n.maxPods, nx - 44, ny + 65);

        // Score bar (during score phase)
        if (state === STATE_SCORE || state === STATE_BIND || state === STATE_DONE) {
          var sc = scores[i];
          var scPct = animFrame < 40 ? (sc * (animFrame / 40)) : sc;
          if (pendingMode) scPct = (i === 2 && !isFull) ? 85 : 0;
          ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
          ctx.fillText('Score', nx, ny + 80);
          drawBar(nx - 44, ny + 83, 88, 8, scPct, 100, isWinner ? '#3fb950' : '#58a6ff');
          ctx.fillText(Math.round(scPct), nx, ny + 98);
        }

        // Arrow scheduler → node
        if (state >= STATE_FILTER) {
          ctx.strokeStyle = isWinner ? '#3fb950' : isFull ? '#f8514955' : '#58a6ff44';
          ctx.lineWidth = isWinner ? 2 : 1;
          ctx.setLineDash(isWinner ? [] : [3,3]);
          ctx.beginPath();
          ctx.moveTo(W/2, schedY + 28);
          ctx.quadraticCurveTo(W/2, ny - 10, nx, ny);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // Status note
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(8, 278, W - 16, 30, 4); ctx.fill(); ctx.stroke();
      ctx.font = '9px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
      var notes = ['Click [Schedule Pod] or [Node Full] to animate', 'Filter: remove nodes that can\'t fit pod', 'Score: rank remaining nodes (higher = better)', 'Bind: pod assigned to node-' + (winner+1), state===STATE_DONE && winner>=0 ? 'Pod scheduled on ' + nodes[winner].label + ' ✓' : 'No node fits — Pod stays Pending ⏳', ''];
      ctx.fillText(notes[Math.min(state, 5)] || notes[0], W/2, 298);
    }

    var phase = 0;
    function animate() {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(animId); return; }
      animFrame++;

      if (state === STATE_IDLE && animFrame > 20) {
        state = STATE_FILTER; animFrame = 0;
      } else if (state === STATE_FILTER && animFrame > 35) {
        computeScores();
        state = STATE_SCORE; animFrame = 0;
      } else if (state === STATE_SCORE && animFrame > 55) {
        if (pendingMode) { state = STATE_PENDING; }
        else { state = STATE_BIND; animFrame = 0; }
      } else if (state === STATE_BIND && animFrame > 30) {
        state = STATE_DONE;
        podTargetY = nodes[winner].y - 36;
      }

      if (state === STATE_DONE && !podAnimDone && winner >= 0) {
        podY += (podTargetY - podY) * 0.12;
        if (Math.abs(podY - podTargetY) < 1) { podY = podTargetY; podAnimDone = true; }
      }

      draw();
      animId = requestAnimationFrame(animate);
    }

    var schedBtn = document.createElement('button');
    schedBtn.textContent = '[Schedule Pod]';
    schedBtn.style.cssText = btnStyle;
    schedBtn.addEventListener('click', function() { resetAnim(false); });

    var fullBtn = document.createElement('button');
    fullBtn.textContent = '[Node Full]';
    fullBtn.style.cssText = btnStyle;
    fullBtn.addEventListener('click', function() {
      nodes[0].cpu = 85; nodes[0].mem = 90;
      nodes[1].cpu = 80; nodes[1].mem = 85;
      nodes[2].cpu = 20; nodes[2].mem = 25;
      resetAnim(false);
    });

    btnRow.appendChild(schedBtn);
    btnRow.appendChild(fullBtn);
    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);
    animate();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
