(function () {
  'use strict';

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    'java-string-pool',
    area:  'java',
    title: 'String Pool Internals',
    tag:   'Internals',
    tags:  ['java', 'string-pool', 'intern', 'heap', 'memory'],

    concept: `The String Pool (interned string table) is a hash table in the JVM heap (moved from PermGen to heap in Java 7+). String literals are automatically interned — the JVM checks the pool before creating a new object. String.intern() manually adds heap strings to the pool. Two interned strings with same content share one object — == comparison works. new String("x") always creates a new heap object outside the pool.`,

    why: `String is the most common Java object. Without pooling, every identical string literal creates a redundant heap object. Understanding intern behavior prevents subtle == vs .equals() bugs in production and helps tune memory for string-heavy workloads (e.g., log parsing, XML/JSON processing).`,

    example: {
      language: 'java',
      code: `// String pool behavior
String s1 = "hello";           // → pool: creates/reuses "hello"
String s2 = "hello";           // → pool: reuses same object
String s3 = new String("hello"); // → heap: NEW object outside pool
String s4 = s3.intern();        // → pool: returns pooled "hello"

System.out.println(s1 == s2);   // true  — same pool object
System.out.println(s1 == s3);   // false — s3 is heap object
System.out.println(s1 == s4);   // true  — s4 is pooled

// Concatenation at compile time → pooled
String s5 = "hel" + "lo";      // compile-time constant → pool
System.out.println(s1 == s5);   // true

// Runtime concatenation → heap object
String part = "hel";
String s6 = part + "lo";        // runtime → new heap String
System.out.println(s1 == s6);   // false

// ALWAYS use .equals() for content comparison
System.out.println(s1.equals(s3)); // true — content equal`,
    },

    interview: [
      'Where does the String Pool live in Java 7+ vs Java 6?',
      'Why does new String("hello") not use the pool?',
      'When would you call String.intern() in production?',
      'Why is == unreliable for String comparison?',
      'How does compile-time concatenation differ from runtime?',
    ],

    tradeoffs: {
      pros: [
        'Memory deduplication — same string content = one object',
        'Pool lookup O(1) — hash table',
        'String literals automatically pooled — zero effort',
      ],
      cons: [
        'Pool has overhead — hash table entries for every distinct string',
        'Aggressive intern() of dynamic strings can cause memory leak (pool never GCd in Java 6)',
        'Java 7+ pool is on heap — GC can collect unused interned strings',
      ],
    },

    gotchas: [
      '== compares references, not content — always use .equals() or Objects.equals()',
      'new String("x") creates TWO objects: one in pool (the literal "x"), one on heap',
      'String.format() / StringBuilder always produce heap strings — never pooled',
      'Java 6: pool in PermGen → OutOfMemoryError:PermGen if too many intern() calls',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — JVM memory layout. String Pool is a hash table inside the heap. Pool entries: keys = string content hash, values = String object reference.',
          nodes: [
            { id: 'heap',   label: 'JVM Heap',                           type: 'store',     active: true },
            { id: 'pool',   label: 'String Pool\n(interned table)\nheap segment', type: 'cache', active: true },
            { id: 'eden',   label: 'Eden Space\n(new objects)',           type: 'component', active: true },
            { id: 'old',    label: 'Old Gen\n(long-lived objects)',       type: 'network',   active: true },
          ],
          edges: [
            { from: 'heap', to: 'pool', label: 'inside heap (Java 7+)', active: true, color: '#ffa657' },
            { from: 'heap', to: 'eden', label: '', active: true },
            { from: 'heap', to: 'old',  label: '', active: true },
          ],
          code: `// Java 6: String Pool in PermGen (fixed size → OOM risk)
// Java 7+: String Pool moved to HEAP → GC can collect

// Pool = hash table: hash(content) → String reference
// Default capacity: -XX:StringTableSize=65536 buckets
// Tune with: -XX:StringTableSize=1000003 (prime)

// View pool stats (Java 11+):
// jcmd <pid> VM.stringtable`,
        },
        {
          phase: 'render',
          narration: 'Step 2 — String literal assignment. JVM checks pool for "hello". Not found → creates String in pool. s1 and s2 both point to same pool object.',
          nodes: [
            { id: 'pool2',  label: 'String Pool\n[ "hello" → @0x1234 ]', type: 'cache',     active: true },
            { id: 's1',     label: 'String s1\n→ @0x1234',               type: 'component', active: true },
            { id: 's2',     label: 'String s2\n→ @0x1234',               type: 'component', active: true },
            { id: 'obj',    label: 'String @0x1234\n"hello"',            type: 'store',     active: true },
          ],
          edges: [
            { from: 'pool2', to: 'obj',  label: 'stores ref', active: true, color: '#ffa657' },
            { from: 's1',    to: 'obj',  label: 'points to', active: true, color: '#3fb950' },
            { from: 's2',    to: 'obj',  label: 'same ref!', active: true, color: '#3fb950' },
          ],
          code: `String s1 = "hello";  // pool miss → create @0x1234 in pool
String s2 = "hello";  // pool hit  → return @0x1234

// s1 == s2 → true  (same reference: @0x1234)
// s1.equals(s2) → true (same content)

// JVM does interning automatically for:
// - String literals: "hello"
// - Compile-time constants: "hel" + "lo"
// - Class names, method names (internal JVM use)`,
        },
        {
          phase: 'update',
          narration: 'Step 3 — new String("hello") bypasses pool. Creates fresh heap object. s3 reference differs from s1 even though content is identical.',
          nodes: [
            { id: 'pool3',  label: 'String Pool\n[ "hello" → @0x1234 ]', type: 'cache',     active: true },
            { id: 's1b',    label: 'String s1\n→ @0x1234',               type: 'component', active: true },
            { id: 's3',     label: 'String s3\n→ @0x5678 (NEW)',          type: 'reducer',   active: true },
            { id: 'obj1',   label: 'Pool: @0x1234\n"hello"',              type: 'store',     active: true },
            { id: 'obj2',   label: 'Heap: @0x5678\n"hello" (duplicate!)', type: 'reducer',   active: true },
          ],
          edges: [
            { from: 'pool3', to: 'obj1', label: '', active: true },
            { from: 's1b',   to: 'obj1', label: 'pool ref', active: true, color: '#3fb950' },
            { from: 's3',    to: 'obj2', label: 'heap ref', active: true, color: '#f85149' },
          ],
          code: `// new String() ALWAYS allocates fresh heap object
String s3 = new String("hello");
// Note: "hello" literal still creates/reuses pool @0x1234
// BUT s3 points to a NEW object @0x5678 on heap

s1 == s3   // false  — different references!
s1.equals(s3) // true  — same content

// Two objects exist for same content:
// @0x1234 in pool
// @0x5678 on heap (redundant)

// Fix: don't use new String() unless you need a fresh object
// (rare: CharBuffer wrapping, specific char[] encoding)`,
        },
        {
          phase: 'effect',
          narration: 'Step 4 — String.intern() moves heap String into pool. s4 = s3.intern() → returns pooled @0x1234. Heap @0x5678 eligible for GC.',
          nodes: [
            { id: 's3b',    label: 'String s3\n→ @0x5678',               type: 'reducer',   active: true },
            { id: 'intern', label: 's3.intern()',                          type: 'action',    active: true },
            { id: 'check',  label: 'Pool check:\n"hello" exists? YES',    type: 'cache',     active: true },
            { id: 's4',     label: 'String s4\n→ @0x1234 (pool ref)',     type: 'component', active: true },
            { id: 'gc',     label: '@0x5678\neligible for GC',            type: 'network',   active: true, dim: true },
          ],
          edges: [
            { from: 's3b',    to: 'intern', label: 'call', active: true },
            { from: 'intern', to: 'check',  label: 'lookup', active: true },
            { from: 'check',  to: 's4',     label: 'return @0x1234', active: true, color: '#3fb950' },
            { from: 's3b',    to: 'gc',     label: 'no more ref → GC', active: true, color: '#768390' },
          ],
          code: `String s4 = s3.intern();
// intern() semantics:
// 1. Compute hash of s3 content
// 2. Look up pool table
// 3. Found: return existing pool reference (@0x1234)
// 4. Not found: add s3 to pool, return s3

s1 == s4   // true — both point to pool @0x1234

// When to use intern() in production:
// - Deduplicating strings from parsing (huge XML/JSON)
// - String keys read from files (same keys repeated millions of times)
// - After Java 8u20: G1 String Deduplication (-XX:+UseG1GC -XX:+UseStringDeduplication)
//   does this automatically during GC (no intern() needed)`,
        },
        {
          phase: 'render',
          narration: 'Step 5 — Compile-time vs runtime concatenation. "hel"+"lo" folded by compiler → pool. Variable + literal = runtime StringBuilder → heap.',
          nodes: [
            { id: 'compile', label: '"hel" + "lo"\ncompile-time fold',   type: 'action',    active: true },
            { id: 'runtime', label: 'part + "lo"\nruntime StringBuilder', type: 'reducer',  active: true },
            { id: 'poolx',   label: 'Pool: @0x1234 "hello"',             type: 'cache',     active: true },
            { id: 'heapx',   label: 'Heap: @0xABCD "hello" (NEW)',       type: 'reducer',   active: true },
          ],
          edges: [
            { from: 'compile', to: 'poolx', label: '→ pool ref', active: true, color: '#3fb950' },
            { from: 'runtime', to: 'heapx', label: '→ new heap obj', active: true, color: '#f85149' },
          ],
          code: `// Compile-time constant folding → pool
String s5 = "hel" + "lo";   // javac folds to "hello" literal → pool
s1 == s5  // true

// Runtime variable involved → StringBuilder → heap
String part = "hel";
String s6 = part + "lo";    // → new StringBuilder().append("hel").append("lo").toString()
s1 == s6  // false          // toString() = new String() outside pool

// How to check at compile time?
// javap -c MyClass.class — look for ldc (literal load) vs StringBuilder

// ALWAYS: use .equals() for content comparison
// NEVER: rely on == for String equality in application code`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'String Pool Internals',
        time:  'O(1) pool lookup',
        space: 'O(distinct strings)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'java');
        },
      });
    },
  }]);
})();
