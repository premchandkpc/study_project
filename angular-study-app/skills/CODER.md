# 🚀 AI Runtime Simulation Engine

## Real-Time Code Execution + Visual Debugging + Cinematic Algorithm Visualization

> Paste ANY coding problem → Automatically generate runtime simulation with variables, recursion, graphs, trees, stacks, queues, DP, memory, and execution flow.

---

# 🌌 FINAL VISION

You paste:

```go
func twoSum(nums []int, target int) []int {
    mp := map[int]int{}

    for i, n := range nums {
        diff := target - n

        if idx, ok := mp[diff]; ok {
            return []int{idx, i}
        }

        mp[n] = i
    }

    return nil
}
```

The system automatically creates:

- execution timeline
- variable tracking
- array visualization
- hashmap visualization
- call stack
- memory state
- loops
- condition branches
- return flow
- complexity tracking
- narration
- animations

ALL dynamically.

---

# 🧠 WHAT THE SYSTEM SHOULD DO

---

# INPUT

```txt
User pastes code
```

---

# OUTPUT

```txt
Left Side:
  Code

Right Side:
  Live Runtime Simulation

Bottom:
  Narration + Timeline + Complexity
```

---

# 🎬 FINAL UI LAYOUT

```txt
┌────────────────────┬──────────────────────────────┐
│                    │                              │
│     CODE PANEL     │      VISUAL SIMULATION       │
│                    │                              │
│ highlighted line   │ arrays / trees / graphs      │
│ current execution  │ packets / recursion / vars   │
│ breakpoints        │ memory / stack / heap        │
│                    │                              │
└────────────────────┴──────────────────────────────┘
│                                                    │
│ Timeline • Narration • Variables • Complexity      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

# 🚀 EXECUTION FLOW

```txt
Code Input
    ↓
Parser
    ↓
AST Generation
    ↓
Execution Tracer
    ↓
Runtime State Collector
    ↓
Visualization Engine
    ↓
Animation Engine
    ↓
Interactive Replay
```

---

# 🧩 MAIN ENGINE COMPONENTS

---

# 1. CODE PARSER ENGINE

Goal:
Understand:

- variables
- loops
- conditions
- recursion
- functions
- classes
- trees
- arrays
- graphs
- pointers

---

## Stack

### JavaScript/TypeScript

```txt
Acorn
Babel Parser
Esprima
```

### Go

```txt
go/parser
go/ast
```

### Java

```txt
JavaParser
ANTLR
```

### Python

```txt
ast module
```

---

# 2. AST ENGINE

Convert code into:

```txt
Abstract Syntax Tree
```

Example:

```js
for(i=0;i<n;i++)
```

becomes:

```txt
ForStatement
 ├── Init
 ├── Condition
 ├── Increment
 └── Body
```

---

# 3. EXECUTION TRACER ENGINE

MOST IMPORTANT PART.

Tracks:

- line execution
- variables
- memory
- recursion
- conditions
- mutations
- returns

---

# Example Trace

```txt
Line 1:
nums = [2,7,11,15]

Line 2:
target = 9

Line 3:
mp = {}

Line 5:
i = 0
n = 2

Line 6:
diff = 7

Line 8:
map miss

Line 12:
mp[2] = 0
```

---

# 4. STATE SNAPSHOT ENGINE

Every step creates snapshot:

```js
{
  line: 6,
  variables: {},
  arrays: {},
  maps: {},
  trees: {},
  graphs: {},
  recursionStack: [],
  heap: {},
  narration: '',
  complexity: {}
}
```

---

# 5. VISUALIZATION ENGINE

Auto-detect structures.

---

# ARRAY DETECTOR

```txt
[]int
number[]
vector<int>
list
```

Render:

- boxes
- sliding windows
- pointers
- swaps
- sorting

---

# MATRIX DETECTOR

```txt
[][]int
matrix
grid
board
```

Render:

- heatmaps
- BFS
- DFS
- flood fill
- path tracing

---

# TREE DETECTOR

```txt
TreeNode
Node.left
Node.right
```

Render:

- node graphs
- traversals
- recursion
- rotations

---

# GRAPH DETECTOR

```txt
adj
edges
graph
neighbors
```

Render:

- nodes
- edges
- Dijkstra
- BFS
- DFS
- shortest path

---

# HASHMAP DETECTOR

```txt
map
dict
HashMap
unordered_map
```

Render:

- buckets
- collisions
- inserts
- lookups

---

# STACK DETECTOR

```txt
push
pop
stack
```

Render:

- vertical stack
- frame push/pop
- recursion stack

---

# QUEUE DETECTOR

```txt
queue
enqueue
dequeue
```

Render:

- moving queue
- producer consumer

---

# DP DETECTOR

Detect:

```txt
dp[]
memo
cache
```

Render:

- DP table
- recursion tree
- memo hits

---

# 🔥 RECURSION VISUALIZER

This is HUGE.

---

# Example

```go
func fib(n int) int {
    if n <= 1 {
        return n
    }

    return fib(n-1) + fib(n-2)
}
```

---

# Visualize

```txt
fib(5)
 ├── fib(4)
 │    ├── fib(3)
 │    └── fib(2)
 └── fib(3)
