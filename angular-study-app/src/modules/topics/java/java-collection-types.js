(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    "java-collection-types",
    area:  "java",
    title: "Java Collection Types Deep Dive",
    tag:   "Data Structures",
    tags:  ["java", "collections", "list", "set", "map", "queue", "arraylist", "linkedlist", "treeset", "hashmap"],

    concept: "Java Collections Framework: Iterable → Collection → List/Set/Queue, plus Map (separate hierarchy). Each implementation trades time complexity, ordering, and memory differently. ArrayList = dynamic array O(1) get. LinkedList = doubly-linked O(1) head/tail. HashSet = HashMap-backed O(1) avg. TreeSet = red-black tree O(log n) sorted. ArrayDeque = ring buffer O(1) both ends (preferred over Stack/LinkedList). PriorityQueue = min-heap O(log n) poll.",

    why: "Choosing wrong collection causes subtle bugs and perf regressions. ArrayList vs LinkedList matters for cache locality. HashSet vs TreeSet matters for sort requirements. PriorityQueue is NOT sorted — only guarantees minimum at peek. LinkedHashMap access-order mode = LRU cache. These distinctions come up in every FAANG interview.",

    example: {
      language: "java",
      code: `// Choosing the right collection

// List — ordered, index access, duplicates OK
List<String> arr = new ArrayList<>();       // O(1) get, O(n) insert
List<String> ll  = new LinkedList<>();      // O(1) head/tail add, O(n) get

// Set — no duplicates
Set<String> hs  = new HashSet<>();          // O(1) avg, no order
Set<String> lhs = new LinkedHashSet<>();    // O(1), insertion order
Set<String> ts  = new TreeSet<>();          // O(log n), sorted

// Queue / Deque
Deque<String> dq  = new ArrayDeque<>();     // O(1) both ends, preferred
Queue<Integer> pq = new PriorityQueue<>();  // min-heap, O(log n) poll

// Map
Map<String, Integer> hm  = new HashMap<>();        // O(1) avg, null key ok
Map<String, Integer> lhm = new LinkedHashMap<>();  // O(1), insertion order
Map<String, Integer> tm  = new TreeMap<>();         // O(log n), sorted keys

// LRU cache with LinkedHashMap access-order
Map<K, V> lru = new LinkedHashMap<>(16, 0.75f, true) {
    protected boolean removeEldestEntry(Map.Entry<K,V> e) {
        return size() > MAX_SIZE;
    }
};

// PriorityQueue gotcha: NOT sorted, only heap-ordered
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.addAll(List.of(5, 1, 3, 2, 4));
System.out.println(minHeap); // [1, 2, 3, 5, 4] — NOT [1,2,3,4,5]
System.out.println(minHeap.poll()); // 1 — correct min`,
    },

    interview: [
      "ArrayList vs LinkedList — when would you choose each?",
      "HashSet vs TreeSet vs LinkedHashSet tradeoffs?",
      "How does LinkedHashMap implement LRU cache?",
      "Why is ArrayDeque preferred over Stack and LinkedList for queue use?",
      "PriorityQueue is NOT sorted — explain the heap property.",
      "TreeMap vs HashMap for range queries?",
    ],

    tradeoffs: {
      pros: [
        "ArrayList: O(1) random access, cache-friendly contiguous memory",
        "TreeSet/TreeMap: range queries (subSet, headMap, floorKey) — no sorting needed",
        "ArrayDeque: fast both ends, no null allowed but no synchronization overhead",
        "LinkedHashMap access-order: LRU in 3 lines of code",
      ],
      cons: [
        "LinkedList: poor cache locality — each node is a separate heap object",
        "TreeSet/TreeMap: O(log n) for everything — overhead vs HashMap for simple lookups",
        "PriorityQueue: O(n) contains, no efficient remove-by-value",
        "HashSet: no ordering guarantee, iteration order changes on resize",
      ],
    },

    gotchas: [
      "LinkedList is rarely the right choice — ArrayList wins even with O(n) insert due to cache locality",
      "PriorityQueue.iterator() does NOT traverse in priority order — use repeated poll()",
      "TreeSet keys must be Comparable or provide Comparator — ClassCastException at runtime if not",
      "ArrayList.subList() returns a VIEW — modifying it modifies the original",
      "Arrays.asList() returns fixed-size List — add/remove throws UnsupportedOperationException",
      "Collections.sort() uses TimSort (stable) — Collections.shuffle() uses Fisher-Yates",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — Java Collection hierarchy. Iterable → Collection → List/Set/Queue. Map is separate. Each branch = different contract.",
          tree: {
            name: "Iterable<E>",
            type: "context",
            children: [
              {
                name: "Collection<E>",
                type: "provider",
                children: [
                  {
                    name: "List<E>",
                    type: "provider",
                    children: [
                      { name: "ArrayList\nO(1) get / O(n) insert", type: "component" },
                      { name: "LinkedList\nO(1) head/tail / O(n) get", type: "component" },
                    ],
                  },
                  {
                    name: "Set<E>",
                    type: "provider",
                    children: [
                      { name: "HashSet\nO(1) avg / no order", type: "component" },
                      { name: "LinkedHashSet\nO(1) / insertion order", type: "component" },
                      { name: "TreeSet\nO(log n) / sorted", type: "component" },
                    ],
                  },
                  {
                    name: "Queue / Deque",
                    type: "provider",
                    children: [
                      { name: "ArrayDeque\nO(1) both ends", type: "component" },
                      { name: "PriorityQueue\nO(log n) poll / min-heap", type: "component" },
                    ],
                  },
                ],
              },
              {
                name: "Map<K,V>  (separate hierarchy)",
                type: "provider",
                children: [
                  { name: "HashMap\nO(1) avg / null key ok", type: "component" },
                  { name: "LinkedHashMap\nO(1) / insertion+access order", type: "component" },
                  { name: "TreeMap\nO(log n) / sorted + NavigableMap", type: "component" },
                  { name: "EnumMap\nO(1) / enum keys / array-backed", type: "component" },
                ],
              },
            ],
          },
          code: `// Choose based on:
// 1. Need ordering?       → LinkedHashSet / TreeSet / LinkedHashMap / TreeMap
// 2. Need sorted?         → TreeSet / TreeMap (red-black tree, O(log n))
// 3. Need both ends fast? → ArrayDeque (not LinkedList)
// 4. Need priority?       → PriorityQueue (min-heap)
// 5. Need index access?   → ArrayList (not LinkedList)
// 6. Enum keys?           → EnumMap (fastest)`,
        },
        {
          phase: "update",
          narration: "Step 2 — ArrayList internals. Backed by Object[]. Initial capacity 10. On overflow: grow 50% (newCap = oldCap + oldCap/2). System.arraycopy for insert/remove.",
          nodes: [
            { id: "init",    label: "new ArrayList()\nObject[10] backing array",  type: "component", active: true },
            { id: "add1",    label: "add(A)…add(J)\n10 elements, array full",     type: "action",    active: true },
            { id: "grow",    label: "add(K) → capacity exceeded\nnewCap = 10 + 10/2 = 15", type: "reducer", active: true },
            { id: "copy",    label: "Arrays.copyOf()\nnew Object[15], copy 10 → 15", type: "cache",  active: true },
            { id: "insert",  label: "add(0, X) — insert at index 0\nSystem.arraycopy: shift [A..K] right", type: "network", active: true },
          ],
          edges: [
            { from: "init",   to: "add1",   label: "fill", active: true },
            { from: "add1",   to: "grow",   label: "overflow", active: true, color: "#f85149" },
            { from: "grow",   to: "copy",   label: "grow 50%", active: true, color: "#ffa657" },
            { from: "copy",   to: "insert", label: "now 15 cap", active: true, color: "#3fb950" },
          ],
          code: `// ArrayList internal grow — ensureCapacity
private Object[] grow(int minCapacity) {
    int oldCapacity = elementData.length;
    if (oldCapacity > 0) {
        int newCapacity = oldCapacity + (oldCapacity >> 1); // +50%
        elementData = Arrays.copyOf(elementData, newCapacity);
    }
    return elementData;
}

// add(index, e) — insert at position
public void add(int index, E element) {
    System.arraycopy(elementData, index,
                     elementData, index + 1,
                     size - index);  // shift right O(n)
    elementData[index] = element;
    size++;
}

// ArrayList vs LinkedList for 10M iterations:
// ArrayList forEach: ~50ms   (cache-friendly, sequential memory)
// LinkedList forEach: ~450ms (pointer chasing, cache miss per node)`,
        },
        {
          phase: "render",
          narration: "Step 3 — Set internals. HashSet wraps HashMap. TreeSet wraps TreeMap (red-black tree). LinkedHashSet adds doubly-linked list to HashSet for insertion order.",
          nodes: [
            { id: "hs",     label: "HashSet\nbacked by HashMap<E, PRESENT>\nO(1) avg — bucket array", type: "component", active: true },
            { id: "hsbucket",label: "Bucket[hash%n]\n\"cat\"→[3] \"dog\"→[7]\n\"fish\"→[3] (collision→chain)", type: "cache",   active: true },
            { id: "ts",     label: "TreeSet\nbacked by TreeMap<E, PRESENT>\nRed-black tree, O(log n)", type: "component", active: true },
            { id: "tsbst",  label: "BST: 5\n       3   7\n     1  4  6  8\nsorted always", type: "store",     active: true },
            { id: "lhs",    label: "LinkedHashSet\nHashSet + doubly-linked list\npreserves insertion order", type: "component", active: true },
          ],
          edges: [
            { from: "hs",  to: "hsbucket", label: "delegates to", active: true, color: "#58a6ff" },
            { from: "ts",  to: "tsbst",    label: "delegates to", active: true, color: "#3fb950" },
            { from: "lhs", to: "hs",       label: "extends", active: true, color: "#ffa657" },
          ],
          code: `// HashSet — wraps HashMap
public boolean add(E e) {
    return map.put(e, PRESENT) == null;  // PRESENT = static Object
}
// contains: map.containsKey(o)  O(1) avg
// No order guarantee

// TreeSet range queries (no HashMap equivalent):
TreeSet<Integer> ts = new TreeSet<>(List.of(1,3,5,7,9));
ts.floor(4)         // 3 — largest ≤ 4
ts.ceiling(4)       // 5 — smallest ≥ 4
ts.headSet(5)       // [1, 3] — exclusive 5
ts.tailSet(5)       // [5, 7, 9] — inclusive 5
ts.subSet(3, 8)     // [3, 5, 7]

// LinkedHashSet — insertion order
Set<String> s = new LinkedHashSet<>();
s.addAll(List.of("c", "a", "b"));
System.out.println(s); // [c, a, b] — insertion order preserved`,
        },
        {
          phase: "effect",
          narration: "Step 4 — Queue/Deque/PriorityQueue. ArrayDeque is ring buffer — O(1) both ends. PriorityQueue is min-heap — poll() is always minimum, NOT sorted iteration.",
          nodes: [
            { id: "dq",    label: "ArrayDeque (ring buffer)\nhead→[ ][A][B][C][ ]←tail\naddFirst/addLast/pollFirst/pollLast all O(1)", type: "component", active: true },
            { id: "pq",    label: "PriorityQueue (min-heap)\n        1\n      3   2\n    7  4  5  6\npeek()=1, poll()=1 then sift-down", type: "store", active: true },
            { id: "pqgot", label: "iterator() NOT in order!\nOnly peek()/poll() guaranteed", type: "reducer",   active: true },
          ],
          edges: [
            { from: "pq",  to: "pqgot", label: "GOTCHA", active: true, color: "#f85149" },
          ],
          code: `// ArrayDeque — preferred over Stack and LinkedList
Deque<String> dq = new ArrayDeque<>();
dq.addFirst("A");  // push front O(1)
dq.addLast("B");   // push back  O(1)
dq.pollFirst();    // pop front  O(1)
dq.pollLast();     // pop back   O(1)
// No null allowed, not thread-safe

// PriorityQueue — min-heap
PriorityQueue<Integer> pq = new PriorityQueue<>();
pq.addAll(List.of(5, 1, 3, 2, 4));
System.out.println(pq);         // [1, 2, 3, 5, 4] — heap order, NOT sorted!
System.out.println(pq.peek());  // 1 — O(1), heap root
System.out.println(pq.poll());  // 1 — O(log n), sift-down

// Max-heap:
PriorityQueue<Integer> maxHeap =
    new PriorityQueue<>(Comparator.reverseOrder());

// Correct way to drain in order:
while (!pq.isEmpty()) System.out.println(pq.poll()); // 1,2,3,4,5`,
        },
        {
          phase: "commit",
          narration: "Step 5 — Map comparison. HashMap vs LinkedHashMap vs TreeMap vs EnumMap. Choose based on ordering and key type needs.",
          nodes: [
            { id: "hmap",  label: "HashMap\nO(1) avg\nnull key OK\nno order",             type: "component", active: true },
            { id: "lhmap", label: "LinkedHashMap\nO(1) avg\ninsertion OR access order\nLRU cache pattern",  type: "component", active: true },
            { id: "tmap",  label: "TreeMap\nO(log n)\nsorted keys\nfloorKey/ceilingKey\nsubMap ranges",     type: "component", active: true },
            { id: "emap",  label: "EnumMap\nO(1) fastest\narray-backed by ordinal\nenum keys only",          type: "component", active: true },
          ],
          edges: [],
          code: `// LinkedHashMap — LRU cache (access-order mode)
int MAX = 3;
Map<String, String> lru = new LinkedHashMap<>(16, 0.75f, true) {
    protected boolean removeEldestEntry(Map.Entry<String,String> e) {
        return size() > MAX;
    }
};
lru.put("a", "1"); lru.put("b", "2"); lru.put("c", "3");
lru.get("a");       // access "a" → moves to MRU position
lru.put("d", "4");  // evicts LRU = "b"
System.out.println(lru.keySet()); // [c, a, d]

// TreeMap — range queries
TreeMap<String, Integer> tm = new TreeMap<>();
tm.put("apple", 1); tm.put("banana", 2); tm.put("cherry", 3);
tm.headMap("b")          // {apple=1}    (exclusive "b")
tm.tailMap("b")          // {banana=2, cherry=3}
tm.subMap("a", "c")      // {apple=1, banana=2}
tm.floorKey("bo")        // "banana" (largest ≤ "bo")

// EnumMap — fastest for enum keys
EnumMap<DayOfWeek, String> em = new EnumMap<>(DayOfWeek.class);
// Internally: Object[] indexed by ordinal → zero boxing overhead`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Java Collection Types Deep Dive",
        time:  "O(1) avg → O(log n) → O(n)",
        space: "O(n)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          } else if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          }
          codeEl.innerHTML =
            window.ReactViz.label("CODE") +
            window.ReactViz.codeBlock(step.code, "java");
        },
      });
    },
  }]);
})();
