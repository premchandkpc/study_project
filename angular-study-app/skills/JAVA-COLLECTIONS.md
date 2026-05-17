# Java Collections — New Topics Plan

**Files to create:**
- `src/modules/topics/java/java-collection-types.js`
- `src/modules/topics/java/java-concurrent-collections.js`

---

## 1. java-collection-types.js

**Title:** Java Collection Types Deep Dive
**Tag:** Data Structures
**Animation:** Multi-step ReactViz FlowDiagram per collection type — DIFFERENT layout per step

### Topics covered per step (5 steps):

#### Step 1 — Collection Hierarchy
```
Iterable
  └─ Collection
       ├─ List (ordered, duplicates OK)
       │    ├─ ArrayList  (dynamic array, O(1) get, O(n) insert)
       │    └─ LinkedList (doubly linked, O(1) add/remove ends, O(n) get)
       ├─ Set (no duplicates)
       │    ├─ HashSet       (O(1) avg, no order)
       │    ├─ LinkedHashSet (O(1) avg, insertion order)
       │    └─ TreeSet       (O(log n), sorted by comparator)
       ├─ Queue / Deque
       │    ├─ ArrayDeque    (resizable ring buffer, O(1) both ends)
       │    └─ PriorityQueue (min-heap, O(log n) poll)
       └─ Map (key-value, separate hierarchy)
            ├─ HashMap       (O(1) avg, no order, null key OK)
            ├─ LinkedHashMap (O(1), insertion/access order)
            ├─ TreeMap       (O(log n), sorted keys, NavigableMap)
            └─ EnumMap       (O(1), enum keys only, array-backed)
```
Animation: ComponentTree showing full hierarchy with type badges

#### Step 2 — ArrayList vs LinkedList internals
```
ArrayList:
  [0][1][2][3][4][ ][ ][ ]  ← Object[] backing array
  add(x): capacity check → grow 50% if needed → System.arraycopy
  get(i): O(1) — direct array index
  remove(i): O(n) — shift all elements right of i

LinkedList:
  header ↔ [A] ↔ [B] ↔ [C] ↔ header  (circular doubly-linked)
  addFirst/addLast: O(1) — pointer change only
  get(i): O(n) — must traverse from head
  implements Deque — use as stack/queue
```
Animation: DSAViz.topic.render with array tracer showing ArrayList resize + pointer animation for LinkedList

Actually for ReactViz: FlowDiagram showing both structures side-by-side with horizontal layout

#### Step 3 — Set internals (HashSet/TreeSet)
```
HashSet = HashMap<E, PRESENT>
  add("cat") → hash("cat") → bucket[hash % 16] → linked list / treeify
  O(1) avg contains/add/remove
  Load factor 0.75 → resize at 75% capacity

TreeSet = TreeMap<E, PRESENT>
  Red-black tree internally
  O(log n) add/contains/remove
  first(), last(), headSet(), tailSet(), subSet() — range queries
  floor(x), ceiling(x), lower(x), higher(x)
```
Animation: FlowDiagram — HashSet bucket chain vs TreeSet BST structure

#### Step 4 — Queue, Deque, PriorityQueue
```
ArrayDeque (preferred over Stack/LinkedList for queue use):
  Ring buffer: [ ][A][B][C][ ][ ]
  head pointer → tail pointer
  addFirst: head-- (wrap), addLast: tail++
  O(1) amortized all operations, no null allowed

PriorityQueue (min-heap by default):
  [1]
  [3][5]
  [7][4][9][8]
  poll(): remove root, sift-down → O(log n)
  peek(): O(1) — just root
  Use Comparator.reverseOrder() for max-heap
```
Animation: FlowDiagram showing ArrayDeque ring buffer + PriorityQueue heap tree

#### Step 5 — Map comparison + when to use what
```
HashMap:        O(1) get/put, no order, null key, ~16 initial capacity
LinkedHashMap:  O(1), access-order mode → LRU cache pattern
TreeMap:        O(log n), sorted, NavigableMap: floorKey, ceilingKey, subMap
EnumMap:        O(1), dense array indexed by enum ordinal, fastest for enum keys
WeakHashMap:    keys weakly referenced → entries auto-removed when key GC'd
IdentityHashMap: == comparison for keys (not .equals())
```
Animation: FlowDiagram — comparison table as nodes with use-case labels

---

## 2. java-concurrent-collections.js

**Title:** Concurrent Collections
**Tag:** Concurrency
**Animation:** ReactViz FlowDiagram — thread contention, lock-stripe visualization, copy-on-write

### Topics covered per step (5 steps):

#### Step 1 — ConcurrentHashMap internals
```
Java 8+: No global lock. Segment locking replaced by:
  - Node array (128 buckets default)
  - CAS for empty bucket insertion
  - synchronized on FIRST node of bucket for chain ops
  - putVal:
      1. hash key
      2. bucket empty? CAS insert (no lock)
      3. bucket has head? synchronized(head) { insert/update }
      4. treeify if chain > 8
  - size(): LongAdder cells (striped counters, no single bottleneck)
  - get(): NEVER locks — reads volatile Node.val
  - Null keys/values: FORBIDDEN (unlike HashMap)
```
Animation: FlowDiagram showing multiple threads hitting different buckets — no contention. Single bucket = synchronized only that bucket.

