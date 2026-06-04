import sqlite3
import json
import uuid
from datetime import datetime

DB_PATH = "./game.db"


def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS game_sessions (
            id          TEXT PRIMARY KEY,
            topic       TEXT NOT NULL,
            subtopic    TEXT NOT NULL,
            sources     TEXT NOT NULL,
            collection  TEXT,
            model       TEXT,
            total_questions INTEGER DEFAULT 0,
            created_at  TEXT,
            completed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS game_rounds (
            id              TEXT PRIMARY KEY,
            session_id      TEXT NOT NULL,
            question        TEXT NOT NULL,
            options         TEXT NOT NULL,
            correct_answer  TEXT NOT NULL,
            user_answer     TEXT,
            is_correct      INTEGER,
            response_time_ms INTEGER,
            difficulty      TEXT,
            source          TEXT,
            explanation     TEXT,
            created_at      TEXT,
            FOREIGN KEY (session_id) REFERENCES game_sessions(id)
        );
    """)
    conn.commit()
    conn.close()


def create_session(topic: str, subtopic: str, sources: list[str], collection: str, model: str) -> str:
    sid = str(uuid.uuid4())
    conn = _conn()
    conn.execute(
        "INSERT INTO game_sessions VALUES (?,?,?,?,?,?,?,?,?)",
        (sid, topic, subtopic, json.dumps(sources), collection, model, 0, datetime.utcnow().isoformat(), None),
    )
    conn.commit()
    conn.close()
    return sid


def store_questions(session_id: str, questions: list[dict]):
    conn = _conn()
    for q in questions:
        conn.execute(
            "INSERT INTO game_rounds (id,session_id,question,options,correct_answer,difficulty,source,explanation,created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (q["id"], session_id, q["question"], json.dumps(q["options"]), q["correct_answer"],
             q.get("difficulty", "medium"), q["source"], q.get("explanation", ""), datetime.utcnow().isoformat()),
        )
    conn.execute("UPDATE game_sessions SET total_questions=? WHERE id=?", (len(questions), session_id))
    conn.commit()
    conn.close()


def record_answer(session_id: str, round_id: str, answer: str, response_time_ms: int) -> dict:
    conn = _conn()
    row = conn.execute("SELECT * FROM game_rounds WHERE id=? AND session_id=?", (round_id, session_id)).fetchone()
    if not row:
        conn.close()
        return {}

    is_correct = int(answer.upper() == row["correct_answer"].upper())
    conn.execute(
        "UPDATE game_rounds SET user_answer=?, is_correct=?, response_time_ms=? WHERE id=?",
        (answer, is_correct, response_time_ms, round_id),
    )
    conn.commit()
    conn.close()
    return {"is_correct": bool(is_correct), "correct_answer": row["correct_answer"], "explanation": row["explanation"]}


def get_analysis(session_id: str) -> dict:
    conn = _conn()
    session = conn.execute("SELECT * FROM game_sessions WHERE id=?", (session_id,)).fetchone()
    rounds = conn.execute(
        "SELECT * FROM game_rounds WHERE session_id=? AND user_answer IS NOT NULL", (session_id,)
    ).fetchall()
    conn.execute("UPDATE game_sessions SET completed_at=? WHERE id=?", (datetime.utcnow().isoformat(), session_id))
    conn.commit()
    conn.close()

    if not rounds:
        return {"error": "No answers recorded"}

    total = len(rounds)
    correct = sum(r["is_correct"] for r in rounds)
    avg_time = sum(r["response_time_ms"] or 0 for r in rounds) // total if total else 0

    source_stats: dict[str, dict] = {}
    for r in rounds:
        s = r["source"]
        if s not in source_stats:
            source_stats[s] = {"total": 0, "correct": 0}
        source_stats[s]["total"] += 1
        source_stats[s]["correct"] += r["is_correct"]

    difficulty_stats: dict[str, dict] = {}
    for r in rounds:
        d = r["difficulty"] or "medium"
        if d not in difficulty_stats:
            difficulty_stats[d] = {"total": 0, "correct": 0}
        difficulty_stats[d]["total"] += 1
        difficulty_stats[d]["correct"] += r["is_correct"]

    return {
        "session_id": session_id,
        "topic": session["topic"],
        "subtopic": session["subtopic"],
        "score": correct,
        "total": total,
        "accuracy": round(correct / total * 100, 1),
        "avg_response_time_ms": avg_time,
        "source_breakdown": source_stats,
        "difficulty_breakdown": difficulty_stats,
    }


def get_history() -> list[dict]:
    conn = _conn()
    rows = conn.execute("""
        SELECT s.*, COUNT(r.id) as answered,
               SUM(r.is_correct) as correct_count
        FROM game_sessions s
        LEFT JOIN game_rounds r ON r.session_id = s.id AND r.user_answer IS NOT NULL
        GROUP BY s.id ORDER BY s.created_at DESC LIMIT 20
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]
