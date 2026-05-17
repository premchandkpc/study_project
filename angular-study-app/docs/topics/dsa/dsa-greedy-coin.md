# Coin Change (greedy)

## Quick Facts
- Area: DSA
- Tag: Greedy
- Source: `src/modules/topics/dsa/dsa-greedy-coin.js`
- Tags: `greedy`, `coin change`, `canonical`, `comparison`
- Visual coverage: live visual

## Concept
Make an amount by repeatedly choosing the largest coin that fits.

**Pattern:** Greedy choice - O(n)
**Hint:** Greedy is fast but needs a canonical coin system. Compare with DP Coin Change for counterexamples.
**Scenario:** Works for standard currencies; fails on non-canonical coin sets.

## Why It Matters
_No notes yet._

## Architecture / Mental Model
```mermaid
flowchart LR
  n0["Problem input"]
  n1["Pattern choice"]
  n2["State structure"]
  n3["Loop/recursion"]
  n4["Answer"]
  n0 --> n1
  n1 --> n2
  n2 --> n3
  n3 --> n4
```

## Runtime / Sequence
```mermaid
sequenceDiagram
  participant a0 as Problem input
  participant a1 as Pattern choice
  participant a2 as State structure
  participant a3 as Loop/recursion
  participant a4 as Answer
  a0->>a1: start
  a1->>a2: process
  a2->>a3: process
  a3->>a4: process
  a4-->>a3: result
  a3-->>a2: return
  a2-->>a1: return
  a1-->>a0: return
```

## Animation Plan
- Flow lab can use generated mental model steps above.
- UML sequence can use generated sequence diagram above.
- Architecture map can use generated area mental model above.
- Live visual exists in app: topic-specific canvas/ReactViz animation.

Flow steps:

1. Problem input
2. Pattern choice
3. State structure
4. Loop/recursion
5. Answer

## Example
_No code example configured._

## Complexity And Performance
- O(n)

## Interview Drills
_No interview drills configured._

## Trade-offs
_No trade-offs configured._

## Gotchas
_No gotchas configured._

