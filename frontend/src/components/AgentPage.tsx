import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Brain, Zap, Eye, ChevronDown, ChevronUp, MessageSquare, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamAgent } from "../api/client";
import { useProcess } from "../context/ProcessContext";

interface AgentEvent {
  type: "thought" | "action" | "observation" | "answer" | "error";
  content?: string;
  tool?: string;
  input?: string;
}

interface AgentStep {
  id: string;
  events: AgentEvent[];
  answer?: string;
  error?: string;
  question: string;
  done: boolean;
}

const TOOL_COLORS: Record<string, string> = {
  search_documents: "text-blue-600 bg-blue-50 border-blue-200",
  search_web:       "text-green-600 bg-green-50 border-green-200",
  calculate:        "text-orange-600 bg-orange-50 border-orange-200",
  answer_directly:  "text-purple-600 bg-purple-50 border-purple-200",
};

const TOOL_LABELS: Record<string, string> = {
  search_documents: "Search Documents",
  search_web:       "Search Web",
  calculate:        "Calculate",
  answer_directly:  "Answer Directly",
};

const THINKING_WORDS = [
  "Reasoning about the question…",
  "Deciding which tool to use…",
  "Formulating a plan…",
  "Evaluating options…",
  "Thinking step by step…",
  "Processing the observation…",
  "Preparing next action…",
];

// ─── Mini orbit spinner (scaled-down GameLoader style) ────────────────────

