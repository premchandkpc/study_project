(function() {
  var topic = {
    id: "sd-lld-task-queue",
    area: "sysdesign",
    title: "LLD: Distributed Task Queue (Celery / BullMQ / Sidekiq)",
    tag: "LLD",
    tags: ["task-queue","celery","bullmq","sidekiq","redis","rabbitmq","retry","dlq","worker","backoff","priority","autoscale"],
    concept: `**Requirements:** Enqueue tasks, at-least-once execution, retry on failure, priority queues, dead letter queue (DLQ), autoscale workers.

**Core components:**

**1. Producer**
Enqueues a task with: payload (job data), priority (0–10, higher = first), retry policy (max retries, backoff), TTL (task expires if not picked up within N seconds).

**2. Broker (Redis or RabbitMQ)**
Stores task queues. With Redis:
- \`ZADD priority_queue <priority_score> <task_json>\` — sorted set = priority queue.
- Worker polls: \`ZPOPMAX priority_queue\` (highest priority first).
- Or subscribe to keyspace events for push-based consumption.

**3. Worker pool**
- Workers are stateless processes. Horizontally scalable.
- Each worker: ZPOPMAX → execute task → ACK (delete from in-flight set).
- Heartbeat: worker updates \`worker:{id}:heartbeat\` every 10s in Redis.
- Dead worker detection: if heartbeat expires → re-enqueue the task from in-flight set.

**4. Retry with exponential backoff**
On failure: task re-enqueued with delay = \`base_delay × 2^(retry_count)\`.
Example: 1s → 2s → 4s → 8s (max 3 retries). Implemented via Redis ZADD with a future timestamp as score on a \`delayed_queue\`. A scheduler process moves tasks from delayed_queue to active queue when their timestamp arrives.

**5. Dead Letter Queue (DLQ)**
After max retries (e.g., 3): task moved to \`dlq\` sorted set with error info attached. Ops team can inspect, fix, and re-enqueue manually.

**6. Autoscaling workers**
Monitor queue depth (ZCARD priority_queue). If depth > threshold (e.g., 10) → spawn new worker pod (K8s Horizontal Pod Autoscaler or custom signal). If depth < low threshold → scale down.

**7. At-least-once vs exactly-once**
- **At-least-once** (default): task may be executed more than once on worker crash mid-execution. Tasks must be idempotent.
- **Exactly-once**: use distributed lock (Redis SETNX) keyed on task_id before executing. If lock acquired → execute. Else → skip. Lock expires after task timeout.

**Task lifecycle:** QUEUED → IN_FLIGHT → COMPLETED / FAILED → (retry) → DLQ`,
    why: `Task queues are in every backend system — email sending, report generation, image processing, payment webhooks. Understanding retry, DLQ, and autoscaling shows production readiness. Celery is Python's most popular task queue; BullMQ is Node.js; Sidekiq is Ruby.`,
    example: {
      language: "python",
      code: `# Minimal distributed task queue using Redis
# Producer + Worker + Retry + DLQ

import redis, json, time, uuid, logging
from typing import Callable

r = redis.Redis(host='localhost', decode_responses=True)

QUEUE = 'tasks:active'
IN_FLIGHT = 'tasks:inflight'
DELAYED = 'tasks:delayed'
DLQ = 'tasks:dlq'
MAX_RETRIES = 3
BASE_DELAY = 1  # seconds

# --- Producer ---
def enqueue(task_type: str, payload: dict,
            priority: int = 5, delay: float = 0):
    task = {
        "id": str(uuid.uuid4()),
        "type": task_type,
        "payload": payload,
        "retry_count": 0,
        "enqueued_at": time.time()
    }
    task_json = json.dumps(task)
    if delay > 0:
        # delayed queue: score = execution timestamp
        r.zadd(DELAYED, {task_json: time.time() + delay})
    else:
        # active queue: score = priority (higher = first via ZPOPMAX)
        r.zadd(QUEUE, {task_json: priority})
    return task["id"]

# --- Scheduler: move ready delayed tasks to active queue ---
def scheduler_tick():
    now = time.time()
    ready = r.zrangebyscore(DELAYED, 0, now)
    for task_json in ready:
        r.zrem(DELAYED, task_json)
        r.zadd(QUEUE, {task_json: 5})  # default priority

# --- Worker ---
def run_worker(handlers: dict[str, Callable]):
    worker_id = str(uuid.uuid4())[:8]
    logging.info(f"Worker {worker_id} started")

    while True:
        # Atomic move from queue to in-flight
        task_json = r.zpopmax(QUEUE)
        if not task_json:
            time.sleep(0.1)
            continue

        task_json = task_json[0][0]
        r.zadd(IN_FLIGHT, {task_json: time.time()})

        task = json.loads(task_json)
        handler = handlers.get(task["type"])

        try:
            if not handler:
                raise ValueError(f"No handler for {task['type']}")
            handler(task["payload"])  # Execute the task
            r.zrem(IN_FLIGHT, task_json)  # ACK: remove from in-flight
            logging.info(f"Task {task['id']} completed")

        except Exception as e:
            r.zrem(IN_FLIGHT, task_json)
            retry_count = task["retry_count"] + 1
            task["last_error"] = str(e)

            if retry_count <= MAX_RETRIES:
                task["retry_count"] = retry_count
                delay = BASE_DELAY * (2 ** (retry_count - 1))  # exponential backoff
                logging.warning(f"Task {task['id']} failed, retry {retry_count}/{MAX_RETRIES} in {delay}s")
                r.zadd(DELAYED, {json.dumps(task): time.time() + delay})
            else:
                # Max retries exceeded → send to DLQ
                logging.error(f"Task {task['id']} exhausted retries → DLQ")
                r.zadd(DLQ, {json.dumps(task): time.time()})

# --- Usage ---
# Producer:
enqueue("send_email", {"to": "user@example.com", "subject": "Welcome"}, priority=8)
enqueue("resize_image", {"url": "s3://bucket/img.jpg"}, priority=3, delay=5)

# Worker (define handlers):
# run_worker({"send_email": send_email_fn, "resize_image": resize_image_fn})`
    },
    interview: [
      {
        question: "How do you ensure a task runs exactly once?",
        answer: `Exactly-once is hard. Default behavior is at-least-once (safe retries, idempotent tasks). For true exactly-once: use a distributed lock (Redis SETNX) keyed on task_id with TTL = task max execution time. Worker acquires lock before executing. If acquired → execute → delete lock. If not acquired → another worker has it → skip. This prevents two workers executing the same task concurrently. But: if a worker crashes after acquiring the lock but before completing, the task won't run until TTL expires. Design tasks to be idempotent as the primary defense.`,
        followUps: [
          "What if the worker crashes after the Redis SETNX but before task completion?",
          "How does Celery handle exactly-once with ACKS_LATE?",
          "How do you detect and recover tasks stuck in IN_FLIGHT state?"
        ]
      },
      {
        question: "How do you handle long-running tasks (>30 minutes)?",
        answer: `Several strategies: (1) Heartbeat: worker updates a Redis key every N seconds to signal it's still alive. If heartbeat expires, a watchdog process re-enqueues the task. (2) Chunking: break the long task into smaller subtasks, each queued independently. Parent task completes when all children complete (use a counter in Redis). (3) Celery approach: ACKS_LATE=True — task is not acknowledged until it completes. If worker dies, broker re-delivers the task. (4) Set task visibility timeout > expected task duration to prevent premature re-delivery. (5) Store progress checkpoints in Redis so a retried task resumes from last checkpoint.`,
        followUps: [
          "How do you implement a progress bar for long-running tasks?",
          "How do you cancel a long-running task that's already in progress?",
          "How do you handle task timeouts without killing the worker process?"
        ]
      },
      {
        question: "How do you prioritize tasks?",
        answer: `Use a Redis Sorted Set (ZADD) where the score is the priority value. ZPOPMAX fetches the highest-priority task first. Implement multiple named queues (high/medium/low) and have workers poll them in order: check high queue first, then medium, then low. This prevents high-priority tasks from being starved. For scheduling: use two sorted sets — active_queue (ready to run) and delayed_queue (score = future execution timestamp). A lightweight scheduler process runs every second and moves tasks from delayed → active when their timestamp arrives.`,
        followUps: [
          "How do you prevent priority inversion (low-priority task blocking high-priority ones)?",
          "How do you handle priority escalation for tasks waiting too long?",
          "What's the difference between priority queues and fair scheduling?"
        ]
      },
      {
        question: "Design Celery's architecture.",
        answer: `Celery has 4 components: (1) Task producer — Python application that calls task.delay() or task.apply_async(). (2) Message broker — RabbitMQ (default) or Redis. Stores task messages in queues. (3) Worker — Python process that imports your code, subscribes to queues, executes tasks in a thread pool or prefork pool. (4) Result backend — Redis or DB that stores task results for the caller to retrieve. Key design decisions: workers are stateless — they reload the code on start. Prefork pool (default): each worker spawns N child processes (avoids GIL for CPU-bound tasks). Celery Beat: a scheduler process that triggers periodic tasks (like cron). Flower: real-time web UI for monitoring queue depth, worker status, task history.`,
        followUps: [
          "Why does Celery use prefork instead of threads by default?",
          "How does Celery handle database connection pools across worker processes?",
          "What are the trade-offs between RabbitMQ and Redis as Celery brokers?"
        ]
      }
    ],
    tradeoffs: {
      pros: [
        "Decouples producers from consumers — producers don't wait for task completion",
        "Retry + DLQ gives operational visibility into failures without losing data",
        "Priority queues ensure critical work (payment processing) runs before background work (analytics)",
        "Autoscaling workers matches compute cost to actual queue demand"
      ],
      cons: [
        "At-least-once delivery means tasks must be idempotent — adds complexity to task handlers",
        "Redis as broker has limited durability — AOF persistence helps but adds latency",
        "Priority queues can starve low-priority tasks under sustained high-priority load",
        "DLQ requires manual intervention — ops team must monitor and re-process failed tasks"
      ],
      when: "Any work that can be deferred from the request path: email sending, image resizing, report generation, ML inference, webhook delivery. Don't use for work that must complete within the HTTP request timeout."
    },
    gotchas: [
      "Tasks MUST be idempotent — at-least-once delivery means a task can run twice (worker crash after execution but before ACK). Design tasks to be safe to run multiple times.",
      "Don't put large payloads in the queue — store data in S3/DB and pass only the reference ID in the task payload. Keeps broker memory lean.",
      "Celery's default is ACKS_EARLY (task acknowledged on receipt, before execution). If worker dies mid-task, task is lost. Use ACKS_LATE for critical tasks.",
      "Worker memory leaks: long-running Python workers accumulate memory. Configure max_tasks_per_child to recycle workers after N tasks.",
      "Redis ZPOPMAX is not atomic with ZADD to in-flight — use Lua scripts or Redis transactions (MULTI/EXEC) for atomic dequeue + in-flight tracking",
      "Queue depth autoscaling has lag — if 1000 tasks arrive simultaneously, it takes time to spin up workers. Pre-warm worker pool for known traffic spikes."
    ],
    visual: function(mount) {
      mount.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <button id="btnEnqueue" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">Enqueue Task</button>
          <button id="btnFail" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">Simulate Failure</button>
          <button id="btnDLQ" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;">Show DLQ</button>
        </div>
        <canvas id="tqCanvas" width="460" height="320" style="width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;"></canvas>
      `;

      var canvas = mount.querySelector('#tqCanvas');
      var ctx = canvas.getContext('2d');
      var W = 460, H = 320;

      var GREEN = '#3fb950', BLUE = '#58a6ff', ORANGE = '#ffa657';
      var RED = '#f85149', GRAY = '#8b949e', TEXT = '#e6edf3';
      var CARD = '#161b22', BORDER = '#30363d', PURPLE = '#bc8cff';

      var queueDepth = 0;
      var workerStatuses = ['idle', 'idle', 'idle'];
      var dlqCount = 0;
      var retryCount = 0;
      var statusLabel = 'Click Enqueue Task to add work to the queue';
      var animating = false;
      var packets = [];

      var PROD = { x: 10, y: 130, w: 64, h: 40 };
      var QUEUE = { x: 100, y: 100, w: 80, h: 100 };
      var WORKERS = [
        { x: 240, y: 60, w: 70, h: 36 },
        { x: 240, y: 106, w: 70, h: 36 },
        { x: 240, y: 152, w: 70, h: 36 }
      ];
      var DLQ_BOX = { x: 370, y: 200, w: 70, h: 40 };

      function drawQueueBox() {
        ctx.fillStyle = CARD;
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(QUEUE.x, QUEUE.y, QUEUE.w, QUEUE.h, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = TEXT;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Queue', QUEUE.x + QUEUE.w / 2, QUEUE.y + 14);

        // Depth bar
        var maxDepth = 15;
        var barH = 60;
        var fillH = Math.min((queueDepth / maxDepth) * barH, barH);
        var barY = QUEUE.y + 25;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(QUEUE.x + 12, barY, QUEUE.w - 24, barH);
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(QUEUE.x + 12, barY, QUEUE.w - 24, barH);

        var barColor = queueDepth > 10 ? RED : (queueDepth > 5 ? ORANGE : GREEN);
        ctx.fillStyle = barColor;
        ctx.fillRect(QUEUE.x + 12, barY + barH - fillH, QUEUE.w - 24, fillH);

        ctx.fillStyle = TEXT;
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(queueDepth, QUEUE.x + QUEUE.w / 2, barY + barH / 2 + 4);

        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.fillText('depth', QUEUE.x + QUEUE.w / 2, barY + barH + 12);

        // Autoscale indicator
        if (queueDepth > 10) {
          ctx.fillStyle = RED;
          ctx.font = '8px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('► autoscale!', QUEUE.x + QUEUE.w / 2, QUEUE.y + QUEUE.h + 14);
        }
      }

      function draw() {
        if (!document.body.contains(canvas)) return;
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = GRAY;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Distributed Task Queue — Retry + DLQ', 10, 14);

        // Producer
        ctx.fillStyle = CARD;
        ctx.strokeStyle = GREEN;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(PROD.x, PROD.y, PROD.w, PROD.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Producer', PROD.x + PROD.w / 2, PROD.y + 15);
        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.fillText('enqueue()', PROD.x + PROD.w / 2, PROD.y + 28);

        drawQueueBox();

        // Workers
        WORKERS.forEach(function(w, i) {
          var status = workerStatuses[i];
          var color = status === 'running' ? ORANGE : (status === 'success' ? GREEN : (status === 'failed' ? RED : GRAY));
          ctx.fillStyle = CARD;
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(w.x, w.y, w.w, w.h, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = TEXT;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Worker ' + (i + 1), w.x + w.w / 2, w.y + 14);
          ctx.fillStyle = color;
          ctx.font = '8px monospace';
          ctx.fillText(status, w.x + w.w / 2, w.y + 27);
        });

        // DLQ
        ctx.fillStyle = '#1a0a0a';
        ctx.strokeStyle = RED;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(DLQ_BOX.x, DLQ_BOX.y, DLQ_BOX.w, DLQ_BOX.h, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = RED;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('DLQ', DLQ_BOX.x + DLQ_BOX.w / 2, DLQ_BOX.y + 15);
        ctx.fillStyle = TEXT;
        ctx.font = '11px monospace';
        ctx.fillText(dlqCount + ' tasks', DLQ_BOX.x + DLQ_BOX.w / 2, DLQ_BOX.y + 30);

        // Retry counter
        ctx.fillStyle = CARD;
        ctx.strokeStyle = ORANGE;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(370, 130, 70, 60, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Retries', 405, 145);
        ctx.fillStyle = TEXT;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(retryCount + '/3', 405, 168);
        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.fillText('exponential', 405, 182);

        // Static arrows
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        WORKERS.forEach(function(w) {
          ctx.beginPath();
          ctx.moveTo(QUEUE.x + QUEUE.w, QUEUE.y + QUEUE.h / 2);
          ctx.lineTo(w.x, w.y + w.h / 2);
          ctx.stroke();
        });
        ctx.setLineDash([]);

        packets.forEach(function(p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        });

        ctx.fillStyle = CARD;
        ctx.strokeStyle = BORDER;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(10, 290, W - 20, 24, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = TEXT;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(statusLabel, W / 2, 306);
      }

      function animPkt(x1, y1, x2, y2, color, onDone) {
        var frames = 0, total = 18;
        var dx = (x2 - x1) / total, dy = (y2 - y1) / total;
        var p = { x: x1, y: y1, color: color };
        packets = [p];
        function tick() {
          if (!document.body.contains(canvas)) return;
          p.x += dx; p.y += dy; frames++;
          draw();
          if (frames < total) requestAnimationFrame(tick);
          else { packets = []; if (onDone) onDone(); }
        }
        requestAnimationFrame(tick);
      }

      mount.querySelector('#btnEnqueue').addEventListener('click', function() {
        if (animating) return;
        animating = true;
        retryCount = 0;
        statusLabel = 'Enqueueing task...';
        animPkt(PROD.x + PROD.w, PROD.y + 20, QUEUE.x, QUEUE.y + QUEUE.h / 2, ORANGE, function() {
          queueDepth = Math.min(queueDepth + 3, 15);
          statusLabel = 'Task in queue (depth: ' + queueDepth + '). Worker picking up...';
          draw();
          setTimeout(function() {
            workerStatuses[0] = 'running';
            queueDepth = Math.max(0, queueDepth - 1);
            animPkt(QUEUE.x + QUEUE.w, QUEUE.y + QUEUE.h / 2, WORKERS[0].x, WORKERS[0].y + 18, GREEN, function() {
              statusLabel = 'Worker 1 executing task...';
              draw();
              setTimeout(function() {
                workerStatuses[0] = 'success';
                statusLabel = 'Task completed successfully!';
                animating = false; draw();
                setTimeout(function() { workerStatuses[0] = 'idle'; draw(); }, 1500);
              }, 700);
            });
          }, 400);
        });
      });

      mount.querySelector('#btnFail').addEventListener('click', function() {
        if (animating) return;
        animating = true;
        retryCount = 0;
        queueDepth = Math.min(queueDepth + 2, 15);
        statusLabel = 'Task enqueued. Worker will fail...';
        draw();
        function runRetry() {
          if (retryCount >= 3) {
            workerStatuses[1] = 'failed';
            statusLabel = 'Max retries (3/3) exceeded → moving to DLQ';
            draw();
            setTimeout(function() {
              dlqCount++;
              workerStatuses[1] = 'idle';
              animating = false;
              statusLabel = 'Task in DLQ (' + dlqCount + ' tasks). Ops team must investigate.';
              draw();
            }, 600);
            return;
          }
          retryCount++;
          workerStatuses[1] = 'running';
          statusLabel = 'Worker 2 executing... (attempt ' + retryCount + '/3)';
          draw();
          setTimeout(function() {
            workerStatuses[1] = 'failed';
            statusLabel = 'FAILED! Retry ' + retryCount + '/3 — backoff: ' + Math.pow(2, retryCount - 1) + 's';
            draw();
            setTimeout(runRetry, 600);
          }, 700);
        }
        runRetry();
      });

      mount.querySelector('#btnDLQ').addEventListener('click', function() {
        if (animating) return;
        statusLabel = 'DLQ has ' + dlqCount + ' failed tasks. Ops can inspect + re-enqueue manually.';
        // Flash DLQ box
        var flashes = 0;
        function flash() {
          if (!document.body.contains(canvas)) return;
          flashes++;
          dlqCount = flashes % 2 === 0 ? dlqCount : dlqCount;
          draw();
          if (flashes < 6) setTimeout(flash, 250);
        }
        flash();
      });

      draw();
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
