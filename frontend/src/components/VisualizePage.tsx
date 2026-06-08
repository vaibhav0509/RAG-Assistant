import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, Telescope, Search, AlertCircle, RefreshCw } from "lucide-react";
import {
  fetchEmbeddingPoints, inspectContext, visualizeChunks,
  type EmbeddingPoint, type EmbeddingResponse, type ContextResponse, type ChunkStrategyResult,
} from "../api/client";

// ── palette ───────────────────────────────────────────────────────────────

const PALETTE = [
  "#6366f1", "#f97316", "#10b981", "#ec4899",
  "#f59e0b", "#06b6d4", "#8b5cf6", "#84cc16",
  "#ef4444", "#14b8a6",
];

function colorFor(sources: string[], source: string): string {
  const idx = sources.indexOf(source);
  return PALETTE[Math.max(idx, 0) % PALETTE.length];
}

const STRATEGIES = [
  { id: "naive",       label: "Naive Dense"      },
  { id: "hybrid",      label: "Hybrid BM25+Dense"},
  { id: "hyde",        label: "HyDE"             },
  { id: "multi_query", label: "Multi-Query"      },
];

const CHUNK_STRATEGIES = ["recursive", "semantic", "sentence", "fixed"];
const CHUNK_COLORS = [
  "bg-violet-100 border-violet-300",
  "bg-orange-100 border-orange-300",
  "bg-emerald-100 border-emerald-300",
  "bg-pink-100 border-pink-300",
  "bg-amber-100 border-amber-300",
  "bg-cyan-100 border-cyan-300",
  "bg-red-100 border-red-300",
  "bg-teal-100 border-teal-300",
];

// ── shared ────────────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
      <AlertCircle size={14} className="shrink-0" />
      {msg}
    </div>
  );
}

// ── 1. Embedding Scatter ──────────────────────────────────────────────────

