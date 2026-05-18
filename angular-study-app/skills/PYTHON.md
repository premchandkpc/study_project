# Python Topics

**Topic file location:** `src/modules/topics/python/`
**Topic array:** `window.PYTHON_TOPICS`
**Area string:** `"python"`

---

## Topics Built

| File                               | Title                                 | Tag             | Visual Status              |
| ---------------------------------- | ------------------------------------- | --------------- | -------------------------- |
| `python-gil-concurrency.js`        | GIL, Threads, Async & Multiprocessing | Concurrency     | Placeholder — needs visual |
| `python-memory-gc.js`              | Memory Model & Garbage Collection     | Memory          | Placeholder — needs visual |
| `python-decorators-metaclasses.js` | Decorators, Metaclasses & Descriptors | Metaprogramming | Placeholder — needs visual |
| `python-type-hints-mypy.js`        | Type Hints, mypy & Protocols          | Typing          | Placeholder — needs visual |
| `python-pydantic-dataclasses.js`   | Pydantic & Dataclasses                | Data Validation | Placeholder — needs visual |
| `python-fastapi.js`                | FastAPI Internals                     | Web             | Placeholder — needs visual |
| `python-testing.js`                | Testing: pytest & Patterns            | Testing         | Placeholder — needs visual |

> All 7 topics have full concept/example/interview content. Visuals need to be built.

---

## Visual Style References (inputs/)

| Image                                                         | Apply to Python topics                                                                                                                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `inputs/image copy 11.png` — 5-row swimlane (Kafka use cases) | **`python-gil-concurrency.js`**: 3 rows — Threads (GIL-bound), asyncio (event loop), multiprocessing (separate GIL per process). Animated dots = tasks executing or blocked |
| `inputs/image copy 7.png` — Blueprint numbered callouts       | **`python-memory-gc.js`**: numbered steps ①object alloc→②ref count→③cyclic detection→④generational GC→⑤free. Heap diagram with generations                                  |
| `inputs/image copy 9.png` — Numbered circular loop            | **`python-fastapi.js`**: circular numbered flow ①request→②middleware→③route match→④Pydantic validate→⑤handler→⑥response→⑦client                                             |
| `inputs/image copy 3.png` — Wheel center hub + radial         | **`python-decorators-metaclasses.js`**: center = "Decorator", radial = @functools.wraps/@property/@classmethod/@staticmethod/@lru_cache/custom                              |
| `inputs/image copy 12.png` — SQL mind map dark bg radial      | **`python-type-hints-mypy.js`**: center = "Type System", radial = Union/Optional/Literal/TypeVar/Protocol/Generic/Final                                                     |

---

## Animation Implementation Priority

### PRIORITY 1 — Highest interview + visual value

| Topic                       | Visual Type                       | Style Ref             | Key Animation                                                                                                                                                                                                                             |
| --------------------------- | --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `python-gil-concurrency.js` | Swimlane (3 rows, always-visible) | image copy 11         | Row1 Threads: GIL token moves between threads — only 1 runs at a time (CPU-bound = no speedup). Row2 asyncio: single thread, event loop tick, I/O tasks yield. Row3 multiprocessing: 2 processes, each with own GIL, true parallel        |
| `python-memory-gc.js`       | FlowDiagram (5-step)              | image copy 7 numbered | Step1: object created → `sys.getrefcount()`. Step2: ref count drops to 0 → immediate dealloc. Step3: cyclic refs (A→B→A) → ref count never 0 → GC needed. Step4: generational sweep (gen0→gen1→gen2). Step5: `gc.collect()` breaks cycles |
| `python-fastapi.js`         | FlowDiagram (5-step)              | image copy 9 circular | Step1: HTTP request. Step2: Starlette ASGI middleware. Step3: route match + path params. Step4: Pydantic validate request body. Step5: async handler → background tasks → response                                                        |

### PRIORITY 2

