from pathlib import Path
from typing import List

AUDIO_EXTENSIONS = {".mp3", ".wav", ".flac", ".m4a", ".ogg", ".aac"}


def scan_folder(folder: Path) -> List[Path]:
    """Recursively find every audio file under folder, sorted for stable ordering."""
    folder = Path(folder)
    return sorted(
        p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    )
