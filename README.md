<p align="center">
  <img src="Website%20Building/frontend/public/black-theme-logo-transparent.png" alt="CipherCrew Logo" width="160" />
</p>

<h1 align="center">🍎 CipherCrew — AI Produce Quality Grading System</h1>

<p align="center">
  <b>An end-to-end computer vision platform for automated fruit detection, quality grading, and freshness assessment.</b>
  <br />
  <i>Developed for the TezHack 48-Hour Hackathon Challenge.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11+" />
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 14" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/TensorFlow-2.x-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/YOLOv8-Ultralytics-111111?style=for-the-badge&logo=yolo&logoColor=white" alt="YOLOv8" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge" alt="MIT License" />
</p>

---

## 👥 The CipherCrew Team & Contributions

| Member | Role | Primary Contributions |
| :--- | :--- | :--- |
| **Bashdar Rzgar** | **Team Leader & Backend Architect** | FastAPI backend setup, YOLOv8 + MobileNetV2 inference pipeline, Grad-CAM activation generator, SQLite persistence & endpoints, Docker/Render configs, smoke testing, and system orchestration. |
| **Nairiti Dutta** | **Frontend Core & UI/UX Design** | Next.js 14 layout, Tailwind design system, dark/light theme context, custom typography, brand assets, Hero banner, InfoSections, and About Us page. |
| **Diksha Borah** | **Interactive UI & Detection Features** | Drag-and-drop file upload, live webcam capture modal, batch inference processing table, quality grade visualizer, history modal browser, and export utilities (CSV/JSON). |
| **Manashita Baruah** | **ML Research, Training & Evaluation** | Dataset benchmarking (FruitQ study), problem statement mapping, Custom CNN baseline exploration, MobileNetV2 transfer learning, evaluation metrics, confusion matrices, and standalone API testing scripts. |

---

## 📖 Executive Summary

Produce sorting in agricultural supply chains is traditionally labor-intensive, error-prone, and slow. **CipherCrew** delivers an automated, high-precision computer vision pipeline that evaluates fruit condition from photographic input in real time.

The system combines:
1. **YOLOv8 Object Detection**: Scans the input image to identify and localize fruits (Apples, Bananas, Oranges), producing tight bounding boxes.
2. **MobileNetV2 Classifier**: Crops each localized fruit, resizes it to $224 \times 224$ px, and performs condition classification into **Good** (fresh / prime), **Bad** (decayed / damaged), or **Unknown** (medium / ambiguous quality).
3. **Fallback Inference**: If no bounding box is detected, the full image is classified to ensure every user upload receives an assessment.
4. **Grad-CAM Explainability**: Visualizes class activation heatmaps so users can inspect *why* the model made a specific prediction.
5. **Interactive Full-Stack Platform**: A Next.js 14 web client connected to a high-throughput FastAPI backend with SQLite history tracking.

---

## 🔬 Model Architecture & Pipeline Workflow

```
[ User Input Image / Live Camera ]
                 │
                 ▼
       ┌──────────────────┐
       │   EXIF Auto-     │  Auto-orient & convert formats (HEIC, WebP, PNG, JPEG)
       │   Orientation    │
       └─────────┬────────┘
                 │
                 ▼
       ┌──────────────────┐
       │  YOLOv8 Detector │  Scans image for fruit classes (apple, banana, orange)
       └─────────┬────────┘
                 │
         Fruit Detected?
         ├── YES ──► Extract individual crops ──┐
         │                                       │
         └── NO  ──► Use full input image  ──────┤
                                                 ▼
                                     ┌─────────────────────────┐
                                     │  MobileNetV2 Classifier │
                                     │  (224×224 Normalization)│
                                     └───────────┬─────────────┘
                                                 │
                                                 ▼
                                      ┌─────────────────────────┐
                                      │  Quality Assessment:    │
                                      │  • Good (Fresh)         │
                                      │  • Bad (Damaged)        │
                                      │  • Unknown (Medium)     │
                                      └───────────┬─────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        ▼                                                 ▼
            ┌───────────────────────┐                         ┌───────────────────────┐
            │ Grad-CAM Heatmap Gen  │                         │ SQLite History Logger │
            └───────────┬───────────┘                         └───────────┬───────────┘
                        │                                                 │
                        └────────────────────────┬────────────────────────┘
                                                 ▼
                                   [ Frontend UI Presentation ]
```

