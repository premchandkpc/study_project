# Study Lab — Project Rules (Default Memory)

## 1 · Visual First — Interactive Dynamic Art
Topic = `visual(mount)` function. Must have:
- Animated state transitions (CSS + JS timers)
- Multi-tab scenarios (same concept, different angles)
- Scenario-based: "fail case?", "compare A vs B"
- Color-coded states: active=orange/blue, success=green, error=red, waiting=gray humanr readaable easy understandable formats formats fonts sizes etc should match my eye and i should ready easily dont over compact.
- Step/Play/Reset controls (user paced)
- Info bar: updates per state, explains WHY
- animations are must and imp for each and every bit and should create for each 
- hovering should show proper detail of the topic what why etc code also
- for each topic complete flow cycle is imp
- multiple animation styles examles for each



## 2 · Reusable Generalized Service Pattern
Write `visual()` to port to Angular services:
```
SimulationService { state, step(), reset(), play(), subscribe(fn) }
RenderService     { renderNodes(data), renderFlow(steps), renderComparison(items) }
```
Standalone (no globals), easy to extract. Support polyglot: Java/Go/Python per pattern.

## 3 · Divide to Rule — Topic Granularity
- 1 concept/file, no mix
- Split big topics: "Locks" ≠ "Executors"
- File: concept → why → visual → code → interview → tradeoffs
- Max 300 lines. Bigger? Split.

## 4 · Interview + Case Study First
Every topic structure:
1. Real-world scenario (production story)
2. Concept (what, why, how)
3. Interactive visual demo
4. Runnable code example
5. Interview Q&A (3+ questions + follow-ups)
6. Tradeoffs (pros/cons/when)
7. Gotchas (interviewers probe these)

## 5 · Depth Layers
Layer 1 (30s): ELI5 one-liner
Layer 2 (2min): Core mechanism
Layer 3 (10min): Edge cases, failure modes, production gotchas
Layer 4 (30min): Deep internals, JMM/OS/hardware

Layers 1+2 in `concept`. Layers 3+4 in `visual` tabs + interview drills.

## 6 · Angular Concepts — Use All of Them
Framework (app.js): Signal, Router, DI, Components.
Add features:
- New topic = new "module" (JS file, IIFE)
- Shared state = Signal service
- Dynamic render = component function HTML
- Events = pub/sub topic.subscribe
- Config = options object (@Input style)
- Lifecycle = init/destroy (ngOnInit/ngOnDestroy style)

## 7 · Examples, Tricky Parts, Interview Mode
Every topic needs:
- **3+ concrete examples** (not just happy path)
- **Tricky parts section** (mistakes, gotchas, trick questions)
- **Interview tab** (Q flashes, click to reveal + follow-ups)
- Tricky parts = visual: WRONG vs CORRECT side-by-side
- Format: "⚠️ [what beginners think] vs ✓ [reality]"

Structure:
```
scenario A (happy path)  →  visual
scenario B (failure/edge) → visual  
scenario C (tricky/gotcha)→ visual + interview Q
```

## 8 · DSA — Question-First Split
**Section A — Understand Question:**
- Problem statement (ELI10)
- 2-3 worked examples (input → output, step-by-step)
- Tricky parts (constraints, edge cases)
- Wrong approaches (why they fail)
- Key insight ("aha moment")

**Section B — Visual Algorithm Flow:**
- Step-by-step animation + **EXECUTABLE CODE per step**
- State viz (variables, pointers, data structures)
- Code snippet per operation
- Why each decision
- Complexity proof (show WHY O(n) not O(n²))
- Time/space breakdown with per-step cost
- Multi-tab: brute force → optimized

Separate tabs, clearly labeled. Each step: `[state] ← [code] → [complexity]`

## 9 · DSA Deep Pattern — Code-Visual-Complexity Trinity
Visual MUST show:
1. **Code panel**: Pseudocode/real code, current line marked
2. **State panel**: Live vars, indices, stack/queue, pointers
3. **Complexity tracker**: Operation count + O(f(n)) live calc
4. **Timeline**: Multi test-case side-by-side
5. **Failure modes**: Edge cases (empty, duplicates, negative, overflow)

Layout:
```
┌─────────────────┬─────────────────┬──────────────┐
│  CODE (step N)  │  STATE (vars)   │  COMPLEXITY  │
│  arr[i] = x     │  i=5, arr=[...] │  ops: 47/50  │
│  ▶ i++          │  ptr: *         │  O(n²) cost  │
└─────────────────┴─────────────────┴──────────────┘
```

## 10 · Collections — Concurrency + Visual Flows
Per collection type (HashMap, ArrayList, TreeMap, Queue): 3+ scenarios:
1. Single-threaded (happy path)
2. Concurrent (race conditions visual)
3. Performance (HashMap vs TreeMap vs LinkedList)

Code:
- Thread-safe vs unsafe side-by-side
- Before/after mutations
- Iteration failures (ConcurrentModificationException visual)

Visual flows:
- Internal structure (buckets, trees, chains)
- Hash collision animation
- Lock contention during concurrent access
- Memory/GC pressure per type

Every scenario: running code + visual.

## 11 · Every Explanation = Visual + Code + Interactive
No standalone explanations. Include:
1. Concept text (ELI5 → formal)
2. Live interactive visual
3. **Runnable code** (copy-paste, standalone)
4. Real-world scenario

Code:
- Pseudocode + 1-2 implementations (Java/Python/Go)
- Embedded in visual (not separate)
- Syntax-highlighted, executable
- Input → execute → output flow

Sync: Click "next step" in visual → highlight code line + update state vars

## 12 · Style Defaults
- Dark: bg=#161b22, border=#30363d, text=#cdd9e5, active=#1f6feb
- Monospace in visuals
- Kid-friendly + real-world analogies
- No silent fails: show error state if visual() throws
- Cache bust: ?v=N on dsa scripts when dsa.js updates
- Code: no comments unless WHY unclear


*** for each topic real world load based examples visusal dynamic animation is imp