# 🚀 Ultimate Interactive Visual Learning System
## ByteByteGo + Miro + Excalidraw + Kubernetes + AWS + Kafka + JVM + AI Visualization Engine

---

# 🌌 Vision

Build a cinematic interactive teaching platform capable of visually explaining:

- DSA
- System Design
- Kubernetes
- AWS
- Kafka
- JVM Internals
- Databases
- Networking
- Distributed Systems
- AI / Transformers
- Concurrency
- Operating Systems

using:

- animations
- timelines
- packet simulations
- infinite canvas
- code execution sync
- storytelling
- camera systems
- runtime visualizations
- interactive simulations

---

# 🏗️ MASTER ARCHITECTURE

```txt
┌──────────────────────────────────────────────────────┐
│                 APPLICATION ENGINE                   │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                    SCENE ENGINE                      │
│ layouts • themes • camera • transitions • zoom       │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                VISUALIZATION ENGINE                  │
│ arrays • trees • graphs • infra • packets • memory  │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                  ANIMATION ENGINE                    │
│ timeline • particles • easing • state transitions   │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                  INTERACTION ENGINE                  │
│ drag • pan • zoom • replay • inspect • hover        │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                   TEACHING ENGINE                    │
│ narration • stories • hints • mental models         │
└──────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│                  SIMULATION ENGINE                   │
│ kafka • k8s • aws • jvm • db • network • ai         │
└──────────────────────────────────────────────────────┘
```

---

# 🎨 VISUAL MODES

```js
const VISUAL_MODES = {
  BYTEBYTEGO: 'bytebytego',
  MIRO: 'miro',
  EXCALIDRAW: 'excalidraw',
  TERMINAL: 'terminal',
  CYBERPUNK: 'cyberpunk',
  AWS: 'aws',
  KUBERNETES: 'kubernetes',
  GLASS: 'glassmorphism',
  BRILLIANT: 'brilliant',
  OBSERVABLE: 'observable',
  NEURAL: 'neural-network'
};
```

---

# 🧠 TEACHING PRINCIPLE

Traditional teaching:
```txt
Static diagrams
```

Target:
```txt
Living systems simulations
```

Examples:
- packets move
- retries happen
- queues overflow
- pods scale
- threads block
- GC pauses freeze world
- Kafka lag grows
- replicas sync
- locks contend

---

# 🎥 CAMERA ENGINE

```js
camera.zoom(1.5)
camera.pan(x, y)
camera.focus(node)
camera.follow(packet)
camera.shake()
camera.reset()
```

Features:
- cinematic movement
- focus transitions
- packet follow mode
- zoom into services
- distributed tracing camera

---

# 🌐 NETWORK VISUALIZATION ENGINE

## Example Flow

```txt
Browser
   ↓
CDN
   ↓
Load Balancer
   ↓
API Gateway
   ↓
Service Mesh
   ↓
Microservice
   ↓
Kafka
   ↓
Database
```

Animations:
- flowing packets
- ACK responses
- timeout flashes
- retries
- congestion buildup
- replication waves
- latency counters

---

# ☸️ KUBERNETES VISUALIZER

## Simulate

- pod scheduling
- kube-proxy routing
- DNS resolution
- ingress traffic
- HPA scaling
- rolling deployments
- CrashLoopBackoff
- service discovery
- sidecars
- etcd replication
- node failures

---

## Kubernetes Flow

```txt
User
 ↓
Ingress
 ↓
Service
 ↓
kube-proxy
 ↓
Pod
 ↓
Redis
 ↓
Database
```

Animations:
- traffic packets
- pod pulse scaling
- pod restart flashing
- node drain
- rescheduling
- health probes

---

# ☁️ AWS CLOUD VISUALIZER

## AWS Components

```txt
Route53
CloudFront
WAF
ALB
API Gateway
Lambda
EKS
ECS
SQS
SNS
Step Functions
Aurora
DynamoDB
ElastiCache
Kafka
S3
```

---

## AWS Architecture Flow

```txt
Client
 ↓
CloudFront
 ↓
ALB
 ↓
EKS
 ↓
Kafka
 ↓
Aurora
```

Visuals:
- autoscaling pulse
- replication glow
- health checks
- throughput counters
- latency heatmaps

