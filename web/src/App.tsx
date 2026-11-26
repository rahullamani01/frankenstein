import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { Sidebar, ScreenId } from './components/Sidebar';
import { PlayerBar } from './components/PlayerBar';
import { HomeScreen } from './components/screens/HomeScreen';
import { SearchScreen } from './components/screens/SearchScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { Hillside } from './components/pixel/Hillside';
import { AlbumViewScreen } from './components/screens/AlbumViewScreen';
import { NowPlayingOverlay } from './components/NowPlayingOverlay';
import { DiscoveryScene } from './components/DiscoveryScene';
import { FavoritesScreen } from './components/screens/FavoritesScreen';
import { HistoryScreen } from './components/screens/HistoryScreen';
import { PlaylistsScreen } from './components/screens/PlaylistsScreen';
import { SourceScreen } from './components/screens/SourceScreen';
import { Track, Album, Artist } from './data/musicData';
import { api, ApiTrack } from './api/client';
import { localAudio } from './utils/localAudio';
import { spotify } from './services/spotify';
import { captureArtwork, startArtworkFlight, type ArtworkSource } from './utils/artworkFlight';
import { useReducedMotion } from './hooks/useReducedMotion';
import { getRecommendations, readRecommendations, recommendationKey, trackIdentity } from './recommendations/similar';

function savedCatalogueTracks(): Track[] {
  try {
    const saved = JSON.parse(localStorage.getItem('frankenstein:spotify-collection') || '[]');
    return Array.isArray(saved)
      ? saved.filter((t) => t?.source === 'Apple Music' || (t?.source === 'Spotify' && t.spotifyUri))
      : [];
  } catch { return []; }
}

