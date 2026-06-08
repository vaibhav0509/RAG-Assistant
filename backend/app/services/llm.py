from typing import AsyncGenerator, Optional
import ollama
from openai import AsyncOpenAI

from app.config import settings


SYSTEM_PROMPT = """You are an enterprise knowledge assistant. Answer questions strictly based on the provided context documents.

Rules:
- Only use information from the provided context.
- If the answer is not in the context, say "I don't have enough information in the provided documents to answer this."
- Always cite your sources by mentioning the document name.
- Be concise and precise.
- Format responses with markdown when helpful."""


def _build_messages(question: str, context_chunks: list[dict], history: list[dict]) -> list[dict]:
    context_text = "\n\n---\n\n".join(
        f"[Source: {c['source']}]\n{c['content']}" for c in context_chunks
    )
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages.extend(history)
    messages.append({
        "role": "user",
        "content": f"Context:\n{context_text}\n\nQuestion: {question}",
    })
    return messages


def _active_model(model: Optional[str]) -> str:
    if settings.llm_provider == "groq":
        return model or settings.groq_model
    return model or settings.ollama_model


def _groq_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=settings.groq_api_key,
    )


# ─── shared non-streaming completion ─────────────────────────────────────
# Used by retrieval/engine.py (HyDE, multi-query) and question_generator.py

async def llm_complete(messages: list[dict], model: Optional[str] = None) -> str:
    resolved = _active_model(model)
    if settings.llm_provider == "groq":
        resp = await _groq_client().chat.completions.create(
            model=resolved, messages=messages, stream=False  # type: ignore[arg-type]
        )
        return resp.choices[0].message.content or ""
    else:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        resp = await client.chat(model=resolved, messages=messages, stream=False)
        return resp.message.content


# ─── public API ──────────────────────────────────────────────────────────

async def generate_answer(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    model: Optional[str] = None,
) -> str:
    messages = _build_messages(question, context_chunks, history)
    return await llm_complete(messages, model)


async def stream_messages(
    messages: list[dict],
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """Stream tokens from an arbitrary messages list (no RAG context building)."""
    resolved = _active_model(model)
    if settings.llm_provider == "groq":
        stream = await _groq_client().chat.completions.create(
            model=resolved, messages=messages, stream=True  # type: ignore[arg-type]
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token
    else:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        async for chunk in await client.chat(model=resolved, messages=messages, stream=True):
            token = chunk.message.content
            if token:
                yield token


async def stream_answer(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    messages = _build_messages(question, context_chunks, history)
    resolved = _active_model(model)

    if settings.llm_provider == "groq":
        stream = await _groq_client().chat.completions.create(
            model=resolved, messages=messages, stream=True  # type: ignore[arg-type]
        )
        async for chunk in stream:
            token = chunk.choices[0].delta.content or ""
            if token:
                yield token
    else:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        async for chunk in await client.chat(model=resolved, messages=messages, stream=True):
            token = chunk.message.content
            if token:
                yield token
