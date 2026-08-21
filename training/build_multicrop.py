"""
Build multi-crop dataset: PlantVillage (primary) + PlantDoc field images (supplement).
Outputs to ~/agrovision/data/multicrop/ with train/val/test splits.

Classes: all 38 PlantVillage classes (no generic "Other" — every crop is its own class).
PlantDoc images are mapped to matching PlantVillage classes and added as field-condition
augmentation. PlantDoc classes with no PlantVillage match are skipped.
"""
import os, glob, random, shutil, collections

random.seed(42)

PV = os.path.expanduser("~/Desktop/plantvillage dataset/color")
PD_TRAIN = os.path.expanduser("~/agrovision/data/plantdoc/train")
PD_TEST = os.path.expanduser("~/agrovision/data/plantdoc/test")
OUT = os.path.expanduser("~/agrovision/data/multicrop")

CAP = 900  # max PlantVillage images per class (controls imbalance)

# PlantDoc folder name -> PlantVillage class name
PD_TO_PV = {
    "Apple Scab Leaf":            "Apple___Apple_scab",
    "Apple leaf":                 "Apple___healthy",
    "Apple rust leaf":            "Apple___Cedar_apple_rust",
    "Bell_pepper leaf":           "Pepper,_bell___healthy",
    "Bell_pepper leaf spot":      "Pepper,_bell___Bacterial_spot",
    "Blueberry leaf":             "Blueberry___healthy",
    "Cherry leaf":                "Cherry_(including_sour)___healthy",
    "Corn Gray leaf spot":        "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn leaf blight":           "Corn_(maize)___Northern_Leaf_Blight",
    "Corn rust leaf":             "Corn_(maize)___Common_rust_",
    "Peach leaf":                 "Peach___healthy",
    "Potato leaf early blight":   "Potato___Early_blight",
    "Potato leaf late blight":    "Potato___Late_blight",
    "Raspberry leaf":             "Raspberry___healthy",
    "Soyabean leaf":              "Soybean___healthy",
    "Squash Powdery mildew leaf": "Squash___Powdery_mildew",
    "Strawberry leaf":            "Strawberry___healthy",
    "grape leaf":                 "Grape___healthy",
    "grape leaf black rot":       "Grape___Black_rot",
    # tomato mappings
    "Tomato Early blight leaf":   "Tomato___Early_blight",
    "Tomato leaf late blight":    "Tomato___Late_blight",
    "Tomato leaf bacterial spot":  "Tomato___Bacterial_spot",
    "Tomato leaf":                "Tomato___healthy",
    "Tomato Septoria leaf spot":  "Tomato___Septoria_leaf_spot",
    "Tomato mold leaf":           "Tomato___Leaf_Mold",
    "Tomato leaf mosaic virus":   "Tomato___Tomato_mosaic_virus",
    "Tomato leaf yellow virus":   "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    # skip: "Tomato two spotted spider mites leaf" (only 2 images)
}

def gather_images(src_dir, class_name):
    imgs = []
    for ext in ("*.jpg", "*.JPG", "*.jpeg", "*.JPEG", "*.png", "*.PNG"):
        imgs.extend(glob.glob(os.path.join(src_dir, ext)))
    return imgs

def main():
    shutil.rmtree(OUT, ignore_errors=True)

    # 1. Gather PlantVillage images per class
    pv_classes = sorted(d for d in os.listdir(PV) if os.path.isdir(os.path.join(PV, d)))
    print(f"PlantVillage classes: {len(pv_classes)}")

    all_data = {}  # class_name -> list of file paths
    for c in pv_classes:
        files = gather_images(os.path.join(PV, c), c)
        random.shuffle(files)
        all_data[c] = files[:CAP]

    # 2. Add PlantDoc field images to matching classes
    pd_added = 0
    for pd_dir in [PD_TRAIN, PD_TEST]:
        if not os.path.isdir(pd_dir):
            continue
        for folder in os.listdir(pd_dir):
            pv_class = PD_TO_PV.get(folder)
            if not pv_class or pv_class not in all_data:
                continue
            imgs = gather_images(os.path.join(pd_dir, folder), folder)
            all_data[pv_class].extend(imgs)
            pd_added += len(imgs)

    print(f"PlantDoc field images added: {pd_added}")

    # 3. Split into train/val/test (70/15/15) and write to disk
    total = 0
    stats = []
    for c, files in sorted(all_data.items()):
        random.shuffle(files)
        n = len(files)
        ntr = int(n * 0.70)
        nva = int(n * 0.15)
        splits = {
            "train": files[:ntr],
            "val":   files[ntr:ntr+nva],
            "test":  files[ntr+nva:],
        }
        for split, fs in splits.items():
            dest = os.path.join(OUT, split, c)
            os.makedirs(dest, exist_ok=True)
            for i, f in enumerate(fs):
                ext = os.path.splitext(f)[1].lower() or ".jpg"
                shutil.copy2(f, os.path.join(dest, f"img_{i:05d}{ext}"))
        total += n
        stats.append((c, n, len(splits["train"]), len(splits["val"]), len(splits["test"])))

    print(f"\nClasses: {len(all_data)}")
    print(f"Total images: {total}")
    print(f"\n{'Class':50s} {'Total':>6s} {'Train':>6s} {'Val':>6s} {'Test':>6s}")
    print("-" * 80)
    for c, n, tr, va, te in stats:
        print(f"{c:50s} {n:6d} {tr:6d} {va:6d} {te:6d}")

if __name__ == "__main__":
    main()