| Topic                              | Visual Type | Key Animation                                                                                                                          |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `python-decorators-metaclasses.js` | FlowDiagram | @decorator wraps: outer fn receives fn → returns wrapper. `functools.wraps` preserves metadata. Class decorator. `__call__` protocol   |
| `python-type-hints-mypy.js`        | FlowDiagram | TypeVar: generic function. Protocol: structural subtyping (no inheritance needed). `reveal_type()` mypy output. Runtime vs static      |
| `python-pydantic-dataclasses.js`   | FlowDiagram | Pydantic model: field validation pipeline → coerce → validators → error collection. vs `@dataclass` (no validation). `model_validator` |

### PRIORITY 3

| Topic               | Visual Type | Key Animation                                                                                                           |
| ------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `python-testing.js` | FlowDiagram | pytest fixture scope: function→class→module→session. `monkeypatch`. `pytest.mark.parametrize`. Coverage: branch vs line |

---

## Detailed Visual Specs

### `python-gil-concurrency.js` swimlane spec

```
Always-visible swimlane (3 rows) — ByteByteGo style:

Row 1 THREADS + GIL (red #f85149):
  Thread 1: acquires GIL → runs Python bytecode → releases GIL every 5ms (sys.getswitchinterval)
  Thread 2: waits for GIL → acquires → runs
  Thread 3: waits for GIL
  Key: CPU-bound — still serialized. I/O-bound — releases GIL during I/O syscall → useful parallelism

Row 2 ASYNCIO (blue #58a6ff):
  Single thread. Event loop tick → Task A awaits I/O → Task B runs → Task A resumes on I/O done
  Animated: single dot moves, pauses at "await", jumps to next task
  No GIL issue — cooperative, not preemptive. CPU-bound = blocks event loop.

Row 3 MULTIPROCESSING (green #3fb950):
  Process 1: own GIL → runs Python fully parallel
  Process 2: own GIL → runs Python fully parallel
  IPC: Queue / Pipe / shared memory. Overhead: spawn new interpreter.
  True CPU parallelism — at cost of memory (each process = separate heap)

Decision guide:
  I/O-bound → asyncio (best) or threading (simpler)
  CPU-bound → multiprocessing (only option for Python)
  Mixed I/O+CPU → asyncio + ProcessPoolExecutor for CPU tasks
```

### `python-memory-gc.js` FlowDiagram spec

```
5-step ReactViz.panel:
  Step 1 (render):  x = MyObj() → CPython allocates on heap → ob_refcnt = 1
  Step 2 (commit):  y = x → ob_refcnt = 2. del x → ob_refcnt = 1. del y → ob_refcnt = 0 → DEALLOC immediately
  Step 3 (effect):  Cyclic ref: a.ref = b; b.ref = a → both refcnt = 1 but unreachable. Ref count can't reach 0.
  Step 4 (update):  Generational GC: gen0 collected frequently (new objects). gen1/gen2 collected less often.
                    gc.collect() → find cycles → break them → dealloc
  Step 5 (cleanup): Memory pools: CPython small object allocator (obmalloc) for ≤512 bytes. int cache [-5..256].
                    id(256) == id(256) → True. id(257) == id(257) → False (two different objects!)

Nodes: heap(store), refcount(selector), cycle-detector(hook), gen0/gen1/gen2(cache), deallocator(action)

Gotchas to show:
  - __del__ can resurrect object — prevent GC
  - weakref.ref() doesn't increment refcount (good for caches)
  - tracemalloc for memory leak debugging
  - PyPy has tracing GC (no refcount) — different semantics
```

### `python-decorators-metaclasses.js` FlowDiagram spec

