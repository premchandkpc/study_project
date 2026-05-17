# Trapping Rain Water

## Quick Facts
- Area: DSA
- Tag: Two Pointers
- Source: `src/modules/topics/dsa/dsa-tp-trap-rain.js`
- Tags: `two pointers`, `stack`, `array`, `hard`, `faang`, `premium`, `lc42`
- Visual coverage: live visual

## Concept
Given elevation heights, compute how much rain water gets trapped between the bars.

 **Kid explanation:** Imagine a row of cups of different sizes. After rain, water pools in the low spots between tall cups. At any spot, water depth = (tallest cup on the left, tallest cup on the right - whichever is shorter) minus the cup at that spot. Two pointers track the running max from each side!

**Pattern:** Two-pointer running max from each side - O(n) time O(1) space
**Key insight:** water[i] = min(maxLeft, maxRight)  height[i]. Process from whichever side has the smaller max.
**Scenario:** Civil engineering - calculate water retention in a terrain cross-section.

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
- O(1)

## Interview Drills
_No interview drills configured._

## Trade-offs
_No trade-offs configured._

## Gotchas
_No gotchas configured._

