import sqlite3
import uuid
from datetime import datetime

PERF_DB = "./perf.db"


def _conn():
    c = sqlite3.connect(PERF_DB)
    c.row_factory = sqlite3.Row
    return c


def init_perf_db():
    c = _conn()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS query_perf (
            id                TEXT PRIMARY KEY,
            ts                TEXT,
            collection        TEXT,
            retrieval_strategy TEXT,
            top_k             INTEGER,
            embedding_model   TEXT,
            query_text        TEXT,
            retrieval_ms      INTEGER,
            llm_ms            INTEGER,
            total_ms          INTEGER,
            avg_score         REAL,
            max_score         REAL,
            chunks_retrieved  INTEGER,
            retrieval_steps   TEXT
        );
    """)
    c.commit()
    c.close()


def log_query(
    collection: str,
    retrieval_strategy: str,
    top_k: int,
    embedding_model: str,
    query_text: str,
    retrieval_ms: int,
    llm_ms: int,
    total_ms: int,
    scores: list[float],
    chunks_retrieved: int,
    retrieval_steps: list[str],
) -> str:
    rid = str(uuid.uuid4())
    avg_score = round(sum(scores) / len(scores), 4) if scores else 0
    max_score = round(max(scores), 4) if scores else 0

    c = _conn()
    c.execute(
        """INSERT INTO query_perf VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            rid, datetime.utcnow().isoformat(), collection,
            retrieval_strategy, top_k, embedding_model,
            query_text[:200], retrieval_ms, llm_ms, total_ms,
            avg_score, max_score, chunks_retrieved,
            ",".join(retrieval_steps),
        ),
    )
    c.commit()
    c.close()
    return rid


def get_perf_history(limit: int = 30) -> list[dict]:
    c = _conn()
    rows = c.execute(
        "SELECT * FROM query_perf ORDER BY ts DESC LIMIT ?", (limit,)
    ).fetchall()
    c.close()
    return [dict(r) for r in rows]


def get_strategy_stats() -> list[dict]:
    c = _conn()
    rows = c.execute("""
        SELECT
            retrieval_strategy,
            COUNT(*) as queries,
            ROUND(AVG(avg_score), 3) as avg_relevance,
            ROUND(AVG(retrieval_ms), 0) as avg_retrieval_ms,
            ROUND(AVG(total_ms), 0) as avg_total_ms,
            ROUND(AVG(chunks_retrieved), 1) as avg_chunks
        FROM query_perf
        GROUP BY retrieval_strategy
        ORDER BY avg_relevance DESC
    """).fetchall()
    c.close()
    return [dict(r) for r in rows]
