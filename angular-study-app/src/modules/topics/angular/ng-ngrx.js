(function () {
  'use strict';

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: 'ng-ngrx',
    area: 'angular',
    title: 'NgRx State Management',
    tag: 'State',
    tags: ['angular', 'ngrx', 'redux', 'actions', 'reducers', 'effects', 'selectors', 'store'],

    concept: `**NgRx** is Angular's Redux implementation — unidirectional data flow for predictable state.

**Core pieces:**
- **Action** — plain object describing WHAT happened: \`{ type: '[Cart] Add Item', item }\`
- **Reducer** — pure function: \`(state, action) => newState\`. Never mutates.
- **Store** — single immutable state tree. Source of truth.
- **Selector** — memoized projector: \`createSelector(featureSlice, s => s.items)\`. Re-runs only when inputs change.
- **Effect** — handles side effects (HTTP, routing). Listens for actions, dispatches new ones. Uses RxJS.

**Data flow:**
\`Component → dispatch(Action) → Reducer → Store → Selector → Component\`

**With Effects:**
\`dispatch(loadItems) → Effect → HTTP call → dispatch(loadItemsSuccess) → Reducer → Store\`

**NgRx Signals Store** (NgRx 17+): lighter alternative using Angular signals instead of RxJS.`,

    why: `NgRx shines in large apps with complex shared state, time-travel debugging (Redux DevTools), and teams that need predictability. Every state change is an action — full audit trail. Selectors prevent unnecessary re-renders by memoizing derived state.`,

    example: {
      language: 'typescript',
      code: `// Actions
export const addToCart = createAction('[Cart] Add Item',
  props<{ item: CartItem }>());
export const loadOrders = createAction('[Orders] Load');
export const loadOrdersSuccess = createAction('[Orders] Load Success',
  props<{ orders: Order[] }>());

// Reducer — pure, no side effects
export const cartReducer = createReducer(
  initialState,
  on(addToCart, (state, { item }) => ({
    ...state,
    items: [...state.items, item],
  })),
);

// Selector — memoized, composes
export const selectCartItems = createSelector(
  selectCartState,           // input selector
  (cart) => cart.items,      // projector — only re-runs when cart changes
);
export const selectCartTotal = createSelector(
  selectCartItems,
  (items) => items.reduce((sum, i) => sum + i.price, 0),
);

// Effect — side effects via RxJS
@Injectable()
export class OrderEffects {
  loadOrders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadOrders),
      switchMap(() => this.http.get<Order[]>('/api/orders').pipe(
        map(orders => loadOrdersSuccess({ orders })),
        catchError(err => of(loadOrdersFailed({ error: err.message }))),
      )),
    ),
  );
  constructor(private actions$: Actions, private http: HttpClient) {}
}`,
    },

    interview: [
      'What is the NgRx data flow — Action to Store?',
      'Why must reducers be pure functions?',
      'What is a selector and why does memoization matter?',
      'When use NgRx vs Angular service with BehaviorSubject?',
      'How do Effects handle side effects without polluting reducers?',
      'What is the difference between ofType and filter in Effects?',
    ],

    tradeoffs: {
      pros: [
        'Single source of truth — no conflicting service states',
        'Time-travel debugging with Redux DevTools',
        'Selectors memoize derived state — no unnecessary re-renders',
        'Effects isolate side effects — reducers remain pure and testable',
      ],
      cons: [
        'Massive boilerplate for small apps — actions/reducers/selectors/effects per feature',
        'Learning curve: RxJS + Redux mental model together',
        'Over-engineered for local component state — use component state or service BehaviorSubject instead',
        'NgRx bundle ~50KB gzipped',
      ],
    },

    gotchas: [
      'Reducers must return new state objects — mutating state breaks change detection and DevTools',
      'Selectors memoize by reference equality — spreading creates new ref even if values same',
      'Effects must always return an observable — missing catchError causes Effect to die silently',
      'dispatch() is synchronous — the store updates synchronously but effects are async',
      'Avoid subscribing to store inside effects — use withLatestFrom or concatLatestFrom instead',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — NgRx unidirectional flow: Component dispatches Action → Reducer updates Store.',
          nodes: [
            { id: 'comp', label: 'Component', sublabel: 'dispatch(addToCart)', type: 'component', active: true },
            { id: 'action', label: 'Action', sublabel: "{ type: '[Cart] Add' }", type: 'action', active: true },
            { id: 'reducer', label: 'Reducer', sublabel: '(state, action) => state', type: 'reducer', active: false },
            { id: 'store', label: 'Store', sublabel: '{ cart: { items: [...] } }', type: 'store', active: false },
          ],
          edges: [
            { from: 'comp', to: 'action', label: 'dispatch()', active: true, color: '#3fb950' },
            { from: 'action', to: 'reducer', label: 'passed to', color: '#ffa657' },
            { from: 'reducer', to: 'store', label: 'new state', color: '#58a6ff' },
          ],
          code: `// Component dispatches an action
this.store.dispatch(addToCart({ item: selectedItem }));

// Action is a plain object
const addToCart = createAction('[Cart] Add Item',
  props<{ item: CartItem }>());`,
        },
        {
          phase: 'commit',
          narration: 'Step 2 — Reducer: pure function. Old state + Action → New state. Never mutates.',
          nodes: [
            { id: 'action', label: 'Action', sublabel: "addToCart({ item })", type: 'action', active: true },
            { id: 'oldstate', label: 'Old State', sublabel: 'items: [A, B]', type: 'cache', active: false },
            { id: 'reducer', label: 'Reducer', sublabel: 'PURE — no side effects', type: 'reducer', active: true },
            { id: 'newstate', label: 'New State', sublabel: 'items: [A, B, C]', type: 'store', active: true },
          ],
          edges: [
            { from: 'action', to: 'reducer', label: '', active: true, color: '#ffa657' },
            { from: 'oldstate', to: 'reducer', label: 'current state', color: '#58a6ff' },
            { from: 'reducer', to: 'newstate', label: '{ ...state, items: [...] }', active: true, color: '#3fb950' },
          ],
          code: `export const cartReducer = createReducer(
  initialState,
  on(addToCart, (state, { item }) => ({
    ...state,               // spread — create NEW object
    items: [...state.items, item],  // new array
  })),
  // ❌ WRONG: state.items.push(item) — mutates!
);`,
        },
        {
          phase: 'effect',
          narration: 'Step 3 — Selector: memoized projection. Only re-computes when input slice changes.',
          nodes: [
            { id: 'store', label: 'Store', sublabel: '{ cart: { items: [...] } }', type: 'store', active: true },
            { id: 'sel1', label: 'selectCartState', sublabel: 'feature slice', type: 'selector', active: true },
            { id: 'sel2', label: 'selectCartItems', sublabel: 'state.items', type: 'selector', active: true },
            { id: 'sel3', label: 'selectCartTotal', sublabel: 'Σ item.price', type: 'selector', active: true },
            { id: 'comp', label: 'Component', sublabel: 'subscribe via async pipe', type: 'component', active: true },
          ],
          edges: [
            { from: 'store', to: 'sel1', label: 'slice', color: '#58a6ff', active: true },
            { from: 'sel1', to: 'sel2', label: 'compose', color: '#d2a8ff' },
            { from: 'sel2', to: 'sel3', label: 'compose', color: '#d2a8ff' },
            { from: 'sel3', to: 'comp', label: 'memoized $', active: true, color: '#3fb950' },
          ],
          code: `export const selectCartTotal = createSelector(
  selectCartItems,          // input selector
  (items) => items.reduce( // projector — only runs when items changes
    (sum, i) => sum + i.price, 0
  ),
);
// In template:
total$ = this.store.select(selectCartTotal);
// <div>{{ total$ | async }}</div>`,
        },
        {
          phase: 'update',
          narration: 'Step 4 — Effect: side effects (HTTP, routing) outside reducer. Dispatches new action on result.',
          nodes: [
            { id: 'action', label: 'loadOrders\n(Action)', type: 'action', active: true },
            { id: 'effect', label: 'OrderEffects\n(ofType)', type: 'hook', active: true },
            { id: 'http', label: 'HTTP\nGET /api/orders', type: 'network', active: true },
            { id: 'success', label: 'loadOrdersSuccess\n(Action)', type: 'action', active: true },
            { id: 'reducer', label: 'Reducer\n→ Store', type: 'store', active: true },
          ],
          edges: [
            { from: 'action', to: 'effect', label: 'ofType(loadOrders)', color: '#ffa657', active: true },
            { from: 'effect', to: 'http', label: 'switchMap', color: '#58a6ff', active: true },
            { from: 'http', to: 'success', label: 'map(orders =>)', active: true, color: '#3fb950' },
            { from: 'success', to: 'reducer', label: 'dispatched', active: true, color: '#d2a8ff' },
          ],
          code: `loadOrders$ = createEffect(() =>
  this.actions$.pipe(
    ofType(loadOrders),
    switchMap(() =>
      this.http.get<Order[]>('/api/orders').pipe(
        map(orders => loadOrdersSuccess({ orders })),
        catchError(e => of(loadOrdersFailed({ error: e.message }))),
      )
    ),
  ),
);`,
        },
        {
          phase: 'cleanup',
          narration: 'Step 5 — Full loop: Component → Action → Reducer → Store → Selector → Component.',
          nodes: [
            { id: 'comp', label: 'Component', sublabel: 'UI event', type: 'component', active: true },
            { id: 'action', label: 'Action', type: 'action', active: true },
            { id: 'effect', label: 'Effects\n(async)', type: 'hook', active: false },
            { id: 'reducer', label: 'Reducer', type: 'reducer', active: true },
            { id: 'store', label: 'Store', type: 'store', active: true },
            { id: 'selector', label: 'Selector', type: 'selector', active: true },
          ],
          edges: [
            { from: 'comp', to: 'action', label: 'dispatch()', active: true, color: '#3fb950' },
            { from: 'action', to: 'effect', label: 'async side\neffects', color: '#ffa657' },
            { from: 'action', to: 'reducer', label: 'sync update', active: true, color: '#ffa657' },
            { from: 'reducer', to: 'store', label: 'new state', active: true, color: '#58a6ff' },
            { from: 'store', to: 'selector', label: 'select()', active: true, color: '#d2a8ff' },
            { from: 'selector', to: 'comp', label: '| async', active: true, color: '#3fb950' },
          ],
          code: `// Complete NgRx loop in one view:
// 1. Component: store.dispatch(action)
// 2. Reducer: (state, action) => newState (sync)
// 3. Store: emits new state
// 4. Selector: memoized projection
// 5. Component: template re-renders via async pipe
// Side effects (HTTP) handled by Effects separately`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'NgRx: Unidirectional State Flow',
        time: 'O(1) dispatch',
        space: 'O(state tree)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML = window.ReactViz.label('CODE') + window.ReactViz.codeBlock(step.code, 'ts');
        },
      });
    },
  }]);
})();
