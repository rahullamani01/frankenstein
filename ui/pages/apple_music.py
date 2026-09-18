"""Apple Music page.

Remote-controls the real Music.app via AppleScript (core/apple_music.py)
instead of playing audio through Frankenstein's own PlayerEngine — see
that module's docstring for why. This page is a mirror + remote, not a
second player: the "Now Playing" section polls Music.app every second,
and the transport buttons send commands to Music.app, not to
core.player_engine. Search reaches only your own Music.app library, not
Apple's full catalog.
"""
from PySide6.QtCore import Qt, QTimer
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from core import apple_music

POLL_INTERVAL_MS = 1000


class AppleMusicPage(QWidget):
    def __init__(self):
        super().__init__()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(16)

        title = QLabel("Apple Music")
        title.setObjectName("PageTitle")
        layout.addWidget(title)

        self.subtitle = QLabel("Connecting to Music.app\u2026")
        self.subtitle.setObjectName("PageSubtitle")
        layout.addWidget(self.subtitle)

        now_playing_box = QVBoxLayout()
        self.now_playing_title = QLabel("Nothing playing")
        self.now_playing_title.setObjectName("PlayerTitle")
        self.now_playing_artist = QLabel("")
        self.now_playing_artist.setObjectName("PlayerArtist")
        now_playing_box.addWidget(self.now_playing_title)
        now_playing_box.addWidget(self.now_playing_artist)
        layout.addLayout(now_playing_box)

        transport_row = QHBoxLayout()
        self.prev_button = QPushButton("\u23ee")
        self.play_pause_button = QPushButton("\u23ef")
        self.next_button = QPushButton("\u23ed")
        for btn in (self.prev_button, self.play_pause_button, self.next_button):
            btn.setObjectName("TransportButton")
            btn.setFixedSize(36, 36)
        transport_row.addWidget(self.prev_button)
        transport_row.addWidget(self.play_pause_button)
        transport_row.addWidget(self.next_button)
        transport_row.addStretch()

        self.volume_slider = QSlider(Qt.Horizontal)
        self.volume_slider.setRange(0, 100)
        self.volume_slider.setValue(50)
        self.volume_slider.setFixedWidth(120)
        transport_row.addWidget(QLabel("Volume"))
        transport_row.addWidget(self.volume_slider)
        layout.addLayout(transport_row)

        search_label = QLabel("Search your Music library")
        search_label.setObjectName("SectionHeading")
        layout.addWidget(search_label)

        self.search_box = QLineEdit()
        self.search_box.setObjectName("SearchBox")
        self.search_box.setPlaceholderText("Search your Music.app library\u2026")
        layout.addWidget(self.search_box)

        self.results_list = QListWidget()
        self.results_list.setObjectName("LibraryTable")
        layout.addWidget(self.results_list, 1)

        self.prev_button.clicked.connect(self._on_previous)
        self.play_pause_button.clicked.connect(self._on_play_pause)
        self.next_button.clicked.connect(self._on_next)
        self.volume_slider.valueChanged.connect(self._on_volume_changed)
        self.search_box.returnPressed.connect(self._on_search)
        self.results_list.itemDoubleClicked.connect(self._on_result_activated)

        self._poll_timer = QTimer(self)
        self._poll_timer.setInterval(POLL_INTERVAL_MS)
        self._poll_timer.timeout.connect(self._poll_now_playing)

        self._available = apple_music.is_available()
        if self._available:
            self.subtitle.setText("Controlling Music.app.")
            self._poll_timer.start()
            self._poll_now_playing()
        else:
            self.subtitle.setText(
                "Couldn't reach Music.app. This only works on macOS with "
                "Music.app installed \u2014 if it's your first time, macOS "
                "may also be waiting on an Automation permission prompt."
            )
            self._set_controls_enabled(False)

    def _set_controls_enabled(self, enabled: bool) -> None:
        for widget in (
            self.prev_button, self.play_pause_button, self.next_button,
            self.volume_slider, self.search_box,
        ):
            widget.setEnabled(enabled)

    def _poll_now_playing(self) -> None:
        state = apple_music.now_playing()
        if state is None:
            # Music.app stopped responding mid-session (e.g. it quit).
            self._available = False
            self._poll_timer.stop()
            self.subtitle.setText("Lost connection to Music.app.")
            self._set_controls_enabled(False)
            return

        if state["state"] == "stopped" and not state["name"]:
            self.now_playing_title.setText("Nothing playing")
            self.now_playing_artist.setText("")
            self.play_pause_button.setText("\u23ef")
            return

        self.now_playing_title.setText(state["name"])
        self.now_playing_artist.setText(state["artist"])
        self.play_pause_button.setText("\u23f8" if state["state"] == "playing" else "\u23ef")

    def _on_play_pause(self) -> None:
        apple_music.playpause()
        self._poll_now_playing()

    def _on_previous(self) -> None:
        apple_music.previous_track()
        self._poll_now_playing()

    def _on_next(self) -> None:
        apple_music.next_track()
        self._poll_now_playing()

    def _on_volume_changed(self, value: int) -> None:
        apple_music.set_volume(value)

    def _on_search(self) -> None:
        query = self.search_box.text().strip()
        self.results_list.clear()
        if not query:
            return
        for track in apple_music.search_library(query):
            item = QListWidgetItem(f"{track['name']} \u2014 {track['artist']}")
            item.setData(Qt.UserRole, track)
            self.results_list.addItem(item)

    def _on_result_activated(self, item: QListWidgetItem) -> None:
        track = item.data(Qt.UserRole)
        if track:
            apple_music.play_track(track["name"], track["artist"])
            self._poll_now_playing()
