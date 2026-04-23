require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const Groq = require("groq-sdk");

const app = express();

// ================= DEBUG =================
console.log("GROQ KEY LOADED:", !!process.env.GROQ_API_KEY);

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

// ================= GROQ HELPER =================
async function askGroq(prompt) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set");
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return completion.choices[0].message.content;
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

    const prompt = `
Analyse resume for: ${field}

${resumeText}

Return ONLY valid JSON with no extra text, no markdown, no code fences:
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

    console.log("➡️ Sending request to Groq...");
    const text = await askGroq(prompt);
    console.log("✅ Groq response received");

    let json;
    try {
      json = JSON.parse(text.replace(/```json|```/g, "").trim());
    } catch (e) {
      console.log("⚠️ JSON parse failed, raw output:", text);
      json = { raw: text };
    }

    res.json(json);

  } catch (err) {
    console.error("🔥 ANALYSE ERROR:", err);
    res.status(500).json({
      error: err.message,
      hint: "Check Groq API key or quota"
    });
  }
});

// ================= STUDY PLAN =================
app.post("/api/study-plan", async (req, res) => {
  try {
    const { field, weeks, missingSkills, existingSkills } = req.body;

    const prompt = `
Create a ${weeks || 4}-week study plan for ${field}.

Missing skills: ${(missingSkills || []).join(", ")}
Existing skills: ${(existingSkills || []).join(", ")}

Return ONLY valid JSON with no extra text, no markdown, no code fences.
`;

    const text = await askGroq(prompt);

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

    const prompt = `
Ask ONE ${field} interview question.
Avoid repeating these: ${(previousQuestions || []).join(", ")}
Reply with just the question, nothing else.
`;

    const text = await askGroq(prompt);
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

    const prompt = `
Field: ${field}
Question: ${question}
Answer: ${answer}

Return ONLY valid JSON with no extra text, no markdown, no code fences:
{
  "score": 1-10,
  "verdict": "Good|Needs work|Weak",
  "what_worked": "",
  "what_missed": "",
  "model_answer_hint": ""
}
`;

    const text = await askGroq(prompt);

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
