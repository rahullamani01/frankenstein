# Frankenstein — Phase 3: Memory

A personal desktop music player. It now has a real library, remembers what
you play, and supports favorites and playlists.

## What's here

- **Phases 1 & 2**: sidebar navigation, dark theme, and full audio playback
  (play/pause/next/previous/seek/volume) via `PlayerEngine`.
- **Real library** (`core/database.py`, SQLite, stored at
  `~/.frankenstein/library.db`): every track you add is stored with its
  real tags, not guessed from the filename.
- **Folder scanning** (`core/library_scanner.py`): File → Add Music Folder…
  (Ctrl+Shift+O) recursively finds every audio file under a folder and
  imports it.
- **Real tag reading** (`core/metadata.py`, via `mutagen`): title, artist,
  album, genre, year, track number, and duration are read from the file
  itself. Falls back to guessing from the filename only if tags are missing.
- **Library page**: a real table of every track in your database. Double-click
  a row to play the whole library starting there; right-click for "Play" or
  "Add to Playlist".
- **Playlists page**: create playlists, browse them, double-click a track to
  play that playlist from there.
- **Favorites**: the heart button in the player bar favorites/unfavorites
  whatever's currently playing (backed by the database).
- **Listening history**: every `played`, `skipped`, and `completed` event is
  logged with a timestamp — the raw material Phase 5's recommendation engine
  will use.

## Project structure

```
frankenstein/
├── main.py                    # entry point
├── requirements.txt
├── styles/
│   └── dark.qss               # "Frankenstein Dark" theme
├── core/
│   ├── database.py            # SQLite: tracks, play_events, playlists
│   ├── library_scanner.py     # recursive folder -> audio file paths
│   ├── metadata.py            # real tag reading via mutagen
│   └── player_engine.py       # QMediaPlayer wrapper + queue + history logging
└── ui/
    ├── main_window.py         # owns Database + PlayerEngine, File menu
    ├── sidebar.py
    ├── player_bar.py          # transport + favorite toggle
    └── pages/
        ├── home.py
        ├── library.py         # real track table
        ├── search.py
        └── playlists.py       # create/browse playlists
```

## Running it

```bash
cd frankenstein
python3 -m venv venv
source venv/bin/activate      # macOS/Linux
pip install -r requirements.txt
python3 main.py
```

First run: **File → Add Music Folder…** and point it at your music
directory. Frankenstein scans it recursively, reads real tags from each
file, and populates the Library page. From there:

- Double-click any row in Library to start playing the whole library from
  that track.
- Right-click a row → "Add to Playlist" (create playlists first via the
  **+ New Playlist** button on the Playlists page).
- Click the heart in the player bar to favorite whatever's currently playing.

**File → Add Music Files…** (Ctrl+O) still works for adding a few
one-off tracks without a full folder scan — they get added to both the
library and the current queue immediately.

## How the pieces fit together

- `core/database.py` is the single source of truth for everything
  persistent: tracks, play history, favorites, playlists. Nothing else
  touches SQLite directly.
- `core/player_engine.py` now works with `QueueEntry` dicts
  (`{id, path, title, artist}`) instead of raw paths, and logs to the
  database on every play, skip, and natural completion — that's the
  `_advance(direction, reason)` / `_log_event` pattern in that file.
- `ui/pages/library.py` and `ui/pages/playlists.py` both build their own
  `QueueEntry` lists from database rows and call `engine.play_queue(...)` —
  they never touch `QMediaPlayer`.
- A subtlety worth knowing: `next_track()`/`previous_track()` log a
  `"skipped"` event for whatever was playing *before* switching, while
  reaching the natural end of a track logs `"completed"` instead. Both
  paths route through the same `_advance()` method with a different
  `reason` string — useful to know before you extend it in Phase 5.

## What's next — Phase 4: Eyes

Frankenstein starts *looking* like a real app:
- Real album artwork (extracted from tags via mutagen, or a placeholder if
  none exists) shown in the player bar, Library, and a proper Home page
- A real Home page: Recently Played and Made For You sections pulled from
  play history
- Artist/album detail pages
- A working Search page across the library

Say the word and I'll build Phase 4 the same way — or bring me anything
that's unclear about Phase 3 first.
