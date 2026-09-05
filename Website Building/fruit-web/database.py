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


def get_history(
    limit: int = 50,
    offset: int = 0,
    label_filter: Optional[str] = None,
    fruit_filter: Optional[str] = None,
    search: Optional[str] = None,
    include_image: bool = False
) -> Dict[str, Any]:
    """Retrieves paginated detection history with optional filters."""
    conn = get_connection()
    try:
        conditions = []
        params: List[Any] = []

        if label_filter:
            lf = label_filter.lower().strip()
            if lf in ("good", "fresh"):
                conditions.append("LOWER(COALESCE(manual_label, predicted_label)) IN ('good', 'fresh')")
            elif lf in ("bad", "rotten"):
                conditions.append("LOWER(COALESCE(manual_label, predicted_label)) IN ('bad', 'rotten')")
            elif lf in ("unknown", "adulterated", "adulterant"):
                conditions.append("LOWER(COALESCE(manual_label, predicted_label)) IN ('unknown', 'adulterated', 'adulterant')")
            else:
                conditions.append("LOWER(COALESCE(manual_label, predicted_label)) = ?")
                params.append(lf)

        if fruit_filter:
            conditions.append("LOWER(fruit_type) = ?")
            params.append(fruit_filter.lower())

        if search:
            conditions.append("(filename LIKE ? OR fruit_type LIKE ?)")
            term = f"%{search}%"
            params.extend([term, term])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        # Total count query
        count_query = f"SELECT COUNT(*) as cnt FROM detections {where_clause}"
        total_count = conn.execute(count_query, params).fetchone()["cnt"]

        # Select query
        img_col = "annotated_image" if include_image else "NULL as annotated_image"
        select_query = f"""
            SELECT id, batch_id, filename, fruit_type, predicted_label, 
                   confidence, manual_label, is_rejected, created_at, 
                   metadata_json, {img_col}
            FROM detections
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        """
        query_params = params + [limit, offset]
        rows = conn.execute(select_query, query_params).fetchall()

        items = []
        for r in rows:
            meta = {}
            if r["metadata_json"]:
                try:
                    meta = json.loads(r["metadata_json"])
                except Exception:
                    pass

            items.append({
                "id": r["id"],
                "batch_id": r["batch_id"],
                "filename": r["filename"],
                "fruit_type": r["fruit_type"],
                "predicted_label": r["predicted_label"],
                "confidence": r["confidence"],
                "manual_label": r["manual_label"],
                "effective_label": r["manual_label"] or r["predicted_label"],
                "is_rejected": bool(r["is_rejected"]),
                "created_at": r["created_at"],
                "annotated_image": r["annotated_image"],
                "metadata": meta,
            })

        return {
            "total": total_count,
            "limit": limit,
            "offset": offset,
            "items": items
        }
    finally:
        conn.close()


