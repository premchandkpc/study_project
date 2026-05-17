(function() {
  var topic = {
  id:"sd-api-gateway", area:"sysdesign",
  title:"API Gateway — Routing, Auth & Rate Limiting",
  tag:"Gateway", tags:["api gateway","kong","envoy","rate limiting","auth","reverse proxy","nginx"],
  concept:`An **API Gateway** is the single entry point for all client requests. It handles cross-cutting concerns so individual services don't have to.

**Core responsibilities:**
1. **Request routing** — path/header/method matching → upstream service
2. **Auth/AuthZ** — JWT validation, OAuth2 token introspection, API key lookup
3. **Rate limiting** — per-user/per-IP/per-plan token buckets or sliding windows
4. **SSL termination** — decrypt TLS once at the edge; internal traffic plain HTTP or mTLS
5. **Request transformation** — header injection, payload rewriting, protocol translation (REST↔gRPC)
6. **Observability** — access logs, metrics (latency p99, error rate), distributed trace propagation
7. **Circuit breaking** — fail fast when upstream unhealthy

**Popular implementations:**
- **Kong** — Nginx-based, plugin ecosystem, declarative config
- **Envoy** — C++ proxy, xDS API, used as sidecar in Istio
- **AWS API Gateway** — managed, Lambda integration, usage plans
- **nginx** — manual config, high performance, battle-tested
- **Traefik** — cloud-native, auto-discovers K8s services`,
  why:`Without a gateway, every service must implement auth, rate-limiting, and logging independently — 10 services × 3 concerns = 30 implementations that drift. The gateway centralises this into one audited, consistent implementation.`,
  example:{
    language:"yaml",
    code:`# Kong declarative config (kong.yaml)
_format_version: "3.0"

services:
  - name: order-service
    url: http://order-svc:8080
    routes:
      - name: orders-route
        paths: ["/api/v1/orders"]
        methods: ["GET", "POST"]
    plugins:
      - name: jwt            # validates Bearer token
        config:
          claims_to_verify: [exp]
      - name: rate-limiting
        config:
          minute: 100        # 100 req/min per consumer
          policy: redis      # distributed counter via Redis
      - name: prometheus     # scrape /metrics
      - name: request-transformer
        config:
          add:
            headers: ["X-Service-Name:order-service"]

  - name: user-service
    url: http://user-svc:8080
    routes:
      - name: users-route
        paths: ["/api/v1/users"]
    plugins:
      - name: key-auth       # API key in X-Api-Key header`,
    notes:"Kong runs as a reverse proxy in front of all services. Plugin chain executes in order: auth → rate-limit → transform → log."
  },
  interview:[
    {question:"How would you implement rate limiting in an API gateway for distributed servers?",
     answer:`**Token bucket algorithm** per user/IP stored in **Redis** (atomic INCR + EXPIRE).\n\nSteps:\n1. On each request, INCR a Redis key like \`ratelimit:{userId}:{window}\`\n2. If count > limit, return 429 Too Many Requests with Retry-After header\n3. Key expires after window duration — no cleanup needed\n\n**Challenge:** race condition between check and increment. Solve with **Lua script** (atomic execution in Redis) or **Redis cell module** (token bucket native).\n\n**Sliding window** more accurate than fixed window (avoids burst at window boundary) — store timestamps in a Redis Sorted Set, expire old entries, count remaining.`,
     followUps:["What is the difference between token bucket and leaky bucket?","How do you handle rate limiting across multiple gateway instances?"]
    },
    {question:"What is the difference between an API Gateway and a load balancer?",
     answer:`**Load balancer (L4/L7):** distributes traffic across identical instances of the same service. L4 = TCP/UDP level (no HTTP awareness). L7 = HTTP-aware (can route by path/host).\n\n**API Gateway:** sits above the LB. Knows about your business services, auth schemes, and API contracts. Routes different paths to different services, enforces auth/rate-limit, transforms requests.\n\nTypical stack: Client → CDN → L4 LB → API Gateway → L7 LB per service → service instances.`,
     followUps:["When would you use an API Gateway vs a service mesh?"]
    }
  ],
  tradeoffs:{
    pros:["Single enforcement point for auth/rate-limit/logging","Decouples clients from service topology","Enables zero-downtime schema evolution via versioned routes"],
    cons:["Single point of failure if not HA deployed","Adds 1-5ms latency per hop","Complex plugin chains are hard to debug","Fat gateway can become a bottleneck"],
    when:"Always use for external-facing APIs. For pure internal service-to-service traffic consider service mesh (mTLS + observability) instead of gateway."
  },
  architecture:{
    title:"API Gateway — Request Flow",
    caption:"Gateway handles all cross-cutting concerns before reaching services",
    lanes:[
      {label:"Clients",nodes:[
        {id:"mobile",label:"Mobile App",hint:"iOS / Android"},
        {id:"web",label:"Web Browser",hint:"SPA / SSR"},
        {id:"partner",label:"Partner API",hint:"B2B integrations"}
      ]},
      {label:"Gateway Layer",nodes:[
        {id:"tls-term",label:"TLS Termination",hint:"Decrypt once at edge",detail:"All HTTPS traffic decrypted here. Internal traffic uses mTLS or plain HTTP depending on trust model."},
        {id:"auth-plugin",label:"Auth Plugin",hint:"JWT / API Key / OAuth2",detail:"Validates token signature, checks expiry, extracts claims (userId, roles). Rejects 401 before hitting any service."},
        {id:"rate-limit",label:"Rate Limiter",hint:"Token bucket in Redis",detail:"Per-consumer counters in Redis. 429 returned with Retry-After. Prevents abuse and cost overruns."},
        {id:"router",label:"Request Router",hint:"Path → upstream service",detail:"Route table maps path prefixes to upstream services. Supports canary (5% → new version) and A/B routing."}
      ]},
      {label:"Backend Services",nodes:[
        {id:"order-svc",label:"Order Service",badge:"v2",hint:"POST /orders, GET /orders/:id",detail:"Handles order creation, fulfillment, status updates."},
        {id:"user-svc",label:"User Service",badge:"v1",hint:"GET /users/:id",detail:"Profile, preferences, authentication data."},
        {id:"payment-svc",label:"Payment Service",hint:"POST /payments",detail:"PCI-DSS scoped service — minimal external surface."}
      ]}
    ],
    links:[
      {from:"mobile",to:"tls-term",label:"HTTPS request",detail:"All clients terminate TLS at gateway."},
      {from:"tls-term",to:"auth-plugin",label:"Decrypted request",detail:"Plain HTTP internally; auth plugin validates token."},
      {from:"auth-plugin",to:"rate-limit",label:"Authenticated request",detail:"Auth claims attached as headers (X-User-Id, X-Roles)."},
      {from:"rate-limit",to:"router",label:"Within quota",detail:"Counter checked/incremented in Redis atomically."},
      {from:"router",to:"order-svc",label:"/api/v1/orders",detail:"Routed based on path prefix; upstream load-balanced."},
      {from:"router",to:"user-svc",label:"/api/v1/users",detail:"Different upstream pool, independent scaling."},
      {from:"router",to:"payment-svc",label:"/api/v1/payments",detail:"Extra mTLS + audit logging enabled for payment routes."}
    ]
  },
  visual: function(mount) {
    var W = 460, H = 320;

    // Pipeline stages
    var stages = [
      { label: 'Rate Limiter', badge: '429?',  color: '#ffa657', x: 100 },
      { label: 'Auth',         badge: '401?',  color: '#bc8cff', x: 185 },
      { label: 'Router',       badge: 'Route', color: '#58a6ff', x: 270 }
    ];
    var serviceA = { label: 'Service A', color: '#3fb950', x: 370, y: 110 };
    var serviceB = { label: 'Service B', color: '#3fb950', x: 370, y: 200 };

    var clientX = 30, pipeY = 155;

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';

    function makeBtn(text, color) {
      var b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = 'padding:5px 12px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:' + color + ';cursor:pointer;font-size:12px';
      return b;
    }

    var sendBtn  = makeBtn('→ Send Request', '#3fb950');
    var btn429   = makeBtn('⚡ Sim 429', '#ffa657');
    var btn401   = makeBtn('🔒 Sim 401', '#bc8cff');
    ctrl.appendChild(sendBtn); ctrl.appendChild(btn429); ctrl.appendChild(btn401);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // packet state
    // modes: 'normal', 'r429', 'r401'
    var pkt = null;
    var msgLog = []; // last 4 messages
    var rafId = null;

    function log(msg, color) {
      msgLog.unshift({ text: msg, color: color || '#e6edf3' });
      if (msgLog.length > 4) msgLog.pop();
    }

    function startPacket(mode) {
      if (pkt) return;
      pkt = {
        mode: mode,
        x: clientX + 20,
        y: pipeY,
        targetX: stages[0].x - 24,
        stageIdx: 0,
        phase: 'forward',   // 'forward' | 'reject' | 'toService' | 'response'
        color: '#e6edf3',
        prog: 0,
        bounce: false,
        statusCode: null,
        routeToA: true
      };
    }

    function drawBox(x, y, w, h, fillC, strokeC, text, subtext, bold) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w/2, y - h/2, w, h, 4);
      else ctx.rect(x - w/2, y - h/2, w, h);
      ctx.fillStyle = fillC; ctx.fill();
      ctx.strokeStyle = strokeC; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = strokeC; ctx.font = (bold ? 'bold ' : '') + '10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(text, x, y + (subtext ? -2 : 4));
      if (subtext) { ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace'; ctx.fillText(subtext, x, y + 10); }
    }

    function drawScene() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // Title
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('API Gateway Pipeline', W/2, 16);

      // Horizontal pipe line
      ctx.beginPath();
      ctx.moveTo(clientX + 20, pipeY);
      ctx.lineTo(stages[stages.length-1].x + 24, pipeY);
      ctx.strokeStyle = '#21262d'; ctx.lineWidth = 2; ctx.stroke();

      // Client box
      drawBox(clientX, pipeY, 36, 36, '#161b22', '#58a6ff', 'Client', null, true);

      // Protocol badge on pipe
      ctx.fillStyle = '#30363d';
      var bx = (clientX + 20 + stages[0].x - 24) / 2;
      ctx.fillRect(bx - 28, pipeY - 8, 56, 14);
      ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('REST/HTTP', bx, pipeY + 3);

      // Stage boxes
      var activeStage = pkt ? pkt.stageIdx : -1;
      stages.forEach(function(s, i) {
        var isActive = (pkt && pkt.phase === 'forward' && pkt.stageIdx === i && pkt.prog > 0.6);
        var isReject = (pkt && pkt.phase === 'reject' && pkt.stageIdx === i);
        drawBox(s.x, pipeY, 48, 48,
          isReject ? s.color + '33' : isActive ? s.color + '22' : '#161b22',
          isReject ? s.color : isActive ? s.color : '#30363d',
          s.label, s.badge, isActive || isReject);

        // Pipe between stages
        if (i < stages.length - 1) {
          ctx.beginPath();
          ctx.moveTo(s.x + 24, pipeY);
          ctx.lineTo(stages[i+1].x - 24, pipeY);
          ctx.strokeStyle = '#21262d'; ctx.lineWidth = 2; ctx.stroke();
        }
      });

      // Service fork lines
      var lastStageX = stages[stages.length-1].x + 24;
      [[serviceA], [serviceB]].forEach(function(arr) {
        var svc = arr[0];
        ctx.beginPath(); ctx.moveTo(lastStageX, pipeY);
        ctx.lineTo(svc.x - 28, svc.y);
        ctx.strokeStyle = '#21262d'; ctx.lineWidth = 1; ctx.stroke();
      });

      // Service boxes
      [serviceA, serviceB].forEach(function(svc, i) {
        var isTarget = pkt && pkt.phase === 'toService' && ((i === 0 && pkt.routeToA) || (i === 1 && !pkt.routeToA));
        drawBox(svc.x, svc.y, 70, 28,
          isTarget ? svc.color + '22' : '#161b22',
          isTarget ? svc.color : '#30363d',
          svc.label, i === 0 ? '/orders' : '/users', isTarget);
      });

      // Moving packet dot
      if (pkt) {
        ctx.beginPath(); ctx.arc(pkt.x, pkt.y, 7, 0, Math.PI*2);
        ctx.fillStyle = pkt.color; ctx.fill();
        ctx.beginPath(); ctx.arc(pkt.x, pkt.y, 7, 0, Math.PI*2);
        ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 1; ctx.stroke();
        if (pkt.statusCode) {
          ctx.fillStyle = '#0d1117'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
          ctx.fillText(pkt.statusCode, pkt.x, pkt.y + 2.5);
        }
      }

      // Message log
      var logY = 260;
      ctx.fillStyle = '#161b22'; ctx.fillRect(10, logY, W - 20, 52);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.strokeRect(10, logY, W - 20, 52);
      ctx.fillStyle = '#8b949e'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
      ctx.fillText('LOG:', 16, logY + 12);
      msgLog.slice(0, 4).forEach(function(m, i) {
        ctx.fillStyle = m.color; ctx.font = '9px monospace';
        ctx.fillText(m.text, 16, logY + 12 + (i + 1) * 11);
      });
    }

    function advancePkt() {
      if (!pkt) return;
      if (pkt.phase === 'forward') {
        if (pkt.prog >= 1) {
          // arrived at stage
          if (pkt.mode === 'r429' && pkt.stageIdx === 0) {
            pkt.phase = 'reject'; pkt.prog = 0; pkt.color = '#ffa657'; pkt.statusCode = '429';
            log('[Rate Limiter] → 429 Too Many Requests', '#ffa657');
          } else if (pkt.mode === 'r401' && pkt.stageIdx === 1) {
            pkt.phase = 'reject'; pkt.prog = 0; pkt.color = '#bc8cff'; pkt.statusCode = '401';
            log('[Auth] → 401 Unauthorized', '#bc8cff');
          } else if (pkt.stageIdx < stages.length - 1) {
            pkt.stageIdx++;
            pkt.targetX = stages[pkt.stageIdx].x - 24;
            pkt.prog = 0;
            log('[' + stages[pkt.stageIdx - 1].label + '] → PASS ✓', '#3fb950');
          } else {
            // passed all stages — route to service
            log('[Router] → routing to service', '#58a6ff');
            pkt.routeToA = Math.random() > 0.5;
            pkt.phase = 'toService'; pkt.prog = 0;
            pkt.targetX = (pkt.routeToA ? serviceA : serviceB).x - 28;
            pkt.targetY = (pkt.routeToA ? serviceA : serviceB).y;
          }
        } else {
          pkt.x += (pkt.targetX - pkt.x) * 0.08;
          if (Math.abs(pkt.x - pkt.targetX) < 2) { pkt.x = pkt.targetX; pkt.prog = 1; }
        }
      } else if (pkt.phase === 'reject') {
        // bounce back to client
        pkt.x -= 2.5;
        if (pkt.x <= clientX + 20) {
          log('← Response ' + pkt.statusCode + ' sent to client', pkt.color);
          pkt = null;
        }
      } else if (pkt.phase === 'toService') {
        pkt.x += (pkt.targetX - pkt.x) * 0.08;
        pkt.y += (pkt.targetY - pkt.y) * 0.08;
        if (Math.abs(pkt.x - pkt.targetX) < 2 && Math.abs(pkt.y - pkt.targetY) < 2) {
          var svcName = pkt.routeToA ? 'Service A' : 'Service B';
          log('[' + svcName + '] → 200 OK', '#3fb950');
          pkt.phase = 'response'; pkt.statusCode = '200'; pkt.color = '#3fb950';
          pkt.targetX = clientX + 20; pkt.targetY = pipeY;
        }
      } else if (pkt.phase === 'response') {
        pkt.x += (pkt.targetX - pkt.x) * 0.06;
        pkt.y += (pkt.targetY - pkt.y) * 0.06;
        if (Math.abs(pkt.x - pkt.targetX) < 2 && Math.abs(pkt.y - pkt.targetY) < 2) {
          pkt = null;
        }
      }
    }

    function frame() {
      if (!document.body.contains(canvas)) return;
      advancePkt();
      drawScene();
      rafId = requestAnimationFrame(frame);
    }

    sendBtn.addEventListener('click', function() { startPacket('normal'); log('→ Sending normal request...', '#e6edf3'); });
    btn429.addEventListener('click', function() { startPacket('r429'); log('→ Sending request (rate limit exceeded)...', '#ffa657'); });
    btn401.addEventListener('click', function() { startPacket('r401'); log('→ Sending request (bad/missing token)...', '#bc8cff'); });

    drawScene();
    rafId = requestAnimationFrame(frame);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
