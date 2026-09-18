from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QHeaderView,
    QMenu,
    QTableWidget,
    QTableWidgetItem,
)

from core.queue_entry import entry_from_track


def format_ms(ms: int) -> str:
    seconds = max(ms or 0, 0) // 1000
    minutes, seconds = divmod(seconds, 60)
    return f"{minutes}:{seconds:02d}"


class TrackTable(QTableWidget):
    """Reusable track list: Title/Artist/Album/Duration columns, double-click
    to play, right-click for Play / Go to Artist / Go to Album / Add to
    Playlist.

    Used by Library, Search, and the Artist/Album detail pages so this
    behavior — and its quirks — lives in exactly one place instead of being
    copy-pasted four times.
    """

    play_requested = Signal(list, int)  # (entries, start_index)
    artist_requested = Signal(str)
    album_requested = Signal(str, str)  # (album, artist)

    COLUMNS = ["Title", "Artist", "Album", "Duration"]

    def __init__(self, database):
        super().__init__()
        self.database = database
        self._tracks = []

        self.setObjectName("LibraryTable")
        self.setColumnCount(len(self.COLUMNS))
        self.setHorizontalHeaderLabels(self.COLUMNS)
        self.verticalHeader().setVisible(False)
        self.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.horizontalHeader().setSectionResizeMode(2, QHeaderView.Stretch)
        self.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeToContents)
        self.doubleClicked.connect(self._on_row_double_clicked)
        self.setContextMenuPolicy(Qt.CustomContextMenu)
        self.customContextMenuRequested.connect(self._on_context_menu)

    def set_tracks(self, tracks) -> None:
        self._tracks = tracks
        self.setRowCount(len(tracks))
        for row_index, track in enumerate(tracks):
            values = [track["title"], track["artist"], track["album"], format_ms(track["duration_ms"])]
            for col_index, value in enumerate(values):
                self.setItem(row_index, col_index, QTableWidgetItem(str(value)))

    def _on_row_double_clicked(self, index) -> None:
        entries = [entry_from_track(t) for t in self._tracks]
        self.play_requested.emit(entries, index.row())

    def _on_context_menu(self, pos) -> None:
        index = self.indexAt(pos)
        if not index.isValid():
            return
        track = self._tracks[index.row()]

        menu = QMenu(self)
        play_action = menu.addAction("Play")
        artist_action = menu.addAction(f"Go to Artist: {track['artist']}")
        album_action = menu.addAction(f"Go to Album: {track['album']}")
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

        chosen = menu.exec(self.viewport().mapToGlobal(pos))
        if chosen == play_action:
            entries = [entry_from_track(t) for t in self._tracks]
            self.play_requested.emit(entries, index.row())
        elif chosen == artist_action:
            self.artist_requested.emit(track["artist"])
        elif chosen == album_action:
            self.album_requested.emit(track["album"], track["artist"])
