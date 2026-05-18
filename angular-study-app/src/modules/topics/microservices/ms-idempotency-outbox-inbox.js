(function() {
  var topic = {
    id: "ms-idempotency-outbox-inbox",
    area: "microservices",
    title: "Idempotency Keys, Outbox & Inbox Patterns",
    tag: "Reliability",
    tags: ["idempotency", "outbox", "inbox", "dedupe", "at least once", "fastapi", "postgres"],
    concept:
`Distributed systems retry constantly: browsers retry, gateways retry, clients retry on timeouts, Kafka redelivers after crashes, and jobs rerun after deploys. **Idempotency** makes repeated attempts produce the same business result.

Core patterns:
- **Idempotency key**: client supplies a unique key per intent, such as checkout-123. The server stores the final response for that key and returns it on retries.
- **Transactional outbox**: write the business row and the event row in one database transaction; a relay publishes later.
- **Inbox / processed message table**: consumers record event IDs before side effects so redelivery does not duplicate work.
- **Natural unique constraints**: enforce business uniqueness at the database boundary, not only in application memory.
- **TTL and replay policy**: keys cannot live forever; choose retention based on retry windows, refunds, and audit needs.`,
    why:
"\"Exactly once\" is usually an interface promise built from **at-least-once delivery plus idempotent handlers**. Without idempotency, a timeout after a successful payment can lead the client to retry and charge twice. Without outbox, an order can commit but its event can be lost. Without inbox, one Kafka redelivery can reserve stock twice. These are the production bugs that make microservices painful during incidents.",
    example: {
      language: "python",
      code:
`# FastAPI + PostgreSQL pattern: idempotent command + transactional outbox
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

class CreateOrder(BaseModel):
    user_id: str
    sku: str
    quantity: int

async def get_session() -> AsyncSession:
    ...

@app.post("/orders", status_code=201)
async def create_order(
    cmd: CreateOrder,
    idempotency_key: str = Header(alias="Idempotency-Key")
):
    if not idempotency_key or len(idempotency_key) < 12:
        raise HTTPException(400, "missing or weak Idempotency-Key")

    session = await get_session()
    async with session.begin():
        # Try to reserve the key. Unique(client_key) prevents duplicate work.
        inserted = await session.execute(text("""
            insert into idempotency_keys(client_key, status, expires_at)
            values (:key, 'PROCESSING', :expires_at)
            on conflict (client_key) do nothing
            returning client_key
        """), {
            "key": idempotency_key,
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=24),
        })

        if inserted.first() is None:
            # Lock existing key so concurrent retries serialize behind the winner.
            existing = await session.execute(text("""
                select status, status_code, response_json
                from idempotency_keys
                where client_key = :key
                for update
            """), {"key": idempotency_key})
            row = existing.mappings().one()
            if row["status"] == "SUCCEEDED":
                return row["response_json"]
            raise HTTPException(409, "request with this key is still processing")

        order_id = str(uuid4())
        await session.execute(text("""
            insert into orders(id, user_id, sku, quantity, status)
            values (:id, :user_id, :sku, :quantity, 'CREATED')
        """), {**cmd.model_dump(), "id": order_id})

        event_id = str(uuid4())
        await session.execute(text("""
            insert into outbox_events(id, aggregate_id, type, payload_json)
            values (:event_id, :order_id, 'ORDER_CREATED', jsonb_build_object(
                'event_id', :event_id,
                'order_id', :order_id,
                'sku', :sku,
                'quantity', :quantity
            ))
        """), {
            "event_id": event_id,
            "order_id": order_id,
            "sku": cmd.sku,
            "quantity": cmd.quantity,
        })

        response = {"order_id": order_id, "status": "CREATED"}
        await session.execute(text("""
            update idempotency_keys
            set status = 'SUCCEEDED', status_code = 201, response_json = :response
            where client_key = :key
        """), {"key": idempotency_key, "response": response})
        return response

async def relay_outbox_once(session: AsyncSession, producer):
    # skip locked lets multiple relay workers share work without double publishing.
    rows = await session.execute(text("""
        select id, aggregate_id, type, payload_json
        from outbox_events
        where published_at is null
        order by created_at
        limit 100
        for update skip locked
    """))
    for event in rows.mappings():
        await producer.send("orders.events", key=event["aggregate_id"], value=event["payload_json"])
        await session.execute(text("""
            update outbox_events set published_at = now() where id = :id
        """), {"id": event["id"]})

async def consume_inventory_event(session: AsyncSession, event):
    async with session.begin():
        inserted = await session.execute(text("""
            insert into inbox_messages(event_id, consumer_name)
            values (:event_id, 'inventory-service')
            on conflict do nothing
            returning event_id
        """), {"event_id": event["event_id"]})
        if inserted.first() is None:
            return  # already processed this delivery

        await session.execute(text("""
            update stock
            set reserved = reserved + :quantity
            where sku = :sku and available - reserved >= :quantity
        """), event)`,
      notes: "Create these constraints: `unique(idempotency_keys.client_key)`, `unique(outbox_events.id)`, and `unique(inbox_messages.event_id, inbox_messages.consumer_name)`. For payments, the idempotency key must also be sent to the payment provider so your boundary and the external provider share the same retry identity."
    },
    interview: [
      {
        question: "Is idempotency the same as exactly-once processing?",
        answer:
"No. Idempotency means repeated execution has the same externally visible result. Exactly-once is a stronger end-to-end claim and is rarely available across HTTP, databases, message brokers, and third-party APIs together. In practice, production systems use at-least-once delivery, durable dedupe records, unique constraints, and idempotent side effects to make retries safe.",
        followUps: ["Where should the idempotency key be generated?", "How long should keys be retained?"]
      },
      {
        question: "What happens if the outbox relay publishes to Kafka but crashes before marking the row sent?",
        answer:
"The relay will publish the same event again after restart. That is expected. The event must have a stable event ID, and every consumer must dedupe through an inbox table or idempotent upsert. Outbox gives no-lost-events; inbox/idempotent consumers handle duplicate-events.",
        followUps: ["How do you monitor stuck outbox rows?", "When is Debezium better than polling?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Turns retry-heavy HTTP and message flows into safe repeated operations.",
        "Outbox removes the dual-write gap between database commits and broker publishes.",
        "Inbox tables make at-least-once brokers practical for business side effects."
      ],
      cons: [
        "Adds tables, cleanup jobs, and careful transaction boundaries.",
        "Long idempotency retention increases storage and privacy obligations.",
        "Returning cached responses can hide changed downstream state if keys are reused incorrectly."
      ],
      when: "Use for **payments, checkout, provisioning, inventory, email sends, external API calls, and Kafka consumers**. Skip only for naturally read-only operations or commands that are already protected by a strong unique business key."
    }
  };
  window.MICRO_TOPICS = (window.MICRO_TOPICS || []).concat([topic]);
})();
