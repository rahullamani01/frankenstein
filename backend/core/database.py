import sqlite3
from pathlib import Path
from typing import List, Optional

DEFAULT_DB_PATH = Path.home() / ".frankenstein" / "library.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL DEFAULT 'Unknown Album',
    genre TEXT,
    year INTEGER,
    track_number INTEGER,
    duration_ms INTEGER NOT NULL DEFAULT 0,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    artwork_path TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS play_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    event TEXT NOT NULL CHECK(event IN ('played', 'completed', 'skipped')),
    occurred_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id)
);
"""


class Database:
    """Thin wrapper around SQLite. One instance lives for the whole app."""

    def __init__(self, db_path: Path = DEFAULT_DB_PATH):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA)
        self._conn.commit()
        self._migrate()

    def _migrate(self) -> None:
        """Add columns introduced after a user's db already existed.

        SCHEMA's CREATE TABLE IF NOT EXISTS only helps brand-new databases;
        anyone upgrading from Phase 3 needs artwork_path added by hand.
        """
        cols = {row["name"] for row in self._conn.execute("PRAGMA table_info(tracks)")}
        if "artwork_path" not in cols:
            self._conn.execute("ALTER TABLE tracks ADD COLUMN artwork_path TEXT")
            self._conn.commit()

    # --- Tracks ---

    def upsert_track(
        self,
        path: str,
        title: str,
        artist: str,
        album: str,
        genre: Optional[str],
        year: Optional[int],
        track_number: Optional[int],
        duration_ms: int,
    ) -> int:
        self._conn.execute(
            """
            INSERT INTO tracks (path, title, artist, album, genre, year, track_number, duration_ms)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                title=excluded.title, artist=excluded.artist, album=excluded.album,
                genre=excluded.genre, year=excluded.year, track_number=excluded.track_number,
                duration_ms=excluded.duration_ms
            """,
            (path, title, artist, album, genre, year, track_number, duration_ms),
        )
        self._conn.commit()
        row = self._conn.execute("SELECT id FROM tracks WHERE path = ?", (path,)).fetchone()
        return row["id"]

    def all_tracks(self) -> List[sqlite3.Row]:
        return self._conn.execute(
            "SELECT * FROM tracks ORDER BY artist COLLATE NOCASE, album COLLATE NOCASE, track_number"
        ).fetchall()

    def get_track(self, track_id: int) -> Optional[sqlite3.Row]:
        return self._conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()

    def is_favorite(self, track_id: int) -> bool:
        row = self._conn.execute("SELECT is_favorite FROM tracks WHERE id = ?", (track_id,)).fetchone()
        return bool(row["is_favorite"]) if row else False

    def set_favorite(self, track_id: int, is_favorite: bool) -> None:
        self._conn.execute(
            "UPDATE tracks SET is_favorite = ? WHERE id = ?", (int(is_favorite), track_id)
        )
        self._conn.commit()

    def set_artwork_path(self, track_id: int, artwork_path: Optional[str]) -> None:
        self._conn.execute(
            "UPDATE tracks SET artwork_path = ? WHERE id = ?", (artwork_path, track_id)
        )
        self._conn.commit()

    # --- Play history ---

    def log_event(self, track_id: int, event: str) -> None:
        self._conn.execute(
            "INSERT INTO play_events (track_id, event) VALUES (?, ?)", (track_id, event)
        )
        self._conn.commit()

    def play_count(self, track_id: int) -> int:
        row = self._conn.execute(
            "SELECT COUNT(*) AS n FROM play_events WHERE track_id = ? AND event = 'played'",
            (track_id,),
        ).fetchone()
        return row["n"]

    def recently_played(self, limit: int = 10) -> List[sqlite3.Row]:
        """Distinct tracks, most-recently-played first."""
        return self._conn.execute(
            """
            SELECT tracks.*, MAX(play_events.occurred_at) AS last_played
            FROM play_events
            JOIN tracks ON tracks.id = play_events.track_id
            WHERE play_events.event = 'played'
            GROUP BY tracks.id
            ORDER BY last_played DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()

    def track_engagement(self) -> List[sqlite3.Row]:
        """Per-track counts of each play_events type (played/completed/
        skipped). Raw material for core/recommendations.py's taste
        scoring — this class stays a thin DB wrapper and doesn't rank
        anything itself.
        """
        return self._conn.execute(
            """
            SELECT
                track_id,
                SUM(CASE WHEN event = 'played' THEN 1 ELSE 0 END) AS played_count,
                SUM(CASE WHEN event = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                SUM(CASE WHEN event = 'skipped' THEN 1 ELSE 0 END) AS skipped_count
            FROM play_events
            GROUP BY track_id
            """
        ).fetchall()

    # --- Search / browse ---

    def search_tracks(self, query: str) -> List[sqlite3.Row]:
        like = f"%{query}%"
        return self._conn.execute(
            """
            SELECT * FROM tracks
            WHERE title LIKE ? OR artist LIKE ? OR album LIKE ?
            ORDER BY artist COLLATE NOCASE, album COLLATE NOCASE, track_number
            """,
            (like, like, like),
        ).fetchall()

    def tracks_by_artist(self, artist: str) -> List[sqlite3.Row]:
        return self._conn.execute(
            "SELECT * FROM tracks WHERE artist = ? ORDER BY album COLLATE NOCASE, track_number",
            (artist,),
        ).fetchall()

    def tracks_by_album(self, album: str, artist: Optional[str] = None) -> List[sqlite3.Row]:
        if artist:
            return self._conn.execute(
                "SELECT * FROM tracks WHERE album = ? AND artist = ? ORDER BY track_number",
                (album, artist),
            ).fetchall()
        return self._conn.execute(
            "SELECT * FROM tracks WHERE album = ? ORDER BY track_number", (album,)
        ).fetchall()

    # --- Playlists ---

    def create_playlist(self, name: str) -> int:
        self._conn.execute("INSERT OR IGNORE INTO playlists (name) VALUES (?)", (name,))
        self._conn.commit()
        row = self._conn.execute("SELECT id FROM playlists WHERE name = ?", (name,)).fetchone()
        return row["id"]

    def all_playlists(self) -> List[sqlite3.Row]:
        return self._conn.execute("SELECT * FROM playlists ORDER BY name COLLATE NOCASE").fetchall()

    def add_track_to_playlist(self, playlist_id: int, track_id: int) -> None:
        row = self._conn.execute(
            "SELECT COALESCE(MAX(position), -1) + 1 AS next_pos FROM playlist_tracks WHERE playlist_id = ?",
            (playlist_id,),
        ).fetchone()
        self._conn.execute(
            "INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)",
            (playlist_id, track_id, row["next_pos"]),
        )
        self._conn.commit()

    def playlist_tracks(self, playlist_id: int) -> List[sqlite3.Row]:
        return self._conn.execute(
            """
            SELECT tracks.* FROM playlist_tracks
            JOIN tracks ON tracks.id = playlist_tracks.track_id
            WHERE playlist_tracks.playlist_id = ?
            ORDER BY playlist_tracks.position
            """,
            (playlist_id,),
        ).fetchall()

    def close(self) -> None:
        self._conn.close()
