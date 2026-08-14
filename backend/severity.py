"""Estimate disease severity as the fraction of leaf area showing lesions."""
import numpy as np
from PIL import Image
import colorsys

def _to_hsv(arr):
    """arr: HxWx3 uint8 RGB -> HSV floats (h 0-1, s 0-1, v 0-1)."""
    a = arr.astype(np.float32) / 255.0
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    diff = mx - mn + 1e-8
    h = np.zeros_like(mx)
    mask = mx == r
    h[mask] = ((g - b)[mask] / diff[mask]) % 6
    mask = mx == g
    h[mask] = ((b - r)[mask] / diff[mask]) + 2
    mask = mx == b
    h[mask] = ((r - g)[mask] / diff[mask]) + 4
    h = h / 6.0
    s = np.where(mx == 0, 0, (mx - mn) / (mx + 1e-8))
    return h, s, mx

def estimate_severity(pil_img):
    """Returns (label, percent_float)."""
    img = pil_img.convert("RGB").resize((256, 256))
    arr = np.array(img)
    h, s, v = _to_hsv(arr)

    # leaf = anything reasonably saturated and not near-black background
    leaf = (s > 0.20) & (v > 0.15)
    # healthy tissue = green hue band (~65°-170° => 0.18-0.47)
    healthy = leaf & (h > 0.18) & (h < 0.47)
    # lesion = leaf pixels that are brown/yellow/dark, i.e. not green
    lesion = leaf & ~healthy

    leaf_px = leaf.sum()
    if leaf_px < 500:                 # not enough leaf detected
        return "Unknown", 0.0

    pct = float(lesion.sum()) / float(leaf_px) * 100.0

    if pct < 10:   label = "Mild"
    elif pct < 30: label = "Moderate"
    else:          label = "Severe"
    return label, round(pct, 1)


def leaf_coverage(pil_img):
    """Fraction of the frame that looks like plant tissue (0-1).
    Used as an out-of-distribution guard: softmax alone cannot tell that an
    input is not a leaf at all, so we check for plant-like pixels first."""
    import numpy as np
    img = pil_img.convert('RGB').resize((256, 256))
    arr = np.array(img)
    h, s, v = _to_hsv(arr)
    plant = (s > 0.18) & (v > 0.12) & (h > 0.05) & (h < 0.50)
    return float(plant.mean())


def green_fraction(pil_img):
    """Fraction of the frame that is green plant tissue (0-1).
    Skin, wood and background surfaces share the brown/orange hue band with
    blight lesions, so lesion colour alone cannot gate input. Requiring some
    surviving green tissue separates a leaf from a hand or a desk."""
    import numpy as np
    arr = np.array(pil_img.convert('RGB').resize((256, 256)))
    h, s, v = _to_hsv(arr)
    return float(((s > 0.15) & (v > 0.10) & (h > 0.18) & (h < 0.47)).mean())
