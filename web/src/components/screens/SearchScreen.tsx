import React, { useEffect, useState } from 'react';
import { Search as SearchIcon, Play, Loader2 } from 'lucide-react';
import { Track } from '../../data/musicData';
import { api, ApiTrack } from '../../api/client';

interface AppleSearchResult {
  name: string;
  artist: string;
  album: string;
}

interface SearchScreenProps {
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
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

function mapAppleTrack(track: AppleSearchResult, index: number): Track {
  return {
    // Give Apple Music results their own stable-ish ID
    // so they don't collide with local database IDs.
    id: `apple-search-${index}-${track.name}-${track.artist}`,
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
}) => {
  const [query, setQuery] = useState('');

  const [localResults, setLocalResults] = useState<Track[]>([]);
  const [appleResults, setAppleResults] = useState<Track[]>([]);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();

    if (!q) {
      setLocalResults([]);
      setAppleResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      const [localResult, appleResult] = await Promise.allSettled([
        api.tracks(q),
        api.appleSearch(q),
      ]);

      if (cancelled) return;

      let local: Track[] = [];
      let apple: Track[] = [];

      if (localResult.status === 'fulfilled') {
        local = localResult.value.map(mapApiTrack);
      }

      if (appleResult.status === 'fulfilled') {
        apple = appleResult.value.map(mapAppleTrack);
      }

      setLocalResults(local);
      setAppleResults(apple);

      if (
        localResult.status === 'rejected' &&
        appleResult.status === 'rejected'
      ) {
        setSearchError(
          'Could not search the library. Make sure the Frankenstein backend is running.'
        );
      }

      setIsSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const results = [...localResults, ...appleResults];

  return (
    <div
      id="screen-search"
      className="max-w-4xl mx-auto px-10 py-9 space-y-6"
    >
      {/* Search Input */}
      <div className="relative">
        <SearchIcon
          size={16}
          strokeWidth={1.5}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#78837A]"
        />

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks, artists, albums"
          autoFocus
          className="w-full bg-[#EEF1EA] text-[#24302A] placeholder-[#78837A] text-[14px] pl-10 pr-10 py-2.5 rounded-[10px] border border-[#E2E6DD] focus:outline-none focus:border-[#CBD2C6] transition-colors"
        />

        {isSearching && (
          <Loader2
            size={15}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78837A] animate-spin"
          />
        )}
      </div>

      {/* Empty state */}
      {!query.trim() && (
        <div className="py-20 text-center">
          <div className="text-[14px] text-[#24302A]">
            Search your music
          </div>

          <div className="mt-2 text-[12px] text-[#78837A]">
            Search your local library and Apple Music library
          </div>
        </div>
      )}

      {/* Error */}
      {searchError && (
        <div className="py-4 text-center text-[12px] text-[#9A625D]">
          {searchError}
        </div>
      )}

      {/* Results */}
      {query.trim() && !searchError && (
        <div className="space-y-4">
          {/* Local results */}
          {localResults.length > 0 && (
            <section>
              <div className="px-3 pb-2 text-[11px] font-medium text-[#78837A] uppercase tracking-wider">
                Local
              </div>

              <div className="space-y-1">
                {localResults.map((track, idx) => (
                  <SearchResultRow
                    key={track.id}
                    track={track}
                    index={idx}
                    currentTrackId={currentTrackId}
                    isPlaying={isPlaying}
                    onPlayTrack={onPlayTrack}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Apple Music results */}
          {appleResults.length > 0 && (
            <section>
              <div className="px-3 pb-2 pt-2 text-[11px] font-medium text-[#78837A] uppercase tracking-wider">
                Apple Music
              </div>

              <div className="space-y-1">
                {appleResults.map((track, idx) => (
                  <SearchResultRow
                    key={track.id}
                    track={track}
                    index={idx}
                    currentTrackId={currentTrackId}
                    isPlaying={isPlaying}
                    onPlayTrack={onPlayTrack}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Nothing found */}
          {!isSearching &&
            localResults.length === 0 &&
            appleResults.length === 0 && (
              <div className="py-16 text-center text-[13px] text-[#78837A]">
                No results found for &ldquo;{query}&rdquo;
              </div>
            )}
        </div>
      )}
    </div>
  );
};

interface SearchResultRowProps {
  track: Track;
  index: number;
  currentTrackId?: string;
  isPlaying: boolean;
  onPlayTrack: (track: Track) => void;
}

const SearchResultRow: React.FC<SearchResultRowProps> = ({
  track,
  index,
  currentTrackId,
  isPlaying,
  onPlayTrack,
}) => {
  const isCurrent = currentTrackId === track.id;

  return (
    <div
      onClick={() => onPlayTrack(track)}
      className={`group px-3 py-2 rounded-[8px] flex items-center text-[13px] cursor-pointer transition-colors ${
        isCurrent
          ? 'bg-[#E3E9DC] text-[#24302A]'
          : 'hover:bg-[#E8ECE1] text-[#24302A]'
      }`}
    >
      {/* Number / Play */}
      <div className="w-10 flex items-center">
        <span className="group-hover:hidden text-[12px] text-[#78837A] font-mono tabular-nums">
          {index + 1}
        </span>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPlayTrack(track);
          }}
          className="hidden group-hover:flex w-5 h-5 items-center justify-center text-[#24302A]"
          title="Play"
        >
          <Play size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Artwork + Title */}
      <div className="flex-1 min-w-0 flex items-center gap-3 pr-4">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt={track.album}
            className="w-8 h-8 rounded-[6px] object-cover flex-shrink-0 border border-black/5"
          />
        ) : (
          <div className="w-8 h-8 rounded-[6px] flex-shrink-0 bg-[#DDE6D6] border border-black/5 flex items-center justify-center text-[11px] text-[#6E9662]">
            ♪
          </div>
        )}

        <span
          className={`truncate font-medium ${
            isCurrent && isPlaying
              ? 'text-[#6E9662]'
              : 'text-[#24302A]'
          }`}
        >
          {track.title}
        </span>
      </div>

      {/* Artist */}
      <div className="w-44 text-[#78837A] truncate pr-4 text-[12px]">
        {track.artist}
      </div>

      {/* Album */}
      <div className="w-48 text-[#78837A] truncate pr-4 text-[12px]">
        {track.album}
      </div>

      {/* Source */}
      <div className="w-24 text-right text-[12px] text-[#78837A]">
        {track.source}
      </div>
    </div>
  );
};