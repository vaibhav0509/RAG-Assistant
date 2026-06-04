from fastapi import APIRouter, HTTPException
import ollama

from app.config import settings

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
async def list_models():
    try:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        response = await client.list()
        return [
            {"name": m.model, "size_gb": round(m.size / 1e9, 1)}
            for m in response.models
        ]
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {e}")
