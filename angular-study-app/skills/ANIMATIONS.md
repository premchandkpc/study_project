# Animation Engines Reference

All animation engines in this project. Use these before building anything new.

---

## 1. DSAViz Engine (`src/shared/dsa-viz/`)

Core tracer-based system for algorithm visualization.

### Files

| File                      | Exposes                              | Purpose                                             |
| ------------------------- | ------------------------------------ | --------------------------------------------------- |
| `dsa-viz-core.js`         | `window.DSAViz` namespace            | Base namespace                                      |
| `dsa-viz-tracer.js`       | `DSAViz.tracer.run(code, opts)`      | Executes JS code, captures variable/array snapshots |
| `dsa-viz-runtime.js`      | `DSAViz.runtime.create(mount, opts)` | 3-panel layout: code \| viz \| controls             |
| `dsa-viz-array.js`        | `DSAViz.array.*`                     | Array cell rendering, pointers, windows             |
| `dsa-viz-graph.js`        | `DSAViz.graph.*`                     | Graph node/edge SVG rendering                       |
| `dsa-viz-tree.js`         | `DSAViz.tree.*`                      | Binary tree rendering                               |
| `dsa-viz-dp.js`           | `DSAViz.dp.*`                        | DP table (1D/2D) rendering                          |
| `dsa-viz-matrix.js`       | `DSAViz.matrix.*`                    | Grid/matrix rendering                               |
| `dsa-viz-string.js`       | `DSAViz.string.*`                    | String character visualization                      |
| `dsa-viz-topic-render.js` | `DSAViz.topic.render(mount, opts)`   | Simple helper: render without OOP                   |

### DSAViz.tracer.run(code, opts)

```js
const steps = DSAViz.tracer.run(code, {
  arrays: {
    arr: true, // capture this array name
    nums: true,
    result: true,
  },
  vars: ["i", "j", "left", "right", "sum", "result"],
});
// returns: [{ line, variables, arrays, codeLine, ... }, ...]
```

### DSAViz.runtime.create(mount, opts)

```js
const rt = DSAViz.runtime.create(mount, {
  title: "sliding.maxSumFixed",
  code: `function maxSum(arr, k) { ... }`, // populates code panel
  timeComplexity: "O(n)",
  spaceComplexity: "O(1)",
});
rt.animate(steps);
```

**Layout:** left column = code panel (top) + narration + tabs / right column = viz panel (full height)

### DSAViz.topic.render(mount, opts)

```js
DSAViz.topic.render(mount, {
  title: "myAlgo",
  time: "O(n)",
  space: "O(1)",
  code: `function myAlgo(arr) { ... }\nconst result = myAlgo([1,2,3]);`,
  tracer: { arrays: { arr: true }, vars: ["i", "sum"] },
});
```

Use when you don't need the OOP template pattern.

---

## 2. DSA OOP Layer (`src/shared/dsa-viz/models/` + `templates/`)

OOP base classes that use DSAViz tracer internally.

### DSAProblem (base class)

**File:** `src/shared/dsa-viz/models/dsa-problem.model.js`
**Exposes:** `window.DSA.Problem`

```js
class MyProblem extends window.DSA.Problem {
  getPatternLabel() {
    return "My Pattern";
  }
  getTracerOpts() {
    return { arrays: { arr: true }, vars: ["i", "sum"] };
  }
  postProcess(steps) {
    return steps.map((step) => {
      if (!step.phase) step.phase = "scan";
      return step;
    });
  }
}
```

Usage in `visual(mount)`:

```js
new MyProblem(mount, {
  title: "myAlgo",
  time: "O(n)",
  space: "O(1)",
  code: `...algorithm code...\nconst result = myAlgo(arr);`,
}).render();
```

### DSAStep

**File:** `src/shared/dsa-viz/models/dsa-step.model.js`
**Exposes:** `window.DSA.Step`

Fields: `line, variables, arrays, highlight, pointers, windowRange, phase, codeLine, narration, timeLabel, ops`

```js
DSA.Step.fromTracer(rawStep); // convert tracer output
step.with({ phase: "found" }); // immutable update
```

### Template Subclasses

