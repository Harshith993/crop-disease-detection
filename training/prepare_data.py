"""Split raw PlantVillage class folders into train/val/test (70/15/15)."""
import os, shutil, random
from pathlib import Path
from PIL import Image

RAW = Path("data/raw")
OUT = Path("data/split")
SPLITS = {"train": 0.70, "val": 0.15, "test": 0.15}
SEED = 42
MIN_SIDE = 64  # drop tiny/corrupt images

random.seed(SEED)

def valid(p):
    try:
        with Image.open(p) as im:
            im.verify()
        with Image.open(p) as im:
            w, h = im.size
        return w >= MIN_SIDE and h >= MIN_SIDE
    except Exception:
        return False

if OUT.exists():
    shutil.rmtree(OUT)

classes = sorted([d.name for d in RAW.iterdir() if d.is_dir()])
print("Classes:", classes)

for cls in classes:
    files = [p for p in (RAW / cls).iterdir()
             if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    good = [p for p in files if valid(p)]
    print(f"{cls}: {len(files)} found, {len(good)} valid")

    random.shuffle(good)
    n = len(good)
    n_train = int(n * SPLITS["train"])
    n_val = int(n * SPLITS["val"])
    parts = {
        "train": good[:n_train],
        "val":   good[n_train:n_train + n_val],
        "test":  good[n_train + n_val:],
    }
    for split, paths in parts.items():
        dest = OUT / split / cls
        dest.mkdir(parents=True, exist_ok=True)
        for p in paths:
            shutil.copy2(p, dest / p.name)
        print(f"  {split}: {len(paths)}")

# save class order — this MUST match the model's output order
import json
Path("backend/model").mkdir(parents=True, exist_ok=True)
json.dump(classes, open("backend/model/class_names.json", "w"), indent=2)
print("\nSaved backend/model/class_names.json")