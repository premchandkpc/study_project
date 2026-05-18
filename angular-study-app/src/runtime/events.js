(function () {
  "use strict";

  // ── Runtime Event Constants ───────────────────────────────────────────────
  // All platform-wide event names. Simulations, engines, and UI all
  // communicate exclusively through these constants via EventBus.

  window.EVENTS = Object.freeze({
    // ── Simulation lifecycle
    SIM_INIT:          "sim:init",
    SIM_START:         "sim:start",
    SIM_PAUSE:         "sim:pause",
    SIM_RESUME:        "sim:resume",
    SIM_RESET:         "sim:reset",
    SIM_STEP:          "sim:step",
    SIM_SPEED_CHANGE:  "sim:speed_change",
    SIM_COMPLETE:      "sim:complete",
    SIM_DESTROY:       "sim:destroy",

    // ── Failure injection
    FAILURE_INJECT:    "failure:inject",
    FAILURE_RECOVER:   "failure:recover",
    NODE_FAILED:       "node:failed",
    NODE_RECOVERED:    "node:recovered",
    PARTITION_START:   "partition:start",
    PARTITION_END:     "partition:end",

    // ── Packet / message flow
    PACKET_SENT:       "packet:sent",
    PACKET_ACK:        "packet:ack",
    PACKET_DROPPED:    "packet:dropped",
    PACKET_RETRY:      "packet:retry",
    PACKET_DLQ:        "packet:dlq",
    BACKPRESSURE:      "backpressure",

    // ── Kafka
    KAFKA_PRODUCE:     "kafka:produce",
    KAFKA_CONSUME:     "kafka:consume",
    KAFKA_COMMIT:      "kafka:commit",
    KAFKA_REBALANCE:   "kafka:rebalance",
    KAFKA_LAG_UPDATE:  "kafka:lag_update",
    KAFKA_DLQ:         "kafka:dlq",

    // ── JVM
    JVM_THREAD_START:  "jvm:thread_start",
    JVM_THREAD_BLOCK:  "jvm:thread_block",
    JVM_THREAD_END:    "jvm:thread_end",
    JVM_LOCK_ACQUIRE:  "jvm:lock_acquire",
    JVM_LOCK_RELEASE:  "jvm:lock_release",
    JVM_DEADLOCK:      "jvm:deadlock",
    GC_STARTED:        "gc:started",
    GC_PHASE:          "gc:phase",
    GC_COMPLETED:      "gc:completed",
    GC_PAUSE:          "gc:pause",
    HEAP_UPDATE:       "heap:update",

    // ── Go runtime
    GO_GOROUTINE_SPAWN:  "go:goroutine_spawn",
    GO_GOROUTINE_PARK:   "go:goroutine_park",
    GO_GOROUTINE_RUN:    "go:goroutine_run",
    GO_GOROUTINE_DONE:   "go:goroutine_done",
    GO_CHANNEL_SEND:     "go:channel_send",
    GO_CHANNEL_RECV:     "go:channel_recv",
    GO_CHANNEL_BLOCK:    "go:channel_block",
    GO_STEAL:            "go:steal",
    GO_GC_STARTED:       "go:gc_started",
    GO_GC_STW:           "go:gc_stw",

    // ── Kubernetes
    K8S_POD_SCHEDULED:  "k8s:pod_scheduled",
    K8S_POD_RUNNING:    "k8s:pod_running",
    K8S_POD_FAILED:     "k8s:pod_failed",
    K8S_POD_EVICTED:    "k8s:pod_evicted",
    K8S_SCALE_UP:       "k8s:scale_up",
    K8S_SCALE_DOWN:     "k8s:scale_down",
    K8S_HPA_TRIGGER:    "k8s:hpa_trigger",
    K8S_ROLLOUT:        "k8s:rollout",
    K8S_NODE_PRESSURE:  "k8s:node_pressure",

    // ── Networking
    NET_CONNECT:        "net:connect",
    NET_DISCONNECT:     "net:disconnect",
    NET_REQUEST:        "net:request",
    NET_RESPONSE:       "net:response",
    NET_TIMEOUT:        "net:timeout",
    NET_LATENCY:        "net:latency",
    TLS_HANDSHAKE:      "net:tls_handshake",
    DNS_RESOLVE:        "net:dns_resolve",

    // ── AI agent
    AGENT_THINK:        "agent:think",
    AGENT_TOOL_CALL:    "agent:tool_call",
    AGENT_TOOL_RESULT:  "agent:tool_result",
    AGENT_MEMORY_READ:  "agent:memory_read",
    AGENT_MEMORY_WRITE: "agent:memory_write",
    AGENT_RESPOND:      "agent:respond",
    RAG_RETRIEVE:       "rag:retrieve",
    RAG_EMBED:          "rag:embed",

    // ── Replay
    REPLAY_START:       "replay:start",
    REPLAY_PAUSE:       "replay:pause",
    REPLAY_RESUME:      "replay:resume",
    REPLAY_SEEK:        "replay:seek",
    REPLAY_END:         "replay:end",
    REPLAY_SPEED:       "replay:speed",
    RECORD_START:       "record:start",
    RECORD_STOP:        "record:stop",

    // ── Metrics / observability
    METRIC_UPDATE:      "metric:update",
    TRACE_SPAN_START:   "trace:span_start",
    TRACE_SPAN_END:     "trace:span_end",
    LOG_ENTRY:          "log:entry",
    ALERT_FIRE:         "alert:fire",
    ALERT_RESOLVE:      "alert:resolve",

    // ── State
    STATE_CHANGE:       "state:change",
    UI_NAVIGATE:        "ui:navigate",
    UI_THEME_CHANGE:    "ui:theme_change",
    UI_PANEL_RESIZE:    "ui:panel_resize",
  });

})();
