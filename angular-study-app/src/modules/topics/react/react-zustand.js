(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-zustand',
    area:  'react',
    title: 'Zustand Deep Dive',
    tag:   'State',
    tags:  ['react', 'zustand', 'state-management', 'store', 'selector'],

    concept: `Zustand is a minimal state management library using a pub-sub store outside React's component tree. create() produces a store with state + actions. Components subscribe via useStore(selector) — they only re-render when the selected slice changes. No Provider, no boilerplate, no reducers. Internally uses React's useSyncExternalStore hook.`,

    why: `Redux adds ~10KB + Provider + actions + reducers + selectors for simple shared state. Zustand achieves the same with 1KB, no Provider, and co-located state+actions. Preferred for mid-scale apps where Context causes too many re-renders but Redux feels like overkill.`,

    example: {
      language: 'javascript',
      code: `import { create } from 'zustand';

// Store: state + actions in one place
const useCartStore = create((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) => set((state) => ({
    items: [...state.items, item],
    total: state.total + item.price,
  })),

  removeItem: (id) => set((state) => {
    const items = state.items.filter(i => i.id !== id);
    return { items, total: items.reduce((s, i) => s + i.price, 0) };
  }),

  clearCart: () => set({ items: [], total: 0 }),
}));

// Component — subscribes to only 'items'
function CartList() {
  const items = useCartStore((state) => state.items);
  return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>;
}

// Component — subscribes to only 'total'
function CartTotal() {
  const total = useCartStore((state) => state.total);
  return <strong>\${total}</strong>;
}`,
    },

    interview: [
      'How does Zustand avoid unnecessary re-renders? (selector equality check)',
      'How is Zustand different from Redux and Context?',
      'What is useSyncExternalStore and why does Zustand use it?',
      'How do you handle async actions in Zustand?',
      'Explain Zustand devtools middleware.',
    ],

    tradeoffs: {
      pros: [
        'No Provider — store is module-level singleton',
        '~1KB bundle size vs Redux ~10KB',
        'Selector-based subscriptions prevent unnecessary re-renders',
        'Actions co-located with state — no separate action/reducer files',
        'Works outside React (call store.getState() / store.setState() anywhere)',
      ],
      cons: [
        'No enforced unidirectional data flow — easy to mutate state inconsistently',
        'No built-in computed selectors like Reselect (add manually)',
        'Large stores can become a monolith if not structured',
        'Time-travel debugging weaker than Redux DevTools',
      ],
    },

    gotchas: [
      'Without selector, useStore() re-renders on ANY store change — always pass a selector',
      'Object selectors create new references — use shallow() from zustand/shallow to compare object slices',
      'Mutating state directly (state.items.push()) bypasses Zustand — always use set()',
      'immer middleware available for mutable-style updates: produce(state, draft => { draft.items.push(item) })',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — Store created with create(). Lives as module-level singleton outside React tree. No Provider needed.',
          nodes: [
            { id: 'create',    label: 'create((set, get) => ({...}))', type: 'action',    active: true },
            { id: 'store',     label: 'Zustand Store\n{ items:[], total:0, addItem, removeItem }', type: 'store', active: true },
            { id: 'react',     label: 'React Component Tree', type: 'component', active: false, dim: true },
            { id: 'note',      label: 'No <Provider> needed\nStore is module-level', type: 'network', active: true },
          ],
          edges: [
            { from: 'create', to: 'store', label: 'returns store hook', active: true, color: '#ffa657' },
            { from: 'store',  to: 'note',  label: 'outside React', active: true, color: '#3fb950' },
          ],
          code: `import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  total: 0,

  addItem: (item) => set((state) => ({
    items: [...state.items, item],
    total: state.total + item.price,
  })),
}));

// useCartStore is a React hook — useSyncExternalStore under the hood
// Store object exists at module level — survives component mounts/unmounts`,
        },
        {
          phase: 'render',
          narration: 'Step 2 — Components subscribe with selectors. CartList selects items, CartTotal selects total. Each component only listens to its slice.',
          nodes: [
            { id: 'store2',  label: 'Zustand Store\n{ items, total, addItem }', type: 'store',     active: true },
            { id: 'cartlist',label: 'CartList\nuseStore(s => s.items)',          type: 'component', active: true },
            { id: 'total',   label: 'CartTotal\nuseStore(s => s.total)',         type: 'component', active: true },
            { id: 'btn',     label: 'AddButton\nuseStore(s => s.addItem)',       type: 'component', active: true },
          ],
          edges: [
            { from: 'store2',  to: 'cartlist', label: 'items slice', active: true, color: '#58a6ff' },
            { from: 'store2',  to: 'total',    label: 'total slice', active: true, color: '#ffa657' },
            { from: 'store2',  to: 'btn',      label: 'addItem fn', active: true, color: '#3fb950' },
          ],
          code: `// Each component subscribes to a SLICE
function CartList() {
  // Only re-renders when items array changes reference
  const items = useCartStore((state) => state.items);
  return <ul>...</ul>;
}

function CartTotal() {
  // Only re-renders when total number changes
  const total = useCartStore((state) => state.total);
  return <strong>\${total}</strong>;
}

function AddButton() {
  // Subscribes to ACTION only — never causes re-render
  // (function reference is stable)
  const addItem = useCartStore((state) => state.addItem);
  return <button onClick={() => addItem(item)}>Add</button>;
}`,
        },
        {
          phase: 'update',
          narration: 'Step 3 — Action dispatched. addItem() calls set(). Store state updates atomically.',
          nodes: [
            { id: 'btn2',    label: 'AddButton\naddItem(shoe)',    type: 'component', active: true },
            { id: 'set',     label: 'set(state => newState)',      type: 'action',    active: true },
            { id: 'store3',  label: 'Store\nitems: [shoe]\ntotal: 99', type: 'store', active: true },
          ],
          edges: [
            { from: 'btn2',   to: 'set',    label: 'addItem({ id:1, price:99 })', active: true },
            { from: 'set',    to: 'store3', label: 'atomic update', active: true, color: '#ffa657' },
          ],
          code: `// Action called
addItem({ id: 1, name: 'Shoe', price: 99 });

// Internally:
set((state) => ({
  items: [...state.items, { id:1, name:'Shoe', price:99 }],
  total: state.total + 99,
}));

// set() is synchronous and atomic
// Both items and total update in same tick
// No separate action + reducer needed`,
        },
        {
          phase: 'effect',
          narration: 'Step 4 — Pub-sub notification. Store notifies all subscribers. Each subscriber checks if its selected slice changed.',
          nodes: [
            { id: 'store4',  label: 'Store notifies\nall subscribers',  type: 'store',     active: true },
            { id: 'sub1',    label: 'CartList\nitems changed? YES → re-render', type: 'component', active: true, rerender: true },
            { id: 'sub2',    label: 'CartTotal\ntotal changed? YES → re-render', type: 'component', active: true, rerender: true },
            { id: 'sub3',    label: 'AddButton\naddItem fn same? YES → skip',    type: 'component', active: false, dim: true },
          ],
          edges: [
            { from: 'store4', to: 'sub1', label: 'notify', active: true, color: '#3fb950' },
            { from: 'store4', to: 'sub2', label: 'notify', active: true, color: '#3fb950' },
            { from: 'store4', to: 'sub3', label: 'notify → skip', active: true, color: '#768390' },
          ],
          code: `// Zustand uses Object.is() for equality by default
// Selector(prevState) vs Selector(newState)

// CartList: prev=[], next=[shoe]  → different → re-render ✓
// CartTotal: prev=0, next=99     → different → re-render ✓
// AddButton: prev=fn, next=fn    → same ref  → no re-render ✓

// For object slices, use shallow() comparison:
import { shallow } from 'zustand/shallow';
const { items, total } = useCartStore(
  (state) => ({ items: state.items, total: state.total }),
  shallow  // compares object properties, not reference
);`,
        },
        {
          phase: 'render',
          narration: 'Step 5 — Async actions and middleware. Zustand actions can be async. devtools() middleware enables Redux DevTools.',
          nodes: [
            { id: 'async',  label: 'async action\nfetchCart(userId)',  type: 'action',    active: true },
            { id: 'api',    label: 'GET /api/cart/42',                  type: 'network',   active: true },
            { id: 'set2',   label: 'set({ items, total, loading:false })', type: 'store',  active: true },
            { id: 'mw',     label: 'devtools middleware\n→ Redux DevTools', type: 'selector', active: true },
          ],
          edges: [
            { from: 'async', to: 'api',  label: 'await fetch', active: true },
            { from: 'api',   to: 'set2', label: 'json()', active: true, color: '#3fb950' },
            { from: 'set2',  to: 'mw',   label: 'action logged', active: true, color: '#d2a8ff' },
          ],
          code: `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

const useCartStore = create(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        loading: false,

        // Async action — just use async/await
        fetchCart: async (userId) => {
          set({ loading: true });
          const cart = await fetch('/api/cart/' + userId).then(r => r.json());
          set({ items: cart.items, total: cart.total, loading: false });
        },
      }),
      { name: 'cart-storage' }  // persist to localStorage
    )
  )
);`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'Zustand Deep Dive',
        time:  'O(subscribers)',
        space: 'O(state)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: 'vertical' });
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'js');
        },
      });
    },
  }]);
})();