| Class                      | File                         | Pattern             | Default vars watched                 |
| -------------------------- | ---------------------------- | ------------------- | ------------------------------------ |
| `DSA.SlidingWindowProblem` | `sliding-window.template.js` | Sliding Window      | left, right, windowSum, maxLen, k, i |
| `DSA.TwoPointerProblem`    | `two-pointer.template.js`    | Two Pointer         | left, right, slow, fast, lo, hi      |
| `DSA.BinarySearchProblem`  | `binary-search.template.js`  | Binary Search       | lo, hi, mid                          |
| `DSA.DPProblem`            | `dp-problem.template.js`     | Dynamic Programming | dp[], memo, coins, nums              |
| `DSA.GraphProblem`         | `graph-problem.template.js`  | Graph BFS/DFS       | queue, visited, path, dist           |
| `DSA.StackProblem`         | `stack-problem.template.js`  | Monotonic Stack     | stack, heights, temps                |
| `DSA.BacktrackingProblem`  | `backtracking.template.js`   | Backtracking        | current, path, results               |
| `DSA.GreedyProblem`        | `greedy-problem.template.js` | Greedy              | activities, jobs, selected           |

### Phase Labels (used in postProcess)

- Sliding Window: `expand`, `shrink`, `found`, `scan`
- Two Pointer: `move-left`, `move-right`, `found`, `scan`
- Binary Search: `go-left`, `go-right`, `found`, `midpoint`
- DP: `base`, `fill`, `compute`, `done`
- Graph: `enqueue`, `dequeue`, `visit`, `relax`, `found`
- Stack: `push`, `pop`, `compute`, `match`
- Backtracking: `choose`, `backtrack`, `found`, `recurse`
- Greedy: `sort`, `select`, `skip`, `done`

---

## 3. DSA Animation Utilities (`src/shared/dsa-viz/animations/`)

Lower-level renderers called inside `renderStep` or template `postProcess`.

### DSA.ArrayAnimation

**File:** `src/shared/dsa-viz/animations/array.animation.js`

```js
// Render colored array cells
DSA.ArrayAnimation.render(el, arr, opts);

// Opts helpers:
DSA.ArrayAnimation.windowOpts(left, right, "#58a6ff"); // highlight window
DSA.ArrayAnimation.twoPointerOpts(leftIdx, rightIdx); // L=yellow, R=orange
DSA.ArrayAnimation.binarySearchOpts(lo, mid, hi); // lo/mid/hi
DSA.ArrayAnimation.visitedOpts(visitedIndices); // dim visited
DSA.ArrayAnimation.renderStack(el, stack); // vertical stack viz
```

### DSA.GraphAnimation

**File:** `src/shared/dsa-viz/animations/graph.animation.js`

```js
// Render SVG graph with node-edge diagram
DSA.GraphAnimation.render(el, graph, state);
// graph = { nodes: [{id, label}], edges: [{from, to, weight}] }
// state = { visited: Set, visiting: Set, path: [], queue: [] }

// Extract state from tracer step
DSA.GraphAnimation.stateFromStep(step);
```

Node colors: unvisited=gray, visiting=blue, visited=green, path=orange, queue=purple

### DSA.DPAnimation

**File:** `src/shared/dsa-viz/animations/dp.animation.js`

```js
// 1D dp array
DSA.DPAnimation.render1D(el, dp, { current, sources, result });

// 2D dp table (LCS, edit distance)
DSA.DPAnimation.render2D(el, dp, { currentCell, rowLabels, colLabels });

// Memoization cache chips
DSA.DPAnimation.renderMemo(el, memo, currentKey);
```

---

## 4. ReactViz Engine (`src/shared/react-viz/`)

Pre-defined step animation system for React concept visualizations.
No code tracer — steps are hand-defined in each topic file.

### Files

| File                                     | Exposes                  | Purpose                              |
| ---------------------------------------- | ------------------------ | ------------------------------------ |
| `react-viz-core.js`                      | `window.ReactViz`        | Panel engine, play/pause, CSS        |
| `animations/component-tree.animation.js` | `ReactViz.ComponentTree` | React component hierarchy            |
| `animations/hook-timeline.animation.js`  | `ReactViz.HookTimeline`  | Hook call order grid                 |
| `animations/fiber.animation.js`          | `ReactViz.FiberTree`     | Fiber work loop tree                 |
| `animations/flow-diagram.animation.js`   | `ReactViz.FlowDiagram`   | Architecture flow (Redux, RSC, etc.) |

