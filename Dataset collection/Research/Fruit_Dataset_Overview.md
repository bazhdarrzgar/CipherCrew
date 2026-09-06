# 🍎 Fruit Quality Datasets Overview

| Dataset / Source | Access Link | Produce Varieties Included | Quality Classes / Labels | Image Count & Resolution | Key Characteristics & Notes |
|---|---|---|---|---|---|
| **FruQ-DB / FruitQ** *(Recommended)* | [Zenodo (Official)](https://zenodo.org/records/7224690)<br>[Kaggle Mirror](https://www.kaggle.com/datasets/sholzz/fruitq-dataset) | **11 varieties**: Banana, Cucumber, Grape, Kaki (Persimmon), Papaya, Peach, Pear, Pepper, Strawberry, Tomato, Watermelon | • `Fresh`<br>• `Mild`<br>• `Rotten` | **5,647 preprocessed**<br>*(9,421 raw images, 224×224)* | **Natively 3-tier**: Extracted from continuous time-lapse decay footage. Direct mapping to `Good` $\rightarrow$ `Acceptable` $\rightarrow$ `Damaged`. |
| **FruitNet Dataset** | [Mendeley Data Link](https://data.mendeley.com/datasets/b6fftwbr2v/3) | **6 Indian varieties**: Apple, Banana, Guava, Lime, Orange, Pomegranate | • `Good quality`<br>• `Bad quality`<br>• `Mixed quality` | **19,526 images**<br>*(256×256 & 256×192)* | High-res mobile phone camera captures. **Note**: `Mixed` refers to multi-fruit scenes, not an intermediate freshness tier. |
| **Freshness44** | [Kaggle Link](https://www.kaggle.com/datasets/siavash93/freshness44) | **22 fruit & vegetable varieties** *(Apple, Banana, Tomato, etc.)* | **2 attributes per image**:<br>1. `Type`<br>2. `Freshness` (`Fresh` or `Rotten`) | **53,616 images**<br>*(144×122 up to 8000×6000 px)* | MD5-deduplicated dataset across 5 collections. Strictly binary freshness (no intermediate `Acceptable` class). |
| **Fruit Quality Dataset (YOLOv8)** | [Kaggle Link](https://www.kaggle.com/datasets/mohamadalhammoud/fruit-quality-dataset) | **4 varieties**: Apple, Banana, Orange, Pomegranate | Combined label format:<br>• `good [fruit]`<br>• `bad [fruit]` | **8,318 images**<br>*(640×640 auto-oriented)* | Annotated with bounding boxes for YOLO object detection. Strictly binary quality grading. |
| **AFruitDB** | [Mendeley Data Link](https://data.mendeley.com/datasets/bz65dz2pbj/1) | **6 varieties**: Apple, Banana, Burmese Grape, Mango, Papaya, Tomato | • `Good`<br>• `Medium`<br>• `Bad` | **3,167 images**<br>*(224×224 JPG)* | **Natively 3-tier**: Good $\rightarrow$ Good, Medium $\rightarrow$ Acceptable, Bad $\rightarrow$ Damaged. Mobile photographs from local markets in Bangladesh. |

---

## 📥 AFruitDB — Direct Dataset

- **Mendeley Data Download:** [Download AFruitDB dataset — Mendeley Data](https://data.mendeley.com/datasets/bz65dz2pbj/1)
- **Official Research Paper:** The official paper confirms that this is the dataset repository and gives the dataset identifier `bz65dz2pbj.1` ([PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11889572/)).

### Dataset Information

| Item | Details |
|---|---|
| **Dataset** | AFruitDB |
| **Images** | 3,167 |
| **Image format** | JPG |
| **Image size** | 224 × 224 |
| **Produce** | Apple, Banana, Burmese Grape, Mango, Papaya, Tomato |
| **Quality labels** | Good, Medium, Bad |
| **Total categories** | 18 (6 fruits × 3 quality levels) |
| **Source** | Local markets in Bangladesh |
| **Collection** | Mobile-phone photographs |
| **Best use for project** | Good → Good, Medium → Acceptable, Bad → Damaged |

The official research article confirms the three quality categories and the 3,167 images ([PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11889572/)).

> [!NOTE]
> **Important:** The Mendeley page is the actual data download/source page, while the paper is useful for understanding the labels and dataset structure ([PubMed Central (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC11889572/)).

