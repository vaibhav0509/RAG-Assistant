# Enterprise RAG Assistant — CLAUDE.md

## Project overview

**AI Studio** — a full-stack local AI workspace with six tools: RAG Chat, ReAct Agent, Quiz Game, CV→Portfolio builder, RAG Evaluation, and a Blueprint docs page. Starts with a homepage that explains every feature. Originally a pure RAG assistant, now a multi-tool AI playground.

LLM inference: **Ollama** (local, default) or **Groq** (cloud, set `LLM_PROVIDER=groq` + `GROQ_API_KEY`). Vector storage: **ChromaDB**. Frontend: **React + Vite**.

---

## Project location

```
/Users/vaibhavmishra/Documents/personalGitHub/RAG-Assistant/
```

## How to start the project

### Option A — Docker (recommended, one command)
```bash
# Ollama on host: docker compose uses host.docker.internal:11434
docker compose up --build

# Or with Groq (no Ollama needed):
LLM_PROVIDER=groq GROQ_API_KEY=gsk_... docker compose up --build
```
- Backend → http://localhost:8000
- Frontend → http://localhost:3000

### Option B — Local dev

#### Backend
```bash
cd /Users/vaibhavmishra/Documents/personalGitHub/RAG-Assistant/backend
# Use the Desktop venv (where packages are actually installed):
/Users/vaibhavmishra/Desktop/enterprise-rag/backend/.venv/bin/python3.14 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Important**: The venv was created at `~/Desktop/enterprise-rag/backend/.venv` — that's where packages live even though the project is in `~/Documents/`. Always use the full Desktop path.
- First startup is slow: sentence-transformers loads `all-MiniLM-L6-v2` weights (~22 MB).

#### Frontend
```bash
cd frontend
npm run dev
```
- Runs on `http://localhost:5173`
- Vite proxies `/api/*` → `http://localhost:8000` (see `vite.config.ts`)

#### Ollama
Must be running separately before starting the backend:
```bash
ollama serve   # if not already a system daemon
```
Current model: `granite4.1:8b` (set in `backend/.env`).

### Running tests
```bash
/Users/vaibhavmishra/Desktop/enterprise-rag/backend/.venv/bin/python3.14 -m pytest backend/tests/ -v
```
39 tests across `test_chunking.py`, `test_helpers.py`, and `test_api.py`.

---

## Architecture

```
frontend (React/Vite :5173)
    └── /api/v1/*  →  proxy  →  backend (FastAPI :8000)
                                    ├── ChromaDB  (./chroma_db/)
                                    ├── SQLite game.db   (quiz sessions)
                                    ├── SQLite perf.db   (query perf logs)
                                    └── Ollama  (:11434)
```

### Auth
Every request must carry `X-API-Key: enterprise-rag-secret`. This is enforced in FastAPI middleware (`app/main.py`). The middleware uses `return JSONResponse(...)` — **not** `raise HTTPException` — because raising exceptions inside middleware returns HTTP 500.

---

## Backend structure

