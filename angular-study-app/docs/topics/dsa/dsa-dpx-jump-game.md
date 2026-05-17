# Jump Game

## Quick Facts
- Area: DSA
- Tag: DP Extended
- Source: `src/modules/topics/dsa/dsa-dpx-jump-game.js`
- Tags: `dp`, `greedy`, `array`, `reachability`, `faang`, `lc55`
- Visual coverage: live visual

## Concept
Each element is the max jump from that position. Can you reach the last index?

 **Kid explanation:** You're on lily pads in a pond. Each pad shows how far you can jump from it. [2,3,1,1,4] means pad 0 can jump up to 2 pads ahead. Track the FARTHEST pad you can possibly reach. If you ever step on a pad that's BEYOND your farthest reach, you're stuck in the water!

**Pattern:** Greedy max-reach tracking - O(n)
**Key insight:** Maintain maxReach = farthest index reachable so far. At each index i, if i > maxReach, you're stranded. Otherwise extend maxReach = max(maxReach, i + nums[i]).
**Scenario:** Level progression - can a player reach the final level given jump distances?

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

