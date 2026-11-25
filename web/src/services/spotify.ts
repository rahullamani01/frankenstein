import type { Track } from '../data/musicData';

// Client IDs are public. No client secret or Soloist API key is used.
const CLIENT_ID = import.meta.env?.VITE_SPOTIFY_CLIENT_ID || 'a28ac10b634342e98d4597133358d0f5';
export const SPOTIFY_REDIRECT = import.meta.env?.VITE_SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/callback';
const TOKEN_KEY = 'frankenstein:spotify-session';
const FLOW_KEY = 'frankenstein:spotify-pkce';
const SCOPES = [
  'streaming', 'user-read-email', 'user-read-private',
  'user-read-playback-state', 'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface SpotifyTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string }[];
  album: { id: string; name: string; release_date?: string; images: { url: string }[] };
  duration_ms: number;
  track_number: number;
  external_urls?: { spotify?: string };
}

export function mapSpotifyTrack(track: SpotifyTrack): Track {
  const seconds = Math.floor(track.duration_ms / 1000);
  return {
    id: `spotify:${track.id}`,
    spotifyUri: track.uri,
    externalUrl: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(', '),
    primaryArtist: track.artists[0]?.name || '',
    album: track.album.name,
    albumId: `spotify:${track.album.id}`,
    year: Number(track.album.release_date?.slice(0, 4)) || 0,
    durationSec: seconds,
    duration: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    source: 'Spotify',
    coverUrl: track.album.images[0]?.url || '',
    trackNumber: track.track_number,
  };
}

export interface SpotifySnapshot {
  connected: boolean;
  busy: boolean;
  error: string | null;
  output: 'browser' | 'spotify';
  playerReady: boolean;
}

interface SDKState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: { current_track: {
    id: string; uri: string; name: string;
    artists: { name: string }[];
    album: { uri: string; name: string; images: { url: string }[] };
  } };
}

interface SDKPlayer {
  addListener(event: string, callback: (event: any) => void): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
  activateElement(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(position: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  getCurrentState(): Promise<SDKState | null>;
}

declare global {
  interface Window {
    Spotify?: { Player: new (options: {
      name: string;
      getOAuthToken: (callback: (token: string) => void) => void;
      volume: number;
    }) => SDKPlayer };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export class SpotifyError extends Error {
  constructor(message: string, public status = 0) {
    super(message);
    this.name = 'SpotifyError';
  }
}

function readTokens(): Tokens | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || 'null');
    return value?.access_token && value?.refresh_token && Number.isFinite(value.expires_at) ? value : null;
  } catch { return null; }
}

let tokens = readTokens();
let snapshot: SpotifySnapshot = {
  connected: !!tokens, busy: false, error: null, output: 'browser', playerReady: false,
};
const subscribers = new Set<() => void>();
function update(changes: Partial<SpotifySnapshot>) {
  snapshot = { ...snapshot, ...changes };
  subscribers.forEach((listener) => listener());
}
let refreshPromise: Promise<string> | null = null;
let initializePromise: Promise<boolean> | null = null;
let sdkPromise: Promise<string> | null = null;
let sdkPlayer: SDKPlayer | null = null;
let deviceId: string | null = null;
let generation = 0;
let cooldownUntil = 0;
let lastVolume = 0.75;

function randomString() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) => n.toString(16).padStart(2, '0')).join('');
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function disconnect() {
  generation++;
  tokens = null;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(FLOW_KEY);
  sdkPlayer?.disconnect();
  sdkPlayer = null;
  sdkPromise = null;
  deviceId = null;
  update({ connected: false, playerReady: false, busy: false, error: null });
}

