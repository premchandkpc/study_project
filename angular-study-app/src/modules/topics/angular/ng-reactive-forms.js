(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-reactive-forms",
    area: "angular",
    title: "Angular Reactive Forms",
    tag: "Forms",
    tags: ["angular", "reactive-forms", "formgroup", "formcontrol", "validators", "formbuilder"],

    concept: `Angular has two form approaches. **Reactive Forms** define form structure in the component class — NOT in the template. More powerful and testable.

**Core classes:**
| Class | Role |
|-------|------|
| \`FormControl\` | Single field: value + validation state |
| \`FormGroup\` | Named group of controls |
| \`FormArray\` | Dynamic list of controls |
| \`FormBuilder\` | Factory shorthand for creating groups |

**Building a form:**
\`\`\`ts
// Without FormBuilder
this.form = new FormGroup({
  email: new FormControl('', [Validators.required, Validators.email]),
  password: new FormControl('', [Validators.required, Validators.minLength(8)]),
});

// With FormBuilder (recommended — same result, less boilerplate)
this.form = this.fb.group({
  email: ['', [Validators.required, Validators.email]],
  password: ['', [Validators.required, Validators.minLength(8)]],
});
\`\`\`

**Binding to template:**
\`\`\`html
<form [formGroup]="form" (ngSubmit)="onSubmit()">
  <input formControlName="email" />
  <div *ngIf="form.get('email')?.invalid && form.get('email')?.touched">
    Email is required
  </div>
  <button [disabled]="form.invalid">Submit</button>
</form>
\`\`\`

**Validation state:**
- \`valid / invalid\` — passes/fails validators
- \`touched / untouched\` — user has/hasn't focused the field
- \`dirty / pristine\` — value has/hasn't changed
- \`errors\` — object of error keys: \`{ required: true, minlength: { ... } }\`

**Dynamic forms with FormArray:**
\`\`\`ts
get items(): FormArray { return this.form.get('items') as FormArray; }

addItem() { this.items.push(this.fb.control('')); }
removeItem(i: number) { this.items.removeAt(i); }
\`\`\`

**Value changes stream:**
\`\`\`ts
this.form.get('email')!.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
).subscribe(val => this.checkAvailability(val));
\`\`\`

**Custom validator:**
\`\`\`ts
function noSpacesValidator(control: AbstractControl): ValidationErrors | null {
  return /\\s/.test(control.value) ? { noSpaces: true } : null;
}
\`\`\``,

    why: "Reactive Forms keep form state in the class (TypeScript), not the template — making it testable, observable, and composable with RxJS. valueChanges is one of the most powerful patterns: real-time search, dependent field validation, autosave.",

    example: {
      language: "typescript",
      code: `@Component({
  selector: 'app-signup',
  template: \`
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" placeholder="Email" />
      <span *ngIf="emailCtrl.hasError('email') && emailCtrl.touched">Invalid email</span>
      <span *ngIf="emailCtrl.hasError('required') && emailCtrl.touched">Required</span>

      <input formControlName="username" placeholder="Username" />
      <span *ngIf="form.hasError('usernameTaken')">Username already taken</span>

      <input type="password" formControlName="password" />

      <!-- FormArray — dynamic phone numbers -->
      <div formArrayName="phones">
        <div *ngFor="let p of phones.controls; index as i">
          <input [formControlName]="i" placeholder="Phone {{ i + 1 }}" />
          <button type="button" (click)="removePhone(i)">✕</button>
        </div>
      </div>
      <button type="button" (click)="addPhone()">+ Add Phone</button>

      <button [disabled]="form.invalid || form.pending">Submit</button>
    </form>
  \`,
})
export class SignupComponent implements OnInit {
  form!: FormGroup;

  constructor(private fb: FormBuilder, private userSvc: UserService) {}

  ngOnInit() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required, this.checkUsername.bind(this)],  // async validator
      password: ['', [Validators.required, Validators.minLength(8)]],
      phones: this.fb.array([this.fb.control('')]),
    });

    // Real-time dependent validation
    this.form.get('email')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
    ).subscribe(() => this.form.get('username')!.updateValueAndValidity());
  }

  get emailCtrl() { return this.form.get('email')!; }
  get phones() { return this.form.get('phones') as FormArray; }

  addPhone() { this.phones.push(this.fb.control('')); }
  removePhone(i: number) { this.phones.removeAt(i); }

  // Async validator — returns Observable<ValidationErrors | null>
  checkUsername(ctrl: AbstractControl): Observable<ValidationErrors | null> {
    return this.userSvc.checkUsername(ctrl.value).pipe(
      debounceTime(300),
      map(taken => (taken ? { usernameTaken: true } : null)),
    );
  }

  submit() {
    if (this.form.valid) console.log(this.form.value);
  }
}`,
    },

    interview: [
      "What is the difference between Reactive Forms and Template-driven Forms?",
      "When would you use FormArray vs FormGroup?",
      "How do you create a custom synchronous and async validator?",
      "What is the difference between dirty/touched/valid states?",
      "How do you watch for value changes on a single control?",
      "How do you disable a form control programmatically?",
      "How do you unit test a reactive form without rendering a component?",
    ],

    tradeoffs: {
      pros: [
        "Form state lives in TypeScript class — fully testable without DOM",
        "valueChanges Observable enables debounce, search-as-you-type, autosave",
        "FormArray makes dynamic field lists trivial to manage",
        "Async validators integrate naturally with HTTP calls",
      ],
      cons: [
        "More boilerplate than Template-driven forms for simple cases",
        "formControlName must match the FormBuilder key exactly — typo causes silent null",
        "Async validators keep form in 'pending' state — must handle in UI",
        "Nested FormGroups + FormArrays can get complex — consider reactive form libraries (ngx-formly)",
      ],
    },

    gotchas: [
      "form.get('email') returns null if the control name doesn't match — use optional chaining (?.) everywhere",
      "Disabling a control via [disabled]=\"true\" in template fights with reactive forms — use form.get('x')!.disable() in code",
      "setValue() requires ALL keys; patchValue() only sets provided keys — use patchValue for partial updates",
      "FormArray index as formControlName must be a number — use [formControlName]=\"i\" NOT formControlName=\"i\"",
      "Validators.compose() is equivalent to passing an array — don't use it when array syntax works",
      "form.reset() clears values AND resets touched/dirty — form.patchValue({}) only clears values",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", yellow: "#e3b341", red: "#f85149",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var stateMatrix = [
        { state: "pristine", opposite: "dirty", desc: "Value has NOT been changed by user", icon: "⬜", color: C.muted },
        { state: "dirty", opposite: "pristine", desc: "Value HAS been changed from initial", icon: "✏️", color: C.yellow },
        { state: "untouched", opposite: "touched", desc: "Field has NOT been focused + blurred", icon: "👆", color: C.muted },
        { state: "touched", opposite: "untouched", desc: "Field WAS focused and then blurred", icon: "✋", color: C.blue },
        { state: "valid", opposite: "invalid", desc: "All validators pass", icon: "✅", color: C.green },
        { state: "invalid", opposite: "valid", desc: "At least one validator fails", icon: "❌", color: C.red },
        { state: "pending", opposite: "valid/invalid", desc: "Async validator running (HTTP check)", icon: "⏳", color: C.orange },
      ];

      var flowSteps = [
        { label: "User types", color: C.blue, desc: "valueChanges emits" },
        { label: "Validators run", color: C.yellow, desc: "sync → immediately" },
        { label: "Async validators", color: C.orange, desc: "HTTP → pending state" },
        { label: "State updates", color: C.purple, desc: "valid/invalid/pending" },
        { label: "Template reacts", color: C.green, desc: "error messages show" },
        { label: "Submit guard", color: C.red, desc: "[disabled]=\"form.invalid\"" },
      ];

      var state = { tab: 0 };

      function render() {
        mount.innerHTML = "<style>" +
          ".ngrf-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".ngrf-tabs{display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap}" +
          ".ngrf-tab{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.muted + ";background:transparent;text-transform:uppercase;letter-spacing:.5px}" +
          ".ngrf-tab.active{background:" + C.blue + ";border-color:" + C.blue + ";color:#fff}" +
          ".ngrf-panel{background:" + C.surface + ";border-radius:8px;padding:10px}" +
          ".ngrf-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;font-size:9px;padding:4px 6px;border-radius:4px}" +
          ".ngrf-flow{display:flex;align-items:center;gap:0;flex-wrap:wrap;justify-content:center;padding:8px 0}" +
          ".ngrf-fnode{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:70px}" +
          ".ngrf-fbox{padding:5px 8px;border-radius:5px;font-size:8.5px;font-weight:700;text-align:center;white-space:nowrap}" +
          ".ngrf-fdesc{font-size:7.5px;color:" + C.muted + ";text-align:center;line-height:1.2}" +
          ".ngrf-farrow{color:" + C.muted + ";font-size:14px;padding:0 2px}" +
          "</style>" +
          "<div class='ngrf-wrap'>" +
          "<div class='ngrf-tabs'>" +
          ["Control States", "Validation Flow"].map(function (t, i) {
            return "<button class='ngrf-tab" + (i === state.tab ? " active" : "") + "' data-i='" + i + "'>" + t + "</button>";
          }).join("") +
          "</div>" +
          "<div class='ngrf-panel'>" +
          (state.tab === 0 ?
            stateMatrix.map(function (s) {
              return "<div class='ngrf-row' style='background:rgba(255,255,255,.02)'>" +
                "<div style='font-size:13px'>" + s.icon + "</div>" +
                "<div style='color:" + s.color + ";font-weight:700;min-width:70px'>" + s.state + "</div>" +
                "<div style='color:" + C.muted + ";font-size:8px;flex:1'>" + s.desc + "</div>" +
                "</div>";
            }).join("") :
            "<div class='ngrf-flow'>" +
            flowSteps.map(function (n, i) {
              return "<div class='ngrf-fnode'>" +
                "<div class='ngrf-fbox' style='background:rgba(255,255,255,.05);border:1px solid " + n.color + ";color:" + n.color + "'>" + n.label + "</div>" +
                "<div class='ngrf-fdesc'>" + n.desc + "</div>" +
                "</div>" +
                (i < flowSteps.length - 1 ? "<div class='ngrf-farrow'>→</div>" : "") ;
            }).join("") +
            "</div>"
          ) +
          "</div>" +
          "</div>";

        mount.querySelectorAll(".ngrf-tab").forEach(function (btn) {
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
