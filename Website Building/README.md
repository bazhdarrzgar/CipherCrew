<p align="center">
  <img src="frontend/public/logo.png" alt="CipherCrew Logo" width="140" />
</p>

<h1 align="center">CipherCrew — Fruit Quality & Adulteration Detector</h1>

<p align="center">
  <b>An AI-powered visual inspection platform for assessing fruit freshness, spoilage, and adulteration</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white" alt="Python 3.11" />
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TensorFlow-Keras-FF6F00?logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-6366F1?logo=yolo&logoColor=white" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
</p>

---

## 👥 Team

| Name | Role |
|------|------|
| **Bashdar Rzgar** | Developer |
| **Nairiti Dutta** | Developer |
| **Manashita Baruah** | Developer |
| **Diksha Borah** | Developer |

---

## 📖 Overview

**CipherCrew** is a full-stack computer vision application that evaluates the condition of fruits from uploaded photographs. Users submit an image through a modern web interface, and the system returns an instant quality assessment — classifying each detected fruit as **Good** (fresh), **Bad** (rotten), or **Unknown** (potentially adulterated).

Under the hood, the platform pairs **YOLOv8** object detection with a **MobileNetV2-based Keras classifier**. YOLO first localises individual fruits within the frame (apples, bananas, oranges), and each isolated crop is then fed into the classifier for condition grading. When no recognisable fruit bounding box is found, the entire image is analysed as a fallback — ensuring every upload receives a result.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🖼️ **Image Upload & Drag-and-Drop** | Upload single or multiple fruit images at once via file picker or drag-and-drop |
| 📷 **Live Camera Capture** | Snap a photo directly from your device camera without leaving the app |
| 📊 **Batch Processing Queue** | Sequentially analyses a queue of uploaded images with a live progress bar |
| 🔍 **Per-Fruit Detection** | When multiple fruits appear in one photo, each is individually cropped and classified |
| 🎯 **Confidence Scores & Probabilities** | Every prediction includes a confidence percentage and full per-class probability breakdown |
| 🔥 **Grad-CAM Explainability** | Optional heatmap overlays that highlight which image regions most influenced the prediction |
| 🏷️ **Manual Label Override** | Reviewers can manually correct or override any automated prediction |
| ❌ **Reject & Restore** | Mark false or uncertain results as rejected, and restore them later if needed |
| 🗄️ **Persistent History (SQLite)** | Every detection is automatically saved to a local SQLite database for future reference |
| 📜 **History Browser** | Browse, search, filter, and reload past detections from the built-in history modal |
| 🌗 **Dark / Light Mode** | Full theme support with smooth transitions between light and dark interfaces |
| 📱 **Responsive Design** | Optimised layout for desktops, tablets, and mobile devices |

---

## 🏗️ Architecture

```text
├── frontend/              Next.js 14 web application (upload UI, batch table, camera, history)
│   └── src/
│       ├── app/           Pages: Home, About
│       └── components/    DetectionInterface, BatchTable, HistoryModal, CameraModal, etc.
│
├── fruit-web/             FastAPI backend (inference service + SQLite persistence)
│   ├── main.py            YOLO detection → Keras classification → annotation pipeline
│   ├── database.py        SQLite helper for detection history storage
│   ├── models/            Bundled Keras classifier weights
│   └── yolov8n.pt         YOLOv8 nano detector weights
│
├── scripts/               Deployment validation & smoke-test utilities
├── run_project.bat        One-click launcher (starts both services + opens browser)
├── run_backend.bat        Standalone backend launcher
└── run_frontend.bat       Standalone frontend launcher
```

---

## 🔬 How the Model Pipeline Works

1. The user uploads an image through the web UI (or captures one via the live camera).
2. **YOLOv8** scans the image for known fruit classes (apple, banana, orange) and produces localisation bounding boxes.
3. Each detected fruit crop is resized to `224×224` pixels and passed into the **MobileNetV2 classifier**.
4. If YOLO does not detect any configured fruit, the full image is still classified as a fallback.
5. The API returns an **annotated image** (with bounding boxes and labels), **confidence scores**, **class probabilities**, and optionally a **Grad-CAM heatmap** highlighting the regions that influenced the prediction.
6. The result is automatically persisted in a **local SQLite database** for history tracking.

### Classification Labels

| Internal Class | Display Label | Meaning |
|---|---|---|
| `fresh` | **Good** | The fruit appears fresh and in healthy condition |
| `rotten` | **Bad** | The fruit shows signs of spoilage or decay |
| `adulterated` | **Unknown** | The fruit exhibits visual patterns associated with adulteration |

---

## 🚀 Quick Start

