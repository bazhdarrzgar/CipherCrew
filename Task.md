## Task for TezHack — Produce Quality Grading (48-Hour MVP)

> Derived from [Problem_Statement.md](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Model Selection/Problem_Statement.md)

---

### 1. 🗄️ Dataset & Research

1. [x] Search for public labelled dataset (Analyzed 4 candidate datasets; FruitQ Dataset recommended -> see [Produce_Quality_Datasets_Comparison.md](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Dataset collection/Research/Produce_Quality_Datasets_Comparison.md))

2. [x] Search for GitHub repository near our project (see [Related_Repositories_Evaluation.md](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Model Selection/Related_Repositories_Evaluation.md) & [Selected_Repositories.md](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Model Selection/Selected_Repositories.md))

3. [x] Web Application & Model Pipeline (Developed and built by Bashdar Rzgar, Nairiti Dutta, Manashita Baruah, Diksha Borah -> see [Website Building/](file:///c:/Users/dutta/OneDrive/Documents/Tezhack/Website Building))

---

### 2. 🤖 ML Model (Preprocessing, Training & Evaluation)

4. [x] **Image Preprocessing Pipeline**
   - [x] Resize images to 224×224 for MobileNetV2 input
   - [x] Apply preprocessing mode (tf / mobilenet / imagenet normalization)
   - [x] Handle HEIF/HEIC image format conversion
   - [x] Auto-orient images using EXIF data

5. [x] **Model Architecture & Training**
   - [x] YOLOv8 object detection for fruit localization (apple, banana, orange)
   - [x] MobileNetV2-based Keras classifier for quality grading
   - [x] Trained model weights available (`fruit_adulteration_final.keras` + `yolov8n.pt`)

6. [ ] **Model Evaluation & Performance Metrics** _(📈 Problem Statement: "Report metrics")_
   - [ ] Report accuracy, precision, recall, F1-score on test set
   - [ ] Generate confusion matrix
   - [ ] Document per-class performance (Good / Acceptable / Damaged)
   - [ ] Include evaluation results in README or a dedicated report page

7. [ ] **Remap Labels to Problem Statement Categories** _(🏷️ Problem Statement: "Good, Acceptable, Damaged")_
   - [ ] Map current `Fresh → Good`, `Rotten → Damaged`, `Adulterated → Acceptable` (or retrain)
   - [ ] Update display labels in backend (`DISPLAY_NAMES` in `main.py`)
   - [ ] Update display labels in frontend components

---

### 3. 🖥️ Backend / API (FastAPI)

8. [x] **FastAPI Backend Setup**
   - [x] `/detect` endpoint — YOLO detection → Keras classification → annotation pipeline
   - [x] `/health` endpoint — service status, model paths, preprocessing config
   - [x] CORS middleware configured

9. [x] **Detection Pipeline**
   - [x] YOLOv8 scans image for fruit classes → produces bounding boxes
   - [x] Each crop resized to 224×224 → passed to MobileNetV2 classifier
   - [x] Fallback: classify full image when YOLO detects no fruit
   - [x] Return annotated image (bounding boxes + labels), confidence scores, class probabilities

10. [x] **Grad-CAM Explainability**
    - [x] Optional heatmap overlays highlighting which regions influenced prediction

11. [x] **Persistent History (SQLite)**
    - [x] Every detection auto-saved to local SQLite database

<!-- Work in Progress -->
