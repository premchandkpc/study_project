(function() {
  var topic = {
  id:"sd-messaging-patterns", area:"sysdesign",
  title:"Messaging Patterns — Queue, Pub/Sub, Outbox & Dead Letter",
  tag:"Messaging", tags:["message queue","pub sub","dead letter","outbox pattern","rabbitmq","sqs","fanout","at least once","idempotent"],
  concept:`**Point-to-point queue:** Message goes to exactly one consumer. Work queue pattern. RabbitMQ/SQS.
**Pub/sub:** Publisher sends to topic; all subscribers receive a copy. SNS, Kafka consumer groups, Redis pub/sub.

**Delivery guarantees:**
- **At-most-once** — fire and forget. No ack, no retry. May lose messages. Best throughput.
- **At-least-once** — ack required; on failure retry. May duplicate. Consumer must be idempotent.
- **Exactly-once** — idempotent producer + transactional consumer. Kafka EOS, SQS FIFO + deduplication ID.

**Outbox pattern** — solve dual-write problem (DB + message broker in one atomic operation):
1. Write event to \`outbox\` table in same DB transaction as business data
2. Background process (Debezium CDC or polling) reads outbox table and publishes to broker
3. On success, mark outbox row as processed

**Dead Letter Queue (DLQ):**
Messages that fail after N retries are moved to a DLQ. Allows inspection, replay, and alerting without blocking the main queue.

**Fan-out pattern (SNS + SQS):**
SNS topic → multiple SQS queues. Each queue serves a different downstream service. Fully decoupled.

**Competing consumers:** Multiple workers read from one queue. Throughput scales horizontally. Auto-scaling based on queue depth (SQS + Lambda / ECS).`,
  why:`Messaging is the glue of distributed systems. Understanding delivery guarantees and the outbox pattern is critical for building correct async services.`,
  example:{
    language:"java",
    code:`// Outbox pattern with Spring + Debezium CDC
// Step 1: Write order + outbox entry in one transaction
@Service
@Transactional
public class OrderService {

    @Autowired private OrderRepository orderRepo;
    @Autowired private OutboxRepository outboxRepo;

    public Order createOrder(CreateOrderRequest req) {
        Order order = orderRepo.save(new Order(req));

        // Same DB transaction — atomically consistent
        outboxRepo.save(OutboxEvent.builder()
            .aggregateType("Order")
            .aggregateId(order.getId().toString())
            .eventType("OrderCreated")
            .payload(toJson(order))
            .status(OutboxStatus.PENDING)
            .build());

        return order; // Kafka publish happens via Debezium CDC, not here
    }
}

// Step 2: Debezium CDC config (listens to outbox table changes)
// application.yml
// debezium:
//   connector.class: io.debezium.connector.postgresql.PostgresConnector
//   database.server.name: myapp
//   table.include.list: public.outbox_events
//   transforms: outbox
//   transforms.outbox.type: io.debezium.transforms.outbox.EventRouter

// Step 3: Consumer — idempotent processing
@KafkaListener(topics = "order.OrderCreated")
public class OrderCreatedConsumer {

    @Autowired private ProcessedEventRepository processed;
    @Autowired private InventoryService inventory;

    public void handle(OrderCreatedEvent event) {
        // Idempotency check — skip if already processed
        if (processed.existsByEventId(event.getId())) return;

        inventory.reserve(event.getItems());
        processed.save(new ProcessedEvent(event.getId()));
    }
}`,
    notes:"Debezium uses PostgreSQL logical replication to capture outbox table changes — no polling overhead, sub-second latency."
  },
  interview:[
    {question:"How would you design a notification system for 100M users?",
     answer:`1. **Event bus:** User actions publish events to Kafka topic \`user.events\`\n2. **Notification service:** Kafka consumer group reads events, applies notification rules (preferences, quiet hours, dedup)\n3. **Fan-out to channels:** SNS topic per channel type → SQS queues for push (FCM/APNs), email (SES), SMS (Twilio)\n4. **Workers per channel:** ECS/Lambda workers drain queues, call third-party APIs with retry + DLQ\n5. **Rate limiting:** Per-user rate limits to avoid notification spam (Redis sorted set sliding window)\n6. **Deduplication:** Notification ID stored in Redis/DB; skip if already sent within dedup window\n\n**Scale:** Kafka can handle 10M events/s. Each SQS queue auto-scales workers. At 100M users, push notifications batch via FCM's batch API (1000/request).`,
     followUps:["How do you handle FCM/APNs delivery failures?","How would you implement quiet hours per timezone?"]
    }
  ],
  tradeoffs:{
    pros:["Decouples services — producer and consumer evolve independently","Async processing improves throughput","DLQ prevents poisoned messages from blocking processing"],
    cons:["Eventual consistency — consumer may lag","At-least-once requires idempotent consumers","Debugging async flows is harder than synchronous"],
    when:"Use async messaging for: notifications, email, audit logs, inter-service events, workflow orchestration. Keep synchronous for: payment confirmation, inventory reservation (need immediate response)."
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
    var btnRR=mkBtn('Request-Reply');
    var btnPS=mkBtn('Pub-Sub');
    var btnPP=mkBtn('Point-to-Point');
    btnRow.appendChild(btnRR); btnRow.appendChild(btnPS); btnRow.appendChild(btnPP);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    var mode='rr';
    var dots=[];
    var msgCount={rr:0,ps:0,pp:[0,0,0]};
    var rrPhase=0; // 0=idle,1=req,2=reply
    var psPhase=0;
    var ppPhase=0;
    var ppWorker=-1;
    var animating=false;

    function drawRR2(x,y,w,h,r,fill,stroke){
      ctx.beginPath();
      ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
    }

    function drawArrow(x1,y1,x2,y2,color){
      ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
      var a=Math.atan2(y2-y1,x2-x1);
      ctx.fillStyle=color;ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-7*Math.cos(a-0.4),y2-7*Math.sin(a-0.4));
      ctx.lineTo(x2-7*Math.cos(a+0.4),y2-7*Math.sin(a+0.4));
      ctx.closePath();ctx.fill();ctx.restore();
    }

    function label(text,x,y,color,size){
      ctx.fillStyle=color||'#e6edf3';ctx.font=(size||10)+'px monospace';ctx.textAlign='center';
      ctx.fillText(text,x,y);
    }

    function box(x,y,w,h,fill,border,text,textColor,small){
      drawRR2(x,y,w,h,5,fill,border);
      ctx.fillStyle=textColor||'#e6edf3';
      ctx.font=(small?'8':'9')+'px monospace';ctx.textAlign='center';
      ctx.fillText(text,x+w/2,y+h/2+4);
    }

    function animateDot(x1,y1,x2,y2,color,onDone){
      var p=0;
      function tick(){
        if(!document.body.contains(canvas))return;
        dots=[{x:x1+(x2-x1)*p,y:y1+(y2-y1)*p,color:color}];
        p+=0.05;
        draw();
        if(p<1)requestAnimationFrame(tick);
        else{dots=[];if(onDone)onDone();}
      }
      requestAnimationFrame(tick);
    }

    function drawScene(){
      ctx.clearRect(0,0,W,H);ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);

      if(mode==='rr'){
        // Nodes
        box(20,100,80,30,'#161b22','#58a6ff','Client','#58a6ff');
        box(200,80,90,30,'#161b22','#ffa657','[Queue]','#ffa657');
        box(200,130,90,30,'#161b22','#ffa657','[Reply Q]','#ffa657');
        box(360,100,80,30,'#161b22','#3fb950','Server','#3fb950');
        // Correlation ID badge
        box(190,42,110,22,'#21262d','#bc8cff','corr-id: abc123','#bc8cff',true);
        drawArrow(100,115,200,95,'#8b949e');
        drawArrow(290,95,360,115,'#8b949e');
        drawArrow(360,115,290,145,'#8b949e');
        drawArrow(200,145,100,120,'#8b949e');
        label('Request-Reply Pattern',W/2,H-30,'#8b949e',10);
        label('Client→Queue→Server→ReplyQ→Client',W/2,H-14,'#8b949e',9);
        label('Requests: '+msgCount.rr,W/2,H-50,'#3fb950',11);
        // Phase highlights
        if(rrPhase===1) label('→ Request sent',W/2,65,'#ffa657',10);
        if(rrPhase===2) label('← Reply received',W/2,65,'#58a6ff',10);
      }

      if(mode==='ps'){
        box(20,140,88,30,'#161b22','#ffa657','Publisher','#ffa657');
        box(185,130,90,36,'#161b22','#ffa657','[Topic]','#ffa657');
        var subs=[{y:90,label:'Subscriber 1'},{y:140,label:'Subscriber 2'},{y:190,label:'Subscriber 3'}];
        subs.forEach(function(s){
          box(350,s.y,88,26,'#161b22','#58a6ff',s.label,'#58a6ff');
          drawArrow(275,148,350,s.y+13,'#8b949e');
        });
        drawArrow(108,155,185,148,'#8b949e');
        label('Pub-Sub Fan-out',W/2,H-30,'#8b949e',10);
        label('Published: '+msgCount.ps,W/2,H-14,'#3fb950',11);
        if(psPhase===1)label('Fan-out to all subscribers',W/2,H-50,'#ffa657',10);
      }

      if(mode==='pp'){
        box(20,140,88,30,'#161b22','#ffa657','Producer','#ffa657');
        box(185,130,90,36,'#161b22','#ffa657','[Queue]','#ffa657');
        var workers=[{y:80,label:'Worker 1'},{y:136,label:'Worker 2'},{y:190,label:'Worker 3'}];
        workers.forEach(function(w,i){
          var hi=ppWorker===i;
          box(350,w.y,80,26,hi?'#0f3020':'#161b22',hi?'#3fb950':'#58a6ff',w.label,hi?'#3fb950':'#58a6ff');
          if(hi){ctx.fillStyle='#3fb950';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('✓ msg#'+msgCount.pp[i],350+40,w.y+24);}
          drawArrow(275,148,350,w.y+13,'#8b949e');
        });
        drawArrow(108,155,185,148,'#8b949e');
        label('Point-to-Point: one consumer per msg',W/2,H-30,'#8b949e',10);
        label('Each msg consumed exactly once',W/2,H-14,'#8b949e',9);
        if(ppWorker>=0) label('Worker '+(ppWorker+1)+' got the message',W/2,H-50,'#3fb950',10);
      }

      // dots
      dots.forEach(function(d){
        ctx.beginPath();ctx.arc(d.x,d.y,5,0,Math.PI*2);
        ctx.fillStyle=d.color;ctx.fill();
        ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
      });
    }

    function draw(){drawScene();}

    canvas.addEventListener('click',function(){
      if(animating)return;
      if(mode==='rr'){
        animating=true;rrPhase=1;msgCount.rr++;
        // Client→Queue→Server→ReplyQ→Client
        animateDot(100,115,200,95,'#ffa657',function(){
          animateDot(290,95,360,115,'#3fb950',function(){
            rrPhase=2;
            animateDot(360,115,290,145,'#58a6ff',function(){
              animateDot(200,145,100,120,'#58a6ff',function(){
                rrPhase=0;animating=false;draw();
              });
            });
          });
        });
      } else if(mode==='ps'){
        animating=true;psPhase=1;msgCount.ps++;
        var subs=[{y:90},{y:140},{y:190}];
        var done=0;
        subs.forEach(function(s){
          animateDot(108,155,185,148,'#ffa657',function(){
            animateDot(275,148,350,s.y+13,'#58a6ff',function(){
              done++;
              if(done===subs.length){psPhase=0;animating=false;draw();}
            });
          });
        });
      } else if(mode==='pp'){
        animating=true;
        var w=Math.floor(Math.random()*3);
        ppWorker=w;msgCount.pp[w]++;
        var yy=[80,136,190];
        animateDot(108,155,185,148,'#ffa657',function(){
          animateDot(275,148,350,yy[w]+13,'#3fb950',function(){
            animating=false;draw();
            setTimeout(function(){ppWorker=-1;draw();},1200);
          });
        });
      }
    });

    btnRR.onclick=function(){mode='rr';rrPhase=0;psPhase=0;ppPhase=0;ppWorker=-1;dots=[];animating=false;draw();};
    btnPS.onclick=function(){mode='ps';rrPhase=0;psPhase=0;ppPhase=0;ppWorker=-1;dots=[];animating=false;draw();};
    btnPP.onclick=function(){mode='pp';rrPhase=0;psPhase=0;ppPhase=0;ppWorker=-1;dots=[];animating=false;draw();};

    label;
    draw();
    ctx.fillStyle='#8b949e';ctx.font='9px monospace';ctx.textAlign='center';
    ctx.fillText('Click canvas to send a message',W/2,H/2+80);
  },
  flow:{
    title:"Outbox → Kafka → Consumer Flow",
    caption:"Outbox pattern solves dual-write; DLQ handles poison messages",
    nodes:[
      {id:"app",label:"Order Service",hint:"Business logic + DB write"},
      {id:"db",label:"PostgreSQL",hint:"orders + outbox tables"},
      {id:"debezium",label:"Debezium CDC",hint:"Captures outbox table changes"},
      {id:"kafka",label:"Kafka Topic",hint:"order.OrderCreated"},
      {id:"consumer",label:"Inventory Consumer",hint:"Idempotent processor"},
      {id:"dlq",label:"Dead Letter Queue",hint:"Failed messages after N retries"}
    ],
    steps:[
      {path:["app","db"],label:"Atomic DB write",detail:"Order + OutboxEvent written in one DB transaction. No dual-write risk."},
      {path:["db","debezium"],label:"CDC captures change",detail:"Debezium reads PostgreSQL WAL (logical replication). Detects new outbox row."},
      {path:["debezium","kafka"],label:"Publish to Kafka",detail:"Debezium publishes event to Kafka topic. Reliable — Kafka is durable."},
      {path:["kafka","consumer"],label:"Consumer reads event",detail:"Inventory consumer reads OrderCreated. Checks idempotency key. Reserves stock."},
      {path:["consumer","dlq"],label:"On failure → DLQ",detail:"If consumer fails after 3 retries, message moved to DLQ for inspection and manual replay."}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
