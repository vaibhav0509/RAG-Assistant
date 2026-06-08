import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.workflow_engine import run_workflow

router = APIRouter(tags=["workflow"])


class WorkflowRequest(BaseModel):
    nodes: list[dict]
    edges: list[dict]
    input: str = ""
    collection: str = "default"
    model: str | None = None


async def _stream(req: WorkflowRequest):
    async for event in run_workflow(req.nodes, req.edges, req.input, req.collection, req.model):
        yield f"data: {json.dumps(event)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/workflow/run")
async def workflow_run(req: WorkflowRequest):
    return StreamingResponse(
        _stream(req),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
