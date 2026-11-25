import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Track } from '../data/musicData';
import { lyricTrackKey, type LyricLine } from '../lyrics/lrc';
import {
  fetchLyrics,
  peekLyrics,
  type LyricsKind,
  type LyricsPayload,
  type LyricsQuery,
} from '../lyrics/lrclib';

interface LyricsState {
  key: string;
  data: LyricsPayload | null;
  loading: boolean;
  error: boolean;
}

export interface UseLyricsResult {
  data: LyricsPayload | null;
  kind: LyricsKind | null;
  lines: LyricLine[];
  plain: string[];
  loading: boolean;
  error: boolean;
  retry: () => void;
}

const NO_LINES: LyricLine[] = [];
const NO_TEXT: string[] = [];

function initialState(query: LyricsQuery): LyricsState {
  const cached = peekLyrics(query);
  return {
    key: query.key,
    data: cached,
    loading: !cached,
    error: false,
  };
}

/**
 * Loads LRCLIB lyrics for a track. Stale responses are ignored via a
 * per-request AbortController, while the underlying shared request may finish
 * and warm the cache for the next time the song is opened.
 */
export function useLyrics(track: Track): UseLyricsResult {
  const key = lyricTrackKey(track);
  const query = useMemo<LyricsQuery>(() => ({
    key,
    title: track.title || '',
    artist: track.primaryArtist || track.artist || '',
    album: track.album || '',
    duration: track.durationSec || 0,
  }), [key, track.title, track.primaryArtist, track.artist, track.album, track.durationSec]);

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<LyricsState>(() => initialState(query));

  useEffect(() => {
    const force = attempt > 0;
    let cancelled = false;
    const controller = new AbortController();

    if (!force) {
      const cached = peekLyrics(query);
      if (cached) {
        setState({ key: query.key, data: cached, loading: false, error: false });
        return () => {
          cancelled = true;
          controller.abort();
        };
      }
    }

    setState({ key: query.key, data: null, loading: true, error: false });
    fetchLyrics(query, { signal: controller.signal, force })
      .then((data) => {
        if (cancelled) return;
        setState({ key: query.key, data, loading: false, error: false });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setState({ key: query.key, data: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const current = state.key === key ? state : null;
  const data = current?.data ?? null;

  return {
    data,
    kind: data?.kind ?? null,
    lines: data?.synced ?? NO_LINES,
    plain: data?.plain ?? NO_TEXT,
    loading: current ? current.loading : true,
    error: current ? current.error : false,
    retry,
  };
}
