import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Globe, FileText, Brain, Clock } from "lucide-react";

interface Question {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
  source: string;
}

interface Result {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
}

interface Props {
  question: Question;
  index: number;
  total: number;
  onAnswer: (answer: string, timeMs: number) => Promise<Result>;
}

const SOURCE_META: Record<string, { icon: typeof Globe; color: string; label: string }> = {
  doc:   { icon: FileText, color: "bg-blue-100 text-blue-700",    label: "Document"  },
  web:   { icon: Globe,    color: "bg-orange-100 text-orange-700", label: "Web"       },
  model: { icon: Brain,    color: "bg-purple-100 text-purple-700", label: "Model"     },
};

const DIFF_COLOR: Record<string, string> = {
  easy:   "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard:   "bg-red-100 text-red-700",
};

export function QuestionCard({ question, index, total, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef(Date.now());
  const src = SOURCE_META[question.source] ?? SOURCE_META.model;

  useEffect(() => {
    startRef.current = Date.now();
    setSelected(null);
    setResult(null);
  }, [question.id]);

  const handleSelect = async (letter: string) => {
    if (selected || submitting) return;
    setSelected(letter);
    setSubmitting(true);
    const timeMs = Date.now() - startRef.current;
    const res = await onAnswer(letter, timeMs);
    setResult(res);
    setSubmitting(false);
  };

  const getOptionStyle = (letter: string) => {
    if (!result) {
      return selected === letter
        ? "border-brand-500 bg-brand-50 scale-[1.01]"
        : "border-gray-200 hover:border-brand-300 hover:bg-gray-50 cursor-pointer";
    }
    if (letter === result.correct_answer) return "border-green-500 bg-green-50";
    if (letter === selected && !result.is_correct) return "border-red-400 bg-red-50";
    return "border-gray-200 opacity-50";
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -60 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-400 font-medium">
            Question {index + 1} <span className="text-gray-300">/</span> {total}
          </span>
          <div className="flex gap-2">
            <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${src.color}`}>
              <src.icon size={11} />
              {src.label}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${DIFF_COLOR[question.difficulty] ?? DIFF_COLOR.medium}`}>
              {question.difficulty}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-brand-500 rounded-full"
            initial={{ width: `${(index / total) * 100}%` }}
            animate={{ width: `${((index + 1) / total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
          <p className="text-lg font-semibold text-gray-800 leading-relaxed">{question.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt) => {
            const letter = opt.charAt(0);
            return (
              <motion.button
                key={opt}
                whileTap={!result ? { scale: 0.98 } : {}}
                onClick={() => handleSelect(letter)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${getOptionStyle(letter)}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 ${
                  result && letter === result.correct_answer
                    ? "bg-green-500 border-green-500 text-white"
                    : result && letter === selected && !result.is_correct
                    ? "bg-red-400 border-red-400 text-white"
                    : "border-gray-300 text-gray-500"
                }`}>
                  {letter}
                </span>
                <span className="text-sm text-gray-700">{opt.slice(3)}</span>
                {result && letter === result.correct_answer && (
                  <CheckCircle2 size={18} className="ml-auto text-green-500 shrink-0" />
                )}
                {result && letter === selected && !result.is_correct && (
                  <XCircle size={18} className="ml-auto text-red-400 shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl border ${
                result.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {result.is_correct
                  ? <CheckCircle2 size={16} className="text-green-600" />
                  : <XCircle size={16} className="text-red-500" />}
                <span className={`text-sm font-semibold ${result.is_correct ? "text-green-700" : "text-red-600"}`}>
                  {result.is_correct ? "Correct!" : "Incorrect"}
                </span>
              </div>
              {result.explanation && (
                <p className="text-sm text-gray-600 mt-1">{result.explanation}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
