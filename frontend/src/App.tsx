import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Gamepad2, Terminal, Compass, BrainCircuit, FileUser, Zap, FlaskConical, Telescope, GitBranch, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { GamePage } from "./components/game/GamePage";
import { Blueprint } from "./components/Blueprint";
import { AgentPage } from "./components/AgentPage";
import { PortfolioPage } from "./components/PortfolioPage";
import { EvalPage } from "./components/EvalPage";
import { VisualizePage } from "./components/VisualizePage";
import { WorkflowPage } from "./components/WorkflowPage";
import { MultiAgentPage } from "./components/MultiAgentPage";
import { HomePage } from "./components/HomePage";
import { ModelSelector } from "./components/ModelSelector";
import { TerminalSidebar } from "./components/TerminalSidebar";
import { ProcessProvider, useProcess } from "./context/ProcessContext";

type Tab = "home" | "chat" | "game" | "blueprint" | "agent" | "portfolio" | "eval" | "visualize" | "workflow" | "multi-agent";

const TABS: {
  id: Tab; label: string; icon: typeof MessageSquare; hint: string;
  activeText: string; activeBg: string; activeBorder: string; dot: string;
}[] = [
  { id: "chat",      label: "Chat",      icon: MessageSquare, hint: "RAG Chat",              activeText: "text-brand-400",  activeBg: "bg-brand-500/10",   activeBorder: "border-brand-500",  dot: "bg-brand-500"  },
  { id: "agent",     label: "Agent",     icon: BrainCircuit,  hint: "ReAct Agent",            activeText: "text-violet-400", activeBg: "bg-violet-500/10",  activeBorder: "border-violet-500", dot: "bg-violet-500" },
  { id: "game",      label: "Quiz",      icon: Gamepad2,      hint: "Quiz Game",              activeText: "text-amber-400",  activeBg: "bg-amber-500/10",   activeBorder: "border-amber-500",  dot: "bg-amber-500"  },
  { id: "portfolio", label: "Portfolio", icon: FileUser,      hint: "CV → Portfolio",         activeText: "text-lime-400",   activeBg: "bg-lime-500/10",    activeBorder: "border-lime-500",   dot: "bg-lime-500"   },
  { id: "eval",      label: "Eval",      icon: FlaskConical,  hint: "RAG Evaluation",         activeText: "text-sky-400",    activeBg: "bg-sky-500/10",     activeBorder: "border-sky-500",    dot: "bg-sky-500"    },
  { id: "visualize", label: "Visualize", icon: Telescope,     hint: "Embeddings & Context",   activeText: "text-indigo-400", activeBg: "bg-indigo-500/10",  activeBorder: "border-indigo-500", dot: "bg-indigo-500" },
  { id: "workflow",    label: "Workflow",  icon: GitBranch,     hint: "Workflow Builder",        activeText: "text-rose-400",   activeBg: "bg-rose-500/10",    activeBorder: "border-rose-500",   dot: "bg-rose-500"   },
  { id: "multi-agent",label: "Multi-AI",  icon: Users,         hint: "Multi-Agent Pipeline",    activeText: "text-pink-400",   activeBg: "bg-pink-500/10",    activeBorder: "border-pink-500",   dot: "bg-pink-500"   },
  { id: "blueprint",  label: "Blueprint", icon: Compass,       hint: "Docs & Architecture",    activeText: "text-gray-300",   activeBg: "bg-gray-700/40",    activeBorder: "border-gray-500",   dot: "bg-gray-400"   },
];

// ─── Desktop sidebar nav ───────────────────────────────────────────────────

function IconNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav
      className={`hidden md:flex flex-col bg-slate-900 shrink-0 border-r border-slate-700/60 z-20 transition-all duration-200 ${
        collapsed ? "w-[60px]" : "w-[200px]"
      }`}
    >
      {/* Logo row */}
      <div className={`flex items-center gap-2.5 px-3 py-4 border-b border-slate-700/60 shrink-0 ${collapsed ? "justify-center" : ""}`}>
        {collapsed ? (
          /* When collapsed: clicking the logo area expands the sidebar */
          <button
            onClick={() => setCollapsed(false)}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 hover:opacity-90 transition-all"
            title="Expand sidebar"
          >
            <ChevronRight size={14} className="text-white" />
          </button>
        ) : (
          <>
            <button
              onClick={() => setTab("home")}
              className={`w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0 transition-all ${
                tab === "home" ? "ring-2 ring-brand-400 ring-offset-1 ring-offset-slate-900" : "hover:opacity-90"
              }`}
            >
              <Zap size={14} className="text-white" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold leading-none">AI Studio</p>
              <p className="text-slate-500 text-[10px] mt-0.5">nine tools</p>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
              title="Collapse sidebar"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}
      </div>

      {/* Tab list */}
      <div className="flex-1 py-2 flex flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
        {TABS.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={collapsed ? `${t.label} — ${t.hint}` : undefined}
              className={`group relative flex items-center gap-3 mx-2 px-2.5 py-2 rounded-lg transition-all duration-150 border-l-2 ${
                isActive
                  ? `bg-white/10 text-white ${t.activeBorder}`
                  : "border-transparent text-slate-400 hover:bg-slate-800 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <t.icon size={16} className={`shrink-0 ${isActive ? t.activeText : ""}`} />
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-semibold leading-none truncate">{t.label}</p>
                  <p className={`text-[10px] mt-0.5 leading-none truncate ${isActive ? "text-white/60" : "text-slate-500 group-hover:text-slate-300"}`}>
                    {t.hint}
                  </p>
                </div>
              )}
              {/* Collapsed tooltip */}
              {collapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  <div className="bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-lg shadow-xl">
                    <p className="text-xs font-semibold text-white">{t.label}</p>
                    <p className="text-[10px] text-gray-400">{t.hint}</p>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="border-t border-slate-700/60 py-3 px-4 shrink-0">
          <p className="text-[11px] font-semibold text-slate-300 truncate">Vaibhav Mishra</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">frontend dev · building with AI</p>
        </div>
      )}
    </nav>
  );
}

// ─── Mobile bottom nav — horizontally scrollable ───────────────────────────

function MobileNav({ tab, setTab, monitorOpen, onToggleMonitor }: {
  tab: Tab; setTab: (t: Tab) => void;
  monitorOpen: boolean; onToggleMonitor: () => void;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700/60 flex z-30 overflow-x-auto scrollbar-hide">
      {TABS.map((t) => {
        const isActive = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-none flex flex-col items-center justify-center py-2 px-3 gap-0.5 min-w-[64px] transition-colors ${
              isActive ? t.activeText : "text-slate-400 active:text-slate-200"
            }`}
          >
            <t.icon size={18} />
            <span className="text-[9px] font-semibold whitespace-nowrap">{t.label}</span>
            {isActive && <div className={`w-3 h-0.5 rounded-full mt-0.5 ${t.dot}`} />}
          </button>
        );
      })}
      <button
        onClick={onToggleMonitor}
        className={`flex-none flex flex-col items-center justify-center py-2 px-3 gap-0.5 min-w-[64px] transition-colors ${
          monitorOpen ? "text-green-400" : "text-slate-400"
        }`}
      >
        <Terminal size={18} />
        <span className="text-[9px] font-semibold">Monitor</span>
        {monitorOpen && <div className="w-3 h-0.5 rounded-full mt-0.5 bg-green-400" />}
      </button>
    </nav>
  );
}

// ─── App ───────────────────────────────────────────────────────────────────

