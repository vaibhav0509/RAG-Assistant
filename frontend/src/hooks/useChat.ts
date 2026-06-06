import { useState, useCallback } from "react";
import { Message, Source } from "../types";
import { streamChat } from "../api/client";
import { useProcess } from "../context/ProcessContext";
import { RetrievalConfig } from "../components/RetrievalSelector";

export function useChat(collection: string, model?: string, retrieval?: RetrievalConfig) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { log } = useProcess();

  const strategy = retrieval?.strategy ?? "naive";
  const topK     = retrieval?.topK ?? 5;
  const rerank   = retrieval?.rerank ?? false;

  const STRATEGY_LABEL: Record<string, string> = {
    naive:       "Naive Dense",
    hybrid:      "Hybrid BM25 + Dense",
    hyde:        "HyDE",
    multi_query: "Multi-Query",
  };

  const sendMessage = useCallback(
    async (question: string) => {
      setError(null);
      const userMsg: Message       = { id: crypto.randomUUID(), role: "user", content: question };
      const assistantId            = crypto.randomUUID();
      const assistantMsg: Message  = { id: assistantId, role: "assistant", content: "", loading: true };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);

      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const t0 = Date.now();

      log("QUERY",     `"${question.slice(0, 60)}${question.length > 60 ? "…" : ""}"`, "info");
      log("EMBED",     "Vectorizing query · all-MiniLM-L6-v2", "running");
      log("RETRIEVAL", `Strategy: ${STRATEGY_LABEL[strategy]} · Top-${topK}${rerank ? ` · fetching ${topK * 3} candidates` : ""}`, "running");

      if (strategy === "hyde")        log("MODEL", "Generating hypothetical document (HyDE)…", "running");
      if (strategy === "multi_query") log("MODEL", "Expanding to multiple query variations…", "running");
      if (strategy === "hybrid")      log("DB",    "Running BM25 keyword search + dense vector search", "running");
      if (rerank)                     log("RAG",   "Cross-encoder re-ranking candidates…", "running");

      try {
        let fullContent = "";
        let sources: Source[] = [];
        let firstToken = false;

        for await (const event of streamChat(question, collection, history, model, strategy, topK, rerank)) {
          if (event.token) {
            if (!firstToken) {
              log("MODEL",  `Calling ${model || "default model"}`, "running");
              log("STREAM", "Receiving response tokens…", "running");
              firstToken = true;
            }
            fullContent += event.token;
            setMessages((prev) =>
              prev.map((m) => m.id === assistantId ? { ...m, content: fullContent, loading: true } : m)
            );
          }
          if (event.done) {
            sources = event.sources ?? [];
            const p = event.perf ?? {} as any;
            const srcCount = sources.length;
            const avgScore = sources.length
              ? (sources.reduce((a: number, s: any) => a + (s.rerank_score ?? s.score), 0) / sources.length).toFixed(3)
              : "n/a";

            log("RETRIEVAL", `Retrieved ${srcCount} chunks · avg score ${avgScore}${p.reranked ? " (re-ranked)" : ""}`, "success");
            log("RAG",       `Context injected (${srcCount} source${srcCount !== 1 ? "s" : ""})`, "success");
            if (p.rerank_ms) log("RAG", `Re-rank: ${p.rerank_ms}ms · scored ${sources.length} candidates`, "info");
            if (p.retrieval_ms) log("CONTEXT", `Retrieve ${p.retrieval_ms}ms · LLM ${p.llm_ms}ms · Total ${p.total_ms}ms`, "info");
          }
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        log("DONE", `Complete in ${elapsed}s · ${fullContent.split(" ").length} words`, "success");

        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: fullContent, sources, loading: false } : m)
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        log("DONE", `Error: ${msg}`, "error");
        setError(msg);
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `Error: ${msg}`, loading: false } : m)
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, collection, model, strategy, topK, rerank, log]
  );

  const clearMessages = useCallback(() => setMessages([]), []);
  return { messages, loading, error, sendMessage, clearMessages };
}
