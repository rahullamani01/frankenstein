"""Taste-based recommendations.

Turns raw listening signals (plays, completions, skips, favorites) into a
per-artist and per-genre "taste score", then ranks tracks the person
hasn't been worn out on. No ML here — just weighted counting — but it's
a real signal instead of Phase 4's favorites-then-random placeholder,
and it's the foundation Phase 8's ML pass can later slot audio-similarity
scoring into alongside this.
"""
import random
from collections import defaultdict
from typing import Dict, List, Optional, Sequence, Tuple

# Event weights: a completed listen is the strongest positive signal.
# Every track that ever starts also logs a "played" event (PlayerEngine
# logs "played" on start, then "completed" or "skipped" on the way out),
# so a skip's net weight is played(+1) + skipped(-2) = -1 — a real skip
# should rank below a track nobody's touched at all (net 0), not just
# cancel out to neutral.
EVENT_WEIGHTS = {"completed": 3, "played": 1, "skipped": -2}
FAVORITE_WEIGHT = 5


def _taste_scores(tracks, engagement_by_track) -> Tuple[Dict[str, float], Dict[str, float]]:
    """Build {artist: score} and {genre: score} from weighted engagement."""
    artist_scores: Dict[str, float] = defaultdict(float)
    genre_scores: Dict[str, float] = defaultdict(float)

    for track in tracks:
        eng = engagement_by_track.get(track["id"])
        weighted = 0.0
        if eng:
            weighted += eng["played_count"] * EVENT_WEIGHTS["played"]
            weighted += eng["completed_count"] * EVENT_WEIGHTS["completed"]
            weighted += eng["skipped_count"] * EVENT_WEIGHTS["skipped"]
        if track["is_favorite"]:
            weighted += FAVORITE_WEIGHT

        if weighted == 0:
            continue

        artist_scores[track["artist"]] += weighted
        if track["genre"]:
            genre_scores[track["genre"]] += weighted

    return artist_scores, genre_scores


def recommended_tracks(database, limit: int = 10, exclude_ids: Optional[Sequence[int]] = None) -> List:
    """Rank tracks by how well they match the person's taste profile.

    Falls back to a shuffled sample of the library when there's no
    listening history yet to build a taste profile from (cold start —
    a brand new library, or one nobody's played anything in yet).
    """
    tracks = database.all_tracks()
    if not tracks:
        return []

    exclude_ids = set(exclude_ids or [])
    engagement_by_track = {row["track_id"]: row for row in database.track_engagement()}
    artist_scores, genre_scores = _taste_scores(tracks, engagement_by_track)

    if not artist_scores and not genre_scores:
        pool = [t for t in tracks if t["id"] not in exclude_ids]
        random.shuffle(pool)
        return pool[:limit]

    scored = []
    for track in tracks:
        if track["id"] in exclude_ids:
            continue
        score = artist_scores.get(track["artist"], 0.0)
        if track["genre"]:
            score += genre_scores.get(track["genre"], 0.0)
        # Small jitter so ties don't always resolve the same way, and the
        # list isn't perfectly static between visits to Home.
        score += random.uniform(0, 0.5)
        scored.append((score, track))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [track for _, track in scored[:limit]]


def top_artists(database, limit: int = 3) -> List[str]:
    """The person's highest-affinity artists, for "Because you listen to
    X" style Home sections. Empty list until there's listening history.
    """
    tracks = database.all_tracks()
    engagement_by_track = {row["track_id"]: row for row in database.track_engagement()}
    artist_scores, _ = _taste_scores(tracks, engagement_by_track)
    ranked = sorted(artist_scores.items(), key=lambda pair: pair[1], reverse=True)
    return [artist for artist, _ in ranked[:limit]]
