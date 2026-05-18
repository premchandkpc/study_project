/**
 * react-forms.js
 * Topic: React Forms — controlled vs uncontrolled, validation, react-hook-form
 */
(function () {
  "use strict";

  window.REACT_TOPICS = (window.REACT_TOPICS || []).concat([{
    id:    "react-forms",
    area:  "react",
    title: "React Forms",
    tag:   "Patterns",
    tags:  ["react","forms","controlled","uncontrolled","validation","react-hook-form"],

    concept: `Controlled: React owns the form state. Every keystroke → setState → re-render → input reflects state.
Uncontrolled: DOM owns the state. Access value via ref.current.value on submit only.
Controlled = single source of truth; validation on every keystroke; easy to derive UI from state.
Uncontrolled = less re-renders; simple forms; integrating with non-React libs.
react-hook-form: uses uncontrolled inputs internally but gives controlled-like API. Minimal re-renders.`,

    why: `Controlled forms re-render on every keystroke — for 20-field forms with validation this can be slow.
react-hook-form re-renders only on submit/error — same API, 10× fewer renders.
Understanding when to use each prevents both over-engineering and performance problems.`,

    example: {
      language: "javascript",
      code: `// CONTROLLED: React owns state
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function validate(email, password) {
    if (!email.includes('@')) return 'Invalid email';
    if (password.length < 8) return 'Min 8 chars';
    return '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate(email, password);
    if (err) { setError(err); return; }
    login(email, password);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email}
             onChange={e => setEmail(e.target.value)} />
      <input value={password} type="password"
             onChange={e => setPassword(e.target.value)} />
      {error && <p>{error}</p>}
      <button type="submit">Login</button>
    </form>
  );
}

// UNCONTROLLED: DOM owns state
function SimpleForm() {
  const emailRef = useRef(null);
  function handleSubmit(e) {
    e.preventDefault();
    console.log(emailRef.current.value); // read on submit
  }
  return <form onSubmit={handleSubmit}>
    <input ref={emailRef} defaultValue="" />
  </form>;
}

// react-hook-form: minimal re-renders
function RHFForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  return (
    <form onSubmit={handleSubmit(data => login(data))}>
      <input {...register('email', {
        required: 'Email required',
        pattern: { value: /^[^@\u0009\u000A\u000B\u000C\u000D ]+@[^@\u0009\u000A\u000B\u000C\u000D ]+$/, message: 'Invalid email' }
      })} />
      {errors.email && <p>{errors.email.message}</p>}
    </form>
  );
}`,
    },

    interview: [
      "Controlled vs uncontrolled — when to use each?",
      "Why does every onChange cause a re-render in controlled forms?",
      "How does react-hook-form reduce re-renders?",
      "How do you handle async validation in React forms?",
      "How do you reset a form after submit?",
      "What is defaultValue vs value in React inputs?",
    ],

    tradeoffs: {
      pros: {
        Controlled: ["Single source of truth", "Real-time validation", "Easy to pre-fill/reset"],
        Uncontrolled: ["Fewer re-renders", "Simple read-on-submit", "Easier native lib integration"],
        "react-hook-form": ["Minimal re-renders", "Built-in validation", "TypeScript support"],
      },
      cons: {
        Controlled: ["Re-render on every keystroke", "Boilerplate for many fields"],
        Uncontrolled: ["No real-time validation", "Imperative code with refs"],
        "react-hook-form": ["Extra dependency", "Learning curve for complex schemas"],
      },
    },

    gotchas: [
      "Switching input from controlled to uncontrolled (undefined value → string) throws React warning.",
      "value without onChange = read-only input. Use defaultValue for uncontrolled.",
      "react-hook-form register() must not be in conditional — hook rules apply.",
      "Form reset: call reset() from useForm, not just clearing state.",
      "File inputs are always uncontrolled — value cannot be set programmatically.",
    ],

    visual: function (mount) {
      const steps = [
        {
          phase: "render",
          narration: "Controlled form: every keystroke → setState → React re-renders the form component.",
          nodes: [
            { id: "key",    label: "Keystroke \"a\"", sublabel: "onChange fires", type: "action", active: true },
            { id: "set",    label: "setEmail(\"a\")", sublabel: "state update", type: "action", active: true },
            { id: "render", label: "Form re-renders", sublabel: "email=\"a\"", type: "component", active: true },
            { id: "input",  label: "<input value=\"a\">", sublabel: "reflects state", type: "client", active: true },
            { id: "valid",  label: "Validate()", sublabel: "runs on render", type: "selector", active: true },
          ],
          edges: [
            { from: "key",    to: "set",    label: "triggers", active: true, color: "#58a6ff" },
            { from: "set",    to: "render", label: "", active: true, color: "#58a6ff" },
            { from: "render", to: "input",  label: "value=", active: true, color: "#3fb950" },
            { from: "render", to: "valid",  label: "validate", active: true, color: "#d2a8ff" },
          ],
          code: "// Controlled: React is SSOT\nconst [email, setEmail] = useState('');\n\n// Every keystroke:\n// 1. onChange fires → setEmail('a')\n// 2. React re-renders\n// 3. <input value=\"a\"> reflects state\n// 4. Can validate on every render\n// 5. Error message shows immediately",
        },
        {
          phase: "idle",
          narration: "Uncontrolled form: DOM owns state. React only reads value on submit via ref.",
          nodes: [
            { id: "key",    label: "Keystroke \"a\"", sublabel: "no React involved", type: "action", active: true },
            { id: "dom",    label: "DOM <input>", sublabel: "value=\"a\" internally", type: "client", active: true },
            { id: "submit", label: "Form submit", sublabel: "user clicks Submit", type: "action", dim: true },
            { id: "ref",    label: "emailRef.current.value", sublabel: "read once", type: "hook", dim: true },
          ],
          edges: [
            { from: "key",    to: "dom",    label: "native", active: true, color: "#768390" },
            { from: "submit", to: "ref",    label: "read", active: false },
          ],
          code: "// Uncontrolled: DOM is SSOT\nconst emailRef = useRef(null);\n\n// Keystrokes: no React re-renders at all!\n// DOM handles input natively\n\n// Only on submit:\nfunction handleSubmit(e) {\n  e.preventDefault();\n  const email = emailRef.current.value; // read once\n  validate(email); // validate only on submit\n  submitForm(email);\n}\n\n<input ref={emailRef} defaultValue=\"\" />",
        },
        {
          phase: "render",
          narration: "react-hook-form: register() connects inputs to form state. Validates on blur/submit, not every keystroke.",
          nodes: [
            { id: "key",     label: "Keystroke \"a\"", sublabel: "no re-render!", type: "action", active: true },
            { id: "rhf",     label: "react-hook-form", sublabel: "internal ref tracking", type: "store", active: true },
            { id: "blur",    label: "onBlur", sublabel: "validate triggered", type: "action", dim: true },
            { id: "error",   label: "Error state", sublabel: "only renders on error", type: "component", dim: true },
            { id: "submit",  label: "handleSubmit", sublabel: "all validations run", type: "action", dim: true },
          ],
          edges: [
            { from: "key",    to: "rhf",    label: "tracks (no re-render)", active: true, color: "#3fb950" },
            { from: "blur",   to: "error",  label: "validate", active: false },
            { from: "submit", to: "error",  label: "all fields", active: false },
          ],
          code: "const { register, handleSubmit,\n        formState: { errors } } = useForm({\n  mode: 'onBlur', // validate on blur\n});\n\n// register() returns: ref + onChange + onBlur\n<input {...register('email', {\n  required: 'Email is required',\n  pattern: {\n    value: /^\\S+@\\S+$/,\n    message: 'Invalid email format',\n  },\n})} />\n// Keystrokes: ZERO re-renders\n// Blur: validates, shows error if invalid\n// Submit: validates all fields",
        },
        {
          phase: "update",
          narration: "Re-render count comparison: 10 keystrokes in email field. Controlled = 10 renders. react-hook-form = 0.",
          nodes: [
            { id: "ctrl10",  label: "Controlled", sublabel: "10 keystrokes = 10 re-renders", type: "reducer", active: true },
            { id: "unc10",   label: "Uncontrolled", sublabel: "10 keystrokes = 0 re-renders", type: "component", active: true },
            { id: "rhf10",   label: "react-hook-form", sublabel: "10 keystrokes = 0 re-renders", type: "action", active: true },
            { id: "ctrl_s",  label: "Controlled submit", sublabel: "+1 render", type: "reducer" },
            { id: "unc_s",   label: "Uncontrolled submit", sublabel: "+0 renders", type: "component" },
            { id: "rhf_s",   label: "RHF submit", sublabel: "+1 render (if errors)", type: "action" },
          ],
          edges: [
            { from: "ctrl10", to: "ctrl_s", active: false },
            { from: "unc10",  to: "unc_s",  active: false },
            { from: "rhf10",  to: "rhf_s",  active: false },
          ],
          code: "// Performance comparison (20-field form):\n// \n// Controlled:\n//   200 keystrokes = 200 re-renders\n//   Each render: validate all 20 fields\n//   Can be 2000+ function calls per session\n//\n// react-hook-form:\n//   200 keystrokes = 0 re-renders\n//   Validate only on blur/submit\n//   Same UX, fraction of the work\n//\n// Rule: use RHF for 5+ fields or perf-sensitive forms",
        },
      ];

      window.ReactViz.panel(mount, {
        title: "React Forms: Controlled vs Uncontrolled",
        time:  "O(1) per keystroke (RHF)",
        space: "O(fields) form state",
        steps,
        renderStep: function (vizEl, codeEl, step) {
          window.ReactViz.FlowDiagram.render(vizEl, step.nodes, step.edges, { layout: "vertical" });
          codeEl.innerHTML = `
            <div style="font-size:10px;color:#768390;margin-bottom:6px;font-weight:600">FORM PATTERN</div>
            ${window.ReactViz.codeBlock(step.code, "js")}`;
        },
      });
    },
  }]);
})();
