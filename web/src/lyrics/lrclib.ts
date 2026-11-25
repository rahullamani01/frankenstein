/**
 * Direct, keyless LRCLIB client for the lyrics sheet.
 *
 * Results are cached in memory and localStorage by recording metadata, so a
 * song is only requested once. Concurrent lookups share a single request, and
 * a caller can abort its own await without cancelling the shared request (the
 * finished result is still cached for the next track change or reopen).
 */

import { parseLrc, lyricTrackKey, type LyricLine } from './lrc';

export type LyricsKind = 'synced' | 'plain' | 'instrumental' | 'empty';

export interface LyricsPayload {
  kind: LyricsKind;
  synced: LyricLine[];
  plain: string[];
  providerUrl: string;
  fetchedAt: number;
}

export interface LyricsQuery {
  key: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
}

interface LrclibRecord {
  id?: number;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const BASE = 'https://lrclib.net/api';
const CACHE_PREFIX = 'frankenstein:lyrics:v1:';
const EMPTY_TTL = 24 * 60 * 60 * 1000;
const MEMORY_LIMIT = 80;
const TIMEOUT_MS = 9000;

const memory = new Map<string, LyricsPayload>();
const inflight = new Map<string, Promise<LyricsPayload>>();

function emptyPayload(): LyricsPayload {
  return { kind: 'empty', synced: [], plain: [], providerUrl: '', fetchedAt: Date.now() };
}

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function isKnownAlbum(album?: string): boolean {
  const value = normalize(album);
  return Boolean(value) && value !== 'unknown album' && value !== 'unknown' && value !== 'single';
}

function hasLyrics(record: LrclibRecord | null | undefined): record is LrclibRecord {
  if (!record) return false;
  return record.instrumental === true
    || Boolean(record.syncedLyrics && record.syncedLyrics.trim())
    || Boolean(record.plainLyrics && record.plainLyrics.trim());
}

function recordToPayload(record: LrclibRecord): LyricsPayload {
  const providerUrl = typeof record.id === 'number' && record.id > 0
    ? `${BASE}/get/${record.id}`
    : 'https://lrclib.net';

  if (record.instrumental === true) {
    return { kind: 'instrumental', synced: [], plain: [], providerUrl, fetchedAt: Date.now() };
  }

  const synced = parseLrc(record.syncedLyrics || '');
  if (synced.length) {
    return { kind: 'synced', synced, plain: [], providerUrl, fetchedAt: Date.now() };
  }

  const plain = String(record.plainLyrics || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (plain.length) {
    return { kind: 'plain', synced: [], plain, providerUrl, fetchedAt: Date.now() };
  }

  return emptyPayload();
}

function sameRecording(record: LrclibRecord, query: LyricsQuery, tolerance = 3): boolean {
  const wantedTitle = normalize(query.title);
  const wantedArtist = normalize(query.artist);
  if (!wantedTitle || !wantedArtist) return false;
  if (normalize(record.trackName) !== wantedTitle) return false;
  if (normalize(record.artistName) !== wantedArtist) return false;
  const target = Number(query.duration);
  const candidate = Number(record.duration);
  if (target > 0 && Number.isFinite(candidate) && candidate > 0) {
    return Math.abs(candidate - target) <= tolerance;
  }
  return true;
}

function looseRecording(record: LrclibRecord, query: LyricsQuery): boolean {
  const wantedTitle = normalize(query.title);
  const wantedArtist = normalize(query.artist);
  if (!wantedTitle || !wantedArtist) return false;
  const title = normalize(record.trackName);
  const artist = normalize(record.artistName);
  const titleMatches = title === wantedTitle
    || title.startsWith(`${wantedTitle} `)
    || wantedTitle.startsWith(`${title} `)
    || title.includes(wantedTitle)
    || wantedTitle.includes(title);
  const artistMatches = artist === wantedArtist
    || artist.startsWith(`${wantedArtist} `)
    || wantedArtist.startsWith(`${artist} `)
    || artist.includes(wantedArtist);
  return titleMatches && artistMatches;
}

function readStorage(key: string): LyricsPayload | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v?: number; at?: number; payload?: LyricsPayload };
    if (parsed?.v !== 1 || !parsed.payload) return null;
    const payload = parsed.payload;
    if (!payload || !Array.isArray(payload.synced) || !Array.isArray(payload.plain)) return null;
    if (payload.kind === 'empty' && Date.now() - Number(parsed.at || 0) > EMPTY_TTL) return null;
    return payload;
  } catch {
    return null;
  }
}

