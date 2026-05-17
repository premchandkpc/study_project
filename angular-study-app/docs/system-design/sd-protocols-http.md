# HTTP 1.1 / 2 / 3, WebSocket & SSE

Source: `src/modules/topics/sysdesign/sd-protocols-http.js`
Tag: `Protocols`
Doc path: `docs/system-design/sd-protocols-http.md`

## Concept
**HTTP/1.1** (1997): text protocol, one request per connection (keep-alive allows reuse but still serial). Head-of-line (HOL) blocking at application layer.

**HTTP/2** (2015): binary framing, **multiplexing** (multiple streams on one TCP connection), header compression (HPACK), server push. Eliminates app-layer HOL but TCP-layer HOL remains.

**HTTP/3** (2022): runs on **QUIC** (UDP-based), eliminates TCP HOL blocking. Built-in TLS 1.3. Connection migration (IP change doesn't break session - great for mobile).

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
- **Short polling**: client polls every N seconds - simple, wastes bandwidth
- **Long polling**: client holds connection open until server has data - better but complex
- **SSE** (Server-Sent Events): unidirectional server->client stream over HTTP, built-in reconnect, text only
- **WebSocket**: full-duplex binary/text, single TCP upgrade, low overhead per message

## Production Architecture
Protocol choice affects throughput, latency, and infrastructure cost at scale. HTTP/2 multiplexing removes the need for domain sharding. WebSocket vs SSE is a common interview design question.

## Architecture Checklist
- Client / Browser / App: Initiates all connections
- Client / Mobile Client: Benefits most from QUIC (lossy networks)
- Transport / HTTP/1.1: One request at a time per connection. Keep-alive reuses TCP but still serial. 6 parallel connections per origin in browsers.
- Transport / HTTP/2: Multiple streams on one TCP. HPACK header compression. Server push. TCP HOL blocking still exists.
- Transport / HTTP/3: QUIC over UDP. Built-in TLS 1.3. Per-stream loss recovery. Connection migration for mobile.
- Transport / WebSocket: Single TCP connection upgraded from HTTP. Low per-message overhead. Needs sticky sessions or pub-sub backplane for scale.
- Transport / SSE: Chunked HTTP response, text/event-stream. Browser EventSource auto-reconnects. Works through HTTP/2 proxies.
- Use Cases / REST APIs: HTTP/1.1 or HTTP/2
- Use Cases / Video Streaming: HTTP/3 / DASH / HLS
- Use Cases / Chat / Games: WebSocket
- Use Cases / Live Feeds / Alerts: SSE

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Client"]
    browser_c["Browser / App"]
    mobile_c["Mobile Client"]
  end
  subgraph lane_1["Transport"]
    http11["HTTP/1.1"]
    http2["HTTP/2"]
    http3["HTTP/3"]
    ws["WebSocket"]
    sse["SSE"]
  end
  subgraph lane_2["Use Cases"]
    uc_rest["REST APIs"]
    uc_video["Video Streaming"]
    uc_chat["Chat / Games"]
    uc_feed["Live Feeds / Alerts"]
  end
  http2 -->|"Best for REST"| uc_rest
  http3 -->|"Best for streaming"| uc_video
  ws -->|"Bidirectional"| uc_chat
  sse -->|"Server push only"| uc_feed
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Caller
  participant a1 as API
  participant a2 as Algorithm Core
  participant a3 as State Store
  participant a4 as Worker
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Interview Drills
1. When would you choose WebSocket over SSE?
   **Use SSE when:** data flows only server -> client (live dashboards, notifications, feeds). Simpler, works over HTTP/2, proxy-friendly, built-in reconnect.
   
   **Use WebSocket when:** you need bidirectional communication (chat, multiplayer games, collaborative editing, trading terminals). WebSocket is a TCP upgrade so it escapes HTTP semantics but also loses HTTP/2 multiplexing benefits.
   
   **At scale:** SSE is easier to load-balance (stateless HTTP); WebSocket requires sticky sessions or a pub-sub backplane (Redis pub-sub, Kafka) so any server can push to any client.
   Follow-ups: How do you scale WebSocket servers?; What is the WebSocket ping/pong mechanism?

2. What is HOL blocking and how does HTTP/3 solve it?
   Head-of-line blocking: if packet N is lost on a TCP connection, all subsequent packets wait for retransmission even if they belong to independent streams. HTTP/2 multiplexes on one TCP connection - a single packet loss stalls all streams.
   
   HTTP/3 uses QUIC (UDP) which implements streams at the transport layer. A lost packet only blocks the single stream that owns it; other streams continue unaffected. Additionally QUIC has built-in TLS 1.3 and supports connection migration (changing IP mid-connection).
   Follow-ups: Why is HTTP/3 especially beneficial on mobile networks?

## Trade-offs
Pros:
- HTTP/2 multiplexing eliminates connection-count limits
- HTTP/3 QUIC reduces latency on lossy networks
- SSE is simplest for server-push use cases

Cons:
- HTTP/3 not supported by all infrastructure/proxies yet
- WebSocket breaks some CDN/proxy setups
- SSE is text-only and unidirectional

When to use:
Default to HTTP/2 for REST APIs. HTTP/3 for user-facing products. SSE for live feeds. WebSocket for true bidirectional needs.

## Gotchas
_No gotchas yet._

