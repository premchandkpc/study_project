(function() {
  var topic = {
  id:"sd-load-balancing", area:"sysdesign",
  title:"Load Balancing — L4/L7, Algorithms & Health Checks",
  tag:"Infrastructure", tags:["load balancer","round robin","least connections","consistent hashing","nlb","alb","nginx","ha proxy"],
  concept:`A **load balancer** distributes incoming traffic across multiple backend instances to maximise throughput, minimise latency, and avoid overloading any single server.

**L4 vs L7:**
- **L4 (Transport layer)** — routes by IP + TCP/UDP port. Doesn't inspect HTTP content. Very fast (< 0.1ms overhead). Example: AWS NLB.
- **L7 (Application layer)** — inspects HTTP headers, URL path, cookies. Can route by content, inject headers, terminate TLS. Example: AWS ALB, nginx.

**Algorithms:**
| Algorithm | Best for | Drawback |
|---|---|---|
| Round-robin | Homogeneous servers | Ignores server load |
| Weighted round-robin | Mixed capacity servers | Static weights |
| Least connections | Long-lived connections (WebSocket) | Needs connection tracking |
| Least response time | Latency-sensitive | Requires active probing |
| IP hash | Session affinity without cookies | Uneven if few IPs |
| Consistent hashing | Distributed caches | Rebalancing on change |
| Random | Simplest | No load awareness |

**Health checks:**
- **Passive** — detect failure from response codes/timeouts on real traffic
- **Active** — probe /health endpoint on interval (e.g., 5s); remove from pool after N failures; re-add after M successes
- **Graceful drain** — on scale-in, stop sending new requests but complete in-flight (connection draining, 30–60 s default in AWS)`,
  why:`Load balancing is what makes horizontal scaling possible. Without it, you have one server. With it, you have unlimited theoretical throughput. Algorithm choice directly impacts p99 latency.`,
  example:{
    language:"yaml",
    code:`# nginx L7 load balancer config
upstream order_service {
    least_conn;  # algorithm: least active connections

    server order-1.internal:8080 weight=3;  # more powerful server
    server order-2.internal:8080 weight=1;
    server order-3.internal:8080 weight=1;

    keepalive 32;  # pool of persistent connections to upstreams
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate     /certs/cert.pem;
    ssl_certificate_key /certs/key.pem;

    location /api/orders {
        proxy_pass http://order_service;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Request-ID $request_id;

        # Health check
        proxy_connect_timeout 2s;
        proxy_read_timeout 30s;

        # Circuit breaker
        proxy_next_upstream error timeout http_502 http_503;
        proxy_next_upstream_tries 2;
    }
}`,
    notes:"keepalive 32 maintains 32 idle connections per worker to each upstream — eliminates TCP handshake on each request."
  },
  interview:[
    {question:"Why use consistent hashing in a load balancer for a caching layer?",
     answer:`When load balancing to a distributed cache (e.g. Memcached cluster), you want the same key to always go to the same node for maximum cache utilisation. Round-robin would send \`user:42\` to any of 10 nodes — the key would need to be in all 10 nodes or you'd get misses.\n\nConsistent hashing places servers on a hash ring. A request key is hashed and routes clockwise to the nearest server. On adding/removing a node, only ~K/N keys need to remapped (K=keys, N=nodes) — vs hash-mod which remaps nearly all keys.\n\n**Virtual nodes (vnodes)** — each physical server gets 150 virtual positions on the ring for uniform distribution.`,
     followUps:["How do you handle hot spots in consistent hashing?","What is a bounded-load consistent hash?"]
    },
    {question:"What is connection draining and why is it important?",
     answer:`When a server is removed from the LB pool (scale-in, deployment), in-flight requests must complete. Connection draining (AWS calls it "deregistration delay") tells the LB to stop sending new requests to the deregistering target but keep the existing connections alive until they complete or a timeout (30-60s) elapses.\n\nWithout draining: mid-flight requests receive TCP RST → user sees errors. With draining: zero-downtime deployments and scale-in events.`,
     followUps:["How do you implement graceful shutdown in a Go/Java service?"]
    }
  ],
  tradeoffs:{
    pros:["Enables horizontal scaling","Eliminates single points of failure","Algorithms can optimize for latency or fairness"],
    cons:["L7 LB adds ~1-5ms per request","Sticky sessions complicate stateless design","Health check intervals introduce detection lag"],
    when:"Always. L4 for raw TCP throughput (gaming, DB). L7 for HTTP APIs with routing/auth needs. Least-conn for WebSocket. Consistent hash for cache clusters."
  },
  flow:{
    title:"L7 Load Balancing — Request Distribution",
    caption:"LB routes requests based on algorithm; health checks maintain pool",
    nodes:[
      {id:"client",label:"Client",hint:"Browser / mobile / service"},
      {id:"lb",label:"L7 Load Balancer",hint:"nginx / ALB — HTTP-aware"},
      {id:"hc",label:"Health Checker",hint:"Active probe every 5s"},
      {id:"s1",label:"App Server 1",hint:"weight=3, 3 connections"},
      {id:"s2",label:"App Server 2",hint:"weight=1, 1 connection"},
      {id:"s3",label:"App Server 3",hint:"UNHEALTHY — removed from pool"}
    ],
    steps:[
      {path:["hc","s1"],label:"Active health check",detail:"LB probes GET /health on each upstream every 5s. 2 consecutive failures → removed from pool. 3 successes → re-added."},
      {path:["hc","s3"],label:"Server 3 marked unhealthy",detail:"Server 3 returned 503 twice. Removed from upstream pool. No traffic sent until it recovers."},
      {path:["client","lb"],label:"Client sends request",detail:"Client connects to LB virtual IP. TLS terminated here. HTTP/2 stream opened."},
      {path:["lb","s1"],label:"Routed to Server 1 (least-conn)",detail:"Server 1 has fewest active connections. LB forwards request, increments connection counter."},
      {path:["s1","client"],label:"Response returned",detail:"Server 1 responds. LB decrements connection counter. Result flows back to client."}
    ]
  },
  visual: function(mount) {
    var W = 460, H = 320;

    var algo = 'roundrobin';
    var servers = [
      { label: 'S1', color: '#3fb950', x: 340, y: 80,  conns: 0, served: 0, healthy: true  },
      { label: 'S2', color: '#58a6ff', x: 340, y: 160, conns: 0, served: 0, healthy: true  },
      { label: 'S3', color: '#ffa657', x: 340, y: 240, conns: 0, served: 0, healthy: false }
    ];
    var rrIdx = 0;

    var clientX = 60, lbX = 190;
    var clientY = 160, lbY = 160;

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';

    function makeBtn(text, key, color) {
      var b = document.createElement('button');
      b.textContent = text;
      b.style.cssText = 'padding:5px 12px;border-radius:6px;border:1px solid #30363d;background:' + (algo===key ? '#30363d' : '#21262d') + ';color:' + (color || '#e6edf3') + ';cursor:pointer;font-size:12px';
      b.addEventListener('click', function() {
        algo = key;
        allBtns.forEach(function(bb) { bb.style.background = '#21262d'; });
        b.style.background = '#30363d';
        // reset connections
        servers.forEach(function(s) { s.conns = 0; });
        rrIdx = 0;
        drawScene();
      });
      return b;
    }

    var b1 = makeBtn('⟳ Round Robin', 'roundrobin', '#e6edf3');
    var b2 = makeBtn('≤ Least Conn', 'leastconn', '#58a6ff');
    var b3 = makeBtn('# IP Hash', 'iphash', '#bc8cff');
    var sendBtn = document.createElement('button');
    sendBtn.textContent = '→ Send Request';
    sendBtn.style.cssText = 'padding:5px 12px;border-radius:6px;border:1px solid #3fb950;background:#21262d;color:#3fb950;cursor:pointer;font-size:12px';

    var allBtns = [b1, b2, b3];
    ctrl.appendChild(b1); ctrl.appendChild(b2); ctrl.appendChild(b3); ctrl.appendChild(sendBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // Packet animation
    var packet = null; // { fromX, fromY, toX, toY, prog, color, phase }
    var lastRouted = -1;
    var rafId = null;

    function pickServer() {
      var healthy = servers.filter(function(s) { return s.healthy; });
      if (!healthy.length) return null;
      if (algo === 'roundrobin') {
        var h = healthy[rrIdx % healthy.length]; rrIdx++; return h;
      } else if (algo === 'leastconn') {
        return healthy.reduce(function(a, b) { return a.conns <= b.conns ? a : b; });
      } else {
        // IP hash — always routes to same index (simulate same IP)
        return healthy[1] || healthy[0];
      }
    }

    function sendRequest() {
      if (packet) return;
      var target = pickServer();
      if (!target) return;
      target.conns++;
      lastRouted = servers.indexOf(target);
      packet = { fromX: clientX + 22, fromY: clientY, midX: lbX + 28, midY: lbY, toX: target.x - 26, toY: target.y, prog: 0, phase: 'toLB', color: target.color, target: target };
    }

    function drawRoundedRect(x, y, w, h, r) {
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
      else { ctx.beginPath(); ctx.rect(x, y, w, h); }
    }

    function drawScene() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // Title
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      var algoLabel = algo === 'roundrobin' ? 'Round Robin' : algo === 'leastconn' ? 'Least Connections' : 'IP Hash';
      ctx.fillText('Load Balancing — ' + algoLabel, W/2, 18);

      // Client
      drawRoundedRect(clientX - 24, clientY - 20, 48, 40, 4);
      ctx.fillStyle = '#161b22'; ctx.fill();
      ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#58a6ff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Client', clientX, clientY + 4);

      // LB
      drawRoundedRect(lbX - 30, lbY - 26, 60, 52, 4);
      ctx.fillStyle = '#161b22'; ctx.fill();
      ctx.strokeStyle = '#ffa657'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffa657'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Load', lbX, lbY - 6);
      ctx.fillText('Balancer', lbX, lbY + 6);
      ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace';
      ctx.fillText('L7', lbX, lbY + 18);

      // Lines from LB to servers
      servers.forEach(function(s, i) {
        ctx.beginPath();
        ctx.moveTo(lbX + 30, lbY);
        ctx.lineTo(s.x - 26, s.y);
        ctx.strokeStyle = i === lastRouted ? s.color + 'aa' : '#21262d';
        ctx.lineWidth = i === lastRouted ? 2 : 1;
        ctx.setLineDash(s.healthy ? [] : [4, 4]);
        ctx.stroke(); ctx.setLineDash([]);
      });

      // Line from Client to LB
      ctx.beginPath(); ctx.moveTo(clientX + 24, clientY); ctx.lineTo(lbX - 30, lbY);
      ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1; ctx.stroke();

      // Servers
      servers.forEach(function(s, i) {
        var BW = 88, BH = 48;
        drawRoundedRect(s.x - BW/2, s.y - BH/2, BW, BH, 4);
        ctx.fillStyle = s.healthy ? '#161b22' : '#1a0f0f';
        ctx.fill();
        ctx.strokeStyle = s.healthy ? s.color : '#f8514966';
        ctx.lineWidth = i === lastRouted ? 2.5 : 1.5; ctx.stroke();

        ctx.fillStyle = s.healthy ? s.color : '#f85149';
        ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x, s.y - 10);

        if (!s.healthy) {
          ctx.fillStyle = '#f85149'; ctx.font = 'bold 9px monospace';
          ctx.fillText('UNHEALTHY', s.x, s.y + 2);
        } else {
          // Conn count bar
          ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace';
          ctx.fillText('conns: ' + s.conns, s.x, s.y + 2);
          // Served
          ctx.fillStyle = '#3fb950'; ctx.font = '8px monospace';
          ctx.fillText('served: ' + s.served, s.x, s.y + 14);
        }

        // IP hash indicator
        if (algo === 'iphash' && s.healthy && i === 1) {
          ctx.fillStyle = '#bc8cff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
          ctx.fillText('hash(IP)→', s.x - 55, s.y);
        }
      });

      // Moving packet
      if (packet) {
        var px, py;
        if (packet.phase === 'toLB') {
          px = packet.fromX + packet.prog * (packet.midX - packet.fromX);
          py = packet.fromY + packet.prog * (packet.midY - packet.fromY);
        } else {
          px = packet.midX + packet.prog * (packet.toX - packet.midX);
          py = packet.midY + packet.prog * (packet.toY - packet.midY);
        }
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI*2);
        ctx.fillStyle = packet.color; ctx.fill();
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI*2);
        ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#0d1117'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('Req', px, py + 3);
      }

      // Algo explanation at bottom
      var hint = algo === 'roundrobin' ? 'Cycles S1→S2→S1→S2 (S3 unhealthy, skipped)'
               : algo === 'leastconn' ? 'Routes to server with fewest active connections'
               : 'hash(client IP) → always same server (stable affinity)';
      ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(hint, W/2, H - 8);
    }

    function frame() {
      if (!document.body.contains(canvas)) return;
      if (packet) {
        packet.prog += 0.05;
        if (packet.prog >= 1) {
          if (packet.phase === 'toLB') {
            packet.phase = 'toServer'; packet.prog = 0;
          } else {
            // arrived at server
            packet.target.served++;
            setTimeout(function() { packet.target.conns = Math.max(0, packet.target.conns - 1); packet = null; }, 300);
            packet = null;
          }
        }
      }
      drawScene();
      rafId = requestAnimationFrame(frame);
    }

    sendBtn.addEventListener('click', sendRequest);

    drawScene();
    rafId = requestAnimationFrame(frame);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
