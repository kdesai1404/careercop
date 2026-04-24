cat > /mnt/user-data/outputs/Analysis.jsx << 'EOF'
import { useState, useEffect } from "react";
import { api } from "../App";

function ScoreBar({ score }) {
  const [width, setWidth] = useState(0);
  useEffect(() => { setTimeout(() => setWidth(score), 100); }, [score]);
  const color = score >= 70 ? "var(--success)" : score >= 45 ? "var(--warning)" : "var(--danger)";
  return (
    <div className="score-bar-wrap">
      <div className="score-bar-labels">
        <span>Resume match</span>
        <span style={{ color, fontFamily: "var(--font-head)", fontSize: 20, fontWeight: 800 }}>{score}/100</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Analysis({ data, field, weeks, resumeText, dailyHours, onBack, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!data) {
    return (
      <div className="fade-up">
        <div className="card">
          <div className="empty-state">
            <div className="icon">🔍</div>
            <p>No analysis yet — go back and upload your resume.</p>
          </div>
        </div>
        <button className="btn btn-ghost mt-4" onClick={onBack}>← Back</button>
      </div>
    );
  }

  const likeColor = {
    "Very High": "badge-green",
    "High":      "badge-green",
    "Medium":    "badge-amber",
    "Low":       "badge-red",
  }[data.hire_likelihood] || "badge-purple";

  const handleNext = async () => {
    setError("");
    setLoading(true);
    try {
      const plan = await api.studyPlan(field, weeks, data.missing_skills, data.existing_skills, dailyHours);
      onNext(plan);
    } catch {
      setError("Study plan generation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-up">
      {/* Score card */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-title"><span className="dot" /> Resume analysis — {field}</div>
        <ScoreBar score={data.match_score} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, marginBottom: 16 }}>
          <span className={`badge ${likeColor}`}>Hire likelihood: {data.hire_likelihood}</span>
          <span className="badge badge-purple">{weeks} weeks to deadline</span>
        </div>
        <div className="section-label">Honest assessment</div>
        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>{data.summary}</p>
      </div>

      {/* Skills grid */}
      <div className="grid-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-title"><span className="dot dot-green" /> What you have ✓</div>
          <div>
            {(data.strengths || []).map((s, i) => <span key={i} className="tag tag-good">{s}</span>)}
            {(data.existing_skills || []).map((s, i) => <span key={i} className="tag tag-skill">{s}</span>)}
          </div>
        </div>
        <div className="card">
          <div className="card-title"><span className="dot dot-red" /> What you're missing ✗</div>
          <div>
            {(data.missing_skills || []).map((s, i) => <span key={i} className="tag tag-missing">{s}</span>)}
          </div>
        </div>
      </div>

      {/* Action + goal */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="highlight-box highlight-accent" style={{ marginBottom: 10 }}>
          <div className="section-label" style={{ marginBottom: 4 }}>🎯 Top action this week</div>
          <p style={{ fontSize: 13 }}>{data.top_action}</p>
        </div>
        <div className="highlight-box highlight-green" style={{ marginBottom: 10 }}>
          <div className="section-label" style={{ marginBottom: 4 }}>🗓️ Realistic goal in {weeks} weeks</div>
          <p style={{ fontSize: 13 }}>{data.realistic_goal}</p>
        </div>
        {data.resume_tips?.length > 0 && (
          <div className="highlight-box highlight-amber">
            <div className="section-label" style={{ marginBottom: 6 }}>📝 Resume improvements</div>
            {data.resume_tips.map((tip, i) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 4, color: "var(--text)" }}>▸ {tip}</div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: "10px 14px", background: "rgba(247,113,106,0.1)", border: "1px solid rgba(247,113,106,0.2)", borderRadius: 8, color: "var(--danger)", fontSize: 12 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={loading}>
          {loading ? <><span className="spinner" /> Building your study plan...</> : "Build My Study Plan →"}
        </button>
      </div>
    </div>
  );
}
EOF
echo "Analysis.jsx done"
