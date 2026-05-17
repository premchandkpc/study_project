(function() {
  var topic = {
  id:"sd-protocols-grpc", area:"sysdesign",
  title:"gRPC, Protobuf & Bidirectional Streaming",
  tag:"Protocols", tags:["grpc","protobuf","streaming","http2","rpc","service mesh"],
  concept:`**gRPC** is a high-performance RPC framework by Google. It uses **Protocol Buffers** (Protobuf) for serialisation and **HTTP/2** for transport.

**Why gRPC over REST+JSON?**
- Protobuf binary is **5-10× smaller** and **6× faster** to serialise than JSON
- HTTP/2 multiplexing — all streams share one connection
- **Strongly typed** contract via .proto files — compile-time checking
- Native **streaming** (4 modes: unary, server-stream, client-stream, bidirectional)
- First-class code generation for 12+ languages

**The 4 RPC modes:**
\`\`\`protobuf
service OrderService {
  // 1. Unary — one request, one response
  rpc GetOrder(OrderRequest) returns (Order);

  // 2. Server streaming — one request, stream of responses
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);

  // 3. Client streaming — stream of requests, one response
  rpc BatchCreate(stream CreateRequest) returns (BatchResult);

  // 4. Bidirectional — both sides stream
  rpc Chat(stream Message) returns (stream Message);
}
\`\`\`

**When to prefer REST:** public APIs (browser clients can't call gRPC natively without grpc-web proxy), simple CRUD, teams unfamiliar with Protobuf.`,
  why:`Microservice-to-microservice communication at scale (Google, Netflix, Uber internal) uses gRPC because the payload savings and streaming modes reduce bandwidth by 10× and latency by 2-3× vs JSON/REST.`,
  example:{
    language:"go",
    code:`// proto definition
// file: order.proto
syntax = "proto3";
service OrderService {
  rpc GetOrder(OrderRequest) returns (Order);
  rpc WatchOrder(OrderRequest) returns (stream OrderEvent);
}
message OrderRequest { string order_id = 1; }
message Order {
  string id = 1;
  string status = 2;
  double total = 3;
}
message OrderEvent { string order_id = 1; string event = 2; }

// ── Go server implementation ──
package main

import (
    "context"
    "time"
    pb "myapp/gen/order"
    "google.golang.org/grpc"
    "net"
)

type server struct{ pb.UnimplementedOrderServiceServer }

func (s *server) GetOrder(ctx context.Context, req *pb.OrderRequest) (*pb.Order, error) {
    return &pb.Order{Id: req.OrderId, Status: "DELIVERED", Total: 99.99}, nil
}

func (s *server) WatchOrder(req *pb.OrderRequest, stream pb.OrderService_WatchOrderServer) error {
    events := []string{"CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"}
    for _, ev := range events {
        if err := stream.Send(&pb.OrderEvent{OrderId: req.OrderId, Event: ev}); err != nil {
            return err
        }
        time.Sleep(500 * time.Millisecond)
    }
    return nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterOrderServiceServer(s, &server{})
    s.Serve(lis)
}`,
    notes:"Run `protoc --go_out=. --go-grpc_out=. order.proto` to generate type-safe client/server stubs."
  },
  interview:[
    {question:"How does Protobuf serialisation achieve smaller payload sizes than JSON?",
     answer:`Protobuf uses field **numbers** (varint-encoded) instead of string field names. Each field is encoded as a tag (field number + wire type) followed by the value — no quotes, no brackets, no whitespace.\n\nExample: \`{"status":"DELIVERED","total":99.99}\` is 34 bytes JSON vs ~10 bytes Protobuf.\n\nAdditionally: integers use variable-length encoding (small numbers = fewer bytes), repeated fields avoid repeated keys, default values are omitted entirely.`,
     followUps:["What happens when you add a new field to a Protobuf schema?","How do you handle Protobuf schema evolution without breaking clients?"]
    },
    {question:"How would you expose a gRPC service to a browser-based frontend?",
     answer:`Browsers can't call gRPC natively (no HTTP/2 trailer support). Options:\n\n1. **grpc-web** — Envoy/nginx proxy translates gRPC-web (HTTP/1.1) → gRPC. Supports unary and server streaming.\n2. **Transcoding** — gRPC-gateway generates a REST+JSON proxy from proto annotations. Same service, two interfaces.\n3. **Connect protocol** — modern alternative (Buf Connect); works natively in browsers without proxy, compatible with gRPC servers.`,
     followUps:["What is the Connect protocol?"]
    }
  ],
  tradeoffs:{
    pros:["5-10× smaller payload vs JSON","HTTP/2 multiplexing — no connection per call","Native streaming — bidirectional is unique to gRPC","Strong typing + codegen eliminates serialisation bugs"],
    cons:["Not human-readable — harder to debug without tooling","Browser support requires proxy (grpc-web)","Protobuf schema management adds overhead","Steeper learning curve than REST"],
    when:"Internal microservice communication, high-throughput data pipelines, streaming use cases. Use REST for public APIs or when browser clients call directly."
  },
  uml:{
    title:"gRPC Order Service — Sequence",
    scenario:"Client gets order then watches live status stream",
    actors:[
      {id:"client",label:"Go Client"},
      {id:"stub",label:"gRPC Stub"},
      {id:"server",label:"OrderService"},
      {id:"db",label:"Database"}
    ],
    messages:[
      {from:"client",to:"stub",label:"GetOrder(id=42)",detail:"Unary call — client blocks until response.",type:"sync"},
      {from:"stub",to:"server",label:"Protobuf frame over HTTP/2",detail:"Binary serialised OrderRequest sent on HTTP/2 stream.",type:"sync"},
      {from:"server",to:"db",label:"SELECT * FROM orders WHERE id=42",detail:"DB lookup for order details.",type:"sync"},
      {from:"db",to:"server",label:"Row result",detail:"Order data returned.",type:"sync"},
      {from:"server",to:"stub",label:"Order{status:DELIVERED}",detail:"Protobuf-serialised Order response.",type:"sync"},
      {from:"stub",to:"client",label:"Decoded Order struct",detail:"Client receives typed Go struct — no JSON parsing.",type:"sync"},
      {from:"client",to:"stub",label:"WatchOrder(id=42)",detail:"Opens server-streaming RPC on new HTTP/2 stream.",type:"async"},
      {from:"server",to:"client",label:"stream: CONFIRMED",detail:"First OrderEvent pushed to client.",type:"async"},
      {from:"server",to:"client",label:"stream: SHIPPED",detail:"Second event pushed asynchronously.",type:"async"},
      {from:"server",to:"client",label:"stream: DELIVERED + EOF",detail:"Final event; server closes stream with trailer.",type:"async"}
    ]
  },
  visual: function(mount) {
    var W = 460, H = 320;

    var modes = [
      {
        id: 'unary', label: 'Unary', color: '#58a6ff',
        desc: 'Client → [req] → Server → [resp] → Client',
        detail: 'One request, one response. Client blocks until reply.',
        arrows: [
          { from: 'client', to: 'server', label: 'Request', dir: 1, stream: false, y: 0 },
          { from: 'server', to: 'client', label: 'Response', dir: -1, stream: false, y: 12, delay: 0.5 }
        ]
      },
      {
        id: 'server', label: 'Server Stream', color: '#3fb950',
        desc: 'Client → [req] → Server → [1,2,3 stream] → Client',
        detail: 'Single request, server pushes multiple responses.',
        arrows: [
          { from: 'client', to: 'server', label: 'Request', dir: 1, stream: false, y: 0 },
          { from: 'server', to: 'client', label: 'Event 1', dir: -1, stream: true, y: 10, delay: 0.4 },
          { from: 'server', to: 'client', label: 'Event 2', dir: -1, stream: true, y: 22, delay: 0.6 },
          { from: 'server', to: 'client', label: 'Event 3', dir: -1, stream: true, y: 34, delay: 0.8 }
        ]
      },
      {
        id: 'client', label: 'Client Stream', color: '#ffa657',
        desc: 'Client → [1,2,3 stream] → Server → [resp] → Client',
        detail: 'Client streams multiple requests, server replies once.',
        arrows: [
          { from: 'client', to: 'server', label: 'Chunk 1', dir: 1, stream: true, y: 0, delay: 0.1 },
          { from: 'client', to: 'server', label: 'Chunk 2', dir: 1, stream: true, y: 12, delay: 0.3 },
          { from: 'client', to: 'server', label: 'Chunk 3', dir: 1, stream: true, y: 24, delay: 0.5 },
          { from: 'server', to: 'client', label: 'Result', dir: -1, stream: false, y: 36, delay: 0.85 }
        ]
      },
      {
        id: 'bidi', label: 'Bidirectional', color: '#bc8cff',
        desc: 'Client ↔ [stream] ↔ Server simultaneously',
        detail: 'Both sides stream simultaneously — e.g. chat.',
        arrows: [
          { from: 'client', to: 'server', label: 'Msg A', dir: 1, stream: true, y: 0, delay: 0.1 },
          { from: 'server', to: 'client', label: 'Msg X', dir: -1, stream: true, y: 10, delay: 0.2 },
          { from: 'client', to: 'server', label: 'Msg B', dir: 1, stream: true, y: 22, delay: 0.4 },
          { from: 'server', to: 'client', label: 'Msg Y', dir: -1, stream: true, y: 32, delay: 0.55 }
        ]
      }
    ];

    var activeMode = 0;
    var dotProgs = []; // progress per arrow in active mode
    var running = false, rafId = null, lastTime = 0;

    function initDots() {
      dotProgs = modes[activeMode].arrows.map(function() { return 0; });
    }
    initDots();

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:8px;justify-content:center;flex-wrap:wrap';

    var btns = modes.map(function(m, i) {
      var b = document.createElement('button');
      b.textContent = m.label;
      b.style.cssText = 'padding:4px 12px;border-radius:6px;border:1px solid #30363d;background:' + (i === 0 ? m.color + '33' : '#21262d') + ';color:' + m.color + ';cursor:pointer;font-size:12px';
      b.addEventListener('click', function() {
        activeMode = i; initDots(); running = false; playBtn.textContent = '▶ Play';
        btns.forEach(function(bb, ii) { bb.style.background = ii === i ? modes[ii].color + '33' : '#21262d'; });
        drawScene();
      });
      ctrl.appendChild(b);
      return b;
    });

    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:4px 12px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    ctrl.appendChild(playBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // Layout: 2×2 grid of panels
    var panels = [
      { x: 5,   y: 5,   w: 220, h: 148 },
      { x: 235, y: 5,   w: 220, h: 148 },
      { x: 5,   y: 160, w: 220, h: 148 },
      { x: 235, y: 160, w: 220, h: 148 }
    ];

    // Per-panel animation state (independent timers)
    var panelAnims = modes.map(function() { return []; });
    modes.forEach(function(m, mi) {
      panelAnims[mi] = m.arrows.map(function() { return 0; });
    });
    var globalT = 0;

    function drawPanel(m, p, anim, isActive) {
      var cx = p.x + p.w / 2;
      var clientX = p.x + 30, serverX = p.x + p.w - 30;
      var midY = p.y + p.h / 2 - 10;

      // Panel border
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(p.x, p.y, p.w, p.h, 6) : ctx.rect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = isActive ? m.color + '11' : '#0d1117';
      ctx.fill();
      ctx.strokeStyle = isActive ? m.color : '#21262d';
      ctx.lineWidth = isActive ? 2 : 1; ctx.stroke();

      // Title
      ctx.fillStyle = m.color; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
      ctx.fillText(m.label, cx, p.y + 14);

      // Proto badge
      ctx.fillStyle = m.color + '22';
      ctx.fillRect(cx - 22, p.y + 18, 44, 11);
      ctx.strokeStyle = m.color + '66'; ctx.lineWidth = 1; ctx.strokeRect(cx - 22, p.y + 18, 44, 11);
      ctx.fillStyle = m.color; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Protobuf', cx, p.y + 26);

      // Client box
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#58a6ff'; ctx.lineWidth = 1;
      ctx.fillRect(clientX - 14, midY - 10, 28, 20);
      ctx.strokeRect(clientX - 14, midY - 10, 28, 20);
      ctx.fillStyle = '#58a6ff'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Client', clientX, midY + 3);

      // Server box
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1;
      ctx.fillRect(serverX - 14, midY - 10, 28, 20);
      ctx.strokeRect(serverX - 14, midY - 10, 28, 20);
      ctx.fillStyle = '#3fb950'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
      ctx.fillText('Server', serverX, midY + 3);

      // Arrows with dots
      m.arrows.forEach(function(arr, ai) {
        var fromX = arr.dir === 1 ? clientX + 14 : serverX - 14;
        var toX   = arr.dir === 1 ? serverX - 14 : clientX + 14;
        var arrowY = midY + arr.y + 20;
        var prog = anim[ai];

        // Arrow track
        ctx.beginPath(); ctx.moveTo(fromX, arrowY); ctx.lineTo(toX, arrowY);
        ctx.strokeStyle = m.color + (arr.stream ? '44' : '33');
        ctx.lineWidth = arr.stream ? 1 : 1.5;
        ctx.setLineDash(arr.stream ? [3, 3] : []); ctx.stroke(); ctx.setLineDash([]);

        // Arrowhead at destination
        var ahX = toX; var ahDir = arr.dir;
        ctx.beginPath();
        ctx.moveTo(ahX, arrowY);
        ctx.lineTo(ahX - ahDir * 6, arrowY - 4);
        ctx.lineTo(ahX - ahDir * 6, arrowY + 4);
        ctx.closePath();
        ctx.fillStyle = m.color + '66'; ctx.fill();

        // Moving dot
        if (prog > 0) {
          var dotX = fromX + prog * (toX - fromX);
          ctx.beginPath(); ctx.arc(dotX, arrowY, 3.5, 0, Math.PI*2);
          ctx.fillStyle = m.color; ctx.fill();
        }

        // Label at midpoint when active
        if (isActive && prog > 0.3 && prog < 0.95) {
          var lx = fromX + 0.5 * (toX - fromX);
          ctx.fillStyle = m.color; ctx.font = '8px monospace'; ctx.textAlign = 'center';
          ctx.fillText(arr.label, lx, arrowY - 5);
        }
      });

      // Description at bottom
      if (isActive) {
        ctx.fillStyle = '#e6edf3'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        var words = m.detail; ctx.fillText(words, cx, p.y + p.h - 8);
      }
    }

    function drawScene() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);
      modes.forEach(function(m, mi) {
        drawPanel(m, panels[mi], panelAnims[mi], mi === activeMode);
      });
    }

    function frame(ts) {
      if (!document.body.contains(canvas)) return;
      var dt = ts - lastTime; lastTime = ts;
      if (running) {
        globalT += dt * 0.001;
        // Animate all panels independently
        modes.forEach(function(m, mi) {
          m.arrows.forEach(function(arr, ai) {
            var startT = arr.delay || 0;
            if (globalT > startT) {
              panelAnims[mi][ai] = Math.min(1, (globalT - startT) * 0.7);
            }
          });
        });
        // Auto reset
        var allDone = modes.every(function(m, mi) {
          return m.arrows.every(function(arr, ai) { return panelAnims[mi][ai] >= 1; });
        });
        if (allDone) {
          setTimeout(function() {
            globalT = 0;
            modes.forEach(function(m, mi) { panelAnims[mi] = m.arrows.map(function() { return 0; }); });
          }, 600);
        }
      }
      drawScene();
      rafId = requestAnimationFrame(frame);
    }

    playBtn.addEventListener('click', function() {
      if (running) { running = false; playBtn.textContent = '▶ Play'; }
      else {
        globalT = 0;
        modes.forEach(function(m, mi) { panelAnims[mi] = m.arrows.map(function() { return 0; }); });
        running = true; playBtn.textContent = '⏸ Pause';
        if (!rafId) rafId = requestAnimationFrame(function(ts) { lastTime = ts; frame(ts); });
      }
    });

    drawScene();
    rafId = requestAnimationFrame(function(ts) { lastTime = ts; frame(ts); });
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
