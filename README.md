# Crop Disease Detection

AI-powered crop disease detection across 14 species, with severity assessment, treatment advisory, and an offline agronomy knowledge search.

 Idara Sree Harshith Chowdary (23BCI0142),
 Chintalapati Shriker Verma


---

## What it does

Upload a photograph of a leaf. The system returns:

- a **diagnosis** across 38 conditions spanning 14 crop species
- a **confidence** score, with a warning below 60%
- a **severity** reading (Mild / Moderate / Severe) derived from lesion area
- a **treatment sequence** and prevention guidance for the identified disease
- **class probabilities**, so the margin between candidates is visible

A separate search bar answers typed questions about crops, leaves, pests, nutrition and soil from a trained retrieval index that runs entirely offline.

## Results

| Metric | Value |
|---|---|
| Validation accuracy | **93.67%** (4,770 held-out images) |
| Macro average F1 | 0.9355 |
| Weighted average F1 | 0.9365 |
| Classes | 38 |
| Crop species | 14 |
| Training images | 31,898 |
| Model size | 26.5 MB |
| Automated tests | 22 passing |

### Coverage by crop

| Crop | Conditions detected |
|---|---|
| Apple | Scab, Black rot, Cedar apple rust, Healthy |
| Blueberry | Healthy |
| Cherry | Powdery mildew, Healthy |
| Corn | Gray leaf spot, Common rust, Northern leaf blight, Healthy |
| Grape | Black rot, Esca (black measles), Leaf blight, Healthy |
| Orange | Citrus greening (huanglongbing) |
| Peach | Bacterial spot, Healthy |
| Bell pepper | Bacterial spot, Healthy |
| Potato | Early blight, Late blight, Healthy |
| Raspberry | Healthy |
| Soybean | Healthy |
| Squash | Powdery mildew |
| Strawberry | Leaf scorch, Healthy |
| Tomato | Bacterial spot, Early blight, Late blight, Leaf mold, Septoria leaf spot, Spider mites, Target spot, Yellow leaf curl virus, Mosaic virus, Healthy |

### Notable per-class results

Perfect or near-perfect (F1 ≥ 0.98): Corn healthy, Grape leaf blight, Orange citrus greening, Strawberry leaf scorch, Cherry powdery mildew, Peach bacterial spot, Apple black rot, Squash powdery mildew.

Weakest classes: Corn gray leaf spot (0.75 recall) and Tomato early blight (0.77 recall). Both produce subtle lesion patterns that are easily confused with visually similar diseases on the same crop.

## Stack

| Layer | Technology |
|---|---|
| Model | MobileNetV2 transfer learning, TensorFlow / Keras 3 |
| Backend | Flask REST API, Pillow, NumPy |
| Knowledge search | TF-IDF vector index, scikit-learn |
| Frontend | React 19 (Vite), Manrope type system |
| Datasets | PlantVillage (laboratory) + PlantDoc (field photographs) |

## Setup

Requires Python 3.9–3.11 and Node 18+.

### Backend

```bash
cd agrovision
python3 -m venv venv
source venv/bin/activate
# Windows: venv\Scripts\activate

pip install -r backend/requirements.txt

cd backend
python train_qa.py     # builds the knowledge search index
python app.py          # serves on http://localhost:5001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

The backend must be running before the frontend can analyse anything.

**Port note.** The API uses 5001 rather than the Flask default of 5000, because macOS AirPlay Receiver occupies 5000. On macOS, if a restart appears to have no effect, a stale process is probably still holding the port:

```bash
pkill -9 -f "python app.py"
lsof -nP -iTCP:5001 -sTCP:LISTEN
```

The second command should print nothing before you start a new server.

### Production build

```bash
./rebuild.sh
```

This builds the frontend and inlines CSS and JavaScript into a single HTML file, which Flask then serves from `/`. Everything then runs on one port, so the whole application can be exposed through a single tunnel.

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/predict` | POST | Multipart field `image` → diagnosis JSON |
| `/health` | GET | Service status and class list |
| `/classes` | GET | Class keys with display names |
| `/ask` | GET/POST | Query param `q` → knowledge search result |
| `/topics` | GET | Topics covered by the knowledge base |

Example:

```bash
curl -X POST -F "image=@leaf.jpg" http://localhost:5001/predict
curl --get --data-urlencode "q=why are my leaves yellow" http://localhost:5001/ask
```

`/predict` returns 400 for a missing or unreadable file, 413 if over 8 MB, 415 for an unsupported type, and 422 when no plant tissue is detected in the image.

## How it works

