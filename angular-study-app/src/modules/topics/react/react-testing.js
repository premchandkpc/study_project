/**
 * react-testing.js
 * Topic: React Testing — RTL patterns, user-event, async, mocking
 */
(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-testing",
    area:  "react",
    title: "React Testing (RTL)",
    tag:   "Testing",
    tags:  ["react","testing","rtl","jest","vitest","user-event","accessibility","mocking"],

    concept: `React Testing Library (RTL) tests components as users interact with them — not implementation details.
Query priority: getByRole > getByLabelText > getByPlaceholderText > getByText > getByTestId.
user-event: simulates real browser events (keyboard, mouse, clipboard) — more realistic than fireEvent.
Async testing: waitFor, findBy* queries wait for DOM updates after async operations.
Mock: jest.fn() for callbacks, jest.spyOn() for methods, msw (Mock Service Worker) for API calls.
Guiding principle: "The more your tests resemble the way your software is used, the more confidence they give."`,

    why: `Enzyme tested implementation (internal state, methods) — refactoring broke tests even when app worked.
RTL tests behavior from user's perspective — refactors that don't change UX don't break tests.
Accessibility built-in: RTL queries are ARIA-aware — if getByRole fails, component may have an a11y issue.`,

    example: {
      language: "javascript",
      code: `import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock API
const server = setupServer(
  rest.post('/api/login', (req, res, ctx) => {
    return res(ctx.json({ token: 'abc123' }));
  })
);
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test: user logs in successfully
test('user can login', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(
    screen.getByRole('textbox', { name: /email/i }),
    'alice@example.com'
  );
  await user.type(
    screen.getByLabelText(/password/i),
    'secret123'
  );
  await user.click(screen.getByRole('button', { name: /login/i }));

  await waitFor(() => {
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});

// Test: shows error on failed login
test('shows error on invalid credentials', async () => {
  server.use(rest.post('/api/login', (req, res, ctx) =>
    res(ctx.status(401), ctx.json({ error: 'Invalid credentials' }))
  ));
  const user = userEvent.setup();
  render(<LoginForm />);
  await user.click(screen.getByRole('button', { name: /login/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/invalid/i);
});`,
    },

    interview: [
      "Why does RTL prefer getByRole over getByTestId?",
      "Difference between getBy, queryBy, and findBy?",
      "When to use waitFor vs findBy?",
      "How do you test a component that fetches data?",
      "What is userEvent and how does it differ from fireEvent?",
      "What is Mock Service Worker (msw) and why use it over jest.mock(fetch)?",
    ],

    tradeoffs: {
      pros: ["Tests behavior, not implementation", "Accessibility built-in", "Resilient to refactors", "msw works in browser too"],
      cons: ["Async tests can be flaky", "Harder to test complex internal state", "msw setup overhead"],
    },

    gotchas: [
      "getBy throws if not found — queryBy returns null. Use queryBy for \"should not exist\" assertions.",
      "findBy* is async (returns Promise) — always await it.",
      "userEvent.setup() must be called once per test.",
      "screen.debug() prints current DOM — use to diagnose \"cannot find element\" failures.",
      "act() warning: RTL handles most cases — manual act() needed for custom timers/intervals.",
    ],

    visual: function (mount) {
      var steps = [
        {
          phase: "render",
          narration: "Step 1 — render(): mounts component into JSDOM. screen queries the rendered output.",
          nodes: [
            { id: "comp",   label: "LoginForm", sublabel: "component under test", type: "component", active: true },
            { id: "jsdom",  label: "JSDOM", sublabel: "virtual browser DOM", type: "client", active: true },
            { id: "screen", label: "screen", sublabel: "query the DOM", type: "hook", active: true },
          ],
          edges: [
            { from: "comp",   to: "jsdom",  label: "render()", active: true, color: "#58a6ff" },
            { from: "jsdom",  to: "screen", label: "queries", active: true, color: "#3fb950" },
          ],
          code: "import { render, screen } from '@testing-library/react';\n\n// Mount component into virtual DOM:\nrender(<LoginForm />);\n\n// Query the DOM (prefer role queries):\nscreen.getByRole('textbox', { name: /email/i });\nscreen.getByRole('button', { name: /login/i });\nscreen.getByLabelText(/password/i);\n\n// Debug: print DOM tree\nscreen.debug();",
        },
        {
          phase: "update",
          narration: "Step 2 — Query priority. getByRole queries by ARIA role — matches how screen readers see the page.",
          nodes: [
            { id: "role",   label: "getByRole", sublabel: "best — ARIA aware", type: "action", active: true },
            { id: "label",  label: "getByLabelText", sublabel: "good — a11y", type: "action", active: true },
            { id: "text",   label: "getByText", sublabel: "ok — visible text", type: "component" },
            { id: "testid", label: "getByTestId", sublabel: "last resort", type: "reducer", dim: true },
          ],
          edges: [
            { from: "role",  to: "label",  label: "fallback", active: false },
            { from: "label", to: "text",   label: "fallback", active: false },
            { from: "text",  to: "testid", label: "last resort", active: false },
          ],
          code: "// Query priority (high to low):\n\n// 1. getByRole — accessible label\nscreen.getByRole('button', { name: /submit/i });\nscreen.getByRole('textbox', { name: /email/i });\n\n// 2. getByLabelText\nscreen.getByLabelText(/password/i);\n\n// 3. getByText (for non-form elements)\nscreen.getByText(/welcome, alice/i);\n\n// 4. getByTestId — AVOID\nscreen.getByTestId('submit-btn');",
        },
        {
          phase: "update",
          narration: "Step 3 — userEvent simulates real browser events: keyboard, pointer, clipboard. More realistic than fireEvent.",
          nodes: [
            { id: "user",  label: "userEvent", sublabel: "real browser simulation", type: "component", active: true },
            { id: "type",  label: "user.type()", sublabel: "keydown+keypress+input+keyup", type: "action", active: true },
            { id: "click", label: "user.click()", sublabel: "pointerdown+mousedown+click", type: "action", active: true },
            { id: "fire",  label: "fireEvent", sublabel: "single synthetic event (limited)", type: "reducer", dim: true },
          ],
          edges: [
            { from: "user", to: "type",  label: "", active: true, color: "#3fb950" },
            { from: "user", to: "click", label: "", active: true, color: "#3fb950" },
          ],
          code: "import userEvent from '@testing-library/user-event';\n\nconst user = userEvent.setup();\n\n// Simulate real typing (fires ALL keyboard events):\nawait user.type(emailInput, 'alice@example.com');\n\n// Simulate click:\nawait user.click(submitButton);\n\n// Other:\nawait user.clear(input);\nawait user.selectOptions(select, 'Option 1');\nawait user.paste(input, 'pasted text');",
        },
        {
          phase: "suspend",
          narration: "Step 4 — Async testing. findBy* waits for element to appear. waitFor retries assertion until it passes.",
          nodes: [
            { id: "click",    label: "user.click(submit)", sublabel: "triggers async fetch", type: "action", active: true },
            { id: "fetch",    label: "fetch /api/login", sublabel: "async network call", type: "network", active: true },
            { id: "state",    label: "setUser(data)", sublabel: "state update", type: "store", active: true },
            { id: "rerender", label: "Re-render", sublabel: "Welcome message appears", type: "component", active: true },
            { id: "assert",   label: "findByText(/welcome/i)", sublabel: "waits and asserts", type: "selector", active: true },
          ],
          edges: [
            { from: "click",    to: "fetch",    label: "", active: true, color: "#58a6ff" },
            { from: "fetch",    to: "state",    label: "resolves", active: true, color: "#3fb950" },
            { from: "state",    to: "rerender", label: "", active: true, color: "#3fb950" },
            { from: "rerender", to: "assert",   label: "found!", active: true, color: "#3fb950" },
          ],
          code: "// findBy* = async query (waits up to 1s)\nconst welcome = await screen.findByText(/welcome/i);\n\n// waitFor = retry assertion\nawait waitFor(() => {\n  expect(screen.getByText(/welcome/i))\n    .toBeInTheDocument();\n});\n\n// queryBy = null if not found (no throw)\nexpect(screen.queryByText(/error/i)).not.toBeInTheDocument();\n\n// getBy = throws immediately if not found",
        },
        {
          phase: "resolve",
          narration: "Step 5 — Mock Service Worker intercepts fetch at network level. Same mock works in tests AND the browser.",
          nodes: [
            { id: "test",  label: "Test", type: "component", active: true },
            { id: "fetch", label: "fetch()", sublabel: "real fetch call", type: "action", active: true },
            { id: "sw",    label: "MSW Handler", sublabel: "intercepts at network", type: "store", active: true },
            { id: "resp",  label: "Mock Response", sublabel: "{ token: \"abc123\" }", type: "server", active: true },
          ],
          edges: [
            { from: "test",  to: "fetch", label: "calls", active: true, color: "#58a6ff" },
            { from: "fetch", to: "sw",    label: "intercepted", active: true, color: "#d2a8ff" },
            { from: "sw",    to: "resp",  label: "returns", active: true, color: "#3fb950" },
          ],
          code: "import { rest } from 'msw';\nimport { setupServer } from 'msw/node';\n\nconst server = setupServer(\n  rest.post('/api/login', (req, res, ctx) =>\n    res(ctx.json({ token: 'abc123' }))\n  ),\n);\n\nbeforeAll(() => server.listen());\nafterEach(() => server.resetHandlers());\nafterAll(() => server.close());\n\n// Override per-test for error case:\nserver.use(rest.post('/api/login', (req, res, ctx) =>\n  res(ctx.status(401))\n));",
        },
      ];

      window.ReactViz.panel(mount, {
        title: "React Testing Library",
        time:  "O(1) query",
        space: "O(DOM nodes)",
        steps: steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML =
            "<div style=\"font-size:10px;color:#768390;margin-bottom:6px;font-weight:600\">TEST PATTERN</div>" +
            window.ReactViz.codeBlock(step.code, "js");
        },
      });
    },
  }]);
})();
