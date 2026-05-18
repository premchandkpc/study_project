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
    why:"Protocol choice affects throughput, latency, and infrastructure cost at scale. HTTP/2 multiplexing removes the need for domain sharding. WebSocket vs SSE is a common interview design question.",
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
            fmt.Fprintf(w, "data: {\\"time\\":\\"%s\\"}\\\\n\\\\n", t.Format(time.RFC3339))
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
        answer:"**Use SSE when:** data flows only server → client (live dashboards, notifications, feeds). Simpler, works over HTTP/2, proxy-friendly, built-in reconnect.\n\n**Use WebSocket when:** you need bidirectional communication (chat, multiplayer games, collaborative editing, trading terminals). WebSocket is a TCP upgrade so it escapes HTTP semantics but also loses HTTP/2 multiplexing benefits.\n\n**At scale:** SSE is easier to load-balance (stateless HTTP); WebSocket requires sticky sessions or a pub-sub backplane (Redis pub-sub, Kafka) so any server can push to any client.",
        followUps:["How do you scale WebSocket servers?","What is the WebSocket ping/pong mechanism?"]
      },
      {question:"What is HOL blocking and how does HTTP/3 solve it?",
        answer:"Head-of-line blocking: if packet N is lost on a TCP connection, all subsequent packets wait for retransmission even if they belong to independent streams. HTTP/2 multiplexes on one TCP connection — a single packet loss stalls all streams.\n\nHTTP/3 uses QUIC (UDP) which implements streams at the transport layer. A lost packet only blocks the single stream that owns it; other streams continue unaffected. Additionally QUIC has built-in TLS 1.3 and supports connection migration (changing IP mid-connection).",
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
    visual: {
      type: "swimlane",
      title: "HTTP Protocol Comparison",
      lanes: [
        {
          id: "http11",
          label: "HTTP/1.1",
          color: "#f85149",
          badge: "Sequential · HOL Blocking",
          description: "One request at a time per TCP connection. R2 and R3 blocked until R1 completes.",
          nodes: [
            { id: "req1",  label: "Request 1" },
            { id: "resp1", label: "Response 1" },
            { id: "req2",  label: "Request 2" },
            { id: "resp2", label: "Response 2" }
          ]
        },
        {
          id: "http2",
          label: "HTTP/2",
          color: "#58a6ff",
          badge: "Multiplexed Streams · HPACK",
          description: "Multiple streams on one TCP connection. Header compression with HPACK. TCP HOL still exists.",
          nodes: [
            { id: "r1", label: "Stream 1" },
            { id: "r2", label: "Stream 2" },
            { id: "r3", label: "Stream 3" }
          ]
        },
        {
          id: "http3",
          label: "HTTP/3",
          color: "#3fb950",
          badge: "QUIC (UDP) · 0-RTT · No HOL Block",
          description: "QUIC over UDP. Per-stream loss recovery — a lost packet only blocks its own stream. Built-in TLS 1.3.",
          nodes: [
            { id: "q1", label: "Stream 1" },
            { id: "q2", label: "Stream 2" },
            { id: "q3", label: "Stream 3" }
          ]
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
