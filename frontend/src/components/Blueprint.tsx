import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, ChevronDown, Database, Server, Globe, Zap,
  Search, GitMerge, Lightbulb, FileText, ArrowRight,
  Check, Cpu, BookOpen, BarChart2, Terminal,
  Brain, Code2, Network, Mic, Trophy, Target, Box,
  ShieldCheck, Shuffle, GitBranch, FlaskConical, BrainCircuit, Eye,
} from "lucide-react";
import { fetchPerfStats } from "../api/client";

// ─── helpers ──────────────────────────────────────────────────────────────

function Counter({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!to) return;
    const start = Date.now();
    const t = setInterval(() => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(ease * to));
      if (p >= 1) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [to, duration]);
  return <>{count}{suffix}</>;
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
      {children}
    </span>
  );
}

// ─── 1. hero ─────────────────────────────────────────────────────────────

const TECH_BADGES = [
  { label: "FastAPI",          color: "bg-green-100 text-green-700" },
  { label: "React 18",         color: "bg-blue-100 text-blue-700" },
  { label: "ChromaDB",         color: "bg-purple-100 text-purple-700" },
  { label: "Ollama",           color: "bg-orange-100 text-orange-700" },
  { label: "sentence-transformers", color: "bg-pink-100 text-pink-700" },
  { label: "Framer Motion",    color: "bg-indigo-100 text-indigo-700" },
  { label: "SSE Streaming",    color: "bg-cyan-100 text-cyan-700" },
  { label: "SQLite",           color: "bg-amber-100 text-amber-700" },
  { label: "BM25",             color: "bg-red-100 text-red-700" },
  { label: "Vite",             color: "bg-violet-100 text-violet-700" },
  { label: "Tailwind CSS",     color: "bg-teal-100 text-teal-700" },
  { label: "TypeScript",       color: "bg-sky-100 text-sky-700" },
  { label: "ReAct Agent",      color: "bg-violet-100 text-violet-700" },
  { label: "CrossEncoder",     color: "bg-rose-100 text-rose-700" },
  { label: "pdfplumber",       color: "bg-yellow-100 text-yellow-700" },
  { label: "DiceBear",         color: "bg-lime-100 text-lime-700" },
];

function Hero() {
  return (
    <div className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl overflow-hidden px-8 py-14 mb-10">
      {/* background grid */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(#4f6ef720 1px,transparent 1px),linear-gradient(90deg,#4f6ef720 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative z-10 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="text-brand-400 font-mono text-xs tracking-widest font-bold">ENTERPRISE RAG ASSISTANT</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl font-black text-white mt-3 leading-tight"
        >
          Blueprint
          <span className="text-brand-400">.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="text-gray-400 mt-3 text-base leading-relaxed"
        >
          A production-style AI system that runs <span className="text-brand-400 font-semibold">fully local with Ollama</span> or <span className="text-purple-400 font-semibold">cloud-hosted via Groq</span> — same codebase, your choice of infrastructure.
          Everything from vector embeddings to streaming LLM responses, explained layer by layer.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap gap-2 mt-5"
        >
          {TECH_BADGES.map((b, i) => (
            <motion.span
              key={b.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.04 }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}
            >
              {b.label}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* decorative orbs */}
      <div className="absolute right-12 top-10 w-48 h-48 bg-brand-500 rounded-full opacity-5 blur-3xl" />
      <div className="absolute right-32 bottom-4 w-32 h-32 bg-purple-500 rounded-full opacity-10 blur-2xl" />
    </div>
  );
}

// ─── 2. live metrics ──────────────────────────────────────────────────────

interface Stat { label: string; value: number; suffix?: string; color: string; icon: React.ElementType }

function LiveMetrics() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [systemData, setSystemData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [sysRes, perfStats] = await Promise.all([
          fetch("/api/v1/status", { headers: { "X-API-Key": "enterprise-rag-secret" } }).then(r => r.json()),
          fetchPerfStats(),
        ]);
        setSystemData(sysRes);
        const totalQueries = perfStats.reduce((a: number, s: any) => a + (s.queries ?? 0), 0);
        setStats([
          { label: "Chunks Indexed",    value: sysRes.total_chunks ?? 0,   color: "text-brand-500",   icon: Database  },
          { label: "Collections",       value: sysRes.collections ?? 0,    color: "text-purple-500",  icon: Box       },
          { label: "Queries Logged",    value: totalQueries,               color: "text-green-500",   icon: BarChart2 },
          { label: "Strategies Used",   value: perfStats.length,           color: "text-orange-500",  icon: GitBranch },
        ]);
      } catch { /* backend may be sleeping */ }
    };
    load();
  }, []);

  if (!stats.length) return null;

  return (
    <FadeIn className="mb-10">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm"
          >
            <s.icon size={18} className={`mx-auto mb-1 ${s.color}`} />
            <p className={`text-2xl font-black ${s.color}`}>
              <Counter to={s.value} suffix={s.suffix ?? ""} />
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>
      {systemData && (
        <p className="text-center text-xs text-gray-400 mt-2 font-mono">
          Live · {systemData.ollama} · {systemData.embedding_model} · {systemData.vector_db}
        </p>
      )}
    </FadeIn>
  );
}

