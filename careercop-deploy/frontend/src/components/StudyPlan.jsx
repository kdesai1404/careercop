import { useState } from "react";

export default function StudyPlan({ data, field, weeks, analysis, onBack, onNext }) {
  const [open, setOpen] = useState(new Set([0]));

  const toggle = (i) => {
    setOpen(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  if (!data) {
    return (
      <div className="fade-up">
        <div className="card">
          <div className="empty-state">
            <div className="icon">📅</div>
            <p>Complete the resume analysis first to generate your study plan.</p>
          </div>
        </div>
        <button className="btn btn-ghost mt-4" onClick={onBack}>← Back</button>
      </div>
    );
  }

  const weekColors = ["var(--accent)", "var(--accent3)", "var(--warning)", "var(--accent2)", "#c06af7", "#6ab8f7"];

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div className="card-title" style={{ marginBottom: 4 }}><span className="dot" />{weeks}-Week Study Plan</div>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Personalised around your skill gaps · {field}</p>
          </div>
          <span className="badge badge-purple">{(data.weeks || []).length} weeks</span>
        </div>

        {(data.weeks || []).map((w, i) => (
          <div key={i} style={{
            border: "1px solid var(--border)",
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 8,
          }}>
            <div
              onClick={() => toggle(i)}
              style={{
                background: "var(--surface2)",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface3)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--surface2)"}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 24, height: 24,
                    borderRadius: "50%",
                    background: weekColors[i % weekColors.length] + "22",
                    border: `1.5px solid ${weekColors[i % weekColors.length]}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: weekColors[i % weekColors.length],
                    fontFamily: "var(--font-head)",
                    flexShrink: 0,
                  }}>{w.week}</span>
                  <span style={{ fontFamily: "var(--font-head)", fontSize: 13, fontWeight: 700 }}>
                    {w.theme}
                  </span>
                  {w.daily_hours && (
                    <span style={{ fontSize: 10, background: "var(--surface3)", color: "var(--muted)", padding: "2px 8px", borderRadius: 20 }}>
                      {w.daily_hours}h/day
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, paddingLeft: 34 }}>{w.goal}</div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 12, flexShrink: 0, marginLeft: 8 }}>{open.has(i) ? "▲" : "▼"}</span>
            </div>

            {open.has(i) && (
              <div style={{ padding: "16px", borderTop: "1px solid var(--border)" }}>
                <div className="section-label" style={{ marginBottom: 8 }}>Daily tasks</div>
                {(w.tasks || []).map((task, j) => (
                  <div key={j} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--text2)" }}>
                    <span style={{ color: weekColors[i % weekColors.length], flexShrink: 0, marginTop: 1 }}>▸</span>
                    <span>{task}</span>
                  </div>
                ))}

                <div className="divider" />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {w.resource && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--accent)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Free resource: </span>
                      {w.resource_url ? (
                        <a href={w.resource_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent3)", textDecoration: "none" }}>
                          {w.resource} ↗
                        </a>
                      ) : (
                        <span style={{ color: "var(--text2)" }}>{w.resource}</span>
                      )}
                    </div>
                  )}
                  {w.project && (
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: "var(--accent2)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Build this: </span>
                      <span style={{ color: "var(--text2)" }}>{w.project}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Final project */}
      {data.final_project && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="card-title"><span className="dot dot-red" /> Final resume project 🚀</div>
          <div className="highlight-box highlight-red">
            <p style={{ fontSize: 13 }}>{data.final_project}</p>
          </div>
          {data.github_tip && (
            <div style={{ marginTop: 10 }} className="highlight-box highlight-accent">
              <div className="section-label" style={{ marginBottom: 4 }}>GitHub tip</div>
              <p style={{ fontSize: 12 }}>{data.github_tip}</p>
            </div>
          )}
          {data.apply_strategy && (
            <div style={{ marginTop: 10 }} className="highlight-box highlight-green">
              <div className="section-label" style={{ marginBottom: 4 }}>Where to apply</div>
              <p style={{ fontSize: 12 }}>{data.apply_strategy}</p>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Back</button>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          Start Mock Interview →
        </button>
      </div>
    </div>
  );
}
