from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import anthropic
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="AI Standup Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class StandupRequest(BaseModel):
    raw_input: str
    input_type: str = "notes"
    team_context: str = ""


@app.get("/")
def root():
    return {"status": "AI Standup Generator API is running"}


@app.post("/generate")
def generate_standup(req: StandupRequest):
    if not req.raw_input.strip():
        raise HTTPException(status_code=400, detail="Input cannot be empty")

    input_hint = {
        "notes": "rough personal notes or bullet points",
        "commits": "git commit messages",
        "slack": "Slack/chat messages",
    }.get(req.input_type, "notes")

    team_line = f"\nTeam context: {req.team_context}" if req.team_context else ""

    prompt = f"""You are an expert engineering manager who writes perfect standup updates.
The developer has provided their {input_hint} from yesterday.{team_line}

IMPORTANT: If the input mentions multiple projects, group all bullets under each project name.

Generate a professional standup update and respond ONLY with a valid JSON object — no markdown, no backticks.

JSON structure:
{{
  "projects": [
    {{
      "name": "Project or area name (e.g. Digilib, OMS, General)",
      "yesterday": ["concise bullet of what was done"],
      "today": ["what they plan to do today for this project"],
      "blockers": ["any blocker for this project, or None"]
    }}
  ],
  "summary": "One crisp sentence summarizing all work — suitable for a manager",
  "highlight": "The single most impressive thing accomplished across all projects",
  "mood": "productive or blocked or steady or crushing it",
  "tags": ["relevant tech/project tags — max 5"]
}}

Rules:
- If only one project is mentioned, still use the projects array with one item
- Keep bullets short (max 10 words each), active voice
- Today plan should logically follow from yesterday work
- If a blocker is mentioned surface it clearly, else use None

Raw input:
{req.raw_input}"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    clean = re.sub(r"```json|```", "", raw).strip()

    try:
        result = json.loads(clean)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    return result


@app.post("/weekly-summary")
def weekly_summary(logs: list[dict]):
    if not logs:
        raise HTTPException(status_code=400, detail="No logs provided")

    logs_text = "\n".join(
        [f"- {l.get('date','')}: {l.get('highlight','')} | tags: {', '.join(l.get('tags',[]))}"
         for l in logs]
    )

    prompt = f"""You are a senior engineer writing a weekly accomplishment summary.
Given these daily work logs, generate a grouped weekly summary.
Respond ONLY with a valid JSON object — no markdown, no backticks.

JSON structure:
{{
  "projects": [
    {{
      "name": "Project name (e.g. Digilib, OMS, General)",
      "achievements": ["key achievement 1", "key achievement 2"]
    }}
  ],
  "overall_summary": "2-3 sentence paragraph of the full week",
  "productivity_score": integer 1 to 10
}}

Daily logs:
{logs_text}"""

    message = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text
    clean = re.sub(r"```json|```", "", raw).strip()

    try:
        result = json.loads(clean)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")

    return result
