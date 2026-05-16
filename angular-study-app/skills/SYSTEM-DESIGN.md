# System Design Topics

**Topic file location:** `src/modules/topics/sysdesign/`
**Topic array:** `window.SYSDESIGN_TOPICS`
**Area string:** `"sysdesign"`

---

## Topics Built

### Fundamentals

| File | Title | Tag |
|------|-------|-----|
| `sd-request-lifecycle.js` | Request Lifecycle | Networking |
| `sd-dns-cdn.js` | DNS & CDN | Networking |
| `sd-protocols-http.js` | HTTP/1 → HTTP/2 → HTTP/3 | Protocols |
| `sd-protocols-grpc.js` | gRPC & Protobuf | Protocols |
| `sd-api-gateway.js` | API Gateway | Architecture |
| `sd-load-balancing.js` | Load Balancing | Scalability |
| `sd-proxies-mesh.js` | Reverse Proxy & Service Mesh | Networking |

### Data Storage

| File | Title | Tag |
|------|-------|-----|
| `sd-db-relational.js` | Relational Databases | Databases |
| `sd-db-nosql.js` | NoSQL Databases | Databases |
| `sd-db-cap.js` | CAP Theorem | Theory |
| `sd-db-sharding.js` | Database Sharding | Scalability |
| `sd-caching-layers.js` | Caching Layers | Performance |
| `sd-redis-patterns.js` | Redis Patterns | Caching |

### Messaging & Events

| File | Title | Tag |
|------|-------|-----|
| `sd-kafka-arch.js` | Kafka Architecture | Messaging |
| `sd-messaging-patterns.js` | Messaging Patterns | Architecture |
| `sd-event-driven.js` | Event-Driven Architecture | Architecture |
| `sd-saga-patterns.js` | Saga Patterns | Distributed |

### Infrastructure

| File | Title | Tag |
|------|-------|-----|
| `sd-compute-spectrum.js` | Compute Spectrum | Cloud |
| `sd-kubernetes-prod.js` | Kubernetes Production | K8s |
| `sd-cloud-aws.js` | AWS Cloud Architecture | Cloud |
| `sd-observability.js` | Observability Stack | DevOps |
| `sd-security-auth.js` | Security & Auth | Security |
| `sd-resilience-all.js` | Resilience Patterns | Reliability |

### Microservices

| File | Title | Tag |
|------|-------|-----|
| `sd-microservice-design.js` | Microservice Design | Architecture |

### Low-Level Design (LLD)

| File | Title | Tag |
|------|-------|-----|
| `sd-lld-rate-limiter.js` | Rate Limiter LLD | LLD |
| `sd-lld-consistent-hash.js` | Consistent Hashing | LLD |
| `sd-lld-cache.js` | LRU/LFU Cache LLD | LLD |
| `sd-lld-distributed-lock.js` | Distributed Lock LLD | LLD |

### Case Studies

| File | Title | Tag |
|------|-------|-----|
| `sd-case-url-shortener.js` | URL Shortener | Case Study |
| `sd-case-social-feed.js` | Social Feed (Twitter/Instagram) | Case Study |
| `sd-case-video-platform.js` | Video Platform (YouTube) | Case Study |
| `sd-case-ride-sharing.js` | Ride Sharing (Uber) | Case Study |
| `sd-instagram-deep.js` | Instagram Deep Dive | Deep Dive |

---

## System Design Still to Add

| Topic | Priority |
|-------|----------|
| WhatsApp / Chat System | HIGH |
| Search Autocomplete | HIGH |
| Distributed Task Queue | HIGH |
| Payment System | HIGH |
| Notification Service | MEDIUM |
| File Storage (Dropbox/S3) | MEDIUM |
| Game Leaderboard | LOW |
| Ticket Booking (concurrency) | HIGH |
| Stock Exchange | MEDIUM |

---

## Sysdesign Visual Patterns Used

### 1. Vertical Flow (most common)
```js
visual: function(mount) {
  const nodes = [
    { id: 'client', label: 'Client', type: 'client', active: true },
    { id: 'lb',     label: 'Load Balancer', type: 'network' },
    { id: 'app',    label: 'App Server', type: 'component' },
    { id: 'db',     label: 'Database', type: 'store' },
  ];
  const edges = [
    { from: 'client', to: 'lb',  label: 'HTTPS', active: true },
    { from: 'lb',     to: 'app', label: 'round-robin', active: true },
    { from: 'app',    to: 'db',  label: 'SQL', active: true },
  ];
  // Use ReactViz.FlowDiagram for step-by-step with narration
  // OR inline CSS for always-visible architecture diagram
}
```

### 2. Inline CSS Architecture Diagram
For topics that need a ALWAYS-VISIBLE diagram (not step-by-step):
```js
visual: function(mount) {
  mount.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px">
      <div style="background:#1c2128;border:1px solid #58a6ff60;border-radius:8px;padding:12px 20px;color:#58a6ff">
        Client
      </div>
      <div style="color:#768390;font-size:18px">↓</div>
      <div style="background:#1c2128;border:1px solid #30363d;border-radius:8px;padding:12px 20px">
        Load Balancer
      </div>
    </div>`;
}
```

### 3. Animated Request Flow
```js
// CSS keyframe animation for packet traveling through system
mount.innerHTML = `<style>
  @keyframes flow { 0%{left:0} 100%{left:calc(100% - 20px)} }
  .packet { position:absolute; animation: flow 2s infinite; }
</style>
<div style="position:relative;height:40px;background:#161b22;border-radius:6px">
  <div class="packet" style="background:#58a6ff;width:20px;height:20px;border-radius:50%"></div>
</div>`;
```

---

## Sysdesign File Template

```js
(function () {
  'use strict';

  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([{
    id:    'sd-<topic>',
    area:  'sysdesign',
    title: '<Title>',
    tag:   '<Tag>',         // 'Architecture'|'Scalability'|'LLD'|'Case Study'|etc.
    tags:  ['system-design', '<keyword>'],

    concept: `<explanation>`,
    why: `<production relevance>`,

    example: {
      language: 'text',   // or 'yaml', 'java', 'go', etc.
      code: `<code or config>`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Gotcha 1'],

    visual: function (mount) {
      // Step-by-step: use ReactViz.FlowDiagram
      // Always-on diagram: use inline HTML/CSS
    },
  }]);
})();
```
