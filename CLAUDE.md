# Study Lab — Project Rules

## 1 · Visual First — Interactive Dynamic Art
Topic = `visual(mount)` function. Must have:
- Animated state transitions (CSS + JS timers)
- Multi-tab scenarios (same concept, different angles)
- Scenario-based: "fail case?", "compare A vs B"
- Color-coded: active=orange/blue, success=green, error=red, waiting=gray
- Step/Play/Reset controls (user paced)
- Info bar: updates per state, explains WHY
- Hover = tooltip with what/why/code
- Complete flow cycle per topic
- Multiple animation styles per topic
- ByteByteGo-style + Miro-style art
- Readable: fonts/sizes for easy scanning, not over-compact

## 2 · Reusable Service Pattern
```
SimulationService { state, step(), reset(), play(), subscribe(fn) }
RenderService     { renderNodes(data), renderFlow(steps), renderComparison(items) }
```
Standalone IIFE, no globals. Polyglot: Java/Go/Python per pattern.

## 3 · Divide to Rule
- 1 concept/file, no mix
- Split big topics: "Locks" ≠ "Executors"
- File order: concept → why → visual → code → interview → tradeoffs
- Max 300 lines. Bigger? Split.

## 4 · Interview + Case Study First
1. Real-world production story
2. Concept (what, why, how)
3. Interactive visual
4. Runnable code
5. Interview Q&A (3+ Qs + follow-ups)
6. Tradeoffs (pros/cons/when)
7. Gotchas (interviewers probe these)

## 5 · Depth Layers
- L1 (30s): ELI8 one-liner — explain like 8th grader, use toy analogy
- L2 (2min): Core mechanism
- L3 (10min): Edge cases, failure modes, production gotchas
- L4 (30min): Deep internals (JMM/OS/hardware)
L1+L2 in `concept`. L3+L4 in visual tabs + interview drills.

## 6 · Angular Patterns
Signal, Router, DI, Components in app.js.
- New topic = new module IIFE
- Shared state = Signal service
- Dynamic render = component function
- Events = pub/sub topic.subscribe
- Config = options object (@Input style)
- Lifecycle = init/destroy hooks

## 7 · Examples, Tricky Parts, Interview Mode
Every topic:
- 3+ concrete examples (happy path + failure + gotcha)
- Tricky parts: ⚠️ [wrong belief] vs ✓ [reality] side-by-side
- Interview tab: Q flashes → think → reveal + follow-ups
```
scenario A (happy path)   → visual
scenario B (failure/edge) → visual
scenario C (tricky/gotcha)→ visual + interview Q
```

## 8 · DSA — Question-First Split
**Tab A — Understand:**
- ELI8 problem statement (toy analogy first)
- 2-3 worked examples: input → output step-by-step
- Wrong approaches + why they fail
- Key insight ("aha moment")

**Tab B — Algorithm Flow:**
- Step animation + executable code per step
- State viz: vars, pointers, data structures live
- Complexity proof: WHY O(n) not O(n²)
- Multi-tab: brute force → optimized

Each step: `[state] ← [code] → [complexity]`

## 9 · DSA Code-Visual-Complexity Trinity
```
┌─────────────────┬─────────────────┬──────────────┐
│  CODE (step N)  │  STATE (vars)   │  COMPLEXITY  │
│  arr[i] = x     │  i=5, arr=[...] │  ops: 47/50  │
│  ▶ i++          │  ptr: *         │  O(n²) cost  │
└─────────────────┴─────────────────┴──────────────┘
```
Failure modes tab: empty input, duplicates, negative, overflow.

## 10 · Collections — Concurrency + Visual Flows
Per type (HashMap, ArrayList, TreeMap, Queue): 3 scenarios:
1. Single-threaded (happy path)
2. Concurrent (race condition animation)
3. Performance comparison

Visuals: internal buckets/trees/chains, hash collision animation, lock contention, GC pressure.
Code: thread-safe vs unsafe side-by-side, iteration failure (ConcurrentModificationException).

## 11 · Every Explanation = Visual + Code + Interactive
No standalone text explanations. Always:
1. ELI8 concept (toy analogy → formal)
2. Live interactive visual
3. Runnable code (copy-paste standalone)
4. Real-world scenario

Code: pseudocode + Java + 1 other (Python/Go). Syntax-highlighted. Click step → highlight line + update state.

## 12 · Java — UML + Animated Flows
See **`VISUAL-DESIGN.md`** for all reusable code: palettes, animations, UML templates, interaction patterns, layout patterns, component templates.

Every Java topic MUST have:

**UML animated:** class diagram (fields/methods boxes, inheritance arrows pulse), sequence diagram (lifelines + arrows flowing), object lifecycle (`new`→constructor→methods→GC), thread state machine (NEW→RUNNABLE→RUNNING→WAITING→TERMINATED).

**JVM flows:** Stack/Heap/Metaspace boxes (objects move between), GC mark-sweep scan animation, classloader chain (Bootstrap→Extension→App), exception stack unwind, generics erasure (type at compile vs raw at runtime), autoboxing cost + Integer cache [-128,127].

**OOP analogies (8th-grade):**
- Inheritance = family tree (Dog IS-A Animal)
- Interface = job contract (multiple classes sign same contract)
- Polymorphism = same call → different worker (animated dispatch)
- Encapsulation = safe with lock (private=locked, public=door)
- Abstract vs Interface = factory blueprint vs job description

**Tricky Java (animate each):**
- `==` vs `.equals()`: two boxes → same/different memory address
- String pool: literal vs `new String()`, shared ref highlight
- `final`: ref vs value — what's actually locked
- Static vs instance: one shared box vs per-object box
- Checked vs unchecked: compiler forcing vs runtime surprise
- `synchronized`: lock acquired → other thread waits visual
- Deadlock: 2 threads, each holding 1 lock, waiting for other — circular arrow
- `volatile`: CPU cache vs main memory sync animation
- HashMap bucket→tree: linked list upgrades at 8 entries animation
- Covariant return: parent method → child overrides with subtype

**Java code style:** WRONG (red) → WHY → CORRECT (green). All snippets standalone (no missing imports). Java 8+: old vs new side-by-side (loop vs stream, etc.).

## 13 · 8th-Grade Kid Rules (CRITICAL — everywhere)
- Toy analogy BEFORE any code:
  - Thread = McDonald's worker, synchronized = one register at a time
  - HashMap = dictionary with alphabetical tabs
  - GC = janitor cleaning unused toys off the floor
  - Stack = plate pile (LIFO), Queue = movie ticket line (FIFO)
  - Interface = job description, Class = actual worker
- Labels: plain English first, tech term in parens — "memory address (pointer)", "garbage cleaner (GC)"
- Narration bar: full sentence "Now Java is doing X because Y" — no raw jargon
- Show wrong approach FIRST then correct — mirrors how kids learn

## 14 · Style Defaults
→ Full palettes/fonts/animations/layouts in **`VISUAL-DESIGN.md`**
- Default palette: P1 Dark GitHub
- Default font: JetBrains Mono (code) + Nunito (narration/labels)
- Min font 14px, line-height 1.6, generous padding
- No silent fails: show error state if visual() throws
- Cache bust: ?v=N on dsa scripts when dsa.js updates

*** Real-world load-based examples + dynamic animation = mandatory for every topic
