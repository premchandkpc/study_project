(function() {
  var topic = {
  id:"sd-security-auth", area:"sysdesign",
  title:"Security — OAuth2, JWT, mTLS & RBAC",
  tag:"Security", tags:["oauth2","jwt","rbac","mtls","api key","zero trust","oidc","pkce","refresh token"],
  concept:`**Authentication (AuthN):** Who are you? (identity)
**Authorization (AuthZ):** What can you do? (permissions)

**OAuth2 flows:**
- **Authorization Code + PKCE** — web/mobile apps. Client redirects user to IdP, gets code, exchanges for tokens. PKCE prevents code interception.
- **Client Credentials** — machine-to-machine. Service presents client_id + client_secret → gets access_token.
- **Device Flow** — smart TVs, CLIs. User enters code on separate device.

**JWT (JSON Web Token):**
\`header.payload.signature\` — base64url encoded. Stateless — no DB lookup needed.
- **Access token** — short-lived (15 min). Verified locally by services.
- **Refresh token** — long-lived (7-30 days). Stored in HttpOnly cookie. Used to get new access token.
- **Signature** — RS256 (asymmetric): IdP signs with private key; services verify with public key (fetched from JWKS endpoint).

**RBAC (Role-Based Access Control):**
Roles assigned to users. Permissions assigned to roles. Services check: \`user.roles.contains("admin") && resource.ownerId == userId\`.

**mTLS (Mutual TLS):**
Both client and server present certificates. Used for service-to-service in zero-trust networks.
- Istio / service mesh automates certificate issuance (SPIFFE/SPIRE).
- No password — proof of identity via certificate.

**Zero Trust:** Never trust, always verify. Even internal traffic is authenticated.
- Traditional: trust everything inside the firewall.
- Zero Trust: every request authenticated + authorised regardless of network location.`,
  why:`Auth is asked in every security-related design question. JWT revocation and token refresh patterns are common deep-dive topics.`,
  example:{
    language:"java",
    code:`// Spring Security 6 — JWT validation + RBAC
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)  // stateless API
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))  // validate JWT signature
            )
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // Verify with IdP's public key (fetched from JWKS endpoint)
        return NimbusJwtDecoder
            .withJwkSetUri("https://auth.example.com/.well-known/jwks.json")
            .build();
    }

    // Fine-grained RBAC on methods
    @Service
    public class OrderService {
        @PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
        public Order getOrder(String orderId, String userId) {
            return orderRepository.findById(orderId).orElseThrow();
        }

        @PreAuthorize("hasRole('ADMIN')")
        public void deleteOrder(String orderId) {
            orderRepository.deleteById(orderId);
        }
    }
}

// JWT refresh token rotation — HttpOnly cookie
@RestController
public class AuthController {

    @PostMapping("/auth/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue("refresh_token") String refreshToken) {
        // Validate refresh token from DB (check not revoked)
        RefreshToken stored = refreshTokenRepo.findByToken(hash(refreshToken))
            .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (stored.isExpired()) throw new UnauthorizedException("Refresh token expired");

        // Rotate: revoke old, issue new
        stored.revoke();
        refreshTokenRepo.save(stored);

        String newAccessToken = jwtService.generateAccessToken(stored.getUserId());
        String newRefreshToken = jwtService.generateRefreshToken(stored.getUserId());
        refreshTokenRepo.save(new RefreshToken(stored.getUserId(), hash(newRefreshToken)));

        ResponseCookie cookie = ResponseCookie.from("refresh_token", newRefreshToken)
            .httpOnly(true).secure(true).sameSite("Strict")
            .maxAge(Duration.ofDays(30)).path("/auth/refresh").build();

        return ResponseEntity.ok()
            .header(HttpHeaders.SET_COOKIE, cookie.toString())
            .body(new TokenResponse(newAccessToken));
    }
}`,
    notes:"Never store refresh tokens in localStorage — XSS can steal them. HttpOnly cookie prevents JS access. Refresh token rotation detects theft: if old token used after rotation, revoke all sessions."
  },
  interview:[
    {question:"How do you revoke a JWT before it expires?",
     answer:`JWTs are stateless — the server doesn't track them. To revoke:\n\n1. **Short expiry** — 15-minute access token. Only 15 minutes of exposure. Mitigates most cases without revocation.\n2. **Token blocklist** — store revoked JTI (JWT ID) in Redis with TTL = remaining token lifetime. Check blocklist on every request. Fast (Redis ~1ms) but adds state.\n3. **Refresh token revocation** — the access token is short-lived; revoke the refresh token in DB. User is logged out at next refresh.\n4. **Version number in token** — store \`tokenVersion\` per user in DB. JWT includes version. On logout, increment version. Any token with old version rejected.\n5. **Opaque tokens** — use reference tokens (random string), validate by calling IdP introspection endpoint. Fully revocable but adds network hop per request.`,
     followUps:["What is the difference between OAuth2 and OpenID Connect?","Explain PKCE and why it's needed for SPAs."]
    }
  ],
  tradeoffs:{
    pros:["JWT: stateless — no DB lookup per request","OAuth2: standardised delegation — users don't share passwords with third-party apps","RBAC: simple to reason about and audit"],
    cons:["JWT: revocation complexity","OAuth2: complex flow — many tokens, scopes, endpoints","mTLS: certificate rotation operational overhead"],
    when:"JWT access token + refresh token rotation for APIs. OAuth2 Authorization Code + PKCE for user-facing apps. Client credentials for M2M. mTLS for internal service auth in zero-trust environments."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.style.cssText = 'font-family:monospace;background:#0d1117;border-radius:8px;padding:12px;color:#e6edf3;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;';
    var btnStyle = 'padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;';

    var canvas = document.createElement('canvas');
    canvas.width = 460; canvas.height = 320;
    canvas.style.cssText = 'width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;';
    var ctx = canvas.getContext('2d');

    // Participants
    var participants = [
      { label:'User',            x:42,  color:'#8b949e' },
      { label:'Browser\n/App',   x:120, color:'#58a6ff' },
      { label:'Auth\nServer',    x:230, color:'#ffa657' },
      { label:'Resource\nServer',x:340, color:'#3fb950' },
      { label:'Token\nStore',    x:420, color:'#bc8cff' }
    ];

    // Steps: [from, to, label, sublabel]
    var steps = [
      { from:0, to:1, dir:1,  label:'① Login clicked',          sub:'User initiates login',                  color:'#8b949e' },
      { from:1, to:2, dir:1,  label:'② code_challenge →',       sub:'PKCE: code_verifier hashed (SHA256)',    color:'#58a6ff' },
      { from:2, to:1, dir:-1, label:'③ ← Login page',           sub:'User enters credentials at Auth Server', color:'#ffa657' },
      { from:1, to:2, dir:1,  label:'④ Credentials →',          sub:'Auth Server validates + issues code',    color:'#ffa657' },
      { from:2, to:1, dir:-1, label:'⑤ ← Auth code (10s TTL)',  sub:'Short-lived code returned to browser',  color:'#ffa657' },
      { from:1, to:2, dir:1,  label:'⑥ code + verifier →',      sub:'Exchange: IdP verifies hash matches',    color:'#58a6ff' },
      { from:2, to:1, dir:-1, label:'⑦ ← Access + Refresh JWT', sub:'AT: 15min  RT: 30d (HttpOnly cookie)',  color:'#3fb950' },
      { from:1, to:3, dir:1,  label:'⑧ Bearer token →',         sub:'API call with Authorization header',    color:'#3fb950' },
      { from:3, to:4, dir:1,  label:'⑨ Verify JWT →',           sub:'JWKS public key validation (local)',    color:'#bc8cff' },
      { from:3, to:1, dir:-1, label:'⑩ ← Protected data',       sub:'Resource returned to app',             color:'#3fb950' }
    ];

    var currentStep = -1;
    var autoPlay = false;
    var animId = null;
    var frameCount = 0;
    var showJWT = false;

    // Animated arrow
    var arrowAnim = 0;

    function drawParticipant(p) {
      var h = 28;
      ctx.fillStyle = p.color + '22'; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(p.x - 28, 22, 56, h, 4); ctx.fill(); ctx.stroke();
      ctx.font = '8px monospace'; ctx.fillStyle = p.color; ctx.textAlign = 'center';
      p.label.split('\n').forEach(function(l, li) { ctx.fillText(l, p.x, 32 + li * 11); });
      // Lifeline
      ctx.strokeStyle = p.color + '44'; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(p.x, 50); ctx.lineTo(p.x, showJWT ? 180 : 250); ctx.stroke();
      ctx.setLineDash([]);
    }

    function drawArrow(step, progress) {
      var fp = participants[step.from], tp = participants[step.to];
      var fx = fp.x, tx = tp.x;
      var lineY = 58 + steps.indexOf(step) * 19;
      var ex = fx + (tx - fx) * progress;

      ctx.strokeStyle = step.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fx, lineY); ctx.lineTo(ex, lineY); ctx.stroke();

      // Arrowhead
      if (progress >= 0.98) {
        var dir = tx > fx ? 1 : -1;
        ctx.fillStyle = step.color;
        ctx.beginPath();
        ctx.moveTo(ex, lineY);
        ctx.lineTo(ex - dir * 6, lineY - 4);
        ctx.lineTo(ex - dir * 6, lineY + 4);
        ctx.closePath(); ctx.fill();
      }

      // Label
      ctx.font = '8px monospace'; ctx.fillStyle = step.color; ctx.textAlign = 'center';
      ctx.fillText(step.label, (fx + tx)/2, lineY - 3);
    }

    function drawJWT() {
      var W = canvas.width, H = canvas.height;
      var jwtY = 186;
      ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#3fb950'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(6, jwtY, W - 12, 66, 6); ctx.fill(); ctx.stroke();

      ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#3fb950'; ctx.textAlign = 'left';
      ctx.fillText('JWT Access Token', 12, jwtY + 14);

      var parts = [
        { text:'eyJhbGciOiJSUzI1NiJ9', color:'#f85149', label:'Header' },
        { text:'.eyJzdWIiOiJ1c2VyMTIz', color:'#e3b341', label:'Payload' },
        { text:'.SflKxwRJSMeKKF2Q…',   color:'#58a6ff', label:'Signature' }
      ];
      var px = 12, py = jwtY + 28;
      parts.forEach(function(p) {
        ctx.font = '8px monospace'; ctx.fillStyle = p.color; ctx.textAlign = 'left';
        var tw = ctx.measureText(p.text).width;
        ctx.fillText(p.text, px, py); px += tw;
      });

      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      var lx = 50;
      parts.forEach(function(p) {
        ctx.fillStyle = p.color;
        ctx.fillText(p.label, lx, jwtY + 44);
        lx += 130;
      });

      ctx.fillStyle = '#8b949e'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      ctx.fillText('sub: user123  |  roles: ["admin"]  |  exp: +15min', 12, jwtY + 58);
    }

    function draw() {
      if (!document.body.contains(canvas)) { if (animId) cancelAnimationFrame(animId); return; }
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#ffa657'; ctx.textAlign = 'center';
      ctx.fillText('OAuth2 PKCE Authorization Code Flow', W/2, 14);

      participants.forEach(drawParticipant);

      for (var i = 0; i <= currentStep && i < steps.length; i++) {
        var progress = i < currentStep ? 1 : arrowAnim;
        drawArrow(steps[i], progress);
      }

      if (showJWT) drawJWT();

      // Sub-label for current step
      if (currentStep >= 0 && currentStep < steps.length) {
        var cs = steps[currentStep];
        ctx.fillStyle = '#161b22'; ctx.strokeStyle = '#30363d'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(6, H - 34, W - 12, 28, 4); ctx.fill(); ctx.stroke();
        ctx.font = '9px monospace'; ctx.fillStyle = cs.color; ctx.textAlign = 'center';
        ctx.fillText(cs.sub, W/2, H - 16);
      } else if (currentStep < 0) {
        ctx.font = '9px monospace'; ctx.fillStyle = '#8b949e'; ctx.textAlign = 'center';
        ctx.fillText('Click [Play Flow] to animate or [Step] to advance manually', W/2, H - 14);
      } else {
        ctx.font = '9px monospace'; ctx.fillStyle = '#3fb950'; ctx.textAlign = 'center';
        ctx.fillText('Flow complete ✓  |  Access token valid 15min, Refresh 30 days', W/2, H - 14);
      }

      animId = requestAnimationFrame(tick);
    }

    function tick() {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(animId); return; }
      if (autoPlay) {
        frameCount++;
        if (arrowAnim < 1) {
          arrowAnim = Math.min(1, arrowAnim + 0.06);
        } else if (frameCount > 30) {
          frameCount = 0;
          if (currentStep < steps.length - 1) {
            currentStep++;
            arrowAnim = 0;
          } else {
            autoPlay = false;
          }
        }
      }
      draw();
    }

    var playBtn = document.createElement('button');
    playBtn.textContent = '[Play Flow]';
    playBtn.style.cssText = btnStyle;
    playBtn.addEventListener('click', function() {
      currentStep = 0; arrowAnim = 0; autoPlay = true; frameCount = 0; showJWT = false;
    });

    var stepBtn = document.createElement('button');
    stepBtn.textContent = '[Step]';
    stepBtn.style.cssText = btnStyle;
    stepBtn.addEventListener('click', function() {
      autoPlay = false;
      if (currentStep < steps.length - 1) { currentStep++; arrowAnim = 1; }
    });

    var jwtBtn = document.createElement('button');
    jwtBtn.textContent = '[Show JWT]';
    jwtBtn.style.cssText = btnStyle;
    jwtBtn.addEventListener('click', function() { showJWT = !showJWT; });

    var resetBtn = document.createElement('button');
    resetBtn.textContent = '[Reset]';
    resetBtn.style.cssText = btnStyle;
    resetBtn.addEventListener('click', function() { currentStep = -1; arrowAnim = 0; autoPlay = false; showJWT = false; });

    [playBtn, stepBtn, jwtBtn, resetBtn].forEach(function(b) { btnRow.appendChild(b); });
    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);
    tick();
  },
  flow:{
    title:"OAuth2 Authorization Code + PKCE Flow",
    caption:"Secure browser-based login without exposing client secret",
    nodes:[
      {id:"browser",label:"Browser (SPA)",hint:"PKCE code_verifier generated"},
      {id:"app",label:"App Server",hint:"Resource server"},
      {id:"idp",label:"Identity Provider",hint:"Keycloak / Auth0 / Cognito"},
      {id:"db",label:"User DB",hint:"Credentials + roles"}
    ],
    steps:[
      {path:["browser","idp"],label:"Redirect to IdP with code_challenge",detail:"Browser generates random code_verifier, hashes to code_challenge (SHA256). Redirects to IdP authorization endpoint."},
      {path:["idp","db"],label:"IdP authenticates user",detail:"User enters credentials. IdP validates against user store, checks MFA if enabled."},
      {path:["idp","browser"],label:"Authorization code returned",detail:"IdP redirects to callback URL with short-lived authorization code (10 seconds TTL)."},
      {path:["browser","idp"],label:"Exchange code + code_verifier",detail:"Browser sends code + code_verifier. IdP verifies hash matches. Prevents code interception attacks."},
      {path:["idp","browser"],label:"Access token + refresh token",detail:"IdP returns JWT access token (15min) + refresh token (30 days in HttpOnly cookie)."},
      {path:["browser","app"],label:"API call with Bearer token",detail:"All API calls include Authorization: Bearer <JWT>. App validates signature locally via JWKS."},
      {path:["browser","idp"],label:"Silent refresh via refresh token",detail:"Before access token expires, browser sends refresh token to get new access token without re-login."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