---

# 🔥 KAFKA VISUALIZER

## Simulate

- producer
- broker
- partitions
- ISR
- replication
- leader election
- consumer groups
- lag
- retention
- rebalancing

---

## Kafka Flow

```txt
Producer
   ↓
Partition
   ↓
Replication
   ↓
Consumer Group
```

Animations:
- append logs
- offset movement
- lag bars
- rebalance animation
- leader failover

---

# 🧠 JVM VISUALIZER

## JVM Areas

```txt
Metaspace
Heap
 ├── Eden
 ├── Survivor
 └── Old Gen

Thread Stack
Native Stack
PC Register
```

---

## Simulate

- object allocation
- stack frames
- GC sweep
- stop-the-world
- synchronization
- locks
- deadlocks
- thread lifecycle

---

# 🧵 THREAD VISUALIZER

```txt
NEW
 ↓
RUNNABLE
 ↓
RUNNING
 ↓
WAITING
 ↓
BLOCKED
 ↓
TERMINATED
```

Animations:
- lock contention
- monitor ownership
- waiting queue
- starvation
- deadlock cycles

---

# 🗄️ DATABASE VISUALIZER

## PostgreSQL

Visualize:
- MVCC
- WAL
- indexes
- vacuum
- planner
- locking

---

## Redis

Visualize:
- event loop
- memory usage
- eviction
- persistence
- pub/sub
- replication

---

# 🤖 AI / TRANSFORMER VISUALIZER

## Transformer Flow

```txt
Input
 ↓
Tokenizer
 ↓
Embeddings
 ↓
Attention Heads
 ↓
Transformer Layers
 ↓
Feed Forward Network
 ↓
Softmax
 ↓
Output
```

Animations:
- attention lines
- token relationships
- vector flow
- dimensional transforms

---

# 📦 DSA VISUAL COMPONENTS

---

## Arrays

```js
DSAViz.array.render()
DSAViz.array.animate()
```

Use for:
- sliding window
- sorting
- binary search
- stacks
- queues
- prefix sum

---

## Trees

```js
DSAViz.tree.render()
DSAViz.tree.animate()
```

Use for:
- BST
- heaps
- recursion
- DFS
- BFS
- tries

---

## Graphs

```js
DSAViz.graph.render()
DSAViz.graph.animate()
```

Use for:
- BFS
- DFS
- Dijkstra
- topo sort
- union find

---

## Matrix

```js
DSAViz.matrix.render()
DSAViz.matrix.animate()
```

Use for:
- islands
- flood fill
- shortest path
- sudoku
- DP tables

---

## DP

```js
DSAViz.dp.table1D()
DSAViz.dp.table2D()
DSAViz.dp.memoTree()
```

Use for:
- knapsack
- LCS
- edit distance
- memoization

---

## String

```js
DSAViz.string.render()
DSAViz.string.compare()
```

Use for:
- KMP
- Rabin-Karp
- sliding window
- edit distance

---

# 🎬 ANIMATION ENGINE

---

## Pulse Animation

```css
.pulse {
  animation: pulse-ring 1.2s ease-out infinite;
}
```

---

## Flow Animation

```css
.flow-line {
  stroke-dasharray: 8 4;
  animation: flow-dash 0.6s linear infinite;
}
```

---

## Fade Reveal

```css
.step-reveal {
  animation: slide-up 0.35s ease forwards;
}
```

---

## Breathing Glow

```css
.breathing {
  animation: breathe 2s ease-in-out infinite;
}
```

---

# 🧲 INTERACTION ENGINE

Features:
- drag nodes
- zoom canvas
- pan canvas
- minimap
- replay execution
- hover inspect
- timeline scrubber
- multi-select
- graph editing

---

# 📖 STORY MODE

Instead of:
```txt
Load balancer routes traffic
```

Narrate:
```txt
Traffic police notices congestion.
Vehicles redirected to another road.
Service workers process requests.
```

Goal:
- memorable learning
- intuitive understanding
- mental model building

---

# 🧩 STATE MACHINE ENGINE

```txt
PENDING
 ↓
RUNNING
 ↓
FAILED
 ↓
RETRYING
 ↓
COMPLETED
```

Transitions:
- animated
- event-driven
- replayable

