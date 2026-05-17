# 3Sum

## Quick Facts
- Area: DSA
- Tag: Two Pointers
- Source: `src/modules/topics/dsa/dsa-tp-three-sum.js`
- Tags: `two pointers`, `sorting`, `array`, `deduplication`, `faang`, `premium`, `lc15`
- Visual coverage: live visual

## Concept
Find all unique triplets in the array that sum to zero.

 **Kid explanation:** Sort the numbers in order. Pick one number and pretend it's fixed. Now use two friends (left pointer and right pointer) to find two other numbers that cancel it out. If the three numbers are too big, move the right friend left. Too small, move the left friend right. Skip duplicates to avoid repeats!

**Pattern:** Sort + fix one element + two-pointer on remaining - O(n)
**Key insight:** Sorting enables skipping duplicates and the two-pointer technique.
**Scenario:** Financial reconciliation - find three transactions that exactly cancel each other out.

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

