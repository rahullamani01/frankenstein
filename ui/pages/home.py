from datetime import datetime

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QHBoxLayout, QLabel, QScrollArea, QVBoxLayout, QWidget

from core.recommendations import recommended_tracks, top_artists
from ui.widgets.track_card import TrackCard


def _greeting() -> str:
    hour = datetime.now().hour
    if hour < 12:
        return "Good morning"
    if hour < 18:
        return "Good afternoon"
    return "Good evening"


class HomeSection(QWidget):
    """One horizontally-scrolling row of TrackCards under a heading."""

    track_activated = Signal(dict)

    def __init__(self, heading: str):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(12)

        self.heading_label = QLabel(heading)
        self.heading_label.setObjectName("SectionHeading")
        layout.addWidget(self.heading_label)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setFixedHeight(230)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.scroll.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.scroll.setObjectName("HomeScroll")

        self.row_widget = QWidget()
        self.row_layout = QHBoxLayout(self.row_widget)
        self.row_layout.setContentsMargins(0, 0, 0, 0)
        self.row_layout.setSpacing(16)
        self.row_layout.addStretch()
        self.scroll.setWidget(self.row_widget)
        layout.addWidget(self.scroll)

        self.empty_label = QLabel()
        self.empty_label.setObjectName("PageSubtitle")
        layout.addWidget(self.empty_label)

    def set_heading(self, heading: str) -> None:
        self.heading_label.setText(heading)

    def set_tracks(self, tracks, empty_text: str) -> None:
        # Clear existing cards, keeping the trailing stretch at the end.
        while self.row_layout.count() > 1:
            item = self.row_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        for track in tracks:
            card = TrackCard(track)
            card.clicked.connect(lambda t=track: self.track_activated.emit(dict(t)))
            self.row_layout.insertWidget(self.row_layout.count() - 1, card)

        has_tracks = len(tracks) > 0
        self.scroll.setVisible(has_tracks)
        self.empty_label.setText("" if has_tracks else empty_text)
        self.empty_label.setVisible(not has_tracks)


class HomePage(QWidget):
    """Landing page: Recently Played and Made For You, pulled straight from
    the database. Shows a friendly empty state until there's history to
    draw on.
    """

    track_activated = Signal(dict)

    def __init__(self, database):
        super().__init__()
        self.database = database

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setAlignment(Qt.AlignTop)
        layout.setSpacing(24)

        self.title = QLabel(_greeting())
        self.title.setObjectName("PageTitle")
        layout.addWidget(self.title)

        self.recently_played = HomeSection("Recently Played")
        self.recently_played.track_activated.connect(self.track_activated)
        layout.addWidget(self.recently_played)

        self.made_for_you = HomeSection("Made For You")
        self.made_for_you.track_activated.connect(self.track_activated)
        layout.addWidget(self.made_for_you)

        # Titled dynamically in refresh() once we know the top artist;
        # hidden entirely until there's enough listening history to base
        # it on (see refresh()).
        self.discovery = HomeSection("")
        self.discovery.track_activated.connect(self.track_activated)
        layout.addWidget(self.discovery)

        layout.addStretch()

    def refresh(self) -> None:
        self.title.setText(_greeting())

        recent = self.database.recently_played(limit=10)
        self.recently_played.set_tracks(
            recent,
            "Tracks you play will show up here.",
        )

        # Keep recommendations from just echoing what's already sitting in
        # Recently Played right above them.
        recent_ids = {t["id"] for t in recent}

        recs = recommended_tracks(self.database, limit=10, exclude_ids=recent_ids)
        self.made_for_you.set_tracks(
            recs,
            "Add some music and mark a few favorites \u2014 picks will show up here.",
        )

        top = top_artists(self.database, limit=1)
        if top:
            artist = top[0]
            discovery_tracks = [
                t for t in self.database.tracks_by_artist(artist) if t["id"] not in recent_ids
            ][:10]
            self.discovery.set_heading(f"Because you listen to {artist}")
            self.discovery.set_tracks(discovery_tracks, "")
            self.discovery.setVisible(len(discovery_tracks) > 0)
        else:
            self.discovery.setVisible(False)
