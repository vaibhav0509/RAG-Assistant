import json
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.multi_agent_engine import run_pipeline, AGENT_TEMPLATES

router = APIRouter(tags=["multi-agent"])


class AgentDef(BaseModel):
    name: str
    role: str
    tool: str = "none"
    tool_config: dict = {}


class MultiAgentRequest(BaseModel):
    agents: list[AgentDef]
    input: str
    collection: str = "default"
    model: Optional[str] = None


async def _stream(req: MultiAgentRequest):
    async for event in run_pipeline(
        agents=[a.model_dump() for a in req.agents],
        input_text=req.input,
        collection=req.collection,
        model=req.model,
    ):
        yield f"data: {json.dumps(event)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/multi-agent/run")
async def multi_agent_run(req: MultiAgentRequest):
    return StreamingResponse(
        _stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/multi-agent/templates")
async def get_templates():
    return {
        name: [
            {"name": a["name"], "role": a["role"], "tool": a["tool"]}
            for a in agents
        ]
        for name, agents in AGENT_TEMPLATES.items()
    }
