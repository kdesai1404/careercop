require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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
      error: "Failed to parse PDF. Please paste text instead.",
    });
  }
});

// ================= RESUME ANALYSIS =================
app.post("/api/analyse", async (req, res) => {
  const { resumeText, field, weeks } = req.body;

  console.log("🚀 Analyse API HIT");
  console.log("KEY STATUS:", {
    exists: !!process.env.ANTHROPIC_API_KEY,
    length: process.env.ANTHROPIC_API_KEY?.length
  });

  if (!resumeText || !field) {
    return res.status(400).json({
      error: "resumeText and field are required"
    });
  }

  try {
    console.log("➡️ Calling Claude API...");

    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: `You are a brutally honest but constructive career advisor who analyses resumes for tech internship roles. Always return ONLY valid JSON.`,
      messages: [
        {
          role: "user",
          content: `Analyse this resume for: "${field}"

${resumeText}

Return ONLY JSON.`,
        },
      ],
    });

    console.log("✅ Claude response received");

    const raw = message.content[0].text;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    res.json(json);

  } catch (err) {
    console.error("❌ Analyse error FULL:", err);
    res.status(500).json({
      error: err.message,
      details: "Backend crashed during AI call",
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
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: `You are a structured learning coach. Return ONLY JSON.`,
      messages: [
        {
          role: "user",
          content: `Create ${weeks || 4}-week plan for ${field}.

Missing: ${(missingSkills || []).join(", ")}
Existing: ${(existingSkills || []).join(", ")}

Return JSON only.`,
        },
      ],
    });

    const raw = message.content[0].text;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Study plan error:", err);
    res.status(500).json({
      error: "Study plan generation failed.",
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
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 256,
      system: `You are a senior engineer conducting interviews.`,
      messages: [
        {
          role: "user",
          content: `Ask question ${questionNumber || 1} for ${field}.
Previous: ${(previousQuestions || []).join(", ")}

Return only question.`,
        },
      ],
    });

    res.json({ question: message.content[0].text.trim() });
  } catch (err) {
    console.error("Interview question error:", err);
    res.status(500).json({
      error: "Could not generate question.",
    });
  }
});

// ================= INTERVIEW FEEDBACK =================
app.post("/api/interview/feedback", async (req, res) => {
  const { field, question, answer } = req.body;

  if (!question || !answer) {
    return res
      .status(400)
      .json({ error: "question and answer required" });
  }

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: `You are a tough but fair interview coach. Return JSON only.`,
      messages: [
        {
          role: "user",
          content: `Field: ${field}
Question: ${question}
Answer: ${answer}

Return JSON only.`,
        },
      ],
    });

    const raw = message.content[0].text;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({
      error: err.message,
      details: "Backend crashed during AI call",
    });
  }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`CareerCopilot API running on http://localhost:${PORT}`);
});
