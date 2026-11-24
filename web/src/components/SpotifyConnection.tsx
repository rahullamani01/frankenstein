import { useEffect, useSyncExternalStore } from 'react';
import { Headphones, LogOut } from 'lucide-react';
import { spotify, SPOTIFY_REDIRECT } from '../services/spotify';

export function SpotifyConnection() {
  const state = useSyncExternalStore(spotify.subscribe, spotify.getSnapshot);

  useEffect(() => {
    if (state.connected && state.output === 'browser') {
      void spotify.preparePlayer().catch(() => { /* Error is shown in the connection card. */ });
    }
  }, [state.connected, state.output]);

  return (
    <section className="spotify-connection" aria-label="Spotify connection">
      <div className="spotify-connection-top">
        <div>
          <span className="px-label">Spotify Premium · full catalogue</span>
          <p className="spotify-connection-title">
            {state.connected ? 'Spotify is connected' : 'Bring your Spotify into the gallery'}
          </p>
          <p className="screen-sub">
            {state.connected
              ? state.output === 'browser'
                ? state.playerReady ? 'Full songs play here. Search below to start listening.' : 'Preparing the browser player…'
                : 'Full songs play on your active Spotify device, controlled from this gallery.'
              : 'Sign in once to search songs, artists and albums — not just your local files.'}
          </p>
        </div>
        {state.connected ? (
          <button className="pixel-btn ghost small" onClick={spotify.disconnect}>
            <LogOut size={12} /> Disconnect
          </button>
        ) : (
          <button className="pixel-btn small" disabled={state.busy} onClick={() => void spotify.connect()}>
            <Headphones size={13} /> {state.busy ? 'Connecting…' : 'Connect Spotify'}
          </button>
        )}
      </div>
      {state.connected && (
        <div className="spotify-output">
          <span className="px-label">Listen on</span>
          <div className="px-tabs" aria-label="Spotify playback output">
            <button className={`px-tab ${state.output === 'browser' ? 'is-active' : ''}`}
              onClick={() => spotify.setOutput('browser')}>This browser</button>
            <button className={`px-tab ${state.output === 'spotify' ? 'is-active' : ''}`}
              onClick={() => spotify.setOutput('spotify')}>Spotify app</button>
          </div>
          {state.output === 'spotify' && <span className="screen-sub">Keep Spotify open and play a song there once.</span>}
        </div>
      )}
      {state.error && <p className="spotify-error" role="alert">{state.error}</p>}
      {!state.connected && (
        <p className="spotify-connection-hint">
          Dashboard redirect URI must be exactly <code>{SPOTIFY_REDIRECT}</code>.
          {' '}Sign-in opens on 127.0.0.1 so Spotify can return securely.
        </p>
      )}
    </section>
  );
}
