import { useState, useEffect, useCallback } from 'react';
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
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
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
      if (!currentTrack && mapped.length > 0) {
        setCurrentTrack(mapped[0]);
      }
      if (!selectedAlbumId && apiAlbums.length > 0) {
        setSelectedAlbumId(apiAlbums[0].id);
      }
    } catch (e) {
      setBackendOk(false);
      setLoadError(
        e instanceof Error
          ? e.message
          : 'Backend not reachable. Start: cd backend && python main.py'
      );
    }
  }, [currentTrack, selectedAlbumId]);

  useEffect(() => {
    void refreshLibrary();
  }, []);

  // Wire HTML5 audio time updates
  useEffect(() => {
    localAudio.onTimeUpdate((t) => setCurrentTime(t));
    localAudio.onEnded(() => {
      setIsPlaying(false);
      handleNextTrack();
    });
    localAudio.setVolume(volume);
  }, []);

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setIsPlaying(true);
    setHistory((prev) =>
      [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 30)
    );

    if (track.source === 'Local') {
      localAudio.playUrl(api.streamUrl(track.id));
    } else if (track.source === 'Spotify') {
      // Spotify tracks from library aren't in DB yet — URI path via source screen
      localAudio.stop();
    } else if (track.source === 'Apple Music') {
      void api.applePlayTrack(track.title, track.artist);
      localAudio.stop();
    }
  };

  const handleTogglePlay = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      setIsPlaying(false);
      if (currentTrack.source === 'Local') localAudio.pause();
      else if (currentTrack.source === 'Spotify') void api.spotifyPlayPause();
      else if (currentTrack.source === 'Apple Music') void api.applePlayPause();
    } else {
      setIsPlaying(true);
      if (currentTrack.source === 'Local') localAudio.resume();
      else if (currentTrack.source === 'Spotify') void api.spotifyPlayPause();
      else if (currentTrack.source === 'Apple Music') void api.applePlayPause();
    }
  };

  const handleNextTrack = () => {
    if (!currentTrack || tracks.length === 0) return;
    const idx = tracks.findIndex((t) => t.id === currentTrack.id);
    const next = tracks[(idx + 1) % tracks.length];
    handlePlayTrack(next);
  };

  const handlePreviousTrack = () => {
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
    else if (currentTrack?.source === 'Spotify') void api.spotifyPosition(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    localAudio.setVolume(newVol);
    const pct = Math.round(newVol * 100);
    if (currentTrack?.source === 'Spotify') void api.spotifyVolume(pct);
    if (currentTrack?.source === 'Apple Music') void api.appleVolume(pct);
  };

  const handleToggleFavorite = async (trackId: string) => {
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
      className="w-screen h-screen flex flex-col bg-[#F7F8F3] text-[#24302A] overflow-hidden select-none font-sans"
    >
      {backendOk === false && (
        <div className="bg-[#EC6A5E]/15 text-[#24302A] text-[12px] px-4 py-2 border-b border-[#E2E6DD]">
          Backend offline — start it with{' '}
          <code className="font-mono">cd backend && python main.py</code>
          {loadError ? ` (${loadError})` : ''}. UI still loads; library stays empty until backend is up.
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar currentScreen={currentScreen} onNavigate={handleNavigate} />

        <main
          id="app-main-content"
          className="flex-1 h-full overflow-y-auto bg-[#F7F8F3] relative"
        >
          {currentScreen === 'home' && (
            <HomeScreen
              onSelectAlbum={handleSelectAlbum}
              recentlyPlayedAlbums={recentlyPlayedAlbums}
              recentlyAddedAlbums={recentlyAddedAlbums}
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
