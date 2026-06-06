import time
from sentence_transformers import CrossEncoder

MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L6-v2"
_model: CrossEncoder | None = None


def _get_model() -> CrossEncoder:
    global _model
    if _model is None:
        _model = CrossEncoder(MODEL_NAME)
    return _model


def rerank(query: str, chunks: list[dict], top_k: int) -> tuple[list[dict], dict]:
    """
    Score each chunk against the query using a cross-encoder.
    Returns top_k chunks sorted by rerank score descending.
    """
    if not chunks:
        return chunks, {"reranked": False, "rerank_ms": 0}

    t0 = time.perf_counter()
    model = _get_model()

    pairs = [(query, c["content"]) for c in chunks]
    scores = model.predict(pairs)

    for i, chunk in enumerate(chunks):
        chunk["rerank_score"] = round(float(scores[i]), 4)

    reranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)[:top_k]

    latency_ms = int((time.perf_counter() - t0) * 1000)
    return reranked, {
        "reranked": True,
        "rerank_model": MODEL_NAME,
        "rerank_ms": latency_ms,
        "candidates_scored": len(chunks),
    }
