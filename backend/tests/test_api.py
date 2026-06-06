"""
API integration tests using FastAPI TestClient.
Heavy ML dependencies are mocked in conftest.py.
LLM calls and retrieval service calls are mocked per-test.
"""
import io
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ── auth ──────────────────────────────────────────────────────────────────────

def test_missing_api_key_returns_401(client):
    response = client.get("/api/v1/status")
    assert response.status_code == 401


def test_wrong_api_key_returns_401(client):
    response = client.get("/api/v1/status", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401


def test_valid_api_key_passes_auth(client, auth_headers):
    with patch("app.api.routes.status.vector_store") as mock_vs:
        mock_vs.list_collections.return_value = []
        response = client.get("/api/v1/status", headers=auth_headers)
    assert response.status_code == 200


def test_health_endpoint_no_auth(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


# ── status ────────────────────────────────────────────────────────────────────

def test_status_returns_expected_fields(client, auth_headers):
    with patch("app.api.routes.status.vector_store") as mock_vs:
        mock_vs.list_collections.return_value = [{"name": "default", "document_count": 10}]
        response = client.get("/api/v1/status", headers=auth_headers)

    data = response.json()
    assert response.status_code == 200
    assert "chroma_status" in data
    assert "embedding_model" in data
    assert "llm_provider" in data


def test_status_chroma_running(client, auth_headers):
    with patch("app.api.routes.status.vector_store") as mock_vs:
        mock_vs.list_collections.return_value = []
        response = client.get("/api/v1/status", headers=auth_headers)
    assert response.json()["chroma_status"] == "running"


# ── chat ──────────────────────────────────────────────────────────────────────

def test_chat_404_when_no_documents(client, auth_headers):
    with patch("app.api.routes.chat.retrieve", new_callable=AsyncMock) as mock_retrieve:
        mock_retrieve.return_value = ([], {"latency_ms": 0, "steps": []})
        response = client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"question": "What is RAG?", "collection": "empty_col", "stream": False},
        )
    assert response.status_code == 404


def test_chat_non_stream_returns_answer(client, auth_headers):
    mock_chunks = [
        {"content": "RAG stands for Retrieval Augmented Generation.", "source": "doc.txt", "chunk": 0, "score": 0.9}
    ]
    with patch("app.api.routes.chat.retrieve", new_callable=AsyncMock) as mock_retrieve, \
         patch("app.api.routes.chat.generate_answer", new_callable=AsyncMock) as mock_answer, \
         patch("app.api.routes.chat.log_query"):
        mock_retrieve.return_value = (mock_chunks, {"latency_ms": 10, "steps": ["dense_search"]})
        mock_answer.return_value = "RAG stands for Retrieval Augmented Generation."

        response = client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={"question": "What is RAG?", "collection": "default", "stream": False},
        )

    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert data["answer"] == "RAG stands for Retrieval Augmented Generation."


def test_chat_strategy_field_accepted(client, auth_headers):
    mock_chunks = [{"content": "Hybrid search content.", "source": "doc.txt", "chunk": 0, "score": 0.85}]
    with patch("app.api.routes.chat.retrieve", new_callable=AsyncMock) as mock_retrieve, \
         patch("app.api.routes.chat.generate_answer", new_callable=AsyncMock) as mock_answer, \
         patch("app.api.routes.chat.log_query"):
        mock_retrieve.return_value = (mock_chunks, {"latency_ms": 20, "steps": ["dense_search", "bm25"]})
        mock_answer.return_value = "Hybrid search blends BM25 and dense retrieval."

        response = client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json={
                "question": "Explain hybrid search",
                "collection": "default",
                "stream": False,
                "retrieval_strategy": "hybrid",
            },
        )

    assert response.status_code == 200


# ── collections ───────────────────────────────────────────────────────────────

