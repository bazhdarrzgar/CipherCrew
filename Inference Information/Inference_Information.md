# ⚡ Produce Quality Grading — Inference & Evaluation Information

## 📌 Overview
This folder contains scripts and documentation for running inference and testing the produce quality grading system developed by **Bashdar Rzgar, Nairiti Dutta, Manashita Baruah, and Diksha Borah**.

---

## 🛠️ Files in this Directory

| File | Type | Description |
|---|---|---|
| `API_Inference_Test.py` | Python Script | Sends a sample apple image from the dataset via multipart HTTP POST request to test API prediction response. |
| `Run_Fruit_Quality_Detector.bat` | Batch Script | Launches the full project (FastAPI backend + Next.js web interface in `..\Website Building`). |

---

## 🔄 Inference Pipeline Summary

```
Input Image (Photo)
        │
        ▼
YOLOv8 Detection (Localizes fruit: Apple, Banana, Orange)
        │
        ├─ Crop detected fruit (224×224) ──► MobileNetV2 Classifier
        │
        └─ (Fallback if no fruit detected) ──► Classify full image
        │
        ▼
Quality Category Prediction:
• Good (Fresh)
• Acceptable (Adulterant / Mild)
• Damaged (Rotten)
+ Confidence Score & Probabilities
```

---

## 🚀 Running the Web Application & Inference

To start the full web platform locally:
1. Double click `Run_Fruit_Quality_Detector.bat` or run:
   ```bash
   cd "..\Website Building"
   .\run_project.bat
   ```
2. The FastAPI backend will be available at: `http://localhost:8000` (docs at `http://localhost:8000/docs`)
3. The Next.js web application will be available at: `http://localhost:3000`