```
backend/
├── .env                          # runtime config (model, chunk sizes, API key)
├── requirements.txt              # production dependencies
├── requirements-dev.txt          # test dependencies: pytest, httpx, pytest-asyncio
├── tests/
│   ├── conftest.py               # patches sentence-transformers, sets test env vars, provides client fixture
│   ├── test_chunking.py          # 13 tests — all 4 chunking strategies (pure Python, no ML)
│   ├── test_helpers.py           # 11 tests — _normalize() and _rrf() pure functions
│   └── test_api.py               # 15 tests — FastAPI endpoints with mocked services
├── app/
│   ├── main.py                   # FastAPI app, CORS, auth middleware, router registration
│   ├── config.py                 # Settings (pydantic-settings, reads .env)
│   ├── models/schemas.py         # Pydantic request/response schemas
│   ├── api/routes/
│   │   ├── chat.py               # POST /chat — SSE streaming, times retrieval+LLM, logs to perf_db
│   │   ├── agent.py              # POST /agent — SSE streaming ReAct loop
│   │   ├── portfolio.py          # POST /portfolio/parse — PDF upload → structured profile JSON
│   │   ├── documents.py          # POST /documents/upload, DELETE /documents/{collection}
│   │   ├── collections.py        # GET /collections
│   │   ├── models.py             # GET /models (Ollama model list)
│   │   ├── status.py             # GET /status (system health snapshot)
│   │   ├── perf.py               # GET /perf/history, GET /perf/stats
│   │   ├── eval.py               # POST /eval/run — RAG evaluation with 3 metrics
│   │   └── game.py               # POST /game/suggest-subtopics, /game/start (SSE), /game/answer, /game/analysis/{id}, /game/history
│   └── services/
│       ├── vector_store.py       # ChromaDB wrapper — add_documents(), query(), delete_collection()
│       ├── document_processor.py # Text extraction (PDF/DOCX/TXT) + 4 chunking strategies
│       ├── retrieval/engine.py   # 4 retrieval strategies (see below)
│       ├── llm.py                # Ollama/Groq wrappers — llm_complete(), stream_answer()
│       ├── agent.py              # ReAct loop — run_agent() async generator, 4 tools, MAX_ITERATIONS=7
│       ├── portfolio_parser.py   # PDF → text (pdfplumber) + photo extraction + LLM → structured JSON profile
│       ├── reranker.py           # Cross-encoder re-ranking — CrossEncoder('cross-encoder/ms-marco-MiniLM-L6-v2')
│       ├── eval_metrics.py       # 3 eval metrics: context_relevance, answer_relevance, answer_faithfulness
│       ├── perf_db.py            # SQLite perf logging — log_query(), get_perf_history(), get_strategy_stats()
│       ├── game_db.py            # SQLite game sessions/rounds storage
│       ├── question_generator.py # MCQ generation with streaming status updates
│       └── web_search.py         # DuckDuckGo search via `ddgs` package (NOT duckduckgo_search)
```

### Key config (backend/.env)
```
OLLAMA_MODEL=granite4.1:8b
EMBEDDING_MODEL=all-MiniLM-L6-v2
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
API_KEY=enterprise-rag-secret
```

---

## Retrieval strategies (`services/retrieval/engine.py`)

Four strategies selectable per-query via `retrieval_strategy` field in `ChatRequest`:

| Strategy | ID | How it works |
|---|---|---|
| Naive Dense | `naive` | Direct ChromaDB cosine similarity search |
| Hybrid BM25+Dense | `hybrid` | Fetch top-K×4 dense candidates, run BM25Okapi on them, normalize+combine (alpha=0.5), return top-K |
| HyDE | `hyde` | LLM generates a hypothetical answer, embed that text, use it as the search query |
| Multi-Query | `multi_query` | LLM generates 3 query variations, retrieve for each, merge with Reciprocal Rank Fusion |

`retrieve()` returns `(chunks: list[dict], perf_meta: dict)`. The chat route times this call and logs to `perf_db`.

---

## Chunking strategies (`services/document_processor.py`)

Four strategies selectable at upload time via `chunk_strategy` form field:

| Strategy | ID | When to use |
|---|---|---|
| Recursive | `recursive` | Default — sentence-boundary sliding window, balanced |
| Semantic | `semantic` | Paragraph-aware, preserves document structure |
| Sentence Window | `sentence` | Groups sentences into windows, best for precise Q&A |
| Fixed Size | `fixed` | Hard char-size slices, fastest ingest, no boundary detection |

`chunk_text(text, chunk_size, overlap, strategy)` is the public entry point.

---

## Frontend structure

