from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLabel, QScrollArea, QVBoxLayout, QWidget

from core.lyrics import extract_lyrics


class LyricsPage(QWidget):
    """Shows lyrics for whatever's currently playing, read straight from
    the file's own tags — no lookup, no network. Synced lyrics (ID3 SYLT
    frames, or plain lyrics text that turns out to be LRC-formatted)
    highlight the current line as playback moves; anything else just
    shows as scrollable plain text.
    """

    def __init__(self, engine):
        super().__init__()
        self.engine = engine
        self._synced_labels: list[QLabel] = []
        self._synced_times: list[int] = []
        self._current_line_index = -1

        layout = QVBoxLayout(self)
        layout.setContentsMargins(32, 32, 32, 32)
        layout.setSpacing(12)

        self.title_label = QLabel("Lyrics")
        self.title_label.setObjectName("PageTitle")
        layout.addWidget(self.title_label)

        self.subtitle_label = QLabel("Nothing playing yet.")
        self.subtitle_label.setObjectName("PageSubtitle")
        layout.addWidget(self.subtitle_label)

        self.scroll = QScrollArea()
        self.scroll.setWidgetResizable(True)
        self.scroll.setObjectName("LyricsScroll")
        layout.addWidget(self.scroll, 1)

        self.body = QWidget()
        self.body_layout = QVBoxLayout(self.body)
        self.body_layout.setContentsMargins(0, 0, 0, 0)
        self.body_layout.setSpacing(6)
        self.body_layout.setAlignment(Qt.AlignTop)
        self.scroll.setWidget(self.body)

        self.engine.track_changed.connect(self._on_track_changed)
        self.engine.position_changed.connect(self._on_position_changed)

    def _clear_body(self) -> None:
        while self.body_layout.count():
            item = self.body_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self._synced_labels = []
        self._synced_times = []
        self._current_line_index = -1

    def _on_track_changed(self, index: int) -> None:
        entry = self.engine.current_entry()
        self._clear_body()
        if entry is None:
            self.subtitle_label.setText("Nothing playing yet.")
            return

        self.subtitle_label.setText(f"{entry['title']} \u2014 {entry['artist']}")
        result = extract_lyrics(entry["path"])

        if result["synced"]:
            for ms, line in result["synced"]:
                label = QLabel(line or "\u266a")
                label.setObjectName("LyricsLine")
                label.setWordWrap(True)
                self.body_layout.addWidget(label)
                self._synced_labels.append(label)
                self._synced_times.append(ms)
        elif result["plain"]:
            label = QLabel(result["plain"])
            label.setObjectName("LyricsPlain")
            label.setWordWrap(True)
            self.body_layout.addWidget(label)
        else:
            label = QLabel("No lyrics found in this file's tags.")
            label.setObjectName("PageSubtitle")
            self.body_layout.addWidget(label)

    def _on_position_changed(self, position_ms: int) -> None:
        if not self._synced_times:
            return

        # Last line whose timestamp has already passed.
        new_index = -1
        for i, ts in enumerate(self._synced_times):
            if ts <= position_ms:
                new_index = i
            else:
                break

        if new_index == self._current_line_index:
            return

        if 0 <= self._current_line_index < len(self._synced_labels):
            self._restyle(self._synced_labels[self._current_line_index], "LyricsLine")

        self._current_line_index = new_index

        if 0 <= new_index < len(self._synced_labels):
            active = self._synced_labels[new_index]
            self._restyle(active, "LyricsLineActive")
            self.scroll.ensureVisible(0, active.y(), 0, 100)

    def _restyle(self, label: QLabel, object_name: str) -> None:
        label.setObjectName(object_name)
        label.style().unpolish(label)
        label.style().polish(label)
