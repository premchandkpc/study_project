(function() {
  var topic = {
    id: "java-collections",
    area: "java",
    title: "Collections Framework: List, Map, Set, Queue",
    tag: "Collections",
    tags: ["collections", "hashmap", "arraylist", "concurrenthashmap", "treemap", "list", "set", "queue"],

    flow: {
      title: 'Which Collection? — Decision Tree',
      caption: 'Answer each question to find the right data structure',
      nodes: [
        { id: 'start',    label: 'Start',          hint: 'What is your primary use case?' },
        { id: 'ordered',  label: 'Ordered Seq?',   hint: 'Need elements in a specific positional order?' },
        { id: 'list',     label: 'List',            hint: 'Ordered, indexed, allows duplicates' },
        { id: 'unique',   label: 'Unique only?',   hint: 'No duplicate values allowed?' },
        { id: 'set',      label: 'Set',             hint: 'No duplicates — hash, linked, or sorted' },
        { id: 'kv',       label: 'Key→Value?',     hint: 'Lookup by a key to retrieve a value?' },
        { id: 'map',      label: 'Map',             hint: 'Key-value pairs — hash, linked, or sorted' },
        { id: 'fifo',     label: 'FIFO / Priority?',hint: 'Process elements in insertion order or priority?' },
        { id: 'queue',    label: 'Queue / Deque',   hint: 'FIFO, LIFO, priority, or blocking variants' },
      ],
      steps: [
        {
          path: ['start','ordered'],
          label: 'Do you need positional / ordered access?',
          detail: 'If you need get(index), add(index), or iteration in insertion order — you want a List. If you want fast lookup by key or set membership test — keep going.'
        },
        {
          path: ['ordered','list'],
          label: 'YES → List',
          detail: 'ArrayList: O(1) random access, O(n) insert/delete middle. Best for most cases. LinkedList: O(1) insert/delete at ends, O(n) random access — use as Deque, rarely as List. CopyOnWriteArrayList: thread-safe reads at cost of full array copy on write.'
        },
        {
          path: ['ordered','unique'],
          label: 'NO → Need unique elements?',
          detail: 'If elements must be unique (no duplicates allowed), a Set is your friend. If you need to count frequencies or check membership, Set is O(1) for contains().'
        },
        {
          path: ['unique','set'],
          label: 'YES → Set',
          detail: 'HashSet: O(1) add/contains/remove, unordered — backed by HashMap. LinkedHashSet: insertion-order iteration, slightly slower. TreeSet: sorted by Comparable/Comparator, O(log n) ops — backed by TreeMap.'
        },
        {
          path: ['unique','kv'],
          label: 'NO → Need key→value lookup?',
          detail: 'Maps store key-value pairs. O(1) average for get/put with HashMap. Use when you index data by a key (userId→user, word→count).'
        },
        {
          path: ['kv','map'],
          label: 'YES → Map',
          detail: 'HashMap: O(1) avg, unordered. LinkedHashMap: insertion or access order. TreeMap: sorted keys, O(log n). ConcurrentHashMap: thread-safe with segment locking (Java 8: per-bin lock). EnumMap: fastest for enum keys. WeakHashMap: GC can collect keys.'
        },
        {
          path: ['kv','fifo'],
          label: 'NO → FIFO, LIFO, or priority processing?',
          detail: 'Queues process elements in order. Task queues, BFS traversal, producer-consumer. Deque = double-ended queue (use as stack or queue). BlockingQueue for thread coordination.'
        },
        {
          path: ['fifo','queue'],
          label: 'YES → Queue / Deque',
          detail: 'ArrayDeque: fastest Deque/Stack, no null. PriorityQueue: min-heap, O(log n) poll. LinkedBlockingQueue: bounded producer-consumer. ArrayBlockingQueue: fixed capacity, blocks producer when full. DelayQueue: scheduled tasks.'
        },
      ]
    },

    uml: {
      title: 'HashMap.put() — Internal Hash & Collision Flow',
      scenario: 'map.put("userId_123", userObject) — what happens inside?',
      actors: [
        { id: 'caller',  label: 'Caller',       hint: 'Your code' },
        { id: 'map',     label: 'HashMap',       hint: 'Default capacity 16, load factor 0.75' },
        { id: 'hash',    label: 'Hash Function', hint: 'Spread bits to reduce collision' },
        { id: 'bucket',  label: 'Bucket[i]',     hint: 'Array slot = hash & (n-1)' },
        { id: 'node',    label: 'Node/TreeNode', hint: 'Linked list or red-black tree' },
      ],
      messages: [
        {
          from: 'caller', to: 'map',
          label: 'map.put(key, value)',
          detail: 'Puts a key-value pair. If key null: always goes to bucket[0] — HashMap allows one null key. TreeMap/Hashtable do NOT allow null keys.'
        },
        {
          from: 'map', to: 'hash',
          label: 'hash(key) = key.hashCode() ^ (h >>> 16)',
          detail: 'HashMap spreads high bits into low bits to reduce clustering in small tables. XOR with right-shifted self. This is WHY you must override both hashCode() AND equals() — hashCode() determines bucket, equals() determines which node in bucket.'
        },
        {
          from: 'hash', to: 'bucket',
          label: 'bucket index = hash & (n-1)',
          detail: 'n = table length (always power of 2). & (n-1) is fast modulo. With n=16: index = hash & 15. This means only low 4 bits of hash matter without the spread step!'
        },
        {
          from: 'bucket', to: 'node',
          label: 'Bucket empty? → new Node(hash, key, val, null)',
          detail: 'Empty bucket: create new Node, done. O(1). Collision: node already exists at this bucket. Must walk the chain.'
        },
        {
          from: 'node', to: 'node',
          label: 'Collision: key.equals() check each node',
          detail: 'Walk linked list. If node.hash==hash && node.key.equals(key): UPDATE value, return old. Else: append to list. O(k) where k = collision chain length. Why equals() must be consistent with hashCode()!', type: 'async'
        },
        {
          from: 'node', to: 'bucket',
          label: 'Chain ≥ 8 nodes → treeify to TreeNode',
          detail: 'JAVA 8+: When linked list exceeds 8 nodes, convert to red-black tree. O(log k) ops. TreeNode stores same key/val but is a balanced BST. Untreeify below 6 nodes. Prevents O(n) worst-case hash flood attack.'
        },
        {
          from: 'map', to: 'map',
          label: 'size > capacity × 0.75 → resize(2× capacity)',
          detail: 'Load factor threshold crossed → allocate new table (2× size) → rehash ALL entries → place in new buckets. O(n) amortized per resize. Pre-size with new HashMap<>(expectedSize / 0.75 + 1) to avoid resizes.', type: 'async'
        },
        {
          from: 'map', to: 'caller',
          label: 'Return previous value (or null)',
          detail: 'put() returns the PREVIOUS value mapped to this key (or null if new). Use putIfAbsent() to avoid overwrite. Use merge() for count maps. Use compute() for complex update logic.'
        },
      ]
    },

    architecture: {
      title: 'Java Collections Framework — Full Map',
      caption: 'Click any implementation to understand its internals, complexity, and when to use',
      lanes: [
        {
          label: 'List — ordered, indexed, duplicates OK',
          hint: 'Sequential ordered access by index',
          nodes: [
            {
              id: 'arraylist',
              label: 'ArrayList',
              badge: 'O(1) get, O(n) insert',
              hint: 'DEFAULT choice. Backed by Object[]. Random access O(1). Append amortized O(1) (grows 50%). Insert/delete middle O(n) — shifts elements. Not thread-safe. Use Arrays.copyOf internally on resize.'
            },
            {
              id: 'linkedlist',
              label: 'LinkedList',
              badge: 'O(1) ends, O(n) index',
              hint: 'Doubly-linked list. O(1) addFirst/addLast/removeFirst/removeLast. USE AS DEQUE, not List. Terrible cache locality — each node a separate heap object. 4× memory of ArrayList for same data. Almost never the right List choice.'
            },
            {
              id: 'cow-list',
              label: 'CopyOnWriteArrayList',
              badge: 'thread-safe reads',
              hint: 'Every write creates a FULL COPY of the array. Reads: zero locks, lock-free iteration (snapshot). Good for read-heavy, rarely-written lists (event listener registries). Expensive writes — not for hot paths.'
            },
            {
              id: 'arraydeque-l',
              label: 'ArrayDeque (as stack)',
              badge: 'fastest stack',
              hint: 'Faster than Stack (which extends Vector with synchronized). Use as stack (push/pop) or queue (offer/poll). Circular array, grows automatically. No null elements. Replace all legacy Stack usage with ArrayDeque.'
            },
          ]
        },
        {
          label: 'Set — no duplicates',
          hint: 'Membership testing and uniqueness',
          nodes: [
            {
              id: 'hashset',
              label: 'HashSet',
              badge: 'O(1) add/contains',
              hint: 'Backed by HashMap<E, PRESENT>. O(1) average add/remove/contains. Unordered iteration. Allows null. Thread-unsafe. Pre-size: new HashSet<>(capacity / 0.75 + 1). Override hashCode + equals for custom types!'
            },
            {
              id: 'linkedhashset',
              label: 'LinkedHashSet',
              badge: 'insertion order',
              hint: 'HashMap + doubly-linked list of insertion order. O(1) ops + predictable iteration. Use when you need uniqueness AND insertion-order traversal. ~10% slower than HashSet.'
            },
            {
              id: 'treeset',
              label: 'TreeSet',
              badge: 'sorted O(log n)',
              hint: 'Red-black tree. O(log n) all ops. Elements sorted by natural order or Comparator. first()/last()/floor()/ceiling()/subSet() range ops. No null (null Comparable throws NPE). Use for sorted unique elements.'
            },
            {
              id: 'enumset',
              label: 'EnumSet',
              badge: 'bit-vector O(1)',
              hint: 'Backed by bit-vector (long). O(1) all ops, zero boxing. Most compact enum collection. Use for permission sets, feature flags with enum. Always prefer over HashSet<MyEnum>.'
            },
          ]
        },
        {
          label: 'Map — key → value lookup',
          hint: 'Associative lookup and aggregation',
          nodes: [
            {
              id: 'hashmap',
              label: 'HashMap',
              badge: 'O(1) avg · DEFAULT',
              hint: 'Array of linked lists/trees. O(1) avg, O(log n) worst (treeified). Unordered. Allows null key + values. NOT thread-safe — use ConcurrentHashMap in concurrent code. Java 8: treeify bins at 8 nodes.'
            },
            {
              id: 'linkedhashmap',
              label: 'LinkedHashMap',
              badge: 'insertion or access order',
              hint: 'HashMap + doubly-linked list. O(1) all ops. Override removeEldestEntry() → LRU cache in 5 lines! Access-order mode (accessOrder=true constructor) moves accessed entries to tail — perfect for LRU.'
            },
            {
              id: 'treemap',
              label: 'TreeMap',
              badge: 'sorted keys O(log n)',
              hint: 'Red-black tree. Keys sorted by Comparable/Comparator. Range ops: subMap(), headMap(), tailMap(), floorKey(), ceilingKey(). Perfect for time-series buckets, leaderboards, range queries. No null keys.'
            },
            {
              id: 'chm',
              label: 'ConcurrentHashMap',
              badge: 'thread-safe O(1)',
              hint: 'Java 8: per-bucket CAS + synchronized (no segment lock). Reads are lock-free. Writes lock only the affected bin. compute/merge/putIfAbsent are atomic. Weakly consistent iteration. Default for concurrent maps.'
            },
          ]
        },
        {
          label: 'Queue / Deque — FIFO, priority, blocking',
          hint: 'Processing elements in order',
          nodes: [
            {
              id: 'arraydeque',
              label: 'ArrayDeque',
              badge: 'FASTEST Deque/Queue',
              hint: 'Circular resizable array. O(1) all deque ops. No null elements. Use instead of LinkedList for queues. Use instead of Stack. Faster than both due to cache locality and no node allocation overhead.'
            },
            {
              id: 'pq',
              label: 'PriorityQueue',
              badge: 'min-heap O(log n)',
              hint: 'Binary min-heap. peek()/element(): O(1). poll()/add(): O(log n). Not FIFO — priority order. NOT thread-safe. Use for Dijkstra, scheduling, top-K. Comparator for max-heap. Does NOT allow null.'
            },
            {
              id: 'lbq',
              label: 'LinkedBlockingQueue',
              badge: 'bounded producer-consumer',
              hint: 'Separate head/tail locks — high concurrency. Optional capacity bound. Blocks put() when full, blocks take() when empty. Used internally by ThreadPoolExecutor. Perfect for producer-consumer patterns.'
            },
            {
              id: 'abq',
              label: 'ArrayBlockingQueue',
              badge: 'single lock, fair option',
              hint: 'Fixed-capacity array. Single ReentrantLock (less concurrent than LBQ). Supports fairness (FIFO thread wakeup). Use when you want strict bounded capacity and fair scheduling. Same interface as LBQ.'
            },
          ]
        }
      ],
      links: [
        { from: 'hashset',       to: 'hashmap',      label: 'backed by HashMap<E,PRESENT>', type: 'sync' },
        { from: 'linkedhashset', to: 'linkedhashmap', label: 'backed by LinkedHashMap',       type: 'sync' },
        { from: 'treeset',       to: 'treemap',       label: 'backed by TreeMap',             type: 'sync' },
        { from: 'linkedhashmap', to: 'hashmap',       label: 'extends HashMap + linked list', type: 'sync' },
        { from: 'arraydeque-l',  to: 'arraydeque',    label: 'same class — dual use',         type: 'sync' },
        { from: 'lbq',           to: 'abq',           label: 'both implement BlockingQueue',  type: 'async' },
      ]
    },

    visual: function(mount) {
      mount.innerHTML = `
        <style>
          .cv-wrap { font-family: monospace; color: #cdd9e5; padding: 12px; }
          .cv-title { font-size: 11px; color: #768390; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
          .cv-tabs { display: flex; gap: 4px; margin-bottom: 12px; flex-wrap: wrap; }
          .cv-tab { background: #21262d; border: 1px solid #30363d; color: #768390; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cv-tab.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }
          .cv-panel { display: none; }
          .cv-panel.active { display: block; }

          /* HashMap viz */
          .cv-hm-table { display: grid; gap: 3px; margin-bottom: 8px; }
          .cv-bucket { display: flex; align-items: center; gap: 4px; }
          .cv-bi { width: 28px; font-size: 9px; color: #768390; text-align: right; flex-shrink: 0; }
          .cv-slot { min-width: 60px; height: 24px; background: #161b22; border: 1px solid #21262d; border-radius: 4px; display: flex; align-items: center; padding: 0 6px; font-size: 9px; color: #768390; }
          .cv-slot.filled { background: #1f3d2d; border-color: #57ab5a; color: #57ab5a; }
          .cv-slot.collision { background: #3d2f1f; border-color: #e3b341; color: #e3b341; }
          .cv-slot.tree { background: #2d1f3d; border-color: #b392f0; color: #b392f0; }
          .cv-slot.collision2 { background: #1f2d3d; border-color: #6cb6ff; color: #6cb6ff; }
          .cv-chain { font-size: 9px; color: #768390; display: flex; align-items: center; gap: 2px; }
          .cv-node { background: #21262d; border: 1px solid #30363d; border-radius: 3px; padding: 1px 5px; font-size: 9px; }

          /* ArrayList viz */
          .cv-arr { display: flex; gap: 2px; flex-wrap: wrap; margin-bottom: 8px; }
          .cv-cell { width: 36px; height: 36px; background: #161b22; border: 1px solid #30363d; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; transition: all 0.3s; }
          .cv-cell.filled { background: #1f3d2d; border-color: #57ab5a; color: #57ab5a; }
          .cv-cell.empty { background: #0d1117; border-color: #21262d; color: #444; font-size: 8px; }
          .cv-cell.active { background: #1f6feb; border-color: #1f6feb; color: #fff; }

          /* Complexity table */
          .cv-ct { width: 100%; border-collapse: collapse; font-size: 10px; }
          .cv-ct th { background: #21262d; color: #768390; padding: 4px 8px; text-align: left; font-weight: normal; border: 1px solid #30363d; }
          .cv-ct td { padding: 4px 8px; border: 1px solid #21262d; }
          .cv-ct tr:hover td { background: #161b22; }
          .cv-ct .fast { color: #57ab5a; }
          .cv-ct .med { color: #e3b341; }
          .cv-ct .slow { color: #f47067; }

          .cv-controls { display: flex; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
          .cv-btn { background: #21262d; border: 1px solid #30363d; color: #cdd9e5; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px; font-family: monospace; }
          .cv-btn:hover { background: #30363d; }
          .cv-info { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 10px; font-size: 11px; color: #768390; min-height: 32px; margin-top: 8px; }
          .cv-info strong { color: #cdd9e5; }
          .cv-info .kw { color: #e3b341; }
          .cv-info .ok { color: #57ab5a; }
        </style>
        <div class="cv-wrap">
          <div class="cv-title">Collections — Interactive Internals</div>
          <div class="cv-tabs">
            <button class="cv-tab active" data-tab="hm">HashMap Internals</button>
            <button class="cv-tab" data-tab="arr">ArrayList Growth</button>
            <button class="cv-tab" data-tab="cmp">Complexity Table</button>
          </div>

          <!-- HASHMAP PANEL -->
          <div class="cv-panel active" id="cv-panel-hm">
            <div class="cv-controls">
              <button class="cv-btn" id="cv-put">put(key, val)</button>
              <button class="cv-btn" id="cv-collision">Force collision</button>
              <button class="cv-btn" id="cv-treeify">Treeify bucket</button>
              <button class="cv-btn" id="cv-resize">Trigger resize</button>
              <button class="cv-btn" id="cv-reset-hm">Reset</button>
            </div>
            <div id="cv-hm-table" class="cv-hm-table"></div>
            <div class="cv-info" id="cv-hm-info">HashMap: capacity=16, load factor=0.75. Click "put" to add entries. Watch bucket assignment and collision handling.</div>
          </div>

          <!-- ARRAYLIST PANEL -->
          <div class="cv-panel" id="cv-panel-arr">
            <div class="cv-controls">
              <button class="cv-btn" id="cv-al-add">add(element)</button>
              <button class="cv-btn" id="cv-al-insert">insert at index 2</button>
              <button class="cv-btn" id="cv-al-remove">remove(2)</button>
              <button class="cv-btn" id="cv-al-reset">Reset</button>
            </div>
            <div style="font-size:10px;color:#768390;margin-bottom:6px">Internal array (capacity shown in gray):</div>
            <div class="cv-arr" id="cv-al-arr"></div>
            <div style="font-size:10px;color:#768390;margin-bottom:4px">size=<strong id="cv-al-size" style="color:#cdd9e5">0</strong> / capacity=<strong id="cv-al-cap" style="color:#e3b341">10</strong></div>
            <div class="cv-info" id="cv-al-info">ArrayList starts with capacity 10. When full, grows to 1.5× (newCapacity = oldCapacity + oldCapacity >> 1). Blue = active operation (shifting).</div>
          </div>

          <!-- COMPLEXITY TABLE -->
          <div class="cv-panel" id="cv-panel-cmp">
            <table class="cv-ct">
              <thead>
                <tr>
                  <th>Collection</th><th>add/put</th><th>get/contains</th><th>remove</th><th>iterate</th><th>Thread-safe?</th>
                </tr>
              </thead>
              <tbody>
                ${[
                  ['ArrayList',          'O(1) amort','O(1) index','O(n) mid','O(n)','No'],
                  ['LinkedList',         'O(1) ends', 'O(n)',      'O(1) ends','O(n)','No'],
                  ['ArrayDeque',         'O(1) amort','O(n)',      'O(1) ends','O(n)','No'],
                  ['HashSet/HashMap',    'O(1) avg',  'O(1) avg',  'O(1) avg', 'O(n)','No'],
                  ['LinkedHashSet/Map',  'O(1) avg',  'O(1) avg',  'O(1) avg', 'O(n)','No'],
                  ['TreeSet/TreeMap',    'O(log n)',  'O(log n)',  'O(log n)', 'O(n) sorted','No'],
                  ['PriorityQueue',      'O(log n)',  'O(1) peek', 'O(log n)', 'unsorted','No'],
                  ['ConcurrentHashMap',  'O(1) avg',  'O(1) avg',  'O(1) avg', 'weak', 'Yes ✓'],
                  ['CopyOnWriteArrayList','O(n)',     'O(1)',      'O(n)',     'snapshot','Yes ✓'],
                  ['LinkedBlockingQueue','O(1)',      'O(1) peek', 'O(1)',     'weak', 'Yes ✓'],
                ].map(r => `<tr>${r.map((c,i) => {
                  let cls = '';
                  if (i > 0 && i < 5) {
                    if (c.startsWith('O(1)')) cls = 'fast';
                    else if (c.startsWith('O(log')) cls = 'med';
                    else if (c.startsWith('O(n)')) cls = 'slow';
                  }
                  if (i === 5) cls = c.startsWith('Yes') ? 'fast' : 'slow';
                  return '<td class="' + cls + '">' + c + '</td>';
                }).join('')}</tr>`).join('')}
              </tbody>
            </table>
            <div class="cv-info" style="margin-top:8px"><span class="ok">O(1)</span> = constant time. <span class="kw">O(log n)</span> = logarithmic. <span style="color:#f47067">O(n)</span> = linear. "avg" = average case assuming good hash distribution. ConcurrentHashMap reads are lock-free since Java 8.</div>
          </div>
        </div>`;

      // Tab switching
      mount.querySelectorAll('.cv-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          mount.querySelectorAll('.cv-tab').forEach(t => t.classList.remove('active'));
          mount.querySelectorAll('.cv-panel').forEach(p => p.classList.remove('active'));
          tab.classList.add('active');
          mount.querySelector('#cv-panel-' + tab.dataset.tab).classList.add('active');
        });
      });

      // HashMap simulation
      const CAP = 16;
      let hmData = Array.from({length: CAP}, () => []);
      let hmSize = 0;
      const hmInfo = mount.querySelector('#cv-hm-info');

      function hashFn(key) {
        let h = 0;
        for (let c of String(key)) h = (h * 31 + c.charCodeAt(0)) | 0;
        h = h ^ (h >>> 16);
        return ((h % CAP) + CAP) % CAP;
      }

      function renderHM() {
        const tbl = mount.querySelector('#cv-hm-table');
        tbl.innerHTML = '';
        hmData.forEach((bucket, i) => {
          const row = document.createElement('div');
          row.className = 'cv-bucket';
          const bi = document.createElement('div');
          bi.className = 'cv-bi';
          bi.textContent = '[' + i + ']';
          row.appendChild(bi);
          if (bucket.length === 0) {
            const s = document.createElement('div');
            s.className = 'cv-slot';
            s.textContent = 'null';
            row.appendChild(s);
          } else {
            bucket.forEach((node, ni) => {
              const s = document.createElement('div');
              s.className = 'cv-slot ' + (bucket.length >= 8 ? 'tree' : ni === 0 ? 'filled' : ni === 1 ? 'collision' : 'collision2');
              s.textContent = node.key + '=' + node.val;
              s.title = 'hash=' + node.hash + ' bucket=' + i;
              row.appendChild(s);
              if (ni < bucket.length - 1) {
                const arrow = document.createElement('div');
                arrow.style.cssText = 'font-size:10px;color:#30363d';
                arrow.textContent = '→';
                row.appendChild(arrow);
              }
            });
          }
          tbl.appendChild(row);
        });
      }

      let keyIdx = 0;
      const sampleKeys = ['alice','bob','carol','dave','eve','frank','grace','heidi'];

      mount.querySelector('#cv-put').addEventListener('click', () => {
        const key = sampleKeys[keyIdx % sampleKeys.length] + (keyIdx >= sampleKeys.length ? keyIdx : '');
        const val = 'v' + keyIdx;
        const h = hashFn(key);
        const bucket = hmData[h];
        const existing = bucket.findIndex(n => n.key === key);
        if (existing >= 0) { bucket[existing].val = val; } else { bucket.push({key, val, hash: h}); hmSize++; }
        keyIdx++;
        renderHM();
        hmInfo.innerHTML = '<strong>put("' + key + '","' + val + '")</strong> → hash=' + h + ' → bucket[' + h + ']. Size=' + hmSize + '. Load=' + (hmSize/CAP*100).toFixed(0) + '% (threshold=75%)';
      });

      mount.querySelector('#cv-collision').addEventListener('click', () => {
        // Force 3 entries into bucket 7
        [['forced1','A'],['forced2','B'],['forced3','C']].forEach(([k,v]) => {
          const n = {key:k, val:v, hash:7};
          if (!hmData[7].find(x=>x.key===k)) { hmData[7].push(n); hmSize++; }
        });
        renderHM();
        hmInfo.innerHTML = '<strong>Forced collision!</strong> 3 entries in bucket[7] form a linked list. O(1) → O(k) where k=chain length. Each lookup walks the chain calling equals().';
      });

      mount.querySelector('#cv-treeify').addEventListener('click', () => {
        for (let i = hmData[3].length; i < 8; i++) {
          hmData[3].push({key:'tree'+i, val:'v'+i, hash:3});
          hmSize++;
        }
        renderHM();
        hmInfo.innerHTML = '<strong>Treeified!</strong> Bucket[3] has 8+ nodes → converted to red-black TreeNode (purple). O(k) linked-list → O(log k) tree. Prevents hash-flooding DoS attacks.';
      });

      mount.querySelector('#cv-resize').addEventListener('click', () => {
        hmInfo.innerHTML = '<strong>Resize triggered!</strong> Size > capacity × 0.75 → new table[' + (CAP*2) + ']. ALL entries rehashed. O(n) cost. Avoid by pre-sizing: new HashMap<>(expectedSize * 4 / 3 + 1).';
      });

      mount.querySelector('#cv-reset-hm').addEventListener('click', () => {
        hmData = Array.from({length: CAP}, () => []); hmSize = 0; keyIdx = 0;
        renderHM();
        hmInfo.innerHTML = 'HashMap reset. capacity=16, load factor=0.75.';
      });
      renderHM();

      // ArrayList simulation
      let alData = [];
      let alCap = 10;
      const alInfo = mount.querySelector('#cv-al-info');

      function renderAL(active) {
        const el = mount.querySelector('#cv-al-arr');
        el.innerHTML = '';
        for (let i = 0; i < alCap; i++) {
          const c = document.createElement('div');
          c.className = 'cv-cell ' + (i < alData.length ? (active !== undefined && (i >= active[0] && i <= active[1]) ? 'active' : 'filled') : 'empty');
          c.textContent = i < alData.length ? alData[i] : '·';
          el.appendChild(c);
        }
        mount.querySelector('#cv-al-size').textContent = alData.length;
        mount.querySelector('#cv-al-cap').textContent = alCap;
      }

      let alCount = 0;
      mount.querySelector('#cv-al-add').addEventListener('click', () => {
        if (alData.length === alCap) {
          const old = alCap;
          alCap = old + (old >> 1);
          alInfo.innerHTML = '<strong>RESIZE!</strong> Capacity was ' + old + ', now ' + alCap + '. Arrays.copyOf called — O(n) copy. Amortized O(1) per add because it doubles.';
        } else {
          alInfo.innerHTML = '<strong>add(' + alCount + ')</strong> — O(1). Append to alData[' + alData.length + ']. No shifting needed. Bump size.';
        }
        alData.push(alCount++);
        renderAL();
      });

      mount.querySelector('#cv-al-insert').addEventListener('click', () => {
        if (alData.length < 4) { alInfo.innerHTML = 'Add more elements first.'; return; }
        const shifted = alData.length - 2;
        alInfo.innerHTML = '<strong>add(2, "X")</strong> — O(n)! Must shift ' + shifted + ' elements right to make room at index 2. Blue = shifted elements.';
        renderAL([2, alData.length]);
        setTimeout(() => { alData.splice(2, 0, 'X'); renderAL(); }, 600);
      });

      mount.querySelector('#cv-al-remove').addEventListener('click', () => {
        if (alData.length <= 2) { alInfo.innerHTML = 'Add more elements first.'; return; }
        const shifted = alData.length - 3;
        alInfo.innerHTML = '<strong>remove(2)</strong> — O(n)! Must shift ' + shifted + ' elements left to fill the gap. Blue = shifted elements.';
        renderAL([3, alData.length - 1]);
        setTimeout(() => { alData.splice(2, 1); renderAL(); }, 600);
      });

      mount.querySelector('#cv-al-reset').addEventListener('click', () => {
        alData = []; alCap = 10; alCount = 0;
        renderAL();
        alInfo.innerHTML = 'ArrayList reset. capacity=10, size=0.';
      });
      renderAL();
    },

    concept:
