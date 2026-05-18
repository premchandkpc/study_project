(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-testing",
    area: "angular",
    title: "Angular Testing",
    tag: "Testing",
    tags: ["angular", "testing", "testbed", "jasmine", "jest", "harnesses", "mocks", "spyon"],

    concept: `Angular testing revolves around **TestBed** — a test-specific Angular module that creates a real (but miniature) Angular environment.

**Three levels of Angular tests:**

**Unit tests (services)** — fastest, no DOM, mock all dependencies:
\`\`\`ts
// No TestBed needed for simple services
const svc = new AuthService(httpMock, routerMock);
expect(svc.isLoggedIn()).toBe(false);
\`\`\`

**Component tests** — use TestBed to compile and render a real component:
\`\`\`ts
TestBed.configureTestingModule({ declarations: [MyComponent] });
fixture = TestBed.createComponent(MyComponent);
component = fixture.componentInstance;
fixture.detectChanges();  // triggers ngOnInit + first render
\`\`\`

**Integration / e2e tests** — Cypress/Playwright, real browser, real backend

**Key TestBed utilities:**
| Tool | Purpose |
|------|---------|
| \`fixture.debugElement\` | Root debug element — query descendants |
| \`fixture.nativeElement\` | Raw DOM root element |
| \`fixture.detectChanges()\` | Manually trigger CD cycle |
| \`de.query(By.css('.btn'))\` | Find first matching element |
| \`de.queryAll(By.css('li'))\` | Find all matching elements |
| \`de.triggerEventHandler('click', {})\` | Simulate DOM event |

**Mocking HTTP with HttpClientTestingModule:**
\`\`\`ts
TestBed.configureTestingModule({
  imports: [HttpClientTestingModule],
  providers: [UserService],
});
const httpMock = TestBed.inject(HttpTestingController);

svc.getUser(1).subscribe(user => expect(user.name).toBe('Alice'));
const req = httpMock.expectOne('/api/users/1');
req.flush({ name: 'Alice' });   // simulate response
\`\`\`

**Mocking services with spyOn:**
\`\`\`ts
const authSpy = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'logout']);
authSpy.isLoggedIn.and.returnValue(true);

TestBed.configureTestingModule({
  providers: [{ provide: AuthService, useValue: authSpy }],
});
\`\`\`

**Angular CDK Harnesses** — stable DOM-agnostic API for component interaction:
\`\`\`ts
const loader = TestbedHarnessEnvironment.loader(fixture);
const button = await loader.getHarness(MatButtonHarness.with({ text: 'Submit' }));
await button.click();
\`\`\``,

    why: "Angular's TestBed is what makes Angular apps testable at scale. HttpClientTestingModule and spyObj replace real dependencies with controlled fakes — test exactly what your component does, not what the network returns.",

    example: {
      language: "typescript",
      code: `// Testing a component that uses a service
describe('UserListComponent', () => {
  let fixture: ComponentFixture<UserListComponent>;
  let component: UserListComponent;
  let userSvcSpy: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userSvcSpy = jasmine.createSpyObj('UserService', ['getAll', 'delete']);
    userSvcSpy.getAll.and.returnValue(of([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]));

    await TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [{ provide: UserService, useValue: userSvcSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();  // triggers ngOnInit → getAll() called
  });

  it('renders a row per user', () => {
    const rows = fixture.debugElement.queryAll(By.css('.user-row'));
    expect(rows.length).toBe(2);
  });

  it('shows user name in each row', () => {
    const names = fixture.debugElement
      .queryAll(By.css('.user-name'))
      .map(el => el.nativeElement.textContent.trim());
    expect(names).toEqual(['Alice', 'Bob']);
  });

  it('calls delete service on button click', () => {
    userSvcSpy.delete.and.returnValue(of(void 0));
    const deleteBtn = fixture.debugElement.query(By.css('.delete-btn'));
    deleteBtn.triggerEventHandler('click', {});
    expect(userSvcSpy.delete).toHaveBeenCalledWith(1);
  });
});

// Testing HTTP service
describe('UserService', () => {
  let svc: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService],
    });
    svc = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());  // ensure no unexpected requests

  it('fetches users from API', () => {
    svc.getAll().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users[0].name).toBe('Alice');
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
  });
});`,
    },

    interview: [
      "What is TestBed and why do you need it for Angular component tests?",
      "What does fixture.detectChanges() do?",
      "How do you test a component that depends on an HTTP service?",
      "What is the difference between spyOn and jasmine.createSpyObj?",
      "How does HttpClientTestingModule work — what is HttpTestingController?",
      "What is By.css() and why use it instead of querySelector?",
      "What are Angular CDK Harnesses and when would you use them?",
    ],

    tradeoffs: {
      pros: [
        "TestBed creates a real Angular environment — tests catch template binding issues, not just logic",
        "HttpClientTestingModule gives complete control over HTTP responses — no flaky network tests",
        "spyObj fakes make component behavior deterministic and fast",
        "By.css() + debugElement is DOM-structure-independent — tests survive refactoring",
      ],
      cons: [
        "TestBed setup is verbose — each test file needs significant boilerplate",
        "fixture.detectChanges() must be called manually — easy to forget, tests silently don't render",
        "Async tests require fakeAsync/tick or done callback — more ceremony than Jest promises",
        "Full component compilation via compileComponents() is slow — prefer unit tests for pure logic",
      ],
    },

    gotchas: [
      "fixture.detectChanges() must be called at least once — component won't render (ngOnInit won't run) without it",
      "httpMock.verify() in afterEach catches unhandled HTTP requests — forgetting it hides bugs",
      "Spy returnValue must be set BEFORE detectChanges() triggers the code that calls it",
      "By.css() returns DebugElement — use .nativeElement.textContent to read DOM text",
      "async service methods need fakeAsync + tick(milliseconds) or done callback — plain expects won't catch async errors",
      "Importing a real module (HttpClientModule) instead of HttpClientTestingModule will make real HTTP calls in tests",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", yellow: "#e3b341", red: "#f85149",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var pyramid = [
        { label: "E2E Tests", sublabel: "Cypress / Playwright", color: C.red, width: 90, count: "few", cost: "slow", trust: "high" },
        { label: "Integration Tests", sublabel: "TestBed + real modules", color: C.orange, width: 70, count: "some", cost: "medium", trust: "medium" },
        { label: "Component Tests", sublabel: "TestBed + spy services", color: C.yellow, width: 50, count: "many", cost: "fast", trust: "medium" },
        { label: "Unit Tests", sublabel: "No TestBed, mock all", color: C.green, width: 30, count: "most", cost: "fastest", trust: "targeted" },
      ];

      var lifecycle = [
        { step: "TestBed.configureTestingModule()", color: C.blue, desc: "Declare component, provide spies" },
        { step: "TestBed.createComponent()", color: C.purple, desc: "Instantiate component, get fixture" },
        { step: "fixture.detectChanges()", color: C.orange, desc: "Run ngOnInit + first render" },
        { step: "query/triggerEvent/expect", color: C.green, desc: "Act on DOM, assert behavior" },
        { step: "httpMock.verify()", color: C.yellow, desc: "Assert no unhandled HTTP (afterEach)" },
      ];

      var state = { tab: 0 };

      function render() {
        mount.innerHTML = "<style>" +
          ".ngt-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".ngt-tabs{display:flex;gap:4px;margin-bottom:10px}" +
          ".ngt-tab{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.muted + ";background:transparent;text-transform:uppercase;letter-spacing:.5px}" +
          ".ngt-tab.active{background:" + C.blue + ";border-color:" + C.blue + ";color:#fff}" +
          ".ngt-panel{background:" + C.surface + ";border-radius:8px;padding:10px}" +
          ".ngt-pyr{display:flex;flex-direction:column;align-items:center;gap:3px}" +
          ".ngt-pyr-row{display:flex;align-items:center;gap:6px;width:100%}" +
          ".ngt-pyr-bar{border-radius:3px;padding:4px 8px;font-size:8.5px;font-weight:700;transition:width .3s;text-align:center}" +
          ".ngt-pyr-meta{font-size:8px;color:" + C.muted + ";flex:1}" +
          ".ngt-lc-row{display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;padding:5px 6px;border-radius:4px;background:rgba(255,255,255,.02)}" +
          ".ngt-lc-num{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;flex-shrink:0}" +
          ".ngt-lc-step{font-family:monospace;font-size:8.5px}" +
          ".ngt-lc-desc{font-size:8px;color:" + C.muted + ";margin-top:1px}" +
          "</style>" +
          "<div class='ngt-wrap'>" +
          "<div class='ngt-tabs'>" +
          ["Testing Pyramid", "TestBed Lifecycle"].map(function (t, i) {
            return "<button class='ngt-tab" + (i === state.tab ? " active" : "") + "' data-i='" + i + "'>" + t + "</button>";
          }).join("") +
          "</div>" +
          "<div class='ngt-panel'>" +
          (state.tab === 0 ?
            "<div class='ngt-pyr'>" +
            pyramid.map(function (p) {
              return "<div class='ngt-pyr-row'>" +
                "<div class='ngt-pyr-bar' style='width:" + p.width + "%;background:rgba(255,255,255,.04);border:1px solid " + p.color + ";color:" + p.color + "'>" +
                p.label + "<br><span style='font-weight:400;color:" + C.muted + "'>" + p.sublabel + "</span>" +
                "</div>" +
                "<div class='ngt-pyr-meta'>count: " + p.count + " · speed: " + p.cost + "</div>" +
                "</div>";
            }).join("") + "</div>" :
            "<div>" +
            lifecycle.map(function (l, i) {
              return "<div class='ngt-lc-row'>" +
                "<div class='ngt-lc-num' style='background:rgba(255,255,255,.05);color:" + l.color + "'>" + (i + 1) + "</div>" +
                "<div>" +
                "<div class='ngt-lc-step' style='color:" + l.color + "'>" + l.step + "</div>" +
                "<div class='ngt-lc-desc'>" + l.desc + "</div>" +
                "</div>" +
                "</div>";
            }).join("") + "</div>"
          ) +
          "</div>" +
          "</div>";

        mount.querySelectorAll(".ngt-tab").forEach(function (btn) {
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
