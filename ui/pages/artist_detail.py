from PySide6.QtCore import Signal
from PySide6.QtWidgets import QHBoxLayout, QLabel, QPushButton, QVBoxLayout, QWidget

from ui.widgets.track_table import TrackTable


class ArtistDetailPage(QWidget):
    """All tracks by one artist. Reached from a track's right-click menu
    ("Go to Artist") in Library or Search.
    """

    back_requested = Signal()
    album_requested = Signal(str, str)

    def __init__(self, database, engine):
        super().__init__()
        self.database = database
        self.engine = engine
        self._artist = None

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(12)

        header = QHBoxLayout()
        back_btn = QPushButton("\u2190 Back")
        back_btn.setObjectName("SecondaryButton")
        back_btn.clicked.connect(self.back_requested)
        header.addWidget(back_btn)
        header.addStretch()
        layout.addLayout(header)

        self.title_label = QLabel()
        self.title_label.setObjectName("PageTitle")
        layout.addWidget(self.title_label)

        self.subtitle_label = QLabel()
        self.subtitle_label.setObjectName("PageSubtitle")
        layout.addWidget(self.subtitle_label)

        self.table = TrackTable(self.database)
        self.table.play_requested.connect(
            lambda entries, start_index: self.engine.play_queue(entries, start_index=start_index)
        )
        self.table.album_requested.connect(self.album_requested)
        layout.addWidget(self.table, 1)

    def set_artist(self, artist: str) -> None:
        self._artist = artist
        tracks = self.database.tracks_by_artist(artist)
        self.title_label.setText(artist)
        n = len(tracks)
        self.subtitle_label.setText(f"{n} track{'s' if n != 1 else ''} in your library")
        self.table.set_tracks(tracks)
