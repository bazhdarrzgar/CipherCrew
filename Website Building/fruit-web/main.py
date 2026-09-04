"""
Fruit Adulteration Detection API
FastAPI backend wrapping YOLO + Keras classifier pipeline
Deploy on Render.com
"""

import io
import logging
import cv2
import numpy as np
import base64
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import tensorflow as tf
import keras
import database

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
except Exception:
    pass

from PIL import Image as PILImage, ImageOps

logger = logging.getLogger("uvicorn.error")

# ── lazy-load heavy deps so Render startup is faster ──
_yolo = None
_classifier = None


BASE_DIR = Path(__file__).resolve().parent


def resolve_model_path(path_value: str) -> Path:
    """Resolve model files from the backend directory first, then the shell cwd."""
    raw_path = Path(path_value).expanduser()
    if raw_path.is_absolute():
        return raw_path

    for candidate in (BASE_DIR / raw_path, Path.cwd() / raw_path):
        if candidate.exists():
            return candidate
    return BASE_DIR / raw_path


YOLO_MODEL_PATH = resolve_model_path(os.environ.get("YOLO_MODEL", "yolov8n.pt"))
CLASSIFIER_PATH = resolve_model_path(
    os.environ.get("CLASSIFIER_MODEL", "models/fruit_adulteration_final.keras")
)
DETECTABLE_FRUIT_CLASSES = {
    item.strip().lower()
    for item in os.environ.get("FRUIT_DETECTOR_CLASSES", "apple,banana,orange").split(",")
    if item.strip()
}

IMG_SIZE = 224
CROP_PADDING = 8
LABEL_ORDER = ['adulterated', 'fresh', 'rotten']   # ← match your training order
CLASS_NAMES = LABEL_ORDER.copy()
DISPLAY_NAMES = {
    'adulterated': 'Unknown',
    'fresh': 'Good',
    'rotten': 'Bad',
}

CLASS_COLORS_BGR = {
    'fresh':      (94, 197, 34),
    'rotten':     (68,  68, 239),
    'adulterated':(11, 158, 245),
}

PREPROCESSING_MODES = ['tf', 'mobilenet', 'imagenet']
CLASSIFIER_PREPROCESSING = os.environ.get("CLASSIFIER_PREPROCESSING", "tf").strip().lower()
IMAGENET_MEAN_RGB = np.array([123.68, 116.779, 103.939], dtype=np.float32)

# ───────────────────────── App ─────────────────────────

app = FastAPI(
    title="CipherCrew - Fruit Adulteration Detector",
    description="YOLO + Keras classifier for good / bad / unknown fruit",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,   # must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    database.init_db()
    print("[OK] SQLite database initialized at", database.DB_PATH)


class UpdateHistoryRequest(BaseModel):
    manual_label: Optional[str] = None
    is_rejected: Optional[bool] = None


# ───────────────────────── Model loading ─────────────────────────

def get_yolo():
    global _yolo
    if _yolo is None:
        if not YOLO_MODEL_PATH.exists():
            raise FileNotFoundError(f"YOLO model not found: {YOLO_MODEL_PATH}")
        import torch
        from ultralytics.nn.tasks import DetectionModel
        import torch.nn.modules.container
        torch.serialization.add_safe_globals([DetectionModel, torch.nn.modules.container.Sequential])
        from ultralytics import YOLO
        _yolo = YOLO(str(YOLO_MODEL_PATH))
        print(f"[OK] YOLO loaded from {YOLO_MODEL_PATH}")
    return _yolo

def get_classifier():
    global _classifier
    if _classifier is None:
        if not CLASSIFIER_PATH.exists():
            raise FileNotFoundError(f"Classifier not found: {CLASSIFIER_PATH}")
        try:
            _classifier = keras.models.load_model(CLASSIFIER_PATH, compile=False)
        except TypeError as exc:
            if CLASSIFIER_PATH.suffix.lower() == ".h5" and "quantization_config" in str(exc):
                raise RuntimeError(
                    "The H5 classifier was saved with metadata that this Keras runtime "
                    "cannot deserialize. Use the bundled .keras model or set "
                    "CLASSIFIER_MODEL=models/fruit_adulteration_final.keras."
                ) from exc
            raise
        print(f"[OK] Classifier loaded from {CLASSIFIER_PATH}")
    return _classifier

