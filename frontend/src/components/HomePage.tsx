import { motion } from "framer-motion";
import {
  MessageSquare, BrainCircuit, Gamepad2, FileUser,
  FlaskConical, Compass, Upload, Search, Sparkles,
  ArrowRight,
} from "lucide-react";

type Tab = "chat" | "agent" | "game" | "portfolio" | "eval" | "blueprint";

interface FeatureCard {
  id: Tab;
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  description: string;
  when: string;
  prereq?: string;
}

const FEATURES: FeatureCard[] = [
  {
    id: "chat",
    icon: MessageSquare,
    color: "text-brand-600",
    bg: "bg-brand-50 border-brand-200",
    title: "RAG Chat",
    description: "Upload a document and ask questions. The AI retrieves the most relevant passages and answers based only on what's in your file.",
    when: "When you have a PDF, Word doc, or text file and want to query it in plain English.",
    prereq: "Upload at least one document first.",
  },
  {
    id: "agent",
    icon: BrainCircuit,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    title: "ReAct Agent",
    description: "An autonomous reasoning loop that thinks, picks a tool (your docs, web search, calculator), reads the result, and iterates up to 7 times.",
    when: "When a question needs multiple steps — cross-referencing sources, doing math, or combining doc knowledge with live web results.",
  },
  {
    id: "game",
    icon: Gamepad2,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    title: "Quiz Game",
    description: "Pick a topic, the AI suggests subtopics, then generates multiple-choice questions from your documents, the web, or its own knowledge.",
    when: "When you want to test comprehension of a subject or study uploaded material interactively.",
  },
  {
    id: "portfolio",
    icon: FileUser,
    color: "text-lime-700",
    bg: "bg-lime-50 border-lime-200",
    title: "CV → Portfolio",
    description: "Upload a PDF resume and get an animated portfolio website in seconds. Five visual templates from clean professional to 90s GeoCities chaos.",
    when: "When you want to turn a plain resume into a shareable, styled portfolio page without writing any HTML.",
  },
  {
    id: "eval",
    icon: FlaskConical,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    title: "RAG Evaluation",
    description: "Paste a list of questions, run them through your collection, and get three quality scores per question: context relevance, faithfulness, and answer relevance.",
    when: "When you want to compare retrieval strategies or measure whether your pipeline is actually finding the right content.",
    prereq: "Upload documents first — questions should relate to what's in the collection.",
  },
  {
    id: "blueprint",
    icon: Compass,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    title: "Blueprint",
    description: "An interactive docs page covering every architectural decision — RAG pipeline diagrams, retrieval strategy trade-offs, concept explainers, and interview Q&A.",
    when: "When you want to understand how the system works under the hood, or prepare for an AI/ML engineering interview.",
  },
];

const STEPS = [
  {
    icon: Upload,
    color: "bg-brand-600",
    step: "01",
    title: "Upload a document",
    desc: "Go to Chat → click Upload → choose any PDF, Word doc, or text file. It gets chunked, embedded, and stored automatically.",
  },
  {
    icon: Search,
    color: "bg-violet-600",
    step: "02",
    title: "Ask questions",
    desc: 'Type a question in the chat box. The AI retrieves the most relevant passages and answers from your document — no hallucination.',
  },
  {
    icon: Sparkles,
    color: "bg-amber-500",
    step: "03",
    title: "Explore the tools",
    desc: "Try Agent for complex multi-step questions, Quiz to test what you've learned, or Eval to measure retrieval quality.",
  },
];

interface HomePageProps {
  onNavigate: (tab: Tab) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 rounded-2xl overflow-hidden px-6 sm:px-10 py-10"
        >
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "linear-gradient(#4f6ef720 1px,transparent 1px),linear-gradient(90deg,#4f6ef720 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative z-10">
            <p className="text-brand-400 font-mono text-xs tracking-widest font-bold mb-3">AI STUDIO</p>
            <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Your local AI workspace.<br />
              <span className="text-brand-400">Six tools. One codebase.</span>
            </h1>
            <p className="text-gray-400 mt-4 text-sm leading-relaxed max-w-xl">
              Upload documents and chat with them, run a reasoning agent, generate quizzes, turn a resume into a portfolio,
              evaluate your RAG pipeline quality — all powered by <span className="text-white font-medium">Ollama</span> locally
              or <span className="text-purple-400 font-medium">Groq</span> in the cloud. No OpenAI. No data leaving your machine unless you choose it.
            </p>
            <button
              onClick={() => onNavigate("chat")}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Start with Chat <ArrowRight size={14} />
            </button>
          </div>
          <div className="absolute right-8 top-8 w-48 h-48 bg-brand-500 rounded-full opacity-5 blur-3xl pointer-events-none" />
        </motion.div>

        {/* ── Quick start ── */}
        <div>
          <h2 className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-4">Quick Start</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`${s.color} w-8 h-8 rounded-lg flex items-center justify-center shrink-0`}>
                    <s.icon size={15} className="text-white" />
                  </div>
                  <span className="text-xs font-black text-gray-200 font-mono">{s.step}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{s.title}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Feature cards ── */}
        <div>
          <h2 className="text-xs font-bold tracking-widest text-brand-500 uppercase mb-4">What would you like to do?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col"
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-3 shrink-0 ${f.bg}`}>
                  <f.icon size={17} className={f.color} />
                </div>
                <p className="text-sm font-bold text-gray-900">{f.title}</p>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed flex-1">{f.description}</p>

                {f.prereq && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                    ⚠ {f.prereq}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-gray-400 mb-2">
                    <span className="font-semibold text-gray-500">Use when:</span> {f.when}
                  </p>
                  <button
                    onClick={() => onNavigate(f.id)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${f.bg} ${f.color} hover:opacity-80`}
                  >
                    Open {f.title} <ArrowRight size={11} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Footer note ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4"
        >
          <div>
            <p className="text-sm font-semibold text-gray-700">Backend not responding?</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">ollama serve</code> then start the FastAPI backend —
              or switch to Groq by setting <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">LLM_PROVIDER=groq</code> in <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">backend/.env</code>.
            </p>
          </div>
          <button
            onClick={() => onNavigate("blueprint")}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
          >
            Setup guide <ArrowRight size={11} />
          </button>
        </motion.div>

      </div>
    </div>
  );
}
