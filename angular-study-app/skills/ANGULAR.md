# Angular Topics

**Topic file location:** `src/modules/topics/angular/`
**Topic array:** `window.ANGULAR_TOPICS`
**Area string:** `"angular"`

---

## Topics Built

| File                         | Title                          | Tag            | Visual Status                                                                           |
| ---------------------------- | ------------------------------ | -------------- | --------------------------------------------------------------------------------------- |
| `ng-di-services.js`          | Angular DI & Services          | Core           | ✅ Built — 4-step FlowDiagram: injector tree + token lookup bubble-up                   |
| `ng-change-detection.js`     | Angular Change Detection       | Performance    | ✅ Built — always-visible 3-lane swimlane: Default CD / OnPush / CDRef API              |
| `ng-ngrx.js`                 | NgRx State Management          | State          | ✅ Built — 5-step FlowDiagram: Action→Reducer→Store→Selector→Component loop             |
| `ng-signals.js`              | Angular Signals                | Reactivity     | ✅ Built — 5-step FlowDiagram: signal/computed/effect/update/model                      |
| `ng-routing-guards.js`       | Angular Routing & Guards       | Navigation     | ✅ Built — 5-step FlowDiagram: lifecycle + canActivate + resolve + lazy + canDeactivate |
| `ng-directives.js`           | Angular Directives             | Core           | Placeholder — needs visual                                                              |
| `ng-components-templates.js` | Angular Components & Templates | Core           | Placeholder — needs visual                                                              |
| `ng-http-interceptors.js`    | Angular HTTP & Interceptors    | HTTP           | Placeholder — needs visual                                                              |
| `ng-pipes.js`                | Angular Pipes                  | Data Transform | Placeholder — needs visual                                                              |
| `ng-reactive-forms.js`       | Angular Reactive Forms         | Forms          | Placeholder — needs visual                                                              |
| `ng-testing.js`              | Angular Testing                | Testing        | Placeholder — needs visual                                                              |

> 5 of 11 topics have full visuals. 6 remaining need animations built (see Priority 2/3 below).

---

## Visual Style References (inputs/)

| Image                      | What it shows                                                                                | Apply to Angular topics                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `inputs/image copy 7.png`  | System Design Blueprint — colored section boxes, bullet lists per service, numbered callouts | Angular DI injector tree: colored band per injector scope (Root/Platform/Module/Component), bubble-up lookup animation |
| `inputs/image copy 10.png` | Microservice domain boxes — grouped services inside colored borders, side panels             | Angular module grouping: CoreModule/SharedModule/FeatureModules as colored domain boxes, imports/exports as connectors |
| `inputs/image copy 11.png` | Kafka swimlane — horizontal colored rows per use case, animated dots                         | Angular CD modes: 2 rows (Default CD vs OnPush CD), animated check-cycle dots sweeping through component tree          |
| `inputs/image copy 3.png`  | Architecture Styles Wheel — center hub + radial branches                                     | Angular lifecycle hub: center = "Component", branches = ngOnInit/ngOnChanges/ngDoCheck/ngOnDestroy/CD/DI               |

## Animation Implementation Priority

All 11 topics currently placeholder. Build in this order:

### PRIORITY 1 — Build These First (highest interview value)

| Topic                    | Visual Type               | Style Reference                                   | Key Animation                                                                     |
| ------------------------ | ------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| `ng-change-detection.js` | Swimlane (always-visible) | image copy 11 — 2 rows: Default vs OnPush         | Animated dots sweep all nodes (Default) vs only marked nodes (OnPush)             |
| `ng-di-services.js`      | Vertical FlowDiagram      | image copy 7 — colored section per injector level | Token lookup bubbles UP the chain: Component→Module→Root→Not Found                |
| `ng-ngrx.js`             | Circular FlowDiagram      | image copy 9 — numbered circular flow             | Action①→Reducer②→Store③→Selector④→Component⑤→Action① loop                         |
| `ng-signals.js`          | FlowDiagram               | image copy 12 — radial branches                   | signal()→computed()→effect() dependency graph, set() triggers glow propagation    |
| `ng-routing-guards.js`   | Vertical FlowDiagram      | image copy 7 — pipeline stages                    | URL→CanActivate→CanActivateChild→Resolve→CanDeactivate, each guard = colored band |

### PRIORITY 2 — Build Next

