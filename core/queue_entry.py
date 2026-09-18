from pathlib import Path


def entry_from_track(track) -> dict:
    """Build a PlayerEngine QueueEntry dict from a tracks-table row.

    Works with both sqlite3.Row (from Database queries) and plain dicts
    (e.g. after a signal round-trip converts a Row to a dict) — both
    support .keys() and string indexing.
    """
    return {
        "id": track["id"],
        "path": Path(track["path"]),
        "title": track["title"],
        "artist": track["artist"],
        "artwork_path": track["artwork_path"] if "artwork_path" in track.keys() else None,
    }
