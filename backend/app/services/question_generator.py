import json
import re
import uuid
from typing import Optional, AsyncGenerator

from app.services.llm import llm_complete
from app.services.vector_store import vector_store
from app.services.web_search import search_web

TOTAL_QUESTIONS = 10

SUBTOPIC_PROMPT = """Suggest exactly 5 specific subtopics for a quiz about "{topic}".
Return ONLY a JSON array of 5 short strings. No other text.
Example: ["Subtopic 1", "Subtopic 2", "Subtopic 3", "Subtopic 4", "Subtopic 5"]"""

QUESTION_PROMPT = """Generate {count} multiple choice quiz questions about "{subtopic}" (topic: "{topic}").

{context_block}

Rules:
- Each question must be clear, factual, and unambiguous
- 4 options per question, only one correct
- Mix difficulties: easy, medium, hard
- Return ONLY a valid JSON array — no markdown, no explanation outside the JSON

JSON format:
[
  {{
    "question": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "difficulty": "easy",
    "explanation": "Brief reason why this answer is correct"
  }}
]"""

SOURCE_LABELS = {
    "doc":   "📄 Searching your documents…",
    "web":   "🌐 Fetching from the web…",
    "model": "🧠 Generating from model knowledge…",
}


def _extract_json(text: str):
    for pattern in (r'\[[\s\S]*\]', r'\{[\s\S]*\}'):
        m = re.search(pattern, text)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return None


async def suggest_subtopics(topic: str, model: Optional[str] = None) -> list[str]:
    raw = await llm_complete(
        [{"role": "user", "content": SUBTOPIC_PROMPT.format(topic=topic)}], model
    )
    result = _extract_json(raw.strip())
    if isinstance(result, list) and result:
        return result[:5]
    return ["Core Concepts", "Key Facts", "Applications", "History", "Advanced Topics"]


async def generate_questions_streamed(
    topic: str,
    subtopic: str,
    sources: list[str],
    collection: str,
    model: Optional[str] = None,
) -> AsyncGenerator[tuple[str, object], None]:
    """Yields ("status", message_str) during processing, then ("done", questions_list)."""
    count_per_source = max(2, TOTAL_QUESTIONS // len(sources)) if sources else TOTAL_QUESTIONS
    all_questions: list[dict] = []

    for source in sources:
        yield "status", SOURCE_LABELS.get(source, "Working…")
        context_block = ""

        if source == "doc":
            chunks = vector_store.query(collection, f"{topic} {subtopic}", top_k=5)
            if not chunks:
                yield "status", "⚠️ No documents found — skipping document source"
                continue
            context = "\n\n".join(c["content"] for c in chunks[:3])
            context_block = f"Use this context from uploaded documents:\n{context}"

        elif source == "web":
            yield "status", "🌐 Searching the web…"
            results = search_web(f"{topic} {subtopic} facts", max_results=5)
            if results:
                yield "status", f"🌐 Found {len(results)} web sources — generating questions…"
                context = "\n\n".join(
                    f"{r.get('title','')}: {r.get('body', r.get('snippet', ''))}"
                    for r in results[:3]
                )
                context_block = f"Use this context from web search results:\n{context}"
            else:
                yield "status", "⚠️ Web search returned no results — using model knowledge instead"
                context_block = f"Use your own knowledge about {topic} — {subtopic}."

        elif source == "model":
            context_block = f"Use your own training knowledge about {topic} — {subtopic}."

        yield "status", f"✍️ Writing questions from {source} source…"

        prompt = QUESTION_PROMPT.format(
            count=count_per_source,
            topic=topic,
            subtopic=subtopic,
            context_block=context_block,
        )

        raw = await llm_complete([{"role": "user", "content": prompt}], model)
        parsed = _extract_json(raw.strip())
        if isinstance(parsed, list):
            count = 0
            for q in parsed:
                if all(k in q for k in ("question", "options", "correct_answer")):
                    q["id"] = str(uuid.uuid4())
                    q["source"] = source
                    q.setdefault("difficulty", "medium")
                    q.setdefault("explanation", "")
                    all_questions.append(q)
                    count += 1
            yield "status", f"✅ Got {count} questions from {source}"

    yield "done", all_questions
