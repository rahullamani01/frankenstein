from pathlib import Path

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

from core.database import Database
from core.library_scanner import scan_folder
from core.metadata import read_tags
from core.player_engine import PlayerEngine
from ui.pages.home import HomePage
from ui.pages.library import LibraryPage
from ui.pages.playlists import PlaylistsPage
from ui.pages.search import SearchPage
from ui.player_bar import PlayerBar
from ui.sidebar import Sidebar

AUDIO_FILE_FILTER = "Audio Files (*.mp3 *.wav *.flac *.m4a *.ogg *.aac)"


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

        self.home_page = HomePage()
        self.library_page = LibraryPage(self.database, self.engine)
        self.search_page = SearchPage()
        self.playlists_page = PlaylistsPage(self.database, self.engine)

        self.pages = QStackedWidget()
        self.pages.addWidget(self.home_page)       # index 0
        self.pages.addWidget(self.library_page)    # index 1
        self.pages.addWidget(self.search_page)     # index 2
        self.pages.addWidget(self.playlists_page)  # index 3
        top_layout.addWidget(self.pages, 1)

        root_layout.addWidget(top_section, 1)

        # --- Bottom section: player bar ---
        self.player_bar = PlayerBar(self.engine)
        root_layout.addWidget(self.player_bar)

        # --- Wiring ---
        self.sidebar.page_changed.connect(self.pages.setCurrentIndex)

        self._build_menu()

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
        """Read tags, upsert into the DB, and return a queue-ready entry."""
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
        return {"id": track_id, "path": path, "title": tags["title"], "artist": tags["artist"]}

    def _on_add_folder(self) -> None:
        folder = QFileDialog.getExistingDirectory(self, "Add Music Folder")
        if not folder:
            return
        paths = scan_folder(Path(folder))
        if not paths:
            QMessageBox.information(self, "No music found", "No audio files were found in that folder.")
            return
        for path in paths:
            self._make_entry(path)  # tags read + upserted; queue entry unused here
        self.library_page.refresh()
        QMessageBox.information(self, "Library updated", f"Added {len(paths)} track(s) to your library.")

    def _on_add_files(self) -> None:
        files, _ = QFileDialog.getOpenFileNames(self, "Add Music Files", "", AUDIO_FILE_FILTER)
        if not files:
            return
        entries = [self._make_entry(Path(f)) for f in files]
        self.library_page.refresh()
        self.engine.add_entries(entries)
