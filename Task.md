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
    - [x] `/history` — paginated retrieval with filters (label, fruit, search)
    - [x] `/history/stats` — aggregate statistics
    - [x] `PATCH /history/{id}` — update manual label overrides / rejection status
    - [x] `DELETE /history/{id}` and `DELETE /history` — delete records

12. [ ] **Image Rejection / Validation Endpoint** _(🚫 Problem Statement: "Rejected Image Handling")_
    - [x] Fallback mechanism when YOLO detects no fruit (classify full image)
    - [ ] Explicit out-of-distribution detection (reject non-produce images with a clear message)
    - [ ] Return rejection reason in API response

---

### 4. 🌐 Website / Interface (Next.js Frontend)

13. [x] **Responsive Design & Layout**
    - [x] Build UI using Next.js 14 framework
    - [x] Fully responsive layout across desktop, tablet, and mobile screens
    - [x] Dark / Light mode with smooth transitions

14. [x] **Image Upload System** _(📤 Problem Statement: "Produce Image Upload")_
    - [x] Single produce-image upload via file picker
    - [x] Drag-and-drop upload support
    - [x] Multi-image upload support

15. [x] **Live Camera Capture**
    - [x] Snap a photo directly from device camera without leaving the app

16. [ ] **Sample / Reference Image Gallery**
    - [ ] Display reference / example fruit images across categories:
      - Fresh (Good)
      - Rotten (Damaged)
      - Adulterant (Acceptable)
    - [ ] Allow one-click testing / loading sample images into inference

17. [x] **Prediction & Quality Assessment Display** _(🏷️📊 Problem Statement: "Quality Category + Confidence Score")_
    - [x] Display visible quality category/grade
    - [x] Display model confidence score
    - [x] Display per-class probability breakdown
    - [ ] Display short text **description/explanation** of prediction _(Problem Statement: "predicted grade + confidence + description")_

18. [x] **Rejection & Validation Handling** _(🚫 Problem Statement: "Rejected Image Handling")_
    - [x] Mark results as rejected and restore them later
    - [x] Clear user feedback for rejected images in batch table
    - [ ] Display clear rejection reason when an image is not produce

19. [x] **Manual Correction (Human-in-the-loop)** _(✏️ Problem Statement: "Manual Correction")_
    - [x] Allow manual override/correction of predicted quality category
    - [x] Persist corrections via `PATCH /history/{id}`

20. [x] **Batch Processing & Result Summary** _(📦 Problem Statement: "Batch / Result Summary")_
    - [x] Batch processing queue with live progress bar
    - [x] Batch table showing all results with status, labels, confidence
    - [x] Summary counts of each category (fresh/rotten/adulterated)

21. [x] **Export & Reporting**
    - [x] Download prediction results in CSV format
    - [x] Download prediction results in JSON format
    - [x] Download prediction results in PDF format
    - [x] Export includes: Image ID, predicted class, confidence, timestamp, manual correction metadata

22. [x] **History Browser**
    - [x] Browse, search, filter, and reload past detections from history modal

---

### 5. ⚠️ Disclaimers & Compliance

23. [ ] **Visual-Only Assessment Disclaimer** _(Problem Statement: "System judges visible appearance ONLY")_
    - [ ] Add persistent disclaimer banner/notice in UI stating:
      - Cannot certify internal freshness
      - Cannot certify taste
      - Cannot certify chemical safety
      - Cannot certify fitness for consumption
    - [ ] Include disclaimer in exported reports

---

### 6. 📝 Documentation & Presentation

24. [x] **README / Project Documentation**
    - [x] Project overview, architecture diagram, API reference
    - [x] Setup instructions (manual + one-click launcher)
    - [x] Environment variables documentation
    - [x] Deployment guide (Render + Vercel)

25. [x] **Model Card**
    - [x] Intended use, inputs, outputs, pipeline, known limitations

26. [ ] **Preprocessing Documentation** _(Problem Statement: "Explain the image preparation steps")_
    - [ ] Document the image preparation steps in a clear, presentable format
    - [ ] Include info on: resize strategy, normalization mode, EXIF handling, crop padding

27. [ ] **Final Presentation / Demo Preparation**
    - [ ] Prepare demo walkthrough script
    - [ ] Ensure example images are ready for live demo
    - [ ] Test end-to-end pipeline with sample produce images

---

### 7. 🚀 Deployment & Testing

28. [ ] **Local End-to-End Testing**
    - [ ] Run smoke test (`scripts/smoke_test.py`)
    - [ ] Test all MVP features manually (upload → grade → confidence → reject → correct → export)

29. [ ] **Deployment**
    - [ ] Deploy backend to Render (or chosen platform)
    - [ ] Deploy frontend to Vercel (or chosen platform)
    - [ ] Verify deployed app works end-to-end

---

## 📊 Progress Summary

| Category | Done | Remaining |
|---|---|---|
| Dataset & Research | 3/3 | 0 |
| ML Model | 2/4 | 2 (metrics reporting, label remapping) |
| Backend / API | 4/5 | 1 (explicit image rejection) |
| Frontend / Interface | 8/10 | 2 (sample gallery, description text) |
| Disclaimers | 0/1 | 1 |
| Documentation | 2/4 | 2 (preprocessing docs, demo prep) |
| Deployment & Testing | 0/2 | 2 |
| **Total** | **19/29** | **10** |
