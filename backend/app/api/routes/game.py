import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator

from app.services.question_generator import suggest_subtopics, generate_questions_streamed
from app.services.game_db import (
    init_db, create_session, store_questions, record_answer, get_analysis, get_history
)

router = APIRouter(prefix="/game", tags=["game"])
init_db()


class SubtopicRequest(BaseModel):
    topic: str
    model: Optional[str] = None


class StartGameRequest(BaseModel):
    topic: str
    subtopic: str
    sources: list[str]
    collection: str = "default"
    model: Optional[str] = None


class AnswerRequest(BaseModel):
    session_id: str
    round_id: str
    answer: str
    response_time_ms: int = 0


@router.post("/suggest-subtopics")
async def suggest(req: SubtopicRequest):
    subtopics = await suggest_subtopics(req.topic, req.model)
    return {"subtopics": subtopics}


@router.post("/start")
async def start_game(req: StartGameRequest):
    valid_sources = [s for s in req.sources if s in ("doc", "web", "model")]
    if not valid_sources:
        raise HTTPException(status_code=400, detail="Select at least one source.")

    async def event_stream() -> AsyncGenerator[str, None]:
        def emit(event: str, data: dict) -> str:
            return f"data: {json.dumps({'event': event, **data})}\n\n"

        all_questions = []

        async for status, questions in generate_questions_streamed(
            req.topic, req.subtopic, valid_sources, req.collection, req.model
        ):
            if status == "status":
                yield emit("status", {"message": questions})  # questions is a string here
            elif status == "done":
                all_questions = questions

        if not all_questions:
            yield emit("error", {"message": "Could not generate questions. Try different sources or topic."})
            return

        session_id = create_session(req.topic, req.subtopic, valid_sources, req.collection, req.model or "")
        store_questions(session_id, all_questions)

        safe_questions = [
            {
                "id": q["id"],
                "question": q["question"],
                "options": q["options"],
                "difficulty": q["difficulty"],
                "source": q["source"],
            }
            for q in all_questions
        ]
        yield emit("ready", {"session_id": session_id, "questions": safe_questions, "total": len(safe_questions)})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/answer")
async def answer(req: AnswerRequest):
    result = record_answer(req.session_id, req.round_id, req.answer, req.response_time_ms)
    if not result:
        raise HTTPException(status_code=404, detail="Round not found.")
    return result


@router.get("/analysis/{session_id}")
async def analysis(session_id: str):
    return get_analysis(session_id)


@router.get("/history")
async def history():
    return get_history()
