# Enterprise RAG Assistant — CLAUDE.md

## Project overview

Full-stack RAG (Retrieval-Augmented Generation) application built entirely on local infrastructure — no cloud LLM APIs. Key design constraint: **Ollama for all LLM calls, ChromaDB for vector storage, React + Vite frontend**.

---

## Project location

```
/Users/vaibhavmishra/Documents/personalGitHub/RAG-Assistant/
```

## How to start the project

### Backend
```bash
cd /Users/vaibhavmishra/Documents/personalGitHub/RAG-Assistant/backend
.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Uses `.venv/bin/python3` — **not** the system Python. The system Python (homebrew) does NOT have the project dependencies.
- First startup is slow: sentence-transformers loads `all-MiniLM-L6-v2` weights (~22 MB).

### Frontend
```bash
cd frontend
npm run dev
```
- Runs on `http://localhost:5173`
- Vite proxies `/api/*` → `http://localhost:8000` (see `vite.config.ts`)

### Ollama
Must be running separately before starting the backend:
```bash
ollama serve   # if not already a system daemon
```
Current model: `granite4.1:8b` (set in `backend/.env`).

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
├── .venv/                        # Python venv — always use .venv/bin/python3
├── app/
│   ├── main.py                   # FastAPI app, CORS, auth middleware, router registration
│   ├── config.py                 # Settings (pydantic-settings, reads .env)
│   ├── models/schemas.py         # Pydantic request/response schemas
│   ├── api/routes/
│   │   ├── chat.py               # POST /chat — SSE streaming, times retrieval+LLM, logs to perf_db
│   │   ├── documents.py          # POST /documents/upload, DELETE /documents/{collection}
│   │   ├── collections.py        # GET /collections
│   │   ├── models.py             # GET /models (Ollama model list)
│   │   ├── status.py             # GET /status (system health snapshot)
│   │   ├── perf.py               # GET /perf/history, GET /perf/stats
│   │   └── game.py               # POST /game/suggest-subtopics, /game/start (SSE), /game/answer, /game/analysis/{id}, /game/history
│   └── services/
│       ├── vector_store.py       # ChromaDB wrapper — add_documents(), query(), delete_collection()
│       ├── document_processor.py # Text extraction (PDF/DOCX/TXT) + 4 chunking strategies
│       ├── retrieval/engine.py   # 4 retrieval strategies (see below)
│       ├── llm.py                # Ollama wrappers — generate_answer(), stream_answer()
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
├── App.tsx                       # Root — tabs (Chat/Game), model selector, monitor button, ProcessProvider
├── api/client.ts                 # All fetch calls — API key injected, streamChat() is async generator
├── context/ProcessContext.tsx    # Event bus for terminal monitor — useProcess() hook, log(tag, msg, status)
├── hooks/useChat.ts              # Chat state — sendMessage(), clearMessages(), logs events to ProcessContext
├── types/index.ts                # Message, Source types
└── components/
    ├── Chat.tsx                  # Chat panel with RetrievalSelector + DocumentUpload
    ├── MessageList.tsx           # Message list with markdown rendering
    ├── DocumentUpload.tsx        # Drag-drop upload with chunking strategy picker
    ├── RetrievalSelector.tsx     # Strategy dropdown + Top-K select
    ├── ModelSelector.tsx         # Ollama model dropdown
    ├── Sidebar.tsx               # Left sidebar (collections list)
    ├── TerminalSidebar.tsx       # Right panel — LOG tab + PERFORMANCE tab
    ├── Blueprint.tsx             # Third tab — interactive project showcase (see below)
    └── game/
        ├── GamePage.tsx          # Quiz game orchestrator
        ├── TopicSetup.tsx        # Topic input + subtopic suggestion
        ├── SourceSelector.tsx    # Checkbox picker: Documents / Web / Model knowledge
        ├── GameLoader.tsx        # Animated loading screen during question generation
        ├── QuestionCard.tsx      # MCQ display with timer and answer feedback
        └── GameAnalysis.tsx      # Post-game score breakdown and analysis
```

### Key patterns

**SSE streaming**: `streamChat()` in `client.ts` is an `async function*` that yields `{token}` events and a final `{done, sources, perf}` event.

**Process monitor events**: Use `useProcess()` → `log(tag, message, status)`. Tags: `SYSTEM QUERY EMBED RETRIEVAL CONTEXT MODEL STREAM DONE WEB GAME ANSWER DB RAG`. Status: `info running success error warn`.

**Brand color**: `brand-500` / `brand-600` (configured in Tailwind — check `tailwind.config.js`).

---

## Blueprint tab (`components/Blueprint.tsx`)

The third tab in the app — an interactive project showcase. 11 animated sections:

1. **Hero** — dark gradient banner, animated tech badges (framer-motion stagger)
2. **Live Metrics** — pulls `/status` + `/perf/stats`, animated number counters
3. **RAG Pipeline** — two-row animated flow diagram (Ingest + Query paths)
4. **Architecture Diagram** — CSS system map (Browser → FastAPI → Services layer)
5. **What We Built** — 8 feature cards with hover lift animations
6. **Concepts Deep Dive** — expandable accordion (RAG, Embeddings, BM25, HyDE, RRF, Chunking, SSE, Context API)
7. **Retrieval Strategy Comparison** — 4 cards with animated speed/precision/complexity bars
8. **What This Proves** — skills-map cards linking features to interview-ready competencies
9. **Interview Cheat Sheet** — dark-themed Q&A accordion with 6 model answers
10. **Tech Stack** — grid cards explaining why each dependency was chosen
11. **What's Next** — roadmap cards for future features

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
| GET | `/api/v1/perf/history` | ✓ | Last 30 query perf records |
| GET | `/api/v1/perf/stats` | ✓ | Aggregated stats by strategy |
| POST | `/api/v1/game/suggest-subtopics` | ✓ | LLM-suggested subtopics for a topic |
| POST | `/api/v1/game/start` | ✓ | Start quiz (SSE streaming) |
| POST | `/api/v1/game/answer` | ✓ | Submit MCQ answer |
| GET | `/api/v1/game/analysis/{id}` | ✓ | Full session analysis |
| GET | `/api/v1/game/history` | ✓ | All past game sessions |

All requests require header: `X-API-Key: enterprise-rag-secret`

---

## Possible next features (discussed but not built)

- **Chunking strategy performance comparison** — track which chunk strategy + retrieval strategy combo performs best, surface in the performance tab
- **Re-ranking with cross-encoder** — add a `CrossEncoder` re-ranker pass after initial retrieval
- **Non-text file ingestion** — CSV, URLs/web pages, YouTube transcripts, images (OCR)
- **Chat history persistence** — save/load conversations
- **Embedding model selection at upload time** — with re-index warning (currently hardcoded to `all-MiniLM-L6-v2`)
- **Dark mode** for the frontend
