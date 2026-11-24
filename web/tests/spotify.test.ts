import { test } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

let moduleCount = 0;
const moduleURL = new URL('../src/services/spotify.ts', import.meta.url).href;
async function fresh(options: { connected?: boolean; expires?: number; url?: string } = {}) {
  storage.clear();
  if (options.connected) {
    storage.set('frankenstein:spotify-session', JSON.stringify({
      access_token: 'test-access', refresh_token: 'test-refresh',
      expires_at: options.expires ?? Date.now() + 3600000,
    }));
  }
  const url = new URL(options.url || 'http://127.0.0.1:3001/');
  let assigned = '';
  let replaced = '';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    location: { href: url.href, origin: url.origin, assign: (value: string) => { assigned = value; } },
    setTimeout, clearTimeout,
  } });
  Object.defineProperty(globalThis, 'history', { configurable: true, value: {
    replaceState: (_data: unknown, _title: string, value: string) => { replaced = value; },
  } });
  const service = await import(`${moduleURL}?test=${++moduleCount}`) as typeof import('../src/services/spotify');
  return { ...service, assigned: () => assigned, replaced: () => replaced };
}

const fixture = {
  id: 'track123', uri: 'spotify:track:track123', name: 'A real catalogue song',
  artists: [{ name: 'One Artist' }, { name: 'Another Artist' }],
  album: { id: 'album123', name: 'An album', release_date: '2026-01-02', images: [{ url: 'https://i.scdn.co/image/test' }] },
  duration_ms: 185900, track_number: 2,
  external_urls: { spotify: 'https://open.spotify.com/track/track123' },
};

test('PKCE generates the RFC 7636 SHA-256 challenge', async () => {
  const { pkceChallenge } = await fresh();
  assert.equal(
    await pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
    'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  );
});

test('catalogue metadata maps full-track URIs and duration, without preview URLs', async () => {
  const { mapSpotifyTrack } = await fresh();
  const track = mapSpotifyTrack(fixture);
  assert.equal(track.spotifyUri, 'spotify:track:track123');
  assert.equal(track.duration, '3:05');
  assert.equal(track.artist, 'One Artist, Another Artist');
  assert.equal(track.year, 2026);
  assert.equal(track.source, 'Spotify');
  assert.equal('preview_url' in track, false);
});

test('login uses PKCE, state, the public Client ID and the registered callback', async () => {
  const service = await fresh();
  await service.spotify.connect();
  const url = new URL(service.assigned());
  const flow = JSON.parse(storage.get('frankenstein:spotify-pkce')!);
  assert.equal(url.origin, 'https://accounts.spotify.com');
  assert.equal(url.searchParams.get('redirect_uri'), service.SPOTIFY_REDIRECT);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('state'), flow.state);
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.equal(url.searchParams.get('code_challenge'), await service.pkceChallenge(flow.verifier));
});

test('localhost login first moves to callback origin before storing PKCE state', async () => {
  const service = await fresh({ url: 'http://localhost:3001/' });
  await service.spotify.connect();
  assert.equal(service.assigned(), 'http://127.0.0.1:3001/?spotify=connect');
  assert.equal(storage.has('frankenstein:spotify-pkce'), false);
});

test('callback rejects a mismatched state without exchanging the authorization code', async () => {
  const service = await fresh({ url: 'http://127.0.0.1:3001/callback?code=secret-code&state=wrong' });
  storage.set('frankenstein:spotify-pkce', JSON.stringify({ state: 'expected', verifier: 'verifier', created: Date.now() }));
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('Must not be called'); };
  await service.spotify.initialize();
  assert.equal(calls, 0);
  assert.equal(service.spotify.getSnapshot().connected, false);
  assert.match(service.spotify.getSnapshot().error!, /verified/);
  assert.equal(service.replaced(), '/');
});

test('valid callback exchanges the code once even if initialization runs twice', async () => {
  const service = await fresh({ url: 'http://127.0.0.1:3001/callback?code=test-code&state=expected' });
  storage.set('frankenstein:spotify-pkce', JSON.stringify({ state: 'expected', verifier: 'verifier', created: Date.now() }));
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const body = init!.body as URLSearchParams;
    assert.equal(body.get('grant_type'), 'authorization_code');
    assert.equal(body.get('code_verifier'), 'verifier');
    return Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 3600 });
  };
  await Promise.all([service.spotify.initialize(), service.spotify.initialize()]);
  assert.equal(calls, 1);
  assert.equal(service.spotify.getSnapshot().connected, true);
  assert.equal(service.replaced(), '/');
  assert.equal(storage.has('frankenstein:spotify-pkce'), false);
});

test('search respects the 2026 ten-result limit and offset pagination', async () => {
  const { spotify } = await fresh({ connected: true });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('q'), 'artist & song');
    assert.equal(url.searchParams.get('limit'), '10');
    assert.equal(url.searchParams.get('offset'), '10');
    assert.equal((init!.headers as Record<string, string>).Authorization, 'Bearer test-access');
    return Response.json({ tracks: { items: [fixture], next: 'more' } });
  };
  const result = await spotify.search('artist & song', 10);
  assert.equal(result.tracks[0].title, fixture.name);
  assert.equal(result.hasMore, true);
});

