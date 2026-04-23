import { useState, useEffect } from "react";
import FieldSelector from "./components/FieldSelector";
import ResumeUpload from "./components/ResumeUpload";
import Analysis from "./components/Analysis";
import StudyPlan from "./components/StudyPlan";
import Interview from "./components/Interview";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";

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
  async studyPlan(field, weeks, missingSkills, existingSkills) {
    const res = await fetch(`${API_BASE}/api/study-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, weeks, missingSkills, existingSkills }),
    });
    if (!res.ok) throw new Error("Study plan failed");
    return res.json();
  },
  async getQuestion(field, questionNumber, previousQuestions, category) {
    const res = await fetch(`${API_BASE}/api/interview/question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, questionNumber, previousQuestions, category }),
    });
    if (!res.ok) throw new Error("Question failed");
    return res.json();
  },
  async getFeedback(field, question, answer, category) {
    const res = await fetch(`${API_BASE}/api/interview/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, question, answer, category }),
    });
    if (!res.ok) throw new Error("Feedback failed");
    return res.json();
  },
};

const USERS_KEY = "cc_users";
const SESSION_KEY = "cc_session";

export const authHelpers = {
  getUsers: () => JSON.parse(localStorage.getItem(USERS_KEY) || "{}"),
  saveUsers: (u) => localStorage.setItem(USERS_KEY, JSON.stringify(u)),
  getSession: () => localStorage.getItem(SESSION_KEY),
  setSession: (email) => localStorage.setItem(SESSION_KEY, email),
  clearSession: () => localStorage.removeItem(SESSION_KEY),
  register(name, email, password) {
    const users = this.getUsers();
    if (users[email]) throw new Error("Email already registered");
    users[email] = { name, email, password, createdAt: Date.now(), progress: {}, lastSession: null };
    this.saveUsers(users);
    this.setSession(email);
    return users[email];
  },
  login(email, password) {
    const users = this.getUsers();
    if (!users[email]) throw new Error("No account found with that email");
    if (users[email].password !== password) throw new Error("Incorrect password");
    this.setSession(email);
    return users[email];
  },
  getUser(email) { return this.getUsers()[email] || null; },
  updateUserProgress(email, progressPatch) {
    const users = this.getUsers();
    if (!users[email]) return;
    users[email].progress = { ...users[email].progress, ...progressPatch };
    this.saveUsers(users);
  },
  saveUserSession(email, sessionData) {
    const users = this.getUsers();
    if (!users[email]) return;
    users[email].lastSession = sessionData;
    users[email].progress = { ...users[email].progress, ...sessionData.progress };
    this.saveUsers(users);
  },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("auth");
  const [step, setStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState(new Set());
  const [state, setState] = useState({ field: "", weeks: 4, resumeText: "", analysis: null, studyPlan: null });

  useEffect(() => {
    const email = authHelpers.getSession();
    if (email) {
      const u = authHelpers.getUser(email);
      if (u) { setUser(u); setView("dashboard"); }
    }
  }, []);

  const handleAuth = (userData) => { setUser(userData); setView("dashboard"); };

  const handleLogout = () => {
    authHelpers.clearSession();
    setUser(null); setView("auth"); setStep(0);
    setDoneSteps(new Set());
    setState({ field: "", weeks: 4, resumeText: "", analysis: null, studyPlan: null });
  };

  const startNewSession = () => {
    setStep(0); setDoneSteps(new Set());
    setState({ field: "", weeks: 4, resumeText: "", analysis: null, studyPlan: null });
    setView("app");
  };

  const resumeSession = () => {
    if (user?.lastSession) {
      const s = user.lastSession;
      setState({ field: s.field || "", weeks: s.weeks || 4, resumeText: s.resumeText || "", analysis: s.analysis || null, studyPlan: s.studyPlan || null });
      const done = new Set();
      if (s.field) done.add(0);
      if (s.resumeText) done.add(1);
      if (s.analysis) done.add(2);
      if (s.studyPlan) done.add(3);
      setDoneSteps(done);
      setStep(done.size > 0 ? Math.min(done.size, 4) : 0);
    }
    setView("app");
  };

  const updateState = (patch) => {
    setState((s) => {
      const next = { ...s, ...patch };
      if (user) {
        authHelpers.saveUserSession(user.email, {
          field: next.field, weeks: next.weeks, resumeText: next.resumeText,
          analysis: next.analysis, studyPlan: next.studyPlan,
          progress: { lastStep: step, completedSteps: [...doneSteps] },
        });
        const updatedUser = authHelpers.getUser(user.email);
        if (updatedUser) setUser(updatedUser);
      }
      return next;
    });
  };

  const complete = (n) => {
    const newDone = new Set([...doneSteps, n]);
    setDoneSteps(newDone);
    setStep(n + 1);
    if (user) authHelpers.updateUserProgress(user.email, { completedSteps: [...newDone] });
  };

  const onInterviewComplete = (results) => {
    if (user) {
      const prev = user.progress?.interviewSessions || [];
      authHelpers.updateUserProgress(user.email, {
        interviewSessions: [...prev, { date: Date.now(), results, field: state.field }],
      });
      setUser(authHelpers.getUser(user.email));
    }
  };

  if (view === "auth") return <Auth onAuth={handleAuth} />;
  if (view === "dashboard") return (
    <Dashboard user={user} onNewSession={startNewSession} onResumeSession={resumeSession}
      onLogout={handleLogout} state={state} doneSteps={doneSteps} />
  );

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px 60px", position: "relative", zIndex: 1 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 0 28px" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-head)", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800,
            background: "linear-gradient(135deg, #ffffff 20%, #7c6af7 60%, #f7716a)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            letterSpacing: "-1px", lineHeight: 1.1,
          }}>CareerCopilot ✦</h1>
          <p style={{ color: "var(--text2)", fontSize: 11, marginTop: 3 }}>AI-powered internship prep</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setView("dashboard")} className="btn btn-ghost btn-sm">⬡ Dashboard</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span style={{ fontSize: 11, color: "var(--text2)" }}>{user?.name?.split(" ")[0]}</span>
            <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11 }}>✕</button>
          </div>
        </div>
      </header>

      <nav style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, marginBottom: 16, gap: 2, overflowX: "auto" }}>
        {STEPS.map((s) => {
          const isActive = step === s.id;
          const isDone = doneSteps.has(s.id);
          const isReachable = s.id === 0 || doneSteps.has(s.id - 1) || doneSteps.has(s.id);
          return (
            <button key={s.id} onClick={() => isReachable && setStep(s.id)} style={{
              flex: 1, padding: "8px 6px", borderRadius: 8, border: "none",
              background: isActive ? "var(--surface2)" : "transparent",
              color: isDone ? "var(--accent3)" : isActive ? "var(--text)" : "var(--muted)",
              fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
              cursor: isReachable ? "pointer" : "not-allowed", transition: "all 0.2s",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 62,
            }}>
              <span style={{
                width: 22, height: 22, borderRadius: "50%",
                background: isDone ? "var(--accent3)" : isActive ? "var(--accent)" : "var(--surface3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: isDone ? "#08100f" : "#fff",
              }}>{isDone ? "✓" : s.id + 1}</span>
              {s.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginBottom: 20, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Progress</span>
        <div style={{ flex: 1, height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(doneSteps.size / 5) * 100}%`, background: "linear-gradient(90deg, var(--accent), var(--accent3))", borderRadius: 2, transition: "width 0.6s ease" }} />
        </div>
        <span style={{ fontSize: 11, color: "var(--accent)", fontFamily: "var(--font-head)", fontWeight: 700 }}>{doneSteps.size}/5</span>
      </div>

      {step === 0 && <FieldSelector value={state.field} weeks={state.weeks} onChange={(field, weeks) => updateState({ field, weeks })} onNext={() => complete(0)} />}
      {step === 1 && <ResumeUpload value={state.resumeText} onChange={(text) => updateState({ resumeText: text })} onBack={() => setStep(0)} onNext={() => complete(1)} field={state.field} weeks={state.weeks} onAnalysis={(data) => updateState({ analysis: data })} />}
      {step === 2 && <Analysis data={state.analysis} field={state.field} weeks={state.weeks} resumeText={state.resumeText} onBack={() => setStep(1)} onNext={(plan) => { updateState({ studyPlan: plan }); complete(2); }} />}
      {step === 3 && <StudyPlan data={state.studyPlan} field={state.field} weeks={state.weeks} analysis={state.analysis} onBack={() => setStep(2)} onNext={() => complete(3)} user={user} onProgressUpdate={(p) => { if (user) authHelpers.updateUserProgress(user.email, p); }} />}
      {step === 4 && <Interview field={state.field} analysis={state.analysis} onBack={() => setStep(3)} onComplete={onInterviewComplete} />}
    </div>
  );
}