### ReactViz.panel(mount, opts)

```js
ReactViz.panel(mount, {
  title: 'useState & useEffect Lifecycle',
  time:  'O(1) render',
  space: 'O(h) hook list',
  steps: [
    {
      phase: 'render',              // controls color of phase badge
      narration: 'Step 1 — ...',   // shown in narration bar
      // any custom fields your renderStep needs:
      tree: { ... },
      code: `...`,
      hooks: [ ... ],
    },
    // more steps...
  ],
  renderStep: function(vizEl, codeEl, step, stepIndex) {
    // vizEl = right column (visualization)
    // codeEl = left column (code/details)
    ReactViz.ComponentTree.render(vizEl, step.tree);
    codeEl.innerHTML = ReactViz.label('CODE') + ReactViz.codeBlock(step.code);
  },
});
```

**Phase colors:**
| Phase | Color |
|-------|-------|
| render | #58a6ff (blue) |
| commit | #ffa657 (orange) |
| effect | #3fb950 (green) |
| cleanup | #d2a8ff (purple) |
| update | #f0883e (orange-red) |
| unmount | #f85149 (red) |
| suspend | #d2a8ff (purple) |
| resolve | #3fb950 (green) |
| idle | #768390 (gray) |

### ReactViz.ComponentTree.render(el, tree)

```js
ReactViz.ComponentTree.render(el, {
  name: "App",
  type: "component", // 'component'|'dom'|'memo'|'context'|'provider'|'suspense'
  state: { count: 0, data: null },
  props: { onClick: "fn" },
  rerender: true, // shows orange "re-render" badge + glow
  skipped: true, // dims to 55% + shows "skipped" badge
  children: [
    { name: "Header", type: "memo", skipped: true },
    { name: "UserList", type: "component", rerender: true, props: { items: "[...]" } },
  ],
});
```

### ReactViz.HookTimeline.render(el, hooks, renderPhase, renderNum)

```js
ReactViz.HookTimeline.render(
  el,
  [
    { name: "useState", label: "count", value: 0, active: true, phase: "render" },
    { name: "useEffect", label: "title", active: false, phase: "idle", deps: ["count"] },
    { name: "useMemo", label: "sorted", active: false, phase: "idle", deps: ["items"] },
  ],
  "render",
  1
);
// renderPhase: 'render'|'commit'|'effect'|'cleanup'
// renderNum: which render cycle (1, 2, 3...)
```

Hook name colors: useState=#58a6ff, useEffect=#3fb950, useMemo=#d2a8ff, useCallback=#ffa657, useRef=#79c0ff, useContext=#f0883e

### ReactViz.FiberTree.render(el, fiberTree, phase, currentFiberName)

```js
ReactViz.FiberTree.render(
  el,
  {
    tag: "HostRoot",
    name: "Root",
    state: "idle",
    children: [
      {
        tag: "FunctionComponent",
        name: "App",
        state: "beginWork",
        children: [
          {
            tag: "HostComponent",
            name: "div",
            state: "idle",
            effectTag: "UPDATE",
            children: [{ tag: "HostComponent", name: "h1", state: "completeWork" }],
          },
        ],
      },
    ],
  },
  "beginWork",
  "App"
);
// Fiber states: 'idle'|'beginWork'|'completeWork'|'commit'|'skip'|'error'
// currentFiberName: highlights this fiber with glow border
```

State colors: idle=gray, beginWork=blue, completeWork=green, commit=orange, skip=dimmed, error=red

### ReactViz.FlowDiagram.render(el, nodes, edges, opts)

```js
ReactViz.FlowDiagram.render(
  el,
  [
    { id: "store", label: "Redux Store", sublabel: "{ count: 5 }", type: "store", active: true },
    { id: "comp", label: "Counter", sublabel: "useSelector", type: "component", active: true },
    { id: "dim", label: "UserList", type: "component", dim: true },
  ],
  [{ from: "store", to: "comp", label: "value", active: true, color: "#3fb950" }],
  { layout: "vertical" }
); // 'vertical'|'horizontal'|'grid'
```

