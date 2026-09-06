"""
Fruit Unknown Data Detection API
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
    title="CipherCrew - Fruit Unknown Data Detector",
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
        "message": "Fruit Unknown Data Detector API",
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


@app.post("/detect")
async def detect(
    request: Request,
    file: UploadFile = File(...),
    return_gradcam: bool = Form(False),
):
    """
    Upload a fruit image. Returns:
      - annotated_image: base64 JPEG
      - detections: list of per-object results
      - summary: counts per class
    """
    query_gradcam = request.query_params.get("return_gradcam")
    if query_gradcam is not None:
        return_gradcam = query_gradcam.lower() in {"1", "true", "yes", "on"}

    # ── read image ──
    contents = await file.read()
    if not contents:
        await file.seek(0)
        contents = await file.read()

    image = decode_image(contents)
    if image is None:
        raise HTTPException(
            status_code=400,
            detail=f"Could not decode image '{file.filename}'. Please ensure it is a valid image (JPEG, PNG, WebP, AVIF, HEIC, JFIF)."
        )

    original = image.copy()
    h, w = image.shape[:2]

    # ── YOLO detection ──
    yolo = get_yolo()
    yolo_results = yolo(image, conf=0.25, verbose=False)

    raw_detections = []
    for res in yolo_results:
        for box in res.boxes:
            try:
                coords = box.xyxy[0].cpu().numpy()
            except Exception:
                coords = box.xyxy[0]
            x1, y1, x2, y2 = map(int, coords)
            cls_id = int(box.cls[0])
            class_name = yolo.names[cls_id] if hasattr(yolo, 'names') else str(cls_id)

            if class_name.lower() not in DETECTABLE_FRUIT_CLASSES:
                continue

            x1 = max(0, min(x1, w - 1)); y1 = max(0, min(y1, h - 1))
            x2 = max(0, min(x2, w));     y2 = max(0, min(y2, h))
            if x2 <= x1 or y2 <= y1:
                continue

            raw_detections.append({
                'bbox': [x1, y1, x2, y2],
                'yolo_conf': float(box.conf[0]),
                'yolo_class': class_name,
                'fallback': False,
            })

    if not raw_detections:
        raw_detections.append({
            'bbox': [0, 0, w, h],
            'yolo_conf': 0.0,
            'yolo_class': 'full_image',
            'fallback': True,
        })

    # ── collect crops ──
    crops = []
    for det in raw_detections:
        x1, y1, x2, y2 = det['bbox']
        x1c = max(0, x1 - CROP_PADDING);  y1c = max(0, y1 - CROP_PADDING)
        x2c = min(w, x2 + CROP_PADDING);  y2c = min(h, y2 + CROP_PADDING)
        crop = original[y1c:y2c, x1c:x2c]
        if crop.size == 0:
            continue
        crops.append(crop)

    if not crops:
        raise HTTPException(status_code=422, detail="No valid image crop could be produced.")

    # ── classify each detected fruit crop individually ──
    clf = get_classifier()
    final_detections = []

    for i, det in enumerate(raw_detections):
        is_fallback = bool(det.get('fallback', False))
        crop_img = crops[i] if (not is_fallback and i < len(crops)) else original
        crop_mode = choose_preprocessing_mode([crop_img])
        crop_batch = np.expand_dims(preprocess_crop(crop_img, crop_mode), axis=0)

        pred = clf.predict(crop_batch, verbose=0)[0]
        idx = int(np.argmax(pred))
        cls_name = CLASS_NAMES[idx]
        conf = round(float(pred[idx]), 4)
        probs = {
            CLASS_NAMES[j]: round(float(pred[j]), 4)
            for j in range(len(CLASS_NAMES))
        }

        gradcam_b64 = None
        if return_gradcam:
            try:
                heatmap = make_gradcam_heatmap(crop_batch, clf, pred_index=idx)
                cam_img = superimpose_gradcam(crop_img, heatmap)
                gradcam_b64 = image_to_base64(cam_img)
            except Exception as e:
                print(f"Error generating Grad-CAM: {e}")

        crop_b64 = image_to_base64(crop_img)

        final_detections.append({
            'bbox': det['bbox'],
            'yolo_class': det['yolo_class'],
            'yolo_conf': round(det['yolo_conf'], 4),
            'class': cls_name,
            'label': DISPLAY_NAMES.get(cls_name, cls_name.title()),
            'class_conf': conf,
            'mode': crop_mode,
            'fallback': is_fallback,
            'probabilities': probs,
            'gradcam_b64': gradcam_b64,
            'crop_b64': crop_b64,
        })

    # Overall condition prioritization: rotten > adulterated > fresh
    if any(d['class'] == 'rotten' for d in final_detections):
        dominant_class = 'rotten'
    elif any(d['class'] == 'adulterated' for d in final_detections):
        dominant_class = 'adulterated'
    else:
        dominant_class = 'fresh'

    matching_dets = [d for d in final_detections if d['class'] == dominant_class]
    lead_det = max(matching_dets, key=lambda d: d['class_conf']) if matching_dets else final_detections[0]

    overall = {
        'class': lead_det['class'],
        'label': lead_det['label'],
        'class_conf': lead_det['class_conf'],
        'mode': lead_det['mode'],
        'probabilities': lead_det['probabilities'],
    }

    # ── annotate ──
    annotated = annotate_image(original.copy(), final_detections)

    summary = {cls: sum(1 for d in final_detections if d['class'] == cls)
               for cls in CLASS_NAMES}

    # ── save to SQLite database ──
    fruit_type = "Unknown"
    for d in final_detections:
        y_cls = d.get('yolo_class', '')
        if y_cls and y_cls != 'full_image':
            fruit_type = y_cls.title()
            break

    annotated_b64 = image_to_base64(annotated)
    db_id = None
    try:
        db_id = database.insert_detection(
            filename=file.filename or "uploaded_image.jpg",
            fruit_type=fruit_type,
            predicted_label=overall['class'],
            confidence=overall['class_conf'],
            annotated_image=annotated_b64,
            metadata={
                "summary": summary,
                "overall": overall,
                "detections": [
                    {k: v for k, v in d.items() if k not in ("crop_b64", "gradcam_b64")}
                    for d in final_detections
                ],
                "used_fallback": any(d.get('fallback', False) for d in final_detections),
            },
            batch_id=request.query_params.get("batch_id")
        )
    except Exception as e:
        print(f"Warning: Failed to save detection to SQLite: {e}")

    return {
        "annotated_image": annotated_b64,
        "detections": final_detections,
        "summary": summary,
        "summary_labels": {DISPLAY_NAMES.get(cls, cls.title()): count for cls, count in summary.items()},
        "overall": overall,
        "mode": overall.get("mode", "tf"),
        "total": len(final_detections),
        "used_fallback": any(d.get('fallback', False) for d in final_detections),
        "db_id": db_id,
    }


# ───────────────────────── History & SQLite Endpoints ─────────────────────────

@app.get("/history")
async def get_history_endpoint(
    limit: int = 50,
    offset: int = 0,
    label: Optional[str] = None,
    fruit: Optional[str] = None,
    search: Optional[str] = None,
    include_image: bool = False,
):
    """Retrieve paginated detection history saved in SQLite."""
    try:
        return database.get_history(
            limit=limit,
            offset=offset,
            label_filter=label,
            fruit_filter=fruit,
            search=search,
            include_image=include_image
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/stats")
async def get_history_stats_endpoint():
    """Retrieve global aggregate metrics across all detections in SQLite."""
    try:
        return database.get_db_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/{record_id}")
async def get_single_history_endpoint(record_id: int):
    """Retrieve a single detection record by ID with its annotated image."""
    record = database.get_detection(record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return record


@app.patch("/history/{record_id}")
async def update_history_endpoint(record_id: int, payload: UpdateHistoryRequest):
    """Update manual label override or rejection status in SQLite."""
    updated = database.update_detection(
        record_id=record_id,
        manual_label=payload.manual_label,
        is_rejected=payload.is_rejected
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return updated


@app.delete("/history/{record_id}")
async def delete_history_endpoint(record_id: int):
    """Delete a specific detection record from SQLite."""
    success = database.delete_detection(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Detection record not found")
    return {"status": "deleted", "id": record_id}


@app.delete("/history")
async def clear_history_endpoint():
    """Clear all detection records from SQLite."""
    deleted_count = database.clear_history()
    return {"status": "cleared", "deleted_count": deleted_count}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
