import { useState, useRef } from "react";
import { api } from "../App";

export default function ResumeUpload({ value, onChange, onBack, onNext, field, weeks, onAnalysis }) {
  const [text, setText] = useState(value || "");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setError("");
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      setLoadingMsg("Parsing PDF...");
      setLoading(true);
      try {
        const { text: extracted } = await api.parsePdf(file);
        setText(extracted);
        onChange(extracted);
        setFileName(file.name);
      } catch {
        setError("Could not parse PDF. Please paste your resume text below instead.");
      } finally {
        setLoading(false);
        setLoadingMsg("");
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setText(e.target.result);
        onChange(e.target.result);
        setFileName(file.name);
      };
      reader.readAsText(file);
    }
  };

  const handleAnalyse = async () => {
    if (!text.trim()) { setError("Please add your resume text first."); return; }
    setError("");
    setLoading(true);
    setLoadingMsg("Analysing your resume against " + field + " requirements...");
    try {
      const result = await api.analyse(text, field, weeks);
      onAnalysis(result);
      onChange(text);
      onNext();
    } catch (e) {
      setError("Analysis failed. Make sure the backend is running and your API key is set.");
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  };

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">
          <span className="dot" /> Upload or paste your resume
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>Target: {field}</span>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragging ? "var(--accent)" : fileName ? "var(--accent3)" : "var(--border)"}`,
            borderRadius: 10,
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: dragging ? "rgba(124,106,247,0.05)" : fileName ? "rgba(78,205,196,0.04)" : "var(--surface2)",
            transition: "all 0.2s",
            marginBottom: 16,
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt,.doc" onChange={e => handleFile(e.target.files[0])} style={{ display: "none" }} />
          <div style={{ fontSize: 28, marginBottom: 8 }}>{fileName ? "✅" : "📄"}</div>
          {fileName ? (
            <div style={{ color: "var(--accent3)", fontWeight: 500, fontSize: 13 }}>{fileName} — loaded!</div>
          ) : (
            <>
              <div style={{ color: "var(--text2)", fontSize: 13, fontWeight: 500 }}>Drop your resume here or click to browse</div>
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 4 }}>PDF or TXT · Max 10MB</div>
            </>
          )}
        </div>

        {/* Text area */}
        <div className="section-label">Or paste resume text directly</div>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); onChange(e.target.value); }}
          placeholder={`Paste your resume here — include:\n• Education (college, degree, CGPA)\n• Skills (programming languages, tools)\n• Projects (what you built)\n• Internships or work experience\n• Achievements / certifications`}
          style={{ minHeight: 200 }}
        />

        {text && (
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
            {text.split(/\s+/).filter(Boolean).length} words detected
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(247,113,106,0.1)", border: "1px solid rgba(247,113,106,0.2)", borderRadius: 8, color: "var(--danger)", fontSize: 12 }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleAnalyse}
          disabled={loading || !text.trim()}
        >
          {loading ? (
            <><span className="spinner" /> {loadingMsg}</>
          ) : (
            "Analyse My Resume →"
          )}
        </button>
      </div>
    </div>
  );
}
