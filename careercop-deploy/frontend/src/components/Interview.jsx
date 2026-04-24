import { useState, useRef } from "react";
import { api } from "../App";

const TOTAL_QUESTIONS = 10;

const QUESTION_TYPES = [
  { id: "personal",       label: "Personal / Intro",  icon: "👤", color: "#6ab8f7",        desc: "Background, motivation, goals" },
  { id: "technical",      label: "Technical",          icon: "⚙️", color: "var(--accent)",   desc: "Concepts, tools, frameworks" },
  { id: "problemsolving", label: "Problem Solving",    icon: "🧩", color: "#f7c06a",         desc: "Coding, algorithms, system design" },
  { id: "behavioral",     label: "Behavioral",         icon: "🤝", color: "var(--accent3)",  desc: "STAR method, teamwork, failure" },
  { id: "hr",             label: "HR / Situational",   icon: "💼", color: "#c06af7",         desc: "Salary, work style, scenarios" },
];

// Auto rotation for 10 questions — covers all types
const AUTO_SEQUENCE = [
  "personal", "technical", "technical", "problemsolving", "behavioral",
  "technical", "problemsolving", "hr", "behavioral", "personal",
];

export default function Interview({ field, analysis, onBack }) {
  const [messages, setMessages]         = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentQType, setCurrentQType] = useState("");
  const [questionNum, setQuestionNum]   = useState(0);
  const [prevQuestions, setPrevQuestions] = useState([]);
  const [answer, setAnswer]             = useState("");
  const [loading, setLoading]           = useState(false);
  const [phase, setPhase]               = useState("idle"); // idle | asking | answering | feedback | done
  const [scores, setScores]             = useState([]);
  const [mode, setMode]                 = useState("auto"); // auto | custom
  const [selectedType, setSelectedType] = useState("technical");
  const chatRef = useRef();

  const scrollToBottom = () => {
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }), 100);
  };

  const addMsg = (type, content) => {
    setMessages(prev => [...prev, { type, content, id: Date.now() + Math.random() }]);
    scrollToBottom();
  };

  const startSession = async () => {
    setMessages([]);
    setScores([]);
    setPrevQuestions([]);
    setQuestionNum(0);
    setAnswer("");
    setPhase("asking");
    addMsg("system", `Welcome! I'll ask you ${TOTAL_QUESTIONS} placement interview questions for ${field} roles. ${mode === "auto" ? "Questions cover all types: Personal, Technical, Problem Solving, Behavioral & HR." : "Custom mode — you control the question type."} Answer as you would in a real interview. Let's go!`);
    const firstType = mode === "auto" ? AUTO_SEQUENCE[0] : selectedType;
    await fetchNextQuestion(1, [], firstType);
  };

  const fetchNextQuestion = async (num, prev, qtype) => {
    setLoading(true);
    try {
      const res = await api.getQuestion(field, num, prev, qtype);
      setCurrentQuestion(res.question);
      setCurrentQType(res.questionType || qtype);
      const typeInfo = QUESTION_TYPES.find(t => t.id === (res.questionType || qtype));
      addMsg("interviewer", {
        text: `Q${num}: ${res.question}`,
        typeLabel: res.questionTypeLabel || typeInfo?.label || "General",
        typeColor: typeInfo?.color || "var(--accent)",
        typeIcon:  typeInfo?.icon  || "❓",
      });
      setPhase("answering");
    } catch {
      addMsg("error", "Could not load question. Check your backend connection.");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim() || loading) return;
    const myAnswer = answer.trim();
    setAnswer("");
    addMsg("user", myAnswer);
    setPhase("asking");
    setLoading(true);

    try {
      const fb = await api.getFeedback(field, currentQuestion, myAnswer, currentQType);
      setScores(prev => [...prev, fb.score]);

      const verdictIcon = fb.verdict === "Good" ? "✅" : fb.verdict === "Needs work" ? "⚠️" : "❌";
      addMsg("feedback", {
        score: fb.score, verdict: fb.verdict, verdictIcon,
        whatWorked: fb.what_worked,
        whatMissed: fb.what_missed,
        hint: fb.model_answer_hint,
      });

      const newPrev = [...prevQuestions, currentQuestion];
      setPrevQuestions(newPrev);
      const nextNum = questionNum + 2;
      setQuestionNum(prev => prev + 1);

      if (nextNum > TOTAL_QUESTIONS) {
        setPhase("done");
        const allScores = [...scores, fb.score];
        const avg = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
        const emoji = avg >= 8 ? "🏆" : avg >= 6 ? "🎯" : avg >= 4 ? "📈" : "💪";
        addMsg("system", `${emoji} Session complete! Your average score: ${avg}/10. ${avg >= 7 ? "Strong performance — you're placement-ready!" : avg >= 5 ? "Decent start — focus on depth and specifics." : "Keep going — review the feedback above and practice more."}`);
      } else {
        const nextType = mode === "auto"
          ? AUTO_SEQUENCE[Math.min(nextNum - 1, AUTO_SEQUENCE.length - 1)]
          : selectedType;
        await fetchNextQuestion(nextNum, newPrev, nextType);
      }
    } catch {
      addMsg("error", "Feedback failed. Try answering the next question.");
      setPhase("answering");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAnswer(); }
  };

  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  return (
    <div className="fade-up">
      <div className="card" style={{ marginBottom: 14 }}>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div className="card-title" style={{ margin: 0 }}>
            <span className="dot" /> Mock Interview — <span style={{ color: "var(--accent)" }}>{field}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {scores.length > 0 && <span className="badge badge-purple">Avg: {avgScore}/10</span>}
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{questionNum}/{TOTAL_QUESTIONS} done</span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(questionNum / TOTAL_QUESTIONS) * 100}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent3))",
              borderRadius: 2, transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* ── Mode selector + type cards (idle only) ── */}
        {phase === "idle" && (
          <div style={{ marginBottom: 14 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Interview mode</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { id: "auto",   label: "🔀 Auto Mix",    desc: "All 5 types, 10 questions" },
                { id: "custom", label: "🎯 Custom Type",  desc: "You pick the question type" },
              ].map(m => (
                <button key={m.id} onClick={() => setMode(m.id)} style={{
                  flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                  border: `1.5px solid ${mode === m.id ? "var(--accent)" : "var(--border)"}`,
                  background: mode === m.id ? "rgba(124,106,247,0.12)" : "var(--surface2)",
                  color: mode === m.id ? "var(--accent)" : "var(--text2)",
                  transition: "all 0.15s", textAlign: "left",
                }}>
                  <div style={{ fontWeight: 700, fontSize: 12, fontFamily: "var(--font-head)" }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>

            <div className="section-label" style={{ marginBottom: 8 }}>
              {mode === "auto" ? "Question types included (auto-rotated):" : "Select question type for each question:"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {QUESTION_TYPES.map(t => (
                <div
                  key={t.id}
                  onClick={() => mode === "custom" && setSelectedType(t.id)}
                  style={{
                    padding: "8px 12px", borderRadius: 8,
                    border: `1.5px solid ${(mode === "custom" && selectedType === t.id) || mode === "auto" ? t.color : "var(--border)"}`,
                    background: (mode === "custom" && selectedType === t.id) ? `${t.color}18` : "var(--surface2)",
                    cursor: mode === "custom" ? "pointer" : "default",
                    transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.color }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: "var(--muted)" }}>{t.desc}</div>
                  </div>
                  {mode === "auto" && <span style={{ fontSize: 9, color: "var(--muted)" }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Custom type switcher during answering ── */}
        {phase === "answering" && mode === "custom" && (
          <div style={{ marginBottom: 10, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--muted)" }}>Next type:</span>
            {QUESTION_TYPES.map(t => (
              <button key={t.id} onClick={() => setSelectedType(t.id)} style={{
                padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${selectedType === t.id ? t.color : "var(--border)"}`,
                background: selectedType === t.id ? `${t.color}18` : "var(--surface2)",
                color: selectedType === t.id ? t.color : "var(--muted)",
              }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Chat area ── */}
        <div ref={chatRef} style={{ maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, marginBottom: 14 }}>
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="icon">🎤</div>
              <p>Press Start to begin your {TOTAL_QUESTIONS}-question placement mock interview</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ animation: "fadeUp 0.3s ease both" }}>

              {msg.type === "system" && (
                <div style={{
                  padding: "10px 14px", background: "var(--surface2)",
                  border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: 12, color: "var(--text2)", textAlign: "center",
                }}>{msg.content}</div>
              )}

              {msg.type === "interviewer" && (
                <div style={{
                  padding: "12px 16px", background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${msg.content.typeColor}`,
                  borderRadius: 10, fontSize: 13, maxWidth: "90%", lineHeight: 1.65,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{msg.content.typeIcon}</span>
                    <span style={{
                      fontSize: 9, color: msg.content.typeColor, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.8px",
                      background: `${msg.content.typeColor}18`, padding: "2px 7px", borderRadius: 4,
                    }}>{msg.content.typeLabel}</span>
                    <span style={{ fontSize: 9, color: "var(--muted)" }}>· Interviewer</span>
                  </div>
                  {msg.content.text}
                </div>
              )}

              {msg.type === "user" && (
                <div style={{
                  padding: "12px 16px", background: "rgba(124,106,247,0.1)",
                  border: "1px solid rgba(124,106,247,0.18)", borderRadius: 10,
                  fontSize: 13, maxWidth: "88%", marginLeft: "auto", lineHeight: 1.65, textAlign: "right",
                }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>You</div>
                  {msg.content}
                </div>
              )}

              {msg.type === "feedback" && (
                <div style={{
                  padding: "14px 16px", background: "rgba(78,205,196,0.06)",
                  border: "1px solid rgba(78,205,196,0.15)", borderRadius: 10,
                  fontSize: 12, lineHeight: 1.7,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "var(--accent3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>AI Feedback</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{
                        fontFamily: "var(--font-head)", fontWeight: 800,
                        color: msg.content.score >= 7 ? "var(--success)" : msg.content.score >= 5 ? "var(--warning)" : "var(--danger)",
                      }}>{msg.content.score}/10</span>
                      <span>{msg.content.verdictIcon} {msg.content.verdict}</span>
                    </div>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>What worked: </span>
                    <span style={{ color: "var(--text2)" }}>{msg.content.whatWorked}</span>
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: "var(--danger)", fontWeight: 600 }}>What missed: </span>
                    <span style={{ color: "var(--text2)" }}>{msg.content.whatMissed}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>Strong answer includes: </span>
                    <span style={{ color: "var(--text2)" }}>{msg.content.hint}</span>
                  </div>
                </div>
              )}

              {msg.type === "error" && (
                <div style={{ padding: "10px 14px", background: "rgba(247,113,106,0.08)", border: "1px solid rgba(247,113,106,0.15)", borderRadius: 8, color: "var(--danger)", fontSize: 12 }}>
                  ⚠️ {msg.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)", fontSize: 12 }}>
              <span className="spinner" /> <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* ── Answer input ── */}
        {phase === "answering" && (
          <div style={{ display: "flex", gap: 8 }}>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your answer... (Enter to submit, Shift+Enter for new line)"
              style={{ minHeight: 80, flex: 1 }}
              autoFocus
            />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-primary btn-sm" onClick={submitAnswer} disabled={!answer.trim() || loading}>Send</button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const nextType = mode === "auto"
                  ? AUTO_SEQUENCE[Math.min(questionNum + 1, AUTO_SEQUENCE.length - 1)]
                  : selectedType;
                fetchNextQuestion(questionNum + 2, prevQuestions, nextType);
              }} disabled={loading}>Skip</button>
            </div>
          </div>
        )}

        {/* ── Start / Restart ── */}
        {(phase === "idle" || phase === "done") && (
          <button className="btn btn-primary" onClick={startSession} style={{ width: "100%", justifyContent: "center" }}>
            {phase === "done" ? "🔄 Start New Session" : `🎤 Start ${TOTAL_QUESTIONS}-Question Mock Interview`}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn btn-ghost" onClick={onBack}>← Study Plan</button>
        {phase !== "idle" && (
          <button className="btn btn-ghost btn-sm" onClick={startSession}>🔄 Restart</button>
        )}
      </div>
    </div>
  );
}