---

# 🗺️ INFINITE CANVAS

Features:
- Miro-style board
- draggable stickies
- zoom into systems
- nested diagrams
- relationship mapping
- minimap navigation

---

# ✏️ EXCALIDRAW MODE

Use:
```html
<script src="https://unpkg.com/roughjs/bundled/rough.js"></script>
```

Features:
- hand-drawn arrows
- sketch boxes
- imperfect borders
- whiteboard aesthetics

---

# 🌈 THEMES

---

## ByteByteGo

```css
--bg: #0d1117;
--node-a: #58a6ff;
--arrow: #e3b341;
```

---

## Miro

```css
--bg: #f2f3f5;
--card: #ffffff;
```

---

## Brilliant

```css
--bg: #1b1f3b;
--primary: #7c4dff;
```

---

## Terminal

```css
--bg: #0a0a0a;
--text: #00ff41;
```

---

# 🧠 MENTAL MODEL ENGINE

Goal:
Explain:
- WHY
- HOW
- WHAT

Example:
```txt
Kafka uses append-only logs
because sequential disk writes are faster.
```

Animate:
- disk writes
- page cache
- append offsets
- replication

---

# ⚡ PERFORMANCE ENGINE

## Rendering Strategy

```txt
SVG     → small graphs
Canvas  → medium systems
WebGL   → huge simulations
```

---

## Optimizations

- virtualization
- render batching
- worker threads
- memoization
- incremental rendering

---

# 🛠️ TECH STACK

---

## Frontend

```txt
Angular 17+
TypeScript
SCSS / CSS Variables
Angular Animations
D3.js
XState
NgRx Signals
Web Components
```

---

## Advanced Graphics

```txt
PixiJS
Three.js
GSAP
WebGL / Canvas API
SVG animations
roughjs (Excalidraw mode)
```

---

# 📊 TIMELINE ENGINE

```txt
t=0ms
Request enters ALB

t=10ms
ALB forwards request

t=20ms
Redis cache miss

t=50ms
DB query starts

t=90ms
DB returns

t=120ms
Response sent
```

Like:
- Chrome DevTools
- distributed tracing
- Jaeger timeline

---

# 🧬 DYNAMIC SYSTEM SIMULATIONS

---

## Queue Simulation

Visualize:
- enqueue
- dequeue
- overflow
- retries

---

## Thread Pool

Visualize:
- worker pickup
- queue buildup
- rejection handling

---

## Memory Grid

Visualize:
- heap allocation
- GC sweep
- object aging

---

## Hash Table

Visualize:
- hashing
- collisions
- chaining
- resize

---

# 🎮 INTERVIEW MODE

Features:
- reveal answers
- runtime debugging
- complexity counters
- step replay
- execution tracing

---

# 🧾 CODE EXECUTION SYNC

When code executes:

```go
for _, n := range graph[node]
```

Automatically:
- node glows
- edge animates
- queue updates
- narration changes

---

# 📈 LIVE METRICS

Visualize:
```txt
Latency: 120ms
QPS: 18k
CPU: 72%
Memory: 4.2GB
Kafka Lag: 2300
```

Use:
- gauges
- charts
- heatmaps
- animated counters

---

# 🧊 GLASSMORPHISM MODE

```css
backdrop-filter: blur(16px);
background: rgba(255,255,255,0.08);
border: 1px solid rgba(255,255,255,0.15);
```

---

# 🌌 CYBERPUNK MODE

Features:
- neon glow
- holographic UI
- animated grids
- futuristic packets

---

# 📡 OBSERVABILITY MODE

Visualize:
- traces
- spans
- logs
- metrics
- distributed tracing

---

# 🧭 PLATFORM REFERENCES

| Platform | Learn |
|---|---|
| ByteByteGo | architecture flows |
| Miro | infinite canvas |
| Excalidraw | sketch UX |
| Linear | smooth motion |
| Vercel | transitions |
| Figma | graph interactions |
| Brilliant | educational flow |
| ObservableHQ | reactive visuals |
| Netflix TechBlog | infra storytelling |

---

# 🏆 FINAL GOAL

Build:
```txt
Not static diagrams

BUT

living distributed systems
```

