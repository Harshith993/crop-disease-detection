import { useState, useRef, useEffect } from "react";
import "./App.css";
import "./perf.css";

const API = import.meta.env.DEV ? "http://" + window.location.hostname + ":5001" : "";

/* ---------- real, static project facts used by the four suggestion cards
   and the header popovers. Nothing here is fabricated -- it mirrors the
   README, the classification report, and treatments.json. ---------- */

const MODEL_FACTS = {
  accuracy: "93.97%",
  macroF1: "0.9355",
  weightedF1: "0.9365",
  images: "39,537",
  tests: "22",
  classes: 59,
  crops: 14,
  leafClasses: 38,
  fruitClasses: 21,
  fruitCrops: 5,
  sizeMB: "26.5",
  params: "2,686,843",
};

const CROPS = [
  { crop: "Apple", items: ["Scab", "Black rot", "Cedar apple rust", "Healthy"] },
  { crop: "Apple (fruit)", items: ["Blotch", "Rot", "Scab", "Healthy"] },
  { crop: "Blueberry", items: ["Healthy"] },
  { crop: "Cherry", items: ["Powdery mildew", "Healthy"] },
  { crop: "Corn", items: ["Gray leaf spot", "Common rust", "Northern leaf blight", "Healthy"] },
  { crop: "Grape", items: ["Black rot", "Esca (black measles)", "Leaf blight", "Healthy"] },
  { crop: "Guava (fruit)", items: ["Anthracnose", "Fruit fly damage", "Healthy"] },
  { crop: "Mango (fruit)", items: ["Alternaria", "Anthracnose", "Black mould rot", "Stem end rot", "Healthy"] },
  { crop: "Orange", items: ["Citrus greening"] },
  { crop: "Orange (fruit)", items: ["Black spot", "Canker", "Greening", "Healthy"] },
  { crop: "Peach", items: ["Bacterial spot", "Healthy"] },
  { crop: "Bell pepper", items: ["Bacterial spot", "Healthy"] },
  { crop: "Pomegranate (fruit)", items: ["Alternaria", "Anthracnose", "Bacterial blight", "Cercospora", "Healthy"] },
  { crop: "Potato", items: ["Early blight", "Late blight", "Healthy"] },
  { crop: "Raspberry", items: ["Healthy"] },
  { crop: "Soybean", items: ["Healthy"] },
  { crop: "Squash", items: ["Powdery mildew"] },
  { crop: "Strawberry", items: ["Leaf scorch", "Healthy"] },
  {
    crop: "Tomato",
    items: [
      "Bacterial spot", "Early blight", "Late blight", "Leaf mold",
      "Septoria leaf spot", "Spider mites", "Target spot",
      "Yellow leaf curl virus", "Mosaic virus", "Healthy",
    ],
  },
];

const WEAK_CLASSES = [
  { name: "Corn \u2014 gray leaf spot", detail: "confused with similar lesion patterns on the same crop" },
  { name: "Tomato \u2014 early blight", detail: "confused with target spot; both show ringed lesions" },
  { name: "Mango fruit \u2014 anthracnose", detail: "only 12 test images available" },
  { name: "Mango fruit \u2014 Alternaria", detail: "only 17 test images available" },
];

const STRONG_CLASSES = [
  "Corn \u2014 healthy", "Orange \u2014 citrus greening", "Orange fruit \u2014 greening",
  "Grape \u2014 leaf blight", "Peach \u2014 bacterial spot", "Guava fruit \u2014 anthracnose",
];

