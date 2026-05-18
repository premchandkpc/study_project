(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-di-services",
    area: "angular",
    title: "Angular DI & Services",
    tag: "Core",
    tags: ["angular", "dependency-injection", "services", "providers", "injector"],

    concept: `Angular's **Dependency Injection (DI)** manages service instantiation through a hierarchical injector tree.

**Injector Hierarchy (top → bottom):**
1. **Platform Injector** — browser tab singleton
2. **Root Injector** — \`providedIn: 'root'\` — app-wide singleton, tree-shakeable
3. **Module Injector** — lazy-loaded feature modules get their own
4. **Component Injector** — \`providers:[]\` in @Component — new instance per component

**Token lookup:** Angular walks UP the injector tree. First match wins. Not found anywhere → NullInjectorError.

**Provider types:** \`useClass\` / \`useFactory\` / \`useValue\` / \`useExisting\`

**Angular 14+ inject() function** — DI outside constructor (guards, factories, interceptors).`,

    why: "DI controls service scopes: root singleton vs per-feature vs per-component. Critical for: avoiding shared state bugs, testability (inject mocks), memory management (component-scoped services destroyed with component), and multi-tenant isolation.",

    example: {
      language: "typescript",
      code: `// Root singleton — tree-shaken if unused
@Injectable({ providedIn: 'root' })
export class AuthService {
  private token$ = new BehaviorSubject<string | null>(null);
}

// Component-scoped: new instance per component
@Component({
  selector: 'app-cart',
  providers: [CartService],  // destroyed with component
})
export class CartComponent {
  constructor(private cart: CartService) {}
}

// InjectionToken for non-class values
const API_URL = new InjectionToken<string>('API_URL');
providers: [{ provide: API_URL, useValue: 'https://api.example.com' }]

// Angular 14+ inject() — no constructor needed
export const authGuard = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).navigate(['/login']);
};`,
    },

    interview: [
      "What is the Angular injector hierarchy?",
      "Difference between providedIn root vs component providers?",
      "How does Angular resolve a token not found in current injector?",
      "What is tree-shaking in Angular DI context?",
      "When use useFactory vs useClass?",
      "What is inject() function — when to use over constructor injection?",
    ],

    tradeoffs: {
      pros: [
        "Hierarchical scoping: singleton vs per-component instances",
        "providedIn root auto tree-shakes unused services from bundle",
        "Testable: inject mocks without changing production code",
        "inject() enables functional patterns (standalone guards, interceptors)",
      ],
      cons: [
        "Component-scoped providers create new instance — forgetting causes state duplication",
        "Services in @NgModule providers are NOT tree-shaken — prefer providedIn root",
        "NullInjectorError debugging is non-obvious without Angular DevTools",
        "Circular dependency errors hard to trace in large apps",
      ],
    },

    gotchas: [
      "providedIn root = one instance app-wide; component providers = one per component instance",
      "Services in @NgModule providers NOT tree-shaken — prefer providedIn root for leaf services",
      "Injecting in component-level provider creates NEW instance — siblings do NOT share it",
      "NullInjectorError = token not registered at any injector level above requester",
      "inject() only works inside injection context (constructor, factory, guard, interceptor)",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — Injector hierarchy: Platform → Root → Module → Component. Token lookup bubbles UP.",
          nodes: [
            { id: "platform", label: "Platform Injector", sublabel: "Browser tab scope", type: "server", active: false },
            { id: "root", label: "Root Injector", sublabel: "providedIn:'root'", type: "store", active: true },
            { id: "module", label: "Feature Module", sublabel: "Lazy-loaded module", type: "cache", active: false },
            { id: "component", label: "Component Injector", sublabel: "providers:[]", type: "component", active: false },
          ],
          edges: [
            { from: "platform", to: "root", label: "child" },
            { from: "root", to: "module", label: "child" },
            { from: "module", to: "component", label: "child" },
          ],
          code: `// Each injector is a child of the one above
// Root → Module → Component
@Injectable({ providedIn: 'root' })  // Root injector
export class AuthService {}`,
        },
        {
          phase: "commit",
          narration: "Step 2 — Token lookup bubbles UP the tree. First match wins. Root has AuthService → return singleton.",
          nodes: [
            { id: "comp", label: "Component\nneeds AuthService", type: "component", active: true },
            { id: "cinj", label: "Component\nInjector", sublabel: "❌ not found", type: "cache", dim: true },
            { id: "minj", label: "Module\nInjector", sublabel: "❌ not found", type: "cache", dim: true },
            { id: "rinj", label: "Root Injector", sublabel: "✅ found! singleton", type: "store", active: true },
          ],
          edges: [
            { from: "comp", to: "cinj", label: "① lookup", color: "#ffa657" },
            { from: "cinj", to: "minj", label: "② bubble up", color: "#ffa657" },
            { from: "minj", to: "rinj", label: "③ bubble up", color: "#58a6ff", active: true },
          ],
          code: `constructor(private auth: AuthService) {}
// Angular: look in component injector → not found
//          look in module injector → not found
//          look in root injector → found! return singleton`,
        },
        {
          phase: "effect",
          narration: "Step 3 — Component-scoped service: new instance per component. Siblings do NOT share.",
          nodes: [
            { id: "c1", label: "CartComponent①", sublabel: "providers:[CartService]", type: "component", active: true },
            { id: "c2", label: "CartComponent②", sublabel: "providers:[CartService]", type: "component", active: true },
            { id: "s1", label: "CartService A", sublabel: "items: 2", type: "action", active: true },
            { id: "s2", label: "CartService B", sublabel: "items: 0", type: "reducer", active: true },
          ],
          edges: [
            { from: "c1", to: "s1", label: "owns (scope A)", color: "#3fb950", active: true },
            { from: "c2", to: "s2", label: "owns (scope B)", color: "#f85149", active: true },
          ],
          code: `@Component({
  providers: [CartService],  // ← scoped here
})
export class CartComponent { ... }
// cart1 CartService ≠ cart2 CartService
// Each destroyed when its component is destroyed`,
        },
        {
          phase: "update",
          narration: "Step 4 — Provider types: useClass, useFactory, useValue, useExisting.",
          nodes: [
            { id: "token", label: "InjectionToken\nor Class", type: "selector", active: true },
            { id: "uc", label: "useClass", sublabel: "instantiate class", type: "component" },
            { id: "uf", label: "useFactory", sublabel: "call fn + deps", type: "action" },
            { id: "uv", label: "useValue", sublabel: "literal value", type: "store" },
            { id: "ue", label: "useExisting", sublabel: "alias token", type: "cache" },
          ],
          edges: [
            { from: "token", to: "uc", label: "" },
            { from: "token", to: "uf", label: "" },
            { from: "token", to: "uv", label: "" },
            { from: "token", to: "ue", label: "" },
          ],
          code: `{ provide: Logger, useClass: ConsoleLogger }
{ provide: DB_URL, useValue: 'postgres://...' }
{ provide: Config, useFactory: configFn,
  deps: [ENV_TOKEN] }
{ provide: OldLogger, useExisting: NewLogger }
// Angular 14+: inject() outside constructor
const auth = inject(AuthService);`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: "Angular DI & Injector Hierarchy",
        time: "O(depth) lookup",
        space: "O(tokens)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML = window.ReactViz.label("CODE") + window.ReactViz.codeBlock(step.code, "ts");
        },
      });
    },
  }]);
})();
