(function() {
  var topic = {
  id:"sd-cloud-aws", area:"sysdesign",
  title:"AWS Cloud — Services by Layer & When to Use Each",
  tag:"Cloud", tags:["aws","ec2","s3","rds","dynamodb","sqs","sns","lambda","cloudfront","route53","eks","elasticache","kinesis"],
  concept:`**AWS services organised by system layer:**

**Compute:**
- **EC2** — virtual machines. Full control. Use for: DB servers, batch compute, custom OS requirements.
- **ECS** (Fargate) — managed containers, no cluster management. Use for: containerised services without K8s complexity.
- **EKS** — managed Kubernetes. Use for: complex microservice orchestration.
- **Lambda** — serverless functions. Use for: event-driven, infrequent, short-duration tasks (<15 min).

**Storage:**
- **S3** — object storage. Unlimited, 11 nines durability. Use for: file uploads, static assets, data lake, backups. Cost: ~$0.023/GB.
- **EBS** — block storage for EC2 instances. SSD (gp3) or provisioned IOPS. 
- **EFS** — managed NFS. Shared across multiple EC2 instances.

**Database:**
- **RDS** (Aurora) — managed relational. Aurora is MySQL/Postgres-compatible with 3-6× throughput. Multi-AZ HA.
- **DynamoDB** — managed NoSQL. Single-digit ms at any scale. Global tables for multi-region.
- **ElastiCache** (Redis/Memcached) — managed cache. Use for: session, rate limiting, pub-sub.
- **Redshift** — data warehouse. Petabyte-scale analytics. Columnar storage.
- **Neptune** — managed graph DB.

**Networking:**
- **VPC** — isolated virtual network. Subnets (public/private), security groups (stateful firewall), NACLs.
- **Route 53** — DNS + health checks + routing policies (latency, geo, weighted, failover).
- **CloudFront** — CDN. 400+ PoPs. Lambda@Edge for edge compute.
- **ALB/NLB** — managed load balancers. ALB=L7 (HTTP routing), NLB=L4 (TCP, ultra-low latency).

**Messaging:**
- **SQS** — managed queue. At-least-once delivery. FIFO option for exactly-once.
- **SNS** — managed pub-sub. Fan-out to SQS, Lambda, email, SMS.
- **Kinesis** (Data Streams) — managed Kafka alternative. Real-time streaming, 7-day retention.
- **EventBridge** — event bus with routing rules. SaaS integration, scheduled events.

**DevOps:**
- **IAM** — identity + access management. Roles, policies, least privilege.
- **CloudWatch** — metrics, logs, alarms, dashboards.
- **CodePipeline + CodeBuild + CodeDeploy** — CI/CD.
- **CDK / CloudFormation / Terraform** — infrastructure as code.`,
  why:`AWS is asked in nearly every infrastructure design interview. Knowing which managed service to choose (and why) vs building yourself is a core senior architect skill.`,
  example:{
    language:"yaml",
    code:`# AWS CDK (TypeScript concept in YAML pseudocode)
# Typical 3-tier web app stack

# Networking
VPC:
  cidr: 10.0.0.0/16
  subnets:
    public:  [10.0.1.0/24, 10.0.2.0/24]   # ALB, NAT Gateway
    private: [10.0.3.0/24, 10.0.4.0/24]   # ECS tasks, Lambda
    data:    [10.0.5.0/24, 10.0.6.0/24]   # RDS, ElastiCache

# CDN + DNS
CloudFront:
  origins:
    - S3 (static assets) - cache 1 year
    - ALB (API) - cache 0s (dynamic)
Route53:
  A record: api.example.com -> CloudFront distribution

# Compute
ALB:
  listeners: [HTTPS:443 -> ECS TargetGroup]
  rules:
    - /api/* -> order-service TG
    - /admin/* -> admin-service TG (auth required)

ECS Fargate:
  services:
    order-service:
      image: 123456789.dkr.ecr.us-east-1.amazonaws.com/order:v2
      cpu: 512, memory: 1024
      desiredCount: 3
      autoScaling: cpu>70% -> scale out, cpu<30% -> scale in
      minHealthyPercent: 100, maxPercent: 200  # zero-downtime rolling deploy

# Database
Aurora PostgreSQL:
  instanceClass: db.r6g.large
  multiAZ: true             # automatic failover <30s
  enablePerformanceInsights: true
  backupRetentionDays: 7

ElastiCache Redis:
  nodeType: cache.r6g.large
  clusterMode: true         # Redis Cluster — sharded
  replicasPerShard: 2

# Messaging
SQS:
  order-queue:
    visibilityTimeout: 300s
    messageRetentionPeriod: 14d
    deadLetterQueue: order-dlq (maxReceiveCount: 3)

SNS:
  order-events-topic: -> [fulfillment-queue, analytics-queue, notification-queue]

# Storage
S3:
  bucket: myapp-assets
  versioning: enabled
  lifecycleRules:
    - transition to Glacier after 90 days
  blockPublicAccess: true   # CloudFront OAC access only`,
    notes:"Always use IAM roles (not access keys) for service-to-service auth in AWS. Least-privilege: each Lambda/ECS task gets only the permissions it needs."
  },
  interview:[
    {question:"How would you design a highly available, multi-region AWS architecture?",
     answer:`1. **Two regions** (us-east-1, eu-west-1) with Route 53 latency-based or failover routing.\n2. **Route 53 health checks** monitor ALB in each region. On failure, traffic automatically shifts to healthy region.\n3. **Aurora Global Database** — primary in us-east-1, read replica in eu-west-1. Replication lag < 1s. On failure, promote secondary in <1 minute.\n4. **DynamoDB Global Tables** — multi-active, automatic conflict resolution (last-write-wins).\n5. **S3 Cross-Region Replication** — static assets replicated to both regions. CloudFront serves from nearest PoP.\n6. **ElastiCache** — separate cluster per region. Cache warms up from DB after region failover.\n7. **Chaos testing** — periodic failover drills to validate RTO/RPO targets.\n\nRTO (Recovery Time Objective): < 5 minutes. RPO (Recovery Point Objective): < 1 second (Aurora Global).`,
     followUps:["What is the difference between RTO and RPO?","How would you handle data residency requirements (EU data must stay in EU)?"]
    }
  ],
  tradeoffs:{
    pros:["Managed services reduce operational burden","Pay-as-you-go — no upfront hardware costs","Global infrastructure with 30+ regions"],
    cons:["Vendor lock-in (especially DynamoDB, Aurora, EventBridge)","Cost can exceed on-prem at very large scale","Managed service limitations (DynamoDB 400KB item limit, Lambda 15min)"],
    when:"Use managed services by default — the operational savings outweigh the lock-in risk. Only consider self-managed (e.g. self-hosted Kafka) at massive scale (>$1M/month cloud spend) where savings justify operational cost."
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

    // Layer definitions (y, h, label, color, nodes)
    var layers = [
      { label:'Users',      color:'#8b949e', y:10,  h:32, nodes:[{label:'Web',x:160},{label:'Mobile',x:300}] },
      { label:'Edge / CDN', color:'#e3b341', y:52,  h:32, nodes:[{label:'CloudFront',x:160},{label:'Route53',x:300}] },
      { label:'Gateway',    color:'#ffa657', y:94,  h:32, nodes:[{label:'API Gateway',x:160},{label:'ALB',x:300}] },
      { label:'Security',   color:'#f85149', y:94,  h:180, nodes:[], outline:true },
      { label:'Compute',    color:'#58a6ff', y:136, h:32, nodes:[{label:'ECS/EKS',x:120},{label:'Lambda',x:230},{label:'Fargate',x:340}] },
      { label:'Storage',    color:'#bc8cff', y:178, h:32, nodes:[{label:'RDS',x:100},{label:'DynamoDB',x:185},{label:'S3',x:270},{label:'ElastiCache',x:368}] },
      { label:'Monitoring', color:'#3fb950', y:220, h:28, nodes:[{label:'CloudWatch',x:160},{label:'X-Ray',x:300}] }
    ];

    var requestTypes = {
      web:    { label:'Web Request',    path:['Users', 'Edge / CDN', 'Gateway', 'Compute', 'Storage', 'Monitoring'], color:'#58a6ff' },
      api:    { label:'API Call',       path:['Users', 'Gateway', 'Compute', 'Storage', 'Monitoring'],               color:'#ffa657' },
      static: { label:'Static Asset',   path:['Users', 'Edge / CDN', 'Storage'],                                     color:'#e3b341' }
    };

    var currentType = 'web';
    var dotPos = 0;
    var dotFrac = 0;
    var animId = null;

    function layerByLabel(lbl) {
      return layers.filter(function(l) { return l.label === lbl && !l.outline; })[0];
    }

    function draw() {
      if (!document.body.contains(canvas)) { if (animId) cancelAnimationFrame(animId); return; }
      var W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0d1117'; ctx.fillRect(0, 0, W, H);

      var rt = requestTypes[currentType];
      var activeLayers = rt.path;

      // Security outline (WAF + VPC + IAM)
      var sec = layers[3];
      ctx.strokeStyle = '#f8514944'; ctx.lineWidth = 1; ctx.setLineDash([4,3]);
      ctx.strokeRect(8, sec.y, W - 16, sec.h);
      ctx.setLineDash([]);
      ctx.font = '8px monospace'; ctx.fillStyle = '#f8514977'; ctx.textAlign = 'right';
      ctx.fillText('IAM + VPC + WAF', W - 12, sec.y + 10);

      // Draw layers
      layers.filter(function(l) { return !l.outline; }).forEach(function(layer) {
        var isActive = activeLayers.indexOf(layer.label) >= 0;
        var alpha = isActive ? 'cc' : '33';

        // Layer background
        ctx.fillStyle = layer.color + (isActive ? '18' : '0a');
        ctx.strokeStyle = layer.color + (isActive ? '88' : '33');
        ctx.lineWidth = isActive ? 1.5 : 1;
        ctx.beginPath();
        ctx.roundRect(10, layer.y, W - 20, layer.h, 4);
        ctx.fill(); ctx.stroke();

        // Layer label (left)
        ctx.font = 'bold 8px monospace';
        ctx.fillStyle = layer.color + (isActive ? 'ff' : '77');
        ctx.textAlign = 'left';
        ctx.fillText(layer.label, 14, layer.y + layer.h / 2 + 3);

        // Nodes
        layer.nodes.forEach(function(n) {
          ctx.fillStyle = layer.color + (isActive ? '33' : '15');
          ctx.strokeStyle = layer.color + (isActive ? 'cc' : '44');
          ctx.lineWidth = 1;
          var nw = 72, nh = 18;
          ctx.beginPath();
          ctx.roundRect(n.x - nw/2, layer.y + layer.h/2 - nh/2, nw, nh, 3);
          ctx.fill(); ctx.stroke();
          ctx.font = '8px monospace';
          ctx.fillStyle = layer.color + (isActive ? 'ff' : '66');
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, layer.y + layer.h/2 + 3);
        });
      });

      // Arrows between active consecutive layers
      for (var i = 0; i < activeLayers.length - 1; i++) {
        var la = layerByLabel(activeLayers[i]);
        var lb = layerByLabel(activeLayers[i+1]);
        if (!la || !lb) continue;
        var ax = W / 2, ay = la.y + la.h;
        var bx = W / 2, by = lb.y;
        ctx.strokeStyle = rt.color + '99'; ctx.lineWidth = 1.5; ctx.setLineDash([3,3]);
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
        ctx.setLineDash([]);
        // Step number
        ctx.fillStyle = rt.color; ctx.font = '9px monospace'; ctx.textAlign = 'center';
        ctx.fillText('①②③④⑤⑥'[i], ax + 6, ay + (by - ay)/2 + 4);
      }

      // Animated dot along path
      var path = activeLayers.map(layerByLabel).filter(Boolean);
      if (path.length > 1) {
        var seg = Math.min(Math.floor(dotFrac), path.length - 2);
        var segFrac = dotFrac - seg;
        var la = path[seg], lb = path[seg+1];
        var dx = W/2, dy = la.y + la.h + (lb.y - la.y - la.h) * segFrac;
        ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2);
        ctx.fillStyle = rt.color;
        ctx.shadowColor = rt.color; ctx.shadowBlur = 10;
        ctx.fill(); ctx.shadowBlur = 0;
      }

      // Legend
      ctx.font = '9px monospace'; ctx.fillStyle = rt.color; ctx.textAlign = 'center';
      ctx.fillText('▶ ' + rt.label, W/2, H - 4);

      animId = requestAnimationFrame(tick);
    }

    function tick() {
      if (!document.body.contains(canvas)) { cancelAnimationFrame(animId); return; }
      dotFrac += 0.03;
      var pathLen = requestTypes[currentType].path.map(layerByLabel).filter(Boolean).length;
      if (dotFrac >= pathLen - 1) dotFrac = 0;
      draw();
    }

    ['web','api','static'].forEach(function(key) {
      var btn = document.createElement('button');
      btn.textContent = '[' + requestTypes[key].label + ']';
      btn.style.cssText = btnStyle;
      btn.addEventListener('click', function() { currentType = key; dotFrac = 0; });
      btnRow.appendChild(btn);
    });

    wrap.appendChild(btnRow);
    wrap.appendChild(canvas);
    mount.appendChild(wrap);
    tick();
  },
  architecture:{
    title:"AWS 3-Tier Web Architecture",
    caption:"CloudFront → ALB → ECS Fargate → Aurora + ElastiCache",
    lanes:[
      {label:"Edge",nodes:[
        {id:"route53",label:"Route 53",hint:"DNS + health checks",detail:"Latency-based routing to nearest region. Health checks monitor ALB. Automatic failover if region unhealthy."},
        {id:"cloudfront",label:"CloudFront",hint:"CDN — 400+ PoPs",detail:"Serves S3 static assets at edge. API requests forwarded to ALB. Lambda@Edge for auth at edge."}
      ]},
      {label:"Load Balancing",nodes:[
        {id:"alb",label:"ALB",hint:"L7 load balancer",detail:"HTTPS termination. Path-based routing (/api → ECS, / → S3). Sticky sessions if needed. WAF integration."},
        {id:"waf",label:"AWS WAF",hint:"SQL injection, XSS protection",detail:"Web Application Firewall. Block OWASP top 10, rate limit per IP, geo-block."}
      ]},
      {label:"Compute",nodes:[
        {id:"ecs",label:"ECS Fargate",hint:"Auto-scaling containers",detail:"Serverless containers. Auto-scales on CPU/memory. Rolling deploys with zero downtime. Service Connect for service discovery."},
        {id:"lambda",label:"Lambda",hint:"Event-driven functions",detail:"Triggered by SQS, SNS, EventBridge, S3. Scales to 0 when idle. 15min max."}
      ]},
      {label:"Data",nodes:[
        {id:"aurora",label:"Aurora PostgreSQL",hint:"Multi-AZ relational DB",detail:"MySQL/Postgres-compatible. 3-6× standard RDS throughput. Multi-AZ automatic failover <30s. Performance Insights."},
        {id:"elasticache",label:"ElastiCache Redis",hint:"Distributed cache",detail:"Redis Cluster mode. Session store, rate limiting, hot data cache. Sub-millisecond latency."},
        {id:"s3",label:"S3",hint:"Object storage",detail:"11 nines durability. Static assets, user uploads, backups, data lake. Lifecycle rules to Glacier."},
        {id:"sqs",label:"SQS + SNS",hint:"Async messaging",detail:"SQS for work queues (at-least-once). SNS for fan-out to multiple queues. DLQ for failed messages."}
      ]}
    ],
    links:[
      {from:"route53",to:"cloudfront",label:"DNS → CDN",detail:"All traffic enters via CloudFront for DDoS absorption and caching.",type:"sync"},
      {from:"cloudfront",to:"alb",label:"Dynamic requests",detail:"Non-cacheable API requests forwarded to origin ALB.",type:"sync"},
      {from:"cloudfront",to:"s3",label:"Static assets",detail:"JS/CSS/images served directly from S3 via CloudFront.",type:"sync"},
      {from:"alb",to:"ecs",label:"HTTP/2 to containers",detail:"ALB distributes across healthy ECS tasks. Health check: /actuator/health.",type:"sync"},
      {from:"ecs",to:"aurora",label:"Reads + writes",detail:"App connects via RDS Proxy (connection pooling). Read replicas for SELECT queries.",type:"sync"},
      {from:"ecs",to:"elasticache",label:"Cache operations",detail:"Redis for session, rate limiting, hot data. Redis Cluster with read replicas.",type:"sync"},
      {from:"ecs",to:"sqs",label:"Publish events",detail:"Async work published to SQS. Lambda or ECS worker drains queue.",type:"async"},
      {from:"lambda",to:"aurora",label:"Event processing",detail:"Lambda processes SQS messages, writes results to DB.",type:"sync"}
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
