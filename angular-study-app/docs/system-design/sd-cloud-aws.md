# AWS Cloud - Services by Layer & When to Use Each

Source: `src/modules/topics/sysdesign/sd-cloud-aws.js`
Tag: `Cloud`
Doc path: `docs/system-design/sd-cloud-aws.md`

## Concept
**AWS services organised by system layer:**

**Compute:**
- **EC2** - virtual machines. Full control. Use for: DB servers, batch compute, custom OS requirements.
- **ECS** (Fargate) - managed containers, no cluster management. Use for: containerised services without K8s complexity.
- **EKS** - managed Kubernetes. Use for: complex microservice orchestration.
- **Lambda** - serverless functions. Use for: event-driven, infrequent, short-duration tasks (<15 min).

**Storage:**
- **S3** - object storage. Unlimited, 11 nines durability. Use for: file uploads, static assets, data lake, backups. Cost: ~$0.023/GB.
- **EBS** - block storage for EC2 instances. SSD (gp3) or provisioned IOPS. 
- **EFS** - managed NFS. Shared across multiple EC2 instances.

**Database:**
- **RDS** (Aurora) - managed relational. Aurora is MySQL/Postgres-compatible with 3-6x throughput. Multi-AZ HA.
- **DynamoDB** - managed NoSQL. Single-digit ms at any scale. Global tables for multi-region.
- **ElastiCache** (Redis/Memcached) - managed cache. Use for: session, rate limiting, pub-sub.
- **Redshift** - data warehouse. Petabyte-scale analytics. Columnar storage.
- **Neptune** - managed graph DB.

**Networking:**
- **VPC** - isolated virtual network. Subnets (public/private), security groups (stateful firewall), NACLs.
- **Route 53** - DNS + health checks + routing policies (latency, geo, weighted, failover).
- **CloudFront** - CDN. 400+ PoPs. Lambda@Edge for edge compute.
- **ALB/NLB** - managed load balancers. ALB=L7 (HTTP routing), NLB=L4 (TCP, ultra-low latency).

**Messaging:**
- **SQS** - managed queue. At-least-once delivery. FIFO option for exactly-once.
- **SNS** - managed pub-sub. Fan-out to SQS, Lambda, email, SMS.
- **Kinesis** (Data Streams) - managed Kafka alternative. Real-time streaming, 7-day retention.
- **EventBridge** - event bus with routing rules. SaaS integration, scheduled events.

**DevOps:**
- **IAM** - identity + access management. Roles, policies, least privilege.
- **CloudWatch** - metrics, logs, alarms, dashboards.
- **CodePipeline + CodeBuild + CodeDeploy** - CI/CD.
- **CDK / CloudFormation / Terraform** - infrastructure as code.

## Production Architecture
AWS is asked in nearly every infrastructure design interview. Knowing which managed service to choose (and why) vs building yourself is a core senior architect skill.

## Architecture Checklist
- Edge / Route 53: Latency-based routing to nearest region. Health checks monitor ALB. Automatic failover if region unhealthy.
- Edge / CloudFront: Serves S3 static assets at edge. API requests forwarded to ALB. Lambda@Edge for auth at edge.
- Load Balancing / ALB: HTTPS termination. Path-based routing (/api -> ECS, / -> S3). Sticky sessions if needed. WAF integration.
- Load Balancing / AWS WAF: Web Application Firewall. Block OWASP top 10, rate limit per IP, geo-block.
- Compute / ECS Fargate: Serverless containers. Auto-scales on CPU/memory. Rolling deploys with zero downtime. Service Connect for service discovery.
- Compute / Lambda: Triggered by SQS, SNS, EventBridge, S3. Scales to 0 when idle. 15min max.
- Data / Aurora PostgreSQL: MySQL/Postgres-compatible. 3-6x standard RDS throughput. Multi-AZ automatic failover <30s. Performance Insights.
- Data / ElastiCache Redis: Redis Cluster mode. Session store, rate limiting, hot data cache. Sub-millisecond latency.
- Data / S3: 11 nines durability. Static assets, user uploads, backups, data lake. Lifecycle rules to Glacier.
- Data / SQS + SNS: SQS for work queues (at-least-once). SNS for fan-out to multiple queues. DLQ for failed messages.