```

Animations:

- function calls
- stack frames
- returns
- memo hits

---

# 🧠 MEMORY VISUALIZER

Show:

```txt
STACK
HEAP
GLOBALS
```

---

# Stack Example

```txt
┌────────────────┐
│ fib(2)         │
├────────────────┤
│ fib(3)         │
├────────────────┤
│ fib(4)         │
└────────────────┘
```

---

# Heap Example

```txt
Array → [2,7,11,15]
Map   → {2:0,7:1}
```

---

# 🎬 ANIMATION ENGINE

---

# Line Highlight

```txt
Current line glows
```

---

# Variable Change Animation

```txt
old value fades
new value pops
```

---

# Array Animation

```txt
swap
compare
sliding window
pointer move
```

---

# Tree Animation

```txt
node glow
edge traversal
rotation
```

---

# Graph Animation

```txt
path highlight
distance updates
queue animation
```

---

# Recursion Animation

```txt
stack push
stack pop
return bubble
```

---

# 📊 TIMELINE ENGINE

```txt
t=0ms
Function starts

t=20ms
Loop enters

t=40ms
Condition true

t=60ms
Map updated

t=90ms
Return triggered
```

---

# 🧾 DEBUG MODE

Show:

```txt
Current Function
Current Variables
Call Stack
Heap Objects
Executed Lines
Big O
```

---

# Example

```txt
Current Function:
twoSum()

Variables:
i = 1
n = 7
diff = 2

Map:
{2:0}

Condition:
map contains 2 → TRUE
```

---

# 🧠 AI NARRATION ENGINE

Narrates execution.

Example:

```txt
We are currently checking whether the complement 2 exists in hashmap.

Since it exists, we found the answer.
```

---

# 🎮 INTERACTIVE CONTROLS

```txt
▶ Play
⏸ Pause
⏭ Next Step
⏮ Previous Step
↺ Restart
🐢 Slow
🐇 Fast
```

---

# 🔍 BREAKPOINT ENGINE

User clicks line:

```txt
Pause execution here
```

Supports:

- line breakpoints
- condition breakpoints
- watch expressions

---

# 📈 COMPLEXITY ENGINE

Track:

```txt
Time Complexity
Space Complexity
Operations Count
Recursion Depth
Memory Usage
```

---

# Example

```txt
Operations: 14
HashMap Lookups: 5
Comparisons: 4
Recursion Depth: 3
```

---

# ☸️ ADVANCED SYSTEM DESIGN MODE

Not only algorithms.

Can simulate:

- Kubernetes
- Kafka
- Redis
- JVM
- AWS
- Networking

---

# Example

```txt
Producer sends message
 ↓
Kafka broker appends log
 ↓
Replication occurs
 ↓
