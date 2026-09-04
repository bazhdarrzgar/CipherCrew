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

# ───────────────────────── Helpers ─────────────────────────

def preprocess_crop(crop_bgr: np.ndarray, mode: str) -> np.ndarray:
    img = cv2.resize(crop_bgr, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_AREA)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB).astype(np.float32)
    if mode == 'tf':
        img = img / 255.0
    elif mode == 'mobilenet':
        img = img / 127.5 - 1.0
    elif mode == 'imagenet':
        img = img - IMAGENET_MEAN_RGB
    else:
        img = img / 255.0
    return img.astype(np.float32)


def select_preprocessing_mode(crops: list) -> str:
    if not crops:
        return 'tf'
    clf = get_classifier()
    mode_scores = {}
    for mode in PREPROCESSING_MODES:
        batch = np.stack([preprocess_crop(c, mode) for c in crops])
        try:
            preds = clf.predict(batch, verbose=0)
        except Exception:
            preds = np.zeros((len(crops), len(CLASS_NAMES)), dtype=np.float32)
        max_conf = float(np.mean(np.max(preds, axis=1)))
        pred_idx = np.argmax(preds, axis=1)
        counts = np.bincount(pred_idx, minlength=len(CLASS_NAMES))
        max_frac = float(np.max(counts) / np.sum(counts))
        mode_scores[mode] = max_conf * (1.0 - max_frac)
    return max(mode_scores, key=mode_scores.get)


def choose_preprocessing_mode(crops: list) -> str:
    if CLASSIFIER_PREPROCESSING == "auto":
        return select_preprocessing_mode(crops)
    if CLASSIFIER_PREPROCESSING in PREPROCESSING_MODES:
        return CLASSIFIER_PREPROCESSING
    return "tf"


def scale_params(image: np.ndarray):
    h, w = image.shape[:2]
    diag = (w*w + h*h) ** 0.5
    font_scale = max(0.4, diag / 3000)
    thickness  = max(1, int(diag // 900))
    padding    = max(6, int(diag // 220))
    return font_scale, thickness, padding


def draw_transparent_rect(image, pt1, pt2, color, alpha=0.45):
    overlay = image.copy()
    cv2.rectangle(overlay, pt1, pt2, color, -1)
    cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0, image)

