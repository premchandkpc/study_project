# Angular Topics

**Topic file location:** `src/modules/topics/angular/`
**Topic array:** `window.ANGULAR_TOPICS`
**Area string:** `"angular"`

---

## Topics Built

| File | Title | Tag | Visual Status |
|------|-------|-----|---------------|
| `ng-di-services.js` | Angular DI & Services | Core | Placeholder |
| `ng-change-detection.js` | Angular Change Detection | Performance | Placeholder |
| `ng-directives.js` | Angular Directives | Core | Placeholder |
| `ng-components-templates.js` | Angular Components & Templates | Core | Placeholder |
| `ng-http-interceptors.js` | Angular HTTP & Interceptors | HTTP | Placeholder |
| `ng-pipes.js` | Angular Pipes | Data Transform | Placeholder |
| `ng-reactive-forms.js` | Angular Reactive Forms | Forms | Placeholder |
| `ng-ngrx.js` | NgRx State Management | State | Placeholder |
| `ng-testing.js` | Angular Testing | Testing | Placeholder |
| `ng-routing-guards.js` | Angular Routing & Guards | Navigation | Placeholder |
| `ng-signals.js` | Angular Signals | Reactivity | Placeholder |

> All 11 topics have stub placeholder visuals (`mount.innerHTML = '...coming soon'`). All need real animations built.

---

## Visual Style References (inputs/)

| Image | What it shows | Apply to Angular topics |
|---|---|---|
| `inputs/image copy 7.png` | System Design Blueprint — colored section boxes, bullet lists per service, numbered callouts | Angular DI injector tree: colored band per injector scope (Root/Platform/Module/Component), bubble-up lookup animation |
| `inputs/image copy 10.png` | Microservice domain boxes — grouped services inside colored borders, side panels | Angular module grouping: CoreModule/SharedModule/FeatureModules as colored domain boxes, imports/exports as connectors |
| `inputs/image copy 11.png` | Kafka swimlane — horizontal colored rows per use case, animated dots | Angular CD modes: 2 rows (Default CD vs OnPush CD), animated check-cycle dots sweeping through component tree |
| `inputs/image copy 3.png` | Architecture Styles Wheel — center hub + radial branches | Angular lifecycle hub: center = "Component", branches = ngOnInit/ngOnChanges/ngDoCheck/ngOnDestroy/CD/DI |

## Animation Implementation Priority

All 11 topics currently placeholder. Build in this order:

### PRIORITY 1 — Build These First (highest interview value)

| Topic | Visual Type | Style Reference | Key Animation |
|---|---|---|---|
| `ng-change-detection.js` | Swimlane (always-visible) | image copy 11 — 2 rows: Default vs OnPush | Animated dots sweep all nodes (Default) vs only marked nodes (OnPush) |
| `ng-di-services.js` | Vertical FlowDiagram | image copy 7 — colored section per injector level | Token lookup bubbles UP the chain: Component→Module→Root→Not Found |
| `ng-ngrx.js` | Circular FlowDiagram | image copy 9 — numbered circular flow | Action①→Reducer②→Store③→Selector④→Component⑤→Action① loop |
| `ng-signals.js` | FlowDiagram | image copy 12 — radial branches | signal()→computed()→effect() dependency graph, set() triggers glow propagation |
| `ng-routing-guards.js` | Vertical FlowDiagram | image copy 7 — pipeline stages | URL→CanActivate→CanActivateChild→Resolve→CanDeactivate, each guard = colored band |

### PRIORITY 2 — Build Next

| Topic | Visual Type | Key Animation |
|---|---|---|
| `ng-reactive-forms.js` | FlowDiagram | FormControl→FormGroup→Validator→status stream |
| `ng-http-interceptors.js` | Swimlane | Request interceptors (outbound) vs Response interceptors (inbound) as 2 rows |
| `ng-components-templates.js` | ComponentTree | Input binding→template render→Output emit cycle |

### PRIORITY 3 — Build Last

| Topic | Visual Type | Key Animation |
|---|---|---|
| `ng-directives.js` | FlowDiagram | Structural (@if/@for) vs Attribute directive lifecycle |
| `ng-pipes.js` | FlowDiagram | Pure pipe cache → Impure pipe every CD cycle |
| `ng-testing.js` | FlowDiagram | TestBed → component instantiate → fixture → detect changes → assert |