async function exchange(body: Record<string, string>, previousRefresh?: string): Promise<string> {
  const expectedGeneration = generation;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, ...body }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let result: { access_token?: string; refresh_token?: string; expires_in?: number; error?: string } = {};
  try { result = text ? JSON.parse(text) : {}; } catch { /* non-JSON error page */ }
  if (!response.ok || !result.access_token) {
    if (response.status === 400 || response.status === 401) disconnect();
    throw new SpotifyError(
      result.error === 'invalid_client'
        ? 'Spotify rejected this Client ID. Copy the Client ID from the Frankenstein app’s Settings, not a Soloist API key.'
        : response.ok
          ? 'Spotify returned an unexpected sign-in response. Please connect again.'
          : 'Spotify sign-in expired or was rejected. Please connect again.',
      response.status,
    );
  }
  if (expectedGeneration !== generation) throw new SpotifyError('Spotify was disconnected.');
  const nextTokens: Tokens = {
    access_token: result.access_token,
    refresh_token: result.refresh_token || previousRefresh || '',
    expires_at: Date.now() + Number(result.expires_in || 3600) * 1000,
  };
  if (!nextTokens.refresh_token) throw new SpotifyError('Spotify did not return a refresh token. Connect again.');
  tokens = nextTokens;
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(nextTokens));
  update({ connected: true, error: null });
  return nextTokens.access_token;
}

async function accessToken(force = false): Promise<string> {
  if (!tokens) throw new SpotifyError('Connect Spotify to search and play its catalogue.', 401);
  if (!force && tokens.expires_at > Date.now() + 60000) return tokens.access_token;
  if (!refreshPromise) {
    refreshPromise = exchange({
      grant_type: 'refresh_token', refresh_token: tokens.refresh_token,
    }, tokens.refresh_token).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  if (Date.now() < cooldownUntil) {
    throw new SpotifyError('Spotify is rate-limiting requests. Please try again in a moment.', 429);
  }
  const token = await accessToken();
  const response = await fetch(`https://api.spotify.com/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers, Authorization: `Bearer ${token}` },
    signal: init.signal || AbortSignal.timeout(15000),
  });
  if (response.status === 401 && retry) {
    await accessToken(true);
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    if (response.status === 429) {
      cooldownUntil = Date.now() + (Number(response.headers.get('Retry-After')) || 30) * 1000;
    }
    throw new SpotifyError(
      response.status === 403
        ? 'Spotify denied access. Check that this account has Premium and is allowed in your developer app’s User Management.'
        : response.status === 404
          ? 'No Spotify player is available. Open Spotify on this Mac, play a song there once, then try again.'
          : response.status === 429
            ? 'Spotify is rate-limiting requests. Please try again shortly.'
            : `Spotify request failed (${response.status}). Please try again.`,
      response.status,
    );
  }
  if (response.status === 204 || response.headers.get('Content-Length') === '0') return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new SpotifyError('Spotify returned an unexpected response. Please try again.', response.status);
  }
}

async function connect() {
  update({ busy: true, error: null });
  try {
    const redirect = new URL(SPOTIFY_REDIRECT);
    if (window.location.origin !== redirect.origin) {
      // PKCE state and verifier must live on the exact same origin as the callback.
      window.location.assign(`${redirect.origin}/?spotify=connect`);
      return;
    }
    const verifier = randomString();
    const state = randomString();
    const challenge = await pkceChallenge(verifier);
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({ verifier, state, created: Date.now() }));
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: SPOTIFY_REDIRECT,
      scope: SCOPES,
      state,
      code_challenge_method: 'S256',
      code_challenge: challenge,
    });
    window.location.assign(`https://accounts.spotify.com/authorize?${params}`);
  } catch {
    update({ busy: false, error: 'Could not start Spotify sign-in. Allow session storage and use the local app URL.' });
  }
}

async function initialize() {
  if (initializePromise) return initializePromise;
  initializePromise = (async () => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('spotify') === 'connect') {
      history.replaceState({}, '', '/');
      await connect();
      return true;
    }
    if (url.pathname !== new URL(SPOTIFY_REDIRECT).pathname) return false;
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const denied = url.searchParams.get('error');
    // Remove authorization codes from history immediately.
    history.replaceState({}, '', '/');
    update({ busy: true });
    try {
      const flow = JSON.parse(sessionStorage.getItem(FLOW_KEY) || 'null');
      sessionStorage.removeItem(FLOW_KEY);
      if (!flow || !state || state !== flow.state || Date.now() - flow.created > 600000) {
        throw new SpotifyError('Spotify sign-in could not be verified. Please start Connect Spotify again.');
      }
      if (denied || !code) throw new SpotifyError('Spotify sign-in was cancelled. You can connect again whenever you like.');
      await exchange({
        grant_type: 'authorization_code', code, redirect_uri: SPOTIFY_REDIRECT, code_verifier: flow.verifier,
      });
    } catch (error) {
      update({ error: error instanceof Error ? error.message : 'Spotify sign-in failed.' });
    } finally {
      update({ busy: false });
    }
    return true;
  })();
  return initializePromise;
}

