# Frankenstein

A personal desktop music player. Real library, real tags and artwork,
listening history, taste-based recommendations, and lyrics — all read
straight from your files, no external services.

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
- **Album artwork** (`core/artwork.py`): embedded cover art is extracted via
  `mutagen` on import and cached to `~/.frankenstein/artwork/<id>.jpg`, so
  widgets load a plain `QPixmap` file instead of re-parsing tags on every
  paint. Shown in the player bar, Library-derived pages, and Home.
- **Home page** (`ui/pages/home.py`): Recently Played, taste-based
  recommendations ("Made For You"), and a dynamic "Because you listen to
  <artist>" row — all as horizontally-scrolling `TrackCard` tiles.
- **Recommendations** (`core/recommendations.py`): weighs `completed` /
  `played` / `skipped` events and favorites into per-artist and per-genre
  taste scores, then ranks the library against them. Falls back to a
  shuffled sample when there's no listening history yet (cold start).
- **Artist/Album detail pages**: reached via right-click → "Go to Artist" /
  "Go to Album" from any track table (Library, Search, or another detail
  page). Back button returns to Library.
- **Library, Search, and detail pages** all share one `TrackTable` widget
  (`ui/widgets/track_table.py`) for the Title/Artist/Album/Duration list,
  double-click-to-play, and the right-click menu.
- **Playlists page**: create playlists, browse them, double-click a track to
  play that playlist from there.
- **Favorites**: the heart button in the player bar favorites/unfavorites
  whatever's currently playing (backed by the database).
- **Listening history**: every `played`, `skipped`, and `completed` event is
  logged with a timestamp — the raw material the recommendation engine uses.
- **Lyrics page** (`core/lyrics.py`, `ui/pages/lyrics.py`): reads embedded
  lyrics tags (ID3 `SYLT`/`USLT`, MP4 `\xa9lyr`, Vorbis `LYRICS`) — no
  network lookup. Timestamped lyrics (real `SYLT` frames, or plain text
  that turns out to be LRC-formatted) highlight the current line as the
  track plays; anything else shows as scrollable plain text; no lyrics
  tag at all shows a plain "not found" message instead of an empty page.

## Project structure

```
frankenstein/
├── main.py                       # entry point
├── requirements.txt
├── styles/
│   └── dark.qss                  # "Frankenstein Dark" theme
├── core/
│   ├── database.py               # SQLite: tracks, play_events, playlists
│   ├── library_scanner.py        # recursive folder -> audio file paths
│   ├── metadata.py               # real tag reading via mutagen
│   ├── artwork.py                # embedded cover art extraction + caching
│   ├── queue_entry.py            # tracks-table row -> PlayerEngine QueueEntry
│   ├── recommendations.py        # taste scoring for Home's recommendations
│   ├── lyrics.py                 # embedded lyrics extraction (synced + plain)
│   └── player_engine.py          # QMediaPlayer wrapper + queue + history logging
└── ui/
    ├── main_window.py            # owns Database + PlayerEngine, File menu, navigation
    ├── sidebar.py
    ├── player_bar.py             # transport + favorite toggle + art
    ├── widgets/
    │   ├── track_table.py        # shared Library/Search/detail track list
    │   └── track_card.py         # shared Home page art tile
    └── pages/
        ├── home.py                # Recently Played / Made For You / discovery
        ├── library.py
        ├── search.py
        ├── playlists.py
        ├── lyrics.py              # current-track lyrics, synced highlighting
        ├── artist_detail.py
        └── album_detail.py
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
directory. Frankenstein scans it recursively, reads real tags and cover art
from each file, and populates the Library page. From there:

- Double-click any row in Library, Search, or an Artist/Album page to start
  playing from that track.
- Right-click a row → "Go to Artist", "Go to Album", or "Add to Playlist".
- Click the heart in the player bar to favorite whatever's currently playing.
- Home updates as you listen — the more you play and favorite, the more
  "Made For You" and the "Because you listen to…" row reflect your taste.

**File → Add Music Files…** (Ctrl+O) still works for adding a few
one-off tracks without a full folder scan — they get added to both the
library and the current queue immediately.

## How the pieces fit together

- `core/database.py` is the single source of truth for everything
  persistent: tracks, play history, favorites, playlists, artwork paths.
  Nothing else touches SQLite directly. It stays a thin wrapper — no
  ranking or scoring logic lives here.
- `core/player_engine.py` works with `QueueEntry` dicts
  (`{id, path, title, artist, artwork_path}`, built via
  `core/queue_entry.py`'s `entry_from_track`) instead of raw paths, and
  logs to the database on every play, skip, and natural completion — the
  `_advance(direction, reason)` / `_log_event` pattern.
- A subtlety worth knowing: `next_track()`/`previous_track()` log a
  `"skipped"` event for whatever was playing *before* switching, while
  reaching the natural end of a track logs `"completed"` instead. Both
  paths route through `_advance()` with a different `reason` string.
  Because every track that starts also logs `"played"`, a skip's *net*
  signal to `core/recommendations.py` is `played(+1) + skipped(-2) = -1` —
  actively skipping a track ranks it below one you've never touched at all
  (net 0), not just neutral.
- `core/recommendations.py` is intentionally simple (weighted counting,
  no ML) but isolated in its own module so a future audio-similarity pass
  can plug in alongside it without touching `database.py` or the UI.
- `ui/widgets/track_table.py` and `ui/widgets/track_card.py` are the two
  shared building blocks: every page that lists tracks (Library, Search,
  Artist detail, Album detail) uses `TrackTable`; every page that shows art
  tiles (Home) uses `TrackCard`. Behavior lives in exactly one place
  instead of being copy-pasted per page.
- `ui/main_window.py` owns cross-page navigation (`show_artist`,
  `show_album`) and is the only place that constructs a `QueueEntry` from a
  freshly-scanned file (`_make_entry`: read tags → extract artwork →
  upsert → return entry).

## What's next

- Polish pass: page transitions, a proper loading/empty state pass across
  every page.
- Audio-similarity-based recommendations to sit alongside
  `core/recommendations.py`'s taste scoring.
