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



# 🚀 Study Project — Interactive Engineering Learning Platform

> Learn Backend Engineering, Distributed Systems, System Design, Cloud, Kubernetes, Kafka, JVM Internals, AI Systems, and Microservices through Interactive Visualizations, Runtime Simulations, Execution Flows, and Deep Technical Explanations.

---

# 🌟 Vision

Most engineering learning platforms are:

- Static
- Text-heavy
- Interview-focused only
- Hard to visualize
- Difficult to deeply understand

This project aims to build:

```text
Visual + Interactive + Execution-Driven Engineering Learning Platform
```

where users can:

- Understand systems visually
- Simulate distributed systems
- Learn through animations
- Explore runtime internals
- Practice system design
- Execute code flows interactively
- Learn deeply like production engineers

---

# 🔥 Core Philosophy

```text
"Don't just read systems.
See them.
Interact with them.
Debug them.
Simulate them."
```

---

# 🧠 What This Platform Covers

## Backend Engineering

- Java
- Go
- Python
- Rust
- Spring Boot
- FastAPI
- Gin
- gRPC
- REST APIs
- Async systems

---

## Distributed Systems

- Kafka
- RabbitMQ
- Event-driven systems
- CQRS
- Saga Pattern
- Distributed Locks
- Idempotency
- Retries
- DLQ
- Backpressure
- Consensus
- CAP Theorem

---

## Cloud & Infrastructure

- AWS
- Kubernetes
- Docker
- Helm
- Terraform
- Service Mesh
- API Gateway
- Observability
- Scaling
- Load Balancing

---

## Databases

- PostgreSQL
- MongoDB
- Redis
- Cassandra
- ScyllaDB
- ElasticSearch
- Vector Databases

---

## AI Systems

- RAG
- AI Agents
- Embeddings
- Vector Search
- LLM Orchestration
- Prompt Engineering
- MCP
- LangChain
- AI Workflows

---

## System Design

- Instagram
- WhatsApp
- YouTube
- Uber
- Netflix
- Chat Systems
- Notification Systems
- Rate Limiters
- Realtime Systems

---

# ✨ Key Features

## 🎬 Interactive Visualizations

Instead of static explanations:

```text
Producer → Kafka → Consumer
```

the platform animates:

```text
Message Flow
Partitioning
Replication
Retries
Rebalancing
Consumer Lag
DLQ Movement
```

---

## 🧩 Runtime Simulations

Examples:

- Kafka rebalance simulator
- Kubernetes scheduler simulator
- JVM GC visualizer
- Redis cache eviction simulator
- API Gateway request routing
- Thread scheduling visualization

---

## 📊 Execution Flow Learning

Learn systems step-by-step:

```text
Client
  ↓
Load Balancer
  ↓
API Gateway
  ↓
Microservice
  ↓
Kafka
  ↓
Worker
  ↓
Database
```

with realtime animations and event tracing.

---

## 🧠 AI-Powered Learning

Future roadmap includes:

- AI tutor
- AI interviewer
- AI architecture reviewer
- AI debugging assistant
- RAG-based semantic search
- Personalized learning graphs

---

# 🏗️ Current Architecture

```text
study_project/
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   ├── styles/
│   └── modules/
│
├── topics/
│   ├── java/
│   ├── golang/
│   ├── kafka/
│   ├── kubernetes/
│   ├── system-design/
│   └── ai/
│
├── backend/
│   ├── express-server/
│   └── ai-agent/
│
└── assets/
```

---

# 🔥 Long-Term Architecture Vision

```text
Frontend (React + TS)
        ↓
Visualization Engine
        ↓
Topic Rendering Engine
        ↓
AI Knowledge Engine
        ↓
RAG + Embeddings
        ↓
Distributed Backend Services
```

---

# 🛠️ Planned Tech Stack

| Area | Tech |
|---|---|
| Frontend | React + TypeScript |
| Visualization | React Flow + D3.js |
| Animations | Framer Motion |
| Backend | Go + Node.js |
| AI | Python FastAPI |
| Search | ElasticSearch |
| Queue | Kafka |
| Cache | Redis |
| Vector DB | Qdrant |
| Database | PostgreSQL |
| Infra | Kubernetes |
| Cloud | AWS |

---

# 📚 Learning Model

Each topic is designed as:

```js
{
  title,
  difficulty,
  prerequisites,
  concepts,
  executionFlows,
  visualizations,
  playgrounds,
  quizzes,
  interviewQuestions,
  productionScenarios,
  debuggingCases,
  codeExamples
}
```

---

# 🎯 Target Audience

- Backend Engineers
- System Design Learners
- Distributed Systems Engineers
- Cloud Engineers
- AI Engineers
- Interview Preparation
- Senior Software Engineers
- Engineering Students
- Platform Engineers

---

# 🔥 Example Learning Experiences

## Kafka Visualization

```text
Producer
   ↓
Partition Selection
   ↓
Broker Replication
   ↓
ISR Sync
   ↓
Consumer Group Rebalance
   ↓
Offset Commit
```

---

## Kubernetes Simulation

```text
Ingress
   ↓
Service
   ↓
Pod Scheduling
   ↓
Container Runtime
   ↓
Autoscaling
```

---

## JVM Visualization

```text
Stack Memory
Heap Memory
GC Lifecycle
Thread States
Object Allocation
Lock Contention
```

---

# 🧪 Future Advanced Features

## AI Interviewer

- Conducts technical interviews
- Evaluates answers
- Generates follow-up questions
- Provides scoring and feedback

---

## Architecture Validator

Upload system design diagrams and get:

- SPOF detection
- Scaling analysis
- Retry analysis
- Consistency checks
- Failure analysis

---

## Interactive Code Playground

- Run Java/Go/Python/Rust code
- Visualize execution
- Trace goroutines/threads
- Memory visualization

---

# 🚀 Future Product Direction

This platform aims to become:

```text
LeetCode
+
System Design Primer
+
Kafka Visualizer
+
Interactive JVM Explorer
+
Distributed Systems Simulator
+
AI Tutor
```

combined into one unified engineering learning ecosystem.

---

# ⚡ Installation

## Clone Repository

```bash
git clone https://github.com/premchandkpc/study_project.git
cd study_project
```

---

## Install Dependencies

```bash
npm install
```

---

## Run Project

```bash
npm start
```

or

```bash
node server.js
```

---

# 🔥 Development Roadmap

## Phase 1 — Foundation ✅

- Topic rendering
- Static modules
- Basic UI
- Initial AI integration

---

## Phase 2 — Interactive Engine 🚧

- Animation engine
- Execution flow renderer
- State management
- Dynamic topic loading

---

## Phase 3 — Visualization Platform 🚧

- Kafka simulator
- Kubernetes simulator
- JVM visualizer
- Distributed systems playground

---

## Phase 4 — AI Knowledge System 🚧

- RAG architecture
- Semantic search
- AI tutor
- AI interviewer
- Personalized learning

---

# 🤝 Contributions

Contributions are welcome.

Areas:

- Backend Engineering Topics
- Distributed Systems Visualizations
- Kubernetes Simulators
- AI Integrations
- Animation Engine
- Interactive UI Components
- System Design Flows
- Performance Optimization

---

# 💡 Core Goal

```text
Transform engineering education
from passive reading
into interactive system understanding.
```

---

# ⭐ Repository

https://github.com/premchandkpc/study_project

---

# 🔥 Final Note

This project is not just a study website.

It is evolving into:

```text
Interactive Engineering Knowledge Operating System
```

for deeply understanding how modern software systems actually work in production 🚀