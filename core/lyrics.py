"""Lyrics extraction.

Reads embedded lyrics straight from a track's own tags — no external
lookup, no network call. Three tag shapes to handle:
  - ID3 (mp3): SYLT frames carry real timestamped lyrics; USLT frames
    carry plain unsynced lyrics.
  - MP4/M4A: the '\\xa9lyr' atom, plain text only.
  - FLAC/OGG (Vorbis comments): 'LYRICS' or 'UNSYNCEDLYRICS' key, plain
    text — but a lot of taggers stuff LRC-style '[mm:ss.xx]' timed lines
    into that plain-text field, so we check for that pattern too.

extract_lyrics() returns a LyricsResult: `synced` is a time-ordered list
of (ms, line) pairs when timestamps are available from any source, else
None; `plain` is the raw lyrics text when there's no synced version,
else None. Never raises — a missing or corrupt lyrics tag just means no
lyrics, not a crash.
"""
import re
from pathlib import Path
from typing import List, Optional, Tuple, TypedDict

from mutagen import File as MutagenFile

LRC_LINE = re.compile(r"\[(\d+):(\d+(?:\.\d+)?)\](.*)")


class LyricsResult(TypedDict):
    synced: Optional[List[Tuple[int, str]]]
    plain: Optional[str]


def _parse_lrc(text: str) -> Optional[List[Tuple[int, str]]]:
    """Parse '[mm:ss.xx]line' formatted text into (ms, line) pairs.

    Returns None if the text doesn't actually look like LRC — plain
    lyrics can happen to contain a stray '[' somewhere, so we only treat
    it as synced once at least two lines match the timestamp pattern.
    """
    lines = []
    for raw_line in text.splitlines():
        match = LRC_LINE.match(raw_line.strip())
        if not match:
            continue
        minutes, seconds, lyric = match.groups()
        ms = int((float(minutes) * 60 + float(seconds)) * 1000)
        lines.append((ms, lyric.strip()))
    if len(lines) < 2:
        return None
    lines.sort(key=lambda pair: pair[0])
    return lines


def _extract_id3_synced(tags) -> Optional[List[Tuple[int, str]]]:
    for key, frame in tags.items():
        if not str(key).startswith("SYLT"):
            continue
        events = getattr(frame, "text", None)  # list of (text, ms) pairs
        if events:
            return sorted((ms, text) for text, ms in events)
    return None


def _extract_id3_plain(tags) -> Optional[str]:
    for key, frame in tags.items():
        if str(key).startswith("USLT") and hasattr(frame, "text"):
            return frame.text
    return None


def extract_lyrics(path: Path) -> LyricsResult:
    try:
        audio = MutagenFile(path)
        if audio is None:
            return LyricsResult(synced=None, plain=None)

        tags = getattr(audio, "tags", None)
        raw_text: Optional[str] = None

        if tags is not None:
            synced = _extract_id3_synced(tags)
            if synced:
                return LyricsResult(synced=synced, plain=None)

            raw_text = _extract_id3_plain(tags)

            if raw_text is None and "\xa9lyr" in tags:
                values = tags["\xa9lyr"]
                raw_text = str(values[0]) if values else None

            if raw_text is None:
                for key in ("LYRICS", "UNSYNCEDLYRICS", "lyrics"):
                    if key in tags:
                        values = tags[key]
                        raw_text = str(values[0]) if values else None
                        if raw_text:
                            break

        if raw_text:
            lrc = _parse_lrc(raw_text)
            if lrc:
                return LyricsResult(synced=lrc, plain=None)
            return LyricsResult(synced=None, plain=raw_text)

        return LyricsResult(synced=None, plain=None)
    except Exception:
        return LyricsResult(synced=None, plain=None)
