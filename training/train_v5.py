"""
Train v5: 59 classes (38 leaf + 21 fruit), combining PlantVillage, PlantDoc,
and two fruit-disease datasets (Kaggle apple/guava/mango/orange/pomegranate,
Mendeley pomegranate). Runs locally on GPU -- no Colab, no callback bug
(EarlyStopping/ReduceLROnPlateau were confirmed broken on this Keras version,
so this script skips them entirely, same as the working 38-class run).
"""
import os, json
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from sklearn.metrics import classification_report

DATA_DIR = os.path.expanduser("~/agrovision/data/multicrop")
MODEL_DIR = os.path.expanduser("~/agrovision/backend/model")
os.makedirs(MODEL_DIR, exist_ok=True)

IMG_SIZE, BATCH, SEED = (224, 224), 32, 42

print("Loading datasets...")
train_ds = tf.keras.utils.image_dataset_from_directory(
    os.path.join(DATA_DIR, "train"), image_size=IMG_SIZE, batch_size=BATCH,
    label_mode="categorical", shuffle=True, seed=SEED)
val_ds = tf.keras.utils.image_dataset_from_directory(
    os.path.join(DATA_DIR, "val"), image_size=IMG_SIZE, batch_size=BATCH,
    label_mode="categorical", shuffle=False)

class_names = train_ds.class_names
num_classes = len(class_names)
print(f"\nClasses: {num_classes}")
for i, c in enumerate(class_names):
    print(f"  {i:2d}  {c}")

AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)

augment = tf.keras.Sequential([
    layers.RandomFlip("horizontal_and_vertical"),
    layers.RandomRotation(0.20),
    layers.RandomZoom(0.20),
], name="augmentation")

base = MobileNetV2(input_shape=IMG_SIZE + (3,), include_top=False, weights="imagenet")
base.trainable = False

inputs = layers.Input(shape=IMG_SIZE + (3,))
x = augment(inputs)
x = layers.Rescaling(1.0 / 127.5, offset=-1)(x)
x = base(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.35)(x)
x = layers.Dense(320, activation="relu")(x)
x = layers.Dropout(0.25)(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)
model = models.Model(inputs, outputs)

print("\n=== Phase 1: training head only ===")
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss="categorical_crossentropy", metrics=["accuracy"])
model.fit(train_ds, validation_data=val_ds, epochs=12)

print("\n=== Phase 2: fine-tuning last 60 base layers ===")
base.trainable = True
for l in base.layers[:-60]:
    l.trainable = False
for l in base.layers:
    if isinstance(l, layers.BatchNormalization):
        l.trainable = False

model.compile(optimizer=tf.keras.optimizers.Adam(2e-5),
              loss="categorical_crossentropy", metrics=["accuracy"])
model.fit(train_ds, validation_data=val_ds, epochs=20)

print("\nSaving model...")
model.save(os.path.join(MODEL_DIR, "model_v5.keras"))
json.dump(class_names, open(os.path.join(MODEL_DIR, "class_names.json"), "w"), indent=2)
print("Saved to", MODEL_DIR)

print("\n=== Classification report (validation set) ===")
yt = np.concatenate([np.argmax(y, 1) for _, y in val_ds])
yp = np.argmax(model.predict(val_ds, verbose=0), 1)
print(classification_report(yt, yp, target_names=class_names, digits=4))
