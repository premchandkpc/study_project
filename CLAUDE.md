# Study Lab — Project Rules (Default Memory)

## 1 · Visual First — Interactive Dynamic Art
Every topic needs a `visual(mount)` function. Not static. Must have:
- Animated state transitions (CSS transitions + JS timers)
- Multiple tabs/scenarios — show same concept from different angles
- Scenario-based: "what happens when X fails?", "compare approach A vs B"
- Color-coded states: active=orange/blue, success=green, error=red, waiting=gray
- Step/Play/Reset controls — user drives the pace
- Info bar that updates with each state explaining WHY

## 2 · Reusable Generalized Service Pattern
Write `visual()` functions as if they'll be ported to Angular services. Pattern:
```
SimulationService { state, step(), reset(), play(), subscribe(fn) }
RenderService     { renderNodes(data), renderFlow(steps), renderComparison(items) }
```
Each visual must work standalone (no shared globals) AND be easy to extract.
Concepts must be polyglot: Java/Go/Python examples for same pattern where relevant.

## 3 · Divide to Rule — Topic Granularity
- One concept per file. Never mix two unrelated concepts.
- Split large topics: e.g. "Locks" = separate file from "Executors"
- Each file: concept → why → interactive visual → code example → interview drills → tradeoffs
- Max 300 lines per topic file. If bigger, split.

## 4 · Interview + Case Study First
Structure every topic:
1. Real-world scenario / case study (production story)
2. The concept (what, why, how)
3. Visual interactive demo
4. Code example (runnable pattern)
5. Interview Q&A (3+ questions with follow-ups)
6. Tradeoffs (pros/cons/when)
7. Gotchas (the tricky points interviewers probe)

## 5 · Divide and Rule — Concept Layers
For each topic follow this depth ladder:
- Layer 1 (30s): One-line ELI5 — explain to a 10-year-old
- Layer 2 (2min): Core mechanism — how it actually works
- Layer 3 (10min): Edge cases, failure modes, production gotchas
- Layer 4 (30min): Deep internals — source code level, JMM/OS/hardware

Cover layers 1+2 in `concept`. Cover 3+4 in `visual` tabs and interview drills.

## 6 · Angular Concepts — Use All of Them
The mini-framework (app.js) already has: Signal, Router, DI, Components.
When adding new features:
- New topic category = new "module" (separate JS file, IIFE)
- Shared state = Signal-based service pattern
- Dynamic rendering = component function returning HTML
- Events = pub/sub via topic.subscribe pattern
- Config = passed as options object (like @Input())
- Lifecycle = init/destroy pattern (like ngOnInit/ngOnDestroy)

## 7 · Topic Depth — Examples, Tricky Parts, Interview Mode
For EVERY topic/scenario:
- **3+ concrete examples** per concept (not just one happy path)
- **Tricky parts section** — common mistakes, gotchas, "trick questions" interviewers ask
- **Interview mode visual tab** — Q flashes on screen, user thinks, click to reveal answer + follow-ups
- Tricky parts must be visual: show WRONG behavior vs CORRECT behavior side by side
- Format tricky parts as: "⚠️ [what beginners think] vs ✓ [what actually happens]"

Example structure for each scenario:
```
scenario A (happy path)  →  visual
scenario B (failure/edge) → visual  
scenario C (tricky/gotcha)→ visual + interview Q
```

## 8 · Coding Problems — Question-First Split
For DSA/coding problems, divide into TWO clear sections:

**Section A — Understand the Question** (BEFORE showing visual flow):
- Problem statement in plain English (ELI10)
- 2-3 worked examples with input → output shown step by step
- What makes this problem tricky (constraints, edge cases)
- Wrong approaches people try first (and why they fail)
- Key insight / "aha moment" that unlocks the solution

**Section B — Visual Algorithm Flow** (AFTER question is understood):
- Step-by-step algorithm animation
- State at each step
- Why each decision is made
- Complexity proof visual (show WHY it's O(n) not O(n²))

Keep Section A and Section B as separate tabs in the visual, clearly labeled.

## General Style Defaults
- Dark theme: bg=#161b22, border=#30363d, text=#cdd9e5, active=#1f6feb
- Monospace font everywhere in visuals
- Kid-friendly explanations with real-world analogies (no dry algorithmic text)
- No silent failures: always show error state visually if visual() throws
- Cache bust: increment ?v=N on ALL dsa scripts when dsa.js changes
- No comments in code unless WHY is non-obvious
