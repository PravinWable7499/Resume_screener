<<<<<<< HEAD
# ResumeAI – AI-Powered Resume Screener

Screen multiple resumes against a job description using Claude AI. Get instant scores, skill analysis, and candidate rankings.

## Quick Start

### 1. Set your Anthropic API key

Create `backend/.env` (copy from `backend/.env.example`):
```
ANTHROPIC_API_KEY=sk-ant-...
```

Or set it as an environment variable:
```powershell
$env:ANTHROPIC_API_KEY = "sk-ant-..."
```

### 2. Start the backend

Open a terminal and run:
```powershell
cd backend
py -m uvicorn main:app --reload
```
Backend runs at http://localhost:8000

### 3. Start the frontend

Open a **second** terminal and run:
```powershell
cd frontend
npm run dev
```
Frontend runs at http://localhost:3000 — open this in your browser.

---

## How It Works

1. **Upload Resumes** — drag & drop PDF or DOCX files (multiple at once)
2. **Paste JD** — paste the full job description (50+ characters)
3. **Analyze** — Claude AI extracts skills, scores each candidate 0–100, and ranks them
4. **Review Dashboard** — see scores, matched/missing skills, strengths, concerns
5. **Take Action** — shortlist or reject candidates with one click

## Scoring Guide

| Score | Meaning |
|-------|---------|
| 90–100 | Exceptional match |
| 75–89 | Strong match |
| 60–74 | Moderate match |
| 40–59 | Partial match |
| 0–39 | Weak match |

## Tech Stack

- **Backend**: Python · FastAPI · Anthropic Claude SDK
- **AI**: Claude Sonnet (claude-sonnet-4-6)
- **Resume parsing**: pdfplumber (PDF) · python-docx (Word)
- **Frontend**: React 18 · Vite · Tailwind CSS
=======
# Resume_screener
>>>>>>> 747ca617bc9c72a81eda7f18225339a99a65ecf7