test('expired access tokens refresh once for concurrent searches', async () => {
  const { spotify } = await fresh({ connected: true, expires: Date.now() - 1 });
  let refreshes = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes('/api/token')) {
      refreshes++;
      return Response.json({ access_token: 'refreshed', expires_in: 3600 });
    }
    return Response.json({ tracks: { items: [], next: null } });
  };
  await Promise.all([spotify.search('one'), spotify.search('two')]);
  assert.equal(refreshes, 1);
  assert.equal(JSON.parse(storage.get('frankenstein:spotify-session')!).refresh_token, 'test-refresh');
});

test('API denial is surfaced instead of showing misleading empty results', async () => {
  const { spotify } = await fresh({ connected: true });
  globalThis.fetch = async () => new Response('', { status: 403 });
  await assert.rejects(spotify.search('song'), /Premium.*User Management/);
});

test('rate limiting honors Retry-After and avoids immediate repeated requests', async () => {
  const { spotify } = await fresh({ connected: true });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response('', { status: 429, headers: { 'Retry-After': '60' } });
  };
  await assert.rejects(spotify.search('one'), /rate-limiting/);
  await assert.rejects(spotify.search('two'), /rate-limiting/);
  assert.equal(calls, 1);
});

test('Spotify app playback selects a device and sends a full-track URI', async () => {
  const { spotify, mapSpotifyTrack } = await fresh({ connected: true });
  spotify.setOutput('spotify');
  const paths: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    if (url.pathname.endsWith('/devices')) return Response.json({ devices: [
      { id: 'desktop', is_active: true, is_restricted: false, name: 'This Mac' },
    ] });
    assert.equal(url.searchParams.get('device_id'), 'desktop');
    assert.equal(init!.method, 'PUT');
    assert.deepEqual(JSON.parse(String(init!.body)), { uris: ['spotify:track:track123'] });
    return new Response(null, { status: 204 });
  };
  await spotify.play(mapSpotifyTrack(fixture));
  assert.deepEqual(paths, ['/v1/me/player/devices', '/v1/me/player/play']);
});

test('missing Spotify devices produces an actionable error', async () => {
  const { spotify, mapSpotifyTrack } = await fresh({ connected: true });
  spotify.setOutput('spotify');
  globalThis.fetch = async () => Response.json({ devices: [] });
  await assert.rejects(spotify.play(mapSpotifyTrack(fixture)), /Open Spotify on this Mac/);
});

test('browser SDK connects once, activates audio and plays the full track on its device', async () => {
  const { spotify, mapSpotifyTrack } = await fresh({ connected: true });
  let activations = 0;
  let connections = 0;
  let pauses = 0;
  let resumes = 0;
  const listeners = new Map<string, (event: any) => void>();
  (globalThis as any).window.Spotify = { Player: class {
    addListener(name: string, listener: (event: any) => void) { listeners.set(name, listener); return true; }
    async connect() {
      connections++;
      listeners.get('ready')!({ device_id: 'gallery-browser' });
      return true;
    }
    disconnect() {}
    async activateElement() { activations++; }
    async pause() { pauses++; }
    async resume() { resumes++; }
    async getCurrentState() {
      return {
        paused: false, position: 42000, duration: 185900,
        track_window: { current_track: {
          ...fixture, album: { ...fixture.album, uri: 'spotify:album:album123' },
        } },
      };
    }
  } };
  await Promise.all([spotify.preparePlayer(), spotify.preparePlayer()]);
  assert.equal(connections, 1);
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('device_id'), 'gallery-browser');
    assert.deepEqual(JSON.parse(String(init!.body)), { uris: ['spotify:track:track123'] });
    return new Response(null, { status: 204 });
  };
  await spotify.play(mapSpotifyTrack(fixture));
  assert.equal(activations, 1);
  await spotify.pause();
  await spotify.resume();
  assert.equal(pauses, 1);
  assert.equal(resumes, 1);
  assert.equal(activations, 2);
  const playback = await spotify.playback();
  assert.equal(playback!.position, 42);
  assert.equal(playback!.isPlaying, true);
  assert.equal(playback!.track.id, 'spotify:track123');
  spotify.disconnect();
});

test('401 refreshes the token and retries a catalogue request exactly once', async () => {
  const { spotify } = await fresh({ connected: true });
  let searches = 0;
  globalThis.fetch = async (input) => {
    if (String(input).includes('/api/token')) return Response.json({ access_token: 'new', expires_in: 3600 });
    searches++;
    if (searches === 1) return new Response('', { status: 401 });
    return Response.json({ tracks: { items: [fixture], next: null } });
  };
  assert.equal((await spotify.search('song')).tracks.length, 1);
  assert.equal(searches, 2);
});

test('disconnect clears tokens and cannot be undone by an in-flight refresh', async () => {
  const { spotify } = await fresh({ connected: true, expires: Date.now() - 1 });
  let respond!: (response: Response) => void;
  globalThis.fetch = () => new Promise((resolve) => { respond = resolve; });
  const pending = spotify.search('song');
  spotify.disconnect();
  respond(Response.json({ access_token: 'late-access', refresh_token: 'late-refresh', expires_in: 3600 }));
  await assert.rejects(pending, /disconnected/);
  assert.equal(storage.has('frankenstein:spotify-session'), false);
  assert.equal(spotify.getSnapshot().connected, false);
});
