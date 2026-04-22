require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// ================= MULTER =================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ================= GEMINI =================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// ================= MIDDLEWARE (FIXED CORS) =================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// IMPORTANT: handle preflight requests
app.options("*", cors());

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
    res.status(500).json({ error: "Failed to parse PDF" });
  }
});

// ================= ANALYSE =================
app.post("/api/analyse", async (req, res) => {
  const { resumeText, field, weeks } = req.body;

  if (!resumeText || !field) {
    return res.status(400).json({
      error: "resumeText and field required",
    });
  }

  try {
    const prompt = `
Analyse resume for: ${field}

${resumeText}

Return ONLY JSON:
{
  "match_score": 0-100,
  "hire_likelihood": "Low|Medium|High|Very High",
  "summary": "short summary",
  "strengths": ["..."],
  "existing_skills": ["..."],
  "missing_skills": ["..."],
  "top_action": "most important next step",
  "realistic_goal": "what they can achieve in ${weeks || 4} weeks"
}
`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    let json;
    try {
      json = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      json = { raw: text };
    }

    res.json(json);
  } catch (err) {
    console.error("Analyse error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= STUDY PLAN =================
app.post("/api/study-plan", async (req, res) => {
  const { field, weeks, missingSkills, existingSkills } = req.body;

  try {
    const prompt = `
Create ${weeks || 4}-week study plan for ${field}

Missing: ${(missingSkills || []).join(", ")}
Existing: ${(existingSkills || []).join(", ")}

Return ONLY JSON
`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    let json;
    try {
      json = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      json = { raw: text };
    }

    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "Study plan failed" });
  }
});

// ================= INTERVIEW QUESTION =================
app.post("/api/interview/question", async (req, res) => {
  const { field, questionNumber, previousQuestions } = req.body;

  try {
    const prompt = `
Ask ONE ${field} interview question.
Avoid: ${(previousQuestions || []).join(", ")}
`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    res.json({ question: text.trim() });
  } catch (err) {
    res.status(500).json({ error: "Question failed" });
  }
});

// ================= FEEDBACK =================
app.post("/api/interview/feedback", async (req, res) => {
  const { field, question, answer } = req.body;

  try {
    const prompt = `
Field: ${field}
Question: ${question}
Answer: ${answer}

Return JSON:
{
  "score": 1-10,
  "verdict": "Good|Needs work|Weak",
  "what_worked": "",
  "what_missed": "",
  "model_answer_hint": ""
}
`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    let json;
    try {
      json = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch {
      json = { raw: text };
    }

    res.json(json);
  } catch (err) {
    res.status(500).json({ error: "Feedback failed" });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`CareerCopilot API running on http://localhost:${PORT}`);
});
