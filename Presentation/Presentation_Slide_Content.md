# 🍎 CipherCrew — Presentation Slide Deck Content
**TezHack Hackathon | Problem Statement: ML03 (Produce Quality Grading)**  
**Team ID:** 65 | **Team Name:** CipherCrew  

> This document provides clean, concise, slide-fitted text for all 5 slides of `CipherCrew.pdf`. All placeholders (`[...]`) have been completed with verified data and metrics from the project codebase.

---

## 🖥️ Slide 1: Title Slide

### **Header / Title**
> **Produce Quality Grading**

### **Subtitle / Project Hook** *(Replaces `[One clear sentence explaining what your project does]`)*
> **An end-to-end AI computer vision system that automates fruit detection, quality grading, and freshness assessment in real time.**

### **Team Information Box**
- **TEAM NAME:** CipherCrew
- **TEAM ID:** 65
- **TEAM MEMBERS:** Bashdar Rzgar, Diksha Borah, Manashita Baruah, Nairiti Dutta
- **PS ID:** ML03

---

## 🖥️ Slide 2: The Problem Affects Real People

### **Left Card: WHO FACES IT?**
- **Target Users:** Fruit sellers & vendors, produce distributors, warehouse & packhouse workers.
- **Operational Reality:** During high-volume sorting at farms and collection hubs, manual grading is slow, subjective, and physically taxing.
- **Key Example:** Agricultural wholesale markets & distribution sorting lines handling thousands of fruit crates daily.

### **Right Card: WHY DOES IT MATTER?**
- **Current Difficulties:**
  - Manual inspection creates severe bottlenecks during peak harvest.
  - Human quality criteria varies across individual sorters.
  - Hidden blemishes and early spoilage are easily missed.
- **Cost, Delay & Risk:**
  - High labor expenditure and dispatch delays.
  - A single decaying fruit can cross-contaminate entire shipping crates.
  - Rejection disputes between growers, wholesalers, and retailers.
- **Our Solution:**
  - Fast, objective, and standardized AI quality assessment at the point of sorting.

---

## 🖥️ Slide 3: Solution to the Problem

### **Left Card: SOLUTION FOR THE PROBLEM**
- **Core Concept:**
  - An intelligent dual-stage vision platform that detects fruit and classifies condition into **Good**, **Bad**, or **Unknown** grades with instant confidence scores.
- **Pipeline Workflow:**
  $$\text{Image / Live Camera} \rightarrow \text{YOLOv8 Detection} \rightarrow \text{MobileNetV2 Grading} \rightarrow \text{Confidence + Grad-CAM Explainability}$$

### **Right Card: FEATURES ADDED**
- **Core MVP Features:**
  - 📤 **Produce Image Upload:** Single & multi-image drag-and-drop.
  - 🏷️ **Visible Quality Category:** Standardized Good / Bad / Unknown grading.
  - 📊 **Confidence Score:** Real-time percentage & probability breakdown.
  - 🚫 **Image Rejection:** Fallback detection & non-produce screening.
  - ✏️ **Manual Correction:** Human-in-the-loop override with persistent SQLite update.
  - 📥 **Downloadable Reports:** Instant export in **CSV**, **JSON**, and **PDF** formats.
- **Value-Added Enhancements:**
  - 📷 **Live Webcam Capture:** Direct browser camera capture.
  - 🔍 **Grad-CAM Heatmaps:** Visual explainability of defect areas.
  - 📜 **Audit History Browser:** Searchable SQLite inspection log.

---

## 🖥️ Slide 4: Technical Implementations

### **Left Card: DATASET & MODEL** *(All Placeholders Filled)*

- **Dataset:**
  - **AFruitDB** (Mendeley Data / PMC11889572) — 3,167 total images across 6 fruits (*Apple, Banana, Burmese Grape, Mango, Papaya, Tomato*); 634 test samples in an 80/20 train/test split.
- **Preprocessing:**
  - EXIF auto-orientation, YOLO crop extraction, 224×224 px resizing, MobileNetV2 normalization ($[-1, 1]$ scaling), and data augmentation (rotations, flips, zoom).
- **Model:**
  - **MobileNetV2** (Transfer Learning with pre-trained ImageNet weights) paired with **YOLOv8n** detector. Chosen for high feature efficiency, low parameter count, and edge-friendly inference speed.
- **Evaluation:**
  - **87.0% Test Accuracy** (vs. 78.0% Custom CNN baseline)
  - **0.88 Precision** | **0.87 Recall** | **0.87 F1-Score** (Weighted Avg) across 634 test images.
- **Limitation:**
  - Subtle early-stage decay (`Medium` grade) exhibits natural visual overlap with cosmetic skin blemishes; severe rot classes require larger real-world sample diversity.

---

### **Right Card: CHALLENGE CARD** *(Placeholder Filled)*

#### **ML-C05: Prediction CSV**
- **Implemented:** Client-side CSV export logging fruit detection, quality grades, confidence scores, and manual overrides.
- **Where It Appears:** One-click download in both the **Batch Inspection Queue** and **Audit History Modal**.

---

## 🖥️ Slide 5: What Works Today, and What Comes Next

### **Left Card: VALUE**
- **Main Benefit:** Replaces slow manual sorting with automated sub-second grading, reducing labor overhead and human error.
- **Who Can Use It:** Wholesale mandis, packhouse managers, grocery retailers, and agricultural quality inspectors.
- **Measurable Result:** Instant grading with **87% accuracy**, confidence percentage, and visual Grad-CAM heatmap proof for every scan.

---

### **Right Card: LIMITATIONS** *(All Placeholders Filled)*

- **Current Technical Limits:**
  - Calibrated for 6 primary fruit categories.
  - Single-angle photography cannot view occluded backside surfaces.
  - Surface-level camera cannot inspect internal tissue rot.
- **Data, Privacy & Reliability Limits:** *(Replaces placeholder)*
  - **Visual-Only Boundary:** Assesses exterior appearance only; cannot certify internal sweetness (Brix), taste, or chemical safety.
  - **Environmental Sensitivity:** Uneven warehouse lighting or extreme glare can affect model confidence.
  - **Privacy First:** Client-side preview with local SQLite persistence ensures sensitive inventory data remains on-premise.
- **What Is Not Yet Included (Next Steps):**
  - Multi-view 360° image stitching for full-surface fruit coverage.
  - Near-Infrared (NIR) sensor integration for non-destructive sweetness & internal rot detection.
  - Automated sorting conveyor hardware integration.
