import json
import numpy as np
import tensorflow as tf
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix

IMG_SIZE = (224, 224)
model = tf.keras.models.load_model("backend/model/model_v3.keras")
class_names = json.load(open("backend/model/class_names.json"))

test_ds = tf.keras.utils.image_dataset_from_directory(
    "data/split/test", image_size=IMG_SIZE, batch_size=32,
    label_mode="categorical", shuffle=False)

y_true = np.concatenate([np.argmax(y, axis=1) for _, y in test_ds])
y_prob = model.predict(test_ds)
y_pred = np.argmax(y_prob, axis=1)

acc = (y_true == y_pred).mean()
print(f"\nTest accuracy: {acc:.4f}\n")
report = classification_report(y_true, y_pred, target_names=class_names, digits=4)
print(report)
open("docs/classification_report.txt", "w").write(f"Test accuracy: {acc:.4f}\n\n{report}")

cm = confusion_matrix(y_true, y_pred)
plt.figure(figsize=(7, 6))
sns.heatmap(cm, annot=True, fmt="d", cmap="Greens",
            xticklabels=class_names, yticklabels=class_names)
plt.xlabel("Predicted"); plt.ylabel("Actual"); plt.title("Confusion Matrix")
plt.xticks(rotation=30, ha="right"); plt.tight_layout()
plt.savefig("docs/confusion_matrix.png", dpi=150)
print("Saved docs/confusion_matrix.png")