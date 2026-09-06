# CipherCrew - Complete Run & Setup Guide

This guide provides step-by-step instructions on how to install, configure, and run the **CipherCrew** (Fruit Quality & Unknown Data Detector) project on Windows (as well as Linux / macOS).

---

## Architecture Overview

The system consists of two main services:
1. **Backend (`fruit-web/`)**: FastAPI server using **YOLOv8** (for fruit bounding box detection) and **TensorFlow / Keras MobileNetV2** (to classify fruit condition as **Fresh**, **Rotten**, or **Adulterant**). Runs on `http://127.0.0.1:8000`.
2. **Frontend (`frontend/`)**: Modern Next.js 14 web application providing a drag-and-drop interface for uploading fruit images and viewing annotated detection boxes, confidence ratings, and condition analysis. Runs on `http://localhost:3000`.

---

## Quick Start (Already Configured on This Machine)

Since the environment and dependencies have already been fully installed for you, you can run both services immediately using either of the methods below:

### Option A: The One-Click Launcher (`run_project.bat`) — **RECOMMENDED**

Simply double-click:
👉 **[`run_project.bat`](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Github_Project/run_project.bat)**

It will automatically:
1. Launch the **Backend** (FastAPI) in its own terminal window.
2. Launch the **Frontend** (Next.js) in its own terminal window.
3. Automatically launch your default web browser and navigate directly to **[http://localhost:3000](http://localhost:3000)**!
4. When you are done, simply close the command windows to stop the servers.

---

### Option B: Manual Command Line Execution

#### Terminal 1 — Backend (FastAPI):
```powershell
cd c:\Users\dutta\OneDrive\Documents\Tezhack\Github_Project\fruit-web
.\venv\Scripts\activate
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
- Test backend health: Visit [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) or [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) (Swagger UI).

#### Terminal 2 — Frontend (Next.js):
```powershell
cd c:\Users\dutta\OneDrive\Documents\Tezhack\Github_Project\frontend
npm run dev
```
- Access the web interface at: [http://localhost:3000](http://localhost:3000).

---

## Fresh Setup from Scratch (For Any Machine)

If you ever need to set this project up on a new computer or clean environment, follow these steps:

### 1. Prerequisites
- **Git**
- **Node.js** (v18 or v20+) and **npm**
- **Python 3.11** *(Important: TensorFlow 2.16 - 2.21 requires Python <= 3.12, Python 3.11.9 is strongly recommended)*
  - On Windows: `winget install --id Python.Python.3.11 --exact`

### 2. Clone the Repository
```bash
git clone https://github.com/VishStack01/fruit-quality-detector.git
cd fruit-quality-detector
```

### 3. Backend Setup (`fruit-web/`)
1. Navigate to the backend folder:
   ```bash
   cd fruit-web
   ```
2. Create a virtual environment using Python 3.11:
   - **Windows**:
     ```powershell
     py -3.11 -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3.11 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Create `.env` file (copied from `.env.example`):
   ```env
   YOLO_MODEL=yolov8n.pt
   CLASSIFIER_MODEL=models/fruit_adulteration_final.keras
   FRUIT_DETECTOR_CLASSES=apple,banana,orange
   CLASSIFIER_PREPROCESSING=tf
   ```
5. Start the backend:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

### 4. Frontend Setup (`frontend/`)
1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` file (copied from `.env.example`):
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/detect
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Verifies service status, loaded model files, and preprocessing config. |
| `POST` | `/detect` | Accepts multipart form data with image file (`file=@fruit.jpg`). Returns bounding boxes, classification scores, and annotated base64 image. |
| `GET` | `/docs` | Interactive Swagger API documentation for testing endpoints directly. |

---

## Troubleshooting

- **TensorFlow wheel error on Python 3.14**: TensorFlow does not currently support Python 3.14. Always ensure you use Python 3.11 (`py -3.11`).
- **Port 8000 or 3000 already in use**:
  - Check active processes or specify alternate ports:
    - Backend: `uvicorn main:app --host 127.0.0.1 --port 8001`
    - Update `frontend/.env.local` to point to the new port, then restart frontend.