Consumer polls
```

Animated.

---

# 🤖 AI DETECTION ENGINE

Automatically infer:

| Pattern        | Visualization   |
| -------------- | --------------- |
| Binary Search  | pointers        |
| Sliding Window | window          |
| DFS            | recursion       |
| BFS            | queue           |
| Dijkstra       | graph distances |
| DP             | table           |
| Heap           | binary tree     |
| Trie           | prefix tree     |

---

# 🏗️ FRONTEND ARCHITECTURE

```txt
Angular 17+
TypeScript
SCSS / CSS Variables
Angular Animations
D3.js
NgRx Signals
Web Components
PixiJS / Canvas API
```

---

# ⚙️ BACKEND EXECUTION ENGINE

---

# Java

```txt
JavaParser
ASM
ByteBuddy
```

---

# Go

```txt
go/parser
go/ast
SSA
```

---

# Python

```txt
ast
sys.settrace
```

---

# JavaScript

```txt
Babel
AST
VM sandbox
```

---

# 🔥 BEST APPROACH

DO NOT:

```txt
Just visualize manually
```

DO:

```txt
Generate visualization automatically from runtime state
```

That changes everything.

---

# 🚀 ULTIMATE EXECUTION PIPELINE

```txt
Code
 ↓
Parser
 ↓
AST
 ↓
Instrument Code
 ↓
Execute Step-by-Step
 ↓
Capture Runtime State
 ↓
Generate Snapshots
 ↓
Animate Snapshots
 ↓
Interactive Replay
```

---

# 🌟 FINAL EXPERIENCE

User pastes:

```python
def dfs(node):
    visited.add(node)

    for nei in graph[node]:
        if nei not in visited:
            dfs(nei)
```

System instantly shows:

- graph traversal
- recursion stack
- visited set
- edge traversal
- DFS order
- narration
- runtime variables
- memory changes

LIVE.

---

# 4. STATE SNAPSHOT FORMAT

Every step emitted by tracer matches this shape:

```js
{
  line:           number,    // 0-indexed source line
  variables:      object,    // all in-scope vars, safe-cloned
  arrays:         object,    // { varName: { arr[], highlights? } }
  maps:           object,    // { varName: { key: val } }
  sets:           object,    // { varName: [val, ...] }
  stack:          string[],  // call stack frames e.g. ['twoSum','main']
  recursionDepth: number,    // current call depth
  narration:      string,    // ≤12 words, ELI8
  timeLabel:      string,    // 'step N'
  ops:            number,    // total operations so far
  codeLine:       number,    // alias of line, used by code-panel highlighter
  error?:         boolean,   // true if execution threw
}
```

---

# 🗂️ CODER FILE STRUCTURE

```txt
src/app/shared/dsa-viz/
├── dsa-viz-tracer.js       ← JS execution tracer (this module)
├── dsa-viz-runtime.js      ← 3-panel layout engine + step replay
├── dsa-viz-array.js        ← array renderer (boxes, window, pointers)
├── dsa-viz-tree.js         ← tree renderer (BST, heap, trie)
├── dsa-viz-graph.js        ← graph renderer (BFS/DFS/Dijkstra)
├── dsa-viz-matrix.js       ← matrix renderer (flood fill, paths)
├── dsa-viz-dp.js           ← DP table renderer (1D, 2D, memoTree)
├── dsa-viz-string.js       ← string renderer (KMP, window, compare)
└── dsa-viz-controls.js     ← step control UI (play/pause/step/speed)

src/app/pages/coder/
├── coder.component.ts      ← Angular component wrapper
├── coder.component.html    ← 3-panel layout template
└── coder.component.scss    ← coder-specific styles
```

---

# 📋 BUILT-IN PRESETS

| Key                | Algorithm                  | Complexity        |
| ------------------ | -------------------------- | ----------------- |
| `twoSum`           | Two Sum — HashMap          | O(n) / O(n)       |
| `binarySearch`     | Binary Search              | O(log n) / O(1)   |
| `slidingWindow`    | Max Sum Subarray K         | O(n) / O(1)       |
| `fibonacci`        | Fibonacci DP               | O(n) / O(n)       |
| `validParentheses` | Valid Parens — Stack       | O(n) / O(n)       |
| `bubbleSort`       | Bubble Sort                | O(n²) / O(1)      |
| `mergeSort`        | Merge Sort                 | O(n log n) / O(n) |
| `bfs`              | BFS — Level Order          | O(V+E) / O(V)     |
| `dfs`              | DFS — Recursion            | O(V+E) / O(V)     |
| `lcs`              | Longest Common Subsequence | O(mn) / O(mn)     |

---

# 🎯 FINAL GOAL

```txt
Turn programming execution into cinematic interactive simulation.
```

---

# 🔥 END VISION

```txt
Not debugging.

BUT

watching code come alive.
```
