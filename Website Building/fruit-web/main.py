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

def make_gradcam_heatmap(img_array, clf_model, last_conv_layer_name='mobilenetv2_1.00_224', pred_index=None):
    feature_layer = clf_model.get_layer(last_conv_layer_name)
    feature_layer_index = clf_model.layers.index(feature_layer)
    classifier_head = clf_model.layers[feature_layer_index + 1:]
    img_tensor = tf.convert_to_tensor(img_array, dtype=tf.float32)

    with tf.GradientTape() as tape:
        last_conv_layer_output = feature_layer(img_tensor, training=False)
        tape.watch(last_conv_layer_output)
        preds = last_conv_layer_output
        for layer in classifier_head:
            try:
                preds = layer(preds, training=False)
            except TypeError:
                preds = layer(preds)
        if pred_index is None:
            pred_index = tf.argmax(preds[0])
        class_channel = preds[:, pred_index]

    grads = tape.gradient(class_channel, last_conv_layer_output)
    if grads is None:
        raise RuntimeError("Could not compute Grad-CAM gradients.")
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    last_conv_layer_output = last_conv_layer_output[0]
    heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0)
    max_val = tf.math.reduce_max(heatmap)
    if float(max_val.numpy()) > 0:
        heatmap = heatmap / max_val
    return heatmap.numpy()

def superimpose_gradcam(img_bgr, heatmap, alpha=0.4):
    heatmap = np.uint8(255 * heatmap)
    jet = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    jet = cv2.resize(jet, (img_bgr.shape[1], img_bgr.shape[0]))
    superimposed = cv2.addWeighted(jet, alpha, img_bgr, 1 - alpha, 0)
    return superimposed


def annotate_image(image: np.ndarray, detections: list) -> np.ndarray:
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        cls   = det['class']
        conf  = det['class_conf']
        color = CLASS_COLORS_BGR.get(cls, (200, 200, 200))
        font_scale, thickness, pad = scale_params(image)

        # bbox
        cv2.rectangle(image, (x1, y1), (x2, y2), color, thickness)

        # label background + text
        label = f"{DISPLAY_NAMES.get(cls, cls).upper()} {int(conf*100)}%"
        (tw, th), base = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, thickness)
        lh = th + base + pad * 2
        lx1 = x1
        ly2 = max(lh, y1 - 4)
        ly1 = ly2 - lh
        if ly1 < 0:
            ly1, ly2 = y2 + 4, y2 + 4 + lh
        lx2 = lx1 + tw + pad * 2
        h_, w_ = image.shape[:2]
        lx2 = min(lx2, w_ - 2)

        draw_transparent_rect(image, (lx1, ly1), (lx2, ly2), color, alpha=0.55)
        cv2.putText(image, label, (lx1 + pad, ly2 - pad),
                    cv2.FONT_HERSHEY_SIMPLEX, font_scale, (255,255,255), thickness, cv2.LINE_AA)

        # confidence bar
        bar_w = max(40, x2 - x1)
        filled = int(bar_w * conf)
        bh = max(6, int(min(image.shape[:2]) / 160))
        by1 = min(image.shape[0] - bh - 2, y2 + lh + 6)
        draw_transparent_rect(image, (x1, by1), (x1 + bar_w, by1 + bh), (50,50,50), alpha=0.35)
        cv2.rectangle(image, (x1, by1), (x1 + filled, by1 + bh), color, -1)

    # summary banner
    counts = {cls: sum(1 for d in detections if d['class'] == cls) for cls in CLASS_NAMES}
    mode = detections[0].get('mode', 'auto') if detections else 'auto'
    summary = (f"Detected:{len(detections)}  "
               f"Good:{counts['fresh']}  "
               f"Bad:{counts['rotten']}  "
               f"Unknown:{counts['adulterated']}")
    fs, th2, pd2 = scale_params(image)
    (sw, sth), sbl = cv2.getTextSize(summary, cv2.FONT_HERSHEY_SIMPLEX, fs, th2)
    draw_transparent_rect(image, (10, 10), (14 + sw + pd2*2, 14 + sth + pd2*2), (0,0,0), alpha=0.55)
    cv2.putText(image, summary, (12 + pd2, 12 + sth + pd2),
                cv2.FONT_HERSHEY_SIMPLEX, fs, (255,255,255), th2, cv2.LINE_AA)
    return image


def image_to_base64(img_bgr: np.ndarray) -> str:
    _, buffer = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return base64.b64encode(buffer).decode('utf-8')

# ───────────────────────── Routes ─────────────────────────

@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Fruit Adulteration Detector API",
        "classes": [DISPLAY_NAMES.get(cls, cls) for cls in CLASS_NAMES],
        "detectable_fruits": sorted(DETECTABLE_FRUIT_CLASSES),
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "classifier_model": str(CLASSIFIER_PATH),
        "yolo_model": str(YOLO_MODEL_PATH),
        "classifier_preprocessing": choose_preprocessing_mode([]),
    }


def decode_image(contents: bytes) -> Optional[np.ndarray]:
    """
    Robustly decodes image bytes into a BGR uint8 numpy array for OpenCV/YOLO/MobileNet.
    Attempts OpenCV first, then falls back to Pillow to support:
    AVIF, WebP, HEIC/HEIF, JFIF, PNG with alpha/palette, CMYK JPEG, etc.
    Also auto-corrects EXIF orientation from smartphone cameras.
    """
    if not contents or len(contents) == 0:
        return None

    # 1. Fast OpenCV decode attempt
    try:
        nparr = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is not None and image.size > 0:
            return image
    except Exception as e:
        logger.debug(f"cv2.imdecode skipped or failed: {e}")

    # 2. Resilient Pillow decode fallback (AVIF, WebP, HEIC, RGBA, etc.)
    try:
        with io.BytesIO(contents) as buf:
            pil_img = PILImage.open(buf)
            # Correct orientation from phone camera metadata
            try:
                pil_img = ImageOps.exif_transpose(pil_img)
            except Exception:
                pass

            # Convert RGBA/Palette/CMYK/Grayscale cleanly to standard 3-channel RGB
            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")

            rgb_arr = np.array(pil_img)
            if rgb_arr is not None and rgb_arr.size > 0:
                # Convert RGB to BGR for OpenCV
                return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
    except Exception as e:
        logger.error(f"Pillow image decode failed: {e}")

    return None


