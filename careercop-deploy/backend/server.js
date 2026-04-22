require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ✅ GEMINI SETUP (FREE API)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.json({ status: "CareerCopilot API running" });
});

// ================= PDF PARSER =================
app.post("/api/parse-pdf", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = await pdf(req.file.buffer);
    res.json({ text: data.text });
  } catch (err) {
    console.error("PDF parse error:", err);
    res.status(500).json({
      error: "Failed to parse PDF",
    });
  }
});

// ================= RESUME ANALYSIS (GEMINI) =================
app.post("/api/analyse", async (req, res) => {
  const { resumeText, field, weeks } = req.body;

  if (!resumeText || !field) {
    return res.status(400).json({
      error: "resumeText and field are required",
    });
  }

  try {
    const prompt = `
You are a brutally honest but constructive career advisor.

Analyse this resume for: ${field}

Resume:
${resumeText}

Return ONLY valid JSON:
{
  "match_score": 0-100,
  "hire_likelihood": "Low|Medium|High|Very High",
  "summary": "short honest summary",
  "strengths": ["..."],
  "existing_skills": ["..."],
  "missing_skills": ["..."],
  "top_action": "most important next step",
  "realistic_goal": "what they can achieve in ${weeks || 4} weeks"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    // safe JSON parse
    let json;
    try {
      json = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    } catch (e) {
      json = { raw: responseText };
    }

    res.json(json);
  } catch (err) {
    console.error("Analyse error:", err);
    res.status(500).json({
      error: err.message,
      details: "Gemini API failed",
    });
  }
});

// ================= STUDY PLAN =================
app.post("/api/study-plan", async (req, res) => {
  const { field, weeks, missingSkills, existingSkills } = req.body;

  if (!field) {
    return res.status(400).json({ error: "field is required" });
  }

  try {
    const prompt = `
Create a ${weeks || 4}-week study plan for ${field}.

Missing skills: ${(missingSkills || []).join(", ")}
Existing skills: ${(existingSkills || []).join(", ")}

Return ONLY JSON:
{
  "weeks": [
    {
      "week": 1,
      "theme": "string",
      "goal": "string",
      "daily_hours": 3,
      "tasks": ["task1", "task2", "task3"],
      "resource": "string",
      "project": "string"
    }
  ],
  "final_project": "string",
  "apply_strategy": "string"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    let json;
    try {
      json = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    } catch (e) {
      json = { raw: responseText };
    }

    res.json(json);
  } catch (err) {
    console.error("Study plan error:", err);
    res.status(500).json({
      error: "Study plan failed",
    });
  }
});

// ================= INTERVIEW QUESTION =================
app.post("/api/interview/question", async (req, res) => {
  const { field, questionNumber, previousQuestions } = req.body;

  if (!field) {
    return res.status(400).json({ error: "field is required" });
  }

  try {
    const prompt = `
You are an interviewer for ${field} roles.

Ask ONE interview question.
Question number: ${questionNumber || 1}
Avoid repeating: ${(previousQuestions || []).join(", ")}

Return ONLY the question text.
`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    res.json({ question: responseText.trim() });
  } catch (err) {
    console.error("Interview question error:", err);
    res.status(500).json({
      error: "Failed to generate question",
    });
  }
});

// ================= INTERVIEW FEEDBACK =================
app.post("/api/interview/feedback", async (req, res) => {
  const { field, question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      error: "question and answer required",
    });
  }

  try {
    const prompt = `
Field: ${field}
Question: ${question}
Answer: ${answer}

Return ONLY JSON:
{
  "score": 1-10,
  "verdict": "Good|Needs work|Weak",
  "what_worked": "string",
  "what_missed": "string",
  "model_answer_hint": "string"
}
`;

    const result = await model.generateContent(prompt);
    const responseText = await result.response.text();

    let json;
    try {
      json = JSON.parse(responseText.replace(/```json|```/g, "").trim());
    } catch (e) {
      json = { raw: responseText };
    }

    res.json(json);
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({
      error: "Feedback failed",
    });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`CareerCopilot API running on http://localhost:${PORT}`);
});
