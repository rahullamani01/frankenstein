"""
Frankenstein local backend (FastAPI).

Runs on your Mac only. Serves:
  - Local library from ~/.frankenstein/library.db
  - Audio file streaming for local tracks
  - Apple Music + Spotify control via AppleScript
  - CORS open for the Vite dev server (localhost:3000)

Start:
  cd backend
  pip install -r requirements.txt
  python main.py
"""
from __future__ import annotations

import sys
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Make `core` importable when running from backend/
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from core import apple_music, spotify  # noqa: E402
from core.database import Database  # noqa: E402
from core.library_scanner import scan_folder  # noqa: E402
from core.metadata import read_tags  # noqa: E402
from core.artwork import extract_artwork  # noqa: E402
from core.lyrics import extract_lyrics  # noqa: E402
from core.catalog_lyrics import lookup_lyrics, LyricsUnavailable  # noqa: E402

app = FastAPI(title="Frankenstein Local API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# One DB instance; sqlite with check_same_thread=False for FastAPI workers
db = Database()
# reopen with thread-safe flag
db._conn.close()
import sqlite3

db._conn = sqlite3.connect(
    str(Path.home() / ".frankenstein" / "library.db"),
    check_same_thread=False,
)
db._conn.row_factory = sqlite3.Row
db._conn.execute("PRAGMA foreign_keys = ON")


def _fmt_duration(ms: int) -> str:
    sec = max(0, int((ms or 0) / 1000))
    return f"{sec // 60}:{sec % 60:02d}"


def _album_id(album, artist):
    key = f"{album}|{artist}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()[:20]


def _row_to_track(row: sqlite3.Row) -> Dict[str, Any]:
    """Map SQLite track row → React Track shape."""
    d = dict(row)
    track_id = str(d["id"])
    artwork = d.get("artwork_path") or ""
    cover_url = f"/api/artwork/{track_id}" if artwork else ""
    duration_ms = int(d.get("duration_ms") or 0)
    return {
        "id": track_id,
        "title": d.get("title") or "Unknown",
        "artist": d.get("artist") or "Unknown Artist",
        "album": d.get("album") or "Unknown Album",
        "albumId": _album_id(d.get("album"), d.get("artist")),
        "year": d.get("year") or 0,
        "duration": _fmt_duration(duration_ms),
        "durationSec": int(duration_ms / 1000),
        "source": "Local",
        "coverUrl": cover_url,
        "trackNumber": d.get("track_number") or 0,
        "isFavorite": bool(d.get("is_favorite")),
        "path": d.get("path"),
        "streamUrl": f"/api/stream/{track_id}",
    }


# ---------------------------------------------------------------------------
# Health / status
# ---------------------------------------------------------------------------


@app.get("/api/status")
def status():
    return {
        "ok": True,
        "apple_music": apple_music.is_available(),
        "spotify": spotify.is_available(),
        "tracks": len(db.all_tracks()),
    }


# ---------------------------------------------------------------------------
# Library
# ---------------------------------------------------------------------------


@app.get("/api/lyrics")
def catalog_lyrics(
    title: str = Query(..., min_length=1, max_length=300),
    artist: str = Query(..., min_length=1, max_length=300),
    album: str = Query("", max_length=300),
    duration: float = Query(0, ge=0, le=86400, allow_inf_nan=False),
):
    try:
        return lookup_lyrics(title, artist, album, duration)
    except LyricsUnavailable as error:
        raise HTTPException(503, str(error), headers={"Retry-After": str(error.retry_after)}) from error


@app.get("/api/tracks")
def list_tracks(q: Optional[str] = None, source: Optional[str] = None):
    if q:
        rows = db.search_tracks(q)
    else:
        rows = db.all_tracks()
    tracks = [_row_to_track(r) for r in rows]
    if source and source != "Local":
        # Local DB only holds Local files for now
        tracks = [t for t in tracks if t["source"] == source]
    return tracks


@app.get("/api/tracks/{track_id}")
def get_track(track_id: int):
    row = db.get_track(track_id)
    if not row:
        raise HTTPException(404, "Track not found")
    return _row_to_track(row)


@app.post("/api/tracks/{track_id}/favorite")
def toggle_favorite(track_id: int):
    row = db.get_track(track_id)
    if not row:
        raise HTTPException(404, "Track not found")
    new_val = not bool(row["is_favorite"])
    db.set_favorite(track_id, new_val)
    return {"id": track_id, "isFavorite": new_val}


@app.get("/api/tracks/{track_id}/lyrics")
def track_lyrics(track_id: int):
    row = db.get_track(track_id)
    if not row:
        raise HTTPException(404, "Track not found")
    return extract_lyrics(Path(row["path"]))


@app.get("/api/albums")
def list_albums():
    rows = db.all_tracks()
    albums: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        key = f"{r['album']}|{r['artist']}"
        if key not in albums:
            tid = str(r["id"])
            albums[key] = {
                "id": _album_id(r["album"], r["artist"]),
                "title": r["album"] or "Unknown Album",
                "artist": r["artist"] or "Unknown Artist",
                "year": r["year"] or 0,
                "coverUrl": f"/api/artwork/{tid}" if r["artwork_path"] else "",
                "trackCount": 0,
                "source": "Local",
            }
        albums[key]["trackCount"] += 1
    return list(albums.values())


@app.get("/api/artists")
def list_artists():
    rows = db.all_tracks()
    artists: Dict[str, Dict[str, Any]] = {}
    for r in rows:
        name = r["artist"] or "Unknown Artist"
        if name not in artists:
            artists[name] = {
                "id": name.lower().replace(" ", "-"),
                "name": name,
                "albumCount": 0,
                "trackCount": 0,
                "_albums": set(),
            }
        artists[name]["trackCount"] += 1
        artists[name]["_albums"].add(r["album"] or "")
    out = []
    for a in artists.values():
        a["albumCount"] = len(a.pop("_albums"))
        out.append(a)
    return out


class ScanBody(BaseModel):
    folder: str


@app.post("/api/library/scan")
def scan_library(body: ScanBody):
    folder = Path(body.folder).expanduser()
    if not folder.is_dir():
        raise HTTPException(400, f"Not a directory: {folder}")
    paths = scan_folder(folder)
    added = 0
    for path in paths:
        tags = read_tags(path)
        track_id = db.upsert_track(
            path=str(path),
            title=tags["title"],
            artist=tags["artist"],
            album=tags["album"],
            genre=tags.get("genre"),
            year=tags.get("year"),
            track_number=tags.get("track_number"),
            duration_ms=tags.get("duration_ms") or 0,
        )
        art = extract_artwork(path, track_id)
        if art:
            db.set_artwork_path(track_id, art)
        added += 1
    return {"scanned": len(paths), "added_or_updated": added}


# ---------------------------------------------------------------------------
# Stream + artwork (local files)
# ---------------------------------------------------------------------------


@app.get("/api/stream/{track_id}")
def stream_track(track_id: int):
    row = db.get_track(track_id)
    if not row:
        raise HTTPException(404, "Track not found")
    path = Path(row["path"])
    if not path.is_file():
        raise HTTPException(404, "Audio file missing on disk")
    return FileResponse(path, filename=path.name, media_type="audio/mpeg")


@app.get("/api/artwork/{track_id}")
def artwork(track_id: int):
    row = db.get_track(track_id)
    if not row or not row["artwork_path"]:
        raise HTTPException(404, "No artwork")
    path = Path(row["artwork_path"])
    if not path.is_file():
        raise HTTPException(404, "Artwork file missing")
    return FileResponse(path)


# ---------------------------------------------------------------------------
# Spotify (AppleScript)
# ---------------------------------------------------------------------------


@app.get("/api/spotify/status")
def spotify_status():
    np = spotify.now_playing()
    return {
        "available": spotify.is_available(),
        "nowPlaying": np,
    }


@app.post("/api/spotify/playpause")
def spotify_playpause():
    spotify.playpause()
    return {"ok": True}


@app.post("/api/spotify/next")
def spotify_next():
    spotify.next_track()
    return {"ok": True}


@app.post("/api/spotify/previous")
def spotify_previous():
    spotify.previous_track()
    return {"ok": True}


class VolumeBody(BaseModel):
    percent: int


@app.post("/api/spotify/volume")
def spotify_volume(body: VolumeBody):
    spotify.set_volume(body.percent)
    return {"ok": True}


class PositionBody(BaseModel):
    seconds: float


@app.post("/api/spotify/position")
def spotify_position(body: PositionBody):
    spotify.set_position(body.seconds)
    return {"ok": True}


class UriBody(BaseModel):
    uri: str


@app.post("/api/spotify/play-uri")
def spotify_play_uri(body: UriBody):
    ok = spotify.play_track_uri(body.uri)
    if not ok:
        raise HTTPException(400, "Could not play URI — is Spotify running?")
    return {"ok": True}


@app.post("/api/spotify/launch")
def spotify_launch():
    import subprocess

    try:
        subprocess.Popen(["open", "-a", "Spotify"])
        return {"ok": True}
    except Exception as e:
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Apple Music (AppleScript)
# ---------------------------------------------------------------------------


@app.get("/api/apple/status")
def apple_status():
    np = apple_music.now_playing()
    return {
        "available": apple_music.is_available(),
        "nowPlaying": np,
    }


@app.post("/api/apple/playpause")
def apple_playpause():
    apple_music.playpause()
    return {"ok": True}


@app.post("/api/apple/next")
def apple_next():
    apple_music.next_track()
    return {"ok": True}


@app.post("/api/apple/previous")
def apple_previous():
    apple_music.previous_track()
    return {"ok": True}


@app.post("/api/apple/volume")
def apple_volume(body: VolumeBody):
    apple_music.set_volume(body.percent)
    return {"ok": True}


@app.get("/api/apple/search")
def apple_search(q: str = Query(..., min_length=1)):
    results = apple_music.search_library(q)
    return results


class ApplePlayBody(BaseModel):
    name: str
    artist: str = ""


@app.post("/api/apple/play-track")
def apple_play_track(body: ApplePlayBody):
    ok = apple_music.play_track(body.name, body.artist)
    if not ok:
        raise HTTPException(400, "Track not found in Music.app library")
    return {"ok": True}


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8765, reload=True)