def test_list_collections(client, auth_headers):
    with patch("app.api.routes.collections.vector_store") as mock_vs:
        mock_vs.list_collections.return_value = [
            {"name": "default", "document_count": 42}
        ]
        response = client.get("/api/v1/collections", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert data[0]["name"] == "default"


# ── document upload ───────────────────────────────────────────────────────────

def test_upload_txt_document(client, auth_headers):
    content = b"This is a test document about artificial intelligence and machine learning."
    file = io.BytesIO(content)

    with patch("app.api.routes.documents.vector_store") as mock_vs, \
         patch("app.api.routes.documents.chunk_text") as mock_chunk, \
         patch("app.api.routes.documents.extract_text") as mock_extract:
        mock_extract.return_value = content.decode()
        mock_chunk.return_value = ["chunk one", "chunk two"]
        mock_vs.add_documents.return_value = 2
        mock_vs.collection_count.return_value = 2

        response = client.post(
            "/api/v1/documents/upload",
            headers={"X-API-Key": "enterprise-rag-secret"},
            files={"file": ("test.txt", file, "text/plain")},
            data={"collection": "test_col"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["chunks_added"] == 2
    assert data["collection"] == "test_col"


# ── eval endpoint ─────────────────────────────────────────────────────────────

def _parse_sse(response_text: str) -> list[dict]:
    """Parse SSE response body into a list of event dicts."""
    import json
    events = []
    for line in response_text.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


def test_eval_run_streams_results(client, auth_headers):
    mock_chunks = [
        {"content": "ChromaDB is a vector database.", "source": "doc.txt", "chunk": 0, "score": 0.88}
    ]
    with patch("app.api.routes.eval.retrieve", new_callable=AsyncMock) as mock_retrieve, \
         patch("app.api.routes.eval.generate_answer", new_callable=AsyncMock) as mock_answer, \
         patch("app.api.routes.eval.eval_metrics.context_relevance", return_value=0.88), \
         patch("app.api.routes.eval.eval_metrics.answer_relevance", return_value=0.75), \
         patch("app.api.routes.eval.eval_metrics.answer_faithfulness", new_callable=AsyncMock, return_value=0.9):
        mock_retrieve.return_value = (mock_chunks, {"latency_ms": 50, "steps": ["dense_search"]})
        mock_answer.return_value = "ChromaDB stores embeddings for semantic search."

        response = client.post(
            "/api/v1/eval/run",
            headers=auth_headers,
            json={"questions": ["What is ChromaDB?"], "collection": "default"},
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    types = [e["type"] for e in events]
    assert "progress" in types
    assert "result" in types
    assert "done" in types

    result_event = next(e for e in events if e["type"] == "result")
    assert result_event["result"]["context_relevance"] == 0.88

    done_event = next(e for e in events if e["type"] == "done")
    assert "aggregate" in done_event


def test_eval_no_docs_streams_error_in_result(client, auth_headers):
    with patch("app.api.routes.eval.retrieve", new_callable=AsyncMock) as mock_retrieve:
        mock_retrieve.return_value = ([], {"latency_ms": 5, "steps": []})
        response = client.post(
            "/api/v1/eval/run",
            headers=auth_headers,
            json={"questions": ["Empty collection question"], "collection": "empty"},
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    result_event = next(e for e in events if e["type"] == "result")
    assert result_event["result"]["error"] is not None


def test_eval_caps_at_20_questions(client, auth_headers):
    questions = [f"Question {i}" for i in range(30)]
    mock_chunks = [{"content": "context", "source": "doc.txt", "chunk": 0, "score": 0.8}]

    with patch("app.api.routes.eval.retrieve", new_callable=AsyncMock) as mock_retrieve, \
         patch("app.api.routes.eval.generate_answer", new_callable=AsyncMock) as mock_answer, \
         patch("app.api.routes.eval.eval_metrics.context_relevance", return_value=0.8), \
         patch("app.api.routes.eval.eval_metrics.answer_relevance", return_value=0.7), \
         patch("app.api.routes.eval.eval_metrics.answer_faithfulness", new_callable=AsyncMock, return_value=0.8):
        mock_retrieve.return_value = (mock_chunks, {"latency_ms": 10, "steps": []})
        mock_answer.return_value = "answer"

        response = client.post(
            "/api/v1/eval/run",
            headers=auth_headers,
            json={"questions": questions, "collection": "default"},
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    result_events = [e for e in events if e["type"] == "result"]
    assert len(result_events) == 20
