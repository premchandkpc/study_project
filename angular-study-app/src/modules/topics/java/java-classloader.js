(function () {
  "use strict";

  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([
    {
      id: "java-classloader",
      area: "java",
      title: "ClassLoader Chain & Delegation Model",
      tag: "JVM",
      tags: ["classloader", "bootstrap", "delegation", "class-loading", "hot-reload", "isolation", "osgi", "tccl"],

      concept:
`**L1 (30s ELI5):** Imagine 3 librarians. You ask the junior one for a book. Junior asks the manager, who asks the chief. If the chief has it, chief hands it down. Nobody duplicates a book the chief already has.

**L2 (2min core):** ClassLoader (CL) loads .class files and turns them into Class objects. Delegation model: child CL always asks parent FIRST. Bootstrap CL (root, native C++) loads JDK core (java.lang.*). Platform CL (Java 9+ replaces Extension) loads platform modules. Application CL loads your classpath. This prevents user code from shadowing java.lang.String.

**L3 (10min edge):** Custom ClassLoaders enable hot-reload (Tomcat WAR isolation), plugin systems (OSGi), and test isolation. Thread Context ClassLoader (TCCL): Spring and JNDI use it to load plugins in multi-classloader environments. ClassCastException when two CLs load the same class — they produce different Class objects even for the same bytecode.

**L4 (deep):** Phases of class loading: (1) Loading — read .class bytes. (2) Verification — bytecode safety check (type safety, branch targets). (3) Preparation — static field memory allocation, zero-init. (4) Resolution — symbolic refs → direct method table pointers. (5) Initialization — run static initializer blocks and set static fields. Initialization is lazy (first active use) and thread-safe (happens once, JVM-synchronized).`,

      why:
"ClassLoader understanding is essential for diagnosing ClassNotFoundException, NoClassDefFoundError, and ClassCastException in frameworks like Spring, Tomcat, and OSGi. Hot-reload and plugin isolation architectures are built on custom class loaders.",

      example: {
        language: "java",
        code:
`// ─── Delegation chain illustration ──────────────────────────────────────────
ClassLoader cl = Thread.currentThread().getContextClassLoader();
System.out.println(cl);                              // sun.misc.Launcher$AppClassLoader
System.out.println(cl.getParent());                  // sun.misc.Launcher$ExtClassLoader
System.out.println(cl.getParent().getParent());      // null (Bootstrap — native C++)

// ─── Custom ClassLoader — load from network/DB ───────────────────────────────
public class NetworkClassLoader extends ClassLoader {
    private final String url;

    public NetworkClassLoader(String url) {
        super(ClassLoader.getSystemClassLoader());   // parent = App CL
        this.url = url;
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] bytes = downloadClass(url, name);      // read from network
        return defineClass(name, bytes, 0, bytes.length);
    }
}

// ─── Thread Context ClassLoader — used by Spring, JDBC ───────────────────────
Thread t = new Thread(() -> {
    ClassLoader original = Thread.currentThread().getContextClassLoader();
    try {
        Thread.currentThread().setContextClassLoader(pluginClassLoader);
        // JDBC DriverManager.getConnection uses TCCL to find driver class
        // Spring's ClassPathXmlApplicationContext uses TCCL
        loadPluginResources();
    } finally {
        Thread.currentThread().setContextClassLoader(original);  // ALWAYS restore
    }
});

// ─── ClassCastException across ClassLoaders ──────────────────────────────────
ClassLoader cl1 = new URLClassLoader(urls);
ClassLoader cl2 = new URLClassLoader(urls);  // same URLs, different instance!
Class<?> c1 = cl1.loadClass("com.example.Foo");
Class<?> c2 = cl2.loadClass("com.example.Foo");
Object o1 = c1.newInstance();
c2.cast(o1);   // ❌ ClassCastException! c1 != c2 even though same bytecode`,
        notes: "Memory leak: Class → ClassLoader → all classes loaded by that CL. If AppServer creates new CL per deployment and old CL reference is held by a static field, Metaspace grows unboundedly."
      },

      interview: [
        {
          question: "Why does the delegation model point to parent first?",
          answer:
"**Security and consistency.** Bootstrap CL loads java.lang.Object, java.lang.String, etc. If your app CL loaded first, malicious or buggy code could substitute its own String class. By delegating up, Bootstrap's trusted copy always wins. This also means java.lang.String from your code and from the JDK are the SAME class — no ClassCastException.",
          followUps: ["Can you break the delegation model?", "When would you break it intentionally?"]
        },
        {
          question: "How does Tomcat isolate deployed WARs?",
          answer:
"Tomcat gives each WAR its own WebAppClassLoader that INVERTS the delegation model: it loads classes from WEB-INF/classes and WEB-INF/lib FIRST before asking parent. This allows two WARs to use different versions of the same library. The shared catalina classloader loads Tomcat internals — never delegated down to WARs.",
          followUps: ["What is a ClassCastException between WARs?", "Why does Tomcat cause Metaspace leaks?"]
        },
        {
          question: "Explain the ClassLoader memory leak in application servers.",
          answer:
"Each redeployment creates a new WebAppClassLoader. The old CL should be GC'd, but if ANY live object holds a reference to a class loaded by the old CL — that reference keeps the entire old CL and all its classes in Metaspace. Common culprits: static fields in framework classes, ThreadLocals in pooled threads, JDBC driver registration, logging MDC, Timer threads. Fix: explicitly clear static fields and deregister drivers on undeploy.",
          followUps: ["How to detect CL leaks?", "What is -XX:MaxMetaspaceSize?"]
        }
      ],

      gotchas: [
        "ClassCastException from loading same class with two different ClassLoaders — Class identity = (name, ClassLoader). Two different CLs loading Foo.class produce two incompatible Class objects.",
        "NoClassDefFoundError (not ClassNotFoundException): class was found during compilation but not at runtime — different classpath, failed static initializer, or class loaded by wrong CL.",
        "Static initializers run once per ClassLoader, not per JVM. New ClassLoader → re-run static initializers. Side effects in static initializers (opening files, starting threads) repeat on each reload.",
        "ThreadLocal leak in pooled threads: Tomcat thread pool reuses threads. ThreadLocal set by WAR A's CL is still present when WAR A reloads — old CL references kept alive.",
        "Thread Context ClassLoader (TCCL) should always be restored in a finally block — framework code may permanently change it.",
        "Parallel class loading: Java 7+ supports parallel-capable loaders. Old synchronized loadClass() can deadlock with circular class loading dependencies."
      ],

      tradeoffs: {
        pros: [
          "Security: parent-first prevents shadowing of JDK classes.",
          "Isolation: custom CLs enable WAR isolation, plugin sandboxing, hot-reload.",
          "Namespace separation: same class name in two CLs = two completely independent classes."
        ],
        cons: [
          "Complexity: multi-CL environments cause subtle ClassCastExceptions and resource visibility issues.",
          "Memory: each CL namespace holds its own class metadata in Metaspace — leaks if old CLs survive.",
          "TCCL: implicit thread state — hard to track, easy to forget to restore."
        ],
        when: "Custom CL for: hot-reload (override findClass), plugin isolation (inverted delegation), multi-version libraries (each plugin gets own CL namespace)."
      },

      visual: function (mount) {
        var CVU = window.CVU;
        if (!CVU) { mount.textContent = "CVU not loaded"; return; }
        var C = CVU.C;

        var ctrl = CVU.makeCtrlRow(mount);
        var btnPlay  = CVU.makeBtn("▶ Play",  C.green);
        var btnStep  = CVU.makeBtn("⏭ Step",  C.blue);
        var btnReset = CVU.makeBtn("↺ Reset", C.gray);
        ctrl.appendChild(btnPlay);
        ctrl.appendChild(btnStep);
        ctrl.appendChild(btnReset);

        var W = 680, H = 470;
        var canvas = CVU.makeCanvas(mount, W, H);
        var ctx = canvas.getContext("2d");
        var LW = canvas._logicalWidth;
        var LH = canvas._logicalHeight;
        var status = CVU.makeStatus(mount);

        var NODES = [
          { id:"request",   label:"Your Code",                badge:"loadClass(\"com.Foo\")",   color:C.blue,      hint:"Application code calls Class.forName() or references a class. JVM triggers ClassLoader.loadClass()." },
          { id:"app",       label:"Application ClassLoader",  badge:"classpath / -cp JARs",     color:C.orange,    hint:"Default CL for your JARs. Delegates to Platform CL first. If parent can't load, calls this.findClass()." },
          { id:"platform",  label:"Platform ClassLoader",     badge:"java.se module path",      color:C.purple,    hint:"Java 9+: replaces Extension ClassLoader. Loads javax.*, jdk.*, sun.* platform modules. Delegates to Bootstrap." },
          { id:"bootstrap", label:"Bootstrap ClassLoader",    badge:"java.base (C++, no parent)",color:C.green,   hint:"Root of the chain. Written in native C++. Loads java.lang.*, java.util.*, etc. Returns null from getParent()." },
          { id:"found",     label:"Class Found / Returned",   badge:"Class<T> returned",        color:C.yellow,   hint:"Whichever CL found the class returns the Class object. Result cached in that CL's class cache." },
          { id:"notfound",  label:"ClassNotFoundException",   badge:"no CL could find it",      color:C.red,      hint:"If all CLs in the chain call findClass() and none find the bytes: ClassNotFoundException thrown." },
        ];

        var STEPS_DEF = [
          { active:"request", arrow:null, msg:"Your code (or reflection) needs class 'com.example.Foo'. JVM calls AppClassLoader.loadClass()." },
          { active:"app",     arrow:{ from:"request", to:"app" }, msg:"AppClassLoader receives request. Delegation rule: ask parent first BEFORE checking own classpath." },
          { active:"platform", arrow:{ from:"app", to:"platform" }, msg:"AppCL delegates up to PlatformCL. PlatformCL checks platform modules (java.se). Not found there." },
          { active:"bootstrap", arrow:{ from:"platform", to:"bootstrap" }, msg:"PlatformCL delegates to Bootstrap. Bootstrap checks java.base module. 'com.example.Foo' is user code — not there." },
          { active:"platform", arrow:{ from:"bootstrap", to:"platform", back:true }, msg:"Bootstrap can't find it → returns null. PlatformCL tries findClass() on platform modules — also not found." },
          { active:"app",     arrow:{ from:"platform", to:"app", back:true }, msg:"PlatformCL not found → back to AppCL. AppCL calls its own findClass() — searches classpath JARs." },
          { active:"found",   arrow:{ from:"app", to:"found" }, msg:"Found in app JAR! AppCL calls defineClass() → Class object created, cached. Returned up the chain." },
        ];

        var step = 0;
        var activeDot = null;

        /* ── layout: vertical chain ──────────────────────────────── */
        var BW = 220, BH = 52;
        var cx = LW / 2;
        var startY = 30;
        var gap = 66;

        var nodePos = {};
        NODES.forEach(function (n, i) {
          if (i < 4) {
            nodePos[n.id] = { x: cx - BW / 2, y: startY + i * gap };
          } else if (n.id === "found") {
            nodePos[n.id] = { x: cx + BW / 2 + 20, y: startY + 2 * gap + BH / 2 - BH / 2 };
          } else {
            nodePos[n.id] = { x: cx - BW / 2 - BW - 24, y: startY + 2 * gap };
          }
        });

        /* found / notfound positioned next to bootstrap */
        nodePos["found"]    = { x: cx + BW / 2 + 30, y: startY + 0 * gap };
        nodePos["notfound"] = { x: cx - BW / 2 - BW - 24, y: startY + 0 * gap };

        function draw() {
          CVU.clearBg(ctx, LW, LH);

          /* header */
          CVU.roundRect(ctx, 12, 0, LW - 24, 30, 6, C.card, C.border, 1);
          CVU.text(ctx, "ClassLoader Delegation Model — Parent-First Loading Chain", LW / 2, 19, C.text, 11, "center", "600");

          /* chain arrows (always visible) */
          for (var i = 0; i < 3; i++) {
            var n0 = NODES[i], n1 = NODES[i + 1];
            var p0 = nodePos[n0.id], p1 = nodePos[n1.id];
            var x0 = p0.x + BW / 2, y0 = p0.y + BH;
            var x1 = p1.x + BW / 2, y1 = p1.y;
            ctx.strokeStyle = C.border;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
            ctx.setLineDash([]);
            CVU.text(ctx, "delegate up →", x0 + 18, (y0 + y1) / 2 + 4, C.gray, 8, "left");
          }

          /* delegation label */
          CVU.text(ctx, "DELEGATION (parent-first)", cx + BW / 2 + 8, startY + 3 * gap / 2, C.gray, 8.5, "left");
          CVU.text(ctx, "↓", cx + BW / 2 + 16, startY + 3 * gap / 2 + 12, C.gray, 9, "left");

          /* draw nodes */
          var cur = step < STEPS_DEF.length ? STEPS_DEF[step].active : "";
          NODES.slice(0, 4).forEach(function (n) {
            var p = nodePos[n.id];
            var active = n.id === cur;
            var bg = active ? n.color + "33" : C.card;
            var border = active ? n.color : C.border;
            CVU.roundRect(ctx, p.x, p.y, BW, BH, 6, bg, border, active ? 2.5 : 1.2);
            CVU.text(ctx, n.label, p.x + BW / 2, p.y + 17, active ? n.color : C.text, 11, "center", "700");
            CVU.roundRect(ctx, p.x + BW / 2 - 70, p.y + 28, 140, 16, 3, n.color + "22", n.color + "66", 1);
            CVU.text(ctx, n.badge, p.x + BW / 2, p.y + 39, n.color, 8.5, "center");
          });

          /* outcome boxes on right/left */
          var pF = nodePos["found"], pNF = nodePos["notfound"];
          var stepDef = STEPS_DEF[Math.min(step, STEPS_DEF.length - 1)];

          var showFound = step >= STEPS_DEF.length - 1;
          CVU.roundRect(ctx, pF.x, pF.y + 60, BW - 20, BH, 6, showFound ? C.green + "33" : C.card, showFound ? C.green : C.border, showFound ? 2 : 1);
          CVU.text(ctx, "Class Found ✅", pF.x + (BW - 20) / 2, pF.y + 79, showFound ? C.green : C.gray, 11, "center", "700");
          CVU.text(ctx, "defineClass() → cached", pF.x + (BW - 20) / 2, pF.y + 95, showFound ? C.green : C.gray, 9, "center");

          CVU.roundRect(ctx, LW - 12 - (BW - 20), pF.y + 60, BW - 20, BH, 6, C.card, C.red + "88", 1);
          CVU.text(ctx, "ClassNotFoundException ❌", LW - 12 - (BW - 20) + (BW - 20) / 2, pF.y + 79, C.red, 10, "center", "700");
          CVU.text(ctx, "if all CLs fail findClass()", LW - 12 - (BW - 20) + (BW - 20) / 2, pF.y + 95, C.red, 9, "center");

          /* animated delegate dot */
          if (stepDef && stepDef.arrow) {
            var a = stepDef.arrow;
            var src = nodePos[a.from], dst = nodePos[a.to];
            if (src && dst) {
              var sx = src.x + BW / 2, sy = src.y + (a.back ? 0 : BH);
              var dx = dst.x + BW / 2, dy = dst.y + (a.back ? BH : 0);
              CVU.arrow(ctx, sx, sy, dx, dy, a.back ? C.orange : C.blue, 2, false);
            }
          }

          /* step bar */
          var steps = STEPS_DEF.map(function (s, i) {
            return { label: s.active, i: i };
          });
          steps.forEach(function (s, i) {
            var px = 14 + i * ((LW - 28) / steps.length);
            var active = i === step;
            CVU.roundRect(ctx, px, LH - 24, (LW - 28) / steps.length - 3, 18, 3, active ? C.blue + "44" : C.card, active ? C.blue : C.border, 1);
            CVU.text(ctx, s.label.replace("ClassLoader", "CL"), px + ((LW - 28) / steps.length - 3) / 2, LH - 11, active ? C.text : C.gray, 7.5, "center");
          });
        }

        var raf = null;
        function tick() { draw(); raf = requestAnimationFrame(tick); }
        tick();

        status.textContent = STEPS_DEF[0].msg;

        var playing = false, playInterval = null;

        btnStep.addEventListener("click", function () {
          step = Math.min(step + 1, STEPS_DEF.length - 1);
          status.textContent = STEPS_DEF[step].msg;
        });

        btnPlay.addEventListener("click", function () {
          if (playing) {
            clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          } else {
            playing = true; btnPlay.textContent = "⏸ Pause";
            playInterval = setInterval(function () {
              step++;
              if (step >= STEPS_DEF.length) {
                step = STEPS_DEF.length - 1; clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play"; return;
              }
              status.textContent = STEPS_DEF[step].msg;
            }, 1700);
          }
        });

        btnReset.addEventListener("click", function () {
          clearInterval(playInterval); playing = false; btnPlay.textContent = "▶ Play";
          step = 0; status.textContent = STEPS_DEF[0].msg;
        });
      },

      flow: {
        title: "ClassLoader Delegation — loadClass() Algorithm",
        caption: "Parent-first: ask parent, fall back to findClass() only if parent can't load",
        nodes: [
          { id: "req",      label: "loadClass(name)",           hint: "Called by JVM or explicitly" },
          { id: "cache",    label: "findLoadedClass(name)?",    hint: "Check own class cache first" },
          { id: "parent",   label: "parent.loadClass(name)",    hint: "Delegate to parent ClassLoader" },
          { id: "find",     label: "findClass(name)",           hint: "Search own classpath / JAR" },
          { id: "define",   label: "defineClass(bytes)",        hint: "Parse .class → Class<T> object" },
          { id: "resolve",  label: "resolve if needed",         hint: "Resolve symbolic references" },
          { id: "return",   label: "return Class<T>",           hint: "Return to caller" },
        ],
        steps: [
          { path: ["req"],             label: "1 · loadClass() called",          detail: "JVM or code calls ClassLoader.loadClass(String name, boolean resolve)." },
          { path: ["req","cache"],     label: "2 · findLoadedClass() cache hit?", detail: "If class already loaded by this CL: return cached. Avoids re-loading. Class identity is (name + CL instance)." },
          { path: ["cache","parent"],  label: "3 · Delegate to parent",           detail: "Call parent.loadClass(name). Parent repeats same process recursively upward. Bootstrap returns null if not found." },
          { path: ["parent","find"],   label: "4 · Parent failed → findClass()",  detail: "Parent threw ClassNotFoundException. Fall back: current CL searches own classpath, JAR, URL, DB, etc." },
          { path: ["find","define"],   label: "5 · defineClass() — parse bytes",  detail: "Raw .class bytes → Class object. Verification: bytecode safety check. Preparation: static field allocation." },
          { path: ["define","resolve"],label: "6 · Resolve symbolic references",  detail: "Optional: replace symbolic method/field refs with direct pointers into class files of dependency classes." },
          { path: ["resolve","return"],label: "7 · Return Class<T>",              detail: "Fully loaded Class object returned. Initialization (static {} blocks) runs on first ACTIVE use, not here." },
        ]
      },

      architecture: {
        title: "ClassLoader Hierarchy & Isolation Patterns",
        caption: "How JVM, Tomcat, OSGi, and custom CLs structure their hierarchies",
        lanes: [
          {
            label: "Standard JVM (Java 9+)",
            hint: "Default three-layer hierarchy",
            nodes: [
              { id: "bs",   label: "Bootstrap CL (C++)",   badge: "java.base, null parent", hint: "Loads JDK core. No Java object — getParent() returns null. Cannot be replaced or subclassed." },
              { id: "pl",   label: "Platform CL",           badge: "java.se module path",    hint: "Java 9: loads javax.*, jdk.*, sun.* modules from module path. Parent=Bootstrap." },
              { id: "app",  label: "Application CL",        badge: "-cp / module path",      hint: "Loads your code. Parent=Platform. Can be customized with -Djava.system.class.loader." },
            ]
          },
          {
            label: "Tomcat WAR Isolation",
            hint: "Inverted delegation per WAR",
            nodes: [
              { id: "tc-common", label: "Catalina CL",          badge: "Tomcat internals",   hint: "Loads Tomcat classes. Shared across all WARs. Never delegated to by WebApp CL." },
              { id: "tc-shared", label: "Shared CL",            badge: "shared libs",        hint: "Loads JARs in $CATALINA_HOME/lib — shared across WARs. Parent=System." },
              { id: "tc-webapp", label: "WebApp CL (per WAR)",  badge: "WEB-INF/classes",   hint: "INVERTS delegation: loads WEB-INF/classes FIRST, then delegates up. Allows per-WAR library versions. Source of Metaspace leaks on undeploy." },
            ]
          },
          {
            label: "Plugin / Custom CL Patterns",
            hint: "Isolation and hot-reload",
            nodes: [
              { id: "url-cl",   label: "URLClassLoader",        badge: "URL[] at runtime",   hint: "Simplest custom CL. Pass URL[] of JARs. findClass() reads from those URLs. Used by Maven surefire, IDE plugins." },
              { id: "osgi",     label: "OSGi Bundle CL",        badge: "module isolation",   hint: "Each bundle gets own CL with explicit package imports/exports. Fine-grained dependency graph. Used in Eclipse plugins." },
              { id: "tccl",     label: "Thread Context CL",     badge: "Thread.setContextCL", hint: "Implicit CL passed via Thread. Spring, JNDI, JDBC DriverManager use TCCL to load driver/provider classes across CL boundaries." },
            ]
          }
        ],
        links: [
          { from: "bs",   to: "pl",       label: "delegates up",         type: "sync" },
          { from: "pl",   to: "app",      label: "delegates up",         type: "sync" },
          { from: "app",  to: "tc-shared",label: "Tomcat extends chain", type: "async" },
          { from: "tc-shared", to: "tc-webapp", label: "per-WAR child",  type: "sync" },
          { from: "app",  to: "url-cl",   label: "extends AppCL",        type: "async" },
          { from: "tccl", to: "tc-webapp",label: "Spring uses TCCL",     type: "async" },
        ]
      }
    }
  ]);
})();
