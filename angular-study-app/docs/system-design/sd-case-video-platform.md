# Case Study: Video Platform (Netflix / YouTube)

Source: `src/modules/topics/sysdesign/sd-case-video-platform.js`
Tag: `Case Study`
Doc path: `docs/system-design/sd-case-video-platform.md`

## Concept
**Requirements:** 500M users, 1B hours watched/day, 500 hours of video uploaded/minute.

**Upload pipeline:**
1. **Chunked upload** - client splits video into 5-10MB chunks, uploads in parallel. Resumable on failure.
2. **Raw storage** - chunks assembled in S3 bucket (upload bucket).
3. **Transcoding** - distributed job: split video into 5s segments -> transcode each segment to multiple resolutions (2160p/1080p/720p/480p/360p/240p) and codecs (H.264, H.265, AV1) in parallel.
4. **Adaptive Bitrate (ABR)** - generate HLS (HTTP Live Streaming) or MPEG-DASH manifest file listing all variants. Player selects bitrate based on network speed.
5. **CDN distribution** - transcoded segments pushed to 200+ CDN PoPs.

**Streaming:**
- Player requests manifest (`.m3u8` or `.mpd`).
- Downloads 2-10 second segments. Measures download speed.
- Switches bitrate every segment - seamless quality adaptation.
- No persistent connection - pure HTTP. Works through proxies, firewalls.

**Recommendation engine:**
Two-stage: candidate generation (ALS matrix factorisation - 1M videos -> top 100) -> ranking model (features: watch history, freshness, CTR, diversity) -> top 10-20 shown.

**Storage:**
- Video segments: S3 / GCS (object storage)
- Metadata (title, uploader, description): PostgreSQL / Spanner
- View counts, likes: Redis (real-time) + Cassandra (batch aggregated)
- Search index: Elasticsearch
- CDN: Netflix uses their own Open Connect CDN; YouTube uses Google's CDN

## Production Architecture
Video streaming design is a common senior-level question. Transcoding pipeline, HLS/DASH, and CDN strategy are unique to this domain.

## Architecture Checklist
- Users / Mobile/Web client: Captures user intent, auth token, device context, and retry id.
- Edge / CDN / API Gateway: Terminates TLS, verifies token, applies rate limits, and routes to domain services.
- Core / Domain Services: Owns domain logic, validates invariants, and writes authoritative state.
- Async / Workers / Event Bus: Decouples slow work such as notifications, indexing, media processing, or settlement.
- Data / Primary data stores: Stores metadata, hot cache entries, immutable blobs, and audit history.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Users"]
    client["Mobile/Web client"]
  end
  subgraph lane_1["Edge"]
    edge["CDN / API Gateway"]
  end
  subgraph lane_2["Core"]
    service["Domain Services"]
  end
  subgraph lane_3["Async"]
    worker["Workers / Event Bus"]
  end
  subgraph lane_4["Data"]
    store["Primary data stores"]
  end
  client -->|"ingress"| edge
  edge -->|"sync request"| service
  service -.->|"async event"| worker
  service -->|"state access"| store
  store -.->|"replay / repair"| worker
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Client
  participant a1 as API Gateway
  participant a2 as Domain Service
  participant a3 as Async Worker
  participant a4 as Data Store
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
1. How does adaptive bitrate streaming work?
   ABR (HLS/DASH) works in 5 steps:
   1. Server transcodes video into multiple quality levels (2160p -> 240p) and divides each into short segments (2-10 seconds).
   2. A manifest file lists all quality variants with bandwidth requirements.
   3. Player downloads the manifest, picks initial quality based on measured bandwidth.
   4. Player downloads segment, measures download time. If download took longer than segment duration -> bandwidth too low -> switch to lower quality next segment.
   5. If download is consistently fast -> buffer ahead and switch to higher quality.
   
   **Key insight:** Switching happens at segment boundaries - seamless. Player maintains a 15-30 second buffer to absorb network jitter without pause.
   
   HLS uses `.m3u8` (Apple format, supported natively by iOS/Safari). DASH is ISO standard (Chrome, Android). Both achieve same result - adaptive quality.
   Follow-ups: Why does Netflix pre-transcode to AV1 codec?; How do you handle DRM (Digital Rights Management) for premium content?

## Trade-offs
Pros:
- HLS/DASH: works over plain HTTP, CDN-friendly, adaptive quality
- Chunked upload: resumable, parallel - fast for large files
- Distributed transcoding: elastic scale - 500h/minute is feasible

Cons:
- Transcoding is compute-intensive and expensive ($0.50/min of video for 1080p)
- Manifest + segment files multiply storage (6 resolutions x many segments)
- ABR introduces complexity in player implementation

When to use:
HLS for iOS/Safari. DASH for Android/Chrome. AV1 codec for bandwidth-constrained mobile markets. Always CDN for video - sending video from origin is economically infeasible at scale.

## Gotchas
_No gotchas yet._

