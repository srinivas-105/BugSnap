"""
Conversational bug-report assistant.

Goal (per product spec): when a tester wants to report a bug, don't hand
them a blank form. Have a short back-and-forth that:
  1. Figures out *which* project/website inside the organization the bug
     belongs to (an org may run several sites/apps).
  2. Keeps asking for the details a developer would need (what happened,
     steps to reproduce, how severe it is) until the report is actually
     "developer-ready".
  3. Returns a structured object the frontend uses to pre-fill the report
     form so the user just reviews + submits.

If GEMINI_API_KEY is set, real calls are made to the Gemini API. If it's
missing or the call fails for any reason (offline, quota, bad key), a
deterministic rule-based assistant takes over transparently — the feature
never breaks the app, it just becomes "smart-scripted" instead of
"LLM-powered". The frontend is told which mode produced the reply via
`ai_powered`.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any

import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)

SYSTEM_INSTRUCTIONS = """You are the BugSnap Report Assistant. A user inside an organization's \
BugSnap workspace wants to report a software bug. Your job:

1. Work out which PROJECT (website/app) from the provided list the bug belongs to. If the \
user's message already makes it obvious, don't ask — just confirm briefly. If it's ambiguous \
and there are multiple projects, ask them to pick one from the list.
2. Ask short, specific follow-up questions (one or two at a time, never a giant list) until you \
have: a clear title, a clear description of what went wrong, step-by-step reproduction steps, \
and a priority estimate (low/medium/high/critical) based on how severe it sounds.
3. Once you have enough to write a developer-ready report, stop asking questions.

You must ALWAYS reply with ONLY a single JSON object (no markdown fences, no extra text) \
matching this exact shape:

{
  "message": "<what you say to the user next, conversational and short>",
  "done": <true only once you have title + description + steps + priority + project>,
  "extracted": {
    "title": "<short bug title or null>",
    "description": "<what happened, or null>",
    "steps_to_reproduce": "<numbered steps as plain text, or null>",
    "priority": "<low|medium|high|critical or null>",
    "project_id": "<the id of the matched project, or null>",
    "project_name_guess": "<the name of the matched project, or null>"
  }
}

Keep "message" under 45 words. Be warm and efficient, like a helpful QA lead, not a robot form.
"""


def _build_gemini_contents(messages: list[dict[str, str]], projects: list[dict[str, Any]]) -> list[dict]:
    project_list_text = "\n".join(
        f"- id={p['id']} | name={p['name']} | url={p.get('url') or 'n/a'} | description={p.get('description') or 'n/a'}"
        for p in projects
    ) or "(no projects registered yet)"

    intro = (
        SYSTEM_INSTRUCTIONS
        + "\n\nProjects available in this organization:\n"
        + project_list_text
    )

    contents = [{"role": "user", "parts": [{"text": intro}]}]
    for m in messages:
        role = "model" if m["role"] == "assistant" else "user"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    return contents


def _call_gemini(messages: list[dict[str, str]], projects: list[dict[str, Any]]) -> dict | None:
    if not GEMINI_API_KEY:
        return None
    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json={
                "contents": _build_gemini_contents(messages, projects),
                "generationConfig": {
                    "temperature": 0.4,
                    "response_mime_type": "application/json",
                },
            },
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text)
        return parsed
    except Exception:
        # Any failure (network, quota, bad JSON, unexpected shape) -> fall back silently.
        return None


# ---------------------------------------------------------------------------
# Deterministic fallback assistant (zero external dependency, always works)
# ---------------------------------------------------------------------------

URGENT_WORDS = ["urgent", "critical", "asap", "crash", "down", "broken", "cannot", "can't", "blocked", "data loss"]
HIGH_WORDS = ["error", "fail", "not working", "doesn't work", "wrong", "missing"]


def _guess_priority(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in URGENT_WORDS):
        return "critical"
    if any(w in lower for w in HIGH_WORDS):
        return "high"
    if len(lower.strip()) < 15:
        return "low"
    return "medium"


def _guess_project(text: str, projects: list[dict[str, Any]]) -> dict | None:
    lower = text.lower()
    best, best_score = None, 0
    for p in projects:
        haystack = f"{p['name']} {p.get('url') or ''} {p.get('description') or ''}".lower()
        score = 0
        for word in re.findall(r"[a-z0-9]+", haystack):
            if len(word) > 3 and word in lower:
                score += 1
        if p["name"].lower() in lower:
            score += 5
        if score > best_score:
            best, best_score = p, score
    return best if best_score > 0 else None


def _fallback_assist(messages: list[dict[str, str]], projects: list[dict[str, Any]]) -> dict:
    user_messages = [m["content"] for m in messages if m["role"] == "user"]
    combined = " ".join(user_messages).strip()
    turn = len(user_messages)

    if turn == 0 or not combined:
        if len(projects) > 1:
            names = ", ".join(p["name"] for p in projects)
            msg = f"Hi! I'm the BugSnap assistant. Which app is this about — {names} — or just describe the issue and I'll try to figure it out."
        else:
            msg = "Hi! I'm the BugSnap assistant. Tell me what went wrong, in your own words."
        return {
            "message": msg,
            "done": False,
            "extracted": {
                "title": None,
                "description": None,
                "steps_to_reproduce": None,
                "priority": None,
                "project_id": None,
                "project_name_guess": None,
            },
        }

    project_match = _guess_project(combined, projects)
    has_steps = any(
        kw in combined.lower() for kw in ["step", "then i", "first i", "after that", "1.", "1)"]
    ) or turn >= 3
    priority = _guess_priority(combined)

    title = user_messages[0].strip().rstrip(".")
    if len(title) > 80:
        title = title[:77] + "..."

    if not project_match and len(projects) > 1:
        names = ", ".join(p["name"] for p in projects)
        return {
            "message": f"Got it. Just to route this correctly — which website/app is this on? Options: {names}.",
            "done": False,
            "extracted": {
                "title": title,
                "description": combined,
                "steps_to_reproduce": None,
                "priority": priority,
                "project_id": None,
                "project_name_guess": None,
            },
        }

    if not has_steps:
        return {
            "message": "Thanks — one more thing: can you walk me through the exact steps to reproduce it, step by step?",
            "done": False,
            "extracted": {
                "title": title,
                "description": combined,
                "steps_to_reproduce": None,
                "priority": priority,
                "project_id": project_match["id"] if project_match else (projects[0]["id"] if len(projects) == 1 else None),
                "project_name_guess": project_match["name"] if project_match else (projects[0]["name"] if len(projects) == 1 else None),
            },
        }

    steps_text = user_messages[-1] if len(user_messages) > 1 else "Not explicitly provided — see description."

    return {
        "message": "Perfect, I've got everything I need. Review the report below and submit when ready.",
        "done": True,
        "extracted": {
            "title": title,
            "description": combined,
            "steps_to_reproduce": steps_text,
            "priority": priority,
            "project_id": project_match["id"] if project_match else (projects[0]["id"] if len(projects) == 1 else None),
            "project_name_guess": project_match["name"] if project_match else (projects[0]["name"] if len(projects) == 1 else None),
        },
    }


# ---------------------------------------------------------------------------
# Public entrypoint
# ---------------------------------------------------------------------------

def run_assistant(messages: list[dict[str, str]], projects: list[dict[str, Any]]) -> dict:
    gemini_result = _call_gemini(messages, projects)
    if gemini_result and isinstance(gemini_result.get("extracted"), dict) and "message" in gemini_result:
        gemini_result["ai_powered"] = True
        return gemini_result

    result = _fallback_assist(messages, projects)
    result["ai_powered"] = False
    return result
