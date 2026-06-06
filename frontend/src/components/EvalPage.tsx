import { useState, useCallback, useRef } from "react";
import { FlaskConical, Play, Square, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { streamEval } from "../api/client";
import type { EvalResult, EvalResponse } from "../api/client";

const STRATEGIES = [
  { id: "naive",       label: "Naive Dense" },
  { id: "hybrid",      label: "Hybrid BM25+Dense" },
  { id: "hyde",        label: "HyDE" },
  { id: "multi_query", label: "Multi-Query + RRF" },
];

const PLACEHOLDER = `What is RAG?
How does BM25 differ from dense retrieval?
What chunking strategy works best for long documents?`;

// ── Metric badge ──────────────────────────────────────────────────────────

function ScoreBadge({ value, label }: { value: number; label: string }) {
  const color =
    value >= 0.8 ? "text-green-600 bg-green-50 border-green-200" :
    value >= 0.6 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
                   "text-red-600 bg-red-50 border-red-200";
  return (
    <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg border ${color} min-w-[70px]`}>
      <span className="text-sm font-bold leading-none">{(value * 100).toFixed(0)}%</span>
      <span className="text-[10px] font-medium mt-0.5 opacity-80">{label}</span>
    </div>
  );
}

function LatencyBadge({ ms }: { ms: number }) {
  return (
    <div className="flex flex-col items-center px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 min-w-[70px]">
      <span className="text-sm font-bold text-gray-700 leading-none">{ms > 999 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`}</span>
      <span className="text-[10px] font-medium text-gray-500 mt-0.5">latency</span>
    </div>
  );
}

// ── Result row ────────────────────────────────────────────────────────────

function ResultRow({ result, pending }: { result: EvalResult | null; pending?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (pending || !result) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 flex items-center gap-2 bg-white animate-pulse">
        <Loader2 size={14} className="text-brand-500 animate-spin shrink-0" />
        <span className="text-sm text-gray-400">Evaluating…</span>
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="border border-red-200 bg-red-50 rounded-lg p-3 flex items-start gap-2">
        <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-red-700 truncate">{result.question}</p>
          <p className="text-xs text-red-600 mt-0.5">{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
        <span className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">{result.question}</span>
        <div className="flex items-center gap-1 shrink-0">
          <ScoreBadge value={result.context_relevance}   label="Context" />
          <ScoreBadge value={result.answer_faithfulness}  label="Faith." />
          <ScoreBadge value={result.answer_relevance}     label="Relevance" />
          <LatencyBadge ms={result.latency_ms} />
          <span className="text-gray-400 ml-1">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 p-3 bg-gray-50 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Answer</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result.answer}</p>
          </div>
          <p className="text-[10px] text-gray-400">Contexts retrieved: {result.context_count}</p>
        </div>
      )}
    </div>
  );
}

// ── Aggregate summary ─────────────────────────────────────────────────────

function AggregateBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <span className="text-xs font-bold text-gray-800">{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────

function ProgressBar({ done, total, currentQuestion }: { done: number; total: number; currentQuestion: string }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 truncate max-w-[60%]">
          {done < total ? <>Evaluating: <span className="font-medium text-gray-700">{currentQuestion}</span></> : "Done"}
        </span>
        <span className="text-gray-500 shrink-0">{done} / {total}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function EvalPage() {
  const [questions, setQuestions]     = useState(PLACEHOLDER);
  const [collection, setCollection]   = useState("default");
  const [strategy, setStrategy]       = useState("naive");
  const [topK, setTopK]               = useState(5);
  const [useReranker, setUseReranker] = useState(false);

  // streaming state
  const [running, setRunning]                                   = useState(false);
  const [progress, setProgress]                                 = useState({ done: 0, total: 0, current: "" });
  const [results, setResults]                                   = useState<(EvalResult | null)[]>([]);
  const [aggregate, setAggregate]                               = useState<EvalResponse["aggregate"] | null>(null);
  const [error, setError]                                       = useState("");
  const abortRef                                                = useRef<AbortController | null>(null);

  const handleRun = useCallback(async () => {
    const qs = questions.split("\n").map((q) => q.trim()).filter(Boolean);
    if (!qs.length) { setError("Enter at least one question."); return; }

    // reset state
    setError("");
    setAggregate(null);
    setResults(Array(qs.length).fill(null));
    setProgress({ done: 0, total: qs.length, current: qs[0] });
    setRunning(true);

    abortRef.current = new AbortController();

    try {
      for await (const event of streamEval({ questions: qs, collection, strategy, top_k: topK, use_reranker: useReranker })) {
        if (event.type === "progress") {
          setProgress({ done: event.index, total: event.total, current: event.question });
        } else if (event.type === "result") {
          setResults((prev) => {
            const next = [...prev];
            next[event.index] = event.result;
            return next;
          });
          setProgress((p) => ({ ...p, done: event.index + 1 }));
        } else if (event.type === "done") {
          setAggregate(event.aggregate);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message !== "AbortError") {
        setError(e.message || "Evaluation failed");
      }
    } finally {
      setRunning(false);
    }
  }, [questions, collection, strategy, topK, useReranker]);

  const handleStop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const hasResults = results.some(Boolean);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
          <FlaskConical size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900">RAG Evaluation</h1>
          <p className="text-xs text-gray-500">Measure context relevance, faithfulness, and answer quality against your uploaded documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Config panel ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Configuration</h2>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Collection</label>
              <input
                type="text"
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                placeholder="default"
                disabled={running}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              />
              <p className="text-[10px] text-gray-400 mt-1">Must match a collection with uploaded documents</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Retrieval Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                disabled={running}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              >
                {STRATEGIES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Top-K Chunks: {topK}</label>
              <input
                type="range" min={1} max={10} value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                disabled={running}
                className="w-full accent-brand-600 disabled:opacity-50"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useReranker}
                onChange={(e) => setUseReranker(e.target.checked)}
                disabled={running}
                className="accent-brand-600"
              />
              <span className="text-sm text-gray-700">Cross-encoder re-ranking</span>
            </label>
          </div>

          {/* Metric legend */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
            <h2 className="text-sm font-semibold text-gray-700">Metrics</h2>
            <dl className="space-y-2 text-xs text-gray-600">
              <div>
                <dt className="font-medium text-gray-800">Context Relevance</dt>
                <dd className="text-gray-500">Mean cosine similarity of retrieved chunks to the question</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-800">Faithfulness</dt>
                <dd className="text-gray-500">LLM judge: is the answer grounded in the context?</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-800">Answer Relevance</dt>
                <dd className="text-gray-500">Embedding similarity between question and answer</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* ── Questions + results ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Questions <span className="font-normal text-gray-400">(one per line, max 20 — use questions relevant to your uploaded documents)</span>
            </h2>
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              rows={6}
              placeholder={PLACEHOLDER}
              disabled={running}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none font-mono disabled:opacity-50"
            />

            {/* Progress (shown while running) */}
            {running && (
              <ProgressBar
                done={progress.done}
                total={progress.total}
                currentQuestion={progress.current}
              />
            )}

            {error && (
              <div className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleRun}
                disabled={running}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Play size={14} />
                {running ? "Running…" : "Run Evaluation"}
              </button>
              {running && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                >
                  <Square size={14} />
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Aggregate summary — shown once done */}
          {aggregate && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Summary</h2>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} />
                  {aggregate.avg_latency_ms > 999
                    ? `${(aggregate.avg_latency_ms / 1000).toFixed(1)}s avg`
                    : `${aggregate.avg_latency_ms}ms avg`}
                  <span className="text-gray-300 mx-1">·</span>
                  {aggregate.successful}/{aggregate.total_questions} passed
                </div>
              </div>
              <div className="space-y-3">
                <AggregateBar value={aggregate.context_relevance}   label="Context Relevance"   color="bg-blue-500" />
                <AggregateBar value={aggregate.answer_faithfulness}  label="Answer Faithfulness"  color="bg-green-500" />
                <AggregateBar value={aggregate.answer_relevance}     label="Answer Relevance"     color="bg-purple-500" />
              </div>
            </div>
          )}

          {/* Per-question results — build up as stream arrives */}
          {(hasResults || running) && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700 px-1">
                Results <span className="font-normal text-gray-400">— click a row to expand the answer</span>
              </h2>
              {results.map((r, i) => (
                <ResultRow key={i} result={r} pending={r === null && running} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
