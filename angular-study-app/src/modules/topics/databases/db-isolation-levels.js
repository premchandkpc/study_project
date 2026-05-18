(function() {
  var topic = {
    id: "db-isolation-levels",
    area: "databases",
    title: "Isolation Levels",
    tag: "Concurrency",
    tags: ["isolation","read-uncommitted","read-committed","repeatable-read","serializable","phantom-read","dirty-read","mvcc"],

    concept: `## Database Isolation Levels

Isolation is the **I** in ACID. It controls how concurrent transactions see each other's intermediate state.
Higher isolation = fewer anomalies, but more contention and lower throughput.

---

### The 4 ANSI SQL Isolation Levels

---

#### 1. READ UNCOMMITTED (lowest)

**What it allows:** A transaction can read rows modified by another transaction that has NOT yet committed.

**Anomalies prevented:** None.
**Anomalies possible:** Dirty read, Non-repeatable read, Phantom read, Serialization anomaly.

**How it works (locks):**
- Writers take short-duration write locks.
- Readers take NO read locks at all — they bypass all locking.
- A reader can see a row mid-modification before the writer commits or rolls back.

**How it works (MVCC):**
- Almost no real MVCC system uses this; it would have to expose the "current" in-progress version.
- PostgreSQL does not truly implement READ UNCOMMITTED — it silently upgrades it to READ COMMITTED.

**Real-world examples:**
1. Analytics dashboard showing a bank balance of -$500 because a debit transaction hasn't finished yet.
2. Cache warm-up reading half-written product catalog rows.
3. Fraud scoring reading an in-flight transfer that will be rolled back.
4. Reporting job counting orders that will never commit.
5. A/B test bucketing reading a partially-inserted user record.
6. Inventory count showing ghost stock about to be cancelled.
7. Leader board showing a score that gets rolled back seconds later.
8. ETL pipeline exporting rows that disappear on rollback, causing broken foreign keys downstream.
9. Recommendation engine training on uncommitted click events.
10. Billing job computing charges on an incomplete usage record.

**When to use:** Rarely. Acceptable only for coarse approximate analytics where stale/wrong data is tolerable and throughput is paramount (e.g., real-time approximate counters).

---

#### 2. READ COMMITTED (default in PostgreSQL, Oracle)

**What it prevents:** Dirty reads.
**Anomalies still possible:** Non-repeatable read, Phantom read, Write skew, Lost update.

**How it works (locks):**
- Readers take short-duration read locks, released immediately after each row is read.
- Writers hold write locks until commit.
- Because read locks are released quickly, a second read of the same row in the same transaction can see a different committed value.

**How it works (MVCC — PostgreSQL):**
- Each statement sees a fresh snapshot of committed data as of the moment that statement starts.
- A long-running transaction will see different snapshots for each of its statements.
- No read locks needed; writers never block readers.

**Real-world examples:**
1. Reading an account balance twice in the same transaction: first read sees $1000, a concurrent transfer commits, second read sees $800 — non-repeatable read.
2. Counting rows in a table before and after a batch insert — counts differ.
3. Report computes SUM(revenue) over two statements; rows committed between statements skew the total.
4. Shopping cart reads item price, concurrent admin updates price before checkout — price mismatch.
5. Two users both read available seats = 1, both book — double booking possible.
6. Audit job reads user state, user updates between two audit reads — inconsistent snapshot.
7. Pagination: row deleted between page 1 and page 2 fetch — row is skipped entirely.
8. Deduplication check reads no duplicate, concurrent insert commits duplicate before check completes.
9. Token validation reads token valid, concurrent revoke commits before token is used.
10. Dashboard widget reads metric from two tables in separate queries — one sees new data, other sees old data.

**When to use:** Default for OLTP workloads where individual statement consistency is sufficient. Good for high concurrency applications that can tolerate per-statement snapshot inconsistency.

---

#### 3. REPEATABLE READ (default in MySQL InnoDB)

**What it prevents:** Dirty reads, Non-repeatable reads.
**Anomalies still possible:** Phantom reads (in lock-based systems; MVCC snapshot prevents most phantom reads too), Write skew, Lost update.

**How it works (locks):**
- Readers hold shared locks on all rows they read until end of transaction.
- Writers hold write locks until commit.
- Prevents another transaction from modifying read rows until reader commits.
- Phantoms still possible because new rows can be inserted into the scanned range — no predicate lock.

**How it works (MVCC — PostgreSQL, MySQL InnoDB):**
- Transaction takes a single snapshot at transaction start; all statements use that same snapshot.
- New committed inserts by other transactions are invisible within the current transaction.
- MySQL InnoDB adds gap locks on range scans to prevent phantom inserts even at this level.
- PostgreSQL REPEATABLE READ with MVCC naturally prevents most phantoms via snapshot; MySQL uses gap locks.

**Real-world examples:**
1. Generating a consistent financial report — all rows reflect state at transaction start.
2. Exporting a consistent backup snapshot without blocking writers (MVCC flavor).
3. Long-running analytics query sees a stable dataset throughout execution.
4. Computing account summary across multiple tables — all see same point-in-time.
5. Fraud detection reading multiple tables for same transaction — no mid-read inconsistency.
6. MySQL: range scan with gap locks prevents phantom rows being inserted mid-scan.
7. Read-heavy dashboards that need consistency across multiple queries.
8. Distributed report that joins two tables — both see same committed state.
9. Conflict detection in a reservation system reading slots multiple times.
10. Data migration that reads and writes based on a stable view of source table.

**Write skew still possible example:**
Two doctors both read "at least 1 doctor on call", both decide to go off-call — now 0 doctors on call. Neither modified the same row; each saw the consistent snapshot but made a collectively inconsistent decision.

**When to use:** When a single transaction needs a consistent view across multiple queries/tables. Standard choice for long-running reads, reporting, and data exports.

---

#### 4. SERIALIZABLE (strictest)

**What it prevents:** All anomalies — dirty read, non-repeatable read, phantom read, write skew, serialization anomaly.
**Anomalies possible:** None (by definition).

**How it works (lock-based — traditional):**
- Two-Phase Locking (2PL) with predicate locks.
- Shared locks on all rows read, exclusive locks on all rows written, both held until commit.
- Range/predicate locks prevent phantom inserts.
- High contention; transactions serialized via locking — concurrent throughput can drop severely.

**How it works (SSI — Serializable Snapshot Isolation, PostgreSQL ≥9.1):**
- Based on MVCC snapshot (like REPEATABLE READ) but adds conflict tracking.
- Tracks "rw-anti-dependencies": if T1 read something T2 will write, and T2 read something T1 will write — a cycle is detected.
- When a dangerous cycle is detected, one transaction is aborted with a serialization failure error.
- Application must retry aborted transactions.
- PostgreSQL SSI has much lower overhead than traditional 2PL serializable.

**How it works (MySQL InnoDB):**
- Uses 2PL with next-key locks (gap + record locks) on all reads.
- SELECT statements implicitly become SELECT ... LOCK IN SHARE MODE.
- Higher lock contention than SSI.

**Real-world examples:**
1. Bank transfer: debit account A, credit account B — must be truly atomic with no anomalies.
2. Seat reservation: exactly one ticket sold per seat even under high concurrency.
3. Inventory decrement: prevent oversell under flash sale conditions.
4. Distributed ledger: all entries must be in a globally consistent order.
5. Token issuance: exactly one unique token per user signup, no duplicates.
6. Doctor on-call scheduling: enforce "at least 1 doctor always on call" constraint.
7. Slot allocation in distributed scheduler: no double-allocation.
8. Financial close: month-end aggregation must see fully consistent state.
9. Regulatory reporting: audit trail must be fully consistent, no phantom records.
10. Constraint enforcement across tables that triggers cannot safely cover.

---

### Anomaly Reference

#### Dirty Read
Reading uncommitted data from another transaction that may be rolled back.
**Example:** T2 reads T1's write; T1 rolls back; T2 acted on data that never existed.

#### Non-Repeatable Read
Reading the same row twice in one transaction and getting different values because a concurrent transaction committed a change between reads.
**Example:** T1 reads balance=$1000, T2 commits debit, T1 reads balance=$800.

#### Phantom Read
A re-execution of a query returns a different set of rows because a concurrent transaction inserted or deleted rows matching the query predicate.
**Example:** T1 counts rows WHERE status='pending'=5, T2 inserts a new pending row and commits, T1 re-counts and gets 6.

#### Write Skew
Two transactions each read an overlapping set, make decisions based on what they read, and write to non-overlapping rows — resulting in a state that violates a constraint neither violated individually.
**Example:** On-call doctors: T1 reads {Alice=on-call, Bob=on-call}, T2 reads same. T1 sets Alice=off-call, T2 sets Bob=off-call. Now 0 doctors on call — a constraint violation no single transaction violated.

#### Lost Update
Two transactions read the same value, both compute a new value, both write — one write is lost.
**Example:** T1 reads counter=10, T2 reads counter=10, T1 writes 11, T2 writes 11. One increment was lost.

#### Serialization Anomaly
The result of a group of transactions cannot be produced by any serial (one-at-a-time) ordering of those transactions.

---

### Comparison Table

| Isolation Level    | Dirty Read | Non-Repeatable Read | Phantom Read | Write Skew | Default In         |
|--------------------|:----------:|:-------------------:|:------------:|:----------:|-------------------|
| READ UNCOMMITTED   | Possible   | Possible            | Possible     | Possible   | —                 |
| READ COMMITTED     | Prevented  | Possible            | Possible     | Possible   | PostgreSQL, Oracle |
| REPEATABLE READ    | Prevented  | Prevented           | Possible*    | Possible   | MySQL InnoDB       |
| SERIALIZABLE       | Prevented  | Prevented           | Prevented    | Prevented  | —                 |

\\* MySQL InnoDB gap locks prevent most phantoms at REPEATABLE READ; PostgreSQL MVCC snapshot prevents read phantoms but write phantoms (insert then re-read) still possible without SERIALIZABLE.

---

### MVCC vs Lock-Based Implementation

| Aspect                  | Lock-Based (2PL)                          | MVCC (Snapshot)                             |
|-------------------------|-------------------------------------------|---------------------------------------------|
| Read blocks write?      | Yes (shared lock held)                    | No (readers never block writers)            |
| Write blocks read?      | Yes (exclusive lock held)                 | No (readers see old version)                |
| Phantom prevention      | Predicate/range locks                     | Snapshot (read) + gap locks or SSI (write)  |
| Overhead                | Lock manager, deadlock detection          | Version storage, garbage collection (VACUUM)|
| Deadlock possible?      | Yes                                       | Less common; SSI uses aborts instead        |
| Implementation examples | MySQL 2PL (Serializable), SQL Server      | PostgreSQL MVCC+SSI, Oracle, MySQL MVCC RR  |

---

### Setting Isolation Level (SQL)

\`\`\`sql
-- Per transaction
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
BEGIN;
  SELECT ...;
COMMIT;

-- Per session (PostgreSQL)
SET default_transaction_isolation = 'repeatable read';

-- Per session (MySQL)
SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;
\`\`\`
`,

    why: `## Why Isolation Levels Matter in Production

Choosing the wrong isolation level has caused real production incidents:

**1. Double-Booking (Hotel/Flight seats):**
READ COMMITTED allows two concurrent booking transactions to both read "1 seat available", both proceed, both insert a reservation — resulting in 2 bookings for 1 seat. Fix: SERIALIZABLE or SELECT FOR UPDATE at READ COMMITTED.

**2. Inventory Oversell (E-commerce flash sales):**
Two checkout transactions both read stock=1, both decrement to 0, both commit — stock goes to -1. REPEATABLE READ with MVCC doesn't help because writes aren't blocked. Fix: SELECT FOR UPDATE or optimistic locking with version column.

**3. Banking Balance Inconsistency:**
A transfer reads account A balance, concurrent deposit commits to A, transfer writes debit based on stale read — net balance incorrect. READ COMMITTED allows this non-repeatable read. Fix: REPEATABLE READ or SERIALIZABLE for financial transactions.

**4. Report Inconsistency During Writes:**
Monthly revenue report runs two SUM queries (one per table) at READ COMMITTED. A payment commits between the two queries — one table shows it, the other doesn't. Report total is wrong. Fix: REPEATABLE READ for all reporting transactions.

**5. Audit Log Gaps:**
Audit system reads user actions at READ COMMITTED. A transaction inserts an action and commits between two audit reads. First read misses it, second read sees it — audit trail appears to have a gap or duplicate. Fix: Single-snapshot read at REPEATABLE READ or SERIALIZABLE.

**6. Duplicate Processing (Message/Job queues):**
Worker 1 and Worker 2 both SELECT a pending job at READ COMMITTED, both see status='pending', both mark it processing — job runs twice. Fix: SELECT FOR UPDATE SKIP LOCKED, or atomic UPDATE ... RETURNING.

**7. Lost Update (Counters, like/vote counts):**
Two processes read count=100, both add 1, both write 101. Net result: 101 instead of 102 — one increment lost. Fix: Atomic UPDATE counter = counter + 1, or SELECT FOR UPDATE.

**8. Write Skew (On-call scheduling, constraint enforcement):**
Hospital system allows doctors to mark themselves off-call. Two doctors both see "2 on-call doctors", both decide they can safely go off-call — hospital ends up with 0 on-call doctors. REPEATABLE READ does not prevent this. Fix: SERIALIZABLE (SSI) or explicit application-level locking.

**9. Read Skew (Referential integrity violations):**
Migration script reads parent table for IDs, child table for foreign keys at READ COMMITTED with separate queries. A delete between reads leaves orphaned foreign key references in the exported data. Fix: REPEATABLE READ for migration/export transactions.

**10. Phantom Insert (Range queries):**
Capacity check reads "0 active sessions for user" (WHERE user_id=X), decides to create one. Concurrent transaction also passed the same check and inserted first. Now user has 2 active sessions. Fix: SERIALIZABLE, or SELECT ... FOR UPDATE on the user row to create an exclusive lock on the relevant key.
`,

    example: {
      language: "sql",
      code: `-- ============================================================
-- ISOLATION LEVEL ANOMALIES — CONCURRENT SESSION TIMELINE
-- ============================================================
-- Format: [Session A] and [Session B] interleaved by time
-- Run each block in order to reproduce each anomaly
-- ============================================================

-- ============================================================
-- SETUP
-- ============================================================
CREATE TABLE accounts (
    id      INT PRIMARY KEY,
    name    VARCHAR(50),
    balance NUMERIC(12,2)
);

CREATE TABLE seats (
    id      INT PRIMARY KEY,
    flight  VARCHAR(20),
    status  VARCHAR(20) DEFAULT 'available' -- 'available' | 'booked'
);

CREATE TABLE on_call (
    doctor  VARCHAR(50) PRIMARY KEY,
    active  BOOLEAN DEFAULT TRUE
);

INSERT INTO accounts VALUES (1, 'Alice', 1000.00), (2, 'Bob', 500.00);
INSERT INTO seats   VALUES (1, 'AA101', 'available');
INSERT INTO on_call VALUES ('Alice', TRUE), ('Bob', TRUE);

-- ============================================================
-- SCENARIO 1: DIRTY READ (READ UNCOMMITTED)
-- ============================================================
-- PostgreSQL silently upgrades RU to RC; this shows the concept.
-- In MySQL at READ UNCOMMITTED, Session B would see T1's uncommitted write.

-- [Session A] T=1: Begin, update balance
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED; -- MySQL: would allow dirty read
UPDATE accounts SET balance = balance - 500 WHERE id = 1; -- Alice: 1000 -> 500
-- NOT yet committed

-- [Session B] T=2: Try to read Alice's balance (at READ UNCOMMITTED in MySQL)
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- MySQL: returns 500  (dirty! T1 not committed)
-- PostgreSQL: returns 1000 (upgraded to RC, no dirty read)
COMMIT;

-- [Session A] T=3: ROLLBACK — the 500 debit never happened
ROLLBACK;
-- Session B acted on balance=500 which never existed. That is a dirty read.

-- ============================================================
-- SCENARIO 2: NON-REPEATABLE READ (READ COMMITTED)
-- ============================================================

-- [Session A] T=1: Begin long transaction, read Alice balance
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SELECT balance FROM accounts WHERE id = 1;
-- Returns: 1000.00

-- [Session B] T=2: Commit a transfer
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
UPDATE accounts SET balance = balance - 200 WHERE id = 1; -- Alice: 1000 -> 800
COMMIT; -- committed!

-- [Session A] T=3: Read Alice again IN THE SAME TRANSACTION
SELECT balance FROM accounts WHERE id = 1;
-- Returns: 800.00   <-- DIFFERENT! Non-repeatable read.
-- Session A saw two different values for the same row in one transaction.
COMMIT;

-- ============================================================
-- SCENARIO 3: PHANTOM READ (REPEATABLE READ — lock-based)
-- ============================================================

-- [Session A] T=1: Count available seats on AA101
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM seats WHERE flight = 'AA101' AND status = 'available';
-- Returns: 1

-- [Session B] T=2: Insert a new available seat for AA101
BEGIN;
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
INSERT INTO seats VALUES (2, 'AA101', 'available');
COMMIT;

-- [Session A] T=3: Re-count in same transaction
SELECT COUNT(*) FROM seats WHERE flight = 'AA101' AND status = 'available';
-- PostgreSQL REPEATABLE READ (MVCC): still returns 1  (snapshot)
-- MySQL InnoDB RR with gap locks: still returns 1     (gap lock blocks insert)
-- Lock-based RR without predicate locks: returns 2    (phantom!)
COMMIT;

-- ============================================================
-- SCENARIO 4: WRITE SKEW (REPEATABLE READ — on-call doctors)
-- ============================================================

-- Precondition: Alice=TRUE, Bob=TRUE (2 on-call doctors)

-- [Session A] T=1: Alice checks if she can go off-call
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM on_call WHERE active = TRUE;
-- Returns: 2  (safe to go off-call — 1 will remain)

-- [Session B] T=2: Bob checks simultaneously
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SELECT COUNT(*) FROM on_call WHERE active = TRUE;
-- Returns: 2  (Bob also sees 2 — each has their snapshot)

-- [Session A] T=3: Alice goes off-call (writes to her OWN row — no conflict detected)
UPDATE on_call SET active = FALSE WHERE doctor = 'Alice';
COMMIT;

-- [Session B] T=4: Bob goes off-call (writes to his OWN row — no conflict detected)
UPDATE on_call SET active = FALSE WHERE doctor = 'Bob';
COMMIT;

-- RESULT: SELECT COUNT(*) FROM on_call WHERE active = TRUE; -- Returns: 0 !!!
-- Both transactions were "correct" individually; together they violated the constraint.
-- REPEATABLE READ cannot prevent this. Only SERIALIZABLE can.

-- FIX using SERIALIZABLE:
-- [Session A] BEGIN; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- [Session A] SELECT COUNT(*) FROM on_call WHERE active = TRUE;   -- 2
-- [Session B] BEGIN; SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- [Session B] SELECT COUNT(*) FROM on_call WHERE active = TRUE;   -- 2
-- [Session A] UPDATE on_call SET active = FALSE WHERE doctor = 'Alice'; COMMIT;
-- [Session B] UPDATE on_call SET active = FALSE WHERE doctor = 'Bob';
-- PostgreSQL SSI detects the rw-anti-dependency cycle and aborts Session B
-- with: ERROR: could not serialize access due to read/write dependencies
-- Application retries Session B; now COUNT=1, so Bob stays on call.

-- ============================================================
-- SCENARIO 5: LOST UPDATE (parallel counters)
-- ============================================================

ALTER TABLE accounts ADD COLUMN login_count INT DEFAULT 0;

-- Both sessions read login_count = 5 for Alice
-- [Session A]: SELECT login_count FROM accounts WHERE id=1; -- 5
-- [Session B]: SELECT login_count FROM accounts WHERE id=1; -- 5
-- [Session A]: UPDATE accounts SET login_count = 6 WHERE id=1; COMMIT;
-- [Session B]: UPDATE accounts SET login_count = 6 WHERE id=1; COMMIT;
-- RESULT: login_count = 6, should be 7. One increment lost.

-- FIX — atomic update (no read):
UPDATE accounts SET login_count = login_count + 1 WHERE id = 1;

-- FIX — SELECT FOR UPDATE (pessimistic):
BEGIN;
SELECT login_count FROM accounts WHERE id = 1 FOR UPDATE; -- blocks other writers
UPDATE accounts SET login_count = login_count + 1 WHERE id = 1;
COMMIT;

-- FIX — Optimistic locking with version column:
ALTER TABLE accounts ADD COLUMN version INT DEFAULT 0;
-- Read: SELECT login_count, version FROM accounts WHERE id=1; -- {5, 3}
-- Write: UPDATE accounts SET login_count=6, version=4 WHERE id=1 AND version=3;
-- If rowcount=0, another writer won — retry.

-- ============================================================
-- CLEANUP
-- ============================================================
DROP TABLE accounts;
DROP TABLE seats;
DROP TABLE on_call;
`,
      notes: "Each scenario shows the exact interleaving of two concurrent sessions. Scenarios 1-3 demonstrate READ UNCOMMITTED/COMMITTED/REPEATABLE READ anomalies. Scenario 4 (write skew) is the most important production bug — only SERIALIZABLE (or explicit locking) prevents it. Scenario 5 shows lost update with three fix patterns. Run in PostgreSQL or MySQL to observe actual behavior differences."
    },

    interview: [
      {
        q: "What are the 4 ANSI SQL isolation levels and which anomalies does each prevent?",
        a: `The four levels in ascending strictness:

1. **READ UNCOMMITTED** — prevents nothing. Allows dirty reads, non-repeatable reads, phantom reads, write skew.
2. **READ COMMITTED** — prevents dirty reads only. Still allows non-repeatable reads, phantoms, write skew.
3. **REPEATABLE READ** — prevents dirty reads and non-repeatable reads. May still allow phantom reads (in lock-based systems) and write skew.
4. **SERIALIZABLE** — prevents all anomalies including write skew and serialization anomalies.

The ANSI standard defines that higher levels must prevent all anomalies of lower levels plus additional ones. However, ANSI's list is incomplete — it misses write skew and lost update, which are prevented only at SERIALIZABLE. Key insight: READ COMMITTED is the PostgreSQL default; REPEATABLE READ is the MySQL InnoDB default.`
      },
      {
        q: "What is the difference between MVCC-based and lock-based isolation?",
        a: `**Lock-based (2PL — Two-Phase Locking):**
- Readers acquire shared locks on rows they read, held until transaction end.
- Writers acquire exclusive locks, held until commit.
- Readers and writers block each other.
- Prevents anomalies by ensuring only one transaction accesses a resource at a time.
- Deadlocks are possible; requires deadlock detection/prevention.
- Higher contention under write-heavy workloads.

**MVCC (Multi-Version Concurrency Control):**
- Multiple versions of each row are maintained (e.g., PostgreSQL heap tuples with xmin/xmax).
- Readers see a consistent snapshot of committed data at a point in time — never the current in-progress version.
- Readers never block writers; writers never block readers.
- Implemented via snapshot timestamps (PostgreSQL transaction IDs, Oracle SCN).
- Requires garbage collection (PostgreSQL VACUUM) to clean up old versions.
- Write-write conflicts still cause blocking; only read-write conflicts are eliminated.

**PostgreSQL uses MVCC for all levels including SERIALIZABLE (SSI — Serializable Snapshot Isolation)**, which tracks rw-anti-dependency cycles and aborts transactions rather than using heavyweight predicate locks. This gives true serializability with much lower contention than 2PL.`
      },
      {
        q: "What is PostgreSQL's default isolation level and why?",
        a: `PostgreSQL defaults to **READ COMMITTED**. Each statement within a transaction sees a fresh snapshot of committed data as of the moment that statement begins. This provides protection against dirty reads while allowing maximum concurrency — readers never block writers and writers never block readers (MVCC).

The tradeoff: two statements in the same transaction can see different data if commits happen between them (non-repeatable read). For most OLTP workloads this is acceptable. When you need transaction-wide consistency, explicitly use \`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ\` or SERIALIZABLE.

PostgreSQL also ignores READ UNCOMMITTED — it silently upgrades it to READ COMMITTED since its MVCC architecture has no mechanism to expose uncommitted versions.`
      },
      {
        q: "What is MySQL InnoDB's default isolation level and how does it differ from PostgreSQL's default?",
        a: `MySQL InnoDB defaults to **REPEATABLE READ**. Key differences from PostgreSQL READ COMMITTED:

1. **Snapshot timing:** MySQL takes a snapshot at the start of the first read statement in the transaction. All subsequent reads in the transaction use that same snapshot — consistent view throughout the transaction.

2. **Gap locks:** MySQL InnoDB adds gap locks on range scans at REPEATABLE READ. This prevents phantom inserts into the scanned range, making MySQL's RR behavior closer to SERIALIZABLE for range queries — a unique hybrid.

3. **Statement-level vs transaction-level snapshot:** PostgreSQL READ COMMITTED gives each statement a fresh snapshot. MySQL REPEATABLE READ gives the whole transaction one snapshot.

Practical implication: A long-running MySQL transaction at RR will not see rows inserted by other transactions after it started. A PostgreSQL READ COMMITTED transaction will see new commits between its statements. For reporting and exports, MySQL's RR is naturally better; for OLTP where fresh data per statement is desired, PostgreSQL's RC is better.`
      },
      {
        q: "How does PostgreSQL implement SERIALIZABLE isolation (SSI)?",
        a: `PostgreSQL uses **Serializable Snapshot Isolation (SSI)**, introduced in PostgreSQL 9.1, based on the Cahill et al. research paper.

**Mechanism:**
- Transactions still operate on MVCC snapshots (like REPEATABLE READ) — readers don't block writers.
- The system tracks **rw-anti-dependencies**: if transaction T1 read a version that T2 will overwrite (T1 →rw T2), this is recorded.
- A **dangerous structure** (serialization failure condition) is a cycle in the dependency graph: T1 →rw T2 →rw T3 →rw T1 (or a shorter cycle).
- When such a cycle is detected, PostgreSQL aborts one of the transactions with: \`ERROR: could not serialize access due to read/write dependencies among transactions\`.
- The application must catch this error and retry the transaction.

**Why SSI is better than 2PL:**
- No predicate locks on every read — much lower overhead.
- Readers still never block writers.
- False positives are possible (a transaction aborted even though it would have been safe) but false negatives (missing a real conflict) never happen.
- PostgreSQL's SSI implementation uses SIReadLock tracking structures that are memory-bounded.

**Practical use:** Set \`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE\` and wrap transaction execution in retry logic for serialization failure errors.`
      },
      {
        q: "Explain write skew with a concrete example and how to prevent it.",
        a: `**Write skew** occurs when two transactions each read an overlapping dataset, make decisions based on what they read, then write to non-overlapping rows — resulting in a combined state that violates a constraint.

**Classic example — on-call doctors:**
\`\`\`
Constraint: At least 1 doctor must be on call at all times.
Initial state: Alice=on_call, Bob=on_call

T1 (Alice): SELECT COUNT(*) WHERE active=TRUE → 2  (safe to leave)
T2 (Bob):   SELECT COUNT(*) WHERE active=TRUE → 2  (safe to leave)
T1: UPDATE on_call SET active=FALSE WHERE doctor='Alice'; COMMIT;
T2: UPDATE on_call SET active=FALSE WHERE doctor='Bob';   COMMIT;
Result: 0 doctors on call. Constraint violated.
\`\`\`

Neither T1 nor T2 violated the constraint individually. They each wrote to DIFFERENT rows, so no write-write conflict is detected at REPEATABLE READ.

**Prevention options:**

1. **SERIALIZABLE isolation:** PostgreSQL SSI detects the rw-anti-dependency cycle and aborts one transaction. Best approach.

2. **SELECT FOR UPDATE on the shared resource:** Lock ALL on-call rows at read time, preventing concurrent modification until one transaction commits.
\`\`\`sql
SELECT COUNT(*) FROM on_call WHERE active=TRUE FOR UPDATE;
\`\`\`

3. **Materializing the conflict:** Add a single "on_call_lock" row and lock it explicitly — turns the write skew into a detectable write-write conflict.

4. **Application-level locking:** Use Redis SETNX or a DB advisory lock (\`pg_advisory_xact_lock\`) to serialize the check-and-act operation.`
      },
      {
        q: "What is a lost update and what are the three ways to prevent it?",
        a: `**Lost update:** Two transactions read the same value, independently compute an update, and both write — one write overwrites the other.

\`\`\`
T1: READ counter = 100
T2: READ counter = 100
T1: WRITE counter = 101; COMMIT
T2: WRITE counter = 101; COMMIT   ← T1's increment is lost
Result: 101, should be 102
\`\`\`

This is not prevented by REPEATABLE READ because both transactions successfully write different rows — no write-write conflict is raised on the same version.

**Three prevention methods:**

1. **Atomic update (best for simple cases):**
\`\`\`sql
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
\`\`\`
The database executes the read and write atomically. No application-level read needed.

2. **Pessimistic locking — SELECT FOR UPDATE:**
\`\`\`sql
BEGIN;
SELECT balance FROM accounts WHERE id=1 FOR UPDATE;  -- exclusive lock
UPDATE accounts SET balance = balance - 100 WHERE id=1;
COMMIT;
\`\`\`
T2's SELECT FOR UPDATE blocks until T1 commits, then reads the fresh value.

3. **Optimistic locking — version column:**
\`\`\`sql
-- Read: SELECT balance, version FROM accounts WHERE id=1 → {1000, 5}
-- Write:
UPDATE accounts SET balance=900, version=6 WHERE id=1 AND version=5;
-- If 0 rows updated, another writer won — retry the transaction
\`\`\`
No DB locks held during think time; conflict detected at write time. Better for high read/write ratios with low actual conflict rates.`
      },
      {
        q: "What is SELECT FOR UPDATE and when should you use it?",
        a: `**SELECT FOR UPDATE** acquires an exclusive row-level lock on all rows returned by the SELECT. Other transactions attempting to SELECT FOR UPDATE, UPDATE, or DELETE those rows will block until the lock is released (at commit/rollback).

**Syntax variations:**
\`\`\`sql
SELECT ... FOR UPDATE;              -- block on locked rows
SELECT ... FOR UPDATE SKIP LOCKED;  -- skip already-locked rows (job queues)
SELECT ... FOR UPDATE NOWAIT;       -- fail immediately if locked
SELECT ... FOR SHARE;               -- shared lock (block writers, not readers)
\`\`\`

**When to use:**
1. **Check-then-act patterns:** Read a value and make a decision that depends on that value remaining unchanged.
   - Read available inventory, decide to decrement → lock the product row first.
2. **Preventing lost updates** when atomic UPDATE isn't expressive enough.
3. **Job queue consumers:** SELECT FOR UPDATE SKIP LOCKED efficiently distributes work without blocking — each consumer skips rows locked by others.
4. **Booking systems:** Lock the seat row before verifying and inserting a reservation.

**When NOT to use:**
- Long think times between SELECT and UPDATE — holding locks for seconds causes contention.
- Read-heavy workloads where actual conflicts are rare — optimistic locking is cheaper.
- Analytics/reporting — never use FOR UPDATE; use REPEATABLE READ or SERIALIZABLE instead.

**Key point:** FOR UPDATE works at READ COMMITTED level and above. At READ COMMITTED, it re-reads the locked row's latest committed version (important: if the row was updated while you waited for the lock, you see the new value, not your snapshot).`
      },
      {
        q: "Compare optimistic vs pessimistic concurrency control.",
        a: `**Pessimistic Concurrency Control:**
- Assume conflicts WILL happen; prevent them upfront with locks.
- Mechanism: SELECT FOR UPDATE, LOCK TABLE, advisory locks.
- Locks are held from read time to commit — other transactions block.
- Best when: Write conflicts are frequent, transactions are short, throughput is secondary to consistency.
- Problem: Deadlocks possible; long lock hold times hurt throughput; lock overhead even when no conflict occurs.

**Optimistic Concurrency Control (OCC):**
- Assume conflicts are RARE; proceed without locks; detect conflict at write time.
- Mechanism: Version column (or timestamp/hash) — read the version, update only if version unchanged.
\`\`\`sql
-- Read phase (no lock):
SELECT id, balance, version FROM accounts WHERE id=1;  -- {1, 1000, 7}

-- Write phase (atomic check-and-swap):
UPDATE accounts SET balance=900, version=8 WHERE id=1 AND version=7;
-- Check affected rows: 0 = conflict (retry), 1 = success
\`\`\`
- Best when: Read-heavy, writes rare, conflicts unlikely (e.g., user editing their own profile).
- Problem: Under high conflict rates, repeated retries degrade throughput worse than pessimistic locking; "thundering herd" on retries.

**Hybrid approach (common in practice):**
- Use OCC for user-facing operations (low conflict).
- Use SELECT FOR UPDATE SKIP LOCKED for job queues (guaranteed progress without retries).
- Use SERIALIZABLE for financial transactions (correctness paramount).`
      },
      {
        q: "What is read skew and how does it relate to isolation levels?",
        a: `**Read skew** is a broader term for the scenario where a transaction reads data that is internally inconsistent because it observes some rows from before a concurrent commit and other rows from after — a partial view of two states.

**Classic example — referential integrity during migration:**
\`\`\`
T1 (exporter): SELECT * FROM orders;          -- sees orders 1-100
  [T2 commits: DELETE FROM customers WHERE id=42; CASCADE deletes order 101]
T1 (exporter): SELECT * FROM customers;       -- misses customer 42
-- T1's export has orders referencing a customer that doesn't exist in its own snapshot
\`\`\`

**Another example — balance transfer inconsistency:**
\`\`\`
Accounts: A=1000, B=500, Total=1500
T2 commits: TRANSFER 200 from A to B → A=800, B=700

T1 reads A=1000 (before T2), then reads B=700 (after T2 commits)
T1 sees total = 1700  ← phantom money appeared
\`\`\`

**Isolation level fix:**
- READ COMMITTED allows read skew because each statement sees a new snapshot.
- REPEATABLE READ (MVCC) prevents read skew — the entire transaction uses one consistent snapshot, so all reads reflect the same point in time.
- Any use case requiring a consistent view across multiple queries/tables needs at least REPEATABLE READ.

**Production relevance:** Balance sheet reports, data exports, database migrations, integrity checks, audit snapshots — all require REPEATABLE READ or SERIALIZABLE to avoid read skew.`
      }
    ],

    tradeoffs: {
      pros: [
        "READ COMMITTED maximizes concurrency — readers never block writers (MVCC), highest throughput for OLTP.",
        "READ COMMITTED is sufficient for the vast majority of web application use cases where per-statement freshness is acceptable.",
        "REPEATABLE READ provides a consistent snapshot for the entire transaction — ideal for reporting, exports, and long reads without blocking writes.",
        "SERIALIZABLE (SSI in PostgreSQL) provides full correctness guarantees with lower overhead than traditional 2PL — safe for complex financial logic.",
        "MVCC-based isolation eliminates read-write contention entirely — readers and writers proceed in parallel regardless of isolation level.",
        "Lock-based isolation (SELECT FOR UPDATE) gives fine-grained control — lock exactly the rows you care about, release on commit.",
        "SERIALIZABLE prevents write skew by design — no need to manually identify and lock all rows involved in a constraint check.",
        "Isolation levels are per-transaction — you can use READ COMMITTED for high-frequency lookups and SERIALIZABLE only for critical financial operations in the same application.",
        "MySQL InnoDB REPEATABLE READ gap locks prevent most phantom scenarios automatically — less manual intervention needed.",
        "Optimistic locking (version columns) at READ COMMITTED achieves safe concurrent updates without DB-level locks — works across microservices and application layers."
      ],
      cons: [
        "SERIALIZABLE significantly reduces concurrency — more transactions aborted due to conflict detection, requiring retry logic in the application layer.",
        "REPEATABLE READ holds a snapshot for the full transaction duration — long transactions delay VACUUM (PostgreSQL) and can cause table bloat.",
        "SELECT FOR UPDATE creates lock contention hotspots — a single popular row (inventory for a best-selling item) can serialize all purchases through it.",
        "MVCC requires regular garbage collection (PostgreSQL VACUUM) — neglected VACUUM leads to table/index bloat, transaction ID wraparound risk.",
        "Optimistic locking causes retry storms under high contention — 100 threads all trying to update the same row all fail and retry, wasting CPU.",
        "READ COMMITTED allows non-repeatable reads — subtle bugs in business logic that reads the same row twice expecting consistency.",
        "Write skew is invisible at REPEATABLE READ — requires developer awareness and explicit locking or SERIALIZABLE; easy to miss in code review.",
        "Different databases implement the same ANSI level differently (MySQL RR with gap locks vs PostgreSQL RR with pure MVCC) — portability is an illusion.",
        "Higher isolation levels increase deadlock risk — two transactions each waiting for a lock the other holds, requiring automatic deadlock detection and rollback.",
        "PostgreSQL SSI serialization failures are non-deterministic — the application must implement retry logic, increasing complexity and testing burden."
      ],
      when: "Use READ COMMITTED (PostgreSQL default) for standard OLTP. Upgrade to REPEATABLE READ for any transaction that reads multiple rows/tables and must see a consistent snapshot (reports, exports, migrations). Use SERIALIZABLE for financial operations, constraint enforcement across rows, or any scenario involving check-then-act on shared state. Add SELECT FOR UPDATE for pessimistic locking on specific rows within READ COMMITTED. Use optimistic locking (version columns) when conflicts are rare and lock-free reads are preferred."
    },

    gotchas: [
      "PostgreSQL silently upgrades READ UNCOMMITTED to READ COMMITTED — code expecting dirty reads will not get them in Postgres. Always check the actual behavior of your target database.",
      "REPEATABLE READ does NOT prevent write skew. Two transactions can each read overlapping data, write to different rows, and produce a collectively invalid state. Only SERIALIZABLE (or explicit SELECT FOR UPDATE on ALL rows in the read set) prevents this.",
      "SELECT FOR UPDATE at READ COMMITTED re-reads the locked row's latest committed value when the lock is acquired — if another transaction updated the row while you waited for the lock, you see the NEW value, not your original snapshot. This is intentional but surprises many developers.",
      "PostgreSQL SERIALIZABLE uses SSI which may produce false-positive serialization failures — transactions that would have been safe are aborted anyway. Application retry logic is mandatory and must be tested under load.",
      "Long-running transactions at any isolation level in PostgreSQL prevent VACUUM from cleaning up old row versions (dead tuples). A transaction open for hours can cause table bloat, index bloat, and eventually transaction ID wraparound — a hard database crash. Always set statement_timeout and idle_in_transaction_session_timeout.",
      "MySQL InnoDB REPEATABLE READ with gap locks can cause unexpected lock contention on INSERT statements — an INSERT into a range that another transaction scanned will block until that transaction commits, even though it looks like an uncontested write. This surprises developers coming from PostgreSQL who expect MVCC to mean 'inserts never block'."
    ]
  };
  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
