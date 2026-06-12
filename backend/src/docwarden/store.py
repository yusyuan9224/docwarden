"""SQLite:來源、文件、未解問題(拒答紀錄,幫站長找出該補的文件)。"""

import uuid
from datetime import UTC, datetime

import aiosqlite

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id),
    name TEXT NOT NULL,
    num_chunks INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS unanswered (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved INTEGER NOT NULL DEFAULT 0
);
"""


def _now() -> str:
    return datetime.now(UTC).isoformat()


class Store:
    def __init__(self, db_path: str) -> None:
        self.db_path = db_path

    async def init(self) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.executescript(SCHEMA)
            await db.commit()

    async def create_source(self, name: str, description: str) -> str:
        sid = uuid.uuid4().hex[:12]
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO sources VALUES (?,?,?,?)", (sid, name, description, _now())
            )
            await db.commit()
        return sid

    async def list_sources(self) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            rows = await db.execute_fetchall(
                """SELECT s.*,
                       COUNT(d.id) AS num_docs,
                       COALESCE(SUM(d.num_chunks), 0) AS num_chunks
                   FROM sources s LEFT JOIN documents d ON d.source_id = s.id
                   GROUP BY s.id ORDER BY s.created_at"""
            )
        return [dict(r) for r in rows]

    async def get_source(self, sid: str) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            rows = await db.execute_fetchall("SELECT * FROM sources WHERE id=?", (sid,))
        return dict(rows[0]) if rows else None

    async def delete_source(self, sid: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM documents WHERE source_id=?", (sid,))
            await db.execute("DELETE FROM sources WHERE id=?", (sid,))
            await db.commit()

    async def add_document(self, source_id: str, name: str, num_chunks: int) -> str:
        did = uuid.uuid4().hex[:12]
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO documents VALUES (?,?,?,?,?)",
                (did, source_id, name, num_chunks, _now()),
            )
            await db.commit()
        return did

    async def log_unanswered(self, question: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO unanswered VALUES (?,?,?,0)", (uuid.uuid4().hex[:12], question, _now())
            )
            await db.commit()

    async def list_unanswered(self, include_resolved: bool = False) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            q = "SELECT * FROM unanswered" + ("" if include_resolved else " WHERE resolved=0")
            rows = await db.execute_fetchall(q + " ORDER BY created_at DESC")
        return [dict(r) for r in rows]

    async def resolve_unanswered(self, uid: str) -> None:
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE unanswered SET resolved=1 WHERE id=?", (uid,))
            await db.commit()
