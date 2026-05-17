(function() {
  var topic = {
  id:"sd-protocols-http", area:"sysdesign",
  title:"HTTP 1.1 / 2 / 3, WebSocket & SSE",
  tag:"Protocols", tags:["http2","http3","quic","websocket","sse","long-polling","hol blocking"],
  concept:`**HTTP/1.1** (1997): text protocol, one request per connection (keep-alive allows reuse but still serial). Head-of-line (HOL) blocking at application layer.

**HTTP/2** (2015): binary framing, **multiplexing** (multiple streams on one TCP connection), header compression (HPACK), server push. Eliminates app-layer HOL but TCP-layer HOL remains.

**HTTP/3** (2022): runs on **QUIC** (UDP-based), eliminates TCP HOL blocking. Built-in TLS 1.3. Connection migration (IP change doesn't break session — great for mobile).

**Comparison table:**
| Feature | HTTP/1.1 | HTTP/2 | HTTP/3 |
|---|---|---|---|
| Protocol | TCP | TCP | QUIC (UDP) |
| Multiplexing | No | Yes | Yes |
| HOL Blocking | App + TCP | TCP only | None |
| Header compression | None | HPACK | QPACK |
| TLS | Optional | Optional | Built-in |
| 0-RTT resumption | No | No | Yes |

**Real-time communication options:**
- **Short polling**: client polls every N seconds — simple, wastes bandwidth
- **Long polling**: client holds connection open until server has data — better but complex
- **SSE** (Server-Sent Events): unidirectional server→client stream over HTTP, built-in reconnect, text only
- **WebSocket**: full-duplex binary/text, single TCP upgrade, low overhead per message`,
  why:`Protocol choice affects throughput, latency, and infrastructure cost at scale. HTTP/2 multiplexing removes the need for domain sharding. WebSocket vs SSE is a common interview design question.`,
  example:{
    language:"go",
    code:`// SSE server in Go — push live updates to browser
package main

import (
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "SSE unsupported", http.StatusInternalServerError)
        return
    }

    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case t := <-ticker.C:
            fmt.Fprintf(w, "data: {\"time\":\"%s\"}\\n\\n", t.Format(time.RFC3339))
            flusher.Flush()
        case <-r.Context().Done():
            return // client disconnected
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":8080", nil)
}`,
    notes:"SSE auto-reconnects on disconnect; browser EventSource API handles this natively. Use WebSocket only when you need client→server messages."
  },
  interview:[
    {question:"When would you choose WebSocket over SSE?",
     answer:`**Use SSE when:** data flows only server → client (live dashboards, notifications, feeds). Simpler, works over HTTP/2, proxy-friendly, built-in reconnect.\n\n**Use WebSocket when:** you need bidirectional communication (chat, multiplayer games, collaborative editing, trading terminals). WebSocket is a TCP upgrade so it escapes HTTP semantics but also loses HTTP/2 multiplexing benefits.\n\n**At scale:** SSE is easier to load-balance (stateless HTTP); WebSocket requires sticky sessions or a pub-sub backplane (Redis pub-sub, Kafka) so any server can push to any client.`,
     followUps:["How do you scale WebSocket servers?","What is the WebSocket ping/pong mechanism?"]
    },
    {question:"What is HOL blocking and how does HTTP/3 solve it?",
     answer:`Head-of-line blocking: if packet N is lost on a TCP connection, all subsequent packets wait for retransmission even if they belong to independent streams. HTTP/2 multiplexes on one TCP connection — a single packet loss stalls all streams.\n\nHTTP/3 uses QUIC (UDP) which implements streams at the transport layer. A lost packet only blocks the single stream that owns it; other streams continue unaffected. Additionally QUIC has built-in TLS 1.3 and supports connection migration (changing IP mid-connection).`,
     followUps:["Why is HTTP/3 especially beneficial on mobile networks?"]
    }
  ],
  tradeoffs:{
    pros:["HTTP/2 multiplexing eliminates connection-count limits","HTTP/3 QUIC reduces latency on lossy networks","SSE is simplest for server-push use cases"],
    cons:["HTTP/3 not supported by all infrastructure/proxies yet","WebSocket breaks some CDN/proxy setups","SSE is text-only and unidirectional"],
    when:"Default to HTTP/2 for REST APIs. HTTP/3 for user-facing products. SSE for live feeds. WebSocket for true bidirectional needs."
  },
  architecture:{
    title:"Protocol Comparison — Architecture View",
    caption:"Choose the right transport for each use case",
    lanes:[
      {label:"Client",nodes:[
        {id:"browser-c",label:"Browser / App",hint:"Initiates all connections"},
        {id:"mobile-c",label:"Mobile Client",hint:"Benefits most from QUIC (lossy networks)"}
      ]},
      {label:"Transport",nodes:[
        {id:"http11",label:"HTTP/1.1",badge:"TCP",hint:"Serial, text-based",detail:"One request at a time per connection. Keep-alive reuses TCP but still serial. 6 parallel connections per origin in browsers."},
        {id:"http2",label:"HTTP/2",badge:"TCP",hint:"Multiplexed, binary",detail:"Multiple streams on one TCP. HPACK header compression. Server push. TCP HOL blocking still exists."},
        {id:"http3",label:"HTTP/3",badge:"QUIC",hint:"No HOL blocking",detail:"QUIC over UDP. Built-in TLS 1.3. Per-stream loss recovery. Connection migration for mobile."},
        {id:"ws",label:"WebSocket",badge:"TCP",hint:"Full-duplex upgrade",detail:"Single TCP connection upgraded from HTTP. Low per-message overhead. Needs sticky sessions or pub-sub backplane for scale."},
        {id:"sse",label:"SSE",badge:"HTTP",hint:"Server→client stream",detail:"Chunked HTTP response, text/event-stream. Browser EventSource auto-reconnects. Works through HTTP/2 proxies."}
      ]},
      {label:"Use Cases",nodes:[
        {id:"uc-rest",label:"REST APIs",hint:"HTTP/1.1 or HTTP/2"},
        {id:"uc-video",label:"Video Streaming",hint:"HTTP/3 / DASH / HLS"},
        {id:"uc-chat",label:"Chat / Games",hint:"WebSocket"},
        {id:"uc-feed",label:"Live Feeds / Alerts",hint:"SSE"}
      ]}
    ],
    links:[
      {from:"http2",to:"uc-rest",label:"Best for REST",detail:"Multiplexing eliminates domain sharding hacks."},
      {from:"http3",to:"uc-video",label:"Best for streaming",detail:"No HOL blocking crucial for video segment delivery."},
      {from:"ws",to:"uc-chat",label:"Bidirectional",detail:"Chat requires client→server messages; SSE is unidirectional."},
      {from:"sse",to:"uc-feed",label:"Server push only",detail:"Live dashboards, notifications — no client messages needed."}
    ]
  },
  visual: function(mount) {
    var W = 460, H = 320;

    var rows = [
      {
        label: 'HTTP/1.1', badge: 'TCP', color: '#f85149',
        sublabel: 'Sequential · HOL Blocking',
        streams: 3, parallel: false, extraBadge: null
      },
      {
        label: 'HTTP/2', badge: 'TCP', color: '#58a6ff',
        sublabel: 'Multiplexed Streams · HPACK',
        streams: 3, parallel: true, extraBadge: 'HPACK'
      },
      {
        label: 'HTTP/3', badge: 'QUIC/UDP', color: '#3fb950',
        sublabel: 'QUIC (UDP) · 0-RTT · No HOL Block',
        streams: 3, parallel: true, extraBadge: '0-RTT'
      }
    ];

    var ctrl = document.createElement('div');
    ctrl.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;justify-content:center';
    var playBtn = document.createElement('button');
    playBtn.textContent = '▶ Play';
    playBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:13px';
    var resetBtn = document.createElement('button');
    resetBtn.textContent = '↺ Reset';
    resetBtn.style.cssText = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:13px';
    ctrl.appendChild(playBtn); ctrl.appendChild(resetBtn);
    mount.appendChild(ctrl);

    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var ROW_H = 78, ROW_START_Y = 28;
    var LABEL_W = 100, PIPE_X = 108, PIPE_W = 310;
    // Each row: 3 packets as dots animating left to right
    // HTTP/1.1: sequential (one at a time, each waits)
    // HTTP/2 & /3: parallel (all 3 at same time)

    // packet state: progress 0..1 per packet
    var packets = rows.map(function(row) {
      return [0, 0, 0];
    });
    var running = false, rafId = null;

    function drawScene() {
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      // title
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
      ctx.fillText('HTTP Protocol Comparison', W/2, 18);

      rows.forEach(function(row, ri) {
        var baseY = ROW_START_Y + ri * ROW_H + 14;

        // Row background
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(4, baseY - 6, W - 8, ROW_H - 8, 6)
                      : ctx.rect(4, baseY - 6, W - 8, ROW_H - 8);
        ctx.fillStyle = '#0d1117';
        ctx.strokeStyle = row.color + '44'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();

        // Protocol label
        ctx.fillStyle = row.color; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'left';
        ctx.fillText(row.label, 10, baseY + 8);

        // Badge
        ctx.fillStyle = row.color + '33';
        ctx.fillRect(10, baseY + 14, 72, 14);
        ctx.strokeStyle = row.color + '88'; ctx.lineWidth = 1; ctx.strokeRect(10, baseY + 14, 72, 14);
        ctx.fillStyle = row.color; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        ctx.fillText(row.badge, 46, baseY + 23);

        // Sub label
        ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
        ctx.fillText(row.sublabel, 10, baseY + 40);

        // Extra badge
        if (row.extraBadge) {
          ctx.fillStyle = row.color + '22';
          ctx.fillRect(10, baseY + 46, 48, 13);
          ctx.strokeStyle = row.color + '66'; ctx.lineWidth = 1; ctx.strokeRect(10, baseY + 46, 48, 13);
          ctx.fillStyle = row.color; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
          ctx.fillText(row.extraBadge, 34, baseY + 56);
        }

        // Pipeline track
        var trackY = baseY + 26;
        ctx.beginPath(); ctx.moveTo(PIPE_X, trackY);
        ctx.lineTo(PIPE_X + PIPE_W, trackY);
        ctx.strokeStyle = '#21262d'; ctx.lineWidth = 2; ctx.stroke();

        // Pipe start/end markers
        ctx.fillStyle = '#30363d';
        ctx.fillRect(PIPE_X - 4, trackY - 6, 6, 12);
        ctx.fillRect(PIPE_X + PIPE_W - 2, trackY - 6, 6, 12);
        ctx.fillStyle = '#58a6ff'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
        ctx.fillText('C', PIPE_X - 1, trackY + 3);
        ctx.fillStyle = '#3fb950';
        ctx.fillText('S', PIPE_X + PIPE_W + 1, trackY + 3);

        // Packets
        var pktColors = [row.color, row.color + 'cc', row.color + '88'];
        packets[ri].forEach(function(prog, pi) {
          if (prog <= 0) return;
          var px = PIPE_X + prog * PIPE_W;
          var py = trackY + (row.parallel ? (pi - 1) * 8 : 0);
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
          ctx.fillStyle = pktColors[pi]; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
          ctx.strokeStyle = '#e6edf3'; ctx.lineWidth = 1; ctx.stroke();
          // label
          ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
          ctx.fillText('R' + (pi+1), px, py + 2.5);
        });

        // HOL blocking annotation for HTTP/1.1
        if (ri === 0 && packets[0][0] > 0 && packets[0][0] < 1) {
          ctx.fillStyle = '#f8514988';
          ctx.font = '8px monospace'; ctx.textAlign = 'center';
          ctx.fillText('⛔ R2, R3 blocked', PIPE_X + PIPE_W/2, trackY + 18);
        }
      });

      // Legend
      ctx.fillStyle = '#8b949e'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
      ctx.fillText('C = Client  S = Server  R1/R2/R3 = 3 concurrent requests', W/2, H - 8);
    }

    var speed11 = 0.004, speed2 = 0.006, speed3 = 0.009;

    function frame() {
      if (!document.body.contains(canvas)) return;

      // HTTP/1.1: sequential — R2 starts only when R1 done, R3 when R2 done
      packets[0][0] = Math.min(1, packets[0][0] + speed11);
      if (packets[0][0] >= 1) packets[0][1] = Math.min(1, packets[0][1] + speed11);
      if (packets[0][1] >= 1) packets[0][2] = Math.min(1, packets[0][2] + speed11);

      // HTTP/2: all 3 in parallel
      for (var i = 0; i < 3; i++) packets[1][i] = Math.min(1, packets[1][i] + speed2);

      // HTTP/3: all 3 in parallel, faster
      for (var j = 0; j < 3; j++) packets[2][j] = Math.min(1, packets[2][j] + speed3);

      drawScene();

      if (running) {
        // auto-reset when all done
        var allDone = packets[2][2] >= 1;
        if (allDone) {
          setTimeout(function() {
            packets = rows.map(function() { return [0,0,0]; });
          }, 800);
        }
        rafId = requestAnimationFrame(frame);
      } else {
        rafId = requestAnimationFrame(frame);
      }
    }

    playBtn.addEventListener('click', function() {
      if (running) { running = false; playBtn.textContent = '▶ Play'; }
      else { running = true; playBtn.textContent = '⏸ Pause'; if (!rafId) rafId = requestAnimationFrame(frame); }
    });

    resetBtn.addEventListener('click', function() {
      running = false; playBtn.textContent = '▶ Play';
      packets = rows.map(function() { return [0,0,0]; });
      drawScene();
    });

    drawScene();
    rafId = requestAnimationFrame(frame);
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
