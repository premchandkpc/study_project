(function() {
  var topic = {
    id: "sd-case-chat-system",
    area: "sysdesign",
    title: "Case Study: Real-Time Chat System (WhatsApp / Slack)",
    tag: "Case Study",
    tags: ["websocket","kafka","cassandra","fan-out","presence","read-receipts","messaging","real-time","redis","horizontal-scaling"],
    concept: `**Requirements:** 2B users, 100B messages/day, sub-200ms delivery, group chats up to 1000 members, offline message delivery, read receipts.

**Core challenges:**
1. **Routing messages** — User A and B are connected to different WebSocket servers. How does A's message reach B's server?
2. **Message persistence** — 100B messages/day = ~1.1M messages/second. Need write-optimized storage.
3. **Fan-out** — group chat: 1 message → 1000 recipients → fan-out to 1000 connection servers.
4. **Presence** — know which users are online without polling every user.
5. **Offline delivery** — messages must survive when recipient is offline.

**Architecture:**

**WebSocket servers (stateful):**
- Each server maintains open WebSocket connections for N users.
- Horizontally scaled behind a Layer-4 load balancer (consistent hashing by user_id).
- A user always reconnects to the same server (sticky sessions by user_id hash).

**Message routing via Kafka:**
- When Server 1 receives message from User A → publish to Kafka topic \`chat-messages\`.
- Each WebSocket server subscribes to Kafka. Routes message to connected users on that server.
- Kafka fan-out for group chats: one message → all member servers consume it.

**Message storage — Cassandra:**
- Partition key: \`conversation_id\` — all messages in a conversation collocated.
- Clustering key: \`timestamp DESC\` — efficient range queries for chat history.
- Replication factor: 3. Write consistency: ONE (fast writes). Read consistency: QUORUM.
- 100B messages/day @ 200 bytes avg = 20TB/day. TTL policy: 1 year default.

**Presence service:**
- Redis key: \`presence:{user_id}\` with TTL = 35s.
- Client sends heartbeat every 30s → Redis SET with TTL refresh.
- No heartbeat for 35s → key expires → user considered offline.
- Presence change events published to Kafka → fan-out to contacts.

**Read receipts (eventually consistent):**
- Client sends ACK when message rendered. Server writes to Cassandra asynchronously.
- \`message_status\` table: (conversation_id, message_id, user_id, status, updated_at).
- Sender queries status periodically (pull) or receives push via WebSocket.

**Offline users:**
- Message stored in Cassandra regardless of recipient status.
- When user reconnects → WebSocket server queries Cassandra for all messages after \`last_seen_message_id\`.
- Push notifications (APNs/FCM) sent via async worker when recipient is offline.`,
    why: `Chat systems appear in nearly every FAANG interview. They combine WebSockets, Kafka fan-out, write-heavy NoSQL, presence (Redis TTL), and offline delivery — covering distributed systems breadth in one problem.`,
    example: {
      language: "python",
      code: `# WebSocket server — message send + Kafka publish
from fastapi import FastAPI, WebSocket
from aiokafka import AIOKafkaProducer
from cassandra.cluster import Cluster
import json, asyncio, uuid, time

app = FastAPI()
# In-memory map: user_id → websocket (per server instance)
connections: dict[str, WebSocket] = {}

kafka_producer: AIOKafkaProducer = None
cassandra_session = None

@app.on_event("startup")
async def startup():
    global kafka_producer, cassandra_session
    kafka_producer = AIOKafkaProducer(bootstrap_servers='kafka:9092')
    await kafka_producer.start()
    cluster = Cluster(['cassandra-1', 'cassandra-2'])
    cassandra_session = cluster.connect('chat')

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(ws: WebSocket, user_id: str):
    await ws.accept()
    connections[user_id] = ws
    # Refresh presence in Redis
    await redis.setex(f"presence:{user_id}", 35, "online")
    try:
        while True:
            data = await ws.receive_json()
            msg_id = str(uuid.uuid4())
            msg = {
                "id": msg_id,
                "conversation_id": data["conversation_id"],
                "sender_id": user_id,
                "content": data["content"],
                "timestamp": int(time.time() * 1000)
            }
            # 1. Persist to Cassandra (write-through)
            cassandra_session.execute(
                """INSERT INTO messages
                   (conversation_id, timestamp, id, sender_id, content)
                   VALUES (%s, %s, %s, %s, %s)""",
                (msg["conversation_id"], msg["timestamp"],
                 msg_id, user_id, msg["content"])
            )
            # 2. Publish to Kafka → all servers fan-out to recipients
            await kafka_producer.send(
                "chat-messages",
                key=msg["conversation_id"].encode(),
                value=json.dumps(msg).encode()
            )
    finally:
        del connections[user_id]

# Kafka consumer (runs on every WebSocket server)
async def consume_messages():
    consumer = AIOKafkaConsumer(
        "chat-messages", bootstrap_servers='kafka:9092',
        group_id=f"ws-server-{SERVER_ID}"  # unique per server
    )
    await consumer.start()
    async for record in consumer:
        msg = json.loads(record.value)
        conv_id = msg["conversation_id"]
        # Get members of this conversation
        members = await get_conversation_members(conv_id)
        for member_id in members:
            if member_id in connections:  # connected to THIS server
                await connections[member_id].send_json(msg)`
    },
    interview: [
      {
        question: "How do you route a message from User A (on Server 1) to User B (on Server 2)?",
        answer: `Server 1 publishes the message to a Kafka topic partitioned by conversation_id. Every WebSocket server subscribes to Kafka with a unique consumer group ID. Each server receives every message and checks its local connection map — if the recipient is connected to that server, it delivers the message. This avoids direct server-to-server routing and decouples the servers completely.`,
        followUps: [
          "Why not use a service registry to find which server holds the connection?",
          "What are the trade-offs between Kafka fan-out vs direct server-to-server RPC?",
          "How does this scale when you have 10,000 WebSocket servers?"
        ]
      },
      {
        question: "How do you store 100 billion messages per day?",
        answer: `Cassandra is ideal: partition key = conversation_id (all messages for a chat collocated), clustering key = timestamp DESC (efficient pagination of history). Write consistency = ONE (fast, async replication). Replication factor = 3 for durability. 100B msgs × 200 bytes ≈ 20TB/day — use TTL (1 year) and tiered storage (hot data on SSDs, cold on S3 via DSE/Stargate). Avoid relational DB — joins and transactions don't scale to this write volume.`,
        followUps: [
          "Why Cassandra over DynamoDB for chat?",
          "How do you handle message ordering guarantees in Cassandra?",
          "How do you paginate chat history efficiently?"
        ]
      },
      {
        question: "How do you handle offline users?",
        answer: `Messages are always written to Cassandra regardless of recipient's online status. Each user has a last_seen_message_id stored server-side. When user reconnects, the WebSocket server queries Cassandra: SELECT * FROM messages WHERE conversation_id = ? AND timestamp > last_seen_timestamp. For mobile, an async worker checks Redis presence and if offline, sends a push notification (APNs/FCM) with message preview.`,
        followUps: [
          "How do you avoid sending duplicate messages on reconnect?",
          "How do you handle push notification failures?",
          "What if the user is offline for 30 days — do you store all messages?"
        ]
      },
      {
        question: "Design WhatsApp's end-to-end encryption at scale.",
        answer: `Signal Protocol: each client generates a key bundle (identity key, signed prekey, one-time prekeys). Published to the server's key distribution server on registration. When A sends to B: A fetches B's key bundle, derives a shared secret using X3DH (Extended Triple Diffie-Hellman). Messages encrypted client-side with AES-256. Server only stores ciphertext — cannot decrypt. For group chats: sender distributes a group session key to each member individually, encrypted with their public key. Server acts as blind message store and key distribution service only.`,
        followUps: [
          "How do you handle key rotation?",
          "How does E2E encryption work for group chats with 1000 members?",
          "How do you verify identity to prevent MITM attacks?"
        ]
      }
    ],
    tradeoffs: {
      pros: [
        "Kafka decouples WebSocket servers — no direct server-to-server communication needed",
        "Cassandra's partition-by-conversation gives predictable performance at scale",
        "Redis TTL presence is extremely lightweight (O(1) check per heartbeat)",
        "Fan-out via Kafka naturally handles group chats without special logic"
      ],
      cons: [
        "Kafka fan-out for large groups (1000 members) means 1 message read 1000 times by servers",
        "Cassandra eventual consistency means read-your-own-writes may briefly fail",
        "WebSocket connections are stateful — server restarts disconnect all users on that server",
        "Presence with 35s TTL means up to 35s lag in detecting offline status"
      ],
      when: "Use this architecture for any real-time messaging product with >10M users. For smaller scale, simplify: single WebSocket server tier with Redis Pub/Sub instead of Kafka."
    },
    gotchas: [
      "Naive fan-out breaks for celebrity accounts / large groups — use 'write on read' (pull fan-out) for groups > 500 members",
      "Sticky WebSocket sessions mean losing a server = losing all connections on it — need graceful reconnect logic with exponential backoff",
      "Message ordering: Cassandra uses timestamp as clustering key, but client clocks can skew — use server-assigned HLC (Hybrid Logical Clocks) instead",
      "Don't store media in Cassandra — store only media_url. Files go to S3/CDN with client-side encryption",
      "Read receipts at scale: avoid per-message DB write on every read — batch ACKs every 5s instead",
      "Presence fan-out storm: user with 5000 contacts goes online → 5000 presence events → filter to only contacts who are also online"
    ],
    visual: function(mount) {
      mount.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <button id="btnSend" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">Send Message</button>
          <button id="btnOffline" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">User Goes Offline</button>
          <button id="btnReconnect" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;">User Reconnects</button>
        </div>
        <canvas id="chatCanvas" width="460" height="320" style="width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;"></canvas>
      `;

      var canvas = mount.querySelector('#chatCanvas');
      var ctx = canvas.getContext('2d');
      var W = 460, H = 320;

      var GREEN = '#3fb950', BLUE = '#58a6ff', ORANGE = '#ffa657';
      var RED = '#f85149', GRAY = '#8b949e', TEXT = '#e6edf3';
      var CARD = '#161b22', BORDER = '#30363d', PURPLE = '#bc8cff';

      var state = {
        userBOnline: true,
        packets: [],
        storedMsg: false,
        phase: 'idle',
        label: ''
      };

      function drawBox(x, y, w, h, label, color, sublabel) {
        ctx.fillStyle = CARD;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + h / 2 - (sublabel ? 6 : 0));
        if (sublabel) {
          ctx.fillStyle = GRAY;
          ctx.font = '9px monospace';
          ctx.fillText(sublabel, x + w / 2, y + h / 2 + 8);
        }
      }

      function drawArrow(x1, y1, x2, y2, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
        var angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - 8 * Math.cos(angle - 0.4), y2 - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - 8 * Math.cos(angle + 0.4), y2 - 8 * Math.sin(angle + 0.4));
        ctx.fill();
        if (label) {
          ctx.fillStyle = GRAY;
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          var mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 6;
          ctx.fillText(label, mx, my);
        }
      }

      function draw() {
        if (!document.body.contains(canvas)) return;
        ctx.clearRect(0, 0, W, H);

        // Title
        ctx.fillStyle = GRAY;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Real-Time Chat Architecture', W / 2, 14);

        // User A (left)
        var userAColor = GREEN;
        drawBox(12, 50, 70, 44, 'User A', userAColor, 'WS Server 1');

        // WebSocket Server 1
        drawBox(102, 50, 76, 44, 'WS Server 1', BLUE, 'user A conn');

        // Kafka (center)
        drawBox(202, 50, 56, 44, 'Kafka', ORANGE, 'chat-msgs');

        // WebSocket Server 2
        drawBox(278, 50, 76, 44, 'WS Server 2', BLUE, 'user B conn');

        // User B (right)
        var userBColor = state.userBOnline ? GREEN : RED;
        drawBox(374, 50, 74, 44, 'User B', userBColor, state.userBOnline ? 'online' : 'OFFLINE');

        // Cassandra (bottom left)
        drawBox(60, 180, 100, 44, 'Cassandra', PURPLE, 'msg store');

        // Redis Presence (bottom center)
        drawBox(180, 180, 100, 44, 'Redis', ORANGE, 'presence TTL');

        // Static architecture arrows
        ctx.globalAlpha = 0.35;
        drawArrow(82, 72, 102, 72, BLUE, '');
        drawArrow(178, 72, 202, 72, ORANGE, '');
        drawArrow(258, 72, 278, 72, ORANGE, '');
        drawArrow(354, 72, 374, 72, BLUE, '');
        ctx.globalAlpha = 1.0;

        // Labels on static arrows
        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('WS', 92, 68);
        ctx.fillText('publish', 190, 68);
        ctx.fillText('consume', 268, 68);
        ctx.fillText('push', 364, 68);

        // Cassandra link
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(140, 94);
        ctx.lineTo(110, 180);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.fillText('persist', 118, 145);

        // Redis presence link
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(316, 94);
        ctx.lineTo(230, 180);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.fillText('heartbeat', 268, 148);

        // Offline: pull from Cassandra arrow
        if (state.storedMsg) {
          ctx.strokeStyle = PURPLE;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(160, 202);
          ctx.lineTo(316, 94);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = PURPLE;
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('pull on reconnect', 240, 160);
        }

        // Animated packets
        state.packets.forEach(function(p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          if (p.label) {
            ctx.fillStyle = TEXT;
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y - 9);
          }
        });

        // Status label
        if (state.label) {
          ctx.fillStyle = CARD;
          ctx.strokeStyle = BORDER;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(W / 2 - 140, 260, 280, 28, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = TEXT;
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(state.label, W / 2, 279);
        }
      }

      function animatePackets(steps, onDone) {
        var stepIdx = 0;
        function runStep() {
          if (!document.body.contains(canvas)) return;
          if (stepIdx >= steps.length) {
            if (onDone) onDone();
            return;
          }
          var step = steps[stepIdx++];
          state.label = step.label || '';
          var p = { x: step.x1, y: step.y1, color: step.color || GREEN, label: step.pLabel || '' };
          state.packets = [p];
          var frames = 0, total = 22;
          var dx = (step.x2 - step.x1) / total;
          var dy = (step.y2 - step.y1) / total;
          function tick() {
            if (!document.body.contains(canvas)) return;
            p.x += dx; p.y += dy;
            frames++;
            draw();
            if (frames < total) requestAnimationFrame(tick);
            else {
              state.packets = [];
              setTimeout(runStep, 200);
            }
          }
          requestAnimationFrame(tick);
        }
        runStep();
      }

      function sendMessage() {
        if (state.phase !== 'idle') return;
        state.phase = 'sending';
        state.storedMsg = false;
        state.userBOnline = true;
        var steps = [
          { x1: 82, y1: 72, x2: 102, y2: 72, color: GREEN, label: 'A sends message via WebSocket', pLabel: 'msg' },
          { x1: 178, y1: 72, x2: 202, y2: 72, color: ORANGE, label: 'Server 1 publishes to Kafka', pLabel: 'kafka' },
          { x1: 140, y1: 72, x2: 110, y2: 180, color: PURPLE, label: 'Message persisted to Cassandra', pLabel: 'persist' },
          { x1: 258, y1: 72, x2: 278, y2: 72, color: ORANGE, label: 'Server 2 consumes from Kafka', pLabel: 'msg' },
          { x1: 354, y1: 72, x2: 374, y2: 72, color: GREEN, label: 'Delivered to User B via WebSocket!', pLabel: 'deliver' }
        ];
        animatePackets(steps, function() {
          state.phase = 'idle';
          state.label = 'Message delivered successfully';
          draw();
        });
      }

      function goOffline() {
        if (state.phase !== 'idle') return;
        state.phase = 'offline';
        state.userBOnline = false;
        state.label = 'User B went offline — message stored in Cassandra';
        state.storedMsg = true;
        var steps = [
          { x1: 82, y1: 72, x2: 102, y2: 72, color: GREEN, label: 'A sends message...', pLabel: 'msg' },
          { x1: 178, y1: 72, x2: 202, y2: 72, color: ORANGE, label: 'Published to Kafka', pLabel: 'kafka' },
          { x1: 140, y1: 72, x2: 110, y2: 180, color: PURPLE, label: 'Stored in Cassandra (B is offline)', pLabel: 'store' }
        ];
        animatePackets(steps, function() {
          state.phase = 'idle';
          state.label = 'B is offline — message queued in Cassandra';
          draw();
        });
      }

      function reconnect() {
        if (state.phase !== 'idle') return;
        if (!state.storedMsg) { state.label = 'No offline messages — send message first then go offline'; draw(); return; }
        state.phase = 'reconnect';
        state.userBOnline = true;
        var steps = [
          { x1: 374, y1: 72, x2: 278, y2: 72, color: BLUE, label: 'User B reconnects to WS Server 2', pLabel: 'reconnect' },
          { x1: 278, y1: 94, x2: 160, y2: 200, color: PURPLE, label: 'Server queries Cassandra for missed msgs', pLabel: 'query' },
          { x1: 160, y1: 200, x2: 278, y2: 94, color: PURPLE, label: 'Cassandra returns stored messages', pLabel: 'msgs' },
          { x1: 354, y1: 72, x2: 374, y2: 72, color: GREEN, label: 'Missed messages delivered to B!', pLabel: 'deliver' }
        ];
        animatePackets(steps, function() {
          state.phase = 'idle';
          state.storedMsg = false;
          state.label = 'All offline messages delivered on reconnect';
          draw();
        });
      }

      mount.querySelector('#btnSend').addEventListener('click', sendMessage);
      mount.querySelector('#btnOffline').addEventListener('click', goOffline);
      mount.querySelector('#btnReconnect').addEventListener('click', reconnect);

      draw();
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