**Classification.** MobileNetV2 pretrained on ImageNet, with a custom head (global average pooling, dropout, a 256-unit dense layer, 38-way softmax). Trained in two phases: the head alone at learning rate 1e-3 for 12 epochs, then the last 60 base layers at 2e-5 for 20 epochs. BatchNorm layers stay frozen throughout.

Pixel rescaling to [-1, 1] is a `Rescaling` layer **inside** the model rather than a preprocessing step outside it. This means the API sends raw 0–255 arrays and cannot introduce a train/serve mismatch.

**Dataset construction.** `training/build_multicrop.py` merges two sources: PlantVillage laboratory images (capped at 900 per class to limit imbalance) and PlantDoc field photographs mapped onto matching PlantVillage classes. The combination is deliberate — PlantVillage supplies volume and clean labels, PlantDoc supplies real-world backgrounds, lighting and occlusion.

**Plant-tissue guard.** Before inference the image is checked for green plant tissue by HSV thresholding. Non-plant input is rejected with HTTP 422 instead of being classified.

**Severity.** HSV thresholding separates lesion pixels from healthy leaf tissue and reports the affected area as a percentage, binned into Mild / Moderate / Severe. This is a colour-area estimate, not learned segmentation. Healthy classes bypass it entirely.

**Knowledge search.** `train_qa.py` fits a TF-IDF vectoriser over 30 curated agronomy passages, weighting titles and example query phrasings above body text. Queries are ranked by cosine similarity; below 0.10 the system declines to answer rather than returning a poor match.

## Project structure

```
agrovision/
├── backend/
│   ├── app.py               Flask API and static serving
│   ├── severity.py          HSV severity and plant-tissue guard
│   ├── qa.py                retrieval question answering
│   ├── train_qa.py          fits the TF-IDF index
│   ├── test_api.py          22 automated tests
│   ├── treatments.json      treatment knowledge base, 38 entries
│   ├── knowledge/           agronomy passages and query augmentation
│   └── model/               model_v4.keras, class_names.json, qa_index.pkl
├── frontend/src/            React application
├── training/
│   ├── build_multicrop.py   merges PlantVillage + PlantDoc into 38 classes
│   ├── plantdoc_baseline.py measures lab-to-field accuracy gap
│   ├── train.py             model training
│   └── evaluate.py          evaluation and confusion matrix
├── data/                    datasets (gitignored, rebuilt from source)
├── docs/                    test report, confusion matrix, screenshots
└── rebuild.sh               production build with inlined assets
```

## Development history

**v1–v2 (4 classes).** Tomato only — bacterial spot, early blight, late blight, healthy. 96.49% test accuracy.

**v3 (5 classes).** Added an `Other___not_tomato` rejection class trained on 1,610 images from 23 non-tomato PlantVillage crops. Test accuracy rose to 97.74%, and the extra class improved the tomato classes rather than competing with them — requiring the network to separate tomato from other species appears to have sharpened its representation of tomato leaf tissue.

**v4 (38 classes, current).** Expanded to every PlantVillage class across 14 species, with PlantDoc field photographs merged in. Validation accuracy 93.67%. The drop from v3's 97.74% reflects a far harder problem — 38 classes instead of 5, including visually similar diseases within the same crop.

## Known limitations

1. **Closed-set classification.** A leaf from a species outside the 14 trained crops is assigned to the closest matching class rather than rejected. v3 had an explicit reject class; v4 does not, because every available crop is now a diagnosable class in its own right. Restoring a reject class would require sourcing images genuinely outside PlantVillage.
2. **Confusable pairs.** Corn gray leaf spot and tomato early blight are the weakest classes, most often confused with visually similar diseases on the same crop.
3. **Dataset shift.** A baseline evaluation of the tomato-only v3 model against PlantDoc field photographs measured 75.4% against 97.7% on laboratory images, with the healthy class failing entirely. v4 mitigates this by training on both sources, but laboratory imagery still dominates by volume.
4. **Severity is colour-based**, not learned segmentation, and saturates near 100% on fully necrotic leaves.
5. **Retrieval-only search.** The knowledge search returns the best-matching stored passage and cannot synthesise across passages or answer outside its 30 topics.

## Future work

- **Reject class for unknown species**, trained on plant imagery outside the 14 covered crops.
- **Field-condition emphasis.** Weighting or oversampling PlantDoc images during training to close the remaining lab-to-field gap.
- **Learned severity.** Replacing colour thresholding with a segmentation model.
- **Mobile deployment.** TensorFlow Lite conversion for offline on-device inference.
- **Cloud deployment.** Static frontend hosting with a containerised inference backend.

## Attribution

Datasets: PlantVillage (Hughes and Salathé, 2015) and PlantDoc (Singh et al., 2020, CC BY 4.0). Treatment guidance is advisory only; confirm with a local agricultural extension officer before applying any chemical treatment.
