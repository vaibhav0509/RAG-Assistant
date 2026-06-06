import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Gamepad2, Terminal, Compass, BrainCircuit, FileUser } from "lucide-react";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { GamePage } from "./components/game/GamePage";
import { Blueprint } from "./components/Blueprint";
import { AgentPage } from "./components/AgentPage";
import { PortfolioPage } from "./components/PortfolioPage";
import { ModelSelector } from "./components/ModelSelector";
import { TerminalSidebar } from "./components/TerminalSidebar";
import { ProcessProvider, useProcess } from "./context/ProcessContext";

type Tab = "chat" | "game" | "blueprint" | "agent" | "portfolio";

function AppInner() {
  const { log } = useProcess();
  const [tab, setTab] = useState<Tab>("chat");
  const [collection, setCollection] = useState("default");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedModel, setSelectedModel] = useState("");
  const [terminalOpen, setTerminalOpen] = useState(false);

  useEffect(() => {
    log("SYSTEM", "RAG Assistant initialized", "success");
    log("SYSTEM", "ChromaDB vector store connected", "success");
    log("SYSTEM", "Embedding model: all-MiniLM-L6-v2", "info");
    log("SYSTEM", "Pipeline mode: RAG (no fine-tuning)", "info");
  }, []);

  useEffect(() => {
    if (selectedModel) log("MODEL", `Active model set to ${selectedModel}`, "info");
  }, [selectedModel]);

  useEffect(() => {
    const labels: Record<Tab, string> = { chat: "Chat", game: "Quiz Game", blueprint: "Blueprint", agent: "Agent", portfolio: "Portfolio" };
    log("SYSTEM", `Switched to ${labels[tab]} mode`, "info");
  }, [tab]);

  const handleCollectionChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: "chat",      label: "Chat",       icon: MessageSquare  },
    { id: "game",      label: "Quiz Game",  icon: Gamepad2       },
    { id: "agent",     label: "Agent",      icon: BrainCircuit   },
    { id: "portfolio", label: "Portfolio",  icon: FileUser       },
    { id: "blueprint", label: "Blueprint",  icon: Compass        },
  ];

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar key={refreshKey} activeCollection={collection} onSelectCollection={setCollection} />

      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shrink-0">
          <div className="flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id ? "text-brand-600" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <t.icon size={15} />
                {t.label}
                {tab === t.id && (
                  <motion.div layoutId="tab-indicator" className="absolute inset-0 bg-brand-50 rounded-lg -z-10" />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            <button
              onClick={() => setTerminalOpen((o) => !o)}
              title="Process Monitor"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                terminalOpen
                  ? "bg-gray-900 text-green-400 border-gray-700"
                  : "bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200"
              }`}
            >
              <Terminal size={14} />
              Monitor
            </button>
          </div>
        </header>

        {/* Content + terminal sidebar — all tabs stay mounted to preserve state */}
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 flex overflow-hidden min-w-0 relative">
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
            <div className={`absolute inset-0 flex overflow-hidden ${tab === "blueprint" ? "" : "invisible pointer-events-none"}`}>
              <Blueprint />
            </div>
          </div>
          <TerminalSidebar open={terminalOpen} onClose={() => setTerminalOpen(false)} />
        </div>
      </main>
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
