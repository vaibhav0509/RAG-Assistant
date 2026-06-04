import json
import time

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ChatResponse
from app.services.retrieval import retrieve, RetrievalStrategy
from app.services.llm import generate_answer, stream_answer
from app.services.perf_db import init_perf_db, log_query
from app.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])
init_perf_db()


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    strategy = RetrievalStrategy(request.retrieval_strategy)
    t_total = time.perf_counter()

    sources, ret_meta = await retrieve(
        question=request.question,
        collection=request.collection,
        strategy=strategy,
        top_k=request.top_k,
        model=request.model,
    )

    if not sources:
        raise HTTPException(
            status_code=404,
            detail=f"No documents in '{request.collection}'. Upload documents first.",
        )

    history = [{"role": m.role, "content": m.content} for m in request.history]
    retrieval_ms = ret_meta.get("latency_ms", 0)

    if request.stream:
        async def event_stream():
            t_llm = time.perf_counter()
            full_answer = ""

            async for token in stream_answer(request.question, sources, history, request.model):
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            llm_ms = int((time.perf_counter() - t_llm) * 1000)
            total_ms = int((time.perf_counter() - t_total) * 1000)

            log_query(
                collection=request.collection,
                retrieval_strategy=strategy.value,
                top_k=request.top_k,
                embedding_model=settings.embedding_model,
                query_text=request.question,
                retrieval_ms=retrieval_ms,
                llm_ms=llm_ms,
                total_ms=total_ms,
                scores=[s["score"] for s in sources],
                chunks_retrieved=len(sources),
                retrieval_steps=ret_meta.get("steps", []),
            )

            yield f"data: {json.dumps({'done': True, 'sources': sources, 'perf': {'retrieval_ms': retrieval_ms, 'llm_ms': llm_ms, 'total_ms': total_ms, 'strategy': strategy.value, 'ret_meta': ret_meta}})}\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    t_llm = time.perf_counter()
    answer = await generate_answer(request.question, sources, history, request.model)
    llm_ms = int((time.perf_counter() - t_llm) * 1000)
    total_ms = int((time.perf_counter() - t_total) * 1000)

    log_query(
        collection=request.collection,
        retrieval_strategy=strategy.value,
        top_k=request.top_k,
        embedding_model=settings.embedding_model,
        query_text=request.question,
        retrieval_ms=retrieval_ms,
        llm_ms=llm_ms,
        total_ms=total_ms,
        scores=[s["score"] for s in sources],
        chunks_retrieved=len(sources),
        retrieval_steps=ret_meta.get("steps", []),
    )

    return ChatResponse(answer=answer, sources=sources, collection=request.collection)
