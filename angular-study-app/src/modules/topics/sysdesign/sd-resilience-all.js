(function() {
  var topic = {
  id:"sd-resilience-all", area:"sysdesign",
  title:"Resilience — Circuit Breaker, Bulkhead, Retry & Backpressure",
  tag:"Resilience", tags:["circuit breaker","bulkhead","retry","timeout","backpressure","resilience4j","hystrix","rate limiting","fallback"],
  concept:`**Why resilience?** In a system of 20 services, if each has 99.9% availability, end-to-end availability is 0.999^20 = 98%. Cascading failures can make it much worse.

**Circuit Breaker (Fowler pattern):**
Three states: **CLOSED** (normal) → **OPEN** (fail fast) → **HALF_OPEN** (probe recovery).
- CLOSED: requests pass through. Track failure rate (e.g., >50% failures in 10s window).
- OPEN: reject immediately with fallback. Wait cooldown (e.g., 30s).
- HALF_OPEN: allow N test requests. If pass → CLOSED. If fail → OPEN again.

**Bulkhead (ship compartment analogy):**
Isolate resources per downstream. Thread pool or semaphore per dependency. If one dependency is slow, it exhausts only its own pool — doesn't starve other calls.

**Retry with exponential backoff + jitter:**
\`\`\`
Attempt 1: immediate
Attempt 2: wait 2^1 * 100ms = 200ms
Attempt 3: wait 2^2 * 100ms = 400ms + random jitter (0-100ms)
Max retries: 3
\`\`\`
Jitter prevents thundering herd on retry storms.

**Timeout:** Every network call MUST have a timeout. Without it, threads block forever on dead services → thread pool exhaustion → service death.

**Backpressure:** Producer slows down when consumer is overwhelmed. In Reactive (Project Reactor/RxJava), subscriber signals demand upstream. In Kafka, consumer lag serves as natural backpressure signal.

**Fallback strategies:**
- Return cached/stale data
- Return default/empty response
- Degrade gracefully (hide the feature)
- Queue for later processing`,
  why:`A service that doesn't protect itself will fail when its dependencies fail. Circuit breaker + timeout + bulkhead is the minimum viable resilience stack.`,
  example:{
    language:"java",
    code:`// Resilience4j — full stack: circuit breaker + retry + bulkhead + timeout
@Service
public class PaymentClient {

    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final Bulkhead bulkhead;
    private final TimeLimiter timeLimiter;

    public PaymentClient(Resilience4jConfig config) {
        // Circuit breaker: open after 50% failure rate in 10 call sliding window
        circuitBreaker = CircuitBreaker.of("payment",
            CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .slidingWindowSize(10)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .permittedNumberOfCallsInHalfOpenState(3)
                .build());

        // Retry: 3 attempts, exponential backoff + jitter
        retry = Retry.of("payment",
            RetryConfig.custom()
                .maxAttempts(3)
                .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(
                    Duration.ofMillis(200), 2.0, Duration.ofSeconds(2)))
                .retryOnException(e -> e instanceof RetryableException)
                .build());

        // Bulkhead: max 10 concurrent calls to payment service
        bulkhead = Bulkhead.of("payment",
            BulkheadConfig.custom()
                .maxConcurrentCalls(10)
                .maxWaitDuration(Duration.ofMillis(100))
                .build());

        timeLimiter = TimeLimiter.of("payment",
            TimeLimiterConfig.custom()
                .timeoutDuration(Duration.ofSeconds(5))
                .build());
    }

    public PaymentResult charge(ChargeRequest req) {
        Supplier<PaymentResult> call = () -> paymentApi.charge(req);

        // Compose: bulkhead → circuitBreaker → retry → timeLimiter
        return Decorators.ofSupplier(call)
            .withBulkhead(bulkhead)
            .withCircuitBreaker(circuitBreaker)
            .withRetry(retry)
            .withFallback(List.of(CallNotPermittedException.class,
                                   BulkheadFullException.class),
                          e -> PaymentResult.degraded("Payment service unavailable"))
            .get();
    }
}`,
    notes:"Order of decorators matters: bulkhead → circuit breaker → retry. Retry inside circuit breaker means retries count toward failure rate."
  },
  interview:[
    {question:"Why add jitter to retry backoff?",
     answer:`Without jitter, all retrying clients wait exactly the same duration and fire simultaneously — creating a thundering herd that overloads the recovering service.\n\nWith jitter, each client waits \`backoff + random(0, backoff)\` — spreading requests over time and avoiding the synchronized burst.\n\n**Full-jitter formula (AWS recommendation):** \`sleep = random(0, min(cap, base * 2^attempt))\`\n\nThis ensures no two clients retry at the same instant, giving the recovering service time to stabilise.`,
     followUps:["When should you NOT retry?","What is circuit breaker half-open state and why is it needed?"]
    }
  ],
  tradeoffs:{
    pros:["Circuit breaker prevents cascade failures","Bulkhead limits blast radius of slow dependencies","Retry handles transient failures transparently"],
    cons:["Retry can amplify load on struggling service (without circuit breaker)","Circuit breaker adds configuration surface area","Timeout tuning is hard — too short = false positives, too long = thread starvation"],
    when:"Apply to every synchronous external call. Minimum: timeout + circuit breaker. Add retry only for idempotent operations. Add bulkhead for critical dependency isolation."
  },
  visual: function(mount) {
    mount.innerHTML='';
    var W=460,H=320;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    canvas.style.cssText='width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='text-align:center;margin-bottom:8px;display:flex;gap:8px;justify-content:center';
    function mkBtn(t){
      var b=document.createElement('button');
      b.textContent=t;
      b.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
      return b;
    }
    var btnFail=mkBtn('Simulate Failure');
    var btnReset=mkBtn('Reset');
    btnRow.appendChild(btnFail); btnRow.appendChild(btnReset);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    // State machine: CLOSED → OPEN → HALF_OPEN → CLOSED
    var CB_STATE={CLOSED:'CLOSED',OPEN:'OPEN',HALF_OPEN:'HALF_OPEN'};
    var state=CB_STATE.CLOSED;
    var failCount=0;
    var THRESHOLD=5;
    var timerVal=30;
    var timerInterval=null;
    var probeSuccess=false;
    var retryDelay=1;
    var retryStep=0; // 0=idle,1,2,3,4
    var bulkhead=[{used:false},{used:false},{used:false},{used:false},{used:false}];
    var dot={active:false,x:0,y:0,tx:0,ty:0,progress:0,color:'#fff'};
    var animating=false;
    var lastMsg='';

    // Layout
    var nodes={
      closed: {x:30,  y:90, w:100,h:44,label:'CLOSED',sub:'normal ops',state:CB_STATE.CLOSED},
      open:   {x:175, y:90, w:100,h:44,label:'OPEN',  sub:'fail fast',  state:CB_STATE.OPEN},
      half:   {x:320, y:90, w:120,h:44,label:'HALF-OPEN',sub:'probe req',state:CB_STATE.HALF_OPEN}
    };

    function drawRR(x,y,w,h,r,fill,stroke,lw){
      ctx.beginPath();
      ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1.5;ctx.stroke();}
    }

    function drawArrow(x1,y1,x2,y2,color,label,dash){
      ctx.save();
      if(dash)ctx.setLineDash([4,3]);
      ctx.strokeStyle=color;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      var a=Math.atan2(y2-y1,x2-x1);
      ctx.setLineDash([]);
      ctx.fillStyle=color;ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-7*Math.cos(a-0.4),y2-7*Math.sin(a-0.4));
      ctx.lineTo(x2-7*Math.cos(a+0.4),y2-7*Math.sin(a+0.4));
      ctx.closePath();ctx.fill();
      if(label){
        var mx=(x1+x2)/2,my=(y1+y2)/2-7;
        ctx.fillStyle=color;ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText(label,mx,my);
      }
      ctx.restore();
    }

    function draw(){
      if(!document.body.contains(canvas))return;
      ctx.clearRect(0,0,W,H);ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

      // Title
      ctx.fillStyle='#e6edf3';ctx.font='bold 11px monospace';ctx.textAlign='center';
      ctx.fillText('Circuit Breaker State Machine',W/2,20);

      // Transition arrows
      // CLOSED → OPEN
      drawArrow(130,112,175,112,'#f85149','failure>'+THRESHOLD);
      // OPEN → HALF_OPEN (curved below)
      drawArrow(275,118,320,118,'#ffa657','timer '+timerVal+'s');
      // HALF_OPEN → CLOSED (arc above)
      ctx.save();ctx.strokeStyle='#3fb950';ctx.lineWidth=1.2;
      ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(380,90);ctx.quadraticCurveTo(280,40,80,90);ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#3fb950';
      var arrowX=80,arrowY=90;
      ctx.beginPath();ctx.moveTo(arrowX,arrowY);
      ctx.lineTo(arrowX+8,arrowY-4);ctx.lineTo(arrowX+5,arrowY+4);ctx.closePath();ctx.fill();
      ctx.fillStyle='#3fb950';ctx.font='8px monospace';ctx.textAlign='center';
      ctx.fillText('probe ok → CLOSED',230,42);
      ctx.restore();
      // HALF_OPEN → OPEN (below)
      drawArrow(320,134,275,134,'#f85149','probe fail',true);

      // State boxes
      Object.keys(nodes).forEach(function(k){
        var n=nodes[k];
        var isActive=state===n.state;
        var fillColor='#161b22';
        var borderColor=n.state===CB_STATE.CLOSED?'#3fb950':n.state===CB_STATE.OPEN?'#f85149':'#ffa657';
        if(isActive) fillColor=n.state===CB_STATE.CLOSED?'#0f3020':n.state===CB_STATE.OPEN?'#3d1515':'#3d2800';
        drawRR(n.x,n.y,n.w,n.h,6,fillColor,borderColor,isActive?3:1.5);
        ctx.fillStyle=borderColor;ctx.font='bold 11px monospace';ctx.textAlign='center';
        ctx.fillText(n.label,n.x+n.w/2,n.y+18);
        ctx.fillStyle='#8b949e';ctx.font='9px monospace';
        ctx.fillText(n.sub,n.x+n.w/2,n.y+34);
      });

      // Failure counter (CLOSED state)
      var counterX=80,counterY=148;
      ctx.fillStyle='#8b949e';ctx.font='10px monospace';ctx.textAlign='center';
      ctx.fillText('Failures: ',counterX,counterY);
      for(var i=0;i<THRESHOLD;i++){
        var fx=counterX-20+i*10;
        ctx.beginPath();ctx.arc(fx,counterY+12,4,0,Math.PI*2);
        ctx.fillStyle=i<failCount?'#f85149':'#30363d';
        ctx.fill();
      }

      // Timer countdown (OPEN state)
      if(state===CB_STATE.OPEN){
        ctx.fillStyle='#ffa657';ctx.font='11px monospace';ctx.textAlign='center';
        ctx.fillText('⏱ cooldown: '+timerVal+'s',225,155);
      }

      // HALF_OPEN probe label
      if(state===CB_STATE.HALF_OPEN){
        ctx.fillStyle='#ffa657';ctx.font='10px monospace';ctx.textAlign='center';
        ctx.fillText(probeSuccess?'Probe ✓ → back to CLOSED':'Sending probe request…',W/2,155);
      }

      // Retry with backoff (bottom section)
      ctx.fillStyle='#8b949e';ctx.font='9px monospace';ctx.textAlign='left';
      ctx.fillText('Retry backoff (exp+jitter):',10,195);
      var delays=[1,2,4,8];
      delays.forEach(function(d,i){
        var bx=10+i*70;
        var isActive2=retryStep===i+1;
        drawRR(bx,200,60,24,4,isActive2?'#0f2540':'#161b22',isActive2?'#58a6ff':'#30363d',isActive2?2:1);
        ctx.fillStyle=isActive2?'#58a6ff':'#8b949e';ctx.font='9px monospace';ctx.textAlign='center';
        ctx.fillText(d+'s +jitter',bx+30,216);
      });
      drawRR(290,200,70,24,4,'#161b22','#30363d',1);
      ctx.fillStyle='#8b949e';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('give up',325,216);

      // Bulkhead section
      ctx.fillStyle='#8b949e';ctx.font='9px monospace';ctx.textAlign='left';
      ctx.fillText('Bulkhead thread pool (5 max):',10,250);
      bulkhead.forEach(function(b2,i){
        drawRR(10+i*44,255,36,22,4,b2.used?'#0f3020':'#21262d',b2.used?'#3fb950':'#30363d',1.5);
        ctx.fillStyle=b2.used?'#3fb950':'#8b949e';ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText(b2.used?'busy':'free',10+i*44+18,270);
      });

      // Status message
      if(lastMsg){
        ctx.fillStyle='#e6edf3';ctx.font='10px monospace';ctx.textAlign='center';
        ctx.fillText(lastMsg,W/2,H-8);
      }

      // dot
      if(dot.active){
        var px=dot.x+(dot.tx-dot.x)*dot.progress;
        var py=dot.y+(dot.ty-dot.y)*dot.progress;
        ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);
        ctx.fillStyle=dot.color;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      }
    }

    function stopTimer(){if(timerInterval){clearInterval(timerInterval);timerInterval=null;}}

    function runFailureSimulation(){
      if(animating)return;
      animating=true;

      if(state===CB_STATE.CLOSED){
        // increment failure counter
        failCount++;
        lastMsg='Failure '+failCount+'/'+THRESHOLD+' — adding to failure counter';
        // Animate retry steps
        retryStep=1;draw();
        var delays=[1,2,4,8];
        var di=0;
        function nextRetry(){
          if(di>=delays.length||failCount>=THRESHOLD){
            retryStep=0;
            if(failCount>=THRESHOLD){
              // Trip to OPEN
              state=CB_STATE.OPEN;
              lastMsg='Threshold reached → OPEN (fail fast)';
              timerVal=30;
              timerInterval=setInterval(function(){
                if(!document.body.contains(canvas)){stopTimer();return;}
                timerVal--;draw();
                if(timerVal<=0){
                  stopTimer();
                  state=CB_STATE.HALF_OPEN;
                  lastMsg='Cooldown elapsed → HALF_OPEN — sending probe';
                  draw();
                  setTimeout(function(){
                    probeSuccess=true;
                    lastMsg='Probe succeeded → back to CLOSED';
                    state=CB_STATE.CLOSED;
                    failCount=0;
                    animating=false;
                    draw();
                    setTimeout(function(){lastMsg='';draw();},1500);
                  },1200);
                }
              },80); // fast timer for demo
              animating=false;
              draw();
            } else {
              animating=false;draw();
            }
            return;
          }
          retryStep=di+1;draw();
          setTimeout(function(){di++;nextRetry();},300);
        }
        nextRetry();
      } else if(state===CB_STATE.OPEN){
        lastMsg='Circuit OPEN → 503 fail fast (no downstream call)';
        animating=false;draw();
      } else if(state===CB_STATE.HALF_OPEN){
        lastMsg='Probe FAILED → back to OPEN';
        probeSuccess=false;
        state=CB_STATE.OPEN;
        timerVal=30;
        timerInterval=setInterval(function(){
          if(!document.body.contains(canvas)){stopTimer();return;}
          timerVal--;draw();
          if(timerVal<=0){stopTimer();}
        },80);
        animating=false;draw();
      }

      // Random bulkhead busy
      var idx=Math.floor(Math.random()*5);
      bulkhead[idx].used=true;
      setTimeout(function(){bulkhead[idx].used=false;draw();},1500);
    }

    btnFail.onclick=runFailureSimulation;
    btnReset.onclick=function(){
      stopTimer();
      state=CB_STATE.CLOSED;failCount=0;timerVal=30;probeSuccess=false;
      retryStep=0;bulkhead.forEach(function(b2){b2.used=false;});
      lastMsg='';animating=false;dot.active=false;
      draw();
    };
    draw();
  },
  flow:{
    title:"Circuit Breaker State Machine",
    caption:"Fail fast in OPEN state; probe recovery with HALF_OPEN",
    nodes:[
      {id:"client",label:"Client",hint:"Makes calls to downstream"},
      {id:"cb-closed",label:"CLOSED",hint:"Normal operation — calls pass through"},
      {id:"cb-open",label:"OPEN",hint:"Fail fast — no calls to downstream"},
      {id:"cb-half",label:"HALF_OPEN",hint:"Probe — let few calls through"},
      {id:"downstream",label:"Downstream Service",hint:"Payment / Inventory / etc"},
      {id:"fallback",label:"Fallback",hint:"Cache / default / error"}
    ],
    steps:[
      {path:["client","cb-closed"],label:"Normal: CLOSED state",detail:"All requests pass through. Failure rate tracked in sliding window (50% threshold, 10 calls)."},
      {path:["cb-closed","downstream"],label:"Call forwarded",detail:"Request reaches downstream service normally. Latency and errors recorded."},
      {path:["cb-closed","cb-open"],label:"Threshold exceeded → OPEN",detail:"Failure rate >50% in window. Circuit opens immediately. Cooldown timer starts (30s)."},
      {path:["client","cb-open"],label:"Fail fast in OPEN",detail:"No calls reach downstream. Circuit breaker returns fallback immediately (<1ms)."},
      {path:["cb-open","fallback"],label:"Return fallback response",detail:"Cached data, default response, or error returned to caller."},
      {path:["cb-open","cb-half"],label:"Cooldown elapsed → HALF_OPEN",detail:"After 30s, circuit allows 3 test requests through."},
      {path:["cb-half","cb-closed"],label:"Tests pass → CLOSED",detail:"If test requests succeed → circuit closes. Normal operation resumes."},
      {path:["cb-half","cb-open"],label:"Tests fail → OPEN again",detail:"If test requests fail → circuit reopens. Cooldown resets."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