---

## 📊 Model Evaluation & Benchmark Comparison

Two model architectures were investigated, trained, and benchmarked on the produce quality dataset ($N = 634$ test samples across 6 produce categories):
1. **Custom CNN Baseline** (trained from scratch)
2. **MobileNetV2 Transfer Learning** (primary production classifier)

### 🏷️ Standardized Quality Grade Labels

The system categorizes produce into three clear quality condition labels:

| Evaluation Label | Standardized Grade | Status Indicator | Description & Recommended Action |
| :--- | :--- | :---: | :--- |
| `good` | **Good** | 🟢 Green | Fresh, firm, and commercially viable produce. Approved for distribution. |
| `bad` | **Bad** | 🔴 Red | Severe rot, mold, fungal decay, or tissue degradation. Rejected / discard. |
| `unknown` *(medium)* | **Unknown** | 🟡 Yellow | Borderline freshness, minor cosmetic blemishes, or ambiguous condition. Flagged for manual review. |

---

### 🏆 Overall Architecture Benchmark

| Evaluation Metric | Baseline Custom CNN | MobileNetV2 (Production Model) | Improvement |
| :--- | :---: | :---: | :---: |
| **Test Accuracy** | **78.0%** (0.78) | **87.0%** (0.87) | **+9.0%** |
| **Weighted Precision** | 0.78 | **0.88** | **+0.10** |
| **Weighted Recall** | 0.78 | **0.87** | **+0.09** |
| **Weighted F1-Score** | 0.77 | **0.87** | **+0.10** |
| **Macro Avg Precision** | 0.75 | **0.83** | **+0.08** |
| **Macro Avg Recall** | 0.74 | **0.82** | **+0.08** |
| **Macro Avg F1-Score** | 0.74 | **0.82** | **+0.08** |
| **Test Samples ($N$)** | 634 | 634 | — |
| **Architecture** | 4-layer Conv2D + Dense | Inverted Residuals + ImageNet Weights | Mobile & edge optimized |

---

### 📋 Detailed Class-Level Evaluation Results (MobileNetV2 — Production Model)

Evaluated across all produce classes and standardized quality grades (`Good`, `Bad`, `Unknown`):

| Produce | Quality Grade Label | Precision | Recall | F1-Score | Test Support |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 🍎 **Apple** | 🟢 **Good** | 0.77 | **1.00** | 0.87 | 40 |
| 🍎 **Apple** | 🔴 **Bad** | 0.95 | 0.95 | 0.95 | 22 |
| 🍎 **Apple** | 🟡 **Unknown** | **0.96** | 0.66 | 0.78 | 35 |
| 🍌 **Banana** | 🟢 **Good** | 0.90 | 0.90 | 0.90 | 49 |
| 🍌 **Banana** | 🔴 **Bad** | 0.00* | 0.00* | 0.00* | 0* |
| 🍌 **Banana** | 🟡 **Unknown** | 0.90 | 0.90 | 0.90 | 48 |
| 🍇 **Burmese Grape** | 🟢 **Good** | 0.93 | 0.87 | 0.90 | 62 |
| 🍇 **Burmese Grape** | 🔴 **Bad** | 0.97 | 0.88 | 0.92 | 33 |
| 🍇 **Burmese Grape** | 🟡 **Unknown** | 0.69 | 0.84 | 0.76 | 32 |
| 🥭 **Mango** | 🟢 **Good** | 0.90 | 0.88 | 0.89 | 50 |
| 🥭 **Mango** | 🔴 **Bad** | **1.00** | 0.87 | 0.93 | 23 |
| 🥭 **Mango** | 🟡 **Unknown** | 0.82 | 0.92 | 0.87 | 50 |
| 🍈 **Papaya** | 🟢 **Good** | 0.81 | 0.97 | 0.88 | 30 |
| 🍈 **Papaya** | 🔴 **Bad** | **1.00** | **1.00** | **1.00** | 31 |
| 🍈 **Papaya** | 🟡 **Unknown** | 0.95 | 0.69 | 0.80 | 29 |
| 🍅 **Tomato** | 🟢 **Good** | 0.86 | 0.83 | 0.84 | 29 |
| 🍅 **Tomato** | 🔴 **Bad** | 0.76 | 0.88 | 0.81 | 25 |
| 🍅 **Tomato** | 🟡 **Unknown** | 0.86 | 0.78 | 0.82 | 46 |
| **Summary** | **Overall Accuracy** | — | — | **0.87 (87%)** | **634** |
| **Summary** | **Macro Average** | **0.83** | **0.82** | **0.82** | **634** |
| **Summary** | **Weighted Average** | **0.88** | **0.87** | **0.87** | **634** |

