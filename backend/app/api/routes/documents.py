import tempfile
import os

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from app.models.schemas import DocumentIngestResponse, DeleteResponse
from app.services.document_processor import extract_text, chunk_text, ChunkStrategy
from app.services.vector_store import vector_store
from app.config import settings

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentIngestResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form(default="default"),
    chunk_strategy: str = Form(default="recursive"),
):
    allowed = {".pdf", ".docx", ".txt", ".md", ".rst"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    try:
        strategy = ChunkStrategy(chunk_strategy)
    except ValueError:
        strategy = ChunkStrategy.RECURSIVE

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        text = extract_text(tmp_path, file.filename)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file.")

        chunks = chunk_text(text, settings.chunk_size, settings.chunk_overlap, strategy)
        if not chunks:
            raise HTTPException(status_code=400, detail="Document produced no usable chunks.")

        total = vector_store.add_documents(collection, chunks, file.filename)
    finally:
        os.unlink(tmp_path)

    return DocumentIngestResponse(
        collection=collection,
        filename=file.filename,
        chunks_added=len(chunks),
        total_docs=total,
        chunk_strategy=strategy.value,
    )


@router.delete("/{collection}", response_model=DeleteResponse)
async def delete_collection(collection: str):
    deleted = vector_store.delete_collection(collection)
    return DeleteResponse(collection=collection, deleted=deleted)
