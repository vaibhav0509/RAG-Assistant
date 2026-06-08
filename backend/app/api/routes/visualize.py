"""
Three visualizer endpoints:
  GET  /visualize/embeddings  — PCA-reduced scatter points for a collection
  POST /visualize/context     — prompt breakdown with token counts for a question
  POST /visualize/chunks      — all 4 chunking strategies applied to a text
"""
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.vector_store import vector_store
from app.services.document_processor import chunk_text, ChunkStrategy

router = APIRouter(prefix="/visualize", tags=["visualize"])


def _count_tokens(text: str) -> int:
    """Rough approximation: 4 chars ≈ 1 token."""
    return max(1, len(text) // 4)


# ── 1. Embedding scatter ──────────────────────────────────────────────────

@router.get("/embeddings")
async def get_embeddings(collection: str = "default", query: str = ""):
    col = vector_store._collection(collection)
    if col.count() == 0:
        return {"points": [], "query_point": None, "method": "pca"}

    raw = col.get(
        limit=500,
        include=["embeddings", "documents", "metadatas"],
    )

    embeddings = np.array(raw["embeddings"], dtype=np.float32)

    from sklearn.decomposition import PCA
    pca = PCA(n_components=2, random_state=42)
    coords = pca.fit_transform(embeddings)

    points = [
        {
            "id": raw["ids"][i],
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1]),
            "text": raw["documents"][i][:300],
            "source": raw["metadatas"][i].get("source", "unknown"),
            "chunk": int(raw["metadatas"][i].get("chunk", i)),
        }
        for i in range(len(raw["ids"]))
    ]

    query_point = None
    if query.strip():
        q_emb = vector_store._embedder.encode([query], show_progress_bar=False)[0]
        q_coord = pca.transform([q_emb])[0]
        query_point = {"x": float(q_coord[0]), "y": float(q_coord[1]), "text": query}

    return {"points": points, "query_point": query_point, "method": "pca"}


# ── 2. Context inspector ──────────────────────────────────────────────────

class ContextRequest(BaseModel):
    question: str
    collection: str = "default"
    strategy: str = "naive"
    top_k: int = 5


@router.post("/context")
async def inspect_context(req: ContextRequest):
    chunks = vector_store.query(req.collection, req.question, req.top_k)

    system_prompt = (
        "You are a helpful assistant. Answer the question based only on the "
        "provided context. If the context does not contain the answer, say so."
    )

    chunk_data = [
        {
            "content": c["content"],
            "source": c["source"],
            "chunk": c["chunk"],
            "score": c["score"],
            "tokens": _count_tokens(c["content"]),
        }
        for c in chunks
    ]

    system_tokens   = _count_tokens(system_prompt)
    context_tokens  = sum(c["tokens"] for c in chunk_data)
    question_tokens = _count_tokens(req.question)
    total_tokens    = system_tokens + context_tokens + question_tokens
    max_tokens      = 4096

    return {
        "system_prompt":    system_prompt,
        "system_tokens":    system_tokens,
        "chunks":           chunk_data,
        "question":         req.question,
        "question_tokens":  question_tokens,
        "context_tokens":   context_tokens,
        "total_tokens":     total_tokens,
        "max_tokens":       max_tokens,
    }


# ── 3. Chunking visualizer ────────────────────────────────────────────────

class ChunkRequest(BaseModel):
    text: str
    chunk_size: int = 1000
    chunk_overlap: int = 200


@router.post("/chunks")
async def visualize_chunks(req: ChunkRequest):
    results = {}
    for strategy in ChunkStrategy:
        chunks = chunk_text(req.text, req.chunk_size, req.chunk_overlap, strategy)
        sizes = [len(c) for c in chunks]
        results[strategy.value] = {
            "chunks": chunks,
            "count": len(chunks),
            "avg_size": int(sum(sizes) / max(len(sizes), 1)),
            "min_size": min(sizes, default=0),
            "max_size": max(sizes, default=0),
        }
    return results
