import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { Track } from '../../data/musicData';
import { api, ApiTrack } from '../../api/client';
import { ScreenHeader, TrackRow, TrackTableHead, PixelChip, SourceTag } from '../pixel/ui';
import { SpotifyConnection } from '../SpotifyConnection';
import { spotify } from '../../services/spotify';

interface AppleSearchResult {
  name: string;
  artist: string;
  album: string;
}

interface SearchScreenProps {
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
  onToggleFavorite: (track: Track) => void;
  favoriteTracks: Track[];
  spotifyOnly?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
}

function mapApiTrack(track: ApiTrack): Track {
  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album,
    albumId: track.albumId,
    year: track.year,
    duration: track.duration,
    durationSec: track.durationSec,
    source: track.source,
    coverUrl: track.coverUrl || '',
    trackNumber: track.trackNumber,
    isFavorite: track.isFavorite,
  };
}

function mapAppleTrack(track: AppleSearchResult): Track {
  return {
    id: `apple-search-${track.name}-${track.artist}-${track.album}`,
    title: track.name,
    artist: track.artist,
    album: track.album,
    albumId: `apple-${track.album}-${track.artist}`,
    year: 0,
    duration: '0:00',
    durationSec: 0,
    source: 'Apple Music',
    coverUrl: '',
    trackNumber: 0,
    isFavorite: false,
  };
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  currentTrackId,
  isPlaying,
  onPlayTrack,
  onToggleFavorite,
  favoriteTracks,
  spotifyOnly = false,
  searchQuery,
  onSearchQueryChange,
}) => {
  const spotifyState = useSyncExternalStore(spotify.subscribe, spotify.getSnapshot);
  const [localQuery, setLocalQuery] = useState('');
  const query = searchQuery ?? localQuery;
  const setQuery = onSearchQueryChange ?? setLocalQuery;
  const [localResults, setLocalResults] = useState<Track[]>([]);
  const [appleResults, setAppleResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([]);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchVersion = useRef(0);
  const spotifyOffset = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const version = ++searchVersion.current;
    setLocalResults([]);
    setAppleResults([]);
    setSpotifyResults([]);
    setSearchError(null);
    setSpotifyError(null);
    setHasMore(false);
    setLoadingMore(false);
    spotifyOffset.current = 0;
    if (!q) {
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    const abort = new AbortController();
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      const tasks: Promise<unknown>[] = [];
      const active = () => !cancelled && version === searchVersion.current;
      if (spotifyState.connected) {
        tasks.push(spotify.search(q, 0, abort.signal).then((result) => {
          if (!active()) return;
          setSpotifyResults(result.tracks);
          spotifyOffset.current = 10;
          setHasMore(result.hasMore);
        }).catch((error) => {
          if (active()) setSpotifyError(error instanceof Error ? error.message : 'Could not search Spotify.');
        }));
      }
      if (!spotifyOnly) {
        tasks.push(api.tracks(q).then((list) => {
          if (active()) setLocalResults(list.map(mapApiTrack));
        }).catch(() => {
          if (active()) setSearchError('Local library unavailable. Spotify search still works when connected.');
        }));
        tasks.push(api.appleSearch(q).then((list) => {
          if (active()) setAppleResults(list.map(mapAppleTrack));
        }).catch(() => { /* Music.app library is optional; do not hide Spotify results. */ }));
      }
      await Promise.allSettled(tasks);
      if (active()) setIsSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [query, spotifyState.connected, spotifyOnly]);

  const total = localResults.length + appleResults.length + spotifyResults.length;
  const favoriteIds = new Set(favoriteTracks.map((track) => track.id));
  const withFavorite = (track: Track): Track => ({
    ...track,
    isFavorite: favoriteIds.has(track.id) || (track.source === 'Local' && track.isFavorite),
  });

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const version = searchVersion.current;
    setLoadingMore(true);
    try {
      const result = await spotify.search(query.trim(), spotifyOffset.current);
      if (version !== searchVersion.current) return;
      spotifyOffset.current += 10;
      setSpotifyResults((previous) => [...previous, ...result.tracks.filter((track) => !previous.some((t) => t.id === track.id))]);
      setHasMore(result.hasMore);
    } catch (error) {
      if (version === searchVersion.current) setSpotifyError(error instanceof Error ? error.message : 'Could not load more songs.');
    } finally {
      if (version === searchVersion.current) setLoadingMore(false);
    }
  };

  return (
    <div id="screen-search" className="screen-wrap">
      <ScreenHeader
        eyebrow="Find a piece"
        title={spotifyOnly ? 'Spotify' : 'Search'}
        subtitle="Search Spotify’s full catalogue, or find music from your own shelves."
        actions={
          query.trim() && !isSearching ? (
            <PixelChip tone="moss">{total} found</PixelChip>
          ) : null
        }
      />

      <SpotifyConnection />

      <div className="px-search">
        <SearchIcon size={16} strokeWidth={1.8} className="px-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracks, artists, albums…"
          autoFocus
          aria-label="Search tracks, artists and albums"
        />
        {isSearching ? (
          <Loader2 size={15} className="px-search-spin" />
        ) : null}
      </div>

      {!query.trim() && (
        <div className="search-empty">
          <span className="px-display block text-[17px]" style={{ color: 'var(--ink)' }}>
            What shall we look at?
          </span>
          <p className="mx-auto mt-2 max-w-[42ch] text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            Connect Spotify above, then type a song or artist to hear full tracks with Premium.
            {!spotifyOnly && ' Local files and your added Music.app library are searched too. Apple Music catalogue streaming is not connected yet.'}
          </p>
        </div>
      )}

      {searchError && (
        <p className="spotify-error" role="status">{searchError}</p>
      )}

      {spotifyError && <p className="spotify-error" role="alert">{spotifyError}</p>}
      {query.trim() && (
        <div>
          {spotifyResults.length > 0 && (
            <section className="search-group">
              <div className="search-group-head">
                <SourceTag source="Spotify" />
                <span className="px-label">Full songs · Premium</span>
              </div>
              <div className="px-table">
                <TrackTableHead showSource={false} />
                {spotifyResults.map((track, index) => (
                  <TrackRow key={track.id} track={withFavorite(track)} index={index}
                    currentTrackId={currentTrackId} isPlaying={isPlaying}
                    onPlayTrack={onPlayTrack} onToggleFavorite={() => onToggleFavorite(track)} showSource={false} />
                ))}
              </div>
              {hasMore && (
                <button className="pixel-btn ghost small mt-4" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore ? 'Finding more…' : 'More Spotify songs'}
                </button>
              )}
              <a className="spotify-attribution" href={`https://open.spotify.com/search/${encodeURIComponent(query.trim())}`}
                target="_blank" rel="noreferrer">Search on Spotify ↗</a>
            </section>
          )}
          {!spotifyState.connected && (
            <p className="spotify-error">Spotify catalogue search needs sign-in. Click Connect Spotify above.</p>
          )}
          {localResults.length > 0 && (
            <section className="search-group">
              <div className="search-group-head">
                <SourceTag source="Local" />
                <span className="px-label">from your shelves</span>
              </div>
              <div className="px-table">
                <TrackTableHead showSource={false} />
                {localResults.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={withFavorite(track)}
                    index={index}
                    currentTrackId={currentTrackId}
                    isPlaying={isPlaying}
                    onPlayTrack={onPlayTrack}
                    onToggleFavorite={() => onToggleFavorite(track)}
                    showSource={false}
                  />
                ))}
              </div>
            </section>
          )}

          {appleResults.length > 0 && (
            <section className="search-group">
              <div className="search-group-head">
                <SourceTag source="Apple Music" />
                <span className="px-label">Added to your Music.app library</span>
              </div>
              <div className="px-table">
                <TrackTableHead showSource={false} />
                {appleResults.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={withFavorite(track)}
                    index={index}
                    currentTrackId={currentTrackId}
                    isPlaying={isPlaying}
                    onPlayTrack={onPlayTrack}
                    onToggleFavorite={() => onToggleFavorite(track)}
                    showSource={false}
                  />
                ))}
              </div>
            </section>
          )}

          {!isSearching && total === 0 && !spotifyError && !searchError && (
            <div className="search-empty">
              <span className="px-display block text-[16px]" style={{ color: 'var(--ink)' }}>
                Nothing framed under “{query}”
              </span>
              <p className="mt-2 text-[12px]" style={{ color: 'var(--muted)' }}>
                {spotifyState.connected
                  ? 'Try a shorter title, or a different artist.'
                  : 'Connect Spotify above to search beyond local files.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
