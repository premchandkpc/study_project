(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-pipes",
    area: "angular",
    title: "Angular Pipes",
    tag: "Data Transform",
    tags: ["angular", "pipes", "pure", "impure", "async", "transform"],

    concept: `A **Pipe** transforms a value in a template without changing the underlying model. Think of it as a formatting function called inline in HTML.

**Syntax:**
\`\`\`html
{{ value | pipeName }}
{{ value | pipeName: arg1 : arg2 }}
{{ value | pipe1 | pipe2 }}   <!-- chaining -->
\`\`\`

**Built-in pipes:**
| Pipe | Example | Output |
|------|---------|--------|
| \`date\` | \`'2024-01-15' | date:'MMM d'\` | Jan 15 |
| \`currency\` | \`1999.99 | currency:'USD'\` | $1,999.99 |
| \`number\` | \`3.14159 | number:'1.2-2'\` | 3.14 |
| \`uppercase\` | \`'hello' | uppercase\` | HELLO |
| \`json\` | \`obj | json\` | {"a":1} |
| \`slice\` | \`arr | slice:0:3\` | first 3 items |
| \`async\` | \`obs$ | async\` | unwraps Observable/Promise |
| \`keyvalue\` | \`obj | keyvalue\` | [{key,value}] array |

**Pure vs Impure pipes:**

**Pure pipe** (default): Angular only re-evaluates when the input **reference** changes.
- Fast: result is memoized by input reference
- Won't re-run if you mutate an array/object in place

**Impure pipe**: Re-evaluated on EVERY change detection cycle.
- Use for: filtering/sorting arrays that mutate in place, \`async\` pipe
- Expensive — use sparingly

\`\`\`ts
@Pipe({ name: 'filter', pure: false })  // impure
\`\`\`

**Custom pipe:**
\`\`\`ts
@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 50, ellipsis = '...'): string {
    return value.length > limit ? value.slice(0, limit) + ellipsis : value;
  }
}
\`\`\`

**async pipe** is special:
- Subscribes to Observable/Promise and returns latest value
- Auto-unsubscribes on component destroy (prevents memory leaks)
- Calls \`markForCheck()\` automatically — works perfectly with OnPush`,

    why: "The async pipe alone is worth mastering — it eliminates manual subscribe/unsubscribe and is the safest way to render Observables in templates. Pure pipes also give you free memoization in the template layer.",

    example: {
      language: "typescript",
      code: `// Custom truncate pipe
@Pipe({ name: 'truncate', pure: true })
export class TruncatePipe implements PipeTransform {
  transform(value: string, limit = 50, trail = '...'): string {
    if (!value) return '';
    return value.length > limit ? value.slice(0, limit) + trail : value;
  }
}

// Template usage
// {{ article.body | truncate }}              → default 50 chars
// {{ article.body | truncate: 100 }}         → 100 chars
// {{ article.body | truncate: 100: ' [more]' }} → custom trail

// async pipe — safest way to render Observables
@Component({
  selector: 'app-users',
  template: \`
    <div *ngIf="users$ | async as users; else loading">
      <app-user-row *ngFor="let u of users" [user]="u"/>
    </div>
    <ng-template #loading>Loading...</ng-template>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,  // async pipe auto markForCheck
})
export class UsersComponent {
  users$ = this.userSvc.getAll();  // NO manual subscribe needed

  constructor(private userSvc: UserService) {}
  // NO ngOnDestroy needed — async pipe unsubscribes automatically
}

// WRONG — manual subscribe without cleanup leaks memory
this.users$.subscribe(u => this.users = u);  // ❌ leaks if component destroyed

// CORRECT — async pipe handles everything
// OR: use takeUntilDestroyed(this.destroyRef)  ✅`,
    },

    interview: [
      "What is the difference between a pure and impure pipe?",
      "Why doesn't a pure pipe re-run when you push to an array?",
      "What does the async pipe do that manual subscribe doesn't?",
      "When would you create a custom pipe vs a utility function?",
      "How does the async pipe work with OnPush change detection?",
      "Why is using an impure pipe for filtering expensive?",
    ],

    tradeoffs: {
      pros: [
        "Pipes keep templates clean — formatting logic out of components",
        "Pure pipes are memoized by input reference — free performance optimization",
        "async pipe eliminates subscribe/unsubscribe boilerplate and memory leak risk",
        "Pipes are reusable across the entire app with a single declaration",
      ],
      cons: [
        "Pure pipes miss in-place array/object mutations — easy source of 'why didn't my list update?' bugs",
        "Impure pipes run every CD cycle — a single impure pipe with heavy computation kills performance",
        "Pipes are hard to debug — no easy breakpoint inside template expressions",
        "Pipe execution order in chains isn't always obvious to new developers",
      ],
    },

    gotchas: [
      "Pure pipe won't re-run if you push() or mutate an array in place — must return a new array reference",
      "async pipe auto-unsubscribes — but only if the Observable completes or component destroys. Long-lived Observables are fine",
      "Chaining pipes: {{ val | date | uppercase }} — left-to-right, each output feeds the next",
      "The json pipe outputs null for circular references — use only for debugging",
      "keyvalue pipe sorts keys alphabetically by default — pass a compareFn to override",
      "date pipe uses the browser locale by default — must configure LOCALE_ID for server-side rendering",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", yellow: "#e3b341", red: "#f85149",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var demos = [
        { name: "date", input: "2024-06-15T10:30:00", format: "date:'MMM d, y'", output: "Jun 15, 2024", color: C.blue },
        { name: "currency", input: "1999.99", format: "currency:'USD'", output: "$1,999.99", color: C.green },
        { name: "number", input: "3.14159265", format: "number:'1.2-2'", output: "3.14", color: C.yellow },
        { name: "uppercase", input: "hello world", format: "uppercase", output: "HELLO WORLD", color: C.orange },
        { name: "slice", input: "[1,2,3,4,5]", format: "slice:1:4", output: "[2,3,4]", color: C.purple },
        { name: "async", input: "Observable<User>", format: "async", output: "User { id:1 }", color: C.red },
      ];

      var pureVsImpure = [
        {
          type: "Pure Pipe (default)",
          color: C.green,
          trigger: "Re-runs only when input REFERENCE changes",
          example: "{{ price | currency }} — price = 42 → $42.00\nChange price = 99 (new value) → $99.00 ✅\nprice.value = 99 (mutate) → still $42.00 ❌",
          icon: "⚡"
        },
        {
          type: "Impure Pipe",
          color: C.orange,
          trigger: "Re-runs on EVERY change detection cycle",
          example: "{{ items | filter:'active' }} — works with mutated arrays\nBut: runs 100s of times per second in busy app\nUse sparingly — async pipe is the only justified impure",
          icon: "♻️"
        }
      ];

      var state = { tab: 0 };

      function render() {
        mount.innerHTML = "<style>" +
          ".ngp-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".ngp-tabs{display:flex;gap:4px;margin-bottom:10px}" +
          ".ngp-tab{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.muted + ";background:transparent;text-transform:uppercase;letter-spacing:.5px}" +
          ".ngp-tab.active{background:" + C.blue + ";border-color:" + C.blue + ";color:#fff}" +
          ".ngp-title{color:" + C.text + ";font-size:11px;font-weight:700;margin-bottom:8px}" +
          ".ngp-pipe-row{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:9px}" +
          ".ngp-input{color:" + C.muted + ";flex:1;text-align:right;padding-right:4px;font-family:monospace}" +
          ".ngp-fmt{color:" + C.blue + ";padding:2px 5px;border:1px solid " + C.blue + ";border-radius:3px;white-space:nowrap;font-family:monospace}" +
          ".ngp-output{color:" + C.green + ";flex:1;padding-left:4px;font-weight:700;font-family:monospace}" +
          ".ngp-arrow{color:" + C.muted + "}" +
          ".ngp-pv{border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:9px}" +
          ".ngp-pv-type{font-weight:700;font-size:10px;margin-bottom:2px}" +
          ".ngp-pv-trigger{margin-bottom:4px;color:" + C.muted + "}" +
          ".ngp-pv-ex{white-space:pre-line;font-family:monospace;color:" + C.text + ";font-size:8px;line-height:1.5}" +
          "</style>" +
          "<div class='ngp-wrap'>" +
          "<div class='ngp-tabs'>" +
          ["Built-in Pipes", "Pure vs Impure"].map(function (t, i) {
            return "<button class='ngp-tab" + (i === state.tab ? " active" : "") + "' data-i='" + i + "'>" + t + "</button>";
          }).join("") +
          "</div>" +
          (state.tab === 0 ?
            "<div class='ngp-title'>value | pipe → transformed output</div>" +
            demos.map(function (d) {
              return "<div class='ngp-pipe-row'>" +
                "<div class='ngp-input'>" + d.input + "</div>" +
                "<div class='ngp-arrow'>|</div>" +
                "<div class='ngp-fmt' style='color:" + d.color + ";border-color:" + d.color + "'>" + d.format + "</div>" +
                "<div class='ngp-arrow'>→</div>" +
                "<div class='ngp-output' style='color:" + d.color + "'>" + d.output + "</div>" +
                "</div>";
            }).join("") :
            pureVsImpure.map(function (p) {
              return "<div class='ngp-pv' style='background:rgba(255,255,255,.03);border:1px solid " + p.color + "'>" +
                "<div class='ngp-pv-type' style='color:" + p.color + "'>" + p.icon + " " + p.type + "</div>" +
                "<div class='ngp-pv-trigger'>" + p.trigger + "</div>" +
                "<div class='ngp-pv-ex'>" + p.example + "</div>" +
                "</div>";
            }).join("")
          ) +
          "</div>";

        mount.querySelectorAll(".ngp-tab").forEach(function (btn) {
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