```
4-step ReactViz.panel:
  Step 1 (render):  @decorator sugar: def foo(): ... decorated = decorator(foo)
                    Execution order: outer → middle → inner (stacked decorators)
  Step 2 (commit):  functools.wraps: preserves __name__, __doc__, __module__. Without it: wrapper's metadata overwrites.
  Step 3 (effect):  Descriptor protocol: __get__/__set__/__delete__. @property uses this.
                    obj.attr → type(obj).__dict__['attr'].__get__(obj, type(obj))
  Step 4 (update):  Metaclass: type is default metaclass. class Foo(metaclass=Meta): → Meta.__new__ → Meta.__init__
                    Use cases: ORM model registration, singleton enforcement, abstract method checks

Code examples:
  @lru_cache(maxsize=128)  — wraps function, adds cache dict, LRU eviction
  @dataclass               — metaclass-like: inspects annotations, generates __init__/__repr__/__eq__
  class SingletonMeta(type): — __instances = {}; __call__ checks before creating
```

### `python-fastapi.js` FlowDiagram spec

```
5-step ReactViz.panel:
  Step 1 (render):  ASGI: app receives scope/receive/send — raw async interface. Uvicorn calls app(scope, receive, send).
  Step 2 (commit):  Middleware stack (Starlette): CORS → GZip → Session → custom. Each = async callable wrapping next.
  Step 3 (effect):  Dependency Injection: Depends(get_db). FastAPI resolves dependency graph before calling handler.
                    Yield deps → setup before yield, teardown after yield (session management).
  Step 4 (update):  Pydantic validation: request body → BaseModel. Field validators → coerce types → ValidationError.
                    Response model → serialize → exclude_unset → JSON.
  Step 5 (cleanup): Background tasks: BackgroundTasks.add_task(send_email, ...) → runs after response sent.
                    WebSocket: await ws.receive_text() / ws.send_text().

Nodes: uvicorn(server), middleware(hook), router(component), Depends(cache),
       Pydantic(selector), handler(action), BackgroundTask(network)

Key FastAPI interview points:
  - async def handler: runs in event loop. def handler: runs in threadpool (blocking OK)
  - Path params → regex validated by Pydantic. Query params → Optional[type] = None for optional
  - OpenAPI auto-generated from type hints — no separate schema file
  - @app.on_event("startup"/"shutdown") for lifespan (deprecated → use lifespan context manager)
```

### `python-pydantic-dataclasses.js` FlowDiagram spec

```
4-step ReactViz.panel:
  Step 1 (render):  class User(BaseModel): id: int; name: str; email: EmailStr
                    User(id="42", name="Alice") → Pydantic coerces "42" → 42
  Step 2 (commit):  Field validators: @field_validator('email') checks format.
                    @model_validator(mode='after') cross-field validation.
                    Validation order: type coercion → field validators → model validators
  Step 3 (effect):  vs @dataclass: no validation, no coercion, no JSON schema. Faster creation.
                    pydantic.dataclasses.dataclass: adds validation to @dataclass syntax.
  Step 4 (update):  model.model_dump() → dict. model.model_dump_json() → JSON string.
                    model_config: extra='forbid' rejects unknown fields. from_attributes=True for ORM mode.

Use case split:
  Pydantic BaseModel → API request/response validation, CLI config
  @dataclass → internal data containers where validation not needed (faster)
  TypedDict → type checking only, no runtime overhead, no validation
```

---

## Python Topics Still to Add

### HIGH PRIORITY (interview-critical, no JS file yet)

| Topic                      | Suggested File              | Visual Type   | Key Concepts                                                                                                                                                                                              |
| -------------------------- | --------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Python async internals     | `python-async-internals.js` | FlowDiagram   | Event loop: selector (epoll/kqueue) → ready callbacks. Coroutine: `__await__` protocol. Task wraps coroutine. Future = promise. `asyncio.gather` vs `asyncio.wait`. `asyncio.Queue` for producer/consumer |
| Python data model          | `python-data-model.js`      | ComponentTree | Dunder methods: `__init__/__new__/__repr__/__str__/__eq__/__hash__/__len__/__getitem__/__iter__/__next__`. Protocol without ABC. Operator overloading                                                     |
| Python internals (CPython) | `python-cpython.js`         | FlowDiagram   | `.py` → bytecode (`dis` module). Stack-based VM. Frame objects. LEGB scope rule. Name lookup: locals→enclosing→globals→builtins                                                                           |
| generators & itertools     | `python-generators.js`      | FlowDiagram   | `yield` suspends frame. `send()` resumes with value. `yield from` delegation. `itertools.chain/islice/groupby`. Generator vs list — lazy evaluation, memory                                               |
| Python packaging           | `python-packaging.js`       | FlowDiagram   | pyproject.toml. pip vs uv vs poetry. virtual env isolation. `__init__.py` vs namespace packages. Wheel vs sdist                                                                                           |

