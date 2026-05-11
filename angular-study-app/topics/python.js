/* ===== Python curriculum — mentor-grade, topic-wise ===== */
window.PYTHON_TOPICS = [
  {
    id: "python-gil-concurrency",
    area: "python",
    title: "GIL, Threading, Multiprocessing & asyncio",
    tag: "Concurrency",
    tags: ["gil", "threading", "multiprocessing", "asyncio", "concurrent.futures"],
    concept:
`Python's **Global Interpreter Lock (GIL)** allows only one thread to execute Python bytecode at a time per interpreter process. This means:
- **CPU-bound** work: threads don't parallelize — use \`multiprocessing\` or \`ProcessPoolExecutor\`.
- **I/O-bound** work: threads release the GIL during I/O waits — \`ThreadPoolExecutor\` works fine.
- **asyncio**: single-threaded cooperative multitasking via an event loop. \`async/await\` switches on \`await\` points without the GIL overhead.
- **No-GIL Python (3.13 experimental)**: free-threaded build — watch this space.`,
    why:
`Misunderstanding the GIL is the #1 Python performance mistake in senior interviews. Running a CPU-bound task with threads gives you **single-core performance with multi-threading overhead**. The \`asyncio\` model gives massive I/O concurrency with a single thread — used in production at scale by AIOHTTP, FastAPI, and databases like asyncpg.`,
    example: {
      language: "python",
      code:
`import asyncio
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

# CPU-bound: runs in separate processes (bypasses GIL)
def cpu_heavy(n: int) -> int:
    return sum(i * i for i in range(n))

# I/O-bound: simulated with asyncio sleep
async def fetch(url: str, delay: float) -> str:
    await asyncio.sleep(delay)   # releases event loop; real: aiohttp.get(url)
    return f"got {url}"

async def main() -> None:
    # ── asyncio fan-out (I/O) ──────────────────────────────────────────────
    t0 = time.perf_counter()
    results = await asyncio.gather(
        fetch("https://a.example", 0.5),
        fetch("https://b.example", 0.3),
        fetch("https://c.example", 0.4),
    )
    print(f"async  : {results}  ({time.perf_counter()-t0:.2f}s)")
    # All 3 overlap → ~0.5s total, not 1.2s

    # ── CPU-bound: process pool ────────────────────────────────────────────
    loop = asyncio.get_running_loop()
    with ProcessPoolExecutor() as pool:
        t0 = time.perf_counter()
        r = await loop.run_in_executor(pool, cpu_heavy, 10_000_000)
        print(f"cpu    : {r}  ({time.perf_counter()-t0:.2f}s)")

    # ── Blocking I/O in threadpool (legacy libs) ───────────────────────────
    with ThreadPoolExecutor(max_workers=4) as pool:
        r2 = await loop.run_in_executor(pool, time.sleep, 0.1)

asyncio.run(main())`,
      notes: `Use \`asyncio.gather\` for concurrent coroutines. Use \`loop.run_in_executor(ProcessPoolExecutor())\` to run CPU-bound code without blocking the event loop. Never call blocking code directly in a coroutine.`
    },
    interview: [
      {
        question: "Why does Python have the GIL and how do you work around it for CPU-bound tasks?",
        answer:
`The GIL was introduced to simplify CPython's memory management (reference counting is not thread-safe without it). Workarounds: (1) **\`multiprocessing\`** — separate interpreter per process, no shared GIL; (2) **C extensions** like NumPy release the GIL during computation; (3) **asyncio** for I/O (not CPU); (4) experimental **no-GIL CPython 3.13** (PEP 703).`,
        followUps: ["What is the GIL release interval?", "How does NumPy parallelise without Python threads?"]
      },
      {
        question: "What's the difference between asyncio.gather and asyncio.wait?",
        answer:
`\`gather\` collects all results in order, raises on first exception by default (unless \`return_exceptions=True\`). \`wait\` returns two sets — done and pending — and gives you control over which exceptions to handle. Use \`gather\` for fan-out when you want all results; \`wait\` when you need first-completed or partial failure handling.`,
        followUps: ["How does asyncio.TaskGroup (3.11) compare?", "What is asyncio.shield?"]
      }
    ],
    tradeoffs: {
      pros: [
        "asyncio handles thousands of concurrent connections on a single thread.",
        "ProcessPoolExecutor gives true CPU parallelism with a familiar Future API.",
        "async/await syntax is readable and debuggable vs callback hell."
      ],
      cons: [
        "Mixing sync and async code requires careful bridge (run_in_executor).",
        "ProcessPoolExecutor has IPC overhead — not free for small tasks.",
        "Debugging async stack traces is harder than synchronous code."
      ],
      when: `**asyncio** for I/O-bound services (APIs, websockets, DB queries). **ProcessPoolExecutor** for CPU-bound work (ML inference, image processing). **ThreadPoolExecutor** only for blocking legacy I/O libraries that have no async counterpart.`
    }
  },

  {
    id: "python-decorators-metaclasses",
    area: "python",
    title: "Decorators, Descriptors & Metaclasses",
    tag: "Metaprogramming",
    tags: ["decorators", "descriptors", "metaclasses", "functools", "class"],
    concept:
`**Decorators** are callables that wrap functions or classes. \`@functools.wraps\` preserves \`__name__\`, \`__doc__\`.
**Descriptors** implement \`__get__\`, \`__set__\`, \`__delete__\` — used by \`property\`, \`classmethod\`, \`staticmethod\`, and ORMs.
**Metaclasses** are classes whose instances are classes (\`type\` is the default metaclass). They intercept class creation in \`__new__\` and \`__init_subclass__\`. Used by Django ORM, Pydantic, ABCs.
Python's data model connects all three via \`__dunder__\` methods.`,
    why:
`Framework code (FastAPI, SQLAlchemy, Pydantic) heavily uses these. As a senior engineer you need to **read and debug** metaclass-based ORMs, write reusable decorators that compose correctly, and understand why \`@property\` works the way it does. Metaclass ordering matters in MRO with multiple inheritance.`,
    example: {
      language: "python",
      code:
`import functools
import time
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec("P")
R = TypeVar("R")

# ── Decorator with arguments ───────────────────────────────────────────────
def retry(times: int = 3, delay: float = 0.1):
    def decorator(fn: Callable[P, R]) -> Callable[P, R]:
        @functools.wraps(fn)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            last_err: Exception | None = None
            for attempt in range(times):
                try:
                    return fn(*args, **kwargs)
                except Exception as e:
                    last_err = e
                    time.sleep(delay * (2 ** attempt))  # exp backoff
            raise RuntimeError(f"failed after {times} attempts") from last_err
        return wrapper
    return decorator

# ── Descriptor: typed attribute ────────────────────────────────────────────
class Positive:
    """Descriptor that enforces positive values."""
    def __set_name__(self, owner, name):
        self._name = f"_{name}"

    def __get__(self, obj, objtype=None):
        if obj is None: return self
        return getattr(obj, self._name, None)

    def __set__(self, obj, value):
        if value <= 0:
            raise ValueError(f"{self._name} must be positive, got {value}")
        setattr(obj, self._name, value)

# ── Metaclass: register subclasses ────────────────────────────────────────
class PluginMeta(type):
    registry: dict[str, type] = {}
    def __new__(mcs, name, bases, namespace):
        cls = super().__new__(mcs, name, bases, namespace)
        if bases:  # skip the base class itself
            PluginMeta.registry[name] = cls
        return cls

class Plugin(metaclass=PluginMeta): pass
class CSVPlugin(Plugin): pass
class JSONPlugin(Plugin): pass

# ── Usage ──────────────────────────────────────────────────────────────────
class Order:
    price = Positive()
    qty   = Positive()
    def __init__(self, price, qty):
        self.price, self.qty = price, qty

@retry(times=3, delay=0.05)
def call_api(url: str) -> str:
    raise ConnectionError("timeout")  # will retry 3 times

print(PluginMeta.registry)     # {'CSVPlugin': ..., 'JSONPlugin': ...}
try: call_api("http://x")
except RuntimeError as e: print(e)`,
      notes: `Use \`functools.wraps\` on every wrapper to preserve introspection. Prefer \`__init_subclass__\` over metaclasses for subclass registration — it's simpler and composable.`
    },
    interview: [
      {
        question: "What is the descriptor protocol and how does @property use it?",
        answer:
`A descriptor is any object that defines \`__get__\`, \`__set__\`, or \`__delete__\`. \`property\` is a built-in descriptor: when accessed on an instance, Python calls \`property.__get__(obj, type)\` which runs your getter function. This is why \`obj.x\` can run code. Non-data descriptors (only \`__get__\`) are overridden by instance \`__dict__\`; data descriptors (\`__get__\` + \`__set__\`) take priority.`,
        followUps: ["What is the MRO lookup order for attributes?", "How does classmethod use the descriptor protocol?"]
      },
      {
        question: "When would you use a metaclass vs __init_subclass__ vs a class decorator?",
        answer:
`**Metaclass**: when you need to intercept \`type.__new__\` — modifying the class dict before the class is created. **\`__init_subclass__\`** (Python 3.6+): when subclasses should register themselves or get defaults — simpler, composable. **Class decorator**: when you want to add/modify behavior post-creation — most readable for straightforward wrappers. Prefer \`__init_subclass__\` > class decorator > metaclass in that order.`,
        followUps: ["How do ABCs use metaclasses?", "What is __class_getitem__?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Decorators enable cross-cutting concerns (logging, retry, auth) without inheritance.",
        "Descriptors make ORM field validation invisible to users.",
        "Metaclasses allow DSLs (Django models, Pydantic) with minimal boilerplate."
      ],
      cons: [
        "Metaclass conflicts with multiple inheritance require careful MRO management.",
        "Stacked decorators can obscure what a function actually does.",
        "Heavy metaprogramming makes code hard to trace and debug."
      ],
      when: `Decorators for AOP concerns. Descriptors for reusable field validation. \`__init_subclass__\` for registry patterns. Metaclass only when \`__init_subclass__\` can't do the job.`
    }
  },

  {
    id: "python-type-hints-mypy",
    area: "python",
    title: "Type Hints, mypy & Structural Typing",
    tag: "Typing",
    tags: ["type hints", "mypy", "Protocol", "TypeVar", "Generic", "PEP 484"],
    concept:
`Python's type system (PEP 484+) is **gradual** — typed and untyped code coexist. Key constructs:
- **\`TypeVar\`** — generic placeholder: \`T = TypeVar("T")\`.
- **\`Generic[T]\`** — parameterize classes.
- **\`Protocol\`** — structural subtyping (duck-typing with type safety).
- **\`ParamSpec\`, \`Concatenate\`** — for decorator type correctness.
- **\`TypedDict\`, \`NamedTuple\`** — typed dict/tuple shapes.
- **\`Literal\`, \`Final\`, \`TypeGuard\`** — narrow types at specific values.
Python 3.12: \`type\` keyword for type aliases. Python 3.10+: \`X | Y\` union syntax.`,
    why:
`mypy + type hints catch an estimated 15% of production bugs at commit time with zero runtime cost. \`Protocol\` enables the same structural typing Go uses — depend on behavior, not class hierarchy. Type hints are also the foundation for FastAPI's automatic validation, Pydantic models, and IDE completion.`,
    example: {
      language: "python",
      code:
`from __future__ import annotations
from typing import TypeVar, Generic, Protocol, runtime_checkable
from collections.abc import Sequence

T = TypeVar("T")
K = TypeVar("K")
V = TypeVar("V")

# ── Protocol: structural subtyping ────────────────────────────────────────
@runtime_checkable
class Closeable(Protocol):
    def close(self) -> None: ...

def cleanup(resource: Closeable) -> None:
    resource.close()  # works with any object that has close()

# ── Generic class ─────────────────────────────────────────────────────────
class Result(Generic[T]):
    def __init__(self, value: T | None, error: Exception | None = None) -> None:
        self._value = value
        self._error = error

    @classmethod
    def ok(cls, value: T) -> Result[T]:
        return cls(value)

    @classmethod
    def err(cls, error: Exception) -> Result[T]:
        return cls(None, error)

    def unwrap(self) -> T:
        if self._error:
            raise self._error
        assert self._value is not None
        return self._value

# ── TypedDict for structured dicts ────────────────────────────────────────
from typing import TypedDict, NotRequired

class UserRecord(TypedDict):
    id: int
    name: str
    email: NotRequired[str]   # optional key (PEP 655)

def greet(user: UserRecord) -> str:
    return f"Hello {user['name']}"

# ── Overload for multiple signatures ──────────────────────────────────────
from typing import overload

@overload
def process(x: int) -> str: ...
@overload
def process(x: str) -> int: ...
def process(x):
    return str(x) if isinstance(x, int) else len(x)`,
      notes: `Use \`from __future__ import annotations\` (deferred evaluation) to allow forward references without quotes. Run mypy in strict mode (\`--strict\`) in CI for new code; gradually tighten existing code.`
    },
    interview: [
      {
        question: "What is the difference between Protocol and ABC?",
        answer:
`**ABC** (Abstract Base Class) uses nominal subtyping — a class must explicitly \`class Foo(ABC)\` or register with \`ABC.register()\`. **\`Protocol\`** uses structural subtyping — any class with the right methods satisfies the protocol, no inheritance needed. Protocol enables Go-style duck-typing with static type checking. Use Protocol when you don't control the implementing class.`,
        followUps: ["What is runtime_checkable?", "Can a Protocol extend another Protocol?"]
      },
      {
        question: "How do you type a decorator that preserves the wrapped function's signature?",
        answer:
`Use \`ParamSpec\` and \`TypeVar\`: \`P = ParamSpec("P"); R = TypeVar("R")\`, then \`def decorator(fn: Callable[P, R]) -> Callable[P, R]\`. Without \`ParamSpec\`, mypy infers the wrapper as \`Callable[..., R]\` — losing parameter names and types for callers. \`functools.wraps\` handles runtime metadata; \`ParamSpec\` handles static types.`,
        followUps: ["What is Concatenate?", "How do you type a class decorator?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Catches type errors at commit time — zero runtime overhead.",
        "Protocol enables structural typing without inheritance coupling.",
        "Types serve as machine-verified documentation."
      ],
      cons: [
        "Gradual typing: untyped third-party code creates Any holes.",
        "Complex generics (recursive types, HKTs) hit mypy limitations.",
        "Type stubs (.pyi) must be maintained for C extensions."
      ],
      when: `Enable mypy in CI for all new code. Use strict mode for new modules. Add types incrementally to legacy code — start with function signatures. Always type public APIs and library boundaries.`
    }
  },

  {
    id: "python-fastapi",
    area: "python",
    title: "FastAPI: Async REST, Dependency Injection & Pydantic",
    tag: "FastAPI",
    tags: ["fastapi", "pydantic", "async", "openapi", "dependency injection"],
    concept:
`**FastAPI** is a high-performance async web framework built on Starlette (ASGI) and Pydantic. Core features:
- **Type-driven validation**: Pydantic models for request/response bodies, query params, path params.
- **Automatic OpenAPI/Swagger docs** from type annotations.
- **Dependency Injection**: \`Depends()\` — scoped dependencies (request, session, auth).
- **Background tasks**: \`BackgroundTasks\` for fire-and-forget after response.
- **Lifecycle events**: \`@app.lifespan\` for startup/shutdown (DB pools, caches).`,
    why:
`FastAPI rivals Node.js and Go in I/O throughput benchmarks while keeping Python ergonomics. The killer feature is eliminating manual serialization — annotate once, get validation, OpenAPI docs, and editor completion for free. The DI system makes auth and DB sessions testable without monkeypatching.`,
    example: {
      language: "python",
      code:
`from contextlib import asynccontextmanager
from typing import Annotated
import asyncpg
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field, EmailStr

# ── Lifespan: manage DB pool ───────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool("postgresql://localhost/demo")
    yield
    await app.state.pool.close()

app = FastAPI(title="Order Service", lifespan=lifespan)

# ── Pydantic models ────────────────────────────────────────────────────────
class CreateOrder(BaseModel):
    user_email: EmailStr
    product_id: str
    quantity: int = Field(gt=0, le=100)

class OrderResponse(BaseModel):
    id: int
    status: str

# ── Dependencies ───────────────────────────────────────────────────────────
async def get_db(request) -> asyncpg.Connection:
    async with request.app.state.pool.acquire() as conn:
        yield conn  # scoped to request

DBConn = Annotated[asyncpg.Connection, Depends(get_db)]

async def verify_token(authorization: str = "") -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return authorization.removeprefix("Bearer ")

Token = Annotated[str, Depends(verify_token)]

# ── Endpoint ───────────────────────────────────────────────────────────────
@app.post("/orders", response_model=OrderResponse, status_code=201)
async def create_order(
    body: CreateOrder,
    db: DBConn,
    token: Token,
    tasks: BackgroundTasks,
):
    row = await db.fetchrow(
        "INSERT INTO orders(email, product, qty) VALUES($1,$2,$3) RETURNING id",
        body.user_email, body.product_id, body.quantity,
    )
    tasks.add_task(send_confirmation, body.user_email)
    return OrderResponse(id=row["id"], status="created")

async def send_confirmation(email: str) -> None:
    pass  # fire-and-forget after response sent`,
      notes: `Use \`asyncpg\` (not psycopg2) for async DB. Test with \`TestClient\` for sync or \`AsyncClient\` (httpx) for async. Override dependencies in tests with \`app.dependency_overrides\`.`
    },
    interview: [
      {
        question: "How does FastAPI's dependency injection differ from Spring's?",
        answer:
`FastAPI uses **function arguments** as the DI declaration — no annotation processing, no XML, no IoC container startup. \`Depends(fn)\` is resolved at request time with automatic scope management. Spring's IoC is application-scope by default; FastAPI scoping is per-request unless you use caching. Both support testing by swapping implementations.`,
        followUps: ["How do you implement request-scoped dependencies?", "How does FastAPI handle dependency errors?"]
      },
      {
        question: "How do you handle database transactions across multiple operations in FastAPI?",
        answer:
`Acquire a connection, start a transaction in the dependency, yield the connection, and either commit or rollback in the finally block. Pattern: \`async with conn.transaction(): yield conn\` inside the dependency. This ensures atomicity across multiple endpoint DB calls that use the same injected connection.`,
        followUps: ["How do you handle nested transactions in asyncpg?", "What is a savepoint?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Zero-boilerplate request validation via Pydantic.",
        "OpenAPI docs auto-generated — always in sync with code.",
        "DI makes auth, DB sessions, and rate limiting testable."
      ],
      cons: [
        "Pydantic v2 breaking changes — migration required from v1.",
        "ASGI adds complexity: must avoid blocking code in async paths.",
        "Smaller ecosystem than Django for admin, auth, and ORM."
      ],
      when: `**FastAPI** for new async REST/GraphQL services. **Django** when you need the full admin, ORM, and auth battery out of the box. **Flask** for small scripts and prototypes.`
    }
  },

  {
    id: "python-pydantic-dataclasses",
    area: "python",
    title: "Pydantic v2, dataclasses & Data Validation",
    tag: "Pydantic",
    tags: ["pydantic", "dataclasses", "validation", "serialization", "schema"],
    concept:
`**Pydantic v2** rewrites validation in Rust (\`pydantic-core\`) — 5–50× faster than v1. Core concepts:
- **\`BaseModel\`**: auto-validates on construction; \`model_validate\`, \`model_dump\`, \`model_json_schema\`.
- **\`Field\`**: metadata — constraints, aliases, defaults, \`exclude\`.
- **\`@field_validator\`, \`@model_validator\`**: custom validation at field or model level.
- **\`@computed_field\`**: derived fields included in serialization.
- **\`ConfigDict\`**: \`strict\`, \`from_attributes\` (ORM mode), \`frozen\`.
- **\`TypeAdapter\`**: validate arbitrary types without a model class.`,
    why:
`Pydantic is used by FastAPI, LangChain, AWS CDK, and hundreds of data pipelines for runtime validation of external data. Incorrect validation of untrusted input (APIs, Kafka messages, CSV files) is a security and reliability risk. Pydantic v2's Rust core makes it viable even in tight loops.`,
    example: {
      language: "python",
      code:
`from datetime import datetime
from decimal import Decimal
from typing import Annotated
from pydantic import (
    BaseModel, Field, field_validator, model_validator,
    ConfigDict, computed_field, TypeAdapter
)

# ── Reusable annotated type ────────────────────────────────────────────────
PositiveMoney = Annotated[Decimal, Field(gt=0, decimal_places=2, max_digits=10)]

class OrderLine(BaseModel):
    product_id: str = Field(min_length=3, max_length=50)
    quantity: int = Field(gt=0, le=1000)
    unit_price: PositiveMoney

    @computed_field
    @property
    def total(self) -> Decimal:
        return self.unit_price * self.quantity

class CreateOrder(BaseModel):
    model_config = ConfigDict(frozen=True, str_strip_whitespace=True)

    user_id: int
    lines: list[OrderLine] = Field(min_length=1)
    placed_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("user_id")
    @classmethod
    def user_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("user_id must be positive")
        return v

    @model_validator(mode="after")
    def check_total_limit(self) -> "CreateOrder":
        total = sum(l.total for l in self.lines)
        if total > Decimal("10000"):
            raise ValueError(f"order total {total} exceeds limit")
        return self

# ── TypeAdapter: validate without a model ─────────────────────────────────
ListOfInts = TypeAdapter(list[int])
data = ListOfInts.validate_python(["1", "2", "3"])  # coerces strings

# ── ORM mode: from SQLAlchemy/Django ORM objects ───────────────────────────
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str`,
      notes: `Use \`model_config = ConfigDict(strict=True)\` when you don't want Pydantic to coerce types (e.g., string → int). Use \`model_dump(mode="json")\` to get JSON-serializable dicts for Redis/Kafka.`
    },
    interview: [
      {
        question: "What changed between Pydantic v1 and v2?",
        answer:
`V2 rewrites the validation core in Rust — 5–50× faster. API changes: \`@validator\` → \`@field_validator\` (class method, explicit \`mode='before'|'after'\`), \`orm_mode\` → \`from_attributes\`, \`.dict()\` → \`.model_dump()\`, \`.json()\` → \`.model_dump_json()\`. Validator order changed. \`@root_validator\` → \`@model_validator\`. Many v1 workarounds (custom \`__get_validators__\`) have cleaner v2 equivalents via \`Annotated\`.`,
        followUps: ["How do you migrate a large codebase from v1 to v2?", "What is a Pydantic TypeAdapter?"]
      },
      {
        question: "How do you validate data from a database ORM without duplicating models?",
        answer:
`Use \`ConfigDict(from_attributes=True)\` — Pydantic reads attributes from ORM objects as if they were dict keys. Pattern: have one SQLAlchemy model and a \`*Out\` Pydantic model for serialization. For write paths, a \`*In\` model validates user input. This keeps ORM models mutable and Pydantic models focused on validation/serialization.`,
        followUps: ["How do you handle lazy-loaded relationships?", "Pydantic vs marshmallow?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Rust core: sub-microsecond validation for hot paths.",
        "JSON Schema auto-generation — OpenAPI integration.",
        "Annotated types compose reusable constraints."
      ],
      cons: [
        "v1 → v2 migration is significant (breaking API changes).",
        "Frozen models add immutability overhead for large nested objects.",
        "Complex cross-field validators can be hard to test in isolation."
      ],
      when: `**Pydantic** for validating external data (API, Kafka, CSV). **dataclasses** for internal data structures that don't need validation. **TypedDict** for lightweight dict typing without runtime overhead.`
    }
  },

  {
    id: "python-memory-gc",
    area: "python",
    title: "Python Memory Model, Reference Counting & gc",
    tag: "Memory",
    tags: ["reference counting", "gc", "memory", "weakref", "tracemalloc", "__slots__"],
    concept:
`CPython manages memory via **reference counting** — each object tracks how many references point to it. When the count hits 0, it's immediately freed. **Cyclic garbage collector** (\`gc\` module) handles reference cycles (A → B → A) in three generations.
Key tools:
- **\`__slots__\`**: prevents per-instance \`__dict__\`, saves ~50–70% memory for many small objects.
- **\`weakref\`**: reference that doesn't increment the refcount — used for caches and callbacks.
- **\`tracemalloc\`**: snapshot heap allocations to find leaks.
- **\`sys.getsizeof\`**: object size (shallow, not deep).`,
    why:
`Memory leaks in Python are often caused by: (1) global caches growing unbounded; (2) closures holding references to large objects; (3) event listeners never removed; (4) reference cycles not collected by the minor GC generation. In long-running services (FastAPI, Celery), memory growth causes OOM kills. \`tracemalloc\` is the key diagnostic tool.`,
    example: {
      language: "python",
      code:
`import gc
import tracemalloc
import weakref
import sys
from dataclasses import dataclass

# ── __slots__ saves memory ─────────────────────────────────────────────────
class Point:
    __slots__ = ("x", "y")
    def __init__(self, x: float, y: float) -> None:
        self.x, self.y = x, y

class PointDict:   # standard class with __dict__
    def __init__(self, x: float, y: float) -> None:
        self.x, self.y = x, y

p1, p2 = Point(1.0, 2.0), PointDict(1.0, 2.0)
print(f"slots: {sys.getsizeof(p1)}, dict: {sys.getsizeof(p2)}")
# slots: ~48 bytes, dict: ~48 + __dict__ 232 bytes

# ── weakref cache ──────────────────────────────────────────────────────────
class ExpensiveResource:
    def __init__(self, key: str) -> None:
        self.key = key

_cache: dict[str, weakref.ref] = {}

def get_resource(key: str) -> ExpensiveResource:
    ref = _cache.get(key)
    obj = ref() if ref else None
    if obj is None:
        obj = ExpensiveResource(key)
        _cache[key] = weakref.ref(obj)
    return obj

# ── tracemalloc: find memory leaks ────────────────────────────────────────
tracemalloc.start()
snapshot1 = tracemalloc.take_snapshot()

leaked: list = []
for _ in range(10_000):
    leaked.append(b"x" * 1024)  # 1 KB each

snapshot2 = tracemalloc.take_snapshot()
top = snapshot2.compare_to(snapshot1, "lineno")
for stat in top[:3]:
    print(stat)   # shows file:line, size diff

# ── Cycle detection ────────────────────────────────────────────────────────
class Node:
    def __init__(self): self.ref = None

a = Node(); b = Node()
a.ref = b; b.ref = a  # cycle
del a, b              # refcount stays > 0 without gc
gc.collect()          # GC finds and frees the cycle
print("collected:", gc.collect())`,
      notes: `Disable the cyclic GC (\`gc.disable()\`) only in CPU-critical tight loops where you've proven there are no cycles. Re-enable it for the rest of the code. Instagram disables GC for a 10% throughput win in their specific case.`
    },
    interview: [
      {
        question: "What is the difference between del and garbage collection in Python?",
        answer:
`\`del\` removes a **name binding** — it decrements the refcount of the object. If refcount hits 0, the object is freed immediately. If a cycle exists, the refcount never reaches 0; the cyclic GC (run periodically) finds and frees unreachable cycle members. \`del\` does not directly call the GC.`,
        followUps: ["What is __del__ and why is it dangerous?", "How does generational GC work?"]
      },
      {
        question: "How do you find memory leaks in a long-running Python service?",
        answer:
`Three approaches: (1) **tracemalloc** — snapshot before/after suspected leak window, compare top-N allocations by lineno. (2) **objgraph** — \`objgraph.show_most_common_types()\` to see what's growing. (3) **memory_profiler** — line-by-line memory for a function. Common culprits: global dicts growing, cached results never evicted, listeners registered on long-lived objects.`,
        followUps: ["What is a reference cycle involving __del__?", "How does weakref.WeakValueDictionary help caches?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Reference counting gives immediate deallocation for non-cycle objects.",
        "__slots__ is a low-effort 50-70% memory saving for many small objects.",
        "tracemalloc is built-in — no external profiler needed."
      ],
      cons: [
        "Reference counting can't handle cycles without the cyclic GC.",
        "Cyclic GC pauses (short, but non-deterministic) affect latency.",
        "No compaction — long-running processes accumulate fragmentation."
      ],
      when: `Use **\`__slots__\`** for value-object classes created in large numbers. Use **weakref** for in-memory caches. Profile with **tracemalloc** before optimizing — Python memory issues are often caused by application-level design, not the runtime.`
    }
  },

  {
    id: "python-testing",
    area: "python",
    title: "pytest, Fixtures, Mocking & TDD",
    tag: "Testing",
    tags: ["pytest", "fixtures", "mock", "parametrize", "coverage", "hypothesis"],
    concept:
`Python's testing ecosystem centers on **pytest**:
- **Fixtures**: \`@pytest.fixture\` — dependency injection for test setup/teardown with scopes (\`function\`, \`class\`, \`module\`, \`session\`).
- **\`@pytest.mark.parametrize\`**: table-driven tests.
- **\`unittest.mock\`** / **\`pytest-mock\`**: \`MagicMock\`, \`patch\`, \`AsyncMock\`.
- **\`pytest-asyncio\`**: async test support.
- **Property-based testing (Hypothesis)**: generates adversarial inputs automatically.
- **Coverage**: \`pytest-cov\` with branch coverage.`,
    why:
`Good fixtures replace repetitive setup code and enforce DRY in tests. Parametrize eliminates copy-paste test variants. Property-based tests with Hypothesis find edge cases (empty strings, max int, NaN) that hand-written tests miss. In senior interviews, being able to design a testable architecture (interfaces, DI) matters as much as writing the tests.`,
    example: {
      language: "python",
      code:
`import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch
from hypothesis import given, strategies as st

# ── Fixtures with scope ────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def db_pool():
    """Real DB pool, created once per test session."""
    import asyncio, asyncpg
    pool = asyncio.get_event_loop().run_until_complete(
        asyncpg.create_pool("postgresql://localhost/test")
    )
    yield pool
    asyncio.get_event_loop().run_until_complete(pool.close())

@pytest.fixture
def mock_email(monkeypatch):
    sent = []
    monkeypatch.setattr("myapp.email.send", lambda to, msg: sent.append((to, msg)))
    return sent

# ── Parametrize ────────────────────────────────────────────────────────────
@pytest.mark.parametrize("qty,price,expected_total", [
    (1, "10.00", "10.00"),
    (3, "2.50",  "7.50"),
    (0, "5.00",  None),   # invalid: raises
])
def test_order_total(qty, price, expected_total):
    from decimal import Decimal
    from myapp.models import OrderLine
    if expected_total is None:
        with pytest.raises(ValueError):
            OrderLine(product_id="SKU1", quantity=qty, unit_price=Decimal(price))
    else:
        line = OrderLine(product_id="SKU1", quantity=qty, unit_price=Decimal(price))
        assert line.total == Decimal(expected_total)

# ── AsyncMock ─────────────────────────────────────────────────────────────
@pytest.mark.asyncio
async def test_create_order_sends_email():
    from myapp.service import OrderService
    fake_db = AsyncMock()
    fake_db.fetchrow.return_value = {"id": 42}
    svc = OrderService(db=fake_db)
    with patch("myapp.service.send_confirmation") as mock_send:
        result = await svc.create(user_id=1, product_id="X", quantity=2)
    mock_send.assert_awaited_once()
    assert result.id == 42

# ── Property-based testing ────────────────────────────────────────────────
@given(st.lists(st.integers(min_value=1, max_value=100), min_size=1))
def test_sum_always_positive(xs):
    assert sum(xs) > 0`,
      notes: `Use \`monkeypatch\` for patching in fixtures — it automatically reverts after the test. Prefer \`AsyncMock\` over \`MagicMock\` for coroutines. Run with \`pytest --cov=myapp --cov-branch\` for branch coverage.`
    },
    interview: [
      {
        question: "What is fixture scope and when would you use session scope?",
        answer:
`Fixture scope controls how often the fixture is created: \`function\` (default, per test), \`class\`, \`module\`, \`session\` (once for the entire test run). Use **session scope** for expensive setup: database connection pools, test containers, loaded ML models. Use **function scope** for anything with mutable state that must be isolated per test.`,
        followUps: ["What is yield in a fixture?", "How do you handle teardown errors in a session fixture?"]
      },
      {
        question: "How do you test code that uses time.sleep or datetime.now?",
        answer:
`Three approaches: (1) **\`monkeypatch\`** to replace \`time.sleep\` with a no-op. (2) **\`freezegun\`** library — freezes time across the call stack including \`datetime.now()\`, \`time.time()\`. (3) **Inject clock** — pass a \`clock\` callable/object as a dependency, replace with a fake in tests. Injection is the most testable design; freezegun is the quickest fix.`,
        followUps: ["How does freezegun work under the hood?", "How do you test scheduled tasks?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Fixtures compose and have scope — DRY setup without BaseTestCase boilerplate.",
        "Parametrize generates test IDs automatically for clear failure reports.",
        "Hypothesis finds edge cases humans miss — invaluable for parsing and math."
      ],
      cons: [
        "Heavy mocking creates brittle tests that break on refactoring, not bugs.",
        "Session-scoped fixtures with state cause hard-to-debug test ordering issues.",
        "Hypothesis can be slow for complex strategies — tune max_examples."
      ],
      when: `**Unit tests**: mock external I/O, test one unit. **Integration tests**: real DB in Docker, no mocks. **Property tests**: parsing, math, data transforms. Aim for fast feedback — keep unit tests < 1ms each.`
    }
  }
];
