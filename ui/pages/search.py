from PySide6.QtCore import Signal
from PySide6.QtWidgets import QLabel, QLineEdit, QVBoxLayout, QWidget

from ui.widgets.track_table import TrackTable


class SearchPage(QWidget):
    """Live search across title/artist/album. Results are backed by
    Database.search_tracks(), which is a plain LIKE query for now —
    good enough until Phase 5 wants something smarter.
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

        title = QLabel("Search")
        title.setObjectName("PageTitle")
        layout.addWidget(title)

        self.search_box = QLineEdit()
        self.search_box.setObjectName("SearchBox")
        self.search_box.setPlaceholderText("Search artists, albums, songs\u2026")
        self.search_box.textChanged.connect(self._on_query_changed)
        layout.addWidget(self.search_box)

        self.empty_label = QLabel("Start typing to search your library.")
        self.empty_label.setObjectName("PageSubtitle")
        layout.addWidget(self.empty_label)

        self.table = TrackTable(self.database)
        self.table.play_requested.connect(
            lambda entries, start_index: self.engine.play_queue(entries, start_index=start_index)
        )
        self.table.artist_requested.connect(self.artist_requested)
        self.table.album_requested.connect(self.album_requested)
        self.table.setVisible(False)
        layout.addWidget(self.table, 1)

    def _on_query_changed(self, text: str) -> None:
        query = text.strip()
        if not query:
            self.table.setVisible(False)
            self.empty_label.setText("Start typing to search your library.")
            self.empty_label.setVisible(True)
            return

        results = self.database.search_tracks(query)
        self.table.set_tracks(results)
        self.table.setVisible(len(results) > 0)
        self.empty_label.setVisible(len(results) == 0)
        if len(results) == 0:
            self.empty_label.setText(f'No results for "{query}".')
