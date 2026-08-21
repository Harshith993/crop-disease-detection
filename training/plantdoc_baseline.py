"""
Baseline: evaluate the existing v3 model on PlantDoc field images.
Maps PlantDoc's tomato classes to our 5-class scheme, runs inference through
the loaded model, and reports per-class and overall accuracy.

This does NOT retrain anything. It measures the lab-to-field gap.
"""
import os, glob, json, collections
import numpy as np
import tensorflow as tf
from PIL import Image

ROOT = os.path.expanduser("~/agrovision")
MODEL = os.path.join(ROOT, "backend", "model", "model_v3.keras")
CLASSES = json.load(open(os.path.join(ROOT, "backend", "model", "class_names.json")))
# class order: index -> our label
IDX = {c: i for i, c in enumerate(CLASSES)}

# PlantDoc folder name -> our class key.
# Tomato disease folders map to the matching tomato class.
# Every non-tomato species maps to Other___not_tomato.
# PlantDoc tomato diseases we DON'T model (septoria, mold, mosaic, yellow virus,
# spider mites) are skipped entirely - they are genuine tomato leaves we can't label.
TOMATO_MAP = {
    "Tomato Early blight leaf": "Tomato___Early_blight",
    "Tomato leaf late blight": "Tomato___Late_blight",
    "Tomato leaf bacterial spot": "Tomato___Bacterial_spot",
    "Tomato leaf": "Tomato___healthy",
}
SKIP = {  # tomato leaves outside our 4 disease classes
    "Tomato Septoria leaf spot",
    "Tomato leaf mosaic virus",
    "Tomato leaf yellow virus",
    "Tomato mold leaf",
    "Tomato two spotted spider mites leaf",
}

def find_split_dir(base):
    # PlantDoc ships a TRAIN/ and TEST/ split; prefer TEST
    for name in ("TEST", "test", "Test"):
        p = os.path.join(base, name)
        if os.path.isdir(p):
            return p
    return base

def resolve_target(folder):
    if folder in SKIP:
        return None
    if folder in TOMATO_MAP:
        return TOMATO_MAP[folder]
    # anything else is a non-tomato crop -> Other
    return "Other___not_tomato"

def preprocess(path):
    im = Image.open(path).convert("RGB").resize((224, 224))
    return np.array(im, dtype=np.float32)

def main():
    pd_root = os.path.join(ROOT, "data", "plantdoc")
    test_dir = find_split_dir(pd_root)
    print("PlantDoc dir:", test_dir)

    model = tf.keras.models.load_model(MODEL)

    folders = sorted(d for d in os.listdir(test_dir)
                     if os.path.isdir(os.path.join(test_dir, d)))
    per = collections.defaultdict(lambda: [0, 0])   # our_label -> [correct, total]
    confusion = collections.Counter()
    skipped = 0

    for folder in folders:
        target = resolve_target(folder)
        if target is None:
            skipped += len(glob.glob(os.path.join(test_dir, folder, "*")))
            continue
        for f in glob.glob(os.path.join(test_dir, folder, "*")):
            if not f.lower().endswith((".jpg", ".jpeg", ".png")):
                continue
            try:
                x = np.expand_dims(preprocess(f), 0)
            except Exception:
                continue
            probs = model.predict(x, verbose=0)[0]
            pred = CLASSES[int(np.argmax(probs))]
            per[target][1] += 1
            if pred == target:
                per[target][0] += 1
            else:
                confusion[(target, pred)] += 1

    tot_c = sum(v[0] for v in per.values())
    tot_n = sum(v[1] for v in per.values())
    print("\n=== PlantDoc field-image baseline (v3, no retraining) ===")
    print(f"images evaluated : {tot_n}")
    print(f"skipped (untracked tomato diseases): {skipped}")
    print(f"overall accuracy : {tot_c}/{tot_n} = {tot_c/tot_n*100:.1f}%\n")
    for k in CLASSES:
        c, n = per[k]
        if n:
            print(f"  {k:26s} {c:3d}/{n:3d}  {c/n*100:5.1f}%")
    print("\ntop confusions (true -> predicted):")
    for (t, p), n in confusion.most_common(8):
        print(f"  {t:24s} -> {p:24s} {n}")

if __name__ == "__main__":
    main()
