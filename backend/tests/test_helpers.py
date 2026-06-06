"""Tests for pure retrieval helper functions: _normalize and _rrf."""
import pytest

# Import only the pure functions — engine module imports vector_store (has chromadb side-effects)
# but those are handled by the sys.modules patch in conftest.py
from app.services.retrieval.engine import _normalize, _rrf


# ── _normalize ───────────────────────────────────────────────────────────────

def test_normalize_min_max_range():
    result = _normalize([0.0, 0.5, 1.0])
    assert result[0] == pytest.approx(0.0)
    assert result[1] == pytest.approx(0.5)
    assert result[2] == pytest.approx(1.0)


def test_normalize_arbitrary_values():
    result = _normalize([2.0, 4.0, 6.0])
    assert result[0] == pytest.approx(0.0)
    assert result[1] == pytest.approx(0.5)
    assert result[2] == pytest.approx(1.0)


def test_normalize_all_equal_returns_ones():
    result = _normalize([0.5, 0.5, 0.5])
    assert all(v == pytest.approx(1.0) for v in result)


def test_normalize_single_element_returns_one():
    result = _normalize([0.7])
    assert result == [pytest.approx(1.0)]


def test_normalize_preserves_length():
    scores = [0.1, 0.3, 0.5, 0.7, 0.9]
    result = _normalize(scores)
    assert len(result) == len(scores)


def test_normalize_negative_values():
    result = _normalize([-1.0, 0.0, 1.0])
    assert result[0] == pytest.approx(0.0)
    assert result[1] == pytest.approx(0.5)
    assert result[2] == pytest.approx(1.0)


# ── _rrf ─────────────────────────────────────────────────────────────────────

def test_rrf_single_list_descending_scores():
    rankings = [["doc1", "doc2", "doc3"]]
    scores = _rrf(rankings)
    assert scores["doc1"] > scores["doc2"] > scores["doc3"]


def test_rrf_doc_in_both_lists_scores_highest():
    rankings = [["doc1", "doc2"], ["doc2", "doc3"]]
    scores = _rrf(rankings)
    # doc2 appears in rank 2 of list 1 and rank 1 of list 2
    assert scores["doc2"] > scores["doc1"]
    assert scores["doc2"] > scores["doc3"]


def test_rrf_empty_input_returns_empty():
    assert _rrf([]) == {}


def test_rrf_single_doc():
    scores = _rrf([["only_doc"]])
    assert "only_doc" in scores
    assert scores["only_doc"] > 0


def test_rrf_all_docs_get_positive_scores():
    rankings = [["a", "b", "c"], ["c", "b", "a"]]
    scores = _rrf(rankings)
    assert all(v > 0 for v in scores.values())


def test_rrf_custom_k_changes_scores():
    rankings = [["doc1", "doc2"]]
    scores_k60 = _rrf(rankings, k=60)
    scores_k10 = _rrf(rankings, k=10)
    # With smaller k the score difference between ranks is more pronounced
    diff_k60 = scores_k60["doc1"] - scores_k60["doc2"]
    diff_k10 = scores_k10["doc1"] - scores_k10["doc2"]
    assert diff_k10 > diff_k60
