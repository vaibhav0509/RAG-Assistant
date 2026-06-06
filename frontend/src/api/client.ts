const API_KEY = "enterprise-rag-secret";
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api/v1";

const headers = () => ({
  "X-API-Key": API_KEY,
  "Content-Type": "application/json",
});

export async function fetchModels() {
  const res = await fetch(`${BASE}/models`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch models");
  return res.json() as Promise<{ name: string; size_gb: number }[]>;
}

export async function fetchCollections() {
  const res = await fetch(`${BASE}/collections`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch collections");
  return res.json();
}

export async function uploadDocument(file: File, collection: string, chunkStrategy: string = "recursive") {
  const form = new FormData();
  form.append("file", file);
  form.append("collection", collection);
  form.append("chunk_strategy", chunkStrategy);
  const res = await fetch(`${BASE}/documents/upload`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function deleteCollection(name: string) {
  const res = await fetch(`${BASE}/documents/${name}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) throw new Error("Failed to delete collection");
  return res.json();
}

export async function fetchPerfHistory() {
  const res = await fetch(`${BASE}/perf/history`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch perf history");
  return res.json();
}

export async function fetchPerfStats() {
  const res = await fetch(`${BASE}/perf/stats`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch perf stats");
  return res.json();
}

export async function* streamChat(
  question: string,
  collection: string,
  history: { role: string; content: string }[],
  model?: string,
  retrieval_strategy: string = "naive",
  top_k: number = 5,
  use_reranker: boolean = false,
) {
  const res = await fetch(`${BASE}/chat`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ question, collection, history, stream: true, model, retrieval_strategy, top_k, use_reranker }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Chat failed");
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      yield JSON.parse(line.slice(6));
    }
  }
}

export async function parsePortfolio(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/portfolio/parse`, {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Portfolio parse failed");
  }
  return res.json();
}

export async function* streamAgent(
  question: string,
  collection: string,
  model?: string,
) {
  const res = await fetch(`${BASE}/agent`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ question, collection, model }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Agent failed");
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6);
      if (raw === "[DONE]") return;
      yield JSON.parse(raw);
    }
  }
}

// Game API
export async function suggestSubtopics(topic: string, model?: string) {
  const res = await fetch(`${BASE}/game/suggest-subtopics`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ topic, model }),
  });
  if (!res.ok) throw new Error("Failed to suggest subtopics");
  return res.json() as Promise<{ subtopics: string[] }>;
}

export async function* startGameStream(
  payload: { topic: string; subtopic: string; sources: string[]; collection: string; model?: string },
  onStatus: (msg: string) => void,
) {
  const res = await fetch(`${BASE}/game/start`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to start game");
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));
      if (data.event === "status") onStatus(data.message);
      else if (data.event === "error") throw new Error(data.message);
      else if (data.event === "ready") yield data;
    }
  }
}

export async function submitAnswer(payload: {
  session_id: string;
  round_id: string;
  answer: string;
  response_time_ms: number;
}) {
  const res = await fetch(`${BASE}/game/answer`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to submit answer");
  return res.json() as Promise<{ is_correct: boolean; correct_answer: string; explanation: string }>;
}

export async function fetchAnalysis(sessionId: string) {
  const res = await fetch(`${BASE}/game/analysis/${sessionId}`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch analysis");
  return res.json();
}

export async function fetchGameHistory() {
  const res = await fetch(`${BASE}/game/history`, { headers: headers() });
  if (!res.ok) throw new Error("Failed to fetch history");
  return res.json();
}

// Eval API

export interface EvalResult {
  question: string;
  answer: string;
  context_count: number;
  context_relevance: number;
  answer_faithfulness: number;
  answer_relevance: number;
  latency_ms: number;
  error?: string;
}

export interface EvalResponse {
  results: EvalResult[];
  aggregate: {
    context_relevance: number;
    answer_faithfulness: number;
    answer_relevance: number;
    avg_latency_ms: number;
    total_questions: number;
    successful: number;
  };
}

export type EvalStreamEvent =
  | { type: "progress"; index: number; total: number; question: string }
  | { type: "result";   index: number; result: EvalResult }
  | { type: "done";     aggregate: EvalResponse["aggregate"] }
  | { type: "error";    index: number; message: string };

export async function* streamEval(payload: {
  questions: string[];
  collection: string;
  strategy: string;
  top_k: number;
  use_reranker: boolean;
  model?: string;
}): AsyncGenerator<EvalStreamEvent> {
  const res = await fetch(`${BASE}/eval/run`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Evaluation failed");
  }
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      yield JSON.parse(line.slice(6)) as EvalStreamEvent;
    }
  }
}