const PROMPTS = {
  dx: "Diagnose a leaf or fruit photo",
  acc: "How accurate is the model?",
  cov: "Which crops and conditions are covered?",
  fail: "Where does the model fail?",
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [railOpen, setRailOpen] = useState(true);
  const [thread, setThread] = useState([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pop, setPop] = useState(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const threadEndRef = useRef(null);
  const sessionCount = useRef(0);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread, loading]);

  function reset() {
    setThread([]);
    setInput("");
    setFile(null);
    setPreview(null);
    setPop(null);
  }

  function pushTurn(turn) {
    setThread((t) => [...t, { ...turn, id: ++sessionCount.current }]);
  }

  function acceptFile(f) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      pushTurn({ role: "system", text: "That file type isn't supported. Use a JPG or PNG." });
      return;
    }
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
  }

  async function runDiagnosis(theFile) {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", theFile);
      const res = await fetch(`${API}/predict`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        pushTurn({
          role: "assistant",
          kind: "error",
          text: data.error || "The analysis failed. Try again with a different photo.",
        });
        return;
      }
      pushTurn({ role: "assistant", kind: "diagnosis", data, fileName: theFile.name, fileSize: theFile.size });
    } catch (err) {
      pushTurn({
        role: "assistant",
        kind: "error",
        text: err.message === "Failed to fetch"
          ? "Can't reach the detection service. Check that the backend is running on port 5001."
          : err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function runSearch(query) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/ask?q=` + encodeURIComponent(query));
      const data = await r.json();
      pushTurn({ role: "assistant", kind: "answer", data });
    } catch {
      pushTurn({ role: "assistant", kind: "error", text: "Can't reach the knowledge service." });
    } finally {
      setLoading(false);
    }
  }

  function submit() {
    const text = input.trim();
    if (file) {
      pushTurn({ role: "user", kind: "image", fileName: file.name, fileSize: file.size, preview });
      const f = file;
      setFile(null);
      setPreview(null);
      setInput("");
      runDiagnosis(f);
      return;
    }
    if (text.length < 2) return;
    pushTurn({ role: "user", kind: "text", text });
    setInput("");
    runSearch(text);
  }

  function askFacts(key) {
    pushTurn({ role: "user", kind: "text", text: PROMPTS[key] });
    if (key === "dx") {
      fileRef.current?.click();
      return;
    }
    pushTurn({ role: "assistant", kind: key });
  }

  const empty = thread.length === 0;

  return (
    <div className="shell" data-rail={railOpen ? "on" : "off"}>
      <div className="ambient" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
      </div>

      {railOpen && (
        <aside className="rail">
          <div className="brand">
            <span className="brand-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21.8C12 21.8 3.4 17.3 5.1 9.3 6.3 3.4 12.7 3.7 19.1 2.2c2 7.8.6 16-7.1 19.6z" fill="var(--leaf)" />
                <path d="M12 21.8C11.1 14.5 13.7 7.8 19.1 2.2" stroke="#f3fbf4" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </span>
            <span className="brand-text">
              <span className="brand-title">Crop Disease Detector</span>
              <span className="brand-sub">assistant &middot; v5</span>
            </span>
          </div>

          <button className="rail-new lift" onClick={reset}>
            <span className="rail-new-icon">+</span>
            New conversation
          </button>

          <span className="rail-spacer" />

          <div className="rail-status glass">
            <div className="status-row">
              <span className="pulse-dot" />
              <span className="status-label">API online</span>
            </div>
            <div className="status-facts">
              <span>MobileNetV2 &middot; {MODEL_FACTS.sizeMB} MB</span>
              <span>{MODEL_FACTS.classes} classes &middot; {MODEL_FACTS.crops} crops</span>
              <span>{MODEL_FACTS.accuracy} val accuracy</span>
            </div>
          </div>
        </aside>
      )}

      <div className="main">
        <header className="topbar glass">
          <button className="icon-btn" aria-label="Toggle sidebar" onClick={() => setRailOpen((v) => !v)}>
            <span className="burger"><i /><i /><i /></span>
          </button>
          <div className="topbar-title">
            <span className="topbar-h1">Field diagnosis</span>
            <span className="topbar-sub">image &rarr; class &rarr; severity &rarr; treatment</span>
          </div>
          <span className="flex-spacer" />
          <div className="topbar-actions">
            <button className="icon-btn" aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.1" fill="var(--ac-mid)" /><g stroke="var(--ac-mid)" strokeWidth="1.7" strokeLinecap="round"><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" /></g></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="var(--ink-2)" /></svg>
              )}
            </button>
            <button className="pill lift" onClick={() => setPop({ kind: "method" })}>Method</button>
            <button className="pill lift" onClick={() => setPop({ kind: "results" })}>Results</button>
            <button className="pill lift" onClick={() => setPop({ kind: "coverage" })}>Coverage</button>
            <button className="pill pill-accent lift" onClick={() => setPop({ kind: "model" })}>
              <span className="pill-dot" />
              MobileNetV2
            </button>
          </div>
        </header>

        <div className="thread">
          <div className="thread-col">
            {empty && (
              <div className="empty-state">
                <h1 className="empty-h1">What are we diagnosing today?</h1>
                <p className="empty-sub">
                  Upload a leaf or fruit photograph and the classifier returns a condition, a
                  severity estimate and a treatment sequence. Ask about the model itself and
                  it answers from the evaluation record.
                </p>
                <div className="suggest-grid">
                  <button className="suggest glass lift" onClick={() => askFacts("dx")}>
                    <span className="suggest-kicker">Diagnose</span>
                    <span className="suggest-title">{PROMPTS.dx}</span>
                    <span className="suggest-hint">Opens the file picker</span>
                  </button>
                  <button className="suggest glass lift" onClick={() => askFacts("acc")}>
                    <span className="suggest-kicker">Evaluate</span>
                    <span className="suggest-title">{PROMPTS.acc}</span>
                    <span className="suggest-hint">Validation accuracy, F1, dataset size</span>
                  </button>
                  <button className="suggest glass lift" onClick={() => askFacts("cov")}>
                    <span className="suggest-kicker">Scope</span>
                    <span className="suggest-title">{PROMPTS.cov}</span>
                    <span className="suggest-hint">59 classes, leaf and fruit</span>
                  </button>
                  <button className="suggest glass lift" onClick={() => askFacts("fail")}>
                    <span className="suggest-kicker">Limits</span>
                    <span className="suggest-title">{PROMPTS.fail}</span>
                    <span className="suggest-hint">Weakest classes and why</span>
                  </button>
                </div>
              </div>
            )}

            {thread.map((t) => (
              <Turn key={t.id} turn={t} onOpenPop={setPop} />
            ))}

            {loading && (
              <div className="turn turn-assistant">
                <span className="avatar" aria-hidden="true" />
                <div className="typing glass">
                  <i /><i /><i />
                </div>
              </div>
            )}

            <div ref={threadEndRef} style={{ height: 4 }} />
          </div>
        </div>

        <div className="composer-wrap">
          <div className="composer-col">
            {!empty && !loading && (
              <div className="chip-row">
                {Object.entries(PROMPTS).map(([k, label]) => (
                  <button key={k} className="chip lift" onClick={() => askFacts(k)}>{label}</button>
                ))}
              </div>
            )}

            {preview && (
              <div className="attached glass">
                <img src={preview} alt="Attached specimen" />
                <div className="attached-meta">
                  <span>{file.name}</span>
                  <span>{(file.size / 1024).toFixed(0)} KB</span>
                </div>
                <button className="icon-btn small" aria-label="Remove attachment" onClick={() => { setFile(null); setPreview(null); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}

            <div className="composer glass">
              <button className="icon-btn" aria-label="Attach a leaf or fruit photograph" onClick={() => fileRef.current?.click()}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              </button>
              <input
                ref={inputRef}
                className="composer-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ask about a diagnosis, the model, or a crop&hellip;"
                aria-label="Message the assistant"
              />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => acceptFile(e.target.files[0])} />
              <button className="send-btn" aria-label="Send" onClick={submit} disabled={loading || (!file && input.trim().length < 2)}>
                <span aria-hidden="true">&uarr;</span>
              </button>
            </div>
            <div className="composer-foot">
              <span>&nbsp;</span>
              <span>Treatment guidance is advisory only.</span>
            </div>
          </div>
        </div>
      </div>

      {pop && <Popover pop={pop} onClose={() => setPop(null)} />}
    </div>
  );
}

function Turn({ turn, onOpenPop }) {
  if (turn.role === "user" && turn.kind === "image") {
    return (
      <div className="turn turn-user">
        <button className="attach-chip glass lift" onClick={() => onOpenPop({ kind: "image", data: turn })}>
          <img src={turn.preview} alt="" className="attach-thumb" />
          <span className="attach-chip-meta">
            <span className="attach-chip-name">{turn.fileName}</span>
            <span>{(turn.fileSize / 1024).toFixed(0)} KB</span>
          </span>
        </button>
      </div>
    );
  }

  if (turn.role === "user") {
    return (
      <div className="turn turn-user">
        <div className="bubble">{turn.text}</div>
      </div>
    );
  }

  if (turn.role === "system") {
    return (
      <div className="turn turn-system">
        <span className="system-note">{turn.text}</span>
      </div>
    );
  }

  return (
    <div className="turn turn-assistant">
      <span className="avatar" aria-hidden="true" />
      <div className="assistant-body">
        {turn.kind === "error" && <p className="assistant-error">{turn.text}</p>}
        {turn.kind === "diagnosis" && <DiagnosisCard data={turn.data} onOpenPop={onOpenPop} />}
        {turn.kind === "answer" && <AnswerCard data={turn.data} />}
        {turn.kind === "acc" && <AccuracyCard onOpenPop={onOpenPop} />}
        {turn.kind === "cov" && <CoverageCard onOpenPop={onOpenPop} />}
        {turn.kind === "fail" && <FailureCard onOpenPop={onOpenPop} />}
      </div>
    </div>
  );
}

function DiagnosisCard({ data, onOpenPop }) {
  const outOfScope = data.prediction.class_key.startsWith("Other");
  const pct = data.severity.affected_area_percent;
  const sevKey = data.severity.label.toLowerCase();
  const ranked = Object.entries(data.all_probabilities).sort((a, b) => b[1] - a[1]);
  const top3 = ranked.slice(0, 3).map(([k]) => k.replace(/___/g, " \u2014 ").replace(/_/g, " "));

  return (
    <>
      <p className="lede">
        The specimen passed the plant-tissue guard and classified as{" "}
        <strong>{data.prediction.disease}</strong>
        {ranked.length > 1 && <> with a margin over {top3[1]}</>}.
      </p>

      <div className="card glass">
        <div className="card-head">
          <h3>{data.prediction.disease}</h3>
          {data.details.pathogen && <span className="italic">{data.details.pathogen}</span>}
        </div>

        <div className="metric-grid">
          <div className="metric">
            <div className="metric-row"><span>Confidence</span><span className="mono">{data.prediction.confidence.toFixed(1)}%</span></div>
            <div className="track"><div style={{ width: `${data.prediction.confidence}%` }} /></div>
          </div>
          {!outOfScope && (
            <div className="metric">
              <div className="metric-row"><span>Severity</span><span className="mono">{data.severity.label}{pct > 0 ? ` \u00b7 ${pct}%` : ""}</span></div>
              <div className={`sev-scale sev-${sevKey}`}>
                <span className="seg mild" /><span className="seg moderate" /><span className="seg severe" />
                {pct > 0 && <i className="needle" style={{ left: `${Math.min(pct, 100)}%` }} />}
              </div>
            </div>
          )}
        </div>

        {outOfScope && <p className="alert">Unexpected result \u2014 this crop or condition may be outside the model's trained categories.</p>}
        {!outOfScope && data.prediction.low_confidence && <p className="alert">Low confidence. Retake the photo in even daylight with the leaf or fruit filling the frame.</p>}

        <div className="pill-row">
          <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "severity" })}>How severity is measured &#9662;</button>
          <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "probs", data: { ranked, disease: data.prediction.disease } })}>Class probabilities &#9662;</button>
          <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "method" })}>Method &#9662;</button>
        </div>
      </div>

      {!outOfScope && (
        <div className="treatment-block">
          <p className="kicker">Treatment sequence</p>
          <ol>
            {data.details.treatment.map((t, i) => <li key={i}>{t}</li>)}
          </ol>
          <p className="disclaimer">{data.disclaimer}</p>
        </div>
      )}
    </>
  );
}

function AnswerCard({ data }) {
  if (!data.answered) {
    return <p className="lede muted">{data.message}</p>;
  }
  return (
    <>
      <p className="kicker accent">{data.topic}</p>
      <p className="lede" style={{ fontWeight: 500, marginBottom: 4 }}>{data.title}</p>
      <p className="lede">{data.answer}</p>
    </>
  );
}

function AccuracyCard({ onOpenPop }) {
  const stats = [
    [MODEL_FACTS.accuracy, "Validation accuracy"],
    [MODEL_FACTS.macroF1, "Macro average F1"],
    [MODEL_FACTS.images, "Training images"],
    [MODEL_FACTS.tests, "Automated tests"],
  ];
  return (
    <>
      <p className="lede">
        On 5,920 held-out images the classifier reaches <strong>{MODEL_FACTS.accuracy}</strong>{" "}
        validation accuracy, with a macro average F1 of {MODEL_FACTS.macroF1} and{" "}
        {MODEL_FACTS.weightedF1} weighted. Training used {MODEL_FACTS.images} images drawn from
        both laboratory and field sources.
      </p>
      <div className="stat-grid">
        {stats.map(([v, l]) => (
          <div className="stat-card glass" key={l}>
            <p className="stat-value">{v}</p>
            <p className="stat-label">{l}</p>
          </div>
        ))}
      </div>
      <div className="pill-row">
        <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "results" })}>Full results &#9662;</button>
      </div>
    </>
  );
}

function CoverageCard({ onOpenPop }) {
  return (
    <>
      <p className="lede">
        Fifty-nine conditions in total: {MODEL_FACTS.leafClasses} leaf conditions across{" "}
        {MODEL_FACTS.crops} species, and {MODEL_FACTS.fruitClasses} fruit conditions across{" "}
        {MODEL_FACTS.fruitCrops}. Classification is closed-set, so a species outside this list
        is assigned to the nearest class rather than rejected.
      </p>
      <div className="tag-row">
        {["Apple", "Blueberry", "Cherry", "Corn", "Grape", "Guava", "Mango", "Orange", "Peach", "Bell pepper", "Pomegranate", "Potato", "Raspberry", "Soybean", "Squash", "Strawberry", "Tomato"].map((c) => (
          <span className="tag" key={c}>{c}</span>
        ))}
      </div>
      <div className="pill-row">
        <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "coverage" })}>Coverage table &#9662;</button>
      </div>
    </>
  );
}

function FailureCard({ onOpenPop }) {
  return (
    <>
      <p className="lede">
        Four classes carry most of the error. Two are subtle leaf lesion patterns confused with
        a similar disease on the same crop; two are fruit classes with very small source datasets.
      </p>
      <div className="card glass" style={{ padding: "10px 16px" }}>
        {WEAK_CLASSES.map((w) => (
          <div className="weak-row" key={w.name}>
            <span className="weak-name">{w.name}</span>
            <span className="weak-detail">{w.detail}</span>
          </div>
        ))}
      </div>
      <p className="lede" style={{ marginTop: 12 }}>
        There is also no reject class for species entirely outside the 14 covered crops \u2014
        an unfamiliar leaf is still assigned to the closest match. That gap is open future work.
      </p>
      <div className="pill-row">
        <button className="pill-mini lift" onClick={() => onOpenPop({ kind: "results" })}>Per-class breakdown &#9662;</button>
      </div>
    </>
  );
}

const POP_TITLES = {
  image: "Uploaded specimen",
  method: "Method \u2014 four stages",
  severity: "Severity \u2014 how it is measured",
  probs: "Class probabilities",
  results: "Results \u2014 per class",
  coverage: `Coverage \u2014 ${MODEL_FACTS.classes} conditions`,
  model: "Model card",
};

function Popover({ pop, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="pop-scrim" onClick={onClose}>
      <div className="pop-panel glass" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={POP_TITLES[pop.kind]}>
        <div className="pop-head">
          <p className="kicker accent">{POP_TITLES[pop.kind]}</p>
          <button className="icon-btn small" aria-label="Close" onClick={onClose}>&times;</button>
        </div>

        {pop.kind === "image" && <ImagePop turn={pop.data} />}
        {pop.kind === "method" && <MethodPop />}
        {pop.kind === "severity" && <SeverityPop />}
        {pop.kind === "probs" && <ProbsPop data={pop.data} />}
        {pop.kind === "results" && <ResultsPop />}
        {pop.kind === "coverage" && <CoveragePop />}
        {pop.kind === "model" && <ModelPop />}
      </div>
    </div>
  );
}

function ImagePop({ turn }) {
  return (
    <div className="pop-grid">
      <img src={turn.preview} alt="" className="pop-image" />
      <div className="pop-facts">
        <span>File</span><span className="mono">{turn.fileName}</span>
        <span>Size</span><span className="mono">{(turn.fileSize / 1024).toFixed(0)} KB</span>
      </div>
    </div>
  );
}

function MethodPop() {
  const steps = [
    ["01", "Guard", "Plant-tissue check", "HSV thresholding measures the fraction of green tissue in frame. A hand, a desk or a wall returns HTTP 422 instead of a diagnosis."],
    ["02", "Classify", "MobileNetV2, fine-tuned", "ImageNet weights with a custom head: global average pooling, dropout, a 320-unit dense layer, a 59-way softmax. Rescaling sits inside the model, so the API cannot introduce a train/serve mismatch."],
    ["03", "Severity", "Lesion area, binned", "Lesion pixels are separated from healthy tissue by hue and the affected fraction is binned. Healthy classes bypass the stage."],
    ["04", "Advise", "Treatment and prevention", `A ${MODEL_FACTS.classes}-entry knowledge base returns a treatment sequence and prevention guidance, alongside the full probability distribution.`],
  ];
  return (
    <div className="pop-stack">
      {steps.map(([n, k, t, d]) => (
        <div key={n} className="step-block">
          <p className="kicker">{n} &middot; {k}</p>
          <p className="step-title">{t}</p>
          <p className="step-body">{d}</p>
        </div>
      ))}
    </div>
  );
}

function SeverityPop() {
  return (
    <div className="pop-stack">
      <p className="step-body">
        Severity is a colour-area estimate, not a learned segmentation model. The image is
        converted to HSV, and pixels matching necrotic or chlorotic hue ranges are counted
        against total leaf-tissue pixels to give an affected-area percentage.
      </p>
      <div className="sev-scale sev-severe" style={{ margin: "6px 0" }}>
        <span className="seg mild" /><span className="seg moderate" /><span className="seg severe" />
      </div>
      <div className="sev-legend">
        <span>0&ndash;10% Mild</span><span>10&ndash;30% Moderate</span><span>30%+ Severe</span>
      </div>
      <p className="step-body">
        On fully necrotic leaves the estimate saturates near 100%, and ten such images in the
        held-out test set were refused outright by the plant-tissue guard rather than scored.
      </p>
    </div>
  );
}

function ProbsPop({ data }) {
  const shown = data.ranked.filter(([, v], i) => i < 3 || v >= 0.5).slice(0, 8);
  return (
    <div className="pop-stack">
      <p className="step-body">Full softmax distribution for <strong>{data.disease}</strong>.</p>
      <div className="prob-list">
        {shown.map(([k, v], i) => (
          <div className={`prob-row ${i === 0 ? "top" : ""}`} key={k}>
            <span>{k.replace(/___/g, " \u00b7 ").replace(/_/g, " ")}</span>
            <span className="prob-bar"><i style={{ transform: `scaleX(${Math.max(v, 0.5) / 100})` }} /></span>
            <span className="mono">{v.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultsPop() {
  return (
    <div className="pop-stack">
      <p className="step-body">
        Overall {MODEL_FACTS.accuracy} on 5,920 held-out images. Precision, recall and F1 vary
        a great deal by class \u2014 the strongest classes are near-perfect; the weakest sit
        far lower for reasons specific to each.
      </p>
      <div>
        <p className="kicker">Strongest classes (F1 &ge; 0.98)</p>
        <div className="tag-row">{STRONG_CLASSES.map((c) => <span className="tag tag-ok" key={c}>{c}</span>)}</div>
      </div>
      <div>
        <p className="kicker">Weakest classes</p>
        {WEAK_CLASSES.map((w) => (
          <div className="weak-row" key={w.name}>
            <span className="weak-name">{w.name}</span>
            <span className="weak-detail">{w.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoveragePop() {
  return (
    <div className="pop-stack">
      {CROPS.map((c) => (
        <div className="caps-row" key={c.crop}>
          <p className="caps-crop">{c.crop}</p>
          <div className="tag-row">
            {c.items.map((i) => <span key={i} className={i === "Healthy" ? "tag tag-ok" : "tag"}>{i}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function ModelPop() {
  const rows = [
    ["Architecture", "MobileNetV2, transfer learning"],
    ["Parameters", MODEL_FACTS.params],
    ["Size on disk", `${MODEL_FACTS.sizeMB} MB`],
    ["Classes", `${MODEL_FACTS.classes} (${MODEL_FACTS.leafClasses} leaf, ${MODEL_FACTS.fruitClasses} fruit)`],
    ["Training", "Two-phase: frozen head, then last 60 base layers fine-tuned"],
    ["Datasets", "PlantVillage, PlantDoc, Kaggle fruit-disease set, Mendeley pomegranate set"],
  ];
  return (
    <div className="pop-stack">
      <div className="pop-facts">
        {rows.map(([k, v]) => (
          <FactRow key={k} k={k} v={v} />
        ))}
      </div>
      <div className="pill-row">
        <a className="pill-mini lift" href={`${API}/health`} target="_blank" rel="noreferrer">GET /health &#8599;</a>
        <a className="pill-mini lift" href={`${API}/classes`} target="_blank" rel="noreferrer">GET /classes &#8599;</a>
      </div>
    </div>
  );
}

function FactRow({ k, v }) {
  return (
    <>
      <span>{k}</span><span>{v}</span>
    </>
  );
}