## Mermaid Architecture
```mermaid
flowchart LR
  subgraph lane_0["Edge"]
    route53["Route 53"]
    cloudfront["CloudFront"]
  end
  subgraph lane_1["Load Balancing"]
    alb["ALB"]
    waf["AWS WAF"]
  end
  subgraph lane_2["Compute"]
    ecs["ECS Fargate"]
    lambda["Lambda"]
  end
  subgraph lane_3["Data"]
    aurora["Aurora PostgreSQL"]
    elasticache["ElastiCache Redis"]
    s3["S3"]
    sqs["SQS + SNS"]
  end
  route53 -->|"DNS -> CDN"| cloudfront
  cloudfront -->|"Dynamic requests"| alb
  cloudfront -->|"Static assets"| s3
  alb -->|"HTTP/2 to containers"| ecs
  ecs -->|"Reads + writes"| aurora
  ecs -->|"Cache operations"| elasticache
  ecs -.->|"Publish events"| sqs
  lambda -->|"Event processing"| aurora
```

## UML Sequence
```mermaid
sequenceDiagram
  participant a0 as Client
  participant a1 as App
  participant a2 as Cache
  participant a3 as Source DB
  participant a4 as Invalidator
  a0->>a1: Send request
  a1->>a2: Validate and route
  a2-->>a3: Process side effect
  a2->>a4: Read/write state
  a4->>a2: Ack state change
  a2->>a1: Return result
  a3-->>a4: Record async outcome
```

## Animation Plan
Interactive app sections for this concept:

- Flow lab: highlights request path step by step.
- UML sequence simulation: animates actor-to-actor messages.
- Architecture map: clickable nodes and sync/async links.
- Canvas visual: existing topic-specific live diagram remains available in app.

Flow steps:

1. Enter system - Request crosses trust boundary and gets normalized before core handling.
2. Execute core path - Gateway routes to owning capability with timeout, auth context, and trace id.
3. Offload slow work - Async path absorbs retries, fanout, indexing, notifications, or heavy processing.
4. Persist state - System writes durable state, cache entries, offsets, or audit evidence.
5. Return or recover - Response returns when sync work succeeds; failure path uses retry, fallback, or replay.

## Interview Drills
1. How would you design a highly available, multi-region AWS architecture?
   1. **Two regions** (us-east-1, eu-west-1) with Route 53 latency-based or failover routing.
   2. **Route 53 health checks** monitor ALB in each region. On failure, traffic automatically shifts to healthy region.
   3. **Aurora Global Database** - primary in us-east-1, read replica in eu-west-1. Replication lag < 1s. On failure, promote secondary in <1 minute.
   4. **DynamoDB Global Tables** - multi-active, automatic conflict resolution (last-write-wins).
   5. **S3 Cross-Region Replication** - static assets replicated to both regions. CloudFront serves from nearest PoP.
   6. **ElastiCache** - separate cluster per region. Cache warms up from DB after region failover.
   7. **Chaos testing** - periodic failover drills to validate RTO/RPO targets.
   
   RTO (Recovery Time Objective): < 5 minutes. RPO (Recovery Point Objective): < 1 second (Aurora Global).
   Follow-ups: What is the difference between RTO and RPO?; How would you handle data residency requirements (EU data must stay in EU)?

## Trade-offs
Pros:
- Managed services reduce operational burden
- Pay-as-you-go - no upfront hardware costs
- Global infrastructure with 30+ regions

Cons:
- Vendor lock-in (especially DynamoDB, Aurora, EventBridge)
- Cost can exceed on-prem at very large scale
- Managed service limitations (DynamoDB 400KB item limit, Lambda 15min)

When to use:
Use managed services by default - the operational savings outweigh the lock-in risk. Only consider self-managed (e.g. self-hosted Kafka) at massive scale (>$1M/month cloud spend) where savings justify operational cost.

## Gotchas
_No gotchas yet._

