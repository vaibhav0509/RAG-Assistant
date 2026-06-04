from fastapi import APIRouter
from app.services.perf_db import get_perf_history, get_strategy_stats

router = APIRouter(prefix="/perf", tags=["performance"])


@router.get("/history")
def perf_history():
    return get_perf_history(limit=30)


@router.get("/stats")
def perf_stats():
    return get_strategy_stats()