```
frontend/src/
├── App.tsx                       # Root — IconNav (desktop) + MobileNav (bottom bar), all 7 tabs CSS-mounted, ProcessProvider
├── api/client.ts                 # All fetch calls — API key injected, streamChat(), streamAgent(), streamEval(), parsePortfolio()
├── context/ProcessContext.tsx    # Event bus for terminal monitor — useProcess() hook, log(tag, msg, status)
├── hooks/useChat.ts              # Chat state — sendMessage(), clearMessages(), logs events to ProcessContext
├── types/index.ts                # Message, Source types
└── components/
    ├── HomePage.tsx              # Welcome/home tab — hero, quick-start steps, 6 feature cards, backend troubleshooting footer
    ├── Chat.tsx                  # Chat panel with RetrievalSelector + DocumentUpload
    ├── MessageList.tsx           # Message list with markdown rendering
    ├── DocumentUpload.tsx        # Drag-drop upload with chunking strategy picker
    ├── RetrievalSelector.tsx     # Strategy dropdown + Top-K select
    ├── ModelSelector.tsx         # Ollama model dropdown (fetches /api/v1/models)
    ├── Sidebar.tsx               # Collections list — only shown when Chat tab active, desktop only
    ├── TerminalSidebar.tsx       # Right panel — LOG tab + PERFORMANCE tab (320px, slides in)
    ├── AgentPage.tsx             # Agent tab — ReAct loop UI, MiniSpinner, ReAct explainer, step cards
    ├── PortfolioPage.tsx         # Portfolio tab — upload PDF → parse → template picker → animated portfolio
    ├── EvalPage.tsx              # Eval tab — question input, strategy config, SSE streaming results, stop button, aggregate bars
    ├── Blueprint.tsx             # Blueprint tab — 8-section docs page with scrollspy TOC (see below)
    └── game/
        ├── GamePage.tsx          # Quiz game orchestrator
        ├── TopicSetup.tsx        # Topic input + subtopic suggestion
        ├── SourceSelector.tsx    # Checkbox picker: Documents / Web / Model knowledge
        ├── GameLoader.tsx        # Animated loading screen during question generation
        ├── QuestionCard.tsx      # MCQ display with timer and answer feedback
        └── GameAnalysis.tsx      # Post-game score breakdown and analysis
```

### Layout architecture

```
[IconNav 60px dark] | [Sidebar? (chat+desktop only)] | [Tab panels — absolute inset-0, CSS invisible/pointer-events-none] | [TerminalSidebar 320px]
                                                                                    ↕
                                                              [MobileNav fixed bottom — md:hidden]
```

- **Tab persistence**: All 7 tabs (including home) are always mounted. Inactive tabs use `invisible pointer-events-none` (not unmounted) to preserve component state across tab switches.
- **Default tab**: `"home"` — app opens on the welcome page.
- **Home navigation**: The Zap logo in the desktop `IconNav` and the mobile header are buttons that navigate to `"home"`. Home is NOT in the `TABS` array so it has no bottom-nav slot on mobile.
- **Collections Sidebar**: Conditionally rendered at App level — only when `tab === "chat"` AND on desktop (`hidden md:flex`).
- **Mobile bottom nav**: Fixed bar with 6 feature tab icons + monitor toggle. Content area uses `mb-16 md:mb-0` to avoid overlap.
- **Desktop icon nav**: 60px `bg-gray-950` sidebar with tooltip on hover (label + hint text). Monitor toggle at bottom.
- **App name**: "AI Studio" (updated from "RAG Assistant" everywhere including log messages).

### Key patterns

**SSE streaming**: `streamChat()` in `client.ts` is an `async function*` that yields `{token}` events and a final `{done, sources, perf}` event.

**Process monitor events**: Use `useProcess()` → `log(tag, message, status)`. Tags: `SYSTEM QUERY EMBED RETRIEVAL CONTEXT MODEL STREAM DONE WEB GAME ANSWER DB RAG AGENT TOOL RESULT PORTFOLIO`. Status: `info running success error warn`.
- `AGENT` (violet) — agent question, iteration thoughts, done/error
- `TOOL` (amber) — tool name + input
- `RESULT` (sky) — observation/tool result preview
- `PORTFOLIO` (lime) — CV parse progress steps

**Brand color**: `brand-500` / `brand-600` (configured in Tailwind — check `tailwind.config.js`).

---

## Blueprint tab (`components/Blueprint.tsx`)

The last tab — an interactive project showcase. **9 sections**:

1. **Hero** — dark gradient banner, animated tech badges (framer-motion stagger)
2. **Live Metrics** — pulls `/status` + `/perf/stats`, animated number counters
3. **Setup Guide** — first content section; prerequisites, Docker one-liner, local dev commands with tests, env vars table. This is what the "Setup guide →" button on the HomePage links to.
4. **RAG Pipeline** — three-row animated flow diagram (Ingest, Chat Query, Agent ReAct)
5. **Architecture Diagram** — CSS system map (Browser → FastAPI → Services layer)
6. **What We Built** — 14 feature cards; each shows a `↗ proves: ...` skill tag at the bottom
7. **Concepts Deep Dive** — expandable accordion (RAG, Embeddings, BM25, HyDE, RRF, Chunking, SSE, ReAct, Context API, RAG Evaluation Metrics)
8. **Retrieval Strategy Comparison** — 4 cards with animated speed/precision/complexity bars
9. **Interview Cheat Sheet** — dark-themed Q&A accordion with 9 model answers
10. **Stack & Roadmap** — tech stack cards + roadmap items in one merged section

