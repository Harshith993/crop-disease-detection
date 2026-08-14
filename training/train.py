import json, os
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

IMG_SIZE = (224, 224)
BATCH = 32
SEED = 42
EPOCHS_HEAD = 10
EPOCHS_FINETUNE = 10

train_ds = tf.keras.utils.image_dataset_from_directory(
    "data/split/train", image_size=IMG_SIZE, batch_size=BATCH,
    label_mode="categorical", shuffle=True, seed=SEED)
val_ds = tf.keras.utils.image_dataset_from_directory(
    "data/split/val", image_size=IMG_SIZE, batch_size=BATCH,
    label_mode="categorical", shuffle=False)

class_names = train_ds.class_names
print("Class order:", class_names)
num_classes = len(class_names)

AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)

# --- augmentation (matches what you listed on Slide 5) ---
augment = tf.keras.Sequential([
    layers.RandomFlip("horizontal"),
    layers.RandomRotation(0.10),        # ~±36°
    layers.RandomZoom(0.15),
    layers.RandomContrast(0.15),
    layers.RandomBrightness(0.15, value_range=(0, 255)),
], name="augmentation")

base = MobileNetV2(input_shape=IMG_SIZE + (3,),
                   include_top=False, weights="imagenet")
base.trainable = False

inputs = layers.Input(shape=IMG_SIZE + (3,))       # raw 0-255 pixels
x = augment(inputs)
x = layers.Lambda(preprocess_input, name="preprocess")(x)
x = base(x, training=False)                        # keep BatchNorm frozen
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
x = layers.Dense(128, activation="relu")(x)
x = layers.Dropout(0.2)(x)
outputs = layers.Dense(num_classes, activation="softmax")(x)
model = models.Model(inputs, outputs)

model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss="categorical_crossentropy",
              metrics=["accuracy"])
model.summary()

cbs = [
    tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4,
                                     restore_best_weights=True),
    tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5,
                                         patience=2, min_lr=1e-6),
]

# ---------- PHASE 1: train the head ----------
print("\n=== Phase 1: frozen base ===")
h1 = model.fit(train_ds, validation_data=val_ds,
               epochs=EPOCHS_HEAD, callbacks=cbs)

# ---------- PHASE 2: fine-tune the last block ----------
print("\n=== Phase 2: fine-tuning ===")
base.trainable = True
for layer in base.layers[:-30]:          # unfreeze only the last ~30 layers
    layer.trainable = False
for layer in base.layers:                # never unfreeze BatchNorm
    if isinstance(layer, layers.BatchNormalization):
        layer.trainable = False

model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),   # 100x lower LR
              loss="categorical_crossentropy",
              metrics=["accuracy"])
h2 = model.fit(train_ds, validation_data=val_ds,
               epochs=EPOCHS_FINETUNE, callbacks=cbs)

os.makedirs("backend/model", exist_ok=True)
model.save("backend/model/model.h5")
json.dump(class_names, open("backend/model/class_names.json", "w"), indent=2)
print("Saved backend/model/model.h5")

# ---------- training curves for the report ----------
import matplotlib.pyplot as plt
acc = h1.history["accuracy"] + h2.history["accuracy"]
val = h1.history["val_accuracy"] + h2.history["val_accuracy"]
plt.figure(figsize=(7, 4))
plt.plot(acc, label="train"); plt.plot(val, label="val")
plt.axvline(len(h1.history["accuracy"]) - 0.5, ls="--", c="gray")
plt.title("Accuracy (dashed line = fine-tuning starts)")
plt.xlabel("epoch"); plt.ylabel("accuracy"); plt.legend(); plt.grid(alpha=.3)
plt.tight_layout(); plt.savefig("docs/training_curves.png", dpi=150)