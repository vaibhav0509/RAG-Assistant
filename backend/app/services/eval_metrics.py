"""
RAG evaluation metrics — computed locally without external eval libraries.

  context_relevance  : mean cosine similarity of retrieved chunks to the question
                       (already in chunk["score"] from ChromaDB cosine space)
  answer_relevance   : cosine similarity between question and answer embeddings
  answer_faithfulness: LLM judge — "0-10, how faithfully does this answer cite the context?"
"""
import math
import re
from typing import Optional

from app.services.llm import llm_complete

# Lazy-load the shared embedder from vector_store to avoid a second model instance
_embedder = None


def _get_embedder():
    global _embedder
    if _embedder is None:
        from app.services.vector_store import vector_store
        _embedder = vector_store._embedder
    return _embedder


def _cosine(a, b) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def context_relevance(chunks: list[dict]) -> float:
    """Mean retrieval score of returned chunks (cosine similarity 0-1 from ChromaDB)."""
    if not chunks:
        return 0.0
    return round(sum(c.get("score", 0.0) for c in chunks) / len(chunks), 4)


def answer_relevance(question: str, answer: str) -> float:
    """Cosine similarity between question embedding and answer embedding."""
    if not answer.strip():
        return 0.0
    embedder = _get_embedder()
    vecs = embedder.encode([question, answer], show_progress_bar=False)
    sim = _cosine(vecs[0].tolist(), vecs[1].tolist())
    return round(max(0.0, min(1.0, sim)), 4)


async def answer_faithfulness(
    question: str,
    answer: str,
    chunks: list[dict],
    model: Optional[str] = None,
) -> float:
    """LLM judge for groundedness. Returns 0-1."""
    if not answer.strip() or not chunks:
        return 0.0

    context = "\n\n".join(c["content"] for c in chunks[:5])
    prompt = (
        "You are an evaluation judge scoring RAG answer faithfulness.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        f"Answer: {answer}\n\n"
        "Score 0-10 where 10 = every claim is directly supported by context, "
        "0 = answer ignores or contradicts the context.\n"
        "Reply with a single integer only."
    )
    try:
        raw = await llm_complete([{"role": "user", "content": prompt}], model)
        m = re.search(r"\b(\d{1,2})\b", raw.strip())
        score = int(m.group(1)) if m else 5
        return round(min(max(score, 0), 10) / 10, 4)
    except Exception:
        return 0.5
