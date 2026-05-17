(function () {
  'use strict';

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: 'ng-routing-guards',
    area: 'angular',
    title: 'Angular Routing & Guards',
    tag: 'Navigation',
    tags: ['angular', 'routing', 'guards', 'canactivate', 'resolver', 'lazy-loading', 'navigation'],

    concept: `Angular **Router** maps URL paths to components. **Guards** intercept navigation to control access.

**Guard types:**
- \`canActivate\` — can user enter this route?
- \`canActivateChild\` — can user enter child routes?
- \`canDeactivate\` — can user leave? (unsaved changes warning)
- \`canMatch\` — should this route even be matched? (Angular 14+)
- \`resolve\` — pre-fetch data before activating route

**Navigation lifecycle:**
\`URL change → Router matching → canMatch → canActivate → canActivateChild → resolve → component activate → canDeactivate (on leave)\`

**Lazy loading:** \`loadComponent\` / \`loadChildren\` — load feature module only when route activated. Reduces initial bundle.

**Angular 14+ functional guards:** plain functions with \`inject()\` — no class needed.

**Route data:** \`route.data\`, \`route.params\`, \`route.queryParams\`, \`route.snapshot\` vs \`paramMap\` observable.`,

    why: `Guards are the security layer of Angular SPA navigation. Without them, users can navigate to /admin by typing the URL. Resolvers prevent loading spinners by fetching data before the component renders. Lazy loading is critical for large apps — split bundle by feature route.`,

    example: {
      language: 'typescript',
      code: `// Angular 14+ functional guard (preferred)
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login']);
};

// Resolver — pre-fetch data
export const userResolver = (route: ActivatedRouteSnapshot) => {
  return inject(UserService).getUser(route.params['id']);
};

// Routes with guards + lazy loading
export const routes: Routes = [
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [roleGuard('ADMIN')],
    loadChildren: () => import('./admin/admin.routes'),
    // loadChildren = lazy-loads entire feature module
  },
  {
    path: 'user/:id',
    resolve: { user: userResolver },
    // component receives pre-fetched data via route.data['user']
    component: UserDetailComponent,
  },
  {
    path: 'editor',
    component: EditorComponent,
    canDeactivate: [(comp: EditorComponent) => comp.canLeave()],
  },
];

// In component: access resolved data
ngOnInit() {
  this.user = this.route.snapshot.data['user'];
  // or reactive:
  this.route.data.pipe(map(d => d['user'])).subscribe(...);
}`,
    },

    interview: [
      'What is the difference between canActivate and canActivateChild?',
      'How does canDeactivate work for unsaved-changes warning?',
      'What is the navigation lifecycle order in Angular?',
      'What is the difference between route.snapshot and route.paramMap observable?',
      'How does lazy loading reduce bundle size?',
      'When use resolve vs loading data inside ngOnInit?',
    ],

    tradeoffs: {
      pros: [
        'Guards prevent unauthorized access at the navigation layer',
        'Resolvers eliminate loading spinners — component mounts with data ready',
        'Lazy loading reduces initial bundle — features loaded on demand',
        'Functional guards (Angular 14+) are simpler — no class, no boilerplate',
      ],
      cons: [
        'Guards returning false with no redirect leaves user stuck — always redirect',
        'Resolvers block navigation until data loads — use skeleton screens for slow APIs',
        'canDeactivate is client-side only — refreshing browser bypasses it',
        'Deep route nesting can make guard debugging complex',
      ],
    },

    gotchas: [
      'Guard returning false without router.navigate() leaves user at blank/old URL',
      'resolve pre-fetches before component loads — if resolve errors, route activation fails',
      'route.snapshot.params is static — use route.paramMap observable for same-route navigation',
      'canMatch (Angular 14+) prevents route from being matched — different from canActivate which blocks activation',
      'Lazy loaded routes have their own injector — services provided there are not root-level singletons',
      'Guards run in ORDER: canMatch → canActivate → canActivateChild → resolve',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — Full navigation lifecycle: URL → matching → guards → resolve → component.',
          nodes: [
            { id: 'url', label: 'URL Change', sublabel: '/admin/users', type: 'component', active: true },
            { id: 'match', label: 'Router\nMatching', sublabel: 'canMatch check', type: 'cache', active: false },
            { id: 'activate', label: 'canActivate', sublabel: 'authGuard', type: 'action', active: false },
            { id: 'child', label: 'canActivateChild', sublabel: 'roleGuard', type: 'action', active: false },
            { id: 'resolve', label: 'Resolve', sublabel: 'pre-fetch data', type: 'hook', active: false },
            { id: 'comp', label: 'Component\nActivated', sublabel: 'data ready', type: 'store', active: false },
          ],
          edges: [
            { from: 'url', to: 'match', label: '①' },
            { from: 'match', to: 'activate', label: '②' },
            { from: 'activate', to: 'child', label: '③' },
            { from: 'child', to: 'resolve', label: '④' },
            { from: 'resolve', to: 'comp', label: '⑤' },
          ],
          code: `// Routes definition
{
  path: 'admin',
  canMatch: [canMatchGuard],       // ① route matching
  canActivate: [authGuard],        // ② entry check
  canActivateChild: [roleGuard],   // ③ child check
  resolve: { data: dataResolver }, // ④ pre-fetch
  component: AdminComponent,       // ⑤ activate
}`,
        },
        {
          phase: 'commit',
          narration: 'Step 2 — canActivate: guard returns true (proceed) or UrlTree (redirect to login).',
          nodes: [
            { id: 'nav', label: 'Navigate to\n/admin', type: 'component', active: true },
            { id: 'guard', label: 'authGuard', sublabel: 'inject(AuthService)', type: 'action', active: true },
            { id: 'loggedin', label: '✅ Logged in', sublabel: 'return true', type: 'store', active: true },
            { id: 'notauth', label: '❌ Not logged in', sublabel: 'redirect /login', type: 'reducer', active: false, dim: true },
          ],
          edges: [
            { from: 'nav', to: 'guard', label: 'triggers guard', active: true, color: '#ffa657' },
            { from: 'guard', to: 'loggedin', label: 'auth.isLoggedIn()', active: true, color: '#3fb950' },
            { from: 'guard', to: 'notauth', label: 'not auth', color: '#f85149' },
          ],
          code: `// Functional guard (Angular 14+)
export const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) return true;  // ✅ proceed

  // ❌ redirect — never return false without redirecting
  return router.createUrlTree(['/login']);
};`,
        },
        {
          phase: 'effect',
          narration: 'Step 3 — Resolve: pre-fetch data before component activates. Component gets data instantly.',
          nodes: [
            { id: 'guard', label: 'canActivate\npassed', type: 'action', active: true },
            { id: 'resolver', label: 'Resolver\nHTTP /api/user/42', type: 'hook', active: true },
            { id: 'data', label: 'Data Ready\n{ user: {...} }', type: 'store', active: true },
            { id: 'comp', label: 'UserDetailComponent\nroute.data.user', type: 'component', active: true },
          ],
          edges: [
            { from: 'guard', to: 'resolver', label: 'triggers resolve', active: true, color: '#58a6ff' },
            { from: 'resolver', to: 'data', label: 'HTTP response', active: true, color: '#3fb950' },
            { from: 'data', to: 'comp', label: 'injected into route.data', active: true, color: '#d2a8ff' },
          ],
          code: `// Resolver — pre-fetch before activation
export const userResolver = (route: ActivatedRouteSnapshot) =>
  inject(UserService).getUser(route.params['id']);

// Routes
{ path: 'user/:id', resolve: { user: userResolver },
  component: UserDetailComponent }

// Component — data already available in ngOnInit
ngOnInit() {
  this.user = this.route.snapshot.data['user'];
  // No loading spinner needed — data pre-fetched!
}`,
        },
        {
          phase: 'update',
          narration: 'Step 4 — Lazy loading: feature module loaded only when route activated. Separate JS chunk.',
          nodes: [
            { id: 'app', label: 'App Bundle\n(initial load)', sublabel: 'no admin code yet', type: 'component', active: true },
            { id: 'nav', label: 'User navigates\nto /admin', type: 'action', active: true },
            { id: 'load', label: 'loadChildren()\nimport(./admin)', sublabel: 'network request', type: 'network', active: true },
            { id: 'chunk', label: 'admin.chunk.js\n(lazy bundle)', sublabel: '~150KB saved from initial', type: 'store', active: true },
            { id: 'comp', label: 'AdminModule\nactivated', type: 'component', active: true },
          ],
          edges: [
            { from: 'app', to: 'nav', label: '', active: true, color: '#8b949e' },
            { from: 'nav', to: 'load', label: 'triggers lazy load', active: true, color: '#ffa657' },
            { from: 'load', to: 'chunk', label: 'HTTP GET chunk.js', active: true, color: '#58a6ff' },
            { from: 'chunk', to: 'comp', label: 'register + activate', active: true, color: '#3fb950' },
          ],
          code: `// Lazy-loaded routes
{
  path: 'admin',
  canActivate: [authGuard],
  // loadChildren: entire feature module (NgModule style)
  loadChildren: () => import('./admin/admin.module')
    .then(m => m.AdminModule),

  // OR loadComponent: single standalone component
  loadComponent: () => import('./admin/admin.component')
    .then(c => c.AdminComponent),
}
// Admin code only downloaded when user navigates to /admin`,
        },
        {
          phase: 'cleanup',
          narration: 'Step 5 — canDeactivate: prevents navigation away from unsaved changes.',
          nodes: [
            { id: 'editor', label: 'EditorComponent\n(has unsaved changes)', type: 'component', active: true },
            { id: 'leave', label: 'User tries\nto navigate away', type: 'action', active: true },
            { id: 'guard', label: 'canDeactivate\ncomp.canLeave()', type: 'action', active: true },
            { id: 'confirm', label: '✅ User confirms\n(return true)', type: 'store', active: true },
            { id: 'stay', label: '❌ User cancels\n(return false)', type: 'reducer', active: false, dim: true },
          ],
          edges: [
            { from: 'editor', to: 'leave', label: 'navigation triggered', active: true, color: '#ffa657' },
            { from: 'leave', to: 'guard', label: 'canDeactivate runs', active: true, color: '#58a6ff' },
            { from: 'guard', to: 'confirm', label: 'discard changes?', color: '#3fb950', active: true },
            { from: 'guard', to: 'stay', label: 'keep editing', color: '#f85149' },
          ],
          code: `// canDeactivate guard
export const unsavedGuard = (comp: EditorComponent) => {
  if (!comp.hasUnsavedChanges()) return true;
  return confirm('Discard unsaved changes?');
  // or return Observable<boolean> for async dialog
};

// Route
{ path: 'editor', component: EditorComponent,
  canDeactivate: [unsavedGuard] }

// Note: client-side only! Refreshing browser bypasses this.`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'Angular Routing & Guards',
        time: 'O(guards) per navigation',
        space: 'O(routes)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML = window.ReactViz.label('CODE') + window.ReactViz.codeBlock(step.code, 'ts');
        },
      });
    },
  }]);
})();