function preparePlayer(): Promise<string> {
  if (deviceId) return Promise.resolve(deviceId);
  if (sdkPromise) return sdkPromise;
  const expectedGeneration = generation;
  update({ busy: true, error: null });
  sdkPromise = new Promise<string>((resolve, reject) => {
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      sdkPlayer?.disconnect();
      sdkPlayer = null;
      sdkPromise = null;
      deviceId = null;
      update({ busy: false, playerReady: false, error: message });
      reject(new SpotifyError(message));
    };
    const timeout = window.setTimeout(() => fail(
      'The browser player could not connect. Allow protected content, or choose Spotify app below.',
    ), 20000);
    const start = () => {
      if (finished) return;
      if (expectedGeneration !== generation || !tokens) {
        fail('Connect Spotify again to enable the player.');
        return;
      }
      sdkPlayer = new window.Spotify!.Player({
        name: 'Frankenstein Pixel Gallery',
        volume: lastVolume,
        getOAuthToken: (callback) => {
          void accessToken().then(callback).catch(() => fail('Spotify authorization expired. Please reconnect.'));
        },
      });
      sdkPlayer.addListener('ready', ({ device_id }: { device_id: string }) => {
        if (finished) return;
        if (generation !== expectedGeneration || !tokens) {
          finished = true;
          clearTimeout(timeout);
          reject(new SpotifyError('Spotify was disconnected.'));
          return;
        }
        finished = true;
        clearTimeout(timeout);
        deviceId = device_id;
        update({ playerReady: true, busy: false, error: null });
        resolve(device_id);
      });
      sdkPlayer.addListener('not_ready', () => {
        deviceId = null;
        sdkPromise = null;
        update({ playerReady: false });
      });
      ['initialization_error', 'authentication_error', 'account_error'].forEach((event) => {
        sdkPlayer!.addListener(event, () => fail(
          event === 'account_error'
            ? 'The browser player requires Spotify Premium on the account you signed in with.'
            : 'The browser player is unavailable. Allow protected content or choose Spotify app.',
        ));
      });
      sdkPlayer.addListener('playback_error', () => update({
        error: 'Spotify could not play this song. Try another song or use Spotify app output.',
      }));
      sdkPlayer.addListener('autoplay_failed', () => update({
        error: 'Your browser blocked audio. Press Play again to allow playback.',
      }));
      void sdkPlayer.connect().then((ok) => {
        if (!ok) fail('Could not connect the Spotify player. Try Spotify app output.');
      }).catch(() => fail('Could not connect the Spotify player. Try Spotify app output.'));
    };
    if (window.Spotify) start();
    else {
      window.onSpotifyWebPlaybackSDKReady = start;
      document.getElementById('spotify-sdk')?.remove();
      const script = document.createElement('script');
      script.id = 'spotify-sdk';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      script.onerror = () => fail('Could not load Spotify’s player. Check your connection or use Spotify app output.');
      document.head.append(script);
    }
  });
  return sdkPromise;
}

async function resolveTrackUri(track: Track): Promise<string> {
  if (track.spotifyUri?.match(/^spotify:track:[A-Za-z0-9]+$/)) return track.spotifyUri;
  const query = [track.title, track.artist].filter(Boolean).join(' ').trim();
  if (!query) throw new SpotifyError('This song does not have a Spotify track URI.');
  const result = await request<{ tracks: { items: SpotifyTrack[] } }>(
    `/search?${new URLSearchParams({ q: query, type: 'track', limit: '1' })}`,
  );
  const uri = result.tracks.items.find(Boolean)?.uri;
  if (!uri) throw new SpotifyError(`“${track.title}” could not be found on Spotify.`);
  return uri;
}

