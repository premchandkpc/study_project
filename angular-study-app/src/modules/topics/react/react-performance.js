/**
 * react-performance.js
 * Topic: React Performance — re-render optimization, Profiler, key usage, virtualization
 */
(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-performance',
    area:  'react',
    title: 'React Performance',
    tag:   'Performance',
    tags:  ['react','performance','profiler','memo','virtualization','reconciliation','keys'],

    concept: `React re-renders a component when: its state changes, its parent re-renders, or context changes.
Re-renders are cheap IF the component is simple. They become expensive when:
  - Many child components re-render unnecessarily
  - Expensive computations run every render
  - Large lists re-render all items
Tools: React.memo (skip re-render), useMemo (cache computation), React Profiler (measure), virtualization (windowing).
Key: helps React identify list items — wrong key = unmount/remount instead of update.`,

    why: `Most React apps don't need optimization until they don't.
Profile first — identify the actual bottleneck. 80% of performance issues come from 20% of components.
Common culprits: Context with high-frequency updates, large unvirtualized lists, inline object/function props.`,

    example: {
      language: 'javascript',
      code: `// 1. Profile first — identify real bottleneck
import { Profiler } from 'react';

<Profiler id="UserList" onRender={(id, phase, duration) => {
  console.log(id, phase, duration); // 'UserList commit 85ms'
}}>
  <UserList />
</Profiler>

// 2. React.memo — skip re-render if props unchanged
const UserCard = React.memo(function UserCard({ user, onSelect }) {
  return <div onClick={() => onSelect(user.id)}>{user.name}</div>;
}); // shallow comparison — onSelect must be stable!

// 3. Virtualize large lists — only render visible items
import { FixedSizeList } from 'react-window';

<FixedSizeList height={600} itemCount={10000} itemSize={50}>
  {({ index, style }) => (
    <div style={style}><UserCard user={users[index]} /></div>
  )}
</FixedSizeList>

// 4. Key: stable identity for list items
// ❌ index key — causes remount on reorder/insert
users.map((u, i) => <UserCard key={i} user={u} />)

// ✓ stable unique key
users.map(u => <UserCard key={u.id} user={u} />)

// 5. Avoid inline objects/functions in props
// ❌ new object ref every render
<Chart options={{ color: 'blue' }} />

// ✓ stable ref
const chartOpts = useMemo(() => ({ color: 'blue' }), []);
<Chart options={chartOpts} />`,
    },

    interview: [
      'When does React re-render a component?',
      'What does React.memo do, and when does it fail?',
      'How do you profile React component renders?',
      'What is virtualization and when should you use it?',
      'Why are stable keys important in lists?',
      'How do you prevent Context from causing re-renders?',
    ],

    tradeoffs: {
      pros: ['React.memo prevents unnecessary renders', 'Virtualization enables 100k-item lists', 'Profiler identifies exact bottlenecks'],
      cons: ['memo + useCallback adds complexity', 'Premature optimization is harmful', 'Profiler has overhead in production'],
    },

    gotchas: [
      'React.memo: if parent re-renders and passes new function ref → child re-renders anyway. Need useCallback.',
      'key={index}: inserting item at position 0 → ALL subsequent items remount (wrong keys).',
      'Profiler measures commit time, not render time — check both.',
      'Context with split: too many small contexts = hard to maintain.',
      'react-window requires fixed item sizes — for variable sizes use react-virtual.',
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: 'render',
          narration: 'Unoptimized: App re-renders → ALL children re-render, even unchanged ones.',
          tree: {
            name: 'App', type: 'component', state: { count: 5 }, rerender: true,
            children: [
              { name: 'Header',   type: 'component', rerender: true,  props: { note: 'no state — still re-renders!' } },
              { name: 'UserList', type: 'component', rerender: true,  props: { users: '[1000 items]' } },
              { name: 'Sidebar',  type: 'component', rerender: true,  props: { note: 'never changes' } },
              { name: 'Footer',   type: 'component', rerender: true,  props: { note: 'static content' } },
            ],
          },
          code: `// Every setCount(n) re-renders:\n// App → Header → UserList (1000 items!) → Sidebar → Footer\n// UserList renders 1000 rows × React diff = SLOW\n\n// Measure with Profiler:\n// Header: 2ms  UserList: 85ms  Sidebar: 1ms Footer: 1ms\n// Bottleneck: UserList`,
        },
        {
          phase: 'render',
          narration: 'React.memo on static components: Header, Sidebar, Footer skip re-render when props unchanged.',
          tree: {
            name: 'App', type: 'component', state: { count: 6 }, rerender: true,
            children: [
              { name: 'Header',   type: 'memo', skipped: true,  props: { note: '✓ skipped' } },
              { name: 'UserList', type: 'component', rerender: true, props: { users: '[1000]', onSelect: '?' } },
              { name: 'Sidebar',  type: 'memo', skipped: true,  props: { note: '✓ skipped' } },
              { name: 'Footer',   type: 'memo', skipped: true,  props: { note: '✓ skipped' } },
            ],
          },
          code: `const Header  = React.memo(function Header()  { ... });\nconst Sidebar = React.memo(function Sidebar() { ... });\nconst Footer  = React.memo(function Footer()  { ... });\n\n// Now setCount only re-renders:\n// App + UserList (props might have changed)\n// Header/Sidebar/Footer: props same → SKIP ✓`,
        },
        {
          phase: 'render',
          narration: 'UserList still re-renders: onSelect is a new function every render. useCallback fixes this.',
          tree: {
            name: 'App', type: 'component', state: { count: 7 }, rerender: true,
            children: [
              { name: 'Header',   type: 'memo', skipped: true },
              { name: 'UserList', type: 'memo', skipped: true, props: { onSelect: '[stable]', note: '✓ skipped now!' } },
              { name: 'Sidebar',  type: 'memo', skipped: true },
              { name: 'Footer',   type: 'memo', skipped: true },
            ],
          },
          code: `// Before: new function every render\nconst onSelect = (id) => setSelected(id); // ← new ref!\n\n// After: stable function with useCallback\nconst onSelect = useCallback((id) => {\n  setSelected(id);\n}, []); // stable ref!\n\n// Now UserList = React.memo:\n// onSelect unchanged → skip ✓\n// 1000-item re-render avoided`,
        },
        {
          phase: 'render',
          narration: 'Virtualization: 10k items — only 15 visible rows rendered. DOM has 15 nodes, not 10k.',
          tree: {
            name: 'UserList (virtualized)', type: 'memo',
            children: [
              { name: 'FixedSizeList', type: 'component', props: { total: 10000, rendered: 15 } },
              { name: 'UserRow[42]',   type: 'dom',  props: { style: 'top:2100px' } },
              { name: 'UserRow[43]',   type: 'dom',  props: { style: 'top:2150px' } },
              { name: 'UserRow[44]',   type: 'dom',  props: { style: 'top:2200px' } },
              { name: '...12 more',    type: 'dom',  props: { note: 'visible window' } },
            ],
          },
          code: `import { FixedSizeList } from 'react-window';\n\n// Only renders visible rows:\n<FixedSizeList\n  height={600}      // viewport height\n  itemCount={10000} // total items\n  itemSize={50}     // each row: 50px\n>\n  {({ index, style }) => (\n    <UserRow user={users[index]} style={style} />\n  )}\n</FixedSizeList>\n// DOM: 15 nodes instead of 10,000!`,
        },
        {
          phase: 'update',
          narration: 'Key matters: index key = remount on insert. Stable id key = update in place, state preserved.',
          tree: {
            name: 'UserList', type: 'component', rerender: true,
            children: [
              { name: 'UserCard key="alice"', type: 'memo', skipped: true, props: { user: 'Alice' } },
              { name: 'UserCard key="NEW"',   type: 'component', rerender: false, props: { user: 'Bob (inserted)' } },
              { name: 'UserCard key="charlie"',type: 'memo', skipped: true, props: { user: 'Charlie' } },
            ],
          },
          code: `// ❌ index key: insert Bob at start:\n// key=0: Alice → Bob   (remount, state lost!)\n// key=1: Bob   → Charlie (remount)\n// key=2: —     → Alice  (new mount)\n// All 3 remount! Input values reset!\n\n// ✓ stable id key: insert Bob at start:\n// key="alice":   Alice   → stays, skipped ✓\n// key="bob":     NEW     → mounts once ✓\n// key="charlie": Charlie → stays, skipped ✓`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'React Performance Optimization',
        time:  'O(k) renders (k = changed)',
        space: 'O(visible) virtualized',
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.ComponentTree.render(vizEl, step.tree);
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">OPTIMIZATION</div>
            ${window.ReactViz.codeBlock(step.code, 'js')}`;
        },
      });
    },
  }]);
})();
