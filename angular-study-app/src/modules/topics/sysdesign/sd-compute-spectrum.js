(function() {
  var topic = {
  id:"sd-compute-spectrum", area:"sysdesign",
  title:"Compute Spectrum — VMs, Containers & Serverless",
  tag:"Compute", tags:["vm","container","serverless","lambda","docker","kubernetes","fargate","cold start","ec2"],
  concept:`**Spectrum from most to least control:**

**1. Bare Metal → EC2 (Virtual Machines)**
- Full OS control. Predictable performance. No noisy-neighbour.
- Best for: databases, high-performance compute, compliance requiring isolation.
- Cost: highest. Startup: minutes. Management: full.

**2. Containers (Docker + Kubernetes / ECS)**
- Share host OS kernel. Lightweight (~10MB vs GB for VM). Start in seconds.
- Portable — same image runs locally, CI, and production.
- Kubernetes: orchestration, auto-healing, rolling deploys, HPA.
- Best for: long-running web services, background workers, scheduled jobs.

**3. Serverless (Lambda, Cloud Functions, Fargate)**
- No servers to manage. Pay per invocation. Auto-scales to zero.
- **Cold start:** container initialisation latency (100ms–3s for Java; <50ms for Go/Node).
- Concurrency model: each invocation is isolated. No shared state in process.
- Best for: event-driven processing, infrequent workloads, ETL, webhooks.

**Comparison:**
| | VM (EC2) | Container (K8s) | Serverless (Lambda) |
|---|---|---|---|
| Startup | Minutes | Seconds | 100ms–3s |
| Cost model | Per hour | Per hour | Per invocation |
| Scale to zero | No | Possible (KEDA) | Yes |
| State | Persistent disk | Ephemeral pod | No persistent state |
| Cold start | N/A | Seconds | Yes (critical issue) |
| Max duration | Unlimited | Unlimited | 15 min (Lambda) |`,
  why:`Choosing the wrong compute model costs money or creates operational burden. Lambda for 24/7 high-traffic = 10× more expensive than EC2. EC2 for sporadic events = paying for idle.`,
  example:{
    language:"yaml",
    code:`# AWS Lambda — event-driven, scales to zero
# serverless.yml (Serverless Framework)
service: order-processor
provider:
  name: aws
  runtime: java17
  memorySize: 512
  timeout: 30
  environment:
    DB_URL: !Sub "jdbc:postgresql://\${DbHost}/orders"

functions:
  processOrder:
    handler: com.example.OrderHandler::handleRequest
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10           # Process 10 SQS messages per invocation
          maximumBatchingWindow: 5 # Wait up to 5s to fill batch

  # HTTP API (API Gateway → Lambda)
  getOrder:
    handler: com.example.OrderQueryHandler::handleRequest
    events:
      - httpApi:
          path: /orders/{id}
          method: GET
    # Provisioned concurrency to eliminate cold starts for hot path
    provisionedConcurrency: 5

---
# SnapStart (Java Lambda) — pre-initialise JVM snapshot
# Add to Lambda config:
# SnapStart:
#   ApplyOn: PublishedVersions
# Reduces Java cold start from 3s → 200ms`,
    notes:"Lambda SnapStart (Java) takes a snapshot of the initialised JVM. Restores from snapshot instead of cold-starting — reduces latency by 10×."
  },
  interview:[
    {question:"How do you reduce Lambda cold start latency for a Java service?",
     answer:`**Cold start causes:** JVM startup (~500ms) + class loading + Spring context initialization (500ms-2s).\n\n**Mitigation strategies:**\n1. **Lambda SnapStart** — JVM snapshot taken after init; restored on cold start. Java 17+.\n2. **Provisioned concurrency** — keep N Lambda instances warm. Eliminates cold starts but costs per hour.\n3. **Smaller deployment package** — fewer classes to load. Use tree-shaking, avoid fat jars.\n4. **GraalVM native image** — compile Java to native binary. Start in <50ms. But: longer build, limited reflection.\n5. **Switch runtime** — Node.js/Go/Python have 50-100ms cold starts vs Java's 1-3s.\n6. **Keep warm ping** — EventBridge rule pings Lambda every 5 minutes. Dirty solution, not reliable.`,
     followUps:["What is GraalVM native compilation and what are its limitations?","How does Lambda handle 10,000 concurrent invocations?"]
    }
  ],
  tradeoffs:{
    pros:["Serverless: zero ops, auto-scale, pay-per-use","Containers: portability + K8s orchestration","VMs: maximum performance predictability"],
    cons:["Serverless: cold starts, 15-min max, stateless","Containers: K8s complexity","VMs: slow provisioning, manual scaling"],
    when:"Serverless for event-driven, infrequent, or unpredictable loads. Containers for steady web services. VMs for databases and performance-critical compute."
  },
  visual: {
    type: 'swimlane',
    title: '⚡ Compute Spectrum — Bare Metal → VM → Containers → Serverless',
    lanes: [
      {
        id: 'bare-metal',
        label: 'Bare Metal',
        color: '#8b949e',
        badge: 'Max Control',
        description: 'Full hardware access — no hypervisor overhead',
        nodes: [
          { id: 'bm-boot', label: 'Boot Time', sublabel: '~5 minutes', icon: '⏱️' },
          { id: 'bm-iso', label: 'Isolation', sublabel: 'Physical hardware', icon: '🛡️' },
          { id: 'bm-cost', label: 'Cost Model', sublabel: 'Reserved $$$$', icon: '💰' },
          { id: 'bm-use', label: 'Best For', sublabel: 'HPC / DB servers', icon: '🎯' }
        ]
      },
      {
        id: 'vms',
        label: 'Virtual Machines (EC2)',
        color: '#58a6ff',
        badge: 'High Control',
        description: 'Hypervisor isolation — full OS per VM',
        nodes: [
          { id: 'vm-boot', label: 'Boot Time', sublabel: '~60 seconds', icon: '⏱️' },
          { id: 'vm-iso', label: 'Isolation', sublabel: 'Hypervisor (KVM)', icon: '🛡️' },
          { id: 'vm-cost', label: 'Cost Model', sublabel: 'Per hour $$$', icon: '💰' },
          { id: 'vm-use', label: 'Best For', sublabel: 'Lift-and-shift', icon: '🎯' }
        ]
      },
      {
        id: 'containers',
        label: 'Containers + Kubernetes',
        color: '#ffa657',
        badge: 'Medium Control',
        description: 'Shared kernel — lightweight, portable',
        nodes: [
          { id: 'ct-boot', label: 'Boot Time', sublabel: '~1-5 seconds', icon: '⏱️' },
          { id: 'ct-iso', label: 'Isolation', sublabel: 'Namespace / cgroups', icon: '🛡️' },
          { id: 'ct-cost', label: 'Cost Model', sublabel: 'Per hour $$', icon: '💰' },
          { id: 'ct-use', label: 'Best For', sublabel: 'Web services / HPA', icon: '🎯' }
        ]
      },
      {
        id: 'serverless',
        label: 'Serverless (Lambda / Fargate)',
        color: '#3fb950',
        badge: 'Max Abstraction',
        description: 'No infra management — scale to zero',
        nodes: [
          { id: 'sl-boot', label: 'Boot Time', sublabel: '100ms–3s cold', icon: '⏱️' },
          { id: 'sl-iso', label: 'Isolation', sublabel: 'Per-invocation', icon: '🛡️' },
          { id: 'sl-cost', label: 'Cost Model', sublabel: 'Per invocation $', icon: '💰' },
          { id: 'sl-use', label: 'Best For', sublabel: 'Events / webhooks', icon: '🎯' }
        ]
      }
    ]
  }
};
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
