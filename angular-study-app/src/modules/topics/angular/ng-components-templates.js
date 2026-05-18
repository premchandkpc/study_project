(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-components-templates",
    area: "angular",
    title: "Angular Components & Templates",
    tag: "Core",
    tags: ["angular", "components", "templates", "inputs", "outputs", "viewchild", "content-projection"],

    concept: `A **Component** is the fundamental building block of Angular. It pairs a TypeScript class (logic) with an HTML template (view) and optional scoped CSS.

**Component anatomy:**
\`\`\`ts
@Component({
  selector: 'app-card',     // CSS selector used in parent template
  templateUrl: '...',       // HTML template
  styleUrls: ['...'],       // scoped CSS
  changeDetection: ...,     // CD strategy
})
export class CardComponent { ... }
\`\`\`

**@Input() — data flows DOWN (parent → child)**
Parent passes data as HTML attributes. Child declares \`@Input()\` properties.

**@Output() + EventEmitter — events flow UP (child → parent)**
Child emits events; parent listens with \`(event)="handler($event)"\`.

**Template syntax essentials:**
| Syntax | Purpose |
|--------|---------|
| \`{{ expr }}\` | Interpolation — bind text |
| \`[prop]="expr"\` | Property binding — bind DOM prop |
| \`(event)="fn()"\` | Event binding — listen to DOM events |
| \`[(ngModel)]="x"\` | Two-way binding (banana-in-a-box) |
| \`*ngIf="cond"\` | Structural directive — add/remove element |
| \`*ngFor="let i of arr"\` | Iterate — renders list |
| \`#ref\` | Template reference variable |

**@ViewChild / @ViewChildren**
Access child component instances or DOM elements from parent class.
Available only after \`ngAfterViewInit\` — returns undefined in ngOnInit.

**Content projection (ng-content)**
Let parent inject HTML into child's template slot — like React children:
\`\`\`html
<!-- child template -->
<div class="card"><ng-content></ng-content></div>
<!-- parent usage -->
<app-card><p>Projected content</p></app-card>
\`\`\`

**View Encapsulation modes:**
- \`Emulated\` (default) — Angular adds scoped attribute selectors, CSS stays local
- \`None\` — styles go global
- \`ShadowDom\` — native Shadow DOM isolation`,

    why: "Components + templates ARE Angular. Every feature is a tree of components passing data down via @Input and events up via @Output. Understanding this parent↔child contract eliminates 80% of Angular bugs.",

    example: {
      language: "typescript",
      code: `// PARENT component
@Component({
  selector: 'app-product-list',
  template: \`
    <app-product-card
      *ngFor="let p of products; trackBy: trackById"
      [product]="p"
      [featured]="p.id === featuredId"
      (addToCart)="onAddToCart($event)"
    />
    <p>Cart: {{ cartCount }} items</p>
  \`,
})
export class ProductListComponent {
  products = [{ id: 1, name: 'Laptop', price: 999 }];
  featuredId = 1;
  cartCount = 0;

  trackById(_: number, p: Product) { return p.id; }

  onAddToCart(productId: number) { this.cartCount++; }
}

// CHILD component
@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div [class.featured]="featured">
      <h3>{{ product.name }}</h3>
      <span>{{ product.price | currency }}</span>
      <button (click)="add()">Add to Cart</button>
    </div>
  \`,
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() featured = false;
  @Output() addToCart = new EventEmitter<number>();

  add() { this.addToCart.emit(this.product.id); }
}

// WRONG — emitting the whole object the parent will mutate
this.addToCart.emit(this.product);  // parent mutates → breaks OnPush ❌

// CORRECT — emit primitive ID, parent controls state
this.addToCart.emit(this.product.id);  // ✅`,
    },

    interview: [
      "What is the difference between property binding [x] and interpolation {{ x }}?",
      "How does data flow between parent and child components?",
      "What is the banana-in-a-box syntax [(ngModel)] and how does it desugar?",
      "When is @ViewChild available — why can't you use it in ngOnInit?",
      "What is ng-content and how is it different from @Input?",
      "Explain View Encapsulation modes — when would you use None?",
      "What's the difference between *ngIf and [hidden]?",
    ],

    tradeoffs: {
      pros: [
        "@Input/@Output creates an explicit, testable API surface for every component",
        "View Encapsulation prevents CSS bleed across component boundaries",
        "ng-content enables composable slot-based layouts without tight coupling",
        "Template syntax is declarative — DOM updates are handled by Angular runtime",
      ],
      cons: [
        "Deep component trees require prop-drilling or a state store (NgRx/Signals)",
        "Two-way [(ngModel)] requires FormsModule — easy to forget",
        "@ViewChild behind *ngIf returns undefined until condition is true",
        "Structural directives can't stack two on same element — wrap with ng-container",
      ],
    },

    gotchas: [
      "@ViewChild is only available AFTER ngAfterViewInit — reading it in ngOnInit returns undefined",
      "[(ngModel)] requires FormsModule in the module — ReactiveFormsModule alone is NOT enough",
      "*ngIf removes element from DOM entirely — use [hidden] to keep it but hide visually",
      "Structural directives (*ngIf, *ngFor) are syntax sugar for <ng-template> — can't stack two on same element",
      "trackBy in *ngFor is critical for performance — without it Angular re-creates all DOM nodes on array change",
      "EventEmitter extends RxJS Subject — subscribing directly from a parent is possible but breaks the @Output contract",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", yellow: "#e3b341",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var steps = [
        {
          label: "@Input: Data Down",
          desc: "Parent passes expression to child via [property] binding. New reference triggers OnPush check.",
          render: function () {
            return "<div style='display:flex;align-items:center;gap:12px;justify-content:center;padding:8px 0'>" +
              box("ProductList\n(Parent)", C.orange, "[product]=\"p\"\n[featured]=\"true\"") +
              arrowRight(C.orange, "data flows\ndown") +
              box("ProductCard\n(Child)", C.green, "@Input() product\n@Input() featured") +
              "</div>";
          }
        },
        {
          label: "@Output: Events Up",
          desc: "Child calls EventEmitter.emit(). Parent binds with (addToCart)='handler($event)'.",
          render: function () {
            return "<div style='display:flex;align-items:center;gap:12px;justify-content:center;padding:8px 0'>" +
              box("ProductCard\n(Child)", C.green, "@Output() addToCart\n.emit(product.id)") +
              arrowUp(C.purple, "events flow\nup") +
              box("ProductList\n(Parent)", C.orange, "(addToCart)=\n\"onAdd($event)\"") +
              "</div>";
          }
        },
        {
          label: "Binding Syntax",
          desc: "Four binding types cover all data-flow directions in templates.",
          render: function () {
            var rows = [
              ["{{ expr }}", "Interpolation", "Class → DOM text", C.yellow],
              ["[prop]=\"expr\"", "Property binding", "Class → DOM property", C.blue],
              ["(event)=\"fn()\"", "Event binding", "DOM event → Class", C.orange],
              ["[(ngModel)]=\"x\"", "Two-way", "Class ↔ DOM (form input)", C.purple],
            ];
            return "<table style='border-collapse:collapse;width:100%;font-size:10px'>" +
              rows.map(function (r) {
                return "<tr style='border-bottom:1px solid " + C.border + "'>" +
                  "<td style='padding:5px 8px;color:" + r[3] + ";font-family:monospace;white-space:nowrap'>" + r[0] + "</td>" +
                  "<td style='padding:5px 8px;color:" + C.text + "'>" + r[1] + "</td>" +
                  "<td style='padding:5px 8px;color:" + C.muted + "'>" + r[2] + "</td>" +
                  "</tr>";
              }).join("") + "</table>";
          }
        },
        {
          label: "ng-content Projection",
          desc: "Parent injects HTML into child slot. Child template is a wrapper with holes.",
          render: function () {
            return "<div style='display:flex;align-items:flex-start;gap:10px;justify-content:center'>" +
              "<div style='background:" + C.surface + ";border:1px solid " + C.border + ";border-radius:6px;padding:8px;font-size:9px;min-width:130px'>" +
              "<div style='color:" + C.muted + ";margin-bottom:4px'>app-card template</div>" +
              "<div style='border:1px dashed " + C.orange + ";border-radius:4px;padding:6px;color:" + C.orange + ";text-align:center'>&lt;ng-content&gt;</div>" +
              "</div>" +
              "<div style='color:" + C.muted + ";align-self:center;font-size:9px'>parent uses:</div>" +
              "<div style='background:" + C.surface + ";border:1px solid " + C.border + ";border-radius:6px;padding:8px;font-size:9px;min-width:130px'>" +
              "<div style='color:" + C.muted + ";margin-bottom:2px'>&lt;app-card&gt;</div>" +
              "<div style='border:1px solid " + C.green + ";border-radius:4px;padding:4px;color:" + C.green + "'>&lt;p&gt;Projected&lt;/p&gt;</div>" +
              "<div style='color:" + C.muted + "'>&lt;/app-card&gt;</div>" +
              "</div>" +
              "</div>";
          }
        },
      ];

      function box(label, color, sub) {
        return "<div style='background:rgba(255,255,255,.04);border:1px solid " + color + ";border-radius:6px;padding:8px 10px;text-align:center;min-width:110px'>" +
          "<div style='color:" + color + ";font-size:9px;font-weight:700;white-space:pre-line;line-height:1.4'>" + label + "</div>" +
          "<div style='color:" + C.muted + ";font-size:8px;margin-top:3px;white-space:pre-line;line-height:1.3;font-family:monospace'>" + sub + "</div>" +
          "</div>";
      }
      function arrowRight(color, label) {
        return "<div style='display:flex;flex-direction:column;align-items:center;gap:2px'>" +
          "<div style='color:" + color + ";font-size:18px'>→</div>" +
          "<div style='color:" + C.muted + ";font-size:7px;text-align:center;white-space:pre-line'>" + label + "</div>" +
          "</div>";
      }
      function arrowUp(color, label) {
        return "<div style='display:flex;flex-direction:column;align-items:center;gap:2px'>" +
          "<div style='color:" + color + ";font-size:18px'>↑</div>" +
          "<div style='color:" + C.muted + ";font-size:7px;text-align:center;white-space:pre-line'>" + label + "</div>" +
          "</div>";
      }

      var state = { step: 0 };

      function render() {
        var s = steps[state.step];
        mount.innerHTML = "<style>" +
          ".ngct-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".ngct-tabs{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}" +
          ".ngct-tab{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.muted + ";background:transparent;text-transform:uppercase;letter-spacing:.5px}" +
          ".ngct-tab.active{background:" + C.blue + ";border-color:" + C.blue + ";color:#fff}" +
          ".ngct-panel{background:" + C.surface + ";border-radius:8px;padding:12px;min-height:90px}" +
          ".ngct-title{color:" + C.text + ";font-size:11px;font-weight:700;margin-bottom:4px}" +
          ".ngct-desc{color:" + C.muted + ";font-size:9px;margin-bottom:10px;line-height:1.4}" +
          "</style>" +
          "<div class='ngct-wrap'>" +
          "<div class='ngct-tabs'>" +
          steps.map(function (st, i) {
            return "<button class='ngct-tab" + (i === state.step ? " active" : "") + "' data-i='" + i + "'>" + st.label + "</button>";
          }).join("") +
          "</div>" +
          "<div class='ngct-panel'>" +
          "<div class='ngct-title'>" + s.label + "</div>" +
          "<div class='ngct-desc'>" + s.desc + "</div>" +
          s.render() +
          "</div>" +
          "</div>";

        mount.querySelectorAll(".ngct-tab").forEach(function (btn) {
          btn.addEventListener("click", function () {
            state.step = parseInt(btn.dataset.i);
            render();
          });
        });
      }
      render();
    },
  }]);
})();
