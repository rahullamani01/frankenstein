from pathlib import Path
from typing import Optional, TypedDict

from mutagen import File as MutagenFile


class TrackTags(TypedDict):
    title: str
    artist: str
    album: str
    genre: Optional[str]
    year: Optional[int]
    track_number: Optional[int]
    duration_ms: int


def _guess_title_artist(path: Path):
    """Fallback for files with no usable tags: 'Artist - Title.mp3' pattern."""
    stem = path.stem
    if " - " in stem:
        artist, title = stem.split(" - ", 1)
        return title.strip(), artist.strip()
    return stem, "Unknown Artist"


def _first(value):
    """EasyID3-style tags return lists (e.g. ['Frank Ocean']); grab the first item."""
    if isinstance(value, list) and value:
        return value[0]
    return value


def read_tags(path: Path) -> TrackTags:
    """Read real metadata from the audio file itself, falling back to the
    filename when a tag is missing or unreadable. Corrupt/unsupported tags
    never crash a library scan — they just fall back silently.
    """
    guessed_title, guessed_artist = _guess_title_artist(path)

    title, artist, album = guessed_title, guessed_artist, "Unknown Album"
    genre: Optional[str] = None
    year: Optional[int] = None
    track_number: Optional[int] = None
    duration_ms = 0

    try:
        audio = MutagenFile(path, easy=True)
        if audio is not None:
            if audio.info is not None and getattr(audio.info, "length", None):
                duration_ms = int(audio.info.length * 1000)

            tags = audio.tags or {}
            title = _first(tags.get("title")) or guessed_title
            artist = _first(tags.get("artist")) or guessed_artist
            album = _first(tags.get("album")) or album
            genre = _first(tags.get("genre"))

            raw_year = _first(tags.get("date"))
            if raw_year:
                try:
                    year = int(str(raw_year)[:4])
                except ValueError:
                    year = None

            raw_track = _first(tags.get("tracknumber"))
            if raw_track:
                try:
                    track_number = int(str(raw_track).split("/")[0])
                except ValueError:
                    track_number = None
    except Exception:
        pass  # keep the filename-based fallback values

    return TrackTags(
        title=title,
        artist=artist,
        album=album,
        genre=genre,
        year=year,
        track_number=track_number,
        duration_ms=duration_ms,
    )
