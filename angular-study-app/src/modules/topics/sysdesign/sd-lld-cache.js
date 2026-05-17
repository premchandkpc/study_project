(function() {
  var topic = {
  id:"sd-lld-cache", area:"sysdesign",
  title:"LLD: LRU & LFU Cache — O(1) Get and Put",
  tag:"LLD", tags:["lru","lfu","cache","hashmap","doubly linked list","linked hashmap","o(1)"],
  concept:`**LRU (Least Recently Used):** Evict the item that was accessed longest ago.

**O(1) LRU implementation:** HashMap + Doubly Linked List.
- HashMap: key → node (O(1) lookup)
- DLL: nodes in access-time order (head = most recent, tail = least recent)
- Get: O(1) — lookup in map, move node to head
- Put: O(1) — add to head; if capacity exceeded, remove tail and map entry

**Java:** LinkedHashMap with accessOrder=true is a built-in LRU cache.

**LFU (Least Frequently Used):** Evict the item accessed fewest times. On tie, evict LRU among those.

**O(1) LFU implementation:** Three maps:
1. \`keyToVal\` — key → value
2. \`keyToFreq\` — key → frequency count
3. \`freqToKeys\` — frequency → LinkedHashSet of keys (LRU order within same freq)
Track \`minFreq\`. On evict: remove oldest key from \`freqToKeys[minFreq]\`.

**When to use LRU vs LFU:**
- LRU: general web cache. Recent access = likely to be accessed again.
- LFU: media libraries, CDN content. Popular items (high freq) should stay regardless of recent access.
- LRU simpler to implement; LFU resists scan pollution better.`,
  why:`LRU cache implementation is one of the most common coding interview questions. Every caching layer internally uses one of these algorithms.`,
  example:{
    language:"java",
    code:`// LRU Cache — O(1) get and put
public class LRUCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> cache;

    public LRUCache(int capacity) {
        this.capacity = capacity;
        // accessOrder=true: get() moves entry to end (most recent)
        this.cache = new LinkedHashMap<>(capacity, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > capacity;  // auto-evict LRU entry
            }
        };
    }

    public synchronized V get(K key) {
        return cache.getOrDefault(key, null);
    }

    public synchronized void put(K key, V value) {
        cache.put(key, value);
    }
}

// Custom DLL implementation (for interview — shows understanding)
public class LRUCacheManual {
    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0); // dummy
    private final Node tail = new Node(0, 0); // dummy

    public LRUCacheManual(int capacity) {
        this.capacity = capacity;
        head.next = tail; tail.prev = head;
    }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        moveToHead(n);  // mark as recently used
        return n.val;
    }

    public void put(int key, int val) {
        Node n = map.get(key);
        if (n != null) { n.val = val; moveToHead(n); return; }
        Node newNode = new Node(key, val);
        map.put(key, newNode);
        addToHead(newNode);
        if (map.size() > capacity) {
            Node lru = removeTail();
            map.remove(lru.key);
        }
    }

    private void addToHead(Node n) {
        n.prev = head; n.next = head.next;
        head.next.prev = n; head.next = n;
    }
    private void removeNode(Node n) {
        n.prev.next = n.next; n.next.prev = n.prev;
    }
    private void moveToHead(Node n) { removeNode(n); addToHead(n); }
    private Node removeTail() { Node n = tail.prev; removeNode(n); return n; }

    static class Node {
        int key, val; Node prev, next;
        Node(int k, int v) { key=k; val=v; }
    }
}

// LFU Cache — O(1) all operations
public class LFUCache {
    private final int capacity;
    private int minFreq = 0;
    private final Map<Integer, Integer> keyToVal = new HashMap<>();
    private final Map<Integer, Integer> keyToFreq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<Integer>> freqToKeys = new HashMap<>();

    public LFUCache(int capacity) { this.capacity = capacity; }

    public int get(int key) {
        if (!keyToVal.containsKey(key)) return -1;
        increaseFreq(key);
        return keyToVal.get(key);
    }

    public void put(int key, int val) {
        if (capacity <= 0) return;
        if (keyToVal.containsKey(key)) {
            keyToVal.put(key, val); increaseFreq(key); return;
        }
        if (keyToVal.size() >= capacity) removeMinFreq();
        keyToVal.put(key, val); keyToFreq.put(key, 1);
        freqToKeys.computeIfAbsent(1, k -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }

    private void increaseFreq(int key) {
        int freq = keyToFreq.get(key);
        keyToFreq.put(key, freq + 1);
        freqToKeys.get(freq).remove(key);
        if (freqToKeys.get(freq).isEmpty()) {
            freqToKeys.remove(freq);
            if (minFreq == freq) minFreq++;
        }
        freqToKeys.computeIfAbsent(freq+1, k -> new LinkedHashSet<>()).add(key);
    }

    private void removeMinFreq() {
        LinkedHashSet<Integer> keys = freqToKeys.get(minFreq);
        int lfu = keys.iterator().next(); // LRU among min-freq (LinkedHashSet preserves insertion order)
        keys.remove(lfu); if (keys.isEmpty()) freqToKeys.remove(minFreq);
        keyToVal.remove(lfu); keyToFreq.remove(lfu);
    }
}`,
    notes:"LinkedHashSet preserves insertion order — so iteration gives LRU order among keys with the same frequency. This makes LFU O(1) for all operations."
  },
  interview:[
    {question:"Implement a thread-safe LRU cache in Java.",
     answer:`Wrap LinkedHashMap with synchronized methods (as shown above) for simplicity. For production:\n- Use \`Collections.synchronizedMap\` around LinkedHashMap — coarse-grained lock\n- For better concurrency: use ConcurrentHashMap + ConcurrentLinkedDeque (approximate LRU with lower contention)\n- For high-performance: Caffeine library uses a window TinyLFU algorithm — lock-free, SLRU, ~10× faster than synchronizedLinkedHashMap\n\nCaffeine is what Spring Boot uses internally when you add \`@Cacheable\` with Caffeine configuration.`,
     followUps:["What is the Window TinyLFU algorithm used by Caffeine?","When is LFU strictly better than LRU?"]
    }
  ],
  tradeoffs:{
    pros:["LRU: simple, O(1), handles temporal locality","LFU: resists cache pollution from one-time scans","Both: bounded memory, automatic eviction"],
    cons:["LRU: scan can evict popular items","LFU: frequency counts inflate for old items (frequency aging needed)","Both: no awareness of item size — small and large items treated equally"],
    when:"LRU for general application caches (HTTP responses, DB query results). LFU for content libraries (videos, images) where popularity matters more than recency."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var W = 460, H = 320;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:8px';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    mount.appendChild(canvas);
    mount.appendChild(btnRow);
    var ctx = canvas.getContext('2d');

    // LRU state: capacity 4, list order = MRU..LRU (index 0 = MRU)
    var cache = [{k:'D',v:4},{k:'C',v:3},{k:'B',v:2},{k:'A',v:1}];
    var CAPACITY = 4;
    var msg = 'Initial state: D=MRU, A=LRU';
    var msgColor = '#8b949e';
    var flash = null; // {x,y,text,color,ttl}
    var animNodes = []; // {key, fromX, toX, fromY, toY, t, color}
    var raf = null;

    function nodeX(i) { return 40 + i * 88; }
    var nodeY = 90;
    var hmY = 210;

    function draw() {
      if (!document.body.contains(canvas)) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, W, H);

      // Title
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('LRU CACHE  (capacity = 4)', 14, 20);
      ctx.fillText('MRU ← head', 14, 36);
      ctx.fillText('tail → LRU', W - 90, 36);

      // Draw DLL nodes
      var nodeW = 64, nodeH = 44;
      for (var i = 0; i < cache.length; i++) {
        var x = nodeX(i), y = nodeY;
        var isAnim = false;
        for (var a = 0; a < animNodes.length; a++) {
          if (animNodes[a].key === cache[i].k) { isAnim = true; break; }
        }
        ctx.fillStyle = isAnim ? '#1f3a1f' : '#161b22';
        ctx.strokeStyle = isAnim ? '#3fb950' : '#30363d';
        ctx.lineWidth = isAnim ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(x - nodeW/2, y, nodeW, nodeH, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = isAnim ? '#3fb950' : '#e6edf3';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cache[i].k, x, y + 20);
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px monospace';
        ctx.fillText('val=' + cache[i].v, x, y + 36);

        // Arrows between nodes
        if (i < cache.length - 1) {
          var ax = x + nodeW/2 + 2, ay = y + nodeH/2;
          var bx = nodeX(i+1) - nodeW/2 - 2;
          ctx.strokeStyle = '#30363d';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay - 3); ctx.lineTo(bx, ay - 3); ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(ax, ay + 3); ctx.lineTo(bx, ay + 3); ctx.stroke();
          // arrowheads
          ctx.fillStyle = '#30363d';
          ctx.beginPath();
          ctx.moveTo(bx, ay - 3); ctx.lineTo(bx - 6, ay - 7); ctx.lineTo(bx - 6, ay + 1); ctx.fill();
          ctx.beginPath();
          ctx.moveTo(ax, ay + 3); ctx.lineTo(ax - 6, ay - 1); ctx.lineTo(ax - 6, ay + 7); ctx.fill();
        }
      }

      // HashMap section
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('HashMap  key → node', 14, hmY - 8);
      var hmEntryW = 90;
      for (var i = 0; i < cache.length; i++) {
        var hx = 14 + i * (hmEntryW + 6), hy = hmY;
        ctx.fillStyle = '#161b22';
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(hx, hy, hmEntryW, 28, 4);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#58a6ff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(cache[i].k + ' → node', hx + hmEntryW/2, hy + 18);
      }

      // Animated nodes (moving)
      for (var a = 0; a < animNodes.length; a++) {
        var an = animNodes[a];
        var t = Math.min(1, an.t);
        var ex = an.fromX + (an.toX - an.fromX) * t;
        var ey = an.fromY + (an.toY - an.fromY) * t;
        ctx.fillStyle = '#1f3a1f';
        ctx.strokeStyle = '#3fb950';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(ex - 32, ey, 64, 44, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#3fb950';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(an.key, ex, ey + 20);
      }

      // Flash overlay
      if (flash && flash.ttl > 0) {
        ctx.globalAlpha = Math.min(1, flash.ttl / 20);
        ctx.fillStyle = flash.color;
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(flash.text, flash.x, flash.y);
        ctx.globalAlpha = 1;
        flash.ttl--;
      }

      // Status message
      ctx.fillStyle = msgColor;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(msg, W/2, H - 12);
    }

    function tick() {
      var running = false;
      for (var a = 0; a < animNodes.length; a++) {
        animNodes[a].t += 0.06;
        if (animNodes[a].t < 1) running = true;
      }
      if (!running) animNodes = [];
      draw();
      if (running || (flash && flash.ttl > 0)) {
        raf = requestAnimationFrame(tick);
      }
    }

    function startTick() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function findIdx(k) {
      for (var i = 0; i < cache.length; i++) if (cache[i].k === k) return i;
      return -1;
    }

    function doGet(k) {
      var idx = findIdx(k);
      if (idx === -1) {
        msg = 'GET ' + k + ' → MISS (null returned)';
        msgColor = '#f85149';
        flash = {x: W/2, y: nodeY + 22, text: 'NULL', color: '#f85149', ttl: 40};
        startTick(); return;
      }
      if (idx === 0) {
        msg = 'GET ' + k + ' → HIT, already MRU';
        msgColor = '#3fb950';
        flash = {x: nodeX(0), y: nodeY - 14, text: 'HIT ✓', color: '#3fb950', ttl: 40};
        startTick(); return;
      }
      var node = cache.splice(idx, 1)[0];
      var fromX = nodeX(idx);
      animNodes = [{key: node.k, fromX: fromX, toX: nodeX(0), fromY: nodeY, toY: nodeY - 20, t: 0}];
      cache.unshift(node);
      msg = 'GET ' + k + ' → HIT, moved to MRU (head)';
      msgColor = '#3fb950';
      flash = {x: nodeX(0), y: nodeY - 16, text: 'MRU ↑', color: '#3fb950', ttl: 50};
      startTick();
    }

    function doPut(k, v, label) {
      var idx = findIdx(k);
      if (idx !== -1) {
        // update existing, move to head
        var node = cache.splice(idx, 1)[0];
        node.v = v;
        var fromX = nodeX(idx);
        cache.unshift(node);
        animNodes = [{key: node.k, fromX: fromX, toX: nodeX(0), fromY: nodeY, toY: nodeY - 20, t: 0}];
        msg = 'PUT ' + k + '=' + v + ' → updated, moved to MRU';
        msgColor = '#ffa657';
        flash = {x: nodeX(0), y: nodeY - 16, text: 'UPDATED→MRU', color: '#ffa657', ttl: 50};
      } else {
        if (cache.length >= CAPACITY) {
          var evicted = cache.pop();
          flash = {x: nodeX(CAPACITY - 1), y: nodeY - 16, text: 'EVICTED: ' + evicted.k, color: '#f85149', ttl: 50};
          msg = 'PUT ' + k + '=' + v + ' → capacity full, evicted ' + evicted.k + ' (LRU)';
          msgColor = '#f85149';
        } else {
          msg = 'PUT ' + k + '=' + v + ' → added at MRU (head)';
          msgColor = '#3fb950';
          flash = {x: nodeX(0), y: nodeY - 16, text: 'NEW→MRU', color: '#3fb950', ttl: 50};
        }
        cache.unshift({k: k, v: v});
        animNodes = [{key: k, fromX: nodeX(0) - 60, toX: nodeX(0), fromY: nodeY + 20, toY: nodeY, t: 0}];
      }
      startTick();
    }

    draw();

    var ops = [
      {label:'GET A', fn: function(){ doGet('A'); }},
      {label:'GET C', fn: function(){ doGet('C'); }},
      {label:'GET X (miss)', fn: function(){ doGet('X'); }},
      {label:'PUT E', fn: function(){ doPut('E', 5, 'PUT E=5'); }},
      {label:'PUT B (update)', fn: function(){ doPut('B', 99, 'PUT B=99'); }}
    ];
    ops.forEach(function(op) {
      var b = document.createElement('button');
      b.textContent = op.label; b.style.cssText = btnStyle;
      b.onclick = op.fn;
      btnRow.appendChild(b);
    });
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
