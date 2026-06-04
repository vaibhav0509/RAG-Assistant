from fastapi import APIRouter
import ollama

from app.config import settings
from app.services.vector_store import vector_store

router = APIRouter(prefix="/status", tags=["status"])


@router.get("")
async def system_status():
    try:
        client = ollama.AsyncClient(host=settings.ollama_base_url)
        ps = await client.ps()
        loaded = [m.model for m in ps.models] if ps.models else []
        ollama_status = "running"
    except Exception:
        loaded = []
        ollama_status = "offline"

    try:
        collections = vector_store.list_collections()
        total_chunks = sum(c["document_count"] for c in collections)
        chroma_status = "running"
    except Exception:
        collections = []
        total_chunks = 0
        chroma_status = "error"

    return {
        "ollama": ollama_status,
        "model": settings.ollama_model,
        "model_loaded": settings.ollama_model in loaded,
        "loaded_models": loaded,
        "vector_db": "ChromaDB",
        "chroma_status": chroma_status,
        "embedding_model": settings.embedding_model,
        "collections": len(collections),
        "total_chunks": total_chunks,
        "rag_mode": True,
        "fine_tuning": False,
    }
