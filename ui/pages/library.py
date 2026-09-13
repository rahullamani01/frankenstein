from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QAbstractItemView,
    QHeaderView,
    QLabel,
    QMenu,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)


def format_ms(ms: int) -> str:
    seconds = max(ms or 0, 0) // 1000
    minutes, seconds = divmod(seconds, 60)
    return f"{minutes}:{seconds:02d}"


class LibraryPage(QWidget):
    """Shows every track the database knows about. Populated by scanning a
    folder (File -> Add Music Folder…) or by adding individual files.
    """

    COLUMNS = ["Title", "Artist", "Album", "Duration"]

    def __init__(self, database, engine):
        super().__init__()
        self.database = database
        self.engine = engine

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(12)

        title = QLabel("Library")
        title.setObjectName("PageTitle")
        layout.addWidget(title)

        self.empty_label = QLabel(
            "No music yet. Use File \u2192 Add Music Folder\u2026 to scan a folder,\n"
            "or File \u2192 Add Music Files\u2026 to add a few songs."
        )
        self.empty_label.setObjectName("PageSubtitle")
        layout.addWidget(self.empty_label)

        self.table = QTableWidget()
        self.table.setObjectName("LibraryTable")
        self.table.setColumnCount(len(self.COLUMNS))
        self.table.setHorizontalHeaderLabels(self.COLUMNS)
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self.table.doubleClicked.connect(self._on_row_double_clicked)
        self.table.setContextMenuPolicy(Qt.CustomContextMenu)
        self.table.customContextMenuRequested.connect(self._on_context_menu)
        layout.addWidget(self.table, 1)

        self.refresh()

    def refresh(self) -> None:
        """Reload the table from the database. Call after scans/imports."""
        tracks = self.database.all_tracks()
        self._tracks = tracks  # keep the sqlite3.Row list for row -> track lookup

        self.table.setRowCount(len(tracks))
        for row_index, track in enumerate(tracks):
            values = [track["title"], track["artist"], track["album"], format_ms(track["duration_ms"])]
            for col_index, value in enumerate(values):
                item = QTableWidgetItem(str(value))
                self.table.setItem(row_index, col_index, item)

        self.empty_label.setVisible(len(tracks) == 0)
        self.table.setVisible(len(tracks) > 0)

    def _entry_for_track(self, track) -> dict:
        return {
            "id": track["id"],
            "path": Path(track["path"]),
            "title": track["title"],
            "artist": track["artist"],
        }

    def _on_row_double_clicked(self, index) -> None:
        row = index.row()
        entries = [self._entry_for_track(t) for t in self._tracks]
        self.engine.play_queue(entries, start_index=row)

    def _on_context_menu(self, pos) -> None:
        index = self.table.indexAt(pos)
        if not index.isValid():
            return
        track = self._tracks[index.row()]

        menu = QMenu(self)
        play_action = menu.addAction("Play")
        playlists_menu = menu.addMenu("Add to Playlist")
        playlists = self.database.all_playlists()
        if not playlists:
            no_playlists_action = playlists_menu.addAction("No playlists yet")
            no_playlists_action.setEnabled(False)
        for playlist in playlists:
            action = playlists_menu.addAction(playlist["name"])
            action.triggered.connect(
                lambda _checked, pid=playlist["id"], tid=track["id"]: self.database.add_track_to_playlist(
                    pid, tid
                )
            )

        chosen = menu.exec(self.table.viewport().mapToGlobal(pos))
        if chosen == play_action:
            entries = [self._entry_for_track(t) for t in self._tracks]
            self.engine.play_queue(entries, start_index=index.row())
