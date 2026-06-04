from fastapi import APIRouter, HTTPException
import ollama

from app.config import settings

router = APIRouter(prefix="/models", tags=["models"])

GROQ_MODELS = [
    {"name": "llama-3.1-8b-instant",     "size_gb": 0},
    {"name": "llama-3.3-70b-versatile",  "size_gb": 0},
    {"name": "mixtral-8x7b-32768",       "size_gb": 0},
    {"name": "gemma2-9b-it",             "size_gb": 0},
]


@router.get("")
async def list_models():
    if settings.llm_provider == "groq":
        return GROQ_MODELS

    try:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        response = await client.list()
        return [
            {"name": m.model, "size_gb": round(m.size / 1e9, 1)}
            for m in response.models
        ]
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ollama unreachable: {e}")
