(function() {
  var topic = {
    id: "sd-case-payment-system",
    area: "sysdesign",
    title: "Case Study: Payment System (Stripe / PayPal)",
    tag: "Case Study",
    tags: ["idempotency","payments","saga","outbox-pattern","distributed-transactions","stripe","double-charge","reconciliation","ledger","exactly-once"],
    concept: `**Requirements:** Process payments reliably, prevent double charges, handle network timeouts, reconcile ledger, support refunds and partial failures.

**The core problem:** Network is unreliable. A payment API call to Stripe can succeed but your response can get lost. If you retry naively, you charge the customer twice. Solution: idempotency.

**Idempotency key pattern:**
- Client generates a UUID (idempotency key) before the first request.
- Sends it as a header: \`Idempotency-Key: abc-123-xyz\`.
- Server stores the key + result in a Redis/DB cache for 24 hours.
- On retry with the same key → server returns the stored result WITHOUT re-executing.
- Stripe uses this exact pattern. AWS APIs call it "client token."

**Payment flow architecture:**

1. **Client** → POST /payments with idempotency key.
2. **Payment Service** → checks idempotency store (Redis).
   - If key exists → return cached result (no-op).
   - If not → proceed.
3. **Payment Service** → write to **Outbox table** (same DB transaction):
   - Insert payment record (status=PENDING).
   - Insert outbox event (publish=false).
4. **Payment Service** → call Stripe API.
   - Success → update payment to COMPLETED, mark outbox event for publish.
   - Failure → update payment to FAILED.
5. **Outbox Relay** → polls outbox table → publishes to Kafka → Order Service, Inventory Service react.

**Why outbox pattern?** Prevents "payment succeeded but event never published" — the DB write and event are atomic (same transaction). The relay handles publishing asynchronously.

**Saga vs 2PC:**
- 2-Phase Commit: locks DB across services → huge latency, not suitable for external APIs.
- **Saga (choreography):** each service does its step and emits an event. On failure → compensating transactions (refund, release inventory). No distributed locks.

**Reconciliation:**
- Async batch job (runs every hour): fetch all transactions from Stripe API → compare against internal ledger → flag mismatches → alert ops team.
- Prevents silent data inconsistencies over time.`,
    why: "Payment systems appear in FAANG interviews constantly. They force you to think about failure modes, idempotency (the most important concept in distributed payments), atomic writes + event publishing (outbox), and the limits of distributed transactions.",
    example: {
      language: "python",
      code: `# Payment service — FastAPI with idempotency + outbox pattern
from fastapi import FastAPI, Header, HTTPException
from sqlalchemy import text
import uuid, httpx, asyncio

app = FastAPI()

@app.post("/payments")
async def create_payment(
    amount: int,
    currency: str,
    customer_id: str,
    idempotency_key: str = Header(..., alias="Idempotency-Key")
):
    async with db.begin() as conn:
        # 1. Check idempotency store
        existing = await conn.execute(
            text("SELECT result FROM idempotency_keys WHERE key = :key"),
            {"key": idempotency_key}
        )
        row = existing.fetchone()
        if row:
            return row.result  # Return cached result, no charge

        # 2. Write payment + outbox in ONE atomic transaction
        payment_id = str(uuid.uuid4())
        await conn.execute(
            text("""INSERT INTO payments
                    (id, customer_id, amount, currency, status)
                    VALUES (:id, :cid, :amt, :cur, 'PENDING')"""),
            {"id": payment_id, "cid": customer_id,
             "amt": amount, "cur": currency}
        )
        await conn.execute(
            text("""INSERT INTO outbox
                    (id, event_type, payload, published)
                    VALUES (:id, 'payment.initiated', :payload, false)"""),
            {"id": str(uuid.uuid4()),
             "payload": f'{{"payment_id": "{payment_id}"}}'}
        )
        # Save idempotency key placeholder
        await conn.execute(
            text("""INSERT INTO idempotency_keys (key, result)
                    VALUES (:key, 'PROCESSING')"""),
            {"key": idempotency_key}
        )
        # Transaction commits here

    # 3. Call Stripe OUTSIDE the DB transaction
    try:
        stripe_resp = await call_stripe(
            amount, currency, customer_id, idempotency_key
        )
        result = {"status": "success", "charge_id": stripe_resp["id"]}
    except httpx.TimeoutException:
        # Stripe may have processed it — idempotency key ensures safe retry
        result = {"status": "pending", "message": "retry with same key"}
    except Exception as e:
        result = {"status": "failed", "error": str(e)}

    # 4. Update payment status + idempotency result
    async with db.begin() as conn:
        status = "COMPLETED" if result["status"] == "success" else "FAILED"
        await conn.execute(
            text("UPDATE payments SET status=:s WHERE id=:id"),
            {"s": status, "id": payment_id}
        )
        await conn.execute(
            text("UPDATE idempotency_keys SET result=:r WHERE key=:k"),
            {"r": str(result), "k": idempotency_key}
        )
        if status == "COMPLETED":
            await conn.execute(
                text("UPDATE outbox SET published=true WHERE payload LIKE :p"),
                {"p": f'%{payment_id}%'}
            )
    return result

async def call_stripe(amount, currency, customer_id, idempotency_key):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.stripe.com/v1/charges",
            headers={"Idempotency-Key": idempotency_key},
            data={"amount": amount, "currency": currency,
                  "customer": customer_id},
            timeout=10.0
        )
        resp.raise_for_status()
        return resp.json()`
    },
    interview: [
      {
        question: "How do you prevent double charging?",
        answer: "Idempotency keys. The client generates a UUID before the first request and includes it in every retry. The server stores a mapping of idempotency_key → result in Redis (or a DB table) with a 24-hour TTL. On any retry with the same key, the server returns the stored result without re-executing the payment logic. Crucially, we also pass the idempotency key to Stripe — so even if our server calls Stripe twice, Stripe deduplicates on their end too. This gives us double protection.",
        followUps: [
          "What if the Redis that stores idempotency keys goes down between the Stripe call and the key storage?",
          "How do you handle idempotency for refunds?",
          "What's the TTL for idempotency keys and why?"
        ]
      },
      {
        question: "What happens if the payment API call succeeds but your DB write fails?",
        answer: "This is the split-brain problem. Stripe has the charge, your DB doesn't know about it. Solutions: (1) Write to DB FIRST with status=PENDING, then call Stripe. If Stripe succeeds, update to COMPLETED. If Stripe returns timeout, the retry with the same idempotency key is safe. (2) Reconciliation job: runs hourly, fetches all Stripe charges and compares against internal ledger. Any charge in Stripe without a matching COMPLETED record in DB → alert ops team for manual review. (3) Webhook from Stripe: Stripe sends charge.succeeded events → your service updates DB asynchronously.",
        followUps: [
          "How do you handle the case where your webhook receiver is also down?",
          "How do you ensure the reconciliation job itself doesn't double-process records?",
          "Design the schema for a payment ledger."
        ]
      },
      {
        question: "How do you handle partial failures in distributed payment flow?",
        answer: "Use the Saga pattern (choreography style). Payment service charges card → emits payment.completed event. Order service listens → reserves inventory → emits inventory.reserved. If inventory reservation fails → emit inventory.failed → payment service listens → issues refund (compensating transaction). Each step is a local transaction. No distributed locks. The key is: every step must be idempotent (safe to retry) and every failure must have a defined compensating action. Use a saga log to track the current state of each saga instance for debugging.",
        followUps: [
          "What's the difference between choreography and orchestration sagas?",
          "How do you handle a compensating transaction that also fails (refund fails)?",
          "How do you ensure exactly-once processing in the saga steps?"
        ]
      },
      {
        question: "Design a ledger for Stripe.",
        answer: "A ledger is an immutable, append-only log of financial transactions. Schema: ledger_entry(id, account_id, amount, currency, type[DEBIT/CREDIT], reference_id, description, created_at). Never UPDATE or DELETE entries. Corrections = new compensating entry. Balance = SUM(credits) - SUM(debits) for an account_id — computed on read or cached in a balance table (updated by triggers). Use event sourcing: the ledger IS the source of truth. Partition Cassandra table by account_id. For auditing: each entry has an immutable hash linking to previous entry (chain integrity). Reconciliation: daily balance snapshot + incremental from last snapshot.",
        followUps: [
          "How do you handle currency conversion in the ledger?",
          "How do you make balance queries fast on a ledger with 10 years of data?",
          "How do you handle regulatory requirements to keep data in specific regions?"
        ]
      }
    ],
    tradeoffs: {
      pros: [
        "Idempotency keys make retries safe — eliminates the double-charge problem completely",
        "Outbox pattern ensures atomicity between DB write and event publish — no silent event loss",
        "Saga avoids distributed locks — each service owns its own data and compensates on failure",
        "Reconciliation provides a safety net for any edge cases that slip through"
      ],
      cons: [
        "Idempotency key storage has a 24h TTL — after that, stale retries can re-execute (must detect via other means)",
        "Outbox relay adds latency to event publishing (not synchronous) — downstream services see eventual consistency",
        "Saga compensation is complex to implement correctly — compensating transactions must also be idempotent",
        "Reconciliation only catches issues retroactively (hours later) — real-time mismatches require additional monitoring"
      ],
      when: "Any financial transaction system. If you're moving money, idempotency + outbox pattern is non-negotiable. The only exception: internal account transfers within a single DB (use a DB transaction instead)."
    },
    gotchas: [
      "NEVER call an external payment API inside a DB transaction — the transaction holds locks while waiting for a slow HTTP call (seconds). Write to DB first, then call API outside the transaction.",
      "Idempotency key must be client-generated, not server-generated — the client needs the key before the first attempt to use it on retries",
      "Stripe's idempotency keys are scoped to the endpoint — a key used for POST /charges cannot be reused for POST /refunds",
      "The outbox relay must read committed data only — use READ COMMITTED isolation to avoid reading events for transactions that rolled back",
      "Test your failure scenarios with chaos engineering: kill the network after Stripe responds but before your DB write — ensure reconciliation catches it",
      "Currency is an integer (cents) not a float — floating point arithmetic loses money at scale (0.1 + 0.2 ≠ 0.3 in IEEE 754)"
    ],
    visual: {
      type: "flow",
      title: "💳 Payment System Flow (Stripe / PayPal)",
      direction: "horizontal",
      nodes: [
        { id: "client",   label: "Client",        color: "#58a6ff", icon: "💳", sublabel: "Web / Mobile" },
        { id: "gateway",  label: "API Gateway",   color: "#ffa657", icon: "🔀", sublabel: "Auth + Rate limit" },
        { id: "payserv",  label: "Payment Svc",   color: "#bc8cff", icon: "⚙️", sublabel: "Idempotency check" },
        { id: "outbox",   label: "Outbox DB",     color: "#e3b341", icon: "📦", sublabel: "Atomic write" },
        { id: "stripe",   label: "Stripe / PSP",  color: "#ffa657", icon: "🏦", sublabel: "Card network" },
        { id: "kafka",    label: "Kafka",          color: "#3fb950", icon: "⚡", sublabel: "Outbox relay" },
        { id: "merchant", label: "Merchant Svc",  color: "#58a6ff", icon: "🏪", sublabel: "Order + inventory" }
      ],
      connections: [
        { from: "client",   to: "gateway",  label: "POST /payments",      protocol: "HTTPS" },
        { from: "gateway",  to: "payserv",  label: "idempotency key",      protocol: "REST" },
        { from: "payserv",  to: "outbox",   label: "atomic DB txn",        protocol: "SQL" },
        { from: "payserv",  to: "stripe",   label: "charge request",       protocol: "REST" },
        { from: "stripe",   to: "payserv",  label: "authorized / declined", protocol: "REST" },
        { from: "outbox",   to: "kafka",    label: "outbox relay poll",    protocol: "CDC" },
        { from: "kafka",    to: "merchant", label: "payment.completed",    protocol: "Kafka" }
      ],
      scenarios: [
        {
          name: "✅ Card Success",
          path: ["client", "gateway", "payserv", "outbox", "stripe", "kafka", "merchant"],
          result: "✓ Payment captured — order confirmed",
          resultColor: "#3fb950"
        },
        {
          name: "🔐 3DS Challenge",
          path: ["client", "gateway", "payserv", "stripe"],
          result: "⟳ 3DS redirect — awaiting customer auth",
          resultColor: "#e3b341"
        },
        {
          name: "✗ Card Declined",
          path: ["client", "gateway", "payserv", "stripe"],
          result: "✗ Declined — 402 Insufficient Funds",
          resultColor: "#f85149"
        },
        {
          name: "🔁 Timeout Retry",
          path: ["client", "gateway", "payserv", "stripe"],
          result: "⟳ Same idempotency key — Stripe deduplicates, no double charge",
          resultColor: "#ffa657"
        }
      ]
    }
  };
  window.SYSDESIGN_TOPICS = (window.SYSDESIGN_TOPICS || []).concat([topic]);
})();
