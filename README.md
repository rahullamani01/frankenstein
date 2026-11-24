# Frankenstein (hybrid)

**A pixel listening gallery** on top of a Python backend that scans your
library, plays local audio, and conducts Apple Music and Spotify.

Local only — runs on your Mac. No deploy.

## Layout

```
frankenstein/
├── backend/                 # FastAPI + all real core logic
│   ├── main.py              # HTTP API (thin layer)
│   ├── requirements.txt
│   ├── tests/               # lyrics provider tests
│   └── core/                # KEPT from the desktop app
│       ├── database.py
│       ├── apple_music.py
│       ├── spotify.py
│       ├── metadata.py
│       ├── artwork.py
│       ├── library_scanner.py
│       ├── lyrics.py
│       ├── catalog_lyrics.py
│       ├── recommendations.py
│       └── …
└── web/                     # React gallery (Vite + Tailwind)
    ├── src/
    │   ├── App.tsx          # wired to backend API
    │   ├── api/client.ts    # fetch helpers
    │   ├── services/spotify.ts   # OAuth, catalogue, playback
    │   ├── theme/           # palette and day/night atmosphere
    │   ├── components/pixel/     # artwork, frames, living scene
    │   ├── utils/localAudio.ts   # real HTML5 playback
    │   └── components/screens/   # gallery rooms
    ├── tests/
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
cd backend
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
cd web
npm install
npm run dev
```

Open http://127.0.0.1:3001 — the pixel gallery, now talking to the real backend.

## Tests

```bash
cd backend && ./venv/bin/python -m unittest discover -s tests -v
cd web && npm test && npm run lint && npm run build
```

## Spotify catalogue search and Premium playback

1. In your Spotify Developer app, enable **Web API** and **Web Playback SDK**.
2. Add the exact redirect URI **`http://127.0.0.1:3001/callback`**.
3. Open the gallery at **http://127.0.0.1:3001**, choose **Spotify** in the sidebar, and click **Connect Spotify**.
4. Sign in with your Premium account and approve the requested permissions.
5. Search a song or artist and click a result. **This browser** streams full tracks through Spotify's SDK.
6. If your browser does not support protected audio, choose **Spotify app** instead. Open Spotify and play a song there once to make a device available.

The configured Client ID is public; no client secret or Soloist API key is needed.
For a different developer app, set `VITE_SPOTIFY_CLIENT_ID` and optionally
`VITE_SPOTIFY_REDIRECT_URI` in `web/.env.local`, then restart Vite.
The dev server uses a fixed port so OAuth callbacks stay valid.

Tokens and PKCE state stay in the browser's **session storage**, never in source
files or the Python backend. Disconnect clears the local session and browser player;
remove the app in your Spotify account settings if you also want to revoke its authorization.
Search uses ten-result pages to support Spotify's 2026 Development Mode limits.
If Spotify returns 403, check Premium and your app's User Management allowlist.
Spotify songs you play are kept as gallery metadata in local storage; hearts are
gallery bookmarks, not changes to your Spotify library.

**Apple Music:** the existing integration searches tracks already added to
Music.app only. It does not search or stream the Apple Music catalogue;
that requires a separate MusicKit developer-token and user-authorization setup.

## Lyrics

Open **Now Playing → Lyrics** to fetch lyrics on demand. Local embedded lyrics
are used first; other songs (including Spotify) use **LRCLIB**, an independent
provider, not Spotify's own lyrics. Only song title, primary artist, album and
duration are sent to LRCLIB — never your Spotify tokens or audio.
Results and missing matches are cached in backend memory; no API key is required.
Time-synced lyrics highlight and auto-scroll with real playback. Click a line to
seek, or switch auto-follow off to read at your own pace. Plain lyrics,
instrumental tracks, missing matches and temporary provider errors have separate
states. Availability and timing vary by recording.

## Living day/night scenery

The scenery uses a high-DPI canvas (up to 3840 × 2160), with clean typography
kept outside the home scene. Daylight changes with the local time of day;
night brings drifting stars, a soft galaxy, moonlight and occasional meteors.
The theme switch blends over 1.6 seconds without resetting the scene.
Motion pauses offscreen or in background tabs, and respects the system's
Reduce Motion setting. The app does not require a rendered video or image assets.

## How playback works

| Source | What happens |
|---|---|
| **Local** | Browser streams the file from `/api/stream/{id}` (HTML5 audio) |
| **Spotify** | OAuth + Web API catalogue search; full Premium playback through the Web Playback SDK or a Spotify Connect device |
| **Apple Music** | Backend AppleScripts Music.app |

Spotify catalogue playback requires Premium and authorization for the developer app.
Local audio needs no account. Apple Music playback depends on the desktop app and
the availability of the track in your Music.app library.

## Status check

```bash
curl http://127.0.0.1:8765/api/status
# {"ok":true,"apple_music":true/false,"spotify":true/false,"tracks":N}
```
