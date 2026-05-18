(function() {
  var topic = {
    id:"sd-kubernetes-prod", area:"sysdesign",
    title:"Kubernetes in Production — Pods, HPA & Rolling Deploys",
    tag:"Compute", tags:["kubernetes","k8s","pod","deployment","hpa","service","ingress","rolling deploy","liveness probe","readiness probe"],
    concept:`**Core Kubernetes objects:**

**Pod** — smallest deployable unit. One or more containers sharing network namespace and volumes. Ephemeral — never SSH into a pod.

**Deployment** — manages a ReplicaSet (N pod replicas). Handles rolling updates and rollbacks.

**Service** — stable virtual IP + DNS name for a set of pods. Types: ClusterIP (internal), NodePort, LoadBalancer (cloud LB), ExternalName.

**Ingress** — L7 HTTP routing rule (path/host → Service). Implemented by ingress controllers (nginx, Traefik, ALB Ingress).

**ConfigMap + Secret** — externalise configuration. Secrets base64-encoded (not encrypted by default — use Sealed Secrets or External Secrets Operator with AWS Secrets Manager).

**HPA (Horizontal Pod Autoscaler)** — scales Deployment replica count based on CPU/memory/custom metrics (via KEDA for queue depth).

**Rolling deploy strategy:**
\`\`\`
maxSurge: 1      # Allow 1 extra pod during update
maxUnavailable: 0 # Keep all pods available (zero downtime)
\`\`\`
New pods start → pass readiness probe → added to service endpoints → old pods terminated.

**Probes:**
- **Liveness** — is pod alive? Failure → container restart.
- **Readiness** — is pod ready to receive traffic? Failure → removed from service endpoints (but not restarted).
- **Startup** — for slow-starting apps. Disables liveness until started.`,
    why:"K8s is the industry standard for container orchestration. Interview questions cover deployments, scaling, networking, and troubleshooting. Understanding probes alone can save hours of incident debugging.",
    example:{
      language:"yaml",
      code:`# Production-grade Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0        # zero-downtime deploy
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v2.1.0
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:v2.1.0
          ports: [{containerPort: 8080}]
          resources:
            requests: {cpu: "100m", memory: "256Mi"}
            limits:   {cpu: "500m", memory: "512Mi"}
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          readinessProbe:
            httpGet: {path: /actuator/health/readiness, port: 8080}
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet: {path: /actuator/health/liveness, port: 8080}
            initialDelaySeconds: 30
            periodSeconds: 10
---
# HPA — scale on CPU + custom metric (queue depth)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: External             # KEDA custom metric
      external:
        metric:
          name: sqs_messages_visible
          selector:
            matchLabels:
              queue: order-queue
        target:
          type: AverageValue
          averageValue: "30"     # Scale up if >30 msgs/pod`,
      notes:"Always set resource requests+limits. Without them, pods can starve other pods (requests) or be OOMKilled (limits). requests=what scheduler uses; limits=hard cap."
    },
    interview:[
      {question:"What happens when a pod fails its liveness probe?",
        answer:"The kubelet on the node restarts the container (not the pod). The pod itself stays — it retains its IP, volumes, and resource reservation. The container's process is killed and restarted according to the pod's `restartPolicy` (default: Always).\n\n**Key distinction from readiness:** A failed readiness probe removes the pod from Service endpoints (no traffic) but doesn't restart it. A failed liveness probe restarts the container.\n\n**Common pitfall:** Setting liveness probe path same as a heavyweight health endpoint. If liveness probe itself causes load → cascade. Use a simple fast endpoint for liveness (`/live`) separate from deep health check.",
        followUps:["What is pod disruption budget and why is it important?","How does K8s handle node failure?"]
      }
    ],
    tradeoffs:{
      pros:["Self-healing (pod restart, node replacement)","Declarative — desired state reconciled automatically","Rich ecosystem: Helm, Kustomize, ArgoCD, KEDA"],
      cons:["Steep learning curve","etcd is a critical single point — must be HA","Networking complexity (CNI, service mesh)"],
      when:"K8s for anything running more than a handful of microservices in production. Use managed K8s (EKS, GKE, AKS) — running your own control plane is expensive."
    },
    visual: {
      type: "layered",
      title: "☸️ Kubernetes Production Architecture",
      layers: [
        {
          id: "client",
          label: "Client Layer",
          color: "#58a6ff",
          protocols: "kubectl / HTTP / gRPC",
          services: [
            { id: "kubectl", label: "kubectl", icon: "💻", sublabel: "CLI" },
            { id: "app-client", label: "App Client", icon: "🌐", sublabel: "HTTPS" },
            { id: "cicd", label: "CI/CD", icon: "🔄", sublabel: "GitOps / ArgoCD" }
          ]
        },
        {
          id: "ingress",
          label: "Ingress Layer",
          color: "#ffa657",
          protocols: "HTTP / TLS Termination",
          services: [
            { id: "ingress-ctrl", label: "Ingress Controller", icon: "🔀", sublabel: "Nginx / Traefik" },
            { id: "lb", label: "Cloud LB", icon: "⚖️", sublabel: "L4 / L7" }
          ]
        },
        {
          id: "control-plane",
          label: "Control Plane",
          color: "#bc8cff",
          protocols: "xDS / etcd / Watch API",
          services: [
            { id: "api-server", label: "API Server", icon: "🧩", sublabel: "REST + Watch" },
            { id: "etcd", label: "etcd", icon: "🗃️", sublabel: "Cluster State" },
            { id: "scheduler", label: "Scheduler", icon: "📋", sublabel: "Filter → Score → Bind" },
            { id: "ctrl-mgr", label: "Controller Mgr", icon: "⚙️", sublabel: "ReplicaSet / HPA" }
          ]
        },
        {
          id: "node-layer",
          label: "Worker Node Layer",
          color: "#3fb950",
          protocols: "CRI / CNI / CSI",
          services: [
            { id: "kubelet", label: "kubelet", icon: "🤖", sublabel: "Node Agent" },
            { id: "kube-proxy", label: "kube-proxy", icon: "🔗", sublabel: "iptables / IPVS" },
            { id: "container-rt", label: "Container Runtime", icon: "🐳", sublabel: "containerd / CRI-O" }
          ]
        },
        {
          id: "pod-layer",
          label: "Pod Layer",
          color: "#e3b341",
          protocols: "localhost / Pod Network",
          services: [
            { id: "app-container", label: "App Container", icon: "📦", sublabel: "Your code" },
            { id: "sidecar", label: "Sidecar", icon: "🛡️", sublabel: "Envoy / logging" },
            { id: "init-container", label: "Init Container", icon: "🚀", sublabel: "Pre-flight checks" },
            { id: "hpa", label: "HPA", icon: "📈", sublabel: "Auto-scaling" }
          ]
        }
      ],
      flows: [
        {
          name: "Deploy Flow",
          path: ["cicd", "api-server", "etcd", "scheduler", "kubelet", "container-rt", "app-container"],
          color: "#3fb950"
        },
        {
          name: "Request Flow",
          path: ["app-client", "lb", "ingress-ctrl", "kube-proxy", "app-container"],
          color: "#58a6ff"
        },
        {
          name: "Scale Flow",
          path: ["ctrl-mgr", "api-server", "scheduler", "kubelet", "hpa"],
          color: "#ffa657"
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
