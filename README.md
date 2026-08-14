# Crop Disease Detection

AI-powered tomato leaf disease detection with severity assessment, treatment advisory, and an offline agronomy knowledge search.

 Project-I,
Idara Sree Harshith Chowdary 
Chintalapati Shriker Verma

---

## What it does

Upload a photograph of a tomato leaf. The system returns:

- a **diagnosis** across four tomato conditions, or an out-of-scope notice
- a **confidence** score, with a warning below 60%
- a **severity** reading (Mild / Moderate / Severe) derived from lesion area
- a **treatment sequence** and prevention guidance for the identified disease
- **class probabilities** for every category, so the margin is visible

A separate search bar answers typed questions about crops, leaves, pests, nutrition and soil from a trained retrieval index that runs entirely offline.

## Results

| Metric | Value |
|---|---|
| Test accuracy | **97.74%** (1,239 held-out images) |
| End-to-end accuracy through the API | 96.37% |
| Classes | 5 |
| Training images | 8,237 |
| Median inference latency | 43 ms (CPU) |
| Model size | 23.9 MB |
| Automated tests | 22 passing |

| Class | Precision | Recall | F1 |
|---|---|---|---|
| Other (not tomato) | 0.9796 | 0.9917 | 0.9856 |
| Tomato Bacterial spot | 0.9755 | 0.9938 | 0.9845 |
| Tomato Early blight | 0.9784 | 0.9067 | 0.9412 |
| Tomato Late blight | 0.9686 | 0.9686 | 0.9686 |
| Tomato Healthy | 0.9876 | 0.9958 | 0.9917 |

Full testing report: `docs/phase6_testing.md`

## Stack

| Layer | Technology |
|---|---|
| Model | MobileNetV2 transfer learning, TensorFlow 2.20 / Keras 3 |
| Backend | Flask REST API, Pillow, NumPy |
| Knowledge search | TF-IDF vector index, scikit-learn |
| Frontend | React 19 (Vite), IBM Plex type system |
| Dataset | PlantVillage (colour subset) |

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

This builds the frontend and inlines CSS and JavaScript into a single HTML file, which Flask then serves from `/`. Everything then runs on one port, so the whole application can be exposed through a single tunnel. Use `npm run build` alone if you want conventional separate asset files.

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

**Classification.** MobileNetV2 pretrained on ImageNet, with a custom head (global average pooling, dropout, a 128-unit dense layer, 5-way softmax). Trained in two phases: the head alone at learning rate 1e-3, then the last 50 base layers at 2e-5. BatchNorm layers stay frozen throughout. Class weights compensate for imbalance; early stopping restores the best epoch.

Pixel rescaling to [-1, 1] is a `Rescaling` layer **inside** the model rather than a preprocessing step outside it. This means the API sends raw 0–255 arrays and cannot introduce a train/serve mismatch. A `Lambda(preprocess_input)` layer was tried first and could not be serialised under Keras 3.

**Plant-tissue guard.** Before inference, the image is checked for green plant tissue by HSV thresholding. Non-plant input is rejected with HTTP 422 instead of being classified. This exists because softmax always distributes probability across known classes and cannot express that an input belongs to none of them.

**Severity.** HSV thresholding separates lesion pixels from healthy leaf tissue and reports the affected area as a percentage, binned into Mild / Moderate / Severe. This is a colour-area estimate, not learned segmentation.

**Knowledge search.** `train_qa.py` fits a TF-IDF vectoriser over 30 curated agronomy passages, weighting titles and example query phrasings above body text, and saves a 129 KB index. Queries are ranked by cosine similarity; below a similarity of 0.10 the system declines to answer rather than returning a poor match.

## Project structure

```
agrovision/
├── backend/
│   ├── app.py               Flask API and static serving
│   ├── severity.py          HSV severity and plant-tissue guard
│   ├── qa.py                retrieval question answering
│   ├── train_qa.py          fits the TF-IDF index
│   ├── test_api.py          22 automated tests
│   ├── treatments.json      treatment knowledge base
│   ├── knowledge/           agronomy passages and query augmentation
│   └── model/               model_v3.keras, class_names.json, qa_index.pkl
├── frontend/src/            React application
├── training/                data preparation, training, evaluation
├── data/split/              train / val / test image folders
├── docs/                    test report, confusion matrix, screenshots
└── rebuild.sh               production build with inlined assets
```

## Limitations

1. **Closed-set classification.** Six further tomato diseases in PlantVillage — septoria leaf spot, leaf mold, target spot, spider mite damage, mosaic virus and yellow leaf curl virus — are not covered and would be assigned to one of the four trained conditions.
2. **Out-of-distribution inputs.** The Other class reliably rejects non-tomato leaves photographed in the PlantVillage style (99.2%), but does not generalise to arbitrary imagery. A stock photograph of a rotting lettuce head was classified as late blight at 99.9% confidence, because collapsed brown leaf tissue is genuinely close to late blight in feature space. A Mahalanobis distance detector was tested against this case and did not separate it.
3. **Potato and pepper** were deliberately excluded from the Other class, since potato early and late blight are caused by the same pathogens as their tomato counterparts. Those leaves are therefore not rejected.
4. **Early blight recall (90.7%)** is the weakest class; most errors are confusions with late blight, which shares brown necrotic lesion morphology.
5. **Severity saturates** near 100% on fully necrotic leaves, and 10 such leaves (0.81% of the test set) are refused outright by the plant-tissue guard.
6. **Lab-condition training data.** PlantVillage images have uniform backgrounds; accuracy on field photographs would be lower.
7. **Retrieval-only search.** The knowledge search returns the best-matching stored passage and cannot synthesise across passages or answer outside its 30 topics.

## Future work

- **Multi-crop coverage.** PlantVillage contains 38 classes across 14 crop species. The architecture extends to this without design change, requiring only retraining and an expanded treatment knowledge base.
- **Field-condition data.** Training on PlantDoc or similar field photography to address the lab-condition limitation.
- **Learned severity.** Replacing colour thresholding with a segmentation model.
- **Mobile deployment.** TensorFlow Lite conversion for offline on-device inference.
- **Cloud deployment.** Static frontend hosting with a containerised inference backend.

## Attribution

Dataset: PlantVillage, Hughes and Salathé (2015). Treatment guidance is advisory only; confirm with a local agricultural extension officer before applying any chemical treatment.
