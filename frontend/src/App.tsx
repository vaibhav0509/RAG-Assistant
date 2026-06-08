import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Gamepad2, Terminal, Compass, BrainCircuit, FileUser, Zap, FlaskConical, Telescope } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { GamePage } from "./components/game/GamePage";
import { Blueprint } from "./components/Blueprint";
import { AgentPage } from "./components/AgentPage";
import { PortfolioPage } from "./components/PortfolioPage";
import { EvalPage } from "./components/EvalPage";
import { VisualizePage } from "./components/VisualizePage";
import { HomePage } from "./components/HomePage";
import { ModelSelector } from "./components/ModelSelector";
import { TerminalSidebar } from "./components/TerminalSidebar";
import { ProcessProvider, useProcess } from "./context/ProcessContext";

type Tab = "home" | "chat" | "game" | "blueprint" | "agent" | "portfolio" | "eval" | "visualize";

const TABS: { id: Tab; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { id: "chat",      label: "Chat",      icon: MessageSquare,  hint: "RAG Chat"         },
  { id: "agent",     label: "Agent",     icon: BrainCircuit,   hint: "ReAct Agent"      },
  { id: "game",      label: "Quiz",      icon: Gamepad2,       hint: "Quiz Game"        },
  { id: "portfolio", label: "Portfolio", icon: FileUser,       hint: "CV → Portfolio"   },
  { id: "eval",      label: "Eval",      icon: FlaskConical,   hint: "RAG Evaluation"      },
  { id: "visualize", label: "Visualize", icon: Telescope,      hint: "Embeddings & Context"},
  { id: "blueprint", label: "Blueprint", icon: Compass,        hint: "Docs & Blueprint"    },
];

// ─── Desktop icon nav ──────────────────────────────────────────────────────

function IconNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="hidden md:flex w-[60px] bg-gray-950 flex-col items-center py-3 gap-1 shrink-0 border-r border-gray-800 z-20">
      {/* Logo — click to go home */}
      <div className="relative group mb-3 shrink-0">
        <button
          onClick={() => setTab("home")}
          className={`w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center transition-all ${
            tab === "home" ? "ring-2 ring-brand-400 ring-offset-2 ring-offset-gray-950" : "hover:opacity-90"
          }`}
        >
          <Zap size={16} className="text-white" />
        </button>
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
          <div className="bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
            <p className="text-xs font-semibold text-white">Home</p>
            <p className="text-[10px] text-gray-400">Overview & quick start</p>
          </div>
        </div>
      </div>

      {TABS.map((t) => (
        <div key={t.id} className="relative group">
          <button
            onClick={() => setTab(t.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              tab === t.id
                ? "bg-brand-600 text-white shadow-lg"
                : "text-gray-500 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <t.icon size={18} />
          </button>
          {/* Tooltip */}
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            <div className="bg-gray-900 border border-gray-700 px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap">
              <p className="text-xs font-semibold text-white">{t.label}</p>
              <p className="text-[10px] text-gray-400">{t.hint}</p>
            </div>
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── Mobile bottom nav ─────────────────────────────────────────────────────

function MobileNav({ tab, setTab, monitorOpen, onToggleMonitor }: {
  tab: Tab; setTab: (t: Tab) => void;
  monitorOpen: boolean; onToggleMonitor: () => void;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-30">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
            tab === t.id ? "text-brand-600" : "text-gray-400 active:text-gray-600"
          }`}
        >
          <t.icon size={20} />
          <span className="text-[9px] font-semibold">{t.label}</span>
        </button>
      ))}
      <button
        onClick={onToggleMonitor}
        className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
          monitorOpen ? "text-green-500" : "text-gray-400"
        }`}
      >
        <Terminal size={20} />
        <span className="text-[9px] font-semibold">Monitor</span>
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
