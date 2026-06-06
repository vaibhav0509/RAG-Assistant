import asyncio
import json
import time
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.retrieval import retrieve, RetrievalStrategy
from app.services.reranker import rerank
from app.services.llm import generate_answer
from app.services import eval_metrics

router = APIRouter(prefix="/eval", tags=["evaluation"])

# Per-question wall-clock timeout — prevents a hanging LLM call from blocking forever
QUESTION_TIMEOUT_S = 90


class EvalRequest(BaseModel):
    questions: list[str]
    collection: str = "default"
    strategy: str = "naive"
    top_k: int = 5
    use_reranker: bool = False
    model: Optional[str] = None


async def _evaluate_one(question: str, req: EvalRequest, strategy: RetrievalStrategy) -> dict:
    """Evaluate a single question. Raises on timeout or unrecoverable error."""
    t0 = time.perf_counter()
    fetch_k = req.top_k * 3 if req.use_reranker else req.top_k

    chunks, _ = await retrieve(question, req.collection, strategy, fetch_k, req.model)

    if not chunks:
        return {
            "question": question,
            "answer": "",
            "context_count": 0,
            "context_relevance": 0.0,
            "answer_faithfulness": 0.0,
            "answer_relevance": 0.0,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "error": "No documents found in this collection. Upload documents first.",
        }

    if req.use_reranker:
        chunks, _ = rerank(question, chunks, req.top_k)

    answer = await generate_answer(question, chunks, [], req.model)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    cr = eval_metrics.context_relevance(chunks)
    ar = eval_metrics.answer_relevance(question, answer)
    af = await eval_metrics.answer_faithfulness(question, answer, chunks, req.model)

    return {
        "question": question,
        "answer": answer,
        "context_count": len(chunks),
        "context_relevance": cr,
        "answer_faithfulness": af,
        "answer_relevance": ar,
        "latency_ms": latency_ms,
        "error": None,
    }


@router.post("/run")
async def run_evaluation(req: EvalRequest):
    """
    Streams evaluation results as SSE, one event per question.
    Final event has type="done" with aggregate metrics.

    Event types:
      {"type": "progress", "index": 0, "total": 3}          — question started
      {"type": "result",   "index": 0, "result": {...}}      — question done
      {"type": "done",     "aggregate": {...}}                — all finished
      {"type": "error",    "index": 0, "message": "..."}     — question failed
    """
    questions = [q.strip() for q in req.questions if q.strip()][:20]
    strategy = RetrievalStrategy(req.strategy)
    total = len(questions)

    async def event_stream():
        results: list[dict] = []

        for i, question in enumerate(questions):
            # Tell the client which question we're starting
            yield f"data: {json.dumps({'type': 'progress', 'index': i, 'total': total, 'question': question})}\n\n"

            try:
                result = await asyncio.wait_for(
                    _evaluate_one(question, req, strategy),
                    timeout=QUESTION_TIMEOUT_S,
                )
            except asyncio.TimeoutError:
                result = {
                    "question": question,
                    "answer": "",
                    "context_count": 0,
                    "context_relevance": 0.0,
                    "answer_faithfulness": 0.0,
                    "answer_relevance": 0.0,
                    "latency_ms": QUESTION_TIMEOUT_S * 1000,
                    "error": f"Timed out after {QUESTION_TIMEOUT_S}s — LLM may be unavailable.",
                }
            except Exception as e:
                result = {
                    "question": question,
                    "answer": "",
                    "context_count": 0,
                    "context_relevance": 0.0,
                    "answer_faithfulness": 0.0,
                    "answer_relevance": 0.0,
                    "latency_ms": 0,
                    "error": str(e),
                }

            results.append(result)
            yield f"data: {json.dumps({'type': 'result', 'index': i, 'result': result})}\n\n"

        # Aggregate over successful results
        valid = [r for r in results if not r["error"]]
        aggregate = {
            "context_relevance":   round(sum(r["context_relevance"]   for r in valid) / len(valid), 4) if valid else 0.0,
            "answer_faithfulness": round(sum(r["answer_faithfulness"]  for r in valid) / len(valid), 4) if valid else 0.0,
            "answer_relevance":    round(sum(r["answer_relevance"]     for r in valid) / len(valid), 4) if valid else 0.0,
            "avg_latency_ms":      round(sum(r["latency_ms"]           for r in valid) / len(valid))    if valid else 0,
            "total_questions": total,
            "successful": len(valid),
        }
        yield f"data: {json.dumps({'type': 'done', 'aggregate': aggregate})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
