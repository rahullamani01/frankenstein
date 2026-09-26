from pathlib import Path
from typing import List, Optional, TypedDict

from PySide6.QtCore import QObject, QUrl, Signal
from PySide6.QtMultimedia import QAudioOutput, QMediaPlayer


class QueueEntry(TypedDict):
    id: Optional[int]  # database track id, if this track is in the library
    path: Path
    title: str
    artist: str
    artwork_path: Optional[str]  # cached cover art path, if any (Phase 4)


class PlayerEngine(QObject):
    """Wraps QMediaPlayer + an in-memory queue of QueueEntry dicts.

    If a `database` is provided, every play/skip/completion is logged to
    play_events, and favorite toggling is backed by the tracks table. The
    UI never talks to QMediaPlayer directly — it uses these signals/methods.
    """

    track_changed = Signal(int)            # new current queue index
    playback_state_changed = Signal(bool)  # True = playing
    position_changed = Signal(int)         # milliseconds
    duration_changed = Signal(int)         # milliseconds
    queue_changed = Signal()
    favorite_changed = Signal(bool)        # favorite state of the current track

    def __init__(self, database=None):
        super().__init__()
        self.database = database

        self._player = QMediaPlayer()
        self._audio_output = QAudioOutput()
        self._player.setAudioOutput(self._audio_output)

        self._queue: List[QueueEntry] = []
        self._current_index: int = -1

        self._player.playbackStateChanged.connect(self._on_playback_state_changed)
        # positionChanged/durationChanged emit qint64; re-emit as plain int
        self._player.positionChanged.connect(lambda p: self.position_changed.emit(int(p)))
        self._player.durationChanged.connect(lambda d: self.duration_changed.emit(int(d)))
        self._player.mediaStatusChanged.connect(self._on_media_status_changed)

    # --- Queue management ---

    def add_entries(self, entries: List[QueueEntry]) -> None:
        """Append to the current queue. Starts playing if nothing was queued."""
        was_empty = not self._queue
        self._queue.extend(entries)
        self.queue_changed.emit()
        if was_empty and self._queue:
            self._play_index(0)

    def play_queue(self, entries: List[QueueEntry], start_index: int = 0) -> None:
        """Replace the whole queue (e.g. "play this album/library from here")."""
        self._queue = list(entries)
        self.queue_changed.emit()
        if self._queue:
            self._play_index(min(start_index, len(self._queue) - 1))

    @property
    def queue(self) -> List[QueueEntry]:
        return list(self._queue)

    @property
    def current_index(self) -> int:
        return self._current_index

    def current_entry(self) -> Optional[QueueEntry]:
        if 0 <= self._current_index < len(self._queue):
            return self._queue[self._current_index]
        return None

    # --- Transport ---

    def play_pause(self) -> None:
        if not self._queue:
            return
        if self._current_index == -1:
            self._play_index(0)
        elif self._player.playbackState() == QMediaPlayer.PlaybackState.PlayingState:
            self._player.pause()
        else:
            self._player.play()

    def next_track(self) -> None:
        self._advance(1, reason="skipped")

    def previous_track(self) -> None:
        self._advance(-1, reason="skipped")

    def play_at(self, index: int) -> None:
        if 0 <= index < len(self._queue):
            self._play_index(index)

    def seek(self, position_ms: int) -> None:
        self._player.setPosition(position_ms)

    def set_volume(self, volume_percent: int) -> None:
        self._audio_output.setVolume(volume_percent / 100)

    def toggle_favorite_current(self) -> None:
        entry = self.current_entry()
        if entry is None or entry.get("id") is None or self.database is None:
            return
        new_state = not self.database.is_favorite(entry["id"])
        self.database.set_favorite(entry["id"], new_state)
        self.favorite_changed.emit(new_state)

    # --- Internals ---

    def _advance(self, direction: int, reason: str) -> None:
        if not self._queue:
            return
        if self._current_index != -1:
            self._log_event(self._current_index, reason)
        new_index = (self._current_index + direction) % len(self._queue)
        self._play_index(new_index)

    def _play_index(self, index: int) -> None:
        self._current_index = index
        entry = self._queue[index]
        self._player.setSource(QUrl.fromLocalFile(str(entry["path"])))
        self._player.play()
        self._log_event(index, "played")
        self.track_changed.emit(index)

        is_fav = False
        if entry.get("id") is not None and self.database is not None:
            is_fav = self.database.is_favorite(entry["id"])
        self.favorite_changed.emit(is_fav)

    def _log_event(self, index: int, event: str) -> None:
        if self.database is None:
            return
        entry = self._queue[index]
        if entry.get("id") is not None:
            self.database.log_event(entry["id"], event)

    def _on_playback_state_changed(self, state) -> None:
        self.playback_state_changed.emit(state == QMediaPlayer.PlaybackState.PlayingState)

    def _on_media_status_changed(self, status) -> None:
        if status == QMediaPlayer.MediaStatus.EndOfMedia:
            self._advance(1, reason="completed")
