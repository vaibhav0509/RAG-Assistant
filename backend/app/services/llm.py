from typing import AsyncGenerator, Optional
import ollama

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


def _resolve_model(model: Optional[str]) -> str:
    return model or settings.ollama_model


async def generate_answer(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    model: Optional[str] = None,
) -> str:
    messages = _build_messages(question, context_chunks, history)
    client = ollama.AsyncClient(host=settings.ollama_base_url)
    response = await client.chat(
        model=_resolve_model(model),
        messages=messages,
        stream=False,
    )
    return response.message.content


async def stream_answer(
    question: str,
    context_chunks: list[dict],
    history: list[dict],
    model: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    messages = _build_messages(question, context_chunks, history)
    client = ollama.AsyncClient(host=settings.ollama_base_url)

    async for chunk in await client.chat(
        model=_resolve_model(model),
        messages=messages,
        stream=True,
    ):
        token = chunk.message.content
        if token:
            yield token
