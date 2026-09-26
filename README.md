# Frankenstein (hybrid)

**Exact React UI** from your design + **Python backend** that already scans files, plays local audio, and remote-controls Apple Music / Spotify via AppleScript.

Local only — runs on your Mac. No deploy.

## Layout

```
frankenstein-hybrid/
├── backend/                 # FastAPI + all real core logic
│   ├── main.py              # HTTP API (thin layer)
│   ├── requirements.txt
│   └── core/                # KEPT from the desktop app
│       ├── database.py
│       ├── apple_music.py
│       ├── spotify.py
│       ├── metadata.py
│       ├── artwork.py
│       ├── library_scanner.py
│       ├── lyrics.py
│       ├── recommendations.py
│       └── …
└── web/                     # Exact React UI (Vite + Tailwind)
    ├── src/
    │   ├── App.tsx          # wired to backend API
    │   ├── api/client.ts    # fetch helpers
    │   ├── utils/localAudio.ts  # real HTML5 playback
    │   └── components/…     # your screens unchanged
    └── package.json
```

## What stayed / what went

| Keep (real product) | Dropped |
|---|---|
| `core/database.py` | All PySide6 / Qt UI |
| `core/apple_music.py` | `dark.qss`, `ui/*.py` |
| `core/spotify.py` | Qt `PlayerEngine` UI wiring |
| `core/metadata.py`, `artwork.py`, `library_scanner.py` | |
| `core/lyrics.py`, `recommendations.py` | |
| New: thin FastAPI in `backend/main.py` | |

## Run on your Mac

### 1. Backend (terminal 1)

```bash
cd frankenstein-hybrid/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

API: http://127.0.0.1:8765  
Docs: http://127.0.0.1:8765/docs

First time: grant macOS **Automation** permission when prompted (Music.app / Spotify).

### 2. Import your music (optional)

With backend running:

```bash
curl -X POST http://127.0.0.1:8765/api/library/scan \
  -H 'Content-Type: application/json' \
  -d '{"folder":"/Users/YOU/Music"}'
```

Uses the same scanner + mutagen tags + artwork cache as before (`~/.frankenstein/`).

### 3. Frontend (terminal 2)

```bash
cd frankenstein-hybrid/web
npm install
npm run dev
```

Open http://localhost:3000 — same UI, now talking to the real backend.

## How playback works

| Source | What happens |
|---|---|
| **Local** | Browser streams the file from `/api/stream/{id}` (HTML5 audio) |
| **Spotify** | Backend AppleScripts the desktop app (`playpause`, next, URI, …) |
| **Apple Music** | Backend AppleScripts Music.app |

No Spotify/Apple Web API keys. Free accounts are fine.

## Status check

```bash
curl http://127.0.0.1:8765/api/status
# {"ok":true,"apple_music":true/false,"spotify":true/false,"tracks":N}
```
