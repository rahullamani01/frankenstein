from PySide6.QtCore import Signal
from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget

from ui.widgets.track_table import TrackTable


class LibraryPage(QWidget):
    """Shows every track the database knows about. Populated by scanning a
    folder (File -> Add Music Folder…) or by adding individual files.
    """

    artist_requested = Signal(str)
    album_requested = Signal(str, str)

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

        self.table = TrackTable(self.database)
        self.table.play_requested.connect(
            lambda entries, start_index: self.engine.play_queue(entries, start_index=start_index)
        )
        self.table.artist_requested.connect(self.artist_requested)
        self.table.album_requested.connect(self.album_requested)
        layout.addWidget(self.table, 1)

        self.refresh()

    def refresh(self) -> None:
        """Reload the table from the database. Call after scans/imports."""
        tracks = self.database.all_tracks()
        self.table.set_tracks(tracks)
        self.empty_label.setVisible(len(tracks) == 0)
        self.table.setVisible(len(tracks) > 0)