Node type colors:
| Type | Color |
|------|-------|
| component | #58a6ff (blue) |
| store | #ffa657 (orange) |
| action | #3fb950 (green) |
| reducer | #f85149 (red) |
| selector | #d2a8ff (purple) |
| server | #3fb950 (green) |
| client | #58a6ff (blue) |
| network | #768390 (gray) |
| cache | #ffa657 (orange) |
| context | #d2a8ff (purple) |
| hook | #79c0ff (light blue) |

### ReactViz Utility Functions

```js
ReactViz.esc(str); // HTML escape
ReactViz.codeBlock(code); // styled <pre> block, JetBrains Mono, 12px
ReactViz.label(text); // section header label (10px, uppercase, gray)
ReactViz.pill(label, color); // colored badge pill
```

---

## 5. Legacy Simple Animations (in topic files)

Some older topic files (sysdesign, kafka, microservices) use inline HTML/CSS animations.
These are self-contained inside the `visual(mount)` function — no shared engine.

Patterns used:

- **Flow diagrams** — CSS flexbox boxes + arrow `::after` pseudo-elements
- **Timeline animations** — CSS `@keyframes` with `animation-delay` stagger
- **State machines** — CSS grid with color transitions on JS interval
- **Packet animations** — `requestAnimationFrame` moving elements
- **Comparison tables** — pure HTML table with color coding

When adding new sysdesign/kafka visuals, prefer `ReactViz.FlowDiagram` or inline CSS animations.

---

## Naming Conventions

| Thing            | Convention                          | Example                                     |
| ---------------- | ----------------------------------- | ------------------------------------------- |
| DSA topic file   | `dsa-<pattern>-<problem>.js`        | `dsa-sw-max-sum-fixed.js`                   |
| React topic file | `react-<concept>.js`                | `react-hooks-state-effect.js`               |
| Java topic file  | `java-<topic>.js`                   | `java-jvm-memory-gc.js`                     |
| Window global    | `window.DSA.*`, `window.ReactViz.*` | —                                           |
| Topic array      | `window.<AREA>_TOPICS`              | `window.REACT_TOPICS`, `window.JAVA_TOPICS` |

---

## Load Order (index.html)

```
1. dsa-viz engine (core → array → graph → tree → dp → matrix → string → runtime → tracer)
2. react-viz engine (core → component-tree → hook-timeline → fiber → flow-diagram)
3. DSA OOP (dsa-step.model → dsa-problem.model → array.animation → graph.animation → dp.animation)
4. DSA templates (sliding-window → two-pointer → binary-search → dp → graph → stack → backtracking → greedy)
5. Angular core (signal → injector → constants → models → utils)
6. All topic data files (java, golang, python, microservices, sysdesign, kafka, rust, angular, react, databases, agents, dsa)
7. Angular services → store → shared/components → layouts → components → app.component.js
8. Prism syntax highlighting
```

**Critical:** engines (steps 1-4) MUST load before topic files (step 6).

---

# 🚀 Advanced Interactive Visualization Layer

## Goal

Transform learning from:

```txt
Reading concepts → Watching systems alive
Static diagrams → Interactive simulations
Simple animations → Production-grade cinematic flows
```

Inspired by:

- ByteByteGo
- Excalidraw
- Miro
- Linear
- Figma
- Vercel
- Arc Browser

---

# Interactive Whiteboard Engine

Directory:

```txt
src/shared/whiteboard/
```

Files:

```txt
whiteboard-core.js
whiteboard-canvas.js
whiteboard-node.js
whiteboard-edge.js
whiteboard-packets.js
whiteboard-draw.js
whiteboard-sticky.js
whiteboard-grid.js
whiteboard-minimap.js
whiteboard-timeline.js
```

Features:

- Infinite zoom canvas
- Pan + drag
- Mini-map navigation
- Sticky notes
- Excalidraw-style hand drawing
- Animated packet flow
- Architecture diagrams
- Real-time highlights
- Multi-select nodes
- Smooth transitions
- Focus mode
- Playback timeline

---

# Whiteboard Canvas

```js
const board = Whiteboard.Canvas.create(mount, {
  zoom: true,
  pan: true,
  minimap: true,
  infinite: true,
  darkMode: true,
  smoothScroll: true,
  grid: true,
});
```

Visual Feel:

- Miro-style infinite board
- Figma smooth zoom
- Linear animations
- Glassmorphism panels
- Floating controls

---

