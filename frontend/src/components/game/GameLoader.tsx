import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CYCLING_WORDS = [
  "Searching the web…",
  "Fetching sources…",
  "Reading content…",
  "Analyzing context…",
  "Crafting questions…",
  "Calibrating difficulty…",
  "Compiling your quiz…",
  "Checking answers…",
  "Almost there…",
];

interface Props {
  statusLog: string[];
  sources: string[];
}

export function GameLoader({ statusLog, sources }: Props) {
  const [wordIdx, setWordIdx] = useState(0);

  // Cycle through words every 2s independently of actual status
  useEffect(() => {
    const t = setInterval(() => setWordIdx((i) => (i + 1) % CYCLING_WORDS.length), 2000);
    return () => clearInterval(t);
  }, []);

  // Estimate progress: each source has ~3 steps + 1 final
  const estimatedSteps = sources.length * 3 + 1;
  const progress = Math.min(95, Math.round((statusLog.length / estimatedSteps) * 100));
  const latestStatus = statusLog[statusLog.length - 1] ?? "Starting…";

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8 select-none">
      {/* Orbit spinner */}
      <div className="relative w-40 h-40 mb-8">
        {/* Outer spinning ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "#4f6ef7",
            borderRightColor: "#818cf8",
          }}
        />

        {/* Second ring — counter-spin */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute inset-3 rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "#f97316",
            borderLeftColor: "#fb923c",
          }}
        />

        {/* Third inner ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-6 rounded-full border-4 border-transparent"
          style={{
            borderBottomColor: "#a855f7",
            borderRightColor: "#c084fc",
          }}
        />

        {/* Orbiting dot — blue */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-brand-500 shadow-lg shadow-brand-300" />
        </motion.div>

        {/* Orbiting dot — orange */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2"
        >
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-orange-400 shadow-lg shadow-orange-200" />
        </motion.div>

        {/* Orbiting dot — purple */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-4"
        >
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-purple-500 shadow-lg shadow-purple-200" />
        </motion.div>

        {/* Center pulsing core */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-500 shadow-xl flex items-center justify-center">
            <span className="text-2xl">🧠</span>
          </div>
        </motion.div>
      </div>

      {/* Cycling animated word */}
      <div className="h-8 flex items-center justify-center mb-2 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={wordIdx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            className="text-xl font-bold text-gray-700"
          >
            {CYCLING_WORDS[wordIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Latest backend status */}
      <AnimatePresence mode="wait">
        <motion.p
          key={latestStatus}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="text-sm text-gray-400 mb-6 text-center"
        >
          {latestStatus}
        </motion.p>
      </AnimatePresence>

      {/* Progress bar */}
      <div className="w-72 space-y-2">
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 via-purple-500 to-orange-400"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Building quiz</span>
          <motion.span
            key={progress}
            initial={{ scale: 1.3, color: "#4f6ef7" }}
            animate={{ scale: 1, color: "#9ca3af" }}
            transition={{ duration: 0.3 }}
          >
            {progress}%
          </motion.span>
        </div>
      </div>

      {/* Step dots */}
      <div className="flex gap-2 mt-5">
        {Array.from({ length: estimatedSteps }).map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: i < statusLog.length ? "#4f6ef7" : "#e5e7eb",
              scale: i === statusLog.length - 1 ? [1, 1.4, 1] : 1,
            }}
            transition={{ duration: 0.4 }}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>
    </div>
  );
}
