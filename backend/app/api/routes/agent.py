import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.models.schemas import AgentRequest
from app.services.agent import run_agent

router = APIRouter()


async def _event_stream(question: str, collection: str, model: str | None):
    async for event in run_agent(question, collection, model):
        yield f"data: {json.dumps(event)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/agent")
async def agent_endpoint(req: AgentRequest):
    return StreamingResponse(
        _event_stream(req.question, req.collection, req.model),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