# Architecture Nodes

```js
Whiteboard.Node.create({
  id: "api-gateway",
  label: "API Gateway",
  type: "gateway",
  x: 200,
  y: 100,
  glow: true,
  draggable: true,
});
```

Supported Node Types:

```txt
service
gateway
database
cache
kafka
lambda
kubernetes
pod
external-api
ai-agent
vector-db
queue
cdn
dns
browser
mobile
```

Animations:

- Glow pulse
- Border beam
- Traffic flash
- Queue shaking
- CPU spike effect
- Failure blinking
- Auto scaling pulse
- Packet highlight

---

# Animated Packet Flow

```js
Whiteboard.PacketFlow.animate(board, {
  from: "browser",
  to: "cdn",
  label: "GET /feed",
  speed: 2,
  repeat: true,
});
```

Visualizes:

- HTTP
- HTTPS
- gRPC
- Kafka messages
- DB queries
- DNS resolution
- Kubernetes networking
- Service mesh traffic
- Redis cache calls
- AI agent flows

Effects:

- Moving packets
- Beam trails
- Retry loops
- Circuit breaker open
- Slow latency
- Failure drops
- Queue buffering

---

# Cinematic System Design Engine

Directory:

```txt
src/shared/sysdesign-cinematic/
```

Files:

```txt
cinematic-core.js
cinematic-camera.js
cinematic-focus.js
cinematic-traffic.js
cinematic-failure.js
cinematic-scale.js
cinematic-load.js
```

Purpose:
Create ByteByteGo-style animated system storytelling.

---

# Example Flow

```js
CineFlow.play({
  title: "Instagram Feed Request",
  scenes: [
    {
      zoomTo: "mobile-client",
      narration: "User opens Instagram",
    },
    {
      animatePacket: {
        from: "client",
        to: "cdn",
      },
    },
    {
      zoomTo: "feed-service",
      narration: "Feed service builds personalized feed",
    },
  ],
});
```

Effects:

- Smooth camera zoom
- Focus glow
- Traffic animation
- Load spikes
- Failure explosions
- Retry storms
- Queue congestion
- Slow motion debugging
- Dynamic highlights

---

# Interactive Timeline Playback

```js
Timeline.play([
  {
    t: 0,
    action: "dns-lookup",
  },
  {
    t: 100,
    action: "tcp-handshake",
  },
  {
    t: 200,
    action: "tls-negotiation",
  },
  {
    t: 400,
    action: "http-request",
  },
]);
```

Useful For:

- Browser lifecycle
- Kubernetes scheduling
- Kafka rebalance
- Raft election
- JVM GC
- Lambda cold starts
- TCP/IP
- CDN routing
- DNS resolution

---

# Live Architecture Playground

Directory:

```txt
src/shared/arch-playground/
```

Features:

- Drag microservices
- Connect APIs
- Create Kafka topics
- Simulate scaling
- Introduce failures
- Add latency
- Kill pods
- Watch retries
- Simulate autoscaling
- Observe bottlenecks

Example:

```js
ArchPlayground.create(mount, {
  services: [
    { id: "gateway", replicas: 2 },
    { id: "feed-service", replicas: 5 },
    { id: "redis", replicas: 3 },
  ],
});
```

---

# Production Monitoring Layer

Visualize:

- Grafana metrics
- Prometheus stats
- Distributed tracing
- Jaeger spans
- Kafka lag
- Pod CPU
- Memory spikes
- GC pauses
- Error rates
- Request throughput

Example:

```js
MetricsPanel.render({
  rps: 1240,
  latency: "82ms",
  cpu: "67%",
  errors: "0.2%",
});
```

---

# Kubernetes Simulation Engine

Visualize:

```txt
Scheduler
kubelet
API server
etcd
controller manager
HPA
Ingress
DNS
Service mesh
Pod lifecycle
Rolling deployments
Autoscaling
```

Animations:

- Pod spawning
- CrashLoopBackOff
- Traffic balancing
- Node failure
- Self healing
- Rolling updates
- Scaling bursts

---

# Kafka Cinematic Visualization

Visualize:

```txt
Producer
Broker
Partition
Leader election
ISR
Replication
Consumer groups
Lag
Retries
DLQ
Rebalancing
```

Animations:

