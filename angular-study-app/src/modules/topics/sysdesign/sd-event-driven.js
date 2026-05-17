(function() {
  var topic = {
  id:"sd-event-driven", area:"sysdesign",
  title:"Event-Driven Architecture — EDA, CQRS & Event Sourcing",
  tag:"Architecture", tags:["eda","cqrs","event sourcing","event store","projection","read model","axon","domain events"],
  concept:`**Event-Driven Architecture (EDA):** Services communicate by publishing and consuming events. No direct coupling — publisher doesn't know about consumers.

**Event types:**
- **Domain event** — something that happened (OrderPlaced, PaymentProcessed). Immutable fact.
- **Command** — intent to change state (PlaceOrder). Can be rejected.
- **Query** — read request. No side effects.

**CQRS (Command Query Responsibility Segregation):**
Separate write model (commands → aggregates → events) from read model (projections optimised for queries).
- Write side: normalised, event-sourced, strongly consistent
- Read side: denormalised, eventually consistent, optimised for specific views

**Event Sourcing:** Store state as a sequence of events rather than current state.
\`\`\`
Events: [OrderCreated, ItemAdded, ItemAdded, OrderConfirmed, PaymentFailed, Retried, PaymentSuccess]
Current state = apply(all events) = {status: PAID, items: [...], total: 99.99}
\`\`\`

**Benefits:** Complete audit trail, temporal queries ("what was the state on Tuesday?"), replay to fix bugs, event-driven integration is natural.

**Challenges:** Event schema evolution (upcasters), eventual consistency, projections can lag, complex debugging.

**Snapshot optimization:** After N events, store a snapshot of current state. Rebuild from snapshot + events since snapshot.`,
  why:`CQRS+ES appears in DDD-heavy organizations (banking, insurance, logistics). Understanding it separates architects from developers in senior interviews.`,
  example:{
    language:"java",
    code:`// Event Sourcing with Axon Framework
@Aggregate
public class OrderAggregate {
    @AggregateIdentifier private String orderId;
    private OrderStatus status;
    private List<OrderItem> items = new ArrayList<>();

    // Command handler — validates and emits event
    @CommandHandler
    public OrderAggregate(CreateOrderCommand cmd) {
        AggregateLifecycle.apply(new OrderCreatedEvent(
            cmd.getOrderId(), cmd.getCustomerId()));
    }

    @CommandHandler
    public void handle(AddItemCommand cmd) {
        if (status != OrderStatus.DRAFT)
            throw new IllegalStateException("Cannot modify confirmed order");
        AggregateLifecycle.apply(new ItemAddedEvent(
            orderId, cmd.getProductId(), cmd.getQuantity(), cmd.getPrice()));
    }

    // Event sourcing handler — rebuilds state from events
    @EventSourcingHandler
    public void on(OrderCreatedEvent event) {
        this.orderId = event.getOrderId();
        this.status = OrderStatus.DRAFT;
    }

    @EventSourcingHandler
    public void on(ItemAddedEvent event) {
        this.items.add(new OrderItem(event.getProductId(),
                                     event.getQuantity(), event.getPrice()));
    }
}

// Projection — builds read model from events
@Component
@ProcessingGroup("order-summary-projection")
public class OrderSummaryProjection {

    @Autowired private OrderSummaryRepository repository;

    @EventHandler
    public void on(OrderCreatedEvent event) {
        repository.save(new OrderSummary(event.getOrderId(),
                                         event.getCustomerId(), OrderStatus.DRAFT));
    }

    @EventHandler
    public void on(ItemAddedEvent event) {
        OrderSummary summary = repository.findById(event.getOrderId()).orElseThrow();
        summary.addItem(event.getProductId(), event.getQuantity(), event.getPrice());
        repository.save(summary);
    }

    // Query handler — serves read model
    @QueryHandler
    public OrderSummary handle(GetOrderSummaryQuery query) {
        return repository.findById(query.getOrderId()).orElseThrow();
    }
}`,
    notes:"Axon stores events in its Event Store. Projections are rebuilt by replaying all events — allows fixing bugs in projections without touching source data."
  },
  interview:[
    {question:"What are the downsides of event sourcing?",
     answer:`1. **Eventual consistency** — projections (read models) lag behind the event store. Reads may return stale data.\n2. **Schema evolution** — once an event is stored, you can't change its structure without upcasters (migration functions that transform old events to new shape).\n3. **Query complexity** — you can't do ad-hoc SQL queries on event store; must build projections for every query pattern.\n4. **Performance** — rebuilding state from 10,000 events per aggregate is slow without snapshots.\n5. **Mental model shift** — team must think in events, not CRUD. High learning curve.\n6. **Debugging** — a bug manifests across many events; hard to reason about current state.`,
     followUps:["What is an upcaster in event sourcing?","When would you NOT use event sourcing?"]
    }
  ],
  tradeoffs:{
    pros:["Complete audit trail (built-in compliance)","Replay events to fix bugs or build new projections","Natural fit for event-driven integration"],
    cons:["Eventual consistency complexity","Schema evolution requires upcasters","Overkill for simple CRUD applications"],
    when:"Use for: complex domains with audit requirements (finance, healthcare), workflows with many state transitions, systems where historical data replay has value. Avoid for: simple CRUD, small teams without DDD experience."
  },
  visual: function(mount) {
    mount.innerHTML='';
    var W=460,H=320;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    canvas.style.cssText='width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='text-align:center;margin-bottom:8px;display:flex;gap:8px;justify-content:center';
    var btnPublish=document.createElement('button');
    btnPublish.textContent='Publish Event';
    btnPublish.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    var btnFail=document.createElement('button');
    btnFail.textContent='Simulate Failure';
    btnFail.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    var btnReset=document.createElement('button');
    btnReset.textContent='Reset';
    btnReset.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    btnRow.appendChild(btnPublish); btnRow.appendChild(btnFail); btnRow.appendChild(btnReset);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    var consumers=[
      {label:'Payment Svc',   x:320,y:130,color:'#58a6ff',status:'idle'},
      {label:'Inventory Svc', x:320,y:180,color:'#58a6ff',status:'idle'},
      {label:'Notif. Svc',    x:320,y:230,color:'#58a6ff',status:'idle'}
    ];
    var dlq={x:390,y:280,w:60,h:22,visible:false};

    var producer={x:30,y:168,w:96,h:40,label:'Order Service',sublabel:'order.placed'};
    var bus={x:170,y:150,w:100,h:56,label:'Event Bus',sublabel:'Kafka/EventBridge'};
    var dots=[];
    var phase=0; // 0=idle,1=to-bus,2=fan-out,3=handled/fail
    var failureIdx=2; // which consumer fails in fail mode
    var failMode=false;
    var animT=0;

    function drawRR(x,y,w,h,r,fill,stroke,lw){
      ctx.beginPath();
      ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||1.5;ctx.stroke();}
    }

    function drawLine(x1,y1,x2,y2,color,dash){
      ctx.save();
      if(dash)ctx.setLineDash(dash);
      ctx.strokeStyle=color;ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      ctx.restore();
    }

    function draw(){
      if(!document.body.contains(canvas))return;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

      // Label: Fan-out
      ctx.fillStyle='#8b949e';ctx.font='10px monospace';ctx.textAlign='left';
      ctx.fillText('Fan-out pattern',170,145);

      // Static lines: bus→consumers
      consumers.forEach(function(c){
        drawLine(bus.x+bus.w,bus.y+bus.h/2,c.x,c.y+14,'#30363d');
      });
      // producer→bus
      drawLine(producer.x+producer.w,producer.y+producer.h/2,bus.x,bus.y+bus.h/2,'#30363d');

      // Producer box
      drawRR(producer.x,producer.y,producer.w,producer.h,6,'#21262d','#ffa657',2);
      ctx.fillStyle='#ffa657';ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillText(producer.label,producer.x+producer.w/2,producer.y+16);
      ctx.fillStyle='#8b949e';ctx.font='9px monospace';
      ctx.fillText(producer.sublabel,producer.x+producer.w/2,producer.y+30);

      // Bus box
      drawRR(bus.x,bus.y,bus.w,bus.h,6,'#161b22','#ffa657',2);
      ctx.fillStyle='#ffa657';ctx.font='bold 10px monospace';ctx.textAlign='center';
      ctx.fillText(bus.label,bus.x+bus.w/2,bus.y+22);
      ctx.fillStyle='#8b949e';ctx.font='9px monospace';
      ctx.fillText(bus.sublabel,bus.x+bus.w/2,bus.y+38);

      // Consumers
      consumers.forEach(function(c,i){
        var borderColor=c.status==='handled'?'#3fb950':c.status==='failed'?'#f85149':'#58a6ff';
        var bgColor=c.status==='handled'?'#0f3020':c.status==='failed'?'#3d1515':'#161b22';
        drawRR(c.x,c.y,100,28,5,bgColor,borderColor,1.5);
        ctx.fillStyle=borderColor;ctx.font='bold 9px monospace';ctx.textAlign='center';
        ctx.fillText(c.label,c.x+50,c.y+12);
        if(c.status==='handled'){
          ctx.fillStyle='#3fb950';ctx.font='11px monospace';
          ctx.fillText('✓ handled',c.x+50,c.y+24);
        } else if(c.status==='failed'){
          ctx.fillStyle='#f85149';ctx.font='10px monospace';
          ctx.fillText('✗ failed',c.x+50,c.y+24);
        }
      });

      // DLQ
      if(dlq.visible){
        drawRR(dlq.x,dlq.y,dlq.w,dlq.h,4,'#3d1515','#f85149',1.5);
        ctx.fillStyle='#f85149';ctx.font='bold 9px monospace';ctx.textAlign='center';
        ctx.fillText('DLQ',dlq.x+dlq.w/2,dlq.y+15);
        drawLine(consumers[failureIdx].x+50,consumers[failureIdx].y+28,dlq.x+dlq.w/2,dlq.y,'#f85149',[3,3]);
      }

      // Dots
      dots.forEach(function(d){
        ctx.beginPath();ctx.arc(d.x,d.y,5,0,Math.PI*2);
        ctx.fillStyle=d.color;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
      });

      // Status text
      var statusMap={0:'',1:'Publishing event to bus…',2:'Fan-out to all consumers…',3:failMode?'Consumer failed → DLQ':'All consumers handled ✓'};
      ctx.fillStyle='#8b949e';ctx.font='11px monospace';ctx.textAlign='center';
      ctx.fillText(statusMap[phase]||'',W/2,H-8);
    }

    function animateDots(fromX,fromY,targets,color,onDone){
      var dt=dots;
      dt.length=0;
      var progress=new Array(targets.length).fill(0);
      var done=new Array(targets.length).fill(false);
      function tick(){
        if(!document.body.contains(canvas))return;
        dt.length=0;
        var allDone=true;
        targets.forEach(function(t,i){
          if(done[i])return;
          allDone=false;
          progress[i]+=0.04;
          if(progress[i]>=1){progress[i]=1;done[i]=true;}
          dt.push({x:fromX+(t.x-fromX)*progress[i],y:fromY+(t.y-fromY)*progress[i],color:color});
        });
        draw();
        if(!allDone)requestAnimationFrame(tick);
        else{dt.length=0;draw();if(onDone)onDone();}
      }
      requestAnimationFrame(tick);
    }

    function runPublish(fail){
      if(phase!==0)return;
      failMode=fail;
      consumers.forEach(function(c){c.status='idle';});
      dlq.visible=false;
      phase=1;
      // Dot from producer to bus
      var px=producer.x+producer.w, py=producer.y+producer.h/2;
      var bx=bus.x+bus.w/2, by=bus.y+bus.h/2;
      animateDots(px,py,[{x:bx,y:by}],'#ffa657',function(){
        phase=2;
        // Fan out from bus to consumers
        var targets=consumers.map(function(c){return {x:c.x,y:c.y+14};});
        animateDots(bx,by,targets,'#58a6ff',function(){
          phase=3;
          if(fail){
            consumers[failureIdx].status='failed';
            consumers.forEach(function(c,i){if(i!==failureIdx)c.status='handled';});
            dlq.visible=true;
          } else {
            consumers.forEach(function(c){c.status='handled';});
          }
          draw();
          setTimeout(function(){phase=0;consumers.forEach(function(c){c.status='idle';});dlq.visible=false;draw();},2500);
        });
      });
    }

    btnPublish.onclick=function(){runPublish(false);};
    btnFail.onclick=function(){runPublish(true);};
    btnReset.onclick=function(){
      phase=0;dots.length=0;dlq.visible=false;
      consumers.forEach(function(c){c.status='idle';});
      draw();
    };
    draw();
  },
  flow:{
    title:"CQRS Write + Read Path",
    caption:"Commands mutate via aggregates; queries read from projections",
    nodes:[
      {id:"client",label:"Client",hint:"Sends commands and queries"},
      {id:"cmd-bus",label:"Command Bus",hint:"Routes command to handler"},
      {id:"aggregate",label:"Order Aggregate",hint:"Validates + emits events"},
      {id:"event-store",label:"Event Store",hint:"Immutable append-only log"},
      {id:"projection",label:"Projection",hint:"Builds read model from events"},
      {id:"read-db",label:"Read DB",hint:"Optimised read model (denormalised)"},
      {id:"query-handler",label:"Query Handler",hint:"Serves read model"}
    ],
    steps:[
      {path:["client","cmd-bus"],label:"Send command",detail:"Client sends PlaceOrderCommand. Command bus routes to OrderCommandHandler."},
      {path:["cmd-bus","aggregate"],label:"Command handled",detail:"Aggregate validates business rules. If valid, emits OrderPlacedEvent."},
      {path:["aggregate","event-store"],label:"Persist event",detail:"Event appended to event store. Immutable — never updated or deleted."},
      {path:["event-store","projection"],label:"Event triggers projection",detail:"Projection handler subscribes to event store. Rebuilds read model on each new event."},
      {path:["projection","read-db"],label:"Update read model",detail:"Denormalised view updated in read DB (e.g. Elasticsearch or PostgreSQL view)."},
      {path:["client","query-handler"],label:"Query read model",detail:"Client queries via query bus. Handler reads from fast, denormalised read DB."},
      {path:["query-handler","read-db"],label:"Return projection",detail:"Read model returned. No joining — pre-computed view."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
