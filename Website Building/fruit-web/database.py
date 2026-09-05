"""
SQLite Database Layer for Fruit Detection Platform
Provides local persistence for detections, overrides, rejections, and metadata.
"""

import sqlite3
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("DATABASE_PATH", str(BASE_DIR / "detections.db")))


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db():
    """Initializes the database schema and indices."""
    conn = get_connection()
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS detections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    batch_id TEXT,
                    filename TEXT NOT NULL,
                    fruit_type TEXT,
                    predicted_label TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    manual_label TEXT DEFAULT NULL,
                    is_rejected INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    annotated_image TEXT,
                    metadata_json TEXT
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_detections_created_at 
                ON detections (created_at DESC);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_detections_label 
                ON detections (predicted_label);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_detections_batch_id 
                ON detections (batch_id);
            """)
    finally:
        conn.close()


def insert_detection(
    filename: str,
    fruit_type: str,
    predicted_label: str,
    confidence: float,
    annotated_image: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    batch_id: Optional[str] = None,
    manual_label: Optional[str] = None,
    is_rejected: int = 0
) -> int:
    """Inserts a new detection record into SQLite and returns the inserted ID."""
    conn = get_connection()
    created_at = datetime.utcnow().isoformat() + "Z"
    metadata_json = json.dumps(metadata) if metadata is not None else "{}"

    try:
        with conn:
            cursor = conn.execute("""
                INSERT INTO detections (
                    batch_id, filename, fruit_type, predicted_label, 
                    confidence, manual_label, is_rejected, created_at, 
                    annotated_image, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                batch_id,
                filename,
                fruit_type,
                predicted_label.lower(),
                float(confidence),
                manual_label.lower() if manual_label else None,
                int(is_rejected),
                created_at,
                annotated_image,
                metadata_json
            ))
            return cursor.lastrowid
    finally:
        conn.close()


