# Model Card

## Intended Use

This model screens fruit images and predicts whether the visible fruit appears **Fresh**, **Rotten**, or **Adulterant**. It is intended for educational demos, prototype food-quality workflows, and visual inspection assistance.

## Inputs

- RGB image files uploaded through the web UI or API.
- Best results come from clear, well-lit fruit photos with the fruit occupying a meaningful portion of the image.

## Outputs

- Condition label.
- Confidence score.
- Per-class probabilities.
- Annotated image.
- Optional Grad-CAM crop when requested.

## Pipeline

- YOLOv8 detects fruit regions for configured COCO classes.
- The classifier evaluates the full uploaded image at `224x224`, matching the training pipeline.
- If no configured fruit class is detected, the full image is still annotated so uploads receive a result.

## Known Limitations

- The model is visual only and cannot confirm chemical contamination.
- The `Adulterant` prediction should be treated as a screening signal.
- Out-of-domain fruit types, poor lighting, occlusion, blur, or edited images can reduce reliability.
- Confidence values are model scores, not calibrated probabilities.

## Recommended Validation

- Test with fresh, rotten, and adulterant samples before production use.
- Monitor false positives and false negatives by fruit type.
- Retrain or fine-tune when adding new fruit categories or collection conditions.
