cat > /mnt/user-data/outputs/App.jsx << 'EOF'
import { useState } from "react";
import FieldSelector from "./components/FieldSelector";
import ResumeUpload from "./components/ResumeUpload";
import Analysis from "./components/Analysis";
import StudyPlan from "./components/StudyPlan";
import Interview from "./components/Interview";

const STEPS = [
  { id: 0, label: "Field" },
  { id: 1, label: "Resume" },
  { id: 2, label: "Analysis" },
  { id: 3, label: "Study Plan" },
  { id: 4, label: "Interview" },
];

const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = {
  async parsePdf(file) {
    const form = new FormData();
    form.append("resume", file);
    const res = await fetch(`${API_BASE}/api/parse-pdf`, { method: "POST", body: form });
    if (!res.ok) throw new Error("PDF parse failed");
    return res.json();
  },
  async analyse(resumeText, field, weeks) {
    const res = await fetch(`${API_BASE}/api/analyse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, field, weeks }),
    });
    if (!res.ok) throw new Error("Analysis failed");
    return res.json();
  },
  async studyPlan(field, weeks, missingSkills, existingSkills, dailyHours) {
    const res = await fetch(`${API_BASE}/api/study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, weeks, missingSkills, existingSkills, dailyHours }),
    });
    if (!res.ok) throw new Error("Study plan failed");
    return res.json();
  },
  async getQuestion(field, questionNumber, previousQuestions, questionType) {
    const res = await fetch(`${API_BASE}/api/interview/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, questionNumber, previousQuestions, questionType }),
    });
    if (!res.ok) throw new Error("Question failed");
    return res.json();
  },
  async getFeedback(field, question, answer, questionType) {
    const res = await fetch(`${API_BASE}/api/interview/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, question, answer, questionType }),
    });
    if (!res.ok) throw new Error("Feedback failed");
    return res.json();
  },
};

export default function App() {
  const [step, setStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState(new Set());
  const [state, setState] = useState({
    field: "",
    weeks: 4,
    dailyHours: 2,
    resumeText: "",
    analysis: null,
    studyPlan: null,
  });

  const updateState = (patch) => setState((s) => ({ ...s, ...patch }));

  const complete = (n) => {
    setDoneSteps((s) => new Set([...s, n]));
    setStep(n + 1);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px 60px", position: "relative", zIndex: 1 }}>
      {/* Header */}
      <header style={{ textAlign: "center", padding: "36px 0 32px" }}>
        <h1 style={{
          fontFamily: "var(--font-head)",
          fontSize: "clamp(26px, 5vw, 38px)",
          fontWeight: 800,
          background: "linear-gradient(135deg, #ffffff 20%, #7c6af7 60%, #f7716a)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-1px",
          lineHeight: 1.1,
        }}>
          CareerCopilot ✦
        </h1>
        <p style={{ color: "var(--text2)", fontSize: 13, marginTop: 8, fontWeight: 300 }}>
          AI-powered placement prep — resume analysis · skill gaps · study plans · mock interviews
        </p>
        <div style={{ width: 48, height: 2, background: "linear-gradient(90deg, var(--accent), var(--accent2))", margin: "16px auto 0", borderRadius: 2 }} />
      </header>

      {/* Step Nav */}
      <nav style={{
        display: "flex",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 4,
        marginBottom: 28,
        gap: 2,
        overflowX: "auto",
      }}>
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isDone = doneSteps.has(s.id);
          const isReachable = s.id === 0 || doneSteps.has(s.id - 1) || doneSteps.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => isReachable && setStep(s.id)}
              style={{
                flex: 1,
                padding: "8px 6px",
                borderRadius: 8,
                border: "none",
                background: isActive ? "var(--surface2)" : "transparent",
                color: isDone ? "var(--accent3)" : isActive ? "var(--text)" : "var(--muted)",
                fontFamily: "var(--font-body)",
                fontSize: 11,
                fontWeight: 500,
                cursor: isReachable ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 62,
              }}
            >
              <span style={{
                width: 22, height: 22,
                borderRadius: "50%",
                background: isDone ? "var(--accent3)" : isActive ? "var(--accent)" : "var(--surface3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontWeight: 700,
                color: isDone ? "#08100f" : "#fff",
                transition: "all 0.2s",
              }}>
                {isDone ? "✓" : s.id + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </nav>

      {/* Panels */}
      {step === 0 && (
        <FieldSelector
          value={state.field}
          weeks={state.weeks}
          dailyHours={state.dailyHours}
          onChange={(field, weeks, dailyHours) => updateState({ field, weeks, dailyHours })}
          onNext={() => complete(0)}
        />
      )}
      {step === 1 && (
        <ResumeUpload
          value={state.resumeText}
          onChange={(text) => updateState({ resumeText: text })}
          onBack={() => setStep(0)}
          onNext={() => complete(1)}
          field={state.field}
          weeks={state.weeks}
          onAnalysis={(data) => updateState({ analysis: data })}
        />
      )}
      {step === 2 && (
        <Analysis
          data={state.analysis}
          field={state.field}
          weeks={state.weeks}
          resumeText={state.resumeText}
          dailyHours={state.dailyHours}
          onBack={() => setStep(1)}
          onNext={(plan) => { updateState({ studyPlan: plan }); complete(2); }}
        />
      )}
      {step === 3 && (
        <StudyPlan
          data={state.studyPlan}
          field={state.field}
          weeks={state.weeks}
          dailyHours={state.dailyHours}
          analysis={state.analysis}
          onBack={() => setStep(2)}
          onNext={() => complete(3)}
        />
      )}
      {step === 4 && (
        <Interview
          field={state.field}
          analysis={state.analysis}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
EOF
echo "App.jsx done"
