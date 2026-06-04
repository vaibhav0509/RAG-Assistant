from fastapi import APIRouter

from app.models.schemas import CollectionInfo
from app.services.vector_store import vector_store

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=list[CollectionInfo])
async def list_collections():
    return vector_store.list_collections()