`Java Collections Framework provides generic, reusable data structures:
- **List** — ordered, indexed, duplicates allowed. \`ArrayList\` (default), \`LinkedList\` (Deque only), \`CopyOnWriteArrayList\` (thread-safe reads).
- **Set** — no duplicates. \`HashSet\` O(1), \`LinkedHashSet\` insertion-ordered, \`TreeSet\` sorted O(log n).
- **Map** — key→value. \`HashMap\` O(1) avg, \`LinkedHashMap\` LRU cache, \`TreeMap\` sorted keys, \`ConcurrentHashMap\` thread-safe.
- **Queue/Deque** — \`ArrayDeque\` (fastest), \`PriorityQueue\` (min-heap), \`LinkedBlockingQueue\` (producer-consumer).`,
    why:
`Choosing the wrong collection is a classic senior interview trap. \`LinkedList\` for a list (terrible cache locality), \`HashMap\` with wrong equals/hashCode (all O(n)), \`ArrayList\` without pre-sizing (repeated resizes), \`HashMap\` in concurrent code (data corruption). Know the internals.`,
    example: {
      language: "java",
      code:
`import java.util.*;
import java.util.concurrent.*;

// 1. LRU Cache using LinkedHashMap (5 lines!)
class LRUCache<K,V> extends LinkedHashMap<K,V> {
    private final int maxSize;
    LRUCache(int size) {
        super(size, 0.75f, true); // accessOrder = true
        this.maxSize = size;
    }
    @Override
    protected boolean removeEldestEntry(Map.Entry<K,V> e) {
        return size() > maxSize;
    }
}

// 2. Correct HashMap pre-sizing
// Avoid default new HashMap<>() if you know the size
int expected = 1000;
Map<String, Integer> freq = new HashMap<>(expected * 4 / 3 + 1);

// 3. ConcurrentHashMap atomic ops
ConcurrentHashMap<String, Integer> counts = new ConcurrentHashMap<>();
counts.merge("word", 1, Integer::sum);       // atomic increment
counts.compute("word", (k, v) -> v == null ? 1 : v + 1);
counts.computeIfAbsent("word", k -> new ArrayList<>()).add("item");

// 4. ArrayDeque as stack (faster than Stack class)
Deque<String> stack = new ArrayDeque<>();
stack.push("frame1"); stack.push("frame2");
String top = stack.pop();

// 5. PriorityQueue max-heap
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
maxHeap.addAll(List.of(3,1,4,1,5,9,2,6));
System.out.println(maxHeap.poll()); // 9`,
      notes: `Always override \`hashCode()\` AND \`equals()\` together for custom Map keys. Use \`Objects.hash()\` and \`Objects.equals()\` for multi-field implementations.`
    },
    interview: [
      {
        question: "HashMap vs ConcurrentHashMap — what breaks without CHM?",
        answer:
`In concurrent puts, HashMap can: (1) lose entries when two threads resize simultaneously, (2) create infinite linked-list loops (Java 6 bug — fixed in Java 8 but race still corrupts data), (3) return inconsistent results on reads. CHM uses per-bin CAS + synchronized — reads are fully lock-free since Java 8.`,
        followUps: ["What is the difference between Hashtable and CHM?", "When would you use Collections.synchronizedMap()?"]
      },
      {
        question: "When does HashMap become O(n) instead of O(1)?",
        answer:
`Two scenarios: (1) **Bad hashCode()** — all keys hash to the same bucket, creating a linked list of length n. O(n) per op. Java 8 fixes worst case to O(log n) by treeifying bins ≥ 8 nodes. (2) **Resize** — putting when size > threshold triggers O(n) rehash. Pre-size to avoid.`,
        followUps: ["What is a hash flooding attack?", "How does Java 8 treeify fix it?"]
      },
      {
        question: "LinkedList vs ArrayList — when is LinkedList actually better?",
        answer:
`Almost never, in practice. LinkedList is theoretically O(1) at ends but ArrayList is also O(1) amortized at end. LinkedList has terrible **cache locality** — each node is a separate heap object, causing cache misses. ArrayDeque beats LinkedList for queue/deque usage and ArrayList beats it for random access. LinkedList wins only for: concurrent modification during iteration with ListIterator, or when you need the Deque interface without ArrayDeque being available.`,
        followUps: ["What is cache line size?", "How does sequential memory access beat linked structures?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Generic, type-safe collections with consistent interfaces.",
        "Java 8+ factory methods: List.of(), Map.of() for immutable collections.",
        "Collectors API creates complex nested collections in one pipeline."
      ],
      cons: [
        "Boxing overhead: HashMap<Integer,Integer> vs int[]. Use primitive maps (Eclipse Collections, Trove) for hot paths.",
        "CopyOnWriteArrayList write cost is O(n) — don't use for write-heavy lists.",
        "PriorityQueue does NOT support O(1) decrease-key — use TreeMap for that."
      ],
      when: `Default: **ArrayList + HashMap**. Thread-safe: **ConcurrentHashMap**. Sorted: **TreeMap/TreeSet**. Queue: **ArrayDeque**. LRU: **LinkedHashMap (accessOrder=true)**. Enum: **EnumMap/EnumSet**.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
