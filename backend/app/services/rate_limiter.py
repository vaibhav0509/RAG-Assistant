import sqlite3
from datetime import date
from pathlib import Path

_DB = Path("rate_limits.db")
DAILY_LIMIT = 100


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_DB))
    conn.execute("""
        CREATE TABLE IF NOT EXISTS rate_limits (
            user_id TEXT NOT NULL,
            date    TEXT NOT NULL,
            count   INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (user_id, date)
        )
    """)
    conn.commit()
    return conn


def check_and_increment(user_id: str) -> tuple[bool, int]:
    """Return (allowed, count_after). Increments only if allowed."""
    today = date.today().isoformat()
    with _conn() as conn:
        row = conn.execute(
            "SELECT count FROM rate_limits WHERE user_id = ? AND date = ?",
            (user_id, today),
        ).fetchone()
        current = row[0] if row else 0

        if current >= DAILY_LIMIT:
            return False, current

        conn.execute(
            """
            INSERT INTO rate_limits (user_id, date, count) VALUES (?, ?, 1)
            ON CONFLICT (user_id, date) DO UPDATE SET count = count + 1
            """,
            (user_id, today),
        )
        conn.commit()
        return True, current + 1


def get_usage(user_id: str) -> dict:
    today = date.today().isoformat()
    with _conn() as conn:
        row = conn.execute(
            "SELECT count FROM rate_limits WHERE user_id = ? AND date = ?",
            (user_id, today),
        ).fetchone()
    used = row[0] if row else 0
    return {"used": used, "limit": DAILY_LIMIT, "remaining": max(0, DAILY_LIMIT - used)}