### Scrollspy
- `IntersectionObserver` watches `[data-section]` elements inside the scroll container `ref`.
- Sticky TOC sidebar (`w-[168px]`, `xl` screens only) with anchor buttons that call `scrollIntoView`.
- Active section highlighted with `border-brand-500 text-brand-600`.
- No window scroll — observer uses `root: scrollRef.current` so it works inside the flex panel.

All sections use `whileInView` scroll-triggered entrance animations. No additional npm packages required.

---

## Game mode

- User picks topic → model suggests subtopics → user picks subtopic + sources (docs / web / model)
- `/game/start` streams SSE status events (`{event: "status", message: "..."}`) then a final `{event: "ready", ...}` with all questions
- Questions are MCQ, stored in SQLite (`game.db`) with `session_id` and `round_id`
- `/game/answer` accepts answer + response time, returns correctness + explanation
- `/game/analysis/{session_id}` returns full performance breakdown

---

## Performance tab (TerminalSidebar)

- `GET /api/v1/perf/history` — last 30 queries with all metrics
- `GET /api/v1/perf/stats` — grouped by strategy with avg relevance, avg latency
- Data is persisted in `backend/perf.db` (SQLite)
- The PERFORMANCE tab in the monitor sidebar renders: last query snapshot, strategy comparison bars, query history

---

## Known gotchas

1. **Python venv**: Always use `backend/.venv/bin/python3`. System Python won't have `pypdf`, `chromadb`, etc.
2. **Web search package**: Must be `ddgs` (not `duckduckgo_search`). Import: `from ddgs import DDGS`. The old package installs silently but returns 0 results.
3. **FastAPI auth middleware**: Use `return JSONResponse(status_code=401, ...)` — raising `HTTPException` inside middleware returns HTTP 500 instead.
4. **Ollama thinking mode**: If switching back to Qwen models, add `options={"think": False}` to ollama chat calls to prevent the model from entering extended thinking that hangs for minutes.
5. **BM25 dependency**: `rank_bm25` package is required for the hybrid strategy — it's in `requirements.txt`.
6. **Embedding model startup**: `all-MiniLM-L6-v2` loads on first request after startup (not import time). Backend health check passes before it's ready — first query may have slightly higher latency.
7. **ChromaDB data**: Persisted in `backend/chroma_db/`. Currently has 559 chunks in the `default` collection. Deleting this folder wipes all indexed documents.

---

## API reference (quick)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/status` | ✓ | System health (Ollama, ChromaDB, model loaded) |
| GET | `/api/v1/models` | ✓ | List Ollama models |
| GET | `/api/v1/collections` | ✓ | List ChromaDB collections |
| POST | `/api/v1/documents/upload` | ✓ | Upload + chunk + embed document |
| DELETE | `/api/v1/documents/{col}` | ✓ | Delete collection |
| POST | `/api/v1/chat` | ✓ | RAG query (streaming SSE or JSON) |
| POST | `/api/v1/agent` | ✓ | ReAct agent loop (SSE — yields thought/action/observation/answer events) |
| POST | `/api/v1/portfolio/parse` | ✓ | Upload PDF resume → returns structured profile JSON (name, experience, skills, links, photo) |
| GET | `/api/v1/perf/history` | ✓ | Last 30 query perf records |
| GET | `/api/v1/perf/stats` | ✓ | Aggregated stats by strategy |
| POST | `/api/v1/eval/run` | ✓ | Run evaluation: context relevance + faithfulness + answer relevance per question |
| POST | `/api/v1/game/suggest-subtopics` | ✓ | LLM-suggested subtopics for a topic |
| POST | `/api/v1/game/start` | ✓ | Start quiz (SSE streaming) |
| POST | `/api/v1/game/answer` | ✓ | Submit MCQ answer |
| GET | `/api/v1/game/analysis/{id}` | ✓ | Full session analysis |
| GET | `/api/v1/game/history` | ✓ | All past game sessions |

