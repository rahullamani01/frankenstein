import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { Sidebar, ScreenId } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { AlbumViewScreen } from './components/screens/AlbumViewScreen';
import { NowPlayingScreen } from './components/screens/NowPlayingScreen';
import { FavoritesScreen } from './components/screens/FavoritesScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { PlaylistsScreen } from './components/screens/PlaylistsScreen';
import { SourceScreen } from './components/screens/SourceScreen';
import { Track, Album, Artist } from './data/musicData';
import { api, ApiTrack } from './api/client';
import { localAudio } from './utils/localAudio';
import { spotify } from './services/spotify';

function savedSpotifyTracks(): Track[] {
  try {
    const saved = JSON.parse(localStorage.getItem('frankenstein:spotify-collection') || '[]');
    return Array.isArray(saved) ? saved.filter((t) => t?.source === 'Spotify' && t.spotifyUri) : [];
  } catch { return []; }
}

function toTrack(t: ApiTrack): Track {
  return {
    id: t.id,
    title: t.title,
    artist: t.artist,
    album: t.album,
    albumId: t.albumId,
    year: t.year,
    duration: t.duration,
    durationSec: t.durationSec,
    source: t.source,
    coverUrl: t.coverUrl || '',
    trackNumber: t.trackNumber,
    isFavorite: t.isFavorite,
  };
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('frankenstein-theme') === 'dark'; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    try { localStorage.setItem('frankenstein-theme', darkMode ? 'dark' : 'light'); } catch { /* storage unavailable */ }
  }, [darkMode]);
  const [localTracks, setTracks] = useState<Track[]>([]);
  const [libraryAlbums, setAlbums] = useState<Album[]>([]);
  const [streamingTracks, setStreamingTracks] = useState<Track[]>(savedSpotifyTracks);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [history, setHistory] = useState<Track[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackBusy, setPlaybackBusy] = useState(false);
  const spotifyState = useSyncExternalStore(spotify.subscribe, spotify.getSnapshot);
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const playRequest = useRef(0);
  const nextTrackRef = useRef<() => void>(() => {});
  const tracks = useMemo(() => [...localTracks, ...streamingTracks], [localTracks, streamingTracks]);
  const albums = useMemo(() => {
    const result = [...libraryAlbums];
    const seen = new Set(result.map((album) => album.id));
    streamingTracks.forEach((track) => {
      if (seen.has(track.albumId)) return;
      seen.add(track.albumId);
      result.push({
        id: track.albumId, title: track.album, artist: track.artist, year: track.year,
        source: 'Spotify', coverUrl: track.coverUrl,
        trackCount: streamingTracks.filter((t) => t.albumId === track.albumId).length,
      });
    });
    return result;
  }, [libraryAlbums, streamingTracks]);

  useEffect(() => {
    try { localStorage.setItem('frankenstein:spotify-collection', JSON.stringify(streamingTracks)); } catch { /* storage unavailable */ }
  }, [streamingTracks]);

  useEffect(() => {
    void spotify.initialize().then((returned) => {
      if (returned) setCurrentScreen('source-spotify');
    });
  }, []);

  const reportPlaybackError = (error: unknown) => {
    setPlaybackError(error instanceof Error ? error.message : 'Could not play this song. Please try again.');
  };

  // Mirror the real Spotify state; never simulate playback with a timer.
  useEffect(() => {
    if (currentTrack?.source !== 'Spotify' || !spotifyState.connected) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const sync = async () => {
      try {
        const state = await spotify.playback();
        if (!cancelled && state) {
          setCurrentTrack((previous) => previous?.id === state.track.id
            ? { ...previous, durationSec: state.track.durationSec }
            : state.track);
          setIsPlaying(state.isPlaying);
          setCurrentTime(state.position);
        }
      } catch (error) {
        if (!cancelled) reportPlaybackError(error);
      }
      if (!cancelled) timer = setTimeout(sync, spotifyState.output === 'browser' ? 1000 : 5000);
    };
    void sync();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [currentTrack?.source, spotifyState.connected, spotifyState.output]);

  useEffect(() => {
    if (!spotifyState.connected && currentTrackRef.current?.source === 'Spotify') setIsPlaying(false);
  }, [spotifyState.connected]);

  // Load library from FastAPI backend
  const refreshLibrary = useCallback(async () => {
    try {
      const [status, apiTracks, apiAlbums, apiArtists] = await Promise.all([
        api.status(),
        api.tracks(),
        api.albums(),
        api.artists(),
      ]);
      setBackendOk(status.ok);
      const mapped = apiTracks.map(toTrack);
      setTracks(mapped);
      setAlbums(apiAlbums as Album[]);
      setArtists(apiArtists as Artist[]);
      setLoadError(null);
      setCurrentTrack((previous) => previous ?? mapped[0] ?? null);
      setSelectedAlbumId((previous) => previous || apiAlbums[0]?.id || '');
    } catch (e) {
      setBackendOk(false);
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Backend not reachable. Start: cd backend && python main.py'
      );
    }
  }, []);

  useEffect(() => {
    void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    if (backendOk !== false) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const retry = async () => {
      await refreshLibrary();
      if (!cancelled) timer = setTimeout(retry, 5000);
    };
    timer = setTimeout(retry, 5000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [backendOk, refreshLibrary]);

  // Wire HTML5 audio time updates
  useEffect(() => {
    localAudio.onTimeUpdate((t) => {
      if (currentTrackRef.current?.source === 'Local') setCurrentTime(t);
    });
    localAudio.onEnded(() => {
      setIsPlaying(false);
      nextTrackRef.current();
    });
    localAudio.setVolume(volume);
  }, []);

  const handlePlayTrack = async (track: Track) => {
    if (playbackBusy) return;
    const request = ++playRequest.current;
    setPlaybackBusy(true);
    setPlaybackError(null);
    try {
      if (track.source === 'Spotify') {
        localAudio.pause();
        await spotify.play(track);
      } else {
        if (currentTrackRef.current?.source === 'Spotify' && spotifyState.connected) await spotify.pause();
        if (track.source === 'Local') await localAudio.playUrl(api.streamUrl(track.id));
        else {
          localAudio.stop();
          await api.applePlayTrack(track.title, track.artist);
        }
      }
      if (request !== playRequest.current) return;
      setCurrentTrack(track);
      setCurrentTime(0);
      setIsPlaying(true);
      setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 30));
      if (track.source === 'Spotify') {
        setStreamingTracks((previous) => {
          const existing = previous.find((t) => t.id === track.id);
          return [{ ...track, isFavorite: existing?.isFavorite ?? false }, ...previous.filter((t) => t.id !== track.id)].slice(0, 200);
        });
      }
    } catch (error) {
      if (request === playRequest.current) { setIsPlaying(false); reportPlaybackError(error); }
    } finally {
      if (request === playRequest.current) setPlaybackBusy(false);
    }
  };

  const handleTogglePlay = async () => {
    if (!currentTrack || playbackBusy) return;
    setPlaybackError(null);
    try {
      if (currentTrack.source === 'Spotify') {
        if (isPlaying) await spotify.pause();
        else await spotify.resume();
      } else if (currentTrack.source === 'Apple Music') await api.applePlayPause();
      else if (isPlaying) localAudio.pause();
      else if (localAudio.hasSource) await localAudio.resume();
      else await localAudio.playUrl(api.streamUrl(currentTrack.id));
      setIsPlaying(!isPlaying);
    } catch (error) { reportPlaybackError(error); }
  };

  const handleNextTrack = () => {
    if (currentTrack?.source === 'Spotify') {
      void spotify.next().catch(reportPlaybackError);
      return;
    }
    if (currentTrack?.source === 'Apple Music') {
      void api.appleNext().catch(reportPlaybackError);
      return;
    }
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    handlePlayTrack(next);
  };
  nextTrackRef.current = handleNextTrack;

  const handlePreviousTrack = () => {
    if (currentTrack?.source === 'Spotify') {
      void spotify.previous().catch(reportPlaybackError);
      return;
    }
    if (currentTrack?.source === 'Apple Music') {
      void api.applePrevious().catch(reportPlaybackError);
      return;
    }
    if (!currentTrack || tracks.length === 0) return;
    if (currentTime > 3) {
      setCurrentTime(0);
      if (currentTrack.source === 'Local') localAudio.seek(0);
      return;
    }
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
    handlePlayTrack(prev);
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (currentTrack?.source === 'Local') localAudio.seek(newTime);
    else if (currentTrack?.source === 'Spotify') void spotify.seek(newTime).catch(reportPlaybackError);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localAudio.setVolume(newVol);
    const pct = Math.round(newVol * 100);
    if (currentTrack?.source === 'Spotify') void spotify.volume(newVol).catch(reportPlaybackError);
    if (currentTrack?.source === 'Apple Music') void api.appleVolume(pct);
  };

  const handleToggleFavorite = async (trackId: string) => {
    const streamingTrack = streamingTracks.find((t) => t.id === trackId)
      || (currentTrack?.id === trackId && currentTrack.source === 'Spotify' ? currentTrack : null);
    if (streamingTrack) {
      const isFavorite = !streamingTrack.isFavorite;
      setStreamingTracks((previous) => [
        { ...streamingTrack, isFavorite }, ...previous.filter((t) => t.id !== trackId),
      ]);
      setCurrentTrack((previous) => previous?.id === trackId ? { ...previous, isFavorite } : previous);
      return;
    }
    if (currentTrack?.id === trackId && currentTrack.source !== 'Local') return;
    try {
      const res = await api.toggleFavorite(trackId);
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId ? { ...t, isFavorite: res.isFavorite } : t
        )
      );
      if (currentTrack?.id === trackId) {
        setCurrentTrack((prev) =>
          prev ? { ...prev, isFavorite: res.isFavorite } : prev
        );
      }
    } catch {
      // offline / backend down
    }
  };

  const handleSelectAlbum = (albumId: string) => {
    setSelectedAlbumId(albumId);
    setPreviousScreen(currentScreen);
    setCurrentScreen('album');
  };

  const handlePlayAlbum = () => {
    const albumTracks = tracks.filter((t) => t.albumId === selectedAlbumId);
    if (albumTracks.length > 0) handlePlayTrack(albumTracks[0]);
  };

  const handleNavigate = (screen: ScreenId) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const handleOpenNowPlaying = () => {
    if (currentScreen !== 'now-playing') {
      setPreviousScreen(currentScreen);
      setCurrentScreen('now-playing');
    }
  };

  const handleCloseNowPlaying = () => {
    setCurrentScreen(
      previousScreen === 'now-playing' ? 'home' : previousScreen
    );
  };

  const currentAlbum =
    albums.find((a) => a.id === selectedAlbumId) || albums[0];
  const albumTracks = currentAlbum
    ? tracks.filter((t) => t.albumId === currentAlbum.id)
    : [];
  const favoriteTracks = tracks.filter((t) => t.isFavorite);
  const recentlyPlayedAlbums = albums.slice(0, 6);
  const recentlyAddedAlbums = albums.slice().reverse().slice(0, 6);

  const emptyTrack: Track = {
    id: '',
    title: 'Nothing playing',
    artist: '',
    album: '',
    albumId: '',
    year: 0,
    duration: '0:00',
    durationSec: 0,
    source: 'Local',
    coverUrl: '',
    trackNumber: 0,
  };
  const displayTrack = currentTrack || emptyTrack;

  return (
    <div
      id="app-root"
      className="w-screen h-screen flex flex-col overflow-hidden select-none font-sans"
    >
      {backendOk === false && (
        <div className="pixel-notice">
          <span aria-hidden="true">✳</span>
          <span>
            The gallery is running quietly without its library server. Start it with{' '}
            <code>cd backend &amp;&amp; python main.py</code>
            {loadError ? ` (${loadError})` : ''}. The walls will fill as soon as it is up.
          </span>
        </div>
      )}
      {(playbackError || playbackBusy) && (
        <div className="pixel-notice" role={playbackError ? 'alert' : 'status'}>
          <span>{playbackError || 'Starting playback…'}</span>
          {playbackError && (
            <button className="pixel-btn ghost small ml-auto" onClick={() => setPlaybackError(null)}>Dismiss</button>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentScreen={currentScreen} onNavigate={handleNavigate} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />

        <main
          id="app-main-content"
          className="flex-1 h-full overflow-y-auto relative"
        >
          {currentScreen === 'home' && (
            <HomeScreen
              onSelectAlbum={handleSelectAlbum}
              recentlyPlayedAlbums={recentlyPlayedAlbums}
              recentlyAddedAlbums={recentlyAddedAlbums}
              albums={albums}
              tracks={tracks}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              darkMode={darkMode}
              onPlayTrack={handlePlayTrack}
              onOpenNowPlaying={handleOpenNowPlaying}
            />
          )}

          {currentScreen === 'search' && (
          <SearchScreen
            currentTrackId={currentTrack?.id}
            isPlaying={isPlaying}
            onPlayTrack={handlePlayTrack}
         />
       )}

          {currentScreen === 'library' && (
            <LibraryScreen
              tracks={tracks}
              albums={albums}
              artists={artists}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onSelectAlbum={handleSelectAlbum}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentScreen === 'album' && currentAlbum && (
            <AlbumViewScreen
              album={currentAlbum}
              albumTracks={albumTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              darkMode={darkMode}
              onBack={() =>
                setCurrentScreen(
                  previousScreen === 'album' ? 'library' : previousScreen
                )
              }
              onPlayTrack={handlePlayTrack}
              onPlayAlbum={handlePlayAlbum}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentScreen === 'now-playing' && (
            <NowPlayingScreen
              track={displayTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={displayTrack.durationSec}
              volume={volume}
              isFavorite={Boolean(displayTrack.isFavorite)}
              darkMode={darkMode}
              onClose={handleCloseNowPlaying}
              onTogglePlay={handleTogglePlay}
              onNext={handleNextTrack}
              onPrevious={handlePreviousTrack}
              onSeek={handleSeek}
              onVolumeChange={handleVolumeChange}
              onToggleFavorite={() =>
                displayTrack.id && handleToggleFavorite(displayTrack.id)
              }
            />
          )}

          {currentScreen === 'favorites' && (
            <FavoritesScreen
              favoriteTracks={favoriteTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentScreen === 'history' && (
            <HistoryScreen
              historyTracks={history}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onClearHistory={() => setHistory([])}
            />
          )}

          {currentScreen === 'playlists' && (
            <PlaylistsScreen
              tracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
            />
          )}

          {currentScreen === 'source-local' && (
            <SourceScreen
              sourceName="Local"
              tracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentScreen === 'source-apple' && (
            <SourceScreen
              sourceName="Apple Music"
              tracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleFavorite={handleToggleFavorite}
            />
          )}

          {currentScreen === 'source-spotify' && (
            <SourceScreen
              sourceName="Spotify"
              tracks={tracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
        </main>
      </div>

      {currentScreen !== 'now-playing' && (
        <PlayerBar
          currentTrack={displayTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={displayTrack.durationSec}
          volume={volume}
          isFavorite={Boolean(displayTrack.isFavorite)}
          onTogglePlay={handleTogglePlay}
          onNext={handleNextTrack}
          onPrevious={handlePreviousTrack}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleFavorite={() =>
            displayTrack.id && handleToggleFavorite(displayTrack.id)
          }
          onOpenNowPlaying={handleOpenNowPlaying}
        />
      )}
    </div>
  );
}
