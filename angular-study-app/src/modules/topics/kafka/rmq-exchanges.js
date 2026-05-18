(function() {
  var topic = {
    id: "rmq-exchanges",
    area: "kafka",
    title: "RabbitMQ Exchanges",
    tag: "rabbitmq",
    tags: ["rabbitmq","exchange","direct","fanout","topic","headers","routing"],
    visual: function(mount) {
      mount.innerHTML = `
<style>
.rew{font-family:Inter,sans-serif;background:#0d1117;color:#cdd9e5;padding:18px;border-radius:10px;min-height:520px}
.re-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.rebtn{background:#161b22;border:1px solid #30363d;color:#8b949e;padding:7px 14px;border-radius:7px;cursor:pointer;font-size:13px;transition:all .2s}
.rebtn.on{background:#f5913422;border-color:#f59134;color:#f59134;font-weight:600}
.rep{display:none}.rep.on{display:block}
.re-box{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:10px}
.re-box h4{margin:0 0 8px;font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.8px}
.re-info{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.5;margin-bottom:10px;min-height:36px}
.re-info b{color:#f59134}
.re-ctrls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.re-ctrls button{background:#161b22;border:1px solid #30363d;color:#cdd9e5;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px}
.re-ctrls button:hover{border-color:#f59134;color:#f59134}
.re-step-info{font-size:11px;color:#8b949e;margin-left:auto}
.re-producer{padding:10px 16px;border-radius:8px;border:2px solid #58a6ff;background:#58a6ff15;color:#58a6ff;font-size:12px;font-weight:600;text-align:center}
.re-exchange{padding:10px 16px;border-radius:8px;border:2px solid #f59134;background:#f5913415;color:#f59134;font-size:12px;font-weight:600;text-align:center;transition:all .3s}
.re-exchange.active{box-shadow:0 0 14px #f59134;transform:scale(1.05)}
.re-queue{padding:8px 12px;border-radius:6px;border:2px solid;font-size:11px;font-weight:600;text-align:center;transition:all .3s;min-width:80px}
.re-queue.receiving{border-color:#3dd68c;background:#3dd68c15;color:#3dd68c;box-shadow:0 0 8px #3dd68c44}
.re-queue.idle{border-color:#30363d;background:#0d1117;color:#8b949e}
.re-queue.dropped{border-color:#f47067;background:#f4706715;color:#f47067;opacity:.4}
.re-msg{display:inline-block;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:700;border:1px solid;animation:msg-fly .4s ease;transition:all .3s}
@keyframes msg-fly{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
.re-msg.direct{border-color:#58a6ff;color:#58a6ff;background:#58a6ff15}
.re-msg.fanout{border-color:#f59134;color:#f59134;background:#f5913415}
.re-msg.topic{border-color:#d2a8ff;color:#d2a8ff;background:#d2a8ff15}
.re-msg.dead{border-color:#f47067;color:#f47067;background:#f4706715;text-decoration:line-through;opacity:.5}
.re-binding{font-size:10px;background:#f5913422;color:#f59134;border-radius:4px;padding:2px 6px;margin:2px;display:inline-block}
.re-arrow{font-size:18px;color:#f59134;margin:0 6px}
.re-stab{background:#0d1117;border:1px solid #30363d;color:#8b949e;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px}
.re-stab.on{background:#f5913422;border-color:#f59134;color:#f59134}
.re-trick{background:#161b22;border-left:3px solid #f59134;border-radius:4px;padding:10px 14px;margin-bottom:8px;font-size:13px}
.re-trick b{color:#f5b944}
.re-q-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer}
.re-q-card .q{font-size:13px;font-weight:600}
.re-q-card .a{font-size:12px;color:#8b949e;margin-top:8px;display:none;line-height:1.6}
.re-q-card.open .a{display:block}.re-q-card.open{border-color:#f59134}
</style>
<div class="rew">
  <div class="re-tabs">
    <button class="rebtn on" data-tab="direct">Direct Exchange</button>
    <button class="rebtn" data-tab="fanout">Fanout Exchange</button>
    <button class="rebtn" data-tab="topic">Topic Exchange</button>
    <button class="rebtn" data-tab="headers">Headers Exchange</button>
    <button class="rebtn" data-tab="tricks">⚠️ Tricks + Interview</button>
  </div>

  <!-- DIRECT -->
  <div class="rep on" id="re-direct">
    <div class="re-info" id="re-dinfo">Direct exchange routes by exact routing key match. Message routing key == binding key → delivered. Perfect for task queues.</div>
    <div class="re-box">
      <h4>Direct Exchange Routing</h4>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div class="re-producer">Producer<br><span style="font-size:10px;opacity:.7">sends messages</span></div>
          <div class="re-arrow">→</div>
          <div class="re-exchange" id="re-direct-exch">Direct Exchange<br><span style="font-size:10px;opacity:.7">orders.direct</span></div>
          <div class="re-arrow">→</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <div style="display:flex;align-items:center;gap:6px">
              <span class="re-binding" id="re-dk-0">key: "payment"</span>
              <div class="re-queue idle" id="re-dq-0">payment-queue<div id="re-dm-0"></div></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="re-binding" id="re-dk-1">key: "shipping"</span>
              <div class="re-queue idle" id="re-dq-1">shipping-queue<div id="re-dm-1"></div></div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span class="re-binding" id="re-dk-2">key: "email"</span>
              <div class="re-queue idle" id="re-dq-2">email-queue<div id="re-dm-2"></div></div>
            </div>
          </div>
        </div>
      </div>
      <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="re-stab on" data-dkey="payment" style="border-color:#58a6ff;color:#58a6ff">Send "payment"</button>
        <button class="re-stab" data-dkey="shipping">Send "shipping"</button>
        <button class="re-stab" data-dkey="email">Send "email"</button>
        <button class="re-stab" data-dkey="unknown">Send "unknown" (unroutable)</button>
      </div>
    </div>
    <div class="re-info" id="re-dstatus">Click a button to send a message with that routing key.</div>
  </div>

  <!-- FANOUT -->
  <div class="rep" id="re-fanout">
    <div class="re-info">Fanout exchange broadcasts to ALL bound queues. Ignores routing key. Pub/Sub pattern. Perfect for notifications, live updates, cache invalidation.</div>
    <div class="re-box">
      <h4>Fanout Exchange — All Queues Receive</h4>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div class="re-producer">Producer<br><span style="font-size:10px;opacity:.7">any routing key</span></div>
        <div class="re-arrow">→</div>
        <div class="re-exchange" id="re-fanout-exch">Fanout Exchange<br><span style="font-size:10px;opacity:.7">notifications.fanout</span></div>
        <div class="re-arrow">→</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div class="re-queue idle" id="re-fq-0">email-service<div id="re-fm-0"></div></div>
          <div class="re-queue idle" id="re-fq-1">sms-service<div id="re-fm-1"></div></div>
          <div class="re-queue idle" id="re-fq-2">push-service<div id="re-fm-2"></div></div>
          <div class="re-queue idle" id="re-fq-3">analytics<div id="re-fm-3"></div></div>
        </div>
      </div>
      <div style="margin-top:10px">
        <button id="re-fanout-send" class="re-stab on" style="background:#f5913422;border-color:#f59134;color:#f59134">📢 Broadcast Message</button>
        <button id="re-fanout-reset" class="re-stab" style="margin-left:8px">↺ Reset</button>
      </div>
    </div>
    <div class="re-info" id="re-fstatus">All bound queues receive a copy. Routing key ignored.</div>
  </div>

  <!-- TOPIC -->
  <div class="rep" id="re-topic">
    <div class="re-info">Topic exchange routes by pattern matching on routing key. <b>*</b> = exactly one word. <b>#</b> = zero or more words. Most flexible exchange type.</div>
    <div class="re-box">
      <h4>Topic Exchange — Pattern Routing</h4>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <button class="re-stab on" data-tkey="order.payment.success">order.payment.success</button>
        <button class="re-stab" data-tkey="order.shipping.started">order.shipping.started</button>
        <button class="re-stab" data-tkey="user.login.mobile">user.login.mobile</button>
        <button class="re-stab" data-tkey="order.refund">order.refund</button>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap">
        <div style="display:flex;flex-direction:column;gap:4px">
          <div class="re-producer">Producer</div>
          <div id="re-tkey-display" style="font-size:11px;color:#d2a8ff;text-align:center;margin-top:4px">order.payment.success</div>
        </div>
        <div class="re-arrow" style="padding-top:10px">→</div>
        <div class="re-exchange" id="re-topic-exch">Topic Exchange</div>
        <div class="re-arrow" style="padding-top:10px">→</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="re-binding">order.#</span>
            <div class="re-queue idle" id="re-tq-0">order-all<div id="re-tm-0"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="re-binding">order.payment.*</span>
            <div class="re-queue idle" id="re-tq-1">payment-events<div id="re-tm-1"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="re-binding">*.shipping.*</span>
            <div class="re-queue idle" id="re-tq-2">shipping-events<div id="re-tm-2"></div></div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span class="re-binding">user.#</span>
            <div class="re-queue idle" id="re-tq-3">user-events<div id="re-tm-3"></div></div>
          </div>
        </div>
      </div>
    </div>
    <div class="re-info" id="re-tstatus">Select a routing key to see which queues receive the message.</div>
  </div>

  <!-- HEADERS -->
  <div class="rep" id="re-headers">
    <div class="re-info">Headers exchange routes based on message header attributes, NOT routing key. Binding has x-match: "all" (AND) or "any" (OR).</div>
    <div class="re-box">
      <h4>Headers Exchange Example</h4>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px">
        <div>
          <div style="font-size:12px;font-weight:600;color:#f59134;margin-bottom:6px">Queue Bindings</div>
          <div style="background:#0d1117;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px">
            <div style="color:#3dd68c;font-weight:600;margin-bottom:3px">mobile-queue</div>
            <div style="color:#8b949e">x-match: all<br>platform=mobile<br>type=notification</div>
          </div>
          <div style="background:#0d1117;border-radius:6px;padding:8px;margin-bottom:6px;font-size:11px">
            <div style="color:#58a6ff;font-weight:600;margin-bottom:3px">urgent-queue</div>
            <div style="color:#8b949e">x-match: any<br>priority=high OR type=alert</div>
          </div>
          <div style="background:#0d1117;border-radius:6px;padding:8px;font-size:11px">
            <div style="color:#d2a8ff;font-weight:600;margin-bottom:3px">analytics-queue</div>
            <div style="color:#8b949e">x-match: any<br>type=notification OR type=alert</div>
          </div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:600;color:#f59134;margin-bottom:6px">Send Message</div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button class="re-stab on" data-hdr="mobile-notif" style="text-align:left">platform=mobile, type=notification</button>
            <button class="re-stab" data-hdr="high-prio" style="text-align:left">priority=high, platform=web</button>
            <button class="re-stab" data-hdr="alert" style="text-align:left">type=alert, source=monitor</button>
            <button class="re-stab" data-hdr="low-prio" style="text-align:left">priority=low, platform=desktop</button>
          </div>
          <div class="re-info" id="re-hstatus" style="margin-top:8px;font-size:12px">Select message headers to route.</div>
        </div>
      </div>
    </div>
    <div class="re-trick" style="border-color:#58a6ff"><b>Headers exchange is rarely used</b> — more flexible than topic but much slower (header parsing) and complex to reason about. Use topic exchange instead unless you specifically need multi-attribute matching.</div>
  </div>

  <!-- TRICKS + INTERVIEW -->
  <div class="rep" id="re-tricks">
    <h4 style="color:#f59134;margin:0 0 10px">⚠️ Tricky Parts</h4>
    <div class="re-trick"><b>Default exchange</b> — every queue is automatically bound to default exchange with routing key = queue name. Send to "" (empty string) exchange with routing key = queue name → direct delivery.</div>
    <div class="re-trick"><b>Fanout vs Topic broadcast</b> — fanout = all bound queues. Topic with "#" = same effect. Fanout faster (no pattern matching). Use fanout for pure broadcast.</div>
    <div class="re-trick"><b>Unroutable messages</b> — if no queue matches: default = silently dropped. Use mandatory=true → get basic.return callback. Or configure alternate-exchange (AE) to catch unroutable messages.</div>
    <div class="re-trick"><b>Exchange-to-Exchange binding</b> — exchanges can be bound to other exchanges. Allows routing fan-out trees. E.g., fanout → multiple direct exchanges → specific queues.</div>
    <div class="re-trick"><b>Durable exchanges</b> — survive broker restart. Transient queues bound to durable exchange lose bindings on restart. Both exchange AND queue must be durable for full persistence.</div>
    <div class="re-trick"><b>Topic * vs #</b> — * matches exactly ONE word (dot-separated). # matches zero or more words. "order.*" matches "order.shipped" but NOT "order.sub.shipped". "order.#" matches both.</div>
    <h4 style="color:#f59134;margin:14px 0 10px">Interview Q&A</h4>
    <div class="re-q-card"><div class="q">Q: Explain 4 RabbitMQ exchange types and when to use each.</div><div class="a">Direct: exact routing key match → specific queue. Use for task queues, work distribution. Fanout: broadcast to all bound queues, ignores key. Use for pub/sub, cache invalidation, live updates. Topic: wildcard pattern matching (* = 1 word, # = 0+). Use for event routing with categories. Headers: match on message headers with x-match all/any. Use when routing needs multi-attribute logic (rare in practice).</div></div>
    <div class="re-q-card"><div class="q">Q: What happens to unroutable messages in RabbitMQ?</div><div class="a">Default: silently dropped. Options: 1. mandatory=true flag → message returned to producer via basic.return callback. 2. Alternate exchange (AE): exchange-level config. Unroutable messages forwarded to AE. Useful for catching dead letters at exchange level rather than queue level.</div></div>
    <div class="re-q-card"><div class="q">Q: Difference between durable exchange and persistent messages?</div><div class="a">Durable exchange: survives broker restart (metadata persisted). Persistent message (delivery_mode=2): payload persisted to disk. Need BOTH: durable exchange + durable queue + persistent message for full durability. Queue consumers can still read non-persistent messages from durable queues — just not after broker restart.</div></div>
    <div class="re-q-card"><div class="q">Q: How does topic exchange differ from direct for logging?</div><div class="a">Direct: "error" routing key → error-queue. Must create binding per exact key. Topic: "logs.error.database" → "logs.#" (all logs), "logs.error.*" (all errors), "logs.*.database" (all database logs). One message reaches multiple queues based on pattern. Topic = Kafka consumer group fan-in, Direct = point-to-point.</div></div>
  </div>
</div>`;

      // DIRECT EXCHANGE
      var QUEUE_MAP={payment:0,shipping:1,email:2};
      function sendDirect(key){
        Object.keys(QUEUE_MAP).forEach(function(k){
          var qEl=mount.querySelector("#re-dq-"+QUEUE_MAP[k]);
          var mEl=mount.querySelector("#re-dm-"+QUEUE_MAP[k]);
          qEl.className="re-queue idle";
          mEl.innerHTML="";
        });
        mount.querySelector("#re-direct-exch").classList.add("active");
        setTimeout(function(){
          mount.querySelector("#re-direct-exch").classList.remove("active");
          if(QUEUE_MAP[key]!==undefined){
            var idx=QUEUE_MAP[key];
            var qEl=mount.querySelector("#re-dq-"+idx);
            qEl.className="re-queue receiving";
            mount.querySelector("#re-dm-"+idx).innerHTML="<div class=\"re-msg direct\">"+key+"</div>";
            mount.querySelector("#re-dstatus").innerHTML="✓ Message with key \"<b>"+key+"</b>\" routed to <b>"+key+"-queue</b>.";
          } else {
            mount.querySelector("#re-dstatus").innerHTML="⚠️ Routing key \"<b>"+key+"</b>\" has no binding → message <b>dropped</b>.";
          }
        },400);
      }
      mount.querySelectorAll(".re-stab[data-dkey]").forEach(function(b){
        b.addEventListener("click",function(){
          mount.querySelectorAll(".re-stab[data-dkey]").forEach(function(x){x.classList.remove("on");});
          b.classList.add("on");
          sendDirect(b.dataset.dkey);
        });
      });

      // FANOUT
      mount.querySelector("#re-fanout-send").addEventListener("click",function(){
        mount.querySelector("#re-fanout-exch").classList.add("active");
        [0,1,2,3].forEach(function(i){
          var qEl=mount.querySelector("#re-fq-"+i);
          var mEl=mount.querySelector("#re-fm-"+i);
          qEl.className="re-queue idle";
          mEl.innerHTML="";
        });
        setTimeout(function(){
          mount.querySelector("#re-fanout-exch").classList.remove("active");
          [0,1,2,3].forEach(function(i){
            mount.querySelector("#re-fq-"+i).className="re-queue receiving";
            mount.querySelector("#re-fm-"+i).innerHTML="<div class=\"re-msg fanout\">msg</div>";
          });
          mount.querySelector("#re-fstatus").innerHTML="✓ All 4 queues received a copy. <b>Routing key ignored.</b>";
        },400);
      });
      mount.querySelector("#re-fanout-reset").addEventListener("click",function(){
        [0,1,2,3].forEach(function(i){
          mount.querySelector("#re-fq-"+i).className="re-queue idle";
          mount.querySelector("#re-fm-"+i).innerHTML="";
        });
        mount.querySelector("#re-fstatus").innerHTML="All bound queues receive a copy. Routing key ignored.";
      });

      // TOPIC
      var TOPIC_PATTERNS=[
        {pattern:"order.#",idx:0},
        {pattern:"order.payment.*",idx:1},
        {pattern:"*.shipping.*",idx:2},
        {pattern:"user.#",idx:3},
      ];
      function topicMatch(pattern,key){
        var pParts=pattern.split(".");
        var kParts=key.split(".");
        function match(pi,ki){
          if(pi===pParts.length&&ki===kParts.length)return true;
          if(pi<pParts.length&&pParts[pi]==="#"){
            for(var j=ki;j<=kParts.length;j++){if(match(pi+1,j))return true;}
            return false;
          }
          if(pi>=pParts.length||ki>=kParts.length)return false;
          if(pParts[pi]==="*"||pParts[pi]===kParts[ki])return match(pi+1,ki+1);
          return false;
        }
        return match(0,0);
      }
      var curTKey="order.payment.success";
      function sendTopic(key){
        curTKey=key;
        mount.querySelector("#re-tkey-display").textContent=key;
        mount.querySelector("#re-topic-exch").classList.add("active");
        TOPIC_PATTERNS.forEach(function(tp){
          var qEl=mount.querySelector("#re-tq-"+tp.idx);
          var mEl=mount.querySelector("#re-tm-"+tp.idx);
          qEl.className="re-queue idle";mEl.innerHTML="";
        });
        setTimeout(function(){
          mount.querySelector("#re-topic-exch").classList.remove("active");
          var matched=[];
          TOPIC_PATTERNS.forEach(function(tp){
            if(topicMatch(tp.pattern,key)){
              mount.querySelector("#re-tq-"+tp.idx).className="re-queue receiving";
              mount.querySelector("#re-tm-"+tp.idx).innerHTML="<div class=\"re-msg topic\">"+key.split(".").pop()+"</div>";
              matched.push(tp.pattern);
            }
          });
          mount.querySelector("#re-tstatus").innerHTML=matched.length?"✓ Matched patterns: <b>"+matched.join(", ")+"</b>":"⚠️ No pattern matched — message <b>dropped</b>.";
        },400);
      }
      mount.querySelectorAll(".re-stab[data-tkey]").forEach(function(b){
        b.addEventListener("click",function(){mount.querySelectorAll(".re-stab[data-tkey]").forEach(function(x){x.classList.remove("on");});b.classList.add("on");sendTopic(b.dataset.tkey);});
      });
      sendTopic("order.payment.success");

      // HEADERS
      var HDR_SCENARIOS={
        "mobile-notif":{headers:{platform:"mobile",type:"notification"},matched:["mobile-queue","analytics-queue"],info:"x-match:all: platform=mobile ✓ AND type=notification ✓ → mobile-queue. x-match:any: type=notification ✓ → analytics-queue."},
        "high-prio":{headers:{priority:"high",platform:"web"},matched:["urgent-queue"],info:"x-match:any: priority=high ✓ → urgent-queue. analytics: type not in {notification,alert} → no match."},
        "alert":{headers:{type:"alert",source:"monitor"},matched:["urgent-queue","analytics-queue"],info:"x-match:any: type=alert ✓ → urgent-queue. analytics: type=alert ✓ → analytics-queue. Mobile: type=alert ≠ notification → no match."},
        "low-prio":{headers:{priority:"low",platform:"desktop"},matched:[],info:"No headers match any binding rules. Message dropped (or sent to alternate-exchange if configured)."},
      };
      mount.querySelectorAll(".re-stab[data-hdr]").forEach(function(b){
        b.addEventListener("click",function(){
          mount.querySelectorAll(".re-stab[data-hdr]").forEach(function(x){x.classList.remove("on");});
          b.classList.add("on");
          var s=HDR_SCENARIOS[b.dataset.hdr];
          var hdrsStr=Object.entries(s.headers).map(function(e){return e[0]+"="+e[1];}).join(", ");
          mount.querySelector("#re-hstatus").innerHTML="<b>Headers:</b> {"+hdrsStr+"}<br><b>Matched:</b> "+(s.matched.length?s.matched.join(", "):"none (dropped)")+"<br>"+s.info;
        });
      });

      // TABS
      mount.querySelectorAll(".rebtn[data-tab]").forEach(function(btn){
        btn.addEventListener("click",function(){
          mount.querySelectorAll(".rebtn[data-tab]").forEach(function(b){b.classList.remove("on");});
          mount.querySelectorAll(".rep").forEach(function(p){p.classList.remove("on");});
          btn.classList.add("on");
          mount.querySelector("#re-"+btn.dataset.tab).classList.add("on");
        });
      });
      mount.querySelectorAll(".re-q-card").forEach(function(c){c.addEventListener("click",function(){c.classList.toggle("open");});});
    },
    concept: `**L1 (30s ELI5):** Exchange = post office router. Message arrives with routing key. Exchange decides which queue(s) to deliver to based on type and bindings.

**L2 (2min core):** 4 types: Direct (exact key match), Fanout (all queues), Topic (wildcard: * = 1 word, # = 0+), Headers (x-match all/any on headers). Bindings connect exchange to queue with optional binding key. Default exchange: queue name = routing key (built-in direct for all queues).

**L3 (10min edge cases):** Unroutable: mandatory flag returns to producer, alternate-exchange catches them. Exchange-to-exchange bindings: fanout trees. Durable exchange + durable queue + persistent message = full durability. Temporary exchanges/queues: auto-delete when no consumers.

**L4 (30min deep):** Exchange metadata stored in Mnesia (Erlang distributed DB). Bindings stored in routing table (ETS). Topic pattern matching via binary tree. Fanout = O(n) queues. Direct = O(1) hash lookup. Headers = O(header count × binding count). AMQP 0-9-1 protocol: exchanges are first-class objects, declared by clients.`,
    why: "Exchange routing decouples producers from consumers. Producer knows exchange, not queues. Add new consumer = create queue + binding. Zero producer changes. RabbitMQ's routing flexibility (vs Kafka's partition-based) enables fine-grained message routing.",
    example: {
      language: "java",
      code: `// Java with Spring AMQP
@Configuration
public class RabbitConfig {
    // Direct exchange
    @Bean DirectExchange ordersExchange() {
        return new DirectExchange("orders.direct", true, false);
    }
    // Fanout exchange
    @Bean FanoutExchange notifyExchange() {
        return new FanoutExchange("notifications.fanout");
    }
    // Topic exchange
    @Bean TopicExchange eventsExchange() {
        return new TopicExchange("events.topic");
    }
    @Bean Queue paymentQueue() { return new Queue("payment-queue", true); }
    @Bean Binding paymentBinding(Queue paymentQueue, DirectExchange ordersExchange) {
        return BindingBuilder.bind(paymentQueue).to(ordersExchange).with("payment");
    }
    @Bean Binding logAllOrders(Queue auditQueue, TopicExchange eventsExchange) {
        return BindingBuilder.bind(auditQueue).to(eventsExchange).with("order.#");
    }
}

// Send message
rabbitTemplate.convertAndSend("orders.direct", "payment", orderPayload);
rabbitTemplate.convertAndSend("events.topic", "order.payment.success", event);`
    },
    gotchas: [
      "Unroutable messages silently dropped by default — use mandatory=true or alternate-exchange",
      "Topic * matches EXACTLY one dot-separated word. order.* matches order.paid but not order.payment.done",
      "Default exchange (\"\") routes to queue by name — every queue automatically bound",
      "Durable exchange survives restart but bindings to transient queues do not",
      "Headers exchange is slow — O(headers × bindings). Avoid for high-throughput routing",
      "Exchange-to-exchange bindings not in AMQP spec — RabbitMQ extension only"
    ],
    interview: [
      { q: "4 exchange types and when to use each?", a: "Direct: exact routing key → specific queue (task queues, work queues). Fanout: broadcast to all bound queues (pub/sub, cache invalidation). Topic: wildcard routing (* = 1 word, # = 0+) for categorized events. Headers: multi-attribute routing via x-match all/any (rare — use topic instead)." },
      { q: "What happens to unroutable messages?", a: "Silently dropped by default. Options: mandatory=true → basic.return callback to producer. Alternate exchange: unroutable messages forwarded to another exchange (e.g., DLQ exchange)." },
      { q: "Direct vs default exchange?", a: "Default exchange (empty string) is a pre-declared direct exchange. Every queue automatically bound to it with binding key = queue name. Sending to default exchange with routing key=queue name delivers directly to that queue. Convenience shortcut." },
      { q: "Topic * vs # wildcard?", a: "* = exactly one word (dot-delimited). # = zero or more words. 'order.*' matches 'order.paid' but not 'order.payment.done'. 'order.#' matches both. '#' alone matches everything (like fanout)." }
    ],
    tradeoffs: "RabbitMQ routing: powerful but broker-side complexity. Kafka: partition-based, consumer-side routing (filter). RabbitMQ suited for complex routing/workflow; Kafka for high-throughput stream processing."
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