All requests require header: `X-API-Key: enterprise-rag-secret`

---

## Portfolio tab — CV → Portfolio

- Upload any PDF resume → `pdfplumber` extracts text + embedded photo
- LLM parses into structured JSON: name, title, summary, skills, experience, education, projects, certifications, links
- If PDF has a photo → displayed as profile picture
- If no photo → DiceBear avatar (gender-aware, name-seeded) — user can pick from 4 styles (Adventurer, Lorelei, Micah, Notionists)
- "Export PDF" button → `window.print()` with print-only CSS
- Requires `pdfplumber>=0.11.0` in backend

### Template system (`PortfolioPage.tsx`)

Templates are registered in the `TEMPLATES` array with `available: boolean`. Unavailable templates show a "Coming Soon" placeholder. All 5 templates are currently live.

| Template ID | Design | Key details |
|---|---|---|
| `basic` | Clean & professional | Gradient hero (`gray-900→brand-900→purple-900`), skills pills with hover, experience timeline with brand/purple left border, 2-col project grid with hover lift |
| `creative` | Bold & full-bleed | Dark `#0d0d0d` hero with 3 animated gradient orbs, stacked giant name, offset avatar with shadow block, numbered sections (01–06), animated skill bars (deterministic fill from skill name hash), two-column experience with company pill badges, gradient project card headers cycling `CREATIVE_PALETTE` |
| `dark` | Terminal aesthetic | CRT scanline overlay (fixed, 7% opacity), green ↔ amber color toggle (single `C` palette object), avatar in box-drawing character frame (`┌── portrait ──┐`), 3-char monospace avatar style buttons, sections as fake shell commands (`$ whoami`, `$ ls -1 ./skills/`, `$ cat experience.log` with `├─` tree lines, `$ ls -la ./projects/` with `drwxr-xr-x`), blinking `▌` cursor at end |
| `oldschool` | 1960s letterhead | Parchment `#f5f0e8` background, Georgia/Times New Roman serif, centered letterhead with `══` double-rule borders and `❦` ornament, dynamically numbered sections from `OLD_SCHOOL_PARTS[]` array (PART ONE / TWO / THREE…), no avatar, experience with em-dash `—` bullets, formal *"Yours faithfully"* closing |
| `nineties` | GeoCities nostalgia | **Fun ↔ Chaos toggle** in the header. Fun: Comic Sans, navy `#0000aa` headers, 3-col skills table, boxed experience cards, visitor counter seeded from profile name. Chaos adds: Framer Motion marquee ("Welcome to [Name]'s TOTALLY RAD Homepage!!!"), blinking text via `<Blink>` wrapper, rainbow gradient avatar border, Windows 95 dialog boxes (`Win95Dialog`) for experience (navy title bar, `#c0c0c0` chrome, pixel-art buttons), `RainbowHr` dividers, tiled dot background, IE/Netscape footer warning |

**Shared components:**
- `PortfolioShell` — hosts `TemplateSelector` bar + `AnimatePresence` template switch; routes to all 5 via chained ternary
- `TemplateSelector` — horizontal tab row with lock icons on unavailable templates; Export PDF + New CV buttons
- `AvatarPicker` — shows extracted photo OR DiceBear SVG (`https://api.dicebear.com/9.x/{style}/svg?seed={name}`) with 4 style buttons (Adventurer / Lorelei / Micah / Notionists)
- `UploadScreen` — drag-drop zone, orbit spinner with cycling words, timed `setTimeout` steps logged to PORTFOLIO monitor tag
- `ComingSoonTemplate` — fallback for any future template not yet built
- `Win95Dialog` — Windows 95 chrome component used by `NinetiesTemplate` chaos mode
- `RainbowHr` — `linear-gradient` 4px hr used as section divider in chaos mode

**Adding a new template:** add entry to `TEMPLATES` array with `available: true`, build `XxxTemplate({ profile })` component, add one arm to the chained ternary in `PortfolioShell`.

---

## Eval tab — RAG Evaluation (`/eval/run`)

Three metrics computed without any external eval library:

| Metric | How computed |
|---|---|
| **Context Relevance** | `mean(chunk["score"])` — cosine similarity already returned by ChromaDB |
| **Answer Faithfulness** | LLM judge prompt: "0-10, how faithfully is this answer grounded in the context?" / 10 |
| **Answer Relevance** | Cosine similarity between question embedding and answer embedding (via `vector_store._embedder`) |

