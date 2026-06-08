<div align="center">

<img src="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=aistudio&backgroundColor=6366f1" width="96" height="96" alt="AI Studio Logo" />

# AI Studio

**A full-stack local AI workspace — nine tools, one codebase, zero cloud dependencies.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-rag--assistant--pro.vercel.app-6366f1?style=for-the-badge&logo=vercel&logoColor=white)](https://rag-assistant-pro.vercel.app/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-local%20LLM-f97316?style=for-the-badge)](https://ollama.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-vector%20store-8b5cf6?style=for-the-badge)](https://www.trychroma.com/)

[**Try it live →**](https://rag-assistant-pro.vercel.app/)

</div>

---

## What is this?

AI Studio started as a RAG chatbot and grew into a nine-tool AI playground — all running locally with Ollama or in the cloud with Groq, using the same codebase. No OpenAI. No API bills. No data leaving your machine (unless you want it to).

Open the app and a welcome screen explains every tool and when to use it — no need to read docs before you start.

```
Upload your documents → ask anything → watch the pipeline work in real time
```

It's both a functional AI toolkit and a showcase of production-grade AI/ML engineering patterns — RAG pipelines, agentic reasoning loops, vector search, SSE streaming, and more.

---

## 🛠️ Nine Panels in One

### 🏠 Welcome Home
Opens by default. Explains every tool with feature cards, a 3-step quick start, and a backend troubleshooting hint. No need to read Blueprint first.

### 💬 RAG Chat
Upload documents and chat with them. Four retrieval strategies, four chunking strategies, cross-encoder re-ranking, and a real-time process monitor showing every pipeline step.

### 🧠 Agent Mode
A ReAct (Reasoning + Acting) loop that thinks, picks a tool, reads the result, and iterates — up to 7 times — before giving a final answer. Streams every reasoning step to the UI in real time.

### 🎮 Quiz Game
Pick any topic → the model suggests subtopics → generates MCQ questions from your documents, the web, or its own knowledge. Scored, timed, with full post-game analysis.

### 📄 CV → Portfolio
Upload a PDF resume → the LLM parses it into structured JSON → renders it as a beautiful animated portfolio page. Five visual templates to choose from.

### 🧪 RAG Evaluation
Paste in a list of questions, pick a retrieval strategy, hit Run — and get three quantitative metrics per question: **context relevance** (cosine similarity of retrieved chunks), **answer faithfulness** (LLM judge), and **answer relevance** (embedding similarity). Aggregate bars show overall pipeline quality.

### 🔭 Visualize
Three tools that make the invisible visible:
- **Embedding Space** — PCA scatter plot of every chunk in your collection. Scroll to zoom, drag to pan, hover any dot to read the chunk. Type a query to see where it lands in vector space relative to your documents.
- **Context Window Inspector** — Before the LLM answers, see exactly what goes into its prompt: system prompt, each retrieved chunk with its relevance score, and your question — all with token counts and a colour-coded usage bar.
- **Chunking Visualizer** — Paste any text and see it split by all 4 strategies simultaneously. Compare chunk count, average size, and boundary placement side by side.

### 🔀 Agent Workflow Builder
Visual drag-and-drop canvas (React Flow) to chain AI operations without writing code. Six node types: **Input**, **LLM Call**, **Retrieval**, **Web Search**, **Transform**, **Output**. Connect them into a DAG, hit Run, and watch each node execute in real time with SSE streaming. Nodes light up green as they complete. Use `{{nodeId}}` in LLM prompts to inject upstream outputs. Save and load pipelines as JSON. Ships with a default RAG + Web Search pipeline pre-loaded.

### 📐 Blueprint
An interactive docs page explaining every architectural decision — with a **Setup Guide** section (prerequisites, Docker + local dev commands, env vars table), live system metrics, pipeline diagrams, concept explainers, retrieval strategy comparisons, and an interview cheat sheet.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| **4 Retrieval Strategies** | Naive Dense · Hybrid BM25+Dense · HyDE · Multi-Query + RRF |
| **4 Chunking Strategies** | Recursive · Semantic · Sentence Window · Fixed Size |
| **Cross-Encoder Re-ranking** | Two-stage retrieval with `ms-marco-MiniLM-L6-v2` |
| **ReAct Agent** | 4 tools: ChromaDB · DuckDuckGo · Calculator · Direct Answer |
| **RAG Evaluation** | 3 metrics: context relevance · faithfulness (LLM judge) · answer relevance |
| **SSE Streaming** | Every response streams token-by-token with live progress |
| **Process Monitor** | Real-time terminal sidebar — color-coded pipeline events |
| **Performance Analytics** | Every query logged: retrieval ms · LLM ms · relevance score |
| **5 Portfolio Templates** | Basic · Creative · Dark/Terminal · Old School · 90's GeoCities |
| **Local + Cloud LLM** | Ollama on-device or Groq cloud — same API surface |
| **Fully Responsive** | Collapsible labeled sidebar (200px/60px, per-feature accent colors) · scrollable dark bottom tab bar on mobile |
| **Agent Workflow Builder** | React Flow canvas · 6 node types · DAG execution · SSE per-node streaming · save/load JSON |
| **Rate Limiting** | SQLite 100 req/day per UUID · X-User-ID header · auto-resets at midnight |
| **39 pytest tests** | Chunking strategies · retrieval helpers · API endpoints with mocked services |

---

## 🎨 Portfolio Templates

| Template | Vibe |
|---|---|
| **Basic** | Clean gradient hero · skills pills · timeline experience |
| **Creative** | Dark full-bleed hero · animated orbs · skill bars · numbered sections |
| **Dark** | Full terminal session · CRT scanlines · green↔amber toggle · blinking cursor |
| **Old School** | Parchment background · serif letterhead · classical PART ONE / TWO / THREE sections |
| **90's** | Comic Sans · GeoCities chaos · Windows 95 dialog boxes · rainbow dividers · Fun↔Chaos toggle |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (React 18 + Vite)              │
│  Home │ Chat │ Agent │ Quiz │ Portfolio │ Eval │ Visualize │ Workflow │ Blueprint │
│          │          SSE Streaming ←→                      │
└──────────────────────────┬───────────────────────────────┘
                           │ /api/v1/* (X-API-Key)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   FastAPI (Python)                        │
│  Auth middleware · Async routes · Pydantic validation     │
│                                                           │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  ChromaDB   │  │   Ollama   │  │  SQLite                    │  │
│  │  Vector DB  │  │  LLM :11434│  │  perf.db · game.db · rate  │  │
│  └─────────────┘  └────────────┘  └──────────────────┘  │
│  ┌──────────────────────────────────────────────────┐    │
│  │  sentence-transformers (all-MiniLM-L6-v2)        │    │
│  │  Embedding model — 80MB, 5ms/query               │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Retrieval Strategies

```
Naive Dense    → direct cosine similarity         [fast, baseline]
Hybrid         → BM25 + dense, alpha-blended      [best all-rounder]
HyDE           → LLM generates answer → embed it  [great for vague queries]
Multi-Query    → 3 phrasings → RRF merge          [best recall, 4× latency]
```

---

## 🚀 Getting Started

### Option A — Docker (easiest)

```bash
git clone https://github.com/yourusername/RAG-Assistant.git
cd RAG-Assistant

# With local Ollama running on your machine:
docker compose up --build

# Or with Groq (no GPU, no Ollama needed):
LLM_PROVIDER=groq GROQ_API_KEY=gsk_... docker compose up --build
```

- Frontend → http://localhost:3000
- Backend API → http://localhost:8000

### Option B — Local dev

#### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/) installed and running

#### 1. Clone

```bash
git clone https://github.com/yourusername/RAG-Assistant.git
cd RAG-Assistant
```

#### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Pull a model
ollama pull granite4.1:8b

# Configure
cp .env.example .env

# Start
.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

#### 4. (Optional) Groq instead of Ollama

```bash
# In backend/.env
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Running Tests

```bash
cd backend
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/python -m pytest tests/ -v
# → 39 tests, ~2 seconds, no model downloads needed
```

---

## ⚙️ Configuration

All configuration lives in `backend/.env`:

```env
# LLM
OLLAMA_MODEL=granite4.1:8b
LLM_PROVIDER=ollama          # or: groq

# Groq (optional)
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

# Embeddings
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Chunking defaults
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Auth
API_KEY=enterprise-rag-secret
```

---

## 📡 API Reference

All endpoints require `X-API-Key: enterprise-rag-secret` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/status` | System health — Ollama, ChromaDB, model loaded |
| `GET` | `/api/v1/models` | List available Ollama models |
| `POST` | `/api/v1/chat` | RAG query — SSE streaming |
| `POST` | `/api/v1/agent` | ReAct agent loop — SSE streaming |
| `POST` | `/api/v1/documents/upload` | Upload + chunk + embed a document |
| `DELETE` | `/api/v1/documents/{collection}` | Delete a collection |
| `GET` | `/api/v1/collections` | List ChromaDB collections |
| `POST` | `/api/v1/portfolio/parse` | PDF → structured profile JSON |
| `GET` | `/api/v1/perf/history` | Last 30 query performance records |
| `GET` | `/api/v1/perf/stats` | Aggregated stats by retrieval strategy |
| `POST` | `/api/v1/eval/run` | Evaluate RAG quality — 3 metrics per question |
| `POST` | `/api/v1/game/suggest-subtopics` | LLM-suggested subtopics for a topic |
| `POST` | `/api/v1/game/start` | Start quiz — SSE streaming |
| `POST` | `/api/v1/game/answer` | Submit MCQ answer |
| `GET` | `/api/v1/game/analysis/{id}` | Full session analysis |

---

## 🧠 Concepts This Project Demonstrates

If you're preparing for AI/ML engineering interviews, every feature here maps to a real talking point:

- **RAG vs Fine-tuning** — when to use each, trade-offs explained
- **Vector embeddings** — how text becomes points in 384-dimensional space
- **BM25 + hybrid search** — the same technique used by Elasticsearch and Vespa
- **HyDE** — hypothetical document embeddings for vague queries
- **Reciprocal Rank Fusion** — merging ranked lists from multiple retrievers
- **ReAct pattern** — autonomous reasoning loops with tool use
- **SSE streaming** — why first-token latency matters more than total latency
- **Cross-encoder re-ranking** — two-stage retrieval for precision
- **Context API as event bus** — lightweight pub/sub without Redux

The Blueprint tab has model answers to all of these, ready for interviews.

---

## 🗂️ Project Structure

```
RAG-Assistant/
├── docker-compose.yml           # One-command startup (backend + frontend with health checks)
├── backend/
│   ├── tests/                   # 39 pytest tests (chunking · helpers · API)
│   ├── requirements.txt
│   ├── requirements-dev.txt     # pytest, httpx
│   └── app/
│       ├── api/routes/          # chat · agent · portfolio · game · perf · status · eval · visualize
│       ├── services/
│       │   ├── retrieval/       # 4 retrieval strategies
│       │   ├── vector_store.py  # ChromaDB wrapper
│       │   ├── agent.py         # ReAct loop — MAX_ITERATIONS=7
│       │   ├── workflow_engine.py  # DAG executor — topo sort + SSE per-node streaming
│       │   ├── rate_limiter.py  # SQLite 100 req/day per UUID, auto-resets at midnight
│       │   ├── portfolio_parser.py  # PDF → LLM → JSON
│       │   ├── reranker.py      # Cross-encoder re-ranking
│       │   └── eval_metrics.py  # context_relevance · answer_relevance · faithfulness
│       └── main.py              # FastAPI app + auth middleware
└── frontend/
    └── src/
        ├── App.tsx              # Layout — collapsible sidebar nav + 9 tab panels (home default, logo → home)
        ├── api/client.ts        # Typed fetch wrappers + SSE generators: streamChat · streamAgent · streamEval · visualize
        ├── context/             # ProcessContext — real-time event bus
        └── components/
            ├── HomePage.tsx     # Welcome screen: hero · quick start · 6 feature cards
            ├── Chat.tsx
            ├── AgentPage.tsx
            ├── PortfolioPage.tsx # 5 templates: Basic · Creative · Dark · OldSchool · 90's
            ├── EvalPage.tsx     # RAG eval — SSE streaming results, 90s timeout, stop button
            ├── VisualizePage.tsx # Embedding scatter · Context inspector · Chunking visualizer
            ├── WorkflowPage.tsx # React Flow canvas · 6 node types · DAG execution · SSE streaming
            ├── Blueprint.tsx    # 8-section docs with scrollspy
            ├── TerminalSidebar.tsx
            └── game/            # Quiz game components
```

---

## 🔭 What's Next

- [ ] GitHub Actions CI — run pytest on every push
- [ ] Agent memory — persist reasoning traces across sessions
- [ ] Structured tool calling — replace regex-parsed ReAct with function calling
- [ ] Multi-modal ingestion — URLs, CSV, YouTube transcripts, OCR
- [ ] Chat history persistence — save/load conversations
- [ ] Portfolio AI enhancement — LLM-powered bullet rewriting per template style
- [ ] Embedding model selection at upload time

---

## 🤝 Contributing

Pull requests welcome. For major changes, open an issue first.

```bash
# Run backend tests
cd backend && .venv/bin/python3 -m pytest

# Type check frontend
cd frontend && npx tsc --noEmit
```

---

<div align="center">

Built with 🧠 using **Ollama · ChromaDB · FastAPI · React · sentence-transformers**

[**Try the live demo →**](https://rag-assistant-pro.vercel.app/)

</div>
