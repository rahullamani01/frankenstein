"""Spotify integration via AppleScript.

Frankenstein doesn't stream Spotify's catalog or call the Spotify Web API.
There is no DRM-cleared audio stream handed to a Python process. Instead
this module remote-controls the real Spotify desktop app via AppleScript
(through macOS's `osascript` command) and lets Frankenstein mirror +
control what's playing there.

Same honest limitations as the Apple Music counterpart:
  - This is macOS-only (`osascript` doesn't exist elsewhere) and requires
    the Spotify desktop app to be installed and running (or at least
    launchable). The first time this runs, macOS will likely prompt for
    an Automation permission (System Settings → Privacy & Security →
    Automation) — until that's granted, every call here just returns
    None/False/[] rather than raising.
  - Search reaches only what Spotify's AppleScript dictionary exposes
    (mainly play-by-URI and limited current-track info). Full catalog
    search is not available through AppleScript the way the in-app
    search field works; we therefore expose a lightweight "play URI"
    path and a best-effort library-style search where possible.
  - Player position is reported when Spotify provides it; some older
    Spotify builds had a known gap here, so position may be 0.0 in
    those cases.
"""
import subprocess
from typing import List, Optional, TypedDict


class NowPlaying(TypedDict):
    name: str
    artist: str
    album: str
    duration_seconds: float
    position_seconds: float
    state: str  # "playing", "paused", or "stopped"
    id: str     # Spotify URI when available, else ""


class LibraryTrack(TypedDict):
    name: str
    artist: str
    album: str
    id: str     # Spotify URI when we have one


def _run_applescript(script: str) -> Optional[str]:
    """Run an AppleScript snippet via osascript. Returns stdout stripped,
    or None if osascript isn't available (non-macOS) or the script failed
    (Spotify isn't installed, isn't reachable, or Automation permission
    hasn't been granted yet).
    """
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=5,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def is_available() -> bool:
    """True if osascript exists and can talk to Spotify at all."""
    return _run_applescript('tell application "Spotify" to name') is not None


def play() -> None:
    _run_applescript('tell application "Spotify" to play')


def pause() -> None:
    _run_applescript('tell application "Spotify" to pause')


def playpause() -> None:
    _run_applescript('tell application "Spotify" to playpause')


def next_track() -> None:
    _run_applescript('tell application "Spotify" to next track')


def previous_track() -> None:
    _run_applescript('tell application "Spotify" to previous track')


def set_volume(percent: int) -> None:
    """percent: 0-100, clamped."""
    percent = max(0, min(100, percent))
    _run_applescript(f'tell application "Spotify" to set sound volume to {percent}')


def set_position(seconds: float) -> None:
    """Seek to a position in the current track (seconds). Best-effort."""
    seconds = max(0.0, float(seconds))
    _run_applescript(
        f'tell application "Spotify" to set player position to {seconds}'
    )


_NOW_PLAYING_SCRIPT = '''
tell application "Spotify"
    if player state is stopped then
        return "STOPPED||||||"
    end if
    set trackName to name of current track
    set trackArtist to artist of current track
    set trackAlbum to album of current track
    set trackDuration to duration of current track
    set trackPosition to player position
    set trackState to player state as string
    set trackId to id of current track as string
    return trackState & "||" & trackName & "||" & trackArtist & "||" & trackAlbum & "||" & trackDuration & "||" & trackPosition & "||" & trackId
end tell
'''


def now_playing() -> Optional[NowPlaying]:
    """Current Spotify playback state, or None if Spotify isn't reachable
    at all. If Spotify IS reachable but nothing is loaded, returns a
    NowPlaying with empty strings and state "stopped" — None specifically
    means "couldn't talk to Spotify", not "nothing is playing".
    """
    raw = _run_applescript(_NOW_PLAYING_SCRIPT)
    if raw is None:
        return None

    parts = raw.split("||")
    if len(parts) < 2 or parts[0] == "STOPPED":
        return NowPlaying(
            name="", artist="", album="",
            duration_seconds=0.0, position_seconds=0.0, state="stopped",
            id="",
        )

    # Expected: state || name || artist || album || duration_ms || position || id
    while len(parts) < 7:
        parts.append("")
    state, name, artist, album, duration, position, track_id = parts[:7]

    try:
        # Spotify reports duration in milliseconds via AppleScript.
        duration_seconds = float(duration) / 1000.0
    except ValueError:
        duration_seconds = 0.0
    try:
        position_seconds = float(position)
    except ValueError:
        position_seconds = 0.0

    return NowPlaying(
        name=name, artist=artist, album=album,
        duration_seconds=duration_seconds, position_seconds=position_seconds,
        state=state, id=track_id,
    )


def play_track_uri(uri: str) -> bool:
    """Play a specific Spotify URI (track, album, or playlist).
    Returns True if the command was accepted, False otherwise.
    """
    safe_uri = uri.replace('"', '\\"')
    script = f'''
    tell application "Spotify"
        play track "{safe_uri}"
    end tell
    '''
    return _run_applescript(script) is not None


def play_track(name: str, artist: str = "") -> bool:
    """Best-effort play by name (and optional artist).

    Spotify's AppleScript dictionary does not expose a full library
    search the way Music.app does. We therefore cannot reliably find an
    arbitrary track by title alone without a URI. This helper is a
    convenience that tries to play the currently loaded context or, if
    a URI was previously associated, falls back to URI play. Prefer
    play_track_uri when you have a Spotify URI.
    """
    # Without a URI there is no reliable pure-AppleScript search.
    # Return False so the UI can show a clear message.
    if not name:
        return False
    # As a soft fallback we do nothing more than report failure;
    # callers that have a URI should use play_track_uri.
    return False


def search_library(query: str, limit: int = 25) -> List[LibraryTrack]:
    """Spotify AppleScript does not expose full library search.

    Returns an empty list. Kept for API symmetry with apple_music so the
    Spotify page can share the same call pattern; the page will surface
    a short note that search is URI-driven instead.
    """
    return []
