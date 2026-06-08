import { useState, useRef, useEffect } from "react";
import {
  Users, Plus, Trash2, Play, Square, ChevronDown, ChevronUp,
  Globe, Database, Bot, Sparkles, CheckCircle2, Loader2, AlertCircle,
  Layers, Cpu, Search, Settings,
} from "lucide-react";
import { streamMultiAgent, MultiAgentEvent } from "../api/client";
import { useProcess } from "../context/ProcessContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  tool: "none" | "web_search" | "retrieval";
  tool_config: Record<string, string | number>;
}

interface AgentMessage {
  agentIndex: number;
  agentName: string;
  tool?: string;
  toolQuery?: string;
  toolPreview?: string;
  tokens: string;
  done: boolean;
  error?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENT_COLORS = [
  { bg: "bg-brand-500",  text: "text-brand-400",  border: "border-brand-500/40",  light: "bg-brand-500/10"  },
  { bg: "bg-violet-500", text: "text-violet-400",  border: "border-violet-500/40", light: "bg-violet-500/10" },
  { bg: "bg-amber-500",  text: "text-amber-400",   border: "border-amber-500/40",  light: "bg-amber-500/10"  },
  { bg: "bg-lime-500",   text: "text-lime-400",    border: "border-lime-500/40",   light: "bg-lime-500/10"   },
  { bg: "bg-sky-500",    text: "text-sky-400",     border: "border-sky-500/40",    light: "bg-sky-500/10"    },
  { bg: "bg-rose-500",   text: "text-rose-400",    border: "border-rose-500/40",   light: "bg-rose-500/10"   },
];

const TEMPLATES: { id: string; label: string; description: string; icon: typeof Bot; agents: Omit<AgentConfig, "id">[] }[] = [
  {
    id: "research_write_review",
    label: "Research → Write → Review",
    description: "Web research, then draft, then polished final output",
    icon: Search,
    agents: [
      { name: "Research Agent", role: "You are a research specialist. Gather and synthesize information on the given topic. Be thorough and factual. Present findings clearly.", tool: "web_search", tool_config: { max_results: 3 } },
      { name: "Writer Agent",   role: "You are a skilled writer. Using the research provided by the previous agent, write a clear, well-structured, engaging response.",           tool: "none",       tool_config: {} },
      { name: "Reviewer Agent", role: "You are a critical reviewer. Review the written content for accuracy, clarity, and completeness. Produce the final polished version.",    tool: "none",       tool_config: {} },
    ],
  },
  {
    id: "analyze_summarize_format",
    label: "Analyze → Summarize → Format",
    description: "Deep doc analysis, distilled summary, structured output",
    icon: Layers,
    agents: [
      { name: "Analyst Agent",   role: "You are a data analyst. Deeply analyze the input, identify key patterns, insights, and relationships from retrieved documents.", tool: "retrieval", tool_config: { strategy: "hybrid", top_k: 5 } },
      { name: "Summarizer Agent",role: "You are an expert summarizer. Take the analysis and distill it into the most essential points concisely and accurately.",           tool: "none",      tool_config: {} },
      { name: "Formatter Agent", role: "You are a formatting expert. Present the summary with proper structure, headers, and bullet points for maximum readability.",       tool: "none",      tool_config: {} },
    ],
  },
  {
    id: "search_synthesize_answer",
    label: "Search → Synthesize → Answer",
    description: "Web + docs, cross-reference synthesis, clear final answer",
    icon: Cpu,
    agents: [
      { name: "Search Agent",     role: "You are a search specialist. Find and extract the most relevant facts from web sources on the given topic.",                                     tool: "web_search", tool_config: { max_results: 5 } },
      { name: "Synthesizer Agent",role: "You are a synthesis expert. Combine all gathered information into a coherent understanding, cross-referencing sources.",                          tool: "retrieval",  tool_config: { strategy: "naive", top_k: 3 } },
      { name: "Answer Agent",     role: "You are a clear communicator. Provide a direct, accurate, well-reasoned final answer based on all context gathered by the previous agents.", tool: "none",       tool_config: {} },
    ],
  },
];

const TOOL_OPTIONS = [
  { value: "none",       label: "No tool",       icon: Bot    },
  { value: "web_search", label: "Web Search",    icon: Globe  },
  { value: "retrieval",  label: "Doc Retrieval", icon: Database },
] as const;

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── Agent Config Card ────────────────────────────────────────────────────────

function AgentCard({
  agent, index, total, color,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  agent: AgentConfig;
  index: number;
  total: number;
  color: (typeof AGENT_COLORS)[number];
  onChange: (a: AgentConfig) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className={`rounded-xl border ${color.border} bg-gray-900 overflow-hidden`}>
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className={`w-6 h-6 rounded-full ${color.bg} flex items-center justify-center shrink-0`}>
          <span className="text-white text-[10px] font-bold">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{agent.name}</p>
          <p className="text-[10px] text-gray-500 truncate">
            {TOOL_OPTIONS.find((o) => o.value === agent.tool)?.label}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={index === 0}
            className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">
            <ChevronUp size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={index === total - 1}
            className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors">
            <ChevronDown size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-0.5 text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 size={13} />
          </button>
          {expanded ? <ChevronUp size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-gray-800 pt-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Name</label>
            <input
              value={agent.name}
              onChange={(e) => onChange({ ...agent, name: e.target.value })}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gray-500"
              placeholder="Agent name"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">System prompt / role</label>
            <textarea
              value={agent.role}
              onChange={(e) => onChange({ ...agent, role: e.target.value })}
              rows={3}
              className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-gray-500"
              placeholder="Describe what this agent should do..."
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide">Tool</label>
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {TOOL_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = agent.tool === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => onChange({ ...agent, tool: opt.value as AgentConfig["tool"], tool_config: {} })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                      active
                        ? `${color.light} ${color.text} border-current`
                        : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                    }`}
                  >
                    <Icon size={11} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Agent Output Block ───────────────────────────────────────────────────────

function AgentOutput({ msg, color }: { msg: AgentMessage; color: (typeof AGENT_COLORS)[number] }) {
  return (
    <div className={`rounded-xl border ${color.border} bg-gray-900 overflow-hidden`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${color.light}`}>
        <div className={`w-7 h-7 rounded-full ${color.bg} flex items-center justify-center shrink-0`}>
          <span className="text-white text-xs font-bold">{msg.agentIndex + 1}</span>
        </div>
        <span className={`text-sm font-semibold ${color.text}`}>{msg.agentName}</span>
        <div className="flex-1" />
        {msg.done ? (
          msg.error
            ? <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertCircle size={12} /> Error</span>
            : <span className="flex items-center gap-1 text-[10px] text-green-400"><CheckCircle2 size={12} /> Done</span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-gray-400">
            <Loader2 size={12} className="animate-spin" /> Running…
          </span>
        )}
      </div>

      {/* Tool call */}
      {msg.tool && msg.tool !== "none" && (
        <div className="px-4 py-2 border-t border-gray-800 flex items-start gap-2">
          {msg.tool === "web_search"
            ? <Globe size={12} className="text-sky-400 mt-0.5 shrink-0" />
            : <Database size={12} className="text-indigo-400 mt-0.5 shrink-0" />}
          <div className="min-w-0">
            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
              {msg.tool === "web_search" ? "Web search" : "Document retrieval"}
            </p>
            <p className="text-xs text-gray-400 truncate">{msg.toolQuery}</p>
            {msg.toolPreview && (
              <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{msg.toolPreview}</p>
            )}
          </div>
        </div>
      )}

      {/* Output */}
      <div className="px-4 py-3 border-t border-gray-800">
        {msg.tokens ? (
          <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{msg.tokens}</p>
        ) : (
          <p className="text-xs text-gray-600 italic">Waiting for output…</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MultiAgentPage({ collection }: { collection?: string }) {
  const { log } = useProcess();
  const [agents, setAgents] = useState<AgentConfig[]>(() =>
    TEMPLATES[0].agents.map((a) => ({ ...a, id: uid() }))
  );
  const [input, setInput] = useState("");
  const [coll, setColl] = useState(collection ?? "default");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [mobileView, setMobileView] = useState<"config" | "output">("config");
  const abortRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as tokens stream in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function applyTemplate(idx: number) {
    setActiveTemplate(idx);
    setAgents(TEMPLATES[idx].agents.map((a) => ({ ...a, id: uid() })));
    setMessages([]);
  }

  function addAgent() {
    setAgents((prev) => [
      ...prev,
      { id: uid(), name: `Agent ${prev.length + 1}`, role: "You are a helpful assistant.", tool: "none", tool_config: {} },
    ]);
  }

  function updateAgent(id: string, updated: AgentConfig) {
    setAgents((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }

  function deleteAgent(id: string) {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }

  function moveAgent(idx: number, dir: -1 | 1) {
    setAgents((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function run() {
    if (!input.trim() || agents.length === 0 || running) return;
    setRunning(true);
    abortRef.current = false;
    setMessages([]);
    setMobileView("output");
    log("MULTIAGENT", `Starting pipeline: ${agents.map(a => a.name).join(" → ")}`, "running");

    try {
      const stream = streamMultiAgent({
        agents: agents.map((a) => ({
          name: a.name,
          role: a.role,
          tool: a.tool,
          tool_config: a.tool_config,
        })),
        input: input.trim(),
        collection: coll,
      });

      for await (const event of stream) {
        if (abortRef.current) break;
        handleEvent(event);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("MULTIAGENT", `Pipeline error: ${msg}`, "error");
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(event: MultiAgentEvent) {
    if (event.type === "pipeline_start") {
      const initial: AgentMessage[] = (event.agents ?? []).map((a) => ({
        agentIndex: a.index,
        agentName: a.name,
        tokens: "",
        done: false,
      }));
      setMessages(initial);
      log("MULTIAGENT", `Pipeline started — ${event.total} agents`, "info");
    } else if (event.type === "agent_start") {
      log("MULTIAGENT", `▶ Agent ${(event.index ?? 0) + 1}: ${event.name}`, "running");
    } else if (event.type === "agent_tool") {
      log("TOOL", `${event.tool === "web_search" ? "Web search" : "Retrieval"}: "${event.query}"`, "info");
      setMessages((prev) =>
        prev.map((m) =>
          m.agentIndex === event.index
            ? { ...m, tool: event.tool, toolQuery: event.query, toolPreview: event.result_preview }
            : m
        )
      );
    } else if (event.type === "agent_token") {
      setMessages((prev) =>
        prev.map((m) =>
          m.agentIndex === event.index ? { ...m, tokens: m.tokens + (event.token ?? "") } : m
        )
      );
    } else if (event.type === "agent_done") {
      setMessages((prev) =>
        prev.map((m) =>
          m.agentIndex === event.index ? { ...m, done: true } : m
        )
      );
      log("RESULT", `✓ Agent ${(event.index ?? 0) + 1} done — ${(event.output ?? "").length} chars`, "success");
    } else if (event.type === "done") {
      log("MULTIAGENT", "Pipeline complete", "success");
    }
  }

  function stop() {
    abortRef.current = true;
    setRunning(false);
    log("MULTIAGENT", "Pipeline stopped by user", "warn");
  }

  const canRun = input.trim().length > 0 && agents.length > 0 && !running;

  // ── Shared config panel content ─────────────────────────────────────────
  const configContent = (
    <>
      {/* Templates */}
      <div className="px-3 py-2.5 border-b border-gray-800 shrink-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Templates</p>
        <div className="space-y-1">
          {TEMPLATES.map((t, i) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => applyTemplate(i)}
                className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-all border ${
                  activeTemplate === i
                    ? "bg-pink-500/10 border-pink-500/40 text-pink-300"
                    : "bg-gray-800/50 border-transparent text-gray-400 hover:border-gray-700 hover:text-gray-200"
                }`}
              >
                <Icon size={13} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-none">{t.label}</p>
                  <p className="text-[10px] mt-0.5 text-gray-500 leading-tight">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 min-h-0">
        {agents.map((a, i) => (
          <AgentCard
            key={a.id}
            agent={a}
            index={i}
            total={agents.length}
            color={AGENT_COLORS[i % AGENT_COLORS.length]}
            onChange={(updated) => updateAgent(a.id, updated)}
            onDelete={() => deleteAgent(a.id)}
            onMoveUp={() => moveAgent(i, -1)}
            onMoveDown={() => moveAgent(i, 1)}
          />
        ))}
        <button
          onClick={addAgent}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-700 text-xs text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-all"
        >
          <Plus size={13} />
          Add Agent
        </button>
      </div>

      {/* Input + controls */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-2 shrink-0">
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide">Collection</label>
          <input
            value={coll}
            onChange={(e) => setColl(e.target.value)}
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-gray-500"
            placeholder="default"
          />
        </div>
        <div>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide">Input / Question</label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(); }}
            rows={3}
            className="w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white resize-none focus:outline-none focus:border-gray-500"
            placeholder="What should the agents work on?"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={run}
            disabled={!canRun}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            {running ? "Running…" : "Run Pipeline"}
          </button>
          {running && (
            <button
              onClick={stop}
              className="px-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-400 border border-gray-700 transition-all"
            >
              <Square size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  );

  // ── Shared output panel content ─────────────────────────────────────────
  const outputContent = (
    <>
      <div className="px-4 py-3 border-b border-gray-800 shrink-0 flex items-center gap-2">
        <Sparkles size={14} className="text-pink-400" />
        <h3 className="text-sm font-semibold text-gray-200">Live Agent Conversation</h3>
        {running && (
          <span className="ml-2 text-[10px] text-pink-400 bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-full animate-pulse">
            STREAMING
          </span>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
            <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Users size={24} className="text-pink-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300">Configure your pipeline</p>
              <p className="text-xs text-gray-600 mt-1 max-w-xs">
                Choose a template, enter your input, and hit Run Pipeline to watch agents collaborate.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 text-xs text-gray-600 bg-gray-900 rounded-xl px-4 py-3 border border-gray-800 max-w-sm w-full">
              <p className="font-semibold text-gray-400 mb-1">How it works</p>
              <p>① Each agent runs in sequence</p>
              <p>② Previous outputs are passed as context</p>
              <p>③ Tool results (web/docs) enrich the prompt</p>
              <p>④ Tokens stream live as each agent thinks</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <AgentOutput
              key={msg.agentIndex}
              msg={msg}
              color={AGENT_COLORS[i % AGENT_COLORS.length]}
            />
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full bg-gray-950 text-white overflow-hidden">
      {/* ── Mobile tab bar ─────────────────────────────────────── */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-10 flex border-b border-gray-800 bg-gray-900 shrink-0">
        <button
          onClick={() => setMobileView("config")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
            mobileView === "config" ? "text-pink-400 border-b-2 border-pink-500" : "text-gray-500"
          }`}
        >
          <Settings size={13} />
          Pipeline
        </button>
        <button
          onClick={() => setMobileView("output")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors ${
            mobileView === "output" ? "text-pink-400 border-b-2 border-pink-500" : "text-gray-500"
          }`}
        >
          <Sparkles size={13} />
          Output {running && <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />}
        </button>
      </div>

      {/* ── Mobile: stacked single-panel view ────────────────── */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden pt-10">
        {mobileView === "config"
          ? <div className="flex flex-col flex-1 overflow-hidden">{configContent}</div>
          : <div className="flex flex-col flex-1 overflow-hidden">{outputContent}</div>
        }
      </div>

      {/* ── Desktop: side-by-side ─────────────────────────────── */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left config panel */}
        <div className="w-80 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 shrink-0">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-pink-400" />
              <h2 className="text-sm font-bold text-white">Multi-Agent Pipeline</h2>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Chain specialized AI agents sequentially</p>
          </div>
          {configContent}
        </div>

        {/* Right conversation panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {outputContent}
        </div>
      </div>
    </div>
  );
}
