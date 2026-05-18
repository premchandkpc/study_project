(function() {
  var topic = {
    id: "db-transactions-acid",
    area: "databases",
    title: "Transactions & ACID",
    tag: "Reliability",
    tags: ["database","transactions","acid","atomicity","consistency","isolation","durability","2pc","mvcc","wal","savepoints","idempotency"],

    concept: `## Transactions & ACID

A **transaction** is a unit of work that must succeed or fail entirely — no partial updates, no half-applied state. ACID is the set of four properties that define what "correct" means for a transaction.

---

### A — Atomicity

All operations in a transaction commit together or none do. The database guarantees that a crash mid-transaction leaves **zero visible changes**.

**Real scenario 1 — Bank transfer**: Debit $500 from account A, credit $500 to account B. If the credit fails (constraint violation, disk full, network drop), the debit **must** roll back. Without atomicity you lose $500 into the void. PostgreSQL wraps both statements in an implicit transaction; an explicit \`BEGIN/ROLLBACK\` makes the boundary explicit.

**Real scenario 2 — Order + Inventory**: Insert row into \`orders\`, decrement \`inventory.qty\`. If inventory decrement fails a CHECK constraint (qty would go negative), the entire order must disappear. The SLA guarantees customers never see a confirmed order for out-of-stock goods.

---

### C — Consistency

A transaction takes the database from one **valid state** to another. "Valid" means all constraints, triggers, foreign keys, and application invariants hold after commit.

**Real scenario 3 — Distributed Saga**: In a microservices checkout saga (Reserve → Charge → Fulfill), each local transaction is atomic, but the saga as a whole is not a single DB transaction. Consistency is maintained via compensating transactions: if Charge fails, a \`cancel_reservation\` compensating step fires to restore inventory. True ACID consistency is bounded to a single database node; cross-service consistency requires explicit saga orchestration.

**Real scenario 4 — Optimistic Locking**: An e-commerce site updates a product's price. Two admins load the product (version=5) simultaneously. The first saves → version becomes 6. The second's \`UPDATE products SET price=... WHERE id=? AND version=5\` matches 0 rows → application detects stale read → rejects update → consistency enforced without a pessimistic lock.

---

### I — Isolation

Concurrent transactions must not see each other's intermediate state. The degree of isolation is configurable via **isolation levels**.

**Real scenario 5 — Savepoints**: A batch-import job inserts 10,000 rows. Every 100 rows it sets a \`SAVEPOINT sp_100\`. If row 347 violates a constraint, it rolls back to \`SAVEPOINT sp_300\` (not to the start), preserving rows 1–300. Savepoints let you implement partial retry without losing all progress.

**Real scenario 6 — Nested Transactions**: PostgreSQL does not support true nested transactions but emulates them with savepoints. An ORM like GORM wraps nested \`Save()\` calls in savepoints so a failing child write does not abort the outer transaction — preserving isolation semantics within a single connection.

---

### D — Durability

Once a transaction commits, data survives **any** subsequent failure: power loss, OS crash, disk write buffer flush failure.

**Real scenario 7 — Two-Phase Commit (2PC)**: Coordinating a payment between two databases (account DB + ledger DB). Phase 1 (Prepare): coordinator asks both participants to lock resources and write their intent to WAL. Phase 2 (Commit): coordinator writes global commit, then instructs participants to commit. If coordinator crashes after Phase 1 but before Phase 2, participants block until the coordinator recovers — this is the **2PC blocking problem**.

**Real scenario 8 — XA Transactions**: Java EE / Spring applications use the XA protocol (ISO/IEC standard 2PC) to span a JDBC database, a JMS queue, and a JNDI resource atomically. An XA transaction manager (Atomikos, Bitronix) drives the two-phase commit. XA transactions are 2-10× slower than local transactions because of coordinator round-trips and forced fsync on both sides.

**Real scenario 9 — Serializable Isolation Cost**: PostgreSQL's \`SERIALIZABLE\` isolation detects serialization anomalies via Serializable Snapshot Isolation (SSI). It tracks read/write dependencies and aborts transactions that form a dangerous cycle. Under high write concurrency this causes 30–50% more aborted transactions (serialization failures), requiring application-level retry loops. Production systems often use \`READ COMMITTED\` + application-level locking to avoid this cost.

**Real scenario 10 — WAL Crash Recovery**: PostgreSQL writes every change to the Write-Ahead Log **before** applying it to heap pages. On crash restart, the WAL replayer scans from the last checkpoint, redoes committed transactions, and undoes (via \`pg_undo\`) any transactions that were in-flight at crash time. This redo/undo loop guarantees durability even if 90% of shared_buffers was never flushed to disk.

---

### Isolation Levels Quick Reference

| Level | Dirty Read | Non-Repeatable Read | Phantom Read |
|---|---|---|---|
| READ UNCOMMITTED | Possible | Possible | Possible |
| READ COMMITTED | Prevented | Possible | Possible |
| REPEATABLE READ | Prevented | Prevented | Possible* |
| SERIALIZABLE | Prevented | Prevented | Prevented |

*PostgreSQL's REPEATABLE READ also prevents phantoms via MVCC snapshots.

---

### MVCC — How Isolation Works Without Blocking Reads

PostgreSQL, MySQL (InnoDB), and CockroachDB use Multi-Version Concurrency Control. Each row carries \`xmin\` (created by txn) and \`xmax\` (deleted/updated by txn). A SELECT sees a snapshot of all rows committed before its transaction started — readers never block writers and writers never block readers. The trade-off: old row versions accumulate as "dead tuples" requiring periodic VACUUM to reclaim space.`,

    why: `## Why ACID Matters in Production

1. **Payment Systems — Money must not vanish**: A Stripe charge involves debiting a source, crediting a destination, writing a ledger entry, and updating a balance cache. Without atomicity, a server crash between steps leaves accounts in inconsistent states. ACID guarantees all five writes happen or none do.

2. **Airline / Hotel Booking — Double booking prevention**: Two users book the last seat simultaneously. Without isolation (at least \`REPEATABLE READ\`), both transactions read \`seats_available=1\`, both decrement, both commit — overselling by 1. A \`SELECT ... FOR UPDATE\` or serializable transaction prevents this.

3. **Inventory — Negative stock prevention**: An e-commerce platform's CHECK constraint \`qty >= 0\` on the inventory table is a consistency rule. Transactions that would violate it abort entirely — the associated order row is never inserted either (atomicity). Without ACID, you'd need application-level guards everywhere.

4. **Financial Audits — Immutable audit trail**: Regulatory compliance (SOX, PCI-DSS) requires that every balance change be traceable to an exact transaction. Durability ensures WAL records are the audit log — committed transactions are permanent even if the application server explodes.

5. **Distributed Microservices — Saga failure compensation**: A travel booking saga (flight + hotel + car) spans three services. If the car reservation fails, the saga's compensating transactions cancel the flight and hotel. Without explicit atomicity boundaries per service, partial failures produce orphaned reservations that billing systems charge for.

6. **Rollback on Validation Failure**: An import pipeline validates 10,000 CSV rows. Row 7,342 has an invalid foreign key. The entire import transaction rolls back — no partial data enters the system. A re-run with the fixed file starts clean. Without atomicity, partial imports corrupt downstream analytics.

7. **Crash Recovery — Zero data loss on restart**: A PostgreSQL server loses power during a high-traffic period. On restart, WAL replay recovers every committed transaction and discards every in-flight one. Applications that poll for data after reconnect see a consistent state — no manual reconciliation needed.

8. **Multi-Table Consistency — Referential integrity across joins**: An order management system inserts into \`orders\`, \`order_lines\`, \`payments\`, and \`shipments\` in one transaction. If the \`shipments\` INSERT fails (warehouse service DB timeout), the entire transaction rolls back. Foreign keys from \`order_lines\` to \`orders\` are never left dangling.

9. **Idempotency — Safe retries in distributed systems**: A payment service wraps each charge in a transaction keyed on an idempotency token. If the client retries due to a network timeout, the duplicate request finds the existing transaction by token and returns the cached result — the charge is applied exactly once. The idempotency key is stored atomically with the charge record.

10. **Reporting Consistency — Snapshot reads**: A nightly financial report runs a long query. With \`REPEATABLE READ\`, the query sees a consistent snapshot of the database as of transaction start — even if other transactions commit updates during the 20-minute report run. Without isolation, the same report re-read at different points would see different numbers (non-repeatable reads).`,

    example: {
      language: "go",
      code: `package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"time"

	_ "github.com/lib/pq"
)

// TransferRequest carries all fields needed for an idempotent bank transfer.
type TransferRequest struct {
	IdempotencyKey string
	FromAccount    int64
	ToAccount      int64
	Amount         int64 // in cents
}

// TransferResult is returned on success or when the key was already processed.
type TransferResult struct {
	TxID      int64
	Duplicate bool
}

// Transfer executes a bank transfer with:
//   - Idempotency (safe retry on network timeout)
//   - Savepoint for intermediate rollback demo
//   - Explicit row-level locking (SELECT FOR UPDATE)
//   - Automatic retry on serialization failure
func Transfer(ctx context.Context, db *sql.DB, req TransferRequest) (*TransferResult, error) {
	const maxRetries = 3
	var result *TransferResult
	var err error

	for attempt := 0; attempt < maxRetries; attempt++ {
		result, err = execTransfer(ctx, db, req)
		if err == nil {
			return result, nil
		}
		// Retry only on serialization / deadlock errors (Postgres codes 40001, 40P01).
		if isRetryable(err) {
			backoff := time.Duration(attempt+1) * 50 * time.Millisecond
			log.Printf("transfer attempt %d failed (retryable): %v — retrying in %v", attempt+1, err, backoff)
			time.Sleep(backoff)
			continue
		}
		return nil, err // non-retryable: constraint violation, insufficient funds, etc.
	}
	return nil, fmt.Errorf("transfer failed after %d retries: %w", maxRetries, err)
}

func execTransfer(ctx context.Context, db *sql.DB, req TransferRequest) (*TransferResult, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback() // always rollback on error; no-op if already committed
		}
	}()

	// --- Idempotency check (atomic with the transfer) ---
	var existingTxID int64
	idempErr := tx.QueryRowContext(ctx,
		"SELECT id FROM transfers WHERE idempotency_key = $1", req.IdempotencyKey,
	).Scan(&existingTxID)
	if idempErr == nil {
		_ = tx.Rollback()
		return &TransferResult{TxID: existingTxID, Duplicate: true}, nil
	}
	if !errors.Is(idempErr, sql.ErrNoRows) {
		return nil, fmt.Errorf("idempotency lookup: %w", idempErr)
	}

	// --- Lock both accounts in consistent order (lower ID first) to prevent deadlock ---
	from, to := req.FromAccount, req.ToAccount
	if from > to {
		from, to = to, from
	}
	var fromBal, toBal int64
	if err = tx.QueryRowContext(ctx,
		"SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", from,
	).Scan(&fromBal); err != nil {
		return nil, fmt.Errorf("lock account %d: %w", from, err)
	}
	if err = tx.QueryRowContext(ctx,
		"SELECT balance FROM accounts WHERE id = $1 FOR UPDATE", to,
	).Scan(&toBal); err != nil {
		return nil, fmt.Errorf("lock account %d: %w", to, err)
	}

	// Re-assign after lock so fromBal is always the sender's balance.
	if req.FromAccount > req.ToAccount {
		fromBal, toBal = toBal, fromBal
	}

	// --- Savepoint before balance mutation (demo: could partial-retry here) ---
	if _, err = tx.ExecContext(ctx, "SAVEPOINT before_debit"); err != nil {
		return nil, fmt.Errorf("savepoint: %w", err)
	}

	if fromBal < req.Amount {
		_, _ = tx.ExecContext(ctx, "ROLLBACK TO SAVEPOINT before_debit")
		return nil, fmt.Errorf("insufficient funds: balance %d, need %d", fromBal, req.Amount)
	}

	// --- Atomicity: both updates must succeed or neither commits ---
	if _, err = tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance - $1 WHERE id = $2", req.Amount, req.FromAccount,
	); err != nil {
		return nil, fmt.Errorf("debit: %w", err)
	}
	if _, err = tx.ExecContext(ctx,
		"UPDATE accounts SET balance = balance + $1 WHERE id = $2", req.Amount, req.ToAccount,
	); err != nil {
		return nil, fmt.Errorf("credit: %w", err)
	}

	// --- Write transfer record (idempotency key stored atomically) ---
	var txID int64
	if err = tx.QueryRowContext(ctx,
		\`INSERT INTO transfers (idempotency_key, from_account, to_account, amount, created_at)
		 VALUES ($1, $2, $3, $4, now()) RETURNING id\`,
		req.IdempotencyKey, req.FromAccount, req.ToAccount, req.Amount,
	).Scan(&txID); err != nil {
		return nil, fmt.Errorf("insert transfer record: %w", err)
	}

	// --- Release savepoint (makes the debit permanent within this tx) ---
	if _, err = tx.ExecContext(ctx, "RELEASE SAVEPOINT before_debit"); err != nil {
		return nil, fmt.Errorf("release savepoint: %w", err)
	}

	// --- Durability: COMMIT flushes WAL; data survives any subsequent crash ---
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return &TransferResult{TxID: txID, Duplicate: false}, nil
}

// isRetryable returns true for PostgreSQL serialization failure (40001)
// and deadlock detected (40P01).
func isRetryable(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return contains(msg, "40001") || contains(msg, "40P01") ||
		contains(msg, "serialization failure") || contains(msg, "deadlock detected")
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && containsHelper(s, sub))
}
func containsHelper(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func main() {
	db, err := sql.Open("postgres", "host=localhost dbname=bank sslmode=disable")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	result, err := Transfer(context.Background(), db, TransferRequest{
		IdempotencyKey: "txn-uuid-abc123",
		FromAccount:    42,
		ToAccount:      99,
		Amount:         50000, // $500.00
	})
	if err != nil {
		log.Fatalf("transfer error: %v", err)
	}
	if result.Duplicate {
		fmt.Printf("duplicate request — original txID=%d\\n", result.TxID)
	} else {
		fmt.Printf("transfer committed — txID=%d\\n", result.TxID)
	}
}`,
      notes: "Uses Serializable isolation + SELECT FOR UPDATE with consistent lock ordering to prevent deadlocks. Savepoint demonstrates partial rollback. Idempotency key stored atomically with the transfer row — safe for client retry. Retry loop handles serialization failures (40001) and deadlocks (40P01) with exponential backoff. tx.Rollback() in defer is a no-op after Commit, so it is safe to always call."
    },

    interview: [
      {
        question: "Explain each ACID property with a real production example.",
        answer: "Atomicity means all-or-nothing: a bank transfer that debits account A and credits account B either does both or neither — a mid-transaction crash leaves zero visible changes. Consistency means the database moves between valid states: a CHECK constraint preventing negative inventory is a consistency rule; any transaction that violates it aborts entirely. Isolation means concurrent transactions don't see each other's dirty intermediate state: two users booking the last seat each see a consistent view until one commits, at which point the other's locking read detects the conflict. Durability means a committed transaction survives power loss: PostgreSQL flushes WAL to disk before acknowledging COMMIT, so crash recovery can replay every committed change.",
        followUps: [
          "Which ACID property is hardest to maintain in a distributed system and why?",
          "How does each property map to a specific database mechanism (WAL, MVCC, locks, constraints)?",
          "Can you have C without A? What breaks?"
        ]
      },
      {
        question: "What are the four SQL isolation levels and what anomalies does each prevent?",
        answer: "READ UNCOMMITTED allows dirty reads (seeing uncommitted data from another transaction) — almost never used in production because it can read rows that subsequently roll back. READ COMMITTED prevents dirty reads but allows non-repeatable reads (the same SELECT returns different values within one transaction if another transaction commits between reads) — this is PostgreSQL's default and suitable for most OLTP. REPEATABLE READ prevents dirty and non-repeatable reads but theoretically allows phantom reads (new rows appearing in a range query) — PostgreSQL's MVCC snapshot also prevents phantoms here. SERIALIZABLE prevents all anomalies by detecting serialization cycles; it's the safest level but increases abort rates by 30–50% under high write concurrency.",
        followUps: [
          "What is a phantom read? Give a concrete ticketing example.",
          "Why does PostgreSQL's REPEATABLE READ prevent phantoms when the SQL standard says it doesn't have to?",
          "When would you choose READ COMMITTED over SERIALIZABLE in a payment system?"
        ]
      },
      {
        question: "What is a dirty read and how does READ COMMITTED prevent it?",
        answer: "A dirty read occurs when transaction T2 reads a row that T1 has modified but not yet committed; if T1 later rolls back, T2 has acted on data that never officially existed. Under READ UNCOMMITTED, T2 sees T1's in-progress writes immediately. READ COMMITTED prevents this by using MVCC: T2's SELECT sees only the latest committed version of each row, ignoring any row versions with an uncommitted xmin. In PostgreSQL, every statement under READ COMMITTED takes a fresh snapshot at statement start, so it never sees uncommitted writes from other transactions.",
        followUps: [
          "If dirty reads are so dangerous why does READ UNCOMMITTED exist at all?",
          "How does MVCC's xmin/xmax mechanism prevent dirty reads without taking shared locks?",
          "Can a dirty read cause a financial system to send money to the wrong account? Walk through the scenario."
        ]
      },
      {
        question: "How does Two-Phase Commit (2PC) work and what is its key weakness?",
        answer: "2PC coordinates an atomic commit across multiple participants (database nodes, message brokers). In Phase 1 (Prepare), the coordinator sends Prepare to all participants; each writes its intent to its local WAL and responds Yes or No. In Phase 2 (Commit), if all said Yes the coordinator writes a global Commit record to its own WAL and instructs participants to commit; if any said No it instructs all to abort. The critical weakness is the blocking problem: if the coordinator crashes after all participants prepared but before it sends Commit, participants hold locks indefinitely waiting for the coordinator to recover — the system is stuck until manual intervention or coordinator restart. This makes 2PC fragile in cloud environments where coordinators can be evicted by the scheduler.",
        followUps: [
          "How does Three-Phase Commit (3PC) attempt to solve the 2PC blocking problem?",
          "Why do most microservice architectures avoid 2PC in favor of Saga patterns?",
          "In PostgreSQL, which WAL record marks the global decision in a distributed 2PC scenario?"
        ]
      },
      {
        question: "What are distributed transactions and how do Sagas differ from 2PC?",
        answer: "A distributed transaction attempts to provide ACID guarantees across multiple independent databases or services. 2PC achieves this with blocking locks and a coordinator but introduces availability risk and high latency. The Saga pattern instead breaks the distributed transaction into a sequence of local ACID transactions, each publishing an event on commit; if a later step fails, previously committed steps are reversed via explicit compensating transactions (e.g., cancel_reservation). Sagas trade atomicity for availability: the system is eventually consistent rather than immediately consistent, and compensating logic must be idempotent and explicitly designed. Sagas are appropriate for long-running business processes; 2PC is appropriate for short, tight, same-datacenter multi-resource operations.",
        followUps: [
          "What is an orchestration saga vs a choreography saga?",
          "How do you make a compensating transaction idempotent?",
          "What happens if the compensating transaction itself fails?"
        ]
      },
      {
        question: "Compare optimistic locking and pessimistic locking — when would you use each?",
        answer: "Pessimistic locking acquires a database lock (SELECT FOR UPDATE) before reading data, preventing concurrent modification; it is appropriate when contention is high and conflicts are likely — e.g., booking the last item in a flash sale. It holds locks for the transaction duration, limiting throughput. Optimistic locking reads data without a lock, includes a version number in the update's WHERE clause (UPDATE ... WHERE id=? AND version=?), and checks affected row count; if 0 rows updated, the version was stale and the application retries. Optimistic locking is appropriate for low-contention scenarios like CMS edits or analytics dashboards where conflicts are rare — it is dramatically more scalable because no locks are held between read and write.",
        followUps: [
          "What happens under high contention with optimistic locking? How do you bound retry loops?",
          "Can you implement optimistic locking at the application level in Redis?",
          "How does Hibernate's @Version annotation map to the database version column?"
        ]
      },
      {
        question: "What is MVCC and how does it allow readers and writers to not block each other?",
        answer: "Multi-Version Concurrency Control stores multiple versions of each row. When a transaction updates row R, PostgreSQL inserts a new row version with xmin = current transaction ID and sets xmax on the old version. A concurrent reader's snapshot was taken at a specific LSN; it sees only versions where xmin is committed and less than its snapshot and xmax is either unset or committed after its snapshot. Because readers reference old versions and writers append new ones, reads never acquire locks and never block writes. The trade-off is dead tuple accumulation: old versions remain in the heap until VACUUM reclaims them, adding storage overhead and potential bloat under high update rates.",
        followUps: [
          "What is the VACUUM process and when does autovacuum fail to keep up?",
          "How does CockroachDB implement MVCC differently from PostgreSQL?",
          "What is transaction ID wraparound and why is it a catastrophic failure mode in PostgreSQL?"
        ]
      },
      {
        question: "What are savepoints and when would you use them in production?",
        answer: "A savepoint is a named marker within an active transaction to which you can partially roll back without aborting the entire transaction (SAVEPOINT sp1; ... ROLLBACK TO SAVEPOINT sp1; ... RELEASE SAVEPOINT sp1). They are useful in batch processing where you want to skip bad rows and continue the batch rather than lose all progress; in ORMs that simulate nested transactions via savepoints; and in long-running ETL jobs that checkpoint state every N rows to avoid reprocessing from the start on failure. Savepoints do not reduce WAL write amplification — every operation within the transaction still logs to WAL — but they reduce the cost of partial retries by avoiding a full transaction restart.",
        followUps: [
          "What is the difference between ROLLBACK TO SAVEPOINT and ROLLBACK?",
          "How does Django's atomic() decorator use savepoints for nested transactions?",
          "What happens to a savepoint if the outer transaction commits without explicitly releasing it?"
        ]
      },
      {
        question: "How does WAL (Write-Ahead Logging) guarantee durability?",
        answer: "WAL requires that every change be written to a sequential log file on durable storage before the corresponding data page is modified in the heap. On COMMIT, PostgreSQL calls fsync (or uses O_DIRECT) to guarantee the WAL record is persisted to disk before returning success to the client. On crash restart, the recovery process reads WAL from the last valid checkpoint, redoes all changes from committed transactions that hadn't yet reached the heap, and discards (via undo information) any in-flight transactions. This guarantees that a COMMIT acknowledgment means the data is durable even if shared_buffers was 100% dirty. The cost is mandatory sequential I/O on every commit, which is why synchronous_commit=off is a common tuning knob that trades durability for write latency.",
        followUps: [
          "What is the difference between synchronous_commit=on and off in PostgreSQL?",
          "How do WAL segments get archived for Point-In-Time Recovery (PITR)?",
          "What is a checkpoint and what happens if checkpoints are too infrequent?"
        ]
      },
      {
        question: "What is an idempotency key in the context of database transactions, and how do you implement it?",
        answer: "An idempotency key is a unique token the client generates per logical operation, stored atomically with the transaction result so that retries of the same operation (due to network timeouts, 5xx errors, client crashes) are safe. Implementation: the server begins a transaction, queries for the idempotency key in a \`transactions\` table, and if found, returns the cached result without re-executing the operation; if not found, it executes the operation and inserts the key + result atomically in the same commit. Because the key is written in the same ACID transaction as the side effect, there is no window where the effect happened but the key wasn't stored (or vice versa). Stripe, PayPal, and Braintree all expose idempotency keys as a first-class API concept for this reason.",
        followUps: [
          "What is the difference between idempotency and exactly-once delivery?",
          "How long should you retain idempotency keys? What are the storage implications?",
          "How do you handle idempotency for operations that must return different results on retry (e.g., random ID generation)?"
        ]
      }
    ],

    tradeoffs: {
      pros: [
        "Atomicity eliminates partial-update bugs: no application-level cleanup code needed for crash scenarios.",
        "Consistency constraints (FK, CHECK, UNIQUE) enforce invariants at the database layer — bugs in multiple app services cannot corrupt data.",
        "Isolation prevents entire classes of concurrency bugs (dirty reads, lost updates, phantom reads) without application-level coordination.",
        "Durability via WAL means zero data loss on commit — no need for application-level replication of write journals.",
        "Rollback support allows optimistic batch processing with automatic recovery on per-row failures via savepoints.",
        "Serializable isolation eliminates all read anomalies — correct behavior is guaranteed regardless of transaction interleaving.",
        "MVCC gives read consistency without locking — long-running analytical queries do not block OLTP writers.",
        "Idempotent transactions via unique keys make distributed retries safe — no double-charges, no double-bookings.",
        "Two-Phase Commit extends atomicity to heterogeneous systems — a single business transaction can span SQL DB + message broker + cache.",
        "Standardized semantics (SQL isolation levels, XA) allow switching database vendors without rewriting concurrency logic."
      ],
      cons: [
        "Serializable isolation increases abort rates 30–50% under write contention — requires application retry loops.",
        "Pessimistic locks (SELECT FOR UPDATE) create lock contention hotspots — a single popular row becomes a bottleneck.",
        "Two-Phase Commit is a blocking protocol — coordinator failure during Phase 2 leaves participants locked until recovery.",
        "XA transactions are 2–10× slower than local transactions due to coordinator round-trips and forced dual fsync.",
        "MVCC accumulates dead tuples requiring periodic VACUUM — missed vacuums cause table bloat and eventually transaction ID wraparound.",
        "Long-running transactions hold WAL segments open, preventing WAL recycling and causing disk exhaustion.",
        "Distributed sagas sacrifice atomicity for availability — compensating logic is complex and error-prone to implement correctly.",
        "READ COMMITTED (the common default) still allows non-repeatable reads — application logic that reads the same row twice may act on stale data.",
        "Synchronous WAL fsync on every commit adds 1–5 ms latency per write — unsuitable for high-throughput time-series or log ingestion.",
        "Strict serializability across microservices requires distributed coordination (2PC or Saga) — no free lunch for cross-service ACID."
      ],
      when: "Use full ACID transactions (Serializable or Repeatable Read) for financial systems, booking engines, inventory management, and any domain where partial updates cause real-world harm. Use READ COMMITTED + explicit SELECT FOR UPDATE for high-throughput OLTP where full serializability aborts are unacceptable. Use Saga pattern with compensating transactions for cross-service business processes in microservice architectures. Use eventual consistency + idempotent operations for high-scale write paths (logging, analytics, time-series) where strict ACID would be a throughput bottleneck."
    },

    gotchas: [
      "**Long transactions block VACUUM**: A transaction open for hours prevents PostgreSQL from vacuuming dead tuples, causing table bloat. Always set statement_timeout and idle_in_transaction_session_timeout.",
      "**Forgetting to handle serialization failures**: SERIALIZABLE isolation can abort your transaction with error code 40001. If your application does not retry, users see cryptic errors. Always wrap serializable transactions in a retry loop.",
      "**Lock ordering and deadlocks**: Two transactions acquiring locks on the same rows in different orders will deadlock. Always acquire locks in a consistent global order (e.g., lower primary key first). PostgreSQL detects deadlocks and aborts one transaction, but the application must retry.",
      "**Savepoint not released = memory leak**: Savepoints that are rolled back to but never released hold memory in the transaction's undo log for the transaction's lifetime. Always RELEASE SAVEPOINT after you no longer need it.",
      "**Idempotency key not stored atomically**: If you write the side effect first and then store the idempotency key in a separate transaction, a crash between the two leaves the operation completed but unrecorded — the next retry re-executes the side effect. Always store the key and the effect in the same COMMIT.",
      "**Assuming autocommit is off**: Go's database/sql runs in autocommit mode by default — each Exec/Query is its own transaction. Call db.BeginTx() explicitly for multi-statement atomicity.",
      "**2PC coordinator SPOF**: In a manual 2PC setup, the coordinator is a single point of failure. In production, use a coordinator with durable WAL-backed state (PostgreSQL prepared transactions, or a distributed transaction manager like Atomikos) — not an in-memory coordinator that loses state on restart.",
      "**Ignoring tx.Rollback() on error**: Forgetting to call Rollback() leaks the database connection back to the pool in an open-transaction state. Always defer a Rollback() — it is a no-op after Commit() succeeds."
    ],

    visual: function(mount) {
      mount.innerHTML = "";
      var container = document.createElement("div");
      container.style.cssText = "padding:24px;font-family:'JetBrains Mono',monospace;background:#0d1117;border-radius:12px;color:#e6edf3;";

      var title = document.createElement("div");
      title.style.cssText = "font-size:14px;font-weight:700;color:#58a6ff;margin-bottom:20px;letter-spacing:1px;";
      title.textContent = "ACID TRANSACTION — BANK TRANSFER SIMULATION";
      container.appendChild(title);

      var steps = [
        { label: "BEGIN TRANSACTION", color: "#58a6ff", desc: "Isolation level: SERIALIZABLE. Snapshot taken." },
        { label: "SELECT ... FOR UPDATE (A)", color: "#f0883e", desc: "Lock account A. Balance: $1,000. Row locked." },
        { label: "SELECT ... FOR UPDATE (B)", color: "#f0883e", desc: "Lock account B. Balance: $200. Row locked." },
        { label: "SAVEPOINT before_debit", color: "#bc8cff", desc: "Checkpoint before balance mutation." },
        { label: "UPDATE A balance = $500", color: "#3fb950", desc: "Atomicity: debit applied in memory, not visible yet." },
        { label: "UPDATE B balance = $700", color: "#3fb950", desc: "Atomicity: credit applied in memory, not visible yet." },
        { label: "INSERT INTO transfers", color: "#3fb950", desc: "Idempotency key stored atomically with transfer." },
        { label: "RELEASE SAVEPOINT", color: "#bc8cff", desc: "Savepoint freed. Debit is now permanent within tx." },
        { label: "COMMIT + WAL fsync", color: "#238636", desc: "Durability: WAL flushed. Locks released. Visible to all." }
      ];

      var current = 0;
      var playing = false;
      var timer = null;

      var timeline = document.createElement("div");
      timeline.style.cssText = "display:flex;flex-direction:column;gap:8px;margin-bottom:20px;";
      container.appendChild(timeline);

      var desc = document.createElement("div");
      desc.style.cssText = "padding:12px 16px;background:#161b22;border-radius:8px;font-size:12px;color:#8b949e;min-height:40px;border-left:3px solid #58a6ff;";
      desc.textContent = "Press Play to simulate a $500 transfer from Account A to Account B.";
      container.appendChild(desc);

      function renderSteps() {
        timeline.innerHTML = "";
        steps.forEach(function(step, i) {
          var row = document.createElement("div");
          var active = i === current;
          var done = i < current;
          row.style.cssText = "display:flex;align-items:center;gap:12px;padding:8px 12px;border-radius:6px;transition:all 0.3s;background:" +
            (active ? "#1c2128" : "transparent") + ";border:1px solid " +
            (active ? step.color : (done ? "#238636" : "#30363d")) + ";";

          var dot = document.createElement("div");
          dot.style.cssText = "width:10px;height:10px;border-radius:50%;flex-shrink:0;background:" +
            (done ? "#238636" : (active ? step.color : "#30363d")) + ";";
          row.appendChild(dot);

          var lbl = document.createElement("div");
          lbl.style.cssText = "font-size:11px;font-weight:" + (active ? "700" : "400") + ";color:" +
            (active ? step.color : (done ? "#3fb950" : "#484f58")) + ";flex:1;";
          lbl.textContent = step.label;
          row.appendChild(lbl);

          if (active) {
            desc.textContent = step.desc;
            desc.style.borderLeftColor = step.color;
          }
          timeline.appendChild(row);
        });
      }

      var controls = document.createElement("div");
      controls.style.cssText = "display:flex;gap:10px;margin-top:16px;";

      function makeBtn(label, color, onClick) {
        var btn = document.createElement("button");
        btn.textContent = label;
        btn.style.cssText = "padding:6px 16px;background:" + color + ";color:#0d1117;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;";
        btn.addEventListener("click", onClick);
        return btn;
      }

      var playBtn = makeBtn("▶ Play", "#58a6ff", function() {
        if (playing) return;
        playing = true;
        timer = setInterval(function() {
          if (current < steps.length - 1) {
            current++;
            renderSteps();
          } else {
            clearInterval(timer);
            playing = false;
            desc.textContent = "✓ COMMITTED. WAL flushed to disk. Transfer durable. Locks released.";
            desc.style.borderLeftColor = "#238636";
          }
        }, 900);
      });

      var stepBtn = makeBtn("→ Step", "#f0883e", function() {
        if (current < steps.length - 1) { current++; renderSteps(); }
      });

      var resetBtn = makeBtn("↺ Reset", "#30363d", function() {
        clearInterval(timer);
        playing = false;
        current = 0;
        renderSteps();
        desc.textContent = "Press Play to simulate a $500 transfer from Account A to Account B.";
        desc.style.borderLeftColor = "#58a6ff";
      });

      controls.appendChild(playBtn);
      controls.appendChild(stepBtn);
      controls.appendChild(resetBtn);
      container.appendChild(controls);

      renderSteps();
      mount.appendChild(container);
    }
  };
  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
