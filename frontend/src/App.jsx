import { useState, useRef, useEffect } from "react";
import "./App.css";

const API = import.meta.env.DEV ? "http://" + window.location.hostname + ":5001" : "";
const SEVERITY_STEPS = ["Mild", "Moderate", "Severe"];
const RING = 2 * Math.PI * 42;

const STATS = [
  { value: "97.7%", label: "Test accuracy" },
  { value: "8,237", label: "Images trained" },
  { value: "5", label: "Classes" },
  { value: "~43ms", label: "Inference time" },
];

const EXAMPLES = [
  'Why are my leaves yellow?',
  'How do I treat late blight?',
  'What pH does tomato soil need?',
  'Tiny white flies on my plants',
];

const HOW = [
  { n: "01", t: "Load a specimen", d: "Photograph a single leaf against a plain background." },
  { n: "02", t: "Run detection", d: "MobileNetV2 classifies the lesion pattern in milliseconds." },
  { n: "03", t: "Act on the reading", d: "Get severity and a treatment sequence you can follow today." },
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
  const isTouch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const reportRef = useRef(null);

  const [q, setQ] = useState('');
  const [ans, setAns] = useState(null);
  const [asking, setAsking] = useState(false);

  async function ask(text) {
    const query = (text ?? q).trim();
    if (query.length < 3) return;
    setQ(query);
    setAsking(true);
    try {
      const r = await fetch(`${API}/ask?q=` + encodeURIComponent(query));
      setAns(await r.json());
    } catch {
      setAns({ answered: false, message: 'Cannot reach the knowledge service.' });
    } finally {
      setAsking(false);
    }
  }

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

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

  async function analyze() {
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
      if (window.innerWidth < 860) {
        setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
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

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const sevIndex = result ? SEVERITY_STEPS.indexOf(result.severity.label) : -1;
  const ranked = result
    ? Object.entries(result.all_probabilities).sort((a, b) => b[1] - a[1])
    : [];
  const conf = result ? result.prediction.confidence : 0;
  const outOfScope = result ? result.prediction.class_key.startsWith('Other') : false;

  return (
    <div className="page">
      <button
        className="theme-toggle"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {theme === "dark" ? "Light" : "Dark"}
      </button>

      <header className="hero">
        <h1>
          Crop disease <em>detection</em>
        </h1>
        <p className="lede">
          Upload a leaf and get a diagnosis, a severity reading, and a treatment
          sequence. Covers four tomato conditions and flags anything outside that scope.
        </p>
        <div className="stats">
          {STATS.map((s) => (
            <div className="stat" key={s.label}>
              <span className="stat-value mono">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </header>

      <section className="ask">
        <div className="ask-bar">
          <input
            type="text"
            value={q}
            placeholder="Ask about crops, leaves, pests or soil…"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            aria-label="Ask a question about crops"
          />
          <button className="primary ask-go" onClick={() => ask()} disabled={asking || q.trim().length < 3}>
            {asking ? 'Searching…' : 'Ask'}
          </button>
        </div>

        {!ans && (
          <div className="chips">
            {EXAMPLES.map((e) => (
              <button key={e} className="chip-btn" onClick={() => ask(e)}>{e}</button>
            ))}
          </div>
        )}

        {ans && !ans.answered && <p className="ask-empty">{ans.message}</p>}

        {ans && ans.answered && (
          <div className="ask-answer">
            <div className="ask-head">
              <div>
                <span className="ask-topic mono">{ans.topic}</span>
                <p className="ask-title">{ans.title}</p>
              </div>
              <span className="ask-score mono">{(ans.score * 100).toFixed(0)}% match</span>
            </div>
            <p className="ask-text">{ans.answer}</p>
            {ans.results.length > 1 && (
              <div className="ask-related">
                <span className="mono">Related</span>
                {ans.results.slice(1).map((r) => (
                  <button key={r.id} className="chip-btn" onClick={() => ask(r.title)}>{r.title}</button>
                ))}
              </div>
            )}
            <button className="quiet ask-clear" onClick={() => { setAns(null); setQ(''); }}>Clear</button>
          </div>
        )}
      </section>

      <main className="bench">
        <section className="panel specimen">
          <div className="panel-head">
            <h2>Specimen</h2>
            <span className="chip mono">Step 01</span>
          </div>

          <div
            className={`plate ${dragging ? "is-dragging" : ""} ${preview ? "has-image" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]); }}
          >
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
            {preview ? (
              <>
                <img src={preview} alt="Leaf specimen for analysis" />
                <span className="corner tl" /><span className="corner tr" />
                <span className="corner bl" /><span className="corner br" />
              </>
            ) : (
              <div className="plate-empty">
                <svg viewBox="0 0 80 80" className="leaf-mark" aria-hidden="true">
                  <path d="M40 8C22 14 10 30 12 62C40 66 62 50 66 30C68 20 54 10 40 8Z"
                        fill="none" strokeWidth="1.5" />
                  <path d="M40 8C36 30 26 46 12 62" fill="none" strokeWidth="1.5" />
                  <path d="M34 24L46 30M28 38L42 44M22 50L34 56" fill="none" strokeWidth="1" />
                </svg>
                <p className="plate-lead">Drop a leaf image here</p>
                <p className="plate-hint">{isTouch ? "or tap to browse · use Take photo for the camera" : "or click to browse · JPG or PNG · up to 8 MB"}</p>
              </div>
            )}
          </div>

          {file && (
            <dl className="filemeta">
              <div><dt>File</dt><dd className="mono">{file.name}</dd></div>
              <div><dt>Size</dt><dd className="mono">{(file.size / 1024).toFixed(0)} KB</dd></div>
            </dl>
          )}

          <div className="controls">
            <button className="primary" onClick={analyze} disabled={!file || loading}>
              {loading ? "Analyzing…" : "Analyze specimen"}
            </button>
            {isTouch && !file && (
              <button className="quiet" onClick={() => cameraRef.current?.click()}>
                Take photo
              </button>
            )}
            {file && <button className="quiet" onClick={reset}>Clear</button>}
          </div>

          {loading && <div className="scanline" aria-hidden="true" />}
          {error && <p className="notice error" role="alert">{error}</p>}
        </section>

        <section className="panel report" ref={reportRef} aria-live="polite">
          <div className="panel-head">
            <h2>Diagnosis</h2>
            <span className="chip mono">Step 02</span>
          </div>

          {!result && !loading && (
            <div className="idle">
              <p className="awaiting">No reading yet. Load a specimen to run detection.</p>
              <ol className="how">
                {HOW.map((h) => (
                  <li key={h.n}>
                    <span className="how-n mono">{h.n}</span>
                    <div>
                      <p className="how-t">{h.t}</p>
                      <p className="how-d">{h.d}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {loading && (
            <div className="skeleton">
              <span style={{ width: "62%" }} /><span style={{ width: "40%" }} />
              <span style={{ width: "85%" }} /><span style={{ width: "70%" }} />
              <span style={{ width: "55%" }} />
            </div>
          )}

          {result && !loading && (
            <div className="reveal">
              <div className="verdict">
                <div className="verdict-text">
                  <p className="diagnosis">{result.prediction.disease}</p>
                  <p className="pathogen">{result.details.pathogen}</p>
                </div>
                <div className="ring" role="img"
                     aria-label={`Confidence ${conf.toFixed(1)} percent`}>
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-track" cx="50" cy="50" r="42" />
                    <circle className="ring-fill" cx="50" cy="50" r="42"
                            strokeDasharray={RING}
                            strokeDashoffset={RING * (1 - conf / 100)} />
                  </svg>
                  <div className="ring-label">
                    <span className="mono">{conf.toFixed(1)}</span>
                    <small>% confident</small>
                  </div>
                </div>
              </div>

              {!outOfScope && <div className="reading">
                <div className="reading-head">
                  <span>Severity</span>
                  <span className="mono figure">
                    <strong>{result.severity.label}</strong>
                    {result.severity.affected_area_percent > 0 &&
                      ` · ${result.severity.affected_area_percent}% leaf area`}
                  </span>
                </div>
                <div className={`scale sev-${result.severity.label.toLowerCase()}`}>
                  {SEVERITY_STEPS.map((step, i) => (
                    <div key={step} className={`step ${i <= sevIndex ? "on" : ""}`}>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {result.severity.label === "None" && (
                  <p className="scale-note">No lesions detected on this specimen.</p>
                )}
              </div>}

              {outOfScope && (
                <p className="notice warn">
                  This does not look like a tomato leaf. The model covers four tomato
                  conditions only, so no diagnosis is given for other crops.
                </p>
              )}

              {!outOfScope && result.prediction.low_confidence && (
                <p className="notice warn">
                  Low confidence. Retake the photo with the leaf filling the frame in even
                  daylight, then run it again.
                </p>
              )}

              {result.details.symptoms && (
                <div className="block">
                  <h3>What this looks like</h3>
                  <p>{result.details.symptoms}</p>
                </div>
              )}

              <div className="block">
                <h3>Treatment</h3>
                <ol className="steps">
                  {result.details.treatment.map((t, i) => (
                    <li key={i}>
                      <span className="mono num">{String(i + 1).padStart(2, "0")}</span>{t}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="block">
                <h3>Prevention</h3>
                <ul className="bullets">
                  {result.details.prevention.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>

              <div className="block">
                <h3>Class probabilities</h3>
                <div className="probs">
                  {ranked.map(([k, v], i) => (
                    <div className={`prob ${i === 0 ? "top" : ""}`} key={k}>
                      <span className="prob-name">
                        {k.replace(/___/g, " · ").replace(/_/g, " ")}
                      </span>
                      <span className="prob-bar"><i style={{ width: `${Math.max(v, 0.5)}%` }} /></span>
                      <span className="prob-val mono">{v.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="disclaimer">{result.disclaimer}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
