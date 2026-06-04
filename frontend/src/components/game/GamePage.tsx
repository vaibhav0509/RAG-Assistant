import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopicSetup } from "./TopicSetup";
import { QuestionCard } from "./QuestionCard";
import { GameAnalysis } from "./GameAnalysis";
import { GameLoader } from "./GameLoader";
import { startGameStream, submitAnswer, fetchAnalysis } from "../../api/client";
import { useProcess } from "../../context/ProcessContext";

type Stage = "setup" | "playing" | "analysis";

interface Question {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
  source: string;
}

interface Props {
  model: string;
  collection: string;
}

const SOURCE_LABEL: Record<string, string> = {
  doc: "Documents (RAG)", web: "Web Search", model: "Model Knowledge",
};

export function GamePage({ model, collection }: Props) {
  const { log } = useProcess();
  const [stage, setStage] = useState<Stage>("setup");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [analysis, setAnalysis] = useState<object | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>([]);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [error, setError] = useState("");

  const handleStart = async (topic: string, subtopic: string, sources: string[]) => {
    setLoadingStart(true);
    setError("");
    setStatusLog([]);
    setActiveSources(sources);

    log("GAME", `Quiz started: "${topic}" → "${subtopic}"`, "info");
    log("GAME", `Sources: ${sources.map((s) => SOURCE_LABEL[s]).join(", ")}`, "info");

    if (sources.includes("doc")) log("RAG", "Will retrieve chunks from ChromaDB", "info");
    if (sources.includes("web")) log("WEB", "Will search DuckDuckGo for web content", "info");
    if (sources.includes("model")) log("MODEL", `Will use ${model || "default model"} internal knowledge`, "info");

    try {
      for await (const data of startGameStream(
        { topic, subtopic, sources, collection, model },
        (msg) => {
          setStatusLog((prev) => [...prev.slice(-4), msg]);
          // Map status messages to terminal events
          if (msg.includes("web") || msg.includes("Web")) log("WEB", msg, "running");
          else if (msg.includes("Writing") || msg.includes("Generating")) log("MODEL", msg, "running");
          else if (msg.includes("Got") || msg.includes("Found")) log("DONE", msg, "success");
          else if (msg.includes("document") || msg.includes("chunk")) log("RETRIEVAL", msg, "running");
          else log("GAME", msg, "info");
        },
      )) {
        log("GAME", `Generated ${data.total} questions successfully`, "success");
        log("MODEL", "Quiz ready — RAG pipeline complete", "success");
        setQuestions(data.questions);
        setSessionId(data.session_id);
        setCurrentIdx(0);
        setStage("playing");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start game";
      log("DONE", `Error: ${msg}`, "error");
      setError(msg);
    } finally {
      setLoadingStart(false);
      setStatusLog([]);
    }
  };

  const handleAnswer = async (answer: string, timeMs: number) => {
    const q = questions[currentIdx];
    const result = await submitAnswer({
      session_id: sessionId,
      round_id: q.id,
      answer,
      response_time_ms: timeMs,
    });

    log(
      "ANSWER",
      `Q${currentIdx + 1}: answered "${answer}" — ${result.is_correct ? "✓ correct" : `✗ wrong (correct: ${result.correct_answer})`} · ${(timeMs / 1000).toFixed(1)}s`,
      result.is_correct ? "success" : "warn",
    );

    await new Promise((r) => setTimeout(r, 2000));

    if (currentIdx + 1 >= questions.length) {
      setLoadingAnalysis(true);
      log("GAME", "All questions answered — computing analysis…", "running");
      const data = await fetchAnalysis(sessionId);
      log("GAME", `Analysis ready: ${(data as any).score}/${(data as any).total} (${(data as any).accuracy}% accuracy)`, "success");
      setAnalysis(data);
      setLoadingAnalysis(false);
      setStage("analysis");
    } else {
      setCurrentIdx((i) => i + 1);
    }

    return result;
  };

  const handlePlayAgain = () => {
    log("GAME", "New quiz session started", "info");
    setStage("setup");
    setQuestions([]);
    setSessionId("");
    setCurrentIdx(0);
    setAnalysis(null);
    setStatusLog([]);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === "setup" && (
          <motion.div key="setup" className="flex-1 flex flex-col overflow-hidden">
            <AnimatePresence mode="wait">
              {loadingStart ? (
                <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
                  <GameLoader statusLog={statusLog} sources={activeSources} />
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col overflow-y-auto">
                  {error && (
                    <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
                  )}
                  <TopicSetup model={model} onStart={handleStart} loading={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {stage === "playing" && (
          <motion.div key="playing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-6">
            {loadingAnalysis ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-3 animate-bounce">📊</div>
                  <p className="text-gray-500">Calculating your results…</p>
                </div>
              </div>
            ) : (
              <QuestionCard question={questions[currentIdx]} index={currentIdx} total={questions.length} onAnswer={handleAnswer} />
            )}
          </motion.div>
        )}

        {stage === "analysis" && analysis && (
          <motion.div key="analysis" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 overflow-y-auto p-6">
            <GameAnalysis analysis={analysis as any} onPlayAgain={handlePlayAgain} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
