import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X, Trash2, Circle, BarChart2 } from "lucide-react";
import { useProcess, ProcessEvent, EventTag, EventStatus } from "../context/ProcessContext";
import { fetchPerfHistory, fetchPerfStats } from "../api/client";

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

// ─── terminal log ───────────────────────────────────────────────────────────

const TAG_COLORS: Record<EventTag, string> = {
  SYSTEM:    "text-blue-400",
  QUERY:     "text-cyan-400",
  EMBED:     "text-purple-400",
  RETRIEVAL: "text-blue-300",
  CONTEXT:   "text-indigo-400",
  MODEL:     "text-green-400",
  STREAM:    "text-green-300",
  DONE:      "text-emerald-400",
  WEB:       "text-orange-400",
  GAME:      "text-yellow-400",
  ANSWER:    "text-white",
  DB:        "text-teal-400",
  RAG:       "text-pink-400",
  AGENT:     "text-violet-400",
  TOOL:      "text-amber-400",
  RESULT:    "text-sky-400",
  PORTFOLIO: "text-lime-400",
};

const STATUS_DOT: Record<EventStatus, string> = {
  info:    "text-gray-500",
  running: "text-amber-400 animate-pulse",
  success: "text-green-400",
  error:   "text-red-400",
  warn:    "text-orange-400",
};

function fmt(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function EventRow({ event }: { event: ProcessEvent }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-2 font-mono text-xs leading-5"
    >
      <span className="text-gray-600 shrink-0">{fmt(event.ts)}</span>
      <Circle size={6} className={`mt-1.5 shrink-0 ${STATUS_DOT[event.status]}`} fill="currentColor" />
      <span className={`shrink-0 w-[72px] font-bold ${TAG_COLORS[event.tag]}`}>[{event.tag}]</span>
      <span className="text-gray-300 break-all">{event.message}</span>
    </motion.div>
  );
}

// ─── perf tab ──────────────────────────────────────────────────────────────

const STRATEGY_COLOR: Record<string, string> = {
  naive:       "text-blue-400",
  hybrid:      "text-green-400",
  hyde:        "text-purple-400",
  multi_query: "text-orange-400",
};

const STRATEGY_LABEL: Record<string, string> = {
  naive:       "Naive Dense",
  hybrid:      "Hybrid BM25+Dense",
  hyde:        "HyDE",
  multi_query: "Multi-Query",
};

function ScoreBar({ value, max = 1 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color = pct > 70 ? "bg-green-500" : pct > 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-gray-400 font-mono text-[10px] w-8 text-right">{value.toFixed(3)}</span>
    </div>
  );
}

