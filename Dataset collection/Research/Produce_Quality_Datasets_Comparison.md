# 📊 Produce Quality Datasets Comparison

Comparative evaluation of candidate public datasets for the **Produce Quality Grading** hackathon challenge.

---

## 🏆 Quick Summary & Recommendation

| Dataset | Varieties | Total Images | Classes / Labels | Hackathon Tier Support (`Good` / `Acceptable` / `Damaged`) | Suitability Verdict |
|---|---|---|---|---|---|
| **[FruitQ Dataset](#1-fruitq-dataset-recommended)** ⭐ | 11 global | 9,421 (5,647 de-watermarked) | Fresh, Mild, Rotten | ✅ **Full 3-Tier Support** | **Optimal (Recommended)** |
| **[FruitNet Dataset](#2-fruitnet-dataset)** | 6 Indian | 19,526 | Good, Bad, Mixed | ❌ 2-Tier only (`Mixed` = multi-fruit) | Poor |
| **[Freshness44](#3-freshness44)** | 22 global | 53,616 | Fresh, Rotten | ❌ Binary only | Poor |
| **[Fruit Quality Detection (YOLOv8)](#4-fruit-quality-detection-yolov8)** | 4 varieties | 8,318 | Good Fruit, Bad Fruit | ❌ Binary bbox only | Poor |

> 💡 **Recommendation**: **FruitQ Dataset** is the only dataset natively capturing continuous quality degradation with a true intermediate stage (`Mild`), perfectly aligning with the hackathon's 3-tier classification requirement (`Good`, `Acceptable`, `Damaged`).

---

## 📋 Comprehensive Dataset Comparison Table

| Feature | FruitQ Dataset ⭐ | FruitNet Dataset | Freshness44 | Fruit Quality Detection (YOLOv8) |
|---|---|---|---|---|
| **Access Link** | [kaggle.com/.../fruitq-dataset](https://www.kaggle.com/datasets/sholzz/fruitq-dataset) | [data.mendeley.com/.../3](https://data.mendeley.com/datasets/b6fftwbr2v/3) | [kaggle.com/.../freshness44](https://www.kaggle.com/datasets/siavash93/freshness44) | [kaggle.com/.../fruit-quality-dataset](https://www.kaggle.com/datasets/mohamadalhammoud/fruit-quality-dataset) |
| **Produce Varieties** | 11 global varieties (banana, cucumber, grape, papaya, peach, pear, pepper, strawberry, tomato, watermelon) | 6 Indian varieties (apple, banana, guava, lime, orange, pomegranate) | 22 varieties (consolidated from 5 distinct datasets) | 4 varieties (apple, banana, orange, pomegranate) |
| **Dataset Size & Methodology** | 9,421 total images (5,647 in primary de-watermarked subset). Extracted frames from time-lapse videography capturing continuous, real-time quality degradation. | 19,526 images captured via high-end mobile cameras across diverse ambient lighting and backgrounds. | 53,616 labeled images deduplicated using MD5 hashing. Intermediate degradation classes were intentionally purged. | 8,318 training images sourced from Roboflow with bounding box annotations for localization. |
| **Format & Dimensions** | RGB `.jpg` / `.png`; Hierarchical folder structure directly compatible with standard `ImageFolder` loaders. | RGB `.jpg`; $256 \times 256$ (Good/Bad), $256 \times 192$ (Mixed). | RGB `.jpg`; heterogeneous dimensions standardized during preprocessing. | RGB; $640 \times 640$ auto-oriented images with YOLO-format bounding boxes. |
| **Original Labels** | `Fresh`, `Mild`, `Rotten` | `Good`, `Bad`, `Mixed` | `Fresh`, `Rotten` | `Good Fruit`, `Bad Fruit` |
| **Mapped Hackathon Labels** | • `Fresh` $\rightarrow$ **Good**<br>• `Mild` $\rightarrow$ **Acceptable**<br>• `Rotten` $\rightarrow$ **Damaged** | • `Good` $\rightarrow$ **Good**<br>• `Bad` $\rightarrow$ **Damaged**<br>• `Mixed` $\rightarrow$ **N/A** | • `Fresh` $\rightarrow$ **Good**<br>• `Rotten` $\rightarrow$ **Damaged** | • `Good Fruit` $\rightarrow$ **Good**<br>• `Bad Fruit` $\rightarrow$ **Damaged** |
| **Suitability Assessment** | **Optimal**: Natively provides genuine tertiary quality grading matching visible decay stages without manual relabeling. | **Poor**: The "Mixed" category denotes multiple fruits present in a single frame, not an intermediate freshness level. | **Poor**: Strictly binary. Generating an "Acceptable" tier would necessitate laborious manual relabeling of thousands of images. | **Poor**: Tailored for object detection / bounding box regression and strictly binary quality classification. |

---

## 🔍 Detailed Dataset Profiles

### 1. FruitQ Dataset (Recommended) ⭐
- **Source Link**: [Kaggle - FruitQ Dataset](https://www.kaggle.com/datasets/sholzz/fruitq-dataset)
- **Produce Varieties (11)**: Banana, cucumber, grape, papaya, peach, pear, pepper, strawberry, tomato, watermelon.
- **Key Characteristics**:
  - Captured via **time-lapse videography**, recording real-world fruit decay over continuous time periods.
  - Contains **9,421 total images** (with **5,647 clean, de-watermarked images** in the primary split).
  - Directory structure maps directly into PyTorch / TensorFlow `ImageFolder` or Keras `image_dataset_from_directory`.
- **Label Mapping**:
  - `Fresh` $\rightarrow$ `Good`
  - `Mild` $\rightarrow$ `Acceptable`
  - `Rotten` $\rightarrow$ `Damaged`
- **Verdict**: **Optimal fit for TezHack**. Directly satisfies the requirement for a 3-tier visual grading model (`Good`, `Acceptable`, `Damaged`) without synthetic labeling.

---

### 2. FruitNet Dataset
- **Source Link**: [Mendeley Data - FruitNet](https://data.mendeley.com/datasets/b6fftwbr2v/3)
- **Produce Varieties (6)**: Apple, banana, guava, lime, orange, pomegranate.
- **Key Characteristics**:
  - High-resolution smartphone captures across varied lighting and real-world background noise.
  - Contains **19,526 images** categorized into Good, Bad, and Mixed.
- **Label Mapping**:
  - `Good` $\rightarrow$ `Good`
  - `Bad` $\rightarrow$ `Damaged`
  - `Mixed` $\rightarrow$ *Not usable as intermediate class* (contains multiple fruits in one shot).
- **Verdict**: **Poor for 3-tier grading**. Only provides binary classification unless multi-fruit images are repurposed.

---

### 3. Freshness44
- **Source Link**: [Kaggle - Freshness44](https://www.kaggle.com/datasets/siavash93/freshness44)
- **Produce Varieties (22)**: Broad collection consolidated across 5 public datasets.
- **Key Characteristics**:
  - Large volume (**53,616 images**), MD5 hashed to prevent data duplication and leakage.
  - Intermediate/ambiguous classes were explicitly removed by dataset creators to ensure sharp binary separation.
- **Label Mapping**:
  - `Fresh` $\rightarrow$ `Good`
  - `Rotten` $\rightarrow$ `Damaged`
- **Verdict**: **Poor**. Strictly binary (`Fresh` vs `Rotten`). Cannot fulfill the `Acceptable` quality grade without extensive manual annotation.

---

### 4. Fruit Quality Detection (YOLOv8)
- **Source Link**: [Kaggle - Fruit Quality Dataset (YOLOv8)](https://www.kaggle.com/datasets/mohamadalhammoud/fruit-quality-dataset)
- **Produce Varieties (4)**: Apple, banana, orange, pomegranate.
- **Key Characteristics**:
  - Sourced from Roboflow with **8,318 images** annotated with bounding boxes.
  - Standardized $640 \times 640$ auto-oriented images formatted for YOLO object detection.
- **Label Mapping**:
  - `Good Fruit` $\rightarrow$ `Good`
  - `Bad Fruit` $\rightarrow$ `Damaged`
- **Verdict**: **Poor**. Built for object localization and binary grading. Not suited for classification of subtle decay stages (`Acceptable`).
