import { useState, useEffect, useRef } from "react";
import { api } from "../App";

const TOTAL_QUESTIONS = 5;

export default function Interview({ field, analysis, onBack }) {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNum, setQuestionNum] = useState(0);
  const [prevQuestions, setPrevQuestions] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle"); // idle | asking | answering | feedback | done
  const [scores, setScores] = useState([]);
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
    addMsg("system", `Welcome! I'll ask you ${TOTAL_QUESTIONS} real interview questions for ${field} roles. Answer as you would in an actual interview — I'll give you honest feedback after each one. Let's go!`);
    await fetchNextQuestion(1, []);
  };

  const fetchNextQuestion = async (num, prev) => {
    setLoading(true);
    try {
      const { question } = await api.getQuestion(field, num, prev);
      setCurrentQuestion(question);
      addMsg("interviewer", `Q${num}: ${question}`);
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
      const fb = await api.getFeedback(field, currentQuestion, myAnswer);
      setScores(prev => [...prev, fb.score]);

      const verdictColor = fb.verdict === "Good" ? "✅" : fb.verdict === "Needs work" ? "⚠️" : "❌";
      addMsg("feedback", {
        score: fb.score,
        verdict: fb.verdict,
        verdictIcon: verdictColor,
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
        const avg = Math.round([...scores, fb.score].reduce((a, b) => a + b, 0) / (scores.length + 1));
        addMsg("system", `🎉 Session complete! Your average score: ${avg}/10. ${avg >= 7 ? "Strong performance — keep practicing!" : avg >= 5 ? "Decent start — focus on depth and specifics." : "Keep going — review the feedback above and practice more."}`);
      } else {
        await fetchNextQuestion(nextNum, newPrev);
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ margin: 0 }}>
            <span className="dot" /> Mock interview — <span style={{ color: "var(--accent)" }}>{field}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {scores.length > 0 && (
              <span className="badge badge-purple">Avg: {avgScore}/10</span>
            )}
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {questionNum}/{TOTAL_QUESTIONS} done
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: "var(--surface3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(questionNum / TOTAL_QUESTIONS) * 100}%`,
              background: "linear-gradient(90deg, var(--accent), var(--accent3))",
              borderRadius: 2,
              transition: "width 0.5s ease",
            }} />
          </div>
        </div>

        {/* Chat area */}
        <div ref={chatRef} style={{ maxHeight: 450, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4, marginBottom: 14 }}>
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="icon">🎤</div>
              <p>Press Start to begin your mock interview</p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} style={{ animation: "fadeUp 0.3s ease both" }}>
              {msg.type === "system" && (
                <div style={{
                  padding: "10px 14px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--text2)",
                  textAlign: "center",
                }}>
                  {msg.content}
                </div>
              )}
              {msg.type === "interviewer" && (
                <div style={{
                  padding: "12px 16px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderLeft: "3px solid var(--accent)",
                  borderRadius: 10,
                  fontSize: 13,
                  maxWidth: "88%",
                  lineHeight: 1.65,
                }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>Interviewer</div>
                  {msg.content}
                </div>
              )}
              {msg.type === "user" && (
                <div style={{
                  padding: "12px 16px",
                  background: "rgba(124,106,247,0.1)",
                  border: "1px solid rgba(124,106,247,0.18)",
                  borderRadius: 10,
                  fontSize: 13,
                  maxWidth: "88%",
                  marginLeft: "auto",
                  lineHeight: 1.65,
                  textAlign: "right",
                }}>
                  <div style={{ fontSize: 10, color: "var(--accent)", fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.8px" }}>You</div>
                  {msg.content}
                </div>
              )}
              {msg.type === "feedback" && (
                <div style={{
                  padding: "14px 16px",
                  background: "rgba(78,205,196,0.06)",
                  border: "1px solid rgba(78,205,196,0.15)",
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.7,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: "var(--accent3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px" }}>AI Feedback</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontFamily: "var(--font-head)", fontWeight: 800, color: msg.content.score >= 7 ? "var(--success)" : msg.content.score >= 5 ? "var(--warning)" : "var(--danger)" }}>
                        {msg.content.score}/10
                      </span>
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

        {/* Input area */}
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
              <button className="btn btn-primary btn-sm" onClick={submitAnswer} disabled={!answer.trim() || loading}>
                Send
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fetchNextQuestion(questionNum + 1, prevQuestions)} disabled={loading}>
                Skip
              </button>
            </div>
          </div>
        )}

        {/* Start / Restart buttons */}
        {(phase === "idle" || phase === "done") && (
          <button className="btn btn-primary" onClick={startSession} style={{ width: "100%", justifyContent: "center" }}>
            {phase === "done" ? "🔄 Start New Session" : "🎤 Start Mock Interview"}
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
