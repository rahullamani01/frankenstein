/**
 * Thin client for the local Frankenstein FastAPI backend.
 * Uses the same-origin Vite proxy unless an API base is configured.
 */

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: init?.signal || AbortSignal.timeout(15000),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${path}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ApiTrack = {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  year: number;
  duration: string;
  durationSec: number;
  source: "Local" | "Apple Music" | "Spotify";
  coverUrl: string;
  trackNumber: number;
  isFavorite?: boolean;
  streamUrl?: string;
  path?: string;
};

export type ApiAlbum = {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  trackCount: number;
  source: "Local" | "Apple Music" | "Spotify";
};

export type ApiArtist = {
  id: string;
  name: string;
  albumCount: number;
  trackCount: number;
};

export type NowPlaying = {
  name: string;
  artist: string;
  album: string;
  duration_seconds: number;
  position_seconds: number;
  state: string;
  id?: string;
};

export type LyricsResult = {
  synced: [number, string][] | null;
  plain: string | null;
  instrumental?: boolean;
  provider?: string;
  providerUrl?: string;
};

function absolutizeCover(track: ApiTrack): ApiTrack {
  if (track.coverUrl && track.coverUrl.startsWith("/")) {
    return { ...track, coverUrl: `${API_BASE}${track.coverUrl}` };
  }
  return track;
}

function absolutizeAlbum(album: ApiAlbum): ApiAlbum {
  if (album.coverUrl && album.coverUrl.startsWith("/")) {
    return { ...album, coverUrl: `${API_BASE}${album.coverUrl}` };
  }
  return album;
}

export const api = {
  base: API_BASE,

  status: () =>
    request<{
      ok: boolean;
      apple_music: boolean;
      spotify: boolean;
      tracks: number;
    }>("/api/status"),

  tracks: (q?: string) =>
    request<ApiTrack[]>(
      q ? `/api/tracks?q=${encodeURIComponent(q)}` : "/api/tracks"
    ).then((list) => list.map(absolutizeCover)),

  albums: () =>
    request<ApiAlbum[]>("/api/albums").then((list) =>
      list.map(absolutizeAlbum)
    ),

  artists: () => request<ApiArtist[]>("/api/artists"),

  toggleFavorite: (id: string) =>
    request<{ id: number; isFavorite: boolean }>(
      `/api/tracks/${id}/favorite`,
      { method: "POST" }
    ),

  scanFolder: (folder: string) =>
    request<{ scanned: number; added_or_updated: number }>(
      "/api/library/scan",
      { method: "POST", body: JSON.stringify({ folder }) }
    ),

  streamUrl: (trackId: string) => `${API_BASE}/api/stream/${trackId}`,
  lyrics: (trackId: string, signal?: AbortSignal) =>
    request<LyricsResult>(
      `/api/tracks/${encodeURIComponent(trackId)}/lyrics`, { signal }
    ),
  catalogLyrics: (track: { title: string; artist: string; primaryArtist?: string; album: string; durationSec: number }, signal?: AbortSignal) =>
    request<LyricsResult>(`/api/lyrics?${new URLSearchParams({
      title: track.title, artist: track.primaryArtist || track.artist,
      album: track.album, duration: String(track.durationSec || 0),
    })}`, { signal }),

  // Spotify
  spotifyStatus: () =>
    request<{ available: boolean; nowPlaying: NowPlaying | null }>(
      "/api/spotify/status"
    ),
  spotifyPlayPause: () =>
    request("/api/spotify/playpause", { method: "POST" }),
  spotifyNext: () => request("/api/spotify/next", { method: "POST" }),
  spotifyPrevious: () =>
    request("/api/spotify/previous", { method: "POST" }),
  spotifyVolume: (percent: number) =>
    request("/api/spotify/volume", {
      method: "POST",
      body: JSON.stringify({ percent }),
    }),
  spotifyPosition: (seconds: number) =>
    request("/api/spotify/position", {
      method: "POST",
      body: JSON.stringify({ seconds }),
    }),
  spotifyPlayUri: (uri: string) =>
    request("/api/spotify/play-uri", {
      method: "POST",
      body: JSON.stringify({ uri }),
    }),
  spotifyLaunch: () =>
    request("/api/spotify/launch", { method: "POST" }),

  // Apple Music
  appleStatus: () =>
    request<{ available: boolean; nowPlaying: NowPlaying | null }>(
      "/api/apple/status"
    ),
  applePlayPause: () =>
    request("/api/apple/playpause", { method: "POST" }),
  appleNext: () => request("/api/apple/next", { method: "POST" }),
  applePrevious: () =>
    request("/api/apple/previous", { method: "POST" }),
  appleVolume: (percent: number) =>
    request("/api/apple/volume", {
      method: "POST",
      body: JSON.stringify({ percent }),
    }),
  appleSearch: (q: string) =>
    request<{ name: string; artist: string; album: string }[]>(
      `/api/apple/search?q=${encodeURIComponent(q)}`
    ),
  applePlayTrack: (name: string, artist = "") =>
    request("/api/apple/play-track", {
      method: "POST",
      body: JSON.stringify({ name, artist }),
    }),
};
