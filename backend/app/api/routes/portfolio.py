from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.portfolio_parser import parse_resume

router = APIRouter()


@router.post("/portfolio/parse")
async def parse_portfolio(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="File too large (max 10 MB).")
    profile = await parse_resume(content, file.filename)
    return profile