function PerfTab() {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.all([fetchPerfHistory(), fetchPerfStats()]);
      setHistory(h);
      setStats(s);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const last = history[0];

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {/* Refresh */}
      <button onClick={load} className="text-gray-600 hover:text-gray-400 font-mono text-[10px] tracking-widest w-full text-right">
        ↻ REFRESH
      </button>

      {/* Last query snapshot */}
      {last && (
        <div className="bg-gray-900 rounded-lg p-2.5 space-y-2">
          <p className="text-gray-500 font-mono text-[10px] tracking-widest">LAST QUERY</p>
          <p className="text-gray-300 font-mono text-[10px] truncate">"{last.query_text}"</p>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600 font-mono text-[10px]">Strategy</span>
              <span className={`font-mono text-[10px] font-bold ${STRATEGY_COLOR[last.retrieval_strategy] ?? "text-gray-400"}`}>
                {STRATEGY_LABEL[last.retrieval_strategy] ?? last.retrieval_strategy}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-mono text-[10px]">Top-K</span>
              <span className="text-gray-300 font-mono text-[10px]">{last.top_k}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-mono text-[10px]">Chunks</span>
              <span className="text-gray-300 font-mono text-[10px]">{last.chunks_retrieved}</span>
            </div>
          </div>

          <div className="space-y-1 pt-1 border-t border-gray-800">
            <p className="text-gray-600 font-mono text-[10px]">Avg relevance</p>
            <ScoreBar value={last.avg_score} />
          </div>

          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-gray-800">
            {[
              { label: "Retrieve", val: last.retrieval_ms },
              { label: "LLM",      val: last.llm_ms },
              { label: "Total",    val: last.total_ms },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-800 rounded p-1.5 text-center">
                <p className="text-emerald-400 font-mono text-xs font-bold">{val}ms</p>
                <p className="text-gray-600 font-mono text-[9px]">{label}</p>
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-gray-800">
            <p className="text-gray-600 font-mono text-[10px] mb-1">Pipeline steps</p>
            <div className="flex flex-wrap gap-1">
              {(last.retrieval_steps ?? "").split(",").filter(Boolean).map((s: string) => (
                <span key={s} className="bg-gray-800 text-gray-300 font-mono text-[9px] px-1.5 py-0.5 rounded">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Strategy comparison */}
      {stats.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-2.5 space-y-2">
          <p className="text-gray-500 font-mono text-[10px] tracking-widest">STRATEGY COMPARISON</p>
          {stats.map((s: any) => (
            <div key={s.retrieval_strategy} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={`font-mono text-[10px] font-bold ${STRATEGY_COLOR[s.retrieval_strategy] ?? "text-gray-400"}`}>
                  {STRATEGY_LABEL[s.retrieval_strategy] ?? s.retrieval_strategy}
                </span>
                <span className="text-gray-600 font-mono text-[10px]">{s.queries}q</span>
              </div>
              <ScoreBar value={s.avg_relevance ?? 0} />
              <div className="flex justify-between text-[9px] font-mono text-gray-600">
                <span>retrieve {s.avg_retrieval_ms}ms</span>
                <span>total {s.avg_total_ms}ms</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Query history */}
      {history.length > 1 && (
        <div className="bg-gray-900 rounded-lg p-2.5 space-y-1.5">
          <p className="text-gray-500 font-mono text-[10px] tracking-widest">HISTORY</p>
          {history.slice(0, 10).map((h: any) => (
            <div key={h.id} className="flex items-center gap-2 border-b border-gray-800 pb-1.5">
              <span className={`font-mono text-[9px] font-bold shrink-0 ${STRATEGY_COLOR[h.retrieval_strategy] ?? "text-gray-400"}`}>
                {h.retrieval_strategy?.toUpperCase().slice(0, 6)}
              </span>
              <span className="text-gray-500 font-mono text-[9px] truncate flex-1">
                {h.query_text?.slice(0, 30)}
              </span>
              <span className="text-emerald-400 font-mono text-[9px] shrink-0">{h.avg_score?.toFixed(2)}</span>
              <span className="text-gray-600 font-mono text-[9px] shrink-0">{h.total_ms}ms</span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <p className="text-gray-700 font-mono text-xs text-center">Loading…</p>
      )}
      {!loading && history.length === 0 && (
        <p className="text-gray-700 font-mono text-xs text-center mt-4">Ask a question to see performance data</p>
      )}
    </div>
  );
}

// ─── system status ──────────────────────────────────────────────────────────

interface SystemStatus {
  ollama: string; model: string; model_loaded: boolean;
  vector_db: string; chroma_status: string; embedding_model: string;
  collections: number; total_chunks: number;
}

// ─── main sidebar ──────────────────────────────────────────────────────────

export function TerminalSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { events, clear } = useProcess();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [activeTab, setActiveTab] = useState<"log" | "perf">("log");

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${BASE}/status`, { headers: { "X-API-Key": "enterprise-rag-secret" } });
        if (res.ok) setSysStatus(await res.json());
      } catch { /* ignore */ }
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (activeTab === "log") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events, activeTab]);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="h-full bg-gray-950 border-l border-gray-800 flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-green-400" />
              <span className="text-green-400 font-mono text-xs font-bold tracking-widest">PROCESS MONITOR</span>
            </div>
            <div className="flex gap-2">
              {activeTab === "log" && (
                <button onClick={clear} title="Clear log" className="text-gray-600 hover:text-gray-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
              <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
                <X size={13} />
              </button>
            </div>
          </div>

          {/* System status */}
          {sysStatus && (
            <div className="px-3 py-2 border-b border-gray-800 space-y-1.5 shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-900 rounded px-2 py-1.5">
                  <p className="text-gray-500 font-mono text-[10px]">MODEL</p>
                  <p className="text-cyan-300 font-mono text-[10px] truncate">{sysStatus.model}</p>
                  <p className={`font-mono text-[10px] ${sysStatus.model_loaded ? "text-green-400" : "text-amber-400"}`}>
                    {sysStatus.model_loaded ? "● LOADED" : "● IDLE"}
                  </p>
                </div>
                <div className="flex-1 bg-gray-900 rounded px-2 py-1.5">
                  <p className="text-gray-500 font-mono text-[10px]">PIPELINE</p>
                  <p className="text-pink-400 font-mono text-[10px] font-bold">RAG</p>
                  <p className="text-gray-600 font-mono text-[10px]">no fine-tuning</p>
                </div>
                <div className="flex-1 bg-gray-900 rounded px-2 py-1.5">
                  <p className="text-gray-500 font-mono text-[10px]">VECTOR DB</p>
                  <p className="text-teal-400 font-mono text-[10px]">{sysStatus.vector_db}</p>
                  <p className="text-gray-400 font-mono text-[10px]">{sysStatus.total_chunks} chunks</p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-800 shrink-0">
            {([["log", "LOG", Terminal], ["perf", "PERFORMANCE", BarChart2]] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                  activeTab === id
                    ? "text-green-400 border-b-2 border-green-400"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "log" ? (
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
              {events.length === 0 && (
                <p className="text-gray-700 font-mono text-xs mt-4 text-center">Waiting for activity…</p>
              )}
              {[...events].reverse().map((e) => <EventRow key={e.id} event={e} />)}
              <div ref={bottomRef} />
            </div>
          ) : (
            <PerfTab />
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-800 shrink-0">
            <p className="text-gray-700 font-mono text-[10px]">
              {activeTab === "log" ? `${events.length} events` : "query performance"} · RAG · no fine-tuning
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
