(function() {
  var topic = {
  id:"sd-saga-patterns", area:"sysdesign",
  title:"Saga Pattern — Distributed Transactions Without 2PC",
  tag:"Architecture", tags:["saga","orchestration","choreography","distributed transaction","compensation","2pc","long running transaction"],
  concept:`**The problem:** When an operation spans multiple microservices (order placement = create order + reserve inventory + charge payment), you need atomicity — but each service has its own DB, so traditional 2PC is impractical.

**2PC problems:** Coordinator is a single point of failure; all participants must be synchronously available; holds locks during prepare phase (deadly for performance).

**Saga pattern:** Break the distributed transaction into a sequence of local transactions. Each step publishes an event. If a step fails, execute **compensating transactions** to undo previous steps.

**Choreography saga:** Services react to events from each other. No central coordinator.
- Pros: simple, no SPOF, loose coupling
- Cons: hard to track workflow state, circular dependencies, hard to debug

**Orchestration saga:** A central **Saga Orchestrator** coordinates the sequence, calls each service, and manages compensation on failure.
- Pros: workflow visible in one place, easier to add steps, centralized error handling
- Cons: orchestrator can become a bottleneck, extra service to deploy

**Compensation example (order cancellation):**
\`\`\`
Forward:      CreateOrder → ReserveInventory → ChargePayment → ShipOrder
Compensation: CancelOrder ← ReleaseInventory ← RefundPayment ← CancelShipment
\`\`\`

**Idempotency:** Each step must be idempotent — retrying a compensating transaction must be safe.`,
  why:`Saga is the go-to pattern for distributed transactions in microservices. Every e-commerce, fintech, and logistics system uses it. Understanding choreography vs orchestration trade-offs is a senior-level expectation.`,
  example:{
    language:"java",
    code:`// Orchestration Saga with Spring State Machine
@Service
public class OrderSagaOrchestrator {

    @Autowired private InventoryServiceClient inventory;
    @Autowired private PaymentServiceClient payment;
    @Autowired private ShippingServiceClient shipping;
    @Autowired private SagaStateRepository sagaRepo;

    @Transactional
    public SagaResult placeOrder(PlaceOrderRequest req) {
        SagaState saga = sagaRepo.save(SagaState.start(req.getOrderId()));

        try {
            // Step 1: Reserve inventory
            saga.transition(SagaStep.RESERVING_INVENTORY);
            inventory.reserve(req.getOrderId(), req.getItems()); // idempotent
            saga.transition(SagaStep.INVENTORY_RESERVED);

            // Step 2: Charge payment
            saga.transition(SagaStep.CHARGING_PAYMENT);
            payment.charge(req.getOrderId(), req.getAmount()); // idempotent
            saga.transition(SagaStep.PAYMENT_CHARGED);

            // Step 3: Create shipment
            saga.transition(SagaStep.CREATING_SHIPMENT);
            shipping.createShipment(req.getOrderId(), req.getAddress());
            saga.transition(SagaStep.COMPLETED);

            sagaRepo.save(saga);
            return SagaResult.success();

        } catch (InventoryException e) {
            // No compensation needed — inventory was never reserved
            saga.fail(e.getMessage());
            sagaRepo.save(saga);
            return SagaResult.failure("Insufficient inventory");

        } catch (PaymentException e) {
            // Compensate: release inventory
            saga.transition(SagaStep.COMPENSATING);
            inventory.release(req.getOrderId()); // compensation — idempotent
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Payment failed — inventory released");

        } catch (ShippingException e) {
            // Compensate: refund payment + release inventory
            saga.transition(SagaStep.COMPENSATING);
            payment.refund(req.getOrderId());    // compensation
            inventory.release(req.getOrderId()); // compensation
            saga.transition(SagaStep.COMPENSATED);
            sagaRepo.save(saga);
            return SagaResult.failure("Shipping failed — payment refunded");
        }
    }
}`,
    notes:"Always persist saga state before and after each step. On crash, restart mechanism can resume from last known state and retry or compensate."
  },
  interview:[
    {question:"When would you choose choreography saga over orchestration saga?",
     answer:`**Choreography:** Each service listens for events and decides what to do next.\n- Choose when: few steps (2-3), loose coupling priority, team autonomy important, simple linear flow\n- Problem: as steps grow, workflow becomes a distributed state machine spread across services — hard to understand and debug. "What is the current state of order 42?" requires querying all services.\n\n**Orchestration:** Central orchestrator controls the flow.\n- Choose when: complex workflows (5+ steps), need centralized monitoring and visibility, conditional logic needed, team wants explicit failure handling\n- Problem: orchestrator knows about all services — creates coupling. Must be deployed and operated.\n\n**Hybrid:** Use orchestration for complex workflows but keep services autonomous (they don't know they're in a saga — just respond to commands).`,
     followUps:["How do you handle retries in a saga when a step fails intermittently?","What is the difference between a saga and a workflow engine (Temporal)?"]
    }
  ],
  tradeoffs:{
    pros:["Achieves distributed atomicity without distributed locks","Each service owns its local transaction","Compensations are business-meaningful operations (not technical rollbacks)"],
    cons:["Eventual consistency — order may be visible as partially created during saga","Compensation logic must be carefully designed for every failure scenario","Debugging failures across services is hard"],
    when:"Use when you need atomicity across services that own different databases. For read-heavy flows, prefer eventual consistency with idempotent consumers instead."
  },
  visual: function(mount) {
    mount.innerHTML='';
    var W=460,H=320;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    canvas.style.cssText='width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='text-align:center;margin-bottom:8px;display:flex;gap:8px;justify-content:center';
    function mkBtn(label){
      var b=document.createElement('button');
      b.textContent=label;
      b.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
      return b;
    }
    var btnOrch=mkBtn('Orchestration');
    var btnChor=mkBtn('Choreography');
    var btnPlay=mkBtn('▶ Play');
    var btnReset=mkBtn('Reset');
    btnRow.appendChild(btnOrch); btnRow.appendChild(btnChor); btnRow.appendChild(btnPlay); btnRow.appendChild(btnReset);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    var mode='orchestration'; // or 'choreography'
    var stepIdx=0;
    var playing=false;
    var failStep=2; // 0-indexed: step at which failure happens (Inventory)
    var failed=false;

    // ---- ORCHESTRATION LAYOUT ----
    var orch={
      orch:{x:185,y:10,w:90,h:28,label:'Orchestrator',color:'#ffa657'},
      order:{x:30,y:90,w:80,h:26,label:'Order Svc',color:'#3fb950'},
      payment:{x:190,y:90,w:80,h:26,label:'Payment Svc',color:'#58a6ff'},
      inventory:{x:350,y:90,w:80,h:26,label:'Inventory Svc',color:'#bc8cff'},
    };

    // Forward: orch→order, orch→payment, orch→inventory
    // Compensation (on inventory fail): orch→payment (refund), orch→order (cancel)
    var orchSteps=[
      {from:'orch',to:'order',label:'1. CreateOrder',color:'#3fb950',dir:'fwd'},
      {from:'orch',to:'payment',label:'2. ChargePayment',color:'#58a6ff',dir:'fwd'},
      {from:'orch',to:'inventory',label:'3. ReserveInventory',color:'#bc8cff',dir:'fwd'},
      {from:'orch',to:'payment',label:'↩ RefundPayment',color:'#f85149',dir:'comp'},
      {from:'orch',to:'order',label:'↩ CancelOrder',color:'#f85149',dir:'comp'}
    ];

    // ---- CHOREOGRAPHY LAYOUT ----
    var chor={
      order:   {x:30,y:60,w:80,h:26,label:'Order Svc',color:'#3fb950'},
      topic1:  {x:155,y:60,w:80,h:26,label:'OrderCreated',color:'#ffa657',isTopic:true},
      payment: {x:280,y:60,w:80,h:26,label:'Payment Svc',color:'#58a6ff'},
      topic2:  {x:155,y:140,w:80,h:26,label:'PaymentDone',color:'#ffa657',isTopic:true},
      inv:     {x:280,y:140,w:80,h:26,label:'Inventory Svc',color:'#bc8cff'},
      topic3:  {x:155,y:220,w:80,h:26,label:'InvReserved',color:'#ffa657',isTopic:true},
      dlq:     {x:370,y:140,w:70,h:26,label:'DLQ',color:'#f85149',isDLQ:true}
    };

    var chorSteps=[
      {from:'order',to:'topic1',label:'emit OrderCreated',color:'#3fb950'},
      {from:'topic1',to:'payment',label:'Payment listens',color:'#58a6ff'},
      {from:'payment',to:'topic2',label:'emit PaymentDone',color:'#58a6ff'},
      {from:'topic2',to:'inv',label:'Inventory listens',color:'#bc8cff'},
      {from:'inv',to:'topic3',label:'emit InvReserved',color:'#bc8cff'},
      {from:'inv',to:'dlq',label:'on fail → DLQ',color:'#f85149',isComp:true}
    ];

    var dot={active:false,x:0,y:0,tx:0,ty:0,progress:0,color:'#fff'};
    var completedSteps=[];

    function cx(n,layout){return layout[n].x+layout[n].w/2;}
    function cy(n,layout){return layout[n].y+layout[n].h/2;}

    function drawRR(x,y,w,h,r,fill,stroke){
      ctx.beginPath();
      ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
    }

    function drawArrow(x1,y1,x2,y2,color,dashed){
      ctx.save();
      if(dashed)ctx.setLineDash([4,3]);
      ctx.strokeStyle=color;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      var ang=Math.atan2(y2-y1,x2-x1);
      ctx.setLineDash([]);
      ctx.fillStyle=color;ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-8*Math.cos(ang-0.4),y2-8*Math.sin(ang-0.4));
      ctx.lineTo(x2-8*Math.cos(ang+0.4),y2-8*Math.sin(ang+0.4));
      ctx.closePath();ctx.fill();
      ctx.restore();
    }

    function drawNodeBox(n,highlight){
      var fill=highlight?'#ffe566':'#161b22';
      var textColor=highlight?'#0d1117':n.isTopic?'#ffa657':n.isDLQ?'#f85149':n.color;
      var border=n.isTopic?'#ffa657':n.isDLQ?'#f85149':n.color;
      drawRR(n.x,n.y,n.w,n.h,5,fill,border);
      ctx.fillStyle=highlight?'#0d1117':textColor;
      ctx.font='bold 9px monospace';ctx.textAlign='center';
      ctx.fillText(n.label,n.x+n.w/2,n.y+n.h/2+4);
    }

    function drawOrchestration(){
      ctx.fillStyle='#e6edf3';ctx.font='bold 11px monospace';ctx.textAlign='center';
      ctx.fillText('Orchestration Saga',W/2,H-36);

      // Title row
      ctx.fillStyle='#8b949e';ctx.font='10px monospace';
      ctx.fillText('Central Orchestrator drives all steps',W/2,H-22);

      // Draw completed steps as lines
      completedSteps.forEach(function(si){
        var s=orchSteps[si];
        var color=s.dir==='comp'?'#f85149':s.color;
        drawArrow(cx(s.from,orch),cy(s.from,orch),cx(s.to,orch),cy(s.to,orch),color,s.dir==='comp');
        // label
        var mx=(cx(s.from,orch)+cx(s.to,orch))/2;
        var my=(cy(s.from,orch)+cy(s.to,orch))/2-8;
        ctx.fillStyle=color;ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText(s.label,mx,my);
      });

      // Draw nodes
      Object.keys(orch).forEach(function(id){
        var hi=dot.active&&(id===orchSteps[stepIdx-1]?.from||id===orchSteps[stepIdx-1]?.to);
        drawNodeBox(orch[id],hi);
      });

      // failure label
      if(failed){
        ctx.fillStyle='#f85149';ctx.font='bold 11px monospace';ctx.textAlign='center';
        ctx.fillText('Inventory FAILED → Compensating ↩',W/2,H-52);
      }
    }

    function drawChoreography(){
      ctx.fillStyle='#e6edf3';ctx.font='bold 11px monospace';ctx.textAlign='center';
      ctx.fillText('Choreography Saga',W/2,H-36);
      ctx.fillStyle='#8b949e';ctx.font='10px monospace';
      ctx.fillText('No central coordinator — events chain',W/2,H-22);

      completedSteps.forEach(function(si){
        var s=chorSteps[si];
        drawArrow(cx(s.from,chor),cy(s.from,chor),cx(s.to,chor),cy(s.to,chor),s.color,s.isComp);
        var mx=(cx(s.from,chor)+cx(s.to,chor))/2;
        var my=(cy(s.from,chor)+cy(s.to,chor))/2-8;
        ctx.fillStyle=s.color;ctx.font='8px monospace';ctx.textAlign='center';
        ctx.fillText(s.label,mx,my);
      });

      Object.keys(chor).forEach(function(id){
        var hi=dot.active&&completedSteps.length>0&&(id===chorSteps[Math.max(0,stepIdx-1)]?.from||id===chorSteps[Math.max(0,stepIdx-1)]?.to);
        drawNodeBox(chor[id],hi);
      });
    }

    function draw(){
      if(!document.body.contains(canvas))return;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

      if(mode==='orchestration') drawOrchestration();
      else drawChoreography();

      if(dot.active){
        var px=dot.x+(dot.tx-dot.x)*dot.progress;
        var py=dot.y+(dot.ty-dot.y)*dot.progress;
        ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);
        ctx.fillStyle=dot.color;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.stroke();
      }
    }

    function getSteps(){return mode==='orchestration'?orchSteps:chorSteps;}
    function getLayout(){return mode==='orchestration'?orch:chor;}

    function doStep(){
      var steps=getSteps();
      var layout=getLayout();
      if(stepIdx>=steps.length){
        if(playing){playing=false;btnPlay.textContent='▶ Play';}
        dot.active=false;draw();return;
      }
      var s=steps[stepIdx];
      dot.active=true;
      dot.x=cx(s.from,layout);dot.y=cy(s.from,layout);
      dot.tx=cx(s.to,layout);dot.ty=cy(s.to,layout);
      dot.progress=0;dot.color=s.color;

      function tick(){
        if(!document.body.contains(canvas)){playing=false;return;}
        dot.progress+=0.05;
        if(dot.progress>=1){
          dot.progress=1;
          completedSteps.push(stepIdx);
          stepIdx++;
          // orchestration: mark failure after step 2 (inventory)
          if(mode==='orchestration'&&stepIdx===3) failed=true;
          dot.active=false;draw();
          if(playing) setTimeout(doStep,400);
          return;
        }
        draw();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function resetAll(){
      stepIdx=0;completedSteps=[];dot.active=false;playing=false;failed=false;
      btnPlay.textContent='▶ Play';
      draw();
    }

    btnOrch.onclick=function(){mode='orchestration';resetAll();};
    btnChor.onclick=function(){mode='choreography';resetAll();};
    btnPlay.onclick=function(){
      if(playing){playing=false;btnPlay.textContent='▶ Play';return;}
      if(stepIdx>=getSteps().length){resetAll();return;}
      playing=true;btnPlay.textContent='⏸ Pause';
      doStep();
    };
    btnReset.onclick=resetAll;
    draw();
  },
  uml:{
    title:"Orchestration Saga — Order Placement",
    scenario:"Happy path and payment failure compensation",
    actors:[
      {id:"client",label:"Client"},
      {id:"orchestrator",label:"Saga Orchestrator"},
      {id:"inventory",label:"Inventory Svc"},
      {id:"payment",label:"Payment Svc"},
      {id:"shipping",label:"Shipping Svc"}
    ],
    messages:[
      {from:"client",to:"orchestrator",label:"PlaceOrder(orderId, items, amount)",detail:"Client initiates saga. Orchestrator coordinates all steps.",type:"sync"},
      {from:"orchestrator",to:"inventory",label:"ReserveInventory(orderId, items)",detail:"Step 1: Reserve stock. Idempotent — safe to retry.",type:"sync"},
      {from:"inventory",to:"orchestrator",label:"InventoryReserved",detail:"Success response — saga continues to step 2.",type:"sync"},
      {from:"orchestrator",to:"payment",label:"ChargePayment(orderId, amount)",detail:"Step 2: Charge payment. If this fails, must release inventory.",type:"sync"},
      {from:"payment",to:"orchestrator",label:"PaymentFailed (insufficient funds)",detail:"Payment rejected. Orchestrator must compensate step 1.",type:"sync"},
      {from:"orchestrator",to:"inventory",label:"ReleaseInventory(orderId) [COMPENSATION]",detail:"Compensating transaction: undo step 1 by releasing the reserved stock.",type:"async"},
      {from:"inventory",to:"orchestrator",label:"InventoryReleased",detail:"Compensation confirmed. Saga moves to COMPENSATED state.",type:"sync"},
      {from:"orchestrator",to:"client",label:"SagaFailed: Payment declined",detail:"Client receives failure response. Inventory never depleted from customer's perspective.",type:"sync"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