#### Step 2 — ConcurrentHashMap compute operations
```
compute(key, fn):       atomic read-modify-write
computeIfAbsent(key, fn): only if missing — good for cache loading
merge(key, val, fn):    merge new value with existing

computeIfAbsent for cache:
  cache.computeIfAbsent(userId, id -> db.loadUser(id))
  // Only ONE thread computes — others wait for that bucket lock
  // vs putIfAbsent: always evaluates the value expression

forEach(parallelism, transformer, action):
  bulk parallel operations with parallelism threshold
```
Animation: FlowDiagram — two threads computing on different keys simultaneously

#### Step 3 — CopyOnWriteArrayList
```
Write: acquire lock → copy entire array → modify copy → swap reference
Read: no lock, reads snapshot

volatile Object[] array;  // shared ref, written atomically

add(e):
  synchronized(lock) {
    Object[] snapshot = array;
    Object[] newArray = Arrays.copyOf(snapshot, len + 1);
    newArray[len] = e;
    array = newArray;  // volatile write
  }

get(i): array[i]  // reads current snapshot, no lock

Use when:
  ✓ Many reads, few writes (observer lists, plugin registries)
  ✗ Frequent writes → O(n) copy cost
  ✗ Large arrays → GC pressure from discarded snapshots
```
Animation: FlowDiagram — reader thread reads old snapshot while writer copies

#### Step 4 — BlockingQueue variants
```
ArrayBlockingQueue:  fixed capacity, single ReentrantLock
LinkedBlockingQueue: optionally bounded, TWO locks (putLock + takeLock)
PriorityBlockingQueue: unbounded, priority ordering, one lock
SynchronousQueue:   zero capacity — each put() must rendezvous with take()
DelayQueue:         elements only available after their delay expires
LinkedTransferQueue: producer can wait until consumer takes (transfer())

put():  blocks if full (await notFull condition)
take(): blocks if empty (await notEmpty condition)
offer(e, timeout): returns false if full after timeout
poll(timeout):     returns null if empty after timeout

Thread pool internals: LinkedBlockingQueue is ThreadPoolExecutor's default queue
```
Animation: FlowDiagram — producer blocks on full queue, consumer unblocks it

#### Step 5 — Other concurrent utilities: ConcurrentLinkedQueue, Exchanger, Phaser
```
ConcurrentLinkedQueue:
  Lock-free FIFO using CAS on tail pointer
  Non-blocking: offer/poll never block
  Good for work queues where blocking is unacceptable

Exchanger<T>:
  Rendezvous point: two threads swap objects atomically
  Thread A: exchange(dataA) — waits for Thread B
  Thread B: exchange(dataB) — both receive each other's data

Phaser:
  Flexible barrier like CyclicBarrier but dynamic parties
  arrive(), awaitAdvance(), arriveAndDeregister()
  Supports multiple phases (generations)

ConcurrentSkipList{Map,Set}:
  Probabilistic sorted structure, O(log n) concurrent ops
  Lock-free reads + fine-grained locking for writes
  Alternative to synchronized TreeMap
```
Animation: FlowDiagram — ConcurrentLinkedQueue CAS chain

---

## Animation Strategy — NEW animations not used in existing java topics

| Topic | Animation Approach | Rationale |
|-------|--------------------|-----------|
| Collection hierarchy | ComponentTree (provider=abstract, component=impl) | Hierarchy fits tree shape |
| ArrayList resize | FlowDiagram horizontal (array cells as nodes) | Show before/after capacity |
| HashSet buckets | FlowDiagram grid layout | Bucket chains as node chains |
| PriorityQueue heap | ComponentTree (heap tree shape) | Natural tree visualization |
| ConcurrentHashMap | FlowDiagram + multiple active nodes | Show concurrent access |
| CopyOnWrite | FlowDiagram with snapshot/copy nodes | Show two-array state |
| BlockingQueue | FlowDiagram vertical + phase=suspend/resolve | Producer/consumer wait states |

---

## Gotchas to encode in gotchas field

### Collections
- LinkedList bad cache locality — ArrayList faster for most iteration even with O(n) insert
- PriorityQueue is NOT sorted — only guarantees heap property (peek = min)
- TreeSet/TreeMap keys must be Comparable or supply Comparator — else ClassCastException at runtime
- ArrayList.subList() returns a VIEW — modifications affect original
- Arrays.asList() returns fixed-size list — add/remove throws UnsupportedOperationException

### Concurrent Collections
- ConcurrentHashMap forbids null keys/values — putIfAbsent(key, null) throws NPE
- size() on ConcurrentHashMap is approximate — not atomic across puts
- CopyOnWriteArrayList iterator is snapshot — does NOT reflect concurrent adds
- BlockingQueue.offer() returns false silently — use put() if you need blocking guarantee
- Iterating ConcurrentHashMap is weakly consistent — may or may not reflect concurrent modifications