// ─── 3. rag pipeline ─────────────────────────────────────────────────────

const INGEST_STEPS = [
  { icon: FileText,  label: "Upload Doc",    desc: "PDF / DOCX / TXT",        color: "bg-blue-500" },
  { icon: Shuffle,   label: "Chunk",         desc: "4 strategies",             color: "bg-purple-500" },
  { icon: Brain,     label: "Embed",         desc: "all-MiniLM-L6-v2",        color: "bg-pink-500" },
  { icon: Database,  label: "Store",         desc: "ChromaDB (cosine)",       color: "bg-teal-500" },
];

const QUERY_STEPS = [
  { icon: Search,    label: "User Query",    desc: "natural language",         color: "bg-orange-500" },
  { icon: Brain,     label: "Embed Query",   desc: "same model",               color: "bg-pink-500" },
  { icon: Network,   label: "Retrieve",      desc: "Naive / Hybrid / HyDE / MQ", color: "bg-brand-500" },
  { icon: Layers,    label: "Augment",       desc: "inject context",           color: "bg-indigo-500" },
  { icon: Cpu,       label: "Ollama LLM",    desc: "granite4.1:8b",           color: "bg-green-500" },
  { icon: Zap,       label: "Stream Answer", desc: "SSE tokens",               color: "bg-amber-500" },
];

const AGENT_STEPS = [
  { icon: Search,       label: "Question",   desc: "any question",             color: "bg-orange-500" },
  { icon: Brain,        label: "Thought",    desc: "reason + plan",            color: "bg-violet-500" },
  { icon: Zap,          label: "Action",     desc: "pick a tool",              color: "bg-brand-500" },
  { icon: Eye,          label: "Observe",    desc: "read tool result",         color: "bg-sky-500" },
  { icon: BrainCircuit, label: "Iterate",    desc: "up to 7 times",            color: "bg-purple-500" },
  { icon: Check,        label: "Answer",     desc: "Final Answer SSE",         color: "bg-green-500" },
];

function PipelineRow({ steps, title }: { steps: typeof INGEST_STEPS; title: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</p>
      <div className="flex items-center flex-wrap gap-2">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className={`${s.color} rounded-xl p-2.5 shadow-md`}>
                <s.icon size={18} className="text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-700 mt-1.5">{s.label}</p>
              <p className="text-[10px] text-gray-400">{s.desc}</p>
            </motion.div>
            {i < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 + 0.08 }}
                className="origin-left"
              >
                <ArrowRight size={16} className="text-gray-300 mb-5" />
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RAGPipeline() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">How It Works</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">The RAG Pipeline</h2>
      <p className="text-gray-500 text-sm mb-6">Two distinct phases — offline ingestion and real-time retrieval.</p>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
        <PipelineRow steps={INGEST_STEPS} title="① Ingestion (once per document)" />
        <div className="border-t border-dashed border-gray-200 my-4" />
        <PipelineRow steps={QUERY_STEPS} title="② Chat Query (every request)" />
        <div className="border-t border-dashed border-gray-200 my-4" />
        <PipelineRow steps={AGENT_STEPS} title="③ Agent Mode — ReAct loop (multi-step)" />
      </div>
    </FadeIn>
  );
}

// ─── 4. architecture diagram ──────────────────────────────────────────────