- Message movement
- Partition writes
- Replica sync
- Consumer lag
- Leader failover
- Retry storms

---

# AI / LLM Visualization Layer

Visualize:

```txt
Token generation
Attention maps
Embeddings
Vector search
RAG pipelines
Agents
Tool calling
Memory retrieval
Prompt chaining
MCP workflows
```

Animations:

- Token streaming
- Attention glow
- Embedding movement
- Retrieval pipelines
- Agent planning graphs

---

# Modern UX Enhancements

Add:

```txt
Command palette
Floating toolbar
Mini-map
Playback controls
Spotlight mode
Focus mode
Animated sidebars
Keyboard shortcuts
Smooth transitions
Interactive overlays
```

---

# Recommended Animation Styles

```css
.glow {
  box-shadow:
    0 0 10px rgba(88, 166, 255, 0.5),
    0 0 20px rgba(88, 166, 255, 0.3);
}

.floating {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0px);
  }
}

.pulse {
  animation: pulse 1.8s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
}

.beam {
  position: relative;
  overflow: hidden;
}

.beam::after {
  content: "";
  position: absolute;
  top: 0;
  left: -120%;
  width: 120%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: beamMove 2s infinite;
}

@keyframes beamMove {
  100% {
    left: 120%;
  }
}
```

---

# Best Educational Upgrade

Most powerful improvement:

```txt
Concepts become simulations.
Systems become visual stories.
Infrastructure becomes interactive.
Learning becomes experiential.
```

That creates deep intuition instead of memorization.

---

# 6. Whiteboard Canvas Engine

Directory: `src/shared/whiteboard/`

## Files

```txt
whiteboard-core.js
whiteboard-canvas.js
whiteboard-node.js
whiteboard-edge.js
whiteboard-packets.js
whiteboard-draw.js
whiteboard-sticky.js
whiteboard-grid.js
whiteboard-minimap.js
whiteboard-timeline.js
```

## API

```js
const board = Whiteboard.Canvas.create(mount, {
  zoom: true,
  pan: true,
  minimap: true,
  infinite: true,
  darkMode: true,
  smoothScroll: true,
  grid: true,
});
```

Visual feel: Miro infinite board + Figma smooth zoom + Linear animations + glassmorphism panels + floating controls.

## Node Types

```txt
service · gateway · database · cache · kafka · lambda
kubernetes · pod · external-api · ai-agent · vector-db
queue · cdn · dns · browser · mobile
```

## Node Animations

| Animation          | When                         |
| ------------------ | ---------------------------- |
| Glow pulse         | active/selected node         |
| Border beam        | traffic flowing through node |
| Traffic flash      | request arrives              |
| Queue shaking      | queue full / backpressure    |
| CPU spike effect   | high load metric             |
| Failure blinking   | error / crash state          |
| Auto scaling pulse | new replica spawning         |
| Packet highlight   | packet passing through       |

## Packet Flow API

```js
Whiteboard.PacketFlow.animate(board, {
  from: "browser",
  to: "cdn",
  label: "GET /feed",
  protocol: "HTTPS", // colors from PROTOCOL_COLORS
  speed: 2,
  repeat: true,
});
```

Packet effects: moving dot, beam trail, retry loop, circuit-breaker-open fade, slow-latency stretch, failure drop, queue buffer stack.

---

# 7. Cinematic System Design Engine

Directory: `src/shared/sysdesign-cinematic/`

## Files

```txt
cinematic-core.js
cinematic-camera.js
cinematic-focus.js
cinematic-traffic.js
cinematic-failure.js
cinematic-scale.js
cinematic-load.js
```

## CineFlow API

```js
CineFlow.play({
  title: "Instagram Feed Request",
  scenes: [
    { zoomTo: "mobile-client", narration: "User opens Instagram" },
    { animatePacket: { from: "client", to: "cdn", protocol: "HTTPS" } },
    { animatePacket: { from: "cdn", to: "api-gateway", protocol: "HTTPS" } },
    { zoomTo: "feed-service", narration: "Feed service builds personalized feed" },
    {
      animatePacket: {
        from: "feed-service",
        to: "redis",
        protocol: "TCP",
        label: "GET feed:user:123",
      },
    },
    { animatePacket: { from: "redis", to: "feed-service", label: "MISS → fallback to DB" } },
    { zoomTo: "cassandra", narration: "Timeline fetched from Cassandra" },
  ],
});
```

