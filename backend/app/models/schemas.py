from pydantic import BaseModel
from typing import Optional


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    question: str
    collection: str = "default"
    history: list[ChatMessage] = []
    stream: bool = True
    model: Optional[str] = None
    retrieval_strategy: str = "naive"
    top_k: int = 5


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    collection: str


class DocumentIngestResponse(BaseModel):
    collection: str
    filename: str
    chunks_added: int
    total_docs: int
    chunk_strategy: str = "recursive"


class CollectionInfo(BaseModel):
    name: str
    document_count: int


class DeleteResponse(BaseModel):
    collection: str
    deleted: bool
