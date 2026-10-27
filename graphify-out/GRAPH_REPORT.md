# Graph Report - agrovision  (2026-09-07)

## Corpus Check
- Corpus is ~49,522 words - fits in a single context window. You may not need a graph.

## Summary
- 200 nodes · 244 edges · 21 communities (14 shown, 7 thin omitted)
- Extraction: 87% EXTRACTED · 13% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Frontend Build Config
- API Test Suite
- Severity & API Routes
- App Overview & Build
- Model Training & Datasets
- Model Evaluation & Limitations
- Knowledge Search (QA)
- React App Component
- v4-v5 Multi-Crop Training
- Icon Sprite Assets
- Confusion Matrix Figure
- Landing Page Screenshot
- Lint Configuration
- Diagnosis Screen Screenshot
- Data Preparation Script
- Treatment Advisory Data
- Hero Illustration Asset
- v5 Training Script
- Favicon Asset
- React Logo Asset
- Vite Logo Asset

## God Nodes (most connected - your core abstractions)
1. `_post()` - 11 edges
2. `Crop Disease Detection System` - 8 edges
3. `MobileNetV2 Transfer Learning Model` - 8 edges
4. `_jpeg()` - 7 edges
5. `App()` - 7 edges
6. `v3 Tomato Model Classification Report` - 7 edges
7. `Phase 6 Testing Results Report` - 7 edges
8. `Icon Sprite Sheet` - 7 edges
9. `Flask REST API Backend` - 6 edges
10. `v3: 5-Class Model with Reject Class` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Known Limitations (Phase 6 Testing)` --semantically_similar_to--> `Known Limitations (README)`  [INFERRED] [semantically similar]
  docs/phase6_testing.md → README.md
- `tensorflow==2.15.0` --conceptually_related_to--> `MobileNetV2 Transfer Learning Model`  [INFERRED]
  backend/requirements.txt → README.md
- `flask==3.0.3` --conceptually_related_to--> `Flask REST API Backend`  [INFERRED]
  backend/requirements.txt → README.md
- `flask-cors==4.0.1` --conceptually_related_to--> `Flask REST API Backend`  [INFERRED]
  backend/requirements.txt → README.md
- `numpy==1.26.4` --conceptually_related_to--> `Flask REST API Backend`  [INFERRED]
  backend/requirements.txt → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Model Version Evolution v1 through v5** — readme_v1_v2_tomato_model, readme_v3_reject_class, readme_v4_multicrop, readme_v5_fruit_classes [EXTRACTED 1.00]
- **Training Datasets Merged for Multi-Crop Model** — readme_plantvillage_dataset, readme_plantdoc_dataset, readme_kaggle_fruit_dataset, readme_mendeley_pomegranate_dataset [EXTRACTED 1.00]
- **v3 Model Validation Artifacts** — backend_test_api, docs_classification_report_v3_model, docs_phase6_testing_report, docs_phase6_testing_model_v3 [INFERRED 0.85]

## Communities (21 total, 7 thin omitted)

### Community 0 - "Frontend Build Config"
Cohesion: 0.08
Nodes (24): dependencies, react, react-dom, devDependencies, oxlint, @types/react, @types/react-dom, vite (+16 more)

### Community 1 - "API Test Suite"
Cohesion: 0.14
Nodes (15): _jpeg(), _leaf(), _post(), Synthetic green leaf-like image that passes the plant-tissue guard., test_corrupt_image_returns_400(), test_healthy_leaf_reports_no_severity(), test_non_plant_image_rejected_422(), test_oversize_file_returns_413() (+7 more)

### Community 2 - "Severity & API Routes"
Cohesion: 0.18
Nodes (17): ask_route(), classes(), health(), predict(), serve_spa(), topics_route(), estimate_severity(), green_fraction() (+9 more)

### Community 3 - "App Overview & Build"
Cohesion: 0.12
Nodes (16): backend/requirements.txt, flask==3.0.3, flask-cors==4.0.1, numpy==1.26.4, pillow==10.3.0, DM Mono Google Font, frontend/index.html Entry Document, Manrope Google Font (+8 more)

### Community 4 - "Model Training & Datasets"
Cohesion: 0.14
Nodes (15): backend/model/class_names.json, tensorflow==2.15.0, Lab-to-Field Dataset Shift, Hughes and Salathé, 2015 (PlantVillage), Kaggle Fruit-Disease Dataset, Mendeley Pomegranate Dataset, MobileNetV2 Transfer Learning Model, PlantDoc Dataset (+7 more)

### Community 5 - "Model Evaluation & Limitations"
Cohesion: 0.15
Nodes (16): Other___not_tomato class metrics, Tomato Bacterial_spot class metrics, Tomato Early_blight class metrics, Tomato healthy class metrics, Tomato Late_blight class metrics, v3 Tomato Model Classification Report, Known Limitations (Phase 6 Testing), model_v3.keras Under Test (+8 more)

### Community 6 - "Knowledge Search (QA)"
Cohesion: 0.15
Nodes (8): backend/model/qa_index.pkl, ask(), _load(), Retrieval question answering over the agronomy knowledge base. Loads the index…, topics(), Fit the TF-IDF retrieval index over the agronomy knowledge base. Run once, or…, Retrieval-Only Knowledge Search Limitation, TF-IDF Knowledge Search

### Community 7 - "React App Component"
Cohesion: 0.22
Nodes (4): App(), CROPS, EXAMPLES, react

### Community 8 - "v4-v5 Multi-Crop Training"
Cohesion: 0.25
Nodes (8): backend/model/model_v5.keras, Keras EarlyStopping dtype='string' Bug, v4: 38-Class Multi-Crop Model, v5: 59-Class Model with Fruit Disease Detection, training/add_fruit_classes.py, gather_images(), main(), Build multi-crop dataset: PlantVillage (primary) + PlantDoc field images…

### Community 9 - "Icon Sprite Assets"
Cohesion: 0.36
Nodes (8): Agrovision Frontend, Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Icon Sprite Sheet, Social Icon, X (Twitter) Icon

### Community 10 - "Confusion Matrix Figure"
Cohesion: 0.38
Nodes (7): Confusion Matrix (Tomato Disease Classifier), Early Blight has highest misclassification rate, Other / Not Tomato (class), Tomato Bacterial Spot (class), Tomato Early Blight (class), Tomato Healthy (class), Tomato Late Blight (class)

### Community 11 - "Landing Page Screenshot"
Cohesion: 0.47
Nodes (6): Crop Disease Detection Landing Page (Screenshot), Crop Disease Detection Web App UI, Model Performance Stats (97.7% accuracy, 8,237 images, 5 classes, ~43ms inference), Specimen Upload and Diagnosis Step Workflow (Step 01/02), Symptom Query / Ask Feature, Whiteflies and Virus Transmission Result Card

### Community 12 - "Lint Configuration"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 13 - "Diagnosis Screen Screenshot"
Cohesion: 0.60
Nodes (5): Confidence Score Display (99.7%), Diagnosis Screen (Step 02), Phytophthora infestans (oomycete), Severity Assessment (Leaf Area % / Mild-Moderate-Severe), Tomato — Late Blight Diagnosis Result

## Knowledge Gaps
- **64 isolated node(s):** `$schema`, `plugins`, `react/rules-of-hooks`, `react/only-export-components`, `name` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 102 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Crop Disease Detection System` connect `App Overview & Build` to `API Test Suite`, `Model Training & Datasets`, `Knowledge Search (QA)`?**
  _High betweenness centrality (0.396) - this node is a cross-community bridge._
- **Why does `frontend/index.html Entry Document` connect `App Overview & Build` to `React App Component`?**
  _High betweenness centrality (0.228) - this node is a cross-community bridge._
- **What connects `$schema`, `plugins`, `react/rules-of-hooks` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Build Config` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `API Test Suite` be split into smaller, more focused modules?**
  _Cohesion score 0.14333333333333334 - nodes in this community are weakly interconnected._
- **Should `App Overview & Build` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Model Training & Datasets` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._