from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QListWidget,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from core.queue_entry import entry_from_track


class PlaylistsPage(QWidget):
    """Create playlists and browse/play the tracks inside them.

    Adding tracks to a playlist happens from the Library page's right-click
    menu — this page is for browsing and creating, not building track-by-track.
    """

    def __init__(self, database, engine):
        super().__init__()
        self.database = database
        self.engine = engine

        outer = QVBoxLayout(self)
        outer.setContentsMargins(32, 32, 32, 32)
        outer.setSpacing(12)

        header_row = QHBoxLayout()
        title = QLabel("Playlists")
        title.setObjectName("PageTitle")
        header_row.addWidget(title)
        header_row.addStretch()
        new_playlist_btn = QPushButton("+ New Playlist")
        new_playlist_btn.setObjectName("SecondaryButton")
        new_playlist_btn.clicked.connect(self._on_new_playlist)
        header_row.addWidget(new_playlist_btn)
        outer.addLayout(header_row)

        body = QHBoxLayout()
        body.setSpacing(24)

        self.playlist_list = QListWidget()
        self.playlist_list.setObjectName("PlaylistList")
        self.playlist_list.setFixedWidth(220)
        self.playlist_list.currentRowChanged.connect(self._on_playlist_selected)
        body.addWidget(self.playlist_list)

        self.track_list = QListWidget()
        self.track_list.setObjectName("PlaylistTrackList")
        self.track_list.itemDoubleClicked.connect(self._on_track_double_clicked)
        body.addWidget(self.track_list, 1)

        outer.addLayout(body, 1)

        self._playlists = []
        self._current_playlist_tracks = []
        self.refresh()

    def refresh(self) -> None:
        self._playlists = self.database.all_playlists()
        self.playlist_list.clear()
        for playlist in self._playlists:
            self.playlist_list.addItem(playlist["name"])
        if self._playlists:
            self.playlist_list.setCurrentRow(0)
        else:
            self.track_list.clear()

    def _on_new_playlist(self) -> None:
        name, ok = QInputDialog.getText(self, "New Playlist", "Playlist name:")
        if ok and name.strip():
            self.database.create_playlist(name.strip())
            self.refresh()

    def _on_playlist_selected(self, row: int) -> None:
        self.track_list.clear()
        self._current_playlist_tracks = []
        if row < 0 or row >= len(self._playlists):
            return
        playlist_id = self._playlists[row]["id"]
        tracks = self.database.playlist_tracks(playlist_id)
        self._current_playlist_tracks = tracks
        for track in tracks:
            self.track_list.addItem(f"{track['title']} \u2014 {track['artist']}")

    def _on_track_double_clicked(self, item) -> None:
        row = self.track_list.row(item)
        entries = [entry_from_track(t) for t in self._current_playlist_tracks]
        self.engine.play_queue(entries, start_index=row)
