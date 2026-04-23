require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// ================= DEBUG =================
console.log("GEMINI KEY LOADED:", !!process.env.GEMINI_API_KEY);

// ================= MIDDLEWARE =================
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options("*", cors());
app.use(express.json({ limit: "2mb" }));

// ================= MULTER =================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
  res.json({ status: "CareerCopilot API running" });
});

// ================= GEMINI HELPER =================
function getModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not set");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });
}

// ================= PDF PARSER =================
app.post("/api/parse-pdf", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = await pdf(req.file.buffer);
    res.json({ text: data.text });

  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ error: "Failed to parse PDF" });
  }
});

// ================= ANALYSE RESUME =================
app.post("/api/analyse", async (req, res) => {
  try {
    const { resumeText, field, weeks } = req.body;

    if (!resumeText || !field) {
      return res.status(400).json({ error: "Missing data" });
    }

    const model = getModel();

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
    console.error("ANALYSE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= STUDY PLAN =================
app.post("/api/study-plan", async (req, res) => {
  try {
    const { field, weeks, missingSkills, existingSkills } = req.body;

    const model = getModel();

    const prompt = `
Create ${weeks || 4}-week study plan for ${field}

Missing: ${(missingSkills || []).join(", ")}
Existing: ${(existingSkills || []).join(", ")}

Return ONLY JSON.
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
    console.error("STUDY PLAN ERROR:", err);
    res.status(500).json({ error: "Study plan failed" });
  }
});

// ================= INTERVIEW QUESTION =================
app.post("/api/interview/question", async (req, res) => {
  try {
    const { field, previousQuestions } = req.body;

    const model = getModel();

    const prompt = `
Ask ONE ${field} interview question.
Avoid: ${(previousQuestions || []).join(", ")}
`;

    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    res.json({ question: text.trim() });

  } catch (err) {
    console.error("QUESTION ERROR:", err);
    res.status(500).json({ error: "Question failed" });
  }
});

// ================= FEEDBACK =================
app.post("/api/interview/feedback", async (req, res) => {
  try {
    const { field, question, answer } = req.body;

    const model = getModel();

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
    console.error("FEEDBACK ERROR:", err);
    res.status(500).json({ error: "Feedback failed" });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
