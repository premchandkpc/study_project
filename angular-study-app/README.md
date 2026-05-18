# Senior SDE Study Lab

Visual, interactive, dynamic study platform for **Java · Go · Python · Rust · React · Angular · Microservices · Databases · Kafka · System Design · DSA**.

Vanilla JavaScript, Angular-inspired architecture — no build step.

## Quick Start

```bash
npm install          # install dependencies (first time only)
npm run dev          # frontend at http://localhost:8080  (auto-opens browser)
npm run server:dev   # agent backend at http://localhost:3001  (optional, auto-reload)
```

Or use Make:

```bash
make install   # npm install
make dev       # frontend only
make server    # agent backend only
make run       # frontend + backend together
make stop      # kill both servers
```

## Available Scripts

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Frontend — http-server port 8080, no cache, auto-open |
| `npm run start`      | Frontend — http-server port 8080, no auto-open        |
| `npm run server`     | Agent backend — node server/agents/server.js          |
| `npm run server:dev` | Agent backend — auto-reload on file change            |
| `npm run lint`       | ESLint fix                                            |
| `npm run format`     | Prettier format `src/**/*.{js,css,html}`              |

## Project Structure

```
index.html                        # entry point
src/
  app/                            # framework core (signals, DI, router, store)
  features/                       # coder page, agent service
  modules/topics/                 # all topic JS files
    angular/   golang/   java/
    python/    rust/     react/
    databases/ kafka/    microservices/
    sysdesign/ agents/   dsa/
  shared/
    dsa-viz/                      # DSA visualizer engine
    react-viz/                    # ReactViz animation engine
  styles/
docs/                             # MD docs for every topic + Mermaid diagrams
server/agents/server.js           # Express agent backend (port 3001)
skills/                           # MD documentation per topic area
```

## Topics

| Area          | Topics                                                                             |
| ------------- | ---------------------------------------------------------------------------------- |
| Java          | JVM/GC, Concurrency, Spring Boot, Streams, Collections, Virtual Threads, Locks     |
| Go            | Goroutines/Channels, Context, Memory Model, Interfaces, Error Handling, Generics   |
| Python        | GIL/Concurrency, Memory GC, Decorators, Type Hints, Pydantic, FastAPI, Testing     |
| Rust          | Ownership, Lifetimes, Traits, Smart Pointers, Async/Tokio, Concurrency             |
| React         | Hooks, Fiber, Concurrent Mode, Server Components, Performance, Router              |
| Angular       | Change Detection, DI, NgRx, Signals, Routing Guards                                |
| Databases     | ACID, MVCC, Indexes, WAL, B-Tree/LSM, Replication, Sharding, Postgres/Mongo/Redis  |
| Kafka         | Producer/Consumer, Replication/ISR, Consumer Groups, Streams, RabbitMQ, WarpStream |
| Microservices | API Gateway, Saga, Circuit Breaker, gRPC, CQRS, Service Mesh                       |
| System Design | DNS/CDN, Load Balancing, Caching, CAP, Kubernetes, Observability, Security         |
| DSA           | Sliding Window, Two Pointers, DP, Backtracking, Graphs, Binary Search, Stack       |

## Architecture

### Frontend

- `index.html` — loads all topic scripts + core framework, no bundler
- `src/app/core/signal.js` — Angular-style signal reactivity
- `src/app/core/injector.js` — dependency injection container
- `src/shared/react-viz/react-viz-core.js` — ReactViz animation engine (FlowDiagram, Swimlane, ComponentTree)

### Backend (optional)

- `server/agents/server.js` — Express.js, port 3001
- Multi-agent system with skills registry
- CORS enabled for local dev

## License

MIT © 2025
