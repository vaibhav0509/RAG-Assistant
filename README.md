<div align="center">

<img src="https://api.dicebear.com/9.x/bottts-neutral/svg?seed=aistudio&backgroundColor=6366f1" width="96" height="96" alt="AI Studio Logo" />

# AI Studio

**A full-stack local AI workspace — five tools, one codebase, zero cloud dependencies.**

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

AI Studio started as a RAG chatbot and grew into a five-tool AI playground — all running locally with Ollama or in the cloud with Groq, using the same codebase. No OpenAI. No API bills. No data leaving your machine (unless you want it to).

```
Upload your documents → ask anything → watch the pipeline work in real time
```

It's both a functional AI toolkit and a showcase of production-grade AI/ML engineering patterns — RAG pipelines, agentic reasoning loops, vector search, SSE streaming, and more.

---

## 🛠️ Five Tools in One

### 💬 RAG Chat
Upload documents and chat with them. Four retrieval strategies, four chunking strategies, cross-encoder re-ranking, and a real-time process monitor showing every pipeline step.

### 🧠 Agent Mode
A ReAct (Reasoning + Acting) loop that thinks, picks a tool, reads the result, and iterates — up to 7 times — before giving a final answer. Streams every reasoning step to the UI in real time.

### 🎮 Quiz Game
Pick any topic → the model suggests subtopics → generates MCQ questions from your documents, the web, or its own knowledge. Scored, timed, with full post-game analysis.

### 📄 CV → Portfolio
Upload a PDF resume → the LLM parses it into structured JSON → renders it as a beautiful animated portfolio page. Five visual templates to choose from.

### 📐 Blueprint
An interactive docs page explaining every architectural decision — with live system metrics, pipeline diagrams, concept explainers, retrieval strategy comparisons, and an interview cheat sheet.

---

## ✨ Key Features

| Feature | Details |
|---|---|
| **4 Retrieval Strategies** | Naive Dense · Hybrid BM25+Dense · HyDE · Multi-Query + RRF |
| **4 Chunking Strategies** | Recursive · Semantic · Sentence Window · Fixed Size |
| **Cross-Encoder Re-ranking** | Two-stage retrieval with `ms-marco-MiniLM-L6-v2` |
| **ReAct Agent** | 4 tools: ChromaDB · DuckDuckGo · Calculator · Direct Answer |
| **SSE Streaming** | Every response streams token-by-token with live progress |
| **Process Monitor** | Real-time terminal sidebar — color-coded pipeline events |
| **Performance Analytics** | Every query logged: retrieval ms · LLM ms · relevance score |
| **5 Portfolio Templates** | Basic · Creative · Dark/Terminal · Old School · 90's GeoCities |
| **Local + Cloud LLM** | Ollama on-device or Groq cloud — same API surface |
| **Fully Responsive** | Icon sidebar on desktop · bottom tab bar on mobile |

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
│  IconNav │ Chat │ Agent │ Quiz │ Portfolio │ Blueprint    │
│          │          SSE Streaming ←→                      │
└──────────────────────────┬───────────────────────────────┘
                           │ /api/v1/* (X-API-Key)
                           ▼
┌──────────────────────────────────────────────────────────┐
│                   FastAPI (Python)                        │
│  Auth middleware · Async routes · Pydantic validation     │
│                                                           │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  ChromaDB   │  │   Ollama   │  │  SQLite          │  │
│  │  Vector DB  │  │  LLM :11434│  │  perf.db game.db │  │
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

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com/) installed and running

### 1. Clone

```bash
git clone https://github.com/yourusername/RAG-Assistant.git
cd RAG-Assistant
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Pull a model
ollama pull granite4.1:8b   # or any model you prefer

# Configure
cp .env.example .env        # set OLLAMA_MODEL, API_KEY, etc.

# Start
.venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 4. (Optional) Use Groq instead of Ollama

```bash
# In backend/.env
LLM_PROVIDER=groq
GROQ_API_KEY=your_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

No other changes needed — the same routes work for both providers.

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
├── backend/
│   ├── app/
│   │   ├── api/routes/          # chat · agent · portfolio · game · perf · status
│   │   ├── services/
│   │   │   ├── retrieval/       # 4 retrieval strategies
│   │   │   ├── vector_store.py  # ChromaDB wrapper
│   │   │   ├── agent.py         # ReAct loop — MAX_ITERATIONS=7
│   │   │   ├── portfolio_parser.py  # PDF → LLM → JSON
│   │   │   └── reranker.py      # Cross-encoder re-ranking
│   │   └── main.py              # FastAPI app + auth middleware
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.tsx              # Layout — icon nav + tab panels
        ├── api/client.ts        # Typed fetch wrappers + SSE generators
        ├── context/             # ProcessContext — real-time event bus
        └── components/
            ├── Chat.tsx
            ├── AgentPage.tsx
            ├── PortfolioPage.tsx # 5 templates: Basic · Creative · Dark · OldSchool · 90's
            ├── Blueprint.tsx    # 8-section docs with scrollspy
            ├── TerminalSidebar.tsx
            └── game/            # Quiz game components
```

---

## 🔭 What's Next

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
