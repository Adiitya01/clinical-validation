"""
Database — SQLite initialization and connection helpers.
"""

import aiosqlite
import os

DB_PATH = "reg_validator.db"


async def init_db():
    """Initialize database tables with production-ready schema."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'PENDING',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS validation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                document_name TEXT,
                guideline_name TEXT,
                result_json TEXT,
                accuracy_score REAL DEFAULT 0,
                consistency_score REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions (id)
            )
        """)
        # Index for faster lookups
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_results_session 
            ON validation_results(session_id)
        """)
        await db.commit()


async def get_db():
    """Async generator for database connections."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
