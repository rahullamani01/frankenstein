"""Album artwork extraction.

Pulls embedded cover art out of an audio file's tags and caches it on disk
as a JPEG under ~/.frankenstein/artwork/<track_id>.jpg, so widgets can load
a QPixmap from a plain file path instead of touching mutagen on every paint.
"""
from pathlib import Path
from typing import Optional

from mutagen import File as MutagenFile

ARTWORK_DIR = Path.home() / ".frankenstein" / "artwork"


def _extract_bytes(audio) -> Optional[bytes]:
    """Pull raw picture bytes out of whatever tag format mutagen handed back.

    Three shapes to cover:
      - MP4/M4A: tags['covr'] is a list of MP4Cover (bytes-like) objects.
      - FLAC/OGG: audio.pictures is a list of Picture objects with .data.
      - ID3 (mp3): tags are keyed like 'APIC:' / 'APIC:Cover' and the frame
        itself has a .data attribute — duck-type instead of importing every
        possible APIC subclass.
    """
    tags = getattr(audio, "tags", None)

    if tags is not None and "covr" in tags:
        covers = tags["covr"]
        if covers:
            return bytes(covers[0])

    pictures = getattr(audio, "pictures", None)
    if pictures:
        return pictures[0].data

    if tags is not None:
        for key, frame in tags.items():
            if str(key).startswith("APIC") and hasattr(frame, "data"):
                return frame.data

    return None


def extract_artwork(path: Path, track_id: int) -> Optional[str]:
    """Extract embedded cover art for one file and cache it to disk.

    Returns the cache path as a string, or None if the file has no
    embedded art. Never raises — a missing or corrupt picture just means
    no artwork, not a crashed library scan.
    """
    try:
        audio = MutagenFile(path)
        if audio is None:
            return None

        data = _extract_bytes(audio)
        if not data:
            return None

        ARTWORK_DIR.mkdir(parents=True, exist_ok=True)
        out_path = ARTWORK_DIR / f"{track_id}.jpg"
        out_path.write_bytes(data)
        return str(out_path)
    except Exception:
        return None
