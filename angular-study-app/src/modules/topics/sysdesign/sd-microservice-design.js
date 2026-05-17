(function() {
  var topic = {
  id:"sd-microservice-design", area:"sysdesign",
  title:"Microservice Design — DDD, Boundaries & Strangler Fig",
  tag:"Architecture", tags:["microservices","ddd","bounded context","strangler fig","service mesh","domain driven design","aggregate","anti-corruption layer"],
  concept:`**Domain-Driven Design (DDD)** provides the vocabulary for designing microservice boundaries.

**Key DDD concepts:**
- **Domain** — the problem space your business operates in
- **Bounded Context** — an explicit boundary within which a domain model applies. Different BCs can use the same word with different meanings (Order in Shipping BC vs Order in Billing BC).
- **Aggregate** — cluster of entities treated as a single unit for data changes. All changes go through the aggregate root. Example: Order aggregate (root) + OrderItems + DeliveryAddress.
- **Domain Events** — facts that happened in the domain (OrderPlaced, PaymentFailed). First-class citizens for integration between BCs.
- **Anti-Corruption Layer (ACL)** — translation layer between two BCs to prevent one's model from leaking into the other.

**Service boundary heuristics:**
1. Each service owns one bounded context
2. Services communicate via domain events (async) or well-defined APIs (sync)
3. No shared database — each service has its own DB (polyglot persistence)
4. Services can be deployed independently
5. A service can be rewritten without changing other services

**Strangler Fig pattern** — migrate monolith to microservices incrementally:
1. Route new feature traffic to new microservice (via API gateway)
2. Gradually migrate existing features to microservices
3. Decommission monolith code path once all traffic migrated
4. Monolith "strangled" over months/years without big-bang rewrite`,
  why:`Getting service boundaries wrong is the #1 failure mode in microservices migrations. Too fine-grained = distributed monolith (services chatty, tightly coupled). Too coarse = monolith with deployment overhead.`,
  example:{
    language:"java",
    code:`// DDD Aggregate Root — Order with invariant enforcement
@Entity
public class Order {  // Aggregate Root
    @Id private OrderId id;
    private CustomerId customerId;
    private OrderStatus status;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();  // Entities within aggregate

    private Money total;

    // All mutations go through the aggregate root — enforces invariants
    public void addItem(ProductId productId, int quantity, Money price) {
        if (status != OrderStatus.DRAFT) {
            throw new IllegalStateException("Cannot modify a confirmed order");
        }
        items.add(new OrderItem(productId, quantity, price));
        this.total = calculateTotal();
    }

    public void confirm() {
        if (items.isEmpty()) throw new IllegalStateException("Cannot confirm empty order");
        if (status != OrderStatus.DRAFT) throw new IllegalStateException("Order already confirmed");
        this.status = OrderStatus.CONFIRMED;
        // Register domain event — don't publish directly from aggregate
        DomainEvents.raise(new OrderConfirmed(this.id, this.customerId, this.total));
    }

    // Factory method — always creates valid aggregate
    public static Order create(CustomerId customerId) {
        return new Order(OrderId.generate(), customerId, OrderStatus.DRAFT);
    }
}

// Anti-Corruption Layer — translate between Billing BC and Shipping BC
@Service
public class ShippingAdapter {
    // Billing domain uses "Order"; Shipping domain uses "Shipment"
    public Shipment toShipment(com.billing.Order billingOrder) {
        return Shipment.builder()
            .referenceId(billingOrder.getId().toString())
            .destination(mapAddress(billingOrder.getDeliveryAddress()))
            .items(billingOrder.getItems().stream()
                .map(this::toShipmentItem).collect(toList()))
            .build();
    }
}`,
    notes:"Aggregate boundaries = transaction boundaries. Never hold a transaction across aggregate roots — use eventual consistency via domain events instead."
  },
  interview:[
    {question:"How do you decide the right size for a microservice?",
     answer:`**Too small (nano-services):**\n- Excessive network calls between services (chattiness)\n- Distributed transactions for what should be local operations\n- Operational overhead disproportionate to value\n\n**Too large:**\n- Independent deployability compromised (change in one area requires full deployment)\n- Teams stepping on each other's code\n\n**Right size heuristics:**\n1. **Single bounded context** — one team, one service, one deployment\n2. **Two-pizza rule** — if it takes more than 2 pizzas to feed the team, split the service\n3. **Change frequency** — frequently changed together = together in one service\n4. **Data ownership** — each service owns its data; if two services share a table, merge them\n5. **The 3R test:** Can you Rewrite it in 2 weeks, Release independently, and Run it autonomously?`,
     followUps:["What is the Strangler Fig pattern and when would you use it?","How do you handle distributed transactions when each service has its own database?"]
    }
  ],
  tradeoffs:{
    pros:["Independent deployability and scaling","Technology heterogeneity — right tool per service","Fault isolation — one service down doesn't take all others"],
    cons:["Distributed system complexity — network failures, latency, consistency","Operational overhead — monitoring 50 services vs 1 monolith","Data consistency across services requires eventual consistency patterns"],
    when:"Start with a modular monolith. Extract microservices when: team size > 8, deployment bottlenecks, need to scale one component independently, different technology requirements per component."
  },
  visual: function(mount) {
    mount.innerHTML = '';
    var W=460,H=320;
    var canvas=document.createElement('canvas');
    canvas.width=W; canvas.height=H;
    canvas.style.cssText='width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto';
    var btnRow=document.createElement('div');
    btnRow.style.cssText='text-align:center;margin-bottom:8px;display:flex;gap:8px;justify-content:center';
    var btnPlay=document.createElement('button');
    btnPlay.textContent='▶ Play';
    btnPlay.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    var btnStep=document.createElement('button');
    btnStep.textContent='Step →';
    btnStep.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    var btnReset=document.createElement('button');
    btnReset.textContent='Reset';
    btnReset.style.cssText='padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px';
    btnRow.appendChild(btnPlay); btnRow.appendChild(btnStep); btnRow.appendChild(btnReset);
    mount.appendChild(btnRow); mount.appendChild(canvas);
    var ctx=canvas.getContext('2d');

    // Node definitions
    var nodes={
      client:   {x:220,y:22,w:90,h:28,label:'Client\n(Web/Mobile)',color:'#58a6ff',text:'#0d1117'},
      gw:       {x:185,y:72,w:90,h:28,label:'API Gateway',color:'#ffa657',text:'#0d1117'},
      idp:      {x:360,y:72,w:85,h:28,label:'Identity\nProvider',color:'#bc8cff',text:'#0d1117'},
      a1:       {x:60,y:148,w:72,h:24,label:'Service A1',color:'#3fb950',text:'#0d1117'},
      a2:       {x:60,y:180,w:72,h:24,label:'Service A2',color:'#3fb950',text:'#0d1117'},
      a3:       {x:60,y:212,w:72,h:24,label:'Service A3',color:'#3fb950',text:'#0d1117'},
      dba:      {x:62,y:252,w:68,h:24,label:'DB-A',color:'#238636',text:'#e6edf3'},
      b1:       {x:308,y:148,w:72,h:24,label:'Service B1',color:'#bc8cff',text:'#0d1117'},
      b2:       {x:308,y:188,w:72,h:24,label:'Service B2',color:'#bc8cff',text:'#0d1117'},
      dbb:      {x:310,y:236,w:68,h:24,label:'DB-B',color:'#6e40c9',text:'#e6edf3'},
      reg:      {x:170,y:200,w:80,h:28,label:'Service\nRegistry',color:'#f85149',text:'#e6edf3'}
    };

    // Animation path: client→gw→a1→dba→a1→gw→client
    var path=['client','gw','a1','dba','a1','gw','client'];
    var pathLabels=['Request','Route','Query DB','DB resp','Response','Return'];
    var stepIdx=0;
    var pkt={active:false,x:0,y:0,tx:0,ty:0,progress:0,color:'#ffa657'};
    var playing=false,raf=null;

    function cx(n){return nodes[n].x+nodes[n].w/2;}
    function cy(n){return nodes[n].y+nodes[n].h/2;}

    function drawRoundRect(x,y,w,h,r,fill,stroke){
      ctx.beginPath();
      ctx.moveTo(x+r,y);
      ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
      ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
      ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
      ctx.closePath();
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
    }

    function drawDomain(x,y,w,h,label,borderColor){
      ctx.save();
      ctx.setLineDash([4,3]);
      ctx.strokeStyle=borderColor; ctx.lineWidth=1.5;
      ctx.strokeRect(x,y,w,h);
      ctx.setLineDash([]);
      ctx.fillStyle=borderColor; ctx.font='bold 10px monospace';
      ctx.fillText(label,x+4,y-3);
      ctx.restore();
    }

    function drawDottedLine(x1,y1,x2,y2,color){
      ctx.save();
      ctx.setLineDash([3,4]);
      ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawArrow(x1,y1,x2,y2,color){
      ctx.save();
      ctx.strokeStyle=color; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      var ang=Math.atan2(y2-y1,x2-x1);
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(x2,y2);
      ctx.lineTo(x2-8*Math.cos(ang-0.35),y2-8*Math.sin(ang-0.35));
      ctx.lineTo(x2-8*Math.cos(ang+0.35),y2-8*Math.sin(ang+0.35));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function drawNode(id,highlight){
      var n=nodes[id];
      var fill=highlight?'#ffe566':n.color;
      var textColor=highlight?'#0d1117':n.text;
      drawRoundRect(n.x,n.y,n.w,n.h,5,fill,'#30363d');
      ctx.fillStyle=textColor; ctx.font='bold 10px monospace'; ctx.textAlign='center';
      var lines=n.label.split('\n');
      if(lines.length===1){
        ctx.fillText(lines[0],n.x+n.w/2,n.y+n.h/2+4);
      } else {
        ctx.fillText(lines[0],n.x+n.w/2,n.y+n.h/2-2);
        ctx.fillText(lines[1],n.x+n.w/2,n.y+n.h/2+10);
      }
    }

    function draw(){
      if(!document.body.contains(canvas)) return;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#0d1117'; ctx.fillRect(0,0,W,H);

      // Domain boxes
      drawDomain(36,130,110,120,'Domain A','#3fb950');
      drawDomain(284,130,110,100,'Domain B','#bc8cff');

      // Dotted lines: GW→Registry, GW→IDP
      drawDottedLine(cx('gw'),cy('gw'),cx('reg'),nodes['reg'].y,'#8b949e');
      drawDottedLine(cx('gw'),cy('gw'),cx('idp'),cy('idp'),'#8b949e');
      // Registry→Domain A and B
      drawDottedLine(cx('reg'),cy('reg'),cx('a2'),cy('a2'),'#8b949e');
      drawDottedLine(cx('reg'),cy('reg'),cx('b1'),cy('b1'),'#8b949e');

      // Static flow arrows GW→A1
      drawArrow(cx('gw'),nodes['gw'].y+nodes['gw'].h,cx('a1'),cy('a1'),'#8b949e');
      drawArrow(cx('gw'),nodes['gw'].y+nodes['gw'].h,cx('b1'),cy('b1'),'#8b949e');
      drawArrow(cx('a1'),nodes['a1'].y+nodes['a1'].h,cx('dba'),nodes['dba'].y,'#8b949e');
      drawArrow(cx('b1'),nodes['b1'].y+nodes['b1'].h,cx('dbb'),nodes['dbb'].y,'#8b949e');

      // Nodes
      var highlighted={};
      if(pkt.active && stepIdx>0 && stepIdx<=path.length){
        highlighted[path[stepIdx-1]]=true;
        if(stepIdx<path.length) highlighted[path[stepIdx]]=true;
      }
      Object.keys(nodes).forEach(function(id){ drawNode(id,!!highlighted[id]); });

      // Packet
      if(pkt.active){
        var px=pkt.x+(pkt.tx-pkt.x)*pkt.progress;
        var py=pkt.y+(pkt.ty-pkt.y)*pkt.progress;
        ctx.beginPath(); ctx.arc(px,py,6,0,Math.PI*2);
        ctx.fillStyle=pkt.color; ctx.fill();
        ctx.strokeStyle='#fff'; ctx.lineWidth=1.5; ctx.stroke();
      }

      // Step label
      if(stepIdx>0 && stepIdx<=pathLabels.length){
        ctx.fillStyle='#8b949e'; ctx.font='11px monospace'; ctx.textAlign='center';
        ctx.fillText('Step '+stepIdx+': '+pathLabels[stepIdx-1],W/2,H-8);
      }
    }

    function advanceStep(){
      if(stepIdx>=path.length-1){
        if(playing){playing=false; btnPlay.textContent='▶ Play';}
        pkt.active=false; draw(); return;
      }
      stepIdx++;
      var from=path[stepIdx-1], to=path[stepIdx];
      pkt.active=true; pkt.x=cx(from); pkt.y=cy(from);
      pkt.tx=cx(to); pkt.ty=cy(to); pkt.progress=0;
      animate();
    }

    function animate(){
      if(!document.body.contains(canvas)){playing=false;return;}
      pkt.progress+=0.06;
      if(pkt.progress>=1){
        pkt.progress=1; draw();
        if(playing) setTimeout(advanceStep,300);
        return;
      }
      draw();
      raf=requestAnimationFrame(animate);
    }

    btnStep.onclick=function(){
      if(pkt.progress<1&&pkt.active) return;
      advanceStep();
    };
    btnPlay.onclick=function(){
      if(playing){playing=false;btnPlay.textContent='▶ Play';return;}
      if(stepIdx>=path.length-1){stepIdx=0;pkt.active=false;}
      playing=true; btnPlay.textContent='⏸ Pause';
      advanceStep();
    };
    btnReset.onclick=function(){
      playing=false; btnPlay.textContent='▶ Play';
      stepIdx=0; pkt.active=false; if(raf)cancelAnimationFrame(raf);
      draw();
    };
    draw();
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