function AppInner() {
  const { log } = useProcess();
  const [tab, setTab]                     = useState<Tab>("home");
  const [collection, setCollection]       = useState("default");
  const [refreshKey, setRefreshKey]       = useState(0);
  const [selectedModel, setSelectedModel] = useState("");
  const [terminalOpen, setTerminalOpen]   = useState(false);

  useEffect(() => {
    log("SYSTEM", "AI Studio initialized", "success");
    log("SYSTEM", "ChromaDB vector store connected", "success");
    log("SYSTEM", "Embedding model: all-MiniLM-L6-v2", "info");
    log("SYSTEM", "Pipeline: RAG — no fine-tuning", "info");
  }, []);

  useEffect(() => {
    if (selectedModel) log("MODEL", `Active model: ${selectedModel}`, "info");
  }, [selectedModel]);

  useEffect(() => {
    const labels: Record<Tab, string> = {
      home: "Home", chat: "Chat", game: "Quiz Game", blueprint: "Blueprint",
      agent: "Agent", portfolio: "Portfolio", eval: "Eval", visualize: "Visualize",
      workflow: "Workflow", "multi-agent": "Multi-Agent",
    };
    log("SYSTEM", `Switched to ${labels[tab]}`, "info");
  }, [tab]);

  const handleCollectionChange = useCallback(() => setRefreshKey((k) => k + 1), []);
  const activeHint = TABS.find((t) => t.id === tab)?.hint ?? "";

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <IconNav tab={tab} setTab={setTab} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 h-12 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            {/* Mobile logo — click to go home */}
            <button
              onClick={() => setTab("home")}
              className="md:hidden w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shrink-0"
            >
              <Zap size={13} className="text-white" />
            </button>
            <span className="font-bold text-gray-800 text-sm">AI Studio</span>
            {activeHint && (
              <span className="hidden md:inline text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {activeHint}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />

            {/* Monitor button — header on both desktop and mobile */}
            <button
              onClick={() => setTerminalOpen((o) => !o)}
              title="Process Monitor"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                terminalOpen
                  ? "bg-gray-900 text-green-400 border-gray-700"
                  : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200 hover:text-gray-700"
              }`}
            >
              <Terminal size={14} />
              <span className="hidden sm:inline">Monitor</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          {/* Collections sidebar — chat tab only, desktop only, animated */}
          <AnimatePresence initial={false}>
            {tab === "chat" && (
              <motion.div
                className="hidden md:flex shrink-0 overflow-hidden"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 256, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
              >
                <Sidebar key={refreshKey} activeCollection={collection} onSelectCollection={setCollection} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tab panels — all mounted, toggled with CSS to preserve state */}
          <div className="flex-1 overflow-hidden min-w-0 relative mb-16 md:mb-0">
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "home"      ? "" : "invisible pointer-events-none"}`}>
              <HomePage onNavigate={(t) => setTab(t as Tab)} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "chat"      ? "" : "invisible pointer-events-none"}`}>
              <Chat collection={collection} onCollectionChange={handleCollectionChange} model={selectedModel} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "game"      ? "" : "invisible pointer-events-none"}`}>
              <GamePage model={selectedModel} collection={collection} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "agent"     ? "" : "invisible pointer-events-none"}`}>
              <AgentPage collection={collection} model={selectedModel} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "portfolio" ? "" : "invisible pointer-events-none"}`}>
              <PortfolioPage />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "eval"      ? "" : "invisible pointer-events-none"}`}>
              <EvalPage />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "visualize" ? "" : "invisible pointer-events-none"}`}>
              <VisualizePage />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "workflow"  ? "" : "invisible pointer-events-none"}`}>
              <WorkflowPage active={tab === "workflow"} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "multi-agent" ? "" : "invisible pointer-events-none"}`}>
              <MultiAgentPage collection={collection} />
            </div>
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "blueprint" ? "" : "invisible pointer-events-none"}`}>
              <Blueprint />
            </div>
          </div>

          <TerminalSidebar open={terminalOpen} onClose={() => setTerminalOpen(false)} />
        </div>
      </div>

      <MobileNav
        tab={tab} setTab={setTab}
        monitorOpen={terminalOpen}
        onToggleMonitor={() => setTerminalOpen((o) => !o)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ProcessProvider>
      <AppInner />
    </ProcessProvider>
  );
}