Camera effects: smooth cubic-bezier pan/zoom, focus glow, dim non-active nodes.
Traffic effects: packet moving dot, load spike bar, failure explosion, retry storm bouncing arrows, queue congestion fill, slow-motion debug.

---

# 8. Interactive Timeline Playback Engine

Needed for: browser lifecycle, Kubernetes scheduling, Kafka rebalance, Raft election, JVM GC, Lambda cold starts, TCP/IP, CDN routing, DNS resolution.

```js
Timeline.play([
  { t: 0, action: "dns-lookup", label: "DNS resolve api.example.com" },
  { t: 50, action: "tcp-handshake", label: "SYN → SYN-ACK → ACK" },
  { t: 80, action: "tls-negotiation", label: "TLS 1.3 handshake (1-RTT)" },
  { t: 130, action: "http-request", label: "GET /feed HTTP/2" },
  { t: 180, action: "server-process", label: "Auth → cache lookup → DB" },
  { t: 300, action: "response", label: "200 OK (compressed, 82ms)" },
]);
```

Timeline renders as horizontal swimlane. Each action = labeled block at time offset. Active action = highlighted. Scrubbar to jump to any point.

---

# 9. Failure Simulation Animation System

Each failure scenario has a defined animation sequence. Reference for building failure overlays.

## Kafka Broker Failure

```txt
1. Broker box → flash red (#f85149)
2. Producer arrows → bounce back (rejected)
3. Consumer lag bar → fill orange → red
4. Partition leader election → dotted circle animation around replicas
5. ISR badge → shrinks (3 → 2 → 1)
6. New leader → highlight green
7. Lag bar → drain (recovery)
```

## Thundering Herd

```txt
1. Cache node → gray flash (MISS)
2. All client arrows → simultaneous rush to DB
3. DB connection pool → red fill (saturated)
4. New requests → queue up (stacking dots)
5. DB response → slow (stretched timeline bar)
6. Cache → fill green (warming)
7. New requests → hit cache (fast green arrows)
```

## Circuit Breaker Open

```txt
1. Downstream service → error flash red
2. Error counter → increment rapidly
3. Circuit breaker node → open animation (switch icon flips)
4. New requests → deflect to fallback (dashed arrow)
5. Fallback → response (cached/static)
6. Timer → counts down (half-open attempt)
7. Probe request → success → circuit closes (switch flips back)
```

## Pod CrashLoopBackOff

```txt
1. Pod box → red flash + "OOMKilled" label
2. Restart counter badge → increments
3. Backoff timer → exponential delay bar grows
4. Traffic → rerouted to healthy pods (balancer arrows shift)
5. After N restarts → pod dims with "CrashLoopBackOff" badge
6. Alert fires → Prometheus → Alertmanager → PagerDuty
```

---

# 10. Production Monitoring Layer

## MetricsPanel API

```js
MetricsPanel.render(el, {
  rps: 1240,
  latency: { p50: "12ms", p95: "44ms", p99: "120ms" },
  cpu: 67, // percent
  memory: 58, // percent
  errors: 0.2, // percent
  queueLag: 4500, // ms
});
```

Renders as overlay card on service node. Live update via setInterval or WebSocket.

## Overlay Types

| Overlay         | Shows                                   |
| --------------- | --------------------------------------- |
| MetricsOverlay  | RPS, latency, CPU, memory, error rate   |
| FailureOverlay  | error flash, crash state, retry count   |
| TrafficOverlay  | packet flow rate, hot paths highlighted |
| LatencyOverlay  | P50/P95/P99 heat bands on connections   |
| SecurityOverlay | mTLS badge, auth flow, VPC boundary     |

---

# 11. Kubernetes Simulation Engine

## Pod Lifecycle Animation

```txt
Pending → (scheduler scores nodes) → Scheduled → (kubelet pulls image) → Running → (probe passes) → Ready
```

## Autoscaling Animation (HPA)

```txt
1. CPU metric bar → climbs past threshold (70%)
2. HPA → trigger (badge pulses)
3. New pod → spawns (box appears, scales from 0 to 1)
4. Scheduler → binds to node (arrow to node)
5. Readiness probe → passes (green check)
6. Load balancer → includes new pod (traffic arrows fan out)
7. CPU per pod → drops (green bars fall)
```

