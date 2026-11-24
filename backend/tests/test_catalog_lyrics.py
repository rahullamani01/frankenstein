"""All lyric text here is invented test data; no external network is used."""
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from core import catalog_lyrics as provider
from core.lyrics import _parse_lrc


def record(**changes):
    result = {
        "id": 101, "trackName": "The Test Song", "artistName": "Test Artist",
        "albumName": "Test Album", "duration": 180, "instrumental": False,
        "plainLyrics": "A line of test text\nAnother invented line",
        "syncedLyrics": "[00:10.00] A line of test text\n[00:20.50] Another invented line",
    }
    result.update(changes)
    return result


class LyricsTests(unittest.TestCase):
    def setUp(self):
        provider._cache.clear()
        provider._next_request = 0
        provider._cooldown_until = 0

    def test_lrc_fractional_timestamps_and_order(self):
        self.assertEqual(_parse_lrc(
            "[ar:Test]\n[00:20.125]Second\n[00:01.5]First\n[00:25.00]"
        ), [(1500, "First"), (20125, "Second"), (25000, "")])

    def test_lrc_repeated_timestamps(self):
        self.assertEqual(_parse_lrc("[00:05][01:05.00]Repeat"), [
            (5000, "Repeat"), (65000, "Repeat"),
        ])

    def test_lrc_plain_or_invalid_text_is_not_time_synced(self):
        self.assertIsNone(_parse_lrc("Just some [brackets]\n[00:61]Invalid seconds"))

    def test_exact_record_returns_synced_and_plain_with_attribution(self):
        with patch.object(provider, "_fetch", return_value=record()) as fetch:
            result = provider.lookup_lyrics("The Test Song", "Test Artist", "Test Album", 180)
        self.assertEqual(result["synced"][0], (10000, "A line of test text"))
        self.assertIn("Another invented line", result["plain"])
        self.assertEqual(result["provider"], "LRCLIB")
        self.assertEqual(result["providerUrl"], "https://lrclib.net/api/get/101")
        fetch.assert_called_once()
        self.assertEqual(fetch.call_args.args[1]["duration"], "180")

    def test_plain_lyrics_without_timing(self):
        with patch.object(provider, "_fetch", return_value=record(syncedLyrics=None)):
            result = provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
        self.assertIsNone(result["synced"])
        self.assertTrue(result["plain"])

    def test_instrumental_does_not_display_lyrics(self):
        with patch.object(provider, "_fetch", return_value=record(instrumental=True)):
            result = provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
        self.assertTrue(result["instrumental"])
        self.assertIsNone(result["synced"])
        self.assertIsNone(result["plain"])

    def test_album_editions_fall_back_to_verified_search_match(self):
        wrong = record(trackName="Other Song")
        live = record(duration=230)
        good = record(albumName="Another Edition")
        with patch.object(provider, "_fetch", side_effect=[None, [wrong, live, good]]) as fetch:
            result = provider.lookup_lyrics("The Test Song", "Test Artist", "Original Album", 180)
        self.assertEqual(fetch.call_count, 2)
        self.assertTrue(result["synced"])

    def test_wrong_artist_or_duration_never_uses_first_search_result(self):
        with patch.object(provider, "_fetch", side_effect=[
            None, [record(artistName="Unrelated Artist"), record(duration=220)],
        ]):
            result = provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
        self.assertIsNone(result["plain"])
        self.assertIsNone(result["synced"])

    def test_not_found_returns_empty_result(self):
        with patch.object(provider, "_fetch", side_effect=[None, []]):
            result = provider.lookup_lyrics("Missing", "Unknown", duration=180)
        self.assertEqual(result, provider._empty())

    def test_success_is_cached_and_callers_cannot_mutate_cached_data(self):
        with patch.object(provider, "_fetch", return_value=record()) as fetch:
            first = provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
            first["synced"].clear()
            second = provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
        self.assertEqual(fetch.call_count, 1)
        self.assertEqual(len(second["synced"]), 2)

    def test_not_found_cache_expires(self):
        with patch.object(provider.time, "monotonic", return_value=100):
            with patch.object(provider, "_fetch", side_effect=[None, []]) as fetch:
                provider.lookup_lyrics("Missing", "Unknown", duration=180)
                provider.lookup_lyrics("Missing", "Unknown", duration=180)
                self.assertEqual(fetch.call_count, 2)
        with patch.object(provider.time, "monotonic", return_value=701):
            with patch.object(provider, "_fetch", side_effect=[None, []]) as fetch:
                provider.lookup_lyrics("Missing", "Unknown", duration=180)
                self.assertEqual(fetch.call_count, 2)

    def test_network_failure_is_not_cached_as_missing_lyrics(self):
        with patch.object(provider, "_fetch", side_effect=provider.LyricsUnavailable("Offline")):
            with self.assertRaises(provider.LyricsUnavailable):
                provider.lookup_lyrics("The Test Song", "Test Artist", duration=180)
        self.assertEqual(len(provider._cache), 0)

    def test_http_404_is_treated_as_a_miss(self):
        with patch.object(provider, "urlopen", side_effect=HTTPError("url", 404, "Missing", {}, None)):
            self.assertIsNone(provider._fetch("get", {"track_name": "Test"}))

    def test_timeout_is_reported_as_unavailable(self):
        with patch.object(provider, "urlopen", side_effect=URLError("Timed out")):
            with self.assertRaises(provider.LyricsUnavailable):
                provider._fetch("get", {"track_name": "Test"})

    def test_rate_limit_honors_retry_after_without_another_request(self):
        error = HTTPError("url", 429, "Busy", {"Retry-After": "60"}, None)
        with patch.object(provider, "urlopen", side_effect=error) as fetch:
            with self.assertRaises(provider.LyricsUnavailable) as context:
                provider._fetch("get", {"track_name": "Test"})
            self.assertGreaterEqual(context.exception.retry_after, 60)
            with self.assertRaises(provider.LyricsUnavailable):
                provider._fetch("get", {"track_name": "Test"})
            self.assertEqual(fetch.call_count, 1)


if __name__ == "__main__":
    unittest.main()