function EmbeddingView() {
  const [collection, setCollection] = useState("default");
  const [query, setQuery]           = useState("");
  const [data, setData]             = useState<EmbeddingResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [hovered, setHovered]       = useState<EmbeddingPoint | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });

  // pan + zoom via viewBox
  const [vb, setVb]             = useState({ x: -1, y: -1, w: 2, h: 2 });
  const dragRef                 = useRef<{ mx: number; my: number; vb: typeof vb } | null>(null);
  const svgContainerRef         = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const res = await fetchEmbeddingPoints(collection, query);
      setData(res);
      if (res.points.length > 0) {
        const xs = res.points.map(p => p.x);
        const ys = res.points.map(p => p.y);
        const xMin = Math.min(...xs), xMax = Math.max(...xs);
        const yMin = Math.min(...ys), yMax = Math.max(...ys);
        const pad  = (xMax - xMin) * 0.1 || 0.5;
        setVb({ x: xMin - pad, y: yMin - pad, w: xMax - xMin + pad * 2, h: yMax - yMin + pad * 2 });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [collection, query]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 0.87;
    setVb(v => ({
      x: v.x + v.w * (1 - factor) / 2,
      y: v.y + v.h * (1 - factor) / 2,
      w: v.w * factor,
      h: v.h * factor,
    }));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { mx: e.clientX, my: e.clientY, vb };
  }, [vb]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePos({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
    if (!dragRef.current) return;
    const rect = svgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = ((e.clientX - dragRef.current.mx) / rect.width)  * dragRef.current.vb.w;
    const dy = ((e.clientY - dragRef.current.my) / rect.height) * dragRef.current.vb.h;
    setVb({ ...dragRef.current.vb, x: dragRef.current.vb.x - dx, y: dragRef.current.vb.y - dy });
  }, []);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const sources    = data ? [...new Set(data.points.map(p => p.source))] : [];
  const viewBoxStr = `${vb.x} ${vb.y} ${vb.w} ${vb.h}`;

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Embedding Space"
        desc="Every chunk in your collection reduced to 2D via PCA. Scroll to zoom · drag to pan · hover for chunk text."
      />

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <input
          type="text" value={collection} onChange={e => setCollection(e.target.value)}
          placeholder="collection name"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="optional query (shows where it lands)"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && <ErrorBanner msg={error} />}

      {/* Plot */}
      {data && data.points.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm bg-white border border-gray-200 rounded-xl">
          No chunks in this collection yet — upload a document first.
        </div>
      )}

      {data && data.points.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Legend */}
          <div className="flex flex-wrap gap-3 px-4 pt-3 pb-2 border-b border-gray-100">
            {sources.map(src => (
              <div key={src} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colorFor(sources, src) }} />
                <span className="text-[11px] text-gray-600 truncate max-w-[140px]">{src}</span>
              </div>
            ))}
            {data.query_point && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-500 shrink-0" />
                <span className="text-[11px] text-red-600 font-semibold">Your query</span>
              </div>
            )}
            <span className="ml-auto text-[11px] text-gray-400">{data.points.length} chunks · PCA 2D</span>
          </div>

          {/* SVG */}
          <div
            ref={svgContainerRef}
            className="relative select-none cursor-grab active:cursor-grabbing"
            style={{ height: 420 }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={() => { dragRef.current = null; setHovered(null); }}
            onWheel={onWheel}
          >
            <svg
              width="100%" height="100%"
              viewBox={viewBoxStr}
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Grid lines */}
              <line x1={vb.x} y1={0} x2={vb.x + vb.w} y2={0} stroke="#e5e7eb" strokeWidth={vb.w * 0.002} />
              <line x1={0} y1={vb.y} x2={0} y2={vb.y + vb.h} stroke="#e5e7eb" strokeWidth={vb.w * 0.002} />

              {/* Chunk points */}
              {data.points.map(p => (
                <circle
                  key={p.id}
                  cx={p.x} cy={p.y}
                  r={vb.w * 0.012}
                  fill={colorFor(sources, p.source)}
                  fillOpacity={hovered?.id === p.id ? 1 : 0.75}
                  stroke={hovered?.id === p.id ? "#1a1a1a" : "white"}
                  strokeWidth={vb.w * 0.003}
                  style={{ cursor: "pointer", transition: "r 0.1s" }}
                  onMouseEnter={() => setHovered(p)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}

              {/* Query point */}
              {data.query_point && (
                <rect
                  x={data.query_point.x - vb.w * 0.018}
                  y={data.query_point.y - vb.w * 0.018}
                  width={vb.w * 0.036}
                  height={vb.w * 0.036}
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth={vb.w * 0.004}
                  rx={vb.w * 0.004}
                />
              )}
            </svg>

            {/* Tooltip */}
            {hovered && (
              <div
                className="absolute z-10 pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl max-w-[260px]"
                style={{ left: mousePos.x + 12, top: mousePos.y - 8 }}
              >
                <p className="font-semibold text-brand-400 truncate mb-1">{hovered.source} · chunk {hovered.chunk}</p>
                <p className="leading-relaxed opacity-90 line-clamp-4">{hovered.text}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 2. Context Inspector ──────────────────────────────────────────────────

function ContextView() {
  const [question,   setQuestion]   = useState("");
  const [collection, setCollection] = useState("default");
  const [strategy,   setStrategy]   = useState("naive");
  const [topK,       setTopK]       = useState(5);
  const [data,       setData]       = useState<ContextResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const inspect = useCallback(async () => {
    if (!question.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await inspectContext({ question, collection, strategy, top_k: topK });
      setData(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to inspect");
    } finally {
      setLoading(false);
    }
  }, [question, collection, strategy, topK]);

  const usagePct = data ? Math.min((data.total_tokens / data.max_tokens) * 100, 100) : 0;
  const usageColor = usagePct > 80 ? "bg-red-500" : usagePct > 60 ? "bg-amber-500" : "bg-brand-500";

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Context Window Inspector"
        desc="See exactly what gets sent to the LLM — system prompt, retrieved chunks with scores, your question, and total token count."
      />

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <textarea
          value={question} onChange={e => setQuestion(e.target.value)}
          rows={2} placeholder="Type a question…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="text" value={collection} onChange={e => setCollection(e.target.value)}
            placeholder="collection"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={strategy} onChange={e => setStrategy(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Top-K: {topK}</span>
            <input type="range" min={1} max={10} value={topK} onChange={e => setTopK(Number(e.target.value))}
              className="w-20 accent-brand-600" />
          </div>
          <button
            onClick={inspect} disabled={loading || !question.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors ml-auto"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {loading ? "Inspecting…" : "Inspect"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} />}

      {data && (
        <div className="space-y-3">
          {/* Token usage bar */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Context Window Usage</span>
              <span className="text-xs font-bold text-gray-800">{data.total_tokens.toLocaleString()} / {data.max_tokens.toLocaleString()} tokens</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-400 transition-all" style={{ width: `${(data.system_tokens / data.max_tokens) * 100}%` }} title="System prompt" />
              <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(data.context_tokens / data.max_tokens) * 100}%` }} title="Context chunks" />
              <div className="h-full bg-purple-400 transition-all" style={{ width: `${(data.question_tokens / data.max_tokens) * 100}%` }} title="Question" />
            </div>
            <div className="flex gap-4 mt-2">
              {[
                { label: "System", tokens: data.system_tokens,   color: "bg-blue-400"    },
                { label: "Context", tokens: data.context_tokens,  color: "bg-emerald-400" },
                { label: "Question", tokens: data.question_tokens, color: "bg-purple-400"  },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-[11px] text-gray-500">{s.label}: <strong>{s.tokens}</strong></span>
                </div>
              ))}
            </div>
          </div>

          {/* System prompt */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">System Prompt</span>
              <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{data.system_tokens} tokens</span>
            </div>
            <p className="text-xs text-blue-800 leading-relaxed font-mono">{data.system_prompt}</p>
          </div>

          {/* Retrieved chunks */}
          {data.chunks.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-400 bg-white border border-gray-200 rounded-xl">
              No chunks retrieved — collection may be empty.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Retrieved Context ({data.chunks.length} chunks)</p>
              {data.chunks.map((c, i) => (
                <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Chunk {i + 1}</span>
                      <span className="text-[11px] text-gray-500 truncate max-w-[160px]">{c.source}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-emerald-700 font-semibold">score {c.score.toFixed(3)}</span>
                      <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{c.tokens} tokens</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{c.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Question */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">User Question</span>
              <span className="text-[11px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{data.question_tokens} tokens</span>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed font-mono">{data.question}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 3. Chunking Visualizer ────────────────────────────────────────────────

const SAMPLE_TEXT = `Retrieval-Augmented Generation (RAG) is a technique that combines information retrieval with text generation. When a user asks a question, the system first searches a vector database for relevant passages, then feeds those passages as context to a language model.

The key advantage of RAG over pure language model generation is that it grounds the model's answers in real, verifiable sources. This reduces hallucination — the tendency of language models to confidently state incorrect information.

Vector embeddings are at the core of RAG. Each document chunk is transformed into a dense numerical vector using an embedding model like all-MiniLM-L6-v2. These vectors capture semantic meaning, so that similar concepts cluster together in vector space even if they use different words.

Chunking strategy significantly impacts retrieval quality. If chunks are too large, they contain irrelevant information that dilutes the signal. If chunks are too small, they lose the surrounding context needed to answer questions accurately. The optimal chunk size depends on the nature of the documents and the typical query length.`;

function ChunkView() {
  const [text,      setText]      = useState(SAMPLE_TEXT);
  const [chunkSize, setChunkSize] = useState(500);
  const [overlap,   setOverlap]   = useState(100);
  const [results,   setResults]   = useState<Record<string, ChunkStrategyResult> | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [activeTab, setActiveTab] = useState("recursive");

  const run = useCallback(async () => {
    if (!text.trim()) return;
    setError(""); setLoading(true);
    try {
      const res = await visualizeChunks({ text, chunk_size: chunkSize, chunk_overlap: overlap });
      setResults(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to chunk");
    } finally {
      setLoading(false);
    }
  }, [text, chunkSize, overlap]);

  const active = results?.[activeTab];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Chunking Strategy Visualizer"
        desc="See how all 4 chunking strategies split the same text — compare chunk count, size distribution, and boundary placement."
      />

      {/* Input */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          rows={6}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Paste any text to visualize how it gets chunked…"
        />
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium w-28">Chunk size: {chunkSize}</span>
            <input type="range" min={200} max={2000} step={50} value={chunkSize}
              onChange={e => setChunkSize(Number(e.target.value))}
              className="w-28 accent-brand-600" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-medium w-28">Overlap: {overlap}</span>
            <input type="range" min={0} max={400} step={20} value={overlap}
              onChange={e => setOverlap(Number(e.target.value))}
              className="w-28 accent-brand-600" />
          </div>
          <button
            onClick={run} disabled={loading || !text.trim()}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {loading ? "Chunking…" : "Visualize"}
          </button>
        </div>
      </div>

      {error && <ErrorBanner msg={error} />}

      {results && (
        <div className="space-y-3">
          {/* Strategy comparison bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CHUNK_STRATEGIES.map(s => {
              const r = results[s];
              return (
                <button
                  key={s}
                  onClick={() => setActiveTab(s)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    activeTab === s
                      ? "bg-brand-600 border-brand-600 text-white"
                      : "bg-white border-gray-200 hover:border-brand-300"
                  }`}
                >
                  <p className={`text-xs font-bold capitalize mb-1 ${activeTab === s ? "text-white" : "text-gray-800"}`}>{s}</p>
                  <p className={`text-lg font-black leading-none ${activeTab === s ? "text-white" : "text-brand-600"}`}>{r.count}</p>
                  <p className={`text-[10px] mt-0.5 ${activeTab === s ? "text-brand-200" : "text-gray-400"}`}>chunks · avg {r.avg_size} chars</p>
                </button>
              );
            })}
          </div>

          {/* Stats row */}
          {active && (
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span><strong className="text-gray-800">{active.count}</strong> chunks</span>
              <span><strong className="text-gray-800">{active.avg_size}</strong> avg chars</span>
              <span><strong className="text-gray-800">{active.min_size}</strong> min chars</span>
              <span><strong className="text-gray-800">{active.max_size}</strong> max chars</span>
              <span className="ml-auto capitalize font-semibold text-brand-600">{activeTab} strategy</span>
            </div>
          )}

          {/* Chunks */}
          {active && (
            <div className="space-y-2">
              {active.chunks.map((chunk, i) => (
                <div
                  key={i}
                  className={`border rounded-xl p-3 ${CHUNK_COLORS[i % CHUNK_COLORS.length]}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-600">Chunk {i + 1}</span>
                    <span className="text-[11px] text-gray-500">{chunk.length} chars · ~{Math.ceil(chunk.length / 4)} tokens</span>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap font-mono">{chunk}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type SubTab = "embeddings" | "context" | "chunks";

const SUB_TABS: { id: SubTab; label: string; desc: string }[] = [
  { id: "embeddings", label: "Embedding Space",   desc: "Scatter plot of all chunks in vector space" },
  { id: "context",    label: "Context Inspector", desc: "What the LLM actually sees in its prompt"   },
  { id: "chunks",     label: "Chunking",          desc: "Compare all 4 chunking strategies side by side" },
];

export function VisualizePage() {
  const [sub, setSub] = useState<SubTab>("embeddings");

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <Telescope size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">Visualize</h1>
          <p className="text-xs text-gray-500">Make the invisible visible — embeddings, context windows, and chunk boundaries</p>
        </div>
      </div>

      {/* Sub-tab selector */}
      <div className="grid grid-cols-3 gap-2">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`text-left p-3 rounded-xl border transition-all ${
              sub === t.id
                ? "bg-white border-brand-500 shadow-sm"
                : "bg-white border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className={`text-xs font-bold ${sub === t.id ? "text-brand-600" : "text-gray-700"}`}>{t.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{t.desc}</p>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
        {sub === "embeddings" && <EmbeddingView />}
        {sub === "context"    && <ContextView />}
        {sub === "chunks"     && <ChunkView />}
      </div>
    </div>
  );
}