Where users can:
- replay systems
- inspect packets
- watch failures
- zoom into runtime
- debug visually
- learn deeply

---

# 🚀 ROADMAP

```txt
1. Infinite Canvas
2. Camera Engine
3. Timeline Engine
4. Packet Animation System
5. Kubernetes Simulator
6. Kafka Simulator
7. JVM Visualizer
8. AWS Infrastructure Mode
9. Code Execution Sync
10. AI Transformer Visualizer
```

---

# 🌟 ULTIMATE OUTCOME

A platform where:
- Kubernetes feels alive
- Kafka visibly streams
- JVM memory breathes
- packets move realistically
- retries shake systems
- leader elections animate
- GC pauses freeze world
- queues overflow visually

---

# 🔥 FINAL TRANSFORMATION

```txt
FROM:
Educational diagrams

TO:
Cinematic infrastructure simulator
```

---

# 🎯 END GOAL

```txt
Teach systems like movies.
Explain infrastructure like games.
Visualize runtime like reality.
```

---

# 🧵 CONCURRENCY VISUALIZER

## Simulate

- mutex lock / unlock
- semaphore count
- read-write lock contention
- race conditions
- atomic CAS operations
- goroutine scheduler (Go)
- thread pool saturation
- condition variables
- producer-consumer
- dining philosophers

---

## Concurrency Flow

```txt
Thread A          Thread B
   │                 │
   ▼                 ▼
acquire lock      acquire lock
   │              (BLOCKED)
   ▼                 │
critical section     │
   │                 │
release lock         │
                     ▼
                 acquire lock
                 critical section
                 release lock
```

Animations:
- lock ownership glow
- blocked thread pulse red
- deadlock cycle highlight
- starvation counter
- race condition flash

---

# 🖥️ OPERATING SYSTEMS VISUALIZER

## Simulate

- process scheduling (FCFS, SJF, Round Robin, Priority)
- context switching
- page table walks
- TLB hits/misses
- virtual → physical address translation
- disk I/O scheduling
- inode file lookup
- pipe communication
- signal handling
- zombie processes

---

## Process Scheduler Flow

```txt
READY QUEUE
[P1][P2][P3][P4]
       │
       ▼
  CPU dispatcher
       │
  ┌────┴─────┐
  ▼          ▼
RUNNING    WAITING (I/O)
  │          │
  ▼          ▼
TERMINATED  READY (I/O done)
```

Animations:
- Gantt chart live-fill
- context switch register dump
- page fault TLB miss flash
- disk arm seek animation
- process state color transitions

---

## Virtual Memory

```txt
Virtual Address
       │
       ▼
   Page Table
       │
  ┌────┴────┐
  ▼         ▼
TLB Hit   TLB Miss
  │           │
  ▼           ▼
Physical   Page Walk
Address    (slow path)
```

---

# 🌐 DISTRIBUTED SYSTEMS VISUALIZER

## Simulate

- leader election (Raft)
- log replication
- split brain
- network partition (netsplit)
- quorum consensus
- vector clocks
- eventual consistency
- two-phase commit
- saga pattern
- circuit breaker

---

## Raft Consensus Flow

```txt
FOLLOWER → (timeout) → CANDIDATE
    │                      │
    │                 RequestVote RPC
    │                      │
    ▼                      ▼
FOLLOWER            majority votes
                           │
                           ▼
                         LEADER
                           │
                    AppendEntries RPC
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                FOLLOWER     FOLLOWER
```

Animations:
- heartbeat pulse from leader
- vote RPC arrows fly
- log entry commit wave
- partition wall drops between nodes
- term number increments

---

## CAP Theorem Visualizer

```txt
┌──────────────────────────────┐
│          CAP Triangle        │
│                              │
│         Consistency          │
│              /\              │
│             /  \             │
│            / CP \            │
│           /──────\           │
│          / CA  AP \          │
│   Availability─Partition     │
│           Tolerance          │
└──────────────────────────────┘
```

Toggle partition mode → watch which guarantees break.

---

# 📡 NETWORKING VISUALIZER (DEEP)

## OSI Stack Animation

```txt
Layer 7  Application  HTTP/gRPC/WebSocket
Layer 6  Presentation TLS/compression
Layer 5  Session      connection state
Layer 4  Transport    TCP/UDP segments
Layer 3  Network      IP routing
Layer 2  Data Link    MAC frames
Layer 1  Physical     bits on wire
```

