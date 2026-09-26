"""Apple Music integration via AppleScript.

Frankenstein doesn't stream Apple Music's catalog directly — there's no
API that hands a Python process a raw, DRM-cleared audio stream (see the
project's own notes on this). Instead, this module remote-controls the
real Music.app via AppleScript (through macOS's `osascript` command), and
lets Frankenstein mirror + control what's playing there.

Two honest limitations, so nothing here over-promises:
  - Search only reaches your own Music.app library (playlists and tracks
    you've already added from Apple Music), not Apple's full untouched
    catalog. Music.app's own AppleScript dictionary doesn't expose
    whole-catalog search — only the in-app search field does that, and
    there's no scripting hook for it.
  - This is macOS-only (`osascript` doesn't exist elsewhere) and requires
    Music.app to actually be installed. The first time this runs, macOS
    will likely prompt for an Automation permission (System Settings →
    Privacy & Security → Automation) — until that's granted, every call
    here just returns None/False/[] rather than raising.
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


class LibraryTrack(TypedDict):
    name: str
    artist: str
    album: str


def _run_applescript(script: str) -> Optional[str]:
    """Run an AppleScript snippet via osascript. Returns stdout stripped,
    or None if osascript isn't available (non-macOS) or the script failed
    (Music.app isn't installed, isn't reachable, or Automation permission
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
    """True if osascript exists and can talk to Music.app at all."""
    return _run_applescript('tell application "Music" to name') is not None


def play() -> None:
    _run_applescript('tell application "Music" to play')


def pause() -> None:
    _run_applescript('tell application "Music" to pause')


def playpause() -> None:
    _run_applescript('tell application "Music" to playpause')


def next_track() -> None:
    _run_applescript('tell application "Music" to next track')


def previous_track() -> None:
    _run_applescript('tell application "Music" to previous track')


def set_volume(percent: int) -> None:
    """percent: 0-100, clamped."""
    percent = max(0, min(100, percent))
    _run_applescript(f'tell application "Music" to set sound volume to {percent}')


_NOW_PLAYING_SCRIPT = '''
tell application "Music"
    if player state is stopped then
        return "STOPPED||||"
    end if
    set trackName to name of current track
    set trackArtist to artist of current track
    set trackAlbum to album of current track
    set trackDuration to duration of current track
    set trackPosition to player position
    set trackState to player state as string
    return trackState & "||" & trackName & "||" & trackArtist & "||" & trackAlbum & "||" & trackDuration & "||" & trackPosition
end tell
'''


def now_playing() -> Optional[NowPlaying]:
    """Current Music.app playback state, or None if Music.app isn't
    reachable at all. If Music.app IS reachable but nothing is loaded,
    returns a NowPlaying with empty strings and state "stopped" — None
    specifically means "couldn't talk to Music.app", not "nothing is
    playing".
    """
    raw = _run_applescript(_NOW_PLAYING_SCRIPT)
    if raw is None:
        return None

    parts = raw.split("||")
    if len(parts) < 2 or parts[0] == "STOPPED":
        return NowPlaying(
            name="", artist="", album="",
            duration_seconds=0.0, position_seconds=0.0, state="stopped",
        )

    state, name, artist, album, duration, position = parts
    try:
        duration_seconds = float(duration)
    except ValueError:
        duration_seconds = 0.0
    try:
        position_seconds = float(position)
    except ValueError:
        position_seconds = 0.0

    return NowPlaying(
        name=name, artist=artist, album=album,
        duration_seconds=duration_seconds, position_seconds=position_seconds,
        state=state,
    )


_SEARCH_SCRIPT_TEMPLATE = '''
tell application "Music"
    set matches to (every track of library playlist 1 whose name contains "{query}" or artist contains "{query}")
    set output to ""
    repeat with t in matches
        set output to output & (name of t) & "::" & (artist of t) & "::" & (album of t) & "\\n"
    end repeat
    return output
end tell
'''


def search_library(query: str, limit: int = 25) -> List[LibraryTrack]:
    """Search *your own* Music.app library (not Apple's full catalog —
    see module docstring) for tracks whose name or artist contains query.
    """
    safe_query = query.replace('"', '\\"')
    raw = _run_applescript(_SEARCH_SCRIPT_TEMPLATE.format(query=safe_query))
    if not raw:
        return []

    tracks: List[LibraryTrack] = []
    for line in raw.splitlines():
        if not line.strip():
            continue
        parts = line.split("::")
        if len(parts) != 3:
            continue
        name, artist, album = parts
        tracks.append(LibraryTrack(name=name, artist=artist, album=album))
        if len(tracks) >= limit:
            break
    return tracks


def play_track(name: str, artist: str = "") -> bool:
    """Find and play a specific track in the library by name (optionally
    narrowed by artist). Returns True if a matching track was found and
    played, False otherwise.
    """
    safe_name = name.replace('"', '\\"')
    if artist:
        safe_artist = artist.replace('"', '\\"')
        condition = f'name is "{safe_name}" and artist is "{safe_artist}"'
    else:
        condition = f'name is "{safe_name}"'

    script = f'''
    tell application "Music"
        set matches to (every track of library playlist 1 whose {condition})
        if (count of matches) is 0 then
            return "NOTFOUND"
        end if
        play (item 1 of matches)
        return "OK"
    end tell
    '''
    return _run_applescript(script) == "OK"
