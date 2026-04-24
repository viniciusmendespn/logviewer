# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Log Viewer — Banco Hyundai**: a local web tool to browse and search conversation logs from an AWS Bedrock Conversational Agent. Logs are downloaded from S3 and stored locally as `.gz` files. The app is a Python Flask server that serves a vanilla JS/HTML frontend.

## Running the app

**Windows:**
```bat
start.bat
```

**Mac/Linux:**
```bash
./start.sh
```

Both scripts create a virtualenv, install dependencies, and open `http://localhost:5000`. To run manually:

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate   Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python server.py
```

**Updating:**
```bat
update.bat   # Windows
./update.sh  # Linux/Mac
```

## Architecture

### Backend — `server.py`

Flask app with these routes:

| Route | Description |
|---|---|
| `GET /api/sessions` | Lists all sessions grouped by date, sorted newest first |
| `GET /api/session/<id>?date=YYYY-MM-DD` | Returns all messages for a session |
| `GET /api/search?q=<query>` | Full-text search across all sessions (max 60 results) |
| `POST /api/sync` | Runs `aws s3 sync` to download logs for a given date/profile |
| `GET /api/version` | Returns version from `VERSION` file + current git commit |

Logs are stored at `logs/` with the following Hive-style directory structure:

```
logs/
  date=YYYY-MM-DD/
    sessionId=<uuid>/
      *.gz                    ← old structure (flat)
      messageId=<uuid>/
        *.gz                  ← new structure (nested)
```

Each `.gz` file is a gzip-compressed JSON with fields: `session`, `agent`, `timestamps`, `request`, `response`, `usage`, `flags`, `trace`.

### Frontend — `viewer/`

Pure vanilla JS — no build step, no bundler.

- **`js/api.js`** — thin wrapper over `fetch()` for all API calls
- **`js/app.js`** — global `App` state object, detail panel, sync modal, keyboard shortcuts, init
- **`js/sidebar.js`** — renders the session list grouped by date; calls `App.loadSession()` on click
- **`js/conversation.js`** — renders message cards (user + assistant bubbles, meta pills, trace toggle)
- **`js/search.js`** — global search bar logic, result panel, scroll-to-message
- **`js/stats.js`** — computes and renders the stats bar at the top of a conversation
- **`js/trace.js`** — renders the execution trace timeline inside each message card
- **`css/`** — split into `variables.css`, `layout.css`, `components.css`, `conversation.css`, `modal.css`

The frontend uses `marked.js` (from CDN) to render assistant responses as Markdown.

### Version

The version string lives in the `VERSION` file. The `/api/version` endpoint combines it with `git rev-parse --short HEAD`.
