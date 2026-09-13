from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSlider,
    QVBoxLayout,
    QWidget,
)


def format_ms(ms: int) -> str:
    seconds = max(ms, 0) // 1000
    minutes, seconds = divmod(seconds, 60)
    return f"{minutes}:{seconds:02d}"


class PlayerBar(QWidget):
    """Persistent bottom bar, wired to a PlayerEngine for real playback."""

    def __init__(self, engine):
        super().__init__()
        self.engine = engine
        self.setObjectName("PlayerBar")
        self.setFixedHeight(90)

        self._seeking = False  # True while the user drags the seek handle

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 8, 16, 8)
        layout.setSpacing(12)

        # Album art placeholder — real artwork arrives in Phase 4
        self.art = QLabel()
        self.art.setObjectName("PlayerArt")
        self.art.setFixedSize(64, 64)
        layout.addWidget(self.art)

        # Track info
        info_layout = QVBoxLayout()
        info_layout.setSpacing(2)
        self.title_label = QLabel("No track playing")
        self.title_label.setObjectName("PlayerTitle")
        self.artist_label = QLabel("File \u2192 Add Music Folder\u2026")
        self.artist_label.setObjectName("PlayerArtist")
        info_layout.addStretch()
        info_layout.addWidget(self.title_label)
        info_layout.addWidget(self.artist_label)
        info_layout.addStretch()
        layout.addLayout(info_layout, 1)

        # Favorite toggle
        self.favorite_btn = QPushButton("\u2661")  # heart outline; filled when favorited
        self.favorite_btn.setObjectName("FavoriteButton")
        self.favorite_btn.setFixedSize(32, 32)
        self.favorite_btn.setCheckable(True)
        layout.addWidget(self.favorite_btn)

        # Transport controls
        controls_layout = QHBoxLayout()
        controls_layout.setSpacing(8)
        self.prev_btn = QPushButton("\u23ee")
        self.play_btn = QPushButton("\u25b6")
        self.next_btn = QPushButton("\u23ed")
        for btn in (self.prev_btn, self.play_btn, self.next_btn):
            btn.setObjectName("TransportButton")
            btn.setFixedSize(36, 36)
            controls_layout.addWidget(btn)
        layout.addLayout(controls_layout)

        # Elapsed time
        self.elapsed_label = QLabel("0:00")
        self.elapsed_label.setObjectName("TimeLabel")
        self.elapsed_label.setFixedWidth(38)
        layout.addWidget(self.elapsed_label)

        # Seek bar
        self.seek_slider = QSlider(Qt.Horizontal)
        self.seek_slider.setObjectName("SeekSlider")
        layout.addWidget(self.seek_slider, 2)

        # Duration
        self.duration_label = QLabel("0:00")
        self.duration_label.setObjectName("TimeLabel")
        self.duration_label.setFixedWidth(38)
        layout.addWidget(self.duration_label)

        # Volume
        self.volume_slider = QSlider(Qt.Horizontal)
        self.volume_slider.setObjectName("VolumeSlider")
        self.volume_slider.setFixedWidth(100)
        self.volume_slider.setRange(0, 100)
        self.volume_slider.setValue(70)
        layout.addWidget(self.volume_slider)

        self._set_controls_enabled(False)
        self._wire_ui()
        self._wire_engine()

        self.engine.set_volume(self.volume_slider.value())

    # --- Setup ---

    def _set_controls_enabled(self, enabled: bool) -> None:
        for w in (self.prev_btn, self.play_btn, self.next_btn, self.seek_slider, self.favorite_btn):
            w.setEnabled(enabled)

    def _wire_ui(self) -> None:
        self.play_btn.clicked.connect(self.engine.play_pause)
        self.next_btn.clicked.connect(self.engine.next_track)
        self.prev_btn.clicked.connect(self.engine.previous_track)
        self.favorite_btn.clicked.connect(self.engine.toggle_favorite_current)

        # Don't fight the user's drag: only seek once they release the handle
        self.seek_slider.sliderPressed.connect(lambda: setattr(self, "_seeking", True))
        self.seek_slider.sliderReleased.connect(self._on_seek_released)

        self.volume_slider.valueChanged.connect(self.engine.set_volume)

    def _on_seek_released(self) -> None:
        self._seeking = False
        self.engine.seek(self.seek_slider.value())

    def _wire_engine(self) -> None:
        self.engine.track_changed.connect(self._on_track_changed)
        self.engine.playback_state_changed.connect(self._on_playback_state_changed)
        self.engine.position_changed.connect(self._on_position_changed)
        self.engine.duration_changed.connect(self._on_duration_changed)
        self.engine.queue_changed.connect(self._on_queue_changed)
        self.engine.favorite_changed.connect(self._on_favorite_changed)

    # --- Engine signal handlers ---

    def _on_track_changed(self, index: int) -> None:
        entry = self.engine.current_entry()
        if entry is None:
            return
        self.title_label.setText(entry["title"])
        self.artist_label.setText(entry["artist"])
        self._set_controls_enabled(True)

    def _on_playback_state_changed(self, is_playing: bool) -> None:
        self.play_btn.setText("\u23f8" if is_playing else "\u25b6")

    def _on_position_changed(self, position_ms: int) -> None:
        if self._seeking:
            return
        self.seek_slider.setValue(position_ms)
        self.elapsed_label.setText(format_ms(position_ms))

    def _on_duration_changed(self, duration_ms: int) -> None:
        self.seek_slider.setRange(0, duration_ms)
        self.duration_label.setText(format_ms(duration_ms))

    def _on_queue_changed(self) -> None:
        if self.engine.queue and self.engine.current_index == -1:
            self._set_controls_enabled(True)

    def _on_favorite_changed(self, is_favorite: bool) -> None:
        self.favorite_btn.setChecked(is_favorite)
        self.favorite_btn.setText("\u2665" if is_favorite else "\u2661")
