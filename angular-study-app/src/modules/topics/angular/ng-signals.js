(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-signals",
    area: "angular",
    title: "Angular Signals",
    tag: "Reactivity",
    tags: ["angular", "signals", "computed", "effect", "v17", "v18", "reactivity"],

    concept: `Angular **Signals** (Angular 16+) are a reactive primitive that eliminates Zone.js for change detection.

**Core APIs:**
- \`signal(initialValue)\` — writable reactive value. Read: \`count()\`, Write: \`count.set(5)\`, Update: \`count.update(v => v + 1)\`
- \`computed(() => expr)\` — derived value, re-evaluated lazily only when dependencies changed
- \`effect(() => { ... })\` — runs when any signal read inside changes. Auto-tracks dependencies.
- \`toSignal(observable$)\` — wraps RxJS Observable as a signal
- \`toObservable(signal)\` — converts signal back to Observable

**Angular 17+ Signal Inputs:**
\`@Input() name = input<string>()\` — signal-based input, reactive

**Angular 17+ model() — two-way binding:**
\`name = model('default')\` — writable signal input/output pair

**No Zone.js required:** signal changes trigger fine-grained DOM updates without CD cycle.`,

    why: "Signals replace Zone.js's coarse \"check everything on any event\" with precise \"update only what depends on this value.\" They compose naturally with RxJS via toSignal/toObservable. Angular 18+ fully supports zoneless applications with signals.",

    example: {
      language: "typescript",
      code: `import { signal, computed, effect, input, model } from '@angular/core';

@Component({
  template: \`
    <p>Count: {{ count() }}</p>
    <p>Double: {{ double() }}</p>
    <button (click)="increment()">+1</button>
  \`,
})
export class CounterComponent {
  count = signal(0);           // WritableSignal<number>
  double = computed(() => this.count() * 2);  // auto-tracks count

  logEffect = effect(() => {
    // runs whenever count() changes — auto-tracked
    console.log('count changed to', this.count());
  });

  increment() {
    this.count.update(v => v + 1);  // triggers computed + effect
  }
}

// Angular 17+ signal inputs
@Component({ ... })
export class UserCardComponent {
  name = input<string>();        // signal input (read-only)
  theme = input('dark');         // with default
  onNameChange = model<string>(); // model: two-way bindable signal
}

// Parent template:
// <app-user-card [(onNameChange)]="userName" [name]="fullName()" />`,
    },

    interview: [
      "What is the difference between signal, computed, and effect?",
      "How do signals replace Zone.js change detection?",
      "What is the difference between signal() and computed() writability?",
      "How does effect() track its dependencies?",
      "What is model() and how does it enable two-way binding?",
      "How do you interop signals with existing RxJS observables?",
    ],

    tradeoffs: {
      pros: [
        "Fine-grained reactivity — only dependent components/expressions re-evaluate",
        "No Zone.js needed — smaller bundle, predictable performance",
        "Lazy evaluation — computed only re-runs when dependencies changed AND value is read",
        "Cleaner interop with RxJS via toSignal/toObservable",
      ],
      cons: [
        "effect() must be called in injection context or passed injector",
        "Cannot use signals in constructor before injection context available",
        "Mixing signals + Zone.js (hybrid mode) adds mental overhead",
        "effect() creates subscriptions — must manage cleanup in long-lived services",
      ],
    },

    gotchas: [
      "computed() is lazy — it only re-computes when a consumer reads it after a dependency change",
      "effect() tracks ALL signals read during its execution — no explicit dependency list needed",
      "set() vs update(): set(5) overwrites; update(v => v+1) derives from current value",
      "Signal inputs (input()) are read-only — parent controls the value, component cannot set()",
      "model() creates a writable signal + output pair — use for two-way binding scenarios",
      "effect() in a service needs explicit injector or must be called in injection context",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — signal() creates a reactive value. Read with signal(), write with set()/update().",
          nodes: [
            { id: "sig", label: "signal(0)", sublabel: "WritableSignal<number>", type: "store", active: true },
            { id: "read", label: "count()", sublabel: "current value: 0", type: "selector", active: true },
            { id: "set", label: "count.set(5)", sublabel: "overwrite", type: "action", active: false },
            { id: "update", label: "count.update\n(v => v+1)", sublabel: "derive from current", type: "action", active: false },
          ],
          edges: [
            { from: "sig", to: "read", label: "read", color: "#58a6ff", active: true },
            { from: "set", to: "sig", label: "overwrites", color: "#ffa657" },
            { from: "update", to: "sig", label: "updates", color: "#3fb950" },
          ],
          code: `count = signal(0);         // creates reactive value

// READ — call as function
console.log(count());    // 0

// WRITE
count.set(5);            // overwrite
count.update(v => v+1);  // derive from current → 6`,
        },
        {
          phase: "commit",
          narration: "Step 2 — computed() derives from signals. Lazy: re-evaluates only when deps change AND value read.",
          nodes: [
            { id: "count", label: "signal(3)", sublabel: "count", type: "store", active: true },
            { id: "items", label: "signal([...])", sublabel: "items", type: "store", active: false },
            { id: "double", label: "computed\n(count*2)", sublabel: "→ 6", type: "selector", active: true },
            { id: "total", label: "computed\n(items.length)", sublabel: "→ 4", type: "selector", active: false },
            { id: "template", label: "Template\n{{ double() }}", type: "component", active: true },
          ],
          edges: [
            { from: "count", to: "double", label: "dep tracked", active: true, color: "#58a6ff" },
            { from: "items", to: "total", label: "dep tracked", color: "#8b949e" },
            { from: "double", to: "template", label: "read", active: true, color: "#3fb950" },
          ],
          code: `count = signal(3);
double = computed(() => count() * 2);  // tracks count

// computed is LAZY — only recalculates when:
// 1. count() changed since last read
// 2. AND double() is read by a consumer
count.set(5);
// double is now "dirty" but not yet re-evaluated
console.log(double()); // evaluates now → 10`,
        },
        {
          phase: "effect",
          narration: "Step 3 — effect() auto-tracks all signals read inside it. Runs when any dep changes.",
          nodes: [
            { id: "sig1", label: "count signal", sublabel: "value: 5", type: "store", active: true },
            { id: "sig2", label: "theme signal", sublabel: "value: 'dark'", type: "store", active: false },
            { id: "eff", label: "effect()", sublabel: "auto-tracks deps", type: "action", active: true },
            { id: "side", label: "Side Effect\n(console/DOM)", type: "network", active: true },
          ],
          edges: [
            { from: "sig1", to: "eff", label: "read → tracked", active: true, color: "#58a6ff" },
            { from: "sig2", to: "eff", label: "read → tracked", color: "#8b949e" },
            { from: "eff", to: "side", label: "runs on change", active: true, color: "#3fb950" },
          ],
          code: `logEffect = effect(() => {
  // Auto-tracks any signals read here
  const c = count();     // tracked ← count changes → re-run
  const t = theme();     // tracked ← theme changes → re-run
  console.log(\`count=\${c}, theme=\${t}\`);
});
// No explicit dependency list — unlike useEffect deps array
// Runs immediately on creation, then on any tracked signal change`,
        },
        {
          phase: "update",
          narration: "Step 4 — count.update() → computed re-evaluates → effect re-runs → template updates.",
          nodes: [
            { id: "btn", label: "Button Click\nincrement()", type: "component", active: true },
            { id: "sig", label: "count signal\n0 → 1", type: "store", active: true },
            { id: "comp", label: "computed\ndouble: 0 → 2", type: "selector", active: true },
            { id: "eff", label: "effect()\nruns again", type: "action", active: true },
            { id: "dom", label: "DOM\nupdated", type: "network", active: true },
          ],
          edges: [
            { from: "btn", to: "sig", label: "count.update(v=>v+1)", active: true, color: "#ffa657" },
            { from: "sig", to: "comp", label: "dirty → re-eval", active: true, color: "#58a6ff" },
            { from: "sig", to: "eff", label: "dep changed", active: true, color: "#d2a8ff" },
            { from: "comp", to: "dom", label: "fine-grained update", active: true, color: "#3fb950" },
          ],
          code: `increment() {
  this.count.update(v => v + 1);
}
// Propagation chain:
// count(0→1) → double dirty → double re-evals to 2
//            → effect re-runs → console.log
//            → template bindings {{ count() }}, {{ double() }}
//               re-evaluate (no full CD cycle!)`,
        },
        {
          phase: "cleanup",
          narration: "Step 5 — Signal inputs (input()) and model() for two-way binding in Angular 17+.",
          nodes: [
            { id: "parent", label: "Parent\nComponent", sublabel: "owns userName", type: "component", active: true },
            { id: "input", label: "input<string>()\n(read-only signal)", type: "store", active: true },
            { id: "model", label: "model<string>()\n(writable + output)", type: "action", active: true },
            { id: "child", label: "Child\nComponent", sublabel: "reads + writes", type: "component", active: true },
          ],
          edges: [
            { from: "parent", to: "input", label: "[name]=\"sig()\"", active: true, color: "#58a6ff" },
            { from: "parent", to: "model", label: "[(name)]=\"sig\"", active: true, color: "#3fb950" },
            { from: "input", to: "child", label: "read-only", color: "#8b949e" },
            { from: "model", to: "child", label: "read+write", active: true, color: "#d2a8ff" },
            { from: "child", to: "parent", label: "model.set() → parent updates", active: true, color: "#ffa657" },
          ],
          code: `// Child component (Angular 17+)
export class UserCardComponent {
  name = input<string>();         // signal input — parent controls
  editable = model<boolean>(false); // two-way — child can set()
}

// Parent template
// <app-user-card [name]="fullName()" [(editable)]="isEditing" />
// When child calls editable.set(true) → parent isEditing updates`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Angular Signals: Reactive Primitives",
        time: "O(1) set/get",
        space: "O(deps graph)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML = window.ReactViz.label("CODE") + window.ReactViz.codeBlock(step.code, "ts");
        },
      });
    },
  }]);
})();
