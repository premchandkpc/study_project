(function() {
  var topic = {
    id: "java-records-sealed-patterns",
    area: "java",
    title: "Records, Sealed Classes & Pattern Matching",
    tag: "Modern Java",
    tags: ["records", "sealed", "pattern matching", "switch", "ADT"],
    concept:
`**L1 (30s):** Records = immutable data. Sealed = closed type hierarchy. Pattern matching = smart instanceof. Together = algebraic data types in Java.
**L2 (2min):** Records auto-generate constructor, equals, hashCode, toString, accessors. Sealed classes declare permitted subtypes — compiler enforces exhaustive switch. Pattern matching: \`if (obj instanceof Point(int x, int y))\` deconstructs in one step.
**L3 (10min):** Records can't extend classes (only interfaces). Compact constructors for validation. Sealed + switch = compile-time exhaustiveness — add a new subtype, every switch breaks. Guard patterns: \`case Failed f when f.retryCount() >= 3\`. Works with generics.
**L4 (30min):** Records compile to final classes with private fields + public accessors. JIT scalar-replaces short-lived records (escape analysis). Pattern matching switch desugars to tableswitch/lookupswitch with type checks. JEP 445 (unnamed patterns) and JEP 456 (unnamed variables) continue evolving the feature.`,
    why:
`**Production case:** Payment processing event store. 12 event types, each handled differently. Before: big \`if/else instanceof\` ladder, easy to miss a case silently. After: sealed PaymentEvent + exhaustive switch — compiler enforces every new event type is handled. Zero runtime ClassCastExceptions.`,
    flow: {
      title: "Sealed + Pattern Switch: compile-time safety",
      caption: "Click each step to see the compiler guarantee",
      nodes: [
        { id:"seal",  label:"sealed interface",   hint:"Declares closed set: only listed subtypes allowed" },
        { id:"rec",   label:"record subtypes",     hint:"Each record implements the sealed type; immutable data carrier" },
        { id:"sw",    label:"switch(event)",        hint:"Compiler checks all permitted types covered — no default needed" },
        { id:"guard", label:"when guard",           hint:"Refine match: case Failed f when f.retries() >= 3" },
        { id:"exec",  label:"Execute branch",       hint:"Type-safe, no cast, deconstruction available" }
      ],
      steps: [
        { path:["seal"],        label:"Declare closed hierarchy",  detail:"sealed interface PaymentEvent permits Initiated, Failed" },
        { path:["seal","rec"],  label:"Define record subtypes",    detail:"record Initiated(String id, BigDecimal amt) implements PaymentEvent {}" },
        { path:["rec","sw"],    label:"Switch on the sealed type", detail:"switch(event) — compiler knows all subtypes" },
        { path:["sw","guard"],  label:"Apply guard conditions",    detail:"case Failed f when f.retryCount() >= 3 → markDead()" },
        { path:["guard","exec"],label:"Execute correct branch",    detail:"No ClassCastException possible — type proven at compile time" }
      ]
    },
    uml: {
      title: "Event sourcing with sealed events — exhaustive projection",
      scenario: "OrderService processes all OrderEvent subtypes safely",
      actors: [
        { id:"kafka", label:"Kafka\nConsumer",     hint:"delivers events as OrderEvent" },
        { id:"proj",  label:"OrderProjection",     hint:"switch(event) — sealed guarantees coverage" },
        { id:"state", label:"OrderState\n(record)", hint:"immutable; each step returns new state" },
        { id:"db",    label:"ReadModel\nDB",        hint:"projected state stored for queries" }
      ],
      messages: [
        { from:"kafka", to:"proj",  label:"OrderEvent (sealed)",       detail:"Could be Created, Shipped, Cancelled, Returned" },
        { from:"proj",  to:"proj",  label:"switch(event) — exhaustive", detail:"Compiler verifies all 4 types handled" },
        { from:"proj",  to:"state", label:"state.apply(event)",         detail:"Returns new immutable OrderState record" },
        { from:"state", to:"proj",  label:"new OrderState(...)",         detail:"Record = immutable snapshot, no mutation" },
        { from:"proj",  to:"db",    label:"upsert(state)",              detail:"Persist projected state" },
        { from:"db",    to:"proj",  label:"ack",                        detail:"Event processed" }
      ]
    },
    architecture: {
      title: "Modern Java type system features",
      caption: "Layers of the ADT pattern",
      lanes: [
        {
          label:"Records", hint:"Immutable value types",
          nodes:[
            {id:"rec1",label:"record Point(int x, int y) {}",   badge:"Java 16+", hint:"Auto: constructor, equals, hashCode, toString, accessors x(), y()"},
            {id:"rec2",label:"Compact constructor",              badge:"validate",  hint:"public Point { Objects.requireNonNull(x); } — runs before auto-assign"}
          ]
        },
        {
          label:"Sealed Classes", hint:"Closed type hierarchy",
          nodes:[
            {id:"seal1",label:"sealed interface Shape\n  permits Circle, Rect {}", badge:"Java 17+", hint:"Only Circle and Rect may implement — checked by compiler"},
            {id:"seal2",label:"non-sealed / final",              badge:"escape",    hint:"non-sealed reopens hierarchy; final locks it permanently"}
          ]
        },
        {
          label:"Pattern Matching", hint:"Deconstruct types safely",
          nodes:[
            {id:"pm1",label:"instanceof pattern",                badge:"Java 16+", hint:"if (obj instanceof String s) — s is scoped, no cast needed"},
            {id:"pm2",label:"switch pattern",                    badge:"Java 21+", hint:"switch(shape){ case Circle c -> ...; case Rect r -> ...; } exhaustive"}
          ]
        },
        {
          label:"Deconstruction Patterns", hint:"Java 21+",
          nodes:[
            {id:"dp1",label:"Record pattern",                    badge:"Java 21+", hint:"case Point(int x, int y) p — binds x and y directly"},
            {id:"dp2",label:"Nested patterns",                   badge:"compose",  hint:"case Line(Point(int x1, _), Point(int x2, _)) — deep deconstruction"}
          ]
        }
      ],
      links:[
        {from:"seal1",to:"rec1",  label:"records implement sealed", type:"sync"},
        {from:"rec1", to:"pm2",   label:"pattern deconstructs record", type:"sync"},
        {from:"pm2",  to:"dp1",   label:"record pattern binding",  type:"sync"}
      ]
    },
    visual: function(mount) {
      var S = {tab:0, qi:0, revealed:false};
      var EVENTS = [
        {label:'Initiated',  color:'#1f6feb', code:'record Initiated(String id, BigDecimal amount) implements PaymentEvent {}'},
        {label:'Authorized', color:'#3fb950', code:'record Authorized(String id, String authCode) implements PaymentEvent {}'},
        {label:'Captured',   color:'#f1b150', code:'record Captured(String id, Instant capturedAt) implements PaymentEvent {}'},
        {label:'Failed',     color:'#f85149', code:'record Failed(String id, String reason, int retryCount) implements PaymentEvent {}'}
      ];
      var TRICKS = [
        {wrong:'Records can extend classes: "record Point extends Shape(...)"',
         right:'Records extend java.lang.Record implicitly — cannot extend any class. They CAN implement interfaces (including sealed ones).'},
        {wrong:'@Transactional on a record works fine',
         right:'Records are final+immutable — JPA entities CANNOT be records. AOP proxying requires mutable subclass. Use records for DTOs/value objects only.'},
        {wrong:'switch without default → compilation error on sealed types',
         right:'Exhaustive switch on sealed type with all subtypes covered = NO default needed. Missing a subtype = compile error — that\'s the whole point.'},
        {wrong:'Compact constructor replaces the canonical constructor',
         right:'Compact constructor runs BEFORE auto-assignment. Use it for validation. Parameters are the same names — you can\'t add new ones.'}
      ];
      var QS = [
        {q:'Can records be used as JPA entities?',
         a:'No. JPA requires no-arg constructor, mutable fields, and often proxying (final class blocked). Use records for DTOs, value objects, projections — not entities.'},
        {q:'What happens if you add a new subtype to a sealed interface?',
         a:'Every exhaustive switch on that sealed type becomes a compile error — "not exhaustive". This is intentional — it forces every caller to handle the new case. This is the key benefit.'},
        {q:'Pattern matching switch vs traditional switch — key difference?',
         a:'Traditional: matches constants (ints, enums, Strings). Pattern: matches types + deconstructs + guard conditions. Pattern switch requires exhaustiveness on sealed types.'}
      ];
      function css(){
        if(document.getElementById('rsp-style'))return;
        var s=document.createElement('style');s.id='rsp-style';
        s.textContent=`
.rsp{font-family:'Courier New',monospace;background:#0d1117;color:#e6edf3;border-radius:10px;overflow:hidden}
.rsp-tabs{display:flex;background:#161b22;border-bottom:1px solid #30363d}
.rsp-tab{flex:1;padding:10px;border:none;background:none;color:#8b949e;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;border-bottom:2px solid transparent;transition:all .15s}
.rsp-tab.on{color:#a371f7;border-bottom-color:#a371f7}
.rsp-body{padding:18px;min-height:320px}
.rsp-ev{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.rsp-ev-btn{padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;border:2px solid transparent;transition:all .15s}
.rsp-code{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;color:#79c0ff;margin-bottom:10px;white-space:pre}
.rsp-switch{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;color:#e6edf3}
.rsp-case{padding:4px 0;color:#8b949e;transition:all .2s}
.rsp-case.active{color:#f1b150;font-weight:700}
.rsp-trick{background:#161b22;border-radius:8px;padding:12px;margin-bottom:8px}
.rsp-bad{background:#da363622;border:1px solid #f8514966;border-radius:6px;padding:8px;font-size:12px;color:#f85149;margin-bottom:5px}
.rsp-bad::before{content:"⚠️ Wrong: ";font-weight:700}
.rsp-good{background:#23863622;border:1px solid #3fb95066;border-radius:6px;padding:8px;font-size:12px;color:#3fb950}
.rsp-good::before{content:"✓ Right: ";font-weight:700}
.rsp-qbox{background:#1f6feb22;border:1px solid #58a6ff66;border-radius:8px;padding:14px;text-align:center}
.rsp-qtext{font-size:14px;color:#58a6ff;font-weight:700;margin-bottom:12px}
.rsp-ans{background:#161b22;border:1px solid #3fb95066;border-radius:8px;padding:12px;font-size:12px;color:#3fb950;margin-top:10px;display:none;text-align:left}
.rsp-btn{background:#238636;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit}
.rsp-btn2{background:#a371f7;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:12px;font-weight:700;font-family:inherit;margin-left:8px}
        `;
        document.head.appendChild(s);
      }
      var selEv = 0;
      function render(){
        css();
        mount.innerHTML=`<div class="rsp"><div class="rsp-tabs">`
          +`<button class="rsp-tab ${S.tab===0?'on':''}" id="rsp-t0">🔷 Sealed Switch</button>`
          +`<button class="rsp-tab ${S.tab===1?'on':''}" id="rsp-t1">📦 Record Lifecycle</button>`
          +`<button class="rsp-tab ${S.tab===2?'on':''}" id="rsp-t2">⚠️ Tricky + Interview</button>`
          +`</div><div class="rsp-body" id="rsp-body"></div></div>`;
        mount.querySelector('#rsp-t0').onclick=()=>{S.tab=0;render()};
        mount.querySelector('#rsp-t1').onclick=()=>{S.tab=1;render()};
        mount.querySelector('#rsp-t2').onclick=()=>{S.tab=2;render()};
        renderBody();
      }
      function renderBody(){
        var b=mount.querySelector('#rsp-body');
        if(S.tab===0){
          b.innerHTML='<div style="font-size:11px;color:#8b949e;margin-bottom:10px">Click an event type — see the sealed switch handle it</div>'
            +'<div class="rsp-ev">'+EVENTS.map((ev,i)=>`<button class="rsp-ev-btn" id="rev${i}" style="background:${selEv===i?ev.color+'33':'#21262d'};border-color:${selEv===i?ev.color:'#30363d'};color:${selEv===i?ev.color:'#8b949e'}">${ev.label}</button>`).join('')+'</div>'
            +`<div class="rsp-code">${EVENTS[selEv].code}</div>`
            +`<div class="rsp-switch">switch (event) {<br>${EVENTS.map((ev,i)=>`  <span class="rsp-case ${i===selEv?'active':''}">case ${ev.label} e → handle${ev.label}(e);</span>`).join('<br>')}<br>}</div>`
            +`<div style="margin-top:10px;font-size:12px;color:${selEv===3?'#f85149':'#3fb950'}">${selEv===3?'⚠️ Failed: check retryCount for dead-letter decision':'✓ Compiler verified — no default needed, all cases covered'}</div>`;
          EVENTS.forEach((_,i)=>{mount.querySelector('#rev'+i).onclick=()=>{selEv=i;renderBody()}});
        } else if(S.tab===1){
          var stages=[
            {label:'Define',  code:'record Point(int x, int y) {}',          info:'Compiler generates: constructor, x(), y(), equals(), hashCode(), toString()'},
            {label:'Create',  code:'var p = new Point(3, 4);',                 info:'Canonical constructor called. Fields are private final — no setters ever.'},
            {label:'Access',  code:'int x = p.x(); // not getX()',             info:'Accessor methods named after components — no "get" prefix. This is spec.'},
            {label:'Deconstruct',code:'if (p instanceof Point(int x, int y))', info:'Java 21 record pattern: binds x and y from the record fields directly.'},
            {label:'Switch',  code:'case Point(int x, int y) p when x > 0',   info:'Pattern + guard in switch. Exhaustive if Point is a sealed subtype.'}
          ];
          var si=0;
          function drawLC(){
            b.innerHTML='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">'+stages.map((st,i)=>`<div style="padding:7px 12px;border-radius:6px;background:${si===i?'#a371f722':'#21262d'};border:2px solid ${si===i?'#a371f7':'#30363d'};color:${si===i?'#a371f7':'#8b949e'};font-size:11px;font-weight:700;cursor:pointer" id="lc${i}">${st.label}</div>`).join('')+'</div>'
              +`<div class="rsp-code">${stages[si].code}</div>`
              +`<div style="background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;font-size:12px;line-height:1.6">${stages[si].info}</div>`
              +`<div style="margin-top:10px;display:flex;gap:8px"><button class="rsp-btn" id="lcP">◀</button><button class="rsp-btn2" id="lcN">Next ▶</button><span style="font-size:11px;color:#8b949e;margin-left:auto;align-self:center">${si+1}/${stages.length}</span></div>`;
            stages.forEach((_,i)=>{mount.querySelector('#lc'+i).onclick=()=>{si=i;drawLC()}});
            mount.querySelector('#lcP').onclick=()=>{si=Math.max(0,si-1);drawLC()};
            mount.querySelector('#lcN').onclick=()=>{si=Math.min(stages.length-1,si+1);drawLC()};
          }
          drawLC();
        } else {
          b.innerHTML='<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin-bottom:10px">Common Mistakes</div>'
            +TRICKS.map((t,i)=>`<div class="rsp-trick"><div style="font-size:10px;color:#8b949e;margin-bottom:5px">Trap ${i+1}</div><div class="rsp-bad">${t.wrong}</div><div class="rsp-good">${t.right}</div></div>`).join('')
            +'<div style="font-size:11px;color:#8b949e;font-weight:700;text-transform:uppercase;margin:14px 0 10px">Interview Mode</div>'
            +`<div class="rsp-qbox"><div class="rsp-qtext" id="rsp-qt">${QS[S.qi].q}</div><button class="rsp-btn" id="rsp-rev">Reveal Answer</button><button class="rsp-btn2" id="rsp-nxt">Next Q ▶</button><div class="rsp-ans" id="rsp-an">${QS[S.qi].a}</div></div>`;
          mount.querySelector('#rsp-rev').onclick=()=>{S.revealed=true;mount.querySelector('#rsp-an').style.display='block'};
          mount.querySelector('#rsp-nxt').onclick=()=>{S.qi=(S.qi+1)%QS.length;S.revealed=false;renderBody()};
        }
      }
      render();
    },
    gotchas: [
      "Records CANNOT extend classes (final + extends Record). Only implement interfaces.",
      "JPA entities cannot be records — JPA needs no-arg constructor + mutable fields + proxy subclass",
      "Exhaustive switch only enforces at compile time for sealed types — not for open hierarchies",
      "Compact constructor runs before field assignment — you can validate but not rebind the same names",
      "Non-sealed reopens the hierarchy — switch on it is no longer exhaustive without default",
      "Pattern matching switch is null-hostile — null hits NullPointerException unless you add `case null` arm"
    ],
    example: {
      language: "java",
      code:
`sealed interface PaymentEvent permits Initiated, Authorized, Captured, Failed {}

record Initiated(String id, BigDecimal amount, String currency) implements PaymentEvent {}
record Authorized(String id, String authCode) implements PaymentEvent {}
record Captured(String id, Instant at) implements PaymentEvent {}
record Failed(String id, String reason, int retryCount) implements PaymentEvent {}

// Exhaustive — compiler enforces coverage of all 4 types
State apply(State s, PaymentEvent event) {
    return switch (event) {
        case Initiated(var id, var amt, var ccy) -> s.withAmount(amt, ccy);
        case Authorized(var id, var code)        -> s.withAuth(code);
        case Captured(var id, var at)            -> s.captured(at);
        case Failed f when f.retryCount() >= 3   -> s.markDead();
        case Failed f                            -> s.scheduleRetry();
    };
}`
    },
    interview: [
      { question:"Why are records better than Lombok @Data?",
        answer:"Records are a language feature — no annotation processor, IDE plugin, or @Builder collisions. Immutable by default, work with pattern matching, JIT-optimised via scalar replacement. Lombok remains useful for mutable JPA entities.",
        followUps:["Can a record extend a class?","Compact constructor for validation?","Records and serialization?"] },
      { question:"What does sealed buy you over abstract class?",
        answer:"Exhaustiveness checks. Compiler knows the closed set of permitted subtypes — switch without default is verified. Add a new event type and every consumer breaks at compile time. That's a feature.",
        followUps:["non-sealed vs sealed vs final?","Module visibility constraints?"] },
      { question:"Guards in pattern switch — what's the execution order?",
        answer:"Type check first, then guard evaluation. `case Failed f when f.retryCount() >= 3` — first checks `instanceof Failed`, then evaluates the when clause. Guards short-circuit — if type doesn't match, guard is never evaluated.",
        followUps:["What is the dominance rule?","Can two cases match the same value?"] }
    ],
    tradeoffs: {
      pros:["Compile-time exhaustiveness for sealed types","Immutability by default for records","Cleaner DSLs and event sourcing code","No annotation processors"],
      cons:["Records can't extend classes","Pattern switch preview until Java 21","JPA entities incompatible with records","Migration from Lombok-heavy codebases non-trivial"],
      when:`**Domain events, value objects, state machines, DTOs.** Use classes when you need inheritance or mutable state.`
    }
  };
  window.JAVA_TOPICS = (window.JAVA_TOPICS || []).concat([topic]);
})();
