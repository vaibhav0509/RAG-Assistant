import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Search, Layers, Lightbulb, GitMerge, Sparkles } from "lucide-react";

export interface RetrievalConfig {
  strategy: string;
  topK: number;
  rerank: boolean;
}

const STRATEGIES = [
  {
    id: "naive",
    label: "Naive Dense",
    short: "Dense",
    icon: Search,
    color: "text-blue-500",
    desc: "Direct vector similarity search",
  },
  {
    id: "hybrid",
    label: "Hybrid BM25 + Dense",
    short: "Hybrid",
    icon: Layers,
    color: "text-green-500",
    desc: "Keyword + semantic search combined",
  },
  {
    id: "hyde",
    label: "HyDE",
    short: "HyDE",
    icon: Lightbulb,
    color: "text-purple-500",
    desc: "Generate hypothetical doc, then search",
  },
  {
    id: "multi_query",
    label: "Multi-Query",
    short: "Multi-Q",
    icon: GitMerge,
    color: "text-orange-500",
    desc: "Expand to 4 queries, RRF merge",
  },
];

const TOP_K_OPTIONS = [3, 5, 8, 10];

interface Props {
  value: RetrievalConfig;
  onChange: (cfg: RetrievalConfig) => void;
}

export function RetrievalSelector({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const active = STRATEGIES.find((s) => s.id === value.strategy) ?? STRATEGIES[0];

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {/* Strategy picker */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-transparent hover:border-gray-300 rounded-lg text-sm text-gray-700 transition-colors"
      >
        <active.icon size={13} className={active.color} />
        <span className="font-medium">{active.short}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Top-K picker */}
      <select
        value={value.topK}
        onChange={(e) => onChange({ ...value, topK: Number(e.target.value) })}
        className="appearance-none px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer focus:outline-none border border-transparent hover:border-gray-300"
      >
        {TOP_K_OPTIONS.map((k) => (
          <option key={k} value={k}>Top-{k}</option>
        ))}
      </select>

      {/* Re-rank toggle */}
      <button
        onClick={() => onChange({ ...value, rerank: !value.rerank })}
        title="Cross-encoder re-ranking — scores each chunk against your query for higher precision"
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
          value.rerank
            ? "bg-purple-100 text-purple-700 border-purple-300"
            : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"
        }`}
      >
        <Sparkles size={12} />
        Re-rank
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-72 p-1.5">
          <p className="text-xs text-gray-400 px-2 py-1 font-semibold uppercase tracking-wide">Retrieval Strategy</p>
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              onClick={() => { onChange({ ...value, strategy: s.id }); setOpen(false); }}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                value.strategy === s.id ? "bg-gray-50" : "hover:bg-gray-50"
              }`}
            >
              <s.icon size={16} className={`${s.color} mt-0.5 shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{s.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
              </div>
              {value.strategy === s.id && <Check size={14} className="text-green-500 mt-0.5 shrink-0" />}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 px-3 py-2">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-purple-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Re-ranking</p>
                <p className="text-xs text-gray-400 mt-0.5">Cross-encoder scores each chunk against your exact query. Higher precision, ~100ms extra latency.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
