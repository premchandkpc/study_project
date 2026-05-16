# Study Lab — Visual Design System
*Reusable styles, animations, palettes, UML patterns. Reference from CLAUDE.md.*

---

## COLOR PALETTES

### P1 · Dark GitHub (default)
```css
--bg:       #161b22;
--surface:  #21262d;
--border:   #30363d;
--text:     #cdd9e5;
--muted:    #768390;
--active:   #1f6feb;
--success:  #238636;
--error:    #da3633;
--warning:  #d29922;
--accent:   #8957e5;
```

### P2 · ByteByteGo Dark (diagrams + flows)
```css
--bg:       #0d1117;
--surface:  #161b22;
--border:   #21262d;
--node-a:   #58a6ff;   /* primary node */
--node-b:   #f78166;   /* secondary node */
--node-c:   #56d364;   /* success node */
--arrow:    #e3b341;   /* flow arrow */
--label:    #ffffff;
--inactive: #484f58;
```

### P3 · Miro Canvas (whiteboard art)
```css
--bg:       #f2f3f5;
--card:     #ffffff;
--border:   #d5d9e0;
--text:     #1a1a2e;
--sticky-y: #fff9c4;
--sticky-b: #bbdefb;
--sticky-g: #c8e6c9;
--sticky-r: #ffcdd2;
--arrow:    #4a4e69;
--active:   #0c7ff2;
```

### P4 · Brilliant.org (education interactive)
```css
--bg:       #1b1f3b;
--surface:  #252a4a;
--border:   #3d4468;
--text:     #e8eaf6;
--primary:  #7c4dff;
--secondary:#00bcd4;
--success:  #69f0ae;
--error:    #ff5252;
--highlight:#ffd740;
```

### P5 · Terminal / Matrix
```css
--bg:       #0a0a0a;
--surface:  #111111;
--text:     #00ff41;
--dim:      #003b00;
--cursor:   #00ff41;
--error:    #ff0000;
--warn:     #ffff00;
--border:   #1a1a1a;
```

---

## TYPOGRAPHY

### Fonts (load via Google Fonts or system)
```css
/* Code + visuals */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

/* Labels + narration */
font-family: 'Inter', 'DM Sans', 'Nunito', system-ui, sans-serif;

/* Headers + titles */
font-family: 'Space Grotesk', 'Outfit', 'Sora', sans-serif;

/* 8th-grade friendly (rounder, approachable) */
font-family: 'Nunito', 'Quicksand', 'Baloo 2', sans-serif;
```

### Font Scale
```css
--text-xs:   11px;   /* tooltip fine print */
--text-sm:   13px;   /* code inside nodes */
--text-base: 15px;   /* body / narration */
--text-lg:   17px;   /* section labels */
--text-xl:   20px;   /* tab titles */
--text-2xl:  24px;   /* topic headers */
--line-height: 1.6;
--letter-spacing-label: 0.04em;
```

---

## ANIMATION STYLES

### A1 · Pulse Highlight (node attention)
```css
@keyframes pulse-ring {
  0%   { box-shadow: 0 0 0 0 rgba(88,166,255,0.6); }
  70%  { box-shadow: 0 0 0 10px rgba(88,166,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(88,166,255,0); }
}
.pulse { animation: pulse-ring 1.2s ease-out infinite; }
```

### A2 · Flow Arrow (message passing)
```css
@keyframes flow-dash {
  to { stroke-dashoffset: -20; }
}
.flow-line {
  stroke-dasharray: 8 4;
  animation: flow-dash 0.6s linear infinite;
}
```

### A3 · Packet Travel (ByteByteGo style — JS)
```js
function animatePacket(svgEl, fromEl, toEl, color = '#e3b341', duration = 800) {
  const f = fromEl.getBoundingClientRect();
  const t = toEl.getBoundingClientRect();
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('r', 6); dot.setAttribute('fill', color);
  svgEl.appendChild(dot);
  let start = null;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    dot.setAttribute('cx', f.x + (t.x - f.x) * p);
    dot.setAttribute('cy', f.y + (t.y - f.y) * p);
    if (p < 1) requestAnimationFrame(step);
    else dot.remove();
  }
  requestAnimationFrame(step);
}
```