| Topic                        | Visual Type        | Key Animation                                    | Nodes/Steps                                                                                                                                                       |
| ---------------------------- | ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ng-reactive-forms.js`       | FlowDiagram        | FormControl→FormGroup→Validator→status stream    | FormControl(action)→FormGroup(store)→AbstractControl(cache)→validator fn→VALID/INVALID→valueChanges$                                                              |
| `ng-http-interceptors.js`    | Swimlane (2 rows)  | Outbound request chain vs inbound response chain | Row1 (blue outbound): Component→AuthInterceptor→LoggingInterceptor→HttpBackend. Row2 (green inbound): Response←ErrorInterceptor←CacheInterceptor←Component        |
| `ng-components-templates.js` | FlowDiagram 4-step | Input binding→template render→Output emit cycle  | Step1: parent→@Input()→child render. Step2: template expression eval→DOM. Step3: event→@Output()→EventEmitter→parent. Step4: ContentProjection (ng-content slots) |

#### ng-reactive-forms visual spec

```
Steps:
  1. FormControl created — signal: value/status/touched/dirty
  2. FormGroup wraps controls — aggregate validity
  3. Validators: sync (Validators.required) + async (checkUsername$)
  4. valueChanges$ observable — live debounced validation
  5. submit: form.getRawValue() → HTTP call
Nodes:
  FormControl (action), FormGroup (store), Validators (hook)
  status: VALID(green)/INVALID(red)/PENDING(yellow)
