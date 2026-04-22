import { useState } from "react";

const FIELDS = [
  { id: "fullstack", label: "Full Stack Dev", icon: "🌐", salary: "₹6–15 LPA", tag: "Most beginner friendly", color: "var(--accent)" },
  { id: "aiml", label: "AI / ML", icon: "🤖", salary: "₹12–28 LPA", tag: "High demand, competitive", color: "#f7c06a" },
  { id: "datascience", label: "Data Science", icon: "📊", salary: "₹6–12 LPA", tag: "Growing fast", color: "var(--accent3)" },
  { id: "cybersecurity", label: "Cybersecurity", icon: "🔐", salary: "₹5–10 LPA", tag: "Niche but stable", color: "#f7716a" },
  { id: "mobile", label: "Mobile Dev", icon: "📱", salary: "₹5–12 LPA", tag: "React Native / Flutter", color: "#c06af7" },
  { id: "cloud", label: "Cloud / DevOps", icon: "☁️", salary: "₹7–14 LPA", tag: "High demand in 2026", color: "#6ab8f7" },
];

export default function FieldSelector({ value, weeks, onChange, onNext }) {
  const [selected, setSelected] = useState(value || "");
  const [wks, setWks] = useState(weeks || 4);

  const handleSelect = (label) => {
    setSelected(label);
    onChange(label, wks);
  };

  const handleNext = () => {
    if (!selected) return;
    onChange(selected, wks);
    onNext();
  };

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title"><span className="dot" /> Choose your target internship field</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
          {FIELDS.map((f) => {
            const isSelected = selected === f.label;
            return (
              <div
                key={f.id}
                onClick={() => handleSelect(f.label)}
                style={{
                  border: `1.5px solid ${isSelected ? f.color : "var(--border)"}`,
                  borderRadius: 10,
                  padding: 16,
                  cursor: "pointer",
                  background: isSelected ? `${f.color}18` : "var(--surface2)",
                  transition: "all 0.18s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border-hover)"; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                {isSelected && (
                  <div style={{ position: "absolute", top: 8, right: 10, fontSize: 12, color: f.color, fontWeight: 700 }}>✓</div>
                )}
                <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontFamily: "var(--font-head)", fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{f.label}</div>
                <div style={{ fontSize: 11, color: f.color, marginTop: 3, fontWeight: 500 }}>{f.salary} fresher</div>
                <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{f.tag}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><span className="dot" /> How many weeks before your application deadline?</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 18px",
          }}>
            <button
              onClick={() => { const v = Math.max(1, wks - 1); setWks(v); onChange(selected, v); }}
              style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}
            >−</button>
            <input
              type="number"
              value={wks}
              min={1} max={52}
              onChange={e => { const v = parseInt(e.target.value) || 1; setWks(v); onChange(selected, v); }}
            />
            <button
              onClick={() => { const v = Math.min(52, wks + 1); setWks(v); onChange(selected, v); }}
              style={{ background: "none", border: "none", color: "var(--text2)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}
            >+</button>
            <span style={{ color: "var(--muted)", fontSize: 13 }}>weeks</span>
          </div>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>
            {wks <= 2 && "Very tight — build 1 project, apply now"}
            {wks > 2 && wks <= 5 && "Tight but doable — follow the study plan closely"}
            {wks > 5 && wks <= 10 && "Good window — you can learn and build properly"}
            {wks > 10 && "Plenty of time — go deep, build multiple projects"}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          className="btn btn-primary btn-lg"
          onClick={handleNext}
          disabled={!selected}
        >
          Continue → Upload Resume
        </button>
        {!selected && <span style={{ color: "var(--muted)", fontSize: 12, alignSelf: "center" }}>Select a field first</span>}
      </div>
    </div>
  );
}
