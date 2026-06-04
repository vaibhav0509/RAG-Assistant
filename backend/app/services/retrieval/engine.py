"""
Retrieval strategies:
  naive       — Dense vector search (baseline)
  hybrid      — BM25 + Dense combined (RRF)
  hyde        — Hypothetical Document Embeddings
  multi_query — Multiple query variations merged
"""

import re
import time
from enum import Enum
from typing import Optional

from rank_bm25 import BM25Okapi

from app.services.llm import llm_complete
from app.services.vector_store import vector_store


class RetrievalStrategy(str, Enum):
    NAIVE       = "naive"
    HYBRID      = "hybrid"
    HYDE        = "hyde"
    MULTI_QUERY = "multi_query"


# ─── helpers ───────────────────────────────────────────────────────────────

def _normalize(scores: list[float]) -> list[float]:
    mn, mx = min(scores, default=0), max(scores, default=1)
    if mx == mn:
        return [1.0] * len(scores)
    return [(s - mn) / (mx - mn) for s in scores]


def _rrf(rankings: list[list[str]], k: int = 60) -> dict[str, float]:
    """Reciprocal Rank Fusion over multiple ranked lists of doc IDs."""
    scores: dict[str, float] = {}
    for ranked in rankings:
        for rank, doc_id in enumerate(ranked):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)
    return scores


def _extract_list(text: str) -> list[str]:
    m = re.search(r"\[.*?\]", text, re.DOTALL)
    if m:
        try:
            result = json.loads(m.group())
            if isinstance(result, list):
                return [str(x) for x in result]
        except Exception:
            pass
    return [line.strip("- •").strip() for line in text.splitlines() if line.strip()]


# ─── strategies ────────────────────────────────────────────────────────────

def _naive(question: str, collection: str, top_k: int) -> tuple[list[dict], dict]:
    t0 = time.perf_counter()
    results = vector_store.query(collection, question, top_k)
    latency_ms = int((time.perf_counter() - t0) * 1000)
    meta = {"steps": ["dense_search"], "latency_ms": latency_ms, "candidates": len(results)}
    return results, meta


def _hybrid(question: str, collection: str, top_k: int, alpha: float = 0.5) -> tuple[list[dict], dict]:
    t0 = time.perf_counter()

    # 1. Dense: fetch larger candidate pool
    candidates = vector_store.query(collection, question, top_k * 4)
    if not candidates:
        return [], {"steps": ["dense_search", "bm25"], "latency_ms": 0, "candidates": 0}

    corpus = [c["content"] for c in candidates]
    ids    = [f"{c['source']}_{c['chunk']}" for c in candidates]

    # 2. BM25 on candidates
    tokenized = [doc.lower().split() for doc in corpus]
    bm25 = BM25Okapi(tokenized)
    bm25_raw = bm25.get_scores(question.lower().split())

    # 3. Dense scores (already 0-1 cosine)
    dense_raw = [c["score"] for c in candidates]

    # 4. Normalize + combine
    bm25_norm  = _normalize(list(bm25_raw))
    dense_norm = _normalize(dense_raw)

    combined = [
        alpha * d + (1 - alpha) * b
        for d, b in zip(dense_norm, bm25_norm)
    ]

    # 5. Rank and return top-K
    ranked = sorted(zip(combined, candidates), key=lambda x: -x[0])[:top_k]
    results = [c for _, c in ranked]
    for i, (score, _) in enumerate(ranked):
        results[i]["score"] = round(score, 4)
        results[i]["retrieval"] = "hybrid"

    latency_ms = int((time.perf_counter() - t0) * 1000)
    meta = {
        "steps": ["dense_search", "bm25", "rrf_merge"],
        "latency_ms": latency_ms,
        "candidates": len(candidates),
        "alpha": alpha,
    }
    return results, meta


async def _hyde(question: str, collection: str, top_k: int, model: Optional[str]) -> tuple[list[dict], dict]:
    t0 = time.perf_counter()

    # 1. Generate hypothetical answer
    hypo_prompt = (
        f"Write a short, factual passage (3-5 sentences) that directly answers this question:\n"
        f'"{question}"\n'
        f"Write the passage only, no preamble."
    )
    hypo_doc = await llm_complete([{"role": "user", "content": hypo_prompt}], model)
    hypo_doc = hypo_doc.strip()

    # 2. Search with hypothetical doc as query
    results = vector_store.query(collection, hypo_doc, top_k)
    for r in results:
        r["retrieval"] = "hyde"

    latency_ms = int((time.perf_counter() - t0) * 1000)
    meta = {
        "steps": ["llm_hypothetical_doc", "dense_search"],
        "latency_ms": latency_ms,
        "hypo_doc_preview": hypo_doc[:120],
        "candidates": len(results),
    }
    return results, meta


async def _multi_query(question: str, collection: str, top_k: int, model: Optional[str]) -> tuple[list[dict], dict]:
    t0 = time.perf_counter()

    # 1. Generate query variations
    prompt = (
        f'Generate 3 different phrasings of this question for search:\n"{question}"\n'
        f'Return a JSON array of 3 strings only.'
    )
    raw = await llm_complete([{"role": "user", "content": prompt}], model)
    variations = _extract_list(raw.strip())[:3]
    all_queries = [question] + variations

    # 2. Retrieve for each query
    seen: dict[str, dict] = {}
    rankings: list[list[str]] = []

    for q in all_queries:
        batch = vector_store.query(collection, q, top_k)
        ranking = []
        for chunk in batch:
            cid = f"{chunk['source']}_{chunk['chunk']}"
            ranking.append(cid)
            if cid not in seen or chunk["score"] > seen[cid]["score"]:
                seen[cid] = {**chunk, "retrieval": "multi_query"}
        rankings.append(ranking)

    # 3. RRF merge
    rrf_scores = _rrf(rankings)
    merged = sorted(seen.values(), key=lambda c: -rrf_scores.get(f"{c['source']}_{c['chunk']}", 0))[:top_k]

    latency_ms = int((time.perf_counter() - t0) * 1000)
    meta = {
        "steps": ["llm_query_expansion", f"{len(all_queries)}x_dense_search", "rrf_merge"],
        "latency_ms": latency_ms,
        "queries": all_queries,
        "candidates": len(seen),
    }
    return merged, meta


# ─── public entry point ────────────────────────────────────────────────────

async def retrieve(
    question: str,
    collection: str,
    strategy: RetrievalStrategy = RetrievalStrategy.NAIVE,
    top_k: int = 5,
    model: Optional[str] = None,
) -> tuple[list[dict], dict]:
    """Returns (chunks, perf_meta)."""
    if strategy == RetrievalStrategy.NAIVE:
        return _naive(question, collection, top_k)
    elif strategy == RetrievalStrategy.HYBRID:
        return _hybrid(question, collection, top_k)
    elif strategy == RetrievalStrategy.HYDE:
        return await _hyde(question, collection, top_k, model)
    elif strategy == RetrievalStrategy.MULTI_QUERY:
        return await _multi_query(question, collection, top_k, model)
    else:
        return _naive(question, collection, top_k)
