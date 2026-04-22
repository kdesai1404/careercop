require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/", (req, res) => res.json({ status: "CareerCopilot API running" }));

// POST /api/parse-pdf — extract text from uploaded PDF
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

// POST /api/analyse — analyse resume against a target field
app.post("/api/analyse", async (req, res) => {
  const { resumeText, field, weeks } = req.body;
  if (!resumeText || !field) return res.status(400).json({ error: "resumeText and field are required" });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: `You are a brutally honest but constructive career advisor who analyses resumes for tech internship roles. 
Always return ONLY valid JSON, no markdown fences, no explanation. Be specific and honest, not generic.`,
      messages: [
        {
          role: "user",
          content: `Analyse this resume for the field: "${field}" (${weeks || 4} weeks until application deadline).

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
  "realistic_goal": "<honest assessment of what they can realistically achieve in ${weeks || 4} weeks and what kind of internship they can target>",
  "resume_tips": ["<specific resume improvement>", "<specific resume improvement>", "<specific improvement>"]
}`,
        },
      ],
    });

    const raw = message.content[0].text;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Analyse error:", err);
    res.status(500).json({ error: "Analysis failed. Check your API key and try again." });
  }
});

// POST /api/study-plan — generate personalised week-by-week plan
app.post("/api/study-plan", async (req, res) => {
  const { field, weeks, missingSkills, existingSkills } = req.body;
  if (!field) return res.status(400).json({ error: "field is required" });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2048,
      system: `You are a structured learning coach who creates realistic, actionable study plans. 
Return ONLY valid JSON, no markdown. Be specific with resources (actual website names, course names).`,
      messages: [
        {
          role: "user",
          content: `Create a ${weeks || 4}-week study plan for someone targeting "${field}" internships.

Their missing skills: ${(missingSkills || []).join(", ") || "basics of the field"}
Their existing skills: ${(existingSkills || []).join(", ") || "basic programming"}
Time available: ${weeks || 4} weeks

Return ONLY this JSON (no backticks):
{
  "weeks": [
    {
      "week": 1,
      "theme": "<short theme name, max 4 words>",
      "goal": "<what they will be able to do by end of week>",
      "daily_hours": <recommended hours per day, integer>,
      "tasks": [
        "<specific task 1>",
        "<specific task 2>",
        "<specific task 3>",
        "<specific task 4>"
      ],
      "resource": "<specific free resource: e.g. 'The Odin Project - HTML/CSS section' or 'freeCodeCamp JavaScript course'>",
      "resource_url": "<actual URL to the resource>",
      "project": "<small weekend project to build and commit to GitHub>"
    }
  ],
  "final_project": "<the one impressive project to build for their resume — include tech stack>",
  "github_tip": "<specific tip for making their GitHub look good>",
  "apply_strategy": "<where and how to apply for ${field} internships in India>"
}

Generate exactly ${weeks || 4} week objects.`,
        },
      ],
    });

    const raw = message.content[0].text;
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch (err) {
    console.error("Study plan error:", err);
    res.status(500).json({ error: "Study plan generation failed." });
  }
});

// POST /api/interview/question — get next interview question
app.post("/api/interview/question", async (req, res) => {
  const { field, questionNumber, previousQuestions } = req.body;
  if (!field) return res.status(400).json({ error: "field is required" });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 256,
      system: `You are a senior engineer conducting a real internship interview for ${field} roles. 
Ask ONE question per response. Mix technical and behavioral. Be realistic — these are actual questions interviewers ask.
Return ONLY the question text, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Ask interview question #${questionNumber || 1} for a ${field} internship.
${previousQuestions?.length ? `Previous questions asked (don't repeat these topics): ${previousQuestions.join(" | ")}` : ""}
${questionNumber === 1 ? "Start with a common introductory technical question." : ""}
${questionNumber === 3 ? "Ask a problem-solving or project-based question." : ""}
${questionNumber === 5 ? "Ask a behavioral question about teamwork or handling challenges." : ""}
Return ONLY the question.`,
        },
      ],
    });

    res.json({ question: message.content[0].text.trim() });
  } catch (err) {
    console.error("Interview question error:", err);
    res.status(500).json({ error: "Could not generate question." });
  }
});

// POST /api/interview/feedback — get feedback on an answer
app.post("/api/interview/feedback", async (req, res) => {
  const { field, question, answer } = req.body;
  if (!question || !answer) return res.status(400).json({ error: "question and answer required" });

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 400,
      system: `You are a tough but fair interview coach. Give honest, actionable feedback.
Return ONLY valid JSON, no markdown.`,
      messages: [
        {
          role: "user",
          content: `Field: ${field}
Interview question: "${question}"
Candidate's answer: "${answer}"

Return ONLY this JSON:
{
  "score": <integer 1-10>,
  "verdict": "<Good|Needs work|Weak>",
  "what_worked": "<what was good about this answer — be specific>",
  "what_missed": "<what was missing or incorrect — be specific>",
  "model_answer_hint": "<1-2 sentences on what a strong answer would include>"
}`,
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
  details: "Backend crashed during AI call"
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`CareerCopilot API running on http://localhost:${PORT}`));