`EvalPage.tsx` sends `{ questions, collection, strategy, top_k, use_reranker }` to `POST /eval/run`.
The endpoint returns SSE streaming: `progress` → `result` (per question) → `done` (aggregate). Each question has a 90-second timeout — if the LLM hangs, the question streams an error result and evaluation continues. Users can click **Stop** to abort mid-run via `AbortController`. Results arrive one-by-one as the stream progresses. Questions capped at 20.
`eval_metrics.py` reuses the VectorStore's already-loaded embedder — no second model instance.
`streamEval()` in `client.ts` is an `async function*` matching the same SSE generator pattern as `streamChat()` and `streamAgent()`.

---

## Testing

```
backend/tests/
├── conftest.py        # patches sentence-transformers (no model downloads), sets test env, provides TestClient
├── test_chunking.py   # 13 tests — all 4 chunking strategies (pure Python)
├── test_helpers.py    # 11 tests — _normalize() and _rrf() (pure functions)
└── test_api.py        # 15 tests — API endpoints with mocked service calls
```

Run: `/Users/vaibhavmishra/Desktop/enterprise-rag/backend/.venv/bin/python3.14 -m pytest backend/tests/ -v`

**conftest design**: `sentence_transformers` is patched in `sys.modules` at module level (before any app import) so no ML weights are downloaded. ChromaDB uses a real ephemeral store at `/tmp/ai_studio_test_chroma`. LLM calls (Groq) are mocked per-test with `unittest.mock.patch`.

---

## Docker

`docker-compose.yml` at project root:
- `backend`: builds `./backend`, maps port 8000, health check via `/health`, volume `chroma_data` for ChromaDB + `sqlite_data` for SQLite
- `frontend`: builds `./frontend` (nginx), maps port 3000, depends on backend health check passing
- `PORT=8000` is set explicitly in environment (Dockerfile CMD uses `${PORT:-8000}`)
- LLM_PROVIDER, OLLAMA_MODEL, GROQ_API_KEY configurable via host env vars (with sane defaults)
- `host.docker.internal:11434` — Ollama on the host is reachable from the container on macOS/Windows; on Linux add `extra_hosts: ["host.docker.internal:host-gateway"]`

---

## Already built

- **Re-ranking with cross-encoder** — `services/reranker.py`, toggle via `use_reranker` flag, fetches `top_k * 3` candidates
- **ReAct Agent Mode** — `services/agent.py` + `api/routes/agent.py`, 4 tools, MAX_ITERATIONS=7, full SSE streaming
- **CV → Portfolio (all 5 templates)** — `services/portfolio_parser.py`, Basic / Creative / Dark / Old School / 90's all live with template picker; Fun ↔ Chaos toggle on 90's; green ↔ amber toggle on Dark
- **AI Studio rebrand** — renamed from "RAG Assistant"; icon sidebar nav (desktop) + bottom tab bar (mobile); fully responsive layout
- **RAG Evaluation tab** — `EvalPage.tsx` + `/api/v1/eval/run`; 3 metrics, SSE streaming with per-question 90s timeout, stop button, aggregate summary
- **pytest test suite** — 39 tests, 3 files, mocked ML deps; run in < 2 seconds
- **Docker Compose** — one-command `docker compose up --build` for both services with health checks
- **Home/Welcome page** — `HomePage.tsx`; hero banner, 3-step quick start, 6 feature cards (with prereq warnings), backend troubleshooting footer; default tab on app load; accessible via Zap logo on desktop and mobile

## Possible next features

- **Portfolio AI Enhancement** — LLM-powered bullet rewriting, job description tailoring, and skill gap analysis per template style
- **Agent memory / trace store** — persist agent reasoning traces to SQLite across sessions
- **Structured tool calling** — replace regex-parsed ReAct output with OpenAI-compatible function calling
- **Chunking strategy performance comparison** — track chunk strategy + retrieval strategy combos in perf.db
- **Non-text file ingestion** — CSV, URLs/web pages, YouTube transcripts, images (OCR)
- **Chat history persistence** — save/load conversations
- **Embedding model selection at upload time** — with re-index warning (currently hardcoded to `all-MiniLM-L6-v2`)
