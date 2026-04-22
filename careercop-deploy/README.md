# CareerCopilot 🚀

> AI-powered internship prep tool — resume analysis, skill gap detection, personalised study plans & mock interviews.

Built with React + Node.js + Express + Anthropic Claude API.

---

## What it does

1. **Field selector** — choose your target internship role
2. **Resume analyser** — upload PDF or paste text → get a match score, hire likelihood, strengths & missing skills
3. **Study plan** — personalised week-by-week plan built around YOUR gaps, with free resources
4. **Mock interviews** — 5 real questions per session with AI feedback on every answer

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| AI | Anthropic Claude API |
| PDF parsing | pdf-parse |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Setup (run locally in 5 minutes)

### 1. Get a free Anthropic API key
Go to https://console.anthropic.com → Create account → API Keys → Create key
Copy the key (starts with `sk-ant-...`)

### 2. Clone / unzip the project
```bash
cd careercop
```

### 3. Setup backend
```bash
cd backend
npm install
cp .env.example .env
# Open .env and paste your API key
npm start
```

### 4. Setup frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

### 5. Open in browser
Go to http://localhost:5173

---

## Deploy for free

### Backend → Render.com
1. Push to GitHub
2. Go to render.com → New Web Service → Connect repo
3. Set Root Directory: `backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variable: `ANTHROPIC_API_KEY=your_key_here`
7. Copy the Render URL (e.g. https://careercop-api.onrender.com)

### Frontend → Vercel.com
1. Go to vercel.com → Import repo
2. Set Root Directory: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-render-url.onrender.com`
4. Deploy!

---

## Project structure

```
careercop/
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main app + routing
│   │   ├── main.jsx
│   │   ├── index.css       # Global styles
│   │   └── components/
│   │       ├── FieldSelector.jsx
│   │       ├── ResumeUpload.jsx
│   │       ├── Analysis.jsx
│   │       ├── StudyPlan.jsx
│   │       └── Interview.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## Resume line (copy this!)

> Built CareerCopilot — a full-stack AI-powered internship prep platform using React, Node.js, and Claude API. Features include PDF resume analysis with match scoring, personalised study plan generation, and interactive mock interview sessions with real-time AI feedback.

---

## What to tell interviewers

- "I built the entire frontend in React with component-based architecture"
- "The backend is a REST API in Node.js/Express that handles PDF parsing and routes to the Claude API"
- "I deployed it with CI/CD — frontend on Vercel, backend on Render"
- "The AI is prompted with structured JSON output for consistent, parseable results"
