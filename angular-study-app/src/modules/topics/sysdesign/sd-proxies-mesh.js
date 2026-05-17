(function() {
  var topic = {
  id:"sd-proxies-mesh", area:"sysdesign",
  title:"Reverse Proxy, Service Mesh & Sidecar Pattern",
  tag:"Infrastructure", tags:["reverse proxy","service mesh","istio","linkerd","envoy","sidecar","mtls","xds"],
  concept:`**Reverse proxy:** sits between clients and servers; clients talk to the proxy, not directly to servers. Provides: load balancing, SSL termination, caching, compression, DDoS mitigation.

**Forward proxy:** sits between client and internet; client explicitly uses it (VPN, corporate firewall). Clients know they're going through a proxy.

**Service mesh:** a dedicated infrastructure layer for service-to-service communication. Implemented as **sidecar proxies** co-located with every service instance.

**Sidecar pattern:**
\`\`\`
[Service Pod]
  ├── App container (your code)
  └── Envoy sidecar (auto-injected by Istio)
         ├── mTLS between all services
         ├── Distributed tracing (Jaeger headers)
         ├── Circuit breaking
         ├── Retries + timeouts
         ├── Traffic shaping (canary, A/B)
         └── Telemetry (metrics to Prometheus)
\`\`\`

**Control plane vs data plane:**
- **Data plane** — Envoy sidecars; handle actual traffic
- **Control plane** — Istiod; pushes config to sidecars via xDS API (no restart needed)

**Popular service meshes:** Istio (Envoy), Linkerd (micro-proxy, Rust), Consul Connect, AWS App Mesh.`,
  why:`At 50+ microservices, implementing mTLS and observability per-service is untenable. Service mesh moves this to infrastructure, giving you a uniform security and observability baseline for free.`,
  example:{
    language:"yaml",
    code:`# Istio VirtualService — traffic splitting for canary deploy
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts: ["order-service"]
  http:
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: order-service
            subset: v2          # canary: 100% of x-canary traffic
    - route:
        - destination:
            host: order-service
            subset: v1
          weight: 95            # stable: 95%
        - destination:
            host: order-service
            subset: v2
          weight: 5             # canary: 5% of baseline traffic

---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: order-service
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s    # circuit breaker at mesh level
  subsets:
    - name: v1
      labels: { version: v1 }
    - name: v2
      labels: { version: v2 }`,
    notes:"DestinationRule outlierDetection is a mesh-level circuit breaker — automatically ejects hosts returning 5xx errors."
  },
  interview:[
    {question:"What problems does a service mesh solve that an API gateway doesn't?",
     answer:`API Gateway handles **north-south** traffic (client → cluster). Service mesh handles **east-west** traffic (service → service).\n\nService mesh provides:\n- **mTLS everywhere** — all internal traffic encrypted and mutually authenticated without code changes\n- **Uniform observability** — traces/metrics for every internal call, not just edge\n- **Traffic policies** — retries, timeouts, circuit breaking at infra level\n- **Zero-trust networking** — services can only call what their policy allows\n\nYou typically need both: API Gateway for the edge, service mesh for internal communication.`,
     followUps:["What is mTLS and how does it differ from regular TLS?","How does Istio inject sidecars automatically?"]
    }
  ],
  tradeoffs:{
    pros:["Uniform mTLS without app code changes","Traffic shaping (canary, A/B) without redeployments","Centralized observability for all service calls"],
    cons:["Sidecar adds ~10ms latency + ~50MB RAM per pod","Complex control plane (Istio is notorious for steep learning curve)","Debug difficulty — two network hops instead of one"],
    when:"Use service mesh at 20+ microservices or when compliance requires encrypted internal traffic. For simpler setups, use direct service calls with app-level circuit breaking (Resilience4j, go-resilience)."
  },
  visual: function(mount) {
    mount.innerHTML='';
    var W=460,H=320;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    canvas.style.cssText='width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='text-align:center;margin-bottom:8px;display:flex;gap:8px;justify-content:center';
    function mkBtn(t){
      var b=document.createElement('button');
      b.textContent=t;
      b.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
      return b;
    }
    var btnFwd=mkBtn('Forward Proxy');
    var btnRev=mkBtn('Reverse Proxy');
    var btnMesh=mkBtn('Service Mesh');
    btnRow.appendChild(btnFwd); btnRow.appendChild(btnRev); btnRow.appendChild(btnMesh);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    var mode='forward';
    var dot={active:false,x:0,y:0,tx:0,ty:0,progress:0,color:'#fff'};
    var dotChain=[];
    var chainIdx=0;
    var animating=false;

    function drawRR(x,y,w,h,r,fill,stroke){
      ctx.beginPath();
      ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
    }

    function drawLine(x1,y1,x2,y2,color,dash){
      ctx.save();
      if(dash)ctx.setLineDash(dash);
      ctx.strokeStyle=color;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      ctx.restore();
    }

    function drawArrow(x1,y1,x2,y2,color){
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      var a=Math.atan2(y2-y1,x2-x1);
      ctx.fillStyle=color;ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-7*Math.cos(a-0.4),y2-7*Math.sin(a-0.4));
      ctx.lineTo(x2-7*Math.cos(a+0.4),y2-7*Math.sin(a+0.4));
      ctx.closePath();ctx.fill();ctx.restore();
    }

    function bx(x,y,w,h,fill,border,text,sub){
      drawRR(x,y,w,h,5,fill,border);
      ctx.fillStyle='#e6edf3';ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText(text,x+w/2,y+h/2+(sub?-2:4));
      if(sub){ctx.fillStyle='#8b949e';ctx.font='8px monospace';ctx.fillText(sub,x+w/2,y+h/2+10);}
    }

    function lbl(t,x,y,c,s){
      ctx.fillStyle=c||'#8b949e';ctx.font=(s||9)+'px monospace';ctx.textAlign='center';
      ctx.fillText(t,x,y);
    }

    function drawForward(){
      // Client → [Proxy] → Internet/Server
      bx(20,130,80,30,'#161b22','#58a6ff','Client','Corporate');
      bx(185,130,90,30,'#161b22','#ffa657','[Proxy]','Forward');
      bx(360,130,80,30,'#161b22','#3fb950','Internet','Server');
      drawArrow(100,145,185,145,'#8b949e');
      drawArrow(275,145,360,145,'#8b949e');
      // IP hidden label
      ctx.fillStyle='#f85149';ctx.font='8px monospace';ctx.textAlign='center';
      ctx.fillText('Client IP hidden from server',230,120);
      ctx.fillStyle='#3fb950';ctx.font='8px monospace';
      ctx.fillText('Use: corporate network, VPN, censorship bypass',W/2,175);
      lbl('Forward Proxy',W/2,H-20,'#ffa657',11);
      lbl('Client explicitly routes through proxy → hides client identity',W/2,H-8,'#8b949e',9);
    }

    function drawReverse(){
      // Clients → [Nginx/LB] → Server1,2,3
      bx(10,100,60,24,'#161b22','#58a6ff','Client 1','');
      bx(10,140,60,24,'#161b22','#58a6ff','Client 2','');
      bx(10,180,60,24,'#161b22','#58a6ff','Client 3','');
      bx(175,120,100,40,'#161b22','#ffa657','Nginx / LB','Reverse Proxy');
      bx(340,90,90,24,'#161b22','#3fb950','Server 1','');
      bx(340,130,90,24,'#161b22','#3fb950','Server 2','');
      bx(340,170,90,24,'#161b22','#3fb950','Server 3','');
      [112,152,192].forEach(function(y){drawArrow(70,y,175,140,'#8b949e');});
      [102,142,182].forEach(function(y){drawArrow(275,140,340,y,'#8b949e');});
      ctx.fillStyle='#f85149';ctx.font='8px monospace';ctx.textAlign='center';
      ctx.fillText('Server IPs hidden',W/2,88);
      ctx.fillStyle='#bc8cff';ctx.font='8px monospace';
      ctx.fillText('SSL Termination @ proxy',W/2,208);
      lbl('Reverse Proxy',W/2,H-20,'#ffa657',11);
      lbl('Clients only see proxy — hides backend topology',W/2,H-8,'#8b949e',9);
    }

    function drawMesh(){
      // Service A [+Envoy] ←mTLS→ Service B [+Envoy]
      // Istiod (control plane) dotted → both sidecars
      var podAx=20,podBx=300;
      // Pod A
      drawRR(podAx,60,160,100,6,'#0d1117','#3fb950');
      lbl('Service A Pod',podAx+80,58,'#3fb950',8);
      bx(podAx+8,72,80,30,'#161b22','#3fb950','App A','service code');
      bx(podAx+8,112,80,24,'#161b22','#ffa657','Envoy','sidecar');
      // Pod B
      drawRR(podBx,60,160,100,6,'#0d1117','#58a6ff');
      lbl('Service B Pod',podBx+80,58,'#58a6ff',8);
      bx(podBx+8,72,80,30,'#161b22','#58a6ff','App B','service code');
      bx(podBx+8,112,80,24,'#161b22','#ffa657','Envoy','sidecar');
      // mTLS arrow between sidecars
      ctx.save();ctx.strokeStyle='#bc8cff';ctx.lineWidth=2;
      ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(podAx+88,124);ctx.lineTo(podBx+8,124);ctx.stroke();
      ctx.restore();
      lbl('mTLS',W/2,118,'#bc8cff',10);
      // tracing label
      lbl('+ tracing headers',W/2,133,'#8b949e',8);
      // Istiod
      bx(175,200,110,28,'#161b22','#bc8cff','Istiod','Control Plane');
      drawLine(230,200,podAx+48,136,'#bc8cff',[3,4]);
      drawLine(230,200,podBx+48,136,'#bc8cff',[3,4]);
      lbl('xDS config push',180,190,'#8b949e',8);
      lbl('Service Mesh (Istio)',W/2,H-20,'#bc8cff',11);
      lbl('All traffic intercepted by sidecars — mTLS + tracing for free',W/2,H-8,'#8b949e',9);
    }

    function draw(){
      if(!document.body.contains(canvas))return;
      ctx.clearRect(0,0,W,H);ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);
      if(mode==='forward') drawForward();
      else if(mode==='reverse') drawReverse();
      else drawMesh();

      // dot
      if(dot.active){
        var px=dot.x+(dot.tx-dot.x)*dot.progress;
        var py=dot.y+(dot.ty-dot.y)*dot.progress;
        ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);
        ctx.fillStyle=dot.color;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      }
    }

    function animateChain(chain,onDone){
      chainIdx=0;
      function next(){
        if(chainIdx>=chain.length){dot.active=false;animating=false;draw();if(onDone)onDone();return;}
        var c=chain[chainIdx];
        dot.active=true;dot.x=c.x1;dot.y=c.y1;dot.tx=c.x2;dot.ty=c.y2;dot.progress=0;dot.color=c.color||'#ffa657';
        chainIdx++;
        function tick(){
          if(!document.body.contains(canvas))return;
          dot.progress+=0.05;draw();
          if(dot.progress<1)requestAnimationFrame(tick);
          else{dot.progress=1;draw();setTimeout(next,200);}
        }
        requestAnimationFrame(tick);
      }
      next();
    }

    canvas.addEventListener('click',function(){
      if(animating)return;
      animating=true;
      if(mode==='forward'){
        animateChain([
          {x1:100,y1:145,x2:185,y2:145,color:'#58a6ff'},
          {x1:275,y1:145,x2:360,y2:145,color:'#ffa657'},
          {x1:360,y1:148,x2:275,y2:148,color:'#3fb950'},
          {x1:185,y1:148,x2:100,y2:148,color:'#58a6ff'}
        ]);
      } else if(mode==='reverse'){
        var startY=[112,152,192][Math.floor(Math.random()*3)];
        animateChain([
          {x1:70,y1:startY,x2:175,y2:140,color:'#58a6ff'},
          {x1:275,y1:140,x2:340,y2:102+Math.floor(Math.random()*3)*40,color:'#3fb950'}
        ]);
      } else {
        animateChain([
          {x1:28+80,y1:87,x2:28+8,y2:124,color:'#3fb950'},
          {x1:28+88,y1:124,x2:308+8,y2:124,color:'#bc8cff'},
          {x1:308+8,y1:124,x2:308+48,y2:87,color:'#58a6ff'}
        ]);
      }
    });

    btnFwd.onclick=function(){mode='forward';dot.active=false;animating=false;draw();};
    btnRev.onclick=function(){mode='reverse';dot.active=false;animating=false;draw();};
    btnMesh.onclick=function(){mode='mesh';dot.active=false;animating=false;draw();};
    draw();

    // hint text
    ctx.fillStyle='#8b949e';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText('Click canvas to animate packet flow',W/2,H/2+60);
  },
  architecture:{
    title:"Service Mesh — Sidecar Architecture",
    caption:"Envoy sidecars intercept all traffic; Istiod pushes config via xDS",
    lanes:[
      {label:"Control Plane",nodes:[
        {id:"istiod",label:"Istiod",badge:"Istio",hint:"xDS config server",detail:"Istiod is the Istio control plane. It pushes Envoy configuration (routes, clusters, listeners) to all sidecars via xDS API. No traffic flows through it."},
        {id:"kube-api",label:"Kubernetes API",hint:"Service/Endpoint discovery",detail:"Istiod watches K8s Service and Endpoint resources to build its service registry."}
      ]},
      {label:"Service A Pod",nodes:[
        {id:"app-a",label:"App A",hint:"Your service code",detail:"Makes an outbound call to Service B. Doesn't know about mTLS or retries — Envoy handles it transparently."},
        {id:"envoy-a",label:"Envoy Sidecar A",hint:"Intercepts all traffic",detail:"Envoy iptables rules redirect all traffic through sidecar. Adds mTLS, traces, retries before forwarding."}
      ]},
      {label:"Service B Pod",nodes:[
        {id:"envoy-b",label:"Envoy Sidecar B",hint:"Terminates mTLS",detail:"Receives mTLS connection from Envoy A. Verifies certificate, decrypts, forwards to App B on localhost."},
        {id:"app-b",label:"App B",hint:"Receives plain HTTP",detail:"App B sees plain HTTP on localhost — no TLS handling required in application code."}
      ]},
      {label:"Observability",nodes:[
        {id:"prometheus",label:"Prometheus",hint:"Metrics scrape",detail:"Each Envoy sidecar exposes /metrics. Prometheus scrapes all sidecars for RED metrics (Rate, Errors, Duration)."},
        {id:"jaeger",label:"Jaeger",hint:"Distributed traces",detail:"Envoy propagates trace headers (B3/W3C). Jaeger collects and visualizes end-to-end request traces."}
      ]}
    ],
    links:[
      {from:"istiod",to:"envoy-a",label:"xDS config push",detail:"Routes, cluster endpoints, TLS certs pushed to Envoy A without restart.",type:"async"},
      {from:"app-a",to:"envoy-a",label:"HTTP (iptables redirect)",detail:"iptables rules transparently redirect app traffic to Envoy sidecar.",type:"sync"},
      {from:"envoy-a",to:"envoy-b",label:"mTLS over TCP",detail:"Envoy A wraps request in mTLS using cert from Istiod. Mutual authentication.",type:"sync"},
      {from:"envoy-b",to:"app-b",label:"Plain HTTP (localhost)",detail:"Envoy B decrypts and forwards to app on 127.0.0.1.",type:"sync"},
      {from:"envoy-a",to:"prometheus",label:"Metrics",detail:"REQUEST_TOTAL, REQUEST_DURATION histograms per route.",type:"async"},
      {from:"envoy-b",to:"jaeger",label:"Trace spans",detail:"Each request creates a span with upstream/downstream timing.",type:"async"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
