(function() {
  var topic = {
    id: "java-jvm-memory-gc",
    area: "java",
    title: "JVM Memory Model & Garbage Collection",
    tag: "JVM",
    tags: ["jvm", "gc", "g1", "zgc", "memory"],
    concept:
`The JVM splits memory into **Heap** (Young = Eden + S0/S1, Old/Tenured), **Metaspace** (class metadata, native), **Stack** (per-thread frames), **PC register**, and **Native method stack**. Allocations land in Eden; surviving objects age through survivor spaces, then promote to Old.
Modern collectors:
- **G1** — region-based, predictable pause-time goal, default since Java 9.
- **ZGC** — sub-millisecond pauses, colored pointers, scales to multi-TB heaps. Production-ready since Java 15.
- **Shenandoah** — concurrent compaction, Red Hat.
- **Generational ZGC** (Java 21) combines young/old generations with ZGC's concurrency.`,
    why:
`Heap layout and GC choice directly drive **p99 latency** and **throughput**. Misconfigured heaps cause stop-the-world pauses that break SLOs in trading, ads, and chat systems. At scale (\`> 32 GB heap\`), CompressedOops boundary and GC algorithm choice change throughput by 20–40%.`,
    example: {
      language: "java",
      code:
`// JVM flags worth memorising for an interview
// java -Xms4g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \\
//      -XX:+UnlockExperimentalVMOptions -XX:+UseZGC \\
//      -Xlog:gc*,gc+heap=debug:file=gc.log:time,uptime,level,tags

import java.lang.management.*;
import java.util.*;

public class HeapInspector {
    public static void main(String[] args) {
        MemoryMXBean mem = ManagementFactory.getMemoryMXBean();
        System.out.println("Heap     : " + mem.getHeapMemoryUsage());
        System.out.println("NonHeap  : " + mem.getNonHeapMemoryUsage());

        for (MemoryPoolMXBean p : ManagementFactory.getMemoryPoolMXBeans()) {
            System.out.printf("%-24s %-10s %s%n", p.getName(), p.getType(), p.getUsage());
        }
        // Force allocation to watch Eden fill
        List<byte[]> hold = new ArrayList<>();
        for (int i = 0; i < 50; i++) hold.add(new byte[1 << 20]); // 1 MB blocks
    }
}`,
      notes:
`Edge cases: humongous allocations (> 50% of G1 region) skip Eden and go straight to Old; large arrays cause fragmentation. Always pin \`-Xms = -Xmx\` in containers to avoid resize stalls.`
    },
    interview: [
      {
        question: "When would you pick ZGC over G1?",
        answer:
`Pick **ZGC** when p99/p999 latency matters more than peak throughput and the heap is large (> 16 GB). ZGC keeps pause times sub-ms even at 16 TB. **G1** is the safer default for typical 4–32 GB services where 100–200 ms pauses are acceptable and throughput matters.`,
        followUps: ["What are colored pointers?", "Cost of ZGC's load barriers?", "Why is generational ZGC faster?"]
      },
      {
        question: "How do you debug a memory leak in production?",
        answer:
`1. Capture a heap dump with \`jcmd <pid> GC.heap_dump\` or \`-XX:+HeapDumpOnOutOfMemoryError\`. 2. Open in **Eclipse MAT** or **VisualVM**; look at dominator tree. 3. Inspect retained-size sorted by class. 4. Common culprits: unbounded caches, \`ThreadLocal\` leaks in pooled threads, JDBC \`PreparedStatement\` not closed, listeners not unregistered.`,
        followUps: ["What is a leak suspect in MAT?", "Why do ThreadLocals leak in Tomcat?"]
      },
      {
        question: "What is a 'humongous' allocation?",
        answer:
`In G1, any object larger than half of a region (regions are 1–32 MB) is allocated directly in contiguous old-gen regions. Many humongous allocations fragment the heap and force full GC. Detect with \`-Xlog:gc+heap=debug\`.`,
        followUps: ["How to tune region size?", "G1 vs Parallel for batch jobs?"]
      }
    ],
    tradeoffs: {
      pros: [
        "GC tuning is observable — every collector emits structured logs.",
        "ZGC/Shenandoah remove pause as a tuning lever for low-latency systems.",
        "JIT + escape analysis often outperform hand-written C for hot paths."
      ],
      cons: [
        "Each collector adds CPU/throughput overhead (~10–15% for ZGC).",
        "Memory overhead: G1 keeps remembered sets; ZGC reserves 2.5× virtual address space.",
        "Tuning is heap-shape specific — copy-paste flags rarely transfer."
      ],
      when:
`**G1** for general services. **ZGC** for low-latency, large-heap workloads. **Parallel GC** for short batch jobs where throughput trumps pause. **Serial GC** only for tiny CLI tools.`
    },
    flow: {
      title: "JVM Execution Pipeline — Source to GC",
      caption: "Every major JVM phase from .java file to garbage collection cycle.",
      nodes: [
        { id: "src",      label: ".java Source",       hint: "Human-readable Java source code" },
        { id: "javac",    label: "javac Compiler",     hint: "Compiles to platform-neutral bytecode" },
        { id: "cls",      label: ".class Bytecode",    hint: "JVM stack-machine ISA, not native code" },
        { id: "loader",   label: "ClassLoader",        hint: "Bootstrap → Extension → App (delegation model)" },
        { id: "verify",   label: "Bytecode Verifier",  hint: "Type safety, stack depth, branch targets checked" },
        { id: "meta",     label: "Metaspace",          hint: "Class metadata, method bytecode, interned strings (off-heap)" },
        { id: "interp",   label: "Interpreter (T0)",   hint: "Executes bytecode line-by-line — fast start, slow peak" },
        { id: "jit",      label: "JIT C1→C2 (T1–T4)", hint: "HotSpot tiered: profiling → full optimize + inlining" },
        { id: "eden",     label: "Eden / Young Gen",   hint: "New objects land here via TLAB bump-pointer (≈5 ns)" },
        { id: "survivor", label: "Survivor S0 ↔ S1",  hint: "Live objects copied here after each Minor GC" },
        { id: "old",      label: "Old Gen (Tenured)",  hint: "Long-lived objects promoted after age threshold" },
        { id: "gc",       label: "G1 / ZGC",           hint: "Concurrent marking + region-based compaction" }
      ],
      steps: [
        { path: ["src","javac"],       label: "1 · Compile",                detail: "javac parses, type-checks, and emits .class bytecode. No native code yet — bytecode targets a portable stack-machine ISA." },
        { path: ["javac","cls"],       label: "2 · .class emitted",         detail: ".class contains constant pool, method bytecodes, and attribute tables. Inspect with javap -c to see raw instructions." },
        { path: ["cls","loader"],      label: "3 · Class Loading",          detail: "ClassLoader reads .class bytes. Bootstrap loads JDK; AppClassLoader loads your JARs. Parent-delegation prevents shadowing core classes." },
        { path: ["loader","verify"],   label: "4 · Bytecode Verification",  detail: "Verifier rejects malformed code: wrong operand types, stack overflow, illegal field access. Runs once at load — safe to skip trusted code with -Xverify:none." },
        { path: ["loader","meta"],     label: "5 · Link → Metaspace",       detail: "Prepare (allocate static fields), Resolve (symbolic refs → direct memory refs), Initialize (run static {}). Class metadata stored in native Metaspace — not on heap." },
        { path: ["verify","interp"],   label: "6 · Interpret (Tier 0)",     detail: "Methods start interpreted. JVM counts invocations + back-edges. Quick startup; peak throughput ~10–50× slower than compiled native code." },
        { path: ["interp","jit"],      label: "7 · JIT Tier 1–4",           detail: "≥1 000 calls → C1 compile (fast, profiled). ≥10 000 calls → C2 full optimize: method inlining, loop unrolling, escape analysis, lock elision." },
        { path: ["jit","eden"],        label: "8 · Allocate in Eden (TLAB)", detail: "new Obj() bumps a thread-local pointer — no CAS, no lock. Each thread owns a Thread-Local Allocation Buffer (TLAB). Cost ≈5 ns." },
        { path: ["eden","survivor"],   label: "9 · Minor GC — copy live",   detail: "Eden full → safepoint → GC roots traced. Live objects copied to Survivor (S0↔S1 swap). Dead objects freed in bulk. Pause: 1–10 ms." },
        { path: ["survivor","old"],    label: "10 · Promote to Old Gen",    detail: "Objects surviving 15 minor GCs promoted to Old Gen. Large (humongous) objects skip Young Gen and land directly in Old Gen regions." },
        { path: ["old","gc"],          label: "11 · Major / Mixed GC",      detail: "G1: concurrent mark → mixed collection of highest-garbage Old regions. ZGC: fully concurrent, pause < 1 ms even at 16 TB heap using colored pointers + load barriers." },
        { path: ["gc","eden"],         label: "12 · Heap reclaimed — cycle", detail: "Freed Eden ready for new allocations. Metaspace only collected when ClassLoaders are unloaded. Cycle repeats continuously for JVM lifetime." }
      ]
    },
    uml: {
      title: "Object Lifecycle — Thread to GC",
      scenario: "Creating, aging, and garbage-collecting a single object",
      actors: [
        { id: "thread",  label: "App Thread" },
        { id: "jit",     label: "JIT / Escape" },
        { id: "eden",    label: "Eden (TLAB)" },
        { id: "minor",   label: "Minor GC" },
        { id: "old",     label: "Old Gen" },
        { id: "major",   label: "Major GC (G1/ZGC)" }
      ],
      messages: [
        { from:"thread", to:"jit",   label:"new Obj() — escape analysis",    detail:"JIT checks if Obj escapes the current method. If not, stack-allocate: zero GC pressure. Escape analysis fires at C2 tier.", type:"sync" },
        { from:"jit",    to:"eden",  label:"Obj escapes → allocate in TLAB", detail:"TLAB bump-pointer: ptr += objSize. No CAS, no lock. Object header = mark word (hash/lock/age) + klass pointer. Cost ≈5 ns.", type:"sync" },
        { from:"eden",   to:"thread",label:"Reference returned",             detail:"Caller receives reference to heap object. Object is reachable via stack frame GC root.", type:"sync" },
        { from:"thread", to:"eden",  label:"Eden fills (many allocations)",  detail:"TLAB refills until Eden exhausted. JVM requests a safepoint — all threads stop at next safe point.", type:"async" },
        { from:"eden",   to:"minor", label:"Safepoint → Minor GC triggered", detail:"GC roots traced: stack frames, static refs, JNI handles. Reachable objects found via breadth-first mark.", type:"sync" },
        { from:"minor",  to:"eden",  label:"Dead objects reclaimed",         detail:"Unreachable objects simply abandoned. Eden reset in bulk — no per-object free(). Pause typically 1–5 ms.", type:"sync" },
        { from:"minor",  to:"old",   label:"Promote: age ≥ 15 (or oversized)",detail:"Surviving object copied to Old Gen region. Card table updated; Remembered Set tracks cross-generational references.", type:"sync" },
        { from:"old",    to:"major", label:"Old occupancy > IHOP threshold", detail:"G1 starts concurrent marking when Old Gen > 45% full (InitiatingHeapOccupancyPercent). ZGC marks continuously in background.", type:"async" },
        { from:"major",  to:"old",   label:"Concurrent mark + compact",      detail:"G1: identify garbage-heavy regions → mixed collection. ZGC: relocate objects concurrently using load barriers to remap stale pointers.", type:"sync" },
        { from:"major",  to:"thread",label:"GC complete — threads resume",   detail:"Safepoint released. Heap utilization drops. Metaspace freed only on ClassLoader unload. Application continues.", type:"sync" }
      ]
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