## Angular Topics Still to Add

| Topic | Priority | Suggested Animation |
|-------|----------|-------------------|
| Zone.js deep dive | HIGH | FlowDiagram: macro/microtask → zone patch → CD trigger |
| Standalone components | HIGH | ComponentTree: module-less import graph |
| Angular animations (@angular/animations) | MEDIUM | FlowDiagram: trigger → state → transition |
| Defer blocks | HIGH | FlowDiagram: @defer → idle/viewport/interaction triggers |
| Server-Side Rendering (Angular Universal) | HIGH | FlowDiagram: server render → hydration → client takeover |
| Signal-based components (Angular 18+) | HIGH | ComponentTree: signal inputs, outputs, model() |
| Control Flow (@if/@for/@switch) | MEDIUM | ComponentTree: template rendering flow |
| Inject function vs constructor DI | MEDIUM | FlowDiagram: injection context graph |
| Angular CDK | LOW | ComponentTree: overlay/portal/virtual scroll |

---

## Animation Plan for Existing Topics

### ng-di-services — Suggested: FlowDiagram
```
Injector tree: Root → Platform → Module → Component
Nodes: AppModule injector → FeatureModule injector → ComponentInjector
Edges: token lookup chain (bubble up on miss)
Steps: token provide → request → lookup chain → instantiate → singleton reuse
```

### ng-change-detection — Suggested: ComponentTree
```
Default CD: all components checked on every event
OnPush CD: only dirty-marked components checked
tree: { name: 'AppComponent', children: [
  { name: 'UserList', type: 'component', rerender: true },     // always re-renders in Default
  { name: 'UserList', type: 'memo', skipped: true },            // skipped in OnPush
] }
Steps: event → CD cycle → Default (all green) → OnPush (only changed)
```

### ng-reactive-forms — Suggested: FlowDiagram
```
FormControl → FormGroup → FormArray → Validators → valueChanges Observable
Show: user types → control value update → group value update → validation → status
```

### ng-ngrx — Suggested: FlowDiagram
```
Action dispatched → Reducer → Store state update → Selector → Component
+ Effects: Action → Effect → API call → Success Action → Reducer
Node types: action(green), reducer(red), store(orange), selector(purple), component(blue)
```

### ng-routing-guards — Suggested: FlowDiagram
```
URL change → Router → CanActivate → CanActivateChild → CanDeactivate → Route load
Step: guard returns true → proceed, false → redirect
```

### ng-signals — Suggested: ReactViz.ComponentTree
```
signal() create → effect() track → computed() derive → set() trigger → effect re-run
Show dependency graph between signals
```

---

## Angular Topic File Pattern

```js
(function () {
  'use strict';

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id:    'ng-<topic>',
    area:  'angular',
    title: '<Title>',
    tag:   '<Tag>',
    tags:  ['angular', '<keyword1>', '<keyword2>'],

    concept: `<explanation>`,
    why:     `<production relevance>`,

    example: {
      language: 'typescript',
      code: `// Angular code`,
    },

    interview: ['Question 1?', 'Question 2?'],
    tradeoffs: { pros: ['...'], cons: ['...'] },
    gotchas: ['Gotcha 1'],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — ...',
          // tree | nodes+edges | fiberTree
          code: '// code',
        },
      ];

      window.ReactViz.panel(mount, {
        title: '<title>',
        time:  'O(n)',
        space: 'O(1)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          if (step.tree) {
            window.ReactViz.ComponentTree.render(vizEl, step.tree);
          } else if (step.nodes) {
            window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          }
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'ts');
        },
      });
    },
  }]);
})();
```

---

## Gotchas When Adding Angular Topics

1. Use `window.ANGULAR_TOPICS` array (not `REACT_TOPICS` or `DSA_TOPICS`)
2. Area must be `"angular"` — used by sidebar filtering
3. `var` not `const/let` at IIFE level
4. Angular topics use `ReactViz.panel` (same engine as React topics) — not DSAViz tracer
5. `language: 'typescript'` in example block