Packet travels DOWN sender stack → UP receiver stack. Each layer wraps/unwraps header — animate per layer.

---

## TCP Handshake

```txt
Client                Server
  │──── SYN ──────────▶│
  │◀─── SYN-ACK ───────│
  │──── ACK ──────────▶│
  │    ESTABLISHED      │
```

## TCP Congestion

```txt
cwnd
 │
 │        /\
 │       /  \  (congestion)
 │      /    \────────────
 │     /      slow start
 │────/
 │  slow
 └──────────────────── time
```

Animations:
- packet loss → cwnd halves
- slow start exponential climb
- congestion avoidance linear
- retransmit timer flash

---

## DNS Resolution Chain

```txt
Browser cache
     │ miss
     ▼
OS resolver
     │ miss
     ▼
Recursive resolver (ISP)
     │ miss
     ▼
Root nameserver
     │
     ▼
TLD nameserver (.com)
     │
     ▼
Authoritative nameserver
     │
     ▼
IP address returned
```

---

# 🧩 COMPONENT API REFERENCE

## DSAViz Core API

```js
// Arrays
DSAViz.array.render(container, arr, opts)
DSAViz.array.highlight(indices, color)
DSAViz.array.swap(i, j)
DSAViz.array.compare(i, j)
DSAViz.array.window(left, right)
DSAViz.array.pointer(index, label)
DSAViz.array.mark(index, label)
DSAViz.array.reset()

// Trees
DSAViz.tree.render(container, root, opts)
DSAViz.tree.highlightNode(val, color)
DSAViz.tree.traverse(order)        // 'inorder'|'preorder'|'postorder'|'bfs'
DSAViz.tree.insertNode(val)
DSAViz.tree.deleteNode(val)
DSAViz.tree.rotateLeft(val)
DSAViz.tree.rotateRight(val)

// Graphs
DSAViz.graph.render(container, nodes, edges, opts)
DSAViz.graph.highlightNode(id, color)
DSAViz.graph.highlightEdge(from, to, color)
DSAViz.graph.bfs(startId, onVisit)
DSAViz.graph.dfs(startId, onVisit)
DSAViz.graph.dijkstra(startId, onRelax)
DSAViz.graph.topoSort(onVisit)

// Matrix
DSAViz.matrix.render(container, grid, opts)
DSAViz.matrix.highlightCell(r, c, color)
DSAViz.matrix.floodFill(r, c, color)
DSAViz.matrix.drawPath(cells, color)
DSAViz.matrix.reset()

// DP Tables
DSAViz.dp.table1D(container, arr, opts)
DSAViz.dp.table2D(container, grid, opts)
DSAViz.dp.memoTree(container, root, opts)
DSAViz.dp.highlightCell(r, c, color)
DSAViz.dp.drawArrow(from, to)

// Strings
DSAViz.string.render(container, str, opts)
DSAViz.string.compare(str1, str2)
DSAViz.string.highlight(start, end, color)
DSAViz.string.slideWindow(left, right)
DSAViz.string.kmpTable(pattern)
```

---

## Simulation Control API

```js
// Step controls
DSAViz.sim.step()
DSAViz.sim.stepBack()
DSAViz.sim.play(speedMs)
DSAViz.sim.pause()
DSAViz.sim.reset()
DSAViz.sim.goto(stepIndex)
DSAViz.sim.onStep(fn)          // fn(state, stepIndex)

// Narration
DSAViz.narrate(text)
DSAViz.narrateCode(lineNumber)

// Complexity
DSAViz.complexity.ops(count)
DSAViz.complexity.setLabel('O(n log n)')
DSAViz.complexity.space(bytes)
```

---

## Camera API

```js
DSAViz.camera.zoom(factor)
DSAViz.camera.pan(x, y)
DSAViz.camera.focus(nodeId)
DSAViz.camera.follow(packetId)
DSAViz.camera.shake(intensity)
DSAViz.camera.reset()
DSAViz.camera.flyTo(x, y, zoom, durationMs)
```

---

# 🎨 COLOR SYSTEM

## Design Tokens

