import re
from enum import Enum
from pathlib import Path
from pypdf import PdfReader
from docx import Document


class ChunkStrategy(str, Enum):
    RECURSIVE = "recursive"   # sentence-boundary-aware sliding window (original)
    SEMANTIC  = "semantic"    # paragraph/section aware — merge small paras, split large ones
    SENTENCE  = "sentence"    # split into individual sentences, then group into windows
    FIXED     = "fixed"       # fixed char-size windows, no boundary detection


def extract_text(file_path: str, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext == ".pdf":
        return _extract_pdf(file_path)
    elif ext == ".docx":
        return _extract_docx(file_path)
    elif ext in (".txt", ".md", ".rst"):
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _extract_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(file_path: str) -> str:
    doc = Document(file_path)
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


# ─── chunking strategies ──────────────────────────────────────────────────

def _recursive(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Sliding window that tries to break at sentence/paragraph boundaries."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        if end < len(text):
            last_break = max(chunk.rfind(". "), chunk.rfind("\n"))
            if last_break > chunk_size // 2:
                end = start + last_break + 1
                chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - overlap
    return [c for c in chunks if len(c) > 50]


def _semantic(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Paragraph-aware chunking:
    1. Split on double newlines (natural paragraph boundaries).
    2. Merge tiny paragraphs with their neighbors until each block ≥ min_size.
    3. If a block exceeds chunk_size, split it recursively at sentence boundaries.
    """
    min_size = chunk_size // 4
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]

    merged: list[str] = []
    buffer = ""
    for para in paras:
        if buffer and len(buffer) + len(para) + 2 <= chunk_size:
            buffer += "\n\n" + para
        else:
            if buffer:
                merged.append(buffer)
            buffer = para
    if buffer:
        merged.append(buffer)

    chunks: list[str] = []
    for block in merged:
        if len(block) <= chunk_size:
            chunks.append(block)
        else:
            # oversized block → fall back to recursive with overlap
            chunks.extend(_recursive(block, chunk_size, overlap))

    # drop tiny remnants
    return [c for c in chunks if len(c) > min_size]


def _sentence(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Split into sentences, then group sentences into windows that fit chunk_size.
    Overlap is expressed as number of trailing sentences carried forward.
    """
    sentence_pattern = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"])")
    sentences = [s.strip() for s in sentence_pattern.split(text) if s.strip()]

    # also split on newlines for list-style text
    expanded: list[str] = []
    for s in sentences:
        sub = [x.strip() for x in s.split("\n") if x.strip()]
        expanded.extend(sub)
    sentences = expanded

    overlap_sents = max(1, overlap // 100)  # ~1 sentence per 100-char overlap budget
    chunks: list[str] = []
    start = 0
    while start < len(sentences):
        window: list[str] = []
        length = 0
        i = start
        while i < len(sentences) and length + len(sentences[i]) < chunk_size:
            window.append(sentences[i])
            length += len(sentences[i])
            i += 1
        if not window:
            window = [sentences[start]]
            i = start + 1
        chunks.append(" ".join(window))
        start = i - overlap_sents
        if start <= 0 or (i >= len(sentences)):
            start = i
    return [c for c in chunks if len(c) > 50]


def _fixed(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Hard fixed-size slices with no boundary detection."""
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size].strip())
        start += chunk_size - overlap
    return [c for c in chunks if len(c) > 50]


# ─── public API ──────────────────────────────────────────────────────────

def chunk_text(
    text: str,
    chunk_size: int = 1000,
    overlap: int = 200,
    strategy: ChunkStrategy = ChunkStrategy.RECURSIVE,
) -> list[str]:
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if strategy == ChunkStrategy.SEMANTIC:
        return _semantic(text, chunk_size, overlap)
    elif strategy == ChunkStrategy.SENTENCE:
        return _sentence(text, chunk_size, overlap)
    elif strategy == ChunkStrategy.FIXED:
        return _fixed(text, chunk_size, overlap)
    else:
        return _recursive(text, chunk_size, overlap)