async function play(track: Track) {
  if (!snapshot.connected) {
    throw new SpotifyError('Connect Spotify to play this song.', 401);
  }
  if (snapshot.output === 'browser') {
    // Invoke during the click gesture, before awaiting any network calls.
    await sdkPlayer?.activateElement();
  }
  const uri = await resolveTrackUri(track);
  if (snapshot.output === 'browser') {
    const id = await preparePlayer();
    await request(`/me/player/play?device_id=${encodeURIComponent(id)}`, {
      method: 'PUT', body: JSON.stringify({ uris: [uri] }),
    });
  } else {
    const result = await request<{ devices: { id: string; is_active: boolean; is_restricted: boolean; name: string }[] }>('/me/player/devices');
    const devices = result.devices.filter((device) => device.id !== deviceId && !device.is_restricted);
    const target = devices.find((device) => device.is_active) || devices[0];
    if (!target) throw new SpotifyError('Open Spotify on this Mac and play any song once, then click this result again.');
    await request(`/me/player/play?device_id=${encodeURIComponent(target.id)}`, {
      method: 'PUT', body: JSON.stringify({ uris: [uri] }),
    });
  }
  update({ error: null });
}

function playerQuery() {
  return snapshot.output === 'browser' && deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : '';
}

export const spotify = {
  subscribe(listener: () => void) { subscribers.add(listener); return () => { subscribers.delete(listener); }; },
  getSnapshot: () => snapshot,
  initialize,
  connect,
  disconnect,
  preparePlayer,
  setOutput(output: SpotifySnapshot['output']) {
    if (output !== snapshot.output && sdkPlayer) void sdkPlayer.pause().catch(() => {});
    update({ output, error: null });
  },
  async search(query: string, offset = 0, signal?: AbortSignal) {
    const params = new URLSearchParams({ q: query, type: 'track', limit: '10', offset: String(offset) });
    const result = await request<{ tracks: { items: SpotifyTrack[]; next: string | null } }>(`/search?${params}`, { signal });
    return { tracks: result.tracks.items.filter(Boolean).map(mapSpotifyTrack), hasMore: !!result.tracks.next };
  },
  play,
  async pause() {
    if (snapshot.output === 'browser' && sdkPlayer) await sdkPlayer.pause();
    else await request(`/me/player/pause${playerQuery()}`, { method: 'PUT' });
  },
  async resume() {
    if (snapshot.output === 'browser' && sdkPlayer) {
      await sdkPlayer.activateElement();
      await sdkPlayer.resume();
    } else if (snapshot.output === 'browser') {
      throw new SpotifyError('The browser player is not ready. Select a song from Spotify search to start it again.');
    } else await request(`/me/player/play${playerQuery()}`, { method: 'PUT' });
  },
  next: () => request(`/me/player/next${playerQuery()}`, { method: 'POST' }),
  previous: () => request(`/me/player/previous${playerQuery()}`, { method: 'POST' }),
  async seek(seconds: number) {
    const position = Math.max(0, Math.round(seconds * 1000));
    if (snapshot.output === 'browser' && sdkPlayer) await sdkPlayer.seek(position);
    else await request(`/me/player/seek?position_ms=${position}`, { method: 'PUT' });
  },
  async volume(volume: number) {
    lastVolume = Math.max(0, Math.min(1, volume));
    if (snapshot.output === 'browser' && sdkPlayer) await sdkPlayer.setVolume(lastVolume);
    else await request(`/me/player/volume?volume_percent=${Math.round(lastVolume * 100)}`, { method: 'PUT' });
  },
  async playback(): Promise<{ track: Track; isPlaying: boolean; position: number } | null> {
    if (snapshot.output === 'browser') {
      const state = await sdkPlayer?.getCurrentState();
      if (!state?.track_window.current_track.id) return null;
      const item = state.track_window.current_track;
      return {
        track: mapSpotifyTrack({
          ...item,
          album: { ...item.album, id: item.album.uri?.split(':').pop() || item.id },
          duration_ms: state.duration,
          track_number: 0,
        }),
        isPlaying: !state.paused,
        position: state.position / 1000,
      };
    }
    const state = await request<{ item: SpotifyTrack | null; is_playing: boolean; progress_ms: number; currently_playing_type: string } | undefined>('/me/player');
    if (!state?.item || state.currently_playing_type !== 'track') return null;
    return { track: mapSpotifyTrack(state.item), isPlaying: state.is_playing, position: state.progress_ms / 1000 };
  },
};