function ArchDiagram() {
  const boxes = [
    { label: "Browser",         sub: "React 18 + Vite",          color: "border-blue-300 bg-blue-50",   icon: Globe,    col: 1, row: 1 },
    { label: "FastAPI",         sub: "Python 3.14",               color: "border-green-300 bg-green-50", icon: Server,   col: 2, row: 1 },
    { label: "ChromaDB",        sub: "Vector store · cosine",     color: "border-purple-300 bg-purple-50",icon: Database, col: 3, row: 0 },
    { label: "Ollama",          sub: "granite4.1:8b local LLM",  color: "border-orange-300 bg-orange-50",icon: Cpu,      col: 3, row: 1 },
    { label: "SQLite",          sub: "game.db + perf.db",        color: "border-amber-300 bg-amber-50",  icon: Box,      col: 3, row: 2 },
    { label: "sentence-xformers",sub:"all-MiniLM-L6-v2",         color: "border-pink-300 bg-pink-50",   icon: Brain,    col: 2, row: 2 },
  ];

  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">System Design</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">Architecture</h2>
      <p className="text-gray-500 text-sm mb-6">Every component runs locally — zero external API calls.</p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="grid grid-cols-3 gap-4 items-center">
          {[
            { label: "Browser",          sub: "React 18 + Vite :5173",    color: "border-blue-300 bg-blue-50",    icon: Globe    },
            { label: "FastAPI Backend",  sub: "Python · Uvicorn :8000",   color: "border-green-300 bg-green-50",  icon: Server   },
            { label: "Services Layer",   sub: "ChromaDB · Ollama · SQLite",color:"border-purple-300 bg-purple-50",icon: Layers   },
          ].map((box, i) => (
            <div key={box.label} className="flex items-center gap-3">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className={`flex-1 border-2 rounded-xl p-3 ${box.color}`}
              >
                <box.icon size={16} className="text-gray-600 mb-1" />
                <p className="text-sm font-bold text-gray-800">{box.label}</p>
                <p className="text-[11px] text-gray-500">{box.sub}</p>
              </motion.div>
              {i < 2 && <ArrowRight size={16} className="text-gray-300 shrink-0" />}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-gray-100 pt-4 grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
          {[
            { label: "Auth",        desc: "X-API-Key middleware",     icon: ShieldCheck, color: "text-red-500" },
            { label: "Streaming",   desc: "SSE / async generators",   icon: Zap,         color: "text-amber-500" },
            { label: "Embeddings",  desc: "sentence-transformers",    icon: Brain,       color: "text-pink-500" },
            { label: "BM25 Index",  desc: "rank-bm25 on candidates",  icon: Search,      color: "text-blue-500" },
            { label: "Perf Log",    desc: "SQLite query_perf table",  icon: BarChart2,   color: "text-green-500" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className="bg-gray-50 rounded-lg p-2"
            >
              <item.icon size={14} className={`mx-auto ${item.color}`} />
              <p className="text-xs font-semibold text-gray-700 mt-1">{item.label}</p>
              <p className="text-[10px] text-gray-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

// ─── 5. what we built ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Search, color: "bg-brand-500", title: "4 Retrieval Strategies",
    desc: "Naive Dense, Hybrid BM25+Dense, HyDE, and Multi-Query with RRF merge.",
    tags: [{ label: "RAG Core", color: "bg-brand-50 text-brand-600" }],
  },
  {
    icon: Shuffle, color: "bg-purple-500", title: "4 Chunking Strategies",
    desc: "Recursive, Semantic (paragraph), Sentence Window, and Fixed-size chunking at upload time.",
    tags: [{ label: "Ingestion", color: "bg-purple-50 text-purple-600" }],
  },
  {
    icon: BarChart2, color: "bg-green-500", title: "Performance Analytics",
    desc: "Every query logs retrieval ms, LLM ms, avg relevance score, and chunks retrieved to SQLite.",
    tags: [{ label: "Observability", color: "bg-green-50 text-green-600" }],
  },
  {
    icon: Terminal, color: "bg-gray-700", title: "Process Monitor",
    desc: "Real-time terminal sidebar showing every pipeline step with color-coded event tags and status dots.",
    tags: [{ label: "DevEx", color: "bg-gray-100 text-gray-600" }],
  },
  {
    icon: Trophy, color: "bg-amber-500", title: "Quiz Game Mode",
    desc: "MCQ questions generated from documents, web search, and model knowledge. Streamed SSE setup with scoring.",
    tags: [{ label: "Game", color: "bg-amber-50 text-amber-600" }],
  },
  {
    icon: Globe, color: "bg-cyan-500", title: "Web Search Integration",
    desc: "DuckDuckGo (ddgs) fetches live sources and injects them alongside document context for richer questions.",
    tags: [{ label: "External", color: "bg-cyan-50 text-cyan-600" }],
  },
  {
    icon: Cpu, color: "bg-orange-500", title: "100% Local LLM",
    desc: "Ollama serves Granite 4.1 8B locally — all inference stays on-device, no API keys or quota limits.",
    tags: [{ label: "Privacy", color: "bg-orange-50 text-orange-600" }],
  },
  {
    icon: Layers, color: "bg-pink-500", title: "Multi-Collection",
    desc: "Multiple ChromaDB collections let you separate document sets and switch context in one click.",
    tags: [{ label: "Multi-tenant", color: "bg-pink-50 text-pink-600" }],
  },
  {
    icon: BrainCircuit, color: "bg-violet-500", title: "ReAct Agent Mode",
    desc: "Autonomous reasoning loop — the agent thinks, picks a tool (docs / web / calculator), observes the result, and iterates up to 7 times before giving a final answer.",
    tags: [{ label: "Agent", color: "bg-violet-50 text-violet-600" }],
  },
  {
    icon: Search, color: "bg-rose-500", title: "Cross-Encoder Re-ranking",
    desc: "Two-stage retrieval: fetch 3× candidates with dense search, then score every pair with ms-marco-MiniLM-L6-v2 to surface the most relevant chunks.",
    tags: [{ label: "Precision", color: "bg-rose-50 text-rose-600" }],
  },
  {
    icon: FileText, color: "bg-lime-600", title: "CV → Portfolio Generator",
    desc: "Upload a PDF resume — pdfplumber extracts text and embedded photos, the LLM parses it into structured JSON, and it renders an animated portfolio page with a DiceBear avatar.",
    tags: [{ label: "LLM Parsing", color: "bg-lime-50 text-lime-700" }],
  },
];

function WhatWeBuilt() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Features</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">What We Built</h2>
      <p className="text-gray-500 text-sm mb-6">Eleven production-grade capabilities, each independently useful.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm cursor-default"
          >
            <div className={`${f.color} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
              <f.icon size={17} className="text-white" />
            </div>
            <p className="font-bold text-gray-800 text-sm">{f.title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {f.tags.map(t => <Tag key={t.label} color={t.color}>{t.label}</Tag>)}
            </div>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── 6. concepts deep dive ────────────────────────────────────────────────

const CONCEPTS = [
  {
    icon: Brain, color: "text-brand-500",
    title: "RAG — Retrieval-Augmented Generation",
    tldr: "Give the LLM a relevant book page before asking a question.",
    what: "Instead of relying on what the model memorised during training, RAG fetches relevant document chunks at query time and injects them into the prompt. The model reasons over fresh, specific context — not stale weights.",
    why: "Prevents hallucination on domain-specific facts. Updates 'knowledge' by re-indexing documents, not re-training. Cheaper than fine-tuning. Auditable — you can show which sources were used.",
    when: "Any time you need a model to answer questions about a private or frequently-updated corpus: internal docs, legal contracts, codebases, research papers.",
  },
  {
    icon: Database, color: "text-purple-500",
    title: "Vector Embeddings & Similarity Search",
    tldr: "Convert text to a point in 384-dimensional space. Nearby points = similar meaning.",
    what: "A sentence encoder (all-MiniLM-L6-v2) transforms any text into a dense float array. Sentences with similar meaning land close together in this space. ChromaDB stores these vectors and finds the K nearest neighbors to a query vector using cosine similarity.",
    why: "Captures semantic meaning, not just keywords. 'car' and 'automobile' will be close even though they share zero letters. Traditional keyword search misses this.",
    when: "When you need to match concepts, not exact strings. Core to RAG, semantic search, recommendation systems, and duplicate detection.",
  },
  {
    icon: Search, color: "text-blue-500",
    title: "BM25 — Keyword Relevance Ranking",
    tldr: "TF-IDF's smarter cousin. Rewards rare, query-matching words but penalises very long documents.",
    what: "BM25 (Best Match 25) scores documents based on term frequency, inverse document frequency, and document length normalisation. It's the backbone of Elasticsearch and Lucene. In this project, BM25 runs on the top-4K dense candidates and its score is blended with the cosine score.",
    why: "Dense embeddings can miss exact-match signals (product codes, names, acronyms). Hybrid search combines both worlds: semantic understanding + keyword precision.",
    when: "When queries include specific identifiers, jargon, or proper nouns that embeddings might not distinguish well.",
  },
  {
    icon: Lightbulb, color: "text-amber-500",
    title: "HyDE — Hypothetical Document Embeddings",
    tldr: "Ask the LLM to write the answer first, then search for real documents that look like it.",
    what: "The LLM generates a short hypothetical passage that would answer the query. That passage is embedded — not the original query — and used to search ChromaDB. Real documents that resemble the hypothetical answer surface naturally.",
    why: "Queries are often short and ambiguous ('revenue Q3'). A hypothetical answer is longer and more descriptive, giving the embedding model much more signal to work with.",
    when: "Complex, open-ended questions where the query itself is vague but the expected answer format is predictable.",
  },
  {
    icon: GitMerge, color: "text-orange-500",
    title: "Multi-Query + Reciprocal Rank Fusion",
    tldr: "Ask 3 variations of the same question, then merge the result lists smartly.",
    what: "The LLM rewrites the query 3 ways. Each variation retrieves its own ranked list. RRF merges them using score = Σ(1/(k + rank)) — giving consistent credit to documents that appear across multiple lists, regardless of their individual scores.",
    why: "A single query might miss relevant chunks due to phrasing. Multiple phrasings cast a wider net. RRF is robust to score magnitude differences between lists.",
    when: "Broad research questions, exploratory queries, or any case where one phrasing might miss relevant results.",
  },
  {
    icon: Shuffle, color: "text-green-500",
    title: "Chunking Strategies",
    tldr: "How you split a document dramatically affects retrieval quality.",
    what: "Recursive: sentence-boundary sliding window (balanced). Semantic: paragraph-aware merge/split (preserves structure). Sentence Window: groups sentences into fixed-count windows (precision). Fixed: exact char slices (speed).",
    why: "Too-large chunks include noise. Too-small chunks lose context. Strategy choice trades off retrieval precision vs. context richness vs. ingest speed.",
    when: "Choose Semantic for structured reports, Sentence for Q&A datasets, Recursive as a safe default, Fixed when ingest throughput matters most.",
  },
  {
    icon: Zap, color: "text-cyan-500",
    title: "SSE Streaming (Server-Sent Events)",
    tldr: "The server pushes data tokens to the browser as they're generated, not all at once.",
    what: "FastAPI's StreamingResponse with media_type='text/event-stream' writes 'data: {...}\\n\\n' lines as the LLM generates tokens. The React client reads these with a ReadableStream decoder. This also streams game setup status messages so users see progress.",
    why: "LLM inference takes 5-30 seconds. Without streaming the UI appears frozen. First-token latency under 500ms feels instant even if full completion takes longer.",
    when: "Any LLM integration, live progress updates, file processing status, real-time dashboards.",
  },
  {
    icon: BrainCircuit, color: "text-violet-500",
    title: "ReAct — Reasoning + Acting Agent Loop",
    tldr: "The LLM alternates between thinking aloud and calling tools, looping until it has a confident answer.",
    what: "ReAct structures LLM output as Thought → Action → Action Input. The backend parses this with regex, executes the named tool (ChromaDB search, DuckDuckGo, safe eval, or direct answer), and returns an Observation. The loop continues for up to MAX_ITERATIONS=7. Every step streams to the frontend as a typed SSE event.",
    why: "Single-pass RAG retrieves once and hopes for the best. An agent can search documents, pivot to the web if docs are lacking, do math on the result, and only answer once all sub-questions are resolved. It can also self-correct — if a tool call returns nothing useful, it chooses a different tool or rephrases the query.",
    when: "Complex questions requiring multiple sources or reasoning steps: 'Compare revenue in my uploaded report with today's market data.' or 'What is 15% of the total chunks indexed in this collection?'",
  },
  {
    icon: FlaskConical, color: "text-pink-500",
    title: "React Context as an Event Bus",
    tldr: "useReducer + Context = lightweight pub/sub without Redux.",
    what: "ProcessContext holds a capped ring-buffer (120 events) of typed log entries. Any component can call log(tag, message, status) to append an event. TerminalSidebar subscribes and renders them. Zero prop-drilling, zero external state library.",
    why: "The terminal monitor needs to receive events from hooks, route components, and game logic simultaneously. Context avoids tight coupling while keeping bundle size minimal.",
    when: "Cross-cutting concerns (logging, toasts, feature flags) where many producers feed one consumer.",
  },
];

function Concepts() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Deep Dive</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">Concepts Explained</h2>
      <p className="text-gray-500 text-sm mb-6">Click any concept to expand — understand the why behind each decision.</p>
      <div className="space-y-2">
        {CONCEPTS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
            >
              <c.icon size={18} className={c.color} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{c.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{c.tldr}</p>
              </div>
              <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} className="text-gray-400" />
              </motion.div>
            </button>

            <AnimatePresence>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                    <div className="pt-3 grid sm:grid-cols-3 gap-3">
                      {[
                        { label: "What it is",  text: c.what, accent: "border-l-brand-400" },
                        { label: "Why it matters", text: c.why, accent: "border-l-green-400" },
                        { label: "When to use",   text: c.when, accent: "border-l-amber-400" },
                      ].map(col => (
                        <div key={col.label} className={`border-l-2 ${col.accent} pl-3`}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{col.label}</p>
                          <p className="text-xs text-gray-600 leading-relaxed">{col.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── 7. retrieval strategy comparison ─────────────────────────────────────

const STRATEGIES = [
  { id: "naive",       label: "Naive Dense",      color: "border-blue-400 bg-blue-50",    badge: "bg-blue-100 text-blue-700",
    speed: 95, precision: 60, complexity: 10,
    use: "Baseline. Fast and good enough for most well-structured documents.",
    avoid: "Short queries with rare terms — embeddings won't catch exact matches.",
  },
  { id: "hybrid",      label: "Hybrid BM25+Dense",color: "border-green-400 bg-green-50",  badge: "bg-green-100 text-green-700",
    speed: 75, precision: 80, complexity: 45,
    use: "When queries contain specific names, codes, or jargon. Best all-rounder.",
    avoid: "Very small corpora (<50 chunks) where BM25 adds overhead without benefit.",
  },
  { id: "hyde",        label: "HyDE",             color: "border-purple-400 bg-purple-50", badge: "bg-purple-100 text-purple-700",
    speed: 40, precision: 85, complexity: 65,
    use: "Open-ended research questions with predictable answer shapes.",
    avoid: "Factual lookups — if the LLM generates a wrong hypothesis, retrieval fails.",
  },
  { id: "multi_query", label: "Multi-Query + RRF", color: "border-orange-400 bg-orange-50", badge: "bg-orange-100 text-orange-700",
    speed: 25, precision: 90, complexity: 80,
    use: "Exploratory queries, broad topics where a single phrasing might miss results.",
    avoid: "Latency-sensitive applications — 3 LLM calls + 4 retrieve calls adds up.",
  },
];

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-6 text-right">{value}</span>
    </div>
  );
}

function StrategyComparison() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Comparison</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">Retrieval Strategy Trade-offs</h2>
      <p className="text-gray-500 text-sm mb-6">Higher precision costs more latency. Choose based on your use case.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STRATEGIES.map((s, i) => (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className={`border-2 rounded-xl p-4 ${s.color}`}
          >
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badge}`}>{s.id}</span>
            <p className="font-bold text-gray-800 text-sm mt-2 mb-3">{s.label}</p>
            <div className="space-y-1.5 text-[10px] text-gray-500 mb-3">
              <div><span className="font-semibold">Speed</span> <Bar value={s.speed} color="bg-green-400" /></div>
              <div><span className="font-semibold">Precision</span> <Bar value={s.precision} color="bg-brand-400" /></div>
              <div><span className="font-semibold">Complexity</span> <Bar value={s.complexity} color="bg-red-300" /></div>
            </div>
            <div className="border-t border-black/5 pt-2 space-y-1">
              <p className="text-[10px] text-gray-600"><span className="text-green-600 font-bold">✓ </span>{s.use}</p>
              <p className="text-[10px] text-gray-600"><span className="text-red-400 font-bold">✗ </span>{s.avoid}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── 8. what this proves ──────────────────────────────────────────────────

const PROOF_ITEMS = [
  { icon: Brain,     color: "bg-brand-500",  skill: "Embedding & Semantic Search",
    proves: "You understand how text becomes vectors, why cosine similarity works, and how to build a semantic retrieval layer from scratch." },
  { icon: Database,  color: "bg-purple-500", skill: "Vector Database Design",
    proves: "You can set up ChromaDB, manage collections, add metadata, and query with filters — knowledge directly applicable to Pinecone, Weaviate, Qdrant." },
  { icon: Server,    color: "bg-green-500",  skill: "Production API Design",
    proves: "FastAPI with auth middleware, streaming responses, async routes, Pydantic validation, and structured error handling." },
  { icon: Zap,       color: "bg-amber-500",  skill: "Streaming Architecture",
    proves: "You know why SSE exists, how async generators work in Python, and how ReadableStream parsing works in the browser." },
  { icon: GitMerge,  color: "bg-orange-500", skill: "Search Relevance Engineering",
    proves: "BM25 tuning, score normalisation, alpha blending, and RRF — the same techniques used at Google, Elastic, and Vespa." },
  { icon: Cpu,       color: "bg-red-500",    skill: "Local LLM Integration",
    proves: "Ollama setup, model switching, prompt engineering, hypothetical document generation, and managing LLM latency in a product." },
  { icon: Code2,     color: "bg-sky-500",    skill: "Full-Stack TypeScript",
    proves: "React hooks, context API as event bus, custom async generators, Framer Motion animations, and Tailwind design systems." },
  { icon: Target,    color: "bg-pink-500",   skill: "Observability & Performance",
    proves: "You instrument pipelines (retrieval ms, LLM ms, relevance scores), persist metrics to SQLite, and surface them in a live dashboard." },
  { icon: BrainCircuit, color: "bg-violet-500", skill: "Agentic AI & ReAct Pattern",
    proves: "You can implement an autonomous reasoning loop, parse structured LLM output with regex, integrate multiple tools, and stream intermediate reasoning steps to the UI in real time." },
  { icon: FileText,     color: "bg-lime-600",   skill: "LLM-Powered Document Parsing",
    proves: "You can extract structured data from unstructured PDFs using an LLM, handle edge cases (missing fields, embedded images), and render the result as a dynamic UI — a real-world data extraction pipeline." },
];

function ProofOfSkills() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Skills Map</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">What This Project Proves You Know</h2>
      <p className="text-gray-500 text-sm mb-6">Each feature maps directly to an in-demand engineering skill.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        {PROOF_ITEMS.map((p, i) => (
          <motion.div
            key={p.skill}
            initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="flex gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
          >
            <div className={`${p.color} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
              <p.icon size={15} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{p.skill}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{p.proves}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── 9. interview cheat sheet ─────────────────────────────────────────────

const INTERVIEW_QA = [
  {
    q: "Explain RAG and when you'd use it over fine-tuning.",
    a: "RAG retrieves relevant documents at inference time and injects them into the prompt, so the model reasons over fresh context rather than memorised weights. I'd choose RAG when the knowledge is domain-specific, changes frequently, needs to be auditable, or when I don't have the compute/data budget for fine-tuning. Fine-tuning wins when you need the model to learn a consistent style or new reasoning patterns.",
  },
  {
    q: "How does vector similarity search work at scale?",
    a: "Documents are embedded into high-dimensional vectors using an encoder model. At query time the query is embedded the same way, and we find nearest neighbours using cosine similarity. ChromaDB uses HNSW (Hierarchical Navigable Small World) graphs for approximate nearest neighbour search — sub-linear time complexity instead of exhaustive O(n). At larger scales (millions of docs) you'd add quantisation and sharding.",
  },
  {
    q: "What is the difference between your retrieval strategies?",
    a: "Naive Dense is direct vector search — fast but misses exact-match signals. Hybrid adds BM25 keyword scoring on top of dense candidates, blended with alpha weighting — good for domain jargon. HyDE generates a hypothetical answer first then searches — the richer embedding improves recall for vague queries. Multi-Query expands to 3 phrasings and merges via RRF — best recall but 4× the latency.",
  },
  {
    q: "How did you handle streaming LLM responses?",
    a: "FastAPI's StreamingResponse with media_type='text/event-stream' writes SSE-formatted lines as the Ollama stream yields tokens. The React client parses the ReadableStream with a TextDecoder, splitting on newlines and extracting data: prefixes. The final event carries sources and performance metadata. This gives sub-500ms first-token display while the full answer generates over several seconds.",
  },
  {
    q: "How would you productionise this system?",
    a: "Add authentication (JWT not just API key), rate limiting, and multi-tenant collection isolation. Move ChromaDB to a managed vector store (Pinecone/Weaviate) with replication. Add a re-ranker (cross-encoder) after retrieval for better precision. Cache embeddings for repeated queries. Add a proper observability stack (OpenTelemetry → Grafana). Replace SQLite with Postgres for concurrent writes. Add a queue for async document ingestion.",
  },
  {
    q: "What is BM25 and why did you use it in hybrid retrieval?",
    a: "BM25 ranks documents by term frequency (how often query terms appear) weighted by inverse document frequency (rarer terms score higher) with document length normalisation. Dense embeddings are great at semantic similarity but can miss exact matches — product codes, names, acronyms. Combining BM25 and dense scores with linear blending (alpha=0.5) gets the benefits of both. This is exactly what production search engines like Elasticsearch use.",
  },
  {
    q: "What is the ReAct pattern and how did you implement it?",
    a: "ReAct (Reasoning + Acting) is a prompting pattern where the LLM interleaves Thought steps and Action steps. My implementation: the system prompt instructs the LLM to always output Thought → Action → Action Input. I parse this with regex, execute the named tool — ChromaDB search, DuckDuckGo web search, safe eval for math, or direct answer — and inject the result back as an Observation. This loops up to MAX_ITERATIONS=7. If the LLM emits a Final Answer, the loop exits. Every step (thought, action, observation, answer) streams to the React frontend as a typed SSE event, so users see the reasoning trace in real time. It's essentially a miniature LangChain agent loop built from scratch.",
  },
];

function InterviewPrep() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <FadeIn className="mb-10">
      <div className="bg-gradient-to-br from-gray-950 to-gray-800 rounded-2xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Mic size={16} className="text-brand-400" />
          <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">Interview Ready</span>
        </div>
        <h2 className="text-2xl font-black text-white mb-1">Cheat Sheet</h2>
        <p className="text-gray-400 text-sm mb-6">6 questions interviewers ask about AI/ML systems. Click to reveal a model answer.</p>
        <div className="space-y-2">
          {INTERVIEW_QA.map((item, i) => (
            <div key={i} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-800 transition-colors"
              >
                <span className="text-brand-400 font-mono text-xs font-bold mt-0.5 shrink-0">Q{i + 1}</span>
                <p className="text-gray-200 text-sm font-medium flex-1">{item.q}</p>
                <motion.div animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} className="text-gray-500 shrink-0 mt-0.5" />
                </motion.div>
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-gray-800">
                      <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

// ─── 10. tech stack ───────────────────────────────────────────────────────

const STACK = [
  { name: "FastAPI",                color: "bg-green-500",   why: "Async Python with auto OpenAPI docs, Pydantic validation, and native streaming support. Fastest Python web framework for I/O-bound workloads." },
  { name: "ChromaDB",               color: "bg-purple-500",  why: "Embedded vector database — no separate server, persists to disk, supports metadata filtering. Great for development and small-to-medium production workloads." },
  { name: "sentence-transformers",  color: "bg-pink-500",    why: "The gold-standard library for dense text embeddings. all-MiniLM-L6-v2 is fast (5ms/query), small (80MB), and performs well on semantic retrieval benchmarks." },
  { name: "Ollama",                 color: "bg-orange-500",  why: "One-command local LLM serving with a clean OpenAI-compatible API. No GPU required for 8B models, handles model management, quantisation, and concurrency." },
  { name: "rank-bm25",              color: "bg-red-500",     why: "Minimal, zero-dependency BM25 implementation. Used to score dense retrieval candidates for the hybrid strategy — no Elasticsearch overhead needed." },
  { name: "React 18 + Vite",        color: "bg-blue-500",    why: "Concurrent rendering for streaming UI. Vite's HMR makes frontend development fast. framer-motion integrates cleanly for production animations." },
  { name: "Framer Motion",          color: "bg-indigo-500",  why: "Declarative animation API that integrates with React's render cycle. AnimatePresence handles mount/unmount, whileInView handles scroll reveals." },
  { name: "SQLite",                 color: "bg-amber-500",   why: "Zero-config persistent storage for game sessions and query performance logs. Enough for development; easy to swap to Postgres in production." },
  { name: "ddgs (DuckDuckGo)",      color: "bg-cyan-500",    why: "The duckduckgo-search package was renamed to ddgs. Provides web search results without an API key — critical for the quiz game's web-source questions." },
];

function TechStack() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Dependencies</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">Tech Stack & Why</h2>
      <p className="text-gray-500 text-sm mb-6">Every choice was deliberate — here's the reasoning you can explain.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {STACK.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <p className="font-bold text-gray-800 text-sm">{s.name}</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{s.why}</p>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── 11. what's next ──────────────────────────────────────────────────────

const NEXT_ITEMS = [
  { icon: Brain,        color: "text-violet-500", title: "Agent Memory & Trace Store",  desc: "Persist agent reasoning traces to SQLite. Let the agent reference past tool calls and avoid redundant searches across sessions." },
  { icon: Brain,        color: "text-pink-500",   title: "Embedding Model Selection",   desc: "Let users pick from bge-small, e5-large, or nomic-embed-text at upload time with automatic re-index on change." },
  { icon: FileText,     color: "text-blue-500",   title: "Multi-modal Ingestion",       desc: "URLs (BeautifulSoup), CSV (pandas), YouTube transcripts (yt-dlp), and images with OCR (pytesseract)." },
  { icon: BarChart2,    color: "text-green-500",  title: "Chunking × Strategy Matrix",  desc: "Track chunk strategy + retrieval strategy combinations in perf.db to find the optimal pairing per collection type." },
  { icon: BookOpen,     color: "text-amber-500",  title: "Chat History Persistence",    desc: "Save conversations to SQLite with session IDs, exportable as JSON or markdown." },
  { icon: BrainCircuit, color: "text-cyan-500",   title: "Structured Tool Calling",     desc: "Replace regex-parsed ReAct output with OpenAI-compatible function calling for more reliable tool dispatch and error recovery." },
  { icon: FileText,     color: "text-lime-600",   title: "Portfolio AI Enhancement",    desc: "Add LLM-powered bullet rewriting, job description tailoring, and skill gap analysis to the CV → Portfolio generator." },
];

function WhatsNext() {
  return (
    <FadeIn className="mb-10">
      <div className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-1">Roadmap</div>
      <h2 className="text-2xl font-black text-gray-900 mb-1">What's Next</h2>
      <p className="text-gray-500 text-sm mb-6">Six concrete improvements ready to build — each adds a new talking point.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NEXT_ITEMS.map((n, i) => (
          <motion.div
            key={n.title}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="bg-white border border-dashed border-gray-300 rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50 transition-colors"
          >
            <n.icon size={18} className={`${n.color} mb-2`} />
            <p className="font-bold text-gray-800 text-sm">{n.title}</p>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.desc}</p>
          </motion.div>
        ))}
      </div>
    </FadeIn>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────

export function Blueprint() {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Hero />
        <LiveMetrics />
        <RAGPipeline />
        <ArchDiagram />
        <WhatWeBuilt />
        <Concepts />
        <StrategyComparison />
        <ProofOfSkills />
        <InterviewPrep />
        <TechStack />
        <WhatsNext />

        <FadeIn>
          <div className="text-center py-8 border-t border-gray-200">
            <p className="text-xs text-gray-400 font-mono">
              Built with Ollama / Groq · ChromaDB · FastAPI · React · sentence-transformers
            </p>
            <p className="text-xs text-gray-300 mt-1 font-mono">
              Local mode: Ollama keeps all data on-device · Hosted mode: Groq cloud LLM, set <code className="text-brand-400">LLM_PROVIDER=groq</code> + <code className="text-brand-400">GROQ_API_KEY</code>
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