### A4 · Typewriter (narration bar)
```js
function typewriter(el, text, speed = 30) {
  el.textContent = '';
  let i = 0;
  const t = setInterval(() => {
    el.textContent += text[i++];
    if (i >= text.length) clearInterval(t);
  }, speed);
}
```

### A5 · Fade + Slide In (step reveal)
```css
@keyframes slide-up {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.step-reveal { animation: slide-up 0.35s ease forwards; }
```

### A6 · State Flash (color change on event)
```js
function flashState(el, color = '#e3b341', duration = 600) {
  const orig = el.style.background;
  el.style.transition = 'background 0.15s';
  el.style.background = color;
  setTimeout(() => { el.style.background = orig; }, duration);
}
```

### A7 · Shake (error state)
```css
@keyframes shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
.error-shake { animation: shake 0.4s ease; }
```

### A8 · Progress Bar (step counter)
```css
.progress-bar {
  height: 3px; background: #30363d; border-radius: 2px; overflow: hidden;
}
.progress-fill {
  height: 100%; background: #1f6feb;
  transition: width 0.3s ease;
}
```

### A9 · Confetti Burst (success moment — JS)
```js
function confettiBurst(x, y, colors = ['#58a6ff','#56d364','#e3b341','#f78166']) {
  for (let i = 0; i < 20; i++) {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;width:8px;height:8px;border-radius:50%;
      background:${colors[i%colors.length]};left:${x}px;top:${y}px;
      pointer-events:none;z-index:9999;transition:all 0.8s ease;`;
    document.body.appendChild(el);
    const angle = (i / 20) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    setTimeout(() => {
      el.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px)`;
      el.style.opacity = '0';
    }, 10);
    setTimeout(() => el.remove(), 900);
  }
}
```

### A10 · Connection Line Draw (SVG path animate)
```css
.draw-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw 0.8s ease forwards;
}
@keyframes draw {
  to { stroke-dashoffset: 0; }
}
```

### A11 · Floating Label (tooltip on hover)
```css
.tooltip-wrap { position: relative; }
.tooltip-wrap:hover .tooltip { opacity: 1; transform: translateY(-4px); }
.tooltip {
  position: absolute; bottom: calc(100% + 8px); left: 50%;
  transform: translateX(-50%) translateY(0);
  background: #21262d; border: 1px solid #30363d;
  color: #cdd9e5; font-size: 12px; padding: 6px 10px;
  border-radius: 6px; white-space: nowrap; opacity: 0;
  transition: all 0.2s; pointer-events: none; z-index: 100;
}
```

### A12 · Breathing Glow (idle node / loading)
```css
@keyframes breathe {
  0%,100% { box-shadow: 0 0 4px 1px rgba(88,166,255,0.3); }
  50%      { box-shadow: 0 0 16px 4px rgba(88,166,255,0.7); }
}
.breathing { animation: breathe 2s ease-in-out infinite; }
```

---

## UML DIAGRAM STYLES

### U1 · Class Diagram (HTML/CSS)
```
┌─────────────────────┐
│  «class»            │  ← stereotype chip
│  ClassName          │  ← bold, centered
├─────────────────────┤
│ - field: Type       │  ← private=red dot
│ + field: Type       │  ← public=green dot
│ # field: Type       │  ← protected=yellow dot
├─────────────────────┤
│ + method(): Type    │  ← methods section
│ - helper(): void    │
└─────────────────────┘
```
**Arrows (SVG):**
- Inheritance: solid line + hollow triangle (↑ unfilled)
- Implementation: dashed line + hollow triangle
- Association: solid line + open arrowhead →
- Composition: solid line + filled diamond ◆
- Aggregation: solid line + hollow diamond ◇
- Dependency: dashed line + open arrowhead

### U2 · Sequence Diagram Layout
```
Actor   :ServiceA   :ServiceB   :DB
  |         |           |         |
  |──req──▶ |           |         |
  |         |──call───▶ |         |
  |         |           |──query─▶|
  |         |           |◀─result─|
  |         |◀──resp────|         |
  |◀──res── |           |         |
```
Lifelines = vertical dashed lines. Activation = narrow filled rect on lifeline. Messages = horizontal arrows with label.

### U3 · State Machine (colored boxes)
```
[IDLE] ──event──▶ [RUNNING] ──done──▶ [COMPLETED]
                      │
                  error│
                      ▼
                  [FAILED] ──retry──▶ [RUNNING]
```
State boxes: rounded rect, color = state type. Transitions = labeled arrows. Current state = pulse animation (A1).

### U4 · ER Diagram
```
┌──────────┐         ┌──────────┐
│  User    │──1:N──▶│  Order   │
│──────────│         │──────────│
│ id PK    │         │ id PK    │
│ name     │         │ userId FK│
│ email    │         │ total    │
└──────────┘         └──────────┘
```

### U5 · Component / Deployment
```
┌─────────────────────────────┐
│  <<component>> Frontend     │
│  ┌──────┐    ┌──────────┐  │
│  │ UI   │───▶│ API Svc  │  │
│  └──────┘    └──────────┘  │
└──────────────────┬──────────┘
                   │ HTTP
                   ▼
         ┌──────────────────┐
         │  <<component>>   │
         │  Backend Service │
         └──────────────────┘
```

---

## INTERACTION PATTERNS

### I1 · Step Controller (standard)
```js
const ctrl = {
  steps: [], current: -1, timer: null,
  step() { if (this.current < this.steps.length-1) this.render(++this.current); },
  prev() { if (this.current > 0) this.render(--this.current); },
  play(delay=1200) { this.timer = setInterval(() => { if(this.current >= this.steps.length-1) this.stop(); else this.step(); }, delay); },
  stop() { clearInterval(this.timer); this.timer = null; },
  reset() { this.stop(); this.current = -1; this.render(0); },
  render(i) { /* implement per topic */ }
};
```

### I2 · Drag to Connect (graph building)
- mousedown on node → start drag
- mousemove → draw temporary arrow from source
- mouseup on target → create edge
- Store edges as `[{from, to, label}]` array

### I3 · Click to Reveal (interview mode)
```js
function makeRevealCard(question, answer) {
  const card = document.createElement('div');
  card.className = 'reveal-card';
  card.innerHTML = `<div class="q">${question}</div><div class="a hidden">${answer}</div>`;
  card.querySelector('.q').onclick = () => card.querySelector('.a').classList.toggle('hidden');
  return card;
}
```

### I4 · Slider (input→visual sync)
```html
<input type="range" min="1" max="100" id="nSlider">
<span id="nVal">50</span>
```
```js
document.getElementById('nSlider').addEventListener('input', e => {
  document.getElementById('nVal').textContent = e.target.value;
  redrawVisual(+e.target.value);
});
```

### I5 · Comparison Toggle (A vs B)
```js
function makeToggle(labelA, labelB, renderFn) {
  let mode = 'A';
  const btn = document.createElement('button');
  btn.textContent = `Showing: ${labelA}`;
  btn.onclick = () => { mode = mode === 'A' ? 'B' : 'A'; btn.textContent = `Showing: ${mode === 'A' ? labelA : labelB}`; renderFn(mode); };
  return btn;
}
```

### I6 · Speed Control (playback rate)
```html
<select id="speed">
  <option value="2000">Slow</option>
  <option value="1200" selected>Normal</option>
  <option value="600">Fast</option>
  <option value="200">Turbo</option>
</select>
```

---

## LAYOUT PATTERNS

### L1 · Code + Visual + Info (DSA Trinity)
```
┌──────────────────┬──────────────────┬─────────────┐
│  CODE            │  VISUAL STATE    │  COMPLEXITY │
│  14px mono       │  SVG / canvas    │  ops count  │
│  current line ▶  │  colored nodes   │  O(n) live  │
└──────────────────┴──────────────────┴─────────────┘
│  NARRATION BAR — full sentence, plain English      │
└────────────────────────────────────────────────────┘
```

### L2 · Split Compare (wrong vs correct)
```
┌────────────────────┬────────────────────┐
│  ❌ WRONG          │  ✅ CORRECT         │
│  red border        │  green border       │
│  code + output     │  code + output      │
│  "why wrong" text  │  "why right" text   │
└────────────────────┴────────────────────┘
```

### L3 · Miro Board (sticky note cluster)
```
 [sticky A]    [sticky B]    [sticky C]
      \              |             /
       └─────── [central concept] ─────
                     |
              [detail sticky D]
```
Stickies = colored div cards with slight rotation + drop-shadow.

### L4 · Timeline Flow (sequence of events)
```
●────────●────────●────────●────────●
t=0     t=1      t=2      t=3      t=4
START   ACTION   RESULT   EDGE     END
```
Active step = filled circle, bigger. Past = muted. Future = empty circle.

### L5 · Card Grid (concepts overview)
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│  icon    │ │  icon    │ │  icon    │
│  title   │ │  title   │ │  title   │
│  1-line  │ │  1-line  │ │  1-line  │
└──────────┘ └──────────┘ └──────────┘
```
Click card → expand to full visual. 3-column grid, responsive.

---

## DYNAMIC SIMULATION STYLES

### S1 · Particle Flow (network traffic)
Dots travel along paths (SVG). Count = throughput. Dot color = packet type. Stack at bottleneck = congestion visual.

### S2 · Queue Fill Animation
Bar grows left→right as items enqueue. Items pop from left with bounce. Overflow = red flash (A7 shake).

### S3 · Thread Pool Simulation
N worker boxes. Jobs = colored tickets arriving from top. Worker grabs ticket → turns orange → completes → green → idle. Queue visible. Rejection when full = red bounce.

### S4 · Memory Grid (heap/stack)
Grid of cells. Allocated = colored + label. Freed = gray fade. GC sweep = scanner line moves across, dead cells fade to black.

### S5 · Hash Table Animation
Show array of buckets. Insert key → compute hash → highlight bucket → add entry. Collision → chain grows. Load factor meter fills. At 0.75 → resize animation (new bigger array, rehash all).

### S6 · Tree Traversal
Node circles + edge lines. DFS: stack on side, nodes highlight in order, backtrack dims. BFS: queue on side, level-by-level color wave.

### S7 · Lock / Monitor
Shared resource box in center. Threads = circles approaching. One grabs lock (box border turns orange, 🔒 appears). Others stack in waiting room. Release = next thread enters. Deadlock = two threads each holding one, arrows circling.

### S8 · Kafka/Queue Broker
Producer → broker box with partition lanes → consumers pulling. Messages = dots. Offset pointer moves per consumer. Lag = gap between producer front and consumer position.

---

## DESIGN PATTERNS (Visual Metaphors)

| Pattern | Kid Analogy | Visual |
|---------|------------|--------|
| Singleton | One school principal | Single box, arrows from all pointing to it |
| Factory | Cookie cutter → different cookies | Cutter box → colored cookie shapes |
| Observer | Group chat notification | Central circle → arrows out to subscribers |
| Strategy | Choose game controller | Swap plugin block at runtime |
| Decorator | Wrap gift with bows | Nested boxes each adding layer |
| Command | TV remote button | Button → command object → receiver |
| Builder | Subway sandwich step-by-step | Sequential ingredient add animation |
| Adapter | Power plug converter | Incompatible shapes joined by middle block |
| Proxy | School secretary as gatekeeper | Request hits proxy box first → decides |

---

## JAVA UML QUICK REFERENCE

### Object Lifecycle (animate each arrow)
```
new ──▶ [heap alloc] ──▶ [constructor] ──▶ [ACTIVE]
                                               │
                                         null ref / out of scope
                                               │
                                               ▼
                                        [GC eligible] ──▶ [finalize?] ──▶ [collected]
```

### Thread State Machine
```
[NEW] ──start()──▶ [RUNNABLE] ──scheduled──▶ [RUNNING]
                       ▲                          │
                       │ notify/interrupt     sleep/wait/IO
                       │                          │
                  [BLOCKED] ◀──────────── [WAITING/TIMED_WAIT]
                                                  │
                                             [TERMINATED]
```

### JVM Memory Zones (animated boxes)
```
┌─ Metaspace ────────┐   ┌─ Heap ─────────────────────────┐
│ Class bytecode      │   │ Young Gen     │   Old Gen       │
│ Method metadata     │   │ Eden│S0│S1   │  Tenured        │
└────────────────────┘   └───────────────────────────────-─┘
┌─ Stack (per thread) ┐
│ Frame → Frame → ... │   ← each method call = new frame
└─────────────────────┘
```

### Exception Flow
```
try block ──throws──▶ matching catch? ──yes──▶ catch block ──▶ finally ──▶ continue
                           │
                           no
                           ▼
                    unwind call stack ──▶ next frame catch? ──▶ ... ──▶ JVM prints stacktrace
```

---

## COMPONENT TEMPLATES

### Narration Bar
```html
<div class="narration-bar" id="narration">
  <!-- filled by typewriter(el, text) per step -->
</div>
```
```css
.narration-bar {
  background: #21262d; border-left: 3px solid #1f6feb;
  padding: 10px 14px; font-size: 14px; color: #cdd9e5;
  font-family: 'Nunito', sans-serif; border-radius: 0 6px 6px 0;
  min-height: 40px; margin: 8px 0;
}
```

### State Badge
```html
<span class="badge badge-active">RUNNING</span>
<span class="badge badge-success">DONE</span>
<span class="badge badge-error">FAILED</span>
<span class="badge badge-wait">WAITING</span>
```
```css
.badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
.badge-active  { background: #1f3a5f; color: #58a6ff; border: 1px solid #1f6feb; }
.badge-success { background: #0d2818; color: #56d364; border: 1px solid #238636; }
.badge-error   { background: #2d0f0f; color: #f78166; border: 1px solid #da3633; }
.badge-wait    { background: #272012; color: #e3b341; border: 1px solid #d29922; }
```

### Code Highlight Block (step-synced)
```css
.code-block { font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.6; background: #0d1117; border: 1px solid #21262d; border-radius: 8px; padding: 12px; overflow: auto; }
.code-line { padding: 1px 6px; border-radius: 3px; transition: background 0.2s; }
.code-line.active { background: #1f3a5f; border-left: 2px solid #58a6ff; }
.code-line.error  { background: #2d0f0f; border-left: 2px solid #da3633; }
```

### Control Bar
```html
<div class="ctrl-bar">
  <button onclick="ctrl.prev()">◀ Prev</button>
  <button onclick="ctrl.play()">▶ Play</button>
  <button onclick="ctrl.stop()">⏸ Pause</button>
  <button onclick="ctrl.reset()">↺ Reset</button>
  <select onchange="ctrl.setSpeed(+this.value)">
    <option value="2000">Slow</option>
    <option value="1200" selected>Normal</option>
    <option value="500">Fast</option>
  </select>
  <span class="step-counter" id="stepCtr">Step 0 / N</span>
</div>
```
```css
.ctrl-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 8px 0; }
.ctrl-bar button { background: #21262d; color: #cdd9e5; border: 1px solid #30363d; padding: 5px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
.ctrl-bar button:hover { background: #30363d; }
.step-counter { margin-left: auto; font-size: 12px; color: #768390; font-family: monospace; }
```
