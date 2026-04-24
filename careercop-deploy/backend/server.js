const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// ─── Groq API helper ────────────────────────────────────────────────────────
async function groqChat({ system, userMessage, maxTokens = 1024 }) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ status: "CareerCopilot API running (Groq)" }));

// ─── POST /api/parse-pdf ─────────────────────────────────────────────────────
app.post("/api/parse-pdf", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const data = await pdf(req.file.buffer);
    res.json({ text: data.text });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({ error: "Failed to parse PDF. Please paste text instead." });
  }
});

// ─── POST /api/analyse ────────────────────────────────────────────────────────
app.post("/api/analyse", async (req, res) => {
  const { resumeText, field, weeks } = req.body;
  if (!resumeText || !field)
    return res.status(400).json({ error: "resumeText and field are required" });

  try {
    const raw = await groqChat({
      maxTokens: 1024,
      system: `You are a brutally honest but constructive career advisor who analyses resumes for tech placement roles. 
Always return ONLY valid JSON, no markdown fences, no explanation. Be specific and honest, not generic.`,
      userMessage: `Analyse this resume for the field: "${field}" (${weeks || 4} weeks until placement deadline).

RESUME:
${resumeText}

Return ONLY this exact JSON structure (no backticks, no extra text):
{
  "match_score": <integer 0-100>,
  "hire_likelihood": "<Low|Medium|High|Very High>",
  "summary": "<2-3 sentences: honest, specific, not generic. Mention actual things from the resume.>",
  "strengths": ["<specific strength from resume>", "<specific strength>", "<specific strength>"],
  "existing_skills": ["<skill actually mentioned in resume>", "...up to 5"],
  "missing_skills": ["<critical missing skill for ${field}>", "...up to 6 skills"],
  "top_action": "<the single most impactful thing they should do THIS week — be specific>",
  "realistic_goal": "<honest assessment of what they can realistically achieve in ${weeks || 4} weeks and what kind of placement role they can target>",
  "resume_tips": ["<specific resume improvement>", "<specific resume improvement>", "<specific improvement>"]
}`,
    });

    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Analyse error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/study-plan ─────────────────────────────────────────────────────
app.post("/api/study-plan", async (req, res) => {
  const { field, weeks, missingSkills, existingSkills, dailyHours } = req.body; // ← added dailyHours
  if (!field) return res.status(400).json({ error: "field is required" });

  const hoursPerDay = dailyHours || 2;
  const totalHours = hoursPerDay * 7 * (weeks || 4);

  try {
    const raw = await groqChat({
      maxTokens: 2048,
      system: `You are a structured learning coach who creates realistic, actionable study plans tailored to the candidate's available time.
Return ONLY valid JSON, no markdown. Be specific with resources (actual website names, course names). Make tasks fit exactly within the daily hours given.`,
      userMessage: `Create a ${weeks || 4}-week study plan for someone targeting "${field}" placement roles.

Their missing skills: ${(missingSkills || []).join(", ") || "basics of the field"}
Their existing skills: ${(existingSkills || []).join(", ") || "basic programming"}
Weeks available: ${weeks || 4}
Daily study hours available: ${hoursPerDay} hours/day (${hoursPerDay * 7} hours/week, ${totalHours} total hours)

IMPORTANT: Tasks MUST be completable in ${hoursPerDay} hours/day.
- 1-2h/day: 2-3 focused tasks, lightweight project
- 3-4h/day: 3-4 tasks, moderate project  
- 5+h/day: full tasks, bigger projects

Return ONLY this JSON (no backticks):
{
  "weeks": [
    {
      "week": 1,
      "theme": "<short theme name, max 4 words>",
      "goal": "<what they will be able to do by end of week>",
      "daily_hours": ${hoursPerDay},
      "daily_schedule": "<how to split the ${hoursPerDay} hours — e.g. '1h theory + 1h practice'>",
      "tasks": [
        "<specific task 1 — [estimated time]>",
        "<specific task 2 — [estimated time]>",
        "<specific task 3 — [estimated time]>"
      ],
      "resource": "<specific free resource name>",
      "resource_url": "<actual URL to the resource>",
      "project": "<weekend project scoped to ${hoursPerDay}h/day>"
    }
  ],
  "final_project": "<impressive capstone project scoped to ${totalHours} total hours, with tech stack>",
  "github_tip": "<specific tip for making their GitHub look good>",
  "apply_strategy": "<where and how to apply for ${field} placement roles in India>"
}

Generate exactly ${weeks || 4} week objects.`,
    });

    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Study plan error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/interview/question ─────────────────────────────────────────────
const TYPE_INSTRUCTIONS = {
  personal:      "Ask a PERSONAL/INTRODUCTION question — about background, motivation, goals, strengths/weaknesses, or why they chose this field. E.g. 'Tell me about yourself', 'Why do you want to work in this field?', 'What is your biggest weakness?'",
  technical:     "Ask a TECHNICAL question — about specific concepts, tools, frameworks, syntax, architecture, or best practices. Test actual technical knowledge.",
  problemsolving:"Ask a PROBLEM SOLVING question — a coding challenge, algorithm, system design, or debugging scenario. E.g. 'Write a function that...', 'How would you design a system that...'",
  behavioral:    "Ask a BEHAVIORAL question using STAR format — about past experiences, teamwork, conflict, failure, deadlines. E.g. 'Tell me about a time you failed', 'Describe a challenging project'",
  hr:            "Ask an HR/SITUATIONAL question — about salary expectations, notice period, relocation, work style, or workplace scenarios. E.g. 'What are your salary expectations?', 'How do you handle feedback from seniors?'",
};

const TYPE_LABELS = {
  personal:      "Personal / Intro",
  technical:     "Technical",
  problemsolving:"Problem Solving",
  behavioral:    "Behavioral",
  hr:            "HR / Situational",
};

app.post("/api/interview/question", async (req, res) => {
  const { field, questionNumber, previousQuestions, questionType } = req.body; // ← added questionType
  if (!field) return res.status(400).json({ error: "field is required" });

  const instruction = TYPE_INSTRUCTIONS[questionType] || `Ask a realistic placement interview question for ${field}. Mix types naturally.`;

  try {
    const question = await groqChat({
      maxTokens: 300,
      system: `You are a senior engineer conducting a real placement interview for ${field} roles at a top tech company.
Ask ONE question per response. Be realistic — these are actual questions interviewers ask.
Return ONLY the question text, nothing else. No labels, no preamble.`,
      userMessage: `Interview question #${questionNumber || 1} for a ${field} placement role.
${previousQuestions?.length ? `Already asked (don't repeat these topics): ${previousQuestions.join(" | ")}` : ""}

Question type instruction: ${instruction}

Return ONLY the question.`,
    });

    res.json({
      question: question.trim(),
      questionType: questionType || "general",
      questionTypeLabel: TYPE_LABELS[questionType] || "General",
    });
  } catch (err) {
    console.error("Interview question error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/interview/feedback ─────────────────────────────────────────────
app.post("/api/interview/feedback", async (req, res) => {
  const { field, question, answer, questionType } = req.body; // ← added questionType
  if (!question || !answer)
    return res.status(400).json({ error: "question and answer required" });

  try {
    const raw = await groqChat({
      maxTokens: 500,
      system: `You are a tough but fair placement interview coach. Give honest, actionable feedback.
Return ONLY valid JSON, no markdown.`,
      userMessage: `Field: ${field}
Question type: ${questionType || "general"}
Interview question: "${question}"
Candidate's answer: "${answer}"

Return ONLY this JSON:
{
  "score": <integer 1-10>,
  "verdict": "<Good|Needs work|Weak>",
  "what_worked": "<what was good about this answer — be specific>",
  "what_missed": "<what was missing or incorrect — be specific>",
  "model_answer_hint": "<2-3 sentences on what a strong answer would include, tailored to the question type>"
}`,
    });

    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Feedback error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CareerCopilot API running on http://localhost:${PORT}`));
