# Phase 6 — Testing Results

Model under test: **model_v3.keras** (5 classes, MobileNetV2 transfer learning)

## 1. Automated API test suite (pytest)

22 tests, 22 passed, 4.15 s. Source: `backend/test_api.py`

| # | Test | Checks | Result |
|---|---|---|---|
| 1 | health_ok | Service responds, status ok | PASS |
| 2 | health_lists_expected_classes | Class list length is 4 or 5 | PASS |
| 3 | classes_endpoint_has_display_names | Human-readable names present | PASS |
| 4 | missing_file_returns_400 | No file uploaded | PASS |
| 5 | wrong_mimetype_returns_415 | text/plain rejected | PASS |
| 6 | corrupt_image_returns_400 | Malformed JPEG handled | PASS |
| 7 | oversize_file_returns_413 | 5000x5000 image handled | PASS |
| 8 | non_plant_image_rejected_422 | Plant-tissue guard blocks non-plant | PASS |
| 9 | skin_tone_rejected | Skin-tone image blocked | PASS |
| 10 | valid_leaf_returns_full_contract | All JSON keys present | PASS |
| 11 | probabilities_sum_to_100 | Softmax sums to 100 +/- 0.5 | PASS |
| 12 | predicted_class_is_argmax | Prediction equals highest probability | PASS |
| 13-16 | real_images_mostly_correct[4 classes] | At least 75% correct per class | PASS |
| 17 | healthy_leaf_reports_no_severity | Healthy overrides severity to None | PASS |
| 18 | ask_returns_answer | Knowledge search returns a scored hit | PASS |
| 19 | ask_declines_off_topic | Out-of-domain query declined | PASS |
| 20 | ask_short_query_declined | Queries under 3 characters rejected | PASS |
| 21 | ask_returns_ranked_results | Results sorted by descending score | PASS |
| 22 | topics_endpoint | Topic list returned | PASS |

## 2. Model evaluation (held-out test set, 1,239 images)

Test accuracy: **97.74%**

| Class | Precision | Recall | F1 | Support |
|---|---|---|---|---|
| Other (not tomato) | 0.9796 | 0.9917 | 0.9856 | 242 |
| Tomato Bacterial spot | 0.9755 | 0.9938 | 0.9845 | 320 |
| Tomato Early blight | 0.9784 | 0.9067 | 0.9412 | 150 |
| Tomato Late blight | 0.9686 | 0.9686 | 0.9686 | 287 |
| Tomato Healthy | 0.9876 | 0.9958 | 0.9917 | 240 |
| **Overall** | 0.9774 | 0.9774 | 0.9772 | 1239 |

## 3. End-to-end system test (every test image through the live REST API)

| Metric | Value |
|---|---|
| Test images | 1,239 |
| Rejected by plant-tissue guard | 10 (0.81%) |
| End-to-end correct | 1194/1239 = **96.37%** |
| Low-confidence flags raised | 11 |

| Class | Correct | Accuracy |
|---|---|---|
| Other (not tomato) | 240/242 | 99.2% |
| Tomato Bacterial spot | 318/320 | 99.4% |
| Tomato Early blight | 133/150 | 88.7% |
| Tomato Late blight | 264/277 | 95.3% |
| Tomato Healthy | 239/240 | 99.6% |

End-to-end accuracy is marginally below raw model accuracy because 10 heavily
necrotic late-blight leaves are refused by the plant-tissue guard before
inference. This is a deliberate trade-off: the guard prevents confident
misdiagnosis of non-plant input at the cost of rejecting a small number of
near-totally-diseased specimens, which the user is asked to re-photograph.

## 4. Performance (Apple M-series CPU, single Flask worker)

| Metric | Value |
|---|---|
| Mean latency | 43.6 ms |
| Median latency | 43.4 ms |
| 95th percentile | 45.0 ms |
| Min / Max | 42.3 / 48.6 ms |
| Throughput | 22.9 req/s |
| Model size on disk | 23.9 MB |
| Retrieval index size | 129 KB |

## 5. Manual test matrix

| # | Test case | Expected | Result |
|---|---|---|---|
| 1 | Held-out test images, all classes | At least 90% correct | PASS — 96.37% |
| 2 | Non-plant photo (grey stripes, skin, wood) | Rejected with guidance | PASS — HTTP 422 |
| 3 | Non-tomato leaf (lettuce, grape, corn) | Reported as out of scope | PASS — resolved in v3 |
| 4 | Oversized image (>8 MB) | Clean error, no crash | PASS |
| 5 | Non-image file renamed .jpg | Clean error message | PASS — HTTP 400 |
| 6 | Backend stopped, then upload | Frontend shows actionable error | PASS |
| 7 | Dark / light mode toggle | Persists across reload | PASS |
| 8 | Mobile viewport (<860px) | Single column, no overflow | PASS |
| 9 | Keyboard navigation (Tab + Enter) | Drop zone focusable and activates | PASS |
| 10 | Healthy leaf | Severity None, no treatment steps | PASS |
| 11 | Knowledge search, in-domain question | Relevant passage returned | PASS |
| 12 | Knowledge search, off-topic question | Declines rather than guessing | PASS |

## 6. Regression history

Test case 3 was recorded as a FAIL against model_v2. A lettuce leaf was
classified as Tomato Late Blight at 99.7% confidence. The cause was closed-set
classification: a softmax layer distributes probability across known classes
only and cannot express that an input belongs to none of them. The plant-tissue
guard could not catch it because lettuce is plant tissue.

The fix was to add a fifth class, Other___not_tomato, trained on 1,610 images
sampled from 23 non-tomato PlantVillage crops. Potato and pepper were
deliberately excluded from that sample: potato early and late blight are caused
by the same pathogens as their tomato counterparts and produce near-identical
lesions, so including them would have degraded tomato blight recall.

The fifth class improved the tomato classes rather than competing with them:

| Class | v2 recall | v3 recall |
|---|---|---|
| Tomato Early blight | 0.887 | 0.907 |
| Tomato Bacterial spot | 0.988 | 0.994 |
| Tomato Late blight | 0.962 | 0.969 |
| Tomato Healthy | 1.000 | 0.996 |
| Overall test accuracy | 96.49% | **97.74%** |

Requiring the network to separate tomato from 23 other crops appears to have
sharpened its representation of tomato leaf tissue, which improved
discrimination within the tomato classes as well.

## 7. Known limitations

1. **Residual closed-set gap.** PlantVillage contains ten tomato conditions;
   this system covers four. A tomato leaf with septoria leaf spot, leaf mold,
   target spot, spider mite damage, mosaic virus or yellow leaf curl virus will
   be forced into one of the four trained categories. The Other class cannot
   catch these because the images are genuinely tomato leaves.
2. **Potato and pepper diseases** are not rejected, by design. A potato late
   blight leaf will most likely be reported as tomato late blight.
3. **Early blight recall (90.7%)** remains the weakest class; most errors are
   confusions with late blight, which shares brown necrotic lesion morphology.
4. **Severity is colour-threshold based**, not learned segmentation, and
   saturates near 100% on fully necrotic leaves.
5. **Lab-condition training data.** PlantVillage images have uniform
   backgrounds; accuracy on field photographs would be lower.
6. **Knowledge search is retrieval only.** It returns the best-matching stored
   passage and cannot synthesise across passages or answer outside its 30 topics.
