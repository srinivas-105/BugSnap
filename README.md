# BugSnap

**Capture Bugs. Faster Reports. Faster Fixes.**

A multi-tenant bug reporting platform. Any company or college can create its own private
workspace, invite developers/testers, register its websites/apps as "projects", and report
bugs through a short AI-guided conversation instead of a blank form.

---

## What's inside

- **Local SQLite backend** (FastAPI + SQLAlchemy) — no Supabase, no external DB account needed.
  Zero-dependency auth (stdlib password hashing + signed tokens), so `pip install` never fails
  on native-extension issues.
- **AI Report Assistant** — a short chat that figures out *which* of the organization's
  websites/apps a bug belongs to, then keeps asking follow-up questions until it has a
  developer-ready report (title, description, steps, priority). Uses **Google Gemini** if you
  provide an API key; otherwise falls back to a deterministic rule-based assistant automatically
  — the feature always works, with or without a key.
- **Three tiers of accounts:**
  1. **Platform Admin** (you, the BugSnap owner) — one login, sees every organization on the
     platform, platform-wide stats, can delete organizations.
  2. **Organization Admin** — manages their org's team (invite/remove developers & testers),
     registers projects/websites, sees org-wide stats, and sees exactly who under them has
     registered and when they last logged in.
  3. **Developer / Tester** — testers get their own "My Reports" home with a big Report-a-bug
     button and their screenshots; developers get their own Bug Queue (kanban by status).
- **Invite-only workspace access** — an admin adds a teammate by **email + role only** (no
  password). That email is now on an allow-list for the workspace. The teammate must go to
  `/register`, enter the workspace code + that exact email, and set their own name & password.
  Anyone who doesn't have an email the admin explicitly added is rejected at registration, even
  if they somehow know the workspace code and a password.
- **Auto-captured environment info** — browser, OS, device, screen resolution are read from
  `navigator`/`window.screen` on submission, not typed by hand.
- **Intro video splash** — plays automatically right after anyone's very first successful login
  or registration (no manual click needed), then lands them on their role's home page. Subsequent
  logins skip straight to the dashboard. Tilt-on-hover project cards and a dark glassmorphic
  design system round out the UI.

---

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # macOS/Linux
pip install -r requirements.txt
cp .env.example .env             # already has safe defaults, edit if you want
uvicorn app.main:app --reload --port 8000
```

**Windows (PowerShell):**
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```
> If `Activate.ps1` is blocked, run PowerShell once as your normal user and execute:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`, then retry activation.
> Also use `python`, not `python3` — Windows Python installs (including Miniconda/Anaconda)
> almost never register a `python3` command.

The SQLite database file (`bugsnap.db`) and an `uploads/` folder are created automatically on
first run, along with:

- A **platform admin** account: `owner@bugsnap.dev` / `BugSnapOwner123!`
  (change via `PLATFORM_ADMIN_EMAIL` / `PLATFORM_ADMIN_PASSWORD` in `.env`)
- A **demo organization** (workspace code `DEMOCORP`) with 3 projects, 3 users, and 3 sample
  bugs already seeded, so the app is never an empty screen:
  - `admin@democorp.dev` / `Demo123!` (admin)
  - `dev@democorp.dev` / `Demo123!` (developer)
  - `tester@democorp.dev` / `Demo123!` (tester)

Backend runs at **http://localhost:8000** — interactive API docs at `/docs`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env             # points at http://localhost:8000 by default
npm run dev
```

Frontend runs at **http://localhost:5173**.

### 3. (Optional) Enable real Gemini AI

By default the AI Report Assistant runs on a smart rule-based fallback that still asks
clarifying questions and routes bugs to the right project — no key required. To use real
Gemini responses instead:

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. In `backend/.env`, set `GEMINI_API_KEY=your-key-here`.
3. Restart the backend. The chat bubble in the Report Bug page will show "Gemini-powered"
   instead of "Smart assistant" once it's active.

---

## Project structure

```
BugSnap/
  backend/
    app/
      main.py            FastAPI app, CORS, startup seed
      database.py        SQLite engine/session
      models.py           SQLAlchemy models
      schemas.py          Pydantic request/response schemas
      security.py         stdlib-only password hashing + signed tokens
      deps.py             auth dependencies (org user / platform admin)
      ai_assistant.py     Gemini call + deterministic fallback
      seed.py              platform admin + demo org seeding
      routers/
        auth.py            signup / login / me / platform-admin login
        projects.py        websites/apps CRUD (org-scoped)
        bugs.py             bug CRUD, status, comments, screenshot upload
        org_admin.py        org user management + org stats
        platform_admin.py   cross-org view for the platform owner
        ai.py                the /ai/assist endpoint
    requirements.txt
    .env.example
  frontend/
    src/
      pages/               one file per screen
      components/          Layout, TiltCard, Badges, RouteGuards
      state/                 org auth + platform auth React contexts
      lib/api.ts             typed axios client
      styles/global.css      design system
    public/intro/intro.mp4   intro splash video
```

## Roles & permissions

| Action                          | Tester | Developer | Admin | Platform Admin |
|----------------------------------|:------:|:---------:|:-----:|:---------------:|
| Report a bug                     | ✅     | ✅        | ✅    | —                |
| Comment on a bug                 | ✅     | ✅        | ✅    | —                |
| Change bug status                | ❌     | ✅        | ✅    | —                |
| Create a project/website         | ❌     | ❌        | ✅    | —                |
| Add/remove team members          | ❌     | ❌        | ✅    | —                |
| View/delete any organization     | ❌     | ❌        | ❌    | ✅               |

## Notes on scope

Per the original product brief, this build intentionally does **not** include a real
browser-injectable SDK/widget, real payment/email/SMS integrations, or third-party issue
tracker sync — those are Phase 2+ roadmap items. Everything here runs as a single self-contained
app: one backend, one frontend, one SQLite file.

## Troubleshooting

**`pydantic-core` fails to build / asks for a Rust compiler / `link.exe not found` (Windows)**
This means pip is trying to compile a dependency from source because your Python version is
newer than the pinned package versions had pre-built wheels for. `requirements.txt` already
uses version *ranges* (not exact pins) for this reason — make sure you're installing from the
version in this zip, not an older copy. If it still happens, upgrade pip first
(`python -m pip install --upgrade pip`) and retry.

**`python3` / `source` not recognized (Windows PowerShell)**
Windows doesn't have `python3` or `source` as commands. Use `python` instead of `python3`, and
`.venv\Scripts\Activate.ps1` instead of `source .venv/bin/activate`. If PowerShell blocks the
activation script, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`.

**`cd: Cannot find path ...\BugSnap\BugSnap\backend`**
This means your terminal was already inside the `backend` folder (or inside the outer `BugSnap`
folder) when you ran `cd BugSnap/backend`. Check your current folder with `pwd` (macOS/Linux) or
`Get-Location` (PowerShell) before running `cd` commands — the zip extracts to a single
`BugSnap/` folder containing `backend/` and `frontend/` as siblings, there's no nested
`BugSnap/BugSnap/`.

**Using conda/Miniconda instead of `venv`**
That's fine — if you're already inside an active conda environment (prompt shows `(base)` or
similar), you can skip the `python -m venv .venv` / activate steps entirely and just run
`pip install -r requirements.txt` directly. Just be aware packages install into that conda
environment globally rather than an isolated one.
