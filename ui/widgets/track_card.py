from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget

CARD_ART_SIZE = 140


class TrackCard(QWidget):
    """A clickable album-art tile used on the Home page.

    The whole tile (art + title + artist) is one click target; clicking it
    plays that track. Falls back to a music-note glyph when a track has no
    embedded artwork.
    """

    clicked = Signal()

    def __init__(self, track):
        super().__init__()
        self.setObjectName("TrackCard")
        self.setCursor(Qt.PointingHandCursor)
        self.setFixedWidth(CARD_ART_SIZE)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        self.art_label = QLabel()
        self.art_label.setObjectName("CardArt")
        self.art_label.setFixedSize(CARD_ART_SIZE, CARD_ART_SIZE)
        self._set_art(track["artwork_path"] if "artwork_path" in track.keys() else None)
        layout.addWidget(self.art_label)

        title = QLabel(track["title"])
        title.setObjectName("CardTitle")
        title.setWordWrap(True)
        title.setFixedWidth(CARD_ART_SIZE)
        layout.addWidget(title)

        artist = QLabel(track["artist"])
        artist.setObjectName("CardArtist")
        artist.setWordWrap(True)
        artist.setFixedWidth(CARD_ART_SIZE)
        layout.addWidget(artist)

    def _set_art(self, artwork_path) -> None:
        pixmap = QPixmap(artwork_path) if artwork_path else QPixmap()
        if pixmap.isNull():
            self.art_label.setText("\U0001F3B5")  # music note placeholder
            self.art_label.setAlignment(Qt.AlignCenter)
        else:
            scaled = pixmap.scaled(
                CARD_ART_SIZE, CARD_ART_SIZE, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation
            )
            self.art_label.setPixmap(scaled)

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.LeftButton:
            self.clicked.emit()
        super().mousePressEvent(event)