function writeStorage(key: string, payload: LyricsPayload): void {
  try {
    if (typeof window === 'undefined') return;
    const raw = JSON.stringify({ v: 1, at: Date.now(), payload });
    if (raw.length > 400_000) return;
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, raw);
  } catch {
    // Private mode or full storage: memory cache still prevents repeat fetches.
  }
}

function remember(key: string, payload: LyricsPayload): LyricsPayload {
  memory.set(key, payload);
  while (memory.size > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
  writeStorage(key, payload);
  return payload;
}

/** Synchronous cache peek so a known song never flashes a skeleton. */
export function peekLyrics(query: LyricsQuery): LyricsPayload | null {
  const key = query.key || lyricTrackKey(query);
  const cached = memory.get(key) || readStorage(key);
  if (cached) {
    memory.delete(key);
    memory.set(key, cached);
  }
  return cached;
}

function abortError(): Error {
  const error = new Error('Lyrics request aborted');
  error.name = 'AbortError';
  return error;
}

function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(abortError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Lyrics provider responded with ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

function paramsFor(query: LyricsQuery): URLSearchParams {
  const params = new URLSearchParams({
    track_name: query.title.trim(),
    artist_name: query.artist.trim(),
  });
  if (isKnownAlbum(query.album)) params.set('album_name', String(query.album).trim());
  const duration = Math.round(Number(query.duration) || 0);
  if (duration >= 1 && duration <= 3600) params.set('duration', String(duration));
  return params;
}

function pickSearchResult(records: LrclibRecord[], query: LyricsQuery): LrclibRecord | null {
  const usable = records.filter((record) => hasLyrics(record) && looseRecording(record, query));
  if (!usable.length) return null;

  const target = Number(query.duration) || 0;
  let pool = usable;
  if (target > 0) {
    const within = usable.filter((record) => {
      const duration = Number(record.duration);
      return Number.isFinite(duration) && duration > 0 && Math.abs(duration - target) <= 2;
    });
    if (!within.length) return null;
    pool = within;
  }

  const sorted = [...pool].sort((a, b) => {
    const synced = Number(Boolean(b.syncedLyrics?.trim())) - Number(Boolean(a.syncedLyrics?.trim()));
    if (synced !== 0) return synced;
    const album = Number(
      isKnownAlbum(query.album) && normalize(b.albumName) === normalize(query.album)
    ) - Number(
      isKnownAlbum(query.album) && normalize(a.albumName) === normalize(query.album)
    );
    if (album !== 0) return album;
    const distanceA = target > 0 ? Math.abs((Number(a.duration) || 0) - target) : 0;
    const distanceB = target > 0 ? Math.abs((Number(b.duration) || 0) - target) : 0;
    return distanceA - distanceB;
  });

  return sorted[0] || null;
}

async function lookup(query: LyricsQuery, signal?: AbortSignal): Promise<LyricsPayload> {
  if (!query.title?.trim() || !query.artist?.trim()) return emptyPayload();

  const exact = await fetchJson<LrclibRecord>(
    `${BASE}/get?${paramsFor(query).toString()}`,
    signal
  );

  if (hasLyrics(exact) && sameRecording(exact, query)) {
    return recordToPayload(exact);
  }

  const searchParams = new URLSearchParams({
    q: `${query.artist.trim()} ${query.title.trim()}`,
  });
  const results = await fetchJson<LrclibRecord[]>(
    `${BASE}/search?${searchParams.toString()}`,
    signal
  );

  const picked = Array.isArray(results) ? pickSearchResult(results, query) : null;
  return picked ? recordToPayload(picked) : emptyPayload();
}

export interface FetchLyricsOptions {
  signal?: AbortSignal;
  /** Retry bypasses both caches. */
  force?: boolean;
}

export async function fetchLyrics(
  query: LyricsQuery,
  options: FetchLyricsOptions = {}
): Promise<LyricsPayload> {
  const key = query.key || lyricTrackKey(query);

  if (!options.force) {
    const cached = peekLyrics(query);
    if (cached) return cached;
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = lookup(query)
      .then((payload) => remember(key, payload))
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }

  return raceAbort(pending, options.signal);
}
