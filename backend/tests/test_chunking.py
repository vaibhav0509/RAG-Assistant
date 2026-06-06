"""Tests for document_processor chunking strategies — pure Python, no ML deps."""
import pytest
from app.services.document_processor import chunk_text, ChunkStrategy


LOREM = (
    "The quick brown fox jumps over the lazy dog. "
    "Pack my box with five dozen liquor jugs. "
    "How vexingly quick daft zebras jump. "
)


# ── recursive ────────────────────────────────────────────────────────────────

def test_recursive_returns_chunks():
    text = LOREM * 20
    chunks = chunk_text(text, chunk_size=200, overlap=20, strategy=ChunkStrategy.RECURSIVE)
    assert len(chunks) > 1


def test_recursive_no_tiny_chunks():
    text = LOREM * 20
    chunks = chunk_text(text, chunk_size=200, overlap=20, strategy=ChunkStrategy.RECURSIVE)
    assert all(len(c) > 50 for c in chunks)


def test_recursive_single_chunk_for_short_text():
    # text must be > 50 chars to survive the minimum-size filter
    text = "This is a short document that is definitely longer than fifty characters total."
    chunks = chunk_text(text, chunk_size=500, overlap=50, strategy=ChunkStrategy.RECURSIVE)
    assert len(chunks) == 1


def test_recursive_empty_returns_empty():
    chunks = chunk_text("", chunk_size=500, overlap=50, strategy=ChunkStrategy.RECURSIVE)
    assert chunks == []


# ── semantic ─────────────────────────────────────────────────────────────────

def test_semantic_returns_chunks():
    text = "\n\n".join([LOREM] * 10)
    chunks = chunk_text(text, chunk_size=300, overlap=50, strategy=ChunkStrategy.SEMANTIC)
    assert len(chunks) >= 1


def test_semantic_respects_paragraph_boundaries():
    # Each paragraph must exceed chunk_size // 4 (the min_size filter)
    para = LOREM * 3  # ~330 chars per paragraph
    text = f"{para}\n\n{para}\n\n{para}"
    chunks = chunk_text(text, chunk_size=500, overlap=0, strategy=ChunkStrategy.SEMANTIC)
    assert len(chunks) >= 1
    # All source text is represented
    assert any("quick brown fox" in c for c in chunks)


def test_semantic_splits_oversized_blocks():
    big_para = "word " * 300  # ~1500 chars, exceeds chunk_size=500
    chunks = chunk_text(big_para, chunk_size=500, overlap=50, strategy=ChunkStrategy.SEMANTIC)
    assert len(chunks) > 1


# ── sentence ─────────────────────────────────────────────────────────────────

def test_sentence_returns_chunks():
    text = (LOREM * 10)
    chunks = chunk_text(text, chunk_size=150, overlap=20, strategy=ChunkStrategy.SENTENCE)
    assert len(chunks) > 1


def test_sentence_no_empty_chunks():
    text = LOREM * 5
    chunks = chunk_text(text, chunk_size=150, overlap=20, strategy=ChunkStrategy.SENTENCE)
    assert all(c.strip() for c in chunks)


# ── fixed ────────────────────────────────────────────────────────────────────

def test_fixed_produces_predictable_count():
    text = "a" * 1000
    chunks = chunk_text(text, chunk_size=200, overlap=0, strategy=ChunkStrategy.FIXED)
    assert len(chunks) == 5


def test_fixed_no_overlap_exact_size():
    text = "b" * 600
    chunks = chunk_text(text, chunk_size=200, overlap=0, strategy=ChunkStrategy.FIXED)
    assert all(len(c) == 200 for c in chunks)


def test_fixed_with_overlap_more_chunks():
    text = "c" * 1000
    no_overlap = chunk_text(text, chunk_size=200, overlap=0, strategy=ChunkStrategy.FIXED)
    with_overlap = chunk_text(text, chunk_size=200, overlap=100, strategy=ChunkStrategy.FIXED)
    assert len(with_overlap) > len(no_overlap)


# ── default (recursive) ───────────────────────────────────────────────────────

def test_default_strategy_is_recursive():
    text = LOREM * 20
    default_chunks = chunk_text(text, chunk_size=200, overlap=20)
    recursive_chunks = chunk_text(text, chunk_size=200, overlap=20, strategy=ChunkStrategy.RECURSIVE)
    assert default_chunks == recursive_chunks
