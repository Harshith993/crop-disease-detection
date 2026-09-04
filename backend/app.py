import io, json, os
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, send_from_directory
from flask_cors import CORS
from PIL import Image
import tensorflow as tf

from severity import estimate_severity, leaf_coverage, green_fraction

MODEL_PATH = os.path.join("model", "model_v5.keras" if os.path.exists(os.path.join("model","model_v5.keras")) else "model_v4.keras")
IMG_SIZE = (224, 224)
MAX_MB = 8
ALLOWED = {"image/jpeg", "image/png", "image/webp"}
LOW_CONFIDENCE = 0.60

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')
app = Flask(__name__, static_folder=None)
CORS(app)

print("Loading model...")
model = tf.keras.models.load_model(MODEL_PATH)
class_names = json.load(open(os.path.join("model", "class_names.json")))
treatments = json.load(open("treatments.json"))
print("Ready. Classes:", class_names)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "classes": class_names})


@app.route("/classes", methods=["GET"])
def classes():
    return jsonify({"classes": [
        {"key": c, "display_name": treatments.get(c, {}).get("display_name", c)}
        for c in class_names]})


@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No file uploaded. Use form field 'image'."}), 400

    f = request.files["image"]
    if f.filename == "":
        return jsonify({"error": "Empty filename."}), 400
    if f.mimetype not in ALLOWED:
        return jsonify({"error": f"Unsupported type {f.mimetype}. Use JPG or PNG."}), 415

    raw = f.read()
    if len(raw) > MAX_MB * 1024 * 1024:
        return jsonify({"error": f"File too large (max {MAX_MB} MB)."}), 413

    try:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        return jsonify({"error": "Could not read image file."}), 400

    # --- out-of-distribution guard: is this even a leaf? ---
    coverage = green_fraction(img)
    if coverage < 0.02:
        return jsonify({
            "success": False,
            "error": "No plant tissue detected in this image. "
                     "Upload a close-up photo of a single leaf against a plain background.",
            "green_tissue_percent": round(coverage * 100, 1),
        }), 422

    # --- inference: model has preprocessing baked in, so send raw 0-255 ---
    resized = img.resize(IMG_SIZE)
    arr = np.expand_dims(np.array(resized, dtype=np.float32), axis=0)
    probs = model.predict(arr, verbose=0)[0]

    idx = int(np.argmax(probs))
    key = class_names[idx]
    confidence = float(probs[idx])
    info = treatments.get(key, {})

    # --- severity ---
    if key.startswith("Other") or "healthy" in key.lower():
        sev_label, sev_pct = "None", 0.0
    else:
        sev_label, sev_pct = estimate_severity(img)

    return jsonify({
        "success": True,
        "prediction": {
            "class_key": key,
            "disease": info.get("display_name", key.replace("___", " - ").replace("_", " ")),
            "confidence": round(confidence * 100, 2),
            "low_confidence": confidence < LOW_CONFIDENCE,
        },
        "severity": {"label": sev_label, "affected_area_percent": sev_pct},
        "details": {
            "pathogen": info.get("pathogen", ""),
            "symptoms": info.get("symptoms", ""),
            "treatment": info.get("treatment", []),
            "prevention": info.get("prevention", []),
        },
        "all_probabilities": {
            class_names[i]: round(float(p) * 100, 2) for i, p in enumerate(probs)
        },
        "disclaimer": "Advisory only. Confirm with a local agricultural extension officer before applying any chemical treatment."
    })



@app.route('/ask', methods=['GET', 'POST'])
def ask_route():
    import qa
    if request.method == 'POST':
        q = (request.get_json(silent=True) or {}).get('q', '')
    else:
        q = request.args.get('q', '')
    return jsonify(qa.ask(q))


@app.route('/topics', methods=['GET'])
def topics_route():
    import qa
    return jsonify({'topics': qa.topics()})




@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    full = os.path.join(DIST, path)
    if path and os.path.isfile(full):
        return send_from_directory(DIST, path)
    return send_from_directory(DIST, 'index.html')


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
    