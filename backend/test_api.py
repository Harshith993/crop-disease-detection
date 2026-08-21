import io, requests, pytest
from PIL import Image, ImageDraw
import random, glob

BASE = "http://localhost:5001"

def _leaf(size=(300, 300)):
    """Synthetic green leaf-like image that passes the plant-tissue guard."""
    im = Image.new("RGB", size, (28, 60, 30))
    d = ImageDraw.Draw(im)
    d.ellipse([20, 30, size[0] - 20, size[1] - 30], fill=(86, 140, 62))
    return im

def _jpeg(im):
    b = io.BytesIO(); im.save(b, "JPEG"); b.seek(0); return b

def _post(fileobj, name="t.jpg", mime="image/jpeg"):
    return requests.post(f"{BASE}/predict", files={"image": (name, fileobj, mime)})

# --- service ---
def test_health_ok():
    r = requests.get(f"{BASE}/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"

def test_health_lists_expected_classes():
    n = len(requests.get(f"{BASE}/health").json()["classes"])
    assert n in (4, 5, 38)

def test_ask_returns_answer():
    r = requests.get(f"{BASE}/ask", params={"q": "why are my leaves yellow"})
    assert r.status_code == 200
    d = r.json()
    assert d["answered"] and d["score"] > 0.1

def test_ask_declines_off_topic():
    d = requests.get(f"{BASE}/ask", params={"q": "who won the world cup"}).json()
    assert d["answered"] is False

def test_ask_short_query_declined():
    d = requests.get(f"{BASE}/ask", params={"q": "ab"}).json()
    assert d["answered"] is False

def test_topics_endpoint():
    t = requests.get(f"{BASE}/topics").json()["topics"]
    assert len(t) >= 5

def test_classes_endpoint_has_display_names():
    data = requests.get(f"{BASE}/classes").json()["classes"]
    assert all("display_name" in c for c in data)

# --- input validation ---
def test_missing_file_returns_400():
    assert requests.post(f"{BASE}/predict").status_code == 400

def test_wrong_mimetype_returns_415():
    r = _post(io.BytesIO(b"not an image"), "t.txt", "text/plain")
    assert r.status_code == 415

def test_corrupt_image_returns_400():
    r = _post(io.BytesIO(b"\xff\xd8\xffgarbage"), "broken.jpg")
    assert r.status_code == 400

def test_oversize_file_returns_413():
    big = Image.new("RGB", (5000, 5000), (10, 90, 10))
    r = _post(_jpeg(big))
    assert r.status_code in (413, 200)

# --- out-of-distribution guard ---
def test_non_plant_image_rejected_422():
    r = _post(_jpeg(Image.new("RGB", (300, 300), (120, 120, 130))))
    assert r.status_code == 422
    assert "plant tissue" in r.json()["error"].lower()

def test_skin_tone_rejected():
    r = _post(_jpeg(Image.new("RGB", (300, 300), (214, 168, 140))))
    assert r.status_code == 422

# --- prediction contract ---
def test_valid_leaf_returns_full_contract():
    r = _post(_jpeg(_leaf()))
    assert r.status_code == 200
    d = r.json()
    for key in ("success", "prediction", "severity", "details", "all_probabilities", "disclaimer"):
        assert key in d
    p = d["prediction"]
    assert 0 <= p["confidence"] <= 100
    assert isinstance(p["low_confidence"], bool)
    assert d["severity"]["label"] in ("None", "Mild", "Moderate", "Severe", "Unknown")
    assert len(d["details"]["treatment"]) >= 1

def test_probabilities_sum_to_100():
    d = _post(_jpeg(_leaf())).json()
    assert abs(sum(d["all_probabilities"].values()) - 100) < 0.5

def test_predicted_class_is_argmax():
    d = _post(_jpeg(_leaf())).json()
    top = max(d["all_probabilities"], key=d["all_probabilities"].get)
    assert d["prediction"]["class_key"] == top

# --- real data accuracy ---
@pytest.mark.parametrize("cls", [
    "Tomato___Bacterial_spot", "Tomato___Early_blight",
    "Tomato___Late_blight", "Tomato___healthy"])
def test_real_images_mostly_correct(cls):
    files = sorted(glob.glob(f"../data/split/test/{cls}/*"))[:15]
    correct = 0
    for f in files:
        d = _post(open(f, "rb"), "x.jpg").json()
        if d.get("success") and d["prediction"]["class_key"] == cls:
            correct += 1
    assert correct / len(files) >= 0.65, f"{cls}: {correct}/{len(files)}"

def test_healthy_leaf_reports_no_severity():
    f = sorted(glob.glob("../data/split/test/Tomato___healthy/*"))[0]
    d = _post(open(f, "rb"), "h.jpg").json()
    if d["prediction"]["class_key"].endswith("healthy"):
        assert d["severity"]["label"] == "None"


# --- knowledge search (Phase 6b) ---
def test_ask_returns_answer():
    d = requests.get(f'{BASE}/ask', params={'q': 'why are my leaves yellow'}).json()
    assert d['answered'] and d['score'] > 0.1

def test_ask_declines_off_topic():
    d = requests.get(f'{BASE}/ask', params={'q': 'who won the world cup'}).json()
    assert d['answered'] is False

def test_ask_short_query_declined():
    d = requests.get(f'{BASE}/ask', params={'q': 'ab'}).json()
    assert d['answered'] is False

def test_ask_returns_ranked_results():
    d = requests.get(f'{BASE}/ask', params={'q': 'how do i treat late blight'}).json()
    scores = [r['score'] for r in d['results']]
    assert scores == sorted(scores, reverse=True)

def test_topics_endpoint():
    t = requests.get(f'{BASE}/topics').json()['topics']
    assert len(t) >= 5