### One-Click Launcher (Windows)

The fastest way to get up and running — simply double-click:

> **`run_project.bat`**

This automatically starts the backend, launches the frontend, and opens `http://localhost:3000` in your default browser.

You can also start the services individually with `run_backend.bat` and `run_frontend.bat`.

> For detailed setup instructions and troubleshooting, refer to [HOW_TO_RUN.md](HOW_TO_RUN.md).

---

### Manual Setup

#### Backend (Python 3.11)

> **Important:** TensorFlow 2.16–2.21 requires Python ≤ 3.12. Python 3.11 is recommended.

**Windows (PowerShell):**
```powershell
cd fruit-web
py -3.11 -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

**Linux / macOS:**
```bash
cd fruit-web
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 0.0.0.0 --port 8000
```

Verify the backend is running:
```bash
curl http://127.0.0.1:8000/health
```

#### Frontend (Next.js 14)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

### Backend (`fruit-web/.env`)

| Variable | Default | Description |
|---|---|---|
| `YOLO_MODEL` | `yolov8n.pt` | Path to the YOLOv8 weights file |
| `CLASSIFIER_MODEL` | `models/fruit_adulteration_final.keras` | Path to the Keras classifier model |
| `FRUIT_DETECTOR_CLASSES` | `apple,banana,orange` | Comma-separated COCO fruit classes YOLO should detect |
| `CLASSIFIER_PREPROCESSING` | `tf` | Preprocessing mode (`tf`, `mobilenet`, `imagenet`, or `auto`) |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000/detect` | Backend detection endpoint URL |

---

## 📡 API Reference

### `GET /health`

Returns the service status, loaded model paths, and active preprocessing configuration.

### `POST /detect`

Analyse a fruit image. Accepts multipart form data.

```bash
curl -X POST \
  "http://127.0.0.1:8000/detect?return_gradcam=true" \
  -F "file=@/path/to/fruit.jpg"
```

**Response fields:**

| Field | Description |
|---|---|
| `annotated_image` | Base64-encoded JPEG with bounding boxes and labels drawn |
| `overall` | Image-level prediction (class, label, confidence, probabilities) |
| `detections` | Array of per-crop detection objects |
| `summary` | Count of `fresh`, `rotten`, and `adulterated` detections |
| `used_fallback` | `true` when YOLO found no fruit and the full image was classified |
| `db_id` | SQLite record ID for this detection |

### `GET /history`

Retrieve paginated detection history with optional filters (`label`, `fruit`, `search`).

### `GET /history/stats`

Aggregate statistics across all stored detections.

### `PATCH /history/{id}`

Update manual label overrides or rejection status for a specific record.

### `DELETE /history/{id}` / `DELETE /history`

Delete a specific record or clear the entire detection history.

---

## 🧪 Smoke Test

After starting the backend, verify the full pipeline end-to-end:

```bash
python scripts/smoke_test.py \
  --base-url http://127.0.0.1:8000 \
  --image dataset_split/test/fresh/apple_fresh_green_apple_on_white_0_000026.jpg \
  --output smoke-output.jpg
```

This checks the `/health` endpoint, uploads a test image to `/detect`, prints the prediction summary, and saves the annotated result.

---

## 🌐 Deployment

### Backend → Render

Use the provided `render.yaml` blueprint, or manually create a Render Web Service:

- **Root directory:** `fruit-web`
- **Environment:** Docker
- **Health check path:** `/health`
- **Environment variables:** `YOLO_MODEL`, `CLASSIFIER_MODEL`, `FRUIT_DETECTOR_CLASSES`, `CLASSIFIER_PREPROCESSING`

### Frontend → Vercel

Create a Vercel project with `frontend/` as the root directory and set:

```
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/detect
```

---

## 📁 Repository Hygiene

Local secrets, virtual environments, logs, training datasets, notebooks, and generated outputs are excluded from version control via `.gitignore`. The only model artifacts tracked in the repository are:

- `fruit-web/models/fruit_adulteration_final.keras`
- `fruit-web/yolov8n.pt`

---

## ⚠️ Limitations

- This is a **visual classifier**, not a laboratory food-safety test. The `Unknown` (Adulterant) class reflects visual patterns learned from the training data and should be used as a preliminary screening signal, not a chemical confirmation.
- Confidence values are model scores, not calibrated probabilities.
- Out-of-domain fruits, poor lighting, occlusion, blur, or heavily edited images may reduce prediction reliability.

---

## 📄 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by <b>Bashdar Rzgar</b>, <b>Nairiti Dutta</b>, <b>Manashita Baruah</b>, and <b>Diksha Borah</b>
</p>
