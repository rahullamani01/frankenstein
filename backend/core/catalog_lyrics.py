"""On-demand LRCLIB lookup. No Spotify tokens or audio are sent to the provider."""
from __future__ import annotations

import copy
import json
import math
import re
import ssl
import threading
import time
import unicodedata
from collections import OrderedDict
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi

from core.lyrics import _parse_lrc

BASE = "https://lrclib.net/api"
USER_AGENT = "Frankenstein/0.1 (http://127.0.0.1:3001; personal music gallery)"
TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_cache: OrderedDict = OrderedDict()
_lock = threading.Lock()
_network_lock = threading.Lock()
_next_request = 0.0
_cooldown_until = 0.0


class LyricsUnavailable(Exception):
    def __init__(self, message: str, retry_after: int = 30):
        super().__init__(message)
        self.retry_after = retry_after


def _normalize(value: str) -> str:
    return " ".join(re.findall(r"\w+", unicodedata.normalize("NFKC", value).casefold()))


def _empty() -> dict:
    return {
        "synced": None, "plain": None, "instrumental": False,
        "provider": "LRCLIB", "providerUrl": "https://lrclib.net",
    }


def _fetch(endpoint: str, params: dict):
    """Bounded, sequential requests with provider-required throttling/backoff."""
    global _next_request, _cooldown_until
    with _network_lock:
        now = time.monotonic()
        if now < _cooldown_until:
            raise LyricsUnavailable("Lyrics provider is busy. Please try again shortly.",
                                    max(1, math.ceil(_cooldown_until - now)))
        delay = _next_request - now
        if delay > 0:
            time.sleep(delay)
        request = Request(
            f"{BASE}/{endpoint}?{urlencode(params)}",
            headers={"Accept": "application/json", "User-Agent": USER_AGENT},
        )
        try:
            with urlopen(request, timeout=5, context=TLS_CONTEXT) as response:
                # Never accept an unbounded upstream body.
                payload = response.read(2_000_001)
                if len(payload) > 2_000_000:
                    raise LyricsUnavailable("The lyrics response was too large.")
                return json.loads(payload)
        except HTTPError as error:
            if error.code == 404:
                return None
            if error.code in (429, 503):
                try:
                    retry = max(1, int(error.headers.get("Retry-After", "30")))
                except (ValueError, TypeError):
                    retry = 30
                # Include a small margin; never retry before Retry-After.
                _cooldown_until = time.monotonic() + retry + 1
                raise LyricsUnavailable("Lyrics provider is busy. Please try again shortly.", retry + 1) from error
            raise LyricsUnavailable("Could not reach the lyrics provider. Please try again.") from error
        except (URLError, TimeoutError, OSError, ValueError) as error:
            raise LyricsUnavailable("Could not reach the lyrics provider. Please try again.") from error
        finally:
            _next_request = time.monotonic() + 0.25


def _match(record, title: str, artist: str, duration: float) -> bool:
    if not isinstance(record, dict):
        return False
    if _normalize(str(record.get("trackName", ""))) != _normalize(title):
        return False
    # Match the primary artist without confusing similarly named artists.
    candidate_artist = _normalize(str(record.get("artistName", "")))
    if candidate_artist != _normalize(artist):
        return False
    if duration > 0:
        try:
            candidate_duration = float(record["duration"])
        except (KeyError, TypeError, ValueError):
            return False
        if not math.isfinite(candidate_duration) or abs(candidate_duration - duration) > 2:
            return False
    return True


def _result(record: dict) -> dict:
    result = _empty()
    result["instrumental"] = record.get("instrumental") is True
    if not result["instrumental"]:
        synced = record.get("syncedLyrics")
        plain = record.get("plainLyrics")
        result["synced"] = _parse_lrc(synced) if isinstance(synced, str) else None
        result["plain"] = plain.strip() or None if isinstance(plain, str) else None
    if isinstance(record.get("id"), int) and record["id"] > 0:
        result["providerUrl"] = f"https://lrclib.net/api/get/{record['id']}"
    return result


def lookup_lyrics(title: str, artist: str, album: str = "", duration: float = 0) -> dict:
    title, artist, album = title.strip(), artist.strip(), album.strip()
    if not title or not artist:
        return _empty()
    key = (_normalize(title), _normalize(artist), _normalize(album), round(duration))
    with _lock:
        cached = _cache.get(key)
        if cached and cached[0] > time.monotonic():
            _cache.move_to_end(key)
            return copy.deepcopy(cached[1])

    params = {"track_name": title, "artist_name": artist}
    if album and album != "Unknown Album":
        params["album_name"] = album
    if 1 <= duration <= 3600:
        params["duration"] = str(duration)
    record = _fetch("get", params)
    if not _match(record, title, artist, duration):
        # Album editions can differ. Search still requires matching title,
        # artist AND duration; never blindly take the first result.
        candidates = _fetch("search", {"track_name": title, "artist_name": artist})
        matches = [r for r in candidates or [] if _match(r, title, artist, duration)] if isinstance(candidates, list) else []
        matches.sort(key=lambda r: (
            _normalize(str(r.get("albumName", ""))) == _normalize(album),
            bool(r.get("syncedLyrics")),
        ), reverse=True)
        record = matches[0] if matches else None
    result = _result(record) if record else _empty()
    ttl = 86400 if record else 600
    with _lock:
        _cache[key] = (time.monotonic() + ttl, result)
        _cache.move_to_end(key)
        while len(_cache) > 256:
            _cache.popitem(last=False)
    return copy.deepcopy(result)
