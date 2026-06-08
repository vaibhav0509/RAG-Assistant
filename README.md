<div align="center">

<img src="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=aistudio&backgroundColor=6366f1" width="96" height="96" alt="AI Studio Logo" />

# AI Studio

**A full-stack local AI workspace — ten tools, one codebase, zero cloud dependencies.**

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

AI Studio started as a RAG chatbot and grew into a ten-tool AI playground — all running locally with Ollama or in the cloud with Groq, using the same codebase. No OpenAI. No API bills. No data leaving your machine (unless you want it to).

```
Upload your documents → ask anything → watch the pipeline work in real time
```

It's both a functional AI toolkit and a showcase of production-grade AI/ML engineering patterns — multi-agent orchestration, RAG pipelines, agentic reasoning loops, vector search, SSE streaming, and more.

---

## ✨ What Makes It Different

| Feature | Details |
|---|---|
| **Multi-Agent Pipeline** | Chain Research → Write → Review agents. Each sees all prior outputs. 3 built-in templates. Live token streaming per agent. |
| **Agent Workflow Builder** | React Flow drag-and-drop canvas · 6 node types · DAG execution · SSE per-node streaming · save/load JSON |
| **ReAct Agent** | 4 tools: ChromaDB · DuckDuckGo · Calculator · Direct Answer. Up to 7 reasoning iterations. |
| **4 Retrieval Strategies** | Naive Dense · Hybrid BM25+Dense · HyDE · Multi-Query + RRF |
| **4 Chunking Strategies** | Recursive · Semantic · Sentence Window · Fixed Size |
| **Cross-Encoder Re-ranking** | Two-stage retrieval with `ms-marco-MiniLM-L6-v2` |
| **RAG Evaluation** | 3 metrics: context relevance · faithfulness (LLM judge) · answer relevance |
| **Embeddings Visualization** | PCA scatter plot · Context Window Inspector · Chunking Visualizer |
| **SSE Streaming** | Every response streams token-by-token with live progress |
| **Process Monitor** | Real-time terminal sidebar — color-coded pipeline events across all tools |
| **Local + Cloud LLM** | Ollama on-device or Groq cloud — same API surface, no OpenAI required |
| **Fully Responsive** | Collapsible sidebar · mobile tab bar · all tools work on phones |
| **5 Portfolio Templates** | Basic · Creative · Dark/Terminal · Old School · 90's GeoCities |
| **Rate Limiting** | SQLite 100 req/day per UUID · X-User-ID header · auto-resets at midnight |
| **39 pytest tests** | Chunking strategies · retrieval helpers · API endpoints with mocked services |

---

## 🧠 Concepts This Project Demonstrates

Every feature maps directly to an AI/ML engineering interview talking point:

