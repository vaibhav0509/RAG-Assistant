"""
Conftest: module-level patches run before any app module is imported.
This keeps tests fast — no ML model weights downloaded, no GPU needed.
"""
import os
import sys
from unittest.mock import MagicMock
import numpy as np
import pytest

# ── 1. Env vars (must precede pydantic-settings instantiation in config.py) ──
os.environ.setdefault("CHROMA_PERSIST_DIR", "/tmp/ai_studio_test_chroma")
os.environ.setdefault("API_KEY", "enterprise-rag-secret")
os.environ.setdefault("LLM_PROVIDER", "groq")
os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# ── 2. Mock sentence-transformers (avoids loading 80 MB model weights) ────────

_EMBED_DIM = 384


def _mock_st_encode(texts, **kw):
    rng = np.random.default_rng(seed=42)
    return rng.random((len(texts), _EMBED_DIM), dtype=np.float32)


def _mock_ce_predict(pairs, **kw):
    return [0.9 - 0.1 * i for i in range(len(pairs))]


_st_instance = MagicMock()
_st_instance.encode.side_effect = _mock_st_encode

_ce_instance = MagicMock()
_ce_instance.predict.side_effect = _mock_ce_predict

_mock_st_module = MagicMock()
_mock_st_module.SentenceTransformer.return_value = _st_instance
_mock_st_module.CrossEncoder.return_value = _ce_instance

sys.modules["sentence_transformers"] = _mock_st_module

# ── 3. Fixtures ───────────────────────────────────────────────────────────────

API_KEY = "enterprise-rag-secret"


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers():
    return {"X-API-Key": API_KEY}
