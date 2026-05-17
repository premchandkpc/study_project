(function () {
  'use strict';

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    'react-error-boundaries',
    area:  'react',
    title: 'Error Boundaries',
    tag:   'Reliability',
    tags:  ['react', 'error-boundary', 'error-handling', 'fallback'],

    concept: `Error Boundaries are class components that implement componentDidCatch() and/or getDerivedStateFromError(). They catch JavaScript errors thrown anywhere in their child component tree during render, lifecycle methods, and constructors — then render a fallback UI instead of crashing the whole app. Errors in event handlers, async code, and SSR are NOT caught.`,

    why: `Production React apps need graceful error recovery. Without error boundaries, a single thrown error unmounts the entire React tree. Boundaries scope the blast radius: a broken widget crashes its boundary, not the whole page.`,

    example: {
      language: 'javascript',
      code: `class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logErrorToService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <h2>Something went wrong.</h2>;
    }
    return this.props.children;
  }
}

// Usage:
<ErrorBoundary fallback={<ErrorPage />}>
  <UserDashboard />
</ErrorBoundary>`,
    },

    interview: [
      'What do error boundaries catch? What do they NOT catch?',
      'Why must error boundaries be class components?',
      'How do you scope error boundaries for granular recovery?',
      'Difference between getDerivedStateFromError and componentDidCatch?',
      'How does React 18 handle errors in concurrent mode?',
    ],

    tradeoffs: {
      pros: [
        'Scopes crash blast radius — broken subtree, not whole app',
        'Enables custom fallback UI per feature area',
        'componentDidCatch gives full error + component stack for logging',
      ],
      cons: [
        'Must be class components — no hooks equivalent (use react-error-boundary library)',
        'Does NOT catch: event handlers, async code (setTimeout/fetch), SSR errors',
        'Error in error boundary itself crashes to nearest parent boundary',
      ],
    },

    gotchas: [
      'Event handler errors need try/catch — boundary will NOT catch them',
      'Async errors (setTimeout, promises) not caught — need .catch() or window.onerror',
      'In development, React re-throws errors after boundary catches — for stack traces',
      'react-error-boundary library adds useErrorBoundary hook for throwing from async',
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: 'render',
          narration: 'Step 1 — Normal render. App → Dashboard → UserWidget all render successfully.',
          tree: {
            name: 'App',
            type: 'component',
            children: [
              {
                name: 'ErrorBoundary',
                type: 'provider',
                children: [
                  {
                    name: 'Dashboard',
                    type: 'component',
                    children: [
                      { name: 'UserWidget', type: 'component' },
                      { name: 'StatsPanel', type: 'component' },
                    ],
                  },
                ],
              },
            ],
          },
          code: `// Normal render — no errors
function UserWidget() {
  const data = useUser();    // works fine
  return <div>{data.name}</div>;
}

<ErrorBoundary fallback={<ErrorCard />}>
  <Dashboard>
    <UserWidget />
    <StatsPanel />
  </Dashboard>
</ErrorBoundary>`,
        },
        {
          phase: 'update',
          narration: 'Step 2 — UserWidget throws during render. fetch returned null, accessing .name throws TypeError.',
          tree: {
            name: 'App',
            type: 'component',
            children: [
              {
                name: 'ErrorBoundary',
                type: 'provider',
                children: [
                  {
                    name: 'Dashboard',
                    type: 'component',
                    children: [
                      { name: 'UserWidget 💥 throws!', type: 'component', rerender: true },
                      { name: 'StatsPanel', type: 'component' },
                    ],
                  },
                ],
              },
            ],
          },
          code: `function UserWidget() {
  const data = null;  // fetch returned null
  return <div>{data.name}</div>;
  //          ^^^^^^^^^^^
  // TypeError: Cannot read properties of null
  // Error propagates UP the component tree
}`,
        },
        {
          phase: 'commit',
          narration: 'Step 3 — Error bubbles up to ErrorBoundary. getDerivedStateFromError() fires, sets hasError=true. React re-renders the boundary.',
          tree: {
            name: 'App',
            type: 'component',
            children: [
              {
                name: 'ErrorBoundary',
                type: 'provider',
                rerender: true,
                state: { hasError: true, error: 'TypeError: Cannot read...' },
                children: [
                  {
                    name: 'Dashboard — unmounted',
                    type: 'component',
                    skipped: true,
                    children: [
                      { name: 'UserWidget', type: 'component', skipped: true },
                      { name: 'StatsPanel', type: 'component', skipped: true },
                    ],
                  },
                ],
              },
            ],
          },
          code: `class ErrorBoundary extends React.Component {
  // React calls this during render phase
  static getDerivedStateFromError(error) {
    // Return state update to trigger fallback render
    return { hasError: true, error };
  }

  // React calls this after commit
  componentDidCatch(error, { componentStack }) {
    logToSentry(error, componentStack);
    // componentStack shows: UserWidget → Dashboard → ErrorBoundary
  }
}`,
        },
        {
          phase: 'effect',
          narration: 'Step 4 — ErrorBoundary renders fallback. Sibling routes/components outside the boundary still work.',
          tree: {
            name: 'App',
            type: 'component',
            children: [
              {
                name: 'ErrorBoundary',
                type: 'provider',
                state: { hasError: true },
                children: [
                  {
                    name: 'ErrorCard (fallback)',
                    type: 'component',
                  },
                ],
              },
              {
                name: 'Navbar (outside boundary)',
                type: 'component',
              },
            ],
          },
          code: `render() {
  if (this.state.hasError) {
    // Fallback UI — full tree replaced
    return (
      <ErrorCard
        title="Widget failed to load"
        onRetry={() => this.setState({ hasError: false })}
      />
    );
  }
  // Normal render
  return this.props.children;
}

// Navbar is OUTSIDE boundary — still renders fine
<>
  <Navbar />
  <ErrorBoundary fallback={<ErrorCard />}>
    <Dashboard />
  </ErrorBoundary>
</>`,
        },
        {
          phase: 'update',
          narration: 'Step 5 — Retry pattern. ErrorCard calls onRetry → resets hasError=false → boundary re-renders children fresh.',
          tree: {
            name: 'App',
            type: 'component',
            children: [
              {
                name: 'ErrorBoundary',
                type: 'provider',
                state: { hasError: false },
                rerender: true,
                children: [
                  {
                    name: 'Dashboard',
                    type: 'component',
                    children: [
                      { name: 'UserWidget (retry)', type: 'component', rerender: true },
                      { name: 'StatsPanel', type: 'component' },
                    ],
                  },
                ],
              },
            ],
          },
          code: `// ErrorCard triggers retry
<ErrorCard
  onRetry={() => this.setState({ hasError: false })}
/>

// hasError resets → children re-render from scratch
// UserWidget gets a fresh chance to fetch + render

// react-error-boundary library makes this easy:
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

function UserWidget() {
  const { showBoundary } = useErrorBoundary();
  useEffect(() => {
    fetchUser().catch(showBoundary); // throw into boundary from async
  }, []);
}`,
        },
      ];

      window.ReactViz.panel(mount, {
        title: 'Error Boundaries',
        time:  'O(tree depth)',
        space: 'O(1)',
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.ComponentTree.render(vizEl, step.tree);
          codeEl.innerHTML =
            window.ReactViz.label('CODE') +
            window.ReactViz.codeBlock(step.code, 'js');
        },
      });
    },
  }]);
})();