- **Multi-agent orchestration** — sequential context passing, role specialization, LangGraph/FlowiseAI patterns
- **RAG vs Fine-tuning** — when to use each, trade-offs explained in the Blueprint tab
- **Vector embeddings** — how text becomes points in 384-dimensional space
- **BM25 + hybrid search** — the same technique used by Elasticsearch and Vespa
- **HyDE** — hypothetical document embeddings for vague queries
- **Reciprocal Rank Fusion** — merging ranked lists from multiple retrievers
- **ReAct pattern** — autonomous reasoning loops with tool use
- **DAG execution** — topological sort for workflow node ordering (Kahn's algorithm)
- **SSE streaming** — why first-token latency matters more than total latency
- **Cross-encoder re-ranking** — two-stage retrieval for precision
- **Context API as event bus** — lightweight pub/sub without Redux

The **Blueprint** tab has model answers to all of these, ready for interviews.

---

## 🛠️ Ten Panels in One

### 👥 Multi-Agent Pipeline ✨ NEW
Chain specialized AI agents sequentially — Research → Write → Review, Analyze → Summarize → Format, or Search → Synthesize → Answer. Each agent has a role, optional tool (web search or doc retrieval), and sees all prior agents' outputs as context. Tokens stream live per agent.

### 🔀 Agent Workflow Builder
Visual drag-and-drop canvas (React Flow) to chain AI operations without writing code. Six node types: **Input**, **LLM Call**, **Retrieval**, **Web Search**, **Transform**, **Output**. Connect them into a DAG, hit Run, and watch each node execute in real time with SSE streaming. Nodes light up green as they complete. Use `{{nodeId}}` in LLM prompts to inject upstream outputs. Save and load pipelines as JSON.

### 🧠 ReAct Agent
A ReAct (Reasoning + Acting) loop that thinks, picks a tool, reads the result, and iterates — up to 7 times — before giving a final answer. Streams every reasoning step to the UI in real time.

### 💬 RAG Chat
Upload documents and chat with them. Four retrieval strategies, four chunking strategies, cross-encoder re-ranking, and a real-time process monitor showing every pipeline step.

### 🔭 Visualize
Three tools that make the invisible visible:
- **Embedding Space** — PCA scatter plot of every chunk in your collection. Scroll to zoom, drag to pan, hover any dot to read the chunk. Type a query to see where it lands in vector space.
- **Context Window Inspector** — Before the LLM answers, see exactly what goes into its prompt: system prompt, each retrieved chunk with its relevance score, and your question — with token counts and a colour-coded usage bar.
- **Chunking Visualizer** — Paste any text and see it split by all 4 strategies simultaneously. Compare chunk count, average size, and boundary placement side by side.

### 🧪 RAG Evaluation
Paste in a list of questions, pick a retrieval strategy, hit Run — and get three quantitative metrics per question: **context relevance** (cosine similarity of retrieved chunks), **answer faithfulness** (LLM judge), and **answer relevance** (embedding similarity). Aggregate bars show overall pipeline quality.

### 🎮 Quiz Game
Pick any topic → the model suggests subtopics → generates MCQ questions from your documents, the web, or its own knowledge. Scored, timed, with full post-game analysis.

### 📄 CV → Portfolio
Upload a PDF resume → the LLM parses it into structured JSON → renders it as a beautiful animated portfolio page. Five visual templates to choose from.

### 📐 Blueprint
An interactive docs page explaining every architectural decision — with a **Setup Guide** section (prerequisites, Docker + local dev commands, env vars table), live system metrics, pipeline diagrams, concept explainers, retrieval strategy comparisons, and an interview cheat sheet.

### 🏠 Welcome Home
Opens by default. Explains every tool with feature cards, a 3-step quick start, and a backend troubleshooting hint.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (React 18 + Vite)              │
│  Home │ Chat │ Agent │ Quiz │ Portfolio │ Eval │ Visualize │ Workflow │ Multi-Agent │ Blueprint │
│          │          SSE Streaming ←→                      │
└──────────────────────────┬───────────────────────────────┘
                           │ /api/v1/* (X-API-Key)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   FastAPI (Python)                        │
│  Auth middleware · Async routes · Pydantic validation     │
│                                                           │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  ChromaDB   │  │   Ollama   │  │     SQLite        │  │
│  │  Vector DB  │  │  LLM :11434│  │  perf · game · rate│  │
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

**Prerequisites:** Python 3.11+ · Node.js 18+ · [Ollama](https://ollama.com/)

```bash
# 1. Clone
git clone https://github.com/yourusername/RAG-Assistant.git
cd RAG-Assistant

# 2. Backend
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
ollama pull granite4.1:8b
cp .env.example .env
.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev   # → http://localhost:5173
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

# Groq (optional — no GPU needed)
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

## 🎨 Portfolio Templates

| Template | Vibe |
|---|---|
| **Basic** | Clean gradient hero · skills pills · timeline experience |
| **Creative** | Dark full-bleed hero · animated orbs · skill bars · numbered sections |
| **Dark** | Full terminal session · CRT scanlines · green↔amber toggle · blinking cursor |
| **Old School** | Parchment background · serif letterhead · classical PART ONE / TWO / THREE sections |
| **90's** | Comic Sans · GeoCities chaos · Windows 95 dialog boxes · rainbow dividers · Fun↔Chaos toggle |

---

## 📡 API Reference

All endpoints require `X-API-Key: enterprise-rag-secret` header.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/status` | System health — Ollama, ChromaDB, model loaded |
| `GET` | `/api/v1/models` | List available Ollama models |
| `POST` | `/api/v1/chat` | RAG query — SSE streaming |
| `POST` | `/api/v1/agent` | ReAct agent loop — SSE streaming |
| `POST` | `/api/v1/multi-agent/run` | Multi-agent pipeline — SSE streaming |
| `GET` | `/api/v1/multi-agent/templates` | List built-in pipeline templates |
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

## 🗂️ Project Structure

```
RAG-Assistant/
├── docker-compose.yml
├── backend/
│   ├── tests/                       # 39 pytest tests
│   ├── requirements.txt
│   └── app/
│       ├── api/routes/              # chat · agent · multi_agent · portfolio · game · perf · eval · visualize
│       ├── services/
│       │   ├── retrieval/           # 4 retrieval strategies
│       │   ├── multi_agent_engine.py  # sequential pipeline + 3 templates
│       │   ├── workflow_engine.py   # DAG executor — topo sort + SSE per-node streaming
│       │   ├── agent.py             # ReAct loop — MAX_ITERATIONS=7
│       │   ├── vector_store.py      # ChromaDB wrapper
│       │   ├── rate_limiter.py      # SQLite 100 req/day per UUID
│       │   ├── portfolio_parser.py  # PDF → LLM → JSON
│       │   ├── reranker.py          # Cross-encoder re-ranking
│       │   └── eval_metrics.py      # context_relevance · faithfulness · answer_relevance
│       └── main.py                  # FastAPI app + auth middleware
└── frontend/
    └── src/
        ├── App.tsx                  # Layout — collapsible sidebar + 10 tab panels
        ├── api/client.ts            # Typed fetch wrappers + SSE generators
        ├── context/                 # ProcessContext — real-time event bus
        └── components/
            ├── MultiAgentPage.tsx   # Multi-agent pipeline — 3 templates, live streaming
            ├── WorkflowPage.tsx     # React Flow canvas · 6 node types · DAG execution
            ├── AgentPage.tsx        # ReAct agent with tool visualization
            ├── Chat.tsx             # RAG chat with process monitor
            ├── VisualizePage.tsx    # Embedding scatter · Context inspector · Chunking visualizer
            ├── EvalPage.tsx         # RAG eval — SSE streaming results
            ├── PortfolioPage.tsx    # 5 templates: Basic · Creative · Dark · OldSchool · 90's
            ├── Blueprint.tsx        # 8-section docs with scrollspy + interview Q&A
            ├── HomePage.tsx         # Welcome screen: hero · quick start · feature cards
            ├── TerminalSidebar.tsx  # Real-time color-coded process monitor
            └── game/                # Quiz game components
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
