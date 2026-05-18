(function () {
  "use strict";

  window.ANGULAR_TOPICS = (window.ANGULAR_TOPICS || []).concat([{
    id: "ng-http-interceptors",
    area: "angular",
    title: "Angular HTTP & Interceptors",
    tag: "HTTP",
    tags: ["angular", "httpclient", "interceptors", "rxjs", "observables", "http"],

    concept: `**HttpClient** is Angular's built-in HTTP module — a wrapper around the Fetch/XHR API that returns **RxJS Observables** instead of Promises.

**Key difference from fetch():**
- Lazy — request only starts when you \`.subscribe()\` or use \`async\` pipe
- Cancellable — unsubscribing cancels the in-flight request
- Pipeable — use \`pipe(map(), catchError(), retry())\` to transform responses

**Basic usage:**
\`\`\`ts
// In service
getUser(id: number): Observable<User> {
  return this.http.get<User>(\`/api/users/\${id}\`);
}
\`\`\`

**HTTP Interceptors** sit in the request/response pipeline and can:
- Add auth headers (Bearer token)
- Log every request/response
- Retry on 5xx errors
- Show/hide global loading spinner
- Transform response shape

**Interceptor chain (like middleware):**
\`\`\`
Request  →  [AuthInterceptor] → [LogInterceptor] → [RetryInterceptor] → Backend
Response ←  [AuthInterceptor] ← [LogInterceptor] ← [RetryInterceptor] ← Backend
\`\`\`

**Interceptor interface:**
\`\`\`ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authReq = req.clone({ headers: req.headers.set('Authorization', 'Bearer ' + token) });
    return next.handle(authReq);
  }
}
\`\`\`

**Register interceptors (multi-provider):**
\`\`\`ts
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
\`\`\`
Order matters — interceptors run in registration order for requests, reverse order for responses.

**Typed responses:**
\`\`\`ts
http.get<User[]>('/api/users')                 // typed body
http.get('/api/file', { observe: 'response' }) // full HttpResponse
http.get('/api/upload', { reportProgress: true }) // upload progress events
\`\`\``,

    why: "Every real Angular app makes HTTP calls. HttpClient + Interceptors replace Express middleware on the client side — auth tokens, error handling, retry logic all live in interceptors instead of being duplicated per service.",

    example: {
      language: "typescript",
      code: `// Auth interceptor — adds Bearer token to every request
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authSvc: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authSvc.getToken();

    if (!token) return next.handle(req);  // no token → pass through

    // HttpRequest is IMMUTABLE — must clone to modify
    const authReq = req.clone({
      headers: req.headers.set('Authorization', \`Bearer \${token}\`),
    });

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.authSvc.logout();           // token expired → logout
        }
        return throwError(() => err);
      }),
    );
  }
}

// Retry interceptor — auto-retry on 5xx errors
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      retry({ count: 3, delay: 1000 }),   // retry up to 3 times, 1s apart
      catchError(err => throwError(() => err)),
    );
  }
}

// Register both in AppModule (order = request execution order)
providers: [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },  // runs 1st
  { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true }, // runs 2nd
]

// WRONG — mutating the request directly (HttpRequest is immutable)
req.headers.set('Authorization', token);  // returns new Headers, doesn't mutate ❌

// CORRECT — always clone
const cloned = req.clone({ headers: req.headers.set('Authorization', token) });  // ✅`,
    },

    interview: [
      "How do HTTP Interceptors work in Angular — what is the pipeline order?",
      "Why is HttpRequest immutable — how do you modify a request in an interceptor?",
      "How do you handle token refresh (401) in an interceptor without infinite loops?",
      "What is the difference between catchError and retry in RxJS?",
      "How do you cancel an in-flight HTTP request in Angular?",
      "What does multi: true mean in the HTTP_INTERCEPTORS provider?",
      "How do you test an Angular service that uses HttpClient?",
    ],

    tradeoffs: {
      pros: [
        "Interceptors are the single place for auth, logging, error handling — no duplication across services",
        "Observable-based — cancellable, composable with RxJS operators",
        "HttpClientTestingModule makes HTTP service testing very clean with no real network calls",
        "Typed responses with generics catch mismatches at compile time",
      ],
      cons: [
        "Interceptors run for ALL requests — must filter by URL if you want selective behavior",
        "Token refresh in interceptor requires storing pending requests and replaying — complex to implement correctly",
        "RxJS learning curve — easy to forget to subscribe or accidentally create multiple requests",
        "Error handling in catchError must re-throw or return a fallback — swallowing errors silently breaks callers",
      ],
    },

    gotchas: [
      "HttpRequest is IMMUTABLE — req.headers.set() returns a new Headers object, never mutates. Always use req.clone()",
      "Interceptors run in registration order for requests, REVERSE order for responses",
      "Forgetting multi: true replaces all interceptors with the last one — a very silent bug",
      "HTTP observables are cold (lazy) — the request only fires when someone subscribes",
      "catchError must return an Observable — return throwError() or of(fallback), never just throw",
      "Token refresh loop: if refresh endpoint also returns 401, interceptor must skip it or you get infinite loop",
    ],

    visual: function (mount) {
      var C = {
        orange: "#ffa657", green: "#3fb950", blue: "#58a6ff",
        purple: "#d2a8ff", red: "#f85149", yellow: "#e3b341",
        bg: "#0d1117", surface: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#768390"
      };

      var interceptors = [
        { name: "AuthInterceptor", color: C.blue, req: "adds Bearer\ntoken header", res: "catches 401\n→ logout" },
        { name: "LogInterceptor", color: C.yellow, req: "logs URL\n+ method", res: "logs status\n+ timing" },
        { name: "RetryInterceptor", color: C.orange, req: "passes\nthrough", res: "retries on\n5xx (3x)" },
      ];

      var state = { animating: false, step: 0 };
      var MAX_STEPS = interceptors.length * 2 + 2;

      function render() {
        var step = state.step;
        var reqPhase = step <= interceptors.length;
        var resPhase = step > interceptors.length;

        mount.innerHTML = "<style>" +
          ".nghttp-wrap{font-family:'JetBrains Mono',monospace;padding:12px;background:" + C.bg + ";border-radius:10px}" +
          ".nghttp-title{color:" + C.text + ";font-size:11px;font-weight:700;margin-bottom:2px}" +
          ".nghttp-sub{color:" + C.muted + ";font-size:9px;margin-bottom:10px}" +
          ".nghttp-pipeline{display:flex;align-items:stretch;gap:0;overflow-x:auto;padding:4px 0}" +
          ".nghttp-node{display:flex;flex-direction:column;align-items:center;min-width:90px}" +
          ".nghttp-box{border-radius:6px;padding:6px 8px;text-align:center;font-size:8.5px;line-height:1.3;min-width:80px;border:1px solid transparent;transition:all .3s}" +
          ".nghttp-connector{display:flex;flex-direction:column;align-items:center;justify-content:center;width:28px;min-width:28px}" +
          ".nghttp-arrow{font-size:14px;line-height:1}" +
          ".nghttp-label{font-size:7px;text-align:center;white-space:pre-line;line-height:1.2;color:" + C.muted + ";margin-top:3px;min-height:24px}" +
          ".nghttp-ctrl{display:flex;gap:6px;margin-top:8px;align-items:center}" +
          ".nghttp-btn{padding:4px 10px;font-size:9px;border-radius:4px;cursor:pointer;border:1px solid " + C.border + ";color:" + C.text + ";background:" + C.surface + "}" +
          ".nghttp-btn:hover{border-color:" + C.blue + ";color:" + C.blue + "}" +
          ".nghttp-info{font-size:9px;color:" + C.muted + ";flex:1;padding-left:6px}" +
          "</style>" +
          "<div class='nghttp-wrap'>" +
          "<div class='nghttp-title'>HTTP Interceptor Pipeline</div>" +
          "<div class='nghttp-sub'>Request flows left→right, response flows right→left through each interceptor</div>" +
          "<div class='nghttp-pipeline'>" +
          // Client node
          (function () {
            var active = step === 0 || step === MAX_STEPS - 1;
            return "<div class='nghttp-node'>" +
              "<div class='nghttp-box' style='background:" + (active ? "rgba(88,166,255,.15)" : "rgba(255,255,255,.04)") + ";border-color:" + (active ? C.blue : C.border) + ";color:" + (active ? C.blue : C.muted) + "'>" +
              "🌐<br>Client" +
              "</div></div>";
          })() +
          interceptors.map(function (ic, i) {
            var reqActive = step === i + 1;
            var resActive = step === MAX_STEPS - 2 - i;
            var passed = step > i + 1 && step <= interceptors.length;
            var resPassed = resPhase && step > MAX_STEPS - 2 - i;
            var connColor = reqActive ? C.green : (resActive ? C.orange : C.border);
            var reqLabel = reqActive ? ic.req : (passed ? "✓ done" : "");
            var resLabel = resActive ? ic.res : "";
            return "<div class='nghttp-connector'>" +
              "<div class='nghttp-arrow' style='color:" + connColor + "'>" + (reqActive ? "→" : (resActive ? "←" : "—")) + "</div>" +
              "</div>" +
              "<div class='nghttp-node'>" +
              "<div class='nghttp-box' style='background:" + (reqActive || resActive ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.03)") + ";border-color:" + (reqActive ? ic.color : (resActive ? C.orange : C.border)) + ";color:" + ic.color + "'>" +
              ic.name.replace("Interceptor", "<br>Interceptor") +
              "</div>" +
              "<div class='nghttp-label'>" + (reqLabel || resLabel || "") + "</div>" +
              "</div>";
          }).join("") +
          // Backend node
          (function () {
            var active = step === interceptors.length + 1;
            return "<div class='nghttp-connector'>" +
              "<div class='nghttp-arrow' style='color:" + (active ? C.green : C.border) + "'>" + (active ? "→" : "—") + "</div>" +
              "</div>" +
              "<div class='nghttp-node'>" +
              "<div class='nghttp-box' style='background:" + (active ? "rgba(63,185,80,.15)" : "rgba(255,255,255,.04)") + ";border-color:" + (active ? C.green : C.border) + ";color:" + (active ? C.green : C.muted) + "'>" +
              "🖥️<br>Backend" +
              "</div></div>";
          })() +
          "</div>" +
          "<div class='nghttp-ctrl'>" +
          "<button class='nghttp-btn' id='nghttp-prev'>← Prev</button>" +
          "<button class='nghttp-btn' id='nghttp-next'>Next →</button>" +
          "<div class='nghttp-info'>" +
          (step <= interceptors.length ? "📤 Request phase: step " + step + " / " + (interceptors.length + 1) : "📥 Response phase: step " + step + " / " + (MAX_STEPS - 1)) +
          "</div>" +
          "</div>" +
          "</div>";

        mount.querySelector("#nghttp-prev").addEventListener("click", function () {
          state.step = Math.max(0, state.step - 1);
          render();
        });
        mount.querySelector("#nghttp-next").addEventListener("click", function () {
          state.step = Math.min(MAX_STEPS - 1, state.step + 1);
          render();
        });
      }
      render();
    },
  }]);
})();
