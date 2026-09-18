from pathlib import Path
from typing import Optional

from PySide6.QtGui import QAction
from PySide6.QtWidgets import (
    QFileDialog,
    QHBoxLayout,
    QMainWindow,
    QMessageBox,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from core.artwork import extract_artwork
from core.database import Database
from core.library_scanner import scan_folder
from core.metadata import read_tags
from core.player_engine import PlayerEngine
from core.queue_entry import entry_from_track
from ui.pages.album_detail import AlbumDetailPage
from ui.pages.apple_music import AppleMusicPage
from ui.pages.artist_detail import ArtistDetailPage
from ui.pages.home import HomePage
from ui.pages.library import LibraryPage
from ui.pages.lyrics import LyricsPage
from ui.pages.playlists import PlaylistsPage
from ui.pages.search import SearchPage
from ui.player_bar import PlayerBar
from ui.sidebar import Sidebar

AUDIO_FILE_FILTER = "Audio Files (*.mp3 *.wav *.flac *.m4a *.ogg *.aac)"

# Sidebar nav items map 1:1 to the first four pages in the stack. Detail
# pages (artist/album) live after those and are reached only by navigation
# calls, never by a sidebar click.
LIBRARY_PAGE_INDEX = 1


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Frankenstein")
        self.resize(1200, 800)
        self.setMinimumSize(900, 600)

        # The database and engine outlive any individual widget.
        self.database = Database()
        self.engine = PlayerEngine(database=self.database)

        central = QWidget()
        self.setCentralWidget(central)

        root_layout = QVBoxLayout(central)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)

        # --- Top section: sidebar + page stack ---
        top_section = QWidget()
        top_layout = QHBoxLayout(top_section)
        top_layout.setContentsMargins(0, 0, 0, 0)
        top_layout.setSpacing(0)

        self.sidebar = Sidebar()
        top_layout.addWidget(self.sidebar)

        self.home_page = HomePage(self.database)
        self.library_page = LibraryPage(self.database, self.engine)
        self.search_page = SearchPage(self.database, self.engine)
        self.playlists_page = PlaylistsPage(self.database, self.engine)
        self.lyrics_page = LyricsPage(self.engine)
        self.apple_music_page = AppleMusicPage()
        self.artist_detail_page = ArtistDetailPage(self.database, self.engine)
        self.album_detail_page = AlbumDetailPage(self.database, self.engine)

        self.pages = QStackedWidget()
        self.pages.addWidget(self.home_page)           # index 0
        self.pages.addWidget(self.library_page)         # index 1
        self.pages.addWidget(self.search_page)           # index 2
        self.pages.addWidget(self.playlists_page)        # index 3
        self.pages.addWidget(self.lyrics_page)            # index 4
        self.pages.addWidget(self.apple_music_page)        # index 5
        self.pages.addWidget(self.artist_detail_page)    # index 6 (off sidebar)
        self.pages.addWidget(self.album_detail_page)     # index 7 (off sidebar)
        top_layout.addWidget(self.pages, 1)

        root_layout.addWidget(top_section, 1)

        # --- Bottom section: player bar ---
        self.player_bar = PlayerBar(self.engine)
        root_layout.addWidget(self.player_bar)

        # --- Wiring: sidebar navigation ---
        self.sidebar.page_changed.connect(self._on_sidebar_navigate)

        # --- Wiring: cross-page navigation (artist/album detail) ---
        self.library_page.artist_requested.connect(self.show_artist)
        self.library_page.album_requested.connect(self.show_album)
        self.search_page.artist_requested.connect(self.show_artist)
        self.search_page.album_requested.connect(self.show_album)
        self.artist_detail_page.back_requested.connect(self._show_library)
        self.artist_detail_page.album_requested.connect(self.show_album)
        self.album_detail_page.back_requested.connect(self._show_library)
        self.album_detail_page.artist_requested.connect(self.show_artist)

        # --- Wiring: Home page card clicks ---
        self.home_page.track_activated.connect(self._on_home_track_activated)

        self._build_menu()
        self.home_page.refresh()

    def _build_menu(self) -> None:
        file_menu = self.menuBar().addMenu("&File")

        add_folder_action = QAction("Add Music Folder\u2026", self)
        add_folder_action.setShortcut("Ctrl+Shift+O")
        add_folder_action.triggered.connect(self._on_add_folder)
        file_menu.addAction(add_folder_action)

        add_files_action = QAction("Add Music Files\u2026", self)
        add_files_action.setShortcut("Ctrl+O")
        add_files_action.triggered.connect(self._on_add_files)
        file_menu.addAction(add_files_action)

    def _make_entry(self, path: Path) -> dict:
        """Read tags, extract artwork, upsert into the DB, and return a
        queue-ready entry.
        """
        tags = read_tags(path)
        track_id = self.database.upsert_track(
            path=str(path),
            title=tags["title"],
            artist=tags["artist"],
            album=tags["album"],
            genre=tags["genre"],
            year=tags["year"],
            track_number=tags["track_number"],
            duration_ms=tags["duration_ms"],
        )
        artwork_path = extract_artwork(path, track_id)
        if artwork_path:
            self.database.set_artwork_path(track_id, artwork_path)
        return entry_from_track(self.database.get_track(track_id))

    def _on_add_folder(self) -> None:
        folder = QFileDialog.getExistingDirectory(self, "Add Music Folder")
        if not folder:
            return
        paths = scan_folder(Path(folder))
        if not paths:
            QMessageBox.information(self, "No music found", "No audio files were found in that folder.")
            return
        for path in paths:
            self._make_entry(path)  # tags + artwork read and upserted; queue entry unused here
        self.library_page.refresh()
        self.home_page.refresh()
        QMessageBox.information(self, "Library updated", f"Added {len(paths)} track(s) to your library.")

    def _on_add_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(self, "Add Music Files", "", AUDIO_FILE_FILTER)
        if not files:
            return
        entries = [self._make_entry(Path(f)) for f in files]
        self.library_page.refresh()
        self.home_page.refresh()
        self.engine.add_entries(entries)

    # --- Navigation ---

    def _on_sidebar_navigate(self, index: int) -> None:
        self.pages.setCurrentIndex(index)
        if index == 0:
            self.home_page.refresh()

    def show_artist(self, artist: str) -> None:
        self.artist_detail_page.set_artist(artist)
        self.pages.setCurrentWidget(self.artist_detail_page)

    def show_album(self, album: str, artist: Optional[str] = None) -> None:
        self.album_detail_page.set_album(album, artist)
        self.pages.setCurrentWidget(self.album_detail_page)

    def _show_library(self) -> None:
        self.pages.setCurrentIndex(LIBRARY_PAGE_INDEX)
        for i, btn in enumerate(self.sidebar.buttons):
            btn.setChecked(i == LIBRARY_PAGE_INDEX)

    def _on_home_track_activated(self, track: dict) -> None:
        entry = entry_from_track(track)
        self.engine.play_queue([entry], start_index=0)