*\*Note: `banana_bad` had 0 test instances in this evaluation split.*

---

### 📋 Baseline Model Class-Level Report (Custom CNN)

<details>
<summary><b>Click to expand Baseline Custom CNN Evaluation Report (Accuracy: 78.0%)</b></summary>

| Produce | Quality Grade Label | Precision | Recall | F1-Score | Test Support |
| :--- | :--- | :---: | :---: | :---: | :---: |
| 🍎 **Apple** | 🟢 **Good** | 0.74 | 0.93 | 0.82 | 40 |
| 🍎 **Apple** | 🔴 **Bad** | 0.91 | 0.95 | 0.93 | 22 |
| 🍎 **Apple** | 🟡 **Unknown** | 0.70 | 0.60 | 0.65 | 35 |
| 🍌 **Banana** | 🟢 **Good** | 0.58 | 0.67 | 0.62 | 49 |
| 🍌 **Banana** | 🔴 **Bad** | 0.00 | 0.00 | 0.00 | 0 |
| 🍌 **Banana** | 🟡 **Unknown** | 0.59 | 0.48 | 0.53 | 48 |
| 🍇 **Burmese Grape** | 🟢 **Good** | 0.74 | 0.94 | 0.83 | 62 |
| 🍇 **Burmese Grape** | 🔴 **Bad** | 0.84 | 0.97 | 0.90 | 33 |
| 🍇 **Burmese Grape** | 🟡 **Unknown** | 0.75 | 0.38 | 0.50 | 32 |
| 🥭 **Mango** | 🟢 **Good** | 0.80 | 0.86 | 0.83 | 50 |
| 🥭 **Mango** | 🔴 **Bad** | 0.91 | 0.87 | 0.89 | 23 |
| 🥭 **Mango** | 🟡 **Unknown** | 0.84 | 0.62 | 0.71 | 50 |
| 🍈 **Papaya** | 🟢 **Good** | 0.76 | 0.93 | 0.84 | 30 |
| 🍈 **Papaya** | 🔴 **Bad** | 0.94 | 0.94 | 0.94 | 31 |
| 🍈 **Papaya** | 🟡 **Unknown** | 0.86 | 0.62 | 0.72 | 29 |
| 🍅 **Tomato** | 🟢 **Good** | 0.74 | 1.00 | 0.85 | 29 |
| 🍅 **Tomato** | 🔴 **Bad** | 0.95 | 0.84 | 0.89 | 25 |
| 🍅 **Tomato** | 🟡 **Unknown** | 0.93 | 0.80 | 0.86 | 46 |
| **Summary** | **Overall Accuracy** | — | — | **0.78 (78%)** | **634** |
| **Summary** | **Macro Average** | **0.75** | **0.74** | **0.74** | **634** |
| **Summary** | **Weighted Average** | **0.78** | **0.78** | **0.77** | **634** |

</details>

---

### 📈 Evaluation Plots & Visualizations

#### 1. MobileNetV2 (Production Classifier — 87.0% Accuracy)

| Training & Validation Curves | Confusion Matrix Heatmap |
| :---: | :---: |
| <img src="Model%20Training/Evaluation_Results/MobileNetV2/Model_Accuracy_and_Validation.png" alt="MobileNetV2 Accuracy & Loss Curves" width="460" /> | <img src="Model%20Training/Evaluation_Results/MobileNetV2/Metric.png" alt="MobileNetV2 Confusion Matrix" width="460" /> |

#### 2. Custom CNN Baseline (78.0% Accuracy)

| Training & Validation Curves | Confusion Matrix Heatmap |
| :---: | :---: |
| <img src="Model%20Training/Evaluation_Results/Custom_CNN/Accuracy_and_Validation.png" alt="Custom CNN Accuracy & Loss Curves" width="460" /> | <img src="Model%20Training/Evaluation_Results/Custom_CNN/Metric.png" alt="Custom CNN Confusion Matrix" width="460" /> |

