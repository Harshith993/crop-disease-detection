import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = import.meta.env.DEV ? "http://" + window.location.hostname + ":5001" : "";

const EXAMPLES = [
  "Why are my leaves yellow?",
  "How do I treat late blight?",
  "What pH does tomato soil need?",
  "Tiny white flies on my plants",
];

const CROPS = [
  { crop: "Apple", items: ["Scab", "Black rot", "Cedar apple rust", "Healthy"] },
  { crop: "Blueberry", items: ["Healthy"] },
  { crop: "Cherry", items: ["Powdery mildew", "Healthy"] },
  { crop: "Corn", items: ["Gray leaf spot", "Common rust", "Northern leaf blight", "Healthy"] },
  { crop: "Grape", items: ["Black rot", "Esca (black measles)", "Leaf blight", "Healthy"] },
  { crop: "Orange", items: ["Citrus greening"] },
  { crop: "Peach", items: ["Bacterial spot", "Healthy"] },
  { crop: "Bell pepper", items: ["Bacterial spot", "Healthy"] },
  { crop: "Potato", items: ["Early blight", "Late blight", "Healthy"] },
  { crop: "Raspberry", items: ["Healthy"] },
  { crop: "Soybean", items: ["Healthy"] },
  { crop: "Squash", items: ["Powdery mildew"] },
  { crop: "Strawberry", items: ["Leaf scorch", "Healthy"] },
  {
    crop: "Tomato",
    items: [
      "Bacterial spot",
      "Early blight",
      "Late blight",
      "Leaf mold",
      "Septoria leaf spot",
      "Spider mites",
      "Target spot",
      "Yellow leaf curl virus",
      "Mosaic virus",
      "Healthy",
    ],
  },
];

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const resultRef = useRef(null);

  const [q, setQ] = useState("");
  const [ans, setAns] = useState(null);
  const [asking, setAsking] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [capsOpen, setCapsOpen] = useState(false);

  const isTouch =
    typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [motion, setMotion] = useState(() => localStorage.getItem("motion") !== "off");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    localStorage.setItem("motion", motion ? "on" : "off");
  }, [motion]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        setSignInOpen(false);
        setAboutOpen(false);
        setCapsOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function accept(f) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("That file type isn't supported. Use a JPG or PNG.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }

  async function examine() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`${API}/predict`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The analysis failed. Try again.");
      setResult(data);
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        90
      );
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Can't reach the detection service. Check that the backend is running on port 5001."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function ask(text) {
    const query = (text ?? q).trim();
    if (query.length < 3) return;
    setQ(query);
    setAsking(true);
    try {
      const r = await fetch(`${API}/ask?q=` + encodeURIComponent(query));
      setAns(await r.json());
    } catch {
      setAns({ answered: false, message: "Can't reach the knowledge service." });
    } finally {
      setAsking(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const outOfScope = result ? result.prediction.class_key.startsWith("Other") : false;
  const ranked = result
    ? Object.entries(result.all_probabilities).sort((a, b) => b[1] - a[1])
    : [];
  const pct = result ? result.severity.affected_area_percent : 0;
  const sevKey = result ? result.severity.label.toLowerCase() : "none";
  const started = Boolean(file || result || ans);

  return (
    <div className="app">
      <aside className="rail">
        <button
          className="rail-btn"
          title="New analysis"
          aria-label="New analysis"
          onClick={() => {
            reset();
            setAns(null);
            setQ("");
          }}
        >
          <svg viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          className="rail-btn"
          title="Upload leaf"
          aria-label="Upload leaf"
          onClick={() => inputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24">
            <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            <path d="M12 16V4M8 8l4-4 4 4" />
          </svg>
        </button>
        <div className="rail-spacer" />
        <button
          className="rail-btn"
          title="Settings"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.9 14.6a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.6 1.6 0 00-1-1.4 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 110-4h.2a1.6 1.6 0 001.4-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 114 0v.2a1.6 1.6 0 001 1.4 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 110 4h-.2a1.6 1.6 0 00-1.4 1z" />
          </svg>
        </button>
        <button
          className="rail-btn"
          title="Account"
          aria-label="Account"
          onClick={() => setSignInOpen(true)}
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0116 0" />
          </svg>
        </button>
      </aside>

      <div className="shell">
        <header className="topbar">
          <nav>
            <button className="nav-link" onClick={() => setAboutOpen(true)}>
              About
            </button>
            <button className="nav-link" onClick={() => setCapsOpen(true)}>
              Capabilities
            </button>
            <button className="nav-link" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
          </nav>
          <button className="signin" onClick={() => setSignInOpen(true)}>
            Sign in
          </button>
        </header>

        <main className={`stage ${started ? "engaged" : ""}`}>
          <section className="hero">
            <h1>
              <span className="grad">Crop disease detection</span>
            </h1>
            <p className="sub">Upload a tomato leaf, or ask about crops and pests</p>

            <div className="composer">
              <button
                className="composer-btn"
                aria-label="Add leaf image"
                onClick={() => inputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>

              <input
                className="composer-input"
                type="text"
                value={q}
                placeholder="Ask about crops, leaves, pests or soil"
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && ask()}
                aria-label="Ask a question"
              />

              <span className="model-chip">MobileNetV2</span>

              {isTouch && (
                <button
                  className="composer-btn"
                  aria-label="Take photo"
                  onClick={() => cameraRef.current?.click()}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M3 8a2 2 0 012-2h2l1.5-2h7L17 6h2a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <circle cx="12" cy="12.5" r="3.2" />
                  </svg>
                </button>
              )}

              <button
                className="composer-send"
                aria-label="Ask"
                onClick={() => ask()}
                disabled={asking || q.trim().length < 3}
              >
                <svg viewBox="0 0 24 24">
                  <path d="M5 12h13M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png"
              hidden
              onChange={(e) => accept(e.target.files[0])}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => accept(e.target.files[0])}
            />

            {!ans && !file && (
              <div className="suggestions">
                {EXAMPLES.map((e, i) => (
                  <button
                    key={e}
                    className="suggestion"
                    style={{ animationDelay: `${0.3 + i * 0.07}s` }}
                    onClick={() => ask(e)}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </section>

          {ans && (
            <section className="card answer-card">
              {!ans.answered ? (
                <p className="muted">{ans.message}</p>
              ) : (
                <>
                  <p className="kicker">{ans.topic}</p>
                  <h2>{ans.title}</h2>
                  <p className="body">{ans.answer}</p>
                  <div className="card-foot">
                    {ans.results.slice(1).map((r) => (
                      <button key={r.id} className="pill" onClick={() => ask(r.title)}>
                        {r.title}
                      </button>
                    ))}
                    <button
                      className="pill ghost"
                      onClick={() => {
                        setAns(null);
                        setQ("");
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {(file || result || loading) && (
            <section className="analysis" ref={resultRef}>
              <div className="card specimen-card">
                <p className="kicker">Specimen</p>
                <div
                  className={`drop ${dragging ? "dragging" : ""} ${preview ? "loaded" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => inputRef.current?.click()}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") && inputRef.current?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    accept(e.dataTransfer.files[0]);
                  }}
                >
                  {preview ? (
                    <img src={preview} alt="Leaf specimen" />
                  ) : (
                    <p className="muted">Drop a leaf image</p>
                  )}
                </div>
                {file && (
                  <p className="filemeta">
                    <span>{file.name}</span>
                    <span>{(file.size / 1024).toFixed(0)} KB</span>
                  </p>
                )}
                <div className="row">
                  <button className="btn primary" onClick={examine} disabled={!file || loading}>
                    {loading ? "Analyzing" : "Analyze leaf"}
                  </button>
                  <button className="btn" onClick={reset}>
                    Clear
                  </button>
                </div>
                {loading && <div className="beam" aria-hidden="true" />}
                {error && <p className="alert error">{error}</p>}
              </div>

              <div className="card result-card">
                <p className="kicker">Diagnosis</p>

                {loading && (
                  <div className="skeleton">
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                )}

                {!result && !loading && (
                  <p className="muted">Run an analysis to see the diagnosis.</p>
                )}

                {result && !loading && (
                  <div className="reveal">
                    <h2 className="verdict">{result.prediction.disease}</h2>
                    {result.details.pathogen && (
                      <p className="muted italic">{result.details.pathogen}</p>
                    )}

                    <div className="metric">
                      <div className="metric-head">
                        <span>Confidence</span>
                        <span className="num">{result.prediction.confidence.toFixed(1)}%</span>
                      </div>
                      <div className="track">
                        <div style={{ width: `${result.prediction.confidence}%` }} />
                      </div>
                    </div>

                    {!outOfScope && (
                      <div className="metric">
                        <div className="metric-head">
                          <span>Severity</span>
                          <span className="num">
                            {result.severity.label}
                            {pct > 0 && ` · ${pct}%`}
                          </span>
                        </div>
                        <div className={`scale sev-${sevKey}`}>
                          <span className="seg mild" />
                          <span className="seg moderate" />
                          <span className="seg severe" />
                          {pct > 0 && (
                            <i className="needle" style={{ left: `${Math.min(pct, 100)}%` }} />
                          )}
                        </div>
                        <div className="scale-legend">
                          <span>Mild</span>
                          <span>Moderate</span>
                          <span>Severe</span>
                        </div>
                      </div>
                    )}

                    {outOfScope && (
                      <p className="alert warn">
                        Unexpected result. This crop or condition may be outside the 38 the model was trained on.
                      </p>
                    )}
                    {!outOfScope && result.prediction.low_confidence && (
                      <p className="alert warn">
                        Low confidence. Retake the photo in even daylight with the leaf filling
                        the frame.
                      </p>
                    )}

                    {result.details.symptoms && (
                      <div className="section">
                        <p className="kicker">What this looks like</p>
                        <p className="body">{result.details.symptoms}</p>
                      </div>
                    )}

                    <div className="section">
                      <p className="kicker">Treatment</p>
                      <ol className="steps">
                        {result.details.treatment.map((t, i) => (
                          <li key={i}>
                            <span className="dot">{i + 1}</span>
                            {t}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="section">
                      <p className="kicker">Prevention</p>
                      <ul className="bullets">
                        {result.details.prevention.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="section">
                      <p className="kicker">Class probabilities</p>
                      {ranked.map(([k, v], i) => (
                        <div className={`prob ${i === 0 ? "top" : ""}`} key={k}>
                          <span>{k.replace(/___/g, " · ").replace(/_/g, " ")}</span>
                          <span className="prob-bar">
                            <i style={{ width: `${Math.max(v, 0.5)}%` }} />
                          </span>
                          <span className="num">{v.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <p className="disclaimer">{result.disclaimer}</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {capsOpen && (
        <div className="scrim" onClick={() => setCapsOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Capabilities">
            <div className="sheet-head">
              <h2>Capabilities</h2>
              <button className="icon-btn" onClick={() => setCapsOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <p className="body">
              38 conditions across 14 crop species. Upload a leaf from any of these and the
              model will identify the condition, estimate severity, and recommend treatment.
            </p>

            <div className="about-grid">
              <div><strong>38</strong><span>Conditions</span></div>
              <div><strong>14</strong><span>Crops</span></div>
              <div><strong>93.7%</strong><span>Accuracy</span></div>
              <div><strong>31,898</strong><span>Images</span></div>
            </div>

            <div className="caps-list">
              {CROPS.map((c) => (
                <div className="caps-row" key={c.crop}>
                  <p className="caps-crop">{c.crop}</p>
                  <div className="caps-tags">
                    {c.items.map((i) => (
                      <span key={i} className={i === "Healthy" ? "tag ok" : "tag"}>{i}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="sheet-foot">
              A leaf from a species outside these 14 will be matched to the closest class rather
              than rejected.
            </p>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="scrim" onClick={() => setAboutOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="About">
            <div className="sheet-head">
              <h2>About</h2>
              <button className="icon-btn" onClick={() => setAboutOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>

            <p className="body">
              A tomato leaf disease detector. Upload a photograph of a leaf and it identifies the
              condition, estimates how much of the leaf is affected, and gives a treatment
              sequence. A separate search answers questions about crops, pests, nutrition and soil.
            </p>

            <div className="about-grid">
              <div><strong>93.7%</strong><span>Validation accuracy</span></div>
              <div><strong>31,898</strong><span>Training images</span></div>
              <div><strong>38</strong><span>Classes</span></div>
              <div><strong>14</strong><span>Crop species</span></div>
            </div>

            <div className="about-block">
              <p className="kicker">What it detects</p>
              <ul className="bullets">
                <li>Apple &mdash; scab, black rot, cedar apple rust</li>
                <li>Corn, grape, potato &mdash; 3 conditions each</li>
                <li>Tomato &mdash; 9 conditions including both blights, viruses and mites</li>
                <li>Cherry, peach, pepper, squash and citrus greening</li>
                <li>Healthy-leaf detection across all 14 species</li>
              </ul>
            </div>

            <div className="about-block">
              <p className="kicker">How it works</p>
              <p className="body">
                MobileNetV2 pretrained on ImageNet, fine-tuned in two phases on a combined
                dataset of PlantVillage laboratory images and PlantDoc real-world field photos.
                Severity comes from HSV lesion-area thresholding. The knowledge search is a
                TF-IDF index over 30 curated agronomy passages and runs entirely offline.
              </p>
            </div>

            <div className="about-block">
              <p className="kicker">Limitations</p>
              <ul className="bullets">
                <li>Leaves from crops outside the 14 trained species are misassigned to the closest match.</li>
                <li>Weaker on visually similar conditions such as corn gray leaf spot and tomato early blight.</li>
                <li>Severity is a colour estimate, not learned segmentation.</li>
                <li>Advisory only. Confirm with an extension officer before applying chemicals.</li>
              </ul>
            </div>

            <p className="sheet-foot">BCSE497J Project-I &middot; VIT Vellore</p>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div className="scrim" onClick={() => setSettingsOpen(false)}>
          <div
            className="sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Settings"
          >
            <div className="sheet-head">
              <h2>Settings</h2>
              <button
                className="icon-btn"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="setting">
              <div>
                <p>Appearance</p>
                <span>Light or dark theme</span>
              </div>
              <div className="segmented">
                <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}>
                  Light
                </button>
                <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}>
                  Dark
                </button>
              </div>
            </div>

            <div className="setting">
              <div>
                <p>Animations</p>
                <span>Motion and transitions</span>
              </div>
              <button
                className={`switch ${motion ? "on" : ""}`}
                onClick={() => setMotion(!motion)}
                aria-pressed={motion}
              >
                <span />
              </button>
            </div>

            <div className="setting column">
              <div>
                <p>Model</p>
                <span>MobileNetV2 · 38 classes · 93.7% validation accuracy</span>
              </div>
            </div>

            <div className="setting column">
              <div>
                <p>Knowledge base</p>
                <span>30 agronomy passages · TF-IDF retrieval · runs offline</span>
              </div>
            </div>

            <p className="sheet-foot">BCSE497J Project-I · VIT Vellore</p>
          </div>
        </div>
      )}

      {signInOpen && (
        <div className="scrim" onClick={() => setSignInOpen(false)}>
          <div
            className="sheet narrow"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Sign in"
          >
            <div className="sheet-head">
              <h2>Sign in</h2>
              <button className="icon-btn" onClick={() => setSignInOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <p className="body">
              Accounts aren't enabled yet. The detector and knowledge search work without signing
              in, and nothing you upload is stored on a server.
            </p>
            <p className="muted small">
              Planned for accounts: saved diagnosis history, per-field records, and exportable
              treatment logs.
            </p>
            <button className="btn primary wide" onClick={() => setSignInOpen(false)}>
              Continue without an account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
