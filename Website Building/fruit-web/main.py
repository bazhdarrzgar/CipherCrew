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

@app.get('/')
def root():
    return {'status': 'online', 'message': 'API initialized'}