```

#### ng-http-interceptors visual spec

```
Swimlane layout (always-visible, 2 rows + 1 error row):
  Row 1 OUTBOUND (blue #58a6ff): Component → [AuthInterceptor adds JWT] → [LoggingInterceptor logs] → HttpBackend → Server
  Row 2 INBOUND  (green #3fb950): Server → [CacheInterceptor stores] → [ErrorInterceptor maps 401→logout] → Component
  Row 3 ERROR    (red #f85149):   Server 401 → ErrorInterceptor → router.navigate('/login')
Animated dots: request packet outbound blue, response packet green, error packet red
```

#### ng-components-templates visual spec

```
4-step FlowDiagram:
  Step 1 (render):  Parent template → [name]="value" → @Input() child.name — parent owns
  Step 2 (commit):  template expr {{ name }} → CD evaluates → DOM text node update
  Step 3 (effect):  user event in child → (clicked)="handler()" → @Output() EventEmitter → parent
  Step 4 (update):  ng-content — <ng-content select="[slot=header]"> → ContentChild query
```

### PRIORITY 3 — Build Last

| Topic              | Visual Type        | Key Animation                                | Key Concept                                                                                                                |
| ------------------ | ------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ng-directives.js` | FlowDiagram 2-step | Structural (@if/@for) vs Attribute lifecycle | @if: component create/destroy on condition. @for: \*ngFor trackBy key. Attribute: HostListener/HostBinding lifecycle hooks |
| `ng-pipes.js`      | Swimlane 2 rows    | Pure pipe cache vs Impure every CD cycle     | Row1 (green): Pure pipe — only recalculates when input reference changes. Row2 (orange): Impure — runs every CD cycle      |
| `ng-testing.js`    | FlowDiagram        | TestBed → fixture → act → assert             | TestBed.configureTestingModule → compileComponents → createComponent → fixture.detectChanges → expect                      |

#### ng-directives visual spec

```
Step 1 — Structural directives:
  Nodes: @if(false)→comment-anchor(DOM placeholder)→condition-true→component-create→rendered
         @for + trackBy: item-list→track by id→DOM diff only changed items
Step 2 — Attribute directives:
  Nodes: HostListener(click)→directive handler→HostBinding([class.active])→DOM class toggle
         Lifecycle: constructor→ngOnInit→ngOnChanges(input)→ngOnDestroy
```

#### ng-pipes visual spec

```
Swimlane (always-visible, 2 rows):
  Row 1 PURE (green #3fb950): input ref A → pipe runs → cached. input ref A again → SKIP (cache hit). input ref B → runs again
  Row 2 IMPURE (orange #ffa657): every CD cycle → pipe runs → no cache. Expensive if complex

Code: @Pipe({ name: 'currency', pure: true }) vs pure: false
Gotcha: async pipe is impure — marks component for check on emit
```

#### ng-testing visual spec

```
5-step FlowDiagram:
  Step 1: TestBed.configureTestingModule({ imports, providers, declarations })
  Step 2: fixture = TestBed.createComponent(MyComponent) — shallow mount
  Step 3: fixture.detectChanges() — runs ngOnInit, CD cycle
  Step 4: act — fixture.componentInstance.method() or userEvent.click(el)
  Step 5: expect(fixture.nativeElement.querySelector('.title').textContent).toBe('Hello')
Nodes: TestBed(store), fixture(component), nativeElement(network), expectation(action)
```

---

## Angular Topics Still to Add

### HIGH PRIORITY (interview-critical, no JS file yet)

| Topic                                   | Suggested File            | Visual Type   | Key Concepts                                                                                                                                      | Animation                                                                                                                                                                              |
| --------------------------------------- | ------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Standalone components                   | `ng-standalone.js`        | ComponentTree | No NgModule needed. `standalone: true`. `imports:[]` directly in @Component. bootstrapApplication(AppComponent)                                   | Component import graph: standalone comp imports HttpClientModule directly. No AppModule bridge                                                                                         |
| Defer blocks (@defer)                   | `ng-defer.js`             | FlowDiagram   | @defer(on viewport) / (on idle) / (on interaction) / (when condition). @placeholder / @loading / @error blocks                                    | Step1: render @placeholder. Step2: trigger fires. Step3: lazy chunk loads. Step4: @loading shows. Step5: content renders                                                               |
| Zone.js deep dive                       | `ng-zonejs.js`            | Swimlane      | Zone.js patches setTimeout/Promise/XHR/EventListeners. NgZone.run() forces CD. runOutsideAngular() skips CD. Zoneless Angular 18+                 | Row1 (patched): click→zone patch→NgZone notified→CD cycle. Row2 (outside): setInterval→runOutsideAngular→no CD (perf optimization)                                                     |
| Angular SSR / Hydration                 | `ng-ssr.js`               | FlowDiagram   | Server renders HTML → client receives → Angular hydrates (no full re-render). TransferState for API data. `provideClientHydration()`              | Step1: server express→renderApplication()→HTML string. Step2: client receives HTML (already visible). Step3: Angular bootstrap→hydrate→attach event listeners. Step4: navigation works |
| Signal-based components (v18+)          | `ng-signal-components.js` | FlowDiagram   | Zoneless + signal inputs/outputs. `input<string>()`, `output<void>()`, `model<T>()`. No Zone.js needed. `ChangeDetectionStrategy.OnPush` implicit | 3-node: parent signal→[name]="sig()"→child input() signal. Child model.set(x)→parent updates. No markForCheck needed                                                                   |
| Angular Control Flow (@if/@for/@switch) | `ng-control-flow.js`      | FlowDiagram   | New syntax Angular 17+: @if / @else. @for with track. @switch/@case/@default. Replaces *ngIf/*ngFor structural directives                         | Comparison: \*ngIf vs @if perf (no structural directive overhead). @for track expression = O(1) DOM diff key                                                                           |

### MEDIUM PRIORITY

| Topic                                    | Suggested File       | Visual Type   | Key Concepts                                                                                          |
| ---------------------------------------- | -------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| Angular animations (@angular/animations) | `ng-animations.js`   | FlowDiagram   | trigger() → state() → transition() → animate(). `:enter`/`:leave` aliases. void state. animateChild() |
| HTTP loading states (withLoading)        | `ng-http-loading.js` | FlowDiagram   | HttpClient + rxjs: switchMap → startWith(null) → loading state → data state → error state             |
| Inject function patterns                 | `ng-inject-fn.js`    | FlowDiagram   | inject() in constructor/factory/guard/interceptor. DestroyRef. inject context rules                   |
| Angular CDK                              | `ng-cdk.js`          | ComponentTree | Overlay, Portal, VirtualScroll, DragDrop, Accessibility (a11y), Bidirectionality                      |
| Angular DevTools                         | `ng-devtools.js`     | Swimlane      | Component tree profiler. CD cycle timing. Injector tree browser                                       |

### LOW PRIORITY (nice to have)

| Topic                             | Suggested File   | Key Concepts                                                             |
| --------------------------------- | ---------------- | ------------------------------------------------------------------------ |
| Angular Elements (Web Components) | `ng-elements.js` | createCustomElement() — export Angular component as native Web Component |
| i18n / Localization               | `ng-i18n.js`     | $localize, extracti18n, locale files, ICU expressions                    |
| Angular Material                  | `ng-material.js` | CDK foundation, theming tokens (M3), overlay strategy                    |

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
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([
    {
      id: "ng-<topic>",
      area: "angular",
      title: "<Title>",
      tag: "<Tag>",
      tags: ["angular", "<keyword1>", "<keyword2>"],

      concept: `<explanation>`,
      why: `<production relevance>`,

      example: {
        language: "typescript",
        code: `// Angular code`,
      },

      interview: ["Question 1?", "Question 2?"],
      tradeoffs: { pros: ["..."], cons: ["..."] },
      gotchas: ["Gotcha 1"],

      visual: function (mount) {
        var steps = [
          {
            phase: "render",
            narration: "Step 1 — ...",
            // tree | nodes+edges | fiberTree
            code: "// code",
          },
        ];

        window.ReactViz.panel(mount, {
          title: "<title>",
          time: "O(n)",
          space: "O(1)",
          steps: steps,
          renderStep: function (vizEl, codeEl, step) {
            if (step.tree) {
              window.ReactViz.ComponentTree.render(vizEl, step.tree);
            } else if (step.nodes) {
              window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, {
                layout: "vertical",
              });
            }
            codeEl.innerHTML =
              window.ReactViz.label("CODE") + window.ReactViz.codeBlock(step.code, "ts");
          },
        });
      },
    },
  ]);
})();
```

---

## Gotchas When Adding Angular Topics

1. Use `window.ANGULAR_TOPICS` array (not `REACT_TOPICS` or `DSA_TOPICS`)
2. Area must be `"angular"` — used by sidebar filtering
3. `var` not `const/let` at IIFE level
4. Angular topics use `ReactViz.panel` (same engine as React topics) — not DSAViz tracer
5. `language: 'typescript'` in example block
