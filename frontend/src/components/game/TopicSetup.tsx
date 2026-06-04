import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { SourceSelector } from "./SourceSelector";
import { suggestSubtopics } from "../../api/client";

const SUGGEST_WORDS = [
  "Thinking of subtopics…",
  "Exploring the topic…",
  "Mapping out ideas…",
  "Brainstorming…",
  "Almost ready…",
];

interface Props {
  model: string;
  onStart: (topic: string, subtopic: string, sources: string[]) => void;
  loading: boolean;
}

function SuggestLoader({ topic }: { topic: string }) {
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % SUGGEST_WORDS.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col items-center py-8 gap-5"
    >
      {/* Spinning rings */}
      <div className="relative w-20 h-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{ borderTopColor: "#4f6ef7", borderRightColor: "#818cf8" }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-4 border-transparent"
          style={{ borderTopColor: "#f97316", borderLeftColor: "#fb923c" }}
        />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2.5 h-2.5 rounded-full bg-brand-500 shadow-md" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2"
        >
          <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-orange-400 shadow-md" />
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="text-xl"
          >
            ✨
          </motion.div>
        </div>
      </div>

      {/* Cycling text */}
      <div className="h-6 flex items-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={wordIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-base font-semibold text-gray-700"
          >
            {SUGGEST_WORDS[wordIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="text-sm text-gray-400">
        Finding the best subtopics for <span className="font-medium text-brand-500">"{topic}"</span>
      </p>

      {/* Bouncing dots */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            className="w-2 h-2 rounded-full bg-brand-400"
          />
        ))}
      </div>
    </motion.div>
  );
}

export function TopicSetup({ model, onStart, loading }: Props) {
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState(["model"]);
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");

  const handleSuggest = async () => {
    if (!topic.trim()) return;
    setSuggesting(true);
    setError("");
    setSubtopics([]);
    setSelected("");
    try {
      const { subtopics: list } = await suggestSubtopics(topic.trim(), model);
      setSubtopics(list);
    } catch {
      setError("Failed to suggest subtopics. Try again.");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6"
      >
        <div className="text-center">
          <div className="text-5xl mb-3">🧠</div>
          <h2 className="text-2xl font-bold text-gray-800">Quiz Challenge</h2>
          <p className="text-gray-500 text-sm mt-1">Test your knowledge with AI-generated questions</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {suggesting ? (
              <SuggestLoader key="loader" topic={topic} />
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Question Sources
                  </label>
                  <SourceSelector value={sources} onChange={setSources} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    Topic
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
                      placeholder="e.g. Machine Learning, World History, Python…"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleSuggest}
                      disabled={!topic.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      <Sparkles size={14} />
                      Suggest
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {subtopics.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                        Choose a Subtopic
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {subtopics.map((sub, i) => (
                          <motion.button
                            key={sub}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.07 }}
                            onClick={() => setSelected(sub)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              selected === sub
                                ? "bg-brand-500 text-white border-brand-500 scale-105 shadow-md"
                                : "bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-400 hover:bg-brand-50"
                            }`}
                          >
                            {sub}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  onClick={() => onStart(topic.trim(), selected, sources)}
                  disabled={!selected}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
                >
                  Start Quiz <ArrowRight size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