function savedSetting(key: string, defaultValue: boolean): boolean {
  try { return localStorage.getItem(key) === null ? defaultValue : localStorage.getItem(key) === 'true'; }
  catch { return defaultValue; }
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
  const [streamingTracks, setStreamingTracks] = useState<Track[]>(savedCatalogueTracks);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [currentScreen, setCurrentScreen] = useState<ScreenId>('home');
  const [previousScreen, setPreviousScreen] = useState<ScreenId>('home');
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const mainRef = useRef<HTMLElement | null>(null);
  const scrollMemory = useRef(new Map<string, number>());
  const albumOrigin = useRef<ArtworkSource | null>(null);
  const reducedMotion = useReducedMotion();
  const scrollKey = currentScreen === 'album' ? `album:${selectedAlbumId}` : currentScreen;

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [history, setHistory] = useState<Track[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackBusy, setPlaybackBusy] = useState(false);
  const [queue, setQueue] = useState<Track[]>([]);
  const [upNext, setUpNext] = useState<Track[]>([]);
  const [discoveryTrack, setDiscoveryTrack] = useState<Track | null>(null);
  const [discoveryFromEnd, setDiscoveryFromEnd] = useState(false);
  const [lyricsRequested, setLyricsRequested] = useState(0);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(() =>
    savedSetting('frankenstein:show-recommendations', true)
  );
  const [autoPlayRecommendation, setAutoPlayRecommendation] = useState(() =>
    savedSetting('frankenstein:auto-play-recommendation', false)
  );
  const [previewRecommendation, setPreviewRecommendation] = useState(() =>
    savedSetting('frankenstein:preview-recommendation', false)
  );
  const discoveryRef = useRef(false);
  const endedRef = useRef('');
  const seekingRef = useRef(0);
  const sceneRequest = useRef(0);
  const [shuffle, setShuffle] = useState(false);
  const spotifyState = useSyncExternalStore(spotify.subscribe, spotify.getSnapshot);
  const currentTrackRef = useRef(currentTrack);
  currentTrackRef.current = currentTrack;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const playRequest = useRef(0);
  const lastPlaybackStart = useRef(0);
  const nextTrackRef = useRef<() => void>(() => {});
  const endTrackRef = useRef<() => void>(() => {});
  const tracks = useMemo(() => [...localTracks, ...streamingTracks], [localTracks, streamingTracks]);
  useEffect(() => {
    try { localStorage.setItem('frankenstein:show-recommendations', String(showRecommendations)); } catch { /* optional */ }
  }, [showRecommendations]);
  useEffect(() => {
    try { localStorage.setItem('frankenstein:auto-play-recommendation', String(autoPlayRecommendation)); } catch { /* optional */ }
  }, [autoPlayRecommendation]);
  useEffect(() => {
    try { localStorage.setItem('frankenstein:preview-recommendation', String(previewRecommendation)); } catch { /* optional */ }
  }, [previewRecommendation]);
  // Played catalogue tracks only; imported local files stay in the Local source.
  const recentLibraryTracks = useMemo(() => {
    const seen = new Set<string>();
    return [...history, ...streamingTracks].filter((track) => {
      if (track.source === 'Local' || seen.has(track.id)) return false;
      seen.add(track.id);
      return true;
    }).slice(0, 30).map((track) => tracks.find((item) => item.id === track.id) || track);
  }, [history, streamingTracks, tracks]);
  const albums = useMemo(() => {
    const result = [...libraryAlbums];
    const seen = new Set(result.map((album) => album.id));
    streamingTracks.forEach((track) => {
      if (seen.has(track.albumId)) return;
      seen.add(track.albumId);
      result.push({
        id: track.albumId, title: track.album, artist: track.artist, year: track.year,
        source: track.source, coverUrl: track.coverUrl,
        trackCount: streamingTracks.filter((t) => t.albumId === track.albumId).length,
      });
    });
    return result;
  }, [libraryAlbums, streamingTracks]);
  const favoriteTracks = useMemo(() => tracks.filter((track) => track.isFavorite), [tracks]);
  const currentAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) || albums[0],
    [albums, selectedAlbumId],
  );
  const albumTracks = useMemo(
    () => (currentAlbum ? tracks.filter((track) => track.albumId === currentAlbum.id) : []),
    [currentAlbum, tracks],
  );

  const loadDiscovery = useCallback((track: Track) => {
    const request = ++sceneRequest.current;
    setRecommendations(readRecommendations(track) ?? []);
    setRecommendationsLoading(true);
    void getRecommendations(track, tracks, history)
      .then((result) => {
        if (request === sceneRequest.current) setRecommendations(result);
      })
      .catch(() => {
        if (request === sceneRequest.current) setRecommendations([]);
      })
      .finally(() => {
        if (request === sceneRequest.current) setRecommendationsLoading(false);
      });
  }, [tracks, history]);

  const openDiscovery = useCallback((track: Track, fromEnd = false) => {
    if (!track.id || discoveryRef.current) return;
    discoveryRef.current = true;
    setDiscoveryFromEnd(fromEnd);
    setDiscoveryTrack(track);
    loadDiscovery(track);
  }, [loadDiscovery]);

  const closeDiscovery = useCallback(() => {
    discoveryRef.current = false;
    sceneRequest.current += 1;
    setDiscoveryTrack(null);
    setNowPlayingOpen(true);
  }, []);

  // Warm the recommendation cache while the current song is still playing.
  const prefetchKey = currentTrack ? recommendationKey(currentTrack) : '';
  useEffect(() => {
    if (!currentTrack || !isPlaying || !showRecommendations || discoveryRef.current) return;
    const remaining = currentTrack.durationSec - currentTime;
    if (remaining <= 20 && remaining > 1 && !readRecommendations(currentTrack)) {
      void getRecommendations(currentTrack, tracks, history).catch(() => {});
    }
  }, [prefetchKey, currentTime, isPlaying, showRecommendations, tracks, history, currentTrack]);

  const onTrackEnded = () => {
    const track = currentTrackRef.current;
    if (!track || !track.id || endedRef.current === trackIdentity(track) || Date.now() - seekingRef.current < 1600) return;
    endedRef.current = trackIdentity(track);
    setIsPlaying(false);
    if (showRecommendations) openDiscovery(track, true);
    else nextTrackRef.current();
  };
  endTrackRef.current = onTrackEnded;

  // Next/previous and shuffle stay inside the list the song was started from,
  // so playing from Favorites never wanders into the rest of the library.
  const queueForScreen = (): Track[] => {
    switch (currentScreen) {
      case 'favorites': return favoriteTracks;
      case 'album': return albumTracks;
      case 'library': return recentLibraryTracks;
      case 'history': return history;
      case 'source-local': return tracks.filter((track) => track.source === 'Local');
      case 'source-apple': return tracks.filter((track) => track.source === 'Apple Music');
      case 'source-spotify': return tracks.filter((track) => track.source === 'Spotify');
      // Search has no list of its own; keep the active playback queue
      // instead of widening it to the whole library.
      case 'search': return [];
      default: return tracks;
    }
  };

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
          const previous = currentTrackRef.current;
          const finished = previous?.source === 'Spotify'
            && state.track.id === previous.id
            && isPlayingRef.current
            && !state.isPlaying
            && state.position >= Math.max(0, previous.durationSec - 1.5);
          const advancedAfterEnd = previous?.source === 'Spotify'
            && state.track.id !== previous.id
            && isPlayingRef.current
            && Date.now() - lastPlaybackStart.current > 2500
            && Date.now() - seekingRef.current > 1600
            && previous.durationSec > 0
            && currentTimeRef.current >= previous.durationSec - 2.5;
          if (finished || advancedAfterEnd) {
            endTrackRef.current();
            if (advancedAfterEnd) void spotify.pause().catch(() => {});
          }
          if (!discoveryRef.current && !finished && !advancedAfterEnd) {
            // Spotify's state can lag a just-issued play command.
            if (Date.now() - lastPlaybackStart.current > 1500) {
              setCurrentTrack((previous) => previous?.id === state.track.id
                ? { ...previous, durationSec: state.track.durationSec }
                : state.track);
              setIsPlaying(state.isPlaying);
            }
            setCurrentTime(state.position);
          }
        } else if (!cancelled && !state && !discoveryRef.current) {
          const previous = currentTrackRef.current;
          if (previous?.source === 'Spotify' && isPlayingRef.current
            && previous.durationSec > 0
            && currentTimeRef.current >= previous.durationSec - 2.5) {
            endTrackRef.current();
          }
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

  useEffect(() => {
    if (currentTrack?.source !== 'Apple Music' || !isPlaying) return;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void api.appleStatus().then((status) => {
        if (cancelled || discoveryRef.current) return;
        if (!status.nowPlaying) {
          const current = currentTrackRef.current;
          if (current?.source === 'Apple Music' && current.durationSec > 0
            && currentTimeRef.current >= current.durationSec - 2.5) endTrackRef.current();
          return;
        }
        const playing = status.nowPlaying.state.toLowerCase() === 'playing';
        const position = status.nowPlaying.position_seconds;
        const current = currentTrackRef.current;
        if (current?.source !== 'Apple Music') return;
        if (!playing && Number.isFinite(position) && position >= Math.max(0, current.durationSec - 1.5)) {
          endTrackRef.current();
        } else if (Number.isFinite(position)) {
          setCurrentTime(position);
          if (!playing) setIsPlaying(false);
        }
      }).catch(() => {});
    }, 1600);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [currentTrack?.source, isPlaying]);

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
      endTrackRef.current();
    });
    localAudio.setVolume(volume);
  }, []);

  // Background tabs do not need to animate anything.
  useEffect(() => {
    const sync = () => {
      document.documentElement.dataset.appHidden = document.hidden ? 'true' : 'false';
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // Each gallery remembers where it was left; the mini-player never moves.
  const saveScroll = useCallback(() => {
    const main = mainRef.current;
    if (main) scrollMemory.current.set(scrollKey, main.scrollTop);
  }, [scrollKey]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        scrollMemory.current.set(scrollKey, main.scrollTop);
      });
    };
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      main.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [scrollKey]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    main.scrollTop = scrollMemory.current.get(scrollKey) ?? 0;
  }, [scrollKey]);

  // Carry the album cover from its frame into the album view. Starting this
  // in the layout phase means the destination art never flashes before the
  // clone starts travelling.
  useLayoutEffect(() => {
    if (currentScreen !== 'album') return;
    const source = albumOrigin.current;
    albumOrigin.current = null;
    if (!source) return;
    const target = document.getElementById('album-art-slot');
    if (!target) return;
    target.dataset.flying = 'true';
    const flight = startArtworkFlight(source, target.getBoundingClientRect(), () => {
      delete target.dataset.flying;
    });
    if (!flight) delete target.dataset.flying;
    return () => flight?.cancel();
  }, [currentScreen, selectedAlbumId]);

  const handlePlayTrack = async (track: Track) => {
    seekingRef.current = Date.now();
    const request = ++playRequest.current;
    setPlaybackBusy(true);
    setPlaybackError(null);

    const scoped = queueForScreen();
    const context = scoped.some((item) => item.id === track.id)
      ? scoped
      : queue.some((item) => item.id === track.id)
        ? queue
        : tracks;

    try {
      // Start the new source first. The old one is only stopped once the new
      // song is actually playing, so a failed request cannot leave silence.
      if (track.source === 'Spotify') {
        await spotify.play(track);
        if (request === playRequest.current) localAudio.pause();
      } else if (track.source === 'Local') {
        await localAudio.playUrl(api.streamUrl(track.id));
        if (request === playRequest.current && spotifyState.connected) await spotify.pause().catch(() => {});
      } else {
        await api.applePlayTrack(track.title, track.artist);
        if (request === playRequest.current) {
          localAudio.pause();
          if (spotifyState.connected) await spotify.pause().catch(() => {});
        }
      }
      if (request !== playRequest.current) return;
      lastPlaybackStart.current = Date.now();
      endedRef.current = '';
      setQueue(context);
      setUpNext((previous) => previous.filter((item) => trackIdentity(item) !== trackIdentity(track)));
      setCurrentTrack(track);
      setCurrentTime(0);
      setIsPlaying(true);
      setHistory((prev) => [track, ...prev.filter((t) => t.id !== track.id)].slice(0, 30));
      if (track.source !== 'Local') {
        setStreamingTracks((previous) => {
          const existing = previous.find((t) => t.id === track.id);
          return [{ ...track, isFavorite: existing?.isFavorite ?? false }, ...previous.filter((t) => t.id !== track.id)].slice(0, 200);
        });
      }
    } catch (error) {
      // The previous song was left running on purpose, so keep its playing
      // state instead of showing a false pause when the new one fails.
      if (request === playRequest.current) reportPlaybackError(error);
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
        else { await spotify.resume(); lastPlaybackStart.current = Date.now(); }
      } else if (currentTrack.source === 'Apple Music') await api.applePlayPause();
      else if (isPlaying) localAudio.pause();
      else if (localAudio.hasSource) await localAudio.resume();
      else await localAudio.playUrl(api.streamUrl(currentTrack.id));
      setIsPlaying(!isPlaying);
    } catch (error) { reportPlaybackError(error); }
  };

  const playbackQueue = (): Track[] => {
    const scoped = queueForScreen();
    if (scoped.length > 0 && scoped.some((track) => track.id === currentTrack?.id)) return scoped;
    if (currentScreen === 'favorites' && scoped.length > 0) return scoped;
    return queue.length > 0 ? queue : tracks;
  };

  const randomIndex = (length: number, avoid: number) => {
    if (length <= 1) return 0;
    let index = avoid;
    while (index === avoid) index = Math.floor(Math.random() * length);
    return index;
  };

  const handleNextTrack = () => {
    if (upNext.length) {
      void handlePlayTrack(upNext[0]);
      return;
    }
    const list = playbackQueue();
    if (list.length === 0) return;
    if (list.length === 1) {
      if (currentTrack?.source === 'Spotify') void spotify.next().catch(reportPlaybackError);
      else if (currentTrack?.source === 'Apple Music') void api.appleNext().catch(reportPlaybackError);
      return;
    }
    const idx = list.findIndex((track) => track.id === currentTrack?.id);
    const next = shuffle ? randomIndex(list.length, idx) : (idx + 1) % list.length;
    void handlePlayTrack(list[next]);
  };
  nextTrackRef.current = handleNextTrack;

  const handlePreviousTrack = () => {
    const list = playbackQueue();
    if (list.length === 0) return;
    if (currentTime > 3) {
      setCurrentTime(0);
      if (currentTrack?.source === 'Local') localAudio.seek(0);
      else if (currentTrack?.source === 'Spotify') void spotify.seek(0).catch(reportPlaybackError);
      return;
    }
    if (list.length === 1) {
      if (currentTrack?.source === 'Spotify') void spotify.previous().catch(reportPlaybackError);
      else if (currentTrack?.source === 'Apple Music') void api.applePrevious().catch(reportPlaybackError);
      return;
    }
    const idx = list.findIndex((track) => track.id === currentTrack?.id);
    const previous = shuffle
      ? randomIndex(list.length, idx)
      : (idx - 1 + list.length) % list.length;
    void handlePlayTrack(list[previous]);
  };

  const handleSeek = (newTime: number) => {
    seekingRef.current = Date.now();
    if (newTime < Math.max(0, (currentTrack?.durationSec || 0) - 2)) endedRef.current = '';
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
      || (currentTrack?.id === trackId && currentTrack.source !== 'Local' ? currentTrack : null);
    const recommendationTrack = recommendations.find((t) => t.id === trackId && t.source !== 'Local');
    const catalogueTrack = streamingTrack || recommendationTrack;
    if (catalogueTrack) {
      const isFavorite = !catalogueTrack.isFavorite;
      setStreamingTracks((previous) => [
        { ...catalogueTrack, isFavorite }, ...previous.filter((t) => t.id !== trackId),
      ]);
      setRecommendations((previous) => previous.map((item) => item.id === trackId ? { ...item, isFavorite } : item));
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
      setRecommendations((previous) => previous.map((item) =>
        item.id === trackId ? { ...item, isFavorite: res.isFavorite } : item
      ));
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
    saveScroll();
    setSelectedAlbumId(albumId);
    setPreviousScreen(currentScreen);
    setCurrentScreen('album');
  };

  const handlePlayAlbum = () => {
    const albumTracks = tracks.filter((t) => t.albumId === selectedAlbumId);
    if (albumTracks.length > 0) handlePlayTrack(albumTracks[0]);
  };

  const handleShuffleFavorites = () => {
    if (favoriteTracks.length === 0) return;
    setShuffle(true);
    const pick = favoriteTracks[Math.floor(Math.random() * favoriteTracks.length)];
    void handlePlayTrack(pick);
  };

  const handleNavigate = (screen: ScreenId) => {
    saveScroll();
    setNowPlayingOpen(false);
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
  };

  const handleOpenNowPlaying = () => {
    setNowPlayingOpen(true);
  };

  const handleDiscoverSimilar = () => {
    if (!currentTrack) return;
    openDiscovery(currentTrack);
  };

  const handleCloseNowPlaying = () => {
    setNowPlayingOpen(false);
  };

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
  const contextIndex = discoveryTrack
    ? queue.findIndex((item) => trackIdentity(item) === trackIdentity(discoveryTrack))
    : -1;
  const nextInContext = contextIndex >= 0 && queue.length > 1
    ? queue[(contextIndex + 1) % queue.length]
    : null;
  const queuedFirst = upNext[0] || nextInContext;
  const discoveryCards = discoveryTrack
    ? [...(queuedFirst ? [queuedFirst] : []), ...upNext, ...recommendations].filter((item, index, list) =>
      trackIdentity(item) !== trackIdentity(discoveryTrack)
      && list.findIndex((other) => trackIdentity(other) === trackIdentity(item)) === index
    ).slice(0, 12)
    : [];

  return (
    <div
      id="app-root"
      className="w-screen h-screen flex flex-col overflow-hidden select-none font-sans"
      onClickCapture={(event) => {
        if (reducedMotion) {
          albumOrigin.current = null;
          return;
        }
        const element = event.target as Element;
        const card = element.closest?.('[data-album-id]') as HTMLElement | null;
        albumOrigin.current = card
          ? captureArtwork(card.querySelector('.piece-art'))
          : null;
      }}
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

      <div
        className="flex-1 flex overflow-hidden"
        aria-hidden={nowPlayingOpen || Boolean(discoveryTrack) || undefined}
        inert={nowPlayingOpen || Boolean(discoveryTrack) || undefined}
      >
        <Sidebar currentScreen={currentScreen} onNavigate={handleNavigate} darkMode={darkMode} onToggleTheme={() => setDarkMode((value) => !value)} />

        <div className="gallery-stage">
        <Hillside playing={isPlaying} />
        <main
          id="app-main-content"
          ref={mainRef}
          className="flex-1 h-full overflow-y-auto relative"
        >
          <div
            className="screen-layer"
            data-shared={currentScreen === 'album' || undefined}
            key={currentScreen === 'album' ? `album:${selectedAlbumId}` : currentScreen}
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
              offline={backendOk === false}
              onRetry={() => void refreshLibrary()}
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
              tracks={recentLibraryTracks}
              albums={albums}
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

          {currentScreen === 'favorites' && (
            <FavoritesScreen
              favoriteTracks={favoriteTracks}
              currentTrackId={currentTrack?.id}
              isPlaying={isPlaying}
              onPlayTrack={handlePlayTrack}
              onShufflePlay={handleShuffleFavorites}
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
          </div>
        </main>
        </div>
      </div>

      <div
        className="player-slot"
        aria-hidden={nowPlayingOpen || Boolean(discoveryTrack) || undefined}
        inert={nowPlayingOpen || Boolean(discoveryTrack) || undefined}
      >
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
          shuffle={shuffle}
          onToggleShuffle={() => setShuffle((value) => !value)}
          onToggleFavorite={() =>
            displayTrack.id && handleToggleFavorite(displayTrack.id)
          }
          onOpenNowPlaying={handleOpenNowPlaying}
        />
      </div>

      <div aria-hidden={Boolean(discoveryTrack) || undefined} inert={Boolean(discoveryTrack) || undefined}>
      <NowPlayingOverlay
        open={nowPlayingOpen}
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
        shuffle={shuffle}
        onToggleShuffle={() => setShuffle((value) => !value)}
        onToggleFavorite={() =>
          displayTrack.id && handleToggleFavorite(displayTrack.id)
        }
        onDiscoverSimilar={handleDiscoverSimilar}
        showRecommendations={showRecommendations}
        onShowRecommendationsChange={setShowRecommendations}
        lyricsRequested={lyricsRequested}
      />
      </div>
      {discoveryTrack && (
        <DiscoveryScene
          track={discoveryTrack}
          cards={discoveryCards}
          queuedId={queuedFirst ? trackIdentity(queuedFirst) : undefined}
          queuedTracks={upNext.length ? upNext : nextInContext ? [nextInContext] : []}
          loading={recommendationsLoading}
          isPlaying={isPlaying}
          currentTime={currentTime}
          volume={volume}
          autoPlay={autoPlayRecommendation}
          startCountdown={discoveryFromEnd}
          preview={previewRecommendation}
          onAutoPlayChange={setAutoPlayRecommendation}
          onPreviewChange={setPreviewRecommendation}
          onClose={closeDiscovery}
          onPlay={(item) => {
            discoveryRef.current = false;
            sceneRequest.current += 1;
            setDiscoveryTrack(null);
            void handlePlayTrack(item);
          }}
          onTogglePlay={handleTogglePlay}
          onPrevious={() => {
            discoveryRef.current = false;
            setDiscoveryTrack(null);
            handlePreviousTrack();
          }}
          onNext={() => {
            discoveryRef.current = false;
            setDiscoveryTrack(null);
            handleNextTrack();
          }}
          onLyrics={() => {
            setLyricsRequested((value) => value + 1);
            closeDiscovery();
          }}
          onQueue={(item, next) => setUpNext((previous) => {
            const remaining = previous.filter((queued) => trackIdentity(queued) !== trackIdentity(item));
            return next ? [item, ...remaining] : [...remaining, item];
          })}
          onFavorite={(item) => void handleToggleFavorite(item.id)}
          onVolume={handleVolumeChange}
        />
      )}
    </div>
  );
}
