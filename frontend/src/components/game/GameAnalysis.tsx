import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, RefreshCw, Globe, FileText, Brain, Clock, Target } from "lucide-react";

interface SourceStat { total: number; correct: number }

interface Analysis {
  topic: string;
  subtopic: string;
  score: number;
  total: number;
  accuracy: number;
  avg_response_time_ms: number;
  source_breakdown: Record<string, SourceStat>;
  difficulty_breakdown: Record<string, SourceStat>;
}

interface Props {
  analysis: Analysis;
  onPlayAgain: () => void;
}

const SOURCE_CFG: Record<string, { label: string; icon: typeof Globe; bar: string }> = {
  doc:   { label: "Documents",       icon: FileText, bar: "bg-blue-500"   },
  web:   { label: "Web Search",      icon: Globe,    bar: "bg-orange-500" },
  model: { label: "Model Knowledge", icon: Brain,    bar: "bg-purple-500" },
};

const DIFF_CFG: Record<string, { bar: string }> = {
  easy:   { bar: "bg-green-500"  },
  medium: { bar: "bg-yellow-500" },
  hard:   { bar: "bg-red-500"    },
};

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 30);
    const t = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

function BreakdownBar({ label, icon: Icon, bar, stat, total }: {
  label: string; icon: typeof Globe; bar: string; stat: SourceStat; total: number;
}) {
  const pct = total ? Math.round((stat.total / total) * 100) : 0;
  const acc = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-gray-700 font-medium">
          <Icon size={13} />
          {label}
        </span>
        <span className="text-gray-400 text-xs">{stat.total} q · {acc}% correct</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
      <p className="text-xs text-gray-400 text-right">{pct}% of questions</p>
    </div>
  );
}

export function GameAnalysis({ analysis, onPlayAgain }: Props) {
  const emoji = analysis.accuracy >= 80 ? "🏆" : analysis.accuracy >= 50 ? "👍" : "📚";
  const totalQuestions = Object.values(analysis.source_breakdown).reduce((a, s) => a + s.total, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-2xl mx-auto p-4 space-y-4"
    >
      {/* Score card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
        <div className="text-5xl mb-2">{emoji}</div>
        <h2 className="text-2xl font-bold text-gray-800">Quiz Complete!</h2>
        <p className="text-gray-500 text-sm mt-1">{analysis.subtopic} · {analysis.topic}</p>

        <div className="mt-5 flex items-center justify-center gap-8">
          <div>
            <p className="text-4xl font-bold text-brand-500">
              <AnimatedNumber value={analysis.score} /><span className="text-2xl text-gray-400">/{analysis.total}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Score</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div>
            <p className="text-4xl font-bold text-green-500">
              <AnimatedNumber value={Math.round(analysis.accuracy)} /><span className="text-2xl">%</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Accuracy</p>
          </div>
          <div className="w-px h-12 bg-gray-200" />
          <div>
            <p className="text-4xl font-bold text-gray-600">
              <AnimatedNumber value={Math.round(analysis.avg_response_time_ms / 1000)} /><span className="text-2xl text-gray-400">s</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Avg time</p>
          </div>
        </div>
      </div>

      {/* Source breakdown */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Target size={16} /> Question Source Breakdown
        </h3>
        <div className="space-y-4">
          {Object.entries(analysis.source_breakdown).map(([src, stat]) => {
            const cfg = SOURCE_CFG[src] ?? SOURCE_CFG.model;
            return (
              <BreakdownBar
                key={src}
                label={cfg.label}
                icon={cfg.icon}
                bar={cfg.bar}
                stat={stat}
                total={totalQuestions}
              />
            );
          })}
        </div>
      </div>

      {/* Difficulty breakdown */}
      {Object.keys(analysis.difficulty_breakdown).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Trophy size={16} /> Performance by Difficulty
          </h3>
          <div className="space-y-3">
            {Object.entries(analysis.difficulty_breakdown).map(([diff, stat]) => {
              const acc = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
              const bar = DIFF_CFG[diff]?.bar ?? "bg-gray-400";
              return (
                <div key={diff} className="flex items-center gap-3">
                  <span className="text-sm capitalize text-gray-600 w-16">{diff}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${acc}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-16 text-right">{stat.correct}/{stat.total} correct</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={onPlayAgain}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-semibold transition-colors"
      >
        <RefreshCw size={16} />
        Play Again
      </button>
    </motion.div>
  );
}