```css
:root {
  /* ByteByteGo dark */
  --bg-primary:     #0d1117;
  --bg-secondary:   #161b22;
  --bg-card:        #1c2128;
  --border:         rgba(255,255,255,0.08);

  /* Node states */
  --node-default:   #58a6ff;
  --node-active:    #f78166;
  --node-visited:   #3fb950;
  --node-comparing: #e3b341;
  --node-blocked:   #ff6e6e;
  --node-done:      #7c4dff;

  /* Edges */
  --edge-default:   #30363d;
  --edge-active:    #e3b341;
  --edge-flow:      #58a6ff;
  --edge-error:     #f85149;

  /* Text */
  --text-primary:   #e6edf3;
  --text-muted:     #8b949e;
  --text-accent:    #58a6ff;

  /* Complexity bands */
  --complexity-good:    #3fb950;  /* O(1), O(log n) */
  --complexity-ok:      #e3b341;  /* O(n), O(n log n) */
  --complexity-bad:     #f78166;  /* O(n²) */
  --complexity-worst:   #f85149;  /* O(2^n), O(n!) */

  /* Kafka */
  --kafka-producer:  #58a6ff;
  --kafka-broker:    #e3b341;
  --kafka-consumer:  #3fb950;
  --kafka-lag:       #f85149;

  /* K8s */
  --pod-running:    #3fb950;
  --pod-pending:    #e3b341;
  --pod-crash:      #f85149;
  --pod-terminating:#8b949e;

  /* JVM */
  --heap-eden:      #58a6ff;
  --heap-survivor:  #e3b341;
  --heap-old:       #7c4dff;
  --metaspace:      #3fb950;
  --gc-sweep:       #f85149;
}
```

---

# 🖼️ LAYOUT SYSTEM

## 3-Panel DSA Layout

```txt
┌─────────────────────────────────────────────────────┐
│  NAVBAR  [Topic] [Mode] [Theme] [Speed] [Interview] │
├──────────────────┬──────────────────────────────────┤
│                  │  NARRATION BAR                   │
│  VISUALIZATION   │  "Pointer i moves right..."      │
│  CANVAS          ├──────────────────────────────────┤
│                  │  CODE PANEL                      │
│  (SVG/Canvas)    │  ▶ arr[i] = arr[j]              │
│                  │    i++                           │
│                  ├──────────────────────────────────┤
│                  │  STATE PANEL                     │
│                  │  i=3  j=7  window=4              │
│                  │  max=12  sum=34                  │
├──────────────────┼──────────────────────────────────┤
│  STEP CONTROLS   │  COMPLEXITY PANEL                │
│  ⏮ ◀ ▶▶ ⏭ ↺   │  ops: 47   O(n²)   space: O(1)  │
└──────────────────┴──────────────────────────────────┘
```

---

## System Design Layout

```txt
┌─────────────────────────────────────────────────────┐
│  NAVBAR  [System] [Scenario] [Theme] [Speed]        │
├─────────────────────────────────────────────────────┤
│                                                     │
│            INFINITE CANVAS                          │
│                                                     │
│   [Client]──▶[CDN]──▶[LB]──▶[Service]──▶[DB]      │
│                         │                           │
│                      [Cache]                        │
│                                                     │
├──────────────┬──────────────────────────────────────┤
│  TIMELINE    │  LIVE METRICS                        │
│  t=0  req in │  Latency: 120ms  QPS: 18k           │
│  t=10 cache  │  CPU: 72%        Lag: 2300           │
│  t=90 DB hit │  Errors: 0.01%   p99: 340ms         │
└──────────────┴──────────────────────────────────────┘
```

---

# 📢 NARRATION ENGINE

## Rules

- max 12 words per narration line
- ELI8 language always
- sync with highlighted code line
- auto-scroll on step change
- optional TTS toggle

## Narration Templates