function MiniSpinner({ label }: { label: string }) {
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % THINKING_WORDS.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="px-4 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
      {/* Mini orbit */}
      <div className="relative w-10 h-10 shrink-0">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#4f6ef7", borderRightColor: "#818cf8" }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-1 rounded-full border-2 border-transparent"
          style={{ borderTopColor: "#f97316", borderLeftColor: "#fb923c" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 flex items-center justify-center">
            <Brain size={8} className="text-white" />
          </div>
        </motion.div>
      </div>

      {/* Cycling label */}
      <div className="min-w-0">
        <AnimatePresence mode="wait">
          <motion.p
            key={label !== "Agent is thinking…" ? label : wordIdx}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-gray-500 italic"
          >
            {label !== "Agent is thinking…" ? label : THINKING_WORDS[wordIdx]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── ReAct flow explainer (shown in empty state) ──────────────────────────

const REACT_STEPS = [
  { icon: Brain,          label: "Thought",     color: "bg-gray-100 text-gray-600",    desc: "Agent reasons about what to do next" },
  { icon: Zap,            label: "Action",      color: "bg-brand-50 text-brand-600",   desc: "Picks a tool and calls it" },
  { icon: Eye,            label: "Observation", color: "bg-emerald-50 text-emerald-600", desc: "Reads the tool result" },
];

function ReactExplainer() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % REACT_STEPS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg mx-auto text-center">
      {/* Title */}
      <div>
        <BrainCircuit size={44} className="mx-auto text-brand-400 mb-3" />
        <h2 className="text-lg font-semibold text-gray-700">Agent Mode</h2>
        <p className="text-sm text-gray-400 mt-1 max-w-sm">
          Unlike Chat which retrieves and answers in one shot, the Agent <strong>reasons step-by-step</strong>, calling tools repeatedly until it's confident in the answer.
        </p>
      </div>

      {/* Chat vs Agent comparison */}
      <div className="w-full grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <MessageSquare size={13} className="text-gray-400" />
            <span className="font-semibold text-gray-500">Chat</span>
          </div>
          <div className="flex items-center gap-1 text-gray-400 flex-wrap">
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">Query</span>
            <span>→</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">Retrieve</span>
            <span>→</span>
            <span className="bg-gray-100 px-1.5 py-0.5 rounded">Answer</span>
          </div>
          <p className="text-gray-400 mt-2">One round trip. Best for direct document Q&A.</p>
        </div>
        <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BrainCircuit size={13} className="text-brand-500" />
            <span className="font-semibold text-brand-600">Agent</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500 flex-wrap">
            <span className="bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded">Think</span>
            <span>→</span>
            <span className="bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">Tool</span>
            <span>→</span>
            <span className="bg-sky-100 text-sky-600 px-1.5 py-0.5 rounded">Observe</span>
            <span>→</span>
            <span className="text-gray-400">…</span>
          </div>
          <p className="text-gray-500 mt-2">Multi-step. Best for complex or multi-source questions.</p>
        </div>
      </div>

      {/* Animated ReAct loop */}
      <div className="w-full">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">ReAct Loop</p>
        <div className="flex items-center justify-center gap-2">
          {REACT_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = active === i;
            return (
              <div key={step.label} className="flex items-center gap-2">
                <motion.div
                  animate={{ scale: isActive ? 1.12 : 1, opacity: isActive ? 1 : 0.45 }}
                  transition={{ duration: 0.35 }}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 ${step.color} border ${isActive ? "border-current shadow-sm" : "border-transparent"}`}
                  style={{ minWidth: 80 }}
                >
                  <Icon size={18} />
                  <span className="text-xs font-semibold">{step.label}</span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-[10px] text-center leading-tight opacity-70"
                      >
                        {step.desc}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
                {i < REACT_STEPS.length - 1 && (
                  <motion.span
                    animate={{ opacity: active === i ? 1 : 0.3 }}
                    className="text-gray-400 text-sm font-bold"
                  >→</motion.span>
                )}
              </div>
            );
          })}
          <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.8, repeat: Infinity }} className="text-gray-400 text-sm font-bold ml-1">
            → …
          </motion.span>
        </div>
      </div>

      {/* Tools available */}
      <div className="w-full">
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Available Tools</p>
        <div className="flex flex-wrap justify-center gap-2 text-xs">
          {Object.entries(TOOL_LABELS).map(([key, label]) => (
            <span key={key} className={`px-2 py-1 rounded border font-medium ${TOOL_COLORS[key]}`}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Event icon ───────────────────────────────────────────────────────────

function EventIcon({ type }: { type: AgentEvent["type"] }) {
  const cls = "w-5 h-5 shrink-0 mt-0.5";
  if (type === "thought")     return <Brain className={`${cls} text-gray-400`} />;
  if (type === "action")      return <Zap className={`${cls} text-brand-500`} />;
  if (type === "observation") return <Eye className={`${cls} text-emerald-500`} />;
  return null;
}

// ─── Step card ────────────────────────────────────────────────────────────

function StepCard({ step }: { step: AgentStep }) {
  const [expanded, setExpanded] = useState(true);
  const intermediates = step.events.filter((e) => e.type !== "answer" && e.type !== "error");

  const lastEvent = intermediates[intermediates.length - 1];
  const spinnerLabel =
    !lastEvent
      ? "Agent is thinking…"
      : lastEvent.type === "action"
      ? `Running ${TOOL_LABELS[lastEvent.tool ?? ""] ?? "tool"}…`
      : "Reasoning…";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* Question header */}
      <div className="px-4 py-3 bg-brand-500 text-white flex justify-between items-start gap-2">
        <p className="text-sm font-medium leading-snug">{step.question}</p>
        {step.done && intermediates.length > 0 && (
          <button
            onClick={() => setExpanded((o) => !o)}
            className="shrink-0 text-white/70 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Reasoning trace */}
      {expanded && intermediates.length > 0 && (
        <div className="divide-y divide-gray-100">
          {intermediates.map((ev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="px-4 py-3 flex gap-3 items-start"
            >
              <EventIcon type={ev.type} />
              <div className="min-w-0 flex-1">
                {ev.type === "thought" && (
                  <p className="text-xs text-gray-500 italic leading-relaxed">{ev.content}</p>
                )}
                {ev.type === "action" && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(TOOL_LABELS).map(([key, label]) => {
                        const isActive = key === ev.tool;
                        return (
                          <span
                            key={key}
                            className={`text-xs font-semibold px-2 py-0.5 rounded border transition-all ${
                              isActive
                                ? `${TOOL_COLORS[key]} ring-1 ring-current scale-105`
                                : "text-gray-300 bg-gray-50 border-gray-100 opacity-40"
                            }`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    <code className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded block truncate">
                      ← {ev.input}
                    </code>
                  </div>
                )}
                {ev.type === "observation" && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{ev.content}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Final answer */}
      {step.answer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="px-4 py-4 border-t border-gray-100 bg-gray-50"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm max-w-none text-gray-800">
            {step.answer}
          </ReactMarkdown>
        </motion.div>
      )}

      {/* Error */}
      {step.error && (
        <div className="px-4 py-3 border-t border-red-100 bg-red-50 text-sm text-red-600">
          {step.error}
        </div>
      )}

      {/* Loading */}
      {!step.done && <MiniSpinner label={spinnerLabel} />}
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

interface Props {
  collection: string;
  model: string;
}

export function AgentPage({ collection, model }: Props) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { log } = useProcess();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [steps]);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);

    const stepId = crypto.randomUUID();
    setSteps((prev) => [...prev, { id: stepId, question: q, events: [], done: false }]);

    log("AGENT", `Question: "${q.slice(0, 60)}${q.length > 60 ? "…" : ""}"`, "info");
    log("AGENT", "Starting ReAct loop…", "running");
    const t0 = Date.now();
    let iteration = 0;

    try {
      for await (const event of streamAgent(q, collection, model || undefined)) {
        if (event.type === "thought") {
          iteration++;
          log("AGENT", `[${iteration}] ${(event.content ?? "").slice(0, 80)}`, "running");
        } else if (event.type === "action") {
          const label = TOOL_LABELS[event.tool ?? ""] ?? event.tool ?? "tool";
          log("TOOL", `${label} ← "${(event.input ?? "").slice(0, 60)}"`, "running");
        } else if (event.type === "observation") {
          const preview = (event.content ?? "").slice(0, 80).replace(/\n/g, " ");
          log("RESULT", `${preview}`, "info");
        } else if (event.type === "answer") {
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          log("AGENT", `Done in ${elapsed}s · ${iteration} iteration${iteration !== 1 ? "s" : ""}`, "success");
        } else if (event.type === "error") {
          log("AGENT", `Error: ${event.content}`, "error");
        }

        setSteps((prev) =>
          prev.map((s) => {
            if (s.id !== stepId) return s;
            if (event.type === "answer") return { ...s, answer: event.content, done: true };
            if (event.type === "error")  return { ...s, error: event.content,  done: true };
            return { ...s, events: [...s.events, event] };
          })
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      log("AGENT", `Error: ${msg}`, "error");
      setSteps((prev) =>
        prev.map((s) => s.id === stepId ? { ...s, error: msg, done: true } : s)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <header className="px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
        <h2 className="font-semibold text-gray-800 text-sm">Agent Mode</h2>
        <p className="text-xs text-gray-400">ReAct loop · searches docs &amp; web · {collection}</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {steps.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <ReactExplainer />
          </div>
        ) : (
          steps.map((step) => <StepCard key={step.id} step={step} />)
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={`Ask the agent anything about "${collection}"…`}
            className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32 overflow-y-auto"
            style={{ minHeight: "42px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl p-2.5 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5">Agent autonomously picks tools · Shift+Enter for newline</p>
      </div>
    </div>
  );
}
