# System Design Concept Docs

Generated companion docs for every system design topic. Each file contains concept notes, production architecture notes, Mermaid architecture, UML sequence, animation plan, interview drills, trade-offs, and gotchas.

| Concept                                                                                    | Tag            | Flow | UML | Architecture |
| ------------------------------------------------------------------------------------------ | -------------- | ---- | --- | ------------ |
| [API Gateway - Routing, Auth & Rate Limiting](sd-api-gateway.md)                           | Gateway        | yes  | yes | yes          |
| [Caching Layers - Browser to DB, Eviction & Strategies](sd-caching-layers.md)              | Caching        | yes  | yes | yes          |
| [Case Study: Real-Time Chat System (WhatsApp / Slack)](sd-case-chat-system.md)             | Case Study     | yes  | yes | yes          |
| [Case Study: Payment System (Stripe / PayPal)](sd-case-payment-system.md)                  | Case Study     | yes  | yes | yes          |
| [Case Study: Ride Sharing (Uber / Lyft)](sd-case-ride-sharing.md)                          | Case Study     | yes  | yes | yes          |
| [Case Study: Search Autocomplete (Google Typeahead)](sd-case-search-autocomplete.md)       | Case Study     | yes  | yes | yes          |
| [Case Study: Social Media Feed (Twitter / Instagram)](sd-case-social-feed.md)              | Case Study     | yes  | yes | yes          |
| [Case Study: Ticket Booking System (BookMyShow / Ticketmaster)](sd-case-ticket-booking.md) | Case Study     | yes  | yes | yes          |
| [Case Study: URL Shortener (TinyURL / Bit.ly)](sd-case-url-shortener.md)                   | Case Study     | yes  | yes | yes          |
| [Case Study: Video Platform (Netflix / YouTube)](sd-case-video-platform.md)                | Case Study     | yes  | yes | yes          |
| [AWS Cloud - Services by Layer & When to Use Each](sd-cloud-aws.md)                        | Cloud          | yes  | yes | yes          |
| [Compute Spectrum - VMs, Containers & Serverless](sd-compute-spectrum.md)                  | Compute        | yes  | yes | yes          |
| [CAP Theorem, Consistency Models & PACELC](sd-db-cap.md)                                   | Database       | yes  | yes | yes          |
| [NoSQL - Document, Key-Value & Wide-Column](sd-db-nosql.md)                                | Database       | yes  | yes | yes          |
| [Relational DBs - ACID, Indexing & Query Planning](sd-db-relational.md)                    | Database       | yes  | yes | yes          |
| [Database Sharding, Replication & Resharding](sd-db-sharding.md)                           | Database       | yes  | yes | yes          |
| [DNS Resolution & CDN Edge Caching](sd-dns-cdn.md)                                         | Networking     | yes  | yes | yes          |
| [Event-Driven Architecture - EDA, CQRS & Event Sourcing](sd-event-driven.md)               | Architecture   | yes  | yes | yes          |
| [Case Study: Instagram - Photo/Reel Upload, Feed, Stories & Scale](sd-instagram-deep.md)   | Case Study     | yes  | yes | yes          |
| [Apache Kafka - Internals, Partitions & Consumer Groups](sd-kafka-arch.md)                 | Messaging      | yes  | yes | yes          |
| [Kubernetes in Production - Pods, HPA & Rolling Deploys](sd-kubernetes-prod.md)            | Compute        | yes  | yes | yes          |
| [LLD: LRU & LFU Cache - O(1) Get and Put](sd-lld-cache.md)                                 | LLD            | yes  | yes | yes          |
| [LLD: Consistent Hashing - Hash Ring & Virtual Nodes](sd-lld-consistent-hash.md)           | LLD            | yes  | yes | yes          |
| [LLD: Distributed Lock - Redlock, Zookeeper & Fencing](sd-lld-distributed-lock.md)         | LLD            | yes  | yes | yes          |
| [LLD: Rate Limiter - Token Bucket & Sliding Window](sd-lld-rate-limiter.md)                | LLD            | yes  | yes | yes          |
| [LLD: Distributed Task Queue (Celery / BullMQ / Sidekiq)](sd-lld-task-queue.md)            | LLD            | yes  | yes | yes          |
| [Load Balancing - L4/L7, Algorithms & Health Checks](sd-load-balancing.md)                 | Infrastructure | yes  | yes | yes          |
| [Messaging Patterns - Queue, Pub/Sub, Outbox & Dead Letter](sd-messaging-patterns.md)      | Messaging      | yes  | yes | yes          |
| [Microservice Design - DDD, Boundaries & Strangler Fig](sd-microservice-design.md)         | Architecture   | yes  | yes | yes          |
| [Observability - Metrics, Logs, Traces & Alerting](sd-observability.md)                    | Operations     | yes  | yes | yes          |
| [gRPC, Protobuf & Bidirectional Streaming](sd-protocols-grpc.md)                           | Protocols      | yes  | yes | yes          |
| [HTTP 1.1 / 2 / 3, WebSocket & SSE](sd-protocols-http.md)                                  | Protocols      | yes  | yes | yes          |
| [Reverse Proxy, Service Mesh & Sidecar Pattern](sd-proxies-mesh.md)                        | Infrastructure | yes  | yes | yes          |
| [Redis - Data Structures, Patterns & Cluster](sd-redis-patterns.md)                        | Caching        | yes  | yes | yes          |
| [Full Request Lifecycle: Browser -> Server -> DB](sd-request-lifecycle.md)                 | Networking     | yes  | yes | yes          |
| [Resilience - Circuit Breaker, Bulkhead, Retry & Backpressure](sd-resilience-all.md)       | Resilience     | yes  | yes | yes          |
| [Saga Pattern - Distributed Transactions Without 2PC](sd-saga-patterns.md)                 | Architecture   | yes  | yes | yes          |
| [Security - OAuth2, JWT, mTLS & RBAC](sd-security-auth.md)                                 | Security       | yes  | yes | yes          |

All topic docs: [../topics/README.md](../topics/README.md).