```js
const NARRATION = {
  compare:    (a, b)    => `Comparing ${a} and ${b}`,
  swap:       (i, j)    => `Swapping positions ${i} and ${j}`,
  found:      (val)     => `Found ${val}! Target located.`,
  miss:       ()        => `Not found here. Move right.`,
  enqueue:    (val)     => `${val} joins the queue.`,
  dequeue:    (val)     => `${val} leaves the queue.`,
  push:       (val)     => `Push ${val} onto stack.`,
  pop:        (val)     => `Pop ${val} from stack.`,
  visit:      (node)    => `Visit node ${node}.`,
  relax:      (u, v, w) => `Relax edge ${u}→${v}, cost ${w}.`,
  gcSweep:    ()        => `GC sweeps dead objects. World stops.`,
  podScale:   (n)       => `HPA scales to ${n} pods.`,
  leaderFail: (id)      => `Leader ${id} down. Election starts.`,
};
```

---

# ⏯️ STEP CONTROL SYSTEM

## Step Record Format

```js
{
  id: 42,
  action: 'swap',
  targets: [3, 7],
  state: { i: 3, j: 7, arr: [1,4,2,8,5,7] },
  narration: 'Swapping 2 and 8',
  codeLine: 14,
  complexity: { ops: 47, space: 1 }
}
```

## Controls Behavior

| Button | Action |
|--------|--------|
| ⏮ | jump to step 0 |
| ◀ | step back 1 |
| ▶ | step forward 1 |
| ⏭ | jump to last step |
| ↺ | reset + clear highlights |
| ▶▶ | auto-play at speed |
| ⏸ | pause auto-play |

Speed slider: 100ms → 2000ms per step.

---

# 📋 USAGE EXAMPLES

## Sliding Window Problem

```js
import { DSAViz } from '../shared/dsa-viz/dsa-viz-tracer.js';

const arr = [2, 1, 5, 1, 3, 2];
const k = 3;
const viz = new DSAViz('#canvas');

viz.array.render(arr);

let maxSum = 0, windowSum = 0;

// Build first window
for (let i = 0; i < k; i++) {
  windowSum += arr[i];
  viz.array.window(0, i);
  viz.narrate(`Add ${arr[i]} to window`);
  viz.sim.record({ state: { windowSum }, codeLine: 5 });
}

maxSum = windowSum;

// Slide
for (let i = k; i < arr.length; i++) {
  windowSum += arr[i] - arr[i - k];
  viz.array.window(i - k + 1, i);
  viz.array.highlight([i], 'var(--node-active)');
  viz.array.highlight([i - k], 'var(--node-visited)');
  viz.narrate(`Window [${i-k+1}..${i}] sum = ${windowSum}`);
  maxSum = Math.max(maxSum, windowSum);
  viz.sim.record({ state: { windowSum, maxSum }, codeLine: 10 });
}
```

---

## BFS Graph Traversal

```js
const nodes = ['A','B','C','D','E'];
const edges = [['A','B'],['A','C'],['B','D'],['C','E']];
const viz = new DSAViz('#canvas');

viz.graph.render(nodes, edges, { directed: false });

function bfs(start) {
  const queue = [start];
  const visited = new Set([start]);

  while (queue.length) {
    const node = queue.shift();
    viz.graph.highlightNode(node, 'var(--node-active)');
    viz.narrate(`Visit node ${node}`);
    viz.sim.record({ state: { queue: [...queue], visited: [...visited] } });

    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
        viz.graph.highlightEdge(node, neighbor, 'var(--edge-active)');
      }
    }
    viz.graph.highlightNode(node, 'var(--node-visited)');
  }
}

bfs('A');
viz.sim.play(800);
```

---

## JVM GC Simulation

```js
const jvmViz = new DSAViz('#jvm-canvas');
jvmViz.mode('jvm');

jvmViz.jvm.allocate({ id: 'obj1', size: 24, gen: 'eden' });
jvmViz.jvm.allocate({ id: 'obj2', size: 16, gen: 'eden' });
jvmViz.narrate('Objects born in Eden space');

jvmViz.jvm.minorGC();
jvmViz.narrate('Minor GC. Short-lived objects die.');

jvmViz.jvm.promote('obj1', 'survivor');
jvmViz.narrate('obj1 survives — moves to Survivor.');

jvmViz.jvm.promote('obj1', 'old');
jvmViz.narrate('obj1 old enough — promoted to Old Gen.');

jvmViz.jvm.fullGC();
jvmViz.narrate('Full GC. Stop-the-world pause begins.');
```

---

# 🔁 FAILURE SCENARIO LIBRARY

Every visualizer must include failure modes:

| System | Failure | Animate |
|--------|---------|---------|
| Kafka | leader down | ISR promotes, election arrows |
| K8s | pod OOMKill | pod turns red, restarts counter |
| K8s | node drain | pods evict, reschedule elsewhere |
| DB | deadlock | cycle arrows, wait-for graph |
| Thread | starvation | low-priority thread dims, timer grows |
| Network | packet drop | packet disappears, retransmit fires |
| Cache | thundering herd | 1000 req hit DB simultaneously |
| Circuit breaker | open | requests blocked, timer countdown |
| Raft | split brain | partition wall, two leaders red |
| JVM | OOM | heap bar fills red, crash icon |

---

# 🧪 VISUAL TEST CHECKLIST

Before shipping any visualizer:

```txt
✅ renders on empty input
✅ renders on single element
✅ renders on max size input
✅ step forward works
✅ step backward works
✅ reset clears all highlights
✅ auto-play starts and stops
✅ speed slider changes pace
✅ narration syncs with step
✅ code line highlights sync
✅ complexity updates per step
✅ failure scenario animates
✅ mobile layout fits (min 375px)
✅ dark theme renders correct colors
✅ no layout break on long arrays (n>50)
```

---

# 🚦 COMPLEXITY COLOR BANDS

Visual rule — color complexity label by class:

```txt
O(1)        ████ green    #3fb950
O(log n)    ████ green    #3fb950
O(n)        ████ yellow   #e3b341
O(n log n)  ████ yellow   #e3b341
O(n²)       ████ orange   #f78166
O(2^n)      ████ red      #f85149
O(n!)       ████ red      #f85149
```

Show ops counter live. Animate bar fill as ops grow.

---

# 🗂️ VISUAL COMPONENT FILE STRUCTURE

```txt
src/app/shared/
│
├── dsa-viz/
│   ├── dsa-viz-tracer.js       ← core tracer API
│   ├── dsa-viz-runtime.js      ← 3-panel layout engine
│   ├── dsa-viz-array.js        ← array renderer
│   ├── dsa-viz-tree.js         ← tree renderer
│   ├── dsa-viz-graph.js        ← graph renderer
│   ├── dsa-viz-matrix.js       ← matrix renderer
│   ├── dsa-viz-dp.js           ← DP table renderer
│   ├── dsa-viz-string.js       ← string renderer
│   └── dsa-viz-controls.js     ← step control UI
│
├── system-viz/
│   ├── kafka-viz.js            ← Kafka flow animator
│   ├── k8s-viz.js              ← Kubernetes animator
│   ├── jvm-viz.js              ← JVM memory animator
│   ├── network-viz.js          ← packet flow animator
│   ├── db-viz.js               ← DB internals animator
│   ├── thread-viz.js           ← concurrency animator
│   ├── aws-viz.js              ← AWS infra animator
│   └── raft-viz.js             ← distributed consensus
│
└── ui/
    ├── narration-bar.js        ← narration display
    ├── complexity-panel.js     ← ops + big-O display
    ├── code-panel.js           ← highlighted code sync
    ├── timeline-panel.js       ← timeline scrubber
    ├── metrics-panel.js        ← live metric gauges
    └── camera-controller.js   ← zoom / pan / follow
```

---

# 🎯 VISUALIZER COMPLETION CHECKLIST

Track which visualizers are built:

```txt
DSA
  ✅ Arrays + Sliding Window
  ✅ Graphs (BFS/DFS/Dijkstra)
  ⬜ Trees (BST/AVL/Heap/Trie)
  ⬜ Dynamic Programming
  ⬜ Matrix / Islands
  ⬜ String Matching

Systems
  ✅ Kafka (partitions, ISR, lag)
  ⬜ Kubernetes (pods, HPA, drain)
  ⬜ JVM (GC, heap, threads)
  ⬜ AWS (EC2, Lambda, SQS, EKS)
  ⬜ Database (MVCC, WAL, locks)
  ⬜ Networking (TCP, DNS, OSI)
  ⬜ Distributed (Raft, CAP, 2PC)
  ⬜ Concurrency (mutex, semaphore)
  ⬜ OS (scheduler, paging, I/O)
  ⬜ AI/Transformer (attention, embeddings)
```