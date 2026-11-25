import type { Track } from '../data/musicData';
import { api } from '../api/client';
import { spotify } from '../services/spotify';

// Set VITE_LASTFM_API_KEY in web/.env.local to enable Last.fm discovery.
// Without a key, same-artist and library recommendations still work.
const LASTFM_API_KEY = import.meta.env?.VITE_LASTFM_API_KEY || '';
const CACHE_PREFIX = 'frankenstein:similar:v1:';
const TTL = 24 * 60 * 60 * 1000;
const memory = new Map<string, Track[]>();
const pending = new Map<string, Promise<Track[]>>();
const emptyUntil = new Map<string, number>();

async function prepareArtwork(tracks: Track[]): Promise<void> {
  await Promise.all(tracks.map(async (track) => {
    if (!track.coverUrl || typeof Image === 'undefined') return;
    const image = new Image();
    image.src = track.coverUrl;
    try {
      await Promise.race([
        image.decode(),
        new Promise<void>((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch { /* the card fades in its placeholder if artwork is unavailable */ }
  }));
}

export function trackIdentity(track: Track): string {
  return `${track.source}:${track.id}`;
}

export function recommendationKey(track: Track): string {
  return `${track.source}|${track.artist.toLowerCase().trim()}|${track.title.toLowerCase().trim()}`;
}

export function readRecommendations(track: Track): Track[] | null {
  const key = recommendationKey(track);
  if (memory.has(key)) {
    const found = memory.get(key);
    if (found?.length) return found;
  }
  try {
    const item = JSON.parse(localStorage.getItem(CACHE_PREFIX + key) || 'null') as {
      at: number; tracks: Track[];
    } | null;
    if (item && Date.now() - item.at < TTL && Array.isArray(item.tracks) && item.tracks.length) {
      memory.set(key, item.tracks);
      return item.tracks;
    }
  } catch { /* storage may be disabled */ }
  return null;
}

type Candidate = { artist: string; title: string };

async function lastFm(method: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  if (!LASTFM_API_KEY) return {};
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  Object.entries({ method, api_key: LASTFM_API_KEY, format: 'json', limit: '30', ...params })
    .forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error('Last.fm unavailable');
  return response.json() as Promise<Record<string, unknown>>;
}

function entries(data: Record<string, unknown>, group: string, field: string): Record<string, unknown>[] {
  const block = data[group] as Record<string, unknown> | undefined;
  const list = block?.[field];
  return Array.isArray(list) ? list as Record<string, unknown>[] : [];
}

async function candidates(track: Track): Promise<Candidate[]> {
  if (!LASTFM_API_KEY) return [];
  let results: Candidate[] = [];
  try {
    const data = await lastFm('track.getSimilar', { artist: track.artist, track: track.title });
    results = entries(data, 'similartracks', 'track').map((item) => ({
      title: String(item.name || ''),
      artist: String((item.artist as Record<string, unknown> | undefined)?.name || ''),
    }));
  } catch { /* use artist fallback */ }
  if (results.length < 8) {
    try {
      const data = await lastFm('artist.getSimilar', { artist: track.artist });
      const similarArtists = entries(data, 'similarartists', 'artist').slice(0, 6);
      const topByArtist = await Promise.all(similarArtists.map(async (item) => {
        const artist = String(item.name || '');
        if (!artist) return [];
        const top = await lastFm('artist.getTopTracks', { artist }).catch(() => ({}));
        return entries(top, 'toptracks', 'track').slice(0, 3).map((song) => ({
          artist, title: String(song.name || ''),
        }));
      }));
      results.push(...topByArtist.flat());
    } catch { /* library fallback remains available */ }
  }
  return results.filter(({ artist, title }) => artist && title);
}

async function resolve(candidate: Candidate, source: Track['source'], library: Track[]): Promise<Track | null> {
  const normalize = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const title = normalize(candidate.title);
  const artist = normalize(candidate.artist);
  const matches = (t: Track) => normalize(t.title) === title && normalize(t.artist).includes(artist);
  const known = library.find((t) => t.source === source && matches(t));
  if (known) return known;
  const query = `${candidate.artist} ${candidate.title}`;
  try {
    if (source === 'Spotify' && spotify.getSnapshot().connected) {
      return (await spotify.search(query)).tracks.find(matches) ?? null;
    }
    if (source === 'Local') {
      const results = await api.tracks(candidate.title);
      const found = results.find((t) => t.source === 'Local' && matches(t as Track));
      return found ? { ...found, coverUrl: found.coverUrl || '' } : null;
    }
    if (source === 'Apple Music') {
      const results = await api.appleSearch(query);
      const found = results.find((t) => normalize(t.name) === title && normalize(t.artist).includes(artist));
      return found ? {
        id: `apple-similar:${normalize(found.artist)}:${normalize(found.name)}`,
        title: found.name, artist: found.artist, album: found.album,
        albumId: `apple:${found.album}`, year: 0, duration: '0:00',
        durationSec: 0, source, coverUrl: '', trackNumber: 0,
      } : null;
    }
  } catch { /* search unavailable */ }
  return null;
}

async function artistTracks(track: Track): Promise<Track[]> {
  try {
    if (track.source === 'Spotify' && spotify.getSnapshot().connected) {
      const first = await spotify.search(track.artist, 0);
      const second = first.hasMore ? await spotify.search(track.artist, 10) : { tracks: [] };
      return [...first.tracks, ...second.tracks].filter((item) =>
        item.artist.toLowerCase().includes(track.artist.toLowerCase())
      );
    }
    if (track.source === 'Apple Music') {
      const results = await api.appleSearch(track.artist);
      return results.filter((item) => item.artist.toLowerCase().includes(track.artist.toLowerCase()))
        .map((item) => ({
          id: `apple-similar:${item.artist.toLowerCase()}:${item.name.toLowerCase()}`,
          title: item.name, artist: item.artist, album: item.album,
          albumId: `apple:${item.album}`, year: 0, duration: '0:00',
          durationSec: 0, source: 'Apple Music', coverUrl: '', trackNumber: 0,
        }));
    }
  } catch { /* source search unavailable */ }
  return [];
}

export async function getRecommendations(track: Track, library: Track[], history: Track[]): Promise<Track[]> {
  const key = recommendationKey(track);
  const cached = readRecommendations(track);
  if (cached) return filterRecommendations(cached, track, history);
  if ((emptyUntil.get(key) ?? 0) > Date.now()) return [];
  if (!pending.has(key)) {
    const task = (async () => {
      const recent = new Set(history.slice(0, 20).map(trackIdentity));
      recent.add(trackIdentity(track));
      const results: Track[] = [];
      const seen = new Set<string>();
      const seenTitles = new Set<string>();
      const add = (item: Track | null) => {
        if (!item || !item.id || seen.has(trackIdentity(item)) || recent.has(trackIdentity(item))) return;
        const titleKey = `${item.source}:${item.artist.toLowerCase().trim()}:${item.title.toLowerCase().trim()}`;
        if (seenTitles.has(titleKey)) return;
        seen.add(trackIdentity(item));
        seenTitles.add(titleKey);
        results.push(item);
      };
      const suggestions = await candidates(track);
      // Limit concurrent source searches so Spotify's API stays within its rate limits.
      for (let i = 0; i < suggestions.length && results.length < 12; i += 4) {
        const resolved = await Promise.all(suggestions.slice(i, i + 4).map((item) => resolve(item, track.source, library)));
        resolved.forEach(add);
      }
      const sameArtist = library.filter((item) =>
        item.source === track.source && item.artist.toLowerCase() === track.artist.toLowerCase()
      );
      sameArtist.forEach(add);
      if (results.length < 8) (await artistTracks(track)).forEach(add);
      library.filter((item) => item.source === track.source).forEach(add);
      // When the current source has fewer playable songs, local files are a safe fallback.
      library.filter((item) => item.source === 'Local').forEach(add);
      const picked = results.slice(0, 12);
      await prepareArtwork(picked);
      if (picked.length) {
        memory.set(key, picked);
        try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), tracks: picked })); } catch { /* optional */ }
      } else {
        emptyUntil.set(key, Date.now() + 60_000);
      }
      return picked;
    })().finally(() => pending.delete(key));
    pending.set(key, task);
  }
  return filterRecommendations(await pending.get(key)!, track, history);
}

export function filterRecommendations(list: Track[], track: Track, history: Track[]): Track[] {
  const excluded = new Set(history.slice(0, 20).map(trackIdentity));
  excluded.add(trackIdentity(track));
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = trackIdentity(item);
    if (!item.id || excluded.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}