## Rolling Deployment Animation

```txt
v1 pods: [■ ■ ■ ■] → terminate one
v2 pod:  [■ ■ ■ □] [▣] spawning
         [■ ■ □ □] [▣ ■] v2 ready
         [□ □ □ □] [■ ■ ■ ■] complete
```

---

# 12. AI/LLM Visualization Layer

## Token Generation Animation

```txt
Prompt tokens → input embedding matrix (animated cells fill)
Attention → heat map (colored attention weights matrix)
FFN layer → transform (node activations)
Output logits → softmax → sampled token → appears in stream
```

## RAG Pipeline Animation

```txt
Query → embedding model → query vector
query vector → ANN search → top-K chunks (similarity scores)
chunks + query → LLM context assembly
LLM → streamed response (token by token)
```

## Agent Tool Call Animation

```txt
LLM → plan step (thought bubble)
plan → tool call (arrow to tool node)
tool → result (arrow back)
LLM → integrate result (glow)
loop: next step OR final answer
```

---

# 13. Animation CSS Standards

Global animation CSS classes. Apply consistently across all visualizations.

```css
/* Glow: active/selected nodes */
.viz-glow {
  box-shadow:
    0 0 10px rgba(88, 166, 255, 0.5),
    0 0 20px rgba(88, 166, 255, 0.3);
}

/* Floating: idle interactive nodes */
.viz-float {
  animation: vizFloat 4s ease-in-out infinite;
}
@keyframes vizFloat {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-8px);
  }
  100% {
    transform: translateY(0px);
  }
}

/* Pulse: health check / heartbeat */
.viz-pulse {
  animation: vizPulse 1.8s infinite;
}
@keyframes vizPulse {
  0% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.03);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
}

/* Beam: traffic flowing through node */
.viz-beam {
  position: relative;
  overflow: hidden;
}
.viz-beam::after {
  content: "";
  position: absolute;
  top: 0;
  left: -120%;
  width: 120%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: vizBeam 2s infinite;
}
@keyframes vizBeam {
  100% {
    left: 120%;
  }
}

/* Error flash: failure state */
.viz-error-flash {
  animation: vizErrorFlash 0.3s ease-in-out 3;
}
@keyframes vizErrorFlash {
  0% {
    background: inherit;
  }
  50% {
    background: rgba(248, 81, 73, 0.4);
  }
  100% {
    background: inherit;
  }
}

/* Packet dot: moving along SVG path */
.viz-packet {
  offset-path: path("M0,0 L300,0"); /* override per connection */
  animation: vizPacket 1.5s linear infinite;
}
@keyframes vizPacket {
  100% {
    offset-distance: 100%;
  }
}

/* Async dash: Kafka/queue connections */
.viz-async-dash {
  stroke-dasharray: 8 4;
  animation: vizDash 1s linear infinite;
}
@keyframes vizDash {
  100% {
    stroke-dashoffset: -24;
  }
}

/* Scale spawn: new pod/replica appearing */
.viz-spawn {
  animation: vizSpawn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes vizSpawn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Lag fill: queue lag indicator */
.viz-lag-fill {
  transition:
    width 0.5s ease-in-out,
    background 0.5s;
}
/* js: el.style.width = lagPercent + '%'; */
/* js: el.style.background = lagPercent > 80 ? '#f85149' : '#ffa657'; */
```

---

# 14. Animation Orchestration Priorities

When multiple animations compete, apply priority queue:

| Priority    | Animation type               | Notes                                    |
| ----------- | ---------------------------- | ---------------------------------------- |
| 1 (highest) | Failure/error flash          | Always visible, interrupts others        |
| 2           | User-selected node highlight | Interactive feedback                     |
| 3           | Story/cinematic scenes       | Narrated flows                           |
| 4           | Packet flow (foreground)     | Active connections                       |
| 5           | Metrics overlay update       | Live values                              |
| 6           | Packet flow (background)     | Idle connections                         |
| 7 (lowest)  | Float/pulse/idle             | Ambient animations, pause when offscreen |

Use `IntersectionObserver` to pause priority 6-7 when node off-screen. Use `requestAnimationFrame` batching — never `setInterval` for visual animations.
