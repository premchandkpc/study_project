(function () {
  'use strict';

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([{
    id:    'java-gc-collectors',
    area:  'java',
    title: 'GC Collectors: G1, ZGC, Shenandoah',
    tag:   'Performance',
    tags:  ['java', 'gc', 'g1', 'zgc', 'shenandoah', 'garbage-collection', 'pauses'],

    concept: `Modern JVM GCs differ in how they trade throughput vs pause time. G1GC (Java 9 default): divides heap into equal-size regions (~1-32MB), collects highest-garbage regions first. ZGC (Java 15 GA): concurrent mark + relocate with colored pointers, sub-millisecond pauses, scales to TB heaps. Shenandoah: concurrent evacuation via forwarding pointers, similar pause goals to ZGC but different mechanism. All run most work concurrently with application threads.`,

    why: `GC pauses directly cause latency spikes in production. A 200ms G1 full GC pause = 200ms service timeout to clients. ZGC/Shenandoah target <1ms pauses at the cost of higher CPU. Choosing the wrong GC for your workload (throughput vs latency) is a common production performance mistake.`,

    example: {
      language: 'java',
      code: `// JVM GC flags — choose one

// G1GC (default Java 9+) — balanced throughput + latency
-XX:+UseG1GC
-XX:MaxGCPauseMillis=200       // soft pause target
-XX:G1HeapRegionSize=16m       // region size (1-32MB)
-XX:G1NewSizePercent=20        // young gen floor
-XX:G1MaxNewSizePercent=40     // young gen ceiling
-XX:G1MixedGCLiveThresholdPercent=85  // skip almost-full regions

// ZGC (Java 17+ production-ready) — ultra-low latency
-XX:+UseZGC
-XX:SoftMaxHeapSize=30g        // soft limit (ZGC expands beyond on pressure)
-XX:ZUncommitDelay=300         // return memory to OS after 5 min

// Shenandoah (Java 15+) — concurrent evacuation
-XX:+UseShenandoahGC
-XX:ShenandoahGCMode=iu        // incremental-update (default)

// GC logging (all collectors)
-Xlog:gc*:file=/var/log/app-gc.log:time,uptime,tags

// Monitor: JVM GC metrics
// jcmd <pid> GC.run        — trigger GC
// jstat -gcutil <pid> 1000 — GC stats every 1s`,
    },

    interview: [
      'How does G1GC select which regions to collect?',
      'What makes ZGC achieve sub-millisecond pauses?',
      'What are colored pointers (load barriers) in ZGC?',
      'When would you choose ZGC over G1?',
      'What is the difference between concurrent and stop-the-world phases?',
    ],

    tradeoffs: {
      pros: [
        'G1: best throughput of modern GCs, predictable pause target, default for most apps',
        'ZGC: <1ms pauses, scales to TB heap, ideal for latency-sensitive services',
        'Shenandoah: concurrent evacuation, good for medium heaps with strict latency',
      ],
      cons: [
        'G1: pauses can spike to 200ms+ at high allocation rates, region fragmentation',
        'ZGC: higher CPU overhead (colored pointers = load barrier on every ref read)',
        'Shenandoah: higher memory overhead (forwarding pointers), less tuning knobs',
        'All: concurrent GC needs more heap headroom than stop-the-world collectors',
      ],
    },

    gotchas: [
      'MaxGCPauseMillis is a SOFT target — G1 will exceed it under pressure',
      'ZGC needs extra heap headroom: run 25-30% more heap than live data set',
      'G1 full GC is single-threaded stop-the-world — avoid humongous objects',
      'Humongous objects (>50% region size) in G1 bypass young gen — cause full GC',
      'jstat -gcutil shows: S0/S1=survivor, E=eden, O=old, M=metaspace, GCT=GC time total',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — G1GC heap layout. Heap divided into equal regions (~16MB each). Each region dynamically typed: Eden, Survivor, Old, Humongous. No fixed young/old boundary.',
          nodes: [
            { id: 'heap',  label: 'G1 Heap (e.g. 4GB)',   type: 'store',     active: true },
            { id: 'eden',  label: 'Eden Regions\n[E][E][E][E]\nnew allocations',  type: 'action',  active: true },
            { id: 'surv',  label: 'Survivor Regions\n[S][S]\nafter minor GC',    type: 'cache',   active: true },
            { id: 'old',   label: 'Old Regions\n[O][O][O][O][O]\nlong-lived',    type: 'network', active: true },
            { id: 'hum',   label: 'Humongous\n[H][H]\nobjects >50% region',      type: 'reducer', active: true },
          ],
          edges: [
            { from: 'heap', to: 'eden', label: '', active: true },
            { from: 'heap', to: 'surv', label: '', active: true },
            { from: 'heap', to: 'old',  label: '', active: true },
            { from: 'heap', to: 'hum',  label: '', active: true },
            { from: 'eden', to: 'surv', label: 'minor GC (STW)', active: true, color: '#ffa657' },
            { from: 'surv', to: 'old',  label: 'age threshold', active: true, color: '#f85149' },
          ],
          code: `// G1 Heap = array of equal-size regions
// Default region count: ~2048 regions
// Region size: heap / 2048, rounded to power of 2 (1-32MB)
// 4GB heap → ~2MB regions

// Dynamic region types — same region can change role
// Eden → Survivor → Old → Empty → Eden again

// Humongous allocation (>50% region = >1MB for 2MB regions):
// Bypasses young gen → allocated directly in Old/Humongous regions
// Humongous objects cause G1 full GC if they cause fragmentation
// Fix: -XX:G1HeapRegionSize=32m (larger regions → higher hum threshold)`,
        },
        {
          phase: 'effect',
          narration: 'Step 2 — G1 Young GC (minor). Eden full → stop-the-world → copy live objects to Survivor/Old → reclaim Eden. Target pause: MaxGCPauseMillis.',
          nodes: [
            { id: 'eden2',  label: 'Eden FULL',              type: 'reducer',   active: true },
            { id: 'stw1',   label: 'Stop-The-World\n(~10-50ms)',  type: 'action', active: true },
            { id: 'live',   label: 'Copy LIVE objects\nto Survivor',  type: 'cache',  active: true },
            { id: 'dead',   label: 'DEAD objects\nreclaimed (Eden freed)', type: 'network', active: true },
            { id: 'age',    label: 'Age++ → Old\nif age ≥ threshold', type: 'store',  active: true },
          ],
          edges: [
            { from: 'eden2', to: 'stw1', label: 'trigger', active: true, color: '#f85149' },
            { from: 'stw1',  to: 'live', label: 'mark live', active: true },
            { from: 'live',  to: 'age',  label: 'promote', active: true, color: '#ffa657' },
            { from: 'stw1',  to: 'dead', label: 'reclaim', active: true, color: '#3fb950' },
          ],
          code: `// G1 Young GC phases (all stop-the-world):
// 1. Root scanning: GC roots (stack frames, statics, JNI)
// 2. Remembered Set scan: find old-to-young pointers
// 3. Copy live young objects to Survivor regions
// 4. Promote aged survivors to Old regions
// 5. Release dead Eden regions

// -XX:MaxGCPauseMillis=200 (default)
// G1 adjusts young gen size to meet pause target
// More Eden = less frequent GC but longer pauses

// Monitor young GC:
// [GC pause (G1 Evacuation Pause) (young) 12M->4M(256M) 8ms]
//  ↑ young gen evacuated              ↑ before→after ↑ pause`,
        },
        {
          phase: 'commit',
          narration: 'Step 3 — G1 Mixed GC. Concurrent marking identifies garbage in Old regions. Selects highest-garbage regions (Collection Set) for mixed collection.',
          nodes: [
            { id: 'conc',   label: 'Concurrent Mark\n(app runs)',    type: 'component', active: true },
            { id: 'liveness',label: 'Liveness computed\nper region', type: 'cache',     active: true },
            { id: 'cset',   label: 'Collection Set\n(top-garbage regions)', type: 'action', active: true },
            { id: 'mixed',  label: 'Mixed GC\n(young + selected old)', type: 'store',   active: true },
          ],
          edges: [
            { from: 'conc',    to: 'liveness', label: 'mark phase', active: true, color: '#3fb950' },
            { from: 'liveness',to: 'cset',     label: 'rank by garbage%', active: true, color: '#ffa657' },
            { from: 'cset',    to: 'mixed',    label: 'collect selected', active: true, color: '#ffa657' },
          ],
          code: `// G1 Concurrent Marking Cycle:
// Initial Mark (STW, piggybacks on Young GC)
// Root Region Scan (concurrent)
// Concurrent Mark (concurrent, marks all reachable)
// Remark (STW, short)
// Cleanup (STW, sorts regions by liveness)

// After marking: regions ranked by garbage %
// G1MixedGCLiveThresholdPercent=85 → skip regions >85% live
// Mixed GC: collect young + SELECTED old regions
// Target: collect garbage-heavy old regions first ("Garbage First")

// [GC pause (G1 Evacuation Pause) (mixed) 256M->128M(512M) 45ms]
//                                  ↑ includes old region collection`,
        },
        {
          phase: 'render',
          narration: 'Step 4 — ZGC: colored pointers + load barriers. Every object reference stores metadata bits. Load barrier intercepts every reference read — enables concurrent relocation.',
          nodes: [
            { id: 'ptr',    label: 'ZGC Colored Pointer\n[finalizable|remap|mark1|mark0|address]', type: 'store', active: true },
            { id: 'bar',    label: 'Load Barrier\n(on every reference read)',   type: 'action',    active: true },
            { id: 'check',  label: 'Is ref still valid?\n(not relocated?)',     type: 'cache',     active: true },
            { id: 'fix',    label: 'Relocate ref\n(fix pointer in place)',      type: 'component', active: true },
            { id: 'app',    label: 'App gets correct\npointer (always)',        type: 'client',    active: true },
          ],
          edges: [
            { from: 'ptr',   to: 'bar',   label: 'read ref', active: true },
            { from: 'bar',   to: 'check', label: 'check bits', active: true, color: '#ffa657' },
            { from: 'check', to: 'fix',   label: 'if relocated', active: true, color: '#f85149' },
            { from: 'check', to: 'app',   label: 'if valid', active: true, color: '#3fb950' },
            { from: 'fix',   to: 'app',   label: 'corrected ptr', active: true, color: '#3fb950' },
          ],
          code: `// ZGC pointer (64-bit) layout:
// bits 63-42: metadata (finalizable, remapped, mark1, mark0)
// bits 41-0:  actual heap address (4TB addressable)

// Load barrier fires on every object reference READ:
Object obj = someRef;  // barrier fires here

// Barrier pseudocode:
if (ref.isNotRemapped()) {  // check colored bit
    ref = remap(ref);       // follow forwarding pointer
    store ref back;         // self-heal — update source ref
}
return ref;

// Result: application always sees correct pointer
// GC can relocate objects CONCURRENTLY — app doesn't see inconsistency
// Pause only needed for: root scanning + remap verification (~1ms)

// -XX:+UseZGC
// Java 17: production ready
// Java 21: generational ZGC (-XX:+ZGenerational) for better throughput`,
        },
        {
          phase: 'idle',
          narration: 'Step 5 — GC selection guide. Match collector to workload: throughput vs latency vs heap size.',
          nodes: [
            { id: 'g1',    label: 'G1GC\n• Default (Java 9+)\n• 200ms pause target\n• 4-32GB heaps\n• General purpose', type: 'store',     active: true },
            { id: 'zgc',   label: 'ZGC\n• <1ms pauses\n• Scales to TB\n• Higher CPU\n• Latency-critical', type: 'action',    active: true },
            { id: 'shen',  label: 'Shenandoah\n• <1ms pauses\n• Medium heaps\n• Concurrent evac\n• Alternative to ZGC', type: 'cache',   active: true },
            { id: 'serial',label: 'Serial/Parallel\n• Max throughput\n• Batch jobs\n• STW pauses OK', type: 'network',   active: true },
          ],
          edges: [],
          code: `// GC selection by workload:

// Web services (general):    -XX:+UseG1GC (default)
// Low-latency microservices: -XX:+UseZGC (Java 17+)
// Interactive/real-time:     -XX:+UseShenandoahGC
// Batch/analytics:           -XX:+UseParallelGC (max throughput)
// Small embedded apps:       -XX:+UseSerialGC

// Tuning G1 for low latency:
-XX:MaxGCPauseMillis=100      // tighter pause target
-XX:G1HeapRegionSize=32m      // larger regions → fewer humongous issues
-XX:GCTimeRatio=4             // spend max 20% time in GC

// Tuning ZGC:
-Xmx30g -XX:SoftMaxHeapSize=25g  // headroom for concurrent GC
-XX:ZCollectionInterval=5         // max 5s between GC cycles
-XX:+ZGenerational               // Java 21: gen ZGC (best of both)

// Profile GC:
// jstat -gcutil <pid> 2000        — stats every 2s
// -Xlog:gc*:file=gc.log           — full GC log
// GCEasy.io / GCViewer            — log analysis tools`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'GC Collectors: G1, ZGC, Shenandoah',
        time:  '<1ms (ZGC) to ~200ms (G1)',
        space: 'O(heap regions)',
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
