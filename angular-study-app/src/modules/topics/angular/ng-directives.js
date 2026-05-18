(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-directives",
    area: "angular",
    title: "Angular Directives",
    tag: "Core",
    tags: ["angular", "directives", "structural", "attribute", "ngif", "ngfor", "custom"],

    concept: `**Directives** extend HTML with Angular-specific behavior. Three types:

**1. Components** — directives WITH a template (the most common type)

**2. Structural Directives** — add/remove/repeat DOM elements. Prefixed with \`*\`.
\`\`\`html
*ngIf="condition"       → adds/removes element
*ngFor="let x of arr"  → repeats element per item
*ngSwitch              → multi-branch conditional
\`\`\`
Desugared syntax: \`*ngIf\` becomes \`<ng-template [ngIf]="cond">\`

**3. Attribute Directives** — change appearance/behavior of existing element, no DOM restructuring.
\`\`\`html
[ngClass]="{ active: isActive }"      → conditional CSS classes
[ngStyle]="{ color: item.color }"     → inline styles
[disabled]="!form.valid"              → DOM property binding
\`\`\`

**Custom Attribute Directive:**
\`\`\`ts
@Directive({ selector: '[appHighlight]' })
export class HighlightDirective {
  @Input() appHighlight = 'yellow';

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter')
  onEnter() {
    this.renderer.setStyle(this.el.nativeElement, 'background', this.appHighlight);
  }

  @HostListener('mouseleave')
  onLeave() {
    this.renderer.removeStyle(this.el.nativeElement, 'background');
  }
}
// Usage: <p appHighlight="lightblue">Hover me</p>
\`\`\`

**Custom Structural Directive:**
\`\`\`ts
@Directive({ selector: '[appUnless]' })
export class UnlessDirective {
  @Input() set appUnless(condition: boolean) {
    if (!condition) {
      this.vcr.createEmbeddedView(this.template);
    } else {
      this.vcr.clear();
    }
  }
  constructor(private template: TemplateRef<any>, private vcr: ViewContainerRef) {}
}
// Usage: <div *appUnless="isLoggedIn">Please log in</div>
\`\`\`

**ElementRef vs Renderer2:**
- \`ElementRef.nativeElement\` — direct DOM access (unsafe in SSR/WebWorkers)
- \`Renderer2\` — Angular's safe abstraction for DOM manipulation (works in all environments)`,

    why: "Directives are Angular's way of extending HTML — they let you encapsulate reusable DOM behavior (tooltips, drag-drop, permission guards, highlight effects) without creating full components. Understanding TemplateRef + ViewContainerRef unlocks building complex structural directives.",

    example: {
      language: "typescript",
      code: `// Permission-based structural directive
@Directive({ selector: '[appHasRole]' })
export class HasRoleDirective implements OnInit {
  @Input() appHasRole!: string | string[];

  private hasView = false;

  constructor(
    private template: TemplateRef<any>,
    private vcr: ViewContainerRef,
    private authSvc: AuthService,
  ) {}

  ngOnInit() {
    const roles = Array.isArray(this.appHasRole) ? this.appHasRole : [this.appHasRole];
    const allowed = roles.some(r => this.authSvc.hasRole(r));

    if (allowed && !this.hasView) {
      this.vcr.createEmbeddedView(this.template);
      this.hasView = true;
    } else if (!allowed && this.hasView) {
      this.vcr.clear();
      this.hasView = false;
    }
  }
}
// Usage: <button *appHasRole="'admin'">Delete</button>
// Usage: <div *appHasRole="['admin', 'manager']">Manage</div>

// Auto-focus attribute directive
@Directive({ selector: '[appAutoFocus]' })
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngAfterViewInit() {
    this.renderer.selectRootElement(this.el.nativeElement).focus();
  }
}
// Usage: <input appAutoFocus placeholder="Search..." />

// WRONG — manipulate DOM directly via nativeElement (breaks SSR)
this.el.nativeElement.style.color = 'red';  // ❌ not SSR-safe

// CORRECT — use Renderer2
this.renderer.setStyle(this.el.nativeElement, 'color', 'red');  // ✅`,
    },

    interview: [
      "What are the three types of directives in Angular?",
      "How does *ngIf differ from [hidden]?",
      "What is the desugared form of *ngIf?",
      "What is TemplateRef and ViewContainerRef used for?",
      "Why use Renderer2 instead of directly accessing nativeElement?",
      "Can you put two structural directives on the same element?",
      "How do you pass inputs to a custom structural directive?",
    ],

    tradeoffs: {
      pros: [
        "Structural directives cleanly encapsulate conditional/repeating DOM logic",
        "Attribute directives add reusable DOM behavior without components",
        "Renderer2 abstraction makes directives safe in SSR and WebWorker contexts",
        "@HostListener is cleaner than manual addEventListener — auto-cleaned on destroy",
      ],
      cons: [
        "Can't put two structural directives on same element — must wrap with <ng-container>",
        "Custom structural directives require understanding TemplateRef/ViewContainerRef — non-trivial",
        "Directives are harder to test than services — need TestBed and fixture",
        "nativeElement access bypasses Angular's rendering — risky for SSR apps",
      ],
    },

    gotchas: [
      "Two structural directives on same element won't compile: <div *ngIf *ngFor> — use <ng-container *ngIf> wrapper",
      "*ngFor without trackBy re-creates all DOM nodes on any array change — always add trackBy for large lists",
      "Renderer2.setStyle(el, 'color', 'red') — third arg is value string, NOT the final declaration",
      "ElementRef gives you the HOST element — if directive is on <app-foo>, el.nativeElement is the component host",
      "@HostListener on document/window: use @HostListener('document:keydown') syntax",
      "Custom structural directive selector must match the input name: selector='[appUnless]' + @Input() appUnless",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", yellow: "#e3b341", red: "#f85149",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var tabs = [
        {
          label: "Structural *ngIf",
          render: function () {
            var states = [
              { cond: true, bg: C.green, label: "condition = true", dom: "Element IS in DOM" },
              { cond: false, bg: C.red, label: "condition = false", dom: "Element REMOVED from DOM" },
            ];
            return "<div style='display:flex;gap:8px;flex-wrap:wrap'>" +
              states.map(function (s) {
                return "<div style='flex:1;min-width:130px;background:rgba(255,255,255,.03);border:1px solid " + s.bg + ";border-radius:6px;padding:8px'>" +
                  "<div style='color:" + s.bg + ";font-size:9px;font-weight:700;margin-bottom:4px'>" + s.label + "</div>" +
                  "<div style='font-size:8.5px;color:" + C.muted + ";margin-bottom:6px;font-family:monospace'>*ngIf=\"" + s.cond + "\"</div>" +
                  "<div style='border:1px " + (s.cond ? "solid " + C.green : "dashed " + C.muted) + ";border-radius:4px;padding:5px;text-align:center;font-size:8.5px;color:" + (s.cond ? C.text : C.muted) + "'>" +
                  (s.cond ? "🟢 &lt;div&gt;Visible&lt;/div&gt;" : "⬜ (ng-template)") +
                  "</div>" +
                  "<div style='font-size:7.5px;color:" + s.bg + ";margin-top:4px'>" + s.dom + "</div>" +
                  "</div>";
              }).join("") +
              "</div>" +
              "<div style='margin-top:8px;font-size:8.5px;color:" + C.muted + ";padding:6px;background:rgba(255,255,255,.03);border-radius:4px'>" +
              "vs [hidden]: [hidden]=\"true\" keeps element in DOM but sets display:none<br>" +
              "*ngIf removes it entirely — no lifecycle, no events, no performance cost" +
              "</div>";
          }
        },
        {
          label: "Attribute Directives",
          render: function () {
            var items = [
              { name: "[ngClass]", example: "[ngClass]=\"{ active: isOn }\"", desc: "Adds/removes CSS classes conditionally", color: C.blue },
              { name: "[ngStyle]", example: "[ngStyle]=\"{ color: item.color }\"", desc: "Sets inline styles from expressions", color: C.yellow },
              { name: "appHighlight", example: "appHighlight=\"#ff0\"", desc: "Custom: adds hover background via HostListener", color: C.purple },
              { name: "appAutoFocus", example: "appAutoFocus", desc: "Custom: focuses element after view init", color: C.orange },
            ];
            return "<div style='display:flex;flex-direction:column;gap:5px'>" +
              items.map(function (it) {
                return "<div style='display:flex;align-items:flex-start;gap:8px;background:rgba(255,255,255,.03);border-radius:5px;padding:6px 8px'>" +
                  "<div style='color:" + it.color + ";font-family:monospace;font-size:9px;font-weight:700;min-width:90px;white-space:nowrap'>" + it.name + "</div>" +
                  "<div>" +
                  "<div style='font-family:monospace;font-size:8px;color:" + C.muted + "'>" + it.example + "</div>" +
                  "<div style='font-size:8px;color:" + C.text + ";margin-top:1px'>" + it.desc + "</div>" +
                  "</div>" +
                  "</div>";
              }).join("") + "</div>";
          }
        },
        {
          label: "Custom Structural",
          render: function () {
            return "<div style='font-size:8.5px;line-height:1.5'>" +
              "<div style='color:" + C.text + ";font-weight:700;margin-bottom:6px'>How *appHasRole works:</div>" +
              [
                ["1. Directive reads", "@Input() appHasRole = 'admin'", C.blue],
                ["2. Check auth service", "authSvc.hasRole('admin') → true/false", C.yellow],
                ["3. Show template", "vcr.createEmbeddedView(this.template)", C.green],
                ["4. Hide template", "vcr.clear()", C.red],
              ].map(function (row) {
                return "<div style='display:flex;align-items:baseline;gap:6px;margin-bottom:4px'>" +
                  "<div style='color:" + C.muted + ";min-width:80px'>" + row[0] + "</div>" +
                  "<div style='color:" + row[2] + ";font-family:monospace'>" + row[1] + "</div>" +
                  "</div>";
              }).join("") +
              "<div style='margin-top:8px;padding:6px;background:rgba(255,255,255,.03);border-radius:4px;color:" + C.muted + ";font-size:8px'>" +
              "TemplateRef = the HTML inside &lt;ng-template&gt;<br>" +
              "ViewContainerRef = the DOM location where template gets stamped" +
              "</div>" +
              "</div>";
          }
        }
      ];

      var state = { tab: 0 };

      function render() {
        var t = tabs[state.tab];
        mount.innerHTML = "<style>" +
          ".ngd-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".ngd-tabs{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}" +
          ".ngd-tab{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.muted + ";background:transparent;text-transform:uppercase;letter-spacing:.5px}" +
          ".ngd-tab.active{background:" + C.blue + ";border-color:" + C.blue + ";color:#fff}" +
          ".ngd-panel{background:" + C.surface + ";border-radius:8px;padding:10px;min-height:90px}" +
          "</style>" +
          "<div class='ngd-wrap'>" +
          "<div class='ngd-tabs'>" +
          tabs.map(function (tb, i) {
            return "<button class='ngd-tab" + (i === state.tab ? " active" : "") + "' data-i='" + i + "'>" + tb.label + "</button>";
          }).join("") +
          "</div>" +
          "<div class='ngd-panel'>" + t.render() + "</div>" +
          "</div>";

        mount.querySelectorAll(".ngd-tab").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.tab = parseInt(btn.dataset.i);
            render();
          });
        });
      }
      render();
    },
  }]);
})();
