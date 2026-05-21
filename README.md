# ⚡ StandupAI — Daily Work Generator

Stop dreading the 9am standup. Paste your commits, Slack messages, or rough notes — get a professional standup update in seconds. Saves a work log for weekly summaries and performance reviews.

## 🚀 Features
- ⚡ Generate standup from notes, git commits, or Slack messages
- 📋 One-click copy in Slack/Teams format
- 💾 Work log saved in browser (localStorage)
- 📊 Weekly summary generator for performance reviews
- 🔗 Auto-generates LinkedIn post from your week's work

## 🗂 Project Structure
```
standup-ai/
├── backend/
│   ├── main.py           # FastAPI app
│   ├── requirements.txt
│   ├── render.yaml       # Render deployment config
│   └── .env.example
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js
```

## ⚙️ Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Add your key: ANTHROPIC_API_KEY=sk-ant-...
uvicorn main:app --reload --port 8000
```
Get API key: https://console.anthropic.com

### Frontend
In `frontend/app.js`, set:
```js
const API_URL = "http://localhost:8000";
```
Open `frontend/index.html` in browser (or use VS Code Live Server).

## ☁️ Deployment

### Backend → Render (free)
1. Push `backend/` to GitHub
2. [render.com](https://render.com) → New Web Service → connect repo
3. Build: `pip install -r requirements.txt`
4. Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add env var: `ANTHROPIC_API_KEY`
6. Copy your Render URL

### Frontend → Netlify (free)
1. Update `API_URL` in `app.js` with your Render URL
2. [netlify.com](https://netlify.com) → New site → GitHub → publish dir: `frontend`

## 🛠 Tech Stack
| | |
|---|---|
| Backend | Python, FastAPI |
| AI | Anthropic Claude API |
| Frontend | HTML, CSS, Vanilla JS |
| Hosting | Render (backend) + Netlify (frontend) |

---
Built with ❤️ by [Your Name](https://linkedin.com/in/yourprofile)