---

## 📁 Repository Structure

```text
.
├── Dataset collection/
│   └── Research/
│       ├── Fruit_Dataset_Overview.md            # Dataset sources and distribution notes
│       └── Produce_Quality_Datasets_Comparison.md # Comparative benchmark of fruit datasets
├── Model Selection/
│   ├── Problem_Statement.md                     # TezHack challenge problem requirements
│   ├── Related_Repositories_Evaluation.md       # Analysis of existing open-source approaches
│   └── Selected_Repositories.md                 # Architecture baselines and references
├── Model Training/
│   ├── Evaluation_Results/
│   │   ├── Custom_CNN/                          # Metrics, loss plots, info for Custom CNN
│   │   └── MobileNetV2/                         # Metrics, loss plots, info for MobileNetV2
│   └── Notebooks/
│       ├── Custom_CNN_Model.ipynb               # Baseline CNN training notebook
│       └── MobileNetV2_Model.ipynb              # MobileNetV2 transfer learning notebook
├── Inference Information/
│   ├── API_Inference_Test.py                    # Standalone verification script for /detect
│   ├── Inference_Information.md                 # API request/response specifications
│   └── Run_Fruit_Quality_Detector.bat           # Quick launcher for local inference testing
├── Website Building/
│   ├── frontend/                                # Next.js 14 web application
│   │   ├── src/app/                             # App Router (Home, About, layout)
│   │   ├── src/components/                      # UI components (Detection, Camera, BatchTable)
│   │   ├── public/                              # Brand logos, icons, and theme wallpapers
│   │   └── tailwind.config.ts                   # Tailwind configuration
│   ├── fruit-web/                               # FastAPI backend service
│   │   ├── main.py                              # Core inference engine & API endpoints
│   │   ├── database.py                          # SQLite persistent history layer
│   │   ├── models/fruit_adulteration_final.keras# Trained classifier weights
│   │   ├── yolov8n.pt                           # YOLOv8 nano detector weights
│   │   ├── Dockerfile                           # Backend container configuration
│   │   └── requirements.txt                     # Backend Python dependencies
│   ├── Fuite/                                   # Sample fruit images for testing
│   │   ├── Good_Fruite/                         # Fresh sample images
│   │   └── Bad_Fruite/                          # Damaged / spoiled sample images
│   ├── HOW_TO_RUN.md                            # Comprehensive run instructions
│   ├── MODEL_CARD.md                            # Detailed ML model specifications
│   ├── run_project.bat                          # One-click full stack launcher
│   ├── run_backend.bat                          # Standalone backend runner
│   └── run_frontend.bat                         # Standalone frontend runner
├── Task.md                                      # Project milestone checklist
└── .gitignore                                   # Large data & environment exclusion rules
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** and `npm`
- **Git**

### Option A: One-Click Windows Launcher
Double-click or execute from the terminal:
```bat
"Website Building\run_project.bat"
```
This automatically launches the FastAPI backend on `http://localhost:8000`, starts the Next.js frontend on `http://localhost:3000`, and opens your default browser.

---

### Option B: Manual Setup

#### 1. Backend Service (FastAPI)
```bash
cd "Website Building/fruit-web"

# Create virtual environment
python -m venv venv
venv\Scripts\activate      # On Windows
# source venv/bin/activate  # On Linux/macOS

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at `http://127.0.0.1:8000/docs`.

#### 2. Frontend Application (Next.js)
```bash
cd "Website Building/frontend"

# Install dependencies
npm install

# Start development server
npm run dev
```
Open `http://localhost:3000` in your web browser.

---

## 🔌 API Reference Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status, active models, and readiness check |
| `POST` | `/detect` | Multipart form image upload for fruit detection and grading |
| `GET` | `/history` | Paginated list of historical inspection records with search filters |
| `GET` | `/history/stats` | Aggregate summary statistics across all processed scans |
| `GET` | `/history/{id}` | Detailed inspection record by ID |
| `PATCH` | `/history/{id}` | Manual override for quality grade or rejection status |
| `DELETE`| `/history/{id}` | Delete a specific detection record |
| `DELETE`| `/history` | Clear entire inspection history |

---

## 🛡️ License

This project is licensed under the [MIT License](Website%20Building/LICENSE).