### MEDIUM PRIORITY

| Topic              | Suggested File          | Key Concepts                                                                                                               |
| ------------------ | ----------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Python performance | `python-performance.js` | `cProfile`/`line_profiler`. Numpy vectorization vs loops. `__slots__` vs dict. `functools.lru_cache`. Cython, numba, mypyc |
| SQLAlchemy ORM     | `python-sqlalchemy.js`  | Session, Unit of Work, lazy loading, N+1, `relationship()`, Core vs ORM query style                                        |
| Celery task queue  | `python-celery.js`      | Task → broker (Redis/RMQ) → worker → result backend. Beat scheduler. Retry with backoff. Canvas: chain/chord/group         |
| Python ML pipeline | `python-ml-pipeline.js` | Scikit-learn Pipeline, pandas DataFrame internals, numpy array memory layout (C vs Fortran order)                          |

### LOW PRIORITY

| Topic            | Suggested File       | Key Concepts                                                                                              |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| Python security  | `python-security.js` | pickle deserialization attacks, SSRF, template injection (Jinja2), secrets module, `hashlib` proper usage |
| Python CLI tools | `python-cli.js`      | `argparse` vs `click` vs `typer`. `rich` for output. `pathlib`. `subprocess`. `shutil`                    |

---

## Key Python Interview Questions (cross-topic)

```
GIL & Concurrency:
  - What is the GIL and why does it exist? (CPython memory management is not thread-safe)
  - When does threading help despite the GIL? (I/O-bound: GIL released during I/O syscalls)
  - When do you need multiprocessing over threading?
  - What is the difference between asyncio, threading, and multiprocessing?
  - How does asyncio's event loop work internally?

Memory:
  - How does CPython manage memory? (reference counting + cyclic GC)
  - Why does id(256) == id(256) but id(257) != id(257)?
  - What is a memory leak in Python? How to detect it? (tracemalloc, objgraph)
  - What is __slots__ and when do you use it?

Decorators & Metaprogramming:
  - How do stacked decorators execute? (bottom-up decoration, top-down execution)
  - What does functools.wraps do and why is it important?
  - What is a descriptor? How does @property use it?
  - What problem do metaclasses solve?

Type System:
  - What is the difference between Protocol and ABC?
  - What is TypeVar and how does it enable generic functions?
  - What is Literal type? When would you use it?
  - How does mypy's --strict mode differ from default?

FastAPI:
  - How does FastAPI's dependency injection work?
  - What is the difference between async def and def route handlers in FastAPI?
  - How does Pydantic V2 differ from V1? (Rust-based core, 5-50x faster validation)
  - What is ASGI and how does it differ from WSGI?
```

---

## Python Topic File Pattern

```js
(function () {
  "use strict";

  window.PYTHON_TOPICS = (window.PYTHON_TOPICS || []).concat([
    {
      id: "python-<topic>",
      area: "python",
      title: "<Title>",
      tag: "<Tag>",
      tags: ["python", "<keyword1>", "<keyword2>"],

      concept: `<explanation>`,
      why: `<production relevance>`,

      example: {
        language: "python",
        code: `# Python code`,
      },

      interview: ["Question 1?", "Question 2?"],
      tradeoffs: { pros: ["..."], cons: ["..."] },
      gotchas: ["Gotcha 1"],

      visual: function (mount) {
        // Swimlane (always-visible) for GIL/async/multiprocessing comparison
        // ReactViz.panel FlowDiagram for single lifecycle (memory GC, FastAPI request)
        // ComponentTree for data model / dunder hierarchy
      },
    },
  ]);
})();
```
