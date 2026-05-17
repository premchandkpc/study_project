(function () {
  'use strict';

  var topics = window.SYSDESIGN_TOPICS || [];

  function cleanTitle(topic) {
    return (topic.title || topic.id || 'System Design')
      .replace(/^Case Study:\s*/i, '')
      .replace(/\s+[\u2014-]\s+.*$/, '')
      .trim();
  }

  function haystack(topic) {
    return [
      topic.id || '',
      topic.title || '',
      topic.tag || '',
      (topic.tags || []).join(' '),
    ].join(' ').toLowerCase();
  }

  function pickProfile(topic) {
    var h = haystack(topic);
    if (h.indexOf('case study') >= 0 || h.indexOf('instagram') >= 0) return 'case';
    if ((topic.id || '') === 'sd-security-auth') return 'security';
    if ((topic.id || '') === 'sd-api-gateway') return 'infra';
    if (h.indexOf('database') >= 0 || h.indexOf('sql') >= 0 || h.indexOf('nosql') >= 0 || h.indexOf('redis') >= 0 || h.indexOf('cap') >= 0 || h.indexOf('shard') >= 0) return 'data';
    if (h.indexOf('kafka') >= 0 || h.indexOf('messaging') >= 0 || h.indexOf('event') >= 0 || h.indexOf('saga') >= 0 || h.indexOf('queue') >= 0) return 'messaging';
    if (h.indexOf('cache') >= 0 || h.indexOf('cdn') >= 0) return 'cache';
    if (h.indexOf('security') >= 0 || h.indexOf('auth') >= 0 || h.indexOf('oauth') >= 0 || h.indexOf('jwt') >= 0) return 'security';
    if (h.indexOf('lld') >= 0 || h.indexOf('rate limiter') >= 0 || h.indexOf('consistent hash') >= 0 || h.indexOf('lock') >= 0) return 'lld';
    if (h.indexOf('kubernetes') >= 0 || h.indexOf('cloud') >= 0 || h.indexOf('compute') >= 0 || h.indexOf('load balancing') >= 0 || h.indexOf('proxy') >= 0 || h.indexOf('mesh') >= 0 || h.indexOf('gateway') >= 0) return 'infra';
    return 'default';
  }

  var profiles = {
    case: {
      actors: ['Client', 'API Gateway', 'Domain Service', 'Async Worker', 'Data Store'],
      layers: [
        ['Users', 'client', 'Mobile/Web client', 'Sends product request', 'Captures user intent, auth token, device context, and retry id.'],
        ['Edge', 'edge', 'CDN / API Gateway', 'TLS, auth, routing', 'Terminates TLS, verifies token, applies rate limits, and routes to domain services.'],
        ['Core', 'service', 'Domain Services', 'Business rules', 'Owns domain logic, validates invariants, and writes authoritative state.'],
        ['Async', 'worker', 'Workers / Event Bus', 'Fanout and background work', 'Decouples slow work such as notifications, indexing, media processing, or settlement.'],
        ['Data', 'store', 'Primary data stores', 'SQL, NoSQL, cache, object store', 'Stores metadata, hot cache entries, immutable blobs, and audit history.']
      ]
    },
    data: {
      actors: ['App', 'Connection Pool', 'Storage Engine', 'Replica / Cache', 'Operator'],
      layers: [
        ['Client', 'app', 'Application', 'Query caller', 'Builds request, sets timeout, and chooses read/write path.'],
        ['Access', 'pool', 'Pool / Router', 'Connection and shard routing', 'Bounds concurrency, selects shard or replica, and prevents connection storms.'],
        ['Write Path', 'primary', 'Primary Store', 'Authoritative writes', 'Applies transactions, indexes data, and appends durable log before ack.'],
        ['Read Path', 'read', 'Replica / Cache', 'Fast reads', 'Absorbs read traffic with replicas, materialized views, or cache entries.'],
        ['Ops', 'ops', 'Backup / Monitor', 'Recovery and SLOs', 'Tracks lag, lock waits, slow queries, saturation, and restore readiness.']
      ]
    },
    messaging: {
      actors: ['Producer', 'Broker', 'Consumer Group', 'Processor', 'DLQ / Store'],
      layers: [
        ['Sources', 'producer', 'Producer Services', 'Emit events', 'Publish domain events with idempotency keys and schema versions.'],
        ['Broker', 'broker', 'Broker / Log', 'Durable buffer', 'Stores ordered partitions, applies retention, and isolates producer from consumers.'],
        ['Consumers', 'consumer', 'Consumer Group', 'Parallel handling', 'Scales by partition or queue concurrency and commits progress after processing.'],
        ['Processing', 'processor', 'Projector / Worker', 'Side effects', 'Updates read models, calls downstream services, and retries transient failures.'],
        ['Failure', 'dlq', 'DLQ / Replay Store', 'Poison message handling', 'Captures failed messages with reason, payload, and replay controls.']
      ]
    },
    cache: {
      actors: ['Client', 'App', 'Cache', 'Source DB', 'Invalidator'],
      layers: [
        ['Caller', 'client', 'Client', 'Read-heavy caller', 'Requests hot data with cacheable keys and freshness tolerance.'],
        ['Service', 'app', 'Application', 'Cache-aside logic', 'Computes cache key, handles miss, fills cache, and returns response.'],
        ['Fast Path', 'cache', 'Cache Layer', 'Hot data', 'Keeps frequently accessed data near users with TTL and eviction policy.'],
        ['Truth', 'db', 'Source of Truth', 'Durable state', 'Serves misses and remains authoritative for writes.'],
        ['Coherence', 'invalidator', 'Invalidation Channel', 'Expire or refresh', 'Publishes delete/update events to reduce stale reads after writes.']
      ]
    },
    security: {
      actors: ['User', 'Client App', 'Identity Provider', 'Resource Server', 'Audit Log'],
      layers: [
        ['Subject', 'user', 'User / Device', 'Credential owner', 'Starts login and presents credentials or device proof.'],
        ['Client', 'client', 'Browser / App', 'PKCE and token storage', 'Creates code verifier, stores tokens safely, and sends bearer token.'],
        ['Identity', 'idp', 'IdP / Auth Server', 'OAuth2/OIDC', 'Authenticates user, issues signed tokens, rotates keys, and handles refresh.'],
        ['Resource', 'resource', 'API / Resource Server', 'Policy enforcement', 'Verifies token, checks scopes/RBAC, and executes authorized request.'],
        ['Audit', 'audit', 'Audit / SIEM', 'Security evidence', 'Records login, denial, key rotation, and suspicious access events.']
      ]
    },
    lld: {
      actors: ['Caller', 'API', 'Algorithm Core', 'State Store', 'Worker'],
      layers: [
        ['Caller', 'caller', 'Caller', 'Uses API contract', 'Sends operation with idempotency key, timeout, and retry policy.'],
        ['API', 'api', 'Public API', 'Validate and route', 'Validates request, enforces contract, and routes to algorithm core.'],
        ['Core', 'core', 'Algorithm Core', 'O(1) or bounded logic', 'Owns data structure invariants and concurrency rules.'],
        ['State', 'state', 'State Store', 'Durable or shared state', 'Persists counters, locks, cache entries, tasks, or ownership metadata.'],
        ['Async', 'worker', 'Sweeper / Worker', 'Cleanup and retries', 'Expires stale state, retries delayed jobs, and records metrics.']
      ]
    },
    infra: {
      actors: ['Client', 'Edge / Gateway', 'Service Pool', 'Data Plane', 'Control Plane'],
      layers: [
        ['Users', 'client', 'Clients', 'Traffic source', 'Browsers, apps, jobs, or services send requests with latency budgets.'],
        ['Edge', 'edge', 'Edge / Gateway', 'Policy and routing', 'Terminates TLS, applies routing, rate limits, and health-aware forwarding.'],
        ['Compute', 'service', 'Service Pool', 'Elastic execution', 'Runs stateless instances, containers, pods, or functions across zones.'],
        ['Data Plane', 'data', 'Data / Messaging', 'State and queues', 'Persists state, caches hot keys, and buffers async work.'],
        ['Control', 'control', 'Control Plane', 'Deploy and observe', 'Runs discovery, autoscaling, config rollout, telemetry, and failover.']
      ]
    },
    default: {
      actors: ['Client', 'Gateway', 'Core Service', 'Async Processor', 'Storage'],
      layers: [
        ['Client', 'client', 'Client', 'Request source', 'Starts flow and owns retry/cancel behavior.'],
        ['Ingress', 'gateway', 'Gateway', 'Routing and policy', 'Applies auth, routing, rate limits, and request shaping.'],
        ['Core', 'service', 'Core Service', 'Business capability', 'Executes main synchronous work inside latency budget.'],
        ['Async', 'async', 'Async Processor', 'Background side effects', 'Handles slow or retryable work outside request path.'],
        ['Data', 'store', 'Storage', 'System state', 'Stores durable state, cache entries, indexes, and audit trail.']
      ]
    }
  };

  function makeFlow(topic, profile) {
    var name = cleanTitle(topic);
    var ids = profile.layers.map(function (l) { return l[1]; });
    return {
      title: name + ' - Runtime Flow',
      caption: 'Animated request path and async side effects',
      nodes: profile.layers.map(function (l) {
        return { id: l[1], label: l[2], hint: l[3] };
      }),
      steps: [
        { from: ids[0], to: ids[1], path: [ids[0], ids[1]], label: '1. Enter system', detail: 'Request crosses trust boundary and gets normalized before core handling.' },
        { from: ids[1], to: ids[2], path: [ids[1], ids[2]], label: '2. Execute core path', detail: 'Gateway routes to owning capability with timeout, auth context, and trace id.' },
        { from: ids[2], to: ids[3], path: [ids[2], ids[3]], label: '3. Offload slow work', detail: 'Async path absorbs retries, fanout, indexing, notifications, or heavy processing.' },
        { from: ids[2], to: ids[4], path: [ids[2], ids[4]], label: '4. Persist state', detail: 'System writes durable state, cache entries, offsets, or audit evidence.' },
        { from: ids[4], to: ids[0], path: [ids[4], ids[2], ids[1], ids[0]], label: '5. Return or recover', detail: 'Response returns when sync work succeeds; failure path uses retry, fallback, or replay.' }
      ]
    };
  }

  function makeUml(topic, profile) {
    var name = cleanTitle(topic);
    var actors = profile.actors.map(function (label, i) {
      return { id: 'a' + i, label: label, hint: i === 0 ? 'Caller' : '' };
    });
    return {
      title: name + ' - UML Sequence',
      scenario: 'Happy path plus async handoff and failure evidence',
      actors: actors,
      messages: [
        { from: 'a0', to: 'a1', label: 'Send request', detail: 'Caller sends request with auth, trace id, timeout, and idempotency key.' },
        { from: 'a1', to: 'a2', label: 'Validate and route', detail: 'Boundary component checks policy and forwards to owning service or engine.' },
        { from: 'a2', to: 'a3', label: 'Process side effect', async: true, type: 'async', detail: 'Slow work moves to async lane so user-facing latency stays bounded.' },
        { from: 'a2', to: 'a4', label: 'Read/write state', detail: 'Core path persists result, reads hot data, or stores replayable event.' },
        { from: 'a4', to: 'a2', label: 'Ack state change', detail: 'Storage returns commit/offset/cache status so service can decide response.' },
        { from: 'a2', to: 'a1', label: 'Return result', detail: 'Service returns response, fallback, or accepted status based on consistency need.' },
        { from: 'a3', to: 'a4', label: 'Record async outcome', async: true, type: 'async', detail: 'Worker writes projection, notification, index update, or DLQ record.' }
      ]
    };
  }

  function makeArchitecture(topic, profile) {
    var name = cleanTitle(topic);
    return {
      title: name + ' - Architecture Map',
      caption: 'Clickable layers, ownership boundaries, sync paths, and async paths',
      lanes: profile.layers.map(function (l, idx) {
        return {
          label: l[0],
          hint: l[3],
          nodes: [{
            id: l[1],
            label: l[2],
            badge: idx === 0 ? 'entry' : (idx === profile.layers.length - 1 ? 'ops' : 'core'),
            hint: l[3],
            detail: l[4]
          }]
        };
      }),
      links: [
        { from: profile.layers[0][1], to: profile.layers[1][1], label: 'ingress', type: 'sync', detail: 'User or upstream service crosses edge boundary.' },
        { from: profile.layers[1][1], to: profile.layers[2][1], label: 'sync request', type: 'sync', detail: 'Main request path must fit latency budget and propagate trace context.' },
        { from: profile.layers[2][1], to: profile.layers[3][1], label: 'async event', type: 'async', detail: 'Async handoff isolates slow retries and protects the synchronous user path.' },
        { from: profile.layers[2][1], to: profile.layers[4][1], label: 'state access', type: 'sync', detail: 'Core service reads or writes authoritative state with bounded timeout.' },
        { from: profile.layers[4][1], to: profile.layers[3][1], label: 'replay / repair', type: 'async', detail: 'Operators or background jobs replay, rebuild, expire, or repair derived state.' }
      ]
    };
  }

  topics.forEach(function (topic) {
    if (!topic || topic.area !== 'sysdesign') return;
    var profile = profiles[pickProfile(topic)] || profiles.default;
    if (!topic.flow) topic.flow = makeFlow(topic, profile);
    if (!topic.uml) topic.uml = makeUml(topic, profile);
    if (!topic.architecture) topic.architecture = makeArchitecture(topic, profile);
    if (!topic.docs) topic.docs = 'docs/system-design/' + topic.id + '.md';
  });
})();
