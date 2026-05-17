(function() {
  var topic = {
    id: "sd-case-ticket-booking",
    area: "sysdesign",
    title: "Case Study: Ticket Booking System (BookMyShow / Ticketmaster)",
    tag: "Case Study",
    tags: ["optimistic-locking","pessimistic-locking","cas","redis-setnx","virtual-queue","overbooking","race-condition","seat-reservation","high-contention","concert"],
    concept: `**Requirements:** 100K concurrent users for a Taylor Swift concert release. 50,000 seats. Prevent double booking. Handle traffic spike. Show seat availability in real-time.

**The core problem:** Two users view the same seat as AVAILABLE simultaneously. Both click "Book". Without protection, both succeed → same seat double-booked. This is a classic race condition.

**Solutions:**

**1. Optimistic Locking (Compare-And-Swap)**
- SELECT seat WHERE status='AVAILABLE' AND version=N.
- Process booking logic (price calculation, etc.).
- UPDATE seat SET status='BOOKED', version=N+1 WHERE id=? AND version=N AND status='AVAILABLE'.
- If 0 rows updated → another user booked it first → return "seat taken".
- Pro: No locks held during processing. High throughput for low-contention scenarios.
- Con: Under high contention, many retries needed — degraded UX.

**2. Pessimistic Locking (SELECT FOR UPDATE)**
- BEGIN TRANSACTION; SELECT * FROM seats WHERE id=? FOR UPDATE (acquires row lock).
- Nobody else can touch that row until this transaction completes.
- UPDATE seat SET status='BOOKED'; COMMIT.
- Pro: Guaranteed consistency. Con: Locks held during HTTP call — deadlocks, slow throughput.

**3. Redis Distributed Lock (best for seat hold)**
- SETNX seat:hold:{seat_id} {user_id} EX 300 (5-minute hold, atomic).
- Returns 1 (success) or 0 (another user holds it).
- User completes payment → final DB write.
- Hold expires → seat released back to pool (TTL handles cleanup automatically).
- Pro: Sub-millisecond. No DB row locking. Con: Redis failure = hold data lost (use Redis Sentinel/Cluster).

**4. Atomic inventory counter**
- Redis: DECR available_seats:{event_id}. If result < 0 → INCR back → no seats available.
- Fast check before expensive DB write.
- Prevents overbooking at the Redis level.

**5. Virtual waiting room (for traffic spike)**
- All 100K users who hit "Buy" at 10:00 AM are placed in a Redis queue (ZADD with join_timestamp as score).
- Throttle: every second, dequeue 100 users (configurable) → redirect to booking page.
- Show user their position in queue + estimated wait time.
- Queue is fair (FIFO). Prevents server overload. Improves perceived fairness.

**Complete flow:**
Browser → Load Balancer → Wait Room Service → (if admitted) Seat Selection → Redis hold (SETNX) → Payment → DB write (CAS) → Kafka event → Ticket generation service`,
    why: `High-contention resource booking (concert tickets, flight seats, hotel rooms) is one of the richest system design problems. It forces you to choose between optimistic vs pessimistic locking, use Redis for distributed locks, design virtual queues, and handle the thundering herd — all in one problem.`,
    example: {
      language: "python",
      code: `# Seat booking service — Redis hold + CAS DB write
from fastapi import FastAPI, HTTPException
from redis.asyncio import Redis
from sqlalchemy import text
import asyncio

app = FastAPI()
redis = Redis(host='redis-cluster', decode_responses=True)

HOLD_TTL = 300  # 5 minutes
VIRTUAL_QUEUE = "booking:queue:{event_id}"

# --- Virtual waiting room ---
@app.post("/booking/join-queue")
async def join_queue(event_id: str, user_id: str):
    import time
    key = VIRTUAL_QUEUE.format(event_id=event_id)
    # ZADD with timestamp — FIFO ordering
    await redis.zadd(key, {user_id: time.time()}, nx=True)
    position = await redis.zrank(key, user_id)
    return {
        "position": position + 1,
        "estimated_wait_secs": (position // 100) * 60  # 100 users/min
    }

# Background process: admit 100 users/second
async def queue_drainer(event_id: str):
    key = VIRTUAL_QUEUE.format(event_id=event_id)
    while True:
        # Atomically pop 100 users from front of queue
        users = await redis.zpopmin(key, count=100)
        for user_id, _ in users:
            await send_booking_token(user_id, event_id)  # notify user
        await asyncio.sleep(1)

# --- Seat hold (distributed lock) ---
@app.post("/booking/hold-seat")
async def hold_seat(event_id: str, seat_id: str, user_id: str):
    hold_key = f"seat:hold:{event_id}:{seat_id}"

    # Atomic: SETNX + EXPIRE in one command
    acquired = await redis.set(hold_key, user_id, nx=True, ex=HOLD_TTL)
    if not acquired:
        raise HTTPException(status_code=409,
            detail="Seat already held by another user")

    # Check inventory (prevent overbooking)
    inv_key = f"inventory:{event_id}"
    remaining = await redis.decr(inv_key)
    if remaining < 0:
        await redis.incr(inv_key)
        await redis.delete(hold_key)
        raise HTTPException(status_code=410, detail="Event sold out")

    return {"hold_key": hold_key, "expires_in": HOLD_TTL}

# --- Confirm booking (CAS on DB) ---
@app.post("/booking/confirm")
async def confirm_booking(event_id: str, seat_id: str, user_id: str):
    hold_key = f"seat:hold:{event_id}:{seat_id}"
    holder = await redis.get(hold_key)
    if holder != user_id:
        raise HTTPException(status_code=403, detail="Hold expired or not yours")

    # Optimistic locking: UPDATE only if status=AVAILABLE
    async with db.begin() as conn:
        result = await conn.execute(
            text("""UPDATE seats
                    SET status='BOOKED', booked_by=:uid
                    WHERE id=:sid AND event_id=:eid AND status='AVAILABLE'"""),
            {"uid": user_id, "sid": seat_id, "eid": event_id}
        )
        if result.rowcount == 0:
            # Another process snuck in (CAS failed)
            await redis.incr(f"inventory:{event_id}")  # restore count
            raise HTTPException(status_code=409, detail="Seat no longer available")

    # Booking confirmed — release hold (cleanup)
    await redis.delete(hold_key)
    # Publish event for ticket generation
    await kafka.publish("booking.confirmed", {
        "user_id": user_id, "seat_id": seat_id, "event_id": event_id
    })
    return {"status": "booked", "seat": seat_id}`
    },
    interview: [
      {
        question: "How do you prevent 2 users from booking the same seat?",
        answer: `Three-layer defense: (1) Redis SETNX for seat hold — atomic set-if-not-exists. First user to call SETNX gets the hold. Second user gets 0 (failure). Sub-millisecond, no DB load. (2) DB optimistic locking — even if Redis fails, the UPDATE WHERE status='AVAILABLE' CAS (compare-and-swap) ensures only one DB write succeeds. If 0 rows updated, the booking fails safely. (3) Database UNIQUE constraint on (event_id, seat_id, status='BOOKED') as a last line of defense. All three layers together make double-booking virtually impossible.`,
        followUps: [
          "What happens if Redis goes down between the hold and the DB write?",
          "How do you handle the seat hold expiring while payment is in progress?",
          "Why not use SELECT FOR UPDATE (pessimistic locking) instead?"
        ]
      },
      {
        question: "How do you handle 100K concurrent users for a Taylor Swift concert?",
        answer: `Virtual waiting room pattern: when tickets go on sale, all users who arrive in the first second are redirected to a queue (Redis sorted set, score = arrival timestamp). A drainer process admits N users per second (configurable, e.g., 500/sec). Admitted users receive a short-lived JWT token to enter the booking flow. This converts a 100K simultaneous spike into a steady stream. The booking servers only see N users at a time — no overload. Benefits: fair (FIFO), transparent (show queue position), graceful degradation.`,
        followUps: [
          "How do you handle users who leave the queue (browser closed)?",
          "How do you prevent users from sharing their queue position tokens?",
          "Should the waiting room be implemented server-side or at the CDN level?"
        ]
      },
      {
        question: "How do you implement a virtual waiting room?",
        answer: `Redis sorted set: ZADD booking:queue:{event_id} {unix_timestamp} {user_id} with NX flag (no re-join). User sees their position via ZRANK. A background worker runs every second: ZPOPMIN queue 500 → issue each popped user a time-limited booking token (JWT with exp=10min). If user doesn't use token in 10 minutes → token expires → they'd need to re-join queue. The front-end polls GET /queue-position every 5 seconds using long-polling or SSE for live updates. The queue drainer adjusts throughput based on booking server load metrics.`,
        followUps: [
          "How do you scale the queue drainer itself (what if it crashes)?",
          "How do you handle users who get admitted but abandon without booking?",
          "Should you show real-time seat availability during the queue wait?"
        ]
      },
      {
        question: "What's the difference between optimistic and pessimistic locking here?",
        answer: `Pessimistic: acquire a DB row lock (SELECT FOR UPDATE) before reading — no other transaction can modify the row until yours commits. Safe but slow: lock is held for the entire booking duration (including payment processing, which can take seconds). Risk: deadlocks if multiple locks acquired in different orders. Optimistic: no lock on read. On write: UPDATE WHERE version=N (CAS). If another transaction changed the row, version differs → your update fails → retry or fail. Better for high-read, low-write-conflict workloads. For seat booking: Redis hold acts like a fast pessimistic lock, DB CAS is the safety net — best of both worlds.`,
        followUps: [
          "When would you prefer pessimistic locking over optimistic locking?",
          "How do you implement optimistic locking in JPA/Hibernate?",
          "What's the cost of a retry storm in optimistic locking under high contention?"
        ]
      }
    ],
    tradeoffs: {
      pros: [
        "Redis SETNX for seat hold: sub-millisecond, no DB load, auto-expiry on TTL",
        "Virtual waiting room converts thundering herd into smooth throughput — protects backend completely",
        "Optimistic CAS on DB is a safe backstop without holding locks during payment",
        "Atomic Redis DECR for inventory prevents overbooking before touching DB"
      ],
      cons: [
        "Redis failure during hold phase = hold data lost → users may lose their held seat (mitigate with Redis Sentinel/Cluster)",
        "Virtual queue adds latency for users — requires investment in queue UX to avoid frustration",
        "Optimistic locking under extreme contention (100 users for 1 seat) = many retries = wasted DB writes",
        "Seat hold TTL must balance user patience (5 min) vs seat turnover (can't hold forever)"
      ],
      when: "Any high-contention resource reservation: concert tickets, airline seats, hotel rooms, restaurant tables, flash sale inventory. The virtual waiting room is specifically for known traffic spikes (on-sale events)."
    },
    gotchas: [
      "Never show 'AVAILABLE' seats in real-time to all 100K waiting users — they'll all try to book the same popular seat simultaneously. Reveal seat map only after user is admitted from the queue.",
      "Seat hold TTL must be strictly enforced — a user who abandons payment must not block that seat forever. Run a background job every 30s to scan for expired holds and update DB status back to AVAILABLE.",
      "Redis DECR can go negative if Redis and DB get out of sync — always check DECR result immediately and INCR back if negative before issuing hold.",
      "Ticket scalpers use bots to hold seats without completing payment — implement CAPTCHA + rate limiting at the queue join step, and monitor for users who join queue multiple times.",
      "The virtual queue drainer is a SPOF — run multiple instances with leader election (Redis Redlock) to ensure only one drainer runs at a time.",
      "Payment timeout during seat hold: if payment gateway takes >5 min (your hold TTL), the seat is released while payment is in-flight. Set hold TTL > max expected payment time, or implement hold extension API."
    ],
    visual: function(mount) {
      mount.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;">
          <button id="btnRace" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">Simulate Race</button>
          <button id="btnQueue" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;margin-right:6px;">Fill Virtual Queue</button>
          <button id="btnReset" style="padding:5px 14px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer;font-size:12px;">Reset</button>
        </div>
        <canvas id="tbCanvas" width="460" height="320" style="width:100%;max-width:460px;border-radius:8px;background:#0d1117;display:block;margin:0 auto;"></canvas>
      `;

      var canvas = mount.querySelector('#tbCanvas');
      var ctx = canvas.getContext('2d');
      var W = 460, H = 320;

      var GREEN = '#3fb950', BLUE = '#58a6ff', ORANGE = '#ffa657';
      var RED = '#f85149', GRAY = '#8b949e', TEXT = '#e6edf3';
      var CARD = '#161b22', BORDER = '#30363d', PURPLE = '#bc8cff';

      var COLS = 8, ROWS = 4;
      var seatStatuses = [];
      var queueCount = 0;
      var admittedCount = 0;
      var statusLabel = 'Choose a scenario — Simulate Race or Fill Virtual Queue';
      var animating = false;
      var raceMsg = '';
      var raceMsgColor = TEXT;
      var queueInterval = null;

      function initSeats() {
        seatStatuses = [];
        for (var i = 0; i < ROWS * COLS; i++) seatStatuses.push('available');
        // Pre-book some seats for visual interest
        [2, 5, 10, 18, 25].forEach(function(i) { seatStatuses[i] = 'booked'; });
      }
      initSeats();

      var SEAT_W = 30, SEAT_H = 22, SEAT_PAD = 6;
      var GRID_X = 10, GRID_Y = 30;

      function seatColor(status) {
        if (status === 'available') return GREEN;
        if (status === 'reserved') return ORANGE;
        if (status === 'booked') return RED;
        if (status === 'hold') return BLUE;
        return GRAY;
      }

      function getSeatXY(idx) {
        var col = idx % COLS, row = Math.floor(idx / COLS);
        return {
          x: GRID_X + col * (SEAT_W + SEAT_PAD),
          y: GRID_Y + row * (SEAT_H + SEAT_PAD)
        };
      }

      function draw() {
        if (!document.body.contains(canvas)) return;
        ctx.clearRect(0, 0, W, H);

        ctx.fillStyle = GRAY;
        ctx.font = '9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('Concert Hall — Seat Reservation', 10, 16);

        // Legend
        var legend = [['available', GREEN], ['reserved', ORANGE], ['booked', RED], ['hold', BLUE]];
        legend.forEach(function(l, i) {
          ctx.fillStyle = l[1];
          ctx.fillRect(280 + i * 46, 8, 8, 8);
          ctx.fillStyle = GRAY;
          ctx.font = '7px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(l[0], 290 + i * 46, 16);
        });

        // Draw seat grid
        seatStatuses.forEach(function(status, idx) {
          var pos = getSeatXY(idx);
          ctx.fillStyle = status === 'available' ? '#0d2818' : (status === 'booked' ? '#1a0808' : (status === 'hold' ? '#080d1a' : '#1a1208'));
          ctx.strokeStyle = seatColor(status);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pos.x, pos.y, SEAT_W, SEAT_H, 3);
          ctx.fill();
          ctx.stroke();

          // Seat label
          var row = Math.floor(idx / COLS);
          var col = idx % COLS;
          var seatLabel = String.fromCharCode(65 + row) + (col + 1);
          ctx.fillStyle = seatColor(status);
          ctx.font = '7px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(seatLabel, pos.x + SEAT_W / 2, pos.y + SEAT_H / 2 + 3);
        });

        // Race condition message
        if (raceMsg) {
          ctx.fillStyle = CARD;
          ctx.strokeStyle = raceMsgColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(10, 145, 260, 40, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = raceMsgColor;
          ctx.font = 'bold 10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(raceMsg, 140, 160);
          ctx.fillStyle = GRAY;
          ctx.font = '8px monospace';
          ctx.fillText('CAS: UPDATE WHERE status=AVAILABLE', 140, 178);
        }

        // Virtual queue panel
        ctx.fillStyle = CARD;
        ctx.strokeStyle = PURPLE;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(280, 130, 170, 100, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = PURPLE;
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Virtual Waiting Room', 365, 147);

        ctx.fillStyle = TEXT;
        ctx.font = '12px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('In queue: ', 290, 170);
        ctx.fillStyle = ORANGE;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(queueCount, 355, 170);

        ctx.fillStyle = TEXT;
        ctx.font = '12px monospace';
        ctx.fillText('Admitted: ', 290, 192);
        ctx.fillStyle = GREEN;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(admittedCount, 360, 192);

        ctx.fillStyle = GRAY;
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('throttle: 10 users/sec', 365, 212);
        ctx.fillText(queueCount > 0 ? 'draining...' : (admittedCount > 0 ? 'queue empty' : 'idle'), 365, 224);

        // Status bar
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

      // Find D5 seat index (row D = row 3, col 5 = index 29)
      var raceTargetIdx = 3 * COLS + 4; // D5

      function simulateRace() {
        if (animating) return;
        animating = true;
        seatStatuses[raceTargetIdx] = 'available';
        raceMsg = '';
        statusLabel = 'User A and User B both see D5 = AVAILABLE';
        draw();

        setTimeout(function() {
          // Both "read" D5 as available
          seatStatuses[raceTargetIdx] = 'reserved';
          statusLabel = 'Both A and B submit booking for D5 simultaneously...';
          draw();

          setTimeout(function() {
            // A wins the CAS
            seatStatuses[raceTargetIdx] = 'booked';
            raceMsg = 'User A wins CAS → D5 BOOKED';
            raceMsgColor = GREEN;
            statusLabel = 'User A: UPDATE WHERE status=AVAILABLE → 1 row updated (success!)';
            draw();

            setTimeout(function() {
              // B's CAS fails
              raceMsg = 'User B CAS fails → "Seat taken, pick another"';
              raceMsgColor = RED;
              statusLabel = 'User B: UPDATE WHERE status=AVAILABLE → 0 rows updated (row already BOOKED)';
              animating = false;
              draw();
            }, 1200);
          }, 900);
        }, 800);
      }

      function fillVirtualQueue() {
        if (queueInterval) clearInterval(queueInterval);
        queueCount = 1000;
        admittedCount = 0;
        statusLabel = '1000 users in virtual queue — throttling 10/sec into booking flow';
        draw();

        queueInterval = setInterval(function() {
          if (!document.body.contains(canvas)) { clearInterval(queueInterval); return; }
          if (queueCount <= 0) {
            clearInterval(queueInterval);
            queueInterval = null;
            statusLabel = 'Queue drained — all users admitted to booking flow';
            draw();
            return;
          }
          var batch = Math.min(10, queueCount);
          queueCount -= batch;
          admittedCount += batch;
          statusLabel = 'Admitting ' + batch + '/sec — queue: ' + queueCount + ' remaining';
          draw();
        }, 200);
      }

      function resetAll() {
        if (queueInterval) { clearInterval(queueInterval); queueInterval = null; }
        initSeats();
        queueCount = 0;
        admittedCount = 0;
        raceMsg = '';
        raceMsgColor = TEXT;
        animating = false;
        statusLabel = 'Reset complete — choose a scenario';
        draw();
      }

      mount.querySelector('#btnRace').addEventListener('click', simulateRace);
      mount.querySelector('#btnQueue').addEventListener('click', fillVirtualQueue);
      mount.querySelector('#btnReset').addEventListener('click', resetAll);

      draw();
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
